import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  Upload,
  BookOpen
} from 'lucide-react';
import { SignToken } from '../types';
import { Avatar3D } from './Avatar3D';

interface DocumentQAResult {
  answer: string;
  importantHighlights: string[];
  islGloss: string;
  signTokens: SignToken[];
  suggestedFollowUps: string[];
}

const SAMPLE_DOCS = [
  {
    title: '🏥 Hospital Discharge & Dosage Advisory',
    type: 'medical',
    text: `PATIENT DISCHARGE SUMMARY:
Patient Name: Rajesh Kumar (Age: 46)
Diagnosis: Acute Bronchitis & Viral Fever
Medications:
1. Azithromycin 500mg - 1 tablet daily for 3 days after breakfast.
2. Paracetamol 650mg - 1 tablet three times a day as needed for fever above 100°F.
3. Cough Expectorant Syrup - 10ml twice daily after food.
Precautions: Avoid cold drinks. Drink warm fluids.
Follow-up: Review in OPD Room 14 on Monday 10:00 AM. Emergency Desk 24/7 Helpline: 011-26588500.`,
  },
  {
    title: '🚆 Indian Railways Circular: Coach Position & PNR Rules',
    type: 'railway',
    text: `NORTHERN RAILWAYS PASSENGER CIRCULAR:
Ref: Train 12424 New Delhi Dibrugarh Rajdhani Express.
Attention passengers holding waitlisted e-tickets: Waitlisted passengers are NOT permitted to board reserved coaches.
Platform Assignment: Train departs from Platform 12 at 16:10 hrs.
Coach Position: Engine -> H1 (First AC) -> A1-A4 (2AC) -> B1-B10 (3AC).
Special Assistance: Battery-operated carts and dedicated wheelchair assistance available at Gate 2 assistance desk.`,
  },
  {
    title: '🏛️ Bank Aadhaar Re-KYC Compliance Directive',
    type: 'banking',
    text: `STATE BANK OF INDIA - RE-KYC NOTIFICATION:
Dear Customer,
As per Reserve Bank of India (RBI) guidelines, your account requires periodic KYC update.
Deadline: March 31, 2026.
Required Documents:
1. Original Aadhaar Card with biometric update.
2. PAN Card or Form 60.
3. Recent passport size photograph.
Failure to submit will restrict net-banking and ATM withdrawals. Visit home branch with self-attested copies.`,
  },
];

export const DocumentAssistant: React.FC = () => {
  const [docType, setDocType] = useState<string>('medical');
  const [documentText, setDocumentText] = useState<string>(SAMPLE_DOCS[0].text);
  const [question, setQuestion] = useState<string>('What are the medication timings and emergency instructions?');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<DocumentQAResult | null>(null);

  const handleAnalyzeDocument = async (customQ?: string) => {
    if (!documentText.trim()) return;

    setIsLoading(true);
    const q = customQ || question;
    try {
      const res = await fetch('/api/gemini/document-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          question: q,
          docType,
        }),
      });

      if (!res.ok) throw new Error('Document QA request failed');

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Document QA error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30 mb-3">
          <BookOpen className="w-3.5 h-3.5" /> Accessible Document Simplifier & Sign Gloss
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Simplify Complex Documents & Notices
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
          Government circulars, railway announcements, medical prescriptions, and legal notices often contain dense jargon. We Hear You extracts critical facts and translates answers into plain language and visual Indian Sign Language (ISL).
        </p>

        {/* Preset Sample Document Pickers */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block w-full mb-1">
            Load Sample Document:
          </span>
          {SAMPLE_DOCS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDocType(sample.type);
                setDocumentText(sample.text);
                setResult(null);
              }}
              className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl border border-slate-700 transition"
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Document Text Area & Output Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Document Text & Query (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Document Text / Official Circular
            </label>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              {documentText.length} characters
            </span>
          </div>

          <textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            rows={8}
            placeholder="Paste notice, prescription, or official circular text..."
            className="w-full text-xs sm:text-sm p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed font-mono"
          />

          {/* Question / Inquiry Input */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              What would you like to know or clarify?
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeDocument()}
                placeholder="e.g. When is the deadline? What is the dosage? Where is platform 12?"
                className="flex-1 text-xs sm:text-sm p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button
                onClick={() => handleAnalyzeDocument()}
                disabled={isLoading || !documentText.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 text-white px-5 py-3 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Answer Card */}
          {result && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="bg-sky-50/80 dark:bg-sky-950/40 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/50 space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-900 dark:text-sky-300 block">
                  Plain-Language Clarification
                </span>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {result.answer}
                </p>
              </div>

              {/* Crucial Highlights */}
              {result.importantHighlights?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 block">
                    Important Action Items
                  </span>
                  <div className="space-y-1.5">
                    {result.importantHighlights.map((hl, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Follow-Up Questions */}
              {result.suggestedFollowUps?.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                    Suggested Inquiries:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.suggestedFollowUps.map((fu, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuestion(fu);
                          handleAnalyzeDocument(fu);
                        }}
                        className="text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
                      >
                        {fu}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Right Column: 3D Signing Avatar (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Avatar3D
            signTokens={result?.signTokens || []}
            currentGloss={result?.islGloss}
            height="h-[460px] sm:h-[540px]"
          />
        </div>

      </div>
    </div>
  );
};
