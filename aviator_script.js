document.addEventListener('DOMContentLoaded', () => {
    // KULLANICI OTURUM KONTROLÜ
    let activeUser = localStorage.getItem('hansellCasinoActiveUser');
    let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

    console.log("Aviator Script: activeUser:", activeUser); // BU SATIRI EKLE
    console.log("Aviator Script: users objesi:", users);   // BU SATIRI EKLE
    if (activeUser) {
        console.log("Aviator Script: users[activeUser]:", users[activeUser]); // BU SATIRI EKLE
    }

    // Eğer aktif kullanıcı yoksa veya kullanıcı verisi hatalıysa, lobiye yönlendir
    if (!activeUser || !users[activeUser]) {
        console.log("Aviator Script: Kullanıcı oturumu geçersiz, lobiye yönlendiriliyor."); // BU SATIRI EKLE
        window.location.href = '../lobby.html'; 
        return;
    }

    // ... (geri kalan kodlar) ...
});
    // Bakiyeyi kullanıcı verisinden çek - BURADA BAKIYE OKUMA İŞLEMİ GÜÇLENDİRİLDİ
    let currentBalance = users[activeUser].balance;
    // Eğer localStorage'dan gelen bakiye geçerli bir sayı değilse (undefined, null, NaN vb.),
    // console'a bir hata yaz ve varsayılan olarak 0 veya 1000 yap.
    if (typeof currentBalance !== 'number' || isNaN(currentBalance)) {
        console.error("Hata: localStorage'dan geçersiz bakiye okundu. Bakiye:", currentBalance);
        currentBalance = 1000; // Varsayılan olarak 1000 TL ata, test için
        // Bu varsayılan değeri localStorage'a da kaydedebiliriz, ancak şimdilik hata tespiti için bırakalım.
        users[activeUser].balance = currentBalance;
        localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    }


    const betAmountInput = document.getElementById('betAmount');
    const betButton = document.getElementById('betButton');
    const cashOutButton = document.getElementById('cashOutButton');
    const multiplierDisplay = document.getElementById('multiplierDisplay');
    const gameMessage = document.getElementById('gameMessage');
    const currentBalanceSpan = document.getElementById('currentBalance');
    const airplane = document.getElementById('airplane');
    const gameCanvas = document.getElementById('gameCanvas');
    const ctx = gameCanvas.getContext('2d');
    const pastMultipliersContainer = document.getElementById('pastMultipliers');
    const countdownTimer = document.getElementById('countdownTimer');

    let gameActive = false;
    let currentMultiplier = 1.00;
    let betAmount = 0; // Başlangıçta 0 olarak kalsın, bahis yapılana kadar
    let animationFrameId;
    let startTime; 
    let crashMultiplier = 0;
    let pathPoints = [];
    let airplaneImage = new Image();
    let isBetPlacedThisRound = false; 
    let countdownInterval; 
    const ROUND_PREP_TIME = 10; 
    let countdown = ROUND_PREP_TIME;
    const MAX_PAST_MULTIPLIERS = 15;

    airplaneImage.src = 'assets/images/airplane.png';

    function resizeCanvas() {
        gameCanvas.width = gameCanvas.offsetWidth;
        gameCanvas.height = gameCanvas.offsetHeight;
        drawGrid();
        if (gameActive) drawPath();
    }

    function drawGrid() {
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < gameCanvas.height; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(gameCanvas.width, i); ctx.stroke(); }
        for (let i = 0; i < gameCanvas.width; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, gameCanvas.height); ctx.stroke(); }
    }

    // Bakiyeyi güncelleyen ve localStorage'a kaydeden fonksiyon
    function updateBalanceDisplay() {
        currentBalanceSpan.textContent = currentBalance.toFixed(2);
        // Sadece currentBalance geçerli bir sayı ise localStorage'a kaydet
        if (!isNaN(currentBalance)) {
            users[activeUser].balance = currentBalance;
            localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
            console.log(`Bakiye Güncellendi: ${currentBalance.toFixed(2)} TL`); // DEBUG AMAÇLI LOG
        } else {
            console.error("Hata: updateBalanceDisplay - currentBalance geçerli bir sayı değil!", currentBalance);
        }
    }

    function addPastMultiplier(multiplier) {
        const item = document.createElement('span');
        item.classList.add('multiplier-item');
        item.textContent = `${multiplier.toFixed(2)}x`;

        if (multiplier < 1.5) { item.classList.add('safe'); } else if (multiplier < 3.0) { item.classList.add('medium'); } else { item.classList.add('high'); }

        pastMultipliersContainer.prepend(item);
        while (pastMultipliersContainer.children.length > MAX_PAST_MULTIPLIERS) {
            pastMultipliersContainer.removeChild(pastMultipliersContainer.lastChild);
        }
    }

    function resetGame() {
        gameActive = false;
        currentMultiplier = 1.00;
        multiplierDisplay.textContent = '1.00x';
        multiplierDisplay.style.color = '#f0c400';
        betButton.disabled = true; 
        cashOutButton.disabled = true;
        betAmountInput.disabled = false;
        gameMessage.textContent = 'Yeni tur bekleniyor...';
        airplane.style.display = 'none';
        airplane.classList.remove('crashed');
        if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
        pathPoints = [];
        drawGrid();
        cashOutButton.textContent = 'KAZANCI AL (0.00)';
        isBetPlacedThisRound = false; 
        clearInterval(countdownInterval); 
        startRoundCountdown(); 
        // Bakiye sıfırlama işlemi burada YAPILMAZ!
    }

    function startGame() {
        gameActive = true;
        startTime = Date.now(); 
        airplane.style.display = 'block';
        airplane.style.left = '0px';
        airplane.style.bottom = '0px';
        airplane.style.transform = 'translate(0px, 0px) rotate(0deg)';
        pathPoints = [{ x: 0, y: gameCanvas.height }];
        
        const rand = Math.random();
        if (rand < 0.6) { crashMultiplier = Math.random() * (2.00 - 1.05) + 1.05; } else if (rand < 0.9) { crashMultiplier = Math.random() * (5.00 - 2.00) + 2.00; } else { crashMultiplier = Math.random() * (10.00 - 5.00) + 5.00; }
        crashMultiplier = parseFloat(crashMultiplier.toFixed(2));

        gameMessage.textContent = 'Uçak yükseliyor...';
        countdownTimer.style.display = 'none';
        betButton.disabled = true;
        betAmountInput.disabled = true;
        cashOutButton.disabled = true;
        requestAnimationFrame(animateGame);
    }

    function drawPath() {
        drawGrid(); 
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i < pathPoints.length; i++) { ctx.lineTo(pathPoints[i].x, pathPoints[i].y); }
        ctx.strokeStyle = '#f0c400';
        ctx.lineWidth = 4;
        ctx.stroke();
        if (pathPoints.length > 1) {
            ctx.lineTo(gameCanvas.width, gameCanvas.height);
            ctx.lineTo(pathPoints[0].x, pathPoints[0].y);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fill();
        }
    }

    function animateGame() {
        if (!gameActive) return;
        const elapsedTime = (Date.now() - startTime) / 1000;
        currentMultiplier = 1 + Math.pow(elapsedTime, 1.5) * 0.9;
        currentMultiplier = parseFloat(currentMultiplier.toFixed(2));

        if (currentMultiplier >= crashMultiplier) {
            gameActive = false;
            multiplierDisplay.style.color = '#e74c3c';
            gameMessage.textContent = `Uçak Patladı! Çarpan: ${currentMultiplier.toFixed(2)}x. Bahis kayboldu.`;
            cashOutButton.disabled = true;
            airplane.classList.add('crashed');
            addPastMultiplier(currentMultiplier);
            setTimeout(resetGame, 2000);
            return;
        }

        multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`;
        // Eğer isBetPlacedThisRound false ise, yani hiç bahis yapılmadıysa, cashOutButton'un 0.00 göstermesini sağla
        if (isBetPlacedThisRound) {
            cashOutButton.textContent = `KAZANCI AL (${(betAmount * currentMultiplier).toFixed(2)})`;
            cashOutButton.disabled = false;
        } else {
            cashOutButton.textContent = `KAZANCI AL (0.00)`;
            cashOutButton.disabled = true;
        }

        const x_progress = (currentMultiplier - 1) / (crashMultiplier + 2);
        const y_progress = Math.min(1, Math.log(currentMultiplier) / Math.log(crashMultiplier + 1));

        const airplaneX = x_progress * gameCanvas.width * 0.9 + (gameCanvas.width * 0.05);
        const airplaneY = gameCanvas.height - (y_progress * gameCanvas.height * 0.9 + (gameCanvas.height * 0.05));

        const rotationAngle = -Math.min(45, (currentMultiplier - 1) * 15);
        airplane.style.transform = `translate(${airplaneX - (airplane.offsetWidth / 2)}px, ${airplaneY - (airplane.offsetHeight / 2)}px) rotate(${rotationAngle}deg)`;
        
        const pointX = Math.max(0, Math.min(gameCanvas.width, airplaneX));
        const pointY = Math.max(0, Math.min(gameCanvas.height, airplaneY));
        pathPoints.push({ x: pointX, y: pointY });
        drawPath();

        animationFrameId = requestAnimationFrame(animateGame);
    }

    cashOutButton.addEventListener('click', () => {
        if (gameActive && isBetPlacedThisRound) {
            const winnings = betAmount * currentMultiplier;
            currentBalance += winnings;
            updateBalanceDisplay();
            gameMessage.textContent = `Kazancını aldın! ${currentMultiplier.toFixed(2)}x ile ${winnings.toFixed(2)} TL kazandın.`;
            multiplierDisplay.style.color = '#4CAF50';
            gameActive = false;
            addPastMultiplier(currentMultiplier);
            betButton.disabled = true;
            cashOutButton.disabled = true;
            airplane.classList.remove('crashed');
            setTimeout(resetGame, 2000);
        }
    });

    betButton.addEventListener('click', () => {
        if (gameActive) {
            gameMessage.textContent = 'Oyun zaten başladı, bahis yapamazsın.';
            return;
        }
        if (countdown > 0) {
            // Bahis miktarını input'tan doğru şekilde al
            let tempBet = parseFloat(betAmountInput.value);

            if (tempBet <= 0 || isNaN(tempBet)) { // tempBet kontrolünü betAmountInput.value kontrolünden sonra yap
                gameMessage.textContent = 'Lütfen geçerli bir bahis miktarı girin.';
                return;
            }
            
            // BAKİYE KONTROLÜ BURADA: Yetersiz bakiye durumunda hata vermesi için
            if (currentBalance < tempBet) {
                gameMessage.textContent = 'Yetersiz bakiye! Lütfen bakiyenizi artırın.';
                return; // Sadece mesaj verip işlemi durdur.
            }

            betAmount = tempBet; // betAmount'ı sadece bahis yapıldığında güncelle
            currentBalance -= betAmount; // Bakiyeden düş
            updateBalanceDisplay(); // Bakiyeyi güncelle
            isBetPlacedThisRound = true;
            betButton.disabled = true;
            betAmountInput.disabled = true;
            gameMessage.textContent = `Bahis ${betAmount.toFixed(2)} TL olarak kabul edildi. Uçak bekleniyor...`;
        } else {
            gameMessage.textContent = 'Bahis süresi doldu!';
        }
    });

    function startRoundCountdown() {
        countdown = ROUND_PREP_TIME;
        countdownTimer.textContent = countdown;
        countdownTimer.style.display = 'block';
        multiplierDisplay.style.display = 'none';

        betButton.disabled = false;
        betAmountInput.disabled = false;
        gameMessage.textContent = `Bahis yapmak için ${countdown} saniye...`;

        countdownInterval = setInterval(() => {
            countdown--;
            countdownTimer.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownTimer.style.display = 'none';
                multiplierDisplay.style.display = 'block';
                startGame();
            }
        }, 1000);
    }

    window.addEventListener('resize', resizeCanvas);

    // Sayfa yüklendiğinde
    updateBalanceDisplay(); // Başlangıçta bakiyeyi göster
    resizeCanvas(); // Canvas'ı ayarla
    resetGame(); // Oyunu sıfırla ve ilk tur için geri sayımı başlat
});
