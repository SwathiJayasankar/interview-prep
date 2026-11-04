import { useCallback, useEffect } from 'react';

// Reads text aloud with the browser's built-in voice (the interviewer's voice).
export function useSpeak() {
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }, []);
}
