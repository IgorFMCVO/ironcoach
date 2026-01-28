// src/app/api/debug/manual-entry-test/route.ts
// ============================================================================
// IRON COACH - API de DIAGNÓSTICO: Testar entrada manual no EVO
// Acesse: /api/debug/manual-entry-test?idMember=XXXXX&device=1
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const EVO_API_V2 = 'https://evo-integracao-api.w12app.com.br/api/v2';
const EVO_DNS = process.env.EVO_DNS || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';

// CONFIGURAÇÃO FIXA - Academia Impacto / Limit Fitness
const ADMIN_EMPLOYEE_ID = 2;   // ID do admin com permissão
const DEFAULT_TURNSTILE = 6;   // Catraca Henry 8x SF

function getHeaders() {
  const auth = Buffer.from(`${EVO_DNS}:${EVO_API_KEY}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idMember = searchParams.get('idMember');
  const deviceParam = searchParams.get('device') || '4'; // Default: Teclado
  const skipStep2 = searchParams.get('skipStep2') === 'true';

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  log(`========================================`);
  log(`[DEBUG] TESTE DE ENTRADA MANUAL NO EVO`);
  log(`========================================`);
  log(`[CONFIG] idMember (ALUNO): ${idMember}`);
  log(`[CONFIG] idEmployAuthorization (ADMIN): ${ADMIN_EMPLOYEE_ID}`);
  log(`[CONFIG] idTurnstile: ${DEFAULT_TURNSTILE}`);
  log(`[CONFIG] device: ${deviceParam} (1=Digital, 2=QR, 3=Facial, 4=Teclado)`);
  log(`[CONFIG] skipStep2: ${skipStep2}`);

  if (!idMember) {
    return NextResponse.json({ 
      error: 'Parâmetro idMember é obrigatório',
      uso: '/api/debug/manual-entry-test?idMember=XXXXX',
      opcoes: {
        device: '1=Digital, 2=QR, 3=Facial, 4=Teclado (default)',
        skipStep2: 'true para pular entryAuthorize',
      },
      exemplos: [
        '/api/debug/manual-entry-test?idMember=12888&device=1',
        '/api/debug/manual-entry-test?idMember=12888&skipStep2=true',
      ],
      logs,
    }, { status: 400 });
  }

  try {
    // ========================================================================
    // PASSO 1: insertManualLiberation
    // ========================================================================
    log(`\n[PASSO 1] Chamando insertManualLiberation...`);
    
    const liberationBody = {
      idTurnstile: DEFAULT_TURNSTILE,
      reason: 'Entrada manual via IronCoach - catraca indisponível',
      id: parseInt(idMember),
      personType: 1,
      idEmployAuthorization: ADMIN_EMPLOYEE_ID,
    };
    
    log(`[PASSO 1] Request body:`);
    log(JSON.stringify(liberationBody, null, 2));
    
    const liberationResp = await fetch(`${EVO_API_V2}/accessControl/insertManualLiberation`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(liberationBody),
    });

    log(`[PASSO 1] HTTP Status: ${liberationResp.status}`);
    
    const liberationText = await liberationResp.text();
    log(`[PASSO 1] Response: ${liberationText}`);

    let liberationData: any;
    try {
      liberationData = JSON.parse(liberationText);
    } catch {
      liberationData = { raw: liberationText };
    }

    if (!liberationResp.ok) {
      return NextResponse.json({
        success: false,
        step: 'insertManualLiberation',
        httpStatus: liberationResp.status,
        error: liberationData.mensagens?.join(', ') || 'Erro desconhecido',
        response: liberationData,
        logs,
      }, { status: 400 });
    }

    const idManualLiberation = liberationData.idManualLiberation;
    log(`[PASSO 1] ✅ Liberação criada! idManualLiberation: ${idManualLiberation}`);

    // Se skipStep2, retorna aqui
    if (skipStep2) {
      return NextResponse.json({
        success: true,
        message: '✅ Liberação registrada (Passo 2 pulado)',
        data: {
          idManualLiberation,
          idMember: parseInt(idMember),
        },
        nota: 'Passo 2 (entryAuthorize) foi pulado conforme solicitado',
        logs,
      });
    }

    // ========================================================================
    // PASSO 2: entryAuthorize
    // ========================================================================
    log(`\n[PASSO 2] Chamando entryAuthorize...`);
    
    const entryBody = {
      id: parseInt(idMember),
      personType: 1,
      device: parseInt(deviceParam),
      idManualEntry: idManualLiberation,
      idTurnstile: DEFAULT_TURNSTILE,
    };
    
    log(`[PASSO 2] Request body:`);
    log(JSON.stringify(entryBody, null, 2));
    
    const entryResp = await fetch(`${EVO_API_V2}/accessControl/entryAuthorize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(entryBody),
    });

    log(`[PASSO 2] HTTP Status: ${entryResp.status}`);
    
    const entryText = await entryResp.text();
    log(`[PASSO 2] Response: ${entryText}`);

    let entryData: any;
    try {
      entryData = JSON.parse(entryText);
    } catch {
      entryData = { raw: entryText };
    }

    if (!entryResp.ok) {
      return NextResponse.json({
        success: false,
        step: 'entryAuthorize',
        httpStatus: entryResp.status,
        liberationOk: true,
        idManualLiberation,
        error: entryData.mensagens?.join(', ') || `HTTP ${entryResp.status}`,
        response: entryData,
        sugestao: 'Tente com device diferente: ?device=1 ou ?device=2 ou ?device=3',
        logs,
      }, { status: 400 });
    }

    if (!entryData.authorized) {
      log(`[PASSO 2] ⚠️ Entrada NÃO autorizada`);
      return NextResponse.json({
        success: false,
        step: 'entryAuthorize',
        liberationOk: true,
        idManualLiberation,
        authorized: false,
        blockedType: entryData.blockedtype,
        message: entryData.message,
        response: entryData,
        logs,
      });
    }

    log(`[PASSO 2] ✅ Entrada autorizada!`);

    return NextResponse.json({
      success: true,
      message: '✅ Entrada manual registrada com sucesso!',
      data: {
        idManualLiberation,
        entryId: entryData.entryId,
        authorized: entryData.authorized,
        memberName: entryData.name,
        frequency: entryData.frequency,
      },
      logs,
    });

  } catch (error) {
    log(`[ERRO] ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      logs,
    }, { status: 500 });
  }
}
