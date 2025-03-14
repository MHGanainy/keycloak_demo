import React from 'react';
import { Container, Row, Col, Card, Badge, ListGroup } from 'react-bootstrap';
import KeycloakService from '../services/KeycloakService';

const Profile = () => {
  const keycloak = KeycloakService.keycloak;
  const tokenData = keycloak.tokenParsed || {};
  
  // Extract user information
  const username = tokenData.preferred_username || 'User';
  const firstName = tokenData.given_name || '';
  const lastName = tokenData.family_name || '';
  const email = tokenData.email || 'Not provided';
  const roles = KeycloakService.getUserRoles();
  
  // Function to get initials for avatar
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    } else if (username) {
      return username.charAt(0).toUpperCase();
    }
    return 'U';
  };
  
  // Function to get role badge variant
  const getRoleBadgeVariant = (role) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'danger';
      case 'editor':
        return 'warning';
      case 'user':
        return 'info';
      default:
        return 'secondary';
    }
  };
  
  return (
    <Container>
      <h1 className="mb-4">User Profile</h1>
      
      <Row>
        <Col md={4} className="mb-4">
          <Card className="profile-container h-100">
            <Card.Body className="text-center">
              <div className="profile-avatar">
                {getInitials()}
              </div>
              
              <h3 className="mt-3">{firstName} {lastName}</h3>
              <p className="text-muted">@{username}</p>
              
              <div className="mt-3">
                {roles.map((role) => (
                  <Badge 
                    key={role} 
                    bg={getRoleBadgeVariant(role)} 
                    className="role-badge me-1"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Account Information</h5>
            </Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                <div className="fw-bold text-muted small">Username</div>
                <div>{username}</div>
              </ListGroup.Item>
              
              <ListGroup.Item>
                <div className="fw-bold text-muted small">Email</div>
                <div>{email}</div>
              </ListGroup.Item>
              
              <ListGroup.Item>
                <div className="fw-bold text-muted small">Full Name</div>
                <div>{firstName} {lastName}</div>
              </ListGroup.Item>
              
              {tokenData.realm_access && (
                <ListGroup.Item>
                  <div className="fw-bold text-muted small">Realm Roles</div>
                  <div>
                    {tokenData.realm_access.roles.map((role) => (
                      <Badge 
                        key={role} 
                        bg="secondary" 
                        className="me-1"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </ListGroup.Item>
              )}
              
              <ListGroup.Item>
                <div className="fw-bold text-muted small">Token Expiration</div>
                <div>
                  {new Date(tokenData.exp * 1000).toLocaleString()}
                </div>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;