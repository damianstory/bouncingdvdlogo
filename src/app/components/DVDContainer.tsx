'use client';

import React, { useState, useEffect, useRef } from 'react';
import DVDLogo from './DVDLogo';
import GIF from 'gif.js';

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
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<AspectRatio>('16:9');
  const [gifQuality, setGifQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 450 });
  const animationFrameRef = useRef<number>();
  const [encodingProgress, setEncodingProgress] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  
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
    quality: 'medium'
  });
  
  // Custom image reference
  const customImageRef = useRef<HTMLImageElement | null>(null);

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
          console.log("Updated container dimensions:", newDimensions);
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

  useEffect(() => {
    if (!isFullScreen) {
      const dimensions = getContainerDimensions(selectedFormat);
      const newDimensions = {
        width: parseInt(dimensions.width),
        height: parseInt(dimensions.height)
      };
      console.log("Setting dimensions from format:", selectedFormat, newDimensions);
      setContainerDimensions(newDimensions);
    }
  }, [selectedFormat, isFullScreen]);
  
  // Preload custom image if it exists
  useEffect(() => {
    if (customImage) {
      const img = new Image();
      img.src = customImage;
      img.onload = () => {
        customImageRef.current = img;
        setLoadingStep(10);
      };
    }
  }, [customImage]);

  const loadingColors = [
    'bg-blue-500',
    'bg-blue-400',
    'bg-indigo-500',
    'bg-indigo-400',
    'bg-purple-500',
    'bg-purple-400',
    'bg-violet-500',
    'bg-violet-400',
    'bg-violet-300',
    'bg-violet-200',
  ];

  const handleFormatSelect = (format: AspectRatio) => {
    setSelectedFormat(format);
    setShowFormatModal(false);
  };

  const handleQualityChange = (quality: 'high' | 'medium' | 'low') => {
    setGifQuality(quality);
    gifGenerationRef.current.quality = quality;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
        setShowUploadModal(false);
        
        // Preload the image for recording
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          customImageRef.current = img;
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to update animation state (position, direction, and color)
  const updateAnimationState = (timestamp: number) => {
    const { position, direction, size } = animationStateRef.current;
    const canvasWidth = canvasRef.current?.width || containerDimensions.width;
    const canvasHeight = canvasRef.current?.height || containerDimensions.height;
    
    // Update position based on direction
    position.x += direction.x * 3; // Speed = 3px per frame
    position.y += direction.y * 3;
    
    // Handle boundary collisions
    if (position.x <= 0 || position.x + size >= canvasWidth) {
      direction.x *= -1;
      position.x = Math.max(0, Math.min(position.x, canvasWidth - size));
      
      // Update color on collision
      updateColorOnCollision(timestamp);
    }
    
    if (position.y <= 0 || position.y + size >= canvasHeight) {
      direction.y *= -1;
      position.y = Math.max(0, Math.min(position.y, canvasHeight - size));
      
      // Update color on collision
      updateColorOnCollision(timestamp);
    }
  };
  
  // Function to update color on collision
  const updateColorOnCollision = (timestamp: number) => {
    // Calculate dynamic hue based on timestamp
    const hue1 = (timestamp / 50) % 360;
    const hue2 = (hue1 + 60) % 360;
    
    animationStateRef.current.color = {
      start: `hsl(${hue1}, 80%, 60%)`,
      end: `hsl(${hue2}, 80%, 60%)`
    };
  };
  
  // Function to draw logo on canvas
  const drawLogoOnCanvas = (ctx: CanvasRenderingContext2D) => {
    const { position, color, size } = animationStateRef.current;
    
    // Clear the canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw the logo
    if (customImage && customImageRef.current) {
      // Draw custom image
      ctx.drawImage(customImageRef.current, position.x, position.y, size, size);
    } else {
      // Draw default DVD logo (gradient circle)
      ctx.beginPath();
      ctx.arc(position.x + size/2, position.y + size/2, size/2, 0, Math.PI * 2);
      
      // Create gradient
      const gradient = ctx.createLinearGradient(
        position.x, 
        position.y, 
        position.x + size, 
        position.y + size
      );
      gradient.addColorStop(0, color.start);
      gradient.addColorStop(1, color.end);
      
      ctx.fillStyle = gradient;
      ctx.fill();
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
  // Quality settings map to worker count and sample interval
  const qualitySettings = {
    high: { quality: 1, workers: 4, delay: 40, fps: 25 },    // 25fps, highest quality
    medium: { quality: 10, workers: 2, delay: 66, fps: 15 },  // 15fps, medium quality
    low: { quality: 20, workers: 2, delay: 100, fps: 10 }    // 10fps, low quality
  };

  // Start GIF generation function
  const startGifGeneration = async () => {
    if (!containerRef.current || !canvasRef.current) {
      console.error("Container or canvas ref is null");
      return;
    }

    console.log("Starting GIF generation process");
    
    // Set recording state
    setIsGenerating(true);
    setShowDownloadModal(true);
    setEncodingProgress(0);
    
    try {
      // Get container dimensions
      const container = containerRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to exactly match container dimensions
      const containerRect = container.getBoundingClientRect();
      canvas.width = containerRect.width;
      canvas.height = containerRect.height;
      console.log("Canvas dimensions set to:", canvas.width, "x", canvas.height);
      
      // If in debug mode, show the canvas
      if (debugMode) {
        canvas.style.display = 'block';
        canvas.style.position = 'fixed';
        canvas.style.top = '10px';
        canvas.style.left = '10px';
        canvas.style.border = '2px solid red';
        canvas.style.zIndex = '9999';
      } else {
        canvas.style.display = 'none';
      }
      
      // Create a canvas context for drawing
      const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      // Initialize animation state
      if (logoRef.current) {
        // Get the current position of the actual logo
        const logoRect = logoRef.current.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate position within container bounds
        const initialX = logoRect.left - containerRect.left;
        const initialY = logoRect.top - containerRect.top;
        
        // Set initial state based on actual logo position
        animationStateRef.current = {
          position: {
            x: initialX,
            y: initialY
          },
          direction: { x: 1, y: 1 },
          color: { start: '#4361ee', end: '#3a0ca3' }, // Initial blue gradients
          size: logoRect.width
        };
        
        // Store initial state for loop creation
        gifGenerationRef.current.initialPosition = { x: initialX, y: initialY };
        gifGenerationRef.current.initialDirection = { x: 1, y: 1 };
        gifGenerationRef.current.initialColor = { start: '#4361ee', end: '#3a0ca3' };
      }
      
      const settings = qualitySettings[gifGenerationRef.current.quality];
      
      // Create GIF instance with optimized settings
      const gif = new GIF({
        workers: settings.workers,
        quality: settings.quality,
        width: canvas.width,
        height: canvas.height,
        workerScript: window.location.origin + '/gif.worker.js',
        repeat: 0,  // 0 means loop forever
        background: '#ffffff',
        dither: false
      });
      
      // Handle progress events
      gif.on('progress', (progress: number) => {
        // Progress from GIF.js is 0-1, and starts after frame capture
        // We map this to 90-100% since frame capture is 0-90%
        const gifProgress = 90 + (progress * 10);
        setEncodingProgress(Math.floor(gifProgress));
        console.log(`GIF encoding progress: ${Math.floor(gifProgress)}%`);
      });
      
      // Configure GIF generation state
      gifGenerationRef.current = {
        ...gifGenerationRef.current,
        isGenerating: true,
        frames: [],
        frameCount: 0,
        gif,
        startTime: Date.now(),
        duration: 30000,  // 30 seconds minimum
        quality: gifQuality
      };
      
      // Add a warm-up period before starting to capture frames
      console.log("Starting animation warm-up period...");
      setEncodingProgress(5);
      
      // Run animation for a few seconds before capturing frames to stabilize it
      const warmupDuration = 4000; // 4 second warm-up
      const warmUpAnimation = (timestamp: number) => {
        if (!gifGenerationRef.current.isGenerating) return;
        
        // Calculate elapsed warm-up time
        const elapsed = Date.now() - gifGenerationRef.current.startTime;
        
        // Update animation state and draw (but don't capture)
        updateAnimationState(timestamp);
        if (ctx) {
          drawLogoOnCanvas(ctx);
        }
        
        // Continue warm-up or start capturing
        if (elapsed < warmupDuration) {
          // Update warm-up progress (0-5%)
          const warmupProgress = Math.min(5, Math.floor((elapsed / warmupDuration) * 5));
          setEncodingProgress(warmupProgress);
          
          // Continue warm-up
          animationFrameRef.current = requestAnimationFrame(warmUpAnimation);
        } else {
          console.log("Warm-up complete, starting frame capture");
          // Reset start time for actual capture
          gifGenerationRef.current.startTime = Date.now();
          // Start actual frame capture
          animationFrameRef.current = requestAnimationFrame(captureFrame);
        }
      };
      
      // Define animation function for capturing frames
      const captureFrame = (timestamp: number) => {
        if (!gifGenerationRef.current.isGenerating) return;
        
        // Calculate elapsed time
        const elapsed = Date.now() - gifGenerationRef.current.startTime;
        const duration = gifGenerationRef.current.duration;
        
        try {
          // If approaching the end of the duration, start returning to initial position
          // This creates a seamless loop by returning to the starting point
          if (elapsed >= duration - 2000) { // Last 2 seconds
            const timeRemaining = duration - elapsed;
            const initialPos = gifGenerationRef.current.initialPosition;
            
            if (initialPos && ctx) {
              // Calculate how much to move each frame to get back to start
              const currentPos = animationStateRef.current.position;
              const distanceX = initialPos.x - currentPos.x;
              const distanceY = initialPos.y - currentPos.y;
              
              // Gradually adjust position to match initial position
              const framesRemaining = timeRemaining / (1000 / settings.fps);
              
              if (framesRemaining > 0) {
                const stepX = distanceX / framesRemaining;
                const stepY = distanceY / framesRemaining;
                
                // Update position directly for smooth return
                animationStateRef.current.position.x += stepX;
                animationStateRef.current.position.y += stepY;
                
                // Gradually restore initial color and direction
                if (gifGenerationRef.current.initialColor && gifGenerationRef.current.initialDirection) {
                  // Smooth blend to original color
                  const initialColor = gifGenerationRef.current.initialColor;
                  animationStateRef.current.color.start = initialColor.start;
                  animationStateRef.current.color.end = initialColor.end;
                  
                  // Gradually restore initial direction
                  animationStateRef.current.direction = gifGenerationRef.current.initialDirection;
                }
                
                // Draw with adjusted position
                drawLogoOnCanvas(ctx);
              }
            }
          } else {
            // Normal animation
            // Update animation state (position, direction, color)
            updateAnimationState(timestamp);
            
            // Draw logo on canvas
            if (ctx) {
              drawLogoOnCanvas(ctx);
            }
          }
          
          // Capture the frame at intervals based on quality setting
          if (elapsed % settings.delay < 20) { // Only capture every X ms based on desired FPS
            // Get the image data from the canvas
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            gifGenerationRef.current.frames.push(imageData);
            gifGenerationRef.current.frameCount++;
            
            // Update capture progress (5-90%)
            const captureProgress = 5 + Math.min(85, Math.floor((elapsed / duration) * 85));
            setEncodingProgress(captureProgress);
          }
          
          // If we've reached the duration, finish frame capture and start GIF creation
          if (elapsed >= duration) {
            console.log(`Reached capture duration limit of ${duration / 1000}s with ${gifGenerationRef.current.frameCount} frames`);
            finishGifGeneration();
            return;
          }
          
          // Request next frame
          animationFrameRef.current = requestAnimationFrame(captureFrame);
        } catch (error) {
          console.error("Frame capture error:", error);
          stopGifGeneration();
          setIsGenerating(false);
          setShowDownloadModal(false);
        }
      };
      
      // Start with warm-up period
      animationFrameRef.current = requestAnimationFrame(warmUpAnimation);
      
    } catch (error) {
      console.error("GIF setup error:", error);
      setIsGenerating(false);
      setShowDownloadModal(false);
      alert("Failed to set up GIF generation. Please try again or use a different browser.");
    }
  };
  
  // Function to finalize GIF generation and handle download
  const finishGifGeneration = async () => {
    console.log("Finishing GIF generation and starting encoding");
    
    try {
      const { frames, gif } = gifGenerationRef.current;
      
      if (frames.length === 0 || !gif || !canvasRef.current) {
        throw new Error("No frames captured or GIF not initialized");
      }
      
      // Set encoding progress
      setEncodingProgress(90);
      
      // Get quality settings
      const qualitySettings = {
        high: { delay: 66 },    // 15fps
        medium: { delay: 66 },  // 15fps
        low: { delay: 100 }     // 10fps
      };
      
      const settings = qualitySettings[gifGenerationRef.current.quality];
      
      // Process frames in batches to prevent memory issues
      await processBatchedFrames(
        gif, 
        frames, 
        canvasRef.current, 
        settings.delay, 
        5, 
        (progress) => setEncodingProgress(progress)
      );
      
      // Add finished handler
      gif.on('finished', (blob: Blob) => {
        console.log(`GIF generation completed, size: ${blob.size} bytes`);
        console.log('Blob MIME type:', blob.type);
        setEncodingProgress(100);
        
        try {
          // Create URL for the GIF blob
          const url = URL.createObjectURL(blob);
          
          // Create a preview element
          const img = document.createElement('img');
          img.src = url;
          img.style.position = 'fixed';
          img.style.bottom = '10px';
          img.style.right = '10px';
          img.style.width = '300px'; // Bigger preview
          img.style.zIndex = '9999';
          img.style.border = '2px solid black';
          document.body.appendChild(img);
          
          console.log("Preview GIF added to page");
          
          // Create download link
          const a = document.createElement('a');
          a.href = url;
          a.download = `bouncing-logo-${selectedFormat}-${Date.now()}.gif`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(a);
            setTimeout(() => {
              document.body.removeChild(img);
            }, 10000); // 10 seconds
            URL.revokeObjectURL(url);
            
            // Reset state
            gifGenerationRef.current.frames = [];
            gifGenerationRef.current.isGenerating = false;
            setIsGenerating(false);
            setShowDownloadModal(false);
          }, 1000);
        } catch (error) {
          console.error("Download error:", error);
          setIsGenerating(false);
          setShowDownloadModal(false);
        }
      });
      
      // Start rendering the GIF
      console.log(`Starting GIF render with ${frames.length} frames`);
      gif.render();
      
    } catch (error) {
      console.error("GIF finalization error:", error);
      stopGifGeneration();
      setIsGenerating(false);
      setShowDownloadModal(false);
      alert("Failed to generate the GIF. Please try again with a smaller size or lower quality.");
    }
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Ensure GIF generation stops if component unmounts
      gifGenerationRef.current.isGenerating = false;
    };
  }, []);

  const handleDownloadGIF = () => {
    setShowDownloadModal(true);
    startGifGeneration();
  };

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    
    // When exiting full screen, reset to the selected format dimensions
    if (isFullScreen) {
      const dimensions = getContainerDimensions(selectedFormat);
      setContainerDimensions({
        width: parseInt(dimensions.width),
        height: parseInt(dimensions.height)
      });
    } else {
      // When entering full screen, update dimensions to window size
      setContainerDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
  };

  const dimensions = getContainerDimensions(selectedFormat);

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen ${isFullScreen ? 'fixed inset-0 z-50 bg-black m-0 p-0' : 'py-12 px-4 bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      {/* App header - not shown in fullscreen mode */}
      {!isFullScreen && (
        <div className="w-full max-w-4xl mx-auto mb-8 text-center">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">DVD Logo GIF Generator</h1>
          <p className="text-gray-600 text-lg">Create nostalgic bouncing DVD logo animations</p>
        </div>
      )}
    
      <div className="relative">
        {/* Main container with enhanced shadow and rounded edges */}
        <div 
          ref={containerRef}
          className={`relative overflow-hidden bg-white ${isFullScreen 
            ? '' 
            : 'rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-gray-100 transition-all duration-300'}`}
          style={{ 
            width: isFullScreen ? '100vw' : getContainerDimensions(selectedFormat).width, 
            height: isFullScreen ? '100vh' : getContainerDimensions(selectedFormat).height 
          }}
        >
          {/* Default bouncing logo or uploaded custom image */}
          <DVDLogo 
            customImage={customImage} 
            containerWidth={containerDimensions.width} 
            containerHeight={containerDimensions.height}
            ref={setLogoRefCallback}
          />
        </div>
      </div>
      
      {/* Exit full screen button - only visible in full screen mode */}
      {isFullScreen && (
        <button
          onClick={toggleFullScreen}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-200"
        >
          Exit Full Screen
        </button>
      )}
      
      {/* Controls container - only show when not in full screen mode */}
      {!isFullScreen && (
        <div className="w-full max-w-md mx-auto mt-10 mb-6">
          {/* Format selection text and buttons */}
          <div className="text-center mb-6">
            <p className="text-xl font-medium mb-4 text-gray-800">Choose your format</p>
            <div className="flex justify-center gap-3 mb-6">
              <button 
                onClick={() => handleFormatSelect('9:16')}
                className={`px-6 py-3 rounded-lg transition-all duration-200 ${
                  selectedFormat === '9:16' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                9:16
              </button>
              <button 
                onClick={() => handleFormatSelect('1:1')}
                className={`px-6 py-3 rounded-lg transition-all duration-200 ${
                  selectedFormat === '1:1' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                1:1
              </button>
              <button 
                onClick={() => handleFormatSelect('16:9')}
                className={`px-6 py-3 rounded-lg transition-all duration-200 ${
                  selectedFormat === '16:9' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                16:9
              </button>
            </div>
            
            {/* GIF Quality selector */}
            {customImage && (
              <div className="mb-6">
                <p className="text-sm font-medium mb-2 text-gray-700">GIF Quality</p>
                <div className="flex justify-center gap-3">
                  <button 
                    onClick={() => handleQualityChange('low')}
                    className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                      gifQuality === 'low' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Low
                  </button>
                  <button 
                    onClick={() => handleQualityChange('medium')}
                    className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                      gifQuality === 'medium' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Medium
                  </button>
                  <button 
                    onClick={() => handleQualityChange('high')}
                    className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                      gifQuality === 'high' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    High
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Main action buttons */}
          <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
            {/* Full Screen button */}
            <button
              onClick={toggleFullScreen}
              className="w-full bg-white border border-gray-300 text-gray-800 font-medium py-3 px-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              Full Screen Mode
            </button>
            
            {/* Upload or Download button */}
            {customImage ? (
              <button
                onClick={handleDownloadGIF}
                className="w-full bg-indigo-600 text-white font-medium py-3 px-8 rounded-lg shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Download GIF
              </button>
            ) : (
              <button
                onClick={() => setShowUploadModal(true)}
                className="w-full bg-white border border-gray-300 text-gray-800 font-medium py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Upload Your Logo
              </button>
            )}
          </div>
          
          {/* Context paragraph - only for custom image */}
          {customImage && (
            <p className="text-gray-600 mt-6 text-center max-w-md mx-auto">
              Your logo is bouncing! When you're ready, download it as a GIF to use anywhere.
            </p>
          )}
        </div>
      )}

      {/* Format selection modal with improved styles */}
      {showFormatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-md mx-auto transform transition-all duration-300">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Select Format</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <button 
                onClick={() => handleFormatSelect('9:16')}
                className="bg-gray-50 hover:bg-gray-100 py-12 rounded-lg flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md"
              >
                <div className="w-12 h-24 bg-indigo-200 rounded-lg mb-2"></div>
                <span className="font-medium text-gray-700">9:16</span>
                <span className="text-xs text-gray-500 mt-1">Mobile</span>
              </button>
              <button 
                onClick={() => handleFormatSelect('1:1')}
                className="bg-gray-50 hover:bg-gray-100 py-12 rounded-lg flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md"
              >
                <div className="w-16 h-16 bg-indigo-200 rounded-lg mb-2"></div>
                <span className="font-medium text-gray-700">1:1</span>
                <span className="text-xs text-gray-500 mt-1">Square</span>
              </button>
              <button 
                onClick={() => handleFormatSelect('16:9')}
                className="bg-gray-50 hover:bg-gray-100 py-12 rounded-lg flex flex-col items-center justify-center transition-all duration-200 hover:shadow-md"
              >
                <div className="w-24 h-12 bg-indigo-200 rounded-lg mb-2"></div>
                <span className="font-medium text-gray-700">16:9</span>
                <span className="text-xs text-gray-500 mt-1">Widescreen</span>
              </button>
            </div>
            <button 
              onClick={() => setShowFormatModal(false)}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Upload modal with improved styles */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-md mx-auto transform transition-all duration-300">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Upload Your Logo</h2>
            <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <input 
                id="file-upload"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
              />
              <label 
                htmlFor="file-upload" 
                className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200 cursor-pointer mb-4"
              >
                Choose Image
              </label>
              <p className="text-gray-500 mt-3">
                Recommended: Square image, 800×800 pixels
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(false)}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Download modal with improved styles */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 max-w-md mx-auto transform transition-all duration-300">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">Creating Your GIF</h2>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2 text-center">
                {encodingProgress < 50 
                  ? "Capturing animation frames..." 
                  : encodingProgress < 90
                    ? "Processing frames..."
                    : encodingProgress < 100
                      ? "Encoding your GIF..."
                      : "Download complete!"}
              </p>
              <p className="text-indigo-600 font-medium text-center text-lg mb-4">
                {encodingProgress < 100 
                  ? `${encodingProgress}% complete`
                  : 'Your GIF has been downloaded!'}
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-6 overflow-hidden">
              <div 
                className="bg-indigo-600 h-4 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${encodingProgress}%` }}
              ></div>
            </div>
            
            {/* Loading spinner */}
            {encodingProgress < 100 && (
              <div className="flex justify-center mb-6">
                <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              </div>
            )}
            
            {/* Pro tip message */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-bold">Pro tip:</span> Drag the .gif file into presentations, chat apps, or your website to add engaging animation.
              </p>
            </div>
            
            {/* Cancel/Done button */}
            <button
              onClick={() => {
                if (encodingProgress < 100) {
                  // Cancel operation
                  if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                  }
                  gifGenerationRef.current.isGenerating = false;
                }
                setIsGenerating(false);
                setShowDownloadModal(false);
              }}
              className={`w-full py-2 px-4 rounded-lg transition-colors duration-200 ${
                encodingProgress < 100
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {encodingProgress < 100 ? 'Cancel' : 'Done'}
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for GIF generation */}
      <canvas
        ref={canvasRef}
        className="hidden"
        style={{ display: 'none' }}
      />
      
      {/* Footer - not shown in fullscreen mode */}
      {!isFullScreen && (
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Create endless DVD logo animations for presentations, websites, or just for fun.</p>
          <p className="mt-1">Made with 💙 for nostalgic screen savers.</p>
        </footer>
      )}
    </div>
  );
};

export default DVDContainer; 