// ============================================================================
// CAMINHO: src/components/AdminEnvironmentConfig.tsx
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Cores que TÊM alertas e ajuste dinâmico (PURPLE e BLACK não aparecem aqui)
const PRIORITY_COLORS = {
  RED: { color: '#FF3B30', label: 'Vermelho', emoji: '🔴', desc: '1ª semana' },
  ORANGE: { color: '#FF9500', label: 'Laranja', emoji: '🟠', desc: '2ª semana' },
  YELLOW: { color: '#FFCC00', label: 'Amarelo', emoji: '🟡', desc: '3ª-4ª semana' },
  GREEN: { color: '#30D158', label: 'Verde', emoji: '🟢', desc: 'Veterano' },
  BLUE: { color: '#007AFF', label: 'Azul', emoji: '🔵', desc: 'Autônomo (180+ dias)' },
};

interface EnvironmentConfig {
  ratio_otimo_max: number;
  ratio_bom_max: number;
  ratio_baixo_max: number;
  alerta_freq_otimo: number;
  alerta_freq_bom: number;
  alerta_freq_baixo: number;
  alerta_freq_critico: number;
  ajuste_red_otimo: number;
  ajuste_red_bom: number;
  ajuste_red_baixo: number;
  ajuste_red_critico: number;
  ajuste_orange_otimo: number;
  ajuste_orange_bom: number;
  ajuste_orange_baixo: number;
  ajuste_orange_critico: number;
  ajuste_yellow_otimo: number;
  ajuste_yellow_bom: number;
  ajuste_yellow_baixo: number;
  ajuste_yellow_critico: number;
  ajuste_green_otimo: number;
  ajuste_green_bom: number;
  ajuste_green_baixo: number;
  ajuste_green_critico: number;
  ajuste_blue_otimo: number;
  ajuste_blue_bom: number;
  ajuste_blue_baixo: number;
  ajuste_blue_critico: number;
  tempo_minimo_atendimento: number;
  alertas_burla_sequencia: number;
  alertas_burla_janela_minutos: number;
  supervisor_whatsapp: string;
}

const DEFAULT_CONFIG: EnvironmentConfig = {
  ratio_otimo_max: 5,
  ratio_bom_max: 10,
  ratio_baixo_max: 15,
  alerta_freq_otimo: 15,
  alerta_freq_bom: 10,
  alerta_freq_baixo: 5,
  alerta_freq_critico: 3,
  ajuste_red_otimo: 0,
  ajuste_red_bom: -30,
  ajuste_red_baixo: -60,
  ajuste_red_critico: -90,
  ajuste_orange_otimo: 0,
  ajuste_orange_bom: -30,
  ajuste_orange_baixo: -60,
  ajuste_orange_critico: -90,
  ajuste_yellow_otimo: 0,
  ajuste_yellow_bom: -30,
  ajuste_yellow_baixo: -60,
  ajuste_yellow_critico: -90,
  ajuste_green_otimo: 0,
  ajuste_green_bom: -30,
  ajuste_green_baixo: -60,
  ajuste_green_critico: -90,
  ajuste_blue_otimo: 0,
  ajuste_blue_bom: -30,
  ajuste_blue_baixo: -60,
  ajuste_blue_critico: -90,
  tempo_minimo_atendimento: 10,
  alertas_burla_sequencia: 3,
  alertas_burla_janela_minutos: 5,
  supervisor_whatsapp: ''
};

const BASE_INTERVALS = { RED: 3, ORANGE: 4, YELLOW: 5, GREEN: 6, BLUE: 7 };

export default function AdminEnvironmentConfig() {
  const [config, setConfig] = useState<EnvironmentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'niveis' | 'alertas' | 'ajuste' | 'antiburla' | 'whatsapp'>('niveis');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/environment?type=config');
      const data = await res.json();
      if (data.success && data.config) setConfig({ ...DEFAULT_CONFIG, ...data.config });
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
      if (data.success) setMessage({ type: 'success', text: 'Configurações salvas!' });
      else throw new Error(data.error);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const updateConfig = (key: keyof EnvironmentConfig, value: number | string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const calcResultado = (cor: string, nivel: string): number => {
    const base = BASE_INTERVALS[cor as keyof typeof BASE_INTERVALS] * 60;
    const key = `ajuste_${cor.toLowerCase()}_${nivel.toLowerCase()}` as keyof EnvironmentConfig;
    const ajuste = config[key] as number || 0;
    return Math.max(30, base + ajuste);
  };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'niveis', label: '📊 Níveis', color: '#30D158' },
          { id: 'alertas', label: '🔔 Alertas', color: '#FF9500' },
          { id: 'ajuste', label: '⚡ Ajuste por Cor', color: '#AF52DE' },
          { id: 'antiburla', label: '🛡️ Anti-Burla', color: '#FF3B30' },
          { id: 'whatsapp', label: '📱 WhatsApp', color: '#25D366' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeSection === tab.id ? 'text-white shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'
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
              message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NÍVEIS */}
      {activeSection === 'niveis' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">📊 Níveis de Atendimento (Ratio)</h3>
          <p className="text-white/40 text-sm mb-6">
            Defina os limites de ratio. <span className="text-purple-400">PURPLE e BLACK não entram no cálculo.</span>
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {/* ÓTIMO */}
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💚</span>
                <div><p className="font-bold text-green-400">ÓTIMO</p><p className="text-xs text-white/40">Situação ideal</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">≤</span>
                <input type="number" min={1} max={20} value={config.ratio_otimo_max}
                  onChange={(e) => updateConfig('ratio_otimo_max', parseInt(e.target.value) || 5)}
                  className="w-20 px-3 py-2 bg-black/30 border border-green-500/30 rounded-lg text-center font-mono text-lg text-green-400"
                />
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>
            {/* BOM */}
            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💛</span>
                <div><p className="font-bold text-yellow-400">BOM</p><p className="text-xs text-white/40">Aceitável</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">{config.ratio_otimo_max + 1} -</span>
                <input type="number" min={config.ratio_otimo_max + 1} max={25} value={config.ratio_bom_max}
                  onChange={(e) => updateConfig('ratio_bom_max', parseInt(e.target.value) || 10)}
                  className="w-20 px-3 py-2 bg-black/30 border border-yellow-500/30 rounded-lg text-center font-mono text-lg text-yellow-400"
                />
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>
            {/* BAIXO */}
            <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🟠</span>
                <div><p className="font-bold text-orange-400">BAIXO</p><p className="text-xs text-white/40">Atenção</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">{config.ratio_bom_max + 1} -</span>
                <input type="number" min={config.ratio_bom_max + 1} max={30} value={config.ratio_baixo_max}
                  onChange={(e) => updateConfig('ratio_baixo_max', parseInt(e.target.value) || 15)}
                  className="w-20 px-3 py-2 bg-black/30 border border-orange-500/30 rounded-lg text-center font-mono text-lg text-orange-400"
                />
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>
            {/* CRÍTICO */}
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🔴</span>
                <div><p className="font-bold text-red-400">CRÍTICO</p><p className="text-xs text-white/40">Urgente</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">&gt;</span>
                <span className="px-3 py-2 bg-red-500/20 rounded-lg font-mono text-lg text-red-400">{config.ratio_baixo_max}</span>
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERTAS */}
      {activeSection === 'alertas' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">🔔 Frequência de Alertas Fullscreen</h3>
          <p className="text-white/40 text-sm mb-6">De quanto em quanto tempo exibe o alerta de ambiente</p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { key: 'alerta_freq_otimo', level: 'ÓTIMO', emoji: '💚', color: '#30D158' },
              { key: 'alerta_freq_bom', level: 'BOM', emoji: '💛', color: '#FFCC00' },
              { key: 'alerta_freq_baixo', level: 'BAIXO', emoji: '🟠', color: '#FF9500' },
              { key: 'alerta_freq_critico', level: 'CRÍTICO', emoji: '🔴', color: '#FF3B30' }
            ].map(({ key, level, emoji, color }) => (
              <div key={key} className="rounded-xl p-4 border" style={{ backgroundColor: `${color}15`, borderColor: `${color}40` }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{emoji}</span>
                  <p className="font-bold" style={{ color }}>{level}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">A cada</span>
                  <input type="number" min={1} max={60} value={config[key as keyof EnvironmentConfig] as number}
                    onChange={(e) => updateConfig(key as keyof EnvironmentConfig, parseInt(e.target.value) || 5)}
                    className="w-20 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-center font-mono text-lg"
                  />
                  <span className="text-white/60">minutos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AJUSTE POR COR */}
      {activeSection === 'ajuste' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">⚡ Ajuste Dinâmico por Cor e Nível</h3>
          <p className="text-white/40 text-sm mb-4">
            Segundos a subtrair do intervalo base. <span className="text-purple-400">PURPLE e BLACK não têm alertas.</span>
          </p>
          {/* Preview */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6 overflow-x-auto">
            <p className="text-purple-400 font-bold mb-3">📋 Preview:</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/40">
                  <th className="text-left p-2">Cor</th>
                  <th className="text-center p-2">Base</th>
                  <th className="text-center p-2">💚 ÓTIMO</th>
                  <th className="text-center p-2">💛 BOM</th>
                  <th className="text-center p-2">🟠 BAIXO</th>
                  <th className="text-center p-2">🔴 CRÍTICO</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(PRIORITY_COLORS).map(([cor, info]) => (
                  <tr key={cor} className="border-t border-white/10">
                    <td className="p-2"><span className="flex items-center gap-2"><span>{info.emoji}</span><span style={{ color: info.color }}>{info.label}</span></span></td>
                    <td className="text-center p-2 text-white/60">{BASE_INTERVALS[cor as keyof typeof BASE_INTERVALS]}min</td>
                    <td className="text-center p-2 text-green-400 font-mono">{formatTime(calcResultado(cor, 'otimo'))}</td>
                    <td className="text-center p-2 text-yellow-400 font-mono">{formatTime(calcResultado(cor, 'bom'))}</td>
                    <td className="text-center p-2 text-orange-400 font-mono">{formatTime(calcResultado(cor, 'baixo'))}</td>
                    <td className="text-center p-2 text-red-400 font-mono">{formatTime(calcResultado(cor, 'critico'))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Inputs por cor */}
          <div className="space-y-6">
            {Object.entries(PRIORITY_COLORS).map(([cor, info]) => (
              <div key={cor} className="rounded-xl p-4 border" style={{ backgroundColor: `${info.color}10`, borderColor: `${info.color}40` }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{info.emoji}</span>
                  <div>
                    <p className="font-bold" style={{ color: info.color }}>{info.label}</p>
                    <p className="text-xs text-white/40">Base: {BASE_INTERVALS[cor as keyof typeof BASE_INTERVALS]}min</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { nivel: 'otimo', label: 'ÓTIMO', emoji: '💚', color: '#30D158' },
                    { nivel: 'bom', label: 'BOM', emoji: '💛', color: '#FFCC00' },
                    { nivel: 'baixo', label: 'BAIXO', emoji: '🟠', color: '#FF9500' },
                    { nivel: 'critico', label: 'CRÍTICO', emoji: '🔴', color: '#FF3B30' }
                  ].map(({ nivel, label, emoji, color }) => {
                    const key = `ajuste_${cor.toLowerCase()}_${nivel}` as keyof EnvironmentConfig;
                    return (
                      <div key={nivel} className="bg-black/30 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-2">
                          <span className="text-sm">{emoji}</span>
                          <span className="text-xs" style={{ color }}>{label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="number" min={-300} max={60} step={10} value={config[key] as number}
                            onChange={(e) => updateConfig(key, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded text-center font-mono text-sm"
                          />
                          <span className="text-xs text-white/40">s</span>
                        </div>
                        <p className="text-xs text-white/30 mt-1 text-center">= {formatTime(calcResultado(cor, nivel))}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANTI-BURLA */}
      {activeSection === 'antiburla' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">🛡️ Sistema Anti-Burla</h3>
          <p className="text-white/40 text-sm mb-6">Detecta atendimentos muito curtos</p>
          <div className="space-y-6">
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">⏱️</span>
                <div><p className="font-bold text-red-400">Tempo Mínimo</p><p className="text-xs text-white/40">Abaixo disso, marca suspeito</p></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={3} max={30} value={config.tempo_minimo_atendimento}
                  onChange={(e) => updateConfig('tempo_minimo_atendimento', parseInt(e.target.value) || 10)}
                  className="w-20 px-3 py-2 bg-black/30 border border-red-500/30 rounded-lg text-center font-mono text-lg text-red-400"
                />
                <span className="text-white/60">segundos</span>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🚨</span>
                  <div><p className="font-bold text-orange-400">Sequência para Alerta</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={2} max={10} value={config.alertas_burla_sequencia}
                    onChange={(e) => updateConfig('alertas_burla_sequencia', parseInt(e.target.value) || 3)}
                    className="w-20 px-3 py-2 bg-black/30 border border-orange-500/30 rounded-lg text-center font-mono text-lg text-orange-400"
                  />
                  <span className="text-white/60">atendimentos</span>
                </div>
              </div>
              <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🕐</span>
                  <div><p className="font-bold text-yellow-400">Janela de Tempo</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={30} value={config.alertas_burla_janela_minutos}
                    onChange={(e) => updateConfig('alertas_burla_janela_minutos', parseInt(e.target.value) || 5)}
                    className="w-20 px-3 py-2 bg-black/30 border border-yellow-500/30 rounded-lg text-center font-mono text-lg text-yellow-400"
                  />
                  <span className="text-white/60">minutos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP */}
      {activeSection === 'whatsapp' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">📱 WhatsApp do Supervisor</h3>
          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📞</span>
              <div><p className="font-bold text-green-400">Número</p><p className="text-xs text-white/40">55 + DDD + número</p></div>
            </div>
            <input type="text" value={config.supervisor_whatsapp}
              onChange={(e) => updateConfig('supervisor_whatsapp', e.target.value.replace(/\D/g, ''))}
              placeholder="5531999999999"
              className="w-full px-4 py-3 bg-black/30 border border-green-500/30 rounded-lg font-mono text-lg text-green-400"
              maxLength={15}
            />
          </div>
        </div>
      )}

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button onClick={saveConfig} disabled={saving}
          className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 rounded-xl font-bold transition-all flex items-center gap-2"
        >
          {saving ? <><span className="animate-spin">⏳</span>Salvando...</> : <>💾 Salvar</>}
        </button>
      </div>
    </div>
  );
}
