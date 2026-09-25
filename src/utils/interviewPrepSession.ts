export const FOCUS_VALUES = ['oa', 'technical', 'behavioral', 'assignment', 'general'] as const;

export type PrepFocus = (typeof FOCUS_VALUES)[number];

export const FOCUS_LABELS: Record<PrepFocus, string> = {
  oa: 'Online assessment',
  technical: 'Technical interview',
  behavioral: 'Behavioral interview',
  assignment: 'Assignment',
  general: 'First interview',
};

export function focusForRoundType(roundType?: string | null): PrepFocus {
  switch (roundType) {
    case 'oa':
      return 'oa';
    case 'technical':
    case 'technical_assignment':
      return 'technical';
    case 'hr':
    case 'managerial':
    case 'group_discussion':
    case 'final':
      return 'behavioral';
    case 'assignment':
      return 'assignment';
    default:
      return 'general';
  }
}

export function isPrepFocus(value?: string | null): value is PrepFocus {
  return FOCUS_VALUES.includes(value as PrepFocus);
}

type RoundLike = { round_number?: number; round_type?: string | null; result?: string | null };

export function resolveSessionFocus(rounds: RoundLike[] = [], roundQuery?: string | null): PrepFocus {
  if (roundQuery) return focusForRoundType(roundQuery);
  const pending = [...rounds]
    .filter((round) => round.result === 'pending')
    .sort((a, b) => (a.round_number || 0) - (b.round_number || 0))[0];
  if (pending) return focusForRoundType(pending.round_type);
  return 'general';
}

type FocusedItem = { focus?: string | null };

export function inFocus<T extends FocusedItem>(item: T, focus: PrepFocus): boolean {
  return (item.focus || 'general') === focus;
}

type QuestionLike = FocusedItem & { is_prepared?: boolean };
type TopicLike = FocusedItem & { is_reviewed?: boolean };
type StarLike = FocusedItem & {
  situation?: string | null;
  task?: string | null;
  action?: string | null;
  result?: string | null;
};

export function isStarComplete(entry: StarLike): boolean {
  return Boolean(entry.situation?.trim() && entry.task?.trim() && entry.action?.trim() && entry.result?.trim());
}

export function sessionReadiness(
  focus: PrepFocus,
  questions: QuestionLike[] = [],
  topics: TopicLike[] = [],
  behavioral: StarLike[] = []
) {
  const focusedQuestions = questions.filter((item) => inFocus(item, focus));
  const focusedTopics = topics.filter((item) => inFocus(item, focus));
  const focusedBehavioral = behavioral.filter((item) => inFocus(item, focus));
  const total = focusedQuestions.length + focusedTopics.length + focusedBehavioral.length;
  const done =
    focusedQuestions.filter((item) => item.is_prepared).length +
    focusedTopics.filter((item) => item.is_reviewed).length +
    focusedBehavioral.filter(isStarComplete).length;
  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    questions: focusedQuestions,
    topics: focusedTopics,
    behavioral: focusedBehavioral,
  };
}

const ASKED = '## Asked';
const LANDED = '## Landed';
const FIX = '## Fix next';

export function serializeReflection({ asked = '', landed = '', fix = '' }: { asked?: string; landed?: string; fix?: string }) {
  return [ASKED, asked.trim(), '', LANDED, landed.trim(), '', FIX, fix.trim()].join('\n').trim();
}

export function parseReflection(notes?: string | null) {
  const text = notes || '';
  const askedAt = text.indexOf(ASKED);
  const landedAt = text.indexOf(LANDED);
  const fixAt = text.indexOf(FIX);
  if (askedAt === -1 || landedAt === -1 || fixAt === -1) {
    return { asked: '', landed: '', fix: '', legacy: text.trim() };
  }
  return {
    asked: text.slice(askedAt + ASKED.length, landedAt).trim(),
    landed: text.slice(landedAt + LANDED.length, fixAt).trim(),
    fix: text.slice(fixAt + FIX.length).trim(),
    legacy: '',
  };
}

export const RESEARCH_HEADINGS = ['Product', 'Role', 'Questions to ask them'];

export function insertResearchHeading(notes: string, heading: string) {
  const block = `## ${heading}\n`;
  if (notes.includes(block)) return notes;
  const trimmed = notes.trim();
  return trimmed ? `${trimmed}\n\n${block}` : block;
}
