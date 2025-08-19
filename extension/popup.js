// Popup script - hiển thị trong extension popup

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');

  try {
    // Kiểm tra trạng thái đăng nhập
    const response = await chrome.runtime.sendMessage({
      action: 'checkLoginStatus',
    });

    if (response.isLoggedIn && response.user) {
      statusDiv.className = 'status success';
      statusDiv.innerHTML = `
        ✅ Đã đăng nhập<br>
        <small>Xin chào, ${response.user.name || response.user.email}!</small>
      `;
    } else {
      statusDiv.className = 'status error';
      statusDiv.innerHTML = `
        ❌ Chưa đăng nhập<br>
        <button class="login-btn" onclick="openLogin()">Đăng nhập ngay</button>
      `;
    }
  } catch (error) {
    statusDiv.className = 'status error';
    statusDiv.innerHTML = `
      ⚠️ Lỗi kết nối<br>
      <small>${error.message}</small><br>
      <button class="login-btn" onclick="checkAgain()">Kiểm tra lại</button>
    `;
  }
});

// Mở tab đăng nhập
async function openLogin() {
  try {
    await chrome.runtime.sendMessage({
      action: 'openLoginTab',
    });
    // Đóng popup sau khi mở tab
    window.close();
  } catch (error) {
    console.error('Error opening login tab:', error);
  }
}

// Kiểm tra lại trạng thái
function checkAgain() {
  location.reload();
}
