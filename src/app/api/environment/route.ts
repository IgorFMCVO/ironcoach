// ============================================================================
// API: Sistema de Alertas de Ambiente
// GET /api/environment - Buscar configuração e status
// POST /api/environment - Atualizar configuração
// PUT /api/environment - Atualizar status do coach no salão
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET - Buscar configuração e coaches no salão
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get('gymId') || 'default';
    
    // Buscar configuração
    const { data: configData, error: configError } = await supabase.rpc('get_environment_config', {
      p_gym_id: gymId
    });
    
    if (configError) {
      console.error('Erro ao buscar config:', configError);
    }
    
    // Buscar coaches no salão
    const { data: coachesData, error: coachesError } = await supabase.rpc('count_coaches_on_floor');
    
    if (coachesError) {
      console.error('Erro ao buscar coaches:', coachesError);
    }
    
    // Buscar todos os coaches para saber quem está disponível
    const { data: allCoaches, error: allCoachesError } = await supabase
      .from('coach_floor_status')
      .select('*')
      .order('coach_name');
    
    return NextResponse.json({
      success: true,
      config: configData || {},
      coachesOnFloor: coachesData?.count || 0,
      coaches: coachesData?.coaches || [],
      allCoaches: allCoaches || [],
    });
    
  } catch (error) {
    console.error('Erro no GET /api/environment:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

// POST - Salvar configuração
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gymId = 'default', config } = body;
    
    const { data, error } = await supabase.rpc('save_environment_config', {
      p_gym_id: gymId,
      p_config: config
    });
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Configuração salva com sucesso'
    });
    
  } catch (error) {
    console.error('Erro no POST /api/environment:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

// PUT - Atualizar status do coach no salão (entrar/sair)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { coachId, coachName, role, isOnFloor } = body;
    
    if (!coachId || !coachName) {
      return NextResponse.json({ 
        success: false, 
        error: 'coachId e coachName são obrigatórios' 
      }, { status: 400 });
    }
    
    const { data, error } = await supabase.rpc('set_coach_floor_status', {
      p_coach_id: coachId,
      p_coach_name: coachName,
      p_role: role || 'PROFESSOR',
      p_is_on_floor: isOnFloor
    });
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }
    
    // Se for crítico e supervisor entrou como reforço, notificar
    // (lógica de WhatsApp pode ser adicionada aqui futuramente)
    
    return NextResponse.json({
      success: true,
      message: isOnFloor ? 'Entrou no salão' : 'Saiu do salão',
      data
    });
    
  } catch (error) {
    console.error('Erro no PUT /api/environment:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

// PATCH - Registrar alerta no histórico
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      nivel, 
      alunosAtivos, 
      professoresOnline, 
      ratio,
      cardsOtimo,
      cardsBom,
      cardsBaixo,
      cardsCritico,
      tempoVermelho,
      tempoLaranja,
      tempoAmarelo,
      tempoVerde,
      alertaTipo
    } = body;
    
    const { data, error } = await supabase.rpc('log_environment_alert', {
      p_nivel: nivel,
      p_alunos_ativos: alunosAtivos,
      p_professores_online: professoresOnline,
      p_ratio: ratio,
      p_cards_otimo: cardsOtimo,
      p_cards_bom: cardsBom,
      p_cards_baixo: cardsBaixo,
      p_cards_critico: cardsCritico,
      p_tempo_vermelho: tempoVermelho,
      p_tempo_laranja: tempoLaranja,
      p_tempo_amarelo: tempoAmarelo,
      p_tempo_verde: tempoVerde,
      p_alerta_tipo: alertaTipo
    });
    
    if (error) {
      console.error('Erro ao registrar alerta:', error);
    }
    
    return NextResponse.json({
      success: true
    });
    
  } catch (error) {
    console.error('Erro no PATCH /api/environment:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
