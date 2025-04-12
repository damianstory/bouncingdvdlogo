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
    color: { start: '#ff0000', end: '#00ff00' },
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
    'bg-red-500',
    'bg-red-400',
    'bg-yellow-400',
    'bg-yellow-300',
    'bg-yellow-200',
    'bg-green-200',
    'bg-green-300',
    'bg-green-400',
    'bg-green-500',
    'bg-green-600',
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
          color: { start: '#4ade80', end: '#3b82f6' }, // Initial green to blue gradient
          size: logoRect.width
        };
        
        // Store initial state for loop creation
        gifGenerationRef.current.initialPosition = { x: initialX, y: initialY };
        gifGenerationRef.current.initialDirection = { x: 1, y: 1 };
        gifGenerationRef.current.initialColor = { start: '#4ade80', end: '#3b82f6' };
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
    <div className={`flex flex-col items-center justify-center py-8 px-4 ${isFullScreen ? 'fixed inset-0 z-50 bg-black m-0 p-0' : 'min-h-screen bg-gray-100'}`}>
      <div style={{ position: 'relative' }}>
        <div 
          ref={containerRef}
          className={`relative overflow-hidden bg-white ${isFullScreen ? '' : 'rounded-md shadow-xl border border-gray-200 mb-6'}`}
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
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-black bg-opacity-70 text-white px-4 py-2 rounded hover:bg-opacity-90"
          style={{ position: 'fixed', bottom: '20px' }}
        >
          Minimize
        </button>
      )}
      
      {/* Only show controls when not in full screen mode */}
      {!isFullScreen && (
        <>
          {/* Format selection text and buttons */}
          <div className="text-center mb-4">
            <p className="text-xl font-medium mb-4">What format would you like this in?</p>
            <div className="flex justify-center mb-4" style={{ gap: "5px", marginBottom: '10px' }}>
              <button 
                onClick={() => handleFormatSelect('9:16')}
                className={`border-2 ${selectedFormat === '9:16' ? 'border-black bg-gray-200' : 'border-black'} rounded-none px-4 py-2`}
              >
                9:16
              </button>
              <button 
                onClick={() => handleFormatSelect('1:1')}
                className={`border-2 ${selectedFormat === '1:1' ? 'border-black bg-gray-200' : 'border-black'} rounded-none px-4 py-2`}
              >
                1:1
              </button>
              <button 
                onClick={() => handleFormatSelect('16:9')}
                className={`border-2 ${selectedFormat === '16:9' ? 'border-black bg-gray-200' : 'border-black'} rounded-none px-4 py-2`}
              >
                16:9
              </button>
            </div>
            
            {/* Buttons row with consistent vertical padding */}
            <div className="flex flex-col items-center justify-center mx-auto my-4" style={{ width: 'calc(3 * 80px + 10px)' }}>
              {/* Full Screen button - now first */}
              <button
                onClick={toggleFullScreen}
                className="border-2 border-black rounded-none py-2 px-8 bg-gray-100 hover:bg-gray-200 w-full mb-4"
              >
                Full Screen
              </button>
              
              {/* Conditional: Upload or Download button - now second */}
              {customImage ? (
                <button
                  onClick={handleDownloadGIF}
                  className="border-2 border-black rounded-none py-2 px-8 bg-green-500 hover:bg-green-600 text-white font-medium w-full"
                >
                  Download GIF
                </button>
              ) : (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="border-2 border-black rounded-none py-2 px-8 bg-gray-100 hover:bg-gray-200 w-full"
                >
                  Upload Your Logo
                </button>
              )}
            </div>
            
            {/* Context paragraph - only for custom image */}
            {customImage && (
              <p className="text-gray-600 mt-2">
                Watch your logo bounce! When you're ready, download it as a GIF.
              </p>
            )}
          </div>
        </>
      )}

      {/* Format selection modal */}
      {showFormatModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div 
            className="bg-white rounded-lg shadow-xl border border-gray-200 p-8"
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              zIndex: 1000,
              width: '450px',
              maxWidth: '90%',
              boxSizing: 'border-box'
            }}
          >
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Select Format</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <button 
                onClick={() => handleFormatSelect('9:16')}
                className="bg-gray-100 hover:bg-gray-200 py-12 rounded-lg flex flex-col items-center justify-center transition-colors"
              >
                <div className="w-12 h-24 bg-gray-300 rounded mb-2"></div>
                <span className="font-medium">9:16</span>
              </button>
              <button 
                onClick={() => handleFormatSelect('1:1')}
                className="bg-gray-100 hover:bg-gray-200 py-12 rounded-lg flex flex-col items-center justify-center transition-colors"
              >
                <div className="w-16 h-16 bg-gray-300 rounded mb-2"></div>
                <span className="font-medium">1:1</span>
              </button>
              <button 
                onClick={() => handleFormatSelect('16:9')}
                className="bg-gray-100 hover:bg-gray-200 py-12 rounded-lg flex flex-col items-center justify-center transition-colors"
              >
                <div className="w-24 h-12 bg-gray-300 rounded mb-2"></div>
                <span className="font-medium">16:9</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Upload modal */}
      {showUploadModal && (
        <div style={{ position: 'relative' }}>
          {/* Semi-transparent overlay */}
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              background: 'rgba(0,0,0,0.5)', 
              zIndex: 998 
            }}
          />
          
          {/* Modal container */}
          <div 
            className="border border-black"
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              zIndex: 999,
              width: '400px',
              maxWidth: '80%',
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              boxSizing: 'border-box'
            }}
          >
            <h2 className="mb-6 text-3xl font-bold text-center">Upload Your Logo</h2>
            <div className="flex flex-col items-center">
              <button 
                className="mb-4 border-2 border-black rounded-none px-12 py-2 bg-gray-100 hover:bg-gray-200 font-medium"
              >
                <label 
                  htmlFor="file-upload" 
                  className="cursor-pointer"
                >
                  Choose File
                </label>
              </button>
              <input 
                id="file-upload"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
              />
              <p className="text-lg text-center mb-8">Recommended file size: 800×800 pixels</p>
              <button
                onClick={() => setShowUploadModal(false)}
                className="border-2 border-black rounded-none px-8 py-1 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Download modal */}
      {showDownloadModal && (
        <div style={{ position: 'relative' }}>
          {/* Semi-transparent overlay */}
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              background: 'rgba(0,0,0,0.5)', 
              zIndex: 998 
            }}
          />
          
          {/* Modal container */}
          <div 
            className="text-center border border-gray-300"
            style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              zIndex: 999,
              width: '400px',
              maxWidth: '80%',
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              boxSizing: 'border-box'
            }}
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Creating Your GIF</h2>
            <p className="text-gray-600 mb-6">
              {encodingProgress < 50 
                ? "We're capturing frames of your bouncing logo..." 
                : encodingProgress < 90
                  ? "Processing animation frames..."
                  : encodingProgress < 100
                    ? "Encoding your GIF - almost done!"
                    : "Downloading your GIF..."}
            </p>
            <p className="text-gray-800 font-medium mb-4 text-lg">
              {encodingProgress < 100 
                ? `Progress: ${encodingProgress}%`
                : 'Your GIF will download automatically when ready.'}
            </p>
            {encodingProgress === 100 && (
              <p className="text-sm text-gray-600 mb-4">
                Your GIF will automatically loop when viewed in browsers and presentations.
              </p>
            )}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-8 overflow-hidden">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${encodingProgress}%` }}
              ></div>
            </div>
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            
            {/* Pro tip message */}
            <div className="mt-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 italic">
                <span className="font-bold">Pro tip:</span> Drag the .gif file into your Google Slide deck as the title slide to have up while you're waiting to get started.
              </p>
            </div>
            
            {/* Cancel button */}
            <button
              onClick={() => {
                if (animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current);
                }
                gifGenerationRef.current.isGenerating = false;
                setIsGenerating(false);
                setShowDownloadModal(false);
              }}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Cancel
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
    </div>
  );
};

export default DVDContainer; 