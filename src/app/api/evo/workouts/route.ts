// ============================================================================
// API: Buscar treinos completos do cliente no EVO
// GET /api/evo/workouts?idClient=123
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getClientWorkouts, getWorkoutById } from '@/lib/evo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idClient = searchParams.get('idClient');
    const idWorkout = searchParams.get('idWorkout');
    const includeInactive = searchParams.get('inactive') === 'true';
    const includeDeleted = searchParams.get('deleted') === 'true';

    // Buscar treino específico
    if (idWorkout) {
      const workout = await getWorkoutById(parseInt(idWorkout, 10));
      
      if (!workout) {
        return NextResponse.json(
          { error: 'Treino não encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, workout });
    }

    // Buscar todos os treinos do cliente
    if (!idClient) {
      return NextResponse.json(
        { error: 'idClient é obrigatório' },
        { status: 400 }
      );
    }

    const data = await getClientWorkouts(
      parseInt(idClient, 10),
      includeInactive,
      includeDeleted
    );

    if (!data) {
      return NextResponse.json(
        { error: 'Não foi possível buscar treinos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      clientId: data.idCliente,
      clientName: data.nome,
      clientPhoto: data.urlFoto,
      workouts: data.treinos || [],
      totalWorkouts: data.treinos?.length || 0,
    });
  } catch (error) {
    console.error('[API] Erro ao buscar treinos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
