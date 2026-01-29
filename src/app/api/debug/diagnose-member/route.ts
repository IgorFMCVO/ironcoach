// ============================================================================
// DIAGNÓSTICO COMPLETO DE MEMBRO
// Acesse: /api/debug/diagnose-member?evoId=XXXXX
// 
// Este endpoint mostra TUDO que a API do EVO retorna para um membro
// para diagnosticar problemas de ficha/frequência
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EVO_API = 'https://evo-integracao-api.w12app.com.br/api/v1';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const evoId = searchParams.get('evoId');

  if (!evoId) {
    return NextResponse.json({ error: 'evoId obrigatório' }, { status: 400 });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  const auth = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;
  const headers = { Authorization: auth, 'Content-Type': 'application/json' };

  const results: any = {
    evoId: parseInt(evoId),
    timestamp: new Date().toISOString(),
    database: null,
    evoMember: null,
    evoWorkouts: null,
    evoEntries: null,
    analysis: null,
    recommendation: null,
  };

  try {
    // =========================================================================
    // 1. DADOS DO BANCO DE DADOS
    // =========================================================================
    log(`[1] Buscando membro ${evoId} no banco de dados...`);
    
    const { data: dbMember } = await supabase
      .from('queue')
      .select('*')
      .eq('evo_member_id', parseInt(evoId))
      .is('check_out_time', null)
      .single();

    if (dbMember) {
      log(`[1] ✅ Membro encontrado: ${dbMember.member_name}`);
      results.database = {
        id: dbMember.id,
        name: dbMember.member_name,
        has_ficha: dbMember.has_ficha,
        ficha_vencida: dbMember.ficha_vencida,
        has_avaliacao: dbMember.has_avaliacao,
        avaliacao_vencida: dbMember.avaliacao_vencida,
        workout_name: dbMember.workout_name,
        workout_id: dbMember.workout_id,
        workout_valid_until: dbMember.workout_valid_until,
        freq_atual: dbMember.freq_atual,
        freq_08_14: dbMember.freq_08_14,
        freq_15_21: dbMember.freq_15_21,
        retention_score: dbMember.retention_score,
        tags: dbMember.tags,
        priority: dbMember.priority,
      };
    } else {
      log(`[1] ⚠️ Membro NÃO encontrado na fila ativa`);
    }

    // =========================================================================
    // 2. DADOS DO MEMBRO NO EVO
    // =========================================================================
    log(`[2] Buscando dados do membro no EVO...`);
    
    try {
      const memberResp = await fetch(`${EVO_API}/members/${evoId}`, { headers, cache: 'no-store' });
      log(`[2] HTTP Status: ${memberResp.status}`);
      
      if (memberResp.ok) {
        const memberData = await memberResp.json();
        results.evoMember = {
          id: memberData.idMember,
          name: memberData.firstName + ' ' + memberData.lastName,
          email: memberData.email,
          memberSince: memberData.registerDate,
          status: memberData.status,
          photo: memberData.photoUrl,
        };
        log(`[2] ✅ Membro: ${results.evoMember.name}`);
      }
    } catch (e) {
      log(`[2] ❌ Erro ao buscar membro: ${e}`);
    }

    // =========================================================================
    // 3. TREINOS DO EVO - TESTAR MÚLTIPLOS ENDPOINTS E PARÂMETROS
    // =========================================================================
    log(`[3] Buscando treinos - testando múltiplos endpoints...`);
    
    const endpointsParaTestar = [
      { name: 'default-client-workout', url: `${EVO_API}/workout/default-client-workout?idClient=${evoId}` },
      { name: 'default-client-workout+inactive', url: `${EVO_API}/workout/default-client-workout?idClient=${evoId}&inactive=true` },
      { name: 'default-client-workout+deleted', url: `${EVO_API}/workout/default-client-workout?idClient=${evoId}&deleted=true` },
      { name: 'default-client-workout+both', url: `${EVO_API}/workout/default-client-workout?idClient=${evoId}&inactive=true&deleted=true` },
      { name: 'workout-by-member', url: `${EVO_API}/workout?idMember=${evoId}` },
      { name: 'workout-by-member+take', url: `${EVO_API}/workout?idMember=${evoId}&take=100` },
      { name: 'members-workout', url: `${EVO_API}/members/${evoId}/workout` },
      { name: 'members-workouts', url: `${EVO_API}/members/${evoId}/workouts` },
    ];

    const endpointResults: any[] = [];
    let treinosEncontrados: any[] = [];

    for (const ep of endpointsParaTestar) {
      try {
        log(`[3] Testando: ${ep.name}`);
        log(`[3]   URL: ${ep.url}`);
        
        const resp = await fetch(ep.url, { headers, cache: 'no-store' });
        log(`[3]   HTTP Status: ${resp.status}`);
        
        const result: any = {
          endpoint: ep.name,
          url: ep.url,
          status: resp.status,
          treinos: 0,
          data: null,
        };

        if (resp.ok) {
          const data = await resp.json();
          result.data = JSON.stringify(data).substring(0, 500);
          
          // Tentar extrair treinos de diferentes estruturas
          let treinos: any[] = [];
          if (data.treinos) treinos = data.treinos;
          else if (Array.isArray(data)) treinos = data;
          else if (data.workouts) treinos = data.workouts;
          else if (data.data) treinos = Array.isArray(data.data) ? data.data : [];
          
          result.treinos = treinos.length;
          
          if (treinos.length > 0 && treinosEncontrados.length === 0) {
            treinosEncontrados = treinos;
            log(`[3]   ✅ ENCONTRADOS ${treinos.length} treinos!`);
          }
        }
        
        endpointResults.push(result);
        
        // Pequena pausa para não sobrecarregar API
        await new Promise(r => setTimeout(r, 200));
        
      } catch (err) {
        log(`[3]   ❌ Erro: ${err}`);
        endpointResults.push({
          endpoint: ep.name,
          status: 'error',
          error: String(err),
        });
      }
    }

    results.evoWorkouts = {
      endpointsTested: endpointResults,
      totalTreinosEncontrados: treinosEncontrados.length,
      treinos: treinosEncontrados.map((t: any, idx: number) => {
        const hoje = new Date();
        const validade = t.dataValidade ? new Date(t.dataValidade) : null;
        const vencido = validade ? validade < hoje : false;
        
        log(`[3] Treino ${idx + 1}: "${t.nomeTreino || t.nome || 'sem nome'}"`);
        log(`[3]   - Todos os campos: ${Object.keys(t).join(', ')}`);
        
        return {
          id: t.idTreino || t.id,
          nome: t.nomeTreino || t.nome,
          statusTreino: t.statusTreino,
          status: t.status,
          flExcluido: t.flExcluido,
          flAtivo: t.flAtivo,
          ativo: t.ativo,
          dataInicio: t.dataInicio,
          dataValidade: t.dataValidade,
          vencido,
          professor: t.nomeProfessor,
          allFields: Object.keys(t),
        };
      }),
    };

    // =========================================================================
    // 4. ENTRADAS (FREQUÊNCIA) DO EVO
    // =========================================================================
    log(`[4] Buscando entradas (frequência)...`);
    
    try {
      const now = new Date();
      const date30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dateParam = date30DaysAgo.toISOString().split('T')[0];
      
      const entriesUrl = `${EVO_API}/entries?idMember=${evoId}&registerDateStart=${dateParam}&take=100`;
      log(`[4] URL: ${entriesUrl}`);
      
      const entriesResp = await fetch(entriesUrl, { headers, cache: 'no-store' });
      log(`[4] HTTP Status: ${entriesResp.status}`);
      
      if (entriesResp.ok) {
        const entries = await entriesResp.json();
        
        if (Array.isArray(entries)) {
          log(`[4] Total de entradas: ${entries.length}`);
          
          // Calcular frequência por semana
          const BRAZIL_OFFSET = -180;
          const nowBrazilMs = now.getTime() + (now.getTimezoneOffset() + BRAZIL_OFFSET) * 60 * 1000;
          const nowBrazil = new Date(nowBrazilMs);
          
          const dayOfWeek = nowBrazil.getDay();
          const startOfThisWeek = new Date(nowBrazil);
          startOfThisWeek.setDate(nowBrazil.getDate() - dayOfWeek);
          startOfThisWeek.setHours(0, 0, 0, 0);
          
          const startOfLastWeek = new Date(startOfThisWeek);
          startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
          
          const diasSemanaAtual = new Set<string>();
          const diasSemanaPassada = new Set<string>();
          
          for (const entry of entries) {
            if (!entry.date) continue;
            let entryDateStr = entry.date;
            if (!entryDateStr.includes('+') && !entryDateStr.includes('Z')) {
              entryDateStr = entryDateStr + '-03:00';
            }
            const entryDate = new Date(entryDateStr);
            const diaKey = entry.date.split('T')[0];
            
            if (entryDate >= startOfThisWeek) {
              diasSemanaAtual.add(diaKey);
            } else if (entryDate >= startOfLastWeek) {
              diasSemanaPassada.add(diaKey);
            }
          }
          
          results.evoEntries = {
            totalEntries: entries.length,
            frequenciaCalculada: {
              semanaAtual: diasSemanaAtual.size,
              semanaPassada: diasSemanaPassada.size,
              diasSemanaAtual: Array.from(diasSemanaAtual),
              diasSemanaPassada: Array.from(diasSemanaPassada),
            },
            ultimasEntradas: entries.slice(0, 5).map((e: any) => ({
              data: e.date,
              tipo: e.entryType,
            })),
          };
        }
      }
    } catch (e) {
      log(`[5] ❌ Exceção: ${e}`);
    }

    // =========================================================================
    // 5. ANÁLISE E DIAGNÓSTICO
    // =========================================================================
    log(`[5] Analisando dados...`);
    
    const analysis: any = {
      fichaStatus: 'INDEFINIDO',
      problemas: [],
      inconsistencias: [],
    };

    // Verificar se todos os endpoints retornaram rate limit (429)
    const endpointsTested = results.evoWorkouts?.endpointsTested || [];
    const todosComRateLimitAnalise = endpointsTested.length > 0 && 
      endpointsTested.every((ep: any) => ep.status === 429);
    
    if (todosComRateLimitAnalise) {
      log(`[5] ⚠️ TODOS os endpoints retornaram 429 - análise inconclusiva`);
      analysis.fichaStatus = 'INCONCLUSIVO_RATE_LIMIT';
      analysis.fichaCorreta = null; // Não temos certeza
      analysis.problemas.push('⚠️ Não foi possível verificar treinos (rate limit 429)');
    } else {
      const hoje = new Date();
      const treinos = results.evoWorkouts?.treinos || [];
      
      // Analisar treinos
      const treinosAtivos = treinos.filter((t: any) => !t.flExcluido && !t.vencido && t.statusTreino !== 0 && t.statusTreino !== 2);
      const treinosVencidos = treinos.filter((t: any) => !t.flExcluido && t.vencido);
      const treinosExcluidos = treinos.filter((t: any) => t.flExcluido);
      const treinosInativos = treinos.filter((t: any) => t.statusTreino === 0 || t.statusTreino === 2);

      log(`[5] Treinos ativos válidos: ${treinosAtivos.length}`);
      log(`[5] Treinos vencidos: ${treinosVencidos.length}`);
      log(`[5] Treinos excluídos: ${treinosExcluidos.length}`);
      log(`[5] Treinos inativos: ${treinosInativos.length}`);

      // Determinar status correto da ficha
      if (treinosAtivos.length > 0) {
        analysis.fichaStatus = 'FICHA_OK';
        analysis.fichaCorreta = { has_ficha: true, ficha_vencida: false };
      } else if (treinosVencidos.length > 0) {
        analysis.fichaStatus = 'FICHA_VENCIDA';
        analysis.fichaCorreta = { has_ficha: true, ficha_vencida: true };
      } else if (treinos.length > 0) {
        // Tem treinos mas todos estão inativos/excluídos
        analysis.fichaStatus = 'TREINOS_INATIVOS';
        analysis.fichaCorreta = { has_ficha: true, ficha_vencida: true };
      } else {
        analysis.fichaStatus = 'SEM_FICHA';
        analysis.fichaCorreta = { has_ficha: false, ficha_vencida: false };
      }

      // Verificar inconsistências com o banco
      if (results.database && analysis.fichaCorreta) {
        const db = results.database;
        const correto = analysis.fichaCorreta;
        
        if (db.has_ficha !== correto.has_ficha) {
          analysis.inconsistencias.push(`has_ficha: banco=${db.has_ficha}, correto=${correto.has_ficha}`);
        }
        if (db.ficha_vencida !== correto.ficha_vencida) {
          analysis.inconsistencias.push(`ficha_vencida: banco=${db.ficha_vencida}, correto=${correto.ficha_vencida}`);
        }
      }

      // Problema específico: treino vencido mas banco diz OK
      if (analysis.fichaStatus === 'FICHA_VENCIDA' && results.database?.has_ficha && !results.database?.ficha_vencida) {
        analysis.problemas.push('🚨 CRÍTICO: Treino VENCIDO mas banco mostra ficha OK!');
      }

      // Problema: sem treinos mas banco diz tem ficha
      if (analysis.fichaStatus === 'SEM_FICHA' && results.database?.has_ficha) {
        analysis.problemas.push('🚨 CRÍTICO: SEM TREINOS mas banco mostra has_ficha=true!');
      }
    }

    results.analysis = analysis;

    // =========================================================================
    // 6. RECOMENDAÇÃO DE CORREÇÃO
    // =========================================================================
    
    // PROTEÇÃO: Não corrigir se todos os endpoints retornaram rate limit (429)
    const todosComRateLimit = endpointResults.length > 0 && 
      endpointResults.every((ep: any) => ep.status === 429);
    
    if (todosComRateLimit) {
      log(`[6] ⚠️ TODOS os endpoints retornaram 429 (rate limit) - NÃO corrigindo dados`);
      results.recommendation = { 
        action: 'RATE_LIMIT', 
        message: 'Não foi possível verificar treinos devido a rate limit da API. Aguarde alguns minutos e tente novamente.'
      };
    } else if (analysis.inconsistencias.length > 0 && results.database && analysis.fichaCorreta) {
      log(`[6] Corrigindo inconsistências...`);
      
      const updateData: any = {
        has_ficha: analysis.fichaCorreta.has_ficha,
        ficha_vencida: analysis.fichaCorreta.ficha_vencida,
      };

      // Usar treino mais relevante para preencher dados
      const treinos = results.evoWorkouts?.treinos || [];
      const treinoParaUsar = treinos.find((t: any) => !t.vencido && !t.flExcluido) || 
                            treinos.find((t: any) => t.vencido && !t.flExcluido) || 
                            treinos[0];
      if (treinoParaUsar) {
        updateData.workout_name = treinoParaUsar.nome;
        updateData.workout_id = treinoParaUsar.id;
        updateData.workout_valid_until = treinoParaUsar.dataValidade;
      } else {
        updateData.workout_name = null;
        updateData.workout_id = null;
        updateData.workout_valid_until = null;
      }

      const { error: updateError } = await supabase
        .from('queue')
        .update(updateData)
        .eq('id', results.database.id);

      if (updateError) {
        log(`[6] ❌ Erro ao corrigir: ${updateError.message}`);
        results.recommendation = { action: 'ERRO_AO_CORRIGIR', error: updateError.message };
      } else {
        log(`[6] ✅ Banco corrigido com sucesso!`);
        results.recommendation = { 
          action: 'CORRIGIDO', 
          changes: updateData,
          message: 'Dados do banco foram atualizados para refletir o estado real no EVO'
        };
      }
    } else if (!todosComRateLimit) {
      results.recommendation = { action: 'NENHUMA_ACAO', message: 'Dados estão consistentes' };
    }

    results.logs = logs;
    return NextResponse.json(results);

  } catch (error) {
    log(`[ERRO FATAL] ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return NextResponse.json({
      error: 'Erro ao processar',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      logs,
    }, { status: 500 });
  }
}
