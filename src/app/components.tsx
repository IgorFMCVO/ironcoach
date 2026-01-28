// src/app/components.tsx
// ============================================================================
// IRON COACH DASHBOARD - COMPONENTES AUXILIARES
// ============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

// Types
type Priority = 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'GREEN' | 'BLACK';

interface QueueMember {
  id: string
  name: string
  status: 'WAITING' | 'TRAINING' | 'BEING_ATTENDED' | 'IDLE'
  priority: Priority
  checkInTime: string
  workout?: {
    letter: string
    name: string
    currentExercise: string
    progress: number
  }
  metrics: {
    daysAsMember: number
    totalWorkouts: number
    completionRate: number
  }
  tags: string[]
  helpRequested: boolean
}

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  RED: { color: '#FF3B30', label: 'PRIORIDADE MÁXIMA' },
  ORANGE: { color: '#FF9500', label: 'PRIORIDADE ALTA' },
  YELLOW: { color: '#FFCC00', label: 'ATENÇÃO MODERADA' },
  BLUE: { color: '#007AFF', label: 'ACOMPANHAMENTO' },
  GREEN: { color: '#30D158', label: 'AUTÔNOMO' },
  BLACK: { color: '#8E8E93', label: 'VIP / ATLETA' },
};

// ============================================================================
// QUICK ADD MODAL
// ============================================================================

export function QuickAddModal({ 
  onClose, 
  onAdd 
}: { 
  onClose: () => void
  onAdd: (name: string, situation: string) => void 
}) {
  const [name, setName] = useState('');
  const [situation, setSituation] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    inputRef.current?.focus(); 
  }, []);

  const situations = [
    { id: 'first', label: '1º Treino', icon: '🆕', color: '#FF3B30', desc: 'Nunca treinou aqui' },
    { id: 'new_program', label: 'Nova Ficha', icon: '📋', color: '#FF9500', desc: 'Ficha nova' },
    { id: 'returning', label: 'Retorno', icon: '🔄', color: '#FFCC00', desc: 'Voltou após ausência' },
    { id: 'regular', label: 'Regular', icon: '✓', color: '#30D158', desc: 'Treino normal' },
  ];

  const handleSubmit = () => {
    if (name.trim() && situation) {
      onAdd(name.trim(), situation);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-[#141414] rounded-3xl overflow-hidden border border-white/5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Adicionar Aluno</h2>
              <p className="text-xs text-white/30 mt-0.5">Check-in manual na fila</p>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-[9px] font-bold tracking-[0.15em] text-white/30 uppercase mb-2">
              Nome do Aluno
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Digite o nome..."
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-base font-medium placeholder-white/20 focus:outline-none focus:border-[#FF3B30]/50 focus:bg-white/[0.07] transition-all"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* Situation */}
          <div>
            <label className="block text-[9px] font-bold tracking-[0.15em] text-white/30 uppercase mb-2">
              Situação
            </label>
            <div className="grid grid-cols-2 gap-2">
              {situations.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSituation(s.id)}
                  className={`
                    p-3.5 rounded-xl border-2 text-left transition-all
                    ${situation === s.id 
                      ? 'bg-white/5' 
                      : 'border-transparent bg-white/[0.02] hover:bg-white/[0.04]'
                    }
                  `}
                  style={{ 
                    borderColor: situation === s.id ? s.color + '50' : 'transparent',
                    backgroundColor: situation === s.id ? s.color + '10' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-xl">{s.icon}</span>
                    <span className="font-bold text-sm">{s.label}</span>
                  </div>
                  <p className="text-[10px] text-white/40">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 h-12 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-sm text-white/50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !situation}
            className={`
              flex-[2] h-12 rounded-xl font-bold text-sm transition-all
              ${name.trim() && situation
                ? 'bg-gradient-to-r from-[#FF3B30] to-[#FF5C4D] hover:from-[#FF4D42] hover:to-[#FF6B5D] text-white'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
              }
            `}
          >
            Adicionar à Fila
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MEMBER DETAIL MODAL
// ============================================================================

export function MemberModal({
  member,
  onClose,
  onStartAttendance,
  onRemove,
}: {
  member: QueueMember
  onClose: () => void
  onStartAttendance: (member: QueueMember) => void
  onRemove: (id: string) => void
}) {
  const config = PRIORITY_CONFIG[member.priority];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm bg-[#141414] rounded-3xl overflow-hidden border border-white/5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="p-6 pb-5"
          style={{ background: `linear-gradient(135deg, ${config.color}25 0%, transparent 70%)` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
              style={{ backgroundColor: config.color }}
            >
              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <h2 className="text-xl font-black">{member.name}</h2>
          <p className="text-xs font-semibold mt-0.5" style={{ color: config.color }}>
            {config.label}
          </p>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-white/[0.03]">
            <p className="text-xl font-bold">{member.metrics.daysAsMember}</p>
            <p className="text-[9px] text-white/30 uppercase tracking-wide">Dias</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/[0.03]">
            <p className="text-xl font-bold">{member.metrics.totalWorkouts}</p>
            <p className="text-[9px] text-white/30 uppercase tracking-wide">Treinos</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/[0.03]">
            <p className="text-xl font-bold">{Math.round(member.metrics.completionRate * 100)}%</p>
            <p className="text-[9px] text-white/30 uppercase tracking-wide">Conclusão</p>
          </div>
        </div>

        {/* Workout */}
        {member.workout && (
          <div className="px-6 pb-4">
            <p className="text-[9px] font-bold tracking-[0.15em] text-white/30 uppercase mb-2">
              Treino Atual
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: config.color }}
              >
                {member.workout.letter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{member.workout.name}</p>
                <p className="text-xs text-white/40 truncate">{member.workout.currentExercise}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {member.tags.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {member.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold"
                  style={{ backgroundColor: config.color + '20', color: config.color }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-6 pt-2 space-y-2">
          <button
            onClick={() => onStartAttendance(member)}
            className="w-full h-12 rounded-xl font-bold text-sm transition-all bg-gradient-to-r from-[#FF3B30] to-[#FF5C4D] hover:from-[#FF4D42] hover:to-[#FF6B5D] active:scale-[0.98]"
          >
            Iniciar Atendimento
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 font-semibold text-sm text-white/50 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={() => onRemove(member.id)}
              className="flex-1 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 font-semibold text-sm text-red-400 transition-colors"
            >
              Remover da Fila
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
