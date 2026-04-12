# TradeSphere – Comprehensive Project Documentation

Welcome to the official documentation for **TradeSphere**, a premium full-stack financial research and trade management platform developed during my internship at **AJ Consultancy**.

TradeSphere is designed for professional traders and financial analysts to streamline the process of market research, trade tracking, and client management. It combines live market data, AI-driven factual insights, and robust portfolio management into a single, high-performance interface.

---

## 🌟 Key Features

### 1. Dynamic Market Dashboard
- **Live Index Tracking**: Real-time charts for Nifty 50 and BankNifty using TradingView's Lightweight Charts.
- **Portfolio Summary**: Instant overview of total capital, deployed liquid, and P&L status across all clients.
- **Interactive Layout**: Glassmorphism-inspired UI with theme support (Light/Dark).

### 2. Stock Research & Analysis (Screener.in Integration)
- **Live Scraping**: Fetches real-time financial data, ratios, and quarterly results directly from Screener.in using `Cheerio`.
- **AI-Powered Factual Summaries**: Utilizes **Google Gemini 1.5 Flash** to provide objective, data-driven business summaries without investment advice.
- **Horizon-Aware Analysis**: Adjusts AI observations based on the user's focus (Intraday, Swing, or Long Term).
- **Pros & Cons**: Aggregates community and financial sentiment for a balanced view.

### 3. Trade Management & Journaling
- **Full Lifecycle Tracking**: Log trades from entry to exit with detailed metrics (Strategy, Conviction, Nifty Mood, Emotions).
- **Automated P&L**: Calculates profit/loss and tracking status (Open/Closed) in real-time.
- **Trade Clients**: Map trades to specific clients to track individual performance.

### 4. Client Management
- **Capital Tracking**: Monitor invested capital, brokerage details, and active status for multiple clients.
- **Client Performance**: Drill down into specific client portfolios and historic trades.

### 5. Multi-Source News Feed
- **Global Financial News**: Real-time RSS feeds from major sources like MoneyControl and The Economic Times.
- **Contextual Search**: Filter news to stay updated on specific market movements.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Charts**: [Lightweight Charts](https://www.tradingview.com/lightweight-charts/) (TradingView)
- **Styling**: Vanilla CSS (Modern CSS Variables & System Design)
- **Routing**: React Router 7
- **Icons/UI**: Custom Glassmorphism design system

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/)
- **Database**: [MySQL](https://www.mysql.com/) (Relational DB)
- **AI Engine**: [Google Generative AI (Gemini SDK)](https://ai.google.dev/)
- **Scraping**: [Cheerio](https://cheerio.js.org/) (for Screener.in data extraction)
- **Authentication**: JWT (JSON Web Tokens) & Bcrypt

---

## 🏗 System Architecture

TradeSphere follows a decoupled architecture:

1.  **Frontend (Client)**: A modern SPA (Single Page Application) that communicates via a RESTful API.
2.  **Backend (Server)**: A Node.js API layer handling business logic, web scraping, and AI coordination.
3.  **Database**: A structured MySQL schema for persistent storage of users, clients, trades, and notes.
4.  **External Integrations**:
    *   **Screener.in API/Scraping**: Fetches live fundamental data.
    *   **Google Gemini**: Processes complex financial data into readable summaries.
    *   **RSS Sources**: Aggregates market news.

---

## 💾 Database Schema

The database consists of the following primary entities:

| Table | Description |
| :--- | :--- |
| `admins` | Credentials and roles for platform access. |
| `clients` | Personal and financial details of managed clients. |
| `trades` | Detailed log of all market positions (Stock, Type, P&L, etc.). |
| `trade_clients` | Link-table for mapping trades to multiple clients. |
| `capital_summary`| Global tracking of total and deployed capital. |
| `reference_notes` | Document storage for research papers and uploaded notes. |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18+)
- MySQL
- Google Gemini API Key

### Backend Setup
1. Navigate to the root directory.
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_password
   DB_NAME=tradesphere
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_gemini_key
   ```
4. Run the database migration using `database_schema.sql`.
5. Start the server: `npm run dev`

### Frontend Setup
1. Navigate to the `client` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the app at `http://localhost:5173`.

---

## 🎓 Internship Context – AJ Consultancy

This project was developed as a flagship tool for **AJ Consultancy** during my internship. The primary goal was to digitize the firm's trading operations, moving from traditional logs to an AI-enhanced research environment.

**Key Contributions:**
- Designed the end-to-end database schema and backend architecture.
- Developed the live scraper for Screener.in to reduce research time by 80%.
- Integrated Generative AI to provide "Objective Summaries" for quick decision making.
- Implemented a custom trade-logging system that accounts for psychological factors (Emotions, Conviction).

---

> [!NOTE]
> This project is a demonstration of full-stack engineering, data scraping, and AI integration for professional financial services.
