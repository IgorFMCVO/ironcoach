// ============================================================================
// CAMINHO: src/app/api/reports/productivity/route.ts
// ============================================================================
// IRON COACH - API de Relatórios de Produtividade
// GET - Retorna relatório de produtividade dos coaches
// Parâmetros: date (YYYY-MM-DD), startDate, endDate
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface CoachStats {
  coachId: string;
  coachName: string;
  // Atendimentos (intervenções = abriu card e finalizou)
  totalAttendances: number;
  averageAttendanceTime: number; // em segundos
  attendancesByType: Record<string, number>; // CHECK, ORIENTATION, etc
  // Pulos
  skippedAttendances: number;
  skipReasons: Record<string, number>;
  // Notificações
  notificationsSent: number;
  notificationsByType: Record<string, number>;
  // Ações
  manualEntries: number;
  membersMarkedAsPersonal: number;
  membersReactivated: number;
  workoutsInserted: number;
  evaluationsScheduled: number;
  helpRequestsResponded: number;
  // Checkouts
  checkoutsProcessed: number;
  checkoutsByReason: Record<string, number>;
}

interface HourlyEnvironment {
  hour: number;
  avgPeopleInGym: number;
  maxPeopleInGym: number;
  totalCheckins: number;
  totalCheckouts: number;
}

interface DailyReport {
  date: string;
  period: { start: string; end: string };
  summary: {
    totalCoaches: number;
    totalAttendances: number;
    totalSkips: number;
    totalNotifications: number;
    totalManualEntries: number;
    averageAttendanceTime: number;
    peakHour: number;
    peakPeople: number;
  };
  coaches: CoachStats[];
  hourlyAttendances: { hour: number; attendances: number; skips: number }[];
  hourlyEnvironment: HourlyEnvironment[];
  topPerformers: {
    mostAttendances: { name: string; count: number } | null;
    mostNotifications: { name: string; count: number } | null;
    fastestAvgTime: { name: string; seconds: number } | null;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Parâmetros de data
  const dateParam = searchParams.get('date'); // YYYY-MM-DD
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const timezone = searchParams.get('tz') || 'America/Sao_Paulo';
  
  // Função para obter data atual no fuso horário especificado
  const getDateInTimezone = (tz: string) => {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
  };
  
  // Função para criar data com horário específico no fuso de SP
  // Como o banco guarda em UTC, precisamos converter
  const createDateRange = (dateStr: string) => {
    // Criar data às 00:00 do dia em SP
    // SP é UTC-3, então 00:00 SP = 03:00 UTC
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Início do dia em SP (00:00 SP = 03:00 UTC do mesmo dia)
    const startUTC = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
    
    // Fim do dia em SP (23:59:59 SP = 02:59:59 UTC do dia seguinte)
    const endUTC = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
    
    return { startUTC, endUTC };
  };
  
  // Determinar período
  let startDate: Date;
  let endDate: Date;
  let reportDate: string;
  
  if (dateParam) {
    // Dia específico
    const { startUTC, endUTC } = createDateRange(dateParam);
    startDate = startUTC;
    endDate = endUTC;
    reportDate = dateParam;
  } else if (startDateParam && endDateParam) {
    // Período customizado
    const start = createDateRange(startDateParam);
    const end = createDateRange(endDateParam);
    startDate = start.startUTC;
    endDate = end.endUTC;
    reportDate = startDateParam;
  } else {
    // Default: hoje no fuso de SP
    const today = getDateInTimezone(timezone);
    const { startUTC, endUTC } = createDateRange(today);
    startDate = startUTC;
    endDate = endUTC;
    reportDate = today;
  }

  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  // Função para obter hora no fuso de SP a partir de uma data UTC
  const getHourInSP = (dateStr: string) => {
    const date = new Date(dateStr);
    return parseInt(date.toLocaleTimeString('en-US', { 
      timeZone: 'America/Sao_Paulo', 
      hour: 'numeric', 
      hour12: false 
    }));
  };

  try {
    // ========================================================================
    // 1. INTERVENÇÕES (atendimentos reais - professor abriu card e finalizou)
    // ========================================================================
    const { data: interventions } = await supabase
      .from('interventions')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    // ========================================================================
    // 2. ACTIVITY LOG (para pegar SKIPS e outras ações)
    // ========================================================================
    const { data: activityLog } = await supabase
      .from('coach_activity_log')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    // ========================================================================
    // 3. NOTIFICAÇÕES (coordination_requests)
    // ========================================================================
    const { data: notifications } = await supabase
      .from('coordination_requests')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    // ========================================================================
    // 4. ENTRADAS MANUAIS (manual_entries_pending)
    // ========================================================================
    const { data: manualEntries } = await supabase
      .from('manual_entries_pending')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso);

    // ========================================================================
    // 5. CHECKOUTS (queue com check_out_time no período)
    // ========================================================================
    const { data: checkouts } = await supabase
      .from('queue')
      .select('*')
      .not('check_out_time', 'is', null)
      .gte('check_out_time', startIso)
      .lte('check_out_time', endIso);

    // ========================================================================
    // 6. PERSONAL/AUTÔNOMO (marcações no período)
    // ========================================================================
    const { data: personalMarks } = await supabase
      .from('queue')
      .select('*')
      .eq('is_personal', true)
      .gte('updated_at', startIso)
      .lte('updated_at', endIso);

    // ========================================================================
    // 7. REATIVAÇÕES
    // ========================================================================
    const { data: reactivations } = await supabase
      .from('queue')
      .select('*')
      .not('reactivated_at', 'is', null)
      .gte('reactivated_at', startIso)
      .lte('reactivated_at', endIso);

    // ========================================================================
    // 8. DADOS PARA RELATÓRIO DE AMBIENTE (check_in e check_out do dia)
    // ========================================================================
    const { data: allQueueEntries } = await supabase
      .from('queue')
      .select('check_in_time, check_out_time')
      .gte('check_in_time', startIso)
      .lte('check_in_time', endIso);

    // ========================================================================
    // PROCESSAR DADOS POR COACH
    // ========================================================================
    const coachMap = new Map<string, CoachStats>();

    const getOrCreateCoach = (coachId: string, coachName: string): CoachStats => {
      if (!coachMap.has(coachId)) {
        coachMap.set(coachId, {
          coachId,
          coachName: coachName || 'Desconhecido',
          totalAttendances: 0,
          averageAttendanceTime: 0,
          attendancesByType: {},
          skippedAttendances: 0,
          skipReasons: {},
          notificationsSent: 0,
          notificationsByType: {},
          manualEntries: 0,
          membersMarkedAsPersonal: 0,
          membersReactivated: 0,
          workoutsInserted: 0,
          evaluationsScheduled: 0,
          helpRequestsResponded: 0,
          checkoutsProcessed: 0,
          checkoutsByReason: {},
        });
      }
      return coachMap.get(coachId)!;
    };

    // Processar INTERVENÇÕES (atendimentos reais)
    const attendanceTimes: Record<string, number[]> = {};
    const hourlyAttendancesMap = new Map<number, { attendances: number; skips: number }>();
    for (let h = 0; h < 24; h++) hourlyAttendancesMap.set(h, { attendances: 0, skips: 0 });

    (interventions || []).forEach(i => {
      if (i.coach_id) {
        const coach = getOrCreateCoach(i.coach_id, i.coach_name || 'Coach');
        coach.totalAttendances++;
        
        // Tipo de intervenção
        const type = i.intervention_type || 'CHECK';
        coach.attendancesByType[type] = (coach.attendancesByType[type] || 0) + 1;
        
        // Tempo de atendimento
        const duration = i.duration_seconds || 0;
        if (duration > 0) {
          if (!attendanceTimes[i.coach_id]) attendanceTimes[i.coach_id] = [];
          attendanceTimes[i.coach_id].push(duration);
        }

        // Distribuição por hora
        if (i.created_at) {
          const hour = getHourInSP(i.created_at);
          const hourData = hourlyAttendancesMap.get(hour)!;
          hourData.attendances++;
        }
      }
    });

    // Calcular média de tempo por coach
    Object.entries(attendanceTimes).forEach(([coachId, times]) => {
      const coach = coachMap.get(coachId);
      if (coach && times.length > 0) {
        coach.averageAttendanceTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }
    });

    // Processar PULOS (do activity log)
    (activityLog || []).forEach(log => {
      if (log.event_type === 'SKIP' && log.coach_id) {
        const coach = getOrCreateCoach(log.coach_id, log.coach_name);
        coach.skippedAttendances++;
        
        // Motivo do pulo
        const reason = log.metadata?.reason || 'Não informado';
        coach.skipReasons[reason] = (coach.skipReasons[reason] || 0) + 1;

        // Distribuição por hora
        if (log.created_at) {
          const hour = getHourInSP(log.created_at);
          const hourData = hourlyAttendancesMap.get(hour)!;
          hourData.skips++;
        }
      }
      
      if (log.event_type === 'HELP_REQUEST_RESPONSE' && log.coach_id) {
        const coach = getOrCreateCoach(log.coach_id, log.coach_name);
        coach.helpRequestsResponded++;
      }
      
      if (log.event_type === 'MANUAL_ENTRY' && log.coach_id) {
        const coach = getOrCreateCoach(log.coach_id, log.coach_name);
        coach.manualEntries++;
      }
    });

    // Processar notificações
    (notifications || []).forEach(n => {
      const coach = getOrCreateCoach(n.coach_id, n.coach_name);
      coach.notificationsSent++;
      coach.notificationsByType[n.request_type] = (coach.notificationsByType[n.request_type] || 0) + 1;
      
      // Contar tipos específicos
      if (n.request_type === 'INSERT_STANDARD_WORKOUT' || n.request_type === 'INSERT_CUSTOM_WORKOUT') {
        coach.workoutsInserted++;
      }
      if (n.request_type === 'SCHEDULE_EVALUATION') {
        coach.evaluationsScheduled++;
      }
    });

    // Processar entradas manuais (se não vieram do activity log)
    (manualEntries || []).forEach(e => {
      if (e.created_by_coach_id) {
        const coach = getOrCreateCoach(e.created_by_coach_id, e.created_by_coach_name || 'Coach');
        // Só incrementa se não foi contabilizado no activity log
        const alreadyCounted = activityLog?.some(
          l => l.coach_id === e.created_by_coach_id && l.event_type === 'MANUAL_ENTRY'
        );
        if (!alreadyCounted) {
          coach.manualEntries++;
        }
      }
    });

    // Processar checkouts
    (checkouts || []).forEach(c => {
      if (c.exit_by_coach_id) {
        const coach = getOrCreateCoach(c.exit_by_coach_id, c.exit_by_coach_name || 'Coach');
        coach.checkoutsProcessed++;
        const reason = c.exit_reason || 'other';
        coach.checkoutsByReason[reason] = (coach.checkoutsByReason[reason] || 0) + 1;
      }
    });

    // Processar marcações como personal
    (personalMarks || []).forEach(p => {
      const coachId = p.marked_personal_by_coach_id || p.exit_by_coach_id;
      const coachName = p.marked_personal_by_coach_name || p.exit_by_coach_name;
      if (coachId) {
        const coach = getOrCreateCoach(coachId, coachName || 'Coach');
        coach.membersMarkedAsPersonal++;
      }
    });

    // Processar reativações
    (reactivations || []).forEach(r => {
      if (r.reactivated_by_coach_id) {
        const coach = getOrCreateCoach(r.reactivated_by_coach_id, r.reactivated_by_coach_name || 'Coach');
        coach.membersReactivated++;
      }
    });

    // ========================================================================
    // CALCULAR RELATÓRIO DE AMBIENTE (pessoas na academia por hora)
    // Nota: As horas são no fuso de São Paulo (UTC-3)
    // ========================================================================
    const hourlyEnvironment: HourlyEnvironment[] = [];
    
    // Extrair data base do relatório (YYYY-MM-DD)
    const [baseYear, baseMonth, baseDay] = reportDate.split('-').map(Number);
    
    for (let hourSP = 0; hourSP < 24; hourSP++) {
      // Converter hora de SP para UTC
      // SP é UTC-3, então hora X em SP = hora X+3 em UTC
      // Ex: 10h SP = 13h UTC, 22h SP = 01h UTC do dia seguinte
      let hourUTC = hourSP + 3;
      let dayOffset = 0;
      if (hourUTC >= 24) {
        hourUTC -= 24;
        dayOffset = 1;
      }
      
      // Criar timestamps UTC para início e fim da hora em SP
      const hourStartUTC = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay + dayOffset, hourUTC, 0, 0, 0));
      const hourEndUTC = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay + dayOffset, hourUTC, 59, 59, 999));

      // Contar check-ins e check-outs na hora
      let checkinsInHour = 0;
      let checkoutsInHour = 0;
      
      // Calcular quantas pessoas estavam presentes em cada amostragem (cada 10 min)
      const sampleCounts: number[] = [];
      
      for (let minute = 0; minute < 60; minute += 10) {
        const checkTimeUTC = new Date(hourStartUTC.getTime() + minute * 60 * 1000);
        
        let peopleAtMinute = 0;
        (allQueueEntries || []).forEach(entry => {
          const checkin = new Date(entry.check_in_time);
          const checkout = entry.check_out_time ? new Date(entry.check_out_time) : new Date();
          
          // Pessoa estava presente se: check_in <= checkTime <= check_out
          if (checkin <= checkTimeUTC && checkTimeUTC <= checkout) {
            peopleAtMinute++;
          }
        });
        sampleCounts.push(peopleAtMinute);
      }

      // Check-ins nesta hora
      (allQueueEntries || []).forEach(entry => {
        const checkinHour = getHourInSP(entry.check_in_time);
        if (checkinHour === hourSP) {
          checkinsInHour++;
        }
        if (entry.check_out_time) {
          const checkoutHour = getHourInSP(entry.check_out_time);
          if (checkoutHour === hourSP) {
            checkoutsInHour++;
          }
        }
      });

      hourlyEnvironment.push({
        hour: hourSP,
        avgPeopleInGym: sampleCounts.length > 0 
          ? Math.round(sampleCounts.reduce((a, b) => a + b, 0) / sampleCounts.length)
          : 0,
        maxPeopleInGym: sampleCounts.length > 0 ? Math.max(...sampleCounts) : 0,
        totalCheckins: checkinsInHour,
        totalCheckouts: checkoutsInHour,
      });
    }

    // Encontrar horário de pico
    const peakHour = hourlyEnvironment.reduce((max, h) => 
      h.maxPeopleInGym > max.maxPeopleInGym ? h : max
    , hourlyEnvironment[0]);

    // ========================================================================
    // MONTAR RELATÓRIO FINAL
    // ========================================================================
    const coaches = Array.from(coachMap.values()).sort((a, b) => b.totalAttendances - a.totalAttendances);
    
    const totalAttendances = coaches.reduce((sum, c) => sum + c.totalAttendances, 0);
    const totalSkips = coaches.reduce((sum, c) => sum + c.skippedAttendances, 0);
    const totalNotifications = coaches.reduce((sum, c) => sum + c.notificationsSent, 0);
    const totalManualEntries = coaches.reduce((sum, c) => sum + c.manualEntries, 0);
    
    const allTimes = Object.values(attendanceTimes).flat();
    const averageAttendanceTime = allTimes.length > 0 
      ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
      : 0;

    // Top performers
    const sortedByAttendances = [...coaches].sort((a, b) => b.totalAttendances - a.totalAttendances);
    const sortedByNotifications = [...coaches].sort((a, b) => b.notificationsSent - a.notificationsSent);
    const sortedByTime = [...coaches].filter(c => c.averageAttendanceTime > 0).sort((a, b) => a.averageAttendanceTime - b.averageAttendanceTime);

    const hourlyAttendances = Array.from(hourlyAttendancesMap.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour - b.hour);

    const report: DailyReport = {
      date: reportDate,
      period: {
        start: startIso,
        end: endIso,
      },
      summary: {
        totalCoaches: coaches.length,
        totalAttendances,
        totalSkips,
        totalNotifications,
        totalManualEntries,
        averageAttendanceTime,
        peakHour: peakHour?.hour || 0,
        peakPeople: peakHour?.maxPeopleInGym || 0,
      },
      coaches,
      hourlyAttendances,
      hourlyEnvironment,
      topPerformers: {
        mostAttendances: sortedByAttendances[0] 
          ? { name: sortedByAttendances[0].coachName, count: sortedByAttendances[0].totalAttendances }
          : null,
        mostNotifications: sortedByNotifications[0]
          ? { name: sortedByNotifications[0].coachName, count: sortedByNotifications[0].notificationsSent }
          : null,
        fastestAvgTime: sortedByTime[0]
          ? { name: sortedByTime[0].coachName, seconds: sortedByTime[0].averageAttendanceTime }
          : null,
      },
    };

    return NextResponse.json({
      success: true,
      report,
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}
