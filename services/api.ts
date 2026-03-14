
import { Job, LocalData } from '../types';

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl + '/api';
  
  // Fallback to current origin if in browser
  if (typeof window !== 'undefined') {
    return window.location.origin + '/api';
  }
  
  return '/api';
};

const API_BASE = getApiBase();
const LOCAL_STORAGE_KEY = 'saudi_job_local_device';

export const getGlobalJobs = async (retries = 3): Promise<Job[]> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${API_BASE}/jobs`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch jobs: ${response.status}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Check if the server is running correctly.');
      }
      return response.json();
    } catch (error) {
      if (i === retries - 1) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.error('Network error or CORS issue when fetching jobs from:', `${API_BASE}/jobs`);
        }
        throw error;
      }
      // Wait before retrying (1s, 2s, 3s...)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      console.warn(`Retrying fetch jobs (${i + 1}/${retries})...`);
    }
  }
  return []; // Should not reach here
};

export const postGlobalJob = async (job: Omit<Job, 'id' | 'views' | 'postedAt'>): Promise<Job> => {
  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to post job' }));
    throw new Error(errorData.error || 'Failed to post job');
  }
  return response.json();
};

export const updateGlobalJob = async (id: string, email: string, data: Partial<Job>): Promise<Job> => {
  const response = await fetch(`${API_BASE}/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, email }),
  });
  if (!response.ok) throw new Error('Failed to update job');
  return response.json();
};

export const adminUpdateJob = async (id: string, data: Partial<Job>): Promise<Job> => {
  const response = await fetch(`${API_BASE}/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, adminKey: 'saudi_admin_2025' }),
  });
  if (!response.ok) throw new Error('Failed to update job');
  return response.json();
};

export const deleteGlobalJob = async (id: string, email?: string, adminKey?: string, verificationCode?: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/jobs/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, adminKey, verificationCode }),
  });
  return response.ok;
};

export const requestVerificationCode = async (email: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/auth/request-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.ok;
};

export const incrementJobViews = async (id: string): Promise<void> => {
  await fetch(`${API_BASE}/jobs/${id}/view`, { method: 'POST' });
};

export const getLocalData = (): LocalData => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  const defaults: LocalData = { 
    viewedJobIds: [], 
    savedJobIds: [], 
    alertRoles: [], 
    lastAlertCheck: 0,
    urgentPostTracking: {}
  };
  
  if (!data) return defaults;
  
  try {
    const parsed = JSON.parse(data);
    return { ...defaults, ...parsed };
  } catch (e) {
    return defaults;
  }
};

export const saveLocalData = (data: LocalData) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

export const getUrgentStatus = (email: string) => {
  const data = getLocalData();
  const today = new Date().setHours(0, 0, 0, 0);
  
  if (!data.urgentPostTracking[email]) {
    data.urgentPostTracking[email] = { count: 0, lastReset: today, extraCredits: 0 };
    saveLocalData(data);
  }
  
  const status = data.urgentPostTracking[email];
  if (status.lastReset < today) {
    status.count = 0;
    status.lastReset = today;
    status.extraCredits = 0;
    saveLocalData(data);
  }
  
  return {
    remaining: Math.max(0, 2 + status.extraCredits - status.count),
    totalAllowed: 2 + status.extraCredits,
    count: status.count
  };
};

export const recordUrgentPost = (email: string) => {
  const data = getLocalData();
  if (data.urgentPostTracking[email]) {
    data.urgentPostTracking[email].count += 1;
    saveLocalData(data);
  }
};

export const addExtraUrgentCredit = (email: string) => {
  const data = getLocalData();
  if (data.urgentPostTracking[email]) {
    data.urgentPostTracking[email].extraCredits += 1;
    saveLocalData(data);
  }
};

export const markAsViewedLocal = (id: string) => {
  const data = getLocalData();
  if (!data.viewedJobIds.includes(id)) {
    data.viewedJobIds.push(id);
    saveLocalData(data);
    incrementJobViews(id).catch(console.error);
  }
};

export const toggleSaveJob = (id: string) => {
  const data = getLocalData();
  if (data.savedJobIds.includes(id)) {
    data.savedJobIds = data.savedJobIds.filter(jid => jid !== id);
  } else {
    data.savedJobIds.push(id);
  }
  saveLocalData(data);
  return data.savedJobIds.includes(id);
};

export const updateAlertRoles = (roles: string[]) => {
  const data = getLocalData();
  data.alertRoles = roles;
  saveLocalData(data);
};
