// src/app/api/debug/resync-one/route.ts
// ============================================================================
// IRON COACH - API de DIAGNÓSTICO: Resync individual com logs detalhados
// Acesse: /api/debug/resync-one?evoId=XXXXX
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EVO_API = 'https://evo-integracao-api.w12app.com.br';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const evoId = searchParams.get('evoId');

  if (!evoId) {
    return NextResponse.json({ error: 'Parâmetro evoId é obrigatório' }, { status: 400 });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  const auth = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;
  const headers = { Authorization: auth, 'Content-Type': 'application/json' };

  try {
    // 1. Buscar membro no banco
    log(`[1] Buscando membro com evo_member_id=${evoId} no banco...`);
    
    const { data: member, error: fetchError } = await supabase
      .from('queue')
      .select('*')
      .eq('evo_member_id', parseInt(evoId))
      .is('check_out_time', null)
      .single();

    if (fetchError || !member) {
      log(`[1] ERRO: Membro não encontrado - ${fetchError?.message || 'não existe'}`);
      return NextResponse.json({ 
        error: 'Membro não encontrado na fila',
        logs,
        hint: 'Verifique se o evo_member_id está correto'
      }, { status: 404 });
    }

    log(`[1] Membro encontrado: ${member.member_name} (ID banco: ${member.id})`);
    log(`[1] Dados atuais no banco: freq_atual=${member.freq_atual}, freq_08_14=${member.freq_08_14}, freq_15_21=${member.freq_15_21}`);

    // 2. Calcular frequência do EVO
    log(`[2] Calculando frequência do EVO...`);
    
    const now = new Date();
    const BRAZIL_OFFSET_MINUTES = -180;
    const nowBrazilMs = now.getTime() + (now.getTimezoneOffset() + BRAZIL_OFFSET_MINUTES) * 60 * 1000;
    const nowBrazil = new Date(nowBrazilMs);
    
    const dayOfWeek = nowBrazil.getDay();
    const startOfThisWeek = new Date(nowBrazil);
    startOfThisWeek.setDate(nowBrazil.getDate() - dayOfWeek);
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    const startOf2WeeksAgo = new Date(startOfLastWeek);
    startOf2WeeksAgo.setDate(startOf2WeeksAgo.getDate() - 7);

    log(`[2] Semanas: Atual=${startOfThisWeek.toISOString().split('T')[0]}, Passada=${startOfLastWeek.toISOString().split('T')[0]}, 2Sem=${startOf2WeeksAgo.toISOString().split('T')[0]}`);

    const date30DaysAgo = new Date(nowBrazil.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateStartParam = date30DaysAgo.toISOString().split('T')[0];
    
    const entriesUrl = `${EVO_API}/api/v1/entries?idMember=${evoId}&registerDateStart=${dateStartParam}&take=200`;
    log(`[2] URL: ${entriesUrl}`);
    
    const entriesResp = await fetch(entriesUrl, { headers, cache: 'no-store' });
    
    if (!entriesResp.ok) {
      log(`[2] ERRO: EVO retornou ${entriesResp.status}`);
      return NextResponse.json({ error: `EVO retornou ${entriesResp.status}`, logs }, { status: 500 });
    }

    const entriesRaw = await entriesResp.json();
    const entries = Array.isArray(entriesRaw) ? entriesRaw : [];
    log(`[2] Total de entradas: ${entries.length}`);

    // Calcular frequência
    const diasSemanaAtual = new Set<string>();
    const diasSemanaPassada = new Set<string>();
    const dias2SemanasAtras = new Set<string>();
    
    for (const entry of entries) {
      if (!entry.date) continue;
      
      let entryDateStr = entry.date;
      if (!entryDateStr.includes('+') && !entryDateStr.includes('Z') && !entryDateStr.endsWith('-03:00')) {
        entryDateStr = entryDateStr + '-03:00';
      }
      
      const entryDate = new Date(entryDateStr);
      if (isNaN(entryDate.getTime())) continue;
      
      const diaKey = entry.date.split('T')[0];
      
      if (entryDate >= startOfThisWeek) {
        diasSemanaAtual.add(diaKey);
      } else if (entryDate >= startOfLastWeek) {
        diasSemanaPassada.add(diaKey);
      } else if (entryDate >= startOf2WeeksAgo) {
        dias2SemanasAtras.add(diaKey);
      }
    }

    const freqAtual = diasSemanaAtual.size;
    const freq08_14 = diasSemanaPassada.size;
    const freq15_21 = dias2SemanasAtras.size;

    log(`[2] Frequência calculada: atual=${freqAtual}, passada=${freq08_14}, 2sem=${freq15_21}`);

    // =========================================================================
    // 2.5 Buscar FICHA de treino do EVO (COM inactive=true para pegar vencidos)
    // =========================================================================
    log(`[2.5] Buscando ficha de treino do EVO...`);
    
    let hasFicha = false;
    let fichaVencida = false;
    let workoutName: string | null = null;
    let workoutId: number | null = null;
    let workoutValidUntil: string | null = null;
    let freqEsperada = 3; // Default

    try {
      const workoutUrl = `${EVO_API}/api/v1/workout/default-client-workout?idClient=${evoId}&inactive=true`;
      log(`[2.5] URL: ${workoutUrl}`);
      
      const workoutResp = await fetch(workoutUrl, { headers, cache: 'no-store' });
      log(`[2.5] HTTP Status: ${workoutResp.status}`);
      
      if (workoutResp.ok) {
        const workoutData = await workoutResp.json();
        const todosOsTreinos = workoutData.treinos || [];
        log(`[2.5] Total de treinos: ${todosOsTreinos.length}`);
        
        const hoje = new Date();
        
        // CORREÇÃO: Priorizar dataValidade sobre statusTreino
        // Um treino é ATIVO se:
        // 1. Não foi excluído (flExcluido !== true)
        // 2. Data de validade está no FUTURO
        const treinosAtivosValidos = todosOsTreinos.filter((t: any) => {
          if (t.flExcluido === true) {
            log(`[2.5]   Treino "${t.nomeTreino}" - EXCLUÍDO`);
            return false;
          }
          
          // Se tem data de validade, verificar se está no futuro
          if (t.dataValidade) {
            const validade = new Date(t.dataValidade);
            const estaValido = validade > hoje;
            if (!estaValido) {
              log(`[2.5]   Treino "${t.nomeTreino}" - VENCIDO por data (${t.dataValidade})`);
              return false;
            }
          }
          
          // Se chegou aqui, treino está válido!
          log(`[2.5]   Treino "${t.nomeTreino}" - ATIVO (validade: ${t.dataValidade}, status: ${t.statusTreino})`);
          return true;
        });

        log(`[2.5] Treinos ativos válidos: ${treinosAtivosValidos.length}`);

        if (treinosAtivosValidos.length > 0) {
          // Tem treino ativo válido - pegar o mais recente
          const treino = treinosAtivosValidos.sort((a: any, b: any) => {
            const dateA = a.dataInicio ? new Date(a.dataInicio).getTime() : 0;
            const dateB = b.dataInicio ? new Date(b.dataInicio).getTime() : 0;
            return dateB - dateA; // Mais recente primeiro
          })[0];
          
          hasFicha = true;
          fichaVencida = false;
          workoutName = treino.nomeTreino || null;
          workoutId = treino.idTreino || null;
          workoutValidUntil = treino.dataValidade || null;
          freqEsperada = treino.frequenciaSemana || treino.quantidadeSemanal || 3;
          log(`[2.5] ✅ Ficha ATIVA: "${workoutName}" (validade: ${workoutValidUntil})`);
        } else {
          // Verificar se tem treinos vencidos (por data)
          const treinosVencidos = todosOsTreinos.filter((t: any) => {
            if (t.flExcluido === true) return false;
            if (t.dataValidade && new Date(t.dataValidade) < hoje) return true;
            return false;
          });

          log(`[2.5] Treinos vencidos: ${treinosVencidos.length}`);

          if (treinosVencidos.length > 0) {
            // Tem ficha mas está vencida - pegar o mais recente
            const treino = treinosVencidos.sort((a: any, b: any) => {
              const dateA = a.dataValidade ? new Date(a.dataValidade).getTime() : 0;
              const dateB = b.dataValidade ? new Date(b.dataValidade).getTime() : 0;
              return dateB - dateA; // Mais recente primeiro
            })[0];
            
            hasFicha = true;
            fichaVencida = true;
            workoutName = treino.nomeTreino || null;
            workoutId = treino.idTreino || null;
            workoutValidUntil = treino.dataValidade || null;
            freqEsperada = treino.frequenciaSemana || treino.quantidadeSemanal || 3;
            log(`[2.5] ⚠️ Ficha VENCIDA: "${workoutName}" (venceu em: ${workoutValidUntil})`);
          } else {
            // Sem ficha
            hasFicha = false;
            fichaVencida = false;
            log(`[2.5] ❌ SEM FICHA`);
          }
        }
      } else if (workoutResp.status === 429) {
        log(`[2.5] ⚠️ Rate limit (429) - mantendo dados atuais da ficha`);
        hasFicha = member.has_ficha || false;
        fichaVencida = member.ficha_vencida || false;
        workoutName = member.workout_name || null;
        workoutId = member.workout_id || null;
        workoutValidUntil = member.workout_valid_until || null;
      }
    } catch (workoutErr) {
      log(`[2.5] Erro ao buscar ficha: ${workoutErr}`);
    }

    // =========================================================================
    // 3. Calcular retention_score
    // =========================================================================
    log(`[3] Calculando retention_score...`);
    
    let retentionScore = 0;
    
    // Frequência (max 50%)
    const freqReal = freqAtual > 0 ? freqAtual : freq08_14;
    if (freqReal > 0) {
      retentionScore += Math.min(50, Math.round((freqReal / freqEsperada) * 50));
    }
    
    // Ficha (max 25%) - usando valores ATUALIZADOS
    if (hasFicha && !fichaVencida) {
      retentionScore += 25;
    } else if (hasFicha && fichaVencida) {
      retentionScore += 12;
    }
    
    // Avaliação (max 25%) - mantém valor atual do banco
    if (member.has_avaliacao && !member.avaliacao_vencida) {
      retentionScore += 25;
    } else if (member.has_avaliacao && member.avaliacao_vencida) {
      retentionScore += 12;
    }
    
    log(`[3] Retention calculado: ${retentionScore}% (freq=${freqReal}/${freqEsperada}, ficha=${hasFicha}${fichaVencida ? ' VENCIDA' : ''}, aval=${member.has_avaliacao})`);

    // =========================================================================
    // 4. Atualizar no banco
    // =========================================================================
    log(`[4] Atualizando banco de dados...`);
    
    const updateData: any = {
      freq_atual: freqAtual,
      freq_08_14: freq08_14,
      freq_15_21: freq15_21,
      freq_esperada: freqEsperada,
      retention_score: retentionScore,
      // NOVOS CAMPOS DE FICHA
      has_ficha: hasFicha,
      ficha_vencida: fichaVencida,
      workout_name: workoutName,
      workout_id: workoutId,
      workout_valid_until: workoutValidUntil,
    };

    log(`[4] Dados para UPDATE: ${JSON.stringify(updateData)}`);

    const { error: updateError, data: updateResult } = await supabase
      .from('queue')
      .update(updateData)
      .eq('id', member.id)
      .select();

    if (updateError) {
      log(`[4] ERRO no UPDATE: ${updateError.message}`);
      log(`[4] Detalhes do erro: ${JSON.stringify(updateError)}`);
      return NextResponse.json({ 
        error: 'Falha ao atualizar banco',
        errorDetails: updateError,
        logs 
      }, { status: 500 });
    }

    log(`[4] UPDATE executado com sucesso!`);

    // =========================================================================
    // 5. Verificar se atualizou
    // =========================================================================
    log(`[5] Verificando dados após UPDATE...`);
    
    const { data: memberAfter } = await supabase
      .from('queue')
      .select('freq_atual, freq_08_14, freq_15_21, freq_esperada, retention_score, has_ficha, ficha_vencida, workout_name')
      .eq('id', member.id)
      .single();

    log(`[5] Dados após UPDATE: ${JSON.stringify(memberAfter)}`);

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        name: member.member_name,
        evoId: parseInt(evoId),
      },
      before: {
        freq_atual: member.freq_atual,
        freq_08_14: member.freq_08_14,
        freq_15_21: member.freq_15_21,
        has_ficha: member.has_ficha,
        ficha_vencida: member.ficha_vencida,
        workout_name: member.workout_name,
      },
      calculated: {
        freq_atual: freqAtual,
        freq_08_14: freq08_14,
        freq_15_21: freq15_21,
        dias_atual: Array.from(diasSemanaAtual),
        dias_passada: Array.from(diasSemanaPassada),
        dias_2sem: Array.from(dias2SemanasAtras),
        has_ficha: hasFicha,
        ficha_vencida: fichaVencida,
        workout_name: workoutName,
      },
      after: memberAfter,
      logs,
    });

  } catch (error) {
    log(`[ERRO] ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return NextResponse.json({ 
      error: 'Erro ao processar',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      logs
    }, { status: 500 });
  }
}
