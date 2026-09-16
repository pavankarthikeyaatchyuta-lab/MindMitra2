import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Laptop, 
  Smartphone, 
  Activity, 
  ArrowLeft, 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  HelpCircle, 
  Cpu, 
  ChevronRight,
  Clock,
  Send,
  RefreshCw
} from 'lucide-react';
import { OfficeKitBridge, OfficeKitPacket } from '../services/officeKitBridge';
import { api } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import CaregiverAccountMenu from '../components/CaregiverAccountMenu';

export default function OfficeKitView() {
  const navigate = useNavigate();
  const [latestPacket, setLatestPacket] = useState<OfficeKitPacket | null>(null);
  const [historyPackets, setHistoryPackets] = useState<OfficeKitPacket[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explanationTier, setExplanationTier] = useState<string>('Tier 1: Gemini 2.0 Flash');

  useEffect(() => {
    // 1. Initial load from local storage
    const current = OfficeKitBridge.getLatestPacket();
    if (current) {
      setLatestPacket(current);
    } else {
      // Provide initial mock packet if phone hasn't run yet
      const samplePacket: OfficeKitPacket = OfficeKitBridge.normalizePacket({
        schemaVersion: '1.0',
        id: 'sample_1',
        profileId: 2,
        profileName: 'Sunita Devi',
        timestamp: new Date().toISOString(),
        deviceSource: 'iQOO Phone (On-Device Inference)',
        baselineAccuracy: 0.84,
        sessionAccuracy: 0.63,
        baselineLatencyMs: 2100,
        sessionLatencyMs: 4900,
        baselineCorrections: 2,
        sessionCorrections: 8,
        status: 'MEANINGFUL_DEVIATION',
        primarySignals: ['slower responses', 'increased corrections', 'lower task accuracy'],
        adaptation: {
          recommendedDifficulty: 2,
          previousDifficulty: 4,
          action: 'Difficulty adjusted from Level 4 to Level 2',
          reason: 'Reducing complexity to restore comfort and positive engagement.',
        },
        onDeviceML: {
          model: 'MindMitra-RF-Mobile (35 Trees)',
          latencyMs: 1.4,
          confidence: 0.88,
          decision: 'DECREASE',
        },
        behavioralSignals: {
          firstInteractionLatencyMs: 3800,
          hesitationCount: 4,
          repeatErrorRate: 0.18,
          touchCount: 22,
        },
      })!;
      setLatestPacket(samplePacket);
    }

    setHistoryPackets(OfficeKitBridge.getHistory());

    // 2. Real-time subscription to phone broadcasts
    const unsubscribe = OfficeKitBridge.subscribe((packet) => {
      setLatestPacket(packet);
      setHistoryPackets(OfficeKitBridge.getHistory());
      setShowExplanation(false);
      setExplanationText(null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleExplain = async () => {
    if (!latestPacket) return;
    setExplaining(true);
    setShowExplanation(true);

    try {
      const domain = 'Personal Behavioral Baseline';
      const status = latestPacket.status === 'MEANINGFUL_DEVIATION' ? 'recent_change' : 'stable';
      const evidence = `Accuracy dropped from ${(latestPacket.baselineAccuracy * 100).toFixed(0)}% baseline to ${(latestPacket.sessionAccuracy * 100).toFixed(0)}%. Response time increased from ${(latestPacket.baselineLatencyMs / 1000).toFixed(1)}s to ${(latestPacket.sessionLatencyMs / 1000).toFixed(1)}s. Corrections increased from ${latestPacket.baselineCorrections} to ${latestPacket.sessionCorrections}. Evaluated on iQOO Phone using ${latestPacket.onDeviceML.model}.`;

      const res = await api.explainInsight(domain, status, evidence);
      if (res && res.explanation) {
        setExplanationText(res.explanation);
        setExplanationTier(res.provider ? `Tier: ${res.provider}` : 'Tier 1: Gemini 2.0 Flash');
      } else {
        throw new Error('Fallback required');
      }
    } catch {
      // Deterministic explainability fallback
      setExplanationText(
        "The recent deviation is primarily associated with slower responses, increased corrections and reduced accuracy across eligible sessions. MindMitra adjusted today's activity difficulty to maintain comfort and positive engagement."
      );
      setExplanationTier('Tier 3: Non-Clinical Structured Heuristic');
    } finally {
      setExplaining(false);
    }
  };

  const isDeviation = latestPacket?.status === 'MEANINGFUL_DEVIATION';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-150">
      {/* Top Navbar */}
      <nav className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-y-2 sticky top-0 z-30">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/caregiver"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
            title="Caregiver Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Laptop size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">MINDMITRA OFFICE KIT</h1>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-500/50 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                  Caregiver Intelligence Layer
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Real-Time Phone Telemetry Aggregator & Longitudinal Explainer</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/personal-pattern"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm"
          >
            <Smartphone size={14} />
            <span>Open Phone App</span>
          </Link>
          <ThemeToggle />
          <CaregiverAccountMenu />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Connection Status Ribbon */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">Office Kit Bridge: Active</span>
            <span className="text-slate-500 dark:text-slate-400">• Receiving synced summaries from iQOO Phone</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Model: {latestPacket?.onDeviceML.model || 'MindMitra-RF-Mobile'}</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              ⚡ {latestPacket?.onDeviceML.latencyMs}ms latency
            </span>
          </div>
        </div>

        {/* Main Intelligence Card */}
        {latestPacket ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl">
            {/* Header: Person & Baseline Status */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                  Elderly Profile Behavioral Record
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {latestPacket.profileName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Personal Behavioral Baseline • Synced {new Date(latestPacket.timestamp).toLocaleTimeString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-2xl border text-xs sm:text-sm font-black flex items-center gap-2 ${
                  isDeviation
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/60 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-300'
                }`}>
                  {isDeviation ? <TrendingDown size={18} /> : <CheckCircle2 size={18} />}
                  <span>{isDeviation ? 'Meaningful Deviation' : 'Normal Interaction'}</span>
                </div>
              </div>
            </div>

            {/* The 3 Core Metric Comparisons (Baseline vs Today's Session) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              {/* Metric 1: Accuracy */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">Accuracy</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-slate-500 dark:text-slate-400">
                    {Math.round(latestPacket.baselineAccuracy * 100)}%
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-bold">→</span>
                  <span className={`text-2xl font-black ${
                    latestPacket.sessionAccuracy < latestPacket.baselineAccuracy - 0.1
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {Math.round(latestPacket.sessionAccuracy * 100)}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                  Personal baseline vs current session
                </span>
              </div>

              {/* Metric 2: Response Time */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">Response Time</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-slate-500 dark:text-slate-400">
                    {(latestPacket.baselineLatencyMs / 1000).toFixed(1)}s
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-bold">→</span>
                  <span className={`text-2xl font-black ${
                    latestPacket.sessionLatencyMs > latestPacket.baselineLatencyMs * 1.3
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {(latestPacket.sessionLatencyMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                  Inter-tap & selection latency
                </span>
              </div>

              {/* Metric 3: Corrections */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">Corrections & Retries</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-slate-500 dark:text-slate-400">
                    {latestPacket.baselineCorrections}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-bold">→</span>
                  <span className={`text-2xl font-black ${
                    latestPacket.sessionCorrections > latestPacket.baselineCorrections + 2
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-purple-600 dark:purple-400'
                  }`}>
                    {latestPacket.sessionCorrections}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1 block">
                  Hesitation & self-correction count
                </span>
              </div>
            </div>

            {/* Primary Signals & Real-Time Adaptation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
                <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block mb-2">
                  Primary Behavioral Signals:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200 font-bold">
                  {latestPacket.primarySignals.map((sig, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-amber-500">•</span>
                      <span className="capitalize">{sig}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
                <span className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider block mb-2">
                  Phone Adaptive Decision:
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                  {latestPacket.adaptation.action}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Reason: {latestPacket.adaptation.reason}
                </p>
              </div>
            </div>

            {/* [ Why This Changed ] Action & Explanation Drawer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <ShieldCheck size={16} className="text-emerald-500 dark:text-emerald-400" />
                  <span>3-Tier Explainable AI Gateway (Gemini 2.0 Flash / Nemotron / Rule Fallback)</span>
                </div>

                <button
                  onClick={handleExplain}
                  disabled={explaining}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
                >
                  <Sparkles size={16} className="text-amber-300" />
                  <span>{explaining ? 'Synthesizing Explanation...' : '[ Why this changed ]'}</span>
                </button>
              </div>

              {/* Rendered Explanation */}
              {showExplanation && (
                <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/40 animate-in fade-in text-left shadow-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">
                      Caregiver Explanation ({explanationTier})
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Empathetic Non-Diagnostic Summary</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    "{explanationText}"
                  </p>

                  <div className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-900/60 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300/90 font-bold">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>Behavioral observation — not a medical diagnosis.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-blue-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">Listening for Phone Telemetry...</h3>
            <p className="text-xs text-slate-500 mt-1">Complete an activity on the phone to populate this dashboard.</p>
          </div>
        )}

        {/* Previous Telemetry Packets Table */}
        {historyPackets.length > 0 && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Recent Synchronized Packets from Phone
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800 font-extrabold">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Profile</th>
                    <th className="py-2.5 px-3">Accuracy</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Corrections</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">On-Device ML</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {historyPackets.map((pkt) => (
                    <tr key={pkt.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{new Date(pkt.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">{pkt.profileName}</td>
                      <td className="py-2.5 px-3">{Math.round(pkt.sessionAccuracy * 100)}%</td>
                      <td className="py-2.5 px-3">{(pkt.sessionLatencyMs / 1000).toFixed(1)}s</td>
                      <td className="py-2.5 px-3">{pkt.sessionCorrections}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pkt.status === 'MEANINGFUL_DEVIATION'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {pkt.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{pkt.onDeviceML.latencyMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Medical Disclaimer Banner */}
        <div className="text-center py-4 text-xs font-bold text-slate-500 dark:text-slate-400">
          ⚠️ MindMitra provides behavioral and cognitive-wellness support. It is not a medical diagnostic system.
        </div>
      </div>
    </div>
  );
}
