# TradaX Authentication Service

A Spring Boot microservice that handles user authentication, registration, and JWT token management for the TradaX cryptocurrency trading platform.

## Features

- User registration with email verification
- Secure login with JWT token generation
- OTP-based email verification
- Password encryption using BCrypt
- Profile management
- JWT token validation and refresh
- CORS support for frontend integration
- H2 in-memory database for development

## API Endpoints

### Public Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/verify-otp` - Email verification
- `POST /auth/resend-otp` - Resend OTP
- `GET /auth/health` - Health check

### Protected Endpoints

- `PUT /auth/profile` - Update user profile
- `POST /auth/logout` - User logout

## Getting Started

### Prerequisites

- Java 11 or higher
- Maven 3.6 or higher

### Installation

1. Navigate to the auth-service directory:
   ```bash
   cd backend/auth-service
   ```

2. Build the application:
   ```bash
   ./mvnw clean install
   ```

3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```

The service will start on port 8081.

### Environment Variables

Create a `.env` file or set the following environment variables:

```bash
JWT_SECRET=your_jwt_secret_key_here
