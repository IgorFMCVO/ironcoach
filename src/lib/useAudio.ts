// ============================================================================
// IRON COACH - Hook de Audio para Feedback Sonoro
// Usa Web Audio API para gerar sons sem arquivos externos
// ============================================================================

'use client';

import { useCallback, useRef, useEffect } from 'react';

type SoundType = 'beep' | 'alert' | 'success' | 'tick' | 'warning';

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  // Inicializa o AudioContext (precisa de interação do usuário primeiro)
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    };

    // Tenta inicializar no primeiro clique
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Toca um som baseado no tipo
  const playSound = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;
    
    // Tenta inicializar se ainda não foi
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        console.warn('Web Audio API não suportada');
        return;
      }
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Configurações baseadas no tipo de som
    switch (type) {
      case 'beep':
        // Beep curto para tick do timer
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
        break;

      case 'tick':
        // Tick suave para cada segundo nos últimos 5s
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.05;
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.05);
        break;

      case 'alert':
        // Som de alerta (alguém pediu ajuda)
        oscillator.frequency.value = 660;
        oscillator.type = 'square';
        gainNode.gain.value = 0.2;
        oscillator.start();
        // Modulação para chamar atenção
        setTimeout(() => {
          oscillator.frequency.value = 880;
        }, 150);
        setTimeout(() => {
          oscillator.frequency.value = 660;
        }, 300);
        oscillator.stop(ctx.currentTime + 0.5);
        break;

      case 'warning':
        // Som de aviso (tempo acabando)
        oscillator.frequency.value = 520;
        oscillator.type = 'triangle';
        gainNode.gain.value = 0.15;
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.2);
        break;

      case 'success':
        // Som de sucesso (intervenção concluída)
        oscillator.frequency.value = 523; // C5
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 659; // E5
          osc2.type = 'sine';
          gain2.gain.value = 0.1;
          osc2.start();
          osc2.stop(ctx.currentTime + 0.15);
        }, 100);
        oscillator.stop(ctx.currentTime + 0.15);
        break;
    }
  }, []);

  // Toca sequência de beeps (para timer acabando)
  const playCountdown = useCallback((secondsLeft: number) => {
    if (secondsLeft <= 5 && secondsLeft > 0) {
      playSound('tick');
    }
    if (secondsLeft === 0) {
      playSound('warning');
    }
  }, [playSound]);

  // Habilita/desabilita sons
  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  // Função de alerta específica para quando card "grita"
  const playAlert = useCallback(() => {
    playSound('alert');
  }, [playSound]);

  return {
    playSound,
    playAlert,
    playCountdown,
    setEnabled,
    isEnabled: () => enabledRef.current,
  };
}

// Hook para vibração (mobile)
export function useVibration() {
  const vibrate = useCallback((pattern: number | number[] = 200) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const vibrateAlert = useCallback(() => {
    vibrate([100, 50, 100, 50, 200]);
  }, [vibrate]);

  const vibrateSuccess = useCallback(() => {
    vibrate([50, 30, 50]);
  }, [vibrate]);

  return { vibrate, vibrateAlert, vibrateSuccess };
}