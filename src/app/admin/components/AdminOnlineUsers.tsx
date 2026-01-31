// ============================================================================
// CAMINHO: src/app/admin/components/AdminOnlineUsers.tsx
// ============================================================================
// Componente para admin visualizar e gerenciar usuários online
// - Lista todos os usuários logados
// - Permite forçar logout (apenas admin)
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface OnlineUser {
  coach_id: string;
  coach_name: string;
  role: string;
  status: string;
  is_on_floor: boolean;
  started_at: string;
  last_activity_at: string;
}

interface AdminOnlineUsersProps {
  adminId: string;
  adminName: string;
}

export default function AdminOnlineUsers({ adminId, adminName }: AdminOnlineUsersProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forceLogoutTarget, setForceLogoutTarget] = useState<OnlineUser | null>(null);
  const [logoutReason, setLogoutReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar usuários online
  const loadOnlineUsers = useCallback(async () => {
    try {
      // FONTE PRINCIPAL: Usar RPC get_all_online_users (mesma que o painel Usuários Online usa)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_online_users');
      
      if (!rpcError && rpcData && rpcData.coaches && rpcData.coaches.length > 0) {
        // Converter para o formato esperado
        // IMPORTANTE: O campo correto é 'odrinUserId' (ID do coach na tabela coaches)
        const users: OnlineUser[] = rpcData.coaches.map((c: any) => ({
          coach_id: c.odrinUserId || c.coach_id || c.id,  // odrinUserId é o ID real do coach
          coach_name: c.name,
          role: c.userType || 'PROFESSOR',
          status: c.status || 'ACTIVE',
          is_on_floor: c.isOnFloor !== false,
          started_at: c.startedAt || new Date().toISOString(),
          last_activity_at: c.lastActivityAt || new Date().toISOString()
        }));
        
        setOnlineUsers(users);
        console.log('[AdminOnline] ✅ Carregado via RPC:', users.length, 'usuários');
        console.log('[AdminOnline] IDs:', users.map(u => `${u.coach_name}=${u.coach_id}`).join(', '));
        setLoading(false);
        return;
      }
      
      console.log('[AdminOnline] RPC falhou, tentando coach_sessions...', rpcError);
      
      // FALLBACK: Buscar de coach_sessions (sem filtro de tempo)
      const { data, error } = await supabase
        .from('coach_sessions')
        .select('*')
        .in('status', ['ACTIVE', 'PAUSED'])
        .is('ended_at', null)  // Sessão não encerrada
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar usuários online:', error);
        // Fallback: usar activity_log
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const { data: logData } = await supabase
          .from('coach_activity_log')
          .select('coach_id, coach_name, event_type, created_at')
          .in('event_type', ['SESSION_START', 'SESSION_END'])
          .gte('created_at', thirtyMinutesAgo)
          .order('created_at', { ascending: false });

        if (logData) {
          // Agrupar por coach
          const coachStatus: Record<string, OnlineUser> = {};
          logData.forEach(log => {
            if (!coachStatus[log.coach_id] && log.event_type === 'SESSION_START') {
              coachStatus[log.coach_id] = {
                coach_id: log.coach_id,
                coach_name: log.coach_name,
                role: 'PROFESSOR',
                status: 'ACTIVE',
                is_on_floor: true,
                started_at: log.created_at,
                last_activity_at: log.created_at
              };
            } else if (coachStatus[log.coach_id] && log.event_type === 'SESSION_END') {
              delete coachStatus[log.coach_id];
            }
          });
          setOnlineUsers(Object.values(coachStatus));
        }
      } else {
        setOnlineUsers(data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar online:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOnlineUsers();
    const interval = setInterval(loadOnlineUsers, 10000); // Atualiza a cada 10s
    return () => clearInterval(interval);
  }, [loadOnlineUsers]);

  // Forçar logout
  const handleForceLogout = async () => {
    if (!forceLogoutTarget) return;
    
    setProcessing(true);
    
    const requestBody = {
      targetCoachId: forceLogoutTarget.coach_id,
      adminCoachId: adminId,
      reason: logoutReason || 'Logout forçado pelo administrador'
    };
    
    console.log('[ForceLogout] Enviando requisição:', requestBody);
    
    try {
      const response = await fetch('/api/admin/force-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('[ForceLogout] Response status:', response.status);
      
      const result = await response.json();
      console.log('[ForceLogout] Response body:', result);

      if (result.success) {
        setMessage({ type: 'success', text: `Logout de ${forceLogoutTarget.coach_name} realizado com sucesso!` });
        setForceLogoutTarget(null);
        setLogoutReason('');
        
        // CORREÇÃO: Aguardar um momento antes de recarregar para dar tempo do banco atualizar
        setTimeout(() => {
          loadOnlineUsers();
        }, 500);
        
        // Segundo reload após 2 segundos para garantir
        setTimeout(() => {
          loadOnlineUsers();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Erro ao forçar logout' });
      }
    } catch (err) {
      console.error('[ForceLogout] Erro:', err);
      setMessage({ type: 'error', text: 'Erro de conexão: ' + String(err) });
    } finally {
      setProcessing(false);
    }
  };

  // Tempo desde login
  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  // Cor do status
  const getStatusColor = (status: string, isOnFloor: boolean) => {
    if (status === 'PAUSED') return 'bg-yellow-500';
    if (isOnFloor) return 'bg-green-500';
    return 'bg-gray-500';
  };

  // Cor do role
  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'SUPERVISOR': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🟢</span>
            Usuários Online
          </h2>
          <p className="text-white/40 text-sm mt-1">
            {onlineUsers.length} usuário(s) logado(s) no momento
          </p>
        </div>
        <button
          onClick={loadOnlineUsers}
          disabled={loading}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <span>🔄</span>
          )}
          Atualizar
        </button>
      </div>

      {/* Mensagem */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl ${
              message.type === 'success' 
                ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                : 'bg-red-500/20 border border-red-500/30 text-red-400'
            }`}
          >
            {message.text}
            <button 
              onClick={() => setMessage(null)}
              className="float-right hover:opacity-70"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de usuários */}
      {loading ? (
        <div className="text-center py-12 text-white/40">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          Carregando usuários online...
        </div>
      ) : onlineUsers.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <div className="text-4xl mb-4">😴</div>
          <p className="text-white/40">Nenhum usuário online no momento</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {onlineUsers.map(user => (
            <motion.div
              key={user.coach_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center gap-4"
            >
              {/* Avatar e status */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold">
                  {user.coach_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-zinc-900 ${getStatusColor(user.status, user.is_on_floor)}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg truncate">{user.coach_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleStyle(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/40 mt-1">
                  <span className="flex items-center gap-1">
                    <span>⏱️</span>
                    Logado há {getTimeSince(user.started_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    {user.is_on_floor ? (
                      <>
                        <span className="text-green-400">●</span>
                        No salão
                      </>
                    ) : (
                      <>
                        <span className="text-gray-400">●</span>
                        Fora do salão
                      </>
                    )}
                  </span>
                  {user.status === 'PAUSED' && (
                    <span className="text-yellow-400">⏸️ Pausado</span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2">
                {/* Não permitir deslogar a si mesmo */}
                {user.coach_id !== adminId ? (
                  <button
                    onClick={() => setForceLogoutTarget(user)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2 border border-red-500/30"
                  >
                    <span>🚪</span>
                    Forçar Logout
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-white/5 text-white/30 rounded-lg text-sm">
                    (Você)
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de confirmação de logout */}
      <AnimatePresence>
        {forceLogoutTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => !processing && setForceLogoutTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚪</span>
                </div>
                <h3 className="text-xl font-bold">Forçar Logout</h3>
                <p className="text-white/60 mt-2">
                  Tem certeza que deseja desconectar <span className="text-white font-medium">{forceLogoutTarget.coach_name}</span>?
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-white/60 mb-2">
                  Motivo (opcional)
                </label>
                <input
                  type="text"
                  value={logoutReason}
                  onChange={e => setLogoutReason(e.target.value)}
                  placeholder="Ex: Fim do expediente, troca de turno..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  disabled={processing}
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-yellow-400/80">
                  ⚠️ O usuário será desconectado imediatamente e precisará fazer login novamente para continuar usando o sistema.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setForceLogoutTarget(null);
                    setLogoutReason('');
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleForceLogout}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Processando...
                    </>
                  ) : (
                    <>
                      <span>🚪</span>
                      Confirmar Logout
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h4 className="font-medium text-blue-400 mb-2">ℹ️ Informações</h4>
        <ul className="text-sm text-white/60 space-y-1">
          <li>• Usuários inativos por mais de 30 minutos são removidos automaticamente</li>
          <li>• O logout forçado desconecta o usuário imediatamente</li>
          <li>• Usuários que fecham o navegador são deslogados automaticamente</li>
          <li>• A lista atualiza a cada 10 segundos</li>
        </ul>
      </div>
    </div>
  );
}
