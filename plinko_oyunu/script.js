const balanceDisplay = document.getElementById('balance');
const betAmountDisplay = document.getElementById('betAmount');
const messageDisplay = document.getElementById('message');
const winAmountDisplay = document.getElementById('winAmount');
const dropBallButton = document.getElementById('dropBallButton');
const decreaseBetBtn = document.getElementById('decreaseBet');
const increaseBetBtn = document.getElementById('increaseBet');
const plinkoBoard = document.getElementById('plinkoBoard');
const muteButton = document.getElementById('muteButton');
const backToLobbyButton = document.getElementById('backToLobbyButton');

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

// Oyun Değişkenleri
let balance = users[activeUser].balance;
let betAmount = 10;
let isBallDropping = false;
let isMuted = false;

// Ses seviyelerini ayarla
dropSound.volume = 0.5;
hitSound.volume = 0.2;
prizeSound.volume = 0.7;

// Plinko Tahtası Ayarları
const numRows = 10; // Çivi sıralarının sayısı
const pegGapX = 40; // Çiviler arası yatay boşluk
const pegGapY = 35; // Çiviler arası dikey boşluk
const initialPegOffsetX = 20; // İlk sıranın yatay başlangıç ofseti
const initialPegOffsetY = 40; // İlk sıranın dikey başlangıç ofseti

// Kazanç Slotları (aşağıdaki değerler, tahtanın genişliğine ve çivi sayısına göre ayarlanmalı)
// Örneğin, 11 slot için 0.5x, 1x, 2x, 5x, 10x, 20x, 10x, 5x, 2x, 1x, 0.5x
const prizeMultipliers = [0.5, 1, 2, 5, 10, 20, 10, 5, 2, 1, 0.5]; // 11 slot (orta daha yüksek)

// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    balanceDisplay.textContent = balance.toFixed(2);
    betAmountDisplay.textContent = betAmount;

    // Kullanıcının bakiyesini users objesinde ve localStorage'da güncelle
    if (activeUser && users[activeUser]) {
        users[activeUser].balance = balance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }
}

// Plinko Tahtasını Çizme Fonksiyonu
function drawPlinkoBoard() {
    plinkoBoard.innerHTML = ''; // Tahtayı temizle

    // Çivileri oluştur
    for (let row = 0; row < numRows; row++) {
        const numPegsInRow = row + 1;
        const totalRowWidth = (numPegsInRow - 1) * pegGapX;
        const startX = (plinkoBoard.offsetWidth - totalRowWidth) / 2 - initialPegOffsetX / 2; // Ortalamak için

        for (let col = 0; col < numPegsInRow; col++) {
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
        slot.textContent = `${multiplier}x`;
        plinkoBoard.appendChild(slot);
    });
}

// Topu Bırakma Fonksiyonu
function dropBall() {
    if (isBallDropping) {
        return;
    }

    if (balance < betAmount) {
        messageDisplay.textContent = 'Bakiyen Yetersiz! Bahsi Azalt.';
        return;
    }

    balance -= betAmount;
    updateUI();
    messageDisplay.textContent = 'Top düşüyor...';
    winAmountDisplay.textContent = '';
    isBallDropping = true;
    dropBallButton.disabled = true;
    decreaseBetBtn.disabled = true;
    increaseBetBtn.disabled = true;

    // Tüm slotların highlight'ını kaldır
    document.querySelectorAll('.prize-slot').forEach(slot => {
        slot.classList.remove('highlight');
    });

    if (!isMuted) {
        dropSound.currentTime = 0;
        dropSound.play();
    }

    const ball = document.createElement('div');
    ball.classList.add('ball');
    plinkoBoard.appendChild(ball);

    const ballSize = 20; // Topun boyutu
    const boardPaddingX = 20; // Board'un sağ ve sol paddingleri
    const dropAreaWidth = plinkoBoard.offsetWidth - (2 * boardPaddingX); // Drop alanının genişliği

    // Topun ilk düşeceği x pozisyonu (random olarak düşme alanının ortasından)
    let currentX = boardPaddingX + (Math.random() * (dropAreaWidth - ballSize));
    let currentY = 0; // Drop alanı başlangıcı

    ball.style.left = `${currentX}px`;
    ball.style.top = `${currentY}px`;

    const gravity = 0.5; // Yerçekimi ivmesi
    let velocityY = 0; // Dikey hız

    const pegs = document.querySelectorAll('.peg');
    const prizeSlots = document.querySelectorAll('.prize-slot');

    let hitPegs = new Set(); // Topun çarptığı çivileri takip et

    function animateBall() {
        if (currentY >= plinkoBoard.offsetHeight - ballSize) {
            // Top tahtanın altına ulaştı, kazanılan slotu bul
            const finalX = currentX + ballSize / 2; // Topun orta noktası
            const slotWidth = plinkoBoard.offsetWidth / prizeMultipliers.length;
            let finalSlotIndex = Math.floor(finalX / slotWidth);

            // Sınır kontrolü yap
            if (finalSlotIndex < 0) finalSlotIndex = 0;
            if (finalSlotIndex >= prizeMultipliers.length) finalSlotIndex = prizeMultipliers.length - 1;

            const multiplier = prizeMultipliers[finalSlotIndex];
            const win = betAmount * multiplier;
            balance += win;
            updateUI();

            messageDisplay.textContent = win > 0 ? 'TEBRİKLER! KAZANDIN! 🎉' : 'Tekrar Dene! 🍀';
            messageDisplay.style.color = win > 0 ? '#4CAF50' : '#FF4500';
            winAmountDisplay.textContent = `${win.toFixed(2)} TL Kazandın! Toplam: ${balance.toFixed(2)} TL`;
            
            // Kazanan slotu vurgula
            prizeSlots[finalSlotIndex].classList.add('highlight');
            if (!isMuted) {
                prizeSound.currentTime = 0;
                prizeSound.play();
            }

            // Topu kaldır
            plinkoBoard.removeChild(ball);
            isBallDropping = false;
            dropBallButton.disabled = false;
            decreaseBetBtn.disabled = false;
            increaseBetBtn.disabled = false;
            return;
        }

        velocityY += gravity;
        currentY += velocityY;

        // Çivilerle çarpışma kontrolü
        pegs.forEach((peg) => {
            const pegRect = peg.getBoundingClientRect();
            const ballRect = ball.getBoundingClientRect();

            // Çarpışma algılama (basit dikdörtgen çarpışması)
            if (ballRect.left < pegRect.right &&
                ballRect.right > pegRect.left &&
                ballRect.top < pegRect.bottom &&
                ballRect.bottom > pegRect.top &&
                !hitPegs.has(peg)) { // Daha önce bu çiviye çarpmadıysa
                
                // Basit bir çarpışma sonrası yön değiştirme
                if (Math.random() > 0.5) {
                    currentX += 15; // Sağa git
                } else {
                    currentX -= 15; // Sola git
                }
                velocityY *= -0.5; // Hızı azaltarak zıpla
                
                // Tahta sınırları içinde kalmasını sağla
                currentX = Math.max(boardPaddingX, Math.min(currentX, plinkoBoard.offsetWidth - ballSize - boardPaddingX));

                if (!isMuted) {
                    hitSound.currentTime = 0;
                    hitSound.play();
                }
                hitPegs.add(peg); // Çarptığı çiviyi işaretle
            }
        });

        ball.style.left = `${currentX}px`;
        ball.style.top = `${currentY}px`;

        requestAnimationFrame(animateBall);
    }

    animateBall();
}

// Ses açma/kapama fonksiyonu
function toggleMute() {
    isMuted = !isMuted;

    // Tüm ses elementlerini güncelle
    const allSounds = [dropSound, hitSound, prizeSound];
    allSounds.forEach(sound => {
        sound.muted = isMuted;
    });

    muteButton.textContent = isMuted ? '🔊' : '🔇';
}


// Bahis azaltma butonu olay dinleyicisi
decreaseBetBtn.addEventListener('click', () => {
    if (betAmount > 10 && !isBallDropping) {
        betAmount -= 10;
        updateUI();
    }
});

// Bahis artırma butonu olay dinleyicisi
increaseBetBtn.addEventListener('click', () => {
    if (betAmount < 500 && !isBallDropping) { // Maksimum bahis 500 TL
        betAmount += 10;
        updateUI();
    }
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
    drawPlinkoBoard();
    updateUI();
});

// Pencere boyutu değiştiğinde tahtayı yeniden çiz (responsive olması için)
window.addEventListener('resize', drawPlinkoBoard);