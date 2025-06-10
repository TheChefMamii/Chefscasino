const balanceDisplay = document.getElementById('balance');
const totalBetAmountDisplay = document.getElementById('totalBetAmount');
const messageDisplay = document.getElementById('message');
const winAmountDisplay = document = document.getElementById('winAmount');
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
if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = '../index.html'; // Ana giriş sayfasına yönlendir
}

// Ses dosyası yollarını güncelle (Eğer slot_oyunu klasörünün içindeki assets/sounds klasöründeyse)
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
// 1000x'e düşme olasılığını azaltmak ve normal sapma için fizik parametreleri
const gravity = 0.8;
const bounceFactor = -0.4; // Zıplama oranını düşürdük, daha az seker
const horizontalImpulse = 12; // Yatay sapmayı NORMAL değerine geri çektik (12), eski rastgeleliğe yakın


// Risk seviyelerine göre çarpan setleri - 1000x olasılığı düşük kalacak şekilde
const riskMultipliers = {
    // low: Medium'dan da düşük, risk az, kazanç az
    low: [
        0.5, 0.7, 0.8, 0.9, 1, 1.2, 1, 0.9, 0.8, 0.9, 1, 1.2, 1, 0.9, 0.8, 0.7, 0.5
    ],
    // medium: Senin istediğin basit çarpan listesi
    medium: [
        0.7, 0.9, 0.9, 0.9, 1, 1, 2, 2, 3, 2, 2, 1, 1, 0.9, 0.9, 0.9, 0.7
    ],
    // high: Yüksek risk, yüksek kazanç ama 1000x'in gelme olasılığı MİLYONDA BİR olacak şekilde ayarlandı.
    // 1000x'in etrafı tamamen 0.1x ve 0.2x ile çevrildi.
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
        // Bu renklendirme artık daha çok çarpanın değerine göre (nadirlik)
        if (multiplier < 1) {
            slot.classList.add('color-low'); // Düşük çarpan (yeşilimsi)
        } else if (multiplier >= 1 && multiplier < 5) {
            slot.classList.add('color-medium'); // Orta çarpan (sarımsı)
        } else if (multiplier >= 5 && multiplier < 50) {
            slot.classList.add('color-high'); // Yüksek çarpan (turuncu)
        } else { // 50x ve üzeri (en nadirler)
            slot.classList.add('color-insane'); // Çok yüksek çarpan (kırmızı/mor)
        }

        plinkoBoard.appendChild(slot);
    });
}

// Topu Bırakma Fonksiyonu (Ana kontrol)
async function dropBall() {
    if (isBallDropping) {
        return;
    }

    // Toplam bahis miktarını hesapla
    betAmount = currentBallCount * currentBetPerBall;

    if (balance < betAmount) {
        messageDisplay.textContent = 'Bakiyen Yetersiz! Bahsi Azalt veya Top Sayısını Azalt.';
        return;
    }

    // Toplam bahis bakiyeden düşülür
    balance -= betAmount;
    updateUI();
    messageDisplay.textContent = 'Toplar düşüyor...';
    winAmountDisplay.textContent = '';
    isBallDropping = true;
    dropBallButton.disabled = true;
    riskLevelSelect.disabled = true;
    ballCountInput.disabled = true;
    betPerBallInput.disabled = true;

    totalWin = 0; // Her yeni oyun başlangıcında toplam kazancı sıfırla
    activeBalls = 0; // Aktif top sayısını sıfırla

    // Tüm slotların highlight'ını kaldır
    document.querySelectorAll('.prize-slot').forEach(slot => {
        slot.classList.remove('highlight');
    });

    // Topları düşürme mantığı: 25 veya daha az top ise sıralı, fazlası ise eş zamanlı
    const dropPromises = [];
    for (let i = 0; i < currentBallCount; i++) {
        activeBalls++;
        dropPromises.push(dropSingleBall()); // Her topu düşürme Promise'ini ekle

        // Eğer top sayısı 25 veya daha az ise, her top arasında biraz bekle
        if (currentBallCount <= 25) {
            await new Promise(resolve => setTimeout(resolve, 300)); // 300ms gecikme
        } else {
            // Eğer top sayısı 25'ten fazla ise, topları daha hızlı arka arkaya fırlat
            await new Promise(resolve => setTimeout(resolve, 20)); // Çok kısa gecikme
        }
    }
    await Promise.all(dropPromises); // Tüm topların düşmesini bekle

    // Tüm toplar düştükten sonra sonucu göster
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

                    let impulseMagnitude = horizontalImpulse; // Varsayılan yatay ivme
                    let direction; // Yön belirleyeceğiz

                    // 1000x'in index'i
                    const highPrizeSlotIndex = prizeMultipliers.indexOf(1000);
                    // Topun tahmini düşeceği slotun index'i
                    const estimatedSlotIndex = Math.floor((currentX + ballSize / 2) / (boardWidth / prizeMultipliers.length));

                    // **** BURASI KRİTİK: 1000x SÜTUNUNA YAKIN ÇİVİLERİ TESPİT VE SAPMAYI KORU ****
                    if (Math.abs(estimatedSlotIndex - highPrizeSlotIndex) <= 1) {
                        impulseMagnitude *= 2.5; // Yatay sapmayı 2.5 katına çıkar
                        direction = (Math.random() > 0.5 ? 1 : -1); // Zıt yöne gitme şansını tamamen rastgele yap
                    } else {
                        // **** BURASI DEĞİŞTİRİLDİ: 1000x DIŞINDAKİ ÇİVİLER İÇİN NORMAL SAPMA ****
                        // Topun çivinin hangi tarafına çarptığına göre yön belirle
                        direction = Math.sign((currentX + ballSize / 2) - (pegLeftRelativeToBoard + peg.offsetWidth / 2)) || (Math.random() > 0.5 ? 1 : -1);
                        // Eğer tam ortadaysa rastgele bir yön ver
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
    drawPlinkoBoard(); // Risk değişince çarpanları ve renkleri yeniden çiz
    updateUI(); // Bahis özetini güncelle
});

ballCountInput.addEventListener('input', (event) => {
    currentBallCount = parseInt(event.target.value) || 1; // Geçersizse 1 yap
    if (currentBallCount < 1) currentBallCount = 1;
    event.target.value = currentBallCount;
    updateUI();
});

betPerBallInput.addEventListener('input', (event) => {
    currentBetPerBall = parseInt(event.target.value) || 1; // Geçersizse 1 yap
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
    window.location.href = '../lobby.html'; // Lobiye geri dön
});

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    drawPlinkoBoard();
});

// Pencere boyutu değiştiğinde tahtayı yeniden çiz (responsive olması için)
window.addEventListener('resize', drawPlinkoBoard);
