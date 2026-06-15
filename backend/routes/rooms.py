from flask import Blueprint, request, jsonify

rooms_bp = Blueprint("rooms", __name__)

_rooms = [
    {"id": "r1", "name": "Room 101",      "capacity": 40, "isLab": False},
    {"id": "r2", "name": "Physics Lab",   "capacity": 30, "isLab": True},
    {"id": "r3", "name": "Chem Lab",      "capacity": 30, "isLab": True},
    {"id": "r4", "name": "Computer Lab",  "capacity": 35, "isLab": True},
    {"id": "r5", "name": "Room 102",      "capacity": 40, "isLab": False},
]

@rooms_bp.get("/")
def get_rooms():
    return jsonify(_rooms)

@rooms_bp.post("/")
def add_room():
    data = request.json
    data["id"] = f"r{len(_rooms)+1}"
    _rooms.append(data)
    return jsonify(data), 201

@rooms_bp.delete("/<rid>")
def delete_room(rid):
    global _rooms
    _rooms = [r for r in _rooms if r["id"] != rid]
    return jsonify({"deleted": rid})