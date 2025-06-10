const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const loginUsernameInput = document.getElementById('loginUsername');
const loginPasswordInput = document.getElementById('loginPassword');
const loginButton = document.getElementById('loginButton');
const loginMessage = document.getElementById('loginMessage');

const registerUsernameInput = document.getElementById('registerUsername');
const registerPasswordInput = document.getElementById('registerPassword');
const registerButton = document.getElementById('registerButton');
const registerMessage = document.getElementById('registerMessage');

// Kullanıcı verilerini localStorage'da tutacağız.
// Örnek yapı: { "username1": { "password": "hashedpass", "balance": 1000 }, ... }
let users = JSON.parse(localStorage.getItem('hansellCasinoUsers')) || {};

// Aktif kullanıcıyı localStorage'da tut (kim giriş yaptı)
let activeUser = localStorage.getItem('hansellCasinoActiveUser');

// Eğer aktif kullanıcı varsa direkt lobiye yönlendir
// Bu kontrol, sadece index.html yüklendiğinde çalışmalı
if (activeUser) {
    window.location.href = 'lobby.html';
}

// Tabları değiştirme fonksiyonu
function showTab(tabName) {
    if (tabName === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
    // Mesajları temizle
    loginMessage.textContent = '';
    registerMessage.textContent = '';
}

// Kayıt Olma İşlemi
registerButton.addEventListener('click', () => {
    const username = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value.trim();

    if (!username || !password) {
        registerMessage.textContent = 'Kullanıcı adı ve şifre boş olamaz!';
        registerMessage.style.color = '#f8d7da'; // Kırmızımsı hata
        return;
    }

    if (users[username]) {
        registerMessage.textContent = 'Bu kullanıcı adı zaten kayıtlı. Başka bir tane dene.';
        registerMessage.style.color = '#f8d7da';
        return;
    }

    // Şifreyi basitçe hash'liyoruz (gerçek uygulamada daha karmaşık olmalı)
    const hashedPassword = btoa(password); // Base64 encoding

    users[username] = {
        password: hashedPassword,
        balance: 1000 // Yeni kullanıcıya başlangıç bakiyesi
    };
    localStorage.setItem('hansellCasinoUsers', JSON.stringify(users));
    registerMessage.textContent = 'Kayıt başarılı! Şimdi giriş yapabilirsin.';
    registerMessage.style.color = '#d4edda'; // Yeşilimsi başarı
    
    // Kayıt sonrası Giriş ekranına geç
    showTab('login');
    loginUsernameInput.value = username; // Kayıtlı kullanıcı adını giriş alanına yaz
    registerUsernameInput.value = '';
    registerPasswordInput.value = '';
});

// Giriş Yapma İşlemi
loginButton.addEventListener('click', () => {
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!username || !password) {
        loginMessage.textContent = 'Kullanıcı adı ve şifre boş olamaz!';
        loginMessage.style.color = '#f8d7da';
        return;
    }

    const user = users[username];

    if (!user) {
        loginMessage.textContent = 'Kullanıcı bulunamadı. Lütfen kayıt olun.';
        loginMessage.style.color = '#f8d7da';
        return;
    }

    // Şifreyi karşılaştır
    const hashedPassword = btoa(password);
    if (user.password !== hashedPassword) {
        loginMessage.textContent = 'Şifre yanlış. Tekrar dene.';
        loginMessage.style.color = '#f8d7da';
        return;
    }

    // Giriş başarılı
    localStorage.setItem('hansellCasinoActiveUser', username); // Aktif kullanıcıyı kaydet
    loginMessage.textContent = 'Giriş başarılı! Yönlendiriliyorsun...';
    loginMessage.style.color = '#d4edda';
    
    setTimeout(() => {
        window.location.href = 'lobby.html'; // Lobiye yönlendir
    }, 1000); // 1 saniye sonra yönlendir
});

// Tab butonlarına olay dinleyicileri
loginTab.addEventListener('click', () => showTab('login'));
registerTab.addEventListener('click', () => showTab('register'));

// Sayfa yüklendiğinde varsayılan olarak Giriş sekmesini göster
document.addEventListener('DOMContentLoaded', () => {
    showTab('login');
});