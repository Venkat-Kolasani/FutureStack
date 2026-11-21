import React, { useMemo, useState } from 'react';
import Button from '../common/Button';

const PracticeSession = ({ questions, behavioral, examOnly, onUpdateQuestion, onClose }) => {
    const cards = useMemo(() => {
        const questionCards = questions
            .filter((item) => !examOnly || item.is_exam)
            .map((item) => ({ type: 'question', id: item.id, prompt: item.question, answer: item.answer, item }));
        const storyCards = examOnly ? [] : behavioral.map((item) => ({
            type: 'story',
            id: item.id,
            prompt: item.question,
            answer: [item.situation, item.task, item.action, item.result].filter(Boolean).join('\n\n'),
            item,
        }));
        return [...questionCards, ...storyCards];
    }, [questions, behavioral, examOnly]);

    const [index, setIndex] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const card = cards[index];

    if (!card) {
        return (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-6">
                <p className="text-sm text-gray-500 mb-4">Nothing to practice for this round yet.</p>
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
        );
    }

    const markPrepared = async () => {
        if (card.type === 'question') {
            await onUpdateQuestion(card.id, { is_prepared: true });
        }
        setRevealed(false);
        setIndex((current) => Math.min(current + 1, cards.length - 1));
    };

    return (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-6">
            <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-500">{index + 1} of {cards.length}</p>
                <button type="button" onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Close</button>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{card.prompt}</h3>
            {revealed ? (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-6">{card.answer || 'No answer written yet.'}</p>
            ) : (
                <p className="text-sm text-gray-500 mb-6">Answer out loud, then reveal the notes.</p>
            )}
            <div className="flex flex-wrap gap-2">
                {!revealed && <Button variant="secondary" onClick={() => setRevealed(true)}>Reveal</Button>}
                {card.type === 'question' && <Button variant="primary" onClick={markPrepared}>Mark prepared</Button>}
                <Button variant="outline" onClick={() => { setRevealed(false); setIndex((current) => (current + 1) % cards.length); }}>Next</Button>
            </div>
        </div>
    );
};

export default PracticeSession;
