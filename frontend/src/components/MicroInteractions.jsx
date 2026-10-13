import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Send, Loader2, Plus, FileText } from 'lucide-react';

/**
 * AnimatedTrashButton
 * Micro-interaction: The lid of the trash can lifts and tilts upward on hover.
 */
export function AnimatedTrashButton({ onClick, disabled = false, title = "Delete Item" }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative p-2 rounded-xl transition-all duration-200 group flex items-center justify-center ${
        disabled
          ? 'opacity-30 cursor-not-allowed text-slate-500'
          : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 border border-transparent hover:border-rose-500/30'
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors duration-200"
      >
        {/* Animated Trash Lid */}
        <motion.g
          animate={
            isHovered && !disabled
              ? { rotate: -22, y: -2.5, x: -1 }
              : { rotate: 0, y: 0, x: 0 }
          }
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          style={{ originX: "20%", originY: "30%" }}
        >
          {/* Lid handle & bar */}
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </motion.g>

        {/* Trash Can Body */}
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </button>
  );
}

/**
 * FloatingGlassInput
 * Minimalist dark glassmorphic input with floating label and glowing expanding bottom border.
 */
export function FloatingGlassInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  icon: Icon,
  suffixAction,
  className = "",
  mono = false,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isFilled = value !== undefined && value !== null && String(value).length > 0;

  return (
    <div className={`relative group flex flex-col ${className}`}>
      <div
        className={`relative flex items-center rounded-xl bg-white/[0.03] border transition-all duration-300 backdrop-blur-xl ${
          isFocused
            ? 'border-cyan-500/50 bg-white/[0.06] shadow-[0_0_20px_-3px_rgba(6,182,212,0.25)]'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
        }`}
      >
        {/* Left Icon */}
        {Icon && (
          <div className="pl-3.5 pr-1.5 text-slate-400 group-focus-within:text-cyan-400 transition-colors shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}

        {/* Main Input Field */}
        <div className="relative flex-1 py-1.5 px-3">
          {/* Floating Label */}
          <label
            htmlFor={id}
            className={`block text-[11px] font-semibold tracking-wider uppercase transition-all duration-200 select-none ${
              isFocused
                ? 'text-cyan-300'
                : isFilled
                ? 'text-slate-400'
                : 'text-slate-400'
            }`}
          >
            {label} {required && <span className="text-cyan-400">*</span>}
          </label>

          <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={`w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500/80 focus:outline-none transition-colors ${
              mono ? 'font-mono' : 'font-sans'
            }`}
            {...props}
          />
        </div>

        {/* Optional Suffix Button (e.g., Generate/Randomize) */}
        {suffixAction && (
          <div className="pr-3 pl-1 flex items-center">
            {suffixAction}
          </div>
        )}

        {/* Glowing Expanding Bottom Border */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 rounded-b-xl transition-transform duration-300 origin-center ${
            isFocused ? 'scale-x-100' : 'scale-x-0'
          }`}
        />
      </div>
    </div>
  );
}

/**
 * MagneticGlowButton
 * Large, magnetic-feel glowing CTA button with morphing loading & success states.
 */
export function MagneticGlowButton({
  onClick,
  isGenerating = false,
  isSuccess = false,
  disabled = false
}) {
  const buttonRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!buttonRef.current || isGenerating || disabled) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = (e.clientX - centerX) * 0.15;
    const distanceY = (e.clientY - centerY) * 0.15;
    setOffset({ x: distanceX, y: distanceY });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      className="relative group w-full select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Radial Mesh Glow Behind Button */}
      <div
        className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 blur-lg transition duration-500 opacity-60 group-hover:opacity-100 ${
          isGenerating ? 'animate-pulse opacity-80' : ''
        } ${isSuccess ? 'from-emerald-400 to-teal-500 opacity-90' : ''}`}
      />

      <motion.button
        ref={buttonRef}
        type="submit"
        onClick={onClick}
        disabled={disabled || isGenerating}
        animate={{ x: offset.x, y: offset.y }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        whileTap={{ scale: 0.98 }}
        className={`relative w-full py-4 px-6 rounded-2xl overflow-hidden font-display text-sm font-bold tracking-wider uppercase flex items-center justify-center space-x-3 transition-all duration-300 border shadow-2xl ${
          isSuccess
            ? 'bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border-emerald-400/50 text-emerald-200 shadow-emerald-500/25'
            : isGenerating
            ? 'bg-[#0f172a]/95 border-cyan-500/40 text-cyan-200 cursor-wait shadow-cyan-500/20'
            : 'bg-gradient-to-r from-[#0d162d]/95 to-[#170e2e]/95 hover:from-[#132042]/95 hover:to-[#221345]/95 border-white/20 text-white shadow-indigo-500/30 active:border-cyan-400/60'
        }`}
      >
        {/* Shimmer Sweep Animation */}
        <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        {/* Morphing Content */}
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center space-x-2.5"
            >
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="tracking-widest">DISPATCHING & AUTOMATING...</span>
            </motion.div>
          ) : isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-2 text-emerald-300"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="tracking-widest">INVOICE SEALED & DISPATCHED</span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-2.5"
            >
              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 group-hover:scale-110 transition-transform">
                <Send className="w-4 h-4" />
              </div>
              <span className="bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-transparent font-extrabold tracking-widest">
                GENERATE & TRIGGER AGENTS
              </span>
              <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

/**
 * EmptyCanvasState
 * Beautifully illustrated, subtly animated placeholder in the center of the dynamic canvas.
 */
export function EmptyCanvasState({ onInitializeItem }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md mx-auto my-auto p-8 rounded-3xl glass-card border border-white/10 text-center relative overflow-hidden shadow-2xl"
    >
      {/* Ambient background glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Futuristic Orbital Ring Graphic */}
      <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
        {/* Outer slow spinning dashed ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-dashed border-cyan-500/40"
        />

        {/* Middle pulsing glow ring */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-2 rounded-full border border-purple-500/40 bg-purple-500/5"
        />

        {/* Center Glowing Document Emblem */}
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/20 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
          <FileText className="w-6 h-6" />
        </div>
      </div>

      <h3 className="text-lg font-bold font-display tracking-tight text-white mb-2">
        Dynamic Canvas Standby
      </h3>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-xs mx-auto">
        No active line items. Add your first service row to initiate live document rendering and automated tax calculation.
      </p>

      {/* Glowing Action Button */}
      <motion.button
        type="button"
        onClick={onInitializeItem}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold tracking-wider uppercase shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all border border-cyan-400/40"
      >
        <Plus className="w-4 h-4" />
        <span>Initialize First Item</span>
      </motion.button>
    </motion.div>
  );
}
