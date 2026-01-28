// src/types/index.ts
// ============================================================================
// TIPOS DO SISTEMA IRON - COMPARTILHADOS ENTRE APP E DASHBOARD
// ============================================================================

// ============================================================================
// TIPOS SIMPLES
// ============================================================================

export type Priority = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'BLACK';

// ============================================================================
// ENUMS
// ============================================================================

export enum AttendancePriority {
  RED = "RED",           // Prioridade máxima
  ORANGE = "ORANGE",     // Prioridade alta
  YELLOW = "YELLOW",     // Atenção moderada
  BLUE = "BLUE",         // Acompanhamento leve
  GREEN = "GREEN",       // Autônomo
  BLACK = "BLACK",       // VIP/Atleta
}

export enum MemberStatus {
  CHECKED_IN = "CHECKED_IN",
  TRAINING = "TRAINING",
  WAITING_HELP = "WAITING_HELP",
  BEING_ATTENDED = "BEING_ATTENDED",
  IDLE = "IDLE",
  FINISHED = "FINISHED",
  LEFT = "LEFT",
}

export enum CheckInSource {
  APP = "APP",
  WIFI = "WIFI",
  BLE = "BLE",
  CATRACA = "CATRACA",
  MANUAL = "MANUAL",
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  
  // Dados de cadastro
  createdAt: string;
  
  // Métricas
  totalWorkouts: number;
  lastWorkoutAt?: string;
  completionRate: number;
  
  // Programa atual
  currentProgramId?: string;
  currentProgramCreatedAt?: string;
}

export interface QueueMember {
  id: string;
  odrinUserId: string;
  name: string;
  photoUrl?: string;
  
  status: MemberStatus;
  priority: AttendancePriority;
  
  currentWorkout?: {
    id: string;
    name: string;
    letter: string;
    exerciseCount: number;
    currentExerciseIndex: number;
    currentExerciseName?: string;
  };
  
  metrics: {
    daysAsMember: number;
    totalWorkouts: number;
    daysSinceNewProgram: number;
    completionRate: number;
    daysSinceLastWorkout: number;
  };
  
  checkInTime: string;
  lastActivityTime: string;
  waitingSinceTime?: string;
  lastAttendanceTime?: string;
  attendanceCount: number;
  
  helpRequested: boolean;
  isFirstVisit: boolean;
  hasNewProgram: boolean;
  
  // Campos de pulo de atendimento
  skipCount?: number;
  skipHistory?: Array<{
    skipNumber: number;
    skippedAt: string;
    skippedBy: string;
    reason: string;
    newPosition: number;
  }>;
  lastSkippedAt?: string;
  lastSkippedBy?: string;
}

export interface CheckInRequest {
  userId: string;
  gymId: string;
  source: CheckInSource;
  
  // Dados do membro (para criar/atualizar na fila)
  memberData: {
    name: string;
    photoUrl?: string;
    memberSince: string;
    totalWorkouts: number;
    lastWorkoutAt?: string;
    completionRate: number;
    currentProgramCreatedAt?: string;
    currentWorkout?: {
      id: string;
      name: string;
      letter: string;
      exercises: { id: string; name: string }[];
    };
  };
}

export interface CheckInResponse {
  success: boolean;
  queueMember: QueueMember;
  position: number;
  message: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  coachId: string;
  coachName: string;
  
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  
  memberPriority: AttendancePriority;
  triggerType: "AUTOMATIC" | "REQUESTED" | "PROACTIVE";
  exerciseContext?: string;
  
  result?: "COMPLETED" | "PARTIAL" | "RESCHEDULED" | "NOT_NEEDED" | "MEMBER_LEFT";
  notes?: string;
  waitTimeSeconds: number;
}

export interface Coach {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  isActive: boolean;
}

export interface Gym {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  
  settings: {
    alertIntervals: Record<AttendancePriority, number>;
    maxWaitTimes: Record<AttendancePriority, number>;
    idleThresholdMinutes: number;
    enableSounds: boolean;
  };
}

// ============================================================================
// CONFIGURAÇÕES DE PRIORIDADE
// ============================================================================

export interface PriorityConfig {
  priority: AttendancePriority;
  color: string;
  bgColor: string;
  label: string;
  shortLabel: string;
  description: string;
  alertIntervalMinutes: number;
  maxWaitMinutes: number;
  icon: string;
}

export const PRIORITY_CONFIGS: Record<AttendancePriority, PriorityConfig> = {
  [AttendancePriority.RED]: {
    priority: AttendancePriority.RED,
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.15)",
    label: "PRIORIDADE MÁXIMA",
    shortLabel: "MÁXIMA",
    description: "Primeira semana ou nova ficha",
    alertIntervalMinutes: 5,
    maxWaitMinutes: 10,
    icon: "AlertCircle",
  },
  [AttendancePriority.ORANGE]: {
    priority: AttendancePriority.ORANGE,
    color: "#F97316",
    bgColor: "rgba(249, 115, 22, 0.15)",
    label: "PRIORIDADE ALTA",
    shortLabel: "ALTA",
    description: "Semanas 2-4, consolidando",
    alertIntervalMinutes: 10,
    maxWaitMinutes: 15,
    icon: "AlertTriangle",
  },
  [AttendancePriority.YELLOW]: {
    priority: AttendancePriority.YELLOW,
    color: "#EAB308",
    bgColor: "rgba(234, 179, 8, 0.15)",
    label: "ATENÇÃO MODERADA",
    shortLabel: "MODERADA",
    description: "Segundo mês, estabilizando",
    alertIntervalMinutes: 20,
    maxWaitMinutes: 25,
    icon: "Eye",
  },
  [AttendancePriority.BLUE]: {
    priority: AttendancePriority.BLUE,
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.15)",
    label: "ACOMPANHAMENTO LEVE",
    shortLabel: "LEVE",
    description: "Terceiro mês, ganhando autonomia",
    alertIntervalMinutes: 0,
    maxWaitMinutes: 30,
    icon: "UserCheck",
  },
  [AttendancePriority.GREEN]: {
    priority: AttendancePriority.GREEN,
    color: "#22C55E",
    bgColor: "rgba(34, 197, 94, 0.15)",
    label: "AUTÔNOMO",
    shortLabel: "AUTÔNOMO",
    description: "3+ meses consistentes",
    alertIntervalMinutes: 0,
    maxWaitMinutes: 0,
    icon: "CheckCircle",
  },
  [AttendancePriority.BLACK]: {
    priority: AttendancePriority.BLACK,
    color: "#6B7280",
    bgColor: "rgba(107, 114, 128, 0.15)",
    label: "VIP / ATLETA",
    shortLabel: "VIP",
    description: "6+ meses, pode ser embaixador",
    alertIntervalMinutes: 0,
    maxWaitMinutes: 0,
    icon: "Star",
  },
};

// ============================================================================
// HELPERS
// ============================================================================

export function calculatePriority(metrics: {
  daysAsMember: number;
  totalWorkouts: number;
  daysSinceNewProgram: number;
  completionRate: number;
  daysSinceLastWorkout: number;
  helpRequested?: boolean;
}): AttendancePriority {
  // Solicitou ajuda = VERMELHO
  if (metrics.helpRequested) return AttendancePriority.RED;
  
  // Primeira semana
  if (metrics.daysAsMember <= 7) return AttendancePriority.RED;
  
  // Nova ficha (primeira semana)
  if (metrics.daysSinceNewProgram <= 7) return AttendancePriority.RED;
  
  // Voltou após 30+ dias
  if (metrics.daysSinceLastWorkout >= 30) return AttendancePriority.RED;
  
  // Semanas 2-4 ou poucos treinos
  if (metrics.daysAsMember <= 30 || metrics.totalWorkouts < 8) {
    return AttendancePriority.ORANGE;
  }
  
  // Taxa de conclusão baixa
  if (metrics.completionRate < 0.7) return AttendancePriority.ORANGE;
  
  // Mês 2
  if (metrics.daysAsMember <= 60 || metrics.totalWorkouts < 20) {
    return AttendancePriority.YELLOW;
  }
  
  // Mês 3
  if (metrics.daysAsMember <= 90 || metrics.totalWorkouts < 40) {
    return AttendancePriority.BLUE;
  }
  
  // Veterano VIP
  if (metrics.daysAsMember >= 180 && metrics.totalWorkouts >= 100) {
    return AttendancePriority.BLACK;
  }
  
  return AttendancePriority.GREEN;
}

export function getPriorityOrder(priority: AttendancePriority): number {
  const order: Record<AttendancePriority, number> = {
    [AttendancePriority.RED]: 1,
    [AttendancePriority.ORANGE]: 2,
    [AttendancePriority.YELLOW]: 3,
    [AttendancePriority.BLUE]: 4,
    [AttendancePriority.GREEN]: 5,
    [AttendancePriority.BLACK]: 6,
  };
  return order[priority];
}

export function formatWaitTime(waitingSince: string): string {
  const diff = Date.now() - new Date(waitingSince).getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return "agora";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}

export function sortQueueMembers(members: QueueMember[]): QueueMember[] {
  return [...members].sort((a, b) => {
    // Quem pediu ajuda tem prioridade absoluta
    if (a.helpRequested && !b.helpRequested) return -1;
    if (!a.helpRequested && b.helpRequested) return 1;
    
    // Por nível de prioridade
    const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    
    // Por tempo de espera
    const aWait = a.waitingSinceTime ? new Date(a.waitingSinceTime).getTime() : Date.now();
    const bWait = b.waitingSinceTime ? new Date(b.waitingSinceTime).getTime() : Date.now();
    return aWait - bWait;
  });
}
