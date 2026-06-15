from flask import Blueprint, request, jsonify

classes_bp = Blueprint("classes", __name__)

_classes = [
    {"id": "c1", "name": "Grade 10-A", "strength": 35},
    {"id": "c2", "name": "Grade 10-B", "strength": 32},
    {"id": "c3", "name": "Grade 11-A", "strength": 30},
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