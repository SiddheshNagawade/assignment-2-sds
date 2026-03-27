// Global variables for canvas setup
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');

// Initial resizing
canvas.width = window.innerWidth - 250;
canvas.height = window.innerHeight - 150;

// State management
let isDrawing = false;
let currentTool = "brush";
let startX = 0;
let startY = 0;
let snapshot = null;
let bgColor = "";
let brushStyle = "round";
let forceSquare = false;

// Function to save the drawing to local storage
function saveCanvasState() {
    const data = canvas.toDataURL();
    localStorage.setItem('canvasSave', data);
}

// Pixelated drawing logic
function drawPixel(x, y, isEraser) {
    const modifier = document.getElementById('pixelModifier').value;
    const brushWidth = document.getElementById('widthSlider').value;
    
    // Calculate grid size based on modifier
    let grid = Math.round((30 - 29 * modifier / 100) * (brushWidth / 8));
    if (grid < 1) grid = 1;

    const sx = Math.floor(x / grid) * grid;
    const sy = Math.floor(y / grid) * grid;

    if (isEraser) {
        ctx.clearRect(sx, sy, grid, grid);
    } else {
        ctx.fillStyle = document.getElementById('picker').value;
        ctx.fillRect(sx, sy, grid, grid);
    }
}

//Logic for drawingshapes
function drawShape(x2, y2) {
    ctx.beginPath();
    
    if (currentTool === "rect") {
        let width = x2 - startX;
        let height = y2 - startY;

        if (forceSquare) {
            const side = Math.min(Math.abs(width), Math.abs(height));
            width = width < 0 ? -side : side;
            height = height < 0 ? -side : side;
        }
        ctx.strokeRect(startX, startY, width, height);

    } else if (currentTool === "circle") {
        const radius = Math.sqrt(Math.pow(x2 - startX, 2) + Math.pow(y2 - startY, 2));
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        ctx.stroke();

    } else if (currentTool === "tri") {
        const midX = startX + (x2 - startX) / 2;
        ctx.moveTo(midX, startY);
        ctx.lineTo(startX, y2);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.stroke();
    }
}

//Mouse Event Listeners

canvas.addEventListener('mousedown', function(e) {
    isDrawing = true;
    startX = e.offsetX;
    startY = e.offsetY;
    forceSquare = e.shiftKey;
    
    // Grab the current canvas state before drawing the shape
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    ctx.lineWidth = document.getElementById('widthSlider').value;
    ctx.lineCap = brushStyle;
    ctx.strokeStyle = document.getElementById('picker').value;
    
    // Handle eraservsbrush
    if (currentTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
    } else {
        ctx.globalCompositeOperation = "source-over";
    }
    
    ctx.moveTo(startX, startY);
});

canvas.addEventListener('mousemove', function(e) {
    if (!isDrawing) return;

    const modValue = Number(document.getElementById('pixelModifier').value);

    if (currentTool === "brush") {
        if (modValue < 50) {
            drawPixel(e.offsetX, e.offsetY, false);
        } else {
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
        }
    } else if (currentTool === "eraser") {
        if (modValue < 50) {
            drawPixel(e.offsetX, e.offsetY, true);
        } else {
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
        }
    } else {
        // For shapes, we restore the snapshot so we don't "smear" the shape
        ctx.globalCompositeOperation = "source-over";
        ctx.putImageData(snapshot, 0, 0);
        drawShape(e.offsetX, e.offsetY);
    }
});

function stopDrawing() {
    isDrawing = false;
    forceSquare = false;
    ctx.globalCompositeOperation = "source-over";
    saveCanvasState();
}

canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

//Toolbar Button

document.getElementById('btn-brush').onclick = function() {
    currentTool = "brush";
    //Toggle brush style between round and square
    brushStyle = (brushStyle === "round") ? "square" : "round";
};

document.getElementById('btn-rect').onclick = function() { currentTool = "rect"; };
document.getElementById('btn-circle').onclick = function() { currentTool = "circle"; };
document.getElementById('btn-tri').onclick = function() { currentTool = "tri"; };
document.getElementById('btn-eraser').onclick = function() { currentTool = "eraser"; };

document.getElementById('clearAll').onclick = function() {
    if (confirm("Are you sure you want to wipe the drawing?")) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        localStorage.removeItem('canvasSave');
    }
};

document.getElementById('darkToggle').onclick = function() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? '1' : '0');
};

document.getElementById('pixelModifier').oninput = function(e) {
    document.getElementById('pixelValue').textContent = e.target.value;
};

document.getElementById('bgPicker').oninput = function(e) {
    bgColor = e.target.value;
    canvas.style.background = bgColor;
    localStorage.setItem('canvasBg', bgColor);
};

document.getElementById('clearBg').onclick = function() {
    bgColor = "";
    canvas.style.background = "transparent";
    localStorage.removeItem('canvasBg');
};

//Export Functionality

document.getElementById('saveImg').onclick = function() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;

    // Manual loop cropping)
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const index = (y * canvas.width + x) * 4;
            const alpha = imageData[index + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX === -1) {
        alert("The canvas is empty!");
        return;
    }

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = cropWidth;
    exportCanvas.height = cropHeight;
    const exportCtx = exportCanvas.getContext('2d');

    // Add bgcolor
    if (bgColor) {
        exportCtx.fillStyle = bgColor;
        exportCtx.fillRect(0, 0, cropWidth, cropHeight);
    }

    exportCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    const link = document.createElement('a');
    link.href = exportCanvas.toDataURL('image/png');
    link.download = 'my-drawing.png';
    link.click();
};

//Random Picture
function fetchAndCachePic(drawImmediately = false) {
    const randomId = Math.floor(Math.random() * 10000);
    const url = "https://picsum.photos/220?random=" + randomId;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;

    img.onload = function() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 220;
        tempCanvas.height = 220;
        tempCanvas.getContext('2d').drawImage(img, 0, 0);
        
        localStorage.setItem('cachedPic', tempCanvas.toDataURL());

        if (drawImmediately) {
            ctx.drawImage(img, (canvas.width - 220) / 2, (canvas.height - 220) / 2, 220, 220);
            saveCanvasState();
        }
    };
}

document.getElementById('addPic').onclick = function() {
    const cachedData = localStorage.getItem('cachedPic');
    
    if (cachedData) {
        const img = new Image();
        img.src = cachedData;
        img.onload = function() {
            ctx.drawImage(img, (canvas.width - 220) / 2, (canvas.height - 220) / 2, 220, 220);
            saveCanvasState();
        };
        // Get a new one ready for the next time they click
        fetchAndCachePic();
    } else {
        fetchAndCachePic(true);
    }
};

//Initial Load

window.onload = function() {
    // Dark mode check
    if (localStorage.getItem('darkMode') === '1') {
        document.body.classList.add('dark-mode');
    }

    // Background color check
    const savedBg = localStorage.getItem('canvasBg');
    if (savedBg) {
        bgColor = savedBg;
        canvas.style.background = savedBg;
        document.getElementById('bgPicker').value = savedBg;
    }

    // Restore the drawing
    const savedArt = localStorage.getItem('canvasSave');
    if (savedArt) {
        const img = new Image();
        img.src = savedArt;
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
        };
    }

    // Pre-cache a picture if none exists
    if (!localStorage.getItem('cachedPic')) {
        fetchAndCachePic();
    }
};