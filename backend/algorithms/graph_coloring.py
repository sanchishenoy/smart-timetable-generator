"""
GRAPH COLORING
--------------
Model the scheduling problem as a graph:
  Nodes  = (class_id, subject_id, teacher_id) sessions that need placement
  Edges  = conflict pairs — two nodes conflict if they share a teacher,
           share a class, or would require the same room at the same time
  Colors = (day, period) time slots

We build the adjacency list, then the backtracking scheduler uses it
to ensure no two conflicting nodes are assigned the same color.
"""

def build_conflict_graph(sessions):
    """
    sessions: list of dicts with keys class_id, subject_id, teacher_id
    Returns adjacency dict: node_id -> set of conflicting node_ids
    """
    graph = {s["id"]: set() for s in sessions}

    for i in range(len(sessions)):
        for j in range(i + 1, len(sessions)):
            a, b = sessions[i], sessions[j]

            # Two sessions conflict if they share a teacher OR share a class
            conflict = (
                a["teacher_id"] == b["teacher_id"] or
                a["class_id"]   == b["class_id"]
            )

            if conflict:
                graph[a["id"]].add(b["id"])
                graph[b["id"]].add(a["id"])

    return graph


def get_available_colors(node_id, assignment, graph, all_colors):
    """
    Return slots not already used by any neighbor of this node.
    This is the graph-coloring constraint check.
    """
    used = {assignment[nbr] for nbr in graph[node_id] if nbr in assignment}
    return [c for c in all_colors if c not in used]