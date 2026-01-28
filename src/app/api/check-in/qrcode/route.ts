// ============================================================================
// IRON COACH - Check-in via QR Code / CPF
// POST /api/checkin/qrcode
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  searchMember,
  getMemberById,
  calculateDaysAsMember,
  calculatePriority,
  generateTags,
  getMemberWorkouts,
  isEvoConfigured,
} from '@/lib/evo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document, email, evoMemberId, name } = body;

    console.log('📱 Check-in QR Code recebido:', { document, email, evoMemberId, name });

    let memberData = null;
    let memberId: number | null = null;
    let daysAsMember = 0;
    let totalWorkouts = 0;
    let workoutLetter: string | null = null;
    let workoutName: string | null = null;
    let memberName = name || 'Aluno';

    // Se tem integração EVO configurada, busca os dados
    if (isEvoConfigured()) {
      // Busca pelo ID do EVO
      if (evoMemberId) {
        memberData = await getMemberById(evoMemberId);
        memberId = evoMemberId;
      }
      // Busca pelo documento ou email
      else if (document || email) {
        memberData = await searchMember(document || email);
        memberId = memberData?.idMember || null;
      }

      if (memberData) {
        memberName = memberData.name || `${memberData.firstName} ${memberData.lastName}`;
        daysAsMember = calculateDaysAsMember(memberData.registerDate);

        // Busca treinos
        if (memberId) {
          const workouts = await getMemberWorkouts(memberId);
          totalWorkouts = workouts.length;
          if (workouts.length > 0) {
            workoutLetter = workouts[0].letter;
            workoutName = workouts[0].name;
          }
        }
      }
    }
    // Sem EVO, usa dados fornecidos manualmente
    else if (name) {
      memberName = name;
      // Tenta buscar membro existente no Supabase por nome aproximado
      const { data: existingMember } = await supabase
        .from('evo_members')
        .select('*')
        .ilike('name', `%${name}%`)
        .single();

      if (existingMember) {
        memberId = existingMember.evo_id;
        daysAsMember = existingMember.days_as_member || 0;
        totalWorkouts = existingMember.total_entries || 0;
        workoutLetter = existingMember.current_workout_letter;
        workoutName = existingMember.current_workout_name;
      }
    }

    // Se não encontrou membro e não tem nome, erro
    if (!memberData && !name && isEvoConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Aluno não encontrado. Verifique seu CPF.' },
        { status: 404 }
      );
    }

    // Verifica se já está na fila hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const queryBuilder = supabase
      .from('queue')
      .select('id, member_name')
      .gte('check_in_time', today.toISOString())
      .is('check_out_time', null);

    // Filtra por evo_member_id ou nome
    if (memberId) {
      queryBuilder.eq('evo_member_id', memberId);
    } else {
      queryBuilder.ilike('member_name', `%${memberName}%`);
    }

    const { data: existingEntry } = await queryBuilder.single();

    if (existingEntry) {
      console.log(`⚠️ ${memberName} já está na fila`);
      return NextResponse.json({
        success: true,
        alreadyInQueue: true,
        memberName,
        message: 'Você já está na fila!',
      });
    }

    // Calcula prioridade e tags
    const priority = calculatePriority(daysAsMember);
    const tags = generateTags(daysAsMember, totalWorkouts, false);

    // Adiciona na fila
    const { data: queueEntry, error: insertError } = await supabase
      .from('queue')
      .insert({
        evo_member_id: memberId,
        member_name: memberName,
        status: 'WAITING',
        priority,
        help_requested: false,
        check_in_source: 'qrcode',
        workout_letter: workoutLetter,
        workout_name: workoutName,
        tags: JSON.stringify(tags),
        days_as_member: daysAsMember,
        total_workouts: totalWorkouts,
        check_in_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir na fila:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao fazer check-in. Tente novamente.' },
        { status: 500 }
      );
    }

    console.log(`✅ ${memberName} adicionado na fila via QR Code (Prioridade: ${priority})`);

    return NextResponse.json({
      success: true,
      alreadyInQueue: false,
      memberName,
      priority,
      tags,
      queueId: queueEntry.id,
      message: 'Check-in realizado com sucesso!',
    });

  } catch (error) {
    console.error('❌ Erro no check-in QR Code:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    );
  }
}

// GET para verificar status
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'IRON Coach - QR Code Check-in',
    evoConfigured: isEvoConfigured(),
    timestamp: new Date().toISOString(),
  });
}