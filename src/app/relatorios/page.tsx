// ============================================================================
// CAMINHO: src/app/relatorios/page.tsx
// ============================================================================
// IRON COACH - Página de Relatórios de Produtividade
// Visualiza e permite download de relatórios em XLS/JSON
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface CoachStats {
  coachId: string;
  coachName: string;
  totalAttendances: number;
  averageAttendanceTime: number;
  attendancesByType: Record<string, number>;
  skippedAttendances: number;
  skipReasons: Record<string, number>;
  notificationsSent: number;
  notificationsByType: Record<string, number>;
  manualEntries: number;
  membersMarkedAsPersonal: number;
  membersReactivated: number;
  workoutsInserted: number;
  evaluationsScheduled: number;
  helpRequestsResponded: number;
  checkoutsProcessed: number;
  checkoutsByReason: Record<string, number>;
}

interface HourlyEnvironment {
  hour: number;
  avgPeopleInGym: number;
  maxPeopleInGym: number;
  totalCheckins: number;
  totalCheckouts: number;
}

interface DailyReport {
  date: string;
  period: { start: string; end: string };
  summary: {
    totalCoaches: number;
    totalAttendances: number;
    totalSkips: number;
    totalNotifications: number;
    totalManualEntries: number;
    averageAttendanceTime: number;
    peakHour: number;
    peakPeople: number;
  };
  coaches: CoachStats[];
  hourlyAttendances: { hour: number; attendances: number; skips: number }[];
  hourlyEnvironment: HourlyEnvironment[];
  topPerformers: {
    mostAttendances: { name: string; count: number } | null;
    mostNotifications: { name: string; count: number } | null;
    fastestAvgTime: { name: string; seconds: number } | null;
  };
}

const NOTIFICATION_LABELS: Record<string, string> = {
  VERIFY_FREQUENCY: 'Verificar Frequência',
  SCHEDULE_EVALUATION: 'Marcar Avaliação',
  SCHEDULE_MONITORING: 'Marcar Monitoramento',
  INSERT_STANDARD_WORKOUT: 'Inserir Treino Padrão',
  INSERT_CUSTOM_WORKOUT: 'Inserir Treino Personalizado',
  PERSONAL_TRAINER: 'Aluno com Personal',
  EXTERNAL_CONSULTING: 'Consultoria Externa',
};

const CHECKOUT_LABELS: Record<string, string> = {
  finished: 'Treino completo',
  left: 'Saiu mais cedo',
  emergency: 'Emergência',
  other: 'Outro motivo',
  timeout_90min: 'Timeout 90min',
};

// Função para obter data no fuso horário de Brasília
const getBrazilDate = () => {
  const now = new Date();
  // Formatar no fuso de São Paulo e extrair a data
  const brazilDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return brazilDateStr; // Retorna YYYY-MM-DD
};

// Função para obter hora atual no Brasil
const getBrazilHour = () => {
  const now = new Date();
  return parseInt(now.toLocaleTimeString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
};

export default function RelatoriosPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getBrazilDate());
  const [selectedCoach, setSelectedCoach] = useState<CoachStats | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'details' | 'hourly' | 'environment'>('summary');
  const [currentHour, setCurrentHour] = useState(getBrazilHour());

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      // Passar timezone para API
      const response = await fetch(`/api/reports/productivity?date=${selectedDate}&tz=America/Sao_Paulo`);
      const result = await response.json();
      
      if (result.success) {
        setReport(result.report);
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Atualizar hora atual a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(getBrazilHour());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    if (!seconds) return '0min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}min`;
    return `${mins}min ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    // Criar data no fuso de SP para evitar problemas de UTC
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    });
  };

  // Verificar se é hoje (para mostrar indicador de "dados parciais")
  const isToday = selectedDate === getBrazilDate();

  // Download como JSON
  const downloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-produtividade-${selectedDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download como CSV/XLS (formato CSV que Excel abre)
  const downloadXLS = () => {
    if (!report) return;
    
    // SHEET 1: Produtividade por Coach
    const headers1 = [
      'Coach',
      'Atendimentos',
      'Pulos',
      'Tempo Médio (min)',
      'Notificações',
      'Entradas Manuais',
      'Personal/Autônomo',
      'Reativações',
      'Treinos Inseridos',
      'Avaliações Agendadas',
      'Pedidos de Ajuda',
      'Checkouts',
    ];
    
    const rows1 = report.coaches.map(c => [
      c.coachName,
      c.totalAttendances,
      c.skippedAttendances,
      Math.round(c.averageAttendanceTime / 60),
      c.notificationsSent,
      c.manualEntries,
      c.membersMarkedAsPersonal,
      c.membersReactivated,
      c.workoutsInserted,
      c.evaluationsScheduled,
      c.helpRequestsResponded,
      c.checkoutsProcessed,
    ]);
    
    const totals1 = [
      'TOTAL',
      report.summary.totalAttendances,
      report.summary.totalSkips,
      Math.round(report.summary.averageAttendanceTime / 60),
      report.summary.totalNotifications,
      report.summary.totalManualEntries,
      report.coaches.reduce((sum, c) => sum + c.membersMarkedAsPersonal, 0),
      report.coaches.reduce((sum, c) => sum + c.membersReactivated, 0),
      report.coaches.reduce((sum, c) => sum + c.workoutsInserted, 0),
      report.coaches.reduce((sum, c) => sum + c.evaluationsScheduled, 0),
      report.coaches.reduce((sum, c) => sum + c.helpRequestsResponded, 0),
      report.coaches.reduce((sum, c) => sum + c.checkoutsProcessed, 0),
    ];

    // SHEET 2: Ambiente por Hora
    const headers2 = [
      'Hora',
      'Média Pessoas',
      'Máximo Pessoas',
      'Check-ins',
      'Check-outs',
      'Atendimentos',
      'Pulos',
    ];

    const rows2 = report.hourlyEnvironment
      .filter(h => h.hour >= 5 && h.hour <= 23)
      .map(h => {
        const hourlyAtt = report.hourlyAttendances.find(a => a.hour === h.hour);
        return [
          `${h.hour}:00`,
          h.avgPeopleInGym,
          h.maxPeopleInGym,
          h.totalCheckins,
          h.totalCheckouts,
          hourlyAtt?.attendances || 0,
          hourlyAtt?.skips || 0,
        ];
      });
    
    const csvContent = [
      `RELATÓRIO DE PRODUTIVIDADE - ${formatDate(selectedDate)}`,
      '',
      '=== PRODUTIVIDADE POR COACH ===',
      '',
      headers1.join(';'),
      ...rows1.map(r => r.join(';')),
      '',
      totals1.join(';'),
      '',
      '',
      '=== AMBIENTE POR HORA ===',
      '',
      headers2.join(';'),
      ...rows2.map(r => r.join(';')),
      '',
      `Horário de Pico: ${report.summary.peakHour}h com ${report.summary.peakPeople} pessoas`,
    ].join('\n');
    
    // BOM para Excel reconhecer UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-produtividade-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4" />
          <p className="text-white/60">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-white/60 hover:text-white">
                ← Voltar
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  📊 Relatório de Produtividade
                  {isToday && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                      🔴 AO VIVO
                    </span>
                  )}
                </h1>
                <p className="text-sm text-white/40">
                  {formatDate(selectedDate)}
                  {isToday && ` • Atualizado às ${currentHour}h (dados parciais)`}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Botão hoje */}
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(getBrazilDate())}
                  className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-sm font-medium text-yellow-400 transition-all"
                >
                  📅 Hoje
                </button>
              )}
              
              {/* Seletor de data */}
              <input
                type="date"
                value={selectedDate}
                max={getBrazilDate()}
                onChange={(e) => setSelectedDate(e.target.value || getBrazilDate())}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm cursor-pointer"
              />
              
              {/* Botão atualizar */}
              <button
                onClick={loadReport}
                disabled={loading}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all"
                title="Atualizar dados"
              >
                {loading ? '⏳' : '🔄'}
              </button>
              
              {/* Botões de download */}
              <button
                onClick={downloadXLS}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-sm font-medium text-green-400 transition-all flex items-center gap-2"
              >
                📥 Excel/CSV
              </button>
              <button
                onClick={downloadJSON}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm font-medium text-blue-400 transition-all flex items-center gap-2"
              >
                📥 JSON
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="p-6">
        {report ? (
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-xl p-3">
                <p className="text-blue-400 text-xs font-medium mb-1">Coaches</p>
                <p className="text-2xl font-bold">{report.summary.totalCoaches}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-xl p-3">
                <p className="text-green-400 text-xs font-medium mb-1">Atendimentos</p>
                <p className="text-2xl font-bold">{report.summary.totalAttendances}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-xs font-medium mb-1">Pulos</p>
                <p className="text-2xl font-bold">{report.summary.totalSkips}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 rounded-xl p-3">
                <p className="text-purple-400 text-xs font-medium mb-1">Notificações</p>
                <p className="text-2xl font-bold">{report.summary.totalNotifications}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-xl p-3">
                <p className="text-orange-400 text-xs font-medium mb-1">Entradas Manuais</p>
                <p className="text-2xl font-bold">{report.summary.totalManualEntries}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 rounded-xl p-3">
                <p className="text-cyan-400 text-xs font-medium mb-1">Tempo Médio</p>
                <p className="text-2xl font-bold">{formatTime(report.summary.averageAttendanceTime)}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/30 rounded-xl p-3">
                <p className="text-yellow-400 text-xs font-medium mb-1">Horário Pico</p>
                <p className="text-2xl font-bold">{report.summary.peakHour}h</p>
              </div>
              <div className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/30 rounded-xl p-3">
                <p className="text-pink-400 text-xs font-medium mb-1">Máx. Pessoas</p>
                <p className="text-2xl font-bold">{report.summary.peakPeople}</p>
              </div>
            </div>

            {/* Top Performers */}
            {(report.topPerformers.mostAttendances || report.topPerformers.mostNotifications) && (
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4">
                <h3 className="font-bold text-yellow-400 mb-3 flex items-center gap-2">
                  🏆 Destaques do Dia
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {report.topPerformers.mostAttendances && (
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-xs text-white/40 mb-1">Mais Atendimentos</p>
                      <p className="font-bold">{report.topPerformers.mostAttendances.name}</p>
                      <p className="text-green-400">{report.topPerformers.mostAttendances.count} atendimentos</p>
                    </div>
                  )}
                  {report.topPerformers.mostNotifications && (
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-xs text-white/40 mb-1">Mais Notificações</p>
                      <p className="font-bold">{report.topPerformers.mostNotifications.name}</p>
                      <p className="text-purple-400">{report.topPerformers.mostNotifications.count} notificações</p>
                    </div>
                  )}
                  {report.topPerformers.fastestAvgTime && (
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-xs text-white/40 mb-1">Atendimento Mais Rápido</p>
                      <p className="font-bold">{report.topPerformers.fastestAvgTime.name}</p>
                      <p className="text-cyan-400">{formatTime(report.topPerformers.fastestAvgTime.seconds)} em média</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
              {['summary', 'details', 'hourly', 'environment'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    viewMode === mode 
                      ? 'bg-white/10 text-white' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {mode === 'summary' && '📋 Resumo por Coach'}
                  {mode === 'details' && '🔍 Detalhes'}
                  {mode === 'hourly' && '📈 Atendimentos/Hora'}
                  {mode === 'environment' && '🏢 Ambiente'}
                </button>
              ))}
            </div>

            {/* Conteúdo das tabs */}
            <AnimatePresence mode="wait">
              {viewMode === 'summary' && (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {/* Tabela de Coaches */}
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="text-left p-4 text-xs font-medium text-white/60">Coach</th>
                            <th className="text-center p-4 text-xs font-medium text-white/60">Atendimentos</th>
                            <th className="text-center p-4 text-xs font-medium text-white/60">Pulos</th>
                            <th className="text-center p-4 text-xs font-medium text-white/60">Tempo Médio</th>
                            <th className="text-center p-4 text-xs font-medium text-white/60">Notificações</th>
                            <th className="text-center p-4 text-xs font-medium text-white/60">Entradas</th>
                            <th className="text-center p-4 text-xs font-medium text-white/60">Checkouts</th>
                            <th className="text-center p-4 text-xs font-medium text-white/60">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.coaches.map((coach, index) => (
                            <tr 
                              key={coach.coachId}
                              className={`border-t border-white/5 hover:bg-white/5 transition-colors ${
                                index === 0 ? 'bg-yellow-500/5' : ''
                              }`}
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {index === 0 && <span>🥇</span>}
                                  {index === 1 && <span>🥈</span>}
                                  {index === 2 && <span>🥉</span>}
                                  <span className="font-medium">{coach.coachName}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="font-bold text-green-400">{coach.totalAttendances}</span>
                              </td>
                              <td className="p-4 text-center">
                                <span className={coach.skippedAttendances > 0 ? 'text-red-400' : 'text-white/40'}>
                                  {coach.skippedAttendances}
                                </span>
                              </td>
                              <td className="p-4 text-center text-cyan-400">
                                {formatTime(coach.averageAttendanceTime)}
                              </td>
                              <td className="p-4 text-center text-purple-400">
                                {coach.notificationsSent}
                              </td>
                              <td className="p-4 text-center text-orange-400">
                                {coach.manualEntries}
                              </td>
                              <td className="p-4 text-center text-white/60">
                                {coach.checkoutsProcessed}
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => setSelectedCoach(coach)}
                                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-all"
                                >
                                  Ver Detalhes
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-white/5 font-bold">
                          <tr>
                            <td className="p-4">TOTAL</td>
                            <td className="p-4 text-center text-green-400">{report.summary.totalAttendances}</td>
                            <td className="p-4 text-center text-red-400">{report.summary.totalSkips}</td>
                            <td className="p-4 text-center text-cyan-400">{formatTime(report.summary.averageAttendanceTime)}</td>
                            <td className="p-4 text-center text-purple-400">{report.summary.totalNotifications}</td>
                            <td className="p-4 text-center text-orange-400">{report.summary.totalManualEntries}</td>
                            <td className="p-4 text-center text-white/60">
                              {report.coaches.reduce((sum, c) => sum + c.checkoutsProcessed, 0)}
                            </td>
                            <td className="p-4"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {viewMode === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {report.coaches.map((coach) => (
                    <div
                      key={coach.coachId}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                    >
                      <h4 className="font-bold text-lg mb-3">{coach.coachName}</h4>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">Atendimentos</span>
                          <span className="text-green-400 font-medium">{coach.totalAttendances}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Pulos</span>
                          <span className="text-red-400">{coach.skippedAttendances}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Tempo Médio</span>
                          <span className="text-cyan-400">{formatTime(coach.averageAttendanceTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Notificações</span>
                          <span className="text-purple-400">{coach.notificationsSent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Entradas Manuais</span>
                          <span className="text-orange-400">{coach.manualEntries}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Personal/Autônomo</span>
                          <span>{coach.membersMarkedAsPersonal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Reativações</span>
                          <span>{coach.membersReactivated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Treinos Inseridos</span>
                          <span>{coach.workoutsInserted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Avaliações</span>
                          <span>{coach.evaluationsScheduled}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Pedidos de Ajuda</span>
                          <span>{coach.helpRequestsResponded}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Checkouts</span>
                          <span>{coach.checkoutsProcessed}</span>
                        </div>
                      </div>

                      {/* Notificações por tipo */}
                      {Object.keys(coach.notificationsByType).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <p className="text-xs text-white/40 mb-2">Notificações por tipo:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(coach.notificationsByType).map(([type, count]) => (
                              <span
                                key={type}
                                className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs"
                              >
                                {NOTIFICATION_LABELS[type] || type}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}

              {viewMode === 'hourly' && (
                <motion.div
                  key="hourly"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h3 className="font-bold mb-4">Atendimentos e Pulos por Hora</h3>
                    
                    {/* Gráfico de barras */}
                    <div className="flex items-end gap-1 h-48 mb-6">
                      {report.hourlyAttendances
                        .filter(h => h.hour >= 5 && h.hour <= 23)
                        .map(({ hour, attendances, skips }) => {
                          const maxValue = Math.max(...report.hourlyAttendances.map(h => h.attendances + h.skips), 1);
                          const totalHeight = ((attendances + skips) / maxValue) * 100;
                          const skipHeight = (skips / maxValue) * 100;
                          
                          return (
                            <div
                              key={hour}
                              className="flex-1 flex flex-col items-center gap-1"
                            >
                              <span className="text-xs text-white/60">
                                {attendances + skips > 0 ? `${attendances}${skips > 0 ? `+${skips}` : ''}` : ''}
                              </span>
                              <div className="w-full relative" style={{ height: '100%' }}>
                                <div
                                  className="absolute bottom-0 w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all"
                                  style={{ height: `${Math.max(totalHeight - skipHeight, 0)}%` }}
                                />
                                {skips > 0 && (
                                  <div
                                    className="absolute w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t transition-all"
                                    style={{ 
                                      height: `${skipHeight}%`,
                                      bottom: `${totalHeight - skipHeight}%`
                                    }}
                                  />
                                )}
                              </div>
                              <span className="text-xs text-white/40">{hour}h</span>
                            </div>
                          );
                        })}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded" />
                        <span className="text-white/60">Atendimentos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded" />
                        <span className="text-white/60">Pulos</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {viewMode === 'environment' && (
                <motion.div
                  key="environment"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Gráfico de ambiente */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h3 className="font-bold mb-4">🏢 Pessoas na Academia por Hora</h3>
                    
                    {/* Gráfico de área */}
                    <div className="flex items-end gap-1 h-64 mb-4">
                      {report.hourlyEnvironment
                        .filter(h => h.hour >= 5 && h.hour <= 23)
                        .map((h) => {
                          const maxPeople = Math.max(...report.hourlyEnvironment.map(e => e.maxPeopleInGym), 1);
                          const avgHeight = (h.avgPeopleInGym / maxPeople) * 100;
                          const maxHeight = (h.maxPeopleInGym / maxPeople) * 100;
                          const isPeak = h.hour === report.summary.peakHour;
                          
                          return (
                            <div
                              key={h.hour}
                              className="flex-1 flex flex-col items-center gap-1"
                            >
                              <span className="text-xs text-white/60">
                                {h.maxPeopleInGym > 0 ? h.maxPeopleInGym : ''}
                              </span>
                              <div className="w-full relative" style={{ height: '100%' }}>
                                {/* Barra de máximo (mais clara) */}
                                <div
                                  className={`absolute bottom-0 w-full rounded-t transition-all ${
                                    isPeak ? 'bg-yellow-500/40' : 'bg-blue-500/20'
                                  }`}
                                  style={{ height: `${maxHeight}%` }}
                                />
                                {/* Barra de média (mais escura) */}
                                <div
                                  className={`absolute bottom-0 w-full rounded-t transition-all ${
                                    isPeak ? 'bg-yellow-500' : 'bg-blue-500'
                                  }`}
                                  style={{ height: `${avgHeight}%` }}
                                />
                              </div>
                              <span className={`text-xs ${isPeak ? 'text-yellow-400 font-bold' : 'text-white/40'}`}>
                                {h.hour}h
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    <div className="flex items-center gap-4 text-sm mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded" />
                        <span className="text-white/60">Média de pessoas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500/40 rounded" />
                        <span className="text-white/60">Máximo de pessoas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded" />
                        <span className="text-white/60">Horário de pico</span>
                      </div>
                    </div>

                    {/* Info do pico */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <p className="text-yellow-400 font-bold">
                        🔥 Horário de Pico: {report.summary.peakHour}h
                      </p>
                      <p className="text-sm text-white/60">
                        Máximo de {report.summary.peakPeople} pessoas simultaneamente
                      </p>
                    </div>
                  </div>

                  {/* Tabela detalhada */}
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="text-left p-3 text-xs font-medium text-white/60">Hora</th>
                            <th className="text-center p-3 text-xs font-medium text-white/60">Média</th>
                            <th className="text-center p-3 text-xs font-medium text-white/60">Máximo</th>
                            <th className="text-center p-3 text-xs font-medium text-white/60">Check-ins</th>
                            <th className="text-center p-3 text-xs font-medium text-white/60">Check-outs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.hourlyEnvironment
                            .filter(h => h.hour >= 5 && h.hour <= 23)
                            .map((h) => {
                              const isPeak = h.hour === report.summary.peakHour;
                              return (
                                <tr 
                                  key={h.hour}
                                  className={`border-t border-white/5 ${isPeak ? 'bg-yellow-500/10' : ''}`}
                                >
                                  <td className="p-3">
                                    <span className={isPeak ? 'text-yellow-400 font-bold' : ''}>
                                      {h.hour}:00 - {h.hour}:59
                                      {isPeak && ' 🔥'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center text-blue-400">{h.avgPeopleInGym}</td>
                                  <td className="p-3 text-center font-bold">{h.maxPeopleInGym}</td>
                                  <td className="p-3 text-center text-green-400">+{h.totalCheckins}</td>
                                  <td className="p-3 text-center text-red-400">-{h.totalCheckouts}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 text-white/40">
            <span className="text-4xl mb-4 block">📭</span>
            <p>Nenhum dado encontrado para esta data</p>
          </div>
        )}
      </main>

      {/* Modal de Detalhes do Coach */}
      <AnimatePresence>
        {selectedCoach && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setSelectedCoach(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-lg">{selectedCoach.coachName}</h3>
                <button onClick={() => setSelectedCoach(null)} className="text-white/40 hover:text-white">✕</button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Estatísticas principais */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <p className="text-xs text-green-400">Atendimentos</p>
                    <p className="text-2xl font-bold">{selectedCoach.totalAttendances}</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <p className="text-xs text-red-400">Pulos</p>
                    <p className="text-2xl font-bold">{selectedCoach.skippedAttendances}</p>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                    <p className="text-xs text-cyan-400">Tempo Médio</p>
                    <p className="text-2xl font-bold">{formatTime(selectedCoach.averageAttendanceTime)}</p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                    <p className="text-xs text-purple-400">Notificações</p>
                    <p className="text-2xl font-bold">{selectedCoach.notificationsSent}</p>
                  </div>
                </div>

                {/* Notificações por tipo */}
                {Object.keys(selectedCoach.notificationsByType).length > 0 && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">Notificações por Tipo</p>
                    {Object.entries(selectedCoach.notificationsByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm py-1">
                        <span className="text-white/60">{NOTIFICATION_LABELS[type] || type}</span>
                        <span className="text-purple-400">{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Motivos de pulo */}
                {Object.keys(selectedCoach.skipReasons).length > 0 && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">Motivos dos Pulos</p>
                    {Object.entries(selectedCoach.skipReasons).map(([reason, count]) => (
                      <div key={reason} className="flex justify-between text-sm py-1">
                        <span className="text-white/60">{reason}</span>
                        <span className="text-red-400">{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Checkouts por motivo */}
                {Object.keys(selectedCoach.checkoutsByReason).length > 0 && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">Checkouts por Motivo</p>
                    {Object.entries(selectedCoach.checkoutsByReason).map(([reason, count]) => (
                      <div key={reason} className="flex justify-between text-sm py-1">
                        <span className="text-white/60">{CHECKOUT_LABELS[reason] || reason}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outras métricas */}
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Outras Ações</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Entradas Manuais</span>
                      <span>{selectedCoach.manualEntries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Marcou Personal/Autônomo</span>
                      <span>{selectedCoach.membersMarkedAsPersonal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Reativações</span>
                      <span>{selectedCoach.membersReactivated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Treinos Inseridos</span>
                      <span>{selectedCoach.workoutsInserted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Avaliações Agendadas</span>
                      <span>{selectedCoach.evaluationsScheduled}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Pedidos de Ajuda Respondidos</span>
                      <span>{selectedCoach.helpRequestsResponded}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
