// ============================================================================
// IRON COACH - Webhook Receiver para EVO (Entrada na Catraca)
// POST /api/webhook/evo
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getMemberById,
  calculateDaysAsMember,
  calculatePriority,
  generateTags,
  getMemberWorkouts,
  EvoWebhookPayload,
} from '@/lib/evo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const payload: EvoWebhookPayload = await request.json();
    
    console.log('📡 Webhook EVO recebido:', JSON.stringify(payload, null, 2));

    // Comparação case-insensitive
    if (payload.EventType?.toLowerCase() !== 'entries') {
      console.log(`⚠️ Evento ignorado: ${payload.EventType}`);
      return NextResponse.json({ success: true, message: 'Evento ignorado' });
    }

    const entryId = payload.IdRecord;
    const branchId = payload.IdBranch;

    let memberData = null;
    let memberId: number | null = null;

    try {
      const callbackResponse = await fetch(payload.ApiCallback, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.EVO_DNS}:${process.env.EVO_API_KEY}`).toString('base64')}`,
        },
      });

      if (callbackResponse.ok) {
        const entryData = await callbackResponse.json();
        memberId = entryData.idMember || entryData.IdMember;
        
        if (memberId) {
          memberData = await getMemberById(memberId);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do callback:', err);
    }

    if (!memberData || !memberId) {
      await supabase.from('evo_entries').insert({
        evo_entry_id: entryId,
        evo_member_id: memberId ?? null,
        evo_branch_id: branchId,
        entry_time: new Date().toISOString(),
        processed: false,
      });

      console.log('⚠️ Entrada registrada mas membro não encontrado');
      return NextResponse.json({ 
        success: true, 
        message: 'Entrada registrada, membro não encontrado' 
      });
    }

    const daysAsMember = calculateDaysAsMember(memberData.registerDate);
    const workouts = await getMemberWorkouts(memberId);
    const currentWorkout = workouts.length > 0 ? workouts[0] : null;
    const totalWorkouts = workouts.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingEntry } = await supabase
      .from('queue')
      .select('id')
      .eq('evo_member_id', memberId)
      .gte('check_in_time', today.toISOString())
      .is('check_out_time', null)
      .single();

    if (existingEntry) {
      console.log(`⚠️ Membro ${memberData.name} já está na fila`);
      return NextResponse.json({ 
        success: true, 
        message: 'Membro já está na fila' 
      });
    }

    const priority = calculatePriority(daysAsMember);
    const tags = generateTags(daysAsMember, totalWorkouts, false);

    const { data: queueEntry, error: insertError } = await supabase
      .from('queue')
      .insert({
        evo_member_id: memberId,
        member_name: memberData.name || `${memberData.firstName} ${memberData.lastName}`,
        status: 'WAITING',
        priority,
        help_requested: false,
        check_in_source: 'evo_catraca',
        workout_letter: currentWorkout?.letter || null,
        workout_name: currentWorkout?.name || null,
        tags,
        days_as_member: daysAsMember,
        total_workouts: totalWorkouts,
        check_in_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir na fila:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao adicionar na fila' },
        { status: 500 }
      );
    }

    await supabase.from('evo_entries').insert({
      evo_entry_id: entryId,
      evo_member_id: memberId,
      evo_branch_id: branchId,
      member_name: memberData.name,
      entry_time: new Date().toISOString(),
      processed: true,
      queue_id: queueEntry.id,
    });

    console.log(`✅ ${memberData.name} adicionado na fila via catraca (Prioridade: ${priority})`);

    return NextResponse.json({
      success: true,
      message: 'Check-in realizado com sucesso',
      data: {
        queueId: queueEntry.id,
        memberName: memberData.name,
        priority,
        tags,
      },
    });

  } catch (error) {
    console.error('❌ Erro no webhook EVO:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'IRON Coach - EVO Webhook Receiver',
    timestamp: new Date().toISOString(),
    events_supported: ['Entries'],
  });
}