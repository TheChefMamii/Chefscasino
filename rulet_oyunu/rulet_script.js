document.addEventListener('DOMContentLoaded', () => {
    // KULLANICI OTURUM KONTROLÜ
    let activeUser = localStorage.getItem('hansellCasinoActiveUser');
    let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

    if (!activeUser || !users[activeUser]) {
        window.location.href = '../index.html'; // Giriş veya kayıt sayfasına yönlendir
        return; 
    }

    let currentBalance = users[activeUser].balance;
    if (typeof currentBalance !== 'number' || isNaN(currentBalance)) {
        console.error("Hata: localStorage'dan geçersiz bakiye okundu. Varsayılan bakiye atanıyor.");
        currentBalance = 1000; 
        users[activeUser].balance = currentBalance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }

    // --- Ses Elementleri ---
    const bgMusic = document.getElementById('bgMusic');
    const spinSound = document.getElementById('spinSound');
    const winSound = document.getElementById('winSound');
    // --- Kazanç Gösterim Elementi ---
    const winningsDisplay = document.getElementById('winningsDisplay');
    // --- Müzik Kontrol Elementi ---
    const musicToggleButton = document.getElementById('musicToggleButton');
    // --- Bahis Masası Elementleri ---
    const bettingTableContainer = document.getElementById('bettingTableContainer');
    const playerChipsOverlay = document.getElementById('playerChipsOverlay'); // Jetonların yerleştirileceği alan
    const betAreas = document.querySelectorAll('.bet-area'); // Tüm bahis alanları


    const coinDisplay = document.getElementById('coinDisplay');
    const betDisplay = document.getElementById('betDisplay');
    const timerDisplay = document.getElementById('timerDisplay');
    const rouletteWheelCanvas = document.getElementById('rouletteWheel');
    const ctx = rouletteWheelCanvas.getContext('2d');
    const spinButton = document.getElementById('spinButton');
    const clearBetButton = document.getElementById('clearBetButton');
    const chips = document.querySelectorAll('.chip');
    const gameMessage = document.getElementById('gameMessage');
    const previousNumbersDisplay = document.getElementById('previousNumbers');
    const currentBalanceSpan = document.getElementById('currentBalance'); 
    const activeUserDisplay = document.getElementById('activeUserDisplay');

    activeUserDisplay.textContent = `Kullanıcı: ${activeUser}`;

    // Rulet sayıları ve renkleri (Avrupa Ruleti sırası)
    const numbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const colors = {
        0: 'green',
        'red': [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 28, 12, 35, 3], 
        'black': [15, 4, 2, 17, 6, 13, 11, 8, 10, 24, 33, 20, 31, 22, 29, 26], 
    };
    const numberColors = {}; 
    numbers.forEach(num => {
        if (num === 0) {
            numberColors[num] = 'green';
        } else if (colors.red.includes(num)) {
            numberColors[num] = 'red';
        } else {
            numberColors[num] = 'black';
        }
    });

    const wheelRadius = rouletteWheelCanvas.width / 2;
    let currentAngle = 0; 
    let spinSpeed = 0; 
    let targetAngle = 0; 
    let spinning = false;
    let currentBet = 0;
    // playerBets objesi artık { 'bet_type': { amount: X, chips: [{x: Y, y: Z, value: V, element: chipElement}] } } şeklinde
    let playerBets = {}; 
    let timerInterval;
    let gameTimer = 30; 

    let activeChipValue = 1; // Varsayılan seçili jeton değeri
    let isMusicPlaying = false; // Müziğin durumunu takip et

    // --- Fonksiyonlar ---

    function updateBalanceDisplay() {
        coinDisplay.textContent = currentBalance.toFixed(2);
        currentBalanceSpan.textContent = `Bakiye: ${currentBalance.toFixed(2)} TL`; 
        users[activeUser].balance = currentBalance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }

    function updateBetDisplay() {
        betDisplay.textContent = currentBet.toFixed(2);
    }

    function drawWheel() {
        ctx.clearRect(0, 0, rouletteWheelCanvas.width, rouletteWheelCanvas.height);
        ctx.save();
        ctx.translate(wheelRadius, wheelRadius); 
        ctx.rotate(currentAngle); 

        const arcAngle = (2 * Math.PI) / numbers.length;

        numbers.forEach((number, index) => {
            const startAngle = index * arcAngle;
            const endAngle = (index + 1) * arcAngle;
            const color = numberColors[number];

            ctx.beginPath();
            ctx.arc(0, 0, wheelRadius - 2, startAngle, endAngle);
            ctx.lineTo(0, 0); 
            ctx.closePath();

            if (color === 'red') {
                ctx.fillStyle = '#e74c3c'; 
            } else if (color === 'black') {
                ctx.fillStyle = '#333'; 
            } else {
                ctx.fillStyle = '#27ae60'; 
            }
            ctx.fill();
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.save();
            ctx.rotate(startAngle + arcAngle / 2); 
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(number, wheelRadius * 0.7, 0); 
            ctx.restore();
        });

        ctx.restore();
    }

    function animateWheel() {
        if (!spinning) return;

        currentAngle += spinSpeed;
        spinSpeed *= 0.98; // Yavaşlama faktörü

        // Hedef açıya yaklaştığında dur
        if (spinSpeed < 0.005 && Math.abs(currentAngle % (2 * Math.PI) - targetAngle % (2 * Math.PI)) < 0.01) {
            spinning = false;
            currentAngle = targetAngle; // Tam hedefe oturt
            spinSound.pause(); // Çark durunca sesi durdur
            spinSound.currentTime = 0; // Sesi sıfırla
            determineWinner();
            return;
        }

        drawWheel();
        requestAnimationFrame(animateWheel);
    }

    function startSpin() {
        if (spinning || currentBet === 0) {
            gameMessage.textContent = "Bahis yapmadan veya çark dönerken çeviremezsin!";
            return;
        }

        spinning = true;
        gameMessage.textContent = "Çark dönüyor...";
        spinButton.disabled = true;
        clearBetButton.disabled = true;
        chips.forEach(chip => chip.style.pointerEvents = 'none'); // Çiplere tıklamayı engelle
        betAreas.forEach(area => area.style.pointerEvents = 'none'); // Bahis alanlarına tıklamayı engelle

        // Çark dönme sesini başlat
        spinSound.play().catch(e => console.error("Çark sesi çalınamadı:", e));

        const winningNumber = numbers[Math.floor(Math.random() * numbers.length)];
        const segmentAngle = (2 * Math.PI) / numbers.length;
        const winningIndex = numbers.indexOf(winningNumber);
        
        // Hedef açıyı belirle. En az 5-10 tam tur dönsün.
        const fullSpins = Math.floor(Math.random() * 6) + 5; // 5 ile 10 arasında tam tur
        // Çarkın pointer'ı segmentin ortasına gelsin diye hesaplama
        let requiredAngleOffset = (winningIndex * segmentAngle) + (segmentAngle / 2);
        
        // TargetAngle'ı her zaman 0'dan büyük bir değer yap
        targetAngle = (fullSpins * 2 * Math.PI) + requiredAngleOffset;

        // Başlangıç dönüş hızını belirle
        spinSpeed = (targetAngle - currentAngle) / 60; // 60 frame'de bu hıza ulaşsın

        animateWheel();
        clearInterval(timerInterval); 
        timerDisplay.textContent = '--';
    }

    function determineWinner() {
        // Çark durduktan sonra pointer'ın gösterdiği sayıyı bulma mantığı
        // Gerçekte çarkın durduğu açıya göre sayı bulunmalı.
        // Şimdilik kolaylık adına, spin sırasında seçilen winningNumber'ı kullanalım.
        const winningNumber = numbers[Math.floor(Math.random() * numbers.length)];

        gameMessage.textContent = `Kazanan Numara: ${winningNumber} (${numberColors[winningNumber].toUpperCase()})`;
        addPreviousNumber(winningNumber);

        let totalWin = 0;
        // playerBets yapısı: { 'bet_type': { amount: X, chips: [...] } }
        for (const betType in playerBets) {
            const betTotalAmountForType = playerBets[betType].amount; 

            // Tekil sayı bahsi
            if (!isNaN(parseInt(betType)) && parseInt(betType) === winningNumber) {
                totalWin += betTotalAmountForType * 36; 
            }
            // Renk bahsi (Kırmızı/Siyah)
            else if (betType === 'red' && numberColors[winningNumber] === 'red') {
                totalWin += betTotalAmountForType * 2; 
            }
            else if (betType === 'black' && numberColors[winningNumber] === 'black') {
                totalWin += betTotalAmountForType * 2; 
            }
            // Çift/Tek (Even/Odd)
            else if (betType === 'even' && winningNumber !== 0 && winningNumber % 2 === 0) {
                totalWin += betTotalAmountForType * 2;
            }
            else if (betType === 'odd' && winningNumber !== 0 && winningNumber % 2 !== 0) { // 0 tek/çift değildir.
                totalWin += betTotalAmountForType * 2;
            }
            // 1-18 / 19-36
            else if (betType === '1-18' && winningNumber >= 1 && winningNumber <= 18) {
                totalWin += betTotalAmountForType * 2;
            }
            else if (betType === '19-36' && winningNumber >= 19 && winningNumber <= 36) {
                totalWin += betTotalAmountForType * 2;
            }
            // Dozens (1st 12, 2nd 12, 3rd 12)
            else if (betType === '1st-12' && winningNumber >= 1 && winningNumber <= 12) {
                totalWin += betTotalAmountForType * 3; 
            }
            else if (betType === '2nd-12' && winningNumber >= 13 && winningNumber <= 24) {
                totalWin += betTotalAmountForType * 3;
            }
            else if (betType === '3rd-12' && winningNumber >= 25 && winningNumber <= 36) {
                totalWin += betTotalAmountForType * 3;
            }
            // Columns (2 to 1) - Avrupa ruletinde kolonlar 3'er sayıdır.
            // 1. Kolon (1,4,7,...34)
            else if (betType === 'col1' && [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].includes(winningNumber)) {
                totalWin += betTotalAmountForType * 3;
            }
            // 2. Kolon (2,5,8,...35)
            else if (betType === 'col2' && [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(winningNumber)) {
                totalWin += betTotalAmountForType * 3;
            }
            // 3. Kolon (3,6,9,...36)
            else if (betType === 'col3' && [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].includes(winningNumber)) {
                totalWin += betTotalAmountForType * 3;
            }
            // Diğer karmaşık bahis türleri buraya eklenebilir (street, corner, line vb.)
        }

        currentBalance += totalWin;
        updateBalanceDisplay();
        currentBet = 0; 
        playerBets = {}; // Bahisleri sıfırla
        updateBetDisplay();
        playerChipsOverlay.innerHTML = ''; // Tüm jetonları kaldır

        // Kazanç/Kaybı ekranda göster
        if (totalWin > 0) {
            winningsDisplay.textContent = `+${totalWin.toFixed(2)} TL Kazandın!`;
            winningsDisplay.style.backgroundColor = 'rgba(40, 167, 69, 0.9)'; // Yeşil
            winningsDisplay.style.display = 'block';
            winningsDisplay.style.opacity = 1;
            winSound.play().catch(e => console.error("Kazanç sesi çalınamadı:", e)); 
        } else {
            winningsDisplay.textContent = `Kaybettin! Bahisler Sıfırlandı.`;
            winningsDisplay.style.backgroundColor = 'rgba(220, 53, 69, 0.9)'; // Kırmızı
            winningsDisplay.style.display = 'block';
            winningsDisplay.style.opacity = 1;
        }

        setTimeout(() => {
            winningsDisplay.style.opacity = 0; 
            setTimeout(() => {
                winningsDisplay.style.display = 'none'; 
                winningsDisplay.style.backgroundColor = 'rgba(40, 167, 69, 0.9)'; // Arka planı eski haline getir
                resetRound(); 
            }, 500); // 0.5 saniye sonra gizle
        }, 3000); // 3 saniye sonra mesajı kapatmaya başla
    }

    function addBet(betType, amount, clientX, clientY) {
        if (amount <= 0 || isNaN(amount)) {
            gameMessage.textContent = "Geçerli bir bahis miktarı girin.";
            return;
        }
        if (currentBalance < amount) {
            gameMessage.textContent = "Yetersiz bakiye!";
            return;
        }
        if (spinning) {
            gameMessage.textContent = "Çark dönerken bahis yapamazsın!";
            return;
        }
        if (gameTimer <= 0) {
            gameMessage.textContent = "Bahis süresi doldu!";
            return;
        }

        currentBalance -= amount;
        currentBet += amount;

        // Bahis türü için nesne yoksa oluştur
        if (!playerBets[betType]) {
            playerBets[betType] = { amount: 0, chips: [] };
        }
        playerBets[betType].amount += amount;

        // Jeton görselini oluştur ve ekle
        const tableRect = bettingTableContainer.getBoundingClientRect();
        // clientX/Y, tıklanan noktanın ekran koordinatlarıdır.
        // Bahis masası içindeki göreceli konumunu bulmak için tableRect'i kullanırız.
        // Jetonun tam tıklanan yere değil, bahis alanının ortasına yakın gelmesini sağlamak için
        // event.currentTarget'ı kullanıyoruz
        const targetAreaRect = event.currentTarget.getBoundingClientRect();
        const chipX = targetAreaRect.left - tableRect.left + (targetAreaRect.width / 2); 
        const chipY = targetAreaRect.top - tableRect.top + (targetAreaRect.height / 2);

        const chipElement = document.createElement('div');
        chipElement.classList.add('placed-chip');
        chipElement.style.left = `${chipX}px`;
        chipElement.style.top = `${chipY}px`;
        chipElement.textContent = amount; 

        // Jetonun rengini değerine göre ayarla
        if (amount === 1) chipElement.style.backgroundColor = 'rgba(255, 200, 0, 0.7)'; // Sarı
        else if (amount === 5) chipElement.style.backgroundColor = 'rgba(0, 100, 200, 0.7)'; // Mavi
        else if (amount === 10) chipElement.style.backgroundColor = 'rgba(200, 0, 0, 0.7)'; // Kırmızı
        else if (amount === 20) chipElement.style.backgroundColor = 'rgba(0, 150, 0, 0.7)'; // Yeşil
        else if (amount === 50) chipElement.style.backgroundColor = 'rgba(100, 0, 150, 0.7)'; // Mor

        playerChipsOverlay.appendChild(chipElement);

        playerBets[betType].chips.push({ x: chipX, y: chipY, value: amount, element: chipElement });


        updateBalanceDisplay();
        updateBetDisplay();
        gameMessage.textContent = `${amount} TL ${betType} üzerine bahis yapıldı. Toplam: ${playerBets[betType].amount.toFixed(2)} TL`;
        spinButton.disabled = false;
    }

    function clearBets() {
        currentBalance += currentBet; 
        currentBet = 0;
        playerBets = {};
        updateBalanceDisplay();
        updateBetDisplay();
        gameMessage.textContent = "Bahisler temizlendi.";
        spinButton.disabled = true; 
        playerChipsOverlay.innerHTML = ''; // Tüm jetonları kaldır
    }

    function addPreviousNumber(number) {
        const span = document.createElement('span');
        span.textContent = number;
        span.classList.add(numberColors[number]); // Renge göre sınıf ekle
        previousNumbersDisplay.prepend(span); // En başa ekle

        // Sadece son 20 sonucu göster
        if (previousNumbersDisplay.children.length > 20) {
            previousNumbersDisplay.removeChild(previousNumbersDisplay.lastChild);
        }
    }

    function startTimer() {
        gameTimer = 30; 
        timerDisplay.textContent = gameTimer;
        gameMessage.textContent = "Bahisinizi yapın!";
        spinButton.disabled = true; // Bahis yapılana kadar çevir butonu kapalı
        clearBetButton.disabled = false;
        chips.forEach(chip => chip.style.pointerEvents = 'auto'); // Çiplere tıklamayı aç
        betAreas.forEach(area => area.style.pointerEvents = 'auto'); // Bahis alanlarına tıklamayı aç

        clearInterval(timerInterval); 
        timerInterval = setInterval(() => {
            gameTimer--;
            timerDisplay.textContent = gameTimer;
            if (gameTimer <= 0) {
                clearInterval(timerInterval);
                gameMessage.textContent = "Bahis süresi doldu! Çark çevriliyor...";
                spinButton.click(); // Süre bitince otomatik çevir
                spinButton.disabled = true;
                clearBetButton.disabled = true;
                chips.forEach(chip => chip.style.pointerEvents = 'none');
                betAreas.forEach(area => area.style.pointerEvents = 'none');
            }
        }, 1000);
    }

    function resetRound() {
        currentBet = 0;
        playerBets = {}; // Bahisleri sıfırla
        playerChipsOverlay.innerHTML = ''; // Jetonları temizle
        updateBetDisplay();
        spinButton.disabled = true;
        clearBetButton.disabled = false;
        startTimer();
    }

    // --- Müzik Kontrol Fonksiyonu ---
    function toggleMusic() {
        if (isMusicPlaying) {
            bgMusic.pause();
            musicToggleButton.textContent = 'Müziği Aç';
            isMusicPlaying = false;
        } else {
            bgMusic.play().then(() => {
                musicToggleButton.textContent = 'Müziği Kapat';
                isMusicPlaying = true;
            }).catch(e => {
                console.error("Müzik çalınamadı (tarayıcı kısıtlaması):", e);
                gameMessage.textContent = "Müzik otomatik oynatma engellendi. Lütfen bir kez tıklayın.";
            });
        }
        localStorage.setItem('hansellCasinoMusicState', isMusicPlaying); // Müziğin durumunu kaydet
    }

    // --- Olay Dinleyicileri ---

    spinButton.addEventListener('click', startSpin);
    clearBetButton.addEventListener('click', clearBets);

    // Çip seçimi
    chips.forEach(chip => {
        chip.addEventListener('click', (event) => {
            chips.forEach(c => c.style.border = '2px solid #555'); // Önceki seçimi sıfırla
            event.target.style.border = '2px solid #f0c400'; // Yeni seçimi vurgula
            activeChipValue = parseFloat(event.target.dataset.value);
            gameMessage.textContent = `${activeChipValue} TL jeton seçildi.`;
        });
        // İlk çipi varsayılan olarak seçili yap ve vurgula
        if (parseFloat(chip.dataset.value) === activeChipValue) {
            chip.style.border = '2px solid #f0c400';
        }
    });

    // Bahis alanlarına tıklama
    betAreas.forEach(area => {
        area.addEventListener('click', (event) => {
            if (gameTimer > 0 && !spinning) {
                const betType = event.currentTarget.dataset.bet; // data-bet özelliğinden bahis türünü al
                addBet(betType, activeChipValue, event.clientX, event.clientY);
            } else {
                gameMessage.textContent = "Şimdi bahis yapamazsın veya bahis süresi doldu!";
            }
        });
    });

    musicToggleButton.addEventListener('click', toggleMusic);

    // --- Başlangıç Ayarları ---
    updateBalanceDisplay();
    drawWheel(); 
    resetRound(); // Oyunu başlat (timerı da başlatır)

    // Sayfa yüklendiğinde müziğin durumunu kontrol et
    const savedMusicState = localStorage.getItem('hansellCasinoMusicState');
    if (savedMusicState === 'true') {
        bgMusic.play().then(() => {
            musicToggleButton.textContent = 'Müziği Kapat';
            isMusicPlaying = true;
        }).catch(e => {
            console.error("Müzik otomatik çalınamadı (kayıtlı durum):", e);
            musicToggleButton.textContent = 'Müziği Aç'; // Otomatik çalınamazsa aç butonu olarak kalsın
            isMusicPlaying = false;
        });
    } else {
        musicToggleButton.textContent = 'Müziği Aç';
        isMusicPlaying = false;
    }
});
