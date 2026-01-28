// ============================================================================
// IRON COACH - API para Busca de Membros EVO
// GET /api/evo/members?name=... - Busca por nome
// GET /api/evo/members?id=... - Busca por ID com dados completos
// POST /api/evo/members - Entrada manual (registra no EVO + nosso sistema)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  searchMembersByName,
  getMemberById,
  getMemberWorkouts,
  calculateDaysAsMember,
  calculatePriority,
  generateTags,
  registerManualEntryInEvo,
} from '@/lib/evo';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Credenciais EVO - Padronizado para usar as mesmas variáveis do webhook
const EVO_API = 'https://evo-integracao-api.w12app.com.br';
const EVO_DNS = process.env.EVO_DNS || process.env.EVO_API_USER || '';
const EVO_API_KEY = process.env.EVO_API_KEY || process.env.EVO_API_PASS || '';
const EVO_AUTH = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;

// ============================================================================
// FUNÇÃO PARA BUSCAR DADOS COMPLETOS DO MEMBRO (similar ao webhook)
// ============================================================================
async function getCompleteMemberData(idMember: number) {
  const headers = { Authorization: EVO_AUTH, 'Content-Type': 'application/json' };
  
  let daysAsMember = 30;
  let isPersonal = false;
  let membershipName: string | null = null;
  
  const alerts = {
    semFicha: true,
    fichaVencida: false,
    semAvaliacao: true,
    avaliacaoVencida: false,
  };
  
  let workout: { idTreino: number | null; nomeTreino: string | null; serieAtual: string | null; dataValidade: string | null; frequenciaSemana: number } | null = null;
  let churnData = { level: 'NORMAL', freqAtual: 0, freq08_14: 0, freq15_21: 0, frequenciaEsperada: 3 };

  try {
    // 1. Dados do membro
    const memberResp = await fetch(`${EVO_API}/api/v1/members/${idMember}`, { headers, cache: 'no-store' });
    if (memberResp.ok) {
      const memberData = await memberResp.json();
      const registerDate = memberData.registerDate || memberData.createdAt;
      if (registerDate) {
        daysAsMember = Math.max(0, Math.floor((Date.now() - new Date(registerDate).getTime()) / (1000 * 60 * 60 * 24)));
      }
      
      // CORREÇÃO: Verificar apenas NOME e SOBRENOME do aluno, NÃO o plano
      // Alunos de personal geralmente têm "PERSONAL" no nome/sobrenome como identificador
      const firstName = (memberData.firstName || memberData.name || '').toUpperCase();
      const lastName = (memberData.lastName || '').toUpperCase();
      isPersonal = firstName.includes('PERSONAL') || lastName.includes('PERSONAL');
      
      const membership = memberData.memberships?.[0];
      if (membership) {
        membershipName = membership.name || membership.membershipName || null;
        // NÃO verificar mais o nome do plano - apenas nome/sobrenome do aluno
      }
    }

    // 2. Buscar SALES para verificar avaliações
    const salesResp = await fetch(`${EVO_API}/api/v1/sales?idMember=${idMember}&take=100`, { headers, cache: 'no-store' });
    if (salesResp.ok) {
      const salesData = await salesResp.json();
      const avaliacaoServiceIds = [157, 158, 159, 160, 163, 164, 168, 169, 185, 186, 187, 188];
      const avaliacaoKeywords = ['AVALIA', 'BIOIMPEDÂNCIA', 'BIOIMPEDANCIA', 'REAVALIA'];
      
      let ultimaAvaliacaoDate: Date | null = null;
      
      for (const sale of salesData) {
        const saleDate = sale.saleDate ? new Date(sale.saleDate) : null;
        for (const item of (sale.saleItens || [])) {
          const isAvaliacaoById = avaliacaoServiceIds.includes(item.idService);
          const itemName = (item.item || item.description || '').toUpperCase();
          const isAvaliacaoByName = avaliacaoKeywords.some(kw => itemName.includes(kw));
          
          if ((isAvaliacaoById || isAvaliacaoByName) && saleDate) {
            if (!ultimaAvaliacaoDate || saleDate > ultimaAvaliacaoDate) {
              ultimaAvaliacaoDate = saleDate;
            }
          }
        }
      }
      
      const VALIDADE_AVALIACAO_DIAS = 60;
      if (!ultimaAvaliacaoDate) {
        alerts.semAvaliacao = true;
      } else {
        alerts.semAvaliacao = false;
        const diasDesdeAvaliacao = Math.floor((Date.now() - ultimaAvaliacaoDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diasDesdeAvaliacao > VALIDADE_AVALIACAO_DIAS) {
          alerts.avaliacaoVencida = true;
        }
      }
    }

    // 3. Buscar treinos
    const workoutResp = await fetch(`${EVO_API}/api/v1/workout/default-client-workout?idClient=${idMember}`, { headers, cache: 'no-store' });
    if (workoutResp.ok) {
      const workoutData = await workoutResp.json();
      const treinos = workoutData.treinos || [];
      
      if (treinos.length === 0) {
        alerts.semFicha = true;
      } else {
        alerts.semFicha = false;
        const treino = treinos[0];
        const dataValidade = treino.dataValidade;
        
        if (dataValidade && new Date(dataValidade) < new Date()) {
          alerts.fichaVencida = true;
        }
        
        let serieAtual = treino.series?.[0]?.nome || null;
        if (treino.idSerieAtual && treino.series) {
          const serieEncontrada = treino.series.find((s: any) => s.idSerie === treino.idSerieAtual);
          if (serieEncontrada) serieAtual = serieEncontrada.nome?.trim() || serieAtual;
        }
        
        workout = {
          idTreino: treino.idTreino || null,
          nomeTreino: treino.nomeTreino || null,
          serieAtual,
          dataValidade: dataValidade || null,
          frequenciaSemana: treino.frequenciaSemana || 3,
        };
        
        churnData.frequenciaEsperada = workout.frequenciaSemana;
      }
    }

    // 4. Buscar frequência (check-ins)
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Início da semana atual (domingo)
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - dayOfWeek);
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    // Início da semana passada
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    // Início de 2 semanas atrás
    const startOf2WeeksAgo = new Date(startOfLastWeek);
    startOf2WeeksAgo.setDate(startOf2WeeksAgo.getDate() - 7);

    const entriesResp = await fetch(
      `${EVO_API}/api/v1/entries?idMember=${idMember}&registerDateStart=${startOf2WeeksAgo.toISOString()}&registerDateEnd=${now.toISOString()}&take=100`,
      { headers, cache: 'no-store' }
    );
    
    if (entriesResp.ok) {
      const entries = await entriesResp.json();
      
      // Usar Set para contar apenas 1 presença por dia
      const diasSemanaAtual = new Set<string>();
      const diasSemanaPassada = new Set<string>();
      const dias2SemanasAtras = new Set<string>();
      
      for (const entry of entries) {
        // Campo correto é "date" conforme resposta do EVO
        const entryDate = new Date(entry.date || entry.registerDate || entry.entryDate);
        
        if (isNaN(entryDate.getTime())) continue;
        
        // Chave única por dia (YYYY-MM-DD)
        const diaKey = entryDate.toISOString().split('T')[0];
        
        if (entryDate >= startOfThisWeek) {
          diasSemanaAtual.add(diaKey);
        } else if (entryDate >= startOfLastWeek) {
          diasSemanaPassada.add(diaKey);
        } else if (entryDate >= startOf2WeeksAgo) {
          dias2SemanasAtras.add(diaKey);
        }
      }
      
      // Frequência = número de DIAS únicos, não número de entradas
      churnData.freqAtual = diasSemanaAtual.size;
      churnData.freq08_14 = diasSemanaPassada.size;
      churnData.freq15_21 = dias2SemanasAtras.size;
      
      // Determinar nível de churn
      if (churnData.freq15_21 > 0 && churnData.freq08_14 === 0 && churnData.freqAtual === 0) {
        churnData.level = 'URGENTE';
      } else if (churnData.freq15_21 > churnData.freq08_14 && churnData.freq08_14 <= 1) {
        churnData.level = 'CRITICO';
      } else if (churnData.freq15_21 > churnData.freq08_14) {
        churnData.level = 'ATENCAO';
      }
    }

    // Calcular retention score
    let retentionScore = 0;
    
    // Frequência (max 50%)
    const freqReal = churnData.freqAtual > 0 ? churnData.freqAtual : churnData.freq08_14;
    const freqEsperada = churnData.frequenciaEsperada || 3;
    if (freqReal > 0) {
      retentionScore += Math.min(50, (freqReal / freqEsperada) * 50);
    }
    
    // Ficha (max 25%)
    if (!alerts.semFicha && !alerts.fichaVencida) {
      retentionScore += 25;
    } else if (!alerts.semFicha && alerts.fichaVencida) {
      retentionScore += 12.5;
    }
    
    // Avaliação (max 25%)
    if (!alerts.semAvaliacao && !alerts.avaliacaoVencida) {
      retentionScore += 25;
    } else if (!alerts.semAvaliacao && alerts.avaliacaoVencida) {
      retentionScore += 12.5;
    }
    
    retentionScore = Math.round(retentionScore);

    return {
      daysAsMember,
      isPersonal,
      membershipName,
      alerts,
      workout,
      churnData,
      retentionScore,
    };
  } catch (error) {
    console.error(`[getCompleteMemberData] Erro ao buscar dados do membro ${idMember}:`, error);
    return {
      daysAsMember: 30,
      isPersonal: false,
      membershipName: null,
      alerts,
      workout: null,
      churnData,
      retentionScore: 0,
    };
  }
}

// Helper para logar erros no banco
async function logServerError(params: {
  source: string;
  endpoint: string;
  action: string;
  errorMessage: string;
  errorStack?: string;
  requestData?: any;
  responseData?: any;
  coachId?: string;
  coachName?: string;
  memberName?: string;
  memberEvoId?: number;
}) {
  try {
    await supabase.from('error_logs').insert({
      source: params.source,
      endpoint: params.endpoint,
      action: params.action,
      error_message: params.errorMessage,
      error_stack: params.errorStack,
      request_data: params.requestData,
      response_data: params.responseData,
      coach_id: params.coachId,
      coach_name: params.coachName,
      member_name: params.memberName,
      member_evo_id: params.memberEvoId,
    });
  } catch (e) {
    console.error('Falha ao salvar log de erro:', e);
  }
}

/**
 * GET /api/evo/members
 * Buscar membros por nome ou ID
 * ?action=debug&id=X - Retorna dados brutos do EVO para debug
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    // ========================================
    // DEBUG MODE - Retorna dados brutos do EVO
    // ========================================
    if (action === 'debug' && id) {
      const EVO_API = 'https://evo-integracao-api.w12app.com.br';
      const dns = process.env.EVO_DNS || process.env.EVO_API_USER || '';
      const apiKey = process.env.EVO_API_KEY || process.env.EVO_API_PASS || '';
      const authHeader = `Basic ${Buffer.from(`${dns}:${apiKey}`).toString('base64')}`;
      const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };

      const results: Record<string, any> = {
        idMember: id,
        timestamp: new Date().toISOString(),
        endpoints: {},
        analysis: {},
      };

      // 1. Dados do Membro
      try {
        const resp = await fetch(`${EVO_API}/api/v1/members/${id}`, { headers, cache: 'no-store' });
        if (resp.ok) {
          results.endpoints.member = await resp.json();
        } else {
          results.endpoints.member = { error: resp.status, statusText: resp.statusText };
        }
      } catch (e: any) {
        results.endpoints.member = { error: e.message };
      }

      // 2. Treinos do Membro
      try {
        const resp = await fetch(`${EVO_API}/api/v1/workout/default-client-workout?idClient=${id}`, { headers, cache: 'no-store' });
        if (resp.ok) {
          results.endpoints.workouts = await resp.json();
        } else {
          results.endpoints.workouts = { error: resp.status, statusText: resp.statusText };
        }
      } catch (e: any) {
        results.endpoints.workouts = { error: e.message };
      }

      // 3. Atividades agendadas do membro (histórico)
      try {
        const resp = await fetch(`${EVO_API}/api/v1/activities/schedule?idMember=${id}&take=50`, { headers, cache: 'no-store' });
        if (resp.ok) {
          results.endpoints.activities = await resp.json();
        } else {
          results.endpoints.activities = { error: resp.status, statusText: resp.statusText };
        }
      } catch (e: any) {
        results.endpoints.activities = { error: e.message };
      }

      // 4. Serviços de avaliação ativos
      try {
        const resp = await fetch(`${EVO_API}/api/v1/service?active=true&take=50`, { headers, cache: 'no-store' });
        if (resp.ok) {
          const services = await resp.json();
          results.endpoints.evaluationServices = services.filter((s: any) => 
            s.nameService?.toUpperCase().includes('AVALIA') || 
            s.nameService?.toUpperCase().includes('BIOIMPEDÂNCIA') ||
            s.nameService?.toUpperCase().includes('BIOIMPEDANCIA')
          );
        } else {
          results.endpoints.evaluationServices = { error: resp.status, statusText: resp.statusText };
        }
      } catch (e: any) {
        results.endpoints.evaluationServices = { error: e.message };
      }

      // 5. Histórico de VENDAS do membro (aqui podem estar as avaliações compradas)
      try {
        const resp = await fetch(`${EVO_API}/api/v1/sales?idMember=${id}&take=50`, { headers, cache: 'no-store' });
        if (resp.ok) {
          results.endpoints.sales = await resp.json();
        } else {
          results.endpoints.sales = { error: resp.status, statusText: resp.statusText };
        }
      } catch (e: any) {
        results.endpoints.sales = { error: e.message };
      }

      // 6. Receivables (títulos/cobranças - pode ter info de serviços)
      try {
        const resp = await fetch(`${EVO_API}/api/v1/receivables?idMember=${id}&take=50`, { headers, cache: 'no-store' });
        if (resp.ok) {
          results.endpoints.receivables = await resp.json();
        } else {
          results.endpoints.receivables = { error: resp.status, statusText: resp.statusText };
        }
      } catch (e: any) {
        results.endpoints.receivables = { error: e.message };
      }

      // 7. Sale-items (itens vendidos)
      try {
        const resp = await fetch(`${EVO_API}/api/v1/sale-items?idMember=${id}&take=50`, { headers, cache: 'no-store' });
        if (resp.ok) {
          results.endpoints.saleItems = await resp.json();
        } else {
          results.endpoints.saleItems = { error: resp.status, statusText: resp.statusText };
        }
      } catch (e: any) {
        results.endpoints.saleItems = { error: e.message };
      }

      // 8. ENTRIES (check-ins/presenças) - IMPORTANTE PARA FREQUÊNCIA
      try {
        const now = new Date();
        const threeWeeksAgo = new Date(now);
        threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
        
        // PARÂMETROS CORRETOS conforme documentação OpenAPI: registerDateStart e registerDateEnd
        const registerDateStart = threeWeeksAgo.toISOString();
        const registerDateEnd = now.toISOString();
        
        // Tentar diferentes endpoints de entries
        const entriesUrl = `${EVO_API}/api/v1/entries?idMember=${id}&registerDateStart=${registerDateStart}&registerDateEnd=${registerDateEnd}&take=100`;
        console.log('[DEBUG] Buscando entries:', entriesUrl);
        
        const resp = await fetch(entriesUrl, { headers, cache: 'no-store' });
        if (resp.ok) {
          const entriesData = await resp.json();
          results.endpoints.entries = {
            url: entriesUrl,
            count: Array.isArray(entriesData) ? entriesData.length : 'not array',
            data: entriesData,
          };
        } else {
          results.endpoints.entries = { 
            url: entriesUrl,
            error: resp.status, 
            statusText: resp.statusText 
          };
        }
      } catch (e: any) {
        results.endpoints.entries = { error: e.message };
      }

      // 9. Tentar endpoint alternativo de access-log
      try {
        const now = new Date();
        const threeWeeksAgo = new Date(now);
        threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
        
        const dateStart = threeWeeksAgo.toISOString().split('T')[0];
        const dateEnd = now.toISOString().split('T')[0];
        
        const accessUrl = `${EVO_API}/api/v1/access-log?idMember=${id}&dateStart=${dateStart}&dateEnd=${dateEnd}&take=100`;
        
        const resp = await fetch(accessUrl, { headers, cache: 'no-store' });
        if (resp.ok) {
          const accessData = await resp.json();
          results.endpoints.accessLog = {
            url: accessUrl,
            count: Array.isArray(accessData) ? accessData.length : 'not array',
            data: accessData,
          };
        } else {
          results.endpoints.accessLog = { 
            url: accessUrl,
            error: resp.status, 
            statusText: resp.statusText 
          };
        }
      } catch (e: any) {
        results.endpoints.accessLog = { error: e.message };
      }

      // 10. Tentar endpoint de member-entries
      try {
        const memberEntriesUrl = `${EVO_API}/api/v1/member-entries?idMember=${id}&take=50`;
        
        const resp = await fetch(memberEntriesUrl, { headers, cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          results.endpoints.memberEntries = {
            url: memberEntriesUrl,
            count: Array.isArray(data) ? data.length : 'not array',
            data: data,
          };
        } else {
          results.endpoints.memberEntries = { 
            url: memberEntriesUrl,
            error: resp.status, 
            statusText: resp.statusText 
          };
        }
      } catch (e: any) {
        results.endpoints.memberEntries = { error: e.message };
      }

      // Análise automática
      // Ficha
      const workouts = results.endpoints.workouts?.treinos || [];
      results.analysis.hasFicha = workouts.length > 0;
      if (workouts.length > 0) {
        const treino = workouts[0];
        results.analysis.fichaInfo = {
          nome: treino.nomeTreino,
          dataValidade: treino.dataValidade || treino.dtValidade,
          dataPrescricao: treino.dtPrescricao,
          professor: treino.nomeProfessor,
        };
        const validade = results.analysis.fichaInfo.dataValidade;
        if (validade) {
          results.analysis.fichaVencida = new Date(validade) < new Date();
          results.analysis.diasParaVencer = Math.floor((new Date(validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        }
      }

      // Membership info
      const member = results.endpoints.member;
      if (member?.memberships?.[0]) {
        const m = member.memberships[0];
        results.analysis.membershipInfo = {
          name: m.name || m.membershipName,
          assessmentEndDate: m.assessmentEndDate,
          startDate: m.startDate,
          endDate: m.endDate,
          allFields: Object.keys(m),
        };
      }

      // Info do membro
      if (member && !member.error) {
        results.analysis.memberInfo = {
          name: member.name,
          registerDate: member.registerDate,
          email: member.email,
          allTopLevelFields: Object.keys(member),
        };
      }

      // Análise de AVALIAÇÃO baseada em sales/services
      // IDs de serviços de avaliação conhecidos: 157, 160, 185
      const avaliacaoServiceIds = [157, 158, 159, 160, 163, 164, 168, 169, 185, 186, 187, 188];
      const avaliacaoKeywords = ['AVALIA', 'BIOIMPEDÂNCIA', 'BIOIMPEDANCIA', 'REAVALIA'];
      
      results.analysis.avaliacaoInfo = {
        encontrada: false,
        ultimaAvaliacao: null,
        servicosEncontrados: [],
      };

      // Verificar em sales
      if (Array.isArray(results.endpoints.sales)) {
        const avaliacoesSales = results.endpoints.sales.filter((sale: any) => {
          const serviceName = (sale.serviceName || sale.description || '').toUpperCase();
          const serviceId = sale.idService || sale.serviceId;
          return avaliacaoServiceIds.includes(serviceId) || 
                 avaliacaoKeywords.some(kw => serviceName.includes(kw));
        });
        
        if (avaliacoesSales.length > 0) {
          results.analysis.avaliacaoInfo.encontrada = true;
          results.analysis.avaliacaoInfo.servicosEncontrados = avaliacoesSales.map((s: any) => ({
            id: s.idSale || s.id,
            idService: s.idService,
            nome: s.serviceName || s.description,
            data: s.saleDate || s.date,
          }));
          // Ordenar por data e pegar a mais recente
          const sorted = [...results.analysis.avaliacaoInfo.servicosEncontrados].sort(
            (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
          );
          if (sorted.length > 0) {
            results.analysis.avaliacaoInfo.ultimaAvaliacao = sorted[0];
          }
        }
      }

      // Verificar em saleItems também
      if (Array.isArray(results.endpoints.saleItems)) {
        const avaliacoesSaleItems = results.endpoints.saleItems.filter((item: any) => {
          const serviceName = (item.serviceName || item.description || item.name || '').toUpperCase();
          const serviceId = item.idService || item.serviceId;
          return avaliacaoServiceIds.includes(serviceId) || 
                 avaliacaoKeywords.some(kw => serviceName.includes(kw));
        });
        
        if (avaliacoesSaleItems.length > 0) {
          results.analysis.avaliacaoInfo.encontradaEmSaleItems = true;
          results.analysis.avaliacaoInfo.saleItemsEncontrados = avaliacoesSaleItems.slice(0, 5);
        }
      }

      return NextResponse.json(results);
    }

    // Busca por nome
    if (name) {
      if (name.length < 2) {
        return NextResponse.json({ 
          success: false, 
          error: 'Nome deve ter pelo menos 2 caracteres' 
        }, { status: 400 });
      }

      const members = await searchMembersByName(name);
      return NextResponse.json({
        success: true,
        data: members,
        count: members.length,
      });
    }

    // Busca por ID com dados completos
    if (id) {
      const member = await getMemberById(Number(id));
      if (!member) {
        return NextResponse.json({ 
          success: false, 
          error: 'Membro não encontrado' 
        }, { status: 404 });
      }

      const workouts = await getMemberWorkouts(Number(id));
      const daysAsMember = calculateDaysAsMember(member.registerDate);
      const priority = calculatePriority(daysAsMember);
      const tags = generateTags(daysAsMember, workouts.length, false);
      const currentWorkout = workouts.length > 0 ? workouts[0] : null;

      return NextResponse.json({
        success: true,
        data: {
          ...member,
          daysAsMember,
          priority,
          tags,
          totalWorkouts: workouts.length,
          currentWorkout: currentWorkout ? {
            name: currentWorkout.name,
            letter: currentWorkout.letter,
            endDate: currentWorkout.endDate,
          } : null,
        },
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Parâmetro name ou id é obrigatório' 
    }, { status: 400 });

  } catch (error) {
    console.error('Erro na busca de membros:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno' 
    }, { status: 500 });
  }
}

/**
 * POST /api/evo/members
 * Registrar entrada manual de um membro
 * - Registra no EVO (liberação manual + autorização)
 * - Adiciona na fila do IronCoach
 * - Notifica supervisores
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idMember, coachId, coachName, coachEvoId, reason, idTurnstile } = body;

    if (!idMember) {
      return NextResponse.json({ 
        success: false, 
        error: 'idMember é obrigatório' 
      }, { status: 400 });
    }

    // Buscar dados do membro no EVO
    const member = await getMemberById(Number(idMember));
    if (!member) {
      await logServerError({
        source: 'evo',
        endpoint: '/api/evo/members',
        action: 'manual_entry',
        errorMessage: 'Membro não encontrado no EVO',
        requestData: body,
        coachId,
        coachName,
        memberEvoId: Number(idMember),
      });
      return NextResponse.json({ 
        success: false, 
        error: 'Membro não encontrado no EVO' 
      }, { status: 404 });
    }

    // Calcular dados
    const workouts = await getMemberWorkouts(Number(idMember));
    const daysAsMember = calculateDaysAsMember(member.registerDate);
    const priority = calculatePriority(daysAsMember);
    const tags = generateTags(daysAsMember, workouts.length, false);
    const currentWorkout = workouts.length > 0 ? workouts[0] : null;

    // ========================================================================
    // PASSO 1: Registrar entrada no EVO
    // ========================================================================
    let evoResult = null;
    let evoEntryId = null;
    let evoError = null;

    // ========================================================================
    // CONFIGURAÇÃO FIXA - Academia Impacto / Limit Fitness
    // Sempre usar o ID do admin (2) para autorização
    // ========================================================================
    const FIXED_EMPLOYEE_ID = 2;      // ID fixo do admin no EVO
    const FIXED_TURNSTILE_ID = 6;     // Catraca Henry 8x SF - Limit Fitness
    
    console.log(`[ManualEntry] Registrando entrada manual para membro ${idMember}`);
    console.log(`[ManualEntry] Usando idEmployAuthorization FIXO: ${FIXED_EMPLOYEE_ID}`);
    console.log(`[ManualEntry] Usando idTurnstile FIXO: ${FIXED_TURNSTILE_ID}`);

    // SEMPRE tenta registrar no EVO (não depende mais de coachEvoId)
    const evoResponse = await registerManualEntryInEvo({
      idMember: Number(idMember),
      reason: reason || 'Entrada manual via IronCoach - catraca indisponível',
      // Nota: a função registerManualEntryInEvo já usa ID fixo internamente
    });

    if (evoResponse.success && evoResponse.data) {
      evoResult = evoResponse.data;
      evoEntryId = evoResponse.data.entryId;
      console.log(`✅ Entrada registrada no EVO: ${member.name} (Entry ID: ${evoEntryId})`);
    } else {
      evoError = evoResponse.error;
      console.warn(`⚠️ Não foi possível registrar no EVO: ${evoError}`);
      // Continua mesmo assim - entrada local ainda será criada
    }

    // ========================================================================
    // PASSO 2: Verificar se já não está na fila hoje
    // ========================================================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingEntry } = await supabase
      .from('queue')
      .select('id')
      .eq('evo_member_id', idMember)
      .gte('check_in_time', today.toISOString())
      .is('check_out_time', null)
      .single();

    if (existingEntry) {
      // Não é exatamente um "erro", mas vamos logar para rastreamento
      await logServerError({
        source: 'api',
        endpoint: '/api/evo/members',
        action: 'manual_entry_duplicate',
        errorMessage: 'Aluno já está na fila de atendimento',
        requestData: body,
        coachId,
        coachName,
        memberName: member.name,
        memberEvoId: Number(idMember),
      });
      return NextResponse.json({ 
        success: false, 
        error: 'Aluno já está na fila de atendimento',
        evoRegistered: !!evoEntryId,
      }, { status: 400 });
    }

    // ========================================================================
    // PASSO 3: Adicionar na fila do IronCoach
    // ========================================================================
    const { data: queueEntry, error: insertError } = await supabase
      .from('queue')
      .insert({
        evo_member_id: idMember,
        member_name: member.name || `${member.firstName} ${member.lastName}`,
        status: 'WAITING',
        priority,
        help_requested: false,
        check_in_source: 'manual',
        workout_letter: currentWorkout?.letter || null,
        workout_name: currentWorkout?.name || null,
        tags,
        days_as_member: daysAsMember,
        total_workouts: workouts.length,
        check_in_time: new Date().toISOString(),
        // Metadados da entrada manual
        manual_entry_data: {
          evoEntryId,
          evoManualLiberationId: evoResult?.idManualLiberation,
          reason: reason || 'Não especificado',
          authorizedBy: coachName,
          authorizedByEvoId: coachEvoId,
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir na fila:', insertError);
      await logServerError({
        source: 'supabase',
        endpoint: '/api/evo/members',
        action: 'manual_entry_insert',
        errorMessage: insertError.message || 'Erro ao adicionar na fila',
        requestData: body,
        responseData: { insertError },
        coachId,
        coachName,
        memberName: member.name,
        memberEvoId: Number(idMember),
      });
      return NextResponse.json({ 
        success: false, 
        error: `Erro ao adicionar na fila: ${insertError.message}`,
        details: insertError,
        evoRegistered: !!evoEntryId,
      }, { status: 500 });
    }

    // ========================================================================
    // PASSO 4: Criar notificação para supervisor
    // ========================================================================
    const { error: notifError } = await supabase.rpc('create_coordination_request', {
      p_coach_id: coachId,
      p_coach_name: coachName || 'Professor',
      p_queue_id: queueEntry.id,
      p_member_name: member.name,
      p_member_evo_id: idMember,
      p_request_type: 'MANUAL_ENTRY',
      p_observation: reason || 'Entrada manual - catraca indisponível ou burlada',
      p_member_snapshot: {
        daysAsMember,
        priority,
        tags,
        hasFicha: workouts.length > 0,
        totalWorkouts: workouts.length,
        checkInTime: new Date().toISOString(),
        manualEntry: true,
        reason: reason || 'Não especificado',
        evoEntryId,
        evoRegistered: !!evoEntryId,
        evoError: evoError || null,
      },
    });

    if (notifError) {
      console.warn('Aviso: Não foi possível criar notificação:', notifError);
    }

    // ========================================================================
    // PASSO 5: Registrar entrada pendente para consultoras
    // ========================================================================
    const { error: pendingError } = await supabase
      .from('manual_entries_pending')
      .insert({
        evo_member_id: Number(idMember),
        member_name: member.name || `${member.firstName} ${member.lastName}`,
        queue_id: queueEntry.id,
        evo_liberation_id: evoResult?.idManualLiberation || null,
        reason: reason || 'Entrada manual - catraca indisponível',
        created_by_coach_id: coachId,
        created_by_coach_name: coachName,
        processed: false,
        metadata: {
          priority,
          tags,
          daysAsMember,
          evoError: evoError || null,
        },
      });

    if (pendingError) {
      console.warn('Aviso: Não foi possível registrar para consultoras:', pendingError);
      // Não falha a operação - a entrada já está na fila
    } else {
      console.log(`   → Consultoras: ✅ Entrada pendente registrada`);
    }

    // Log completo
    console.log(`📝 Entrada manual completa: ${member.name} (ID: ${idMember})`);
    console.log(`   → EVO: ${evoResult?.idManualLiberation ? `✅ Liberation #${evoResult.idManualLiberation}` : '❌ Não registrado'}`);
    console.log(`   → IronCoach: ✅ Queue #${queueEntry.id}`);
    console.log(`   → Por: ${coachName} (EVO ID: ${coachEvoId || 'N/A'})`);

    return NextResponse.json({
      success: true,
      message: 'Aluno adicionado com sucesso! Entrada pendente para consultora lançar na catraca.',
      data: {
        queueId: queueEntry.id,
        member: {
          id: idMember,
          name: member.name,
          daysAsMember,
          priority,
          tags,
        },
        evo: {
          liberationRegistered: !!evoResult?.idManualLiberation,
          liberationId: evoResult?.idManualLiberation,
          error: evoError,
        },
        pendingForConsultant: !pendingError,
      },
    });

  } catch (error) {
    console.error('Erro na entrada manual:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno' 
    }, { status: 500 });
  }
}
