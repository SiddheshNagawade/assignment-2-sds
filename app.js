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

canvas.addEventListener('mousedown', function (e) {
    isDrawing = true;
    startX = e.offsetX;
    startY = e.offsetY;
    forceSquare = e.shiftKey;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.lineWidth = document.getElementById('widthSlider').value;
    ctx.lineCap = brushStyle;
    ctx.strokeStyle = document.getElementById('picker').value;
    ctx.globalCompositeOperation = (currentTool === "eraser") ? "destination-out" : "source-over";
    ctx.moveTo(startX, startY);
});

canvas.addEventListener('mousemove', function (e) {
    if (!isDrawing) return;
    const modValue = Number(document.getElementById('pixelModifier').value);
    if (currentTool === "brush" || currentTool === "eraser") {
        var isEraser = (currentTool === "eraser");
        if (modValue < 50) {
            drawPixel(e.offsetX, e.offsetY, isEraser);
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
    ctx.globalCompositeOperation = "source-over";
    saveCanvasState();
}
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

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
        ctx.drawImage(img, (canvas.width - 300) / 2, (canvas.height - 300) / 2, 300, 300);
        saveCanvasState();
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