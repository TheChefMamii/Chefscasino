// DOM Elementlerini Seç
const reels = document.querySelectorAll('.reel');
const spinButton = document.getElementById('spinButton');
const messageDisplay = document.getElementById('message');
const balanceDisplay = document.getElementById('balance');
const betAmountDisplay = document.getElementById('betAmount');
const winAmountDisplay = document.getElementById('winAmount');
const freeSpinsCountDisplay = document.getElementById('freeSpinsCount');

const decreaseBetBtn = document.getElementById('decreaseBet');
const increaseBetBtn = document.getElementById('increaseBet');
const infoButton = document.getElementById('infoButton');
const infoPopup = document.getElementById('infoPopup');
const closeInfoPopupBtn = document.getElementById('closeInfoPopup');
const paytableInfoDisplay = document.getElementById('paytableInfo');
const muteButton = document.getElementById('muteButton');
const backToLobbyButton = document.getElementById('backToLobbyButton'); // Geri Butonu

// Ses Elementleri
const backgroundMusic = document.getElementById('backgroundMusic');
const spinSound = document.getElementById('spinSound');
const winSound = document.getElementById('winSound');
const bonusSound = document.getElementById('bonusSound');

// Oyun Değişkenleri
let activeUser = localStorage.getItem('hansellCasinoActiveUser');
let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

// Eğer aktif kullanıcı yoksa veya kullanıcı verisi hatalıysa, lobiye geri yönlendir
if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = '../index.html'; // Ana giriş sayfasına yönlendir
}

// Kullanıcının kişisel bakiyesi
let balance = users[activeUser].balance; 
let betAmount = 10; 
let isSpinning = false; 
let highlightTimeout; 
let symbolResetTimeout; 
let lastSpinSymbols = []; 
let freeSpins = 0; // Free spinler kullanıcının bakiyesinden bağımsızdır

// Ses Seviyeleri ve Durum
const backgroundMusicVolume = 0.2; 
const spinSoundVolume = 0.6; 
const winSoundVolume = 0.8; 
const bonusSoundVolume = 0.9; 
let isMuted = false; 

// Ses seviyelerini ayarla (varsayılan olarak kısık başlar)
backgroundMusic.volume = backgroundMusicVolume;
spinSound.volume = spinSoundVolume;
winSound.volume = winSoundVolume;
bonusSound.volume = bonusSoundVolume;

// Slot Sembolleri (Resim Yolları - Düzeltildi)
const symbolImages = {
    'cherry': '../assets/images/cherry.png',
    'lemon': '../assets/images/lemon.png',
    'grape': '../assets/images/grape.png',
    'watermelon': '../assets/images/watermelon.png',
    'candy': '../assets/images/candy.png',
    'diamond': '../assets/images/diamond.png',
    'star': '../assets/images/star.png',
    'bonus': '../assets/images/bonus_symbol.png' 
};

// Sembollerin nadirlik ağırlıkları (daha az tekrar = daha nadir)
const weightedSymbols = [
    'cherry', 'cherry', 'cherry', 'cherry', 'cherry', 'cherry', 
    'lemon', 'lemon', 'lemon', 'lemon', 'lemon', 
    'grape', 'grape', 'grape', 'grape',
    'watermelon', 'watermelon', 'watermelon',
    'diamond', 'diamond',
    'candy', 
    'star', 'star', 
    'bonus' 
];

const currencySymbol = '💰'; 

// Cluster (Küme) Kazanç Çarpanları: (CİDDİ ORANDA DÜŞÜRÜLDÜ)
const paytable = {
    'cherry': { 4: 0.5, 5: 0.8, 6: 1.2, 7: 1.8, 8: 2.5, 9: 3.5, 10: 5, 11: 7, 12: 10, 13: 13, 14: 16 },
    'lemon': { 4: 0.5, 5: 0.8, 6: 1.2, 7: 1.8, 8: 2.5, 9: 3.5, 10: 5, 11: 7, 12: 10, 13: 13, 14: 16 },
    'grape': { 4: 0.6, 5: 1, 6: 1.5, 7: 2.2, 8: 3, 9: 4.2, 10: 6, 11: 8, 12: 11, 13: 14, 14: 17 },
    'watermelon': { 4: 0.6, 5: 1, 6: 1.5, 7: 2.2, 8: 3, 9: 4.2, 10: 6, 11: 8, 12: 11, 13: 14, 14: 17 },
    'candy': { 4: 0.7, 5: 1.2, 6: 1.8, 7: 2.6, 8: 3.6, 9: 5, 10: 7, 11: 9, 12: 12, 13: 15, 14: 18 }, 
    'diamond': { 4: 0.8, 5: 1.5, 6: 2.2, 7: 3.2, 8: 4.5, 9: 6.5, 10: 9, 11: 12, 12: 15, 13: 18, 14: 21 },
    'star': { 4: 1, 5: 1.8, 6: 2.8, 7: 4, 8: 5.5, 9: 7.5, 10: 10, 11: 13, 12: 16, 13: 20, 14: 24 } 
};

const numRows = 5; 
const numCols = 6; 
const numReels = numRows * numCols; 

// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    balanceDisplay.textContent = balance.toFixed(2); 
    betAmountDisplay.textContent = betAmount;
    freeSpinsCountDisplay.textContent = freeSpins; 
    
    if (freeSpins > 0) {
        decreaseBetBtn.disabled = true;
        increaseBetBtn.disabled = true;
    } else {
        decreaseBetBtn.disabled = false;
        increaseBetBtn.disabled = false;
    }

    // Kullanıcının bakiyesini users objesinde ve localStorage'da güncelle
    if (activeUser && users[activeUser]) {
        users[activeUser].balance = balance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }
}

// Reel elementine sembolü yerleştiren yardımcı fonksiyon
function setReelSymbol(reelElement, symbolKey) {
    if (symbolKey === currencySymbol) { 
        reelElement.innerHTML = currencySymbol;
        reelElement.style.fontSize = '30px'; 
    } else {
        const img = document.createElement('img');
        img.src = symbolImages[symbolKey];
        img.alt = symbolKey;
        reelElement.innerHTML = ''; 
        reelElement.appendChild(img);
        reelElement.style.fontSize = ''; 
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

    if (freeSpins === 0 && balance < betAmount) { 
        messageDisplay.textContent = 'Bakiyen Yetersiz! Bahsi Azalt.';
        return;
    }

    winAmountDisplay.textContent = ''; 
    messageDisplay.textContent = ''; 
    removeHighlight(); 
    resetReelSymbols(); 

    if (symbolResetTimeout) clearTimeout(symbolResetTimeout); 

    if (freeSpins === 0) {
        balance -= betAmount; 
    } else {
        freeSpins--; 
    }

    updateUI(); 
    
    if (freeSpins > 0) {
        messageDisplay.textContent = `FREE SPIN! Kalan: ${freeSpins}`;
        messageDisplay.style.color = '#8A2BE2'; 
    } else {
        messageDisplay.textContent = 'Dönüyor...';
        messageDisplay.style.color = '#FF4500';
    }


    spinButton.disabled = true; 
    isSpinning = true; 

    if (!isMuted) { 
        spinSound.currentTime = 0; 
        spinSound.play(); 
    }

    let currentSymbols = new Array(numReels); 
    lastSpinSymbols = []; 
    let spinningIntervals = []; 
    let stoppedReelsCount = 0; 

    reels.forEach((reel, index) => {
        const spinDuration = 1500 + (index * 60); 
        const spinInterval = 70; 

        spinningIntervals[index] = setInterval(() => {
            setReelSymbol(reel, getRandomSymbolKey()); 
        }, spinInterval);

        setTimeout(() => {
            clearInterval(spinningIntervals[index]); 
            const finalSymbolKey = getRandomSymbolKey(); 
            currentSymbols[index] = finalSymbolKey; 
            lastSpinSymbols[index] = finalSymbolKey; 
            setReelSymbol(reel, finalSymbolKey); 
            stoppedReelsCount++;

            if (stoppedReelsCount === numReels) {
                spinSound.pause(); 
                spinSound.currentTime = 0; 
                checkWin(currentSymbols); 
                spinButton.disabled = false; 
                isSpinning = false; 
            }
        }, spinDuration);
    });
}

// Kazançları Kontrol Eden Fonksiyon
function checkWin(resultSymbols) {
    let totalWin = 0;
    let overallWinningReelIndexes = new Set(); 
    const visited = new Array(numReels).fill(false); 

    // Bonus sembollerini say
    let bonusSymbolCount = 0;
    const bonusSymbolIndexes = [];
    resultSymbols.forEach((symbolKey, index) => {
        if (symbolKey === 'bonus') {
            bonusSymbolCount++;
            bonusSymbolIndexes.push(index);
        }
    });

    // Bonus tetiklemesi (4 veya daha fazla bonus sembolü)
    if (bonusSymbolCount >= 4) { 
        const initialFreeSpins = 10;
        freeSpins += initialFreeSpins; 
        messageDisplay.textContent = `BONUS! ${initialFreeSpins} FREE SPIN KAZANDIN! 🤑`; 
        messageDisplay.style.color = '#FFD700'; 
        if (!isMuted) { 
            winSound.pause(); 
            winSound.currentTime = 0;
            bonusSound.currentTime = 0;
            bonusSound.play(); 
        }
        highlightWinningReels(bonusSymbolIndexes); 
    }


    function getCoords(index) {
        return {
            row: Math.floor(index / numCols),
            col: index % numCols
        };
    }

    function getIndex(row, col) {
        if (row < 0 || row >= numRows || col < 0 || col >= numCols) {
            return -1; 
        }
        return row * numCols + col;
    }

    // BFS (Breadth-First Search) ile bitişik kümeleri bulma (sadece yatay ve dikey)
    function findCluster(startIndex, symbolType) {
        const queue = [startIndex];
        const clusterIndexes = new Set(); 
        clusterIndexes.add(startIndex);
        visited[startIndex] = true;

        let head = 0;
        while(head < queue.length) {
            const currentIndex = queue[head++];
            const { row, col } = getCoords(currentIndex);

            const directions = [
                [-1, 0], [1, 0], [0, -1], [0, 1] 
            ];

            for (const [dr, dc] of directions) {
                const newRow = row + dr;
                const newCol = col + dc;
                const neighborIndex = getIndex(newRow, newCol);

                if (neighborIndex !== -1 && !visited[neighborIndex] && resultSymbols[neighborIndex] === symbolType && symbolType !== 'bonus') {
                    visited[neighborIndex] = true;
                    clusterIndexes.add(neighborIndex);
                    queue.push(neighborIndex);
                }
            }
        }
        return Array.from(clusterIndexes);
    }

    // Her bir makarayı gez ve kümeleri bul (bonus sembolleri hariç)
    for (let i = 0; i < numReels; i++) {
        if (!visited[i] && resultSymbols[i] !== 'bonus') { 
            const currentSymbol = resultSymbols[i];
            const cluster = findCluster(i, currentSymbol);
            const count = cluster.length;

            if (count >= 4 && count <= 14 && paytable[currentSymbol] && paytable[currentSymbol][count]) {
                const multiplier = paytable[currentSymbol][count];
                const clusterWin = betAmount * multiplier;
                totalWin += clusterWin;
                
                cluster.forEach(idx => overallWinningReelIndexes.add(idx));
            }
        }
    }

    if (totalWin > 0 && bonusSymbolCount < 4) { // Bonus 4 taneden az ise normal kazancı göster
        balance += totalWin; 
        messageDisplay.textContent = `TEBRİKLER! KAZANDIN! 🎉`; 
        messageDisplay.style.color = '#4CAF50'; 
        winAmountDisplay.textContent = `Bakiyene ${totalWin.toFixed(2)} TL Eklendi! Toplam: ${balance.toFixed(2)} TL`; 
        if (!isMuted) { 
            winSound.currentTime = 0; 
            winSound.play(); 
        }
        highlightWinningReels(Array.from(overallWinningReelIndexes)); 
        transformWinningSymbols(Array.from(overallWinningReelIndexes)); 
    } else if (totalWin === 0 && bonusSymbolCount < 4) { // Ne kazanç ne de bonus 4 taneye ulaştı
        messageDisplay.textContent = 'Tekrar Dene! Şansını Bir Sonraki Çevirmede Yakala. 🍀';
        messageDisplay.style.color = '#F44336'; 
        winAmountDisplay.textContent = ''; 
    }
    updateUI(); 
}

// Kazanan makaraların arka planını geçici olarak parlatma
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

// Makaralardan parlaklığı kaldıran fonksiyon
function removeHighlight() {
    reels.forEach(reel => {
        reel.classList.remove('highlight');
    });
}

// Kazanan sembolleri para simgesine çevir
function transformWinningSymbols(winningReelIndexes) {
    winningReelIndexes.forEach(index => {
        setReelSymbol(reels[index], currencySymbol); 
    });

    if (symbolResetTimeout) clearTimeout(symbolResetTimeout); 
    symbolResetTimeout = setTimeout(() => {
        resetReelSymbols();
    }, 1500); 
}

// Tüm makaraların sembollerini başlangıç durumuna (son çevirmedeki semboller) döndür
function resetReelSymbols() {
    reels.forEach((reel, index) => {
        if (lastSpinSymbols[index]) {
            setReelSymbol(reel, lastSpinSymbols[index]);
        } else {
            setReelSymbol(reel, getRandomSymbolKey()); 
        }
        reel.classList.remove('highlight'); 
    });
}

// Paytable bilgisini popup menüye doldur
function populatePaytableInfo() {
    paytableInfoDisplay.innerHTML = ''; 

    const orderedSymbols = [
        'cherry', 'lemon', 'grape', 'watermelon', 'candy', 'diamond', 'star'
    ]; 

    orderedSymbols.forEach(symbolKey => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('paytable-item');

        const img = document.createElement('img');
        img.src = symbolImages[symbolKey]; 
        img.alt = symbolKey;
        itemDiv.appendChild(img);

        const title = document.createElement('h4');
        title.textContent = symbolKey.charAt(0).toUpperCase() + symbolKey.slice(1); 
        itemDiv.appendChild(title);

        const ul = document.createElement('ul');
        const symbolPaytable = paytable[symbolKey];
        for (const count in symbolPaytable) {
            if (symbolPaytable.hasOwnProperty(count)) {
                const li = document.createElement('li');
                li.textContent = `${count}x: ${symbolPaytable[count]} Kat`; 
                ul.appendChild(li);
            }
        }
        itemDiv.appendChild(ul);
        paytableInfoDisplay.appendChild(itemDiv);
    });
}

// Ses açma/kapama fonksiyonu
function toggleMute() {
    isMuted = !isMuted; 

    if (isMuted) {
        backgroundMusic.pause();
        muteButton.textContent = '🔊'; 
    } else {
        backgroundMusic.play().catch(e => {
            console.log("Müzik yeniden başlatılamadı:", e);
        });
        muteButton.textContent = '🔇'; 
    }
}


// Bahis azaltma butonu olay dinleyicisi
decreaseBetBtn.addEventListener('click', () => {
    if (betAmount > 10 && !isSpinning && freeSpins === 0) { 
        betAmount -= 10; 
        updateUI();
    }
});

// Bahis artırma butonu olay dinleyicisi
increaseBetBtn.addEventListener('click', () => {
    if (betAmount < 1000 && !isSpinning && freeSpins === 0) { 
        betAmount += 10; 
        updateUI();
    }
});

// Bilgi butonu olay dinleyicileri
infoButton.addEventListener('click', () => {
    populatePaytableInfo(); 
    infoPopup.style.display = 'block';
});

closeInfoPopupBtn.addEventListener('click', () => {
    infoPopup.style.display = 'none';
});

// Popup dışına tıklayınca kapatma
window.addEventListener('click', (event) => {
    if (event.target === infoPopup) {
        infoPopup.style.display = 'none';
    }
});

// Mute butonu olay dinleyicisi
muteButton.addEventListener('click', toggleMute); 

// Geri Dön butonu olay dinleyicisi
backToLobbyButton.addEventListener('click', () => {
    window.location.href = '../lobby.html'; // Lobiye geri dön
});


// --- Sayfa Yüklendiğinde Başlangıç İşlemleri ---
document.addEventListener('DOMContentLoaded', () => {
    spinButton.addEventListener('click', spinReels);
    
    reels.forEach((reel, index) => { 
        const initialSymbol = getRandomSymbolKey();
        setReelSymbol(reel, initialSymbol);
        lastSpinSymbols[index] = initialSymbol; 
    });
    
    updateUI(); // Sayfa ilk yüklendiğinde bakiyeyi göster ve localStorage'dan çek
    
    backgroundMusic.play().catch(e => {
        console.log("Arkaplan müziği otomatik oynatılamadı (tarayıcı kısıtlaması):", e);
        // Eğer otomatik oynatılamazsa, kullanıcı ilk tıklamada müziği başlatabilir.
        // Ama artık lobiye dönme butonu ve diğer etkileşimler var, bu yüzden sorun olmaz.
    });
});