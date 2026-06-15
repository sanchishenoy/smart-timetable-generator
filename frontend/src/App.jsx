import React, { useState, useEffect } from "react";
import { api } from "./api";
import Dashboard       from "./components/Dashboard";
import SubjectsPage    from "./components/SubjectsPage";
import TeachersPage    from "./components/TeachersPage";
import ClassesPage     from "./components/ClassesPage";
import RoomsPage       from "./components/RoomsPage";
import ConstraintsPage from "./components/ConstraintsPage";
import GeneratePage    from "./components/GeneratePage";
import TimetablePage   from "./components/TimetablePage";
import "./styles.css";

const NAV = [
  { id: "dashboard",   icon: "📊", label: "Dashboard"   },
  { id: "subjects",    icon: "📚", label: "Subjects"     },
  { id: "teachers",    icon: "👩‍🏫", label: "Teachers"    },
  { id: "classes",     icon: "🏫", label: "Classes"      },
  { id: "rooms",       icon: "🚪", label: "Rooms"        },
  { id: "constraints", icon: "⚙️", label: "Constraints"  },
  { id: "generate",    icon: "⚡", label: "Generate"     },
  { id: "timetable",   icon: "📅", label: "Timetable"    },
];

export default function App() {
  const [page,        setPage]        = useState("dashboard");
  const [subjects,    setSubjects]    = useState([]);
  const [teachers,    setTeachers]    = useState([]);
  const [classes,     setClasses]     = useState([]);
  const [rooms,       setRooms]       = useState([]);
  const [constraints, setConstraints] = useState([
    { id: "c0", type: "fixed", description: "Assembly", day: 0, period: 1, affectsAll: true },
  ]);
  const [timetableData, setTimetableData] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
  api.getSubjects().then(setSubjects).catch(() => setSubjects([]));
  api.getTeachers().then(setTeachers).catch(() => setTeachers([]));
  api.getClasses().then(setClasses).catch(() => setClasses([]));
  api.getRooms().then(setRooms).catch(() => setRooms([]));
}, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const pageProps = {
    subjects, setSubjects,
    teachers, setTeachers,
    classes,  setClasses,
    rooms,    setRooms,
    constraints, setConstraints,
    timetableData, setTimetableData,
    setPage, showToast,
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Timetable AI</h1>
          <p>Smart Scheduler</p>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <div
              key={n.id}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {n.id === "timetable" && timetableData && (
                <span className="badge badge-green" style={{ marginLeft: "auto" }}>READY</span>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main">
        <div className="topbar">
          <h2>{NAV.find(n => n.id === page)?.label}</h2>
          {page === "timetable" && timetableData && (
            <div className="topbar-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => showToast("Exported as Excel")}>📊 XLS</button>
              <button className="btn btn-ghost btn-sm" onClick={() => showToast("Exported as PDF")}>📄 PDF</button>
              <button className="btn btn-primary btn-sm" onClick={() => setPage("generate")}>🔄 Regenerate</button>
            </div>
          )}
        </div>

        <div className="content">
          {page === "dashboard"   && <Dashboard       {...pageProps} />}
          {page === "subjects"    && <SubjectsPage    {...pageProps} />}
          {page === "teachers"    && <TeachersPage    {...pageProps} />}
          {page === "classes"     && <ClassesPage     {...pageProps} />}
          {page === "rooms"       && <RoomsPage       {...pageProps} />}
          {page === "constraints" && <ConstraintsPage {...pageProps} />}
          {page === "generate"    && <GeneratePage    {...pageProps} />}
          {page === "timetable"   && <TimetablePage   {...pageProps} />}
        </div>
      </main>

      {toast && <div className="toast">✅ {toast}</div>}
    </div>
  );
}