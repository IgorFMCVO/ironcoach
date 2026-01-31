// ============================================================================
// CAMINHO: src/app/api/environment/route.ts
// CORREÇÃO: Adicionado método PUT e retorno de coaches no GET
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EnvironmentLevel = 'OTIMO' | 'BOM' | 'BAIXO' | 'CRITICO';
type PriorityColor = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'PURPLE' | 'BLACK';

// GET - Buscar status do ambiente, configurações E coaches no salão
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const gymId = searchParams.get('gymId') || 'impacto';

    // Retornar configurações (para tela Admin)
    if (type === 'config') {
      const { data, error } = await supabase
        .from('environment_config')
        .select('*')
        .eq('gym_id', gymId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Converter do banco (snake_case) para o formato do AdminEnvironmentConfig
      const adminConfig = data ? {
        // Ratios
        ratio_otimo_max: data.ratio_otimo ?? 5,
        ratio_bom_max: data.ratio_bom ?? 10,
        ratio_baixo_max: data.ratio_baixo ?? 15,
        // Configuração avançada de níveis por fila (JSON)
        config_fila_avancada: data.config_fila_avancada ?? null,
        // Nível por Fila (legado)
        tempo_fila_otimo: data.tempo_fila_otimo ?? 30,
        tempo_fila_bom: data.tempo_fila_bom ?? 60,
        tempo_fila_baixo: data.tempo_fila_baixo ?? 120,
        tempo_fila_critico: data.tempo_fila_critico ?? 300,
        cards_para_alerta: data.cards_para_alerta ?? 5,
        // Alertas
        alerta_freq_otimo: data.alerta_freq_otimo ?? 15,
        alerta_freq_bom: data.alerta_freq_bom ?? 10,
        alerta_freq_baixo: data.alerta_freq_baixo ?? 5,
        alerta_freq_critico: data.alerta_freq_critico ?? 3,
        // Tempos base
        tempo_vermelho: data.tempo_base_vermelho ?? 210,
        tempo_laranja: data.tempo_base_laranja ?? 270,
        tempo_amarelo: data.tempo_base_amarelo ?? 330,
        tempo_verde: data.tempo_base_verde ?? 390,
        // Anti-burla
        tempo_minimo_atendimento: data.tempo_minimo_atendimento ?? 10,
        alertas_burla_sequencia: data.alertas_burla_sequencia ?? 3,
        alertas_burla_janela_minutos: data.alertas_burla_janela_minutos ?? 5,
        // WhatsApp
        supervisor_whatsapp: data.supervisor_whatsapp ?? ''
      } : null;

      return NextResponse.json({ success: true, config: adminConfig });
    }

    // Buscar status do ambiente via função SQL
    const { data: statusData, error: statusError } = await supabase
      .rpc('calculate_environment_status', { p_gym_id: gymId });

    if (statusError) {
      console.error('Erro ao calcular status:', statusError);
    }

    // Buscar config para ajustes
    const { data: config } = await supabase
      .from('environment_config')
      .select('*')
      .eq('gym_id', gymId)
      .single();

    // =========================================================================
    // CORREÇÃO: Buscar coaches no salão da tabela coach_sessions
    // =========================================================================
    
    // Buscar TODOS os coaches com sessão ativa
    const { data: allCoachesData, error: coachesError } = await supabase
      .from('coach_sessions')
      .select(`
        id,
        coach_id,
        coach_name,
        role,
        user_type,
        is_on_floor,
        started_at,
        last_activity_at
      `)
      .eq('status', 'ACTIVE')
      .is('ended_at', null)
      .order('started_at', { ascending: false });

    if (coachesError) {
      console.error('Erro ao buscar coaches:', coachesError);
    }

    console.log('[Environment GET] Sessões ativas:', allCoachesData?.length || 0);
    
    // Log detalhado de cada sessão
    allCoachesData?.forEach((c: any) => {
      console.log(`  - ${c.coach_name}: is_on_floor=${c.is_on_floor}, role=${c.role}`);
    });

    // Filtrar quem está no salão (is_on_floor = true)
    // Qualquer role que está no salão conta para o ratio
    const coachesOnFloor = (allCoachesData || [])
      .filter((c: any) => {
        // Deve estar no salão
        if (c.is_on_floor !== true) return false;
        
        // Qualquer role que está no salão conta
        const role = (c.role || c.user_type || '').toUpperCase();
        
        // PROFESSOR sempre conta
        if (role === 'PROFESSOR') return true;
        
        // SUPERVISOR conta quando clicou em Reforço
        if (role === 'SUPERVISOR') return true;
        
        // ADMIN conta quando clicou em Reforço
        if (role === 'ADMIN') return true;
        
        return false;
      })
      .map((c: any) => ({
        coachId: c.coach_id,
        coachName: c.coach_name,
        role: c.role || c.user_type || 'PROFESSOR',
        since: c.started_at
      }));

    console.log('[Environment GET] Coaches no salão:', coachesOnFloor.length, coachesOnFloor.map((c: any) => `${c.coachName}(${c.role})`));

    // Mapear todos os coaches para o formato esperado pelo frontend
    const allCoaches = (allCoachesData || []).map((c: any) => ({
      coach_id: c.coach_id,
      coach_name: c.coach_name,
      role: c.role || c.user_type,
      is_on_floor: c.is_on_floor,
      started_at: c.started_at,
      last_activity_at: c.last_activity_at
    }));

    const level = (statusData?.nivel || 'OTIMO') as EnvironmentLevel;

    // Calcular ajustes por cor baseado no nível atual
    const getAdjustment = (color: PriorityColor): number => {
      if (color === 'PURPLE' || color === 'BLACK') return 0;
      const key = `ajuste_${color.toLowerCase()}_${level.toLowerCase()}`;
      return (config as any)?.[key] || 0;
    };

    const adjustments: Record<string, number> = {
      RED: getAdjustment('RED'),
      ORANGE: getAdjustment('ORANGE'),
      YELLOW: getAdjustment('YELLOW'),
      GREEN: getAdjustment('GREEN'),
      BLUE: getAdjustment('BLUE'),
      PURPLE: 0,
      BLACK: 0
    };

    // Frequência de alerta baseada no nível
    const alertFrequency = {
      OTIMO: config?.alerta_freq_otimo || 15,
      BOM: config?.alerta_freq_bom || 10,
      BAIXO: config?.alerta_freq_baixo || 5,
      CRITICO: config?.alerta_freq_critico || 3
    }[level];

    // Converter config do banco (snake_case) para o formato esperado pelo frontend (camelCase)
    const convertedConfig = config ? {
      ratioOtimo: config.ratio_otimo ?? 5,
      ratioBom: config.ratio_bom ?? 10,
      ratioBaixo: config.ratio_baixo ?? 15,
      tempoBaseVermelho: config.tempo_base_vermelho ?? 210,
      tempoBaseLaranja: config.tempo_base_laranja ?? 270,
      tempoBaseAmarelo: config.tempo_base_amarelo ?? 330,
      tempoBaseVerde: config.tempo_base_verde ?? 390,
      tempoBaseAzul: config.tempo_base_azul ?? 450,
      ajusteVermelhoLaranja: config.ajuste_vermelho_laranja ?? 30,
      ajusteAmareloVerde: config.ajuste_amarelo_verde ?? 15,
      cardsParaAlerta: config.cards_para_alerta ?? 5,
      tempoFilaOtimo: config.tempo_fila_otimo ?? 30,
      tempoFilaBom: config.tempo_fila_bom ?? 60,
      tempoFilaBaixo: config.tempo_fila_baixo ?? 120,
      tempoFilaCritico: config.tempo_fila_critico ?? 300,
      alertaFreqOtimo: config.alerta_freq_otimo ?? 15,
      alertaFreqBom: config.alerta_freq_bom ?? 10,
      alertaFreqBaixo: config.alerta_freq_baixo ?? 5,
      alertaFreqCritico: config.alerta_freq_critico ?? 3,
      alertaDuracaoOtimo: config.alerta_duracao_otimo ?? 2,
      alertaDuracaoBom: config.alerta_duracao_bom ?? 2,
      alertaDuracaoBaixo: config.alerta_duracao_baixo ?? 3,
      alertaDuracaoCritico: config.alerta_duracao_critico ?? 5,
      supervisorWhatsapp: config.supervisor_whatsapp || null,
      // NOVO: Configuração avançada de fila por cor
      configFilaAvancada: config.config_fila_avancada || null
    } : {};

    return NextResponse.json({
      success: true,
      config: convertedConfig,
      // CORREÇÃO: Retornar coaches no salão e todos os coaches ativos
      coaches: coachesOnFloor,
      allCoaches: allCoaches,
      coachesCount: coachesOnFloor.length,
      environment: {
        level,
        ...statusData,
        adjustments,
        alertFrequency
      }
    });

  } catch (error) {
    console.error('Erro na API environment GET:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno',
      coaches: [],
      allCoaches: [],
      config: {}
    }, { status: 500 });
  }
}

// ============================================================================
// PUT - Atualizar status do coach no salão (REFORÇO)
// ============================================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { coachId, coachName, role, isOnFloor } = body;

    if (!coachId) {
      return NextResponse.json({ 
        success: false, 
        error: 'coachId é obrigatório' 
      }, { status: 400 });
    }

    console.log(`[Environment PUT] Coach ${coachName} (${coachId}) -> isOnFloor: ${isOnFloor}`);

    let updateSuccess = false;

    // Tentar atualizar usando função SQL primeiro
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('set_coach_floor_status', {
        p_coach_id: coachId,
        p_coach_name: coachName || 'Unknown',
        p_role: role || 'PROFESSOR',
        p_is_on_floor: isOnFloor
      });

      if (!rpcError && rpcData?.success) {
        updateSuccess = true;
        console.log('[Environment PUT] RPC sucesso:', rpcData);
      } else if (rpcError) {
        console.log('[Environment PUT] RPC erro, tentando update direto:', rpcError.message);
      }
    } catch (rpcException) {
      console.log('[Environment PUT] RPC exception, tentando update direto:', rpcException);
    }

    // Fallback: atualizar diretamente se RPC falhou
    if (!updateSuccess) {
      // Primeiro verificar se existe sessão ativa
      const { data: existingSession } = await supabase
        .from('coach_sessions')
        .select('id')
        .eq('coach_id', coachId)
        .eq('status', 'ACTIVE')
        .is('ended_at', null)
        .single();

      if (existingSession) {
        // Atualizar sessão existente
        const { error: updateError, data: updateData } = await supabase
          .from('coach_sessions')
          .update({ 
            is_on_floor: isOnFloor,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', existingSession.id)
          .select();

        if (updateError) {
          console.error('[Environment PUT] Erro no update:', updateError);
        } else {
          updateSuccess = true;
          console.log('[Environment PUT] Update direto sucesso:', updateData);
        }
      } else {
        // Criar nova sessão se não existir
        console.log('[Environment PUT] Criando nova sessão para:', coachId);
        const { error: insertError } = await supabase
          .from('coach_sessions')
          .insert({
            coach_id: coachId,
            coach_name: coachName || 'Unknown',
            status: 'ACTIVE',
            user_type: role || 'PROFESSOR',
            role: role || 'PROFESSOR',
            is_on_floor: isOnFloor,
            started_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[Environment PUT] Erro no insert:', insertError);
        } else {
          updateSuccess = true;
          console.log('[Environment PUT] Nova sessão criada');
        }
      }
    }

    // Buscar lista atualizada de coaches no salão
    const { data: coachesData, error: coachesError } = await supabase
      .from('coach_sessions')
      .select('coach_id, coach_name, role, user_type, is_on_floor, started_at')
      .eq('status', 'ACTIVE')
      .eq('is_on_floor', true)
      .is('ended_at', null);

    if (coachesError) {
      console.error('[Environment PUT] Erro ao buscar coaches:', coachesError);
    }

    const coaches = (coachesData || []).map((c: any) => ({
      coachId: c.coach_id,
      coachName: c.coach_name,
      role: c.role || c.user_type || 'PROFESSOR',
      since: c.started_at
    }));

    console.log(`[Environment PUT] Coaches no salão após update: ${coaches.length}`, coaches.map((c: any) => c.coachName));

    return NextResponse.json({ 
      success: updateSuccess, 
      message: isOnFloor ? 'Entrou no salão' : 'Saiu do salão',
      isOnFloor,
      coaches,
      coachesCount: coaches.length
    });

  } catch (error) {
    console.error('Erro na API environment PUT:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno' 
    }, { status: 500 });
  }
}

// POST - Atualizar configurações
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, gymId = 'impacto' } = body;

    if (action === 'updateConfig') {
      // Converter nomes do frontend para o formato do banco
      const dbConfig: any = {
        gym_id: gymId,
        updated_at: new Date().toISOString()
      };

      // Mapear campos do frontend para o banco
      // Ratios
      if (config.ratio_otimo_max !== undefined) dbConfig.ratio_otimo = config.ratio_otimo_max;
      if (config.ratio_bom_max !== undefined) dbConfig.ratio_bom = config.ratio_bom_max;
      if (config.ratio_baixo_max !== undefined) dbConfig.ratio_baixo = config.ratio_baixo_max;
      // Configuração avançada de níveis por fila (JSON)
      if (config.config_fila_avancada !== undefined) dbConfig.config_fila_avancada = config.config_fila_avancada;
      // Nível por Fila (legado - mantido para compatibilidade)
      if (config.tempo_fila_otimo !== undefined) dbConfig.tempo_fila_otimo = config.tempo_fila_otimo;
      if (config.tempo_fila_bom !== undefined) dbConfig.tempo_fila_bom = config.tempo_fila_bom;
      if (config.tempo_fila_baixo !== undefined) dbConfig.tempo_fila_baixo = config.tempo_fila_baixo;
      if (config.tempo_fila_critico !== undefined) dbConfig.tempo_fila_critico = config.tempo_fila_critico;
      if (config.cards_para_alerta !== undefined) dbConfig.cards_para_alerta = config.cards_para_alerta;
      // Alertas
      if (config.alerta_freq_otimo !== undefined) dbConfig.alerta_freq_otimo = config.alerta_freq_otimo;
      if (config.alerta_freq_bom !== undefined) dbConfig.alerta_freq_bom = config.alerta_freq_bom;
      if (config.alerta_freq_baixo !== undefined) dbConfig.alerta_freq_baixo = config.alerta_freq_baixo;
      if (config.alerta_freq_critico !== undefined) dbConfig.alerta_freq_critico = config.alerta_freq_critico;
      // Tempos base
      if (config.tempo_vermelho !== undefined) dbConfig.tempo_base_vermelho = config.tempo_vermelho;
      if (config.tempo_laranja !== undefined) dbConfig.tempo_base_laranja = config.tempo_laranja;
      if (config.tempo_amarelo !== undefined) dbConfig.tempo_base_amarelo = config.tempo_amarelo;
      if (config.tempo_verde !== undefined) dbConfig.tempo_base_verde = config.tempo_verde;
      // Anti-burla
      if (config.tempo_minimo_atendimento !== undefined) dbConfig.tempo_minimo_atendimento = config.tempo_minimo_atendimento;
      if (config.alertas_burla_sequencia !== undefined) dbConfig.alertas_burla_sequencia = config.alertas_burla_sequencia;
      if (config.alertas_burla_janela_minutos !== undefined) dbConfig.alertas_burla_janela_minutos = config.alertas_burla_janela_minutos;
      // WhatsApp
      if (config.supervisor_whatsapp !== undefined) dbConfig.supervisor_whatsapp = config.supervisor_whatsapp;

      console.log('[Environment POST] Salvando config:', dbConfig);

      const { error } = await supabase
        .from('environment_config')
        .upsert(dbConfig, { onConflict: 'gym_id' });

      if (error) {
        console.error('[Environment POST] Erro:', error);
        throw error;
      }

      return NextResponse.json({ success: true, message: 'Configurações atualizadas' });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Erro ao atualizar config:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}
