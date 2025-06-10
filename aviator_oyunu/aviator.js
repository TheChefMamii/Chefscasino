document.addEventListener('DOMContentLoaded', () => {
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

    let currentBalance = parseFloat(localStorage.getItem('userBalance')) || 1000.00;
    let gameActive = false;
    let currentMultiplier = 1.00;
    let betAmount = 0;
    let animationFrameId;
    let startTime;
    let crashMultiplier = 0;
    let pathPoints = [];
    let airplaneImage = new Image();
    let isBetPlacedThisRound = false; // Bu turda bahis yapıldı mı?
    let gameRoundInterval; // Otomatik tur başlatma interval'i
    let countdownInterval; // Geri sayım interval'i
    const ROUND_PREP_TIME = 10; // Her tur arası bekleme süresi (saniye)
    let countdown = ROUND_PREP_TIME;
    const MAX_PAST_MULTIPLIERS = 15; // Gösterilecek maksimum geçmiş çarpan sayısı

    airplaneImage.src = '../assets/images/airplane.png'; // Uçak görselinin yolu

    // Canvas boyutunu ayarla
    function resizeCanvas() {
        gameCanvas.width = gameCanvas.offsetWidth;
        gameCanvas.height = gameCanvas.offsetHeight;
        drawGrid();
        if (gameActive) drawPath();
    }

    // Izgara çizimi (arka plan için)
    function drawGrid() {
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Yatay çizgiler
        for (let i = 0; i < gameCanvas.height; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(gameCanvas.width, i);
            ctx.stroke();
        }
        // Dikey çizgiler
        for (let i = 0; i < gameCanvas.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, gameCanvas.height);
            ctx.stroke();
        }
    }

    // Bakiyeyi güncelleyen fonksiyon
    function updateBalanceDisplay() {
        currentBalanceSpan.textContent = currentBalance.toFixed(2);
        localStorage.setItem('userBalance', currentBalance.toFixed(2));
    }

    // Geçmiş çarpanları gösterme
    function addPastMultiplier(multiplier) {
        const item = document.createElement('span');
        item.classList.add('multiplier-item');
        item.textContent = `${multiplier.toFixed(2)}x`;

        // Çarpana göre renk sınıfı ekle
        if (multiplier < 1.5) {
            item.classList.add('safe'); // Güvenli
        } else if (multiplier < 3.0) {
            item.classList.add('medium'); // Orta
        } else {
            item.classList.add('high'); // Yüksek
        }

        pastMultipliersContainer.prepend(item); // Başa ekle

        // Maksimum sayıyı aşarsa en sondakini kaldır
        while (pastMultipliersContainer.children.length > MAX_PAST_MULTIPLIERS) {
            pastMultipliersContainer.removeChild(pastMultipliersContainer.lastChild);
        }
    }

    // Oyunu sıfırlama
    function resetGame() {
        gameActive = false;
        currentMultiplier = 1.00;
        multiplierDisplay.textContent = '1.00x';
        multiplierDisplay.style.color = '#f0c400';
        betButton.disabled = true; // Oyun başladığında bahis yapamaz
        cashOutButton.disabled = true;
        betAmountInput.disabled = false; // Sadece bahis süresince aktif
        gameMessage.textContent = 'Yeni tur bekleniyor...';
        airplane.style.display = 'none';
        airplane.classList.remove('crashed');
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        pathPoints = [];
        drawGrid();
        cashOutButton.textContent = 'KAZANCI AL (0.00)';
        isBetPlacedThisRound = false; // Bu turda bahis yapıldı mı resetle
        clearInterval(countdownInterval); // Eski geri sayımı durdur
        startRoundCountdown(); // Yeni tur için geri sayımı başlat
    }

    // Yeni tur başlatma
    function startGame() {
        // Bu fonksiyon sadece geri sayım bitince ve bahis süresi dolunca çağrılır
        gameActive = true;
        startTime = Date.now();
        airplane.style.display = 'block';
        airplane.style.left = '0px';
        airplane.style.bottom = '0px';
        airplane.style.transform = 'translate(0px, 0px) rotate(0deg)';
        pathPoints = [{ x: 0, y: gameCanvas.height }];
        
        // Crash çarpanını belirle: Minimum 1.05x, genellikle düşük, nadiren yüksek
        // Örneğin: %60 ihtimalle 1.05-2.00x arası, %30 ihtimalle 2.00-5.00x, %10 ihtimalle 5.00-10.00x
        const rand = Math.random();
        if (rand < 0.6) { // %60 ihtimalle
            crashMultiplier = Math.random() * (2.00 - 1.05) + 1.05;
        } else if (rand < 0.9) { // %30 ihtimalle
            crashMultiplier = Math.random() * (5.00 - 2.00) + 2.00;
        } else { // %10 ihtimalle
            crashMultiplier = Math.random() * (10.00 - 5.00) + 5.00;
        }
        crashMultiplier = parseFloat(crashMultiplier.toFixed(2)); // İki ondalık basamağa yuvarla

        gameMessage.textContent = 'Uçak yükseliyor...';
        countdownTimer.style.display = 'none'; // Geri sayımı gizle
        betButton.disabled = true;
        betAmountInput.disabled = true;
        cashOutButton.disabled = true; // Başlangıçta çekme butonu pasif
        requestAnimationFrame(animateGame);
    }

    // Grafik çizimi
    function drawPath() {
        drawGrid(); // Her karede ızgarayı tekrar çiz
        
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i < pathPoints.length; i++) {
            ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        ctx.strokeStyle = '#f0c400';
        ctx.lineWidth = 4;
        ctx.stroke();

        if (pathPoints.length > 1) {
            // Dolgu için yolu kapat
            ctx.lineTo(gameCanvas.width, gameCanvas.height);
            ctx.lineTo(pathPoints[0].x, pathPoints[0].y);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Kırmızı şeffaf dolgu
            ctx.fill();
        }
    }

    // Oyun animasyonunu ve çarpanı güncelleme
    function animateGame() {
        if (!gameActive) return;

        const elapsedTime = (Date.now() - startTime) / 1000;
        
        // Çarpanı artırma mantığı (daha yumuşak ve hızlı artış)
        currentMultiplier = 1 + Math.pow(elapsedTime, 1.5) * 0.9;
        currentMultiplier = parseFloat(currentMultiplier.toFixed(2));

        if (currentMultiplier >= crashMultiplier) {
            // Uçak patladı!
            gameActive = false;
            multiplierDisplay.style.color = '#e74c3c';
            gameMessage.textContent = `Uçak Patladı! Çarpan: ${currentMultiplier.toFixed(2)}x. Bahis kayboldu.`;
            cashOutButton.disabled = true;
            airplane.classList.add('crashed');
            addPastMultiplier(currentMultiplier); // Geçmiş çarpanlara ekle
            setTimeout(resetGame, 2000);
            return;
        }

        multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`;
        if (isBetPlacedThisRound) { // Sadece bahis yaptıysa kazancı göster
            cashOutButton.textContent = `KAZANCI AL (${(betAmount * currentMultiplier).toFixed(2)})`;
            cashOutButton.disabled = false; // Bahis yapıldıysa çekme butonu aktif
        } else {
            cashOutButton.textContent = `KAZANCI AL (0.00)`;
            cashOutButton.disabled = true; // Bahis yoksa çekme butonu pasif
        }

        // Uçağın ve çizginin pozisyonunu güncelle
        // Çarpanın yükseliş hızı ve oyun alanı boyutuna göre pozisyon ayarı
        const x_progress = (currentMultiplier - 1) / (crashMultiplier + 2); // X ekseni ilerlemesi
        const y_progress = Math.min(1, Math.log(currentMultiplier) / Math.log(crashMultiplier + 1)); // Y ekseni ilerlemesi (logaritmik)

        const airplaneX = x_progress * gameCanvas.width * 0.9 + (gameCanvas.width * 0.05); // Sol kenardan başlasın
        const airplaneY = gameCanvas.height - (y_progress * gameCanvas.height * 0.9 + (gameCanvas.height * 0.05)); // Alttan başlasın

        // Uçak görselinin transform değerleri
        const rotationAngle = -Math.min(45, (currentMultiplier - 1) * 15); // Çarpan arttıkça daha çok eğilsin
        airplane.style.transform = `translate(${airplaneX - (airplane.offsetWidth / 2)}px, ${airplaneY - (airplane.offsetHeight / 2)}px) rotate(${rotationAngle}deg)`;
        
        // Çizim için nokta ekle, Canvas sınırları içinde tut
        const pointX = Math.max(0, Math.min(gameCanvas.width, airplaneX));
        const pointY = Math.max(0, Math.min(gameCanvas.height, airplaneY));
        pathPoints.push({ x: pointX, y: pointY });
        drawPath();

        animationFrameId = requestAnimationFrame(animateGame);
    }

    // Bahis Çekme Butonu
    cashOutButton.addEventListener('click', () => {
        if (gameActive && isBetPlacedThisRound) {
            const winnings = betAmount * currentMultiplier;
            currentBalance += winnings;
            updateBalanceDisplay();
            gameMessage.textContent = `Kazancını aldın! ${currentMultiplier.toFixed(2)}x ile ${winnings.toFixed(2)} TL kazandın.`;
            multiplierDisplay.style.color = '#4CAF50';
            gameActive = false;
            addPastMultiplier(currentMultiplier); // Geçmiş çarpanlara ekle
            betButton.disabled = true; // Oyun bitince bahis butonu pasif kalsın
            cashOutButton.disabled = true;
            airplane.classList.remove('crashed');
            setTimeout(resetGame, 2000); // 2 saniye sonra oyunu sıfırla
        }
    });

    // Bahis Yap Butonu
    betButton.addEventListener('click', () => {
        if (gameActive) { // Oyun zaten aktifken bahis yapılamaz
            gameMessage.textContent = 'Oyun zaten başladı, bahis yapamazsın.';
            return;
        }
        if (countdown > 0) { // Sadece geri sayım varken bahis yapabilir
            if (betAmountInput.value <= 0 || isNaN(betAmountInput.value)) {
                gameMessage.textContent = 'Lütfen geçerli bir bahis miktarı girin.';
                return;
            }
            let tempBet = parseFloat(betAmountInput.value);
            if (currentBalance < tempBet) {
                gameMessage.textContent = 'Yetersiz bakiye!';
                return;
            }

            betAmount = tempBet; // Bahis miktarı güncellendi
            currentBalance -= betAmount;
            updateBalanceDisplay();
            isBetPlacedThisRound = true; // Bu turda bahis yapıldı işaretle
            betButton.disabled = true; // Bahis yapıldıktan sonra pasifleştir
            betAmountInput.disabled = true; // Bahis yapıldıktan sonra inputu pasifleştir
            gameMessage.textContent = `Bahis ${betAmount.toFixed(2)} TL olarak kabul edildi. Uçak bekleniyor...`;
        } else {
            gameMessage.textContent = 'Bahis süresi doldu!';
        }
    });

    // Tur Geri Sayımı
    function startRoundCountdown() {
        countdown = ROUND_PREP_TIME;
        countdownTimer.textContent = countdown;
        countdownTimer.style.display = 'block';
        multiplierDisplay.style.display = 'none'; // Çarpanı gizle

        betButton.disabled = false; // Bahis yapma butonunu aç
        betAmountInput.disabled = false; // Bahis miktarını girmeyi aç
        gameMessage.textContent = `Bahis yapmak için ${countdown} saniye...`;

        countdownInterval = setInterval(() => {
            countdown--;
            countdownTimer.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownTimer.style.display = 'none';
                multiplierDisplay.style.display = 'block'; // Çarpanı tekrar göster
                startGame(); // Geri sayım bitince oyunu başlat
            }
        }, 1000);
    }

    // Pencere boyutu değiştiğinde canvas'ı ve ızgarayı ayarla
    window.addEventListener('resize', resizeCanvas);

    // Sayfa yüklendiğinde
    updateBalanceDisplay();
    resizeCanvas();
    resetGame(); // İlk başlangıçta geri sayımı başlatmak için
});
