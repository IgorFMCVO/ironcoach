// ============================================================================
// DEBUG: Buscar detalhes de um treino específico - Testando múltiplos endpoints
// GET /api/debug/workout-detail?idTreino=XXXXX&idClient=YYYYY
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EVO_API = 'https://evo-integracao-api.w12app.com.br/api/v1';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idTreino = searchParams.get('idTreino');
  const idClient = searchParams.get('idClient');
  const idSerie = searchParams.get('idSerie');

  if (!idTreino && !idClient && !idSerie) {
    return NextResponse.json({ 
      error: 'Informe idTreino, idClient ou idSerie',
      exemplos: [
        '/api/debug/workout-detail?idTreino=46108&idClient=19097',
        '/api/debug/workout-detail?idClient=19097',
        '/api/debug/workout-detail?idSerie=117431',
      ]
    }, { status: 400 });
  }

  const auth = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;
  const headers = { Authorization: auth, 'Content-Type': 'application/json' };

  const resultados: any = {
    parametros: { idTreino, idClient, idSerie },
    testes: {},
  };

  // Teste 1: /workout/default-client-workout?idWorkout={id}
  if (idTreino) {
    try {
      const url = `${EVO_API}/workout/default-client-workout?idWorkout=${idTreino}`;
      console.log(`[1] Testando: ${url}`);
      const resp = await fetch(url, { headers, cache: 'no-store' });
      
      if (resp.ok) {
        const data = await resp.json();
        const treino = data.treinos?.[0];
        resultados.testes['1_idWorkout'] = {
          url,
          status: resp.status,
          encontrou: !!treino,
          nomeTreino: treino?.nomeTreino,
          totalSeries: treino?.series?.length || 0,
          primeiraSerieItens: treino?.series?.[0]?.itens?.length || 0,
          flTreinoV2: treino?.flTreinoV2,
          seriesCompletoV2: treino?.seriesCompletoV2 ? 'presente' : 'null',
          primeirosExercicios: treino?.series?.[0]?.itens?.slice(0, 3) || [],
        };
      } else {
        resultados.testes['1_idWorkout'] = { url, status: resp.status, erro: await resp.text() };
      }
    } catch (e) {
      resultados.testes['1_idWorkout'] = { erro: String(e) };
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Teste 2: /workout/default-client-workout?idClient={id}&idWorkout={id}
  if (idTreino && idClient) {
    try {
      const url = `${EVO_API}/workout/default-client-workout?idClient=${idClient}&idWorkout=${idTreino}`;
      console.log(`[2] Testando: ${url}`);
      const resp = await fetch(url, { headers, cache: 'no-store' });
      
      if (resp.ok) {
        const data = await resp.json();
        const treino = data.treinos?.[0];
        resultados.testes['2_idClient_idWorkout'] = {
          url,
          status: resp.status,
          encontrou: !!treino,
          nomeTreino: treino?.nomeTreino,
          totalSeries: treino?.series?.length || 0,
          primeiraSerieItens: treino?.series?.[0]?.itens?.length || 0,
          seriesCompletoV2: treino?.seriesCompletoV2 ? 'presente' : 'null',
          primeirosExercicios: treino?.series?.[0]?.itens?.slice(0, 3) || [],
        };
      } else {
        resultados.testes['2_idClient_idWorkout'] = { url, status: resp.status, erro: await resp.text() };
      }
    } catch (e) {
      resultados.testes['2_idClient_idWorkout'] = { erro: String(e) };
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Teste 3: /workout/default-client-workout?idClient={id} (todos os treinos do cliente)
  if (idClient) {
    try {
      const url = `${EVO_API}/workout/default-client-workout?idClient=${idClient}&inactive=true`;
      console.log(`[3] Testando: ${url}`);
      const resp = await fetch(url, { headers, cache: 'no-store' });
      
      if (resp.ok) {
        const data = await resp.json();
        resultados.testes['3_todosDoCliente'] = {
          url,
          status: resp.status,
          totalTreinos: data.treinos?.length || 0,
          treinos: (data.treinos || []).map((t: any) => ({
            idTreino: t.idTreino,
            nomeTreino: t.nomeTreino,
            dataValidade: t.dataValidade,
            flTreinoV2: t.flTreinoV2,
            totalSeries: t.series?.length || 0,
            seriesComItens: (t.series || []).filter((s: any) => s.itens?.length > 0).length,
            primeiraSerieItens: t.series?.[0]?.itens?.length || 0,
          })),
        };
      } else {
        resultados.testes['3_todosDoCliente'] = { url, status: resp.status, erro: await resp.text() };
      }
    } catch (e) {
      resultados.testes['3_todosDoCliente'] = { erro: String(e) };
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Teste 4: /workout/series/{idSerie} - buscar série específica
  if (idSerie) {
    try {
      const url = `${EVO_API}/workout/series/${idSerie}`;
      console.log(`[4] Testando: ${url}`);
      const resp = await fetch(url, { headers, cache: 'no-store' });
      
      if (resp.ok) {
        const data = await resp.json();
        resultados.testes['4_serie_especifica'] = {
          url,
          status: resp.status,
          dados: data,
        };
      } else {
        const errorText = await resp.text();
        resultados.testes['4_serie_especifica'] = { 
          url, 
          status: resp.status, 
          erro: errorText.substring(0, 500) 
        };
      }
    } catch (e) {
      resultados.testes['4_serie_especifica'] = { erro: String(e) };
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Teste 5: /workout/series/items/{idSerie}
  if (idSerie) {
    try {
      const url = `${EVO_API}/workout/series/items/${idSerie}`;
      console.log(`[5] Testando: ${url}`);
      const resp = await fetch(url, { headers, cache: 'no-store' });
      
      if (resp.ok) {
        const data = await resp.json();
        resultados.testes['5_serie_items'] = {
          url,
          status: resp.status,
          tipo: Array.isArray(data) ? 'array' : typeof data,
          quantidade: Array.isArray(data) ? data.length : null,
          dados: Array.isArray(data) ? data.slice(0, 5) : data,
        };
      } else {
        const errorText = await resp.text();
        resultados.testes['5_serie_items'] = { 
          url, 
          status: resp.status, 
          erro: errorText.substring(0, 500) 
        };
      }
    } catch (e) {
      resultados.testes['5_serie_items'] = { erro: String(e) };
    }
  }

  // Conclusão
  const algumTemExercicios = Object.values(resultados.testes).some((t: any) => 
    t.primeiraSerieItens > 0 || t.quantidade > 0
  );

  resultados.conclusao = {
    encontrouExercicios: algumTemExercicios ? 'SIM' : 'NÃO',
    proximoTeste: !idSerie && resultados.testes['3_todosDoCliente']?.treinos?.[0]?.idTreino
      ? `Tente buscar a série: /api/debug/workout-detail?idSerie=${resultados.testes['3_todosDoCliente']?.treinos?.[0]?.series?.[0]?.idSerie || '117431'}`
      : null,
  };

  return NextResponse.json(resultados);
}
