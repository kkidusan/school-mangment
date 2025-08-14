"use client";

import { useState, useEffect, useContext } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";

interface GradeData {
  grade: string;
  count: number;
  classAdvisor?: string;
}

interface TeacherData {
  teacherName: string;
  email: string;
}

export default function ClassArrangement() {
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [newClassAdvisor, setNewClassAdvisor] = useState("");
  const [advisorEmail, setAdvisorEmail] = useState("");
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const studentsRef = collection(db, "students");
        const querySnapshot = await getDocs(studentsRef);
        const gradeCounts = querySnapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          if (data.grade) {
            acc[data.grade] = {
              count: (acc[data.grade]?.count || 0) + 1,
              classAdvisor: data.classAdvisor || "Not Assigned",
            };
          }
          return acc;
        }, {} as { [key: string]: { count: number; classAdvisor: string } });

        const gradeData = Object.entries(gradeCounts).map(([grade, data]) => ({
          grade,
          count: data.count,
          classAdvisor: data.classAdvisor,
        }));
        setGrades(gradeData);
      } catch (error) {
        console.error("Error fetching grades:", error);
        toast.error("Failed to load class arrangement data.");
      }
    };

    fetchGrades();
  }, []);

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!selectedGrade) return;
      try {
        const teachersRef = collection(db, "AssignTeacher");
        const querySnapshot = await getDocs(teachersRef);
        const teacherData = querySnapshot.docs
          .filter((doc) => doc.data().grade === selectedGrade)
          .map((doc) => ({
            teacherName: doc.data().teacherName,
            email: doc.data().email,
          }));
        setTeachers(teacherData);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        toast.error("Failed to load teacher data.");
      }
    };

    fetchTeachers();
  }, [selectedGrade]);

  const handleAssignAdvisor = async () => {
    if (!selectedGrade || !newClassAdvisor.trim() || !advisorEmail.trim()) {
      toast.error("Please select a class advisor.");
      return;
    }

    try {
      // Query the students collection where grade matches selectedGrade
      const studentsRef = collection(db, "grades");
      const q = query(studentsRef, where("grade", "==", selectedGrade));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error(`No students found for grade ${selectedGrade}.`);
        return;
      }

      // Update each matching document with classAdvisor, grade2, and advisorEmail
      const updatePromises = querySnapshot.docs.map(async (studentDoc) => {
        await updateDoc(studentDoc.ref, {
          classAdvisor: newClassAdvisor,
          grade2: selectedGrade,
          advisorEmail: advisorEmail,
        });
      });

      await Promise.all(updatePromises);

      // Update local state to reflect changes
      setGrades(
        grades.map((grade) =>
          grade.grade === selectedGrade
            ? { ...grade, classAdvisor: newClassAdvisor }
            : grade
        )
      );
      setNewClassAdvisor("");
      setAdvisorEmail("");
      setSelectedGrade(null);
      toast.success(`Class advisor assigned to ${selectedGrade} successfully!`);
    } catch (error) {
      console.error("Error assigning class advisor:", error);
      toast.error("Failed to assign class advisor. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen p-6">
      <h2
        className={`text-3xl font-bold mb-8 text-center ${
          theme === "light" ? "text-gray-800" : "text-gray-100"
        }`}
      >
        Class Arrangement
      </h2>
      <div
        className={`transition-all duration-300 ${
          selectedGrade ? "blur-sm" : ""
        }`}
      >
        {grades.length === 0 ? (
          <p
            className={`text-center text-lg ${
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }`}
          >
            No students registered yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {grades.map((grade) => (
              <motion.div
                key={grade.grade}
                onClick={() => setSelectedGrade(grade.grade)}
                className={`p-6 rounded-xl shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                  theme === "light"
                    ? "bg-white border border-gray-200 hover:bg-gray-50"
                    : "bg-gray-800 border border-gray-700 hover:bg-gray-700"
                }`}
                whileHover={{ boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
              >
                <h3
                  className={`text-xl font-semibold ${
                    theme === "light" ? "text-gray-800" : "text-gray-100"
                  }`}
                >
                  {grade.grade.charAt(0).toUpperCase() + grade.grade.slice(1)}
                </h3>
                <p
                  className={`text-sm mt-2 ${
                    theme === "light" ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {grade.count} {grade.count === 1 ? "student" : "students"}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    theme === "light" ? "text-gray-500" : "text-gray-300"
                  }`}
                >
                  Advisor: {grade.classAdvisor}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedGrade && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50"
          >
            <div
              className="absolute inset-0 backdrop-blur-sm"
              onClick={() => setSelectedGrade(null)}
            />
            <motion.div
              className={`relative p-8 rounded-2xl shadow-2xl max-w-md w-full ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              }`}
            >
              <h3
                className={`text-2xl font-semibold mb-6 text-center ${
                  theme === "light" ? "text-gray-800" : "text-gray-100"
                }`}
              >
                Assign Class Advisor for {selectedGrade.charAt(0).toUpperCase() + selectedGrade.slice(1)}
              </h3>
              <div className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium ${
                      theme === "light" ? "text-gray-700" : "text-gray-300"
                    }`}
                  >
                    Class Advisor Name
                  </label>
                  <select
                    value={newClassAdvisor}
                    onChange={(e) => {
                      const selectedTeacher = teachers.find(
                        (teacher) => teacher.teacherName === e.target.value
                      );
                      setNewClassAdvisor(e.target.value);
                      setAdvisorEmail(selectedTeacher ? selectedTeacher.email : "");
                    }}
                    className={`mt-1 block w-full rounded-md border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-200 ${
                      theme === "light"
                        ? "bg-white border-gray-300 text-gray-800"
                        : "bg-gray-700 border-gray-600 text-gray-100"
                    }`}
                  >
                    <option value="" disabled>
                      Select a teacher
                    </option>
                    {teachers.length > 0 ? (
                      teachers.map((teacher) => (
                        <option key={teacher.email} value={teacher.teacherName}>
                          {teacher.teacherName}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No teachers available
                      </option>
                    )}
                  </select>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setSelectedGrade(null);
                      setNewClassAdvisor("");
                      setAdvisorEmail("");
                    }}
                    className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 ${
                      theme === "light"
                        ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        : "bg-gray-600 text-gray-100 hover:bg-gray-500"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignAdvisor}
                    className={`w-full py-3 px-4 rounded-md font-medium transition-colors duration-200 ${
                      theme === "light"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    Save Advisor
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}