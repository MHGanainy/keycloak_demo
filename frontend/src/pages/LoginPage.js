import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import KeycloakService from '../services/KeycloakService';

const LoginPage = () => {
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState(null);
  
  useEffect(() => {
    // Clear any URL parameters first
    KeycloakService.clearUrlParameters();
    
    // If already logged in, redirect to dashboard
    if (KeycloakService.isLoggedIn()) {
      navigate('/dashboard');
    }
  }, [navigate]);
  
  const handleLogin = () => {
    try {
      console.log('Starting login process...');
      
      // Use simple login options without PKCE
      KeycloakService.doLogin({
        redirectUri: window.location.origin + '/dashboard'
      });
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Failed to initiate login. Please try again.");
    }
  };
  
  // Get configuration for debugging purposes
  const keycloakConfig = KeycloakService.getConfig ? KeycloakService.getConfig() : null;
  
  return (
    <Container>
      <Row className="justify-content-center mt-5">
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body className="p-5">
              <h2 className="text-center mb-4">Document Management System</h2>
              
              {loginError && (
                <Alert variant="danger" className="mb-4">
                  {loginError}
                </Alert>
              )}
              
              <p className="text-center text-muted mb-4">
                Please login to access the document management system. This demo showcases Keycloak integration
                for secure authentication and authorization.
              </p>
              
              <div className="d-grid gap-2">
                <Button variant="primary" size="lg" onClick={handleLogin}>
                  Login with Keycloak
                </Button>
              </div>
              
              {/* Debug Information (Only in development) */}
              {process.env.NODE_ENV === 'development' && keycloakConfig && (
                <div className="mt-4">
                  <details className="debug-info">
                    <summary className="text-muted">Debug Information</summary>
                    <div className="mt-2 bg-light p-3 rounded">
                      <h6>Keycloak Configuration:</h6>
                      <pre style={{ fontSize: '0.8rem' }}>
                        {JSON.stringify(keycloakConfig, null, 2)}
                      </pre>
                      <h6 className="mt-3">Browser Information:</h6>
                      <pre style={{ fontSize: '0.8rem' }}>
                        URL: {window.location.href}<br/>
                        Redirect URI: {window.location.origin + '/dashboard'}
                      </pre>
                      <h6 className="mt-3">Note about PKCE:</h6>
                      <div className="text-danger">
                        PKCE has been disabled due to Keycloak configuration issues.
                        For production, please configure your Keycloak client properly for PKCE.
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;