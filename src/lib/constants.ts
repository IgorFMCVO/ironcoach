// src/lib/constants.ts
// ============================================================================
// IRONCOACH v16 - CONSTANTES E CONFIGURAÇÕES
// Baseado no v12 original + suporte a PURPLE
// ============================================================================

import { Priority } from './supabase';

// ============================================================================
// SISTEMA DE ALERTAS DE AMBIENTE - CONFIGURAÇÕES
// ============================================================================

export type NivelAtendimento = 'OTIMO' | 'BOM' | 'BAIXO' | 'CRITICO';

export interface EnvironmentConfig {
  // Ratios de capacidade (alunos por professor)
  ratioOtimo: number;
  ratioBom: number;
  ratioBaixo: number;
  
  // Tempos base em segundos (nível ÓTIMO)
  tempoBaseVermelho: number;
  tempoBaseLaranja: number;
  tempoBaseAmarelo: number;
  tempoBaseVerde: number;
  tempoBaseAzul: number;
  
  // Ajustes por nível (em segundos)
  ajusteVermelhoLaranja: number;
  ajusteAmareloVerde: number;
  
  // Alertas de fila
  cardsParaAlerta: number;
  tempoFilaOtimo: number;
  tempoFilaBom: number;
  tempoFilaBaixo: number;
  tempoFilaCritico: number;
  
  // Frequência de alertas fullscreen (em minutos)
  alertaFreqOtimo: number;
  alertaFreqBom: number;
  alertaFreqBaixo: number;
  alertaFreqCritico: number;
  
  // Duração do alerta fullscreen (em segundos)
  alertaDuracaoOtimo: number;
  alertaDuracaoBom: number;
  alertaDuracaoBaixo: number;
  alertaDuracaoCritico: number;
  
  // WhatsApp do supervisor
  supervisorWhatsapp?: string;
  
  // Anti-burla
  tempoMinimoAtendimento: number;
  alertasBurlaSequencia: number;
  alertasBurlaJanelaMinutos: number;
  
  // Configuração avançada de fila (JSON stringified)
  configFilaAvancada?: string;
}

export interface EnvironmentStatus {
  nivel: NivelAtendimento;
  nivelCapacidade: NivelAtendimento;
  nivelFila: NivelAtendimento;
  
  // Métricas
  alunosAtivos: number;
  professoresOnline: number;
  ratio: number;
  
  // Alertas de fila
  cardsEsperandoOtimo: number;
  cardsEsperandoBom: number;
  cardsEsperandoBaixo: number;
  cardsEsperandoCritico: number;
  
  // Tempos ajustados atuais (em segundos)
  tempoVermelho: number;
  tempoLaranja: number;
  tempoAmarelo: number;
  tempoVerde: number;
  tempoAzul: number;
  
  // Alertas
  ultimoAlerta: Date | null;
  proximoAlerta: Date | null;
}

export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  ratioOtimo: 5,
  ratioBom: 10,
  ratioBaixo: 15,
  
  tempoBaseVermelho: 210,  // 3:30
  tempoBaseLaranja: 270,   // 4:30
  tempoBaseAmarelo: 330,   // 5:30
  tempoBaseVerde: 390,     // 6:30
  tempoBaseAzul: 450,      // 7:30
  
  ajusteVermelhoLaranja: 30,
  ajusteAmareloVerde: 15,
  
  cardsParaAlerta: 5,
  tempoFilaOtimo: 30,
  tempoFilaBom: 60,
  tempoFilaBaixo: 120,
  tempoFilaCritico: 300,
  
  alertaFreqOtimo: 15,
  alertaFreqBom: 10,
  alertaFreqBaixo: 5,
  alertaFreqCritico: 3,
  
  alertaDuracaoOtimo: 2,
  alertaDuracaoBom: 2,
  alertaDuracaoBaixo: 3,
  alertaDuracaoCritico: 4,
  
  // Anti-burla
  tempoMinimoAtendimento: 10,
  alertasBurlaSequencia: 3,
  alertasBurlaJanelaMinutos: 5,
};

export const NIVEL_CONFIG: Record<NivelAtendimento, {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  mensagem: string;
  acao: string;
}> = {
  OTIMO: {
    label: 'ÓTIMO',
    emoji: '💚',
    color: '#30D158',
    bgColor: 'rgba(48, 209, 88, 0.15)',
    borderColor: 'rgba(48, 209, 88, 0.5)',
    mensagem: 'Excelente trabalho!',
    acao: 'Mantenha a qualidade',
  },
  BOM: {
    label: 'BOM',
    emoji: '💛',
    color: '#FFCC00',
    bgColor: 'rgba(255, 204, 0, 0.15)',
    borderColor: 'rgba(255, 204, 0, 0.5)',
    mensagem: 'Bom ritmo de atendimento',
    acao: 'Mantenha o foco',
  },
  BAIXO: {
    label: 'BAIXO',
    emoji: '🟠',
    color: '#FF9500',
    bgColor: 'rgba(255, 149, 0, 0.15)',
    borderColor: 'rgba(255, 149, 0, 0.5)',
    mensagem: 'Atenção: Alta demanda',
    acao: 'Priorize alunos críticos',
  },
  CRITICO: {
    label: 'CRÍTICO',
    emoji: '🔴',
    color: '#FF3B30',
    bgColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: 'rgba(255, 59, 48, 0.5)',
    mensagem: 'REFORÇO NECESSÁRIO!',
    acao: 'Solicite apoio imediato',
  },
};

/**
 * Calcula o nível de atendimento baseado no ratio
 */
export function calcularNivelCapacidade(
  ratio: number,
  config: EnvironmentConfig
): NivelAtendimento {
  if (ratio <= config.ratioOtimo) return 'OTIMO';
  if (ratio <= config.ratioBom) return 'BOM';
  if (ratio <= config.ratioBaixo) return 'BAIXO';
  return 'CRITICO';
}

/**
 * Calcula o nível de atendimento baseado na fila
 */
export function calcularNivelFila(
  cardsOtimo: number,
  cardsBom: number,
  cardsBaixo: number,
  cardsCritico: number,
  config?: EnvironmentConfig
): NivelAtendimento {
  const cardsParaAlerta = config?.cardsParaAlerta ?? 5;
  if (cardsCritico >= cardsParaAlerta) return 'CRITICO';
  if (cardsBaixo >= cardsParaAlerta) return 'BAIXO';
  if (cardsBom >= cardsParaAlerta) return 'BOM';
  return 'OTIMO';
}

/**
 * Retorna o pior nível entre dois
 */
export function getPiorNivel(a: NivelAtendimento, b: NivelAtendimento): NivelAtendimento {
  const ordem: Record<NivelAtendimento, number> = {
    OTIMO: 0,
    BOM: 1,
    BAIXO: 2,
    CRITICO: 3,
  };
  return ordem[a] >= ordem[b] ? a : b;
}

/**
 * Calcula os tempos ajustados baseado no nível
 */
export function calcularTemposAjustados(
  nivel: NivelAtendimento,
  config: EnvironmentConfig
): { vermelho: number; laranja: number; amarelo: number; verde: number; azul: number } {
  const nivelIndex: Record<NivelAtendimento, number> = {
    OTIMO: 0,
    BOM: 1,
    BAIXO: 2,
    CRITICO: 3,
  };
  
  const multiplicador = nivelIndex[nivel];
  
  return {
    vermelho: config.tempoBaseVermelho - (config.ajusteVermelhoLaranja * multiplicador),
    laranja: config.tempoBaseLaranja - (config.ajusteVermelhoLaranja * multiplicador),
    amarelo: config.tempoBaseAmarelo - (config.ajusteAmareloVerde * multiplicador),
    verde: config.tempoBaseVerde - (config.ajusteAmareloVerde * multiplicador),
    azul: (config.tempoBaseAzul || 450) - (config.ajusteAmareloVerde * multiplicador),
  };
}

/**
 * Retorna a frequência de alerta em minutos para o nível
 */
export function getAlertaFrequencia(nivel: NivelAtendimento, config: EnvironmentConfig): number {
  switch (nivel) {
    case 'OTIMO': return config.alertaFreqOtimo;
    case 'BOM': return config.alertaFreqBom;
    case 'BAIXO': return config.alertaFreqBaixo;
    case 'CRITICO': return config.alertaFreqCritico;
  }
}

/**
 * Retorna a duração do alerta em segundos para o nível
 */
export function getAlertaDuracao(nivel: NivelAtendimento, config: EnvironmentConfig): number {
  switch (nivel) {
    case 'OTIMO': return config.alertaDuracaoOtimo;
    case 'BOM': return config.alertaDuracaoBom;
    case 'BAIXO': return config.alertaDuracaoBaixo;
    case 'CRITICO': return config.alertaDuracaoCritico;
  }
}

// ============================================================================
// PRIORIDADES E CORES - v16 com PURPLE
// ============================================================================

export const PRIORITY_CONFIG: Record<Priority, { 
  color: string; 
  bg: string; 
  label: string; 
  emoji: string;
  alertInterval: number;  // minutos para "gritar" por atendimento
  attendanceTime: number; // segundos de atendimento
  description?: string;   // descrição da prioridade
}> = {
  RED: { 
    color: '#FF3B30', 
    bg: 'rgba(255,59,48,0.15)', 
    label: 'MÁXIMA', 
    emoji: '🔴',
    alertInterval: 2,
    attendanceTime: 25,
    description: '1ª semana (0-7 dias)',
  },
  ORANGE: { 
    color: '#FF9500', 
    bg: 'rgba(255,149,0,0.15)', 
    label: 'ALTA', 
    emoji: '🟠',
    alertInterval: 3,
    attendanceTime: 20,
    description: '2ª semana (8-14 dias)',
  },
  YELLOW: { 
    color: '#FFCC00', 
    bg: 'rgba(255,204,0,0.15)', 
    label: 'MODERADA', 
    emoji: '🟡',
    alertInterval: 4,
    attendanceTime: 15,
    description: 'Mês 1 (15-30 dias)',
  },
  GREEN: { 
    color: '#30D158', 
    bg: 'rgba(48,209,88,0.15)', 
    label: 'NORMAL', 
    emoji: '🟢',
    alertInterval: 5,
    attendanceTime: 10,
    description: 'Veterano (31-179 dias)',
  },
  BLUE: { 
    color: '#007AFF', 
    bg: 'rgba(0,122,255,0.15)', 
    label: 'AUTÔNOMO', 
    emoji: '🔵',
    alertInterval: 6,  // v16: BLUE tem alerta
    attendanceTime: 10,
    description: 'Veterano autônomo (180+ dias)',
  },
  PURPLE: { 
    color: '#AF52DE', 
    bg: 'rgba(175,82,222,0.15)', 
    label: 'PERSONAL', 
    emoji: '🟣',
    alertInterval: 0,  // Sem alerta
    attendanceTime: 0, // Sem tempo definido
    description: 'Enviado para Personal Trainer',
  },
  BLACK: { 
    color: '#1C1C1E', 
    bg: 'rgba(28,28,30,0.15)', 
    label: 'CONSULTORIA', 
    emoji: '🏴',
    alertInterval: 0,
    attendanceTime: 0,
    description: 'Personal do EVO ou Consultoria Externa',
  },
};

export const PRIORITY_ORDER: Record<Priority, number> = { 
  RED: 1, 
  ORANGE: 2, 
  YELLOW: 3, 
  GREEN: 4, 
  BLUE: 5, 
  PURPLE: 6,
  BLACK: 7 
};

// ============================================================================
// TAGS DE ALERTA
// ============================================================================

export const ALERT_TAGS = [
  'SEM FICHA', 
  'SEM AVALIAÇÃO', 
  'FICHA VENCIDA', 
  'AVAL. VENCIDA', 
  'SEM MONITOR.',
  '🚨 URGENTE',
  '🔴 CRÍTICO',
];

// ============================================================================
// SUGESTÕES DE INTERVENÇÃO
// ============================================================================

export interface Suggestion {
  titulo: string;
  texto: string;
}

// 🟢 INICIANTES (< 30 dias) - "Segurança e Acolhimento"
export const SUGESTOES_INICIANTE: Suggestion[] = [
  {
    titulo: "ESCULPA O MOVIMENTO",
    texto: "Não aponte o erro; mostre o caminho. Use um toque tátil (com permissão) ou comando verbal preciso para transformar a postura instantaneamente."
  },
  {
    titulo: "SEJA A BATERIA EXTERNA",
    texto: "Injete confiança: 'É isso! Perfeito. Você já está dominando isso muito rápido.'"
  },
  {
    titulo: "TRADUZA PARA A PRÁTICA",
    texto: "Dê uma dica visual simples: 'Imagine que está esmagando uma laranja com as axilas.'"
  },
  {
    titulo: "CELEBRE A MICRO-VITÓRIA",
    texto: "'Viu essa amplitude? Semana passada não estava assim. Evolução!'"
  }
];

// 🟡 INTERMEDIÁRIOS (30-90 dias) - "Platô e Rotina"
export const SUGESTOES_INTERMEDIARIO: Suggestion[] = [
  {
    titulo: "ELEVE O PADRÃO",
    texto: "'A técnica está ótima, mas sei que você aguenta mais 2 repetições com qualidade. Vamos buscar a falha?'"
  },
  {
    titulo: "GUARDIÃO DO RITMO",
    texto: "'Vamos manter a frequência cardíaca alta? Seu descanso acabou, hora de crescer.'"
  },
  {
    titulo: "CONEXÃO MENTE-MÚSCULO",
    texto: "'Não empurre o peso, sinta o peitoral esmagar no topo. Concentra aqui.'"
  },
  {
    titulo: "CONSISTÊNCIA É SUPERPODER",
    texto: "'Os resultados de verão são construídos nesta chuva de hoje. Orgulho de te ver aqui.'"
  }
];

// 🟣 VETERANOS (> 90 dias) - "Elite e Detalhe"
export const SUGESTOES_VETERANO: Suggestion[] = [
  {
    titulo: "DESAFIE A ZONA DE CONFORTO",
    texto: "'Hoje vamos mudar a cadência. Quero 3 segundos na descida. Vamos chocar esse músculo.'"
  },
  {
    titulo: "VALIDE A IDENTIDADE",
    texto: "'Sua disciplina é exemplo na academia. Muita gente se inspira no seu foco, sabia?'"
  },
  {
    titulo: "AJUSTE FINO DE SNIPER",
    texto: "'Gire levemente o cotovelo para fora. Sentiu pegar mais a porção lateral?'"
  },
  {
    titulo: "REACENDA O PROPÓSITO",
    texto: "'Como estamos para aquela meta de dezembro? O treino de hoje está alinhado?'"
  }
];

// 🚨 RISCO DE DESISTÊNCIA - "Resgate Humano"
export const SUGESTOES_DESISTENCIA: Suggestion[] = [
  {
    titulo: "FAÇA-O SENTIR FALTA",
    texto: "'Que bom te ver! A energia do horário muda quando você vem. Sentimos sua falta.'"
  },
  {
    titulo: "REMOVA A BARREIRA",
    texto: "'Sei que a semana está corrida. Vamos fazer um treino mais intenso e curto hoje?'"
  },
  {
    titulo: "PACTO DE CURTO PRAZO",
    texto: "'Vamos combinar só mais dois treinos essa semana? Só eu e você. Topa?'"
  },
  {
    titulo: "ANTÍDOTO DO ESTRESSE",
    texto: "'Deixe os problemas lá fora. Esses 40 minutos são sua terapia. Foca em você.'"
  }
];

// Função para pegar sugestão aleatória
export function getSuggestion(daysAsMember: number, isChurnRisk: boolean): Suggestion {
  let pool: Suggestion[];
  
  if (isChurnRisk) {
    pool = SUGESTOES_DESISTENCIA;
  } else if (daysAsMember <= 30) {
    pool = SUGESTOES_INICIANTE;
  } else if (daysAsMember <= 90) {
    pool = SUGESTOES_INTERMEDIARIO;
  } else {
    pool = SUGESTOES_VETERANO;
  }
  
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================================
// MOTIVOS DE CHECKOUT
// ============================================================================

export const CHECKOUT_REASONS = [
  { id: 'finished', label: 'Fim do Treino', description: 'Treino completo', emoji: '✅', color: '#30D158' },
  { id: 'left', label: 'Saiu Mais Cedo', description: 'Não completou o treino', emoji: '🚶', color: '#FF9500' },
  { id: 'emergency', label: 'Emergência', description: 'Problema urgente', emoji: '🚨', color: '#FF3B30' },
  { id: 'other', label: 'Outro', description: 'Outro motivo', emoji: '📝', color: '#8E8E93' },
];

// ============================================================================
// SISTEMA DE SUPERVISÃO - Tipos de Solicitação
// ============================================================================

export const COORDINATION_REQUEST_TYPES = [
  { 
    id: 'SKIPPED_MEMBER', 
    label: 'Aluno Pulado 3x', 
    icon: '⏭️',
    description: 'Aluno foi pulado 3 ou mais vezes',
    color: '#EF4444',
    suggestedActions: ['Verificar situação', 'Conversar com aluno', 'Avaliar motivos'],
    isUrgent: true,
  },
  { 
    id: 'LONG_ATTENDANCE', 
    label: 'Atendimento Longo', 
    icon: '⏱️',
    description: 'Atendimento excedeu 1 minuto',
    color: '#F59E0B',
    suggestedActions: ['Verificar se precisa de ajuda', 'Avaliar complexidade', 'Registrar motivo'],
    isUrgent: true,
  },
  { 
    id: 'VERIFY_FREQUENCY', 
    label: 'Verificar Frequência', 
    icon: '📊',
    description: 'Aluno com frequência abaixo do esperado',
    color: '#FF9500',
    suggestedActions: ['Contatar aluno', 'Ajustar plano', 'Agendar conversa'],
  },
  { 
    id: 'SCHEDULE_EVALUATION', 
    label: 'Marcar Avaliação Física', 
    icon: '📋',
    description: 'Agendar avaliação física',
    color: '#007AFF',
    suggestedActions: ['Agendar no EVO', 'Verificar disponibilidade', 'Contatar aluno'],
  },
  { 
    id: 'SCHEDULE_MONITORING', 
    label: 'Marcar Monitoramento', 
    icon: '📈',
    description: 'Acompanhamento especial necessário',
    color: '#AF52DE',
    suggestedActions: ['Contatar aluno', 'Agendar horário', 'Realizar pesquisa de treino'],
  },
  { 
    id: 'INSERT_STANDARD_WORKOUT', 
    label: 'Inserir Treino Padrão', 
    icon: '📝',
    description: 'Atribuir ficha de treino modelo',
    color: '#30D158',
    suggestedActions: ['Selecionar treino padrão', 'Vincular ao aluno', 'Definir validade'],
  },
  { 
    id: 'INSERT_CUSTOM_WORKOUT', 
    label: 'Inserir Treino Personalizado', 
    icon: '✏️',
    description: 'Criar ficha de treino específica',
    color: '#FF3B30',
    suggestedActions: ['Avaliar necessidades', 'Criar treino no EVO', 'Vincular ao aluno'],
  },
  { 
    id: 'PERSONAL_TRAINER', 
    label: 'Aluno com Personal', 
    icon: '🏋️',
    description: 'Aluno treina com personal trainer',
    color: '#8B5CF6',
    suggestedActions: ['Registrar no perfil', 'Verificar contrato', 'Ajustar prioridade'],
    movesToBlack: true,
  },
  { 
    id: 'EXTERNAL_CONSULTING', 
    label: 'Consultoria Externa', 
    icon: '📱',
    description: 'Aluno com consultoria de treino externa (online)',
    color: '#6B7280',
    suggestedActions: ['Registrar no perfil', 'Verificar se precisa de suporte', 'Ajustar acompanhamento'],
    movesToBlack: true,
  },
];

// ============================================================================
// SISTEMA DE SUPERVISÃO - Status das Solicitações
// ============================================================================

export const REQUEST_STATUS = {
  PENDING: { 
    id: 'PENDING',
    label: 'Pendente', 
    color: '#FF9500', 
    icon: '🔔',
    description: 'Aguardando visualização',
  },
  VIEWED: { 
    id: 'VIEWED',
    label: 'Visualizado', 
    color: '#007AFF', 
    icon: '👁️',
    description: 'Visto pelo supervisor',
  },
  IN_PROGRESS: { 
    id: 'IN_PROGRESS',
    label: 'Em Andamento', 
    color: '#AF52DE', 
    icon: '⏳',
    description: 'Ação sendo tomada',
  },
  RESOLVED: { 
    id: 'RESOLVED',
    label: 'Resolvido', 
    color: '#30D158', 
    icon: '✅',
    description: 'Concluído',
  },
  CANCELLED: { 
    id: 'CANCELLED',
    label: 'Cancelado', 
    color: '#8E8E93', 
    icon: '❌',
    description: 'Cancelado ou não necessário',
  },
};

// ============================================================================
// SISTEMA DE SUPERVISÃO - Tipos de Resolução
// ============================================================================

export const RESOLUTION_TYPES = [
  { id: 'COMPLETED', label: 'Concluído', icon: '✅', color: '#30D158', description: 'Ação realizada com sucesso' },
  { id: 'PARTIAL', label: 'Parcial', icon: '⚠️', color: '#FF9500', description: 'Ação parcialmente realizada' },
  { id: 'FORWARDED', label: 'Encaminhado', icon: '↗️', color: '#007AFF', description: 'Encaminhado para outro setor' },
  { id: 'NOT_NEEDED', label: 'Não Necessário', icon: '🚫', color: '#8E8E93', description: 'Ação não era necessária' },
  { id: 'CANCELLED', label: 'Cancelado', icon: '❌', color: '#FF3B30', description: 'Solicitação cancelada' },
];

// ============================================================================
// SISTEMA DE SUPERVISÃO - Níveis de Urgência
// ============================================================================

export const URGENCY_LEVELS = {
  CRITICAL: { 
    id: 'CRITICAL',
    label: 'Crítico', 
    color: '#FF3B30', 
    icon: '🔴',
    description: 'Retenção < 30% ou 1º treino sem ficha',
    maxResponseHours: 2,
  },
  HIGH: { 
    id: 'HIGH',
    label: 'Alto', 
    color: '#FF9500', 
    icon: '🟠',
    description: 'Retenção < 50% ou ficha vencida > 7 dias',
    maxResponseHours: 8,
  },
  NORMAL: { 
    id: 'NORMAL',
    label: 'Normal', 
    color: '#FFCC00', 
    icon: '🟡',
    description: 'Situação padrão',
    maxResponseHours: 24,
  },
  LOW: { 
    id: 'LOW',
    label: 'Baixo', 
    color: '#30D158', 
    icon: '🟢',
    description: 'Pode aguardar',
    maxResponseHours: 48,
  },
};

// ============================================================================
// SISTEMA DE SUPERVISÃO - Calcular Urgência Automaticamente
// ============================================================================

export function calculateUrgency(memberData: {
  retentionScore?: number;
  daysAsMember?: number;
  hasFicha?: boolean;
  fichaVencida?: boolean;
  hasAvaliacao?: boolean;
  requestType?: string;
}): keyof typeof URGENCY_LEVELS {
  const { 
    retentionScore = 100, 
    daysAsMember = 365, 
    hasFicha = true, 
    fichaVencida = false, 
    requestType = '' 
  } = memberData;
  
  // CRÍTICO: Retenção muito baixa ou iniciante sem ficha
  if (retentionScore < 30) return 'CRITICAL';
  if (daysAsMember <= 14 && !hasFicha) return 'CRITICAL';
  if (requestType === 'INSERT_CUSTOM_WORKOUT' && daysAsMember <= 7) return 'CRITICAL';
  
  // ALTO: Retenção baixa ou ficha vencida
  if (retentionScore < 50) return 'HIGH';
  if (fichaVencida) return 'HIGH';
  if (daysAsMember <= 30 && !hasFicha) return 'HIGH';
  
  // BAIXO: Aluno veterano estável
  if (retentionScore >= 80 && daysAsMember > 90) return 'LOW';
  
  // NORMAL: Padrão
  return 'NORMAL';
}

// ============================================================================
// SISTEMA DE SUPERVISÃO - Ações Disponíveis por Tipo
// ============================================================================

export const ACTION_TYPES = {
  LINKED_WORKOUT: { 
    label: 'Treino Vinculado', 
    icon: '📋',
    fields: ['workoutId', 'workoutName', 'expirationDate'],
  },
  SCHEDULED_EVALUATION: { 
    label: 'Avaliação Agendada', 
    icon: '📅',
    fields: ['date', 'time', 'evaluatorName'],
  },
  SCHEDULED_MONITORING: { 
    label: 'Monitoramento Agendado', 
    icon: '📈',
    fields: ['startDate', 'frequency', 'responsibleName'],
  },
  CONTACTED_MEMBER: { 
    label: 'Aluno Contatado', 
    icon: '📞',
    fields: ['method', 'response', 'nextAction'],
  },
  RENEWED_WORKOUT: { 
    label: 'Ficha Renovada', 
    icon: '🔄',
    fields: ['workoutId', 'newExpirationDate'],
  },
  ADJUSTED_FREQUENCY: { 
    label: 'Frequência Ajustada', 
    icon: '📊',
    fields: ['previousFrequency', 'newFrequency', 'reason'],
  },
  OTHER: { 
    label: 'Outra Ação', 
    icon: '📝',
    fields: ['description'],
  },
};

// ============================================================================
// HELPERS DE FASE
// ============================================================================

/**
 * Retorna o label da fase baseado nos dias como membro ou Priority
 */
export function getPhaseLabel(daysAsMemberOrPriority: number | Priority): string {
  // Se for Priority (string), retornar label
  if (typeof daysAsMemberOrPriority === 'string') {
    const labels: Record<Priority, string> = {
      RED: '1ª Semana',
      ORANGE: '2ª Semana',
      YELLOW: 'Mês 1',
      GREEN: 'Veterano',
      BLUE: 'Autônomo',
      PURPLE: 'Personal',
      BLACK: 'Consultoria',
    };
    return labels[daysAsMemberOrPriority as Priority] || 'Desconhecido';
  }
  
  // Se for número, calcular baseado em dias
  const daysAsMember = daysAsMemberOrPriority;
  if (daysAsMember <= 7) return '1ª Semana';
  if (daysAsMember <= 14) return 'Semana 2';
  if (daysAsMember <= 21) return 'Semana 3';
  if (daysAsMember <= 30) return 'Mês 1';
  if (daysAsMember <= 60) return 'Mês 2';
  if (daysAsMember <= 90) return 'Mês 4';
  if (daysAsMember <= 180) return 'Veterano';
  return 'Sênior';
}
