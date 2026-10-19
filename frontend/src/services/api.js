/**
 * Dakly API Client
 * Talks to the backend microservice engine (default: https://dakly-engin.vercel.app)
 */

export const API_BASE_URL = import.meta.env.VITE_DAKLY_API_URL || 'https://dakly-engin.vercel.app';

// Auth Endpoints
export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerUser({ name, email, password }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return res.json();
}

export async function fetchMe(token) {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

// Project & Dashboard Endpoints
export async function fetchProjects(token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}/api/projects`, { headers });
  return res.json();
}

export async function createProject({ name, senderEmail, appPassword, senderDisplayName }, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, senderEmail, appPassword, senderDisplayName }),
  });
  return res.json();
}

export async function addSender(projectId, { email, appPassword, displayName }, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/senders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, appPassword, displayName }),
  });
  return res.json();
}

export async function fetchStats(apiKey) {
  const res = await fetch(`${API_BASE_URL}/api/stats`, {
    headers: { 'x-api-key': apiKey },
  });
  return res.json();
}

export async function fetchLogs(apiKey, { page = 1, limit = 10, search = '', status = '' } = {}) {
  let url = `${API_BASE_URL}/api/logs?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;

  const res = await fetch(url, {
    headers: { 'x-api-key': apiKey },
  });
  return res.json();
}

export async function sendEmail(apiKey, payload) {
  const res = await fetch(`${API_BASE_URL}/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function pingApiKey(apiKey) {
  const start = performance.now();
  const res = await fetch(`${API_BASE_URL}/api/ping`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    },
  });
  const data = await res.json();
  const latencyMs = Math.round(performance.now() - start);
  return { ...data, latencyMs };
}

export async function uploadProjectLogo(projectId, base64Image, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/logo`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image: base64Image }),
  });
  return res.json();
}

export async function deleteProjectLogo(projectId, token) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/logo`, {
    method: 'DELETE',
    headers,
  });
  return res.json();
}


