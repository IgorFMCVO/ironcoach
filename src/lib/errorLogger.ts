// ============================================================================
// IRON COACH - Utilitário para Log de Erros
// Facilita o registro de erros de qualquer parte do sistema
// ============================================================================

type ErrorSource = 'api' | 'frontend' | 'evo' | 'supabase' | 'webhook';

interface LogErrorParams {
  source: ErrorSource;
  endpoint?: string;
  action: string;
  error: Error | string | unknown;
  errorCode?: string;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  coachId?: string;
  coachName?: string;
  memberName?: string;
  memberEvoId?: number;
}

/**
 * Registra um erro no sistema de logs
 * Uso:
 *   await logError({
 *     source: 'evo',
 *     action: 'search_member',
 *     error: e,
 *     memberName: 'João Silva',
 *   });
 */
export async function logError(params: LogErrorParams): Promise<void> {
  const {
    source,
    endpoint,
    action,
    error,
    errorCode,
    requestData,
    responseData,
    coachId,
    coachName,
    memberName,
    memberEvoId,
  } = params;

  // Extrair mensagem e stack do erro
  let errorMessage = 'Erro desconhecido';
  let errorStack: string | undefined;

  if (error instanceof Error) {
    errorMessage = error.message;
    errorStack = error.stack;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    errorMessage = JSON.stringify(error);
  }

  // Log no console imediatamente
  console.error(`[${source.toUpperCase()}] ${action}: ${errorMessage}`);
  
  try {
    // Enviar para API de logs
    const response = await fetch('/api/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        endpoint,
        action,
        errorMessage,
        errorCode,
        errorStack,
        requestData,
        responseData,
        coachId,
        coachName,
        memberName,
        memberEvoId,
      }),
    });

    if (!response.ok) {
      console.warn('Não foi possível salvar log de erro no servidor');
    }
  } catch (e) {
    // Falha silenciosa - não queremos causar mais erros
    console.warn('Falha ao enviar log de erro:', e);
  }
}

/**
 * Versão simplificada para erros de API
 */
export async function logApiError(
  action: string,
  error: unknown,
  requestData?: Record<string, any>,
  responseData?: Record<string, any>
): Promise<void> {
  return logError({
    source: 'api',
    action,
    error,
    requestData,
    responseData,
  });
}

/**
 * Versão simplificada para erros do EVO
 */
export async function logEvoError(
  action: string,
  error: unknown,
  memberName?: string,
  memberEvoId?: number,
  requestData?: Record<string, any>
): Promise<void> {
  return logError({
    source: 'evo',
    action,
    error,
    memberName,
    memberEvoId,
    requestData,
  });
}

/**
 * Versão simplificada para erros de frontend
 */
export async function logFrontendError(
  action: string,
  error: unknown,
  coachId?: string,
  coachName?: string
): Promise<void> {
  return logError({
    source: 'frontend',
    action,
    error,
    coachId,
    coachName,
  });
}

/**
 * Hook para usar em componentes React
 */
export function useErrorLogger(coachId?: string, coachName?: string) {
  const log = async (action: string, error: unknown, extra?: Partial<LogErrorParams>) => {
    return logError({
      source: 'frontend',
      action,
      error,
      coachId,
      coachName,
      ...extra,
    });
  };

  return { logError: log };
}
