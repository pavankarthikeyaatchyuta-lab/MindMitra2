import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ThemeToggle from '../components/ThemeToggle';
import { 
  Brain, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Sparkles, 
  Cpu, 
  TrendingUp, 
  Globe, 
  Lock,
  Play,
  HeartHandshake
} from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const { caregiver, currentUser } = useApp();

  const handleGetStarted = () => {
    if (caregiver) {
      navigate('/caregiver');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* 1. Global Public Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2 sm:py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-h-[40px]">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors shrink-0">
              <Brain size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                MindMitra
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Personal Behavioral Memory
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <ThemeToggle />

            {caregiver ? (
              <button
                onClick={() => navigate('/caregiver')}
                className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer min-h-[36px] sm:min-h-[40px]"
              >
                <span>Caregiver Portal</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/login"
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[36px] flex items-center"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm items-center gap-1 transition-all min-h-[36px]"
                >
                  <span>Get Started</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section: "The phone learns your pattern." */}
      <section className="pt-8 sm:pt-12 pb-12 sm:pb-16 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-[11px] sm:text-xs font-black uppercase tracking-wider mb-4 sm:mb-6 shadow-xs">
          <Sparkles size={13} className="text-blue-600 dark:text-blue-400" />
          <span>iQOO Hackathon 2026 • Phone-First Behavioral Memory</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] max-w-4xl">
          Your phone learns <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">what normal looks like for you.</span>
        </h1>

        <p className="mt-3.5 sm:mt-5 text-sm sm:text-lg text-slate-700 dark:text-slate-200 max-w-3xl leading-relaxed font-medium">
          MindMitra does not compare older adults to arbitrary population leaderboards. Through calm daily activities, the phone observes fine-grained touch latency, tap cadence, and hesitation intervals to establish an individual behavioral baseline — adapting directly on-device in real time.
        </p>

        {/* The Closed Behavioral Loop */}
        <div className="my-6 sm:my-8 py-2.5 sm:py-3 px-3 sm:px-5 rounded-2xl bg-white/90 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-sm max-w-3xl w-full flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs font-extrabold text-slate-800 dark:text-slate-200">
          <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">1. OBSERVE</span>
          <span className="text-slate-400">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">2. LEARN</span>
          <span className="text-slate-400">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">3. REMEMBER</span>
          <span className="text-slate-400">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">4. DETECT</span>
          <span className="text-slate-400">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">5. ADAPT</span>
        </div>

        {/* Primary Action Buttons: Both Get Started & Log In Clearly Exposed */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <Link
            to={caregiver ? '/caregiver' : '/register'}
            className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-98 transition-all min-h-[48px]"
          >
            <span>{caregiver ? 'Enter Caregiver Portal' : 'Get Started'}</span>
            <ArrowRight size={18} />
          </Link>

          {!caregiver && (
            <Link
              to="/login"
              className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all min-h-[48px]"
            >
              <span>Log In</span>
            </Link>
          )}

          <Link
            to={caregiver ? '/caregiver' : '/login'}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[48px]"
          >
            <HeartHandshake size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>Caregiver Portal</span>
          </Link>
        </div>
      </section>

      {/* 3. CORE ARCHITECTURE: SENSE -> LEARN -> ADAPT -> EXPLAIN */}
      <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto w-full border-t border-slate-200 dark:border-slate-800">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Activity size={13} />
            <span>Personal Behavioral Memory</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            How Your Phone Understands Your Pattern
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mt-1.5 max-w-2xl mx-auto">
            A privacy-first, on-device cognitive companion designed to respect the dignity and individuality of each person.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5">
          {[
            {
              step: '01',
              title: 'OBSERVE',
              subtitle: 'Micro-Behavioral Signals',
              desc: 'Genuinely measures touch latency, tap cadence variance, and hesitation intervals. Zero audio or camera media leaves the device.',
              icon: Brain,
              tag: 'Real Behavioral Telemetry',
              accentBg: 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60',
              iconBg: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
            },
            {
              step: '02',
              title: 'LEARN',
              subtitle: 'Honest Personal Baseline',
              desc: 'Requires 3 completed sessions to calculate individual median ranges. Single-day fluctuations never trigger false alarms.',
              icon: TrendingUp,
              tag: 'MAD Robust Dispersion',
              accentBg: 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/60',
              iconBg: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300',
            },
            {
              step: '03',
              title: 'REMEMBER',
              subtitle: 'Local-First Storage',
              desc: 'Persists baseline medians securely in client-side storage (IndexedDB). Survives phone reloads, restarts, and airplane mode.',
              icon: Lock,
              tag: '100% Offline Persistence',
              accentBg: 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800/60',
              iconBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300',
            },
            {
              step: '04',
              title: 'ADAPT',
              subtitle: 'On-Device Machine Learning',
              desc: 'A 35-tree Random Forest executes locally in < 2ms with zero network calls, dynamically calibrating activity pacing and reassurance.',
              icon: Cpu,
              tag: 'Sub-2ms Local Inference',
              accentBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60',
              iconBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className={`card p-5 sm:p-6 flex flex-col justify-between ${item.accentBg} rounded-2xl border`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      STEP {item.step}
                    </span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-0.5">{item.title}</h3>
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{item.subtitle}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{item.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">{item.tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Four Cognitive Activities */}
      <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Four Evidence-Informed Activities
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mt-1.5">
            Gentle, dignified exercises measuring working memory, sequence recall, visual recognition, and motor cadence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[
            {
              title: 'Memory Match',
              domain: 'Working Memory',
              desc: 'Turn over cards to find matching household and cultural items at your own pace.',
              emoji: '🧩',
              badge: 'Visual Memory',
              iconBg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900',
            },
            {
              title: 'Daily Routine Recall',
              domain: 'Sequential Memory',
              desc: 'Reconstruct familiar daily sequences and morning rituals in natural chronological order.',
              emoji: '📋',
              badge: 'Procedural Logic',
              iconBg: 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900',
            },
            {
              title: 'Visual Recall',
              domain: 'Visual Memory',
              desc: 'Identify familiar items and verified family photos with safe camera or photo card fallback.',
              emoji: '🔍',
              badge: 'Familiarity Memory',
              iconBg: 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-900',
            },
            {
              title: 'Pattern Recall',
              domain: 'Spatial Attention',
              desc: 'Observe flash sequences and tap cadence to track sustained attention and motor tempo.',
              emoji: '✨',
              badge: 'Motor Cadence',
              iconBg: 'bg-pink-100 dark:bg-pink-950/60 border-pink-200 dark:border-pink-900',
            },
          ].map((act) => (
            <div key={act.title} className="card p-5 sm:p-6 flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs">
              <div>
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl mb-4 ${act.iconBg}`}>
                  {act.emoji}
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{act.title}</h3>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">{act.domain}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-2 leading-relaxed">{act.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {act.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Multilingual & Medical Guardrails */}
      <section className="py-10 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-6 flex items-start gap-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 shrink-0">
              <Globe size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Multilingual Indic Voice Support</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                Spoken guidance, synchronized subtitles, and audio explanations in <strong>Telugu (తెలుగు)</strong>, <strong>Hindi (हिंदी)</strong>, and <strong>English</strong> for elder comfort and independence.
              </p>
            </div>
          </div>

          <div className="card p-6 flex items-start gap-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Ethical & Non-Clinical Guardrails</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                MindMitra is an assistive behavioral wellness companion and does NOT diagnose clinical dementia or disease. All insights are non-clinical behavioral observations intended to support families.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Clean Accessible Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 py-6 px-4 sm:px-6 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <p>© {new Date().getFullYear()} MindMitra • Personal Behavioral Memory System</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">This is for demo purposes</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <Link to="/home" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
            <Link to="/activities" className="hover:text-blue-600 dark:hover:text-blue-400">Activities</Link>
            <Link to="/caregiver" className="hover:text-blue-600 dark:hover:text-blue-400">Caregiver</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
