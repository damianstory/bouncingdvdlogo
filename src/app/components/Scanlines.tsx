'use client';

import React, { ReactNode } from 'react';

interface ScanlinesProps {
  opacity?: number;
  className?: string;
  children?: ReactNode;
}

const Scanlines: React.FC<ScanlinesProps> = ({ 
  opacity = 0.3, 
  className = '', 
  children 
}) => {
  const scanlinesStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    pointerEvents: 'none',
    backgroundImage: `
      linear-gradient(
        to bottom,
        transparent,
        transparent 50%,
        rgba(0, 0, 0, ${opacity}) 50%,
        rgba(0, 0, 0, ${opacity})
      )
    `,
    backgroundSize: '100% 4px',
    zIndex: 2,
    mixBlendMode: 'overlay',
  } as React.CSSProperties;

  return (
    <div className={className} style={scanlinesStyle}>
      {children}
    </div>
  );
};

export default Scanlines; 