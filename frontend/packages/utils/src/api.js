import Constants from 'expo-constants';
import { getToken } from './storage';

const AUTH_SERVICE_URL =
  Constants.expoConfig?.extra?.authServiceUrl ?? 'http://x.x.x.x:8083';
const WALLET_SERVICE_URL =
  Constants.expoConfig?.extra?.walletServiceUrl ?? 'http://x.x.x.x:8082';

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    let token = null;
    try {
      token = await getToken();
    } catch (err) {
      console.error('Error retrieving token in ApiClient:', err);
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Please check your internet connection');
      }
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data,
      ...options,
    });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data,
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

export const authApi = {
  client: new ApiClient(AUTH_SERVICE_URL),

  health() {
    return this.client.get('/auth/health');
  },

  register(data) {
    return this.client.post('/auth/register', data);
  },

  login(data) {
    return this.client.post('/auth/login', data);
  },

  verifyOtp(data) {
    return this.client.post('/auth/verify-otp', data);
  },

  resendOtp(data) {
    return this.client.post('/auth/resend-otp', data);
  },

  updateProfile(data) {
    return this.client.put('/auth/profile', data);
  },

  forgotPassword(email) {
    return this.client.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
  },

  resetPassword({ email, otp, newPassword }) {
    return this.client.post(
      `/auth/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(
        otp
      )}&newPassword=${encodeURIComponent(newPassword)}`
    );
  },

  logout() {
    return this.client.post('/auth/logout');
  },
};

export const walletApi = {
  client: new ApiClient(WALLET_SERVICE_URL),

  health() {
    return this.client.get('/wallet/health');
  },

  getBalances() {
    return this.client.get('/wallet/balance');
  },

  deposit(data) {
    return this.client.post('/wallet/deposit', data);
  },

  withdraw(data) {
    return this.client.post('/wallet/withdraw', data);
  },

  trade(data) {
    return this.client.post('/wallet/trade', data);
  },

  getTransactionHistory(page = 0, size = 20) {
    return this.client.get(`/wallet/history?page=${page}&size=${size}`);
  },

  getPortfolioSummary() {
    return this.client.get('/wallet/portfolio');
  },

  getTradingVolume() {
    return this.client.get('/wallet/trading-volume');
  },

  getProfitLoss() {
    return this.client.get('/wallet/profit-loss');
  },
};

export const externalApi = {
  async request(url, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Please check your internet connection');
      }
      throw error;
    }
  },
};

export const handleApiError = (error) => {
  console.error('API Error:', error);

  if (error.message.includes('Network error')) {
    return {
      title: 'Connection Error',
      message: 'Please check your internet connection and try again.',
    };
  }

  if (error.message.includes('401')) {
    return {
      title: 'Authentication Error',
      message: 'Please log in again to continue.',
    };
  }

  if (error.message.includes('403')) {
    return {
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.',
    };
  }

  if (error.message.includes('404')) {
    return {
      title: 'Not Found',
      message: 'The requested resource was not found.',
    };
  }

  if (error.message.includes('500')) {
    return {
      title: 'Server Error',
      message: 'Internal server error. Please try again later.',
    };
  }

  return {
    title: 'Error',
    message: error.message || 'An unexpected error occurred.',
  };
};
