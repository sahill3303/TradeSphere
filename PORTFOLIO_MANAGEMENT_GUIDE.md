# 📊 TradeSphere Investment Portfolio & Wealth Management Guide
*Comprehensive Architecture, Financial Mathematics, Benchmark Analytics & Best Practices*

---

## 1. Executive Overview

The **Investment Portfolio** section of TradeSphere is engineered for long-term equity investors, fund managers, and family-office style wealth builders. Unlike the fast-paced **Active Trades** workspace (which tracks Intraday, Swing, and MTF setups with leverage, stop-losses, and rapid turnover), the **Portfolio** workspace is designed for **conviction equity holding, compounding wealth tracking, asset allocation, and market benchmark outperformance (Alpha vs NIFTY 50)**.

### Core Distinctions: Trades vs Portfolio
| Dimension | Active Trades (`/trades`) | Investment Portfolio (`/portfolio`) |
| :--- | :--- | :--- |
| **Objective** | Capture short-term momentum, breakout, & swing swings | Long-term capital compounding & wealth generation |
| **Time Horizon** | Hours to Weeks (Intraday, Swing, MTF) | Months to Multi-Year (Conviction Holdings) |
| **Leverage** | Leveraged allowed (1x to 5x MTF) | Strictly Cash / Unleveraged (1x equity delivery) |
| **Tax Context** | Business Income / Short-Term Speculation | STCG (< 365 days) vs LTCG (≥ 365 days) |
| **Benchmark Goal** | Risk-to-Reward (R:R) & Win-Rate Maximization | Alpha Spread vs NIFTY 50 Benchmark |

---

## 2. Core Financial Metrics & Mathematical Formulas

Every figure displayed on the Portfolio Dashboard is computed in real time using your position records and live market quotes from the National Stock Exchange (NSE):

### 2.1 Current Portfolio Value (AUM / Market Valuation)
$$\text{Current Portfolio Value} = \sum_{i=1}^{N} \left( \text{CMP}_i \times \text{Quantity}_i \right)$$
- $\text{CMP}_i$: Current Market Price of holding $i$ fetched in real-time from the NSE / Screener market quote engine. If market is closed or quote is unavailable, it gracefully defaults to the acquisition cost ($\text{Entry Price}_i$).
- $\text{Quantity}_i$: Total open shares held.

### 2.2 Invested Capital (Acquisition Cost Basis)
$$\text{Invested Capital} = \sum_{i=1}^{N} \left( \text{Entry Price}_i \times \text{Quantity}_i \right)$$
- Represents the total actual capital deployed from cash reserves to acquire the currently active holdings.

### 2.3 Unrealized Gain / Loss & ROI (Paper P&L)
$$\text{Unrealized P\&L (₹)} = \text{Current Portfolio Value} - \text{Invested Capital}$$

$$\text{Unrealized ROI (\%)} = \begin{cases} \left( \dfrac{\text{Unrealized P\&L}}{\text{Invested Capital}} \right) \times 100 & \text{if Invested Capital} > 0 \\ 0.00\% & \text{if Invested Capital} = 0 \end{cases}$$

### 2.4 Day's P&L (Today's Floating Change)
$$\text{Day's P\&L (₹)} = \sum_{i=1}^{N} \left( (\text{CMP}_i \times \text{Quantity}_i) \times \dfrac{\Delta \%_i}{100} \right)$$
- $\Delta \%_i$: Today's percentage price movement of symbol $i$ from the previous market closing price.

### 2.5 Realized Returns (Booked Profits / Loss)
$$\text{Total Realized P\&L (₹)} = \sum_{j=1}^{M} \text{Realized P\&L}_j$$
- Aggregated net profit or loss booked upon executing partial or full exits on historical long-term holdings.

### 2.6 Net Wealth Created (Institutional Total Return)
$$\text{Total Net Wealth Created} = \text{Unrealized P\&L} + \text{Total Realized P\&L}$$
- Reflects the true cumulative financial wealth generated across both active holdings and exited investments.

---

## 3. Alpha vs NIFTY 50 Benchmark Engine

### 3.1 What is Alpha ($\alpha$)?
In professional portfolio management, **Alpha** measures a fund manager's ability to beat the broader market index. While anyone can achieve market returns by buying an index ETF (such as NIFTYBEES), picking individual conviction stocks is only justified if your portfolio **beats** the index return over identical time horizons.

$$\alpha = R_{\text{portfolio}} - R_{\text{NIFTY 50}}$$

- **$\alpha > 0$ (Positive Alpha)**: You are outperforming the market benchmark. Your stock-selection and timing are generating superior returns.
- **$\alpha < 0$ (Negative Alpha)**: Your portfolio is lagging behind passive index investing.
- **$\alpha = 0$ / Unallocated**: Neutral baseline.

### 3.2 Why Was `-5.80% Underperforming` Showing on an Empty Portfolio?
In previous versions, the benchmark time window was initialized to `3M` (3-Month), which carries a NIFTY 50 baseline return of `+5.8%`. 

When a user opened the page with **₹0 invested** and **0 holdings**, the portfolio return was $0\%$. The calculation blindly executed:
$$\alpha = 0.00\% - 5.80\% = -5.80\%$$
This erroneously triggered a red `-5.80% ▼ Underperforming Benchmark` alert and plotted a misleading comparison curve comparing 0% against NIFTY 50.

### 3.3 The Intelligent Solution Implemented
1. **Unallocated Capital Protection**: If $\text{Total Invested} = 0$ or active holdings count is $0$, Alpha is set to `—` with status `"○ Awaiting active equity holdings"`.
2. **Benchmark Engine Ready State**: Instead of rendering a fake comparison chart, the benchmark studio renders a clean **Alpha Benchmark Engine Ready** dashboard displaying:
   - Real-time NIFTY 50 Index level & daily change.
   - Explanation of time-horizon alpha calculation.
   - One-click shortcut to add the first long-term investment.
3. **Live Active Alpha**: The moment your first holding is logged, real-time Alpha tracking immediately unlocks with interactive SVG curves, time-window toggles (`1W`, `1M`, `3M`, `6M`, `1Y`, `ALL`), and hover crosshairs.

---

## 4. Intelligent Investor & Risk Management Features

### 4.1 Asset Allocation & 25% Concentration Advisory
$$\text{Weight of Holding } i = \left( \dfrac{\text{Current Value}_i}{\text{Total Portfolio Value}} \right) \times 100$$
- **Color-Coded Allocation Bar**: Breaks down your top holdings and clusters tail assets into "Others".
- **Institutional Concentration Rule**: If any individual stock exceeds **25%** of your total portfolio value, TradeSphere triggers an automatic **Concentration Notice**:
  > *⚠️ Portfolio Allocation Notice: [Symbol] accounts for [X]% of your total deployed capital. Maintaining < 20-25% single-stock exposure mitigates idiosyncratic company risk.*

### 4.2 Indian Taxation Duration Tracking (STCG vs LTCG)
Under the Indian Income Tax Act (Finance Act updates):
- **Short-Term Capital Gains (STCG)**: Listed equity sold before **365 days** is taxed at **20%**.
- **Long-Term Capital Gains (LTCG)**: Listed equity held for **≥ 365 days** is taxed at **12.5%** (on gains exceeding ₹1.25 Lakh per financial year).

TradeSphere tracks the exact elapsed holding duration:
- Every holding card and table row displays: `[X]d held`.
- Displays dynamic tax eligibility badges:
  - `< 365 days`: `STCG (< 1 Yr)`
  - `≥ 365 days`: `LTCG Qualified (≥ 1 Yr)` (in gold/green)

---

## 5. Operations & Workflows

### 5.1 Adding a Long-Term Investment
1. Click **+ Open Position** in the top-right header of the Portfolio screen.
2. Select your ticker symbol (e.g. `TCS`, `HDFCBANK`, `RELIANCE`).
3. Notice that `SELL / SHORT` is automatically disabled (equity investments are spot delivery `BUY`).
4. Enter entry price, quantity, investment thesis, and conviction score (1 to 10).
5. The position immediately appears in your active investment ledger.

### 5.2 Switching a Swing Trade into Long-Term Portfolio
If an active swing trade develops into a multi-year compounder thesis:
1. In **Trades (`/trades`)**, open the 3-dots menu on the trade card (or click the setup badge `SWING ⇄`).
2. Click **Move to Portfolio**.
3. Confirm the modal prompt.
4. TradeSphere executes a dedicated atomic transition (`PATCH /api/trades/:id/to-portfolio`), updating `mode = 'LONG TERM'`, setting leverage to `1`, and migrating it seamlessly into `/portfolio`.

### 5.3 Moving a Long-Term Holding Back to Active Trades
1. In **Portfolio (`/portfolio`)**, open the 3-dots menu on any holding.
2. Click **Move to Active Trades (Swing)**.
3. The holding is seamlessly transitioned back to the active trading journal (`mode = 'SWING'`).

### 5.4 Partial and Full Profit Booking
When trimming or liquidating a holding:
1. Click **Exit** or select **Book Profits / Exit** from the holding's 3-dots menu.
2. Enter exit price and exit date.
3. If selling fewer shares than your total holding (e.g., selling 5 shares out of 10), TradeSphere recognizes this as a **partial profit booking** and prompts for your strategic exit reason.
4. The remaining shares stay active in your portfolio, while the booked profit/loss is archived in **Exited Investments**.

### 5.5 Handling Corporate Actions (Stock Splits & Bonus Issues)
When a held stock undergoes a corporate action:
1. TradeSphere's **Layer 3 Watchdog** automatically identifies split/bonus events when entry price diverges sharply from the post-action CMP and alerts you with a `⚡ Split Detected` pill.
2. You can also manually select **Corporate Action / Split** from the holding's 3-dots menu or Thesis Modal footer.
3. The **Layer 2 Interactive Wizard** calculates the exact post-action quantity and price while keeping your total invested capital strictly invariant ($\Delta \text{Invested} = ₹0.00$).
4. For complete mathematical proofs, Indian tax treatment (Section 45 & 55(2)(aa)), and audit mechanisms, see the **[Corporate Action 3-Layer Architecture Guide](./CORPORATE_ACTIONS_GUIDE.md)**.

---

*TradeSphere Portfolio Manager — Built for intelligent wealth compounding and benchmark outperformance.*

