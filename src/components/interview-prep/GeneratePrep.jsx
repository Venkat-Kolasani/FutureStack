import React, { useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../common/Button';

const KINDS = [
    { id: 'plan', label: 'Plan' },
    { id: 'questions', label: 'Questions' },
    { id: 'star', label: 'STAR' },
    { id: 'exam', label: 'Mock exam' },
];

const PROVIDER_OPTIONS = [
    { id: 'gemini', label: 'Gemini' },
    { id: 'groq', label: 'Groq · GPT-OSS 120B' },
    { id: 'anthropic', label: 'Claude' },
    { id: 'ollama', label: 'Ollama' },
];

const GeneratePrep = ({
    providers,
    focus,
    onOpenSettings,
    onGenerate,
    onAccept,
    generating,
}) => {
    const usable = (providers || []).filter((row) => row.configured);
    const [kind, setKind] = useState('questions');
    const [provider, setProvider] = useState(usable[0]?.provider || 'gemini');
    const [draft, setDraft] = useState(null);
    const [selected, setSelected] = useState({});

    const saved = usable.find((row) => row.provider === provider);
    const toggle = (key) => setSelected((current) => ({ ...current, [key]: !current[key] }));

    const handleGenerate = async () => {
        setDraft(null);
        const result = await onGenerate({ kind, focus, provider });
        if (!result?.draft) return;
        const next = {};
        const items = result.draft.questions || result.draft.topics || result.draft.behavioral || result.draft.checklist || [];
        items.forEach((_, index) => { next[index] = true; });
        setSelected(next);
        setDraft(result);
    };

    const handleAccept = async () => {
        const body = resultBody(draft, selected, focus);
        if (!body) {
            toast.info('Select at least one item.');
            return;
        }
        await onAccept(body);
        setDraft(null);
    };

    const items = draftItems(draft?.draft, draft?.kind);

    return (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <label className="block text-sm text-gray-700 dark:text-gray-300">
                    Provider
                    <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="mt-1 block w-full sm:w-64 bg-white dark:bg-black border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
                    >
                        {PROVIDER_OPTIONS.map((option) => {
                            const row = usable.find((item) => item.provider === option.id);
                            return (
                                <option key={option.id} value={option.id}>
                                    {option.label}{row ? ' · key saved' : ''}
                                </option>
                            );
                        })}
                    </select>
                </label>
                <Button variant="outline" onClick={() => onOpenSettings(provider)}>
                    {saved ? 'Update API key' : 'Add API key'}
                </Button>
            </div>
            {!saved && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Save a key for this provider before generating. Groq uses openai/gpt-oss-120b.
                </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
                {KINDS.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setKind(item.id)}
                        className={`rounded-full border px-3 py-1 text-xs ${kind === item.id ? 'border-blue-400 text-white' : 'border-white/10 text-gray-400'}`}
                    >
                        {item.label}
                    </button>
                ))}
                <Button variant="primary" onClick={handleGenerate} disabled={generating || !saved} className="!px-3 !py-1.5 text-xs">
                    {generating ? 'Generating…' : 'Generate'}
                </Button>
            </div>
            {items.length > 0 && (
                <div className="space-y-2">
                    {items.map((item) => (
                        <label key={item.key} className="flex gap-2 text-sm text-gray-200">
                            <input type="checkbox" checked={Boolean(selected[item.key])} onChange={() => toggle(item.key)} />
                            <span>{item.label}</span>
                        </label>
                    ))}
                    <div className="flex gap-2">
                        <Button variant="primary" onClick={handleAccept} className="!px-3 !py-1.5 text-xs">Add selected</Button>
                        <Button variant="secondary" onClick={() => setDraft(null)} className="!px-3 !py-1.5 text-xs">Dismiss</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

function draftItems(draft, kind) {
    if (!draft) return [];
    if (kind === 'plan') {
        return [
            ...(draft.checklist || []).map((item, index) => ({ key: `c${index}`, label: item })),
            ...(draft.topics || []).map((item, index) => ({ key: `t${index}`, label: item.topic })),
        ];
    }
    if (kind === 'star') {
        return (draft.behavioral || []).map((item, index) => ({ key: index, label: item.question }));
    }
    return (draft.questions || []).map((item, index) => ({ key: index, label: item.question }));
}

function resultBody(result, selected, focus) {
    if (!result?.draft) return null;
    const draft = result.draft;
    const body = { focus };
    if (result.kind === 'plan') {
        body.checklist = (draft.checklist || []).filter((_, index) => selected[`c${index}`]);
        body.topics = (draft.topics || []).filter((_, index) => selected[`t${index}`]);
        if (!body.checklist.length && !body.topics.length) return null;
        return body;
    }
    if (result.kind === 'star') {
        body.behavioral = (draft.behavioral || []).filter((_, index) => selected[index]);
        return body.behavioral.length ? body : null;
    }
    body.questions = (draft.questions || [])
        .filter((_, index) => selected[index])
        .map((item) => ({ ...item, is_exam: result.kind === 'exam' }));
    return body.questions.length ? body : null;
}

export default GeneratePrep;
