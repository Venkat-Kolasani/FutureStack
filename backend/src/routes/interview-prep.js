const express = require("express");
const { supabase } = require("../lib/supabase");
const { validate } = require("../middleware/validate");
const {
  createInterviewPrepSchema,
  createInterviewQuestionSchema,
  updateInterviewQuestionSchema,
  createTechnicalTopicSchema,
  updateTechnicalTopicSchema,
  createBehavioralPrepSchema,
  updateBehavioralPrepSchema,
} = require("../validation/interview-prep-schemas");

const router = express.Router();

/**
 * Audit logging helper
 */
function logAudit(
  action,
  userId,
  resourceId = null,
  outcome = "success",
  details = {},
) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      type: "AUDIT",
      action,
      userId,
      resourceId,
      outcome,
      details,
    }),
  );
}

/**
 * Helper: Verify user owns the opportunity and it's an internship
 */
async function verifyInternshipOwnership(opportunityId, userId) {
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, category")
    .eq("id", opportunityId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return { valid: false, error: "Opportunity not found" };
  }

  if (data.category !== "internship") {
    return {
      valid: false,
      error: "This feature is only available for internships",
    };
  }

  return { valid: true, data };
}

/**
 * Helper: Get prep record for an opportunity
 */
async function getPrepForOpportunity(opportunityId, userId) {
  const { data, error } = await supabase
    .from("interview_prep")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .eq("user_id", userId)
    .single();

  // Handle table not existing (migration not run)
  if (error && error.code === "42P01") {
    return { prep: null, error: { ...error, tableNotExists: true } };
  }

  return { prep: data, error };
}

// =============================================================================
// INTERVIEW PREP MAIN RECORD
// =============================================================================

/**
 * GET /api/interview-prep/:opportunityId
 * Get interview prep for an internship (includes all related data)
 */
router.get("/:opportunityId", async (req, res) => {
  try {
    const { opportunityId } = req.params;

    const ownership = await verifyInternshipOwnership(
      opportunityId,
      req.auth.internalUserId,
    );
    if (!ownership.valid) {
      return res.status(404).json({ error: ownership.error });
    }

    const { prep, error } = await getPrepForOpportunity(
      opportunityId,
      req.auth.internalUserId,
    );

    // Handle missing tables (migration not run)
    if (error && error.tableNotExists) {
      return res.status(503).json({
        error:
          "Database tables not set up. Please run the interview-prep-migration.sql in Supabase.",
        code: "TABLES_NOT_EXIST",
      });
    }

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!prep) {
      return res.json({
        prep: null,
        questions: [],
        topics: [],
        behavioral: [],
      });
    }

    // Fetch related data in parallel
    const [questions, topics, behavioral] = await Promise.all([
      supabase
        .from("interview_questions")
        .select("*")
        .eq("prep_id", prep.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("technical_topics")
        .select("*")
        .eq("prep_id", prep.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("behavioral_prep")
        .select("*")
        .eq("prep_id", prep.id)
        .order("created_at", { ascending: true }),
    ]);

    if (questions.error) throw questions.error;
    if (topics.error) throw topics.error;
    if (behavioral.error) throw behavioral.error;

    res.json({
      prep,
      questions: questions.data || [],
      topics: topics.data || [],
      behavioral: behavioral.data || [],
    });
  } catch (error) {
    console.error("Error fetching interview prep:", error.message);
    res.status(500).json({ error: "Failed to fetch interview prep" });
  }
});

/**
 * POST /api/interview-prep/:opportunityId
 * Create interview prep for an internship
 */
router.post(
  "/:opportunityId",
  validate(createInterviewPrepSchema),
  async (req, res) => {
    try {
      const { opportunityId } = req.params;
      const { company_research, reflection_notes } = req.body;

      const ownership = await verifyInternshipOwnership(
        opportunityId,
        req.auth.internalUserId,
      );
      if (!ownership.valid) {
        return res.status(404).json({ error: ownership.error });
      }

      // Check if prep already exists
      const { prep: existingPrep } = await getPrepForOpportunity(
        opportunityId,
        req.auth.internalUserId,
      );
      if (existingPrep) {
        return res
          .status(400)
          .json({ error: "Interview prep already exists for this internship" });
      }

      const { data, error } = await supabase
        .from("interview_prep")
        .insert({
          opportunity_id: opportunityId,
          user_id: req.auth.internalUserId,
          company_research: company_research || null,
          reflection_notes: reflection_notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      logAudit(
        "CREATE_INTERVIEW_PREP",
        req.auth.internalUserId,
        data.id,
        "success",
      );
      res
        .status(201)
        .json({ prep: data, questions: [], topics: [], behavioral: [] });
    } catch (error) {
      console.error("Error creating interview prep:", error.message);
      res.status(500).json({ error: "Failed to create interview prep" });
    }
  },
);

/**
 * PUT /api/interview-prep/:opportunityId
 * Update interview prep details
 */
router.put(
  "/:opportunityId",
  validate(createInterviewPrepSchema),
  async (req, res) => {
    try {
      const { opportunityId } = req.params;
      const { company_research, reflection_notes } = req.body;

      const ownership = await verifyInternshipOwnership(
        opportunityId,
        req.auth.internalUserId,
      );
      if (!ownership.valid) {
        return res.status(404).json({ error: ownership.error });
      }

      const updateData = {};
      if (company_research !== undefined)
        updateData.company_research = company_research;
      if (reflection_notes !== undefined)
        updateData.reflection_notes = reflection_notes;

      const { data, error } = await supabase
        .from("interview_prep")
        .update(updateData)
        .eq("opportunity_id", opportunityId)
        .eq("user_id", req.auth.internalUserId)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "Interview prep not found" });
        }
        throw error;
      }

      logAudit(
        "UPDATE_INTERVIEW_PREP",
        req.auth.internalUserId,
        data.id,
        "success",
      );
      res.json(data);
    } catch (error) {
      console.error("Error updating interview prep:", error.message);
      res.status(500).json({ error: "Failed to update interview prep" });
    }
  },
);

// =============================================================================
// INTERVIEW QUESTIONS
// =============================================================================

/**
 * POST /api/interview-prep/:opportunityId/questions
 * Add interview question
 */
router.post(
  "/:opportunityId/questions",
  validate(createInterviewQuestionSchema),
  async (req, res) => {
    try {
      const { opportunityId } = req.params;
      const { question, answer, is_prepared } = req.body;

      const { prep } = await getPrepForOpportunity(
        opportunityId,
        req.auth.internalUserId,
      );
      if (!prep) {
        return res
          .status(404)
          .json({ error: "Interview prep not found. Create prep first." });
      }

      const { data, error } = await supabase
        .from("interview_questions")
        .insert({
          prep_id: prep.id,
          question,
          answer: answer || null,
          is_prepared: is_prepared || false,
        })
        .select()
        .single();

      if (error) throw error;

      logAudit(
        "CREATE_INTERVIEW_QUESTION",
        req.auth.internalUserId,
        data.id,
        "success",
      );
      res.status(201).json(data);
    } catch (error) {
      console.error("Error adding interview question:", error.message);
      res.status(500).json({ error: "Failed to add interview question" });
    }
  },
);

/**
 * PUT /api/interview-prep/:opportunityId/questions/:questionId
 * Update interview question
 */
router.put(
  "/:opportunityId/questions/:questionId",
  validate(updateInterviewQuestionSchema),
  async (req, res) => {
    try {
      const { opportunityId, questionId } = req.params;
      const { question, answer, is_prepared } = req.body;

      const { prep } = await getPrepForOpportunity(
        opportunityId,
        req.auth.internalUserId,
      );
      if (!prep) {
        return res.status(404).json({ error: "Interview prep not found" });
      }

      const updateData = {};
      if (question !== undefined) updateData.question = question;
      if (answer !== undefined) updateData.answer = answer;
      if (is_prepared !== undefined) updateData.is_prepared = is_prepared;

      const { data, error } = await supabase
        .from("interview_questions")
        .update(updateData)
        .eq("id", questionId)
        .eq("prep_id", prep.id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res
            .status(404)
            .json({ error: "Interview question not found" });
        }
        throw error;
      }

      res.json(data);
    } catch (error) {
      console.error("Error updating interview question:", error.message);
      res.status(500).json({ error: "Failed to update interview question" });
    }
  },
);

/**
 * DELETE /api/interview-prep/:opportunityId/questions/:questionId
 * Delete interview question
 */
router.delete("/:opportunityId/questions/:questionId", async (req, res) => {
  try {
    const { opportunityId, questionId } = req.params;

    const { prep } = await getPrepForOpportunity(
      opportunityId,
      req.auth.internalUserId,
    );
    if (!prep) {
      return res.status(404).json({ error: "Interview prep not found" });
    }

    const { error, count } = await supabase
      .from("interview_questions")
      .delete({ count: "exact" })
      .eq("id", questionId)
      .eq("prep_id", prep.id);

    if (error) throw error;

    if (count === 0) {
      return res.status(404).json({ error: "Interview question not found" });
    }

    logAudit(
      "DELETE_INTERVIEW_QUESTION",
      req.auth.internalUserId,
      questionId,
      "success",
    );
    res.json({ success: true, message: "Interview question deleted" });
  } catch (error) {
    console.error("Error deleting interview question:", error.message);
    res.status(500).json({ error: "Failed to delete interview question" });
  }
});

// =============================================================================
// TECHNICAL TOPICS
// =============================================================================

/**
 * POST /api/interview-prep/:opportunityId/topics
 * Add technical topic
 */
router.post(
  "/:opportunityId/topics",
  validate(createTechnicalTopicSchema),
  async (req, res) => {
    try {
      const { opportunityId } = req.params;
      const { topic, priority, is_reviewed } = req.body;

      const { prep } = await getPrepForOpportunity(
        opportunityId,
        req.auth.internalUserId,
      );
      if (!prep) {
        return res
          .status(404)
          .json({ error: "Interview prep not found. Create prep first." });
      }

      const { data, error } = await supabase
        .from("technical_topics")
        .insert({
          prep_id: prep.id,
          topic,
          priority: priority || "medium",
          is_reviewed: is_reviewed || false,
        })
        .select()
        .single();

      if (error) throw error;

      logAudit(
        "CREATE_TECHNICAL_TOPIC",
        req.auth.internalUserId,
        data.id,
        "success",
      );
      res.status(201).json(data);
    } catch (error) {
      console.error("Error adding technical topic:", error.message);
      res.status(500).json({ error: "Failed to add technical topic" });
    }
  },
);

/**
 * PUT /api/interview-prep/:opportunityId/topics/:topicId
 * Update technical topic
 */
router.put(
  "/:opportunityId/topics/:topicId",
  validate(updateTechnicalTopicSchema),
  async (req, res) => {
    try {
      const { opportunityId, topicId } = req.params;
      const { topic, priority, is_reviewed } = req.body;

      const { prep } = await getPrepForOpportunity(
        opportunityId,
        req.auth.internalUserId,
      );
      if (!prep) {
        return res.status(404).json({ error: "Interview prep not found" });
      }

      const updateData = {};
      if (topic !== undefined) updateData.topic = topic;
      if (priority !== undefined) updateData.priority = priority;
      if (is_reviewed !== undefined) updateData.is_reviewed = is_reviewed;

      const { data, error } = await supabase
        .from("technical_topics")
        .update(updateData)
        .eq("id", topicId)
        .eq("prep_id", prep.id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "Technical topic not found" });
        }
        throw error;
      }

      res.json(data);
    } catch (error) {
      console.error("Error updating technical topic:", error.message);
      res.status(500).json({ error: "Failed to update technical topic" });
    }
  },
);

/**
 * DELETE /api/interview-prep/:opportunityId/topics/:topicId
 * Delete technical topic
 */
router.delete("/:opportunityId/topics/:topicId", async (req, res) => {
  try {
    const { opportunityId, topicId } = req.params;

    const { prep } = await getPrepForOpportunity(
      opportunityId,
      req.auth.internalUserId,
    );
    if (!prep) {
      return res.status(404).json({ error: "Interview prep not found" });
    }

    const { error, count } = await supabase
      .from("technical_topics")
      .delete({ count: "exact" })
      .eq("id", topicId)
      .eq("prep_id", prep.id);

    if (error) throw error;

    if (count === 0) {
      return res.status(404).json({ error: "Technical topic not found" });
    }

    logAudit(
      "DELETE_TECHNICAL_TOPIC",
      req.auth.internalUserId,
      topicId,
      "success",
    );
    res.json({ success: true, message: "Technical topic deleted" });
  } catch (error) {
    console.error("Error deleting technical topic:", error.message);
    res.status(500).json({ error: "Failed to delete technical topic" });
  }
});

// =============================================================================
// BEHAVIORAL PREP (STAR METHOD)
// =============================================================================

/**
 * POST /api/interview-prep/:opportunityId/behavioral
 * Add behavioral prep entry
 */
router.post(
  "/:opportunityId/behavioral",
  validate(createBehavioralPrepSchema),
  async (req, res) => {
    try {
      const { opportunityId } = req.params;
      const { question, situation, task, action, result } = req.body;

      const { prep } = await getPrepForOpportunity(
        opportunityId,
        req.auth.internalUserId,
      );
      if (!prep) {
        return res
          .status(404)
          .json({ error: "Interview prep not found. Create prep first." });
      }

      const { data, error } = await supabase
        .from("behavioral_prep")
        .insert({
          prep_id: prep.id,
          question,
          situation: situation || null,
          task: task || null,
          action: action || null,
          result: result || null,
        })
        .select()
        .single();

      if (error) throw error;

      logAudit(
        "CREATE_BEHAVIORAL_PREP",
        req.auth.internalUserId,
        data.id,
        "success",
      );
      res.status(201).json(data);
    } catch (error) {
      console.error("Error adding behavioral prep:", error.message);
      res.status(500).json({ error: "Failed to add behavioral prep" });
    }
  },
);

/**
 * PUT /api/interview-prep/:opportunityId/behavioral/:behavioralId
 * Update behavioral prep entry
 */
router.put(
  "/:opportunityId/behavioral/:behavioralId",
  validate(updateBehavioralPrepSchema),
  async (req, res) => {
    try {
      const { opportunityId, behavioralId } = req.params;
      const { question, situation, task, action, result } = req.body;

      const { prep } = await getPrepForOpportunity(
        opportunityId,
        req.auth.internalUserId,
      );
      if (!prep) {
        return res.status(404).json({ error: "Interview prep not found" });
      }

      const updateData = {};
      if (question !== undefined) updateData.question = question;
      if (situation !== undefined) updateData.situation = situation;
      if (task !== undefined) updateData.task = task;
      if (action !== undefined) updateData.action = action;
      if (result !== undefined) updateData.result = result;

      const { data, error } = await supabase
        .from("behavioral_prep")
        .update(updateData)
        .eq("id", behavioralId)
        .eq("prep_id", prep.id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return res.status(404).json({ error: "Behavioral prep not found" });
        }
        throw error;
      }

      res.json(data);
    } catch (error) {
      console.error("Error updating behavioral prep:", error.message);
      res.status(500).json({ error: "Failed to update behavioral prep" });
    }
  },
);

/**
 * DELETE /api/interview-prep/:opportunityId/behavioral/:behavioralId
 * Delete behavioral prep entry
 */
router.delete("/:opportunityId/behavioral/:behavioralId", async (req, res) => {
  try {
    const { opportunityId, behavioralId } = req.params;

    const { prep } = await getPrepForOpportunity(
      opportunityId,
      req.auth.internalUserId,
    );
    if (!prep) {
      return res.status(404).json({ error: "Interview prep not found" });
    }

    const { error, count } = await supabase
      .from("behavioral_prep")
      .delete({ count: "exact" })
      .eq("id", behavioralId)
      .eq("prep_id", prep.id);

    if (error) throw error;

    if (count === 0) {
      return res.status(404).json({ error: "Behavioral prep not found" });
    }

    logAudit(
      "DELETE_BEHAVIORAL_PREP",
      req.auth.internalUserId,
      behavioralId,
      "success",
    );
    res.json({ success: true, message: "Behavioral prep deleted" });
  } catch (error) {
    console.error("Error deleting behavioral prep:", error.message);
    res.status(500).json({ error: "Failed to delete behavioral prep" });
  }
});

module.exports = router;

.catch(err => console.error("Promise.all failed:", err));