import { request, localToday } from '../core/http.js';

export const planApi = {
  plan: () => request('/plan'),
  generatePlan: () => request('/plan/generate', { method: 'POST', body: { today: localToday() } }),
  toggleTask: (id, done) => request(`/plan/tasks/${id}`, { method: 'PATCH', body: { done } }),
};
