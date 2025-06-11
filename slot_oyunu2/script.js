// DOM Elementlerini Seç
const spinButton = document.getElementById('spinButton');
const balanceSpan = document.getElementById('balance');
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
const freeSpinsCountDisplay = document.getElementById('freeSpinsCount'); // Free spin sayacı için

// --- Senin önceki JS'inden Alınan Kullanıcı ve Bakiye Yönetimi ---
let activeUser = localStorage.getItem('hansellCasinoActiveUser');
let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

// Eğer aktif kullanıcı yoksa veya kullanıcı verisi hatalıysa, lobiye geri yönlendir
if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = '../index.html'; // Ana giriş sayfasına yönlendir
}

// Kullanıcının kişisel bakiyesi LocalStorage'dan çekiliyor
let balance = users[activeUser].balance;
let currentBet = 10; // Başlangıç bahsi
let isSpinning = false; // Çark dönüyor mu kontrolü
let freeSpins = 0; // Free spinler kullanıcının bakiyesinden bağımsızdır

// --- Ses Elementleri ---
let backgroundMusic = new Audio('assets/sounds/background_music.mp3');
let spinSound = new Audio('assets/sounds/spin_sound.mp3');
let winSound = new Audio('assets/sounds/win_sound.mp3');
let loseSound = new Audio('assets/sounds/lose_sound.mp3');
let bonusSound = new Audio('assets/sounds/bonus_sound.mp3'); // Free spin/çarpan bonus sesi

// Ses seviyeleri
const backgroundMusicVolume = 0.2;
const spinSoundVolume = 0.6;
const winSoundVolume = 0.8;
const bonusSoundVolume = 0.9;
const loseSoundVolume = 0.7;
let isMuted = false;

backgroundMusic.loop = true;
backgroundMusic.volume = backgroundMusicVolume;
spinSound.volume = spinSoundVolume;
winSound.volume = winSoundVolume;
bonusSound.volume = bonusSoundVolume;
loseSound.volume = loseSoundVolume;
musicVolumeControl.value = backgroundMusicVolume;

// Oyun Değişkenleri (Zeus Slotuna özel)
const SYMBOL_HEIGHT = 80; // Her sembolün CSS'teki yüksekliği (pixel)
const VISIBLE_SYMBOLS_PER_REEL = 6; // Makarada aynı anda görünen sembol sayısı
const REEL_STOP_POSITIONS = 100; // Her makara için dönme animasyonunda kaç sembol geçeceği

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
    { id: 'bonus_200x', img: 'assets/images/bonus_200x.png', multiplier: 200 },
    { id: 'bonus_500x', img: 'assets/images/bonus_500x.png', multiplier: 500 },
    { id: 'bonus_1000x', img: 'assets/images/bonus_1000x.png', multiplier: 1000 }
];

// Sembollerin nadirlik ağırlıkları (yeni bonus sembolleri eklendi, çarpanlar daha nadir)
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
    'bonus_fs', 'bonus_fs', // Free spin bonusu
    'bonus_3x', 'bonus_5x', 'bonus_10x', 'bonus_20x', // Daha düşük çarpanlar biraz daha sık
    'bonus_50x', 'bonus_100x', 'bonus_200x', // Orta çarpanlar
    'bonus_500x', 'bonus_1000x' // Yüksek çarpanlar çok daha nadir
];

// Kazanma Hatları (Senin görseldeki örnek payline'lara göre 4 makaralı slota uyarladım)
// Her payline, her makaradaki (reel) hangi sıradaki sembolü (0-5) kontrol edeceğini belirtir.
// Örneğin: [0, 0, 0, 0] -> Her makaranın en üstteki sembolü
// [0, 1, 2, 3] -> 1. makaranın 1. sembolü, 2. makaranın 2. sembolü vb.
const paylines = [
    // Yatay Hatlar
    [0, 0, 0, 0], // En üst sıra
    [1, 1, 1, 1], // İkinci sıra
    [2, 2, 2, 2], // Üçüncü sıra
    [3, 3, 3, 3], // Dördüncü sıra
    [4, 4, 4, 4], // Beşinci sıra
    [5, 5, 5, 5], // En alt sıra

    // Basit Çapraz Hatlar (Görseldeki mantığa yakın olarak 4 makaraya uyarlanmış)
    [0, 1, 2, 3], // Sol üstten sağ alta
    [3, 2, 1, 0], // Sağ üstten sol alta

    // Daha karmaşık çaprazlar (görseldeki gibi zikzaklar)
    [0, 0, 1, 1],
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 2, 2, 0],
    [1, 0, 0, 1],
    [2, 0, 0, 2],
    [0, 2, 1, 3],
    [3, 1, 2, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [2, 1, 2, 1],
    [1, 2, 1, 2],
    [0, 3, 0, 3],
    [3, 0, 3, 0],
    [2, 3, 2, 3],
    [3, 2, 3, 2],
    [0, 4, 0, 4],
    [4, 0, 4, 0],
    [1, 4, 1, 4],
    [4, 1, 4, 1],
    [2, 5, 2, 5],
    [5, 2, 5, 2],
    [3, 5, 3, 5],
    [5, 3, 5, 3],
    [4, 5, 4, 5],
    [5, 4, 5, 4],
    [0, 3, 1, 4],
    [4, 1, 3, 0]
];


// Kazanma Tablosu (Zeus sembollerine göre güncellendi)
const paytable = {
    'zeus': { '4': 500, '3': 200, '2': 50 },
    'pegasus': { '4': 400, '3': 150, '2': 40 },
    'eagle': { '4': 300, '3': 100, '2': 30 },
    'helmet': { '4': 200, '3': 80, '2': 25 },
    'vase': { '4': 150, '3': 60, '2': 20 },
    'coin': { '4': 100, '3': 50, '2': 15 },
    'thunder': { '4': 80, '3': 40, '2': 12 },
    'cardA': { '4': 50, '3': 25, '2': 10 },
    'cardK': { '4': 40, '3': 20, '2': 8 },
    'cardQ': { '4': 30, '3': 15, '2': 6 },
    'cardJ': { '4': 20, '3': 10, '2': 4 },
};

// Senin kodundan alınan global değişkenler
let highlightTimeout;
let symbolResetTimeout;
let lastSpinSymbolsMatrix = []; // Son spinin sembollerini tutacak, her makarada 6 sembol olacak


// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    balanceSpan.textContent = balance.toFixed(2);
    currentBetSpan.textContent = currentBet.toFixed(2);
    freeSpinsCountDisplay.textContent = freeSpins;

    if (freeSpins > 0) {
        betMinusButton.disabled = true;
        betPlusButton.disabled = true;
    } else {
        betMinusButton.disabled = false;
        betPlusButton.disabled = false;
    }

    if (activeUser && users[activeUser]) {
        users[activeUser].balance = balance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }
}

// Reel elementine sembolü yerleştiren yardımcı fonksiyon (artık matrix içinde sembol yerleştirecek)
function setReelSymbol(reelElement, symbolData) {
    reelElement.style.backgroundImage = `url(${symbolData.img})`;
    reelElement.dataset.id = symbolData.id;
    reelElement.dataset.multiplier = symbolData.multiplier || ''; // Çarpanı sakla
}

// Rastgele Sembol Alma Fonksiyonu (ID'ye göre symbol objesini döndürür)
function getRandomSymbolObject() {
    const randomId = weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
    return symbols.find(s => s.id === randomId);
}


// Spin Fonksiyonu
spinButton.addEventListener('click', () => {
    if (isSpinning) return;

    if (freeSpins === 0 && balance < currentBet) {
        alert('Yetersiz bakiye! Bahsi Azalt veya bakiye yükle.');
        return;
    }

    lastWinSpan.textContent = '0';
    removeHighlight();
    if (symbolResetTimeout) clearTimeout(symbolResetTimeout);

    if (freeSpins === 0) {
        balance -= currentBet;
    } else {
        freeSpins--;
    }

    updateUI();

    spinButton.disabled = true;
    isSpinning = true;

    if (!isMuted) {
        spinSound.currentTime = 0;
        spinSound.play();
    }

    let finalResultMatrix = Array(reels.length).fill(0).map(() => Array(VISIBLE_SYMBOLS_PER_REEL).fill(null));
    let completedReels = 0;

    reels.forEach((reel, reelIndex) => {
        reel.innerHTML = ''; // Önceki sembolleri temizle
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(0)';

        // Her makara için VISIBLE_SYMBOLS_PER_REEL * 2 kadar sembol (döngüsel görünüm için) ve fazladan dönüş sembolleri
        // Artı bir de son duruş noktasını garanti etmek için ek semboller
        const totalSymbolsForAnimation = REEL_STOP_POSITIONS + VISIBLE_SYMBOLS_PER_REEL + 10;
        const tempAnimationSymbols = [];

        for (let i = 0; i < totalSymbolsForAnimation; i++) {
            const symbolData = getRandomSymbolObject();
            tempAnimationSymbols.push(symbolData);
            const symbolDiv = document.createElement('div');
            symbolDiv.classList.add('symbol');
            setReelSymbol(symbolDiv, symbolData);
            reel.appendChild(symbolDiv);
        }

        // Makaraların duracağı son VISIBLE_SYMBOLS_PER_REEL kadar sembolü belirle
        // Bu, gerçekten kazanç kontrolü yapılacak semboller olacak
        const reelFinalSymbols = [];
        for (let i = 0; i < VISIBLE_SYMBOLS_PER_REEL; i++) {
            const finalSymbol = getRandomSymbolObject();
            reelFinalSymbols.push(finalSymbol);
            // Sonuç matrisine kaydet
            finalResultMatrix[reelIndex][i] = finalSymbol;
        }

        // Animasyon bitiminde doğru sembollerin görünmesi için son sembolleri ekle
        reelFinalSymbols.forEach(symbolData => {
            const symbolDiv = document.createElement('div');
            symbolDiv.classList.add('symbol');
            setReelSymbol(symbolDiv, symbolData);
            reel.appendChild(symbolDiv);
        });

        // Hangi pozisyonda durulacağını hesapla (en üstteki sembolün konumu)
        // Animasyon bittikten sonra en üstte duracak sembolün indeksi
        const finalStopIndex = totalSymbolsForAnimation - VISIBLE_SYMBOLS_PER_REEL;
        const finalY = finalStopIndex * SYMBOL_HEIGHT;

        const spinDuration = 2000 + (reelIndex * 400);
        const stopDelay = reelIndex * 200;

        setTimeout(() => {
            reel.style.transition = `transform ${spinDuration / 1000}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
            reel.style.transform = `translateY(-${finalY}px)`;

            reel.addEventListener('transitionend', function handler() {
                completedReels++;
                if (completedReels === reels.length) {
                    isSpinning = false;
                    spinSound.pause();
                    spinSound.currentTime = 0;

                    // Animasyon bittikten sonra makarayı temizle ve sadece kazanan sembolleri/gerçek duran sembolleri yerleştir
                    reels.forEach((r, i) => {
                        r.style.transition = 'none';
                        r.innerHTML = '';
                        finalResultMatrix[i].forEach(symbolData => {
                            const symbolDiv = document.createElement('div');
                            symbolDiv.classList.add('symbol');
                            setReelSymbol(symbolDiv, symbolData);
                            r.appendChild(symbolDiv);
                        });
                        r.style.transform = `translateY(0px)`;
                    });

                    lastSpinSymbolsMatrix = finalResultMatrix; // Sonuçları kaydet
                    checkWin(finalResultMatrix);
                    spinButton.disabled = false;
                    completedReels = 0;
                }
                reel.removeEventListener('transitionend', handler);
            });
        }, stopDelay);
    });
});

// Kazançları Kontrol Eden Fonksiyon (Yeni kurallara göre güncellendi)
function checkWin(currentSymbolsMatrix) { // currentSymbolsMatrix: 4 makara x 6 sembol
    let totalWin = 0;
    let maxMultiplier = 1; // Düşen çarpanlar içinde en yükseği
    const winningElementsToHighlight = new Set(); // Kazanan sembollerin reel elementlerini tutacak

    // Çarpan sembollerini kontrol et
    currentSymbolsMatrix.forEach((reelSymbols, reelIndex) => {
        reelSymbols.forEach((symbolData, rowIndex) => {
            if (symbolData && symbolData.id.startsWith('bonus_') && symbolData.multiplier) {
                maxMultiplier = Math.max(maxMultiplier, symbolData.multiplier);
                // Çarpan sembollerini de vurgula (isteğe bağlı)
                winningElementsToHighlight.add({ reelIndex: reelIndex, rowIndex: rowIndex, isMultiplier: true });
            }
        });
    });

    // Free Spin bonus sembollerini kontrol et
    let freeSpinBonusCount = 0;
    const freeSpinBonusElements = [];
    currentSymbolsMatrix.forEach((reelSymbols, reelIndex) => {
        reelSymbols.forEach((symbolData, rowIndex) => {
            if (symbolData && symbolData.id === 'bonus_fs') {
                freeSpinBonusCount++;
                freeSpinBonusElements.push({ reelIndex: reelIndex, rowIndex: rowIndex });
            }
        });
    });

    if (freeSpinBonusCount >= 3) { // 3 veya daha fazla free spin sembolü düştüğünde
        freeSpins += 10; // 10 bedava spin ver
        lastWinSpan.textContent = 'FREE SPIN!';
        alert(`Tebrikler! ${freeSpins} bedava spin kazandın!`);
        if (!isMuted) {
            winSound.pause();
            winSound.currentTime = 0;
            bonusSound.currentTime = 0;
            bonusSound.play();
        }
        highlightWinningReels(freeSpinBonusElements); // Free spin sembollerini vurgula
        transformWinningSymbols(freeSpinBonusElements); // Para simgesine dönüştür
        updateUI();
        return; // Free spin tetiklendiyse başka kazanç arama
    }


    // Payline kontrolü
    paylines.forEach((paylineConfig, paylineIndex) => {
        const lineSymbols = [];
        const currentPaylineWinningElements = []; // Bu paylinedaki kazanan elementler

        // Her makaradan, payline konfigürasyonundaki ilgili sembolü al
        paylineConfig.forEach((rowIndex, reelIndex) => {
            const symbolData = currentSymbolsMatrix[reelIndex][rowIndex];
            lineSymbols.push(symbolData ? symbolData.id : null);
            currentPaylineWinningElements.push({ reelIndex: reelIndex, rowIndex: rowIndex });
        });

        const firstSymbolId = lineSymbols[0];
        if (!firstSymbolId || firstSymbolId.startsWith('bonus_')) return; // Bonus sembolleri payline kazancı vermez

        let matchCount = 0;
        for (let i = 0; i < lineSymbols.length; i++) {
            if (lineSymbols[i] === firstSymbolId) {
                matchCount++;
            } else {
                break;
            }
        }

        if (paytable[firstSymbolId] && paytable[firstSymbolId][matchCount]) {
            let winAmount = paytable[firstSymbolId][matchCount] * currentBet;

            // Eğer çarpan bonus sembolü varsa, kazancı çarp
            if (maxMultiplier > 1) {
                winAmount *= maxMultiplier;
                alert(`Çarpan ile kazanç: ${maxMultiplier}x!`); // Çarpan düştüğünü belirt
            }
            totalWin += winAmount;

            currentPaylineWinningElements.forEach(el => winningElementsToHighlight.add(el));
        }
    });


    if (totalWin > 0) {
        balance += totalWin;
        lastWinSpan.textContent = totalWin.toFixed(2);
        updateUI();
        if (!isMuted) {
            winSound.currentTime = 0;
            winSound.play();
        }
        alert(`Tebrikler! ${totalWin.toFixed(2)} kazandınız!`);
        highlightWinningReels(Array.from(winningElementsToHighlight)); // Kazanan makaraları ve çarpanları vurgula
        transformWinningSymbols(Array.from(winningElementsToHighlight)); // Kazanan sembolleri dönüştür
    } else {
        if (!isMuted) {
            loseSound.currentTime = 0;
            loseSound.play();
        }
        lastWinSpan.textContent = '0';
        alert('Maalesef, bir dahaki sefere!');
    }
}

// Kazanan makaraların arka planını geçici olarak parlatma
function highlightWinningReels(elementsToHighlight) { // elementsToHighlight: [{reelIndex, rowIndex}]
    if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        removeHighlight();
    }

    elementsToHighlight.forEach(el => {
        const reelElement = reels[el.reelIndex];
        if (reelElement && reelElement.children[el.rowIndex]) {
            reelElement.children[el.rowIndex].classList.add('highlight');
        }
    });

    highlightTimeout = setTimeout(() => {
        removeHighlight();
    }, 2000);
}

// Makaralardan parlaklığı kaldıran fonksiyon
function removeHighlight() {
    reels.forEach(reel => {
        Array.from(reel.children).forEach(symbolDiv => {
            symbolDiv.classList.remove('highlight');
        });
    });
}

// Kazanan sembolleri para simgesine çevir
function transformWinningSymbols(elementsToTransform) {
    elementsToTransform.forEach(el => {
        const reelElement = reels[el.reelIndex];
        const symbolDiv = reelElement.children[el.rowIndex];
        if (symbolDiv) {
            symbolDiv.innerHTML = '💰';
            symbolDiv.style.backgroundImage = 'none';
            symbolDiv.style.fontSize = '3em';
            symbolDiv.style.color = '#FFD700';
            symbolDiv.style.textShadow = '2px 2px 5px rgba(0,0,0,0.7)';
        }
    });

    if (symbolResetTimeout) clearTimeout(symbolResetTimeout);
    symbolResetTimeout = setTimeout(() => {
        resetReelSymbols();
    }, 1500);
}

// Tüm makaraların sembollerini başlangıç durumuna (son çevirmedeki semboller) döndür
function resetReelSymbols() {
    reels.forEach((reel, reelIndex) => {
        reel.innerHTML = ''; // İçeriği temizle
        if (lastSpinSymbolsMatrix[reelIndex]) {
            lastSpinSymbolsMatrix[reelIndex].forEach(symbolData => {
                const symbolDiv = document.createElement('div');
                symbolDiv.classList.add('symbol');
                setReelSymbol(symbolDiv, symbolData);
                reel.appendChild(symbolDiv);
            });
        } else { // Eğer henüz spin yapılmadıysa veya hata varsa, rastgele semboller göster
            for(let i = 0; i < VISIBLE_SYMBOLS_PER_REEL; i++) {
                const symbolDiv = document.createElement('div');
                symbolDiv.classList.add('symbol');
                setReelSymbol(symbolDiv, getRandomSymbolObject());
                reel.appendChild(symbolDiv);
            }
        }
        reel.classList.remove('highlight');
        reel.style.transform = `translateY(0px)`;
    });
}


// Bahis azaltma butonu olay dinleyicisi
betMinusButton.addEventListener('click', () => {
    if (currentBet > 10 && !isSpinning && freeSpins === 0) {
        currentBet -= 10;
        updateUI();
    }
});

// Bahis artırma butonu olay dinleyicisi
betPlusButton.addEventListener('click', () => {
    // Bakiyeyi kontrol etmeden önce free spin kontrolü ekle
    if (!isSpinning && freeSpins === 0) {
        if (currentBet + 10 <= balance) { // Bakiyeyi aşmamasını sağla
            currentBet += 10;
        } else {
            currentBet = balance; // Bakiyeye eşitle eğer artırılamıyorsa
        }
        updateUI();
    }
});

// Müzik Kontrolleri
musicToggleButton.addEventListener('click', () => {
    if (isMuted) {
        backgroundMusic.play().catch(e => console.log("Müzik çalma hatası (kullanıcı etkileşimi gerekli):", e));
        musicToggleButton.textContent = 'Müziği Kapat';
        isMuted = false;
    } else {
        backgroundMusic.pause();
        musicToggleButton.textContent = 'Müziği Aç';
        isMuted = true;
    }
});

musicVolumeControl.addEventListener('input', (e) => {
    backgroundMusic.volume = e.target.value;
    spinSound.volume = e.target.value * (spinSoundVolume / backgroundMusicVolume);
    winSound.volume = e.target.value * (winSoundVolume / backgroundMusicVolume);
    loseSound.volume = e.target.value * (loseSoundVolume / backgroundMusicVolume);
    bonusSound.volume = e.target.value * (bonusSoundVolume / backgroundMusicVolume);
});

// Geri Dön butonu olay dinleyicisi
const backToLobbyButton = document.getElementById('backToLobbyButton');
if (backToLobbyButton) {
    backToLobbyButton.addEventListener('click', () => {
        window.location.href = '../index.html'; // Giriş/Lobi sayfasına yönlendir
    });
}


// --- Sayfa Yüklendiğinde Başlangıç İşlemleri ---
document.addEventListener('DOMContentLoaded', () => {
    // Makaraları başlangıçta sembollerle doldur
    reels.forEach((reel, reelIndex) => {
        lastSpinSymbolsMatrix[reelIndex] = []; // Her makara için bir dizi oluştur
        for(let i = 0; i < VISIBLE_SYMBOLS_PER_REEL; i++) {
            const symbolData = getRandomSymbolObject();
            lastSpinSymbolsMatrix[reelIndex].push(symbolData); // İlk yüklemede rastgele sembolleri tut
            const symbolDiv = document.createElement('div');
            symbolDiv.classList.add('symbol');
            setReelSymbol(symbolDiv, symbolData);
            reel.appendChild(symbolDiv);
        }
    });

    updateUI(); // Sayfa ilk yüklendiğinde bakiyeyi göster ve localStorage'dan çek

    // Kullanıcının ilk etkileşiminde müziği başlat (tarayıcı kısıtlaması)
    document.body.addEventListener('click', () => {
        if (backgroundMusic.paused && !isMuted) {
            backgroundMusic.play().catch(e => console.log("Müzik çalma hatası:", e));
        }
    }, { once: true });
});