// DOM Elementlerini Seç
const reels = document.querySelectorAll('.reel');
const spinButton = document.getElementById('spinButton');
const messageDisplay = document.getElementById('message');
const balanceDisplay = document.getElementById('balanceDisplay');
const betAmountDisplay = document.getElementById('betAmountDisplay');
const winAmountDisplay = document.getElementById('winAmount');

const betMinusButton = document.getElementById('betMinusButton');
const betPlusButton = document.getElementById('betPlusButton');
const maxBetButton = document.getElementById('maxBetButton');
const autoPlayButton = document.getElementById('autoPlayButton');
const infoButton = document.getElementById('infoButton');
const infoPopup = document.getElementById('infoPopup');
const closeInfoPopupBtn = document.getElementById('closeInfoPopup');
const paytableInfoDisplay = document.getElementById('paytableInfo');
const muteButton = document.getElementById('muteButton');
const backToLobbyButton = document.getElementById('backToLobbyButton');

const lineButtons = document.querySelectorAll('.line-btn');
const bonusGamePopup = document.getElementById('bonusGamePopup');
const safesContainer = document.querySelector('.safes-container');
const bonusGameMessage = document.getElementById('bonusGameMessage');
const currentBonusWinDisplay = document.getElementById('currentBonusWin');

const reelsWrapper = document.querySelector('.reels-wrapper');
const winLinesContainer = document.querySelector('.win-lines-container');

// Ses Elementleri
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
    window.location.href = '../lobby.html';
}

let balance = users[activeUser].balance || 1000; // Varsayılan başlangıç bakiyesi
let betAmount = 10;
let isSpinning = false;
let highlightTimeout;
let lastSpinSymbols = [];
let activeLines = 9;
let currentBonusWin = 0;
let totalBonusSafes = 5;
let bombSafeIndex = -1;
let autoPlayInterval = null;
let autoPlayCount = 0; // Otomatik oynatma sayacı
let autoPlayLimit = 0; // Otomatik oynatma limiti

const backgroundMusicVolume = 0.2;
const spinSoundVolume = 0.6;
const winSoundVolume = 0.8;
const bonusSoundVolume = 0.9;
const safeOpenSoundVolume = 0.7;
const bombSoundVolume = 1.0;
let isMuted = false;

backgroundMusic.volume = backgroundMusicVolume;
spinSound.volume = spinSoundVolume;
winSound.volume = winSoundVolume;
bonusSound.volume = bonusSoundVolume;
safeOpenSound.volume = safeOpenSoundVolume;
bombSound.volume = bombSoundVolume;

const symbolImages = {
    'resident_para': '../assets/images/resident_para.png',
    'resident_yanginsondurucu': '../assets/images/resident_yanginsondurucu.png',
    'resident_apolet': '../assets/images/resident_apolet.png',
    'resident_tufek': '../assets/images/resident_tufek.png',
    'resident_madalya': '../assets/images/resident_madalya.png',
    'resident_defter': '../assets/images/resident_defter.png',
    'resident_gazmaskesi': '../assets/images/resident_gazmaskesi.png',
    'resident_tabanca': '../assets/images/resident_tabanca.png',
    'resident_kasa': '../assets/images/resident_kasa.png'
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

const paylines = {
    1: [[5, 6, 7, 8, 9]],
    3: [[5, 6, 7, 8, 9], [0, 1, 2, 3, 4], [10, 11, 12, 13, 14]],
    5: [[5, 6, 7, 8, 9], [0, 1, 2, 3, 4], [10, 11, 12, 13, 14], [0, 6, 12, 8, 4], [10, 6, 2, 8, 14]],
    7: [[5, 6, 7, 8, 9], [0, 1, 2, 3, 4], [10, 11, 12, 13, 14], [0, 6, 12, 8, 4], [10, 6, 2, 8, 14], [0, 1, 7, 3, 4], [10, 11, 7, 13, 14]],
    9: [[5, 6, 7, 8, 9], [0, 1, 2, 3, 4], [10, 11, 12, 13, 14], [0, 6, 12, 8, 4], [10, 6, 2, 8, 14], [0, 1, 7, 3, 4], [10, 11, 7, 13, 14], [0, 6, 7, 8, 14], [10, 6, 7, 8, 4]]
};

const symbolPaytable = {
    'resident_para': { 3: 50, 4: 250, 5: 1000 },
    'resident_yanginsondurucu': { 3: 25, 4: 125, 5: 500 },
    'resident_apolet': { 3: 10, 4: 25, 5: 100 },
    'resident_tufek': { 3: 5, 4: 15, 5: 40 },
    'resident_madalya': { 3: 3, 4: 8, 5: 25 },
    'resident_defter': { 3: 2, 4: 5, 5: 15 },
    'resident_gazmaskesi': { 3: 1, 4: 3, 5: 8 },
    'resident_tabanca': { 3: 0.5, 4: 1, 5: 3 }
};

const numRows = 3;
const numCols = 5;
const numReels = numRows * numCols;

function updateUI() {
    balanceDisplay.textContent = balance.toFixed(2);
    betAmountDisplay.textContent = betAmount.toFixed(2); // Bahis miktarını ondalık olarak güncelle
    betMinusButton.disabled = isSpinning || (betAmount <= 1);
    betPlusButton.disabled = isSpinning;
    maxBetButton.disabled = isSpinning;
    spinButton.disabled = isSpinning;

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

function getRandomSymbolKey() {
    return weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
}

function spinReels() {
    if (isSpinning) return;

    if (balance < betAmount * activeLines) {
        messageDisplay.textContent = 'Bakiyen Yetersiz! Bahsi veya Hat Sayısını Azalt.';
        messageDisplay.style.color = '#ff3333';
        return;
    }

    winAmountDisplay.textContent = '';
    messageDisplay.textContent = 'Dönüyor...';
    messageDisplay.style.color = '#ffd700';
    
    clearTimeout(highlightTimeout);
    removeHighlight();
    removeWinLines();

    reels.forEach((reel) => {
        reel.classList.add('spinning');
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
            reel.classList.remove('spinning');
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

                    // Otomatik oynatma sayacı
                    if (autoPlayInterval && autoPlayLimit > 0) {
                        autoPlayCount++;
                        messageDisplay.textContent = `Otomatik Oynatma: ${autoPlayCount}/${autoPlayLimit} tamamlandı.`;
                        if (autoPlayCount >= autoPlayLimit) {
                            clearInterval(autoPlayInterval);
                            autoPlayInterval = null;
                            autoPlayCount = 0;
                            autoPlayLimit = 0;
                            autoPlayButton.textContent = 'OTOMATİK';
                            messageDisplay.textContent = 'Otomatik Oynatma Tamamlandı!';
                            messageDisplay.style.color = '#add8e6';
                        }
                    }
                }, 400);
            }
        }, spinDuration);
    });
}

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
        // Soldan sağa kontrol
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
                    return;
                } else {
                    consecutiveCount++;
                    currentLineWinningIndexes.push(line[1]);
                }
            } else {
                return;
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
                const win = betAmount * multiplier;
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

        // Sağdan sola kontrol
        consecutiveCount = 1;
        matchedSymbol = resultSymbols[line[line.length - 1]];
        currentLineWinningIndexes = [line[line.length - 1]];

        if (!matchedSymbol || matchedSymbol === 'resident_kasa') return;

        effectiveMatchedSymbol = matchedSymbol;
        if (matchedSymbol === 'resident_yanginsondurucu') {
            if (line.length > 1 && resultSymbols[line[line.length - 2]] && resultSymbols[line[line.length - 2]] !== 'resident_kasa') {
                effectiveMatchedSymbol = resultSymbols[line[line.length - 2]];
                if (effectiveMatchedSymbol === 'resident_yanginsondurucu' && line.length > 2 && resultSymbols[line[line.length - 3]] === 'resident_yanginsondurucu') {
                    effectiveMatchedSymbol = 'resident_yanginsondurucu';
                    consecutiveCount = 3;
                    currentLineWinningIndexes.unshift(line[line.length - 2], line[line.length - 3]);
                } else if (effectiveMatchedSymbol === 'resident_yanginsondurucu') {
                    return;
                } else {
                    consecutiveCount++;
                    currentLineWinningIndexes.unshift(line[line.length - 2]);
                }
            } else {
                return;
            }
        }

        for (let i = line.length - 2; i >= 0; i--) {
            const currentSymbol = resultSymbols[line[i]];
            if (currentSymbol === effectiveMatchedSymbol || currentSymbol === 'resident_yanginsondurucu') {
                consecutiveCount++;
                currentLineWinningIndexes.unshift(line[i]);
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
                const win = betAmount * multiplier;
                totalWin += win;
                winningLinesInfo.push({
                    line: line.reverse(),
                    symbol: actualWinningSymbol,
                    count: consecutiveCount,
                    winAmount: win,
                    indexes: currentLineWinningIndexes
                });
                currentLineWinningIndexes.forEach(idx => winningReelIndexes.add(idx));
            }
        }
    });

    if (bonusSymbolCount >= 3) {
        messageDisplay.textContent = `BONUS! Kasaları Aç!`;
        messageDisplay.style.color = '#ffd700';
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

    if (totalWin > 0) {
        balance += totalWin;
        messageDisplay.textContent = `TEBRİKLER! KAZANDIN! 🎉`;
        messageDisplay.style.color = '#32cd32';
        winAmountDisplay.textContent = `Bakiyene ${totalWin.toFixed(2)} TL Eklendi!`;
        if (!isMuted) {
            winSound.currentTime = 0;
            winSound.play();
        }
        highlightWinningReels(Array.from(winningReelIndexes));
        drawWinLines(winningLinesInfo);
    } else {
        messageDisplay.textContent = 'Tekrar Dene! Şansını Yakala. 🍀';
        messageDisplay.style.color = '#ff3333';
        winAmountDisplay.textContent = '';
    }
    updateUI();
}

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

function drawWinLines(linesInfo) {
    removeWinLines();

    const reelsGrid = document.querySelector('.reels-grid');
    if (!reelsGrid) return;

    const reelsGridRect = reelsGrid.getBoundingClientRect();
    const reelRects = Array.from(reels).map(reel => reel.getBoundingClientRect());

    linesInfo.forEach(info => {
        const lineIndexes = info.indexes;

        if (lineIndexes.length < 2) return;

        const startReelRect = reelRects[lineIndexes[0]];
        const endReelRect = reelRects[lineIndexes[lineIndexes.length - 1]];

        const startX = (startReelRect.left + startReelRect.width / 2) - reelsGridRect.left;
        const startY = (startReelRect.top + startReelRect.height / 2) - reelsGridRect.top;
        const endX = (endReelRect.left + endReelRect.width / 2) - reelsGridRect.left;
        const endY = (endReelRect.top + endReelRect.height / 2) - reelsGridRect.top;

        const lineDiv = document.createElement('div');
        lineDiv.classList.add('win-line');
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

        lineDiv.style.width = `${length}px`;
        lineDiv.style.transform = `rotate(${angle}deg)`;
        lineDiv.style.left = `${startX}px`;
        lineDiv.style.top = `${startY}px`;
        lineDiv.style.transformOrigin = '0 0';

        winLinesContainer.appendChild(lineDiv);

        setTimeout(() => {
            lineDiv.remove();
        }, 3000);
    });
}

function removeWinLines() {
    winLinesContainer.innerHTML = '';
}

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
        img.src = symbolImages[symbolKey];
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
        ul.style.marginTop = '10px';
        itemDiv.appendChild(ul);
        paytableInfoDisplay.appendChild(itemDiv);
    });
}

function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        backgroundMusic.pause();
        muteButton.textContent = '🔊';
    } else {
        backgroundMusic.play().catch(e => console.log("Müzik yeniden başlatılamadı:", e));
        muteButton.textContent = '🔇';
    }
}

betMinusButton.addEventListener('click', () => {
    if (!isSpinning && betAmount > 1) {
        betAmount -= 1;
        updateUI();
    }
});

betPlusButton.addEventListener('click', () => {
    if (!isSpinning) {
        betAmount += 1;
        updateUI();
    }
});

maxBetButton.addEventListener('click', () => {
    if (!isSpinning) {
        betAmount = Math.floor(balance / activeLines); // Tam sayı olarak maksimum bahis
        if (betAmount < 1) betAmount = 1;
        updateUI();
    }
});

autoPlayButton.addEventListener('click', () => {
    if (!isSpinning) {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            autoPlayCount = 0;
            autoPlayLimit = 0;
            autoPlayButton.textContent = 'OTOMATİK';
            messageDisplay.textContent = 'Otomatik Oynatma Durduruldu.';
            messageDisplay.style.color = '#add8e6';
        } else {
            const spinCount = prompt("Kaç kez otomatik oynatmak istersiniz? (Örn: 10)", 10);
            autoPlayLimit = parseInt(spinCount) || 10; // Varsayılan 10
            if (autoPlayLimit > 0 && balance >= betAmount * activeLines) {
                spinReels();
                autoPlayInterval = setInterval(() => {
                    if (balance < betAmount * activeLines || isSpinning || autoPlayCount >= autoPlayLimit) {
                        clearInterval(autoPlayInterval);
                        autoPlayInterval = null;
                        autoPlayCount = 0;
                        autoPlayLimit = 0;
                        autoPlayButton.textContent = 'OTOMATİK';
                        messageDisplay.textContent = 'Otomatik Oynatma Tamamlandı!';
                        messageDisplay.style.color = '#add8e6';
                        return;
                    }
                    spinReels();
                }, 3000);
                autoPlayButton.textContent = 'DURDUR';
                messageDisplay.textContent = `Otomatik Oynatma Başladı! ${autoPlayCount}/${autoPlayLimit} tamamlandı.`;
                messageDisplay.style.color = '#add8e6';
            } else {
                messageDisplay.textContent = 'Bakiye yetersiz veya geçersiz sayı!';
                messageDisplay.style.color = '#ff3333';
            }
        }
    }
});

infoButton.addEventListener('click', () => {
    populatePaytableInfo();
    infoPopup.style.display = 'flex';
});

closeInfoPopupBtn.addEventListener('click', () => {
    infoPopup.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === infoPopup) {
        infoPopup.style.display = 'none';
    }
    if (event.target === bonusGamePopup) {
        event.stopPropagation();
    }
});

muteButton.addEventListener('click', toggleMute);

backToLobbyButton.addEventListener('click', () => {
    window.location.href = '../lobby.html';
});

lineButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (!isSpinning) {
            activeLines = parseInt(button.dataset.lines);
            updateUI();
        }
    });
});

function startBonusGame() {
    currentBonusWin = 0;
    safesContainer.innerHTML = '';
    bombSafeIndex = Math.floor(Math.random() * totalBonusSafes);

    for (let i = 0; i < totalBonusSafes; i++) {
        const safeDiv = document.createElement('div');
        safeDiv.classList.add('safe-item');
        safeDiv.dataset.index = i;
        safeDiv.innerHTML = `<img src="${symbolImages['resident_kasa']}" alt="Kasa ${i + 1}">`;

        safeDiv.addEventListener('click', handleSafeClick);
        safesContainer.appendChild(safeDiv);
    }

    bonusGameMessage.textContent = 'Kasaları açarak ödülleri topla!';
    currentBonusWinDisplay.textContent = '0.00';
    bonusGamePopup.style.display = 'flex';
    removeWinLines();
    removeHighlight();
}

function handleSafeClick(event) {
    const clickedSafe = event.currentTarget;
    const safeIndex = parseInt(clickedSafe.dataset.index);

    if (clickedSafe.classList.contains('opened') || clickedSafe.classList.contains('bomb')) {
        return;
    }

    clickedSafe.classList.add('opened');
    clickedSafe.removeEventListener('click', handleSafeClick);

    if (safeIndex === bombSafeIndex) {
        if (!isMuted) {
            safeOpenSound.pause();
            safeOpenSound.currentTime = 0;
            bombSound.currentTime = 0;
            bombSound.play();
        }
        clickedSafe.classList.add('bomb');
        clickedSafe.innerHTML = '<p>BOMBA!</p>';
        bonusGameMessage.textContent = 'BOMBA! Oyun bitti. 💥';

        safesContainer.querySelectorAll('.safe-item').forEach((safe, index) => {
            if (!safe.classList.contains('opened')) {
                safe.classList.add('opened');
                safe.removeEventListener('click', handleSafeClick);
                if (!isMuted && index !== bombSafeIndex) {
                    safeOpenSound.currentTime = 0;
                    safeOpenSound.play();
                }
                if (index !== bombSafeIndex) {
                    const winAmount = (Math.random() * 20 + 5) * (betAmount / 10);
                    currentBonusWin += winAmount;
                    safe.innerHTML = `<p>${winAmount.toFixed(2)} TL</p>`;
                    safe.classList.add('won');
                }
            }
        });

        setTimeout(() => {
            bonusGamePopup.style.display = 'none';
            balance += currentBonusWin;
            updateUI();
            messageDisplay.textContent = `Bonus Oyunundan ${currentBonusWin.toFixed(2)} TL Kazandın!`;
            messageDisplay.style.color = '#32cd32';
            currentBonusWin = 0;
        }, 2000);
    } else {
        if (!isMuted) {
            safeOpenSound.currentTime = 0;
            safeOpenSound.play();
        }
        const winAmount = (Math.random() * 20 + 5) * (betAmount / 10);
        currentBonusWin += winAmount;
        currentBonusWinDisplay.textContent = currentBonusWin.toFixed(2);
        clickedSafe.classList.add('won');
        clickedSafe.innerHTML = `<p>${winAmount.toFixed(2)} TL</p>`;

        const openedSafes = safesContainer.querySelectorAll('.safe-item.opened:not(.bomb)').length;
        if (openedSafes === (totalBonusSafes - 1)) {
            bonusGameMessage.textContent = 'Tüm kasaları açtın! Süper!';
            setTimeout(() => {
                bonusGamePopup.style.display = 'none';
                balance += currentBonusWin;
                updateUI();
                messageDisplay.textContent = `Bonus Oyunundan ${currentBonusWin.toFixed(2)} TL Kazandın!`;
                messageDisplay.style.color = '#32cd32';
                currentBonusWin = 0;
            }, 1500);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    spinButton.addEventListener('click', spinReels);

    reels.forEach((reel, index) => {
        const initialSymbol = getRandomSymbolKey();
        setReelSymbol(reel, initialSymbol, false);
        lastSpinSymbols[index] = initialSymbol;
    });

    updateUI();

    backgroundMusic.play().catch(e => console.warn("Arkaplan müziği otomatik oynatılamadı:", e));

    const volumeSlider = document.querySelector('.volume-slider input');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            backgroundMusic.volume = volume * backgroundMusicVolume;
            spinSound.volume = volume * spinSoundVolume;
            winSound.volume = volume * winSoundVolume;
            bonusSound.volume = volume * bonusSoundVolume;
            safeOpenSound.volume = volume * safeOpenSoundVolume;
            bombSound.volume = volume * bombSoundVolume;
            isMuted = volume === 0;
            muteButton.textContent = isMuted ? '🔊' : '🔇';
        });
    }
});
