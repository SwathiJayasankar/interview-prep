import pdf from 'pdf-parse/lib/pdf-parse.js'; // the /lib path avoids a known debug-mode bug in pdf-parse
import mammoth from 'mammoth';
import { askJson } from '../../core/services/groq.js';
import { HttpError } from '../../core/middleware/errorHandler.js';
import { str, strList, list } from '../../core/utils/normalize.js';

// Step 1: file -> plain text
export async function extractText(file) {
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.pdf')) return (await pdf(file.buffer)).text;
  if (name.endsWith('.docx')) return (await mammoth.extractRawText({ buffer: file.buffer })).value;
  throw new HttpError(400, 'Please upload a PDF or DOCX file.');
}

// Step 2: plain text -> structured data (skills, education, experience, projects)
export async function structureResume(rawText) {
  const out = await askJson({
    maxTokens: 2500,
    temperature: 0,
    system: `You extract structured data from resumes. Only use information that is present in the resume. Never invent anything.
Return JSON in exactly this shape:
{
  "name": string, "email": string, "phone": string, "links": [string],
  "summary": string,
  "skills": [string],
  "education": [{"institution": string, "degree": string, "years": string, "score": string}],
  "experience": [{"company": string, "role": string, "duration": string, "bullets": [string]}],
  "projects": [{"name": string, "techStack": [string], "bullets": [string]}],
  "certifications": [string]
}
Use empty strings or empty arrays when something is missing. Skills must be individual items, e.g. "React", "MongoDB".`,
    user: rawText.slice(0, 12000),
  });

  return {
    name: str(out.name),
    email: str(out.email),
    phone: str(out.phone),
    links: strList(out.links, 10),
    summary: str(out.summary),
    skills: strList(out.skills, 60),
    education: list(out.education, 6).map((e) => ({
      institution: str(e?.institution), degree: str(e?.degree), years: str(e?.years), score: str(e?.score),
    })),
    experience: list(out.experience, 8).map((e) => ({
      company: str(e?.company), role: str(e?.role), duration: str(e?.duration), bullets: strList(e?.bullets, 8),
    })),
    projects: list(out.projects, 8).map((p) => ({
      name: str(p?.name), techStack: strList(p?.techStack, 12), bullets: strList(p?.bullets, 8),
    })),
    certifications: strList(out.certifications, 10),
  };
}
