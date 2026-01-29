// ============================================================================
// DEBUG: Verificar estrutura completa dos treinos de um membro
// GET /api/debug/workout-structure?evoId=XXXXX
// ============================================================================

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
  const headers = { Authorization: auth, 'Content-Type': 'application/json' };

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    // Buscar treinos COM inactive=true
    log(`[1] Buscando treinos para ${evoId} com inactive=true...`);
    
    const url = `${EVO_API}/workout/default-client-workout?idClient=${evoId}&inactive=true`;
    log(`[1] URL: ${url}`);
    
    const resp = await fetch(url, { headers, cache: 'no-store' });
    log(`[1] HTTP Status: ${resp.status}`);

    if (!resp.ok) {
      return NextResponse.json({
        error: `API retornou ${resp.status}`,
        logs,
      }, { status: 500 });
    }

    const data = await resp.json();
    const treinos = data.treinos || [];
    
    log(`[2] Total de treinos: ${treinos.length}`);

    // Analisar estrutura de cada treino
    const analise = treinos.map((treino: any, idx: number) => {
      log(`[3] Treino ${idx + 1}: "${treino.nomeTreino}"`);
      
      // Campos do treino
      const camposTreino = Object.keys(treino);
      log(`[3]   Campos: ${camposTreino.join(', ')}`);

      // Analisar séries
      const series = treino.series || [];
      const seriesCompletoV2 = treino.seriesCompletoV2 || [];
      
      log(`[3]   series: ${series.length} itens`);
      log(`[3]   seriesCompletoV2: ${seriesCompletoV2.length} itens`);

      // Analisar primeira série (se existir)
      let primeiraSerieAnalise: any = null;
      let primeiroExercicioAnalise: any = null;

      if (series.length > 0) {
        const primeiraSerie = series[0];
        log(`[3]   Primeira série campos: ${Object.keys(primeiraSerie).join(', ')}`);
        
        primeiraSerieAnalise = {
          campos: Object.keys(primeiraSerie),
          nome: primeiraSerie.nome,
          itens: primeiraSerie.itens?.length || 0,
        };

        if (primeiraSerie.itens && primeiraSerie.itens.length > 0) {
          const primeiroItem = primeiraSerie.itens[0];
          log(`[3]   Primeiro exercício campos: ${Object.keys(primeiroItem).join(', ')}`);
          
          primeiroExercicioAnalise = {
            campos: Object.keys(primeiroItem),
            valoresRelevantes: {
              nomeExercicio: primeiroItem.nomeExercicio,
              nome: primeiroItem.nome,
              exercicio: primeiroItem.exercicio,
              descricao: primeiroItem.descricao,
              series: primeiroItem.series,
              qtdSeries: primeiroItem.qtdSeries,
              repeticoes: primeiroItem.repeticoes,
              qtdRepeticoes: primeiroItem.qtdRepeticoes,
              carga: primeiroItem.carga,
              peso: primeiroItem.peso,
            },
            objetoCompleto: primeiroItem,
          };
        }
      }

      // Analisar seriesCompletoV2 (se existir)
      let seriesV2Analise: any = null;
      if (seriesCompletoV2.length > 0) {
        const primeiraV2 = seriesCompletoV2[0];
        log(`[3]   seriesCompletoV2[0] campos: ${Object.keys(primeiraV2).join(', ')}`);
        
        seriesV2Analise = {
          campos: Object.keys(primeiraV2),
          nome: primeiraV2.nome || primeiraV2.nomeSerie,
          exercicios: primeiraV2.exercicios?.length || primeiraV2.itens?.length || 0,
        };

        // Ver primeiro exercício do V2
        const exerciciosV2 = primeiraV2.exercicios || primeiraV2.itens || [];
        if (exerciciosV2.length > 0) {
          log(`[3]   V2 primeiro exercício campos: ${Object.keys(exerciciosV2[0]).join(', ')}`);
          seriesV2Analise.primeiroExercicio = exerciciosV2[0];
        }
      }

      return {
        idTreino: treino.idTreino,
        nomeTreino: treino.nomeTreino,
        dataValidade: treino.dataValidade,
        statusTreino: treino.statusTreino,
        flExcluido: treino.flExcluido,
        camposTreino,
        totalSeries: series.length,
        totalSeriesV2: seriesCompletoV2.length,
        primeiraSerieAnalise,
        primeiroExercicioAnalise,
        seriesV2Analise,
      };
    });

    return NextResponse.json({
      success: true,
      evoId,
      totalTreinos: treinos.length,
      analise,
      logs,
    });

  } catch (error) {
    log(`[ERRO] ${error instanceof Error ? error.message : 'Erro'}`);
    return NextResponse.json({
      error: 'Erro ao processar',
      logs,
    }, { status: 500 });
  }
}
