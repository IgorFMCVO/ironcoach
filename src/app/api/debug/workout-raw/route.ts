// Debug: Ver resposta RAW da API de treinos do EVO
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EVO_API = 'https://evo-integracao-api.w12app.com.br/api/v1';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const evoId = searchParams.get('evoId');

  if (!evoId) {
    return NextResponse.json({ error: 'evoId obrigatório' }, { status: 400 });
  }

  const auth = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;
  
  try {
    const url = `${EVO_API}/workout/default-client-workout?idClient=${evoId}`;
    const resp = await fetch(url, {
      headers: { Authorization: auth },
      cache: 'no-store',
    });

    if (!resp.ok) {
      return NextResponse.json({ error: `HTTP ${resp.status}` }, { status: resp.status });
    }

    const data = await resp.json();
    
    // Mostrar estrutura completa para debug
    return NextResponse.json({
      success: true,
      rawResponse: data,
      // Análise da estrutura
      analysis: {
        hasTreinos: !!data.treinos,
        treinosCount: data.treinos?.length || 0,
        firstTreino: data.treinos?.[0] ? {
          keys: Object.keys(data.treinos[0]),
          hasSeries: !!data.treinos[0].series,
          seriesCount: data.treinos[0].series?.length || 0,
          firstSerie: data.treinos[0].series?.[0] ? {
            keys: Object.keys(data.treinos[0].series[0]),
            hasItens: !!data.treinos[0].series[0].itens,
            itensCount: data.treinos[0].series[0].itens?.length || 0,
            firstItem: data.treinos[0].series[0].itens?.[0] ? {
              keys: Object.keys(data.treinos[0].series[0].itens[0]),
              fullItem: data.treinos[0].series[0].itens[0],
            } : null,
          } : null,
        } : null,
      }
    });
  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Erro desconhecido' 
    }, { status: 500 });
  }
}
