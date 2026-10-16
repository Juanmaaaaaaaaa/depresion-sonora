// Depresión Sonora — pequeño recorrido
// p5.js · todo el arte se dibuja por código con línea negra temblorosa sobre fondo blanco.
// Perspectiva isométrica: el camino baja en diagonal hacia la derecha.
// Controles: → / D avanzar · A / ← volver · Espacio ladrar · E interactuar · R reiniciar.

// ---------- Mundo ----------
const IX = 0.9, IY = 0.45;            // proporciones isométricas 2:1
const PATH_START = -260, PATH_HW = 46; // inicio del camino y medio ancho
const START_S = 60;
const FRIEND_S = 720,  FRIEND_L = 84;
const HOUSE_S  = 1230, HOUSE_L  = -190;
const TREE_S   = 1750, TREE_L   = -105;
const PERSON_S = 2570, PERSON_L = -95;
const PC_S     = 2980, PC_L     = -10;
const PLAYER_MAX = PC_S - 260;
const PATH_END   = PC_S + 120;
const SPEED = 3.6;

let P, cam = [0, 0], logoWorld = [0, 0];
let hearts = [], qs = [];
let friend = { hop: 0, barkT: -999 };
let song = null, audioStarted = false, actx = null;
let curSeed = 0;
let promptBoxes = [], activePrompts = [], hasMoved = false;
let phrases = [];
let scribbles = [], drawingNow = false; // trazos que dibuja la persona sobre la frase final

// Frases que salen al interactuar y el punto (en el mundo) desde donde aparecen.
const PHRASES = {
  house:  { lines: ['¿Cómo será vivir', 'en el campo?'],
            anchor: () => iso(HOUSE_S - 20, HOUSE_L - 8, 185), label: 'E · MIRAR', reach: 170 },
  tree:   { lines: ['Si no estoy contigo,', 'prefiero estar muerto'],
            anchor: () => { const p = iso(TREE_S, TREE_L, 0); return [p[0], p[1] - 290]; }, label: 'E · OLER', reach: 150 },
  person: { lines: ['Ser un humano, una máquina', 'tonta es tan aburrido'],
            anchor: () => { const p = iso(PERSON_S + 22, PERSON_L + 34, 78); return [p[0] + 20, p[1] - 130]; }, label: 'E · ESCUCHAR', reach: 130 }
};
const PHRASE_SOURCES = { house: HOUSE_S, tree: TREE_S, person: PERSON_S };

// Letras del título dibujadas como trazos (se convierten en tubos con contorno).
const GLYPHS = {
  D: { w: 0.72, s: [[[0, 0], [0, 1], [0.42, 1], [0.72, 0.72], [0.72, 0.28], [0.42, 0], [0, 0]]] },
  E: { w: 0.66, s: [[[0.66, 0], [0, 0], [0, 1], [0.66, 1]], [[0, 0.5], [0.5, 0.5]]] },
  P: { w: 0.7,  s: [[[0, 1], [0, 0], [0.48, 0], [0.7, 0.2], [0.7, 0.36], [0.48, 0.56], [0, 0.56]]] },
  R: { w: 0.7,  s: [[[0, 1], [0, 0], [0.48, 0], [0.7, 0.2], [0.7, 0.36], [0.48, 0.56], [0, 0.56]], [[0.34, 0.56], [0.7, 1]]] },
  S: { w: 0.7,  s: [[[0.7, 0.16], [0.5, 0], [0.2, 0], [0, 0.18], [0.06, 0.38], [0.64, 0.62], [0.7, 0.82], [0.5, 1], [0.2, 1], [0, 0.84]]] },
  I: { w: 0.12, s: [[[0.06, 0], [0.06, 1]]] },
  O: { w: 0.72, s: [[[0.36, 0], [0.64, 0.18], [0.72, 0.5], [0.64, 0.82], [0.36, 1], [0.08, 0.82], [0, 0.5], [0.08, 0.18], [0.36, 0]]] },
  Ó: { w: 0.72, s: [[[0.36, 0], [0.64, 0.18], [0.72, 0.5], [0.64, 0.82], [0.36, 1], [0.08, 0.82], [0, 0.5], [0.08, 0.18], [0.36, 0]],
                     [[0.56, -0.34], [0.38, -0.14]]] },
  N: { w: 0.72, s: [[[0, 1], [0, 0], [0.72, 1], [0.72, 0]]] },
  A: { w: 0.74, s: [[[0, 1], [0.37, 0], [0.74, 1]], [[0.16, 0.64], [0.58, 0.64]]] }
};

function iso(s, l, h) { return [(s - l) * IX, (s + l) * IY - (h || 0)]; }
function camTarget(s) { const p = iso(s, 0, 0); return [p[0] - width * 0.32, p[1] - height * 0.5]; }

function setup() {
  const c = createCanvas(1000, 620);
  c.parent('canvas-holder');
  pixelDensity(1);
  noiseDetail(2, 0.5);
  strokeCap(ROUND); strokeJoin(ROUND);
  resetGame();
  // Música: coloca tu archivo en assets/cancion.mp3 (si no existe, el juego funciona en silencio).
  try {
    song = new Audio('assets/cancion.mp3');
    song.loop = true; song.preload = 'auto';
    song.addEventListener('error', () => { song = null; });
  } catch (e) { song = null; }
}

function resetGame() {
  P = { s: START_S, mv: 0, ph: 0, face: 1, barkT: -999, locked: false, used: false, usedAt: 0 };
  hearts = []; qs = []; phrases = []; friend = { hop: 0, barkT: -999 };
  hasMoved = false; audioStarted = false;
  scribbles = []; drawingNow = false; cursor(ARROW);
  cam = camTarget(P.s);
  const t = camTarget(START_S);
  logoWorld = [t[0] + width * 0.62, t[1] + height * 0.27];
  if (song) { try { song.pause(); song.currentTime = 0; } catch (e) {} }
}

// ---------- Utilidades de línea "a mano" ----------
function nz(x, y, off) {
  return noise(x * 0.04 + curSeed, y * 0.04 + off, floor(frameCount / 10) * 0.6) - 0.5;
}

function chaikin(pts, closed, it) {
  for (let k = 0; k < it; k++) {
    const out = [], n = pts.length, m = closed ? n : n - 1;
    if (!closed) out.push(pts[0]);
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) out.push(pts[n - 1]);
    pts = out;
  }
  return pts;
}

function densify(pts, closed, step) {
  const out = [], n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const k = max(1, ceil(dist(a[0], a[1], b[0], b[1]) / step));
    for (let j = 0; j < k; j++) out.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

// Dibuja una polilínea con temblor. fillCol: color de relleno (para tapar lo que queda detrás).
function ink(pts, closed, fillCol, smooth) {
  let p = (smooth === undefined ? 2 : smooth) > 0 ? chaikin(pts, closed, smooth === undefined ? 2 : smooth) : pts;
  p = densify(p, closed, 12);
  if (!closed || fillCol === null || fillCol === undefined) noFill(); else fill(fillCol);
  beginShape();
  for (const q of p) vertex(q[0] + nz(q[0], q[1], 0) * 5, q[1] + nz(q[0], q[1], 31.7) * 5);
  if (closed) endShape(CLOSE); else endShape();
}

// Tubo grueso (patas, cuello, brazos) alrededor de una polilínea central.
function tube(pts, w, smooth, fillCol) {
  const L = [], R = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[max(i - 1, 0)], b = pts[min(i + 1, n - 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    L.push([pts[i][0] + nx * w / 2, pts[i][1] + ny * w / 2]);
    R.push([pts[i][0] - nx * w / 2, pts[i][1] - ny * w / 2]);
  }
  ink(L.concat(R.reverse()), true, fillCol === undefined ? 255 : fillCol, smooth === undefined ? 1 : smooth);
}

function ellipsePts(cx, cy, rx, ry, n) {
  const a = []; n = n || 14;
  for (let i = 0; i < n; i++) { const t = TWO_PI * i / n; a.push([cx + cos(t) * rx, cy + sin(t) * ry]); }
  return a;
}

// ---------- Cajas isométricas ----------
function isoBox(cs, cl, ws, wl, h0, h1) {
  const s0 = cs - ws / 2, s1 = cs + ws / 2, l0 = cl - wl / 2, l1 = cl + wl / 2;
  ink([iso(s0, l1, h0), iso(s1, l1, h0), iso(s1, l1, h1), iso(s0, l1, h1)], true, 255, 0);
  ink([iso(s1, l1, h0), iso(s1, l0, h0), iso(s1, l0, h1), iso(s1, l1, h1)], true, 255, 0);
  ink([iso(s0, l0, h1), iso(s1, l0, h1), iso(s1, l1, h1), iso(s0, l1, h1)], true, 255, 0);
}

// ---------- Perrito ----------
function paw(x, y) {
  ink([[x - 6, y - 3], [x - 9, y + 4], [x - 8, y + 11], [x - 5, y + 9], [x - 3, y + 14], [x, y + 10],
       [x + 3, y + 14], [x + 5, y + 9], [x + 8, y + 11], [x + 9, y + 4], [x + 6, y - 3]], true, 255, 0);
}

function dogLeg(hx, hy, fx, bend, lift) {
  const ay = -14 - (lift || 0);
  const kx = (hx + fx) / 2 + bend, ky = (hy + ay) / 2 - 2;
  tube([[hx, hy], [kx, ky], [fx, ay]], 9, 1);
  paw(fx, ay);
}

// o: {x,y,k,face,ph,mv,seed,wag,tilt}
function drawDog(o) {
  push();
  translate(o.x, o.y);
  scale(o.k * o.face, o.k);
  curSeed = o.seed;
  stroke(0); strokeWeight(3.3);
  const mv = o.mv || 0, ph = o.ph || 0;
  const A = 13 * mv, lift = 10 * mv;
  const fx = (off) => A * sin(ph + off);
  const idle = sin(frameCount * 0.05 + o.seed) * 1.5;

  const lf = (off) => max(0, cos(ph + off)) * lift;
  // patas lejanas
  dogLeg(-26, -64, -22 + fx(PI), -9, lf(PI));
  dogLeg(26, -66, 30 + fx(0), 6, lf(0));
  // cola (varita larga)
  const wag = (o.wag || 0) * sin(frameCount * 0.35) * 8;
  tube([[-50, -84], [-66, -100], [-76 + wag, -122]], 7, 1);
  // cuello (detrás del cuerpo para que se funda con él)
  tube([[14, -80], [34, -100], [44, -114]], 17, 1);
  // cuerpo
  ink([[-52, -86], [-38, -98], [-10, -100], [18, -96], [34, -84], [32, -66], [8, -58], [-22, -56], [-48, -62]], true, 255, 2);
  // patas cercanas (con pequeño levantamiento)
  dogLeg(-36, -62, -34 + fx(0), -9, lf(0));
  dogLeg(18, -64, 20 + fx(PI), 6, lf(PI));
  // cabeza (con inclinación opcional)
  push();
  translate(36, -108); rotate((o.tilt || 0) + idle * 0.01); translate(-36, 108);
  ink([[34, -120], [48, -128], [60, -124], [70, -118], [98, -113], [104, -108], [98, -101],
       [70, -102], [60, -98], [46, -100], [36, -108]], true, 255, 2);
  // oreja larga y caída
  const e = sin(frameCount * 0.07 + o.seed) * 2;
  ink([[44, -126], [30, -134], [8, -130 + e], [-8, -116 + e], [2, -108 + e], [22, -114], [40, -112]], true, 255, 2);
  // ojo: dos rayitas
  strokeWeight(2.4);
  line(60, -115, 60.5, -111); line(65, -116, 65.5, -112);
  strokeWeight(3.3);
  // nariz grande rellena
  push(); translate(102, -108); rotate(0.25); fill(0); ellipse(0, 0, 13, 18); pop();
  pop();
  pop();
}

// ---------- Escenario ----------
function drawPath() {
  const sA = max(PATH_START, P.s - 560), sB = min(PATH_END, P.s + 900);
  curSeed = 3;
  stroke(0); strokeWeight(2.4);
  // cara lateral larga
  ink([iso(sA, PATH_HW, 0), iso(sB, PATH_HW, 0), iso(sB, PATH_HW, -16), iso(sA, PATH_HW, -16)], true, 255, 0);
  if (sB >= PATH_END) ink([iso(PATH_END, PATH_HW, 0), iso(PATH_END, -PATH_HW, 0), iso(PATH_END, -PATH_HW, -16), iso(PATH_END, PATH_HW, -16)], true, 255, 0);
  // baldosas
  const TL = 130;
  const first = PATH_START + floor((sA - PATH_START) / TL) * TL;
  for (let t = first; t < sB; t += TL) {
    const t1 = min(t + TL, PATH_END);
    curSeed = 3 + (t - PATH_START) / TL * 0.37;
    ink([iso(t, -PATH_HW, 0), iso(t1, -PATH_HW, 0), iso(t1, PATH_HW, 0), iso(t, PATH_HW, 0)], true, 255, 0);
  }
}

function drawPads() {
  stroke(0); strokeWeight(2.4);
  curSeed = 11; isoBox(FRIEND_S, FRIEND_L, 90, 68, -14, 0);
  curSeed = 12; isoBox(TREE_S, TREE_L, 90, 90, -14, 0);
}

function drawLogoWord(txt, cx, cy, h, tw, line) {
  const gap = 0.42 * h;
  let total = -gap;
  for (const ch of txt) total += GLYPHS[ch].w * h + gap;
  let x = cx - total / 2, i = 0;
  stroke(0); strokeWeight(3);
  for (const ch of txt) {
    const g = GLYPHS[ch], lw = g.w * h;
    const t = frameCount;
    push();
    translate(x + lw / 2, cy + sin(t * 0.05 + i * 0.7 + line * 1.6) * 5);
    rotate(sin(t * 0.04 + i * 1.3 + line) * 0.04);
    translate(-lw / 2, -h / 2);
    curSeed = 100 + i * 7 + line * 53;
    for (const st of g.s) tube(st.map(p => [p[0] * h, p[1] * h]), tw, 1, 255);
    pop();
    x += lw + gap; i++;
  }
}

function drawLogo() {
  push(); translate(logoWorld[0], logoWorld[1]);
  drawLogoWord('DEPRESIÓN', 0, -40, 52, 13, 0);
  drawLogoWord('SONORA', 26, 38, 52, 13, 1);
  pop();
}

function drawHouseGroup() {
  const [px, py] = iso(HOUSE_S, HOUSE_L, 0);
  stroke(0); strokeWeight(2.6);
  curSeed = 21;
  // plataforma flotante
  isoBox(HOUSE_S, HOUSE_L, 190, 160, 48, 70);
  // casa
  const cs = HOUSE_S - 20, cl = HOUSE_L - 8, ws = 70, wl = 64, h0 = 70, H = 120, R = 34;
  const s0 = cs - ws / 2, s1 = cs + ws / 2, l0 = cl - wl / 2, l1 = cl + wl / 2;
  isoBox(cs, cl, ws, wl, h0, H);
  ink([iso(s1, l1, H), iso(s1, l0, H), iso(s1, cl, H + R)], true, 255, 0);
  ink([iso(s0 - 8, l1 + 6, H), iso(s1 + 8, l1 + 6, H), iso(s1 + 8, cl, H + R), iso(s0 - 8, cl, H + R)], true, 255, 0);
  // puerta y ventana
  ink([iso(s1, cl - 6, h0), iso(s1, cl + 14, h0), iso(s1, cl + 14, h0 + 32), iso(s1, cl - 6, h0 + 32)], true, 255, 0);
  ink([iso(s0 + 14, l1, h0 + 20), iso(s0 + 36, l1, h0 + 20), iso(s0 + 36, l1, h0 + 40), iso(s0 + 14, l1, h0 + 40)], true, 255, 0);
  // gallo
  const rp = iso(HOUSE_S + 58, HOUSE_L + 62, 70);
  drawRooster(rp[0], rp[1], 1.15);
}

function drawRooster(x, y, k) {
  push(); translate(x, y); scale(-k, k); curSeed = 31;
  stroke(0); strokeWeight(2.6);
  // patas
  line(-3, -12, -4, -1); line(5, -12, 6, -1);
  line(-9, 0, -1, 0); line(1, 0, 10, 0);
  // cola (plumas)
  ink([[-14, -20], [-30, -40], [-36, -28], [-26, -22], [-34, -16], [-18, -12]], true, 255, 1);
  // cuerpo
  ink([[-14, -20], [-6, -32], [8, -32], [17, -24], [14, -12], [2, -8], [-10, -10]], true, 255, 2);
  ink([[-6, -22], [2, -26], [8, -20]], false, null, 1);
  // cabeza, cresta, pico
  ink(ellipsePts(15, -40, 6, 6.5, 10), true, 255, 1);
  ink([[11, -45], [12, -52], [15, -47], [17, -53], [19, -46]], false, null, 0);
  ink([[20, -40], [28, -38], [20, -36]], true, 255, 0);
  point(16, -41);
  pop();
}

function drawTree() {
  const [x, y] = iso(TREE_S, TREE_L, 0);
  push(); translate(x, y); curSeed = 41; stroke(0); strokeWeight(3);
  tube([[0, 0], [-4, -60], [4, -120]], 26, 1);
  ink([[-6, -80], [-38, -90]], false, null, 0);
  ink([[4, -98], [34, -118]], false, null, 0);
  const sway = sin(frameCount * 0.03) * 2;
  ink([[-8, -108], [-56, -104 + sway], [-84, -142], [-70, -184], [-34, -198], [-12, -236],
       [26, -240], [56, -214], [84, -190], [78, -150], [46, -118], [16, -110]], true, 255, 2);
  ink([[-48, -150], [-16, -162], [14, -144], [44, -164]], false, null, 2);
  ink([[-24, -200], [-4, -184], [18, -204]], false, null, 2);
  pop();
}

function drawPersonGroup() {
  curSeed = 51; stroke(0); strokeWeight(2.6);
  isoBox(PERSON_S, PERSON_L, 130, 110, 56, 78);
  const [x, y] = iso(PERSON_S + 22, PERSON_L + 34, 78);
  push(); translate(x, y); strokeWeight(3);
  // pierna lejana, torso, pierna cercana
  tube([[-2, -4], [20, -2], [26, 26]], 9, 1);
  ink([[16, 24], [30, 24], [32, 33], [14, 33]], true, 255, 1);
  tube([[0, 0], [8, -26], [18, -48]], 20, 1);
  tube([[4, -2], [26, 6], [32, 36]], 9, 1);
  ink([[22, 34], [38, 34], [40, 43], [20, 43]], true, 255, 1);
  // cabeza agachada y pelo
  ink(ellipsePts(28, -62, 12, 13, 14), true, 255, 1);
  ink([[16, -66], [20, -76], [32, -78], [41, -70], [40, -64]], false, null, 1);
  ink([[20, -80], [26, -86]], false, null, 0);
  // brazo y celular
  tube([[12, -42], [28, -30], [38, -44]], 7, 1);
  push(); translate(42, -50); rotate(0.35);
  ink([[-5, -9], [5, -9], [5, 9], [-5, 9]], true, 255, 0);
  pop();
  // brillo del celular
  strokeWeight(2);
  line(48, -62, 53, -68); line(52, -56, 59, -58); line(50, -48, 57, -44);
  pop();
}

function drawComputerGroup() {
  curSeed = 61; stroke(0); strokeWeight(2.6);
  const s0 = PC_S - 60, s1 = PC_S + 60, l0 = PC_L - 45, l1 = PC_L + 45;
  // patas del escritorio
  for (const c of [[s0 + 4, l1 - 4], [s1 - 4, l1 - 4], [s1 - 4, l0 + 4]]) {
    const a = iso(c[0], c[1], 0), b = iso(c[0], c[1], 44);
    ink([a, b], false, null, 0);
  }
  isoBox(PC_S, PC_L, 120, 90, 44, 52);
  // teclado
  ink([iso(PC_S - 24, PC_L + 24, 52), iso(PC_S + 20, PC_L + 24, 52), iso(PC_S + 20, PC_L + 38, 52), iso(PC_S - 24, PC_L + 38, 52)], true, 255, 0);
  // base y cuello del monitor
  ink([iso(PC_S - 14, PC_L + 4, 52), iso(PC_S + 10, PC_L + 4, 52), iso(PC_S + 10, PC_L + 14, 52), iso(PC_S - 14, PC_L + 14, 52)], true, 255, 0);
  ink([iso(PC_S - 2, PC_L + 8, 52), iso(PC_S - 2, PC_L + 8, 74)], false, null, 0);
  // monitor (plano con normal +l)
  const m = (s, h) => iso(s, PC_L + 10, h);
  ink([m(PC_S - 46, 70), m(PC_S + 46, 70), m(PC_S + 46, 142), m(PC_S - 46, 142)], true, 255, 0);
  ink([m(PC_S - 38, 78), m(PC_S + 38, 78), m(PC_S + 38, 134), m(PC_S - 38, 134)], true, 255, 0);
  strokeWeight(2);
  if (!P.used) {
    for (let i = 0; i < 4; i++) ink([m(PC_S - 30, 124 - i * 11), m(PC_S + 24 - (i % 2) * 14, 124 - i * 11)], false, null, 0);
  } else {
    // pantalla "inquieta": rayas y una interrogación
    for (let i = 0; i < 3; i++) ink([m(PC_S - 32, 126 - i * 13 + sin(frameCount * 0.1 + i) * 2), m(PC_S - 6, 126 - i * 13)], false, null, 0);
    drawQuestionMark(m(PC_S + 20, 106)[0], m(PC_S + 20, 106)[1], 1.2);
  }
}

function drawQuestionMark(x, y, k) {
  push(); translate(x, y); scale(k); stroke(0); strokeWeight(2.4);
  ink([[-7, -9], [-5, -16], [3, -19], [9, -13], [8, -6], [0, 0], [0, 6]], false, null, 2);
  ink(ellipsePts(0, 13, 1.8, 1.8, 6), true, 0, 0);
  pop();
}

function drawHeart(x, y, k) {
  const pts = [];
  for (let i = 0; i < 22; i++) {
    const t = TWO_PI * i / 22;
    pts.push([16 * pow(sin(t), 3) * 0.55, -(13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t)) * 0.55]);
  }
  push(); translate(x, y); scale(k); strokeWeight(2.4); ink(pts, true, 255, 0); pop();
}

// ---------- Elementos con profundidad ----------
function barkAmt(t) { const a = frameCount - t; return (a >= 0 && a < 14) ? 1 - a / 14 : 0; }

function drawFriendDog() {
  const [x, y] = iso(FRIEND_S, FRIEND_L, 0);
  const near = abs(P.s - FRIEND_S) < 200;
  friend.hop *= 0.94;
  const hop = abs(sin(frameCount * 0.25)) * friend.hop;
  drawDog({ x, y: y - hop, k: 1.15, face: -1, ph: 0, mv: 0, seed: 7, wag: near ? 1 : 0.2, tilt: -0.3 * barkAmt(friend.barkT) });
}

function drawPlayerDog() {
  const [x, y] = iso(P.s, 0, 0);
  const bob = abs(sin(P.ph)) * 2.2 * P.mv;
  const tilt = (P.used ? -0.12 + sin(frameCount * 0.06) * 0.03 : 0) - 0.3 * barkAmt(P.barkT);
  drawDog({ x, y: y - bob, k: 1.15, face: P.face, ph: P.ph, mv: P.mv, seed: 3, wag: 0, tilt });
}

// ---------- Letreros de interacción ----------
function addPrompt(kind, label, x, y, d) { promptBoxes.push({ x, y, label, kind, d }); }

function phraseActive(kind) { return phrases.some(p => p.kind === kind); }

function computePrompts() {
  if (P.used) return;
  const dFriend = abs(P.s - FRIEND_S);
  if (dFriend < 130 && hearts.length === 0) {
    const [x, y] = iso(FRIEND_S, FRIEND_L, 0);
    addPrompt('friend', 'E · SALUDAR', x, y - 215, dFriend);
  }
  for (const kind in PHRASES) {
    const d = abs(P.s - PHRASE_SOURCES[kind]);
    if (d < PHRASES[kind].reach && !phraseActive(kind)) {
      const [x, y] = PHRASES[kind].anchor();
      addPrompt(kind, PHRASES[kind].label, x, y, d);
    }
  }
  const dPc = abs(P.s - PC_S);
  if (dPc < 340) {
    const [x, y] = iso(PC_S, PC_L, 0);
    addPrompt('pc', 'E · MIRAR', x - 20, y - 200, dPc);
  }
}

function drawPrompts() {
  for (const b of promptBoxes) {
    const w = 128, h = 28, y = b.y + sin(frameCount * 0.1) * 3;
    push(); curSeed = 91; stroke(0); strokeWeight(2);
    ink([[b.x - w / 2, y - h / 2], [b.x + w / 2, y - h / 2], [b.x + w / 2, y + h / 2], [b.x - w / 2, y + h / 2]], true, 255, 0);
    noStroke(); fill(0); textFont('Courier New'); textStyle(BOLD); textAlign(CENTER, CENTER); textSize(13);
    text(b.label, b.x, y + 1);
    pop();
  }
}

// Texto "a mano": cada letra tiembla un poco y lleva un halo blanco para leerse sobre las líneas.
function wobbleText(lines, x, y, sz, a, lh) {
  push(); curSeed = 5;
  textFont('Courier New'); textStyle(BOLD); textSize(sz); textAlign(LEFT, CENTER);
  for (let li = 0; li < lines.length; li++) {
    const s = lines[li], w = textWidth(s), cy = y + li * lh;
    let cx = x - w / 2;
    for (const ch of s) {
      const cw = textWidth(ch), jx = nz(cx, cy, 5) * 4, jy = nz(cx, cy, 9) * 4;
      stroke(255, a); strokeWeight(5); fill(255, a); text(ch, cx + jx, cy + jy);
      noStroke(); fill(0, a); text(ch, cx + jx, cy + jy);
      cx += cw;
    }
  }
  pop();
}

function drawBark(sx, sy, face, txt, sz, age) {
  const life = 34, a = 255 * (1 - max(0, age - (life - 14)) / 14);
  const grow = 1 + 0.4 * max(0, 1 - age / 8);
  push(); stroke(0, a); strokeWeight(3);
  for (const ang of [-0.8, -0.25, 0.3]) {
    const r1 = 14 + age * 0.5, r2 = r1 + 14;
    line(sx + face * cos(ang) * r1, sy + sin(ang) * r1, sx + face * cos(ang) * r2, sy + sin(ang) * r2);
  }
  pop();
  push(); translate(sx + face * (62 + age * 0.9), sy - 18 - age * 0.5); scale(grow); rotate(-0.15 * face);
  wobbleText([txt], 0, 0, sz, a, 0);
  pop();
}

function drawEffects() {
  const [fx, fy] = iso(FRIEND_S, FRIEND_L, 0);
  hearts = hearts.filter(h => frameCount - h.born < 110);
  for (const h of hearts) {
    const a = frameCount - h.born;
    if (a < 0) continue;
    const x = fx + h.x + sin(a * 0.12 + h.ph) * 8, y = fy - 185 - a * 0.9;
    push(); stroke(0, 255 * (1 - a / 110)); curSeed = 70 + h.ph;
    drawHeart(x, y, 1.1 - a / 220);
    pop();
  }
  // frases que flotan hacia arriba (casa, árbol, persona)
  phrases = phrases.filter(p => frameCount - p.born < 280);
  for (const p of phrases) {
    const a = frameCount - p.born;
    const alpha = a < 18 ? a / 18 * 255 : (a > 230 ? (280 - a) / 50 * 255 : 255);
    // la frase sube un poco, pero siempre se mantiene dentro de la pantalla
    const ty = max(p.y - 30 - min(a, 120) * 0.2, cam[1] + 36);
    const tx = constrain(p.x, cam[0] + 170, cam[0] + width - 170);
    wobbleText(PHRASES[p.kind].lines, tx, ty, 17, alpha, 22);
  }
  // ladridos
  const [px, py] = iso(P.s, 0, 0);
  const pa = frameCount - P.barkT;
  if (pa >= 0 && pa < 34) drawBark(px + P.face * 120, py - 124, P.face, '¡GUAU!', 28, pa);
  const fa = frameCount - friend.barkT;
  if (fa >= 0 && fa < 34) drawBark(fx - 120, fy - 124, -1, '¡guau!', 22, fa);
  // signos de interrogación junto al perro
  if (P.used) {
    if (frameCount % 12 === 0 && qs.length < 14) {
      qs.push({ dx: random(45, 150), dy: random(-250, -150), born: frameCount, k: random(0.8, 1.4), ph: random(TWO_PI) });
    }
    qs = qs.filter(q => frameCount - q.born < 170);
    for (const q of qs) {
      const a = frameCount - q.born;
      const fade = a < 20 ? a / 20 : (a > 130 ? 1 - (a - 130) / 40 : 1);
      push(); curSeed = 80 + q.ph; stroke(0, 255 * fade);
      drawQuestionMark(px + q.dx + sin(a * 0.05 + q.ph) * 6, py + q.dy - a * 0.35, q.k);
      pop();
    }
  }
}

// ---------- Bucle principal ----------
function mouseOnCanvas() { return mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height; }

function update() {
  const mouseHold = mouseIsPressed && mouseOnCanvas() && !hitPrompt(mouseX, mouseY);
  const wantsLeft = keyIsDown(65) || keyIsDown(LEFT_ARROW) || (mouseHold && mouseX < width * 0.2);
  const wantsRight = keyIsDown(RIGHT_ARROW) || keyIsDown(68) || (mouseHold && mouseX >= width * 0.2);
  let moving = false;
  if (!P.locked) {
    if (wantsRight && !wantsLeft && P.s < PLAYER_MAX) { P.s = min(PLAYER_MAX, P.s + SPEED); P.face = 1; moving = true; }
    else if (wantsLeft && !wantsRight && P.s > PATH_START + 50) { P.s = max(PATH_START + 50, P.s - SPEED); P.face = -1; moving = true; }
  }
  if (moving) { P.ph += 0.22 * P.face; hasMoved = true; }
  P.mv = lerp(P.mv, moving ? 1 : 0, 0.2);
  const t = camTarget(P.s);
  cam[0] = lerp(cam[0], t[0], 0.08); cam[1] = lerp(cam[1], t[1], 0.08);
}

function draw() {
  background(255);
  promptBoxes = [];
  update();

  push();
  translate(-round(cam[0]), -round(cam[1]));
  drawLogo();
  drawPath();
  drawPads();

  const items = [
    { d: FRIEND_S + FRIEND_L, x: iso(FRIEND_S, FRIEND_L, 0)[0], f: drawFriendDog },
    { d: HOUSE_S + HOUSE_L,   x: iso(HOUSE_S, HOUSE_L, 0)[0],   f: drawHouseGroup },
    { d: TREE_S + TREE_L,     x: iso(TREE_S, TREE_L, 0)[0],     f: drawTree },
    { d: PERSON_S + PERSON_L, x: iso(PERSON_S, PERSON_L, 0)[0], f: drawPersonGroup },
    { d: PC_S + PC_L,         x: iso(PC_S, PC_L, 0)[0],         f: drawComputerGroup },
    { d: P.s + 0.5,           x: iso(P.s, 0, 0)[0],             f: drawPlayerDog }
  ];
  items.sort((a, b) => a.d - b.d);
  for (const it of items) {
    if (it.x < cam[0] - 320 || it.x > cam[0] + width + 320) continue; // fuera de cámara
    it.f();
  }
  computePrompts();
  drawEffects();
  drawPrompts();
  pop();

  activePrompts = promptBoxes;
  drawHint();
  drawFinal();
}

function drawHint() {
  if (hasMoved) return;
  push(); noStroke(); fill(0); textFont('Courier New'); textAlign(CENTER, CENTER); textSize(12);
  text('→ avanzar   ·   A volver   ·   ESPACIO ladrar', width / 2, height - 34 + sin(frameCount * 0.08) * 3);
  pop();
}

function finalAlpha() {
  if (!P.used) return 0;
  return constrain((frameCount - P.usedAt - 170) / 70, 0, 1);
}

function drawFinal() {
  const a = finalAlpha();
  if (a <= 0) return;
  if (!audioStarted) {
    audioStarted = true;
    if (song) { const pr = song.play(); if (pr && pr.catch) pr.catch(() => {}); }
  }
  push();
  noStroke(); fill(255, 175 * a); rect(0, 0, width, height); // velo blanco: la escena queda de fondo
  textAlign(CENTER, CENTER); textFont('Times New Roman'); textStyle(NORMAL);
  const lines = [
    ['LOS PERROS NO ENTIENDEN INTERNET', 40, height / 2 - 18],
    ['(...Y YO NO ENTIENDO DE SENTIMIENTOS)', 24, height / 2 + 28]
  ];
  for (const [txt, sz, y] of lines) {
    textSize(sz);
    noStroke(); fill(0, 255 * a); text(txt, width / 2, y);
  }
  pop();
  drawScribbles(a);
}

// ---------- Dibujar con el mouse sobre la frase final ----------
function drawScribbles(a) {
  if (a > 0.3) cursor(CROSS);
  push(); curSeed = 140; stroke(0); strokeWeight(5.5); noFill();
  for (const st of scribbles) {
    if (st.length === 1) { // un solo clic: un punto
      const [x, y] = st[0];
      strokeWeight(7); point(x + nz(x, y, 3) * 3, y + nz(x, y, 8) * 3); strokeWeight(5.5);
      continue;
    }
    const p = st.length > 2 ? chaikin(st, false, 1) : st;
    beginShape();
    for (const q of p) vertex(q[0] + nz(q[0], q[1], 3) * 3, q[1] + nz(q[0], q[1], 8) * 3);
    endShape();
  }
  pop();
  if (a > 0.9 && scribbles.length === 0) {
    push(); noStroke(); fill(0, 150 * (0.6 + 0.4 * sin(frameCount * 0.08))); textFont('Courier New'); textAlign(CENTER, CENTER); textSize(12);
    text('dibuja con el mouse  ·  C borra', width / 2, height - 30);
    pop();
  }
}

function beginStroke(x, y) { scribbles.push([[x, y]]); drawingNow = true; }
function extendStroke(x, y) {
  const st = scribbles[scribbles.length - 1];
  if (!st) return;
  const l = st[st.length - 1];
  if (dist(l[0], l[1], x, y) > 3) st.push([x, y]);
}
function endStroke() { drawingNow = false; }

// ---------- Sonido de ladrido (sintetizado, no necesita archivos) ----------
function barkSound(pitch) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime, p = pitch || 1;
    for (const [off, dur] of [[0, 0.16], [0.17, 0.13]]) {
      const o = actx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(430 * p, t + off);
      o.frequency.exponentialRampToValueAtTime(150 * p, t + off + dur);
      const f = actx.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(1800, t + off);
      f.frequency.exponentialRampToValueAtTime(500, t + off + dur);
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.3, t + off + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + dur + 0.03);
      o.connect(f); f.connect(g); g.connect(actx.destination);
      o.start(t + off); o.stop(t + off + dur + 0.05);
    }
  } catch (e) { /* sin audio: no pasa nada */ }
}

function bark() {
  if (frameCount - P.barkT < 12) return;
  P.barkT = frameCount;
  barkSound(1);
  // si hay un perrito cerca, responde
  if (abs(P.s - FRIEND_S) < 320) {
    setTimeout(() => { friend.barkT = frameCount; barkSound(1.3); }, 450);
  }
}

// ---------- Interacción ----------
function hitPrompt(mx, my) {
  return !!findPrompt(mx, my);
}

function findPrompt(mx, my) {
  for (const b of activePrompts) {
    const sx = b.x - cam[0], sy = b.y - cam[1];
    if (abs(mx - sx) < 70 && abs(my - sy) < 20) return b;
  }
  return null;
}

function interact(kind) {
  bark(); // todo lo que se toca, se ladra
  if (kind === 'friend') {
    for (let i = 0; i < 7; i++) hearts.push({ x: random(-24, 24), born: frameCount + i * 5, ph: random(TWO_PI) });
    friend.hop = 9;
  } else if (PHRASES[kind]) {
    const [x, y] = PHRASES[kind].anchor();
    phrases = phrases.filter(p => p.kind !== kind);
    phrases.push({ kind, x, y, born: frameCount });
  } else if (kind === 'pc' && !P.used) {
    P.used = true; P.locked = true; P.usedAt = frameCount; P.face = 1;
    P.s = max(P.s, PC_S - 340 + 1); // el perrito se queda mirando la pantalla
  }
}

function mousePressed() {
  const b = findPrompt(mouseX, mouseY);
  if (b) { interact(b.kind); return; }
  if (finalAlpha() > 0.3 && mouseOnCanvas()) { beginStroke(mouseX, mouseY); return false; }
}

function mouseDragged() {
  if (drawingNow) { extendStroke(mouseX, mouseY); return false; }
}

function mouseReleased() {
  if (drawingNow) endStroke();
}

function keyPressed() {
  if (key === 'r' || key === 'R') { resetGame(); return false; }
  if (key === 'e' || key === 'E') {
    if (activePrompts.length) {
      const b = activePrompts.reduce((m, c) => (c.d < m.d ? c : m));
      interact(b.kind);
    }
    return false;
  }
  if ((key === 'c' || key === 'C') && finalAlpha() > 0) { scribbles = []; return false; }
  if (key === ' ' || key === 'b' || key === 'B') { bark(); return false; }
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) return false;
}
