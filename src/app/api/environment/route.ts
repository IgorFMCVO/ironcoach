// ============================================================================
// CAMINHO: src/app/api/environment/route.ts
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type EnvironmentLevel = 'OTIMO' | 'BOM' | 'BAIXO' | 'CRITICO';
type PriorityColor = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE' | 'PURPLE' | 'BLACK';

// GET - Buscar status do ambiente ou configurações
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const gymId = searchParams.get('gymId') || 'impacto';

    // Retornar configurações
    if (type === 'config') {
      const { data, error } = await supabase
        .from('environment_config')
        .select('*')
        .eq('gym_id', gymId)
        .single();

      // Se não encontrou ou tabela não existe, retornar config padrão
      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          // Retornar configuração padrão
          const defaultConfig = {
            gym_id: gymId,
            ratio_otimo_max: 5,
            ratio_bom_max: 10,
            ratio_baixo_max: 15,
            alerta_freq_otimo: 15,
            alerta_freq_bom: 10,
            alerta_freq_baixo: 5,
            alerta_freq_critico: 3,
            alerta_duracao_otimo: 2,
            alerta_duracao_bom: 2,
            alerta_duracao_baixo: 3,
            alerta_duracao_critico: 4,
            tempo_base_vermelho: 210,
            tempo_base_laranja: 270,
            tempo_base_amarelo: 330,
            tempo_base_verde: 390,
            tempo_base_azul: 450,
            ajuste_vermelho_laranja: 30,
            ajuste_amarelo_verde: 15,
            tempo_minimo_atendimento: 10,
            alertas_burla_sequencia: 3,
            alertas_burla_janela_minutos: 5,
            supervisor_whatsapp: ''
          };
          return NextResponse.json({ success: true, config: defaultConfig, isDefault: true });
        }
        throw error;
      }

      return NextResponse.json({ success: true, config: data });
    }

    // Buscar status do ambiente via função SQL
    const { data: statusData, error: statusError } = await supabase
      .rpc('calculate_environment_status', { p_gym_id: gymId });

    if (statusError) throw statusError;

    // Buscar config para ajustes
    const { data: config } = await supabase
      .from('environment_config')
      .select('*')
      .eq('gym_id', gymId)
      .single();

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

    return NextResponse.json({
      success: true,
      environment: {
        level,
        ...statusData,
        adjustments,
        alertFrequency
      }
    });

  } catch (error) {
    console.error('Erro na API environment:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Atualizar configurações
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, gymId = 'impacto' } = body;

    if (action === 'updateConfig') {
      // Preparar dados para upsert (garantir que gym_id está presente)
      const configData = {
        gym_id: gymId,
        ...config,
        updated_at: new Date().toISOString()
      };

      console.log('Salvando configuração:', JSON.stringify(configData, null, 2));

      const { data, error } = await supabase
        .from('environment_config')
        .upsert(configData, { 
          onConflict: 'gym_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Erro Supabase ao salvar config:', error);
        
        // Se a tabela não existir, retornar mensagem específica
        if (error.code === '42P01') {
          return NextResponse.json({ 
            success: false, 
            error: 'Tabela environment_config não existe. Execute o SQL de criação no Supabase.',
            details: error.message 
          }, { status: 500 });
        }
        
        throw error;
      }

      console.log('Config salva com sucesso:', data);
      return NextResponse.json({ success: true, message: 'Configurações atualizadas', data });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao atualizar config:', errorMessage);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno ao salvar configurações',
      details: errorMessage 
    }, { status: 500 });
  }
}
