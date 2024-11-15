/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef } from 'react';

type DependencyList = ReadonlyArray<unknown>;

function shallowEqual(prevDeps: DependencyList, nextDeps: DependencyList): boolean {
  if (prevDeps === nextDeps) {
    return true;
  }

  if (prevDeps.length !== nextDeps.length) {
    return false;
  }

  for (let i = 0; i < prevDeps.length; i++) {
    const prevDep = prevDeps[i];
    const nextDep = nextDeps[i];

    if (typeof prevDep !== 'object' && typeof nextDep !== 'object') {
      if (prevDep !== nextDep) {
        return false;
      }
    } else if (prevDep === null || nextDep === null) {
      if (prevDep !== nextDep) {
        return false;
      }
    } else if (Array.isArray(prevDep) && Array.isArray(nextDep)) {
      if (!shallowEqual(prevDep, nextDep)) {
        return false;
      }
    } else if (typeof prevDep === 'object' && typeof nextDep === 'object') {
      const prevKeys = Object.keys(prevDep as object);
      const nextKeys = Object.keys(nextDep as object);

      if (prevKeys.length !== nextKeys.length) {
        return false;
      }

      for (const key of prevKeys) {
        if ((prevDep as any)[key] !== (nextDep as any)[key]) {
          return false;
        }
      }
    }
  }

  return true;
}

type AnyFunction = (...args: any[]) => any;

export function useWibuCallback<T extends AnyFunction>(
  callback: T,
  dependencies: DependencyList | undefined = undefined
): T {
  const previousDeps = useRef<DependencyList>();
  const previousCallback = useRef<T>();

  // Menggunakan type assertion untuk mengatasi type mismatch
  return useCallback((...args: Parameters<T>): ReturnType<T> => {
    if (
      previousDeps.current &&
      dependencies &&
      shallowEqual(previousDeps.current, dependencies) &&
      previousCallback.current
    ) {
      return previousCallback.current(...args);
    }

    previousDeps.current = dependencies;
    previousCallback.current = callback;
    return callback(...args);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies || []) as T;
}