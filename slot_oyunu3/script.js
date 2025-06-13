// DOM Elementlerini Seç
const reels = document.querySelectorAll('.reel');
const spinButton = document.getElementById('spinButton');
const messageDisplay = document.getElementById('message');
const balanceDisplay = document.getElementById('balance');
const betAmountDisplay = document.getElementById('betAmount');
const winAmountDisplay = document.getElementById('winAmount');
const activeLinesCountDisplay = document.getElementById('activeLinesCount'); // Yeni

const betMinusButton = document.getElementById('betMinusButton'); // Yeni ID
const betPlusButton = document.getElementById('betPlusButton'); // Yeni ID
const maxBetButton = document.getElementById('maxBetButton'); // Yeni
const autoPlayButton = document.getElementById('autoPlayButton'); // Yeni
const infoButton = document.getElementById('infoButton');
const infoPopup = document.getElementById('infoPopup');
const closeInfoPopupBtn = document.getElementById('closeInfoPopup');
const paytableInfoDisplay = document.getElementById('paytableInfo');
const muteButton = document.getElementById('muteButton');
const backToLobbyButton = document.getElementById('backToLobbyButton');

// Ödeme Hattı Butonları
const lineButtons = document.querySelectorAll('.line-btn'); // Yeni
const bonusGamePopup = document.getElementById('bonusGamePopup'); // Yeni
const closeBonusGamePopupBtn = document.getElementById('closeBonusGamePopup'); // Yeni
const safesContainer = document.querySelector('.safes-container'); // Yeni
const bonusGameMessage = document.getElementById('bonusGameMessage'); // Yeni
const currentBonusWinDisplay = document.getElementById('currentBonusWin'); // Yeni

// Ses Elementleri
const backgroundMusic = document.getElementById('backgroundMusic');
const spinSound = document.getElementById('spinSound');
const winSound = document.getElementById('winSound');
const bonusSound = document.getElementById('bonusSound');
const safeOpenSound = document.getElementById('safeOpenSound'); // Yeni
const bombSound = document.getElementById('bombSound'); // Yeni

// Oyun Değişkenleri
let activeUser = localStorage.getItem('hansellCasinoActiveUser');
let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = '../index.html';
}

let balance = users[activeUser].balance;
let betAmount = 10;
let isSpinning = false;
let highlightTimeout;
let lastSpinSymbols = [];
let activeLines = 9; // Varsayılan olarak 9 hat aktif
let currentBonusWin = 0; // Bonus oyunu için kazanılan miktar
let totalBonusSafes = 5; // Bonus oyunundaki kasa sayısı
let bombSafeIndex = -1; // Bombalı kasanın indeksi

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

// Slot Sembolleri (Resident slotuna göre güncellendi)
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

// Sembollerin nadirlik ağırlıkları (Resident'a göre ayarlanabilir)
const weightedSymbols = [
    'resident_tabanca', 'resident_tabanca', 'resident_tabanca', 'resident_tabanca',
    'resident_gazmaskesi', 'resident_gazmaskesi', 'resident_gazmaskesi',
    'resident_defter', 'resident_defter', 'resident_defter',
    'resident_madalya', 'resident_madalya',
    'resident_tufek', 'resident_tufek',
    'resident_apolet',
    'resident_yanginsondurucu', // Wild daha nadir olabilir
    'resident_para', // En nadir
    'resident_kasa' // Bonus da nadir
];

// Ödeme Hatları (5x3 düzen için 9 adet örnek hat)
// Makaralar 0-14 arası indekslenir:
// 0  1  2  3  4
// 5  6  7  8  9
// 10 11 12 13 14
const paylines = {
    1: [[0, 1, 2, 3, 4]], // Ortadan geçen düz hat
    3: [ // 3 Hat
        [0, 1, 2, 3, 4], // Ortadan geçen
        [5, 6, 7, 8, 9], // En üstten geçen
        [10, 11, 12, 13, 14] // En alttan geçen
    ],
    5: [ // 5 Hat
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11, 12, 13, 14],
        [5, 1, 7, 3, 9], // V şekli
        [0, 6, 2, 8, 4]  // Ters V şekli
    ],
    7: [ // 7 Hat
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11, 12, 13, 14],
        [5, 1, 7, 3, 9],
        [0, 6, 2, 8, 4],
        [0, 5, 10, 11, 12], // Sol üstten başlayan L
        [4, 9, 14, 13, 12]  // Sağ üstten başlayan ters L
    ],
    9: [ // 9 Hat (Resident'a özel örnek hatlar)
        [0, 1, 2, 3, 4],     // Orta sıra
        [5, 6, 7, 8, 9],     // Üst sıra
        [10, 11, 12, 13, 14],  // Alt sıra
        [5, 1, 7, 3, 9],     // Zikzak (Yukarıdan Aşağıya)
        [0, 6, 2, 8, 4],     // Zikzak (Aşağıdan Yukarıya)
        [5, 6, 12, 8, 9],    // Üst-orta-üst
        [0, 1, 7, 3, 4],     // Orta-üst-orta
        [10, 11, 7, 13, 14], // Alt-orta-alt
        [0, 6, 12, 8, 4]     // Tüm çapraz
    ]
};


// Resident'ın kazanç tablosu (görselden)
// Ödeme HATLARINA GÖRE düzenlendi (örnek çarpanlar, kendi görselindeki değerlere göre düzenle)
const symbolPaytable = {
    'resident_para': { 3: 200, 4: 1000, 5: 5000 },
    'resident_yanginsondurucu': { 3: 100, 4: 500, 5: 2000 }, // Wild'ın kendi kazancı
    'resident_apolet': { 3: 30, 4: 100, 5: 500 },
    'resident_tufek': { 3: 20, 4: 50, 5: 200 },
    'resident_madalya': { 3: 10, 4: 30, 5: 100 },
    'resident_defter': { 3: 5, 4: 10, 5: 50 },
    'resident_gazmaskesi': { 3: 3, 4: 5, 5: 20 },
    'resident_tabanca': { 3: 2, 4: 3, 5: 10 }
};

const numRows = 3;
const numCols = 5;
const numReels = numRows * numCols; // Şimdi 15 olacak

// Kullanıcı Arayüzünü Güncelleme Fonksiyonu
function updateUI() {
    balanceDisplay.textContent = balance.toFixed(2);
    betAmountDisplay.textContent = betAmount;
    activeLinesCountDisplay.textContent = activeLines; // Yeni
    currentBonusWinDisplay.textContent = currentBonusWin.toFixed(2); // Bonus kazanılanı güncelle

    // Bahis butonları durumu
    betMinusButton.disabled = isSpinning || (betAmount <= 10);
    betPlusButton.disabled = isSpinning || (betAmount >= 1000); // Max bet 1000 TL
    maxBetButton.disabled = isSpinning;

    // Aktif hat butonlarını işaretle
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

// Reel elementine sembolü yerleştiren yardımcı fonksiyon
function setReelSymbol(reelElement, symbolKey) {
    const img = document.createElement('img');
    img.src = symbolImages[symbolKey];
    img.alt = symbolKey;
    reelElement.innerHTML = '';
    reelElement.appendChild(img);
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

    if (balance < betAmount * activeLines) { // Toplam bahis kontrolü
        messageDisplay.textContent = 'Bakiyen Yetersiz! Bahsi veya Hat Sayısını Azalt.';
        messageDisplay.style.color = '#F44336';
        return;
    }

    winAmountDisplay.textContent = '';
    messageDisplay.textContent = 'Dönüyor...';
    messageDisplay.style.color = '#FF4500';
    removeHighlight();
    // Reset reel symbols to initial state after previous win highlight/transform
    reels.forEach((reel, index) => {
        setReelSymbol(reel, lastSpinSymbols[index] || getRandomSymbolKey());
        reel.classList.remove('highlight');
    });

    balance -= betAmount * activeLines; // Toplam bahis düşüldü
    updateUI();

    spinButton.disabled = true;
    isSpinning = true;

    if (!isMuted) {
        spinSound.currentTime = 0;
        spinSound.play();
    }

    let currentSymbols = new Array(numReels);
    let spinningIntervals = [];
    let stoppedReelsCount = 0;

    reels.forEach((reel, index) => {
        const spinDuration = 1500 + (index * 80); // Her makara biraz daha uzun dönsün
        const spinInterval = 70;

        spinningIntervals[index] = setInterval(() => {
            setReelSymbol(reel, getRandomSymbolKey());
        }, spinInterval);

        setTimeout(() => {
            clearInterval(spinningIntervals[index]);
            const finalSymbolKey = getRandomSymbolKey();
            currentSymbols[index] = finalSymbolKey;
            lastSpinSymbols[index] = finalSymbolKey; // Son çevirme sembollerini sakla
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

// --------------------------------------------------------
// ÖNEMLİ: KAZANÇ KONTROLÜ (LINE-BASED) VE BONUS OYUNU LOGİĞİ
// Bu kısım KOMPLE YENİDEN YAZILACAKTIR!
// --------------------------------------------------------
function checkWin(resultSymbols) {
    let totalWin = 0;
    let winningReelIndexes = new Set();
    let bonusSymbolCount = 0;
    let bonusSymbolReelIndexes = [];

    // Bonus sembollerini topla (yerleri fark etmez)
    resultSymbols.forEach((symbol, index) => {
        if (symbol === 'resident_kasa') {
            bonusSymbolCount++;
            bonusSymbolReelIndexes.push(index);
        }
    });

    // Ödeme Hatları Üzerinde Kazanç Kontrolü
    const activePaylines = paylines[activeLines];

    activePaylines.forEach(line => {
        let currentLineWin = 0;
        let lineWinningSymbols = []; // Bu hattaki kazanan sembollerin indeksleri

        // İlk makaradan başlayarak sembolleri kontrol et
        const firstSymbol = resultSymbols[line[0]];
        if (!firstSymbol || firstSymbol === 'resident_kasa') return; // İlk sembol kasa olamaz veya boş olamaz

        let consecutiveCount = 1;
        let matchedSymbol = firstSymbol;
        lineWinningSymbols.push(line[0]);

        // Wild sembolünü ele al
        let isWildUsed = false;
        if (firstSymbol === 'resident_yanginsondurucu') { // Eğer ilk sembol wild ise, ikinciye bak
            matchedSymbol = resultSymbols[line[1]];
            if (!matchedSymbol || matchedSymbol === 'resident_kasa' || matchedSymbol === 'resident_yanginsondurucu') {
                // Eğer ikinci sembol de wild veya bonus ise, bu hattı geçeriz.
                // Wild, ilk sembol olarak kendi başına kazandırmaz, başka sembolü taklit etmeli.
                // Veya Igrosoft mantığında wild'ın kendi kazancı da vardır (bizim paytable'da var).
                // Burada wild'ın kendi kazancını da hesaba katmalıyız eğer 3+ wild arka arkaya gelirse.
                if (firstSymbol === 'resident_yanginsondurucu' && resultSymbols[line[1]] === 'resident_yanginsondurucu' && resultSymbols[line[2]] === 'resident_yanginsondurucu') {
                    // 3 wild arka arkaya gelirse, wild'ın kendi kazancını ver
                    consecutiveCount = 3;
                    matchedSymbol = 'resident_yanginsondurucu';
                    lineWinningSymbols = [line[0], line[1], line[2]];
                } else {
                    return; // Wild tek başına başlangıç sembolü olarak kazanç sağlamaz (şimdilik bu mantıkla)
                }
            } else {
                // İlk sembol wild, ikinci sembol başka bir sembol ise wild o sembolü taklit eder
                isWildUsed = true;
                matchedSymbol = resultSymbols[line[1]];
                lineWinningSymbols.push(line[1]); // İkinci sembol de kazanan kısma eklendi
                consecutiveCount++;
            }
        }
        
        // Makaraları soldan sağa dolaş (ikinciden başlayarak, çünkü ilk zaten kontrol edildi)
        // Eğer ilk sembol wild ise, zaten ikinciden başlamış gibi olduk, o yüzden burada 2'den başlıyoruz
        const startIndex = (isWildUsed && firstSymbol === 'resident_yanginsondurucu') ? 2 : 1; 

        for (let i = startIndex; i < line.length; i++) {
            const currentSymbol = resultSymbols[line[i]];

            // Geçerli sembol eşleşiyorsa VEYA wild ise
            if (currentSymbol === matchedSymbol || currentSymbol === 'resident_yanginsondurucu') {
                consecutiveCount++;
                lineWinningSymbols.push(line[i]);
            } else {
                break; // Eşleşme bozuldu
            }
        }

        // Minimum 3 sembol (Resident kuralı)
        if (consecutiveCount >= 3) {
            // Wild varsa ve matchedSymbol aslında wild değilse (yani wild başka bir sembolü taklit ediyorsa)
            let actualWinningSymbol = matchedSymbol;
            if(matchedSymbol === 'resident_yanginsondurucu' && consecutiveCount >= 3) {
                // Eğer eşleşen sembol wild ise ve 3+ wild yan yana gelmişse, wild'ın kendi kazancı geçerlidir.
                actualWinningSymbol = 'resident_yanginsondurucu';
            } else if (isWildUsed && firstSymbol === 'resident_yanginsondurucu' && matchedSymbol !== 'resident_yanginsondurucu') {
                // Wild başka bir sembolü taklit ediyorsa, kazanan sembol taklit edilen semboldür.
                // Bu kısım biraz karmaşık, wild'ın en iyi kazancı nasıl sağlayacağını bulmak gerek.
                // Şimdilik, sadece ilk eşleşen sembol üzerinden gidelim.
            }
            
            // Gerçek kazanan sembolün çarpanını al
            const payoutInfo = symbolPaytable[actualWinningSymbol];
            if (payoutInfo && payoutInfo[consecutiveCount]) {
                const multiplier = payoutInfo[consecutiveCount];
                const win = betAmount * multiplier;
                totalWin += win;
                lineWinningSymbols.forEach(idx => winningReelIndexes.add(idx)); // Kazanan makaraları işaretle
            }
        }
    });

    // Bonus Oyun Tetikleme
    if (bonusSymbolCount >= 3) { // 3 veya daha fazla kasa bonusu tetikler
        messageDisplay.textContent = `BONUS! Kasaları Aç!`;
        messageDisplay.style.color = '#FFD700';
        if (!isMuted) {
            winSound.pause(); // Normal kazanma sesini durdur
            bonusSound.currentTime = 0;
            bonusSound.play(); // Bonus sesini çal
        }
        highlightWinningReels(bonusSymbolReelIndexes); // Bonus sembollerini vurgula
        setTimeout(() => {
            startBonusGame(); // Bonus oyununu başlat
        }, 1500); // Vurgulama sonrası bonus oyununa geç
        updateUI();
        return; // Normal kazanç kontrolünden çık
    }


    // Normal Kazanç Duyurusu
    if (totalWin > 0) {
        balance += totalWin;
        messageDisplay.textContent = `TEBRİKLER! KAZANDIN! 🎉`;
        messageDisplay.style.color = '#32CD32'; // Yeşil
        winAmountDisplay.textContent = `Bakiyene ${totalWin.toFixed(2)} TL Eklendi! Toplam: ${balance.toFixed(2)} TL`;
        if (!isMuted) {
            winSound.currentTime = 0;
            winSound.play();
        }
        highlightWinningReels(Array.from(winningReelIndexes));
        transformWinningSymbols(Array.from(winningReelIndexes)); // Kazanan sembolleri paraya çevir
    } else {
        messageDisplay.textContent = 'Tekrar Dene! Şansını Bir Sonraki Çevirmede Yakala. 🍀';
        messageDisplay.style.color = '#F44336';
        winAmountDisplay.textContent = '';
    }
    updateUI();
}

// Kazanan makaraları vurgulama (aynı kalabilir)
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

// Makaralardan parlaklığı kaldıran fonksiyon (aynı kalabilir)
function removeHighlight() {
    reels.forEach(reel => {
        reel.classList.remove('highlight');
    });
}

// Kazanan sembolleri para simgesine çevir (ancak bu artık line based olduğu için daha az kullanılacak, belki sadece küçük bir animasyon)
function transformWinningSymbols(winningReelIndexes) {
    winningReelIndexes.forEach(index => {
        // Geçici olarak bir para sembolü gösterilebilir veya sadece highlight kalır
        // setReelSymbol(reels[index], 'resident_para'); // Veya özel bir kazanç efekti
        reels[index].classList.add('won-animation'); // Yeni bir animasyon sınıfı
    });

    if (symbolResetTimeout) clearTimeout(symbolResetTimeout);
    symbolResetTimeout = setTimeout(() => {
        reels.forEach(reel => reel.classList.remove('won-animation'));
        resetReelSymbols(); // Sembolleri eski haline döndür
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

// Paytable bilgisini popup menüye doldur (Resident sembollerine göre güncellenecek)
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
        // İsimleri Türkçe veya daha anlamlı yapabiliriz
        let displayTitle = '';
        if (symbolKey === 'resident_para') displayTitle = 'Para Madalyon';
        else if (symbolKey === 'resident_yanginsondurucu') displayTitle = 'Wild (Yangın Söndürücü)';
        else if (symbolKey === 'resident_apolet') displayTitle = 'Apolet';
        else if (symbolKey === 'resident_tufek') displayTitle = 'Makineli Tüfek';
        else if (symbolKey === 'resident_madalya') displayTitle = 'Madalya';
        else if (symbolKey === 'resident_defter') displayTitle = 'Defter';
        else if (symbolKey === 'resident_gazmaskesi') displayTitle = 'Gaz Maskesi';
        else if (symbolKey === 'resident_tabanca') displayTitle = 'Tabanca';

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
        itemDiv.appendChild(ul);
        paytableInfoDisplay.appendChild(itemDiv);
    });
}

// Ses açma/kapama fonksiyonu (aynı kalabilir)
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
betMinusButton.addEventListener('click', () => {
    if (betAmount > 10 && !isSpinning) {
        betAmount -= 10;
        updateUI();
    }
});

// Bahis artırma butonu olay dinleyicisi
betPlusButton.addEventListener('click', () => {
    if (betAmount < 1000 && !isSpinning) {
        betAmount += 10;
        updateUI();
    }
});

// Maks. Bahis butonu
maxBetButton.addEventListener('click', () => {
    if (!isSpinning) {
        betAmount = 1000; // Maksimum bahis 1000 TL
        activeLines = 9; // Maksimum hat
        updateUI();
    }
});

// Otomatik Oynat butonu (Basit bir aç/kapa)
// Bu özellik için daha karmaşık bir state yönetimi ve interval gerekebilir.
// Şimdilik sadece mesaj verecek.
autoPlayButton.addEventListener('click', () => {
    messageDisplay.textContent = "Otomatik Oynatma Aktif! (Henüz Geliştirilmedi)";
    messageDisplay.style.color = '#ADD8E6'; // Açık mavi
});


// Bilgi butonu olay dinleyicileri (aynı kalabilir)
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
    if (event.target === bonusGamePopup) {
        bonusGamePopup.style.display = 'none';
        // Bonus oyunu bittiğinde bakiyeyi güncelle
        balance += currentBonusWin;
        updateUI();
        currentBonusWin = 0; // Sıfırla
    }
});

// Mute butonu olay dinleyicisi (aynı kalabilir)
muteButton.addEventListener('click', toggleMute);

// Geri Dön butonu olay dinleyicisi (aynı kalabilir)
backToLobbyButton.addEventListener('click', () => {
    window.location.href = '../lobby.html';
});

// Ödeme Hattı Butonları Olay Dinleyicileri
lineButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (!isSpinning) {
            activeLines = parseInt(button.dataset.lines);
            updateUI();
        }
    });
});

// --------------------------------------------------------
// BONUS OYUNU LOGİĞİ
// --------------------------------------------------------
function startBonusGame() {
    currentBonusWin = 0; // Bonus kazancını sıfırla
    safesContainer.innerHTML = ''; // Kasaları temizle
    bombSafeIndex = Math.floor(Math.random() * totalBonusSafes); // Bombalı kasanın indeksi

    for (let i = 0; i < totalBonusSafes; i++) {
        const safeDiv = document.createElement('div');
        safeDiv.classList.add('safe-item');
        safeDiv.dataset.index = i;
        safeDiv.innerHTML = `<img src="../assets/images/resident_kasa.png" alt="Kasa ${i + 1}">`; // Kasa görseli

        safeDiv.addEventListener('click', handleSafeClick);
        safesContainer.appendChild(safeDiv);
    }

    bonusGameMessage.textContent = 'Kasaları açarak ödülleri topla!';
    currentBonusWinDisplay.textContent = '0.00';
    bonusGamePopup.style.display = 'block';
}

function handleSafeClick(event) {
    const clickedSafe = event.currentTarget;
    const safeIndex = parseInt(clickedSafe.dataset.index);

    if (clickedSafe.classList.contains('opened') || clickedSafe.classList.contains('bomb')) {
        return; // Zaten açılmış veya bomba ise tekrar tıklama
    }

    clickedSafe.classList.add('opened');
    clickedSafe.removeEventListener('click', handleSafeClick); // Tekrar tıklamayı engelle

    if (safeIndex === bombSafeIndex) {
        // Bomba! Oyun bitti.
        if (!isMuted) {
            safeOpenSound.pause();
            safeOpenSound.currentTime = 0;
            bombSound.currentTime = 0;
            bombSound.play();
        }
        clickedSafe.classList.add('bomb');
        bonusGameMessage.textContent = 'BOMBA! Oyun bitti. 💥';
        // Diğer tüm kasaları da aç (kasa açma animasyonu veya gösterimi)
        safesContainer.querySelectorAll('.safe-item').forEach((safe, index) => {
            if (index !== bombSafeIndex) {
                if (!isMuted) {
                    safeOpenSound.currentTime = 0;
                    safeOpenSound.play();
                }
                const winAmount = (Math.random() * 50 + 10) * betAmount / 10; // Örnek kazanç
                safe.innerHTML = `<p>${winAmount.toFixed(2)} TL</p>`;
                safe.classList.add('opened', 'won');
            }
            safe.removeEventListener('click', handleSafeClick);
        });

        setTimeout(() => {
            bonusGamePopup.style.display = 'none';
            balance += currentBonusWin; // Toplanan kazancı bakiyeye ekle
            updateUI();
            currentBonusWin = 0; // Sıfırla
            messageDisplay.textContent = `Bonus Oyunundan ${totalWin.toFixed(2)} TL Kazandın!`;
            messageDisplay.style.color = '#32CD32';
        }, 2000); // Popup'ı kapatmadan önce biraz bekle
    } else {
        // Kasa açıldı, ödül verildi
        if (!isMuted) {
            safeOpenSound.currentTime = 0;
            safeOpenSound.play();
        }
        const winAmount = (Math.random() * 50 + 10) * betAmount / 10; // Örnek kazanç
        currentBonusWin += winAmount;
        currentBonusWinDisplay.textContent = currentBonusWin.toFixed(2);
        clickedSafe.classList.add('won');
        clickedSafe.innerHTML = `<p>${winAmount.toFixed(2)} TL</p>`;

        // Tüm kasalar açıldı mı kontrol et
        const openedSafes = safesContainer.querySelectorAll('.safe-item.opened').length;
        if (openedSafes === totalBonusSafes) {
            bonusGameMessage.textContent = 'Tüm kasaları açtın! Süper!';
            setTimeout(() => {
                bonusGamePopup.style.display = 'none';
                balance += currentBonusWin;
                updateUI();
                currentBonusWin = 0;
                messageDisplay.textContent = `Bonus Oyunundan ${totalWin.toFixed(2)} TL Kazandın!`;
                messageDisplay.style.color = '#32CD32';
            }, 1500);
        }
    }
}


// --- Sayfa Yüklendiğinde Başlangıç İşlemleri ---
document.addEventListener('DOMContentLoaded', () => {
    spinButton.addEventListener('click', spinReels);

    reels.forEach((reel, index) => {
        const initialSymbol = getRandomSymbolKey();
        setReelSymbol(reel, initialSymbol);
        lastSpinSymbols[index] = initialSymbol;
    });

    updateUI(); // Sayfa ilk yüklendiğinde bakiyeyi göster ve localStorage'dan çek

    // Müzik çalmaya çalış, kullanıcı etkileşimi gerekebilir
    backgroundMusic.play().catch(e => {
        console.log("Arkaplan müziği otomatik oynatılamadı (tarayıcı kısıtlaması):", e);
    });
});