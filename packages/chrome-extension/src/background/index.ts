import { ChromeMessage, LogRecord, SERVER_URL, PATHS, BATCH_INTERVAL_MS, encodeBase64 } from '@vibelogger/shared';

interface LogBatch {
  name: string;
  records: LogRecord[];
}

const logBatches = new Map<string, LogBatch>();
let batchTimer: number | null = null;

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('VibeLogger extension installed');
  updateAllTabIcons();
});

// Update icon when tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  updateTabIcon(activeInfo.tabId);
});

// Update icon when tab URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    updateTabIcon(tabId);
  }
});

// Update icon when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.allowedSites) {
    updateAllTabIcons();
  }
});

// Function to update icon for a specific tab
async function updateTabIcon(tabId: number) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;
    
    const url = new URL(tab.url);
    const hostname = url.hostname;
    
    const result = await chrome.storage.sync.get(['allowedSites']);
    const sites: AllowedSite[] = result.allowedSites || [];
    const site = sites.find(s => s.domain === hostname);
    
    const isEnabled = site && site.enabled;
    
    // Update badge to show status
    if (isEnabled) {
      // Clear badge for enabled sites
      chrome.action.setBadgeText({ tabId, text: '' });
      chrome.action.setTitle({ tabId, title: 'VibeLogger - Active' });
    } else {
      // Show OFF badge for disabled sites
      chrome.action.setBadgeText({ tabId, text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#666666' });
      chrome.action.setTitle({ tabId, title: 'VibeLogger - Inactive' });
    }
  } catch (err) {
    console.error('Error updating tab icon:', err);
  }
}

// Function to update all tab icons
async function updateAllTabIcons() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      updateTabIcon(tab.id);
    }
  }
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[VibeLogger Background] Received message:', request);
  
  if (request.action === 'getTabInfo') {
    // Return the tab's URL so content script can check if tab is allowlisted
    if (sender.tab && sender.tab.url) {
      sendResponse({ url: sender.tab.url });
    } else {
      sendResponse({ url: null });
    }
    return true;
  }
  
  if (request.action === 'log') {
    const { data, tag } = request as { data: ChromeMessage; tag: string };
    
    console.log('[VibeLogger Background] Processing log:', data.type, data.level);
    
    // Convert ChromeMessage to LogRecord
    const record: LogRecord = {
      ts: data.timestamp,
      level: data.level as 'log' | 'info' | 'warn' | 'error' | 'debug',
      message: data.args?.join(' ') || data.error || '',
      url: data.url,
      tags: [tag || 'unknown'],
    };
    
    console.log('[VibeLogger Background] Adding to batch:', record);
    
    // Add to batch
    addToBatch(tag || 'unknown', record);
    
    sendResponse({ success: true });
  }
  
  return true;
});

// Add log to batch
function addToBatch(name: string, record: LogRecord) {
  let batch = logBatches.get(name);
  
  if (!batch) {
    batch = { name, records: [] };
    logBatches.set(name, batch);
  }
  
  batch.records.push(record);
  
  // Schedule batch send
  scheduleBatchSend();
}

// Schedule batch sending
function scheduleBatchSend() {
  if (batchTimer) return;
  
  batchTimer = setTimeout(() => {
    sendBatches();
    batchTimer = null;
  }, BATCH_INTERVAL_MS) as unknown as number;
}

// Send all batches
async function sendBatches() {
  const batches = Array.from(logBatches.values());
  logBatches.clear();
  
  for (const batch of batches) {
    if (batch.records.length === 0) continue;
    
    try {
      await sendBatch(batch);
    } catch (err) {
      console.error('Failed to send batch:', err);
      // Store in local storage for retry
      await storeBatchForRetry(batch);
    }
  }
  
  // Try to send any stored batches
  await retrySendStoredBatches();
}

// Send a single batch
async function sendBatch(batch: LogBatch) {
  console.log('[VibeLogger Background] Sending batch:', batch);
  
  const ndjsonLines = batch.records.map(record => {
    const logRecord: LogRecord = {
      ...record,
      data: record.message ? encodeBase64(record.message) : undefined,
    };
    delete logRecord.message;
    return JSON.stringify(logRecord);
  }).join('\n');
  
  const url = `${SERVER_URL}${PATHS.INGEST}/${batch.name}`;
  console.log('[VibeLogger Background] Sending to:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
      },
      body: ndjsonLines,
    });
    
    console.log('[VibeLogger Background] Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
  } catch (err) {
    console.error('[VibeLogger Background] Send error:', err);
    throw err;
  }
}

// Store batch for retry
async function storeBatchForRetry(batch: LogBatch) {
  const stored = await chrome.storage.local.get(['failedBatches']);
  const failedBatches = stored.failedBatches || [];
  
  failedBatches.push({
    ...batch,
    timestamp: Date.now(),
  });
  
  // Keep only last 100 failed batches
  if (failedBatches.length > 100) {
    failedBatches.splice(0, failedBatches.length - 100);
  }
  
  await chrome.storage.local.set({ failedBatches });
}

// Retry sending stored batches
async function retrySendStoredBatches() {
  const stored = await chrome.storage.local.get(['failedBatches']);
  const failedBatches = stored.failedBatches || [];
  
  if (failedBatches.length === 0) return;
  
  const successfulIndices: number[] = [];
  
  for (let i = 0; i < failedBatches.length; i++) {
    try {
      await sendBatch(failedBatches[i]);
      successfulIndices.push(i);
    } catch (err) {
      // Still failing, keep in storage
      console.error('Retry failed:', err);
    }
  }
  
  // Remove successful batches
  if (successfulIndices.length > 0) {
    const remainingBatches = failedBatches.filter(
      (_: any, index: number) => !successfulIndices.includes(index)
    );
    await chrome.storage.local.set({ failedBatches: remainingBatches });
  }
}

// Capture network events
chrome.webRequest.onCompleted.addListener(
  (details) => {
    // Check if we should log this request
    chrome.storage.sync.get(['allowedSites'], (result) => {
      const sites = result.allowedSites || [];
      const url = new URL(details.url);
      const site = sites.find((s: AllowedSite) => s.domain === url.hostname);
      
      if (site && site.enabled) {
        const record: LogRecord = {
          ts: Date.now(),
          level: 'info',
          message: `[Network] ${details.method} ${details.url} - ${details.statusCode}`,
          url: details.url,
          tags: [site.tag || site.domain],
        };
        
        addToBatch(site.tag || site.domain, record);
      }
    });
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Periodic retry for failed batches
setInterval(() => {
  retrySendStoredBatches();
}, 30000); // Every 30 seconds