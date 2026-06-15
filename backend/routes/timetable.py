from flask import Blueprint, request, jsonify
from algorithms.scheduler import run_scheduler

timetable_bp = Blueprint("timetable", __name__)

@timetable_bp.post("/generate")
def generate():
    data = request.json
    result = run_scheduler(
        subjects    = data["subjects"],
        teachers    = data["teachers"],
        classes     = data["classes"],
        rooms       = data["rooms"],
        constraints = data.get("constraints", []),
    )
    return jsonify(result)