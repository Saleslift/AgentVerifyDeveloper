/**
 * Utility to handle page visibility changes and prevent unnecessary reloads
 * when switching browser tabs.
 */

// Store the original title to restore it when needed
let originalTitle: string | null = null;

// Track if we've initialized the handlers
let isInitialized = false;

// Store original visibility state handlers
let originalVisibilityHandler: ((this: Document, ev: Event) => any) | null = null;

/**
 * Initialize page visibility handling to prevent reloads on tab switch
 */
export function initPageVisibilityHandling(): void {
  // Prevent multiple initializations
  if (isInitialized) return;
  isInitialized = true;

  // Save original document title
  originalTitle = document.title;

  // Store original visibility handler if it exists
  if (document.onvisibilitychange) {
    originalVisibilityHandler = document.onvisibilitychange;
  }

  // Set our custom visibility change handler
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Prevent the browser from showing the "Confirm Form Resubmission" dialog
  if (window.history.scrollRestoration) {
    window.history.scrollRestoration = 'auto';
  }

  // Prevent beforeunload events when switching tabs
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    // Only prevent unload if it's not an intentional navigation
    const isIntentionalNavigation = sessionStorage.getItem('intentional_navigation') === 'true';
    if (!isIntentionalNavigation && document.visibilityState === 'hidden') {
      // Standard way to prevent unload
      e.preventDefault();
      // For older browsers
      e.returnValue = '';
      return '';
    }
    // Clear the flag
    sessionStorage.removeItem('intentional_navigation');
  };
  
  window.addEventListener('beforeunload', beforeUnloadHandler);

  // Intercept link clicks to set intentional navigation flag
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    if (link && link.href && !link.target && !e.ctrlKey && !e.metaKey) {
      sessionStorage.setItem('intentional_navigation', 'true');
    }
  });

  // Handle form submissions
  document.addEventListener('submit', () => {
    sessionStorage.setItem('intentional_navigation', 'true');
  });

  // Prevent the browser from reloading the page when coming back to the tab
  window.addEventListener('pageshow', (e) => {
    // If the page is loaded from cache (bfcache)
    if (e.persisted) {
      // Restore the original title
      if (originalTitle) {
        document.title = originalTitle;
      }
      
      // Suppress any redirects
      sessionStorage.setItem('suppress_redirect', 'true');
      
      // Clear the suppression after a short delay
      setTimeout(() => {
        sessionStorage.removeItem('suppress_redirect');
      }, 1000);
    }
  });

  // Disable automatic auth state checks on focus
  const originalFocus = window.onfocus;
  
  window.onfocus = function(e) {
    // Prevent default focus behavior that might trigger auth checks
    if (e) e.stopPropagation();
    
    // Suppress redirects
    sessionStorage.setItem('suppress_redirect', 'true');
    
    // Clear the suppression after a short delay
    setTimeout(() => {
      sessionStorage.removeItem('suppress_redirect');
    }, 1000);
    
    // Still call original handler if it exists and is a function
    if (typeof originalFocus === 'function') {
      originalFocus.call(window, e);
    }
    
    // Restore title if needed
    if (originalTitle) {
      document.title = originalTitle;
    }
  };
}

/**
 * Handle visibility change events
 */
function handleVisibilityChange(event: Event): void {
  // Don't run the default visibility change handler for non-intentional tab switches
  const isIntentionalNavigation = sessionStorage.getItem('intentional_navigation') === 'true';
  
  if (!isIntentionalNavigation) {
    // Prevent default behavior
    event.stopPropagation();
    
    // Store the current state when tab becomes hidden
    if (document.visibilityState === 'hidden') {
      sessionStorage.setItem('tab_hidden_at', Date.now().toString());
    } else if (document.visibilityState === 'visible') {
      // When tab becomes visible again
      const hiddenAt = sessionStorage.getItem('tab_hidden_at');
      if (hiddenAt) {
        const hiddenTime = Date.now() - parseInt(hiddenAt, 10);
        
        // If the tab was hidden for less than 30 minutes, prevent reload
        if (hiddenTime < 30 * 60 * 1000) {
          // Restore the original title if it was changed
          if (originalTitle) {
            document.title = originalTitle;
          }
          
          // Clear any reload timers or flags
          sessionStorage.removeItem('tab_hidden_at');
          
          // Suppress any auth checks or redirects
          sessionStorage.setItem('suppress_redirect', 'true');
          
          // Clear the suppression after a short delay
          setTimeout(() => {
            sessionStorage.removeItem('suppress_redirect');
          }, 1000);
        }
      }
    }
  } else {
    // Clear the flag after handling the event
    sessionStorage.removeItem('intentional_navigation');
    
    // Call the original handler if it exists
    if (originalVisibilityHandler) {
      originalVisibilityHandler.call(document, event);
    }
  }
}

/**
 * Clean up event listeners
 */
export function cleanupPageVisibilityHandling(): void {
  if (!isInitialized) return;
  
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  
  isInitialized = false;
}