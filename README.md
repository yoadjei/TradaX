<p align="center">
  <img src="frontend/apps/host-app/assets/icon.png" alt="TradaX Logo" width="160" />
</p>

# TradaX 🪙 — Crypto Trading App

![License](https://img.shields.io/badge/license-MIT-green)
![Expo](https://img.shields.io/badge/built_with-Expo-blue)
![Backend](https://img.shields.io/badge/backend-SpringBoot%20%7C%20Java17-orange)
![Status](https://img.shields.io/badge/status-active-brightgreen)

A full-featured cryptocurrency trading app powered by **Expo React Native** (frontend) and **Spring Boot + Java 17** (backend). Includes real-time market data, live news, AI chat assistant and a trading engine with real transactions.

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Expo CLI: `npm install -g expo-cli`
- Expo Go (iOS/Android app)

### Run the App
```bash
cd frontend
npm install
cd apps/host-app
expo start
```

Scan QR code with Expo Go or press `i` (iOS) / `a` (Android)

## 🌐 Environment Variables

Create `.env` in `frontend/`:
```env
OPENAI_API_KEY=your_openai_api_key
GNEWS_API_KEY=your_gnews_api_key
COINGECKO_API_KEY=optional
```

## ✅ Features

- 🔐 Auth + Wallet (UI + backend)
- 📊 Live crypto prices (CoinGecko)
- 📰 News feed (GNews API)
- 🤖 AI Chatbot (OpenAI API)
- 💹 Real trading engine w/ transaction logic
- 🌓 Dark/light theme toggle
- 🧩 Modular monorepo architecture

## 🗂️ Project Structure

```
TradaX/
├── frontend/
│   ├── apps/         # Feature modules (auth, trading, wallet, etc.)
│   ├── packages/     # Shared UI components, theme, utils
│   └── App.js
├── backend/
│   ├── auth-service/     # Spring Boot (Java 17)
│   └── wallet-service/
└── README.md
```

## 🔐 Backend Setup

Requires **Java 17+**, **Maven**, and **PostgreSQL**

```bash
# Auth Service (Port 8083)
cd backend/auth-service
mvn spring-boot:run

# Wallet / Trading Service (Port 8082)
cd backend/wallet-service
mvn spring-boot:run
```

## 🚀 Build for Production

```bash
expo build:android
expo build:ios
```

## 🤝 Contributing

```bash
git checkout -b feature/my-feature
git commit -m "Add my feature"
git push origin feature/my-feature
```

Then open a pull request.

## 📄 License

Licensed under the [MIT License](./LICENSE)

---

© TradaX · 2025
