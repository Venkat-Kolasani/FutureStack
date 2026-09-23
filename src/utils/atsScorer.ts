/*
 * Client-side ATS scorer and text extractor
 * - analyzeFile(file): tries to extract text from PDF/DOCX and returns analysis
 * - analyzeText(text): rule-based scoring returning breakdown and total (0-100)
 */
import type { UserDocument } from '../types';

export type AtsSectionKey = 'contact' | 'education' | 'skills' | 'experience' | 'projects';

export type AtsSections = Record<AtsSectionKey, boolean>;

export type AtsAnalysis = {
  score: number;
  breakdown: {
    structure: number;
    content: number;
    atsFriendly: number;
    keywordMatches: number;
  };
  words: number;
  sections: AtsSections;
  missingSections: string[];
  suggestions: string[];
  matchedKeywords: string[];
  suggestedKeywords: string[];
  howScored: string[];
};

export const KEYWORDS = [
  'javascript', 'react', 'node', 'python', 'java', 'sql', 'html', 'css',
  'typescript', 'express', 'mongodb', 'postgresql', 'docker', 'kubernetes',
  'aws', 'azure', 'git', 'github', 'linux', 'rest api', 'graphql', 'testing',
  'ci/cd', 'agile', 'machine learning', 'data structures', 'algorithms',
  'pytorch', 'tensorflow', 'scikit-learn', 'pandas', 'numpy', 'spark',
  'figma', 'next.js', 'vue', 'angular', 'spring', 'django', 'flask', 'redis'
];

const SECTION_LABELS: Record<AtsSectionKey, string> = {
  contact: 'Contact',
  education: 'Education',
  skills: 'Skills',
  experience: 'Experience',
  projects: 'Projects'
};

const HOW_SCORED = [
  'Structure: up to 60 points for Contact, Education, Skills, Experience, and Projects.',
  'Content: up to 25 points for skills depth, matched role keywords, projects, and experience detail.',
  'ATS-friendly: up to 15 points for resume length, contact details, and LinkedIn/GitHub signals.',
  'Keywords are matched from skills, experience, and projects — not your contact header.',
  'Different resumes should score differently when skills, projects, or experience change.'
];

const SECTION_BOUNDARY = /(?:^|\s)(education|skills?|technical skills|experience|employment|projects?|certifications|summary|objective)\b/i;

function extractSection(text: string, startPattern: RegExp): string {
  const match = text.match(startPattern);
  if (!match || match.index === undefined) return '';

  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const boundary = rest.search(SECTION_BOUNDARY);
  return boundary === -1 ? rest.slice(0, 1200) : rest.slice(0, boundary);
}

function countDelimitedItems(text: string): number {
  if (!text) return 0;

  const delimited = text
    .split(/[,|•\n;/]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1 && item.length < 80);

  if (delimited.length > 1) return delimited.length;

  // Flattened PDFs often use space-separated skill lists on one line
  return text
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1 && item.length < 30).length;
}

function countExperienceSignals(experienceText: string): number {
  if (!experienceText) return 0;

  const newlineBullets = (experienceText.match(/(?:^|\n)\s*[-•*]\s+/g) || []).length;
  const inlineBullets = (experienceText.match(/\s[-•*]\s+\w/g) || []).length;
  const actionVerbs = (experienceText.match(
    /\b(built|led|developed|designed|implemented|improved|reduced|increased|created|managed|optimized|automated|deployed|trained|analyzed|delivered)\b/g
  ) || []).length;
  const metrics = (experienceText.match(/\b\d+%|\$\d+|\d+\+?\s*(users|customers|ms|x)\b/g) || []).length;

  return Math.min(
    7,
    newlineBullets + inlineBullets + Math.floor(actionVerbs / 2) + Math.min(2, metrics)
  );
}

function scoreLength(words: number): number {
  if (words >= 400 && words <= 1000) return 10;
  if (words >= 320 && words < 400) return 8;
  if (words > 1000 && words <= 1300) return 8;
  if (words >= 250 && words < 320) return 6;
  if (words > 1300 && words <= 1600) return 6;
  if (words >= 180 && words < 250) return 4;
  if (words > 1600) return 3;
  return 2;
}

type SuggestionInput = {
  sections: AtsSections;
  skillsDepthScore: number;
  projectsScore: number;
  experienceScore: number;
  keywordScore: number;
  lengthScore: number;
  hasEmail: boolean;
  hasLinked: boolean;
  suggestedKeywords: string[];
};

const buildSuggestions = ({
  sections,
  skillsDepthScore,
  projectsScore,
  experienceScore,
  keywordScore,
  lengthScore,
  hasEmail,
  hasLinked,
  suggestedKeywords
}: SuggestionInput): string[] => {
  const suggestions: string[] = [];
  (Object.entries(sections) as [AtsSectionKey, boolean][]).forEach(([key, present]) => {
    if (!present) suggestions.push(`Add a clear ${SECTION_LABELS[key]} section.`);
  });
  if (skillsDepthScore < 5) suggestions.push('List more role-relevant skills with clear separators.');
  if (keywordScore < 4) suggestions.push('Add technologies and tools from the target role to your skills and experience.');
  if (projectsScore < 3) suggestions.push('Include 1-2 projects with impact, stack, and links if available.');
  if (experienceScore < 3) suggestions.push('Use concise bullet points under experience with action verbs and measurable results.');
  if (lengthScore < 7) suggestions.push('Aim for roughly 400-1000 words for a readable resume.');
  if (!hasEmail) suggestions.push('Add a professional email address.');
  if (!hasLinked) suggestions.push('Add LinkedIn and/or GitHub profile links.');
  if (suggestedKeywords.length > 0) {
    suggestions.push(`Consider relevant keywords: ${suggestedKeywords.slice(0, 5).join(', ')}.`);
  }
  return suggestions.slice(0, 5);
};

function keywordMatchesInText(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = keyword.includes(' ')
    ? new RegExp(escaped, 'i')
    : new RegExp(`\\b${escaped}\\b`, 'i');
  return pattern.test(text);
}

function countProjectEntries(projectsText: string): number {
  if (!projectsText) return 0;

  const bulletLines = (projectsText.match(/(?:^|\n)\s*[-•*]\s+\S/g) || []).length;
  const namedBlocks = projectsText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 20 && !/^(projects?|portfolio)\b/i.test(block)).length;

  return Math.max(bulletLines, Math.min(5, namedBlocks));
}

function hasSectionHeading(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function analyzeText(text = ''): AtsAnalysis {
  const normalized = (text || '').toLowerCase();
  const headerSlice = normalized.slice(0, 800);

  const sections: AtsSections = {
    contact: /(?:^|\n)[^\n]{0,80}(?:@|linkedin\.com|github\.com|phone|\+\d)/.test(headerSlice) ||
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(headerSlice),
    education: hasSectionHeading(normalized, [
      /(?:^|\s)(education|academic background)\b/i,
      /(?:^|\s)(bachelor|master|phd|b\.s\.|m\.s\.|b\.tech|university|college)\b/i,
    ]),
    skills: hasSectionHeading(normalized, [
      /(?:^|\s)(skills?|technical skills|proficiencies|stack|technologies)\b/i,
    ]),
    experience: hasSectionHeading(normalized, [
      /(?:^|\s)(experience|employment|work history|professional experience|internship)\b/i,
    ]),
    projects: hasSectionHeading(normalized, [
      /(?:^|\s)(projects?|portfolio|personal projects|open source)\b/i,
    ]),
  };

  const structurePerSection = 60 / Object.keys(sections).length;
  let structureScore = 0;
  Object.values(sections).forEach(present => { if (present) structureScore += structurePerSection; });

  const skillsText = extractSection(normalized, /(?:^|\s)(skills?|technical skills|proficiencies|stack)\b/i);
  const experienceText = extractSection(normalized, /(?:^|\s)(experience|employment|work history|professional experience)\b/i);
  const projectsText = extractSection(normalized, /(?:^|\s)(projects?|portfolio|personal projects)\b/i);
  const scoringText = [skillsText, experienceText, projectsText].filter(Boolean).join('\n');

  const skillItems = countDelimitedItems(skillsText);
  const skillsDepthScore = Math.min(8, Math.floor(skillItems / 2) + (skillItems >= 10 ? 2 : skillItems >= 6 ? 1 : 0));

  // Match keywords in role content only — not contact/header (github, git appear on every resume)
  const matchedKeywords = KEYWORDS.filter((keyword) => keywordMatchesInText(scoringText, keyword));
  const suggestedKeywords = KEYWORDS.filter((keyword) => !matchedKeywords.includes(keyword));
  const keywordScore = Math.min(12, matchedKeywords.length);

  const projectsCount = countProjectEntries(projectsText);
  const projectsScore = Math.min(
    5,
    Math.min(3, projectsCount) + (projectsText.length > 120 ? 2 : 0)
  );

  const experienceScore = countExperienceSignals(experienceText);
  const contentScore = Math.min(
    25,
    skillsDepthScore + keywordScore + projectsScore + experienceScore
  );

  const words = (normalized.match(/\w+/g) || []).length;
  const lengthScore = scoreLength(words);

  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(normalized);
  const hasPhone = /(?:\+?\d[\d\s\-().]{7,}\d)/.test(normalized);
  const hasLinked = /linkedin\.com|github\.com/.test(normalized);

  const contactScore = (hasEmail ? 3 : 0) + (hasPhone ? 1 : 0) + (hasLinked ? 1 : 0);
  const atsFriendlyScore = Math.min(15, lengthScore + contactScore);

  const total = Math.max(0, Math.min(100, Math.round(structureScore + contentScore + atsFriendlyScore)));

  const breakdown = {
    structure: Math.round(structureScore),
    content: contentScore,
    atsFriendly: atsFriendlyScore,
    keywordMatches: matchedKeywords.length
  };
  const missingSections = (Object.entries(sections) as [AtsSectionKey, boolean][])
    .filter(([, present]) => !present)
    .map(([key]) => SECTION_LABELS[key]);

  return {
    score: total,
    breakdown,
    words,
    sections,
    missingSections,
    suggestions: buildSuggestions({
      sections,
      skillsDepthScore,
      projectsScore,
      experienceScore,
      keywordScore,
      lengthScore,
      hasEmail,
      hasLinked,
      suggestedKeywords
    }),
    matchedKeywords,
    suggestedKeywords,
    howScored: HOW_SCORED
  };
}

export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    const loadingTask = getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Marked-content items carry no `str`; only text items contribute to the resume body.
      const strings = content.items.map((item) => ('str' in item ? item.str : ''));
      text += `${strings.join(' ')}\n`;
    }
    return text;
  } catch (err) {
    console.error('PDF extraction failed', err);
    throw err;
  }
}

export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  } catch (err) {
    console.error('DOCX extraction failed', err);
    throw err;
  }
}

export function isAtsEligible(document?: UserDocument | null): boolean {
  return Boolean(
    document?.type === 'resume' &&
    document?.file_url &&
    !document?.is_external
  );
}

export function inferResumeFileName(document?: UserDocument | null): string {
  const url = document?.file_url || '';
  const fromUrl = url.split('?')[0].split('/').pop() || '';
  if (/\.(pdf|docx?)$/i.test(fromUrl)) {
    return fromUrl;
  }

  const baseName = (document?.name || 'resume').replace(/\.[^/.]+$/, '');
  if (/\.docx?(\?|$)/i.test(url)) {
    return `${baseName}.docx`;
  }
  return `${baseName}.pdf`;
}

export function getAtsAnalysisErrorMessage(error?: { message?: string } | null): string {
  if (error?.message === 'no_text_extracted') {
    return "Couldn't read text from this file. Scanned PDFs are not supported yet.";
  }
  if (error?.message === 'fetch_failed') {
    return 'Unable to download the resume file. Please try again.';
  }
  if (error?.message === 'extraction_failed') {
    return 'Unable to analyze the resume. Please try another PDF or DOCX file.';
  }
  return 'Unable to analyze the resume. Please try again.';
}

export async function analyzeFileFromUrl(
  fileUrl?: string | null,
  fileName = 'resume.pdf'
): Promise<AtsAnalysis> {
  if (!fileUrl) {
    throw new Error('fetch_failed');
  }

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error('fetch_failed');
  }

  const blob = await response.blob();
  const file = new File([blob], fileName, {
    type: blob.type || 'application/pdf'
  });

  return analyzeFile(file);
}

export async function analyzeFile(file?: File | null): Promise<AtsAnalysis> {
  if (!file) throw new Error('No file provided');

  const reader = new FileReader();
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });

  const mime = file.type || '';
  let text = '';
  try {
    if (mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      text = await extractTextFromPDF(arrayBuffer);
    } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) {
      text = await extractTextFromDocx(arrayBuffer);
    } else if (mime === 'application/msword' || file.name.toLowerCase().endsWith('.doc')) {
      try {
        text = await extractTextFromDocx(arrayBuffer);
      } catch {
        text = '';
      }
    }
  } catch {
    throw new Error('extraction_failed');
  }

  if (!text || text.trim().length < 20) {
    throw new Error('no_text_extracted');
  }

  return analyzeText(text);
}

const atsScorer = { analyzeText, analyzeFile };
export default atsScorer;
