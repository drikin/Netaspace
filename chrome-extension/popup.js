// Chrome Extension popup script for Backspace.fm topic submission

class TopicSubmitter {
  constructor() {
    this.form = document.getElementById('topicForm');
    this.titleInput = document.getElementById('title');
    this.urlPreview = document.getElementById('urlPreview');
    this.descriptionInput = document.getElementById('description');
    this.submitterInput = document.getElementById('submitter');
    this.serverUrlInput = document.getElementById('serverUrl');
    this.submitBtn = document.getElementById('submitBtn');
    this.statusDiv = document.getElementById('status');
    
    this.init();
  }

  async init() {
    // Load saved settings
    await this.loadSettings();
    
    // Get current page info
    await this.getCurrentPageInfo();
    
    // Bind events
    this.bindEvents();
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get(['submitter', 'serverUrl']);
    
    if (result.submitter) {
      this.submitterInput.value = result.submitter;
    }
    
    if (result.serverUrl) {
      this.serverUrlInput.value = result.serverUrl;
    } else {
      // Default to the deployed application URL
      this.serverUrlInput.value = 'https://netaspace.replit.app';
    }
  }

  async getCurrentPageInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        this.urlPreview.textContent = tab.url;
        
        // Try to get page title, fallback to tab title
        if (tab.title && tab.title !== 'New Tab') {
          this.titleInput.value = tab.title;
        }
        
        // Get additional page info from content script
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
          if (response && response.title) {
            this.titleInput.value = response.title;
          }
          if (response && response.description) {
            this.descriptionInput.value = response.description;
          }
        } catch (error) {
          // Content script might not be loaded, use tab info
          console.log('Content script not available, using tab info');
        }
      }
    } catch (error) {
      console.error('Failed to get current page info:', error);
      this.showStatus('ページ情報の取得に失敗しました', 'error');
    }
  }

  bindEvents() {
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Save settings on change
    this.submitterInput.addEventListener('change', () => this.saveSettings());
    this.serverUrlInput.addEventListener('change', () => this.saveSettings());
  }

  async saveSettings() {
    await chrome.storage.sync.set({
      submitter: this.submitterInput.value,
      serverUrl: this.serverUrlInput.value
    });
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    // Prevent double submission
    if (this.submitBtn.disabled) {
      return;
    }
    
    const title = this.titleInput.value.trim();
    const url = this.urlPreview.textContent.trim();
    const description = this.descriptionInput.value.trim();
    const submitter = this.submitterInput.value.trim();
    const serverUrl = this.serverUrlInput.value.trim();

    if (!title || !url || !submitter || !serverUrl) {
      this.showStatus('必須項目を入力してください', 'error');
      return;
    }

    // Validate server URL
    try {
      new URL(serverUrl);
    } catch (error) {
      this.showStatus('有効なサーバーURLを入力してください', 'error');
      return;
    }

    this.setLoading(true);

    try {
      await this.saveSettings();
      await this.submitTopic({ title, url, description, submitter, serverUrl });
    } catch (error) {
      console.error('Submission error:', error);
      this.showStatus(`投稿に失敗しました: ${error.message}`, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async submitTopic({ title, url, description, submitter, serverUrl }) {
    // Generate a simple fingerprint for the user
    const fingerprint = await this.generateFingerprint();
    
    const payload = {
      title,
      url,
      description: description || null,
      submitter,
      fingerprint
    };

    const response = await fetch(`${serverUrl}/api/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    this.showStatus('ネタ投稿ありがとうございます！引き続きbackspace.fmをよろしくお願いします！', 'success');
    
    // Clear form after successful submission
    setTimeout(() => {
      this.titleInput.value = '';
      this.descriptionInput.value = '';
      window.close();
    }, 1500);
  }

  async generateFingerprint() {
    // Simple fingerprint generation based on browser characteristics
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Backspace.fm Extension', 2, 2);
    
    const canvasFingerprint = canvas.toDataURL();
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const data = `${canvasFingerprint}-${userAgent}-${language}-${timezone}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `ext-${Math.abs(hash).toString(36)}`;
  }

  setLoading(loading) {
    this.submitBtn.disabled = loading;
    this.submitBtn.textContent = loading ? '投稿中...' : 'ネタを投稿';
  }

  showStatus(message, type) {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status ${type}`;
    this.statusDiv.style.display = 'block';
    
    if (type === 'success') {
      setTimeout(() => {
        this.statusDiv.style.display = 'none';
      }, 3000);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TopicSubmitter();
});