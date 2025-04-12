'use client';

import React, { useState, useEffect, forwardRef } from 'react';

interface DVDLogoProps {
  customImage: string | null;
  containerWidth: number;
  containerHeight: number;
}

// Use forwardRef to allow parent component to access this component's DOM
const DVDLogo = forwardRef<HTMLDivElement, DVDLogoProps>(({ customImage, containerWidth, containerHeight }, ref) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState({ x: 1, y: 1 });
  const [color, setColor] = useState<string>('linear-gradient(135deg, #4361ee, #3a0ca3)');
  
  const logoSize = 72; // 72x72 pixels
  const speed = 3; // Speed of movement

  // Modern gradients that look good together
  const colors = [
    'linear-gradient(135deg, #4361ee, #3a0ca3)', // blue to deep blue
    'linear-gradient(135deg, #3a0ca3, #7209b7)', // deep blue to purple
    'linear-gradient(135deg, #7209b7, #f72585)', // purple to pink
    'linear-gradient(135deg, #f72585, #4cc9f0)', // pink to light blue
    'linear-gradient(135deg, #4cc9f0, #4361ee)', // light blue to blue
  ];

  // Set initial position
  useEffect(() => {
    const initX = Math.random() * (containerWidth - logoSize);
    const initY = Math.random() * (containerHeight - logoSize);
    console.log("Setting initial position:", { x: initX, y: initY }, "Container:", { width: containerWidth, height: containerHeight });
    setPosition({
      x: initX,
      y: initY
    });
  }, [containerWidth, containerHeight]);

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
        if (newX <= 0 || newX >= containerWidth - logoSize) {
          newDirectionX = -direction.x;
          shouldChangeColor = true;
        }
        
        // Check for Y boundary collision
        if (newY <= 0 || newY >= containerHeight - logoSize) {
          newDirectionY = -direction.y;
          shouldChangeColor = true;
        }
        
        // Change direction if collision
        if (shouldChangeColor) {
          setDirection({ x: newDirectionX, y: newDirectionY });
          setColor(colors[Math.floor(Math.random() * colors.length)]);
        }
        
        return {
          x: newX <= 0 ? 0 : newX >= containerWidth - logoSize ? containerWidth - logoSize : newX,
          y: newY <= 0 ? 0 : newY >= containerHeight - logoSize ? containerHeight - logoSize : newY
        };
      });
    };
    
    const animationId = setInterval(animate, 16); // ~60fps
    
    return () => {
      clearInterval(animationId);
    };
  }, [direction, containerWidth, containerHeight]);

  return (
    <div
      ref={ref}
      className="w-[72px] h-[72px] absolute rounded-lg shadow-lg transition-transform duration-300 ease-out"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        backgroundImage: customImage ? `url(${customImage})` : color,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s ease-in-out', // Smooth color transition
      }}
    />
  );
});

// Display name for debugging
DVDLogo.displayName = 'DVDLogo';

export default DVDLogo; 