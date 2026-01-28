// src/app/api/check-in/route.ts
// ============================================================================
// API: CHECK-IN
// Recebe check-in do app do aluno e adiciona na fila
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  CheckInRequest, 
  CheckInResponse, 
  QueueMember,
  MemberStatus,
  calculatePriority,
} from '@/types';

// ============================================================================
// STORE EM MEMÓRIA (em produção, usar Supabase ou Redis)
// ============================================================================

// Simula banco de dados em memória
const queueStore = new Map<string, QueueMember>();

// ============================================================================
// HELPER: Calcular dias entre datas
// ============================================================================

function daysBetween(date1: string, date2: Date = new Date()): number {
  const d1 = new Date(date1);
  const diff = date2.getTime() - d1.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============================================================================
// POST: Registrar check-in
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: CheckInRequest = await request.json();
    
    const { userId, gymId, source, memberData } = body;
    
    // Validar dados obrigatórios
    if (!userId || !memberData?.name) {
      return NextResponse.json(
        { success: false, message: 'userId e memberData.name são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Calcular métricas
    const daysAsMember = daysBetween(memberData.memberSince);
    const daysSinceLastWorkout = memberData.lastWorkoutAt 
      ? daysBetween(memberData.lastWorkoutAt) 
      : 999;
    const daysSinceNewProgram = memberData.currentProgramCreatedAt
      ? daysBetween(memberData.currentProgramCreatedAt)
      : 999;
    
    const metrics = {
      daysAsMember,
      totalWorkouts: memberData.totalWorkouts || 0,
      daysSinceNewProgram,
      completionRate: memberData.completionRate || 0,
      daysSinceLastWorkout,
    };
    
    // Calcular prioridade
    const priority = calculatePriority(metrics);
    
    // Criar membro na fila
    const queueMember: QueueMember = {
      id: `queue_${userId}_${Date.now()}`,
      odrinUserId: userId,
      name: memberData.name,
      photoUrl: memberData.photoUrl,
      
      status: MemberStatus.CHECKED_IN,
      priority,
      
      currentWorkout: memberData.currentWorkout ? {
        id: memberData.currentWorkout.id,
        name: memberData.currentWorkout.name,
        letter: memberData.currentWorkout.letter,
        exerciseCount: memberData.currentWorkout.exercises.length,
        currentExerciseIndex: 0,
        currentExerciseName: memberData.currentWorkout.exercises[0]?.name,
      } : undefined,
      
      metrics,
      
      checkInTime: new Date().toISOString(),
      lastActivityTime: new Date().toISOString(),
      waitingSinceTime: new Date().toISOString(),
      
      attendanceCount: 0,
      helpRequested: false,
      isFirstVisit: memberData.totalWorkouts === 0,
      hasNewProgram: daysSinceNewProgram <= 7,
    };
    
    // Salvar na fila
    queueStore.set(userId, queueMember);
    
    // Calcular posição na fila
    const allMembers = Array.from(queueStore.values());
    const sortedMembers = allMembers.sort((a, b) => {
      const priorityOrder = { RED: 1, ORANGE: 2, YELLOW: 3, BLUE: 4, GREEN: 5, BLACK: 6 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      
      const aWait = a.waitingSinceTime ? new Date(a.waitingSinceTime).getTime() : Date.now();
      const bWait = b.waitingSinceTime ? new Date(b.waitingSinceTime).getTime() : Date.now();
      return aWait - bWait;
    });
    
    const position = sortedMembers.findIndex(m => m.odrinUserId === userId) + 1;
    
    // Mensagem de boas-vindas
    let message = `Bem-vindo, ${memberData.name}!`;
    if (queueMember.isFirstVisit) {
      message = `Bem-vindo ao seu primeiro treino, ${memberData.name}! Um professor irá te auxiliar em breve.`;
    } else if (queueMember.hasNewProgram) {
      message = `Olá, ${memberData.name}! Vejo que você tem uma nova ficha. Um professor verificará sua execução.`;
    } else if (daysSinceLastWorkout >= 7) {
      message = `Que bom ter você de volta, ${memberData.name}! Vamos retomar os treinos.`;
    }
    
    const response: CheckInResponse = {
      success: true,
      queueMember,
      position,
      message,
    };
    
    console.log(`[CHECK-IN] ${memberData.name} | Prioridade: ${priority} | Posição: ${position}`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[CHECK-IN] Erro:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET: Buscar status do check-in
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { success: false, message: 'userId é obrigatório' },
      { status: 400 }
    );
  }
  
  const member = queueStore.get(userId);
  
  if (!member) {
    return NextResponse.json(
      { success: false, message: 'Usuário não está na fila', inQueue: false },
      { status: 200 }
    );
  }
  
  // Calcular posição
  const allMembers = Array.from(queueStore.values());
  const sortedMembers = allMembers.sort((a, b) => {
    const priorityOrder = { RED: 1, ORANGE: 2, YELLOW: 3, BLUE: 4, GREEN: 5, BLACK: 6 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  const position = sortedMembers.findIndex(m => m.odrinUserId === userId) + 1;
  
  return NextResponse.json({
    success: true,
    inQueue: true,
    member,
    position,
  });
}
