import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// Import components
import NavBar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DocumentList from './pages/DocumentList';
import UploadDocument from './pages/UploadDocument';
import Profile from './pages/Profile';

// Import services
import KeycloakService from './services/KeycloakService';

// IMMEDIATELY CHECK FOR ERROR IN URL
// This runs immediately when the module is loaded
if (window.location.href.includes('error=') || 
    window.location.href.includes('code_challenge_method')) {
  console.log('APP.JS - EMERGENCY: Error parameters detected in URL. Cleaning up...');
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  window.history.replaceState({}, document.title, url.toString());
}

function App() {
  // Define all hooks at the top level - no conditionals before hooks
  const [keycloakInitialized, setKeycloakInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  const initializationAttempted = useRef(false);
  const isInSilentCheckIframe = KeycloakService.isInSilentCheckIframe();
  
  // Special handling for error parameters in URL - ALWAYS define hooks at top level
  useEffect(() => {
    // Skip if in iframe
    if (isInSilentCheckIframe) return;
    
    // Check if we have error parameters in the URL and clear them
    if (window.location.hash.includes('error=') || 
        window.location.search.includes('error=') ||
        window.location.href.includes('code_challenge_method')) {
      console.log('Error parameters detected in URL. Clearing...');
      KeycloakService.clearUrlParameters();
      window.location.href = '/login'; // Go to login page instead of reloading
      return; // Don't continue with initialization
    }
    
    // If we already have a hash in the URL, clear it to avoid potential issues
    if (window.location.hash) {
      console.log('Hash detected in URL. Clearing for clean initialization.');
      KeycloakService.clearUrlParameters();
    }
  }, [isInSilentCheckIframe]);
  
  // Main initialization effect - ALWAYS define hooks at top level
  useEffect(() => {
    // Skip if in iframe
    if (isInSilentCheckIframe) return;
    
    // Don't initialize if we have a hash or search params - this helps avoid loops
    if (window.location.hash || window.location.search) {
      console.log('Skipping Keycloak initialization because URL has parameters');
      return;
    }
    
    const setupKeycloak = async () => {
      // Only attempt initialization once
      if (initializationAttempted.current) return;
      initializationAttempted.current = true;
      
      try {
        console.log('Starting Keycloak setup...');
        
        // Use a simpler initialization approach
        await KeycloakService.initKeycloak(() => {
          console.log("Authentication callback triggered");
        });
        
        console.log('Keycloak setup completed successfully');
        setKeycloakInitialized(true);
      } catch (error) {
        console.error("Failed to initialize Keycloak:", error);
        
        // Special handling for PKCE errors - directly go to login
        if (error.message && error.message.includes('code_challenge_method')) {
          console.log('PKCE error detected - redirecting to login page');
          KeycloakService.clearUrlParameters();
          window.location.href = '/login';
          return;
        }
        
        setInitializationError(error?.message || "Failed to initialize authentication");
      }
    };
    
    setupKeycloak();
  }, [isInSilentCheckIframe]); 
  
  // Protected route component
  const PrivateRoute = ({ children }) => {
    if (!KeycloakService.isLoggedIn()) {
      return <Navigate to="/login" />;
    }
    return children;
  };
  
  // Admin route component
  const AdminRoute = ({ children }) => {
    if (!KeycloakService.isLoggedIn() || !KeycloakService.hasRole('admin')) {
      return <Navigate to="/dashboard" />;
    }
    return children;
  };
  
  // Conditional rendering based on component state (not conditional hooks)
  if (isInSilentCheckIframe) {
    return (
      <div className="text-center">
        <p>Processing authentication...</p>
      </div>
    );
  }
  
  // Display initialization error if one occurred
  if (initializationError) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Authentication Error</h4>
          <p>{initializationError}</p>
          <hr />
          <p className="mb-0">
            Please try again or contact support if the issue persists.
          </p>
          <div className="mt-3 d-flex gap-2">
            <button 
              className="btn btn-primary" 
              onClick={() => {
                // Clear all URL parameters and go to login
                KeycloakService.clearUrlParameters();
                window.location.href = '/login';
              }}
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Display loading spinner while initializing
  if (!keycloakInitialized) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2">Initializing application...</span>
      </div>
    );
  }
  
  // Main application UI
  return (
    <Router>
      <div className="App">
        <NavBar />
        <div className="container mt-4">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            <Route path="/documents" element={
              <PrivateRoute>
                <DocumentList />
              </PrivateRoute>
            } />
            
            <Route path="/upload" element={
              <PrivateRoute>
                <UploadDocument />
              </PrivateRoute>
            } />
            
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;