from flask import Blueprint, request, jsonify

teachers_bp = Blueprint("teachers", __name__)

_teachers = [
    {"id": "t1", "name": "Dr. Sharma",  "subjects": ["s1"],       "availability": [],        "maxHours": 25},
    {"id": "t2", "name": "Ms. Patel",   "subjects": ["s2", "s4"], "availability": [],        "maxHours": 20},
    {"id": "t3", "name": "Mr. Johnson", "subjects": ["s3"],       "availability": [[1, 3]],  "maxHours": 20},
    {"id": "t4", "name": "Dr. Rajan",   "subjects": ["s5", "s6"], "availability": [],        "maxHours": 18},
]

@teachers_bp.get("/")
def get_teachers():
    return jsonify(_teachers)

@teachers_bp.post("/")
def add_teacher():
    data = request.json
    data["id"] = f"t{len(_teachers)+1}"
    data.setdefault("availability", [])
    _teachers.append(data)
    return jsonify(data), 201

@teachers_bp.delete("/<tid>")
def delete_teacher(tid):
    global _teachers
    _teachers = [t for t in _teachers if t["id"] != tid]
    return jsonify({"deleted": tid})