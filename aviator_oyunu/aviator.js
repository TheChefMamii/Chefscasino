document.addEventListener('DOMContentLoaded', () => {
    const betAmountInput = document.getElementById('betAmount');
    const betButton = document.getElementById('betButton');
    const cashOutButton = document.getElementById('cashOutButton');
    const multiplierDisplay = document.getElementById('multiplierDisplay');
    const gameMessage = document.getElementById('gameMessage');
    const currentBalanceSpan = document.getElementById('currentBalance');
    const airplane = document.getElementById('airplane');

    let currentBalance = parseFloat(localStorage.getItem('userBalance')) || 1000.00; // Başlangıç bakiyesi veya localStorage'dan al
    let gameActive = false;
    let currentMultiplier = 1.00;
    let betAmount = 0;
    let animationFrameId;
    let startTime;
    let crashMultiplier = 0; // Uçağın patlayacağı çarpan

    // Bakiyeyi güncelleyen fonksiyon
    function updateBalanceDisplay() {
        currentBalanceSpan.textContent = currentBalance.toFixed(2);
        localStorage.setItem('userBalance', currentBalance.toFixed(2));
    }

    // Oyunu sıfırlama
    function resetGame() {
        gameActive = false;
        currentMultiplier = 1.00;
        multiplierDisplay.textContent = '1.00x';
        multiplierDisplay.style.color = '#f0c400'; // Renk sıfırla
        betButton.disabled = false;
        cashOutButton.disabled = true;
        betAmountInput.disabled = false;
        gameMessage.textContent = '';
        airplane.style.display = 'none'; // Uçağı gizle
        airplane.style.transform = `translate(-50%, -50%)`; // Pozisyonu sıfırla
        cashOutButton.textContent = 'KAZANCI AL (0.00)';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    }

    // Yeni tur başlatma
    function startGame() {
        if (betAmountInput.value <= 0 || isNaN(betAmountInput.value)) {
            gameMessage.textContent = 'Lütfen geçerli bir bahis miktarı girin.';
            return;
        }

        betAmount = parseFloat(betAmountInput.value);

        if (currentBalance < betAmount) {
            gameMessage.textContent = 'Yetersiz bakiye!';
            return;
        }

        currentBalance -= betAmount;
        updateBalanceDisplay();
        gameMessage.textContent = 'Uçak havalanıyor...';
        
        betButton.disabled = true;
        betAmountInput.disabled = true;
        cashOutButton.disabled = false; // Başlangıçta çekme butonu aktif değil, uçağa göre değişecek
        cashOutButton.textContent = 'KAZANCI AL (0.00)';

        // Uçağın nerede patlayacağını belirle (Örnek: 1.05x ile 10.00x arası rastgele)
        crashMultiplier = Math.random() * (9.00 - 1.05) + 1.05; 
        
        gameActive = true;
        startTime = Date.now();
        airplane.style.display = 'block'; // Uçağı görünür yap

        animateGame();
    }

    // Oyun animasyonunu ve çarpanı güncelleme
    function animateGame() {
        if (!gameActive) return;

        const elapsedTime = (Date.now() - startTime) / 1000; // Saniye cinsinden geçen süre
        
        // Çarpanı artırma mantığı (basit bir eğri)
        // Çok hızlı artmasın diye 0.5 ile çarptık
        currentMultiplier = 1 + (elapsedTime * 0.5); 
        currentMultiplier = parseFloat(currentMultiplier.toFixed(2));

        if (currentMultiplier >= crashMultiplier) {
            // Uçak patladı!
            gameActive = false;
            multiplierDisplay.style.color = '#e74c3c'; // Kırmızı yap
            gameMessage.textContent = `Uçak Patladı! Çarpan: ${currentMultiplier.toFixed(2)}x. Bahis kayboldu.`;
            cashOutButton.disabled = true; // Artık çekemez
            setTimeout(resetGame, 3000); // 3 saniye sonra oyunu sıfırla
            return;
        }

        multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`;
        cashOutButton.textContent = `KAZANCI AL (${(betAmount * currentMultiplier).toFixed(2)})`;

        // Uçağın pozisyonunu güncelle (basit bir hareket)
        // Oyun alanının %10'undan %90'ına kadar gitsin
        const gameAreaWidth = document.querySelector('.game-area').offsetWidth;
        const gameAreaHeight = document.querySelector('.game-area').offsetHeight;
        
        const airplaneX = (elapsedTime * 0.1 * gameAreaWidth); // X ekseninde ilerle
        const airplaneY = gameAreaHeight - (elapsedTime * 0.15 * gameAreaHeight) - (airplane.offsetHeight / 2); // Y ekseninde yüksel (tersine)

        // Uçağın oyun alanı içinde kalmasını sağla
        const finalX = Math.min(gameAreaWidth - (airplane.offsetWidth / 2), Math.max(airplane.offsetWidth / 2, airplaneX));
        const finalY = Math.min(gameAreaHeight - (airplane.offsetHeight / 2), Math.max(airplane.offsetHeight / 2, airplaneY));

        airplane.style.transform = `translate(${finalX - (airplane.offsetWidth / 2)}px, ${finalY - (airplane.offsetHeight / 2)}px) rotate(-45deg)`; // Uçağı döndür

        animationFrameId = requestAnimationFrame(animateGame);
    }

    // Bahis Çekme Butonu
    cashOutButton.addEventListener('click', () => {
        if (gameActive) {
            const winnings = betAmount * currentMultiplier;
            currentBalance += winnings;
            updateBalanceDisplay();
            gameMessage.textContent = `Kazancını aldın! ${currentMultiplier.toFixed(2)}x ile ${winnings.toFixed(2)} TL kazandın.`;
            multiplierDisplay.style.color = '#4CAF50'; // Yeşil yap
            gameActive = false; // Oyunu durdur
            setTimeout(resetGame, 3000); // 3 saniye sonra oyunu sıfırla
        }
    });

    // Bahis Yap Butonu
    betButton.addEventListener('click', startGame);

    // Bakiyeyi başlangıçta göster
    updateBalanceDisplay();
    resetGame(); // Sayfa yüklendiğinde oyunu sıfırla
});