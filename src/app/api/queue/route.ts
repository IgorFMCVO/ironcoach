// src/app/api/queue/route.ts
// ============================================================================
// API: QUEUE
// Retorna a fila de atendimento atual
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { QueueMember, AttendancePriority, MemberStatus } from '@/types';

// ============================================================================
// STORE EM MEMÓRIA (compartilhado com check-in - em produção usar DB real)
// ============================================================================

// Dados mock para demonstração
const mockQueue: QueueMember[] = [
  {
    id: "1",
    odrinUserId: "user1",
    name: "Carlos Silva",
    status: MemberStatus.WAITING_HELP,
    priority: AttendancePriority.RED,
    currentWorkout: { 
      id: "w1", 
      name: "Treino A - Peito/Tríceps", 
      letter: "A", 
      exerciseCount: 8, 
      currentExerciseIndex: 2, 
      currentExerciseName: "Supino Inclinado" 
    },
    metrics: { 
      daysAsMember: 5, 
      totalWorkouts: 2, 
      daysSinceNewProgram: 5, 
      completionRate: 0.8, 
      daysSinceLastWorkout: 2 
    },
    checkInTime: new Date(Date.now() - 15 * 60000).toISOString(),
    lastActivityTime: new Date(Date.now() - 3 * 60000).toISOString(),
    waitingSinceTime: new Date(Date.now() - 8 * 60000).toISOString(),
    attendanceCount: 0,
    helpRequested: true,
    isFirstVisit: false,
    hasNewProgram: true,
  },
  {
    id: "2",
    odrinUserId: "user2",
    name: "Maria Santos",
    status: MemberStatus.TRAINING,
    priority: AttendancePriority.RED,
    currentWorkout: { 
      id: "w2", 
      name: "Treino A - Full Body", 
      letter: "A", 
      exerciseCount: 10, 
      currentExerciseIndex: 0, 
      currentExerciseName: "Agachamento Livre" 
    },
    metrics: { 
      daysAsMember: 2, 
      totalWorkouts: 0, 
      daysSinceNewProgram: 2, 
      completionRate: 0, 
      daysSinceLastWorkout: 999 
    },
    checkInTime: new Date(Date.now() - 10 * 60000).toISOString(),
    lastActivityTime: new Date(Date.now() - 1 * 60000).toISOString(),
    waitingSinceTime: new Date(Date.now() - 10 * 60000).toISOString(),
    attendanceCount: 0,
    helpRequested: false,
    isFirstVisit: true,
    hasNewProgram: true,
  },
  {
    id: "3",
    odrinUserId: "user3",
    name: "João Oliveira",
    status: MemberStatus.TRAINING,
    priority: AttendancePriority.ORANGE,
    currentWorkout: { 
      id: "w3", 
      name: "Treino B - Costas/Bíceps", 
      letter: "B", 
      exerciseCount: 7, 
      currentExerciseIndex: 4, 
      currentExerciseName: "Rosca Direta" 
    },
    metrics: { 
      daysAsMember: 18, 
      totalWorkouts: 6, 
      daysSinceNewProgram: 18, 
      completionRate: 0.75, 
      daysSinceLastWorkout: 3 
    },
    checkInTime: new Date(Date.now() - 25 * 60000).toISOString(),
    lastActivityTime: new Date(Date.now() - 2 * 60000).toISOString(),
    waitingSinceTime: new Date(Date.now() - 12 * 60000).toISOString(),
    attendanceCount: 1,
    helpRequested: false,
    isFirstVisit: false,
    hasNewProgram: false,
  },
  {
    id: "4",
    odrinUserId: "user4",
    name: "Ana Pereira",
    status: MemberStatus.TRAINING,
    priority: AttendancePriority.YELLOW,
    currentWorkout: { 
      id: "w4", 
      name: "Treino C - Pernas", 
      letter: "C", 
      exerciseCount: 9, 
      currentExerciseIndex: 6, 
      currentExerciseName: "Leg Press" 
    },
    metrics: { 
      daysAsMember: 45, 
      totalWorkouts: 15, 
      daysSinceNewProgram: 10, 
      completionRate: 0.85, 
      daysSinceLastWorkout: 1 
    },
    checkInTime: new Date(Date.now() - 40 * 60000).toISOString(),
    lastActivityTime: new Date(Date.now() - 5 * 60000).toISOString(),
    waitingSinceTime: new Date(Date.now() - 5 * 60000).toISOString(),
    attendanceCount: 0,
    helpRequested: false,
    isFirstVisit: false,
    hasNewProgram: true,
  },
  {
    id: "5",
    odrinUserId: "user5",
    name: "Pedro Costa",
    status: MemberStatus.TRAINING,
    priority: AttendancePriority.GREEN,
    currentWorkout: { 
      id: "w5", 
      name: "Treino A - Push", 
      letter: "A", 
      exerciseCount: 6, 
      currentExerciseIndex: 5, 
      currentExerciseName: "Tríceps Corda" 
    },
    metrics: { 
      daysAsMember: 180, 
      totalWorkouts: 85, 
      daysSinceNewProgram: 30, 
      completionRate: 0.95, 
      daysSinceLastWorkout: 1 
    },
    checkInTime: new Date(Date.now() - 50 * 60000).toISOString(),
    lastActivityTime: new Date(Date.now() - 1 * 60000).toISOString(),
    attendanceCount: 0,
    helpRequested: false,
    isFirstVisit: false,
    hasNewProgram: false,
  },
];

// ============================================================================
// GET: Retorna fila completa
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gymId = searchParams.get('gymId') || 'default';
  
  // Ordenar por prioridade
  const sortedQueue = [...mockQueue].sort((a, b) => {
    // Quem pediu ajuda primeiro
    if (a.helpRequested && !b.helpRequested) return -1;
    if (!a.helpRequested && b.helpRequested) return 1;
    
    // Depois por prioridade
    const priorityOrder: Record<AttendancePriority, number> = {
      [AttendancePriority.RED]: 1,
      [AttendancePriority.ORANGE]: 2,
      [AttendancePriority.YELLOW]: 3,
      [AttendancePriority.BLUE]: 4,
      [AttendancePriority.GREEN]: 5,
      [AttendancePriority.BLACK]: 6,
    };
    
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    
    // Depois por tempo de espera
    const aWait = a.waitingSinceTime ? new Date(a.waitingSinceTime).getTime() : Date.now();
    const bWait = b.waitingSinceTime ? new Date(b.waitingSinceTime).getTime() : Date.now();
    return aWait - bWait;
  });
  
  // Calcular estatísticas
  const stats = {
    totalInGym: sortedQueue.length,
    attendancesToday: 12, // Mock
    byPriority: {
      [AttendancePriority.RED]: sortedQueue.filter(m => m.priority === AttendancePriority.RED).length,
      [AttendancePriority.ORANGE]: sortedQueue.filter(m => m.priority === AttendancePriority.ORANGE).length,
      [AttendancePriority.YELLOW]: sortedQueue.filter(m => m.priority === AttendancePriority.YELLOW).length,
      [AttendancePriority.BLUE]: sortedQueue.filter(m => m.priority === AttendancePriority.BLUE).length,
      [AttendancePriority.GREEN]: sortedQueue.filter(m => m.priority === AttendancePriority.GREEN).length,
      [AttendancePriority.BLACK]: sortedQueue.filter(m => m.priority === AttendancePriority.BLACK).length,
    },
  };
  
  return NextResponse.json({
    success: true,
    queue: sortedQueue,
    stats,
    updatedAt: new Date().toISOString(),
  });
}

// ============================================================================
// POST: Atualizar membro na fila
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, data } = body;
    
    switch (action) {
      case 'REQUEST_HELP':
        // Marcar que pediu ajuda
        const memberIndex = mockQueue.findIndex(m => m.odrinUserId === userId);
        if (memberIndex >= 0) {
          mockQueue[memberIndex].helpRequested = true;
          mockQueue[memberIndex].status = MemberStatus.WAITING_HELP;
          mockQueue[memberIndex].priority = AttendancePriority.RED;
        }
        break;
        
      case 'UPDATE_ACTIVITY':
        // Atualizar última atividade
        const mIndex = mockQueue.findIndex(m => m.odrinUserId === userId);
        if (mIndex >= 0) {
          mockQueue[mIndex].lastActivityTime = new Date().toISOString();
          if (data?.exerciseIndex !== undefined && mockQueue[mIndex].currentWorkout) {
            mockQueue[mIndex].currentWorkout!.currentExerciseIndex = data.exerciseIndex;
            mockQueue[mIndex].currentWorkout!.currentExerciseName = data.exerciseName;
          }
        }
        break;
        
      case 'CHECK_OUT':
        // Remover da fila
        const idx = mockQueue.findIndex(m => m.odrinUserId === userId);
        if (idx >= 0) {
          mockQueue.splice(idx, 1);
        }
        break;
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Erro ao processar ação' },
      { status: 500 }
    );
  }
}
