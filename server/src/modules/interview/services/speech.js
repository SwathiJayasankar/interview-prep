import { toFile } from 'groq-sdk';
import { getClient, MODELS } from '../../core/services/groq.js';
import { round1 } from '../../core/utils/normalize.js';

// Whisper tends to drop "um" and "uh". A prompt that contains them makes it keep them.
const FILLER_PROMPT = 'Umm, let me think... uh, so, like, I would, you know, start with, hmm, the basics.';

// Words we count as fillers. "like" and "so" are left out on purpose:
// they are too often normal words ("I like React"), so counting them would be unfair.
const FILLER_REGEX = /\b(um+|uh+|erm?|hmm+|you know|i mean|basically|actually|sort of|kind of)\b/gi;

const EXTENSIONS = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' };

const PAUSE_SECONDS = 0.8; // a gap between words longer than this counts as a pause

export async function transcribeAudio(buffer, mimetype = 'audio/webm') {
  const baseType = mimetype.split(';')[0];
  const file = await toFile(buffer, `answer.${EXTENSIONS[baseType] || 'webm'}`, { type: baseType });

  const res = await getClient().audio.transcriptions.create({
    file,
    model: MODELS.stt,
    response_format: 'verbose_json',
    timestamp_granularities: ['word'],
    language: 'en',
    prompt: FILLER_PROMPT,
    temperature: 0,
  });
  return { text: (res.text || '').trim(), words: res.words || [] };
}

export function countFillers(text) {
  const counts = {};
  for (const match of text.matchAll(FILLER_REGEX)) {
    const word = match[0].toLowerCase();
    counts[word] = (counts[word] || 0) + 1;
  }
  return { total: Object.values(counts).reduce((a, b) => a + b, 0), counts };
}

// Turns word timestamps into pace / pause / filler numbers.
export function analyzeSpeech(words, text) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const fillers = countFillers(text);
  const result = { wordCount, fillerCount: fillers.total, fillers: fillers.counts, durationSec: null, wpm: null, paceLabel: null, pauseCount: 0, longestPauseSec: 0 };
  if (words.length < 2) return result;

  const durationSec = words[words.length - 1].end - words[0].start;
  const pauses = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap >= PAUSE_SECONDS) pauses.push(gap);
  }

  result.durationSec = round1(durationSec);
  result.pauseCount = pauses.length;
  result.longestPauseSec = round1(Math.max(0, ...pauses));
  if (durationSec >= 3) {
    result.wpm = Math.round(wordCount / (durationSec / 60));
    result.paceLabel = result.wpm < 110 ? 'slow' : result.wpm > 170 ? 'fast' : 'good';
  }
  return result;
}
