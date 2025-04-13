document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dvdContainer = document.getElementById('dvd-container');
    const dvdLogo = document.getElementById('dvd-logo');
    const logoUpload = document.getElementById('logo-upload');
    const fileStatus = document.getElementById('file-status');
    const downloadBtn = document.getElementById('download-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const formatButtons = document.querySelectorAll('.format-options button');
    const controlsContainer = document.getElementById('controls-container');
    
    // Variables
    let logoImage = null;
    let position = { x: 0, y: 0 };
    let direction = { x: 1, y: 1 };
    let animationId;
    let selectedFormat = '16:9';
    const logoSize = 72;
    const speed = 2;
    
    // Set the initial aspect ratio
    dvdContainer.classList.add('ratio-16-9');
    
    // Set the initial controls container width to match dvd container
    function updateControlsWidth() {
        const containerWidth = dvdContainer.offsetWidth;
        controlsContainer.style.width = `${containerWidth}px`;
    }
    
    // Initial update with a slight delay to ensure DOM is ready
    setTimeout(updateControlsWidth, 100);
    
    // Update controls width on window resize
    window.addEventListener('resize', updateControlsWidth);
    
    // Colors for the logo
    const colors = [
        'linear-gradient(to right, #ec4899, #eab308)',
        'linear-gradient(to right, #4ade80, #3b82f6)',
        'linear-gradient(to right, #c084fc, #ec4899)',
        'linear-gradient(to right, #eab308, #ef4444)',
        'linear-gradient(to right, #3b82f6, #6366f1)'
    ];
    
    // Initialize position
    function initPosition() {
        position = {
            x: Math.random() * (dvdContainer.offsetWidth - logoSize),
            y: Math.random() * (dvdContainer.offsetHeight - logoSize)
        };
        updateLogoPosition();
    }
    
    // Update the logo position
    function updateLogoPosition() {
        dvdLogo.style.transform = `translate(${position.x}px, ${position.y}px)`;
    }
    
    // Change the logo color randomly
    function changeColor() {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        dvdLogo.style.background = randomColor;
    }
    
    // Animate the logo
    function animate() {
        // Update position
        position.x += direction.x * speed;
        position.y += direction.y * speed;
        
        // Check for horizontal collision
        if (position.x <= 0 || position.x >= dvdContainer.offsetWidth - logoSize) {
            direction.x *= -1;
            changeColor();
        }
        
        // Check for vertical collision
        if (position.y <= 0 || position.y >= dvdContainer.offsetHeight - logoSize) {
            direction.y *= -1;
            changeColor();
        }
        
        // Ensure logo stays within bounds
        position.x = Math.max(0, Math.min(position.x, dvdContainer.offsetWidth - logoSize));
        position.y = Math.max(0, Math.min(position.y, dvdContainer.offsetHeight - logoSize));
        
        // Update position
        updateLogoPosition();
        
        // Continue animation
        animationId = requestAnimationFrame(animate);
    }
    
    // Start the animation
    function startAnimation() {
        // Cancel any existing animation
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        // Initialize position and start animation
        initPosition();
        animate();
    }
    
    // Handle format selection
    formatButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active class
            formatButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update format
            selectedFormat = button.dataset.format;
            
            // Update container classes
            dvdContainer.className = '';
            dvdContainer.id = 'dvd-container';
            dvdContainer.classList.add(`ratio-${selectedFormat.replace(':', '-')}`);
            
            // Update controls width
            updateControlsWidth();
            
            // Restart animation
            startAnimation();
        });
    });
    
    // Handle logo upload
    logoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Update file status text
            fileStatus.textContent = file.name;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                logoImage = event.target.result;
                dvdLogo.style.backgroundImage = `url(${logoImage})`;
                downloadBtn.disabled = false;
                
                // Start animation if not already started
                startAnimation();
            };
            reader.readAsDataURL(file);
        } else {
            fileStatus.textContent = "No file chosen";
        }
    });
    
    // Handle download button click
    downloadBtn.addEventListener('click', () => {
        createGIF();
    });
    
    // Create and download GIF
    function createGIF() {
        // Show progress bar
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        
        // Setup canvas for capturing frames
        const canvas = document.createElement('canvas');
        canvas.width = dvdContainer.offsetWidth;
        canvas.height = dvdContainer.offsetHeight;
        const ctx = canvas.getContext('2d');
        
        // Initialize GIF.js
        const gif = new GIF({
            workers: 4,
            quality: 10,
            width: canvas.width,
            height: canvas.height,
            workerScript: 'https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js',
            repeat: 0,
            background: '#f3f4f6',
            dither: false
        });
        
        // Variables for recording
        const frames = [];
        const frameCount = 50; // Number of frames to capture
        let capturedFrames = 0;
        
        // Capture current state
        const originalPosition = { ...position };
        const originalDirection = { ...direction };
        
        // Function to capture a frame
        function captureFrame() {
            // Clear canvas
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw logo
            ctx.save();
            if (logoImage) {
                const img = new Image();
                img.src = logoImage;
                ctx.drawImage(img, position.x, position.y, logoSize, logoSize);
            } else {
                ctx.fillStyle = dvdLogo.style.background;
                ctx.beginPath();
                ctx.arc(position.x + logoSize/2, position.y + logoSize/2, logoSize/2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            
            // Add frame to GIF
            gif.addFrame(canvas, { copy: true, delay: 100 });
            
            capturedFrames++;
            progressBar.style.width = `${(capturedFrames / frameCount) * 50}%`; // First 50% for capturing
            
            // Move logo for next frame
            position.x += direction.x * speed;
            position.y += direction.y * speed;
            
            // Check for collisions
            if (position.x <= 0 || position.x >= dvdContainer.offsetWidth - logoSize) {
                direction.x *= -1;
            }
            
            if (position.y <= 0 || position.y >= dvdContainer.offsetHeight - logoSize) {
                direction.y *= -1;
            }
            
            // Ensure logo stays within bounds
            position.x = Math.max(0, Math.min(position.x, dvdContainer.offsetWidth - logoSize));
            position.y = Math.max(0, Math.min(position.y, dvdContainer.offsetHeight - logoSize));
            
            // Continue capturing frames
            if (capturedFrames < frameCount) {
                requestAnimationFrame(captureFrame);
            } else {
                // Start rendering GIF
                gif.on('progress', (p) => {
                    progressBar.style.width = `${50 + p * 50}%`; // Last 50% for rendering
                });
                
                gif.on('finished', (blob) => {
                    // Create download link
                    const url = URL.createObjectURL(new Blob([blob], { type: 'image/gif' }));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bouncing-logo-${selectedFormat.replace(':', '-')}.gif`;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    
                    // Clean up
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        progressContainer.style.display = 'none';
                    }, 1000);
                    
                    // Restore original position and direction
                    position = { ...originalPosition };
                    direction = { ...originalDirection };
                    updateLogoPosition();
                });
                
                gif.render();
            }
        }
        
        // Start capturing frames
        captureFrame();
    }
    
    // Start the animation on load
    startAnimation();
}); 