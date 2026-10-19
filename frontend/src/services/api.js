/**
 * Unified API Client for FastAPI Backend
 * Handles token injection, request tracing, and structured error responses.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

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

  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, { ...options, headers });

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

      if (!window.location.pathname.includes('/login') && endpoint !== '/auth/login') {
        window.location.href = '/login?expired=true';
      }
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }

    // Handle binary responses (PDF, Excel, CSV)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats') || contentType.includes('text/csv')) {
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }
      return await response.blob();
    }

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Error(`Server returned non-JSON response (Status ${response.status}): ${text.slice(0, 100)}`);
    }

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || data?.detail?.message || 'An unexpected error occurred';
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
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
