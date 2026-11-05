import { request } from '../core/http.js';

export const resumeApi = {
  uploadResume: (file) => {
    const form = new FormData();
    form.append('resume', file);
    return request('/resume', { method: 'POST', form });
  },
  latestResume: () => request('/resume/latest'),
  analyzeResume: () => request('/resume/analyze', { method: 'POST' }),
};
