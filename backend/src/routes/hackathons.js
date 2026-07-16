const express = require('express');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const {
    createTeamSchema,
    updateTeamSchema,
    createTeamMemberSchema,
    updateTeamMemberSchema,
    createIdeaSchema,
    updateIdeaSchema,
    createTaskSchema,
    updateTaskSchema,
    createChecklistItemSchema,
    updateChecklistItemSchema,
    idParamSchema,
    hackathonIdeaParamsSchema
} = require('../validation/schemas');

const router = express.Router();

/**
 * Audit logging helper
 */
function logAudit(action, userId, resourceId = null, outcome = 'success', details = {}) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        action,
        userId,
        resourceId,
        outcome,
        details
    }));
}

/**
 * Helper: Verify user owns the opportunity and it's a hackathon
 */
async function verifyHackathonOwnership(opportunityId, userId) {
    const { data, error } = await supabase
        .from('opportunities')
        .select('id, category')
        .eq('id', opportunityId)
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return { valid: false, error: 'Opportunity not found' };
    }

    if (data.category !== 'hackathon') {
        return { valid: false, error: 'This feature is only available for hackathons' };
    }

    return { valid: true, data };
}

/**
 * Helper: Get team for an opportunity
 */
async function getTeamForOpportunity(opportunityId, userId) {
    const { data, error } = await supabase
        .from('hackathon_teams')
        .select('*')
        .eq('opportunity_id', opportunityId)
        .eq('user_id', userId)
        .single();

    // Handle table not existing (migration not run)
    if (error && error.code === '42P01') {
        return { team: null, error: { ...error, tableNotExists: true } };
    }

    return { team: data, error };
}

// =============================================================================
// TEAM MANAGEMENT
// =============================================================================

/**
 * GET /api/hackathons/:opportunityId/team
 * Get team for a hackathon (includes members)
 */
router.get('/:opportunityId/team', async (req, res) => {
    try {
        const { opportunityId } = req.params;

        const ownership = await verifyHackathonOwnership(opportunityId, req.auth.internalUserId);
        if (!ownership.valid) {
            return res.status(404).json({ error: ownership.error });
        }

        const { team, error } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);

        // Handle missing tables (migration not run)
        if (error && error.tableNotExists) {
            return res.status(503).json({
                error: 'Database tables not set up. Please run the hackathon-collaboration-migration.sql in Supabase.',
                code: 'TABLES_NOT_EXIST'
            });
        }

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (!team) {
            return res.json({ team: null, members: [] });
        }

        // Fetch members
        const { data: members, error: membersError } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', team.id)
            .order('created_at', { ascending: true });

        if (membersError) throw membersError;

        res.json({ team, members: members || [] });
    } catch (error) {
        console.error('Error fetching team:', error.message);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
});

/**
 * POST /api/hackathons/:opportunityId/team
 * Create team for a hackathon
 */
router.post('/:opportunityId/team', validate(createTeamSchema), async (req, res) => {
    try {
        const { opportunityId } = req.params;
        const { name, description } = req.body;

        const ownership = await verifyHackathonOwnership(opportunityId, req.auth.internalUserId);
        if (!ownership.valid) {
            return res.status(404).json({ error: ownership.error });
        }

        // Check if team already exists
        const { team: existingTeam } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (existingTeam) {
            return res.status(400).json({ error: 'Team already exists for this hackathon' });
        }

        const { data, error } = await supabase
            .from('hackathon_teams')
            .insert({
                opportunity_id: opportunityId,
                user_id: req.auth.internalUserId,
                name,
                description: description || null
            })
            .select()
            .single();

        if (error) throw error;

        logAudit('CREATE_HACKATHON_TEAM', req.auth.internalUserId, data.id, 'success');
        res.status(201).json({ team: data, members: [] });
    } catch (error) {
        console.error('Error creating team:', error.message);
        res.status(500).json({ error: 'Failed to create team' });
    }
});

/**
 * PUT /api/hackathons/:opportunityId/team
 * Update team details
 */
router.put('/:opportunityId/team', validate(updateTeamSchema), async (req, res) => {
    try {
        const { opportunityId } = req.params;
        const { name, description } = req.body;

        const ownership = await verifyHackathonOwnership(opportunityId, req.auth.internalUserId);
        if (!ownership.valid) {
            return res.status(404).json({ error: ownership.error });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const { data, error } = await supabase
            .from('hackathon_teams')
            .update(updateData)
            .eq('opportunity_id', opportunityId)
            .eq('user_id', req.auth.internalUserId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Team not found' });
            }
            throw error;
        }

        logAudit('UPDATE_HACKATHON_TEAM', req.auth.internalUserId, data.id, 'success');
        res.json(data);
    } catch (error) {
        console.error('Error updating team:', error.message);
        res.status(500).json({ error: 'Failed to update team' });
    }
});

// =============================================================================
// TEAM MEMBERS
// =============================================================================

/**
 * POST /api/hackathons/:opportunityId/team/members
 * Add team member
 */
router.post('/:opportunityId/team/members', validate(createTeamMemberSchema), async (req, res) => {
    try {
        const { opportunityId } = req.params;
        const { name, role, email } = req.body;

        const { team, error: teamError } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found. Create a team first.' });
        }

        const { data, error } = await supabase
            .from('team_members')
            .insert({
                team_id: team.id,
                name,
                role: role || 'Member',
                email: email || null
            })
            .select()
            .single();

        if (error) throw error;

        logAudit('ADD_TEAM_MEMBER', req.auth.internalUserId, data.id, 'success');
        res.status(201).json(data);
    } catch (error) {
        console.error('Error adding team member:', error.message);
        res.status(500).json({ error: 'Failed to add team member' });
    }
});

/**
 * PUT /api/hackathons/:opportunityId/team/members/:memberId
 * Update team member
 */
router.put('/:opportunityId/team/members/:memberId', validate(updateTeamMemberSchema), async (req, res) => {
    try {
        const { opportunityId, memberId } = req.params;
        const { name, role, email } = req.body;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (email !== undefined) updateData.email = email;

        const { data, error } = await supabase
            .from('team_members')
            .update(updateData)
            .eq('id', memberId)
            .eq('team_id', team.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Team member not found' });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating team member:', error.message);
        res.status(500).json({ error: 'Failed to update team member' });
    }
});

/**
 * DELETE /api/hackathons/:opportunityId/team/members/:memberId
 * Remove team member
 */
router.delete('/:opportunityId/team/members/:memberId', async (req, res) => {
    try {
        const { opportunityId, memberId } = req.params;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const { error, count } = await supabase
            .from('team_members')
            .delete({ count: 'exact' })
            .eq('id', memberId)
            .eq('team_id', team.id);

        if (error) throw error;

        if (count === 0) {
            return res.status(404).json({ error: 'Team member not found' });
        }

        logAudit('REMOVE_TEAM_MEMBER', req.auth.internalUserId, memberId, 'success');
        res.json({ success: true, message: 'Team member removed' });
    } catch (error) {
        console.error('Error removing team member:', error.message);
        res.status(500).json({ error: 'Failed to remove team member' });
    }
});

// =============================================================================
// BRAINSTORM IDEAS
// =============================================================================

/**
 * GET /api/hackathons/:opportunityId/ideas
 * Get all ideas for a hackathon
 */
router.get('/:opportunityId/ideas', async (req, res) => {
    try {
        const { opportunityId } = req.params;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.json([]);
        }

        const { data, error } = await supabase
            .from('brainstorm_ideas')
            .select('*')
            .eq('team_id', team.id)
            .order('vote_count', { ascending: false });

        if (error) throw error;

        const ideas = data || [];
        if (!ideas.length) return res.json([]);

        const { data: userVotes, error: userVotesError } = await supabase
            .from('idea_votes')
            .select('idea_id')
            .eq('user_id', req.auth.internalUserId)
            .in('idea_id', ideas.map((idea) => idea.id));

        if (userVotesError) throw userVotesError;

        const votedIdeaIds = new Set((userVotes || []).map((vote) => vote.idea_id));
        return res.json(ideas.map((idea) => ({
            ...idea,
            current_user_voted: votedIdeaIds.has(idea.id),
        })));
    } catch (error) {
        console.error('Error fetching ideas:', error.message);
        res.status(500).json({ error: 'Failed to fetch ideas' });
    }
});

/**
 * POST /api/hackathons/:opportunityId/ideas
 * Create new idea
 */
router.post('/:opportunityId/ideas', validate(createIdeaSchema), async (req, res) => {
    try {
        const { opportunityId } = req.params;
        const { title, description, category } = req.body;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found. Create a team first.' });
        }

        const { data, error } = await supabase
            .from('brainstorm_ideas')
            .insert({
                team_id: team.id,
                title,
                description: description || null,
                category: category || 'other'
            })
            .select()
            .single();

        if (error) throw error;

        logAudit('CREATE_IDEA', req.auth.internalUserId, data.id, 'success');
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating idea:', error.message);
        res.status(500).json({ error: 'Failed to create idea' });
    }
});

/**
 * PUT /api/hackathons/:opportunityId/ideas/:ideaId
 * Update idea
 */
router.put('/:opportunityId/ideas/:ideaId', validate(updateIdeaSchema), async (req, res) => {
    try {
        const { opportunityId, ideaId } = req.params;
        const { title, description, category, is_selected } = req.body;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (is_selected !== undefined) updateData.is_selected = is_selected;

        const { data, error } = await supabase
            .from('brainstorm_ideas')
            .update(updateData)
            .eq('id', ideaId)
            .eq('team_id', team.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Idea not found' });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating idea:', error.message);
        res.status(500).json({ error: 'Failed to update idea' });
    }
});

/**
 * DELETE /api/hackathons/:opportunityId/ideas/:ideaId
 * Delete idea
 */
router.delete('/:opportunityId/ideas/:ideaId', async (req, res) => {
    try {
        const { opportunityId, ideaId } = req.params;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const { error, count } = await supabase
            .from('brainstorm_ideas')
            .delete({ count: 'exact' })
            .eq('id', ideaId)
            .eq('team_id', team.id);

        if (error) throw error;

        if (count === 0) {
            return res.status(404).json({ error: 'Idea not found' });
        }

        logAudit('DELETE_IDEA', req.auth.internalUserId, ideaId, 'success');
        res.json({ success: true, message: 'Idea deleted' });
    } catch (error) {
        console.error('Error deleting idea:', error.message);
        res.status(500).json({ error: 'Failed to delete idea' });
    }
});

async function voteIdea(req, res) {
    try {
        const { opportunityId, ideaId } = req.params;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const { data, error } = await supabase.rpc('cast_idea_vote', {
            p_idea_id: ideaId,
            p_team_id: team.id,
            p_user_id: req.auth.internalUserId,
        });

        if (error) throw error;

        const vote = Array.isArray(data) ? data[0] : data;
        if (!vote) return res.status(404).json({ error: 'Idea not found' });

        return res.json({
            id: vote.idea_id,
            vote_count: vote.vote_count,
            current_user_voted: true,
            created: vote.created,
        });
    } catch (error) {
        console.error('Error voting on idea:', error.message);
        return res.status(500).json({ error: 'Failed to vote on idea' });
    }
}

async function removeIdeaVote(req, res) {
    try {
        const { opportunityId, ideaId } = req.params;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        const { data, error } = await supabase.rpc('remove_idea_vote', {
            p_idea_id: ideaId,
            p_team_id: team.id,
            p_user_id: req.auth.internalUserId,
        });

        if (error) throw error;

        const vote = Array.isArray(data) ? data[0] : data;
        if (!vote) return res.status(404).json({ error: 'Idea not found' });

        return res.json({
            id: vote.idea_id,
            vote_count: vote.vote_count,
            current_user_voted: false,
            removed: vote.removed,
        });
    } catch (error) {
        console.error('Error removing idea vote:', error.message);
        return res.status(500).json({ error: 'Failed to remove idea vote' });
    }
}

router.put('/:opportunityId/ideas/:ideaId/vote', validate(hackathonIdeaParamsSchema, 'params'), voteIdea);
router.delete('/:opportunityId/ideas/:ideaId/vote', validate(hackathonIdeaParamsSchema, 'params'), removeIdeaVote);
// Preserve the pre-v1 method while existing clients migrate to idempotent PUT.
router.post('/:opportunityId/ideas/:ideaId/vote', validate(hackathonIdeaParamsSchema, 'params'), voteIdea);

// =============================================================================
// HACKATHON TASKS
// =============================================================================

/**
 * GET /api/hackathons/:opportunityId/tasks
 * Get all tasks for a hackathon
 */
router.get('/:opportunityId/tasks', async (req, res) => {
    try {
        const { opportunityId } = req.params;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.json([]);
        }

        const { data, error } = await supabase
            .from('hackathon_tasks')
            .select('*')
            .eq('team_id', team.id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching tasks:', error.message);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

/**
 * POST /api/hackathons/:opportunityId/tasks
 * Create new task
 */
router.post('/:opportunityId/tasks', validate(createTaskSchema), async (req, res) => {
    try {
        const { opportunityId } = req.params;
        const { title, description, assigned_to, status, priority, due_date } = req.body;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found. Create a team first.' });
        }

        const { data, error } = await supabase
            .from('hackathon_tasks')
            .insert({
                team_id: team.id,
                title,
                description: description || null,
                assigned_to: assigned_to || null,
                status: status || 'todo',
                priority: priority || 'medium',
                due_date: due_date || null
            })
            .select()
            .single();

        if (error) throw error;

        logAudit('CREATE_TASK', req.auth.internalUserId, data.id, 'success');
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating task:', error.message);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

/**
 * PUT /api/hackathons/:opportunityId/tasks/:taskId
 * Update task
 */
router.put('/:opportunityId/tasks/:taskId', validate(updateTaskSchema), async (req, res) => {
    try {
        const { opportunityId, taskId } = req.params;
        const { title, description, assigned_to, status, priority, due_date } = req.body;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (due_date !== undefined) updateData.due_date = due_date;

        const { data, error } = await supabase
            .from('hackathon_tasks')
            .update(updateData)
            .eq('id', taskId)
            .eq('team_id', team.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Task not found' });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating task:', error.message);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

/**
 * DELETE /api/hackathons/:opportunityId/tasks/:taskId
 * Delete task
 */
router.delete('/:opportunityId/tasks/:taskId', async (req, res) => {
    try {
        const { opportunityId, taskId } = req.params;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const { error, count } = await supabase
            .from('hackathon_tasks')
            .delete({ count: 'exact' })
            .eq('id', taskId)
            .eq('team_id', team.id);

        if (error) throw error;

        if (count === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        logAudit('DELETE_TASK', req.auth.internalUserId, taskId, 'success');
        res.json({ success: true, message: 'Task deleted' });
    } catch (error) {
        console.error('Error deleting task:', error.message);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// =============================================================================
// SUBMISSION CHECKLIST
// =============================================================================

/**
 * GET /api/hackathons/:opportunityId/checklist
 * Get checklist items for a hackathon
 */
router.get('/:opportunityId/checklist', async (req, res) => {
    try {
        const { opportunityId } = req.params;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.json([]);
        }

        const { data, error } = await supabase
            .from('submission_checklist')
            .select('*')
            .eq('team_id', team.id)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Error fetching checklist:', error.message);
        res.status(500).json({ error: 'Failed to fetch checklist' });
    }
});

/**
 * POST /api/hackathons/:opportunityId/checklist
 * Add checklist item
 */
router.post('/:opportunityId/checklist', validate(createChecklistItemSchema), async (req, res) => {
    try {
        const { opportunityId } = req.params;
        const { title, sort_order } = req.body;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found. Create a team first.' });
        }

        // Get max sort_order if not provided
        let order = sort_order;
        if (order === undefined) {
            const { data: maxItem } = await supabase
                .from('submission_checklist')
                .select('sort_order')
                .eq('team_id', team.id)
                .order('sort_order', { ascending: false })
                .limit(1)
                .single();

            order = maxItem ? maxItem.sort_order + 1 : 0;
        }

        const { data, error } = await supabase
            .from('submission_checklist')
            .insert({
                team_id: team.id,
                title,
                sort_order: order
            })
            .select()
            .single();

        if (error) throw error;

        logAudit('CREATE_CHECKLIST_ITEM', req.auth.internalUserId, data.id, 'success');
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating checklist item:', error.message);
        res.status(500).json({ error: 'Failed to create checklist item' });
    }
});

/**
 * PUT /api/hackathons/:opportunityId/checklist/:itemId
 * Update checklist item (toggle complete, reorder, rename)
 */
router.put('/:opportunityId/checklist/:itemId', validate(updateChecklistItemSchema), async (req, res) => {
    try {
        const { opportunityId, itemId } = req.params;
        const { title, is_completed, sort_order } = req.body;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (sort_order !== undefined) updateData.sort_order = sort_order;
        if (is_completed !== undefined) {
            updateData.is_completed = is_completed;
            updateData.completed_at = is_completed ? new Date().toISOString() : null;
        }

        const { data, error } = await supabase
            .from('submission_checklist')
            .update(updateData)
            .eq('id', itemId)
            .eq('team_id', team.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Checklist item not found' });
            }
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error('Error updating checklist item:', error.message);
        res.status(500).json({ error: 'Failed to update checklist item' });
    }
});

/**
 * DELETE /api/hackathons/:opportunityId/checklist/:itemId
 * Delete checklist item
 */
router.delete('/:opportunityId/checklist/:itemId', async (req, res) => {
    try {
        const { opportunityId, itemId } = req.params;

        const { team } = await getTeamForOpportunity(opportunityId, req.auth.internalUserId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const { error, count } = await supabase
            .from('submission_checklist')
            .delete({ count: 'exact' })
            .eq('id', itemId)
            .eq('team_id', team.id);

        if (error) throw error;

        if (count === 0) {
            return res.status(404).json({ error: 'Checklist item not found' });
        }

        logAudit('DELETE_CHECKLIST_ITEM', req.auth.internalUserId, itemId, 'success');
        res.json({ success: true, message: 'Checklist item deleted' });
    } catch (error) {
        console.error('Error deleting checklist item:', error.message);
        res.status(500).json({ error: 'Failed to delete checklist item' });
    }
});

module.exports = router;
