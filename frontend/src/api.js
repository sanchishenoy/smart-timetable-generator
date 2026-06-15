import axios from "axios";

const BASE = "http://127.0.0.1:5000/api";

export const api = {
  getSubjects:   ()     => axios.get(`${BASE}/subjects/`).then(r => r.data),
  addSubject:    (data) => axios.post(`${BASE}/subjects/`, data).then(r => r.data),
  deleteSubject: (id)   => axios.delete(`${BASE}/subjects/${id}`).then(r => r.data),

  getTeachers:   ()     => axios.get(`${BASE}/teachers/`).then(r => r.data),
  addTeacher:    (data) => axios.post(`${BASE}/teachers/`, data).then(r => r.data),
  deleteTeacher: (id)   => axios.delete(`${BASE}/teachers/${id}`).then(r => r.data),

  getClasses:    ()     => axios.get(`${BASE}/classes/`).then(r => r.data),
  addClass:      (data) => axios.post(`${BASE}/classes/`, data).then(r => r.data),
  deleteClass:   (id)   => axios.delete(`${BASE}/classes/${id}`).then(r => r.data),

  getRooms:      ()     => axios.get(`${BASE}/rooms/`).then(r => r.data),
  addRoom:       (data) => axios.post(`${BASE}/rooms/`, data).then(r => r.data),
  deleteRoom:    (id)   => axios.delete(`${BASE}/rooms/${id}`).then(r => r.data),

  getConstraints:      ()     => axios.get(`${BASE}/constraints/`).then(r => r.data),
  addConstraint:       (data) => axios.post(`${BASE}/constraints/`, data).then(r => r.data),
  deleteConstraint:    (id)   => axios.delete(`${BASE}/constraints/${id}`).then(r => r.data),

  generate: (payload) => axios.post(`${BASE}/timetable/generate`, payload).then(r => r.data),
};