
import { Job, LocalData } from '../types';

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl + '/api';
  
  // Use relative path by default for same-origin requests
  return '/api';
};

const API_BASE = getApiBase();
console.log('API_BASE initialized as:', API_BASE);
const LOCAL_STORAGE_KEY = 'saudi_job_local_device';

let jobsCache: Job[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const getGlobalJobs = async (retries = 3, forceRefresh = false): Promise<Job[]> => {
  const now = Date.now();
  if (!forceRefresh && jobsCache && (now - lastFetchTime < CACHE_DURATION)) {
    return jobsCache;
  }

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${API_BASE}/jobs`);
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          if (response.status === 503) {
            errorMessage = `Database Unavailable: ${errorMessage}`;
          }
        } catch (e) {
          // Fallback if not JSON
        }
        throw new Error(errorMessage);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid server response format (Expected JSON).');
      }
      const data = await response.json();
      jobsCache = data;
      lastFetchTime = Date.now();
      return data;
    } catch (error) {
      if (i === retries - 1) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.error('Network error - check internet connection:', `${API_BASE}/jobs`);
        }
        // If fetch fails but we have cache, return cache as fallback
        if (jobsCache) return jobsCache;
        throw error;
      }
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      console.warn(`Retrying fetch jobs (${i + 1}/${retries}) after ${delay}ms...`);
    }
  }
  return jobsCache || [];
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
  const newJob = await response.json();
  // Invalidate cache
  jobsCache = null;
  return newJob;
};

export const updateGlobalJob = async (id: string, email: string, data: Partial<Job>): Promise<Job> => {
  const response = await fetch(`${API_BASE}/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, email }),
  });
  if (!response.ok) throw new Error('Failed to update job');
  const updatedJob = await response.json();
  // Invalidate cache
  jobsCache = null;
  return updatedJob;
};

export const adminUpdateJob = async (id: string, data: Partial<Job>): Promise<Job> => {
  const response = await fetch(`${API_BASE}/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, adminKey: 'saudi_admin_2025' }),
  });
  if (!response.ok) throw new Error('Failed to update job');
  const updatedJob = await response.json();
  // Invalidate cache
  jobsCache = null;
  return updatedJob;
};

export const deleteGlobalJob = async (id: string, email?: string, adminKey?: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/jobs/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, adminKey }),
  });
  if (response.ok) {
    // Invalidate cache
    jobsCache = null;
  }
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
