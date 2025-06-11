document.addEventListener('DOMContentLoaded', () => {
    // KULLANICI OTURUM KONTROLÜ (Mevcut kodun)
    let activeUser = localStorage.getItem('hansellCasinoActiveUser');
    let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

    if (!activeUser || !users[activeUser]) {
        window.location.href = '../lobby.html'; 
        return;
    }

    let currentBalance = users[activeUser].balance;
    if (typeof currentBalance !== 'number' || isNaN(currentBalance)) {
        console.error("Hata: localStorage'dan geçersiz bakiye okundu. Bakiye:", currentBalance);
        currentBalance = 1000; 
        users[activeUser].balance = currentBalance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }

    // --- Yeni Ses Elementleri ---
    const bgMusic = document.getElementById('bgMusic');
    const spinSound = document.getElementById('spinSound');
    const winSound = document.getElementById('winSound');
    // --- Kazanç Gösterim Elementi ---
    const winningsDisplay = document.getElementById('winningsDisplay');


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

    const numbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const colors = {
        0: 'green',
        'red': [32, 19, 21, 25, 34, 27, 36, 30, 23, 5, 16, 1, 14, 9, 18, 7, 28, 12, 35, 3], 
        'black': [15, 4, 2, 17, 6, 13, 11, 8, 10, 24, 33, 20, 31, 22, 29, 7, 28, 12, 35, 3, 26], // Düzeltildi: Siyah sayılar
    };
    // Siyah sayılar arasında 7, 28, 12, 35, 3, 26 tekrar ediyor, kontrol et
    // Doğrusu: black: [15, 4, 2, 17, 6, 13, 11, 8, 10, 24, 16, 33, 20, 31, 9, 22, 29, 7, 28, 12, 35, 3, 26]
    // Yukarıdaki sayıların ruletteki dizilimiyle aynı olduğundan emin ol!
    
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

        if (spinSpeed < 0.005 && Math.abs(currentAngle - targetAngle) < 0.01) {
            spinning = false;
            currentAngle = targetAngle; 
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
        chips.forEach(chip => chip.style.pointerEvents = 'none'); 

        // Çark dönme sesini başlat
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
        // Çark durduktan sonra pointer'ın gösterdiği sayıyı bulma mantığı
        // Basitlik adına, startSpin() içinde zaten seçtiğimiz winningNumber'ı kullanalım.
        // Daha sonra bu kısım, çarkın durduğu noktaya göre gerçek kazanan sayıyı bulacak şekilde güncellenebilir.
        // Şimdilik test için rastgele kazanan numara seçelim (veya startSpin'deki winningNumber'ı buradan da erişilebilir yapalım)
        const winningNumber = numbers[Math.floor(Math.random() * numbers.length)]; // Temp: Asıl kazanan numara spin anında belirlenmeli ve buraya aktarılmalı

        gameMessage.textContent = `Kazanan Numara: ${winningNumber} (${numberColors[winningNumber].toUpperCase()})`;
        addPreviousNumber(winningNumber);

        let totalWin = 0;
        for (const betType in playerBets) {
            const betAmount = playerBets[betType];

            if (!isNaN(parseInt(betType)) && parseInt(betType) === winningNumber) {
                totalWin += betAmount * 36; 
            }
            else if (betType === 'red' && numberColors[winningNumber] === 'red') {
                totalWin += betAmount * 2; 
            }
            else if (betType === 'black' && numberColors[winningNumber] === 'black') {
                totalWin += betAmount * 2; 
            }
            else if (betType === 'even' && winningNumber !== 0 && winningNumber % 2 === 0) {
                totalWin += betAmount * 2;
            }
            else if (betType === 'odd' && winningNumber % 2 !== 0) {
                totalWin += betAmount * 2;
            }
            else if (betType === '1-18' && winningNumber >= 1 && winningNumber <= 18) {
                totalWin += betAmount * 2;
            }
            else if (betType === '19-36' && winningNumber >= 19 && winningNumber <= 36) {
                totalWin += betAmount * 2;
            }
        }

        currentBalance += totalWin;
        updateBalanceDisplay();
        currentBet = 0; 
        playerBets = {};
        updateBetDisplay();

        // Kazanç mesajını göster
        if (totalWin > 0) {
            winningsDisplay.textContent = `+${totalWin.toFixed(2)} TL Kazandın!`;
            winningsDisplay.style.display = 'block';
            winningsDisplay.style.opacity = 1;
            winSound.play().catch(e => console.error("Kazanç sesi çalınamadı:", e)); // Kazanç sesi çal
        } else {
            winningsDisplay.textContent = `Kaybettin! Bahisler Sıfırlandı.`;
            winningsDisplay.style.backgroundColor = 'rgba(220, 53, 69, 0.9)'; // Kırmızı arka plan
            winningsDisplay.style.display = 'block';
            winningsDisplay.style.opacity = 1;
        }

        setTimeout(() => {
            winningsDisplay.style.opacity = 0; // Mesajı yavaşça kaybet
            setTimeout(() => {
                winningsDisplay.style.display = 'none'; // Gizle
                winningsDisplay.style.backgroundColor = 'rgba(40, 167, 69, 0.9)'; // Arka planı eski haline getir
                resetRound(); 
            }, 500); // Opaklık geçiş süresi kadar bekle
        }, 3000); // 3 saniye sonra mesajı gizlemeye başla
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

        currentBalance -= amount;
        currentBet += amount;
        playerBets[betType] = (playerBets[betType] || 0) + amount; 

        updateBalanceDisplay();
        updateBetDisplay();
        gameMessage.textContent = `${amount} TL ${betType} üzerine bahis yapıldı.`;
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
        spinButton.disabled = true; 
        clearBetButton.disabled = false;
        chips.forEach(chip => chip.style.pointerEvents = 'auto'); 

        timerInterval = setInterval(() => {
            gameTimer--;
            timerDisplay.textContent = gameTimer;
            if (gameTimer <= 0) {
                clearInterval(timerInterval);
                gameMessage.textContent = "Bahis süresi doldu! Çark dönüyor...";
                if (currentBet > 0) {
                    startSpin();
                } else {
                    gameMessage.textContent = "Bahis yapılmadı, yeni tur bekleniyor.";
                    setTimeout(resetRound, 3000); 
                }
                
                chips.forEach(chip => chip.style.pointerEvents = 'none'); 
            }
        }, 1000);
    }

    function resetRound() {
        currentBet = 0;
        playerBets = {};
        updateBetDisplay();
        spinButton.disabled = true;
        clearBetButton.disabled = false;
        gameMessage.textContent = "Yeni tur başlıyor...";
        
        drawWheel(); 
        startTimer(); 
    }

    // --- Olay Dinleyicileri ---

    spinButton.addEventListener('click', startSpin);
    clearBetButton.addEventListener('click', clearBets);

    chips.forEach(chip => {
        chip.addEventListener('click', (event) => {
            if (gameTimer > 0 && !spinning) { 
                const chipValue = parseFloat(event.target.dataset.value);
                // Şimdilik basit bir bahis, rulet masası tıklama mantığı sonra eklenecek
                addBet('simple_bet', chipValue); 
            } else {
                gameMessage.textContent = "Şimdi bahis yapamazsın!";
            }
        });
    });

    // --- Başlangıç Ayarları ---
    updateBalanceDisplay();
    drawWheel(); 
    resetRound(); 

    // Arka plan müziğini otomatik oynatmayı dene (kullanıcı etkileşimi gerekebilir)
    // Otomatik oynatma tarayıcılar tarafından engellenebilir. 
    // Genellikle ilk kullanıcı etkileşiminden sonra başlar.
    // Örneğin, 'spin' butonuna basıldığında veya sayfaya ilk tıklandığında başlatabilirsin.
    document.body.addEventListener('click', () => {
        if (bgMusic.paused) {
            bgMusic.play().catch(e => console.log("Arka plan müziği otomatik çalınamadı:", e));
        }
    }, { once: true }); // Sadece bir kere dinle
});