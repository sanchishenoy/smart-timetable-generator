import React, { useState } from "react";
import { api } from "../api";

const STEPS = [
  { icon: "🔵", title: "Graph Construction",   desc: "Building conflict graph — nodes=sessions, edges=conflicts" },
  { icon: "🎨", title: "Graph Coloring",        desc: "Assigning time-slot colors to non-adjacent nodes"        },
  { icon: "⬅️", title: "Backtracking (CSP)",    desc: "Resolving infeasible assignments, retrying alternatives"  },
  { icon: "⚡", title: "Greedy Optimization",   desc: "MRV heuristic: fewest-remaining-values node first"       },
  { icon: "✅", title: "Complete",              desc: "Conflict-free timetable ready"                           },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default function GeneratePage({
  subjects = [], teachers = [], classes = [], rooms = [], constraints = [],
  setTimetableData, setPage, showToast,
}) {
  const [generating, setGenerating] = useState(false);
  const [step,       setStep]       = useState(-1);
  const [progress,   setProgress]   = useState(0);
  const [errors,     setErrors]     = useState([]);

  const handleGenerate = async () => {
    setGenerating(true);
    setErrors([]);

    // Animate through steps while calling backend
    for (let i = 0; i < 4; i++) {
      setStep(i);
      setProgress((i + 1) * 20);
      await sleep(600);
    }

    try {
      const result = await api.generate({ subjects, teachers, classes, rooms, constraints });
      setProgress(100);
      setStep(4);
      setTimetableData(result);
      showToast("Timetable generated! 🎉");
      await sleep(800);
      setPage("timetable");
    } catch (err) {
      // Reset the pipeline animation
      setStep(-1);
      setProgress(0);

      const data = err?.response?.data;
      if (data?.reasons) {
        // Validation / scheduling failure — show exactly why
        setErrors(data.reasons);
        showToast(data.error || "Generation failed ❌");
      } else {
        showToast("Backend error — is Flask running on :5000?");
        console.error(err);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* Failure reasons — why generation was rejected */}
      {errors.length > 0 && (
        <div
          className="card"
          style={{ borderLeft: "4px solid #ff7070", background: "rgba(255,112,112,0.06)" }}
        >
          <div className="card-header">
            <span className="card-title" style={{ color: "#ff7070" }}>
              ❌ Generation failed — fix these issues
            </span>
            <span className="badge badge-red">{errors.length}</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors.map((msg, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--color-text-primary)", marginBottom: 4 }}>
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pre-flight checklist */}
      <div className="card">
        <div className="card-header"><span className="card-title">Pre-flight check</span></div>
        <div className="grid-2">
          {[
            { label: "Subjects defined",         ok: subjects.length > 0       },
            { label: "Teachers assigned",         ok: teachers.length > 0       },
            { label: "Classes configured",        ok: classes.length > 0        },
            { label: "Rooms available",           ok: rooms.length > 0          },
            { label: "Teachers have subjects",    ok: teachers.some(t => t.subjects?.length > 0) },
            { label: "Lab rooms present",         ok: rooms.some(r => r.isLab)  },
          ].map((item, i) => (
            <div key={i} className="check-item">
              <span>{item.ok ? "✅" : "⚠️"}</span>
              <span style={{ fontSize: 13 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Algorithm pipeline */}
      <div className="card">
        <div className="card-header"><span className="card-title">Algorithm pipeline</span></div>
        {STEPS.map((s, i) => (
          <div key={i} className={`algo-step ${step > i ? "done" : step === i ? "active" : ""}`}>
            <div className="algo-icon">{s.icon}</div>
            <div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
            {step > i && <span className="badge badge-green" style={{ marginLeft: "auto" }}>DONE</span>}
            {step === i && <span className="badge badge-blue" style={{ marginLeft: "auto" }}>RUNNING</span>}
          </div>
        ))}
        {generating && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <button
        className="btn btn-primary"
        style={{ fontSize: 14, padding: "10px 28px" }}
        onClick={handleGenerate}
        disabled={generating}
      >
        {generating ? "⏳ Generating..." : "⚡ Generate Timetable"}
      </button>
    </div>
  );
}