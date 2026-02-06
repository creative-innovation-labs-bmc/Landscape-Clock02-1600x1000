// --- 1. CONFIGURATION PARAMETERS ---
const NUM_LAYERS = 15;
const OFFSET_JITTER = 30;
const ROTATION_JITTER = 0.2;
const SCALE_JITTER = 0.05;
const JITTER_SPEED = 0.008;

// INCREASED SCALE: 0.85 fills the 1000px height much better than 0.65
const MAIN_NUMBER_SCALE = 0.85; 

const PARTICLES_PER_ZONE = 120;
const EDGE_TAPER = 0.7;

const GRID_RANDOMNESS = 15; 
const BASE_PARTICLE_SCALE = 1.2; 
const BEAT_SCALE_BOOST = 0.35;    
const BEAT_JOLT_STRENGTH = 12;   
const JOLT_DECAY = 0.1;         

const SEPARATION_RADIUS = 30; 
const SEPARATION_STRENGTH = 1.2;

// --- 2. GLOBAL CORE & STATE ---
let fontsLoaded = false;
let zoneParticles = [[], [], [], []]; 
let shuffledIndices = []; 
let mainFont, footerFont, sidebarFont; 
let city = "", country = ""; 
let locationFetched = false;
let particleImg; 
let initialPositionsSet = false;

let lastSecond;
let joltValue = 0; 
let currentDigits = ["", "", "", ""];
let prevDigits = ["", "", "", ""];
let transitionAlphas = [0, 0, 0, 0]; 

const FADE_SPEED = 1.8; 
const FLASH_COLOR = "#577740";

const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function preload() {
  mainFont = loadFont('MP-B.ttf', () => { fontsLoaded = true; }, () => { fontsLoaded = true; });  
  footerFont = loadFont('MS-Bk.otf');
  sidebarFont = loadFont('MP-M.ttf'); 
  particleImg = loadImage('sprite_32.png'); 
}

function setup() {
  // Hard-coded target resolution
  createCanvas(1600, 1000);
  imageMode(CENTER);
  rectMode(CENTER);
  fetchLocation();

  for (let i = 0; i < PARTICLES_PER_ZONE; i++) {
    shuffledIndices.push(i);
  }
  shuffledIndices = shuffle(shuffledIndices);

  let zoneWidth = width / 4; 
  for (let z = 0; z < 4; z++) {
    for (let i = 0; i < PARTICLES_PER_ZONE; i++) {
      let p = new Particle(z * zoneWidth, (z + 1) * zoneWidth, z);
      zoneParticles[z].push(p);
    }
  }

  let h = nf(hour(), 2);
  let m = nf(minute(), 2);
  lastSecond = second();
  currentDigits = [h[0], h[1], m[0], m[1]];
  prevDigits = [...currentDigits];
}

function draw() {
  background('#1C1B1C'); 
  if (!fontsLoaded) return;

  let s_now = second();
  if (s_now !== lastSecond) {
    joltValue = 1.0; 
    lastSecond = s_now;
  }
  joltValue = max(0, joltValue - JOLT_DECAY);
  let pulse = pow(joltValue, 3); 

  let h = nf(hour(), 2);
  let m = nf(minute(), 2);
  let s = nf(s_now, 2);
  let nextDigits = [h[0], h[1], m[0], m[1]];

  let dateText = day() + " " + months[month() - 1] + " " + year() + " — " + days[new Date().getDay()];
  let locationText = (locationFetched ? city + ", " + country : "LOCATING...");

  let zoneW = width / 4;
  for (let z = 0; z < 4; z++) {
    let xOffset = (z * zoneW) + (zoneW / 2);
    // Adjusted vertical offset calculation
    let yOffset = height / 2 - (120 * MAIN_NUMBER_SCALE); 
    
    if (nextDigits[z] !== currentDigits[z]) {
      prevDigits[z] = currentDigits[z];
      currentDigits[z] = nextDigits[z];
      transitionAlphas[z] = 255; 
    }
    if (transitionAlphas[z] > 0) transitionAlphas[z] -= FADE_SPEED;

    if (transitionAlphas[z] > 0) {
      let outgoingEase = pow(transitionAlphas[z] / 255, 2) * 255;
      drawArchitecturalBlueprint(prevDigits[z], xOffset, yOffset, outgoingEase, true);
      let incomingEase = (1 - pow(1 - ((255 - transitionAlphas[z]) / 255), 2)) * 255;
      drawArchitecturalBlueprint(currentDigits[z], xOffset, yOffset, incomingEase, true);
    } else {
      drawArchitecturalBlueprint(currentDigits[z], xOffset, yOffset, 255, false);
    }

    let pts = textToPoints(currentDigits[z], xOffset, yOffset, 850 * MAIN_NUMBER_SCALE, 20); 

    if (!initialPositionsSet && pts.length > 0) {
      for (let i = 0; i < zoneParticles[z].length; i++) {
        let randomIdx = shuffledIndices[i % pts.length];
        let startPt = pts[randomIdx % pts.length];
        let startX = startPt.x + random(-GRID_RANDOMNESS, GRID_RANDOMNESS);
        let startY = startPt.y + random(-GRID_RANDOMNESS, GRID_RANDOMNESS);
        zoneParticles[z][i].pos.set(startX, startY);
      }
      if (z === 3) initialPositionsSet = true;
    }

    for (let i = 0; i < zoneParticles[z].length; i++) {
      let p = zoneParticles[z][i];
      if (pts.length > 0) { 
        let randomIdx = shuffledIndices[i % pts.length];
        let targetPt = pts[randomIdx % pts.length];
        let nX = map(noise(i * 0.5, frameCount * 0.002), 0, 1, -GRID_RANDOMNESS, GRID_RANDOMNESS);
        let nY = map(noise(i * 0.8, frameCount * 0.002), 0, 1, -GRID_RANDOMNESS, GRID_RANDOMNESS);
        p.setTarget(targetPt.x + nX, targetPt.y + nY); 
      }
      p.deflect(zoneParticles[z]); 
      p.update(pulse); 
      p.show(xOffset, yOffset, pulse); 
    }
  }

  drawLayout(h + ":" + m + ":" + s, dateText, locationText);
}

function drawArchitecturalBlueprint(txt, x, y, alphaVal, isGlitching) {
  push();
  translate(x, y);
  textAlign(CENTER, CENTER);
  textFont(mainFont);
  textSize(425 * MAIN_NUMBER_SCALE); 
  noFill();
  let lightGrey = color('#BBC6C3');
  let pureWhite = color('#FFFFFF');
  let flashTarget = color(FLASH_COLOR);
  let shakeMult = isGlitching ? map(alphaVal, 0, 255, 1.0, 2.2) : 1.0;
  let flashIntensity = isGlitching ? Math.sin(map(alphaVal, 0, 255, 0, PI)) : 0;
  for (let i = 0; i < NUM_LAYERS; i++) {
    push();
    let baseAlpha = map(i, 0, NUM_LAYERS, 25, 60);
    let layerAlpha = baseAlpha * (alphaVal / 255);
    let colorMix = noise(i, frameCount * JITTER_SPEED);
    let baseCol = lerpColor(lightGrey, pureWhite, colorMix);
    let finalCol = lerpColor(baseCol, flashTarget, flashIntensity * 0.5);
    finalCol.setAlpha(layerAlpha);
    stroke(finalCol); 
    strokeWeight(0.7);
    let offX = map(noise(i, frameCount * JITTER_SPEED), 0, 1, -OFFSET_JITTER * shakeMult, OFFSET_JITTER * shakeMult);
    let offY = map(noise(i + 50, frameCount * JITTER_SPEED), 0, 1, -OFFSET_JITTER * shakeMult, OFFSET_JITTER * shakeMult);
    let rot = map(noise(i + 100, frameCount * JITTER_SPEED), 0, 1, -ROTATION_JITTER * shakeMult, ROTATION_JITTER * shakeMult);
    let scl = map(noise(i + 150, frameCount * JITTER_SPEED), 0, 1, 2.0 - SCALE_JITTER, 2.0 + SCALE_JITTER);
    translate(offX, offY); rotate(rot); scale(scl);
    text(txt, 0, 0);
    pop();
  }
  pop();
}

function textToPoints(txt, x, y, size, step) {
  let pts = [];
  let t = createGraphics(1000, 1000);
  t.textFont(mainFont); t.textSize(size * 0.5); t.textAlign(CENTER, CENTER);
  t.fill(255); t.text(txt, 500, 500); t.loadPixels();
  for (let i = 0; i < t.width; i += step) {
    for (let j = 0; j < t.height; j += step) {
      if (t.pixels[(i + j * t.width) * 4] > 127) {
        pts.push({ x: x + (i - 500) * 2, y: y + (j - 500) * 2 });
      }
    }
  }
  t.remove(); return pts;
}

function fetchLocation() {
  if (locationFetched) return;
  loadJSON('https://ipapi.co/json/', (data) => {
    city = data.city ? data.city.toUpperCase().substring(0, 12) : "UNKNOWN";
    country = data.country_name ? data.country_name.toUpperCase().substring(0, 12) : "UNKNOWN";
    locationFetched = true;
  }, (err) => {
    setTimeout(fetchLocation, 10000);
  });
}

function drawLayout(time, dateDayText, cityCountryText) {
  let zoneW = width / 4;
  for (let i = 0; i < 4; i++) {
    let startX = i * zoneW;
    fill(255); noStroke(); textFont(footerFont); textAlign(LEFT, BOTTOM); textSize(50);
    text(time, startX + 40, height - 20);
    
    // Sidebar Top (City/Country)
    push();
    textFont(sidebarFont); fill('#BBB6C3'); noStroke();
    translate(startX + zoneW - 55, 40); rotate(-HALF_PI); textAlign(RIGHT, CENTER); textSize(16);
    text(cityCountryText, 0, 0);
    pop();
    
    // Sidebar Bottom (Full Date)
    push();
    textFont(sidebarFont); fill('#BBB6C3'); 
    translate(startX + zoneW - 55, height - 26);
    rotate(-HALF_PI); textAlign(LEFT, CENTER); textSize(16); 
    text(dateDayText, 0, 0);
    pop();
    
    if (i < 3) { 
      stroke(255, 255, 255, 40); strokeWeight(1); 
      line((i + 1) * zoneW, 0, (i + 1) * zoneW, height);
    }
  }
}

class Particle {
  constructor(minX, maxX, zoneIndex) {
    this.minX = minX; this.maxX = maxX; this.zoneIndex = zoneIndex;
    this.pos = createVector(random(this.minX, this.maxX), random(height));
    this.target = createVector(this.pos.x, this.pos.y);
    this.vel = createVector(); this.acc = createVector();
    this.baseSize = random(18, 30) * BASE_PARTICLE_SCALE; 
    this.rotation = random(TWO_PI);
    this.rotSpeed = random(-0.03, 0.03);
    let c1 = color('#89C925');
    let c2 = color('#577740');
    this.myColor = lerpColor(c1, c2, random(1));
  }
  setTarget(x, y) { this.target.set(x, y); }
  deflect(neighbors) {
    let steer = createVector(0, 0);
    let count = 0;
    for (let other of neighbors) {
      let d = p5.Vector.dist(this.pos, other.pos);
      if (d > 0 && d < SEPARATION_RADIUS) {
        let diff = p5.Vector.sub(this.pos, other.pos);
        diff.normalize().div(d);
        steer.add(diff);
        count++;
      }
    }
    if (count > 0) { steer.div(count).setMag(14).sub(this.vel).limit(SEPARATION_STRENGTH); }
    this.acc.add(steer);
  }
  update(pulse) {
    this.acc.add(this.arrive(this.target));
    if (pulse > 0.01) { this.acc.add(p5.Vector.random2D().mult(pulse * BEAT_JOLT_STRENGTH)); }
    this.vel.add(this.acc).limit(14);
    this.pos.add(this.vel);
    this.pos.x = constrain(this.pos.x, this.minX + 20, this.maxX - 20);
    this.acc.mult(0); this.vel.mult(0.85);
    this.rotation += this.rotSpeed;
  }
  show(cX, cY, pulse) {
    push();
    translate(this.pos.x, this.pos.y); rotate(this.rotation);
    let d = dist(this.pos.x, this.pos.y, cX, cY);
    let edgeScale = map(d, 0, 420, 1.0, EDGE_TAPER); 
    let finalSize = this.baseSize * constrain(edgeScale, EDGE_TAPER, 1.0);
    finalSize *= (1 + (pulse * BEAT_SCALE_BOOST)); 
    tint(this.myColor);
    image(particleImg, 0, 0, finalSize, finalSize);
    pop();
  }
  arrive(t) {
    let d = p5.Vector.sub(t, this.pos);
    let speed = d.mag() < 100 ? map(d.mag(), 0, 100, 0, 14) : 14;
    return p5.Vector.sub(d.setMag(speed), this.vel).limit(2.5);
  }
}