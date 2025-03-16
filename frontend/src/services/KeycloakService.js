import Keycloak from 'keycloak-js';

// Keycloak configuration
const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'document-demo',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'frontend-app'
};

// Singleton instance
let keycloakInstance = null;
let isInitialized = false;

// Initialize Keycloak without login
const init = (options = {}) => {
  // Create a new Keycloak instance if it doesn't exist
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);
    
    // Set up event handlers
    keycloakInstance.onAuthSuccess = () => {
      console.log('Auth success');
      isInitialized = true;
      
      // Check if we're at the root path with auth parameters and redirect to dashboard
      if (window.location.pathname === '/' && window.location.hash && 
          window.location.hash.includes('state=') && window.location.hash.includes('code=')) {
        console.log('Redirecting from root to dashboard after successful authentication');
        window.location.href = '/dashboard';
      }
    };
    
    keycloakInstance.onAuthError = (error) => {
      console.error('Auth error:', error);
      isInitialized = true;
    };
    
    keycloakInstance.onTokenExpired = () => {
      console.log('Token expired, refreshing...');
      keycloakInstance.updateToken(30).catch(() => {
        console.warn('Failed to refresh token, user will need to login again');
      });
    };
  }
  
  // Check if we're returning from a Keycloak login (has hash with state and code parameters)
  const url = window.location.href;
  const hasAuthParams = url.includes('state=') && url.includes('code=');
  
  console.log('Initializing Keycloak, URL has auth params:', hasAuthParams);
  
  // Initialize options - IMPORTANT: Use 'check-sso' instead of 'login-required' 
  // to prevent automatic login when we already have auth params
  const initOptions = {
    onLoad: 'check-sso', // Changed to always use check-sso
    pkceMethod: 'S256',
    checkLoginIframe: false,
    ...options
  };
  
  console.log('Initializing Keycloak with options:', { ...initOptions, onLoad: initOptions.onLoad });
  
  // Initialize Keycloak
  return keycloakInstance.init(initOptions)
    .then(authenticated => {
      isInitialized = true;
      console.log('Keycloak initialized, authenticated:', authenticated);
      
      // If we're authenticated and at the root path, redirect to dashboard
      if (authenticated && window.location.pathname === '/') {
        console.log('Authentication successful, at root path - redirecting to dashboard');
        window.location.href = '/dashboard';
      }
      
      return authenticated;
    })
    .catch(error => {
      console.error('Initialization failed:', error);
      // Still mark as initialized to prevent loading state issues
      isInitialized = true;
      throw error;
    });
};

// Separate login function
const login = (options = {}) => {
  if (!keycloakInstance || !isInitialized) {
    return Promise.reject(new Error('Keycloak not initialized. Call init() first.'));
  }
  
  // If we're already authenticated, just redirect to dashboard
  if (keycloakInstance.authenticated) {
    console.log('Already authenticated, redirecting to dashboard');
    window.location.href = '/dashboard';
    return Promise.resolve();
  }
  
  // Login options - ALWAYS redirect to dashboard
  const loginOptions = {
    redirectUri: window.location.origin + '/dashboard',
    ...options
  };
  
  console.log('Starting login with options:', loginOptions);
  
  // Perform login
  return keycloakInstance.login(loginOptions);
};

// Simple logout
const logout = (options = {}) => {
  if (!keycloakInstance) return Promise.resolve();
  
  return keycloakInstance.logout({
    redirectUri: window.location.origin,
    ...options
  }).catch(error => {
    console.error('Logout error:', error);
    window.location.href = '/';
  });
};

// The updated service
const KeycloakService = {
  // Core methods
  init,
  login,
  logout,
  
  // Helpers
  get keycloak() { return keycloakInstance; },
  isLoggedIn: () => !!(keycloakInstance && keycloakInstance.authenticated),
  getUsername: () => keycloakInstance?.tokenParsed?.preferred_username,
  getFullName: () => {
    if (!keycloakInstance?.tokenParsed) return 'User';
    const firstName = keycloakInstance.tokenParsed.given_name || '';
    const lastName = keycloakInstance.tokenParsed.family_name || '';
    return `${firstName} ${lastName}`.trim() || 'User';
  },
  
  // Role management
  getUserRoles: () => {
    if (!keycloakInstance?.resourceAccess) return [];
    return keycloakInstance.resourceAccess[keycloakConfig.clientId]?.roles || [];
  },
  hasRole: (role) => KeycloakService.getUserRoles().includes(role),
  
  // Token management
  getToken: () => keycloakInstance?.token,
  updateToken: (minValidity = 5) => keycloakInstance ? keycloakInstance.updateToken(minValidity) : Promise.reject(),
  isTokenExpired: () => !keycloakInstance || keycloakInstance.isTokenExpired(),
  
  // Utilities
  isInitialized: () => isInitialized,
  getConfig: () => ({ ...keycloakConfig }),
};

export default KeycloakService;