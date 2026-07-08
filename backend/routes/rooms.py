from flask import Blueprint, request, jsonify

rooms_bp = Blueprint("rooms", __name__)

# "department" is derived from the room name: CRB/CS-prefixed rooms belong
# to the CS department; everything else uses its first two letters as the
# department/building code. Capacity wasn't specified — defaulted to 70 for
# lecture rooms and 35 for labs.
_rooms = [
    {"id": "r1",  "name": "CRB 201",   "capacity": 70, "isLab": False, "department": "CS"},
    {"id": "r2",  "name": "CRB 202",   "capacity": 70, "isLab": False, "department": "CS"},
    {"id": "r3",  "name": "CRB 203",   "capacity": 70, "isLab": False, "department": "CS"},
    {"id": "r4",  "name": "CS Lab 1",  "capacity": 35, "isLab": True,  "department": "CS"},
    {"id": "r5",  "name": "CS Lab 2",  "capacity": 35, "isLab": True,  "department": "CS"},
    {"id": "r6",  "name": "CS Lab 13", "capacity": 35, "isLab": True,  "department": "CS"},
    {"id": "r7",  "name": "CS Lab 14", "capacity": 35, "isLab": True,  "department": "CS"},
    {"id": "r8",  "name": "EC203",     "capacity": 70, "isLab": False, "department": "EC"},
    {"id": "r9",  "name": "EC204",     "capacity": 70, "isLab": False, "department": "EC"},
    {"id": "r10", "name": "EE104",     "capacity": 70, "isLab": False, "department": "EE"},
    {"id": "r11", "name": "CV101",     "capacity": 70, "isLab": False, "department": "CV"},
    {"id": "r12", "name": "IEM304",    "capacity": 70, "isLab": False, "department": "IEM"},
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