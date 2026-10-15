import { useEffect, useRef, useState } from "react";
import "./App.css";
import Login from "./pages/Login";

const API_BASE_URL = "http://127.0.0.1:8000";
const LAST_REPORT_KEY = "voiceready_last_report_session";

/* ---------- helpers ---------- */

function readError(data, fallback) {
  const detail = Array.isArray(data?.detail)
    ? data.detail.map((item) => item.msg).join(", ")
    : data?.detail;
  return detail || fallback;
}

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readError(data, "Something went wrong. Please try again."));
  }
  return data;
}

/* Convert browser-recorded audio to WAV */
async function convertAudioToWav(audioBlob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("Your browser does not support audio processing.");
  }

  const audioContext = new AudioContextClass();

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Convert to mono to reduce upload size.
    const channelCount = 1;
    const sampleRate = audioBuffer.sampleRate;
    const frameCount = audioBuffer.length;
    const mono = new Float32Array(frameCount);

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);

      for (let i = 0; i < frameCount; i++) {
        mono[i] += channelData[i] / audioBuffer.numberOfChannels;
      }
    }

    const bytesPerSample = 2;
    const dataSize = mono.length * bytesPerSample;
    const wavBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuffer);

    function writeString(offset, text) {
      for (let i = 0; i < text.length; i++) {
        view.setUint8(offset + i, text.charCodeAt(i));
      }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    let offset = 44;

    for (let i = 0; i < mono.length; i++) {
      const sample = Math.max(-1, Math.min(1, mono[i]));
      const value = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, value, true);
      offset += 2;
    }

    return new Blob([wavBuffer], { type: "audio/wav" });
  } finally {
    await audioContext.close();
  }
}

const navItems = [
  { id: "dashboard", icon: "▦", label: "Dashboard" },
  { id: "interview", icon: "◉", label: "Mock Interview" },
  { id: "coach", icon: "✳", label: "AI Practice Coach" },
  { id: "history", icon: "◷", label: "Interview History" },
];

/* =====================================================
   EVALUATION (right side) + INSIGHTS (left side)
   ===================================================== */

const asList = (value) => (Array.isArray(value) ? value : []);
const toScore = (value) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  Number.isFinite(Number(value))
    ? Number(value)
    : null;

function ScoreCard({ label, value, reason }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(10, value)) * 10;
  return (
    <div className="evaluation-score-card" style={{ "--pct": `${pct}%` }}>
      <span>{label}</span>
      <strong>{value === null ? "—" : `${value}/10`}</strong>
      <p>{reason}</p>
    </div>
  );
}

function EvaluationMain({ answerFeedback }) {
  const ev = answerFeedback?.feedback || {};
  const strengths = asList(ev.strengths);
  const missing = asList(ev.missing_points);
  const corrections = asList(ev.phrase_corrections);
  const nextPractice = asList(ev.next_practice);

  return (
    <section className="evaluation-panel" aria-live="polite">
      <div className="evaluation-heading">
        <div>
          <h3>Answer evaluation</h3>
          <p>{ev.overall_feedback || "Your answer has been evaluated."}</p>
        </div>
        <span className="evaluation-status">✓ Evaluated</span>
      </div>

      <div className="evaluation-score-grid">
        <ScoreCard
          label="Content"
          value={toScore(ev.content_score)}
          reason={ev.score_reason || "Based on the content of your answer."}
        />
        <ScoreCard
          label="Communication"
          value={toScore(ev.communication_score)}
          reason={ev.communication_score_reason || "Based on clarity."}
        />
      </div>

      {ev.answer_meaning && (
        <div className="evaluation-section">
          <h4>What the AI understood</h4>
          <p>{ev.answer_meaning}</p>
        </div>
      )}

      <div className="evaluation-two-columns">
        <div className="evaluation-section">
          <h4>Strengths</h4>
          {strengths.length ? (
            <ul>
              {strengths.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          ) : (
            <p>No strengths listed.</p>
          )}
        </div>
        <div className="evaluation-section">
          <h4>Areas to improve</h4>
          {missing.length ? (
            <ul>
              {missing.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          ) : (
            <p>No missing points listed.</p>
          )}
        </div>
      </div>

      {corrections.length > 0 && (
        <div className="evaluation-section">
          <h4>Phrase corrections</h4>
          {corrections.map((item, i) => (
            <div className="phrase-correction" key={i}>
              <p>
                <span>Original</span>
                {item.said}
              </p>
              <p>
                <span>Improved</span>
                {item.english}
              </p>
            </div>
          ))}
        </div>
      )}

      {ev.improved_answer && (
        <div className="evaluation-section improved-answer">
          <h4>Your improved answer</h4>
          <p>{ev.improved_answer}</p>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigator.clipboard?.writeText(ev.improved_answer)}
          >
            Copy improved answer
          </button>
        </div>
      )}

      {nextPractice.length > 0 && (
        <div className="evaluation-section">
          <h4>Suggested next practice</h4>
          <ul>
            {nextPractice.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EvaluationInsights({ answerFeedback }) {
  const ev = answerFeedback?.feedback || {};
  const sp = answerFeedback?.speaking || {};
  const fillers = ev.filler_words?.count ?? 0;

  return (
    <>
      <div className="insight-grid">
        <div className="session-card">
          <h4 className="card-title">Example answer</h4>
          <p className="card-text">
            {ev.model_answer || "No example answer was returned."}
          </p>
        </div>
        <div className="session-card">
          <h4 className="card-title">Language feedback</h4>
          <p className="card-text">
            {ev.language_feedback || "No additional language feedback."}
          </p>
        </div>
      </div>

      <div className="session-card">
        <h4 className="card-title">Speaking analysis</h4>
        <div className="speaking-stats">
          <div>
            <strong>{sp.words ?? "—"}</strong>
            <span>Words</span>
          </div>
          <div>
            <strong>{sp.words_per_minute ?? "—"}</strong>
            <span>Words per minute{sp.pace ? ` (${sp.pace})` : ""}</span>
          </div>
          <div>
            <strong>{fillers}</strong>
            <span>Filler words</span>
          </div>
        </div>
        {ev.filler_words?.feedback && (
          <p className="card-text">{ev.filler_words.feedback}</p>
        )}
      </div>
    </>
  );
}

/* =====================================================
   INTERVIEW SESSION SCREEN
   ===================================================== */

function InterviewSession({
  role,
  sessionId,
  question,
  questionNumber,
  total,
  isRecording,
  audioLoading,
  audioError,
  transcription,
  answerFeedback,
  nextLoading,
  reportLoading,
  reportError,
  onStart,
  onStop,
  onNext,
  onFinalReport,
  onBack,
}) {
  const [seconds, setSeconds] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isRecording) {
      setSeconds(0);
      return;
    }
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const hasAnswer = Boolean(answerFeedback);
  const finished = Boolean(answerFeedback?.finished);
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60
  ).padStart(2, "0")}`;
  const questionText =
    question.question ||
    question.text ||
    question.prompt ||
    "The question field was not found in the response.";

  const copyId = () => {
    navigator.clipboard?.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="session">
      <div className="session-top">
        <button type="button" className="back-link" onClick={onBack}>
          ← Back to interview setup
        </button>
        <div className="session-chips">
          <span className="chip">
            Role: <strong>{role || "Selected role"}</strong>
          </span>
          <span className="chip">
            Session: <code>{sessionId.slice(0, 8)}…</code>
            <button type="button" className="chip-button" onClick={copyId}>
              {copied ? "Copied" : "Copy"}
            </button>
          </span>
          <span className="chip chip-ok">✓ Interview started</span>
        </div>
      </div>

      <section className="question-card">
        <div className="question-card-main">
          <span className="question-badge">Question {questionNumber}</span>
          <h2>{questionText}</h2>
        </div>
        <div className="question-card-meta">
          {question.topic && (
            <div>
              <span>Topic</span>
              <strong>{question.topic}</strong>
            </div>
          )}
          {question.difficulty && (
            <div>
              <span>Difficulty</span>
              <strong>{question.difficulty}</strong>
            </div>
          )}
          {question.guidance && (
            <div>
              <span>Guidance</span>
              <p>{question.guidance}</p>
            </div>
          )}
        </div>
      </section>

      <div className="session-grid">
        {/* LEFT: answer + insights */}
        <div className="session-col">
          <div className="session-card">
            <h3 className="card-title">Your spoken answer</h3>
            <p className="card-text">
              Record your answer. It will be transcribed and evaluated by
              VoiceReady AI.
            </p>

            <div className="record-actions">
              <button
                type="button"
                className="primary-button"
                onClick={onStart}
                disabled={isRecording || audioLoading || hasAnswer}
              >
                {isRecording ? `● Recording ${mmss}` : "🎙 Start Recording"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={onStop}
                disabled={!isRecording || audioLoading}
              >
                Stop &amp; Submit Answer
              </button>
            </div>

            {hasAnswer && !finished && (
              <p className="card-note">
                Answer saved. Press “Next Question” to continue.
              </p>
            )}
            {finished && (
              <p className="card-note">
                That was the last question. Open your final report below.
              </p>
            )}
            {isRecording && (
              <p className="card-note" role="status">
                Recording in progress. Speak clearly, then press stop.
              </p>
            )}
            {audioLoading && (
              <p className="card-note" role="status">
                Transcribing and evaluating your answer…
              </p>
            )}
            {audioError && (
              <p className="card-note card-error" role="alert">
                {audioError}
              </p>
            )}
          </div>

          {transcription && (
            <div className="session-card transcript-card">
              <h4 className="card-title">
                Transcribed answer
                <span className="word-pill">
                  {transcription.trim().split(/\s+/).length} words
                </span>
              </h4>
              <p className="card-text">{transcription}</p>
            </div>
          )}

          {hasAnswer && <EvaluationInsights answerFeedback={answerFeedback} />}
        </div>

        {/* RIGHT: evaluation */}
        <div className="session-col">
          {hasAnswer ? (
            <EvaluationMain answerFeedback={answerFeedback} />
          ) : (
            <div className="session-card empty-eval">
              <h3 className="card-title">Answer evaluation</h3>
              <p className="card-text">
                Your scores, strengths, phrase corrections and an improved
                answer will appear here after you submit your answer.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="session-footer">
        <button
          type="button"
          className="secondary-button"
          onClick={onNext}
          disabled={!hasAnswer || finished || nextLoading}
        >
          {nextLoading ? "Loading…" : "Next Question →"}
        </button>

        <span className="footer-count">
          Question {questionNumber} of {total || "?"}
        </span>

        <button
          type="button"
          className={finished ? "primary-button" : "secondary-button"}
          onClick={onFinalReport}
          disabled={!hasAnswer || reportLoading}
        >
          {reportLoading ? "Building report…" : "View Final Report"}
        </button>
      </div>

      {reportError && (
        <p className="card-note card-error" role="alert">
          {reportError}
        </p>
      )}
    </div>
  );
}

/* =====================================================
   FINAL REPORT
   ===================================================== */

const KNOWN_REPORT_KEYS = [
  "role",
  "questions_answered",
  "questions_total",
  "interview_finished",
  "scores",
  "total_filler_words",
  "average_words_per_minute",
  "vocabulary_to_learn",
];

const humanize = (key) =>
  key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

// The AI part of the report can have any keys, so draw it generically.
function renderReportValue(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string" || typeof value === "number") {
    return <p>{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    if (!value.length) return null;
    return (
      <ul>
        {value.map((x, i) => (
          <li key={i}>
            {x && typeof x === "object"
              ? Object.values(x)
                  .filter((y) => typeof y === "string" || typeof y === "number")
                  .join(" — ")
              : String(x)}
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <ul>
        {Object.entries(value).map(([k, x]) => (
          <li key={k}>
            <strong>{humanize(k)}:</strong>{" "}
            {typeof x === "object" ? JSON.stringify(x) : String(x)}
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

function FinalReport({ report, onBack, onPractice, onNewInterview }) {
  const scores = report.scores || {};
  const vocab = Array.isArray(report.vocabulary_to_learn)
    ? report.vocabulary_to_learn
    : [];
  const aiSections = Object.entries(report).filter(
    ([key, value]) =>
      !KNOWN_REPORT_KEYS.includes(key) && renderReportValue(value)
  );

  return (
    <div className="session report">
      <div className="session-top">
        <button type="button" className="back-link" onClick={onBack}>
          ← Back to interview
        </button>
        <span className={`chip ${report.interview_finished ? "chip-ok" : ""}`}>
          {report.questions_answered} of {report.questions_total} questions
          answered
        </span>
      </div>

      <section className="session-card report-hero">
        <div>
          <h2>Final report</h2>
          <p className="card-text">Role: {report.role}</p>
        </div>
        <div className="report-overall">
          <strong>{scores.overall ?? "—"}</strong>
          <span>/ 100 overall</span>
        </div>
      </section>

      <div className="report-stats">
        <div className="session-card">
          <span>Content</span>
          <strong>{scores.content ?? "—"}/10</strong>
        </div>
        <div className="session-card">
          <span>Communication</span>
          <strong>{scores.communication ?? "—"}/10</strong>
        </div>
        <div className="session-card">
          <span>Filler words</span>
          <strong>{report.total_filler_words ?? 0}</strong>
        </div>
        <div className="session-card">
          <span>Avg. words per minute</span>
          <strong>{report.average_words_per_minute ?? "—"}</strong>
        </div>
      </div>

      {aiSections.map(([key, value]) => (
        <section className="session-card report-section" key={key}>
          <h4 className="card-title">{humanize(key)}</h4>
          {renderReportValue(value)}
        </section>
      ))}

      {vocab.length > 0 && (
        <section className="session-card report-section">
          <h4 className="card-title">Phrases to learn</h4>
          {vocab.map((item, i) => (
            <div className="phrase-correction" key={i}>
              <p>
                <span>You said</span>
                {item.said}
              </p>
              <p>
                <span>Better</span>
                {item.english}
              </p>
            </div>
          ))}
        </section>
      )}

      <div className="session-footer">
        <button
          type="button"
          className="secondary-button"
          onClick={onNewInterview}
        >
          Start a new interview
        </button>
        <span />
        <button type="button" className="primary-button" onClick={onPractice}>
          Practise weak areas with AI Coach →
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   AI PRACTICE COACH (chat)
   Uses only /chat/start and /chat/message.
   History is saved in the browser, so no backend change.
   ===================================================== */

function ChatCoach({ interviewSessionId, onGoToInterview }) {
  const storeKey = `voiceready_chat_${interviewSessionId}`;

  const [chatId, setChatId] = useState("");
  const [messages, setMessages] = useState([]);
  const [topic, setTopic] = useState("");
  const [insights, setInsights] = useState({
    strengths: [],
    improvements: [],
    practice_question: "",
  });
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef(null);
  const startedRef = useRef(false);

  async function begin(force) {
    setStarting(true);
    setError("");
    setMessages([]);
    setChatId("");

    try {
      // 1) reopen the chat saved in this browser
      if (!force) {
        try {
          const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
          if (saved?.chatId && Array.isArray(saved.messages)) {
            setChatId(saved.chatId);
            setMessages(saved.messages);
            setTopic(saved.topic || "");
            setInsights(
              saved.insights || {
                strengths: [],
                improvements: [],
                practice_question: "",
              }
            );
            return;
          }
        } catch {
          localStorage.removeItem(storeKey);
        }
      }

      // 2) otherwise start a new chat from the interview report
      const data = await api(`${API_BASE_URL}/chat/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interview_session_id: interviewSessionId }),
      });

      setChatId(data.chat_session_id);
      setMessages([{ role: "assistant", content: data.message }]);
      setTopic(data.topic || "");
      setInsights({
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        practice_question: data.practice_question || "",
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  // start once (React dev mode runs effects twice)
  useEffect(() => {
    if (!interviewSessionId || startedRef.current) return;
    startedRef.current = true;
    begin(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save chat in the browser after every change
  useEffect(() => {
    if (!chatId || !interviewSessionId) return;
    localStorage.setItem(
      storeKey,
      JSON.stringify({ chatId, messages, topic, insights })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messages, topic, insights]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send() {
    const message = input.trim();
    if (!message || sending || !chatId) return;

    setSending(true);
    setError("");
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);

    try {
      const data = await api(`${API_BASE_URL}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_session_id: chatId, message }),
      });

      setMessages((m) => [...m, { role: "assistant", content: data.message }]);
      setTopic(data.topic || topic);
      setInsights({
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        practice_question: data.practice_question || "",
      });
    } catch (e) {
      setError(e.message);
      setInput(message); // give the text back so nothing is lost
      setMessages((m) => m.slice(0, -1)); // server did not save it
    } finally {
      setSending(false);
    }
  }

  function restart() {
    localStorage.removeItem(storeKey);
    begin(true);
  }

  if (!interviewSessionId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">✳</div>
        <h3>Finish an interview first</h3>
        <p>
          Your coach builds practice from your interview report. Complete a
          mock interview and open the final report to start coaching.
        </p>
        <button className="primary-button" onClick={onGoToInterview}>
          Go to Mock Interview <span>→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="coach-chat">
      <section className="chat-window">
        <div className="chat-header">
          <div>
            <strong>AI Practice Coach</strong>
            <span>{topic ? `Topic: ${topic}` : "Getting ready…"}</span>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={restart}
            disabled={starting || sending}
          >
            New practice topic
          </button>
        </div>

        <div className="chat-messages" aria-live="polite">
          {starting && (
            <p className="chat-status">Your coach is reading your report…</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`bubble ${
                m.role === "user" ? "bubble-user" : "bubble-ai"
              }`}
            >
              {m.content}
            </div>
          ))}
          {sending && (
            <div className="bubble bubble-ai typing">Coach is typing…</div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="card-note card-error" role="alert">
            {error}
          </p>
        )}

        <div className="chat-composer">
          <textarea
            value={input}
            rows={2}
            maxLength={3000}
            placeholder="Type your answer… (Enter to send, Shift+Enter for a new line)"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={!chatId || sending}
          />
          <button
            type="button"
            className="primary-button"
            onClick={send}
            disabled={!chatId || sending || !input.trim()}
          >
            Send
          </button>
        </div>
      </section>

      <aside className="chat-side">
        {insights.practice_question && (
          <div className="session-card">
            <h4 className="card-title">Current practice question</h4>
            <p className="card-text">{insights.practice_question}</p>
          </div>
        )}
        {insights.strengths.length > 0 && (
          <div className="session-card">
            <h4 className="card-title">Strengths</h4>
            <ul className="side-list">
              {insights.strengths.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        )}
        {insights.improvements.length > 0 && (
          <div className="session-card">
            <h4 className="card-title">To improve</h4>
            <ul className="side-list">
              {insights.improvements.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

/* =====================================================
   APP
   ===================================================== */

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Roles
  const [roleCategories, setRoleCategories] = useState({});
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");

  // Interview setup
  const [interviewType, setInterviewType] = useState("technical");
  const [technicalRole, setTechnicalRole] = useState("Backend");
  const [customTechnicalRole, setCustomTechnicalRole] = useState("");
  const [customInterviewRole, setCustomInterviewRole] = useState("");
  const [interviewSetupMessage, setInterviewSetupMessage] = useState("");
  const [setupScreen, setSetupScreen] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);

  // Interview session
  const [sessionId, setSessionId] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState("");
  const [interviewLevel, setInterviewLevel] = useState("Fresher");
  const [numQuestions, setNumQuestions] = useState(5);
  const [nextLoading, setNextLoading] = useState(false);

  // Final report + coach
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [coachSessionId, setCoachSessionId] = useState(
    () => localStorage.getItem(LAST_REPORT_KEY) || ""
  );

  // Audio recording and feedback
  const [isRecording, setIsRecording] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [transcription, setTranscription] = useState("");
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingStartRef = useRef(0);

  /* ---------- interview start / next / report ---------- */

  const resetSessionState = () => {
    setInterviewLoading(true);
    setInterviewError("");
    setInterviewSetupMessage("");
    setCurrentQuestion(null);
    setSessionId("");
    setAudioError("");
    setTranscription("");
    setAnswerFeedback(null);
    setRecordingDuration(0);
    setReport(null);
    setReportError("");
    setQuestionNumber(1);
  };

  const beginSession = (data) => {
    setSessionId(data.session_id);
    setCurrentQuestion(data);
    setQuestionNumber(data.question_number || 1);
  };

  // Normal interview (technical / HR / custom)
  const startInterview = async (role) => {
    resetSessionState();

    try {
      const skills =
        interviewType === "hr"
          ? ["Communication", "Teamwork", "Behavioural questions"]
          : [role];

      const data = await api(`${API_BASE_URL}/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          skills,
          level: interviewLevel,
          mode: "mixed",
          job_description: "",
          num_questions: numQuestions,
        }),
      });

      beginSession(data);
    } catch (error) {
      setInterviewError(error.message || "Could not connect to the backend.");
    } finally {
      setInterviewLoading(false);
    }
  };

  // Resume interview: upload PDF, questions come from the resume
  const startResumeInterview = async () => {
    if (!resumeFile) {
      setInterviewSetupMessage("Please choose your resume PDF first.");
      return;
    }
    if (resumeFile.size > 5 * 1024 * 1024) {
      setInterviewSetupMessage("Resume is too large. Maximum size is 5 MB.");
      return;
    }

    resetSessionState();

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);
      formData.append("level", interviewLevel);
      formData.append("num_questions", String(numQuestions));

      const data = await api(`${API_BASE_URL}/resume/start-interview`, {
        method: "POST",
        body: formData,
      });

      beginSession(data);
    } catch (error) {
      setInterviewError(error.message || "Could not connect to the backend.");
    } finally {
      setInterviewLoading(false);
    }
  };

  // Next question (backend already sends it as answerFeedback.next)
  const goNextQuestion = async () => {
    if (!answerFeedback || answerFeedback.finished) return;

    setNextLoading(true);
    setAudioError("");

    try {
      let next = answerFeedback.next;

      if (!next) {
        // fallback if the backend could not make it during the answer
        next = await api(`${API_BASE_URL}/interview/${sessionId}/next`);
      }

      setCurrentQuestion((prev) => ({ ...prev, ...next }));
      setQuestionNumber(next.question_number);
      setTranscription("");
      setAnswerFeedback(null);
      setRecordingDuration(0);
    } catch (error) {
      setAudioError(error.message);
    } finally {
      setNextLoading(false);
    }
  };

  const loadFinalReport = async () => {
    setReportLoading(true);
    setReportError("");

    try {
      const data = await api(`${API_BASE_URL}/interview/${sessionId}/report`);
      setReport(data);
      setCoachSessionId(sessionId);
      localStorage.setItem(LAST_REPORT_KEY, sessionId);
    } catch (error) {
      setReportError(error.message);
    } finally {
      setReportLoading(false);
    }
  };

  const leaveInterview = () => {
    if (isRecording) stopRecording();

    setCurrentQuestion(null);
    setSessionId("");
    setInterviewError("");
    setAudioError("");
    setTranscription("");
    setAnswerFeedback(null);
    setRecordingDuration(0);
    setReport(null);
    setReportError("");
    setQuestionNumber(1);
    setSetupScreen(false);
  };

  /* ---------- audio ---------- */

  // Submit the recorded WAV answer to FastAPI
  const submitAudioAnswer = async (audioBlob, durationSeconds) => {
    if (!sessionId || !audioBlob) {
      setAudioError("Start an interview and record your answer first.");
      return;
    }

    if (
      audioBlob.type !== "audio/wav" &&
      audioBlob.type !== "audio/x-wav"
    ) {
      setAudioError("The recording must be converted to WAV first.");
      return;
    }

    setAudioLoading(true);
    setAudioError("");
    setTranscription("");
    setAnswerFeedback(null);

    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("file", audioBlob, "answer.wav");
      formData.append(
        "duration_seconds",
        String(Math.max(0, durationSeconds))
      );

      const data = await api(`${API_BASE_URL}/interview/answer-audio`, {
        method: "POST",
        body: formData,
      });

      setTranscription(data.transcription?.text || "");
      setAnswerFeedback(data);
    } catch (error) {
      setAudioError(error.message || "Unable to submit your audio answer.");
    } finally {
      setAudioLoading(false);
    }
  };

  // Start microphone recording
  const startRecording = async () => {
    try {
      setAudioError("");
      setTranscription("");
      setAnswerFeedback(null);
      setRecordingDuration(0);

      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      ) {
        throw new Error("Your browser does not support microphone recording.");
      }

      if (!sessionId || !currentQuestion) {
        throw new Error("Start an interview before recording.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      const mimeType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      let recorder;

      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch (error) {
        stream.getTracks().forEach((track) => track.stop());
        throw error;
      }

      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setAudioError("Microphone recording failed. Please try again.");
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const rawBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const duration = Math.round(
          (Date.now() - recordingStartRef.current) / 1000
        );

        setRecordingDuration(duration);

        if (!rawBlob.size) {
          setAudioError("No audio was recorded. Please try again.");
          return;
        }

        try {
          const wavBlob = await convertAudioToWav(rawBlob);
          await submitAudioAnswer(wavBlob, duration);
        } catch (error) {
          setAudioError(
            error.message ||
              "Could not process the recording. Please try again."
          );
        }
      };

      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setAudioError(
        error.message ||
          "Could not access the microphone. Check browser permissions."
      );
      setIsRecording(false);
    }
  };

  // Stop recording; upload starts when recording has stopped
  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      setIsRecording(false);
      recorder.stop();
    }
  };

  // Load roles from FastAPI
  useEffect(() => {
    if (!isAuthenticated || activePage !== "interview") return;

    let cancelled = false;

    async function fetchRoles() {
      setRolesLoading(true);
      setRolesError("");

      try {
        const response = await fetch(`${API_BASE_URL}/roles`);

        if (!response.ok) {
          throw new Error("Unable to load interview roles.");
        }

        const data = await response.json();

        if (!cancelled) {
          setRoleCategories(data);
        }
      } catch {
        if (!cancelled) {
          setRolesError(
            "Could not connect to the backend. Make sure FastAPI is running."
          );
        }
      } finally {
        if (!cancelled) {
          setRolesLoading(false);
        }
      }
    }

    fetchRoles();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, activePage]);

  // Release the microphone if the component unmounts
  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, []);

  const pageTitle =
    navItems.find((item) => item.id === activePage)?.label ||
    (activePage === "profile" ? "My Profile" : "Dashboard");

  function navigate(page) {
    setActivePage(page);
    window.location.hash = page;
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const typeTitles = {
    technical: "Technical Interview",
    hr: "HR Interview",
    custom: "Custom Interview",
    resume: "Resume Interview",
  };

  const typeHints = {
    technical: "Choose your technical role on the next screen.",
    hr: "Practise common HR and behavioural questions.",
    custom: "Enter any role or topic on the next screen.",
    resume: "Upload your resume PDF on the next screen.",
  };

  const setupHeadings = {
    technical: "Choose your technical role",
    hr: "HR interview",
    custom: "Define your custom interview",
    resume: "Upload your resume",
  };

  return (
    <div className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <aside className={`sidebar ${sidebarOpen ? "" : "sidebar-hidden"}`}>
        <button
          className="brand"
          onClick={() => navigate("dashboard")}
          aria-label="VoiceReady AI home"
        >
          <span className="brand-mark">
            V<span>.</span>
          </span>

          {sidebarOpen && (
            <span className="brand-name">
              VoiceReady
              <small>AI INTERVIEW STUDIO</small>
            </span>
          )}
        </button>

        {sidebarOpen && (
          <>
            <div className="workspace-switch">
              <div className="workspace-avatar">VK</div>
              <div className="workspace-copy">
                <strong>Vigneshkumar</strong>
                <span>Interview candidate</span>
              </div>
            </div>

            <p className="sidebar-label">NAVIGATION</p>
          </>
        )}

        <nav className="navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${
                activePage === item.id ? "selected" : ""
              }`}
              onClick={() => navigate(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}

              {sidebarOpen && item.id === "coach" && (
                <span className="new-label">AI</span>
              )}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="sidebar-bottom">
            <div className="upgrade-card">
              <div className="upgrade-icon">✦</div>
              <strong>Your next opportunity</strong>
              <p>Build confidence one answer at a time.</p>
              <button onClick={() => navigate("interview")}>
                Start practising <span>→</span>
              </button>
            </div>

            <button
              className="sidebar-profile"
              onClick={() => navigate("profile")}
            >
              <div className="profile-avatar">VK</div>
              <div className="profile-copy">
                <strong>My Profile</strong>
                <span>View profile settings</span>
              </div>
              <span className="profile-menu">→</span>
            </button>
          </div>
        )}
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
            >
              ☰
            </button>

            <div className="breadcrumb">
              Workspace <span>/</span> <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="connection-status">
              <span className="status-indicator"></span>
              Backend workspace
            </div>

            <button
              className="top-profile"
              onClick={() => navigate("profile")}
              title="My Profile"
            >
              VK
            </button>
          </div>
        </header>

        <div className="page-container">
          {/* DASHBOARD */}
          {activePage === "dashboard" && (
            <>
              <section className="welcome-header">
                <div>
                  <div className="eyebrow">
                    <span className="eyebrow-line"></span>
                    YOUR PERSONAL AI INTERVIEW COACH
                  </div>

                  <h1>
                    Prepare with purpose
                    <span className="heading-period">.</span>
                  </h1>

                  <p className="welcome-description">
                    Practise smarter, discover your weak areas, and walk into
                    your next interview with confidence.
                  </p>
                </div>

                <div className="date-chip">
                  <span>✦</span> Your preparation space
                </div>
              </section>

              <section className="hero-panel">
                <div className="hero-content">
                  <div className="hero-kicker">
                    <span className="sparkle">✦</span>
                    YOUR NEXT CHAPTER STARTS HERE
                  </div>

                  <h2>
                    Turn every answer
                    <br />
                    into <span>progress.</span>
                  </h2>

                  <p>
                    Simulate interviews, receive structured feedback, and work
                    on the areas that need improvement.
                  </p>

                  <div className="hero-actions">
                    <button
                      className="primary-button"
                      onClick={() => navigate("interview")}
                    >
                      Start a mock interview <span>↗</span>
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() => navigate("coach")}
                    >
                      Meet your AI coach
                    </button>
                  </div>

                  <div className="hero-footnote">
                    <span className="mini-check">✓</span>
                    Personalised practice based on your interview performance
                  </div>
                </div>

                <div className="hero-visual" aria-hidden="true">
                  <div className="visual-glow"></div>
                  <div className="visual-ring ring-outer"></div>
                  <div className="visual-ring ring-inner"></div>

                  <div className="visual-core">
                    <span className="core-symbol">V</span>
                    <span className="core-caption">VOICE READY</span>
                  </div>

                  <div className="visual-float float-top">
                    <span className="float-icon">✳</span>
                    <div>
                      <strong>AI Coach</strong>
                      <small>Ready to help</small>
                    </div>
                    <span className="float-dot"></span>
                  </div>

                  <div className="visual-float float-bottom">
                    <span className="float-wave">〰</span>
                    <div>
                      <strong>Keep improving</strong>
                      <small>One answer at a time</small>
                    </div>
                  </div>

                  <span className="visual-star star-one">✦</span>
                  <span className="visual-star star-two">✧</span>
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <h2>Your preparation hub</h2>
                    <p>Choose what you want to work on today.</p>
                  </div>
                  <span className="section-meta">4 TOOLS</span>
                </div>

                <div className="feature-grid">
                  <FeatureCard
                    icon="◉"
                    color="icon-violet"
                    number="01"
                    category="SIMULATE"
                    title="Mock Interview"
                    description="Practise role-specific questions and review your interview feedback."
                    action="Start an interview"
                    onClick={() => navigate("interview")}
                  />

                  <FeatureCard
                    icon="✳"
                    color="icon-cyan"
                    number="02"
                    category="IMPROVE"
                    title="AI Practice Coach"
                    description="Work on weak areas with interactive questions and useful feedback."
                    action="Practise with AI"
                    onClick={() => navigate("coach")}
                  />

                  <FeatureCard
                    icon="▥"
                    color="icon-green"
                    number="03"
                    category="UNDERSTAND"
                    title="Performance Reports"
                    description="Review interview scores, strengths, and areas to improve."
                    action="Explore reports"
                    onClick={() => navigate("history")}
                  />

                  <FeatureCard
                    icon="◷"
                    color="icon-orange"
                    number="04"
                    category="REVIEW"
                    title="Interview History"
                    description="Revisit previous sessions and track your learning progress."
                    action="View past sessions"
                    onClick={() => navigate("history")}
                  />
                </div>
              </section>

              <footer className="footer">
                <span>© VoiceReady AI</span>
                <span>Built to help you speak with confidence.</span>
              </footer>
            </>
          )}

          {/* MOCK INTERVIEW */}
          {activePage === "interview" && (
            <WorkspacePage
              icon="◉"
              eyebrow="YOUR INTERVIEW PRACTICE"
              title={
                report
                  ? "Final Report"
                  : currentQuestion
                    ? "Your Interview"
                    : setupScreen
                      ? "Interview Setup"
                      : "Mock Interview"
              }
              description={
                report
                  ? "See how you performed across the interview."
                  : currentQuestion
                    ? "Your AI-generated interview question is ready."
                    : setupScreen
                      ? "Review your interview choice before you begin."
                      : "Choose how you want to practise today."
              }
            >
              {report ? (
                <FinalReport
                  report={report}
                  onBack={() => setReport(null)}
                  onPractice={() => navigate("coach")}
                  onNewInterview={leaveInterview}
                />
              ) : currentQuestion ? (
                <InterviewSession
                  role={currentQuestion.role}
                  sessionId={sessionId}
                  question={currentQuestion}
                  questionNumber={questionNumber}
                  total={currentQuestion.total}
                  isRecording={isRecording}
                  audioLoading={audioLoading}
                  audioError={audioError}
                  transcription={transcription}
                  answerFeedback={answerFeedback}
                  nextLoading={nextLoading}
                  reportLoading={reportLoading}
                  reportError={reportError}
                  onStart={startRecording}
                  onStop={stopRecording}
                  onNext={goNextQuestion}
                  onFinalReport={loadFinalReport}
                  onBack={leaveInterview}
                />
              ) : !setupScreen ? (
                <>
                  <div className="interview-type-grid compact four">
                    {[
                      {
                        id: "technical",
                        icon: "⌘",
                        title: "Technical Interview",
                        description:
                          "Programming, engineering, and technical skills.",
                      },
                      {
                        id: "hr",
                        icon: "♧",
                        title: "HR Interview",
                        description:
                          "Self-introduction, teamwork, and behavioural questions.",
                      },
                      {
                        id: "custom",
                        icon: "✎",
                        title: "Custom Interview",
                        description:
                          "Enter your own job title or interview topic.",
                      },
                      {
                        id: "resume",
                        icon: "▤",
                        title: "Resume Interview",
                        description:
                          "Upload your PDF resume and get questions about your own projects and skills.",
                      },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`interview-type-card ${
                          interviewType === item.id ? "active" : ""
                        }`}
                        onClick={() => {
                          setInterviewType(item.id);
                          setInterviewSetupMessage("");
                          setInterviewError("");
                        }}
                      >
                        <span className="interview-type-icon">
                          {item.icon}
                        </span>
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                        <span className="interview-type-label">
                          {interviewType === item.id
                            ? "✓ Selected"
                            : "Select interview"}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="interview-selection-summary">
                    <span className="selection-check">✓</span>
                    <div>
                      <strong>Selected: {typeTitles[interviewType]}</strong>
                      <p>{typeHints[interviewType]}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setInterviewSetupMessage("");
                      setInterviewError("");
                      setSetupScreen(true);
                    }}
                  >
                    Continue <span>→</span>
                  </button>
                </>
              ) : (
                <div className="interview-setup-panel">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setSetupScreen(false);
                      setInterviewSetupMessage("");
                    }}
                  >
                    ← Back to interview types
                  </button>

                  <h2>{setupHeadings[interviewType]}</h2>

                  {interviewType === "technical" && (
                    <div className="interview-form-field">
                      <label htmlFor="technical-role">Technical role</label>
                      <select
                        id="technical-role"
                        value={technicalRole}
                        onChange={(event) => {
                          setTechnicalRole(event.target.value);
                          setInterviewSetupMessage("");
                        }}
                      >
                        <option value="Backend">Backend Developer</option>
                        <option value="Frontend">Frontend Developer</option>
                        <option value="Full Stack">Full Stack Developer</option>
                        <option value="Java Developer">Java Developer</option>
                        <option value="Python Developer">
                          Python Developer
                        </option>
                        <option value="DevOps">DevOps Engineer</option>
                        <option value="QA / Testing">QA / Testing</option>
                        <option value="Cyber Security">Cyber Security</option>
                        <option value="Data Science">Data Science</option>
                        <option value="AI / ML">AI / ML Engineer</option>
                        <option value="custom">Enter another role</option>
                      </select>

                      {technicalRole === "custom" && (
                        <input
                          value={customTechnicalRole}
                          onChange={(event) =>
                            setCustomTechnicalRole(event.target.value)
                          }
                          placeholder="e.g. Cloud Engineer"
                        />
                      )}
                    </div>
                  )}

                  {interviewType === "hr" && (
                    <p className="page-helper">
                      Your interview will focus on self-introduction,
                      strengths, teamwork, goals, and workplace situations.
                    </p>
                  )}

                  {interviewType === "custom" && (
                    <div className="interview-form-field">
                      <label htmlFor="custom-interview-role">
                        Job title or topic
                      </label>
                      <input
                        id="custom-interview-role"
                        value={customInterviewRole}
                        onChange={(event) =>
                          setCustomInterviewRole(event.target.value)
                        }
                        placeholder="e.g. Data Analyst or TNPSC"
                      />
                    </div>
                  )}

                  {interviewType === "resume" && (
                    <div className="interview-form-field">
                      <label htmlFor="resume-file">
                        Resume (PDF, max 5 MB)
                      </label>
                      <input
                        id="resume-file"
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) => {
                          setResumeFile(event.target.files?.[0] || null);
                          setInterviewSetupMessage("");
                        }}
                      />
                      {resumeFile && (
                        <p className="page-helper">
                          Selected: {resumeFile.name}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="interview-form-field">
                    <label htmlFor="interview-level">Experience level</label>
                    <select
                      id="interview-level"
                      value={interviewLevel}
                      onChange={(event) =>
                        setInterviewLevel(event.target.value)
                      }
                    >
                      <option value="Fresher">Fresher</option>
                      <option value="1-3 years">1–3 years</option>
                      <option value="3+ years">3+ years</option>
                    </select>
                  </div>

                  <div className="interview-form-field">
                    <label htmlFor="num-questions">Number of questions</label>
                    <select
                      id="num-questions"
                      value={numQuestions}
                      onChange={(event) =>
                        setNumQuestions(Number(event.target.value))
                      }
                    >
                      <option value={3}>3 questions</option>
                      <option value={5}>5 questions</option>
                      <option value={7}>7 questions</option>
                      <option value={10}>10 questions</option>
                    </select>
                  </div>

                  <div className="interview-selection-summary">
                    <span className="selection-check">✓</span>
                    <div>
                      <strong>Interview setup</strong>
                      <p>
                        {interviewType === "technical"
                          ? technicalRole === "custom"
                            ? customTechnicalRole || "Enter your technical role"
                            : technicalRole
                          : interviewType === "hr"
                            ? "HR Interview"
                            : interviewType === "resume"
                              ? resumeFile?.name || "Choose your resume PDF"
                              : customInterviewRole ||
                                "Enter your role or topic"}
                      </p>
                      <p>
                        {interviewLevel} · {numQuestions} questions
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    disabled={interviewLoading}
                    onClick={async () => {
                      if (interviewType === "resume") {
                        await startResumeInterview();
                        return;
                      }

                      const role =
                        interviewType === "technical"
                          ? technicalRole === "custom"
                            ? customTechnicalRole.trim()
                            : technicalRole === "Backend"
                              ? "Backend Developer"
                              : technicalRole === "Frontend"
                                ? "Frontend Developer"
                                : technicalRole === "Full Stack"
                                  ? "Full Stack Developer"
                                  : technicalRole
                          : interviewType === "hr"
                            ? "HR"
                            : customInterviewRole.trim();

                      if (!role) {
                        setInterviewSetupMessage(
                          "Please enter a role or topic before continuing."
                        );
                        return;
                      }

                      await startInterview(role);
                    }}
                  >
                    {interviewLoading
                      ? "Starting interview..."
                      : "Confirm interview"}
                    <span>→</span>
                  </button>

                  {interviewLoading && (
                    <p className="page-helper" role="status">
                      {interviewType === "resume"
                        ? "Reading your resume and generating questions..."
                        : "Connecting to VoiceReady AI and generating your first question..."}
                    </p>
                  )}

                  {interviewSetupMessage && (
                    <p className="page-helper" role="status">
                      {interviewSetupMessage}
                    </p>
                  )}

                  {interviewError && (
                    <p className="page-helper" role="alert">
                      {interviewError}
                    </p>
                  )}

                  {rolesLoading && (
                    <p className="page-helper">Loading available roles...</p>
                  )}

                  {rolesError && (
                    <p className="page-helper" role="alert">
                      {rolesError}
                    </p>
                  )}
                </div>
              )}
            </WorkspacePage>
          )}

          {/* AI PRACTICE COACH */}
          {activePage === "coach" && (
            <WorkspacePage
              icon="✳"
              eyebrow="YOUR PERSONAL LEARNING PARTNER"
              title="AI Practice Coach"
              description="Understand your weak areas, practise one concept at a time, and improve with clear feedback."
            >
              <ChatCoach
                key={coachSessionId}
                interviewSessionId={coachSessionId}
                onGoToInterview={() => navigate("interview")}
              />
            </WorkspacePage>
          )}

          {/* INTERVIEW HISTORY */}
          {activePage === "history" && (
            <WorkspacePage
              icon="◷"
              eyebrow="YOUR LEARNING JOURNEY"
              title="Interview History"
              description="Keep track of completed interviews, review feedback, and see how your preparation develops."
            >
              <div className="empty-state">
                <div className="empty-state-icon">▤</div>
                <h3>Your interview reports</h3>
                <p>
                  Completed interviews and their reports will appear here
                  after the history and report APIs are connected.
                </p>

                <button
                  className="primary-button"
                  onClick={() => navigate("interview")}
                >
                  Go to Mock Interview <span>→</span>
                </button>
              </div>
            </WorkspacePage>
          )}

          {/* PROFILE PREVIEW */}
          {activePage === "profile" && (
            <WorkspacePage
              icon="VK"
              eyebrow="YOUR ACCOUNT"
              title="My Profile"
              description="Manage the candidate details you use during interview practice."
            >
              <div className="profile-details">
                <div className="profile-avatar large-avatar">VK</div>

                <div>
                  <h3>Vigneshkumar</h3>
                  <p>Interview candidate</p>
                  <span className="option-note">
                    Local profile preview · No account authentication yet
                  </span>
                </div>
              </div>

              <p className="page-helper">
                This is a local profile display, not a registered or verified
                account. A profile system can be added separately later.
              </p>
            </WorkspacePage>
          )}
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  color,
  number,
  category,
  title,
  description,
  action,
  onClick,
}) {
  return (
    <article className="feature-card">
      <div className="feature-top">
        <div className={`feature-icon ${color}`}>{icon}</div>
        <span className="feature-arrow">↗</span>
      </div>

      <span className="feature-overline">
        {number} / {category}
      </span>

      <h3>{title}</h3>
      <p>{description}</p>

      <button className="feature-link" onClick={onClick}>
        {action} <span>→</span>
      </button>
    </article>
  );
}

function WorkspacePage({ icon, eyebrow, title, description, children }) {
  return (
    <section className="workspace-page">
      <div className="workspace-page-heading">
        <div className="workspace-page-icon">{icon}</div>

        <div>
          <div className="eyebrow">{eyebrow}</div>

          <h1>
            {title}
            <span className="heading-period">.</span>
          </h1>

          <p>{description}</p>
        </div>
      </div>

      <div className="workspace-page-content">{children}</div>
    </section>
  );
}

export default App;
