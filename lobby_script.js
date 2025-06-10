const mainBalanceDisplay = document.getElementById('mainBalance');
const slotGameCard = document.getElementById('slotGameCard');
const logoutButton = document.getElementById('logoutButton');

// Aktif kullanıcıyı ve tüm kullanıcı verilerini çek
let activeUser = localStorage.getItem('hansellCasinoActiveUser');
let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

// Eğer aktif kullanıcı yoksa veya kullanıcı verisi hatalıysa, giriş sayfasına geri gönder
// Bu kontrol sadece lobiye geçişte veya lobi sayfası direk açıldığında çalışır.
if (!activeUser || !users[activeUser]) {
    alert('Oturum süresi doldu veya kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
    window.location.href = 'index.html'; // Ana giriş sayfasına yönlendir
}

// Lobi bakiyesini güncelle
function updateLobbyBalance() {
    if (activeUser && users[activeUser]) {
        mainBalanceDisplay.textContent = users[activeUser].balance.toFixed(2);
    } else {
        // Bu duruma normalde düşmemeli, çünkü yukarıdaki kontrol yönlendirecek
        mainBalanceDisplay.textContent = '0.00'; 
    }
}

// Sayfa yüklendiğinde bakiyeyi göster ve çıkış butonu
document.addEventListener('DOMContentLoaded', () => {
    updateLobbyBalance();

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('hansellCasinoActiveUser'); // Aktif kullanıcıyı sil
        window.location.href = 'index.html'; // Giriş sayfasına dön
    });
});