// ============================================================================
// CAMINHO: src/app/admin/page.tsx
// ============================================================================
// IRON COACH - Página de Administração
// - Gerenciamento de usuários (coaches)
// - Configurações do sistema (tempos, alertas, etc)
// - v16: Sistema PURPLE/BLACK para Personal/Consultoria
// ============================================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase, getCoachSession } from '@/lib/supabase';
import AdminEnvironmentConfig from './components/AdminEnvironmentConfig';

// ============================================================================
// TYPES
// ============================================================================

interface Coach {
  id: string;
  name: string;
  initials: string;
  pin: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'PROFESSOR';
  is_supervisor: boolean;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  role: string;
}

interface SystemConfig {
  attendanceTime: Record<string, number>;
  alertInterval: Record<string, number>;
  autoCheckoutMinutes: number;
  criticalRetentionThreshold: number;
  lowRetentionThreshold: number;
  criticalOverlayDuration: number;
  criticalOverlayInterval: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// v16: Atualizado com PURPLE para Personal Trainer
const PRIORITY_INFO: Record<string, { color: string; label: string; emoji: string; description: string }> = {
  RED: { color: '#FF3B30', label: 'Máxima', emoji: '🔴', description: '1ª semana (0-7 dias)' },
  ORANGE: { color: '#FF9500', label: 'Alta', emoji: '🟠', description: '2ª semana (8-14 dias)' },
  YELLOW: { color: '#FFCC00', label: 'Moderada', emoji: '🟡', description: 'Mês 1 (15-30 dias)' },
  GREEN: { color: '#30D158', label: 'Normal', emoji: '🟢', description: 'Veterano (31-179 dias)' },
  BLUE: { color: '#007AFF', label: 'Autônomo', emoji: '🔵', description: 'Veterano autônomo (180+ dias)' },
  PURPLE: { color: '#AF52DE', label: 'Personal', emoji: '🟣', description: 'Aluno de Personal Trainer' },
  BLACK: { color: '#8E8E93', label: 'Consultoria', emoji: '⚫', description: 'Consultoria/EVO automático' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminPage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [showPins, setShowPins] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'config' | 'ambiente'>('users');
  
  // Configurações
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Verificar se é admin
  useEffect(() => {
    const checkAdmin = async () => {
      const session = await getCoachSession();
      if (!session) {
        window.location.href = '/';
        return;
      }
      
      const { data: coachData } = await supabase
        .from('coaches')
        .select('id, name, role')
        .eq('id', session.id)
        .single();
      
      if (coachData?.role !== 'ADMIN') {
        window.location.href = '/';
        return;
      }
      
      setAdmin(coachData);
      setIsLoading(false);
    };
    
    checkAdmin();
  }, []);

  // Carregar coaches
  const loadCoaches = useCallback(async () => {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .order('role')
      .order('name');
    
    if (!error && data) {
      setCoaches(data);
    }
  }, []);

  // Carregar configurações
  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const response = await fetch('/api/config');
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.config);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) {
      loadCoaches();
      loadConfig();
    }
  }, [admin, loadCoaches, loadConfig]);

  // Salvar configurações
  const saveConfig = async () => {
    if (!config) return;
    
    setConfigSaving(true);
    setConfigMessage(null);
    
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfigMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        setConfigMessage({ type: 'error', text: result.error || 'Erro ao salvar' });
      }
    } catch (error) {
      setConfigMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setConfigSaving(false);
      setTimeout(() => setConfigMessage(null), 5000);
    }
  };

  // Atualizar configuração específica
  const updateConfig = (key: string, value: any) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const updateAttendanceTime = (priority: string, value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      attendanceTime: { ...config.attendanceTime, [priority]: value },
    });
  };

  const updateAlertInterval = (priority: string, value: number) => {
    if (!config) return;
    setConfig({
      ...config,
      alertInterval: { ...config.alertInterval, [priority]: value },
    });
  };

  // Criar coach
  const createCoach = async (data: { name: string; initials: string; pin: string; role: 'ADMIN' | 'SUPERVISOR' | 'PROFESSOR' }) => {
    try {
      // Primeiro, tentar via RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_coach', {
        p_name: data.name,
        p_initials: data.initials,
        p_pin: data.pin,
        p_role: data.role,
      });
      
      if (!rpcError) {
        loadCoaches();
        setShowAddModal(false);
        return;
      }
      
      console.log('RPC create_coach não disponível, usando INSERT direto:', rpcError.message);
      
      // Fallback: INSERT direto na tabela coaches
      const { error: insertError } = await supabase
        .from('coaches')
        .insert({
          name: data.name,
          initials: data.initials.toUpperCase(),
          pin: data.pin,
          role: data.role,
          is_active: true,
          is_supervisor: data.role === 'SUPERVISOR' || data.role === 'ADMIN',
        });
      
      if (insertError) {
        console.error('Erro ao criar coach:', insertError);
        alert(`Erro ao criar usuário: ${insertError.message}`);
        return;
      }
      
      loadCoaches();
      setShowAddModal(false);
    } catch (err) {
      console.error('Exceção ao criar coach:', err);
      alert('Erro inesperado ao criar usuário');
    }
  };

  // Atualizar coach
  const updateCoach = async (id: string, data: Partial<Coach>) => {
    try {
      // Primeiro, tentar via RPC
      const { error: rpcError } = await supabase.rpc('update_coach', {
        p_coach_id: id,
        p_name: data.name,
        p_initials: data.initials,
        p_pin: data.pin,
        p_role: data.role,
        p_is_active: data.is_active,
      });
      
      if (!rpcError) {
        loadCoaches();
        setEditingCoach(null);
        return;
      }
      
      console.log('RPC update_coach não disponível, usando UPDATE direto:', rpcError.message);
      
      // Fallback: UPDATE direto na tabela
      const { error: updateError } = await supabase
        .from('coaches')
        .update({
          name: data.name,
          initials: data.initials?.toUpperCase(),
          pin: data.pin,
          role: data.role,
          is_active: data.is_active,
          is_supervisor: data.role === 'SUPERVISOR' || data.role === 'ADMIN',
        })
        .eq('id', id);
      
      if (updateError) {
        console.error('Erro ao atualizar coach:', updateError);
        alert(`Erro ao atualizar: ${updateError.message}`);
        return;
      }
      
      loadCoaches();
      setEditingCoach(null);
    } catch (err) {
      console.error('Exceção ao atualizar coach:', err);
      alert('Erro inesperado ao atualizar');
    }
  };

  // Deletar coach
  const deleteCoach = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    
    try {
      // Primeiro, tentar via RPC
      const { error: rpcError } = await supabase.rpc('delete_coach', { p_coach_id: id });
      
      if (!rpcError) {
        loadCoaches();
        return;
      }
      
      console.log('RPC delete_coach não disponível, usando DELETE direto:', rpcError.message);
      
      // Fallback: DELETE direto
      const { error: deleteError } = await supabase
        .from('coaches')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error('Erro ao deletar coach:', deleteError);
        alert(`Erro ao remover: ${deleteError.message}`);
        return;
      }
      
      loadCoaches();
    } catch (err) {
      console.error('Exceção ao deletar coach:', err);
      alert('Erro inesperado ao remover');
    }
  };

  // Toggle ativo/inativo
  const toggleActive = async (coach: Coach) => {
    await updateCoach(coach.id, { ...coach, is_active: !coach.is_active });
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Acesso não autorizado</div>
      </div>
    );
  }

  const activeCoaches = coaches.filter(c => c.is_active);
  const inactiveCoaches = coaches.filter(c => !c.is_active);

  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto">
      {/* HEADER */}
      <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-white/60 hover:text-white transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold">◆ Administração</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-white/60">{admin.name}</span>
        </div>
      </header>

      {/* TABS */}
      <div className="border-b border-white/10 px-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-4 font-medium text-sm transition-all border-b-2 ${
              activeTab === 'users'
                ? 'border-white text-white'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            👥 Usuários
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-4 font-medium text-sm transition-all border-b-2 ${
              activeTab === 'config'
                ? 'border-white text-white'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            ⚙️ Configurações
          </button>
          <button
            onClick={() => setActiveTab('ambiente')}
            className={`px-6 py-4 font-medium text-sm transition-all border-b-2 ${
              activeTab === 'ambiente'
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            🚦 Ambiente
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto p-6 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard label="Total de Usuários" value={coaches.length} icon="●" />
                <StatCard label="Ativos" value={activeCoaches.length} icon="✓" color="#30D158" />
                <StatCard label="Administradores" value={coaches.filter(c => c.role === 'ADMIN').length} icon="◆" color="#AF52DE" />
                <StatCard label="Supervisores" value={coaches.filter(c => c.role === 'SUPERVISOR').length} icon="■" color="#007AFF" />
              </div>

              {/* Botões */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Usuários do Sistema</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPins(!showPins)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      showPins ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {showPins ? '🔒 Ocultar PINs' : '🔓 Mostrar PINs'}
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-colors"
                  >
                    + Adicionar Usuário
                  </button>
                </div>
              </div>

              {/* Tabela de Usuários */}
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-sm text-white/40">
                      <th className="p-4">Usuário</th>
                      <th className="p-4">Iniciais</th>
                      <th className="p-4">PIN</th>
                      <th className="p-4">Cargo</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Último Login</th>
                      <th className="p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCoaches.map((coach) => (
                      <CoachRow 
                        key={coach.id} 
                        coach={coach} 
                        showPins={showPins}
                        onEdit={() => setEditingCoach(coach)}
                        onToggleActive={() => toggleActive(coach)}
                        onDelete={() => deleteCoach(coach.id)}
                      />
                    ))}
                    {inactiveCoaches.length > 0 && (
                      <>
                        <tr className="bg-white/5">
                          <td colSpan={7} className="p-3 text-center text-white/40 text-sm">
                            Usuários Inativos ({inactiveCoaches.length})
                          </td>
                        </tr>
                        {inactiveCoaches.map((coach) => (
                          <CoachRow 
                            key={coach.id} 
                            coach={coach} 
                            showPins={showPins}
                            onEdit={() => setEditingCoach(coach)}
                            onToggleActive={() => toggleActive(coach)}
                            onDelete={() => deleteCoach(coach.id)}
                            isInactive
                          />
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {configLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-4 border-white/20 border-t-white rounded-full" />
                </div>
              ) : config ? (
                <>
                  {/* Mensagem de feedback */}
                  <AnimatePresence>
                    {configMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-xl border ${
                          configMessage.type === 'success'
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}
                      >
                        {configMessage.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Legenda das Prioridades v16 */}
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <h4 className="font-bold text-purple-400 mb-2">🟣 Sistema de Prioridades v16</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span>🔴🟠🟡🟢</span>
                        <span className="text-white/60">Fila regular (com timer/alertas)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🔵</span>
                        <span className="text-white/60">Veterano 180+ dias (com alertas)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>🟣</span>
                        <span className="text-purple-400">Personal (seção separada, sem alertas)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>⚫</span>
                        <span className="text-white/40">Consultoria/EVO (seção separada)</span>
                      </div>
                    </div>
                  </div>

                  {/* Seção: Tempo de Atendimento */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                      ⏱️ Tempo de Atendimento (Cronômetro)
                    </h3>
                    <p className="text-white/40 text-sm mb-6">
                      Duração do cronômetro regressivo em <strong className="text-white">SEGUNDOS</strong> quando o professor abre o card para atendimento
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {/* v16: RED, ORANGE, YELLOW, GREEN, BLUE são editáveis. PURPLE e BLACK não */}
                      {['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'BLACK'].map((priority) => {
                        const info = PRIORITY_INFO[priority];
                        // v16: Apenas PURPLE e BLACK não são editáveis (seção Personal/Consultoria)
                        const isEditable = priority !== 'PURPLE' && priority !== 'BLACK';
                        
                        return (
                          <div
                            key={priority}
                            className="bg-black/30 rounded-xl p-4 border transition-all"
                            style={{ borderColor: `${info.color}40` }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xl">{info.emoji}</span>
                              <div>
                                <p className="font-bold" style={{ color: info.color }}>{info.label}</p>
                                <p className="text-xs text-white/40">{info.description}</p>
                              </div>
                            </div>
                            
                            {isEditable ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="5"
                                  max="120"
                                  value={config.attendanceTime[priority] || 0}
                                  onChange={(e) => updateAttendanceTime(priority, parseInt(e.target.value) || 0)}
                                  className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-center font-mono text-lg"
                                />
                                <span className="text-white/40">segundos</span>
                              </div>
                            ) : (
                              <p className="text-white/30 text-sm italic">
                                {priority === 'PURPLE' ? '🟣 Seção Personal (sem timer)' : 
                                 '⚫ Seção Consultoria (sem timer)'}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seção: Intervalo de Alerta */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                      🔔 Intervalo para Novo Atendimento
                    </h3>
                    <p className="text-white/40 text-sm mb-6">
                      Tempo sem atendimento para o card começar a "gritar" pedindo atenção (timer negativo)
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {/* v16: RED, ORANGE, YELLOW, GREEN, BLUE são editáveis. PURPLE e BLACK não */}
                      {['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'BLACK'].map((priority) => {
                        const info = PRIORITY_INFO[priority];
                        // v16: Apenas PURPLE e BLACK não são editáveis (seção Personal/Consultoria)
                        const isEditable = priority !== 'PURPLE' && priority !== 'BLACK';
                        
                        return (
                          <div
                            key={priority}
                            className="bg-black/30 rounded-xl p-4 border transition-all"
                            style={{ borderColor: `${info.color}40` }}
                          >
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xl">{info.emoji}</span>
                              <div>
                                <p className="font-bold" style={{ color: info.color }}>{info.label}</p>
                                <p className="text-xs text-white/40">{info.description}</p>
                              </div>
                            </div>
                            
                            {isEditable ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="30"
                                  value={config.alertInterval[priority] || 0}
                                  onChange={(e) => updateAlertInterval(priority, parseInt(e.target.value) || 0)}
                                  className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-center font-mono text-lg"
                                />
                                <span className="text-white/40">minutos</span>
                              </div>
                            ) : (
                              <p className="text-white/30 text-sm italic">
                                {priority === 'PURPLE' ? '🟣 Seção Personal (sem alerta)' : 
                                 '⚫ Seção Consultoria (sem alerta)'}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Seção: Configurações Gerais */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                      ⚙️ Configurações Gerais
                    </h3>
                    <p className="text-white/40 text-sm mb-6">
                      Outras configurações do sistema
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Auto Checkout */}
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">🚪</span>
                          <div>
                            <p className="font-bold">Auto-Checkout</p>
                            <p className="text-xs text-white/40">Tempo máximo na academia antes de checkout automático</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="30"
                            max="180"
                            value={config.autoCheckoutMinutes}
                            onChange={(e) => updateConfig('autoCheckoutMinutes', parseInt(e.target.value) || 90)}
                            className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-center font-mono text-lg"
                          />
                          <span className="text-white/40">minutos</span>
                        </div>
                      </div>

                      {/* Retenção Crítica */}
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">⚠️</span>
                          <div>
                            <p className="font-bold">Alerta Crítico de Retenção</p>
                            <p className="text-xs text-white/40">Abaixo deste % mostra overlay de atenção</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={config.criticalRetentionThreshold}
                            onChange={(e) => updateConfig('criticalRetentionThreshold', parseInt(e.target.value) || 25)}
                            className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-center font-mono text-lg"
                          />
                          <span className="text-white/40">%</span>
                        </div>
                      </div>

                      {/* Retenção Baixa */}
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">📉</span>
                          <div>
                            <p className="font-bold">Alerta de Retenção Baixa</p>
                            <p className="text-xs text-white/40">Abaixo deste % mostra borda vermelha no card</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={config.lowRetentionThreshold}
                            onChange={(e) => updateConfig('lowRetentionThreshold', parseInt(e.target.value) || 50)}
                            className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-center font-mono text-lg"
                          />
                          <span className="text-white/40">%</span>
                        </div>
                      </div>

                      {/* Sons */}
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🔊</span>
                            <div>
                              <p className="font-bold">Sons do Sistema</p>
                              <p className="text-xs text-white/40">Habilitar sons por padrão</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateConfig('soundEnabled', !config.soundEnabled)}
                            className={`w-14 h-8 rounded-full transition-all ${
                              config.soundEnabled ? 'bg-green-500' : 'bg-white/20'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all ${
                                config.soundEnabled ? 'translate-x-7' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Vibração */}
                      <div className="bg-black/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">📳</span>
                            <div>
                              <p className="font-bold">Vibração</p>
                              <p className="text-xs text-white/40">Habilitar vibração em dispositivos móveis</p>
                            </div>
                          </div>
                          <button
                            onClick={() => updateConfig('vibrationEnabled', !config.vibrationEnabled)}
                            className={`w-14 h-8 rounded-full transition-all ${
                              config.vibrationEnabled ? 'bg-green-500' : 'bg-white/20'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all ${
                                config.vibrationEnabled ? 'translate-x-7' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botão Salvar */}
                  <div className="flex justify-end">
                    <button
                      onClick={saveConfig}
                      disabled={configSaving}
                      className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 rounded-xl font-bold text-lg transition-all flex items-center gap-2"
                    >
                      {configSaving ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          💾 Salvar Configurações
                        </>
                      )}
                    </button>
                  </div>

                  {/* SQL Info */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-400 text-sm">
                      <strong>ℹ️ Nota:</strong> As configurações são salvas na tabela <code className="bg-black/30 px-1 rounded">system_config</code>.
                      Se a tabela não existir, será mostrada uma mensagem com o SQL para criá-la.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-white/40">
                  <p>Erro ao carregar configurações</p>
                  <button
                    onClick={loadConfig}
                    className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'ambiente' && (
            <motion.div
              key="ambiente"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AdminEnvironmentConfig />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODAIS */}
      <AnimatePresence>
        {/* Modal Adicionar */}
        {showAddModal && (
          <CoachModal
            title="Adicionar Usuário"
            onClose={() => setShowAddModal(false)}
            onSave={createCoach}
          />
        )}

        {/* Modal Editar */}
        {editingCoach && (
          <CoachModal
            title="Editar Usuário"
            coach={editingCoach}
            onClose={() => setEditingCoach(null)}
            onSave={(data) => updateCoach(editingCoach.id, data)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function StatCard({ label, value, icon, color = '#FFFFFF' }: { label: string; value: number; icon: string; color?: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl" style={{ color }}>{icon}</span>
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
      </div>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config = {
    ADMIN: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Admin' },
    SUPERVISOR: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Supervisor' },
    PROFESSOR: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Professor' },
  }[role] || { bg: 'bg-white/10', text: 'text-white/60', label: role };

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function CoachRow({ 
  coach, 
  showPins, 
  onEdit, 
  onToggleActive, 
  onDelete,
  isInactive = false 
}: { 
  coach: Coach; 
  showPins: boolean; 
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  isInactive?: boolean;
}) {
  return (
    <tr className={`border-b border-white/5 hover:bg-white/5 ${isInactive ? 'opacity-50' : ''}`}>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div 
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
              coach.role === 'ADMIN' 
                ? 'bg-purple-500/20 text-purple-400' 
                : coach.role === 'SUPERVISOR'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {coach.initials}
          </div>
          <span className="font-medium">{coach.name}</span>
        </div>
      </td>
      <td className="p-4 text-white/60">{coach.initials}</td>
      <td className="p-4">
        <span className={`font-mono ${showPins ? 'text-yellow-400' : 'text-white/30'}`}>
          {showPins ? coach.pin : '••••'}
        </span>
      </td>
      <td className="p-4">
        <RoleBadge role={coach.role} />
      </td>
      <td className="p-4">
        <span className={`px-2 py-1 rounded-full text-xs ${
          coach.is_active 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {coach.is_active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="p-4 text-white/40 text-sm">
        {coach.last_login_at 
          ? new Date(coach.last_login_at).toLocaleString('pt-BR', { 
              day: '2-digit', 
              month: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          : 'Nunca'
        }
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={onToggleActive}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={coach.is_active ? 'Desativar' : 'Ativar'}
          >
            {coach.is_active ? '🔒' : '🔓'}
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
            title="Remover"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}

function CoachModal({ 
  title, 
  coach, 
  onClose, 
  onSave 
}: { 
  title: string; 
  coach?: Coach; 
  onClose: () => void; 
  onSave: (data: any) => void;
}) {
  const [name, setName] = useState(coach?.name || '');
  const [initials, setInitials] = useState(coach?.initials || '');
  const [pin, setPin] = useState(coach?.pin || '');
  const [role, setRole] = useState<'ADMIN' | 'SUPERVISOR' | 'PROFESSOR'>(coach?.role || 'PROFESSOR');

  const handleSubmit = () => {
    if (!name || !initials || !pin) return;
    onSave({ name, initials, pin, role, is_active: coach?.is_active ?? true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-white/30 outline-none"
              placeholder="Nome completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Iniciais</label>
              <input
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 3))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-white/30 outline-none uppercase"
                placeholder="XX"
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1">PIN (4 dígitos)</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-white/30 outline-none font-mono"
                placeholder="0000"
                maxLength={4}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Cargo</label>
            <div className="grid grid-cols-3 gap-2">
              {(['PROFESSOR', 'SUPERVISOR', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    role === r
                      ? r === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                        : r === 'SUPERVISOR'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-white/5 text-white/40 border border-transparent'
                  }`}
                >
                  {r === 'ADMIN' ? 'Admin' : r === 'SUPERVISOR' ? 'Supervisor' : 'Professor'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || !initials || pin.length !== 4}
            className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-500/30 rounded-xl font-medium transition-colors"
          >
            Salvar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
