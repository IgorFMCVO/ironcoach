// ============================================================================
// CAMINHO: src/app/admin/components/AdminEnvironmentConfig.tsx
// ============================================================================
// Componente para configurar níveis de atendimento, alertas e anti-burla
// COM CONFIGURAÇÃO AVANÇADA POR COR + CONDIÇÃO GERAL
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// INTERFACES
// ============================================================================

interface CondicaoNivel {
  id: string;
  cor: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' | 'BLUE';
  quantidade: number;
  tempoAtraso: number;
}

interface CondicaoGeral {
  ativa: boolean;
  quantidade: number;
  tempoAtraso: number;
}

interface ConfigNivelFila {
  nivel: 'CRITICO' | 'BAIXO' | 'BOM';
  condicaoGeral: CondicaoGeral;
  condicoes: CondicaoNivel[];
}

interface EnvironmentConfig {
  ratio_otimo_max: number;
  ratio_bom_max: number;
  ratio_baixo_max: number;
  config_fila_avancada: string;
  alerta_freq_otimo: number;
  alerta_freq_bom: number;
  alerta_freq_baixo: number;
  alerta_freq_critico: number;
  tempo_vermelho: number;
  tempo_laranja: number;
  tempo_amarelo: number;
  tempo_verde: number;
  tempo_minimo_atendimento: number;
  alertas_burla_sequencia: number;
  alertas_burla_janela_minutos: number;
  supervisor_whatsapp: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const CORES = [
  { value: 'RED', label: 'Vermelho', emoji: '🔴', color: '#FF3B30', desc: '1ª Semana' },
  { value: 'ORANGE', label: 'Laranja', emoji: '🟠', color: '#FF9500', desc: '2ª Semana' },
  { value: 'YELLOW', label: 'Amarelo', emoji: '🟡', color: '#FFCC00', desc: 'Mês 1' },
  { value: 'GREEN', label: 'Verde', emoji: '🟢', color: '#30D158', desc: 'Veterano' },
  { value: 'BLUE', label: 'Azul', emoji: '🔵', color: '#007AFF', desc: 'Autônomo' },
] as const;

const NIVEIS = [
  { value: 'CRITICO', label: 'CRÍTICO', emoji: '🔴', color: '#FF3B30', desc: 'Situação urgente' },
  { value: 'BAIXO', label: 'BAIXO', emoji: '🟠', color: '#FF9500', desc: 'Atenção necessária' },
  { value: 'BOM', label: 'BOM', emoji: '💛', color: '#FFCC00', desc: 'Situação aceitável' },
] as const;

const DEFAULT_CONFIG_FILA: ConfigNivelFila[] = [
  {
    nivel: 'CRITICO',
    condicaoGeral: { ativa: true, quantidade: 3, tempoAtraso: 300 },
    condicoes: [
      { id: '1', cor: 'RED', quantidade: 1, tempoAtraso: 300 },
      { id: '2', cor: 'ORANGE', quantidade: 2, tempoAtraso: 300 },
    ]
  },
  {
    nivel: 'BAIXO',
    condicaoGeral: { ativa: true, quantidade: 4, tempoAtraso: 180 },
    condicoes: [
      { id: '1', cor: 'RED', quantidade: 2, tempoAtraso: 120 },
      { id: '2', cor: 'ORANGE', quantidade: 2, tempoAtraso: 120 },
    ]
  },
  {
    nivel: 'BOM',
    condicaoGeral: { ativa: true, quantidade: 5, tempoAtraso: 60 },
    condicoes: [
      { id: '1', cor: 'RED', quantidade: 1, tempoAtraso: 60 },
      { id: '2', cor: 'ORANGE', quantidade: 1, tempoAtraso: 60 },
    ]
  },
];

const DEFAULT_CONFIG: EnvironmentConfig = {
  ratio_otimo_max: 5,
  ratio_bom_max: 10,
  ratio_baixo_max: 15,
  config_fila_avancada: JSON.stringify(DEFAULT_CONFIG_FILA),
  alerta_freq_otimo: 15,
  alerta_freq_bom: 10,
  alerta_freq_baixo: 5,
  alerta_freq_critico: 3,
  tempo_vermelho: 210,
  tempo_laranja: 270,
  tempo_amarelo: 330,
  tempo_verde: 390,
  tempo_minimo_atendimento: 10,
  alertas_burla_sequencia: 3,
  alertas_burla_janela_minutos: 5,
  supervisor_whatsapp: ''
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminEnvironmentConfig() {
  const [config, setConfig] = useState<EnvironmentConfig>(DEFAULT_CONFIG);
  const [configFila, setConfigFila] = useState<ConfigNivelFila[]>(DEFAULT_CONFIG_FILA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'niveis' | 'fila' | 'alertas' | 'antiburla' | 'whatsapp'>('niveis');
  const [expandedNivel, setExpandedNivel] = useState<string | null>('CRITICO');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/environment?type=config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig({ ...DEFAULT_CONFIG, ...data.config });
        if (data.config.config_fila_avancada) {
          try {
            const filaConfig = JSON.parse(data.config.config_fila_avancada);
            const validConfig = filaConfig.filter((n: any) => 
              ['CRITICO', 'BAIXO', 'BOM'].includes(n.nivel)
            );
            if (validConfig.length > 0) {
              // Garantir que cada nível tenha condicaoGeral
              const configComGeral = validConfig.map((n: any) => ({
                ...n,
                condicaoGeral: n.condicaoGeral || { ativa: false, quantidade: 5, tempoAtraso: 60 }
              }));
              setConfigFila(configComGeral);
            }
          } catch (e) {
            console.error('Erro ao parsear config_fila_avancada:', e);
          }
        }
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
      const configToSave = {
        ...config,
        config_fila_avancada: JSON.stringify(configFila)
      };
      const res = await fetch('/api/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateConfig', config: configToSave })
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
    }
  };

  const updateConfig = (key: keyof EnvironmentConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // ============================================================================
  // FUNÇÕES PARA CONFIGURAÇÃO DE FILA AVANÇADA
  // ============================================================================

  const updateCondicaoGeral = (nivelValue: string, field: keyof CondicaoGeral, value: any) => {
    setConfigFila(prev => prev.map(n => {
      if (n.nivel === nivelValue) {
        return {
          ...n,
          condicaoGeral: { ...n.condicaoGeral, [field]: value }
        };
      }
      return n;
    }));
  };

  const addCondicao = (nivelValue: string) => {
    setConfigFila(prev => prev.map(n => {
      if (n.nivel === nivelValue && n.condicoes.length < 5) {
        return {
          ...n,
          condicoes: [
            ...n.condicoes,
            { id: Date.now().toString(), cor: 'RED', quantidade: 1, tempoAtraso: 60 }
          ]
        };
      }
      return n;
    }));
  };

  const removeCondicao = (nivelValue: string, condicaoId: string) => {
    setConfigFila(prev => prev.map(n => {
      if (n.nivel === nivelValue) {
        return { ...n, condicoes: n.condicoes.filter(c => c.id !== condicaoId) };
      }
      return n;
    }));
  };

  const updateCondicao = (nivelValue: string, condicaoId: string, field: keyof CondicaoNivel, value: any) => {
    setConfigFila(prev => prev.map(n => {
      if (n.nivel === nivelValue) {
        return {
          ...n,
          condicoes: n.condicoes.map(c => c.id === condicaoId ? { ...c, [field]: value } : c)
        };
      }
      return n;
    }));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

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
          { id: 'niveis', label: '📊 Níveis (Ratio)', color: '#30D158' },
          { id: 'fila', label: '🎯 Níveis (Fila)', color: '#AF52DE' },
          { id: 'alertas', label: '🔔 Alertas', color: '#FF9500' },
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

      {/* SEÇÃO: NÍVEIS (RATIO) */}
      {activeSection === 'niveis' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">📊 Níveis de Atendimento (Ratio Alunos/Professor)</h3>
          <p className="text-white/40 text-sm mb-6">Defina os limites de ratio para determinar o nível de carga do salão</p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { key: 'ratio_otimo_max', nivel: 'ÓTIMO', emoji: '💚', color: 'green', desc: 'Tempos normais' },
              { key: 'ratio_bom_max', nivel: 'BOM', emoji: '💛', color: 'yellow', desc: 'Ajustes leves' },
              { key: 'ratio_baixo_max', nivel: 'BAIXO', emoji: '🟠', color: 'orange', desc: 'Ajustes moderados' },
            ].map(item => (
              <div key={item.key} className={`bg-${item.color}-500/10 rounded-xl p-4 border border-${item.color}-500/30`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{item.emoji}</span>
                  <div>
                    <p className={`font-bold text-${item.color}-400`}>{item.nivel}</p>
                    <p className="text-xs text-white/40">{item.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">≤</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={(config as any)[item.key]}
                    onChange={(e) => updateConfig(item.key as keyof EnvironmentConfig, parseInt(e.target.value) || 5)}
                    className={`w-20 px-3 py-2 bg-black/30 border border-${item.color}-500/30 rounded-lg text-center font-mono text-lg text-${item.color}-400`}
                  />
                  <span className="text-white/60">alunos/prof</span>
                </div>
              </div>
            ))}
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🔴</span>
                <div>
                  <p className="font-bold text-red-400">CRÍTICO</p>
                  <p className="text-xs text-white/40">Ajustes máximos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">&gt;</span>
                <span className="w-20 px-3 py-2 bg-black/30 border border-red-500/30 rounded-lg text-center font-mono text-lg text-red-400">
                  {config.ratio_baixo_max}
                </span>
                <span className="text-white/60">alunos/prof</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: NÍVEIS POR FILA (CONFIGURAÇÃO AVANÇADA) */}
      {activeSection === 'fila' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">🎯 Configuração Avançada de Fila</h3>
          <p className="text-white/40 text-sm mb-2">
            O sistema verifica na ordem: <strong className="text-red-400">CRÍTICO</strong> → <strong className="text-orange-400">BAIXO</strong> → <strong className="text-yellow-400">BOM</strong> → <strong className="text-green-400">ÓTIMO</strong>
          </p>
          <p className="text-white/40 text-sm mb-6">
            Se a <strong className="text-white">condição geral</strong> OU <strong className="text-white">qualquer condição específica</strong> for satisfeita, o nível é ativado.
          </p>

          {/* Fluxo Visual */}
          <div className="mb-6 p-4 bg-black/20 rounded-xl border border-white/10">
            <div className="flex items-center justify-center gap-2 flex-wrap text-sm">
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">🔴 CRÍTICO</span>
              <span className="text-white/40">→</span>
              <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30">🟠 BAIXO</span>
              <span className="text-white/40">→</span>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/30">💛 BOM</span>
              <span className="text-white/40">→</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">💚 ÓTIMO</span>
            </div>
          </div>

          {/* Cards dos Níveis */}
          <div className="space-y-4">
            {NIVEIS.map((nivel) => {
              const nivelConfig = configFila.find(n => n.nivel === nivel.value);
              const isExpanded = expandedNivel === nivel.value;
              
              return (
                <div
                  key={nivel.value}
                  className="rounded-xl border overflow-hidden"
                  style={{ backgroundColor: `${nivel.color}10`, borderColor: `${nivel.color}40` }}
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpandedNivel(isExpanded ? null : nivel.value)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{nivel.emoji}</span>
                      <div className="text-left">
                        <p className="font-bold" style={{ color: nivel.color }}>{nivel.label}</p>
                        <p className="text-xs text-white/40">
                          {nivelConfig?.condicaoGeral?.ativa ? '✓ Condição geral ativa' : ''} 
                          {nivelConfig?.condicaoGeral?.ativa && (nivelConfig?.condicoes?.length || 0) > 0 ? ' + ' : ''}
                          {(nivelConfig?.condicoes?.length || 0) > 0 ? `${nivelConfig?.condicoes.length} específica(s)` : ''}
                          {!nivelConfig?.condicaoGeral?.ativa && (nivelConfig?.condicoes?.length || 0) === 0 ? 'Sem condições' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-white/40 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </button>

                  {/* Conteúdo Expandido */}
                  {isExpanded && (
                    <div className="border-t border-white/10 p-4 space-y-4">
                      
                      {/* CONDIÇÃO GERAL */}
                      <div className="p-4 bg-black/30 rounded-xl border-2 border-dashed" style={{ borderColor: `${nivel.color}60` }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🌐</span>
                            <span className="font-bold" style={{ color: nivel.color }}>Condição Geral</span>
                            <span className="text-xs text-white/40">(qualquer cor)</span>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-white/40">Ativa</span>
                            <input
                              type="checkbox"
                              checked={nivelConfig?.condicaoGeral?.ativa || false}
                              onChange={(e) => updateCondicaoGeral(nivel.value, 'ativa', e.target.checked)}
                              className="w-5 h-5 rounded accent-green-500"
                            />
                          </label>
                        </div>
                        
                        {nivelConfig?.condicaoGeral?.ativa && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white/60 text-sm">Se houver</span>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={nivelConfig?.condicaoGeral?.quantidade || 5}
                              onChange={(e) => updateCondicaoGeral(nivel.value, 'quantidade', parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1 bg-black/30 border border-white/20 rounded text-center font-mono"
                            />
                            <span className="text-white/60 text-sm">card(s) com atraso ≥</span>
                            <input
                              type="number"
                              min={0}
                              max={600}
                              step={10}
                              value={nivelConfig?.condicaoGeral?.tempoAtraso || 60}
                              onChange={(e) => updateCondicaoGeral(nivel.value, 'tempoAtraso', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 bg-black/30 border border-white/20 rounded text-center font-mono"
                            />
                            <span className="text-white/60 text-sm">seg</span>
                            <span className="text-white/30 text-xs">({formatTime(nivelConfig?.condicaoGeral?.tempoAtraso || 60)})</span>
                          </div>
                        )}
                      </div>

                      {/* Separador */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1 border-t border-white/10"></div>
                        <span className="text-white/40 text-xs">OU</span>
                        <div className="flex-1 border-t border-white/10"></div>
                      </div>

                      {/* CONDIÇÕES ESPECÍFICAS POR COR */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">🎨</span>
                          <span className="font-bold text-white/80">Condições Específicas por Cor</span>
                        </div>
                        
                        <div className="space-y-2">
                          {nivelConfig?.condicoes?.map((condicao, index) => {
                            const corInfo = CORES.find(c => c.value === condicao.cor);
                            return (
                              <div key={condicao.id} className="flex items-center gap-2 p-3 bg-black/20 rounded-lg flex-wrap">
                                <span className="text-white/40 text-sm min-w-[90px]">Condição {index + 1}:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={20}
                                  value={condicao.quantidade}
                                  onChange={(e) => updateCondicao(nivel.value, condicao.id, 'quantidade', parseInt(e.target.value) || 1)}
                                  className="w-16 px-2 py-1 bg-black/30 border border-white/20 rounded text-center font-mono"
                                />
                                <span className="text-white/60 text-sm">card(s)</span>
                                <select
                                  value={condicao.cor}
                                  onChange={(e) => updateCondicao(nivel.value, condicao.id, 'cor', e.target.value)}
                                  className="px-3 py-1 bg-black/30 border border-white/20 rounded text-sm"
                                  style={{ color: corInfo?.color }}
                                >
                                  {CORES.map(cor => (
                                    <option key={cor.value} value={cor.value}>{cor.emoji} {cor.label}</option>
                                  ))}
                                </select>
                                <span className="text-white/60 text-sm">com atraso ≥</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={600}
                                  step={10}
                                  value={condicao.tempoAtraso}
                                  onChange={(e) => updateCondicao(nivel.value, condicao.id, 'tempoAtraso', parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 bg-black/30 border border-white/20 rounded text-center font-mono"
                                />
                                <span className="text-white/60 text-sm">seg</span>
                                <span className="text-white/30 text-xs">({formatTime(condicao.tempoAtraso)})</span>
                                <button
                                  onClick={() => removeCondicao(nivel.value, condicao.id)}
                                  className="ml-auto p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                >✕</button>
                              </div>
                            );
                          })}

                          {(nivelConfig?.condicoes?.length || 0) < 5 && (
                            <button
                              onClick={() => addCondicao(nivel.value)}
                              className="w-full p-3 border-2 border-dashed border-white/20 rounded-lg text-white/40 hover:border-white/40 hover:text-white/60 transition-colors flex items-center justify-center gap-2"
                            >
                              <span className="text-lg">+</span>
                              Adicionar Condição Específica
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Aviso */}
                      {!nivelConfig?.condicaoGeral?.ativa && (nivelConfig?.condicoes?.length || 0) === 0 && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                          ⚠️ Sem condições configuradas, este nível nunca será ativado pela fila.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ÓTIMO - Default */}
            <div className="rounded-xl border overflow-hidden bg-green-500/10 border-green-500/40">
              <div className="p-4 flex items-center gap-3">
                <span className="text-2xl">💚</span>
                <div>
                  <p className="font-bold text-green-400">ÓTIMO (Padrão)</p>
                  <p className="text-xs text-white/40">Ativado automaticamente quando <strong>nenhuma condição acima</strong> for satisfeita</p>
                </div>
              </div>
            </div>
          </div>

          {/* Explicação */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <h4 className="font-bold text-sm mb-3">📌 Como funciona:</h4>
            <div className="text-xs text-white/60 space-y-2">
              <p>1. O sistema verifica do nível <strong className="text-red-400">mais grave</strong> para o <strong className="text-green-400">menos grave</strong></p>
              <p>2. Para cada nível, verifica primeiro a <strong className="text-white">condição geral</strong> (qualquer cor)</p>
              <p>3. Se a geral não satisfizer, verifica as <strong className="text-white">condições específicas</strong> (por cor)</p>
              <p>4. Se <strong className="text-white">qualquer uma</strong> for satisfeita, o nível é ativado</p>
              <p>5. <strong className="text-white">Tempo de Atraso</strong> = Tempo esperando - Intervalo da cor</p>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: ALERTAS */}
      {activeSection === 'alertas' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">🔔 Frequência de Alertas Fullscreen</h3>
          <p className="text-white/40 text-sm mb-6">De quanto em quanto tempo o sistema exibe o alerta de ambiente na tela</p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { key: 'alerta_freq_otimo', nivel: 'ÓTIMO', emoji: '💚', color: 'green' },
              { key: 'alerta_freq_bom', nivel: 'BOM', emoji: '💛', color: 'yellow' },
              { key: 'alerta_freq_baixo', nivel: 'BAIXO', emoji: '🟠', color: 'orange' },
              { key: 'alerta_freq_critico', nivel: 'CRÍTICO', emoji: '🔴', color: 'red' },
            ].map(item => (
              <div key={item.key} className={`bg-${item.color}-500/10 rounded-xl p-4 border border-${item.color}-500/30`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{item.emoji}</span>
                  <div>
                    <p className={`font-bold text-${item.color}-400`}>{item.nivel}</p>
                    <p className="text-xs text-white/40">Intervalo entre alertas</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">A cada</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={(config as any)[item.key]}
                    onChange={(e) => updateConfig(item.key as keyof EnvironmentConfig, parseInt(e.target.value) || 5)}
                    className={`w-20 px-3 py-2 bg-black/30 border border-${item.color}-500/30 rounded-lg text-center font-mono text-lg text-${item.color}-400`}
                  />
                  <span className="text-white/60">minutos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO: ANTI-BURLA */}
      {activeSection === 'antiburla' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">🛡️ Sistema Anti-Burla</h3>
          <p className="text-white/40 text-sm mb-6">Configurações para detectar atendimentos suspeitos</p>
          <div className="space-y-6">
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⏱️</span>
                <div>
                  <p className="font-bold text-red-400">Tempo Mínimo de Atendimento</p>
                  <p className="text-xs text-white/40">Atendimentos mais rápidos são marcados como suspeitos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">Mínimo</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.tempo_minimo_atendimento}
                  onChange={(e) => updateConfig('tempo_minimo_atendimento', parseInt(e.target.value) || 10)}
                  className="w-20 px-3 py-2 bg-black/30 border border-red-500/30 rounded-lg text-center font-mono text-lg text-red-400"
                />
                <span className="text-white/60">segundos</span>
              </div>
            </div>
            <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🚨</span>
                <div>
                  <p className="font-bold text-orange-400">Alertas para Notificação</p>
                  <p className="text-xs text-white/40">Quantos atendimentos suspeitos para notificar supervisor</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.alertas_burla_sequencia}
                  onChange={(e) => updateConfig('alertas_burla_sequencia', parseInt(e.target.value) || 3)}
                  className="w-20 px-3 py-2 bg-black/30 border border-orange-500/30 rounded-lg text-center font-mono text-lg text-orange-400"
                />
                <span className="text-white/60">atendimentos suspeitos em</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={config.alertas_burla_janela_minutos}
                  onChange={(e) => updateConfig('alertas_burla_janela_minutos', parseInt(e.target.value) || 5)}
                  className="w-20 px-3 py-2 bg-black/30 border border-orange-500/30 rounded-lg text-center font-mono text-lg text-orange-400"
                />
                <span className="text-white/60">minutos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: WHATSAPP */}
      {activeSection === 'whatsapp' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-2">📱 Notificações WhatsApp</h3>
          <p className="text-white/40 text-sm mb-6">Número do supervisor para receber alertas críticos</p>
          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📲</span>
              <div>
                <p className="font-bold text-green-400">Número do Supervisor</p>
                <p className="text-xs text-white/40">Formato: 5531999999999 (com DDD, sem +)</p>
              </div>
            </div>
            <input
              type="text"
              value={config.supervisor_whatsapp}
              onChange={(e) => updateConfig('supervisor_whatsapp', e.target.value.replace(/\D/g, ''))}
              placeholder="5531999999999"
              className="w-full px-4 py-3 bg-black/30 border border-green-500/30 rounded-lg font-mono text-lg text-green-400"
            />
          </div>
        </div>
      )}

      {/* BOTÕES */}
      <div className="flex gap-4 pt-4">
        <button
          onClick={() => { setConfig(DEFAULT_CONFIG); setConfigFila(DEFAULT_CONFIG_FILA); setMessage({ type: 'success', text: 'Valores restaurados!' }); }}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
        >🔄 Restaurar Padrão</button>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-800 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</> : <>💾 Salvar Configurações</>}
        </button>
      </div>
    </div>
  );
}
