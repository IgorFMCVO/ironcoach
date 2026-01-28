'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase, getCoachSession } from '@/lib/supabase';

interface ErrorLog {
  id: string;
  source: string;
  endpoint?: string;
  action: string;
  error_message: string;
  error_code?: string;
  error_stack?: string;
  request_data?: Record<string, any>;
  response_data?: Record<string, any>;
  coach_id?: string;
  coach_name?: string;
  member_name?: string;
  member_evo_id?: number;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

interface ErrorSummary {
  source: string;
  action: string;
  error_message: string;
  occurrences: number;
  last_occurrence: string;
  first_occurrence: string;
}

interface Coach {
  id: string;
  name: string;
  role: string;
}

export default function LogsPage() {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [summary, setSummary] = useState<ErrorSummary[]>([]);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [view, setView] = useState<'recent' | 'summary'>('recent');
  const [filter, setFilter] = useState<string>('all');

  // Verificar sessão
  useEffect(() => {
    const checkSession = async () => {
      const session = getCoachSession();
      if (!session || session.role !== 'ADMIN') {
        window.location.href = '/';
        return;
      }
      setCoach(session as Coach);
      setIsLoading(false);
    };
    checkSession();
  }, []);

  // Carregar logs
  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/error-log?recent=true&limit=200');
      const data = await response.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  }, []);

  // Carregar resumo
  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/error-log?summary=true');
      const data = await response.json();
      if (data.success) {
        setSummary(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  }, []);

  useEffect(() => {
    if (!coach) return;
    loadLogs();
    loadSummary();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      loadLogs();
      loadSummary();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [coach, loadLogs, loadSummary]);

  // Filtrar logs
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.source === filter;
  });

  // Formatação
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      api: '#007AFF',
      frontend: '#AF52DE',
      evo: '#FF9500',
      supabase: '#30D158',
      webhook: '#FF3B30',
    };
    return colors[source] || '#8E8E93';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/60">Carregando...</div>
      </div>
    );
  }

  if (!coach || coach.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">⛔ Acesso Negado</p>
          <p className="text-white/40">Apenas administradores podem acessar os logs.</p>
          <Link href="/" className="mt-4 inline-block text-blue-400 hover:underline">
            ← Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/60 hover:text-white">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold">📋 Logs de Erro</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/40 text-sm">{logs.length} erros (24h)</span>
            <button
              onClick={() => { loadLogs(); loadSummary(); }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Tabs e Filtros */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setView('recent')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'recent' ? 'bg-white text-black' : 'bg-white/10 text-white/60'
              }`}
            >
              📄 Recentes
            </button>
            <button
              onClick={() => setView('summary')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'summary' ? 'bg-white text-black' : 'bg-white/10 text-white/60'
              }`}
            >
              📊 Resumo
            </button>
          </div>

          {view === 'recent' && (
            <div className="flex gap-2">
              {['all', 'api', 'frontend', 'evo', 'supabase'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    filter === f ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                  }`}
                  style={{ 
                    borderLeft: f !== 'all' ? `3px solid ${getSourceColor(f)}` : undefined 
                  }}
                >
                  {f === 'all' ? 'Todos' : f.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conteúdo */}
        {view === 'recent' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Lista de Logs */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="max-h-[70vh] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-white/40">
                    ✅ Nenhum erro nas últimas 24 horas
                  </div>
                ) : (
                  filteredLogs.map(log => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all ${
                        selectedLog?.id === log.id ? 'bg-white/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: getSourceColor(log.source) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ backgroundColor: `${getSourceColor(log.source)}30` }}>
                              {log.source.toUpperCase()}
                            </span>
                            <span className="text-xs text-white/40">{log.action}</span>
                          </div>
                          <p className="text-sm text-white/80 truncate">{log.error_message}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                            <span>{formatDate(log.created_at)}</span>
                            {log.member_name && <span>👤 {log.member_name}</span>}
                            {log.coach_name && <span>🎓 {log.coach_name}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Detalhes do Log */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              {selectedLog ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Detalhes do Erro</h3>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/40">Fonte / Ação</label>
                      <p className="font-mono text-sm">
                        <span style={{ color: getSourceColor(selectedLog.source) }}>{selectedLog.source}</span>
                        {' / '}{selectedLog.action}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-white/40">Mensagem</label>
                      <p className="text-red-400 bg-red-500/10 p-2 rounded text-sm">{selectedLog.error_message}</p>
                    </div>

                    {selectedLog.endpoint && (
                      <div>
                        <label className="text-xs text-white/40">Endpoint</label>
                        <p className="font-mono text-sm">{selectedLog.endpoint}</p>
                      </div>
                    )}

                    {selectedLog.member_name && (
                      <div>
                        <label className="text-xs text-white/40">Membro</label>
                        <p className="text-sm">{selectedLog.member_name} (ID: {selectedLog.member_evo_id})</p>
                      </div>
                    )}

                    {selectedLog.coach_name && (
                      <div>
                        <label className="text-xs text-white/40">Professor</label>
                        <p className="text-sm">{selectedLog.coach_name}</p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-white/40">Data/Hora</label>
                      <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</p>
                    </div>

                    {selectedLog.request_data && (
                      <div>
                        <label className="text-xs text-white/40">Dados da Requisição</label>
                        <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto">
                          {JSON.stringify(selectedLog.request_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedLog.response_data && (
                      <div>
                        <label className="text-xs text-white/40">Dados da Resposta</label>
                        <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto">
                          {JSON.stringify(selectedLog.response_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedLog.error_stack && (
                      <div>
                        <label className="text-xs text-white/40">Stack Trace</label>
                        <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto max-h-40">
                          {selectedLog.error_stack}
                        </pre>
                      </div>
                    )}

                    {selectedLog.user_agent && (
                      <div>
                        <label className="text-xs text-white/40">User Agent</label>
                        <p className="text-xs text-white/40 break-all">{selectedLog.user_agent}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-white/40">
                  Selecione um erro para ver detalhes
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Resumo */
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Fonte</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Ação</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Erro</th>
                  <th className="text-center p-4 text-sm font-medium text-white/60">Ocorrências</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Última</th>
                </tr>
              </thead>
              <tbody>
                {summary.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/40">
                      ✅ Nenhum erro nos últimos 7 dias
                    </td>
                  </tr>
                ) : (
                  summary.map((item, i) => (
                    <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <span 
                          className="text-xs font-mono px-2 py-0.5 rounded"
                          style={{ backgroundColor: `${getSourceColor(item.source)}30` }}
                        >
                          {item.source.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-sm">{item.action}</td>
                      <td className="p-4 text-sm text-red-400 max-w-xs truncate">{item.error_message}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded ${
                          item.occurrences > 10 ? 'bg-red-500/20 text-red-400' :
                          item.occurrences > 5 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-white/10'
                        }`}>
                          {item.occurrences}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-white/40">{formatDate(item.last_occurrence)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
