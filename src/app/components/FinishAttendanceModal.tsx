// ============================================================================
// CAMINHO: src/components/FinishAttendanceModal.tsx
// ============================================================================
// Modal para finalizar atendimento com seleção de tipo de intervenção
// Inclui confirmação anti-burla para atendimentos muito curtos
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InterventionType {
  id: string;
  label: string;
  emoji: string;
  description?: string;
  color: string;
}

interface FinishAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (interventionType: string, note?: string, confirmedSuspicious?: boolean) => void;
  memberName: string;
  durationSeconds: number;
  isSuspicious?: boolean;
  minTime?: number;
}

const DEFAULT_INTERVENTION_TYPES: InterventionType[] = [
  { id: 'CORRECTION', label: 'Correção de Exercício', emoji: '💪', color: '#30D158' },
  { id: 'ORIENTATION', label: 'Orientação de Ficha', emoji: '📋', color: '#007AFF' },
  { id: 'MOTIVATION', label: 'Motivação', emoji: '🎯', color: '#AF52DE' },
  { id: 'QUESTION', label: 'Dúvida', emoji: '❓', color: '#FFCC00' },
  { id: 'ASSISTANCE', label: 'Auxílio em Exercício', emoji: '🏋️', color: '#FF9500' },
  { id: 'WELCOME', label: 'Boas-vindas', emoji: '👋', color: '#FF3B30' },
  { id: 'OTHER', label: 'Outro', emoji: '📝', color: '#8E8E93' }
];

export default function FinishAttendanceModal({
  isOpen,
  onClose,
  onConfirm,
  memberName,
  durationSeconds,
  isSuspicious = false,
  minTime = 10
}: FinishAttendanceModalProps) {
  const [interventionTypes, setInterventionTypes] = useState<InterventionType[]>(DEFAULT_INTERVENTION_TYPES);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showSuspiciousWarning, setShowSuspiciousWarning] = useState(false);
  const [confirmedSuspicious, setConfirmedSuspicious] = useState(false);

  // Carregar tipos de intervenção do banco
  useEffect(() => {
    loadInterventionTypes();
  }, []);

  // Detectar atendimento suspeito
  useEffect(() => {
    if (isOpen && durationSeconds < minTime) {
      setShowSuspiciousWarning(true);
      setConfirmedSuspicious(false);
    } else {
      setShowSuspiciousWarning(false);
    }
  }, [isOpen, durationSeconds, minTime]);

  const loadInterventionTypes = async () => {
    try {
      const res = await fetch('/api/attendance?type=intervention-types');
      const data = await res.json();
      if (data.success && data.types?.length > 0) {
        setInterventionTypes(data.types);
      }
    } catch (error) {
      console.error('Erro ao carregar tipos:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  const handleConfirm = () => {
    if (!selectedType) return;
    
    // Se é suspeito e não confirmou ainda
    if (showSuspiciousWarning && !confirmedSuspicious) {
      return;
    }

    onConfirm(selectedType, note, showSuspiciousWarning);
    
    // Reset state
    setSelectedType(null);
    setNote('');
    setShowSuspiciousWarning(false);
    setConfirmedSuspicious(false);
  };

  const handleClose = () => {
    setSelectedType(null);
    setNote('');
    setShowSuspiciousWarning(false);
    setConfirmedSuspicious(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-gradient-to-r from-green-500/20 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">✅ Finalizar Atendimento</h3>
                <p className="text-white/60 text-sm">{memberName}</p>
              </div>
              <div className="text-right">
                <p className={`font-mono text-lg ${durationSeconds < minTime ? 'text-red-400' : 'text-green-400'}`}>
                  {formatDuration(durationSeconds)}
                </p>
                <p className="text-white/40 text-xs">duração</p>
              </div>
            </div>
          </div>

          {/* Warning de atendimento suspeito */}
          {showSuspiciousWarning && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-red-500/20 border-b border-red-500/30 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="font-bold text-red-400">Atendimento Muito Curto!</p>
                  <p className="text-white/70 text-sm mt-1">
                    Este atendimento durou apenas <strong>{durationSeconds}s</strong> (mínimo: {minTime}s).
                  </p>
                  <p className="text-white/50 text-xs mt-2">
                    Se você realmente atendeu o aluno, confirme abaixo. Caso contrário, clique em "Cancelar".
                  </p>
                  
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedSuspicious}
                      onChange={(e) => setConfirmedSuspicious(e.target.checked)}
                      className="w-5 h-5 rounded border-red-500/50 bg-black/30 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-red-300">
                      Confirmo que realizei este atendimento
                    </span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tipos de Intervenção */}
          <div className="p-4">
            <p className="text-white/60 text-sm mb-3">Selecione o tipo de intervenção:</p>
            
            <div className="grid grid-cols-2 gap-2">
              {interventionTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-3 rounded-xl text-left transition-all flex items-center gap-2 ${
                    selectedType === type.id
                      ? 'ring-2'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                  style={selectedType === type.id ? { 
                    backgroundColor: `${type.color}20`,
                    borderColor: type.color,
                    boxShadow: `0 0 0 2px ${type.color}`
                  } : {}}
                >
                  <span className="text-xl">{type.emoji}</span>
                  <div>
                    <p className={`font-medium text-sm ${selectedType === type.id ? '' : 'text-white/80'}`}
                       style={selectedType === type.id ? { color: type.color } : {}}>
                      {type.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Nota opcional */}
            <div className="mt-4">
              <p className="text-white/60 text-sm mb-2">Observação (opcional):</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Aluno com dúvida sobre série de exercícios..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl resize-none h-20 text-sm focus:border-white/30 outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/5 flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedType || (showSuspiciousWarning && !confirmedSuspicious)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                !selectedType || (showSuspiciousWarning && !confirmedSuspicious)
                  ? 'bg-green-500/30 text-white/50 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {showSuspiciousWarning && !confirmedSuspicious 
                ? '⚠️ Confirme acima' 
                : '✅ Finalizar'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// COMPONENTE AUXILIAR: Alerta de Fraude para Supervisor
// ============================================================================

interface FraudAlertBannerProps {
  alerts: Array<{
    id: string;
    coach_name: string;
    suspicious_count: number;
    time_window_minutes: number;
    created_at: string;
  }>;
  onDismiss: (alertId: string) => void;
  onWarn: (alertId: string) => void;
}

export function FraudAlertBanner({ alerts, onDismiss, onWarn }: FraudAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 space-y-2 max-w-sm">
      {alerts.slice(0, 3).map((alert) => (
        <motion.div
          key={alert.id}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-xl p-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div className="flex-1">
              <p className="font-bold text-red-400">Comportamento Suspeito</p>
              <p className="text-white/70 text-sm mt-1">
                <strong>{alert.coach_name}</strong> fez {alert.suspicious_count} atendimentos 
                muito curtos em {alert.time_window_minutes} minutos.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  Ignorar
                </button>
                <button
                  onClick={() => onWarn(alert.id)}
                  className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  Advertir
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
