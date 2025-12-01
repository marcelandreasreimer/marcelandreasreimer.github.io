const canvasSketch = require('canvas-sketch');
const random = require('canvas-sketch-util/random');
// NOTE: canvas-sketch automatically loads the necessary GUI library for us!

// --- 1. Define Live Parameters for the GUI ---
const params = {
    // General controls
    lines: 400, // Number of lines to draw
    backgroundLuminance: 10, // Dark grey background (HSL luminance)
    
    // Line behavior and color
    baseLineWidth: 0.5,
    maxLineWidth: 2.0,
    speedMultiplier: 1.0, // Global speed control
    redChance: 0.5, // Chance of a line being deep red (vs black)
    
    // Hue/Saturation for the "blood" color
    redHue: 0,
    redSaturation: 100,
    redLuminanceMin: 20,
    redLuminanceMax: 50,

    // A toggleable post-processing effect
    trailEffect: true,
};

// --- 2. Sketch Settings (Set to Full Screen/Resize Friendly) ---
const settings = {
    // By setting dimensions to a static size initially, and then using resizeCanvas: true,
    // canvas-sketch will handle the responsive sizing for you.
    dimensions: [1280, 720], 
    resizeCanvas: true, // Crucial for full-screen flexibility
    animate: true,
    
    // IMPORTANT: Tell canvas-sketch to use the GUI
    panning: false,
    scaleToView: true,
    
    // Set up the context (2D is fine)
    context: '2d',
};

// Function to randomly choose between deep red and black
const bloodOrBlack = () => {
    // Use the GUI parameters for color control
    const redL = random.range(params.redLuminanceMin, params.redLuminanceMax);
    const redShade = `hsl(${params.redHue}, ${params.redSaturation}%, ${redL}%)`;
    const blackShade = 'hsl(0, 0%, 0%)';
    
    return Math.random() < params.redChance ? redShade : blackShade;
};

// Function to draw a dynamic curved line
const drawCurvedLine = (context, x1, y1, x2, y2, cpX, cpY, lineWidth, strokeColor) => {
    context.beginPath();
    context.moveTo(x1, y1);
    context.quadraticCurveTo(cpX, cpY, x2, y2);
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeColor;
    context.stroke();
};

// --- 3. Main Sketch Function ---
const sketch = ({ width, height, context }) => {
    
    // Initialize the lines array *inside* sketch to respect initial dimensions
    // and make sure it only runs once (unless the sketch is manually reloaded)
    let lines = [];
    
    const initializeLines = () => {
        lines = Array.from({ length: params.lines }).map(() => ({
            x1: Math.random() * width,
            y1: Math.random() * height,
            x2: Math.random() * width,
            y2: Math.random() * height,
            controlX: Math.random() * width,
            controlY: Math.random() * height,
            lineWidth: random.range(params.baseLineWidth, params.maxLineWidth),
            
            // Initial movement vectors
            speedX1: random.range(-1, 1),
            speedY1: random.range(-1, 1),
            speedX2: random.range(-1, 1),
            speedY2: random.range(-1, 1),
            speedControlX: random.range(-1, 1),
            speedControlY: random.range(-1, 1),
            
            strokeColor: bloodOrBlack(),
        }));
    };
    
    initializeLines();

    // A simple function to re-initialize lines when the user changes the line count in the GUI
    params.resetLines = initializeLines;


    return ({ context, width, height, time }) => {
        // --- 4. Drawing and Live Update ---
        
        // Background/Trail Effect
        // When trailEffect is ON, we use a semi-transparent fill to create trails.
        // When OFF, we use a solid fill for sharp movement.
        const fillAlpha = params.trailEffect ? 0.05 : 1.0;
        const fillL = params.backgroundLuminance;
        context.fillStyle = `hsla(0, 0%, ${fillL}%, ${fillAlpha})`;
        context.fillRect(0, 0, width, height);

        // If trailEffect is OFF, we need to clear the screen with a solid color *before* drawing
        if (!params.trailEffect) {
            context.fillStyle = `hsl(0, 0%, ${fillL}%)`;
            context.fillRect(0, 0, width, height);
        }

        // --- Line Loop ---
        lines.forEach(line => {
            // Global speed control
            const speed = params.speedMultiplier;
            
            // Update position of the start, end, and control points
            line.x1 += line.speedX1 * speed * (Math.sin(time * 0.5) * 0.5 + 1);
            line.y1 += line.speedY1 * speed * (Math.cos(time * 0.5) * 0.5 + 1);
            line.x2 += line.speedX2 * speed * (Math.sin(time * 0.7) * 0.5 + 1);
            line.y2 += line.speedY2 * speed * (Math.cos(time * 0.7) * 0.5 + 1);
            line.controlX += line.speedControlX * speed * Math.sin(time * 0.6);
            line.controlY += line.speedControlY * speed * Math.cos(time * 0.6);

            // Keep lines within the canvas bounds, reverse direction
            if (line.x1 < 0 || line.x1 > width) line.speedX1 *= -Math.random();
            if (line.y1 < 0 || line.y1 > height) line.speedY1 *= -Math.random();
            if (line.x2 < 0 || line.x2 > width) line.speedX2 *= -Math.random();
            if (line.y2 < 0 || line.y2 > height) line.speedY2 *= -Math.random();
            if (line.controlX < 0 || line.controlX > width) line.speedControlX *= -1;
            if (line.controlY < 0 || line.controlY > height) line.speedControlY *= -1;

            // Draw the line
            drawCurvedLine(
                context, 
                line.x1, 
                line.y1, 
                line.x2, 
                line.y2, 
                line.controlX, 
                line.controlY, 
                Math.abs(line.lineWidth), 
                line.strokeColor
            );
        });
    };
};

// --- 5. Start the Sketch and Add the GUI ---
canvasSketch(sketch, settings)
    .then(manager => {
        // --- A. Build the dat.GUI Controls ---
        const gui = manager.ui.createContainer('Settings');

        // General Folder
        const generalFolder = gui.addFolder('General');
        generalFolder.add(params, 'lines', 10, 2000).step(10).onChange(params.resetLines).name('Line Count');
        generalFolder.add(params, 'backgroundLuminance', 0, 100).step(1).name('Background L (%)');
        generalFolder.add(params, 'speedMultiplier', 0, 5).step(0.1).name('Global Speed');
        generalFolder.add(params, 'trailEffect').name('Trail Effect (Post)');
        generalFolder.open();
        
        // Line Style Folder
        const styleFolder = gui.addFolder('Line Style');
        styleFolder.add(params, 'baseLineWidth', 0.1, 5).step(0.1).name('Min Line Width');
        styleFolder.add(params, 'maxLineWidth', 1, 10).step(0.5).name('Max Line Width');
        styleFolder.add(params, 'redChance', 0, 1).step(0.01).name('Red Line Chance');
        styleFolder.open();

        // Color Tweak Folder (for VJ performance)
        const colorFolder = gui.addFolder('Blood Color Tweak');
        colorFolder.add(params, 'redHue', 0, 360).step(1).name('Hue (0=Red)');
        colorFolder.add(params, 'redSaturation', 0, 100).step(1).name('Saturation (%)');
        colorFolder.add(params, 'redLuminanceMin', 0, 100).step(1).name('Luminance Min (%)');
        colorFolder.add(params, 'redLuminanceMax', 0, 100).step(1).name('Luminance Max (%)');
        colorFolder.open();

        // --- B. Add a Dedicated Full-Screen Button for Performance Mode ---
        // This is the VJ part! The 'F' key already toggles fullscreen in canvas-sketch,
        // but a button is more user-friendly.
        gui.add({ 
            toggle: () => {
                // The canvas-sketch manager handles the fullscreen request
                manager.toggleFullscreen(); 
            }
        }, 'toggle').name('>>> TOGGLE FULLSCREEN (F) <<<');


    })
    .catch(err => {
        console.error('An error occurred while running the sketch:', err);
    });

// If you are running this with the `canvas-sketch` command line tool, you can simply
// run `canvas-sketch sketch.js --open --hot` and it will automatically
// open a browser window with your sketch, the GUI, and hot-reloading.