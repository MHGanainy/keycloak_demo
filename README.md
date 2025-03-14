# Keycloak Document Management Demo

This project demonstrates the integration of Keycloak as an IAM (Identity and Access Management) solution with a full-stack web application. It includes a React frontend, Node.js/Express backend, and Keycloak for secure authentication and authorization.

## Features

- **User Authentication**: Secure login/logout using Keycloak
- **Role-Based Access Control**: Different permissions for admin, editor, and user roles
- **Document Management**: Upload, download, and delete documents
- **User Profile**: View user information and roles
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Docker and Docker Compose
- Node.js and npm (for local development)

## Quick Start

1. Clone this repository
2. Start the services using Docker Compose:

```bash
docker-compose up -d
```

3. Import the Keycloak realm configuration:
   - Access the Keycloak admin console at http://localhost:8080/admin (credentials: admin/admin)
   - Create a new realm and import the `docker/document-demo-realm.json` file

4. Test the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Keycloak: http://localhost:8080

## Default Test Users

1. Admin User:
   - Username: admin
   - Password: admin123
   - Roles: admin, user

2. Regular User:
   - Username: user
   - Password: user123
   - Role: user

## Project Structure

```
keycloak-demo/
├── backend/              # Node.js/Express backend
│   ├── src/              # Backend source code
│   └── uploads/          # Uploaded documents storage
├── docker/               # Docker-related files
│   └── document-demo-realm.json  # Keycloak realm configuration
├── frontend/             # React frontend
│   └── src/              # Frontend source code
│       ├── components/   # Reusable React components
│       ├── pages/        # React page components
│       └── services/     # API and Keycloak services
└── docker-compose.yml    # Docker Compose configuration
```

## Security Features

This demo showcases several Keycloak security features:

- **OpenID Connect**: Standard protocol for authentication
- **JWT Tokens**: Secure token-based authentication
- **Role-Based Access Control**: Controlling access based on user roles
- **Token Refresh**: Automatic refresh of expired tokens
- **Token Validation**: Backend validation of tokens for secure API access

## Development

For local development without Docker:

1. Start Keycloak and PostgreSQL using Docker:

```bash
docker-compose up -d keycloak postgres
```

2. Install and start the backend:

```bash
cd backend
npm install
npm run dev
```

3. Install and start the frontend:

```bash
cd frontend
npm install
npm start
```

## Key Technologies

- **Frontend**: React, React Router, Bootstrap, Keycloak-js
- **Backend**: Node.js, Express, Keycloak-connect
- **IAM**: Keycloak, OpenID Connect, OAuth 2.0
- **Database**: PostgreSQL (for Keycloak)
- **Infrastructure**: Docker, Docker Compose

## License

MIT

## Disclaimer

This is a demonstration application and should not be used in production without additional security hardening.