import { useEffect } from 'react';
import { api, localToday } from '../../core/api.js';

// Shows a browser notification at the student's reminder time if tasks are due today.
// Limitation: it only fires while the app is open in a tab.
export function useDailyReminder(user) {
  useEffect(() => {
    if (!user || !('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();

    const timer = setInterval(async () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const key = `reminded-${localToday()}`;
      if (hhmm !== user.reminderTime || localStorage.getItem(key) || Notification.permission !== 'granted') return;

      const { tasks } = await api.plan().catch(() => ({ tasks: [] }));
      const due = tasks.filter((t) => t.dueDay === localToday() && !t.done);
      localStorage.setItem(key, '1');
      if (due.length) new Notification('Interview Coach', { body: `${due.length} task${due.length > 1 ? 's' : ''} due today: ${due[0].title}` });
    }, 30000);

    return () => clearInterval(timer);
  }, [user]);
}
