import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import {
  ChevronDown,
  Play,
  Send,
  ArrowLeft,
  XCircle,
  CheckCircle,
} from "lucide-react";

import Navbar from "../components/Navbar";
import PageBackground from "../components/PageBackground";
import api from "../api/axios";
import Timer from "../components/Timer";

import "./CodeEditor.css";

/* =========================================================
   BASE64 ENCODER
========================================================= */

function encodeBase64(str = "") {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

/* =========================================================
   LANGUAGE MAPPING
   Frontend display → Backend value
========================================================= */

function getBackendLanguage(language) {
  if (language === "C++") {
    return "cpp";
  }

  if (language === "Java") {
    return "java";
  }

  return "python";
}

function formatSubmissionDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/* =========================================================
   SSE SUBMISSION RESULT
========================================================= */

function subscribeToSubmission(
  submissionId,
  onResult,
  activeStreams,
  onError
) {
  if (!submissionId) {
    return;
  }

  if (activeStreams.has(submissionId)) {
    return;
  }

  const eventSource = new EventSource(
    `/api/submission/sse/${submissionId}`,
    {
      withCredentials: true,
    }
  );

  activeStreams.set(submissionId, eventSource);

  eventSource.addEventListener("result", (event) => {
    try {
      const data = JSON.parse(event.data);

      onResult(data);
    } catch (error) {
      console.error(
        "Error parsing submission result:",
        error
      );

      onError?.(
        new Error("Unable to read submission result.")
      );
    } finally {
      activeStreams.delete(submissionId);
      eventSource.close();
    }
  });

  eventSource.onerror = (error) => {
    console.error("SSE connection error:", error);

    activeStreams.delete(submissionId);
    eventSource.close();

    onError?.(
      new Error(
        "Connection to submission server failed."
      )
    );
  };
}

/* =========================================================
   CODE EDITOR
========================================================= */

function CodeEditor() {
  const navigate = useNavigate();
  const location = useLocation();

  /* =======================================================
     QUESTION ID

     QuestionHub sends either:
     state: {
       problem_id
     }

     or:
     state: {
       questionId
     }
  ======================================================= */

  const questionId =
    location.state?.problem_id ??
    location.state?.questionId;

  /* =======================================================
     STATE
  ======================================================= */

  const [code, setCode] = useState("");

  const [language, setLanguage] =
    useState("Python");

  const [activeTab, setActiveTab] =
    useState("Description");

  /* Question from backend */

  const [question, setQuestion] =
    useState(null);

  const [questionLoading, setQuestionLoading] =
    useState(true);

  /* Run */

  const [showResults, setShowResults] =
    useState(false);

  const [testsPassed, setTestsPassed] =
    useState(false);

  const [output, setOutput] =
    useState("");

  const [runMessage, setRunMessage] =
    useState("");

  const [isRunning, setIsRunning] =
    useState(false);

  const [isMachineRunning, setIsMachineRunning] =
    useState(false);

  const [customInput, setCustomInput] = useState("");

  /* Submit */

  const [submitResult, setSubmitResult] =
    useState(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  /* Submissions */

  const [submissions, setSubmissions] =
    useState([]);


  const [machineInput, setMachineInput] = useState("");
  const [machineOutput, setMachineOutput] = useState("");
  const [lastInput, setLastInput] = useState("");
  /* SSE connections */

  const activeStreamsRef =
    useRef(new Map());
  const editorRef = useRef(null);
  const monacoCleanupRef = useRef(null);  
  /* =======================================================
     DEFAULT CODE
  ======================================================= */

  const defaultCode = {
    Python: `print("Hello, World!")`,

    Java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,

    "C++": `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  };

  /* =======================================================
   MONACO EDITOR THEME
======================================================= */

const handleEditorBeforeMount = (monaco) => {
  monaco.editor.defineTheme("ctd-rc-theme", {
    base: "vs-dark",
    inherit: true,

    rules: [
      {
        token: "keyword",
        foreground: "C792EA",
        fontStyle: "bold",
      },
      {
        token: "keyword.control",
        foreground: "C792EA",
        fontStyle: "bold",
      },
      {
        token: "string",
        foreground: "C3E88D",
      },
      {
        token: "string.escape",
        foreground: "FFCB6B",
      },
      {
        token: "number",
        foreground: "F78C6C",
      },
      {
        token: "number.hex",
        foreground: "F78C6C",
      },
      {
        token: "comment",
        foreground: "6A9955",
        fontStyle: "italic",
      },
      {
        token: "predefined",
        foreground: "82AAFF",
      },
      {
        token: "type",
        foreground: "4EC9B0",
      },
      {
        token: "type.identifier",
        foreground: "4EC9B0",
      },
      {
        token: "function",
        foreground: "82AAFF",
      },
      {
        token: "identifier",
        foreground: "D6F5E8",
      },
      {
        token: "variable",
        foreground: "D6F5E8",
      },
      {
        token: "operator",
        foreground: "89DDFF",
      },
      {
        token: "delimiter",
        foreground: "B8D8CC",
      },
    ],

    colors: {
      "editor.background": "#031E1B",
      "editor.foreground": "#D6F5E8",
      "editorLineNumber.foreground": "#587C70",
      "editorLineNumber.activeForeground": "#8FF1C8",
      "editorCursor.foreground": "#8FF1C8",
      "editor.selectionBackground": "#1D5A4A",
      "editor.lineHighlightBackground": "#062823",
      "editorGutter.background": "#041D1B",
      "editorIndentGuide.background": "#103A32",
      "editorIndentGuide.activeBackground": "#1B5B4D",
    },
  });
};

const handleEditorMount = (editor, monaco) => {
  editorRef.current = editor;

  monaco.editor.setTheme("ctd-rc-theme");

  const domNode = editor.getDomNode();

  if (!domNode) {
    return;
  }

  const blockClipboard = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const blockClipboardShortcut = (event) => {
    const key = event.key.toLowerCase();
    const hasCommandModifier = event.ctrlKey || event.metaKey;
    const isClipboardShortcut =
      (hasCommandModifier && ["c", "x", "v"].includes(key)) ||
      (event.ctrlKey && key === "insert") ||
      (event.shiftKey && key === "insert") ||
      (event.shiftKey && key === "delete");

    if (isClipboardShortcut) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const clipboardEvents = ["copy", "cut", "paste", "drop"];

  clipboardEvents.forEach((eventName) => {
    domNode.addEventListener(eventName, blockClipboard, true);
  });
  domNode.addEventListener("keydown", blockClipboardShortcut, true);

  monacoCleanupRef.current = () => {
    clipboardEvents.forEach((eventName) => {
      domNode.removeEventListener(eventName, blockClipboard, true);
    });
    domNode.removeEventListener("keydown", blockClipboardShortcut, true);
  };
};

  /* =======================================================
     CLEANUP SSE CONNECTIONS
  ======================================================= */

useEffect(() => {
  const activeStreams =
    activeStreamsRef.current;

  return () => {
    activeStreams.forEach(
      (eventSource) => {
        eventSource.close();
      }
    );

    activeStreams.clear();

    if (monacoCleanupRef.current) {
      monacoCleanupRef.current();
    }
  };
}, []);

  /* =======================================================
   FETCH QUESTION
======================================================= */

useEffect(() => {
  const fetchQuestion = async () => {
    setQuestionLoading(true);

    try {
      const response = await api.get(
        `/problems/${questionId}`
      );

      setQuestion(response.data);
    } catch (error) {
      console.error(
        "Error fetching question:",
        error
      );

      if (
        error?.response?.status === 403
      ) {
        navigate("/results", {
          replace: true,
        });

        return;
      }

      setRunMessage(
        error?.response?.data?.message ||
          "Unable to load question."
      );
    } finally {
      setQuestionLoading(false);
    }
  };

  fetchQuestion();
}, [questionId, navigate]);

  /* =======================================================
     LOAD DEFAULT / SAVED CODE
  ======================================================= */

  useEffect(() => {
    if (!question?.id) {
      return;
    }

    const savedCode =
      localStorage.getItem(
        `code_q${question.id}_${language}`
      );

    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(
        defaultCode[language] ||
          defaultCode.Python
      );
    }
  }, [question, language]);

  /* =======================================================
     AUTO SAVE CODE
  ======================================================= */

  useEffect(() => {
    if (!question?.id) {
      return;
    }

    const timer = setTimeout(() => {
      localStorage.setItem(
        `code_q${question.id}_${language}`,
        code
      );
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [code, question, language]);

  /* =======================================================
     FETCH SUBMISSION HISTORY
  ======================================================= */

  const fetchSubmissions = async () => {
    try {
      const response =
        await api.get(
          "/user/gethistory"
        );

      const currentProblemId =
        question?.id || questionId;

      const filteredData =
        Array.isArray(response.data)
          ? response.data.filter(
              (submission) =>
                String(
                  submission.problem_id
                ) ===
                String(
                  currentProblemId
                )
            )
          : [];

      setSubmissions(filteredData);
    } catch (error) {
      console.error(
        "Error fetching submissions:",
        error
      );
    }
  };

  /* =======================================================
     LANGUAGE CHANGE
  ======================================================= */

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);

    setShowResults(false);
    setOutput("");
    setRunMessage("");
    setSubmitResult(null);
    setTestsPassed(false);
  };

  /* =======================================================
     RUN CODE
========================================================= */

  const handleRun = async () => {
    if (!code.trim()) {
      setShowResults(true);
      setTestsPassed(false);

      setRunMessage(
        "Please write your code first."
      );

      return;
    }

    setIsRunning(true);
    setShowResults(true);

    setOutput("");

    setRunMessage(
      "Running your code..."
    );

    setTestsPassed(false);
    setSubmitResult(null);

    const firstSample =
      question?.samples?.[0];

    const sampleInput =
      question?.sampleInput ??
      firstSample?.input ??
      "";

    const testcase =
      customInput.trim() !== ""
        ? customInput
        : sampleInput;

    const payload = {
      code: encodeBase64(code),

      customTestcase:
        encodeBase64(testcase),

      language:
        getBackendLanguage(language),

      problem_id:
        question?.id || questionId,

      event_id: 2,
    };

    try {
      const response =
        await api.post(
          "/submission/run",
          payload
        );

      const submissionId =
        response.data?.submission_id;

      if (!submissionId) {
        setOutput(
          "Error: Backend did not return a submission ID."
        );

        setRunMessage("");

        setIsRunning(false);

        return;
      }

      subscribeToSubmission(
        submissionId,

        (data) => {
          if (data.user_output) {
            setOutput(
              data.user_output
            );
          } else {
            setOutput(
              `${data.status || ""}${
                data.message
                  ? ` : ${data.message}`
                  : ""
              }`
            );
          }

          const accepted =
            String(
              data.status || ""
            ).toLowerCase() ===
            "accepted";

          if (accepted) {
            setTestsPassed(true);

            setRunMessage(
              "Execution completed successfully."
            );
          } else {
            setTestsPassed(false);

            setRunMessage(
              data.message ||
                "Execution completed."
            );
          }

          setIsRunning(false);
        },

        activeStreamsRef.current,

        (error) => {
          setIsRunning(false);
          setTestsPassed(false);

          setRunMessage(
            error.message ||
              "Unable to receive execution result."
          );

          setOutput(
            "Unable to receive execution result from the backend."
          );
        }
      );
    } catch (error) {
      console.error(
        "Run error:",
        error
      );

      if (
        error?.response?.status === 403
      ) {
        navigate("/results");
        return;
      }

      setOutput(
        "Error: " +
          (
            error?.response?.data
              ?.message ||
            error?.message ||
            "Unable to run code."
          )
      );

      setRunMessage("");

      setIsRunning(false);
    }
  };

  /* =======================================================
     MACHINE RUN
========================================================= */

  const handleMachineRun = async () => {
  /* =========================================
     VALIDATION
  ========================================= */

  if (!code.trim()) {
    setMachineOutput(
      "Please write your code first."
    );
    return;
  }

  if (!machineInput.trim()) {
    setMachineOutput(
      "Please enter input first."
    );
    return;
  }


  /* =========================================
     START MACHINE RUN
  ========================================= */

  setIsMachineRunning(true);

  setMachineOutput("");

  setLastInput(machineInput);


  /* =========================================
     PAYLOAD
  ========================================= */

  const payload = {
    customTestcase:
      encodeBase64(machineInput),

    problem_id:
      question?.id || questionId,

    event_id: 2,
  };


  try {

    const response =
      await api.post(
        "/submission/run-system",
        payload
      );


    const submissionId =
      response.data?.submission_id;


    /* =========================================
       SSE RESULT
    ========================================= */

    if (submissionId) {

      subscribeToSubmission(
        submissionId,

        (data) => {

          const result =
            data.user_output ??
            data.output ??
            data.message ??
            data.status ??
            "No output";


          setMachineOutput(
            String(result)
          );


          setIsMachineRunning(false);
        },

        activeStreamsRef.current,

        (error) => {

          console.error(
            "Machine run SSE error:",
            error
          );


          setMachineOutput(
            "Unable to receive machine test result."
          );


          setIsMachineRunning(false);
        }
      );

      return;
    }


    /* =========================================
       DIRECT RESPONSE FALLBACK
    ========================================= */

    const directOutput =
      response.data?.user_output ??
      response.data?.output ??
      response.data?.message ??
      "Machine test completed.";


    setMachineOutput(
      String(directOutput)
    );


    setIsMachineRunning(false);

  } catch (error) {

    console.error(
      "Machine run error:",
      error
    );


    if (
      error?.response?.status === 403
    ) {
      setIsMachineRunning(false);

      navigate("/results", {
        replace: true,
      });

      return;
    }


    setMachineOutput(
      "Error: " +
        (
          error?.response?.data
            ?.message ||
          error?.message ||
          "Unable to run machine test."
        )
    );


    setIsMachineRunning(false);
  }
};
  /* =======================================================
     SUBMIT CODE
  ======================================================= */

  const handleSubmit = async () => {
    if (!code.trim()) {
      setShowResults(true);
      setTestsPassed(false);

      setRunMessage(
        "Please write your code before submitting."
      );

      return;
    }

    setIsSubmitting(true);
    setShowResults(true);

    setOutput("");

    setRunMessage(
      "Submitting your solution..."
    );

    setTestsPassed(false);
    setSubmitResult(null);

    const payload = {
      code: encodeBase64(code),

      language:
        getBackendLanguage(language),

      problem_id:
        question?.id || questionId,

      event_id: 2,
    };

    try {
      const response =
        await api.post(
          "/submission/submit",
          payload
        );

      const submissionId =
        response.data?.submission_id;

      if (!submissionId) {
        setRunMessage(
          "Backend did not return a submission ID."
        );

        setIsSubmitting(false);

        return;
      }

      subscribeToSubmission(
        submissionId,

        (data) => {
          const parsedData = {
            status:
              data.status ||
              "unknown",

            message:
              data.message ||
              "",

            failed_test_case:
              parseInt(
                data.failed_test_case ??
                  "0",
                10
              ),

            total_test_case:
              parseInt(
                data.total_test_case ??
                  "0",
                10
              ),

            score:
              parseInt(
                data.score ??
                  "0",
                10
              ),
          };

          setSubmitResult(
            parsedData
          );

          const accepted =
            String(
              parsedData.status
            ).toLowerCase() ===
            "accepted";

          setTestsPassed(
            accepted
          );

          setOutput(
            parsedData.message ||
              (
                accepted
                  ? "Solution accepted."
                  : "Solution evaluated."
              )
          );

          setRunMessage(
            accepted
              ? "Submission accepted."
              : "Submission completed."
          );

          /* Mark question solved */

          if (
            accepted &&
            !localStorage.getItem(
              `solved_${questionId}`
            )
          ) {
            localStorage.setItem(
              `solved_${questionId}`,
              "solved"
            );
          }

          setIsSubmitting(false);

          /* Refresh submission history */

          fetchSubmissions();
        },

        activeStreamsRef.current,

        (error) => {
          setIsSubmitting(false);
          setTestsPassed(false);

          setRunMessage(
            error.message ||
              "Unable to receive submission result."
          );

          setOutput(
            "Unable to receive submission result from the backend."
          );
        }
      );
    } catch (error) {
      console.error(
        "Submit error:",
        error
      );

      if (
        error?.response?.status === 403
      ) {
        navigate("/results");
        return;
      }

      setRunMessage(
        error?.response?.data
          ?.message ||
          error?.message ||
          "Something went wrong while submitting."
      );

      setIsSubmitting(false);
    }
  };

  /* =======================================================
     BACK TO QUESTIONS
  ======================================================= */

  const handleBack = () => {
    navigate("/question-hub");
  };

  /* =======================================================
     QUESTION DATA HELPERS
  ======================================================= */

  const samples =
    question?.samples ||
    question?.sampleCases ||
    [];

  // const firstSample =
  //   samples[0] || {};


  /* =======================================================
     DESCRIPTION
  ======================================================= */

  const renderDescription = () => (
    <>
      <div className="problem-section">
        <h3 className="problem-format-heading">
          Description
        </h3>

        <p className="problem-format-text">
          {question?.description ||
            "No description available."}
        </p>
      </div>

      <div className="problem-section">
        <h3 className="problem-format-heading">
          Input Format
        </h3>

        <p className="problem-format-text">
          {question?.input_format ||
            "No input format available."}
        </p>
      </div>

      <div className="problem-section">
        <h3 className="problem-format-heading">
          Output Format
        </h3>

        <p className="problem-format-text">
          {question?.output_format ||
            "No output format available."}
        </p>
      </div>

      <div className="problem-section">
        <h3 className="problem-format-heading">
          Constraints
        </h3>

        <p className="problem-format-text">
          {question?.constraints ||
            "No constraints available."}
        </p>
      </div>
    </>
  );

  /* =======================================================
     SAMPLE CASES
  ======================================================= */

  const renderSampleCases = () => (
    <div className="sample-cases-panel">
      <div className="sample-cases-heading">
        <h3>
          Sample Cases
        </h3>

        <span>
          {samples.length} examples
        </span>
      </div>

      {samples.length === 0 ? (
        <div className="empty-submissions">
          <p>
            No sample cases available.
          </p>
        </div>
      ) : (
        samples.map(
          (sample, index) => (
            <div
              className="sample-case-card"
              key={index}
            >
              <div className="sample-case-title">
                Sample Case {index + 1}
              </div>

              <div className="sample-case-grid">
                <div>
                  <label>
                    Input
                  </label>

                  <pre>
                    {sample.input ??
                      sample.Input ??
                      ""}
                  </pre>
                </div>

                <div>
                  <label>
                    Expected Output
                  </label>

                  <pre>
                    {sample.output ??
                      sample.Output ??
                      ""}
                  </pre>
                </div>
              </div>
            </div>
          )
        )
      )}
    </div>
  );

  /* =======================================================
     SUBMISSIONS
  ======================================================= */

  const renderSubmissions = () => (
    <div className="submissions-panel">
      <div className="submissions-heading">
        <h3>
          Your Submissions
        </h3>

        <span>
          {submissions.length} submission
          {submissions.length === 1
            ? ""
            : "s"}
        </span>
      </div>

      {submissions.length === 0 ? (
        <div className="empty-submissions">
          <p>
            No submissions yet.
          </p>

          <span>
            Submit your solution and your
            submissions will appear here.
          </span>
        </div>
      ) : (
        <div className="submission-list">
          {submissions.map(
            (submission, index) => {
              const status =
                submission.status ||
                submission.result ||
                "Pending";

              const accepted =
                String(status).toLowerCase() ===
                "accepted";

              return (
                <div
                  className="submission-item"
                  key={
                    submission.id ||
                    submission.submission_id ||
                    index
                  }
                >
                  <div>
                    <strong>
                      {submission.language ||
                        language}
                    </strong>

                    <span>
                      {formatSubmissionDate(
                        submission.created_at ||
                          submission.submitted_at
                      )}
                    </span>
                  </div>

                  <div className="submission-result">
                    <span
                      className={
                        accepted
                          ? "accepted"
                          : "pending"
                      }
                    >
                      {status}
                    </span>

                    <span>
                      {submission.score ??
                        "--"}
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );

  /* =======================================================
     LOADING QUESTION
  ======================================================= */

  if (questionLoading) {
    return (
      <PageBackground className="code-page">
        <Navbar />

        <main className="code-main">
          <div
            style={{
              padding: "40px",
              textAlign: "center",
            }}
          >
            Loading question...
          </div>
        </main>
      </PageBackground>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <PageBackground className="code-page">
      <Navbar />    
      <main className="code-main">
      <div className="code-top-row">

        {/* BACK */}

        <button
          className="back-question"
          onClick={handleBack}
        >
          <ArrowLeft size={16} />

          Back to Questions
        </button>
        <Timer />
        </div>
        {/* =================================================
            TOP BAR
        ================================================== */}

        <div className="editor-topbar">

          <div className="editor-tabs">

            <button
              className={
                activeTab === "Description"
                  ? "editor-tab active"
                  : "editor-tab"
              }
              onClick={() =>
                setActiveTab(
                  "Description"
                )
              }
            >
              Description
            </button>

            <button
              className={
                activeTab === "Sample Case"
                  ? "editor-tab active"
                  : "editor-tab"
              }
              onClick={() =>
                setActiveTab(
                  "Sample Case"
                )
              }
            >
              Sample Case
            </button>

            <button
              className={
                activeTab === "Submissions"
                  ? "editor-tab active"
                  : "editor-tab"
              }
              onClick={() => {
                setActiveTab(
                  "Submissions"
                );

                fetchSubmissions();
              }}
            >
              Submissions
            </button>

          </div>

          {/* LANGUAGE */}

          <div className="language-wrapper">

            <select
              value={language}
              onChange={
                handleLanguageChange
              }
              className="language-selector"
            >
              <option value="Python">
                Python
              </option>

              <option value="Java">
                Java
              </option>

              <option value="C++">
                C++
              </option>
            </select>

            <ChevronDown
              className="language-chevron"
              size={15}
            />

          </div>

        </div>

        {/* =================================================
            MAIN CONTENT
        ================================================== */}

        <div className="editor-layout">

          {/* =================================================
              LEFT PANEL
          ================================================== */}

          <section className="problem-panel">

            <div className="problem-header">
              <h1>
                {question?.title ||
                  "Question"}
              </h1>

              <p className="problem-points">
                Points:{" "}
                {question?.points ?? 0}
              </p>
            </div>

            {/* DESCRIPTION */}

            {activeTab ===
              "Description" &&
              renderDescription()}

            {/* SAMPLE CASE */}

            {activeTab ===
              "Sample Case" &&
              renderSampleCases()}

            {/* SUBMISSIONS */}

            {activeTab ===
              "Submissions" &&
              renderSubmissions()}

            {/* =================================================
                TEST CASE
            ================================================== */}

            {/* =================================================
    MACHINE RUN
================================================= */}

{activeTab === "Description" && (
  <div className="mt-2 rounded-lg border border-emerald-400/30 bg-[rgba(3,30,27,0.9)] p-3 shadow-[inset_0_1px_0_rgba(170,255,225,0.03)]">

    <div className="mb-3 border-b border-emerald-400/20 pb-2 text-sm font-extrabold text-[#8ff1c8]">
      Machine Run
    </div>


    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

      {/* =========================================
          CUSTOM INPUT
      ========================================= */}

      <div>

        <label htmlFor="machine-input" className="mb-1.5 block text-[11px] font-bold text-[#a9cfc0]">
          Input
        </label>

        <textarea
          id="machine-input"
          className="w-full h-[120px] resize-none rounded-md border border-emerald-400/30 bg-[#072521] p-2.5 font-mono text-xs leading-relaxed text-[#dcf8eb] placeholder:text-emerald-100/40 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/20"
          rows={6}
          value={machineInput}
          onChange={(e) =>
            setMachineInput(e.target.value)
          }
          placeholder="Enter input here"
          spellCheck="false"
        />

      </div>


      {/* =========================================
          MACHINE OUTPUT
      ========================================= */}

      <div>

        <label htmlFor="machine-output" className="mb-1.5 block text-[11px] font-bold text-[#a9cfc0]">
          Output
        </label>

        <textarea
          id="machine-output"
          className="w-full h-[120px] resize-none rounded-md border border-emerald-400/30 bg-[#072521] p-2.5 font-mono text-xs leading-relaxed text-[#dcf8eb] placeholder:text-emerald-100/40 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/20 read-only:cursor-default"
          rows={6}
          value={machineOutput || ""}
          readOnly
          placeholder="Output will appear here..."
          spellCheck="false"
        />

      </div>

    </div>


    {/* =========================================
        MACHINE RUN BUTTON
    ========================================= */}

    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">

      <button
        type="button"
        className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-emerald-300/70 bg-[#55e2ad] px-5 text-xs font-extrabold text-[#03251d] shadow-[0_0_14px_rgba(85,226,173,0.16)] transition hover:bg-[#78ecc0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#031e1b] disabled:cursor-not-allowed disabled:border-emerald-300/20 disabled:bg-[#3b5d54]/50 disabled:text-[#8daaa0] disabled:shadow-none sm:w-auto"
        onClick={handleMachineRun}
        disabled={
          isRunning ||
          isMachineRunning ||
          isSubmitting ||
          machineInput.trim() === "" ||
          lastInput === machineInput
        }
      >
        {isMachineRunning
          ? "Machine Running..."
          : "Machine Run"}
      </button>


    </div>

  </div>
)}

          </section>

          {/* =================================================
              RIGHT CODE PANEL
          ================================================== */}

          <section className="editor-panel">

            {/* CODE EDITOR */}

            <div className="editor-container monaco-editor-container">
          <Editor
            height="100%"
            width="100%"
            language={
              language === "Python"
                ? "python"
                : language === "Java"
                ? "java"
                : "cpp"
            }
            value={code}
            onChange={(value) => {
              setCode(value ?? "");
            }}
            beforeMount={handleEditorBeforeMount}
            onMount={handleEditorMount}
            theme="ctd-rc-theme"
            options={{
              automaticLayout: true,

              fontFamily:
                '"Consolas", "Courier New", monospace',

              fontSize: 17,
              lineHeight: 28,

              fontLigatures: true,

              minimap: {
                enabled: false,
              },

              lineNumbers: "on",

              glyphMargin: false,

              folding: false,

              lineDecorationsWidth: 8,

              lineNumbersMinChars: 3,

              scrollBeyondLastLine: false,

              wordWrap: "off",

              renderWhitespace: "selection",

              roundedSelection: false,

              cursorBlinking: "smooth",

              smoothScrolling: true,

              padding: {
                top: 18,
                bottom: 18,
              },

              contextmenu: false,

              suggestOnTriggerCharacters: true,

              tabSize: 4,

              insertSpaces: true,
            }}
          />
          </div>

            {/* =================================================
                OUTPUT / TEST RESULT
            ================================================== */}

            <div className="test-results-panel">

              <div className="test-result-header">

                <div className="result-status">

  {/* =========================================
      STATUS ICON
  ========================================= */}

  {showResults && submitResult && !testsPassed && (
    <XCircle size={15} />
  )}

  {showResults && submitResult && testsPassed && (
    <CheckCircle size={15}
    className="status-success" />
  )}

  <span>
    Status:{" "}

    <strong
      className={
        submitResult
          ? testsPassed
            ? "status-success"
            : "status-error"
          : showResults
          ? "status-success"
          : "status-error"
      }
    >
      {submitResult
        ? testsPassed
          ? "accepted"
          : "wrong"
        : showResults
        ? "executed"
        : "not run"}
    </strong>
  </span>

  {/* =========================================
      SCORE
  ========================================= */}

  <span>
    Score:{" "}

    <strong>
      {submitResult
        ? submitResult.score ?? 0
        : 0}
    </strong>
  </span>

</div>

                <button
                  className="close-results"
                  onClick={() =>
                    setShowResults(false)
                  }
                >
                  Close
                </button>

              </div>
              

              {/* =================================================
                  CUSTOM INPUT / OUTPUT
              ================================================= */}

              <div className="custom-io-panel">

                {/* CUSTOM INPUT */}

                <div className="custom-io-box">

                  <div className="custom-io-label">
                    Custom Input
                  </div>

                  <textarea
                    className="custom-input"
                    value={customInput}
                    onChange={(e) =>
                      setCustomInput(e.target.value)
                    }
                    placeholder="Enter your input..."
                    spellCheck="false"
                  />

                </div>


                {/* OUTPUT */}

                <div className="custom-io-box">

                  <div className="custom-io-label">
                    Output
                  </div>

                  <pre className="custom-output">
                    {output ||
                      runMessage ||
                      "Output will appear here..."}
                  </pre>

                </div>

              </div>


              {/* CURRENT OUTPUT */}

              {showResults && (
                <div className="output-area">

                  {/* <div className="output-heading">
                    Current Output
                  </div>

                  <pre>
                    {output ||
                      "No output"}
                  </pre>

                  {runMessage && (
                    <div className="run-message">
                      {runMessage}
                    </div>
                  )} */}

                  {/* SUBMISSION TEST CASES */}

                  {submitResult ? (
                    <>
                      <div className="test-result">

                        <span>
                          Test Cases
                        </span>

                        <span>
                          {submitResult.failed_test_case ===
                          0
                            ? `${
                                submitResult.total_test_case
                              }/${submitResult.total_test_case} PASSED`
                            : `${
                                Math.max(
                                  submitResult.failed_test_case -
                                    1,
                                  0
                                )
                              }/${submitResult.total_test_case} PASSED`}
                        </span>

                      </div>

                      {Array.from({
                        length:
                          submitResult.total_test_case ||
                          0,
                      }).map(
                        (_, index) => {

                          let status =
                            "Not Run";

                          let statusClass =
                            "";

                          if (
                            submitResult.failed_test_case ===
                              0 ||
                            index + 1 <
                              submitResult.failed_test_case
                          ) {
                            status =
                              "PASSED";

                            statusClass =
                              "passed";
                          } else if (
                            index + 1 ===
                            submitResult.failed_test_case
                          ) {
                            status =
                              "FAILED";

                            statusClass =
                              "failed";
                          }

                          return (
                            <div
                              className={`test-result ${statusClass}`}
                              key={index}
                            >
                              <span>
                                Test Case{" "}
                                {index + 1}
                              </span>

                              <span>
                                {status}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </>
                  ) : (
                    <>
                      {/* <div className="test-result">

                        <span>
                          Test Case 1
                        </span>

                        <span>
                          {testsPassed
                            ? "PASSED"
                            : "FAILED"}
                        </span>

                      </div>

                      <div className="test-result">

                        <span>
                          Test Case 2
                        </span>

                        <span>
                          Not Run
                        </span>

                      </div> */}
                    </>
                  )}

                </div>
              )}

            </div>

            {/* =================================================
                ACTION BUTTONS
            ================================================== */}

            <div className="editor-actions">

              <button
                className="run-code-button"
                onClick={handleRun}
                disabled={
                  isRunning ||
                  isMachineRunning ||
                  isSubmitting
                }
              >
                <Play
                  size={15}
                  fill="currentColor"
                />

                {isRunning
                  ? "Running..."
                  : "Run"}
              </button>

              <button
                className="submit-code-button"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  isRunning ||
                  isMachineRunning
                }
              >
                <Send size={15} />

                {isSubmitting
                  ? "Submitting..."
                  : "Submit"}
              </button>

            </div>

          </section>

        </div>

      </main>
    </PageBackground>
  );
}

export default CodeEditor;