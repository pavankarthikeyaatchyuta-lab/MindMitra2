import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Brain, 
  ListOrdered, 
  Search, 
  Volume2, 
  Sparkles, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useTranslation } from '../i18n';
import { VoiceService } from '../services/voiceService';

interface ActivityCardData {
  id: string;
  gameType: string;
  title: string;
  domain: string;
  description: string;
  icon: string;
  telemetryNote: string;
}

export default function ActivitiesList() {
  const navigate = useNavigate();
  const { language } = useTranslation();

  const activities: ActivityCardData[] = [
    {
      id: 'memory',
      gameType: 'memory_match',
      title: 'Memory Match',
      domain: 'Short-Term Memory',
      description: 'Turn over cards to find matching household and cultural items at your own comfortable pace.',
      icon: '🧩',
      telemetryNote: 'Measures card inspection cadence, touch hold duration, and correction hesitation.',
    },
    {
      id: 'routine',
      gameType: 'daily_routine',
      title: 'Daily Routine Recall',
      domain: 'Sequential Memory',
      description: 'Arrange daily activities (waking, tea, watering plants, lunch) in their natural chronological sequence.',
      icon: '📋',
      telemetryNote: 'Measures sequence selection latency, reordering swaps, and trial-and-error corrections.',
    },
    {
      id: 'recognition',
      gameType: 'object_recognition',
      title: 'Visual Recall',
      domain: 'Visual Memory',
      description: 'Identify familiar everyday objects and family members uploaded with care.',
      icon: '🔍',
      telemetryNote: 'Measures recognition latency, visual scanning pauses, and assisted prompts.',
    },
    {
      id: 'pattern',
      gameType: 'pattern_recall',
      title: 'Pattern Recall',
      domain: 'Spatial Attention',
      description: 'Observe flash sequences and tap in pattern tempo to track sustained attention and motor cadence.',
      icon: '✨',
      telemetryNote: 'Measures pattern response tempo, tap cadence variance, and error recovery rate.',
    },
  ];

  const handleSpeakInstruction = (title: string, desc: string) => {
    VoiceService.speak(`${title}. ${desc}`, language, true);
  };

  return (
    <AppLayout mode="user">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-5 animate-in fade-in">
        {/* Header */}
        <div className="text-left">
          <span className="text-xs uppercase font-black tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
            Cognitive Activities
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Daily Interaction Activities
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Each activity is a controlled observation environment measuring your personal interaction rhythm.
          </p>
        </div>

        {/* Activity Cards List */}
        <div className="flex flex-col gap-4">
          {activities.map((act) => (
            <div
              key={act.id}
              className="card p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col gap-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-2xl shrink-0">
                    {act.icon}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                      {act.domain}
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {act.title}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => handleSpeakInstruction(act.title, act.description)}
                  className="touch-target-48 p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                  title="Listen to activity description"
                >
                  <Volume2 size={18} />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {act.description}
              </p>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>{act.telemetryNote}</span>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Approx. 2–3 minutes
                </span>
                <Link
                  to={`/activity/${act.id}`}
                  className="elderly-btn-primary py-3 px-6 text-sm font-black flex items-center gap-2"
                >
                  <Play size={16} className="fill-white" />
                  <span>Start Activity</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Behavioral Privacy Guarantee Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2.5">
          <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
          <span className="font-medium">
            100% on-device observation. Interaction latency and cadence are processed locally on your phone without cloud diagnostics.
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
