import React, { useState } from "react";
import { api } from "../api";

export default function RoomsPage({ rooms = [], setRooms, showToast }) {
  const [form, setForm] = useState({ name: "", capacity: 35, isLab: false });
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim()) return showToast("Enter a room name");
    setLoading(true);
    try {
      const created = await api.addRoom({ ...form, capacity: Number(form.capacity) });
      setRooms(prev => [...prev, created]);
      setForm({ name: "", capacity: 35, isLab: false });
      showToast("Room added ✅");
    } catch {
      showToast("Failed to add room");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteRoom(id);
      setRooms(prev => prev.filter(r => r.id !== id));
      showToast("Room removed");
    } catch {
      showToast("Delete failed");
    }
  };

  const AVATAR_COLORS = ["av-blue", "av-green", "av-amber", "av-red", "av-purple"];

  const classrooms = rooms.filter(r => !r.isLab);
  const labs       = rooms.filter(r => r.isLab);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Add Room</span>
        </div>
        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">Room Name</label>
            <input
              className="form-input"
              placeholder="e.g. Room 201"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Capacity</label>
            <input
              type="number"
              className="form-input"
              min={1} max={200}
              value={form.capacity}
              onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Room Type</label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {["Classroom", "Laboratory"].map(type => (
                <label key={type} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>
                  <input
                    type="radio"
                    name="roomType"
                    checked={form.isLab === (type === "Laboratory")}
                    onChange={() => setForm(p => ({ ...p, isLab: type === "Laboratory" }))}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>
          {loading ? "Adding…" : "+ Add Room"}
        </button>
      </div>

      <div className="grid-2">
        {/* Classrooms */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🚪 Classrooms</span>
            <span className="badge badge-blue">{classrooms.length}</span>
          </div>
          {classrooms.length === 0 && <div className="empty-state"><p>No classrooms added</p></div>}
          {classrooms.map((r, i) => (
            <div key={r.id} className="list-item">
              <div className="list-item-main">
                <div className={`avatar ${AVATAR_COLORS[i % 5]}`}>🚪</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>Capacity: {r.capacity}</div>
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>×</button>
            </div>
          ))}
        </div>

        {/* Labs */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔬 Laboratories</span>
            <span className="badge badge-green">{labs.length}</span>
          </div>
          {labs.length === 0 && <div className="empty-state"><p>No labs added</p></div>}
          {labs.map((r, i) => (
            <div key={r.id} className="list-item">
              <div className="list-item-main">
                <div className={`avatar av-green`}>🔬</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>Capacity: {r.capacity}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="badge badge-green">LAB</span>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}