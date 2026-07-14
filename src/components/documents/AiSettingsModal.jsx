/**
 * AiSettingsModal — BYOK: save the user's Gemini API key once, encrypted server-side.
 */

import React, { useEffect, useState } from 'react';
import { FaBrain, FaKey, FaExternalLinkAlt, FaCheckCircle } from 'react-icons/fa';
import Modal from '../common/Modal';
import Button from '../common/Button';

const MODEL_OPTIONS = [
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash', hint: 'Recommended — reliable for most keys' },
    { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite', hint: 'Lowest cost when your key has access' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash', hint: 'Legacy flash model' },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro', hint: 'Highest quality, uses more quota' },
];

const AiSettingsModal = ({
    isOpen,
    onClose,
    settings,
    onSave,
    isSaving = false,
}) => {
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gemini-2.5-flash');

    useEffect(() => {
        if (isOpen) {
            setApiKey('');
            setModel(settings?.model || 'gemini-2.5-flash');
        }
    }, [isOpen, settings?.model]);

    const selectedModel = MODEL_OPTIONS.find((m) => m.value === model);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const saved = await onSave({ apiKey, model, provider: 'gemini' });
        if (saved) {
            setApiKey('');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Settings">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-start gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                    <FaBrain className="text-violet-400 mt-0.5 shrink-0" size={16} />
                    <div>
                        <p className="text-sm text-gray-200 font-medium">Bring your own API key</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                            Use a key from Google AI Studio. Keys with HTTP referrer or IP restrictions
                            will fail here — create an unrestricted key.
                        </p>
                    </div>
                </div>

                {settings?.needsKeyRefresh && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
                        {settings.message || 'Your saved API key could not be read. Enter it again below.'}
                    </div>
                )}

                {settings?.configured && !settings?.needsKeyRefresh && (
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                        <FaCheckCircle className="text-emerald-400 mt-0.5 shrink-0" size={14} />
                        <div className="text-sm">
                            <p className="text-emerald-300 font-medium">Connected</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                Key{settings.keyHint ? ` ${settings.keyHint}` : ''} · {settings.model}
                            </p>
                        </div>
                    </div>
                )}

                <div>
                    <label htmlFor="gemini-api-key" className="block text-sm font-medium text-gray-200 mb-1">
                        Gemini API key
                        {settings?.configured && !settings?.needsKeyRefresh && (
                            <span className="text-gray-500 font-normal"> (optional)</span>
                        )}
                    </label>
                    <div className="relative">
                        <FaKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                        <input
                            id="gemini-api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={settings?.configured && !settings?.needsKeyRefresh ? 'Leave blank to keep current key' : 'Paste your Gemini API key'}
                            className="w-full pl-9 pr-3 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            autoComplete="off"
                            required={!settings?.configured || settings?.needsKeyRefresh}
                        />
                    </div>
                    <a
                        href="https://aistudio.google.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-violet-400 hover:text-violet-300"
                    >
                        Get a free Gemini key
                        <FaExternalLinkAlt size={10} />
                    </a>
                </div>

                <div>
                    <label htmlFor="gemini-model" className="block text-sm font-medium text-gray-200 mb-1">
                        Model
                    </label>
                    <select
                        id="gemini-model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        {MODEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    {selectedModel?.hint && (
                        <p className="mt-1.5 text-xs text-gray-500">{selectedModel.hint}</p>
                    )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={isSaving || (!apiKey && !settings?.configured && !settings?.needsKeyRefresh)}>
                        {isSaving ? 'Saving…' : settings?.configured && !settings?.needsKeyRefresh ? 'Save settings' : 'Save key'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AiSettingsModal;
