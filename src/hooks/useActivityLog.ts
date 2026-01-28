// ============================================================================
// IRON COACH - Hook useActivityLog
// Facilita o registro de eventos de atividade do professor
// ============================================================================

import { useCallback, useEffect, useRef } from 'react';

type EventCategory = 'SYSTEM' | 'ATTENDANCE' | 'NOTIFICATION' | 'NAVIGATION' | 'MEMBER';

type EventType = 
  | 'SESSION_START' 
  | 'SESSION_END' 
  | 'SESSION_TIMEOUT'
  | 'APP_MINIMIZED'
  | 'APP_RESTORED'
  | 'ATTENDANCE_START'
  | 'ATTENDANCE_END'
  | 'ATTENDANCE_AUTO_END'
  | 'ATTENDANCE_OVERTIME'
  | 'HELP_REQUEST_RESPONSE'
  | 'NOTIFICATION_SENT'
  | 'PAGE_VIEW_GUIDE'
  | 'PAGE_VIEW_ADMIN'
  | 'PAGE_VIEW_SUPERVISION'
  | 'FILTER_CHANGED'
  | 'MANUAL_ENTRY'
  | 'MEMBER_EXPANDED'
  | 'WORKOUT_VIEWED'
  | 'SKIP'
  | 'CHECKOUT';

interface LogEventParams {
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

interface UseActivityLogParams {
  coachId: string | null;
  coachName: string | null;
  enabled?: boolean;
}

// Descrições automáticas para eventos comuns
const EVENT_DESCRIPTIONS: Record<EventType, string> = {
  SESSION_START: 'Iniciou sessão no sistema',
  SESSION_END: 'Encerrou sessão',
  SESSION_TIMEOUT: 'Sessão expirou por inatividade',
  APP_MINIMIZED: 'Saiu do sistema (aba minimizada)',
  APP_RESTORED: 'Voltou ao sistema',
  ATTENDANCE_START: 'Iniciou atendimento',
  ATTENDANCE_END: 'Finalizou atendimento',
  ATTENDANCE_AUTO_END: 'Atendimento finalizado automaticamente',
  ATTENDANCE_OVERTIME: 'Finalizou atendimento acima do tempo',
  HELP_REQUEST_RESPONSE: 'Respondeu pedido de ajuda',
  NOTIFICATION_SENT: 'Enviou notificação para coordenação',
  PAGE_VIEW_GUIDE: 'Consultou o Guia de Treinamento',
  PAGE_VIEW_ADMIN: 'Acessou painel Administrativo',
  PAGE_VIEW_SUPERVISION: 'Acessou painel de Supervisão',
  FILTER_CHANGED: 'Alterou filtros da fila',
  MANUAL_ENTRY: 'Registrou entrada manual de aluno',
  MEMBER_EXPANDED: 'Expandiu detalhes do aluno',
  WORKOUT_VIEWED: 'Visualizou treino do aluno',
  SKIP: 'Pulou atendimento de aluno',
  CHECKOUT: 'Realizou checkout de aluno',
};

export function useActivityLog({ coachId, coachName, enabled = true }: UseActivityLogParams) {
  const isDocumentHidden = useRef(false);
  const sessionStarted = useRef(false);

  // Função principal para registrar evento
  const logEvent = useCallback(async (params: LogEventParams) => {
    if (!enabled || !coachId || !coachName) return;

    try {
      const response = await fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coachId,
          coachName,
          ...params,
          // Usa descrição automática se não fornecida
          description: params.description || EVENT_DESCRIPTIONS[params.eventType],
        }),
      });

      if (!response.ok) {
        console.warn('Falha ao registrar atividade:', await response.text());
      }
    } catch (error) {
      console.warn('Erro ao registrar atividade:', error);
    }
  }, [coachId, coachName, enabled]);

  // ==================== EVENTOS DE SISTEMA ====================

  // Registrar início de sessão
  const logSessionStart = useCallback(() => {
    logEvent({
      eventType: 'SESSION_START',
      eventCategory: 'SYSTEM',
      description: 'Iniciou sessão no sistema',
      isPositive: true,
    });
  }, [logEvent]);

  // Registrar fim de sessão
  const logSessionEnd = useCallback(() => {
    logEvent({
      eventType: 'SESSION_END',
      eventCategory: 'SYSTEM',
      description: 'Encerrou sessão',
    });
  }, [logEvent]);

  // ==================== EVENTOS DE ATENDIMENTO ====================

  // Iniciar atendimento
  const logAttendanceStart = useCallback((memberName: string, memberEvoId?: number, queueId?: string, waitTimeMinutes?: number) => {
    logEvent({
      eventType: 'ATTENDANCE_START',
      eventCategory: 'ATTENDANCE',
      description: `Iniciou atendimento`,
      memberName,
      memberEvoId,
      queueId,
      metadata: { waitTimeMinutes },
    });
  }, [logEvent]);

  // Finalizar atendimento (manual)
  const logAttendanceEnd = useCallback((memberName: string, memberEvoId?: number, queueId?: string, durationMinutes?: number) => {
    logEvent({
      eventType: 'ATTENDANCE_END',
      eventCategory: 'ATTENDANCE',
      description: `Finalizou atendimento`,
      memberName,
      memberEvoId,
      queueId,
      metadata: { durationMinutes },
      isPositive: true,
    });
  }, [logEvent]);

  // Finalização automática
  const logAttendanceAutoEnd = useCallback((memberName: string, memberEvoId?: number, queueId?: string, durationMinutes?: number) => {
    logEvent({
      eventType: 'ATTENDANCE_AUTO_END',
      eventCategory: 'ATTENDANCE',
      description: `Finalização automática (tempo limite)`,
      memberName,
      memberEvoId,
      queueId,
      metadata: { durationMinutes },
      isWarning: true,
    });
  }, [logEvent]);

  // Finalização acima do tempo
  const logAttendanceOvertime = useCallback((memberName: string, memberEvoId?: number, queueId?: string, overtimeSeconds?: number) => {
    logEvent({
      eventType: 'ATTENDANCE_OVERTIME',
      eventCategory: 'ATTENDANCE',
      description: `Finalizou ${overtimeSeconds}s acima do tempo ideal`,
      memberName,
      memberEvoId,
      queueId,
      metadata: { overtimeSeconds },
      isWarning: true,
    });
  }, [logEvent]);

  // ==================== EVENTOS DE NOTIFICAÇÃO ====================

  // Enviar notificação
  const logNotificationSent = useCallback((
    notificationType: string, 
    memberName: string, 
    memberEvoId?: number, 
    queueId?: string,
    observation?: string
  ) => {
    logEvent({
      eventType: 'NOTIFICATION_SENT',
      eventCategory: 'NOTIFICATION',
      description: `Enviou notificação: ${notificationType}`,
      memberName,
      memberEvoId,
      queueId,
      metadata: { notificationType, observation },
    });
  }, [logEvent]);

  // ==================== EVENTOS DE NAVEGAÇÃO ====================

  // Ver guia
  const logGuideView = useCallback(() => {
    logEvent({
      eventType: 'PAGE_VIEW_GUIDE',
      eventCategory: 'NAVIGATION',
      description: 'Consultou o Guia de Treinamento',
    });
  }, [logEvent]);

  // Ver admin
  const logAdminView = useCallback(() => {
    logEvent({
      eventType: 'PAGE_VIEW_ADMIN',
      eventCategory: 'NAVIGATION',
      description: 'Acessou painel Administrativo',
    });
  }, [logEvent]);

  // Ver supervisão
  const logSupervisionView = useCallback(() => {
    logEvent({
      eventType: 'PAGE_VIEW_SUPERVISION',
      eventCategory: 'NAVIGATION',
      description: 'Acessou painel de Supervisão',
    });
  }, [logEvent]);

  // Mudar filtro
  const logFilterChanged = useCallback((filterType: string, filterValue: string) => {
    logEvent({
      eventType: 'FILTER_CHANGED',
      eventCategory: 'NAVIGATION',
      description: `Filtrou por ${filterType}: ${filterValue}`,
      metadata: { filterType, filterValue },
    });
  }, [logEvent]);

  // ==================== EVENTOS DE ALUNO ====================

  // Entrada manual
  const logManualEntry = useCallback((memberName: string, memberEvoId?: number, reason?: string) => {
    logEvent({
      eventType: 'MANUAL_ENTRY',
      eventCategory: 'MEMBER',
      description: `Entrada manual: ${reason || 'Catraca indisponível'}`,
      memberName,
      memberEvoId,
      metadata: { reason },
      isWarning: true,
    });
  }, [logEvent]);

  // Expandir card do aluno
  const logMemberExpanded = useCallback((memberName: string, memberEvoId?: number, queueId?: string) => {
    logEvent({
      eventType: 'MEMBER_EXPANDED',
      eventCategory: 'MEMBER',
      description: `Expandiu detalhes do aluno`,
      memberName,
      memberEvoId,
      queueId,
    });
  }, [logEvent]);

  // Checkout de aluno
  const logCheckout = useCallback((memberName: string, reason?: string, memberEvoId?: number, queueId?: string) => {
    const reasonLabels: Record<string, string> = {
      finished: 'Treino completo',
      left: 'Saiu mais cedo',
      emergency: 'Emergência',
      other: 'Outro motivo',
    };
    logEvent({
      eventType: 'ATTENDANCE_END',
      eventCategory: 'MEMBER',
      description: `Checkout: ${reasonLabels[reason || ''] || reason || 'Finalizado'}`,
      memberName,
      memberEvoId,
      queueId,
      metadata: { reason, checkoutType: 'manual' },
      isPositive: reason === 'finished',
    });
  }, [logEvent]);

  // ==================== LISTENERS AUTOMÁTICOS ====================

  useEffect(() => {
    if (!enabled || !coachId || !coachName) return;

    // Registrar início de sessão uma vez
    if (!sessionStarted.current) {
      sessionStarted.current = true;
      logSessionStart();
    }

    // Listener para visibilidade da página
    const handleVisibilityChange = () => {
      if (document.hidden && !isDocumentHidden.current) {
        isDocumentHidden.current = true;
        logEvent({
          eventType: 'APP_MINIMIZED',
          eventCategory: 'SYSTEM',
          description: 'Saiu do sistema (aba minimizada/trocada)',
        });
      } else if (!document.hidden && isDocumentHidden.current) {
        isDocumentHidden.current = false;
        logEvent({
          eventType: 'APP_RESTORED',
          eventCategory: 'SYSTEM',
          description: 'Voltou ao sistema',
        });
      }
    };

    // Listener para fechamento da página
    const handleBeforeUnload = () => {
      // Usar sendBeacon para garantir envio mesmo no fechamento
      const data = JSON.stringify({
        coachId,
        coachName,
        eventType: 'SESSION_END',
        eventCategory: 'SYSTEM',
        description: 'Encerrou sessão (fechou/recarregou página)',
      });
      navigator.sendBeacon('/api/activity-log', data);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, coachId, coachName, logEvent, logSessionStart]);

  return {
    // Função genérica
    logEvent,
    
    // Eventos de sistema
    logSessionStart,
    logSessionEnd,
    
    // Eventos de atendimento
    logAttendanceStart,
    logAttendanceEnd,
    logAttendanceAutoEnd,
    logAttendanceOvertime,
    
    // Eventos de notificação
    logNotificationSent,
    
    // Eventos de navegação
    logGuideView,
    logAdminView,
    logSupervisionView,
    logFilterChanged,
    
    // Eventos de aluno
    logManualEntry,
    logMemberExpanded,
    logCheckout,
  };
}
