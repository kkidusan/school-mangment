
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, UserPlus, Eye } from "lucide-react";
import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Corrected import
import FocusTrap from "focus-trap-react";

interface Student {
  stuId: string;
  fullName: string;
  section: string;
  results: {
    semester1: { [subject: string]: number };
    semester2: { [subject: string]: number };
  };
  total: {
    semester1: number;
    semester2: number;
  };
  average: {
    semester1: number;
    semester2: number;
  };
  rank: {
    semester1: number;
    semester2: number;
  };
  passFailStatus: string | null;
  approvedAt: string;
}

export default function StudentResultSearch() {
  const [stuId, setStuId] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [hasSemester2Data, setHasSemester2Data] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSimplifiedCard, setShowSimplifiedCard] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<string | null>(null);

  const currentYear = new Date().getFullYear().toString();

  // Handle search by stuId
  const handleSearch = async () => {
    if (!stuId.trim()) {
      toast.error("Please enter a valid Student ID.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    setLoading(true);
    setError(null);
    setStudent(null);
    setSubjects([]);
    setHasSemester2Data(false);
    setCurrentGrade(null);
    setShowSimplifiedCard(false);

    try {
      // Query all grade documents in the current year's transcripts sub-collection
      const grades = ["grade1", "grade2", "grade3", "grade4", "grade5", "grade6", "grade7", "grade8"];
      let foundStudent: Student | null = null;
      let highestGrade: string | null = null;

      for (const grade of grades) {
        const transcriptRef = doc(db, "transcripts", currentYear, grade, grade);
        const transcriptSnap = await getDoc(transcriptRef);

        if (transcriptSnap.exists()) {
          const data = transcriptSnap.data();
          const students = data.students || [];
          const studentData = students.find((s: Student) => s.stuId === stuId.trim());

          if (studentData) {
            // Compare grade numbers to find the highest
            const currentGradeNum = parseInt(grade.replace("grade", ""));
            const highestGradeNum = highestGrade ? parseInt(highestGrade.replace("grade", "")) : 0;
            if (!highestGrade || currentGradeNum > highestGradeNum) {
              foundStudent = studentData;
              highestGrade = data.grade;
            }
          }
        }
      }

      if (foundStudent && highestGrade) {
        setStudent(foundStudent);
        setCurrentGrade(highestGrade);
        const allSubjects = [
          ...new Set([
            ...Object.keys(foundStudent.results.semester1),
            ...Object.keys(foundStudent.results.semester2),
          ]),
        ].sort();
        setSubjects(allSubjects);
        setHasSemester2Data(Object.keys(foundStudent.results.semester2).length > 0);
        setShowDetailsModal(true);
        toast.success(`Results found for ${foundStudent.fullName} in ${highestGrade.replace("grade", "Grade ")}!`);
      } else {
        setError("No results found for the provided Student ID.");
        toast.error("No results found for the provided Student ID.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error: any) {
      console.error("Error fetching student results:", error);
      setError(`Failed to fetch results: ${error.message}`);
      toast.error(`Failed to fetch results: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle register to next or current grade based on passFailStatus
  const handleRegister = async () => {
    if (!student || !currentGrade) return;

    const gradeNum = parseInt(currentGrade.replace("grade", ""));
    let targetGrade: string;

    if (!hasSemester2Data) {
      toast.error("Student must have Semester 2 data to register.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    if (student.passFailStatus === "Pass" && gradeNum >= 8) {
      toast.error("Student is already in the highest grade (Grade 8).", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    // Determine target grade based on passFailStatus
    if (student.passFailStatus === "Pass") {
      targetGrade = `grade${gradeNum + 1}`; // Move to next grade
    } else if (student.passFailStatus === "Fail") {
      targetGrade = currentGrade; // Re-register in current grade
    } else {
      toast.error("Student must have a 'Pass' or 'Fail' status to register.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    try {
      // Register student in the grades collection
      const gradeRef = doc(db, "grades", targetGrade);
      const studentData = {
        stuId: student.stuId,
        fullName: student.fullName,
        section: student.section,
      };

      // Check if the grade document exists
      const gradeSnap = await getDoc(gradeRef);

      if (gradeSnap.exists()) {
        // Update existing document by appending student to the students array
        await updateDoc(gradeRef, {
          students: arrayUnion(studentData),
        });
      } else {
        // Create new document with the student
        await setDoc(gradeRef, {
          grade: targetGrade,
          students: [studentData],
        });
      }

      // Find the student document by stuId and update the grade field
      const studentsQuery = query(collection(db, "students"), where("stuId", "==", student.stuId));
      const studentsSnapshot = await getDocs(studentsQuery);

      if (!studentsSnapshot.empty) {
        const studentDoc = studentsSnapshot.docs[0]; // Assume the first matching document
        const studentRef = doc(db, "students", studentDoc.id);
        await updateDoc(studentRef, {
          grade: targetGrade,
        });
      } else {
        throw new Error("Student document not found in students collection.");
      }

      const gradeDisplay = targetGrade.replace("grade", "Grade ");
      const action = student.passFailStatus === "Pass" ? "registered for" : "re-registered in";
      toast.success(`${student.fullName} successfully ${action} ${gradeDisplay}!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setShowDetailsModal(false);
    } catch (error: any) {
      console.error("Error registering student:", error);
      toast.error(`Failed to register student: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Toggle simplified card
  const toggleSimplifiedCard = () => {
    setShowSimplifiedCard(!showSimplifiedCard);
  };

  return (
    <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
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
        className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
      >
        <h2
          className="text-2xl font-semibold mb-6"
          style={{
            background: "linear-gradient(to right, rgb(59, 130, 246), rgb(139, 92, 246))",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Search Student Results
        </h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-grow">
            <input
              type="text"
              value={stuId}
              onChange={(e) => setStuId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter Student ID (e.g., ST250015)"
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none transition-all duration-200"
              aria-label="Student ID input"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={handleSearch}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 transition-all duration-200 ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
            }`}
            aria-label="Search student results"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search
              </>
            )}
          </motion.button>
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 dark:text-red-400 text-center"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* Student Results Modal */}
      <AnimatePresence>
        {showDetailsModal && student && currentGrade && (
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
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-2xl"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3
                    className="text-xl font-semibold"
                    style={{
                      background: "linear-gradient(to right, rgb(59, 130, 246), rgb(139, 92, 246))",
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      color: "transparent",
                    }}
                  >
                    Results for {student.fullName} (ID: {student.stuId}) - {currentGrade.replace("grade", "Grade ")}
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label="Close modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-6">
                  {/* Student Information */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 rounded-lg"
                    style={{ background: "linear-gradient(to right, rgb(219, 234, 254), rgb(221, 214, 254))" }}
                  >
                    <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Student Information</h4>
                    <p className="text-gray-600 dark:text-gray-300">Student ID: {student.stuId}</p>
                    <p className="text-gray-600 dark:text-gray-300">Full Name: {student.fullName}</p>
                    <p className="text-gray-600 dark:text-gray-300">Section: {student.section}</p>
                    <p className="text-gray-600 dark:text-gray-300">
                      Approved At: {new Date(student.approvedAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {hasSemester2Data && (
                      <p className="text-gray-600 dark:text-gray-300">
                        Status: <span className={student.passFailStatus === "Pass" ? "text-green-500" : "text-red-500"}>
                          {student.passFailStatus || "-"}
                        </span>
                      </p>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={toggleSimplifiedCard}
                      className="mt-4 px-4 py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 flex items-center gap-2"
                      aria-label="View simplified results"
                    >
                      <Eye className="w-5 h-5" />
                      {showSimplifiedCard ? "Hide Details" : "View Details"}
                    </motion.button>
                  </motion.div>

                  {/* Simplified Card */}
                  {showSimplifiedCard && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-4 rounded-lg"
                      style={{ background: "linear-gradient(to right, rgb(219, 234, 254), rgb(221, 214, 254))" }}
                    >
                      <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Semester I</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <p className="text-gray-600 dark:text-gray-300">Total: {student.total.semester1}</p>
                        <p className="text-gray-600 dark:text-gray-300">Average: {student.average.semester1.toFixed(2)}</p>
                        <p className="text-gray-600 dark:text-gray-300">Rank: {student.rank.semester1}</p>
                      </div>
                      {hasSemester2Data && (
                        <>
                          <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Semester II</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <p className="text-gray-600 dark:text-gray-300">Total: {student.total.semester2}</p>
                            <p className="text-gray-600 dark:text-gray-300">Average: {student.average.semester2.toFixed(2)}</p>
                            <p className="text-gray-600 dark:text-gray-300">Rank: {student.rank.semester2}</p>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Register Button */}
                  {hasSemester2Data && (student.passFailStatus === "Pass" || student.passFailStatus === "Fail") && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex justify-end mt-4"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={handleRegister}
                        className="px-4 py-2 rounded-lg text-white bg-green-500 hover:bg-green-600 flex items-center gap-2 transition-all duration-200"
                        aria-label={`Register ${student.fullName} for ${
                          student.passFailStatus === "Pass" && parseInt(currentGrade.replace("grade", "")) < 8
                            ? `Grade ${parseInt(currentGrade.replace("grade", "")) + 1}`
                            : currentGrade.replace("grade", "Grade ")
                        }`}
                      >
                        <UserPlus className="w-5 h-5" />
                        {student.passFailStatus === "Pass" && parseInt(currentGrade.replace("grade", "")) < 8
                          ? `Register for Grade ${parseInt(currentGrade.replace("grade", "")) + 1}`
                          : `Re-register for ${currentGrade.replace("grade", "Grade ")}`}
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>

      <style jsx>{`
        .min-h-screen::-webkit-scrollbar {
          width: 8px;
        }
        .min-h-screen::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }
        .min-h-screen::-webkit-scrollbar-thumb {
          background: rgb(160, 174, 192);
          border-radius: 10px;
        }
        .min-h-screen::-webkit-scrollbar-thumb:hover {
          background: rgb(113, 128, 150);
        }
        [data-theme="dark"] .bg-white {
          background-color: rgb(31, 41, 55) !important;
        }
        [data-theme="dark"] .bg-gray-100 {
          background-color: rgb(17, 24, 39) !important;
        }
        [data-theme="dark"] .rounded-lg {
          background: linear-gradient(to right, rgb(30, 58, 138), rgb(107, 33, 168)) !important;
        }
      `}</style>
    </div>
  );
}
