// ============================================================================
// IRON COACH - Componente Timeline de Atividades
// Exibe o fluxo de vida do professor em tempo real
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityEvent {
  id: string;
  coach_id: string;
  coach_name: string;
  event_type: string;
  event_category: string;
  description: string;
  member_name: string | null;
  member_evo_id: number | null;
  queue_id: string | null;
  metadata: Record<string, any>;
  is_warning: boolean;
  is_positive: boolean;
  created_at: string;
  time_str?: string;
  minutes_ago?: number;
}

interface CoachSummary {
  coach_id: string;
  coach_name: string;
  logins: number;
  total_attendances: number;
  manual_ends: number;
  auto_ends: number;
  overtime_ends: number;
  notifications_sent: number;
  manual_entries: number;
  guide_views: number;
  warnings: number;
  positive_events: number;
  first_activity: string;
  last_activity: string;
}

// Ícones por tipo de evento
const EVENT_ICONS: Record<string, string> = {
  // Sistema
  SESSION_START: '🟢',
  SESSION_END: '🔴',
  SESSION_TIMEOUT: '⏰',
  APP_MINIMIZED: '📴',
  APP_RESTORED: '📱',
  // Atendimento
  ATTENDANCE_START: '▶️',
  ATTENDANCE_END: '✅',
  ATTENDANCE_AUTO_END: '⏱️',
  ATTENDANCE_OVERTIME: '⚠️',
  HELP_REQUEST_RESPONSE: '🆘',
  // Notificação
  NOTIFICATION_SENT: '📢',
  // Navegação
  PAGE_VIEW_GUIDE: '📖',
  PAGE_VIEW_ADMIN: '⚙️',
  PAGE_VIEW_SUPERVISION: '👁️',
  FILTER_CHANGED: '🔍',
  // Aluno
  MANUAL_ENTRY: '🚪',
  MEMBER_EXPANDED: '👤',
  WORKOUT_VIEWED: '📋',
};

// Cores por categoria
const CATEGORY_COLORS: Record<string, string> = {
  SYSTEM: '#64748b',
  ATTENDANCE: '#22c55e',
  NOTIFICATION: '#a855f7',
  NAVIGATION: '#3b82f6',
  MEMBER: '#f59e0b',
};

interface ActivityTimelineProps {
  coachId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
  maxItems?: number;
  showSummary?: boolean;
}

export default function ActivityTimeline({
  coachId,
  autoRefresh = true,
  refreshInterval = 10000, // 10 segundos
  maxItems = 50,
  showSummary = true,
}: ActivityTimelineProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [summaries, setSummaries] = useState<CoachSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState<string | null>(coachId || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Buscar eventos
  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        recent: 'true',
        limit: maxItems.toString(),
      });

      if (selectedCoach) {
        params.append('coachId', selectedCoach);
      }

      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/activity-log?${params}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data || []);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCoach, selectedCategory, maxItems]);

  // Buscar resumos
  const fetchSummaries = useCallback(async () => {
    try {
      const response = await fetch('/api/activity-log?summary=true');
      const data = await response.json();

      if (data.success) {
        setSummaries(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar resumos:', error);
    }
  }, []);

  // Efeito inicial e auto-refresh
  useEffect(() => {
    fetchEvents();
    if (showSummary) fetchSummaries();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchEvents();
        if (showSummary) fetchSummaries();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [fetchEvents, fetchSummaries, autoRefresh, refreshInterval, showSummary]);

  // Formatar tempo relativo
  const formatTimeAgo = (minutes: number | undefined) => {
    if (minutes === undefined) return '';
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${Math.floor(minutes)}min atrás`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${Math.floor(minutes % 60)}min atrás`;
  };

  // Formatar horário
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Professores únicos para filtro
  const uniqueCoaches = Array.from(new Set(events.map(e => e.coach_id)))
    .map(id => {
      const event = events.find(e => e.coach_id === id);
      return { id, name: event?.coach_name || '' };
    });

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold">📊 Timeline de Atividades</h3>
          <span className="text-xs text-white/40">
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Filtro por Professor */}
          <select
            value={selectedCoach || ''}
            onChange={(e) => setSelectedCoach(e.target.value || null)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/30"
          >
            <option value="">Todos os Professores</option>
            {uniqueCoaches.map(coach => (
              <option key={coach.id} value={coach.id}>{coach.name}</option>
            ))}
          </select>

          {/* Filtro por Categoria */}
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-white/30"
          >
            <option value="">Todas Categorias</option>
            <option value="SYSTEM">🖥️ Sistema</option>
            <option value="ATTENDANCE">💪 Atendimento</option>
            <option value="NOTIFICATION">📢 Notificações</option>
            <option value="NAVIGATION">🧭 Navegação</option>
            <option value="MEMBER">👤 Alunos</option>
          </select>

          {/* Botão Refresh */}
          <button
            onClick={fetchEvents}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-all"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Resumos dos Professores */}
      {showSummary && summaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((summary) => (
            <div
              key={summary.coach_id}
              onClick={() => setSelectedCoach(selectedCoach === summary.coach_id ? null : summary.coach_id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedCoach === summary.coach_id
                  ? 'bg-blue-500/20 border-blue-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold">{summary.coach_name}</h4>
                <span className="text-xs text-white/40">
                  {summary.first_activity && formatTime(summary.first_activity)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-400">{summary.total_attendances}</div>
                  <div className="text-xs text-white/40">Atendim.</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">{summary.notifications_sent}</div>
                  <div className="text-xs text-white/40">Notific.</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{summary.warnings}</div>
                  <div className="text-xs text-white/40">Alertas</div>
                </div>
              </div>
              {(summary.auto_ends > 0 || summary.overtime_ends > 0) && (
                <div className="mt-3 pt-3 border-t border-white/10 flex gap-4 text-xs">
                  {summary.auto_ends > 0 && (
                    <span className="text-orange-400">⏱️ {summary.auto_ends} auto-fin.</span>
                  )}
                  {summary.overtime_ends > 0 && (
                    <span className="text-red-400">⚠️ {summary.overtime_ends} atraso</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lista de Eventos */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-white/40">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-white/20 border-t-white rounded-full mb-2" />
            <p>Carregando eventos...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-white/40">
            <span className="text-4xl block mb-2">📭</span>
            <p>Nenhum evento nas últimas 2 horas</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            <AnimatePresence>
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-4 flex items-start gap-4 ${
                    event.is_warning ? 'bg-yellow-500/5' : 
                    event.is_positive ? 'bg-green-500/5' : ''
                  }`}
                >
                  {/* Horário */}
                  <div className="w-16 shrink-0 text-right">
                    <div className="text-sm font-mono font-bold">
                      {event.time_str || formatTime(event.created_at)}
                    </div>
                    <div className="text-xs text-white/40">
                      {formatTimeAgo(event.minutes_ago)}
                    </div>
                  </div>

                  {/* Ícone */}
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${CATEGORY_COLORS[event.event_category]}20` }}
                  >
                    {EVENT_ICONS[event.event_type] || '📌'}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ 
                          backgroundColor: `${CATEGORY_COLORS[event.event_category]}30`,
                          color: CATEGORY_COLORS[event.event_category]
                        }}
                      >
                        {event.coach_name}
                      </span>
                      {event.is_warning && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                          ⚠️ Atenção
                        </span>
                      )}
                      {event.is_positive && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                          ✓ Positivo
                        </span>
                      )}
                    </div>
                    <p className="text-white/90">{event.description}</p>
                    {event.member_name && (
                      <p className="text-sm text-white/50 mt-1">
                        👤 {event.member_name}
                        {event.member_evo_id && ` (ID: ${event.member_evo_id})`}
                      </p>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-white/40 flex flex-wrap gap-2">
                        {event.metadata.waitTimeMinutes && (
                          <span>⏱️ Esperou: {Math.round(event.metadata.waitTimeMinutes)}min</span>
                        )}
                        {event.metadata.durationMinutes && (
                          <span>⏱️ Duração: {Math.round(event.metadata.durationMinutes)}min</span>
                        )}
                        {event.metadata.overtimeSeconds && (
                          <span className="text-yellow-400">⚠️ +{event.metadata.overtimeSeconds}s</span>
                        )}
                        {event.metadata.notificationType && (
                          <span>📢 {event.metadata.notificationType}</span>
                        )}
                        {event.metadata.reason && (
                          <span>💬 {event.metadata.reason}</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
