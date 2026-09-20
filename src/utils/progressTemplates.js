export const TRACK_TEMPLATES = [
  {
    type: 'leetcode',
    label: 'LeetCode / DSA',
    shortLabel: 'DSA',
    description: 'Problems, patterns, and contest work',
    defaultName: 'DSA',
    accent: 'bg-teal-400',
    fields: [
      { key: 'problems', label: 'Problems solved', type: 'number', min: 0, max: 50, placeholder: '3' },
      { key: 'topics', label: 'Topics / patterns', type: 'text', placeholder: 'Graphs, DP' },
      { key: 'hardest', label: 'Hardest today', type: 'select', options: ['Easy', 'Medium', 'Hard'] },
    ],
  },
  {
    type: 'dev',
    label: 'Development',
    shortLabel: 'Dev',
    description: 'Projects, PRs, and implementation',
    defaultName: 'Development',
    accent: 'bg-blue-400',
    fields: [
      { key: 'project', label: 'Project', type: 'text', placeholder: 'FutureTracker API' },
      { key: 'shipped', label: 'What shipped', type: 'text', placeholder: 'Pagination + tests' },
    ],
  },
  {
    type: 'system_design',
    label: 'System design',
    shortLabel: 'Design',
    description: 'Architecture notes and trade-offs',
    defaultName: 'System design',
    accent: 'bg-violet-400',
    fields: [
      { key: 'topic', label: 'Topic', type: 'text', placeholder: 'Rate limiter' },
      { key: 'resource', label: 'Resource', type: 'text', placeholder: 'Alex Xu, Grokking' },
    ],
  },
  {
    type: 'mock',
    label: 'Mock interviews',
    shortLabel: 'Mocks',
    description: 'Timed rounds and feedback',
    defaultName: 'Mock interviews',
    accent: 'bg-amber-400',
    fields: [
      { key: 'platform', label: 'Platform / peer', type: 'text', placeholder: 'Pramp, peer, company mock' },
      { key: 'roundType', label: 'Round type', type: 'text', placeholder: 'DSA, design, behavioral' },
    ],
  },
  {
    type: 'reading',
    label: 'Reading / courses',
    shortLabel: 'Reading',
    description: 'Chapters, lectures, and notes',
    defaultName: 'Reading',
    accent: 'bg-cyan-400',
    fields: [
      { key: 'resource', label: 'Resource', type: 'text', placeholder: 'CLRS, course lecture' },
      { key: 'section', label: 'Section', type: 'text', placeholder: 'Chapter 15' },
    ],
  },
  {
    type: 'custom',
    label: 'Custom',
    shortLabel: 'Custom',
    description: 'Anything else you want to keep honest',
    defaultName: 'Prep',
    accent: 'bg-gray-400',
    fields: [],
  },
];

export const MOOD_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
];

export function getTrackTemplate(type) {
  return TRACK_TEMPLATES.find((template) => template.type === type) || TRACK_TEMPLATES[TRACK_TEMPLATES.length - 1];
}

export function emptyMetadata(type) {
  const metadata = {};
  getTrackTemplate(type).fields.forEach((field) => {
    metadata[field.key] = '';
  });
  return metadata;
}
