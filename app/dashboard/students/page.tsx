"use client";

import { useState, useContext } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { motion } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import { db } from "../../firebase";
import NewStudentForm from "./NewStudentForm";
import SeniorStudentForm from "./SeniorStudentForm";
import ClassArrangement from "./ClassArrangement";

export default function StudentRegistration() {
  const [activeTab, setActiveTab] = useState<"new" | "senior" | "class">("new");
  const [step, setStep] = useState(1);
  const [isNewStudent, setIsNewStudent] = useState(true);
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  const generateStudentId = async () => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const studentsRef = collection(db, "students");
    const q = query(studentsRef, orderBy("stuId", "desc"), limit(1));
    const querySnapshot = await getDocs(q);

    let nextIdNumber = 1;
    if (!querySnapshot.empty) {
      const lastStudent = querySnapshot.docs[0].data();
      const lastStuId = lastStudent.stuId;
      if (lastStuId && lastStuId.startsWith(`ST${currentYear}`)) {
        const lastIdNumber = parseInt(lastStuId.slice(-4), 10);
        nextIdNumber = lastIdNumber + 1;
      }
    }

    const newStuId = `ST${currentYear}${nextIdNumber.toString().padStart(4, "0")}`;
    return newStuId;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${
        theme === "light" ? "bg-gray-50" : "bg-gray-900"
      } min-h-screen`}
    >
      <div
        className={`p-6 rounded-2xl shadow-lg ${
          theme === "light" ? "bg-white border border-gray-200" : "bg-gray-800 border border-gray-700"
        }`}
      >
        <h1
          className={`text-3xl font-extrabold mb-6 ${
            theme === "light" ? "text-gray-800" : "text-gray-100"
          } tracking-tight`}
        >
          Student Registration
        </h1>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => { setActiveTab("new"); setStep(1); setIsNewStudent(true); }}
              className={`py-2 px-4 rounded-md font-medium ${
                activeTab === "new"
                  ? theme === "light"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : theme === "light"
                  ? "bg-gray-200 text-gray-700"
                  : "bg-gray-600 text-gray-300"
              } transition-colors duration-200`}
            >
              New Student
            </button>
            <button
              onClick={() => { setActiveTab("senior"); setStep(1); setIsNewStudent(false); }}
              className={`py-2 px-4 rounded-md font-medium ${
                activeTab === "senior"
                  ? theme === "light"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : theme === "light"
                  ? "bg-gray-200 text-gray-700"
                  : "bg-gray-600 text-gray-300"
              } transition-colors duration-200`}
            >
              Senior Student
            </button>
            <button
              onClick={() => { setActiveTab("class"); }}
              className={`py-2 px-4 rounded-md font-medium ${
                activeTab === "class"
                  ? theme === "light"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : theme === "light"
                  ? "bg-gray-200 text-gray-700"
                  : "bg-gray-600 text-gray-300"
              } transition-colors duration-200`}
            >
              Class Arrangement
            </button>
          </div>
        </div>

        {/* Progress Stepper for Registration Tabs */}
        {activeTab !== "class" && (
          <div className="flex justify-between mb-8">
            <div className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= 1
                    ? "bg-blue-500 text-white"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-600"
                    : "bg-gray-600 text-gray-300"
                }`}
              >
                1
              </div>
              <p className={`text-sm mt-2 ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                Enter Details
              </p>
            </div>
            <div className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= 2
                    ? "bg-blue-500 text-white"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-600"
                    : "bg-gray-600 text-gray-300"
                }`}
              >
                2
              </div>
              <p className={`text-sm mt-2 ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                Review
              </p>
            </div>
            <div className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= 3
                    ? "bg-blue-500 text-white"
                    : theme === "light"
                    ? "bg-gray-200 text-gray-600"
                    : "bg-gray-600 text-gray-300"
                }`}
              >
                3
              </div>
              <p className={`text-sm mt-2 ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                Confirmation
              </p>
            </div>
          </div>
        )}

        {/* Render content based on active tab */}
        {activeTab === "new" && <NewStudentForm step={step} setStep={setStep} generateStudentId={generateStudentId} />}
        {activeTab === "senior" && <SeniorStudentForm step={step} setStep={setStep} />}
        {activeTab === "class" && <ClassArrangement />}
      </div>
    </motion.div>
  );
}