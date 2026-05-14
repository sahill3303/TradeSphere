# TradeSphere: Project Documentation

## 1. Project Overview
**TradeSphere** is a premium, full-stack trading management system designed for **AJ Consultancy**. It provides a comprehensive suite of tools for tracking trades, managing client portfolios, monitoring capital deployment, and organizing market research via watchlists and reference notes.

### Tech Stack
- **Frontend**: React.js with Vite, Tailwind CSS (Vanilla CSS for custom components), Framer Motion for animations.
- **Backend**: Node.js with Express.js.
- **Database**: MySQL (Relational data storage).
- **AI Integration**: Google Gemini API (for market insights and summaries).
- **Other Tools**: Cheerio/RSS-Parser (for market data scraping), JWT (Authentication), Bcrypt (Password hashing).

---

## 2. Directory Structure

```text
AJ Consultancy/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/            # Axios/Fetch API configurations
│   │   ├── components/     # Reusable UI components (Layout, UI, Dashboard, Auth)
│   │   ├── context/        # State management (AuthContext, etc.)
│   │   ├── pages/          # Page-level components (Dashboard, Trades, Clients, etc.)
│   │   ├── routes/         # Frontend routing logic
│   │   └── App.jsx         # Main application entry
│   └── package.json        # Frontend dependencies
├── src/                    # Backend (Node.js + Express)
│   ├── config/             # Database & Environment configurations
│   ├── controllers/        # Business logic for API endpoints
│   ├── middleware/         # Auth, validation, and error handlers
│   ├── migrations/         # SQL migration scripts
│   ├── routes/             # API route definitions
│   ├── services/           # External service integrations (AI, Scrapers)
│   ├── utils/              # Helper functions
│   └── app.js              # Express app setup
├── uploads/                # Directory for stored files/documents
├── database_schema.sql     # Core SQL schema definition
├── .env                    # Environment variables (DB credentials, API keys)
└── package.json            # Backend dependencies & scripts
```

---

## 3. Database Schema

The database follows a multi-tenant relational structure (via `admin_id`) to manage users, clients, trades, and market research.

For a comprehensive breakdown of the database tables, data types, constraints, and an Entity-Relationship (ER) Diagram, please refer to the dedicated **[Database Schema Documentation](./DATABASE_SCHEMA.md)**.

The core tables include:
- **`admins`**: System users (tenants).
- **`clients`**: Trading clients managed under admins.
- **`trades`**: Execution and post-trade analysis data.
- **`trade_clients`**: Junction table for trade distribution among clients.
- **`capital_summary`**: Dashboard metric caching.
- **`reference_notes`**: Market research documents.
- **`watchlist_categories`** & **`watchlist_symbols`**: Stock tracking.

---

## 4. Application Scopes & Features

### 📊 Dashboard
- **Real-time Overview**: Summary of total capital, active trades, and overall P&L.
- **Visual Analytics**: Charts showing trade performance and capital distribution.
- **Market Pulse**: AI-generated market summaries and news feeds.

### 📈 Trade Management
- **Detailed Logging**: Record every aspect of a trade from entry to exit.
- **Emotion Tracking**: Log psychological factors (fear, greed) to improve trading discipline.
- **Conclusion & Notes**: Post-trade reviews for continuous learning.

### 👥 Client Management
- **Portfolio Tracking**: View individual client capital and their share in active trades.
- **Status Monitoring**: Manage active and inactive client relationships.

### 🔭 Watchlist
- **Categorization**: Group symbols by strategy (e.g., Short-term, Long-term, Breakout).
- **Quick Glance**: Rapidly check status of stocks on the radar.

### 📝 Reference Notes & Docs
- **Research Hub**: Upload and categorize PDFs, charts, and strategy documents.
- **Rich Text Editor**: Write and store internal research notes.

---

## 5. Technical Implementation Details

### 5.1 Authentication
- Uses **JWT (JSON Web Tokens)** stored in cookies or local storage.
- **Middleware Protection**: Routes are guarded by an `authMiddleware` that verifies tokens before allowing access.

### 5.2 AI Assistant
- Integrated with **Google Gemini**.
- Used for analyzing trade patterns and providing market sentiment summaries based on scraped data.

### 5.3 Data Scraping
- Uses **Cheerio** and **RSS-Parser** to fetch latest financial news and market indices without requiring expensive external APIs.

---

## 6. Setup & Installation

### Prerequisites
- Node.js (v18+)
- MySQL Server
- Google Gemini API Key

### Steps
1. **Database Setup**:
   - Create a database named `tradesphere`.
   - Run the contents of `database_schema.sql` to create tables.
2. **Backend Configuration**:
   - Create a `.env` file in the root directory.
   - Add `DB_HOST`, `DB_USER`, `DB_PASS`, `JWT_SECRET`, and `GEMINI_API_KEY`.
3. **Installation**:
   - Root (Backend): `npm install`
   - Client: `cd client && npm install`
4. **Running the App**:
   - Backend: `npm run dev`
   - Frontend: `cd client && npm run dev`

---

## 7. Future Scopes
- **Automated Broker Integration**: Syncing trades directly from Zerodha/Upstox.
- **Mobile App**: React Native version for on-the-go tracking.
- **Advanced AI Forecasting**: Predictive modeling for stock movements based on historical logs.
