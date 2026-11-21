'use strict';

const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const { interviewGenerateLimiter } = require('../middleware/aiLimiter');
const { getStarterPack, normalizeText } = require('../lib/interviewPrepPacks');
const { buildPrepPrompt, schemaForKind } = require('../lib/interviewPrepGenerate');
const { generateObject, getProviderInfo } = require('../lib/llm');
const { getUserDecryptedApiKey } = require('../lib/userAiSettings');
const { defaultModelFor } = require('../lib/providerModels');
const {
  starterPackSchema,
  generatePrepSchema,
  acceptGeneratedPrepSchema,
} = require('../validation/interview-prep-schemas');

function registerInterviewPrepSession(router, { verifyInternshipOwnership, getPrepForOpportunity, logAudit }) {
  router.get('/stories', async (req, res) => {
    try {
      const userId = req.auth.internalUserId;
      const { data: preps, error: prepError } = await supabase
        .from('interview_prep')
        .select('id, opportunity_id, opportunities(title)')
        .eq('user_id', userId);

      if (prepError) {
        if (prepError.code === '42P01') {
          return res.status(503).json({
            error: 'Database tables not set up. Please run the interview-prep migration.',
            code: 'TABLES_NOT_EXIST',
          });
        }
        throw prepError;
      }

      const prepIds = (preps || []).map((prep) => prep.id);
      if (prepIds.length === 0) {
        return res.json({ stories: [] });
      }

      const { data: rows, error } = await supabase
        .from('behavioral_prep')
        .select('id, prep_id, question, situation, task, action, result')
        .in('prep_id', prepIds);

      if (error) throw error;

      const titleByPrep = new Map(
        (preps || []).map((prep) => [prep.id, prep.opportunities?.title || 'Internship']),
      );

      res.json({
        stories: (rows || []).map((row) => ({
          ...row,
          company: titleByPrep.get(row.prep_id) || 'Internship',
        })),
      });
    } catch (error) {
      console.error('Error listing interview stories:', error.message);
      res.status(500).json({ error: 'Failed to list stories' });
    }
  });

  router.post('/:opportunityId/starter', validate(starterPackSchema), async (req, res) => {
    try {
      const { opportunityId } = req.params;
      const { focus } = req.body;
      const userId = req.auth.internalUserId;
      const pack = getStarterPack(focus);
      if (!pack) {
        return res.status(400).json({ error: 'Unknown focus' });
      }

      const ownership = await verifyInternshipOwnership(opportunityId, userId);
      if (!ownership.valid) {
        return res.status(404).json({ error: ownership.error });
      }

      let { prep, error: prepError } = await getPrepForOpportunity(opportunityId, userId);
      if (prepError && prepError.tableNotExists) {
        return res.status(503).json({ error: 'Database tables not set up.', code: 'TABLES_NOT_EXIST' });
      }
      if (prepError && prepError.code !== 'PGRST116') throw prepError;

      if (!prep) {
        const created = await supabase
          .from('interview_prep')
          .insert({ opportunity_id: opportunityId, user_id: userId })
          .select()
          .single();
        if (created.error) throw created.error;
        prep = created.data;
      }

      const [questions, topics, behavioral] = await Promise.all([
        supabase.from('interview_questions').select('question').eq('prep_id', prep.id),
        supabase.from('technical_topics').select('topic').eq('prep_id', prep.id),
        supabase.from('behavioral_prep').select('question').eq('prep_id', prep.id),
      ]);
      if (questions.error) throw questions.error;
      if (topics.error) throw topics.error;
      if (behavioral.error) throw behavioral.error;

      const knownQuestions = new Set((questions.data || []).map((row) => normalizeText(row.question)));
      const knownTopics = new Set((topics.data || []).map((row) => normalizeText(row.topic)));
      const knownStories = new Set((behavioral.data || []).map((row) => normalizeText(row.question)));

      const questionRows = pack.questions
        .filter((row) => !knownQuestions.has(normalizeText(row.question)))
        .map((row) => ({
          prep_id: prep.id,
          question: row.question,
          answer: null,
          is_prepared: false,
          is_exam: false,
          focus,
        }));
      const topicRows = pack.topics
        .filter((row) => !knownTopics.has(normalizeText(row.topic)))
        .map((row) => ({
          prep_id: prep.id,
          topic: row.topic,
          priority: row.priority,
          is_reviewed: false,
          focus,
        }));
      const storyRows = pack.behavioral
        .filter((row) => !knownStories.has(normalizeText(row.question)))
        .map((row) => ({
          prep_id: prep.id,
          question: row.question,
          focus,
        }));

      if (questionRows.length) {
        const inserted = await supabase.from('interview_questions').insert(questionRows).select();
        if (inserted.error) throw inserted.error;
      }
      if (topicRows.length) {
        const inserted = await supabase.from('technical_topics').insert(topicRows).select();
        if (inserted.error) throw inserted.error;
      }
      if (storyRows.length) {
        const inserted = await supabase.from('behavioral_prep').insert(storyRows).select();
        if (inserted.error) throw inserted.error;
      }

      logAudit('SEED_INTERVIEW_PREP', userId, prep.id, 'success', {
        focus,
        added: questionRows.length + topicRows.length + storyRows.length,
      });

      res.json({
        added: {
          questions: questionRows.length,
          topics: topicRows.length,
          behavioral: storyRows.length,
        },
      });
    } catch (error) {
      console.error('Error seeding interview prep:', error.message);
      res.status(500).json({ error: 'Failed to add starter pack' });
    }
  });

  router.post('/:opportunityId/generate', interviewGenerateLimiter, validate(generatePrepSchema), async (req, res) => {
    const started = Date.now();
    try {
      const { opportunityId } = req.params;
      const { kind, focus, provider } = req.body;
      const userId = req.auth.internalUserId;

      const ownership = await verifyInternshipOwnership(opportunityId, userId);
      if (!ownership.valid) {
        return res.status(404).json({ error: ownership.error });
      }

      const opportunity = await supabase
        .from('opportunities')
        .select('title, description, notes')
        .eq('id', opportunityId)
        .eq('user_id', userId)
        .single();
      if (opportunity.error || !opportunity.data) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      let llmOptions;
      if (provider === 'ollama') {
        const stored = await getUserDecryptedApiKey(userId, 'ollama');
        llmOptions = {
          provider: 'ollama',
          model: stored?.model || defaultModelFor('ollama'),
        };
      } else {
        const stored = await getUserDecryptedApiKey(userId, provider);
        if (!stored || stored.failed || !stored.apiKey) {
          return res.status(400).json({
            error: 'API Key Required',
            code: stored?.failed ? 'KEY_DECRYPT_FAILED' : 'API_KEY_REQUIRED',
            message: 'Add an API key for this provider before generating prep.',
          });
        }
        llmOptions = { provider, model: stored.model, apiKey: stored.apiKey };
      }

      const storiesResult = await supabase
        .from('interview_prep')
        .select('id')
        .eq('user_id', userId);
      const prepIds = (storiesResult.data || []).map((row) => row.id);
      let stories = [];
      if (prepIds.length) {
        const storyRows = await supabase
          .from('behavioral_prep')
          .select('question')
          .in('prep_id', prepIds)
          .limit(5);
        stories = storyRows.data || [];
      }

      const { system, prompt } = buildPrepPrompt({
        kind,
        focus,
        opportunity: opportunity.data,
        stories,
      });
      const draft = await generateObject({
        system,
        prompt,
        schema: schemaForKind(kind),
        schemaName: `interview_${kind}`,
        llmOptions,
      });

      const info = getProviderInfo(llmOptions);
      console.log(JSON.stringify({
        type: 'INTERVIEW_PREP_GENERATE',
        provider: info.provider,
        model: info.model,
        kind,
        latencyMs: Date.now() - started,
      }));

      res.json({ kind, focus, provider: info.provider, model: info.model, draft });
    } catch (error) {
      console.error('Error generating interview prep:', error.message);
      const code = error.code || 'LLM_ERROR';
      const status = code === 'API_KEY_REQUIRED' ? 400 : 502;
      res.status(status).json({
        error: 'Generation failed',
        code,
        message: 'The provider could not generate prep. Check the key and try again.',
      });
    }
  });

  router.post('/:opportunityId/generate/accept', validate(acceptGeneratedPrepSchema), async (req, res) => {
    try {
      const { opportunityId } = req.params;
      const { focus, checklist = [], topics = [], questions = [], behavioral = [] } = req.body;
      const userId = req.auth.internalUserId;

      const ownership = await verifyInternshipOwnership(opportunityId, userId);
      if (!ownership.valid) {
        return res.status(404).json({ error: ownership.error });
      }

      let { prep, error: prepError } = await getPrepForOpportunity(opportunityId, userId);
      if (prepError && prepError.code !== 'PGRST116') throw prepError;
      if (!prep) {
        const created = await supabase
          .from('interview_prep')
          .insert({ opportunity_id: opportunityId, user_id: userId })
          .select()
          .single();
        if (created.error) throw created.error;
        prep = created.data;
      }

      const existingQuestions = await supabase.from('interview_questions').select('question').eq('prep_id', prep.id);
      const existingTopics = await supabase.from('technical_topics').select('topic').eq('prep_id', prep.id);
      const existingStories = await supabase.from('behavioral_prep').select('question').eq('prep_id', prep.id);
      if (existingQuestions.error) throw existingQuestions.error;
      if (existingTopics.error) throw existingTopics.error;
      if (existingStories.error) throw existingStories.error;

      const knownQuestions = new Set((existingQuestions.data || []).map((row) => normalizeText(row.question)));
      const knownTopics = new Set((existingTopics.data || []).map((row) => normalizeText(row.topic)));
      const knownStories = new Set((existingStories.data || []).map((row) => normalizeText(row.question)));

      const questionRows = questions
        .filter((row) => !knownQuestions.has(normalizeText(row.question)))
        .map((row) => ({
          prep_id: prep.id,
          question: row.question,
          answer: row.answer || null,
          is_prepared: false,
          is_exam: Boolean(row.is_exam),
          focus,
        }));
      const topicRows = topics
        .filter((row) => !knownTopics.has(normalizeText(row.topic)))
        .map((row) => ({
          prep_id: prep.id,
          topic: row.topic,
          priority: row.priority || 'medium',
          is_reviewed: false,
          focus,
        }));
      const storyRows = behavioral
        .filter((row) => !knownStories.has(normalizeText(row.question)))
        .map((row) => ({
          prep_id: prep.id,
          question: row.question,
          situation: row.situation || null,
          task: row.task || null,
          action: row.action || null,
          result: row.result || null,
          focus,
        }));

      const inserted = { questions: [], topics: [], behavioral: [] };
      if (questionRows.length) {
        const result = await supabase.from('interview_questions').insert(questionRows).select();
        if (result.error) throw result.error;
        inserted.questions = result.data || [];
      }
      if (topicRows.length) {
        const result = await supabase.from('technical_topics').insert(topicRows).select();
        if (result.error) throw result.error;
        inserted.topics = result.data || [];
      }
      if (storyRows.length) {
        const result = await supabase.from('behavioral_prep').insert(storyRows).select();
        if (result.error) throw result.error;
        inserted.behavioral = result.data || [];
      }

      if (checklist.length) {
        const block = ['## Study plan', ...checklist.map((item) => `- ${item}`)].join('\n');
        const current = prep.company_research ? `${prep.company_research.trim()}\n\n${block}` : block;
        const updated = await supabase
          .from('interview_prep')
          .update({ company_research: current })
          .eq('id', prep.id)
          .select()
          .single();
        if (updated.error) throw updated.error;
        prep = updated.data;
      }

      res.json({ prep, ...inserted });
    } catch (error) {
      console.error('Error accepting generated prep:', error.message);
      res.status(500).json({ error: 'Failed to save generated prep' });
    }
  });
}

module.exports = { registerInterviewPrepSession };
