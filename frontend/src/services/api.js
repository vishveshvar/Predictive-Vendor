/**
 * Unified API Client for FastAPI Backend
 * Handles token injection, request tracing, and structured error responses.
 */

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

async function request(endpoint, options = {}) {
  const storedToken = localStorage.getItem('token');
  const headers = {
    'Accept': 'application/json',
    ...options.headers,
  };

  if (storedToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${storedToken}`;
  }

  if (options.body && !(options.body instanceof FormData) && !(options.body instanceof Blob)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (netErr) {
    console.error(`[API Network Error] ${cleanEndpoint}:`, netErr);
    const err = new Error('Network error: Unable to connect to backend server. Please verify network connectivity and backend server status.');
    err.isNetworkError = true;
    err.endpoint = cleanEndpoint;
    throw err;
  }

  try {
    if (response.status === 401) {
      // Clear token and notify
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      let errorMsg = 'Authentication session expired';
      try {
        const text = await response.text();
        const data = text ? JSON.parse(text) : {};
        errorMsg = data?.detail?.message || data?.detail || data?.message || errorMsg;
      } catch (_) {}

      if (!window.location.pathname.includes('/login') && cleanEndpoint !== '/auth/login') {
        window.location.href = '/login?expired=true';
      }
      const err = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      err.status = 401;
      throw err;
    }

    // Handle binary responses (PDF, Excel, CSV)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats') || contentType.includes('text/csv')) {
      if (!response.ok) {
        const err = new Error(`Export failed with status: ${response.status}`);
        err.status = response.status;
        throw err;
      }
      return await response.blob();
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Handle non-JSON responses (HTML 404/405/502 error pages or SPA rewrites)
        const isHtml = contentType.includes('text/html') || text.trim().startsWith('<');
        let errorMsg;
        if (response.status === 405) {
          errorMsg = `Server error (HTTP 405 Method Not Allowed): Endpoint '${cleanEndpoint}' was rejected. If hosted on Vercel, ensure VITE_API_BASE_URL points to the deployed backend.`;
        } else if (response.status === 404) {
          errorMsg = `Server error (HTTP 404 Not Found): Endpoint '${cleanEndpoint}' was not found.`;
        } else if (response.status >= 500) {
          errorMsg = `Server error (HTTP ${response.status}): The backend service is temporarily unavailable.`;
        } else {
          errorMsg = `Server returned non-JSON response (Status ${response.status}): ${isHtml ? 'HTML page returned instead of API JSON' : text.slice(0, 100)}`;
        }
        const err = new Error(errorMsg);
        err.status = response.status;
        err.statusText = response.statusText;
        err.isHtml = isHtml;
        throw err;
      }
    }

    if (!response.ok) {
      let errorMsg = data?.detail?.message || data?.detail || data?.message;
      if (!errorMsg) {
        if (response.status === 405) {
          errorMsg = `HTTP 405 Method Not Allowed: Endpoint '${cleanEndpoint}' does not accept this method. Check API deployment and routing.`;
        } else if (response.status === 404) {
          errorMsg = `HTTP 404 Not Found: Endpoint '${cleanEndpoint}' does not exist on this server.`;
        } else {
          errorMsg = `Request failed with status ${response.status} (${response.statusText || 'Error'})`;
        }
      }
      const err = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      err.status = response.status;
      err.statusText = response.statusText;
      err.code = data?.code;
      throw err;
    }

    return data || {};
  } catch (err) {
    console.error(`[API Error] ${cleanEndpoint}:`, err);
    throw err;
  }
}

export const api = {
  // System Health
  getHealth: () => request('/health'),

  // Auth
  login: (email, password = null, firebaseToken = null) => {
    const headers = {};
    if (firebaseToken) {
      headers['Authorization'] = `Bearer ${firebaseToken}`;
    }
    return request('/auth/login', {
      method: 'POST',
      headers,
      body: { email, password, firebase_id_token: firebaseToken },
    });
  },
  register: (payload) => {
    const headers = {};
    if (payload.firebase_id_token) {
      headers['Authorization'] = `Bearer ${payload.firebase_id_token}`;
    }
    return request('/auth/register', {
      method: 'POST',
      headers,
      body: payload,
    });
  },
  getMe: () => request('/auth/me'),

  // Analytics & Velocity (MongoDB Aggregation Pipeline)
  getVelocity: (days = 30) => request(`/analytics/velocity?days=${days}`),

  // Client Portal
  getClientProfitability: (days = 30) => request(`/client/profitability?days=${days}`),
  getClientInventory: () => request('/client/inventory'),
  getClientOrders: () => request('/client/orders'),

  // Supplier Portal
  getSupplierSalesSummary: () => request('/supplier/sales-summary'),
  getSupplierDemandAggregate: () => request('/supplier/demand-aggregate'),
  getSupplierClients: () => request('/supplier/clients'),
  getInventoryHeatmap: () => request('/supplier/inventory-heatmap'),

  // ML Predictions & What-If
  predictRestock: (payload) =>
    request('/predictions/predict-restock', {
      method: 'POST',
      body: payload,
    }),
  getModelMetrics: () => request('/predictions/metrics'),
  triggerRetraining: () => request('/ml/retrain', { method: 'POST' }),

  // Orders & QR
  createOrder: (payload) =>
    request('/orders', {
      method: 'POST',
      body: payload,
    }),
  dispatchOrder: (payload) =>
    request('/orders/dispatch', {
      method: 'POST',
      body: payload,
    }),
  listOrders: () => request('/orders'),
  getOrder: (id) => request(`/orders/${id}`),
  getOrderQR: (id) => request(`/orders/${id}/qr`),
  updateOrderStatus: (id, payload) =>
    request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: payload,
    }),
  trackOrderPublic: (hash) => request(`/orders/track/${hash}`),

  // RMA Grievances
  createRMATicket: (payload) =>
    request('/rma/tickets', {
      method: 'POST',
      body: payload,
    }),
  listRMATickets: () => request('/rma/tickets'),
  getRMATicket: (id) => request(`/rma/tickets/${id}`),
  updateRMATicketStatus: (id, payload) =>
    request(`/rma/tickets/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
  getRMAAnalytics: () => request('/rma/metrics'),

  // Reports Export
  exportReport: async (format = 'pdf', dateFrom = null, dateTo = null, storeId = null) => {
    let query = `?format=${format}`;
    if (dateFrom) query += `&date_from=${dateFrom}`;
    if (dateTo) query += `&date_to=${dateTo}`;
    if (storeId) query += `&store_id=${storeId}`;
    return request(`/reports/export${query}`);
  },
  getPowerBIToken: () => request('/reports/powerbi-token'),

  // Conversational Analytics Chat
  getSuggestedChatQueries: () => request('/chat/suggested'),
  executeChatQuery: (queryId) => request(`/chat/predefined?query_id=${queryId}`),

  // Notifications
  listNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Extension Modules
  getAnomalies: () => request('/extensions/anomalies'),
  getSupplierScorecard: () => request('/extensions/supplier-scorecard'),
  createPurchaseOrder: (payload) =>
    request('/extensions/purchase-orders', {
      method: 'POST',
      body: payload,
    }),
  listPurchaseOrders: () => request('/extensions/purchase-orders'),
  downloadPurchaseOrderPDF: (id) => request(`/extensions/purchase-orders/${id}/pdf`),
  getABCXYZMatrix: () => request('/extensions/abc-xyz-matrix'),
};
