import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import ApiService from '../services/ApiService';
import KeycloakService from '../services/KeycloakService';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const isAdmin = KeycloakService.hasRole('admin');
  
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getDocuments();
      
      // Sort documents by upload date (newest first)
      const sorted = [...response.data].sort((a, b) => 
        new Date(b.uploadedAt) - new Date(a.uploadedAt)
      );
      
      setDocuments(sorted);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch documents');
      setLoading(false);
      console.error(err);
    }
  };
  
  useEffect(() => {
    fetchDocuments();
  }, []);
  
  const handleDownload = (documentName) => {
    const downloadUrl = ApiService.getDocumentUrl(documentName);
    
    // Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', documentName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDelete = async (documentName) => {
    if (window.confirm(`Are you sure you want to delete "${documentName}"?`)) {
      try {
        await ApiService.deleteDocument(documentName);
        setSuccessMessage(`Document "${documentName}" deleted successfully`);
        fetchDocuments(); // Refresh the list
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } catch (err) {
        setError(`Failed to delete document: ${err.response?.data?.message || err.message}`);
        console.error(err);
      }
    }
  };
  
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'bi-file-earmark-pdf';
      case 'doc':
      case 'docx':
        return 'bi-file-earmark-word';
      case 'xls':
      case 'xlsx':
        return 'bi-file-earmark-excel';
      case 'ppt':
      case 'pptx':
        return 'bi-file-earmark-ppt';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'bi-file-earmark-image';
      default:
        return 'bi-file-earmark';
    }
  };
  
  return (
    <Container>
      <h1 className="mb-4">Documents</h1>
      
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
          {successMessage}
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-inbox fs-1 text-muted"></i>
          <p className="mt-3">No documents found</p>
          <Button href="/upload" variant="primary">Upload a Document</Button>
        </div>
      ) : (
        <Row>
          {documents.map((document) => (
            <Col md={6} lg={4} key={document.name} className="mb-4">
              <Card className="document-card h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <i className={`bi ${getFileIcon(document.name)} fs-1 me-3 text-primary`}></i>
                    <div>
                      <Card.Title className="mb-0">{document.name}</Card.Title>
                      <small className="text-muted">
                        Uploaded: {new Date(document.uploadedAt).toLocaleString()}
                      </small>
                    </div>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white">
                  <div className="d-flex justify-content-between">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => handleDownload(document.name)}
                    >
                      <i className="bi bi-download me-1"></i> Download
                    </Button>
                    
                    {isAdmin && (
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDelete(document.name)}
                      >
                        <i className="bi bi-trash me-1"></i> Delete
                      </Button>
                    )}
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default DocumentList;