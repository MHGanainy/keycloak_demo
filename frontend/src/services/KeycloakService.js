import Keycloak from 'keycloak-js';

// Keycloak instance configuration
const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'document-demo',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'frontend-app'
};

console.log('Keycloak config:', keycloakConfig);

// Create a singleton pattern for Keycloak
let keycloakInstance = null;
let isInitialized = false;
let initializationPromise = null;
let tokenUpdateCallback = null;

// AGGRESSIVE FIX: IMMEDIATELY REMOVE ERROR PARAMETERS
// This runs immediately when the file is loaded to catch errors as early as possible
(function immediateCleanup() {
  const url = new URL(window.location.href);
  let needsCleanup = false;
  
  // Check if URL has error parameters in hash or search
  if (url.hash && (url.hash.includes('error=') || url.hash.includes('code_challenge_method'))) {
    console.log('EMERGENCY CLEANUP: Error detected in hash, clearing...');
    url.hash = '';
    needsCleanup = true;
  }
  
  if (url.search && (url.search.includes('error=') || url.search.includes('code_challenge_method'))) {
    console.log('EMERGENCY CLEANUP: Error detected in search, clearing...');
    url.search = '';
    needsCleanup = true;
  }
  
  // Clear Keycloak storage on load - critical for resolving nonce issues
  try {
    console.log('EMERGENCY CLEANUP: Clearing all Keycloak localStorage items');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('kc-') || key.includes('keycloak') || key.includes('token') || key.includes('nonce')) {
        console.log('Removing localStorage item:', key);
        localStorage.removeItem(key);
      }
    });
    
    // Clear session storage too
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('kc-') || key.includes('keycloak') || key.includes('token') || key.includes('nonce')) {
        console.log('Removing sessionStorage item:', key);
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Error clearing storage:', e);
  }
  
  if (needsCleanup) {
    console.log('EMERGENCY CLEANUP: Replacing URL with cleaned version');
    window.history.replaceState({}, document.title, url.toString());
  }
})();

// Detect if we're in a silent check SSO iframe
const isInSilentCheckIframe = () => {
  return window.location.pathname.includes('silent-check-sso');
};

// Clear ALL hash and query parameters from URL to prevent initialization loops
const clearUrlParameters = () => {
  // Only clear if we have hash or search parameters
  if (window.location.hash || window.location.search) {
    const url = new URL(window.location.href);
    // Remove hash completely
    url.hash = '';
    // Remove all search parameters
    url.search = '';
    window.history.replaceState({}, document.title, url.toString());
    console.log('Cleared all URL parameters');
    return true;
  }
  return false;
};

// Check if the URL has error parameters
const hasErrorParameters = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  return urlParams.has('error') || hashParams.has('error');
};

// Log all redirect parameters for debugging
const logRedirectParams = () => {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  console.log('DEBUG - Current URL:', window.location.href);
  console.log('DEBUG - URL Parameters:', Object.fromEntries(urlParams.entries()));
  console.log('DEBUG - Hash Parameters:', Object.fromEntries(hashParams.entries()));
  
  // Check for common Keycloak error parameters
  const errorParams = ['error', 'error_description', 'state', 'session_state', 'iss', 'code'];
  for (const param of errorParams) {
    if (urlParams.has(param)) {
      console.log(`DEBUG - Found URL param ${param}:`, urlParams.get(param));
    }
    if (hashParams.has(param)) {
      console.log(`DEBUG - Found hash param ${param}:`, hashParams.get(param));
    }
  }
};

// Get or create the Keycloak instance
const getKeycloakInstance = () => {
  if (!keycloakInstance) {
    console.log('Creating new Keycloak instance');
    try {
      keycloakInstance = new Keycloak(keycloakConfig);
      
      // Set up the token expiry handler
      keycloakInstance.onTokenExpired = () => {
        console.log('Token expired, attempting to refresh');
        keycloakInstance.updateToken(30)
          .then((refreshed) => {
            if (refreshed) {
              console.log('Token refreshed successfully');
              if (tokenUpdateCallback) {
                tokenUpdateCallback();
              }
            } else {
              console.log('Token not refreshed, valid for ' + 
                Math.round(keycloakInstance.tokenParsed.exp + keycloakInstance.timeSkew - new Date().getTime() / 1000) + ' seconds');
            }
          })
          .catch((error) => {
            console.error('Failed to refresh token:', error);
          });
      };
      
      // Add debug event listeners
      keycloakInstance.onAuthSuccess = () => console.log('DEBUG - Auth success event');
      keycloakInstance.onAuthError = (error) => {
        console.error('DEBUG - Auth error event:', error);
        // Try to extract more information about the error
        if (error) {
          if (typeof error === 'string') {
            console.error('Auth error details:', error);
          } else {
            try {
              console.error('Auth error details:', JSON.stringify(error));
            } catch (e) {
              console.error('Auth error details: Unable to stringify error object');
            }
          }
        } else {
          console.error('Auth error without details (undefined)');
        }
      };
      keycloakInstance.onAuthRefreshSuccess = () => console.log('DEBUG - Auth refresh success event');
      keycloakInstance.onAuthRefreshError = () => console.error('DEBUG - Auth refresh error event');
      keycloakInstance.onAuthLogout = () => console.log('DEBUG - Auth logout event');
      
    } catch (error) {
      console.error('Error creating Keycloak instance:', error);
      throw error;
    }
  }
  return keycloakInstance;
};

// Init method with optional callbacks
const initKeycloak = (onAuthenticatedCallback, onTokenUpdateCallback, options = {}) => {
  // Skip initialization in silent check SSO iframe
  if (isInSilentCheckIframe()) {
    console.log('In silent check SSO iframe - skipping initialization');
    return Promise.resolve(false);
  }
  
  // First, log current parameters before any changes
  logRedirectParams();
  
  // If we have error parameters, clear them before initializing
  const paramsCleared = clearUrlParameters();
  
  // If we cleared parameters, we should reload the page to get a clean state
  if (paramsCleared && hasErrorParameters()) {
    console.log('Error parameters detected and cleared. Reloading page for clean state.');
    window.location.reload();
    return Promise.resolve(false);
  }
  
  // Set the token update callback if provided
  if (onTokenUpdateCallback) {
    tokenUpdateCallback = onTokenUpdateCallback;
  }
  
  // If already initialized, resolve immediately
  if (isInitialized) {
    console.log('Keycloak already initialized');
    const keycloak = getKeycloakInstance();
    if (keycloak.authenticated && onAuthenticatedCallback) {
      onAuthenticatedCallback();
    }
    return Promise.resolve(keycloak.authenticated);
  }
  
  // If initialization is in progress, return the existing promise
  if (initializationPromise) {
    console.log('Keycloak initialization already in progress');
    return initializationPromise;
  }
  
  console.log('Starting Keycloak initialization');
  
  try {
    // Clear any existing Keycloak instances and local storage to ensure clean state
    keycloakInstance = null;
    try {
      console.log('Clearing Keycloak storage before initialization');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('kc-') || key.includes('keycloak') || key.includes('token') || key.includes('nonce')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('kc-') || key.includes('keycloak') || key.includes('token') || key.includes('nonce')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Error clearing storage:', e);
    }
    
    const keycloak = getKeycloakInstance();
    
    // Default initialization options - PKCE enabled with force login mode
    const defaultOptions = {
      onLoad: options.forceLogin ? 'login-required' : 'check-sso',
      checkLoginIframe: false,      // Disable iframe check
      enableLogging: true,
      pkceMethod: 'S256',           // Enable PKCE with S256 method
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      flow: 'standard',             // Standard flow
      promiseType: 'native'         // Use native promises
    };
    
    // Merge with user provided options
    const initOptions = { ...defaultOptions, ...options };
    console.log('Initializing Keycloak with options:', initOptions);
    
    // Create a new initialization promise with timeout
    const timeoutPromise = new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Keycloak initialization timed out after 10 seconds'));
      }, 10000); // 10 second timeout
      
      // Store the timeout ID so we can clear it if initialization succeeds
      window._keycloakTimeoutId = timeoutId;
    });
    
    // The actual initialization promise
    const keycloakPromise = keycloak.init(initOptions)
      .then((authenticated) => {
        console.log('Keycloak initialization successful, authenticated:', authenticated);
        isInitialized = true;
        
        // Clear the timeout
        if (window._keycloakTimeoutId) {
          clearTimeout(window._keycloakTimeoutId);
          delete window._keycloakTimeoutId;
        }
        
        if (authenticated && onAuthenticatedCallback) {
          onAuthenticatedCallback();
        }
        
        return authenticated;
      })
      .catch((error) => {
        console.error('Keycloak initialization error:', error);
        
        // Clear the timeout
        if (window._keycloakTimeoutId) {
          clearTimeout(window._keycloakTimeoutId);
          delete window._keycloakTimeoutId;
        }
        
        // Reset the initialization promise so we can try again
        initializationPromise = null;
        
        // For nonce errors, attempt to recover by forcing a full login
        const errorStr = error?.toString() || '';
        if (errorStr.includes('nonce') || errorStr.includes('token')) {
          console.log('Detected nonce/token error, clearing storage and redirecting to login page');
          
          // Clear all storage
          try {
            Object.keys(localStorage).forEach(key => localStorage.removeItem(key));
            Object.keys(sessionStorage).forEach(key => sessionStorage.removeItem(key));
          } catch (e) {
            console.warn('Error clearing all storage:', e);
          }
          
          // Force login redirect
          window.location.href = '/login';
          return false;
        }
        
        // Throw a properly formatted error message
        let errorMessage = 'Unknown error';
        if (error) {
          if (typeof error === 'string') {
            errorMessage = error;
          } else if (error.error && error.error_description) {
            errorMessage = `${error.error}: ${error.error_description}`;
          } else if (error.message) {
            errorMessage = error.message;
          }
        }
        
        throw new Error('Keycloak initialization failed: ' + errorMessage);
      });
    
    // Race the keycloak promise against the timeout
    initializationPromise = Promise.race([keycloakPromise, timeoutPromise]);
    
    return initializationPromise;
    
  } catch (error) {
    console.error('Exception during Keycloak setup:', error);
    initializationPromise = null;
    return Promise.reject(new Error('Exception during Keycloak setup: ' + (error ? (error.message || 'Unknown error') : 'Unknown error')));
  }
};

// Login function with PKCE enabled
const doLogin = (options = {}) => {
  try {
    console.log('Attempting login with options:', options);
    
    // Clear storage first to ensure a clean login
    try {
      console.log('Clearing storage before login');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('kc-') || key.includes('keycloak') || key.includes('token') || key.includes('nonce')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('kc-') || key.includes('keycloak') || key.includes('token') || key.includes('nonce')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Error clearing storage before login:', e);
    }
    
    // Use options with PKCE
    const loginOptions = {
      ...options,
      // Enable PKCE
      pkceMethod: 'S256',
      // Add prompt=login to force fresh authentication
      prompt: 'login'
    };
    
    // Always specify the redirect URI if not provided
    if (!loginOptions.redirectUri) {
      loginOptions.redirectUri = window.location.origin + '/dashboard';
    }
    
    console.log('Modified login options:', loginOptions);
    
    // Recreate Keycloak instance to ensure clean state
    keycloakInstance = null;
    return getKeycloakInstance().login(loginOptions);
  } catch (error) {
    console.error('Error during login attempt:', error);
    throw error;
  }
};

// Simplified logout method with additional logging
const doLogout = (options = {}) => {
  try {
    console.log('Attempting logout with options:', options);
    return getKeycloakInstance().logout(options);
  } catch (error) {
    console.error('Error during logout attempt:', error);
    throw error;
  }
};

// Helper functions for Keycloak instance
const KeycloakService = {
  initKeycloak,
  
  // Get the Keycloak instance
  get keycloak() {
    return getKeycloakInstance();
  },
  
  // Login function with enhanced logging
  doLogin,
  
  // Logout function with enhanced logging
  doLogout,
  
  // Check if user is authenticated
  isLoggedIn: () => {
    try {
      const keycloak = getKeycloakInstance();
      return !!keycloak.authenticated;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  },
  
  // Get username or ID
  getUsername: () => {
    try {
      const keycloak = getKeycloakInstance();
      return keycloak.tokenParsed?.preferred_username;
    } catch (error) {
      console.error('Error getting username:', error);
      return null;
    }
  },
  
  // Get user's full name
  getFullName: () => {
    try {
      const keycloak = getKeycloakInstance();
      const firstName = keycloak.tokenParsed?.given_name || '';
      const lastName = keycloak.tokenParsed?.family_name || '';
      return `${firstName} ${lastName}`.trim() || 'User';
    } catch (error) {
      console.error('Error getting full name:', error);
      return 'User';
    }
  },
  
  // Get user roles
  getUserRoles: () => {
    try {
      const keycloak = getKeycloakInstance();
      if (keycloak.resourceAccess) {
        return keycloak.resourceAccess[keycloakConfig.clientId]?.roles || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  },
  
  // Check if user has a specific role
  hasRole: (role) => {
    try {
      return KeycloakService.getUserRoles().includes(role);
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  },
  
  // Get auth token for API calls
  getToken: () => {
    try {
      return getKeycloakInstance().token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },
  
  // Update token explicitly
  updateToken: (minValidity = 5) => {
    try {
      return getKeycloakInstance().updateToken(minValidity);
    } catch (error) {
      console.error('Error updating token:', error);
      return Promise.reject(error);
    }
  },
  
  // Check token validity
  isTokenExpired: () => {
    try {
      return getKeycloakInstance().isTokenExpired();
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  },
  
  // Check if Keycloak is initialized
  isInitialized: () => isInitialized,
  
  // Get the configuration being used
  getConfig: () => ({ ...keycloakConfig }),
  
  // Clear URL parameters (expose the function for use elsewhere)
  clearUrlParameters,
  
  // Check if in silent check SSO page
  isInSilentCheckIframe
};

export default KeycloakService;