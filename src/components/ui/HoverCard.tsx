import React, { useState } from 'react';

interface HoverCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const HoverCard: React.FC<HoverCardProps> = ({ children, onClick, className, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
        borderColor: hovered ? '#d4af37' : undefined,
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.08)' : undefined,
        transform: hovered && onClick ? 'translateY(-1px)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
