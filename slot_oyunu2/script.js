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
const backToLobbyButton = document.getElementById('backToLobbyButton');

// Yeni: Ödeme Çizgisi Ayarları DOM Elementleri
const paylineSettingsButton = document.getElementById('paylineSettingsButton');
const paylineSettingsPopup = document.getElementById('paylineSettingsPopup');
const closePaylineSettingsPopupBtn = document.getElementById('closePaylineSettingsPopup');
const paylineOptionsGrid = document.getElementById('paylineOptions');
const savePaylineSettingsBtn = document.getElementById('savePaylineSettings');

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

// YENİ: Slot Sembolleri Tanımları (Zeus Teması)
const symbols = [
    { id: 'zeus', img: '../assets/images/symbol_zeus.png', value: 100 },
    { id: 'pegasus', img: '../assets/images/symbol_pegasus.png', value: 80 },
    { id: 'eagle', img: '../assets/images/symbol_eagle.png', value: 60 },
    { id: 'helmet', img: '../assets/images/symbol_helmet.png', value: 40 },
    { id: 'vase', img: '../assets/images/symbol_vase.png', value: 30 },
    { id: 'coin', img: '../assets/images/symbol_coin.png', value: 20 },
    { id: 'thunder', img: '../assets/images/symbol_thunder.png', value: 15 },
    { id: 'cardA', img: '../assets/images/symbol_card_a.png', value: 10 },
    { id: 'cardK', img: '../assets/images/symbol_card_k.png', value: 8 },
    { id: 'cardQ', img: '../assets/images/symbol_card_q.png', value: 6 },
    { id: 'cardJ', img: '../assets/images/symbol_card_j.png', value: 4 },
    { id: 'bonus_fs', img: '../assets/images/bonus_symbol.png' }, // Free Spin bonus sembolü
    { id: 'bonus_3x', img: '../assets/images/bonus_3x.png', multiplier: 3 },
    { id: 'bonus_5x', img: '../assets/images/bonus_5x.png', multiplier: 5 },
    { id: 'bonus_10x', img: '../assets/images/bonus_10x.png', multiplier: 10 },
    { id: 'bonus_20x', img: '../assets/images/bonus_20x.png', multiplier: 20 },
    { id: 'bonus_50x', img: '../assets/images/bonus_50x.png', multiplier: 50 },
    { id: 'bonus_100x', img: '../assets/images/bonus_100x.png', multiplier: 100 },
    { id: 'bonus_1000x', img: '../assets/images/bonus_1000x.png', multiplier: 1000 }
];

// Sembol ID'lerini resim yollarına eşleyen map oluştur
const symbolImagesMap = new Map(symbols.map(s => [s.id, s.img]));

// Sembollerin nadirlik ağırlıkları (bonuslar hariç - onlar ayrı ele alınacak)
const weightedSymbols = [
    'zeus', 'zeus', // Daha nadir
    'pegasus', 'pegasus', 'pegasus',
    'eagle', 'eagle', 'eagle', 'eagle',
    'helmet', 'helmet', 'helmet', 'helmet',
    'vase', 'vase', 'vase', 'vase', 'vase',
    'coin', 'coin', 'coin', 'coin', 'coin',
    'thunder', 'thunder', 'thunder', 'thunder', 'thunder', 'thunder',
    'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA',
    'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK',
    'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ',
    'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ' // Daha sık
];

// Bonus sembollerini ayrı bir weighted listeye ekle, böylece free spin sembolü gelme olasılığı ayarlanabilir.
const weightedBonusSymbols = [
    'bonus_fs', 'bonus_fs', // Free spin sembolü biraz daha nadir
    'bonus_3x', 'bonus_5x', 'bonus_10x', // Çarpanlar
    'bonus_20x', 'bonus_50x', 'bonus_100x',
    'bonus_1000x' // Çok nadir çarpan
];


const currencySymbol = '💰';

const numRows = 5;
const numCols = 6;
const numReels = numRows * numCols;

// YENİ: Line Sistemi Paytable (Örnek çarpanlar - detaylı ayarlanabilir)
// Kaç tane aynı sembolden gelince bahsin kaç katını verecek
const paytable = {
    'zeus': { 3: 5, 4: 20, 5: 100, 6: 500 },
    'pegasus': { 3: 4, 4: 15, 5: 70, 6: 300 },
    'eagle': { 3: 3, 4: 10, 5: 50, 6: 200 },
    'helmet': { 3: 2, 4: 8, 5: 30, 6: 100 },
    'vase': { 3: 2, 4: 8, 5: 30, 6: 100 },
    'coin': { 3: 1.5, 4: 6, 5: 25, 6: 80 },
    'thunder': { 3: 1.5, 4: 6, 5: 25, 6: 80 },
    'cardA': { 3: 0.5, 4: 2, 5: 10, 6: 40 },
    'cardK': { 3: 0.5, 4: 2, 5: 10, 6: 40 },
    'cardQ': { 3: 0.4, 4: 1.5, 5: 8, 6: 30 },
    'cardJ': { 3: 0.4, 4: 1.5, 5: 8, 6: 30 }
};


// YENİ: Ödeme Çizgileri Tanımları (9 Adet - 5x6 ızgaraya göre)
// Her bir dizi, makara indekslerini temsil eder (0'dan 29'a kadar)
// Bu sadece bir örnek, görseldeki gibi çizgileri buraya manuel olarak tanımlamanız gerekir.
// Index = row * numCols + col
const allPaylines = [
    // Çizgi 1 (Düz Orta)
    [6, 7, 8, 9, 10, 11],
    // Çizgi 2 (En Üst Düz)
    [0, 1, 2, 3, 4, 5],
    // Çizgi 3 (En Alt Düz)
    [24, 25, 26, 27, 28, 29],
    // Çizgi 4 (V Şekli)
    [0, 7, 14, 21, 28, 23], // Örnek, görseldeki gibi ayarlayın
    // Çizgi 5 (Ters V Şekli)
    [24, 19, 14, 9, 4, 5], // Örnek, görseldeki gibi ayarlayın
    // Çizgi 6 (Zigzag 1)
    [0, 1, 8, 9, 16, 17], // Örnek
    // Çizgi 7 (Zigzag 2)
    [5, 4, 11, 10, 17, 16], // Örnek
    // Çizgi 8 (Merkez Üst)
    [1, 7, 13, 19, 25, 26], // Örnek
    // Çizgi 9 (Merkez Alt)
    [29, 23, 17, 11, 5, 0] // Örnek
    // Görseldeki çizgileri buraya doğru indexlerle tek tek yazmanız GEREKİR!
    // Örneğin, 1. satır 1. sütun = 0, 1. satır 2. sütun = 1, ... 2. satır 1. sütun = 6 vb.
];

let activePaylines = JSON.parse(localStorage.getItem('zeusSlotActivePaylines')) || Array.from({ length: allPaylines.length }, (_, i) => i); // Varsayılan olarak tüm çizgiler aktif

// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    balanceDisplay.textContent = balance.toFixed(2);
    betAmountDisplay.textContent = betAmount;
    freeSpinsCountDisplay.textContent = freeSpins;

    if (freeSpins > 0) {
        decreaseBetBtn.disabled = true;
        increaseBetBtn.disabled = true;
        paylineSettingsButton.disabled = true; // Free spin varken çizgi değiştirilemez
    } else {
        decreaseBetBtn.disabled = false;
        increaseBetBtn.disabled = false;
        paylineSettingsButton.disabled = false;
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
        img.src = symbolImagesMap.get(symbolKey); // symbolImages yerine map kullanıldı
        img.alt = symbolKey;
        reelElement.innerHTML = '';
        reelElement.appendChild(img);
        reelElement.style.fontSize = '';
    }
}

// Rastgele Sembol Alma Fonksiyonu
function getRandomSymbolKey() {
    // Normal semboller mi yoksa bonus sembolü mü gelecek?
    // Belirli bir olasılıkla bonus sembolü gelsin (örn: %10 ihtimalle)
    const randomChance = Math.random();
    if (randomChance < 0.15) { // %15 ihtimalle bonus sembolü gelsin
        return weightedBonusSymbols[Math.floor(Math.random() * weightedBonusSymbols.length)];
    }
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
    resetReelSymbols(); // Yeni spin öncesi makaraları sıfırla

    if (symbolResetTimeout) clearTimeout(symbolResetTimeout);

    if (freeSpins === 0) {
        balance -= betAmount;
    } else {
        freeSpins--;
    }

    updateUI();

    if (freeSpins > 0) {
        messageDisplay.textContent = `FREE SPIN! Kalan: ${freeSpins}`;
        messageDisplay.style.color = '#FFD700';
    } else {
        messageDisplay.textContent = 'Dönüyor...';
        messageDisplay.style.color = '#B22222';
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


// YENİ: Kazançları Kontrol Eden Fonksiyon (Line Sistemi)
function checkWin(resultSymbols) {
    let totalWin = 0;
    let totalMultiplier = 1; // Çarpan bonuslarından gelen toplam çarpan
    let overallWinningReelIndexes = new Set();
    let bonusFSSymbolCount = 0;
    const bonusFSSymbolIndexes = [];
    const collectedMultiplierBonuses = [];

    // Bonus sembollerini ve çarpan bonuslarını topla
    resultSymbols.forEach((symbolKey, index) => {
        if (symbolKey === 'bonus_fs') {
            bonusFSSymbolCount++;
            bonusFSSymbolIndexes.push(index);
        } else {
            const symbolData = symbols.find(s => s.id === symbolKey);
            if (symbolData && symbolData.multiplier) {
                collectedMultiplierBonuses.push(symbolData.multiplier);
            }
        }
    });

    // Free Spin Bonusu Tetiklemesi (4 veya daha fazla bonus_fs sembolü)
    if (bonusFSSymbolCount >= 4) {
        const initialFreeSpins = 10;
        freeSpins += initialFreeSpins;
        messageDisplay.textContent = `ZEUS'UN LÜTFU! ${initialFreeSpins} FREE SPIN KAZANDIN! ⚡`;
        messageDisplay.style.color = '#FFD700';
        if (!isMuted) {
            winSound.pause();
            winSound.currentTime = 0;
            bonusSound.currentTime = 0;
            bonusSound.play();
        }
        highlightWinningReels(bonusFSSymbolIndexes);
    }

    // Normal sembol kazançlarını kontrol et (aktif ödeme çizgileri üzerinde)
    activePaylines.forEach(paylineIndex => {
        const payline = allPaylines[paylineIndex];
        if (!payline) return; // Geçersiz çizgi indeksi kontrolü

        // Her çizgi için kazançları kontrol et
        // İlk sembolü al
        const firstSymbolKey = resultSymbols[payline[0]];
        // Bonus sembolleri veya para sembolleri kazanç hattında geçerli değildir
        if (!paytable[firstSymbolKey]) return;

        let currentStreak = 0;
        let winningLineIndexes = [];

        for (let i = 0; i < payline.length; i++) {
            const currentIndex = payline[i];
            const symbolOnLine = resultSymbols[currentIndex];

            if (symbolOnLine === firstSymbolKey) {
                currentStreak++;
                winningLineIndexes.push(currentIndex);
            } else {
                break; // Semboller farklılaştığında zinciri kır
            }
        }

        // Minimum 3 sembol ve o streak için paytable'da bir kazanç varsa
        if (currentStreak >= 3 && paytable[firstSymbolKey] && paytable[firstSymbolKey][currentStreak]) {
            const multiplier = paytable[firstSymbolKey][currentStreak];
            const lineWin = betAmount * multiplier;
            totalWin += lineWin;
            winningLineIndexes.forEach(idx => overallWinningReelIndexes.add(idx));
        }
    });

    // Çarpan bonuslarını topla ve kazanca uygula
    if (collectedMultiplierBonuses.length > 0) {
        totalMultiplier = collectedMultiplierBonuses.reduce((sum, current) => sum + current, 1); // 1 ile başlıyor, toplanacak
    }
    
    // Toplam çarpanı kazanca uygula (bonus_fs tetiklenmemişse)
    if (totalWin > 0) {
        totalWin *= totalMultiplier;
    }

    // Kazanç durumunu göster
    if (totalWin > 0 && bonusFSSymbolCount < 4) { // Bonus 4 taneden az ise normal kazancı göster
        balance += totalWin;
        messageDisplay.textContent = `TEBRİKLER! KAZANDIN! 🎉`;
        messageDisplay.style.color = '#DAA520'; // Altın rengi
        winAmountDisplay.textContent = `Bakiyene ${totalWin.toFixed(2)} TL Eklendi! Toplam: ${balance.toFixed(2)} TL`;
        if (collectedMultiplierBonuses.length > 0) {
            winAmountDisplay.textContent += ` (x${totalMultiplier} Çarpan ile!)`;
        }
        if (!isMuted) {
            winSound.currentTime = 0;
            winSound.play();
        }
        highlightWinningReels(Array.from(overallWinningReelIndexes));
        transformWinningSymbols(Array.from(overallWinningReelIndexes));
    } else if (totalWin === 0 && bonusFSSymbolCount < 4) { // Ne kazanç ne de bonus 4 taneye ulaştı
        messageDisplay.textContent = 'Tekrar Dene! Şansını Bir Sonraki Çevirmede Yakala. 🍀';
        messageDisplay.style.color = '#B22222'; // Kırmızı
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

    // Bonus sembollerini dışarıda bırakıp sıralı bir şekilde sembolleri al
    const regularSymbols = symbols.filter(s => !s.id.startsWith('bonus_'));
    
    // Sembolleri değerine göre büyükten küçüğe sırala (daha değerli olanlar üstte)
    regularSymbols.sort((a, b) => b.value - a.value);

    regularSymbols.forEach(symbol => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('paytable-item');

        const img = document.createElement('img');
        img.src = symbol.img;
        img.alt = symbol.id;
        itemDiv.appendChild(img);

        const title = document.createElement('h4');
        title.textContent = symbol.id.charAt(0).toUpperCase() + symbol.id.slice(1).replace('card', 'Kart '); // "cardA" -> "Kart A"
        itemDiv.appendChild(title);

        const ul = document.createElement('ul');
        const symbolPaytable = paytable[symbol.id];
        if (symbolPaytable) {
            for (const count in symbolPaytable) {
                if (symbolPaytable.hasOwnProperty(count)) {
                    const li = document.createElement('li');
                    li.textContent = `${count}x: ${symbolPaytable[count]} Kat`;
                    ul.appendChild(li);
                }
            }
        }
        itemDiv.appendChild(ul);
        paytableInfoDisplay.appendChild(itemDiv);
    });
}

// YENİ: Ödeme çizgisi ayarları popup'ını doldur
function populatePaylineSettings() {
    paylineOptionsGrid.innerHTML = ''; // Önceki seçenekleri temizle

    allPaylines.forEach((payline, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('payline-option');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `payline-${index}`;
        checkbox.value = index;
        checkbox.checked = activePaylines.includes(index); // Kullanıcının aktif çizgilerine göre işaretle

        const label = document.createElement('label');
        label.htmlFor = `payline-${index}`;
        label.textContent = `Çizgi ${index + 1}`; // 1'den başlayarak göster

        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(label);
        paylineOptionsGrid.appendChild(optionDiv);
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
    if (event.target === paylineSettingsPopup) { // Yeni payline popup'ı için
        paylineSettingsPopup.style.display = 'none';
    }
});

// Mute butonu olay dinleyicisi
muteButton.addEventListener('click', toggleMute);

// Geri Dön butonu olay dinleyicisi
backToLobbyButton.addEventListener('click', () => {
    window.location.href = '../lobby.html'; // Lobiye geri dön
});

// YENİ: Ödeme çizgisi ayarları butonu olay dinleyicileri
paylineSettingsButton.addEventListener('click', () => {
    populatePaylineSettings(); // Ayarları doldur
    paylineSettingsPopup.style.display = 'block';
});

closePaylineSettingsPopupBtn.addEventListener('click', () => {
    paylineSettingsPopup.style.display = 'none';
});

savePaylineSettingsBtn.addEventListener('click', () => {
    const selectedPaylines = [];
    document.querySelectorAll('#paylineOptions input[type="checkbox"]:checked').forEach(checkbox => {
        selectedPaylines.push(parseInt(checkbox.value));
    });
    
    if (selectedPaylines.length === 0) {
        alert('En az bir ödeme çizgisi seçmelisin!');
        return;
    }

    activePaylines = selectedPaylines;
    localStorage.setItem('zeusSlotActivePaylines', JSON.stringify(activePaylines));
    paylineSettingsPopup.style.display = 'none';
    messageDisplay.textContent = `Ödeme çizgileri güncellendi: ${activePaylines.length} aktif.`;
    messageDisplay.style.color = '#4CAF50';
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
    });
});
