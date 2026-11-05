const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let res;
  try {
    res = await fetch(url, config);
  } catch (err) {
    throw new ApiError('Network connection error. Please check your connection.', 'NETWORK_ERROR', 0);
  }

  // Handle CSV download
  if (options.responseType === 'blob') {
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new ApiError(errorData?.error?.message || 'Download failed', errorData?.error?.code, res.status);
    }
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
    const errorCode = data?.error?.code || 'API_ERROR';
    const err = new ApiError(errorMsg, errorCode, res.status, data?.error?.details);
    err.data = data?.error;
    throw err;
  }

  return data;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
};