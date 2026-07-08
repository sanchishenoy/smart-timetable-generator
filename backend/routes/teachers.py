from flask import Blueprint, request, jsonify

teachers_bp = Blueprint("teachers", __name__)

# Order matters: when a subject has multiple qualified teachers, the
# scheduler assigns the FIRST one found here to every class. This order is
# deliberately arranged so that no teacher's total load exceeds their max
# hours given 3 classes (CS-A/B/C) — see the conversation this was designed
# in for the full derivation. A few teachers below end up unused as a result
# (Dr Badari Nath, Dr. Praphulla, Dr Veena, Dr Niranjan) since their subjects
# were all claimed by an earlier-listed teacher.
_teachers = [
    {"id": "t1",  "name": "Prof Shreya",     "subjects": ["s5"],             "availability": [], "maxHours": 20},
    {"id": "t2",  "name": "Dr Vinay",        "subjects": ["s4"],             "availability": [], "maxHours": 20},
    {"id": "t3",  "name": "Prof Saraswathi", "subjects": ["s8"],             "availability": [], "maxHours": 15},
    {"id": "t4",  "name": "Dr Hemanth",      "subjects": ["s1"],             "availability": [], "maxHours": 20},
    {"id": "t5",  "name": "Prof Shraddha",   "subjects": ["s5", "s7"],       "availability": [], "maxHours": 20},
    {"id": "t6",  "name": "Dr Mohana",       "subjects": ["s3", "s7"],       "availability": [], "maxHours": 20},
    {"id": "t7",  "name": "Dr Badari Nath",  "subjects": ["s3", "s7"],       "availability": [], "maxHours": 15},
    {"id": "t8",  "name": "Dr Suma",         "subjects": ["s2", "s4"],       "availability": [], "maxHours": 20},
    {"id": "t9",  "name": "Dr. Praphulla",   "subjects": ["s2", "s7"],       "availability": [], "maxHours": 20},
    {"id": "t10", "name": "Dr Veena",        "subjects": ["s2", "s4", "s8"], "availability": [], "maxHours": 15},
    {"id": "t11", "name": "Dr Niranjan",     "subjects": ["s1"],             "availability": [], "maxHours": 20},
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