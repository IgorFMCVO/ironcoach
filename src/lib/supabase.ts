// src/lib/supabase.ts
// ============================================================================
// IRON COACH - SUPABASE CLIENT (CORRIGIDO)
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Running in offline mode.');
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// ============================================================================
// TYPES
// ============================================================================

export type Priority = 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'GREEN' | 'BLACK';
export type QueueStatus = 'WAITING' | 'TRAINING' | 'BEING_ATTENDED' | 'IDLE';

export interface Coach {
  id: string;
  email: string;
  name: string;
  initials: string;
  avatar_url?: string;
  is_active: boolean;
}

export interface QueueMember {
  id: string;
  member_name: string;
  member_photo_url?: string;
  status: QueueStatus;
  priority: Priority;
  help_requested: boolean;
  workout_letter?: string;
  workout_name?: string;
  current_exercise?: string;
  workout_progress: number;
  tags: string[];
  days_as_member: number;
  total_workouts: number;
  completion_rate: number;
  check_in_time: string;
  check_out_time?: string;
  attended_by?: string;
  attendance_started_at?: string;
  last_attended_at?: string;
}

export interface Attendance {
  id: string;
  member_id?: string;
  member_name: string;
  coach_id?: string;
  coach_name: string;
  priority: Priority;
  check_in_time: string;
  attendance_started_at: string;
  attendance_ended_at: string;
  wait_duration: number;
  attendance_duration: number;
  result: 'completed' | 'partial' | 'cancelled';
  notes?: string;
  workout_letter?: string;
  workout_name?: string;
}

// ============================================================================
// QUEUE FUNCTIONS
// ============================================================================

export async function getQueue(): Promise<QueueMember[]> {
  const { data, error } = await supabase
    .from('queue')
    .select('*')
    .is('check_out_time', null)
    .order('help_requested', { ascending: false })
    .order('priority', { ascending: true })
    .order('check_in_time', { ascending: true });

  if (error) {
    console.error('Error fetching queue:', error);
    return [];
  }

  const priorityOrder = { RED: 0, ORANGE: 1, YELLOW: 2, BLUE: 3, GREEN: 4, BLACK: 5 };
  
  return (data || [])
    .map(item => ({
      ...item,
      tags: item.tags || [],
    }))
    .sort((a, b) => {
      if (a.help_requested !== b.help_requested) return a.help_requested ? -1 : 1;
      return priorityOrder[a.priority as Priority] - priorityOrder[b.priority as Priority];
    });
}

export async function addToQueue(data: {
  member_name: string;
  priority: Priority;
  tags: string[];
  help_requested?: boolean;
  days_as_member?: number;
  total_workouts?: number;
  completion_rate?: number;
  workout_letter?: string;
  workout_name?: string;
  current_exercise?: string;
  check_in_time?: Date; // Para restaurar membros com o tempo original
}): Promise<QueueMember | null> {
  const { data: result, error } = await supabase
    .from('queue')
    .insert({
      member_name: data.member_name,
      priority: data.priority,
      tags: data.tags,
      help_requested: data.help_requested || false,
      days_as_member: data.days_as_member || 0,
      total_workouts: data.total_workouts || 0,
      completion_rate: data.completion_rate || 0,
      workout_letter: data.workout_letter,
      workout_name: data.workout_name,
      current_exercise: data.current_exercise,
      status: 'TRAINING',
      check_in_time: data.check_in_time?.toISOString() || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding to queue:', error);
    return null;
  }

  return result;
}

export async function startAttendance(queueId: string, coachId?: string): Promise<boolean> {
  const { error } = await supabase
    .from('queue')
    .update({
      status: 'BEING_ATTENDED',
      help_requested: false,
      attended_by: coachId,
      attendance_started_at: new Date().toISOString(),
    })
    .eq('id', queueId);

  if (error) {
    console.error('Error starting attendance:', error);
    return false;
  }

  return true;
}

export async function endAttendance(
  queueId: string,
  result: 'completed' | 'partial',
  coachName: string = 'Professor'
): Promise<boolean> {
  const { data: queueItem, error: fetchError } = await supabase
    .from('queue')
    .select('*')
    .eq('id', queueId)
    .single();

  if (fetchError || !queueItem) {
    console.error('Error fetching queue item:', fetchError);
    return false;
  }

  const now = new Date().toISOString();
  const checkInTime = new Date(queueItem.check_in_time);
  const attendanceStartedAt = new Date(queueItem.attendance_started_at);
  const endedAt = new Date(now);

  const waitDuration = Math.floor((attendanceStartedAt.getTime() - checkInTime.getTime()) / 1000);
  const attendanceDuration = Math.floor((endedAt.getTime() - attendanceStartedAt.getTime()) / 1000);

  await supabase
    .from('attendances')
    .insert({
      member_id: queueItem.member_id,
      member_name: queueItem.member_name,
      coach_id: queueItem.attended_by,
      coach_name: coachName,
      priority: queueItem.priority,
      check_in_time: queueItem.check_in_time,
      attendance_started_at: queueItem.attendance_started_at,
      attendance_ended_at: now,
      wait_duration: waitDuration,
      attendance_duration: attendanceDuration,
      result: result,
      workout_letter: queueItem.workout_letter,
      workout_name: queueItem.workout_name,
    });

  const { error: updateError } = await supabase
    .from('queue')
    .update({
      status: 'TRAINING',
      attended_by: null,
      attendance_started_at: null,
      last_attended_at: now,
    })
    .eq('id', queueId);

  if (updateError) {
    console.error('Error updating queue status:', updateError);
    return false;
  }

  return true;
}

export async function removeFromQueue(queueId: string, reason?: string, coachId?: string, coachName?: string): Promise<boolean> {
  console.log('🔄 removeFromQueue chamado com ID:', queueId);
  
  if (!queueId) {
    console.error('❌ removeFromQueue: queueId inválido');
    return false;
  }
  
  try {
    // Usar a API de checkout que bypassa RLS
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queueId,
        exitType: 'professor',
        exitReason: reason || 'treino_finalizado',
        coachId,
        coachName,
      }),
    });

    const result = await response.json();
    
    console.log('📡 API checkout resposta:', result);

    if (!response.ok || !result.success) {
      console.error('❌ Erro na API checkout:', result.error || 'Erro desconhecido');
      return false;
    }
    
    console.log('✅ removeFromQueue sucesso via API');
    return true;
  } catch (e) {
    console.error('❌ Exceção em removeFromQueue:', e);
    return false;
  }
}

export async function requestHelp(queueId: string): Promise<boolean> {
  const { error } = await supabase
    .from('queue')
    .update({
      help_requested: true,
      priority: 'RED',
    })
    .eq('id', queueId);

  if (error) {
    console.error('Error requesting help:', error);
    return false;
  }

  return true;
}

// ============================================================================
// STATS FUNCTIONS
// ============================================================================

export async function getTodayStats(): Promise<{
  totalCheckIns: number;
  totalAttendances: number;
  avgWaitTime: number;
  avgAttendanceTime: number;
}> {
  const today = new Date().toISOString().split('T')[0];

  const { data: attendances, error } = await supabase
    .from('attendances')
    .select('wait_duration, attendance_duration')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  if (error) {
    console.error('Error fetching stats:', error);
    return { totalCheckIns: 0, totalAttendances: 0, avgWaitTime: 0, avgAttendanceTime: 0 };
  }

  const { count: checkIns } = await supabase
    .from('queue')
    .select('*', { count: 'exact', head: true })
    .gte('check_in_time', `${today}T00:00:00`)
    .lte('check_in_time', `${today}T23:59:59`);

  const totalAttendances = attendances?.length || 0;
  const avgWaitTime = totalAttendances > 0
    ? Math.round(attendances.reduce((sum, a) => sum + (a.wait_duration || 0), 0) / totalAttendances)
    : 0;
  const avgAttendanceTime = totalAttendances > 0
    ? Math.round(attendances.reduce((sum, a) => sum + (a.attendance_duration || 0), 0) / totalAttendances)
    : 0;

  return {
    totalCheckIns: checkIns || 0,
    totalAttendances,
    avgWaitTime,
    avgAttendanceTime,
  };
}

// ============================================================================
// REALTIME SUBSCRIPTION
// ============================================================================

export function subscribeToQueue(callback: (queue: QueueMember[]) => void) {
  const channel = supabase
    .channel('queue-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'queue',
      },
      async () => {
        const queue = await getQueue();
        callback(queue);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// COACH FUNCTIONS
// ============================================================================

export async function getCoach(email: string): Promise<Coach | null> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching coach:', error);
    return null;
  }

  return data;
}

export async function getAllCoaches(): Promise<Coach[]> {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching coaches:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// GAMIFICAÇÃO - TYPES
// ============================================================================

export type InterventionType = 'CORRECAO' | 'MOTIVACAO' | 'TECNICA' | 'CHECK' | 'AJUSTE';

export interface CoachLevel {
  id: string;
  coach_id: string;
  total_xp: number;
  current_level: number;
  title: string;
  total_interventions: number;
  best_streak: number;
}

export interface CoachDailyStats {
  id: string;
  coach_id: string;
  stat_date: string;
  xp_earned: number;
  interventions_count: number;
  best_streak: number;
  correcoes: number;
  motivacoes: number;
  tecnicas: number;
  checks: number;
  ajustes: number;
  daily_rank?: number;
  rank_badge?: string;
}

export interface DailyRanking {
  rank: number;
  coach_id: string;
  coach_name: string;
  coach_initials: string;
  xp_earned: number;
  interventions_count: number;
  best_streak: number;
  level: number;
  title: string;
}

// ============================================================================
// GAMIFICAÇÃO - FUNCTIONS
// ============================================================================

const XP_CONFIG: Record<InterventionType, number> = {
  CORRECAO: 15,
  MOTIVACAO: 10,
  TECNICA: 15,
  CHECK: 5,
  AJUSTE: 8,
};

const PRIORITY_BONUS: Record<Priority, number> = {
  RED: 5,
  ORANGE: 3,
  YELLOW: 2,
  BLUE: 1,
  GREEN: 0,
  BLACK: 0,
};

export async function recordIntervention(data: {
  coachId: string;
  queueId: string;
  memberName: string;
  memberPriority: Priority;
  interventionType: InterventionType;
  durationSeconds: number;
  streak: number;
  multiplier: number;
  alertType?: string | null; // TOO_SHORT, EXCEEDED, ou null
  isContinued?: boolean; // Se usou modo continuado
}): Promise<{
  interventionId: string;
  xpGained: number;
  newTotalXp: number;
  newLevel: number;
  newTitle: string;
  leveledUp: boolean;
} | null> {
  
  let baseXp = XP_CONFIG[data.interventionType] || 10;
  baseXp += PRIORITY_BONUS[data.memberPriority] || 0;
  
  // Ajustar XP baseado no alerta
  if (data.alertType === 'TOO_SHORT') {
    baseXp = 1; // XP mínimo para atendimento muito curto
  } else if (data.durationSeconds < 15) {
    baseXp += 3;
  }
  
  const xpGained = Math.floor(baseXp * data.multiplier);

  // Inserir intervenção (campos do novo schema)
  const { data: intervention, error: intError } = await supabase
    .from('interventions')
    .insert({
      queue_id: data.queueId,
      coach_id: data.coachId,
      intervention_type: data.interventionType,
      duration_seconds: data.durationSeconds,
      alert_type: data.alertType || null,
      is_continued: data.isContinued || false,
    })
    .select()
    .single();

  if (intError) {
    console.error('Error recording intervention:', intError);
    // Continuar mesmo com erro - não bloquear o fluxo
  }

  // Chamar RPC para adicionar XP (parâmetros do novo schema)
  const { data: xpResult, error: xpError } = await supabase
    .rpc('add_coach_xp', {
      p_coach_id: data.coachId,
      p_xp_gained: xpGained,
      p_xp_type: 'intervention',
      p_intervention_id: intervention?.id || null,
    });

  if (xpError) {
    console.error('Error adding XP:', xpError);
    return {
      interventionId: intervention?.id || '',
      xpGained,
      newTotalXp: xpGained,
      newLevel: 1,
      newTitle: 'Novato',
      leveledUp: false,
    };
  }

  const result = Array.isArray(xpResult) ? xpResult[0] : xpResult;

  return {
    interventionId: intervention?.id || '',
    xpGained,
    newTotalXp: result?.total_xp || xpGained,
    newLevel: result?.new_level || 1,
    newTitle: result?.new_title || 'Novato',
    leveledUp: result?.leveled_up || false,
  };
}

export async function getCoachLevel(coachId: string): Promise<CoachLevel | null> {
  const { data, error } = await supabase
    .from('coach_levels')
    .select('*')
    .eq('coach_id', coachId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const { data: newLevel, error: createError } = await supabase
        .from('coach_levels')
        .insert({
          coach_id: coachId,
          total_xp: 0,
          current_level: 1,
          title: 'Iniciante',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating coach level:', createError);
        return null;
      }
      return newLevel;
    }
    console.error('Error fetching coach level:', error);
    return null;
  }

  return data;
}

export async function getCoachDailyStats(coachId: string, date?: string): Promise<CoachDailyStats | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('coach_daily_stats')
    .select('*')
    .eq('coach_id', coachId)
    .eq('stat_date', targetDate)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching coach daily stats:', error);
  }

  return data || null;
}

export async function getDailyRanking(date?: string): Promise<DailyRanking[]> {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .rpc('get_daily_ranking', { p_date: targetDate });

  if (error) {
    console.error('Error fetching daily ranking:', error);
    return [];
  }

  return data || [];
}

export function subscribeToRanking(callback: (ranking: DailyRanking[]) => void) {
  const channel = supabase
    .channel('ranking-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'coach_daily_stats',
      },
      async () => {
        const ranking = await getDailyRanking();
        callback(ranking);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToCoachLevel(coachId: string, callback: (level: CoachLevel) => void) {
  const channel = supabase
    .channel(`coach-level-${coachId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'coach_levels',
        filter: `coach_id=eq.${coachId}`,
      },
      async () => {
        const level = await getCoachLevel(coachId);
        if (level) callback(level);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================================
// COORDINATION REQUESTS (SUPERVISÃO)
// ============================================================================

export interface CoordinationRequestInput {
  coachId: string;
  coachName: string;
  memberName: string;
  memberEvoId?: number;
  queueId?: string;
  requestType: string;
  observation?: string;
  memberSnapshot: Record<string, unknown>;
  urgency?: string;
}

export async function createCoordinationRequest(data: CoordinationRequestInput): Promise<string | null> {
  const { data: result, error } = await supabase.rpc('create_coordination_request', {
    p_coach_id: data.coachId,
    p_coach_name: data.coachName,
    p_member_name: data.memberName,
    p_member_evo_id: data.memberEvoId || null,
    p_queue_id: data.queueId || null,
    p_request_type: data.requestType,
    p_observation: data.observation || null,
    p_member_snapshot: data.memberSnapshot,
    p_urgency: data.urgency || 'NORMAL',
  });

  if (error) {
    console.error('Error creating coordination request:', error);
    return null;
  }

  // Se for VERIFY_FREQUENCY, também notificar consultoras
  if (data.requestType === 'VERIFY_FREQUENCY' && data.memberEvoId) {
    try {
      await supabase
        .from('manual_entries_pending')
        .insert({
          evo_member_id: data.memberEvoId,
          member_name: data.memberName,
          queue_id: data.queueId || null,
          reason: `📊 VERIFICAR FREQUÊNCIA: ${data.observation || 'Aluno com frequência abaixo do esperado'}`,
          created_by_coach_id: data.coachId,
          created_by_coach_name: data.coachName,
          processed: false,
          metadata: {
            type: 'VERIFY_FREQUENCY',
            urgency: data.urgency || 'NORMAL',
            snapshot: data.memberSnapshot,
            coordinationRequestId: result,
          },
        });
      console.log(`📊 Notificação de frequência enviada para consultoras: ${data.memberName}`);
    } catch (consultError) {
      console.warn('Aviso: Não foi possível notificar consultoras:', consultError);
      // Não falha a operação principal
    }
  }

  return result;
}

export async function getPendingRequestsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('coordination_requests')
    .select('*', { count: 'exact', head: true })
    .in('status', ['PENDING', 'VIEWED', 'IN_PROGRESS']);

  if (error) {
    console.error('Error getting pending requests count:', error);
    return 0;
  }

  return count || 0;
}

export async function getSupervisionStats(): Promise<{
  pending: number;
  critical: number;
  resolvedToday: number;
} | null> {
  const { data, error } = await supabase
    .from('supervision_stats')
    .select('pending_count, critical_count, resolved_today')
    .single();

  if (error) {
    console.error('Error getting supervision stats:', error);
    return null;
  }

  return {
    pending: data?.pending_count || 0,
    critical: data?.critical_count || 0,
    resolvedToday: data?.resolved_today || 0,
  };
}

/**
 * Atualizar a prioridade de um membro na fila
 * Usado quando professor identifica que aluno treina com Personal ou Consultoria Externa
 * O aluno vai para a área de Personal/Autônomo (BLUE) com tag identificadora
 */
export async function updateMemberPriority(
  queueId: string, 
  newPriority: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'BLACK',
  isPersonal: boolean = false
): Promise<boolean> {
  // Primeiro, buscar as tags atuais
  const { data: currentData, error: fetchError } = await supabase
    .from('queue')
    .select('tags')
    .eq('id', queueId)
    .single();

  if (fetchError) {
    console.error('Error fetching member tags:', fetchError);
    return false;
  }

  // Preparar novas tags
  const currentTags = currentData?.tags || [];
  let newTags = [...currentTags];
  
  // Adicionar tag apropriada
  if (isPersonal && !newTags.includes('PERSONAL')) {
    newTags.push('PERSONAL');
  } else if (!isPersonal && !newTags.includes('CONSULTORIA')) {
    newTags.push('CONSULTORIA');
  }

  // Atualizar prioridade e tags
  const { error } = await supabase
    .from('queue')
    .update({ 
      priority: newPriority,
      tags: newTags,
      is_personal: true // Marca como personal/consultoria para ir na área separada
    })
    .eq('id', queueId);

  if (error) {
    console.error('Error updating member priority:', error);
    return false;
  }

  return true;
}
// ============================================================================
// COACH SESSION
// ============================================================================

export interface CoachSession {
  id: string;
  name: string;
  initials: string;
  role?: string;
  is_supervisor?: boolean;
  evo_employee_id?: number;
}

export function getCoachSession(): CoachSession | null {
  if (typeof window === 'undefined') return null;
  
  const saved = localStorage.getItem('iron_coach_session');
  if (!saved) return null;
  
  try {
    return JSON.parse(saved) as CoachSession;
  } catch {
    return null;
  }
}

export function setCoachSession(coach: CoachSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('iron_coach_session', JSON.stringify(coach));
}

export function clearCoachSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('iron_coach_session');
}

// ============================================================================
// SKIP MEMBER - Pular Atendimento (FASE 1)
// ============================================================================

export interface SkipResult {
  success: boolean;
  skipCount?: number;
  newPosition?: number;
  notifiedSupervisor?: boolean;
  memberName?: string;
  error?: string;
}

/**
 * Pula um membro na fila de atendimento
 * 
 * Lógica de reposicionamento:
 * - 1º pulo: vai para 2ª posição da mesma cor
 * - 2º pulo: vai para última posição da mesma cor
 * - 3º pulo: vai para fim da fila + notifica supervisor
 * 
 * Vermelhos pulados SEMPRE notificam o supervisor
 */
export async function skipMember(
  queueId: string,
  coachId: string,
  coachName: string,
  reason?: string
): Promise<SkipResult> {
  try {
    const { data, error } = await supabase.rpc('skip_queue_member', {
      p_queue_id: queueId,
      p_coach_id: coachId,
      p_coach_name: coachName,
      p_reason: reason || null,
    });

    if (error) {
      console.error('Erro ao pular membro:', error);
      return { success: false, error: error.message };
    }

    return data as SkipResult;
  } catch (e) {
    console.error('Exceção ao pular membro:', e);
    return { success: false, error: String(e) };
  }
}

/**
 * Busca histórico de pulos de um membro
 */
export async function getSkipHistory(queueId: string): Promise<Array<{
  skipNumber: number;
  skippedAt: string;
  skippedBy: string;
  reason: string;
  newPosition: number;
}>> {
  const { data, error } = await supabase
    .from('queue')
    .select('skip_history')
    .eq('id', queueId)
    .single();

  if (error || !data?.skip_history) {
    return [];
  }

  return data.skip_history as Array<{
    skipNumber: number;
    skippedAt: string;
    skippedBy: string;
    reason: string;
    newPosition: number;
  }>;
}

// ============================================================================
// CHECKOUT E REATIVAÇÃO - Funções para gerenciar saída e retorno de alunos
// ============================================================================

/**
 * Buscar membros que fizeram checkout hoje (finalizados)
 * Retorna membros com check_out_time do dia atual para exibir na seção "Finalizados"
 */
export async function getFinishedMembers(): Promise<QueueMember[]> {
  // Início do dia atual
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('queue')
    .select('*')
    .not('check_out_time', 'is', null)
    .gte('check_out_time', today.toISOString())
    .order('check_out_time', { ascending: false });

  if (error) {
    console.error('Error fetching finished members:', error);
    return [];
  }

  return data || [];
}

/**
 * Reativar um membro que fez checkout
 * Remove o check_out_time e restaura o status para TRAINING
 */
export async function reactivateMember(queueId: string): Promise<boolean> {
  console.log('🔄 Reativando membro:', queueId);
  
  try {
    // Usar API para bypass RLS
    const response = await fetch('/api/reactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queueId }),
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.error('Erro ao reativar membro:', result.error);
      return false;
    }

    console.log('✅ Membro reativado');
    return true;
  } catch (e) {
    console.error('Exceção ao reativar membro:', e);
    return false;
  }
}

/**
 * Marcar membro como Personal/Consultoria (move para área separada)
 * Usado quando professor identifica aluno treinando com personal ou consultoria externa
 */
export async function markAsPersonal(
  queueId: string,
  isPersonalTrainer: boolean = true
): Promise<boolean> {
  console.log('🏴 Marcando como personal/consultoria:', queueId);
  
  try {
    // Buscar tags atuais
    const { data: currentData, error: fetchError } = await supabase
      .from('queue')
      .select('tags')
      .eq('id', queueId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar tags:', fetchError);
      return false;
    }

    const currentTags = currentData?.tags || [];
    const newTag = isPersonalTrainer ? 'PERSONAL' : 'CONSULTORIA';
    const newTags = currentTags.includes(newTag) ? currentTags : [...currentTags, newTag];

    // Atualizar para BLACK e marcar como personal
    const { error: updateError } = await supabase
      .from('queue')
      .update({
        priority: 'BLACK',
        is_personal: true,
        tags: newTags,
      })
      .eq('id', queueId);

    if (updateError) {
      console.error('Erro ao marcar como personal:', updateError);
      return false;
    }

    console.log('✅ Marcado como personal/consultoria');
    return true;
  } catch (e) {
    console.error('Exceção ao marcar como personal:', e);
    return false;
  }
}

/**
 * Remover status de Personal (volta para fila normal)
 * Restaura a prioridade calculada e remove tags de personal/consultoria
 */
export async function unmarkAsPersonal(queueId: string): Promise<boolean> {
  console.log('🔄 Removendo status de personal:', queueId);
  
  try {
    // Buscar dados atuais
    const { data: currentData, error: fetchError } = await supabase
      .from('queue')
      .select('tags, days_as_member')
      .eq('id', queueId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar dados:', fetchError);
      return false;
    }

    // Remover tags de personal/consultoria
    const currentTags = currentData?.tags || [];
    const newTags = currentTags.filter((tag: string) => 
      tag !== 'PERSONAL' && tag !== 'CONSULTORIA'
    );

    // Calcular prioridade baseada em dias como membro
    const daysAsMember = currentData?.days_as_member || 30;
    let newPriority: Priority = 'GREEN';
    if (daysAsMember <= 7) newPriority = 'RED';
    else if (daysAsMember <= 14) newPriority = 'ORANGE';
    else if (daysAsMember <= 30) newPriority = 'YELLOW';
    else newPriority = 'GREEN';

    const { error: updateError } = await supabase
      .from('queue')
      .update({
        priority: newPriority,
        is_personal: false,
        tags: newTags,
      })
      .eq('id', queueId);

    if (updateError) {
      console.error('Erro ao remover personal:', updateError);
      return false;
    }

    console.log('✅ Status de personal removido, nova prioridade:', newPriority);
    return true;
  } catch (e) {
    console.error('Exceção ao remover personal:', e);
    return false;
  }
}
