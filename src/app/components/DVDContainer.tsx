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
  const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 450 });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>();
  const framesRef = useRef<HTMLCanvasElement[]>([]);
  const [encodingProgress, setEncodingProgress] = useState(0);

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
    
    try {
      // Force the progress to complete after a timeout to avoid hanging
      const forceCompleteTimeout = setTimeout(() => {
        console.log("Force completing GIF generation after timeout");
        setEncodingProgress(100);
        
        // Create a static image fallback if GIF generation is taking too long
        try {
          if (canvasRef.current) {
            const staticImage = canvasRef.current.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = staticImage;
            a.download = `bouncing-logo-static-${Date.now()}.png`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
              document.body.removeChild(a);
              setIsGenerating(false);
              setShowDownloadModal(false);
            }, 1000);
          }
        } catch (e) {
          console.error("Failed to create fallback image:", e);
          setIsGenerating(false);
          setShowDownloadModal(false);
        }
      }, 15000); // 15 seconds timeout
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.error("Could not get canvas context");
        setIsGenerating(false);
        setShowDownloadModal(false);
        return;
      }

      // Reset progress
      setEncodingProgress(0);

      // Set canvas dimensions to match container
      canvas.width = containerDimensions.width;
      canvas.height = containerDimensions.height;
      console.log("Canvas dimensions set to:", canvas.width, "x", canvas.height);
      
      // Initialize gif.js with proper configuration
      console.log("Initializing GIF.js");
      const workerScriptPath = '/gif.worker.js';
      
      const gif = new GIF({
        workers: 1,           // Reduce to 1 worker to avoid threading issues
        quality: 20,          // Lower quality for better performance (higher number = lower quality)
        width: containerDimensions.width,
        height: containerDimensions.height,
        workerScript: workerScriptPath,
        repeat: 0,            // 0 = loop forever
        background: '#ffffff'
      });

      // Frame capture settings
      const targetFrameRate = 5; // Reduced to 5 FPS for better performance
      const recordingDuration = 2000; // 2 seconds to capture fewer frames
      const frames: HTMLCanvasElement[] = [];
      const frameDelay = 200; // 200ms between frames (5fps)
      
      console.log(`Recording with reduced settings: ${targetFrameRate} FPS, ${recordingDuration}ms duration`);

      // Progress update function
      let fakeProgress = 0;
      const progressInterval = setInterval(() => {
        fakeProgress += 10;
        if (fakeProgress > 85) {
          clearInterval(progressInterval);
        } else {
          setEncodingProgress(fakeProgress);
        }
      }, 500);

      // Capture frames at fixed intervals using setTimeout instead of requestAnimationFrame
      const captureFrames = async () => {
        console.log("Starting frame capture sequence");
        
        for (let i = 0; i < targetFrameRate * (recordingDuration / 1000); i++) {
          await new Promise<void>(resolve => {
            setTimeout(() => {
              if (!containerRef.current || !canvasRef.current || !ctx) {
                console.error("References lost during capture");
                resolve();
                return;
              }
              
              // Clear canvas
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              // Draw white background
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Find and draw the logo
              const logoElement = containerRef.current.querySelector('div[class*="w-[72px]"]') || 
                        containerRef.current.querySelector('div[style*="translate"]');
              
              const logo = logoElement as HTMLDivElement | null;
              
              if (logo) {
                console.log(`Capturing frame ${i+1}`);
                
                const transform = logo.style.transform;
                const matches = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                
                if (matches) {
                  const x = parseFloat(matches[1].replace('px', ''));
                  const y = parseFloat(matches[2].replace('px', ''));
                  
                  if (customImage) {
                    const img = new Image();
                    img.src = customImage;
                    
                    if (img.complete) {
                      ctx.drawImage(img, x, y, 72, 72);
                    } else {
                      // Use Promise-based approach without await
                      img.onload = () => {
                        ctx.drawImage(img, x, y, 72, 72);
                        
                        // Create a copy of the canvas for this frame
                        const frameCanvas = document.createElement('canvas');
                        frameCanvas.width = canvas.width;
                        frameCanvas.height = canvas.height;
                        const frameCtx = frameCanvas.getContext('2d');
                        if (frameCtx) {
                          frameCtx.drawImage(canvas, 0, 0);
                          frames.push(frameCanvas);
                          console.log(`Frame ${frames.length} captured (after image load)`);
                        }
                        
                        resolve();
                      };
                      
                      img.onerror = () => {
                        console.error("Failed to load custom image");
                        resolve();
                      };
                      
                      // Return early - the onload/onerror handlers will resolve the promise
                      return;
                    }
                  } else {
                    ctx.beginPath();
                    ctx.arc(x + 36, y + 36, 36, 0, Math.PI * 2);
                    
                    const gradient = ctx.createLinearGradient(x, y, x + 72, y + 72);
                    gradient.addColorStop(0, '#4ade80');
                    gradient.addColorStop(1, '#3b82f6');
                    
                    ctx.fillStyle = gradient;
                    ctx.fill();
                  }
                }
              }
              
              // Create a copy of the canvas for this frame
              const frameCanvas = document.createElement('canvas');
              frameCanvas.width = canvas.width;
              frameCanvas.height = canvas.height;
              const frameCtx = frameCanvas.getContext('2d');
              if (frameCtx) {
                frameCtx.drawImage(canvas, 0, 0);
                frames.push(frameCanvas);
                console.log(`Frame ${frames.length} captured`);
              }
              
              resolve();
            }, i * frameDelay);
          });
        }
        
        console.log(`Frame capture complete. Total frames: ${frames.length}`);
        return frames;
      };
      
      // Execute the frame capture and create GIF
      captureFrames().then(frames => {
        clearInterval(progressInterval);
        
        if (frames.length === 0) {
          console.error("No frames captured");
          clearTimeout(forceCompleteTimeout);
          setIsGenerating(false);
          setShowDownloadModal(false);
          return;
        }
        
        console.log(`Adding ${frames.length} frames to GIF...`);
        
        // Add frames in smaller batches with delay to prevent worker issues
        const addFramesInBatches = async () => {
          const batchSize = 5;
          
          for (let i = 0; i < frames.length; i += batchSize) {
            const batch = frames.slice(i, Math.min(i + batchSize, frames.length));
            
            for (const frame of batch) {
              gif.addFrame(frame, { delay: frameDelay, copy: true });
            }
            
            // Add a small delay between batches to prevent worker overload
            if (i + batchSize < frames.length) {
              await new Promise(r => setTimeout(r, 100));
            }
            
            setEncodingProgress(Math.min(85 + Math.floor((i / frames.length) * 10), 95));
          }
        };
        
        // Add the progress handler
        gif.on('progress', (progress: number) => {
          console.log(`Real GIF progress: ${progress}`);
          // Only update UI progress if it's higher than our fake progress
          const calculatedProgress = Math.floor(progress * 100);
          if (calculatedProgress > 85) {
            setEncodingProgress(calculatedProgress);
          }
        });
        
        // Handle completion
        gif.on('finished', (blob: Blob) => {
          console.log(`GIF generation completed, size: ${blob.size} bytes`);
          clearTimeout(forceCompleteTimeout);
          
          if (blob.size === 0) {
            console.error('Generated GIF blob is empty');
            setIsGenerating(false);
            setShowDownloadModal(false);
            return;
          }
          
          try {
            // Create a new blob with explicit type
            const gifBlob = new Blob([blob], { type: 'image/gif' });
            const url = URL.createObjectURL(gifBlob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `bouncing-logo-${selectedFormat}-${Date.now()}.gif`;
            a.style.display = 'none';
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
        
        // Add the frames and render
        addFramesInBatches().then(() => {
          try {
            console.log("All frames added, rendering GIF...");
            setEncodingProgress(95);
            gif.render();
          } catch (error) {
            console.error("Error rendering GIF:", error);
            clearTimeout(forceCompleteTimeout);
            setIsGenerating(false);
            setShowDownloadModal(false);
          }
        });
      }).catch(error => {
        console.error("Frame capture error:", error);
        clearTimeout(forceCompleteTimeout);
        setIsGenerating(false);
        setShowDownloadModal(false);
      });
      
    } catch (error) {
      console.error("Global GIF recording error:", error);
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