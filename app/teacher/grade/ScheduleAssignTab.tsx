"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Calendar, Edit, X } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase"; // Adjust path to your Firebase config

interface ScheduleAssignTabProps {
  grade: string;
}

interface Schedule {
  [day: string]: { [timeSlot: string]: string }; // e.g., { "Monday": { "08:00-09:00": "Math" } }
}

interface Course {
  name: string;
  students: string[];
}

export default function ScheduleAssignTab({ grade }: ScheduleAssignTabProps) {
  // Current time in EAT (07:13 PM, August 13, 2025)
  const currentTime = "19:13";

  // Sample schedule data (initial state, to be updated by Firestore)
  const [schedule, setSchedule] = useState<Schedule>({
    Monday: {},
    Tuesday: {},
    Wednesday: {},
    Thursday: {},
    Friday: {},
    Saturday: {},
    Sunday: {},
  });

  const [courses, setCourses] = useState<string[]>(["-"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [startTime, setStartTime] = useState<string>(currentTime);
  const [endTime, setEndTime] = useState<string>("");
  const [breakTime, setBreakTime] = useState<string>("");
  const [lunchTime, setLunchTime] = useState<string>("12:00");
  const [coursesBeforeBreak, setCoursesBeforeBreak] = useState<number>(2);
  const [coursesAfterBreak, setCoursesAfterBreak] = useState<number>(2);
  const [format, setFormat] = useState<string>("Full-time");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]);

  // Days of the week
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Toggle day selection
  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Toggle all days
  const toggleAllDays = () => {
    setSelectedDays((prev) =>
      prev.length === days.length ? [] : [...days]
    );
  };

  // Fetch courses and schedule from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch courses
        const coursesDocRef = doc(db, "courses", grade.toLowerCase().replace(/\s+/g, ""));
        const coursesDocSnap = await getDoc(coursesDocRef);

        if (coursesDocSnap.exists()) {
          const data = coursesDocSnap.data();
          const fetchedCourses = (data.courses || []).map((course: Course) => course.name);
          setCourses(["-", ...fetchedCourses]);
        } else {
          setCourses(["-"]);
          setError("No courses found for this grade.");
        }

        // Fetch schedule
        const scheduleDocRef = doc(db, "schedules", grade.toLowerCase().replace(/\s+/g, ""));
        const scheduleDocSnap = await getDoc(scheduleDocRef);

        if (scheduleDocSnap.exists()) {
          const fetchedSchedule = scheduleDocSnap.data().weeklySchedule || {};
          setSchedule((prev) => ({
            ...prev,
            ...fetchedSchedule,
          }));
          const allTimeSlots = new Set<string>();
          Object.values(fetchedSchedule).forEach((daySchedule: any) => {
            Object.keys(daySchedule).forEach((slot) => allTimeSlots.add(slot));
          });
          setTimeSlots(Array.from(allTimeSlots).sort());
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load courses or schedule. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [grade]);

  // Update time slots based on format and time parameters
  useEffect(() => {
    const updateTimeSlots = () => {
      const newTimeSlots = generateTimeSlots(
        startTime || "08:00",
        endTime || "15:00",
        breakTime || "11:00",
        lunchTime || "12:00",
        coursesBeforeBreak,
        coursesAfterBreak
      );
      setTimeSlots(newTimeSlots.sort());

      // Update schedule to align with new time slots
      const updatedSchedule = { ...schedule };
      days.forEach((day) => {
        const newDaySchedule: { [key: string]: string } = {};
        newTimeSlots.forEach((slot) => {
          newDaySchedule[slot] = schedule[day][slot] || (slot.includes("Break") || slot.includes("Lunch") ? slot.split("-").pop()! : "-");
        });
        updatedSchedule[day] = newDaySchedule;
      });
      setSchedule(updatedSchedule);
    };

    updateTimeSlots();
  }, [startTime, endTime, breakTime, lunchTime, coursesBeforeBreak, coursesAfterBreak]);

  // Calculate schedule summary
  const calculateScheduleSummary = () => {
    let totalHours = 0;
    const uniqueSubjects = new Set<string>();

    days.forEach((day) => {
      timeSlots.forEach((slot) => {
        const subject = schedule[day][slot];
        if (subject && subject !== "-") {
          totalHours++;
          uniqueSubjects.add(subject);
        }
      });
    });

    return {
      totalHours,
      uniqueSubjects: uniqueSubjects.size,
    };
  };

  // Generate time slots based on format
  const generateTimeSlots = (
    start: string,
    end: string,
    breakTime: string,
    lunchTime: string,
    coursesBefore: number,
    coursesAfter: number
  ) => {
    const timeSlots: string[] = [];
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    const [breakHour, breakMinute] = breakTime.split(":").map(Number);
    const [lunchHour, lunchMinute] = lunchTime.split(":").map(Number);

    let currentHour = startHour;
    let currentMinute = startMinute;

    const addTimeSlot = (hours: number, minutes: number) => {
      const nextHour = (hours + 1) % 24;
      const slot = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}-${nextHour.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
      timeSlots.push(slot);
      return nextHour;
    };

    // Add courses before break
    for (let i = 0; i < coursesBefore; i++) {
      if (currentHour >= endHour && currentMinute >= endMinute) break;
      if (currentHour === breakHour && currentMinute === breakMinute) break;
      if (currentHour === lunchHour && currentMinute === lunchMinute) break;
      currentHour = addTimeSlot(currentHour, currentMinute);
    }

    // Add break
    if (breakTime && currentHour <= breakHour && breakHour < endHour) {
      timeSlots.push(
        `${currentHour.toString().padStart(2, "0")}:${currentMinute
          .toString()
          .padStart(2, "0")}-Break`
      );
      currentHour = breakHour;
      currentMinute = breakMinute;
    }

    // Add courses between break and lunch
    while (currentHour < lunchHour && currentHour < endHour) {
      currentHour = addTimeSlot(currentHour, currentMinute);
    }

    // Add lunch
    if (lunchTime && currentHour <= lunchHour && lunchHour < endHour) {
      timeSlots.push(
        `${lunchHour.toString().padStart(2, "0")}:${lunchMinute
          .toString()
          .padStart(2, "0")}-Lunch`
      );
      currentHour = lunchHour + 1;
    }

    // Add courses after lunch
    for (let i = 0; i < coursesAfter; i++) {
      if (currentHour >= endHour && currentMinute >= endMinute) break;
      currentHour = addTimeSlot(currentHour, currentMinute);
    }

    return timeSlots.sort();
  };

  // Handle assigning a subject to a time slot
  const assignSubject = async () => {
    if (!selectedDay || !selectedSubject) {
      alert("Please select a day and subject.");
      return;
    }

    try {
      // Update local state
      setSchedule((prev) => {
        const updatedDaySchedule = { ...prev[selectedDay] };
        updatedDaySchedule[selectedTimeSlot] = selectedSubject;
        return {
          ...prev,
          [selectedDay]: updatedDaySchedule,
        };
      });

      // Save to Firestore
      const scheduleDocRef = doc(db, "schedules", grade.toLowerCase().replace(/\s+/g, ""));
      await setDoc(
        scheduleDocRef,
        {
          weeklySchedule: {
            [selectedDay]: schedule[selectedDay],
          },
        },
        { merge: true }
      );

      setShowAssignModal(false);
      setSelectedDay("");
      setSelectedTimeSlot("");
      setSelectedSubject("");
    } catch (err) {
      console.error("Error saving schedule:", err);
      alert("Failed to save schedule. Please try again.");
    }
  };

  // Handle saving the entire schedule
  const saveSchedule = async () => {
    try {
      const scheduleDocRef = doc(db, "schedules", grade.toLowerCase().replace(/\s+/g, ""));
      await setDoc(scheduleDocRef, { weeklySchedule: schedule }, { merge: true });
      alert("Schedule saved successfully!");
    } catch (err) {
      console.error("Error saving schedule:", err);
      alert("Failed to save schedule. Please try again.");
    }
  };

  // Handle exporting the schedule as JSON
  const exportSchedule = () => {
    try {
      const scheduleJson = JSON.stringify(schedule, null, 2);
      const blob = new Blob([scheduleJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${grade.replace(/\s+/g, "_")}_schedule.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting schedule:", err);
      alert("Failed to export schedule. Please try again.");
    }
  };

  // Handle saving format settings
  const saveFormatSettings = async () => {
    if (!startTime || !endTime || !breakTime || !lunchTime || selectedDays.length === 0) {
      alert("Please provide start time, end time, break time, lunch time, and select at least one day.");
      return;
    }

    try {
      // Update schedule for selected days based on new time slots
      const newTimeSlots = generateTimeSlots(
        startTime,
        endTime,
        breakTime,
        lunchTime,
        coursesBeforeBreak,
        coursesAfterBreak
      );
      const updatedSchedule = { ...schedule };
      selectedDays.forEach((day) => {
        const newDaySchedule: { [key: string]: string } = {};
        newTimeSlots.forEach((slot) => {
          newDaySchedule[slot] = schedule[day][slot] || (slot.includes("Break") || slot.includes("Lunch") ? slot.split("-").pop()! : "-");
        });
        updatedSchedule[day] = newDaySchedule;
      });

      setSchedule(updatedSchedule);
      setTimeSlots(newTimeSlots.sort());

      // Save to Firestore
      const scheduleDocRef = doc(db, "schedules", grade.toLowerCase().replace(/\s+/g, ""));
      await setDoc(scheduleDocRef, { weeklySchedule: updatedSchedule }, { merge: true });

      setShowFormatModal(false);
    } catch (err) {
      console.error("Error saving format settings:", err);
      alert("Failed to save format settings. Please try again.");
    }
  };

  // Open assign modal
  const openAssignModal = (day: string, timeSlot: string) => {
    setSelectedDay(day);
    setSelectedTimeSlot(timeSlot);
    setSelectedSubject(schedule[day][timeSlot] || "-");
    setShowAssignModal(true);
  };

  // Handle loading and error states
  if (loading) {
    return (
      <motion.div
        key="schedule"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-white rounded-xl shadow-lg"
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
          Schedule Assign for {grade}
        </h2>
        <p className="text-gray-600">Loading...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        key="schedule"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-white rounded-xl shadow-lg"
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
          Schedule Assign for {grade}
        </h2>
        <p className="text-red-500">{error}</p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <motion.div
        key="schedule"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`p-6 bg-white rounded-xl shadow-lg transition-all duration-300 ${
          showAssignModal || showFormatModal ? "blur-md" : ""
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Schedule Assign for {grade}
          </h2>
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={saveSchedule}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              Save Schedule
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={exportSchedule}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
              Export Schedule
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowFormatModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Change Schedule Format
            </motion.button>
          </div>
        </div>

        {/* Schedule Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 p-4 bg-gray-50 rounded-lg"
        >
          <h3 className="text-lg font-medium text-gray-800 mb-2">Schedule Summary</h3>
          <p className="text-gray-600">
            Total Scheduled Hours: {calculateScheduleSummary().totalHours} | Unique Courses/Activities: {calculateScheduleSummary().uniqueSubjects}
          </p>
          <p className="text-gray-600 mt-2">Current Format: {format}</p>
        </motion.div>

        {/* Schedule Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Day
                </th>
                {timeSlots.map((slot) => (
                  <th
                    key={slot}
                    className="px-4 py-3 text-center text-sm font-semibold text-gray-700"
                  >
                    {slot.includes("Break") || slot.includes("Lunch") ? slot.split("-").pop() : slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <motion.tr
                  key={day}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-gray-800">{day}</td>
                  {timeSlots.map((slot) => (
                    <td key={`${day}-${slot}`} className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-gray-800">{schedule[day][slot] || "-"}</span>
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          onClick={() => openAssignModal(day, slot)}
                          className="text-blue-500 hover:text-blue-600"
                          aria-label={`Edit schedule for ${day} at ${slot}`}
                        >
                          <Edit className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Assign Course Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  Assign Schedule for {selectedDay} at {selectedTimeSlot}
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course/Activity
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {courses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between gap-2">
                <button
                  onClick={assignSubject}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Format Modal */}
      <AnimatePresence>
        {showFormatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  Change Schedule Format
                </h3>
                <button
                  onClick={() => setShowFormatModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Days
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <input
                      type="checkbox"
                      checked={selectedDays.length === days.length}
                      onChange={toggleAllDays}
                      className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 font-medium">All Days</span>
                  </label>
                  {days.map((day) => (
                    <label
                      key={day}
                      className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDays.includes(day)}
                        onChange={() => toggleDay(day)}
                        className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-700 font-medium">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Night">Night</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Break Time
                  </label>
                  <input
                    type="time"
                    value={breakTime}
                    onChange={(e) => setBreakTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lunch Time
                  </label>
                  <input
                    type="time"
                    value={lunchTime}
                    onChange={(e) => setLunchTime(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Courses Before Break
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={coursesBeforeBreak}
                    onChange={(e) => setCoursesBeforeBreak(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Courses After Break
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={coursesAfterBreak}
                    onChange={(e) => setCoursesAfterBreak(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-between gap-2 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={saveFormatSettings}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Save
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowFormatModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}