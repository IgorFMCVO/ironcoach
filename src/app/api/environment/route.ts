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

      if (error && error.code !== 'PGRST116') throw error;

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
      const { error } = await supabase
        .from('environment_config')
        .upsert({
          gym_id: gymId,
          ...config,
          updated_at: new Date().toISOString()
        }, { onConflict: 'gym_id' });

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Configurações atualizadas' });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Erro ao atualizar config:', error);
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 });
  }
}
