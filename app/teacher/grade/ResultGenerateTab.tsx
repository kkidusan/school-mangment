
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Calendar, Eye, X } from "lucide-react";

interface ResultGenerateTabProps {
  grade: string;
}

interface StudentResult {
  [subject: string]: number; // e.g., { Math: 85, Science: 90, English: 88 }
}

interface Student {
  fullName: string;
  stuId: string;
  section: string;
  results: { [date: string]: StudentResult }; // e.g., { "2025-08-01": { Math: 85, ... } }
}

export default function ResultGenerateTab({ grade }: ResultGenerateTabProps) {
  // Sample data
  const [students] = useState<Student[]>([
    {
      fullName: "kk wedajie",
      stuId: "S001",
      section: "A",
      results: {
        "2025-08-01": { Math: 85, Science: 90, English: 88 },
        "2025-08-02": { Math: 78, Science: 82, English: 80 },
      },
    },
    {
      fullName: "keb",
      stuId: "S002",
      section: "A",
      results: {
        "2025-08-01": { Math: 92, Science: 87, English: 85 },
        "2025-08-02": { Math: 88, Science: 90, English: 86 },
      },
    },
    {
      fullName: "Alice Johnson",
      stuId: "S003",
      section: "A",
      results: {
        "2025-08-01": { Math: 75, Science: 70, English: 72 },
        "2025-08-02": { Math: 80, Science: 78, English: 76 },
      },
    },
    {
      fullName: "Bob Smith",
      stuId: "S004",
      section: "A",
      results: {
        "2025-08-01": { Math: 95, Science: 93, English: 90 },
        "2025-08-02": { Math: 90, Science: 88, English: 92 },
      },
    },
    {
      fullName: "Clara Brown",
      stuId: "S005",
      section: "A",
      results: {
        "2025-08-01": { Math: 65, Science: 68, English: 70 },
        "2025-08-02": { Math: 70, Science: 72, English: 68 },
      },
    },
  ]);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Get unique dates from all students' results
  const allDates = Array.from(
    new Set(
      students.flatMap((student) => Object.keys(student.results)).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      )
    )
  );

  // Filter students based on date range
  const filteredStudents = students.map((student) => ({
    ...student,
    results: Object.fromEntries(
      Object.entries(student.results).filter(([date]) => {
        if (!startDate || !endDate) return true;
        const dateObj = new Date(date);
        return dateObj >= new Date(startDate) && dateObj <= new Date(endDate);
      })
    ),
  }));

  // Calculate total, average, and grade for a student's results on a date
  const calculateResultMetrics = (result: StudentResult) => {
    const subjects = ["Math", "Science", "English"];
    const total = subjects.reduce((sum, subject) => sum + (result[subject] || 0), 0);
    const average = total / subjects.length;
    const grade =
      average >= 90 ? "A" : average >= 80 ? "B" : average >= 70 ? "C" : average >= 60 ? "D" : "F";
    return { total, average: Number(average.toFixed(2)), grade };
  };

  // Calculate class summary
  const calculateClassSummary = () => {
    let totalAverage = 0;
    let passCount = 0;
    let studentCount = 0;

    filteredStudents.forEach((student) => {
      Object.values(student.results).forEach((result) => {
        const { average, grade } = calculateResultMetrics(result);
        totalAverage += average;
        if (grade !== "F") passCount++;
        studentCount++;
      });
    });

    return {
      averageScore: studentCount > 0 ? Number((totalAverage / studentCount).toFixed(2)) : 0,
      passRate: studentCount > 0 ? Number(((passCount / studentCount) * 100).toFixed(2)) : 0,
      studentCount,
    };
  };

  // Handle details modal
  const openDetailsModal = (student: Student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  // Validate date range
  const isValidDateRange = () => {
    if (!startDate || !endDate) return true;
    return new Date(startDate) <= new Date(endDate);
  };

  // Handle empty state
  if (students.length === 0) {
    return (
      <motion.div
        key="results"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
      >
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Result Generate for {grade}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">No students available.</p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <motion.div
        key="results"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 ${
          showDetailsModal ? "blur-md" : ""
        }`}
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">
          Result Generate for {grade}
        </h2>

        {/* Date Range Picker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-blue-500" />
            <label className="text-gray-700 dark:text-gray-300">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-gray-700 dark:text-gray-300">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
          >
            Clear Dates
          </button>
        </div>

        {/* Class Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Class Summary</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Average Score: {calculateClassSummary().averageScore} | Pass Rate: {calculateClassSummary().passRate}% | Total Results: {calculateClassSummary().studentCount}
          </p>
        </motion.div>

        {/* Results Table */}
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
                  Math
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Science
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  English
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Average
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Grade
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                // Use the first available result for table display (or average across dates if multiple)
                const resultDates = Object.keys(student.results);
                const latestResult = resultDates.length > 0 ? student.results[resultDates[0]] : {};
                const { total, average, grade } = resultDates.length > 0 ? calculateResultMetrics(latestResult) : { total: 0, average: 0, grade: "-" };
                return (
                  <motion.tr
                    key={student.stuId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{student.fullName}</td>
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{student.stuId}</td>
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      {latestResult.Math || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      {latestResult.Science || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      {latestResult.English || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      {total || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      {average || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      {grade}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        onClick={() => openDetailsModal(student)}
                        className="text-blue-500 hover:text-blue-600"
                        aria-label={`View result details for ${student.fullName}`}
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
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedStudent && (
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
                  Result History for {selectedStudent.fullName}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  aria-label="Close modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {Object.keys(selectedStudent.results).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(selectedStudent.results)
                      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                      .map(([date, result], index) => {
                        const { total, average, grade } = calculateResultMetrics(result);
                        return (
                          <div
                            key={index}
                            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-800 dark:text-gray-200 font-medium">
                                {new Date(date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="text-gray-600 dark:text-gray-300">
                                Grade: {grade}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <p className="text-gray-600 dark:text-gray-300">
                                Math: {result.Math}
                              </p>
                              <p className="text-gray-600 dark:text-gray-300">
                                Science: {result.Science}
                              </p>
                              <p className="text-gray-600 dark:text-gray-300">
                                English: {result.English}
                              </p>
                              <p className="text-gray-600 dark:text-gray-300">
                                Total: {total}
                              </p>
                              <p className="text-gray-600 dark:text-gray-300">
                                Average: {average}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300">No result history available.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
