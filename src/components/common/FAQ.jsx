import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiMinus } from 'react-icons/fi';

const FAQItem = ({ question, answer, isOpen, onClick }) => {
    return (
        <motion.div
            initial={false}
            className="border border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-white/5 overflow-hidden hover:bg-gray-100/50 dark:hover:bg-white/10 transition-colors"
        >
            <button
                onClick={onClick}
                className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
            >
                <span className="text-lg font-medium text-gray-900 dark:text-white">{question}</span>
                <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 dark:border-white/20 transition-colors ${isOpen ? 'bg-gray-900 text-gray-900 dark:text-white dark:bg-white dark:text-black' : 'text-gray-900 dark:text-white'}`}>
                    {isOpen ? <FiMinus size={14} /> : <FiPlus size={14} />}
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="px-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
                            {answer}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            question: "What is FutureTracker?",
            answer: "FutureTracker is an all-in-one career management workspace designed specifically for students and developers. It replaces scattered spreadsheets with a powerful, dedicated platform to track internships, manage hackathon projects, and visualize your professional growth."
        },
        {
            question: "Why should I use this instead of spreadsheets?",
            answer: "Spreadsheets are static and manual. FutureTracker provides distinct advantages: Kanban boards for visual stages, automated deadlines on a calendar, analytics to track your success rate, and specialized tools for hackathon team management—all key features that spreadsheets lack out of the box."
        },
        {
            question: "How does it help manage opportunities?",
            answer: "We use a stage-based tracking system (Kanban) that moves applications from 'Wishlist' to 'Offer'. You can attach documents, set interview dates, and add notes to each opportunity. For hackathons, you can manage team members, submission requirements, and project milestones in a dedicated view."
        },
        {
            question: "Is FutureTracker really free?",
            answer: "Yes! FutureTracker is built to empower the next generation of developers. All core features, including application tracking, hackathon management, and analytics, are completely free to use."
        },
        {
            question: "How do I get started?",
            answer: "Simply sign up with your email or social account. Once logged in, you can immediately start adding your target companies to the tracker or creating your first hackathon project. No credit card required."
        }
    ];

    const handleToggle = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="faq" className="py-32 relative">
            {/* Background Glow */}
            <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-3xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-block px-4 py-1.5 mb-6 border border-gray-200 dark:border-white/10 rounded-full bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400 tracking-wider">★ FAQS</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
                        Questions? We've got <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-orange-400 dark:from-orange-200 dark:via-orange-100 dark:to-white">answers</span>
                    </h2>
                </div>

                <div className="flex flex-col gap-4">
                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === index}
                            onClick={() => handleToggle(index)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
