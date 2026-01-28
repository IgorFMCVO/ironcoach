// src/types/member-analytics.ts
// ============================================================================
// IRON COACH - Tipos para Análise de Alunos
// ============================================================================

// Tipos de saída do aluno
export type ExitType = 'catraca' | 'professor' | 'timeout' | 'self';

// Motivos de saída pelo professor
export type ExitReason = 
  | 'treino_finalizado'
  | 'desistiu_hoje'
  | 'passou_mal'
  | 'compromisso'
  | 'erro_checkin'
  | 'outro';

export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  treino_finalizado: '✅ Treino Finalizado',
  desistiu_hoje: '😔 Desistiu do treino hoje',
  passou_mal: '🤒 Passou mal',
  compromisso: '📅 Tinha compromisso',
  erro_checkin: '❌ Erro no check-in',
  outro: '📝 Outro motivo',
};

// Índice de Risco de Desistência
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DesistanceRisk {
  index: number; // 0-100
  level: RiskLevel;
  trend: 'improving' | 'stable' | 'declining';
  weeksAnalyzed: number;
  expectedFrequency: number; // vezes por semana
  actualFrequency: number; // média real
  lastWeekAttendance: number;
  previousWeekAttendance: number;
}

export const RISK_CONFIG: Record<RiskLevel, { 
  color: string; 
  bg: string; 
  label: string; 
  icon: string;
  action: string;
}> = {
  LOW: { 
    color: '#30D158', 
    bg: 'rgba(48,209,88,0.15)', 
    label: 'REGULAR', 
    icon: '✅',
    action: 'Manter acompanhamento padrão'
  },
  MEDIUM: { 
    color: '#FFCC00', 
    bg: 'rgba(255,204,0,0.15)', 
    label: 'ATENÇÃO', 
    icon: '⚠️',
    action: 'Fazer check motivacional'
  },
  HIGH: { 
    color: '#FF9500', 
    bg: 'rgba(255,149,0,0.15)', 
    label: 'RISCO', 
    icon: '🔶',
    action: 'Conversar sobre objetivos e dificuldades'
  },
  CRITICAL: { 
    color: '#FF3B30', 
    bg: 'rgba(255,59,48,0.15)', 
    label: 'CRÍTICO', 
    icon: '🚨',
    action: 'Intervenção urgente - risco de cancelamento'
  },
};

// Informações do treino
export interface WorkoutInfo {
  hasWorkout: boolean;
  workoutName?: string;
  workoutLetter?: string;
  frequencyPerWeek: number; // 0 se não tem treino
  daysSinceLastWorkout?: number;
  daysSinceWorkoutCreated?: number;
  isNewWorkout: boolean; // < 7 dias
  needsNewWorkout: boolean; // > 60 dias
}

// Informações de avaliação
export interface AssessmentInfo {
  hasAssessment: boolean;
  daysSinceLastAssessment?: number;
  needsAssessment: boolean; // > 90 dias ou nunca fez
  assessmentType?: string;
}

// Status completo do aluno
export interface MemberStatus {
  // Básico
  memberId: number;
  memberName: string;
  daysAsMember: number;
  
  // Treino
  workout: WorkoutInfo;
  
  // Avaliação
  assessment: AssessmentInfo;
  
  // Risco de desistência
  desistanceRisk: DesistanceRisk;
  
  // Tags geradas automaticamente
  autoTags: string[];
  
  // Sugestão de ação para o professor
  suggestedAction: string;
  
  // Prioridade calculada
  calculatedPriority: 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'GREEN' | 'BLACK';
}

// Função para calcular IRD
export function calculateDesistanceRisk(
  expectedFrequency: number,
  weeklyAttendance: number[] // últimas 4 semanas [sem4, sem3, sem2, sem1]
): DesistanceRisk {
  if (expectedFrequency === 0 || weeklyAttendance.length === 0) {
    return {
      index: 0,
      level: 'LOW',
      trend: 'stable',
      weeksAnalyzed: 0,
      expectedFrequency: 0,
      actualFrequency: 0,
      lastWeekAttendance: 0,
      previousWeekAttendance: 0,
    };
  }

  const weeksAnalyzed = Math.min(weeklyAttendance.length, 4);
  const recentWeeks = weeklyAttendance.slice(-weeksAnalyzed);
  
  // Média real
  const actualFrequency = recentWeeks.reduce((a, b) => a + b, 0) / weeksAnalyzed;
  
  // IRD base
  const baseIndex = Math.max(0, ((expectedFrequency - actualFrequency) / expectedFrequency) * 100);
  
  // Análise de tendência (peso maior para semanas recentes)
  const lastWeek = recentWeeks[recentWeeks.length - 1] || 0;
  const previousWeek = recentWeeks[recentWeeks.length - 2] || lastWeek;
  
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  let trendBonus = 0;
  
  if (lastWeek > previousWeek) {
    trend = 'improving';
    trendBonus = -10; // Reduz o risco
  } else if (lastWeek < previousWeek) {
    trend = 'declining';
    trendBonus = 15; // Aumenta o risco
  }
  
  // IRD final
  const index = Math.min(100, Math.max(0, baseIndex + trendBonus));
  
  // Determinar nível
  let level: RiskLevel;
  if (index <= 15) level = 'LOW';
  else if (index <= 30) level = 'MEDIUM';
  else if (index <= 50) level = 'HIGH';
  else level = 'CRITICAL';
  
  return {
    index: Math.round(index),
    level,
    trend,
    weeksAnalyzed,
    expectedFrequency,
    actualFrequency: Math.round(actualFrequency * 10) / 10,
    lastWeekAttendance: lastWeek,
    previousWeekAttendance: previousWeek,
  };
}

// Função para gerar tags automáticas
export function generateAutoTags(status: Partial<MemberStatus>): string[] {
  const tags: string[] = [];
  
  // Tags de tempo como membro
  if (status.daysAsMember !== undefined) {
    if (status.daysAsMember <= 7) tags.push('1ª SEMANA');
    else if (status.daysAsMember <= 14) tags.push('2ª SEMANA');
    else if (status.daysAsMember <= 30) tags.push('PRIMEIRO MÊS');
  }
  
  // Tags de treino
  if (status.workout) {
    if (!status.workout.hasWorkout) {
      tags.push('SEM FICHA');
    } else {
      if (status.workout.isNewWorkout) tags.push('FICHA NOVA');
      if (status.workout.needsNewWorkout) tags.push('FICHA ANTIGA');
    }
  }
  
  // Tags de avaliação
  if (status.assessment) {
    if (!status.assessment.hasAssessment) {
      tags.push('SEM AVALIAÇÃO');
    } else if (status.assessment.needsAssessment) {
      tags.push('REAVALIAR');
    }
  }
  
  // Tags de frequência
  if (status.desistanceRisk) {
    if (status.desistanceRisk.level === 'HIGH' || status.desistanceRisk.level === 'CRITICAL') {
      tags.push('FREQUÊNCIA ↓');
    }
    if (status.desistanceRisk.trend === 'declining') {
      tags.push('TENDÊNCIA ↓');
    }
  }
  
  return tags;
}

// Função para gerar sugestão de ação
export function generateSuggestedAction(status: Partial<MemberStatus>): string {
  const suggestions: string[] = [];
  
  // Prioridade 1: Risco crítico de desistência
  if (status.desistanceRisk?.level === 'CRITICAL') {
    return '🚨 URGENTE: Conversa sobre continuidade - risco alto de cancelamento';
  }
  
  // Prioridade 2: Sem ficha de treino
  if (status.workout && !status.workout.hasWorkout) {
    suggestions.push('Verificar se já fez avaliação para montar ficha');
  }
  
  // Prioridade 3: Ficha nova
  if (status.workout?.isNewWorkout) {
    suggestions.push('Acompanhar execução da nova ficha');
  }
  
  // Prioridade 4: Precisa de avaliação
  if (status.assessment?.needsAssessment) {
    suggestions.push('Sugerir agendamento de reavaliação');
  }
  
  // Prioridade 5: Risco de desistência
  if (status.desistanceRisk?.level === 'HIGH') {
    suggestions.push('Conversar sobre objetivos e dificuldades');
  } else if (status.desistanceRisk?.level === 'MEDIUM') {
    suggestions.push('Check motivacional rápido');
  }
  
  // Prioridade 6: Aluno novo
  if (status.daysAsMember !== undefined && status.daysAsMember <= 14) {
    suggestions.push('Garantir boa experiência inicial');
  }
  
  return suggestions[0] || 'Acompanhamento padrão';
}

// Função para calcular prioridade baseada no status completo
export function calculateSmartPriority(status: Partial<MemberStatus>): 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'GREEN' | 'BLACK' {
  let score = 0;
  
  // Dias como membro (peso alto para iniciantes)
  if (status.daysAsMember !== undefined) {
    if (status.daysAsMember <= 7) score += 50;
    else if (status.daysAsMember <= 14) score += 40;
    else if (status.daysAsMember <= 30) score += 30;
    else if (status.daysAsMember <= 60) score += 20;
    else if (status.daysAsMember <= 90) score += 10;
  }
  
  // Risco de desistência (peso muito alto)
  if (status.desistanceRisk) {
    if (status.desistanceRisk.level === 'CRITICAL') score += 60;
    else if (status.desistanceRisk.level === 'HIGH') score += 40;
    else if (status.desistanceRisk.level === 'MEDIUM') score += 20;
  }
  
  // Ficha de treino
  if (status.workout) {
    if (!status.workout.hasWorkout) score += 30;
    else if (status.workout.isNewWorkout) score += 25;
    else if (status.workout.needsNewWorkout) score += 15;
  }
  
  // Avaliação
  if (status.assessment) {
    if (!status.assessment.hasAssessment) score += 20;
    else if (status.assessment.needsAssessment) score += 10;
  }
  
  // Converter score em prioridade
  if (score >= 80) return 'RED';
  if (score >= 60) return 'ORANGE';
  if (score >= 40) return 'YELLOW';
  if (score >= 20) return 'BLUE';
  if (score >= 10) return 'GREEN';
  return 'BLACK';
}