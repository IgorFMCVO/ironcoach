'use client';

// ============================================================================
// IRONCOACH v16 - GUIA DE EXCELÊNCIA COMPLETO
// Manual de Treinamento para Professores, Supervisores e Administradores
// Academia Impacto - Transformando Vidas Através do Fitness
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GuiaPage() {
  const [role, setRole] = useState<'professor' | 'supervisor' | 'admin'>('professor');
  const [activeTab, setActiveTab] = useState('missao');

  // Tabs do Professor
  const professorTabs = [
    { id: 'missao', label: '🎯 Missão', color: '#FF3B30' },
    { id: 'prioridades', label: '🎨 Prioridades', color: '#FF9500' },
    { id: 'ambiente', label: '🚦 Alertas', color: '#30D158' },
    { id: 'atendimento', label: '💪 Atendimento', color: '#007AFF' },
    { id: 'badges', label: '🏷️ Badges', color: '#AF52DE' },
    { id: 'cardio', label: '🏃 Cardio', color: '#FF2D55' },
    { id: 'fotos', label: '📸 Fotos', color: '#5856D6' },
  ];

  // Tabs do Supervisor
  const supervisorTabs = [
    { id: 'papel', label: '👑 Seu Papel', color: '#AF52DE' },
    { id: 'reforco', label: '🏃 Reforço', color: '#FF3B30' },
    { id: 'ambiente', label: '🚦 Alertas', color: '#30D158' },
    { id: 'notificacoes', label: '🔔 Notificações', color: '#FF9500' },
    { id: 'acoes', label: '⚡ Ações EVO', color: '#007AFF' },
    { id: 'equipe', label: '👥 Equipe', color: '#5856D6' },
  ];

  // Tabs do Admin
  const adminTabs = [
    { id: 'visao', label: '🎛️ Visão Geral', color: '#FF3B30' },
    { id: 'config', label: '⚙️ Configurações', color: '#007AFF' },
    { id: 'ambiente', label: '🚦 Alertas', color: '#30D158' },
    { id: 'whatsapp', label: '📱 WhatsApp', color: '#25D366' },
    { id: 'integracao', label: '🔗 Integração EVO', color: '#FF9500' },
  ];

  const currentTabs = role === 'professor' ? professorTabs : role === 'supervisor' ? supervisorTabs : adminTabs;

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* HEADER FIXO */}
      <header className="shrink-0 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF3B30] to-[#FF6347] flex items-center justify-center font-black text-2xl shadow-lg shadow-red-500/20">
                I
              </div>
              <div>
                <h1 className="text-xl font-black">IRON<span className="text-[#FF3B30]">COACH</span></h1>
                <p className="text-xs text-white/40">Guia de Excelência v16</p>
              </div>
            </div>

            {/* Toggle Professor / Supervisor / Admin */}
            <div className="flex bg-white/5 rounded-xl p-1">
              <button
                onClick={() => { setRole('professor'); setActiveTab('missao'); }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  role === 'professor' 
                    ? 'bg-[#FF3B30] text-white shadow-lg' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                🏋️ Professor
              </button>
              <button
                onClick={() => { setRole('supervisor'); setActiveTab('papel'); }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  role === 'supervisor' 
                    ? 'bg-[#AF52DE] text-white shadow-lg' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                👑 Supervisor
              </button>
              <button
                onClick={() => { setRole('admin'); setActiveTab('visao'); }}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  role === 'admin' 
                    ? 'bg-[#007AFF] text-white shadow-lg' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                🔧 Admin
              </button>
            </div>

            {/* Voltar */}
            <a 
              href="/" 
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-medium text-sm transition-all"
            >
              ← Dashboard
            </a>
          </div>
        </div>

        {/* TABS */}
        <div className="border-t border-white/5">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex gap-1 py-2 overflow-x-auto">
              {currentTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                    activeTab === tab.id 
                      ? 'text-white shadow-lg' 
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                  style={activeTab === tab.id ? { backgroundColor: tab.color } : {}}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO COM SCROLL */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${role}-${activeTab}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* ============================================================ */}
              {/* CONTEÚDO DO PROFESSOR */}
              {/* ============================================================ */}
              {role === 'professor' && (
                <>
                  {/* MISSÃO */}
                  {activeTab === 'missao' && (
                    <div className="space-y-8">
                      {/* Hero Motivacional */}
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF3B30] to-[#FF6347] p-8 md:p-12">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                        <div className="relative z-10">
                          <h2 className="text-4xl md:text-5xl font-black mb-4">
                            Você é a Diferença! 💪
                          </h2>
                          <p className="text-xl md:text-2xl text-white/90 max-w-2xl">
                            Cada atendimento seu pode ser o motivo de um aluno continuar treinando. 
                            <strong> Você tem o poder de transformar vidas.</strong>
                          </p>
                        </div>
                      </div>

                      {/* Estatísticas de Impacto */}
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-2xl p-6 border border-red-500/20">
                          <div className="text-5xl font-black text-red-400 mb-2">67%</div>
                          <p className="text-white/60">dos alunos desistem nos primeiros 90 dias</p>
                          <p className="text-sm text-red-400 mt-2 font-medium">Você pode mudar isso!</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl p-6 border border-green-500/20">
                          <div className="text-5xl font-black text-green-400 mb-2">3x</div>
                          <p className="text-white/60">mais chance de continuar quando bem atendido</p>
                          <p className="text-sm text-green-400 mt-2 font-medium">Seu atendimento importa!</p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-2xl p-6 border border-yellow-500/20">
                          <div className="text-5xl font-black text-yellow-400 mb-2">1min</div>
                          <p className="text-white/60">de atenção pode fazer toda a diferença</p>
                          <p className="text-sm text-yellow-400 mt-2 font-medium">Seja presente!</p>
                        </div>
                      </div>

                      {/* Sua Missão */}
                      <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                          <span className="text-3xl">🎯</span> Sua Missão Diária
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 font-bold shrink-0">1</div>
                              <div>
                                <h4 className="font-bold text-lg">Priorize os Vermelhos</h4>
                                <p className="text-white/60">Alunos novos e em risco precisam de você primeiro</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold shrink-0">2</div>
                              <div>
                                <h4 className="font-bold text-lg">Atenda com Qualidade</h4>
                                <p className="text-white/60">Não é sobre quantidade, é sobre impacto real</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold shrink-0">3</div>
                              <div>
                                <h4 className="font-bold text-lg">Fique Atento aos Alertas</h4>
                                <p className="text-white/60">O sistema indica quando a demanda está alta</p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 font-bold shrink-0">4</div>
                              <div>
                                <h4 className="font-bold text-lg">Verifique os Badges</h4>
                                <p className="text-white/60">Ficha, Avaliação e Monitoramento são essenciais</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">5</div>
                              <div>
                                <h4 className="font-bold text-lg">Tire Fotos dos Alunos</h4>
                                <p className="text-white/60">Ajuda a reconhecer e personalizar o atendimento</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold shrink-0">6</div>
                              <div>
                                <h4 className="font-bold text-lg">Notifique a Coordenação</h4>
                                <p className="text-white/60">Quando identificar necessidades especiais</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Frase Motivacional */}
                      <div className="text-center py-8">
                        <p className="text-2xl text-white/40 italic">
                          "Um bom professor atende. Um excelente professor <span className="text-[#FF3B30] font-bold">transforma</span>."
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PRIORIDADES */}
                  {activeTab === 'prioridades' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">🎨 Sistema de Prioridades</h2>
                        <p className="text-white/60">Entenda quem precisa de você com mais urgência</p>
                      </div>

                      {/* VERMELHO */}
                      <div className="bg-gradient-to-r from-red-500/20 to-transparent rounded-2xl p-6 border-l-4 border-red-500">
                        <div className="flex items-start gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-red-500 flex items-center justify-center text-4xl shadow-lg shadow-red-500/30 shrink-0">🔴</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-black text-red-400">PRIORIDADE MÁXIMA</h3>
                              <span className="px-3 py-1 bg-red-500/30 rounded-full text-xs font-bold text-red-300">1ª SEMANA</span>
                            </div>
                            <p className="text-white/80 mb-4">Alunos nos <strong>primeiros 7 dias</strong> de academia. Período mais crítico!</p>
                            <div className="bg-black/30 rounded-xl p-4">
                              <p className="font-bold text-red-300 mb-2">⚡ O QUE FAZER:</p>
                              <ul className="text-white/70 space-y-1 text-sm">
                                <li>• Apresente-se e dê boas-vindas calorosas</li>
                                <li>• Explique os equipamentos sem pressa</li>
                                <li>• Verifique se tem ficha de treino (badge verde ✓)</li>
                                <li>• Pergunte se está com dúvidas</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LARANJA */}
                      <div className="bg-gradient-to-r from-orange-500/20 to-transparent rounded-2xl p-6 border-l-4 border-orange-500">
                        <div className="flex items-start gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-orange-500 flex items-center justify-center text-4xl shadow-lg shadow-orange-500/30 shrink-0">🟠</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-black text-orange-400">PRIORIDADE ALTA</h3>
                              <span className="px-3 py-1 bg-orange-500/30 rounded-full text-xs font-bold text-orange-300">2ª SEMANA</span>
                            </div>
                            <p className="text-white/80 mb-4">Alunos entre <strong>8-14 dias</strong>. Ainda estão se adaptando!</p>
                            <div className="bg-black/30 rounded-xl p-4">
                              <p className="font-bold text-orange-300 mb-2">⚡ O QUE FAZER:</p>
                              <ul className="text-white/70 space-y-1 text-sm">
                                <li>• Pergunte como foi a semana anterior</li>
                                <li>• Verifique se está seguindo a ficha</li>
                                <li>• Corrija postura e execução</li>
                                <li>• Incentive a consistência</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AMARELO */}
                      <div className="bg-gradient-to-r from-yellow-500/20 to-transparent rounded-2xl p-6 border-l-4 border-yellow-500">
                        <div className="flex items-start gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-yellow-500 flex items-center justify-center text-4xl shadow-lg shadow-yellow-500/30 shrink-0">🟡</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-black text-yellow-400">PRIORIDADE MODERADA</h3>
                              <span className="px-3 py-1 bg-yellow-500/30 rounded-full text-xs font-bold text-yellow-300">3ª-4ª SEMANA</span>
                            </div>
                            <p className="text-white/80 mb-4">Alunos entre <strong>15-30 dias</strong>. Momento de consolidar o hábito.</p>
                            <div className="bg-black/30 rounded-xl p-4">
                              <p className="font-bold text-yellow-300 mb-2">⚡ O QUE FAZER:</p>
                              <ul className="text-white/70 space-y-1 text-sm">
                                <li>• Reconheça o progresso feito</li>
                                <li>• Sugira pequenas evoluções</li>
                                <li>• Verifique se precisa trocar a ficha</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* VERDE */}
                      <div className="bg-gradient-to-r from-green-500/20 to-transparent rounded-2xl p-6 border-l-4 border-green-500">
                        <div className="flex items-start gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-green-500 flex items-center justify-center text-4xl shadow-lg shadow-green-500/30 shrink-0">🟢</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-black text-green-400">PRIORIDADE NORMAL</h3>
                              <span className="px-3 py-1 bg-green-500/30 rounded-full text-xs font-bold text-green-300">31+ DIAS</span>
                            </div>
                            <p className="text-white/80 mb-4">Alunos com <strong>mais de 31 dias</strong>. Já têm ritmo.</p>
                            <div className="bg-black/30 rounded-xl p-4">
                              <p className="font-bold text-green-300 mb-2">⚡ O QUE FAZER:</p>
                              <ul className="text-white/70 space-y-1 text-sm">
                                <li>• Check-in rápido quando passar por perto</li>
                                <li>• Elogie a consistência</li>
                                <li>• Proponha desafios novos</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AZUL */}
                      <div className="bg-gradient-to-r from-blue-500/20 to-transparent rounded-2xl p-6 border-l-4 border-blue-500">
                        <div className="flex items-start gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-blue-500 flex items-center justify-center text-4xl shadow-lg shadow-blue-500/30 shrink-0">🔵</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-black text-blue-400">AUTÔNOMO</h3>
                              <span className="px-3 py-1 bg-blue-500/30 rounded-full text-xs font-bold text-blue-300">180+ DIAS</span>
                            </div>
                            <p className="text-white/80 mb-4">Veteranos com <strong>mais de 6 meses</strong> e boa retenção.</p>
                            <div className="bg-black/30 rounded-xl p-4">
                              <p className="font-bold text-blue-300 mb-2">⚡ O QUE FAZER:</p>
                              <ul className="text-white/70 space-y-1 text-sm">
                                <li>• Cumprimente sempre que cruzar</li>
                                <li>• Não precisa acompanhar de perto</li>
                                <li>• Esteja disponível se pedirem ajuda</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PRETO */}
                      <div className="bg-gradient-to-r from-gray-800/40 to-transparent rounded-2xl p-6 border-l-4 border-gray-600">
                        <div className="flex items-start gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center text-4xl shadow-lg shrink-0">🏴</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-black text-gray-400">PERSONAL / CONSULTORIA</h3>
                            </div>
                            <p className="text-white/80 mb-4">Alunos com <strong>Personal Trainer</strong> ou <strong>Consultoria Externa</strong>.</p>
                            <div className="bg-black/30 rounded-xl p-4">
                              <p className="font-bold text-gray-300 mb-2">⚡ O QUE FAZER:</p>
                              <ul className="text-white/70 space-y-1 text-sm">
                                <li>• <strong>NÃO interfira</strong> no treino</li>
                                <li>• Cumprimente educadamente</li>
                                <li>• Só ajude se o ALUNO pedir diretamente</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AMBIENTE - PROFESSOR */}
                  {activeTab === 'ambiente' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">🚦 Sistema de Alertas de Ambiente</h2>
                        <p className="text-white/60">O sistema monitora a demanda e ajusta os tempos automaticamente</p>
                      </div>

                      {/* Explicação */}
                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📊 Como Funciona?</h3>
                        <p className="text-white/70 mb-4">
                          O sistema calcula automaticamente o <strong>ratio alunos/professor</strong> e ajusta os tempos de atendimento.
                          Quanto mais alunos por professor, mais rápido precisamos atender!
                        </p>
                        <div className="bg-black/30 rounded-xl p-4">
                          <p className="text-sm text-white/60">
                            <strong>Fórmula:</strong> Alunos ativos (exceto cardio e personal) ÷ Professores no salão
                          </p>
                        </div>
                      </div>

                      {/* Níveis */}
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* ÓTIMO */}
                        <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-2xl p-6 border border-green-500/30">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl">💚</span>
                            <div>
                              <h4 className="text-xl font-black text-green-400">ÓTIMO</h4>
                              <p className="text-white/60 text-sm">≤ 5 alunos por professor</p>
                            </div>
                          </div>
                          <div className="bg-black/30 rounded-xl p-3">
                            <p className="text-sm font-bold text-green-300 mb-2">Tempos:</p>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                              <div className="bg-red-500/20 rounded p-1">🔴 3:30</div>
                              <div className="bg-orange-500/20 rounded p-1">🟠 4:30</div>
                              <div className="bg-yellow-500/20 rounded p-1">🟡 5:30</div>
                              <div className="bg-green-500/20 rounded p-1">🟢 6:30</div>
                            </div>
                          </div>
                          <p className="text-white/50 text-xs mt-3">Alerta a cada 15 minutos</p>
                        </div>

                        {/* BOM */}
                        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-2xl p-6 border border-yellow-500/30">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl">💛</span>
                            <div>
                              <h4 className="text-xl font-black text-yellow-400">BOM</h4>
                              <p className="text-white/60 text-sm">6-10 alunos por professor</p>
                            </div>
                          </div>
                          <div className="bg-black/30 rounded-xl p-3">
                            <p className="text-sm font-bold text-yellow-300 mb-2">Tempos (-30s/-15s):</p>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                              <div className="bg-red-500/20 rounded p-1">🔴 3:00</div>
                              <div className="bg-orange-500/20 rounded p-1">🟠 4:00</div>
                              <div className="bg-yellow-500/20 rounded p-1">🟡 5:15</div>
                              <div className="bg-green-500/20 rounded p-1">🟢 6:15</div>
                            </div>
                          </div>
                          <p className="text-white/50 text-xs mt-3">Alerta a cada 10 minutos</p>
                        </div>

                        {/* BAIXO */}
                        <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 rounded-2xl p-6 border border-orange-500/30">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl">🟠</span>
                            <div>
                              <h4 className="text-xl font-black text-orange-400">BAIXO</h4>
                              <p className="text-white/60 text-sm">11-15 alunos por professor</p>
                            </div>
                          </div>
                          <div className="bg-black/30 rounded-xl p-3">
                            <p className="text-sm font-bold text-orange-300 mb-2">Tempos (-60s/-30s):</p>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                              <div className="bg-red-500/20 rounded p-1">🔴 2:30</div>
                              <div className="bg-orange-500/20 rounded p-1">🟠 3:30</div>
                              <div className="bg-yellow-500/20 rounded p-1">🟡 5:00</div>
                              <div className="bg-green-500/20 rounded p-1">🟢 6:00</div>
                            </div>
                          </div>
                          <p className="text-white/50 text-xs mt-3">⚠️ Alerta a cada 5 minutos</p>
                        </div>

                        {/* CRÍTICO */}
                        <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-2xl p-6 border border-red-500/30">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl">🔴</span>
                            <div>
                              <h4 className="text-xl font-black text-red-400">CRÍTICO</h4>
                              <p className="text-white/60 text-sm">16+ alunos por professor</p>
                            </div>
                          </div>
                          <div className="bg-black/30 rounded-xl p-3">
                            <p className="text-sm font-bold text-red-300 mb-2">Tempos (-90s/-45s):</p>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                              <div className="bg-red-500/20 rounded p-1">🔴 2:00</div>
                              <div className="bg-orange-500/20 rounded p-1">🟠 3:00</div>
                              <div className="bg-yellow-500/20 rounded p-1">🟡 4:45</div>
                              <div className="bg-green-500/20 rounded p-1">🟢 5:45</div>
                            </div>
                          </div>
                          <p className="text-white/50 text-xs mt-3">🚨 Alerta a cada 3 min + WhatsApp</p>
                        </div>
                      </div>

                      {/* Indicador no Header */}
                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📍 Onde Ver o Nível Atual?</h3>
                        <p className="text-white/70 mb-4">No header do dashboard você encontra o indicador:</p>
                        <div className="bg-black/50 rounded-xl p-4 flex items-center gap-4 justify-center">
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
                            <span>💚</span>
                            <div className="text-left">
                              <p className="text-xs font-bold text-green-400">ÓTIMO</p>
                              <p className="text-[10px] text-white/50">4.0:1</p>
                            </div>
                            <div className="text-[9px] text-white/40 ml-2">
                              <span>👥12</span>
                              <span className="ml-1">👨‍🏫3</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Alerta Fullscreen */}
                      <div className="bg-gradient-to-r from-purple-500/20 to-purple-500/5 rounded-2xl p-6 border border-purple-500/30">
                        <h3 className="text-xl font-bold mb-4 text-purple-400">📺 Alerta em Tela Cheia</h3>
                        <p className="text-white/70 mb-4">Periodicamente, o sistema exibirá um alerta mostrando:</p>
                        <ul className="text-white/60 space-y-2 text-sm">
                          <li>• Nível atual de atendimento (emoji + cor + texto)</li>
                          <li>• Quantidade de alunos e professores</li>
                          <li>• Ratio atual</li>
                          <li>• Tempos ajustados para cada cor</li>
                          <li>• Cards aguardando muito tempo</li>
                        </ul>
                        <p className="text-purple-300 text-sm mt-4 font-medium">💡 Toque na tela para fechar o alerta</p>
                      </div>
                    </div>
                  )}

                  {/* ATENDIMENTO */}
                  {activeTab === 'atendimento' && (
                    <div className="space-y-8">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">💪 Fluxo de Atendimento</h2>
                        <p className="text-white/60">Passo a passo do atendimento ideal</p>
                      </div>

                      {/* Fluxo */}
                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <div className="space-y-6">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-black text-xl shrink-0">1</div>
                            <div>
                              <h4 className="font-bold text-lg">Selecione o Card</h4>
                              <p className="text-white/60">Clique no card do aluno sugerido ou escolha outro</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-black text-xl shrink-0">2</div>
                            <div>
                              <h4 className="font-bold text-lg">Verifique os Badges</h4>
                              <p className="text-white/60">Confira Ficha, Avaliação e Monitoramento antes de abordar</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-black text-xl shrink-0">3</div>
                            <div>
                              <h4 className="font-bold text-lg">Clique em "Iniciar Atendimento"</h4>
                              <p className="text-white/60">O timer começa e o card expande</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-black text-xl shrink-0">4</div>
                            <div>
                              <h4 className="font-bold text-lg">Atenda o Aluno</h4>
                              <p className="text-white/60">Use as sugestões do sistema como guia</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center font-black text-xl shrink-0">5</div>
                            <div>
                              <h4 className="font-bold text-lg">Finalize</h4>
                              <p className="text-white/60">Clique em "Concluir" e selecione o tipo de intervenção</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tipos de Intervenção */}
                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📋 Tipos de Intervenção</h3>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                            <span className="text-green-400 font-bold">💪 Correção de Exercício</span>
                            <p className="text-white/50 text-xs mt-1">Ajustou postura ou execução</p>
                          </div>
                          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <span className="text-blue-400 font-bold">📋 Orientação de Ficha</span>
                            <p className="text-white/50 text-xs mt-1">Explicou exercícios da ficha</p>
                          </div>
                          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <span className="text-purple-400 font-bold">🎯 Motivação</span>
                            <p className="text-white/50 text-xs mt-1">Incentivou e motivou</p>
                          </div>
                          <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                            <span className="text-yellow-400 font-bold">❓ Dúvida</span>
                            <p className="text-white/50 text-xs mt-1">Respondeu pergunta</p>
                          </div>
                          <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
                            <span className="text-orange-400 font-bold">🏋️ Auxílio em Exercício</span>
                            <p className="text-white/50 text-xs mt-1">Ajudou na execução</p>
                          </div>
                          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                            <span className="text-red-400 font-bold">👋 Boas-vindas</span>
                            <p className="text-white/50 text-xs mt-1">Recepcionou aluno novo</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BADGES */}
                  {activeTab === 'badges' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">🏷️ Sistema de Badges</h2>
                        <p className="text-white/60">Indicadores visuais do status do aluno</p>
                      </div>

                      {/* Explicação */}
                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <p className="text-white/70 mb-6">
                          Cada card de aluno exibe 3 badges que indicam se o aluno possui <strong>Ficha</strong>, <strong>Avaliação Física</strong> e <strong>Monitoramento</strong>.
                        </p>
                        <div className="bg-black/50 rounded-xl p-4 mb-6">
                          <p className="text-xs text-white/40 mb-3">Exemplo de badges no card:</p>
                          <div className="flex gap-2 justify-center flex-wrap">
                            <div className="px-2 py-1 rounded text-[9px] font-bold bg-green-500/20 border border-green-500/30 text-green-400">📋 Ficha ✓</div>
                            <div className="px-2 py-1 rounded text-[9px] font-bold bg-orange-500/20 border border-orange-500/30 text-orange-400">📊 Vencida</div>
                            <div className="px-2 py-1 rounded text-[9px] font-bold bg-red-500/20 border border-red-500/30 text-red-400">💓 Sem monit.</div>
                          </div>
                        </div>
                      </div>

                      {/* Ficha */}
                      <div className="bg-gradient-to-r from-blue-500/10 to-transparent rounded-2xl p-6 border border-blue-500/20">
                        <h3 className="text-xl font-bold mb-4 text-blue-400">📋 Badge de Ficha</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 text-center">
                            <div className="text-2xl mb-2">✅</div>
                            <p className="font-bold text-green-400">Ficha ✓</p>
                            <p className="text-white/50 text-xs mt-1">Tem ficha válida</p>
                          </div>
                          <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20 text-center">
                            <div className="text-2xl mb-2">⚠️</div>
                            <p className="font-bold text-orange-400">Vencida</p>
                            <p className="text-white/50 text-xs mt-1">Ficha expirou (30+ dias)</p>
                          </div>
                          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 text-center">
                            <div className="text-2xl mb-2">❌</div>
                            <p className="font-bold text-red-400">Sem ficha</p>
                            <p className="text-white/50 text-xs mt-1">Nunca teve ficha</p>
                          </div>
                        </div>
                      </div>

                      {/* Avaliação */}
                      <div className="bg-gradient-to-r from-purple-500/10 to-transparent rounded-2xl p-6 border border-purple-500/20">
                        <h3 className="text-xl font-bold mb-4 text-purple-400">📊 Badge de Avaliação Física</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 text-center">
                            <div className="text-2xl mb-2">✅</div>
                            <p className="font-bold text-green-400">Aval. ✓</p>
                            <p className="text-white/50 text-xs mt-1">Avaliação válida (60 dias)</p>
                          </div>
                          <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20 text-center">
                            <div className="text-2xl mb-2">⚠️</div>
                            <p className="font-bold text-orange-400">Vencida</p>
                            <p className="text-white/50 text-xs mt-1">Expirou há mais de 60 dias</p>
                          </div>
                          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 text-center">
                            <div className="text-2xl mb-2">❌</div>
                            <p className="font-bold text-red-400">Sem aval.</p>
                            <p className="text-white/50 text-xs mt-1">Nunca fez avaliação</p>
                          </div>
                        </div>
                      </div>

                      {/* Monitoramento */}
                      <div className="bg-gradient-to-r from-pink-500/10 to-transparent rounded-2xl p-6 border border-pink-500/20">
                        <h3 className="text-xl font-bold mb-4 text-pink-400">💓 Badge de Monitoramento</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 text-center">
                            <div className="text-2xl mb-2">✅</div>
                            <p className="font-bold text-green-400">Monit. ✓</p>
                            <p className="text-white/50 text-xs mt-1">Comprou nos últimos 60 dias</p>
                          </div>
                          <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20 text-center">
                            <div className="text-2xl mb-2">⚠️</div>
                            <p className="font-bold text-orange-400">Vencido</p>
                            <p className="text-white/50 text-xs mt-1">Expirou há mais de 60 dias</p>
                          </div>
                          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 text-center">
                            <div className="text-2xl mb-2">❌</div>
                            <p className="font-bold text-red-400">Sem monit.</p>
                            <p className="text-white/50 text-xs mt-1">Nunca comprou</p>
                          </div>
                        </div>
                      </div>

                      {/* O que fazer */}
                      <div className="bg-yellow-500/10 rounded-2xl p-6 border border-yellow-500/30">
                        <h3 className="text-xl font-bold mb-4 text-yellow-400">💡 O Que Fazer?</h3>
                        <ul className="text-white/70 space-y-3">
                          <li className="flex items-start gap-3">
                            <span className="text-red-400">•</span>
                            <span><strong className="text-red-400">Sem Ficha:</strong> Notifique a coordenação para inserir ficha</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-orange-400">•</span>
                            <span><strong className="text-orange-400">Ficha Vencida:</strong> Notifique para atualizar a ficha</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-purple-400">•</span>
                            <span><strong className="text-purple-400">Sem Avaliação:</strong> Sugira ao aluno agendar avaliação</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <span className="text-pink-400">•</span>
                            <span><strong className="text-pink-400">Sem Monitoramento:</strong> Ofereça o serviço de acompanhamento</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* CARDIO */}
                  {activeTab === 'cardio' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">🏃 Sistema de Cardio</h2>
                        <p className="text-white/60">Acompanhamento de alunos no espaço cardiovascular</p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">O Que É?</h3>
                        <p className="text-white/70">
                          Quando um aluno vai para o espaço de cardio (esteiras, bikes, etc.), você pode 
                          movê-lo para o <strong>"Espaço Cardio"</strong>. Isso indica que ele está fazendo 
                          aeróbico e não precisa de atendimento imediato.
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl p-6 border border-green-500/20">
                          <h3 className="text-xl font-bold mb-4 text-green-400">✅ Vantagens</h3>
                          <ul className="text-white/70 space-y-2 text-sm">
                            <li>• Alunos em cardio <strong>não contam no ratio</strong></li>
                            <li>• Libera atenção para quem precisa mais</li>
                            <li>• Timer específico de cardio</li>
                            <li>• Fácil retorno ao dashboard principal</li>
                          </ul>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20">
                          <h3 className="text-xl font-bold mb-4 text-blue-400">📍 Como Usar</h3>
                          <ul className="text-white/70 space-y-2 text-sm">
                            <li>1. Clique no card do aluno</li>
                            <li>2. No modal, clique em "🏃 Cardio"</li>
                            <li>3. O aluno aparece na aba "Cardio"</li>
                            <li>4. Quando terminar, clique em "Retornar"</li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-yellow-500/10 rounded-2xl p-6 border border-yellow-500/30">
                        <h3 className="text-xl font-bold mb-4 text-yellow-400">⚠️ Importante</h3>
                        <p className="text-white/70">
                          O aluno em cardio NÃO é esquecido! Ele aparece em uma seção separada com seu tempo 
                          de cardio. Quando ele terminar, <strong>retorne-o ao dashboard</strong> para que 
                          volte a ser contado e atendido normalmente.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* FOTOS */}
                  {activeTab === 'fotos' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">📸 Sistema de Fotos</h2>
                        <p className="text-white/60">Reconheça seus alunos pelo rosto</p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">Por Que Usar?</h3>
                        <p className="text-white/70 mb-4">Tirar foto dos alunos ajuda a:</p>
                        <ul className="text-white/60 space-y-2">
                          <li>• <strong>Reconhecer</strong> o aluno antes de abordar</li>
                          <li>• <strong>Personalizar</strong> o atendimento (chamar pelo nome)</li>
                          <li>• <strong>Evitar</strong> confusões com nomes parecidos</li>
                          <li>• <strong>Agilizar</strong> a identificação no salão</li>
                        </ul>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl p-6 border border-purple-500/20">
                        <h3 className="text-xl font-bold mb-4 text-purple-400">📱 Como Tirar Foto</h3>
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                            <p className="text-white/70">Clique no card do aluno para abrir o modal</p>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                            <p className="text-white/70">Clique no ícone de câmera 📷 ou na área da foto</p>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                            <p className="text-white/70">Selecione a câmera (frontal ou traseira)</p>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-sm shrink-0">4</div>
                            <p className="text-white/70">Tire a foto e clique em "Salvar"</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-500/10 rounded-2xl p-6 border border-yellow-500/30">
                        <h3 className="text-xl font-bold mb-4 text-yellow-400">💡 Dicas</h3>
                        <ul className="text-white/70 space-y-2 text-sm">
                          <li>• Peça permissão ao aluno antes de tirar a foto</li>
                          <li>• Prefira fotos com boa iluminação</li>
                          <li>• Foto de rosto de frente é ideal</li>
                          <li>• A foto fica salva e aparece no card automaticamente</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ============================================================ */}
              {/* CONTEÚDO DO SUPERVISOR */}
              {/* ============================================================ */}
              {role === 'supervisor' && (
                <>
                  {/* PAPEL */}
                  {activeTab === 'papel' && (
                    <div className="space-y-8">
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#AF52DE] to-[#8B5CF6] p-8 md:p-12">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                          <h2 className="text-4xl md:text-5xl font-black mb-4">Você Lidera a Excelência! 👑</h2>
                          <p className="text-xl md:text-2xl text-white/90 max-w-2xl">
                            Supervisores são a linha de frente na retenção de alunos. 
                            <strong> Sua atuação define o sucesso da equipe.</strong>
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                        <h3 className="text-2xl font-bold mb-6">📋 Suas Responsabilidades</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                              <h4 className="font-bold text-purple-400">🔔 Atender Notificações</h4>
                              <p className="text-white/60 text-sm">Resolva as demandas dos professores rapidamente</p>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                              <h4 className="font-bold text-blue-400">📊 Monitorar o Ambiente</h4>
                              <p className="text-white/60 text-sm">Fique atento aos alertas de nível</p>
                            </div>
                            <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                              <h4 className="font-bold text-green-400">⚡ Executar Ações no EVO</h4>
                              <p className="text-white/60 text-sm">Insira fichas, agende avaliações</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                              <h4 className="font-bold text-red-400">🏃 Reforço no Salão</h4>
                              <p className="text-white/60 text-sm">Entre como professor quando crítico</p>
                            </div>
                            <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                              <h4 className="font-bold text-yellow-400">👥 Orientar a Equipe</h4>
                              <p className="text-white/60 text-sm">Guie os professores na priorização</p>
                            </div>
                            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                              <h4 className="font-bold text-orange-400">📈 Acompanhar Métricas</h4>
                              <p className="text-white/60 text-sm">Verifique relatórios e KPIs</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REFORÇO */}
                  {activeTab === 'reforco' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">🏃 Botão Reforço de Atendimento</h2>
                        <p className="text-white/60">Entre no salão como professor quando necessário</p>
                      </div>

                      <div className="bg-gradient-to-r from-red-500/20 to-red-500/5 rounded-2xl p-6 border border-red-500/30">
                        <h3 className="text-xl font-bold mb-4 text-red-400">🚨 Quando Usar?</h3>
                        <p className="text-white/70 mb-4">
                          O botão <strong>"🏃 Reforço"</strong> aparece no header <strong>apenas para supervisores</strong>.
                          Use quando:
                        </p>
                        <ul className="text-white/60 space-y-2">
                          <li>• O nível de atendimento está <strong className="text-red-400">CRÍTICO</strong></li>
                          <li>• O sistema solicitar reforço via alerta</li>
                          <li>• A equipe precisar de ajuda no salão</li>
                          <li>• Você receber WhatsApp de alerta crítico</li>
                        </ul>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📍 Como Funciona</h3>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 justify-center">
                            <div className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold">
                              🏃 Reforço
                            </div>
                            <span className="text-white/60">← Estado inicial (você NÃO está no salão)</span>
                          </div>
                          <div className="text-center text-white/40 text-2xl">↓ Clique ↓</div>
                          <div className="flex items-center gap-4 justify-center">
                            <div className="px-4 py-2 rounded-lg bg-green-500/30 border border-green-500/50 text-green-400 font-bold">
                              ✅ No Salão
                            </div>
                            <span className="text-white/60">← Você agora CONTA como professor</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-500/10 rounded-2xl p-6 border border-green-500/30">
                        <h3 className="text-xl font-bold mb-4 text-green-400">✅ Resultado</h3>
                        <ul className="text-white/70 space-y-2">
                          <li>• Você é contado como <strong>+1 professor</strong> no ratio</li>
                          <li>• O nível de atendimento <strong>melhora automaticamente</strong></li>
                          <li>• Os tempos de atendimento <strong>aumentam</strong> (mais folga para a equipe)</li>
                          <li>• Para sair do salão, <strong>clique novamente</strong> no botão</li>
                        </ul>
                      </div>

                      <div className="bg-yellow-500/10 rounded-2xl p-6 border border-yellow-500/30">
                        <h3 className="text-xl font-bold mb-4 text-yellow-400">💡 Dica Importante</h3>
                        <p className="text-white/70">
                          Quando você faz login como Supervisor, você <strong>NÃO entra automaticamente</strong> no salão.
                          Isso é proposital! Assim você pode gerenciar sem afetar o ratio. 
                          Use o botão Reforço apenas quando realmente for ajudar no atendimento.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AMBIENTE - SUPERVISOR */}
                  {activeTab === 'ambiente' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">🚦 Alertas de Ambiente</h2>
                        <p className="text-white/60">Monitore o nível de atendimento da academia</p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📊 O Sistema Calcula</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="bg-black/30 rounded-xl p-4">
                            <p className="text-sm font-bold text-white/80 mb-2">1. Ratio de Capacidade</p>
                            <p className="text-white/60 text-xs">Alunos ativos ÷ Professores no salão</p>
                            <p className="text-white/40 text-xs mt-2">Não conta: cardio, personal, consultoria</p>
                          </div>
                          <div className="bg-black/30 rounded-xl p-4">
                            <p className="text-sm font-bold text-white/80 mb-2">2. Fila de Espera</p>
                            <p className="text-white/60 text-xs">Quantos cards aguardam muito tempo</p>
                            <p className="text-white/40 text-xs mt-2">5+ cards {'>'} 5min = CRÍTICO</p>
                          </div>
                        </div>
                      </div>

                      {/* Níveis */}
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 text-center">
                          <div className="text-3xl mb-2">💚</div>
                          <p className="font-bold text-green-400">ÓTIMO</p>
                          <p className="text-white/50 text-xs">≤5:1</p>
                          <p className="text-white/40 text-xs mt-2">Alerta: 15min</p>
                        </div>
                        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20 text-center">
                          <div className="text-3xl mb-2">💛</div>
                          <p className="font-bold text-yellow-400">BOM</p>
                          <p className="text-white/50 text-xs">6-10:1</p>
                          <p className="text-white/40 text-xs mt-2">Alerta: 10min</p>
                        </div>
                        <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20 text-center">
                          <div className="text-3xl mb-2">🟠</div>
                          <p className="font-bold text-orange-400">BAIXO</p>
                          <p className="text-white/50 text-xs">11-15:1</p>
                          <p className="text-white/40 text-xs mt-2">Alerta: 5min</p>
                        </div>
                        <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 text-center">
                          <div className="text-3xl mb-2">🔴</div>
                          <p className="font-bold text-red-400">CRÍTICO</p>
                          <p className="text-white/50 text-xs">16+:1</p>
                          <p className="text-white/40 text-xs mt-2">3min + WhatsApp</p>
                        </div>
                      </div>

                      <div className="bg-red-500/10 rounded-2xl p-6 border border-red-500/30">
                        <h3 className="text-xl font-bold mb-4 text-red-400">🚨 Nível CRÍTICO - Você Recebe:</h3>
                        <ul className="text-white/60 space-y-2">
                          <li>• 📺 <strong>Alerta fullscreen</strong> a cada 3 minutos</li>
                          <li>• 🔊 <strong>Som de alerta</strong> (se não mudo)</li>
                          <li>• 📱 <strong>WhatsApp automático</strong> no seu celular</li>
                        </ul>
                        <p className="text-red-300 mt-4 font-bold">➡️ Use o botão "🏃 Reforço" para ajudar!</p>
                      </div>
                    </div>
                  )}

                  {/* NOTIFICAÇÕES */}
                  {activeTab === 'notificacoes' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">🔔 Sistema de Notificações</h2>
                        <p className="text-white/60">Gerencie as demandas dos professores</p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📥 Tipos de Notificações</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                            <h4 className="font-bold text-red-400">📋 Inserir Ficha</h4>
                            <p className="text-white/50 text-xs">Aluno sem ficha de treino</p>
                          </div>
                          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <h4 className="font-bold text-blue-400">📊 Agendar Avaliação</h4>
                            <p className="text-white/50 text-xs">Aluno precisa de avaliação física</p>
                          </div>
                          <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                            <h4 className="font-bold text-purple-400">📈 Agendar Monitoramento</h4>
                            <p className="text-white/50 text-xs">Aluno precisa de acompanhamento</p>
                          </div>
                          <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                            <h4 className="font-bold text-yellow-400">⏭️ Aluno Pulado 3x</h4>
                            <p className="text-white/50 text-xs">Verificar situação do aluno</p>
                          </div>
                          <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                            <h4 className="font-bold text-orange-400">⏱️ Atendimento Longo</h4>
                            <p className="text-white/50 text-xs">Atendimento excedeu 1 minuto</p>
                          </div>
                          <div className="p-4 bg-gray-500/10 rounded-xl border border-gray-500/20">
                            <h4 className="font-bold text-gray-400">🏋️ Personal/Consultoria</h4>
                            <p className="text-white/50 text-xs">Marcar aluno como acompanhado</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-purple-500/10 rounded-2xl p-6 border border-purple-500/30">
                        <h3 className="text-xl font-bold mb-4 text-purple-400">📍 Onde Ver?</h3>
                        <p className="text-white/70">
                          Acesse <strong>/supervisao</strong> ou clique no botão "Supervisão" no header.
                          O contador de pendências aparece em vermelho no botão.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* AÇÕES EVO */}
                  {activeTab === 'acoes' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">⚡ Ações no EVO</h2>
                        <p className="text-white/60">O que você precisa fazer no sistema EVO</p>
                      </div>

                      <div className="bg-gradient-to-r from-green-500/10 to-transparent rounded-2xl p-6 border border-green-500/20">
                        <h3 className="text-xl font-bold mb-4 text-green-400">📋 Inserir Ficha de Treino</h3>
                        <ol className="text-white/70 space-y-2 text-sm">
                          <li>1. Acesse o EVO → Alunos → Buscar aluno</li>
                          <li>2. Vá em "Ficha de Treino"</li>
                          <li>3. Selecione ou crie a ficha adequada</li>
                          <li>4. Defina a data de validade (30 dias recomendado)</li>
                          <li>5. Salve e marque a notificação como resolvida</li>
                        </ol>
                      </div>

                      <div className="bg-gradient-to-r from-blue-500/10 to-transparent rounded-2xl p-6 border border-blue-500/20">
                        <h3 className="text-xl font-bold mb-4 text-blue-400">📊 Agendar Avaliação Física</h3>
                        <ol className="text-white/70 space-y-2 text-sm">
                          <li>1. Acesse o EVO → Agenda → Avaliações</li>
                          <li>2. Encontre um horário disponível</li>
                          <li>3. Vincule ao aluno</li>
                          <li>4. Confirme e marque a notificação como resolvida</li>
                        </ol>
                      </div>

                      <div className="bg-gradient-to-r from-purple-500/10 to-transparent rounded-2xl p-6 border border-purple-500/20">
                        <h3 className="text-xl font-bold mb-4 text-purple-400">📈 Registrar Monitoramento</h3>
                        <ol className="text-white/70 space-y-2 text-sm">
                          <li>1. Acesse o EVO → Vendas → Serviços</li>
                          <li>2. Registre a venda de monitoramento</li>
                          <li>3. O sistema detectará automaticamente no próximo sync</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* EQUIPE */}
                  {activeTab === 'equipe' && (
                    <div className="space-y-8">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">👥 Gestão da Equipe</h2>
                        <p className="text-white/60">Extraia o melhor de cada professor</p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-6">📋 O Que Supervisionar</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                              <h4 className="font-bold text-red-300">🎯 Priorização</h4>
                              <p className="text-white/60 text-sm">Estão atendendo vermelhos primeiro?</p>
                            </div>
                            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                              <h4 className="font-bold text-orange-300">⏱️ Tempo de Resposta</h4>
                              <p className="text-white/60 text-sm">Alunos esperando muito?</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                              <h4 className="font-bold text-green-300">📝 Qualidade dos Registros</h4>
                              <p className="text-white/60 text-sm">Notificações com detalhes?</p>
                            </div>
                            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                              <h4 className="font-bold text-blue-300">💡 Proatividade</h4>
                              <p className="text-white/60 text-sm">Oferecendo ajuda ou esperando?</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-500/20 to-purple-500/5 rounded-2xl p-6 border border-purple-500/30">
                        <h3 className="text-xl font-bold mb-4 text-purple-400">🌟 Como Motivar</h3>
                        <ul className="space-y-3 text-white/80">
                          <li>✓ Reconheça PUBLICAMENTE os bons atendimentos</li>
                          <li>✓ Compartilhe feedbacks positivos dos alunos</li>
                          <li>✓ Faça reuniões rápidas de alinhamento</li>
                          <li>✓ <strong>Corrija em PARTICULAR, elogie em PÚBLICO</strong></li>
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ============================================================ */}
              {/* CONTEÚDO DO ADMIN */}
              {/* ============================================================ */}
              {role === 'admin' && (
                <>
                  {/* VISÃO GERAL */}
                  {activeTab === 'visao' && (
                    <div className="space-y-8">
                      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] p-8 md:p-12">
                        <div className="relative z-10">
                          <h2 className="text-4xl md:text-5xl font-black mb-4">Painel Administrativo 🔧</h2>
                          <p className="text-xl md:text-2xl text-white/90 max-w-2xl">
                            Configure e monitore todos os aspectos do sistema IronCoach.
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                          <h3 className="text-xl font-bold mb-4">🔧 Configurações</h3>
                          <p className="text-white/60 text-sm">Ajuste ratios, tempos, frequência de alertas.</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                          <h3 className="text-xl font-bold mb-4">📊 Relatórios</h3>
                          <p className="text-white/60 text-sm">Histórico de alertas, atendimentos e métricas.</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                          <h3 className="text-xl font-bold mb-4">🔗 Integrações</h3>
                          <p className="text-white/60 text-sm">Conexão com EVO e WhatsApp.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONFIGURAÇÕES */}
                  {activeTab === 'config' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">⚙️ Configurações do Sistema</h2>
                        <p className="text-white/60">Parâmetros ajustáveis do IronCoach</p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📊 Ratios de Capacidade</h3>
                        <div className="grid md:grid-cols-4 gap-4">
                          <div className="bg-green-500/10 p-4 rounded-xl text-center">
                            <p className="text-green-400 font-bold">ÓTIMO</p>
                            <p className="text-2xl font-black">≤ 5:1</p>
                          </div>
                          <div className="bg-yellow-500/10 p-4 rounded-xl text-center">
                            <p className="text-yellow-400 font-bold">BOM</p>
                            <p className="text-2xl font-black">6-10:1</p>
                          </div>
                          <div className="bg-orange-500/10 p-4 rounded-xl text-center">
                            <p className="text-orange-400 font-bold">BAIXO</p>
                            <p className="text-2xl font-black">11-15:1</p>
                          </div>
                          <div className="bg-red-500/10 p-4 rounded-xl text-center">
                            <p className="text-red-400 font-bold">CRÍTICO</p>
                            <p className="text-2xl font-black">16+:1</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">⏱️ Tempos Base (Nível Ótimo)</h3>
                        <div className="grid md:grid-cols-4 gap-4">
                          <div className="bg-red-500/10 p-4 rounded-xl text-center">
                            <p className="text-red-400 font-bold">🔴 Vermelho</p>
                            <p className="text-2xl font-black">3:30</p>
                          </div>
                          <div className="bg-orange-500/10 p-4 rounded-xl text-center">
                            <p className="text-orange-400 font-bold">🟠 Laranja</p>
                            <p className="text-2xl font-black">4:30</p>
                          </div>
                          <div className="bg-yellow-500/10 p-4 rounded-xl text-center">
                            <p className="text-yellow-400 font-bold">🟡 Amarelo</p>
                            <p className="text-2xl font-black">5:30</p>
                          </div>
                          <div className="bg-green-500/10 p-4 rounded-xl text-center">
                            <p className="text-green-400 font-bold">🟢 Verde</p>
                            <p className="text-2xl font-black">6:30</p>
                          </div>
                        </div>
                        <p className="text-white/50 text-sm mt-4">
                          Ajustes por nível: -30s (vermelho/laranja), -15s (amarelo/verde)
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">🔔 Frequência de Alertas</h3>
                        <div className="grid md:grid-cols-4 gap-4 text-center">
                          <div><p className="text-green-400">ÓTIMO</p><p className="font-bold">15 min</p></div>
                          <div><p className="text-yellow-400">BOM</p><p className="font-bold">10 min</p></div>
                          <div><p className="text-orange-400">BAIXO</p><p className="font-bold">5 min</p></div>
                          <div><p className="text-red-400">CRÍTICO</p><p className="font-bold">3 min</p></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AMBIENTE - ADMIN */}
                  {activeTab === 'ambiente' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">🚦 Sistema de Alertas</h2>
                        <p className="text-white/60">Visão técnica do sistema de ambiente</p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">🔄 Fluxo do Sistema</h3>
                        <div className="space-y-4 text-white/70 text-sm">
                          <p>1. <strong>Login Professor:</strong> Entra automaticamente no FLOOR</p>
                          <p>2. <strong>Login Supervisor:</strong> NÃO entra no FLOOR automaticamente</p>
                          <p>3. <strong>A cada 10s:</strong> Sistema recalcula ratio e nível</p>
                          <p>4. <strong>Alerta:</strong> Exibe fullscreen conforme frequência do nível</p>
                          <p>5. <strong>CRÍTICO:</strong> Envia WhatsApp + Alerta sonoro</p>
                          <p>6. <strong>Reforço:</strong> Supervisor pode entrar no floor manualmente</p>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📋 Tabelas do Banco</h3>
                        <ul className="text-white/60 space-y-2 text-sm font-mono">
                          <li>• environment_config - Configurações</li>
                          <li>• coach_floor_status - Quem está no salão</li>
                          <li>• environment_alerts_history - Histórico de alertas</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* WHATSAPP */}
                  {activeTab === 'whatsapp' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">📱 Integração WhatsApp</h2>
                        <p className="text-white/60">Notificações automáticas para supervisores</p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">🔧 Provedores Suportados</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="bg-green-500/10 p-4 rounded-xl">
                            <h4 className="font-bold text-green-400">CallMeBot</h4>
                            <p className="text-white/50 text-xs">Gratuito, fácil configuração</p>
                          </div>
                          <div className="bg-blue-500/10 p-4 rounded-xl">
                            <h4 className="font-bold text-blue-400">Evolution API</h4>
                            <p className="text-white/50 text-xs">Self-hosted, mais controle</p>
                          </div>
                          <div className="bg-purple-500/10 p-4 rounded-xl">
                            <h4 className="font-bold text-purple-400">Twilio</h4>
                            <p className="text-white/50 text-xs">Pago, mais confiável</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">⚙️ Configuração CallMeBot (Gratuito)</h3>
                        <ol className="text-white/60 space-y-2 text-sm">
                          <li>1. Acesse https://www.callmebot.com/blog/free-api-whatsapp-messages/</li>
                          <li>2. Envie a mensagem de ativação para o número do bot</li>
                          <li>3. Receba sua API KEY</li>
                          <li>4. Configure no .env:</li>
                        </ol>
                        <div className="mt-4 font-mono text-xs bg-black/30 p-3 rounded-lg text-white/60">
                          <p>WHATSAPP_PROVIDER=callmebot</p>
                          <p>CALLMEBOT_API_KEY=sua_api_key</p>
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📞 Número do Supervisor</h3>
                        <p className="text-white/60 text-sm mb-4">
                          Configure na tabela <code className="bg-black/30 px-2 py-1 rounded">environment_config</code>, 
                          campo <code className="bg-black/30 px-2 py-1 rounded">supervisor_whatsapp</code>.
                        </p>
                        <p className="text-white/50 text-xs">
                          Formato: 5531999999999 (código país + DDD + número, sem espaços)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* INTEGRAÇÃO EVO */}
                  {activeTab === 'integracao' && (
                    <div className="space-y-6">
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black mb-2">🔗 Integração EVO</h2>
                        <p className="text-white/60">Conexão com o sistema de gestão</p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-bold mb-4">📥 Dados Recebidos</h3>
                        <ul className="text-white/60 space-y-2 text-sm">
                          <li>• Check-ins via webhook (tempo real)</li>
                          <li>• Dados do aluno (nome, data de início, etc.)</li>
                          <li>• Ficha de treino e data de expiração</li>
                          <li>• Avaliações físicas</li>
                          <li>• Vendas de monitoramento</li>
                          <li>• Frequência e visitas anteriores</li>
                        </ul>
                      </div>

                      <div className="bg-yellow-500/10 rounded-2xl p-6 border border-yellow-500/30">
                        <h3 className="text-xl font-bold mb-4 text-yellow-400">⚠️ Variáveis de Ambiente</h3>
                        <div className="font-mono text-xs text-white/60 space-y-1">
                          <p>EVO_API_TOKEN=xxx</p>
                          <p>EVO_BRANCH_ID=xxx</p>
                          <p>EVO_API_URL=https://evo-integracao.w12app.com.br</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-white/10 py-4 bg-black/95">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/40 text-sm">
          IronCoach v16 • Academia Impacto • Transformando Vidas 💪
        </div>
      </footer>
    </div>
  );
}
