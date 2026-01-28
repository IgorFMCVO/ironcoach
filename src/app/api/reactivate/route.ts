// src/app/api/reactivate/route.ts
// ============================================================================
// IRON COACH - API de Reativação de Membro
// Retorna um membro que fez checkout de volta à fila de atendimento
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ReactivateRequest {
  queueId: string;
  coachId?: string;
  coachName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReactivateRequest = await request.json();
    const { queueId, coachId, coachName } = body;

    console.log('🔄 API Reactivate POST:', { queueId, coachName });

    if (!queueId) {
      console.error('❌ queueId faltando');
      return NextResponse.json(
        { success: false, error: 'queueId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar dados atuais do membro
    const { data: queueItem, error: fetchError } = await supabase
      .from('queue')
      .select('*')
      .eq('id', queueId)
      .single();

    if (fetchError || !queueItem) {
      console.error('❌ Item não encontrado:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Membro não encontrado', details: fetchError },
        { status: 404 }
      );
    }

    // Verificar se realmente fez checkout
    if (!queueItem.check_out_time) {
      console.log('⚠️ Membro não fez checkout');
      return NextResponse.json({
        success: true,
        message: 'Membro já está ativo na fila',
        alreadyActive: true,
      });
    }

    // Reativar o membro
    const { data: updatedData, error: updateError } = await supabase
      .from('queue')
      .update({
        check_out_time: null,
        status: 'TRAINING',
        exit_type: null,
        exit_reason: null,
        exit_notes: null,
        exit_by_coach_id: null,
        exit_by_coach_name: null,
        session_duration_seconds: null,
        // Registrar quem reativou
        reactivated_at: new Date().toISOString(),
        reactivated_by_coach_id: coachId || null,
        reactivated_by_coach_name: coachName || null,
      })
      .eq('id', queueId)
      .select();

    if (updateError) {
      console.error('❌ Erro ao reativar:', updateError);
      return NextResponse.json(
        { success: false, error: 'Erro ao reativar membro', details: updateError },
        { status: 500 }
      );
    }

    console.log(`✅ ${queueItem.member_name} reativado na fila`);

    return NextResponse.json({
      success: true,
      message: 'Membro reativado com sucesso',
      data: {
        memberName: queueItem.member_name,
        previousCheckout: queueItem.check_out_time,
        previousReason: queueItem.exit_reason,
      },
    });

  } catch (error) {
    console.error('❌ Exceção na reativação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
