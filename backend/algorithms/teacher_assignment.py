"""
TEACHER ASSIGNMENT — LOAD BALANCING
------------------------------------
When more than one teacher can teach a subject, spread that subject's
classes across all qualified teachers instead of dumping everything on
whichever one happens to be listed first. For each (class, subject) pairing
that needs a teacher, the qualified teacher with the most remaining capacity
(lowest running load so far) is chosen, so cumulative load stays balanced
across everyone qualified instead of overloading a single teacher.
"""


def _periods_for(subject):
    """
    Periods/week one (class, subject) pairing costs. hoursPerWeek is real
    clock-hours for every subject — for labs those hours are just grouped
    into 2-period (2-hour) double sessions rather than single periods, so
    the total period count is the same as hoursPerWeek either way.
    """
    return subject.get("hoursPerWeek", 0)


def sessions_needed(subject):
    """
    Number of session occurrences to schedule for one (class, subject)
    pairing. Lab subjects group their hours into double (2-hour) sessions,
    so hoursPerWeek=2 means ONE double session, not two.
    """
    hours = subject.get("hoursPerWeek", 0)
    return hours // 2 if subject.get("needsLab") else hours


def class_takes(cls, subject):
    """
    Whether a class includes a given subject. A class's `subjectIds` lists
    the courses its branch requires. If it's missing or empty, the class is
    treated as taking every subject — backwards-compatible with older data
    that predates per-class (branch-based) course selection.
    """
    ids = cls.get("subjectIds")
    if not ids:
        return True
    return subject["id"] in ids


def assign_teachers(subjects, teachers, classes):
    """
    Returns dict: (class_id, subject_id) -> teacher dict, for every
    non-elective subject that has at least one qualified teacher and is
    actually taken by that class. Electives are skipped — they're scheduled
    without a dedicated teacher.
    """
    teacher_load = {t["id"]: 0 for t in teachers}
    assignment = {}

    for subj in subjects:
        if subj.get("isElective"):
            continue
        qualified = [t for t in teachers if subj["id"] in t.get("subjects", [])]
        if not qualified:
            continue

        periods_needed = _periods_for(subj)
        for cls in classes:
            if not class_takes(cls, subj):
                continue
            # Prefer teachers who still have room for this subject's load;
            # if nobody fits, fall back to the whole qualified pool so the
            # config still gets an assignment (validation will flag overload).
            fits = [
                t for t in qualified
                if t.get("maxHours") is None
                or teacher_load[t["id"]] + periods_needed <= t["maxHours"]
            ]
            pool = fits if fits else qualified
            chosen = min(pool, key=lambda t: teacher_load[t["id"]])

            assignment[(cls["id"], subj["id"])] = chosen
            teacher_load[chosen["id"]] += periods_needed

    return assignment
