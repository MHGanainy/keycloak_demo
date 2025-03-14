import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import ApiService from '../services/ApiService';
import KeycloakService from '../services/KeycloakService';

const Dashboard = () => {
  const [documentCount, setDocumentCount] = useState(0);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fullName = KeycloakService.getFullName();
  const roles = KeycloakService.getUserRoles();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getDocuments();
        
        // Set document count
        setDocumentCount(response.data.length);
        
        // Get 3 most recent documents
        const sorted = [...response.data].sort((a, b) => 
          new Date(b.uploadedAt) - new Date(a.uploadedAt)
        );
        setRecentDocuments(sorted.slice(0, 3));
        
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch documents');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, []);
  
  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1>Welcome, {fullName || 'User'}</h1>
          <p className="text-muted">
            Role{roles.length !== 1 ? 's' : ''}: {roles.join(', ')}
          </p>
        </Col>
      </Row>
      
      <Row>
        <Col md={6} lg={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Document Summary</Card.Title>
              <div className="d-flex justify-content-center align-items-center" style={{ height: '150px' }}>
                <div className="text-center">
                  <h2 className="mb-0">{loading ? '...' : documentCount}</h2>
                  <p className="text-muted">Total Documents</p>
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
              <Link to="/documents" className="text-decoration-none">View all documents</Link>
            </Card.Footer>
          </Card>
        </Col>
        
        <Col md={6} lg={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Quick Actions</Card.Title>
              <div className="d-grid gap-3 pt-3">
                <Link to="/upload" className="btn btn-primary">Upload Document</Link>
                <Link to="/documents" className="btn btn-outline-secondary">View Documents</Link>
                <Link to="/profile" className="btn btn-outline-secondary">View Profile</Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={4} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body>
              <Card.Title>Recent Documents</Card.Title>
              {loading ? (
                <p>Loading...</p>
              ) : error ? (
                <p className="text-danger">{error}</p>
              ) : recentDocuments.length === 0 ? (
                <p>No documents available</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {recentDocuments.map((doc) => (
                    <li key={doc.name} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{doc.name}</span>
                        <small className="text-muted">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
            <Card.Footer>
              <Link to="/documents" className="text-decoration-none">View all documents</Link>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;