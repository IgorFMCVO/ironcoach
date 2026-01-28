// src/app/api/debug/evo-entries/route.ts
// ============================================================================
// IRON COACH - API de DIAGNÓSTICO para ver entradas brutas do EVO
// Acesse: /api/debug/evo-entries?idMember=XXXXX
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const EVO_API = 'https://evo-integracao-api.w12app.com.br';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idMember = searchParams.get('idMember');

  if (!idMember) {
    return NextResponse.json({ error: 'Parâmetro idMember é obrigatório' }, { status: 400 });
  }

  const auth = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;
  const headers = { Authorization: auth, 'Content-Type': 'application/json' };

  // CORREÇÃO: Usar timezone do Brasil
  const now = new Date();
  const BRAZIL_OFFSET_MINUTES = -180;
  const nowBrazilMs = now.getTime() + (now.getTimezoneOffset() + BRAZIL_OFFSET_MINUTES) * 60 * 1000;
  const nowBrazil = new Date(nowBrazilMs);
  
  const date30DaysAgo = new Date(nowBrazil.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // 1. Buscar entradas brutas
    const dateStartParam = date30DaysAgo.toISOString().split('T')[0];
    const entriesUrl = `${EVO_API}/api/v1/entries?idMember=${idMember}&registerDateStart=${dateStartParam}&take=200`;
    console.log('[DEBUG] URL:', entriesUrl);
    
    const entriesResp = await fetch(entriesUrl, { headers, cache: 'no-store' });
    
    if (!entriesResp.ok) {
      return NextResponse.json({ 
        error: `EVO retornou ${entriesResp.status}`,
        url: entriesUrl
      }, { status: 500 });
    }

    const entriesRaw = await entriesResp.json();
    
    // 2. Analisar tipos de entrada
    const entryTypes: Record<string, number> = {};
    const entriesByType: Record<string, { date: string; entryType: string }[]> = {};
    
    if (Array.isArray(entriesRaw)) {
      for (const entry of entriesRaw) {
        const type = entry.entryType || 'SEM_TIPO';
        entryTypes[type] = (entryTypes[type] || 0) + 1;
        
        if (!entriesByType[type]) entriesByType[type] = [];
        if (entriesByType[type].length < 3) {
          entriesByType[type].push({
            date: entry.date,
            entryType: entry.entryType,
          });
        }
      }
    }

    // 3. Calcular semanas no horário do Brasil
    const dayOfWeek = nowBrazil.getDay();
    const startOfThisWeek = new Date(nowBrazil);
    startOfThisWeek.setDate(nowBrazil.getDate() - dayOfWeek);
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    const startOf2WeeksAgo = new Date(startOfLastWeek);
    startOf2WeeksAgo.setDate(startOf2WeeksAgo.getDate() - 7);

    // 4. Contar entradas por semana COM correção de timezone
    const diasFiltrados = {
      atual: new Set<string>(),
      passada: new Set<string>(),
      duasSemAtras: new Set<string>(),
    };
    
    if (Array.isArray(entriesRaw)) {
      for (const entry of entriesRaw) {
        if (!entry.date) continue;
        
        // Adicionar timezone do Brasil se não tiver
        let entryDateStr = entry.date;
        if (!entryDateStr.includes('+') && !entryDateStr.includes('Z') && !entryDateStr.endsWith('-03:00')) {
          entryDateStr = entryDateStr + '-03:00';
        }
        
        const d = new Date(entryDateStr);
        if (isNaN(d.getTime())) continue;
        
        const dayKey = entry.date.split('T')[0];
        
        if (d >= startOfThisWeek) {
          diasFiltrados.atual.add(dayKey);
        } else if (d >= startOfLastWeek) {
          diasFiltrados.passada.add(dayKey);
        } else if (d >= startOf2WeeksAgo) {
          diasFiltrados.duasSemAtras.add(dayKey);
        }
      }
    }

    return NextResponse.json({
      success: true,
      idMember,
      totalEntries: Array.isArray(entriesRaw) ? entriesRaw.length : 0,
      
      // Horários para debug
      serverTime: {
        utc: now.toISOString(),
        brazilVirtual: nowBrazil.toISOString(),
        dayOfWeekBrazil: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][nowBrazil.getDay()],
      },
      
      // Tipos de entrada encontrados
      entryTypesFound: entryTypes,
      examplesByType: entriesByType,
      
      // Semanas calculadas (horário Brasil)
      weeks: {
        thisWeekStart: startOfThisWeek.toISOString().split('T')[0],
        lastWeekStart: startOfLastWeek.toISOString().split('T')[0],
        twoWeeksAgoStart: startOf2WeeksAgo.toISOString().split('T')[0],
      },
      
      // Frequência calculada (COM correção timezone)
      frequencia: {
        semanaAtual: diasFiltrados.atual.size,
        semanaPassada: diasFiltrados.passada.size,
        duasSemanasAtras: diasFiltrados.duasSemAtras.size,
        diasAtual: Array.from(diasFiltrados.atual),
        diasPassada: Array.from(diasFiltrados.passada),
        dias2Atras: Array.from(diasFiltrados.duasSemAtras),
      },
      
      // Primeiras 5 entradas brutas para análise
      sampleEntries: Array.isArray(entriesRaw) ? entriesRaw.slice(0, 5) : [],
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Erro ao buscar dados',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
