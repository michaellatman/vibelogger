// This script runs in the page context (MAIN world)
(function() {
  // Skip if already injected
  if (window.__vibeLoggerInjected) return;
  window.__vibeLoggerInjected = true;
  
  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
  
  // Override console methods
  Object.keys(originalConsole).forEach(method => {
    console[method] = function(...args) {
      // Call original method first
      originalConsole[method].apply(console, args);
      
      // Skip VibeLogger's own logs
      const isVibeLoggerLog = args.some(arg => {
        const str = String(arg);
        return str.includes('[VibeLogger]') || str.includes('vibelogger');
      });
      
      if (isVibeLoggerLog) {
        return;
      }
      
      // Send to content script via custom event
      window.postMessage({
        source: 'vibelogger-page',
        type: 'console',
        method: method,
        args: args.map(arg => {
          try {
            // Try to serialize objects
            if (typeof arg === 'object' && arg !== null) {
              return JSON.stringify(arg);
            }
            return String(arg);
          } catch (e) {
            // Fallback for circular references or other issues
            return String(arg);
          }
        }),
        timestamp: Date.now(),
        url: window.location.href
      }, '*');
    };
  });
  
  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    window.postMessage({
      source: 'vibelogger-page',
      type: 'error',
      method: 'error',
      args: [event.message, event.filename, event.lineno, event.colno],
      timestamp: Date.now(),
      url: window.location.href
    }, '*');
  });
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    window.postMessage({
      source: 'vibelogger-page',
      type: 'error',
      method: 'error',
      args: ['Unhandled promise rejection: ' + event.reason],
      timestamp: Date.now(),
      url: window.location.href
    }, '*');
  });
  
})();