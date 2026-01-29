// ============================================================================
// API: Notificações WhatsApp
// POST /api/notifications/whatsapp
// Envia mensagem via WhatsApp usando CallMeBot ou outro provedor
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Configuração do provedor
// CallMeBot é gratuito - precisa cadastrar o número em https://www.callmebot.com/
const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || 'callmebot';
const CALLMEBOT_API_KEY = process.env.CALLMEBOT_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json({ 
        success: false, 
        error: 'phone e message são obrigatórios' 
      }, { status: 400 });
    }

    // Limpar número de telefone (apenas dígitos)
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Número de telefone inválido' 
      }, { status: 400 });
    }

    let result;

    switch (WHATSAPP_PROVIDER) {
      case 'callmebot':
        result = await sendViaCallMeBot(cleanPhone, message);
        break;
      
      case 'evolution':
        result = await sendViaEvolutionAPI(cleanPhone, message);
        break;
        
      case 'twilio':
        result = await sendViaTwilio(cleanPhone, message);
        break;
        
      default:
        // Fallback: abrir link do WhatsApp Web (não envia automaticamente)
        result = {
          success: true,
          method: 'manual',
          whatsappUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
          message: 'Link gerado - envio manual necessário'
        };
    }

    // Log da tentativa de envio
    console.log(`[WhatsApp] Tentativa de envio para ${cleanPhone}:`, result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[WhatsApp] Erro:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

// ============================================================================
// PROVEDORES
// ============================================================================

/**
 * CallMeBot - Gratuito
 * Cadastro: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 */
async function sendViaCallMeBot(phone: string, message: string) {
  if (!CALLMEBOT_API_KEY) {
    return {
      success: false,
      error: 'CALLMEBOT_API_KEY não configurada. Cadastre em https://www.callmebot.com/',
      whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    };
  }

  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${CALLMEBOT_API_KEY}`;
  
  const response = await fetch(url);
  const text = await response.text();
  
  if (response.ok && text.includes('Message queued')) {
    return { success: true, provider: 'callmebot', message: 'Mensagem enviada!' };
  }
  
  return { 
    success: false, 
    provider: 'callmebot',
    error: text,
    whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  };
}

/**
 * Evolution API - Self-hosted WhatsApp
 * https://github.com/EvolutionAPI/evolution-api
 */
async function sendViaEvolutionAPI(phone: string, message: string) {
  const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
  const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;
  const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'ironcoach';

  if (!EVOLUTION_URL || !EVOLUTION_KEY) {
    return {
      success: false,
      error: 'Evolution API não configurada',
      whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    };
  }

  const response = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_KEY
    },
    body: JSON.stringify({
      number: phone,
      text: message
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    return { success: true, provider: 'evolution', data };
  }
  
  return { 
    success: false, 
    provider: 'evolution',
    error: data.message || 'Erro ao enviar',
    whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  };
}

/**
 * Twilio WhatsApp
 * https://www.twilio.com/whatsapp
 */
async function sendViaTwilio(phone: string, message: string) {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return {
      success: false,
      error: 'Twilio não configurado',
      whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      From: TWILIO_WHATSAPP_FROM,
      To: `whatsapp:+${phone}`,
      Body: message
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    return { success: true, provider: 'twilio', sid: data.sid };
  }
  
  return { 
    success: false, 
    provider: 'twilio',
    error: data.message || 'Erro ao enviar',
    whatsappUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  };
}
