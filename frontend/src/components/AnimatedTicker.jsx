import React, { useEffect, useState } from 'react';
import { useSpring } from 'framer-motion';

/**
 * AnimatedTicker
 * Spring-physics counting ticker for Indian Currency (INR).
 * Animates smoothly between values when costs, taxes, or totals change.
 */
export function AnimatedTicker({ value, prefix = '₹', className = '' }) {
  const target = typeof value === 'number' ? value : parseFloat(value) || 0;
  const spring = useSpring(target, { mass: 0.5, stiffness: 80, damping: 18 });
  const [current, setCurrent] = useState(target);

  useEffect(() => {
    spring.set(target);
  }, [target, spring]);

  useEffect(() => {
    const unsub = spring.on('change', (v) => {
      setCurrent(v);
    });
    return () => unsub();
  }, [spring]);

  const formatted = Number(Math.max(0, current)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={`inline-flex items-baseline tracking-tight ${className}`}>
      <span className="opacity-70 mr-0.5 text-[0.85em] select-none">{prefix}</span>
      <span>{formatted}</span>
    </span>
  );
}

export default AnimatedTicker;
