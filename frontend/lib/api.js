const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088';

class ApiClient {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);
      
      if (response.status === 401) {
        this.clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          console.error('API Error:', errorData);
          
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData)) {
            // FastAPI validation errors
            errorMessage = errorData.map(e => {
              if (typeof e === 'string') return e;
              if (e.loc && e.msg) return `${e.loc.join('.')}: ${e.msg}`;
              return JSON.stringify(e);
            }).join(', ');
          } else {
            errorMessage = String(errorData);
          }
        } catch (parseError) {
          // If JSON parsing fails, use response text or status
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Auth
  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    return data;
  }

  logout() {
    this.clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // Organizations
  async getOrganizations() {
    return this.request('/organizations');
  }

  async getOrganization(id) {
    return this.request(`/organizations/${id}`);
  }

  async createOrganization(data) {
    return this.request('/organizations', {
      method: 'POST',
      body: data,
    });
  }

  async updateOrganization(id, data) {
    return this.request(`/organizations/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteOrganization(id) {
    return this.request(`/organizations/${id}`, {
      method: 'DELETE',
    });
  }

  // Sites
  async getSites(params = {}) {
    console.log('DEBUG: api.getSites() called with params:', params, 'type:', typeof params);
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    console.log('DEBUG: api.getSites() constructed URL:', `/sites${queryString}`);
    return this.request(`/sites${queryString}`);
  }

  async getSite(id) {
    return this.request(`/sites/${id}`);
  }

  async createSite(data) {
    return this.request('/sites', {
      method: 'POST',
      body: data,
    });
  }

  async updateSite(id, data) {
    return this.request(`/sites/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteSite(id) {
    return this.request(`/sites/${id}`, {
      method: 'DELETE',
    });
  }

  // Assets - NEW structure with asset_category and asset_type
  async getAssets(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/assets${queryString}`);
  }

  async getAsset(id) {
    return this.request(`/assets/${id}`);
  }

  async createAsset(data) {
    return this.request('/assets', {
      method: 'POST',
      body: data,
    });
  }

  async updateAsset(id, data) {
    return this.request(`/assets/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteAsset(id) {
    return this.request(`/assets/${id}`, {
      method: 'DELETE',
    });
  }

  // Networks - NEW separate endpoint
  async getNetworks(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/networks${queryString}`);
  }

  async getNetwork(id) {
    return this.request(`/networks/${id}`);
  }

  async createNetwork(data) {
    return this.request('/networks', {
      method: 'POST',
      body: data,
    });
  }

  async updateNetwork(id, data) {
    return this.request(`/networks/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteNetwork(id) {
    return this.request(`/networks/${id}`, {
      method: 'DELETE',
    });
  }

  // Software - NEW catalog endpoint
  async getSoftware(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/software?${query}` : '/software';
    return this.request(endpoint);
  }

  async getSoftwareItem(id) {
    return this.request(`/software/${id}`);
  }

  async createSoftware(data) {
    return this.request('/software', {
      method: 'POST',
      body: data,
    });
  }

  async updateSoftware(id, data) {
    return this.request(`/software/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteSoftware(id) {
    return this.request(`/software/${id}`, {
      method: 'DELETE',
    });
  }

  async getSoftwareDetails(id) {
    return this.request(`/software/${id}/details`);
  }

  async attachAssetToSoftware(softwareId, data) {
    return this.request(`/software/${softwareId}/assets`, {
      method: 'POST',
      body: data,
    });
  }

  async detachAssetFromSoftware(softwareId, assetId) {
    return this.request(`/software/${softwareId}/assets/${assetId}`, {
      method: 'DELETE',
    });
  }

  async attachPersonToSoftware(softwareId, data) {
    return this.request(`/software/${softwareId}/people`, {
      method: 'POST',
      body: data,
    });
  }

  async detachPersonFromSoftware(softwareId, personId) {
    return this.request(`/software/${softwareId}/people/${personId}`, {
      method: 'DELETE',
    });
  }

  // People - NEW client employees endpoint
  async getPeople(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/people${queryString}`);
  }

  async getPerson(id) {
    return this.request(`/people/${id}`);
  }

  async createPerson(data) {
    return this.request('/people', {
      method: 'POST',
      body: data,
    });
  }

  async updatePerson(id, data) {
    return this.request(`/people/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deletePerson(id) {
    return this.request(`/people/${id}`, {
      method: 'DELETE',
    });
  }

  // Inventory - NEW spare hardware endpoint
  async getInventory(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/inventory${queryString}`);
  }

  async getInventoryItem(id) {
    return this.request(`/inventory/${id}`);
  }

  async createInventory(data) {
    return this.request('/inventory', {
      method: 'POST',
      body: data,
    });
  }

  async updateInventory(id, data) {
    return this.request(`/inventory/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteInventory(id) {
    return this.request(`/inventory/${id}`, {
      method: 'DELETE',
    });
  }

  // Services - Network services running on assets
  async getServices(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/services${queryString}`);
  }

  async getService(id) {
    return this.request(`/services/${id}`);
  }

  async createService(data) {
    return this.request('/services', {
      method: 'POST',
      body: data,
    });
  }

  async updateService(id, data) {
    return this.request(`/services/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteService(id) {
    return this.request(`/services/${id}`, {
      method: 'DELETE',
    });
  }

  // Credentials - UPDATED supports asset_id OR service_id
  async getCredentials(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/credentials${queryString}`);
  }

  async getCredential(id) {
    return this.request(`/credentials/${id}`);
  }

  async createCredential(data) {
    return this.request('/credentials', {
      method: 'POST',
      body: data,
    });
  }

  async updateCredential(id, data) {
    return this.request(`/credentials/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteCredential(id) {
    return this.request(`/credentials/${id}`, {
      method: 'DELETE',
    });
  }

  // File Attachments
  async getFiles(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/files${queryString}`);
  }

  async uploadFile(file, metadata) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);
    
    // Build query parameters from metadata (org_id, site_id, asset_id, description)
    const queryParams = new URLSearchParams();
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'file') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const url = `${API_URL}/files/upload${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage;
      try {
        const error = await response.json();
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.detail) {
          errorMessage = error.detail;
        } else if (Array.isArray(error)) {
          errorMessage = error.map(e => {
            if (typeof e === 'string') return e;
            if (e.loc && e.msg) return `${e.loc.join('.')}: ${e.msg}`;
            return JSON.stringify(e);
          }).join(', ');
        } else {
          errorMessage = JSON.stringify(error);
        }
      } catch (e) {
        errorMessage = 'Upload failed';
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  async deleteFile(id) {
    return this.request(`/files/${id}`, {
      method: 'DELETE',
    });
  }

  async downloadFile(fileId, filename) {
    const token = this.getToken();
    const response = await fetch(`${API_URL}/files/${fileId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    // Create a blob from the response
    const blob = await response.blob();
    
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async importNmapScan(file, params) {
    const token = this.getToken();
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';

    const formData = new FormData();
    formData.append('scan', file);

    const response = await fetch(`${API_URL}/imports/nmap${queryString}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage;
      try {
        const error = await response.json();
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.detail) {
          errorMessage = error.detail;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } catch (e) {
        const text = await response.text();
        errorMessage = text || 'Import failed';
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  // Documentation
  async getDocumentation(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/documentation${queryString}`);
  }

  async getDocumentationItem(id) {
    return this.request(`/documentation/${id}`);
  }

  async createDocumentation(data) {
    return this.request('/documentation', {
      method: 'POST',
      body: data,
    });
  }

  async updateDocumentation(id, data) {
    return this.request(`/documentation/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteDocumentation(id) {
    return this.request(`/documentation/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard Stats
  async getSiteStats(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    });
    // Add timestamp to prevent caching
    query.append('_t', Date.now());
    return this.request(`/stats?${query.toString()}`);
  }

  // Health
  async getHealth() {
    return this.request('/health');

  }
  // Generic GET method with optional responseType for blob downloads
  async get(url, params = {}, options = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
    const token = this.getToken();
    const headers = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      method: 'GET',
      headers,
      ...options,
    };
    
    // Don't set Content-Type for blob responses
    if (options.responseType !== 'blob') {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(`${API_URL}${url}${queryString}`, config);
    
    if (response.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }
    
    // Return blob if requested
    if (options.responseType === 'blob') {
      return response.blob();
    }
    
    return response.json();
  }

  // Generic POST method
  async post(url, data = {}, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options,
    };
    
    const response = await fetch(`${API_URL}${url}`, config);
    
    if (response.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }
    
    return response.json();
  }

  // Generic PUT method
  async put(url, data = {}, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...options,
    };
    
    const response = await fetch(`${API_URL}${url}`, config);
    
    if (response.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }
    
    return response.json();
  }

  // Generic DELETE method
  async delete(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      method: 'DELETE',
      headers,
      ...options,
    };
    
    const response = await fetch(`${API_URL}${url}`, config);
    
    if (response.status === 401) {
      this.clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }
    
    return response.json();
  }
}

export const api = new ApiClient();
export { API_URL };
