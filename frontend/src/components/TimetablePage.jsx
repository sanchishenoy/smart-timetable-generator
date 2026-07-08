import React, { useState, useEffect } from "react";
import { DAYS, PERIODS, PERIOD_TIMES, BREAKS } from "../constants";

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

    // Periods are columns now, so a double period spans two adjacent columns:
    // a left half (period p) and a right half (period p+1).
    const nextEntry      = tt[day]?.[period + 1];
    const prevEntry      = tt[day]?.[period - 1];
    const isLeftOfDouble  = entry.isDouble && nextEntry?.subject === entry.subject && nextEntry?.teacher === entry.teacher;
    const isRightOfDouble = entry.isDouble && !isLeftOfDouble
      && prevEntry?.subject === entry.subject && prevEntry?.teacher === entry.teacher;

    return (
      <div className={`cell ${entry.isElective ? "elective" : entry.isLab ? "lab" : ""} ${isLeftOfDouble ? "double-left" : ""} ${isRightOfDouble ? "double-right" : ""}`}>
        <div className="cell-subject">
          {entry.subject}
          {entry.isDouble && (
            <span style={{ fontSize: 9, marginLeft: 4, color: "var(--accent)" }}>●●</span>
          )}
        </div>
        {!isRightOfDouble && <div className="cell-teacher">{entry.teacher}</div>}
        {!isRightOfDouble && <div className="cell-room">{entry.room}</div>}
      </div>
    );
  };

  // Ordered columns: each period, with break columns inserted after P2 and P4.
  const COLUMNS = [];
  PERIODS.forEach(p => {
    COLUMNS.push({ type: "period", p });
    BREAKS.filter(b => b.afterPeriod === p).forEach(b => COLUMNS.push({ type: "break", b }));
  });

  const renderGrid = (tt) => (
    <div className="timetable-wrap">
      <table className="timetable">
        <thead>
          <tr>
            <th>Day</th>
            {COLUMNS.map((col, ci) =>
              col.type === "period" ? (
                <th key={ci}>
                  P{col.p}
                  <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                    {PERIOD_TIMES[col.p]}
                  </div>
                </th>
              ) : (
                <th key={ci} className="break-col">
                  {col.b.label}
                  <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2 }}>{col.b.time}</div>
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((dayName, di) => (
            <tr key={di}>
              <td style={{
                background: "var(--bg)",
                color: "var(--text-heading)",
                fontWeight: 600,
                textAlign: "center",
                fontSize: 13,
                whiteSpace: "nowrap",
                padding: "0 12px",
              }}>
                {dayName}
              </td>
              {COLUMNS.map((col, ci) =>
                col.type === "period" ? (
                  <td key={ci}>{renderCell(tt[di]?.[col.p], di, col.p, tt)}</td>
                ) : (
                  <td key={ci} className="break-col" />
                )
              )}
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
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No classes found</span>
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

        {selectedClass ? (
          <>
            <div className="tt-heading">
              {classes.find(c => c.id === selectedClass)?.name || "Class"}
              <span className="tt-sub">Class Timetable</span>
            </div>
            {renderGrid(tt)}
          </>
        ) : (
          <div className="empty-state"><p>Select a class above</p></div>
        )}
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
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No teachers found</span>
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
            padding: "10px 14px",
            background: "var(--bg)",
            borderRadius: "var(--radius-sm)",
            marginBottom: 12,
            border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-heading)" }}>
              {teachers.find(t => t.id === selectedTeacher)?.name || "Unknown"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {subjects
                .filter(s => teachers.find(t => t.id === selectedTeacher)?.subjects?.includes(s.id))
                .map(s => s.name)
                .join(", ") || "No subjects"}
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span className="badge">{periodCount} periods/week</span>
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
          selectedTeacher && (
            <>
              <div className="tt-heading">
                {teachers.find(t => t.id === selectedTeacher)?.name || "Teacher"}
                <span className="tt-sub">Teacher Timetable</span>
              </div>
              {renderGrid(tt)}
            </>
          )
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
      <div className="legend-print-hide" style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { color: "var(--success)",       label: "Lab / Double period" },
          { color: "var(--accent)",        label: "Elective"            },
          { color: "var(--border-strong)", label: "Fixed period"        },
          { color: "var(--border)",        label: "Free period"         },
        ].map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-body)" }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: l.color, flexShrink: 0 }} />
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