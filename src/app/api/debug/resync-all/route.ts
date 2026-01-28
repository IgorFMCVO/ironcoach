// ============================================================================
// CAMINHO: src/app/api/debug/resync-all/route.ts
// ============================================================================
// IRON COACH - Resync de TODOS os membros ativos na fila
// Atualiza frequência, retention_score de todos os membros
// Acesse: /api/debug/resync-all
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos máximo

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EVO_API = 'https://evo-integracao-api.w12app.com.br';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

interface ResyncResult {
  evoId: number;
  name: string;
  before: { freq_atual: number; freq_08_14: number; freq_15_21: number };
  after: { freq_atual: number; freq_08_14: number; freq_15_21: number; retention_score: number };
  status: 'updated' | 'unchanged' | 'error';
  error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const results: ResyncResult[] = [];
  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  try {
    const auth = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;
    const headers = { Authorization: auth, 'Content-Type': 'application/json' };

    // 1. Buscar todos os membros ativos na fila
    console.log('[ResyncAll] Buscando membros ativos...');
    
    const { data: members, error: fetchError } = await supabase
      .from('queue')
      .select('id, evo_member_id, member_name, freq_atual, freq_08_14, freq_15_21, has_ficha, ficha_vencida, has_avaliacao, avaliacao_vencida')
      .is('check_out_time', null)
      .not('evo_member_id', 'is', null);

    if (fetchError || !members) {
      return NextResponse.json({ 
        error: 'Falha ao buscar membros',
        details: fetchError?.message 
      }, { status: 500 });
    }

    console.log(`[ResyncAll] Encontrados ${members.length} membros para processar`);

    // 2. Calcular datas das semanas (mesmo código do resync-one)
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

    const date30DaysAgo = new Date(nowBrazil.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateStartParam = date30DaysAgo.toISOString().split('T')[0];

    // 3. Processar cada membro
    for (const member of members) {
      const evoId = member.evo_member_id;
      const result: ResyncResult = {
        evoId,
        name: member.member_name,
        before: {
          freq_atual: member.freq_atual || 0,
          freq_08_14: member.freq_08_14 || 0,
          freq_15_21: member.freq_15_21 || 0,
        },
        after: { freq_atual: 0, freq_08_14: 0, freq_15_21: 0, retention_score: 0 },
        status: 'unchanged',
      };

      try {
        // Buscar entradas do EVO com retry
        let entries: any[] = [];
        
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const entriesUrl = `${EVO_API}/api/v1/entries?idMember=${evoId}&registerDateStart=${dateStartParam}&take=200`;
            const entriesResp = await fetch(entriesUrl, { headers, cache: 'no-store' });
            
            if (entriesResp.ok) {
              const data = await entriesResp.json();
              if (Array.isArray(data)) {
                entries = data;
                break;
              }
            }
          } catch {
            if (attempt < 2) await new Promise(r => setTimeout(r, 300));
          }
        }

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

        // Calcular retention_score
        let retentionScore = 0;
        const freqEsperada = 3;
        
        const freqReal = freqAtual > 0 ? freqAtual : freq08_14;
        if (freqReal > 0) {
          retentionScore += Math.min(50, Math.round((freqReal / freqEsperada) * 50));
        }
        
        if (member.has_ficha && !member.ficha_vencida) {
          retentionScore += 25;
        } else if (member.has_ficha && member.ficha_vencida) {
          retentionScore += 12;
        }
        
        if (member.has_avaliacao && !member.avaliacao_vencida) {
          retentionScore += 25;
        } else if (member.has_avaliacao && member.avaliacao_vencida) {
          retentionScore += 12;
        }

        result.after = { freq_atual: freqAtual, freq_08_14: freq08_14, freq_15_21: freq15_21, retention_score: retentionScore };

        // Verificar se houve mudança
        const changed = 
          result.before.freq_atual !== freqAtual ||
          result.before.freq_08_14 !== freq08_14 ||
          result.before.freq_15_21 !== freq15_21;

        if (changed) {
          // Atualizar no banco
          const { error: updateError } = await supabase
            .from('queue')
            .update({
              freq_atual: freqAtual,
              freq_08_14: freq08_14,
              freq_15_21: freq15_21,
              retention_score: retentionScore,
            })
            .eq('id', member.id);

          if (updateError) {
            result.status = 'error';
            result.error = updateError.message;
            errors++;
          } else {
            result.status = 'updated';
            updated++;
            console.log(`[ResyncAll] ✅ ${member.member_name}: ${result.before.freq_atual}→${freqAtual}, ${result.before.freq_08_14}→${freq08_14}`);
          }
        } else {
          unchanged++;
        }

      } catch (memberError) {
        result.status = 'error';
        result.error = memberError instanceof Error ? memberError.message : 'Erro desconhecido';
        errors++;
      }

      results.push(result);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      summary: {
        total: members.length,
        updated,
        unchanged,
        errors,
        durationMs: duration,
      },
      weeks: {
        thisWeek: startOfThisWeek.toISOString().split('T')[0],
        lastWeek: startOfLastWeek.toISOString().split('T')[0],
        twoWeeksAgo: startOf2WeeksAgo.toISOString().split('T')[0],
      },
      results: results.filter(r => r.status !== 'unchanged'), // Só mostrar os que mudaram ou erraram
    });

  } catch (error) {
    console.error('[ResyncAll] Erro:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
