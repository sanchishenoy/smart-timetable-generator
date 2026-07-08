export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const PERIODS = [1, 2, 3, 4, 5, 6];

export const PERIOD_TIMES = {
  1: "9:00 – 10:00 AM",
  2: "10:00 – 11:00 AM",
  3: "11:30 AM – 12:30 PM",
  4: "12:30 – 1:30 PM",
  5: "2:30 – 3:30 PM",
  6: "3:30 – 4:30 PM",
};

// Rendered as a full-width row in the timetable grid right after the given period.
export const BREAKS = [
  { afterPeriod: 2, label: "Short Break", time: "11:00 – 11:30 AM" },
  { afterPeriod: 4, label: "Lunch Break", time: "1:30 – 2:30 PM" },
];
