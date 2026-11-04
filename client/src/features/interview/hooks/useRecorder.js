import { useEffect, useRef, useState } from 'react';

// Records microphone audio. start() begins, stop() resolves with the recorded Blob.
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.start();
    recorder.current = rec;
    setSeconds(0);
    setRecording(true);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stop() {
    return new Promise((resolve) => {
      const rec = recorder.current;
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop()); // release the microphone
        clearInterval(timer.current);
        setRecording(false);
        resolve(new Blob(chunks.current, { type: rec.mimeType }));
      };
      rec.stop();
    });
  }

  // Release the microphone if the page is left mid-recording
  useEffect(() => () => {
    clearInterval(timer.current);
    recorder.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  return { recording, seconds, start, stop };
}
