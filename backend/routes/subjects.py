from flask import Blueprint, request, jsonify

subjects_bp = Blueprint("subjects", __name__)

# In-memory store (swap for DB later)
_subjects = [
    {"id": "s1", "name": "Mathematics",      "hoursPerWeek": 5, "needsLab": False},
    {"id": "s2", "name": "Physics",           "hoursPerWeek": 4, "needsLab": True},
    {"id": "s3", "name": "English",           "hoursPerWeek": 4, "needsLab": False},
    {"id": "s4", "name": "Chemistry",         "hoursPerWeek": 3, "needsLab": True},
    {"id": "s5", "name": "History",           "hoursPerWeek": 3, "needsLab": False},
    {"id": "s6", "name": "Computer Science",  "hoursPerWeek": 2, "needsLab": True},
]

@subjects_bp.get("/")
def get_subjects():
    return jsonify(_subjects)

@subjects_bp.post("/")
def add_subject():
    data = request.json
    data["id"] = f"s{len(_subjects)+1}"
    _subjects.append(data)
    return jsonify(data), 201

@subjects_bp.delete("/<sid>")
def delete_subject(sid):
    global _subjects
    _subjects = [s for s in _subjects if s["id"] != sid]
    return jsonify({"deleted": sid})