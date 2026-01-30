// ============================================================================
// CAMINHO: src/app/api/attendance/route.ts
// ============================================================================
// API para gerenciar atendimentos com sistema anti-burla integrado
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configurações padrão (serão sobrescritas pelo banco)
const DEFAULT_MIN_ATTENDANCE_TIME = 10; // segundos
const DEFAULT_SEQUENCE_COUNT = 3; // atendimentos suspeitos
const DEFAULT_SEQUENCE_WINDOW = 5; // minutos

// ============================================================================
// POST - Iniciar ou Finalizar Atendimento
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Buscar configurações
    const { data: config } = await supabase
      .from('environment_config')
      .select('tempo_minimo_atendimento, alertas_burla_sequencia, alertas_burla_janela_minutos')
      .eq('gym_id', 'impacto')
      .single();

    const minTime = config?.tempo_minimo_atendimento || DEFAULT_MIN_ATTENDANCE_TIME;
    const seqCount = config?.alertas_burla_sequencia || DEFAULT_SEQUENCE_COUNT;
    const seqWindow = config?.alertas_burla_janela_minutos || DEFAULT_SEQUENCE_WINDOW;

    // ========================================
    // INICIAR ATENDIMENTO
    // ========================================
    if (action === 'start') {
      const { coachId, coachName, memberId, memberName, memberPriority, environmentLevel } = body;

      const { data, error } = await supabase
        .from('attendance_logs')
        .insert({
          coach_id: coachId,
          coach_name: coachName,
          member_id: memberId,
          member_name: memberName,
          member_priority: memberPriority,
          environment_level: environmentLevel,
          started_at: new Date().toISOString(),
          status: 'IN_PROGRESS'
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        attendance: data
      });
    }

    // ========================================
    // FINALIZAR ATENDIMENTO
    // ========================================
    if (action === 'finish') {
      const { 
        attendanceId, 
        interventionType, 
        interventionNote,
        confirmedSuspicious // Se o usuário confirmou mesmo sendo < 10s
      } = body;

      // Buscar atendimento atual
      const { data: attendance, error: fetchError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('id', attendanceId)
        .single();

      if (fetchError || !attendance) {
        return NextResponse.json({ 
          success: false, 
          error: 'Atendimento não encontrado' 
        }, { status: 404 });
      }

      // Calcular duração
      const startedAt = new Date(attendance.started_at);
      const finishedAt = new Date();
      const durationSeconds = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000);

      // Verificar se é suspeito
      const isTooShort = durationSeconds < minTime;
      const isSuspicious = isTooShort && confirmedSuspicious;
      const needsConfirmation = isTooShort && !confirmedSuspicious;

      // Se precisa confirmação, retornar para pedir
      if (needsConfirmation) {
        return NextResponse.json({
          success: true,
          needsConfirmation: true,
          durationSeconds,
          minTime,
          message: `Atendimento muito curto (${durationSeconds}s). Tem certeza que finalizou?`
        });
      }

      // Atualizar atendimento
      const { error: updateError } = await supabase
        .from('attendance_logs')
        .update({
          finished_at: finishedAt.toISOString(),
          duration_seconds: durationSeconds,
          intervention_type: interventionType,
          intervention_note: interventionNote,
          status: isSuspicious ? 'SUSPICIOUS' : 'COMPLETED',
          is_suspicious: isSuspicious,
          suspicious_reason: isSuspicious ? 'TOO_SHORT' : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', attendanceId);

      if (updateError) throw updateError;

      // Se suspeito, verificar padrão de sequência
      let sequenceAlert = false;
      if (isSuspicious) {
        const windowStart = new Date(Date.now() - seqWindow * 60 * 1000).toISOString();
        
        const { data: recentSuspicious } = await supabase
          .from('attendance_logs')
          .select('id')
          .eq('coach_id', attendance.coach_id)
          .eq('is_suspicious', true)
          .gte('created_at', windowStart);

        const suspiciousCount = recentSuspicious?.length || 0;

        if (suspiciousCount >= seqCount) {
          // Verificar se já existe alerta recente
          const { data: existingAlert } = await supabase
            .from('fraud_alerts')
            .select('id')
            .eq('coach_id', attendance.coach_id)
            .eq('status', 'PENDING')
            .gte('created_at', windowStart)
            .single();

          if (!existingAlert) {
            // Criar alerta de fraude
            await supabase
              .from('fraud_alerts')
              .insert({
                coach_id: attendance.coach_id,
                coach_name: attendance.coach_name,
                alert_type: 'SEQUENCE_PATTERN',
                suspicious_count: suspiciousCount,
                time_window_minutes: seqWindow,
                attendance_ids: recentSuspicious?.map(s => s.id) || [],
                status: 'PENDING'
              });

            sequenceAlert = true;
          }
        }
      }

      return NextResponse.json({
        success: true,
        attendance: {
          id: attendanceId,
          duration_seconds: durationSeconds,
          is_suspicious: isSuspicious,
          intervention_type: interventionType
        },
        sequenceAlert
      });
    }

    // ========================================
    // CANCELAR ATENDIMENTO
    // ========================================
    if (action === 'cancel') {
      const { attendanceId } = body;

      await supabase
        .from('attendance_logs')
        .update({
          status: 'CANCELLED',
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', attendanceId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Erro na API de atendimento:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}

// ============================================================================
// GET - Buscar estatísticas e histórico
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'stats';
    const coachId = searchParams.get('coachId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // ========================================
    // ESTATÍSTICAS DO PROFESSOR
    // ========================================
    if (type === 'stats' && coachId) {
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;

      const { data: logs } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('coach_id', coachId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      const total = logs?.length || 0;
      const completed = logs?.filter(l => l.status === 'COMPLETED').length || 0;
      const suspicious = logs?.filter(l => l.is_suspicious).length || 0;
      const avgDuration = logs && logs.length > 0
        ? Math.round(
            logs
              .filter(l => l.duration_seconds)
              .reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / 
            (logs.filter(l => l.duration_seconds).length || 1)
          )
        : 0;

      // Contar por tipo de intervenção
      const byType: Record<string, number> = {};
      logs?.forEach(l => {
        if (l.intervention_type) {
          byType[l.intervention_type] = (byType[l.intervention_type] || 0) + 1;
        }
      });

      return NextResponse.json({
        success: true,
        stats: {
          total,
          completed,
          suspicious,
          avgDuration,
          byType
        }
      });
    }

    // ========================================
    // ALERTAS DE FRAUDE PENDENTES
    // ========================================
    if (type === 'fraud-alerts') {
      const { data: alerts } = await supabase
        .from('fraud_alerts')
        .select('*')
        .in('status', ['PENDING', 'VIEWED'])
        .order('created_at', { ascending: false })
        .limit(50);

      return NextResponse.json({
        success: true,
        alerts: alerts || []
      });
    }

    // ========================================
    // TIPOS DE INTERVENÇÃO
    // ========================================
    if (type === 'intervention-types') {
      const { data: types } = await supabase
        .from('intervention_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      return NextResponse.json({
        success: true,
        types: types || [
          { id: 'CORRECTION', label: 'Correção de Exercício', emoji: '💪', color: '#30D158' },
          { id: 'ORIENTATION', label: 'Orientação de Ficha', emoji: '📋', color: '#007AFF' },
          { id: 'MOTIVATION', label: 'Motivação', emoji: '🎯', color: '#AF52DE' },
          { id: 'QUESTION', label: 'Dúvida', emoji: '❓', color: '#FFCC00' },
          { id: 'ASSISTANCE', label: 'Auxílio em Exercício', emoji: '🏋️', color: '#FF9500' },
          { id: 'WELCOME', label: 'Boas-vindas', emoji: '👋', color: '#FF3B30' },
          { id: 'OTHER', label: 'Outro', emoji: '📝', color: '#8E8E93' }
        ]
      });
    }

    // ========================================
    // HISTÓRICO DE ATENDIMENTOS
    // ========================================
    if (type === 'history') {
      let query = supabase
        .from('attendance_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (coachId) {
        query = query.eq('coach_id', coachId);
      }

      const suspicious = searchParams.get('suspicious');
      if (suspicious === 'true') {
        query = query.eq('is_suspicious', true);
      }

      const { data } = await query;

      return NextResponse.json({
        success: true,
        history: data || []
      });
    }

    return NextResponse.json({ success: false, error: 'Tipo inválido' }, { status: 400 });

  } catch (error) {
    console.error('Erro ao buscar atendimentos:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}

// ============================================================================
// PATCH - Atualizar alerta de fraude
// ============================================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, action, actionedBy, actionNote } = body;

    if (action === 'view') {
      await supabase
        .from('fraud_alerts')
        .update({
          status: 'VIEWED',
          viewed_by: actionedBy,
          viewed_at: new Date().toISOString()
        })
        .eq('id', alertId);
    } else if (action === 'dismiss') {
      await supabase
        .from('fraud_alerts')
        .update({
          status: 'DISMISSED',
          actioned_by: actionedBy,
          actioned_at: new Date().toISOString(),
          action_taken: 'DISMISSED',
          action_note: actionNote
        })
        .eq('id', alertId);
    } else if (action === 'warn') {
      await supabase
        .from('fraud_alerts')
        .update({
          status: 'ACTIONED',
          actioned_by: actionedBy,
          actioned_at: new Date().toISOString(),
          action_taken: 'WARNING_ISSUED',
          action_note: actionNote
        })
        .eq('id', alertId);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erro ao atualizar alerta:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}
