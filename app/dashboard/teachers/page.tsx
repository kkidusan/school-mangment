
"use client";

import { useContext, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";
import { db } from "../../firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { Loader2, Users, Trash2, Calendar, Star, Book, X, Plus, Upload, Award, Clock, FileText } from "lucide-react";
import Link from "next/link";

interface Teacher {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  photo?: string;
  contact: string;
  address: string;
  dob: string;
  gender: string;
  bloodGroup?: string;
  medicalConditions?: string;
  emergencyContact: { name: string; phone: string };
  qualifications: string;
  certifications: string;
  specializations: string;
  subjects: string[];
  joiningDate: string;
  contractType: string;
  salary: number;
  employeeId: string;
  role: string;
  rolesResponsibilities: string[];
  attendance: number;
  department: string;
  documents: { name: string; url: string }[];
  leaveBalance: { sick: number; casual: number; maternityPaternity: number; emergency: number };
  performanceMetrics: { studentPerformance: number; discipline: number; lessonPlanSubmission: number };
  feedback: { student: string[]; parent: string[]; peer: string[]; principal: string[] };
  trainingWorkshops: string[];
  awards: string[];
}

export default function TeacherManagement() {
  const context = useContext(ThemeContext);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState<string>("");
  const [leaveRequest, setLeaveRequest] = useState<{ type: string; days: number; substitute?: string }>({ type: "", days: 0 });
  const [documentUpload, setDocumentUpload] = useState<File | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<{ type: string; comment: string }>({ type: "", comment: "" });
  const [timetable, setTimetable] = useState<{ teacherId: string; class: string; subject: string; day: string; time: string }[]>([]);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Fetch teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true);
        const teachersRef = collection(db, "teachers");
        const snapshot = await getDocs(teachersRef);
        const teacherList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          department: doc.data().department || "Unassigned",
          leaveBalance: doc.data().leaveBalance || { sick: 10, casual: 10, maternityPaternity: 0, emergency: 5 },
          performanceMetrics: doc.data().performanceMetrics || { studentPerformance: 0, discipline: 0, lessonPlanSubmission: 0 },
          feedback: doc.data().feedback || { student: [], parent: [], peer: [], principal: [] },
          documents: doc.data().documents || [],
          trainingWorkshops: doc.data().trainingWorkshops || [],
          awards: doc.data().awards || [],
        })) as Teacher[];
        setTeachers(teacherList);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        toast.error("Failed to load teachers. Please try again.");
        setIsLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  // Handle teacher deletion
  const handleDeleteTeacher = async (id: string) => {
    try {
      await deleteDoc(doc(db, "teachers", id));
      toast.success("Teacher deleted successfully!");
      setTeachers(teachers.filter((teacher) => teacher.id !== id));
      if (selectedTeacher?.id === id) {
        setShowModal(null);
        setSelectedTeacher(null);
      }
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toast.error("Failed to delete teacher. Please try again.");
    }
  };

  // Handle attendance tracking
  const handleAttendance = async (id: string, type: "checkIn" | "checkOut") => {
    try {
      const teacherRef = doc(db, "teachers", id);
      await updateDoc(teacherRef, {
        attendance: type === "checkIn" ? 100 : 0,
      });
      setTeachers(teachers.map((t) => (t.id === id ? { ...t, attendance: type === "checkIn" ? 100 : 0 } : t)));
      toast.success(`Teacher ${type === "checkIn" ? "checked in" : "checked out"} successfully!`);
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Failed to update attendance. Please try again.");
    }
  };

  // Handle leave request
  const handleLeaveRequest = async (teacherId: string) => {
    if (!leaveRequest.type || leaveRequest.days <= 0) {
      toast.error("Please select leave type and valid days.");
      return;
    }
    try {
      const teacherRef = doc(db, "teachers", teacherId);
      const teacher = teachers.find((t) => t.id === teacherId);
      if (teacher && teacher.leaveBalance[leaveRequest.type as keyof typeof teacher.leaveBalance] >= leaveRequest.days) {
        const updatedBalance = {
          ...teacher.leaveBalance,
          [leaveRequest.type]: teacher.leaveBalance[leaveRequest.type as keyof typeof teacher.leaveBalance] - leaveRequest.days,
        };
        await updateDoc(teacherRef, { leaveBalance: updatedBalance });
        setTeachers(
          teachers.map((t) => (t.id === teacherId ? { ...t, leaveBalance: updatedBalance } : t))
        );
        if (leaveRequest.substitute) {
          setTimetable((prev) =>
            prev.map((slot) =>
              slot.teacherId === teacherId ? { ...slot, teacherId: leaveRequest.substitute! } : slot
            )
          );
        }
        toast.success("Leave request processed successfully!");
        setLeaveRequest({ type: "", days: 0, substitute: "" });
      } else {
        toast.error("Insufficient leave balance.");
      }
    } catch (error) {
      console.error("Error processing leave:", error);
      toast.error("Failed to process leave request. Please try again.");
    }
  };

  // Handle subject assignment
  const handleAssignSubject = async (teacherId: string) => {
    if (!newSubject.trim()) {
      toast.error("Please enter a subject to assign.");
      return;
    }
    try {
      const teacherRef = doc(db, "teachers", teacherId);
      const teacher = teachers.find((t) => t.id === teacherId);
      if (teacher) {
        const updatedSubjects = [...teacher.subjects, newSubject];
        await updateDoc(teacherRef, { subjects: updatedSubjects });
        setTeachers(
          teachers.map((t) =>
            t.id === teacherId ? { ...t, subjects: updatedSubjects } : t
          )
        );
        setNewSubject("");
        toast.success(`Subject "${newSubject}" assigned successfully!`);
      }
    } catch (error) {
      console.error("Error assigning subject:", error);
      toast.error("Failed to assign subject. Please try again.");
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (teacherId: string) => {
    if (!documentUpload) {
      toast.error("Please select a document to upload.");
      return;
    }
    try {
      const teacherRef = doc(db, "teachers", teacherId);
      const teacher = teachers.find((t) => t.id === teacherId);
      if (teacher) {
        const newDoc = { name: documentUpload.name, url: URL.createObjectURL(documentUpload) };
        const updatedDocuments = [...teacher.documents, newDoc];
        await updateDoc(teacherRef, { documents: updatedDocuments });
        setTeachers(
          teachers.map((t) =>
            t.id === teacherId ? { ...t, documents: updatedDocuments } : t
          )
        );
        setDocumentUpload(null);
        toast.success("Document uploaded successfully!");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document. Please try again.");
    }
  };

  // Handle performance feedback
  const handleFeedback = async (teacherId: string) => {
    if (!feedbackInput.type || !feedbackInput.comment.trim()) {
      toast.error("Please select feedback type and enter a comment.");
      return;
    }
    try {
      const teacherRef = doc(db, "teachers", teacherId);
      const teacher = teachers.find((t) => t.id === teacherId);
      if (teacher) {
        const updatedFeedback = {
          ...teacher.feedback,
          [feedbackInput.type]: [...teacher.feedback[feedbackInput.type as keyof typeof teacher.feedback], feedbackInput.comment],
        };
        await updateDoc(teacherRef, { feedback: updatedFeedback });
        setTeachers(
          teachers.map((t) =>
            t.id === teacherId ? { ...t, feedback: updatedFeedback } : t
          )
        );
        setFeedbackInput({ type: "", comment: "" });
        toast.success("Feedback submitted successfully!");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    }
  };

  // Handle timetable assignment
  const handleTimetableAssignment = async (teacherId: string, className: string, subject: string, day: string, time: string) => {
    try {
      const newSlot = { teacherId, class: className, subject, day, time };
      setTimetable((prev) => {
        // Check for clashes
        const hasClash = prev.some(
          (slot) => slot.teacherId === teacherId && slot.day === day && slot.time === time
        );
        if (hasClash) {
          toast.error("Timetable clash detected!");
          return prev;
        }
        return [...prev, newSlot];
      });
      toast.success("Timetable slot assigned successfully!");
    } catch (error) {
      console.error("Error assigning timetable:", error);
      toast.error("Failed to assign timetable slot. Please try again.");
    }
  };

  // Handle award assignment
  const handleAssignAward = async (teacherId: string, award: string) => {
    try {
      const teacherRef = doc(db, "teachers", teacherId);
      const teacher = teachers.find((t) => t.id === teacherId);
      if (teacher) {
        const updatedAwards = [...teacher.awards, award];
        await updateDoc(teacherRef, { awards: updatedAwards });
        setTeachers(
          teachers.map((t) =>
            t.id === teacherId ? { ...t, awards: updatedAwards } : t
          )
        );
        toast.success(`Award "${award}" assigned successfully!`);
      }
    } catch (error) {
      console.error("Error assigning award:", error);
      toast.error("Failed to assign award. Please try again.");
    }
  };

  // Group teachers by department
  const groupedTeachers = teachers.reduce((acc, teacher) => {
    const dept = teacher.department || "Unassigned";
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(teacher);
    return acc;
  }, {} as Record<string, Teacher[]>);

  // Handle department card click
  const handleDepartmentClick = (department: string) => {
    setSelectedDepartment(department);
  };

  // Handle back to department view
  const handleBackToDepartments = () => {
    setSelectedDepartment(null);
    setSelectedTeacher(null);
    setShowModal(null);
  };

  // Handle teacher details view
  const handleViewTeacherDetails = (teacher: Teacher, modalType: string) => {
    setSelectedTeacher(teacher);
    setShowModal(modalType);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto"
    >
      <h1
        className={`text-3xl font-bold mb-6 ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}
      >
        Teacher Management
      </h1>
      <div
        className={`p-6 rounded-xl shadow-sm relative ${
          theme === "light"
            ? "bg-gradient-to-br from-blue-100 to-purple-100"
            : "bg-gradient-to-br from-gray-700 to-gray-800"
        }`}
      >
        <Link
          href="/dashboard/teachers/register"
          className={`absolute top-4 right-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all`}
        >
          Add New Teacher
        </Link>

        {/* Department Cards or Teacher List */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : selectedDepartment ? (
          <div className="space-y-8">
            <button
              onClick={handleBackToDepartments}
              className={`mb-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all`}
            >
              Back to Departments
            </button>
            <h2
              className={`text-2xl font-semibold mb-4 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              {selectedDepartment}
            </h2>
            {groupedTeachers[selectedDepartment].length === 0 ? (
              <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                No teachers found in this department.
              </p>
            ) : (
              <div className="space-y-4">
                {groupedTeachers[selectedDepartment].map((teacher) => (
                  <motion.div
                    key={teacher.id}
                    className={`p-4 rounded-lg ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    } flex flex-col sm:flex-row sm:items-center sm:justify-between cursor-pointer`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center">
                      <Users className="w-5 h-5 mr-3" />
                      <div>
                        <p className={`font-semibold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
                          {teacher.firstName} {teacher.lastName} ({teacher.role})
                        </p>
                        <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                          Subjects: {teacher.subjects.join(", ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4 sm:mt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTeacherDetails(teacher, "details");
                        }}
                        className={`p-2 rounded-full ${theme === "light" ? "text-blue-600 hover:bg-blue-100" : "text-blue-400 hover:bg-gray-700"}`}
                        title="View Details"
                      >
                        <Users className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAttendance(teacher.id, "checkIn");
                        }}
                        className={`p-2 rounded-full ${theme === "light" ? "text-blue-600 hover:bg-blue-100" : "text-blue-400 hover:bg-gray-700"}`}
                        title="Check In"
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTeacherDetails(teacher, "feedback");
                        }}
                        className={`p-2 rounded-full ${theme === "light" ? "text-blue-600 hover:bg-blue-100" : "text-blue-400 hover:bg-gray-700"}`}
                        title="Submit Feedback"
                      >
                        <Star className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTeacherDetails(teacher, "timetable");
                        }}
                        className={`p-2 rounded-full ${theme === "light" ? "text-blue-600 hover:bg-blue-100" : "text-blue-400 hover:bg-gray-700"}`}
                        title="Assign Timetable"
                      >
                        <Book className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTeacher(teacher.id);
                        }}
                        className={`p-2 rounded-full ${theme === "light" ? "text-red-600 hover:bg-red-100" : "text-red-400 hover:bg-gray-700"}`}
                        title="Delete Teacher"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(groupedTeachers).length === 0 ? (
              <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                No departments found. Add a new teacher to get started.
              </p>
            ) : (
              Object.keys(groupedTeachers)
                .sort()
                .map((department) => (
                  <motion.div
                    key={department}
                    className={`p-4 rounded-lg cursor-pointer ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleDepartmentClick(department)}
                  >
                    <h2
                      className={`text-xl font-semibold ${
                        theme === "light" ? "text-zinc-700" : "text-zinc-300"
                      }`}
                    >
                      {department}
                    </h2>
                    <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                      {groupedTeachers[department].length} Teacher
                      {groupedTeachers[department].length !== 1 ? "s" : ""}
                    </p>
                  </motion.div>
                ))
            )}
          </div>
        )}
      </div>

      {/* Teacher Details Modal */}
      <AnimatePresence>
        {showModal === "details" && selectedTeacher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`p-6 rounded-xl max-w-lg w-full ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-semibold ${
                    theme === "light" ? "text-zinc-800" : "text-zinc-100"
                  }`}
                >
                  {selectedTeacher.firstName} {selectedTeacher.lastName}'s Details
                </h2>
                <button
                  onClick={() => setShowModal(null)}
                  className={`p-2 rounded-full ${
                    theme === "light" ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-gray-700"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {selectedTeacher.photo && (
                  <img src={selectedTeacher.photo} alt="Teacher" className="w-24 h-24 rounded-full mb-4" />
                )}
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Employee ID:</strong> {selectedTeacher.employeeId}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Contact:</strong> {selectedTeacher.contact}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>DOB:</strong> {new Date(selectedTeacher.dob).toLocaleDateString()}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Address:</strong> {selectedTeacher.address}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Gender:</strong> {selectedTeacher.gender}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Blood Group:</strong> {selectedTeacher.bloodGroup || "N/A"}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Medical Conditions:</strong> {selectedTeacher.medicalConditions || "None"}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Emergency Contact:</strong> {selectedTeacher.emergencyContact.name} ({selectedTeacher.emergencyContact.phone})
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Qualifications:</strong> {selectedTeacher.qualifications}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Certifications:</strong> {selectedTeacher.certifications || "None"}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Specializations:</strong> {selectedTeacher.specializations || "None"}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Subjects:</strong> {selectedTeacher.subjects.join(", ")}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Joined:</strong> {new Date(selectedTeacher.joiningDate).toLocaleDateString()}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Contract:</strong> {selectedTeacher.contractType}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Salary:</strong> ${selectedTeacher.salary}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Roles & Responsibilities:</strong> {selectedTeacher.rolesResponsibilities.join(", ")}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Attendance:</strong> {selectedTeacher.attendance}%
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Department:</strong> {selectedTeacher.department}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Training/Workshops:</strong> {selectedTeacher.trainingWorkshops.join(", ") || "None"}
                </p>
                <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                  <strong>Awards:</strong> {selectedTeacher.awards.join(", ") || "None"}
                </p>
              </div>
              <div className="mt-4">
                <h3
                  className={`text-lg font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Assign New Subject
                </h3>
                <div className="flex space-x-2 mt-2">
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Enter subject name"
                    className={`flex-1 p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  />
                  <button
                    onClick={() => handleAssignSubject(selectedTeacher.id)}
                    className={`p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all`}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <h3
                  className={`text-lg font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Upload Document
                </h3>
                <div className="flex space-x-2 mt-2">
                  <input
                    type="file"
                    onChange={(e) => setDocumentUpload(e.target.files?.[0] || null)}
                    className={`flex-1 p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  />
                  <button
                    onClick={() => handleDocumentUpload(selectedTeacher.id)}
                    className={`p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all`}
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                </div>
                {selectedTeacher.documents.length > 0 && (
                  <div className="mt-2">
                    <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                      <strong>Documents:</strong>
                    </p>
                    {selectedTeacher.documents.map((doc, index) => (
                      <a key={index} href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                        {doc.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => handleAttendance(selectedTeacher.id, "checkOut")}
                  className={`p-2 rounded-full ${theme === "light" ? "text-blue-600 hover:bg-blue-100" : "text-blue-400 hover:bg-gray-700"}`}
                  title="Check Out"
                >
                  <Clock className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleAssignAward(selectedTeacher.id, "Teacher of the Month")}
                  className={`p-2 rounded-full ${theme === "light" ? "text-blue-600 hover:bg-blue-100" : "text-blue-400 hover:bg-gray-700"}`}
                  title="Assign Award"
                >
                  <Award className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteTeacher(selectedTeacher.id)}
                  className={`p-2 rounded-full ${theme === "light" ? "text-red-600 hover:bg-red-100" : "text-red-400 hover:bg-gray-700"}`}
                  title="Delete Teacher"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Request Modal */}
      <AnimatePresence>
        {showModal === "leave" && selectedTeacher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`p-6 rounded-xl max-w-lg w-full ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-semibold ${
                    theme === "light" ? "text-zinc-800" : "text-zinc-100"
                  }`}
                >
                  Request Leave
                </h2>
                <button
                  onClick={() => setShowModal(null)}
                  className={`p-2 rounded-full ${
                    theme === "light" ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-gray-700"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Leave Type
                  </label>
                  <select
                    value={leaveRequest.type}
                    onChange={(e) => setLeaveRequest({ ...leaveRequest, type: e.target.value })}
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  >
                    <option value="">Select Type</option>
                    <option value="sick">Sick Leave</option>
                    <option value="casual">Casual Leave</option>
                    <option value="maternityPaternity">Maternity/Paternity Leave</option>
                    <option value="emergency">Emergency Leave</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Days
                  </label>
                  <input
                    type="number"
                    value={leaveRequest.days}
                    onChange={(e) => setLeaveRequest({ ...leaveRequest, days: parseInt(e.target.value) || 0 })}
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  />
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Substitute Teacher (Optional)
                  </label>
                  <select
                    value={leaveRequest.substitute || ""}
                    onChange={(e) => setLeaveRequest({ ...leaveRequest, substitute: e.target.value })}
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  >
                    <option value="">None</option>
                    {teachers
                      .filter((t) => t.id !== selectedTeacher.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  onClick={() => handleLeaveRequest(selectedTeacher.id)}
                  className={`w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all`}
                >
                  Submit Leave Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showModal === "feedback" && selectedTeacher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`p-6 rounded-xl max-w-lg w-full ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-semibold ${
                    theme === "light" ? "text-zinc-800" : "text-zinc-100"
                  }`}
                >
                  Submit Feedback
                </h2>
                <button
                  onClick={() => setShowModal(null)}
                  className={`p-2 rounded-full ${
                    theme === "light" ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-gray-700"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Feedback Type
                  </label>
                  <select
                    value={feedbackInput.type}
                    onChange={(e) => setFeedbackInput({ ...feedbackInput, type: e.target.value })}
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  >
                    <option value="">Select Type</option>
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="peer">Peer</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Comment
                  </label>
                  <textarea
                    value={feedbackInput.comment}
                    onChange={(e) => setFeedbackInput({ ...feedbackInput, comment: e.target.value })}
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  />
                </div>
                <button
                  onClick={() => handleFeedback(selectedTeacher.id)}
                  className={`w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all`}
                >
                  Submit Feedback
                </button>
              </div>
              <div className="mt-4">
                <h3
                  className={`text-lg font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Existing Feedback
                </h3>
                {Object.entries(selectedTeacher.feedback).map(([type, comments]) => (
                  <div key={type}>
                    <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                      <strong>{type.charAt(0).toUpperCase() + type.slice(1)}:</strong>{" "}
                      {comments.length > 0 ? comments.join("; ") : "None"}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timetable Assignment Modal */}
      <AnimatePresence>
        {showModal === "timetable" && selectedTeacher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`p-6 rounded-xl max-w-lg w-full ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-semibold ${
                    theme === "light" ? "text-zinc-800" : "text-zinc-100"
                  }`}
                >
                  Assign Timetable
                </h2>
                <button
                  onClick={() => setShowModal(null)}
                  className={`p-2 rounded-full ${
                    theme === "light" ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-gray-700"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Class
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Grade 10A"
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    onChange={(e) => {
                      // Simplified for demo
                    }}
                  />
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Subject
                  </label>
                  <select
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  >
                    {selectedTeacher.subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Day
                  </label>
                  <select
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  >
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 09:00-10:00"
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                  />
                </div>
                <button
                  onClick={() =>
                    handleTimetableAssignment(
                      selectedTeacher.id,
                      "Grade 10A", // Simplified for demo
                      selectedTeacher.subjects[0] || "Math",
                      "Monday",
                      "09:00-10:00"
                    )
                  }
                  className={`w-full p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all`}
                >
                  Assign Timetable
                </button>
              </div>
              <div className="mt-4">
                <h3
                  className={`text-lg font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Current Timetable
                </h3>
                {timetable
                  .filter((slot) => slot.teacherId === selectedTeacher.id)
                  .map((slot, index) => (
                    <p key={index} className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                      {slot.class}: {slot.subject} on {slot.day} at {slot.time}
                    </p>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
