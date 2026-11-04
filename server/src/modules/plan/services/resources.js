// The AI suggests WHAT to study (a title and a search phrase). We build the link ourselves,
// because AI models often invent URLs that do not exist. A search link always works.

const enc = encodeURIComponent;

const LINKS = {
  video: (q) => `https://www.youtube.com/results?search_query=${enc(q)}`,
  practice: (q) => `https://leetcode.com/problemset/?search=${enc(q)}`,
  article: (q) => `https://www.google.com/search?q=${enc(q)}`,
  docs: (q) => `https://www.google.com/search?q=${enc(`${q} official documentation`)}`,
};

export function buildResource({ title, kind, query }) {
  const safeKind = LINKS[kind] ? kind : 'article';
  return { title, kind: safeKind, url: LINKS[safeKind](query || title) };
}
