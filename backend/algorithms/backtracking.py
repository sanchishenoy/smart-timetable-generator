"""
BACKTRACKING — kept for reference.
Main backtracking logic has moved to scheduler.py as backtrack_mixed
to support both single and double period sessions natively.
"""

from .graph_coloring import get_available_colors


def select_unassigned(sessions, assignment, graph, all_colors):
    """MRV heuristic — choose session with fewest remaining valid colors."""
    unassigned = [s for s in sessions if s["id"] not in assignment]
    if not unassigned:
        return None
    return min(
        unassigned,
        key=lambda s: len(get_available_colors(s["id"], assignment, graph, all_colors))
    )


def backtrack(sessions, assignment, graph, all_colors, constraints):
    """
    Standard single-period backtracking.
    For mixed single/double sessions use backtrack_mixed in scheduler.py.
    """
    if len(assignment) == len(sessions):
        return assignment

    node = select_unassigned(sessions, assignment, graph, all_colors)
    if node is None:
        return assignment

    colors = get_available_colors(node["id"], assignment, graph, all_colors)

    for color in colors:
        day, period = color
        if violates_constraints(node, day, period, constraints):
            continue

        assignment[node["id"]] = color
        result = backtrack(sessions, assignment, graph, all_colors, constraints)
        if result is not None:
            return result
        del assignment[node["id"]]

    return None


def violates_constraints(node, day, period, constraints):
    """Check hard constraints for a single period slot."""
    for c in constraints:
        if c["type"] == "fixed" and c.get("affectsAll"):
            if c["day"] == day and c["period"] == period:
                return True
        if c["type"] == "teacher_unavail":
            if (c["teacherId"] == node["teacher_id"] and
                    c["day"] == day and c["period"] == period):
                return True
    return False