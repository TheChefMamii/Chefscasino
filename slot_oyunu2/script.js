// DOM Elementlerini Seç
const spinButton = document.getElementById('spinButton');
const currentBalanceSpan = document.getElementById('currentBalance'); // Yeni ID
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
// Ses yollarını kontrol et! Eğer ses dosyaları `slot_oyunu2/assets/sounds` içinde değilse, bu yolları düzeltmelisin.
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
const VISIBLE_SYMBOLS_PER_REEL = 3; // Makarada aynı anda görünen sembol sayısı (resimdeki gibi 3)
const REEL_STOP_POSITIONS = 50; // Her makara için dönme animasyonunda kaç sembol geçeceği.

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
    'bonus_50x', 'bonus_100x', // Orta çarpanlar
    'bonus_1000x' // Yüksek çarpanlar çok daha nadir
];

// Kazanma Hatları (Resimdeki 3x4 layout'a göre 4 makara ve 3 görünür sembol)
// Bu paylinelar 3x4'lük görünüm için düzenlendi.
const paylines = [
    // Yatay Hatlar (Görünür 3 sıra)
    [0, 0, 0, 0], // En üst sıra
    [1, 1, 1, 1], // Orta sıra
    [2, 2, 2, 2], // En alt sıra

    // V Şeklinde Hatlar (Örnek)
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [2, 1, 2, 1],
    [1, 2, 1, 2],

    // Ters V Şeklinde Hatlar (Örnek)
    [0, 1, 2, 1],
    [2, 1, 0, 1],
    
    // Zikzak Hatlar (Örnek)
    [0, 1, 1, 2],
    [2, 1, 1, 0]
    // Buraya istediğin kadar farklı payline ekleyebilirsin
];


// Kazanma Tablosu (Zeus sembollerine göre güncellendi)
const paytable = {
    'zeus': { '4': 500, '3': 200, '2': 50 },
    'pegasus': { '4': 400, '3': 150, '2': 40 },
    'eagle': { '4': 300, '3': 100, '2': 30 },
    'helmet': { '4': 200, '3': 80, '2': 25 },
    'vase': { '4': 150, '3': 60, '2': 20 },
    'coin': { '4': 100, '3': 50, '2': 15 },
    'thunder': { '4': 80, '3': 40, '2': 12 }, // Wild sembolü, diğer sembollerle eşleşebilir
    'cardA': { '4': 50, '3': 25, '2': 10 },
    'cardK': { '4': 40, '3': 20, '2': 8 },
    'cardQ': { '4': 30, '3': 15, '2': 6 },
    'cardJ': { '4': 20, '3': 10, '2': 4 },
};

// Senin kodundan alınan global değişkenler
let highlightTimeout;
let symbolResetTimeout;
let lastSpinSymbolsMatrix = []; // Son spinin sembollerini tutacak, her makarada VISIBLE_SYMBOLS_PER_REEL sembol olacak


// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    currentBalanceSpan.textContent = balance.toFixed(2); // Yeni ID'ye göre güncelledim
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

// Reel elementine sembolü yerleştiren yardımcı fonksiyon
// Bu fonksiyon, bir sembol nesnesini alır ve bir DOM div'i olarak oluşturur/döndürür.
function createSymbolElement(symbolData) {
    const symbolDiv = document.createElement('div');
    symbolDiv.classList.add('symbol');
    symbolDiv.style.backgroundImage = `url(${symbolData.img})`;
    symbolDiv.dataset.id = symbolData.id;
    symbolDiv.dataset.multiplier = symbolData.multiplier || ''; // Çarpanı sakla
    return symbolDiv;
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

    lastWinSpan.textContent = '0.00'; // Kazancı sıfırla
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
        reel.style.transition = 'none'; // Geçişi sıfırla
        reel.style.transform = 'translateY(0)'; // Başlangıç pozisyonuna getir

        // Her makara için dönme animasyonunda kullanılacak sembolleri oluştur
        // VISIBLE_SYMBOLS_PER_REEL * 2 yeterli bir dönme efekti sağlayacaktır.
        // REEL_STOP_POSITIONS kadar ekleyerek daha uzun dönme animasyonu sağlarız.
        const animationSymbolCount = VISIBLE_SYMBOLS_PER_REEL * 2 + REEL_STOP_POSITIONS; // Yeterli sayıda sembol

        for (let i = 0; i < animationSymbolCount; i++) {
            const symbolData = getRandomSymbolObject();
            reel.appendChild(createSymbolElement(symbolData));
        }

        // Makaraların duracağı son VISIBLE_SYMBOLS_PER_REEL kadar sembolü belirle
        const reelFinalSymbols = [];
        for (let i = 0; i < VISIBLE_SYMBOLS_PER_REEL; i++) {
            const finalSymbol = getRandomSymbolObject();
            reelFinalSymbols.push(finalSymbol);
            finalResultMatrix[reelIndex][i] = finalSymbol; // Sonuç matrisine kaydet
        }

        // Animasyon bitiminde doğru sembollerin görünmesi için son sembolleri reel'in sonuna ekle
        reelFinalSymbols.forEach(symbolData => {
            reel.appendChild(createSymbolElement(symbolData));
        });

        // Animasyonun duracağı hedef pozisyonu hesapla
        // (animationSymbolCount - VISIBLE_SYMBOLS_PER_REEL) * SYMBOL_HEIGHT, animasyon sembollerinin bittiği yer.
        // Aslında reelFinalSymbols'ın başladığı yer.
        const finalStopY = (animationSymbolCount) * SYMBOL_HEIGHT;

        const spinDuration = 1500 + (reelIndex * 300); // Makara bazlı farklı durma süreleri
        const stopDelay = reelIndex * 150; // Makara bazlı farklı başlangıç gecikmeleri

        setTimeout(() => {
            reel.style.transition = `transform ${spinDuration / 1000}s cubic-bezier(0.25, 0.1, 0.25, 1)`;
            reel.style.transform = `translateY(-${finalStopY}px)`; // Yukarı doğru kaydır

            reel.addEventListener('transitionend', function handler() {
                completedReels++;
                if (completedReels === reels.length) {
                    isSpinning = false;
                    spinSound.pause();
                    spinSound.currentTime = 0;

                    // Animasyon bittikten sonra makarayı temizle ve sadece son duran sembolleri yerleştir
                    reels.forEach((r, i) => {
                        r.style.transition = 'none'; // Geçişi kapat ki hemen pozisyona atlasın
                        r.innerHTML = ''; // Tüm sembolleri temizle
                        finalResultMatrix[i].forEach(symbolData => {
                            r.appendChild(createSymbolElement(symbolData)); // Doğru sembolleri ekle
                        });
                        r.style.transform = `translateY(0px)`; // En üste sıfırla (sadece görünür sembolleri tutmak için)
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
function checkWin(currentSymbolsMatrix) { // currentSymbolsMatrix: 4 makara x 3 görünür sembol
    let totalWin = 0;
    let maxMultiplier = 1; // Düşen çarpanlar içinde en yükseği
    const winningElementsToHighlight = new Set(); // Kazanan sembollerin reel elementlerini tutacak

    // Çarpan sembollerini kontrol et
    currentSymbolsMatrix.forEach((reelSymbols, reelIndex) => {
        reelSymbols.forEach((symbolData, rowIndex) => {
            if (symbolData && symbolData.id.startsWith('bonus_') && symbolData.multiplier) {
                maxMultiplier = Math.max(maxMultiplier, symbolData.multiplier);
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
        transformWinningSymbols(freeSpinBonusElements, true); // Free spin sembollerini özel olarak dönüştür
        updateUI();
        return; // Free spin tetiklendiyse başka kazanç arama
    }


    // Payline kontrolü
    paylines.forEach((paylineConfig, paylineIndex) => {
        const lineSymbols = [];
        const currentPaylineSymbolPositions = []; // Bu paylinedaki sembollerin pozisyonları

        // Her makaradan, payline konfigürasyonundaki ilgili sembolü al
        paylineConfig.forEach((rowIndex, reelIndex) => {
            // currentSymbolsMatrix[reelIndex] makaranın anlık görünen sembollerini içerir (3 adet)
            // rowIndex, bu 3 sembol içindeki sıradır.
            const symbolData = currentSymbolsMatrix[reelIndex][rowIndex];
            lineSymbols.push(symbolData ? symbolData.id : null);
            currentPaylineSymbolPositions.push({ reelIndex: reelIndex, rowIndex: rowIndex });
        });

        const firstSymbolId = lineSymbols[0];
        // İlk sembol bonus sembolü ise veya yoksa bu payline'ı atla
        if (!firstSymbolId || firstSymbolId.startsWith('bonus_')) return;

        let matchCount = 0;
        for (let i = 0; i < lineSymbols.length; i++) {
            // Wild sembolü (thunder) tüm semboller yerine geçebilir
            if (lineSymbols[i] === firstSymbolId || lineSymbols[i] === 'thunder') {
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

            // Kazanan sembolleri vurgulanacaklar listesine ekle
            for(let i = 0; i < matchCount; i++) { // Sadece eşleşen sembolleri ekle
                winningElementsToHighlight.add(currentPaylineSymbolPositions[i]);
            }
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
        lastWinSpan.textContent = '0.00';
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
        // reelElement.children, anlık DOM durumunu yansıtır, doğru sembol div'ini hedeflemeliyiz.
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
function transformWinningSymbols(elementsToTransform, isFreeSpin = false) {
    elementsToTransform.forEach(el => {
        const reelElement = reels[el.reelIndex];
        const symbolDiv = reelElement.children[el.rowIndex]; // Anlık DOM'daki div'i hedefle
        if (symbolDiv) {
            if (isFreeSpin) {
                symbolDiv.innerHTML = '✨'; // Parlayan efekt
                symbolDiv.style.fontSize = '3em';
                symbolDiv.style.color = '#87CEEB';
                symbolDiv.style.textShadow = '2px 2px 5px rgba(0,0,0,0.7)';
                symbolDiv.style.backgroundImage = 'none';
            } else {
                symbolDiv.innerHTML = '💰';
                symbolDiv.style.backgroundImage = 'none';
                symbolDiv.style.fontSize = '3em';
                symbolDiv.style.color = '#FFD700';
                symbolDiv.style.textShadow = '2px 2px 5px rgba(0,0,0,0.7)';
            }
        }
    });

    if (symbolResetTimeout) clearTimeout(symbolResetTimeout);
    symbolResetTimeout = setTimeout(() => {
        resetReelSymbols();
    }, 1500); // 1.5 saniye sonra sembolleri sıfırla
}

// Tüm makaraların sembollerini başlangıç durumuna (son çevirmedeki semboller) döndür
function resetReelSymbols() {
    reels.forEach((reel, reelIndex) => {
        reel.innerHTML = ''; // İçeriği temizle
        if (lastSpinSymbolsMatrix[reelIndex] && lastSpinSymbolsMatrix[reelIndex].length > 0) {
            lastSpinSymbolsMatrix[reelIndex].forEach(symbolData => {
                reel.appendChild(createSymbolElement(symbolData)); // Doğru eleman oluşturma
            });
        } else { // Eğer henüz spin yapılmadıysa veya hata varsa, rastgele semboller göster
            for(let i = 0; i < VISIBLE_SYMBOLS_PER_REEL; i++) {
                reel.appendChild(createSymbolElement(getRandomSymbolObject()));
            }
        }
        reel.classList.remove('highlight'); // Emin olmak için highlight'ı kaldır
        reel.style.transform = `translateY(0px)`; // Pozisyonu sıfırla
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
    if (!isSpinning && freeSpins === 0) {
        if (currentBet + 10 <= balance) { // Bakiyeyi aşmamasını sağla
            currentBet += 10;
        } else {
            currentBet = Math.max(10, balance); // En az 10 TL bahis olsun, bakiyeden fazla olmasın
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
        window.location.href = '../lobby.html'; // Ana lobi sayfasına yönlendir
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
            reel.appendChild(createSymbolElement(symbolData)); // Sembol div'ini oluşturup reel'e ekle
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
