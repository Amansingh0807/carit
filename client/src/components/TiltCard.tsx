import React, { useRef, useState } from 'react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number; // Maximum tilt angle in degrees
  perspective?: number; // Perspective distance in px
  scale?: number; // Hover scale multiplier
  glowColor?: string; // Color of the glow effect
  className?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  maxTilt = 8,
  perspective = 1000,
  scale = 1.015,
  glowColor = 'rgba(0, 255, 157, 0.12)',
  className = '',
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const [glowStyle, setGlowStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    
    // Check if user has high contrast mode enabled (which we respect by disabling tilts)
    const isHighContrast = document.documentElement.classList.contains('high-contrast');
    if (isHighContrast) {
      return;
    }

    const rect = card.getBoundingClientRect();
    
    // Relative mouse positions
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Compute normalized coordinates from -0.5 to 0.5
    const normX = (x / rect.width) - 0.5;
    const normY = (y / rect.height) - 0.5;
    
    // Compute rotation angles (X rotation depends on relative Y, Y rotation depends on relative X)
    const tiltX = -normY * maxTilt;
    const tiltY = normX * maxTilt;
    
    setTiltStyle({
      transform: `perspective(${perspective}px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transition: 'transform 0.05s ease-out',
    });

    setGlowStyle({
      opacity: 1,
      background: `radial-gradient(circle 200px at ${x}px ${y}px, ${glowColor}, transparent 80%)`,
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`,
      transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
    });
    setGlowStyle({
      opacity: 0,
      transition: 'opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className={`glass-card relative overflow-hidden transition-all duration-300 ${className}`}
      {...props}
    >
      {/* 3D Moving Light Reflection Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-20 mix-blend-screen"
        style={glowStyle}
      />
      {/* Card Content with preserve-3d capability */}
      <div className="relative z-10 w-full h-full transform-style-3d">
        {children}
      </div>
    </div>
  );
};
