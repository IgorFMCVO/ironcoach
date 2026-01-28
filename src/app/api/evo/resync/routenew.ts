// ============================================================================
// CAMINHO: src/app/api/evo/resync/route.ts
// ============================================================================

// ============================================================================
// IRON COACH - API para Re-sincronizar dados dos membros na fila
// POST /api/evo/resync - Re-sincroniza todos os membros na fila
// POST /api/evo/resync?id=X - Re-sincroniza um membro específico
// INCLUI: Foto do membro (v13)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Credenciais EVO
const EVO_API = 'https://evo-integracao-api.w12app.com.br';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';
const EVO_AUTH = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;

// ============================================================================
// FUNÇÃO PARA BUSCAR DADOS COMPLETOS DO MEMBRO
// ============================================================================
async function fetchMemberDataFromEvo(idMember: number) {
  const headers = { Authorization: EVO_AUTH, 'Content-Type': 'application/json' };
  
  let daysAsMember = 30;
  let isPersonal = false;
  let photoUrl: string | null = null;
  
  const alerts = {
    semFicha: true,
    fichaVencida: false,
    semAvaliacao: true,
    avaliacaoVencida: false,
  };
  
  let workout: {
    idTreino: number | null;
    nomeTreino: string | null;
    serieAtual: string | null;
    dataValidade: string | null;
    frequenciaSemana: number;
    sessoesConcluidas: number;
    quantidadeSessoes: number;
  } | null = null;
  
  let churnData = { 
    level: 'NORMAL' as string, 
    freqAtual: 0, 
    freq08_14: 0, 
    freq15_21: 0, 
    frequenciaEsperada: 3,
    isRisk: false,
  };

  try {
    // 1. Dados do membro (API v2 para ter a foto)
    console.log(`[RESYNC] Buscando dados do membro ${idMember}...`);
    const memberResp = await fetch(`${EVO_API}/api/v2/members/${idMember}`, { headers, cache: 'no-store' });
    if (memberResp.ok) {
      const memberData = await memberResp.json();
      
      // Capturar URL da foto
      if (memberData.photo) {
        photoUrl = memberData.photo;
        console.log(`[RESYNC] Foto encontrada para membro ${idMember}`);
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
      
      // NÃO verificar mais o nome do plano - apenas nome/sobrenome do aluno
    } else {
      console.error(`[RESYNC] Erro ao buscar membro ${idMember}: ${memberResp.status}`);
    }

    // 2. Buscar SALES para verificar avaliações
    console.log(`[RESYNC] Buscando sales do membro ${idMember}...`);
    const salesResp = await fetch(`${EVO_API}/api/v1/sales?idMember=${idMember}&take=100`, { headers, cache: 'no-store' });
    if (salesResp.ok) {
      const salesData = await salesResp.json();
      const avaliacaoServiceIds = [157, 158, 159, 160, 163, 164, 168, 169, 185, 186, 187, 188, 207, 208, 209, 210, 251, 252];
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
    console.log(`[RESYNC] Buscando treinos do membro ${idMember}...`);
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
          sessoesConcluidas: treino.sessoesConcluidas || 0,
          quantidadeSessoes: treino.quantidadeSessoes || 0,
        };
        
        churnData.frequenciaEsperada = workout.frequenciaSemana;
      }
    }

    // 4. Buscar frequência (check-ins)
    console.log(`[RESYNC] Buscando frequência do membro ${idMember}...`);
    
    // =========================================================================
    // CORREÇÃO CRÍTICA: Usar EXATAMENTE a mesma lógica do sync
    // =========================================================================
    const now = new Date();
    
    // Offset do Brasil em minutos (-3 horas = -180 minutos)
    const BRAZIL_OFFSET_MINUTES = -180;
    
    // Criar uma data "virtual" que representa o horário atual no Brasil
    const nowBrazilMs = now.getTime() + (now.getTimezoneOffset() + BRAZIL_OFFSET_MINUTES) * 60 * 1000;
    const nowBrazil = new Date(nowBrazilMs);
    
    const dayOfWeek = nowBrazil.getDay();
    
    // Início da semana atual (domingo 00:00 no Brasil)
    const thisWeekStart = new Date(nowBrazil);
    thisWeekStart.setDate(nowBrazil.getDate() - dayOfWeek);
    thisWeekStart.setHours(0, 0, 0, 0);
    
    // Fim da semana atual (sábado 23:59:59 no Brasil)
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
    thisWeekEnd.setHours(23, 59, 59, 999);
    
    // SEMANA PASSADA
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
    lastWeekEnd.setHours(23, 59, 59, 999);
    
    // 2 SEMANAS ATRÁS
    const twoWeeksAgoStart = new Date(thisWeekStart);
    twoWeeksAgoStart.setDate(twoWeeksAgoStart.getDate() - 14);
    const twoWeeksAgoEnd = new Date(twoWeeksAgoStart);
    twoWeeksAgoEnd.setDate(twoWeeksAgoEnd.getDate() + 6);
    twoWeeksAgoEnd.setHours(23, 59, 59, 999);
    
    console.log(`[RESYNC] Semanas calculadas (Brasil):`);
    console.log(`  Esta semana: ${thisWeekStart.toISOString().split('T')[0]} (Dom) a ${thisWeekEnd.toISOString().split('T')[0]} (Sáb)`);
    console.log(`  Sem passada: ${lastWeekStart.toISOString().split('T')[0]} (Dom) a ${lastWeekEnd.toISOString().split('T')[0]} (Sáb)`);
    console.log(`  2 sem atrás: ${twoWeeksAgoStart.toISOString().split('T')[0]} (Dom) a ${twoWeeksAgoEnd.toISOString().split('T')[0]} (Sáb)`);

    // Buscar 30 dias de entradas
    const date30DaysAgo = new Date(nowBrazil.getTime() - 30 * 24 * 60 * 60 * 1000);
    // CORREÇÃO: Usar formato de data simples (YYYY-MM-DD)
    const dateStartParam = date30DaysAgo.toISOString().split('T')[0];
    
    const entriesUrl = `${EVO_API}/api/v1/entries?idMember=${idMember}&registerDateStart=${dateStartParam}&take=200`;
    console.log(`[RESYNC] URL: ${entriesUrl}`);
    
    const entriesResp = await fetch(entriesUrl, { headers, cache: 'no-store' });
    
    console.log(`[RESYNC] HTTP ${entriesResp.status} para membro ${idMember}`);
    
    if (entriesResp.ok) {
      const entriesRaw = await entriesResp.json();
      
      // Garantir que é array
      const entries = Array.isArray(entriesRaw) ? entriesRaw : [];
      
      console.log(`[RESYNC] Membro ${idMember}: ${entries.length} entries brutas`);
      
      // Usar Set para contar apenas 1 presença por dia
      const daysThisWeek = new Set<string>();
      const daysLastWeek = new Set<string>();
      const daysTwoWeeksAgo = new Set<string>();
      
      for (const entry of entries) {
        // CORREÇÃO: Aceitar TODAS as entradas que têm data
        // Apenas ignorar se explicitamente for um tipo não-físico
        const entryType = (entry.entryType || '').toLowerCase();
        
        // Ignorar APENAS tipos que claramente NÃO são entrada física
        const isDefinitelyNotPhysical = 
          entryType.includes('impressão') ||
          entryType.includes('email') ||
          entryType.includes('sms') ||
          entryType.includes('notificação') ||
          entryType.includes('notificacao');
        
        if (isDefinitelyNotPhysical || !entry.date) {
          continue;
        }
        
        // =====================================================================
        // CORREÇÃO CRÍTICA: Timezone do Brasil
        // O EVO retorna "2026-01-27T16:43:18" SEM timezone
        // Precisamos adicionar -03:00 manualmente
        // =====================================================================
        let entryDateStr = entry.date;
        if (!entryDateStr.includes('+') && !entryDateStr.includes('Z') && !entryDateStr.endsWith('-03:00')) {
          entryDateStr = entryDateStr + '-03:00';
        }
        
        const entryDate = new Date(entryDateStr);
        
        if (isNaN(entryDate.getTime())) {
          continue;
        }
        
        // Extrair apenas a data (YYYY-MM-DD) da string original
        const dayKey = entry.date.split('T')[0];
        const entryTime = entryDate.getTime();
        
        // CORREÇÃO: Usar getTime() para comparação precisa de timestamps
        if (entryTime >= thisWeekStart.getTime() && entryTime <= thisWeekEnd.getTime()) {
          daysThisWeek.add(dayKey);
        } else if (entryTime >= lastWeekStart.getTime() && entryTime <= lastWeekEnd.getTime()) {
          daysLastWeek.add(dayKey);
        } else if (entryTime >= twoWeeksAgoStart.getTime() && entryTime <= twoWeeksAgoEnd.getTime()) {
          daysTwoWeeksAgo.add(dayKey);
        }
      }
      
      // Frequência = número de DIAS únicos, não número de entradas
      churnData.freqAtual = daysThisWeek.size;
      churnData.freq08_14 = daysLastWeek.size;
      churnData.freq15_21 = daysTwoWeeksAgo.size;
      
      console.log(`[RESYNC] Membro ${idMember}: freqAtual=${churnData.freqAtual}, freq08_14=${churnData.freq08_14}, freq15_21=${churnData.freq15_21} (dias únicos)`);
      
      // Determinar nível de churn
      if (churnData.freq15_21 > 0 && churnData.freq08_14 === 0 && churnData.freqAtual === 0) {
        churnData.level = 'URGENTE';
        churnData.isRisk = true;
      } else if (churnData.freq15_21 > churnData.freq08_14 && churnData.freq08_14 <= 1) {
        churnData.level = 'CRITICO';
        churnData.isRisk = true;
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

    // Calcular prioridade
    let priority = 'YELLOW';
    if (isPersonal) {
      priority = 'BLUE';
    } else if (daysAsMember <= 7) {
      priority = alerts.semFicha ? 'RED' : 'ORANGE';
    } else if (daysAsMember <= 14) {
      priority = alerts.semFicha ? 'ORANGE' : 'YELLOW';
    } else if (alerts.semFicha || churnData.isRisk) {
      priority = 'ORANGE';
    }

    // Gerar tags
    const tags: string[] = [];
    if (daysAsMember <= 7) tags.push('1ª SEMANA');
    else if (daysAsMember <= 14) tags.push('2ª SEMANA');
    if (alerts.semFicha) tags.push('SEM FICHA');
    if (alerts.semAvaliacao) tags.push('SEM AVALIAÇÃO');
    if (alerts.fichaVencida) tags.push('FICHA VENCIDA');
    if (alerts.avaliacaoVencida) tags.push('AVAL. VENCIDA');
    if (isPersonal) tags.push('PERSONAL');

    return {
      success: true,
      data: {
        daysAsMember,
        isPersonal,
        priority,
        tags,
        alerts,
        workout,
        churnData,
        retentionScore,
        photoUrl,
      }
    };
  } catch (error) {
    console.error(`[RESYNC] Erro ao buscar dados do membro ${idMember}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// ============================================================================
// POST /api/evo/resync
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specificId = searchParams.get('id');

    // Verificar credenciais
    if (!EVO_DNS || !EVO_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Credenciais EVO não configuradas' 
      }, { status: 500 });
    }

    // Buscar membros na fila
    let query = supabase
      .from('queue')
      .select('id, evo_member_id, member_name')
      .is('check_out_time', null)
      .not('evo_member_id', 'is', null);

    if (specificId) {
      query = query.eq('evo_member_id', Number(specificId));
    }

    const { data: members, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ 
        success: false, 
        error: `Erro ao buscar membros: ${fetchError.message}` 
      }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum membro para sincronizar',
        updated: 0,
      });
    }

    console.log(`[RESYNC] Iniciando sincronização de ${members.length} membros...`);

    const results = {
      total: members.length,
      updated: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const member of members) {
      const evoId = member.evo_member_id;
      console.log(`[RESYNC] Processando ${member.member_name} (EVO ID: ${evoId})...`);

      const evoData = await fetchMemberDataFromEvo(evoId);

      if (!evoData.success || !evoData.data) {
        results.failed++;
        results.details.push({
          id: member.id,
          name: member.member_name,
          evoId,
          success: false,
          error: evoData.error,
        });
        continue;
      }

      const d = evoData.data;

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('queue')
        .update({
          priority: d.priority,
          tags: d.tags,
          days_as_member: d.daysAsMember,
          is_personal: d.isPersonal,
          member_photo_url: d.photoUrl,
          workout_name: d.workout?.nomeTreino || null,
          workout_letter: d.workout?.serieAtual || null,
          workout_id: d.workout?.idTreino || null,
          workout_valid_until: d.workout?.dataValidade || null,
          sessions_done: d.workout?.sessoesConcluidas || 0,
          sessions_total: d.workout?.quantidadeSessoes || 0,
          has_ficha: !d.alerts.semFicha,
          has_avaliacao: !d.alerts.semAvaliacao,
          ficha_vencida: d.alerts.fichaVencida,
          avaliacao_vencida: d.alerts.avaliacaoVencida,
          retention_score: d.retentionScore,
          churn_level: d.churnData.level,
          freq_esperada: d.churnData.frequenciaEsperada,
          freq_atual: d.churnData.freqAtual,
          freq_08_14: d.churnData.freq08_14,
          freq_15_21: d.churnData.freq15_21,
          help_requested: d.priority === 'RED' || d.churnData.isRisk,
        })
        .eq('id', member.id);

      if (updateError) {
        results.failed++;
        results.details.push({
          id: member.id,
          name: member.member_name,
          evoId,
          success: false,
          error: updateError.message,
        });
      } else {
        results.updated++;
        results.details.push({
          id: member.id,
          name: member.member_name,
          evoId,
          success: true,
          data: {
            priority: d.priority,
            hasFicha: !d.alerts.semFicha,
            hasAvaliacao: !d.alerts.semAvaliacao,
            retentionScore: d.retentionScore,
            workoutName: d.workout?.nomeTreino,
          },
        });
      }

      // Pequeno delay para não sobrecarregar a API do EVO
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[RESYNC] Concluído: ${results.updated} atualizados, ${results.failed} falharam`);

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${results.updated}/${results.total} membros atualizados`,
      ...results,
    });

  } catch (error) {
    console.error('[RESYNC] Erro geral:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro interno' 
    }, { status: 500 });
  }
}

// GET para verificar status
export async function GET(request: NextRequest) {
  // Se tiver parâmetro ?execute=true, executa o resync
  const { searchParams } = new URL(request.url);
  const execute = searchParams.get('execute');
  const specificId = searchParams.get('id');

  if (execute === 'true') {
    console.log('[RESYNC GET] Executando resync via GET...');
    
    // Verificar credenciais
    if (!EVO_DNS || !EVO_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Credenciais EVO não configuradas' 
      }, { status: 500 });
    }

    // Buscar membros na fila
    let query = supabase
      .from('queue')
      .select('id, evo_member_id, member_name, has_ficha, has_avaliacao, ficha_vencida, avaliacao_vencida')
      .is('check_out_time', null)
      .not('evo_member_id', 'is', null);

    if (specificId) {
      query = query.eq('evo_member_id', Number(specificId));
    }

    const { data: members, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ 
        success: false, 
        error: `Erro ao buscar membros: ${fetchError.message}` 
      }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum membro para sincronizar',
        updated: 0,
      });
    }

    console.log(`[RESYNC GET] Processando ${members.length} membros...`);

    const results = {
      total: members.length,
      updated: 0,
      failed: 0,
      details: [] as any[],
    };

    // Configurações de timezone do Brasil
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

    const headers = { 
      Authorization: `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`,
      'Content-Type': 'application/json'
    };

    for (const member of members) {
      const evoId = member.evo_member_id;
      
      try {
        // Buscar entradas do EVO
        const entriesUrl = `https://evo-integracao-api.w12app.com.br/api/v1/entries?idMember=${evoId}&registerDateStart=${dateStartParam}&take=200`;
        const entriesResp = await fetch(entriesUrl, { headers, cache: 'no-store' });
        
        if (!entriesResp.ok) {
          results.failed++;
          results.details.push({
            name: member.member_name,
            evoId,
            success: false,
            error: `HTTP ${entriesResp.status}`,
          });
          continue;
        }

        const entriesRaw = await entriesResp.json();
        const entries = Array.isArray(entriesRaw) ? entriesRaw : [];

        // Calcular frequência
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
        const freqEsperada = 3;

        // Calcular retention_score
        let retentionScore = 0;
        const freqReal = freqAtual > 0 ? freqAtual : freq08_14;
        if (freqReal > 0) {
          retentionScore += Math.min(50, Math.round((freqReal / freqEsperada) * 50));
        }
        if (member.has_ficha && !member.ficha_vencida) {
          retentionScore += 25;
        } else if (member.has_ficha && member.ficha_vencida) {
          retentionScore += 12;
        }
        if (member.has_avaliacao && !member.avaliacao_vencida) {
          retentionScore += 25;
        } else if (member.has_avaliacao && member.avaliacao_vencida) {
          retentionScore += 12;
        }

        // Atualizar no banco
        const { error: updateError } = await supabase
          .from('queue')
          .update({
            freq_atual: freqAtual,
            freq_08_14: freq08_14,
            freq_15_21: freq15_21,
            freq_esperada: freqEsperada,
            retention_score: retentionScore,
          })
          .eq('id', member.id);

        if (updateError) {
          results.failed++;
          results.details.push({
            name: member.member_name,
            evoId,
            success: false,
            error: updateError.message,
          });
        } else {
          results.updated++;
          results.details.push({
            name: member.member_name,
            evoId,
            success: true,
            freq: { atual: freqAtual, passada: freq08_14, duasSem: freq15_21 },
            retention: retentionScore,
          });
        }

        // Pequeno delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        results.details.push({
          name: member.member_name,
          evoId,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Resync concluído: ${results.updated} atualizados, ${results.failed} falharam`,
      ...results,
    });
  }

  // Se não tem ?execute=true, apenas lista membros que precisam de sync
  const { data: members, error } = await supabase
    .from('queue')
    .select('id, member_name, evo_member_id, has_ficha, has_avaliacao, retention_score, freq_atual, freq_08_14')
    .is('check_out_time', null);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const needsSync = members?.filter(m => 
    m.evo_member_id && (m.retention_score === 0 || m.retention_score === null || m.freq_atual === 0)
  ) || [];

  return NextResponse.json({
    success: true,
    message: 'Use ?execute=true para executar o resync',
    totalInQueue: members?.length || 0,
    needsSync: needsSync.length,
    members: needsSync.slice(0, 10).map(m => ({
      id: m.id,
      name: m.member_name,
      evoId: m.evo_member_id,
      retention: m.retention_score,
      freq: m.freq_atual,
    })),
  });
}
