// Strict Game Configuration
const CONFIG = {
    gravity: 0.35,
    friction: 0.96,     // Higher friction for rolling stability
    bounce: 0.1,
    spawnInterval: 600,
    containerW: 375,
    containerH: 667,
    padding: 10,
    maxTotalSpawns: 15,
    clearCount: 5,

    // Bowl Physics
    bowlR: 187.5, // containerW / 2
    get bowlCy() { return this.containerH - this.bowlR; },
    get bowlCx() { return this.containerW / 2; },

    radius: {
        normal: 32,
        merged: 84,
    },

    mergeRules: {
        '202601_r.png': { img: '202601_1.png', color: 'red' },
        '202601_y.png': { img: '202601_2.png', color: 'yellow' },
        '202601_p.png': { img: '202601_3.png', color: 'purple' }
    },

    normalImages: ['202601_r.png', '202601_y.png', '202601_p.png'],
    finalImage: '202601_com.png'
};

// Global State
let motifs = [];
let totalSpawnedCount = 0;
let lastSpawnTime = 0;
let gameFinished = false;
let isCinematicPaused = false;

// Selection
let selectedMotif = null;
let mergedOrderList = [];

const gameArea = document.getElementById('game-area');

// 初期メッセージの表示設定（「location.reload」ボタンは不要とのことで、説明文のみ表示）
const resultText = document.getElementById('result-text');
if (resultText) {
    resultText.innerHTML = "２つのばらを連続クリックしてくっつけてね。<br>27通りのメッセージを送るよ";
    
    // 【追加】このメッセージボックス内にあるボタンだけを狙って削除します
    const parentBox = resultText.closest('.message-box');
    if (parentBox) {
        const startBtn = parentBox.querySelector('button');
        if (startBtn) {
            startBtn.remove(); // 最初のボタンだけを消去
        }
    }

    document.getElementById('message-overlay').classList.remove('hidden');
    document.getElementById('message-overlay').classList.add('visible');
    
    // 4秒後に説明文を消す
    setTimeout(() => {
        const overlay = document.getElementById('message-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 1000);
        }
    }, 4000);
}

// Cinematic setup
let cinematicOverlay = document.getElementById('cinematic-overlay');
if (!cinematicOverlay) {
    cinematicOverlay = document.createElement('div');
    cinematicOverlay.id = 'cinematic-overlay';
    const cImg = document.createElement('img');
    cImg.id = 'cinematic-image';
    cinematicOverlay.appendChild(cImg);
    document.getElementById('game-container').appendChild(cinematicOverlay);
}
const cinematicImage = document.getElementById('cinematic-image');

class Motif {
    constructor(id, type, x, y, imgName) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = 0;
        this.rotation = 0;
        this.imgName = imgName;
        this.radius = CONFIG.radius[type] || 32;
        this.locked = false;

        this.isSelected = false;
        this.hoverOffset = 0;
        this.hoverDir = 1;

        this.element = document.createElement('div');
        this.element.className = `motif ${type}`;
        this.element.style.backgroundImage = `url('/static/assets/${imgName}')`;
        gameArea.appendChild(this.element);
    }

    update() {
        if (this.locked || gameFinished || isCinematicPaused) return;

        if (this.isSelected) {
            this.vx *= 0.8;
            this.vy *= 0.8;
            this.hoverOffset += 0.5 * this.hoverDir;
            if (this.hoverOffset > 10) this.hoverDir = -1;
            if (this.hoverOffset < -10) this.hoverDir = 1;
        } else {
            this.vy += CONFIG.gravity;
            this.x += this.vx;
            this.y += this.vy;

            this.vx *= CONFIG.friction;
            this.vy *= CONFIG.friction;

            this.hoverOffset = 0;
        }

        this.rotation = 0;
        if (Math.abs(this.vx) < 0.1) this.vx = 0;
        this.checkBoundaries();
    }

    checkBoundaries() {
        const r = this.radius;
        const pad = CONFIG.padding;
        if (this.y < CONFIG.bowlCy) {
            const leftWall = r + pad;
            const rightWall = CONFIG.containerW - r - pad;
            if (this.x < leftWall) { this.x = leftWall; this.vx *= -CONFIG.bounce; }
            else if (this.x > rightWall) { this.x = rightWall; this.vx *= -CONFIG.bounce; }
        } else {
            const dx = this.x - CONFIG.bowlCx;
            const dy = this.y - CONFIG.bowlCy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = CONFIG.bowlR - r - pad;
            if (dist > maxDist) {
                const nx = dx / dist; const ny = dy / dist;
                const overlap = dist - maxDist;
                this.x -= nx * overlap; this.y -= ny * overlap;
                const vDotN = this.vx * nx + this.vy * ny;
                if (vDotN > 0) {
                    const tx = -ny; const ty = nx;
                    const vDotT = this.vx * tx + this.vy * ty;
                    const newVN = -vDotN * CONFIG.bounce;
                    const newVT = vDotT * CONFIG.friction;
                    this.vx = nx * newVN + tx * newVT;
                    this.vy = ny * newVN + ty * newVT;
                }
            }
        }
    }

    render() {
        let renderY = this.y;
        let scale = 1;

        // 【修正箇所】202601_3 だけ110%（1.1倍）に微調整
        if (this.imgName && this.imgName.includes('202601_3')) {
            scale = 1.1;
        }

        if (this.isSelected) {
            renderY -= (20 + this.hoverOffset);
            scale *= 1.2; // 選択中は元のサイズからさらに大きく
            this.element.classList.add('selected');
        } else {
            this.element.classList.remove('selected');
        }

        const transform = `translate(${this.x}px, ${renderY}px) rotate(0deg) scale(${scale})`;
        this.element.style.transform = transform;
    }

    remove() {
        if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
    }
}

// --- 以下の関数群は変更なし ---
function spawn() {
    if (gameFinished || isCinematicPaused || totalSpawnedCount >= CONFIG.maxTotalSpawns) return;
    const idx = Math.floor(Math.random() * CONFIG.normalImages.length);
    const img = CONFIG.normalImages[idx];
    const spawnW = CONFIG.containerW * 0.7;
    const minX = (CONFIG.containerW - spawnW) / 2;
    const maxX = minX + spawnW;
    const r = CONFIG.radius.normal;
    const finalMinX = Math.max(minX, r + CONFIG.padding);
    const finalMaxX = Math.min(maxX, CONFIG.containerW - r - CONFIG.padding);
    const x = finalMinX + Math.random() * (finalMaxX - finalMinX);
    const y = -r * 2;
    const m = new Motif(Date.now() + Math.random(), 'normal', x, y, img);
    motifs.push(m);
    totalSpawnedCount++;
}

function resolveCollisions() {
    if (isCinematicPaused) return;
    for (let k = 0; k < 8; k++) {
        for (let i = 0; i < motifs.length; i++) {
            for (let j = i + 1; j < motifs.length; j++) {
                const a = motifs[i]; const b = motifs[j];
                if (a.locked || b.locked) continue;
                const dx = b.x - a.x; const dy = b.y - a.y;
                const distSq = dx * dx + dy * dy;
                const minDist = a.radius + b.radius;
                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq); if (dist === 0) continue;
                    const pen = minDist - dist; const nx = dx / dist; const ny = dy / dist;
                    const push = pen * 0.5 + 0.1;
                    a.x -= nx * push; a.y -= ny * push;
                    b.x += nx * push; b.y += ny * push;
                    const dvx = b.vx - a.vx; const dvy = b.vy - a.vy;
                    const velProps = dvx * nx + dvy * ny;
                    if (velProps < 0) {
                        const impulse = velProps * 1.0;
                        a.vx += impulse * nx * 0.5; a.vy += impulse * ny * 0.5;
                        b.vx -= impulse * nx * 0.5; b.vy -= impulse * ny * 0.5;
                    }
                }
            }
        }
    }
}

function handleInput(e) {
    if (gameFinished || isCinematicPaused) return;
    const type = e.type;
    const clientX = type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    const rect = gameArea.getBoundingClientRect();
    const x = clientX - rect.left; const y = clientY - rect.top;

    let tapped = null;
    for (let i = motifs.length - 1; i >= 0; i--) {
        const m = motifs[i];
        if (m.type !== 'normal') continue;
        const dx = x - m.x; const dy = y - m.y;
        if (dx * dx + dy * dy < m.radius * m.radius) { tapped = m; break; }
    }

    if (tapped) {
        if (!selectedMotif) { selectMotif(tapped); }
        else {
            if (tapped === selectedMotif) { deselectMotif(); }
            else {
                const r1 = CONFIG.mergeRules[selectedMotif.imgName];
                const r2 = CONFIG.mergeRules[tapped.imgName];
                if (r1 && r2 && r1.color === r2.color) {
                    performMerge(selectedMotif, tapped);
                    deselectMotif();
                } else { deselectMotif(); selectMotif(tapped); }
            }
        }
    } else if (selectedMotif && type === 'mousedown') { deselectMotif(); }
}

function selectMotif(m) { selectedMotif = m; m.isSelected = true; m.vx = 0; m.vy = 0; }
function deselectMotif() { if (selectedMotif) { selectedMotif.isSelected = false; selectedMotif = null; } }

function performMerge(a, b) {
    const rule = CONFIG.mergeRules[a.imgName]; if (!rule) return;
    const midX = (a.x + b.x) / 2; const midY = (a.y + b.y) / 2;
    a.remove(); b.remove();
    motifs = motifs.filter(m => m !== a && m !== b);
    isCinematicPaused = true;
    mergedOrderList.push(rule.color);
    runCinematic(rule.img, () => {
        isCinematicPaused = false;
        const m = new Motif(Date.now(), 'merged', midX, midY, rule.img);
        motifs.push(m);
        checkCompletion();
    });
}

function runCinematic(imgName, callback) {
    cinematicOverlay.classList.add('active');
    cinematicImage.src = `/static/assets/${imgName}`;
    cinematicImage.classList.remove('spin-anim');
    void cinematicImage.offsetWidth;
    cinematicImage.classList.add('spin-anim');
    setTimeout(() => { cinematicOverlay.classList.remove('active'); callback(); }, 1500);
}

function checkCompletion() { if (mergedOrderList.length >= CONFIG.clearCount) triggerFinale(); }

function triggerFinale() {
    if (gameFinished) return;
    gameFinished = true;
    motifs.forEach(m => m.remove()); motifs = [];
    fetch('/game_clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colors: mergedOrderList })
    }).then(r => r.json()).then(d => createFinaleUI(d.message));
}

function createFinaleUI(messageText) {
    const container = document.createElement('div');
    container.id = 'finale-container';
    const img = document.createElement('img');
    img.src = '/static/assets/' + CONFIG.finalImage;
    img.className = 'finale-image';
    const msgDiv = document.createElement('div');
    msgDiv.innerText = messageText;
    msgDiv.className = 'finale-text';
    const btn = document.createElement('button');
    btn.innerText = "もう一度遊ぶ";
    btn.className = 'restart-btn';
    btn.onclick = () => location.reload();
    container.appendChild(img); container.appendChild(msgDiv); container.appendChild(btn);
    gameArea.appendChild(container);
    requestAnimationFrame(() => container.classList.add('visible'));
}

function loop() {
    const now = Date.now();
    if (!isCinematicPaused && !gameFinished) {
        if (now - lastSpawnTime > CONFIG.spawnInterval) { spawn(); lastSpawnTime = now; }
        resolveCollisions();
        motifs.forEach(m => { m.update(); m.render(); });
    }
    requestAnimationFrame(loop);
}

gameArea.addEventListener('mousedown', handleInput);
gameArea.addEventListener('touchstart', handleInput, { passive: false });
loop();

