// ============================================================================
// CAMINHO: src/app/consultoras/page.tsx
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase, getCoachSession } from '@/lib/supabase';
import { 
  CheckCircle, 
  Clock, 
  User, 
  Calendar, 
  RefreshCw,
  AlertTriangle,
  LogOut,
  CheckSquare,
  Square,
  Filter,
  ArrowLeft
} from 'lucide-react';

interface PendingEntry {
  id: string;
  evoMemberId: number;
  memberName: string;
  reason: string;
  createdAt: string;
  createdByCoachName: string;
  processed: boolean;
  processedAt: string | null;
  processedBy: string | null;
  evoLiberationId: number | null;
  metadata: any;
}

interface UserSession {
  id: number | string;
  name: string;
  role: string;
  isCoach?: boolean;
}

export default function ConsultorasPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProcessed, setShowProcessed] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, processed: 0 });

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      // 1. Verificar se é consultora logada
      const consultoraSession = localStorage.getItem('ironcoach_consultora');
      if (consultoraSession) {
        try {
          const consultora = JSON.parse(consultoraSession);
          setUser({
            id: consultora.id,
            name: consultora.name,
            role: 'consultora',
            isCoach: false,
          });
          setIsLoading(false);
          return;
        } catch (e) {
          localStorage.removeItem('ironcoach_consultora');
        }
      }

      // 2. Verificar se é coach/supervisor logado
      const coachSession = await getCoachSession();
      if (coachSession) {
        const { data: coachData } = await supabase
          .from('coaches')
          .select('id, name, role, is_supervisor')
          .eq('id', coachSession.id)
          .single();

        if (coachData) {
          // Verificar se tem permissão - aceita várias formas de role
          const roleLC = (coachData.role || '').toLowerCase();
          const hasAccess = 
            coachData.is_supervisor === true ||
            coachData.role === 'ADMIN' ||
            roleLC === 'admin' ||
            roleLC.includes('admin') ||
            roleLC.includes('supervisor') ||
            roleLC.includes('coordenador');

          if (hasAccess) {
            setUser({
              id: coachData.id,
              name: coachData.name,
              role: coachData.role || 'supervisor',
              isCoach: true,
            });
            setIsLoading(false);
            return;
          }
        }
      }

      // 3. Nenhuma sessão válida - redirecionar para login de consultoras
      window.location.href = '/consultoras/login';
    };

    checkAuth();
  }, []);

  // Carregar entradas pendentes
  const loadEntries = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/consultoras/pending-entries?all=${showProcessed}&today=true`);
      const data = await response.json();

      if (data.success) {
        setEntries(data.entries);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [showProcessed]);

  useEffect(() => {
    if (user) {
      loadEntries();
      
      // Auto-refresh a cada 30 segundos
      const interval = setInterval(loadEntries, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadEntries]);

  // Marcar como processada
  const markAsProcessed = async (entryId: string) => {
    setProcessingId(entryId);
    try {
      const response = await fetch('/api/consultoras/pending-entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId,
          processedBy: user?.name || 'Consultora',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar lista local
        setEntries(prev => prev.map(e => 
          e.id === entryId 
            ? { ...e, processed: true, processedAt: new Date().toISOString(), processedBy: user?.name || null }
            : e
        ));
        setStats(prev => ({
          ...prev,
          pending: prev.pending - 1,
          processed: prev.processed + 1,
        }));
      }
    } catch (error) {
      console.error('Erro ao marcar como processada:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // Logout
  const handleLogout = () => {
    // Limpar sessão de consultora
    localStorage.removeItem('ironcoach_consultora');
    // Se for coach, também limpar sessão de coach
    if (user?.isCoach) {
      localStorage.removeItem('ironcoach_coach');
    }
    window.location.href = user?.isCoach ? '/' : '/consultoras/login';
  };

  // Formatar data/hora
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (!user) return null;

  const pendingEntries = entries.filter(e => !e.processed);
  const processedEntries = entries.filter(e => e.processed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.isCoach && (
                <button
                  onClick={() => window.location.href = '/'}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  📋 Entradas Manuais Pendentes
                </h1>
                <p className="text-zinc-400 text-sm">
                  {user?.name} • {user?.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span>{stats.pending} pendentes</span>
                </div>
                <div className="flex items-center gap-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span>{stats.processed} lançadas</span>
                </div>
              </div>
              
              {/* Refresh */}
              <button
                onClick={loadEntries}
                disabled={isRefreshing}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowProcessed(!showProcessed)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showProcessed 
                ? 'bg-zinc-700 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            {showProcessed ? 'Mostrando todas' : 'Mostrar processadas'}
          </button>
        </div>
      </div>

      {/* Lista de Entradas */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {pendingEntries.length === 0 && !showProcessed ? (
          <div className="text-center py-16">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Tudo em dia! 🎉
            </h2>
            <p className="text-zinc-400">
              Não há entradas manuais pendentes para lançar.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Entradas Pendentes */}
            {pendingEntries.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Pendentes para Lançar ({pendingEntries.length})
                </h2>
                <div className="grid gap-3">
                  {pendingEntries.map(entry => {
                    const { date, time } = formatDateTime(entry.createdAt);
                    return (
                      <div
                        key={entry.id}
                        className="bg-zinc-800/80 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-4 hover:border-yellow-500/50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Checkbox para marcar */}
                            <button
                              onClick={() => markAsProcessed(entry.id)}
                              disabled={processingId === entry.id}
                              className="p-2 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {processingId === entry.id ? (
                                <RefreshCw className="w-6 h-6 text-yellow-400 animate-spin" />
                              ) : (
                                <Square className="w-6 h-6 text-yellow-400" />
                              )}
                            </button>
                            
                            {/* Info do Aluno */}
                            <div>
                              <div className="flex items-center gap-3">
                                {/* ID em destaque */}
                                <span className="bg-yellow-500 text-black font-bold px-3 py-1 rounded-lg text-lg">
                                  {entry.evoMemberId}
                                </span>
                                <span className="text-white font-semibold text-lg">
                                  {entry.memberName}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-zinc-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {date} às {time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {entry.createdByCoachName}
                                </span>
                              </div>
                              {entry.reason && (
                                <p className="text-zinc-500 text-sm mt-1">
                                  Motivo: {entry.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Instruções */}
                          <div className="text-right">
                            <p className="text-yellow-400 text-sm font-medium">
                              Digite no app da catraca:
                            </p>
                            <p className="text-3xl font-bold text-white">
                              {entry.evoMemberId}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Entradas Processadas (se filtro ativo) */}
            {showProcessed && processedEntries.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Já Lançadas Hoje ({processedEntries.length})
                </h2>
                <div className="grid gap-3 opacity-60">
                  {processedEntries.map(entry => {
                    const { date, time } = formatDateTime(entry.createdAt);
                    const processedTime = entry.processedAt 
                      ? formatDateTime(entry.processedAt)
                      : null;
                    return (
                      <div
                        key={entry.id}
                        className="bg-zinc-800/50 border border-green-500/20 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                              <CheckSquare className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="bg-green-500/30 text-green-400 font-bold px-3 py-1 rounded-lg">
                                  {entry.evoMemberId}
                                </span>
                                <span className="text-zinc-300 font-semibold">
                                  {entry.memberName}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
                                <span>Entrada: {date} às {time}</span>
                                <span>Por: {entry.createdByCoachName}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-zinc-500">
                            <p>Lançada por: {entry.processedBy}</p>
                            {processedTime && (
                              <p>às {processedTime.time}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer com instruções */}
      <footer className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-zinc-400 text-sm">
            💡 <strong>Instruções:</strong> Digite o número do aluno no aplicativo da catraca e depois clique no quadrado amarelo para marcar como lançado.
          </p>
        </div>
      </footer>
    </div>
  );
}
