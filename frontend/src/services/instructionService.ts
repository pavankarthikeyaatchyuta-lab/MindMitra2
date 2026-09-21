import { Language } from '../types';

export type ActivityContext =
  | 'welcome'
  | 'start'
  | 'instruction'
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
  | 'visual_recall';

export interface ActivityInstructionSet {
  name: Record<Language, string>;
  welcome: Record<Language, string>;
  start: Record<Language, string>;
  instruction: Record<Language, string>;
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
      en: 'Take your time. Tap any two cards to see the symbols.',
      te: 'ప్రశాంతంగా ఆలోచించండి. ఏవైనా రెండు కార్డులను ఎంచుకోండి.',
      hi: 'आराम से सोचें। किन्हीं दो कार्डों को चुनकर देखें।',
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
      en: 'Object & Family Recall',
      te: 'వస్తువులు & కుటుంబ సభ్యుల గుర్తింపు',
      hi: 'वस्तु और परिवार पहचान',
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
      en: 'Visual Observation Recall',
      te: 'దృశ్య పరిశీలన వ్యాయామం',
      hi: 'दृश्य अवलोकन अभ्यास',
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
};

export class InstructionService {
  /**
   * Retrieves localized elder-friendly instruction for a given game and context.
   */
  public static get(activityId: ActivityId, context: ActivityContext, lang: Language = 'en'): string {
    const act = ACTIVITY_INSTRUCTIONS[activityId] || ACTIVITY_INSTRUCTIONS.memory_match;
    const contextMap = act[context] || act.instruction;
    return contextMap[lang] || contextMap.en || '';
  }

  /**
   * Retrieves the activity title in the selected language.
   */
  public static getTitle(activityId: ActivityId, lang: Language = 'en'): string {
    const act = ACTIVITY_INSTRUCTIONS[activityId] || ACTIVITY_INSTRUCTIONS.memory_match;
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
  public static getCommon(key: 'listen' | 'listen_again' | 'help' | 'voice_unavailable' | 'start', lang: Language = 'en'): string {
    const table: Record<string, Record<Language, string>> = {
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
        en: 'Help',
        te: 'సహాయం',
        hi: 'मदद',
      },
      start: {
        en: 'Start Activity',
        te: 'ప్రారంభించండి',
        hi: 'शुरू करें',
      },
      voice_unavailable: {
        en: 'Voice assistance is unavailable on this device. Tap anywhere to continue.',
        te: 'ఈ పరికరంలో వాయిస్ అందుబాటులో లేదు. కొనసాగించడానికి స్క్రీన్‌పై తాకండి.',
        hi: 'इस उपकरण पर आवाज़ उपलब्ध नहीं है। जारी रखने के लिए स्क्रीन को छुएं।',
      },
    };
    return table[key]?.[lang] || table[key]?.en || '';
  }
}
