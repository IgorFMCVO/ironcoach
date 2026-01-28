'use client';

import { useState } from 'react';

export default function TesteEvoPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [memberId, setMemberId] = useState('12345');
  const [memberName, setMemberName] = useState('Aluno Teste');

  const simularEntrada = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Simula o payload que o EVO envia
      const payload = {
        EventType: 'Entries',
        IdRecord: Math.floor(Math.random() * 100000),
        IdBranch: 1,
        ApiCallback: `https://evo-integracao-api.w12app.com.br/api/v1/entries/${memberId}`,
        // Dados extras para teste (normalmente vêm do callback)
        _teste: true,
        _memberData: {
          idMember: parseInt(memberId),
          name: memberName,
          registerDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias atrás
        },
      };

      const response = await fetch('/api/webhook/evo/teste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Erro: ${error}`);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🧪 Teste de Integração EVO</h1>
        <p className="text-gray-400 mb-8">Simule uma entrada na catraca para testar o webhook</p>

        <div className="bg-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">ID do Membro (EVO)</label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
              placeholder="12345"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome do Aluno</label>
            <input
              type="text"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
              placeholder="João Silva"
            />
          </div>

          <button
            onClick={simularEntrada}
            disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-lg font-bold transition-colors"
          >
            {loading ? '⏳ Processando...' : '🚪 Simular Entrada na Catraca'}
          </button>
        </div>

        {result && (
          <div className="mt-6 bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-2">Resultado:</h3>
            <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-green-400">
              {result}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-blue-900/30 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-400 mb-2">ℹ️ Como funciona</h3>
          <ul className="text-gray-300 space-y-2 text-sm">
            <li>1. Este teste simula o que acontece quando alguém passa na catraca</li>
            <li>2. O EVO envia um webhook para nosso sistema</li>
            <li>3. Buscamos os dados do aluno e adicionamos na fila</li>
            <li>4. O professor vê o aluno aparecer no dashboard</li>
          </ul>
        </div>

        <div className="mt-4 flex gap-4">
          <a
            href="/admin"
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-center transition-colors"
          >
            ← Voltar ao Admin
          </a>
          <a
            href="/"
            className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-medium text-center transition-colors"
          >
            Ver Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}