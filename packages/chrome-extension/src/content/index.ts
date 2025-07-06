import { ChromeMessage, AllowedSite, LogLevel, ExtensionSettings } from '@vibelogger/shared';

let isEnabled = false;
let currentName = '';
let logLevel: LogLevel = 'none';

// Check if current site is allowed
async function checkSiteStatus() {
  // For any frame (main or iframe), check if the TAB is allowlisted
  // This is better than checking individual frame domains
  
  return new Promise<boolean>((resolve) => {
    // Get the tab's URL through the Chrome API
    chrome.runtime.sendMessage({ action: 'getTabInfo' }, (response) => {
      if (!response || !response.url) {
        console.log('[VibeLogger] Could not get tab info');
        resolve(false);
        return;
      }
      
      const tabUrl = new URL(response.url);
      const tabHostname = tabUrl.hostname;
      
      chrome.storage.sync.get(['allowedSites', 'settings'], (result) => {
        const sites: AllowedSite[] = result.allowedSites || [];
        const settings: ExtensionSettings = result.settings || {};
        logLevel = settings.logLevel || 'none';
        
        const site = sites.find(s => s.domain === tabHostname);
        
        if (site && site.enabled) {
          isEnabled = true;
          currentName = site.name || tabHostname;
          if (logLevel === 'verbose') {
            console.log(`[VibeLogger] Tab ${tabHostname} is allowlisted with name: ${currentName}`);
          }
          resolve(true);
        } else {
          isEnabled = false;
          if (logLevel === 'verbose') {
            console.log(`[VibeLogger] Tab ${tabHostname} is not allowlisted`);
          }
          resolve(false);
        }
      });
    });
  });
}

// Inject script into page context
function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/page-script.js');
  script.id = 'vibelogger-injected';
  
  // Inject at the earliest opportunity
  if (document.documentElement) {
    document.documentElement.appendChild(script);
  } else {
    // Fallback for very early injection
    const observer = new MutationObserver(() => {
      if (document.documentElement) {
        document.documentElement.appendChild(script);
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }
  
  // Clean up the script tag after it loads
  script.onload = () => {
    setTimeout(() => script.remove(), 0);
  };
}

// Listen for messages from the injected script
function setupMessageListener() {
  window.addEventListener('message', (event) => {
    // Only accept messages from our injected script
    if (event.source !== window || !event.data || event.data.source !== 'vibelogger-page') {
      return;
    }
    
    // Skip if not enabled
    if (!isEnabled) {
      return;
    }
    
    const data = event.data;
    
    // Convert to ChromeMessage format
    const message: ChromeMessage = {
      type: data.type === 'error' ? 'error' : 'console',
      timestamp: data.timestamp,
      level: data.method,
      args: data.args,
      url: data.url,
    };
    
    // Send to background script
    try {
      chrome.runtime.sendMessage({
        action: 'log',
        data: message,
        name: currentName,
      }, (response) => {
        if (chrome.runtime.lastError && logLevel === 'verbose') {
          console.error('[VibeLogger] Error sending log:', chrome.runtime.lastError);
        }
      });
    } catch (err) {
      if (logLevel === 'verbose') {
        console.error('[VibeLogger] Failed to send log:', err);
      }
    }
  });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.allowedSites) {
    checkSiteStatus();
  }
});

// Initialize
async function init() {
  const isIframe = window !== window.top;
  const frameInfo = isIframe ? 'IFRAME' : 'MAIN FRAME';
  
  // Check if tab is allowlisted
  const enabled = await checkSiteStatus();
  
  if (enabled) {
    if (logLevel === 'verbose') {
      console.log(`[VibeLogger] Initializing in ${frameInfo} on ${window.location.href}`);
      console.log(`[VibeLogger] Tab is allowlisted! Setting up console capture...`);
    }
    
    // Only inject in main frame to avoid duplication
    if (!isIframe) {
      injectPageScript();
    }
    
    // Set up message listener in all frames
    setupMessageListener();
    
    if (logLevel === 'minimal') {
      console.log(`[VibeLogger] Ready`);
    } else if (logLevel === 'verbose') {
      console.log(`[VibeLogger] Ready to capture logs in ${frameInfo}`);
    }
  } else {
    if (logLevel === 'verbose') {
      console.log('[VibeLogger] Tab is not allowlisted, skipping setup');
    }
  }
}

// Run immediately - we need to inject as early as possible
init();