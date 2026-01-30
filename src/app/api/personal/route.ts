// ============================================================================
// CAMINHO: src/app/api/personal/route.ts
// ============================================================================
// API para:
// 1. Enviar aluno para Personal (PURPLE)
// 2. Reativar aluno (volta do PURPLE para cor original)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, queueId, coachId, coachName } = body;

    // ========================================
    // ENVIAR PARA PERSONAL (PURPLE)
    // ========================================
    if (action === 'sendToPersonal') {
      // Tentar usar função SQL
      const { data, error } = await supabase.rpc('send_to_personal', {
        p_queue_id: queueId,
        p_coach_id: coachId,
        p_coach_name: coachName
      });

      if (error) {
        console.error('Erro RPC send_to_personal:', error);
        
        // Fallback: fazer update direto
        const { data: card } = await supabase
          .from('queue')
          .select('priority')
          .eq('id', queueId)
          .single();

        if (card) {
          const { error: updateError } = await supabase
            .from('queue')
            .update({
              original_priority: card.priority,
              priority: 'PURPLE',
              alerts_enabled: false,
              ignore_time_alerts: true,
              sent_to_personal_at: new Date().toISOString(),
              sent_to_personal_by_coach_id: coachId,
              sent_to_personal_by_coach_name: coachName,
              last_attended_at: new Date().toISOString()
            })
            .eq('id', queueId);

          if (updateError) throw updateError;

          return NextResponse.json({
            success: true,
            message: 'Aluno enviado para Personal/Autônomo',
            original_priority: card.priority,
            new_priority: 'PURPLE'
          });
        }
        
        throw error;
      }

      return NextResponse.json({ success: true, ...data });
    }

    // ========================================
    // REATIVAR (volta do PURPLE para cor original)
    // ========================================
    if (action === 'reactivate') {
      // Tentar usar função SQL
      const { data, error } = await supabase.rpc('reactivate_from_personal', {
        p_queue_id: queueId,
        p_coach_id: coachId,
        p_coach_name: coachName
      });

      if (error) {
        console.error('Erro RPC reactivate_from_personal:', error);
        
        // Fallback: fazer update direto
        const { data: card } = await supabase
          .from('queue')
          .select('priority, original_priority')
          .eq('id', queueId)
          .single();

        if (card) {
          const newPriority = card.original_priority || 'GREEN';
          
          const { error: updateError } = await supabase
            .from('queue')
            .update({
              priority: newPriority,
              alerts_enabled: true,
              ignore_time_alerts: false,
              original_priority: null,
              sent_to_personal_at: null,
              sent_to_personal_by_coach_id: null,
              sent_to_personal_by_coach_name: null,
              reactivated_at: new Date().toISOString(),
              reactivated_by_coach_id: coachId,
              reactivated_by_coach_name: coachName,
              last_attended_at: new Date().toISOString()
            })
            .eq('id', queueId);

          if (updateError) throw updateError;

          return NextResponse.json({
            success: true,
            message: 'Aluno reativado no dashboard',
            old_priority: card.priority,
            new_priority: newPriority
          });
        }
        
        throw error;
      }

      return NextResponse.json({ success: true, ...data });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Erro na API personal:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}
