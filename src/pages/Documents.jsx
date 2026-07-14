// Documents page - main library view for all user documents
// Follows the same design patterns as InternshipList and other pages
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaSearch, FaBrain } from 'react-icons/fa';
import SEO from '../components/seo/SEO';

import { documentService, resumeCheckerService, aiSettingsService } from '../services/api';
import DocumentUpload from '../components/documents/DocumentUpload';
import AiSettingsModal from '../components/documents/AiSettingsModal';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import DocumentCard from '../components/documents/DocumentCard';
import { AI_RESUME_CHECK_ENABLED } from '../config/features';
import {
    analyzeFileFromUrl,
    getAtsAnalysisErrorMessage,
    inferResumeFileName,
    isAtsEligible
} from '../utils/atsScorer';




const Documents = () => {
    const [documents, setDocuments] = useState([]);
    const [filteredDocuments, setFilteredDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [editDocument, setEditDocument] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [checkingAtsId, setCheckingAtsId] = useState(null);
    const [aiCheckingId, setAiCheckingId] = useState(null);
    // Map of documentId -> latest AI check result (populated after a run)
    const [aiCheckResults, setAiCheckResults] = useState({});
    const [aiChecksHydrating, setAiChecksHydrating] = useState(false);
    const [aiSettings, setAiSettings] = useState(null);
    const [isAiSettingsLoading, setIsAiSettingsLoading] = useState(AI_RESUME_CHECK_ENABLED);
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
    const [isSavingAiSettings, setIsSavingAiSettings] = useState(false);
    const hydrateInFlightRef = useRef(false);

    const fetchAiSettings = useCallback(async () => {
        if (!AI_RESUME_CHECK_ENABLED) return;
        setIsAiSettingsLoading(true);
        try {
            const data = await aiSettingsService.get();
            setAiSettings(data);
            if (data.needsKeyRefresh) {
                toast.warn(data.message || 'Please re-enter your Gemini API key in AI Settings.', { duration: 8000 });
            }
        } catch (error) {
            console.error('Error fetching AI settings:', error);
        } finally {
            setIsAiSettingsLoading(false);
        }
    }, []);

    const hydrateAiCheckResults = useCallback(async (docs) => {
        const resumes = docs.filter((doc) => doc.type === 'resume' && !doc.is_external);
        if (resumes.length === 0 || hydrateInFlightRef.current) return;

        hydrateInFlightRef.current = true;
        setAiChecksHydrating(true);
        try {
            const pairs = await Promise.all(
                resumes.map(async (doc) => {
                    try {
                        const check = await resumeCheckerService.getCheck(doc.id);
                        return [doc.id, check];
                    } catch (error) {
                        const status = error.response?.status;
                        if (status !== 404 && status !== 429) {
                            console.error(`Error loading AI check for ${doc.id}:`, error);
                        }
                        return null;
                    }
                })
            );

            const loaded = {};
            for (const pair of pairs) {
                if (pair) loaded[pair[0]] = pair[1];
            }
            if (Object.keys(loaded).length > 0) {
                setAiCheckResults((prev) => ({ ...prev, ...loaded }));
            }
        } finally {
            hydrateInFlightRef.current = false;
            setAiChecksHydrating(false);
        }
    }, []);

    // Fetch documents
    const fetchDocuments = useCallback(async () => {
        try {
            setLoading(true);
            const data = await documentService.getAll();
            setDocuments(data);
            if (AI_RESUME_CHECK_ENABLED) {
                void hydrateAiCheckResults(data);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [hydrateAiCheckResults]);

    useEffect(() => {
        fetchDocuments();
        if (AI_RESUME_CHECK_ENABLED) {
            fetchAiSettings();
        }
    }, [fetchDocuments, fetchAiSettings]);

    // Apply filters
    useEffect(() => {
        let filtered = [...documents];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(doc =>
                doc.name.toLowerCase().includes(query) ||
                (doc.notes && doc.notes.toLowerCase().includes(query))
            );
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(doc => doc.type === typeFilter);
        }

        setFilteredDocuments(filtered);
    }, [searchQuery, typeFilter, documents]);

    // Handle file upload
    const handleUpload = async (file, metadata) => {
        try {
            setActionLoading(true);
            const { ats_score, ats_analyzed_at, ats_analysis, ...uploadMetadata } = metadata;
            const uploadedDocument = await documentService.upload(file, uploadMetadata);

            if (ats_score !== undefined && uploadedDocument?.id) {
                await documentService.update(uploadedDocument.id, {
                    ats_score,
                    ats_analyzed_at,
                    ats_analysis
                });
            }
            toast.success('Document uploaded successfully!');
            setIsUploadOpen(false);
            fetchDocuments();
            return true;
        } catch (error) {
            console.error('Error uploading document:', error);
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to upload document. Please try again.');
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    // Handle external link creation
    const handleCreateExternal = async (data) => {
        try {
            setActionLoading(true);
            await documentService.create(data);
            toast.success('Link added successfully!');
            setIsUploadOpen(false);
            fetchDocuments();
            return true;
        } catch (error) {
            console.error('Error creating document:', error);
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to add link. Please try again.');
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    // Handle edit
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editDocument) return;

        try {
            setActionLoading(true);
            await documentService.update(editDocument.id, {
                name: editDocument.name,
                type: editDocument.type,
                version: editDocument.version,
                notes: editDocument.notes
            });
            toast.success('Document updated!');
            setEditDocument(null);
            fetchDocuments();
        } catch (error) {
            console.error('Error updating document:', error);
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to update document. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle ATS re-check for existing uploaded resumes
    const handleCheckAts = async (document) => {
        if (!isAtsEligible(document)) return;

        try {
            setCheckingAtsId(document.id);
            const analysis = await analyzeFileFromUrl(
                document.file_url,
                inferResumeFileName(document)
            );
            const updated = await documentService.update(document.id, {
                ats_score: analysis.score,
                ats_analyzed_at: new Date().toISOString(),
                ats_analysis: analysis
            });

            setDocuments(prev => prev.map(doc => (
                doc.id === document.id
                    ? { ...doc, ...updated, file_url: doc.file_url }
                    : doc
            )));
            toast.success(document.ats_score != null ? 'ATS score refreshed!' : 'ATS analysis complete!');
        } catch (error) {
            console.error('Error checking ATS score:', error);
            toast.error(getAtsAnalysisErrorMessage(error));
        } finally {
            setCheckingAtsId(null);
        }
    };

    // Handle AI resume check
    const handleAiCheck = async (document) => {
        if (!AI_RESUME_CHECK_ENABLED) return;
        if (document.type !== 'resume' || document.is_external) return;

        if (isAiSettingsLoading) {
            toast.info('Loading AI settings…');
            return;
        }

        if (!aiSettings?.configured) {
            toast.info(
                aiSettings?.needsKeyRefresh
                    ? 'Your saved API key needs to be re-entered.'
                    : 'Add your Gemini API key to run AI resume checks.'
            );
            setIsAiSettingsOpen(true);
            return;
        }

        try {
            setAiCheckingId(document.id);
            const result = await resumeCheckerService.runCheck(document.id);
            setAiCheckResults(prev => ({ ...prev, [document.id]: result }));
            toast.success(
                result.status === 'completed'
                    ? `AI check complete! Score: ${result.overall_score}/100`
                    : 'AI check finished.'
            );
        } catch (error) {
            console.error('Error running AI resume check:', error);
            const data = error.response?.data || {};
            const msg = data.message || data.error;
            if (error.response?.status === 429) {
                if (data.code === 'AI_CHECK_RATE_LIMIT') {
                    const mins = data.retryAfterSeconds
                        ? Math.max(1, Math.ceil(data.retryAfterSeconds / 60))
                        : null;
                    toast.error(
                        mins
                            ? `Too many AI checks (${data.limit || 10} per ${data.window || '15 minutes'}). Try again in ~${mins} min.`
                            : (msg || 'Too many AI checks. Please wait before trying again.'),
                        { duration: 10000 }
                    );
                } else {
                    toast.error(msg || 'Gemini quota or rate limit reached. Try gemini-3.1-flash-lite in AI Settings or wait a few minutes.', { duration: 8000 });
                }
            } else if (error.response?.status === 503) {
                toast.error('AI resume checker is not enabled on this server.');
            } else if (error.response?.status === 504 || data.error === 'LLM_TIMEOUT') {
                toast.error(
                    msg || 'AI analysis timed out. Try gemini-2.5-flash in AI Settings, or wait a moment and retry.',
                    { duration: 10000 }
                );
            } else if (error.response?.status === 400 && (data.needsApiKey || data.needsKeyRefresh || data.error === 'LLM_AUTH_ERROR' || data.error === 'KEY_DECRYPT_FAILED')) {
                toast.error(msg || 'Invalid or unreadable API key. Re-enter your Gemini key in AI Settings.', { duration: 8000 });
                setIsAiSettingsOpen(true);
            } else {
                toast.error(msg || 'AI resume check failed. Please try again.');
            }
            if (error.response?.data?.check_id) {
                setAiCheckResults(prev => ({
                    ...prev,
                    [document.id]: {
                        status: 'failed',
                        error: msg || 'Analysis failed.',
                    },
                }));
            }
        } finally {
            setAiCheckingId(null);
        }
    };

    const handleSaveAiSettings = async ({ apiKey, provider, model }) => {
        try {
            setIsSavingAiSettings(true);
            const saved = await aiSettingsService.save({ apiKey, provider, model });
            setAiSettings(saved);
            toast.success(saved.message || 'AI settings saved!');
            setIsAiSettingsOpen(false);
            return true;
        } catch (error) {
            console.error('Error saving AI settings:', error);
            const details = error.response?.data?.details;
            const detailMessage = Array.isArray(details) && details.length > 0
                ? details.map((d) => d.message).join(' ')
                : null;
            const msg = detailMessage || error.response?.data?.message;
            const code = error.response?.data?.code;
            if (code === 'AI_TABLES_MISSING') {
                toast.error(msg || 'Database setup required. Run docs/ai-tables-setup.sql in Supabase SQL Editor.', { duration: 8000 });
            } else if (code === 'KEY_DECRYPT_FAILED' || error.response?.data?.needsKeyRefresh) {
                toast.error(msg || 'Re-enter your full Gemini API key to continue.', { duration: 8000 });
            } else {
                toast.error(msg || 'Failed to save AI settings.');
            }
            return false;
        } finally {
            setIsSavingAiSettings(false);
        }
    };

    // Handle delete
    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        try {
            setActionLoading(true);
            await documentService.delete(deleteConfirm.id);
            toast.success('Document deleted!');
            setDeleteConfirm(null);
            fetchDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to delete document. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setTypeFilter('all');
    };



    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white p-4 sm:p-6">
            <SEO
                title="Documents"
                description="Manage your resumes, cover letters, and portfolio links"
                noindex={true}
            />
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Documents</h1>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                            Manage your resumes, cover letters, and portfolio links
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        {AI_RESUME_CHECK_ENABLED && (
                        <Button
                            variant="secondary"
                            onClick={() => setIsAiSettingsOpen(true)}
                            className="flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            <FaBrain size={14} />
                            <span>
                                {aiSettings?.configured ? 'AI Settings' : 'Add API Key'}
                                {aiSettings?.configured && aiSettings.model && (
                                    <span className="hidden sm:inline text-gray-500 font-normal">
                                        {' '}· {aiSettings.model}
                                    </span>
                                )}
                            </span>
                        </Button>
                        )}
                        <Button
                            variant="primary"
                            onClick={() => setIsUploadOpen(true)}
                            className="flex items-center w-full sm:w-auto justify-center"
                        >
                            <FaPlus className="mr-2" />
                            Add Document
                        </Button>
                    </div>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-4 mb-6 border border-gray-200 dark:border-white/10">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or notes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full sm:w-auto"
                            >
                                <option value="all" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">All Types</option>
                                <option value="resume" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Resumes</option>
                                <option value="cover_letter" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Cover Letters</option>
                                <option value="portfolio" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Portfolio</option>
                                <option value="other" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Other</option>
                            </select>

                            {/* Clear Filters Button */}
                            {(searchQuery || typeFilter !== 'all') && (
                                <Button variant="secondary" onClick={clearFilters} className="w-full sm:w-auto">
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Results Count + Storage Info */}
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Showing {filteredDocuments.length} of {documents.length} documents
                        </span>
                        <span className="text-sm text-gray-500">
                            {documents.length}/20 documents used • Max 5MB per file
                        </span>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading documents...</p>
                    </div>
                ) : filteredDocuments.length > 0 ? (
                    /* Documents Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filteredDocuments.map(doc => (
                            <DocumentCard
                                key={doc.id}
                                document={doc}
                                onEdit={setEditDocument}
                                onDelete={setDeleteConfirm}
                                onCheckAts={handleCheckAts}
                                isCheckingAts={checkingAtsId === doc.id}
                                onAiCheck={handleAiCheck}
                                isAiChecking={aiCheckingId === doc.id}
                                isHydratingAiCheck={
                                    aiChecksHydrating
                                    && doc.type === 'resume'
                                    && !doc.is_external
                                    && !aiCheckResults[doc.id]
                                }
                                aiCheckResult={aiCheckResults[doc.id] ?? null}
                            />
                        ))}
                    </div>
                ) : documents.length > 0 ? (
                    <div className="text-center py-16 sm:py-20">
                        <FaSearch className="mx-auto h-16 w-16 text-gray-600 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">No documents match your search</p>
                        <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="text-center py-16 sm:py-20">
                        <div className="mb-4">
                            <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">No documents yet</p>
                        <p className="text-gray-500 text-sm mb-6">Upload your resumes, cover letters, and portfolio links</p>
                        <Button
                            variant="primary"
                            onClick={() => setIsUploadOpen(true)}
                        >
                            <FaPlus className="inline mr-2" />
                            Add Your First Document
                        </Button>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <DocumentUpload
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onUpload={handleUpload}
                onCreateExternal={handleCreateExternal}
                isLoading={actionLoading}
            />

            {AI_RESUME_CHECK_ENABLED && (
            <AiSettingsModal
                isOpen={isAiSettingsOpen}
                onClose={() => setIsAiSettingsOpen(false)}
                settings={aiSettings}
                onSave={handleSaveAiSettings}
                isSaving={isSavingAiSettings}
            />
            )}

            {/* Edit Modal */}
            <Modal
                isOpen={!!editDocument}
                onClose={() => setEditDocument(null)}
                title="Edit Document"
            >
                {editDocument && (
                    <form onSubmit={handleSaveEdit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">Name</label>
                            <input
                                type="text"
                                value={editDocument.name}
                                onChange={(e) => setEditDocument({ ...editDocument, name: e.target.value })}
                                className="w-full px-3 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">Type</label>
                            <select
                                value={editDocument.type}
                                onChange={(e) => setEditDocument({ ...editDocument, type: e.target.value })}
                                className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="resume">Resume</option>
                                <option value="cover_letter">Cover Letter</option>
                                <option value="portfolio">Portfolio</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">Version</label>
                            <input
                                type="text"
                                value={editDocument.version || ''}
                                onChange={(e) => setEditDocument({ ...editDocument, version: e.target.value })}
                                className="w-full px-3 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-1">Notes</label>
                            <textarea
                                value={editDocument.notes || ''}
                                onChange={(e) => setEditDocument({ ...editDocument, notes: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setEditDocument(null)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={actionLoading}
                                className="flex-1"
                            >
                                {actionLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Confirm Delete"
            >
                {deleteConfirm && (
                    <div>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">
                            Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{deleteConfirm.name}</strong>? This action cannot be undone.
                            {deleteConfirm.opportunity_documents?.length > 0 && (
                                <span className="block mt-2 text-yellow-400">
                                    This document is linked to {deleteConfirm.opportunity_documents.length} opportunity(s).
                                </span>
                            )}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmDelete} disabled={actionLoading}>
                                {actionLoading ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Documents;
