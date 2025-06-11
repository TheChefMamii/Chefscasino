document.addEventListener('DOMContentLoaded', () => {
    // KULLANICI OTURUM KONTROLÜ
    let activeUser = localStorage.getItem('hansellCasinoActiveUser');
    let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

    if (!activeUser || !users[activeUser]) {
        // Hata: aktif kullanıcı yok veya geçersiz. Lobiye veya ana sayfaya yönlendir.
        window.location.href = '../index.html'; //index.html'e yönlendirme yapıldı
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
    const playerChipsOverlay = document.getElementById('playerChipsOverlay'); 
    const betAreas = document.querySelectorAll('.bet-area'); 

    const coinDisplay = document.getElementById('coinDisplay');
    const betDisplay = document.getElementById('betDisplay');
    const timerDisplay = document.getElementById('timerDisplay');
    const rouletteWheelCanvas = document.getElementById('rouletteWheel');
    const ctx = rouletteWheelCanvas.getContext('2d');
    // const spinButton = document.getElementById('spinButton'); // Kaldırıldı
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
    let playerBets = {}; 
    let timerInterval;
    let gameTimer = 30; 

    let activeChipValue = 1; 
    let isMusicPlaying = false; 

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
        spinSpeed *= 0.98; 

        if (spinSpeed < 0.005 && Math.abs(currentAngle % (2 * Math.PI) - targetAngle % (2 * Math.PI)) < 0.01) {
            spinning = false;
            currentAngle = targetAngle; 
            spinSound.pause(); 
            spinSound.currentTime = 0; 
            determineWinner();
            return;
        }

        drawWheel();
        requestAnimationFrame(animateWheel);
    }

    function startSpin() {
        if (spinning) {
            gameMessage.textContent = "Çark zaten dönüyor!";
            return;
        }
        if (currentBet === 0) { // Sadece bahis varsa çevir
            gameMessage.textContent = "Bahis yapmadan çarkı çeviremezsin!";
            // Eğer süre bittiğinde bahis yoksa, bahis sıfırlansın ve yeni tura başlansın
            if (gameTimer <= 0) {
                 clearBets(); // Süre bitti ve bahis yoksa bahisleri temizle
                 resetRound(); // Yeni turu başlat
            }
            return;
        }

        spinning = true;
        gameMessage.textContent = "Çark dönüyor...";
        // spinButton.disabled = true; // Kaldırıldı
        clearBetButton.disabled = true;
        chips.forEach(chip => chip.style.pointerEvents = 'none'); 
        betAreas.forEach(area => area.style.pointerEvents = 'none'); 

        spinSound.play().catch(e => console.error("Çark sesi çalınamadı:", e));

        const winningNumber = numbers[Math.floor(Math.random() * numbers.length)];
        const segmentAngle = (2 * Math.PI) / numbers.length;
        const winningIndex = numbers.indexOf(winningNumber);
        
        let requiredAngleOffset = (winningIndex * segmentAngle) + (segmentAngle / 2);
        
        const fullSpins = Math.floor(Math.random() * 6) + 5; 
        targetAngle = (fullSpins * 2 * Math.PI) + requiredAngleOffset;

        spinSpeed = (targetAngle - currentAngle) / 60; 

        animateWheel();
        clearInterval(timerInterval); 
        timerDisplay.textContent = '--';
    }

    function determineWinner() {
        // Çarkın durduğu sayıyı bulma mantığı basitleştirildi.
        const winningNumber = numbers[Math.floor(Math.random() * numbers.length)];

        gameMessage.textContent = `Kazanan Numara: ${winningNumber} (${numberColors[winningNumber].toUpperCase()})`;
        addPreviousNumber(winningNumber);

        let totalWin = 0;
        for (const betType in playerBets) {
            const betTotalAmountForType = playerBets[betType].amount; 

            if (!isNaN(parseInt(betType)) && parseInt(betType) === winningNumber) {
                totalWin += betTotalAmountForType * 36; 
            }
            else if (betType === 'red' && numberColors[winningNumber] === 'red') {
                totalWin += betTotalAmountForType * 2; 
            }
            else if (betType === 'black' && numberColors[winningNumber] === 'black') {
                totalWin += betTotalAmountForType * 2; 
            }
            else if (betType === 'even' && winningNumber !== 0 && winningNumber % 2 === 0) {
                totalWin += betTotalAmountForType * 2;
            }
            else if (betType === 'odd' && winningNumber !== 0 && winningNumber % 2 !== 0) { 
                totalWin += betTotalAmountForType * 2;
            }
            else if (betType === '1-18' && winningNumber >= 1 && winningNumber <= 18) {
                totalWin += betTotalAmountForType * 2;
            }
            else if (betType === '19-36' && winningNumber >= 19 && winningNumber <= 36) {
                totalWin += betTotalAmountForType * 2;
            }
            else if (betType === '1st-12' && winningNumber >= 1 && winningNumber <= 12) {
                totalWin += betTotalAmountForType * 3; 
            }
            else if (betType === '2nd-12' && winningNumber >= 13 && winningNumber <= 24) {
                totalWin += betTotalAmountForType * 3;
            }
            else if (betType === '3rd-12' && winningNumber >= 25 && winningNumber <= 36) {
                totalWin += betTotalAmountForType * 3;
            }
            else if (betType === 'col1' && [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].includes(winningNumber)) {
                totalWin += betTotalAmountForType * 3;
            }
            else if (betType === 'col2' && [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(winningNumber)) {
                totalWin += betTotalAmountForType * 3;
            }
            else if (betType === 'col3' && [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].includes(winningNumber)) {
                totalWin += betTotalAmountForType * 3;
            }
        }

        currentBalance += totalWin;
        updateBalanceDisplay();
        
        // Kazanç/Kaybı ekranda göster
        if (totalWin > 0) {
            winningsDisplay.textContent = `+${totalWin.toFixed(2)} TL Kazandın!`;
            winningsDisplay.style.backgroundColor = 'rgba(40, 167, 69, 0.9)'; 
            winningsDisplay.style.display = 'block';
            winningsDisplay.style.opacity = 1;
            winSound.play().catch(e => console.error("Kazanç sesi çalınamadı:", e)); 
        } else {
            // Eğer bahis yapıldıysa ve kazanılmadıysa, kaybedilen miktarı belirt
            if (Object.keys(playerBets).length > 0) { // Bahis yapıldıysa
                winningsDisplay.textContent = `Kaybettin! Bahisler Sıfırlandı.`;
            } else { // Bahis yapılmadıysa
                winningsDisplay.textContent = `Yeni Tur Başlıyor...`;
            }
            winningsDisplay.style.backgroundColor = 'rgba(220, 53, 69, 0.9)'; 
            winningsDisplay.style.display = 'block';
            winningsDisplay.style.opacity = 1;
        }

        setTimeout(() => {
            winningsDisplay.style.opacity = 0; 
            setTimeout(() => {
                winningsDisplay.style.display = 'none'; 
                winningsDisplay.style.backgroundColor = 'rgba(40, 167, 69, 0.9)'; 
                resetRound(); 
            }, 500); 
        }, 3000); 
    }

    function addBet(betType, amount) {
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

        if (!playerBets[betType]) {
            playerBets[betType] = { amount: 0, chips: [] };
        }
        playerBets[betType].amount += amount;

        // Jeton görselini oluştur ve ekle
        const targetArea = document.querySelector(`.bet-area[data-bet="${betType}"]`);
        if (targetArea) {
            const tableRect = bettingTableContainer.getBoundingClientRect();
            const targetAreaRect = targetArea.getBoundingClientRect();
            
            // Jetonun bahis alanının ortasına yakın bir yere konumlandırılması
            const chipX = targetAreaRect.left - tableRect.left + (targetAreaRect.width / 2); 
            const chipY = targetAreaRect.top - tableRect.top + (targetAreaRect.height / 2);

            const chipElement = document.createElement('div');
            chipElement.classList.add('placed-chip');
            // Rastgele hafif kaydırma ekleyerek üst üste binmeyi azalt
            const offsetX = (Math.random() - 0.5) * targetAreaRect.width * 0.3; // Alanın %30'u kadar rastgele kaydır
            const offsetY = (Math.random() - 0.5) * targetAreaRect.height * 0.3;
            chipElement.style.left = `${chipX + offsetX}px`;
            chipElement.style.top = `${chipY + offsetY}px`;
            chipElement.textContent = amount; 

            // Jetonun rengini değerine göre ayarla
            if (amount === 1) chipElement.style.backgroundColor = 'rgba(255, 200, 0, 0.7)'; 
            else if (amount === 5) chipElement.style.backgroundColor = 'rgba(0, 100, 200, 0.7)'; 
            else if (amount === 10) chipElement.style.backgroundColor = 'rgba(200, 0, 0, 0.7)'; 
            else if (amount === 20) chipElement.style.backgroundColor = 'rgba(0, 150, 0, 0.7)'; 
            else if (amount === 50) chipElement.style.backgroundColor = 'rgba(100, 0, 150, 0.7)'; 

            playerChipsOverlay.appendChild(chipElement);

            playerBets[betType].chips.push({ x: chipX + offsetX, y: chipY + offsetY, value: amount, element: chipElement });
        } else {
            console.warn(`Bahis alanı bulunamadı: ${betType}`);
        }

        updateBalanceDisplay();
        updateBetDisplay();
        gameMessage.textContent = `${amount} TL ${betType} üzerine bahis yapıldı. Toplam: ${playerBets[betType].amount.toFixed(2)} TL`;
    }

    function clearBets() {
        currentBalance += currentBet; 
        currentBet = 0;
        playerBets = {};
        updateBalanceDisplay();
        updateBetDisplay();
        gameMessage.textContent = "Bahisler temizlendi.";
        // spinButton.disabled = true; // Kaldırıldı
        playerChipsOverlay.innerHTML = ''; 
    }

    function addPreviousNumber(number) {
        const span = document.createElement('span');
        span.textContent = number;
        span.classList.add(numberColors[number]); 
        previousNumbersDisplay.prepend(span); 

        if (previousNumbersDisplay.children.length > 20) {
            previousNumbersDisplay.removeChild(previousNumbersDisplay.lastChild);
        }
    }

    function startTimer() {
        gameTimer = 30; 
        timerDisplay.textContent = gameTimer;
        gameMessage.textContent = "Bahisinizi yapın!";
        // spinButton.disabled = true; // Kaldırıldı
        clearBetButton.disabled = false;
        chips.forEach(chip => chip.style.pointerEvents = 'auto'); 
        betAreas.forEach(area => area.style.pointerEvents = 'auto'); 

        clearInterval(timerInterval); 
        timerInterval = setInterval(() => {
            gameTimer--;
            timerDisplay.textContent = gameTimer;
            if (gameTimer <= 0) {
                clearInterval(timerInterval);
                gameMessage.textContent = "Bahis süresi doldu! Çark çevriliyor...";
                startSpin(); // Süre bitince otomatik çevir
                // spinButton.disabled = true; // Kaldırıldı
                clearBetButton.disabled = true;
                chips.forEach(chip => chip.style.pointerEvents = 'none');
                betAreas.forEach(area => area.style.pointerEvents = 'none');
            }
        }, 1000);
    }

    function resetRound() {
        currentBet = 0;
        playerBets = {}; 
        playerChipsOverlay.innerHTML = ''; 
        updateBetDisplay();
        // spinButton.disabled = true; // Kaldırıldı
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
        localStorage.setItem('hansellCasinoMusicState', isMusicPlaying); 
    }

    // --- Olay Dinleyicileri ---

    // spinButton.addEventListener('click', startSpin); // Kaldırıldı
    clearBetButton.addEventListener('click', clearBets);

    // Çip seçimi
    chips.forEach(chip => {
        chip.addEventListener('click', (event) => {
            chips.forEach(c => c.style.border = '2px solid #555'); 
            event.target.style.border = '2px solid #f0c400'; 
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
                const betType = event.currentTarget.dataset.bet; 
                addBet(betType, activeChipValue); // clientX, clientY artık doğrudan kullanılmıyor
            } else {
                gameMessage.textContent = "Şimdi bahis yapamazsın veya bahis süresi doldu!";
            }
        });
    });

    musicToggleButton.addEventListener('click', toggleMusic);

    // --- Başlangıç Ayarları ---
    updateBalanceDisplay();
    drawWheel(); 
    resetRound(); 

    // Sayfa yüklendiğinde müziğin durumunu kontrol et
    const savedMusicState = localStorage.getItem('hansellCasinoMusicState');
    if (savedMusicState === 'true') {
        bgMusic.play().then(() => {
            musicToggleButton.textContent = 'Müziği Kapat';
            isMusicPlaying = true;
        }).catch(e => {
            console.error("Müzik otomatik çalınamadı (kayıtlı durum):", e);
            musicToggleButton.textContent = 'Müziği Aç'; 
            isMusicPlaying = false;
        });
    } else {
        musicToggleButton.textContent = 'Müziği Aç';
        isMusicPlaying = false;
    }
});
