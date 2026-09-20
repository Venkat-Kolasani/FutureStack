const express = require('express');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const { fillHeatmapDays, HEATMAP_DAY_COUNT, resolveHeatmapEndDate, shiftIsoDate } = require('../lib/progressHeatmap');
const {
    createTrackSchema,
    updateTrackSchema,
    createLogSchema,
    updateLogSchema,
    heatmapQuerySchema,
    dateParamSchema,
    trackIdParamSchema,
    idParamSchema,
    assertLoggedDayHasNote,
} = require('../validation/progress-schemas');

const router = express.Router();

const isDatabaseUnavailableError = (error) => {
    const msg = String(error?.message || '').toLowerCase();
    return msg.includes('fetch failed') || msg.includes('network');
};

const handleRouteError = (res, action, error, defaultMessage) => {
    const unavailable = isDatabaseUnavailableError(error);

    console.error(`${action} error:`, {
        type: 'ROUTE_ERROR',
        service: 'supabase',
        unavailable,
        message: error?.message,
        code: error?.code,
        details: error?.details,
    });

    if (unavailable) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database is currently unavailable. Please try again in a moment.',
        });
    }

    return res.status(500).json({ error: defaultMessage });
};

function serializeTrack(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        templateType: row.template_type,
        isActive: row.is_active,
        createdAt: row.created_at,
    };
}

function serializeLog(row, trackById = {}) {
    if (!row) return null;
    const track = row.progress_tracks || trackById[row.track_id] || null;
    return {
        id: row.id,
        trackId: row.track_id,
        logDate: row.log_date,
        didLog: row.did_log,
        whatDidYouDo: row.what_did_you_do || '',
        whatDidYouLearn: row.what_did_you_learn || '',
        metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
        mood: row.mood,
        createdAt: row.created_at,
        trackName: track?.name || null,
        templateType: track?.template_type || null,
    };
}

async function findOwnedTrack(trackId, userId) {
    const { data, error } = await supabase
        .from('progress_tracks')
        .select('*')
        .eq('id', trackId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

router.get('/tracks', async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const { data, error } = await supabase
            .from('progress_tracks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return res.json((data || []).map(serializeTrack));
    } catch (error) {
        return handleRouteError(res, 'LIST_PROGRESS_TRACKS', error, 'Failed to fetch progress tracks');
    }
});

router.post('/tracks', validate(createTrackSchema), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const { name, templateType } = req.body;

        const { data, error } = await supabase
            .from('progress_tracks')
            .insert({
                user_id: userId,
                name,
                template_type: templateType,
            })
            .select()
            .single();

        if (error) throw error;
        return res.status(201).json(serializeTrack(data));
    } catch (error) {
        return handleRouteError(res, 'CREATE_PROGRESS_TRACK', error, 'Failed to create progress track');
    }
});

router.patch('/tracks/:id', validate(idParamSchema, 'params'), validate(updateTrackSchema), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const updates = {};
        if (req.body.name !== undefined) updates.name = req.body.name;
        if (req.body.isActive !== undefined) updates.is_active = req.body.isActive;

        const { data, error } = await supabase
            .from('progress_tracks')
            .update(updates)
            .eq('id', req.params.id)
            .eq('user_id', userId)
            .select()
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Progress track not found' });
        }
        return res.json(serializeTrack(data));
    } catch (error) {
        return handleRouteError(res, 'UPDATE_PROGRESS_TRACK', error, 'Failed to update progress track');
    }
});

router.delete('/tracks/:id', validate(idParamSchema, 'params'), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const { data, error } = await supabase
            .from('progress_tracks')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Progress track not found' });
        }
        return res.status(204).send();
    } catch (error) {
        return handleRouteError(res, 'DELETE_PROGRESS_TRACK', error, 'Failed to delete progress track');
    }
});

router.get('/heatmap', validate(heatmapQuerySchema, 'query'), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const endDate = resolveHeatmapEndDate(req.query.end);
        const startDate = shiftIsoDate(endDate, -(HEATMAP_DAY_COUNT - 1));

        const { data: logs, error: logsError } = await supabase
            .from('progress_logs')
            .select('log_date, did_log, track_id')
            .eq('user_id', userId)
            .eq('did_log', true)
            .gte('log_date', startDate)
            .lte('log_date', endDate);

        if (logsError) throw logsError;

        const { data: tracks, error: tracksError } = await supabase
            .from('progress_tracks')
            .select('id, name')
            .eq('user_id', userId);

        if (tracksError) throw tracksError;

        const nameById = new Map((tracks || []).map((track) => [track.id, track.name]));
        const rows = (logs || []).map((log) => ({
            log_date: log.log_date,
            did_log: log.did_log,
            track_name: nameById.get(log.track_id) || null,
        }));

        return res.json(fillHeatmapDays(rows, endDate));
    } catch (error) {
        return handleRouteError(res, 'GET_PROGRESS_HEATMAP', error, 'Failed to fetch progress heatmap');
    }
});

router.get('/logs/date/:date', validate(dateParamSchema, 'params'), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const { data: logs, error } = await supabase
            .from('progress_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('log_date', req.params.date)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const { data: tracks, error: tracksError } = await supabase
            .from('progress_tracks')
            .select('id, name, template_type')
            .eq('user_id', userId);

        if (tracksError) throw tracksError;

        const trackById = Object.fromEntries((tracks || []).map((track) => [track.id, track]));
        return res.json((logs || []).map((log) => serializeLog(log, trackById)));
    } catch (error) {
        return handleRouteError(res, 'LIST_PROGRESS_LOGS_BY_DATE', error, 'Failed to fetch progress logs');
    }
});

router.get('/logs/:trackId', validate(trackIdParamSchema, 'params'), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const track = await findOwnedTrack(req.params.trackId, userId);
        if (!track) {
            return res.status(404).json({ error: 'Progress track not found' });
        }

        const { data, error } = await supabase
            .from('progress_logs')
            .select('*')
            .eq('user_id', userId)
            .eq('track_id', req.params.trackId)
            .order('log_date', { ascending: false });

        if (error) throw error;
        return res.json((data || []).map((log) => serializeLog(log, { [track.id]: track })));
    } catch (error) {
        return handleRouteError(res, 'LIST_PROGRESS_LOGS', error, 'Failed to fetch progress logs');
    }
});

router.post('/logs', validate(createLogSchema), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const track = await findOwnedTrack(req.body.trackId, userId);
        if (!track) {
            return res.status(404).json({ error: 'Progress track not found' });
        }

        const payload = {
            user_id: userId,
            track_id: req.body.trackId,
            log_date: req.body.logDate,
            did_log: req.body.didLog,
            what_did_you_do: req.body.didLog ? req.body.whatDidYouDo : (req.body.whatDidYouDo || null),
            what_did_you_learn: req.body.whatDidYouLearn || null,
            metadata: req.body.metadata || {},
            mood: req.body.mood || null,
        };

        const { data, error } = await supabase
            .from('progress_logs')
            .upsert(payload, { onConflict: 'track_id,log_date' })
            .select()
            .single();

        if (error) throw error;
        return res.status(201).json(serializeLog(data, { [track.id]: track }));
    } catch (error) {
        return handleRouteError(res, 'UPSERT_PROGRESS_LOG', error, 'Failed to save progress log');
    }
});

router.patch('/logs/:id', validate(idParamSchema, 'params'), validate(updateLogSchema), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;

        const { data: existing, error: fetchError } = await supabase
            .from('progress_logs')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing) {
            return res.status(404).json({ error: 'Progress log not found' });
        }

        const nextDidLog = req.body.didLog !== undefined ? req.body.didLog : existing.did_log;
        const nextWhatDidYouDo = req.body.whatDidYouDo !== undefined
            ? req.body.whatDidYouDo
            : (existing.what_did_you_do || '');

        const noteError = assertLoggedDayHasNote(nextDidLog, nextWhatDidYouDo);
        if (noteError) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'The request data is invalid',
                details: [noteError],
            });
        }

        const updates = {};
        if (req.body.didLog !== undefined) updates.did_log = req.body.didLog;
        if (req.body.whatDidYouDo !== undefined) updates.what_did_you_do = req.body.whatDidYouDo;
        if (req.body.whatDidYouLearn !== undefined) updates.what_did_you_learn = req.body.whatDidYouLearn;
        if (req.body.metadata !== undefined) updates.metadata = req.body.metadata;
        if (req.body.mood !== undefined) updates.mood = req.body.mood;
        if (req.body.logDate !== undefined) updates.log_date = req.body.logDate;

        const { data, error } = await supabase
            .from('progress_logs')
            .update(updates)
            .eq('id', req.params.id)
            .eq('user_id', userId)
            .select()
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Progress log not found' });
        }

        const track = await findOwnedTrack(data.track_id, userId);
        const trackById = track ? { [track.id]: track } : {};
        return res.json(serializeLog(data, trackById));
    } catch (error) {
        return handleRouteError(res, 'UPDATE_PROGRESS_LOG', error, 'Failed to update progress log');
    }
});

router.delete('/logs/:id', validate(idParamSchema, 'params'), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const { data, error } = await supabase
            .from('progress_logs')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Progress log not found' });
        }
        return res.status(204).send();
    } catch (error) {
        return handleRouteError(res, 'DELETE_PROGRESS_LOG', error, 'Failed to delete progress log');
    }
});

module.exports = router;
