// ============================================================================
// DEBUG: Diagnóstico COMPLETO do Sistema de Cardio
// GET /api/debug/cardio-diagnostic
// POST /api/debug/cardio-diagnostic - Testar iniciar cardio manualmente
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(request: NextRequest) {
  const diagnostic: any = {
    timestamp: new Date().toISOString(),
    status: 'CHECKING',
    checks: {},
    errors: [],
    recommendations: [],
  };

  // ========== CHECK 1: Verificar colunas de cardio na tabela queue ==========
  try {
    const { data: columns, error } = await supabase
      .from('queue')
      .select('*')
      .limit(1);

    if (error) {
      diagnostic.checks.queueTable = { status: 'ERROR', error: error.message };
      diagnostic.errors.push(`Tabela queue: ${error.message}`);
    } else {
      const sampleRow = columns?.[0] || {};
      const allColumns = Object.keys(sampleRow);
      
      const cardioColumns = {
        cardio_started_at: allColumns.includes('cardio_started_at'),
        cardio_duration_minutes: allColumns.includes('cardio_duration_minutes'),
        cardio_destination: allColumns.includes('cardio_destination'),
        cardio_started_by_coach_id: allColumns.includes('cardio_started_by_coach_id'),
        cardio_started_by_coach_name: allColumns.includes('cardio_started_by_coach_name'),
      };

      const missingColumns = Object.entries(cardioColumns)
        .filter(([_, exists]) => !exists)
        .map(([col]) => col);

      diagnostic.checks.queueColumns = {
        status: missingColumns.length === 0 ? 'OK' : 'MISSING',
        columns: cardioColumns,
        missingColumns,
        allColumns,
      };

      if (missingColumns.length > 0) {
        diagnostic.errors.push(`Colunas faltando na tabela queue: ${missingColumns.join(', ')}`);
        diagnostic.recommendations.push('Execute o SQL para adicionar as colunas de cardio');
      }
    }
  } catch (e) {
    diagnostic.checks.queueTable = { status: 'EXCEPTION', error: String(e) };
    diagnostic.errors.push(`Exceção ao verificar tabela queue: ${String(e)}`);
  }

  // ========== CHECK 2: Verificar se função start_member_cardio existe ==========
  try {
    const { data, error } = await supabase.rpc('start_member_cardio', {
      p_queue_id: '00000000-0000-0000-0000-000000000000',
      p_coach_id: '00000000-0000-0000-0000-000000000000',
      p_coach_name: 'TEST',
      p_duration_minutes: 10,
      p_destination: 'QUEUE',
    });

    if (error) {
      // Se o erro contém "function" ou "does not exist", a função não existe
      const functionMissing = error.message.toLowerCase().includes('function') || 
                             error.message.toLowerCase().includes('does not exist') ||
                             error.code === '42883';
      
      diagnostic.checks.functionStartCardio = {
        status: functionMissing ? 'MISSING' : 'EXISTS_WITH_ERROR',
        error: error.message,
        code: error.code,
        functionMissing,
      };

      if (functionMissing) {
        diagnostic.errors.push('Função start_member_cardio NÃO EXISTE no banco');
        diagnostic.recommendations.push('Execute o SQL cardio_system.sql no Supabase');
      } else {
        // Função existe mas retornou erro (normal, pois passamos UUID fake)
        diagnostic.checks.functionStartCardio.status = 'OK';
      }
    } else {
      diagnostic.checks.functionStartCardio = {
        status: 'OK',
        response: data,
      };
    }
  } catch (e) {
    diagnostic.checks.functionStartCardio = { status: 'EXCEPTION', error: String(e) };
    diagnostic.errors.push(`Exceção ao testar start_member_cardio: ${String(e)}`);
  }

  // ========== CHECK 3: Verificar se função get_cardio_members existe ==========
  try {
    const { data, error } = await supabase.rpc('get_cardio_members');

    if (error) {
      const functionMissing = error.message.toLowerCase().includes('function') || 
                             error.message.toLowerCase().includes('does not exist') ||
                             error.code === '42883';
      
      diagnostic.checks.functionGetCardioMembers = {
        status: functionMissing ? 'MISSING' : 'ERROR',
        error: error.message,
        code: error.code,
      };

      if (functionMissing) {
        diagnostic.errors.push('Função get_cardio_members NÃO EXISTE no banco');
      }
    } else {
      diagnostic.checks.functionGetCardioMembers = {
        status: 'OK',
        membersInCardio: data?.members?.length || 0,
        response: data,
      };
    }
  } catch (e) {
    diagnostic.checks.functionGetCardioMembers = { status: 'EXCEPTION', error: String(e) };
  }

  // ========== CHECK 4: Verificar se função finish_member_cardio existe ==========
  try {
    const { data, error } = await supabase.rpc('finish_member_cardio', {
      p_queue_id: '00000000-0000-0000-0000-000000000000',
    });

    if (error) {
      const functionMissing = error.message.toLowerCase().includes('function') || 
                             error.message.toLowerCase().includes('does not exist') ||
                             error.code === '42883';
      
      diagnostic.checks.functionFinishCardio = {
        status: functionMissing ? 'MISSING' : 'EXISTS_WITH_ERROR',
        error: error.message,
        code: error.code,
      };

      if (functionMissing) {
        diagnostic.errors.push('Função finish_member_cardio NÃO EXISTE no banco');
      } else {
        diagnostic.checks.functionFinishCardio.status = 'OK';
      }
    } else {
      diagnostic.checks.functionFinishCardio = {
        status: 'OK',
        response: data,
      };
    }
  } catch (e) {
    diagnostic.checks.functionFinishCardio = { status: 'EXCEPTION', error: String(e) };
  }

  // ========== CHECK 5: Verificar membros atualmente em cardio ==========
  try {
    const { data, error } = await supabase
      .from('queue')
      .select('id, member_name, status, cardio_started_at, cardio_duration_minutes, cardio_destination')
      .eq('status', 'DOING_CARDIO')
      .is('check_out_time', null);

    if (error) {
      diagnostic.checks.membersInCardio = { status: 'ERROR', error: error.message };
    } else {
      diagnostic.checks.membersInCardio = {
        status: 'OK',
        count: data?.length || 0,
        members: data || [],
      };
    }
  } catch (e) {
    diagnostic.checks.membersInCardio = { status: 'EXCEPTION', error: String(e) };
  }

  // ========== CHECK 6: Listar membros na fila (para teste) ==========
  try {
    const { data, error } = await supabase
      .from('queue')
      .select('id, member_name, status, evo_member_id')
      .is('check_out_time', null)
      .neq('status', 'FINISHED')
      .limit(5);

    if (error) {
      diagnostic.checks.availableMembers = { status: 'ERROR', error: error.message };
    } else {
      diagnostic.checks.availableMembers = {
        status: 'OK',
        count: data?.length || 0,
        members: (data || []).map(m => ({
          id: m.id,
          name: m.member_name,
          status: m.status,
        })),
      };
    }
  } catch (e) {
    diagnostic.checks.availableMembers = { status: 'EXCEPTION', error: String(e) };
  }

  // ========== CONCLUSÃO ==========
  const hasErrors = diagnostic.errors.length > 0;
  const allFunctionsOk = 
    diagnostic.checks.functionStartCardio?.status === 'OK' &&
    diagnostic.checks.functionGetCardioMembers?.status === 'OK' &&
    diagnostic.checks.functionFinishCardio?.status === 'OK';
  const columnsOk = diagnostic.checks.queueColumns?.status === 'OK';

  diagnostic.status = !hasErrors && allFunctionsOk && columnsOk ? 'HEALTHY' : 'UNHEALTHY';
  
  diagnostic.summary = {
    queueColumnsOk: columnsOk,
    allFunctionsOk,
    membersInCardio: diagnostic.checks.membersInCardio?.count || 0,
    totalErrors: diagnostic.errors.length,
  };

  if (!columnsOk) {
    diagnostic.recommendations.push('Execute: ALTER TABLE queue ADD COLUMN IF NOT EXISTS cardio_started_at TIMESTAMPTZ; (e outras colunas)');
  }

  if (!allFunctionsOk) {
    diagnostic.recommendations.push('Execute o arquivo cardio_system.sql no Supabase SQL Editor');
  }

  return NextResponse.json(diagnostic);
}

// POST - Testar iniciar cardio para um membro específico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queueId, coachId, coachName, duration, destination } = body;

    if (!queueId) {
      return NextResponse.json({ 
        success: false, 
        error: 'queueId obrigatório',
        hint: 'Use GET /api/debug/cardio-diagnostic para ver membros disponíveis'
      }, { status: 400 });
    }

    // Tentar iniciar cardio
    const { data, error } = await supabase.rpc('start_member_cardio', {
      p_queue_id: queueId,
      p_coach_id: coachId || '00000000-0000-0000-0000-000000000001',
      p_coach_name: coachName || 'TEST_COACH',
      p_duration_minutes: duration || 10,
      p_destination: destination || 'QUEUE',
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        hint: error.code === '42883' ? 'Função não existe - execute cardio_system.sql' : null,
      });
    }

    return NextResponse.json({
      success: true,
      result: data,
      message: 'Cardio iniciado com sucesso (teste)',
    });

  } catch (e) {
    return NextResponse.json({
      success: false,
      error: String(e),
    }, { status: 500 });
  }
}
