// ============================================================================
// TRECHO PARA src/lib/constants.ts - PRIORITY_CONFIG v16
// Adicionar/substituir no arquivo constants.ts existente
// ============================================================================

export type Priority = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'PURPLE' | 'BLACK';

export interface PriorityConfig {
  color: string;
  label: string;
  emoji: string;
  alertInterval: number;     // minutos (0 = sem alerta)
  attendanceTime: number;    // segundos (0 = sem timer)
  minDays: number;
  maxDays: number;
}

export const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  RED: {
    color: '#FF3B30',
    label: '1ª Semana',
    emoji: '🔴',
    alertInterval: 2,
    attendanceTime: 15,
    minDays: 0,
    maxDays: 7,
  },
  ORANGE: {
    color: '#FF9500',
    label: '2ª Semana',
    emoji: '🟠',
    alertInterval: 3,
    attendanceTime: 12,
    minDays: 8,
    maxDays: 14,
  },
  YELLOW: {
    color: '#FFCC00',
    label: 'Mês 1',
    emoji: '🟡',
    alertInterval: 5,
    attendanceTime: 10,
    minDays: 15,
    maxDays: 30,
  },
  GREEN: {
    color: '#30D158',
    label: 'Veterano',
    emoji: '🟢',
    alertInterval: 8,
    attendanceTime: 8,
    minDays: 31,
    maxDays: 179,
  },
  BLUE: {
    color: '#007AFF',
    label: 'Autônomo',
    emoji: '🔵',
    alertInterval: 10,      // TEM alerta (veterano monitorado)
    attendanceTime: 6,
    minDays: 180,
    maxDays: 9999,
  },
  PURPLE: {
    color: '#AF52DE',
    label: 'Personal',
    emoji: '🟣',
    alertInterval: 0,       // SEM alerta
    attendanceTime: 0,      // SEM timer
    minDays: 0,
    maxDays: 0,
  },
  BLACK: {
    color: '#8E8E93',
    label: 'Consultoria',
    emoji: '⚫',
    alertInterval: 0,       // SEM alerta
    attendanceTime: 0,      // SEM timer
    minDays: 0,
    maxDays: 0,
  },
};

// Ordem de prioridade (para ordenação)
export const PRIORITY_ORDER: Priority[] = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'BLACK'];

// Helper para verificar se é prioridade passiva (sem timer/alerta)
export const isPassivePriority = (priority: Priority): boolean => {
  return priority === 'PURPLE' || priority === 'BLACK';
};

// Helper para verificar se deve aparecer na fila regular
export const isRegularQueuePriority = (priority: Priority): boolean => {
  return priority !== 'PURPLE' && priority !== 'BLACK';
};

// Helper para obter cor baseada em dias como membro
export const getPriorityByDays = (days: number): Priority => {
  if (days <= 7) return 'RED';
  if (days <= 14) return 'ORANGE';
  if (days <= 30) return 'YELLOW';
  if (days <= 179) return 'GREEN';
  return 'BLUE';
};
