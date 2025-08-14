
"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext"; // Adjust path
import { User, BookOpen, Trash2, Mail } from "lucide-react";
import { toast } from "react-hot-toast";
import { db } from "../../firebase"; // Adjust path to your Firebase config
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  subjectsGrades: string[];
}

interface GradeAssignment {
  id: string;
  teacherName: string;
  email: string;
  grade: string;
  department: string;
}

interface Department {
  id: string;
  name: string;
  hod: string;
}

export default function AssignTeacher() {
  const context = useContext(ThemeContext);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeachersLoading, setIsTeachersLoading] = useState(true);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [assignments, setAssignments] = useState<GradeAssignment[]>([]);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Define grades in user-friendly format for display
  const grades = [
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
  ];

  // Utility function to normalize grade format to `gradeX`
  const normalizeGradeFormat = (grade: string): string => {
    if (!grade) return "N/A";
    // If grade is already in `gradeX` format, return as is
    if (/^grade\d+$/.test(grade.toLowerCase())) return grade.toLowerCase();
    // Convert user-friendly grade (e.g., "Grade 1", "1") to `gradeX`
    const gradeNumber = grade.replace(/[^0-9]/g, "");
    return gradeNumber ? `grade${gradeNumber}` : "N/A";
  };

  // Utility function to display grade in user-friendly format
  const displayGradeFormat = (grade: string): string => {
    if (!grade || grade === "N/A") return "N/A";
    // Convert `gradeX` to `Grade X`
    return grade.replace(/^grade(\d+)$/, "Grade $1");
  };

  useEffect(() => {
    const validateSession = async () => {
      try {
        if (!db) {
          throw new Error("Firebase database is not initialized");
        }

        const response = await fetch("/api/validate-teacher", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          const { error } = await response.json();
          toast.error(error || "Please log in as an admin to access this page");
          router.push("/");
          return;
        }

        const data = await response.json();
        if (data.role !== "teacher") {
          toast.error("Access denied: Admin role required");
          router.push("/");
          return;
        }

        setUserEmail(data.email || "Unknown");
        setIsAuthorized(true);

        if (data.email) {
          // Fetch department where hod matches userEmail
          const departmentsQuery = query(
            collection(db, "departments"),
            where("hod", "==", data.email)
          );
          const departmentsSnapshot = await getDocs(departmentsQuery);
          if (!departmentsSnapshot.empty) {
            const department = departmentsSnapshot.docs[0].data() as Department;
            setDepartmentName(department.name);

            // Fetch teachers where department matches departmentName
            const teachersQuery = query(
              collection(db, "teachers"),
              where("department", "==", department.name)
            );
            const teachersSnapshot = await getDocs(teachersQuery);
            const fetchedTeachers: Teacher[] = teachersSnapshot.docs.map((doc) => {
              const teacherData = doc.data();
              // Ensure subjectsGrades is an array
              let subjectsGrades: string[] = [];
              if (Array.isArray(teacherData.subjectsGrades)) {
                subjectsGrades = teacherData.subjectsGrades.map(normalizeGradeFormat);
              } else if (typeof teacherData.subjectsGrades === "string") {
                subjectsGrades = [normalizeGradeFormat(teacherData.subjectsGrades)];
              } else if (teacherData.subjectsGrades) {
                console.warn(`Invalid subjectsGrades for teacher ${doc.id}:`, teacherData.subjectsGrades);
                subjectsGrades = [];
              }
              return {
                id: doc.id,
                fullName: teacherData.fullName || "Unknown",
                email: teacherData.email || "Unknown",
                subjectsGrades,
              };
            });
            setTeachers(fetchedTeachers);

            // Fetch assignments for the department
            const assignmentsQuery = query(
              collection(db, "AssignTeacher"),
              where("department", "==", department.name)
            );
            const assignmentsSnapshot = await getDocs(assignmentsQuery);
            const fetchedAssignments: GradeAssignment[] = assignmentsSnapshot.docs.map((doc) => ({
              id: doc.id,
              teacherName: doc.data().teacherName || "Unknown",
              email: doc.data().email || "Unknown",
              grade: normalizeGradeFormat(doc.data().grade || "Unknown"),
              department: doc.data().department || "Unknown",
            }));
            setAssignments(fetchedAssignments);
          } else {
            setDepartmentName("No Department Assigned");
            setTeachers([]);
            setAssignments([]);
          }
        }
      } catch (error: any) {
        console.error("Error in validateSession:", error);
        setError(error.message || "An unexpected error occurred");
        toast.error(error.message || "Please log in as an admin to access this page");
        router.push("/");
      } finally {
        setIsLoading(false);
        setIsTeachersLoading(false);
        setIsAssignmentsLoading(false);
      }
    };

    validateSession();
  }, [router]);

  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher || !selectedGrade) {
      toast.error("Please select both a teacher and a grade");
      return;
    }

    if (!departmentName || departmentName === "No Department Assigned") {
      toast.error("No department assigned. Cannot create assignment.");
      return;
    }

    try {
      if (!db) {
        throw new Error("Firebase database is not initialized");
      }

      const teacher = teachers.find((t) => t.id === selectedTeacher);
      if (!teacher) {
        throw new Error("Selected teacher not found");
      }

      const normalizedGrade = normalizeGradeFormat(selectedGrade);
      const newAssignment: GradeAssignment = {
        id: `a${Date.now()}`, // Temporary ID for UI
        teacherName: teacher.fullName,
        email: teacher.email,
        grade: normalizedGrade,
        department: departmentName,
      };

      // Persist to Firestore
      const docRef = await addDoc(collection(db, "AssignTeacher"), {
        teacherName: teacher.fullName,
        email: teacher.email,
        grade: normalizedGrade,
        department: departmentName,
        createdAt: new Date(),
      });

      setAssignments([...assignments, { ...newAssignment, id: docRef.id }]);
      toast.success("Teacher assigned successfully");
      setSelectedTeacher("");
      setSelectedGrade("");
    } catch (error: any) {
      console.error("Error assigning teacher:", error);
      toast.error(error.message || "Failed to assign teacher");
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    try {
      if (!db) {
        throw new Error("Firebase database is not initialized");
      }

      await deleteDoc(doc(db, "AssignTeacher", id));
      setAssignments(assignments.filter((assignment) => assignment.id !== id));
      toast.success("Assignment removed successfully");
    } catch (error: any) {
      console.error("Error removing assignment:", error);
      toast.error(error.message || "Failed to remove assignment");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        ></motion.div>
        <p className="ml-2 text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <section className="space-y-6 p-6 max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
      >
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Assign Teachers to Grades
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Logged in as: <span className="font-semibold">{userEmail}</span>
        </p>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Department: <span className="font-semibold">{departmentName}</span>
        </p>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Assign teachers to specific grades using the form below.
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
      >
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Assign a Teacher
        </h2>
        {isTeachersLoading ? (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full"
            ></motion.div>
            <p className="text-gray-600 dark:text-gray-300">Loading teachers...</p>
          </div>
        ) : departmentName === "No Department Assigned" ? (
          <p className="text-gray-600 dark:text-gray-300">No department assigned. Please contact an administrator.</p>
        ) : teachers.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No teachers found in {departmentName}.</p>
        ) : (
          <form onSubmit={handleAssignTeacher} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="teacher"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Select Teacher
                </label>
                <select
                  id="teacher"
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName} ({teacher.email}) - {teacher.subjectsGrades.map(displayGradeFormat).join(", ") || "No subjects"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="grade"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Select Grade
                </label>
                <select
                  id="grade"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <option value="">Select a grade</option>
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={departmentName === "No Department Assigned"}
              className={`mt-4 bg-blue-500 text-white px-6 py-2 rounded-md flex items-center gap-2 transition-colors ${
                departmentName === "No Department Assigned"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-600"
              }`}
            >
              <User className="w-5 h-5" />
              Assign Teacher
            </motion.button>
          </form>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
      >
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Current Assignments
        </h2>
        {isAssignmentsLoading ? (
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full"
            ></motion.div>
            <p className="text-gray-600 dark:text-gray-300">Loading assignments...</p>
          </div>
        ) : departmentName === "No Department Assigned" ? (
          <p className="text-gray-600 dark:text-gray-300">No department assigned. No assignments available.</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">No assignments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {assignments.map((assignment) => (
                    <motion.tr
                      key={assignment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <User className="inline w-5 h-5 mr-2 text-blue-500" />
                        {assignment.teacherName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <Mail className="inline w-5 h-5 mr-2 text-purple-500" />
                        {assignment.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <BookOpen className="inline w-5 h-5 mr-2 text-green-500" />
                        {displayGradeFormat(assignment.grade)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {assignment.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </section>
  );
}
