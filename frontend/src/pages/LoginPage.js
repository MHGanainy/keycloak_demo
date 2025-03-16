import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import KeycloakService from '../services/KeycloakService';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Check for authentication in URL hash
  const hasAuthParams = location.hash && location.hash.includes('state=') && location.hash.includes('code=');
  
  useEffect(() => {
    // Check if we're coming back from Keycloak with authentication parameters
    if (hasAuthParams) {
      console.log('Detected authentication parameters in URL');
      setIsLoading(true);
      
      // Short delay to ensure Keycloak initialization has completed
      setTimeout(() => {
        if (KeycloakService.isLoggedIn()) {
          console.log('Successfully authenticated, redirecting to dashboard');
          navigate('/dashboard');
        } else {
          console.log('Authentication parameters present but not logged in');
          setIsLoading(false);
          setError('Authentication failed. Please try again.');
        }
      }, 500);
    } 
    // Regular login page check without auth params
    else if (KeycloakService.isLoggedIn()) {
      console.log('Already logged in, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [navigate, location, hasAuthParams]);
  
  const handleLogin = () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Starting login process...");
      
      // Make sure Keycloak is initialized before attempting login
      if (!KeycloakService.isInitialized()) {
        console.log("Keycloak not initialized, initializing first...");
        
        // Initialize first then login
        KeycloakService.init({
          checkLoginIframe: false,
          pkceMethod: 'S256'
        })
          .then(() => {
            console.log("Initialization complete, proceeding to login");
            return KeycloakService.login({
              redirectUri: window.location.origin + '/dashboard',
              pkceMethod: 'S256',
              prompt: 'login'
            });
          })
          .catch(err => {
            console.error("Login sequence error:", err);
            setError("Failed to initialize Keycloak. Please refresh the page and try again.");
            setIsLoading(false);
          });
      } else {
        // Keycloak is already initialized, just login
        console.log("Keycloak already initialized, proceeding directly to login");
        KeycloakService.login({
          redirectUri: window.location.origin + '/dashboard',
          pkceMethod: 'S256',
          prompt: 'login'
        }).catch(err => {
          console.error("Login error:", err);
          setError("Failed to start login process. Please try again.");
          setIsLoading(false);
        });
      }
      
      // If we get here, redirect hasn't happened yet
      // Set a timeout to reset the loading state if redirect doesn't occur
      setTimeout(() => {
        setIsLoading(false);
        setError("Login timed out. Please try again or check your network connection.");
      }, 5000);
      
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };
  
  // Show loading state when processing authentication from URL
  if (isLoading && hasAuthParams) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2">Processing authentication...</span>
      </div>
    );
  }
  
  return (
    <Container>
      <Row className="justify-content-center mt-5">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body className="p-5">
              <h2 className="text-center mb-4">Document Management System</h2>
              
              <p className="text-center text-muted mb-4">
                Please login to access the document management system. This demo showcases Keycloak integration
                for secure authentication and authorization.
              </p>
              
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              
              <div className="d-grid gap-2">
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleLogin} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Connecting...' : 'Login with Keycloak'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;