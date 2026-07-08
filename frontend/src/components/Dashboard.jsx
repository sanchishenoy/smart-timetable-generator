import React from "react";

// Does a class include a subject? (empty/missing subjectIds → takes all.)
const classTakes = (cls, subj) => {
  const ids = cls.subjectIds;
  if (!ids || ids.length === 0) return true;
  return ids.includes(subj.id);
};

// Mirror of the backend's load-balanced teacher assignment, so the workload
// shown BEFORE generation matches what generation will actually produce.
// For each non-elective subject a class takes, the qualified teacher with the
// lowest running load (preferring those still under maxHours) gets it.
function estimateTeacherLoads(subjects, teachers, classes) {
  const load = {};
  teachers.forEach(t => { load[t.id] = 0; });

  subjects.forEach(subj => {
    if (subj.isElective) return;
    const qualified = teachers.filter(t => (t.subjects || []).includes(subj.id));
    if (qualified.length === 0) return;
    const periods = subj.hoursPerWeek || 0;

    classes.forEach(cls => {
      if (!classTakes(cls, subj)) return;
      const fits = qualified.filter(t => t.maxHours == null || load[t.id] + periods <= t.maxHours);
      const pool = fits.length ? fits : qualified;
      const chosen = pool.reduce((best, t) => (load[t.id] < load[best.id] ? t : best), pool[0]);
      load[chosen.id] += periods;
    });
  });

  return load;
}

export default function Dashboard({
  subjects = [], teachers = [], classes = [], rooms = [], timetableData, setPage,
}) {
  // Branch-aware weekly total: each class only carries the subjects it takes.
  const totalPeriods = classes.reduce(
    (sum, cls) => sum + subjects.filter(s => classTakes(cls, s)).reduce((a, s) => a + s.hoursPerWeek, 0),
    0
  );
  const labSubjects  = subjects.filter(s => s.needsLab).length;
  const labRooms     = rooms.filter(r => r.isLab).length;

  const estimatedLoads = estimateTeacherLoads(subjects, teachers, classes);

  // Once a timetable exists, show each teacher's real assigned periods;
  // otherwise fall back to the load-balanced estimate above.
  const actualPeriodsFor = (t) => {
    const tt = timetableData?.teacherTimetable?.[t.id];
    if (!tt) return null;
    return Object.values(tt).reduce(
      (total, daySlots) => total + Object.keys(daySlots).length, 0
    );
  };

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {[
          { num: subjects.length, label: "Subjects",       color: "#7c9ef0" },
          { num: teachers.length, label: "Teachers",       color: "#5effa0" },
          { num: classes.length,  label: "Classes",        color: "#ffc462" },
          { num: totalPeriods,    label: "Periods / Week", color: "#c09ef0" },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Quick actions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Quick Actions</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-primary" style={{ justifyContent: "flex-start" }} onClick={() => setPage("generate")}>
              ⚡ Generate Timetable
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => setPage("teachers")}>
              👩‍🏫 Manage Teachers
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => setPage("subjects")}>
              📚 Manage Subjects
            </button>
            <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={() => setPage("constraints")}>
              ⚙️ Set Constraints
            </button>
            {timetableData && (
              <button className="btn btn-success" style={{ justifyContent: "flex-start" }} onClick={() => setPage("timetable")}>
                📅 View Timetable
              </button>
            )}
          </div>
        </div>

        {/* Teacher workload */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Teacher Workload</span>
          </div>
          {teachers.length === 0 && (
            <div className="empty-state"><p>No teachers added yet</p></div>
          )}
          {teachers.length > 0 && !timetableData && (
            <div style={{ fontSize: 11, color: "#8892a4", marginBottom: 10 }}>
              Projected from load-balanced assignment — generate a timetable to confirm.
            </div>
          )}
          {teachers.map(t => {
            const actual   = actualPeriodsFor(t);
            const assigned = actual !== null ? actual : (estimatedLoads[t.id] || 0);
            const pct      = Math.min(100, Math.round((assigned / (t.maxHours || 20)) * 100));
            const color    = pct > 90 ? "#ff9090" : pct > 70 ? "#ffc462" : "#5effa0";
            return (
              <div key={t.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-primary, #e2e8f0)" }}>
                  <span>{t.name}</span>
                  <span style={{ color }}>{assigned}/{t.maxHours}h</span>
                </div>
                <div className="workload-bar">
                  <div className="workload-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Algorithm overview */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Algorithm Overview</span>
        </div>
        <div className="grid-3">
          {[
            {
              icon: "🔵", color: "#7c9ef0", title: "Graph Coloring",
              desc: "Nodes = class-subject-teacher sessions. Edges = conflicts. Colors = time slots. Adjacent nodes never share a color.",
            },
            {
              icon: "⬅️", color: "#ffc462", title: "Backtracking (CSP)",
              desc: "Recursive constraint satisfaction. Assigns slots one by one. On dead-end, unassigns and retries. MRV heuristic picks hardest node first.",
            },
            {
              icon: "⚡", color: "#5effa0", title: "Greedy Optimization",
              desc: "Pre-sorts sessions: teachers with fewest free slots first, subjects with most hours/week first. Reduces search depth.",
            },
          ].map((a, i) => (
            <div key={i} style={{ background: "#0f1117", borderRadius: 8, padding: 14, border: "1px solid #2d3748" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: a.color, marginBottom: 5 }}>{a.title}</div>
              <div style={{ fontSize: 11, color: "#8892a4", lineHeight: 1.6 }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data summary */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Data Summary</span>
        </div>
        <div className="grid-2">
          <div>
            <div style={{ fontSize: 11, color: "#8892a4", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Subjects</div>
            {subjects.length === 0 && <div style={{ fontSize: 12, color: "#4a5568" }}>No subjects yet</div>}
            {subjects.slice(0, 5).map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: "1px solid #2d3748", color: "#c8d6f0" }}>
                <span>{s.name}</span>
                <span style={{ color: "#8892a4" }}>{s.hoursPerWeek}h/wk{s.needsLab ? " 🔬" : ""}</span>
              </div>
            ))}
            {subjects.length > 5 && (
              <div style={{ fontSize: 11, color: "#4a5568", marginTop: 4 }}>+{subjects.length - 5} more</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8892a4", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rooms</div>
            <div style={{ fontSize: 12, color: "#8892a4", marginBottom: 6 }}>
              <span style={{ color: "#7c9ef0", fontWeight: 600 }}>{rooms.filter(r => !r.isLab).length}</span> classrooms &nbsp;·&nbsp;
              <span style={{ color: "#5effa0", fontWeight: 600 }}>{labRooms}</span> labs
            </div>
            {labSubjects > 0 && labRooms === 0 && (
              <div style={{ background: "#3b1212", border: "1px solid #7a2424", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "#ff9090" }}>
                ⚠️ {labSubjects} subject{labSubjects > 1 ? "s" : ""} need labs but no lab rooms are defined.
              </div>
            )}
            {labSubjects > 0 && labRooms > 0 && (
              <div style={{ background: "#143329", border: "1px solid #1e6b4a", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "#5effa0" }}>
                ✅ Lab subjects and lab rooms are both configured.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}