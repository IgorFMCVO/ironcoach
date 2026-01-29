// ============================================================================
// DEBUG: Testar diferentes endpoints para buscar exercícios de um treino
// GET /api/debug/workout-exercises?idTreino=XXXXX
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EVO_API = 'https://evo-integracao-api.w12app.com.br/api/v1';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idTreino = searchParams.get('idTreino');

  if (!idTreino) {
    return NextResponse.json({ error: 'idTreino obrigatório' }, { status: 400 });
  }

  const auth = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;
  const headers = { Authorization: auth, 'Content-Type': 'application/json' };

  const resultados: any = {
    idTreino,
    endpoints: {},
  };

  // Endpoint 1: /workout/{id}
  try {
    const url1 = `${EVO_API}/workout/${idTreino}`;
    console.log(`[1] Testando: ${url1}`);
    const resp1 = await fetch(url1, { headers, cache: 'no-store' });
    
    if (resp1.ok) {
      const data1 = await resp1.json();
      resultados.endpoints['GET /workout/{id}'] = {
        status: resp1.status,
        campos: Object.keys(data1),
        series: data1.series?.length || 0,
        seriesCompletoV2: data1.seriesCompletoV2?.length || 0,
        primeiraSerieItens: data1.series?.[0]?.itens?.length || 0,
        primeiroExercicio: data1.series?.[0]?.itens?.[0] || null,
        // Verificar se tem exercícios em outro formato
        exercicios: data1.exercicios?.length || 0,
        itens: data1.itens?.length || 0,
      };
    } else {
      resultados.endpoints['GET /workout/{id}'] = { status: resp1.status, error: await resp1.text() };
    }
  } catch (e) {
    resultados.endpoints['GET /workout/{id}'] = { error: String(e) };
  }

  await new Promise(r => setTimeout(r, 300));

  // Endpoint 2: /workout/{id}/series
  try {
    const url2 = `${EVO_API}/workout/${idTreino}/series`;
    console.log(`[2] Testando: ${url2}`);
    const resp2 = await fetch(url2, { headers, cache: 'no-store' });
    
    if (resp2.ok) {
      const data2 = await resp2.json();
      resultados.endpoints['GET /workout/{id}/series'] = {
        status: resp2.status,
        tipo: Array.isArray(data2) ? 'array' : typeof data2,
        quantidade: Array.isArray(data2) ? data2.length : null,
        primeiroItem: Array.isArray(data2) ? data2[0] : data2,
        primeiraSerieItens: Array.isArray(data2) && data2[0]?.itens ? data2[0].itens.length : 0,
      };
    } else {
      resultados.endpoints['GET /workout/{id}/series'] = { status: resp2.status, error: (await resp2.text()).substring(0, 200) };
    }
  } catch (e) {
    resultados.endpoints['GET /workout/{id}/series'] = { error: String(e) };
  }

  await new Promise(r => setTimeout(r, 300));

  // Endpoint 3: /workout/series?idTreino={id}
  try {
    const url3 = `${EVO_API}/workout/series?idTreino=${idTreino}`;
    console.log(`[3] Testando: ${url3}`);
    const resp3 = await fetch(url3, { headers, cache: 'no-store' });
    
    if (resp3.ok) {
      const data3 = await resp3.json();
      resultados.endpoints['GET /workout/series?idTreino={id}'] = {
        status: resp3.status,
        tipo: Array.isArray(data3) ? 'array' : typeof data3,
        quantidade: Array.isArray(data3) ? data3.length : null,
        primeiroItem: Array.isArray(data3) ? data3[0] : data3,
      };
    } else {
      resultados.endpoints['GET /workout/series?idTreino={id}'] = { status: resp3.status, error: (await resp3.text()).substring(0, 200) };
    }
  } catch (e) {
    resultados.endpoints['GET /workout/series?idTreino={id}'] = { error: String(e) };
  }

  await new Promise(r => setTimeout(r, 300));

  // Endpoint 4: /workout/series/{idSerie} - Buscar série específica
  // Primeiro precisamos pegar o idSerie do treino
  let idSerie: number | null = null;
  try {
    const urlTreino = `${EVO_API}/workout/${idTreino}`;
    const respTreino = await fetch(urlTreino, { headers, cache: 'no-store' });
    if (respTreino.ok) {
      const dataTreino = await respTreino.json();
      idSerie = dataTreino.series?.[0]?.idSerie || null;
    }
  } catch (e) {}

  if (idSerie) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const url4 = `${EVO_API}/workout/series/${idSerie}`;
      console.log(`[4] Testando: ${url4}`);
      const resp4 = await fetch(url4, { headers, cache: 'no-store' });
      
      if (resp4.ok) {
        const data4 = await resp4.json();
        resultados.endpoints['GET /workout/series/{idSerie}'] = {
          status: resp4.status,
          idSerieUsado: idSerie,
          campos: Object.keys(data4),
          itens: data4.itens?.length || 0,
          primeiroItem: data4.itens?.[0] || null,
        };
      } else {
        resultados.endpoints['GET /workout/series/{idSerie}'] = { 
          status: resp4.status, 
          idSerieUsado: idSerie,
          error: (await resp4.text()).substring(0, 200) 
        };
      }
    } catch (e) {
      resultados.endpoints['GET /workout/series/{idSerie}'] = { error: String(e), idSerieUsado: idSerie };
    }
  }

  await new Promise(r => setTimeout(r, 300));

  // Endpoint 5: /workout/series/items?idSerie={id}
  if (idSerie) {
    try {
      const url5 = `${EVO_API}/workout/series/items?idSerie=${idSerie}`;
      console.log(`[5] Testando: ${url5}`);
      const resp5 = await fetch(url5, { headers, cache: 'no-store' });
      
      if (resp5.ok) {
        const data5 = await resp5.json();
        resultados.endpoints['GET /workout/series/items?idSerie={id}'] = {
          status: resp5.status,
          idSerieUsado: idSerie,
          tipo: Array.isArray(data5) ? 'array' : typeof data5,
          quantidade: Array.isArray(data5) ? data5.length : null,
          primeiroItem: Array.isArray(data5) ? data5[0] : data5,
        };
      } else {
        resultados.endpoints['GET /workout/series/items?idSerie={id}'] = { 
          status: resp5.status,
          idSerieUsado: idSerie, 
          error: (await resp5.text()).substring(0, 200) 
        };
      }
    } catch (e) {
      resultados.endpoints['GET /workout/series/items?idSerie={id}'] = { error: String(e) };
    }
  }

  await new Promise(r => setTimeout(r, 300));

  // Endpoint 6: /workout/{id}?loadExercises=true
  try {
    const url6 = `${EVO_API}/workout/${idTreino}?loadExercises=true`;
    console.log(`[6] Testando: ${url6}`);
    const resp6 = await fetch(url6, { headers, cache: 'no-store' });
    
    if (resp6.ok) {
      const data6 = await resp6.json();
      resultados.endpoints['GET /workout/{id}?loadExercises=true'] = {
        status: resp6.status,
        series: data6.series?.length || 0,
        primeiraSerieItens: data6.series?.[0]?.itens?.length || 0,
        primeiroExercicio: data6.series?.[0]?.itens?.[0] || null,
      };
    } else {
      resultados.endpoints['GET /workout/{id}?loadExercises=true'] = { status: resp6.status, error: (await resp6.text()).substring(0, 200) };
    }
  } catch (e) {
    resultados.endpoints['GET /workout/{id}?loadExercises=true'] = { error: String(e) };
  }

  await new Promise(r => setTimeout(r, 300));

  // Endpoint 7: /workout/client-workout/{id}
  try {
    const url7 = `${EVO_API}/workout/client-workout/${idTreino}`;
    console.log(`[7] Testando: ${url7}`);
    const resp7 = await fetch(url7, { headers, cache: 'no-store' });
    
    if (resp7.ok) {
      const data7 = await resp7.json();
      resultados.endpoints['GET /workout/client-workout/{id}'] = {
        status: resp7.status,
        campos: Object.keys(data7),
        series: data7.series?.length || 0,
        primeiraSerieItens: data7.series?.[0]?.itens?.length || 0,
      };
    } else {
      resultados.endpoints['GET /workout/client-workout/{id}'] = { status: resp7.status, error: (await resp7.text()).substring(0, 200) };
    }
  } catch (e) {
    resultados.endpoints['GET /workout/client-workout/{id}'] = { error: String(e) };
  }

  await new Promise(r => setTimeout(r, 300));

  // Endpoint 8: /workout/complete/{id}
  try {
    const url8 = `${EVO_API}/workout/complete/${idTreino}`;
    console.log(`[8] Testando: ${url8}`);
    const resp8 = await fetch(url8, { headers, cache: 'no-store' });
    
    if (resp8.ok) {
      const data8 = await resp8.json();
      resultados.endpoints['GET /workout/complete/{id}'] = {
        status: resp8.status,
        campos: Object.keys(data8),
        series: data8.series?.length || 0,
        primeiraSerieItens: data8.series?.[0]?.itens?.length || 0,
      };
    } else {
      resultados.endpoints['GET /workout/complete/{id}'] = { status: resp8.status, error: (await resp8.text()).substring(0, 200) };
    }
  } catch (e) {
    resultados.endpoints['GET /workout/complete/{id}'] = { error: String(e) };
  }

  return NextResponse.json(resultados);
}
