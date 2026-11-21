import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { toast } from 'react-toastify';
import { analytics } from '../lib/analytics';
import { getDefaultApiUrl } from '../config/apiUrl';
import type {
  AppNotification,
  Opportunity,
  OpportunityCategory,
  OpportunityStatus,
  PipelineAnalytics,
  ProgressLog,
  ProgressTrack,
  Round,
  UpcomingRound,
  UserDocument,
} from '../types';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Suppress the global error toast so a caller can render the failure inline. */
    skipErrorToast?: boolean;
  }
}

/** Server payloads that do not yet have a checked-in domain model. */
export type ApiRecord = Record<string, unknown>;

type AuthTokenGetter = () => Promise<string | null>;

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || getDefaultApiUrl(process.env.NODE_ENV);
const API_BASE_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/v1')
    ? configuredApiUrl.replace(/\/$/, '')
    : `${configuredApiUrl.replace(/\/$/, '')}/v1`;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

const publicApi = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

let getAuthToken: AuthTokenGetter | null = null;

export const setAuthTokenGetter = (getter: AuthTokenGetter | null) => {
    getAuthToken = getter;
};

api.interceptors.request.use(
    async (config) => {
        let tokenAttached = false;

        if (getAuthToken) {
            try {
                const token = await getAuthToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                    tokenAttached = true;
                }
            } catch (error) {
                console.error('Error getting auth token:', error);
            }
        }

        const isBrowser = typeof window !== 'undefined';
        if (isBrowser && process.env.NODE_ENV !== 'production' && config.url?.startsWith('/')) {
            console.debug('[API] Request auth status:', {
                method: config.method?.toUpperCase(),
                url: config.url,
                tokenGetterConfigured: Boolean(getAuthToken),
                tokenAttached,
            });
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            if (!error.config?.skipErrorToast) {
                toast.error('Network error. Please check your connection.');
            }
            return Promise.reject(error);
        }

        const status = error.response?.status;
        const message = error.response?.data?.message || error.response?.data?.error;
        const skipToast = Boolean(error.config?.skipErrorToast);

        if (process.env.NODE_ENV !== 'production') {
            console.error('[API] Response error:', {
                status,
                url: error.config?.url,
                method: error.config?.method?.toUpperCase(),
                message,
            });
        }

        if (!skipToast) {
            switch (status) {
                case 401:
                    toast.error('Session expired. Please sign in again.');
                    break;
                case 403:
                    toast.error('You don\'t have permission to do that.');
                    break;
                case 404:
                    toast.error(message || 'Resource not found.');
                    break;
                case 422:
                    toast.error(message || 'Invalid data provided.');
                    break;
                case 500:
                    toast.error('Server error. Please try again later.');
                    break;
                case 503:
                    toast.error(message || 'Service temporarily unavailable. Please try again shortly.');
                    break;
                default:
                    if (status >= 400) {
                        toast.error(message || 'Something went wrong.');
                    }
            }
        }

        return Promise.reject(error);
    }
);

export const roundService = {
  list: async (opportunityId: string): Promise<Round[]> => {
    const response = await api.get<Round[]>(`/opportunities/${opportunityId}/rounds`);
    return response.data;
  },

  create: async (opportunityId: string, roundData: Partial<Round>): Promise<Round> => {
    const response = await api.post<Round>(`/opportunities/${opportunityId}/rounds`, roundData);
    return response.data;
  },

  update: async (opportunityId: string, roundId: string, roundData: Partial<Round>): Promise<Round> => {
    const response = await api.patch<Round>(
      `/opportunities/${opportunityId}/rounds/${roundId}`,
      roundData
    );
    return response.data;
  },

  delete: async (opportunityId: string, roundId: string): Promise<ApiRecord> => {
    const response = await api.delete<ApiRecord>(
      `/opportunities/${opportunityId}/rounds/${roundId}`
    );
    return response.data;
  },

  listUpcoming: async ({ from, to }: { from: string; to: string }): Promise<UpcomingRound[]> => {
    const response = await api.get<UpcomingRound[]>('/opportunities/rounds/upcoming', {
      params: { from, to },
    });
    return response.data;
  },
};

export type OpportunityPage = {
    items: Opportunity[];
    nextCursor?: string | null;
};

export const opportunityService = {
    getAll: async (): Promise<Opportunity[]> => {
        const items: Opportunity[] = [];
        let cursor: string | null = null;

        do {
            const response: AxiosResponse<OpportunityPage> = await api.get<OpportunityPage>('/opportunities', {
                params: {
                    limit: 100,
                    ...(cursor ? { cursor } : {}),
                },
            });
            const pageItems = response.data?.items;

            if (!Array.isArray(pageItems)) {
                throw new Error('Invalid opportunities response');
            }

            items.push(...pageItems);
            cursor = response.data.nextCursor || null;
        } while (cursor);

        return items;
    },

    getPage: async (params: Record<string, unknown> = {}): Promise<OpportunityPage> => {
        const response = await api.get<OpportunityPage>('/opportunities', { params });
        return response.data;
    },

    getById: async (id: string): Promise<Opportunity> => {
        const response = await api.get<Opportunity>(`/opportunities/${id}`);
        return response.data;
    },

    create: async (data: Partial<Opportunity>): Promise<Opportunity> => {
        const response = await api.post<Opportunity>('/opportunities', data);
        analytics.opportunityCreated(data.category ?? 'unknown');
        return response.data;
    },

    update: async (
        id: string,
        data: Partial<Opportunity>,
        oldStatus: OpportunityStatus | null = null
    ): Promise<Opportunity> => {
        const response = await api.patch<Opportunity>(`/opportunities/${id}`, data);
        if (data.status && oldStatus && data.status !== oldStatus) {
            analytics.opportunityUpdated(response.data.category ?? 'unknown', oldStatus, data.status);
        }
        return response.data;
    },

    delete: async (id: string, category: OpportunityCategory | null = null): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/opportunities/${id}`);
        if (category) {
            analytics.opportunityDeleted(category);
        }
        return response.data;
    }
};

export type AnalyticsResponse = ApiRecord & { interviewPipeline?: PipelineAnalytics };

export const analyticsService = {
    getAnalytics: async (): Promise<AnalyticsResponse> => {
        const response = await api.get<AnalyticsResponse>('/analytics');
        return response.data;
    }
};

export const shareLinkService = {
    list: async (): Promise<ApiRecord[]> => {
        const response = await api.get<ApiRecord[]>('/share-links');
        return response.data;
    },

    create: async (data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>('/share-links', data);
        return response.data;
    },

    revoke: async (id: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/share-links/${id}`);
        return response.data;
    },

    getPublic: async (token: string): Promise<ApiRecord> => {
        const response = await publicApi.get<ApiRecord>(`/public/share-links/${token}`);
        return response.data;
    },

    verifyPasscode: async (token: string, passcode: string): Promise<ApiRecord> => {
        const response = await publicApi.post<ApiRecord>(`/public/share-links/${token}/verify`, { passcode });
        return response.data;
    },
};

export type DocumentUploadMetadata = {
    name: string;
    type: string;
    version?: string;
    notes?: string;
};

export const documentService = {
    getAll: async (): Promise<UserDocument[]> => {
        const response = await api.get<UserDocument[]>('/documents');
        return response.data;
    },

    getById: async (id: string): Promise<UserDocument> => {
        const response = await api.get<UserDocument>(`/documents/${id}`);
        return response.data;
    },

    create: async (data: Partial<UserDocument>): Promise<UserDocument> => {
        const response = await api.post<UserDocument>('/documents', data);
        return response.data;
    },

    upload: async (file: File, metadata: DocumentUploadMetadata): Promise<UserDocument> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', metadata.name);
        formData.append('type', metadata.type);
        if (metadata.version) formData.append('version', metadata.version);
        if (metadata.notes) formData.append('notes', metadata.notes);

        const response = await api.post<UserDocument>('/documents/upload', formData, {
            // Let the browser set the multipart boundary.
            headers: { 'Content-Type': undefined },
            timeout: 60000
        });
        return response.data;
    },

    update: async (id: string, data: Partial<UserDocument>): Promise<UserDocument> => {
        const response = await api.patch<UserDocument>(`/documents/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/documents/${id}`);
        return response.data;
    },

    assign: async (documentId: string, opportunityId: string): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/documents/${documentId}/assign`, {
            opportunity_id: opportunityId
        });
        return response.data;
    },

    unassign: async (documentId: string, opportunityId: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/documents/${documentId}/unassign/${opportunityId}`);
        return response.data;
    },

    getByOpportunity: async (opportunityId: string): Promise<UserDocument[]> => {
        const response = await api.get<UserDocument[]>(`/documents/by-opportunity/${opportunityId}`);
        return response.data;
    }
};

// =============================================================================
// AI RESUME CHECKER SERVICE
// =============================================================================

export const resumeCheckerService = {
    /**
     * Trigger a new AI resume check. LLM calls can take 20-60 s, so the caller
     * must show a long loading state and render errors inline.
     */
    runCheck: async (documentId: string): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/documents/${documentId}/ai-check`, {}, {
            timeout: 300000,
            skipErrorToast: true,
        });
        return response.data;
    },

    /** Fetch the latest AI check result for a document without re-running analysis. */
    getCheck: async (documentId: string): Promise<ApiRecord> => {
        const response = await api.get<ApiRecord>(`/documents/${documentId}/ai-check`, {
            skipErrorToast: true,
        });
        return response.data;
    },
};

// =============================================================================
// AI SETTINGS (BYOK)
// =============================================================================

export type AiSettingsPayload = {
    apiKey?: string;
    provider?: string;
    model?: string;
};

export const aiSettingsService = {
    get: async (): Promise<ApiRecord> => {
        const response = await api.get<ApiRecord>('/ai-settings');
        return response.data;
    },

    save: async ({
        apiKey,
        provider = 'gemini',
        model = 'gemini-3.1-flash-lite',
    }: AiSettingsPayload): Promise<ApiRecord> => {
        const payload: AiSettingsPayload = { provider, model };
        if (typeof apiKey === 'string' && apiKey.trim()) {
            payload.apiKey = apiKey.trim();
        }
        const response = await api.put<ApiRecord>('/ai-settings', payload, { skipErrorToast: true });
        return response.data;
    },

    remove: async (provider?: string): Promise<ApiRecord> => {
        const query = provider ? `?provider=${encodeURIComponent(provider)}` : '';
        const response = await api.delete<ApiRecord>(`/ai-settings${query}`);
        return response.data;
    },
};

export const healthCheck = async (): Promise<ApiRecord> => {
    const response = await api.get<ApiRecord>('/health');
    return response.data;
};

export const notificationService = {
    list: async ({ limit = 25 }: { limit?: number } = {}): Promise<AppNotification[]> => {
        const response = await api.get<{ notifications: AppNotification[] }>('/notifications', {
            params: { limit },
        });
        return response.data.notifications;
    },

    markRead: async (notificationId: string): Promise<ApiRecord> => {
        const response = await api.patch<ApiRecord>(`/notifications/${notificationId}/read`);
        return response.data;
    },
};

export type NotificationPreferences = { deadlineEmailEnabled: boolean };

export const notificationPreferenceService = {
    get: async (): Promise<NotificationPreferences> => {
        const response = await api.get<NotificationPreferences>('/notification-preferences');
        return response.data;
    },

    update: async ({ deadlineEmailEnabled }: NotificationPreferences): Promise<NotificationPreferences> => {
        const response = await api.put<NotificationPreferences>('/notification-preferences', {
            deadlineEmailEnabled,
        });
        return response.data;
    },
};

export const progressService = {
    listTracks: async (): Promise<ProgressTrack[]> => {
        const response = await api.get<ProgressTrack[]>('/progress/tracks');
        return response.data;
    },

    createTrack: async (payload: Partial<ProgressTrack>): Promise<ProgressTrack> => {
        const response = await api.post<ProgressTrack>('/progress/tracks', payload);
        return response.data;
    },

    updateTrack: async (id: string, payload: Partial<ProgressTrack>): Promise<ProgressTrack> => {
        const response = await api.patch<ProgressTrack>(`/progress/tracks/${id}`, payload);
        return response.data;
    },

    deleteTrack: async (id: string): Promise<void> => {
        await api.delete(`/progress/tracks/${id}`);
    },

    listLogsByTrack: async (trackId: string): Promise<ProgressLog[]> => {
        const response = await api.get<ProgressLog[]>(`/progress/logs/${trackId}`);
        return response.data;
    },

    listLogsByDate: async (date: string): Promise<ProgressLog[]> => {
        const response = await api.get<ProgressLog[]>(`/progress/logs/date/${date}`);
        return response.data;
    },

    saveLog: async (payload: Partial<ProgressLog>): Promise<ProgressLog> => {
        const response = await api.post<ProgressLog>('/progress/logs', payload);
        return response.data;
    },

    updateLog: async (id: string, payload: Partial<ProgressLog>): Promise<ProgressLog> => {
        const response = await api.patch<ProgressLog>(`/progress/logs/${id}`, payload);
        return response.data;
    },

    deleteLog: async (id: string): Promise<void> => {
        await api.delete(`/progress/logs/${id}`);
    },

    getHeatmap: async (end?: string): Promise<ApiRecord> => {
        const response = await api.get<ApiRecord>('/progress/heatmap', {
            params: end ? { end } : undefined,
        });
        return response.data;
    },
};

// =============================================================================
// HACKATHON TEAM COLLABORATION SERVICE
// =============================================================================

export const hackathonService = {
    // Team management
    getTeam: async (opportunityId: string): Promise<ApiRecord> => {
        const response = await api.get<ApiRecord>(`/hackathons/${opportunityId}/team`);
        return response.data;
    },

    createTeam: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/hackathons/${opportunityId}/team`, data);
        return response.data;
    },

    updateTeam: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/hackathons/${opportunityId}/team`, data);
        return response.data;
    },

    createInvite: async (opportunityId: string, data: ApiRecord = {}): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/hackathons/${opportunityId}/invites`, data);
        return response.data;
    },

    acceptInvite: async (token: string): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/hackathons/invites/${token}/accept`);
        return response.data;
    },

    // Team members
    addMember: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/hackathons/${opportunityId}/team/members`, data);
        return response.data;
    },

    updateMember: async (opportunityId: string, memberId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/hackathons/${opportunityId}/team/members/${memberId}`, data);
        return response.data;
    },

    removeMember: async (opportunityId: string, memberId: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/hackathons/${opportunityId}/team/members/${memberId}`);
        return response.data;
    },

    // Ideas
    getIdeas: async (opportunityId: string): Promise<ApiRecord[]> => {
        const response = await api.get<ApiRecord[]>(`/hackathons/${opportunityId}/ideas`);
        return response.data;
    },

    createIdea: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/hackathons/${opportunityId}/ideas`, data);
        return response.data;
    },

    updateIdea: async (opportunityId: string, ideaId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/hackathons/${opportunityId}/ideas/${ideaId}`, data);
        return response.data;
    },

    deleteIdea: async (opportunityId: string, ideaId: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/hackathons/${opportunityId}/ideas/${ideaId}`);
        return response.data;
    },

    voteIdea: async (opportunityId: string, ideaId: string): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/hackathons/${opportunityId}/ideas/${ideaId}/vote`);
        return response.data;
    },

    removeIdeaVote: async (opportunityId: string, ideaId: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/hackathons/${opportunityId}/ideas/${ideaId}/vote`);
        return response.data;
    },

    // Tasks
    getTasks: async (opportunityId: string): Promise<ApiRecord[]> => {
        const response = await api.get<ApiRecord[]>(`/hackathons/${opportunityId}/tasks`);
        return response.data;
    },

    createTask: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/hackathons/${opportunityId}/tasks`, data);
        return response.data;
    },

    updateTask: async (opportunityId: string, taskId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/hackathons/${opportunityId}/tasks/${taskId}`, data);
        return response.data;
    },

    deleteTask: async (opportunityId: string, taskId: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/hackathons/${opportunityId}/tasks/${taskId}`);
        return response.data;
    },

    // Checklist
    getChecklist: async (opportunityId: string): Promise<ApiRecord[]> => {
        const response = await api.get<ApiRecord[]>(`/hackathons/${opportunityId}/checklist`);
        return response.data;
    },

    addChecklistItem: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/hackathons/${opportunityId}/checklist`, data);
        return response.data;
    },

    updateChecklistItem: async (opportunityId: string, itemId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/hackathons/${opportunityId}/checklist/${itemId}`, data);
        return response.data;
    },

    deleteChecklistItem: async (opportunityId: string, itemId: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/hackathons/${opportunityId}/checklist/${itemId}`);
        return response.data;
    }
};

// =============================================================================
// INTERVIEW PREPARATION SERVICE
// =============================================================================

export const interviewPrepService = {
    // Main prep record
    getPrep: async (opportunityId: string): Promise<ApiRecord> => {
        const response = await api.get<ApiRecord>(`/interview-prep/${opportunityId}`);
        return response.data;
    },

    createPrep: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/interview-prep/${opportunityId}`, data);
        return response.data;
    },

    updatePrep: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/interview-prep/${opportunityId}`, data);
        return response.data;
    },

    // Interview questions
    createQuestion: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/interview-prep/${opportunityId}/questions`, data);
        return response.data;
    },

    updateQuestion: async (opportunityId: string, questionId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/interview-prep/${opportunityId}/questions/${questionId}`, data);
        return response.data;
    },

    deleteQuestion: async (opportunityId: string, questionId: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/interview-prep/${opportunityId}/questions/${questionId}`);
        return response.data;
    },

    // Technical topics
    createTopic: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/interview-prep/${opportunityId}/topics`, data);
        return response.data;
    },

    updateTopic: async (opportunityId: string, topicId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/interview-prep/${opportunityId}/topics/${topicId}`, data);
        return response.data;
    },

    deleteTopic: async (opportunityId: string, topicId: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/interview-prep/${opportunityId}/topics/${topicId}`);
        return response.data;
    },

    // Behavioral prep (STAR method)
    createBehavioral: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/interview-prep/${opportunityId}/behavioral`, data);
        return response.data;
    },

    updateBehavioral: async (opportunityId: string, behavioralId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.put<ApiRecord>(`/interview-prep/${opportunityId}/behavioral/${behavioralId}`, data);
        return response.data;
    },

    deleteBehavioral: async (opportunityId: string, behavioralId: string): Promise<ApiRecord> => {
        const response = await api.delete<ApiRecord>(`/interview-prep/${opportunityId}/behavioral/${behavioralId}`);
        return response.data;
    },

    listStories: async (): Promise<ApiRecord> => {
        const response = await api.get<ApiRecord>('/interview-prep/stories');
        return response.data;
    },

    seedStarter: async (opportunityId: string, focus: string): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/interview-prep/${opportunityId}/starter`, { focus });
        return response.data;
    },

    generate: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/interview-prep/${opportunityId}/generate`, data, { skipErrorToast: true });
        return response.data;
    },

    acceptGenerated: async (opportunityId: string, data: ApiRecord): Promise<ApiRecord> => {
        const response = await api.post<ApiRecord>(`/interview-prep/${opportunityId}/generate/accept`, data);
        return response.data;
    },
};

export default api;
