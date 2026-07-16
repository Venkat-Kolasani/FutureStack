import axios from 'axios';
import { toast } from 'react-toastify';
import { analytics } from '../lib/analytics';

const configuredApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
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

let getAuthToken = null;

export const setAuthTokenGetter = (getter) => {
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
  list: async (opportunityId) => {
    const response = await api.get(`/opportunities/${opportunityId}/rounds`);
    return response.data;
  },

  create: async (opportunityId, roundData) => {
    const response = await api.post(`/opportunities/${opportunityId}/rounds`, roundData);
    return response.data;
  },

  update: async (opportunityId, roundId, roundData) => {
    const response = await api.patch(
      `/opportunities/${opportunityId}/rounds/${roundId}`,
      roundData
    );
    return response.data;
  },

  delete: async (opportunityId, roundId) => {
    const response = await api.delete(
      `/opportunities/${opportunityId}/rounds/${roundId}`
    );
    return response.data;
  },

  listUpcoming: async ({ from, to }) => {
    const response = await api.get('/opportunities/rounds/upcoming', {
      params: { from, to },
    });
    return response.data;
  },
};

export const opportunityService = {
    getAll: async () => {
        const response = await api.get('/opportunities');
        return response.data.items;
    },

    getPage: async (params = {}) => {
        const response = await api.get('/opportunities', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/opportunities/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/opportunities', data);
        // Track opportunity creation
        analytics.opportunityCreated(data.category);
        return response.data;
    },

    update: async (id, data, oldStatus = null) => {
        const response = await api.patch(`/opportunities/${id}`, data);
        // Track status changes if status was updated
        if (data.status && oldStatus && data.status !== oldStatus) {
            analytics.opportunityUpdated(response.data.category, oldStatus, data.status);
        }
        return response.data;
    },

    delete: async (id, category = null) => {
        const response = await api.delete(`/opportunities/${id}`);
        // Track deletion
        if (category) {
            analytics.opportunityDeleted(category);
        }
        return response.data;
    }
};

export const analyticsService = {
    getAnalytics: async () => {
        const response = await api.get('/analytics');
        return response.data;
    }
};

export const shareLinkService = {
    list: async () => {
        const response = await api.get('/share-links');
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/share-links', data);
        return response.data;
    },

    revoke: async (id) => {
        const response = await api.delete(`/share-links/${id}`);
        return response.data;
    },

    getPublic: async (token) => {
        const response = await publicApi.get(`/public/share-links/${token}`);
        return response.data;
    },

    verifyPasscode: async (token, passcode) => {
        const response = await publicApi.post(`/public/share-links/${token}/verify`, { passcode });
        return response.data;
    },
};

export const documentService = {
    getAll: async () => {
        const response = await api.get('/documents');
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/documents/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/documents', data);
        return response.data;
    },

    upload: async (file, metadata) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', metadata.name);
        formData.append('type', metadata.type);
        if (metadata.version) formData.append('version', metadata.version);
        if (metadata.notes) formData.append('notes', metadata.notes);

        const response = await api.post('/documents/upload', formData, {
            headers: { 'Content-Type': undefined },
            timeout: 60000 // 60 seconds for file uploads
        });
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.patch(`/documents/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/documents/${id}`);
        return response.data;
    },

    assign: async (documentId, opportunityId) => {
        const response = await api.post(`/documents/${documentId}/assign`, {
            opportunity_id: opportunityId
        });
        return response.data;
    },

    unassign: async (documentId, opportunityId) => {
        const response = await api.delete(`/documents/${documentId}/unassign/${opportunityId}`);
        return response.data;
    },

    getByOpportunity: async (opportunityId) => {
        const response = await api.get(`/documents/by-opportunity/${opportunityId}`);
        return response.data;
    }
};

// =============================================================================
// AI RESUME CHECKER SERVICE
// =============================================================================

export const resumeCheckerService = {
    /**
     * Trigger a new AI resume check for a document.
     * LLM calls can take 20-60 s — the caller should show a long loading state.
     *
     * @param {string} documentId
     * @returns {Promise<object>} Completed resume_ai_checks row
     */
    runCheck: async (documentId) => {
        const response = await api.post(`/documents/${documentId}/ai-check`, {}, {
            timeout: 300000,
            skipErrorToast: true,
        });
        return response.data;
    },

    /**
     * Fetch the latest AI check result for a document (no new analysis).
     *
     * @param {string} documentId
     * @returns {Promise<object>} Latest resume_ai_checks row
     */
    getCheck: async (documentId) => {
        const response = await api.get(`/documents/${documentId}/ai-check`, {
            skipErrorToast: true,
        });
        return response.data;
    },
};

// =============================================================================
// AI SETTINGS (BYOK)
// =============================================================================

export const aiSettingsService = {
    get: async () => {
        const response = await api.get('/ai-settings');
        return response.data;
    },

    save: async ({ apiKey, provider = 'gemini', model = 'gemini-3.1-flash-lite' }) => {
        const payload = { provider, model };
        if (typeof apiKey === 'string' && apiKey.trim()) {
            payload.apiKey = apiKey.trim();
        }
        const response = await api.put('/ai-settings', payload, { skipErrorToast: true });
        return response.data;
    },

    remove: async () => {
        const response = await api.delete('/ai-settings');
        return response.data;
    },
};

export const healthCheck = async () => {
    const response = await api.get('/health');
    return response.data;
};

export const notificationService = {
    list: async ({ limit = 25 } = {}) => {
        const response = await api.get('/notifications', { params: { limit } });
        return response.data.notifications;
    },

    markRead: async (notificationId) => {
        const response = await api.patch(`/notifications/${notificationId}/read`);
        return response.data;
    },
};

// =============================================================================
// HACKATHON TEAM COLLABORATION SERVICE
// =============================================================================

export const hackathonService = {
    // Team management
    getTeam: async (opportunityId) => {
        const response = await api.get(`/hackathons/${opportunityId}/team`);
        return response.data;
    },

    createTeam: async (opportunityId, data) => {
        const response = await api.post(`/hackathons/${opportunityId}/team`, data);
        return response.data;
    },

    updateTeam: async (opportunityId, data) => {
        const response = await api.put(`/hackathons/${opportunityId}/team`, data);
        return response.data;
    },

    createInvite: async (opportunityId, data = {}) => {
        const response = await api.post(`/hackathons/${opportunityId}/invites`, data);
        return response.data;
    },

    acceptInvite: async (token) => {
        const response = await api.post(`/hackathons/invites/${token}/accept`);
        return response.data;
    },

    // Team members
    addMember: async (opportunityId, data) => {
        const response = await api.post(`/hackathons/${opportunityId}/team/members`, data);
        return response.data;
    },

    updateMember: async (opportunityId, memberId, data) => {
        const response = await api.put(`/hackathons/${opportunityId}/team/members/${memberId}`, data);
        return response.data;
    },

    removeMember: async (opportunityId, memberId) => {
        const response = await api.delete(`/hackathons/${opportunityId}/team/members/${memberId}`);
        return response.data;
    },

    // Ideas
    getIdeas: async (opportunityId) => {
        const response = await api.get(`/hackathons/${opportunityId}/ideas`);
        return response.data;
    },

    createIdea: async (opportunityId, data) => {
        const response = await api.post(`/hackathons/${opportunityId}/ideas`, data);
        return response.data;
    },

    updateIdea: async (opportunityId, ideaId, data) => {
        const response = await api.put(`/hackathons/${opportunityId}/ideas/${ideaId}`, data);
        return response.data;
    },

    deleteIdea: async (opportunityId, ideaId) => {
        const response = await api.delete(`/hackathons/${opportunityId}/ideas/${ideaId}`);
        return response.data;
    },

    voteIdea: async (opportunityId, ideaId) => {
        const response = await api.put(`/hackathons/${opportunityId}/ideas/${ideaId}/vote`);
        return response.data;
    },

    removeIdeaVote: async (opportunityId, ideaId) => {
        const response = await api.delete(`/hackathons/${opportunityId}/ideas/${ideaId}/vote`);
        return response.data;
    },

    // Tasks
    getTasks: async (opportunityId) => {
        const response = await api.get(`/hackathons/${opportunityId}/tasks`);
        return response.data;
    },

    createTask: async (opportunityId, data) => {
        const response = await api.post(`/hackathons/${opportunityId}/tasks`, data);
        return response.data;
    },

    updateTask: async (opportunityId, taskId, data) => {
        const response = await api.put(`/hackathons/${opportunityId}/tasks/${taskId}`, data);
        return response.data;
    },

    deleteTask: async (opportunityId, taskId) => {
        const response = await api.delete(`/hackathons/${opportunityId}/tasks/${taskId}`);
        return response.data;
    },

    // Checklist
    getChecklist: async (opportunityId) => {
        const response = await api.get(`/hackathons/${opportunityId}/checklist`);
        return response.data;
    },

    addChecklistItem: async (opportunityId, data) => {
        const response = await api.post(`/hackathons/${opportunityId}/checklist`, data);
        return response.data;
    },

    updateChecklistItem: async (opportunityId, itemId, data) => {
        const response = await api.put(`/hackathons/${opportunityId}/checklist/${itemId}`, data);
        return response.data;
    },

    deleteChecklistItem: async (opportunityId, itemId) => {
        const response = await api.delete(`/hackathons/${opportunityId}/checklist/${itemId}`);
        return response.data;
    }
};

// =============================================================================
// INTERVIEW PREPARATION SERVICE
// =============================================================================

export const interviewPrepService = {
    // Main prep record
    getPrep: async (opportunityId) => {
        const response = await api.get(`/interview-prep/${opportunityId}`);
        return response.data;
    },

    createPrep: async (opportunityId, data) => {
        const response = await api.post(`/interview-prep/${opportunityId}`, data);
        return response.data;
    },

    updatePrep: async (opportunityId, data) => {
        const response = await api.put(`/interview-prep/${opportunityId}`, data);
        return response.data;
    },

    // Interview questions
    createQuestion: async (opportunityId, data) => {
        const response = await api.post(`/interview-prep/${opportunityId}/questions`, data);
        return response.data;
    },

    updateQuestion: async (opportunityId, questionId, data) => {
        const response = await api.put(`/interview-prep/${opportunityId}/questions/${questionId}`, data);
        return response.data;
    },

    deleteQuestion: async (opportunityId, questionId) => {
        const response = await api.delete(`/interview-prep/${opportunityId}/questions/${questionId}`);
        return response.data;
    },

    // Technical topics
    createTopic: async (opportunityId, data) => {
        const response = await api.post(`/interview-prep/${opportunityId}/topics`, data);
        return response.data;
    },

    updateTopic: async (opportunityId, topicId, data) => {
        const response = await api.put(`/interview-prep/${opportunityId}/topics/${topicId}`, data);
        return response.data;
    },

    deleteTopic: async (opportunityId, topicId) => {
        const response = await api.delete(`/interview-prep/${opportunityId}/topics/${topicId}`);
        return response.data;
    },

    // Behavioral prep (STAR method)
    createBehavioral: async (opportunityId, data) => {
        const response = await api.post(`/interview-prep/${opportunityId}/behavioral`, data);
        return response.data;
    },

    updateBehavioral: async (opportunityId, behavioralId, data) => {
        const response = await api.put(`/interview-prep/${opportunityId}/behavioral/${behavioralId}`, data);
        return response.data;
    },

    deleteBehavioral: async (opportunityId, behavioralId) => {
        const response = await api.delete(`/interview-prep/${opportunityId}/behavioral/${behavioralId}`);
        return response.data;
    }
};

export default api;
