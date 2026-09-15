import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { useApp } from '../context/AppContext';
import ThemeToggle from '../components/ThemeToggle';
import { 
  Brain, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  HeartHandshake, 
  Cpu, 
  TrendingUp, 
  Globe, 
  Compass,
  PhoneCall,
  Mic,
  Music,
  Sprout,
  BookOpen,
  MessageCircle,
  Radio,
  Lock,
} from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { caregiver } = useApp();

  const handleGetStarted = () => {
    if (caregiver) {
      navigate('/profiles');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* 1. Global Public Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-purple-100/80 dark:border-slate-800 px-6 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-sm group-hover:opacity-90 transition-opacity">
              <Brain size={22} />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                MindMitra
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Cognitive Wellbeing & Community Companion</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-700 dark:text-slate-200">
            <Link to="/personal-pattern" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
              <span>📱 Phone App</span>
            </Link>
            <Link to="/judge-demo" className="hover:text-amber-500 transition-colors flex items-center gap-1 text-amber-600 dark:text-amber-400 font-extrabold">
              <Sparkles size={15} />
              <span>Judge Demo</span>
            </Link>
            <Link to="/office-kit" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1">
              <span>💻 Office Kit</span>
            </Link>
            <Link to="/how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">How It Works</Link>
            <Link to="/methodology" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Architecture & AI</Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button
              onClick={handleGetStarted}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: "The phone learns your pattern." */}
      <section className="pt-12 pb-16 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs font-black uppercase tracking-wider mb-6 shadow-xs">
          <Sparkles size={14} className="text-blue-600 dark:text-blue-400" />
          <span>iQOO Hackathon 2026 • On-Device Adaptive Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] max-w-4xl">
          The phone learns <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">your personal pattern.</span>
        </h1>

        <p className="mt-5 text-base sm:text-xl text-slate-700 dark:text-slate-200 max-w-3xl leading-relaxed font-medium">
          MindMitra does not compare an older adult to a population leaderboard. Through genuine touch cadence, voice pauses, and interaction latency, the phone learns what normal interaction looks like for that person — and adapts in real time directly on device.
        </p>

        {/* The Killer Loop Visual Bar */}
        <div className="my-8 py-3 px-5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm max-w-3xl w-full flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-extrabold text-slate-800 dark:text-slate-200">
          <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">1. SENSE</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">2. ON-DEVICE ML</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">3. PERSONAL BASELINE</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">4. ADAPT</span>
          <span>→</span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">5. OFFICE KIT</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          <Link
            to="/personal-pattern"
            className="w-full sm:w-auto py-3.5 px-7 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 transition-all min-h-[48px]"
          >
            <span>📱 Launch Phone Companion</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            to="/judge-demo"
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all min-h-[48px]"
          >
            <Sparkles size={16} />
            <span>Judge Demo (Evaluation Hub)</span>
          </Link>

          <Link
            to="/office-kit"
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 font-extrabold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px]"
          >
            <span>💻 Office Kit (Laptop)</span>
          </Link>
        </div>

        {/* Caregiver Portal Link */}
        <div className="mt-8 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Are you a registered caregiver?</span>
          <button
            onClick={handleGetStarted}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            Caregiver Dashboard & Profiles →
          </button>
        </div>
      </section>

      {/* 3. NEW: Community Circles & Connect Mode Highlight */}
      <section className="py-14 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
            <Users size={13} />
            <span>Social Connection & Reminiscence</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Community Circles & Real-Time Trusted Calling
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mt-1.5 max-w-2xl mx-auto">
            Combating social isolation through structured neighborhood peer circles, group cognitive sessions, and instant 1-tap family voice connections.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Community Interest Circles */}
          <div className="card p-7 bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-white dark:from-slate-850 dark:via-slate-900 dark:to-slate-900 border-blue-200/80 dark:border-blue-900/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Users size={24} />
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-xs font-bold">
                  Peer Social Circles
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                Neighborhood Interest Circles & Group Sessions
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium mb-5">
                Caregivers can launch interactive group sessions tailored around cultural memory, shared storytelling, and collaborative recall topics:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                    <Music size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Morning Bhajans & Stotrams</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Devotional recall & mantras</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                    <Sprout size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Courtyard Gardening</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Plants & terrace routines</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Folktales & Heritage</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Oral history & reminiscence</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                    <Radio size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Classical Music & Ragas</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Auditory memory & rhythm</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold flex items-center gap-1.5">
                <Sparkles size={14} className="text-blue-500" /> Real-Time Group Participation
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">/community</span>
            </div>
          </div>

          {/* Card 2: Connect Mode & Trusted Voice Calling */}
          <div className="card p-7 bg-gradient-to-br from-purple-50/70 via-indigo-50/50 to-white dark:from-slate-850 dark:via-slate-900 dark:to-slate-900 border-purple-200/80 dark:border-purple-900/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                  <PhoneCall size={24} />
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live WebRTC Voice
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                Connect Mode & Encrypted Family Calling
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium mb-5">
                A streamlined, elderly-accessible voice calling directory connecting seniors with verified family members, neighbors, and caregivers with zero confusing setup:
              </p>

              <div className="space-y-3 mb-5">
                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 shrink-0 mt-0.5">
                    <PhoneCall size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">1-Tap Direct Voice Calling</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Peer-to-peer encrypted WebRTC audio with audible chime ringtones, clear connection timers, and large touch targets.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-pink-600 shrink-0 mt-0.5">
                    <Mic size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Private Voice Memory Stories</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Seniors and family members can record and preserve cherished oral history, voice memories, and life anecdotes directly in the app.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" /> Caregiver Verified & Isolated
              </span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">/connect</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Product Loop (Play -> Adapt -> Track -> Support) */}
      <section className="py-14 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">The MindMitra Cognitive Wellness Loop</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mt-1.5">Continuous non-invasive engagement that learns and supports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5">
          {[
            {
              id: 'play',
              step: '01',
              title: 'PLAY',
              subtitle: 'Elderly-Friendly Tasks',
              desc: '4 dignified daily cognitive activities that respect the senior pace without stress.',
              icon: Brain,
              tag: 'Dignified Design',
              accentBg: 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-800/60',
              iconBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300',
              stepTag: 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
              subTitleColor: 'text-purple-700 dark:text-purple-400',
            },
            {
              id: 'adapt',
              step: '02',
              title: 'ADAPT',
              subtitle: 'Machine Learning Difficulty',
              desc: 'Trained RandomForest model dynamically adjusts level (1–5) based on response speed & errors.',
              icon: Cpu,
              tag: 'ML RandomForest',
              accentBg: 'bg-pink-50/80 dark:bg-pink-950/40 border-pink-200/80 dark:border-pink-800/60',
              iconBg: 'bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300',
              stepTag: 'bg-pink-100 dark:bg-pink-950/80 text-pink-800 dark:text-pink-300 border-pink-300 dark:border-pink-800',
              subTitleColor: 'text-pink-700 dark:text-pink-400',
            },
            {
              id: 'track',
              step: '03',
              title: 'TRACK',
              subtitle: 'Personal Baseline Deviation',
              desc: 'Monitors longitudinal performance relative to 5–10 session historical median, not population stats.',
              icon: TrendingUp,
              tag: 'Baseline Engine',
              accentBg: 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-800/60',
              iconBg: 'bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300',
              stepTag: 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
              subTitleColor: 'text-cyan-700 dark:text-cyan-400',
            },
            {
              id: 'support',
              step: '04',
              title: 'SUPPORT',
              subtitle: 'Explainable AI for Caregivers',
              desc: 'Gemini 2.0 Flash synthesizes plain-language summaries with strict non-diagnostic guardrails.',
              icon: HeartHandshake,
              tag: 'Gemini 2.0 Flash',
              accentBg: 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-200/80 dark:border-violet-800/60',
              iconBg: 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300',
              stepTag: 'bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-800',
              subTitleColor: 'text-violet-700 dark:text-violet-400',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`card p-6 flex flex-col justify-between ${item.accentBg}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-md border ${item.stepTag}`}>
                      STEP {item.step}
                    </span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.iconBg}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                  <h4 className={`text-xs font-bold ${item.subTitleColor} mb-2`}>{item.subtitle}</h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">{item.desc}</p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 font-mono">{item.tag}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. 4 Cognitive Games Preview */}
      <section className="py-14 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Four Evidence-Informed Cognitive Activities</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mt-1.5">Targeting short-term memory, sequence recall, facial recognition, and pattern attention</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: 'Memory Match',
              domain: 'Working & Short-Term Memory',
              desc: 'Match cards with everyday & familiar symbols to stimulate recall.',
              emoji: '🧠',
              badge: 'Visual Memory',
              iconBg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900',
              accentColor: 'text-purple-700 dark:text-purple-400',
            },
            {
              title: 'Daily Routine Recall',
              domain: 'Sequential & Episodic Memory',
              desc: 'Reconstruct familiar daily activities and morning rituals in sequence.',
              emoji: '📋',
              badge: 'Logical Sequencing',
              iconBg: 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900',
              accentColor: 'text-indigo-700 dark:text-indigo-400',
            },
            {
              title: 'Object & Face Recognition',
              domain: 'Visual & Facial Recognition',
              desc: 'Identify everyday objects and caregiver-uploaded family member photos.',
              emoji: '🔍',
              badge: 'Caregiver Photos',
              iconBg: 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-900',
              accentColor: 'text-cyan-700 dark:text-cyan-400',
            },
            {
              title: 'Pattern Recall',
              domain: 'Pattern Recognition & Attention',
              desc: 'Observe symbol patterns and test sustained attention and recall speed.',
              emoji: '✨',
              badge: 'Focus & Attention',
              iconBg: 'bg-pink-100 dark:bg-pink-950/60 border-pink-200 dark:border-pink-900',
              accentColor: 'text-pink-700 dark:text-pink-400',
            },
          ].map((game) => (
            <div key={game.title} className="card p-6 flex flex-col justify-between">
              <div>
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl mb-4 ${game.iconBg}`}>
                  {game.emoji}
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{game.title}</h3>
                <p className={`text-xs font-bold ${game.accentColor} mt-0.5`}>{game.domain}</p>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium mt-2 leading-relaxed">{game.desc}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                  {game.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Multilingual & Medical Guardrails */}
      <section className="py-12 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 flex items-start gap-4 bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/50">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 shrink-0">
              <Globe size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Multilingual & Native Voice Support</h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-1 leading-relaxed font-medium">
                Full localized UI and Text-to-Speech voice guidance in <strong>English</strong>, <strong>Hindi (हिंदी)</strong>, and <strong>Telugu (తెలుగు)</strong> for elderly comfort and independence.
              </p>
            </div>
          </div>

          <div className="card p-6 flex items-start gap-4 bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Ethical & Medical Guardrails</h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-1 leading-relaxed font-medium">
                MindMitra is an assistive cognitive companion and does NOT diagnose clinical dementia or disease. All insights are behavioral observations intended to support families.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 py-8 px-6 text-center text-xs text-slate-600 dark:text-slate-300 font-medium backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} MindMitra — AI Companion for Cognitive Wellbeing.</p>
          <div className="flex items-center gap-4 font-bold">
            <Link to="/how-it-works" className="hover:text-purple-600 dark:hover:text-purple-400">How It Works</Link>
            <Link to="/methodology" className="hover:text-purple-600 dark:hover:text-purple-400">Methodology</Link>
            <Link to="/demo" className="hover:text-purple-600 dark:hover:text-purple-400">Demo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
