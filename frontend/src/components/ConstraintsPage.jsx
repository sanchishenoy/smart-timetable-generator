import React, { useState, useEffect } from "react";

const DAYS    = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ConstraintsPage({ constraints = [], setConstraints, teachers = [], showToast }) {
  const [type,        setType]        = useState("teacher_unavail");
  const [teacherId,   setTeacherId]   = useState("");
  const [day,         setDay]         = useState(0);
  const [period,      setPeriod]      = useState(1);
  const [description, setDescription] = useState("");

  // Whenever teachers list changes, auto-select first teacher if none selected
  useEffect(() => {
    if (teachers.length > 0 && !teacherId) {
      setTeacherId(teachers[0].id);
    }
  }, [teachers]);

  const handleAdd = () => {
    if (type === "teacher_unavail" && !teacherId)
      return showToast("No teachers available — add teachers first");

    const entry = {
      id: `con_${Date.now()}`,
      type,
      day:    Number(day),
      period: Number(period),
      description: description || (type === "fixed" ? "Fixed period" : "Unavailable"),
      ...(type === "teacher_unavail"
        ? { teacherId }
        : { affectsAll: true }),
    };

    setConstraints(prev => [...prev, entry]);
    setDescription("");
    showToast("Constraint added ✅");
  };

  const handleDelete = (id) => {
    setConstraints(prev => prev.filter(c => c.id !== id));
    showToast("Constraint removed");
  };

  const teacherName = (id) => teachers.find(t => t.id === id)?.name || id;

  const fixed   = constraints.filter(c => c.type === "fixed");
  const unavail = constraints.filter(c => c.type === "teacher_unavail");

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Add Constraint</span>
        </div>

        {/* Type selector */}
        <div className="form-group">
          <label className="form-label">Constraint Type</label>
          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
            {[
              { value: "teacher_unavail", label: "🚫 Teacher Unavailable" },
              { value: "fixed",           label: "📌 Fixed Period"         },
            ].map(opt => (
              <label key={opt.value} style={{
                display: "flex", alignItems: "center", gap: 6,
                cursor: "pointer", fontSize: 13,
                color: "var(--color-text-secondary, #8892a4)",
              }}>
                <input
                  type="radio"
                  name="ctype"
                  value={opt.value}
                  checked={type === opt.value}
                  onChange={() => setType(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid-3">
          {/* Teacher dropdown */}
          {type === "teacher_unavail" && (
            <div className="form-group">
              <label className="form-label">Teacher</label>
              {teachers.length === 0 ? (
                <div style={{ fontSize: 12, color: "#ff9090", marginTop: 6 }}>
                  ⚠️ No teachers added yet
                </div>
              ) : (
                <select
                  className="form-input"
                  value={teacherId}
                  onChange={e => setTeacherId(e.target.value)}
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Day */}
          <div className="form-group">
            <label className="form-label">Day</label>
            <select
              className="form-input"
              value={day}
              onChange={e => setDay(e.target.value)}
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div className="form-group">
            <label className="form-label">Period</label>
            <select
              className="form-input"
              value={period}
              onChange={e => setPeriod(e.target.value)}
            >
              {PERIODS.map(p => (
                <option key={p} value={p}>Period {p}</option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div className="form-group">
            <label className="form-label">Label (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Assembly, Sports day…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleAdd}>
          + Add Constraint
        </button>
      </div>

      <div className="grid-2">
        {/* Fixed periods */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📌 Fixed Periods</span>
            <span className="badge badge-amber">{fixed.length}</span>
          </div>
          {fixed.length === 0 && (
            <div className="empty-state"><p>No fixed periods</p></div>
          )}
          {fixed.map(c => (
            <div key={c.id} className="constraint-row">
              <span>📌</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#c8d6f0" }}>
                  {c.description}
                </div>
                <div style={{ fontSize: 10, color: "#4a5568", marginTop: 2 }}>
                  {DAYS[c.day]} · Period {c.period} · All classes
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>×</button>
            </div>
          ))}
        </div>

        {/* Teacher unavailability */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🚫 Teacher Unavailability</span>
            <span className="badge badge-red">{unavail.length}</span>
          </div>
          {unavail.length === 0 && (
            <div className="empty-state"><p>No unavailability set</p></div>
          )}
          {unavail.map(c => (
            <div key={c.id} className="constraint-row">
              <span>🚫</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#c8d6f0" }}>
                  {teacherName(c.teacherId)}
                </div>
                <div style={{ fontSize: 10, color: "#4a5568", marginTop: 2 }}>
                  {DAYS[c.day]} · Period {c.period}
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}