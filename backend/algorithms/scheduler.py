"""
GREEDY OPTIMIZER + MAIN SCHEDULER
-----------------------------------
Lab subjects require DOUBLE CONSECUTIVE periods on the same day.
Non-lab subjects take single periods as before.

Greedy pre-ordering:
  1. Lab subjects first (harder to place — need two free consecutive slots)
  2. Then by teacher scarcity (fewer free slots → schedule first)
  3. Then by subject demand (more hours/week → schedule first)
"""

import itertools
from .graph_coloring import build_conflict_graph
from .backtracking    import backtrack

DAYS    = list(range(5))    # 0=Mon … 4=Fri
PERIODS = list(range(1, 9)) # Periods 1–8


def get_consecutive_pairs(periods):
    """
    Return all valid consecutive period pairs from the period list.
    e.g. [(1,2), (2,3), (3,4), (4,5), (5,6), (6,7), (7,8)]
    These are the only valid lab slots.
    """
    sorted_p = sorted(periods)
    return [(sorted_p[i], sorted_p[i+1])
            for i in range(len(sorted_p)-1)
            if sorted_p[i+1] == sorted_p[i] + 1]


def run_scheduler(subjects, teachers, classes, rooms, constraints):
    """
    Entry point called by the Flask route.
    Returns a structured timetable dict.
    """

    subject_map = {s["id"]: s for s in subjects}
    teacher_map = {t["id"]: t for t in teachers}

    # ── 1. Build session list ──────────────────────────────────────────────
    # Lab subjects: each occurrence = 1 double period (2 consecutive slots)
    # Non-lab subjects: each occurrence = 1 single period
    sessions = []
    for cls in classes:
        for subj in subjects:
            teacher = next(
                (t for t in teachers if subj["id"] in t["subjects"]), None
            )
            if teacher is None:
                continue

            hours    = subj["hoursPerWeek"]
            is_lab   = subj.get("needsLab", False)

            # Lab: hours/week means number of double-period sessions
            # Non-lab: hours/week means number of single-period sessions
            for i in range(hours):
                sessions.append({
                    "id":         f"{cls['id']}_{subj['id']}_{i}",
                    "class_id":   cls["id"],
                    "class_name": cls["name"],
                    "subject_id": subj["id"],
                    "subject":    subj["name"],
                    "teacher_id": teacher["id"],
                    "teacher":    teacher["name"],
                    "needsLab":   is_lab,
                    "double":     is_lab,  # double period flag
                })

    # ── 2. GREEDY: sort by lab-first, then teacher scarcity, then demand ──
    def greedy_key(s):
        t     = teacher_map[s["teacher_id"]]
        free  = DAYS.__len__() * len(PERIODS) - len(t.get("availability", []))
        hours = subject_map[s["subject_id"]]["hoursPerWeek"]
        is_lab = 1 if s["needsLab"] else 0
        return (-is_lab, free, -hours)
        # lab sessions first (-is_lab), then fewest free slots, then most hours

    sessions.sort(key=greedy_key)

    # ── 3. Build conflict graph ────────────────────────────────────────────
    graph = build_conflict_graph(sessions)

    # ── 4. Color space ─────────────────────────────────────────────────────
    # For single sessions: color = (day, period)
    # For double sessions: color = (day, period1, period2) where period2 = period1+1
    single_colors = list(itertools.product(DAYS, PERIODS))
    consecutive_pairs = get_consecutive_pairs(PERIODS)
    double_colors = [(d, p1, p2) for d in DAYS for p1, p2 in consecutive_pairs]

    # ── 5. Room tracker ────────────────────────────────────────────────────
    room_schedule = {}  # (day, period, room_id) -> True

    def find_room(needs_lab, day, *periods):
        """Find a free lab or classroom for all given periods on a day."""
        for r in rooms:
            if r.get("isLab") == needs_lab or (not needs_lab and not r.get("isLab")):
                # Check room is free for ALL periods needed
                if all((day, p, r["id"]) not in room_schedule for p in periods):
                    for p in periods:
                        room_schedule[(day, p, r["id"])] = True
                    return r
        # Fallback to any free room
        for r in rooms:
            if all((day, p, r["id"]) not in room_schedule for p in periods):
                for p in periods:
                    room_schedule[(day, p, r["id"])] = True
                return r
        return {"id": "?", "name": "TBD"}

    # ── 6. Separate sessions by type and build color lists ─────────────────
    for sess in sessions:
        sess["colors"] = double_colors if sess["double"] else single_colors

    # ── 7. BACKTRACKING solver ─────────────────────────────────────────────
    assignment = backtrack_mixed(sessions, {}, graph, constraints)
    if assignment is None:
        assignment = {}

    # ── 8. Build timetable output ──────────────────────────────────────────
    timetable  = {}
    teacher_tt = {}

    for sess in sessions:
        color = assignment.get(sess["id"])
        if color is None:
            continue

        if sess["double"]:
            day, p1, p2 = color
            room = find_room(sess["needsLab"], day, p1, p2)
            periods_to_fill = [p1, p2]
        else:
            day, period = color
            room = find_room(sess["needsLab"], day, period)
            periods_to_fill = [period]

        for p in periods_to_fill:
            entry = {
                "subject":   sess["subject"],
                "teacher":   sess["teacher"],
                "room":      room["name"],
                "isLab":     sess["needsLab"],
                "isDouble":  sess["double"],
                "classId":   sess["class_id"],
                "className": sess["class_name"],
            }

            # Class-wise
            timetable.setdefault(sess["class_id"], {})
            timetable[sess["class_id"]].setdefault(day, {})
            timetable[sess["class_id"]][day][p] = entry

            # Teacher-wise
            teacher_tt.setdefault(sess["teacher_id"], {})
            teacher_tt[sess["teacher_id"]].setdefault(day, {})
            teacher_tt[sess["teacher_id"]][day][p] = entry

    # Inject fixed constraint slots
    for c in constraints:
        if c.get("type") == "fixed" and c.get("affectsAll"):
            for cls in classes:
                timetable.setdefault(cls["id"], {})
                timetable[cls["id"]].setdefault(c["day"], {})
                timetable[cls["id"]][c["day"]][c["period"]] = {
                    "fixed":       True,
                    "description": c.get("description", "Fixed"),
                }

    return {"classTimetable": timetable, "teacherTimetable": teacher_tt}


def backtrack_mixed(sessions, assignment, graph, constraints):
    """
    Backtracking that handles both single and double period sessions.
    Double period sessions use (day, p1, p2) colors.
    Single period sessions use (day, period) colors.
    """
    if len(assignment) == len(sessions):
        return assignment

    # MRV — pick session with fewest remaining valid colors
    unassigned = [s for s in sessions if s["id"] not in assignment]
    if not unassigned:
        return assignment

    node = min(
        unassigned,
        key=lambda s: len(get_valid_colors(s, assignment, graph, sessions, constraints))
    )

    valid_colors = get_valid_colors(node, assignment, graph, sessions, constraints)

    for color in valid_colors:
        # Assign
        assignment[node["id"]] = color

        result = backtrack_mixed(sessions, assignment, graph, constraints)
        if result is not None:
            return result

        # Backtrack
        del assignment[node["id"]]

    return None


def get_valid_colors(node, assignment, graph, sessions, constraints):
    """
    Get valid colors for a session, considering:
    - Graph edges (same teacher or class conflicts)
    - Hard constraints (fixed slots, teacher unavailability)
    - Double period: both slots must be free
    """
    session_map = {s["id"]: s for s in sessions}
    is_double = node.get("double", False)

    # Collect all slots blocked by graph neighbors
    blocked_single = set()  # (day, period) blocked
    blocked_days_periods = set()  # (day, period) used by any neighbor

    for nbr_id in graph.get(node["id"], set()):
        if nbr_id not in assignment:
            continue
        nbr_color = assignment[nbr_id]
        nbr_sess  = session_map.get(nbr_id, {})

        if nbr_sess.get("double"):
            # Neighbor is a double session occupying (day, p1, p2)
            d, p1, p2 = nbr_color
            blocked_days_periods.add((d, p1))
            blocked_days_periods.add((d, p2))
        else:
            d, p = nbr_color
            blocked_days_periods.add((d, p))

    valid = []

    if is_double:
        for color in node["colors"]:
            d, p1, p2 = color
            # Both periods must be free from conflicts
            if (d, p1) in blocked_days_periods:
                continue
            if (d, p2) in blocked_days_periods:
                continue
            # Check hard constraints for both periods
            if _violates(node, d, p1, constraints):
                continue
            if _violates(node, d, p2, constraints):
                continue
            valid.append(color)
    else:
        for color in node["colors"]:
            d, p = color
            if (d, p) in blocked_days_periods:
                continue
            if _violates(node, d, p, constraints):
                continue
            valid.append(color)

    return valid


def _violates(node, day, period, constraints):
    """Check hard constraints for a single (day, period) slot."""
    for c in constraints:
        if c.get("type") == "fixed" and c.get("affectsAll"):
            if c["day"] == day and c["period"] == period:
                return True
        if c.get("type") == "teacher_unavail":
            if (c.get("teacherId") == node["teacher_id"] and
                    c["day"] == day and c["period"] == period):
                return True
    return False