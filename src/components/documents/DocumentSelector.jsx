// DocumentSelector - component for selecting documents to attach to an opportunity
// Only shown for opportunity categories that support document attachments
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaPlus, FaTimes, FaFile, FaFilePdf, FaLink } from 'react-icons/fa';
import { documentService } from '../../services/api';
import { supportsDocuments } from '../../utils/opportunityHelpers';

const typeIcons = {
    resume: FaFilePdf,
    cover_letter: FaFile,
    portfolio: FaLink,
    other: FaFile
};

const typeColors = {
    resume: 'text-blue-400',
    cover_letter: 'text-green-400',
    portfolio: 'text-purple-400',
    other: 'text-gray-600 dark:text-gray-400'
};

const DocumentSelector = ({ opportunityId, category, onDocumentsChange }) => {
    const [allDocuments, setAllDocuments] = useState([]);
    const [linkedDocuments, setLinkedDocuments] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    // Fetch all user documents (only if category supports documents)
    useEffect(() => {
        if (!supportsDocuments(category)) return;

        const fetchDocuments = async () => {
            try {
                setLoading(true);
                const docs = await documentService.getAll();
                setAllDocuments(docs);
            } catch (error) {
                console.error('Error fetching documents:', error);
                toast.error('Failed to load documents');
            } finally {
                setLoading(false);
            }
        };
        fetchDocuments();
    }, [category]);

    // Fetch linked documents for this opportunity (only if category supports documents)
    useEffect(() => {
        if (!supportsDocuments(category) || !opportunityId) return;

        const fetchLinkedDocuments = async () => {
            try {
                const docs = await documentService.getByOpportunity(opportunityId);
                setLinkedDocuments(docs);
                if (onDocumentsChange) {
                    onDocumentsChange(docs);
                }
            } catch (error) {
                console.error('Error fetching linked documents:', error);
                toast.error('Failed to load attached documents');
            }
        };
        fetchLinkedDocuments();
    }, [opportunityId, category, onDocumentsChange]);

    // Only show for categories that support documents
    if (!supportsDocuments(category)) {
        return null;
    }

    const handleLink = async (documentId) => {
        if (!opportunityId) return;

        try {
            setActionLoading(documentId);
            await documentService.assign(documentId, opportunityId);

            // Refresh linked documents
            const docs = await documentService.getByOpportunity(opportunityId);
            setLinkedDocuments(docs);
            if (onDocumentsChange) {
                onDocumentsChange(docs);
            }
            toast.success('Document attached successfully');
        } catch (error) {
            console.error('Error linking document:', error);
            toast.error(error.response?.data?.error || 'Failed to attach document');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnlink = async (documentId) => {
        if (!opportunityId) return;

        try {
            setActionLoading(documentId);
            await documentService.unassign(documentId, opportunityId);

            // Refresh linked documents
            const docs = await documentService.getByOpportunity(opportunityId);
            setLinkedDocuments(docs);
            if (onDocumentsChange) {
                onDocumentsChange(docs);
            }
            toast.success('Document removed');
        } catch (error) {
            console.error('Error unlinking document:', error);
            toast.error(error.response?.data?.error || 'Failed to remove document');
        } finally {
            setActionLoading(null);
        }
    };

    const isLinked = (docId) => linkedDocuments.some(d => d.id === docId);

    const availableDocuments = allDocuments.filter(d => !isLinked(d.id));

    return (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    Attached Documents
                </h3>
                {availableDocuments.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <FaPlus size={12} />
                        Add Document
                    </button>
                )}
            </div>

            {/* Linked Documents List */}
            {linkedDocuments.length > 0 ? (
                <div className="space-y-2 mb-4">
                    {linkedDocuments.map(doc => {
                        const Icon = typeIcons[doc.type] || FaFile;
                        const colorClass = typeColors[doc.type] || 'text-gray-600 dark:text-gray-400';

                        return (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={colorClass} size={16} />
                                    <div>
                                        <p className="text-gray-900 dark:text-white text-sm">{doc.name}</p>
                                        {doc.version && (
                                            <p className="text-gray-500 text-xs">{doc.version}</p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleUnlink(doc.id)}
                                    disabled={actionLoading === doc.id}
                                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-400 transition-colors"
                                    title="Remove"
                                >
                                    {actionLoading === doc.id ? (
                                        <span className="animate-spin">⟳</span>
                                    ) : (
                                        <FaTimes size={14} />
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-gray-500 text-sm mb-4">
                    No documents attached. Click "Add Document" to link a resume or cover letter.
                </p>
            )}

            {/* Document Selection Dropdown */}
            {isOpen && availableDocuments.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg p-2 max-h-48 overflow-y-auto">
                    {availableDocuments.map(doc => {
                        const Icon = typeIcons[doc.type] || FaFile;
                        const colorClass = typeColors[doc.type] || 'text-gray-600 dark:text-gray-400';

                        return (
                            <button
                                key={doc.id}
                                type="button"
                                onClick={() => handleLink(doc.id)}
                                disabled={actionLoading === doc.id}
                                className="w-full flex items-center gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
                            >
                                <Icon className={colorClass} size={16} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-900 dark:text-white text-sm truncate">{doc.name}</p>
                                    {doc.version && (
                                        <p className="text-gray-500 text-xs">{doc.version}</p>
                                    )}
                                </div>
                                {actionLoading === doc.id ? (
                                    <span className="text-gray-600 dark:text-gray-400 animate-spin">⟳</span>
                                ) : (
                                    <FaPlus className="text-green-400" size={14} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* No documents available message */}
            {allDocuments.length === 0 && !loading && (
                <p className="text-gray-500 text-sm">
                    No documents in your library. <Link to="/documents" className="text-blue-400 hover:underline">Add some documents</Link> first.
                </p>
            )}
        </div>
    );
};

export default DocumentSelector;
