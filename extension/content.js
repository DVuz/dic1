// Content script - xử lý double-click và hiển thị popup

let currentPopup = null;
let currentToast = null;

// Tạo toast notification
function showToast(message, type = 'success') {
  // Remove existing toast
  if (currentToast) {
    currentToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `vocab-toast vocab-toast-${type}`;
  toast.textContent = message;

  // Position at top-right corner
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: all 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;

  if (type === 'success') {
    toast.style.backgroundColor = '#10b981';
    toast.style.color = 'white';
  } else {
    toast.style.backgroundColor = '#ef4444';
    toast.style.color = 'white';
  }

  document.body.appendChild(toast);
  currentToast = toast;

  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 10);

  // Auto remove
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast && toast.parentNode) {
          toast.remove();
        }
        if (currentToast === toast) {
          currentToast = null;
        }
      }, 300);
    }
  }, 3000);
}

// Xóa popup hiện tại
function removeCurrentPopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
}

// Tạo popup tra từ
function createWordPopup(word, x, y) {
  removeCurrentPopup();

  const popup = document.createElement('div');
  popup.className = 'vocab-popup';
  popup.innerHTML = `
    <div class="vocab-popup-header">
      <div class="vocab-popup-word">${word}</div>
      <button class="vocab-popup-close">×</button>
    </div>
    <div class="vocab-popup-content">
      <div class="vocab-popup-loading">
        <div class="vocab-spinner"></div>
        <div>Đang tìm kiếm...</div>
      </div>
    </div>
  `;

  // Position popup với kích thước lớn hơn
  const popupWidth = 380;
  const popupMaxHeight = Math.min(500, window.innerHeight - 50);

  popup.style.left = `${Math.min(x, window.innerWidth - popupWidth - 20)}px`;
  popup.style.top = `${Math.min(y + 20, window.innerHeight - popupMaxHeight - 20)}px`;
  popup.style.width = `${popupWidth}px`;
  popup.style.maxHeight = `${popupMaxHeight}px`;

  document.body.appendChild(popup);
  currentPopup = popup;

  // Close button
  popup.querySelector('.vocab-popup-close').onclick = () => {
    removeCurrentPopup();
  };

  // Close when clicking outside
  document.addEventListener('click', function closeHandler(e) {
    if (!popup.contains(e.target)) {
      removeCurrentPopup();
      document.removeEventListener('click', closeHandler);
    }
  });

  return popup;
}

// Hiển thị kết quả tra từ
function displayWordResult(popup, data) {
  const content = popup.querySelector('.vocab-popup-content');

  if (data.error) {
    content.innerHTML = `
      <div class="vocab-error">
        <div class="vocab-error-icon">⚠️</div>
        <div>${data.error}</div>
      </div>
    `;
    return;
  }

  const meanings = data.meanings || [];

  content.innerHTML = `
    <div class="vocab-word-info">
      ${
        data.translation
          ? `
        <div class="vocab-translation">
          ${data.translation}
        </div>
      `
          : ''
      }

      <div class="vocab-meanings">
        ${meanings
          .map(
            (meaning, index) => `
          <div class="vocab-meaning" data-meaning-index="${index}">
            <div class="vocab-meaning-header">
              <div class="vocab-header-left">
                ${
                  meaning.partOfSpeech
                    ? `<span class="vocab-pos">${meaning.partOfSpeech}</span>`
                    : ''
                }
                ${
                  meaning.cefr_level ? `<span class="vocab-level">${meaning.cefr_level}</span>` : ''
                }
              </div>
              <div class="vocab-audio-controls">
                ${
                  meaning.audio?.uk
                    ? `<button class="vocab-audio" data-audio="${meaning.audio.uk}" data-type="uk" title="UK pronunciation">🔊 UK</button>`
                    : ''
                }
                ${
                  meaning.audio?.us
                    ? `<button class="vocab-audio" data-audio="${meaning.audio.us}" data-type="us" title="US pronunciation">🔊 US</button>`
                    : ''
                }
              </div>
            </div>

            ${
              meaning.ipa
                ? `
              <div class="vocab-ipa">
                ${
                  meaning.ipa.uk
                    ? `<span class="vocab-ipa-item uk">UK: /${meaning.ipa.uk}/</span>`
                    : ''
                }
                ${
                  meaning.ipa.us
                    ? `<span class="vocab-ipa-item us">US: /${meaning.ipa.us}/</span>`
                    : ''
                }
              </div>
            `
                : ''
            }

            <div class="vocab-definition">${meaning.definition}</div>

            ${
              meaning.vnDefinition
                ? `<div class="vocab-vn-definition">${meaning.vnDefinition}</div>`
                : ''
            }

            ${
              meaning.examples?.length
                ? `
              <div class="vocab-examples">
                ${meaning.examples
                  .slice(0, 2)
                  .map(ex => `<div class="vocab-example">"${ex}"</div>`)
                  .join('')}
                ${
                  meaning.examples.length > 2
                    ? `<div class="vocab-example-more">+${
                        meaning.examples.length - 2
                      } ví dụ khác...</div>`
                    : ''
                }
              </div>
            `
                : ''
            }

            <button class="vocab-add-btn" data-word-id="${data.wordId}" data-meaning-id="${
              meaning.id
            }">
              <span class="vocab-add-icon">+</span>
              <span class="vocab-add-text">Thêm vào từ vựng</span>
            </button>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  // Add event listeners for audio buttons
  content.querySelectorAll('.vocab-audio').forEach(btn => {
    btn.onclick = async () => {
      const audioUrl = btn.dataset.audio;
      const audioType = btn.dataset.type || 'us';
      const originalHTML = btn.innerHTML;

      try {
        // Hiển thị loading
        btn.innerHTML = '<div class="vocab-spinner-small"></div>Loading...';
        btn.disabled = true;

        // Fetch audio through background script
        const response = await chrome.runtime.sendMessage({
          action: 'fetchAudio',
          audioUrl: audioUrl,
        });

        if (response.success) {
          // Update button to show playing
          btn.innerHTML = `🔊 Playing ${audioType.toUpperCase()}...`;

          // Tạo và play audio với data URL
          const audio = new Audio(response.dataUrl);

          // Event listeners
          audio.onplay = () => {
            console.log('Audio started playing');
          };

          audio.onended = () => {
            console.log('Audio finished playing');
            // Reset button
            btn.innerHTML = originalHTML;
            btn.disabled = false;
          };

          audio.onerror = e => {
            console.error('Audio playback error:', e);
            throw new Error('Audio playback failed');
          };

          // Play audio
          await audio.play();
        } else {
          throw new Error(response.error || 'Failed to fetch audio');
        }
      } catch (error) {
        console.error('Error playing audio:', error);

        // Reset button on error
        btn.innerHTML = originalHTML;
        btn.disabled = false;

        // Show error feedback
        btn.style.backgroundColor = '#ef4444';
        btn.style.color = 'white';
        setTimeout(() => {
          btn.style.backgroundColor = '';
          btn.style.color = '';
        }, 2000);

        // Show toast error
        showToast('Không thể phát âm thanh: ' + error.message, 'error');
      }
    };
  });

  content.querySelectorAll('.vocab-add-btn').forEach(btn => {
    btn.onclick = async () => {
      const wordId = btn.dataset.wordId;
      const meaningId = btn.dataset.meaningId;

      if (!wordId || !meaningId) {
        showToast('Thông tin từ vựng không đầy đủ', 'error');
        return;
      }

      btn.disabled = true;
      const textSpan = btn.querySelector('.vocab-add-text');
      const iconSpan = btn.querySelector('.vocab-add-icon');

      iconSpan.innerHTML = '<div class="vocab-spinner-small"></div>';
      textSpan.textContent = 'Đang thêm...';

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'addToVocabulary',
          wordId: parseInt(wordId),
          meaningId: parseInt(meaningId),
        });

        if (response.success) {
          showToast('Đã thêm từ vào danh sách học!', 'success');
          iconSpan.textContent = '✓';
          textSpan.textContent = 'Đã thêm';
          btn.classList.add('vocab-added');
        } else {
          throw new Error(response.error || 'Thêm từ thất bại');
        }
      } catch (error) {
        console.error('Add to vocabulary error:', error);
        showToast(error.message || 'Có lỗi xảy ra khi thêm từ', 'error');
        btn.disabled = false;
        iconSpan.textContent = '+';
        textSpan.textContent = 'Thêm vào từ vựng';
      }
    };
  });
}

// Xử lý double-click
document.addEventListener('dblclick', async function (event) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (!selectedText || selectedText.length > 50) {
    return;
  }

  // Chỉ xử lý từ tiếng Anh
  if (!/^[a-zA-Z\s-']+$/.test(selectedText)) {
    return;
  }

  const word = selectedText.toLowerCase();
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const x = rect.left + window.scrollX;
  const y = rect.bottom + window.scrollY;

  try {
    // Kiểm tra đăng nhập
    const loginStatus = await chrome.runtime.sendMessage({
      action: 'checkLoginStatus',
    });

    if (!loginStatus.isLoggedIn) {
      // Chưa đăng nhập - mở tab đăng nhập
      showToast('Chưa đăng nhập. Đang mở trang đăng nhập...', 'error');
      await chrome.runtime.sendMessage({
        action: 'openLoginTab',
      });
      return;
    }

    // Đã đăng nhập - tạo popup và tra từ
    const popup = createWordPopup(word, x, y);

    // Gửi request tra từ
    const wordData = await chrome.runtime.sendMessage({
      action: 'lookupWord',
      word: word,
    });

    displayWordResult(popup, wordData);
  } catch (error) {
    console.error('Double-click handler error:', error);
    showToast('Có lỗi xảy ra: ' + error.message, 'error');
  }
});

// Ngăn chặn selection khi click vào popup
document.addEventListener('mousedown', function (event) {
  if (currentPopup && currentPopup.contains(event.target)) {
    event.preventDefault();
  }
});
