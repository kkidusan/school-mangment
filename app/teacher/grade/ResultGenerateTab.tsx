"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Calendar, Eye, X } from "lucide-react";
import { db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FocusTrap from "focus-trap-react";

interface ResultGenerateTabProps {
  grade: string; // e.g., "grade2", "Grade 2", "2nd Grade"
}

interface StudentResult {
  [subject: string]: number; // e.g., { Math: 85, Science: 90 }
}

interface Student {
  fullName: string;
  stuId: string;
  section: string;
  results: { [date: string]: StudentResult }; // e.g., { "2025-08-14": { Math: 85 } }
}

export default function ResultGenerateTab({ grade }: ResultGenerateTabProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);

  // Normalize grade for Firestore and display
  const normalizedGrade = grade
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^grade(\d+)$/, "$1")
    .replace(/(\d+)(st|nd|rd|th)?grade/, "$1");
  const formattedGrade = `Grade ${normalizedGrade}`;

  // Fetch students and their results from Firestore
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        // Fetch students from the "grades" collection
        const gradeRef = collection(db, "grades");
        const gradeQuery = query(gradeRef, where("grade", "==", `grade${normalizedGrade}`));
        const gradeSnapshot = await getDocs(gradeQuery);

        if (gradeSnapshot.empty) {
          toast.warn(`No students found for ${formattedGrade}.`, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          setStudents([]);
          setSubjects([]);
          setLoading(false);
          return;
        }

        const studentData: Student[] = [];
        const studentMap: { [stuId: string]: { fullName: string; section: string } } = {};
        const allSubjects = new Set<string>();

        // Build student map from grades collection
        for (const doc of gradeSnapshot.docs) {
          const data = doc.data();
          if (data.students && Array.isArray(data.students)) {
            data.students.forEach((student: any) => {
              studentMap[student.stuId] = {
                fullName: student.fullName || "Unknown",
                section: student.section || "A",
              };
            });
          }
        }

        // Fetch assessments for the grade with status "complete"
        const assessmentsRef = collection(db, "assessments");
        const assessmentsQuery = query(
          assessmentsRef,
          where("grade", "==", `grade${normalizedGrade}`),
          where("status", "==", "complete")
        );
        const assessmentsSnapshot = await getDocs(assessmentsQuery);

        const resultsByStudent: { [stuId: string]: { [date: string]: StudentResult } } = {};

        assessmentsSnapshot.forEach((assessmentDoc) => {
          const assessmentData = assessmentDoc.data();
          if (
            assessmentData.marks &&
            assessmentData.subject &&
            assessmentData.timestamp &&
            assessmentData.semester
          ) {
            const date = assessmentData.timestamp.toDate().toISOString().split("T")[0];
            const subject = assessmentData.subject;
            allSubjects.add(subject);

            Object.entries(assessmentData.marks).forEach(([stuId, marks]: [string, any]) => {
              if (!resultsByStudent[stuId]) {
                resultsByStudent[stuId] = {};
              }
              if (!resultsByStudent[stuId][date]) {
                resultsByStudent[stuId][date] = {};
              }
              resultsByStudent[stuId][date][subject] = marks.total || 0;
            });
          }
        });

        // Combine student data with results
        Object.entries(studentMap).forEach(([stuId, { fullName, section }]) => {
          studentData.push({
            fullName,
            stuId,
            section,
            results: resultsByStudent[stuId] || {},
          });
        });

        setStudents(studentData);
        setSubjects(Array.from(allSubjects).sort());
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching students:", error);
        toast.error(`Failed to fetch student data: ${error.message}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setStudents([]);
        setSubjects([]);
        setLoading(false);
      }
    };

    fetchStudents();
  }, [grade, normalizedGrade]);

  // Get unique dates from all students' results
  const allDates = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .flatMap((student) => Object.keys(student.results))
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        )
      ),
    [students]
  );

  // Filter students based on date range
  const filteredStudents = useMemo(
    () =>
      students.map((student) => ({
        ...student,
        results: Object.fromEntries(
          Object.entries(student.results).filter(([date]) => {
            if (!startDate || !endDate) return true;
            const dateObj = new Date(date);
            return dateObj >= new Date(startDate) && dateObj <= new Date(endDate);
          })
        ),
      })),
    [students, startDate, endDate]
  );

  // Calculate total, average, and rank for a student's results
  const calculateResultMetrics = (result: StudentResult, allStudents: Student[]) => {
    const subjects = Object.keys(result);
    const total = subjects.reduce((sum, subject) => sum + (result[subject] || 0), 0);
    const average = subjects.length > 0 ? Number((total / subjects.length).toFixed(2)) : 0;

    // Calculate rank based on average score
    const studentAverages = allStudents.map((student) => {
      const studentResults = Object.values(student.results);
      const studentTotal = studentResults.reduce((sum, res) => {
        const resSubjects = Object.keys(res);
        const resTotal = resSubjects.reduce((s, subject) => s + (res[subject] || 0), 0);
        return sum + (resSubjects.length > 0 ? resTotal / resSubjects.length : 0);
      }, 0);
      return {
        stuId: student.stuId,
        average: studentResults.length > 0 ? Number((studentTotal / studentResults.length).toFixed(2)) : 0,
      };
    });

    // Sort by average in descending order
    const sortedAverages = [...new Set(studentAverages.map((s) => s.average))].sort((a, b) => b - a);
    const rank = sortedAverages.indexOf(average) + 1;

    return { total, average, rank };
  };

  // Calculate class summary
  const calculateClassSummary = useMemo(() => {
    let totalAverage = 0;
    let passCount = 0;
    let studentCount = 0;

    filteredStudents.forEach((student) => {
      Object.values(student.results).forEach((result) => {
        const { average, rank } = calculateResultMetrics(result, filteredStudents);
        totalAverage += average;
        if (rank <= Math.ceil(filteredStudents.length / 2)) passCount++; // Consider top half as passing
        studentCount++;
      });
    });

    return {
      averageScore: studentCount > 0 ? Number((totalAverage / studentCount).toFixed(2)) : 0,
      passRate: studentCount > 0 ? Number(((passCount / studentCount) * 100).toFixed(2)) : 0,
      studentCount,
    };
  }, [filteredStudents]);

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

  // Handle empty state or loading
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </motion.div>
    );
  }

  if (students.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
      >
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100 bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
          Result Generate for {formattedGrade}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">No students available for {formattedGrade}.</p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 ${
          showDetailsModal ? "blur-md" : ""
        }`}
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100 bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
          Result Generate for {formattedGrade}
        </h2>

        {/* Date Range Picker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-blue-500" />
            <label className="text-gray-700 dark:text-gray-300 font-medium">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-gray-700 dark:text-gray-300 font-medium">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
          </div>
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 shadow-md"
          >
            Clear Dates
          </button>
        </div>
        {!isValidDateRange() && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 dark:text-red-400 mb-4"
          >
            End date must be after start date.
          </motion.p>
        )}

        {/* Class Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-lg shadow-md"
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
            Class Summary for {formattedGrade}
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Average Score: <span className="font-semibold">{calculateClassSummary.averageScore}</span> | 
            Pass Rate: <span className="font-semibold">{calculateClassSummary.passRate}%</span> | 
            Total Results: <span className="font-semibold">{calculateClassSummary.studentCount}</span>
          </p>
        </motion.div>

        {/* Results Table */}
        <div className="overflow-x-auto rounded-lg shadow-md">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-800 dark:to-purple-800">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Student Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Student ID
                </th>
                {subjects.map((subject) => (
                  <th
                    key={subject}
                    className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200"
                  >
                    {subject}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Average
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Rank
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                // Aggregate results across filtered dates
                const aggregatedResult: StudentResult = {};
                subjects.forEach((subject) => {
                  let totalScore = 0;
                  let count = 0;
                  Object.values(student.results).forEach((result) => {
                    if (result[subject]) {
                      totalScore += result[subject];
                      count++;
                    }
                  });
                  aggregatedResult[subject] = count > 0 ? Number((totalScore / count).toFixed(2)) : 0;
                });
                const { total, average, rank } = calculateResultMetrics(aggregatedResult, filteredStudents);
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
                    {subjects.map((subject) => (
                      <td
                        key={subject}
                        className="px-4 py-3 text-center text-gray-800 dark:text-gray-200"
                      >
                        {aggregatedResult[subject] || "-"}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      {total || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      {average || "-"}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-800 dark:text-gray-200">
                      {rank || "-"}
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
          <FocusTrap>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-md flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-lg"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
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
                          const { total, average, rank } = calculateResultMetrics(result, filteredStudents);
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-lg"
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
                                <span className="text-gray-600 dark:text-gray-300 font-semibold">
                                  Rank: {rank}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(result).map(([subject, score]) => (
                                  <p key={subject} className="text-gray-600 dark:text-gray-300">
                                    {subject}: {score}
                                  </p>
                                ))}
                                <p className="text-gray-600 dark:text-gray-300">
                                  Total: {total}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                  Average: {average}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-300">No result history available.</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>

      <style jsx>{`
        .max-h-96::-webkit-scrollbar {
          width: 8px;
        }
        .max-h-96::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }
        .max-h-96::-webkit-scrollbar-thumb {
          background: #a0aec0;
          border-radius: 10px;
        }
        .max-h-96::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
      `}</style>
    </div>
  );
}