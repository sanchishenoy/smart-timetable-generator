import React, { useState, useEffect } from "react";

const DAYS    = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetablePage({
  timetableData,
  classes   = [],
  teachers  = [],
  subjects  = [],
}) {
  const [view,            setView]            = useState("class");
  const [selectedClass,   setSelectedClass]   = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Auto-select first class and first teacher whenever lists change
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0].id);
    }
  }, [classes]);

  useEffect(() => {
    if (teachers.length > 0 && !selectedTeacher) {
      setSelectedTeacher(teachers[0].id);
    }
  }, [teachers]);

  if (!timetableData) {
    return (
      <div className="empty-state">
        <h3>No timetable yet</h3>
        <p>Go to Generate to create one.</p>
      </div>
    );
  }

  const { classTimetable, teacherTimetable } = timetableData;

  const renderCell = (entry, day, period, tt) => {
    if (!entry) return <div className="cell free" />;
    if (entry.fixed) return (
      <div className="cell fixed">
        <div className="cell-subject">{entry.description}</div>
      </div>
    );

    const nextEntry        = tt[day]?.[period + 1];
    const isTopOfDouble    = entry.isDouble && nextEntry?.subject === entry.subject && nextEntry?.teacher === entry.teacher;
    const isBottomOfDouble = entry.isDouble && !isTopOfDouble;

    return (
      <div className={`cell ${entry.isLab ? "lab" : ""} ${isTopOfDouble ? "double-top" : ""} ${isBottomOfDouble ? "double-bottom" : ""}`}>
        <div className="cell-subject">
          {entry.subject}
          {entry.isDouble && (
            <span style={{ fontSize: 9, marginLeft: 4, color: "#ffc462" }}>●●</span>
          )}
        </div>
        {!isBottomOfDouble && <div className="cell-teacher">{entry.teacher}</div>}
        {!isBottomOfDouble && <div className="cell-room">{entry.room}</div>}
      </div>
    );
  };

  const renderGrid = (tt) => (
    <div className="timetable-wrap">
      <table className="timetable">
        <thead>
          <tr>
            <th>Period</th>
            {DAYS.map(d => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {PERIODS.map(p => (
            <tr key={p}>
              <td style={{
                background: "#1a2540",
                color: "#7c9ef0",
                fontWeight: 600,
                textAlign: "center",
                fontSize: 11,
              }}>
                P{p}
              </td>
              {DAYS.map((_, di) => (
                <td key={di}>{renderCell(tt[di]?.[p], di, p, tt)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── Class-wise view ──────────────────────────────────────────────────────
  const renderClassView = () => {
    const tt = classTimetable?.[selectedClass] || {};
    return (
      <div className="card">
        {/* Class selector buttons — built from live classes prop */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {classes.length === 0 && (
            <span style={{ fontSize: 12, color: "#8892a4" }}>No classes found</span>
          )}
          {classes.map(c => (
            <button
              key={c.id}
              className={`btn ${selectedClass === c.id ? "btn-primary" : "btn-ghost"} btn-sm`}
              onClick={() => setSelectedClass(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {selectedClass
          ? renderGrid(tt)
          : <div className="empty-state"><p>Select a class above</p></div>
        }
      </div>
    );
  };

  // ── Teacher-wise view ────────────────────────────────────────────────────
  const renderTeacherView = () => {
    const tt = teacherTimetable?.[selectedTeacher] || {};

    // Count periods assigned to selected teacher
    const periodCount = Object.values(tt).reduce((total, daySlots) =>
      total + Object.keys(daySlots).length, 0
    );

    return (
      <div className="card">
        {/* Teacher selector buttons — built from live teachers prop */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {teachers.length === 0 && (
            <span style={{ fontSize: 12, color: "#8892a4" }}>No teachers found</span>
          )}
          {teachers.map(t => (
            <button
              key={t.id}
              className={`btn ${selectedTeacher === t.id ? "btn-primary" : "btn-ghost"} btn-sm`}
              onClick={() => setSelectedTeacher(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Teacher info bar */}
        {selectedTeacher && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 12px",
            background: "#0f1117",
            borderRadius: 7,
            marginBottom: 12,
            border: "1px solid #2d3748",
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#c8d6f0" }}>
              {teachers.find(t => t.id === selectedTeacher)?.name || "Unknown"}
            </div>
            <div style={{ fontSize: 11, color: "#8892a4" }}>
              {subjects
                .filter(s => teachers.find(t => t.id === selectedTeacher)?.subjects?.includes(s.id))
                .map(s => s.name)
                .join(", ") || "No subjects"}
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span className="badge badge-blue">{periodCount} periods/week</span>
            </div>
          </div>
        )}

        {/* Show message if teacher has no timetable yet */}
        {selectedTeacher && Object.keys(tt).length === 0 ? (
          <div className="empty-state">
            <h3>No periods assigned</h3>
            <p>This teacher has no sessions in the generated timetable yet.<br/>
            Make sure they are assigned subjects and regenerate.</p>
          </div>
        ) : (
          selectedTeacher && renderGrid(tt)
        )}

        {!selectedTeacher && (
          <div className="empty-state"><p>Select a teacher above</p></div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { color: "#5effa0", label: "Lab / Double period" },
          { color: "#c09ef0", label: "Fixed period"        },
          { color: "#2d3748", label: "Free period"         },
          { color: "#ffc462", label: "●● Double block"     },
        ].map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8892a4" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div className="tabs">
        <div
          className={`tab ${view === "class" ? "active" : ""}`}
          onClick={() => setView("class")}
        >
          Class-wise
        </div>
        <div
          className={`tab ${view === "teacher" ? "active" : ""}`}
          onClick={() => setView("teacher")}
        >
          Teacher-wise
        </div>
      </div>

      {view === "class"   && renderClassView()}
      {view === "teacher" && renderTeacherView()}
    </div>
  );
}