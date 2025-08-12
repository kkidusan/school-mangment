"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { db } from "../../firebase";
import { getDoc, doc, setDoc, query, where, onSnapshot, collection } from "firebase/firestore";
import { Download, X, FileText } from "lucide-react";
import dynamic from "next/dynamic";

interface Assessments {
  [key: string]: number | undefined;
}

interface LessonPlan {
  id: string;
  email: string;
  grade: string;
  department: string;
  status: string;
  comments: string;
  assessment: string;
  assessments: Assessments;
  closure: string;
  differentiation: string;
  duration: string;
  formativeAssessment: string;
  introduction: string;
  mainActivity: string;
  materials: string;
  objectives: string;
  subject: string;
  summativeAssessment: string;
  topic: string;
  warmup: string;
}

interface StudentMark {
  [assessmentType: string]: number;
}

interface Student {
  id: string;
  name: string;
}

export default function AssignmentsPage() {
  const context = useContext(ThemeContext);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [markFillingPlan, setMarkFillingPlan] = useState<LessonPlan | null>(null);
  const [studentMarks, setStudentMarks] = useState<{ [studentId: string]: StudentMark }>({});
  const [students, setStudents] = useState<Student[]>([]);

  // Validate session and get user email
  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch("/api/validate-teacher", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          const { error } = await response.json();
          toast.error(error || "Please log in as a teacher to access this page");
          router.push("/login");
          return;
        }

        const data = await response.json();
        if (data.role !== "teacher" && data.role !== "admin") {
          toast.error("Access denied: Teacher or Admin role required");
          router.push("/login");
          return;
        }

        setUserEmail(data.email);
        setIsAuthorized(true);
      } catch (error: any) {
        console.error("Session validation error:", error);
        toast.error("Please log in as a teacher to access this page");
        router.push("/login");
      }
    };

    validateSession();
  }, [router]);

  // Fetch students from grades collection where document ID matches the current lesson plan's grade
  useEffect(() => {
    const fetchStudents = async () => {
      if (!markFillingPlan || !markFillingPlan.grade) {
        setStudents([]);
        return;
      }

      try {
        const gradeRef = doc(db, "grades", markFillingPlan.grade);
        const gradeSnap = await getDoc(gradeRef);
        if (gradeSnap.exists()) {
          const data = gradeSnap.data();
          if (data.students && Array.isArray(data.students)) {
            const fetchedStudents: Student[] = data.students.map((student: any) => ({
              id: student.stuId,
              name: student.fullName,
            }));
            setStudents(fetchedStudents);
          } else {
            setStudents([]);
            toast.warn(`No students found for ${markFillingPlan.grade}.`);
          }
        } else {
          setStudents([]);
          toast.warn(`Document for ${markFillingPlan.grade} does not exist.`);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error(`Failed to fetch students for ${markFillingPlan.grade}.`);
      }
    };

    if (isAuthorized && markFillingPlan) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [isAuthorized, markFillingPlan]);

  // Fetch approved lesson plans for the current user
  useEffect(() => {
    if (!isAuthorized || !userEmail) return;

    setLoading(true);
    const q = query(
      collection(db, "lesson_plans"),
      where("email", "==", userEmail),
      where("status", "==", "Approved")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const plans: LessonPlan[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (
            data.id &&
            data.email &&
            data.grade &&
            data.department &&
            data.subject &&
            data.duration &&
            data.topic &&
            data.objectives &&
            data.materials &&
            data.warmup &&
            data.introduction &&
            data.mainActivity &&
            data.assessment &&
            data.closure &&
            data.differentiation &&
            data.formativeAssessment &&
            data.summativeAssessment &&
            data.status &&
            data.assessments
          ) {
            plans.push({
              id: data.id,
              email: data.email,
              grade: data.grade,
              department: data.department,
              status: data.status,
              comments: data.comments || "",
              assessment: data.assessment,
              assessments: data.assessments,
              closure: data.closure,
              differentiation: data.differentiation,
              duration: data.duration,
              formativeAssessment: data.formativeAssessment,
              introduction: data.introduction,
              mainActivity: data.mainActivity,
              materials: data.materials,
              objectives: data.objectives,
              subject: data.subject,
              summativeAssessment: data.summativeAssessment,
              topic: data.topic,
              warmup: data.warmup,
            });
          }
        });
        setLessonPlans(plans);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching lesson plans:", error);
        toast.error("Failed to fetch lesson plans.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthorized, userEmail]);

  // Fetch and initialize student marks when opening mark filling modal
  useEffect(() => {
    if (markFillingPlan) {
      const initialMarks: { [studentId: string]: StudentMark } = {};
      students.forEach((student) => {
        initialMarks[student.id] = {};
        Object.keys(markFillingPlan.assessments).forEach((type) => {
          initialMarks[student.id][type] = 0;
        });
        initialMarks[student.id].total = 0;
      });

      // Fetch existing marks from Firestore
      const fetchMarks = async () => {
        try {
          const docRef = doc(db, "assessments", markFillingPlan.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.marks) {
              Object.keys(data.marks).forEach((studentId) => {
                initialMarks[studentId] = { ...data.marks[studentId] };
              });
            }
          }
          setStudentMarks(initialMarks);
        } catch (error) {
          console.error("Error fetching marks:", error);
          toast.error("Failed to fetch existing marks.");
        }
      };

      fetchMarks();
    }
  }, [markFillingPlan, students]);

  // Handle export to Excel for student marks
  const handleExport = async (plan: LessonPlan | null) => {
    if (!plan) {
      toast.error("No lesson plan selected for export.");
      return;
    }

    // Dynamic import of xlsx to ensure client-side execution
    const XLSX = await import("xlsx");

    // Fetch marks from Firestore
    let marksData: { [studentId: string]: StudentMark } = {};
    try {
      const docRef = doc(db, "assessments", plan.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.marks) {
          marksData = data.marks;
        }
      }
    } catch (error) {
      console.error("Error fetching marks for export:", error);
      toast.error("Failed to fetch marks for export.");
    }

    // Prepare data for export
    const data = students.map((student) => {
      const row: { [key: string]: string | number } = {
        "Student ID": student.id,
        "Student Name": student.name,
      };
      // Add assessment types
      Object.keys(plan.assessments).forEach((type) => {
        row[type] = marksData[student.id]?.[type] ?? 0;
      });
      // Add total
      row["Total"] = marksData[student.id]?.total ?? 0;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Marks");
    XLSX.writeFile(wb, `${plan.topic || "student-marks"}.xlsx`);

    toast.success("Student marks exported successfully!");
  };

  // Handle mark changes with validation
  const handleMarkChange = (studentId: string, type: string, value: string) => {
    const numValue = parseFloat(value);
    if (markFillingPlan) {
      const maxMark = markFillingPlan.assessments[type] ?? 100;
      const validatedValue = isNaN(numValue) || numValue < 0 ? 0 : Math.min(numValue, maxMark);

      setStudentMarks((prev) => {
        const updatedMarks = {
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [type]: validatedValue,
          },
        };

        // Calculate total as direct sum of assessment marks
        const total = Object.entries(updatedMarks[studentId])
          .filter(([key]) => key !== "total")
          .reduce((sum, [, mark]) => sum + mark, 0);

        updatedMarks[studentId].total = Number(total.toFixed(2));

        return updatedMarks;
      });
    }
  };

  // Handle mark submission
  const handleMarkSubmit = async () => {
    if (!markFillingPlan) {
      toast.error("No lesson plan selected for mark submission.");
      return;
    }

    try {
      const assessmentData = {
        lessonPlanId: markFillingPlan.id,
        subject: markFillingPlan.subject,
        grade: markFillingPlan.grade,
        topic: markFillingPlan.topic,
        marks: studentMarks,
        timestamp: new Date(),
      };

      // Save all student marks in a single document with lessonPlanId as the document ID
      await setDoc(doc(db, "assessments", markFillingPlan.id), assessmentData);

      toast.success("Marks saved successfully!");
      setMarkFillingPlan(null);
      setStudentMarks({});
    } catch (error) {
      console.error("Error saving marks:", error);
      toast.error("Failed to save marks.");
    }
  };

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  if (loading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <section className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">
          Approved Lesson Plans
        </h2>
        {lessonPlans.length === 0 ? (
          <div className="text-center py-16 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
              No Approved Lesson Plans Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              No approved lesson plans are available for your account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl shadow-xl bg-white dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" aria-label="Approved Lesson Plans Table">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Grade</th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lessonPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    aria-label={`Lesson plan for ${plan.subject}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {plan.grade ? plan.grade.replace(/^grade(\d+)$/, "Grade $1") : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {plan.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm flex space-x-3">
                      <div className="relative group">
                        <button
                          onClick={() => setMarkFillingPlan(plan)}
                          className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800 transition-all duration-200 transform hover:scale-110"
                          aria-label={`Fill marks for lesson plan for ${plan.subject}`}
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Fill Marks
                        </span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => handleExport(plan)}
                          className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800 transition-all duration-200 transform hover:scale-110"
                          aria-label={`Export student marks for lesson plan for ${plan.subject}`}
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Export Marks
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mark Filling Modal */}
      {markFillingPlan && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="p-8 rounded-3xl shadow-2xl w-full h-full bg-white dark:bg-gray-800 transition-all duration-300 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  setMarkFillingPlan(null);
                  setStudentMarks({});
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">
              Fill Marks for {markFillingPlan?.topic ?? "N/A"}
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-purple-500 dark:text-purple-400">Subject:</strong> {markFillingPlan?.subject ?? "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-purple-500 dark:text-purple-400">Grade:</strong> {markFillingPlan?.grade ? markFillingPlan.grade.replace(/^grade(\d+)$/, "Grade $1") : "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-purple-500 dark:text-purple-400">Assessments:</strong>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-gray-700 min-w-[100px] z-20">
                          Student ID
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 sticky bg-gray-100 dark:bg-gray-700 min-w-[150px] z-10" style={{ left: '100px' }}>
                          Student Name
                        </th>
                        {markFillingPlan && Object.keys(markFillingPlan.assessments).map((type) => (
                          <th key={type} className="border border-gray-300 dark:border-gray-600 p-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[120px]">
                            {type} ({markFillingPlan.assessments[type]}%)
                          </th>
                        ))}
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border border-gray-300 dark:border-gray-600">
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-sm sticky left-0 bg-white dark:bg-gray-800 min-w-[100px] z-20">
                            {student.id}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-sm sticky bg-white dark:bg-gray-800 min-w-[150px] z-10" style={{ left: '100px' }}>
                            {student.name}
                          </td>
                          {markFillingPlan && Object.keys(markFillingPlan.assessments).map((type) => (
                            <td key={`${student.id}-${type}`} className="border border-gray-300 dark:border-gray-600 p-2 min-w-[120px]">
                              <input
                                type="number"
                                min="0"
                                max={markFillingPlan.assessments[type]}
                                step="0.01"
                                value={studentMarks[student.id]?.[type] ?? ""}
                                onChange={(e) => handleMarkChange(student.id, type, e.target.value)}
                                className="w-full p-1 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                aria-label={`Enter ${type} mark for ${student.name}`}
                              />
                            </td>
                          ))}
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-sm min-w-[100px]">
                            {studentMarks[student.id]?.total ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <button
                onClick={handleMarkSubmit}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-md hover:shadow-lg w-full justify-center mt-4"
                aria-label="Save marks"
              >
                Save Marks
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.4s ease-out;
        }
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: ${theme === "light" ? "#f1f1f1" : "#2d3748"};
          border-radius: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: ${theme === "light" ? "#a0aec0" : "#4a5568"};
          border-radius: 10px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: ${theme === "light" ? "#718096" : "#718096"};
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        .sticky {
          position: sticky;
          z-index: 10;
        }
        .min-w-[100px] {
          min-width: 100px;
        }
        .min-w-[150px] {
          min-width: 150px;
        }
        .min-w-[120px] {
          min-width: 120px;
        }
      `}</style>
    </section>
  );
}