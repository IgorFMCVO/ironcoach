// ============================================================================
// CAMINHO: src/app/api/consultoras/pending-entries/route.ts
// ============================================================================

// src/app/api/consultoras/pending-entries/route.ts
// ============================================================================
// IRON COACH - API para Entradas Manuais Pendentes
// GET - Lista entradas pendentes para consultoras
// PATCH - Marca entrada como processada
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Listar entradas pendentes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get('all') === 'true';
  const today = searchParams.get('today') !== 'false'; // default: true

  try {
    let query = supabase
      .from('manual_entries_pending')
      .select('*')
      .order('created_at', { ascending: false });

    // Por padrão, mostrar apenas não processadas
    if (!showAll) {
      query = query.eq('processed', false);
    }

    // Por padrão, mostrar apenas de hoje
    if (today) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query = query.gte('created_at', todayStart.toISOString());
    }

    const { data: entries, error } = await query;

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    // Estatísticas
    const pending = entries?.filter(e => !e.processed) || [];
    const processed = entries?.filter(e => e.processed) || [];

    return NextResponse.json({
      success: true,
      stats: {
        total: entries?.length || 0,
        pending: pending.length,
        processed: processed.length,
      },
      entries: entries?.map(e => ({
        id: e.id,
        evoMemberId: e.evo_member_id,
        memberName: e.member_name,
        reason: e.reason,
        createdAt: e.created_at,
        createdByCoachName: e.created_by_coach_name,
        processed: e.processed,
        processedAt: e.processed_at,
        processedBy: e.processed_by,
        evoLiberationId: e.evo_liberation_id,
        metadata: e.metadata,
      })) || [],
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// PATCH - Marcar como processada
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { entryId, processedBy } = body;

    if (!entryId) {
      return NextResponse.json({ 
        success: false, 
        error: 'entryId é obrigatório' 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('manual_entries_pending')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        processed_by: processedBy || 'Consultora',
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Entrada marcada como processada!',
      entry: {
        id: data.id,
        memberName: data.member_name,
        evoMemberId: data.evo_member_id,
        processedAt: data.processed_at,
        processedBy: data.processed_by,
      },
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// DELETE - Remover entrada (opcional, para admin)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json({ 
        success: false, 
        error: 'id é obrigatório' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('manual_entries_pending')
      .delete()
      .eq('id', entryId);

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Entrada removida com sucesso',
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
