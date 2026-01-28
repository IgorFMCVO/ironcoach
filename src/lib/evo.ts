// ============================================================================
// IRON COACH - Integração com API EVO (ABC Evo / W12)
// Documentação: https://api.abcevo.com
// ============================================================================

const EVO_API_BASE = 'https://evo-integracao-api.w12app.com.br/api/v1';
const EVO_DNS = process.env.EVO_DNS || 'academiaimpacto';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

// Gera o header de autenticação Basic Auth
function getAuthHeader(): string {
  const credentials = `${EVO_DNS}:${EVO_API_KEY}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

// Headers padrão para todas as requisições
function getHeaders(): HeadersInit {
  return {
    'Authorization': getAuthHeader(),
    'Content-Type': 'application/json',
  };
}

// ============================================================================
// TIPOS
// ============================================================================

export interface EvoMember {
  idMember: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  cellphone: string;
  photo: string;
  document: string; // CPF
  birthDate: string;
  gender: string;
  registerDate: string;
  idBranch: number;
  branchName: string;
  status: string;
  // Contrato
  idMembership: number;
  membershipName: string;
  membershipStartDate: string;
  membershipEndDate: string;
}

export interface EvoEntry {
  idEntry: number;
  idMember: number;
  memberName: string;
  idBranch: number;
  entryDate: string;
  entryTime: string;
  entryType: string; // "Entrada" | "Saída"
  device: string;
}

export interface EvoWebhookPayload {
  IdW12: number;
  IdBranch: number;
  IdRecord: number;
  EventType: string;
  ApiCallback: string;
}

export interface EvoWorkout {
  idWorkout: number;
  name: string;
  letter: string;
  idMember: number;
  startDate: string;
  endDate: string;
  exercises: EvoExercise[];
}

export interface EvoExercise {
  idExercise: number;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  observation: string;
}

// ============================================================================
// FUNÇÕES DE API
// ============================================================================

/**
 * Busca dados de um membro pelo ID
 */
export async function getMemberById(idMember: number): Promise<EvoMember | null> {
  try {
    const response = await fetch(`${EVO_API_BASE}/members/${idMember}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.error(`EVO API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar membro no EVO:', error);
    return null;
  }
}

/**
 * Busca dados de uma entrada pelo ID
 */
export async function getEntryById(idEntry: number): Promise<EvoEntry | null> {
  try {
    const response = await fetch(`${EVO_API_BASE}/entries?idEntry=${idEntry}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      console.error(`EVO API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.error('Erro ao buscar entrada no EVO:', error);
    return null;
  }
}

/**
 * Busca entradas por data
 */
export async function getEntriesByDate(date: string): Promise<EvoEntry[]> {
  try {
    const response = await fetch(
      `${EVO_API_BASE}/entries?registerDateStart=${date}&registerDateEnd=${date}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      console.error(`EVO API Error: ${response.status} ${response.statusText}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar entradas no EVO:', error);
    return [];
  }
}

/**
 * Busca treinos de um membro
 */
export async function getMemberWorkouts(idMember: number): Promise<EvoWorkout[]> {
  try {
    const response = await fetch(
      `${EVO_API_BASE}/workout?idMember=${idMember}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      console.error(`EVO API Error: ${response.status} ${response.statusText}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar treinos no EVO:', error);
    return [];
  }
}

/**
 * Busca membros ativos
 */
export async function getActiveMembers(skip = 0, take = 50): Promise<EvoMember[]> {
  try {
    const response = await fetch(
      `${EVO_API_BASE}/members/active?skip=${skip}&take=${take}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      console.error(`EVO API Error: ${response.status} ${response.statusText}`);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar membros ativos no EVO:', error);
    return [];
  }
}

/**
 * Busca membro por email ou documento
 */
export async function searchMember(query: string): Promise<EvoMember | null> {
  try {
    // Tenta buscar por email
    let response = await fetch(
      `${EVO_API_BASE}/members?email=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    let data = await response.json();
    if (data && data.length > 0) {
      return data[0];
    }

    // Tenta buscar por documento (CPF)
    const cleanDoc = query.replace(/\D/g, '');
    response = await fetch(
      `${EVO_API_BASE}/members?document=${cleanDoc}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    data = await response.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Erro ao buscar membro no EVO:', error);
    return null;
  }
}

// ============================================================================
// WEBHOOKS
// ============================================================================

/**
 * Registra um webhook no EVO
 */
export async function registerWebhook(
  eventType: string,
  urlCallback: string,
  idBranch?: number
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      eventType,
      urlCallback,
    };

    if (idBranch) {
      body.idBranch = idBranch.toString();
    }

    const response = await fetch(`${EVO_API_BASE}/webhook`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Erro ao registrar webhook: ${error}`);
      return false;
    }

    console.log(`Webhook ${eventType} registrado com sucesso!`);
    return true;
  } catch (error) {
    console.error('Erro ao registrar webhook:', error);
    return false;
  }
}

/**
 * Lista webhooks registrados
 */
export async function listWebhooks(): Promise<unknown[]> {
  try {
    const response = await fetch(`${EVO_API_BASE}/webhook`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao listar webhooks:', error);
    return [];
  }
}

/**
 * Remove um webhook
 */
export async function deleteWebhook(idWebhook: number): Promise<boolean> {
  try {
    const response = await fetch(`${EVO_API_BASE}/webhook/${idWebhook}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    return response.ok;
  } catch (error) {
    console.error('Erro ao remover webhook:', error);
    return false;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calcula dias como membro
 */
export function calculateDaysAsMember(registerDate: string): number {
  const start = new Date(registerDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determina prioridade baseada nos dias como membro e retenção
 * 
 * BLACK = Tem "personal" no nome (treina com personal trainer)
 * BLUE  = 180+ dias E retenção > 50% (autônomo veterano que treina bem sozinho)
 * 
 * Para os demais, baseado em tempo de casa:
 * RED    = 1-7 dias (1ª semana)
 * ORANGE = 8-14 dias (2ª semana)
 * YELLOW = 15-30 dias (Mês 1)
 * GREEN  = 31-90 dias (Mês 2-3)
 * Após 90 dias, se retenção <= 50% continua GREEN, se > 50% vai para BLUE
 */
export function calculatePriority(
  daysAsMember: number,
  helpRequested = false,
  retentionScore = 50,
  memberName = ''
): 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'BLACK' {
  // BLACK: tem "personal" no nome ou sobrenome (case insensitive)
  const nameUpper = memberName.toUpperCase();
  if (nameUpper.includes('PERSONAL')) {
    return 'BLACK';
  }
  
  // Pedido de ajuda sempre é vermelho
  if (helpRequested) return 'RED';
  
  // BLUE: Veterano autônomo (180+ dias E retenção > 50%)
  if (daysAsMember > 180 && retentionScore > 50) {
    return 'BLUE';
  }
  
  // Prioridades baseadas em tempo de casa
  if (daysAsMember <= 7) return 'RED';     // 1ª semana
  if (daysAsMember <= 14) return 'ORANGE'; // 2ª semana
  if (daysAsMember <= 30) return 'YELLOW'; // 3ª-4ª semana (Mês 1)
  return 'GREEN';                           // 31+ dias (veterano não autônomo)
}

/**
 * Gera tags baseadas no perfil do membro
 */
export function generateTags(
  daysAsMember: number,
  totalWorkouts: number,
  isNewWorkout = false
): string[] {
  const tags: string[] = [];

  if (totalWorkouts === 0) tags.push('1º TREINO');
  
  if (daysAsMember <= 7) tags.push('1ª SEMANA');
  else if (daysAsMember <= 14) tags.push('SEMANA 2');
  else if (daysAsMember <= 21) tags.push('SEMANA 3');
  else if (daysAsMember <= 30) tags.push('SEMANA 4');
  else if (daysAsMember <= 60) tags.push('MÊS 2');
  else if (daysAsMember > 180) tags.push('VETERANO');

  if (isNewWorkout) tags.push('NOVA FICHA');

  return tags;
}

/**
 * Verifica se a API está configurada
 */
export function isEvoConfigured(): boolean {
  return !!EVO_DNS && !!EVO_API_KEY;
}

/**
 * Retorna configuração atual (sem expor a key)
 */
export function getEvoConfig() {
  return {
    dns: EVO_DNS,
    configured: isEvoConfigured(),
    apiBase: EVO_API_BASE,
  };
}
// ============================================================================
// GESTÃO DE TREINOS (ESCRITA)
// ============================================================================

export interface DefaultWorkout {
  idTreino: number;
  nomeTreino: string;
  series?: WorkoutSeries[];
  tags?: string[];
  observacao?: string;
  dataCriacao?: string;
}

export interface WorkoutSeries {
  idSerie: number;
  nome: string; // A, B, C, etc.
  ordem: number;
  observacao?: string;
  itens?: WorkoutItem[];
  sessoesConcluidas?: number;
}

export interface WorkoutItem {
  idItemSerie: number;
  exercicio: string;
  repeticao: string;
  vezes: string;
  carga?: string;
  intervalo?: string;
  observacao?: string;
  ordem: number;
}

export interface LinkWorkoutParams {
  sourceWorkout: number;          // ID do treino padrão
  idClient: number;               // ID do cliente no EVO
  idPrescriptionEmployee: number; // ID do funcionário que está prescrevendo
  prescriptionDate?: string;      // Data da prescrição (YYYY-MM-DD)
  endAllActiveWorkouts?: boolean; // Encerrar outros treinos ativos
}

export interface UpdateWorkoutParams {
  idWorkout: number;              // ID do treino prescrito
  workoutName?: string;           // Nome do treino
  startDate?: string;             // Data início (YYYY-MM-DD)
  expirationDate?: string;        // Data validade (YYYY-MM-DD)
  observation?: string;           // Observações
  weeklyFrequency?: number;       // Frequência semanal
  totalWeeks?: number;            // Total de semanas
}

export interface EvoApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Buscar todos os treinos padrão disponíveis
 * Endpoint correto: /api/v1/workout/default-workout
 */
export async function getDefaultWorkouts(): Promise<EvoApiResponse<DefaultWorkout[]>> {
  console.log('[EVO] Buscando treinos padrão...');
  console.log('[EVO] Usando credenciais:', EVO_DNS ? `${EVO_DNS}:***` : 'NÃO CONFIGURADO');
  
  try {
    // Endpoint correto conforme documentação EVO
    const url = `${EVO_API_BASE}/workout/default-workout?take=100`;
    console.log(`[EVO] Endpoint: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    });

    console.log(`[EVO] Resposta: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EVO] Erro:`, response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    console.log(`[EVO] Dados recebidos:`, Array.isArray(data) ? `${data.length} treinos` : typeof data);
    
    // A API retorna array direto
    let workouts: DefaultWorkout[] = Array.isArray(data) ? data : [];
    
    // Normalizar campos para o formato esperado
    workouts = workouts.map((w: any) => ({
      idTreino: w.idTreino,
      nomeTreino: w.nomeTreino || 'Treino sem nome',
      series: w.series || [],
      tags: w.tags || [],
      observacao: w.observacao || '',
      dataCriacao: w.dataCriacao || '',
    })).filter(w => w.idTreino); // Filtrar apenas treinos com ID válido

    if (workouts.length > 0) {
      console.log(`[EVO] ✅ ${workouts.length} treinos padrão encontrados`);
      console.log('[EVO] Primeiros treinos:', workouts.slice(0, 5).map(w => `${w.idTreino}: ${w.nomeTreino}`));
      return { success: true, data: workouts };
    }
    
    console.log('[EVO] Nenhum treino padrão encontrado');
    return { success: false, error: 'Nenhum treino padrão cadastrado no EVO', data: [] };
    
  } catch (error) {
    console.error(`[EVO] Exceção:`, error);
    return { success: false, error: String(error), data: [] };
  }
}

/**
 * Vincular um treino padrão a um cliente
 * POST /api/v1/workout/link-workout-to-client
 */
export async function linkWorkoutToClient(params: LinkWorkoutParams): Promise<EvoApiResponse> {
  try {
    // Montar query string conforme documentação EVO
    const queryParams = new URLSearchParams({
      sourceWorkoutId: String(params.sourceWorkout),
      idPrescriptionEmployee: String(params.idPrescriptionEmployee),
      idClient: String(params.idClient),
    });
    
    if (params.prescriptionDate) {
      queryParams.append('prescriptionDate', params.prescriptionDate);
    }
    
    if (params.endAllActiveWorkouts !== undefined) {
      queryParams.append('endAllActiveWorkouts', String(params.endAllActiveWorkouts));
    }

    const url = `${EVO_API_BASE}/workout/link-workout-to-client?${queryParams.toString()}`;
    console.log('📋 [EVO] Vinculando treino - URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
    });

    // Tratar resposta (pode ser vazia ou boolean)
    const responseText = await response.text();
    console.log('📋 [EVO] Response status:', response.status);
    console.log('📋 [EVO] Response text:', responseText);

    let data: any = null;
    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch {
        // Pode ser só "true" ou "false"
        if (responseText.trim() === 'true') {
          return { success: true, data: { linked: true } };
        }
        if (response.ok) {
          return { success: true, data: { message: responseText } };
        }
      }
    }

    if (!response.ok) {
      console.error('❌ [EVO] Erro ao vincular treino:', response.status, data || responseText);
      return { success: false, error: data?.message || data?.mensagens?.join(', ') || `HTTP ${response.status}` };
    }

    console.log('✅ [EVO] Treino vinculado com sucesso');
    return { success: true, data: data || { linked: true } };
  } catch (error) {
    console.error('❌ [EVO] Erro ao vincular treino:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Alterar dados de um treino prescrito (validade, nome, observação, etc.)
 * PUT /api/v1/workout
 */
export async function updateClientWorkout(params: UpdateWorkoutParams): Promise<EvoApiResponse> {
  try {
    const body: Record<string, unknown> = {
      idWorkout: params.idWorkout,
    };

    // Adicionar apenas campos que foram passados
    if (params.workoutName) body.workoutName = params.workoutName;
    if (params.startDate) body.startDate = params.startDate;
    if (params.expirationDate) body.expirationDate = params.expirationDate;
    if (params.observation !== undefined) body.observation = params.observation;
    if (params.weeklyFrequency) body.weeklyFrequency = params.weeklyFrequency;
    if (params.totalWeeks) body.totalWeeks = params.totalWeeks;

    console.log('📝 [EVO] Atualizando treino - URL:', `${EVO_API_BASE}/workout`);
    console.log('📝 [EVO] Atualizando treino - Body:', JSON.stringify(body));

    const response = await fetch(`${EVO_API_BASE}/workout`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    console.log('📝 [EVO] Response status:', response.status);

    // Tentar parsear JSON, mas tratar resposta vazia
    let data: any = null;
    const responseText = await response.text();
    
    console.log('📝 [EVO] Response text:', responseText?.substring(0, 500));

    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log('⚠️ Resposta não é JSON:', responseText);
        // Se não é JSON mas status é OK, considerar sucesso
        if (response.ok) {
          return { success: true, data: { message: 'Treino atualizado' } };
        }
      }
    }

    // Resposta vazia com status OK = sucesso
    if (!responseText && response.ok) {
      console.log('✅ Treino atualizado (resposta vazia)');
      return { success: true, data: { message: 'Treino atualizado' } };
    }

    if (!response.ok || data?.success === false) {
      console.error('❌ Erro ao atualizar treino:', response.status, data || responseText);
      return { success: false, error: data?.message || data?.mensagens?.join(', ') || `HTTP ${response.status}` };
    }

    console.log('✅ Treino atualizado com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro ao atualizar treino (exception):', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Renovar validade de um treino
 * Usa o próprio treino atual do aluno como source para criar nova prescrição
 */
export async function renewWorkoutValidity(
  idWorkout: number, 
  daysToAdd: number = 30,
  idClient?: number,
  idPrescriptionEmployee: number = 222 // Default: Igor
): Promise<EvoApiResponse> {
  console.log(`🔄 [EVO] Renovando treino ${idWorkout} para cliente ${idClient} (+${daysToAdd} dias)`);
  
  if (!idClient) {
    return { success: false, error: 'ID do cliente não informado para renovação' };
  }

  try {
    // 1. Buscar treino atual do aluno para confirmar que existe
    console.log(`🔄 [EVO] Buscando treino atual do aluno ${idClient}...`);
    const clientWorkoutsResp = await fetch(
      `${EVO_API_BASE}/workout/default-client-workout?idClient=${idClient}`,
      { headers: getHeaders(), cache: 'no-store' }
    );
    
    if (!clientWorkoutsResp.ok) {
      return { success: false, error: 'Não foi possível buscar treinos do aluno' };
    }
    
    const clientWorkoutsData = await clientWorkoutsResp.json();
    const treinos = clientWorkoutsData.treinos || [];
    
    const treinoAtual = treinos.find((t: any) => t.idTreino === idWorkout);
    if (!treinoAtual) {
      return { success: false, error: `Treino ${idWorkout} não encontrado para o aluno` };
    }
    
    const nomeTreinoAtual = treinoAtual.nomeTreino;
    console.log(`🔄 [EVO] Treino atual: "${nomeTreinoAtual}" (ID: ${idWorkout})`);

    // 2. NOVA ABORDAGEM: Usar o próprio treino do aluno como source
    // A documentação diz "treino existente" - não precisa ser padrão!
    console.log(`🔄 [EVO] Tentando re-vincular usando o próprio treino ${idWorkout} como source...`);
    
    const result = await linkWorkoutToClient({
      sourceWorkout: idWorkout, // Usar o PRÓPRIO treino como source!
      idClient,
      idPrescriptionEmployee,
      endAllActiveWorkouts: true, // Encerra o treino atual
    });
    
    if (result.success) {
      console.log(`✅ [EVO] Treino renovado com sucesso usando próprio ID como source!`);
      return {
        success: true,
        data: {
          method: 'self-relink',
          message: `Treino "${nomeTreinoAtual}" renovado com sucesso!`
        }
      };
    }
    
    console.log(`⚠️ [EVO] Self-relink falhou: ${result.error}. Tentando buscar treino padrão...`);

    // 3. FALLBACK: Tentar encontrar treino padrão com mesmo nome
    console.log(`🔄 [EVO] Buscando treino padrão correspondente...`);
    const defaultWorkoutsResult = await getDefaultWorkouts();
    
    if (defaultWorkoutsResult.success && defaultWorkoutsResult.data?.length) {
      const treinoPadrao = defaultWorkoutsResult.data.find((tp: DefaultWorkout) => 
        tp.nomeTreino === nomeTreinoAtual ||
        tp.nomeTreino?.toLowerCase() === nomeTreinoAtual?.toLowerCase()
      );
      
      if (treinoPadrao) {
        console.log(`🔄 [EVO] Encontrado modelo padrão: ${treinoPadrao.idTreino}`);
        
        const resultPadrao = await linkWorkoutToClient({
          sourceWorkout: treinoPadrao.idTreino,
          idClient,
          idPrescriptionEmployee,
          endAllActiveWorkouts: true,
        });
        
        if (resultPadrao.success) {
          console.log(`✅ [EVO] Treino renovado via modelo padrão!`);
          return {
            success: true,
            data: {
              method: 'standard-relink',
              message: `Treino "${nomeTreinoAtual}" renovado com sucesso!`
            }
          };
        }
      }
    }
    
    // 4. Se nada funcionou, retornar erro com sugestão
    const treinosPadraoNomes = defaultWorkoutsResult.data
      ?.slice(0, 5)
      .map((t: DefaultWorkout) => t.nomeTreino)
      .join(', ') || 'Nenhum disponível';
    
    return { 
      success: false, 
      error: `Não foi possível renovar o treino "${nomeTreinoAtual}" automaticamente. Use "Vincular Treino" e escolha um dos modelos: ${treinosPadraoNomes}` 
    };
    
  } catch (error) {
    console.error('❌ [EVO] Erro ao renovar treino:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Formatar data para exibição (DD/MM/YYYY)
 */
export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

/**
 * Calcular dias restantes de validade
 */
export function getDaysUntilExpiration(expirationDate: string | null | undefined): number | null {
  if (!expirationDate) return null;
  
  const expDate = new Date(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);
  
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Verificar se treino está vencido
 */
export function isWorkoutExpired(expirationDate: string | null | undefined): boolean {
  const days = getDaysUntilExpiration(expirationDate);
  return days !== null && days < 0;
}

// ============================================================================
// BUSCA DE MEMBROS AVANÇADA
// ============================================================================

/**
 * Busca membros por nome (retorna lista)
 */
export async function searchMembersByName(name: string): Promise<EvoMember[]> {
  try {
    const response = await fetch(
      `${EVO_API_BASE}/members?name=${encodeURIComponent(name)}&take=20`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      console.error('Erro ao buscar membros:', response.status);
      return [];
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) return [];
    
    // Garantir que cada membro tenha o nome completo
    return data.map((member: any) => ({
      ...member,
      // Compor nome completo se não existir
      name: member.name || 
        [member.firstName, member.lastName].filter(Boolean).join(' ') ||
        `Aluno #${member.idMember}`,
    }));
  } catch (error) {
    console.error('Erro ao buscar membros por nome:', error);
    return [];
  }
}

// ============================================================================
// CONTROLE DE ACESSO - ENTRADA MANUAL
// ============================================================================

// URL base para API v2 (controle de acesso usa v2)
const EVO_API_V2_BASE = 'https://evo-integracao-api.w12app.com.br/api/v2';

interface ManualLiberationParams {
  idTurnstile: number;      // ID da catraca (pode usar um padrão)
  reason: string;           // Motivo da liberação
  idMember: number;         // ID do membro no EVO
  personType?: number;      // 1=Aluno, 2=Prospect, 3=Funcionário, 4=Personal
  idEmployAuthorization: number; // ID do funcionário que autorizou
}

interface ManualLiberationResponse {
  idManualLiberation: number;
}

interface EntryAuthorizeParams {
  id: number;               // ID do membro
  personType: number;       // Tipo de pessoa
  device: number;           // 1=Digital, 2=QR, 3=Facial, 4=Teclado
  idManualEntry?: number;   // ID da liberação manual
  idTurnstile: number;      // ID da catraca
}

interface EntryAuthorizeResponse {
  authorized: boolean;
  message: string;
  messageCustom?: string;
  entryId?: number;
  photoUrl?: string;
  name?: string;
  id: number;
  passageDirection?: string;
  blockedtype: number;
  frequency: number;
  planName?: string;
  planExpiration?: string;
}

/**
 * Registra uma liberação manual no EVO
 * Passo 1 do fluxo de entrada manual
 */
export async function insertManualLiberation(
  params: ManualLiberationParams
): Promise<EvoApiResponse<ManualLiberationResponse>> {
  try {
    const requestBody = {
      idTurnstile: params.idTurnstile,
      reason: params.reason,
      id: params.idMember,                    // ID do ALUNO
      personType: params.personType || 1,     // 1 = Aluno
      idEmployAuthorization: params.idEmployAuthorization,  // ID do ADMIN que autoriza
    };
    
    console.log(`[insertManualLiberation] URL: ${EVO_API_V2_BASE}/accessControl/insertManualLiberation`);
    console.log(`[insertManualLiberation] Body:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${EVO_API_V2_BASE}/accessControl/insertManualLiberation`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestBody),
    });

    console.log(`[insertManualLiberation] HTTP Status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[insertManualLiberation] Erro:`, errorData);
      return {
        success: false,
        error: errorData.mensagens?.join(', ') || `Erro ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`[insertManualLiberation] Sucesso:`, data);
    return { success: true, data };
  } catch (error) {
    console.error('[insertManualLiberation] Erro de conexão:', error);
    return { success: false, error: 'Erro de conexão com EVO' };
  }
}

/**
 * Autoriza a entrada no EVO
 * Passo 2 do fluxo de entrada manual
 */
export async function authorizeEntry(
  params: EntryAuthorizeParams
): Promise<EvoApiResponse<EntryAuthorizeResponse>> {
  try {
    const response = await fetch(`${EVO_API_V2_BASE}/accessControl/entryAuthorize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        id: params.id,
        personType: params.personType,
        device: params.device,
        idManualEntry: params.idManualEntry || null,
        idTurnstile: params.idTurnstile,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.mensagens?.join(', ') || `Erro ${response.status}`,
      };
    }

    const data = await response.json();
    
    // Verificar se foi autorizado
    if (!data.authorized) {
      return {
        success: false,
        error: data.message || 'Entrada não autorizada',
        data,
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Erro ao autorizar entrada:', error);
    return { success: false, error: 'Erro de conexão com EVO' };
  }
}

/**
 * Fluxo completo de entrada manual no EVO
 * 1. Registra liberação manual
 * 2. Autoriza a entrada
 */
export async function registerManualEntryInEvo(params: {
  idMember: number;
  reason: string;
  idEmployAuthorization?: number; // Ignorado - sempre usaremos ID fixo
  idTurnstile?: number;  // Opcional - usa padrão se não informado
}): Promise<EvoApiResponse<{ 
  idManualLiberation: number; 
  entryId?: number;
  authorized: boolean;
  message: string;
}>> {
  // ========================================================================
  // CONFIGURAÇÃO - Academia Impacto / Limit Fitness
  // ========================================================================
  const DEFAULT_TURNSTILE = 6; // catraca Henry 8x SF - Limit Fitness (idBranch: 3)
  
  // IMPORTANTE: Sempre usar ID fixo do administrador para autorização
  // O idEmployee = 2 tem permissão de gerente/admin no EVO
  const ADMIN_EMPLOYEE_ID = 2;

  console.log(`[ManualEntry] Registrando entrada manual para membro ${params.idMember}`);
  console.log(`[ManualEntry] Usando idEmployAuthorization fixo: ${ADMIN_EMPLOYEE_ID}`);
  console.log(`[ManualEntry] Usando idTurnstile: ${DEFAULT_TURNSTILE}`);

  try {
    // Registrar liberação manual (isso já registra a entrada no EVO)
    console.log(`[ManualEntry] Chamando insertManualLiberation...`);
    const liberationResult = await insertManualLiberation({
      idTurnstile: params.idTurnstile || DEFAULT_TURNSTILE,
      reason: params.reason,
      idMember: params.idMember,  // ID do ALUNO
      personType: 1, // 1 = Aluno (SEMPRE)
      idEmployAuthorization: ADMIN_EMPLOYEE_ID, // ID fixo do admin
    });

    console.log(`[ManualEntry] Resultado liberação:`, liberationResult);

    if (!liberationResult.success || !liberationResult.data) {
      console.error(`[ManualEntry] Falha na liberação:`, liberationResult.error);
      return {
        success: false,
        error: liberationResult.error || 'Erro ao registrar liberação',
      };
    }

    const idManualLiberation = liberationResult.data.idManualLiberation;
    console.log(`[ManualEntry] ✅ Liberação criada com ID: ${idManualLiberation}`);

    // NOTA: Não chamamos mais entryAuthorize pois:
    // 1. insertManualLiberation já registra a liberação
    // 2. entryAuthorize é para liberar catraca física (não precisamos)
    // 3. entryAuthorize estava dando erro 500

    return {
      success: true,
      data: {
        idManualLiberation,
        authorized: true,
        message: 'Liberação manual registrada com sucesso',
      },
    };
  } catch (error) {
    console.error('[ManualEntry] Erro no fluxo de entrada manual:', error);
    return { success: false, error: 'Erro interno' };
  }
}

// ============================================================================
// APPOINTMENTS - Agendamentos (Avaliação Física, etc)
// ============================================================================

export interface AppointmentActivity {
  idActivity: number;
  name: string;
  description?: string;
  duration?: number;
  idBranch?: number;
}

export interface AppointmentSlot {
  idSession: number;
  date: string;
  startTime: string;
  endTime: string;
  idEmployee?: number;
  employeeName?: string;
  spotsAvailable: number;
  spotsTotal: number;
}

/**
 * Buscar atividades disponíveis para agendamento
 * GET /api/v1/appointment/activities-available
 * 
 * Nota: Na documentação EVO, existem dois endpoints:
 * - /api/v1/appointments/activities (lista todas)
 * - /api/v1/appointment/activities-available (lista disponíveis)
 */
export async function getAppointmentActivities(): Promise<EvoApiResponse<AppointmentActivity[]>> {
  console.log('[EVO] Buscando atividades de agendamento...');
  
  // Tentar primeiro o endpoint de atividades disponíveis
  const endpoints = [
    '/appointment/activities-available',
    '/appointments/activities',
    '/appointment/activities',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${EVO_API_BASE}${endpoint}`;
      console.log(`[EVO] Tentando endpoint: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        cache: 'no-store',
      });

      console.log(`[EVO] Resposta activities (${endpoint}): ${response.status}`);

      if (!response.ok) {
        console.log(`[EVO] Endpoint ${endpoint} falhou com ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log('[EVO] Atividades raw:', JSON.stringify(data).substring(0, 500));
      
      const activities = Array.isArray(data) ? data : (data.data || data.activities || data.result || []);
      
      if (activities.length > 0) {
        console.log(`[EVO] ✅ ${activities.length} atividades encontradas via ${endpoint}`);
        return { 
          success: true, 
          data: activities.map((a: any) => ({
            idActivity: a.idActivity || a.id || a.idAtividade || a.idActivities,
            name: a.name || a.nome || a.activityName || a.description || 'Atividade',
            description: a.description || a.descricao || '',
            duration: a.duration || a.duracao || 30,
            idBranch: a.idBranch || a.idFilial,
          }))
        };
      }
    } catch (error) {
      console.error(`[EVO] Exceção em ${endpoint}:`, error);
    }
  }
  
  // Se nenhum endpoint funcionou, retornar erro
  console.error('[EVO] ❌ Nenhum endpoint de atividades de agendamento funcionou');
  return { success: false, error: 'Não foi possível buscar atividades de agendamento do EVO' };
}

/**
 * Buscar horários disponíveis para agendamento
 * GET /api/v1/appointment/availability
 */
export async function getAppointmentAvailability(
  idActivity: number,
  dateStart: string,
  dateEnd?: string
): Promise<EvoApiResponse<AppointmentSlot[]>> {
  console.log(`[EVO] Buscando disponibilidade para atividade ${idActivity}...`);
  
  try {
    const params = new URLSearchParams({
      idActivity: String(idActivity),
      dateStart,
      dateEnd: dateEnd || dateStart,
    });
    
    const response = await fetch(`${EVO_API_BASE}/appointment/availability?${params}`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    });

    console.log(`[EVO] Resposta availability: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EVO] Erro:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    console.log('[EVO] Horários:', Array.isArray(data) ? `${data.length} encontrados` : typeof data);
    
    const slots = Array.isArray(data) ? data : (data.data || data.slots || data.availability || []);
    
    return { 
      success: true, 
      data: slots.map((s: any) => ({
        idSession: s.idSession || s.id || s.idSessao,
        date: s.date || s.data,
        startTime: s.startTime || s.horaInicio || s.start,
        endTime: s.endTime || s.horaFim || s.end,
        idEmployee: s.idEmployee || s.idFuncionario,
        employeeName: s.employeeName || s.nomeFuncionario || s.professor,
        spotsAvailable: s.spotsAvailable || s.vagasDisponiveis || s.available || 1,
        spotsTotal: s.spotsTotal || s.vagasTotal || s.total || 1,
      }))
    };
  } catch (error) {
    console.error('[EVO] Exceção em getAppointmentAvailability:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Agendar membro em uma sessão de appointment
 * POST /api/v1/appointment/enroll
 */
export async function enrollMemberInAppointment(
  idMember: number,
  idSession: number,
  idActivity?: number
): Promise<EvoApiResponse<{ idEnrollment: number }>> {
  console.log(`[EVO] Agendando membro ${idMember} na sessão ${idSession}...`);
  
  // Tentar diferentes endpoints
  const endpoints = [
    '/appointment/enroll',
    '/appointment/schedule/enroll',
    '/appointments/schedule/enroll',
  ];
  
  const body = {
    idMember,
    idSession,
    ...(idActivity && { idActivity }),
  };
  
  for (const endpoint of endpoints) {
    try {
      const url = `${EVO_API_BASE}${endpoint}`;
      console.log(`[EVO] Tentando agendar via: ${url}`);
      console.log(`[EVO] Body:`, JSON.stringify(body));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });

      console.log(`[EVO] Resposta enroll (${endpoint}): ${response.status}`);

      if (response.status === 404) {
        console.log(`[EVO] Endpoint ${endpoint} não encontrado, tentando próximo...`);
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EVO] Erro:', response.status, errorText);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const data = await response.json();
      console.log('[EVO] ✅ Agendamento criado:', data);
      
      return { 
        success: true, 
        data: {
          idEnrollment: data.idEnrollment || data.id || data.idAgendamento || data.idSchedule || 0,
        }
      };
    } catch (error) {
      console.error(`[EVO] Exceção em ${endpoint}:`, error);
    }
  }
  
  return { success: false, error: 'Não foi possível realizar o agendamento no EVO' };
}
