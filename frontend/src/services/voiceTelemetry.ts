/**
 * MindMitra - Voice Behavioral Sensor Engine
 * Captures non-clinical acoustic & verbal sequence signals locally on device:
 * Response latency, speech duration, pause duration, number of pauses, sequence completeness.
 *
 * NOTE: Strictly behavioral observation signals. Zero raw audio uploaded. Zero clinical diagnostic claims.
 */

import { Language } from '../types';

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
  question: Record<Language, string>;
  category: Record<Language, string>;
  expectedItemCount: number;
  sampleKeywords: Record<Language, string[]>;
}

export function getPromptQuestion(prompt: VoiceRecallPrompt, lang: Language = 'en'): string {
  if (typeof prompt.question === 'string') return prompt.question;
  return prompt.question[lang] || prompt.question.en || '';
}

export function getPromptCategory(prompt: VoiceRecallPrompt, lang: Language = 'en'): string {
  if (typeof prompt.category === 'string') return prompt.category;
  return prompt.category[lang] || prompt.category.en || '';
}

export function getPromptKeywords(prompt: VoiceRecallPrompt, lang: Language = 'en'): string[] {
  if (Array.isArray(prompt.sampleKeywords)) return prompt.sampleKeywords;
  return prompt.sampleKeywords[lang] || prompt.sampleKeywords.en || [];
}

export const DEFAULT_VOICE_PROMPTS: VoiceRecallPrompt[] = [
  {
    id: 'morning_routine',
    category: {
      en: 'Daily Temporal Sequence',
      te: 'రోజువారీ దినచర్య క్రమం',
      hi: 'दैनिक दिनचर्या क्रम',
    },
    question: {
      en: 'Tell me three things you did this morning (for example: tea, walked, read the paper).',
      te: 'ఈ ఉదయం మీరు చేసిన మూడు పనులను చెప్పండి (ఉదాహరణకు: టీ తాగడం, నడవడం, వార్తాపత్రిక చదవడం).',
      hi: 'आज सुबह आपने जो तीन काम किए, उनके नाम बताएं (जैसे: चाय, टहलना, अखबार पढ़ना)।',
    },
    expectedItemCount: 3,
    sampleKeywords: {
      en: ['tea', 'coffee', 'walk', 'bath', 'breakfast', 'yoga', 'newspaper', 'paper', 'prayer', 'pooja', 'water', 'medicine', 'brushed'],
      te: ['టీ', 'కాఫీ', 'నడక', 'స్నానం', 'అల్పాహారం', 'టిఫిన్', 'యోగా', 'పేపర్', 'వార్తాపత్రిక', 'పూజ', 'నీరు', 'మందులు', 'బ్రష్'],
      hi: ['चाय', 'कॉफी', 'सैर', 'टहलना', 'स्नान', 'नाश्ता', 'योग', 'अखबार', 'पूजा', 'पानी', 'दवा', 'ब्रश'],
    },
  },
  {
    id: 'favourite_foods',
    category: {
      en: 'Semantic Category Recall',
      te: 'ఆహార పదార్థాల జ్ఞాపకశక్తి',
      hi: 'खाद्य पदार्थ स्मरण',
    },
    question: {
      en: 'Name three foods or fruits you enjoy having for lunch.',
      te: 'భోజనంలో మీకు ఇష్టమైన మూడు ఆహారాలు లేదా పండ్ల పేర్లు చెప్పండి (ఉదాహరణకు: అన్నం, పప్పు, పండ్లు).',
      hi: 'दोपहर के खाने में आपको पसंद आने वाले तीन खाद्य पदार्थों या फलों के नाम बताएं।',
    },
    expectedItemCount: 3,
    sampleKeywords: {
      en: ['dal', 'rice', 'roti', 'chapati', 'apple', 'banana', 'mango', 'curd', 'sabzi', 'salad', 'idli', 'dosa'],
      te: ['అన్నం', 'పప్పు', 'రోటీ', 'చపాతీ', 'యాపిల్', 'అరటిపండు', 'మామిడి', 'పెరుగు', 'కూర', 'సాంబార్', 'ఇడ్లీ', 'దోశ'],
      hi: ['दाल', 'चावल', 'रोटी', 'चपाती', 'सेब', 'केला', 'आम', 'दही', 'सब्जी', 'सलाद', 'इडली', 'डोसा'],
    },
  },
  {
    id: 'recent_places',
    category: {
      en: 'Spatial Orientation Recall',
      te: 'పరిసర ప్రదేశాల జ్ఞాపకం',
      hi: 'स्थान एवं दिशा स्मरण',
    },
    question: {
      en: 'Name three places in your home or neighborhood you visited this week.',
      te: 'ఈ వారం మీరు సందర్శించిన మీ ఇల్లు లేదా పరిసరాల్లోని మూడు ప్రదేశాల పేర్లు చెప్పండి (ఉదాహరణకు: తోట, బాల్కనీ, గుడి).',
      hi: 'इस सप्ताह आपने अपने घर या पड़ोस में जिन तीन स्थानों का दौरा किया, उनके नाम बताएं।',
    },
    expectedItemCount: 3,
    sampleKeywords: {
      en: ['garden', 'balcony', 'park', 'temple', 'market', 'kitchen', 'terrace', 'verandah', 'shop', 'hall', 'room'],
      te: ['తోట', 'బాల్కనీ', 'పార్కు', 'గుడి', 'మార్కెట్', 'వంటగది', 'మేడ', 'వరండా', 'దుకాణం', 'హాలు', 'గది'],
      hi: ['बगीचा', 'बालकनी', 'पार्क', 'मंदिर', 'बाजार', 'रसोई', 'छत', 'बरामदा', 'दुकान', 'हॉल', 'कमरा'],
    },
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
    language: Language = 'en',
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
      // Configure speech recognition locale accurately for Telugu, Hindi, or English
      recog.lang = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';

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
        const keywords = getPromptKeywords(prompt, language);
        for (const kw of keywords) {
          if (lowerTranscript.includes(kw.toLowerCase())) {
            matchedCount++;
          }
        }
        // Approximate count by clause separation if keyword list didn't capture dialect
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
