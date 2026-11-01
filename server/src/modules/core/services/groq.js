import Groq from 'groq-sdk';

// One shared Groq client, created the first time it is needed.
let client;
export function getClient() {
  if (!client) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is missing in server/.env');
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

// "smart" for work that needs quality, "fast" for short, frequent calls.
export const MODELS = {
  smart: process.env.GROQ_MODEL_SMART || 'llama-3.3-70b-versatile',
  fast: process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant',
  stt: process.env.GROQ_MODEL_STT || 'whisper-large-v3-turbo',
};

// Groq rejects the request with this error when the model fails to produce valid JSON.
// The small "fast" model does this fairly often, so it is treated as retryable.
function isJsonFailure(err) {
  const code = err?.error?.error?.code || err?.error?.code;
  return err?.status === 400 && (code === 'json_validate_failed' || /validate JSON/i.test(err?.message || ''));
}

// Ask the model for JSON and return it as an object.
// Up to 3 tries. If the model keeps failing to produce valid JSON,
// the last try switches to the "smart" model, which is far more reliable.
export async function askJson({ system, user, model = MODELS.smart, maxTokens = 2000, temperature = 0.3 }) {
  const attempts = 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const useModel = attempt === attempts ? MODELS.smart : model;
    try {
      const res = await getClient().chat.completions.create({
        model: useModel,
        temperature: attempt === 1 ? temperature : Math.min(temperature, 0.2), // calmer on retries
        max_tokens: Math.max(maxTokens, 500), // too small a limit can cut the JSON off mid-way
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${system}\n\nRespond with one valid JSON object and nothing else.` },
          { role: 'user', content: user },
        ],
      });
      return JSON.parse(res.choices[0]?.message?.content ?? '');
    } catch (err) {
      const retryable = isJsonFailure(err) || err instanceof SyntaxError;
      if (!retryable || attempt === attempts) {
        if (retryable) throw new Error('The AI returned an unreadable answer. Please try again.');
        throw err;
      }
    }
  }
}
