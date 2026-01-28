'use client';

// ============================================================================
// IRONCOACH v14 - Guia Completo de Treinamento para Professores
// ============================================================================

import { useState } from 'react';

export default function PrioridadesPage() {
  const [activeTab, setActiveTab] = useState<'visao' | 'cores' | 'retencao' | 'fila' | 'cards' | 'funcoes' | 'acoes'>('visao');

  const tabs = [
    { id: 'visao', label: '👁️ Visão Geral', icon: '👁️' },
    { id: 'cores', label: '🎨 Sistema de Cores', icon: '🎨' },
    { id: 'retencao', label: '📊 Score de Retenção', icon: '📊' },
    { id: 'fila', label: '📋 Ordem da Fila', icon: '📋' },
    { id: 'cards', label: '🃏 Entendendo os Cards', icon: '🃏' },
    { id: 'funcoes', label: '⚙️ Funções do Sistema', icon: '⚙️' },
    { id: 'acoes', label: '⚡ Ações Recomendadas', icon: '⚡' },
  ];

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* Header Fixo */}
      <header className="shrink-0 bg-black/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF3B30] to-[#FF6347] flex items-center justify-center font-black text-xl">I</div>
            <div>
              <h1 className="text-lg font-black">IRON<span className="text-[#FF3B30]">COACH</span></h1>
              <p className="text-xs text-white/40">Guia de Treinamento v14</p>
            </div>
          </div>
          <a href="/" className="px-4 py-2 bg-[#FF3B30] hover:bg-[#FF4D3D] rounded-lg font-bold text-sm transition-all">
            ← Voltar ao Dashboard
          </a>
        </div>
      </header>

      {/* Tabs Fixas */}
      <nav className="shrink-0 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#FF3B30] text-white' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Conteúdo com Scroll */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* ================================================================ */}
        {/* TAB: VISÃO GERAL */}
        {/* ================================================================ */}
        {activeTab === 'visao' && (
          <div className="space-y-8">
            {/* Hero */}
            <div className="text-center mb-12 bg-gradient-to-b from-[#FF3B30]/10 to-transparent rounded-2xl p-8">
              <h2 className="text-4xl font-black mb-4">🏋️ Bem-vindo ao IronCoach!</h2>
              <p className="text-xl text-white/60 max-w-3xl mx-auto">
                O IronCoach é um sistema inteligente que ajuda você a identificar quais alunos precisam 
                de mais atenção, reduzindo a desistência e melhorando a experiência de todos.
              </p>
            </div>

            {/* Conceitos Principais */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-4xl mb-4">🎨</div>
                <h3 className="text-lg font-bold mb-2">Sistema de Cores</h3>
                <p className="text-white/60 text-sm">
                  Cada aluno recebe uma cor baseada na sua situação. Vermelho = urgente, Verde = estável.
                </p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-bold mb-2">Tanque de Retenção</h3>
                <p className="text-white/60 text-sm">
                  Mostra a chance do aluno continuar na academia. Quanto mais cheio, melhor!
                </p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-4xl mb-4">⏱️</div>
                <h3 className="text-lg font-bold mb-2">Timer Inteligente</h3>
                <p className="text-white/60 text-sm">
                  Mostra quanto tempo falta para o próximo atendimento. Se negativo, está atrasado!
                </p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-4xl mb-4">🔺</div>
                <h3 className="text-lg font-bold mb-2">Alerta de Atenção</h3>
                <p className="text-white/60 text-sm">
                  Cards que piscam com triângulo vermelho indicam alunos com alto risco de desistência.
                </p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-bold mb-2">Fila Inteligente</h3>
                <p className="text-white/60 text-sm">
                  A ordem da fila é calculada automaticamente por tempo restante, não só pela cor.
                </p>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-4xl mb-4">🔵</div>
                <h3 className="text-lg font-bold mb-2">Personal/Autônomo</h3>
                <p className="text-white/60 text-sm">
                  Alunos de personal ou autônomos ficam separados e não precisam de atendimento ativo.
                </p>
              </div>
            </div>

            {/* Fluxo de Trabalho */}
            <div className="bg-gradient-to-r from-[#007AFF]/10 to-[#30D158]/10 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6">📌 Fluxo de Trabalho Recomendado</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#FF3B30] flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
                  <h4 className="font-bold mb-1">Olhe a Fila</h4>
                  <p className="text-sm text-white/60">Veja quem está no topo (menor tempo restante)</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#FF9500] flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
                  <h4 className="font-bold mb-1">Verifique o Card</h4>
                  <p className="text-sm text-white/60">Veja cor, tanque, ficha e avaliação</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#FFCC00] flex items-center justify-center text-xl font-bold mx-auto mb-3 text-black">3</div>
                  <h4 className="font-bold mb-1">Clique em Atender</h4>
                  <p className="text-sm text-white/60">O card expande com sugestões de intervenção</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#30D158] flex items-center justify-center text-xl font-bold mx-auto mb-3">4</div>
                  <h4 className="font-bold mb-1">Finalize</h4>
                  <p className="text-sm text-white/60">Clique em Finalizar quando terminar</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: SISTEMA DE CORES */}
        {/* ================================================================ */}
        {activeTab === 'cores' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">🎨 Sistema de Cores de Prioridade</h2>
              <p className="text-white/60">Cada cor indica a urgência do atendimento</p>
            </div>

            {/* VERMELHO */}
            <div className="bg-gradient-to-r from-[#FF3B30]/20 to-transparent border-l-4 border-[#FF3B30] rounded-r-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#FF3B30] flex items-center justify-center text-3xl shrink-0">🔴</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#FF3B30] mb-2">VERMELHO - Prioridade MÁXIMA</h3>
                  <p className="text-white/70 mb-4">Alto risco de desistência. Atender IMEDIATAMENTE!</p>
                  
                  <div className="bg-black/30 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2 text-[#FF3B30]">Quando fica VERMELHO:</h4>
                    <ul className="space-y-1 text-sm text-white/80">
                      <li>• <strong>1ª semana na academia</strong> (dias 1-7)</li>
                      <li>• <strong>Novato sem ficha</strong> de treino</li>
                      <li>• <strong>Pediu ajuda</strong> (botão SOS)</li>
                      <li>• Intermediário com <strong>risco CRÍTICO</strong> de desistência</li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1 bg-[#FF3B30]/20 rounded-full text-[#FF3B30]">⏱️ Intervalo: 2 min</span>
                    <span className="px-3 py-1 bg-[#FF3B30]/20 rounded-full text-[#FF3B30]">⏳ Atendimento: 25s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* LARANJA */}
            <div className="bg-gradient-to-r from-[#FF9500]/20 to-transparent border-l-4 border-[#FF9500] rounded-r-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#FF9500] flex items-center justify-center text-3xl shrink-0">🟠</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#FF9500] mb-2">LARANJA - Prioridade ALTA</h3>
                  <p className="text-white/70 mb-4">Precisa de acompanhamento próximo.</p>
                  
                  <div className="bg-black/30 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2 text-[#FF9500]">Quando fica LARANJA:</h4>
                    <ul className="space-y-1 text-sm text-white/80">
                      <li>• <strong>2ª semana</strong> (dias 8-14) com ficha</li>
                      <li>• <strong>Intermediário sem ficha</strong> (mês 2-3)</li>
                      <li>• <strong>Veterano com risco</strong> de churn</li>
                      <li>• Veterano com ficha/avaliação <strong>vencida</strong></li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1 bg-[#FF9500]/20 rounded-full text-[#FF9500]">⏱️ Intervalo: 3 min</span>
                    <span className="px-3 py-1 bg-[#FF9500]/20 rounded-full text-[#FF9500]">⏳ Atendimento: 20s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AMARELO */}
            <div className="bg-gradient-to-r from-[#FFCC00]/20 to-transparent border-l-4 border-[#FFCC00] rounded-r-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#FFCC00] flex items-center justify-center text-3xl shrink-0">🟡</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#FFCC00] mb-2">AMARELO - Prioridade MÉDIA</h3>
                  <p className="text-white/70 mb-4">Em fase de adaptação, precisa de check-ins regulares.</p>
                  
                  <div className="bg-black/30 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2 text-[#FFCC00]">Quando fica AMARELO:</h4>
                    <ul className="space-y-1 text-sm text-white/80">
                      <li>• <strong>Mês 2</strong> (dias 31-60) com ficha</li>
                      <li>• <strong>Veterano sem ficha</strong> (precisa criar)</li>
                      <li>• Veterano com <strong>ficha vencida</strong></li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1 bg-[#FFCC00]/20 rounded-full text-[#FFCC00]">⏱️ Intervalo: 4 min</span>
                    <span className="px-3 py-1 bg-[#FFCC00]/20 rounded-full text-[#FFCC00]">⏳ Atendimento: 15s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* VERDE */}
            <div className="bg-gradient-to-r from-[#30D158]/20 to-transparent border-l-4 border-[#30D158] rounded-r-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#30D158] flex items-center justify-center text-3xl shrink-0">🟢</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#30D158] mb-2">VERDE - Estável</h3>
                  <p className="text-white/70 mb-4">Aluno em dia, treina regularmente.</p>
                  
                  <div className="bg-black/30 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2 text-[#30D158]">Quando fica VERDE:</h4>
                    <ul className="space-y-1 text-sm text-white/80">
                      <li>• <strong>Mês 3</strong> (dias 61-90) com ficha e sem risco</li>
                      <li>• <strong>Veterano OK</strong> (90+ dias, ficha em dia, frequência boa)</li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1 bg-[#30D158]/20 rounded-full text-[#30D158]">⏱️ Intervalo: 5 min</span>
                    <span className="px-3 py-1 bg-[#30D158]/20 rounded-full text-[#30D158]">⏳ Atendimento: 10s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AZUL */}
            <div className="bg-gradient-to-r from-[#007AFF]/20 to-transparent border-l-4 border-[#007AFF] rounded-r-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#007AFF] flex items-center justify-center text-3xl shrink-0">🔵</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#007AFF] mb-2">AZUL - Personal / Autônomo</h3>
                  <p className="text-white/70 mb-4">Não precisa de atendimento ativo. Ficam separados na fila.</p>
                  
                  <div className="bg-black/30 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold mb-2 text-[#007AFF]">Quando fica AZUL:</h4>
                    <ul className="space-y-1 text-sm text-white/80">
                      <li>• Aluno de <strong>Personal Trainer</strong></li>
                      <li>• Aluno <strong>autônomo</strong> (treina sozinho por opção)</li>
                      <li>• Identificado pelo plano ou nome com "PERSONAL"</li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-3 py-1 bg-[#007AFF]/20 rounded-full text-[#007AFF]">⏱️ Sem alerta automático</span>
                    <span className="px-3 py-1 bg-[#007AFF]/20 rounded-full text-[#007AFF]">Atenda apenas se pedir</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: SCORE DE RETENÇÃO */}
        {/* ================================================================ */}
        {activeTab === 'retencao' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">📊 Score de Retenção (Tanque)</h2>
              <p className="text-white/60">O tanque mostra a probabilidade do aluno continuar na academia</p>
            </div>

            {/* Visualização do Tanque */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-6">Como Ler o Tanque</h3>
              <div className="flex justify-center gap-8 mb-8">
                {[
                  { level: 85, color: '#30D158', label: 'Excelente' },
                  { level: 65, color: '#FFCC00', label: 'Bom' },
                  { level: 40, color: '#FF9500', label: 'Atenção' },
                  { level: 20, color: '#FF3B30', label: 'Crítico' },
                ].map((tank, i) => (
                  <div key={i} className="text-center">
                    <div 
                      className="w-12 h-24 bg-black/50 rounded-lg flex flex-col justify-end overflow-hidden mx-auto mb-2"
                      style={{ border: `2px solid ${tank.color}40` }}
                    >
                      <div 
                        style={{ 
                          height: `${tank.level}%`, 
                          background: `linear-gradient(0deg, ${tank.color} 0%, ${tank.color}99 100%)`,
                          borderRadius: '0 0 6px 6px',
                        }} 
                      />
                    </div>
                    <p className="text-2xl font-bold" style={{ color: tank.color }}>{tank.level}%</p>
                    <p className="text-xs text-white/50">{tank.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Fórmula */}
            <div className="bg-gradient-to-r from-[#007AFF]/10 to-[#30D158]/10 rounded-2xl p-8">
              <h3 className="text-xl font-bold mb-6">📐 Como o Score é Calculado</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-black/30 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">🏃</div>
                  <p className="text-2xl font-bold text-[#007AFF]">50%</p>
                  <p className="text-sm text-white/60">Frequência</p>
                  <p className="text-xs text-white/40 mt-2">Compara últimas semanas</p>
                </div>
                <div className="bg-black/30 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-2xl font-bold text-[#FF9500]">25%</p>
                  <p className="text-sm text-white/60">Ficha de Treino</p>
                  <p className="text-xs text-white/40 mt-2">Tem ficha? Está em dia?</p>
                </div>
                <div className="bg-black/30 rounded-xl p-4 text-center">
                  <div className="text-3xl mb-2">📊</div>
                  <p className="text-2xl font-bold text-[#30D158]">25%</p>
                  <p className="text-sm text-white/60">Avaliação Física</p>
                  <p className="text-xs text-white/40 mt-2">Tem avaliação? Está em dia?</p>
                </div>
              </div>
            </div>

            {/* Multiplicadores */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-6">🎯 Multiplicadores por Fase</h3>
              <p className="text-white/60 mb-4">Novatos são mais sensíveis a problemas, então o impacto é maior:</p>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-[#FF3B30]/10 rounded-xl p-4 text-center border border-[#FF3B30]/30">
                  <p className="text-sm text-white/60">Onboarding (1-30d)</p>
                  <p className="text-3xl font-bold text-[#FF3B30]">×2.0</p>
                </div>
                <div className="bg-[#FF9500]/10 rounded-xl p-4 text-center border border-[#FF9500]/30">
                  <p className="text-sm text-white/60">Adaptação (31-60d)</p>
                  <p className="text-3xl font-bold text-[#FF9500]">×1.5</p>
                </div>
                <div className="bg-[#FFCC00]/10 rounded-xl p-4 text-center border border-[#FFCC00]/30">
                  <p className="text-sm text-white/60">Consolidação (61-90d)</p>
                  <p className="text-3xl font-bold text-[#FFCC00]">×1.0</p>
                </div>
                <div className="bg-[#30D158]/10 rounded-xl p-4 text-center border border-[#30D158]/30">
                  <p className="text-sm text-white/60">Autonomia (90+d)</p>
                  <p className="text-3xl font-bold text-[#30D158]">×0.8</p>
                </div>
              </div>
            </div>

            {/* Alerta Visual */}
            <div className="bg-[#FF3B30]/10 rounded-2xl p-8 border border-[#FF3B30]/30">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="text-3xl">🔺</span> Alerta Visual (Card Piscando)
              </h3>
              <p className="text-white/70 mb-4">
                Quando um aluno tem <strong>menos de 50% de retenção</strong>, o card dele começa a piscar 
                alternando entre o visual normal e um card preto com triângulo vermelho de ATENÇÃO.
              </p>
              <div className="flex items-center gap-4">
                <div className="bg-black rounded-xl p-6 border-2 border-[#FF3B30] text-center">
                  <div className="text-4xl mb-2">⚠️</div>
                  <p className="text-[#FF3B30] font-bold">ATENÇÃO</p>
                  <p className="text-xs text-white/50">Card pisca assim</p>
                </div>
                <div className="text-2xl">↔️</div>
                <div className="bg-[#1a1a1a] rounded-xl p-6 border-2 border-[#FF3B30] text-center">
                  <p className="font-bold">Card Normal</p>
                  <p className="text-xs text-white/50">Com informações</p>
                </div>
              </div>
              <p className="text-sm text-[#FF3B30] mt-4">
                ⚡ Alunos com triângulo piscando são PRIORIDADE ABSOLUTA!
              </p>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: ORDEM DA FILA */}
        {/* ================================================================ */}
        {activeTab === 'fila' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">📋 Como a Fila é Ordenada</h2>
              <p className="text-white/60">Entenda a lógica de "tempo restante" para próximo atendimento</p>
            </div>

            {/* Conceito */}
            <div className="bg-gradient-to-r from-[#007AFF]/10 to-transparent rounded-2xl p-8 border border-[#007AFF]/30">
              <h3 className="text-xl font-bold mb-4">💡 O Conceito</h3>
              <p className="text-white/70 mb-4">
                A fila NÃO é ordenada apenas pela cor. Ela usa o conceito de <strong>"tempo restante para próximo atendimento"</strong>.
              </p>
              <div className="bg-black/30 rounded-xl p-4">
                <p className="font-mono text-center text-lg">
                  <span className="text-[#007AFF]">Tempo Restante</span> = 
                  <span className="text-[#30D158]"> Intervalo da Cor</span> - 
                  <span className="text-[#FF9500]"> Tempo Esperando</span>
                </p>
              </div>
            </div>

            {/* Intervalos por Cor */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-6">⏱️ Intervalo de Atendimento por Cor</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-[#FF3B30]/10 rounded-xl border border-[#FF3B30]/30">
                  <div className="text-2xl mb-2">🔴</div>
                  <p className="text-3xl font-bold text-[#FF3B30]">2 min</p>
                  <p className="text-xs text-white/50">Vermelho</p>
                </div>
                <div className="text-center p-4 bg-[#FF9500]/10 rounded-xl border border-[#FF9500]/30">
                  <div className="text-2xl mb-2">🟠</div>
                  <p className="text-3xl font-bold text-[#FF9500]">3 min</p>
                  <p className="text-xs text-white/50">Laranja</p>
                </div>
                <div className="text-center p-4 bg-[#FFCC00]/10 rounded-xl border border-[#FFCC00]/30">
                  <div className="text-2xl mb-2">🟡</div>
                  <p className="text-3xl font-bold text-[#FFCC00]">4 min</p>
                  <p className="text-xs text-white/50">Amarelo</p>
                </div>
                <div className="text-center p-4 bg-[#30D158]/10 rounded-xl border border-[#30D158]/30">
                  <div className="text-2xl mb-2">🟢</div>
                  <p className="text-3xl font-bold text-[#30D158]">5 min</p>
                  <p className="text-xs text-white/50">Verde</p>
                </div>
              </div>
            </div>

            {/* Exemplo Prático */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-6">📊 Exemplo Prático</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4">Aluno</th>
                      <th className="text-center py-3 px-4">Cor</th>
                      <th className="text-center py-3 px-4">Intervalo</th>
                      <th className="text-center py-3 px-4">Atendido há</th>
                      <th className="text-center py-3 px-4">Tempo Restante</th>
                      <th className="text-center py-3 px-4">Posição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="py-3 px-4">João</td>
                      <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-[#FF3B30]/20 text-[#FF3B30] rounded">🔴</span></td>
                      <td className="py-3 px-4 text-center">2 min</td>
                      <td className="py-3 px-4 text-center">1 min</td>
                      <td className="py-3 px-4 text-center font-bold text-[#FF3B30]">1 min</td>
                      <td className="py-3 px-4 text-center font-bold">1º</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 px-4">Maria</td>
                      <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-[#FFCC00]/20 text-[#FFCC00] rounded">🟡</span></td>
                      <td className="py-3 px-4 text-center">4 min</td>
                      <td className="py-3 px-4 text-center">3 min</td>
                      <td className="py-3 px-4 text-center font-bold text-[#FFCC00]">1 min</td>
                      <td className="py-3 px-4 text-center font-bold">2º</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 px-4">Ana</td>
                      <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-[#FF3B30]/20 text-[#FF3B30] rounded">🔴</span></td>
                      <td className="py-3 px-4 text-center">2 min</td>
                      <td className="py-3 px-4 text-center">0 min</td>
                      <td className="py-3 px-4 text-center font-bold text-[#30D158]">2 min</td>
                      <td className="py-3 px-4 text-center font-bold">3º</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3 px-4">Pedro</td>
                      <td className="py-3 px-4 text-center"><span className="px-2 py-1 bg-[#30D158]/20 text-[#30D158] rounded">🟢</span></td>
                      <td className="py-3 px-4 text-center">5 min</td>
                      <td className="py-3 px-4 text-center">2 min</td>
                      <td className="py-3 px-4 text-center font-bold text-[#30D158]">3 min</td>
                      <td className="py-3 px-4 text-center font-bold">4º</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-[#FF9500]/10 rounded-xl border border-[#FF9500]/30">
                <p className="text-sm text-[#FF9500]">
                  <strong>💡 Note:</strong> Ana é vermelha mas acabou de ser atendida (0 min), então fica ATRÁS de Pedro (verde) 
                  que está esperando há mais tempo proporcionalmente ao seu intervalo.
                </p>
              </div>
            </div>

            {/* Regra de Ouro */}
            <div className="bg-gradient-to-r from-[#FFD700]/10 to-transparent rounded-2xl p-8 border border-[#FFD700]/30">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>👑</span> Regra de Ouro
              </h3>
              <p className="text-lg text-white/80">
                <strong>Quem pediu AJUDA (SOS)</strong> sempre vai para o topo da fila, independente de cor ou tempo.
              </p>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: ENTENDENDO OS CARDS */}
        {/* ================================================================ */}
        {activeTab === 'cards' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">🃏 Entendendo os Cards</h2>
              <p className="text-white/60">Cada elemento do card tem uma função específica</p>
            </div>

            {/* Anatomia do Card */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-6">🔍 Anatomia do Card</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#FF3B30] flex items-center justify-center text-sm font-bold shrink-0">1</span>
                    <div>
                      <p className="font-bold">Borda Colorida</p>
                      <p className="text-sm text-white/60">Indica a prioridade (cor do aluno)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#FF9500] flex items-center justify-center text-sm font-bold shrink-0">2</span>
                    <div>
                      <p className="font-bold">Tanque de Retenção</p>
                      <p className="text-sm text-white/60">Mostra % de chance de continuar na academia</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#FFCC00] flex items-center justify-center text-sm font-bold shrink-0 text-black">3</span>
                    <div>
                      <p className="font-bold">Avatar com Iniciais ou ⚠️</p>
                      <p className="text-sm text-white/60">Se retenção &lt; 50%, mostra triângulo de alerta</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#30D158] flex items-center justify-center text-sm font-bold shrink-0">4</span>
                    <div>
                      <p className="font-bold">3 Caixas de Info</p>
                      <p className="text-sm text-white/60">Tempo na academia | Timer | Dias como membro</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center text-sm font-bold shrink-0">5</span>
                    <div>
                      <p className="font-bold">Status Ficha/Avaliação</p>
                      <p className="text-sm text-white/60">Mostra se tem ficha e avaliação em dia</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#AF52DE] flex items-center justify-center text-sm font-bold shrink-0">6</span>
                    <div>
                      <p className="font-bold">Botões ATENDER e 👋</p>
                      <p className="text-sm text-white/60">Iniciar atendimento ou liberar aluno</p>
                    </div>
                  </div>
                </div>
                
                {/* Card Visual */}
                <div className="bg-[#1a1a1a] rounded-xl p-4 border-2 border-[#FF3B30]" style={{ maxWidth: '320px' }}>
                  <div className="flex gap-3">
                    <div className="w-12 flex flex-col items-center">
                      <div className="w-5 h-14 bg-black/50 rounded flex flex-col justify-end overflow-hidden">
                        <div className="h-[65%] bg-[#FFCC00] rounded-b" />
                      </div>
                      <span className="text-xs font-bold text-[#FFCC00] mt-1">65%</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#FF3B30] flex items-center justify-center text-xs font-bold">JO</div>
                        <span className="font-bold text-sm">JOÃO SILVA</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 mb-2 text-center">
                        <div className="bg-white/5 rounded p-1">
                          <p className="text-xs">🏋️</p>
                          <p className="text-xs font-bold">45min</p>
                        </div>
                        <div className="bg-[#FF3B30]/20 rounded p-1">
                          <p className="text-xs">⏱️</p>
                          <p className="text-xs font-bold text-[#FF3B30]">-02:00</p>
                        </div>
                        <div className="bg-[#FF3B30]/20 rounded p-1">
                          <p className="text-xs">📅</p>
                          <p className="text-xs font-bold text-[#FF3B30]">5d</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        <div className="bg-[#FF3B30]/20 rounded px-2 py-1 text-xs text-[#FF6B6B]">📋 Sem ficha</div>
                        <div className="bg-[#30D158]/20 rounded px-2 py-1 text-xs text-[#4ADE80]">📊 Aval. ✓</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 bg-[#FF3B30] rounded-lg text-xs font-bold">⚡ URGENTE</button>
                        <button className="w-9 h-9 bg-[#FFCC00]/20 rounded-lg text-sm">👋</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer Explicado */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-6">⏱️ O Timer Explicado</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-[#30D158]/10 rounded-xl">
                  <p className="text-3xl font-mono font-bold text-[#30D158]">03:00</p>
                  <p className="text-sm text-white/60 mt-2">3 minutos restantes</p>
                  <p className="text-xs text-white/40">Tudo OK, pode atender outros</p>
                </div>
                <div className="text-center p-4 bg-[#FF9500]/10 rounded-xl">
                  <p className="text-3xl font-mono font-bold text-[#FF9500]">01:00</p>
                  <p className="text-sm text-white/60 mt-2">1 minuto restante</p>
                  <p className="text-xs text-white/40">Atenção, vai precisar em breve</p>
                </div>
                <div className="text-center p-4 bg-[#FF3B30]/10 rounded-xl animate-pulse">
                  <p className="text-3xl font-mono font-bold text-[#FF3B30]">-02:00</p>
                  <p className="text-sm text-white/60 mt-2">2 minutos ATRASADO</p>
                  <p className="text-xs text-white/40">Atender AGORA!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: FUNÇÕES DO SISTEMA */}
        {/* ================================================================ */}
        {activeTab === 'funcoes' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">⚙️ Funções do Sistema</h2>
              <p className="text-white/60">Todas as ferramentas disponíveis para você</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Botão Atender */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">⚡</span>
                  <h3 className="text-lg font-bold">Botão ATENDER</h3>
                </div>
                <p className="text-white/70 mb-4">
                  Clique para iniciar o atendimento. O card expande mostrando sugestões de intervenção 
                  e um timer que conta o tempo do atendimento.
                </p>
                <div className="bg-black/30 rounded-lg p-3 text-sm">
                  <p className="text-[#30D158]">✓ Timer conta tempo DECORRIDO (sem limite)</p>
                  <p className="text-[#30D158]">✓ Mostra sugestão baseada na fase do aluno</p>
                  <p className="text-[#30D158]">✓ Mostra status de ficha e avaliação</p>
                </div>
              </div>

              {/* Botão Checkout */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">👋</span>
                  <h3 className="text-lg font-bold">Botão LIBERAR (Checkout)</h3>
                </div>
                <p className="text-white/70 mb-4">
                  Clique quando o aluno terminar o treino ou for embora. Escolha o motivo:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-[#30D158]/10 rounded-lg">
                    <span>✅</span> <span>Terminou o treino</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-[#FF9500]/10 rounded-lg">
                    <span>🚶</span> <span>Saiu mais cedo</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    <span>❓</span> <span>Outro motivo</span>
                  </div>
                </div>
              </div>

              {/* Botão +Tempo */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">⏱️+</span>
                  <h3 className="text-lg font-bold">Botão +TEMPO</h3>
                </div>
                <p className="text-white/70 mb-4">
                  Durante o atendimento, você pode clicar em +TEMPO para registrar que 
                  está dedicando mais tempo a este aluno.
                </p>
                <div className="bg-black/30 rounded-lg p-3 text-sm">
                  <p className="text-white/60">Cada clique adiciona o tempo base da cor do aluno ao registro.</p>
                </div>
              </div>

              {/* Filtro Prioridades */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🔴</span>
                  <h3 className="text-lg font-bold">Filtro 1ª/2ª Semana</h3>
                </div>
                <p className="text-white/70 mb-4">
                  No header, clique no botão "1ª/2ª Semana" para destacar apenas os alunos novatos.
                </p>
                <div className="bg-black/30 rounded-lg p-3 text-sm">
                  <p className="text-[#FF3B30]">⚠️ Alunos com mais de 14 dias ficam escurecidos</p>
                  <p className="text-[#30D158]">✓ Ajuda a focar nos que mais precisam</p>
                </div>
              </div>

              {/* Gráfico Estatísticas */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">📊</span>
                  <h3 className="text-lg font-bold">Gráfico de Estatísticas</h3>
                </div>
                <p className="text-white/70 mb-4">
                  Na sidebar de Entradas, veja o gráfico que mostra quantos alunos de cada cor 
                  estão na academia e a média de retenção.
                </p>
                <div className="bg-black/30 rounded-lg p-3 text-sm space-y-1">
                  <p>🔴 12 alunos - 72% ret.</p>
                  <p>🟢 20 alunos - 85% ret.</p>
                  <p className="text-white/40">Total: 32 | Média: 78%</p>
                </div>
              </div>

              {/* Sidebar Entradas */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🚪</span>
                  <h3 className="text-lg font-bold">Sidebar de Entradas</h3>
                </div>
                <p className="text-white/70 mb-4">
                  Mostra em tempo real quem entrou na academia. Clique no nome para localizar o card na fila.
                </p>
                <div className="bg-black/30 rounded-lg p-3 text-sm">
                  <p className="text-[#30D158]">✓ Atualiza automaticamente a cada 5s</p>
                  <p className="text-white/60">• Alunos que saíram aparecem riscados</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: AÇÕES RECOMENDADAS */}
        {/* ================================================================ */}
        {activeTab === 'acoes' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">⚡ Ações Recomendadas por Situação</h2>
              <p className="text-white/60">O que fazer em cada cenário</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* 1ª Semana */}
              <div className="bg-white/5 rounded-xl p-6 border border-[#FF3B30]/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🆕</span>
                  <div>
                    <h4 className="font-bold">Aluno na 1ª SEMANA</h4>
                    <span className="text-xs text-[#FF3B30]">Prioridade MÁXIMA</span>
                  </div>
                </div>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF3B30] text-xs flex items-center justify-center font-bold shrink-0">1</span>
                    <span>Apresente-se e dê boas-vindas calorosas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF3B30] text-xs flex items-center justify-center font-bold shrink-0">2</span>
                    <span>Verifique se tem ficha de treino</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF3B30] text-xs flex items-center justify-center font-bold shrink-0">3</span>
                    <span>Acompanhe alguns exercícios pessoalmente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF3B30] text-xs flex items-center justify-center font-bold shrink-0">4</span>
                    <span>Agende avaliação física se não tiver</span>
                  </li>
                </ol>
              </div>

              {/* Sem Ficha */}
              <div className="bg-white/5 rounded-xl p-6 border border-[#FF9500]/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">📋</span>
                  <div>
                    <h4 className="font-bold">Aluno SEM FICHA</h4>
                    <span className="text-xs text-[#FF9500]">Urgente - Criar ficha</span>
                  </div>
                </div>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF9500] text-xs flex items-center justify-center font-bold shrink-0">1</span>
                    <span>Pergunte quais são os objetivos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF9500] text-xs flex items-center justify-center font-bold shrink-0">2</span>
                    <span>Verifique disponibilidade de horário</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF9500] text-xs flex items-center justify-center font-bold shrink-0">3</span>
                    <span>Crie uma ficha básica na hora se possível</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF9500] text-xs flex items-center justify-center font-bold shrink-0">4</span>
                    <span>Agende horário para ficha completa</span>
                  </li>
                </ol>
              </div>

              {/* Frequência Caindo */}
              <div className="bg-white/5 rounded-xl p-6 border border-[#FFCC00]/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">📉</span>
                  <div>
                    <h4 className="font-bold">Frequência CAINDO</h4>
                    <span className="text-xs text-[#FFCC00]">Risco de Desistência</span>
                  </div>
                </div>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-xs flex items-center justify-center font-bold shrink-0 text-black">1</span>
                    <span>Pergunte como está se sentindo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-xs flex items-center justify-center font-bold shrink-0 text-black">2</span>
                    <span>Identifique barreiras (tempo, motivação, dores)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-xs flex items-center justify-center font-bold shrink-0 text-black">3</span>
                    <span>Proponha ajustes no treino se necessário</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFCC00] text-xs flex items-center justify-center font-bold shrink-0 text-black">4</span>
                    <span>Sugira horários alternativos</span>
                  </li>
                </ol>
              </div>

              {/* Retenção Baixa */}
              <div className="bg-white/5 rounded-xl p-6 border border-[#FF3B30]/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🔺</span>
                  <div>
                    <h4 className="font-bold">Card PISCANDO (Retenção &lt; 50%)</h4>
                    <span className="text-xs text-[#FF3B30]">Prioridade ABSOLUTA</span>
                  </div>
                </div>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF3B30] text-xs flex items-center justify-center font-bold shrink-0">1</span>
                    <span>Atenda IMEDIATAMENTE - não espere</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF3B30] text-xs flex items-center justify-center font-bold shrink-0">2</span>
                    <span>Demonstre que você se importa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF3B30] text-xs flex items-center justify-center font-bold shrink-0">3</span>
                    <span>Resolva pendências (ficha, avaliação)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FF3B30] text-xs flex items-center justify-center font-bold shrink-0">4</span>
                    <span>Faça follow-up nos próximos dias</span>
                  </li>
                </ol>
              </div>

              {/* Veterano Estável */}
              <div className="bg-white/5 rounded-xl p-6 border border-[#30D158]/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🏆</span>
                  <div>
                    <h4 className="font-bold">Veterano ESTÁVEL</h4>
                    <span className="text-xs text-[#30D158]">Tudo em Ordem</span>
                  </div>
                </div>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#30D158] text-xs flex items-center justify-center font-bold shrink-0">1</span>
                    <span>Cumprimente e reconheça dedicação</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#30D158] text-xs flex items-center justify-center font-bold shrink-0">2</span>
                    <span>Pergunte se quer variar algum exercício</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#30D158] text-xs flex items-center justify-center font-bold shrink-0">3</span>
                    <span>Sugira desafios novos se apropriado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#30D158] text-xs flex items-center justify-center font-bold shrink-0">4</span>
                    <span>Pode pedir ajuda para receber novatos</span>
                  </li>
                </ol>
              </div>

              {/* Personal */}
              <div className="bg-white/5 rounded-xl p-6 border border-[#007AFF]/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">🔵</span>
                  <div>
                    <h4 className="font-bold">PERSONAL / Autônomo</h4>
                    <span className="text-xs text-[#007AFF]">Sem necessidade de atendimento</span>
                  </div>
                </div>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#007AFF] text-xs flex items-center justify-center font-bold shrink-0">1</span>
                    <span>Cumprimente normalmente se cruzar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#007AFF] text-xs flex items-center justify-center font-bold shrink-0">2</span>
                    <span>Não interrompa se estiver com personal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#007AFF] text-xs flex items-center justify-center font-bold shrink-0">3</span>
                    <span>Atenda apenas se solicitar ajuda</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#007AFF] text-xs flex items-center justify-center font-bold shrink-0">4</span>
                    <span>Foque nos alunos que precisam de você</span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Dicas de Ouro */}
            <div className="bg-gradient-to-r from-[#FFD700]/10 to-[#FF9500]/10 rounded-2xl p-8 mt-8">
              <h4 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span>💡</span> Dicas de Ouro para o Atendimento
              </h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🎯</span>
                  <p><strong>Priorize os vermelhos:</strong> Eles são os que mais precisam e mais provavelmente vão desistir</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">⏱️</span>
                  <p><strong>Respeite o timer:</strong> Se está negativo e piscando, significa que o aluno já esperou demais</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">📊</span>
                  <p><strong>Olhe o tanque:</strong> Quanto mais vazio, mais atenção o aluno precisa</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔺</span>
                  <p><strong>Triângulo piscando:</strong> Este aluno é PRIORIDADE ABSOLUTA!</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">📋</span>
                  <p><strong>Ficha é essencial:</strong> Aluno sem ficha está perdido e vai desistir</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">💚</span>
                  <p><strong>Verdes também importam:</strong> Uma palavra de incentivo faz diferença</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-white/10 py-4">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/40 text-sm">
          <p>IronCoach v14 • Sistema Inteligente de Gestão de Atendimento</p>
        </div>
      </footer>
    </div>
  );
}
