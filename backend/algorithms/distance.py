"""
INTER-BRANCH DISTANCE
---------------------
Rooms belong to a branch/department, identified by the leading letters of
the room name (e.g. "EC203" -> EC, "IEM304" -> IEM). Rooms whose names start
with "CRB" or "CS" belong to the CS branch. Two rooms in the same branch are
distance 0 apart; distances between different branches come from the matrix
below (symmetric).

Used by the scheduler to keep a class's back-to-back (no break between)
periods physically close: if two consecutive-period classrooms are more than
MAX_CONSECUTIVE_DISTANCE apart, they may not be placed back-to-back.
"""

MAX_CONSECUTIVE_DISTANCE = 2

# Branch codes, in the order shown in the source matrix.
BRANCHES = ["CS", "EC", "EE", "CV", "IEM", "CH", "BT", "AS", "IS"]

# Upper-triangle of the symmetric distance matrix (each row includes the
# diagonal 0). Built into a full symmetric lookup below.
_DIST_ROWS = {
    "CS":  {"CS": 0, "EC": 1, "EE": 2, "CV": 3, "IEM": 5, "CH": 4, "BT": 5, "AS": 5, "IS": 5},
    "EC":  {"EC": 0, "EE": 1, "CV": 2, "IEM": 3, "CH": 1, "BT": 3, "AS": 4, "IS": 4},
    "EE":  {"EE": 0, "CV": 2, "IEM": 3, "CH": 3, "BT": 4, "AS": 4, "IS": 4},
    "CV":  {"CV": 0, "IEM": 5, "CH": 3, "BT": 4, "AS": 5, "IS": 5},
    "IEM": {"IEM": 0, "CH": 2, "BT": 1, "AS": 4, "IS": 4},
    "CH":  {"CH": 0, "BT": 2, "AS": 3, "IS": 3},
    "BT":  {"BT": 0, "AS": 5, "IS": 5},
    "AS":  {"AS": 0, "IS": 0},
    "IS":  {"IS": 0},
}

_DISTANCE = {}
for _a, _row in _DIST_ROWS.items():
    for _b, _d in _row.items():
        _DISTANCE[(_a, _b)] = _d
        _DISTANCE[(_b, _a)] = _d


def branch_distance(a, b):
    """
    Distance between two branches. Unknown/None branches (rooms whose branch
    can't be identified) return 0 so they never block scheduling.
    """
    if not a or not b:
        return 0
    if a == b:
        return 0
    return _DISTANCE.get((a, b), 0)


def room_branch(room):
    """
    Identify a room's branch. Prefers an explicit `department`/`branch` field
    if it is one of the known branch codes; otherwise derives it from the
    leading letters of the room name. Returns None if it can't be identified.
    """
    for field in ("branch", "department"):
        val = (room.get(field) or "").strip().upper()
        if val in _DIST_ROWS:
            return val

    name = (room.get("name") or "").strip().upper()
    if not name:
        return None

    # Special case: CRB and CS rooms are the CS branch.
    if name.startswith("CRB") or name.startswith("CS"):
        return "CS"

    # Leading alphabetic token, e.g. "IEM304" -> "IEM", "EC 203" -> "EC".
    token = ""
    for ch in name:
        if ch.isalpha():
            token += ch
        else:
            break

    if token in _DIST_ROWS:
        return token
    if token[:3] in _DIST_ROWS:
        return token[:3]
    if token[:2] in _DIST_ROWS:
        return token[:2]
    return None
