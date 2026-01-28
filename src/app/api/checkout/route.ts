// src/app/api/checkout/route.ts
// ============================================================================
// IRON COACH - API de Check-out (Saída do Aluno)
// ULTRA-MINIMALISTA: Primeiro tenta SÓ check_out_time, ignora todo o resto
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  let queueId = '';
  let memberName = 'Desconhecido';
  
  try {
    const body = await request.json();
    queueId = body.queueId || '';

    console.log('🔄 Checkout POST:', { queueId });

    if (!queueId) {
      return NextResponse.json({ success: false, error: 'queueId é obrigatório' }, { status: 400 });
    }

    // Buscar dados mínimos da fila
    const { data: queueItem, error: fetchError } = await supabase
      .from('queue')
      .select('id, member_name, check_out_time')
      .eq('id', queueId)
      .single();

    if (fetchError) {
      console.error('❌ Erro ao buscar item:', fetchError.message);
      return NextResponse.json({ success: false, error: 'Item não encontrado', details: fetchError.message }, { status: 404 });
    }

    if (!queueItem) {
      return NextResponse.json({ success: false, error: 'Item não encontrado na fila' }, { status: 404 });
    }

    memberName = queueItem.member_name || 'Desconhecido';
    console.log('📋 Item encontrado:', memberName);

    // Se já fez checkout, retorna sucesso
    if (queueItem.check_out_time) {
      console.log('⚠️ Já fez checkout');
      return NextResponse.json({ success: true, message: 'Já fez checkout', alreadyCheckedOut: true });
    }

    const now = new Date().toISOString();

    // =========================================================================
    // TENTATIVA 1: UPDATE só com check_out_time (campo que sabemos que existe)
    // =========================================================================
    console.log('📡 Tentativa 1: UPDATE check_out_time...');
    const { error: updateError } = await supabase
      .from('queue')
      .update({ check_out_time: now })
      .eq('id', queueId);

    if (!updateError) {
      console.log('✅ Checkout OK via UPDATE');
      return NextResponse.json({ success: true, message: 'Checkout realizado', memberName });
    }

    console.error('❌ UPDATE falhou:', updateError.message);

    // =========================================================================
    // TENTATIVA 2: DELETE (remove da fila completamente)
    // =========================================================================
    console.log('📡 Tentativa 2: DELETE...');
    const { error: deleteError } = await supabase
      .from('queue')
      .delete()
      .eq('id', queueId);

    if (!deleteError) {
      console.log('✅ Checkout OK via DELETE');
      return NextResponse.json({ success: true, message: 'Checkout realizado (delete)', memberName });
    }

    console.error('❌ DELETE falhou:', deleteError.message);

    // =========================================================================
    // TENTATIVA 3: UPDATE com status diferente
    // =========================================================================
    console.log('📡 Tentativa 3: UPDATE status...');
    const { error: statusError } = await supabase
      .from('queue')
      .update({ status: 'CHECKED_OUT' })
      .eq('id', queueId);

    if (!statusError) {
      console.log('✅ Checkout OK via status');
      return NextResponse.json({ success: true, message: 'Checkout realizado (status)', memberName });
    }

    console.error('❌ Todas as tentativas falharam');
    return NextResponse.json({ 
      success: false, 
      error: 'Não foi possível fazer checkout',
      details: {
        update: updateError?.message,
        delete: deleteError?.message,
        status: statusError?.message
      }
    }, { status: 500 });

  } catch (error) {
    console.error('❌ Exceção:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
