// ============================================================================
// IRON COACH - API para Gestão de Treinos EVO
// GET /api/evo/workout - Lista treinos padrão
// POST /api/evo/workout - Vincular treino a cliente
// PUT /api/evo/workout - Atualizar treino (renovar validade, etc)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getDefaultWorkouts, 
  linkWorkoutToClient, 
  updateClientWorkout,
  renewWorkoutValidity,
  LinkWorkoutParams,
  UpdateWorkoutParams,
} from '@/lib/evo';

/**
 * GET /api/evo/workout
 * Lista todos os treinos padrão disponíveis
 * Endpoint EVO: /api/v1/workout/default-workout
 */
export async function GET() {
  console.log('[API Workout] GET - Buscando treinos padrão...');
  
  try {
    const result = await getDefaultWorkouts();
    
    console.log('[API Workout] Resultado:', {
      success: result.success,
      count: result.data?.length || 0,
      error: result.error,
    });
    
    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Nenhum treino padrão encontrado no EVO',
        data: [],
      });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data.length,
    });
  } catch (error) {
    console.error('[API Workout] Exceção:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao buscar treinos', data: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evo/workout
 * Vincular um treino padrão a um cliente
 * 
 * Body:
 * {
 *   action: "link",
 *   sourceWorkout: number,  // ID do treino padrão
 *   idClient: number,       // ID do cliente no EVO
 *   idPrescriptionEmployee: number,  // ID do funcionário
 *   prescriptionDate?: string,       // Data (opcional)
 *   endAllActiveWorkouts?: boolean   // Encerrar outros (default: true)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { action, sourceWorkout, idClient, idPrescriptionEmployee, prescriptionDate, endAllActiveWorkouts } = body;
    
    if (action !== 'link') {
      return NextResponse.json(
        { success: false, error: 'Ação inválida. Use action: "link"' },
        { status: 400 }
      );
    }
    
    if (!sourceWorkout || !idClient || !idPrescriptionEmployee) {
      return NextResponse.json(
        { success: false, error: 'Parâmetros obrigatórios: sourceWorkout, idClient, idPrescriptionEmployee' },
        { status: 400 }
      );
    }
    
    const params: LinkWorkoutParams = {
      sourceWorkout: Number(sourceWorkout),
      idClient: Number(idClient),
      idPrescriptionEmployee: Number(idPrescriptionEmployee),
      prescriptionDate,
      endAllActiveWorkouts: endAllActiveWorkouts ?? true,
    };
    
    console.log('🏋️ API: Vinculando treino:', params);
    
    const result = await linkWorkoutToClient(params);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Treino vinculado com sucesso',
      data: result.data,
    });
  } catch (error) {
    console.error('Erro ao vincular treino:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/evo/workout
 * Atualizar dados de um treino prescrito
 * 
 * Body:
 * {
 *   action: "update" | "renew",
 *   idWorkout: number,           // ID do treino prescrito
 *   // Para action: "update"
 *   workoutName?: string,
 *   startDate?: string,
 *   expirationDate?: string,
 *   observation?: string,
 *   weeklyFrequency?: number,
 *   totalWeeks?: number,
 *   // Para action: "renew"
 *   daysToAdd?: number           // Default: 30
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { action, idWorkout, daysToAdd, idClient, idPrescriptionEmployee, ...updateParams } = body;
    
    if (!idWorkout) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro obrigatório: idWorkout' },
        { status: 400 }
      );
    }
    
    let result;
    
    if (action === 'renew') {
      // Renovar validade (re-vinculando o mesmo treino)
      if (!idClient) {
        return NextResponse.json(
          { success: false, error: 'Parâmetro obrigatório para renovação: idClient' },
          { status: 400 }
        );
      }
      
      console.log(`🔄 API: Renovando treino ${idWorkout} para cliente ${idClient}`);
      result = await renewWorkoutValidity(
        Number(idWorkout), 
        daysToAdd || 30,
        Number(idClient),
        idPrescriptionEmployee || 222 // Default: Igor
      );
    } else {
      // Atualizar dados
      const params: UpdateWorkoutParams = {
        idWorkout: Number(idWorkout),
        ...updateParams,
      };
      
      console.log('📝 API: Atualizando treino:', params);
      result = await updateClientWorkout(params);
    }
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: action === 'renew' ? 'Treino renovado com sucesso' : 'Treino atualizado com sucesso',
      data: result.data,
    });
  } catch (error) {
    console.error('Erro ao atualizar treino:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
