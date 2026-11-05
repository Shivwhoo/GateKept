import { useEffect, useRef } from 'react';

/**
 * Hook to poll an asynchronous function every intervalMs
 * @param {Function} callback
 * @param {number} intervalMs
 * @param {boolean} [enabled=true]
 */
export function usePolling(callback, intervalMs = 5000, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // Run immediately once
    savedCallback.current();

    const id = setInterval(() => {
      savedCallback.current();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}