"use client";

import { useState, useContext } from "react";
import { db } from "../../firebase";
import { collection, addDoc, doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { motion } from "framer-motion";
import { Loader2, Upload, CheckCircle } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface StudentFormData {
  fullName: string;
  dob: string;
  gender: string;
  grade: string;
  parentName: string;
  parentContact: string;
  address: string;
  previousSchool?: string;
  documents: File[];
  stuId?: string;
}

interface NewStudentFormProps {
  step: number;
  setStep: (step: number) => void;
  generateStudentId: () => Promise<string>;
}

export default function NewStudentForm({ step, setStep, generateStudentId }: NewStudentFormProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    fullName: "",
    dob: "",
    gender: "",
    grade: "",
    parentName: "",
    parentContact: "",
    address: "",
    previousSchool: "",
    documents: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [customGrade, setCustomGrade] = useState("");
  const [showCustomGradeInput, setShowCustomGradeInput] = useState(false);
  const context = useContext(ThemeContext);
  const router = useRouter();

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.fullName) newErrors.fullName = "Full name is required";
    if (!formData.dob) newErrors.dob = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.grade && !showCustomGradeInput) newErrors.grade = "Grade is required";
    if (showCustomGradeInput && !customGrade) newErrors.customGrade = "Custom grade is required";
    if (!formData.parentName) newErrors.parentName = "Parent name is required";
    if (!formData.parentContact || !/^\d{10}$/.test(formData.parentContact))
      newErrors.parentContact = "Valid 10-digit contact number is required";
    if (!formData.address) newErrors.address = "Address is required";
    if (formData.documents.length === 0)
      newErrors.documents = "At least one document is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, documents: Array.from(e.target.files) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const stuId = await generateStudentId();
      const documentUrls = await Promise.all(
        formData.documents.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
          formData.append("cloud_name", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!);

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const data = await response.json();
          return data.secure_url;
        })
      );

      const finalGrade = showCustomGradeInput ? customGrade : formData.grade;
      const studentRef = await addDoc(collection(db, "students"), {
        ...formData,
        stuId,
        grade: finalGrade,
        section: "section1",
        documents: documentUrls,
        admissionDate: new Date().toISOString(),
        status: "pending",
      });

      const gradeRef = doc(db, "grades", finalGrade);
      const gradeDoc = await getDoc(gradeRef);
      if (!gradeDoc.exists()) {
        await setDoc(gradeRef, {
          grade: finalGrade,
          students: [],
        });
      }
      await updateDoc(gradeRef, {
        students: arrayUnion({
          stuId,
          fullName: formData.fullName,
          section: "section1",
        }),
      });

      setFormData({ ...formData, stuId });
      toast.success(`Student registered successfully! ID: ${stuId}`);
      setStep(3);
    } catch (error) {
      console.error("Error registering student:", error);
      toast.error("Failed to register student. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    setFormData({
      fullName: "",
      dob: "",
      gender: "",
      grade: "",
      parentName: "",
      parentContact: "",
      address: "",
      previousSchool: "",
      documents: [],
    });
    setCustomGrade("");
    setShowCustomGradeInput(false);
    setStep(1);
    setErrors({});
    router.refresh();
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "other") {
      setShowCustomGradeInput(true);
      setFormData({ ...formData, grade: "" });
    } else {
      setShowCustomGradeInput(false);
      setCustomGrade("");
      setFormData({ ...formData, grade: value });
    }
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
              New Student Registration
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); if (validateForm()) setStep(2); }} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.fullName ? "border-red-500" : "border-gray-300"
                  } p-2 ${theme === "light" ? "bg-white" : "bg-gray-700"}`}
                />
                {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.dob ? "border-red-500" : "border-gray-300"
                  } p-2 ${theme === "light" ? "bg-white" : "bg-gray-700"}`}
                />
                {errors.dob && <p className="text-red-500 text-sm">{errors.dob}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.gender ? "border-red-500" : "border-gray-300"
                  } p-2 ${theme === "light" ? "bg-white" : "bg-gray-700"}`}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Grade
                </label>
                <select
                  value={formData.grade}
                  onChange={handleGradeChange}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.grade ? "border-red-500" : "border-gray-300"
                  } p-2 ${theme === "light" ? "bg-white" : "bg-gray-700"}`}
                >
                  <option value="">Select Grade</option>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((grade) => (
                    <option key={grade} value={`grade${grade}`}>Grade {grade}</option>
                  ))}
                  <option value="other">Other Grade</option>
                </select>
                {errors.grade && <p className="text-red-500 text-sm">{errors.grade}</p>}
              </div>
              {showCustomGradeInput && (
                <div>
                  <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                    Custom Grade
                  </label>
                  <input
                    type="text"
                    value={customGrade}
                    onChange={(e) => setCustomGrade(e.target.value)}
                    className={`mt-1 block w-full rounded-md border ${
                      errors.customGrade ? "border-red-500" : "border-gray-300"
                    } p-2 ${theme === "light" ? "bg-white" : "bg-gray-700"}`}
                    placeholder="Enter custom grade"
                  />
                  {errors.customGrade && <p className="text-red-500 text-sm">{errors.customGrade}</p>}
                </div>
              )}
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Parent/Guardian Name
                </label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.parentName ? "border-red-500" : "border-gray-300"
                  } p-2 ${theme === "light" ? "bg-white" : "bg-gray-700"}`}
                />
                {errors.parentName && <p className="text-red-500 text-sm">{errors.parentName}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Parent Contact
                </label>
                <input
                  type="tel"
                  value={formData.parentContact}
                  onChange={(e) => setFormData({ ...formData, parentContact: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.parentContact ? "border-red-500" : "border-gray-300"
                  } p-2 ${theme === "light" ? "bg-white" : "bg-gray-700"}`}
                />
                {errors.parentContact && <p className="text-red-500 text-sm">{errors.parentContact}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`mt-1 block w-full rounded-md border ${
                    errors.address ? "border-red-500" : "border-gray-300"
                  } p-2 ${theme === "light" ? "bg-white" : "bg-gray-700"}`}
                />
                {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Previous School (Optional)
                </label>
                <input
                  type="text"
                  value={formData.previousSchool}
                  onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                  className={`mt-1 block w-full rounded-md border border-gray-300 p-2 ${
                    theme === "light" ? "bg-white" : "bg-gray-700"
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                  Upload Documents
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className={`block w-full text-sm ${
                      theme === "light" ? "text-gray-700" : "text-gray-300"
                    }`}
                  />
                  <Upload className="ml-2 text-blue-500" size={20} />
                </div>
                {formData.documents.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-500">
                    {formData.documents.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                )}
                {errors.documents && <p className="text-red-500 text-sm">{errors.documents}</p>}
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
              <p><strong>Student ID:</strong> {formData.stuId || "Will be generated on submit"}</p>
              <p><strong>Full Name:</strong> {formData.fullName}</p>
              <p><strong>Date of Birth:</strong> {formData.dob}</p>
              <p><strong>Gender:</strong> {formData.gender}</p>
              <p><strong>Grade:</strong> {showCustomGradeInput ? customGrade : formData.grade}</p>
              <p><strong>Section:</strong> section1</p>
              <p><strong>Parent Name:</strong> {formData.parentName}</p>
              <p><strong>Parent Contact:</strong> {formData.parentContact}</p>
              <p><strong>Address:</strong> {formData.address}</p>
              <p><strong>Previous School:</strong> {formData.previousSchool || "N/A"}</p>
              <p><strong>Documents:</strong></p>
              <ul className="list-disc pl-5">
                {formData.documents.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
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
              The student has been successfully registered. Student ID: {formData.stuId || "Assigned"}
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