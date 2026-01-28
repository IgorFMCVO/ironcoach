// ============================================================================
// CAMINHO: src/app/api/evo/resync-get/route.ts
// ============================================================================

// Rota GET para facilitar resync pelo navegador
// Acesse: /api/evo/resync-get (todos) ou /api/evo/resync-get?id=12888 (um específico)

import { NextRequest, NextResponse } from 'next/server';

const RESYNC_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}/api/evo/resync`
  : 'http://localhost:3000/api/evo/resync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specificId = searchParams.get('id');
    
    // Construir URL do resync
    const baseUrl = new URL(request.url);
    const resyncUrl = `${baseUrl.origin}/api/evo/resync${specificId ? `?id=${specificId}` : ''}`;
    
    console.log(`[RESYNC-GET] Chamando: ${resyncUrl}`);
    
    // Chamar a API de resync via POST
    const response = await fetch(resyncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    // Retornar HTML formatado para visualização no navegador
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Resync EVO - Iron Coach</title>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
      color: #fff;
      padding: 40px;
      min-height: 100vh;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #4ade80;
      margin-bottom: 10px;
    }
    .status {
      padding: 20px;
      border-radius: 12px;
      margin: 20px 0;
    }
    .success { background: rgba(74, 222, 128, 0.2); border: 1px solid #4ade80; }
    .error { background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .stat {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #4ade80;
    }
    .stat-label {
      color: #888;
      margin-top: 5px;
    }
    .details {
      background: rgba(0,0,0,0.3);
      padding: 20px;
      border-radius: 12px;
      margin-top: 20px;
    }
    .member {
      padding: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .member:last-child { border-bottom: none; }
    .member-name { font-weight: bold; }
    .member-status {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
    }
    .member-status.ok { background: #4ade80; color: #000; }
    .member-status.fail { background: #ef4444; color: #fff; }
    .back-link {
      display: inline-block;
      margin-top: 20px;
      color: #4ade80;
      text-decoration: none;
    }
    .back-link:hover { text-decoration: underline; }
    pre {
      background: rgba(0,0,0,0.5);
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔄 Re-sincronização EVO</h1>
    <p style="color: #888;">Atualização de dados dos membros na fila</p>
    
    <div class="status ${data.success ? 'success' : 'error'}">
      ${data.success 
        ? `✅ Sincronização concluída com sucesso!`
        : `❌ Erro: ${data.error || 'Falha na sincronização'}`
      }
    </div>
    
    ${data.success ? `
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${data.total || 0}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #4ade80;">${data.updated || 0}</div>
          <div class="stat-label">Atualizados</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #ef4444;">${data.failed || 0}</div>
          <div class="stat-label">Falhas</div>
        </div>
      </div>
      
      ${data.details && data.details.length > 0 ? `
        <div class="details">
          <h3 style="margin-top: 0;">📋 Detalhes</h3>
          ${data.details.map((d: any) => `
            <div class="member">
              <div>
                <span class="member-name">${d.name}</span>
                <span style="color: #888; font-size: 12px; margin-left: 10px;">EVO #${d.evoId}</span>
                ${d.data?.photoUrl ? '<span style="color: #4ade80; font-size: 12px; margin-left: 10px;">📸</span>' : ''}
              </div>
              <span class="member-status ${d.success ? 'ok' : 'fail'}">
                ${d.success ? '✓ OK' : '✗ Erro'}
              </span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    ` : ''}
    
    <a href="/" class="back-link">← Voltar ao Dashboard</a>
    
    <details style="margin-top: 30px;">
      <summary style="cursor: pointer; color: #888;">Ver resposta JSON completa</summary>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </details>
  </div>
</body>
</html>
    `;
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno',
    }, { status: 500 });
  }
}
