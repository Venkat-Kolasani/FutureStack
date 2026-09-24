import React, { useEffect, useState } from 'react';
import { FaBrain, FaKey, FaExternalLinkAlt, FaCheckCircle } from 'react-icons/fa';
import Modal from '../common/Modal';
import Button from '../common/Button';

const PROVIDERS = [
    {
        id: 'gemini',
        label: 'Gemini',
        href: 'https://aistudio.google.com/api-keys',
        linkLabel: 'Get a Gemini key',
        models: [
            { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
            { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite' },
            { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
            { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
        ],
    },
    {
        id: 'groq',
        label: 'Groq',
        href: 'https://console.groq.com/keys',
        linkLabel: 'Get a Groq key',
        models: [{ value: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b' }],
    },
    {
        id: 'anthropic',
        label: 'Claude',
        href: 'https://console.anthropic.com/settings/keys',
        linkLabel: 'Get a Claude key',
        models: [{ value: 'claude-sonnet-4-5', label: 'claude-sonnet-4-5' }],
    },
    {
        id: 'ollama',
        label: 'Ollama',
        href: '',
        linkLabel: '',
        models: [{ value: 'llama3.2', label: 'llama3.2' }],
    },
];

const AiSettingsModal = ({
    isOpen,
    onClose,
    settings,
    onSave,
    onRemove,
    isSaving = false,
    initialProvider = 'gemini',
}) => {
    const [provider, setProvider] = useState('gemini');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('gemini-2.5-flash');

    const saved = (settings?.providers || []).find((row) => row.provider === provider && row.configured);
    const selected = PROVIDERS.find((item) => item.id === provider) || PROVIDERS[0];

    useEffect(() => {
        if (!isOpen) return;
        setApiKey('');
        const initial = initialProvider || settings?.provider || 'gemini';
        setProvider(initial);
        const option = PROVIDERS.find((item) => item.id === initial) || PROVIDERS[0];
        setModel(settings?.model && option.models.some((m) => m.value === settings.model)
            ? settings.model
            : option.models[0].value);
    }, [isOpen, settings?.provider, settings?.model, initialProvider]);

    const handleProvider = (next) => {
        const option = PROVIDERS.find((item) => item.id === next) || PROVIDERS[0];
        const row = (settings?.providers || []).find((item) => item.provider === next);
        setProvider(next);
        setApiKey('');
        setModel(row?.model && option.models.some((m) => m.value === row.model)
            ? row.model
            : option.models[0].value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const savedSettings = await onSave({ apiKey, model, provider });
        if (savedSettings) setApiKey('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Settings">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-start gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                    <FaBrain className="text-violet-400 mt-0.5 shrink-0" size={16} />
                    <p className="text-sm text-gray-200">
                        Save your own key. Interview prep uses that key only. The key itself is never shown again.
                    </p>
                </div>

                {settings?.needsKeyRefresh && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
                        {settings.message || 'A saved key could not be read. Enter it again.'}
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {PROVIDERS.map((item) => {
                        const row = (settings?.providers || []).find((entry) => entry.provider === item.id && entry.configured);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleProvider(item.id)}
                                className={`rounded-full border px-3 py-1 text-xs ${
                                    provider === item.id
                                        ? 'border-violet-400 text-white bg-violet-500/20'
                                        : 'border-white/10 text-gray-400'
                                }`}
                            >
                                {item.label}{row?.keyHint ? ` ${row.keyHint}` : row ? ' · saved' : ''}
                            </button>
                        );
                    })}
                </div>

                {saved && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                        <div className="flex items-start gap-2">
                            <FaCheckCircle className="text-emerald-400 mt-0.5 shrink-0" size={14} />
                            <p className="text-xs text-gray-300">
                                {selected.label}{saved.keyHint ? ` ${saved.keyHint}` : ''} · {saved.model}
                            </p>
                        </div>
                        {onRemove && provider !== 'ollama' && (
                            <button type="button" onClick={() => onRemove(provider)} className="text-xs text-gray-400 hover:text-red-300">
                                Remove
                            </button>
                        )}
                    </div>
                )}

                {provider !== 'ollama' && (
                    <div>
                        <label htmlFor="provider-api-key" className="block text-sm font-medium text-gray-200 mb-1">
                            {selected.label} API key
                        </label>
                        <div className="relative">
                            <FaKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                            <input
                                id="provider-api-key"
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={saved ? 'Leave blank to keep the current key' : 'Paste your API key'}
                                className="w-full pl-9 pr-3 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                autoComplete="off"
                            />
                        </div>
                        {selected.href && (
                            <a href={selected.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-violet-400 hover:text-violet-300">
                                {selected.linkLabel}
                                <FaExternalLinkAlt size={10} />
                            </a>
                        )}
                    </div>
                )}

                <div>
                    <label htmlFor="provider-model" className="block text-sm font-medium text-gray-200 mb-1">Model</label>
                    <select
                        id="provider-model"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        {selected.models.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={isSaving || (provider !== 'ollama' && !apiKey && !saved)}>
                        {isSaving ? 'Saving…' : 'Save key'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AiSettingsModal;
