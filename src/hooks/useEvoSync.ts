// src/hooks/useEvoSync.ts
// ============================================================================
// IRON COACH - Hook de Sincronização EVO (v6)
// - Usa allActiveEntries do backend (já ordenado: mais recentes primeiro)
// - Não manipula ordem - confia no backend
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';

export interface RecentEntry {
  name: string;
  time: string;       // Horário EXATO de chegada (ex: "19:45")
  priority?: string;
  tags?: string[];
  daysAsMember?: number;
}

interface UseEvoSyncOptions {
  enabled?: boolean;
  intervalMs?: number;
  onNewEntry?: (names: string[]) => void;
  onCheckout?: (names: string[]) => void;
}

export function useEvoSync({
  enabled = true,
  intervalMs = 5000,
  onNewEntry,
  onCheckout,
}: UseEvoSyncOptions = {}) {
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const onNewEntryRef = useRef(onNewEntry);
  const onCheckoutRef = useRef(onCheckout);
  const isFirstSyncRef = useRef(true);

  useEffect(() => {
    onNewEntryRef.current = onNewEntry;
    onCheckoutRef.current = onCheckout;
  }, [onNewEntry, onCheckout]);

  const doSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/webhook/evo/sync');
      const result = await response.json();
      
      if (result.success && result.data) {
        const { addedMembers = [], removedMembers = [], allActiveEntries = [] } = result.data;
        
        // USAR allActiveEntries DIRETAMENTE - já vem ordenado do backend
        // Mais recentes primeiro (DESC por check_in_time)
        setRecentEntries(allActiveEntries);
        
        // Notificar novas entradas (exceto na primeira sync)
        if (!isFirstSyncRef.current && addedMembers.length > 0) {
          if (onNewEntryRef.current) {
            onNewEntryRef.current(addedMembers.map((m: any) => m.name));
          }
        }
        
        // Notificar saídas
        if (removedMembers.length > 0 && onCheckoutRef.current) {
          onCheckoutRef.current(removedMembers.map((m: any) => m.name));
        }
        
        isFirstSyncRef.current = false;
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('Erro no sync:', error);
    } finally {
      setIsLoading(false);
      isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Sync inicial imediato
    doSync();

    // Polling a cada intervalMs
    intervalRef.current = setInterval(doSync, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, doSync]);

  return {
    recentEntries,
    lastSyncTime,
    isLoading,
    triggerSync: doSync,
  };
}
