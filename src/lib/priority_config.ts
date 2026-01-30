// ============================================================================
// CAMINHO: src/lib/priority_config.ts
// ============================================================================
// Configurações de prioridade por cor
//
// REGRAS:
// - RED, ORANGE, YELLOW, GREEN, BLUE: CONTAM no ratio, TÊM alertas
// - PURPLE, BLACK: NÃO contam no ratio, SEM alertas
// ============================================================================

export const PRIORITY_CONFIG = {
  RED: {
    label: 'Máxima',
    color: '#FF3B30',
    bgColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: 'rgba(255, 59, 48, 0.5)',
    emoji: '🔴',
    daysRange: '0-7 dias',
    description: '1ª semana',
    tempoAtendimento: 25,
    intervaloAtendimento: 180, // 3 min
    hasAlerts: true,
    countsInRatio: true,
  },
  ORANGE: {
    label: 'Alta',
    color: '#FF9500',
    bgColor: 'rgba(255, 149, 0, 0.15)',
    borderColor: 'rgba(255, 149, 0, 0.5)',
    emoji: '🟠',
    daysRange: '8-14 dias',
    description: '2ª semana',
    tempoAtendimento: 20,
    intervaloAtendimento: 240, // 4 min
    hasAlerts: true,
    countsInRatio: true,
  },
  YELLOW: {
    label: 'Moderada',
    color: '#FFCC00',
    bgColor: 'rgba(255, 204, 0, 0.15)',
    borderColor: 'rgba(255, 204, 0, 0.5)',
    emoji: '🟡',
    daysRange: '15-30 dias',
    description: 'Mês 1',
    tempoAtendimento: 15,
    intervaloAtendimento: 300, // 5 min
    hasAlerts: true,
    countsInRatio: true,
  },
  GREEN: {
    label: 'Normal',
    color: '#30D158',
    bgColor: 'rgba(48, 209, 88, 0.15)',
    borderColor: 'rgba(48, 209, 88, 0.5)',
    emoji: '🟢',
    daysRange: '31-179 dias',
    description: 'Veterano',
    tempoAtendimento: 10,
    intervaloAtendimento: 360, // 6 min
    hasAlerts: true,
    countsInRatio: true,
  },
  BLUE: {
    label: 'Autônomo',
    color: '#007AFF',
    bgColor: 'rgba(0, 122, 255, 0.15)',
    borderColor: 'rgba(0, 122, 255, 0.5)',
    emoji: '🔵',
    daysRange: '180+ dias',
    description: 'Veterano autônomo',
    tempoAtendimento: 10,
    intervaloAtendimento: 420, // 7 min
    hasAlerts: true,       // TEM alertas!
    countsInRatio: true,   // CONTA no ratio!
  },
  PURPLE: {
    label: 'Personal (Enviado)',
    color: '#AF52DE',
    bgColor: 'rgba(175, 82, 222, 0.15)',
    borderColor: 'rgba(175, 82, 222, 0.5)',
    emoji: '🟣',
    daysRange: 'Enviado',
    description: 'Enviado para Personal',
    tempoAtendimento: 0,
    intervaloAtendimento: 0,
    hasAlerts: false,      // SEM alertas
    countsInRatio: false,  // NÃO conta
  },
  BLACK: {
    label: 'Personal (EVO)',
    color: '#1C1C1E',
    bgColor: 'rgba(28, 28, 30, 0.5)',
    borderColor: 'rgba(142, 142, 147, 0.5)',
    emoji: '⚫',
    daysRange: 'Sistema',
    description: 'Personal do EVO',
    tempoAtendimento: 0,
    intervaloAtendimento: 0,
    hasAlerts: false,      // SEM alertas
    countsInRatio: false,  // NÃO conta
  },
};

// ============================================================================
// FUNÇÕES HELPER
// ============================================================================

export function isPersonalSection(priority: string): boolean {
  const p = priority?.toUpperCase();
  return p === 'PURPLE' || p === 'BLACK';
}

export function countsInRatio(priority: string): boolean {
  const p = priority?.toUpperCase();
  const config = PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG];
  return config?.countsInRatio ?? true;
}

export function hasTimeAlerts(priority: string): boolean {
  const p = priority?.toUpperCase();
  const config = PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG];
  return config?.hasAlerts ?? true;
}

export function getTempoAtendimento(priority: string): number {
  const p = priority?.toUpperCase();
  const config = PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG];
  return config?.tempoAtendimento ?? 10;
}

export function getIntervaloAtendimento(priority: string): number {
  const p = priority?.toUpperCase();
  const config = PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG];
  return config?.intervaloAtendimento ?? 360;
}

export function calculatePriority(daysAsMember: number): string {
  if (daysAsMember <= 7) return 'RED';
  if (daysAsMember <= 14) return 'ORANGE';
  if (daysAsMember <= 30) return 'YELLOW';
  if (daysAsMember <= 179) return 'GREEN';
  return 'BLUE';
}

export function getPriorityInfo(priority: string) {
  const p = priority?.toUpperCase() || 'GREEN';
  return PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.GREEN;
}

// ============================================================================
// TAILWIND CLASSES
// ============================================================================

export const PRIORITY_TAILWIND = {
  RED: { bg: 'bg-red-500/15', border: 'border-red-500/50', text: 'text-red-500', ring: 'ring-red-500' },
  ORANGE: { bg: 'bg-orange-500/15', border: 'border-orange-500/50', text: 'text-orange-500', ring: 'ring-orange-500' },
  YELLOW: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/50', text: 'text-yellow-500', ring: 'ring-yellow-500' },
  GREEN: { bg: 'bg-green-500/15', border: 'border-green-500/50', text: 'text-green-500', ring: 'ring-green-500' },
  BLUE: { bg: 'bg-blue-500/15', border: 'border-blue-500/50', text: 'text-blue-500', ring: 'ring-blue-500' },
  PURPLE: { bg: 'bg-purple-500/15', border: 'border-purple-500/50', text: 'text-purple-500', ring: 'ring-purple-500' },
  BLACK: { bg: 'bg-gray-800/50', border: 'border-gray-600/50', text: 'text-gray-400', ring: 'ring-gray-600' },
};
