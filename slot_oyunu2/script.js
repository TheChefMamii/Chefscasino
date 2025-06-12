// DOM Elementlerini Seç
const reels = document.querySelectorAll('.reel');
const spinButton = document.getElementById('spinButton');
const autoSpinButton = document.getElementById('autoSpinButton'); // Yeni: Otomatik Çevirme Butonu
const autoSpinInput = document.getElementById('autoSpinCount'); // Yeni: Otomatik Çevirme Sayısı Inputu
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

// Ses Elementleri (Doğrudan JavaScript içinde oluşturuldu ve Zeus isimleri kullanıldı)
const backgroundMusic = new Audio('../assets/sounds/zeus_background_music.mp3');
const spinSound = new Audio('../assets/sounds/zeus_spin.mp3');
const winSound = new Audio('../assets/sounds/zeus_win.mp3');
const bonusSound = new Audio('../assets/sounds/zeus_bonus.mp3'); // Bonus Zeus sesi için

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

// Otomatik Çevirme Değişkenleri
let isAutoSpinning = false;
let autoSpinCount = 0; // Otomatik çevrilecek spin sayısı
let currentAutoSpin = 0; // Mevcut çevrilen spin sayısı
let autoSpinTimeout; // Spinler arası bekleme için timeout

// Ses Seviyeleri ve Durum
let isMuted = false;

// Ses seviyelerini ayarla (varsayılan olarak kısık başlar)
backgroundMusic.volume = 0.2; // Arkaplan müziğinin sesini biraz kısık tut
spinSound.volume = 0.6;
winSound.volume = 0.8;
bonusSound.volume = 0.9;

backgroundMusic.loop = true; // Arkaplan müziği sürekli dönsün

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
    { id: 'zeus_scatter', img: '../assets/images/zeus_scatter.png' }, // Free Spin bonus sembolü (ID VE RESİM YOLU GÜNCEL)
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
// KAZANÇ OLASILIĞI ARTIRILDI: Değerli sembollerin tekrar sayıları yükseltildi
const weightedSymbols = [
    'zeus', 'zeus', 'zeus', 'zeus', 'zeus', // Zeus daha sık gelsin (5 adet - ÖNCE 4 ADETTİ)
    'pegasus', 'pegasus', 'pegasus', 'pegasus', 'pegasus', 'pegasus', // Pegasus daha sık (6 adet - ÖNCE 5 ADETTİ)
    'eagle', 'eagle', 'eagle', 'eagle', 'eagle', 'eagle', 'eagle', // Eagle daha sık (7 adet - ÖNCE 6 ADETTİ)
    'helmet', 'helmet', 'helmet', 'helmet', 'helmet', 'helmet', 'helmet', 'helmet', 'helmet', // Helmet daha da sık (9 adet - ÖNCE 8 ADETTİ)
    'vase', 'vase', 'vase', 'vase', 'vase', 'vase', 'vase', 'vase', 'vase', // Vase daha da sık (9 adet - ÖNCE 8 ADETTİ)
    'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', 'coin', // Coin çok daha sık (11 adet - ÖNCE 10 ADETTİ)
    'thunder', 'thunder', 'thunder', 'thunder', 'thunder', 'thunder', 'thunder', 'thunder', 'thunder', 'thunder', 'thunder', // Thunder çok daha sık (11 adet - ÖNCE 10 ADETTİ)
    'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA', 'cardA', // CardA biraz daha az (13 adet - ÖNCE 12 ADETTİ - Dengelemek için biraz artırdım ama diğerleri daha çok arttı)
    'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK', 'cardK', // CardK biraz daha az (13 adet - ÖNCE 12 ADETTİ)
    'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', 'cardQ', // CardQ hala sık (15 adet - ÖNCE 14 ADETTİ)
    'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ', 'cardJ'  // CardJ hala sık (15 adet - ÖNCE 14 ADETTİ)
];

// Free Spin bonus sembollerini ayrı bir weighted listeye ekle
// ZEUS SCATTER GELME OLASILIĞI ARTIRILDI!
const weightedFreeSpinSymbols = [
    'zeus_scatter', 'zeus_scatter', 'zeus_scatter', 'zeus_scatter', 'zeus_scatter', 'zeus_scatter', 'zeus_scatter' // Free spin sembolü daha da sık gelsin (7 adet - ÖNCE 5 ADETTİ)
];

// Çarpan sembollerini ayrı bir weighted listeye ekle (daha düşük çarpanların gelme olasılığı artırıldı, yüksekler nadirleştirildi)
const weightedMultiplierSymbols = [
    'bonus_3x', 'bonus_3x', 'bonus_3x', 'bonus_3x', 'bonus_3x', 'bonus_3x', 'bonus_3x', 'bonus_3x', // 3x daha da çok sık (8 adet - ÖNCE 6 ADETTİ)
    'bonus_5x', 'bonus_5x', 'bonus_5x', 'bonus_5x', 'bonus_5x', // 5x daha sık (5 adet - ÖNCE 4 ADETTİ)
    'bonus_10x', 'bonus_10x', 'bonus_10x', // 10x biraz daha sık (3 adet - ÖNCE 3 ADETTİ - AYNI KALDI)
    'bonus_20x', // 20x hala nadir (1 adet - ÖNCE 2 ADETTİ - AZALTILDI)
    'bonus_50x', // 50x çok nadir (1 adet - DEĞİŞMEDİ)
    'bonus_100x', // 100x ultra nadir (1 adet - DEĞİŞMEDİ)
    'bonus_1000x' // Efsanevi nadir (1 adet - DEĞİŞMEDİ)
];

const currencySymbol = '💰';

const numRows = 5;
const numCols = 6;
const numReels = numRows * numCols;

// KAZANÇ ÇARPANLARI HAFİF DÜŞÜRÜLDÜ!
const paytable = {
    'zeus': { 3: 4, 4: 15, 5: 80, 6: 400 }, // Düşürüldü
    'pegasus': { 3: 3, 4: 12, 5: 60, 6: 250 }, // Düşürüldü
    'eagle': { 3: 2.5, 4: 8, 5: 40, 6: 180 }, // Düşürüldü
    'helmet': { 3: 1.5, 4: 6, 5: 25, 6: 80 }, // Düşürüldü
    'vase': { 3: 1.5, 4: 6, 5: 25, 6: 80 }, // Düşürüldü
    'coin': { 3: 1, 4: 4, 5: 20, 6: 60 }, // Düşürüldü
    'thunder': { 3: 1, 4: 4, 5: 20, 6: 60 }, // Düşürüldü
    'cardA': { 3: 0.3, 4: 1.5, 5: 8, 6: 30 }, // Düşürüldü
    'cardK': { 3: 0.3, 4: 1.5, 5: 8, 6: 30 }, // Düşürüldü
    'cardQ': { 3: 0.2, 4: 1, 5: 6, 6: 25 }, // Düşürüldü
    'cardJ': { 3: 0.2, 4: 1, 5: 6, 6: 25 } // Düşürüldü
};


// GÜNCELLENDİ: SADECE 5 ADET DÜZ YATAY ÖDEME ÇİZGİSİ (Her satır bir çizgi)
const allPaylines = [
    [0, 1, 2, 3, 4, 5],      // 1. Satır
    [6, 7, 8, 9, 10, 11],    // 2. Satır
    [12, 13, 14, 15, 16, 17], // 3. Satır
    [18, 19, 20, 21, 22, 23], // 4. Satır
    [24, 25, 26, 27, 28, 29]  // 5. Satır
];

let activePaylines = JSON.parse(localStorage.getItem('zeusSlotActivePaylines')) || Array.from({ length: allPaylines.length }, (_, i) => i); // Varsayılan olarak tüm çizgiler aktif

// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    balanceDisplay.textContent = balance.toFixed(2);
    betAmountDisplay.textContent = betAmount;
    freeSpinsCountDisplay.textContent = freeSpins;

    // Otomatik çevirme butonu metnini ve durumunu güncelle
    if (isAutoSpinning) {
        autoSpinButton.textContent = `DURDUR (${autoSpinCount - currentAutoSpin}/${autoSpinCount})`;
        autoSpinInput.disabled = true; // Otomatik çevirme sırasında inputu devre dışı bırak
    } else {
        autoSpinButton.textContent = "OTOMATİK ÇEVİR";
        autoSpinInput.disabled = false;
    }

    if (freeSpins > 0) {
        decreaseBetBtn.disabled = true;
        increaseBetBtn.disabled = true;
        paylineSettingsButton.disabled = true;
        spinButton.disabled = isSpinning; // Free spin sırasında manuel spin hala kontrol edilebilir
        autoSpinInput.disabled = true; // Free spin varken de input devre dışı kalsın
        autoSpinButton.disabled = isSpinning; // Free spin varken otomatik çevirme başlatılamaz/durdurulamaz (spin devam ediyorsa)
    } else {
        // Free spin yoksa normal kontrol
        decreaseBetBtn.disabled = isSpinning || isAutoSpinning;
        increaseBetBtn.disabled = isSpinning || isAutoSpinning;
        paylineSettingsButton.disabled = isSpinning || isAutoSpinning;
        spinButton.disabled = isSpinning || isAutoSpinning;
        autoSpinButton.disabled = isSpinning;
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
        img.src = symbolImagesMap.get(symbolKey);
        img.alt = symbolKey;
        reelElement.innerHTML = '';
        reelElement.appendChild(img);
        reelElement.style.fontSize = '';
    }
}

// GÜNCELLENDİ: Rastgele Sembol Alma Fonksiyonu (Olasılıklar ayarlandı)
function getRandomSymbolKey() {
    const randomChance = Math.random();

    // Free spin durumunda: Hem normal semboller, hem zeus_scatter, hem de çarpan sembolleri düşebilir.
    if (freeSpins > 0) {
        // Çarpan ve Bonus (FS) gelme olasılığını biraz artırdık free spin modunda
        if (randomChance < 0.70) { // %70 ihtimalle normal sembol (ÖNCE %75'Tİ - AZALTILDI)
            return weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
        } else { // %30 ihtimalle bonus sembolü (FS veya çarpan) (ÖNCE %25'Tİ - ARTIRILDI)
            const bonusTypeChance = Math.random();
            if (bonusTypeChance < 0.55) { // Bu %30'un %55'i (yani toplamda %16.5) Zeus scatter sembolü (ÖNCE %50'Tİ - ARTIRILDI)
                return weightedFreeSpinSymbols[Math.floor(Math.random() * weightedFreeSpinSymbols.length)];
            } else { // Bu %30'un %45'i (yani toplamda %13.5) çarpan sembolü (ÖNCE %50'Tİ - AZALTILDI)
                return weightedMultiplierSymbols[Math.floor(Math.random() * weightedMultiplierSymbols.length)];
            }
        }
    } else { // Normal spin durumunda: Sadece normal semboller ve zeus_scatter sembolü düşebilir, çarpanlar DÜŞMEZ.
        // Bonus (Free Spin) gelme olasılığını daha da arttırdık (%3'ten %5'e)
        if (randomChance < 0.95) { // %95 ihtimalle normal sembol (ÖNCE %97'Tİ - AZALTILDI)
            return weightedSymbols[Math.floor(Math.random() * weightedSymbols.length)];
        } else { // %5 ihtimalle zeus_scatter sembolü (ÖNCE %3'TÜ - ARTIRILDI)
            return weightedFreeSpinSymbols[Math.floor(Math.random() * weightedFreeSpinSymbols.length)];
        }
    }
}


// Makaraları Döndürme Fonksiyonu
function spinReels() {
    if (isSpinning) {
        return;
    }

    if (freeSpins === 0 && balance < betAmount) {
        messageDisplay.textContent = 'Bakiyen Yetersiz! Bahsi Azalt.';
        stopAutoSpin(); // Otomatik çevirme açıksa durdur
        return;
    }

    winAmountDisplay.textContent = '';
    messageDisplay.textContent = '';
    removeHighlight();
    resetReelSymbols(); // Yeni spin öncesi makaraları sıfırla

    if (highlightTimeout) clearTimeout(highlightTimeout);
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
    autoSpinButton.disabled = true; // Otomatik çevirme butonunu da spin sırasında devre dışı bırak
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
                isSpinning = false; // Spin bitişi
                updateUI(); // Buton durumlarını güncelle

                // Otomatik çevirme mantığı
                if (isAutoSpinning) {
                    currentAutoSpin++;
                    if (freeSpins > 0 || currentAutoSpin < autoSpinCount) {
                        // Eğer free spin varsa veya otomatik çevirme sayısı bitmediyse devam et
                        autoSpinTimeout = setTimeout(spinReels, 2500); // Kazanma mesajı/animasyonu sonrası bekle ve tekrar çevir
                    } else {
                        // Otomatik çevirme sayısı bittiğinde durdur
                        stopAutoSpin();
                        messageDisplay.textContent = `Otomatik çevirme tamamlandı!`;
                        messageDisplay.style.color = '#4CAF50';
                    }
                }
            }
        }, spinDuration);
    });
}

// Otomatik çevirmeyi başlat/durdur
function toggleAutoSpin() {
    if (isAutoSpinning) {
        stopAutoSpin();
    } else {
        startAutoSpin();
    }
}

function startAutoSpin() {
    if (isSpinning) return; // Manuel spin varsa başlatma

    autoSpinCount = parseInt(autoSpinInput.value);
    if (isNaN(autoSpinCount) || autoSpinCount <= 0) {
        messageDisplay.textContent = 'Lütfen geçerli bir otomatik çevirme sayısı girin (min 1).';
        messageDisplay.style.color = '#B22222';
        return;
    }

    // Yetersiz bakiye kontrolü (sadece normal spinler için)
    if (freeSpins === 0 && balance < betAmount * autoSpinCount) {
        messageDisplay.textContent = `Otomatik çevirme için yeterli bakiyen yok! (${(betAmount * autoSpinCount).toFixed(2)} TL gerekli)`;
        messageDisplay.style.color = '#B22222';
        return;
    }

    isAutoSpinning = true;
    currentAutoSpin = 0; // Her başlatıldığında sayacı sıfırla
    updateUI(); // Buton durumlarını güncelle

    // İlk çevirmeyi başlat
    spinReels();
}

function stopAutoSpin() {
    isAutoSpinning = false;
    clearTimeout(autoSpinTimeout); // Bekleyen çevirme varsa iptal et
    updateUI(); // Buton durumlarını güncelle (OTOMATİK ÇEVİR yazısı gelsin)
    messageDisplay.textContent = 'Otomatik çevirme durduruldu.';
    messageDisplay.style.color = '#B22222';
}


// GÜNCELLENDİ: Kazançları Kontrol Eden Fonksiyon (Line Sistemi - Sadece Düz Çizgiler ve Artık Bitişik Kazançları da Tanıyor)
function checkWin(resultSymbols) {
    let totalWin = 0;
    let totalMultiplier = 1;
    let overallWinningReelIndexes = new Set();
    let zeusScatterSymbolCount = 0;
    const zeusScatterSymbolIndexes = [];
    const collectedMultiplierBonuses = [];

    // Bonus sembollerini topla (free spin sembolleri ve çarpanlar)
    resultSymbols.forEach((symbolKey, index) => {
        if (symbolKey === 'zeus_scatter') {
            zeusScatterSymbolCount++;
            zeusScatterSymbolIndexes.push(index);
        } else {
            const symbolData = symbols.find(s => s.id === symbolKey);
            // Sadece free spin modunda çarpanları topla
            if (freeSpins > 0 && symbolData && symbolData.multiplier) {
                collectedMultiplierBonuses.push(symbolData.multiplier);
            }
        }
    });

    // Free Spin Bonusu Tetiklemesi (4 veya daha fazla zeus_scatter sembolü)
    if (zeusScatterSymbolCount >= 4) {
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
        highlightWinningReels(zeusScatterSymbolIndexes);
        updateUI();
        // Eğer otomatik çevirme açıksa, free spin tetiklendiğinde otomatik çevirmeye devam et
        if (isAutoSpinning) {
            setTimeout(spinReels, 2500); // Bonus animasyonu sonrası devam et
        }
        return; // Free spin tetiklenirse, normal kazanç kontrolünü yapma
    }

    // Normal sembol kazançlarını kontrol et (aktif ödeme çizgileri üzerinde)
    activePaylines.forEach(paylineIndex => {
        const payline = allPaylines[paylineIndex];
        if (!payline) return;

        // Her ödeme çizgisi için sembolleri satır olarak al
        const lineSymbols = payline.map(index => resultSymbols[index]);

        let currentSymbol = '';
        let currentStreak = 0;
        let lineWinningIndexes = []; // Bu çizgi için kazanan indexler

        for (let i = 0; i < lineSymbols.length; i++) {
            const symbolOnReel = lineSymbols[i];
            const originalReelIndex = payline[i]; // Reel'in orijinal global indeksi

            // Bonus sembolleri kazanç çizgisi olarak kabul edilmez, ancak çarpan olarak işlenebilir.
            // Bu kısımda sadece ana sembollerin eşleşmesine bakıyoruz.
            if (symbolOnReel.startsWith('bonus_') || symbolOnReel === 'zeus_scatter') {
                // Eğer streak varsa ve bonus sembolü geldiyse, streak'i bitirip kontrol et
                if (currentStreak >= 3 && paytable[currentSymbol] && paytable[currentSymbol][currentStreak]) {
                    const multiplier = paytable[currentSymbol][currentStreak];
                    const lineWin = betAmount * multiplier;
                    totalWin += lineWin;
                    lineWinningIndexes.forEach(idx => overallWinningReelIndexes.add(idx));
                }
                currentSymbol = ''; // Streaki sıfırla
                currentStreak = 0;
                lineWinningIndexes = [];
                continue; // Bir sonraki sembole geç
            }

            if (symbolOnReel === currentSymbol) {
                currentStreak++;
                lineWinningIndexes.push(originalReelIndex);
            } else {
                // Yeni bir sembol başladıysa veya streak bozulduysa, önceki streaki kontrol et
                if (currentStreak >= 3 && paytable[currentSymbol] && paytable[currentSymbol][currentStreak]) {
                    const multiplier = paytable[currentSymbol][currentStreak];
                    const lineWin = betAmount * multiplier;
                    totalWin += lineWin;
                    lineWinningIndexes.forEach(idx => overallWinningReelIndexes.add(idx));
                }
                // Yeni streaki başlat
                currentSymbol = symbolOnReel;
                currentStreak = 1;
                lineWinningIndexes = [originalReelIndex];
            }
        }

        // Döngü bittikten sonra kalan son streaki kontrol et (eğer varsa)
        if (currentStreak >= 3 && paytable[currentSymbol] && paytable[currentSymbol][currentStreak]) {
            const multiplier = paytable[currentSymbol][currentStreak];
            const lineWin = betAmount * multiplier;
            totalWin += lineWin;
            lineWinningIndexes.forEach(idx => overallWinningReelIndexes.add(idx));
        }
    });

    // Toplanmış çarpanları kazanca uygula (sadece kazanç varsa VE free spin modundaysak)
    if (totalWin > 0 && freeSpins > 0 && collectedMultiplierBonuses.length > 0) {
        // Free spin sırasında çarpan gelme olasılığı düşürüldü, bu da çarpanın kendisinin daha nadir gelmesi anlamına gelir.
        // Ama geldiklerinde çarpımı yine de yapmalıyız.
        const combinedMultiplier = collectedMultiplierBonuses.reduce((sum, current) => sum + current, 0);
        if (combinedMultiplier > 0) {
            totalWin *= combinedMultiplier;
            totalMultiplier = combinedMultiplier;
        }
    } else {
        totalMultiplier = 1;
    }

    // Kazanç durumunu göster
    if (totalWin > 0) {
        balance += totalWin;
        messageDisplay.textContent = `TEBRİKLER! KAZANDIN! 🎉`;
        messageDisplay.style.color = '#DAA520';
        let winText = `Bakiyene ${totalWin.toFixed(2)} TL Eklendi!`;
        if (totalMultiplier > 1 && freeSpins > 0) {
            winText += ` (${totalMultiplier}x Çarpan ile!)`;
        }
        winAmountDisplay.textContent = winText;
        if (!isMuted) {
            winSound.currentTime = 0;
            winSound.play();
        }
        highlightWinningReels(Array.from(overallWinningReelIndexes));
        transformWinningSymbols(Array.from(overallWinningReelIndexes));
    } else {
        messageDisplay.textContent = 'Tekrar Dene! Şansını Bir Sonraki Çevirmede Yakala. 🍀';
        messageDisplay.style.color = '#B22222';
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
        // Para sembollerini önceki hallerine döndür, kazanç hattı temizlendikten sonra
        resetReelSymbols();
    }, 1500);
}

// Tüm makaraların sembollerini başlangıç durumuna (son çevirmedeki semboller) döndür
function resetReelSymbols() {
    reels.forEach((reel, index) => {
        if (lastSpinSymbols[index]) {
            setReelSymbol(reel, lastSpinSymbols[index]);
        } else {
            // Eğer lastSpinSymbols boşsa (oyun ilk başladığında), rastgele sembol ata
            setReelSymbol(reel, getRandomSymbolKey());
        }
        reel.classList.remove('highlight');
    });
}

// Paytable bilgisini popup menüye doldur
function populatePaytableInfo() {
    paytableInfoDisplay.innerHTML = '';

    // Bonus sembollerini dışarıda bırakıp sıralı bir şekilde sembolleri al
    const regularSymbols = symbols.filter(s => !s.id.startsWith('bonus_') && s.id !== 'zeus_scatter');

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
        label.textContent = `Çizgi ${index + 1} (Düz)`; // 1'den başlayarak göster ve "Düz" ekle

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
    if (betAmount > 10 && !isSpinning && freeSpins === 0 && !isAutoSpinning) {
        betAmount -= 10;
        updateUI();
    }
});

// Bahis artırma butonu olay dinleyicisi
increaseBetBtn.addEventListener('click', () => {
    if (betAmount < 1000 && !isSpinning && freeSpins === 0 && !isAutoSpinning) {
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
    if (event.target === paylineSettingsPopup) {
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
    if (isSpinning || isAutoSpinning) return; // Çevirme sırasında ayar yapılamaz
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
    autoSpinButton.addEventListener('click', toggleAutoSpin); // Otomatik çevirme butonu olay dinleyicisi

    reels.forEach((reel, index) => {
        const initialSymbol = getRandomSymbolKey();
        setReelSymbol(reel, initialSymbol);
        lastSpinSymbols[index] = initialSymbol;
    });

    updateUI(); // Sayfa ilk yüklendiğinde bakiyeyi göster ve localStorage'dan çek

    // Tarayıcı kısıtlamaları nedeniyle otomatik oynatma her zaman çalışmayabilir.
    // Kullanıcı etkileşimi olmadan ses başlamazsa hata vermemesi için catch bloğu eklendi.
    // Müzik ancak kullanıcı sayfaya tıkladıktan sonra başlayacaktır.
    backgroundMusic.play().catch(e => {
        console.log("Arkaplan müziği otomatik oynatılamadı (tarayıcı kısıtlaması):", e);
        messageDisplay.textContent = "Müziği başlatmak için spin butonuna tıklayın veya ekrana dokunun.";
    });
});
