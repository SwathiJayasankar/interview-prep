// Core calls (login, profile, dashboard) live here.
// Each feature keeps its own calls in its own file; they are merged into one `api` object below.
import { request, localToday } from './http.js';
import { resumeApi } from '../resume/resume.api.js';
import { interviewApi } from '../interview/interview.api.js';
import { planApi } from '../plan/plan.api.js';

export { getToken, setToken, localToday } from './http.js';

const coreApi = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),
  saveProfile: (body) => request('/profile', { method: 'PUT', body }),
  analytics: () => request(`/analytics?today=${localToday()}`),
};

export const api = { ...coreApi, ...resumeApi, ...interviewApi, ...planApi };
