// ============================================================================
// API: Upload de foto do membro
// POST /api/members/photo
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const BUCKET_NAME = 'member-photos';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File;
    const evoMemberId = formData.get('evoMemberId') as string;
    const memberName = formData.get('memberName') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhuma foto enviada' }, { status: 400 });
    }

    if (!evoMemberId) {
      return NextResponse.json({ success: false, error: 'evoMemberId obrigatório' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' 
      }, { status: 400 });
    }

    // Validar tamanho (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: 'Arquivo muito grande. Máximo 5MB.' 
      }, { status: 400 });
    }

    // Gerar nome único para o arquivo
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${evoMemberId}_${Date.now()}.${fileExtension}`;
    const filePath = `members/${fileName}`;

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true, // Sobrescreve se existir
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: `Erro no upload: ${uploadError.message}` 
      }, { status: 500 });
    }

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const photoUrl = publicUrlData.publicUrl;

    // Atualizar no banco de dados - tabela member_photos
    const { data: updateData, error: updateError } = await supabase.rpc('update_member_photo', {
      p_evo_member_id: parseInt(evoMemberId),
      p_photo_url: photoUrl,
      p_member_name: memberName || null,
    });

    if (updateError) {
      console.error('Erro ao atualizar banco (member_photos):', updateError);
    }

    // IMPORTANTE: Também atualizar a tabela queue para refletir imediatamente no card
    const { error: queueUpdateError } = await supabase
      .from('queue')
      .update({ 
        member_photo_url: photoUrl,
        photo_url: photoUrl, // Caso exista essa coluna também
      })
      .eq('evo_member_id', parseInt(evoMemberId))
      .is('check_out_time', null); // Apenas membros ativos

    if (queueUpdateError) {
      console.error('Erro ao atualizar queue:', queueUpdateError);
      // Não falha, pois a foto já foi salva no storage e member_photos
    } else {
      console.log(`✅ Foto atualizada na queue para membro ${evoMemberId}`);
    }

    return NextResponse.json({
      success: true,
      photoUrl,
      memberName: memberName || updateData?.memberName,
      message: 'Foto atualizada com sucesso!',
    });

  } catch (error) {
    console.error('Exceção no upload:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Erro interno: ${String(error)}` 
    }, { status: 500 });
  }
}

// GET - Buscar foto do membro
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const evoMemberId = searchParams.get('evoMemberId');

  if (!evoMemberId) {
    return NextResponse.json({ success: false, error: 'evoMemberId obrigatório' }, { status: 400 });
  }

  try {
    // Buscar na tabela member_photos
    const { data: photo, error } = await supabase
      .from('member_photos')
      .select('member_name, photo_url, updated_at')
      .eq('evo_member_id', parseInt(evoMemberId))
      .single();

    if (error || !photo) {
      return NextResponse.json({ 
        success: true,
        photoUrl: null,
        message: 'Nenhuma foto cadastrada' 
      });
    }

    return NextResponse.json({
      success: true,
      memberName: photo.member_name,
      photoUrl: photo.photo_url,
      photoUpdatedAt: photo.updated_at,
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

// DELETE - Remover foto do membro
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const evoMemberId = searchParams.get('evoMemberId');

  if (!evoMemberId) {
    return NextResponse.json({ success: false, error: 'evoMemberId obrigatório' }, { status: 400 });
  }

  try {
    // Buscar foto atual
    const { data: photo } = await supabase
      .from('member_photos')
      .select('photo_url')
      .eq('evo_member_id', parseInt(evoMemberId))
      .single();

    if (photo?.photo_url) {
      // Extrair caminho do arquivo da URL
      const urlParts = photo.photo_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `members/${fileName}`;

      // Deletar do storage
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    }

    // Usar a função RPC para deletar
    const { data, error } = await supabase.rpc('delete_member_photo', {
      p_evo_member_id: parseInt(evoMemberId)
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Foto removida com sucesso',
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
