from flask import Blueprint, request, jsonify

classes_bp = Blueprint("classes", __name__)

# Student strength wasn't specified — defaulted to 60 for all three.
# subjectIds are the courses a class's branch takes. The three CS classes
# all take every subject; other branches would tick a different set.
_ALL_SUBJECT_IDS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"]

_classes = [
    {"id": "c1", "name": "CS-A", "branch": "CS", "strength": 60, "subjectIds": list(_ALL_SUBJECT_IDS)},
    {"id": "c2", "name": "CS-B", "branch": "CS", "strength": 60, "subjectIds": list(_ALL_SUBJECT_IDS)},
    {"id": "c3", "name": "CS-C", "branch": "CS", "strength": 60, "subjectIds": list(_ALL_SUBJECT_IDS)},
]

@classes_bp.get("/")
def get_classes():
    return jsonify(_classes)

@classes_bp.post("/")
def add_class():
    data = request.json
    data["id"] = f"c{len(_classes)+1}"
    _classes.append(data)
    return jsonify(data), 201

@classes_bp.delete("/<cid>")
def delete_class(cid):
    global _classes
    _classes = [c for c in _classes if c["id"] != cid]
    return jsonify({"deleted": cid})