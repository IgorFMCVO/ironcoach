# IRON Coach Dashboard

Sistema de gestão de atendimento em tempo real para professores de academia.

## 🚀 Como Rodar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento
npm run dev

# 3. Abrir no navegador
# http://localhost:3000
```

## 🌐 Como Subir na Vercel

### Opção 1: Via CLI

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Fazer login
vercel login

# 3. Deploy
vercel

# 4. Deploy para produção
vercel --prod
```

### Opção 2: Via GitHub

1. Faça push do projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Clique em "Import Project"
4. Selecione o repositório
5. Clique em "Deploy"

**URL do seu dashboard:** `https://seu-projeto.vercel.app`

## 📱 Integrando com o App IRON (React Native)

### 1. Configurar URL da API

```typescript
// services/config.ts
export const API_URL = 'https://seu-projeto.vercel.app';
```

### 2. Serviço de Check-in

```typescript
// services/GymCheckInService.ts
import { API_URL } from './config';

export const GymCheckInService = {
  async checkIn(userId: string, memberData: any, workoutData?: any) {
    const response = await fetch(`${API_URL}/api/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        gymId: 'academia-iron',
        source: 'APP',
        memberData: {
          name: memberData.name,
          memberSince: memberData.createdAt,
          totalWorkouts: memberData.totalWorkouts || 0,
          lastWorkoutAt: memberData.lastWorkoutAt,
          completionRate: memberData.completionRate || 0,
          currentProgramCreatedAt: memberData.currentProgramCreatedAt,
          currentWorkout: workoutData ? {
            id: workoutData.id,
            name: workoutData.name,
            letter: workoutData.letter || 'A',
            exercises: workoutData.exercises?.map((e: any) => ({ 
              id: e.id, 
              name: e.name 
            })) || [],
          } : undefined,
        },
      }),
    });
    return response.json();
  },

  async requestHelp(userId: string) {
    const response = await fetch(`${API_URL}/api/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'REQUEST_HELP',
        userId,
      }),
    });
    return response.json();
  },

  async updateActivity(userId: string, exerciseIndex: number, exerciseName: string) {
    const response = await fetch(`${API_URL}/api/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE_ACTIVITY',
        userId,
        data: { exerciseIndex, exerciseName },
      }),
    });
    return response.json();
  },

  async checkOut(userId: string) {
    const response = await fetch(`${API_URL}/api/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CHECK_OUT',
        userId,
      }),
    });
    return response.json();
  },
};
```

### 3. Usar no App

```typescript
// Na tela de treino
import { GymCheckInService } from '../services/GymCheckInService';

// Quando iniciar treino:
const handleStartWorkout = async () => {
  const result = await GymCheckInService.checkIn(
    user.id,
    userProfile,
    currentWorkout
  );
  
  if (result.success) {
    console.log('Check-in OK! Posição:', result.position);
  }
};

// Quando mudar de exercício:
const handleExerciseChange = (index: number, name: string) => {
  GymCheckInService.updateActivity(user.id, index, name);
};

// Quando finalizar treino:
const handleFinishWorkout = async () => {
  await GymCheckInService.checkOut(user.id);
};
```

## 🖥️ Usando o Dashboard no Tablet

1. Abra o navegador no tablet
2. Acesse: `https://seu-projeto.vercel.app`
3. Dados atualizam a cada 3 segundos

### Adicionar à tela inicial (PWA)

- **iOS:** Safari → Compartilhar → Adicionar à Tela de Início
- **Android:** Chrome → Menu → Adicionar à tela inicial

## 📊 Sistema de Prioridades

| Cor | Prioridade | Critérios | Alerta |
|-----|------------|-----------|--------|
| 🔴 | MÁXIMA | 1ª semana, nova ficha, retorno 30+ dias | 5 min |
| 🟠 | ALTA | Semanas 2-4, <8 treinos | 10 min |
| 🟡 | MODERADA | Mês 2, 8-20 treinos | 20 min |
| 🔵 | LEVE | Mês 3, 20-40 treinos | - |
| 🟢 | AUTÔNOMO | 3+ meses, 40+ treinos | - |

## 📁 Estrutura

```
iron-coach-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── check-in/route.ts
│   │   │   └── queue/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── store/
│   │   └── queueStore.ts
│   └── types/
│       └── index.ts
├── package.json
├── tailwind.config.js
└── README.md
```

## 🎯 Fluxo Completo

```
ALUNO                          VERCEL                         TABLET
  │                               │                              │
  │  Abre app → Iniciar Treino   │                              │
  │──────────────────────────────►│                              │
  │       POST /api/check-in      │                              │
  │                               │                              │
  │                               │◄─────────────────────────────│
  │                               │   GET /api/queue (polling)   │
  │                               │──────────────────────────────►│
  │                               │                              │
  │                               │         Mostra na fila       │
  │                               │                              │
  │                               │   Professor clica "Atender"  │
  │                               │                              │
  │  (Professor vai até aluno)   ←──────────────────────────────│
  │                               │                              │
```
