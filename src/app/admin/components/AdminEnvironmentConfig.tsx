// ============================================================================
// CAMINHO: src/components/AdminEnvironmentConfig.tsx
// ============================================================================
// Componente para configurar níveis de atendimento, alertas e anti-burla
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnvironmentConfig {
  // Ratios de nível
  ratio_otimo_max: number;
  ratio_bom_max: number;
  ratio_baixo_max: number;
  
  // Frequência de alertas (minutos)
  alerta_freq_otimo: number;
  alerta_freq_bom: number;
  alerta_freq_baixo: number;
  alerta_freq_critico: number;
  
  // Tempos base (segundos)
  tempo_vermelho: number;
  tempo_laranja: number;
  tempo_amarelo: number;
  tempo_verde: number;
  
  // Anti-burla
  tempo_minimo_atendimento: number;
  alertas_burla_sequencia: number;
  alertas_burla_janela_minutos: number;
  
  // WhatsApp
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
  tempo_vermelho: 210, // 3:30
  tempo_laranja: 270, // 4:30
  tempo_amarelo: 330, // 5:30
  tempo_verde: 390, // 6:30
  tempo_minimo_atendimento: 10,
  alertas_burla_sequencia: 3,
  alertas_burla_janela_minutos: 5,
  supervisor_whatsapp: ''
};

export default function AdminEnvironmentConfig() {
  const [config, setConfig] = useState<EnvironmentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'niveis' | 'alertas' | 'tempos' | 'antiburla' | 'whatsapp'>('niveis');

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

  const formatTime = (seconds: number) => {
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
      {/* Tabs de Seções */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'niveis', label: '📊 Níveis', color: '#30D158' },
          { id: 'alertas', label: '🔔 Alertas', color: '#FF9500' },
          { id: 'tempos', label: '⏱️ Tempos', color: '#007AFF' },
          { id: 'antiburla', label: '🛡️ Anti-Burla', color: '#FF3B30' },
          { id: 'whatsapp', label: '📱 WhatsApp', color: '#25D366' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
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

      {/* SEÇÃO: NÍVEIS */}
      {activeSection === 'niveis' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            📊 Níveis de Atendimento (Ratio Alunos/Professor)
          </h3>
          <p className="text-white/40 text-sm mb-6">
            Defina os limites de ratio para cada nível de atendimento
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ÓTIMO */}
            <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💚</span>
                <div>
                  <p className="font-bold text-green-400">ÓTIMO</p>
                  <p className="text-xs text-white/40">Situação ideal de atendimento</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">≤</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.ratio_otimo_max}
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
                <div>
                  <p className="font-bold text-yellow-400">BOM</p>
                  <p className="text-xs text-white/40">Situação aceitável</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">{config.ratio_otimo_max + 1} -</span>
                <input
                  type="number"
                  min={config.ratio_otimo_max + 1}
                  max={25}
                  value={config.ratio_bom_max}
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
                <div>
                  <p className="font-bold text-orange-400">BAIXO</p>
                  <p className="text-xs text-white/40">Atenção necessária</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">{config.ratio_bom_max + 1} -</span>
                <input
                  type="number"
                  min={config.ratio_bom_max + 1}
                  max={30}
                  value={config.ratio_baixo_max}
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
                <div>
                  <p className="font-bold text-red-400">CRÍTICO</p>
                  <p className="text-xs text-white/40">Intervenção urgente necessária</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">&gt;</span>
                <span className="px-3 py-2 bg-red-500/20 rounded-lg font-mono text-lg text-red-400">
                  {config.ratio_baixo_max}
                </span>
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: ALERTAS */}
      {activeSection === 'alertas' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            🔔 Frequência de Alertas Fullscreen
          </h3>
          <p className="text-white/40 text-sm mb-6">
            De quanto em quanto tempo o sistema exibe o alerta de ambiente
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { key: 'alerta_freq_otimo', level: 'ÓTIMO', emoji: '💚', color: 'green' },
              { key: 'alerta_freq_bom', level: 'BOM', emoji: '💛', color: 'yellow' },
              { key: 'alerta_freq_baixo', level: 'BAIXO', emoji: '🟠', color: 'orange' },
              { key: 'alerta_freq_critico', level: 'CRÍTICO', emoji: '🔴', color: 'red' }
            ].map(({ key, level, emoji, color }) => (
              <div key={key} className={`bg-${color}-500/10 rounded-xl p-4 border border-${color}-500/30`}
                   style={{ backgroundColor: `${color === 'green' ? '#30D158' : color === 'yellow' ? '#FFCC00' : color === 'orange' ? '#FF9500' : '#FF3B30'}15`, borderColor: `${color === 'green' ? '#30D158' : color === 'yellow' ? '#FFCC00' : color === 'orange' ? '#FF9500' : '#FF3B30'}40` }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{emoji}</span>
                  <p className="font-bold" style={{ color: color === 'green' ? '#30D158' : color === 'yellow' ? '#FFCC00' : color === 'orange' ? '#FF9500' : '#FF3B30' }}>
                    {level}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">A cada</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={config[key as keyof EnvironmentConfig] as number}
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

      {/* SEÇÃO: TEMPOS */}
      {activeSection === 'tempos' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            ⏱️ Tempos de Atendimento por Prioridade
          </h3>
          <p className="text-white/40 text-sm mb-6">
            Tempo máximo (em segundos) antes do card começar a alertar
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { key: 'tempo_vermelho', label: 'Vermelho (1ª Semana)', emoji: '🔴', color: '#FF3B30' },
              { key: 'tempo_laranja', label: 'Laranja (2ª Semana)', emoji: '🟠', color: '#FF9500' },
              { key: 'tempo_amarelo', label: 'Amarelo (3ª-4ª Semana)', emoji: '🟡', color: '#FFCC00' },
              { key: 'tempo_verde', label: 'Verde (31+ dias)', emoji: '🟢', color: '#30D158' }
            ].map(({ key, label, emoji, color }) => (
              <div key={key} className="bg-black/30 rounded-xl p-4 border" style={{ borderColor: `${color}40` }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="font-bold" style={{ color }}>{label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={30}
                    max={600}
                    step={30}
                    value={config[key as keyof EnvironmentConfig] as number}
                    onChange={(e) => updateConfig(key as keyof EnvironmentConfig, parseInt(e.target.value) || 180)}
                    className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-center font-mono text-lg"
                  />
                  <span className="text-white/60">seg</span>
                  <span className="text-white/40 ml-2">
                    ({formatTime(config[key as keyof EnvironmentConfig] as number)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO: ANTI-BURLA */}
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
                  onChange={(e) => updateConfig('tempo_minimo_atendimento', parseInt(e.target.value) || 10)}
                  className="w-20 px-3 py-2 bg-black/30 border border-red-500/30 rounded-lg text-center font-mono text-lg text-red-400"
                />
                <span className="text-white/60">segundos</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Quantidade para alerta */}
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
                    onChange={(e) => updateConfig('alertas_burla_sequencia', parseInt(e.target.value) || 3)}
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
                    onChange={(e) => updateConfig('alertas_burla_janela_minutos', parseInt(e.target.value) || 5)}
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

      {/* SEÇÃO: WHATSAPP */}
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
