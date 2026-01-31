// ============================================================================
// CAMINHO: src/app/api/admin/force-logout/route.ts
// ============================================================================
// API para forçar logout de usuários (apenas admin)
// CORREÇÃO: Busca sessão por múltiplos campos e atualiza pelo ID da sessão
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST - Forçar logout de um usuário específico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetCoachId, adminCoachId, reason } = body;

    console.log('[ForceLogout] ========================================');
    console.log('[ForceLogout] Requisição recebida:', { targetCoachId, adminCoachId, reason });

    if (!targetCoachId || !adminCoachId) {
      return NextResponse.json({
        success: false,
        error: 'targetCoachId e adminCoachId são obrigatórios'
      }, { status: 400 });
    }

    // =========================================================================
    // PASSO 1: Verificar se quem está pedindo é admin
    // =========================================================================
    let adminData = null;
    
    // Tentar buscar por id primeiro
    const { data: adminById } = await supabase
      .from('coaches')
      .select('id, name, role')
      .eq('id', adminCoachId)
      .single();
    
    if (adminById) {
      adminData = adminById;
    } else {
      // Tentar buscar por odoo_id
      const { data: adminByOdoo } = await supabase
        .from('coaches')
        .select('id, name, role')
        .eq('odoo_id', adminCoachId)
        .single();
      
      if (adminByOdoo) {
        adminData = adminByOdoo;
      }
    }

    console.log('[ForceLogout] Admin encontrado:', adminData);

    if (!adminData) {
      return NextResponse.json({
        success: false,
        error: `Admin não encontrado (ID: ${adminCoachId})`
      }, { status: 403 });
    }

    if (adminData.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: `Apenas administradores podem forçar logout. Seu role: ${adminData.role}`
      }, { status: 403 });
    }

    // =========================================================================
    // PASSO 2: BUSCAR TODAS as sessões ativas para encontrar a correta
    // =========================================================================
    console.log('[ForceLogout] Buscando sessão ativa para coach:', targetCoachId);
    
    // Buscar TODAS as sessões ativas
    const { data: allActiveSessions, error: sessionsError } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('status', 'ACTIVE')
      .is('ended_at', null);

    if (sessionsError) {
      console.error('[ForceLogout] Erro ao buscar sessões:', sessionsError);
    }

    console.log('[ForceLogout] Sessões ativas encontradas:', allActiveSessions?.length || 0);
    
    // Log de todas as sessões para debug
    allActiveSessions?.forEach((s: any) => {
      console.log(`  - Sessão ${s.id}: coach_id=${s.coach_id}, coach_name=${s.coach_name}, status=${s.status}`);
    });

    // Tentar encontrar a sessão do target por múltiplos métodos
    let targetSession = null;
    
    // Método 1: Comparar coach_id diretamente
    targetSession = allActiveSessions?.find((s: any) => s.coach_id === targetCoachId);
    
    // Método 2: Comparar como string
    if (!targetSession) {
      targetSession = allActiveSessions?.find((s: any) => String(s.coach_id) === String(targetCoachId));
    }
    
    // Método 3: Comparar pelo nome (fallback)
    if (!targetSession) {
      // Buscar o nome do coach na tabela coaches
      const { data: targetCoach } = await supabase
        .from('coaches')
        .select('name')
        .eq('id', targetCoachId)
        .single();
      
      if (targetCoach?.name) {
        targetSession = allActiveSessions?.find((s: any) => 
          s.coach_name?.toLowerCase() === targetCoach.name.toLowerCase()
        );
      }
    }

    if (!targetSession) {
      console.error('[ForceLogout] ❌ Sessão não encontrada para:', targetCoachId);
      console.log('[ForceLogout] IDs das sessões ativas:', allActiveSessions?.map((s: any) => s.coach_id).join(', '));
      
      return NextResponse.json({
        success: false,
        error: `Sessão ativa não encontrada para o usuário. ID recebido: ${targetCoachId}`
      }, { status: 404 });
    }

    console.log('[ForceLogout] ✅ Sessão encontrada:', {
      sessionId: targetSession.id,
      coachId: targetSession.coach_id,
      coachName: targetSession.coach_name
    });

    // =========================================================================
    // PASSO 3: ATUALIZAR a sessão pelo ID da sessão (não pelo coach_id)
    // Tenta FORCE_LOGOUT primeiro, se falhar usa OFFLINE
    // =========================================================================
    let updateError = null;
    let updatedData = null;
    
    // Tentar com FORCE_LOGOUT primeiro
    const result1 = await supabase
      .from('coach_sessions')
      .update({
        status: 'FORCE_LOGOUT',
        is_on_floor: false,
        ended_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .eq('id', targetSession.id)
      .select();

    if (result1.error) {
      console.log('[ForceLogout] FORCE_LOGOUT falhou, tentando OFFLINE...', result1.error.message);
      
      // Fallback: usar OFFLINE se FORCE_LOGOUT não for aceito pela constraint
      const result2 = await supabase
        .from('coach_sessions')
        .update({
          status: 'OFFLINE',
          is_on_floor: false,
          ended_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq('id', targetSession.id)
        .select();
      
      updateError = result2.error;
      updatedData = result2.data;
    } else {
      updatedData = result1.data;
    }

    if (updateError) {
      console.error('[ForceLogout] ❌ Erro ao atualizar sessão:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar sessão: ' + updateError.message
      }, { status: 500 });
    }

    console.log('[ForceLogout] ✅ Sessão atualizada:', updatedData);

    // =========================================================================
    // PASSO 4: Verificar se realmente atualizou
    // =========================================================================
    const { data: verifySession } = await supabase
      .from('coach_sessions')
      .select('*')
      .eq('id', targetSession.id)
      .single();

    console.log('[ForceLogout] Verificação pós-update:', {
      status: verifySession?.status,
      ended_at: verifySession?.ended_at,
      is_on_floor: verifySession?.is_on_floor
    });

    // =========================================================================
    // PASSO 5: Registrar no activity log (ignora erros)
    // =========================================================================
    try {
      await supabase
        .from('coach_activity_log')
        .insert({
          coach_id: targetSession.coach_id,
          coach_name: targetSession.coach_name,
          event_type: 'FORCE_LOGOUT',
          event_category: 'SYSTEM',
          description: `Logout forçado por ${adminData.name}${reason ? `: ${reason}` : ''}`,
          metadata: {
            session_id: targetSession.id,
            forced_by: adminCoachId,
            forced_by_name: adminData.name,
            reason: reason || 'Sem motivo especificado'
          },
          is_warning: true
        });
    } catch (logErr) {
      console.log('[ForceLogout] Erro ao registrar log (ignorado):', logErr);
    }

    console.log('[ForceLogout] ========================================');
    console.log(`[ForceLogout] ✅ SUCESSO: ${adminData.name} forçou logout de ${targetSession.coach_name}`);

    return NextResponse.json({
      success: true,
      message: `Logout de ${targetSession.coach_name} realizado com sucesso!`,
      sessionId: targetSession.id,
      coachName: targetSession.coach_name
    });

  } catch (error) {
    console.error('[ForceLogout] ❌ ERRO FATAL:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor: ' + String(error)
    }, { status: 500 });
  }
}

// GET - Verificar se há notificação de force logout para o usuário atual
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coachId');

    if (!coachId) {
      return NextResponse.json({
        success: false,
        error: 'coachId é obrigatório'
      }, { status: 400 });
    }

    // Buscar TODAS as sessões do coach e verificar o status da mais recente
    const { data: sessions } = await supabase
      .from('coach_sessions')
      .select('status, ended_at')
      .eq('coach_id', coachId)
      .order('started_at', { ascending: false })
      .limit(1);

    const latestSession = sessions?.[0];

    // Se a sessão mais recente está marcada como FORCE_LOGOUT
    if (latestSession?.status === 'FORCE_LOGOUT') {
      return NextResponse.json({
        success: true,
        forceLogout: true,
        reason: 'Sua sessão foi encerrada pelo administrador'
      });
    }

    return NextResponse.json({
      success: true,
      forceLogout: false
    });

  } catch (error) {
    console.error('Erro ao verificar force logout:', error);
    return NextResponse.json({
      success: true,
      forceLogout: false
    });
  }
}
