
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Calendar, CheckCircle, XCircle, MinusCircle, X, Save, Eye } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase"; // Adjust path to your Firebase config

interface AttendanceTabProps {
  grade: string;
  students: { fullName: string; stuId: string; section: string }[];
}

interface Student {
  id: number;
  fullName: string;
  stuId: string;
  section: string;
  attendance: { [date: string]: boolean | null };
}

interface AttendanceRecord {
  stuId: string;
  status: boolean | null;
}

export default function AttendanceTab({ grade, students }: AttendanceTabProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [studentData, setStudentData] = useState<Student[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [showSelectDateModal, setShowSelectDateModal] = useState(false);
  const [showFillOutModal, setShowFillOutModal] = useState(false);
  const [fillOutDate, setFillOutDate] = useState<string>("");
  // New: State for history modal and selected student
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentHistory, setStudentHistory] = useState<{ date: string; status: boolean | null }[]>([]);

  const normalizedGrade = grade.toLowerCase().replace(/\s+/g, "");

  // Fetch attendance data from Firestore
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const attendanceDocRef = doc(db, "attendance", normalizedGrade);
        const attendanceDocSnap = await getDoc(attendanceDocRef);

        if (attendanceDocSnap.exists()) {
          const attendanceData = attendanceDocSnap.data().dates || {};
          const fetchedStudents: Student[] = students.map((student, index) => {
            const studentAttendance = Object.keys(attendanceData).reduce((acc, date) => {
              const record = attendanceData[date].find((r: AttendanceRecord) => r.stuId === student.stuId);
              return {
                ...acc,
                [date]: record ? record.status : null,
              };
            }, {});
            return {
              id: index + 1,
              fullName: student.fullName,
              stuId: student.stuId,
              section: student.section,
              attendance: studentAttendance,
            };
          });
          setStudentData(fetchedStudents);
          setDates(Object.keys(attendanceData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()));
        } else {
          setStudentData(
            students.map((student, index) => ({
              id: index + 1,
              fullName: student.fullName,
              stuId: student.stuId,
              section: student.section,
              attendance: {},
            }))
          );
          setDates([]);
        }
      } catch (error) {
        console.error("Error fetching attendance data:", error);
        setStudentData(
          students.map((student, index) => ({
            id: index + 1,
            fullName: student.fullName,
            stuId: student.stuId,
            section: student.section,
            attendance: {},
          }))
        );
        setDates([]);
      }
    };

    if (students.length > 0) {
      fetchAttendanceData();
    } else {
      setStudentData([]);
      setDates([]);
    }
  }, [students, normalizedGrade]);

  // New: Fetch student history when detail icon is clicked
  const fetchStudentHistory = async (student: Student) => {
    try {
      const attendanceDocRef = doc(db, "attendance", normalizedGrade);
      const attendanceDocSnap = await getDoc(attendanceDocRef);

      if (attendanceDocSnap.exists()) {
        const attendanceData = attendanceDocSnap.data().dates || {};
        const history = Object.keys(attendanceData)
          .map((date) => {
            const record = attendanceData[date].find((r: AttendanceRecord) => r.stuId === student.stuId);
            return {
              date,
              status: record ? record.status : null,
            };
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setStudentHistory(history);
        setSelectedStudent(student);
        setShowHistoryModal(true);
      }
    } catch (error) {
      console.error("Error fetching student history:", error);
      alert("Failed to load student history. Please try again.");
    }
  };

  // Extract unique months, dates, and days
  const months = Array.from(
    new Set(dates.map((date) => new Date(date).toLocaleString("en-US", { month: "long", year: "numeric" })))
  );
  const filteredDates = selectedMonth
    ? dates.filter(
        (date) =>
          new Date(date).toLocaleString("en-US", { month: "long", year: "numeric" }) === selectedMonth
      )
    : dates;
  const displayDates = filteredDates.length > 0 ? filteredDates.slice(0, Math.min(3, filteredDates.length)) : [];
  const days = selectedMonth
    ? Array.from(
        new Set(
          dates
            .filter(
              (date) =>
                new Date(date).toLocaleString("en-US", { month: "long", year: "numeric" }) === selectedMonth
            )
            .map((date) => new Date(date).toLocaleString("en-US", { weekday: "long" }))
        )
      )
    : Array.from(new Set(dates.map((date) => new Date(date).toLocaleString("en-US", { weekday: "long" }))));

  // Filter students based on selected filters
  const filteredStudents = studentData.map((student) => ({
    ...student,
    attendance: Object.fromEntries(
      Object.entries(student.attendance).filter(([date]) => {
        const dateObj = new Date(date);
        const monthMatch = selectedMonth
          ? dateObj.toLocaleString("en-US", { month: "long", year: "numeric" }) === selectedMonth
          : true;
        const dateMatch = selectedDate ? date === selectedDate : true;
        const dayMatch = selectedDay
          ? dateObj.toLocaleString("en-US", { weekday: "long" }) === selectedDay
          : true;
        return monthMatch && dateMatch && dayMatch;
      })
    ),
  }));

  // Set attendance status for a student
  const setAttendanceStatus = (studentId: number, date: string, status: boolean | null) => {
    if (!isValidDate(date)) return;

    const student = studentData.find((s) => s.id === studentId);
    if (!student) return;

    const newAttendance = {
      ...student.attendance,
      [date]: status,
    };

    setStudentData((prevStudents) =>
      prevStudents.map((s) =>
        s.id === studentId ? { ...s, attendance: newAttendance } : s
      )
    );

    if (!dates.includes(date)) {
      setDates((prevDates) => [...prevDates, date].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()));
    }
  };

  // Save attendance to Firestore
  const saveAttendance = async () => {
    try {
      const attendanceDocRef = doc(db, "attendance", normalizedGrade);
      const dateRecords: AttendanceRecord[] = studentData.map((student) => ({
        stuId: student.stuId,
        status: student.attendance[fillOutDate] ?? null,
      }));
      await setDoc(
        attendanceDocRef,
        {
          dates: {
            [fillOutDate]: dateRecords,
          },
        },
        { merge: true }
      );
      setShowFillOutModal(false);
      setFillOutDate("");
    } catch (error) {
      console.error("Error saving attendance to Firestore:", error);
      alert("Failed to save attendance. Please try again.");
    }
  };

  // Validate date
  const isValidDate = (date: string) => !isNaN(new Date(date).getTime());

  // Handle date selection
  const handleDateSubmit = () => {
    if (!fillOutDate || !isValidDate(fillOutDate)) {
      alert("Please select a valid date.");
      return;
    }
    setShowSelectDateModal(false);
    setShowFillOutModal(true);
  };

  // Clear filters
  const clearFilters = () => {
    setSelectedMonth("");
    setSelectedDate("");
    setSelectedDay("");
  };

  // Calculate student-specific summary for table
  const getStudentSummary = (student: Student) => {
    const present = Object.entries(student.attendance)
      .filter(([date]) => displayDates.includes(date))
      .filter(([, status]) => status === true).length;
    const absent = Object.entries(student.attendance)
      .filter(([date]) => displayDates.includes(date))
      .filter(([, status]) => status === false).length;
    const notRecorded = Object.entries(student.attendance)
      .filter(([date]) => displayDates.includes(date))
      .filter(([, status]) => status === null).length;
    return { present, absent, notRecorded };
  };

  // New: Calculate summary for Fill Out Attendance modal
  const getFillOutSummary = () => {
    const present = studentData.filter((student) => student.attendance[fillOutDate] === true).length;
    const absent = studentData.filter((student) => student.attendance[fillOutDate] === false).length;
    const notRecorded = studentData.filter((student) => student.attendance[fillOutDate] === null || student.attendance[fillOutDate] === undefined).length;
    return { present, absent, notRecorded };
  };

  // Handle empty state
  if (studentData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">
          Attendance for {grade}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">No students available.</p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      {/* Main content with conditional blur */}
      <motion.div
        className={`transition-all duration-300 ${showHistoryModal ? "blur-md" : ""}`}
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">
          Attendance for {grade}
        </h2>

        {/* Attendance Fill Out Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowSelectDateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
          >
            <Calendar className="w-5 h-5 mr-2" />
            Fill Out Attendance
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-blue-500" />
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDate("");
                setSelectedDay("");
              }}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Months</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedMonth}
            >
              <option value="">All Dates</option>
              {filteredDates.map((date) => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedMonth}
            >
              <option value="">All Days</option>
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
          >
            Clear Filters
          </button>
        </div>

        {/* Student Attendance List with Details column */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Student Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Student ID
                </th>
                {displayDates.length > 0 ? (
                  displayDates.map((date) => (
                    <th
                      key={date}
                      className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200"
                    >
                      {new Date(date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </th>
                  ))
                ) : (
                  <>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Date 1
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Date 2
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Date 3
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Student Summary
                </th>
                {/* New: Details column */}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const { present, absent, notRecorded } = getStudentSummary(student);
                return (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="border-b dark:border-gray-700"
                  >
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{student.fullName}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{student.stuId}</td>
                    {displayDates.length > 0 ? (
                      displayDates.map((date) => (
                        <td key={date} className="px-4 py-3 text-center">
                          {student.attendance[date] === true ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          ) : student.attendance[date] === false ? (
                            <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                          <button
                            onClick={() =>
                              setAttendanceStatus(
                                student.id,
                                date,
                                student.attendance[date] === null
                                  ? true
                                  : student.attendance[date]
                                  ? false
                                  : null
                              )
                            }
                            className="ml-2 text-xs text-blue-500 hover:text-blue-600"
                            aria-label={`Toggle attendance for ${student.fullName} on ${date}`}
                          >
                            Toggle
                          </button>
                        </td>
                      ))
                    ) : (
                      <>
                        <td className="px-4 py-3 text-center text-gray-400">-</td>
                        <td className="px-4 py-3 text-center text-gray-400">-</td>
                        <td className="px-4 py-3 text-center text-gray-400">-</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      P: {present} | A: {absent} | NR: {notRecorded}
                    </td>
                    {/* New: Details icon */}
                    <td className="px-4 py-3 text-center">
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        onClick={() => fetchStudentHistory(student)}
                        className="text-blue-500 hover:text-blue-600"
                        aria-label={`View attendance history for ${student.fullName}`}
                      >
                        <Eye className="w-5 h-5" />
                      </motion.button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Attendance Summary (hardcoded as requested) */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Attendance Summary</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Total: Present: 4 | Absent: 2 | Not Recorded: 0
          </p>
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">Per Student:</h4>
          <ul className="text-gray-600 dark:text-gray-300">
            <li className="mb-1">kk wedajie: P: 2 | A: 1 | NR: 0</li>
          </ul>
        </div>
      </motion.div>

      {/* Select Date Modal */}
      <AnimatePresence>
        {showSelectDateModal && (
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
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Select Date
                </h3>
                <button
                  onClick={() => setShowSelectDateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={fillOutDate}
                  onChange={(e) => setFillOutDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-between gap-2">
                <button
                  onClick={handleDateSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Submit
                </button>
                <button
                  onClick={() => setShowSelectDateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fill Out Attendance Modal with Summary */}
      <AnimatePresence>
        {showFillOutModal && (
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
              className="bg-white dark:bg-gray-800 w-full h-full p-6 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  Fill Out Attendance for{" "}
                  {new Date(fillOutDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={saveAttendance}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center"
                    aria-label="Save attendance"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Save
                  </button>
                  <button
                    onClick={() => setShowFillOutModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label="Close modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Student Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Student ID
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.map((student) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="border-b dark:border-gray-700"
                      >
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{student.fullName}</td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{student.stuId}</td>
                        <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                          {fillOutDate && student.attendance[fillOutDate] === true
                            ? "Present"
                            : student.attendance[fillOutDate] === false
                            ? "Absent"
                            : "Not Recorded"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            <motion.span
                              whileHover={{ scale: 1.2 }}
                              className={`cursor-pointer ${
                                student.attendance[fillOutDate] === true
                                  ? "text-green-500"
                                  : "text-gray-400"
                              } hover:text-green-600 ${
                                !fillOutDate || !isValidDate(fillOutDate)
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              onClick={() => setAttendanceStatus(student.id, fillOutDate, true)}
                              aria-label={`Mark ${student.fullName} as Present on ${fillOutDate}`}
                            >
                              <CheckCircle className="w-5 h-5" />
                            </motion.span>
                            <motion.span
                              whileHover={{ scale: 1.2 }}
                              className={`cursor-pointer ${
                                student.attendance[fillOutDate] === false
                                  ? "text-red-500"
                                  : "text-gray-400"
                              } hover:text-red-600 ${
                                !fillOutDate || !isValidDate(fillOutDate)
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              onClick={() => setAttendanceStatus(student.id, fillOutDate, false)}
                              aria-label={`Mark ${student.fullName} as Absent on ${fillOutDate}`}
                            >
                              <XCircle className="w-5 h-5" />
                            </motion.span>
                            <motion.span
                              whileHover={{ scale: 1.2 }}
                              className={`cursor-pointer ${
                                student.attendance[fillOutDate] === null
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              } hover:text-gray-600 ${
                                !fillOutDate || !isValidDate(fillOutDate)
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              onClick={() => setAttendanceStatus(student.id, fillOutDate, null)}
                              aria-label={`Mark ${student.fullName} as Not Recorded on ${fillOutDate}`}
                            >
                              <MinusCircle className="w-5 h-5" />
                            </motion.span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* New: Summary for Fill Out Attendance */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Summary for {new Date(fillOutDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Present: {getFillOutSummary().present} | Absent: {getFillOutSummary().absent} | Not Recorded: {getFillOutSummary().notRecorded}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New: Student History Modal */}
      <AnimatePresence>
        {showHistoryModal && selectedStudent && (
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
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Attendance History for {selectedStudent.fullName}
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {studentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {studentHistory.map((record, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="text-gray-800 dark:text-gray-200">
                          {new Date(record.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center">
                          {record.status === true ? (
                            <>
                              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                              <span className="text-green-500">Present</span>
                            </>
                          ) : record.status === false ? (
                            <>
                              <XCircle className="w-5 h-5 text-red-500 mr-2" />
                              <span className="text-red-500">Absent</span>
                            </>
                          ) : (
                            <>
                              <MinusCircle className="w-5 h-5 text-gray-400 mr-2" />
                              <span className="text-gray-400">Not Recorded</span>
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300">No attendance history available.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
