// Semboller (assets/images klasörüne koyman gereken görseller)
const symbols = [
    { id: 'zeus', img: 'assets/images/symbol_zeus.png', value: 100 },
    { id: 'pegasus', img: 'assets/images/symbol_pegasus.png', value: 80 },
    { id: 'eagle', img: 'assets/images/symbol_eagle.png', value: 60 },
    { id: 'helmet', img: 'assets/images/symbol_helmet.png', value: 40 },
    { id: 'vase', img: 'assets/images/symbol_vase.png', value: 30 },
    { id: 'coin', img: 'assets/images/symbol_coin.png', value: 20 },
    { id: 'thunder', img: 'assets/images/symbol_thunder.png', value: 15 }, // Wild veya Scatter olabilir
    { id: 'cardA', img: 'assets/images/symbol_card_a.png', value: 10 },
    { id: 'cardK', img: 'assets/images/symbol_card_k.png', value: 8 },
    { id: 'cardQ', img: 'assets/images/symbol_card_q.png', value: 6 },
    { id: 'cardJ', img: 'assets/images/symbol_card_j.png', value: 4 },
    { id: 'bonus_fs', img: 'assets/images/bonus_symbol.png' }, // Free Spin tetikleyen bonus sembolü
    { id: 'bonus_3x', img: 'assets/images/bonus_3x.png', multiplier: 3 }, // Çarpan bonus sembolleri
    { id: 'bonus_5x', img: 'assets/images/bonus_5x.png', multiplier: 5 },
    { id: 'bonus_10x', img: 'assets/images/bonus_10x.png', multiplier: 10 },
    { id: 'bonus_20x', img: 'assets/images/bonus_20x.png', multiplier: 20 },
    { id: 'bonus_50x', img: 'assets/images/bonus_50x.png', multiplier: 50 },
    { id: 'bonus_100x', img: 'assets/images/bonus_100x.png', multiplier: 100 },
    { id: 'bonus_1000x', img: 'assets/images/bonus_1000x.png', multiplier: 1000 }
];

// Sembollerin nadirlik ağırlıkları
const weightedSymbols = [
    'zeus', 'zeus',
    'pegasus', 'pegasus', 'pegasus',
    'eagle', 'eagle', 'eagle', 'eagle',
    'helmet', 'helmet', 'helmet', 'helmet',
    'vase', 'vase', 'vase', 'vase', 'vase',
    'coin', 'coin', 'coin', 'coin', 'coin',
    'thunder', 'thunder', 'thunder', 'thunder', 'thunder', 'thunder',
    'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA',
    'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK',
    'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ',
    'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ',
    'bonus_fs', 'bonus_fs',
    'bonus_3x', 'bonus_5x', 'bonus_10x', 'bonus_20x',
    'bonus_50x', 'bonus_100x',
    'bonus_1000x'
];

// Yardımcı fonksiyonlar
function getSymbolById(id) {
    return symbols.find(s => s.id === id);
}
function getRandomWeightedSymbolId() {
    const idx = Math.floor(Math.random() * weightedSymbols.length);
    return weightedSymbols[idx];
}
function getRandomSymbolMatrix(reelCount = 4, symbolsPerReel = 6) {
    const matrix = [];
    for (let r = 0; r < reelCount; r++) {
        matrix[r] = [];
        for (let s = 0; s < symbolsPerReel; s++) {
            const symbolId = getRandomWeightedSymbolId();
            const symbol = getSymbolById(symbolId);
            matrix[r][s] = symbol;
        }
    }
    return matrix;
}
function showReels(symbolMatrix) {
    for (let r = 0; r < reels.length; r++) {
        reels[r].innerHTML = '';
        for (let s = 0; s < symbolMatrix[r].length; s++) {
            const symbol = symbolMatrix[r][s];
            const img = document.createElement('img');
            img.src = symbol.img;
            img.alt = symbol.id;
            img.title = symbol.id.replace('bonus_', 'Bonus ').replace('card', 'Karte ');
            reels[r].appendChild(img);
        }
    }
}

// DOM Elements
const spinButton = document.getElementById('spinButton');
const balanceSpan = document.getElementById('balance');
const currentBalanceSpan = document.getElementById('currentBalance');
const currentBetSpan = document.getElementById('currentBet');
const betMinusButton = document.getElementById('betMinus');
const betPlusButton = document.getElementById('betPlus');
const lastWinSpan = document.getElementById('lastWin');
const reels = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3'),
    document.getElementById('reel4')
];
const musicToggleButton = document.getElementById('musicToggleButton');
const musicVolumeControl = document.getElementById('musicVolume');
const freeSpinsCountDisplay = document.getElementById('freeSpinsCount');
const backToLobbyButton = document.getElementById('backToLobbyButton');

// Kullanıcı yönetimi
let activeUser = localStorage.getItem('hansellCasinoActiveUser');
let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};
if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = '../index.html';
}
// Başlangıç değerleri
let balance = typeof users[activeUser].balance === "number" ? users[activeUser].balance : 1000;
let currentBet = 10;
let isSpinning = false;
let freeSpins = 0;
let lastWin = 0;

// Sesler
function createSound(src, volume) {
    const audio = new Audio(src);
    audio.volume = volume;
    return audio;
}
let backgroundMusic = createSound('assets/sounds/background_music.mp3', 0.2);
let spinSound = createSound('assets/sounds/spin_sound.mp3', 0.6);
let winSound = createSound('assets/sounds/win_sound.mp3', 0.8);
let loseSound = createSound('assets/sounds/lose_sound.mp3', 0.7);
let bonusSound = createSound('assets/sounds/bonus_sound.mp3', 0.9);

backgroundMusic.loop = true;
musicVolumeControl.value = 0.2;
let isMuted = false;

// UI Güncelleme
function updateUI() {
    balanceSpan.textContent = balance.toFixed(2);
    currentBalanceSpan.textContent = balance.toFixed(2);
    currentBetSpan.textContent = currentBet.toFixed(2);
    lastWinSpan.textContent = lastWin.toFixed(2);
    freeSpinsCountDisplay.textContent = freeSpins;
}
// Kullanıcı verisini kaydet
function saveUserData() {
    users[activeUser].balance = balance;
    localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
}
// Bahis kontrolleri
betMinusButton.addEventListener('click', () => {
    if (currentBet > 10) {
        currentBet -= 10;
        updateUI();
    }
});
betPlusButton.addEventListener('click', () => {
    if (currentBet + 10 <= balance) {
        currentBet += 10;
        updateUI();
    }
});
// Müzik kontrolleri
musicToggleButton.addEventListener('click', () => {
    isMuted = !isMuted;
    backgroundMusic.muted = isMuted;
    musicToggleButton.textContent = isMuted ? 'Müziği Aç' : 'Müziği Kapat';
});
musicVolumeControl.addEventListener('input', (e) => {
    backgroundMusic.volume = e.target.value;
});

// Slot Mekaniği ve Kazanç Hesabı
function spinReels() {
    if (isSpinning) return;
    if (balance < currentBet && freeSpins <= 0) {
        alert('Bakiyeniz yetersiz!');
        return;
    }
    isSpinning = true;
    spinSound.play();
    if (freeSpins > 0) {
        freeSpins--;
    } else {
        balance -= currentBet;
    }
    updateUI();

    // Sembolleri makaralara yerleştir
    const symbolMatrix = getRandomSymbolMatrix();
    showReels(symbolMatrix);

    setTimeout(() => {
        // Kazanç hesabı (örnek: 4 aynı sembol gelirse kazanç, bonuslar ayrı işlenir)
        let mainLineSymbols = symbolMatrix.map(reel => reel[2]); // 3. satır ana hat gibi
        let sameSymbol = mainLineSymbols.every(s => s.id === mainLineSymbols[0].id);
        lastWin = 0;
        if (sameSymbol && mainLineSymbols[0].value) {
            lastWin = mainLineSymbols[0].value * (mainLineSymbols[0].multiplier || 1);
            balance += lastWin;
            winSound.play();
        }
        // Free spin veya bonus kontrolü (örnek: en az 2 bonus_fs varsa bedava spin)
        let bonusFSCount = mainLineSymbols.filter(s => s.id === 'bonus_fs').length;
        if (bonusFSCount >= 2) {
            freeSpins += 5;
            bonusSound.play();
            alert('Tebrikler! 5 bedava spin kazandınız!');
        }
        // Çarpan bonusu
        let multiplierSymbol = mainLineSymbols.find(s => s.multiplier);
        if (multiplierSymbol) {
            let ekKazanc = currentBet * multiplierSymbol.multiplier;
            lastWin += ekKazanc;
            balance += ekKazanc;
            bonusSound.play();
        }
        if (lastWin === 0) loseSound.play();
        isSpinning = false;
        updateUI();
        saveUserData();
    }, 1200);
}

// Spin Butonu
spinButton.addEventListener('click', spinReels);
// Lobi Butonu
backToLobbyButton.addEventListener('click', () => {
    window.location.href = '../index.html';
});
// Sayfa yüklenince
window.addEventListener('DOMContentLoaded', () => {
    updateUI();
    showReels(getRandomSymbolMatrix());
    backgroundMusic.play().catch(() => {
        backgroundMusic.muted = true;
    });
});
