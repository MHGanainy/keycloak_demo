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

function App() {
  // Define all hooks at the top level - no conditionals before hooks
  const [keycloakInitialized, setKeycloakInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const initializationAttempted = useRef(false);
  
  // Check for authentication parameters in URL hash
  const hasAuthParams = window.location.hash && 
                       window.location.hash.includes('state=') && 
                       window.location.hash.includes('code=');
  
  // Handle Keycloak initialization including when returning from authentication
  useEffect(() => {    
    const setupKeycloak = async () => {
      // Prevent multiple initialization attempts
      if (initializationAttempted.current) {
        console.log('Initialization already attempted, skipping');
        return;
      }
      
      initializationAttempted.current = true;
      console.log('Starting Keycloak setup...', { hasAuthParams, pathname: window.location.pathname });
      
      try {
        // Initialize Keycloak with proper options
        const authenticated = await KeycloakService.init({
          checkLoginIframe: false,
          pkceMethod: 'S256'
        });
        
        console.log('Keycloak setup completed successfully, authenticated:', authenticated);
        setIsAuthenticated(authenticated);
        setKeycloakInitialized(true);
      } catch (error) {
        console.error("Failed to initialize Keycloak:", error);
        // Still set initialized to true to avoid getting stuck in loading state
        setKeycloakInitialized(true);
      }
    };
    
    setupKeycloak();
  }, [hasAuthParams]);
  
  // Protected route component
  const PrivateRoute = ({ children }) => {
    if (!KeycloakService.isLoggedIn()) {
      return <Navigate to="/login" />;
    }
    return children;
  };

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
  
  // If at root path with auth params and authenticated, redirect to dashboard directly
  if (window.location.pathname === '/' && hasAuthParams && isAuthenticated) {
    console.log('At root with auth params and authenticated, redirecting to dashboard');
    window.location.href = '/dashboard';
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2">Redirecting to dashboard...</span>
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