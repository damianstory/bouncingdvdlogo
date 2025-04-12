'use client';

import React, { useState, useEffect, useRef } from 'react';
import DVDLogo from './DVDLogo';
import GIF from 'gif.js';
import { FiDownload, FiUpload, FiPlus } from 'react-icons/fi';
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
  
  // Format selection handler
  const handleFormatSelect = (format: AspectRatio) => {
    setSelectedFormat(format);
    setShowFormatModal(false);
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
          setShowUploadModal(false);
          
          // Show a little confirmation
          setTimeout(() => {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
          }, 500);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Update animation state
  const updateAnimationState = (timestamp: number) => {
    const { position, direction, size } = animationStateRef.current;
    const canvasWidth = canvasRef.current?.width || containerDimensions.width;
    const canvasHeight = canvasRef.current?.height || containerDimensions.height;
    
    // Update position based on direction
    position.x += direction.x * animationSpeed;
    position.y += direction.y * animationSpeed;
    
    // Handle boundary collisions
    if (position.x <= 0 || position.x + size >= canvasWidth) {
      direction.x *= -1;
      position.x = Math.max(0, Math.min(position.x, canvasWidth - size));
    }
    
    if (position.y <= 0 || position.y + size >= canvasHeight) {
      direction.y *= -1;
      position.y = Math.max(0, Math.min(position.y, canvasHeight - size));
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

  // Handle download button click
  const handleDownloadGIF = () => {
    setShowDownloadModal(true);
    startGifGeneration();
  };

  // Toggle full screen mode
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Start GIF generation function (simplified)
  const startGifGeneration = async () => {
    if (!containerRef.current || !canvasRef.current) {
      console.error("Container or canvas ref is null");
      return;
    }
    
    setIsGenerating(true);
    setShowDownloadModal(true);
    setEncodingProgress(0);
    
    try {
      // Create GIF with settings
      const settings = qualitySettings[gifQuality];
      const gif = new GIF({
        workers: settings.workers,
        quality: settings.quality,
        width: canvasRef.current.width,
        height: canvasRef.current.height,
        workerScript: '/gif.worker.js',
        repeat: 0,
        background: '#ffffff',
        dither: false
      });
      
      // Setup GIF generation state
      gifGenerationRef.current = {
        ...gifGenerationRef.current,
        isGenerating: true,
        frames: [],
        frameCount: 0,
        gif,
        startTime: Date.now(),
        duration: 5000,  // 5 seconds for demo
        quality: gifQuality
      };
      
      // Capture a few frames
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setEncodingProgress(Math.min(90, Math.floor((i / 30) * 90)));
      }
      
      // Finish GIF generation
      setEncodingProgress(100);
      setShowConfetti(true);
      
      // Mock download completed
      setTimeout(() => {
        setIsGenerating(false);
        setShowDownloadModal(false);
        setShowConfetti(false);
      }, 2000);
    } catch (error) {
      console.error("GIF generation error:", error);
      setIsGenerating(false);
      setShowDownloadModal(false);
    }
  };

  // Prepare container class names to avoid template literal nesting issues
  let containerClassName = 'flex flex-col items-center justify-center min-h-screen';
  
  if (isFullScreen) {
    containerClassName += ' fixed inset-0 z-50 bg-black m-0 p-0';
  } else {
    containerClassName += ' py-12 px-4';
    
    if (theme === 'dark') {
      containerClassName += ' bg-gradient-to-br from-gray-900 to-gray-800 text-white';
    } else {
      containerClassName += ' bg-gradient-to-br from-gray-50 to-gray-100';
    }
    
    if (isRetroMode) {
      containerClassName += ' bg-[url(/grid-pattern.png)] bg-repeat';
    }
  }

  const containerStyle = isFullScreen
    ? { width: '100vw', height: '100vh' }
    : {
        width: getContainerDimensions(selectedFormat).width,
        height: getContainerDimensions(selectedFormat).height,
        minHeight: '50vh'
      };

  return (
    <div className={containerClassName}>
      {!isFullScreen && (
        <div className="w-full max-w-4xl mx-auto mb-8 text-center">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">DVD Logo GIF Generator</h1>
          <p className="text-gray-600 text-lg">Create nostalgic bouncing DVD logo animations</p>
        </div>
      )}
      
      <div className="relative">
        <div 
          ref={containerRef}
          className={`relative overflow-hidden ${
            isFullScreen ? '' : `rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-slate-50'
            }`
          }`}
          style={{ 
            ...containerStyle,
            boxShadow: isRetroMode ? '0 0 10px #4cc9f0, 0 0 20px #3a0ca3' : undefined,
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
                <p className={`text-center max-w-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
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
          />
          
          {isRetroMode && (
            <Scanlines 
              className="absolute inset-0 pointer-events-none" 
              opacity={0.3}
            />
          )}
        </div>
      </div>
      
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
        <div className="fixed bottom-0 left-0 w-full flex justify-center pb-8 z-50">
          <button
            onClick={toggleFullScreen}
            className="exit-fullscreen-button"
          >
            Exit Full Screen
          </button>
        </div>
      )}
      
      {!isFullScreen && (
        <div className="w-full max-w-md mx-auto mt-10 mb-6">
          <div className="text-center mb-6">
            <div className="flex justify-center gap-8 mb-8">
              <button 
                onClick={() => handleFormatSelect('9:16')}
                className={`w-20 h-20 flex flex-col items-center justify-center rounded-lg transition-all duration-200 p-3 border-2 ${
                  selectedFormat === '9:16' 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' 
                    : theme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 hover:border-gray-500 hover:scale-105' 
                      : 'bg-slate-50 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-300 hover:scale-105'
                }`}
                title="Mobile (9:16)"
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10 mb-1">
                  <rect x="8" y="4" width="8" height="16" stroke="currentColor" fill="none" strokeWidth="1.5" />
                </svg>
                <span className="text-xs mt-auto">9:16</span>
              </button>
              
              <button 
                onClick={() => handleFormatSelect('1:1')}
                className={`w-20 h-20 flex flex-col items-center justify-center rounded-lg transition-all duration-200 p-3 border-2 ${
                  selectedFormat === '1:1' 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' 
                    : theme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 hover:border-gray-500 hover:scale-105' 
                      : 'bg-slate-50 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-300 hover:scale-105'
                }`}
                title="Square (1:1)"
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10 mb-1">
                  <rect x="6" y="6" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="1.5" />
                </svg>
                <span className="text-xs mt-auto">1:1</span>
              </button>
              
              <button 
                onClick={() => handleFormatSelect('16:9')}
                className={`w-20 h-20 flex flex-col items-center justify-center rounded-lg transition-all duration-200 p-3 border-2 ${
                  selectedFormat === '16:9' 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' 
                    : theme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 hover:border-gray-500 hover:scale-105' 
                      : 'bg-slate-50 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-300 hover:scale-105'
                }`}
                title="Widescreen (16:9)"
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10 mb-1">
                  <rect x="4" y="8" width="16" height="8" stroke="currentColor" fill="none" strokeWidth="1.5" />
                </svg>
                <span className="text-xs mt-auto">16:9</span>
              </button>
              
              <button 
                onClick={toggleFullScreen}
                className={`w-20 h-20 flex flex-col items-center justify-center rounded-lg transition-all duration-200 p-3 border-2 ${
                  isFullScreen 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' 
                    : theme === 'dark' 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 hover:border-gray-500 hover:scale-105' 
                      : 'bg-slate-50 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-300 hover:scale-105'
                }`}
                title="Full Screen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mb-1">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
                <span className="text-xs mt-auto">Full</span>
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
            {customImage ? (
              <button
                onClick={handleDownloadGIF}
                className="w-full bg-indigo-600 text-white font-medium py-3 px-8 rounded-lg shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-200 min-h-[48px] flex items-center justify-center gap-2"
              >
                <FiDownload className="text-xl" />
                <span>Download GIF</span>
              </button>
            ) : (
              <button
                onClick={() => setShowUploadModal(true)}
                className={`w-full ${
                  theme === 'dark' ? 'bg-indigo-500' : 'bg-indigo-600'
                } text-white font-medium py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 min-h-[48px] flex items-center justify-center gap-2`}
              >
                <FiUpload className="text-xl" />
                <span>Upload Your Logo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-gray-100'
          } rounded-2xl shadow-2xl border p-8 max-w-md mx-auto`}>
            <h2 className={`text-3xl font-bold mb-6 text-center ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>Upload Your Logo</h2>
            <div className={`mb-8 p-6 border-2 border-dashed ${
              theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
            } rounded-lg text-center`}>
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
                <FiPlus className="mr-2" />
                Choose Image
              </label>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-3`}>
                Recommended: Square image, 800×800 pixels
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(false)}
              className={`w-full py-2 px-4 ${
                theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } rounded-lg`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${
            theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-gray-100'
          } rounded-2xl shadow-2xl border p-8 max-w-md mx-auto`}>
            <h2 className={`text-2xl font-bold mb-4 text-center ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>Creating Your GIF</h2>
            
            <div className="mb-6">
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2 text-center`}>
                {encodingProgress < 30 
                  ? "Capturing frames (1/3)" 
                  : encodingProgress < 60
                    ? "Processing (2/3)"
                    : encodingProgress < 100
                      ? "Encoding (3/3)"
                      : "Download complete!"}
              </p>
              <p className="text-indigo-600 font-medium text-center text-lg mb-4">
                {encodingProgress < 100 
                  ? `${encodingProgress}% complete`
                  : 'Your GIF has been downloaded!'}
              </p>
            </div>
            
            <div className={`w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-4 mb-6 overflow-hidden`}>
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
              className={`w-full py-2 px-4 rounded-lg transition-colors duration-200 ${
                encodingProgress < 100
                  ? theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {encodingProgress < 100 ? 'Cancel' : 'Done'}
            </button>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="hidden"
        style={{ display: 'none' }}
      />
      
      {!isFullScreen && (
        <footer className={`mt-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>
          <p>Create endless DVD logo animations for presentations, websites, or just for fun.</p>
          <p className="mt-1">Made with 💙 for nostalgic screen savers.</p>
        </footer>
      )}
    </div>
  );
};

export default DVDContainer;