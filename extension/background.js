// Background script - xử lý logic chính

// Khi extension được cài đặt
chrome.runtime.onInstalled.addListener(() => {
  console.log('Vocab Lookup Extension installed');
});

// Lắng nghe messages từ content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  switch (request.action) {
    case 'checkLoginStatus':
      checkLoginStatus()
        .then(sendResponse)
        .catch(error => {
          sendResponse({ isLoggedIn: false, error: error.message });
        });
      return true;

    case 'openLoginTab':
      openLoginTab()
        .then(sendResponse)
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'lookupWord':
      lookupWord(request.word)
        .then(sendResponse)
        .catch(error => {
          sendResponse({ error: error.message });
        });
      return true;

    case 'addToVocabulary':
      addToVocabulary(request.wordId, request.meaningId)
        .then(sendResponse)
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'fetchAudio':
      fetchAudioAsBlob(request.audioUrl)
        .then(sendResponse)
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Kiểm tra trạng thái đăng nhập
async function checkLoginStatus() {
  try {
    // Lấy session cookie
    const sessionCookie = await chrome.cookies.get({
      url: 'http://localhost:3000',
      name: 'next-auth.session-token',
    });

    console.log('Session cookie:', sessionCookie);

    if (!sessionCookie?.value) {
      return { isLoggedIn: false };
    }

    // Verify session với API
    const response = await fetch('http://localhost:3000/api/auth/session', {
      method: 'GET',
      headers: {
        Cookie: `next-auth.session-token=${sessionCookie.value}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Session verification failed');
    }

    const sessionData = await response.json();
    console.log('Session data:', sessionData);

    const isLoggedIn = !!(sessionData && sessionData.user && sessionData.user.email);

    return {
      isLoggedIn,
      user: sessionData?.user || null,
    };
  } catch (error) {
    console.error('Check login status error:', error);
    return { isLoggedIn: false, error: error.message };
  }
}

// Mở tab đăng nhập
async function openLoginTab() {
  try {
    const tab = await chrome.tabs.create({
      url: 'http://localhost:3000/login',
      active: true,
    });

    return { success: true, tabId: tab.id };
  } catch (error) {
    console.error('Open login tab error:', error);
    throw error;
  }
}

// Tra từ
async function lookupWord(word) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/crawl?word=${encodeURIComponent(word)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Word lookup data:', data);

    return data;
  } catch (error) {
    console.error('Lookup word error:', error);
    throw error;
  }
}

// Thêm từ vào từ vựng
async function addToVocabulary(wordId, meaningId) {
  try {
    // Lấy session cookie và user info
    const loginStatus = await checkLoginStatus();

    if (!loginStatus.isLoggedIn) {
      throw new Error('Chưa đăng nhập');
    }

    const sessionCookie = await chrome.cookies.get({
      url: 'http://localhost:3000',
      name: 'next-auth.session-token',
    });

    if (!sessionCookie?.value) {
      throw new Error('Không tìm thấy session cookie');
    }

    const response = await fetch('http://localhost:3000/api/addToUserWords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `next-auth.session-token=${sessionCookie.value}`,
      },
      body: JSON.stringify({
        wordId: wordId,
        meaningId: meaningId,
        userId: parseInt(loginStatus.user.id),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Add to vocabulary result:', result);

    if (!result.success) {
      throw new Error(result.message || 'Thêm từ thất bại');
    }

    return { success: true };
  } catch (error) {
    console.error('Add to vocabulary error:', error);
    throw error;
  }
}

// Lắng nghe khi tab được cập nhật (để detect khi user đăng nhập xong)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes('localhost:3000') &&
    tab.url.includes('/home')
  ) {
    // User đã đăng nhập thành công và được redirect về /home
    console.log('Login successful detected');

    // Có thể gửi message để notify content script
    chrome.tabs
      .sendMessage(tabId, {
        action: 'loginSuccess',
      })
      .catch(() => {
        // Ignore errors if content script not ready
      });
  }
});

// Function để fetch audio và convert thành data URL
async function fetchAudioAsBlob(audioUrl) {
  try {
    console.log('Fetching audio:', audioUrl);

    const response = await fetch(audioUrl);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const audioBlob = await response.blob();

    // Convert blob to ArrayBuffer, then to base64 data URL
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log('Audio data URL created');

    return {
      success: true,
      dataUrl: dataUrl,
      contentType: contentType,
    };
  } catch (error) {
    console.error('Fetch audio error:', error);
    throw error;
  }
}
