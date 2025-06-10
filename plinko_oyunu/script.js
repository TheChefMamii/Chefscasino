// HTML Elementlerini Seçme
const balanceDisplay = document.getElementById('balance');
const totalBetAmountDisplay = document.getElementById('totalBetAmount');
const messageDisplay = document.getElementById('message');
const winAmountDisplay = document.getElementById('winAmount');
const dropBallButton = document.getElementById('dropBallButton');
const plinkoBoard = document.getElementById('plinkoBoard');
const muteButton = document.getElementById('muteButton');
const backToLobbyButton = document.getElementById('backToLobbyButton');

// Yeni ayar elementleri
const riskLevelSelect = document.getElementById('riskLevel');
const ballCountInput = document.getElementById('ballCount');
const betPerBallInput = document.getElementById('betPerBall');

// Ses Elementleri
const dropSound = document.getElementById('dropSound');
const hitSound = document.getElementById('hitSound');
const prizeSound = document.getElementById('prizeSound');

// Aktif kullanıcıyı ve tüm kullanıcı verilerini çek
let activeUser = localStorage.getItem('hansellCasinoActiveUser');
let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

// Eğer aktif kullanıcı yoksa veya kullanıcı verisi hatalıysa, lobiye geri yönlendir
// Lobiye dönmek için iki klasör yukarı çıkıp lobby.html'e gitmeliyiz.
if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = '../index.html'; // İki klasör yukarı çıkıp ana dizindeki index.html'e yönlendir
}

// Ses dosyası yollarını güncelle (assets klasörü iki klasör yukarıda)
dropSound.src = '../assets/sounds/drop.mp3';
hitSound.src = '../assets/sounds/hit.mp3';
prizeSound.src = '../assets/sounds/prize.mp3';

// Oyun Değişkenleri
let balance = users[activeUser].balance;
let betAmount = 0;
let isBallDropping = false;
let isMuted = false;
let currentRisk = riskLevelSelect ? riskLevelSelect.value : 'medium';
let currentBallCount = ballCountInput ? parseInt(ballCountInput.value) : 1;
let currentBetPerBall = betPerBallInput ? parseInt(betPerBallInput.value) : 1;
let totalWin = 0;
let activeBalls = 0;

// Ses seviyelerini ayarla
dropSound.volume = 0.5;
hitSound.volume = 0.2;
prizeSound.volume = 0.7;

// Plinko Tahtası Ayarları (Daha dengeli bir dağılım için ayarlandı)
const numRows = 16;
const pegGapX = 28; // Yatay çivi aralığı
const pegGapY = 25; // Dikey çivi aralığı
const initialPegOffsetY = 20; // İlk sıranın dikey başlangıç konumu

// Topun boyutu
const ballSize = 12;

// Topun düşüş fizik ayarları
const gravity = 0.8;
const bounceFactor = -0.4;
const horizontalImpulse = 12;

// Risk seviyelerine göre çarpan setleri (Daha dengeli ve gerçekçi dağılım)
const riskMultipliers = {
    low: [
        0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5
    ],
    medium: [
        0.3, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0, 7.0, 5.0, 3.0, 2.0, 1.5, 1.0, 0.8, 0.5, 0.3
    ],
    high: [
        0.0, 0.0, 0.0, 0.0, 0.1, 0.2, 0.5, 1.0, 1000, 1.0, 0.5, 0.2, 0.1, 0.0, 0.0, 0.0, 0.0
    ]
};

let prizeMultipliers = riskMultipliers[currentRisk];

// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    balanceDisplay.textContent = balance.toFixed(2);
    betAmount = currentBallCount * currentBetPerBall;
    totalBetAmountDisplay.textContent = betAmount.toFixed(2);

    if (activeUser && users[activeUser]) {
        users[activeUser].balance = balance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }
}

// Plinko Tahtasını Çizme Fonksiyonu
function drawPlinkoBoard() {
    if (!plinkoBoard) return;

    plinkoBoard.innerHTML = '';
    prizeMultipliers = riskMultipliers[currentRisk];

    for (let row = 0; row < numRows; row++) {
        const currentPegCount = row + 1;
        const totalRowWidth = (currentPegCount - 1) * pegGapX;
        const startX = (plinkoBoard.offsetWidth - totalRowWidth) / 2;

        for (let col = 0; col < currentPegCount; col++) {
            const peg = document.createElement('div');
            peg.classList.add('peg');
            peg.style.left = `${startX + col * pegGapX}px`;
            peg.style.top = `${initialPegOffsetY + row * pegGapY}px`;
            plinkoBoard.appendChild(peg);
        }
    }

    const slotWidth = plinkoBoard.offsetWidth / prizeMultipliers.length;
    prizeMultipliers.forEach((multiplier, index) => {
        const slot = document.createElement('div');
        slot.classList.add('prize-slot');
        slot.style.width = `${slotWidth}px`;
        slot.style.left = `${index * slotWidth}px`;

        slot.innerHTML = `<span>${multiplier}x</span>`;

        if (multiplier < 0.1) {
            slot.classList.add('color-low');
        } else if (multiplier >= 0.1 && multiplier < 1.0) {
            slot.classList.add('color-low');
        } else if (multiplier >= 1.0 && multiplier < 5.0) {
            slot.classList.add('color-medium');
        } else if (multiplier >= 5.0 && multiplier < 50.0) {
            slot.classList.add('color-high');
        } else {
            slot.classList.add('color-insane');
        }

        plinkoBoard.appendChild(slot);
    });
}

// Topu Bırakma Fonksiyonu
async function dropBall() {
    if (isBallDropping) {
        return;
    }

    betAmount = currentBallCount * currentBetPerBall;

    if (balance < betAmount) {
        messageDisplay.textContent = 'Bakiyen Yetersiz! Bahsi Azalt veya Top Sayısını Azalt.';
        return;
    }

    balance -= betAmount;
    updateUI();
    messageDisplay.textContent = 'Toplar düşüyor...';
    winAmountDisplay.textContent = '';
    isBallDropping = true;
    dropBallButton.disabled = true;
    if (riskLevelSelect) riskLevelSelect.disabled = true;
    if (ballCountInput) ballCountInput.disabled = true;
    if (betPerBallInput) betPerBallInput.disabled = true;

    totalWin = 0;
    activeBalls = 0;

    document.querySelectorAll('.prize-slot').forEach(slot => {
        slot.classList.remove('highlight');
    });

    const dropPromises = [];
    for (let i = 0; i < currentBallCount; i++) {
        activeBalls++;
        dropPromises.push(dropSingleBall());

        if (currentBallCount <= 10) {
            await new Promise(resolve => setTimeout(resolve, 500));
        } else if (currentBallCount <= 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    }
    await Promise.all(dropPromises);

    messageDisplay.textContent = totalWin > 0 ? `TEBRİKLER! Toplam ${totalWin.toFixed(2)} TL Kazandın! 🎉` : 'Tekrar Dene! 🍀';
    messageDisplay.style.color = totalWin > 0 ? '#4CAF50' : '#FF4500';
    winAmountDisplay.textContent = `Yeni Bakiyen: ${balance.toFixed(2)} TL`;

    isBallDropping = false;
    dropBallButton.disabled = false;
    if (riskLevelSelect) riskLevelSelect.disabled = false;
    if (ballCountInput) ballCountInput.disabled = false;
    if (betPerBallInput) betPerBallInput.disabled = false;
}

// Tek bir topu düşürme ve sonucunu döndürme fonksiyonu
function dropSingleBall() {
    return new Promise(resolve => {
        if (!isMuted && activeBalls === 1) {
            dropSound.currentTime = 0;
            dropSound.play();
        }

        const ball = document.createElement('div');
        ball.classList.add('ball');
        plinkoBoard.appendChild(ball);

        const boardWidth = plinkoBoard.offsetWidth;
        const boardHeight = plinkoBoard.offsetHeight;

        let currentX = (boardWidth / 2) - (ballSize / 2);
        let currentY = 0;

        ball.style.left = `${currentX}px`;
        ball.style.top = `${currentY}px`;

        let velocityY = 0;
        let velocityX = 0;

        const pegs = Array.from(document.querySelectorAll('.peg'));
        const prizeSlots = document.querySelectorAll('.prize-slot');

        let hitPegs = new Set();

        function animateBall() {
            if (currentY >= boardHeight - ballSize) {
                const finalX = currentX + ballSize / 2;
                const slotWidth = boardWidth / prizeMultipliers.length;
                let finalSlotIndex = Math.floor(finalX / slotWidth);

                if (finalSlotIndex < 0) finalSlotIndex = 0;
                if (finalSlotIndex >= prizeMultipliers.length) finalSlotIndex = prizeMultipliers.length - 1;

                const multiplier = prizeMultipliers[finalSlotIndex];
                const win = currentBetPerBall * multiplier;

                totalWin += win;
                balance += win;

                updateUI();

                prizeSlots[finalSlotIndex].classList.add('highlight');
                if (!isMuted) {
                    prizeSound.currentTime = 0;
                    prizeSound.play();
                }

                plinkoBoard.removeChild(ball);
                activeBalls--;
                resolve();
                return;
            }

            velocityY += gravity;
            currentY += velocityY;
            currentX += velocityX;

            currentX = Math.max(0, Math.min(currentX, boardWidth - ballSize));

            pegs.forEach((peg) => {
                const pegLeftRelativeToBoard = peg.offsetLeft;
                const pegTopRelativeToBoard = peg.offsetTop;

                if (currentX < pegLeftRelativeToBoard + peg.offsetWidth &&
                    currentX + ballSize > pegLeftRelativeToBoard &&
                    currentY < pegTopRelativeToBoard + peg.offsetHeight &&
                    currentY + ballSize > pegTopRelativeToBoard &&
                    !hitPegs.has(peg)) {

                    if (!isMuted) {
                        hitSound.currentTime = 0;
                        hitSound.play();
                    }

                    velocityY *= bounceFactor;

                    let impulseMagnitude = horizontalImpulse;
                    let direction;

                    const highPrizeSlotIndex = prizeMultipliers.indexOf(1000);
                    const estimatedSlotIndex = Math.floor((currentX + ballSize / 2) / (boardWidth / prizeMultipliers.length));

                    if (currentRisk === 'high' && Math.abs(estimatedSlotIndex - highPrizeSlotIndex) <= 2) {
                        if (Math.random() < 0.5) {
                            direction = (Math.random() > 0.5 ? 1 : -1);
                            impulseMagnitude *= 1.5;
                        } else {
                            direction = Math.sign((boardWidth / 2) - (currentX + ballSize / 2));
                            if (direction === 0) direction = (Math.random() > 0.5 ? 1 : -1);
                            impulseMagnitude *= 1.2;
                        }
                    } else {
                        const centerDiff = (currentX + ballSize / 2) - (pegLeftRelativeToBoard + peg.offsetWidth / 2);
                        direction = Math.sign(centerDiff);
                        if (direction === 0) {
                            direction = (Math.random() > 0.5 ? 1 : -1);
                        }
                    }
                    
                    velocityX = direction * impulseMagnitude;

                    const overlapX = (currentX < pegLeftRelativeToBoard) ? (pegLeftRelativeToBoard - (currentX + ballSize)) : ((pegLeftRelativeToBoard + peg.offsetWidth) - currentX);
                    currentX += (direction * Math.abs(overlapX));
                    
                    currentX = Math.max(0, Math.min(currentX, boardWidth - ballSize));

                    hitPegs.add(peg);
                }
            });

            ball.style.left = `${currentX}px`;
            ball.style.top = `${currentY}px`;

            requestAnimationFrame(animateBall);
        }

        animateBall();
    });
}

// Ses açma/kapama fonksiyonu
function toggleMute() {
    isMuted = !isMuted;
    const allSounds = [dropSound, hitSound, prizeSound];
    allSounds.forEach(sound => {
        if (sound) {
            sound.muted = isMuted;
        }
    });
    if (muteButton) {
        muteButton.textContent = isMuted ? '🔊' : '🔇';
    }
}

// Ayar elementleri olay dinleyicileri
if (riskLevelSelect) {
    riskLevelSelect.addEventListener('change', (event) => {
        currentRisk = event.target.value;
        drawPlinkoBoard();
        updateUI();
    });
}

if (ballCountInput) {
    ballCountInput.addEventListener('input', (event) => {
        currentBallCount = parseInt(event.target.value) || 1;
        if (currentBallCount < 1) currentBallCount = 1;
        event.target.value = currentBallCount;
        updateUI();
    });
}

if (betPerBallInput) {
    betPerBallInput.addEventListener('input', (event) => {
        currentBetPerBall = parseInt(event.target.value) || 1;
        if (currentBetPerBall < 1) currentBetPerBall = 1;
        event.target.value = currentBetPerBall;
        updateUI();
    });
}

// Topu bırak butonu
if (dropBallButton) {
    dropBallButton.addEventListener('click', dropBall);
}

// Mute butonu olay dinleyicisi
if (muteButton) {
    muteButton.addEventListener('click', toggleMute);
}

// Lobiye geri dön butonu (lobby.html iki klasör yukarıda)
if (backToLobbyButton) {
    backToLobbyButton.addEventListener('click', () => {
        window.location.href = '../lobby.html';
    });
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    drawPlinkoBoard();
});

// Pencere boyutu değiştiğinde tahtayı yeniden çiz
window.addEventListener('resize', drawPlinkoBoard);
