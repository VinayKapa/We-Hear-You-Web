import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  GraduationCap, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  RotateCcw,
  BookOpen,
  Play
} from 'lucide-react';
import { Avatar3D } from './Avatar3D';
import { SignToken } from '../types';

const ALPHABET_ISL = [
  { letter: 'A', handshape: 'Fist with thumb resting beside index' },
  { letter: 'B', handshape: 'Flat open palm with four fingers upright, thumb tucked' },
  { letter: 'C', handshape: 'Curved hand forming a C-shape arch' },
  { letter: 'D', handshape: 'Index finger pointing up, other fingers touch thumb' },
  { letter: 'E', handshape: 'All fingers bent inward resting on thumb' },
  { letter: 'F', handshape: 'Index and thumb pinch circle, three fingers spread' },
  { letter: 'G', handshape: 'Index finger and thumb parallel pointing horizontally' },
  { letter: 'H', handshape: 'Index and middle fingers extended horizontally' },
  { letter: 'I', handshape: 'Pinky finger extended upright, fist closed' },
  { letter: 'L', handshape: 'Index and thumb extended at 90-degree right angle' },
  { letter: 'O', handshape: 'All fingers touch thumb forming an O circle' },
  { letter: 'V', handshape: 'Index and middle finger extended upright forming a V' },
];

const QUIZ_QUESTIONS = [
  {
    question: 'In Indian Sign Language (ISL), what is the standard sentence word order?',
    options: [
      'SVO: Subject - Verb - Object',
      'SOV: Subject - Object - Verb',
      'VSO: Verb - Subject - Object',
      'Any order with finger spelling',
    ],
    correctIndex: 1,
    explanation: 'ISL follows Subject-Object-Verb (SOV) structure. Time markers (like TODAY or YESTERDAY) are signed first.',
    signTokens: [
      { gloss: 'TIME', meaning: 'Time marker first', durationSec: 1.0 },
      { gloss: 'SUBJECT', meaning: 'Subject', durationSec: 0.9 },
      { gloss: 'OBJECT', meaning: 'Object', durationSec: 0.9 },
      { gloss: 'VERB', meaning: 'Verb at the end', durationSec: 1.0 },
    ],
  },
  {
    question: 'What are Non-Manual Markers (NMM) in Indian Sign Language?',
    options: [
      'Written notes on paper',
      'Facial expressions, head tilts, and body postures that convey grammatical meaning',
      'Audio beeps played by mobile devices',
      'Special gloves with sensors',
    ],
    correctIndex: 1,
    explanation: 'Non-Manual Markers like eyebrow raises (for questions) and head nods are essential grammatical components of ISL.',
    signTokens: [
      { gloss: 'FACE-EXPRESSION', meaning: 'Facial expressions', durationSec: 1.0 },
      { gloss: 'HEAD-TILT', meaning: 'Head tilt', durationSec: 0.9 },
      { gloss: 'GRAMMAR', meaning: 'Grammar rule', durationSec: 1.0 },
    ],
  },
  {
    question: 'How do you sign "DOCTOR" in standard ISL?',
    options: [
      'Waving both hands above the head',
      'Tapping two fingers on the wrist pulse area',
      'Pointing at the eyes',
      'Crossing arms across the chest',
    ],
    correctIndex: 1,
    explanation: 'DOCTOR is signed by checking the wrist pulse with two fingers, symbolizing a clinical pulse diagnosis.',
    signTokens: [
      { gloss: 'DOCTOR', meaning: 'Doctor checking pulse', durationSec: 1.2 },
      { gloss: 'HELP', meaning: 'Medical help', durationSec: 0.9 },
    ],
  },
];

export const LearnISL: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'alphabet' | 'quiz' | 'vocabulary'>('quiz');
  const [currentQuizIdx, setCurrentQuizIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [activeTokens, setActiveTokens] = useState<SignToken[]>(QUIZ_QUESTIONS[0].signTokens);

  const currentQ = QUIZ_QUESTIONS[currentQuizIdx];

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);

    if (idx === currentQ.correctIndex) {
      setScore((s) => s + 1);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleNextQuestion = () => {
    if (currentQuizIdx < QUIZ_QUESTIONS.length - 1) {
      const nextIdx = currentQuizIdx + 1;
      setCurrentQuizIdx(nextIdx);
      setSelectedOption(null);
      setActiveTokens(QUIZ_QUESTIONS[nextIdx].signTokens);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuizIdx(0);
    setSelectedOption(null);
    setScore(0);
    setQuizFinished(false);
    setActiveTokens(QUIZ_QUESTIONS[0].signTokens);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-sky-950 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-sky-900 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30 mb-3">
            <GraduationCap className="w-3.5 h-3.5" /> ISL Learning Academy
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Master Indian Sign Language (ISL)
          </h2>
          <p className="text-xs sm:text-sm text-sky-200/90 mt-1 max-w-2xl leading-relaxed">
            Learn alphabet fingerspelling, grammar principles, and essential public signage with interactive 3D avatar demonstrations and knowledge checks.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl flex items-center gap-1 border border-white/15">
          <button
            onClick={() => setActiveCategory('quiz')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeCategory === 'quiz' ? 'bg-white text-slate-950 shadow-md' : 'text-slate-200 hover:text-white'
            }`}
          >
            ISL Quiz Challenge
          </button>
          <button
            onClick={() => setActiveCategory('alphabet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeCategory === 'alphabet' ? 'bg-white text-slate-950 shadow-md' : 'text-slate-200 hover:text-white'
            }`}
          >
            Alphabet Fingerspelling
          </button>
        </div>
      </div>

      {/* Grid: Learning View (7 cols) + 3D Demonstration Avatar (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          
          {activeCategory === 'quiz' && (
            <div className="space-y-5">
              {!quizFinished ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Question {currentQuizIdx + 1} of {QUIZ_QUESTIONS.length}
                    </span>
                    <span className="text-xs font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-900/50">
                      Score: {score}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                    {currentQ.question}
                  </h3>

                  {/* Options List */}
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt, i) => {
                      const isChosen = selectedOption === i;
                      const isCorrect = i === currentQ.correctIndex;
                      let btnStyle = 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

                      if (selectedOption !== null) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 font-bold';
                        } else if (isChosen) {
                          btnStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 text-rose-950 dark:text-rose-200';
                        } else {
                          btnStyle = 'bg-slate-50 dark:bg-slate-800/30 opacity-50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400';
                        }
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => handleSelectOption(i)}
                          disabled={selectedOption !== null}
                          className={`w-full p-3.5 rounded-2xl text-xs sm:text-sm font-semibold text-left border-2 transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {selectedOption !== null && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                          )}
                          {selectedOption !== null && isChosen && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation & Next */}
                  {selectedOption !== null && (
                    <div className="pt-3 space-y-3">
                      <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-100 dark:border-sky-900/50 text-xs text-sky-950 dark:text-sky-200 font-medium leading-relaxed">
                        <span className="font-extrabold text-sky-900 dark:text-sky-300 block mb-1">
                          Explanation:
                        </span>
                        {currentQ.explanation}
                      </div>

                      <button
                        onClick={handleNextQuestion}
                        className="w-full bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white py-3 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                      >
                        {currentQuizIdx < QUIZ_QUESTIONS.length - 1 ? 'Next Question →' : 'View Final Score'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Quiz Finished Card */
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-md">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Quiz Completed!
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    You scored <span className="font-black text-slate-950 dark:text-white">{score}</span> out of <span className="font-black text-slate-950 dark:text-white">{QUIZ_QUESTIONS.length}</span>!
                  </p>
                  <button
                    onClick={handleRestartQuiz}
                    className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Try Again</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeCategory === 'alphabet' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                  ISL Fingerspelling Handshapes
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Select a letter to demonstrate
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ALPHABET_ISL.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveTokens([
                        { gloss: `LETTER-${item.letter}`, meaning: `Fingerspelling: ${item.letter}`, durationSec: 1.2 },
                      ]);
                    }}
                    className="p-3 text-left rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-sky-300 dark:hover:border-sky-700/50 transition-all group cursor-pointer active:scale-95"
                  >
                    <span className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 block">
                      {item.letter}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {item.handshape}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: 3D Demonstration Avatar */}
        <div className="lg:col-span-5 space-y-4">
          <Avatar3D
            signTokens={activeTokens}
            height="h-[460px] sm:h-[540px]"
          />
        </div>

      </div>
    </div>
  );
};
