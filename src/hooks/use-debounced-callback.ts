import { useCallback, useEffect, useRef } from "react";
import { useMemoizedCallback } from "./use-memoized-callback";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
) {
  const fnMemo = useMemoizedCallback(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const debouncedFn = useMemoizedCallback((...args: Parameters<T>) => {
    clear();
    timerRef.current = setTimeout(() => {
      fnMemo(...args);
    }, delay);
  });

  useEffect(() => clear, [clear]);

  return debouncedFn;
}
