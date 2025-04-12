'use client';

import React, { useState, useEffect, useRef } from 'react';
import DVDLogo from './DVDLogo';
import GIF from 'gif.js';

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

const DVDContainer: React.FC = () => {
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<AspectRatio>('16:9');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 450 });
  const animationFrameRef = useRef<number>();
  const [encodingProgress, setEncodingProgress] = useState(0);

  // Setup a ref for the logo element
  const setLogoRefCallback = (node: HTMLDivElement | null) => {
    logoRef.current = node;
  };

  useEffect(() => {
    const updateContainerDimensions = () => {
      if (containerRef.current) {
        const newDimensions = {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        };
        console.log("Updated container dimensions:", newDimensions);
        setContainerDimensions(newDimensions);
      }
    };

    updateContainerDimensions();
    window.addEventListener('resize', updateContainerDimensions);

    return () => {
      window.removeEventListener('resize', updateContainerDimensions);
    };
  }, [selectedFormat]);

  useEffect(() => {
    const dimensions = getContainerDimensions(selectedFormat);
    const newDimensions = {
      width: parseInt(dimensions.width),
      height: parseInt(dimensions.height)
    };
    console.log("Setting dimensions from format:", selectedFormat, newDimensions);
    setContainerDimensions(newDimensions);
  }, [selectedFormat]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
        setShowUploadModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (customImage) {
      setLoadingStep(10);
    }
  }, [customImage]);

  const startRecording = async () => {
    if (!containerRef.current || !canvasRef.current) {
      console.error("Container or canvas ref is null");
      return;
    }

    console.log("Starting GIF recording process");
    
    // Set recording state
    setIsGenerating(true);
    setShowDownloadModal(true);
    setEncodingProgress(0);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.error("Could not get canvas context");
        setIsGenerating(false);
        setShowDownloadModal(false);
        return;
      }

      // Set canvas dimensions to match container
      canvas.width = containerDimensions.width;
      canvas.height = containerDimensions.height;
      console.log("Canvas dimensions set to:", canvas.width, "x", canvas.height);
      
      // Initialize gif.js with proper configuration
      console.log("Initializing GIF.js");
      
      // Create a new GIF instance with better settings
      const gif = new GIF({
        workers: 2,
        quality: 10,  // Higher quality (lower number = better quality)
        width: canvas.width,
        height: canvas.height,
        workerScript: '/gif.worker.js',
        repeat: 0,    // 0 = loop forever
        background: '#ffffff',
        dither: false
      });

      // Setup progress handler immediately
      gif.on('progress', (progress: number) => {
        console.log(`GIF encoding progress: ${Math.floor(progress * 100)}%`);
        setEncodingProgress(Math.floor(progress * 100));
      });
      
      // Handle completion
      gif.on('finished', (blob: Blob) => {
        console.log(`GIF generation completed, size: ${blob.size} bytes`);
        setEncodingProgress(100);
        
        try {
          // Create a download link
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bouncing-logo-${selectedFormat}-${Date.now()}.gif`;
          document.body.appendChild(a);
          a.click();
          
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsGenerating(false);
            setShowDownloadModal(false);
          }, 1000);
        } catch (error) {
          console.error('Download error:', error);
          setIsGenerating(false);
          setShowDownloadModal(false);
        }
      });

      // Modified frame capture approach - direct rendering
      // Instead of trying to detect position changes, we'll render frames directly
      
      // Pre-load the custom image if any
      let logoImg: HTMLImageElement | null = null;
      if (customImage) {
        logoImg = new Image();
        logoImg.src = customImage;
        // Wait for the image to load before proceeding
        await new Promise<void>((resolve, reject) => {
          logoImg!.onload = () => resolve();
          logoImg!.onerror = reject;
        }).catch(err => {
          console.error("Failed to load custom image:", err);
          setIsGenerating(false);
          setShowDownloadModal(false);
          return;
        });
      }
      
      // Capture frames
      console.log("Starting frame capture");
      
      // Parameters for animation
      const framesCount = 30;  // Capture 30 frames for a ~3 second animation at 10fps
      const frameDelay = 100;  // 100ms between frames (10fps)
      const logoSize = 72;     // Logo size in pixels
      
      // Get the initial position and direction for animation
      let positions: Array<{x: number, y: number}> = [];
      let directions = { x: 1, y: 1 };
      
      // Simple animation function to calculate positions
      const calculatePositions = () => {
        let x = Math.random() * (canvas.width - logoSize);
        let y = Math.random() * (canvas.height - logoSize);
        
        // Calculate all positions upfront
        for (let i = 0; i < framesCount; i++) {
          // Update position based on direction
          x += directions.x * 3;  // Speed = 3px per frame
          y += directions.y * 3;
          
          // Check for collisions with walls
          if (x <= 0 || x >= canvas.width - logoSize) {
            directions.x *= -1;
            x = Math.max(0, Math.min(x, canvas.width - logoSize));
          }
          
          if (y <= 0 || y >= canvas.height - logoSize) {
            directions.y *= -1;
            y = Math.max(0, Math.min(y, canvas.height - logoSize));
          }
          
          // Store position
          positions.push({ x, y });
        }
      };
      
      // Pre-calculate all positions
      calculatePositions();
      
      // Draw frames one by one
      for (let i = 0; i < framesCount; i++) {
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Get pre-calculated position
        const pos = positions[i];
        
        // Draw logo
        if (customImage && logoImg) {
          // Draw uploaded logo image
          ctx.drawImage(logoImg, pos.x, pos.y, logoSize, logoSize);
        } else {
          // Draw default logo (circle with gradient)
          ctx.beginPath();
          ctx.arc(pos.x + (logoSize/2), pos.y + (logoSize/2), logoSize/2, 0, Math.PI * 2);
          
          // Create gradient - alternate colors
          let gradientColors;
          if (i % 3 === 0) {
            gradientColors = ['#4ade80', '#3b82f6']; // green to blue
          } else if (i % 3 === 1) {
            gradientColors = ['#ec4899', '#eab308']; // pink to yellow
          } else {
            gradientColors = ['#c084fc', '#ec4899']; // purple to pink
          }
          
          const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + logoSize, pos.y + logoSize);
          gradient.addColorStop(0, gradientColors[0]);
          gradient.addColorStop(1, gradientColors[1]);
          
          ctx.fillStyle = gradient;
          ctx.fill();
        }
        
        // Update progress for frame capturing phase
        setEncodingProgress(Math.floor((i / framesCount) * 50));
        
        // Add the frame to the GIF
        gif.addFrame(canvas, { delay: frameDelay, copy: true });
        
        // Small delay between frame generation to prevent UI freezing
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Start rendering the GIF
      console.log("All frames captured, rendering GIF now");
      setEncodingProgress(50); // Frame capture complete, now rendering
      
      // Render the GIF (this triggers the 'progress' and 'finished' events)
      gif.render();
      
    } catch (error) {
      console.error("Error during GIF generation:", error);
      setIsGenerating(false);
      setShowDownloadModal(false);
    }
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleDownloadVideo = () => {
    setShowDownloadModal(true);
    startRecording();
  };

  const dimensions = getContainerDimensions(selectedFormat);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 min-h-screen bg-gray-100">
      <div style={{ position: 'relative' }}>
        <div 
          ref={containerRef}
          className="relative overflow-hidden bg-white rounded-md shadow-xl border border-gray-200 mb-6"
          style={{ 
            width: getContainerDimensions(selectedFormat).width, 
            height: getContainerDimensions(selectedFormat).height 
          }}
        >
          {/* Default bouncing logo or uploaded custom image */}
          <DVDLogo 
            customImage={customImage} 
            containerWidth={containerDimensions.width} 
            containerHeight={containerDimensions.height}
            ref={setLogoRefCallback}
          />
          
          {isGenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
              <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-lg font-medium">Generating...</span>
            </div>
          )}
        </div>
      </div>
      
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
        
        {/* Conditional button: Upload Your Logo or Download GIF */}
        {customImage ? (
          <>
            <p className="text-gray-600 mb-3">
              Watch your logo bounce! When you're ready, download it as a GIF.
            </p>
            <button
              onClick={handleDownloadVideo}
              className="border-2 border-black rounded-none py-2 px-8 bg-green-500 hover:bg-green-600 text-white font-medium mt-2"
              style={{ marginTop: '10px' }}
            >
              Download GIF
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowUploadModal(true)}
            className="border-2 border-black rounded-none py-2 px-8 bg-gray-100 hover:bg-gray-200 mt-4"
            style={{ marginTop: '10px' }}
          >
            Upload Your Logo
          </button>
        )}
      </div>

      {/* Format selection modal - now hidden by default */}
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
                : "Encoding your GIF - this might take a moment..."}
            </p>
            <p className="text-gray-800 font-medium mb-4 text-lg">
              {encodingProgress < 100 
                ? `Progress: ${encodingProgress}%`
                : 'Your GIF will download automatically when ready.'}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-8 overflow-hidden">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${encodingProgress}%` }}
              ></div>
            </div>
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            
            {/* Cancel button */}
            <button
              onClick={() => {
                if (animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current);
                }
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