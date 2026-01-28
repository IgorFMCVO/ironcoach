// src/app/components/Login.tsx
// ============================================================================
// IRON COACH - LOGIN COMPONENT
// Busca usuários do banco + PIN
// ============================================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Coach {
  id: string;
  name: string;
  initials: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'PROFESSOR';
  is_supervisor: boolean;
  evo_employee_id?: number;
}

interface LoginProps {
  onLogin: (coach: Coach) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<'select' | 'pin'>('select');
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar coaches do banco
  useEffect(() => {
    const loadCoaches = async () => {
      const { data, error } = await supabase
        .from('coaches')
        .select('id, name, initials, role, is_supervisor')
        .eq('is_active', true)
        .order('role')
        .order('name');
      
      if (error) {
        console.error('Erro ao carregar coaches:', error);
        setIsLoading(false);
        return;
      }
      
      setCoaches(data || []);
      setIsLoading(false);
    };
    
    loadCoaches();
  }, []);

  // Focar no input do PIN quando mudar para essa etapa
  useEffect(() => {
    if (step === 'pin') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // Verificar PIN automaticamente quando tiver 4 dígitos
  useEffect(() => {
    if (pin.length === 4 && selectedCoach && !isVerifying) {
      verifyPin();
    }
  }, [pin]);

  const verifyPin = async () => {
    if (!selectedCoach || isVerifying) return;
    
    setIsVerifying(true);
    
    // Chamar função RPC do banco
    const { data, error } = await supabase.rpc('coach_login', {
      p_coach_id: selectedCoach.id,
      p_pin: pin,
    });
    
    if (error || !data || data.length === 0 || !data[0]?.success) {
      // PIN incorreto ou erro
      setError(true);
      setErrorMessage(data?.[0]?.error_message || 'PIN incorreto');
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
        setError(false);
        setIsVerifying(false);
      }, 600);
      return;
    }
    
    // Login correto
    const result = data[0];
    onLogin({
      id: result.coach_id,
      name: result.coach_name,
      initials: result.coach_initials,
      role: result.coach_role,
      is_supervisor: result.is_supervisor,
      evo_employee_id: result.evo_employee_id,
    });
  };

  const handleSelectCoach = (coach: Coach) => {
    setSelectedCoach(coach);
    setStep('pin');
    setPin('');
    setError(false);
    setErrorMessage('');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedCoach(null);
    setPin('');
    setError(false);
    setErrorMessage('');
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4 && !isVerifying) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinDelete = () => {
    if (!isVerifying) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  // Agrupar coaches por role
  const groupedCoaches = {
    ADMIN: coaches.filter(c => c.role === 'ADMIN'),
    SUPERVISOR: coaches.filter(c => c.role === 'SUPERVISOR'),
    PROFESSOR: coaches.filter(c => c.role === 'PROFESSOR'),
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'SUPERVISOR': return 'Supervisor';
      default: return 'Professor';
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF3B30] to-[#FF6347] flex items-center justify-center font-black text-3xl mx-auto mb-4 animate-pulse">
            I
          </div>
          <p className="text-white/40">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Background - fixo */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: -1 }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d0d] via-[#080808] to-[#0a0a0a]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Conteúdo - scrollável */}
      <div className="relative min-h-screen w-full max-w-lg mx-auto px-6 py-8 pb-16">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF3B30] to-[#FF6347] flex items-center justify-center font-black text-3xl mx-auto mb-4">
            I
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            IRON<span className="text-[#FF3B30]">COACH</span>
          </h1>
          <p className="text-xs text-white/30 mt-1">Sistema de Atendimento v15</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'select' ? (
            /* Seleção de Professor */
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Admins */}
              {groupedCoaches.ADMIN.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-purple-400/60 uppercase mb-3">
                    ◆ Administrador
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {groupedCoaches.ADMIN.map((coach) => (
                      <CoachButton key={coach.id} coach={coach} onClick={() => handleSelectCoach(coach)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Supervisores */}
              {groupedCoaches.SUPERVISOR.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-blue-400/60 uppercase mb-3">
                    ■ Supervisores
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {groupedCoaches.SUPERVISOR.map((coach) => (
                      <CoachButton key={coach.id} coach={coach} onClick={() => handleSelectCoach(coach)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Professores */}
              {groupedCoaches.PROFESSOR.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase mb-3">
                    ● Professores
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {groupedCoaches.PROFESSOR.map((coach) => (
                      <CoachButton key={coach.id} coach={coach} onClick={() => handleSelectCoach(coach)} />
                    ))}
                  </div>
                </div>
              )}

              {coaches.length === 0 && (
                <div className="text-center py-8 text-white/30">
                  <p>Nenhum usuário cadastrado</p>
                  <p className="text-xs mt-2">Execute o SQL de setup no Supabase</p>
                </div>
              )}
            </motion.div>
          ) : (
            /* Entrada do PIN */
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Voltar */}
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm">Voltar</span>
              </button>

              {/* Coach selecionado */}
              <div className="text-center">
                <div 
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl font-bold mx-auto mb-3 ${
                    selectedCoach?.role === 'ADMIN' 
                      ? 'from-purple-500 to-purple-700' 
                      : selectedCoach?.role === 'SUPERVISOR'
                      ? 'from-blue-500 to-blue-700'
                      : 'from-[#FF3B30] to-[#FF6347]'
                  }`}
                >
                  {selectedCoach?.initials}
                </div>
                <p className="font-semibold">{selectedCoach?.name}</p>
                <p className="text-[10px] text-white/30 mt-1">
                  {getRoleLabel(selectedCoach?.role || '')} • Digite seu PIN
                </p>
              </div>

              {/* PIN Display */}
              <motion.div 
                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex justify-center gap-3"
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                      pin.length > i
                        ? error
                          ? 'border-[#FF3B30] bg-[#FF3B30]/10'
                          : 'border-[#30D158] bg-[#30D158]/10'
                        : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    {pin.length > i && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`w-3 h-3 rounded-full ${error ? 'bg-[#FF3B30]' : 'bg-[#30D158]'}`}
                      />
                    )}
                  </div>
                ))}
              </motion.div>

              {/* Input invisível para teclado mobile */}
              <input
                ref={inputRef}
                type="tel"
                maxLength={4}
                value={pin}
                onChange={(e) => !isVerifying && setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="opacity-0 absolute -z-10"
                autoComplete="off"
              />

              {/* Teclado numérico */}
              <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
                  <motion.button
                    key={key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (key === 'del') handlePinDelete();
                      else if (key) handlePinInput(key);
                    }}
                    disabled={!key || isVerifying}
                    className={`h-14 rounded-xl font-semibold text-xl transition-all ${
                      key === 'del'
                        ? 'bg-white/[0.03] hover:bg-white/[0.06] text-white/50'
                        : key
                        ? 'bg-white/[0.05] hover:bg-white/[0.08]'
                        : 'bg-transparent cursor-default'
                    }`}
                  >
                    {key === 'del' ? (
                      <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                      </svg>
                    ) : key}
                  </motion.button>
                ))}
              </div>

              {/* Erro */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[#FF3B30] text-sm text-center"
                  >
                    {errorMessage || 'PIN incorreto'}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="text-[10px] text-white/20 text-center mt-8 pb-8">
          IRON Fitness © 2024
        </p>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}

// Componente do botão de coach
function CoachButton({ coach, onClick }: { coach: Coach; onClick: () => void }) {
  const colors = {
    ADMIN: { bg: 'from-purple-500/20 to-purple-700/20', text: 'text-purple-400', hover: 'group-hover:from-purple-500 group-hover:to-purple-700', border: 'border-purple-500/20 hover:border-purple-500/40' },
    SUPERVISOR: { bg: 'from-blue-500/20 to-blue-700/20', text: 'text-blue-400', hover: 'group-hover:from-blue-500 group-hover:to-blue-700', border: 'border-blue-500/20 hover:border-blue-500/40' },
    PROFESSOR: { bg: 'from-[#FF3B30]/20 to-[#FF6347]/20', text: 'text-[#FF3B30]', hover: 'group-hover:from-[#FF3B30] group-hover:to-[#FF6347]', border: 'border-white/[0.06] hover:border-white/[0.1]' },
  };
  
  const color = colors[coach.role] || colors.PROFESSOR;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl bg-white/[0.03] border ${color.border} hover:bg-white/[0.06] transition-all text-left group`}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center text-lg font-bold ${color.text} mb-3 ${color.hover} group-hover:text-white transition-all`}>
        {coach.initials}
      </div>
      <p className="font-semibold text-sm">{coach.name}</p>
      <p className={`text-[10px] ${color.text} opacity-60`}>
        {coach.role === 'ADMIN' ? '◆ Admin' : coach.role === 'SUPERVISOR' ? '■ Supervisor' : '● Professor'}
      </p>
    </motion.button>
  );
}
