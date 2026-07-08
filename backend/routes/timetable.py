from flask import Blueprint, request, jsonify
from algorithms.scheduler import run_scheduler
from algorithms.validation import validate_inputs, SchedulingError

timetable_bp = Blueprint("timetable", __name__)

@timetable_bp.post("/generate")
def generate():
    data = request.json or {}

    subjects    = data.get("subjects", [])
    teachers    = data.get("teachers", [])
    classes     = data.get("classes", [])
    rooms       = data.get("rooms", [])
    constraints = data.get("constraints", [])

    # ── Reject illegal / infeasible configurations up front ────────────────
    errors = validate_inputs(subjects, teachers, classes, rooms, constraints)
    if errors:
        return jsonify({
            "error":   "Cannot generate timetable — invalid configuration.",
            "reasons": errors,
        }), 400

    # ── Run the solver; it may still fail if constraints are too tight ─────
    try:
        result = run_scheduler(
            subjects    = subjects,
            teachers    = teachers,
            classes     = classes,
            rooms       = rooms,
            constraints = constraints,
        )
    except SchedulingError as e:
        return jsonify({
            "error":   "Cannot generate timetable — constraints too tight.",
            "reasons": [str(e)],
        }), 422

    return jsonify(result)
