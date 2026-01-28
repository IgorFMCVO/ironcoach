// ============================================================================
// CAMINHO: src/app/api/config/route.ts
// ============================================================================
// IRON COACH - API de Configurações do Sistema
// GET - Retorna todas as configurações
// POST - Salva configurações
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configurações padrão do sistema
const DEFAULT_CONFIG = {
  // Tempo de atendimento por cor (em SEGUNDOS - cronômetro regressivo)
  attendanceTime: {
    RED: 25,      // 1ª semana - 25 segundos
    ORANGE: 20,   // 2ª semana - 20 segundos
    YELLOW: 15,   // Mês 1 - 15 segundos
    GREEN: 10,    // Veterano - 10 segundos
    BLUE: 0,      // Autônomo - sem cronômetro
    BLACK: 0,     // Personal - sem cronômetro
  },
  // Intervalo para alerta "precisa de atendimento" (em MINUTOS)
  alertInterval: {
    RED: 2,       // 2 minutos
    ORANGE: 3,    // 3 minutos
    YELLOW: 4,    // 4 minutos
    GREEN: 5,     // 5 minutos
    BLUE: 0,
    BLACK: 0,
  },
  // Configurações gerais
  autoCheckoutMinutes: 90,           // Tempo para auto-checkout (minutos)
  criticalRetentionThreshold: 25,    // % abaixo disso = alerta crítico
  lowRetentionThreshold: 50,         // % abaixo disso = alerta normal
  criticalOverlayDuration: 2000,     // ms do overlay vermelho
  criticalOverlayInterval: 17000,    // ms entre overlays
  soundEnabled: true,                // Sons habilitados por padrão
  vibrationEnabled: true,            // Vibração habilitada por padrão
};

export async function GET() {
  try {
    // Tentar buscar configurações do banco
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value')
      .eq('category', 'dashboard');

    if (error) {
      console.log('Tabela system_config não existe ou erro:', error.message);
      // Se não existe a tabela, retorna defaults
      return NextResponse.json({
        success: true,
        config: DEFAULT_CONFIG,
        source: 'defaults',
      });
    }

    if (!data || data.length === 0) {
      // Tabela existe mas está vazia
      return NextResponse.json({
        success: true,
        config: DEFAULT_CONFIG,
        source: 'defaults',
      });
    }

    // Montar objeto de configuração
    const config = { ...DEFAULT_CONFIG };
    
    data.forEach(row => {
      try {
        const parsed = JSON.parse(row.value);
        if (row.key === 'attendanceTime') config.attendanceTime = { ...config.attendanceTime, ...parsed };
        else if (row.key === 'alertInterval') config.alertInterval = { ...config.alertInterval, ...parsed };
        else if (row.key in config) (config as any)[row.key] = parsed;
      } catch {
        // Valor não é JSON válido, ignorar
      }
    });

    return NextResponse.json({
      success: true,
      config,
      source: 'database',
    });

  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({
      success: true,
      config: DEFAULT_CONFIG,
      source: 'defaults',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuração não fornecida',
      }, { status: 400 });
    }

    // Salvar cada chave de configuração
    const updates = [];
    
    for (const [key, value] of Object.entries(config)) {
      updates.push({
        category: 'dashboard',
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert (insert or update)
    const { error } = await supabase
      .from('system_config')
      .upsert(updates, {
        onConflict: 'category,key',
      });

    if (error) {
      console.error('Erro ao salvar configurações:', error);
      
      // Se a tabela não existe, tentar criar
      if (error.message.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Tabela system_config não existe. Execute o SQL de criação primeiro.',
          sql: `
-- Execute este SQL no Supabase para criar a tabela de configurações:

CREATE TABLE IF NOT EXISTS system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'dashboard',
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, key)
);

-- Inserir configurações padrão
INSERT INTO system_config (category, key, value) VALUES
  ('dashboard', 'attendanceTime', '{"RED": 25, "ORANGE": 20, "YELLOW": 15, "GREEN": 10, "BLUE": 0, "BLACK": 0}'),
  ('dashboard', 'alertInterval', '{"RED": 2, "ORANGE": 3, "YELLOW": 4, "GREEN": 5, "BLUE": 0, "BLACK": 0}'),
  ('dashboard', 'autoCheckoutMinutes', '90'),
  ('dashboard', 'criticalRetentionThreshold', '25'),
  ('dashboard', 'lowRetentionThreshold', '50'),
  ('dashboard', 'soundEnabled', 'true'),
  ('dashboard', 'vibrationEnabled', 'true')
ON CONFLICT (category, key) DO NOTHING;
          `,
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações salvas com sucesso',
    });

  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }, { status: 500 });
  }
}
