import React, { useState } from "react";
import { api } from "../api";

export default function ClassesPage({ classes = [], setClasses, showToast }) {
  const [form, setForm] = useState({ name: "", strength: 30 });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) return showToast("Enter a class name");
    setLoading(true);
    try {
      const created = await api.addClass({ ...form, strength: Number(form.strength) });
      setClasses(prev => [...prev, created]);
      setForm({ name: "", strength: 30 });
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

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Add Class / Section</span>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Class Name</label>
            <input
              className="form-input"
              placeholder="e.g. Grade 10-A"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Strength (students)</label>
            <input
              type="number"
              className="form-input"
              min={1} max={80}
              value={form.strength}
              onChange={e => setForm(p => ({ ...p, strength: e.target.value }))}
            />
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
          <div key={c.id} className="list-item">
            <div className="list-item-main">
              <div className={`avatar ${AVATAR_COLORS[i % 5]}`}>{c.name[0]}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {c.strength} students
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="badge badge-blue">{c.strength} students</span>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}