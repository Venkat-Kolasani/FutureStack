import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiBriefcase, FiCode, FiArrowRight, FiFileText, FiCalendar, FiLayers, FiDownload } from 'react-icons/fi';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import SEO from '../components/seo/SEO';
import FAQ from '../components/common/FAQ';
import Footer from '../components/common/Footer';
import ThemeToggle from '../components/common/ThemeToggle';
import StatusIndicator from '../components/common/StatusIndicator';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
  }, []);

  const heroCtaClass = "px-8 py-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]";
  const cardBaseClass = "border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.03]";

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans selection:bg-blue-500 selection:text-gray-900 dark:text-white overflow-x-hidden transition-colors duration-300">
      <SEO
        title={null}
        description="Free opportunity tracker for students and developers. Track multi-round interviews, visualize rejections, manage hackathons, and export PDF reports."
        keywords="job tracker, internship tracker, hackathon tracker, application tracker, career tracker, job application organizer, student tools, developer tools, opportunity tracker"
        canonical="/"
      />
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-white dark:from-black via-transparent to-transparent transition-colors duration-300" />

        {/* Subtle Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-white dark:bg-black/5 dark:bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-white dark:bg-black/5 dark:bg-white/5 rounded-full blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-black/50 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
              <span className="font-bold text-white dark:text-gray-900 text-xl">F</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
              FutureTracker
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600 dark:text-gray-400">
            <a href="#features" className="hover:text-black dark:hover:text-white transition-colors">Features</a>
            <a href="#about" className="hover:text-black dark:hover:text-white transition-colors">About</a>
            <a href="https://github.com/Venkat-Kolasani/FutureStack" target="_blank" rel="noreferrer" className="hover:text-black dark:hover:text-white transition-colors">GitHub</a>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            <StatusIndicator className="hidden sm:inline-flex" />
            <SignedOut>
              {/* Sign In hidden on mobile - users can use hero CTA */}
              <SignInButton mode="modal">
                <button className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs sm:text-sm font-semibold rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95">
                  Get Started
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black text-xs sm:text-sm font-semibold rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all transform hover:scale-105 active:scale-95"
              >
                Launch App
              </button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {/* Hero Section */}
      <main className="relative z-10 min-h-screen flex flex-col justify-center pt-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
              Build Your Future, <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400">
                One Opportunity at a Time
              </span>
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              The all-in-one workspace for students and developers to track internships round-by-round,
              manage hackathons, and see exactly where your applications stand.
            </p>

            <div className="flex items-center justify-center gap-4">
              <SignedOut>
                <SignUpButton mode="modal">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={heroCtaClass}
                  >
                    Get Started Free
                    <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 border border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/40 text-gray-900 dark:text-white rounded-xl font-semibold text-lg transition-all"
                  >
                    Sign In
                  </motion.button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/dashboard')}
                  className={heroCtaClass}
                >
                  Go to Dashboard
                  <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </SignedIn>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Stats/Social Proof */}
      <div id="about" className="mt-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className={`rounded-3xl ${cardBaseClass} backdrop-blur-md p-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative overflow-hidden group`}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            {[
              { label: 'Organized', value: '100%' },
              { label: 'Missed Deadlines', value: '0' },
              { label: 'Opportunities', value: '∞' },
            ].map((stat, index) => (
              <div key={index} className="relative z-10">
                <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-gray-500 mb-2">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-widest uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="max-w-7xl mx-auto mt-32">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Everything you need to succeed</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Stop using spreadsheets. FutureTracker gives you a powerful, dedicated environment
            to manage your career growth.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <FiBriefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
              title: "Internship Tracker",
              desc: "Kanban board for applications with deadlines, notes, and document links. Rejected roles move out of your active list automatically.",
              gradient: "from-blue-500/20 to-cyan-500/5"
            },
            {
              icon: <FiLayers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
              title: "Interview Pipeline",
              desc: "Log every round (OA, technical, HR, final) and see where you cleared, what's pending, or which round you were rejected at.",
              gradient: "from-indigo-500/20 to-violet-500/5"
            },
            {
              icon: <FiCode className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
              title: "Hackathon Manager",
              desc: "Manage teams, project ideas, and submission deadlines for your next hackathon.",
              gradient: "from-purple-500/20 to-pink-500/5"
            },
            {
              icon: <FiDownload className="w-6 h-6 text-orange-600 dark:text-orange-400" />,
              title: "Reports & Export",
              desc: "Download PDF summaries with stats, opportunity details, and a breakdown of where rejections happened.",
              gradient: "from-orange-500/20 to-amber-500/5"
            },
            {
              icon: <FiFileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />,
              title: "Document Vault",
              desc: "Store resumes, cover letters, and portfolio links. Attach them to specific opportunities when you apply.",
              gradient: "from-yellow-500/20 to-orange-500/5"
            },
            {
              icon: <FiCalendar className="w-6 h-6 text-red-600 dark:text-red-400" />,
              title: "Smart Calendar",
              desc: "Never miss a deadline. Visualize application due dates and scheduled interview rounds in one view.",
              gradient: "from-red-500/20 to-rose-500/5"
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`group relative p-8 rounded-2xl ${cardBaseClass} hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10">
                <div className="w-12 h-12 bg-gray-100/50 dark:bg-white/5 rounded-xl flex items-center justify-center mb-6 ring-1 ring-gray-200 dark:ring-white/10 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-200 transition-colors">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed group-hover:text-gray-900 dark:group-hover:text-gray-300 transition-colors">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {/* FAQ Section */}
      <FAQ />

      {/* Footer */}
      <Footer />
    </div >
  );
};

export default Home;
