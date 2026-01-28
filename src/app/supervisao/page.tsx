'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase, getCoachSession } from '@/lib/supabase';
import { 
  COORDINATION_REQUEST_TYPES, 
  REQUEST_STATUS, 
  RESOLUTION_TYPES,
  URGENCY_LEVELS,
  ACTION_TYPES,
  PRIORITY_CONFIG,
  getPhaseLabel,
} from '@/lib/constants';
import ActivityTimeline from '../components/ActivityTimeline';

// ============================================================================
// TYPES
// ============================================================================

interface CoordinationRequest {
  id: string;
  coach_id: string;
  coach_name: string;
  member_name: string;
  member_evo_id: number | null;
  queue_id: string | null;
  request_type: string;
  observation: string | null;
  member_snapshot: MemberSnapshot;
  status: string;
  urgency: string;
  viewed_at: string | null;
  viewed_by_name: string | null;
  resolved_at: string | null;
  resolved_by_name: string | null;
  resolution_type: string | null;
  resolution_notes: string | null;
  action_taken: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface MemberSnapshot {
  evoMemberId?: number | null; // ID do membro no EVO
  daysAsMember: number;
  phase: string;
  retentionScore: number;
  hasFicha: boolean;
  fichaVencida: boolean;
  fichaValidadeDate?: string;
  hasAvaliacao: boolean;
  avaliacaoVencida: boolean;
  avaliacaoValidadeDate?: string;
  totalWorkouts: number;
  completionRate: number;
  checkInTime: string;
  priority: string;
  tags: string[];
  workoutName?: string;
  workoutLetter?: string;
  workoutId?: number;
}

// ============================================================================
// PORTAL - Renderiza modais fora da hierarquia do DOM
// ============================================================================

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  if (!mounted) return null;
  
  return createPortal(children, document.body);
}

interface DefaultWorkout {
  idTreino: number;
  nomeTreino: string;
  series?: { nome: string; itens?: unknown[] }[];
}

interface Coach {
  id: string;
  name: string;
  is_supervisor: boolean;
  evo_employee_id?: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SupervisionPage() {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<CoordinationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CoordinationRequest | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'timeline'>('requests');
  
  // EVO Treinos
  const [defaultWorkouts, setDefaultWorkouts] = useState<DefaultWorkout[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // EVO Agendamentos (Avaliação Física)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentActivities, setAppointmentActivities] = useState<Array<{ idActivity: number; name: string; description?: string; duration?: number }>>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Verificar sessão
  useEffect(() => {
    const checkSession = async () => {
      const session = await getCoachSession();
      if (!session) {
        window.location.href = '/';
        return;
      }
      
      const { data: coachData } = await supabase
        .from('coaches')
        .select('id, name, is_supervisor, evo_employee_id')
        .eq('id', session.id)
        .single();
      
      if (!coachData?.is_supervisor) {
        window.location.href = '/';
        return;
      }
      
      setCoach(coachData);
      setIsLoading(false);
    };
    
    checkSession();
  }, []);

  // Carregar pendências
  const loadRequests = useCallback(async () => {
    const { data } = await supabase
      .from('coordination_requests')
      .select('*')
      .in('status', filter === 'ALL' ? ['PENDING', 'VIEWED', 'IN_PROGRESS'] : [filter])
      .order('created_at', { ascending: false }); // Mais recentes primeiro
    
    if (data) {
      // Ordenar APENAS por data - mais recentes primeiro
      setRequests(data);
    }
  }, [filter]);

  // Carregar treinos padrão do EVO
  const loadDefaultWorkouts = useCallback(async () => {
    if (defaultWorkouts.length > 0) return;
    
    setLoadingWorkouts(true);
    console.log('[Supervisão] Carregando treinos padrão...');
    
    try {
      const response = await fetch('/api/evo/workout');
      const result = await response.json();
      
      console.log('[Supervisão] Resposta da API:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        setDefaultWorkouts(result.data);
        console.log(`[Supervisão] ✅ ${result.data.length} treinos carregados`);
      } else {
        console.warn('[Supervisão] ⚠️ Nenhum treino padrão encontrado:', result.error || 'Lista vazia');
      }
    } catch (error) {
      console.error('[Supervisão] ❌ Erro ao carregar treinos:', error);
    }
    setLoadingWorkouts(false);
  }, [defaultWorkouts.length]);

  // Carregar atividades de agendamento do EVO
  const loadAppointmentActivities = useCallback(async () => {
    if (appointmentActivities.length > 0) return;
    
    setLoadingAppointments(true);
    console.log('[Supervisão] Carregando atividades de agendamento...');
    
    try {
      const response = await fetch('/api/evo/appointment');
      const result = await response.json();
      
      console.log('[Supervisão] Resposta da API appointments:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        setAppointmentActivities(result.data);
        console.log(`[Supervisão] ✅ ${result.data.length} atividades carregadas`);
      } else {
        console.warn('[Supervisão] ⚠️ Nenhuma atividade encontrada:', result.error || 'Lista vazia');
      }
    } catch (error) {
      console.error('[Supervisão] ❌ Erro ao carregar atividades:', error);
    }
    setLoadingAppointments(false);
  }, [appointmentActivities.length]);

  useEffect(() => {
    if (!coach) return;
    loadRequests();
    loadDefaultWorkouts();
    loadAppointmentActivities();
    
    const interval = setInterval(loadRequests, 10000);
    return () => clearInterval(interval);
  }, [coach, loadRequests, loadDefaultWorkouts, loadAppointmentActivities]);

  // Debug: Log do modal de avaliação
  useEffect(() => {
    if (showAppointmentModal) {
      console.log('[Supervisão] Modal de avaliação aberto');
      console.log('[Supervisão] selectedRequest:', selectedRequest?.id, selectedRequest?.member_name);
      console.log('[Supervisão] appointmentActivities:', appointmentActivities.length);
      console.log('[Supervisão] loadingAppointments:', loadingAppointments);
    }
  }, [showAppointmentModal, selectedRequest, appointmentActivities, loadingAppointments]);

  // Marcar como visualizado
  const markAsViewed = async (request: CoordinationRequest) => {
    if (!coach || request.viewed_at) return;
    
    await supabase.rpc('mark_request_viewed', {
      p_request_id: request.id,
      p_supervisor_id: coach.id,
      p_supervisor_name: coach.name,
    });
    
    loadRequests();
  };

  const handleSelectRequest = (request: CoordinationRequest) => {
    setSelectedRequest(request);
    setActionMessage(null);
    markAsViewed(request);
  };

  // ==================== AÇÕES EVO ====================
  
  // Vincular treino padrão
  const linkWorkout = async (workoutId: number, workoutName: string) => {
    // Tentar pegar o ID EVO do registro ou do snapshot
    const memberEvoId = selectedRequest?.member_evo_id || selectedRequest?.member_snapshot?.evoMemberId;
    
    if (!memberEvoId || !coach) {
      setActionMessage({ type: 'error', text: '❌ Aluno sem ID EVO cadastrado' });
      return;
    }
    
    setActionLoading('link');
    setActionMessage(null);
    
    try {
      const response = await fetch('/api/evo/workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link',
          sourceWorkout: workoutId,
          idClient: memberEvoId,
          idPrescriptionEmployee: coach.evo_employee_id || 222, // ID EVO do supervisor (fallback: Igor)
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setActionMessage({ type: 'success', text: `✅ Treino "${workoutName}" vinculado com sucesso!` });
        setShowWorkoutModal(false);
        
        // Auto-resolver a solicitação
        await resolveWithAction('LINKED_WORKOUT', { workoutId, workoutName });
      } else {
        setActionMessage({ type: 'error', text: `❌ Erro: ${result.error}` });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: `❌ Erro de conexão` });
    }
    
    setActionLoading(null);
  };

  // Renovar validade da ficha
  const renewWorkout = async () => {
    const workoutId = selectedRequest?.member_snapshot?.workoutId;
    const memberEvoId = selectedRequest?.member_evo_id || selectedRequest?.member_snapshot?.evoMemberId;
    
    if (!workoutId || !coach) {
      setActionMessage({ type: 'error', text: '❌ Aluno não possui treino para renovar' });
      return;
    }
    
    if (!memberEvoId) {
      setActionMessage({ type: 'error', text: '❌ Aluno sem ID EVO para renovar treino' });
      return;
    }
    
    setActionLoading('renew');
    setActionMessage(null);
    
    try {
      const response = await fetch('/api/evo/workout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'renew',
          idWorkout: workoutId,
          idClient: memberEvoId,
          idPrescriptionEmployee: coach.evo_employee_id || 222,
          daysToAdd: 30,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setActionMessage({ type: 'success', text: `✅ Treino renovado com sucesso!` });
        
        // Auto-resolver
        await resolveWithAction('RENEWED_WORKOUT', { workoutId, memberEvoId, daysAdded: 30 });
      } else {
        setActionMessage({ type: 'error', text: `❌ Erro: ${result.error}` });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: `❌ Erro de conexão` });
    }
    
    setActionLoading(null);
  };

  // Resolver automaticamente após ação
  const resolveWithAction = async (actionType: string, actionDetails: Record<string, unknown>) => {
    if (!selectedRequest || !coach) return;
    
    await supabase.rpc('resolve_coordination_request', {
      p_request_id: selectedRequest.id,
      p_supervisor_id: coach.id,
      p_supervisor_name: coach.name,
      p_resolution_type: 'COMPLETED',
      p_resolution_notes: `Ação automática: ${actionType}`,
      p_action_taken: { type: actionType, ...actionDetails, timestamp: new Date().toISOString() },
    });
    
    loadRequests();
    setSelectedRequest(null);
  };

  const formatTimeAgo = (dateStr: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const [isResyncing, setIsResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // Função de re-sincronização
  const handleResync = async () => {
    if (isResyncing) return;
    
    setIsResyncing(true);
    setResyncResult(null);
    
    try {
      // Usar GET com execute=true para executar o resync corrigido
      const response = await fetch('/api/evo/resync?execute=true', { method: 'GET' });
      const data = await response.json();
      
      setResyncResult({
        success: data.success,
        message: data.message || `Atualizados: ${data.updated || 0}, Falhas: ${data.failed || 0}`,
      });
      
      // Limpar mensagem após 8 segundos (mais tempo para ler)
      setTimeout(() => setResyncResult(null), 8000);
    } catch (error) {
      setResyncResult({
        success: false,
        message: 'Erro de conexão',
      });
    } finally {
      setIsResyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  if (!coach) return null;

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const criticalCount = requests.filter(r => r.urgency === 'CRITICAL').length;

  return (
    <div className="h-screen h-[100dvh] w-screen bg-black text-white flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="shrink-0 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/60 hover:text-white transition-colors">← Dashboard</Link>
            <h1 className="text-xl font-bold">📋 Central de Supervisão</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Botão de Re-sincronização */}
            <button
              onClick={handleResync}
              disabled={isResyncing}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isResyncing 
                  ? 'bg-blue-500/20 text-blue-300 cursor-wait' 
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
              title="Re-sincronizar dados dos alunos na fila com o EVO"
            >
              {isResyncing ? (
                <>
                  <span className="animate-spin">🔄</span>
                  Sincronizando...
                </>
              ) : (
                <>🔄 Re-sincronizar Fila</>
              )}
            </button>
            
            {/* Resultado da sincronização */}
            {resyncResult && (
              <span className={`px-2 py-1 rounded-lg text-sm ${
                resyncResult.success 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {resyncResult.success ? '✅' : '❌'} {resyncResult.message}
              </span>
            )}
            
            {criticalCount > 0 && (
              <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 font-bold animate-pulse">
                🔴 {criticalCount} críticos
              </span>
            )}
            <span className="text-white/40">{pendingCount} pendentes</span>
            <span className="text-white/60">👤 {coach.name}</span>
          </div>
        </div>
        
        {/* TABS */}
        <div className="px-6 pb-2 flex gap-2">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'requests' 
                ? 'bg-purple-500 text-white' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            🔔 Notificações
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'timeline' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            📊 Timeline dos Professores
          </button>
        </div>
      </header>

      {/* CONTENT */}
      {activeTab === 'requests' ? (
      <div className="flex-1 flex min-h-0">
        {/* LISTA */}
        <div className="w-[400px] border-r border-white/10 flex flex-col">
          <div className="p-4 border-b border-white/10">
            <div className="flex gap-2 flex-wrap">
              {['ALL', 'PENDING', 'VIEWED', 'IN_PROGRESS'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filter === f ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {f === 'ALL' ? 'Todos' : REQUEST_STATUS[f as keyof typeof REQUEST_STATUS]?.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {requests.map((request) => {
                const requestType = COORDINATION_REQUEST_TYPES.find(t => t.id === request.request_type);
                const urgency = URGENCY_LEVELS[request.urgency as keyof typeof URGENCY_LEVELS];
                const status = REQUEST_STATUS[request.status as keyof typeof REQUEST_STATUS];
                const isSelected = selectedRequest?.id === request.id;
                
                return (
                  <motion.div
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    onClick={() => handleSelectRequest(request)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    } ${request.urgency === 'CRITICAL' ? 'animate-pulse' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: urgency?.color }} />
                        <span className="font-bold">{request.member_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-white/40">{formatTimeAgo(request.created_at)}</span>
                        <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${status?.color}20`, color: status?.color }}>
                          {status?.icon}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm mb-2 px-2 py-1 rounded-lg w-fit"
                      style={{ backgroundColor: `${requestType?.color}20`, color: requestType?.color }}>
                      <span>{requestType?.icon}</span>
                      <span className="font-medium">{requestType?.label}</span>
                    </div>
                    
                    {request.observation && (
                      <p className="text-xs text-white/40 truncate">💬 {request.observation}</p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                      <span>Por: {request.coach_name}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {requests.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-white/30">
                <span className="text-4xl mb-2">✨</span>
                <p>Nenhuma pendência</p>
              </div>
            )}
          </div>
        </div>

        {/* DETALHES */}
        <div className="flex-1 overflow-y-auto">
          {selectedRequest ? (
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold">{selectedRequest.member_name}</h2>
                  <p className="text-white/40 mt-1">
                    ID EVO: {selectedRequest.member_evo_id || selectedRequest.member_snapshot?.evoMemberId || 'N/A'} • Solicitado por {selectedRequest.coach_name}
                  </p>
                </div>
                
                {selectedRequest.status !== 'RESOLVED' && (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-xl font-medium"
                  >
                    ✅ Resolver Manualmente
                  </button>
                )}
              </div>

              {/* Mensagem de Ação */}
              <AnimatePresence>
                {actionMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-4 rounded-xl mb-6 ${
                      actionMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {actionMessage.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Observação */}
              {selectedRequest.observation && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-bold text-yellow-400 mb-2">💬 Observação do Professor</h3>
                  <p className="text-white/80">{selectedRequest.observation}</p>
                </div>
              )}

              {/* ====== AÇÕES RÁPIDAS EVO ====== */}
              {selectedRequest.status !== 'RESOLVED' && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-bold text-blue-400 mb-4">⚡ AÇÕES RÁPIDAS (EVO)</h3>
                  
                  {!(selectedRequest.member_evo_id || selectedRequest.member_snapshot?.evoMemberId) && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm">
                      <span className="text-red-400">⚠️ Aluno sem ID EVO cadastrado. Ações limitadas.</span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* Vincular Treino */}
                    <button
                      onClick={() => setShowWorkoutModal(true)}
                      disabled={actionLoading !== null || !(selectedRequest.member_evo_id || selectedRequest.member_snapshot?.evoMemberId)}
                      className="p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-2xl">📋</span>
                      <p className="font-bold text-green-400 mt-2">Vincular Treino Padrão</p>
                      <p className="text-xs text-white/40 mt-1">
                        {(selectedRequest.member_evo_id || selectedRequest.member_snapshot?.evoMemberId) ? 'Selecionar e atribuir ficha' : 'Requer ID EVO'}
                      </p>
                    </button>

                    {/* Agendar Avaliação Física */}
                    <button
                      onClick={() => {
                        console.log('[Supervisão] Clicou em Agendar Avaliação');
                        console.log('[Supervisão] selectedRequest:', selectedRequest?.id);
                        console.log('[Supervisão] evoMemberId:', selectedRequest?.member_evo_id || selectedRequest?.member_snapshot?.evoMemberId);
                        console.log('[Supervisão] activities:', appointmentActivities.length);
                        setShowAppointmentModal(true);
                      }}
                      disabled={actionLoading !== null || !(selectedRequest.member_evo_id || selectedRequest.member_snapshot?.evoMemberId)}
                      className="p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-2xl">📅</span>
                      <p className="font-bold text-purple-400 mt-2">Agendar Avaliação</p>
                      <p className="text-xs text-white/40 mt-1">
                        {(selectedRequest.member_evo_id || selectedRequest.member_snapshot?.evoMemberId) ? 'Marcar avaliação física' : 'Requer ID EVO'}
                      </p>
                    </button>

                    {/* Renovar Validade */}
                    <button
                      onClick={renewWorkout}
                      disabled={actionLoading !== null || !selectedRequest.member_snapshot?.workoutId || !(selectedRequest.member_evo_id || selectedRequest.member_snapshot?.evoMemberId)}
                      className="p-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === 'renew' ? (
                        <span className="text-2xl animate-spin">⏳</span>
                      ) : (
                        <span className="text-2xl">🔄</span>
                      )}
                      <p className="font-bold text-orange-400 mt-2">Renovar Treino</p>
                      <p className="text-xs text-white/40 mt-1">
                        {!selectedRequest.member_snapshot?.workoutId 
                          ? 'Sem treino ativo' 
                          : !(selectedRequest.member_evo_id || selectedRequest.member_snapshot?.evoMemberId)
                            ? 'Requer ID EVO'
                            : 'Re-vincular mesmo treino'}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Grid de dados */}
              <div className="grid grid-cols-2 gap-6">
                {/* Dados do Aluno */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-bold text-white/40 mb-4">📊 DADOS DO ALUNO</h3>
                  <div className="space-y-3">
                    <DataRow label="Dias como membro" value={`${selectedRequest.member_snapshot.daysAsMember} dias`} />
                    <DataRow label="Fase" value={getPhaseLabel(selectedRequest.member_snapshot.daysAsMember)} />
                    <DataRow 
                      label="Retenção" 
                      value={`${selectedRequest.member_snapshot.retentionScore}%`}
                      color={selectedRequest.member_snapshot.retentionScore < 50 ? '#FF3B30' : '#30D158'}
                    />
                    <DataRow label="Total treinos" value={selectedRequest.member_snapshot.totalWorkouts} />
                  </div>
                </div>

                {/* Status Ficha */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-bold text-white/40 mb-4">📋 FICHA</h3>
                  <div 
                    className="p-3 rounded-lg"
                    style={{ 
                      backgroundColor: !selectedRequest.member_snapshot.hasFicha ? '#FF3B3020' : 
                        selectedRequest.member_snapshot.fichaVencida ? '#FF950020' : '#30D15820',
                    }}
                  >
                    <span className="font-medium">
                      {!selectedRequest.member_snapshot.hasFicha ? '❌ SEM FICHA' : 
                        selectedRequest.member_snapshot.fichaVencida ? '⚠️ FICHA VENCIDA' : '✅ Ficha OK'}
                    </span>
                    {selectedRequest.member_snapshot.workoutName && (
                      <p className="text-sm text-white/60 mt-1">{selectedRequest.member_snapshot.workoutName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Resolução existente */}
              {selectedRequest.resolved_at && (
                <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-green-400 mb-2">✅ RESOLUÇÃO</h3>
                  <p className="text-white/80">{selectedRequest.resolution_notes}</p>
                  <p className="text-xs text-white/40 mt-2">
                    Por {selectedRequest.resolved_by_name} em {new Date(selectedRequest.resolved_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-white/30">
              <span className="text-6xl mb-4">📋</span>
              <p className="text-xl">Selecione uma solicitação</p>
            </div>
          )}
        </div>
      </div>
      ) : (
        /* TIMELINE TAB */
        <div className="flex-1 overflow-y-auto p-6">
          <ActivityTimeline 
            autoRefresh={true}
            refreshInterval={15000}
            maxItems={100}
            showSummary={true}
          />
        </div>
      )}

      {/* Modal Seleção de Treino */}
      <Portal>
        <AnimatePresence>
          {showWorkoutModal && selectedRequest && (
            <WorkoutSelectorModal
              workouts={defaultWorkouts}
              loading={loadingWorkouts}
              onSelect={(w) => linkWorkout(w.idTreino, w.nomeTreino)}
              onClose={() => setShowWorkoutModal(false)}
              actionLoading={actionLoading === 'link'}
            />
          )}
        </AnimatePresence>
      </Portal>

      {/* Modal Agendar Avaliação */}
      <Portal>
        <AnimatePresence>
          {showAppointmentModal && selectedRequest && (
            <AppointmentModal
              activities={appointmentActivities}
              loading={loadingAppointments}
              memberEvoId={selectedRequest.member_evo_id || selectedRequest.member_snapshot?.evoMemberId}
              memberName={selectedRequest.member_name}
              onClose={() => setShowAppointmentModal(false)}
              onSuccess={async (activityName) => {
                setShowAppointmentModal(false);
                setActionMessage({ type: 'success', text: `✅ ${activityName} agendada com sucesso!` });
                await resolveWithAction('SCHEDULED_EVALUATION', { activityName });
              }}
            />
          )}
        </AnimatePresence>
      </Portal>

      {/* Modal Resolver Manual */}
      <Portal>
        <AnimatePresence>
          {showResolveModal && selectedRequest && coach && (
            <ResolveModal
              request={selectedRequest}
              coach={coach}
              onClose={() => setShowResolveModal(false)}
              onResolved={() => {
                setShowResolveModal(false);
                setSelectedRequest(null);
                loadRequests();
              }}
            />
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}

// ============================================================================
// WORKOUT SELECTOR MODAL
// ============================================================================

function WorkoutSelectorModal({
  workouts,
  loading,
  onSelect,
  onClose,
  actionLoading,
}: {
  workouts: DefaultWorkout[];
  loading: boolean;
  onSelect: (workout: DefaultWorkout) => void;
  onClose: () => void;
  actionLoading: boolean;
}) {
  const [search, setSearch] = useState('');
  
  const filtered = workouts.filter(w => 
    w.nomeTreino.toLowerCase().includes(search.toLowerCase())
  );

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
        className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-white/10 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold">📋 Selecionar Treino Padrão</h2>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar treino..."
            className="w-full mt-3 p-3 bg-white/5 border border-white/10 rounded-xl text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-white/40">Carregando treinos...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-white/40">Nenhum treino encontrado</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(workout => (
                <button
                  key={workout.idTreino}
                  onClick={() => onSelect(workout)}
                  disabled={actionLoading}
                  className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-all disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{workout.nomeTreino}</p>
                      <p className="text-xs text-white/40 mt-1">
                        ID: {workout.idTreino} • {workout.series?.length || 0} séries
                      </p>
                    </div>
                    {actionLoading ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <span className="text-green-400">→</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button onClick={onClose} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium">
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// APPOINTMENT MODAL - Agendar Avaliação Física
// ============================================================================

function AppointmentModal({
  activities,
  loading,
  memberEvoId,
  memberName,
  onClose,
  onSuccess,
}: {
  activities: Array<{ idActivity: number; name: string; description?: string; duration?: number }>;
  loading: boolean;
  memberEvoId?: number | null;
  memberName: string;
  onClose: () => void;
  onSuccess: (activityName: string) => void;
}) {
  const [selectedActivity, setSelectedActivity] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<Array<{
    idSession: number;
    date: string;
    startTime: string;
    endTime: string;
    employeeName?: string;
    spotsAvailable: number;
  }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar horários disponíveis quando selecionar atividade e data
  const loadSlots = async () => {
    if (!selectedActivity || !selectedDate) return;
    
    setLoadingSlots(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/evo/appointment?action=availability&idActivity=${selectedActivity}&date=${selectedDate}`
      );
      const result = await response.json();
      
      if (result.success && result.data) {
        setAvailableSlots(result.data);
        if (result.data.length === 0) {
          setError('Nenhum horário disponível para esta data');
        }
      } else {
        setError(result.error || 'Erro ao buscar horários');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
    setLoadingSlots(false);
  };

  // Agendar
  const handleSchedule = async () => {
    if (!memberEvoId || !selectedSlot) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/evo/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idMember: memberEvoId,
          idSession: selectedSlot,
          idActivity: selectedActivity,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const activity = activities.find(a => a.idActivity === selectedActivity);
        onSuccess(activity?.name || 'Avaliação');
      } else {
        setError(result.error || 'Erro ao agendar');
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('Erro de conexão');
      setIsSubmitting(false);
    }
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
        className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-white/10 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold">📅 Agendar Avaliação Física</h2>
          <p className="text-sm text-white/40 mt-1">Aluno: {memberName}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Erro */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {/* Selecionar Atividade */}
          <div>
            <label className="text-sm text-white/60 block mb-2">Tipo de Avaliação *</label>
            {loading ? (
              <div className="text-center py-4 text-white/40">Carregando atividades...</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-4 text-white/40">
                Nenhuma atividade disponível no EVO.
                <br />
                <span className="text-xs">Verifique a configuração de agendamentos no sistema.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {activities.map((activity) => (
                  <button
                    key={activity.idActivity}
                    onClick={() => {
                      setSelectedActivity(activity.idActivity);
                      setSelectedSlot(null);
                      setAvailableSlots([]);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedActivity === activity.idActivity
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <p className="font-medium">{activity.name}</p>
                    {activity.duration && (
                      <p className="text-xs text-white/40">{activity.duration} min</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selecionar Data */}
          {selectedActivity && (
            <div>
              <label className="text-sm text-white/60 block mb-2">Data *</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                    setAvailableSlots([]);
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-white"
                />
                <button
                  onClick={loadSlots}
                  disabled={loadingSlots}
                  className="px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl font-medium"
                >
                  {loadingSlots ? '...' : 'Buscar'}
                </button>
              </div>
            </div>
          )}

          {/* Horários Disponíveis */}
          {availableSlots.length > 0 && (
            <div>
              <label className="text-sm text-white/60 block mb-2">
                Horários Disponíveis ({availableSlots.length})
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.idSession}
                    onClick={() => setSelectedSlot(slot.idSession)}
                    disabled={slot.spotsAvailable === 0}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedSlot === slot.idSession
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : slot.spotsAvailable === 0
                          ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <p className="font-medium">{slot.startTime}</p>
                    {slot.employeeName && (
                      <p className="text-xs text-white/40">{slot.employeeName}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensagem quando não encontrar horários da API */}
          {selectedActivity && availableSlots.length === 0 && !loadingSlots && !error && (
            <div className="text-center py-4 text-white/40 text-sm">
              Clique em &quot;Buscar&quot; para ver os horários disponíveis
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex gap-2">
          <button 
            onClick={onClose} 
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSchedule}
            disabled={!selectedSlot || isSubmitting}
            className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium"
          >
            {isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// RESOLVE MODAL
// ============================================================================

function ResolveModal({
  request,
  coach,
  onClose,
  onResolved,
}: {
  request: CoordinationRequest;
  coach: Coach;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [resolutionType, setResolutionType] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!resolutionType) return;
    setIsSubmitting(true);

    await supabase.rpc('resolve_coordination_request', {
      p_request_id: request.id,
      p_supervisor_id: coach.id,
      p_supervisor_name: coach.name,
      p_resolution_type: resolutionType,
      p_resolution_notes: notes,
      p_action_taken: { type: 'MANUAL', timestamp: new Date().toISOString() },
    });
    
    onResolved();
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
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold">✅ Resolver Solicitação</h2>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm text-white/60 block mb-2">Tipo de Resolução *</label>
            <div className="grid grid-cols-2 gap-2">
              {RESOLUTION_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setResolutionType(type.id)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    resolutionType === type.id ? 'ring-2 ring-white/30' : ''
                  }`}
                  style={{ backgroundColor: `${type.color}15`, border: `1px solid ${type.color}30` }}
                >
                  <span className="text-lg">{type.icon}</span>
                  <p className="font-medium mt-1" style={{ color: type.color }}>{type.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60 block mb-2">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="O que foi feito..."
              rows={3}
              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!resolutionType || isSubmitting}
            className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-xl font-medium"
          >
            {isSubmitting ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function DataRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/40 text-sm">{label}</span>
      <span className="font-medium" style={{ color }}>{value}</span>
    </div>
  );
}
