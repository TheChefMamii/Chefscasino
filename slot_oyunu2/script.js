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

// User/Balance Management
let activeUser = localStorage.getItem('hansellCasinoActiveUser');
let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = '../index.html';
}

// Initialize
let balance = typeof users[activeUser].balance === "number" ? users[activeUser].balance : 1000;
let currentBet = 10;
let isSpinning = false;
let freeSpins = 0;
let lastWin = 0;

// Sound Setup
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

// UI Update
function updateUI() {
    balanceSpan.textContent = balance.toFixed(2);
    currentBalanceSpan.textContent = balance.toFixed(2);
    currentBetSpan.textContent = currentBet.toFixed(2);
    lastWinSpan.textContent = lastWin.toFixed(2);
    freeSpinsCountDisplay.textContent = freeSpins;
}

// Save User Data
function saveUserData() {
    users[activeUser].balance = balance;
    localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
}

// Bet Controls
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

// Music Controls
musicToggleButton.addEventListener('click', () => {
    isMuted = !isMuted;
    backgroundMusic.muted = isMuted;
    musicToggleButton.textContent = isMuted ? 'Müziği Aç' : 'Müziği Kapat';
});
musicVolumeControl.addEventListener('input', (e) => {
    backgroundMusic.volume = e.target.value;
});

// Slot Reel Logic (DEMO)
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

    // Fake slot animation/result
    setTimeout(() => {
        let outcome = Math.random();
        if (outcome < 0.2) {
            lastWin = currentBet * 5;
            balance += lastWin;
            winSound.play();
        } else if (outcome < 0.25) {
            freeSpins += 3;
            lastWin = 0;
            bonusSound.play();
            alert('Tebrikler! 3 bedava spin kazandınız!');
        } else {
            lastWin = 0;
            loseSound.play();
        }
        isSpinning = false;
        updateUI();
        saveUserData();
    }, 1200);
}

// Spin Button
spinButton.addEventListener('click', spinReels);

// Lobby Button
backToLobbyButton.addEventListener('click', () => {
    window.location.href = '../index.html';
});

// On Load
window.addEventListener('DOMContentLoaded', () => {
    updateUI();
    backgroundMusic.play().catch(() => {
        backgroundMusic.muted = true;
    });
});
