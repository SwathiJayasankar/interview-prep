// ATS-style score. These checks are plain code (no AI), so the score is
// repeatable and every point can be explained to the student.
//
//   Structure & content checks ........ 60 points
//   Keyword match with the job ........ 40 points  (needs the skill-gap result)

const SECTIONS = {
  education: /\beducation\b/i,
  experience: /\b(experience|internships?|work history)\b/i,
  skills: /\bskills\b/i,
  projects: /\bprojects?\b/i,
};

const ACTION_VERBS = new Set(`built developed designed implemented created led managed optimized optimised improved reduced
increased automated deployed integrated analyzed analysed architected engineered launched migrated refactored tested
collaborated delivered achieved streamlined spearheaded established coordinated trained mentored researched configured
maintained resolved secured scaled wrote authored organized organised contributed drove enhanced simulated modeled
modelled implemented established won secured presented`.split(/\s+/));

const BULLET_CHARS = /^[•\-–—*▪●◦·]\s*/;

// A "bullet" is a line that starts with a bullet symbol, or a long sentence-like line.
function bulletsFrom(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => BULLET_CHARS.test(l) || l.split(/\s+/).length >= 8)
    .map((l) => l.replace(BULLET_CHARS, ''));
}

function check(label, fraction, max, tip) {
  const f = Math.max(0, Math.min(1, fraction));
  return { label, points: Math.round(f * max * 10) / 10, max, tip };
}

export function scoreResume(rawText, requiredCoverage) {
  const words = rawText.split(/\s+/).filter(Boolean).length;
  const bullets = bulletsFrom(rawText);
  const sectionsFound = Object.entries(SECTIONS).filter(([, re]) => re.test(rawText)).map(([name]) => name);

  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(rawText);
  const hasPhone = /(\+?\d[\d\s-]{8,}\d)/.test(rawText);
  const hasLink = /(linkedin\.com|github\.com)/i.test(rawText);

  // numbers in bullets = measurable impact (a simple but useful proxy)
  const withNumbers = bullets.filter((b) => /\d/.test(b)).length;
  const withVerbs = bullets.filter((b) => ACTION_VERBS.has(b.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, ''))).length;
  const numberShare = bullets.length ? withNumbers / bullets.length : 0;
  const verbShare = bullets.length ? withVerbs / bullets.length : 0;

  // 250-800 words is a healthy resume length
  const lengthFraction = words < 250 ? words / 250 : words > 800 ? Math.max(0, 1 - (words - 800) / 800) : 1;

  const checks = [
    check('Standard sections (Education, Experience, Skills, Projects)', sectionsFound.length / 4, 16,
      `Add clear headings for: ${Object.keys(SECTIONS).filter((s) => !sectionsFound.includes(s)).join(', ')}.`),
    check('Contact details and links', ((hasEmail ? 1 : 0) + (hasPhone ? 1 : 0) + (hasLink ? 1 : 0)) / 3, 8,
      `Include ${[!hasEmail && 'email', !hasPhone && 'phone number', !hasLink && 'LinkedIn/GitHub link'].filter(Boolean).join(', ')}.`),
    check('Bullets with measurable results', numberShare / 0.4, 16,
      `Only ${Math.round(numberShare * 100)}% of your bullets contain numbers. Aim for about 40% (users, %, time saved, scale).`),
    check('Bullets start with strong action verbs', verbShare / 0.6, 10,
      `Only ${Math.round(verbShare * 100)}% of bullets start with an action verb like "Built" or "Reduced".`),
    check('Length', lengthFraction, 10,
      words < 250 ? 'Your resume looks too short. Add project details.' : 'Your resume is too long. Aim for one page.'),
    check('Keyword match with the job description', requiredCoverage, 40,
      `Your resume covers ${Math.round(requiredCoverage * 100)}% of the required skills in the job description.`),
  ];

  return {
    score: Math.round(checks.reduce((sum, c) => sum + c.points, 0)),
    checks,
    // only show a tip when that check lost a meaningful number of points
    issues: checks.filter((c) => c.points < c.max * 0.7).map((c) => c.tip),
  };
}
