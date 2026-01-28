// ============================================================================
// IRON COACH - API de Activity Log
// POST /api/activity-log - Registrar evento
// GET /api/activity-log - Buscar timeline
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Tipos de eventos
export type EventCategory = 'SYSTEM' | 'ATTENDANCE' | 'NOTIFICATION' | 'NAVIGATION' | 'MEMBER';

export type EventType = 
  // SYSTEM
  | 'SESSION_START' 
  | 'SESSION_END' 
  | 'SESSION_TIMEOUT'
  | 'APP_MINIMIZED'
  | 'APP_RESTORED'
  // ATTENDANCE
  | 'ATTENDANCE_START'
  | 'ATTENDANCE_END'
  | 'ATTENDANCE_AUTO_END'
  | 'ATTENDANCE_OVERTIME'
  | 'HELP_REQUEST_RESPONSE'
  // NOTIFICATION
  | 'NOTIFICATION_SENT'
  // NAVIGATION
  | 'PAGE_VIEW_GUIDE'
  | 'PAGE_VIEW_ADMIN'
  | 'PAGE_VIEW_SUPERVISION'
  | 'FILTER_CHANGED'
  // MEMBER
  | 'MANUAL_ENTRY'
  | 'MEMBER_EXPANDED'
  | 'WORKOUT_VIEWED';

interface ActivityLogEntry {
  coachId: string;
  coachName: string;
  eventType: EventType;
  eventCategory: EventCategory;
  description: string;
  memberName?: string;
  memberEvoId?: number;
  queueId?: string;
  metadata?: Record<string, any>;
  isWarning?: boolean;
  isPositive?: boolean;
}

/**
 * POST /api/activity-log
 * Registrar um novo evento
 */
export async function POST(request: NextRequest) {
  try {
    const body: ActivityLogEntry = await request.json();

    const {
      coachId,
      coachName,
      eventType,
      eventCategory,
      description,
      memberName,
      memberEvoId,
      queueId,
      metadata = {},
      isWarning = false,
      isPositive = false,
    } = body;

    // Validação básica
    if (!coachId || !coachName || !eventType || !eventCategory || !description) {
      return NextResponse.json({
        success: false,
        error: 'Campos obrigatórios: coachId, coachName, eventType, eventCategory, description'
      }, { status: 400 });
    }

    // Inserir no banco
    const { data, error } = await supabase
      .from('coach_activity_log')
      .insert({
        coach_id: coachId,
        coach_name: coachName,
        event_type: eventType,
        event_category: eventCategory,
        description,
        member_name: memberName,
        member_evo_id: memberEvoId,
        queue_id: queueId,
        metadata,
        is_warning: isWarning,
        is_positive: isPositive,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar atividade:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('Erro na API activity-log:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * GET /api/activity-log
 * Buscar timeline de atividades
 * Query params:
 *   - coachId: filtrar por professor
 *   - date: data específica (YYYY-MM-DD)
 *   - category: filtrar por categoria
 *   - limit: limite de registros (default: 100)
 *   - recent: se true, busca últimas 2 horas
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coachId');
    const date = searchParams.get('date');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');
    const recent = searchParams.get('recent') === 'true';
    const summary = searchParams.get('summary') === 'true';

    // Se pediu resumo
    if (summary) {
      const { data, error } = await supabase
        .from('coach_activity_summary_today')
        .select('*')
        .order('total_attendances', { ascending: false });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data,
      });
    }

    // Se pediu eventos recentes (tempo real)
    if (recent) {
      let query = supabase
        .from('coach_activity_recent')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (coachId) {
        query = query.eq('coach_id', coachId);
      }

      if (category) {
        query = query.eq('event_category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data,
        count: data?.length || 0,
      });
    }

    // Timeline padrão
    let query = supabase
      .from('coach_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filtro por data
    if (date) {
      query = query
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);
    } else {
      // Padrão: hoje
      const today = new Date().toISOString().split('T')[0];
      query = query
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);
    }

    // Filtro por professor
    if (coachId) {
      query = query.eq('coach_id', coachId);
    }

    // Filtro por categoria
    if (category) {
      query = query.eq('event_category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('Erro ao buscar timeline:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar timeline'
    }, { status: 500 });
  }
}
