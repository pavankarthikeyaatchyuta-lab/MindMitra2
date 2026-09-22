import { Language } from '../types';

export type ActivityContext =
  | 'welcome'
  | 'start'
  | 'instruction'
  | 'study'
  | 'recall_start'
  | 'success'
  | 'incorrect'
  | 'help'
  | 'idle'
  | 'completion';

export type ActivityId =
  | 'memory_match'
  | 'daily_routine'
  | 'object_recognition'
  | 'pattern_recall'
  | 'visual_recall'
  | 'voice_recall';

export interface ActivityInstructionSet {
  name: Record<Language, string>;
  welcome: Record<Language, string>;
  start: Record<Language, string>;
  instruction: Record<Language, string>;
  study?: Record<Language, string>;
  recall_start?: Record<Language, string>;
  success: Record<Language, string>;
  incorrect: Record<Language, string>;
  help: Record<Language, string>;
  idle: Record<Language, string>;
  completion: Record<Language, string>;
}

export const ACTIVITY_INSTRUCTIONS: Record<ActivityId, ActivityInstructionSet> = {
  memory_match: {
    name: {
      en: 'Memory Match',
      te: 'మెమరీ మ్యాచ్',
      hi: 'मेमोरी मैच',
    },
    welcome: {
      en: "Let's play Memory Match. Tap two cards to find the matching pair.",
      te: 'మనం మెమరీ మ్యాచ్ ఆడుదాం. ఒకే జతను కనుగొనడానికి రెండు కార్డులను ట్యాప్ చేయండి.',
      hi: 'आइए मेमोरी मैच खेलते हैं। एक जैसी जोड़ी खोजने के लिए दो कार्ड टैप करें।',
    },
    start: {
      en: "Let's begin. Find the matching pairs.",
      te: 'ప్రారంభిద్దాం. సరిపోలే జతలను కనుగొనండి.',
      hi: 'आइए शुरू करते हैं। मेल खाने वाले जोड़े खोजें।',
    },
    study: {
      en: 'Take a moment to remember where the matching cards are.',
      te: 'సరిపోలే కార్డులు ఎక్కడ ఉన్నాయో గుర్తుంచుకోవడానికి కాసేపు గమనించండి.',
      hi: 'एक पल के लिए ध्यान से देखें कि मेल खाने वाले कार्ड कहाँ हैं।',
    },
    recall_start: {
      en: "Ready? Let's find the matching pairs.",
      te: 'సిద్ధంగా ఉన్నారా? సరిపోలే జతలను కనుగొందాం.',
      hi: 'तैयार हैं? आइए मेल खाने वाले जोड़ों को खोजें।',
    },
    instruction: {
      en: 'Tap two cards to reveal what is hidden beneath.',
      te: 'కార్డుల వెనుక ఏముందో చూడటానికి రెండు కార్డులను నొక్కండి.',
      hi: 'पीछे क्या छिपा है यह देखने के लिए दो कार्ड छुएं।',
    },
    success: {
      en: 'Good job! You found a matching pair.',
      te: 'చాలా బాగుంది! సరైన జతను కనుగొన్నారు.',
      hi: 'शाबाश! आपने सही जोड़ी खोजी।',
    },
    incorrect: {
      en: "That's not a match. Try another pair.",
      te: 'ఇది సరిపోలలేదు. మరొక జతను ప్రయత్నించండి.',
      hi: 'यह मेल नहीं खाया। दूसरी जोड़ी आज़माएं।',
    },
    help: {
      en: "Take your time. Look at the cards you haven't turned over yet to find a matching pair.",
      te: 'ప్రశాంతంగా ఆలోచించండి. సరిపోలే జతను కనుగొనడానికి మీరు ఇంకా తెరవని కార్డులను గమనించండి.',
      hi: 'आराम से सोचें। मेल खाने वाली जोड़ी खोजने के लिए उन कार्डों पर ध्यान दें जिन्हें आपने अभी तक नहीं खोला है।',
    },
    idle: {
      en: 'You can tap any card to begin whenever you are ready.',
      te: 'ప్రారంభించడానికి ఏదైనా కార్డును నెమ్మదిగా నొక్కండి.',
      hi: 'शुरू करने के लिए किसी भी कार्ड को आराम से छुएं।',
    },
    completion: {
      en: 'Well done! You found all the matching pairs.',
      te: 'అద్భుతం! మీరు అన్ని జతలను విజయవంతంగా కనుగొన్నారు.',
      hi: 'बहुत बढ़िया! आपने सभी जोड़े सफलतापूर्वक खोज लिए।',
    },
  },

  daily_routine: {
    name: {
      en: 'Daily Routine',
      te: 'రోజువారీ దినచర్య',
      hi: 'दैनिक दिनचर्या',
    },
    welcome: {
      en: 'Arrange the daily activities in order from morning to evening.',
      te: 'ఉదయం నుండి సాయంత్రం వరకు రోజువారీ పనులను సరైన క్రమంలో అమర్చండి.',
      hi: 'सुबह से शाम तक की दिनचर्या को सही क्रम में व्यवस्थित करें।',
    },
    start: {
      en: 'Observe the activities and arrange them in order.',
      te: 'పనులను గమనించి, సరైన వరుస క్రమంలో అమర్చండి.',
      hi: 'गतिविधियों को देखें और उन्हें सही क्रम में लगाएं।',
    },
    instruction: {
      en: 'Tap the activity that happens first, then the next.',
      te: 'ముందుగా జరిగే పనిని ఎంచుకుని, ఆపై తదుపరి పనిని ఎంచుకోండి.',
      hi: 'जो काम पहले होता है उसे पहले चुनें, फिर अगला काम चुनें।',
    },
    success: {
      en: 'Correct step! That comes next in the routine.',
      te: 'సరైన క్రమం! దినచర్యలో ఇది సరైన స్థానం.',
      hi: 'बिल्कुल सही! दिनचर्या में यह सही स्थान पर है।',
    },
    incorrect: {
      en: 'Think about what you do first in the day. Try again.',
      te: 'రోజులో ఏ పని ముందుగా చేస్తారో ఆలోచించి మళ్ళీ ప్రయత్నించండి.',
      hi: 'सोचें कि दिन में पहले क्या किया जाता है। पुनः प्रयास करें।',
    },
    help: {
      en: 'Start with what you do right after waking up in the morning.',
      te: 'ఉదయం నిద్రలేచిన వెంటనే చేసే పనితో ప్రారంభించండి.',
      hi: 'सुबह सोकर उठने के बाद सबसे पहले किए जाने वाले काम से शुरू करें।',
    },
    idle: {
      en: 'Tap the task you do earliest in the day.',
      te: 'రోజులో ఉదయాన్నే చేసే పనిని ఎంచుకోండి.',
      hi: 'दिन में सबसे पहले किए जाने वाले कार्य पर टैप करें।',
    },
    completion: {
      en: 'Well done! You arranged the full routine in correct order.',
      te: 'అద్భుతంగా చేశారు! దినచర్య పనులను సరైన క్రమంలో అమర్చారు.',
      hi: 'बहुत बढ़िया! आपने पूरी दिनचर्या को सही क्रम में सजाया।',
    },
  },

  object_recognition: {
    name: {
      en: 'Visual Recall',
      te: 'విజువల్ రీకాల్',
      hi: 'विजुअल रिकॉल',
    },
    welcome: {
      en: 'Look closely at the picture and tap the matching name below.',
      te: 'చిత్రాన్ని జాగ్రత్తగా గమనించి, క్రింద ఉన్న సరైన పేరును ఎంచుకోండి.',
      hi: 'चित्र को ध्यान से देखें और नीचे दिए गए सही नाम को चुनें।',
    },
    start: {
      en: "Look at the image and choose who or what you see.",
      te: 'చిత్రాన్ని చూసి, ఎవరు లేదా ఏమిటో ఎంచుకోండి.',
      hi: 'चित्र को पहचानें और सही विकल्प चुनें।',
    },
    instruction: {
      en: 'Tap the option that best matches the image.',
      te: 'చిత్రానికి సరిపోయే సమాధానాన్ని నొక్కండి.',
      hi: 'चित्र से मेल खाने वाले विकल्प को टैप करें।',
    },
    success: {
      en: 'Excellent! That is the correct identification.',
      te: 'అద్భుతం! మీరు సరిగ్గా గుర్తించారు.',
      hi: 'अति उत्तम! आपने बिल्कुल सही पहचाना।',
    },
    incorrect: {
      en: 'Look at the details in the image and try once more.',
      te: 'చిత్రం వివరాలను గమనించి, మరొకసారి ప్రయత్నించండి.',
      hi: 'चित्र को फिर से ध्यान से देखें और पुनः प्रयास करें।',
    },
    help: {
      en: 'Take all the time you need. Read each name carefully.',
      te: 'ప్రశాంతంగా పేర్లను చదివి సరైన దానిని ఎంచుకోండి.',
      hi: 'समय लें। प्रत्येक नाम को ध्यान से पढ़कर सही चुनें।',
    },
    idle: {
      en: 'Choose the label that matches the picture above.',
      te: 'పై చిత్రానికి సరిపోయే పేరును ఎంచుకోండి.',
      hi: 'ऊपर दिए गए चित्र से मेल खाने वाले नाम को चुनें।',
    },
    completion: {
      en: 'Great job! You recognized all the familiar items.',
      te: 'చాలా బాగుంది! మీరు అన్నింటినీ చక్కగా గుర్తించారు.',
      hi: 'बहुत बढ़िया! आपने सभी चित्रों को सफलतापूर्वक पहचाना।',
    },
  },

  pattern_recall: {
    name: {
      en: 'Pattern Recall',
      te: 'ప్యాటర్న్ రికాల్',
      hi: 'पैटर्न पहचान',
    },
    welcome: {
      en: 'Observe the highlighted stars, then tap them in the same sequence.',
      te: 'వెలిగిన నక్షత్రాలను గమనించి, అదే వరుసలో నొక్కండి.',
      hi: 'चमकते तारों के क्रम को याद रखें, फिर उसी क्रम में छुएं।',
    },
    start: {
      en: 'Watch the pattern carefully.',
      te: 'ప్యాటర్న్‌ను శ్రద్ధగా గమనించండి.',
      hi: 'पैटर्न को ध्यानपूर्वक देखें।',
    },
    instruction: {
      en: 'Repeat the pattern by tapping the stars in order.',
      te: 'చూసిన వరుస క్రమంలోనే నక్షత్రాలను నొక్కండి.',
      hi: 'तारों को उसी क्रम में छूकर दोहराएं।',
    },
    success: {
      en: 'Perfect! You repeated the pattern correctly.',
      te: 'చక్కగా చేశారు! ప్యాటర్న్‌ను సరిగ్గా గుర్తుంచుకున్నారు.',
      hi: 'शानदार! आपने पैटर्न को बिल्कुल सही दोहराया।',
    },
    incorrect: {
      en: 'That was close. Take a breath and try the next pattern.',
      te: 'పర్వాలేదు, తదుపరి ప్యాటర్న్‌ను గమనించండి.',
      hi: 'कोई बात नहीं, अगले पैटर्न पर ध्यान दें।',
    },
    help: {
      en: 'Watch the sequence from the beginning before tapping.',
      te: 'నొక్కడానికి ముందు నక్షత్రాల వరుసను నిదానంగా చూడండి.',
      hi: 'टैप करने से पहले क्रम को एक बार पुनः याद कर लें।',
    },
    idle: {
      en: 'Tap the star that lit up first.',
      te: 'ముందుగా వెలిగిన నక్షత్రాన్ని నొక్కండి.',
      hi: 'सबसे पहले चमकने वाले तारे पर टैप करें।',
    },
    completion: {
      en: 'Well done! You recalled the patterns with steady focus.',
      te: 'అద్భుతం! మీరు స్థిరమైన దృష్టితో ప్యాటర్న్‌లను పూర్తి చేశారు.',
      hi: 'बहुत बढ़िया! आपने एकाग्रता से यह अभ्यास पूरा किया।',
    },
  },

  visual_recall: {
    name: {
      en: 'Visual Recall',
      te: 'విజువల్ రీకాల్',
      hi: 'विजुअल रिकॉल',
    },
    welcome: {
      en: 'Look at the visual prompt on screen, observe the details, then confirm when ready.',
      te: 'స్క్రీన్‌పై ఉన్న చిత్రాన్ని గమనించి, వివరాలను గుర్తుంచుకుని సిద్ధంగా ఉన్నప్పుడు చెప్పండి.',
      hi: 'स्क्रीन पर चित्र को ध्यान से देखें और विवरण याद होने पर पुष्टि करें।',
    },
    start: {
      en: 'Observe the scene naturally at your own pace.',
      te: 'మీ స్వంత వేగంతో నిదానంగా దృశ్యాన్ని గమనించండి.',
      hi: 'अपनी गति से आराम से चित्र का अवलोकन करें।',
    },
    instruction: {
      en: 'Notice the shapes, colors, and objects in the picture.',
      te: 'రంగులు, ఆకారాలు మరియు వస్తువులను పరిశీలించండి.',
      hi: 'आकारों, रंगों और वस्तुओं को ध्यान से देखें।',
    },
    success: {
      en: 'Observation confirmed. Thank you for your careful focus.',
      te: 'పరిశీలన నమోదైంది. మీ శ్రద్ధకు ధన్యవాదాలు.',
      hi: 'अवलोकन पूरा हुआ। आपके ध्यान के लिए धन्यवाद।',
    },
    incorrect: {
      en: 'Take another moment to view the scene.',
      te: 'చిత్రాన్ని మరొకసారి ప్రశాంతంగా చూడండి.',
      hi: 'चित्र को एक बार फिर आराम से देखें।',
    },
    help: {
      en: 'There is no rush. Your phone observes natural observation pacing.',
      te: 'ఎలాంటి ఆందోళన అవసరం లేదు. మీ నిదానమైన వేగాన్ని ఫోన్ గమనిస్తుంది.',
      hi: 'कोई जल्दबाजी नहीं है। फोन आपकी स्वाभाविक गति को समझ रहा है।',
    },
    idle: {
      en: 'Tap the confirm button when you have finished observing.',
      te: 'పరిశీలన పూర్తయినప్పుడు నిర్ధారణ బటన్‌ను నొక్కండి.',
      hi: 'अवलोकन पूरा होने पर पुष्टि बटन दबाएं।',
    },
    completion: {
      en: 'Visual observation complete. Your natural pacing has been recorded.',
      te: 'దృశ్య పరిశీలన పూర్తయింది. మీ సహజ వేగం నమోదైంది.',
      hi: 'दृश्य अवलोकन पूरा हुआ। आपकी स्वाभाविक गति रिकॉर्ड हो गई।',
    },
  },

  voice_recall: {
    name: {
      en: 'Voice Recall',
      te: 'వాయిస్ రీకాల్',
      hi: 'आवाज़ स्मरण',
    },
    welcome: {
      en: 'Listen to the prompt and respond clearly in your natural voice.',
      te: 'ప్రశ్నను విని మీ సహజ స్వరంతో స్పష్టంగా సమాధానం చెప్పండి.',
      hi: 'प्रश्न सुनें और अपनी स्वाभाविक आवाज़ में स्पष्ट उत्तर दें।',
    },
    start: {
      en: 'Tap the microphone and speak whenever you are ready.',
      te: 'మైక్రోఫోన్ నొక్కి మీరు సిద్ధంగా ఉన్నప్పుడు మాట్లాడండి.',
      hi: 'माइक्रोफ़ोन टैप करें और जब आप तैयार हों तब बोलें।',
    },
    instruction: {
      en: 'Speak naturally. We measure your comfortable response rhythm.',
      te: 'సహజంగా మాట్లాడండి. మీ ప్రతిస్పందన వేగాన్ని మేము గమనిస్తాము.',
      hi: 'स्वाभाविक रूप से बोलें। हम आपकी सहज प्रतिक्रिया गति को मापते हैं।',
    },
    success: {
      en: 'Wonderful! Your spoken response has been recorded.',
      te: 'చాలా బాగుంది! మీ సమాధానం నమోదయింది.',
      hi: 'बहुत अच्छा! आपकी प्रतिक्रिया दर्ज कर ली गई है।',
    },
    incorrect: {
      en: 'Could not hear clearly. Feel free to speak again.',
      te: 'స్పష్టంగా వినబడలేదు. మళ్ళీ మాట్లాడవచ్చు.',
      hi: 'स्पष्ट सुनाई नहीं दिया। कृपया पुनः बोलें।',
    },
    help: {
      en: 'Tap the microphone icon to start speaking.',
      te: 'మాట్లాడటం ప్రారంభించడానికి మైక్రోఫోన్ గుర్తును నొక్కండి.',
      hi: 'बोलना शुरू करने के लिए माइक आइकॉन टैप करें।',
    },
    idle: {
      en: 'Whenever you are ready, tap the microphone to respond.',
      te: 'మీరు సిద్ధంగా ఉన్నప్పుడు సమాధానం ఇవ్వడానికి మైక్రోఫోన్ నొక్కండి.',
      hi: 'जब भी आप तैयार हों, उत्तर देने के लिए माइक टैप करें।',
    },
    completion: {
      en: 'Great job completing your voice recall session.',
      te: 'వాయిస్ రీకాల్ సెషన్‌ను విజయవంతంగా పూర్తి చేసినందుకు అభినందనలు.',
      hi: 'आवाज़ सत्र सफलतापूर्वक पूरा करने के लिए बधाई।',
    },
  },
};

export class InstructionService {
  /**
   * Normalizes any activity string alias into a canonical ActivityId.
   */
  public static normalizeId(id: string): ActivityId {
    if (id === 'memory' || id === 'memory_match') return 'memory_match';
    if (id === 'routine' || id === 'daily_routine') return 'daily_routine';
    if (id === 'recognition' || id === 'object_recognition') return 'object_recognition';
    if (id === 'pattern' || id === 'pattern_recall') return 'pattern_recall';
    if (id === 'voice' || id === 'voice_recall') return 'voice_recall';
    if (id === 'visual' || id === 'visual_recall') return 'visual_recall';
    return (id as ActivityId) in ACTIVITY_INSTRUCTIONS ? (id as ActivityId) : 'memory_match';
  }

  /**
   * Retrieves localized elder-friendly instruction for a given game and context.
   */
  public static get(activityId: ActivityId | string, context: ActivityContext, lang: Language = 'en'): string {
    const id = this.normalizeId(activityId);
    const act = ACTIVITY_INSTRUCTIONS[id] || ACTIVITY_INSTRUCTIONS.memory_match;
    const contextMap = act[context] || act.instruction;
    return contextMap[lang] || contextMap.en || '';
  }

  /**
   * Retrieves the activity title in the selected language.
   */
  public static getTitle(activityId: ActivityId | string, lang: Language = 'en'): string {
    const id = this.normalizeId(activityId);
    const act = ACTIVITY_INSTRUCTIONS[id] || ACTIVITY_INSTRUCTIONS.memory_match;
    return act.name[lang] || act.name.en;
  }

  /**
   * Generates a short, elder-friendly spoken summary for the Personal Pattern screen.
   * Strictly non-diagnostic and concise.
   */
  public static getPersonalPatternSummary(
    status: 'CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION',
    lang: Language = 'en',
    sessionCount: number = 0
  ): string {
    if (status === 'CALIBRATING' || sessionCount < 3) {
      const msgs: Record<Language, string> = {
        en: `Your phone is learning your personal pattern. ${sessionCount} of 3 baseline sessions recorded.`,
        te: `మీ ఫోన్ మీ వ్యక్తిగత స్పందనా విధానాన్ని నేర్చుకుంటోంది. 3 లో ${sessionCount} సెషన్లు పూర్తయ్యాయి.`,
        hi: `आपका फोन आपकी व्यक्तिगत शैली को समझ रहा है। 3 में से ${sessionCount} अभ्यास पूरे हुए।`,
      };
      return msgs[lang] || msgs.en;
    }

    if (status === 'MEANINGFUL_DEVIATION') {
      const msgs: Record<Language, string> = {
        en: "Today's interaction pattern differed from your usual personal pattern. Response pace was slower and activities have been gently eased.",
        te: "ఈ రోజు మీ స్పందనా విధానం సాధారణ స్థాయి కంటే భిన్నంగా ఉంది. మీ సౌలభ్యం కోసం వ్యాయామాల క్లిష్టత తగ్గించబడింది.",
        hi: "आज आपकी प्रतिक्रिया की गति सामान्य से धीमी रही। आपकी सुविधा के लिए अभ्यास को सरल बना दिया गया है।",
      };
      return msgs[lang] || msgs.en;
    }

    if (status === 'MINOR_DEVIATION') {
      const msgs: Record<Language, string> = {
        en: "A slight variation was observed today compared to your usual rhythm. Activities remain comfortable.",
        te: "మీ సాధారణ వేగంతో పోలిస్తే ఈ రోజు చిన్న వ్యత్యాసం కనిపించింది. ఆటలు సౌకర్యవంతంగా కొనసాగుతున్నాయి.",
        hi: "आपकी सामान्य गति की तुलना में आज थोड़ा बदलाव देखा गया। अभ्यास सहज रूप से जारी है।",
      };
      return msgs[lang] || msgs.en;
    }

    // Normal / Aligned
    const msgs: Record<Language, string> = {
      en: "Your recent interaction pattern is within your usual personal range. Touch cadence and rhythm are steady.",
      te: "మీ ఇటీవలి స్పందనా విధానం మీ సాధారణ పరిధిలో ఉంది. మీ స్పర్శ వేగం మరియు స్థిరత్వం బాగున్నాయి.",
      hi: "आपका हाल का इंटरैक्शन पैटर्न आपके सामान्य स्तर के भीतर है। आपकी गति और स्थिरता बहुत अच्छी है।",
    };
    return msgs[lang] || msgs.en;
  }

  /**
   * Returns common elder-friendly interface labels.
   */
  public static getCommon(key: 'listen' | 'listen_again' | 'help' | 'hint' | 'voice_unavailable' | 'start' | 'im_ready', lang: Language = 'en'): string {
    const table: Record<string, Record<Language, string>> = {
      im_ready: {
        en: "I'm Ready",
        te: 'నేను సిద్ధంగా ఉన్నాను',
        hi: 'मैं तैयार हूँ',
      },
      listen: {
        en: 'Listen',
        te: 'వినండి',
        hi: 'सुनें',
      },
      listen_again: {
        en: 'Listen Again',
        te: 'మళ్ళీ వినండి',
        hi: 'फिर से सुनें',
      },
      help: {
        en: 'Help / Hint',
        te: 'సహాయం / సూచన',
        hi: 'मदद / सुझाव',
      },
      hint: {
        en: 'Hint',
        te: 'సూచన',
        hi: 'सुझाव',
      },
      start: {
        en: 'Start Activity',
        te: 'ప్రారంభించండి',
        hi: 'शुरू करें',
      },
      voice_unavailable: {
        en: 'Telugu voice is unavailable on this device. Text guidance remains available.',
        te: 'ఈ పరికరంలో తెలుగు వాయిస్ అందుబాటులో లేదు. టెక్స్ట్ సూచనలు అందుబాటులో ఉన్నాయి.',
        hi: 'इस उपकरण पर हिंदी आवाज़ उपलब्ध नहीं है। लिखित निर्देश उपलब्ध हैं।',
      },
    };
    return table[key]?.[lang] || table[key]?.en || '';
  }

  /**
   * Returns a helpful, actionable hint message for the specified game.
   */
  public static getHint(gameType: string, lang: Language = 'en'): string {
    const key = gameType === 'memory_match' ? 'memory' : gameType;
    return this.get(key, 'help', lang) || this.get('memory', 'help', lang);
  }
}
