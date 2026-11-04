import { request } from '../core/http.js';

export const interviewApi = {
  interviewOptions: () => request('/interview/options'),
  startInterview: (body) => request('/interview/start', { method: 'POST', body }),
  transcribe: (id, blob) => {
    const form = new FormData();
    form.append('audio', blob, 'answer.webm');
    return request(`/interview/${id}/transcribe`, { method: 'POST', form });
  },
  answer: (id, body) => request(`/interview/${id}/answer`, { method: 'POST', body }),
  finishInterview: (id) => request(`/interview/${id}/finish`, { method: 'POST' }),
  sessions: () => request('/interview'),
  session: (id) => request(`/interview/${id}`),
};
