import { useCallback, useSyncExternalStore } from 'react';
import type { SetStateAction } from 'react';

export type GlobalFilters = {
  kecamatan: string | null;
  jenis_kelamin: string | null;
  age_group: string | null;
  periode: string | null;
  status_stunting: string | null;
};

export const EMPTY_GLOBAL_FILTERS: GlobalFilters = {
  kecamatan: null,
  jenis_kelamin: null,
  age_group: null,
  periode: null,
  status_stunting: null,
};

let snapshot: GlobalFilters = { ...EMPTY_GLOBAL_FILTERS };
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => snapshot;

export function useGlobalFilters() {
  const filters = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );

  const setFilters = useCallback(
    (update: SetStateAction<GlobalFilters>) => {
      const next =
        typeof update === 'function'
          ? update(snapshot)
          : update;

      const same = (
        Object.keys(EMPTY_GLOBAL_FILTERS) as
        (keyof GlobalFilters)[]
      ).every((key) => next[key] === snapshot[key]);

      if (same) return;

      snapshot = { ...next };
      listeners.forEach((listener) => listener());
    },
    []
  );

  return { filters, setFilters };
}
