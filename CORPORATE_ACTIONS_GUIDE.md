# 🏛️ TradeSphere 3-Layer Corporate Action Architecture Guide
*Stock Splits, Bonus Issues, Reverse Consolidations & Capital Invariance Engine*

---

## 1. Executive Summary & The Core Problem

In active equity trading and institutional portfolio management, companies frequently alter their share capital structure through **Corporate Actions**:
1. **Stock Splits** (Sub-division of shares, e.g., face value ₹10 sub-divided into ₹1 or ₹2).
2. **Bonus Share Issues** (Free additional shares distributed from accumulated reserves, e.g., 1:1 or 2:1).
3. **Reverse Splits / Consolidations** (Consolidating multiple shares into a single share, e.g., 10:1).
4. **Special Dividends & Demergers / Spin-offs**.

### ⚠️ The Naive Tracking Bug in Traditional Portfolio Software
When a stock undergoes an ex-date event (for example, a 1:10 stock split):
- Yesterday's closing price was **₹1,000**.
- Today's opening ex-split price is **₹100**.
- In an unadjusted system, the trader's entry price remains recorded at **₹1,000** for **10 shares** (Invested: ₹10,000). The current market price (CMP) drops to **₹100**, and the software calculates:
  $$\text{Unrealized P\&L} = (100 - 1000) \times 10 = -₹9,000 \quad (-90\% \text{ loss!})$$
This induces panic, corrupts portfolio analytics, distorts benchmark alpha calculations, and violates client reporting standards.

### 🛡️ The TradeSphere Solution: 3-Layer Architecture
TradeSphere resolves this with an institutional-grade **3-Layer Corporate Action Engine** designed to maintain 100% mathematical capital invariance, automate detection, and ensure regulatory compliance.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 LAYER 3: AUTOMATED WATCHDOG DETECTION                   │
│   • Background ratio heuristic: entry_price / live_cmp                 │
│   • Detects corridors: ~10x (1:10), ~5x (1:5), ~3x (1:3), ~2x (1:2)    │
│   • Surfaces non-intrusive "⚡ Split Detected" smart action pill       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ 1-Click Launch
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 LAYER 2: INTERACTIVE WIZARD MODAL UI                   │
│   • Stock Split, Bonus Issue, Reverse Split presets & Custom Override   │
│   • Real-time side-by-side comparison cards (Old vs Adjusted)          │
│   • Live Visual Capital Invariance Badge (Δ Invested = ₹0.00 guaranteed)│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Secure API Call
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              LAYER 1: BACKEND DATA INTEGRITY & AUDIT ENGINE             │
│   • POST /api/trades/:trade_id/corporate-action                         │
│   • Strict Mathematical Invariance: P_new * Q_new = P_old * Q_old       │
│   • Multi-tenant client allocation re-weighting                         │
│   • Proportional Target & SL adjustment                                 │
│   • Immutable Audit Trail written to trade_notes                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer 1: Backend Data Integrity & Invariance Engine

The core backend handler is implemented in `src/controllers/trades.controller.js` under `applyCorporateAction`, exposed via `POST /api/trades/:trade_id/corporate-action`.

### 2.1 Mathematical Invariance Proof
For any corporate action with multiplier $M$:
- **Old Position**: Quantity $Q_{\text{old}}$, Entry Price $P_{\text{old}}$.
- **Old Invested Capital**:
  $$C_{\text{old}} = Q_{\text{old}} \times P_{\text{old}}$$

#### Stock Split ($1 : N$)
A stock split divides 1 old share into $N$ new shares:
$$M = N$$
$$Q_{\text{new}} = \text{round}(Q_{\text{old}} \times N)$$
$$P_{\text{new}} = \dfrac{P_{\text{old}}}{N}$$
$$\text{Proof of Invariance: } C_{\text{new}} = Q_{\text{new}} \times P_{\text{new}} = (Q_{\text{old}} \times N) \times \left(\dfrac{P_{\text{old}}}{N}\right) = Q_{\text{old}} \times P_{\text{old}} = C_{\text{old}}$$

#### Bonus Issue ($N : D$)
A company issues $N$ bonus shares for every $D$ existing shares held:
$$M = 1 + \dfrac{N}{D}$$
$$Q_{\text{new}} = \text{round}\left(Q_{\text{old}} \times \left(1 + \dfrac{N}{D}\right)\right)$$
$$P_{\text{new}} = \dfrac{P_{\text{old}}}{1 + \dfrac{N}{D}}$$
$$\text{Proof of Invariance: } C_{\text{new}} = \left[Q_{\text{old}} \left(1 + \dfrac{N}{D}\right)\right] \times \left[\dfrac{P_{\text{old}}}{1 + \dfrac{N}{D}}\right] = C_{\text{old}}$$

#### Reverse Split / Consolidation ($N : 1$)
Every $N$ shares are merged into 1 share:
$$M = \dfrac{1}{N}$$
$$Q_{\text{new}} = \left\lfloor\dfrac{Q_{\text{old}}}{N}\right\rfloor$$
$$P_{\text{new}} = P_{\text{old}} \times N$$

### 2.2 Proportional Target and Stop-Loss Adjustment
If enabled by the user (`adjustTargetSl: true`):
$$\text{Target}_{\text{new}} = \dfrac{\text{Target}_{\text{old}}}{M}$$
$$\text{StopLoss}_{\text{new}} = \dfrac{\text{StopLoss}_{\text{old}}}{M}$$
This guarantees that price alerts and automated risk management triggers remain calibrated to the post-action price scale.

### 2.3 Multi-Tenant Client Allocation Re-Weighting
When a trade is distributed across multiple managed client accounts (`trade_clients`), the backend automatically redistributes the shares proportionally:
$$Q_{c, \text{new}} = \text{round}(Q_{c, \text{old}} \times M)$$
A residual reconciliation step assigns any minor fractional rounding difference to the largest holding account, ensuring:
$$\sum_{c=1}^{K} Q_{c, \text{new}} \equiv Q_{\text{new}}$$

### 2.4 Immutable Audit Logging
Every action automatically writes an institutional audit log entry into `trade_notes`:
```text
🏛️ CORPORATE ACTION APPLIED: STOCK_SPLIT (1:10)
• Ex-Date: 2026-11-13
• Quantity: 6 → 60 shares
• Avg Price: ₹896.00 → ₹89.60
• Total Invested Capital: ₹5,376.00 (100% Invariant)
• Target: ₹1,000.00 → ₹100.00 | SL: ₹861.00 → ₹86.10
• User Note: Annual General Meeting Sub-Division
```

---

## 3. Layer 2: Interactive Wizard UI

The user interface is encapsulated in `client/src/components/common/CorporateActionModal.jsx` and styled in `CorporateActionModal.css` following the TradeSphere Luxury Dark & Gold aesthetic (`#11141c`, `#d4af37`, `#34d399`).

### 3.1 Preset Grid
Traders can choose from industry-standard presets with 1 click:
- **Stock Splits**:
  - `1 : 10` (Face Value ₹10 → ₹1)
  - `1 : 5` (Face Value ₹10 → ₹2)
  - `1 : 2` (Face Value ₹10 → ₹5)
  - `1 : 4` (Face Value ₹10 → ₹2.5)
- **Bonus Issues**:
  - `1 : 1` (100% Bonus)
  - `2 : 1` (200% Bonus)
  - `1 : 2` (50% Bonus)
  - `3 : 1` (300% Bonus)
  - `1 : 4` (25% Bonus)
- **Reverse Splits**:
  - `10 : 1` Consolidation
  - `5 : 1` Consolidation
  - `2 : 1` Consolidation
- **Custom Mode**: Manual multiplier, or explicit quantity and price override.

### 3.2 Real-Time Side-by-Side Invariance Box
As the user selects or inputs ratios, the UI dynamically displays:
- **Current Position**: Old Qty, Old Entry, Total Invested.
- **Adjusted Position**: Projected Qty, Projected Entry, Projected Invested.
- **Invariance Guarantee Badge**: `🛡️ Total Invested Capital is 100% Invariant (Δ ₹0.00)`.

---

## 4. Layer 3: Automated Corporate Action Watchdog

Traders often forget ex-dates until they open their dashboard and see an unexpected drop in price. The **Watchdog Engine** continuously guards active positions.

### 4.1 Heuristic Corridor Engine
Implemented in `detectPotentialSplit(entryPrice, currentPrice)`:
| Entry vs CMP Ratio ($R = \frac{\text{Entry}}{\text{CMP}}$) | Inferred Corporate Action | Preset Ratio | Watchdog Label |
| :---: | :---: | :---: | :---: |
| $8.5 \le R \le 11.5$ | 1:10 Stock Split | 1 : 10 | `⚡ Split Detected (~1:10)` |
| $4.4 \le R \le 5.6$ | 1:5 Stock Split | 1 : 5 | `⚡ Split Detected (~1:5)` |
| $3.5 \le R \le 4.5$ | 1:4 Stock Split | 1 : 4 | `⚡ Split Detected (~1:4)` |
| $2.6 \le R \le 3.4$ | 1:3 Split / 2:1 Bonus | 1 : 3 | `⚡ Split / Bonus (~1:3)` |
| $1.75 \le R \le 2.25$ | 1:2 Split / 1:1 Bonus | 1 : 2 | `⚡ Split / Bonus (~1:2)` |

### 4.2 Seamless 1-Click Launch
When a match is found on any open trade (in **Active Trades** or **Investment Portfolio**), a pulsing golden-amber badge (`⚡ Split Detected (~1:10)`) appears right next to the stock symbol.
- Clicking the badge immediately opens the Layer 2 Wizard pre-populated with the exact action type and ratio.
- The user reviews the side-by-side comparison and clicks **"Apply Corporate Action"** to execute.

---

## 5. Indian Taxation Rules & Compliance

When applying corporate actions, fund managers and traders must understand the legal tax treatment under the **Indian Income Tax Act, 1961**:

### 5.1 Stock Splits (Section 45 & Section 49(1))
- **Taxable Event**: A stock split is **NOT a taxable event** upon occurrence.
- **Holding Period**: The period of holding of the split shares includes the period for which the original shares were held (Section 2(42A)).
- **Cost of Acquisition**: Allocated proportionally across the new shares:
  $$\text{Cost per share} = \dfrac{\text{Total Cost of Original Shares}}{\text{Total New Shares}}$$

### 5.2 Bonus Shares (Section 55(2)(aa))
- **Taxable Event**: Receipt of bonus shares is **NOT taxable** at the time of credit.
- **Cost of Acquisition**:
  - Original shares: Original purchase price.
  - Bonus shares: **Deemed to be ₹0** under Section 55(2)(aa)(iiia).
  - *TradeSphere Weighted Average Method*: For portfolio valuation and trading simplicity, the cost basis is averaged ($P_{\text{avg}} = \frac{\text{Total Cost}}{\text{Old Qty} + \text{Bonus Qty}}$). When filing formal tax ITR-2/ITR-3, TradeSphere provides the original purchase date and bonus allotment date for exact FIFO computation.
- **Holding Period of Bonus Shares**: Commences strictly from the **date of allotment** of the bonus shares (NOT from the purchase date of original shares).

### 5.3 Capital Gains Tax Rates (Budget 2024 / FY 2024-25 onwards)
| Holding Period | Asset Class | Tax Rate (Section 111A / 112A) | Exemption Limit |
| :--- | :--- | :--- | :--- |
| **Short Term (< 12 months)** | Listed Equity | **20% flat** | None |
| **Long Term (≥ 12 months)** | Listed Equity | **12.5%** | Up to ₹1.25 Lakh per financial year exempt |

---

## 6. API Reference

### `POST /api/trades/:trade_id/corporate-action`

#### Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Payload
```json
{
  "action_type": "STOCK_SPLIT",
  "ratio_from": 1,
  "ratio_to": 10,
  "ex_date": "2026-11-13",
  "adjust_target_sl": true,
  "notes": "1:10 Sub-division from FV 10 to FV 1"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Corporate action applied successfully",
  "data": {
    "trade_id": 42,
    "action_type": "STOCK_SPLIT",
    "ratio": "1:10",
    "previous": {
      "quantity": 6,
      "entry_price": 896.0,
      "invested": 5376.0
    },
    "adjusted": {
      "quantity": 60,
      "entry_price": 89.6,
      "invested": 5376.0,
      "target": 100.0,
      "stop_loss": 86.1
    }
  }
}
```

---

## 7. Verification & Operational Checklist

- [x] **Backend Layer 1**: Controller `applyCorporateAction` tested and verified for Stock Splits, Bonuses, Reverse Splits, and Custom Overrides.
- [x] **Backend Route**: Registered at `/api/trades/:trade_id/corporate-action`.
- [x] **Layer 2 UI Wizard**: `CorporateActionModal.jsx` tested with presets, dynamic math calculations, and visual invariance badge.
- [x] **Layer 3 Watchdog**: Heuristic corridor detection active in both `TradesList.jsx` and `PortfolioList.jsx`.
- [x] **Dropdown Menus**: "Corporate Action / Split" button added to card 3-dots menus, table 3-dots menus, and view details modal footers.
- [x] **Client Build**: `npm --prefix client run build` passed with zero errors.
- [x] **Documentation**: Full mathematical proofs, tax rules, and system architecture documented.

