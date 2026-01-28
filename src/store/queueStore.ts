// src/store/queueStore.ts
// ============================================================================
// STORE GLOBAL - ZUSTAND
// Gerencia estado da fila de atendimento em tempo real
// ============================================================================

import { create } from 'zustand';
import { 
  QueueMember, 
  AttendanceRecord, 
  AttendancePriority,
  MemberStatus,
  sortQueueMembers,
  PRIORITY_CONFIGS,
} from '@/types';

// ============================================================================
// TIPOS DO STORE
// ============================================================================

interface Alert {
  id: string;
  type: 'NEW_ARRIVAL' | 'HELP_REQUESTED' | 'LONG_WAIT' | 'IDLE';
  memberId: string;
  memberName: string;
  priority: AttendancePriority;
  message: string;
  timestamp: string;
  dismissed: boolean;
}

interface QueueState {
  // Dados
  queue: QueueMember[];
  alerts: Alert[];
  currentAttendance: {
    record: AttendanceRecord;
    member: QueueMember;
    startTime: Date;
  } | null;
  
  // UI
  selectedMemberId: string | null;
  showAlertPopup: Alert | null;
  
  // Coach
  coachId: string;
  coachName: string;
  
  // Stats
  stats: {
    totalInGym: number;
    attendancesToday: number;
    byPriority: Record<AttendancePriority, number>;
  };
  
  // Ações
  setQueue: (queue: QueueMember[]) => void;
  addToQueue: (member: QueueMember) => void;
  removeFromQueue: (userId: string) => void;
  updateMember: (userId: string, updates: Partial<QueueMember>) => void;
  
  selectMember: (memberId: string | null) => void;
  
  startAttendance: (member: QueueMember) => void;
  endAttendance: (result: string, notes?: string) => void;
  
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissAlert: (alertId: string) => void;
  setAlertPopup: (alert: Alert | null) => void;
  
  requestHelp: (userId: string) => void;
  
  setCoach: (id: string, name: string) => void;
  
  calculateStats: () => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useQueueStore = create<QueueState>((set, get) => ({
  // Estado inicial
  queue: [],
  alerts: [],
  currentAttendance: null,
  selectedMemberId: null,
  showAlertPopup: null,
  coachId: '',
  coachName: '',
  stats: {
    totalInGym: 0,
    attendancesToday: 0,
    byPriority: {
      [AttendancePriority.RED]: 0,
      [AttendancePriority.ORANGE]: 0,
      [AttendancePriority.YELLOW]: 0,
      [AttendancePriority.BLUE]: 0,
      [AttendancePriority.GREEN]: 0,
      [AttendancePriority.BLACK]: 0,
    },
  },
  
  // Ações
  setQueue: (queue) => {
    set({ queue: sortQueueMembers(queue) });
    get().calculateStats();
  },
  
  addToQueue: (member) => {
    const { queue, addAlert } = get();
    
    // Verificar se já existe
    const exists = queue.find(m => m.odrinUserId === member.odrinUserId);
    if (exists) {
      // Atualizar
      get().updateMember(member.odrinUserId, member);
      return;
    }
    
    // Adicionar
    set({ queue: sortQueueMembers([...queue, member]) });
    get().calculateStats();
    
    // Gerar alerta se prioridade alta
    if (member.priority === AttendancePriority.RED || member.priority === AttendancePriority.ORANGE) {
      const config = PRIORITY_CONFIGS[member.priority];
      let message = `${member.name} chegou`;
      
      if (member.isFirstVisit) {
        message = `🆕 ${member.name} - PRIMEIRO TREINO!`;
      } else if (member.hasNewProgram) {
        message = `📋 ${member.name} - Nova ficha!`;
      } else if (member.metrics.daysSinceLastWorkout >= 30) {
        message = `🔙 ${member.name} voltou após ${member.metrics.daysSinceLastWorkout} dias`;
      }
      
      addAlert({
        type: 'NEW_ARRIVAL',
        memberId: member.odrinUserId,
        memberName: member.name,
        priority: member.priority,
        message,
      });
    }
  },
  
  removeFromQueue: (userId) => {
    set(state => ({
      queue: state.queue.filter(m => m.odrinUserId !== userId),
    }));
    get().calculateStats();
  },
  
  updateMember: (userId, updates) => {
    set(state => ({
      queue: sortQueueMembers(
        state.queue.map(m => 
          m.odrinUserId === userId ? { ...m, ...updates } : m
        )
      ),
    }));
    get().calculateStats();
  },
  
  selectMember: (memberId) => {
    set({ selectedMemberId: memberId });
  },
  
  startAttendance: (member) => {
    const { coachId, coachName } = get();
    
    const record: AttendanceRecord = {
      id: `att_${Date.now()}`,
      memberId: member.odrinUserId,
      memberName: member.name,
      coachId,
      coachName,
      startTime: new Date().toISOString(),
      memberPriority: member.priority,
      triggerType: member.helpRequested ? 'REQUESTED' : 'PROACTIVE',
      exerciseContext: member.currentWorkout?.currentExerciseName,
      waitTimeSeconds: member.waitingSinceTime 
        ? Math.floor((Date.now() - new Date(member.waitingSinceTime).getTime()) / 1000)
        : 0,
    };
    
    set({
      currentAttendance: {
        record,
        member,
        startTime: new Date(),
      },
      selectedMemberId: null,
      showAlertPopup: null,
    });
    
    // Atualizar status do membro
    get().updateMember(member.odrinUserId, {
      status: MemberStatus.BEING_ATTENDED,
      helpRequested: false,
    });
    
    // Dismissar alertas do membro
    set(state => ({
      alerts: state.alerts.map(a => 
        a.memberId === member.odrinUserId ? { ...a, dismissed: true } : a
      ),
    }));
  },
  
  endAttendance: (result, notes) => {
    const { currentAttendance } = get();
    if (!currentAttendance) return;
    
    // Atualizar membro
    get().updateMember(currentAttendance.member.odrinUserId, {
      status: MemberStatus.TRAINING,
      attendanceCount: currentAttendance.member.attendanceCount + 1,
      lastAttendanceTime: new Date().toISOString(),
    });
    
    // Incrementar stats
    set(state => ({
      currentAttendance: null,
      stats: {
        ...state.stats,
        attendancesToday: state.stats.attendancesToday + 1,
      },
    }));
  },
  
  addAlert: (alertData) => {
    const alert: Alert = {
      ...alertData,
      id: `alert_${Date.now()}`,
      timestamp: new Date().toISOString(),
      dismissed: false,
    };
    
    set(state => ({
      alerts: [alert, ...state.alerts.slice(0, 49)], // Máximo 50 alertas
    }));
    
    // Mostrar popup para alertas urgentes
    if (alertData.type === 'HELP_REQUESTED' || alertData.priority === AttendancePriority.RED) {
      set({ showAlertPopup: alert });
    }
  },
  
  dismissAlert: (alertId) => {
    set(state => ({
      alerts: state.alerts.map(a => 
        a.id === alertId ? { ...a, dismissed: true } : a
      ),
      showAlertPopup: state.showAlertPopup?.id === alertId ? null : state.showAlertPopup,
    }));
  },
  
  setAlertPopup: (alert) => {
    set({ showAlertPopup: alert });
  },
  
  requestHelp: (userId) => {
    const member = get().queue.find(m => m.odrinUserId === userId);
    if (!member) return;
    
    get().updateMember(userId, {
      helpRequested: true,
      status: MemberStatus.WAITING_HELP,
      priority: AttendancePriority.RED,
      waitingSinceTime: new Date().toISOString(),
    });
    
    get().addAlert({
      type: 'HELP_REQUESTED',
      memberId: userId,
      memberName: member.name,
      priority: AttendancePriority.RED,
      message: `🆘 ${member.name} está pedindo ajuda!`,
    });
  },
  
  setCoach: (id, name) => {
    set({ coachId: id, coachName: name });
  },
  
  calculateStats: () => {
    const { queue } = get();
    
    const byPriority: Record<AttendancePriority, number> = {
      [AttendancePriority.RED]: 0,
      [AttendancePriority.ORANGE]: 0,
      [AttendancePriority.YELLOW]: 0,
      [AttendancePriority.BLUE]: 0,
      [AttendancePriority.GREEN]: 0,
      [AttendancePriority.BLACK]: 0,
    };
    
    queue.forEach(m => {
      byPriority[m.priority]++;
    });
    
    set(state => ({
      stats: {
        ...state.stats,
        totalInGym: queue.length,
        byPriority,
      },
    }));
  },
}));
