import React, { useRef, useState } from 'react';

/**
 * SpotlightCard - Adaptive Light & Dark Spotlight Card
 * Light Mode: Clean white card, crisp subtle slate border, soft hover shadow and gentle sheen.
 * Dark Mode: Obsidian card, subtle translucent border, cosmic glow.
 */
export default function SpotlightCard({
  children,
  className = '',
  spotlightColor,
  borderColor,
  onClick,
}) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 
        bg-white/95 border-slate-200/90 text-slate-800 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-400/50 
        dark:bg-[#0c0e14]/85 dark:border-white/[0.08] dark:text-slate-100 dark:hover:border-white/[0.18] dark:hover:shadow-2xl dark:hover:shadow-indigo-500/10 
        backdrop-blur-xl ${className}`}
    >
      {/* Dynamic Cursor Spotlight Radial Overlay */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 ease-out"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(550px circle at ${position.x}px ${position.y}px, ${spotlightColor || 'rgba(99, 102, 241, 0.12)'}, transparent 45%)`,
        }}
      />

      {/* Dynamic Border Glow Highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl border transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          borderColor: borderColor || 'rgba(99, 102, 241, 0.4)',
          maskImage: `radial-gradient(280px circle at ${position.x}px ${position.y}px, black 30%, transparent 70%)`,
          WebkitMaskImage: `radial-gradient(280px circle at ${position.x}px ${position.y}px, black 30%, transparent 70%)`,
        }}
      />

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
