// Content script for enhanced page information extraction

class PageInfoExtractor {
  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getPageInfo') {
        const pageInfo = this.extractPageInfo();
        sendResponse(pageInfo);
      }
      return true; // Keep message channel open for async response
    });
  }

  extractPageInfo() {
    const title = this.getTitle();
    const description = this.getDescription();
    const canonicalUrl = this.getCanonicalUrl();
    
    return {
      title,
      description,
      canonicalUrl,
      url: window.location.href
    };
  }

  getTitle() {
    // Try multiple sources for the best title
    const sources = [
      () => document.querySelector('meta[property="og:title"]')?.content,
      () => document.querySelector('meta[name="twitter:title"]')?.content,
      () => document.querySelector('h1')?.textContent?.trim(),
      () => document.title
    ];

    for (const getTitle of sources) {
      try {
        const title = getTitle();
        if (title && title.length > 0 && title !== 'undefined') {
          return title;
        }
      } catch (error) {
        continue;
      }
    }

    return document.title || '';
  }

  getDescription() {
    // Try multiple sources for description
    const sources = [
      () => document.querySelector('meta[property="og:description"]')?.content,
      () => document.querySelector('meta[name="twitter:description"]')?.content,
      () => document.querySelector('meta[name="description"]')?.content,
      () => this.extractFirstParagraph()
    ];

    for (const getDesc of sources) {
      try {
        const desc = getDesc();
        if (desc && desc.length > 10 && desc !== 'undefined') {
          return desc.slice(0, 300); // Limit description length
        }
      } catch (error) {
        continue;
      }
    }

    return '';
  }

  extractFirstParagraph() {
    const paragraphs = document.querySelectorAll('p');
    for (const p of paragraphs) {
      const text = p.textContent?.trim();
      if (text && text.length > 50) {
        return text;
      }
    }
    return '';
  }

  getCanonicalUrl() {
    const canonical = document.querySelector('link[rel="canonical"]');
    return canonical?.href || window.location.href;
  }
}

// Initialize page info extractor
new PageInfoExtractor();