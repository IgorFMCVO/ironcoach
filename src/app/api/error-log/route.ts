// ============================================================================
// IRON COACH - API de Logs de Erro
// POST /api/error-log - Registrar erro
// GET /api/error-log - Buscar logs (admin/supervisor)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ErrorLogEntry {
  source: 'api' | 'frontend' | 'evo' | 'supabase' | 'webhook';
  endpoint?: string;
  action: string;
  errorMessage: string;
  errorCode?: string;
  errorStack?: string;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  coachId?: string;
  coachName?: string;
  memberName?: string;
  memberEvoId?: number;
}

/**
 * POST /api/error-log
 * Registrar um novo erro
 */
export async function POST(request: NextRequest) {
  try {
    const body: ErrorLogEntry = await request.json();

    const {
      source,
      endpoint,
      action,
      errorMessage,
      errorCode,
      errorStack,
      requestData,
      responseData,
      coachId,
      coachName,
      memberName,
      memberEvoId,
    } = body;

    // Validação básica
    if (!source || !action || !errorMessage) {
      return NextResponse.json({
        success: false,
        error: 'Campos obrigatórios: source, action, errorMessage'
      }, { status: 400 });
    }

    // Capturar informações da requisição
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || 'unknown';

    // Inserir no banco
    const { data, error } = await supabase
      .from('error_logs')
      .insert({
        source,
        endpoint,
        action,
        error_message: errorMessage,
        error_code: errorCode,
        error_stack: errorStack,
        request_data: requestData,
        response_data: responseData,
        coach_id: coachId,
        coach_name: coachName,
        member_name: memberName,
        member_evo_id: memberEvoId,
        user_agent: userAgent,
        ip_address: ipAddress,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar log de erro:', error);
      // Não retorna erro para não causar loop
      return NextResponse.json({ success: false, logged: false });
    }

    // Log no console também
    console.error(`[ERROR LOG] ${source}/${action}: ${errorMessage}`);
    if (memberName) console.error(`  → Membro: ${memberName} (ID: ${memberEvoId})`);
    if (coachName) console.error(`  → Coach: ${coachName}`);

    return NextResponse.json({
      success: true,
      logged: true,
      id: data.id,
    });

  } catch (error) {
    console.error('Erro na API error-log:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno'
    }, { status: 500 });
  }
}

/**
 * GET /api/error-log
 * Buscar logs de erro
 * Query params:
 *   - recent: últimas 24h
 *   - summary: resumo agrupado
 *   - limit: limite de registros
 *   - source: filtrar por fonte
 *   - action: filtrar por ação
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recent = searchParams.get('recent') === 'true';
    const summary = searchParams.get('summary') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const source = searchParams.get('source');
    const action = searchParams.get('action');

    // Resumo agrupado
    if (summary) {
      const { data, error } = await supabase
        .from('error_logs_summary')
        .select('*');

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data,
      });
    }

    // Logs recentes
    if (recent) {
      let query = supabase
        .from('error_logs_recent')
        .select('*')
        .limit(limit);

      if (source) query = query.eq('source', source);
      if (action) query = query.eq('action', action);

      const { data, error } = await query;

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data,
        count: data?.length || 0,
      });
    }

    // Logs padrão (últimos N)
    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (source) query = query.eq('source', source);
    if (action) query = query.eq('action', action);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar logs'
    }, { status: 500 });
  }
}
