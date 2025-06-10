// HTML Elementlerini Seçme
const balanceDisplay = document.getElementById('balance');
const totalBetAmountDisplay = document.getElementById('totalBetAmount');
const messageDisplay = document.getElementById('message');
const winAmountDisplay = document.getElementById('winAmount');
const dropBallButton = document.getElementById('dropBallButton');
const plinkoBoard = document.getElementById('plinkoBoard');
const muteButton = document.getElementById('muteButton');
const backToLobbyButton = document.getElementById('backToLobbyButton'); // Bu butonun lobiye dönmek için Plinko sayfasında da olması önemli

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
if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = '../index.html'; // Ana giriş sayfasına yönlendir
}

// Ses dosyası yollarını güncelle (Kendi klasör yapına göre ayarlandı)
// Eğer plinko_oyunu klasörü içinde assets/sounds varsa:
dropSound.src = './slot_oyunu/assets/sounds/drop.mp3';
hitSound.src = './slot_oyunu/assets/sounds/hit.mp3';
prizeSound.src = './slot_oyunu/assets/sounds/prize.mp3';

// Oyun Değişkenleri
let balance = users[activeUser].balance;
let betAmount = 0; // Toplam bahis, top sayısı ve top başına bahise göre hesaplanacak
let isBallDropping = false;
let isMuted = false;
let currentRisk = riskLevelSelect.value;
let currentBallCount = parseInt(ballCountInput.value);
let currentBetPerBall = parseInt(betPerBallInput.value);
let totalWin = 0;
let activeBalls = 0; // Aynı anda düşen top sayısını takip etmek için

// Ses seviyelerini ayarla
dropSound.volume = 0.5;
hitSound.volume = 0.2;
prizeSound.volume = 0.7;

// Plinko Tahtası Ayarları (Stake referansına daha yakın)
const numRows = 16;
const pegGapX = 28;
const pegGapY = 25;
const initialPegOffsetX = 14;
const initialPegOffsetY = 20;

// Topun boyutu
const ballSize = 12;

// Topun düşüş fizik ayarları
const gravity = 0.8;
const bounceFactor = -0.4;
const horizontalImpulse = 12; // NORMAL sapma için değeri 12'ye geri çektik.


// Risk seviyelerine göre çarpan setleri
const riskMultipliers = {
    low: [
        0.5, 0.7, 0.8, 0.9, 1, 1.2, 1, 0.9, 0.8, 0.9, 1, 1.2, 1, 0.9, 0.8, 0.7, 0.5
    ],
    medium: [
        0.7, 0.9, 0.9, 0.9, 1, 1, 2, 2, 3, 2, 2, 1, 1, 0.9, 0.9, 0.9, 0.7
    ],
    high: [
        0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.2, 1000, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1
    ]
};

let prizeMultipliers = riskMultipliers[currentRisk];

// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    balanceDisplay.textContent = balance.toFixed(2);
    betAmount = currentBallCount * currentBetPerBall;
    totalBetAmountDisplay.textContent = betAmount.toFixed(2);

    // Kullanıcının bakiyesini users objesinde ve localStorage'da güncelle
    if (activeUser && users[activeUser]) {
        users[activeUser].balance = balance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }
}

// Plinko Tahtasını Çizme Fonksiyonu
function drawPlinkoBoard() {
    plinkoBoard.innerHTML = ''; // Tahtayı temizle
    prizeMultipliers = riskMultipliers[currentRisk]; // Risk seviyesine göre çarpanları al

    // Çivileri oluştur
    for (let row = 0; row < numRows; row++) {
        const currentPegCount = row + 1;
        const totalRowWidth = (currentPegCount - 1) * pegGapX;
        const startX = (plinkoBoard.offsetWidth - totalRowWidth) / 2; // Ortalamak için

        for (let col = 0; col < currentPegCount; col++) {
            const peg = document.createElement('div');
            peg.classList.add('peg');
            peg.style.left = `${startX + col * pegGapX}px`;
            peg.style.top = `${initialPegOffsetY + row * pegGapY}px`;
            plinkoBoard.appendChild(peg);
        }
    }

    // Kazanç slotlarını oluştur
    const slotWidth = plinkoBoard.offsetWidth / prizeMultipliers.length;
    prizeMultipliers.forEach((multiplier, index) => {
        const slot = document.createElement('div');
        slot.classList.add('prize-slot');
        slot.style.width = `${slotWidth}px`;
        slot.style.left = `${index * slotWidth}px`;

        // Sadece çarpanı göster
        slot.innerHTML = `<span>${multiplier}x</span>`;

        // Kazanç slotlarına çarpan değerine göre sınıf ekle (renklendirme için)
        if (multiplier < 1) {
            slot.classList.add('color-low');
        } else if (multiplier >= 1 && multiplier < 5) {
            slot.classList.add('color-medium');
        } else if (multiplier >= 5 && multiplier < 50) {
            slot.classList.add('color-high');
        } else {
            slot.classList.add('color-insane');
        }

        plinkoBoard.appendChild(slot);
    });
}

// Topu Bırakma Fonksiyonu (Ana kontrol)
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
    riskLevelSelect.disabled = true;
    ballCountInput.disabled = true;
    betPerBallInput.disabled = true;

    totalWin = 0;
    activeBalls = 0;

    document.querySelectorAll('.prize-slot').forEach(slot => {
        slot.classList.remove('highlight');
    });

    const dropPromises = [];
    for (let i = 0; i < currentBallCount; i++) {
        activeBalls++;
        dropPromises.push(dropSingleBall());

        if (currentBallCount <= 25) {
            await new Promise(resolve => setTimeout(resolve, 300));
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
    riskLevelSelect.disabled = false;
    ballCountInput.disabled = false;
    betPerBallInput.disabled = false;
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
        const boardPaddingX = 0;

        const dropZoneStart = boardWidth * 0.2;
        const dropZoneEnd = boardWidth * 0.8 - ballSize;
        let currentX = dropZoneStart + (Math.random() * (dropZoneEnd - dropZoneStart));

        let currentY = 0;

        ball.style.left = `${currentX}px`;
        ball.style.top = `${currentY}px`;

        let velocityY = 0;
        let velocityX = 0;

        const pegs = document.querySelectorAll('.peg');
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

            currentX = Math.max(boardPaddingX, Math.min(currentX, boardWidth - ballSize - boardPaddingX));

            pegs.forEach((peg) => {
                const pegLeftRelativeToBoard = peg.offsetLeft;
                const pegTopRelativeToBoard = peg.offsetTop;

                if (currentX < pegLeftRelativeToBoard + peg.offsetWidth &&
                    currentX + ballSize > pegLeftRelativeToBoard &&
                    currentY < pegTopRelativeToBoard + peg.offsetHeight &&
                    currentY + ballSize > pegTopRelativeToBoard &&
                    !hitPegs.has(peg)) {

                    velocityY *= bounceFactor;

                    let impulseMagnitude = horizontalImpulse;
                    let direction;

                    const highPrizeSlotIndex = prizeMultipliers.indexOf(1000);
                    const estimatedSlotIndex = Math.floor((currentX + ballSize / 2) / (boardWidth / prizeMultipliers.length));

                    // 1000x SÜTUNUNA YAKIN ÇİVİLERİ TESPİT VE SAPMAYI KORU
                    if (Math.abs(estimatedSlotIndex - highPrizeSlotIndex) <= 1) {
                        impulseMagnitude *= 2.5;
                        direction = (Math.random() > 0.5 ? 1 : -1);
                    } else {
                        // 1000x DIŞINDAKİ ÇİVİLER İÇİN NORMAL SAPMA
                        direction = Math.sign((currentX + ballSize / 2) - (pegLeftRelativeToBoard + peg.offsetWidth / 2)) || (Math.random() > 0.5 ? 1 : -1);
                    }

                    velocityX = direction * impulseMagnitude;

                    currentX += velocityX;

                    currentX = Math.max(boardPaddingX, Math.min(currentX, boardWidth - ballSize - boardPaddingX));

                    if (!isMuted && Math.random() < 0.05) {
                        hitSound.currentTime = 0;
                        hitSound.play();
                    }
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
        sound.muted = isMuted;
    });
    muteButton.textContent = isMuted ? '🔊' : '🔇';
}

// Ayar elementleri olay dinleyicileri
riskLevelSelect.addEventListener('change', (event) => {
    currentRisk = event.target.value;
    drawPlinkoBoard();
    updateUI();
});

ballCountInput.addEventListener('input', (event) => {
    currentBallCount = parseInt(event.target.value) || 1;
    if (currentBallCount < 1) currentBallCount = 1;
    event.target.value = currentBallCount;
    updateUI();
});

betPerBallInput.addEventListener('input', (event) => {
    currentBetPerBall = parseInt(event.target.value) || 1;
    if (currentBetPerBall < 1) currentBetPerBall = 1;
    event.target.value = currentBetPerBall;
    updateUI();
});

// Topu bırak butonu
dropBallButton.addEventListener('click', dropBall);

// Mute butonu olay dinleyicisi
muteButton.addEventListener('click', toggleMute);

// Lobiye geri dön butonu
backToLobbyButton.addEventListener('click', () => {
    window.location.href = '../lobby.html';
});

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    drawPlinkoBoard();
});

// Pencere boyutu değiştiğinde tahtayı yeniden çiz (responsive olması için)
window.addEventListener('resize', drawPlinkoBoard);
