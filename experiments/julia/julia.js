let julia;

let timeScale = 0.3;
let xOffset = 0.0;
let yOffset = 0.0;
let offsetAmount = 2.5;
let zoomX = 1.0;
let zoomY = 1.0;
let zoomAmount = 1.1;
let maxZoom = 10.0;
let state = false;

function setup() {
  canvas = createCanvas(window.innerWidth, window.innerHeight, WEBGL);
  canvas.id('navCanvas');
  noSmooth();
  pixelDensity(1)
  shader(julia);
  zoomY = (float(height)/float(width)) * zoomX;
  julia.setUniform("zoom", [zoomX, zoomY]);
  julia.setUniform("c", [-0.5, 0.5]);
  julia.setUniform("resolution", [width, height]);

  let stateButton = document.getElementById("stateButton");
  let stateChange = function () {
    state = !state;
    return false;
  };
  stateButton.ontouchstart = stateChange;
  stateButton.onmousedown = stateChange;
}

function preload() {
  julia = loadShader('julia.vert', 'julia.frag');
}

function draw() {
  if (mouseIsPressed && !state) {
    xOffset += (-1*float(mouseX - pmouseX) / float(width))*zoomX*offsetAmount;
    yOffset += (float(mouseY - pmouseY) / float(height))*zoomY*offsetAmount;
    julia.setUniform("offset", [xOffset, yOffset]);
  }
  if ((keyIsPressed && key == ' ') || (state && mouseIsPressed)) {
    julia.setUniform("c", [(float(mouseX)/width)*2.0-1.0, (float(mouseY)/height)*2.0-1.0]);
  }
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
}

function mouseWheel(event) {
  let e = event.delta;
  let oldZoomX = zoomX;
  if (e < 0) {
    zoomX *= 1.0/zoomAmount;
  } else {
    zoomX *= zoomAmount;
    if (zoomX > maxZoom) {
      zoomX = oldZoomX;
      return;
    }
  }
  zoomY = (float(height)/float(width)) * zoomX;
  julia.setUniform("zoom", [zoomX, zoomY]);

  xOffset += zoomX*Math.sign(-e)*float(mouseX - width/2.0)/(float(4.0*width));
  yOffset += zoomY*Math.sign(e)*float(mouseY - height/2.0)/(float(4.0*height));
  julia.setUniform("offset", [xOffset, yOffset]);
}

let initialDist = 0;
function touchStarted() {
  if (touches.length > 1) {
    initialDist = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
  }
  return false;
}

let touchZoom = 1;
function touchMoved() {
  if (touches.length > 1) {
    let newDist = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
    let diff = newDist - initialDist;
    touchZoom += diff * 0.1;
    let oldZoomX = zoomX;
    zoomX = pow(1.0/zoomAmount, touchZoom);
    if (zoomX > maxZoom) {
      zoomX = oldZoomX;
      return false;
    }
    zoomY = (float(height)/float(width)) * zoomX;
    julia.setUniform("zoom", [zoomX, zoomY]);
    initialDist = newDist;
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  julia.setUniform("resolution", [width, height]);
  zoomY = (float(height)/float(width)) * zoomX;
  julia.setUniform("zoom", [zoomX, zoomY]);
}