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
  speed?: number; // New prop for customizable speed
}

// Use forwardRef to allow parent component to access this component's DOM
const DVDLogo = forwardRef<HTMLDivElement, DVDLogoProps>(({ 
  customImage, 
  containerWidth, 
  containerHeight,
  logoColor,
  logoSize = 'medium',
  customText,
  speed = 4.5 // Default speed increased from 3 to 4.5
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

  // Helper function to calculate direction vector from angle
  const getDirectionFromAngle = (angleDegrees: number) => {
    // Convert angle to radians
    const angleRadians = (angleDegrees * Math.PI) / 180;
    
    // Calculate direction vector components
    const x = Math.cos(angleRadians);
    const y = Math.sin(angleRadians);
    
    // Return normalized vector to maintain consistent speed
    return { x, y };
  };

  // Set initial random direction on mount
  useEffect(() => {
    // Generate a random angle between 30-60 degrees
    const baseAngle = 30 + Math.random() * 30;
    
    // Randomly decide whether to use first quadrant (30-60°) or third quadrant (210-240°)
    const finalAngle = Math.random() > 0.5 ? baseAngle : baseAngle + 180;
    
    // Calculate direction vector from angle
    const newDirection = getDirectionFromAngle(finalAngle);
    
    console.log(`Setting initial direction with angle: ${finalAngle}°`, newDirection);
    setDirection(newDirection);
  }, []); // Empty dependency array means this runs once on mount

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
    if (containerWidth === 0 || containerHeight === 0) {
      return; // Skip if container dimensions aren't ready
    }
    
    // Ensure we're using valid dimensions
    const validWidth = Math.max(containerWidth, logoSizePixels);
    const validHeight = Math.max(containerHeight, logoSizePixels);
    
    // Calculate initial position with safe bounds
    const initX = Math.max(0, Math.min(
      Math.random() * (validWidth - logoSizePixels),
      validWidth - logoSizePixels
    ));
    const initY = Math.max(0, Math.min(
      Math.random() * (validHeight - logoSizePixels),
      validHeight - logoSizePixels
    ));
    
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
        
        // Check for X boundary collision - use consistent approach for both sides
        if (newX <= 0 || newX + logoSizePixels >= containerWidth) {
          newDirectionX = -direction.x;
          shouldChangeColor = true;
        }
        
        // Check for Y boundary collision - ensure the logo hits the exact boundary
        if (newY <= 0 || newY + logoSizePixels >= containerHeight) {
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
        
        // Ensure consistent boundary enforcement for all sides
        return {
          x: newX <= 0 ? 0 : newX + logoSizePixels >= containerWidth ? containerWidth - logoSizePixels : newX,
          y: newY <= 0 ? 0 : newY + logoSizePixels >= containerHeight ? containerHeight - logoSizePixels : newY
        };
      });
    };
    
    const animationId = setInterval(animate, 16); // ~60fps
    
    return () => {
      clearInterval(animationId);
    };
  }, [direction, containerWidth, containerHeight, logoSizePixels, logoColor, speed]);

  return (
    <div
      ref={ref}
      className={`absolute rounded-full shadow-lg transition-transform duration-300 ease-out flex items-center justify-center overflow-hidden`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        backgroundImage: customImage ? `url(${customImage})` : color,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s ease-in-out', // Smooth color transition
        width: `${logoSizePixels}px`,
        height: `${logoSizePixels}px`,
        borderRadius: '50%'
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