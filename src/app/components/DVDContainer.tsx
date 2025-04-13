'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DVDLogo from './DVDLogo';
import GIF from 'gif.js';
import { FiDownload, FiUpload, FiPlus, FiX } from 'react-icons/fi';
import Confetti from 'react-confetti';
import Scanlines from './Scanlines';

// Define TypeScript interfaces
interface AnimationState {
  position: { x: number, y: number };
  direction: { x: number, y: number };
  color: { start: string, end: string };
  size: number;
}

interface GifGenerationState {
  isGenerating: boolean;
  frames: ImageData[];
  frameCount: number;
  gif: any | null;
  startTime: number;
  duration: number;
  initialPosition?: { x: number, y: number };
  initialDirection?: { x: number, y: number };
  initialColor?: { start: string, end: string };
  quality: 'high' | 'medium' | 'low';
}

type AspectRatio = '9:16' | '1:1' | '16:9';

// Add this helper function for type-safe comparisons
const isFormat = (format: AspectRatio, target: AspectRatio): boolean => {
  return format === target;
};

const getContainerDimensions = (format: AspectRatio) => {
  switch (format) {
    case '9:16':
      return { width: '300px', height: '534px' };
    case '1:1':
      return { width: '500px', height: '500px' };
    case '16:9':
      return { width: '800px', height: '450px' };
    default:
      return { width: '800px', height: '450px' };
  }
};

// Helper function to batch process frames to prevent memory issues
const processBatchedFrames = (
  gif: any, 
  frames: ImageData[], 
  canvas: HTMLCanvasElement, 
  delay: number, 
  batchSize = 5,
  onProgress: (progress: number) => void
) => {
  return new Promise<void>((resolve, reject) => {
    const totalFrames = frames.length;
    let processedFrames = 0;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }
    
    // Process frames in batches to avoid memory issues
    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, totalFrames);
      
      for (let i = startIndex; i < endIndex; i++) {
        ctx.putImageData(frames[i], 0, 0);
        gif.addFrame(canvas, { copy: true, delay });
        processedFrames++;
        onProgress(Math.min(90, Math.floor((processedFrames / totalFrames) * 90)));
      }
      
      // Allow DOM to update and GC to run
      setTimeout(() => {
        if (endIndex < totalFrames) {
          processBatch(endIndex);
        } else {
          resolve();
        }
      }, 0);
    };
    
    processBatch(0);
  });
};

const DVDContainer: React.FC = () => {
  // State
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<AspectRatio>('16:9');
  const [gifQuality, setGifQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 450 });
  const [encodingProgress, setEncodingProgress] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [logoColor, setLogoColor] = useState<{ start: string; end: string }>({ start: '#4361ee', end: '#3a0ca3' });
  const [logoSize, setLogoSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [customText, setCustomText] = useState<string>('');
  const [animationSpeed, setAnimationSpeed] = useState<number>(3);
  const [isRetroMode, setIsRetroMode] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number>();
  const customImageRef = useRef<HTMLImageElement | null>(null);
  
  // Checking if the container is empty (no logo rendered yet)
  const isEmptyContainer = !logoRef.current;
  
  // Animation state for GIF recording
  const animationStateRef = useRef<AnimationState>({
    position: { x: 0, y: 0 },
    direction: { x: 1, y: 1 },
    color: { start: '#4361ee', end: '#3a0ca3' },
    size: 72
  });
  
  // GIF generation state
  const gifGenerationRef = useRef<GifGenerationState>({
    isGenerating: false,
    frames: [],
    frameCount: 0,
    gif: null,
    startTime: 0,
    duration: 30000, // 30 seconds minimum
    quality: 'high'
  });
  
  // DVD era color presets
  const colorPresets = [
    { start: '#4361ee', end: '#3a0ca3' }, // Blue
    { start: '#7209b7', end: '#3a0ca3' }, // Purple
    { start: '#f72585', end: '#7209b7' }, // Pink
    { start: '#4cc9f0', end: '#4361ee' }, // Light Blue
    { start: '#f77f00', end: '#d62828' }, // Orange/Red
    { start: '#06d6a0', end: '#118ab2' }, // Teal
  ];
  
  // Setup a ref for the logo element
  const setLogoRefCallback = (node: HTMLDivElement | null) => {
    logoRef.current = node;
    
    // If the node exists, update the animation state with its initial position
    if (node) {
      const rect = node.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
      
      // Calculate position relative to container
      animationStateRef.current.position = {
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top
      };
      
      // Set size based on node dimensions
      animationStateRef.current.size = rect.width;
    }
  };

  // Add a debounced function to synchronize dimensions
  const debouncedUpdateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      // Force update dimensions with actual DOM values
      setContainerDimensions({
        width: rect.width,
        height: rect.height
      });
      
      console.log("Synchronized dimensions:", { width: rect.width, height: rect.height });
    }
  }, []);

  // Ensure dimensions are updated after format changes with a slight delay
  useEffect(() => {
    const timer = setTimeout(() => {
      debouncedUpdateDimensions();
    }, 50); // Small delay to allow DOM to update
    
    return () => clearTimeout(timer);
  }, [selectedFormat, isFullScreen, debouncedUpdateDimensions]);

  useEffect(() => {
    const updateContainerDimensions = () => {
      if (containerRef.current) {
        if (isFullScreen) {
          // In full screen mode, use window dimensions
          setContainerDimensions({
            width: window.innerWidth,
            height: window.innerHeight
          });
        } else {
          // In normal mode, use format dimensions
          const newDimensions = {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight
          };
          setContainerDimensions(newDimensions);
        }
      }
    };

    updateContainerDimensions();
    window.addEventListener('resize', updateContainerDimensions);

    return () => {
      window.removeEventListener('resize', updateContainerDimensions);
    };
  }, [selectedFormat, isFullScreen]);

  // Add a more accurate way to measure the container using getBoundingClientRect()
  useEffect(() => {
    // Function to get precise dimensions from the actual DOM element
    const updatePreciseDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        
        // Only update if there's a meaningful difference (prevents infinite loops)
        if (Math.abs(rect.width - containerDimensions.width) > 1 || 
            Math.abs(rect.height - containerDimensions.height) > 1) {
          console.log("Updating to precise dimensions:", { width: rect.width, height: rect.height });
          setContainerDimensions({
            width: rect.width,
            height: rect.height
          });
        }
      }
    };

    // Run after initial render and any style/layout changes
    updatePreciseDimensions();
    
    // Use ResizeObserver for more accurate dimension tracking
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current) {
          updatePreciseDimensions();
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Cleanup
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [selectedFormat, isFullScreen]); // Rerun when format changes or fullscreen toggle

  useEffect(() => {
    if (!isFullScreen) {
      const dimensions = getContainerDimensions(selectedFormat);
      const newDimensions = {
        width: parseInt(dimensions.width),
        height: parseInt(dimensions.height)
      };
      setContainerDimensions(newDimensions);
    }
  }, [selectedFormat, isFullScreen]);
  
  // Add a debug function to log dimensions
  useEffect(() => {
    if (debugMode && containerRef.current && logoRef.current) {
      const logDimensions = () => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const logoRect = logoRef.current?.getBoundingClientRect();
        
        console.log("Debug dimensions:", {
          container: {
            width: containerRect?.width,
            height: containerRect?.height,
            state: containerDimensions
          },
          logo: {
            width: logoRect?.width,
            height: logoRect?.height,
            position: animationStateRef.current.position
          }
        });
      };
      
      // Log on first render and every second after
      logDimensions();
      const interval = setInterval(logDimensions, 1000);
      
      return () => clearInterval(interval);
    }
  }, [debugMode, containerDimensions]);
  
  // Format selection handler
  const handleFormatSelect = (format: AspectRatio) => {
    setSelectedFormat(format);
    setShowFormatModal(false);
    
    // Trigger dimension update after format change
    setTimeout(debouncedUpdateDimensions, 50);
  };

  // Image upload handler with preview and validation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("File is too large. Please select an image under 5MB.");
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomImage(event.target.result as string);
          
          // Close the modal using state
          setShowUploadModal(false);
          
          // Show a little confirmation
          setTimeout(() => {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
          }, 500);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Create a stable callback for color changes
  const handleColorChange = useCallback((newColor: { start: string; end: string }) => {
    // Update the logoColor state when the DVD logo changes color on collision
    setLogoColor(newColor);
    // Also update the animation state ref for GIF generation
    animationStateRef.current.color = newColor;
  }, []);

  // Update animation state
  const updateAnimationState = (timestamp: number) => {
    const { position, direction, size } = animationStateRef.current;
    
    // Get real-time container dimensions from the DOM for accurate collision detection
    const containerRect = containerRef.current?.getBoundingClientRect();
    const canvasWidth = containerRect?.width || containerDimensions.width;
    const canvasHeight = containerRect?.height || containerDimensions.height;
    
    // Update position based on direction
    position.x += direction.x * animationSpeed;
    position.y += direction.y * animationSpeed;
    
    // Check for collisions and update color if using default logo
    let collisionOccurred = false;
    
    // Handle boundary collisions with precise dimensions
    if (position.x <= 0 || position.x + size >= canvasWidth) {
      direction.x *= -1;
      position.x = Math.max(0, Math.min(position.x, canvasWidth - size));
      collisionOccurred = true;
    }
    
    if (position.y <= 0 || position.y + size >= canvasHeight) {
      direction.y *= -1;
      position.y = Math.max(0, Math.min(position.y, canvasHeight - size));
      collisionOccurred = true;
    }
    
    // Change color on collision when using default logo (no custom image)
    if (collisionOccurred && !customImage) {
      // Pick a random color from colorPresets that's different from current color
      const currentColor = animationStateRef.current.color;
      let newColor;
      do {
        newColor = colorPresets[Math.floor(Math.random() * colorPresets.length)];
      } while (newColor.start === currentColor.start && newColor.end === currentColor.end);
      
      // Update the color in the animation state
      animationStateRef.current.color = { ...newColor };
      
      // Update the state color to trigger re-render
      setLogoColor({ ...newColor });
    }
  };
  
  // Color update on collision
  const updateColorOnCollision = (timestamp: number) => {
    if (!logoColor) {
      const { color } = animationStateRef.current;
      
      // Pick a random color from colorPresets
      const newColor = colorPresets[Math.floor(Math.random() * colorPresets.length)];
      color.start = newColor.start;
      color.end = newColor.end;
    }
  };

  // Function to stop GIF generation
  const stopGifGeneration = () => {
    gifGenerationRef.current.isGenerating = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  // Setup GIF.js with appropriate quality settings
  const qualitySettings = {
    high: { quality: 1, workers: 4, delay: 40, fps: 25 },    // 25fps, highest quality
    medium: { quality: 10, workers: 2, delay: 66, fps: 15 },  // 15fps, medium quality
    low: { quality: 20, workers: 2, delay: 100, fps: 10 }    // 10fps, low quality
  };

  // Default GIF duration in seconds
  const DEFAULT_GIF_DURATION = 10;
  const [gifDuration, setGifDuration] = useState<number>(DEFAULT_GIF_DURATION);

  // Handle download button click
  const handleDownloadGIF = () => {
    setShowDownloadModal(true);
    startGifGeneration();
  };

  // Toggle full screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Start GIF generation function with improved frame capture
  const startGifGeneration = async () => {
    if (!containerRef.current || !canvasRef.current) {
      console.error("Container or canvas ref is null");
      return;
    }
    
    setIsGenerating(true);
    setShowDownloadModal(true);
    setEncodingProgress(0);
    
    try {
      // Setup canvas for capture FIRST
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      // Get accurate container dimensions
      const containerRect = containerRef.current.getBoundingClientRect();
      const actualWidth = containerRect.width;
      const actualHeight = containerRect.height;
      
      console.log("Container dimensions for GIF:", { 
        format: selectedFormat,
        width: actualWidth, 
        height: actualHeight 
      });
      
      // Prepare canvas with ACCURATE dimensions
      canvas.width = actualWidth;
      canvas.height = actualHeight;
      
      // AFTER setting canvas size, create GIF with matching dimensions
      const settings = qualitySettings[gifQuality];
      const gif = new GIF({
        workers: settings.workers,
        quality: settings.quality,
        width: canvas.width,
        height: canvas.height,
        workerScript: '/gif.worker.js',
        repeat: 0,
        background: '#ffffff',
        dither: false
      });
      
      // Calculate frames needed based on duration
      const framesPerSecond = settings.fps;
      const totalFrames = Math.ceil(gifDuration * framesPerSecond);
      const frameDuration = 1000 / framesPerSecond; // milliseconds between frames
      
      console.log(`Generating ${totalFrames} frames at ${framesPerSecond}fps for a ${gifDuration}-second GIF`);
      
      // Setup GIF generation state
      gifGenerationRef.current = {
        ...gifGenerationRef.current,
        isGenerating: true,
        frames: [],
        frameCount: 0,
        gif,
        startTime: Date.now(),
        duration: gifDuration * 1000,  // Convert to milliseconds
        quality: gifQuality
      };
      
      // Store initial animation state to restore later
      const initialPosition = { ...animationStateRef.current.position };
      const initialDirection = { ...animationStateRef.current.direction };
      const initialColor = { ...animationStateRef.current.color };
      
      let frameCount = 0;
      let captureStartTime = Date.now();
      let lastFrameTime = captureStartTime;
      
      // Function to capture a single frame
      const captureFrame = (timestamp: number) => {
        const currentTime = Date.now();
        const elapsedTime = currentTime - captureStartTime;
        
        // Check if we should capture a frame based on frame rate timing
        if (currentTime - lastFrameTime >= frameDuration) {
          // Clear canvas
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw current state of DVD logo
          if (logoRef.current) {
            const rect = logoRef.current.getBoundingClientRect();
            const containerRect = containerRef.current!.getBoundingClientRect();
            
            // Drawing a colored circle/square based on current logo style
            ctx.save();
            const posX = rect.left - containerRect.left;
            const posY = rect.top - containerRect.top;
            const size = rect.width;
            
            // Use the same background as the logo
            if (customImage) {
              const img = new Image();
              img.src = customImage;
              ctx.drawImage(img, posX, posY, size, size);
            } else {
              // Create a gradient similar to the logo color
              const gradient = ctx.createLinearGradient(posX, posY, posX + size, posY + size);
              gradient.addColorStop(0, animationStateRef.current.color.start);
              gradient.addColorStop(1, animationStateRef.current.color.end);
              ctx.fillStyle = gradient;
              
              // Draw circle if the logo is a circle
              ctx.beginPath();
              ctx.arc(posX + size/2, posY + size/2, size/2, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
          
          // Add frame to GIF
          gif.addFrame(canvas, { copy: true, delay: settings.delay });
          
          // Update frame count and timing
          frameCount++;
          lastFrameTime = currentTime;
          
          // Update position for next frame - apply multiple updates to match real speed
          // This ensures the logo moves at the same speed as in the app
          for (let i = 0; i < Math.ceil(frameDuration / 16); i++) {
            updateAnimationState(currentTime);
          }
          
          // Update progress - use time-based progress to be more accurate
          const progressPercentage = Math.min(90, Math.floor((elapsedTime / (gifDuration * 1000)) * 90));
          setEncodingProgress(progressPercentage);
        }
        
        // Continue capturing if we haven't exceeded the duration
        if (elapsedTime < gifDuration * 1000) {
          animationFrameRef.current = requestAnimationFrame(captureFrame);
        } else {
          // We've captured all frames, finalize the GIF
          console.log(`Captured ${frameCount} frames in ${elapsedTime/1000} seconds`);
          finalizeGif();
        }
      };
      
      // Function to finalize the GIF
      const finalizeGif = () => {
        setEncodingProgress(95);
        
        // Add event listeners for GIF rendering
        gif.on('progress', (p) => {
          const progressValue = 95 + Math.floor(p * 5); // From 95% to 100%
          setEncodingProgress(progressValue);
        });
        
        // Handle the finished GIF
        gif.on('finished', (blob) => {
          // Set progress to 100%
          setEncodingProgress(100);
          
          // Create a download URL from the blob
          const url = URL.createObjectURL(blob);
          
          // Create a temporary anchor element to trigger download
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          
          // Format filename correctly based on actual dimensions
          const aspectText = canvas.width > canvas.height 
            ? "landscape" 
            : canvas.width === canvas.height 
              ? "square" 
              : "portrait";
          downloadLink.download = `dvd-logo-${aspectText}-${canvas.width}x${canvas.height}.gif`;
          
          // Append to document, trigger click, and remove
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          
          // Clean up by revoking the object URL
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 100);
          
          // Restore original position and direction
          animationStateRef.current.position = { ...initialPosition };
          animationStateRef.current.direction = { ...initialDirection };
          animationStateRef.current.color = { ...initialColor };
          
          // Close the download modal after a short delay
          setTimeout(() => {
            setIsGenerating(false);
            setShowDownloadModal(false);
          }, 2000);
        });
        
        // Render the GIF (this will trigger the 'finished' event when done)
        gif.render();
      };
      
      // Start the frame capture process using requestAnimationFrame
      animationFrameRef.current = requestAnimationFrame(captureFrame);
      
    } catch (error) {
      console.error("GIF generation error:", error);
      setIsGenerating(false);
      setShowDownloadModal(false);
    }
  };

  // Set initial format based on device on first render
  useEffect(() => {
    // Check if this is a mobile device
    const isMobile = window.innerWidth < 640;
    
    // Set format to 9:16 for mobile, 16:9 for desktop
    if (isMobile) {
      handleFormatSelect('9:16');
    }
  }, []);  // Empty dependency array ensures this runs once on mount

  // Prepare container class names to avoid template literal nesting issues
  let containerClassName = 'flex flex-col items-center justify-center min-h-screen';
  
  if (isFullScreen) {
    containerClassName += ' fixed inset-0 z-50 bg-white m-0 p-0 overflow-hidden';
  } else {
    containerClassName += ' py-12 px-4';
    
    // Always use dark gradient background with white text
    containerClassName += ' bg-gradient-to-br from-black to-gray-900 text-white';
    
    if (isRetroMode) {
      containerClassName += ' bg-[url(/grid-pattern.png)] bg-repeat';
    }
  }

  const containerStyle = isFullScreen
    ? { 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: 'white', 
        margin: 0, 
        padding: 0,
        border: 'none',
        left: 0,
        top: 0,
        position: 'fixed' as const
      }
    : {
        width: getContainerDimensions(selectedFormat).width,
        height: getContainerDimensions(selectedFormat).height,
        minHeight: '50vh',
        marginBottom: '10px'
      };

  return (
    <div className={containerClassName}>
      {!isFullScreen && (
        <div className="w-full max-w-4xl mx-auto mb-4 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">DVD Logo GIF Generator</h1>
          <p className="text-gray-300 text-lg mb-2" style={{ marginTop: '-5px' }}>Create nostalgic bouncing DVD style logo animations</p>
        </div>
      )}
      
      {!isFullScreen && isFormat(selectedFormat, '9:16') && (
        <div className="w-full max-w-md mx-auto mb-2">
          <div className="text-center">
            <div className="flex flex-wrap justify-center mb-2">
              <div className="flex flex-wrap justify-center">
                <button 
                  onClick={() => handleFormatSelect('9:16')}
                  className={`btn flex justify-center items-center w-[80px] h-[40px] ${isFormat(selectedFormat, '9:16') ? 'btn-active' : ''} btn-neutral m-1`}
                  title="Portrait mode, ideal for mobile"
                >
                  9:16
                </button>
                
                <button 
                  onClick={() => handleFormatSelect('1:1')}
                  className={`hidden sm:flex btn justify-center items-center w-[80px] h-[40px] ${isFormat(selectedFormat, '1:1') ? 'btn-active' : ''} btn-neutral m-1`}
                  title="Square format, ideal for social media"
                >
                  1:1
                </button>
                
                <button 
                  onClick={() => handleFormatSelect('16:9')}
                  className={`hidden sm:flex btn justify-center items-center w-[80px] h-[40px] ${isFormat(selectedFormat, '16:9') ? 'btn-active' : ''} btn-neutral m-1`}
                  title="Widescreen format, ideal for presentations"
                >
                  16:9
                </button>
                
                <button 
                  onClick={toggleFullScreen}
                  className={`btn flex justify-center items-center w-[80px] h-[40px] ${isFullScreen ? 'btn-active' : ''} btn-info m-1`}
                  title="Full Screen"
                >
                  Full
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 w-full max-w-sm mx-auto mb-2">
              {customImage ? (
                <button
                  onClick={handleDownloadGIF}
                  className="btn flex justify-center items-center h-[40px] btn-primary px-4 w-[220px] mx-auto"
                >
                  <span>Download GIF</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowUploadModal(true);
                  }}
                  className="btn flex justify-center items-center h-[40px] btn-primary px-4 w-[220px] mx-auto"
                >
                  <span>Upload Your Logo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="relative">
        <div 
          ref={containerRef}
          className={`relative overflow-hidden ${
            isFullScreen ? 'bg-white' : `rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border bg-white border-gray-100`
          }`}
          style={{ 
            ...containerStyle,
            boxShadow: isRetroMode ? '0 0 10px #4cc9f0, 0 0 20px #3a0ca3' : undefined,
            backgroundColor: '#ffffff',
            isolation: 'isolate',
            backgroundImage: 'none',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none'
          }}
        >
          {!customImage && isEmptyContainer && (
            <div className="animate-fade-in">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-indigo-100 rounded-lg mb-4 flex items-center justify-center">
                  <div className="w-16 h-16 rounded bg-indigo-500 opacity-70 flex items-center justify-center text-white font-bold">
                    DVD
                  </div>
                </div>
                <p className="text-center max-w-xs text-gray-500">
                  Your DVD animation will appear here
                </p>
              </div>
            </div>
          )}
          
          <DVDLogo 
            customImage={customImage} 
            containerWidth={containerDimensions.width} 
            containerHeight={containerDimensions.height}
            ref={setLogoRefCallback}
            logoColor={logoColor}
            logoSize={logoSize}
            customText={customText}
            onColorChange={handleColorChange}
          />
          
          {isRetroMode && (
            <Scanlines 
              className="absolute inset-0 pointer-events-none" 
              opacity={0.3}
            />
          )}
        </div>
      </div>
      
      {!isFullScreen && !isFormat(selectedFormat, '9:16') && (
        <div className="w-full max-w-md mx-auto mt-4 mb-2">
          <div className="text-center">
            <div className="flex flex-wrap justify-center mb-2">
              <div className="flex flex-wrap justify-center">
                <button 
                  onClick={() => handleFormatSelect('9:16')}
                  className={`btn flex justify-center items-center w-[100px] h-[40px] ${isFormat(selectedFormat, '9:16') ? 'btn-active' : ''} btn-neutral m-2`}
                  title="Portrait mode, ideal for mobile"
                >
                  9:16
                </button>
                
                <button 
                  onClick={() => handleFormatSelect('1:1')}
                  className={`hidden sm:flex btn justify-center items-center w-[100px] h-[40px] ${isFormat(selectedFormat, '1:1') ? 'btn-active' : ''} btn-neutral m-2`}
                  title="Square format, ideal for social media"
                >
                  1:1
                </button>
                
                <button 
                  onClick={() => handleFormatSelect('16:9')}
                  className={`hidden sm:flex btn justify-center items-center w-[100px] h-[40px] ${isFormat(selectedFormat, '16:9') ? 'btn-active' : ''} btn-neutral m-2`}
                  title="Widescreen format, ideal for presentations"
                >
                  16:9
                </button>
                
                <button 
                  onClick={toggleFullScreen}
                  className={`btn flex justify-center items-center w-[100px] h-[40px] ${isFullScreen ? 'btn-active' : ''} btn-info m-2`}
                  title="Full Screen"
                >
                  Full
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 w-full max-w-sm mx-auto">
              {customImage ? (
                <button
                  onClick={handleDownloadGIF}
                  className="btn flex justify-center items-center h-[40px] btn-primary px-4 w-[240px] mx-auto"
                >
                  <span>Download GIF</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowUploadModal(true);
                  }}
                  className="btn flex justify-center items-center h-[40px] btn-primary px-4 w-[240px] mx-auto"
                >
                  <span>Upload Your Logo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfetti && (
        <Confetti 
          width={window.innerWidth} 
          height={window.innerHeight} 
          recycle={false} 
          numberOfPieces={200} 
          onConfettiComplete={() => setShowConfetti(false)} 
        />
      )}
      
      {isFullScreen && (
        <div style={{ position: 'fixed', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
          <button
            onClick={toggleFullScreen}
            className="btn btn-sm"
          >
            Exit Full Screen
          </button>
        </div>
      )}
      
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto shadow-xl">
            <h3 className="font-bold text-lg text-black">Upload Your Logo</h3>
            <div className="py-4 border-2 border-dashed border-gray-400 rounded-lg text-center mt-4 flex flex-col items-center justify-center">
              <input 
                id="file-upload"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
              />
              <label 
                htmlFor="file-upload" 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
              >
                Choose Image
              </label>
              {customImage && <p className="text-green-600 font-medium mt-2">File selected: {customImage.split('/').pop()}</p>}
            </div>
            
            <div className="bg-blue-100 p-4 rounded-md mt-4">
              {!customImage && <p className="font-medium text-black mb-1">Recommended: 400 x 400px</p>}
              <p className="font-medium text-black">
                It's going to become a circle
              </p>
            </div>
            
            <div className="flex justify-center mt-4">
              <button 
                onClick={() => setShowUploadModal(false)} 
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showDownloadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto shadow-xl">
            <h3 className="font-bold text-lg text-black">Creating Your GIF</h3>
            
            <div className="py-4 text-center mt-4">
              <p className="font-medium text-black mb-2 text-center">
                {encodingProgress < 30 
                  ? "Capturing frames (1/3)" 
                  : encodingProgress < 60
                    ? "Processing (2/3)"
                    : encodingProgress < 100
                      ? "Encoding (3/3)"
                      : "Download complete!"}
              </p>
              <p className="font-medium text-black text-lg mb-4">
                {encodingProgress < 100 
                  ? `${encodingProgress}% complete`
                  : 'Your GIF has been downloaded!'}
              </p>
              
              <div className="w-full bg-gray-200 rounded-full h-4 mb-6 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-4 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${encodingProgress}%` }}
                ></div>
              </div>
              
              {encodingProgress < 100 && (
                <div className="flex justify-center mb-6">
                  <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            
            <div className="flex justify-center mb-2">
              <button
                onClick={() => {
                  if (encodingProgress < 100) {
                    if (animationFrameRef.current) {
                      cancelAnimationFrame(animationFrameRef.current);
                    }
                    gifGenerationRef.current.isGenerating = false;
                  }
                  setIsGenerating(false);
                  setShowDownloadModal(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                {encodingProgress < 100 ? 'Cancel' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="hidden"
        style={{ display: 'none' }}
      />
      
      {!isFullScreen && (
        <footer className="mt-12 text-center text-gray-300 text-sm">
          <p>Create endless DVD style logo animations for presentations, websites, or just for fun.</p>
          <p className="mt-1">Made with 💙 by DameDashDeez.</p>
        </footer>
      )}
    </div>
  );
};

export default DVDContainer;