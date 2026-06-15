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

  const handleGenerate = async () => {
    setGenerating(true);

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
      showToast("Backend error — is Flask running on :5000?");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
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