// ============================================================================
// DEBUG - Ver dados completos do EVO para um membro
// GET /api/evo/debug?idMember=12345
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const EVO_API = 'https://evo-integracao-api.w12app.com.br';

function getAuthHeader() {
  const user = process.env.EVO_API_USER || '';
  const pass = process.env.EVO_API_PASS || '';
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idMember = searchParams.get('idMember');
  
  if (!idMember) {
    return NextResponse.json({ error: 'idMember é obrigatório' }, { status: 400 });
  }

  const results: Record<string, any> = {
    idMember,
    timestamp: new Date().toISOString(),
    endpoints: {},
  };

  const authHeader = getAuthHeader();
  const headers = { Authorization: authHeader, 'Content-Type': 'application/json' };

  // 1. Dados do Membro
  try {
    console.log(`[DEBUG] Buscando membro ${idMember}...`);
    const resp = await fetch(`${EVO_API}/api/v1/members/${idMember}`, { headers, cache: 'no-store' });
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
    console.log(`[DEBUG] Buscando treinos do membro ${idMember}...`);
    const resp = await fetch(`${EVO_API}/api/v1/workout/default-client-workout?idClient=${idMember}`, { headers, cache: 'no-store' });
    if (resp.ok) {
      results.endpoints.workouts = await resp.json();
    } else {
      results.endpoints.workouts = { error: resp.status, statusText: resp.statusText };
    }
  } catch (e: any) {
    results.endpoints.workouts = { error: e.message };
  }

  // 3. Vendas/Serviços do Membro (se existir)
  try {
    console.log(`[DEBUG] Buscando vendas do membro ${idMember}...`);
    const resp = await fetch(`${EVO_API}/api/v1/sales?idMember=${idMember}&take=50`, { headers, cache: 'no-store' });
    if (resp.ok) {
      results.endpoints.sales = await resp.json();
    } else {
      results.endpoints.sales = { error: resp.status, statusText: resp.statusText };
    }
  } catch (e: any) {
    results.endpoints.sales = { error: e.message };
  }

  // 4. Atividades agendadas do membro
  try {
    console.log(`[DEBUG] Buscando atividades do membro ${idMember}...`);
    const resp = await fetch(`${EVO_API}/api/v1/activities/schedule?idMember=${idMember}&take=50`, { headers, cache: 'no-store' });
    if (resp.ok) {
      results.endpoints.activities = await resp.json();
    } else {
      results.endpoints.activities = { error: resp.status, statusText: resp.statusText };
    }
  } catch (e: any) {
    results.endpoints.activities = { error: e.message };
  }

  // 5. Serviços disponíveis (para referência)
  try {
    console.log(`[DEBUG] Buscando serviços ativos...`);
    const resp = await fetch(`${EVO_API}/api/v1/service?active=true&take=50`, { headers, cache: 'no-store' });
    if (resp.ok) {
      const services = await resp.json();
      // Filtrar apenas serviços de avaliação
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

  // 6. Análise automática
  results.analysis = {
    hasFicha: false,
    fichaVencida: false,
    fichaValidadeDate: null,
    hasAvaliacao: null, // null = não conseguimos determinar
    avaliacaoVencida: null,
  };

  // Analisar ficha
  const workouts = results.endpoints.workouts?.treinos || [];
  if (workouts.length > 0) {
    results.analysis.hasFicha = true;
    const treino = workouts[0];
    results.analysis.fichaValidadeDate = treino.dataValidade || treino.dtValidade;
    
    if (results.analysis.fichaValidadeDate) {
      const validade = new Date(results.analysis.fichaValidadeDate);
      results.analysis.fichaVencida = validade < new Date();
    }
  }

  // Analisar avaliação (do membership)
  const membership = results.endpoints.member?.memberships?.[0];
  if (membership) {
    results.analysis.membershipFields = {
      assessmentEndDate: membership.assessmentEndDate,
      assessmentStartDate: membership.assessmentStartDate,
      // Listar todos os campos do membership para encontrar o correto
      allFields: Object.keys(membership),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
