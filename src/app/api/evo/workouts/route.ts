// ============================================================================
// API: Buscar treinos completos do cliente no EVO
// GET /api/evo/workouts?idClient=123
// GET /api/evo/workouts?idClient=123&debug=true (para ver logs)
// IMPORTANTE: Usa inactive=true para buscar treinos ativos E vencidos
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const EVO_API_BASE = 'https://evo-integracao-api.w12app.com.br/api/v1';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

function getHeaders() {
  const auth = Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
}

export async function GET(request: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const { searchParams } = new URL(request.url);
    const idClient = searchParams.get('idClient');
    const debug = searchParams.get('debug') === 'true';

    if (!idClient) {
      return NextResponse.json({ error: 'idClient é obrigatório' }, { status: 400 });
    }

    log(`[Workouts] ========================================`);
    log(`[Workouts] Buscando treinos para cliente ${idClient}`);
    log(`[Workouts] ========================================`);

    // Tentar buscar treinos (com retry)
    let workoutData: any = null;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // CRÍTICO: Usar inactive=true para buscar treinos ATIVOS e VENCIDOS
        const url = `${EVO_API_BASE}/workout/default-client-workout?idClient=${idClient}&inactive=true`;
        log(`[Workouts] Tentativa ${attempt}: ${url}`);

        const response = await fetch(url, {
          method: 'GET',
          headers: getHeaders(),
          cache: 'no-store',
        });

        log(`[Workouts] HTTP Status: ${response.status}`);

        if (response.ok) {
          workoutData = await response.json();
          log(`[Workouts] ✅ Treinos encontrados: ${workoutData.treinos?.length || 0}`);
          break;
        } else if (response.status === 429) {
          lastError = 'Rate limit (429) - aguarde alguns segundos e tente novamente';
          log(`[Workouts] ⚠️ Rate limit (429) - esperando...`);
          await new Promise(r => setTimeout(r, 2000)); // Espera mais tempo no rate limit
        } else {
          lastError = `HTTP ${response.status}`;
          const errorBody = await response.text();
          log(`[Workouts] ❌ Erro: ${errorBody.substring(0, 200)}`);
        }
      } catch (fetchErr) {
        lastError = fetchErr instanceof Error ? fetchErr.message : 'Erro desconhecido';
        log(`[Workouts] ❌ Exceção: ${lastError}`);
      }

      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }

    // Se não conseguiu buscar, retornar erro
    if (!workoutData) {
      log(`[Workouts] ❌ FALHA TOTAL após 3 tentativas: ${lastError}`);
      return NextResponse.json({
        success: false,
        error: lastError || 'Não foi possível buscar treinos do EVO',
        logs: logs, // Sempre retorna logs para debug
      }, { status: 500 });
    }

    // Processar treinos
    let treinos = workoutData.treinos || [];
    log(`[Workouts] Total bruto de treinos: ${treinos.length}`);

    // Se não encontrou treinos, retornar vazio mas com sucesso
    if (treinos.length === 0) {
      log(`[Workouts] ⚠️ Nenhum treino encontrado para este aluno`);
      return NextResponse.json({
        success: true,
        clientId: parseInt(idClient),
        clientName: workoutData.nome || null,
        clientPhoto: workoutData.urlFoto || null,
        workouts: [],
        totalWorkouts: 0,
        activeWorkouts: 0,
        expiredWorkouts: 0,
        logs: logs,
      });
    }

    // Para cada treino, processar e SEMPRE buscar detalhes completos
    const treinosCompletos = [];
    
    for (const treino of treinos) {
      log(`[Workouts] ----------------------------------------`);
      log(`[Workouts] Treino: "${treino.nomeTreino}" (ID: ${treino.idTreino})`);
      log(`[Workouts]   - Status: ${treino.statusTreino}`);
      log(`[Workouts]   - Validade: ${treino.dataValidade}`);
      log(`[Workouts]   - Excluído: ${treino.flExcluido}`);
      log(`[Workouts]   - Séries no objeto: ${treino.series?.length || 0}`);
      log(`[Workouts]   - SeriesCompletoV2: ${treino.seriesCompletoV2?.length || 0}`);
      
      // Verificar se já tem exercícios nas séries
      let temExercicios = false;
      if (treino.series && treino.series.length > 0) {
        for (const serie of treino.series) {
          if (serie.itens && serie.itens.length > 0) {
            const primeiroItem = serie.itens[0];
            const campos = Object.keys(primeiroItem);
            log(`[Workouts]   - Campos do exercício: ${campos.join(', ')}`);
            if (primeiroItem.nomeExercicio || primeiroItem.nome || primeiroItem.exercicio || primeiroItem.descricao || primeiroItem.nomeExercicioEvo) {
              temExercicios = true;
              log(`[Workouts]   ✅ Exercícios já presentes!`);
              break;
            }
          }
        }
      }

      // SEMPRE tentar buscar detalhes se não tem exercícios
      if (!temExercicios && treino.idTreino) {
        log(`[Workouts]   -> Buscando detalhes completos...`);
        
        try {
          // Aguardar um pouco para evitar rate limit
          await new Promise(r => setTimeout(r, 200));
          
          const detailUrl = `${EVO_API_BASE}/workout/${treino.idTreino}`;
          const detailResp = await fetch(detailUrl, {
            headers: getHeaders(),
            cache: 'no-store',
          });

          log(`[Workouts]   -> HTTP ${detailResp.status}`);

          if (detailResp.ok) {
            const detailData = await detailResp.json();
            log(`[Workouts]   -> ✅ Detalhes obtidos!`);
            log(`[Workouts]   -> Séries no detalhe: ${detailData.series?.length || 0}`);
            log(`[Workouts]   -> SeriesV2 no detalhe: ${detailData.seriesCompletoV2?.length || 0}`);
            
            // Mesclar dados
            const treinoCompleto = {
              ...treino,
              ...detailData,
              nomeTreino: detailData.nomeTreino || treino.nomeTreino,
              series: detailData.series || treino.series,
              seriesCompletoV2: detailData.seriesCompletoV2 || treino.seriesCompletoV2,
            };
            
            // Log das séries
            if (treinoCompleto.series) {
              for (const serie of treinoCompleto.series) {
                log(`[Workouts]   -> Série "${serie.nome}": ${serie.itens?.length || 0} exercícios`);
              }
            }
            
            treinosCompletos.push(treinoCompleto);
            continue;
          } else if (detailResp.status === 429) {
            log(`[Workouts]   -> ⚠️ Rate limit no detalhe, usando dados básicos`);
          } else {
            log(`[Workouts]   -> ❌ Erro ${detailResp.status} no detalhe`);
          }
        } catch (detailErr) {
          log(`[Workouts]   -> ❌ Exceção: ${detailErr}`);
        }
      }

      // Usar o treino original (com ou sem detalhes)
      treinosCompletos.push(treino);
    }

    // Separar treinos por status
    const hoje = new Date();
    const treinosAtivos = treinosCompletos.filter(t => {
      if (t.flExcluido) return false;
      if (t.dataValidade && new Date(t.dataValidade) < hoje) return false;
      return true;
    });
    const treinosVencidos = treinosCompletos.filter(t => {
      if (t.flExcluido) return false;
      if (t.dataValidade && new Date(t.dataValidade) < hoje) return true;
      return false;
    });

    log(`[Workouts] ========================================`);
    log(`[Workouts] ✅ RESUMO FINAL:`);
    log(`[Workouts]   - Total: ${treinosCompletos.length}`);
    log(`[Workouts]   - Ativos: ${treinosAtivos.length}`);
    log(`[Workouts]   - Vencidos: ${treinosVencidos.length}`);
    log(`[Workouts] ========================================`);

    return NextResponse.json({
      success: true,
      clientId: workoutData.idCliente || workoutData.id || parseInt(idClient),
      clientName: workoutData.nome || null,
      clientPhoto: workoutData.urlFoto || null,
      workouts: treinosCompletos,
      totalWorkouts: treinosCompletos.length,
      activeWorkouts: treinosAtivos.length,
      expiredWorkouts: treinosVencidos.length,
      logs: logs, // Sempre retorna logs
    });

  } catch (error) {
    log(`[Workouts] ❌ ERRO FATAL: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      logs,
    }, { status: 500 });
  }
}
