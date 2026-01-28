// src/app/api/webhook/evo/teste/route.ts
// ============================================================================
// IRON COACH - Webhook TESTE para simular entrada na catraca
// POST /api/webhook/evo/teste
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Função para calcular prioridade baseado em dias como membro
function calculatePriority(daysAsMember: number): string {
  if (daysAsMember <= 7) return 'RED';
  if (daysAsMember <= 30) return 'ORANGE';
  if (daysAsMember <= 60) return 'YELLOW';
  if (daysAsMember <= 90) return 'BLUE';
  if (daysAsMember <= 180) return 'GREEN';
  return 'BLACK';
}

// Função para gerar tags
function generateTags(daysAsMember: number): string[] {
  const tags: string[] = [];
  
  if (daysAsMember <= 7) tags.push('1ª SEMANA');
  else if (daysAsMember <= 14) tags.push('2ª SEMANA');
  else if (daysAsMember <= 30) tags.push('PRIMEIRO MÊS');
  
  return tags;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    console.log('🧪 TESTE - Webhook EVO simulado:', JSON.stringify(payload, null, 2));

    // Valida o tipo de evento
    if (payload.EventType !== 'Entries') {
      return NextResponse.json({ success: false, message: 'Evento deve ser Entries' });
    }

    // Usa dados de teste se fornecidos
    const memberData = payload._memberData || {
      idMember: payload.IdRecord,
      name: `Aluno Teste ${payload.IdRecord}`,
      registerDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const memberId = memberData.idMember;
    const memberName = memberData.name;
    const registerDate = new Date(memberData.registerDate);
    const daysAsMember = Math.floor((Date.now() - registerDate.getTime()) / (1000 * 60 * 60 * 24));

    // Verifica se já está na fila hoje (evita duplicatas)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: existingEntry } = await supabase
      .from('queue')
      .select('id')
      .eq('member_name', memberName)
      .gte('check_in_time', today.toISOString())
      .is('check_out_time', null)
      .single();

    if (existingEntry) {
      return NextResponse.json({ 
        success: true, 
        message: 'Aluno já está na fila',
        alreadyInQueue: true,
      });
    }

    // Calcula prioridade e tags
    const priority = calculatePriority(daysAsMember);
    const tags = generateTags(daysAsMember);

    // Adiciona na fila
    const { data: queueEntry, error: insertError } = await supabase
      .from('queue')
      .insert({
        member_name: memberName,
        status: 'TRAINING',
        priority,
        help_requested: false,
        check_in_source: 'evo_teste',
        tags: tags,
        days_as_member: daysAsMember,
        total_workouts: 0,
        check_in_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir na fila:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao adicionar na fila', details: insertError.message },
        { status: 500 }
      );
    }

    // Registra a entrada de teste
    await supabase.from('evo_entries').insert({
      evo_entry_id: payload.IdRecord,
      evo_branch_id: payload.IdBranch || 1,
      member_name: memberName,
      entry_time: new Date().toISOString(),
      processed: true,
    });

    console.log(`✅ TESTE - ${memberName} adicionado na fila (Prioridade: ${priority})`);

    return NextResponse.json({
      success: true,
      message: '✅ Entrada simulada com sucesso!',
      data: {
        queueId: queueEntry.id,
        memberName,
        memberId,
        daysAsMember,
        priority,
        tags,
      },
    });

  } catch (error) {
    console.error('❌ Erro no teste de webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno', details: String(error) },
      { status: 500 }
    );
  }
}