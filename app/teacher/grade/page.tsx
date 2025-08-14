"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase"; // Adjust path to your Firebase config
import { ThemeContext } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import AttendanceTab from "./AttendanceTab";
import ResultGenerateTab from "./ResultGenerateTab";
import ScheduleAssignTab from "./ScheduleAssignTab";
import { Calendar, FileText, Clock } from "lucide-react";

// Define the shape of a student for gradesCollection
interface Student {
  fullName: string;
  stuId: string;
  section: string;
}

export default function TeacherGradePage() {
  const context = useContext(ThemeContext);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [advisorGrades, setAdvisorGrades] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState("Unknown");
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("attendance");
  const [gradesCollection, setGradesCollection] = useState<Student[]>([]); // State for student data
  const [loading, setLoading] = useState(true); // Loading state for student data

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Private function to validate teacher session
  const validateSession = async () => {
    try {
      const response = await fetch("/api/validate-teacher", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        router.push("/");
        return false;
      }

      const data = await response.json();
      if (data.role !== "teacher") {
        router.push("/");
        return false;
      }

      setUserEmail(data.email || "Unknown");
      setIsAuthorized(true);
      return true;
    } catch (error) {
      console.error("Session validation error:", error);
      router.push("/");
      return false;
    }
  };

  // Private function to fetch grades where the teacher is the advisor
  const fetchAdvisorGrades = () => {
    const gradesQuery = query(collection(db, "grades"), where("advisorEmail", "==", userEmail));
    const unsubscribeGrades = onSnapshot(gradesQuery, (querySnapshot) => {
      const grades = new Set<string>();
      querySnapshot.forEach((doc) => {
        const grade = doc.data().grade;
        if (grade) {
          grades.add(grade);
        }
      });
      setAdvisorGrades(Array.from(grades));
      if (grades.size > 0 && !selectedGrade) {
        setSelectedGrade(Array.from(grades)[0]);
      }
    }, (error) => {
      console.error("Error fetching advisor grades:", error);
      setAdvisorGrades([]);
    });

    return unsubscribeGrades;
  };

  // Private function to fetch students for the selected grade
  const fetchStudents = async () => {
    if (!selectedGrade) return;

    setLoading(true);
    try {
      const normalizedGrade = selectedGrade.toLowerCase().replace(/\s+/g, "");
      const gradeDocRef = doc(db, "grades", normalizedGrade);
      const gradeDocSnap = await getDoc(gradeDocRef);

      if (gradeDocSnap.exists()) {
        const gradeData = gradeDocSnap.data();
        const studentsArray = gradeData.students || []; // Get the students array
        const students: Student[] = studentsArray.map((student: any) => ({
          fullName: student.fullName || "Unknown",
          stuId: student.stuId || "Unknown",
          section: student.section || "Unknown",
        }));
        setGradesCollection(students);
      } else {
        setGradesCollection([]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students from grades collection:", error);
      setGradesCollection([]);
      setLoading(false);
    }
  };

  // Effect to validate session and fetch grades
  useEffect(() => {
    let unsubscribeGrades: (() => void) | undefined;

    const initialize = async () => {
      const isValid = await validateSession();
      if (isValid) {
        unsubscribeGrades = fetchAdvisorGrades();
      }
    };

    initialize();

    return () => {
      if (unsubscribeGrades) unsubscribeGrades();
    };
  }, [router, userEmail]);

  // Effect to fetch students when selectedGrade changes
  useEffect(() => {
    fetchStudents();
  }, [selectedGrade]);

  // Normalize grade for display
  const normalizeGrade = (grade: string) => {
    return grade.charAt(0).toUpperCase() + grade.slice(1).replace(/(\d+)/, " $1");
  };

  if (!isAuthorized) {
    return null;
  }

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${theme === "light" ? "bg-blue-50" : "bg-gray-900"}`}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1
            className={`text-3xl font-bold mb-6 ${
              theme === "light" ? "text-zinc-800" : "text-zinc-100"
            }`}
          >
            Teacher Dashboard
          </h1>
          <p>Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${theme === "light" ? "bg-blue-50" : "bg-gray-900"}`}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <h1
          className={`text-3xl font-bold mb-6 ${
            theme === "light" ? "text-zinc-800" : "text-zinc-100"
          }`}
        >
          Teacher Dashboard
        </h1>

        {/* Grade Selection */}
        {advisorGrades.length > 0 && (
          <div className="mb-6">
            <label
              className={`mr-2 font-medium ${
                theme === "light" ? "text-gray-700" : "text-gray-300"
              }`}
            >
              Select Grade:
            </label>
            <select
              value={selectedGrade || ""}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className={`px-4 py-2 rounded-lg ${
                theme === "light" ? "bg-white text-gray-700" : "bg-gray-800 text-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {advisorGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {normalizeGrade(grade)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs Navigation */}
        {selectedGrade && (
          <div className="flex gap-2 mb-6 border-b border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-4 py-2 font-medium rounded-t-md transition ${
                activeTab === "attendance"
                  ? "bg-blue-500 text-white"
                  : theme === "light"
                  ? "bg-white text-gray-700"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              <Calendar className="inline-block w-5 h-5 mr-2" />
              Attendance
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`px-4 py-2 font-medium rounded-t-md transition ${
                activeTab === "results"
                  ? "bg-blue-500 text-white"
                  : theme === "light"
                  ? "bg-white text-gray-700"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              <FileText className="inline-block w-5 h-5 mr-2" />
              Results
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`px-4 py-2 font-medium rounded-t-md transition ${
                activeTab === "schedule"
                  ? "bg-blue-500 text-white"
                  : theme === "light"
                  ? "bg-white text-gray-700"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              <Clock className="inline-block w-5 h-5 mr-2" />
              Schedule
            </button>
          </div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "attendance" && selectedGrade && (
            <AttendanceTab
              grade={normalizeGrade(selectedGrade)}
              students={gradesCollection}
            />
          )}
          {activeTab === "results" && selectedGrade && (
            <ResultGenerateTab grade={normalizeGrade(selectedGrade)} />
          )}
          {activeTab === "schedule" && selectedGrade && (
            <ScheduleAssignTab grade={normalizeGrade(selectedGrade)} />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}