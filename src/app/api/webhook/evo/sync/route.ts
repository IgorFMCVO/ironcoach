// ============================================================================
// CAMINHO: src/app/api/webhook/evo/sync/route.ts
// ============================================================================

// src/app/api/webhook/evo/sync/route.ts
// ============================================================================
// IRON COACH v12 - Sincronização EVO
// 
// FEATURES:
// - Detecção de desistência (frequência esperada vs real)
// - Identificação de Personal/Autônomo
// - Dados completos do treino
// - Auto-cleanup 90 minutos
// - FOTO DO MEMBRO (v13)
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EVO_DNS = process.env.EVO_DNS || 'academiaimpacto';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

// Log das variáveis (sem expor a key completa)
console.log('[EVO Config] DNS:', EVO_DNS, '| API Key exists:', !!EVO_API_KEY, '| Key length:', EVO_API_KEY?.length || 0);

function basicAuth(): string {
  return Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64');
}

function parseEvoDate(dateStr: string): { isoUtc: string; displayTime: string } | null {
  if (!dateStr) return null;
  try {
    const timePart = dateStr.split('T')[1]?.slice(0, 5) || '00:00';
    if (/[zZ]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
      return { isoUtc: new Date(dateStr).toISOString(), displayTime: timePart };
    }
    const isoWithTz = `${dateStr}-03:00`;
    const isoUtc = new Date(isoWithTz).toISOString();
    return { isoUtc, displayTime: timePart };
  } catch {
    return null;
  }
}

// ============================================================================
// TIPOS
// ============================================================================

interface ChurnStatus {
  isRisk: boolean;
  level: 'NORMAL' | 'ATENCAO' | 'CRITICO' | 'URGENTE';
  freq15_21: number;
  freq08_14: number;
  freqAtual: number;
  frequenciaEsperada: number;
}

interface MemberAlerts {
  semFicha: boolean;
  fichaVencida: boolean;
  semAvaliacao: boolean;
  avaliacaoVencida: boolean;
  semMonitoramento: boolean;
}

interface WorkoutInfo {
  idTreino: number | null;
  nomeTreino: string | null;
  serieAtual: string | null;
  tags: string[];
  dataValidade: string | null;
  frequenciaSemana: number;
  sessoesConcluidas: number;
  quantidadeSessoes: number;
  nomeProfessor: string | null;
}

interface RetentionScore {
  total: number;           // 0-100
  frequencia: number;      // 0-50
  ficha: number;           // 0-25
  avaliacao: number;       // 0-25
  phase: 'ONBOARDING' | 'ADAPTACAO' | 'CONSOLIDACAO' | 'AUTONOMIA';
  phaseMultiplier: number;
}

interface MemberInfo {
  daysAsMember: number;
  priority: string;
  tags: string[];
  alerts: MemberAlerts;
  workout: WorkoutInfo | null;
  churn: ChurnStatus;
  isPersonal: boolean;
  membershipName: string | null;
  retentionScore: RetentionScore;
  photoUrl: string | null;
}

// ============================================================================
// CÁLCULO DE RETENTION SCORE
// ============================================================================

function calculateRetentionScore(
  alerts: MemberAlerts,
  churn: ChurnStatus,
  daysAsMember: number
): RetentionScore {
  // Determinar fase do membro
  let phase: RetentionScore['phase'];
  let phaseMultiplier: number;
  
  if (daysAsMember <= 14) {
    phase = 'ONBOARDING';
    phaseMultiplier = 2.0;
  } else if (daysAsMember <= 30) {
    phase = 'ADAPTACAO';
    phaseMultiplier = 1.5;
  } else if (daysAsMember <= 90) {
    phase = 'CONSOLIDACAO';
    phaseMultiplier = 1.0;
  } else {
    phase = 'AUTONOMIA';
    phaseMultiplier = 0.8;
  }
  
  // FREQUÊNCIA (50% do score)
  // Usar freq atual se disponível, senão freq da semana passada
  const freqReal = churn.freqAtual > 0 ? churn.freqAtual : churn.freq08_14;
  // Se não tem frequência esperada definida, assume 5x por semana
  const freqEsperada = churn.frequenciaEsperada > 0 ? churn.frequenciaEsperada : 5;
  
  let frequencia = 0;
  if (freqReal > 0) {
    // Só ganha pontos se tem frequência real
    const freqRatio = Math.min(1, freqReal / freqEsperada);
    frequencia = Math.round(freqRatio * 50);
  }
  // Se freq real é 0, frequência = 0 (não está vindo treinar!)
  
  // FICHA DE TREINO (25% do score)
  let ficha = 0;
  if (!alerts.semFicha && !alerts.fichaVencida) {
    ficha = 25; // Ficha válida
  } else if (alerts.fichaVencida) {
    ficha = 12; // Ficha vencida (metade)
  }
  // Sem ficha = 0
  
  // AVALIAÇÃO FÍSICA (25% do score)
  let avaliacao = 0;
  if (!alerts.semAvaliacao && !alerts.avaliacaoVencida) {
    avaliacao = 25; // Avaliação válida
  } else if (alerts.avaliacaoVencida) {
    avaliacao = 12; // Avaliação vencida (metade)
  }
  // Sem avaliação = 0
  
  const total = frequencia + ficha + avaliacao;
  
  return {
    total,
    frequencia,
    ficha,
    avaliacao,
    phase,
    phaseMultiplier,
  };
}

// ============================================================================
// PRIORIDADE E TAGS
// ============================================================================

function calculatePriority(daysAsMember: number, alerts: MemberAlerts, churn: ChurnStatus, isPersonal: boolean): string {
  // Personal sempre BLUE
  if (isPersonal) return 'BLUE';
  
  // =====================================================
  // VETERANOS (90+ dias) - Tratamento especial
  // Não devem ficar RED só por causa de churn
  // =====================================================
  if (daysAsMember > 90) {
    // Veterano sem ficha = YELLOW (precisa criar, mas não é urgente)
    if (alerts.semFicha) return 'YELLOW';
    // Veterano com ficha vencida = YELLOW
    if (alerts.fichaVencida || alerts.avaliacaoVencida) return 'YELLOW';
    // Veterano com risco de churn = ORANGE (atenção, mas já tem hábito)
    if (churn.level === 'URGENTE' || churn.level === 'CRITICO') return 'ORANGE';
    if (churn.level === 'ATENCAO') return 'YELLOW';
    // Veterano ok = GREEN
    return 'GREEN';
  }
  
  // =====================================================
  // MEMBROS INTERMEDIÁRIOS (31-90 dias)
  // =====================================================
  if (daysAsMember > 30) {
    // Sem ficha = precisa atenção
    if (alerts.semFicha) return 'ORANGE';
    // Ficha/aval vencida = precisa renovar
    if (alerts.fichaVencida || alerts.avaliacaoVencida) return 'ORANGE';
    // Risco de churn crítico = RED
    if (churn.level === 'URGENTE' || churn.level === 'CRITICO') return 'RED';
    // Risco de churn atenção = ORANGE
    if (churn.level === 'ATENCAO') return 'ORANGE';
    // Mês 2 (31-60) = YELLOW
    if (daysAsMember <= 60) return 'YELLOW';
    // Mês 3 (61-90) = GREEN
    return 'GREEN';
  }
  
  // =====================================================
  // NOVATOS (1-30 dias) - Precisam de MUITA atenção
  // =====================================================
  
  // Primeira semana SEM FICHA = EMERGÊNCIA
  if (alerts.semFicha && daysAsMember <= 7) return 'RED';
  
  // Primeira semana = RED (mesmo com ficha, precisa acompanhar)
  if (daysAsMember <= 7) return 'RED';
  
  // Semanas 2-4 sem ficha ou avaliação = ORANGE
  if (alerts.semFicha || alerts.semAvaliacao) return 'ORANGE';
  
  // Semanas 2-4 com ficha vencida = ORANGE
  if (alerts.fichaVencida || alerts.avaliacaoVencida) return 'ORANGE';
  
  // Risco de churn em novato = RED
  if (churn.level === 'URGENTE' || churn.level === 'CRITICO') return 'RED';
  
  // Atenção de churn em novato = ORANGE
  if (churn.level === 'ATENCAO') return 'ORANGE';
  
  // Novato normal (8-30 dias) = ORANGE
  return 'ORANGE';
}

function generateTags(daysAsMember: number, alerts: MemberAlerts, workout: WorkoutInfo | null, churn: ChurnStatus): string[] {
  const tags: string[] = [];
  
  if (churn.level === 'URGENTE') tags.push('🚨 URGENTE');
  else if (churn.level === 'CRITICO') tags.push('🔴 CRÍTICO');
  
  if (alerts.semFicha) tags.push('SEM FICHA');
  if (alerts.semAvaliacao) tags.push('SEM AVALIAÇÃO');
  if (alerts.fichaVencida) tags.push('FICHA VENCIDA');
  if (alerts.avaliacaoVencida) tags.push('AVAL. VENCIDA');
  if (alerts.semMonitoramento && daysAsMember <= 60) tags.push('SEM MONITOR.');
  
  if (workout?.tags?.length) tags.push(...workout.tags.slice(0, 2));
  if (workout?.serieAtual) tags.push(`Série ${workout.serieAtual.toUpperCase()}`);
  
  if (daysAsMember <= 7) tags.push('1ª SEMANA');
  else if (daysAsMember <= 14) tags.push('2ª SEMANA');
  else if (daysAsMember <= 30) tags.push('PRIMEIRO MÊS');
  else if (daysAsMember > 180) tags.push('VETERANO');
  
  return tags;
}

// ============================================================================
// CACHE
// ============================================================================

const memberCache = new Map<number, { data: MemberInfo; cachedAt: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos (reduzido para dados mais atualizados)

// ============================================================================
// CALCULAR FREQUÊNCIA (DETECÇÃO DE DESISTÊNCIA)
// Usando SEMANAS DE CALENDÁRIO (Domingo a Sábado)
// ============================================================================

async function calculateChurnStatus(idMember: number, frequenciaEsperada: number, authB64: string): Promise<ChurnStatus> {
  // FREQUÊNCIA PADRÃO: 5x por semana se não tiver definido no treino
  const freqEsperadaReal = frequenciaEsperada > 0 ? frequenciaEsperada : 5;
  
  const defaultStatus: ChurnStatus = {
    isRisk: false,
    level: 'NORMAL',
    freq15_21: 0,
    freq08_14: 0,
    freqAtual: 0,
    frequenciaEsperada: freqEsperadaReal,
  };
  
  try {
    // =========================================================================
    // CORREÇÃO CRÍTICA: Calcular tudo no timezone do Brasil (-03:00)
    // O servidor Vercel roda em UTC, mas os dados do EVO são do Brasil
    // =========================================================================
    
    const now = new Date();
    
    // Offset do Brasil em minutos (-3 horas = -180 minutos)
    const BRAZIL_OFFSET_MINUTES = -180;
    
    // Criar uma data "virtual" que representa o horário atual no Brasil
    // Isso é apenas para calcular corretamente qual é o "dia" no Brasil
    const nowBrazilMs = now.getTime() + (now.getTimezoneOffset() + BRAZIL_OFFSET_MINUTES) * 60 * 1000;
    const nowBrazil = new Date(nowBrazilMs);
    
    console.log(`[Churn] Membro ${idMember} - Horários:`);
    console.log(`  Servidor (UTC): ${now.toISOString()}`);
    console.log(`  Brasil virtual: ${nowBrazil.toISOString()}`);
    console.log(`  Dia da semana Brasil: ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][nowBrazil.getDay()]}`);
    
    // =========================================================================
    // CALCULAR SEMANAS DE CALENDÁRIO (Domingo a Sábado) - LÓGICA SIMPLIFICADA
    // Mesma lógica do resync-one que FUNCIONA!
    // =========================================================================
    
    const dayOfWeek = nowBrazil.getDay();
    const startOfThisWeek = new Date(nowBrazil);
    startOfThisWeek.setDate(nowBrazil.getDate() - dayOfWeek);
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    const startOf2WeeksAgo = new Date(startOfLastWeek);
    startOf2WeeksAgo.setDate(startOf2WeeksAgo.getDate() - 7);
    
    console.log(`[Churn] Membro ${idMember} - Semanas:`);
    console.log(`  Esta semana desde: ${startOfThisWeek.toISOString().split('T')[0]}`);
    console.log(`  Sem passada desde: ${startOfLastWeek.toISOString().split('T')[0]}`);
    console.log(`  2 sem atrás desde: ${startOf2WeeksAgo.toISOString().split('T')[0]}`);
    
    // Buscar 30 dias para ter margem
    const date30DaysAgo = new Date(nowBrazil.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateStartParam = date30DaysAgo.toISOString().split('T')[0];
    
    const entriesUrl = `https://evo-integracao-api.w12app.com.br/api/v1/entries?idMember=${idMember}&registerDateStart=${dateStartParam}&take=200`;
    
    console.log(`[Churn] URL de entradas: ${entriesUrl}`);
    
    // =========================================================================
    // RETRY: Tentar até 3 vezes se falhar
    // =========================================================================
    let entries: any[] = [];
    let lastError: string | null = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const resp = await fetch(entriesUrl, {
          headers: { Authorization: `Basic ${authB64}` },
          cache: 'no-store',
        });
        
        console.log(`[Churn] Tentativa ${attempt} - HTTP: ${resp.status}`);
        
        if (!resp.ok) {
          lastError = `HTTP ${resp.status}`;
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 500 * attempt)); // Espera progressiva
            continue;
          }
        } else {
          const data = await resp.json();
          if (Array.isArray(data)) {
            entries = data;
            break;
          } else {
            lastError = 'Resposta não é array';
            console.log(`[Churn] Resposta não é array:`, JSON.stringify(data).substring(0, 200));
          }
        }
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : 'Erro desconhecido';
        console.error(`[Churn] Tentativa ${attempt} falhou:`, lastError);
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }
    }
    
    if (entries.length === 0 && lastError) {
      console.error(`[Churn] ⚠️ FALHA ao buscar entradas do membro ${idMember} após 3 tentativas: ${lastError}`);
      // IMPORTANTE: Retorna default mas loga claramente o erro
      return defaultStatus;
    }
    
    console.log(`[Churn] Membro ${idMember}: ${entries.length} entradas encontradas`);
    
    // Debug: mostrar primeira entrada se existir
    if (entries.length > 0) {
      console.log(`[Churn] Exemplo de entrada:`, JSON.stringify(entries[0]).substring(0, 300));
    }
    
    // Sets para garantir 1 entrada por dia por semana
    const daysThisWeek = new Set<string>();
    const daysLastWeek = new Set<string>();
    const daysTwoWeeksAgo = new Set<string>();
    
    for (const entry of entries) {
      if (!entry.date) continue;
      
      // Adicionar timezone do Brasil se não tiver
      let entryDateStr = entry.date;
      if (!entryDateStr.includes('+') && !entryDateStr.includes('Z') && !entryDateStr.endsWith('-03:00')) {
        entryDateStr = entryDateStr + '-03:00';
      }
      
      const entryDate = new Date(entryDateStr);
      if (isNaN(entryDate.getTime())) {
        console.log(`[Churn] Data inválida: ${entry.date}`);
        continue;
      }
      
      // Extrair apenas a data (YYYY-MM-DD)
      const dayKey = entry.date.split('T')[0];
      
      // =====================================================================
      // COMPARAÇÃO SIMPLIFICADA - Mesma lógica do resync-one que FUNCIONA!
      // Usar comparação direta de Date >= Date
      // =====================================================================
      if (entryDate >= startOfThisWeek) {
        daysThisWeek.add(dayKey);
        console.log(`[Churn]   ${dayKey} -> Esta semana ✓`);
      } else if (entryDate >= startOfLastWeek) {
        daysLastWeek.add(dayKey);
        console.log(`[Churn]   ${dayKey} -> Sem passada ✓`);
      } else if (entryDate >= startOf2WeeksAgo) {
        daysTwoWeeksAgo.add(dayKey);
        console.log(`[Churn]   ${dayKey} -> 2 sem atrás ✓`);
      }
    }
    
    const freqAtual = daysThisWeek.size;      // Esta semana
    const freq08_14 = daysLastWeek.size;       // Semana passada
    const freq15_21 = daysTwoWeeksAgo.size;    // 2 semanas atrás
    
    console.log(`[Churn] Membro ${idMember} RESULTADO: Esta sem=${freqAtual}, Sem passada=${freq08_14}, 2 sem atrás=${freq15_21}, Esperada=${freqEsperadaReal}`);
    
    // =========================================================================
    // DETECÇÃO DE DESISTÊNCIA
    // Baseada nas duas últimas semanas COMPLETAS (não a atual)
    // =========================================================================
    
    let level: ChurnStatus['level'] = 'NORMAL';
    let isRisk = false;
    
    // Indicadores de risco baseados nas semanas passadas
    const quedaSemanal = freq08_14 < freq15_21;
    const quedaPercentual = freq15_21 > 0 ? ((freq15_21 - freq08_14) / freq15_21) * 100 : 0;
    const freqMuitoBaixa = freq08_14 < freqEsperadaReal * 0.4; // Menos de 40% do esperado
    const freqBaixa = freq08_14 < freqEsperadaReal * 0.6; // Menos de 60% do esperado
    const ausenciaTotal = freq08_14 === 0 && freq15_21 > 0; // Parou completamente
    const semanaPassadaVazia = freq08_14 <= 1;
    
    // URGENTE: Padrão claro de desistência
    if (ausenciaTotal || (quedaSemanal && quedaPercentual >= 50 && semanaPassadaVazia)) {
      level = 'URGENTE';
      isRisk = true;
      console.log(`[Churn] ⚠️ URGENTE: Membro ${idMember} - Possível desistência! ${freq15_21}x→${freq08_14}x`);
    }
    // CRITICO: Queda significativa
    else if ((quedaSemanal && quedaPercentual >= 50) || (freqMuitoBaixa && freq15_21 >= freqEsperadaReal * 0.5)) {
      level = 'CRITICO';
      isRisk = true;
      console.log(`[Churn] 🔴 CRÍTICO: Membro ${idMember} - Queda ${quedaPercentual.toFixed(0)}%`);
    }
    // ATENCAO: Sinal de alerta
    else if (quedaSemanal || freqBaixa) {
      level = 'ATENCAO';
      isRisk = true;
      console.log(`[Churn] 🟡 ATENÇÃO: Membro ${idMember}`);
    }
    
    return { isRisk, level, freq15_21, freq08_14, freqAtual, frequenciaEsperada: freqEsperadaReal };
  } catch (e) {
    console.error('[Churn] Erro ao calcular:', e);
    return defaultStatus;
  }
}

// ============================================================================
// BUSCAR DADOS DO MEMBRO
// ============================================================================

async function getMemberInfo(idMember: number, authB64: string): Promise<MemberInfo> {
  const cached = memberCache.get(idMember);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.data;
  }

  let daysAsMember = 30;
  let isPersonal = false;
  let membershipName: string | null = null;
  let photoUrl: string | null = null;
  
  const alerts: MemberAlerts = {
    semFicha: false,
    fichaVencida: false,
    semAvaliacao: false,
    avaliacaoVencida: false,
    semMonitoramento: true,
  };
  
  let workout: WorkoutInfo | null = null;
  let frequenciaSemana = 0;

  try {
    // 1. Buscar dados do membro (API v2 para ter a foto)
    console.log(`[getMemberInfo] Buscando membro ${idMember}...`);
    const memberResp = await fetch(
      `https://evo-integracao-api.w12app.com.br/api/v2/members/${idMember}`,
      { headers: { Authorization: `Basic ${authB64}` }, cache: 'no-store' }
    );

    if (memberResp.ok) {
      const memberData = await memberResp.json();
      console.log(`[getMemberInfo] Membro ${idMember} encontrado:`, memberData.firstName);
      
      // Capturar URL da foto
      if (memberData.photo) {
        photoUrl = memberData.photo;
        console.log(`[getMemberInfo] Foto encontrada: ${photoUrl?.substring(0, 50)}...`);
      }
      
      const registerDate = memberData.registerDate || memberData.createdAt;
      if (registerDate) {
        daysAsMember = Math.max(0, Math.floor((Date.now() - new Date(registerDate).getTime()) / (1000 * 60 * 60 * 24)));
      }
      
      // CORREÇÃO: Verificar apenas NOME e SOBRENOME do aluno, NÃO o plano
      // Alunos de personal geralmente têm "PERSONAL" no nome/sobrenome como identificador
      const firstName = (memberData.firstName || memberData.name || '').toUpperCase();
      const lastName = (memberData.lastName || '').toUpperCase();
      isPersonal = firstName.includes('PERSONAL') || lastName.includes('PERSONAL');
      
      const membership = memberData.membership || memberData.memberships?.[0];
      if (membership) {
        membershipName = membership.name || membership.membershipName || null;
        // NÃO verificar mais o nome do plano - apenas nome/sobrenome do aluno
        
        // AVALIAÇÃO: Vamos buscar nas SALES (assessmentEndDate sempre vem null)
        // A lógica de avaliação será feita abaixo, após buscar as sales
      }
    } else {
      console.error(`[getMemberInfo] Erro ao buscar membro ${idMember}: ${memberResp.status}`);
    }

    // 2. Buscar SALES do membro para verificar avaliações
    console.log(`[getMemberInfo] Buscando sales do membro ${idMember} para verificar avaliações...`);
    try {
      const salesResp = await fetch(
        `https://evo-integracao-api.w12app.com.br/api/v1/sales?idMember=${idMember}&take=100`,
        { headers: { Authorization: `Basic ${authB64}` }, cache: 'no-store' }
      );
      
      if (salesResp.ok) {
        const salesData = await salesResp.json();
        
        // IDs de serviços de avaliação conhecidos
        const avaliacaoServiceIds = [157, 158, 159, 160, 163, 164, 168, 169, 185, 186, 187, 188];
        const avaliacaoKeywords = ['AVALIA', 'BIOIMPEDÂNCIA', 'BIOIMPEDANCIA', 'REAVALIA'];
        
        // Procurar por vendas de avaliação
        let ultimaAvaliacaoDate: Date | null = null;
        
        for (const sale of salesData) {
          const saleDate = sale.saleDate ? new Date(sale.saleDate) : null;
          
          // Verificar cada item da venda
          for (const item of (sale.saleItens || [])) {
            const isAvaliacaoById = avaliacaoServiceIds.includes(item.idService);
            const itemName = (item.item || item.description || '').toUpperCase();
            const isAvaliacaoByName = avaliacaoKeywords.some(kw => itemName.includes(kw));
            
            if ((isAvaliacaoById || isAvaliacaoByName) && saleDate) {
              if (!ultimaAvaliacaoDate || saleDate > ultimaAvaliacaoDate) {
                ultimaAvaliacaoDate = saleDate;
                console.log(`[getMemberInfo] Avaliação encontrada: "${item.item}" em ${saleDate.toISOString()}`);
              }
            }
          }
        }
        
        // Definir status da avaliação
        if (!ultimaAvaliacaoDate) {
          alerts.semAvaliacao = true;
          console.log(`[getMemberInfo] Membro ${idMember}: SEM AVALIAÇÃO (nunca comprou)`);
        } else {
          const diasDesdeAvaliacao = Math.floor((Date.now() - ultimaAvaliacaoDate.getTime()) / (1000 * 60 * 60 * 24));
          const VALIDADE_AVALIACAO_DIAS = 60; // Avaliação vence em 60 dias
          
          if (diasDesdeAvaliacao > VALIDADE_AVALIACAO_DIAS) {
            alerts.avaliacaoVencida = true;
            console.log(`[getMemberInfo] Membro ${idMember}: AVALIAÇÃO VENCIDA (${diasDesdeAvaliacao} dias desde última)`);
          } else {
            console.log(`[getMemberInfo] Membro ${idMember}: Avaliação OK (${diasDesdeAvaliacao} dias desde última)`);
          }
        }
      } else {
        console.error(`[getMemberInfo] Erro ao buscar sales ${idMember}: ${salesResp.status}`);
        // Se não conseguir buscar sales, marcar como sem avaliação por segurança
        alerts.semAvaliacao = true;
      }
    } catch (salesError) {
      console.error(`[getMemberInfo] Erro ao processar sales ${idMember}:`, salesError);
      alerts.semAvaliacao = true;
    }

    // 3. Buscar treinos
    console.log(`[getMemberInfo] Buscando treinos do membro ${idMember}...`);
    const workoutResp = await fetch(
      `https://evo-integracao-api.w12app.com.br/api/v1/workout/default-client-workout?idClient=${idMember}`,
      { headers: { Authorization: `Basic ${authB64}` }, cache: 'no-store' }
    );

    if (workoutResp.ok) {
      const workoutData = await workoutResp.json();
      const treinos = workoutData.treinos || [];
      console.log(`[getMemberInfo] Treinos encontrados: ${treinos.length}`);
      
      if (treinos.length === 0) {
        alerts.semFicha = true;
        console.log(`[getMemberInfo] Membro ${idMember}: SEM FICHA`);
      } else {
        const treino = treinos[0];
        const dataValidade = treino.dataValidade;
        
        console.log(`[getMemberInfo] Membro ${idMember}: Ficha "${treino.nomeTreino}", Validade: ${dataValidade || 'não definida'}`);
        
        if (dataValidade) {
          const validadeDate = new Date(dataValidade);
          const hoje = new Date();
          const diasRestantes = Math.floor((validadeDate.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          
          if (validadeDate < hoje) {
            alerts.fichaVencida = true;
            console.log(`[getMemberInfo] ⚠️ FICHA VENCIDA há ${Math.abs(diasRestantes)} dias`);
          } else if (diasRestantes <= 7) {
            console.log(`[getMemberInfo] ⏰ Ficha vence em ${diasRestantes} dias`);
          }
        }
        
        let serieAtual = treino.series?.[0]?.nome || null;
        if (treino.idSerieAtual && treino.series) {
          const serieEncontrada = treino.series.find((s: any) => s.idSerie === treino.idSerieAtual);
          if (serieEncontrada) serieAtual = serieEncontrada.nome?.trim() || serieAtual;
        }
        
        frequenciaSemana = treino.frequenciaSemana || 0;
        
        workout = {
          idTreino: treino.idTreino || null,
          nomeTreino: treino.nomeTreino || null,
          serieAtual,
          tags: (treino.tags || []).map((t: any) => t.nome).filter(Boolean),
          dataValidade: dataValidade || null,
          frequenciaSemana,
          sessoesConcluidas: treino.sessoesConcluidas || 0,
          quantidadeSessoes: treino.quantidadeSessoes || 0,
          nomeProfessor: treino.nomeProfessor || null,
        };
      }
    } else {
      console.error(`[getMemberInfo] Erro ao buscar treinos ${idMember}: ${workoutResp.status}`);
      alerts.semFicha = true;
    }

    // 3. Buscar serviços
    console.log(`[getMemberInfo] Buscando serviços do membro ${idMember}...`);
    const servicesResp = await fetch(
      `https://evo-integracao-api.w12app.com.br/api/v1/members/services?idMember=${idMember}`,
      { headers: { Authorization: `Basic ${authB64}` }, cache: 'no-store' }
    );

    if (servicesResp.ok) {
      const services = await servicesResp.json();
      const temMonitoramento = (services || []).some((s: any) => 
        s.nameService?.toUpperCase().includes('MONITORAMENTO') ||
        s.nameService?.toUpperCase().includes('ACOMPANHAMENTO')
      );
      alerts.semMonitoramento = !temMonitoramento;
    } else {
      console.error(`[getMemberInfo] Erro ao buscar serviços ${idMember}: ${servicesResp.status}`);
    }

    // 4. Calcular churn
    const churn = await calculateChurnStatus(idMember, frequenciaSemana, authB64);
    console.log(`[getMemberInfo] Resultado para ${idMember}: alerts=`, alerts, `churn=`, churn.level);

    // 5. Calcular Retention Score
    const retentionScore = calculateRetentionScore(alerts, churn, daysAsMember);
    console.log(`[getMemberInfo] Retention Score para ${idMember}: ${retentionScore.total}%`);

    const priority = calculatePriority(daysAsMember, alerts, churn, isPersonal);
    const tags = generateTags(daysAsMember, alerts, workout, churn);

    const result: MemberInfo = { 
      daysAsMember, priority, tags, alerts, workout, churn, isPersonal, membershipName, retentionScore, photoUrl 
    };
    
    memberCache.set(idMember, { data: result, cachedAt: Date.now() });
    return result;

  } catch (e) {
    console.error('Erro ao buscar membro:', e);
    const churn: ChurnStatus = {
      isRisk: false, level: 'NORMAL', freq15_21: 0, freq08_14: 0, freqAtual: 0, frequenciaEsperada: 3 // Default 3x/semana
    };
    const defaultRetentionScore: RetentionScore = {
      total: 25, frequencia: 0, ficha: 0, avaliacao: 25, phase: 'CONSOLIDACAO', phaseMultiplier: 1.0
    };
    return {
      daysAsMember, priority: 'YELLOW', tags: [], alerts, workout: null, churn, isPersonal: false, membershipName: null, retentionScore: defaultRetentionScore, photoUrl: null
    };
  }
}

// ============================================================================
// ENDPOINT GET - SYNC
// ============================================================================

export async function GET() {
  try {
    console.log('[SYNC] Iniciando sincronização...');
    
    if (!EVO_API_KEY) {
      console.error('[SYNC] EVO_API_KEY não configurada!');
      return NextResponse.json({ success: false, error: 'EVO_API_KEY não configurada' }, { status: 500 });
    }

    const auth = basicAuth();
    const now = Date.now();

    // 1) Auto-cleanup 90 min
    const cutoffIso = new Date(now - 90 * 60 * 1000).toISOString();
    const { data: cleanedUp } = await supabase
      .from('queue')
      .update({ check_out_time: new Date().toISOString(), status: 'CHECKED_OUT', exit_type: 'AUTO', exit_reason: 'timeout_90min' })
      .lt('check_in_time', cutoffIso)
      .is('check_out_time', null)
      .select('id');
    
    if (cleanedUp && cleanedUp.length > 0) {
      console.log(`[SYNC] Cleanup: ${cleanedUp.length} membros removidos por timeout`);
    }

    // 2) Ler ponteiro
    const { data: scRow } = await supabase
      .from('sync_control')
      .select('last_entry_time')
      .eq('id', 'evo_sync')
      .maybeSingle();

    const defaultStart = new Date(now - 60 * 60 * 1000).toISOString();
    const startIso = scRow?.last_entry_time || defaultStart;
    console.log(`[SYNC] Buscando desde: ${startIso}`);

    // 3) Buscar entradas EVO
    const evoUrl = `https://evo-integracao-api.w12app.com.br/api/v1/entries?registerDateStart=${encodeURIComponent(startIso)}&take=250`;
    console.log(`[SYNC] URL EVO: ${evoUrl}`);
    
    const evoResponse = await fetch(evoUrl, { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' });

    if (!evoResponse.ok) {
      return NextResponse.json({ success: false, error: 'Erro EVO API', status: evoResponse.status }, { status: 500 });
    }

    const entriesRaw = await evoResponse.json();

    const validEntries = (entriesRaw || [])
      .filter((e: any) => e.entryType === 'Controle de acesso' && e.idMember && e.nameMember)
      .map((e: any) => {
        const parsed = parseEvoDate(e.date);
        return parsed ? { ...e, _isoUtc: parsed.isoUtc, _displayTime: parsed.displayTime } : null;
      })
      .filter((e: any) => e !== null)
      .sort((a: any, b: any) => new Date(a._isoUtc).getTime() - new Date(b._isoUtc).getTime());

    // 4) Processar
    let added = 0, removed = 0, skipped = 0;
    const addedMembers: any[] = [];
    const removedMembers: any[] = [];
    let lastProcessedIso: string | null = null;

    for (const entry of validEntries) {
      const memberId = Number(entry.idMember);
      const memberName = String(entry.nameMember).trim();
      const entryIsoUtc = entry._isoUtc;
      const displayTime = entry._displayTime;

      const key = `${memberId}:${entryIsoUtc}`;
      
      const { data: existingEntry } = await supabase
        .from('evo_entries')
        .select('id')
        .eq('evo_entry_key', key)
        .maybeSingle();

      if (existingEntry) { skipped++; continue; }

      const { data: activeEntry } = await supabase
        .from('queue')
        .select('id')
        .eq('evo_member_id', memberId)
        .is('check_out_time', null)
        .maybeSingle();

      if (activeEntry) {
        await supabase.from('queue')
          .update({ check_out_time: new Date().toISOString(), status: 'CHECKED_OUT', exit_type: 'EVO_TOGGLE' })
          .eq('id', activeEntry.id);
        removed++;
        removedMembers.push({ idMember: memberId, name: memberName, time: displayTime });
      } else {
        const memberInfo = await getMemberInfo(memberId, auth);
        
        await supabase.from('queue').insert({
          evo_member_id: memberId,
          member_name: memberName,
          member_photo_url: memberInfo.photoUrl,
          status: 'TRAINING',
          priority: memberInfo.priority,
          help_requested: memberInfo.priority === 'RED' || memberInfo.churn.isRisk,
          check_in_source: 'evo_sync',
          tags: memberInfo.tags,
          days_as_member: memberInfo.daysAsMember,
          check_in_time: entryIsoUtc,
          workout_name: memberInfo.workout?.nomeTreino || null,
          workout_letter: memberInfo.workout?.serieAtual || null,
          workout_id: memberInfo.workout?.idTreino || null,
          is_personal: memberInfo.isPersonal,
          churn_level: memberInfo.churn.level,
          freq_esperada: memberInfo.churn.frequenciaEsperada || memberInfo.workout?.frequenciaSemana || 3,
          freq_15_21: memberInfo.churn.freq15_21,
          freq_08_14: memberInfo.churn.freq08_14,
          freq_atual: memberInfo.churn.freqAtual, // Frequência da semana atual
          workout_valid_until: memberInfo.workout?.dataValidade || null,
          sessions_done: memberInfo.workout?.sessoesConcluidas || 0,
          sessions_total: memberInfo.workout?.quantidadeSessoes || 0,
          retention_score: memberInfo.retentionScore.total,
          has_ficha: !memberInfo.alerts.semFicha,
          has_avaliacao: !memberInfo.alerts.semAvaliacao,
          ficha_vencida: memberInfo.alerts.fichaVencida,
          avaliacao_vencida: memberInfo.alerts.avaliacaoVencida,
        });
        added++;
        addedMembers.push({
          idMember: memberId,
          name: memberName,
          time: displayTime,
          priority: memberInfo.priority,
          tags: memberInfo.tags,
          workout: memberInfo.workout,
          alerts: memberInfo.alerts,
          churn: memberInfo.churn,
          isPersonal: memberInfo.isPersonal,
          photoUrl: memberInfo.photoUrl,
        });
      }

      try {
        await supabase.from('evo_entries').insert({
          evo_entry_key: key,
          evo_member_id: memberId,
          member_name: memberName,
          entry_time: entryIsoUtc,
          processed: true,
          source: 'sync',
        });
      } catch {}

      lastProcessedIso = entryIsoUtc;
    }

    // 5) Atualizar ponteiro
    if (lastProcessedIso) {
      await supabase.from('sync_control').upsert(
        { id: 'evo_sync', last_entry_time: lastProcessedIso, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    }

    // =========================================================================
    // AUTO-CORREÇÃO: Atualizar frequência de membros com freq_atual=0
    // Isso corrige membros que entraram com frequência zerada por erro de API
    // Processa até 5 membros por sync para não sobrecarregar
    // =========================================================================
    let autoFixedCount = 0;
    try {
      const { data: membersToFix } = await supabase
        .from('queue')
        .select('id, evo_member_id, member_name, freq_atual, freq_08_14, freq_15_21, has_ficha, ficha_vencida, has_avaliacao, avaliacao_vencida')
        .is('check_out_time', null)
        .eq('freq_atual', 0)
        .eq('freq_08_14', 0)
        .not('evo_member_id', 'is', null)
        .limit(5);

      if (membersToFix && membersToFix.length > 0) {
        console.log(`[SYNC] Auto-correção: ${membersToFix.length} membros com frequência zerada`);
        
        // Calcular datas das semanas
        const now = new Date();
        const BRAZIL_OFFSET_MINUTES = -180;
        const nowBrazilMs = now.getTime() + (now.getTimezoneOffset() + BRAZIL_OFFSET_MINUTES) * 60 * 1000;
        const nowBrazil = new Date(nowBrazilMs);
        
        const dayOfWeek = nowBrazil.getDay();
        const startOfThisWeek = new Date(nowBrazil);
        startOfThisWeek.setDate(nowBrazil.getDate() - dayOfWeek);
        startOfThisWeek.setHours(0, 0, 0, 0);
        
        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        
        const startOf2WeeksAgo = new Date(startOfLastWeek);
        startOf2WeeksAgo.setDate(startOf2WeeksAgo.getDate() - 7);

        const date30DaysAgo = new Date(nowBrazil.getTime() - 30 * 24 * 60 * 60 * 1000);
        const dateStartParam = date30DaysAgo.toISOString().split('T')[0];

        for (const member of membersToFix) {
          try {
            const entriesUrl = `https://evo-integracao-api.w12app.com.br/api/v1/entries?idMember=${member.evo_member_id}&registerDateStart=${dateStartParam}&take=200`;
            const entriesResp = await fetch(entriesUrl, { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' });
            
            if (!entriesResp.ok) continue;
            
            const entries = await entriesResp.json();
            if (!Array.isArray(entries)) continue;

            const diasSemanaAtual = new Set<string>();
            const diasSemanaPassada = new Set<string>();
            const dias2SemanasAtras = new Set<string>();
            
            for (const entry of entries) {
              if (!entry.date) continue;
              let entryDateStr = entry.date;
              if (!entryDateStr.includes('+') && !entryDateStr.includes('Z') && !entryDateStr.endsWith('-03:00')) {
                entryDateStr = entryDateStr + '-03:00';
              }
              const entryDate = new Date(entryDateStr);
              if (isNaN(entryDate.getTime())) continue;
              const diaKey = entry.date.split('T')[0];
              
              if (entryDate >= startOfThisWeek) {
                diasSemanaAtual.add(diaKey);
              } else if (entryDate >= startOfLastWeek) {
                diasSemanaPassada.add(diaKey);
              } else if (entryDate >= startOf2WeeksAgo) {
                dias2SemanasAtras.add(diaKey);
              }
            }

            const freqAtual = diasSemanaAtual.size;
            const freq08_14 = diasSemanaPassada.size;
            const freq15_21 = dias2SemanasAtras.size;

            // Só atualiza se realmente tem frequência
            if (freqAtual > 0 || freq08_14 > 0 || freq15_21 > 0) {
              // Calcular retention_score
              let retentionScore = 0;
              const freqReal = freqAtual > 0 ? freqAtual : freq08_14;
              if (freqReal > 0) {
                retentionScore += Math.min(50, Math.round((freqReal / 3) * 50));
              }
              if (member.has_ficha && !member.ficha_vencida) retentionScore += 25;
              else if (member.has_ficha && member.ficha_vencida) retentionScore += 12;
              if (member.has_avaliacao && !member.avaliacao_vencida) retentionScore += 25;
              else if (member.has_avaliacao && member.avaliacao_vencida) retentionScore += 12;

              await supabase
                .from('queue')
                .update({ freq_atual: freqAtual, freq_08_14: freq08_14, freq_15_21: freq15_21, retention_score: retentionScore })
                .eq('id', member.id);

              autoFixedCount++;
              console.log(`[SYNC] ✅ Auto-corrigido: ${member.member_name} (${freqAtual}/${freq08_14}/${freq15_21})`);
            }
          } catch (fixErr) {
            console.error(`[SYNC] Erro ao auto-corrigir ${member.member_name}:`, fixErr);
          }
        }
      }
    } catch (autoFixErr) {
      console.error('[SYNC] Erro na auto-correção:', autoFixErr);
    }
    // =========================================================================

    // 6) Buscar ativos
    const { data: activeQueue } = await supabase
      .from('queue')
      .select('*')
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false });

    const allActiveEntries = (activeQueue || []).map((q: any) => {
      const checkInDate = new Date(q.check_in_time);
      const brHours = checkInDate.getUTCHours() - 3;
      const adjustedHours = brHours < 0 ? brHours + 24 : brHours;
      const displayTime = `${String(adjustedHours).padStart(2, '0')}:${String(checkInDate.getUTCMinutes()).padStart(2, '0')}`;
      
      return {
        name: q.member_name,
        time: displayTime,
        priority: q.priority,
        tags: q.tags,
        daysAsMember: q.days_as_member,
        isPersonal: q.is_personal || false,
        churnLevel: q.churn_level || 'NORMAL',
        photoUrl: q.member_photo_url || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        evoEntries: validEntries.length,
        added,
        removed,
        skipped,
        autoFixed: autoFixedCount,
        addedMembers,
        removedMembers,
        allActiveEntries,
        debug: { startIso, lastProcessedIso, totalActive: allActiveEntries.length }
      },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, error: 'Erro interno', details: String(error?.message) }, { status: 500 });
  }
}
