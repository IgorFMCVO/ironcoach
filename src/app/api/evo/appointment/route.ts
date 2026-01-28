// ============================================================================
// IRON COACH - API para Agendamentos EVO (Avaliação Física, etc)
// GET /api/evo/appointment - Lista atividades disponíveis
// GET /api/evo/appointment?action=availability&idActivity=X&date=Y - Horários
// POST /api/evo/appointment - Agendar membro
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAppointmentActivities,
  getAppointmentAvailability,
  enrollMemberInAppointment,
} from '@/lib/evo';

/**
 * GET /api/evo/appointment
 * Lista atividades ou horários disponíveis
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  // Se action=availability, buscar horários
  if (action === 'availability') {
    const idActivity = searchParams.get('idActivity');
    const date = searchParams.get('date');
    const dateEnd = searchParams.get('dateEnd');
    
    if (!idActivity || !date) {
      return NextResponse.json(
        { success: false, error: 'idActivity e date são obrigatórios' },
        { status: 400 }
      );
    }
    
    console.log(`[API Appointment] GET availability - Activity: ${idActivity}, Date: ${date}`);
    
    const result = await getAppointmentAvailability(
      parseInt(idActivity),
      date,
      dateEnd || undefined
    );
    
    return NextResponse.json(result);
  }
  
  // Senão, buscar lista de atividades
  console.log('[API Appointment] GET - Buscando atividades...');
  
  try {
    const result = await getAppointmentActivities();
    
    console.log('[API Appointment] Resultado:', {
      success: result.success,
      count: result.data?.length || 0,
    });
    
    // Se não encontrou atividades, retornar erro claro
    if (!result.success || !result.data || result.data.length === 0) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Nenhuma atividade de agendamento encontrada no EVO. Verifique as configurações de Agenda de Serviços no sistema.',
        data: [],
      });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data.length,
    });
  } catch (error) {
    console.error('[API Appointment] Exceção:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao conectar com EVO' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evo/appointment
 * Agendar membro em uma sessão
 * 
 * Body:
 * {
 *   idMember: number,
 *   idSession: number,
 *   idActivity?: number,
 * }
 */
export async function POST(request: NextRequest) {
  console.log('[API Appointment] POST - Agendando membro...');
  
  try {
    const body = await request.json();
    const { idMember, idSession, idActivity } = body;
    
    if (!idMember || !idSession) {
      return NextResponse.json(
        { success: false, error: 'idMember e idSession são obrigatórios' },
        { status: 400 }
      );
    }
    
    console.log(`[API Appointment] Agendando membro ${idMember} na sessão ${idSession}`);
    
    const result = await enrollMemberInAppointment(idMember, idSession, idActivity);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('[API Appointment] Exceção:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
