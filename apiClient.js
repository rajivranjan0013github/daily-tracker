const API_BASE_URL = '/api';

async function handleResponse(res) {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Projects
  async getProjects() {
    const res = await fetch(`${API_BASE_URL}/projects`);
    return handleResponse(res);
  },
  async addProject(name) {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleResponse(res);
  },
  async deleteProject(id) {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete project: ${res.status}`);
  },

  // Handlers
  async getHandlers() {
    const res = await fetch(`${API_BASE_URL}/handlers`);
    return handleResponse(res);
  },
  async addHandler(name, handleId) {
    const res = await fetch(`${API_BASE_URL}/handlers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, handleId }),
    });
    return handleResponse(res);
  },
  async deleteHandler(id) {
    const res = await fetch(`${API_BASE_URL}/handlers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete handler: ${res.status}`);
  },

  // Accounts
  async getAccounts() {
    const res = await fetch(`${API_BASE_URL}/accounts`);
    return handleResponse(res);
  },
  async getAccountsByHandler(handlerId) {
    const res = await fetch(`${API_BASE_URL}/accounts/handler/${handlerId}`);
    return handleResponse(res);
  },
  async addAccount(accountData) {
    const res = await fetch(`${API_BASE_URL}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData),
    });
    return handleResponse(res);
  },
  async updateAccount(id, data) {
    const res = await fetch(`${API_BASE_URL}/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  async deleteAccount(id) {
    const res = await fetch(`${API_BASE_URL}/accounts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete account: ${res.status}`);
  },

  // Video Posts
  async getPosts() {
    const res = await fetch(`${API_BASE_URL}/posts`);
    return handleResponse(res);
  },
  async addPost(postData) {
    const res = await fetch(`${API_BASE_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    });
    return handleResponse(res);
  },
  async deletePost(accountId, date, index) {
    const res = await fetch(`${API_BASE_URL}/posts/${accountId}/${date}/${index}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete post: ${res.status}`);
  },

  // R2 Video Upload
  async getUploadUrl(accountId, filename) {
    const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/upload-url?filename=${encodeURIComponent(filename)}`);
    return handleResponse(res);
  },
  async confirmUpload(accountId, videoNumber) {
    const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/confirm-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoNumber }),
    });
    return handleResponse(res);
  },
  async getCaptionUploadUrl(accountId, videoNumber) {
    const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/caption-upload-url?videoNumber=${videoNumber}`);
    return handleResponse(res);
  },
  async linkR2(accountId, data) {
    const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/link-r2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // Sequential Posting
  async getNextVideo(accountId) {
    const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/next-video`);
    return handleResponse(res);
  },
  async markPostDone(accountId, date) {
    const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/next-video/mark-done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    return handleResponse(res);
  },
  async getCaption(accountId, videoNumber) {
    const res = await fetch(`${API_BASE_URL}/accounts/${accountId}/caption/${videoNumber}`);
    return handleResponse(res);
  },
};
