// ============================================================================
// DEBUG: Verificar sistema de cardio
// GET /api/debug/cardio-test
// POST /api/debug/cardio-test - Testar iniciar cardio
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // Teste 1: Verificar se a função start_member_cardio existe
  try {
    const { data, error } = await supabase.rpc('start_member_cardio', {
      p_queue_id: '00000000-0000-0000-0000-000000000000', // UUID fake para teste
      p_coach_id: '00000000-0000-0000-0000-000000000000',
      p_coach_name: 'TEST',
      p_duration_minutes: 10,
      p_destination: 'QUEUE',
    });

    if (error) {
      results.tests['start_member_cardio'] = {
        exists: !error.message.includes('function') && !error.message.includes('does not exist'),
        error: error.message,
        code: error.code,
      };
    } else {
      results.tests['start_member_cardio'] = {
        exists: true,
        response: data,
      };
    }
  } catch (e) {
    results.tests['start_member_cardio'] = { exists: false, exception: String(e) };
  }

  // Teste 2: Verificar se a função get_cardio_members existe
  try {
    const { data, error } = await supabase.rpc('get_cardio_members');

    if (error) {
      results.tests['get_cardio_members'] = {
        exists: !error.message.includes('function') && !error.message.includes('does not exist'),
        error: error.message,
        code: error.code,
      };
    } else {
      results.tests['get_cardio_members'] = {
        exists: true,
        membersCount: data?.members?.length || 0,
        response: data,
      };
    }
  } catch (e) {
    results.tests['get_cardio_members'] = { exists: false, exception: String(e) };
  }

  // Teste 3: Verificar se a função finish_member_cardio existe
  try {
    const { data, error } = await supabase.rpc('finish_member_cardio', {
      p_queue_id: '00000000-0000-0000-0000-000000000000',
    });

    if (error) {
      results.tests['finish_member_cardio'] = {
        exists: !error.message.includes('function') && !error.message.includes('does not exist'),
        error: error.message,
        code: error.code,
      };
    } else {
      results.tests['finish_member_cardio'] = {
        exists: true,
        response: data,
      };
    }
  } catch (e) {
    results.tests['finish_member_cardio'] = { exists: false, exception: String(e) };
  }

  // Teste 4: Verificar estrutura da tabela attendance_queue
  try {
    const { data, error } = await supabase
      .from('attendance_queue')
      .select('*')
      .limit(1);

    if (error) {
      results.tests['attendance_queue_structure'] = {
        error: error.message,
      };
    } else {
      results.tests['attendance_queue_structure'] = {
        exists: true,
        sampleColumns: data && data[0] ? Object.keys(data[0]) : [],
        hasCardioColumns: data && data[0] ? {
          cardio_started_at: 'cardio_started_at' in (data[0] || {}),
          cardio_duration_minutes: 'cardio_duration_minutes' in (data[0] || {}),
          cardio_destination: 'cardio_destination' in (data[0] || {}),
          cardio_started_by_coach_id: 'cardio_started_by_coach_id' in (data[0] || {}),
          cardio_started_by_coach_name: 'cardio_started_by_coach_name' in (data[0] || {}),
        } : 'no data',
      };
    }
  } catch (e) {
    results.tests['attendance_queue_structure'] = { exception: String(e) };
  }

  // Teste 5: Verificar se há registros com cardio ativo
  try {
    const { data, error } = await supabase
      .from('attendance_queue')
      .select('id, member_name, status, cardio_started_at, cardio_duration_minutes, cardio_destination')
      .not('cardio_started_at', 'is', null)
      .limit(5);

    if (error) {
      results.tests['cardio_active_records'] = {
        error: error.message,
      };
    } else {
      results.tests['cardio_active_records'] = {
        count: data?.length || 0,
        records: data || [],
      };
    }
  } catch (e) {
    results.tests['cardio_active_records'] = { exception: String(e) };
  }

  // Conclusão
  const allFunctionsExist = 
    results.tests['start_member_cardio']?.exists &&
    results.tests['get_cardio_members']?.exists &&
    results.tests['finish_member_cardio']?.exists;

  results.conclusion = {
    allFunctionsExist,
    recommendation: !allFunctionsExist 
      ? 'As funções RPC de cardio NÃO existem no Supabase. É necessário criar as funções SQL.'
      : 'Funções existem. Verificar se as colunas de cardio existem na tabela.',
  };

  return NextResponse.json(results);
}
