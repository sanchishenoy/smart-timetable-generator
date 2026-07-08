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
from .graph_coloring     import build_conflict_graph
from .backtracking       import backtrack
from .validation         import SchedulingError
from .teacher_assignment import assign_teachers, sessions_needed, class_takes
from .distance            import branch_distance, room_branch, MAX_CONSECUTIVE_DISTANCE

DAYS    = list(range(5))    # 0=Mon … 4=Fri
PERIODS = list(range(1, 7)) # Periods 1–6

# Sentinel class_id used for elective sessions — they aren't tied to one
# class, they block every class's slot simultaneously and get replicated
# into every class's timetable once solved.
ELECTIVE_CLASS_ID = "ALL"

# Periods are grouped into blocks separated by breaks (short break after
# period 2, lunch after period 4). A double/lab session may only span two
# periods within the same block — otherwise the "double period" would be
# split by a break.
#   P1 09:00-10:00 | P2 10:00-11:00 | break | P3 11:30-12:30 | P4 12:30-1:30
#   | break | P5 2:30-3:30 | P6 3:30-4:30
PERIOD_BLOCKS = [[1, 2], [3, 4], [5, 6]]


def get_consecutive_pairs(blocks):
    """
    Return valid consecutive period pairs for double periods — only pairs
    within the same contiguous block, since a break between blocks means
    those periods aren't actually back-to-back.
    e.g. [(1,2), (3,4), (5,6)]
    """
    pairs = []
    for block in blocks:
        sorted_p = sorted(block)
        pairs.extend(
            (sorted_p[i], sorted_p[i + 1])
            for i in range(len(sorted_p) - 1)
        )
    return pairs


# Pairs of periods that are back-to-back with no break between them — reused
# both for lab double periods and for the "max 2 same-subject sessions per
# day, must be consecutive" rule below.
BACK_TO_BACK_PAIRS = {
    frozenset(pair) for pair in get_consecutive_pairs(PERIOD_BLOCKS)
}


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

    # Elective subjects (e.g. open electives) have no assigned teacher and are
    # scheduled once for the whole school — every class does the same
    # elective at the same slot, replicated into every class's timetable
    # after solving (see ELECTIVE_CLASS_ID below).
    for subj in subjects:
        if not subj.get("isElective"):
            continue
        is_lab = subj.get("needsLab", False)
        for i in range(sessions_needed(subj)):
            sessions.append({
                "id":         f"ELECTIVE_{subj['id']}_{i}",
                "class_id":   ELECTIVE_CLASS_ID,
                "class_name": "All Classes",
                "subject_id": subj["id"],
                "subject":    subj["name"],
                "teacher_id": None,
                "teacher":    "TBA",
                "needsLab":   is_lab,
                "double":     is_lab,
            })

    teacher_assignment = assign_teachers(subjects, teachers, classes)

    for cls in classes:
        for subj in subjects:
            if subj.get("isElective"):
                continue
            if not class_takes(cls, subj):
                continue
            teacher = teacher_assignment.get((cls["id"], subj["id"]))
            if teacher is None:
                continue

            is_lab = subj.get("needsLab", False)

            # Lab: hoursPerWeek hours grouped into double (2-hour) sessions
            # Non-lab: hoursPerWeek single-period sessions
            for i in range(sessions_needed(subj)):
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

    # ── 2. GREEDY: sort by elective-first, then lab-first, then teacher
    #      scarcity, then demand ──────────────────────────────────────────
    def greedy_key(s):
        is_elective = 1 if s["class_id"] == ELECTIVE_CLASS_ID else 0
        if is_elective:
            free = 0  # electives block every class at once — schedule first
        else:
            t    = teacher_map[s["teacher_id"]]
            free = DAYS.__len__() * len(PERIODS) - len(t.get("availability", []))
        hours = subject_map[s["subject_id"]]["hoursPerWeek"]
        is_lab = 1 if s["needsLab"] else 0
        return (-is_elective, -is_lab, free, -hours)
        # electives first (-is_elective), then labs (-is_lab), then fewest
        # free slots, then most hours

    sessions.sort(key=greedy_key)

    # ── 3. Build conflict graph ────────────────────────────────────────────
    graph = build_conflict_graph(sessions)

    # ── 4. Color space ─────────────────────────────────────────────────────
    # For single sessions: color = (day, period)
    # For double sessions: color = (day, period1, period2) where period2 = period1+1
    single_colors = list(itertools.product(DAYS, PERIODS))
    consecutive_pairs = get_consecutive_pairs(PERIOD_BLOCKS)
    double_colors = [(d, p1, p2) for d in DAYS for p1, p2 in consecutive_pairs]

    # ── 5. Room tracker ────────────────────────────────────────────────────
    room_schedule = {}  # (day, period, room_id) -> True

    def pick_room(needs_lab, day, periods, prev_branch):
        """
        Choose a free room for a session, preferring rooms close to the
        class's previous back-to-back period so students/teachers don't walk
        far. `prev_branch` is the branch of the room used in the immediately
        preceding (same-block) period, or None when there's no back-to-back
        predecessor (block start, after a break, or an elective/free slot).

        Rooms within MAX_CONSECUTIVE_DISTANCE of prev_branch are required when
        any exist; otherwise we fall back to the nearest available room.
        """
        matching = [
            r for r in rooms
            if bool(r.get("isLab")) == bool(needs_lab)
            and all((day, p, r["id"]) not in room_schedule for p in periods)
        ]
        # If no room of the right type is free, fall back to any free room.
        candidates = matching or [
            r for r in rooms
            if all((day, p, r["id"]) not in room_schedule for p in periods)
        ]
        if not candidates:
            return {"id": "?", "name": "TBD"}

        # Sort by walking distance from the previous period, then room order
        # (keeps a class in low-numbered "home" rooms when unconstrained).
        candidates.sort(key=lambda r: (branch_distance(room_branch(r), prev_branch), rooms.index(r)))

        if prev_branch:
            within = [
                r for r in candidates
                if branch_distance(room_branch(r), prev_branch) <= MAX_CONSECUTIVE_DISTANCE
            ]
            chosen = within[0] if within else candidates[0]
        else:
            chosen = candidates[0]

        for p in periods:
            room_schedule[(day, p, chosen["id"])] = True
        return chosen

    # ── 6. Separate sessions by type and build color lists ─────────────────
    for sess in sessions:
        sess["colors"] = double_colors if sess["double"] else single_colors

    # ── 7. BACKTRACKING solver ─────────────────────────────────────────────
    assignment = backtrack_mixed(sessions, {}, graph, constraints)
    if assignment is None or len(assignment) < len(sessions):
        placed = 0 if assignment is None else len(assignment)
        raise SchedulingError(
            f"No conflict-free timetable exists for this configuration "
            f"({placed}/{len(sessions)} sessions could be placed). "
            f"The constraints are too tight — e.g. conflicting fixed slots, "
            f"teacher unavailability, or too many sessions for the available time."
        )

    # ── 8. Build timetable output ──────────────────────────────────────────
    timetable  = {}
    teacher_tt = {}
    # Branch of the room each class occupies per (day, period), so the room
    # picker can enforce the back-to-back distance rule against the previous
    # period. Electives/free slots leave a gap here (→ no distance constraint).
    class_room_branch = {}  # class_id -> {(day, period): branch}

    placed = [s for s in sessions if assignment.get(s["id"]) is not None]
    elective_placed = [s for s in placed if s["class_id"] == ELECTIVE_CLASS_ID]
    real_placed     = [s for s in placed if s["class_id"] != ELECTIVE_CLASS_ID]

    # 8a. Electives — one shared slot, "Various" room (students split across
    #     elective venues), replicated into every class that takes them.
    for sess in elective_placed:
        color = assignment[sess["id"]]
        day, periods_to_fill = color[0], list(color[1:])
        elective_subj = subject_map[sess["subject_id"]]
        target_class_ids = [cls["id"] for cls in classes if class_takes(cls, elective_subj)]
        for p in periods_to_fill:
            entry = {
                "subject":    sess["subject"],
                "teacher":    sess["teacher"],
                "room":       "Various",
                "isLab":      sess["needsLab"],
                "isDouble":   sess["double"],
                "isElective": True,
                "classId":    sess["class_id"],
                "className":  sess["class_name"],
            }
            for cid in target_class_ids:
                timetable.setdefault(cid, {}).setdefault(day, {})[p] = entry

    # 8b. Real sessions — assign rooms per class in (day, period) order so the
    #     distance rule can look back at the previous back-to-back period.
    real_placed.sort(key=lambda s: (
        s["class_id"], assignment[s["id"]][0], assignment[s["id"]][1]
    ))
    for sess in real_placed:
        color = assignment[sess["id"]]
        cid = sess["class_id"]
        if sess["double"]:
            day, p1, p2 = color
            periods_to_fill, start = [p1, p2], p1
        else:
            day, period = color
            periods_to_fill, start = [period], period

        # Distance is only constrained against an immediately preceding period
        # in the SAME block (a genuine back-to-back with no break between).
        prev_branch = None
        if frozenset((start - 1, start)) in BACK_TO_BACK_PAIRS:
            prev_branch = class_room_branch.get(cid, {}).get((day, start - 1))

        room = pick_room(sess["needsLab"], day, periods_to_fill, prev_branch)
        branch = room_branch(room)

        for p in periods_to_fill:
            class_room_branch.setdefault(cid, {})[(day, p)] = branch
            entry = {
                "subject":    sess["subject"],
                "teacher":    sess["teacher"],
                "room":       room["name"],
                "isLab":      sess["needsLab"],
                "isDouble":   sess["double"],
                "isElective": False,
                "classId":    cid,
                "className":  sess["class_name"],
            }
            timetable.setdefault(cid, {}).setdefault(day, {})[p] = entry
            teacher_tt.setdefault(sess["teacher_id"], {}).setdefault(day, {})[p] = entry

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
        max_labs_per_day = _get_max_labs_per_day(constraints)
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
            if max_labs_per_day is not None and not _lab_day_limit_ok(
                node, d, assignment, session_map, max_labs_per_day
            ):
                continue
            valid.append(color)
    else:
        for color in node["colors"]:
            d, p = color
            if (d, p) in blocked_days_periods:
                continue
            if _violates(node, d, p, constraints):
                continue
            if not _same_subject_day_limit_ok(node, d, p, assignment, session_map):
                continue
            valid.append(color)

    return _layout_preference_sort(valid, node, assignment, session_map)


def _layout_preference_sort(valid, node, assignment, session_map):
    """
    Reorder the (already-valid) candidate slots so the solver prefers a
    nicer-shaped timetable. Ordering key per slot:
      1. earliest period first — mornings fill before afternoons, so once a
         class's weekly load is placed the later periods stay free, giving
         early finishes / half days (till 12:30 after P3 or 1:30 after P4);
      2. among equal periods, the day this class currently has the FEWEST
         periods on — spreads load across all five days (no empty days) and
         keeps each day packed contiguously from the first period.
    This only reorders valid colors, so correctness is unchanged; it just
    biases which conflict-free solution the backtracker lands on first.
    """
    class_day_load = {}
    for sess_id, col in assignment.items():
        s = session_map.get(sess_id)
        if s is None or s.get("class_id") != node.get("class_id"):
            continue
        day = col[0]
        class_day_load[day] = class_day_load.get(day, 0) + (2 if s.get("double") else 1)

    # color[1] is the (first) period; color[0] is the day.
    valid.sort(key=lambda color: (color[1], class_day_load.get(color[0], 0), color[0]))
    return valid


def _get_max_labs_per_day(constraints):
    """
    User-configurable cap from a "max_labs_per_day" constraint — the most
    restrictive value wins if more than one was added. None means uncapped.
    """
    caps = [
        c.get("maxCount", 1) for c in constraints
        if c.get("type") == "max_labs_per_day"
    ]
    return min(caps) if caps else None


def _lab_day_limit_ok(node, day, assignment, session_map, max_labs_per_day):
    """A class may have at most `max_labs_per_day` lab (double-period) sessions on a given day."""
    count = 0
    for sess_id, color in assignment.items():
        sess = session_map.get(sess_id)
        if sess is None or sess["id"] == node["id"] or not sess.get("double"):
            continue
        if sess["class_id"] != node["class_id"]:
            continue
        if color[0] == day:
            count += 1
    return count < max_labs_per_day


def _same_subject_day_limit_ok(node, day, period, assignment, session_map):
    """
    A non-lab subject may appear at most twice on the same day for a given
    class, and if it appears twice, the two periods must be back-to-back
    (no break between them).
    """
    same_subject_periods = []
    for sess_id, color in assignment.items():
        sess = session_map.get(sess_id)
        if sess is None or sess["id"] == node["id"] or sess.get("double"):
            continue
        if sess["class_id"] != node["class_id"] or sess["subject_id"] != node["subject_id"]:
            continue
        if color[0] == day:
            same_subject_periods.append(color[1])

    if len(same_subject_periods) >= 2:
        return False
    if len(same_subject_periods) == 1:
        return frozenset((same_subject_periods[0], period)) in BACK_TO_BACK_PAIRS
    return True


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