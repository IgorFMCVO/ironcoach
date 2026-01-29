// ============================================================================
// CAMINHO: src/app/api/debug/check-workout/route.ts
// ============================================================================
// IRON COACH - Debug: Verificar treino de um membro
// Acesse: /api/debug/check-workout?evoId=XXXXX
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EVO_API = 'https://evo-integracao-api.w12app.com.br/api/v1';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const evoId = searchParams.get('evoId');

  if (!evoId) {
    return NextResponse.json({ error: 'Parâmetro evoId é obrigatório' }, { status: 400 });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  const auth = `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`;
  const headers = { Authorization: auth, 'Content-Type': 'application/json' };

  try {
    // 1. Verificar dados no banco
    log(`[1] Verificando membro ${evoId} no banco...`);
    
    const { data: member, error: memberError } = await supabase
      .from('queue')
      .select('id, member_name, evo_member_id, has_ficha, ficha_vencida, workout_name, workout_id, workout_valid_until')
      .eq('evo_member_id', parseInt(evoId))
      .is('check_out_time', null)
      .single();

    if (memberError || !member) {
      log(`[1] Membro não encontrado na fila ativa`);
    } else {
      log(`[1] Dados do banco: has_ficha=${member.has_ficha}, ficha_vencida=${member.ficha_vencida}, workout_name=${member.workout_name}`);
    }

    // 2. Buscar treinos na API do EVO
    log(`[2] Buscando treinos na API do EVO...`);
    
    const workoutUrl = `${EVO_API}/workout/default-client-workout?idClient=${evoId}`;
    log(`[2] URL: ${workoutUrl}`);

    const workoutResp = await fetch(workoutUrl, { headers, cache: 'no-store' });
    log(`[2] HTTP Status: ${workoutResp.status}`);

    let workoutData: any = null;
    let treinos: any[] = [];

    if (workoutResp.ok) {
      workoutData = await workoutResp.json();
      treinos = workoutData.treinos || [];
      log(`[2] Resposta OK: ${treinos.length} treinos encontrados`);
      
      if (treinos.length > 0) {
        log(`[2] Primeiro treino: "${treinos[0].nomeTreino}", Validade: ${treinos[0].dataValidade || 'não definida'}`);
      }
    } else {
      const errorBody = await workoutResp.text();
      log(`[2] ERRO: ${errorBody.substring(0, 300)}`);
    }

    // 3. Comparar banco vs EVO
    log(`[3] Comparando banco vs EVO...`);

    const hoje = new Date();
    
    // Filtrar treinos ATIVOS e NÃO VENCIDOS
    const treinosAtivosValidos = treinos.filter((t: any) => {
      if (t.flExcluido === true) return false;
      if (t.dataValidade && new Date(t.dataValidade) < hoje) return false;
      if (t.statusTreino === 0 || t.statusTreino === 2) return false;
      return true;
    });

    // Treinos vencidos (não excluídos)
    const treinosVencidos = treinos.filter((t: any) => {
      if (t.flExcluido === true) return false;
      if (t.dataValidade && new Date(t.dataValidade) < hoje) return true;
      if (t.statusTreino === 0 || t.statusTreino === 2) return true;
      return false;
    });

    log(`[3] Treinos ativos válidos: ${treinosAtivosValidos.length}`);
    log(`[3] Treinos vencidos: ${treinosVencidos.length}`);

    // Determinar estado correto
    let evoHasFicha = false;
    let evoFichaVencida = false;
    
    if (treinosAtivosValidos.length > 0) {
      evoHasFicha = true;
      evoFichaVencida = false;
    } else if (treinosVencidos.length > 0) {
      evoHasFicha = true;
      evoFichaVencida = true;
    }

    const dbHasFicha = member?.has_ficha || false;
    const dbFichaVencida = member?.ficha_vencida || false;
    
    const inconsistent = (dbHasFicha !== evoHasFicha) || (dbFichaVencida !== evoFichaVencida);
    
    if (inconsistent) {
      log(`[3] ⚠️ INCONSISTÊNCIA!`);
      log(`[3]   Banco: has_ficha=${dbHasFicha}, ficha_vencida=${dbFichaVencida}`);
      log(`[3]   EVO:   has_ficha=${evoHasFicha}, ficha_vencida=${evoFichaVencida}`);
    } else {
      log(`[3] ✅ Dados consistentes`);
    }

    // 4. Se inconsistente, atualizar o banco
    let updated = false;
    if (inconsistent && member) {
      log(`[4] Atualizando banco para corrigir inconsistência...`);
      
      const updateData: any = {
        has_ficha: evoHasFicha,
        ficha_vencida: evoFichaVencida,
        workout_name: null,
        workout_id: null,
        workout_valid_until: null,
      };

      // Usar treino ativo se disponível, senão o vencido mais recente
      const treinoParaUsar = treinosAtivosValidos[0] || treinosVencidos[0];
      if (treinoParaUsar) {
        updateData.workout_name = treinoParaUsar.nomeTreino || null;
        updateData.workout_id = treinoParaUsar.idTreino || null;
        updateData.workout_valid_until = treinoParaUsar.dataValidade || null;
      }

      const { error: updateError } = await supabase
        .from('queue')
        .update(updateData)
        .eq('id', member.id);

      if (updateError) {
        log(`[4] ERRO ao atualizar: ${updateError.message}`);
      } else {
        log(`[4] ✅ Banco atualizado com sucesso`);
        updated = true;
      }
    }

    // Retornar resultado
    return NextResponse.json({
      success: true,
      evoId: parseInt(evoId),
      memberName: member?.member_name || workoutData?.nome || null,
      database: member ? {
        has_ficha: member.has_ficha,
        ficha_vencida: member.ficha_vencida,
        workout_name: member.workout_name,
        workout_id: member.workout_id,
        workout_valid_until: member.workout_valid_until,
      } : null,
      evo: {
        totalTreinos: treinos.length,
        treinosAtivosValidos: treinosAtivosValidos.length,
        treinosVencidos: treinosVencidos.length,
        hasFicha: evoHasFicha,
        fichaVencida: evoFichaVencida,
        treinos: treinos.map((t: any) => ({
          id: t.idTreino,
          nome: t.nomeTreino,
          validade: t.dataValidade,
          status: t.statusTreino,
          excluido: t.flExcluido,
          series: t.series?.length || 0,
          vencido: t.dataValidade ? new Date(t.dataValidade) < hoje : false,
        })),
      },
      inconsistent,
      updated,
      logs,
    });

  } catch (error) {
    log(`[ERRO] ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return NextResponse.json({
      error: 'Erro ao processar',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      logs,
    }, { status: 500 });
  }
}
