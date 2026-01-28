// ============================================================================
// CAMINHO: src/app/consultoras/login/page.tsx
// ============================================================================

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Lista de consultoras autorizadas (IDs do EVO)
const AUTHORIZED_CONSULTANTS = [
  { id: 220, name: 'CONSULTOR PADRÃO' },
  { id: 306, name: 'ANA CAROLINA COSTA FONSECA' },
  { id: 407, name: 'ANNA LUIZA MATKOW DE MACEDO' },
  { id: 402, name: 'LUZIA DA SILVA XAVIER' },
];

// PIN de acesso (pode ser alterado)
const ACCESS_PIN = '1234';

export default function ConsultorasLoginPage() {
  const [selectedConsultant, setSelectedConsultant] = useState<number | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    
    if (!selectedConsultant) {
      setError('Selecione seu nome');
      return;
    }
    
    if (pin !== ACCESS_PIN) {
      setError('PIN incorreto');
      return;
    }

    setIsLoading(true);

    // Encontrar consultora selecionada
    const consultant = AUTHORIZED_CONSULTANTS.find(c => c.id === selectedConsultant);
    
    if (!consultant) {
      setError('Consultora não encontrada');
      setIsLoading(false);
      return;
    }

    // Salvar sessão no localStorage
    const session = {
      id: consultant.id,
      name: consultant.name,
      role: 'consultora',
      loginTime: new Date().toISOString(),
    };
    
    localStorage.setItem('ironcoach_consultora', JSON.stringify(session));
    
    // Redirecionar para página de consultoras
    window.location.href = '/consultoras';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📋</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Entradas Manuais
          </h1>
          <p className="text-zinc-400">
            Área exclusiva para consultoras
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-2xl p-6 space-y-6">
          {/* Seleção de Consultora */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Selecione seu nome
            </label>
            <select
              value={selectedConsultant || ''}
              onChange={(e) => setSelectedConsultant(Number(e.target.value) || null)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="">Escolha...</option>
              {AUTHORIZED_CONSULTANTS.map(consultant => (
                <option key={consultant.id} value={consultant.id}>
                  {consultant.name}
                </option>
              ))}
            </select>
          </div>

          {/* PIN */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              PIN de acesso
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Digite o PIN"
              maxLength={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Erro */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Botão de Login */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black font-bold py-4 rounded-xl transition-colors text-lg"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-500 text-xs mt-6">
          Iron Coach Dashboard • Limit Fitness
        </p>
      </motion.div>
    </div>
  );
}
