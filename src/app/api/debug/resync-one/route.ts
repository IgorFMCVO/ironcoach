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

    // 2.5 Calcular retention_score
    log(`[2.5] Calculando retention_score...`);
    
    let retentionScore = 0;
    const freqEsperada = 3; // Default
    
    // Frequência (max 50%)
    const freqReal = freqAtual > 0 ? freqAtual : freq08_14;
    if (freqReal > 0) {
      retentionScore += Math.min(50, Math.round((freqReal / freqEsperada) * 50));
    }
    
    // Ficha - vamos manter o valor atual do banco
    if (member.has_ficha && !member.ficha_vencida) {
      retentionScore += 25;
    } else if (member.has_ficha && member.ficha_vencida) {
      retentionScore += 12;
    }
    
    // Avaliação - vamos manter o valor atual do banco
    if (member.has_avaliacao && !member.avaliacao_vencida) {
      retentionScore += 25;
    } else if (member.has_avaliacao && member.avaliacao_vencida) {
      retentionScore += 12;
    }
    
    log(`[2.5] Retention calculado: ${retentionScore}% (freq=${freqReal}/${freqEsperada}, ficha=${member.has_ficha}, aval=${member.has_avaliacao})`);

    // 3. Atualizar no banco
    log(`[3] Atualizando banco de dados...`);
    
    const updateData = {
      freq_atual: freqAtual,
      freq_08_14: freq08_14,
      freq_15_21: freq15_21,
      freq_esperada: freqEsperada,
      retention_score: retentionScore,
    };

    log(`[3] Dados para UPDATE: ${JSON.stringify(updateData)}`);

    const { error: updateError, data: updateResult } = await supabase
      .from('queue')
      .update(updateData)
      .eq('id', member.id)
      .select();

    if (updateError) {
      log(`[3] ERRO no UPDATE: ${updateError.message}`);
      log(`[3] Detalhes do erro: ${JSON.stringify(updateError)}`);
      return NextResponse.json({ 
        error: 'Falha ao atualizar banco',
        errorDetails: updateError,
        logs 
      }, { status: 500 });
    }

    log(`[3] UPDATE executado com sucesso!`);
    log(`[3] Resultado: ${JSON.stringify(updateResult)}`);

    // 4. Verificar se atualizou
    log(`[4] Verificando dados após UPDATE...`);
    
    const { data: memberAfter } = await supabase
      .from('queue')
      .select('freq_atual, freq_08_14, freq_15_21, freq_esperada, retention_score')
      .eq('id', member.id)
      .single();

    log(`[4] Dados após UPDATE: ${JSON.stringify(memberAfter)}`);

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
      },
      calculated: {
        freq_atual: freqAtual,
        freq_08_14: freq08_14,
        freq_15_21: freq15_21,
        dias_atual: Array.from(diasSemanaAtual),
        dias_passada: Array.from(diasSemanaPassada),
        dias_2sem: Array.from(dias2SemanasAtras),
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
