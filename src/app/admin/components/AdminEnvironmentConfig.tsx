// ============================================================================
// CAMINHO: src/app/admin/components/AdminEnvironmentConfig.tsx
// ============================================================================
// Componente para configurar níveis de atendimento, tempos dinâmicos e alertas
// ============================================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnvironmentConfig {
  // Ratios de nível (alunos/professor)
  ratio_otimo_max: number;
  ratio_bom_max: number;
  ratio_baixo_max: number;
  
  // Frequência de alertas fullscreen (minutos)
  alerta_freq_otimo: number;
  alerta_freq_bom: number;
  alerta_freq_baixo: number;
  alerta_freq_critico: number;
  
  // Duração dos alertas fullscreen (segundos)
  alerta_duracao_otimo: number;
  alerta_duracao_bom: number;
  alerta_duracao_baixo: number;
  alerta_duracao_critico: number;
  
  // Tempos BASE (nível ÓTIMO) em segundos
  tempo_base_vermelho: number;
  tempo_base_laranja: number;
  tempo_base_amarelo: number;
  tempo_base_verde: number;
  tempo_base_azul: number;
  
  // AJUSTES por nível (quanto subtrair por nível)
  ajuste_vermelho_laranja: number; // Subtrair para Vermelho e Laranja
  ajuste_amarelo_verde: number;    // Subtrair para Amarelo, Verde e Azul
  
  // Anti-burla
  tempo_minimo_atendimento: number;
  alertas_burla_sequencia: number;
  alertas_burla_janela_minutos: number;
  
  // WhatsApp
  supervisor_whatsapp: string;
}

const DEFAULT_CONFIG: EnvironmentConfig = {
  // Ratios
  ratio_otimo_max: 5,
  ratio_bom_max: 10,
  ratio_baixo_max: 15,
  
  // Frequência alertas
  alerta_freq_otimo: 15,
  alerta_freq_bom: 10,
  alerta_freq_baixo: 5,
  alerta_freq_critico: 3,
  
  // Duração alertas
  alerta_duracao_otimo: 2,
  alerta_duracao_bom: 2,
  alerta_duracao_baixo: 3,
  alerta_duracao_critico: 4,
  
  // Tempos BASE (nível ÓTIMO)
  tempo_base_vermelho: 210, // 3:30
  tempo_base_laranja: 270,  // 4:30
  tempo_base_amarelo: 330,  // 5:30
  tempo_base_verde: 390,    // 6:30
  tempo_base_azul: 450,     // 7:30
  
  // Ajustes por nível
  ajuste_vermelho_laranja: 30, // -30s por nível para Vermelho/Laranja
  ajuste_amarelo_verde: 15,    // -15s por nível para Amarelo/Verde/Azul
  
  // Anti-burla
  tempo_minimo_atendimento: 10,
  alertas_burla_sequencia: 3,
  alertas_burla_janela_minutos: 5,
  
  // WhatsApp
  supervisor_whatsapp: ''
};

type ActiveSection = 'niveis' | 'tempos' | 'alertas' | 'antiburla' | 'whatsapp';

export default function AdminEnvironmentConfig() {
  const [config, setConfig] = useState<EnvironmentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('tempos');

  // Carregar configuração
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/environment?type=config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig({ ...DEFAULT_CONFIG, ...data.config });
      }
    } catch (error) {
      console.error('Erro ao carregar config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateConfig', config })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        throw new Error(data.error);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const updateConfig = (key: keyof EnvironmentConfig, value: number | string) => {
    setConfig((prev: EnvironmentConfig) => ({ ...prev, [key]: value }));
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Calcular tempos dinâmicos para a tabela
  const calculatedTimes = useMemo(() => {
    const niveis = ['ÓTIMO', 'BOM', 'BAIXO', 'CRÍTICO'] as const;
    const multiplicadores = [0, 1, 2, 3]; // Quanto multiplicar o ajuste
    
    return niveis.map((nivel, index) => {
      const mult = multiplicadores[index];
      return {
        nivel,
        vermelho: config.tempo_base_vermelho - (config.ajuste_vermelho_laranja * mult),
        laranja: config.tempo_base_laranja - (config.ajuste_vermelho_laranja * mult),
        amarelo: config.tempo_base_amarelo - (config.ajuste_amarelo_verde * mult),
        verde: config.tempo_base_verde - (config.ajuste_amarelo_verde * mult),
        azul: config.tempo_base_azul - (config.ajuste_amarelo_verde * mult),
        ajuste: mult === 0 ? 'Base' : `-${config.ajuste_vermelho_laranja * mult}s / -${config.ajuste_amarelo_verde * mult}s`
      };
    });
  }, [config]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs de Seções */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'tempos' as const, label: '⏱️ Tempos Dinâmicos', color: '#007AFF' },
          { id: 'niveis' as const, label: '📊 Níveis (Ratio)', color: '#30D158' },
          { id: 'alertas' as const, label: '🔔 Alertas Fullscreen', color: '#FF9500' },
          { id: 'antiburla' as const, label: '🛡️ Anti-Burla', color: '#FF3B30' },
          { id: 'whatsapp' as const, label: '📱 WhatsApp', color: '#25D366' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeSection === tab.id
                ? 'text-white shadow-lg'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
            style={activeSection === tab.id ? { backgroundColor: tab.color } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mensagem */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================== */}
      {/* SEÇÃO: TEMPOS DINÂMICOS (Principal) */}
      {/* ============================================== */}
      {activeSection === 'tempos' && (
        <div className="space-y-6">
          {/* Explicação */}
          <div className="bg-blue-500/10 rounded-xl border border-blue-500/30 p-4">
            <h4 className="font-bold text-blue-400 mb-2">📖 Como funciona o Sistema de Tempos Dinâmicos</h4>
            <p className="text-white/60 text-sm">
              Os tempos de atendimento são <strong className="text-white">ajustados automaticamente</strong> baseado 
              no nível de carga do salão. Quando há muitos alunos por professor, os tempos diminuem para 
              garantir que todos sejam atendidos. Os tempos são calculados subtraindo o ajuste multiplicado pelo nível.
            </p>
          </div>

          {/* Tempos BASE (Nível ÓTIMO) */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              ⏱️ Tempos BASE (Nível ÓTIMO)
            </h3>
            <p className="text-white/40 text-sm mb-6">
              Tempo máximo de espera antes do card alertar — quando o salão está em condição ótima
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { key: 'tempo_base_vermelho', label: 'Vermelho', sublabel: '1ª Semana', emoji: '🔴', color: '#FF3B30' },
                { key: 'tempo_base_laranja', label: 'Laranja', sublabel: '2ª Semana', emoji: '🟠', color: '#FF9500' },
                { key: 'tempo_base_amarelo', label: 'Amarelo', sublabel: 'Mês 1', emoji: '🟡', color: '#FFCC00' },
                { key: 'tempo_base_verde', label: 'Verde', sublabel: 'Veterano', emoji: '🟢', color: '#30D158' },
                { key: 'tempo_base_azul', label: 'Azul', sublabel: 'Autônomo', emoji: '🔵', color: '#007AFF' }
              ].map(({ key, label, sublabel, emoji, color }) => (
                <div key={key} className="bg-black/30 rounded-xl p-3 border" style={{ borderColor: `${color}40` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{emoji}</span>
                    <div>
                      <p className="font-bold text-sm" style={{ color }}>{label}</p>
                      <p className="text-xs text-white/40">{sublabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={60}
                      max={600}
                      step={30}
                      value={config[key as keyof EnvironmentConfig] as number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig(key as keyof EnvironmentConfig, parseInt(e.target.value) || 180)}
                      className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-center font-mono text-sm"
                    />
                    <span className="text-white/40 text-xs">
                      ({formatTime(config[key as keyof EnvironmentConfig] as number)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ajustes por Nível */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              🔧 Ajustes por Nível de Carga
            </h3>
            <p className="text-white/40 text-sm mb-6">
              Quanto subtrair dos tempos base para cada nível abaixo do ÓTIMO
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Ajuste Vermelho/Laranja */}
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex gap-1">
                    <span className="text-xl">🔴</span>
                    <span className="text-xl">🟠</span>
                  </div>
                  <div>
                    <p className="font-bold text-red-400">Ajuste Vermelho / Laranja</p>
                    <p className="text-xs text-white/40">Subtrair por nível para prioridades críticas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">-</span>
                  <input
                    type="number"
                    min={10}
                    max={60}
                    step={5}
                    value={config.ajuste_vermelho_laranja}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('ajuste_vermelho_laranja', parseInt(e.target.value) || 30)}
                    className="w-20 px-3 py-2 bg-black/30 border border-red-500/30 rounded-lg text-center font-mono text-lg text-red-400"
                  />
                  <span className="text-white/60">segundos por nível</span>
                </div>
              </div>

              {/* Ajuste Amarelo/Verde/Azul */}
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex gap-1">
                    <span className="text-xl">🟡</span>
                    <span className="text-xl">🟢</span>
                    <span className="text-xl">🔵</span>
                  </div>
                  <div>
                    <p className="font-bold text-green-400">Ajuste Amarelo / Verde / Azul</p>
                    <p className="text-xs text-white/40">Subtrair por nível para prioridades normais</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">-</span>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    step={5}
                    value={config.ajuste_amarelo_verde}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('ajuste_amarelo_verde', parseInt(e.target.value) || 15)}
                    className="w-20 px-3 py-2 bg-black/30 border border-green-500/30 rounded-lg text-center font-mono text-lg text-green-400"
                  />
                  <span className="text-white/60">segundos por nível</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABELA DE TEMPOS CALCULADOS */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              📊 Tabela de Tempos por Nível de Atendimento
            </h3>
            <p className="text-white/40 text-sm mb-6">
              Visualização dos tempos calculados automaticamente — esta tabela é apenas para visualização
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-3 px-4 text-left font-bold text-white/80">NÍVEL</th>
                    <th className="py-3 px-4 text-center font-bold text-red-400">🔴 VERMELHO</th>
                    <th className="py-3 px-4 text-center font-bold text-orange-400">🟠 LARANJA</th>
                    <th className="py-3 px-4 text-center font-bold text-yellow-400">🟡 AMARELO</th>
                    <th className="py-3 px-4 text-center font-bold text-green-400">🟢 VERDE</th>
                    <th className="py-3 px-4 text-center font-bold text-blue-400">🔵 AZUL</th>
                    <th className="py-3 px-4 text-right font-bold text-white/60">AJUSTE</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedTimes.map((row) => {
                    const nivelColors: Record<string, { bg: string; text: string; emoji: string }> = {
                      'ÓTIMO': { bg: 'bg-green-500/10', text: 'text-green-400', emoji: '💚' },
                      'BOM': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', emoji: '💛' },
                      'BAIXO': { bg: 'bg-orange-500/10', text: 'text-orange-400', emoji: '🟠' },
                      'CRÍTICO': { bg: 'bg-red-500/10', text: 'text-red-400', emoji: '🔴' }
                    };
                    const style = nivelColors[row.nivel];
                    
                    return (
                      <tr key={row.nivel} className={`border-b border-white/10 ${style.bg}`}>
                        <td className={`py-3 px-4 font-bold ${style.text}`}>
                          {style.emoji} {row.nivel}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-lg">{formatTime(row.vermelho)}</td>
                        <td className="py-3 px-4 text-center font-mono text-lg">{formatTime(row.laranja)}</td>
                        <td className="py-3 px-4 text-center font-mono text-lg">{formatTime(row.amarelo)}</td>
                        <td className="py-3 px-4 text-center font-mono text-lg">{formatTime(row.verde)}</td>
                        <td className="py-3 px-4 text-center font-mono text-lg">{formatTime(row.azul)}</td>
                        <td className="py-3 px-4 text-right text-white/60 text-sm">{row.ajuste}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legenda */}
            <div className="mt-4 p-3 bg-black/20 rounded-lg">
              <p className="text-white/50 text-xs">
                <strong className="text-white/70">Leitura da tabela:</strong> No nível CRÍTICO, um aluno 🔴 Vermelho 
                deve ser atendido em até <strong className="text-red-400">{formatTime(calculatedTimes[3].vermelho)}</strong> ao 
                invés de {formatTime(config.tempo_base_vermelho)} (base). Isso garante atendimento mesmo com alta demanda.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* SEÇÃO: NÍVEIS (Ratio) */}
      {/* ============================================== */}
      {activeSection === 'niveis' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            📊 Níveis de Atendimento (Ratio Alunos/Professor)
          </h3>
          <p className="text-white/40 text-sm mb-6">
            Defina os limites de ratio para determinar o nível de carga do salão
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ÓTIMO */}
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💚</span>
                <div>
                  <p className="font-bold text-green-400">ÓTIMO</p>
                  <p className="text-xs text-white/40">Situação ideal - tempos normais</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">≤</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.ratio_otimo_max}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('ratio_otimo_max', parseInt(e.target.value) || 5)}
                  className="w-20 px-3 py-2 bg-black/30 border border-green-500/30 rounded-lg text-center font-mono text-lg text-green-400"
                />
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>

            {/* BOM */}
            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💛</span>
                <div>
                  <p className="font-bold text-yellow-400">BOM</p>
                  <p className="text-xs text-white/40">Leve redução nos tempos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">≤</span>
                <input
                  type="number"
                  min={config.ratio_otimo_max + 1}
                  max={25}
                  value={config.ratio_bom_max}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('ratio_bom_max', parseInt(e.target.value) || 10)}
                  className="w-20 px-3 py-2 bg-black/30 border border-yellow-500/30 rounded-lg text-center font-mono text-lg text-yellow-400"
                />
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>

            {/* BAIXO */}
            <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🟠</span>
                <div>
                  <p className="font-bold text-orange-400">BAIXO</p>
                  <p className="text-xs text-white/40">Redução moderada nos tempos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">≤</span>
                <input
                  type="number"
                  min={config.ratio_bom_max + 1}
                  max={30}
                  value={config.ratio_baixo_max}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('ratio_baixo_max', parseInt(e.target.value) || 15)}
                  className="w-20 px-3 py-2 bg-black/30 border border-orange-500/30 rounded-lg text-center font-mono text-lg text-orange-400"
                />
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>

            {/* CRÍTICO */}
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🔴</span>
                <div>
                  <p className="font-bold text-red-400">CRÍTICO</p>
                  <p className="text-xs text-white/40">Redução máxima - alta demanda</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">&gt;</span>
                <span className="px-3 py-2 bg-black/30 border border-red-500/30 rounded-lg text-center font-mono text-lg text-red-400">
                  {config.ratio_baixo_max}
                </span>
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>
          </div>

          {/* Visualização */}
          <div className="mt-6 p-4 bg-black/20 rounded-xl">
            <p className="text-white/60 text-sm mb-3 font-bold">Resumo dos Níveis:</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full">💚 ÓTIMO: 1-{config.ratio_otimo_max}</span>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">💛 BOM: {config.ratio_otimo_max + 1}-{config.ratio_bom_max}</span>
              <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full">🟠 BAIXO: {config.ratio_bom_max + 1}-{config.ratio_baixo_max}</span>
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full">🔴 CRÍTICO: {config.ratio_baixo_max + 1}+</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* SEÇÃO: ALERTAS FULLSCREEN */}
      {/* ============================================== */}
      {activeSection === 'alertas' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            🔔 Alertas Fullscreen por Nível
          </h3>
          <p className="text-white/40 text-sm mb-6">
            Configure a frequência e duração dos alertas fullscreen para cada nível
          </p>

          <div className="space-y-6">
            {/* Frequência */}
            <div>
              <h4 className="font-bold text-white/80 mb-4">📅 Frequência dos Alertas (a cada X minutos)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'alerta_freq_otimo', nivel: 'ÓTIMO', emoji: '💚', bgColor: 'rgba(48,209,88,0.1)', borderColor: 'rgba(48,209,88,0.3)', textColor: '#30D158' },
                  { key: 'alerta_freq_bom', nivel: 'BOM', emoji: '💛', bgColor: 'rgba(255,204,0,0.1)', borderColor: 'rgba(255,204,0,0.3)', textColor: '#FFCC00' },
                  { key: 'alerta_freq_baixo', nivel: 'BAIXO', emoji: '🟠', bgColor: 'rgba(255,149,0,0.1)', borderColor: 'rgba(255,149,0,0.3)', textColor: '#FF9500' },
                  { key: 'alerta_freq_critico', nivel: 'CRÍTICO', emoji: '🔴', bgColor: 'rgba(255,59,48,0.1)', borderColor: 'rgba(255,59,48,0.3)', textColor: '#FF3B30' }
                ].map(({ key, nivel, emoji, bgColor, borderColor, textColor }) => (
                  <div key={key} className="rounded-xl p-3 border" style={{ backgroundColor: bgColor, borderColor }}>
                    <p className="font-bold text-sm mb-2" style={{ color: textColor }}>{emoji} {nivel}</p>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={config[key as keyof EnvironmentConfig] as number}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig(key as keyof EnvironmentConfig, parseInt(e.target.value) || 5)}
                        className="w-16 px-2 py-1 bg-black/30 border border-white/20 rounded text-center font-mono"
                      />
                      <span className="text-white/40 text-xs">min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Duração */}
            <div>
              <h4 className="font-bold text-white/80 mb-4">⏱️ Duração do Alerta (segundos)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: 'alerta_duracao_otimo', nivel: 'ÓTIMO', emoji: '💚', bgColor: 'rgba(48,209,88,0.1)', borderColor: 'rgba(48,209,88,0.3)', textColor: '#30D158' },
                  { key: 'alerta_duracao_bom', nivel: 'BOM', emoji: '💛', bgColor: 'rgba(255,204,0,0.1)', borderColor: 'rgba(255,204,0,0.3)', textColor: '#FFCC00' },
                  { key: 'alerta_duracao_baixo', nivel: 'BAIXO', emoji: '🟠', bgColor: 'rgba(255,149,0,0.1)', borderColor: 'rgba(255,149,0,0.3)', textColor: '#FF9500' },
                  { key: 'alerta_duracao_critico', nivel: 'CRÍTICO', emoji: '🔴', bgColor: 'rgba(255,59,48,0.1)', borderColor: 'rgba(255,59,48,0.3)', textColor: '#FF3B30' }
                ].map(({ key, nivel, emoji, bgColor, borderColor, textColor }) => (
                  <div key={key} className="rounded-xl p-3 border" style={{ backgroundColor: bgColor, borderColor }}>
                    <p className="font-bold text-sm mb-2" style={{ color: textColor }}>{emoji} {nivel}</p>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={config[key as keyof EnvironmentConfig] as number}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig(key as keyof EnvironmentConfig, parseInt(e.target.value) || 2)}
                        className="w-16 px-2 py-1 bg-black/30 border border-white/20 rounded text-center font-mono"
                      />
                      <span className="text-white/40 text-xs">seg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* SEÇÃO: ANTI-BURLA */}
      {/* ============================================== */}
      {activeSection === 'antiburla' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            🛡️ Sistema Anti-Burla
          </h3>
          <p className="text-white/40 text-sm mb-6">
            Detecta quando professores tentam manipular o sistema com atendimentos muito curtos
          </p>

          <div className="space-y-6">
            {/* Tempo mínimo */}
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⏱️</span>
                <div>
                  <p className="font-bold text-red-400">Tempo Mínimo de Atendimento</p>
                  <p className="text-xs text-white/40">Abaixo disso, pede confirmação e marca como suspeito</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={3}
                  max={30}
                  value={config.tempo_minimo_atendimento}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('tempo_minimo_atendimento', parseInt(e.target.value) || 10)}
                  className="w-20 px-3 py-2 bg-black/30 border border-red-500/30 rounded-lg text-center font-mono text-lg text-red-400"
                />
                <span className="text-white/60">segundos</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Sequência para alerta */}
              <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🚨</span>
                  <div>
                    <p className="font-bold text-orange-400">Sequência para Alerta</p>
                    <p className="text-xs text-white/40">Quantos suspeitos para alertar supervisor</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={config.alertas_burla_sequencia}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('alertas_burla_sequencia', parseInt(e.target.value) || 3)}
                    className="w-20 px-3 py-2 bg-black/30 border border-orange-500/30 rounded-lg text-center font-mono text-lg text-orange-400"
                  />
                  <span className="text-white/60">atendimentos</span>
                </div>
              </div>

              {/* Janela de tempo */}
              <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🕐</span>
                  <div>
                    <p className="font-bold text-yellow-400">Janela de Tempo</p>
                    <p className="text-xs text-white/40">Período para detectar padrão</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={config.alertas_burla_janela_minutos}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('alertas_burla_janela_minutos', parseInt(e.target.value) || 5)}
                    className="w-20 px-3 py-2 bg-black/30 border border-yellow-500/30 rounded-lg text-center font-mono text-lg text-yellow-400"
                  />
                  <span className="text-white/60">minutos</span>
                </div>
              </div>
            </div>

            {/* Exemplo */}
            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
              <p className="text-blue-400 font-bold mb-2">📋 Como funciona:</p>
              <p className="text-white/60 text-sm">
                Se um professor fizer <strong className="text-white">{config.alertas_burla_sequencia}+ atendimentos</strong> com 
                menos de <strong className="text-white">{config.tempo_minimo_atendimento} segundos</strong> em 
                <strong className="text-white"> {config.alertas_burla_janela_minutos} minutos</strong>, 
                o supervisor receberá um alerta de comportamento suspeito.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* SEÇÃO: WHATSAPP */}
      {/* ============================================== */}
      {activeSection === 'whatsapp' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            📱 WhatsApp do Supervisor
          </h3>
          <p className="text-white/40 text-sm mb-6">
            Número que receberá alertas automáticos em situações críticas
          </p>

          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📞</span>
              <div>
                <p className="font-bold text-green-400">Número do WhatsApp</p>
                <p className="text-xs text-white/40">Formato: 5531999999999 (código país + DDD + número)</p>
              </div>
            </div>
            <input
              type="text"
              value={config.supervisor_whatsapp}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('supervisor_whatsapp', e.target.value.replace(/\D/g, ''))}
              placeholder="5531999999999"
              className="w-full px-4 py-3 bg-black/30 border border-green-500/30 rounded-lg font-mono text-lg text-green-400"
              maxLength={15}
            />
          </div>
        </div>
      )}

      {/* Botão Salvar */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setConfig(DEFAULT_CONFIG)}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all flex items-center gap-2 text-white/60"
        >
          ↩️ Restaurar Padrão
        </button>
        
        <button
          onClick={saveConfig}
          disabled={saving}
          className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 rounded-xl font-bold transition-all flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="animate-spin">⏳</span>
              Salvando...
            </>
          ) : (
            <>
              💾 Salvar Configurações
            </>
          )}
        </button>
      </div>
    </div>
  );
}
