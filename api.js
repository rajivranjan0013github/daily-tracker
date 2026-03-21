const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api';

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

  // Accounts
  async getAccounts() {
    const res = await fetch(`${API_BASE_URL}/accounts`);
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
};
