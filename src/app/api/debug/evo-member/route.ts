// src/app/api/debug/evo-member/route.ts
// ============================================================================
// DEBUG: Testa TODOS os endpoints possíveis da EVO para um membro
// Acesse: /api/debug/evo-member?id=19809
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EVO_DNS = process.env.EVO_DNS || 'academiaimpacto';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

async function tryEndpoint(url: string, auth: string): Promise<any> {
  try {
    const resp = await fetch(url, { 
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store'
    });
    if (resp.ok) {
      const data = await resp.json();
      return { status: resp.status, success: true, data };
    } else {
      const text = await resp.text().catch(() => '');
      return { status: resp.status, success: false, error: text.slice(0, 300) };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const memberId = searchParams.get('id');

  if (!memberId) {
    return NextResponse.json({ 
      error: 'Informe o id do membro: ?id=19809',
      exemplo: '/api/debug/evo-member?id=19809'
    }, { status: 400 });
  }

  const auth = Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64');
  const baseUrl = 'https://evo-integracao-api.w12app.com.br/api/v1';
  
  const results: any = {
    _info: {
      memberId,
      timestamp: new Date().toISOString(),
      message: 'Testando vários endpoints da EVO. Veja quais retornam success: true'
    },
    endpoints: {}
  };

  // ============================================
  // 1. DADOS DO MEMBRO
  // ============================================
  results.endpoints['member'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}`, auth
  );

  // ============================================
  // 2. WORKOUT / FICHA DE TREINO (várias tentativas)
  // ============================================
  results.endpoints['workouts_v1'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/workouts`, auth
  );
  results.endpoints['workouts_v2'] = await tryEndpoint(
    `${baseUrl}/workouts?idMember=${memberId}`, auth
  );
  results.endpoints['workouts_v3'] = await tryEndpoint(
    `${baseUrl}/workouts/${memberId}`, auth
  );
  results.endpoints['member-workouts'] = await tryEndpoint(
    `${baseUrl}/member-workouts?idMember=${memberId}`, auth
  );
  results.endpoints['training'] = await tryEndpoint(
    `${baseUrl}/training?idMember=${memberId}`, auth
  );
  results.endpoints['trainings'] = await tryEndpoint(
    `${baseUrl}/trainings?idMember=${memberId}`, auth
  );
  results.endpoints['member-training'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/training`, auth
  );
  results.endpoints['member-trainings'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/trainings`, auth
  );
  results.endpoints['prescriptions'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/prescriptions`, auth
  );
  results.endpoints['workout-prescriptions'] = await tryEndpoint(
    `${baseUrl}/workout-prescriptions?idMember=${memberId}`, auth
  );

  // ============================================
  // 3. AVALIAÇÃO FÍSICA (várias tentativas)
  // ============================================
  results.endpoints['assessments_v1'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/assessments`, auth
  );
  results.endpoints['assessments_v2'] = await tryEndpoint(
    `${baseUrl}/assessments?idMember=${memberId}`, auth
  );
  results.endpoints['physical-assessments'] = await tryEndpoint(
    `${baseUrl}/physical-assessments?idMember=${memberId}`, auth
  );
  results.endpoints['evaluations'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/evaluations`, auth
  );
  results.endpoints['evaluations_v2'] = await tryEndpoint(
    `${baseUrl}/evaluations?idMember=${memberId}`, auth
  );
  results.endpoints['bioimpedance'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/bioimpedance`, auth
  );

  // ============================================
  // 4. ENTRADAS / FREQUÊNCIA
  // ============================================
  const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  results.endpoints['entries'] = await tryEndpoint(
    `${baseUrl}/entries?idMember=${memberId}&registerDateStart=${threeWeeksAgo}&take=50`, auth
  );
  results.endpoints['member-entries'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/entries?take=50`, auth
  );
  results.endpoints['access'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/access`, auth
  );
  results.endpoints['checkins'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/checkins`, auth
  );

  // ============================================
  // 5. ATIVIDADES / AULAS
  // ============================================
  results.endpoints['activities'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/activities`, auth
  );
  results.endpoints['schedules'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/schedules`, auth
  );
  results.endpoints['classes'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/classes`, auth
  );

  // ============================================
  // 6. OUTROS DADOS ÚTEIS
  // ============================================
  results.endpoints['contracts'] = await tryEndpoint(
    `${baseUrl}/members/${memberId}/contracts`, auth
  );
  results.endpoints['sales'] = await tryEndpoint(
    `${baseUrl}/sales?idMember=${memberId}&take=5`, auth
  );
  results.endpoints['receivables'] = await tryEndpoint(
    `${baseUrl}/receivables?idMember=${memberId}&take=5`, auth
  );

  // ============================================
  // RESUMO: Quais endpoints funcionaram?
  // ============================================
  const working = Object.entries(results.endpoints)
    .filter(([_, v]: [string, any]) => v.success)
    .map(([k, _]) => k);
  
  const notWorking = Object.entries(results.endpoints)
    .filter(([_, v]: [string, any]) => !v.success)
    .map(([k, _]) => k);

  results._summary = {
    working,
    notWorking,
    totalWorking: working.length,
    totalTested: Object.keys(results.endpoints).length
  };

  return NextResponse.json(results, { status: 200 });
}
