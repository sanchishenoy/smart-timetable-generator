import React, { useState } from "react";
import { api } from "../api";

export default function SubjectsPage({ subjects = [], setSubjects, showToast }) {
  const [form, setForm] = useState({ name: "", code: "", hoursPerWeek: 3, needsLab: false, isElective: false });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) return showToast("Enter a subject name");
    setLoading(true);
    try {
      const created = await api.addSubject({ ...form, hoursPerWeek: Number(form.hoursPerWeek) });
      setSubjects(prev => [...prev, created]);
      setForm({ name: "", code: "", hoursPerWeek: 3, needsLab: false, isElective: false });
      showToast("Subject added ✅");
    } catch {
      showToast("Failed to add subject — is Flask running?");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
      showToast("Subject removed");
    } catch {
      showToast("Delete failed");
    }
  };

  const AVATAR_COLORS = ["av-blue", "av-green", "av-amber", "av-red", "av-purple"];

  return (
    <div>
      {/* ── Add form ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Add Subject</span>
        </div>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input
              className="form-input"
              placeholder="e.g. Mathematics"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Course Code (optional)</label>
            <input
              className="form-input"
              placeholder="e.g. CS241AT"
              value={form.code}
              onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Hours / Week</label>
            <input
              type="number"
              className="form-input"
              min={1} max={10}
              value={form.hoursPerWeek}
              onChange={e => setForm(p => ({ ...p, hoursPerWeek: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Requires Lab</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                id="needsLab"
                checked={form.needsLab}
                onChange={e => setForm(p => ({ ...p, needsLab: e.target.checked }))}
              />
              <label htmlFor="needsLab" style={{ fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                Lab required
              </label>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Elective</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                id="isElective"
                checked={form.isElective}
                onChange={e => setForm(p => ({ ...p, isElective: e.target.checked }))}
              />
              <label htmlFor="isElective" style={{ fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                Open elective — no fixed teacher, same slot for all classes
              </label>
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>
          {loading ? "Adding…" : "+ Add Subject"}
        </button>
      </div>

      {/* ── List ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Subjects</span>
          <span className="badge badge-blue">{subjects.length}</span>
        </div>

        {subjects.length === 0 && (
          <div className="empty-state">
            <h3>No subjects yet</h3>
            <p>Add your first subject above.</p>
          </div>
        )}

        {subjects.map((s, i) => (
          <div key={s.id} className="list-item">
            <div className="list-item-main">
              <div className={`avatar ${AVATAR_COLORS[i % 5]}`}>{s.name[0]}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {s.name}{s.code ? ` (${s.code})` : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {s.hoursPerWeek} hrs/week{s.needsLab ? " · Lab required" : ""}{s.isElective ? " · Elective" : ""}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {s.isElective && <span className="badge badge-amber">ELECTIVE</span>}
              {s.needsLab && <span className="badge badge-green">LAB</span>}
              <span className="badge badge-blue">{s.hoursPerWeek}h/wk</span>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}