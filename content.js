// Prevent multiple injections
if (window.proompterInitialized) {
  debug('Content script already initialized, skipping');
} else {
  window.proompterInitialized = true;

  // Debug logging helper
  function debug(message, ...args) {
    console.log(`[Proompter Content Script] ${message}`, ...args);
  }

  // Log when content script loads
  debug('Content script loaded');

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    debug('Message received:', request.action);
    
    if (request.action === 'getSelection') {
      const selectedText = window.getSelection().toString().trim();
      debug('Selected text:', selectedText ? selectedText.substring(0, 50) + '...' : 'none');
      
      if (selectedText) {
        showNotification('Enhancing your prompt...', 'info', 0);
      }
      sendResponse({ selectedText });
    } else if (request.action === 'setClipboard') {
      debug('Setting clipboard text');
      hideNotification();
      navigator.clipboard.writeText(request.text).then(() => {
        if (request.text.includes('API Key Required')) {
          debug('Showing API key required notification');
          showNotification(request.text, 'error', 10000); // Show for 10 seconds
        } else if (request.text.startsWith('Error:')) {
          debug('Showing error notification');
          showNotification(request.text, 'error');
        } else {
          debug('Showing success notification');
          showNotification('Enhanced prompt copied to clipboard!', 'success');
        }
      }).catch(error => {
        debug('Clipboard error:', error);
        showNotification('Error copying to clipboard', 'error');
      });
    }
    return true;
  });

  let activeNotification = null;

  function showNotification(message, type = 'success', duration = 2000) {
    debug('Showing notification:', message, type);
    // Hide any existing notification
    hideNotification();

    const notification = document.createElement('div');
    
    // Handle multi-line messages
    if (message.includes('\n')) {
      message.split('\n').forEach((line, index) => {
        if (index > 0) notification.appendChild(document.createElement('br'));
        notification.appendChild(document.createTextNode(line));
      });
    } else {
      notification.textContent = message;
    }
    
    // Add loading spinner for info type
    if (type === 'info') {
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      notification.prepend(spinner);
    }

    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
      z-index: 2147483647;
      opacity: 0;
      transition: opacity 0.3s ease;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      max-width: 400px;
    `;

    // Style based on type
    switch (type) {
      case 'error':
        notification.style.backgroundColor = '#fc8181';
        notification.style.color = '#fff';
        break;
      case 'info':
        notification.style.backgroundColor = '#4299e1';
        notification.style.color = '#fff';
        break;
      default:
        notification.style.backgroundColor = '#48bb78';
        notification.style.color = '#fff';
    }

    // Add spinner styles if needed
    if (type === 'info') {
      const style = document.createElement('style');
      style.textContent = `
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff;
          border-top: 2px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          flex-shrink: 0;
          margin-top: 2px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    activeNotification = notification;
    
    // Fade in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);

    // Remove after duration (if specified)
    if (duration > 0) {
      setTimeout(() => {
        hideNotification();
      }, duration);
    }
  }

  function hideNotification() {
    if (activeNotification) {
      debug('Hiding notification');
      activeNotification.style.opacity = '0';
      setTimeout(() => {
        if (activeNotification && activeNotification.parentNode) {
          activeNotification.parentNode.removeChild(activeNotification);
        }
        activeNotification = null;
      }, 300);
    }
  }
} 