// ============================================================================
// CAMINHO: src/app/page.tsx
// ============================================================================

// src/app/page.tsx
// ============================================================================
// IRON COACH DASHBOARD - v15
// - Fila única com BLUE separado
// - Card expandido durante atendimento
// - Detecção de desistência
// - Sugestões de intervenção
// - Timer rígido por prioridade
// - Som com opção mudo
// - Entrada manual de alunos
// - Activity Timeline
// ============================================================================

'use client';

import { useEffect, useState, useRef, useCallback, forwardRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Login from './components/Login';
import ManualEntryModal from './components/ManualEntryModal';
import ActivityTimeline from './components/ActivityTimeline';
import { 
  AdminIcon, 
  SupervisorIcon, 
  AddUserIcon, 
  GuideIcon,
  TrophyIcon,
  TimerIcon,
  DumbbellIcon,
} from './components/Icons';
import { useAudio, useVibration } from '@/lib/useAudio';
import { useEvoSync } from '@/hooks/useEvoSync';
import { useActivityLog } from '@/hooks/useActivityLog';
import { logError } from '@/lib/errorLogger';
import {
  getQueue,
  addToQueue,
  startAttendance,
  endAttendance,
  removeFromQueue,
  subscribeToQueue,
  recordIntervention,
  createCoordinationRequest,
  getPendingRequestsCount,
  updateMemberPriority,
  skipMember,
  getFinishedMembers,
  reactivateMember,
  markAsPersonal,
  unmarkAsPersonal,
  type QueueMember as DBQueueMember,
  type Priority,
  type InterventionType as DBInterventionType,
} from '@/lib/supabase';
import {
  PRIORITY_CONFIG,
  PRIORITY_ORDER,
  ALERT_TAGS,
  CHECKOUT_REASONS,
  COORDINATION_REQUEST_TYPES,
  URGENCY_LEVELS,
  calculateUrgency,
  getSuggestion,
  getPhaseLabel,
  type Suggestion,
} from '@/lib/constants';

// ============================================================================
// TIPOS
// ============================================================================

interface Coach {
  id: string;
  name: string;
  initials: string;
  role?: 'ADMIN' | 'SUPERVISOR' | 'PROFESSOR';
  is_supervisor?: boolean;
  evo_employee_id?: number;
}

interface QueueMember {
  id: string;
  name: string;
  evoMemberId: number | null; // ID do membro no EVO
  status: 'WAITING' | 'TRAINING' | 'BEING_ATTENDED' | 'IDLE';
  priority: Priority;
  checkInTime: string;
  lastAttendedAt: string | null;
  daysAsMember: number;
  tags: string[];
  helpRequested: boolean;
  isPersonal: boolean;
  churnLevel: 'NORMAL' | 'ATENCAO' | 'CRITICO' | 'URGENTE';
  freqEsperada: number;
  freqAtual: number; // Esta semana (Dom-Sáb atual)
  freq15_21: number; // 2 semanas atrás (Dom-Sáb)
  freq08_14: number; // Semana passada (Dom-Sáb)
  workoutId: number | null; // ID do treino prescrito no EVO
  workoutName: string | null;
  workoutLetter: string | null;
  workoutValidUntil: string | null;
  sessionsDone: number;
  sessionsTotal: number;
  // Novos campos v13
  retentionScore: number;
  hasFicha: boolean;
  hasAvaliacao: boolean;
  fichaVencida: boolean;
  avaliacaoVencida: boolean;
  // FASE 1: Pular Atendimento
  skipCount: number;
  // Foto do membro
  photoUrl: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

const calcTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  let mins = Math.floor((now.getTime() - date.getTime()) / 60000);
  mins = Math.max(0, mins);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hours}h${remainMins}m` : `${hours}h`;
};

const calcTimeMinutes = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
};

const calcTimeInGym = (checkInTime: string) => calcTime(checkInTime);
const calcWaitTime = (checkInTime: string, lastAttendedAt: string | null) => calcTime(lastAttendedAt || checkInTime);

/**
 * Calcula o score de retenção baseado em:
 * - 50% máximo: Frequência (freq real / freq esperada * 50)
 * - 25% máximo: Ficha de treino (25% OK, 12.5% vencida, 0% sem ficha)
 * - 25% máximo: Avaliação física (25% OK, 12.5% vencida, 0% sem avaliação)
 * 
 * SEM DADOS = 0% (não dá pontos de graça!)
 */
function calculateRetentionScore(
  freqReal: number, 
  freqEsperada: number, 
  hasFicha: boolean, 
  fichaVencida: boolean, 
  hasAvaliacao: boolean, 
  avaliacaoVencida: boolean
): number {
  // 1. FREQUÊNCIA (máx 50%)
  // Se não tem frequência esperada definida, assume 5x por semana
  const freqEsperadaReal = freqEsperada > 0 ? freqEsperada : 5;
  
  // Se freq real é 0, score é 0 (não está vindo treinar!)
  let freqScore = 0;
  if (freqReal > 0) {
    // freq real / freq esperada * 50, max 50
    freqScore = Math.min(50, (freqReal / freqEsperadaReal) * 50);
  }
  
  // 2. FICHA DE TREINO (máx 25%)
  let fichaScore = 0;
  if (hasFicha && !fichaVencida) {
    fichaScore = 25; // Ficha OK
  } else if (hasFicha && fichaVencida) {
    fichaScore = 12.5; // Ficha vencida (metade)
  } // else 0 - sem ficha
  
  // 3. AVALIAÇÃO FÍSICA (máx 25%)
  let avaliacaoScore = 0;
  if (hasAvaliacao && !avaliacaoVencida) {
    avaliacaoScore = 25; // Avaliação OK
  } else if (hasAvaliacao && avaliacaoVencida) {
    avaliacaoScore = 12.5; // Avaliação vencida (metade)
  } // else 0 - sem avaliação
  
  // Total
  const total = Math.round(freqScore + fichaScore + avaliacaoScore);
  return Math.max(0, Math.min(100, total));
}

function dbToLocal(db: DBQueueMember): QueueMember {
  let tagsArray: string[] = [];
  if (Array.isArray(db.tags)) tagsArray = db.tags;
  else if (typeof db.tags === 'string') {
    try { tagsArray = JSON.parse(db.tags); } catch { tagsArray = []; }
  }
  const validPriorities: Priority[] = ['RED', 'ORANGE', 'YELLOW', 'BLUE', 'GREEN', 'BLACK'];
  const priority = validPriorities.includes(db.priority as Priority) ? db.priority : 'YELLOW';
  
  // Dados para cálculo de retenção
  const freqEsperada = (db as any).freq_esperada || 3;
  const freqAtual = (db as any).freq_atual || 0; // Frequência da semana atual (0-7 dias)
  const freq08_14 = (db as any).freq_08_14 || 0; // Frequência da semana passada (8-14 dias)
  const freq15_21 = (db as any).freq_15_21 || 0; // Frequência de 2 semanas atrás (15-21 dias)
  
  const hasFicha = (db as any).has_ficha ?? false;
  const fichaVencida = (db as any).ficha_vencida || false;
  const hasAvaliacao = (db as any).has_avaliacao ?? false;
  const avaliacaoVencida = (db as any).avaliacao_vencida || false;
  
  // CORREÇÃO: Usar retention_score do BANCO quando disponível
  // Só recalcular se não existir no banco
  const dbRetentionScore = (db as any).retention_score;
  let retentionScore: number;
  
  if (typeof dbRetentionScore === 'number' && dbRetentionScore >= 0) {
    // Usar valor já calculado pelo backend
    retentionScore = dbRetentionScore;
  } else {
    // Fallback: calcular localmente se não veio do banco
    const freqReal = freqAtual > 0 ? freqAtual : freq08_14;
    retentionScore = calculateRetentionScore(
      freqReal, 
      freqEsperada, 
      hasFicha, 
      fichaVencida, 
      hasAvaliacao, 
      avaliacaoVencida
    );
  }
  
  return {
    id: db.id,
    name: db.member_name,
    evoMemberId: (db as any).evo_member_id || null, // ID do membro no EVO
    status: db.status,
    priority: priority as Priority,
    checkInTime: db.check_in_time,
    lastAttendedAt: (db as any).last_attended_at || null,
    daysAsMember: db.days_as_member || 0,
    tags: tagsArray,
    helpRequested: db.help_requested || false,
    isPersonal: (db as any).is_personal || false,
    churnLevel: (db as any).churn_level || 'NORMAL',
    freqEsperada,
    freqAtual, // Semana atual
    freq15_21, // 2 semanas atrás
    freq08_14, // Semana passada
    workoutName: (db as any).workout_name || null,
    workoutLetter: (db as any).workout_letter || null,
    workoutId: (db as any).workout_id || null,
    workoutValidUntil: (db as any).workout_valid_until || null,
    sessionsDone: (db as any).sessions_done || 0,
    sessionsTotal: (db as any).sessions_total || 0,
    // Campos de retenção
    retentionScore,
    hasFicha,
    hasAvaliacao,
    fichaVencida,
    avaliacaoVencida,
    // FASE 1: Pular Atendimento
    skipCount: (db as any).skip_count || 0,
    // Foto do membro
    photoUrl: (db as any).member_photo_url || null,
  };
}

// Ordenar: FILA INDIANA por TEMPO RESTANTE para próximo atendimento
// Cada cor tem seu intervalo (vermelho=2min, laranja=3min, etc)
// Posição = baseada em quanto tempo FALTA para o próximo atendimento obrigatório
function sortQueue(members: QueueMember[]): QueueMember[] {
  return [...members].sort((a, b) => {
    // 1. Quem pediu ajuda tem prioridade absoluta
    if (a.helpRequested !== b.helpRequested) return a.helpRequested ? -1 : 1;
    
    // 2. Calcular tempo RESTANTE para próximo atendimento
    const now = Date.now();
    
    // Tempo desde último atendimento (ou check-in)
    const aLastAttended = new Date(a.lastAttendedAt || a.checkInTime).getTime();
    const bLastAttended = new Date(b.lastAttendedAt || b.checkInTime).getTime();
    
    const aWaitingMinutes = (now - aLastAttended) / 60000;
    const bWaitingMinutes = (now - bLastAttended) / 60000;
    
    // Intervalo de atendimento baseado na cor (em minutos)
    // BLUE e BLACK não tem intervalo obrigatório, então usam 999 (sempre no final)
    const aInterval = PRIORITY_CONFIG[a.priority]?.alertInterval || 999;
    const bInterval = PRIORITY_CONFIG[b.priority]?.alertInterval || 999;
    
    // Tempo restante = intervalo - tempo esperando (pode ser negativo = atrasado!)
    const aTimeRemaining = aInterval - aWaitingMinutes;
    const bTimeRemaining = bInterval - bWaitingMinutes;
    
    // Quem tem MENOS tempo restante (ou mais atrasado) fica na frente
    return aTimeRemaining - bTimeRemaining;
  });
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export default function Dashboard() {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [queue, setQueue] = useState<QueueMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [checkoutModal, setCheckoutModal] = useState<QueueMember | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isMutedRef = useRef(isMuted);
  
  // Estado do atendimento expandido
  const [activeAttendance, setActiveAttendance] = useState<{
    member: QueueMember;
    startTime: number;
    suggestion: Suggestion;
  } | null>(null);
  const [attendanceTimer, setAttendanceTimer] = useState(0);
  const [isContinued, setIsContinued] = useState(false); // Quando true, mostra tempo EXTRA (positivo)
  const [continuedStartTime, setContinuedStartTime] = useState<number | null>(null); // Quando começou o tempo extra
  
  // Alunos finalizados (podem ser retornados à fila)
  // Agora usa dados do banco, não mais estado local apenas
  const [finishedMembers, setFinishedMembers] = useState<(QueueMember & { 
    finishedAt: Date; 
    reason: string;
    checkOutTime?: string;
    exitType?: string;
  })[]>([]);
  
  const [stats, setStats] = useState({ total: 0, avgTime: 0, xp: 0 });
  
  // Estatísticas do dia por cor
  const [dailyStats, setDailyStats] = useState<Record<string, { count: number; totalRetention: number }>>({});
  
  // Supervisão - Pendências e Notificações
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showNotifyModal, setShowNotifyModal] = useState<QueueMember | null>(null);
  const [viewDetailsMember, setViewDetailsMember] = useState<QueueMember | null>(null);
  
  // FASE 1: Pular Atendimento
  const [skipModal, setSkipModal] = useState<QueueMember | null>(null);
  const [isSkipping, setIsSkipping] = useState(false);
  
  const { playSound, playAlert } = useAudio();
  const { vibrateSuccess } = useVibration();
  
  // Activity Log
  const { 
    logEvent, 
    logAttendanceStart, 
    logAttendanceEnd,
    logNotificationSent,
    logManualEntry,
    logCheckout,
  } = useActivityLog({ 
    coachId: coach?.id || null, 
    coachName: coach?.name || null,
    enabled: !!coach,
  });

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  
  // Carregar contagem de pendências (apenas para supervisores)
  useEffect(() => {
    if (!coach?.is_supervisor) return;
    
    const loadPendingCount = async () => {
      const count = await getPendingRequestsCount();
      setPendingRequestsCount(count);
    };
    
    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000); // A cada 30 segundos
    return () => clearInterval(interval);
  }, [coach?.is_supervisor]);

  const { recentEntries, lastSyncTime, isLoading: isSyncing, triggerSync } = useEvoSync({
    enabled: !!coach,
    intervalMs: 5000,
    onNewEntry: (names) => {
      if (names.length > 0 && !isMutedRef.current) playSound('success');
      loadQueue();
    },
    onCheckout: () => { loadQueue(); },
  });

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('iron_coach_muted', String(newMuted));
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iron_coach_session');
      if (saved) {
        try { setCoach(JSON.parse(saved)); } catch { localStorage.removeItem('iron_coach_session'); }
      }
      const mutePref = localStorage.getItem('iron_coach_muted');
      if (mutePref === 'true') setIsMuted(true);
      const savedStats = localStorage.getItem('iron_coach_stats_today');
      if (savedStats) {
        try {
          const parsed = JSON.parse(savedStats);
          if (parsed.date === new Date().toDateString()) {
            setStats({ total: parsed.total, avgTime: parsed.avgTime, xp: parsed.xp || 0 });
          }
        } catch {}
      }
      setIsCheckingSession(false);
    }
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const data = await getQueue();
      setQueue(sortQueue(data.map(dbToLocal)));
      
      // Carregar também os finalizados do dia
      const finished = await getFinishedMembers();
      setFinishedMembers(finished.map(m => {
        // Cast para any para acessar campos do banco que não estão no tipo
        const raw = m as any;
        return {
          ...dbToLocal(m),
          finishedAt: new Date(raw.check_out_time || new Date()),
          reason: raw.exit_reason || 'finished',
          checkOutTime: raw.check_out_time,
          exitType: raw.exit_type,
        };
      }));
    } catch (e) {
      console.error('Erro ao carregar fila:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    
    // Realtime subscription
    const unsub = subscribeToQueue((data) => {
      console.log('[Realtime] Atualização recebida, atualizando fila...');
      setQueue(sortQueue(data.map(dbToLocal)));
    });
    
    // FALLBACK: Polling a cada 10 segundos para garantir sincronização entre dispositivos
    const pollInterval = setInterval(() => {
      console.log('[Polling] Atualizando fila...');
      loadQueue();
    }, 10000); // 10 segundos
    
    return () => {
      unsub();
      clearInterval(pollInterval);
    };
  }, [loadQueue]);

  // Atualizar relógio
  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  // Timer de atendimento - REGRESSIVO → AUTO-FINALIZAÇÃO (ou EXTRA se continuou)
  const autoFinishRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (!activeAttendance) {
      autoFinishRef.current = false;
      return;
    }
    
    const maxTime = PRIORITY_CONFIG[activeAttendance.member.priority]?.attendanceTime || 15;
    
    const i = setInterval(() => {
      if (isContinued && continuedStartTime) {
        // Modo CONTINUADO: mostra tempo EXTRA (positivo, desde que clicou continuar)
        const extraElapsed = Math.floor((Date.now() - continuedStartTime) / 1000);
        setAttendanceTimer(extraElapsed); // Tempo extra positivo
      } else {
        // Modo NORMAL: regressivo até zero
        const elapsed = Math.floor((Date.now() - activeAttendance.startTime) / 1000);
        const remaining = maxTime - elapsed;
        setAttendanceTimer(remaining); // Positivo (restante) até chegar a zero
        
        // AUTO-FINALIZAÇÃO: quando chega a ZERO (ou passa)
        if (remaining <= 0 && !isContinued && !autoFinishRef.current) {
          console.log(`[AUTO-FIN] Tempo zerou! Finalizando automaticamente.`);
          autoFinishRef.current = true; // Marca para não chamar múltiplas vezes
        }
      }
    }, 100);
    
    return () => clearInterval(i);
  }, [activeAttendance, isContinued, continuedStartTime]);
  
  // Efeito separado para executar auto-finalização
  useEffect(() => {
    if (autoFinishRef.current && activeAttendance && !isContinued) {
      finishAttendance();
    }
  });

  // Sistema de alertas por tempo
  useEffect(() => {
    if (isMuted || !coach) return;
    
    const checkAlerts = () => {
      // Só alertar para fila regular (não Personal)
      const regularQueue = queue.filter(m => {
        const hasPersonalTag = m.tags?.includes('PERSONAL') || m.tags?.includes('CONSULTORIA');
        return !m.isPersonal && !hasPersonalTag;
      });
      
      for (const member of regularQueue) {
        if (activeAttendance?.member.id === member.id) continue;
        
        const waitMinutes = calcTimeMinutes(member.lastAttendedAt || member.checkInTime);
        const config = PRIORITY_CONFIG[member.priority];
        
        if (config.alertInterval > 0 && waitMinutes > 0 && waitMinutes % config.alertInterval === 0) {
          playAlert();
          break; // Só um alerta por ciclo
        }
      }
    };
    
    const i = setInterval(checkAlerts, 60000); // Check a cada minuto
    return () => clearInterval(i);
  }, [queue, isMuted, coach, activeAttendance, playAlert]);

  const handleLogin = (c: Coach) => {
    setCoach(c);
    localStorage.setItem('iron_coach_session', JSON.stringify(c));
  };

  const handleLogout = () => {
    setCoach(null);
    localStorage.removeItem('iron_coach_session');
  };

  const handleSelectFromSidebar = (entryName: string) => {
    const member = queue.find(m => m.name === entryName);
    if (member) {
      setSelectedMemberId(member.id);
      // Scroll para o card e centralizar
      const el = cardRefs.current.get(member.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Abrir modal do membro após pequeno delay para permitir scroll
      setTimeout(() => {
        setViewDetailsMember(member);
      }, 300);
      // Limpar seleção visual após 5 segundos
      setTimeout(() => setSelectedMemberId(null), 5000);
    }
  };

  const startAttendanceFlow = async (member: QueueMember) => {
    if (activeAttendance) await finishAttendance();
    
    const isChurnRisk = member.churnLevel !== 'NORMAL';
    const suggestion = getSuggestion(member.daysAsMember, isChurnRisk);
    const maxTime = PRIORITY_CONFIG[member.priority]?.attendanceTime || 15;
    
    setActiveAttendance({ member, startTime: Date.now(), suggestion });
    setAttendanceTimer(maxTime);
    setIsContinued(false);
    setContinuedStartTime(null);
    await startAttendance(member.id, coach?.id);
    
    // Log de início de atendimento
    logAttendanceStart(
      member.name,
      undefined, // memberEvoId não está disponível diretamente
      member.id
    );
  };

  // Ativar modo "Atendimento Continuado" - timer passa a mostrar tempo EXTRA
  const enableContinuedAttendance = () => {
    if (!activeAttendance) return;
    setIsContinued(true);
    setContinuedStartTime(Date.now()); // Marca quando começou o tempo extra
  };

  const finishAttendance = async () => {
    if (!activeAttendance || !coach) return;
    
    const elapsed = Math.floor((Date.now() - activeAttendance.startTime) / 1000);
    const maxTime = PRIORITY_CONFIG[activeAttendance.member.priority]?.attendanceTime || 15;
    
    // Determinar alertas
    let alertType: string | null = null;
    if (elapsed < 5) {
      alertType = 'TOO_SHORT'; // Menos de 5 segundos
    } else if (elapsed > maxTime * 3) {
      alertType = 'EXCEEDED'; // Mais de 3x o tempo base
    }
    
    const xpResult = await recordIntervention({
      coachId: coach.id,
      coachName: coach.name,  // Adicionado para salvar nome nos relatórios
      queueId: activeAttendance.member.id,
      memberName: activeAttendance.member.name,
      memberPriority: activeAttendance.member.priority,
      interventionType: 'CHECK' as DBInterventionType,
      durationSeconds: elapsed,
      streak: 1,
      multiplier: 1,
      alertType,
      isContinued, // Registra se usou modo continuado
    });
    
    await endAttendance(activeAttendance.member.id, 'completed', coach.name);
    
    if (!isMuted) {
      playSound('success');
      vibrateSuccess();
    }
    
    const xpGained = xpResult?.xpGained || 10;
    setStats(prev => {
      const newStats = {
        total: prev.total + 1,
        avgTime: ((prev.avgTime * prev.total) + elapsed) / (prev.total + 1),
        xp: prev.xp + xpGained,
      };
      localStorage.setItem('iron_coach_stats_today', JSON.stringify({ ...newStats, date: new Date().toDateString() }));
      return newStats;
    });
    
    // Log de fim de atendimento
    logAttendanceEnd(
      activeAttendance.member.name,
      undefined, // memberEvoId
      activeAttendance.member.id,
      Math.floor(elapsed / 60) // converter segundos para minutos
    );
    
    setActiveAttendance(null);
    setIsContinued(false);
    setContinuedStartTime(null);
    loadQueue();
  };

  const cancelAttendance = () => {
    setActiveAttendance(null);
    setIsContinued(false);
    setContinuedStartTime(null);
  };

  // Checkout: move aluno para "Finalizados" ao invés de remover completamente
  const handleCheckout = async (member: QueueMember, reason: string) => {
    console.log('🔄 handleCheckout INICIADO:', { memberName: member.name, memberId: member.id, reason });
    
    if (!member || !member.id) {
      console.error('❌ handleCheckout: member ou member.id inválido', member);
      return;
    }
    
    try {
      console.log('📡 Chamando removeFromQueue com ID:', member.id);
      const success = await removeFromQueue(member.id, reason, coach?.id, coach?.name);
      console.log('📡 removeFromQueue retornou:', success);
      
      if (success) {
        console.log('✅ Checkout bem-sucedido, atualizando estados...');
        // Fechar modal e recarregar fila (finalizados agora vêm do banco via loadQueue)
        setCheckoutModal(null);
        // Se estava em atendimento ativo, finalizar
        if (activeAttendance?.member.id === member.id) {
          setActiveAttendance(null);
          setIsContinued(false);
          setContinuedStartTime(null);
        }
        await loadQueue();
        if (!isMuted) playSound('success');
        console.log('✅ handleCheckout COMPLETO');
        
        // Log na timeline
        logCheckout(member.name, reason);
      } else {
        console.error('❌ removeFromQueue retornou false');
        // Mostrar erro para o usuário
        alert('Erro ao fazer checkout. Tente novamente.');
        setCheckoutModal(null);
        // Log do erro
        await logError({
          source: 'frontend',
          action: 'checkout',
          error: 'removeFromQueue retornou false',
          memberName: member.name,
          coachId: coach?.id,
          coachName: coach?.name,
        });
      }
    } catch (error) {
      console.error('❌ Erro no handleCheckout:', error);
      alert('Erro ao fazer checkout. Tente novamente.');
      setCheckoutModal(null);
      // Log do erro
      await logError({
        source: 'frontend',
        action: 'checkout',
        error: error,
        memberName: member.name,
        coachId: coach?.id,
        coachName: coach?.name,
      });
    }
  };

  // Retornar aluno finalizado para a fila de atendimento
  const restoreMember = async (member: QueueMember & { finishedAt: Date; reason: string }) => {
    try {
      // Usar a nova API de reativação (mantém o mesmo registro)
      const success = await reactivateMember(member.id);
      
      if (success) {
        await loadQueue();
        if (!isMuted) playSound('success');
      } else {
        console.error('Erro ao reativar membro');
        alert('Erro ao reativar aluno. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao restaurar membro:', error);
      alert('Erro ao reativar aluno. Tente novamente.');
    }
  };

  const addMember = async (name: string, situation: string) => {
    const priorityMap: Record<string, Priority> = { first: 'RED', new_program: 'ORANGE', returning: 'YELLOW', regular: 'GREEN' };
    const tagsMap: Record<string, string[]> = { first: ['1º TREINO'], new_program: ['NOVA FICHA'], returning: ['RETORNO'], regular: [] };
    await addToQueue({
      member_name: name,
      priority: priorityMap[situation] || 'GREEN',
      tags: tagsMap[situation] || [],
      help_requested: situation === 'first',
      days_as_member: situation === 'first' ? 0 : 30,
    });
    setShowAdd(false);
    loadQueue();
  };

  // Reativar membro de Personal/Consultoria para fila normal
  const handleReactivatePersonal = async (member: QueueMember) => {
    try {
      const success = await unmarkAsPersonal(member.id);
      if (success) {
        await loadQueue();
        if (!isMuted) playSound('success');
      } else {
        alert('Erro ao reativar aluno. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao reativar personal:', error);
      alert('Erro ao reativar aluno. Tente novamente.');
    }
  };

  // FASE 1: Pular Atendimento
  const handleSkip = async (member: QueueMember, reason?: string) => {
    if (!coach || isSkipping) return;
    
    setIsSkipping(true);
    console.log('⏭️ Pulando atendimento:', member.name, reason);
    
    try {
      const result = await skipMember(member.id, coach.id, coach.name, reason);
      
      if (result.success) {
        console.log('✅ Pulo registrado:', result);
        
        // Log de atividade
        logEvent({
          eventType: 'SKIP',
          eventCategory: 'MEMBER',
          description: `Pulou atendimento: ${reason || 'Não informado'}`,
          memberName: member.name,
          memberEvoId: member.evoMemberId || undefined,
          queueId: member.id,
          metadata: {
            skipCount: result.skipCount,
            newPosition: result.newPosition,
            notifiedSupervisor: result.notifiedSupervisor,
            reason: reason || 'Não informado',
          },
        });
        
        if (!isMuted) playSound('success');
        setSkipModal(null);
        await loadQueue();
        
        // Mostrar feedback visual se notificou supervisor
        if (result.notifiedSupervisor) {
          // Incrementar contagem de pendências se for supervisor
          if (coach.is_supervisor) {
            setPendingRequestsCount(prev => prev + 1);
          }
        }
      } else {
        console.error('❌ Erro ao pular:', result.error);
        alert('Erro ao pular atendimento: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('❌ Exceção ao pular:', error);
      alert('Erro ao pular atendimento');
    } finally {
      setIsSkipping(false);
    }
  };

  if (isCheckingSession || isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF3B30] to-[#FF6347] flex items-center justify-center font-black text-2xl animate-pulse">I</div>
      </div>
    );
  }

  if (!coach) return <Login onLogin={handleLogin} />;

  // Separar fila: Regular vs Personal/Autônomo
  // Personal = isPersonal true OU tem tag PERSONAL/CONSULTORIA
  // NÃO incluir apenas por prioridade BLUE (veterano autônomo vai para fila regular)
  const regularQueue = queue.filter(m => {
    const hasPersonalTag = m.tags?.includes('PERSONAL') || m.tags?.includes('CONSULTORIA');
    return !m.isPersonal && !hasPersonalTag;
  });
  const personalQueue = queue.filter(m => {
    const hasPersonalTag = m.tags?.includes('PERSONAL') || m.tags?.includes('CONSULTORIA');
    return m.isPersonal || hasPersonalTag;
  });

  return (
    <div className="h-screen h-[100dvh] w-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="shrink-0 h-14 px-4 flex items-center justify-between border-b border-white/10 bg-black/50">
        {/* ESQUERDA - Logo + Nome */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF3B30] to-[#FF6347] flex items-center justify-center font-black text-lg">I</div>
          <div>
            <h1 className="text-sm font-black">IRON<span className="text-[#FF3B30]">COACH</span></h1>
            <p className="text-[10px] text-white/30">v15 • Sistema de Atendimento</p>
          </div>
        </div>

        {/* CENTRO - Navegação + Entrada Manual */}
        <div className="flex items-center gap-2">
          {/* BOTÃO ENTRADA MANUAL */}
          <button 
            onClick={() => setShowManualEntry(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 rounded-lg text-xs transition-all text-green-400 flex items-center gap-2"
            title="Adicionar aluno manualmente"
          >
            <AddUserIcon size={14} />
            <span className="hidden sm:inline">Inserir Aluno</span>
          </button>
          
          <div className="w-px h-6 bg-white/10" />
          
          <Link 
            href="/prioridades" 
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-all flex items-center gap-2"
          >
            <GuideIcon size={14} />
            <span className="hidden sm:inline">Guia</span>
          </Link>
          {coach.is_supervisor && (
            <Link 
              href="/supervisao"
              className="relative px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-xs transition-all text-blue-400 flex items-center gap-2"
            >
              <SupervisorIcon size={14} />
              <span className="hidden sm:inline">Supervisão</span>
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                </span>
              )}
            </Link>
          )}
          {(coach.is_supervisor || coach.role === 'ADMIN') && (
            <Link 
              href="/consultoras"
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-xs transition-all text-amber-400 flex items-center gap-2"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Consultoras</span>
            </Link>
          )}
          {coach.role === 'ADMIN' && (
            <>
              <Link 
                href="/admin"
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-xs transition-all text-purple-400 flex items-center gap-2"
              >
                <AdminIcon size={14} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <Link 
                href="/logs"
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs transition-all text-red-400 flex items-center gap-2"
              >
                <span>📋</span>
                <span className="hidden sm:inline">Logs</span>
              </Link>
              <Link 
                href="/relatorios"
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-xs transition-all text-emerald-400 flex items-center gap-2"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Relatórios</span>
              </Link>
            </>
          )}
        </div>

        {/* CENTRO-DIREITA - Hora */}
        <p className="text-3xl font-light tabular-nums">
          {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>

        {/* DIREITA - Stats + Filtro + User */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <DumbbellIcon size={16} color="rgba(255,255,255,0.3)" />
              <div>
                <p className="text-lg font-bold">{stats.total}</p>
                <p className="text-[10px] text-white/30">Intervenções</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TimerIcon size={16} color="rgba(255,255,255,0.3)" />
              <div>
                <p className="text-lg font-bold">{stats.avgTime.toFixed(0)}s</p>
                <p className="text-[10px] text-white/30">Média</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrophyIcon size={16} />
              <div>
                <p className="text-lg font-bold text-[#FFD700]">{stats.xp}</p>
                <p className="text-[10px] text-white/30">XP</p>
              </div>
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          {/* BOTÃO FILTRO PRIORIDADES MÁXIMAS */}
          <button 
            onClick={() => setShowPriorityFilter(!showPriorityFilter)} 
            className={`px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
              showPriorityFilter 
                ? 'bg-[#FF3B30] text-white shadow-lg shadow-red-500/30' 
                : 'bg-[#FF3B30]/20 text-[#FF3B30] hover:bg-[#FF3B30]/30'
            }`}
            title={showPriorityFilter ? 'Mostrar todos' : 'Filtrar 1ª/2ª Semana'}
          >
            {showPriorityFilter ? '✕' : '●'} 1ª/2ª
          </button>
          <button onClick={toggleMute} className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/5 text-white/40'}`}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 hover:bg-white/5 rounded-lg px-2 py-1" title="Sair">
            <div className="w-8 h-8 rounded-full bg-[#FF3B30]/20 flex items-center justify-center text-xs font-bold text-[#FF3B30]">{coach.initials}</div>
          </button>
        </div>
      </header>

      {/* CARD EXPANDIDO - ATENDIMENTO ATIVO */}
      <AnimatePresence>
        {activeAttendance && (
          <ExpandedAttendanceCard
            member={activeAttendance.member}
            suggestion={activeAttendance.suggestion}
            timer={attendanceTimer}
            maxTime={PRIORITY_CONFIG[activeAttendance.member.priority]?.attendanceTime || 15}
            isContinued={isContinued}
            onFinish={finishAttendance}
            onCancel={cancelAttendance}
            onContinue={enableContinuedAttendance}
            onNotify={() => setShowNotifyModal(activeAttendance.member)}
          />
        )}
      </AnimatePresence>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex min-h-0">
        {/* FILA DE ATENDIMENTO */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* HEADER DA FILA */}
          <div className="shrink-0 h-12 px-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <span className="font-bold">Fila de Atendimento</span>
              <span className="text-white/40">({regularQueue.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSidebar(!showSidebar)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm">
                🚪 Entradas {showSidebar ? '◀' : '▶'}
              </button>
              <button onClick={triggerSync} disabled={isSyncing} className={`px-3 py-1.5 rounded-lg text-sm ${isSyncing ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-white/5 hover:bg-white/10'}`}>
                🔄
              </button>
              <button onClick={() => setShowAdd(true)} className="px-4 py-1.5 bg-[#FF3B30] hover:bg-[#FF4D3D] rounded-lg font-bold text-sm">
                + ADICIONAR
              </button>
            </div>
          </div>

          {/* CARDS DA FILA */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* FILA REGULAR */}
            <div 
              className="grid gap-3"
              style={{ 
                // Grid responsivo que se adapta ao espaço disponível
                // Mínimo 280px para caber todo conteúdo, máximo 380px para não esticar demais
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                justifyItems: 'stretch',
                alignItems: 'stretch', // Cards com mesma altura na linha
              }}
            >
              <AnimatePresence mode="popLayout">
                {regularQueue.map((member) => (
                  <MemberCard
                    key={member.id}
                    ref={(el) => { if (el) cardRefs.current.set(member.id, el); else cardRefs.current.delete(member.id); }}
                    member={member}
                    isActive={activeAttendance?.member.id === member.id}
                    isSelected={selectedMemberId === member.id}
                    onAttend={() => startAttendanceFlow(member)}
                    onCheckout={() => { console.log('👋 Checkout clicado:', member.name, member.id); setCheckoutModal(member); }}
                    onViewDetails={() => setViewDetailsMember(member)}
                    onSkip={() => setSkipModal(member)}
                    isDimmed={showPriorityFilter && member.daysAsMember > 14}
                  />
                ))}
              </AnimatePresence>
            </div>

            {regularQueue.length === 0 && (
              <div className="h-32 flex flex-col items-center justify-center text-white/20">
                <span className="text-3xl mb-2">🏋️</span>
                <p>Nenhum aluno na fila</p>
              </div>
            )}

            {/* SEPARADOR - PERSONAL/AUTÔNOMO */}
            {personalQueue.length > 0 && (
              <>
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-blue-500/30" />
                  <span className="text-xs text-blue-400 font-bold">🔵 PERSONAL / AUTÔNOMO ({personalQueue.length})</span>
                  <div className="flex-1 h-px bg-blue-500/30" />
                </div>

                <div 
                  className="grid gap-3"
                  style={{ 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    justifyItems: 'stretch',
                    alignItems: 'stretch',
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {personalQueue.map((member) => {
                      // Se tem tag PERSONAL ou CONSULTORIA, pode reativar
                      const canReactivate = member.tags?.includes('PERSONAL') || member.tags?.includes('CONSULTORIA');
                      return (
                        <MemberCard
                          key={member.id}
                          ref={(el) => { if (el) cardRefs.current.set(member.id, el); else cardRefs.current.delete(member.id); }}
                          member={member}
                          isActive={activeAttendance?.member.id === member.id}
                          isSelected={selectedMemberId === member.id}
                          onAttend={() => startAttendanceFlow(member)}
                          onCheckout={() => { console.log('👋 Checkout clicado (Personal):', member.name, member.id); setCheckoutModal(member); }}
                          onViewDetails={() => setViewDetailsMember(member)}
                          onReactivate={canReactivate ? () => handleReactivatePersonal(member) : undefined}
                          isPassive
                          isDimmed={showPriorityFilter}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* SEPARADOR - FINALIZADOS (alunos que saíram) */}
            {finishedMembers.length > 0 && (
              <>
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/40 font-bold">✓ FINALIZADOS ({finishedMembers.length})</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div 
                  className="grid gap-3" 
                  style={{ 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    justifyItems: 'stretch',
                    alignItems: 'stretch',
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {finishedMembers.map((member) => (
                      <FinishedMemberCard
                        key={`finished-${member.id}`}
                        member={member}
                        onRestore={() => restoreMember(member)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SIDEBAR - ENTRADAS RECENTES */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="shrink-0 border-l border-white/10 bg-black/30 overflow-hidden">
              <div className="w-[280px] h-full flex flex-col">
                <div className="shrink-0 p-3 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚪</span>
                      <span className="font-bold text-sm">Entradas Recentes</span>
                    </div>
                    <button onClick={() => setShowSidebar(false)} className="text-white/30 hover:text-white">✕</button>
                  </div>
                  {lastSyncTime && (
                    <p className="text-[10px] text-white/30 mt-1">
                      Atualizado: {lastSyncTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  )}
                </div>
                
                {/* GRÁFICO DE ESTATÍSTICAS DO DIA */}
                <div className="shrink-0 p-3 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">📊</span>
                    <span className="font-bold text-xs">Estatísticas do Dia</span>
                  </div>
                  <DailyStatsChart queue={queue} />
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                  {recentEntries.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 text-sm">
                      <span className="text-2xl mb-2">📭</span>
                      <p>Aguardando entradas...</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {recentEntries.map((entry, i) => {
                        const isInQueue = queue.some(m => m.name === entry.name);
                        const priorityColor = entry.priority ? PRIORITY_CONFIG[entry.priority as Priority]?.color : '#30D158';
                        const hasAlert = entry.tags?.some(t => ALERT_TAGS.includes(t));
                        
                        return (
                          <button 
                            key={`${entry.name}-${entry.time}-${i}`} 
                            onClick={() => handleSelectFromSidebar(entry.name)} 
                            disabled={!isInQueue} 
                            className={`w-full p-2 rounded-lg text-left transition-all ${
                              isInQueue 
                                ? hasAlert 
                                  ? 'bg-red-500/10 hover:bg-red-500/20 cursor-pointer border border-red-500/30' 
                                  : 'bg-white/5 hover:bg-white/10 cursor-pointer' 
                                : 'bg-white/[0.02] opacity-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${hasAlert ? 'animate-pulse' : ''}`} style={{ backgroundColor: isInQueue ? priorityColor : '#666' }} />
                              <span className={`font-medium text-sm truncate flex-1 ${!isInQueue ? 'line-through text-white/30' : ''}`}>
                                {entry.name.split(' ').slice(0, 2).join(' ')}
                              </span>
                              {hasAlert && isInQueue && <span className="text-xs">⚠️</span>}
                              <span className="text-xs text-white/60 font-mono">{entry.time}</span>
                            </div>
                            {hasAlert && isInQueue && entry.tags && (
                              <p className="text-[10px] text-red-400 mt-0.5 ml-4 truncate">
                                {entry.tags.find(t => ALERT_TAGS.includes(t))}
                              </p>
                            )}
                            {!isInQueue && <p className="text-[10px] text-white/30 mt-0.5 ml-4">Já saiu</p>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={addMember} />}
      </AnimatePresence>

      <AnimatePresence>
        {checkoutModal && (
          <CheckoutModal member={checkoutModal} onClose={() => setCheckoutModal(null)} onConfirm={(reason) => handleCheckout(checkoutModal, reason)} />
        )}
      </AnimatePresence>

      {/* Modal de Visualização de Detalhes (sem atendimento) */}
      <AnimatePresence>
        {viewDetailsMember && coach && (
          <MemberDetailsModal 
            member={viewDetailsMember}
            coach={coach}
            onClose={() => setViewDetailsMember(null)}
            onAttend={() => {
              setViewDetailsMember(null);
              startAttendanceFlow(viewDetailsMember);
            }}
            onNotify={() => {
              setViewDetailsMember(null);
              setShowNotifyModal(viewDetailsMember);
            }}
            onCheckout={() => {
              setViewDetailsMember(null);
              setCheckoutModal(viewDetailsMember);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de Notificação à Coordenação */}
      <AnimatePresence>
        {showNotifyModal && coach && (
          <NotifyCoordinationModal 
            member={showNotifyModal} 
            coach={coach}
            onClose={() => setShowNotifyModal(null)} 
            onSuccess={() => {
              // Log de notificação enviada
              logNotificationSent('Coordenação', showNotifyModal.name, undefined, showNotifyModal.id);
              setShowNotifyModal(null);
              if (!isMuted) playSound('success');
            }}
          />
        )}
      </AnimatePresence>

      {/* FASE 1: Modal de Pular Atendimento */}
      <AnimatePresence>
        {skipModal && coach && (
          <SkipModal
            member={skipModal}
            onClose={() => setSkipModal(null)}
            onConfirm={(reason) => handleSkip(skipModal, reason)}
            isLoading={isSkipping}
          />
        )}
      </AnimatePresence>

      {/* Modal de Entrada Manual */}
      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        coachId={coach.id}
        coachName={coach.name}
        coachEvoId={coach.evo_employee_id}
        onSuccess={() => {
          // Log de entrada manual
          logManualEntry('Aluno via entrada manual');
          setShowManualEntry(false);
          // Recarrega a fila usando loadQueue que já usa dbToLocal
          loadQueue();
          if (!isMuted) playSound('success');
        }}
      />
    </div>
  );
}

// ============================================================================
// CARD EXPANDIDO (DURANTE ATENDIMENTO) - v14
// ============================================================================

function ExpandedAttendanceCard({ 
  member, 
  suggestion, 
  timer, 
  maxTime, 
  isContinued,
  onFinish, 
  onCancel,
  onContinue,
  onNotify
}: { 
  member: QueueMember;
  suggestion: Suggestion;
  timer: number; // Tempo restante (regressivo) ou negativo se passou
  maxTime: number;
  isContinued: boolean;
  onFinish: () => void;
  onCancel: () => void;
  onContinue: () => void;
  onNotify: () => void;
}) {
  const p = PRIORITY_CONFIG[member.priority] || PRIORITY_CONFIG.YELLOW;
  
  // Timer formatado dependendo do modo:
  // - Normal: regressivo (15s, 14s, ..., 0s, -1s, -2s...)  
  // - Continuado: tempo extra positivo (+1s, +2s, ...)
  const isOvertime = !isContinued && timer < 0;
  const absTimer = Math.abs(timer);
  const minutes = Math.floor(absTimer / 60);
  const seconds = absTimer % 60;
  
  let timerFormatted: string;
  let timerColor: string;
  let timerLabel: string;
  
  if (isContinued) {
    // Modo CONTINUADO: mostra tempo EXTRA (positivo)
    timerFormatted = minutes > 0 
      ? `+${minutes}:${String(seconds).padStart(2, '0')}`
      : `+${timer}s`;
    timerColor = '#007AFF'; // Azul
    timerLabel = 'TEMPO EXTRA';
  } else if (isOvertime) {
    // Tempo EXCEDIDO (negativo)
    timerFormatted = minutes > 0 
      ? `-${minutes}:${String(seconds).padStart(2, '0')}`
      : `-${absTimer}s`;
    timerColor = '#FF3B30'; // Vermelho
    timerLabel = 'TEMPO EXCEDIDO';
  } else {
    // Tempo RESTANTE (regressivo normal)
    timerFormatted = minutes > 0 
      ? `${minutes}:${String(seconds).padStart(2, '0')}`
      : `${timer}s`;
    timerColor = timer <= 5 ? '#FF3B30' : timer <= maxTime / 2 ? '#FF9500' : p.color;
    timerLabel = 'TEMPO RESTANTE';
  }
  
  // Barra de progresso (só no modo normal)
  const progress = isContinued ? 100 : Math.max(0, Math.min(100, (timer / maxTime) * 100));
  const progressColor = isContinued ? '#007AFF' : isOvertime ? '#FF3B30' : timerColor;
  
  const timeInGym = calcTimeInGym(member.checkInTime);
  const retentionScore = member.retentionScore ?? 0; // Sem dados = 0%, não 50%!
  const isLowRetention = retentionScore < 50;
  
  const getPhaseLabel = (days: number) => {
    if (days <= 7) return '1ª Semana';
    if (days <= 14) return '2ª Semana';
    if (days <= 30) return 'Mês 1';
    if (days <= 60) return 'Mês 2';
    if (days <= 90) return 'Mês 3';
    return 'Veterano';
  };
  
  const getTankColor = () => {
    if (retentionScore >= 75) return '#30D158';
    if (retentionScore >= 50) return '#FFCC00';
    if (retentionScore >= 25) return '#FF9500';
    return '#FF3B30';
  };
  
  const getFichaStatus = () => {
    if (!member.hasFicha) return { text: 'SEM FICHA', color: '#FF3B30', action: 'CRIAR AGORA!' };
    if (member.fichaVencida) return { text: 'FICHA VENCIDA', color: '#FF9500', action: 'RENOVAR!' };
    return { text: 'Ficha OK', color: '#30D158', action: null };
  };
  
  const getAvaliacaoStatus = () => {
    if (!member.hasAvaliacao) return { text: 'SEM AVALIAÇÃO', color: '#FF3B30', action: 'AGENDAR!' };
    if (member.avaliacaoVencida) return { text: 'AVAL. VENCIDA', color: '#FF9500', action: 'REAGENDAR!' };
    return { text: 'Avaliação OK', color: '#30D158', action: null };
  };
  
  const fichaStatus = getFichaStatus();
  const avaliacaoStatus = getAvaliacaoStatus();

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="shrink-0 overflow-hidden border-b"
      style={{ backgroundColor: `${p.color}10`, borderColor: `${p.color}30` }}
    >
      <div className="p-4 px-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* TANQUE DE RETENÇÃO */}
            <div className="flex flex-col items-center">
              <div 
                className="w-10 h-20 bg-black/50 rounded-lg flex flex-col justify-end overflow-hidden"
                style={{ border: `2px solid ${getTankColor()}40` }}
              >
                <div 
                  style={{ 
                    height: `${retentionScore}%`, 
                    background: `linear-gradient(0deg, ${getTankColor()} 0%, ${getTankColor()}99 100%)`,
                    borderRadius: '0 0 6px 6px',
                  }} 
                />
              </div>
              <span className="text-lg font-bold mt-1" style={{ color: getTankColor() }}>{retentionScore}%</span>
              <span className="text-[10px] text-white/40">RETENÇÃO</span>
            </div>
            
            {/* AVATAR E NOME */}
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white relative overflow-hidden"
                style={{ 
                  backgroundColor: p.color,
                  boxShadow: isLowRetention ? '0 0 20px rgba(255,59,48,0.7)' : undefined,
                  border: isLowRetention ? '3px solid #FF3B30' : '2px solid rgba(255,255,255,0.1)',
                }}
              >
                {member.photoUrl ? (
                  <img 
                    src={member.photoUrl} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'auto' }}
                    onError={(e) => {
                      // Fallback para iniciais se a imagem não carregar
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = member.name.split(' ').map(n => n[0]).slice(0, 2).join('');
                    }}
                  />
                ) : (
                  member.name.split(' ').map(n => n[0]).slice(0, 2).join('')
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{member.name}</h2>
                <div className="flex items-center gap-4 text-sm text-white/60 mt-1">
                  <span className="flex items-center gap-1">🏋️ {timeInGym} na academia</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ 
                    backgroundColor: member.daysAsMember <= 14 ? 'rgba(255,59,48,0.2)' : 'transparent',
                    color: member.daysAsMember <= 14 ? '#FF6B6B' : 'inherit'
                  }}>
                    📅 {member.daysAsMember} dias • {getPhaseLabel(member.daysAsMember)}
                  </span>
                  {isLowRetention && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FF3B30]/20 text-[#FF3B30] font-bold animate-pulse">
                      ⚠️ RISCO DE DESISTÊNCIA
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* TIMER + BOTÃO CONTINUAR */}
          <div className="flex items-center gap-4">
            {/* Botão Atendimento Continuado */}
            {!isContinued ? (
              <button
                onClick={onContinue}
                className="flex flex-col items-center justify-center p-3 rounded-xl transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #007AFF 0%, #0055CC 100%)',
                  boxShadow: '0 4px 15px rgba(0, 122, 255, 0.4)',
                }}
                title="Ativar atendimento continuado (sem limite de tempo)"
              >
                <span className="text-2xl">🔄</span>
                <span className="text-xs font-bold text-white/80 mt-1">CONTINUAR</span>
              </button>
            ) : (
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#30D158]/20 border-2 border-[#30D158]">
                <span className="text-2xl">✓</span>
                <span className="text-xs font-bold text-[#30D158] mt-1">CONTINUADO</span>
              </div>
            )}
            
            {/* Timer */}
            <div className="text-right">
              <p className={`text-6xl font-light tabular-nums ${isOvertime && !isContinued ? 'animate-pulse' : ''}`} 
                 style={{ color: timerColor }}>
                {timerFormatted}
              </p>
              <div className="flex items-center justify-end gap-2">
                <p className="text-sm text-white/40">
                  {timerLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE PROGRESSO */}
        <div className="h-2 bg-white/10 rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: progressColor }}
            initial={{ width: '100%' }}
            animate={{ width: isContinued ? '100%' : `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* CONTEÚDO */}
        <div className="grid grid-cols-3 gap-4">
          {/* SUGESTÃO DE INTERVENÇÃO */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-xs text-white/40 mb-2">💡 SUGESTÃO DE INTERVENÇÃO</h3>
            <p className="text-xl font-bold mb-2" style={{ color: p.color }}>{suggestion.titulo}</p>
            <p className="text-sm text-white/70 leading-relaxed">{suggestion.texto}</p>
          </div>

          {/* STATUS FICHA E AVALIAÇÃO */}
          <div className="space-y-3">
            {/* FICHA */}
            <div 
              className="rounded-xl p-4 border"
              style={{ 
                backgroundColor: `${fichaStatus.color}15`,
                borderColor: `${fichaStatus.color}40`
              }}
            >
              <h3 className="text-xs text-white/40 mb-1">📋 FICHA DE TREINO</h3>
              <p className="text-lg font-bold" style={{ color: fichaStatus.color }}>
                {fichaStatus.action ? `❌ ${fichaStatus.text}` : `✅ ${fichaStatus.text}`}
              </p>
              {fichaStatus.action && (
                <p className="text-sm font-bold mt-1" style={{ color: fichaStatus.color }}>
                  → {fichaStatus.action}
                </p>
              )}
              {member.workoutName && (
                <p className="text-xs text-white/50 mt-2">
                  {member.workoutName} {member.workoutLetter && `(Série ${member.workoutLetter.toUpperCase()})`}
                </p>
              )}
            </div>

            {/* AVALIAÇÃO */}
            <div 
              className="rounded-xl p-4 border"
              style={{ 
                backgroundColor: `${avaliacaoStatus.color}15`,
                borderColor: `${avaliacaoStatus.color}40`
              }}
            >
              <h3 className="text-xs text-white/40 mb-1">📊 AVALIAÇÃO FÍSICA</h3>
              <p className="text-lg font-bold" style={{ color: avaliacaoStatus.color }}>
                {avaliacaoStatus.action ? `❌ ${avaliacaoStatus.text}` : `✅ ${avaliacaoStatus.text}`}
              </p>
              {avaliacaoStatus.action && (
                <p className="text-sm font-bold mt-1" style={{ color: avaliacaoStatus.color }}>
                  → {avaliacaoStatus.action}
                </p>
              )}
            </div>
          </div>

          {/* FREQUÊNCIA E RISCO */}
          <div className="space-y-3">
            {/* FREQUÊNCIA */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <h3 className="text-xs text-white/40 mb-2">📈 FREQUÊNCIA SEMANAL (máx {member.freqEsperada}x esperado)</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold text-white/50">{member.freq15_21}x</p>
                  <p className="text-[10px] text-white/40">2 sem atrás</p>
                </div>
                <div>
                  <p className={`text-xl font-bold ${member.freq08_14 < member.freq15_21 ? 'text-orange-400' : 'text-white/60'}`}>
                    {member.freq08_14}x
                  </p>
                  <p className="text-[10px] text-white/40">Sem passada</p>
                </div>
                <div>
                  <p className={`text-xl font-bold ${
                    member.freqAtual >= member.freqEsperada ? 'text-green-400' : 
                    member.freqAtual > 0 ? 'text-blue-400' : 'text-white/30'
                  }`}>
                    {member.freqAtual}x
                  </p>
                  <p className="text-[10px] text-white/40">Esta semana</p>
                </div>
              </div>
            </div>

            {/* ALERTA DE RISCO */}
            {member.churnLevel !== 'NORMAL' && (
              <div 
                className={`rounded-xl p-4 border ${
                  member.churnLevel === 'URGENTE' ? 'bg-red-500/20 border-red-500/40' :
                  member.churnLevel === 'CRITICO' ? 'bg-red-500/15 border-red-500/30' :
                  'bg-orange-500/15 border-orange-500/30'
                }`}
              >
                <p className={`text-lg font-bold text-center ${
                  member.churnLevel === 'URGENTE' ? 'text-red-400' :
                  member.churnLevel === 'CRITICO' ? 'text-red-400' :
                  'text-orange-400'
                }`}>
                  ⚠️ {member.churnLevel === 'URGENTE' ? 'PROVÁVEL DESISTÊNCIA!' : 
                      member.churnLevel === 'CRITICO' ? 'FREQUÊNCIA CAINDO!' : 
                      'ATENÇÃO NA FREQUÊNCIA'}
                </p>
                <p className="text-xs text-center text-white/50 mt-1">
                  {member.freq15_21 > 0 && member.freq08_14 < member.freq15_21 
                    ? `Queda de ${member.freq15_21}x → ${member.freq08_14}x na semana` 
                    : 'Frequência abaixo do esperado'}
                </p>
                <p className="text-xs text-center text-white/40 mt-0.5">
                  Pergunte sobre dificuldades/motivos
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BOTÕES */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onFinish}
            className="flex-1 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 text-lg"
            style={{ backgroundColor: p.color }}
          >
            ✅ Finalizar Atendimento
          </button>
          <button
            onClick={onNotify}
            className="px-6 py-4 rounded-xl font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 flex items-center justify-center gap-2"
            title="Notificar coordenação sobre este aluno"
          >
            📢
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-4 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white/60"
          >
            ❌
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MEMBER CARD v14 - Com alerta visual para retenção < 50%
// ============================================================================

const MemberCard = forwardRef<HTMLDivElement, {
  member: QueueMember;
  isActive: boolean;
  isSelected: boolean;
  onAttend: () => void;
  onCheckout: () => void;
  onViewDetails: () => void; // Ver detalhes sem atendimento
  onSkip?: () => void; // FASE 1: Pular Atendimento
  onReactivate?: () => void; // Reativar card de Personal para fila normal
  isPassive?: boolean;
  isDimmed?: boolean; // Para filtro de prioridade máxima
}>(({ member, isActive, isSelected, onAttend, onCheckout, onViewDetails, onSkip, onReactivate, isPassive, isDimmed }, ref) => {
  const p = PRIORITY_CONFIG[member.priority] || PRIORITY_CONFIG.YELLOW;
  const [showChurnAlert, setShowChurnAlert] = useState(false); // Alerta de desistência
  const [showCriticalOverlay, setShowCriticalOverlay] = useState(false); // Overlay triângulo para retenção crítica
  
  const timeInGym = calcTimeInGym(member.checkInTime);
  const waitMinutes = calcTimeMinutes(member.lastAttendedAt || member.checkInTime);
  const wasAttended = member.lastAttendedAt !== null;
  
  // Timer de atendimento
  const alertInterval = p.alertInterval || 10;
  const timeRemaining = alertInterval - waitMinutes;
  const isOverdue = timeRemaining < 0;
  const timerDisplay = isOverdue 
    ? `-${String(Math.abs(Math.floor(timeRemaining))).padStart(2, '0')}:00`
    : `${String(Math.max(0, Math.floor(timeRemaining))).padStart(2, '0')}:00`;
  
  // Personal/Autônomo nunca pisca nem fica crítico
  const isPersonalOrAutonomo = member.isPersonal || member.priority === 'BLUE' || member.priority === 'BLACK';
  
  const shouldPulse = !isPassive && !isPersonalOrAutonomo && p.alertInterval > 0 && waitMinutes >= p.alertInterval;
  const isCritical = !isPersonalOrAutonomo && (member.priority === 'RED' || member.churnLevel === 'URGENTE' || member.churnLevel === 'CRITICO');
  
  // Detectar comportamento de desistência
  const isChurnRisk = !isPersonalOrAutonomo && !isPassive && (member.churnLevel === 'URGENTE' || member.churnLevel === 'CRITICO');
  
  // Retention score - SEM DADOS = 0%, não 50%!
  const retentionScore = member.retentionScore ?? 0;
  const tankHeight = `${Math.max(5, retentionScore)}%`;
  // Personal/Autônomo não mostra alerta de retenção baixa
  const isLowRetention = !isPersonalOrAutonomo && !isPassive && retentionScore < 50;
  
  // NOVO: Retenção crítica (<25%) + tempo excedido = mostrar triângulo
  const isCriticalRetention = !isPersonalOrAutonomo && !isPassive && retentionScore < 25 && isOverdue;
  
  // Efeito de piscar para DESISTÊNCIA (churn) - Pisca mais rápido e com cor diferente
  useEffect(() => {
    if (!isChurnRisk) {
      setShowChurnAlert(false);
      return;
    }
    
    // Pisca a cada 2 segundos (1s visível, 1s oculto)
    const interval = setInterval(() => {
      setShowChurnAlert(prev => !prev);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isChurnRisk]);
  
  // NOVO: Efeito para triângulo de retenção crítica (<25% + tempo excedido)
  // Ciclo: 15s normal → 2s triângulo → repete
  useEffect(() => {
    if (!isCriticalRetention) {
      setShowCriticalOverlay(false);
      return;
    }
    
    const showTriangle = () => {
      setShowCriticalOverlay(true);
      setTimeout(() => {
        setShowCriticalOverlay(false);
      }, 2000); // 2 segundos mostrando triângulo
    };
    
    // Mostrar triângulo pela primeira vez após 5 segundos
    const initialTimeout = setTimeout(() => {
      showTriangle();
    }, 5000);
    
    // Depois, ciclo a cada 17 segundos (15s normal + 2s triângulo)
    const intervalId = setInterval(() => {
      showTriangle();
    }, 17000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [isCriticalRetention]);
  
  const getPhaseLabel = (days: number) => {
    if (days <= 7) return '1ª Sem';
    if (days <= 14) return '2ª Sem';
    if (days <= 30) return 'Mês 1';
    if (days <= 60) return 'Mês 2';
    if (days <= 90) return 'Mês 3';
    return 'Veterano';
  };
  
  const getFichaStatus = () => {
    if (!member.hasFicha) return { icon: '📋', text: 'Sem ficha', type: 'danger' };
    if (member.fichaVencida) return { icon: '📋', text: 'Vencida', type: 'warning' };
    return { icon: '📋', text: 'Ficha ✓', type: 'success' };
  };
  
  const getAvaliacaoStatus = () => {
    if (!member.hasAvaliacao) return { icon: '📊', text: 'Sem aval.', type: 'danger' };
    if (member.avaliacaoVencida) return { icon: '📊', text: 'Vencida', type: 'warning' };
    return { icon: '📊', text: 'Aval. ✓', type: 'success' };
  };
  
  const fichaStatus = getFichaStatus();
  const avaliacaoStatus = getAvaliacaoStatus();
  const hasAlert = member.helpRequested || isCritical;
  const isStripe = isCritical || member.priority === 'ORANGE';

  const getTankColor = () => {
    if (retentionScore >= 75) return '#30D158';
    if (retentionScore >= 50) return '#FFCC00';
    if (retentionScore >= 25) return '#FF9500';
    return '#FF3B30';
  };

  // Cor do card para Personal/Autônomo (isPassive) - visual azul/cinza escurecido
  const passiveCardStyle = isPassive ? {
    background: 'linear-gradient(145deg, #1a1a2e 0%, #16162a 100%)',
    border: `2px solid ${member.tags.includes('PERSONAL') || member.tags.includes('CONSULTORIA') ? '#4a5568' : '#3b82f6'}80`,
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.15)',
    filter: 'saturate(0.7)',
  } : {};

  // OVERLAY DE ALERTA CRÍTICO - Retenção < 25% + Tempo excedido
  if (showCriticalOverlay && !isPassive) {
    return (
      <motion.div
        ref={ref}
        layout
        className={`relative flex overflow-hidden ${isActive ? 'ring-2 ring-[#30D158]' : ''}`}
        style={{ 
          background: '#0a0a0a',
          borderRadius: '12px',
          border: '3px solid #FF3B30',
          boxShadow: '0 0 40px rgba(255, 59, 48, 0.6)',
          minHeight: '180px',
        }}
      >
        {/* Overlay de Alerta Crítico */}
        <div className="flex flex-col items-center justify-center p-6 w-full">
          {/* Triângulo de Warning Grande */}
          <svg 
            width="60" 
            height="52" 
            viewBox="0 0 60 54" 
            fill="none" 
            className="mb-3"
            style={{ filter: 'drop-shadow(0 0 20px rgba(255, 59, 48, 0.9))' }}
          >
            <path 
              d="M30 0L60 54H0L30 0Z" 
              fill="#FF3B30"
            />
            <text x="30" y="42" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">!</text>
          </svg>
          
          <span className="text-2xl font-black text-[#FF3B30] tracking-wider">ATENÇÃO</span>
          <span className="text-lg text-white/70 mt-1 font-medium">{member.name.split(' ')[0]}</span>
          <span className="text-sm text-[#FF3B30] mt-2 font-bold">{retentionScore}% RETENÇÃO • {timerDisplay}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: isDimmed ? 0.3 : isActive ? 0.5 : isPassive ? 0.85 : 1, 
        scale: isSelected ? 1.02 : 1,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        relative flex overflow-hidden transition-all
        ${isActive ? 'ring-2 ring-[#30D158]' : ''} 
        ${isSelected ? 'ring-2 ring-[#007AFF]' : ''}
        ${shouldPulse && !isPassive ? 'animate-pulse' : ''}
        ${isDimmed ? 'pointer-events-none' : ''}
      `}
      style={{ 
        background: isDimmed ? '#0a0a0a' : isPassive ? passiveCardStyle.background : 'linear-gradient(145deg, #1a1a1a 0%, #141414 100%)',
        borderRadius: '12px',
        border: isDimmed ? '2px solid #333' : isPassive ? passiveCardStyle.border : `2px solid ${isLowRetention ? '#FF3B30' : p.color}`,
        boxShadow: isDimmed 
          ? 'none'
          : isPassive
            ? passiveCardStyle.boxShadow
            : isLowRetention 
              ? '0 0 25px rgba(255, 59, 48, 0.4)'
              : isCritical 
                ? `0 0 25px ${p.color}40` 
                : `0 0 15px ${p.color}20`,
        minHeight: '180px',
        height: 'fit-content',
        filter: isDimmed ? 'grayscale(100%)' : isPassive ? passiveCardStyle.filter : 'none',
      }}
    >
      {/* PAINEL LATERAL - Tanque de Retenção */}
      <div className="relative flex flex-col" style={{ width: '48px', flexShrink: 0 }}>
        <div 
          className="absolute left-0 top-0 bottom-0"
          style={{ 
            width: '6px',
            background: isStripe
              ? `repeating-linear-gradient(-55deg, ${p.color}, ${p.color} 3px, ${p.color}99 3px, ${p.color}99 6px)`
              : p.color,
          }}
        />
        
        <div 
          className="flex-1 flex flex-col items-center justify-center"
          style={{ 
            padding: '8px 6px 8px 12px',
            background: 'linear-gradient(180deg, #1f1f1f 0%, #151515 100%)',
          }}
        >
          <div 
            className="flex flex-col justify-end overflow-hidden"
            style={{
              width: '20px',
              height: '55px',
              background: '#0a0a0a',
              borderRadius: '4px',
              border: `1px solid ${isLowRetention ? 'rgba(255,59,48,0.5)' : 'rgba(255,255,255,0.15)'}`,
            }}
          >
            <div 
              style={{
                width: '100%',
                height: tankHeight,
                background: `linear-gradient(0deg, ${getTankColor()} 0%, ${getTankColor()}99 100%)`,
                borderRadius: '0 0 3px 3px',
                transition: 'height 0.5s ease',
              }}
            />
          </div>
          <span 
            className="font-bold mt-1.5"
            style={{ fontSize: '10px', color: getTankColor() }}
          >
            {retentionScore}%
          </span>
        </div>
      </div>
      
      {/* CONTEÚDO PRINCIPAL */}
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={{ 
          padding: '12px 14px',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar - CLICÁVEL para ver detalhes */}
            <button 
              onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
              className="relative flex items-center justify-center font-bold text-white shrink-0 cursor-pointer transition-transform hover:scale-105 overflow-hidden"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${p.color} 0%, ${p.color}cc 100%)`,
                fontSize: '14px',
                boxShadow: isLowRetention 
                  ? '0 0 14px rgba(255,59,48,0.8)'
                  : '0 3px 8px rgba(0,0,0,0.3)',
                border: isLowRetention ? '3px solid #FF3B30' : '2px solid rgba(255,255,255,0.1)',
              }}
              title="Ver detalhes do aluno"
            >
              {member.photoUrl ? (
                <img 
                  src={member.photoUrl} 
                  alt={member.name}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'auto' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = member.name.split(' ').map(n => n[0]).slice(0, 2).join('');
                  }}
                />
              ) : (
                member.name.split(' ').map(n => n[0]).slice(0, 2).join('')
              )}
            </button>
            <div className="flex-1 min-w-0">
              <span 
                className="font-bold block"
                style={{ 
                  fontSize: '13px', 
                  lineHeight: '1.3',
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                title={member.name}
              >
                {member.name.toUpperCase()}
              </span>
            </div>
          </div>
          {hasAlert && (
            <span 
              className="font-bold text-white shrink-0"
              style={{
                fontSize: '8px',
                padding: '2px 5px',
                borderRadius: '3px',
                background: 'linear-gradient(135deg, #FF3B30 0%, #D62D20 100%)',
                boxShadow: '0 2px 6px rgba(255, 59, 48, 0.4)',
              }}
            >
              SOS
            </span>
          )}
          {/* Badge de Desistência - pisca quando há risco */}
          {isChurnRisk && (
            <span 
              className="font-bold text-white shrink-0"
              style={{
                fontSize: '7px',
                padding: '2px 4px',
                borderRadius: '3px',
                background: showChurnAlert 
                  ? 'linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)' 
                  : 'linear-gradient(135deg, #FF3B30 0%, #D62D20 100%)',
                boxShadow: showChurnAlert 
                  ? '0 2px 8px rgba(255, 149, 0, 0.6)' 
                  : '0 2px 6px rgba(255, 59, 48, 0.4)',
                animation: 'pulse 1s ease-in-out infinite',
                letterSpacing: '0.5px',
              }}
              title={`Frequência: ${member.freq15_21}x → ${member.freq08_14}x (queda)`}
            >
              {member.churnLevel === 'URGENTE' ? '⚠️ DESISTINDO' : '📉 QUEDA'}
            </span>
          )}
        </div>
        
        {wasAttended && (
          <div 
            className="flex items-center gap-1 mb-2"
            style={{
              fontSize: '9px',
              padding: '3px 8px',
              borderRadius: '10px',
              background: 'rgba(48, 209, 88, 0.15)',
              color: '#30D158',
              border: '1px solid rgba(48, 209, 88, 0.3)',
              width: 'fit-content',
              fontWeight: 600,
            }}
          >
            ✓ Atendido
          </div>
        )}
        
        {/* 3 INFO BOXES */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div 
            className="flex flex-col items-center justify-center text-center"
            style={{
              padding: '6px 4px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: '58px',
            }}
          >
            <span style={{ fontSize: '14px', marginBottom: '2px' }}>🏋️</span>
            <span className="font-bold" style={{ fontSize: '13px', lineHeight: '1.2' }}>{timeInGym}</span>
            <span style={{ fontSize: '8px', color: '#888', textTransform: 'uppercase', marginTop: '1px' }}>Academia</span>
          </div>
          
          <div 
            className={`flex flex-col items-center justify-center text-center ${isOverdue ? 'animate-pulse' : ''}`}
            style={{
              padding: '6px 4px',
              background: isOverdue ? 'rgba(255, 59, 48, 0.15)' : waitMinutes > alertInterval * 0.7 ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              border: `1px solid ${isOverdue ? 'rgba(255, 59, 48, 0.35)' : waitMinutes > alertInterval * 0.7 ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255,255,255,0.08)'}`,
              minHeight: '58px',
            }}
          >
            <span style={{ fontSize: '14px', marginBottom: '2px' }}>⏱️</span>
            <span 
              className="font-bold" 
              style={{ 
                fontSize: '13px', 
                lineHeight: '1.2',
                color: isOverdue ? '#FF3B30' : waitMinutes > alertInterval * 0.7 ? '#FF9500' : 'inherit' 
              }}
            >
              {timerDisplay}
            </span>
            <span 
              style={{ 
                fontSize: '8px', 
                color: isOverdue ? '#FF6B6B' : '#888', 
                textTransform: 'uppercase',
                marginTop: '1px',
              }}
            >
              {isOverdue ? 'Atrasado!' : 'Restante'}
            </span>
          </div>
          
          <div 
            className="flex flex-col items-center justify-center text-center"
            style={{
              padding: '6px 4px',
              background: member.daysAsMember <= 14 ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              border: `1px solid ${member.daysAsMember <= 14 ? 'rgba(255, 59, 48, 0.35)' : 'rgba(255,255,255,0.08)'}`,
              minHeight: '58px',
            }}
          >
            <span style={{ fontSize: '14px', marginBottom: '2px' }}>📅</span>
            <span 
              className="font-bold" 
              style={{ 
                fontSize: '13px',
                lineHeight: '1.2',
                color: member.daysAsMember <= 14 ? '#FF3B30' : 'inherit'
              }}
            >
              {member.daysAsMember}d
            </span>
            <span 
              style={{ 
                fontSize: '8px', 
                color: member.daysAsMember <= 14 ? '#FF6B6B' : '#888', 
                textTransform: 'uppercase',
                marginTop: '1px',
              }}
            >
              {getPhaseLabel(member.daysAsMember)}
            </span>
          </div>
        </div>
        
        {/* STATUS BAR */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div 
            className="flex items-center justify-center gap-1.5"
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              background: fichaStatus.type === 'danger' ? 'rgba(255, 59, 48, 0.12)' : fichaStatus.type === 'warning' ? 'rgba(255, 149, 0, 0.12)' : 'rgba(48, 209, 88, 0.12)',
              border: `1px solid ${fichaStatus.type === 'danger' ? 'rgba(255, 59, 48, 0.3)' : fichaStatus.type === 'warning' ? 'rgba(255, 149, 0, 0.3)' : 'rgba(48, 209, 88, 0.3)'}`,
              color: fichaStatus.type === 'danger' ? '#FF6B6B' : fichaStatus.type === 'warning' ? '#FFB347' : '#4ADE80',
            }}
          >
            <span style={{ fontSize: '11px' }}>{fichaStatus.icon}</span>
            <span>{fichaStatus.text}</span>
          </div>
          <div 
            className="flex items-center justify-center gap-1.5"
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 600,
              background: avaliacaoStatus.type === 'danger' ? 'rgba(255, 59, 48, 0.12)' : avaliacaoStatus.type === 'warning' ? 'rgba(255, 149, 0, 0.12)' : 'rgba(48, 209, 88, 0.12)',
              border: `1px solid ${avaliacaoStatus.type === 'danger' ? 'rgba(255, 59, 48, 0.3)' : avaliacaoStatus.type === 'warning' ? 'rgba(255, 149, 0, 0.3)' : 'rgba(48, 209, 88, 0.3)'}`,
              color: avaliacaoStatus.type === 'danger' ? '#FF6B6B' : avaliacaoStatus.type === 'warning' ? '#FFB347' : '#4ADE80',
            }}
          >
            <span style={{ fontSize: '11px' }}>{avaliacaoStatus.icon}</span>
            <span>{avaliacaoStatus.text}</span>
          </div>
        </div>
        
        {/* BOTÕES */}
        <div className="flex gap-2 mt-auto">
          {/* Se for Personal/Consultoria com opção de reativar, mostra botão diferente */}
          {isPassive && onReactivate ? (
            <button 
              onClick={onReactivate}
              className="flex-1 flex items-center justify-center gap-1.5 font-bold text-white transition-all hover:brightness-110 active:scale-98"
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
                boxShadow: '0 3px 12px rgba(107, 114, 128, 0.3)',
              }}
            >
              ↩️ REATIVAR
            </button>
          ) : (
            <button 
              onClick={onAttend} 
              disabled={isActive}
              className="flex-1 flex items-center justify-center gap-1.5 font-bold text-white disabled:opacity-50 transition-all hover:brightness-110 active:scale-98"
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: isCritical || isLowRetention
                  ? 'linear-gradient(135deg, #FF3B30 0%, #D62D20 100%)'
                  : `linear-gradient(135deg, ${p.color} 0%, ${p.color}cc 100%)`,
                boxShadow: `0 3px 12px ${isCritical || isLowRetention ? '#FF3B30' : p.color}50`,
              }}
            >
              ⚡ {isCritical || isLowRetention ? 'URGENTE' : 'ATENDER'}
            </button>
          )}
          {/* FASE 1: Botão Pular */}
          {onSkip && !isPassive && (
            <button 
              onClick={(e) => { e.stopPropagation(); onSkip(); }}
              className="relative flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: member.skipCount >= 2 
                  ? 'rgba(255, 59, 48, 0.2)' 
                  : 'rgba(147, 51, 234, 0.15)',
                border: `1px solid ${member.skipCount >= 2 ? 'rgba(255, 59, 48, 0.4)' : 'rgba(147, 51, 234, 0.3)'}`,
                fontSize: '16px',
              }}
              title={`Pular atendimento${member.skipCount > 0 ? ` (já pulado ${member.skipCount}x)` : ''}`}
            >
              ⏭️
              {/* Badge de skip count */}
              {member.skipCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 flex items-center justify-center font-bold text-white"
                  style={{
                    width: '16px',
                    height: '16px',
                    fontSize: '9px',
                    borderRadius: '50%',
                    background: member.skipCount >= 2 
                      ? 'linear-gradient(135deg, #FF3B30 0%, #D62D20 100%)' 
                      : 'linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  {member.skipCount}
                </span>
              )}
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onCheckout(); }}
            className="flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(255, 204, 0, 0.15)',
              border: '1px solid rgba(255, 204, 0, 0.3)',
              fontSize: '16px',
            }}
            title="Checkout - Aluno saindo"
          >
            👋
          </button>
        </div>
      </div>
      
      {isActive && (
        <div className="absolute inset-0 bg-[#30D158]/10 flex items-center justify-center">
          <span className="px-4 py-2 rounded-full bg-[#30D158] text-sm font-bold">ATENDENDO</span>
        </div>
      )}
    </motion.div>
  );
});
MemberCard.displayName = 'MemberCard';

// ============================================================================
// FINISHED MEMBER CARD - Card para alunos que já saíram (escurecido)
// ============================================================================

function FinishedMemberCard({ 
  member, 
  onRestore 
}: { 
  member: QueueMember & { finishedAt: Date; reason: string };
  onRestore: () => void;
}) {
  const timeInGym = calcTimeInGym(member.checkInTime);
  const finishedAgo = Math.floor((Date.now() - member.finishedAt.getTime()) / (1000 * 60));
  const finishedLabel = finishedAgo < 60 
    ? `${finishedAgo}min atrás` 
    : `${Math.floor(finishedAgo / 60)}h atrás`;
  
  const reasonLabels: Record<string, string> = {
    finished: '✅ Treino completo',
    left: '🚶 Saiu mais cedo',
    emergency: '🚨 Emergência',
    other: '📝 Outro motivo',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative flex overflow-hidden"
      style={{ 
        background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        minHeight: '140px',
        height: 'auto',
        width: '100%',
        opacity: 0.6,
        filter: 'grayscale(40%)',
      }}
    >
      {/* Barra lateral cinza */}
      <div 
        className="relative flex flex-col"
        style={{ width: '6px', flexShrink: 0, background: '#666' }}
      />
      
      {/* CONTEÚDO */}
      <div className="flex-1 flex flex-col p-3" style={{ minWidth: 0 }}>
        {/* HEADER */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div 
              className="flex items-center justify-center font-bold text-white overflow-hidden shrink-0"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#666',
                fontSize: '11px',
              }}
            >
              {member.photoUrl ? (
                <img 
                  src={member.photoUrl} 
                  alt={member.name}
                  className="w-full h-full object-cover"
                  style={{ filter: 'grayscale(50%)' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = member.name.split(' ').map(n => n[0]).slice(0, 2).join('');
                  }}
                />
              ) : (
                member.name.split(' ').map(n => n[0]).slice(0, 2).join('')
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span 
                className="font-bold text-sm text-white/70 block truncate"
                title={member.name}
              >
                {member.name.split(' ').slice(0, 2).join(' ')}
              </span>
              <p className="text-[10px] text-white/40 truncate">{reasonLabels[member.reason] || member.reason}</p>
            </div>
          </div>
          <span className="text-[10px] text-white/30 shrink-0">{finishedLabel}</span>
        </div>
        
        {/* INFO */}
        <div className="flex items-center gap-3 text-xs text-white/40 mb-3">
          <span className="flex items-center gap-1">🏋️ {timeInGym} total</span>
          <span className="flex items-center gap-1">📅 {member.daysAsMember}d</span>
        </div>
        
        {/* BOTÃO RESTAURAR */}
        <button
          onClick={onRestore}
          className="mt-auto flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all hover:bg-white/20 hover:scale-[1.02]"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          ↩️ Retornar à Fila
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// DAILY STATS CHART - Gráfico de estatísticas por cor
// ============================================================================

function DailyStatsChart({ queue }: { queue: QueueMember[] }) {
  // Calcular estatísticas por cor
  const statsByColor = useMemo(() => {
    const stats: Record<string, { count: number; totalRetention: number; color: string; label: string }> = {
      RED: { count: 0, totalRetention: 0, color: '#FF3B30', label: 'Vermelho' },
      ORANGE: { count: 0, totalRetention: 0, color: '#FF9500', label: 'Laranja' },
      YELLOW: { count: 0, totalRetention: 0, color: '#FFCC00', label: 'Amarelo' },
      GREEN: { count: 0, totalRetention: 0, color: '#30D158', label: 'Verde' },
      BLUE: { count: 0, totalRetention: 0, color: '#007AFF', label: 'Azul' },
    };
    
    queue.forEach(member => {
      const priority = member.priority || 'GREEN';
      if (stats[priority]) {
        stats[priority].count++;
        stats[priority].totalRetention += member.retentionScore ?? 0;
      }
    });
    
    return stats;
  }, [queue]);
  
  const totalMembers = queue.length;
  const maxCount = Math.max(...Object.values(statsByColor).map(s => s.count), 1);
  
  return (
    <div className="space-y-2">
      {Object.entries(statsByColor).map(([key, stat]) => {
        if (stat.count === 0) return null;
        const avgRetention = Math.round(stat.totalRetention / stat.count);
        const barWidth = (stat.count / maxCount) * 100;
        
        return (
          <div key={key} className="flex items-center gap-2">
            {/* Barra de cor */}
            <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden relative">
              <div 
                className="h-full rounded transition-all duration-500"
                style={{ 
                  width: `${barWidth}%`, 
                  background: `linear-gradient(90deg, ${stat.color} 0%, ${stat.color}99 100%)` 
                }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-2">
                <span className="text-[10px] font-bold text-white drop-shadow-lg">{stat.count}</span>
                <span className="text-[9px] text-white/80 drop-shadow-lg">{avgRetention}% ret.</span>
              </div>
            </div>
            {/* Indicador de cor */}
            <div 
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: stat.color }}
            />
          </div>
        );
      })}
      
      {/* Total */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <span className="text-[10px] text-white/50">Total na academia:</span>
        <span className="text-sm font-bold">{totalMembers}</span>
      </div>
      
      {/* Média geral */}
      {totalMembers > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/50">Retenção média:</span>
          <span 
            className="text-sm font-bold"
            style={{ 
              color: (queue.reduce((acc, m) => acc + (m.retentionScore ?? 0), 0) / totalMembers) >= 50 
                ? '#30D158' 
                : '#FF3B30' 
            }}
          >
            {Math.round(queue.reduce((acc, m) => acc + (m.retentionScore ?? 0), 0) / totalMembers)}%
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODALS
// ============================================================================

function CheckoutModal({ member, onClose, onConfirm }: { member: QueueMember; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  console.log('🔵 CheckoutModal renderizado para:', member?.name);
  
  const handleConfirm = async () => {
    if (!selectedReason) {
      console.log('⚠️ Nenhum motivo selecionado');
      return;
    }
    
    console.log('🟢 handleConfirm chamado:', { memberName: member.name, reason: selectedReason });
    setIsSubmitting(true);
    
    try {
      await onConfirm(selectedReason);
    } catch (error) {
      console.error('❌ Erro no handleConfirm:', error);
    }
    
    setIsSubmitting(false);
  };
  
  const handleSelectReason = (reasonId: string) => {
    console.log('🔘 Motivo selecionado:', reasonId);
    setSelectedReason(reasonId);
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95 }} 
        animate={{ scale: 1 }} 
        exit={{ scale: 0.95 }} 
        className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-white/10" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFCC00]/20 flex items-center justify-center text-xl">
              👋
            </div>
            <div>
              <p className="font-bold">Liberar Aluno</p>
              <p className="text-sm text-white/40">{member.name}</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-white/60 mb-3">Selecione o motivo:</p>
          {CHECKOUT_REASONS.map((reason) => (
            <button 
              key={reason.id} 
              onClick={() => handleSelectReason(reason.id)} 
              disabled={isSubmitting}
              className={`w-full p-4 rounded-xl text-left font-medium flex items-center gap-3 transition-all ${
                selectedReason === reason.id ? 'ring-2 ring-white/50 scale-[1.02]' : 'hover:scale-[1.01]'
              } ${isSubmitting ? 'opacity-50' : ''}`}
              style={{ 
                backgroundColor: selectedReason === reason.id ? `${reason.color}30` : `${reason.color}15`, 
                border: `1px solid ${selectedReason === reason.id ? reason.color : `${reason.color}30`}`,
              }}
            >
              <span className="text-2xl">{reason.emoji}</span>
              <div className="flex-1">
                <p className="font-bold" style={{ color: reason.color }}>{reason.label}</p>
                <p className="text-xs text-white/40">{reason.description}</p>
              </div>
              {selectedReason === reason.id && (
                <span className="text-green-400 text-xl">✓</span>
              )}
            </button>
          ))}
        </div>
        <div className="p-4 pt-2 flex gap-3">
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!selectedReason || isSubmitting}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              selectedReason && !isSubmitting
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-white/10 text-white/20 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '⏳ Processando...' : '✓ Confirmar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, situation: string) => void }) {
  const [name, setName] = useState('');
  const [situation, setSituation] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const situations = [
    { id: 'first', label: '1º Treino', icon: '🆕', color: '#FF3B30' },
    { id: 'new_program', label: 'Nova Ficha', icon: '📋', color: '#FF9500' },
    { id: 'returning', label: 'Retorno', icon: '🔄', color: '#FFCC00' },
    { id: 'regular', label: 'Regular', icon: '✓', color: '#30D158' },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <p className="font-bold">Adicionar Aluno</p>
          <button onClick={onClose} className="text-white/30 hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <input ref={inputRef} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do aluno..." className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-sm" />
          <div className="grid grid-cols-2 gap-2">
            {situations.map(s => (
              <button key={s.id} onClick={() => setSituation(s.id)} className={`p-3 rounded-lg border-2 text-left ${situation === s.id ? '' : 'border-transparent bg-white/5'}`} style={{ borderColor: situation === s.id ? s.color : 'transparent', backgroundColor: situation === s.id ? `${s.color}15` : undefined }}>
                <span className="text-lg">{s.icon}</span>
                <p className="font-bold text-xs mt-1">{s.label}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 pt-0 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 bg-white/5 rounded-lg text-white/40">Cancelar</button>
          <button onClick={() => name && situation && onAdd(name, situation)} disabled={!name || !situation} className={`flex-[2] py-2 rounded-lg font-bold ${name && situation ? 'bg-[#FF3B30]' : 'bg-white/5 text-white/20'}`}>Adicionar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MODAL DE VISUALIZAÇÃO DE DETALHES (SEM ATENDIMENTO)
// ============================================================================

function MemberDetailsModal({ 
  member, 
  coach,
  onClose,
  onAttend,
  onNotify,
  onCheckout,
}: { 
  member: QueueMember; 
  coach: { id: string; name: string };
  onClose: () => void;
  onAttend: () => void;
  onNotify: () => void;
  onCheckout: () => void;
}) {
  const p = PRIORITY_CONFIG[member.priority] || PRIORITY_CONFIG.YELLOW;
  const timeInGym = calcTimeInGym(member.checkInTime);
  const retentionScore = member.retentionScore ?? 0; // Sem dados = 0%, não 50%!
  const isLowRetention = retentionScore < 50;

  const getTankColor = () => {
    if (retentionScore >= 75) return '#30D158';
    if (retentionScore >= 50) return '#FFCC00';
    if (retentionScore >= 25) return '#FF9500';
    return '#FF3B30';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95 }} 
        animate={{ scale: 1 }} 
        exit={{ scale: 0.95 }} 
        className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-white/10 max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header com Foto em Destaque */}
        <div 
          className="relative border-b border-white/5"
          style={{ background: `linear-gradient(135deg, ${p.color}20 0%, transparent 100%)` }}
        >
          {/* Botão fechar */}
          <button 
            onClick={onClose} 
            className="absolute top-3 right-3 p-2 hover:bg-white/10 rounded-full z-10 bg-black/30"
          >
            ✕
          </button>
          
          {/* Foto Grande em Destaque */}
          <div className="flex flex-col items-center pt-6 pb-4">
            {/* Foto ou Iniciais */}
            <div 
              className="rounded-2xl flex items-center justify-center text-5xl font-bold text-white overflow-hidden mb-4"
              style={{ 
                width: '180px',
                height: '180px',
                background: `linear-gradient(135deg, ${p.color} 0%, ${p.color}cc 100%)`,
                border: isLowRetention ? '4px solid #FF3B30' : `3px solid ${p.color}`,
                boxShadow: isLowRetention 
                  ? '0 10px 40px rgba(255,59,48,0.5)'
                  : `0 10px 40px ${p.color}40`,
              }}
            >
              {member.photoUrl ? (
                <img 
                  src={member.photoUrl} 
                  alt={member.name}
                  className="w-full h-full object-cover"
                  style={{ 
                    imageRendering: 'auto',
                    filter: 'contrast(1.02)',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = member.name.split(' ').map(n => n[0]).slice(0, 2).join('');
                  }}
                />
              ) : (
                member.name.split(' ').map(n => n[0]).slice(0, 2).join('')
              )}
            </div>
            
            {/* Nome */}
            <h2 className="text-xl font-bold text-center px-4">{member.name}</h2>
            
            {/* Info básica */}
            <div className="flex items-center gap-3 text-sm text-white/60 mt-1">
              <span>🏋️ {timeInGym} na academia</span>
              <span>📅 {member.daysAsMember} dias</span>
            </div>
            
            {isLowRetention && (
              <div className="mt-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                ⚠️ RISCO DE DESISTÊNCIA
              </div>
            )}
          </div>
          
          {/* Tanque de Retenção - Posicionado no canto */}
          <div className="absolute top-3 left-3 flex flex-col items-center">
            <div 
              className="w-10 h-16 bg-black/50 rounded-lg flex flex-col justify-end overflow-hidden"
              style={{ border: `2px solid ${getTankColor()}40` }}
            >
              <div 
                style={{ 
                  height: `${retentionScore}%`, 
                  background: `linear-gradient(0deg, ${getTankColor()} 0%, ${getTankColor()}99 100%)`,
                  borderRadius: '0 0 4px 4px',
                }} 
              />
            </div>
            <span className="text-xs font-bold mt-1" style={{ color: getTankColor() }}>{retentionScore}%</span>
          </div>
        </div>

        {/* Informações detalhadas */}
        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Prioridade</p>
              <p className="font-bold text-lg" style={{ color: p.color }}>{p.label}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Fase</p>
              <p className="font-bold text-lg">{getPhaseLabel(member.daysAsMember)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-white/40 text-xs mb-1">Treino</p>
              <p className="font-bold text-lg">{member.workoutLetter || '-'}</p>
            </div>
          </div>

          {/* Ficha e Avaliação */}
          <div className="grid grid-cols-2 gap-3">
            <div 
              className="rounded-xl p-3"
              style={{ 
                background: member.hasFicha && !member.fichaVencida ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                border: `1px solid ${member.hasFicha && !member.fichaVencida ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 59, 48, 0.3)'}`,
              }}
            >
              <p className="text-white/40 text-xs mb-1">📋 Ficha de Treino</p>
              <p className="font-bold" style={{ color: member.hasFicha && !member.fichaVencida ? '#30D158' : '#FF3B30' }}>
                {!member.hasFicha ? '❌ SEM FICHA' : member.fichaVencida ? '⚠️ VENCIDA' : '✓ OK'}
              </p>
              {member.workoutName && <p className="text-xs text-white/50 mt-1">{member.workoutName}</p>}
            </div>
            <div 
              className="rounded-xl p-3"
              style={{ 
                background: member.hasAvaliacao && !member.avaliacaoVencida ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                border: `1px solid ${member.hasAvaliacao && !member.avaliacaoVencida ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 59, 48, 0.3)'}`,
              }}
            >
              <p className="text-white/40 text-xs mb-1">📊 Avaliação Física</p>
              <p className="font-bold" style={{ color: member.hasAvaliacao && !member.avaliacaoVencida ? '#30D158' : '#FF3B30' }}>
                {!member.hasAvaliacao ? '❌ SEM AVAL.' : member.avaliacaoVencida ? '⚠️ VENCIDA' : '✓ OK'}
              </p>
            </div>
          </div>

          {/* Frequência */}
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-white/40 text-xs mb-2">📈 Frequência Semanal (esperado: {member.freqEsperada || 5}x)</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-white/50">{member.freq15_21 || 0}x</p>
                <p className="text-[10px] text-white/40">2 sem atrás</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${(member.freq08_14 || 0) < (member.freq15_21 || 0) ? 'text-orange-400' : 'text-white/60'}`}>
                  {member.freq08_14 || 0}x
                </p>
                <p className="text-[10px] text-white/40">Sem passada</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${
                  (member.freqAtual || 0) >= (member.freqEsperada || 5) ? 'text-green-400' : 
                  (member.freqAtual || 0) > 0 ? 'text-blue-400' : 'text-white/30'
                }`}>
                  {member.freqAtual || 0}x
                </p>
                <p className="text-[10px] text-white/40">Esta semana</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {member.tags && member.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {member.tags.map((tag, i) => (
                <span 
                  key={i}
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    background: tag.includes('SEM') || tag.includes('VENCID') ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.1)',
                    color: tag.includes('SEM') || tag.includes('VENCID') ? '#FF6B6B' : '#fff',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="p-4 border-t border-white/5 space-y-3">
          {/* Botão principal - Iniciar Atendimento */}
          <button
            onClick={onAttend}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
            style={{ 
              background: `linear-gradient(135deg, ${p.color} 0%, ${p.color}cc 100%)`,
              boxShadow: `0 4px 15px ${p.color}40`,
            }}
          >
            ⚡ INICIAR ATENDIMENTO
          </button>
          
          {/* Ações secundárias */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onNotify}
              className="py-2.5 rounded-xl font-medium text-purple-400 bg-purple-500/10 border border-purple-500/30 flex items-center justify-center gap-2 hover:bg-purple-500/20 transition-all"
            >
              📢 Notificar
            </button>
            <button
              onClick={onCheckout}
              className="py-2.5 rounded-xl font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center gap-2 hover:bg-yellow-500/20 transition-all"
            >
              👋 Checkout
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MODAL DE NOTIFICAÇÃO À COORDENAÇÃO
// ============================================================================

function NotifyCoordinationModal({ 
  member, 
  coach,
  onClose, 
  onSuccess 
}: { 
  member: QueueMember; 
  coach: { id: string; name: string };
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [selectedType, setSelectedType] = useState('');
  const [observation, setObservation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calcular score de retenção
  const retentionScore = useMemo(() => {
    const weights = { frequency: 0.5, ficha: 0.25, avaliacao: 0.25 };
    const frequencyScore = 50; // Placeholder - calcular baseado em freq real
    const fichaScore = member.hasFicha && !member.fichaVencida ? 100 : member.fichaVencida ? 50 : 0;
    const avaliacaoScore = member.hasAvaliacao && !member.avaliacaoVencida ? 100 : member.avaliacaoVencida ? 50 : 0;
    return Math.round(frequencyScore * weights.frequency + fichaScore * weights.ficha + avaliacaoScore * weights.avaliacao);
  }, [member]);

  // Criar snapshot do membro
  const createMemberSnapshot = () => ({
    evoMemberId: member.evoMemberId, // ID EVO para ações na supervisão
    daysAsMember: member.daysAsMember,
    phase: getPhaseLabel(member.daysAsMember),
    retentionScore,
    hasFicha: member.hasFicha,
    fichaVencida: member.fichaVencida,
    hasAvaliacao: member.hasAvaliacao,
    avaliacaoVencida: member.avaliacaoVencida,
    totalWorkouts: member.sessionsDone || 0,
    completionRate: member.sessionsTotal ? Math.round((member.sessionsDone / member.sessionsTotal) * 100) : 0,
    checkInTime: member.checkInTime,
    priority: member.priority,
    tags: member.tags,
    workoutId: member.workoutId,
    workoutName: member.workoutName,
    workoutLetter: member.workoutLetter,
  });

  const handleSubmit = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);

    const urgency = calculateUrgency({
      retentionScore,
      daysAsMember: member.daysAsMember,
      hasFicha: member.hasFicha,
      fichaVencida: member.fichaVencida,
      hasAvaliacao: member.hasAvaliacao,
      requestType: selectedType,
    });

    const result = await createCoordinationRequest({
      coachId: coach.id,
      coachName: coach.name,
      memberName: member.name,
      memberEvoId: member.evoMemberId || undefined, // Passar o ID EVO do membro
      queueId: member.id,
      requestType: selectedType,
      observation: observation || undefined,
      memberSnapshot: createMemberSnapshot(),
      urgency,
    });

    // Se for notificação de Personal ou Consultoria Externa, mover para área de Personal/Autônomo
    // O card ficará na seção separada com visual diferenciado (BLACK = cinza escuro)
    if (result && (selectedType === 'PERSONAL_TRAINER' || selectedType === 'EXTERNAL_CONSULTING')) {
      await markAsPersonal(member.id, selectedType === 'PERSONAL_TRAINER');
    }

    if (result) {
      onSuccess();
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95 }} 
        animate={{ scale: 1 }} 
        exit={{ scale: 0.95 }} 
        className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 max-h-[90vh] overflow-y-auto" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-xl">
              📢
            </div>
            <div>
              <p className="font-bold">Notificar Coordenação</p>
              <p className="text-sm text-white/40">{member.name}</p>
            </div>
          </div>
        </div>

        {/* Resumo do aluno */}
        <div className="p-4 bg-white/5 mx-4 mt-4 rounded-xl">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-white/40 text-xs">Dias</p>
              <p className="font-bold">{member.daysAsMember}</p>
            </div>
            <div>
              <p className="text-white/40 text-xs">Retenção</p>
              <p className="font-bold" style={{ color: retentionScore < 50 ? '#FF3B30' : retentionScore < 70 ? '#FF9500' : '#30D158' }}>
                {retentionScore}%
              </p>
            </div>
            <div>
              <p className="text-white/40 text-xs">Fase</p>
              <p className="font-bold text-xs">{getPhaseLabel(member.daysAsMember)}</p>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs">
            <span className={member.hasFicha && !member.fichaVencida ? 'text-green-400' : 'text-red-400'}>
              {member.hasFicha ? (member.fichaVencida ? '⚠️ Ficha vencida' : '✅ Ficha OK') : '❌ Sem ficha'}
            </span>
            <span className={member.hasAvaliacao && !member.avaliacaoVencida ? 'text-green-400' : 'text-red-400'}>
              {member.hasAvaliacao ? (member.avaliacaoVencida ? '⚠️ Aval. vencida' : '✅ Aval. OK') : '❌ Sem aval.'}
            </span>
          </div>
        </div>

        {/* Tipo de solicitação */}
        <div className="p-4">
          <p className="text-sm text-white/60 mb-3">O que precisa ser revisto?</p>
          <div className="space-y-2">
            {COORDINATION_REQUEST_TYPES.map((type) => (
              <button 
                key={type.id} 
                onClick={() => setSelectedType(type.id)} 
                className={`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all ${
                  selectedType === type.id ? 'ring-2 ring-white/30' : 'hover:bg-white/10'
                }`}
                style={{ 
                  backgroundColor: `${type.color}15`,
                  border: `1px solid ${type.color}30`,
                }}
              >
                <span className="text-2xl">{type.icon}</span>
                <div className="flex-1">
                  <p className="font-medium" style={{ color: type.color }}>{type.label}</p>
                  <p className="text-xs text-white/40">{type.description}</p>
                </div>
                {selectedType === type.id && (
                  <span className="text-green-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Observação */}
        <div className="px-4 pb-4">
          <p className="text-sm text-white/60 mb-2">Observação (opcional)</p>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Informações adicionais para a coordenação..."
            rows={2}
            className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-sm resize-none"
          />
        </div>

        {/* Botões */}
        <div className="p-4 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedType || isSubmitting}
            className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
          >
            {isSubmitting ? 'Enviando...' : '📤 Enviar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// FASE 1: SKIP MODAL - Modal para pular atendimento
// ============================================================================

const SKIP_REASONS = [
  { id: 'bathroom', label: 'No banheiro', emoji: '🚽' },
  { id: 'phone', label: 'Ao telefone', emoji: '📞' },
  { id: 'busy', label: 'Ocupado com exercício', emoji: '🏋️' },
  { id: 'not_found', label: 'Não encontrado', emoji: '👀' },
  { id: 'talking', label: 'Conversando', emoji: '💬' },
  { id: 'other', label: 'Outro motivo', emoji: '📝' },
];

function SkipModal({
  member,
  onClose,
  onConfirm,
  isLoading,
}: {
  member: QueueMember;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  isLoading: boolean;
}) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  
  const p = PRIORITY_CONFIG[member.priority] || PRIORITY_CONFIG.YELLOW;
  const skipCount = member.skipCount || 0;
  
  // Determinar consequência do próximo pulo
  const getSkipConsequence = () => {
    if (skipCount === 0) {
      return { text: 'Vai para 2ª posição da mesma cor', type: 'normal' };
    } else if (skipCount === 1) {
      return { text: 'Vai para última posição da mesma cor', type: 'warning' };
    } else {
      return { text: 'Vai para o FIM da fila + Notifica Supervisor', type: 'critical' };
    }
  };
  
  const consequence = getSkipConsequence();
  
  const handleConfirm = () => {
    const reason = selectedReason === 'other' ? customReason : SKIP_REASONS.find(r => r.id === selectedReason)?.label;
    onConfirm(reason || undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-4 border-b border-white/5"
          style={{ background: `linear-gradient(135deg, ${p.color}20 0%, transparent 100%)` }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `${p.color}30` }}
            >
              ⏭️
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">Pular Atendimento</h2>
              <p className="text-sm text-white/60">{member.name}</p>
            </div>
            {skipCount > 0 && (
              <div 
                className="px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{ 
                  background: skipCount >= 2 ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 149, 0, 0.2)',
                  color: skipCount >= 2 ? '#FF6B6B' : '#FFB347',
                }}
              >
                Já pulado {skipCount}x
              </div>
            )}
          </div>
        </div>

        {/* Alerta de consequência */}
        <div 
          className="mx-4 mt-4 p-3 rounded-xl border"
          style={{
            background: consequence.type === 'critical' 
              ? 'rgba(255, 59, 48, 0.1)' 
              : consequence.type === 'warning' 
                ? 'rgba(255, 149, 0, 0.1)' 
                : 'rgba(147, 51, 234, 0.1)',
            borderColor: consequence.type === 'critical' 
              ? 'rgba(255, 59, 48, 0.3)' 
              : consequence.type === 'warning' 
                ? 'rgba(255, 149, 0, 0.3)' 
                : 'rgba(147, 51, 234, 0.3)',
          }}
        >
          <p 
            className="text-sm font-medium text-center"
            style={{
              color: consequence.type === 'critical' 
                ? '#FF6B6B' 
                : consequence.type === 'warning' 
                  ? '#FFB347' 
                  : '#A78BFA',
            }}
          >
            {consequence.type === 'critical' ? '⚠️ ' : consequence.type === 'warning' ? '⏳ ' : '📍 '}
            {consequence.text}
          </p>
        </div>

        {/* Motivos */}
        <div className="p-4">
          <p className="text-sm text-white/60 mb-3">Por que está pulando? (opcional)</p>
          <div className="grid grid-cols-2 gap-2">
            {SKIP_REASONS.map((reason) => (
              <button
                key={reason.id}
                onClick={() => setSelectedReason(reason.id)}
                className={`p-3 rounded-xl text-left flex items-center gap-2 transition-all ${
                  selectedReason === reason.id 
                    ? 'ring-2 ring-purple-500/50 bg-purple-500/10' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-lg">{reason.emoji}</span>
                <span className="text-sm">{reason.label}</span>
              </button>
            ))}
          </div>
          
          {selectedReason === 'other' && (
            <input
              type="text"
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="Descreva o motivo..."
              className="w-full mt-3 p-3 bg-white/5 border border-white/10 rounded-xl text-sm"
              autoFocus
            />
          )}
        </div>

        {/* Botões */}
        <div className="p-4 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: consequence.type === 'critical' 
                ? 'linear-gradient(135deg, #FF3B30 0%, #D62D20 100%)'
                : 'linear-gradient(135deg, #9333EA 0%, #7C3AED 100%)',
            }}
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Pulando...
              </>
            ) : (
              <>
                ⏭️ Pular
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
