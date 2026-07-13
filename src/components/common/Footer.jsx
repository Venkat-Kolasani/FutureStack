import { FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import StatusIndicator from './StatusIndicator';

const Footer = () => {
    return (
        <footer className="bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-white/10 relative overflow-hidden transition-colors duration-300">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
                <div className="grid md:grid-cols-4 gap-12 mb-20">
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
                                <span className="font-bold text-white dark:text-black text-xl">F</span>
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                                FutureTracker
                            </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm">
                            The all-in-one workspace for students and developers.
                            Track internships, manage hackathons, and build your future.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-6">Product</h4>
                        <ul className="space-y-4 text-gray-600 dark:text-gray-400">
                            <li><a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">Features</a></li>
                            <li><a href="#faq" className="hover:text-gray-900 dark:hover:text-white transition-colors">FAQ</a></li>
                            <li><a href="/login" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sign In</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-900 dark:text-white mb-6">Connect</h4>
                        <div className="flex gap-4">
                            <a
                                href="https://github.com/Venkat-Kolasani/FutureStack"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all hover:-translate-y-1"
                            >
                                <FiGithub size={20} />
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all hover:-translate-y-1"
                            >
                                <FiTwitter size={20} />
                            </a>
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-all hover:-translate-y-1"
                            >
                                <FiLinkedin size={20} />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-white/10 pt-8 flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        © {new Date().getFullYear()} FutureTracker. All rights reserved.
                    </p>
                    <StatusIndicator />
                </div>
            </div>

            {/* Large Branding Text */}
            <div className="mt-20 select-none pointer-events-none w-full overflow-hidden flex justify-center">
                <h1 className="text-[10vw] leading-none font-bold text-orange-600/15 dark:text-white/5 text-center whitespace-nowrap">
                    FUTURE TRACKER
                </h1>
            </div>
        </footer>
    );
};

export default Footer;
