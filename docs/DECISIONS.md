# Architecture & Technical Decisions (ADR)

## DECISION-001: Strict Server-Side Multi-Tenant Isolation
- **Context:** The system handles sensitive commercial vendor data for wholesale electronics suppliers and retail client stores. Retail stores must never inspect or extrapolate peer store metrics.
- **Decision:** All client queries derive `store_client_id` directly from verified token claims (`request.state.user["store_client_id"]`), completely disregarding any client-supplied store query/body parameters. Attempts by clients to query unauthorized endpoints or paths receive immediate `403 Forbidden`. Supplier requests require `role == "supplier"`, allowing cross-store aggregations.

## DECISION-002: Dual-Mode Auth (Firebase Admin & HS256 Token Provider)
- **Context:** Section 14 mandates a robust fallback when external Firebase Cloud credentials or emulator ports are unconfigured or offline, without breaking JWT verification or token signatures.
- **Decision:** Implemented a unified cryptographic auth service: if `FIREBASE_CREDENTIALS_PATH` is provided and valid, it validates via `firebase_admin.auth.verify_id_token`. If absent or in local/test mode, it generates and verifies standard HS256 signed JWTs with identical custom claims (`uid`, `email`, `role`, `store_client_id`, `display_name`). Both modes support identical API contracts.

## DECISION-003: Storage Engine with In-Memory / Mongomock Fallback
- **Context:** MongoDB Atlas connection might be unreachable or absent in local offline builds or during automated test runs.
- **Decision:** The database service dynamically attempts connection to `MONGODB_URI`. If connection fails or is not supplied, it seamlessly initializes an in-process MongoDB engine via `mongomock` that supports standard CRUD, indices, and aggregation pipelines, alongside JSON backup snapshots. The active engine is surfaced via `/api/v1/health` and displayed as a clear badge in the frontend.

## DECISION-004: ML Time-Series Split vs. Random K-Fold
- **Context:** Demand and transaction records possess strong temporal dependencies (seasonality, holiday spikes, category trends).
- **Decision:** Prohibited random train-test splitting to prevent future data leakage. Implemented a chronological cutoff split (last 60 days as holdout validation) and compared Ridge Baseline vs. Random Forest vs. Gradient Boosting. Models are scored on RMSE, MAE, R², and MAPE.

## DECISION-005: 5 Selected High-Value Extension Modules
- **Decision:** Implemented:
  1. Anomaly Detection (Isolation Forest on transactions, return rates, and shrinkage).
  2. Supplier Scorecard (OTD, defect rates, fill rate, radar visualization).
  3. Smart Reorder & Purchase Order Workflow (Direct conversion from ML alert to PO + PDF generation).
  4. ABC/XYZ Inventory Classification Matrix (Pareto 80/15/5 revenue vs. demand predictability CV).
  5. Real-Time Live Notification Center (Server-Sent Events streaming to notification bell).

## DECISION-006: Dual-Mode Power BI Integration
- **Context:** Embedded Power BI requires active Azure workspace credentials and embed tokens.
- **Decision:** Implemented Power BI component using `powerbi-client-react` when valid tokens exist. When tokens are absent, automatically switches to "Native analytics mode" with full interactive D3/Recharts dashboards, clearly badged in the UI.
