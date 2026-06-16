# TradeSphere — Professional Trading Journal & Analytics Platform
## Documentation for Project Viva / Technical Presentation

### 1. Project Introduction
**TradeSphere** is a high-performance, premium web application designed for professional traders and consultants to track, analyze, and optimize trading activities. It provides a centralized dashboard for managing client investments, tracking individual trade performance (Open/Closed), and generating real-time financial insights. 

TradeSphere utilizes a sleek **Black & Gold** design system to provide an agency-grade user experience.

---

### 2. Technology Stack
The project follows a modern **MERN-like** architecture (replacing MongoDB with MySQL for relational integrity).

#### **Frontend (Client)**
- **React 19**: Latest version of the UI library for building a dynamic, component-based interface.
- **Vite**: Ultra-fast build tool and development server.
- **Vanilla CSS**: Custom CSS variables (Design Tokens) for a fully controlled, high-fidelity design.
- **React Router 7**: For seamless client-side navigation.
- **Axios**: For robust API communication with the backend.
- **Custom Price Tracking**: Real-time Current Market Price (CMP) cards for major indices (NIFTY, BANKNIFTY, etc.).

#### **Backend (Server)**
- **Node.js & Express**: Scalable server-side environment.
- **MySQL (mysql2)**: Relational database for structured financial data and transactional integrity.
- **JWT (JSON Web Tokens)**: Secure, stateless authentication system.
- **Bcrypt**: Industrial-strength password hashing for user security.
- **Google Generative AI (Gemini)**: Integrated for AI-powered trade insights and news analysis.
- **Scrapers (Cheerio/RSS-Parser)**: Real-time data extraction for market news and stock research.

---

### 3. Project Structure
```text
TradeSphere/
├── client/                # React Frontend
│   ├── src/
│   │   ├── api/           # Axios instance & API endpoints
│   │   ├── components/    # Reusable UI (Modals, Tables, Cards)
│   │   ├── context/       # Auth & Theme state management
│   │   ├── pages/         # Page components (Dashboard, Trades, Clients)
│   │   ├── index.css      # Design System & Global Styles
│   │   └── App.jsx        # Routing & Layout configuration
├── src/                   # Node.js Backend
│   ├── config/            # DB connection & Environment variables
│   ├── controllers/       # Business logic for routes
│   ├── middleware/        # JWT Auth & Error handling
│   ├── routes/            # Express API route definitions
│   ├── services/          # External integrations (AI, Scrapers)
│   └── server.js          # Entry point
├── database_schema.sql    # Complete MySQL schema
└── README.md              # Setup instructions
```

---

### 4. Database Schema (Relational Model)
The database is designed with strict relational constraints to ensure data consistency.

#### **Core Tables**
1. **`admins`**: Stores administrative credentials and preferences.
   - `id`, `name`, `email`, `password_hash`, `role`, `preferences` (JSON).
2. **`clients`**: Tracks individuals investing capital.
   - `client_id`, `name`, `broker`, `capital_invested`, `status`.
3. **`trades`**: The central repository for all trade data.
   - `trade_id`, `stock_name`, `entry_price`, `quantity`, `target`, `stop_loss`, `status` (OPEN/CLOSED).
   - Metrics: `total_pnl`, `exit_price`, `trade_date`, `exit_date`.
4. **`trade_clients`**: A junction table (Many-to-Many) linking trades to multiple clients.
   - `trade_id`, `client_id`.
5. **`capital_summary`**: A singleton table for high-level financial health tracking.
   - `total_capital`, `total_pnl`, `deployed_capital`.
6. **`watchlist_symbols`**: Personalized stock monitoring.
   - `symbol`, `name`, `category`.

---

### 5. Core Features & Functional Points
- **Interactive Dashboard**: Real-time summary of Profit/Loss (PnL), Win Rate, and Capital Utilization.
- **Advanced Trade Logging**: Capture emotional states, Nifty market mood, and technical strategies for every trade.
- **Client Portfolio Management**: Link specific trades to client capital to track ROI per client.
- **Stock Research Module**: Integrated scrapers and AI to analyze stock news and institutional activity.
- **Dynamic Watchlist**: Organize stocks by categories (Short, Long, etc.) with real-time tracking (implied).
- **AI Insights**: Using Gemini to provide "Conclusions" and "Reasons" for trade outcomes based on user notes.
- **Security**: JWT-based authentication, password hashing, and CORS/Helmet protection.

---

### 6. Technical Viva Points (Q&A Preparation)
- **Why MySQL instead of MongoDB?**
  - "Financial data is highly structured and relational. MySQL ensures ACID compliance and data integrity, especially when linking trades to multiple clients."
- **How are charts/prices handled?**
  - "Instead of using heavy external libraries, we built a custom 'CMP (Current Market Price)' component. It fetches real-time data from our backend proxy and displays it with a high-performance, minimalist UI that aligns with the project's premium design."
- **How is the "Premium UI" achieved without libraries like Tailwind?**
  - "We implemented a custom Design System using CSS Variables (Design Tokens) in `index.css`. This allows for theme switching (Gold/Green/Blue) and ensures a lightweight, high-performance UI without the overhead of heavy CSS frameworks."
- **How do you handle API security?**
  - "We use JWT for authentication. The token is sent in the `Authorization` header of every request. On the backend, an `authMiddleware` validates the token before allowing access to protected routes."
- **Explain the Many-to-Many relationship in your DB.**
  - "The `trade_clients` table acts as a bridge between `trades` and `clients`. This allows one trade (e.g., buying RELIANCE) to be shared across multiple clients, or one client to have multiple trades."
- **How is the AI integrated?**
  - "We use the `@google/generative-ai` package to send trade notes and outcomes to the Gemini-1.5-Flash model. The model analyzes the data and returns a structured conclusion to help the trader learn from their mistakes."

---

### 7. Installation & Setup
1. **Clone the repository.**
2. **Backend**: 
   - `npm install`
   - Configure `.env` (DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET, GEMINI_API_KEY).
   - `npm run dev`
3. **Frontend**:
   - `cd client && npm install`
   - `npm run dev`
4. **Database**:
   - Import `database_schema.sql` into your MySQL instance.

