import { useEffect, useState } from 'react';

/** Loading this long (10s) gets a "still working on it" message. */
export const SLOW_LOAD_MS = 10_000;

/** Becomes true once `ms` have passed since the component mounted. */
export const useTookLong = (ms = SLOW_LOAD_MS) => {
  const [late, setLate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return late;
};
