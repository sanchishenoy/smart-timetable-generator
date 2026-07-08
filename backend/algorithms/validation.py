"""
INPUT VALIDATION / FEASIBILITY CHECKS
-------------------------------------
Before running the scheduler we reject configurations that are illegal or
provably impossible to schedule, so generation fails fast with a clear reason
instead of silently producing a broken / empty timetable.

Checks performed:
  - Required data is present (subjects, teachers, classes, rooms)
  - Every subject has at least one teacher who can teach it
  - Lab subjects exist but no lab room is available
  - A class needs more periods/week than the week physically holds
  - A teacher is allocated more periods than their max (overloaded), or more
    than the week physically holds
  - A class is larger than the biggest room available

`validate_inputs` returns a list of human-readable error strings (empty == OK).
`SchedulingError` is raised by the scheduler when, despite valid inputs, the
constraints are too tight for any conflict-free assignment to exist.
"""

from .teacher_assignment import assign_teachers, class_takes

DAYS_PER_WEEK    = 5    # Mon–Fri
PERIODS_PER_DAY  = 6    # Periods 1–6 (plus a short break and a lunch break)
TOTAL_SLOTS      = DAYS_PER_WEEK * PERIODS_PER_DAY  # 30 slots/week


class SchedulingError(Exception):
    """Raised when valid inputs still cannot be scheduled (constraints too tight)."""
    pass


def _periods_for(subject):
    """
    Periods consumed per week by one (class, subject) pairing. hoursPerWeek
    is real clock-hours for every subject, lab or not — labs just group
    those hours into 2-period double sessions instead of single periods.
    """
    return subject.get("hoursPerWeek", 0)


def validate_inputs(subjects, teachers, classes, rooms, constraints=None):
    """
    Return a list of error messages describing why the timetable cannot be
    generated. An empty list means the configuration is legal.
    """
    errors = []

    # ── 0. Required data present ────────────────────────────────────────────
    if not subjects:
        errors.append("No subjects defined — add at least one subject.")
    if not teachers:
        errors.append("No teachers defined — add at least one teacher.")
    if not classes:
        errors.append("No classes configured — add at least one class.")
    if not rooms:
        errors.append("No rooms available — add at least one room.")

    # Without the core data the remaining checks are meaningless.
    if not (subjects and teachers and classes and rooms):
        return errors

    teacher_map = {t["id"]: t for t in teachers}

    def has_teacher(subj):
        return any(subj["id"] in t.get("subjects", []) for t in teachers)

    def is_schedulable(subj):
        # Electives are scheduled without a dedicated teacher (staffing is
        # decided outside this app), so they don't need has_teacher() to pass.
        return subj.get("isElective") or has_teacher(subj)

    def taken_by_any(subj):
        return any(class_takes(cls, subj) for cls in classes)

    # ── 1. Every non-elective subject a class takes must be teachable ───────
    for s in subjects:
        if taken_by_any(s) and not is_schedulable(s):
            errors.append(
                f"Subject '{s['name']}' has no teacher assigned to teach it."
            )

    # ── 2. Lab subjects need at least one lab room ──────────────────────────
    if any(s.get("needsLab") for s in subjects) and not any(r.get("isLab") for r in rooms):
        errors.append(
            "There are lab subjects but no lab rooms — add at least one lab room."
        )

    # ── 3. Each class's weekly load must fit in the week ────────────────────
    # A class only carries the courses its branch takes (its subjectIds).
    for cls in classes:
        load = sum(
            _periods_for(s) for s in subjects
            if is_schedulable(s) and class_takes(cls, s)
        )
        if load > TOTAL_SLOTS:
            errors.append(
                f"Class '{cls['name']}' needs {load} periods/week but only "
                f"{TOTAL_SLOTS} slots exist ({DAYS_PER_WEEK} days × "
                f"{PERIODS_PER_DAY} periods). Reduce subject hours."
            )

    # ── 4. Teacher workload (mirrors the scheduler's load-balanced assignment) ──
    subject_map  = {s["id"]: s for s in subjects}
    teacher_load = {t["id"]: 0 for t in teachers}
    for (_cls_id, subj_id), teacher in assign_teachers(subjects, teachers, classes).items():
        teacher_load[teacher["id"]] += _periods_for(subject_map[subj_id])

    for tid, load in teacher_load.items():
        t = teacher_map[tid]
        max_hours = t.get("maxHours")

        # a) Overloaded beyond their own declared maximum
        if max_hours is not None and load > max_hours:
            errors.append(
                f"Teacher '{t['name']}' is allocated {load} periods/week but their "
                f"max is {max_hours}. Reduce their subjects/classes or raise max hours."
            )

        # b) Physically impossible — more periods than a week holds
        #    (only report if not already covered by the max-hours message)
        if load > TOTAL_SLOTS and (max_hours is None or max_hours > TOTAL_SLOTS):
            errors.append(
                f"Teacher '{t['name']}' is allocated {load} periods/week but only "
                f"{TOTAL_SLOTS} slots exist in a week — impossible to schedule."
            )

    # ── 5. Every class must fit in some room ────────────────────────────────
    largest_room = max((r.get("capacity", 0) for r in rooms), default=0)
    for cls in classes:
        strength = cls.get("strength", 0)
        if strength > largest_room:
            errors.append(
                f"Class '{cls['name']}' has {strength} students but the largest "
                f"room holds only {largest_room} — no room can accommodate it."
            )

    return errors
