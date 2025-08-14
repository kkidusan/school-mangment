"use client";

import { useState, useContext } from "react";
import { db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { Loader2, CheckCircle } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface SeniorStudentData {
  studentId: string;
  address?: string;
  parentContact?: string;
  subjects?: string[];
}

interface SeniorStudentFormProps {
  step: number;
  setStep: (step: number) => void;
}

export default function SeniorStudentForm({ step, setStep }: SeniorStudentFormProps) {
  const [seniorFormData, setSeniorFormData] = useState<SeniorStudentData>({
    studentId: "",
    address: "",
    parentContact: "",
    subjects: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const context = useContext(ThemeContext);
  const router = useRouter();

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!seniorFormData.studentId)
      newErrors.studentId = "Student ID is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const studentDoc = doc(db, "students", seniorFormData.studentId);
      await updateDoc(studentDoc, {
        address: seniorFormData.address,
        parentContact: seniorFormData.parentContact,
        subjects: seniorFormData.subjects,
        updatedAt: new Date().toISOString(),
      });

      toast.success("Senior student updated successfully!");
      setStep(3);
    } catch (error) {
      console.error("Error updating senior student:", error);
      toast.error("Failed to update senior student. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    setSeniorFormData({
      studentId: "",
      address: "",
      parentContact: "",
      subjects: [],
    });
    setStep(1);
    setErrors({});
    router.refresh();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2
              className={`text-2xl font-semibold ${
                theme === "light" ? "text-gray-800" : "text-gray-100"
              }`}
            >
              Senior Student Re-registration
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); if (validateForm()) setStep(2); }} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Student ID
                </label>
                <input
                  type="text"
                  value={seniorFormData.studentId}
                  onChange={(e) => setSeniorFormData({ ...seniorFormData, studentId: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.studentId ? "border-red-500" : "border-gray-300"
                  } p-2 ${theme === "light" ? "bg-white" : "bg-gray-700"}`}
                />
                {errors.studentId && <p className="text-red-500 text-sm">{errors.studentId}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Updated Address (Optional)
                </label>
                <input
                  type="text"
                  value={seniorFormData.address}
                  onChange={(e) => setSeniorFormData({ ...seniorFormData, address: e.target.value })}
                  className={`mt-1 block w-full rounded-md border border-gray-300 p-2 ${
                    theme === "light" ? "bg-white" : "bg-gray-700"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Updated Parent Contact (Optional)
                </label>
                <input
                  type="tel"
                  value={seniorFormData.parentContact}
                  onChange={(e) => setSeniorFormData({ ...seniorFormData, parentContact: e.target.value })}
                  className={`mt-1 block w-full rounded-md border border-gray-300 p-2 ${
                    theme === "light" ? "bg-white" : "bg-gray-700"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Subjects (Optional)
                </label>
                <input
                  type="text"
                  value={seniorFormData.subjects?.join(", ") || ""}
                  onChange={(e) =>
                    setSeniorFormData({
                      ...seniorFormData,
                      subjects: e.target.value.split(",").map((s) => s.trim()),
                    })
                  }
                  className={`mt-1 block w-full rounded-md border border-gray-300 p-2 ${
                    theme === "light" ? "bg-white" : "bg-gray-700"
                  }`}
                  placeholder="e.g., Math, Science, English"
                />
              </div>
              <button
                type="submit"
                className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                  theme === "light" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                } transition-colors duration-200`}
              >
                Next
              </button>
            </form>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h2
              className={`text-2xl font-semibold ${
                theme === "light" ? "text-gray-800" : "text-gray-100"
              }`}
            >
              Review & Submit
            </h2>
            <div className="space-y-4">
              <p><strong>Student ID:</strong> {seniorFormData.studentId}</p>
              <p><strong>Updated Address:</strong> {seniorFormData.address || "N/A"}</p>
              <p><strong>Updated Parent Contact:</strong> {seniorFormData.parentContact || "N/A"}</p>
              <p><strong>Subjects:</strong> {seniorFormData.subjects?.join(", ") || "N/A"}</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    theme === "light" ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-500 hover:bg-gray-600"
                  } transition-colors duration-200`}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    theme === "light" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                  } transition-colors duration-200 flex items-center justify-center`}
                >
                  {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                  Submit
                </button>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="text-center space-y-6">
            <CheckCircle className="mx-auto text-green-500" size={48} />
            <h2
              className={`text-2xl font-semibold ${
                theme === "light" ? "text-gray-800" : "text-gray-100"
              }`}
            >
              Registration Successful!
            </h2>
            <p
              className={`text-sm ${
                theme === "light" ? "text-gray-600" : "text-gray-400"
              }`}
            >
              The senior student's details have been updated successfully.
            </p>
            <button
              onClick={handleFinish}
              className={`py-2 px-4 rounded-md text-white font-medium ${
                theme === "light" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
              } transition-colors duration-200`}
            >
              Finish
            </button>
          </div>
        );
    }
  };

  return renderStep();
}