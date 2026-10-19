# Power BI Embedded Integration Guide

## 1. Overview
The platform supports dual-mode analytics:
1. **Direct Power BI Embedded:** Embeds Power BI reports inside the React application using `@powerbi-client-react` when Azure AD and Power BI workspace credentials are configured.
2. **Native Analytics Mode (Fallback):** If Power BI credentials are not supplied, the platform automatically renders rich, responsive, interactive D3.js and Recharts dashboards, visibly labeled `"Native analytics mode"`.

## 2. Power BI Service Configuration

### Step A: Azure Active Directory App Registration
1. Register an application in Microsoft Entra ID (Azure AD).
2. Create a client secret (`POWERBI_CLIENT_SECRET`) and record `POWERBI_CLIENT_ID` and `POWERBI_TENANT_ID`.
3. Under API Permissions, grant Power BI Service: `Report.Read.All` and `Dataset.Read.All`.

### Step B: Power BI Workspace & Dataset Setup
1. Create a Power BI Workspace (`POWERBI_WORKSPACE_ID`).
2. Upload the report template (`electronics_procurement.pbix`).
3. Connect the dataset to the MongoDB Atlas or SQL Warehouse connection string.

### Step C: Row-Level Security (RLS) Configuration
To maintain multi-tenant isolation in Power BI:
1. Open Power BI Desktop -> Modeling -> Manage Roles.
2. Create role `RetailClientRole`:
   ```dax
   [store_client_id] = USERNAME()
   ```
3. When requesting an embed token via FastAPI (`GET /api/v1/reports/powerbi-token`), pass:
   ```json
   {
     "accessLevel": "View",
     "identities": [
       {
         "username": current_user.store_client_id,
         "roles": ["RetailClientRole"],
         "datasets": [DATASET_ID]
       }
     ]
   }
   ```
4. For suppliers, omit the RLS identity or assign the `SupplierGlobalRole` to permit cross-store aggregation.

## 3. Environment Configuration
Populate these keys in `.env` to enable Power BI mode:
```env
POWERBI_CLIENT_ID=your-azure-client-id
POWERBI_CLIENT_SECRET=your-azure-client-secret
POWERBI_TENANT_ID=your-azure-tenant-id
POWERBI_WORKSPACE_ID=your-workspace-guid
POWERBI_REPORT_ID=your-report-guid
```

If any of these keys remain blank or default, the UI activates **Native Analytics Mode** with full interactivity, D3 visual elements, and zero error states.
