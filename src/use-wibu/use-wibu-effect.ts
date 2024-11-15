/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';

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

export function useWibuEffect(
  effect: () => void | (() => void), 
  dependencies: DependencyList | undefined = undefined
): void {
  const previousDeps = useRef<DependencyList | undefined>(undefined);
  const effectRef = useRef(effect);
  const depsRef = useRef(dependencies);

  // Update refs
  effectRef.current = effect;
  depsRef.current = dependencies;

  useEffect(() => {
    if (!depsRef.current || !previousDeps.current || !shallowEqual(previousDeps.current, depsRef.current)) {
      previousDeps.current = depsRef.current;
      return effectRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Run effect when dependencies change
  useEffect(() => {
    if (!dependencies || !previousDeps.current || !shallowEqual(previousDeps.current, dependencies)) {
      previousDeps.current = dependencies;
      return effect();
    }
    // We're explicitly disabling exhaustive-deps here because we want to control
    // when the effect runs based on our shallow comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}