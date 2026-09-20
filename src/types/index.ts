export type OpportunityCategory = 'internship' | 'hackathon';
export type OpportunityStatus =
  | 'applied'
  | 'interviewed'
  | 'shortlisted'
  | 'selected'
  | 'rejected'
  | 'ghosted';
export type CampusMode = 'on_campus' | 'off_campus';

export type Opportunity = {
  id: string;
  title: string;
  description?: string | null;
  link?: string | null;
  deadline?: string | null;
  applied_on?: string | null;
  category?: OpportunityCategory | null;
  status?: OpportunityStatus;
  notes?: string | null;
  campus_mode?: CampusMode | null;
  current_round_number?: number | null;
  rejected_round_number?: number | null;
};

export type RoundType =
  | 'resume_shortlisted'
  | 'oa'
  | 'assignment'
  | 'technical_assignment'
  | 'technical'
  | 'hr'
  | 'group_discussion'
  | 'managerial'
  | 'final'
  | 'other';

export type RoundResult = 'pending' | 'cleared' | 'rejected' | 'skipped';

export type Round = {
  id: string;
  opportunity_id: string;
  round_number: number;
  round_type: RoundType;
  result: RoundResult;
  scheduled_date?: string | null;
  notes?: string | null;
};

export type Hackathon = Opportunity & {
  category: 'hackathon';
};

/**
 * Projection returned by `GET /opportunities/rounds/upcoming`. It is camelCased and
 * joined with the parent opportunity, so it is not a plain `Round` row.
 */
export type UpcomingRound = {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  roundNumber: number;
  roundType: RoundType;
  scheduledDate: string;
  scheduledTime?: string | null;
  result: RoundResult;
};

export type ProgressTrack = {
  id: string;
  name: string;
  templateType?: string;
  isActive?: boolean;
};

export type ProgressLog = {
  id: string;
  trackId: string;
  logDate: string;
  payload?: Record<string, unknown>;
};

export type UserDocument = {
  id: string;
  name: string;
  type?: 'resume' | 'cover_letter' | 'portfolio' | 'other';
  file_url?: string | null;
  is_external?: boolean;
};

export type AppNotification = {
  id: string;
  title: string;
  body?: string | null;
  created_at: string;
  read_at?: string | null;
};

/** Mirrors `buildInterviewPipelineAnalytics` in backend/src/lib/interviewPipelineAnalytics.js. */
export type PipelineRejection = {
  opportunityId: string;
  title: string;
  roundNumber: number | null;
  roundType: string | null;
  roundTypeLabel: string;
  clearedRoundsBeforeRejection: number;
};

export type PipelineRoundTypeFunnel = {
  roundType: string;
  label: string;
  reached: number;
  cleared: number;
  rejected: number;
  clearanceRate: number | null;
};

export type PipelineAnalytics = {
  internshipCount: number;
  trackedWithRounds: number;
  activeInPipeline: number;
  rejectedCount: number;
  averageRoundsBeforeRejection: number | null;
  rejectionByRoundNumber: { roundNumber: number; count: number }[];
  rejectionByRoundType: { roundType: string; label: string; count: number }[];
  funnelByRoundType: PipelineRoundTypeFunnel[];
  stageReachByRoundNumber: { roundNumber: number; reached: number; stillActive: number }[];
  rejections: PipelineRejection[];
};

export type OpportunityStatistics = Record<OpportunityStatus | 'total', number>;

export type HeatmapEntry = {
  date: string;
  count: number;
  tracks?: string[];
};

export type HeatmapDay = {
  date: string;
  count: number;
  tracks: string[];
  intensity: number | null;
  isPadding: boolean;
  isToday: boolean;
  weekday: number;
  month: number;
  dayOfMonth: number;
};

export type HeatmapGrid = {
  weeks: HeatmapDay[][];
  monthLabels: (string | null)[];
  today: string;
  rangeStart: string;
  rangeEnd: string;
};
