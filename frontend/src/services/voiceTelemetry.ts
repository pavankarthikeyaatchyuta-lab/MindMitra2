/**
 * MindMitra - Voice Behavioral Sensor Engine
 * Captures non-clinical acoustic & verbal sequence signals locally on device:
 * Response latency, speech duration, pause duration, number of pauses, sequence completeness.
 *
 * NOTE: Strictly behavioral observation signals. Zero raw audio uploaded. Zero clinical diagnostic claims.
 */

export interface VoiceBehavioralVector {
  response_latency_ms: number; // Time from prompt completion to first detected word
  speech_duration_ms: number;   // Total duration of speech
  pause_duration_ms: number;    // Cumulative pause/silence duration during response
  number_of_pauses: number;     // Number of inter-word hesitation pauses > 800ms
  sequence_completeness: number;// 0.0 - 1.0 (how many sequence target items were verbalized)
  task_completion: boolean;
  transcript_confidence: number;
  word_count: number;
  timestamp: string;
}

export interface VoiceRecallPrompt {
  id: string;
  question: string;
  category: string;
  expectedItemCount: number;
  sampleKeywords: string[];
}

export const DEFAULT_VOICE_PROMPTS: VoiceRecallPrompt[] = [
  {
    id: 'morning_routine',
    question: 'Tell me three things you did this morning (for example: tea, walked, read the paper).',
    category: 'Daily Temporal Sequence',
    expectedItemCount: 3,
    sampleKeywords: ['tea', 'coffee', 'walk', 'bath', 'breakfast', 'yoga', 'newspaper', 'paper', 'prayer', 'pooja', 'water', 'medicine', 'brushed'],
  },
  {
    id: 'favourite_foods',
    question: 'Name three foods or fruits you enjoy having for lunch.',
    category: 'Semantic Category Recall',
    expectedItemCount: 3,
    sampleKeywords: ['dal', 'rice', 'roti', 'chapati', 'apple', 'banana', 'mango', 'curd', 'sabzi', 'salad', 'idli', 'dosa'],
  },
  {
    id: 'recent_places',
    question: 'Name three places in your home or neighborhood you visited this week.',
    category: 'Spatial Orientation Recall',
    expectedItemCount: 3,
    sampleKeywords: ['garden', 'balcony', 'park', 'temple', 'market', 'kitchen', 'terrace', 'verandah', 'shop', 'hall', 'room'],
  },
];

export class VoiceSensorTracker {
  private promptEndTime: number = 0;
  private firstWordTime: number = 0;
  private lastWordTime: number = 0;
  private pauses: number[] = [];
  private wordsSpoken: string[] = [];
  private recognition: any = null;
  private isListening: boolean = false;
  private confidenceSum: number = 0;
  private recognitionCount: number = 0;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && (
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    );
  }

  public startListening(
    prompt: VoiceRecallPrompt,
    onStatusChange: (status: 'listening' | 'speaking' | 'completed' | 'error') => void,
    onTranscriptUpdate: (transcript: string) => void
  ): Promise<VoiceBehavioralVector> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Speech recognition not supported in this browser/device.'));
        return;
      }

      this.promptEndTime = performance.now();
      this.firstWordTime = 0;
      this.lastWordTime = 0;
      this.pauses = [];
      this.wordsSpoken = [];
      this.confidenceSum = 0;
      this.recognitionCount = 0;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';

      this.recognition = recog;
      this.isListening = true;
      onStatusChange('listening');

      let finalTranscript = '';
      let silenceTimer: any = null;

      const finishRecognition = () => {
        if (!this.isListening) return;
        this.isListening = false;
        try {
          recog.stop();
        } catch {}

        const now = performance.now();
        const responseLatencyMs = this.firstWordTime > 0
          ? Math.round(this.firstWordTime - this.promptEndTime)
          : 3500;

        const speechDurationMs = this.lastWordTime > 0 && this.firstWordTime > 0
          ? Math.round(this.lastWordTime - this.firstWordTime)
          : 4000;

        const cumulativePauseDurationMs = this.pauses.reduce((a, b) => a + b, 0);

        // Calculate sequence completeness based on detected target concepts
        const lowerTranscript = finalTranscript.toLowerCase();
        let matchedCount = 0;
        for (const kw of prompt.sampleKeywords) {
          if (lowerTranscript.includes(kw)) {
            matchedCount++;
          }
        }
        // Approximate count by comma/and separation if keyword list didn't capture dialect
        const clauseCount = finalTranscript.split(/,|and|then|\s{2,}/i).filter(s => s.trim().length > 2).length;
        const effectiveCount = Math.max(matchedCount, Math.min(clauseCount, prompt.expectedItemCount));
        const sequenceCompleteness = Math.min(1.0, effectiveCount / prompt.expectedItemCount);

        const avgConfidence = this.recognitionCount > 0
          ? Math.round((this.confidenceSum / this.recognitionCount) * 100) / 100
          : 0.85;

        onStatusChange('completed');

        const vector: VoiceBehavioralVector = {
          response_latency_ms: Math.max(200, responseLatencyMs),
          speech_duration_ms: Math.max(1000, speechDurationMs),
          pause_duration_ms: Math.round(cumulativePauseDurationMs),
          number_of_pauses: this.pauses.length,
          sequence_completeness: Math.round(sequenceCompleteness * 100) / 100,
          task_completion: sequenceCompleteness >= 0.66,
          transcript_confidence: avgConfidence,
          word_count: this.wordsSpoken.length,
          timestamp: new Date().toISOString(),
        };

        resolve(vector);
      };

      recog.onresult = (event: any) => {
        const now = performance.now();
        if (this.firstWordTime === 0) {
          this.firstWordTime = now;
          onStatusChange('speaking');
        }

        if (this.lastWordTime > 0) {
          const pauseInterval = now - this.lastWordTime;
          if (pauseInterval >= 800) {
            this.pauses.push(Math.round(pauseInterval));
          }
        }
        this.lastWordTime = now;

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript + ' ';
            this.confidenceSum += res[0].confidence || 0.88;
            this.recognitionCount++;
          } else {
            interim += res[0].transcript;
          }
        }

        const fullCurrentText = (finalTranscript + ' ' + interim).trim();
        this.wordsSpoken = fullCurrentText.split(/\s+/).filter(Boolean);
        onTranscriptUpdate(fullCurrentText);

        // Reset silence timeout on speech activity
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          finishRecognition();
        }, 3000); // 3 seconds of silence signifies completion
      };

      recog.onerror = (err: any) => {
        onStatusChange('error');
        if (this.isListening) {
          this.isListening = false;
          // Gracefully resolve with baseline approximation if audio occurred, or reject
          if (this.wordsSpoken.length > 0) {
            finishRecognition();
          } else {
            reject(err);
          }
        }
      };

      recog.onend = () => {
        if (this.isListening) {
          finishRecognition();
        }
      };

      try {
        recog.start();
      } catch (e) {
        reject(e);
      }
    });
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }
}
