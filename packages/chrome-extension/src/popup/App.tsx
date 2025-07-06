import React, { useState, useEffect } from 'react';
import { AllowedSite, sanitizeName, LogLevel, ExtensionSettings } from '@vibelogger/shared';

export function App() {
  const [sites, setSites] = useState<AllowedSite[]>([]);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [newSitePattern, setNewSitePattern] = useState('');
  const [newSiteLogName, setNewSiteLogName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [logLevel, setLogLevel] = useState<LogLevel>('none');

  useEffect(() => {
    // Load saved sites and settings
    chrome.storage.sync.get(['allowedSites', 'settings'], (result) => {
      if (result.allowedSites) {
        setSites(result.allowedSites);
      }
      if (result.settings) {
        setLogLevel(result.settings.logLevel || 'none');
      }
    });

    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setCurrentTab(tabs[0]);
        // Pre-fill the form with current domain
        try {
          const url = new URL(tabs[0].url || '');
          setNewSitePattern(url.hostname);
          setNewSiteLogName(sanitizeName(url.hostname));
        } catch {}
      }
    });

    // Check server status
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:51234/health');
      if (response.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  };

  const toggleSite = (domain: string) => {
    const updatedSites = sites.map(site =>
      site.domain === domain ? { ...site, enabled: !site.enabled } : site
    );
    setSites(updatedSites);
    chrome.storage.sync.set({ allowedSites: updatedSites });
  };

  const updateSiteTag = (domain: string, tag: string) => {
    const updatedSites = sites.map(site =>
      site.domain === domain ? { ...site, tag: sanitizeName(tag) } : site
    );
    setSites(updatedSites);
    chrome.storage.sync.set({ allowedSites: updatedSites });
  };

  const addSite = () => {
    if (!newSitePattern || !newSiteLogName) return;
    
    const newSite: AllowedSite = {
      domain: newSitePattern,
      enabled: true,
      tag: sanitizeName(newSiteLogName),
    };
    
    const updatedSites = [...sites, newSite];
    setSites(updatedSites);
    chrome.storage.sync.set({ allowedSites: updatedSites });
    
    // Reset form
    setShowAddForm(false);
    setNewSitePattern('');
    setNewSiteLogName('');
  };

  const removeSite = (domain: string) => {
    const updatedSites = sites.filter(site => site.domain !== domain);
    setSites(updatedSites);
    chrome.storage.sync.set({ allowedSites: updatedSites });
  };

  const updateLogLevel = (level: LogLevel) => {
    setLogLevel(level);
    const settings: ExtensionSettings = { logLevel: level };
    chrome.storage.sync.set({ settings });
  };

  const currentDomain = currentTab?.url ? new URL(currentTab.url).hostname : '';
  const isCurrentSiteEnabled = sites.some(site => 
    site.enabled && currentDomain.match(new RegExp(site.domain.replace(/\*/g, '.*')))
  );

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">VibeLogger</h1>
        <div className="status">
          <span className={`status-dot ${serverStatus === 'online' ? 'active' : ''}`} />
          <span>Server {serverStatus}</span>
        </div>
      </div>

      {currentTab && (
        <div className="current-tab-info">
          <div className="current-domain">
            <strong>Current tab:</strong> {currentDomain}
          </div>
          <div className={`current-status ${isCurrentSiteEnabled ? 'enabled' : 'disabled'}`}>
            {isCurrentSiteEnabled ? '✓ Logging enabled' : '✗ Logging disabled'}
          </div>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="empty-state">
          <p>No sites configured yet.</p>
          <p>Click "Add Site" to start logging.</p>
        </div>
      ) : (
        <div className="sites-list">
          <div className="list-header">
            <span>Pattern</span>
            <span>Log Name</span>
            <span>Status</span>
            <span></span>
          </div>
          {sites.map(site => {
            const logFileName = `${site.tag || sanitizeName(site.domain)}.ndjson`;
            return (
              <div key={site.domain} className="site-item">
                <div className="site-pattern" title={site.domain}>
                  {site.domain}
                </div>
                <div className="site-log-name">
                  <input
                    type="text"
                    className="site-tag-input"
                    value={site.tag || ''}
                    onChange={(e) => updateSiteTag(site.domain, e.target.value)}
                    placeholder={sanitizeName(site.domain)}
                  />
                  <span className="log-file-ext">.ndjson</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={site.enabled}
                    onChange={() => toggleSite(site.domain)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <button
                  className="remove-button"
                  onClick={() => removeSite(site.domain)}
                  title="Remove site"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!showAddForm ? (
        <div className="add-site">
          <button className="add-site-button" onClick={() => setShowAddForm(true)}>
            + Add Site
          </button>
        </div>
      ) : (
        <div className="add-site-form">
          <div className="form-group">
            <label>Domain Pattern:</label>
            <input
              type="text"
              value={newSitePattern}
              onChange={(e) => setNewSitePattern(e.target.value)}
              placeholder="e.g., www.example.com or *.example.com"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Log File Name:</label>
            <div className="log-name-input">
              <input
                type="text"
                value={newSiteLogName}
                onChange={(e) => setNewSiteLogName(e.target.value)}
                placeholder="e.g., production_api"
                className="form-input"
              />
              <span className="log-file-ext">.ndjson</span>
            </div>
            <div className="preview">
              Preview: {sanitizeName(newSiteLogName || 'example')}.ndjson
            </div>
          </div>
          <div className="form-actions">
            <button onClick={addSite} className="save-button">Save</button>
            <button onClick={() => {
              setShowAddForm(false);
              setNewSitePattern('');
              setNewSiteLogName('');
            }} className="cancel-button">Cancel</button>
          </div>
        </div>
      )}

      <div className="footer">
        <div className="settings-row">
          <label htmlFor="log-level">VibeLogger Debug Level:</label>
          <select 
            id="log-level"
            value={logLevel} 
            onChange={(e) => updateLogLevel(e.target.value as LogLevel)}
            className="log-level-select"
          >
            <option value="none">None (silent)</option>
            <option value="minimal">Minimal</option>
            <option value="verbose">Verbose</option>
          </select>
        </div>
        <div className="help-text">
          Logs are saved to: ~/.local/state/vibelog/logs/
        </div>
      </div>
    </div>
  );
}