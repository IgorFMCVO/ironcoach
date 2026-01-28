// src/components/ManualEntryModal.tsx
// ============================================================================
// IRON COACH - Modal de Entrada Manual de Alunos
// Busca no EVO e adiciona na fila de atendimento
// ============================================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon, CloseIcon, UserIcon, AddUserIcon, LoadingIcon, AlertIcon, CheckIcon } from './Icons';
import { logError } from '@/lib/errorLogger';

interface EvoMember {
  idMember: number;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  phone?: string;
  photo?: string;
  registerDate?: string;
  status?: string;
  // Dados extras quando busca por ID
  daysAsMember?: number;
  priority?: string;
  tags?: string[];
  totalWorkouts?: number;
  currentWorkout?: {
    name: string;
    letter: string;
    endDate?: string;
  } | null;
}

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId: string;
  coachName: string;
  coachEvoId?: number;
  onSuccess: () => void;
}

export default function ManualEntryModal({
  isOpen,
  onClose,
  coachId,
  coachName,
  coachEvoId,
  onSuccess,
}: ManualEntryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<EvoMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<EvoMember | null>(null);
  const [memberDetails, setMemberDetails] = useState<EvoMember | null>(null);
  const [reason, setReason] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Resetar ao fechar
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedMember(null);
      setMemberDetails(null);
      setReason('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Buscar membros (debounced)
  const searchMembers = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/evo/members?name=${encodeURIComponent(term)}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data || []);
      } else {
        const errorMsg = data.error || 'Erro ao buscar';
        setError(errorMsg);
        // Log do erro
        await logError({
          source: 'evo',
          action: 'search_members',
          error: errorMsg,
          requestData: { searchTerm: term },
          responseData: data,
          coachId,
          coachName,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro de conexão';
      setError(`Erro de conexão: ${errorMsg}`);
      // Log do erro
      await logError({
        source: 'evo',
        action: 'search_members',
        error: err,
        requestData: { searchTerm: term },
        coachId,
        coachName,
      });
    }

    setIsSearching(false);
  }, [coachId, coachName]);

  // Debounce na busca
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchMembers(value);
    }, 300);
  };

  // Selecionar membro e buscar detalhes
  const handleSelectMember = async (member: EvoMember) => {
    setSelectedMember(member);
    setSearchResults([]);
    setSearchTerm('');
    setIsLoadingDetails(true);
    setError(null);

    try {
      const response = await fetch(`/api/evo/members?id=${member.idMember}`);
      const data = await response.json();

      if (data.success) {
        setMemberDetails(data.data);
      } else {
        setError(data.error || 'Erro ao buscar detalhes');
      }
    } catch (err) {
      setError('Erro de conexão');
    }

    setIsLoadingDetails(false);
  };

  // Confirmar entrada manual
  const handleConfirmEntry = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    setError(null);

    const requestData = {
      idMember: selectedMember.idMember,
      coachId,
      coachName,
      coachEvoId,
      reason: reason || 'Catraca indisponível',
    };

    try {
      const response = await fetch('/api/evo/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Log se foi registrado no EVO
        if (data.data?.evo?.registered) {
          console.log('✅ Entrada registrada no EVO:', data.data.evo);
        } else {
          console.log('⚠️ Entrada local apenas (EVO não disponível)');
        }
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const errorMsg = data.error || 'Erro ao adicionar aluno';
        setError(errorMsg);
        // Log do erro
        await logError({
          source: 'api',
          endpoint: '/api/evo/members',
          action: 'manual_entry',
          error: errorMsg,
          requestData,
          responseData: data,
          coachId,
          coachName,
          memberName: selectedMember.name,
          memberEvoId: selectedMember.idMember,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro de conexão';
      setError(`Erro de conexão: ${errorMsg}`);
      // Log do erro
      await logError({
        source: 'api',
        endpoint: '/api/evo/members',
        action: 'manual_entry',
        error: err,
        requestData,
        coachId,
        coachName,
        memberName: selectedMember.name,
        memberEvoId: selectedMember.idMember,
      });
    }

    setIsSubmitting(false);
  };

  // Formatar data
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Cor da prioridade
  const getPriorityColor = (priority?: string) => {
    const colors: Record<string, string> = {
      RED: '#FF3B30',
      ORANGE: '#FF9500',
      YELLOW: '#FFCC00',
      BLUE: '#007AFF',
      GREEN: '#30D158',
      BLACK: '#8E8E93',
    };
    return colors[priority || ''] || '#8E8E93';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="w-full max-w-lg bg-[#141414] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <AddUserIcon size={20} color="white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Entrada Manual</h2>
                <p className="text-xs text-white/40">Adicionar aluno que não passou na catraca</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <CloseIcon size={20} color="rgba(255,255,255,0.4)" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Success State */}
            {success ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-12 flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckIcon size={32} color="#30D158" />
                </div>
                <p className="text-xl font-bold text-green-400">Aluno adicionado!</p>
                <p className="text-sm text-white/40">{selectedMember?.name}</p>
              </motion.div>
            ) : selectedMember ? (
              /* Selected Member View */
              <div className="space-y-4">
                {/* Member Card */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg"
                      style={{ 
                        backgroundColor: `${getPriorityColor(memberDetails?.priority)}20`,
                        color: getPriorityColor(memberDetails?.priority),
                      }}
                    >
                      {(selectedMember.name || '').split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{selectedMember.name}</p>
                      <p className="text-sm text-white/40">ID EVO: {selectedMember.idMember}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMember(null);
                        setMemberDetails(null);
                      }}
                      className="text-xs text-white/40 hover:text-white"
                    >
                      Trocar
                    </button>
                  </div>

                  {isLoadingDetails ? (
                    <div className="mt-4 flex justify-center py-4">
                      <LoadingIcon size={24} color="rgba(255,255,255,0.4)" />
                    </div>
                  ) : memberDetails && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-white/40">Dias como membro</p>
                        <p className="font-bold" style={{ color: getPriorityColor(memberDetails.priority) }}>
                          {memberDetails.daysAsMember || 0} dias
                        </p>
                      </div>
                      <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-white/40">Prioridade</p>
                        <p className="font-bold" style={{ color: getPriorityColor(memberDetails.priority) }}>
                          {memberDetails.priority || 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-white/40">Ficha</p>
                        <p className="font-bold text-white">
                          {memberDetails.currentWorkout ? memberDetails.currentWorkout.name : 'Sem ficha'}
                        </p>
                      </div>
                      <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-white/40">Total treinos</p>
                        <p className="font-bold text-white">{memberDetails.totalWorkouts || 0}</p>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {memberDetails?.tags && memberDetails.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {memberDetails.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${getPriorityColor(memberDetails.priority)}20`,
                            color: getPriorityColor(memberDetails.priority),
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reason Input */}
                <div>
                  <label className="text-sm text-white/60 block mb-2">Motivo (opcional)</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Catraca desligada, aluno sem biometria..."
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-white/30 outline-none transition-colors"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
                    <AlertIcon size={16} />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmEntry}
                    disabled={isSubmitting || isLoadingDetails}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <LoadingIcon size={20} />
                    ) : (
                      <>
                        <CheckIcon size={18} />
                        Confirmar Entrada
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Search View */
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <SearchIcon 
                    size={20} 
                    color="rgba(255,255,255,0.3)" 
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Buscar aluno por nome..."
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:border-white/30 outline-none transition-colors"
                  />
                  {isSearching && (
                    <LoadingIcon 
                      size={20} 
                      color="rgba(255,255,255,0.4)" 
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    />
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
                    <AlertIcon size={16} />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Results */}
                {searchResults.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {searchResults.map((member) => {
                      // Compor nome completo
                      const fullName = member.name || 
                        [member.firstName, member.lastName].filter(Boolean).join(' ') || 
                        `Aluno #${member.idMember}`;
                      
                      // Gerar iniciais
                      const initials = fullName
                        .split(' ')
                        .map(n => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <button
                          key={member.idMember}
                          onClick={() => handleSelectMember({ ...member, name: fullName })}
                          className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-left transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            {/* Avatar com Iniciais */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF3B30]/20 to-[#FF6347]/20 border border-[#FF3B30]/30 flex items-center justify-center">
                              <span className="text-[#FF3B30] font-bold text-sm">{initials}</span>
                            </div>
                            {/* Nome e ID */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white text-base">{fullName}</p>
                              <p className="text-sm text-white/50">ID EVO: {member.idMember}</p>
                            </div>
                            {/* Seta */}
                            <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-[#FF3B30]/20 flex items-center justify-center transition-all">
                              <span className="text-white/30 group-hover:text-[#FF3B30] transition-colors">→</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : searchTerm.length >= 2 && !isSearching ? (
                  <div className="py-12 text-center text-white/30">
                    <UserIcon size={48} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" />
                    <p>Nenhum aluno encontrado</p>
                    <p className="text-sm mt-1">Tente outro nome</p>
                  </div>
                ) : (
                  <div className="py-12 text-center text-white/30">
                    <SearchIcon size={48} color="rgba(255,255,255,0.2)" className="mx-auto mb-3" />
                    <p>Digite o nome do aluno</p>
                    <p className="text-sm mt-1">Mínimo 2 caracteres</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
