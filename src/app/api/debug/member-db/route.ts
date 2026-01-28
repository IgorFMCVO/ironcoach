// src/app/api/debug/member-db/route.ts
// ============================================================================
// IRON COACH - API de DIAGNÓSTICO: Comparar dados do BANCO vs EVO
// Acesse: /api/debug/member-db?evoId=XXXXX
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const evoId = searchParams.get('evoId');
  const name = searchParams.get('name');

  try {
    // Buscar por evo_member_id ou por nome
    let query = supabase
      .from('queue')
      .select('*')
      .is('check_out_time', null);

    if (evoId) {
      query = query.eq('evo_member_id', parseInt(evoId));
    } else if (name) {
      query = query.ilike('member_name', `%${name}%`);
    } else {
      // Retornar todos os membros na fila com seus dados de frequência
      const { data: allMembers, error: allError } = await supabase
        .from('queue')
        .select('id, member_name, evo_member_id, freq_atual, freq_08_14, freq_15_21, freq_esperada, retention_score, priority, check_in_time')
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(20);

      if (allError) {
        return NextResponse.json({ error: allError.message }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Use ?evoId=XXXXX ou ?name=NOME para buscar um membro específico',
        totalMembersInQueue: allMembers?.length || 0,
        sampleMembers: allMembers?.map(m => ({
          id: m.id,
          name: m.member_name,
          evoId: m.evo_member_id,
          freq: {
            atual: m.freq_atual,
            passada: m.freq_08_14,
            duasSem: m.freq_15_21,
            esperada: m.freq_esperada,
          },
          retention: m.retention_score,
          priority: m.priority,
        })),
      });
    }

    const { data: member, error } = await query.single();

    if (error) {
      return NextResponse.json({ 
        error: 'Membro não encontrado na fila',
        details: error.message,
        hint: 'Use ?evoId=XXXXX ou ?name=NOME'
      }, { status: 404 });
    }

    // Listar todas as colunas que temos
    const frequencyFields = {
      freq_atual: member.freq_atual,
      freq_08_14: member.freq_08_14,
      freq_15_21: member.freq_15_21,
      freq_esperada: member.freq_esperada,
      retention_score: member.retention_score,
      has_ficha: member.has_ficha,
      has_avaliacao: member.has_avaliacao,
      ficha_vencida: member.ficha_vencida,
      avaliacao_vencida: member.avaliacao_vencida,
      churn_level: member.churn_level,
    };

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        name: member.member_name,
        evoMemberId: member.evo_member_id,
        priority: member.priority,
        checkInTime: member.check_in_time,
        status: member.status,
      },
      frequencyData: frequencyFields,
      allFields: member, // Todos os campos para debug
      diagnosis: {
        hasEvoId: !!member.evo_member_id,
        hasFreqAtual: member.freq_atual !== null && member.freq_atual !== undefined,
        freqAtualValue: member.freq_atual,
        freqAtualIsZero: member.freq_atual === 0,
        recommendation: member.freq_atual === null 
          ? 'freq_atual é NULL - execute o resync ou a coluna não existe'
          : member.freq_atual === 0
            ? 'freq_atual é 0 - membro pode não ter entradas ou resync não atualizou'
            : 'freq_atual tem valor - dados estão OK'
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Erro ao buscar dados',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
