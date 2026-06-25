'use client';

import { useState, useRef } from 'react';

interface QA {
  question: string;
  idealAnswer: string;
}

interface Evaluation {
  overallScore: number;
  technicalAccuracy: number;
  communicationClarity: number;
  relevantExamples: number;
  strengths: string[];
  areasToImprove: string[];
  overallFeedback: string;
  tips: string[];
}

export default function Home() {
  const [jd, setJd] = useState('');
  const [questions, setQuestions] = useState<QA[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [showIdealAnswer, setShowIdealAnswer] = useState(false);
  const [error, setError] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [finished, setFinished] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const generateInterview = async () => {
    if (!jd.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      setQuestions(data.questions);
      setAnswers(new Array(10).fill(''));
      setCurrentIndex(0);
      setInterviewStarted(true);
      setShowIdealAnswer(false);
      setUserAnswer('');
      setFinished(false);
      setEvaluation(null);
      setTimeout(() => speak(data.questions[0].question), 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported. Please use Chrome or Edge.');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setUserAnswer(transcript);
      // Save answer to array
      const newAnswers = [...answers];
      newAnswers[currentIndex] = transcript;
      setAnswers(newAnswers);
    };
    rec.onerror = (e) => {
      console.error('Speech error:', e.error);
      if (e.error === 'not-allowed') {
        alert('Please allow microphone access to record your answer.');
      }
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    setIsListening(true);
    recognitionRef.current = rec;
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleFinish = async () => {
    setEvaluating(true);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, answers, jd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');
      setEvaluation(data.evaluation);
      setFinished(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setUserAnswer(answers[nextIdx] || '');
      setShowIdealAnswer(false);
      speak(questions[nextIdx].question);
    } else {
      handleFinish();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setUserAnswer(answers[prevIdx] || '');
      setShowIdealAnswer(false);
      speak(questions[prevIdx].question);
    }
  };

  const resetInterview = () => {
    setInterviewStarted(false);
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setUserAnswer('');
    setShowIdealAnswer(false);
    setError('');
    setEvaluation(null);
    setFinished(false);
  };

  const ScoreCircle = ({ score, label }: { score: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-white/10"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
            className={score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">
          {score}%
        </span>
      </div>
      <span className="text-gray-400 text-sm mt-2">{label}</span>
    </div>
  );

  // ---- FINISHED / EVALUATION SCREEN ----
  if (finished && evaluation) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">🎉</span>
            <h1 className="text-3xl font-bold text-white">Interview Complete!</h1>
            <p className="text-gray-400 mt-2">Here's your performance evaluation</p>
          </div>

          {/* Overall Score */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/10 mb-6">
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="10" className="text-white/10" />
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none" stroke="currentColor" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - evaluation.overallScore / 100)}`}
                    className={evaluation.overallScore >= 70 ? 'text-green-400' : evaluation.overallScore >= 40 ? 'text-yellow-400' : 'text-red-400'}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white">
                  {evaluation.overallScore}%
                </span>
              </div>
              <p className="text-gray-300 text-center text-lg">{evaluation.overallFeedback}</p>
            </div>
          </div>

          {/* Detailed scores */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{evaluation.technicalAccuracy}%</p>
              <p className="text-gray-400 text-sm">Technical</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{evaluation.communicationClarity}%</p>
              <p className="text-gray-400 text-sm">Communication</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-pink-400">{evaluation.relevantExamples}%</p>
              <p className="text-gray-400 text-sm">Examples</p>
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-500/10 backdrop-blur-lg rounded-xl p-5 border border-green-500/20">
              <h3 className="text-green-300 font-semibold mb-3">✅ Strengths</h3>
              <ul className="space-y-2">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="text-gray-300 text-sm flex gap-2">
                    <span>•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-orange-500/10 backdrop-blur-lg rounded-xl p-5 border border-orange-500/20">
              <h3 className="text-orange-300 font-semibold mb-3">📈 Areas to Improve</h3>
              <ul className="space-y-2">
                {evaluation.areasToImprove.map((a, i) => (
                  <li key={i} className="text-gray-300 text-sm flex gap-2">
                    <span>•</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-500/10 backdrop-blur-lg rounded-xl p-5 border border-blue-500/20 mb-6">
            <h3 className="text-blue-300 font-semibold mb-3">💡 Tips for Next Time</h3>
            <ul className="space-y-2">
              {evaluation.tips.map((t, i) => (
                <li key={i} className="text-gray-300 text-sm flex gap-2">
                  <span>{i + 1}.</span> {t}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={resetInterview}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 rounded-xl font-semibold text-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-600/25"
          >
            🔄 Start New Interview
          </button>
        </div>
      </main>
    );
  }

  // ---- EVALUATING SCREEN ----
  if (evaluating) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 border-4 border-purple-500/30 rounded-full animate-spin border-t-purple-500"></div>
            <span className="absolute inset-0 flex items-center justify-center text-3xl">📊</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Evaluating Your Answers...</h2>
          <p className="text-gray-400">Analyzing all 10 responses</p>
        </div>
      </main>
    );
  }

  // ---- INPUT SCREEN ----
  if (!interviewStarted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/20 mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">AI Interview Prep</h1>
            <p className="text-gray-400">Paste a job description and practice with voice-powered interviews</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/10 shadow-2xl">
            {loading ? (
              <div className="flex flex-col items-center py-12">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full animate-spin border-t-purple-500"></div>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl">🤖</span>
                </div>
                <p className="mt-6 text-gray-300 text-lg">Generating interview questions...</p>
                <p className="text-gray-500 text-sm mt-1">Analyzing job description</p>
              </div>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  📋 Job Description
                </label>
                <textarea
                  className="w-full h-48 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste the full job description here..."
                />
                {error && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}
                <button
                  onClick={generateInterview}
                  disabled={!jd.trim()}
                  className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 rounded-xl font-semibold text-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-600/25"
                >
                  🚀 Generate Interview
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { icon: '🎤', label: 'Voice Answers' },
              { icon: '📝', label: 'AI Evaluation' },
              { icon: '📊', label: 'Detailed Score' },
            ].map((f) => (
              <div key={f.label} className="text-center text-gray-400 text-sm">
                <span className="text-xl block mb-1">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ---- INTERVIEW SCREEN ----
  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = answers.filter(a => a && a.trim()).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={resetInterview}
            className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            ← Exit
          </button>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{answeredCount}/10 answered</span>
            <span className="text-gray-400 text-sm">Q {currentIndex + 1}/10</span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/10 shadow-2xl mb-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🗣️</span>
            <div>
              <p className="text-purple-300 text-sm font-medium mb-2">CURRENT QUESTION</p>
              <h2 className="text-2xl font-bold text-white leading-relaxed">{currentQ.question}</h2>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => speak(currentQ.question)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 transition-all"
            >
              🔁 Repeat
            </button>
            {isListening ? (
              <button
                onClick={stopListening}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all animate-pulse font-medium"
              >
                ⏹ Stop Recording
              </button>
            ) : (
              <button
                onClick={startListening}
                className="flex items-center gap-2 px-6 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-medium"
              >
                🎤 Start Answer
              </button>
            )}
          </div>

          {isListening && (
            <div className="mt-4 flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-green-300 font-medium">Listening...</span>
            </div>
          )}
        </div>

        {userAnswer && (
          <>
            <div className="bg-blue-500/10 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/20 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">💬</span>
                <h3 className="text-blue-300 font-semibold">Your Answer</h3>
              </div>
              <p className="text-gray-200 leading-relaxed">{userAnswer}</p>
            </div>

            {!showIdealAnswer ? (
              <button
                onClick={() => setShowIdealAnswer(true)}
                className="w-full p-4 bg-white/5 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-white/40 transition-all"
              >
                👁️ Reveal Ideal Answer
              </button>
            ) : (
              <div className="bg-green-500/10 backdrop-blur-lg rounded-2xl p-6 border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">✅</span>
                  <h3 className="text-green-300 font-semibold">Ideal Answer</h3>
                </div>
                <p className="text-gray-200 leading-relaxed">{currentQ.idealAnswer}</p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className="px-6 py-3 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>
          <button
            onClick={nextQuestion}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-600/25"
          >
            {currentIndex < questions.length - 1 ? 'Next →' : 'Finish & Get Score 🎯'}
          </button>
        </div>
      </div>
    </main>
  );
}