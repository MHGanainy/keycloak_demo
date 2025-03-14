const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const Keycloak = require('keycloak-connect');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
}));

// Configure Keycloak
const keycloakConfig = {
  "realm": process.env.KEYCLOAK_REALM || "document-demo",
  "auth-server-url": process.env.KEYCLOAK_URL || "http://localhost:8080/",
  "ssl-required": "external",
  "resource": process.env.KEYCLOAK_CLIENT_ID || "backend-service",
  "confidential-port": 0,
  "bearer-only": true
};

// Initialize Keycloak middleware
const keycloak = new Keycloak({}, keycloakConfig);
app.use(keycloak.middleware());

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Protected route example
app.get('/api/documents', keycloak.protect(), (req, res) => {
  const files = fs.readdirSync(uploadsDir);
  
  const documents = files.map(file => ({
    name: file,
    path: `/api/documents/${file}`,
    uploadedAt: fs.statSync(path.join(uploadsDir, file)).mtime
  }));
  
  res.json(documents);
});

// Admin only route example
app.delete('/api/documents/:filename', keycloak.protect('admin'), (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.status(200).json({ message: 'Document deleted successfully' });
  } else {
    res.status(404).json({ message: 'Document not found' });
  }
});

// Upload document endpoint
app.post('/api/documents', keycloak.protect('user'), (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: 'No files were uploaded' });
    }
    
    const uploadedFile = req.files.document;
    const filePath = path.join(uploadsDir, uploadedFile.name);
    
    uploadedFile.mv(filePath, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error uploading file', error: err });
      }
      
      res.status(201).json({
        message: 'File uploaded successfully',
        document: {
          name: uploadedFile.name,
          path: `/api/documents/${uploadedFile.name}`,
          size: uploadedFile.size
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download document endpoint
app.get('/api/documents/:filename', keycloak.protect(), (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ message: 'Document not found' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});