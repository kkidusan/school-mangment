"use client";

import { useState, useContext, useEffect } from "react";
import { db } from "../../firebase";
import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, limit, setDoc, arrayUnion, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { Loader2, Upload, CheckCircle, PlusCircle } from "lucide-react";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

// Types
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

interface SeniorStudentData {
  studentId: string;
  address?: string;
  parentContact?: string;
  subjects?: string[];
}

interface GradeData {
  grade: string;
  count: number;
}

interface SectionData {
  sectionName: string;
  studentCount: number;
}

export default function StudentRegistration() {
  const [isNewStudent, setIsNewStudent] = useState(true);
  const [activeTab, setActiveTab] = useState<"new" | "senior" | "class">("new");
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
  const [seniorFormData, setSeniorFormData] = useState<SeniorStudentData>({
    studentId: "",
    address: "",
    parentContact: "",
    subjects: [],
  });
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionCount, setNewSectionCount] = useState("");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [step, setStep] = useState(1);
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

  // Fetch grades from Firestore
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const studentsRef = collection(db, "students");
        const querySnapshot = await getDocs(studentsRef);
        const gradeCounts = querySnapshot.docs.reduce((acc, doc) => {
          const data = doc.data();
          if (data.grade) {
            acc[data.grade] = (acc[data.grade] || 0) + 1;
          }
          return acc;
        }, {} as { [key: string]: number });

        const gradeData = Object.entries(gradeCounts).map(([grade, count]) => ({
          grade,
          count,
        }));
        setGrades(gradeData);
      } catch (error) {
        console.error("Error fetching grades:", error);
        toast.error("Failed to load class arrangement data.");
      }
    };

    if (activeTab === "class") {
      fetchGrades();
    }
  }, [activeTab]);

  // Fetch sections for a selected grade
  useEffect(() => {
    const fetchSections = async () => {
      if (!selectedGrade) return;
      try {
        const sectionsRef = collection(db, "students", selectedGrade, "sections");
        const querySnapshot = await getDocs(sectionsRef);
        const sectionData = querySnapshot.docs.map((doc) => ({
          sectionName: doc.id,
          studentCount: doc.data().studentCount,
        }));
        setSections(sectionData);
      } catch (error) {
        console.error("Error fetching sections:", error);
        toast.error("Failed to load sections for this grade.");
      }
    };

    fetchSections();
  }, [selectedGrade]);

  // Generate unique student ID
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

  // Validate form fields
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (isNewStudent) {
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
    } else {
      if (!seniorFormData.studentId)
        newErrors.studentId = "Student ID is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle file upload to Cloudinary
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, documents: Array.from(e.target.files) });
    }
  };

  // Handle form submission with Cloudinary upload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isNewStudent) {
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

        // Check if grade document exists, create if not, then update with arrayUnion
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
      } else {
        const studentDoc = doc(db, "students", seniorFormData.studentId);
        await updateDoc(studentDoc, {
          address: seniorFormData.address,
          parentContact: seniorFormData.parentContact,
          subjects: seniorFormData.subjects,
          updatedAt: new Date().toISOString(),
        });

        toast.success("Senior student updated successfully!");
        setStep(3);
      }
    } catch (error) {
      console.error("Error registering student:", error);
      toast.error("Failed to register student. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Finish button click
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
    setSeniorFormData({
      studentId: "",
      address: "",
      parentContact: "",
      subjects: [],
    });
    setCustomGrade("");
    setShowCustomGradeInput(false);
    setStep(1);
    setIsNewStudent(true);
    setErrors({});
    router.refresh();
  };

  // Handle adding a new section
  const handleAddSection = async () => {
    if (!selectedGrade || !newSectionName || !newSectionCount) {
      toast.error("Please provide section name and student count.");
      return;
    }

    const count = parseInt(newSectionCount, 10);
    if (isNaN(count) || count <= 0) {
      toast.error("Please enter a valid student count.");
      return;
    }

    const totalStudents = grades.find((g) => g.grade === selectedGrade)?.count || 0;
    const currentSectionTotal = sections.reduce((sum, section) => sum + section.studentCount, 0);
    if (currentSectionTotal + count > totalStudents) {
      toast.error("Total students in sections cannot exceed total students in grade.");
      return;
    }

    try {
      const sectionRef = doc(db, "students", selectedGrade, "sections", newSectionName);
      await setDoc(sectionRef, { studentCount: count });
      setSections([...sections, { sectionName: newSectionName, studentCount: count }]);
      setNewSectionName("");
      setNewSectionCount("");
      setIsAddingSection(false);
      toast.success(`Section ${newSectionName} added successfully!`);
    } catch (error) {
      console.error("Error adding section:", error);
      toast.error("Failed to add section. Please try again.");
    }
  };

  // Handle grade selection
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

  // Render steps for registration
  const renderRegistrationStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2
              className={`text-2xl font-semibold ${
                theme === "light" ? "text-gray-800" : "text-gray-100"
              }`}
            >
              {isNewStudent ? "New Student Registration" : "Senior Student Re-registration"}
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); if (validateForm()) setStep(2); }} className="space-y-4">
              {isNewStudent ? (
                <>
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
                </>
              ) : (
                <>
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
                </>
              )}
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
              {isNewStudent ? (
                <>
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
                </>
              ) : (
                <>
                  <p><strong>Student ID:</strong> {seniorFormData.studentId}</p>
                  <p><strong>Updated Address:</strong> {seniorFormData.address || "N/A"}</p>
                  <p><strong>Updated Parent Contact:</strong> {seniorFormData.parentContact || "N/A"}</p>
                  <p><strong>Subjects:</strong> {seniorFormData.subjects?.join(", ") || "N/A"}</p>
                </>
              )}
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
              {isNewStudent
                ? `The student has been successfully registered. Student ID: ${formData.stuId || "Assigned"}`
                : "The senior student's details have been updated successfully."}
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

  // Render class arrangement tab
  const renderClassArrangement = () => (
    <div className="space-y-6">
      <h2
        className={`text-2xl font-semibold ${
          theme === "light" ? "text-gray-800" : "text-gray-100"
        }`}
      >
        Class Arrangement
      </h2>
      {selectedGrade ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`p-6 rounded-lg shadow-md ${
            theme === "light" ? "bg-white border border-gray-200" : "bg-gray-800 border border-gray-700"
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3
              className={`text-lg font-medium ${
                theme === "light" ? "text-gray-800" : "text-gray-100"
              }`}
            >
              {selectedGrade.charAt(0).toUpperCase() + selectedGrade.slice(1)}
            </h3>
            <button
              onClick={() => setSelectedGrade(null)}
              className={`text-sm ${theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"}`}
            >
              Back to Grades
            </button>
          </div>
          <p
            className={`text-sm mb-4 ${
              theme === "light" ? "text-gray-600" : "text-gray-400"
            }`}
          >
            Total Students: {grades.find((g) => g.grade === selectedGrade)?.count || 0}
          </p>
          {sections.length > 0 ? (
            <div className="space-y-4">
              {sections.map((section) => (
                <div
                  key={section.sectionName}
                  className={`p-3 rounded-md ${
                    theme === "light" ? "bg-gray-50 border border-gray-200" : "bg-gray-700 border border-gray-600"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      theme === "light" ? "text-gray-800" : "text-gray-100"
                    }`}
                  >
                    {section.sectionName}: {section.studentCount} students
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
              No sections defined yet.
            </p>
          )}
          <button
            onClick={() => setIsAddingSection(true)}
            className={`mt-4 flex items-center py-2 px-4 rounded-md text-white font-medium ${
              theme === "light" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
            } transition-colors duration-200`}
          >
            <PlusCircle className="mr-2" size={20} />
            Add Section
          </button>
          {isAddingSection && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 space-y-4"
            >
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}
                >
                  Section Name
                </label>
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g., Section 1"
                  className={`mt-1 block w-full rounded-md border border-gray-300 p-2 ${
                    theme === "light" ? "bg-white" : "bg-gray-700"
                  }`}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-gray-700" : "text-gray-300"
                  }`}
                >
                  Number of Students
                </label>
                <input
                  type="number"
                  value={newSectionCount}
                  onChange={(e) => setNewSectionCount(e.target.value)}
                  placeholder="Enter student count"
                  className={`mt-1 block w-full rounded-md border border-gray-300 p-2 ${
                    theme === "light" ? "bg-white" : "bg-gray-700"
                  }`}
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setIsAddingSection(false)}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    theme === "light" ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-500 hover:bg-gray-600"
                  } transition-colors duration-200`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSection}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    theme === "light" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                  } transition-colors duration-200`}
                >
                  Save Section
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <div>
          {grades.length === 0 ? (
            <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
              No students registered yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grades.map((grade) => (
                <div
                  key={grade.grade}
                  onClick={() => setSelectedGrade(grade.grade)}
                  className={`p-4 rounded-lg shadow-md cursor-pointer ${
                    theme === "light"
                      ? "bg-white border border-gray-200 hover:bg-gray-50"
                      : "bg-gray-800 border border-gray-700 hover:bg-gray-700"
                  } transition-colors duration-200`}
                >
                  <h3
                    className={`text-lg font-medium ${
                      theme === "light" ? "text-gray-800" : "text-gray-100"
                    }`}
                  >
                    {grade.grade.charAt(0).toUpperCase() + grade.grade.slice(1)}
                  </h3>
                  <p
                    className={`text-sm ${
                      theme === "light" ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {grade.count} {grade.count === 1 ? "student" : "students"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

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
              onClick={() => { setActiveTab("new"); setStep(1); setIsNewStudent(true); setSelectedGrade(null); }}
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
              onClick={() => { setActiveTab("senior"); setStep(1); setIsNewStudent(false); setSelectedGrade(null); }}
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
              onClick={() => { setActiveTab("class"); setSelectedGrade(null); }}
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
                  step >= 3 ? "bg-blue-500 text-white" : theme === "light" ? "bg-gray-200 text-gray-600" : "bg-gray-600 text-gray-300"
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
        {activeTab === "class" ? renderClassArrangement() : renderRegistrationStep()}
      </div>
    </motion.div>
  );
}