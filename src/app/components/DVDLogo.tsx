'use client';

import React, { useState, useEffect, forwardRef } from 'react';

interface DVDLogoProps {
  customImage: string | null;
  containerWidth: number;
  containerHeight: number;
  // New customization properties
  logoColor?: { start: string; end: string };
  logoSize?: 'small' | 'medium' | 'large';
  customText?: string;
}

// Use forwardRef to allow parent component to access this component's DOM
const DVDLogo = forwardRef<HTMLDivElement, DVDLogoProps>(({ 
  customImage, 
  containerWidth, 
  containerHeight,
  logoColor,
  logoSize = 'medium',
  customText
}, ref) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState({ x: 1, y: 1 });
  const [color, setColor] = useState<string>(
    logoColor ? 
    `linear-gradient(135deg, ${logoColor.start}, ${logoColor.end})` : 
    'linear-gradient(135deg, #4361ee, #3a0ca3)'
  );
  
  // Determine logo size based on the logoSize prop
  const getLogoSizeInPixels = () => {
    switch (logoSize) {
      case 'small': return 56;
      case 'large': return 96;
      case 'medium':
      default: return 72;
    }
  };
  
  const logoSizePixels = getLogoSizeInPixels();
  const speed = 3; // Speed of movement

  // Modern gradients that look good together
  const colors = [
    'linear-gradient(135deg, #4361ee, #3a0ca3)', // blue to deep blue
    'linear-gradient(135deg, #3a0ca3, #7209b7)', // deep blue to purple
    'linear-gradient(135deg, #7209b7, #f72585)', // purple to pink
    'linear-gradient(135deg, #f72585, #4cc9f0)', // pink to light blue
    'linear-gradient(135deg, #4cc9f0, #4361ee)', // light blue to blue
  ];

  // Update color when logoColor prop changes
  useEffect(() => {
    if (logoColor) {
      setColor(`linear-gradient(135deg, ${logoColor.start}, ${logoColor.end})`);
    }
  }, [logoColor]);

  // Set initial position
  useEffect(() => {
    const initX = Math.random() * (containerWidth - logoSizePixels);
    const initY = Math.random() * (containerHeight - logoSizePixels);
    console.log("Setting initial position:", { x: initX, y: initY }, "Container:", { width: containerWidth, height: containerHeight });
    setPosition({
      x: initX,
      y: initY
    });
  }, [containerWidth, containerHeight, logoSizePixels]);

  // Animation effect
  useEffect(() => {
    if (containerWidth === 0 || containerHeight === 0) {
      console.log("Container dimensions not yet set, skipping animation");
      return;
    }

    console.log("Starting animation with container:", { width: containerWidth, height: containerHeight });
    
    const animate = () => {
      setPosition(prevPosition => {
        const newX = prevPosition.x + direction.x * speed;
        const newY = prevPosition.y + direction.y * speed;
        
        let newDirectionX = direction.x;
        let newDirectionY = direction.y;
        let shouldChangeColor = false;
        
        // Check for X boundary collision
        if (newX <= 0 || newX >= containerWidth - logoSizePixels) {
          newDirectionX = -direction.x;
          shouldChangeColor = true;
        }
        
        // Check for Y boundary collision
        if (newY <= 0 || newY >= containerHeight - logoSizePixels) {
          newDirectionY = -direction.y;
          shouldChangeColor = true;
        }
        
        // Change direction if collision
        if (shouldChangeColor) {
          setDirection({ x: newDirectionX, y: newDirectionY });
          if (!logoColor) { // Only auto-change color if not manually set
            setColor(colors[Math.floor(Math.random() * colors.length)]);
          }
        }
        
        return {
          x: newX <= 0 ? 0 : newX >= containerWidth - logoSizePixels ? containerWidth - logoSizePixels : newX,
          y: newY <= 0 ? 0 : newY >= containerHeight - logoSizePixels ? containerHeight - logoSizePixels : newY
        };
      });
    };
    
    const animationId = setInterval(animate, 16); // ~60fps
    
    return () => {
      clearInterval(animationId);
    };
  }, [direction, containerWidth, containerHeight, logoSizePixels, logoColor]);

  return (
    <div
      ref={ref}
      className={`absolute rounded-lg shadow-lg transition-transform duration-300 ease-out flex items-center justify-center overflow-hidden`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        backgroundImage: customImage ? `url(${customImage})` : color,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s ease-in-out', // Smooth color transition
        width: `${logoSizePixels}px`,
        height: `${logoSizePixels}px`,
      }}
    >
      {customText && (
        <span className="text-white font-bold text-xs md:text-sm lg:text-base leading-tight text-center px-1" 
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
          {customText.substring(0, 20)}
        </span>
      )}
    </div>
  );
});

// Display name for debugging
DVDLogo.displayName = 'DVDLogo';

export default DVDLogo; 