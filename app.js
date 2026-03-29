// Global variables for canvas setup
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const holder = document.getElementById('canvasHolder');

// Function to resize canvas - fix for "getting out of window"
function resizeCanvas() {
    // We adjust the canvas to fit the current window size
    canvas.width = holder.clientWidth - 20;
    canvas.height = holder.clientHeight - 20;
    console.log("Canvas resized to: ", canvas.width, canvas.height);
}

// Resizing on start and on window resize
window.onresize = resizeCanvas;

// State management now varing
let isDrawing = false;
let currentTool = "brush";
let startX = 0, startY = 0;
let snapshot = null;
let bgColor = "";
let brushStyle = "round";
let forceSquare = false;
let pendingImage = null; //To store image until clicking

// Function to save the drawing to local storage
function saveCanvasState() {
    const data = canvas.toDataURL();
    localStorage.setItem('canvasSave', data);
}

// Pixelated drawing logic
function drawPixel(x, y, isEraser) {
    const modifier = document.getElementById('pixelModifier').value;
    const brushWidth = document.getElementById('widthSlider').value;
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

function startDrawing(x, y, isShift) {
    if (pendingImage) {
        ctx.drawImage(pendingImage, x - 150, y - 150, 300, 300);
        pendingImage = null;
        saveCanvasState();
        return;
    }
    isDrawing = true;
    startX = x;
    startY = y;
    forceSquare = isShift;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.lineWidth = document.getElementById('widthSlider').value;
    ctx.lineCap = brushStyle;
    ctx.strokeStyle = document.getElementById('picker').value;
    ctx.globalCompositeOperation = (currentTool === "eraser") ? "destination-out" : "source-over";
    ctx.moveTo(startX, startY);
}

function moveDrawing(x, y, clientX, clientY) {
    const eraserCursor = document.getElementById('eraser-cursor');
    if (currentTool === "eraser") {
        const size = document.getElementById('widthSlider').value;
        eraserCursor.style.display = "block";
        eraserCursor.style.width = size + "px";
        eraserCursor.style.height = size + "px";
        eraserCursor.style.left = (clientX - size / 2) + "px";
        eraserCursor.style.top = (clientY - size / 2) + "px";
        canvas.style.cursor = "none";
    } else {
        eraserCursor.style.display = "none";
        canvas.style.cursor = "crosshair";
    }

    if (!isDrawing) return;
    const modValue = Number(document.getElementById('pixelModifier').value);
    if (currentTool === "brush" || currentTool === "eraser") {
        var isEraser = (currentTool === "eraser");
        if (modValue < 50) {
            drawPixel(x, y, isEraser);
        } else {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.putImageData(snapshot, 0, 0);
        drawShape(x, y);
    }
}

function stopDrawing() {
    isDrawing = false;
    ctx.globalCompositeOperation = "source-over";
    saveCanvasState();
    document.getElementById('eraser-cursor').style.display = "none";
}

//Event Listeners for Mouse
canvas.addEventListener('mousedown', (e) => startDrawing(e.offsetX, e.offsetY, e.shiftKey));
canvas.addEventListener('mousemove', (e) => moveDrawing(e.offsetX, e.offsetY, e.clientX, e.clientY));
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

//Event listeners for touch
canvas.addEventListener('touchstart', (e) => {
    const b = canvas.getBoundingClientRect();
    const t = e.touches[0];
    startDrawing(t.clientX - b.left, t.clientY - b.top, false);
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    const b = canvas.getBoundingClientRect();
    const t = e.touches[0];
    moveDrawing(t.clientX - b.left, t.clientY - b.top, t.clientX, t.clientY);
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    stopDrawing();
    e.preventDefault();
}, { passive: false });

//Toolbar Button
function setActiveButton(id) {
    var buttons = document.querySelectorAll('.tool-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    document.getElementById(id).classList.add('active');
}

document.getElementById('btn-brush').onclick = function () {
    currentTool = "brush";
    //Toggle brush style between round and square
    brushStyle = (brushStyle === "round") ? "square" : "round";
    setActiveButton('btn-brush');
};
document.getElementById('btn-eraser').onclick = function () { currentTool = "eraser"; setActiveButton('btn-eraser'); };
document.getElementById('btn-rect').onclick = function () { currentTool = "rect"; setActiveButton('btn-rect'); };
document.getElementById('btn-circle').onclick = function () { currentTool = "circle"; setActiveButton('btn-circle'); };
document.getElementById('btn-tri').onclick = function () { currentTool = "tri"; setActiveButton('btn-tri'); };

// Top Actions
document.getElementById('clearAll').onclick = function () {
    if (confirm("Clear drawings?")) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        localStorage.removeItem('canvasSave');
    }
};

document.getElementById('darkToggle').onclick = function () {
    document.body.classList.toggle('dark-mode');
};

document.getElementById('pixelModifier').oninput = function (e) { document.getElementById('pixelValue').textContent = e.target.value; };

document.getElementById('bgPicker').oninput = function (e) {
    bgColor = e.target.value;
    canvas.style.background = bgColor;
};

document.getElementById('clearBg').onclick = function () {
    bgColor = "";
    canvas.style.background = "white";
};

//Export Functionality

document.getElementById('saveImg').onclick = function () {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'my-drawing.png';
    link.click();
};

//Random Picture
function addRandomPic() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = "https://picsum.photos/300?random=" + Math.random();
    img.onload = function () {
        //Instead of drawing now saving it for the next click
        pendingImage = img;
        console.log("Image ready! Click canvas to place.");
    };
}
document.getElementById('addPic').onclick = addRandomPic;

// Re-scaling and loading saved state on load
window.onload = function () {
    resizeCanvas();
    const savedArt = localStorage.getItem('canvasSave');
    if (savedArt) {
        const img = new Image();
        img.src = savedArt;
        img.onload = function () { ctx.drawImage(img, 0, 0); };
    }
};