import {
  focusForRoundType,
  insertResearchHeading,
  parseReflection,
  resolveSessionFocus,
  serializeReflection,
  sessionReadiness,
} from './interviewPrepSession';

describe('interviewPrepSession', () => {
  it('maps round types onto a study focus', () => {
    expect(focusForRoundType('oa')).toBe('oa');
    expect(focusForRoundType('technical_assignment')).toBe('technical');
    expect(focusForRoundType('hr')).toBe('behavioral');
    expect(focusForRoundType('final')).toBe('behavioral');
    expect(focusForRoundType('assignment')).toBe('assignment');
    expect(focusForRoundType('resume_shortlisted')).toBe('general');
  });

  it('uses the query round, otherwise the earliest pending round', () => {
    const rounds = [
      { round_number: 2, round_type: 'technical', result: 'pending' },
      { round_number: 1, round_type: 'oa', result: 'pending' },
    ];
    expect(resolveSessionFocus(rounds, 'hr')).toBe('behavioral');
    expect(resolveSessionFocus(rounds, null)).toBe('oa');
    expect(resolveSessionFocus([], null)).toBe('general');
  });

  it('counts readiness only for the current focus', () => {
    const result = sessionReadiness(
      'technical',
      [{ focus: 'technical', is_prepared: true }, { focus: 'oa', is_prepared: false }],
      [{ focus: 'technical', is_reviewed: false }],
      [{ focus: 'technical', situation: 's', task: 't', action: 'a', result: 'r' }]
    );
    expect(result.total).toBe(3);
    expect(result.done).toBe(2);
    expect(result.percent).toBe(67);
  });

  it('round-trips debrief sections and inserts a research heading once', () => {
    const notes = serializeReflection({ asked: 'Graphs', landed: 'Examples', fix: 'Timing' });
    expect(parseReflection(notes)).toMatchObject({ asked: 'Graphs', landed: 'Examples', fix: 'Timing', legacy: '' });
    expect(parseReflection('old note').legacy).toBe('old note');
    const withHeading = insertResearchHeading('', 'Product');
    expect(insertResearchHeading(withHeading, 'Product')).toBe(withHeading);
  });
});
