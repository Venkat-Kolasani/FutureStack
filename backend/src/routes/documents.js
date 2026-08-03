const express = require('express');
const multer = require('multer');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const {
    createDocumentSchema,
    updateDocumentSchema,
    assignDocumentSchema,
    documentIdParamSchema,
    unassignDocumentParamsSchema,
    opportunityIdParamSchema
} = require('../validation/documents-schemas');

// Signed URL expiration time (1 hour)
const SIGNED_URL_EXPIRY = 60 * 60;

const router = express.Router();

// File size limit: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Max documents per user
const MAX_DOCUMENTS_PER_USER = 20;
// Allowed file types
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

function parseAtsAnalysis(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;

    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
}

function parseAtsScore(value) {
    if (value === undefined || value === null || value === '') return null;
    const score = Number(value);
    if (!Number.isInteger(score) || score < 0 || score > 100) return null;
    return score;
}

// Configure multer for memory storage (we'll upload to Supabase Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
        }
    }
});

/**
 * Audit logging helper
 * Logs audit events with sanitized details (no sensitive data)
 */
function logAudit(action, userId, resourceId = null, outcome = 'success', details = {}) {
    // Sanitize details to avoid logging sensitive information
    const sanitizedDetails = {};
    const allowedKeys = ['type', 'fileSize', 'updatedFields', 'opportunity_id', 'errorCode', 'count'];
    for (const key of allowedKeys) {
        if (details[key] !== undefined) {
            sanitizedDetails[key] = details[key];
        }
    }

    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        action,
        userId,
        resourceId,
        outcome,
        details: sanitizedDetails
    }));
}

/**
 * GET /api/documents/by-opportunity/:opportunityId
 * Get all documents linked to an opportunity
 * NOTE: This must be defined BEFORE /:id to prevent route shadowing
 */
router.get('/by-opportunity/:opportunityId', validate(opportunityIdParamSchema, 'params'), async (req, res) => {
    try {
        const { opportunityId } = req.params;

        // Verify opportunity belongs to user
        const { data: opp, error: oppError } = await supabase
            .from('opportunities')
            .select('id')
            .eq('id', opportunityId)
            .eq('user_id', req.auth.internalUserId)
            .single();

        if (oppError) {
            if (oppError.code === 'PGRST116') {
                logAudit('LIST_OPPORTUNITY_DOCUMENTS', req.auth.internalUserId, opportunityId, 'failure', { errorCode: 'NOT_FOUND' });
                return res.status(404).json({ error: 'Opportunity not found' });
            }
            logAudit('LIST_OPPORTUNITY_DOCUMENTS', req.auth.internalUserId, opportunityId, 'failure', { errorCode: oppError.code });
            throw oppError;
        }

        const { data, error } = await supabase
            .from('opportunity_documents')
            .select(`
                submitted_at,
                documents(*)
            `)
            .eq('opportunity_id', opportunityId);

        if (error) {
            logAudit('LIST_OPPORTUNITY_DOCUMENTS', req.auth.internalUserId, opportunityId, 'failure', { errorCode: error.code });
            throw error;
        }

        // Flatten the response and refresh signed URLs
        const documents = await Promise.all(data.map(async (item) => {
            const doc = item.documents;

            // Refresh signed URL if it's a stored file
            if (doc.storage_path && !doc.is_external) {
                const { data: signedData } = await supabase
                    .storage
                    .from('documents')
                    .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY);

                if (signedData?.signedUrl) {
                    doc.file_url = signedData.signedUrl;
                }
            }

            return {
                ...doc,
                submitted_at: item.submitted_at
            };
        }));

        logAudit('LIST_OPPORTUNITY_DOCUMENTS', req.auth.internalUserId, opportunityId, 'success', { count: documents.length });
        res.json(documents);
    } catch (error) {
        console.error('Error fetching opportunity documents:', error.code || 'UNKNOWN');
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

/**
 * GET /api/documents
 * Get all documents for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                opportunity_documents(
                    opportunity_id,
                    submitted_at,
                    opportunities(id, title, status)
                )
            `)
            .eq('user_id', req.auth.internalUserId)
            .order('created_at', { ascending: false });

        if (error) {
            logAudit('LIST_DOCUMENTS', req.auth.internalUserId, null, 'failure', { errorCode: error.code });
            throw error;
        }

        // Refresh signed URLs for stored documents
        const documentsWithFreshUrls = await Promise.all(data.map(async (doc) => {
            if (doc.storage_path && !doc.is_external) {
                const { data: signedData } = await supabase
                    .storage
                    .from('documents')
                    .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY);

                if (signedData?.signedUrl) {
                    doc.file_url = signedData.signedUrl;
                }
            }
            return doc;
        }));

        logAudit('LIST_DOCUMENTS', req.auth.internalUserId, null, 'success', { count: data.length });
        res.json(documentsWithFreshUrls);
    } catch (error) {
        console.error('Error fetching documents:', error.code || 'UNKNOWN');
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

/**
 * GET /api/documents/:id
 * Get a single document by ID
 */
router.get('/:id', validate(documentIdParamSchema, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        const { data: doc, error } = await supabase
            .from('documents')
            .select(`
                *,
                opportunity_documents(
                    opportunity_id,
                    submitted_at,
                    opportunities(id, title, status, category)
                )
            `)
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                logAudit('READ_DOCUMENT', req.auth.internalUserId, id, 'failure', { errorCode: 'NOT_FOUND' });
                return res.status(404).json({ error: 'Document not found' });
            }
            logAudit('READ_DOCUMENT', req.auth.internalUserId, id, 'failure', { errorCode: error.code });
            throw error;
        }

        // Refresh signed URL if it's a stored file
        if (doc.storage_path && !doc.is_external) {
            const { data: signedData } = await supabase
                .storage
                .from('documents')
                .createSignedUrl(doc.storage_path, SIGNED_URL_EXPIRY);

            if (signedData?.signedUrl) {
                doc.file_url = signedData.signedUrl;
            }
        }

        logAudit('READ_DOCUMENT', req.auth.internalUserId, id, 'success');
        res.json(doc);
    } catch (error) {
        console.error('Error fetching document:', error.code || 'UNKNOWN');
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});

/**
 * POST /api/documents
 * Create a new document (metadata only, for external links)
 */
router.post('/', validate(createDocumentSchema), async (req, res) => {
    try {
        // Check document limit
        const { count, error: countError } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.auth.internalUserId);

        if (countError) {
            console.error('Error checking document limit:', countError);
            return res.status(500).json({ error: 'Failed to check document limits' });
        }

        if (count >= MAX_DOCUMENTS_PER_USER) {
            return res.status(400).json({
                error: 'Document limit reached',
                message: `You can only store up to ${MAX_DOCUMENTS_PER_USER} documents. Please delete some to add more.`
            });
        }

        const { name, type, file_url, version, notes, is_external } = req.body;

        const { data, error } = await supabase
            .from('documents')
            .insert({
                user_id: req.auth.internalUserId,
                name,
                type,
                file_url: file_url || null,
                version: version || 'v1',
                notes: notes || null,
                is_external: is_external !== undefined ? is_external : true
            })
            .select()
            .single();

        if (error) throw error;

        logAudit('CREATE_DOCUMENT', req.auth.internalUserId, data.id, 'success', { type });

        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating document:', error.code || 'UNKNOWN');
        res.status(500).json({ error: 'Failed to create document' });
    }
});

/**
 * POST /api/documents/upload
 * Upload a file and create document record
 * Uses signed URLs for secure, time-limited access to private bucket
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Check document limit
        const { count, error: countError } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.auth.internalUserId);

        if (countError) {
            console.error('Error checking document limit:', countError);
            return res.status(500).json({ error: 'Failed to check document limits' });
        }

        if (count >= MAX_DOCUMENTS_PER_USER) {
            return res.status(400).json({
                error: 'Document limit reached',
                message: `You can only store up to ${MAX_DOCUMENTS_PER_USER} documents. Please delete some to add more.`
            });
        }

        const { name, type, version, notes } = req.body;
        const validTypes = ['resume', 'cover_letter', 'portfolio', 'other'];

        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: 'Invalid document type',
                message: 'Type must be one of: resume, cover_letter, portfolio, other'
            });
        }

        // Generate unique file path: userId/timestamp-filename
        const timestamp = Date.now();
        const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${req.auth.internalUserId}/${timestamp}-${sanitizedName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase
            .storage
            .from('documents')
            .upload(storagePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) {
            // Log sanitized error (only code, not full error object which may contain sensitive details)
            console.error('Storage upload error:', uploadError.statusCode || uploadError.error || 'UNKNOWN');
            return res.status(500).json({ error: 'Failed to upload file' });
        }

        // Generate signed URL for secure access (valid for 1 hour)
        // This provides time-limited access to the private bucket
        const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('documents')
            .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

        if (signedUrlError) {
            // Rollback: delete uploaded file if we can't generate signed URL
            await supabase.storage.from('documents').remove([storagePath]);
            console.error('Signed URL generation error:', signedUrlError.statusCode || 'UNKNOWN');
            return res.status(500).json({ error: 'Failed to generate secure access URL' });
        }

        // Create document record
        // Store storage_path for future signed URL generation, not the signed URL itself
        const { data, error } = await supabase
            .from('documents')
            .insert({
                user_id: req.auth.internalUserId,
                name,
                type,
                file_url: signedUrlData.signedUrl, // Initial signed URL (will be refreshed on access)
                file_size: req.file.size,
                storage_path: storagePath,
                version: version || 'v1',
                notes: notes || null,
                is_external: false
            })
            .select()
            .single();

        if (error) {
            // Rollback: delete uploaded file
            await supabase.storage.from('documents').remove([storagePath]);
            throw error;
        }

        logAudit('UPLOAD_DOCUMENT', req.auth.internalUserId, data.id, 'success', {
            type,
            fileSize: req.file.size
        });

        res.status(201).json(data);
    } catch (error) {
        console.error('Error uploading document:', error.code || 'UNKNOWN');
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

/**
 * PATCH /api/documents/:id
 * Update document metadata
 */
router.patch('/:id', validate(documentIdParamSchema, 'params'), validate(updateDocumentSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, file_url, version, notes, is_external, ats_score, ats_analysis, ats_analyzed_at } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (type !== undefined) updateData.type = type;
        if (file_url !== undefined) updateData.file_url = file_url;
        if (version !== undefined) updateData.version = version;
        if (notes !== undefined) updateData.notes = notes;
        if (is_external !== undefined) updateData.is_external = is_external;
        if (ats_score !== undefined) updateData.ats_score = parseAtsScore(ats_score);
        if (ats_analyzed_at !== undefined) updateData.ats_analyzed_at = ats_analyzed_at;
        if (ats_analysis !== undefined) updateData.ats_analysis = parseAtsAnalysis(ats_analysis);

        const { data, error } = await supabase
            .from('documents')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Document not found' });
            }
            throw error;
        }

        logAudit('UPDATE_DOCUMENT', req.auth.internalUserId, id, 'success', {
            updatedFields: Object.keys(updateData)
        });

        res.json(data);
    } catch (error) {
        console.error('Error updating document:', error.code || 'UNKNOWN');
        res.status(500).json({ error: 'Failed to update document' });
    }
});

/**
 * DELETE /api/documents/:id
 * Delete a document and its file from storage
 */
router.delete('/:id', validate(documentIdParamSchema, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        // First get the document to check storage_path
        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('storage_path, is_external')
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Document not found' });
            }
            throw fetchError;
        }

        // Delete from storage if it's an uploaded file
        if (doc.storage_path && !doc.is_external) {
            const { error: storageError } = await supabase
                .storage
                .from('documents')
                .remove([doc.storage_path]);

            if (storageError) {
                console.error('Storage delete error:', storageError.statusCode || 'UNKNOWN');
                // Continue with database deletion anyway
            }
        }

        // Delete from database (cascades to opportunity_documents)
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId);

        if (error) throw error;

        logAudit('DELETE_DOCUMENT', req.auth.internalUserId, id, 'success');

        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        console.error('Error deleting document:', error.code || 'UNKNOWN');
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

/**
 * POST /api/documents/:id/assign
 * Link a document to an opportunity
 */
router.post('/:id/assign', validate(documentIdParamSchema, 'params'), validate(assignDocumentSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { opportunity_id } = req.body;

        // Verify document belongs to user
        const { error: docError } = await supabase
            .from('documents')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId)
            .single();

        if (docError) {
            if (docError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Document not found' });
            }
            throw docError;
        }

        // Verify opportunity belongs to user and is internship
        const { data: opp, error: oppError } = await supabase
            .from('opportunities')
            .select('id, category')
            .eq('id', opportunity_id)
            .eq('user_id', req.auth.internalUserId)
            .single();

        if (oppError) {
            if (oppError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Opportunity not found' });
            }
            throw oppError;
        }

        // Only allow document attachment for internships
        if (opp.category !== 'internship') {
            return res.status(400).json({
                error: 'Documents can only be attached to internship opportunities'
            });
        }

        // Create the link
        const { data, error } = await supabase
            .from('opportunity_documents')
            .insert({
                opportunity_id,
                document_id: id
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(409).json({ error: 'Document already linked to this opportunity' });
            }
            throw error;
        }

        logAudit('ASSIGN_DOCUMENT', req.auth.internalUserId, id, 'success', { opportunity_id });

        res.status(201).json(data);
    } catch (error) {
        console.error('Error assigning document:', error.code || 'UNKNOWN');
        res.status(500).json({ error: 'Failed to assign document' });
    }
});

/**
 * DELETE /api/documents/:id/unassign/:opportunityId
 * Unlink a document from an opportunity
 */
router.delete('/:id/unassign/:opportunityId', validate(unassignDocumentParamsSchema, 'params'), async (req, res) => {
    try {
        const { id, opportunityId } = req.params;

        // Verify ownership through document - properly handle errors
        const { data: doc, error: fetchError } = await supabase
            .from('documents')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return res.status(404).json({ error: 'Document not found' });
            }
            // Database error - log and return 500
            console.error('Error verifying document ownership:', fetchError.code || 'UNKNOWN');
            return res.status(500).json({ error: 'Failed to verify document ownership' });
        }

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const { error, count } = await supabase
            .from('opportunity_documents')
            .delete({ count: 'exact' })
            .eq('document_id', id)
            .eq('opportunity_id', opportunityId);

        if (error) throw error;

        if (count === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }

        logAudit('UNASSIGN_DOCUMENT', req.auth.internalUserId, id, 'success', { opportunity_id: opportunityId });

        res.json({ success: true, message: 'Document unlinked' });
    } catch (error) {
        console.error('Error unassigning document:', error.code || 'UNKNOWN');
        res.status(500).json({ error: 'Failed to unassign document' });
    }
});

// Error handling middleware for multer
// Handles all errors to prevent stack trace exposure
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
            });
        }
        // Handle other multer errors generically without exposing details
        return res.status(400).json({
            error: 'File upload error',
            message: 'There was a problem with your file upload. Please try again.'
        });
    }
    if (error.message === 'Only PDF, DOC, and DOCX files are allowed') {
        return res.status(400).json({ error: error.message });
    }
    // For any other errors, return a generic message without exposing internal details
    // Log the error code only (not the full error object) for debugging
    console.error('Unhandled document route error:', error.code || error.name || 'UNKNOWN');
    return res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.'
    });
});

module.exports = router;

.catch(err => console.error("Promise.all failed:", err));