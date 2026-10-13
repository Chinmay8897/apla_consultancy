import React, { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";
import { cn } from "../../lib/utils";

function DockItem({
  item,
  mouseX,
  iconSize = 56,
  maxScale = 1.5,
  magneticDistance = 150,
  showLabels = true,
  isVertical = false,
  reducedMotion = false,
}) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
    if (isVertical) {
      return val - bounds.y - bounds.height / 2;
    }
    return val - bounds.x - bounds.width / 2;
  });

  const targetSize = iconSize * maxScale;
  const sizeTransform = useTransform(
    distance,
    [-magneticDistance, 0, magneticDistance],
    [iconSize, targetSize, iconSize]
  );

  const springConfig = {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  };

  const animatedSize = useSpring(sizeTransform, springConfig);
  const currentSize = reducedMotion ? iconSize : animatedSize;

  return (
    <motion.button
      ref={ref}
      style={{
        width: currentSize,
        height: currentSize,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={item.onClick}
      className={cn(
        "relative group flex items-center justify-center",
        "rounded-2xl transition-colors duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-blue-500 dark:focus-visible:ring-offset-neutral-900"
      )}
      whileTap={{ scale: 0.9 }}
      aria-label={item.label}
    >
      <div className="w-1/2 h-1/2 flex items-center justify-center">
        {item.icon}
      </div>

      {item.badge !== undefined && (
        <span
          className={cn(
            "absolute -top-1 -right-1 min-w-5 h-5 px-1.5",
            "flex items-center justify-center",
            "text-xs font-semibold text-white",
            "bg-red-500 rounded-full",
            "shadow-sm shadow-red-500/50"
          )}
        >
          {item.badge}
        </span>
      )}

      <AnimatePresence>
        {showLabels && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: isVertical ? 0 : 8, x: isVertical ? 8 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: isVertical ? 0 : 8, x: isVertical ? 8 : 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute px-3 py-1.5 rounded-lg",
              isVertical ? "left-full ml-3" : "-top-10 left-1/2 -translate-x-1/2",
              "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md",
              "text-neutral-800 dark:text-white text-sm font-medium whitespace-nowrap",
              "border border-neutral-200 dark:border-white/10",
              "shadow-xl shadow-black/10 dark:shadow-black/20",
              "pointer-events-none z-50"
            )}
          >
            {item.label}
            <div
              className={cn(
                "absolute left-1/2 -translate-x-1/2 -bottom-1",
                "w-2 h-2 rotate-45",
                "bg-white dark:bg-neutral-900/95",
                "border-r border-b border-neutral-200 dark:border-white/10"
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          boxShadow: isHovered
            ? "0 0 30px rgba(255,255,255,0.15)"
            : "0 0 0px rgba(255,255,255,0)",
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}

export function MagneticDock({
  items = [],
  iconSize = 56,
  maxScale = 1.5,
  magneticDistance = 150,
  showLabels = true,
  position = "bottom",
  variant = "glass",
  className,
}) {
  const mousePosition = useMotionValue(Infinity);
  const reducedMotion = useReducedMotion() ?? false;
  const isVertical = position === "left" || position === "right";

  const handleMouseMove = React.useCallback(
    (e) => {
      if (isVertical) {
        mousePosition.set(e.clientY);
      } else {
        mousePosition.set(e.clientX);
      }
    },
    [mousePosition, isVertical]
  );

  const handleMouseLeave = () => {
    mousePosition.set(Infinity);
  };

  const variantStyles = {
    glass: cn(
      "bg-white/80 dark:bg-neutral-900/80",
      "backdrop-blur-xl backdrop-saturate-150",
      "border border-neutral-200 dark:border-neutral-700"
    ),
    solid: cn(
      "bg-neutral-100 dark:bg-neutral-900",
      "border border-neutral-300 dark:border-neutral-700"
    ),
    transparent: "bg-transparent border-0",
  };

  const positionStyles = {
    bottom: "flex-row",
    top: "flex-row",
    left: "flex-col",
    right: "flex-col",
  };

  return (
    <motion.div
      onMouseMove={reducedMotion ? undefined : handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "inline-flex items-end gap-2 p-3 rounded-3xl",
        variantStyles[variant],
        positionStyles[position],
        "shadow-xl shadow-black/10 dark:shadow-black/30",
        className
      )}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {items.map((item) => (
        <DockItem
          key={item.id}
          item={item}
          mouseX={mousePosition}
          iconSize={iconSize}
          maxScale={maxScale}
          magneticDistance={magneticDistance}
          showLabels={showLabels}
          isVertical={isVertical}
          reducedMotion={reducedMotion}
        />
      ))}
    </motion.div>
  );
}

export function DockIconHome({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-full h-full", className)}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function DockIconSearch({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-full h-full", className)}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function DockIconFolder({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-full h-full", className)}
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function DockIconMail({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-full h-full", className)}
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export function DockIconSettings({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-full h-full", className)}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
