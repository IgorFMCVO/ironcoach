// ============================================================================
// CAMINHO: src/app/api/evo/sync-photos/route.ts
// ============================================================================
// Rota SEPARADA para sincronizar APENAS as fotos dos membros
// Não mexe em frequência, retention, etc - só busca e salva a foto
// Acesse: /api/evo/sync-photos?execute=true
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EVO_API = 'https://evo-integracao-api.w12app.com.br';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos de timeout

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const execute = searchParams.get('execute') === 'true';

  if (!execute) {
    // Mostrar quantos membros precisam de foto
    const { data: members } = await supabase
      .from('queue')
      .select('id, member_name, evo_member_id, member_photo_url')
      .is('check_out_time', null)
      .not('evo_member_id', 'is', null);

    const semFoto = members?.filter(m => !m.member_photo_url) || [];
    const comFoto = members?.filter(m => m.member_photo_url) || [];

    return NextResponse.json({
      success: true,
      message: 'Use ?execute=true para sincronizar as fotos',
      total: members?.length || 0,
      comFoto: comFoto.length,
      semFoto: semFoto.length,
      membros: semFoto.slice(0, 10).map(m => ({ name: m.member_name, evoId: m.evo_member_id })),
    });
  }

  // Executar sincronização de fotos
  const headers = { 
    Authorization: `Basic ${Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64')}`,
    'Content-Type': 'application/json'
  };

  // Buscar membros SEM foto
  const { data: members, error } = await supabase
    .from('queue')
    .select('id, member_name, evo_member_id, member_photo_url')
    .is('check_out_time', null)
    .not('evo_member_id', 'is', null)
    .is('member_photo_url', null); // Só os que NÃO têm foto

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Todos os membros já têm foto!',
      updated: 0,
    });
  }

  const results = {
    total: members.length,
    updated: 0,
    failed: 0,
    details: [] as any[],
  };

  for (const member of members) {
    const evoId = member.evo_member_id;

    try {
      // Buscar foto via API v2
      const resp = await fetch(`${EVO_API}/api/v2/members/${evoId}`, { 
        headers, 
        cache: 'no-store' 
      });

      if (!resp.ok) {
        results.failed++;
        results.details.push({
          name: member.member_name,
          evoId,
          success: false,
          error: `HTTP ${resp.status}`,
        });
        
        // Se for rate limit, esperar mais
        if (resp.status === 429) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        continue;
      }

      const data = await resp.json();
      const photoUrl = data.photo || null;

      if (photoUrl) {
        // Atualizar APENAS a foto no banco
        const { error: updateError } = await supabase
          .from('queue')
          .update({ member_photo_url: photoUrl })
          .eq('id', member.id);

        if (updateError) {
          results.failed++;
          results.details.push({
            name: member.member_name,
            evoId,
            success: false,
            error: updateError.message,
          });
        } else {
          results.updated++;
          results.details.push({
            name: member.member_name,
            evoId,
            success: true,
            photoUrl: photoUrl.substring(0, 50) + '...',
          });
        }
      } else {
        results.details.push({
          name: member.member_name,
          evoId,
          success: true,
          photoUrl: null,
          note: 'Membro não tem foto no EVO',
        });
      }

      // Delay de 500ms entre chamadas para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      results.failed++;
      results.details.push({
        name: member.member_name,
        evoId,
        success: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Fotos sincronizadas: ${results.updated} atualizadas, ${results.failed} falharam`,
    ...results,
  });
}
