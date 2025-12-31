document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");

    // Strict Game Configuration
    const CONFIG = {
        gravity: 0.35,
        friction: 0.94,     // Increased air friction for "shittori" feel (was 0.99)
        bounce: 0.4,
        spawnInterval: 3000, // 3s auto spawn
        containerW: 375,
        containerH: 667,
        padding: 10,
        maxTotalSpawns: 300,
        clearCount: 5,

        bowlR: 187.5,
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
    let gameFinished = false;
    let isCinematicPaused = false;
    let autoSpawnTimer = null;
    let mergedOrderList = [];
    let previousMergedCount = 0;
    let selectedMotif = null;

    // DOM Elements
    const gameArea = document.getElementById('game-area');
    const progressText = document.getElementById('progress-text');

    // UI 2 Counters (Merged Types)
    const countEl1 = document.querySelector('#count-type-1 span');
    const countEl2 = document.querySelector('#count-type-2 span');
    const countEl3 = document.querySelector('#count-type-3 span');

    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-button');
    const messageOverlay = document.getElementById('message-overlay');

    // Create Cinematic Overlay if missing (though typically in HTML, ensuring it exists)
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


    // --- Classes ---
    class Motif {
        constructor(id, type, x, y, imgName) {
            this.id = id;
            this.type = type;
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = 0;
            this.rotation = Math.random() * 360;
            this.imgName = imgName;
            this.radius = CONFIG.radius[type] || 32;
            this.locked = false;

            this.isSelected = false;
            this.hoverOffset = 0;
            this.hoverDir = 1;

            this.element = document.createElement('div');
            this.element.className = `motif ${type}`;
            this.element.style.backgroundImage = `url('/static/assets/${imgName}')`;
            if (gameArea) gameArea.appendChild(this.element);
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

                // Rotation (Damped)
                // Only rotate significantly if there is velocity
                if (Math.abs(this.vx) > 0.1) {
                    this.rotation += this.vx * 1.5;
                }
            }

            this.checkBoundaries();
        }

        checkBoundaries() {
            const r = this.radius;
            const pad = CONFIG.padding;

            if (this.y < CONFIG.bowlCy) {
                const leftWall = r + pad;
                const rightWall = CONFIG.containerW - r - pad;

                if (this.x < leftWall) {
                    this.x = leftWall;
                    this.vx *= -CONFIG.bounce;
                } else if (this.x > rightWall) {
                    this.x = rightWall;
                    this.vx *= -CONFIG.bounce;
                }
            } else {
                const dx = this.x - CONFIG.bowlCx;
                const dy = this.y - CONFIG.bowlCy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = CONFIG.bowlR - r - pad;

                if (dist > maxDist) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const overlap = dist - maxDist;

                    this.x -= nx * overlap;
                    this.y -= ny * overlap;

                    const vDotN = this.vx * nx + this.vy * ny;

                    if (vDotN > 0) {
                        const tx = -ny;
                        const ty = nx;
                        const vDotT = this.vx * tx + this.vy * ty;

                        const newVN = -vDotN * CONFIG.bounce;
                        const newVT = vDotT * 0.95;

                        this.vx = nx * newVN + tx * newVT;
                        this.vy = ny * newVN + ty * newVT;
                    }
                }
            }
        }

        render() {
            let renderY = this.y;
            let scale = 1;

            if (this.imgName && this.imgName.includes('202601_3')) {
                scale = 1.1;
            }

            if (this.isSelected) {
                renderY -= (20 + this.hoverOffset);
                scale *= 1.2;
                this.element.classList.add('selected');
            } else {
                this.element.classList.remove('selected');
            }

            const transform = `translate(${this.x}px, ${renderY}px) rotate(${this.rotation}deg) scale(${scale})`;
            this.element.style.transform = transform;
        }

        remove() {
            if (this.element.parentNode) this.element.parentNode.removeChild(this.element);
        }
    }

    // --- Core Functions ---

    function updateUI() {
        if (progressText) {
            progressText.innerText = `${mergedOrderList.length}/5`;

            // Trigger Pop Animation if count increased
            if (mergedOrderList.length > previousMergedCount) {
                const circle = document.getElementById('progress-circle');
                if (circle) {
                    circle.classList.remove('pop-active');
                    void circle.offsetWidth; // Trigger reflow
                    circle.classList.add('pop-active');

                    // Cleanup class after animation to be safe (optional but good practice)
                    setTimeout(() => {
                        circle.classList.remove('pop-active');
                    }, 350);
                }
                previousMergedCount = mergedOrderList.length;

                // SPECIAL: Show "Last one!" message at 4/5
                if (mergedOrderList.length === 4) {
                    const msgOverlay = document.getElementById('message-overlay');
                    if (msgOverlay) {
                        const p = msgOverlay.querySelector('p');
                        if (p) p.innerText = "あとひとつ...!";
                        msgOverlay.style.opacity = '1';

                        // optional: fade out after a few seconds? 
                        // User didn't ask to hide it, but usually overlays shouldn't block view forever.
                        // However, "あとひとつ" implies urgency/status. Let's keep it for 2s or until next action?
                        // Let's fade out after 3s to be safe and clean.
                        setTimeout(() => {
                            msgOverlay.style.opacity = '0';
                        }, 10000);
                    }
                }
            }
        }

        // Count specific types
        const count1 = motifs.filter(m => m.imgName.includes('202601_1')).length;
        const count2 = motifs.filter(m => m.imgName.includes('202601_2')).length;
        const count3 = motifs.filter(m => m.imgName.includes('202601_3')).length;

        if (countEl1) countEl1.innerText = `×${count1}`;
        if (countEl2) countEl2.innerText = `×${count2}`;
        if (countEl3) countEl3.innerText = `×${count3}`;
    }

    function spawn() {
        if (gameFinished || isCinematicPaused) return;
        if (motifs.length > 50) return;

        // console.log("Spawning motif..."); 
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

        updateUI();
    }

    function startAutoSpawn() {
        if (autoSpawnTimer) clearInterval(autoSpawnTimer);
        autoSpawnTimer = setInterval(() => {
            spawn();
        }, CONFIG.spawnInterval);
    }

    function stopAutoSpawn() {
        if (autoSpawnTimer) clearInterval(autoSpawnTimer);
    }

    function resolveCollisions() {
        if (isCinematicPaused) return;
        const iterations = 8;
        for (let k = 0; k < iterations; k++) {
            for (let i = 0; i < motifs.length; i++) {
                for (let j = i + 1; j < motifs.length; j++) {
                    const a = motifs[i];
                    const b = motifs[j];

                    if (a.locked || b.locked) continue;

                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq === 0) continue;

                    const minDist = a.radius + b.radius;

                    if (distSq < minDist * minDist) {
                        const dist = Math.sqrt(distSq);

                        const pen = minDist - dist;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        const push = pen * 0.5 + 0.1;

                        a.x -= nx * push;
                        a.y -= ny * push;
                        b.x += nx * push;
                        b.y += ny * push;

                        const dvx = b.vx - a.vx;
                        const dvy = b.vy - a.vy;
                        const velProps = dvx * nx + dvy * ny;

                        if (velProps < 0) {
                            const impulse = velProps * 1.0;
                            a.vx += impulse * nx * 0.5;
                            a.vy += impulse * ny * 0.5;
                            b.vx -= impulse * nx * 0.5;
                            b.vy -= impulse * ny * 0.5;
                        }
                    }
                }
            }
        }
    }

    function handleInput(e) {
        if (gameFinished || isCinematicPaused) return;

        const type = e.type;
        if (type !== 'mousedown' && type !== 'touchstart') return;

        const clientX = type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

        const rect = gameArea.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        let tapped = null;
        for (let i = motifs.length - 1; i >= 0; i--) {
            const m = motifs[i];
            if (m.type !== 'normal') continue;
            const dx = x - m.x;
            const dy = y - m.y;
            if (dx * dx + dy * dy < m.radius * m.radius) {
                tapped = m;
                break;
            }
        }

        if (tapped) {
            console.log("Tapped:", tapped.id);
            if (!selectedMotif) {
                selectMotif(tapped);
            } else {
                if (tapped === selectedMotif) {
                    deselectMotif();
                } else {
                    const r1 = CONFIG.mergeRules[selectedMotif.imgName];
                    const r2 = CONFIG.mergeRules[tapped.imgName];

                    if (r1 && r2 && r1.color === r2.color) {
                        performMerge(selectedMotif, tapped);
                        deselectMotif();
                    } else {
                        deselectMotif();
                        selectMotif(tapped);
                    }
                }
            }
        } else {
            if (selectedMotif && type === 'mousedown') {
                deselectMotif();
            }
        }
    }

    function selectMotif(m) {
        selectedMotif = m;
        m.isSelected = true;
        m.vx = 0; m.vy = 0;
    }

    function deselectMotif() {
        if (selectedMotif) {
            selectedMotif.isSelected = false;
            selectedMotif = null;
        }
    }

    function performMerge(a, b) {
        const rule = CONFIG.mergeRules[a.imgName];
        if (!rule) return;

        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;

        a.remove();
        b.remove();
        motifs = motifs.filter(m => m !== a && m !== b);

        isCinematicPaused = true;
        stopAutoSpawn();
        mergedOrderList.push(rule.color);
        updateUI();

        runCinematic(rule.img, () => {
            isCinematicPaused = false;
            startAutoSpawn();

            const m = new Motif(Date.now(), 'merged', midX, midY, rule.img);
            motifs.push(m);
            updateUI();

            checkCompletion();
        });
    }

    function runCinematic(imgName, callback) {
        cinematicOverlay.classList.add('active');
        cinematicImage.src = `/static/assets/${imgName}`;

        cinematicImage.classList.remove('spin-anim');
        cinematicImage.classList.remove('large-anim'); // Clear previous

        if (imgName.includes('202601_3')) {
            cinematicImage.classList.add('large-anim');
        }

        void cinematicImage.offsetWidth;
        cinematicImage.classList.add('spin-anim');

        setTimeout(() => {
            cinematicOverlay.classList.remove('active');
            cinematicImage.classList.remove('large-anim'); // Cleanup
            callback();
        }, 1500);
    }

    function checkCompletion() {
        if (mergedOrderList.length >= CONFIG.clearCount) {
            triggerFinale();
        }
    }

    function triggerFinale() {
        if (gameFinished) return;
        gameFinished = true;
        stopAutoSpawn();

        motifs.forEach(m => m.remove());
        motifs = [];
        updateUI();

        fetch('/game_clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ colors: mergedOrderList })
        })
            .then(r => r.json())
            .then(d => {
                createFinaleUI(d.message);
            });
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

        container.appendChild(img);
        container.appendChild(msgDiv);
        container.appendChild(btn);

        gameArea.appendChild(container); // gameArea guaranteed by DOMContentLoaded check?

        requestAnimationFrame(() => {
            container.classList.add('visible');
        });
    }

    function loop() {
        const now = Date.now();

        if (!isCinematicPaused && !gameFinished) {
            resolveCollisions();

            motifs.forEach(m => {
                m.update();
                m.render();
            });
        }

        requestAnimationFrame(loop);
    }

    // --- Init & Event Binding ---

    if (gameArea) {
        gameArea.addEventListener('mousedown', handleInput);
        gameArea.addEventListener('touchstart', handleInput, { passive: false });
    } else {
        console.error("Game Area not found!");
    }

    if (startButton && startScreen) {
        startButton.addEventListener('click', () => {
            console.log("Start button clicked");

            // UI Transition
            startScreen.classList.add('hidden');
            setTimeout(() => {
                if (messageOverlay) {
                    messageOverlay.style.opacity = '1';
                    // Auto fade out after 6 seconds
                    setTimeout(() => {
                        messageOverlay.style.opacity = '0';
                    }, 6000);
                }
            }, 500);

            // Game State Reset
            gameFinished = false;
            motifs.forEach(m => m.remove());
            motifs = [];
            mergedOrderList = [];
            previousMergedCount = 0;

            // Start Engine
            // Initial Spawn: 15 items scattered
            for (let i = 0; i < 15; i++) {
                const idx = Math.floor(Math.random() * CONFIG.normalImages.length);
                const img = CONFIG.normalImages[idx];

                const r = CONFIG.radius.normal;
                const minX = r + CONFIG.padding;
                const maxX = CONFIG.containerW - r - CONFIG.padding;
                const x = minX + Math.random() * (maxX - minX);

                // Scatter Y in upper/mid area so they fall/settle nicely
                const y = 100 + Math.random() * (CONFIG.containerH - 350);

                const m = new Motif(Date.now() + Math.random(), 'normal', x, y, img);
                motifs.push(m);
            }

            updateUI(); // Important: Update new count UI
            startAutoSpawn(); // Start 3s timer
            loop();
        });
    } else {
        console.error("Start Button or Screen not found. IDs: start-button, start-screen");
    }

});
