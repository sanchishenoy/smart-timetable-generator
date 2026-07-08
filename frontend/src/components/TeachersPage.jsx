import React, { useState } from "react";
import { api } from "../api";

export default function TeachersPage({ teachers = [], setTeachers, subjects = [], classes = [], showToast }) {
  const [form, setForm] = useState({ name: "", subjectIds: [], maxHours: 20 });
  const [loading, setLoading] = useState(false);

  const toggleSubject = (id) =>
    setForm(p => ({
      ...p,
      subjectIds: p.subjectIds.includes(id)
        ? p.subjectIds.filter(x => x !== id)
        : [...p.subjectIds, id],
    }));

  const handleAdd = async () => {
    if (!form.name.trim()) return showToast("Enter a teacher name");
    if (form.subjectIds.length === 0) return showToast("Select at least one subject");
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        subjects: form.subjectIds,
        maxHours: Number(form.maxHours),
        availability: [],
      };
      const created = await api.addTeacher(payload);
      setTeachers(prev => [...prev, created]);
      setForm({ name: "", subjectIds: [], maxHours: 20 });
      showToast("Teacher added");
    } catch {
      showToast("Failed to add teacher");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteTeacher(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
      showToast("Teacher removed");
    } catch {
      showToast("Delete failed");
    }
  };

  const AVATAR_COLORS = ["av-blue", "av-green", "av-amber", "av-red", "av-purple"];

  const initials = (name) =>
    name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // Real weekly load = subject hours × number of classes, with labs counted as
  // double periods. This mirrors the scheduler (one session per class per subject),
  // so the bar stays consistent with the generator's overload validation.
  const classCount = Math.max(classes.length, 1);
  const subjectHours = (t) =>
    subjects
      .filter(s => (t.subjects || []).includes(s.id))
      .reduce((a, s) => a + s.hoursPerWeek * (s.needsLab ? 2 : 1) * classCount, 0);

  return (
    <div>
      {/* ── Add form ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Add Teacher</span>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Teacher Name</label>
            <input
              className="form-input"
              placeholder="e.g. Dr. Smith"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max Hours / Week</label>
            <input
              type="number"
              className="form-input"
              min={1} max={40}
              value={form.maxHours}
              onChange={e => setForm(p => ({ ...p, maxHours: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Subjects Taught</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {subjects.length === 0 && (
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                No subjects defined yet — add some first.
              </span>
            )}
            {subjects.map(s => (
              <span
                key={s.id}
                className={`tag ${form.subjectIds.includes(s.id) ? "selected" : ""}`}
                onClick={() => toggleSubject(s.id)}
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>
          {loading ? "Adding…" : "+ Add Teacher"}
        </button>
      </div>

      {/* ── List ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Teachers</span>
          <span className="badge badge-blue">{teachers.length}</span>
        </div>

        {teachers.length === 0 && (
          <div className="empty-state">
            <h3>No teachers yet</h3>
            <p>Add your first teacher above.</p>
          </div>
        )}

        {teachers.map((t, i) => {
          const hrs = subjectHours(t);
          const pct = Math.min(100, Math.round((hrs / t.maxHours) * 100));
          const over = hrs > t.maxHours;

          return (
            <div key={t.id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="list-item-main">
                  <div className={`avatar ${AVATAR_COLORS[i % 5]}`}>{initials(t.name)}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                      {subjects.filter(s => (t.subjects || []).includes(s.id)).map(s => s.name).join(", ") || "No subjects"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="badge">Max {t.maxHours}h</span>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>×</button>
                </div>
              </div>
              {/* Workload bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>
                  <span>Workload</span>
                  <span style={{ color: over ? "var(--danger)" : "var(--text-heading)" }}>{hrs}h assigned / {t.maxHours}h max</span>
                </div>
                <div className="workload-bar">
                  <div className={`workload-fill ${over ? "over" : ""}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}