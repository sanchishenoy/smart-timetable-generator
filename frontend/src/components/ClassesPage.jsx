import React, { useState, useEffect } from "react";
import { api } from "../api";

// Branches, matching the inter-branch distance matrix used for room proximity.
const BRANCH_SUGGESTIONS = ["CS", "EC", "EE", "CV", "IEM", "CH", "BT", "AS", "IS"];

export default function ClassesPage({ classes = [], setClasses, subjects = [], showToast }) {
  const [form, setForm] = useState({ name: "", branch: "", strength: 60, subjectIds: [] });
  const [loading, setLoading] = useState(false);

  // Default a fresh form to "all subjects ticked" once subjects load.
  useEffect(() => {
    setForm(p =>
      p.subjectIds.length === 0 && subjects.length > 0
        ? { ...p, subjectIds: subjects.map(s => s.id) }
        : p
    );
  }, [subjects]);

  // When the branch changes, prefill the course tick-list from an existing
  // class of that same branch, so every branch's classes stay consistent.
  const handleBranchChange = (value) => {
    const sibling = classes.find(
      c => (c.branch || "").trim().toLowerCase() === value.trim().toLowerCase()
    );
    setForm(p => ({
      ...p,
      branch: value,
      subjectIds: sibling?.subjectIds ? [...sibling.subjectIds] : p.subjectIds,
    }));
  };

  const toggleSubject = (id) =>
    setForm(p => ({
      ...p,
      subjectIds: p.subjectIds.includes(id)
        ? p.subjectIds.filter(x => x !== id)
        : [...p.subjectIds, id],
    }));

  const allSelected = subjects.length > 0 && form.subjectIds.length === subjects.length;
  const toggleAll = () =>
    setForm(p => ({ ...p, subjectIds: allSelected ? [] : subjects.map(s => s.id) }));

  const handleAdd = async () => {
    if (!form.name.trim()) return showToast("Enter a class name");
    if (!form.branch.trim()) return showToast("Enter or select a branch");
    if (form.subjectIds.length === 0) return showToast("Select at least one course");
    setLoading(true);
    try {
      const created = await api.addClass({
        name: form.name,
        branch: form.branch.trim(),
        strength: Number(form.strength),
        subjectIds: form.subjectIds,
      });
      setClasses(prev => [...prev, created]);
      setForm({ name: "", branch: "", strength: 60, subjectIds: subjects.map(s => s.id) });
      showToast("Class added ✅");
    } catch {
      showToast("Failed to add class");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteClass(id);
      setClasses(prev => prev.filter(c => c.id !== id));
      showToast("Class removed");
    } catch {
      showToast("Delete failed");
    }
  };

  const AVATAR_COLORS = ["av-blue", "av-green", "av-amber", "av-red", "av-purple"];
  const subjectName = (id) => subjects.find(s => s.id === id)?.name || id;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Add Class / Section</span>
        </div>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Class Name</label>
            <input
              className="form-input"
              placeholder="e.g. AIML-A"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Branch / Department</label>
            <input
              className="form-input"
              list="branch-suggestions"
              placeholder="e.g. CS, AIML, ECE"
              value={form.branch}
              onChange={e => handleBranchChange(e.target.value)}
            />
            <datalist id="branch-suggestions">
              {BRANCH_SUGGESTIONS.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Strength (students)</label>
            <input
              type="number"
              className="form-input"
              min={1} max={300}
              value={form.strength}
              onChange={e => setForm(p => ({ ...p, strength: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="form-label" style={{ margin: 0 }}>
              Courses for this branch{form.branch ? ` (${form.branch})` : ""}
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={toggleAll}
              disabled={subjects.length === 0}
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
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
                {s.name}{s.isElective ? " ⭐" : s.needsLab ? " 🔬" : ""}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
            {form.subjectIds.length} of {subjects.length} courses selected · pick a branch to copy an existing branch's course list
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>
          {loading ? "Adding…" : "+ Add Class"}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Classes</span>
          <span className="badge badge-blue">{classes.length}</span>
        </div>

        {classes.length === 0 && (
          <div className="empty-state">
            <h3>No classes yet</h3>
            <p>Add your first class above.</p>
          </div>
        )}

        {classes.map((c, i) => (
          <div key={c.id} className="list-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="list-item-main">
                <div className={`avatar ${AVATAR_COLORS[i % 5]}`}>{c.name[0]}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {c.name}
                    {c.branch && <span className="badge badge-purple" style={{ marginLeft: 8 }}>{c.branch}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {c.strength} students · {(c.subjectIds || []).length || "all"} courses
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="badge badge-blue">{c.strength} students</span>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>×</button>
              </div>
            </div>
            {(c.subjectIds || []).length > 0 && (
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", paddingLeft: 46 }}>
                {c.subjectIds.map(subjectName).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
