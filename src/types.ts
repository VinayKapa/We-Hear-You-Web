export interface SignToken {
  gloss: string;
  meaning: string;
  category?: string;
  handshape?: string;
  durationSec: number;
  facialCue?: string;
  signId?: string | null;
  animationId?: string | null;
}

export interface ISLSequenceItem {
  gloss: string;
  meaning: string;
  signId?: string | null;
  animationId?: string | null;
  handshape?: string;
  durationSec: number;
  facialCue?: string;
}

export interface TranslationResult {
  originalText: string;
  language: string;
  summary: string;
  simplifiedMeaning: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore?: number;
  visualExtractionNotes?: string;
  islGloss: string;
  grammarStructure: string;
  facialExpression: string;
  islSequence?: ISLSequenceItem[];
  signTokens: SignToken[];
  keyEntities: string[];
  audioTranscript: string;
  fileName?: string;
}

export interface ConversationTurn {
  id: string;
  sender: 'deaf' | 'hearing';
  text: string;
  islGloss?: string;
  interpretedMeaning?: string;
  spokenAudioText?: string;
  facialExpression?: string;
  timestamp: string;
}

export interface EmergencyLog {
  id: string;
  category: 'medical' | 'police' | 'fire' | 'disaster' | 'general';
  title: string;
  message: string;
  islGloss: string;
  source: string;
  confirmed: boolean;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'deaf_individual' | 'hard_of_hearing' | 'hearing_ally' | 'interpreter' | 'educator';
  avatarInitials: string;
  avatarCustomization?: {
    skinTone?: string;
    shirtColor?: string;
    avatarModel?: string;
    signingSpeed?: number;
  };
  createdAt?: string;
}

export interface LearnModule {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Emergency & Essential';
  description: string;
  signs: {
    word: string;
    gloss: string;
    description: string;
    handshape: string;
    movement: string;
    practicePrompt?: string;
  }[];
}
