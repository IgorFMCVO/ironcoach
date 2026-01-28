// src/components/CheckoutModal.tsx
// ============================================================================
// IRON COACH - Modal de Checkout pelo Professor
// ============================================================================

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  queueId: string;
  checkInTime: string;
  coachId?: string;
  coachName?: string;
  onCheckoutComplete?: () => void;
}

type ExitReason = 
  | 'treino_finalizado'
  | 'desistiu_hoje'
  | 'passou_mal'
  | 'compromisso'
  | 'erro_checkin'
  | 'outro';

const EXIT_REASONS: { value: ExitReason; label: string; icon: string; color: string }[] = [
  { value: 'treino_finalizado', label: 'Treino Finalizado', icon: '✅', color: '#30D158' },
  { value: 'desistiu_hoje', label: 'Desistiu do treino', icon: '😔', color: '#FF9500' },
  { value: 'passou_mal', label: 'Passou mal', icon: '🤒', color: '#FF3B30' },
  { value: 'compromisso', label: 'Tinha compromisso', icon: '📅', color: '#007AFF' },
  { value: 'erro_checkin', label: 'Erro no check-in', icon: '❌', color: '#8E8E93' },
  { value: 'outro', label: 'Outro motivo', icon: '📝', color: '#8E8E93' },
];

export default function CheckoutModal({
  isOpen,
  onClose,
  memberName,
  queueId,
  checkInTime,
  coachId,
  coachName,
  onCheckoutComplete,
}: CheckoutModalProps) {
  const [selectedReason, setSelectedReason] = useState<ExitReason | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sessionDuration = Math.floor((Date.now() - new Date(checkInTime).getTime()) / 60000);
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m}min`;
  };

  const handleCheckout = async () => {
    if (!selectedReason) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId,
          exitType: 'professor',
          exitReason: selectedReason,
          exitNotes: notes || undefined,
          coachId,
          coachName,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onCheckoutComplete?.();
        onClose();
      } else {
        alert('Erro ao fazer checkout: ' + result.error);
      }
    } catch (error) {
      alert('Erro ao fazer checkout');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-center">
            <div className="text-4xl mb-2">👋</div>
            <h2 className="text-xl font-bold text-white">Check-out do Aluno</h2>
            <p className="text-white/80 mt-1">{memberName}</p>
          </div>

          {/* Session Info */}
          <div className="px-6 py-4 bg-gray-800/50 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">Tempo na academia</p>
              <p className="text-xl font-bold text-white">{formatDuration(sessionDuration)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Entrada</p>
              <p className="text-white">
                {new Date(checkInTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Reasons */}
          <div className="p-6">
            <p className="text-sm text-gray-400 mb-3">Motivo da saída:</p>
            <div className="grid grid-cols-2 gap-2">
              {EXIT_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => setSelectedReason(reason.value)}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    backgroundColor: selectedReason === reason.value 
                      ? `${reason.color}20` 
                      : 'rgba(255,255,255,0.05)',
                    border: selectedReason === reason.value 
                      ? `2px solid ${reason.color}` 
                      : '2px solid transparent',
                  }}
                >
                  <span className="text-xl mr-2">{reason.icon}</span>
                  <span className="text-sm text-white">{reason.label}</span>
                </button>
              ))}
            </div>

            {/* Notes (optional) */}
            {selectedReason === 'outro' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-4"
              >
                <textarea
                  placeholder="Descreva o motivo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none"
                  rows={2}
                />
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCheckout}
              disabled={!selectedReason || isLoading}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 rounded-xl font-bold text-white transition-colors"
            >
              {isLoading ? '⏳' : '👋 Checkout'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}