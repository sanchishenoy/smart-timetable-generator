from flask import Blueprint, request, jsonify

subjects_bp = Blueprint("subjects", __name__)

# In-memory store (swap for DB later)
_subjects = [
    {"id": "s1", "name": "DMS",               "code": "CS241AT", "hoursPerWeek": 3, "needsLab": False, "isElective": False},
    {"id": "s2", "name": "DAA",               "code": "CD343AI", "hoursPerWeek": 3, "needsLab": False, "isElective": False},
    {"id": "s3", "name": "IoT and Embedded",  "code": "CS344AI", "hoursPerWeek": 3, "needsLab": False, "isElective": False},
    {"id": "s4", "name": "CN",                "code": "CY245AT", "hoursPerWeek": 3, "needsLab": False, "isElective": False},
    {"id": "s5", "name": "UHV",               "code": "HS245XT", "hoursPerWeek": 2, "needsLab": False, "isElective": False},
    {"id": "s6", "name": "AEC",               "code": "HS245XX", "hoursPerWeek": 2, "needsLab": True,  "isElective": True},
    {"id": "s7", "name": "IOT Lab",           "code": "",        "hoursPerWeek": 2, "needsLab": True,  "isElective": False},
    {"id": "s8", "name": "DAA Lab",           "code": "",        "hoursPerWeek": 2, "needsLab": True,  "isElective": False},
    {"id": "s9", "name": "Basket",            "code": "",        "hoursPerWeek": 3, "needsLab": False, "isElective": True},
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