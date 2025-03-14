import React, { useState, useRef } from 'react';
import { Container, Form, Button, Card, Alert, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/ApiService';

const UploadDocument = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress (in a real application, you would use XHR or Axios progress events)
      const progressInterval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          const newProgress = prevProgress + 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      await ApiService.uploadDocument(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Navigate to the documents page after a short delay
      setTimeout(() => {
        navigate('/documents');
      }, 1000);
    } catch (err) {
      setError(`Upload failed: ${err.response?.data?.message || err.message}`);
      setUploading(false);
      console.error(err);
    }
  };
  
  return (
    <Container>
      <h1 className="mb-4">Upload Document</h1>
      
      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={handleUpload} className="upload-form">
            {error && (
              <Alert variant="danger" onClose={() => setError(null)} dismissible>
                {error}
              </Alert>
            )}
            
            <div 
              className={`drop-zone mb-4 ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="d-none"
              />
              
              {file ? (
                <div className="text-center">
                  <i className="bi bi-file-earmark-check fs-1 text-success mb-2"></i>
                  <h5 className="mb-1">{file.name}</h5>
                  <p className="text-muted mb-0">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <i className="bi bi-cloud-arrow-up fs-1 text-primary mb-2"></i>
                  <h5>Drag and drop a file here</h5>
                  <p className="text-muted mb-0">
                    or click to browse your files
                  </p>
                </div>
              )}
            </div>
            
            {uploading && (
              <div className="mb-4">
                <ProgressBar 
                  animated={uploadProgress < 100} 
                  variant={uploadProgress === 100 ? "success" : "primary"}
                  now={uploadProgress} 
                  label={`${uploadProgress}%`} 
                />
                <p className="text-center mt-2">
                  {uploadProgress === 100 
                    ? 'Upload complete! Redirecting...' 
                    : 'Uploading document...'}
                </p>
              </div>
            )}
            
            <div className="d-grid gap-2">
              <Button 
                type="submit" 
                variant="primary" 
                disabled={!file || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/documents')}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UploadDocument;