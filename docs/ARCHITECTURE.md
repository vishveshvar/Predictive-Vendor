# System Architecture: ML-Powered Predictive Vendor & Procurement Platform

## 1. High-Level Architecture Overview

The platform connects wholesale electronics suppliers and retail store owners through a secure, multi-tenant architecture with strict role-based access control (RBAC), machine-learning-driven demand and stockout predictions, real-time supply chain tracking, grievance handling, and conversational business intelligence.

```mermaid
flowchart TB
    subgraph Clients["Presentation Layer (React 18 + Vite)"]
        Landing["Animated Landing & Network Visualizer"]
        AuthView["Role-Aware JWT Auth Screen"]
        subgraph ClientPortal["Client Portal (Role: client)"]
            CP_Dash["Dashboard & KPIs"]
            CP_Analytics["Sales & Profitability Explorer"]
            CP_Inventory["Inventory Health Heatmap"]
            CP_Predictions["Restock Predictor & What-If"]
            CP_Orders["Orders & QR Scanner"]
            CP_RMA["RMA Submission & Tracking"]
            CP_Chat["Conversational BI Agent"]
            CP_Reports["PDF / CSV Export Hub"]
        end
        subgraph SupplierPortal["Supplier Portal (Role: supplier)"]
            SP_Command["Supplier Command Center"]
            SP_Demand["Aggregated Regional Demand"]
            SP_Clients["Client Management"]
            SP_OrderGen["Order Creation & QR Generator"]
            SP_Kanban["RMA Kanban Drag-and-Drop"]
            SP_Studio["ML Model Studio & Retraining"]
            SP_Audit["Audit & Security Logs"]
            SP_Ext["Scorecard, Anomalies, ABC/XYZ, Smart PO"]
        end
    end

    subgraph Gateway["API Gateway & Core Security (FastAPI)"]
        CORS["CORS & Security Headers Middleware"]
        RateLimiter["SlowAPI Rate Limiter"]
        AuthRBAC["Firebase Auth / JWT Middleware & RBAC"]
        AuditLogger["Audit Logging Interceptor"]
        ErrorHandler["Structured Error Handler"]
    end

    subgraph Services["Application Services"]
        DBService["Database Abstraction (MongoDB / Fallback)"]
        MLService["Predictive Restocking & Simulation Engine"]
        QRService["QR Code & HMAC-SHA256 Verifier"]
        RMAService["RMA Workflow & History Engine"]
        ReportService["ReportLab PDF & OpenPyXL Excel Generator"]
        EmailService["Alert Dispatcher (SMTP / Terminal Outbox)"]
        ChatService["Predefined Aggregation Pipeline Engine"]
        ExtensionService["Anomaly, Scorecard, ABC/XYZ, Smart PO"]
        SchedulerService["APScheduler Automated Background Jobs"]
    end

    subgraph ML_Subsystem["Machine Learning Engine"]
        DatasetGen["generate_dataset.py (40k+ Synthetic Electronics Records)"]
        Trainer["train_model.py (Time-Series Split Tournament)"]
        ModelArtifacts["model.pkl & metrics.json"]
        IsolationForest["Isolation Forest Anomaly Detector"]
    end

    subgraph DataStorage["Data & Logging Tier"]
        MongoDB[("MongoDB Atlas Collections")]
        FallbackDB[("In-Memory Native DB Fallback")]
        EmailLog[("logs/email_outbox.log")]
        AuditStore[("audit_logs collection")]
    end

    Landing --> AuthView
    AuthView -->|Bearer JWT| Gateway
    ClientPortal -->|Tenant Scoped Requests| Gateway
    SupplierPortal -->|Cross-Tenant Aggregation| Gateway

    Gateway --> CORS --> RateLimiter --> AuthRBAC --> AuditLogger --> ErrorHandler
    AuthRBAC --> Services

    Services --> DBService
    Services --> MLService
    Services --> QRService
    Services --> RMAService
    Services --> ReportService
    Services --> EmailService
    Services --> ChatService
    Services --> ExtensionService
    Services --> SchedulerService

    MLService --> ModelArtifacts
    Trainer --> ModelArtifacts
    DatasetGen --> Trainer
    ExtensionService --> IsolationForest

    DBService --> MongoDB
    DBService -.->|Fallback if Atlas Unavailable| FallbackDB
    EmailService --> EmailLog
    AuditLogger --> AuditStore
```

---

## 2. Multi-Tenant Security & Tenant Isolation

Tenant isolation is guaranteed by server-side claims enforcement:
1. Every authenticated request carries a signed JWT token containing custom claims:
   - `role`: either `client` or `supplier`
   - `store_client_id`: identifying the specific retail establishment (for `client` role)
2. In client routes (`/api/v1/client/*`), the query filter **always** binds `{"store_client_id": current_user.store_client_id}` extracted directly from the verified token payload.
3. Path or query parameters attempting to specify another store's ID are ignored or rejected with HTTP 403 Forbidden.
4. Supplier routes (`/api/v1/supplier/*`) require `role == 'supplier'`, granting authorized cross-store aggregation.

---

## 3. Data Pipeline & Machine Learning Architecture

```mermaid
sequenceDiagram
    autonumber
    participant UI as React Client / What-If Slider
    participant API as FastAPI REST Gateway
    participant Cache as Feature Aggregator
    participant Engine as ML Restock Pipeline
    participant DB as MongoDB Collections

    UI->>API: POST /api/v1/predictions/predict-restock (sku, lead_time_mod, price_mod)
    API->>DB: Fetch historical sales, current stock, product metadata
    DB-->>API: Historical transactions (24mo) & inventory
    API->>Cache: Compute rolling lag features (7, 14, 28d), velocity, seasonality
    Cache-->>Engine: Feature vector (day_of_week, month, lags, price, lead_time)
    Engine->>Engine: Predict demand for 7d, 14d, 30d windows
    Engine->>Engine: Compute days_to_stockout = stock / daily_velocity
    Engine->>Engine: Calculate safety_stock = Z * sigma_demand * sqrt(lead_time)
    Engine->>Engine: recommended_qty = forecast - current_stock - incoming + safety_stock
    Engine-->>API: Result payload (forecast, days_to_stockout, risk_level, recommended_qty)
    API-->>UI: Live response with confidence interval and risk gauge
```

---

## 4. Hardware and Supply Chain Verification (QR Code)

1. Orders generated by wholesalers produce a unique deterministic tracking hash:
   $$\text{hash} = \text{HMAC-SHA256}(\text{order\_id} + \text{store\_id} + \text{timestamp}, \text{SECRET\_KEY})[0:16]$$
2. QR codes encode public verification URLs (`/track/{hash}`).
3. Public tracking endpoint reveals only shipping milestones, carrier status, and timestamps. Sensitive financial, customer, or inventory data is stripped completely from unauthenticated responses.

---

## 5. Extensions Architecture

- **Anomaly Detection:** Scikit-learn Isolation Forest trained on transaction unit volume, return frequency, and gross margin variance to detect outliers, shrinkage, or supplier defects.
- **Supplier Scorecard:** Real-time multi-metric aggregation (On-Time Delivery, RMA Defect Ratio, Lead Time Deviation, Fill Rate) rendered as an interactive D3 / Recharts Radar graph.
- **Smart PO Workflow:** Transforms high-risk stockout predictions directly into a draft Purchase Order, provides approval lifecycle, and produces ReportLab-generated PO documents.
- **ABC/XYZ Matrix:** Classifies inventory using revenue contribution (Pareto 80/15/5) and demand variance coefficient of variation ($CV = \sigma / \mu$).
- **Live Notifications:** Server-Sent Events (SSE) channel pushing instantaneous inventory warnings, order transitions, and ticket updates to the top-bar notification bell.
