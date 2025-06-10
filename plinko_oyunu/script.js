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

// Plinko Tahtası Ayarları (Stake referansına daha yakın)
const numRows = 16; // Stake'deki gibi 16 sıra
const pegGapX = 28; // Çiviler arası yatay boşluk
const pegGapY = 25; // Çiviler arası dikey boşluk
const initialPegOffsetX = 14; // İlk sıranın yatay başlangıç ofseti
const initialPegOffsetY = 20; // İlk sıranın dikey başlangıç ofseti

// Kazanç Slotları (Stake'e benzetmek için güncellendi - 16 sıra için 17 slot)
const prizeMultipliers = [
    130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130
]; // Örnek olarak 16 sıra için 17 slot

// Topun boyutu
const ballSize = 12;

// Topun düşüş fizik ayarları
const gravity = 0.8; // Yerçekimi ivmesi artırıldı (top daha hızlı düşer)
const bounceFactor = -0.4; // Zıplama oranı (daha az zıplar)
const horizontalImpulse = 10; // Çarpışmada yatay sapma miktarı


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
        // Her sıradaki çivi sayısı (Stake'deki gibi)
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
        
        // Stake'deki gibi çarpan ve TL değerini ayrı ayrı göster
        slot.innerHTML = `<span>${multiplier}x</span><br>${(betAmount * multiplier).toFixed(2)} TL`;

        // Kazanç slotlarına çarpan değerine göre sınıf ekle (renklendirme için)
        if (multiplier < 1) { // Örneğin 0.2x
            slot.classList.add('green-low');
        } else if (multiplier >= 1 && multiplier < 5) { // 1x, 2x, 4x
            slot.classList.add('green-medium');
        } else if (multiplier >= 5 && multiplier < 10) { // 9x
            slot.classList.add('yellow');
        } else if (multiplier >= 10 && multiplier < 50) { // 26x
            slot.classList.add('orange');
        } else { // 50x ve üzeri (130x)
            slot.classList.add('red');
        }

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

    const boardPaddingX = 0; // Paddingleri sıfırladığımız için 0 yapıldı

    // Topun ilk düşeceği x pozisyonu (random olarak düşme alanının ortasından)
    let currentX = boardPaddingX + (Math.random() * (plinkoBoard.offsetWidth - ballSize - (2 * boardPaddingX)));
    let currentY = 0; // Drop alanı başlangıcı

    ball.style.left = `${currentX}px`;
    ball.style.top = `${currentY}px`;

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
            // Çivilerin pozisyonunu plinkoBoard'a göre al
            const pegLeftRelativeToBoard = peg.offsetLeft;
            const pegTopRelativeToBoard = peg.offsetTop;

            if (currentX < pegLeftRelativeToBoard + pegRect.width &&
                currentX + ballSize > pegLeftRelativeToBoard &&
                currentY < pegTopRelativeToBoard + pegRect.height &&
                currentY + ballSize > pegTopRelativeToBoard &&
                !hitPegs.has(peg)) { // Daha önce bu çiviye çarpmadıysa
                
                // Çarpışma sonrası yön değiştirme
                let horizontalDirection = Math.random() > 0.5 ? 1 : -1;
                currentX += horizontalDirection * horizontalImpulse; // horizontalImpulse kadar sapma
                velocityY *= bounceFactor; // bounceFactor ile zıpla (negatif değer olduğu için yön tersine döner)
                
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
        drawPlinkoBoard(); // Bahis değişince slotlardaki TL miktarını güncelle
        updateUI();
    }
});

// Bahis artırma butonu olay dinleyicisi
increaseBetBtn.addEventListener('click', () => {
    if (betAmount < 500 && !isBallDropping) { // Maksimum bahis 500 TL
        betAmount += 10;
        drawPlinkoBoard(); // Bahis değişince slotlardaki TL miktarını güncelle
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
