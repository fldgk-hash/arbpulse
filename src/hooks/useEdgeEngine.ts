import { useEffect, useState } from 'react';
import { edgeStore } from '@/engine/edge/edgeStore';
import type { EdgeSnapshot } from '@/engine/edge/types';

export function useEdgeEngine() {
  const [snap, setSnap] = useState<EdgeSnapshot | null>(null);
  useEffect(() => {
    const unsub = edgeStore.subscribe(setSnap);
    return unsub;
  }, []);
  return snap;
}
