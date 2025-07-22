# TradaX Wallet Service

A Spring Boot microservice that handles wallet management, trading operations, and transaction history for the TradaX cryptocurrency trading platform.

## Features

- Multi-currency wallet management
- Cryptocurrency trading (buy/sell)
- Deposit and withdrawal operations
- Transaction history tracking
- Portfolio value calculation
- Performance metrics
- JWT-based authentication
- H2 in-memory database for development

## API Endpoints

### Public Endpoints

- `GET /wallet/health` - Health check

### Protected Endpoints

- `GET /wallet/balance` - Get user wallet balances
- `POST /wallet/deposit` - Deposit funds to wallet
- `POST /wallet/withdraw` - Withdraw funds from wallet
- `POST /wallet/trade` - Execute buy/sell trades
- `GET /wallet/history` - Get transaction history
- `GET /wallet/portfolio` - Get portfolio summary

## Getting Started

### Prerequisites

- Java 11 or higher
- Maven 3.6 or higher
- Running auth-service (for JWT validation)

### Installation

1. Navigate to the wallet-service directory:
   ```bash
   cd backend/wallet-service
   ```

2. Build the application:
   ```bash
   ./mvnw clean install
   ```

3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```

The service will start on port 8082.

### Environment Variables

Create a `.env` file or set the following environment variables:

```bash
JWT_SECRET=your_jwt_secret_key_here
