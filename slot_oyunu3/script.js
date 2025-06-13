// script.js

// DOM Elementlerini Seç
const reels = document.querySelectorAll('.reel');
const spinButton = document.getElementById('spinButton');
const messageDisplay = document.getElementById('message');
const balanceDisplay = document.getElementById('balance');
const betAmountDisplay = document.getElementById('betAmount');
const winAmountDisplay = document.getElementById('winAmount');
const activeLinesCountDisplay = document.getElementById('activeLinesCount');

const betMinusButton = document.getElementById('betMinusButton');
const betPlusButton = document.getElementById('betPlusButton');
const maxBetButton = document.getElementById('maxBetButton');
const autoPlayButton = document.getElementById('autoPlayButton');
const infoButton = document.getElementById('infoButton');
const infoPopup = document.getElementById('infoPopup'); // popup-overlay sınıfını kullanacak
const closeInfoPopupBtn = document.getElementById('closeInfoPopup');
const paytableInfoDisplay = document.getElementById('paytableInfo');
const muteButton = document.getElementById('muteButton');
const backToLobbyButton = document.getElementById('backToLobbyButton');

const lineButtons = document.querySelectorAll('.line-btn');
const bonusGamePopup = document.getElementById('bonusGamePopup'); // popup-overlay sınıfını kullanacak
const closeBonusGamePopupBtn = document.getElementById('closeBonusGamePopup');
const safesContainer = document.querySelector('.safes-container');
const bonusGameMessage = document.getElementById('bonusGameMessage');
const currentBonusWinDisplay = document.getElementById('currentBonusWin');

const reelsWrapper = document.querySelector('.reels-wrapper');
const winLinesContainer = document.createElement('div');
winLinesContainer.classList.add('win-lines-container');
reelsWrapper.appendChild(winLinesContainer);

// Ses Elementleri - Yollar güncellendi
const backgroundMusic = document.getElementById('backgroundMusic');
const spinSound = document.getElementById('spinSound');
const winSound = document.getElementById('winSound');
const bonusSound = document.getElementById('bonusSound');
const safeOpenSound = document.getElementById('safeOpenSound');
const bombSound = document.getElementById('bombSound');

// Oyun Değişkenleri
let activeUser = localStorage.getItem('hansellCasinoActiveUser');
let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = '../lobby.html'; // Yolu kontrol et
}

let balance = users[activeUser].balance;
let betAmount = 10;
let isSpinning = false;
let highlightTimeout;
let lastSpinSymbols = [];
let activeLines = 9; // Varsayılan olarak 9 hat aktif
let currentBonusWin = 0;
let totalBonusSafes = 5;
let bombSafeIndex = -1;
let autoPlayInterval = null;

// Ses Seviyeleri ve Durum
const backgroundMusicVolume = 0.2;
const spinSoundVolume = 0.6;
const winSoundVolume = 0.8;
const bonusSoundVolume = 0.9;
const safeOpenSoundVolume = 0.7;
const bombSoundVolume = 1.0;
let isMuted = false;

// Ses seviyelerini ayarla
backgroundMusic.volume = backgroundMusicVolume;
spinSound.volume = spinSoundVolume;
winSound.volume = winSoundVolume;
bonusSound.volume = bonusSoundVolume;
safeOpenSound.volume = safeOpenSoundVolume;
bombSound.volume = bombSoundVolume;

// Slot Sembolleri (Görsel yolları güncellendi)
const symbolImages = {
    'resident_para': '../assets/images/resident_para.png',
    'resident_yanginsondurucu': '../assets/images/resident_yanginsondurucu.png', // WILD
    'resident_apolet': '../assets/images/resident_apolet.png',
    'resident_tufek': '../assets/images/resident_tufek.png',
    'resident_madalya': '../assets/images/resident_madalya.png',
    'resident_defter': '../assets/images/resident_defter.png',
    'resident_gazmaskesi': '../assets/images/resident_gazmaskesi.png',
    'resident_tabanca': '../assets/images/resident_tabanca.png',
    'resident_kasa': '../assets/images/resident_kasa.png' // BONUS (Scatter)
};

const weightedSymbols = [
    'resident_tabanca', 'resident_tabanca', 'resident_tabanca', 'resident_tabanca',
    'resident_gazmaskesi', 'resident_gazmaskesi', 'resident_gazmaskesi',
    'resident_defter', 'resident_defter', 'resident_defter',
    'resident_madalya', 'resident_madalya',
    'resident_tufek', 'resident_tufek',
    'resident_apolet',
    'resident_yanginsondurucu',
    'resident_para',
    'resident_kasa'
];

// Ödeme Hatları (5x3 düzen için 9 adet örnek hat - Görseldeki hatlara göre güncelledim!)
// Makaralar 0-14 arası indekslenir:
// 0  1  2  3  4  (Üst sıra)
// 5  6  7  8  9  (Orta sıra)
// 10 11 12 13 14 (Alt sıra)
const paylines = {
    1: [[5, 6, 7, 8, 9]], // Orta düz hat
    3: [
        [5, 6, 7, 8, 9],     // Orta hat
        [0, 1, 2, 3, 4],     // Üst hat
        [10, 11, 12, 13, 14] // Alt hat
    ],
    5: [
        [5, 6, 7, 8, 9],
        [0, 1, 2, 3, 4],
        [10, 11, 12, 13, 14],
        [0, 6, 12, 8, 4],     // Çapraz (sol üstten sağ alta)
        [10, 6, 2, 8, 14]     // Çapraz (sol alttan sağ üste)
    ],
    7: [
        [5, 6, 7, 8, 9],
        [0, 1, 2, 3, 4],
        [10, 11, 12, 13, 14],
        [0, 6, 12, 8, 4],
        [10, 6, 2, 8, 14],
        [0, 1, 7, 3, 4],     // V şeklinde
        [10, 11, 7, 13, 14]  // Ters V şeklinde
    ],
    9: [
        [5, 6, 7, 8, 9],      // 1. Orta düz
        [0, 1, 2, 3, 4],      // 2. Üst düz
        [10, 11, 12, 13, 14], // 3. Alt düz
        [0, 6, 12, 8, 4],     // 4. Çapraz (sol üstten sağ alta)
        [10, 6, 2, 8, 14],    // 5. Çapraz (sol alttan sağ üste)
        [0, 1, 7, 3, 4],      // 6. V şeklinde (üstten merkeze)
        [10, 11, 7, 13, 14],  // 7. Ters V şeklinde (alttan merkeze)
        [0, 6, 7, 8, 14],     // 8. Zigzag (üst-orta-alt)
        [10, 6, 7, 8, 4]      // 9. Zigzag (alt-orta-üst)
    ]
};

// Resident'ın kazanç tablosu (görselden) - Kazançlar Azaltıldı!
const symbolPaytable = {
    'resident_para': { 3: 50, 4: 250, 5: 1000 }, // Önceki 5000 -> 1000
    'resident_yanginsondurucu': { 3: 25, 4: 125, 5: 500 }, // Önceki 2000 -> 500
    'resident_apolet': { 3: 10, 4: 25, 5: 100 }, // Önceki 500 -> 100
    'resident_tufek': { 3: 5, 4: 15, 5: 40 }, // Önceki 200 -> 40
    'resident_madalya': { 3: 3, 4: 8, 5: 25 }, // Önceki 100 -> 25
    'resident_defter': { 3: 2, 4: 5, 5: 15 }, // Önceki 50 -> 15
    'resident_gazmaskesi': { 3: 1, 4: 3, 5: 8 }, // Önceki 20 -> 8
    'resident_tabanca': { 3: 0.5, 4: 1, 5: 3 } // Önceki 10 -> 3
};

const numRows = 3;
const numCols = 5;
const numReels = numRows * numCols;

// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    balanceDisplay.textContent = balance.toFixed(2);
    betAmountDisplay.textContent = betAmount;
    activeLinesCountDisplay.textContent = activeLines;

    // Bahis butonları sadece spin yapmıyorken etkin olmalı
    betMinusButton.disabled = isSpinning || (betAmount <= 10);
    betPlusButton.disabled = isSpinning || (betAmount >= 1000);
    maxBetButton.disabled = isSpinning;
    spinButton.disabled = isSpinning; // Spin sırasında spin butonu da devre dışı

    lineButtons.forEach(btn => {
        if (parseInt(btn.dataset.lines) === activeLines) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (activeUser && users[activeUser]) {
        users[activeUser].balance = balance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }
}

// Reel elementine sembolü yerleştiren ve animasyonu başlatan yardımcı fonksiyon
function setReelSymbol(reelElement, symbolKey, animateDrop = false) {
    const img = document.createElement('img');
    img.src = symbolImages[symbolKey];
    img.alt = symbolKey;
    reelElement.innerHTML = '';

    if (animateDrop) {
        img.style.transform = 'translateY(-100%)';
        img.style.opacity = '0';
        reelElement.appendChild(img);
        setTimeout(() => {
            img.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out';
            img.style.transform = 'translateY(0)';
            img.style.opacity = '1';
        }, 10);
    } else {
        reelElement.appendChild(img);
    }
}

// Rastgele Sembol Alma Fonksiyonu
function getRandomSymbolKey() {
    return weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
}

// Makaraları Döndürme Fonksiyonu
function spinReels() {
    if (isSpinning) {
        return;
    }

    if (balance < betAmount * activeLines) {
        messageDisplay.textContent = 'Bakiyen Yetersiz! Bahsi veya Hat Sayısını Azalt.';
        messageDisplay.style.color = '#F44336';
        return;
    }

    winAmountDisplay.textContent = '';
    messageDisplay.textContent = 'Dönüyor...';
    messageDisplay.style.color = '#FF4500';
    
    clearTimeout(highlightTimeout);
    removeHighlight();
    removeWinLines();

    reels.forEach((reel, index) => {
        setReelSymbol(reel, getRandomSymbolKey(), false);
        reel.classList.remove('highlight');
    });

    balance -= betAmount * activeLines;
    updateUI();

    spinButton.disabled = true;
    isSpinning = true;

    if (!isMuted) {
        spinSound.currentTime = 0;
        spinSound.play();
    }

    let currentSymbols = new Array(numReels);
    let spinningIntervals = [];
    let stopTimeouts = []; 
    let stoppedReelsCount = 0;

    reels.forEach((reel, index) => {
        const spinDuration = 1000 + (index * 150);
        const spinInterval = 50;

        spinningIntervals[index] = setInterval(() => {
            setReelSymbol(reel, getRandomSymbolKey(), false);
        }, spinInterval);

        stopTimeouts[index] = setTimeout(() => {
            clearInterval(spinningIntervals[index]);
            
            const finalSymbolKey = getRandomSymbolKey();
            currentSymbols[index] = finalSymbolKey;
            lastSpinSymbols[index] = finalSymbolKey; 
            
            setReelSymbol(reel, finalSymbolKey, true);

            stoppedReelsCount++;

            if (stoppedReelsCount === numReels) {
                spinSound.pause();
                spinSound.currentTime = 0;
                setTimeout(() => {
                    checkWin(currentSymbols);
                    spinButton.disabled = false;
                    isSpinning = false;
                }, 400);
            }
        }, spinDuration);
    });
}

// --------------------------------------------------------
// KAZANÇ KONTROLÜ VE BONUS OYUNU LOGİĞİ
// --------------------------------------------------------
function checkWin(resultSymbols) {
    let totalWin = 0;
    let winningReelIndexes = new Set();
    let winningLinesInfo = [];

    let bonusSymbolCount = 0;
    let bonusSymbolReelIndexes = [];

    resultSymbols.forEach((symbol, index) => {
        if (symbol === 'resident_kasa') {
            bonusSymbolCount++;
            bonusSymbolReelIndexes.push(index);
        }
    });

    const currentActivePaylines = paylines[activeLines];

    currentActivePaylines.forEach((line, lineIndex) => {
        let consecutiveCount = 1;
        let matchedSymbol = resultSymbols[line[0]];
        let currentLineWinningIndexes = [line[0]];

        if (!matchedSymbol || matchedSymbol === 'resident_kasa') return; 

        let effectiveMatchedSymbol = matchedSymbol;
        if (matchedSymbol === 'resident_yanginsondurucu') {
            if (line.length > 1 && resultSymbols[line[1]] && resultSymbols[line[1]] !== 'resident_kasa') {
                effectiveMatchedSymbol = resultSymbols[line[1]];
                if (effectiveMatchedSymbol === 'resident_yanginsondurucu' && line.length > 2 && resultSymbols[line[2]] === 'resident_yanginsondurucu') {
                    effectiveMatchedSymbol = 'resident_yanginsondurucu';
                    consecutiveCount = 3;
                    currentLineWinningIndexes.push(line[1], line[2]);
                } else if (effectiveMatchedSymbol === 'resident_yanginsondurucu') {
                    // Wild tek başına ilk sembolse ve devamında eşleşme yoksa kazanç sağlamaz
                    return;
                } else {
                    consecutiveCount++;
                    currentLineWinningIndexes.push(line[1]);
                }
            } else {
                return; // Wild ilk sembolse ve devamında başka sembol yoksa/kasa varsa kazanç yok
            }
        }

        for (let i = (matchedSymbol === 'resident_yanginsondurucu' && consecutiveCount === 2) ? 2 : 1; i < line.length; i++) {
            const currentSymbol = resultSymbols[line[i]];

            if (currentSymbol === effectiveMatchedSymbol || currentSymbol === 'resident_yanginsondurucu') {
                consecutiveCount++;
                currentLineWinningIndexes.push(line[i]);
            } else {
                break;
            }
        }

        if (consecutiveCount >= 3) {
            let actualWinningSymbol = effectiveMatchedSymbol;
            if (effectiveMatchedSymbol === 'resident_yanginsondurucu') {
                actualWinningSymbol = 'resident_yanginsondurucu';
            }

            const payoutInfo = symbolPaytable[actualWinningSymbol];
            if (payoutInfo && payoutInfo[consecutiveCount]) {
                const multiplier = payoutInfo[consecutiveCount];
                const win = betAmount * multiplier; // Kazanç, bahis miktarı ile çarpılır
                totalWin += win;
                winningLinesInfo.push({
                    line: line,
                    symbol: actualWinningSymbol,
                    count: consecutiveCount,
                    winAmount: win,
                    indexes: currentLineWinningIndexes
                });
                currentLineWinningIndexes.forEach(idx => winningReelIndexes.add(idx));
            }
        }
    });

    // Bonus Oyun Tetikleme
    if (bonusSymbolCount >= 3) {
        messageDisplay.textContent = `BONUS! Kasaları Aç!`;
        messageDisplay.style.color = '#FFD700';
        if (!isMuted) {
            winSound.pause();
            bonusSound.currentTime = 0;
            bonusSound.play();
        }
        highlightWinningReels(bonusSymbolReelIndexes);
        setTimeout(() => {
            startBonusGame();
        }, 1500);
        updateUI();
        return;
    }

    // Normal Kazanç Duyurusu
    if (totalWin > 0) {
        balance += totalWin;
        messageDisplay.textContent = `TEBRİKLER! KAZANDIN! 🎉`;
        messageDisplay.style.color = '#32CD32';
        winAmountDisplay.textContent = `Bakiyene ${totalWin.toFixed(2)} TL Eklendi! Toplam: ${balance.toFixed(2)} TL`;
        if (!isMuted) {
            winSound.currentTime = 0;
            winSound.play();
        }
        highlightWinningReels(Array.from(winningReelIndexes));
        drawWinLines(winningLinesInfo);
    } else {
        messageDisplay.textContent = 'Tekrar Dene! Şansını Bir Sonraki Çevirmede Yakala. 🍀';
        messageDisplay.style.color = '#F44336';
        winAmountDisplay.textContent = '';
    }
    updateUI();
}

// Kazanan makaraları vurgulama
function highlightWinningReels(winningReelIndexes) {
    if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        removeHighlight();
    }

    winningReelIndexes.forEach(index => {
        reels[index].classList.add('highlight');
    });

    highlightTimeout = setTimeout(() => {
        removeHighlight();
    }, 2000);
}

function removeHighlight() {
    reels.forEach(reel => {
        reel.classList.remove('highlight');
    });
}

// Kazanan çizgileri çizen fonksiyon (mevcut mantıkla)
function drawWinLines(linesInfo) {
    removeWinLines();

    const reelsGrid = document.querySelector('.reels-grid');
    if (!reelsGrid) return; // Grid elementi yoksa çık

    const reelsGridRect = reelsGrid.getBoundingClientRect();
    const reelRects = Array.from(reels).map(reel => reel.getBoundingClientRect());

    linesInfo.forEach(info => {
        const lineIndexes = info.indexes;

        if (lineIndexes.length < 2) return;

        // Başlangıç ve bitiş reel'i belirlerken, kazanan hattın ilk ve son reel'ini kullanıyoruz
        const startReelRect = reelRects[lineIndexes[0]];
        const endReelRect = reelRects[lineIndexes[lineIndexes.length - 1]];

        // Çizginin başlangıç ve bitiş noktalarını belirle
        // Reel merkezlerini alıyoruz ve reelsGrid'e göre konumlandırıyoruz
        const startX = (startReelRect.left + startReelRect.width / 2) - reelsGridRect.left;
        const startY = (startReelRect.top + startReelRect.height / 2) - reelsGridRect.top;

        const endX = (endReelRect.left + endReelRect.width / 2) - reelsGridRect.left;
        const endY = (endReelRect.top + endReelRect.height / 2) - reelsGridRect.top;

        const lineDiv = document.createElement('div');
        lineDiv.classList.add('win-line');

        // Çizginin uzunluğu ve açısı
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

        lineDiv.style.width = `${length}px`;
        lineDiv.style.transform = `rotate(${angle}deg)`;
        lineDiv.style.left = `${startX}px`; // Başlangıç noktası soldan
        lineDiv.style.top = `${startY}px`; // Başlangıç noktası yukarıdan
        lineDiv.style.transformOrigin = '0 0'; // Dönüşüm başlangıç noktası sol üst köşe

        winLinesContainer.appendChild(lineDiv);

        setTimeout(() => {
            lineDiv.remove();
        }, 3000); // Çizgiyi 3 saniye sonra kaldır
    });
}

// Kazanan çizgileri kaldıran fonksiyon
function removeWinLines() {
    winLinesContainer.innerHTML = '';
}

// Paytable bilgisini popup menüye doldur
function populatePaytableInfo() {
    paytableInfoDisplay.innerHTML = '';

    const orderedSymbols = [
        'resident_para', 'resident_yanginsondurucu', 'resident_apolet', 'resident_tufek',
        'resident_madalya', 'resident_defter', 'resident_gazmaskesi', 'resident_tabanca'
    ];

    orderedSymbols.forEach(symbolKey => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('paytable-item');

        const img = document.createElement('img');
        img.src = symbolImages[symbolKey]; // Resim yolu güncellendi
        img.alt = symbolKey;
        itemDiv.appendChild(img);

        const title = document.createElement('h4');
        let displayTitle = '';
        if (symbolKey === 'resident_para') displayTitle = 'PARA';
        else if (symbolKey === 'resident_yanginsondurucu') displayTitle = 'WILD';
        else if (symbolKey === 'resident_apolet') displayTitle = 'APOLET';
        else if (symbolKey === 'resident_tufek') displayTitle = 'TÜFEK';
        else if (symbolKey === 'resident_madalya') displayTitle = 'MADALYA';
        else if (symbolKey === 'resident_defter') displayTitle = 'DEFTER';
        else if (symbolKey === 'resident_gazmaskesi') displayTitle = 'GAZ MASKESİ';
        else if (symbolKey === 'resident_tabanca') displayTitle = 'TABANCA';

        title.textContent = displayTitle;
        itemDiv.appendChild(title);

        const ul = document.createElement('ul');
        const symbolPayouts = symbolPaytable[symbolKey];
        if (symbolPayouts) {
            for (const count in symbolPayouts) {
                if (symbolPayouts.hasOwnProperty(count)) {
                    const li = document.createElement('li');
                    li.textContent = `${count}x: ${symbolPayouts[count]} Kat`;
                    ul.appendChild(li);
                }
            }
        }
        ul.style.marginTop = '10px'; // Paytable öğeleri arasına boşluk ekle
        itemDiv.appendChild(ul);
        paytableInfoDisplay.appendChild(itemDiv);
    });
}

// Ses açma/kapama fonksiyonu
function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        backgroundMusic.pause();
        muteButton.textContent = '🔊'; // Ses kapalı iken hoparlör kapalı ikonu
    } else {
        backgroundMusic.play().catch(e => {
            console.log("Müzik yeniden başlatılamadı:", e);
        });
        muteButton.textContent = '🔇'; // Ses açık iken hoparlör açık ikonu
    }
}

// Bahis azaltma/artırma
betMinusButton.addEventListener('click', () => {
    if (betAmount > 10 && !isSpinning) { // Spin yapmıyorken kontrolü
        betAmount -= 10;
        updateUI();
    }
});

betPlusButton.addEventListener('click', () => {
    if (betAmount < 1000 && !isSpinning) { // Spin yapmıyorken kontrolü
        betAmount += 10;
        updateUI();
    }
});

// Maks. Bahis butonu
maxBetButton.addEventListener('click', () => {
    if (!isSpinning) { // Spin yapmıyorken kontrolü
        betAmount = 1000;
        activeLines = 9;
        updateUI();
    }
});

// Otomatik Oynat butonu
autoPlayButton.addEventListener('click', () => {
    if (!isSpinning) { // Spin yapmıyorken kontrolü
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            autoPlayButton.textContent = 'OTOMATİK OYNA';
            messageDisplay.textContent = 'Otomatik Oynatma Durduruldu.';
            messageDisplay.style.color = '#ADD8E6';
        } else {
            spinReels(); 
            autoPlayInterval = setInterval(() => {
                // Her otomatik çevirme öncesi bakiye ve spin durumu kontrolü
                if (balance < betAmount * activeLines || isSpinning) {
                    clearInterval(autoPlayInterval);
                    autoPlayInterval = null;
                    autoPlayButton.textContent = 'OTOMATİK OYNA';
                    messageDisplay.textContent = 'Otomatik Oynatma: Bakiye Yetersiz!';
                    messageDisplay.style.color = '#F44336';
                    return;
                }
                spinReels();
            }, 3000); // Her 3 saniyede bir otomatik spin
            autoPlayButton.textContent = 'DURDUR';
            messageDisplay.textContent = 'Otomatik Oynatma Başladı!';
            messageDisplay.style.color = '#ADD8E6';
        }
    }
});

// Bilgi butonu olay dinleyicileri
infoButton.addEventListener('click', () => {
    populatePaytableInfo();
    infoPopup.style.display = 'flex';
});

closeInfoPopupBtn.addEventListener('click', () => {
    infoPopup.style.display = 'none';
});

// Popup dışına tıklayınca kapatma (bonus oyununda kapatmayı engelledik)
window.addEventListener('click', (event) => {
    if (event.target === infoPopup) {
        infoPopup.style.display = 'none';
    }
    // Bonus oyunu popup'ı dışına tıklama ile kapatmayı engelle
    if (event.target === bonusGamePopup) {
        event.stopPropagation(); // Olayın daha fazla yayılmasını durdur
    }
});

muteButton.addEventListener('click', toggleMute);

backToLobbyButton.addEventListener('click', () => {
    window.location.href = '../lobby.html'; // Lobiye dönüş yolu
});

// Ödeme Hattı Butonları Olay Dinleyicileri
lineButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (!isSpinning) { // Spin yapmıyorken kontrolü
            activeLines = parseInt(button.dataset.lines);
            updateUI();
        }
    });
});

// --------------------------------------------------------
// BONUS OYUNU LOGİĞİ
// --------------------------------------------------------
function startBonusGame() {
    currentBonusWin = 0;
    safesContainer.innerHTML = '';
    bombSafeIndex = Math.floor(Math.random() * totalBonusSafes); // Bomba kasası rastgele belirlenir

    for (let i = 0; i < totalBonusSafes; i++) {
        const safeDiv = document.createElement('div');
        safeDiv.classList.add('safe-item');
        safeDiv.dataset.index = i;
        safeDiv.innerHTML = `<img src="${symbolImages['resident_kasa']}" alt="Kasa ${i + 1}">`; // Kasa sembolü yolu güncellendi

        safeDiv.addEventListener('click', handleSafeClick);
        safesContainer.appendChild(safeDiv);
    }

    bonusGameMessage.textContent = 'Kasaları açarak ödülleri topla!';
    currentBonusWinDisplay.textContent = '0.00';
    bonusGamePopup.style.display = 'flex'; // Bonus oyun pop-up'ını göster
    removeWinLines();
    removeHighlight();
}

function handleSafeClick(event) {
    const clickedSafe = event.currentTarget;
    const safeIndex = parseInt(clickedSafe.dataset.index);

    // Zaten açılmış veya bomba olan kasaya tekrar tıklamayı engelle
    if (clickedSafe.classList.contains('opened') || clickedSafe.classList.contains('bomb')) {
        return;
    }

    clickedSafe.classList.add('opened'); // Kasayı açıldı olarak işaretle
    clickedSafe.removeEventListener('click', handleSafeClick); // Tekrar tıklamayı engelle

    if (safeIndex === bombSafeIndex) {
        // Bomba çıktıysa
        if (!isMuted) {
            safeOpenSound.pause(); // Kasa açılma sesini durdur
            safeOpenSound.currentTime = 0;
            bombSound.currentTime = 0;
            bombSound.play(); // Bomba sesini çal
        }
        clickedSafe.classList.add('bomb'); // Bomba sınıfını ekle
        clickedSafe.innerHTML = '<p>BOMBA!</p>'; // Bomba yazısını göster
        bonusGameMessage.textContent = 'BOMBA! Oyun bitti. 💥';

        // Açılmamış diğer kasaları da göster (kazançları ekle)
        safesContainer.querySelectorAll('.safe-item').forEach((safe, index) => {
            if (!safe.classList.contains('opened')) {
                safe.classList.add('opened');
                safe.removeEventListener('click', handleSafeClick);
                if (!isMuted && index !== bombSafeIndex) {
                    safeOpenSound.currentTime = 0;
                    safeOpenSound.play();
                }
                if (index !== bombSafeIndex) {
                    const winAmount = (Math.random() * 20 + 5) * (betAmount / 10); // Bonus kazançları daha da azaltıldı
                    currentBonusWin += winAmount;
                    safe.innerHTML = `<p>${winAmount.toFixed(2)} TL</p>`;
                    safe.classList.add('won');
                }
            }
        });

        // Belirli bir süre sonra bonus oyun pop-up'ını kapat ve ana bakiyeyi güncelle
        setTimeout(() => {
            bonusGamePopup.style.display = 'none';
            balance += currentBonusWin;
            updateUI();
            messageDisplay.textContent = `Bonus Oyunundan ${currentBonusWin.toFixed(2)} TL Kazandın!`;
            messageDisplay.style.color = '#32CD32';
            currentBonusWin = 0; // Bonus kazancını sıfırla
        }, 2000);
    } else {
        // Kasa başarılı bir şekilde açıldıysa
        if (!isMuted) {
            safeOpenSound.currentTime = 0;
            safeOpenSound.play(); // Kasa açılma sesini çal
        }
        const winAmount = (Math.random() * 20 + 5) * (betAmount / 10); // Bonus kazançları daha da azaltıldı
        currentBonusWin += winAmount;
        currentBonusWinDisplay.textContent = currentBonusWin.toFixed(2); // Mevcut bonus kazancını güncelle
        clickedSafe.classList.add('won'); // Kasa kazandı olarak işaretle
        clickedSafe.innerHTML = `<p>${winAmount.toFixed(2)} TL</p>`; // Kazanç miktarını göster

        // Tüm kasalar açıldı mı kontrol et (bomba hariç)
        const openedSafes = safesContainer.querySelectorAll('.safe-item.opened:not(.bomb)').length;
        if (openedSafes === (totalBonusSafes - 1)) { // Bomba kasası hariç tüm kasalar açıldıysa
            bonusGameMessage.textContent = 'Tüm kasaları açtın! Süper!';
            setTimeout(() => {
                bonusGamePopup.style.display = 'none';
                balance += currentBonusWin;
                updateUI();
                messageDisplay.textContent = `Bonus Oyunundan ${currentBonusWin.toFixed(2)} TL Kazandın!`;
                messageDisplay.style.color = '#32CD32';
                currentBonusWin = 0;
            }, 1500);
        }
    }
}


// --- Sayfa Yüklendiğinde Başlangıç İşlemleri ---
document.addEventListener('DOMContentLoaded', () => {
    spinButton.addEventListener('click', spinReels);

    // Başlangıç sembollerini rastgele ata
    reels.forEach((reel, index) => {
        const initialSymbol = getRandomSymbolKey();
        setReelSymbol(reel, initialSymbol, false); 
        lastSpinSymbols[index] = initialSymbol;
    });

    updateUI(); // UI'ı başlangıçta güncelle

    // Arkaplan müziğini oynatmayı dene (tarayıcı kısıtlamaları olabilir)
    backgroundMusic.play().catch(e => {
        console.warn("Arkaplan müziği otomatik oynatılamadı (tarayıcı kısıtlaması):", e);
    });
});
