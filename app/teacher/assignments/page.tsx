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

interface Unit {
  title: string;
  duration: string;
}

interface LessonPlan {
  id: string;
  email: string;
  grade: string;
  department: string;
  status: string;
  comments: string;
  assessments: Assessments;
  closure: string;
  differentiation: string;
  formativeAssessment: string;
  introduction: string;
  mainActivity: string;
  materials: string;
  objectives: string;
  semester: string;
  subject: string;
  summativeAssessment: string;
  standards: string;
  units: Unit[];
  totalUnits: number;
  warmup: string;
}

interface StudentMark {
  [assessmentType: string]: number | string | undefined; // Allow undefined in the index signature
  action?: string;
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFinishConfirmDialog, setShowFinishConfirmDialog] = useState(false);
  const [isAssessmentComplete, setIsAssessmentComplete] = useState(false);

  // Debug state initialization
  useEffect(() => {
    console.log("markFillingPlan initialized:", markFillingPlan);
    console.log("studentMarks initialized:", studentMarks);
    console.log("isAssessmentComplete:", isAssessmentComplete);
  }, [markFillingPlan, studentMarks, isAssessmentComplete]);

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
          plans.push({
            id: data.id || "",
            email: data.email || "",
            grade: data.grade || "",
            department: data.department || "",
            status: data.status || "Approved",
            comments: data.comments || "",
            assessments: data.assessments || {},
            closure: data.closure || "",
            differentiation: data.differentiation || "",
            formativeAssessment: data.formativeAssessment || "",
            introduction: data.introduction || "",
            mainActivity: data.mainActivity || "",
            materials: data.materials || "",
            objectives: data.objectives || "",
            semester: data.semester || "",
            subject: data.subject || "",
            summativeAssessment: data.summativeAssessment || "",
            standards: data.standards || "",
            units: data.units || [],
            totalUnits: data.totalUnits || 0,
            warmup: data.warmup || "",
          });
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
        initialMarks[student.id] = { action: "None" };
        Object.keys(markFillingPlan.assessments).forEach((type) => {
          initialMarks[student.id][type] = 0;
        });
        initialMarks[student.id].total = 0;
      });

      // Fetch existing marks and status from Firestore
      const fetchMarks = async () => {
        try {
          const docRef = doc(db, "assessments", markFillingPlan.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.marks) {
              Object.keys(data.marks).forEach((studentId) => {
                initialMarks[studentId] = { ...data.marks[studentId], action: data.marks[studentId].action || "None" };
              });
            }
            setIsAssessmentComplete(data.status === "complete");
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
        "Action": marksData[student.id]?.action ?? "None",
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
    XLSX.writeFile(wb, `${plan.subject || "student-marks"}.xlsx`);

    toast.success("Student marks exported successfully!");
  };

  // Handle mark and action changes with validation
  const handleMarkChange = (studentId: string, type: string, value: string) => {
    if (markFillingPlan && !isAssessmentComplete) {
      setStudentMarks((prev) => {
        const updatedMarks = {
          ...prev,
          [studentId]: {
            ...prev[studentId],
            [type]: type === "action" ? value : parseFloat(value) || 0,
          },
        };

        // Calculate total as direct sum of assessment marks if not an action change
        if (type !== "action") {
          const maxMark = markFillingPlan.assessments[type] ?? 100;
          const validatedValue = isNaN(parseFloat(value)) || parseFloat(value) < 0 ? 0 : Math.min(parseFloat(value), maxMark);
          updatedMarks[studentId][type] = validatedValue;

          const total = Object.entries(updatedMarks[studentId])
            .filter(([key]) => key !== "total" && key !== "action")
            .reduce((sum, [, mark]) => sum + (typeof mark === "number" ? mark : 0), 0);

          updatedMarks[studentId].total = Number(total.toFixed(2));
        }

        return updatedMarks;
      });
    }
  };

  // Handle mark submission
  const handleMarkSubmit = async (isFinish: boolean, confirmed: boolean = false) => {
    if (!markFillingPlan) {
      toast.error("No lesson plan selected for mark submission.");
      return;
    }

    if (isAssessmentComplete) {
      toast.error("This assessment is already marked as complete and cannot be edited.");
      return;
    }

    if (isFinish && !confirmed) {
      // Validate that all students have either a non-zero total or an action status
      const invalidStudents = students.filter((student) => {
        const marks = studentMarks[student.id];
        const total = marks?.total ?? 0;
        const action = marks?.action ?? "None";
        return total === 0 && !["NG", "F", "W", "AUD", "EX"].includes(action);
      });

      if (invalidStudents.length > 0) {
        toast.error("All students must have either a non-zero total mark or an action status (NG, F, W, AUD, EX) to finish.");
        return;
      }

      // Show confirmation dialog for "Finish"
      setShowFinishConfirmDialog(true);
      return;
    }

    try {
      const assessmentData: {
        lessonPlanId: string;
        subject: string;
        grade: string;
        semester: string;
        marks: { [studentId: string]: StudentMark };
        timestamp: Date;
        status?: string;
      } = {
        lessonPlanId: markFillingPlan.id,
        subject: markFillingPlan.subject,
        grade: markFillingPlan.grade,
        semester: markFillingPlan.semester || "N/A",
        marks: studentMarks,
        timestamp: new Date(),
      };

      // Add status: "complete" only if triggered by the Finish button and confirmed
      if (isFinish && confirmed) {
        assessmentData.status = "complete";
      }

      // Save all student marks in a single document with lessonPlanId as the document ID
      await setDoc(doc(db, "assessments", markFillingPlan.id), assessmentData);

      toast.success("Marks saved successfully!");
      setMarkFillingPlan(null);
      setStudentMarks({});
      setShowConfirmDialog(false);
      setShowFinishConfirmDialog(false);
      setIsAssessmentComplete(isFinish && confirmed);
    } catch (error) {
      console.error("Error saving marks:", error);
      toast.error("Failed to save marks.");
    }
  };

  // Handle close modal without saving
  const handleCloseWithoutSaving = () => {
    setMarkFillingPlan(null);
    setStudentMarks({});
    setShowConfirmDialog(false);
    setShowFinishConfirmDialog(false);
  };

  // Handle close button click
  const handleCloseClick = () => {
    setShowConfirmDialog(true);
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
          <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed" aria-label="Approved Lesson Plans Table">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="w-[30%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Grade</th>
                  <th scope="col" className="w-[30%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Subject</th>
                  <th scope="col" className="w-[20%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Semester</th>
                  <th scope="col" className="w-[20%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lessonPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    aria-label={`Lesson plan for ${plan.subject}`}
                  >
                    <td className="w-[30%] px-2 py-4 text-sm text-gray-900 dark:text-gray-100 truncate" title={plan.grade}>
                      {plan.grade ? plan.grade.replace(/^grade(\d+)$/, "Grade $1") : "N/A"}
                    </td>
                    <td className="w-[30%] px-2 py-4 text-sm text-gray-900 dark:text-gray-100 truncate" title={plan.subject}>
                      {plan.subject}
                    </td>
                    <td className="w-[20%] px-2 py-4 text-sm text-gray-900 dark:text-gray-100 truncate" title={plan.semester}>
                      {plan.semester || "N/A"}
                    </td>
                    <td className="w-[20%] px-2 py-4 text-sm flex space-x-1">
                      <div className="relative group">
                        <button
                          onClick={() => setMarkFillingPlan(plan)}
                          className="p-2 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-800 transition-all duration-200 transform hover:scale-110"
                          aria-label={`Fill marks for lesson plan for ${plan.subject}`}
                        >
                          <FileText className="w-4 h-4" />
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
                          <Download className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 w-full h-full">
          <div className="p-6 rounded-3xl shadow-2xl w-full h-full bg-white dark:bg-gray-800 transition-all duration-300 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handleCloseClick}
                className="text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMarkSubmit(false)}
                  disabled={isAssessmentComplete}
                  className={`flex items-center gap-2 p-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg ${
                    isAssessmentComplete
                      ? "bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                  }`}
                  aria-label="Save marks"
                >
                  Save Marks
                </button>
                <button
                  onClick={() => handleMarkSubmit(true)}
                  disabled={isAssessmentComplete}
                  className={`flex items-center gap-2 p-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg ${
                    isAssessmentComplete
                      ? "bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                  }`}
                  aria-label="Finish and save marks"
                >
                  Finish
                </button>
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">
              Fill Marks for {markFillingPlan.subject || "N/A"}
            </h2>
            {isAssessmentComplete && (
              <div className="mb-4 text-center text-red-500 dark:text-red-400">
                This assessment is complete and cannot be edited.
              </div>
            )}
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-purple-500 dark:text-purple-400">Subject:</strong> {markFillingPlan.subject || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-purple-500 dark:text-purple-400">Grade:</strong> {markFillingPlan.grade ? markFillingPlan.grade.replace(/^grade(\d+)$/, "Grade $1") : "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-purple-500 dark:text-purple-400">Semester:</strong> {markFillingPlan.semester || "N/A"}
              </div>
              
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-purple-500 dark:text-purple-400">Assessments:</strong>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full border-collapse table-fixed" aria-label="Student Marks Table">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="w-[15%] border border-gray-300 dark:border-gray-600 p-1 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-gray-700 z-20 truncate" title="Student ID">
                          Student ID
                        </th>
                        <th className="w-[20%] border border-gray-300 dark:border-gray-600 p-1 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 truncate" title="Student Name">
                          Student Name
                        </th>
                        {markFillingPlan && Object.keys(markFillingPlan.assessments).map((type) => (
                          <th key={type} className="w-[12%] border border-gray-300 dark:border-gray-600 p-1 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 truncate" title={`${type} (${markFillingPlan.assessments[type]}%)`}>
                            {type} ({markFillingPlan.assessments[type]}%)
                          </th>
                        ))}
                        <th className="w-[10%] border border-gray-300 dark:border-gray-600 p-1 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 truncate" title="Total">
                          Total
                        </th>
                        <th className="w-[10%] border border-gray-300 dark:border-gray-600 p-1 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 truncate" title="Action">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border border-gray-300 dark:border-gray-600">
                          <td className="w-[15%] border border-gray-300 dark:border-gray-600 p-1 text-sm sticky left-0 bg-white dark:bg-gray-800 z-20 truncate" title={student.id}>
                            {student.id}
                          </td>
                          <td className="w-[20%] border border-gray-300 dark:border-gray-600 p-1 text-sm truncate" title={student.name}>
                            {student.name}
                          </td>
                          {markFillingPlan && Object.keys(markFillingPlan.assessments).map((type) => (
                            <td key={`${student.id}-${type}`} className="w-[12%] border border-gray-300 dark:border-gray-600 p-1">
                              <input
                                type="number"
                                min="0"
                                max={markFillingPlan.assessments[type]}
                                step="0.01"
                                value={typeof studentMarks[student.id]?.[type] === "number" ? studentMarks[student.id][type] : ""}
                                onChange={(e) => handleMarkChange(student.id, type, e.target.value)}
                                disabled={isAssessmentComplete}
                                className={`w-full p-1 border rounded focus:outline-none ${
                                  isAssessmentComplete
                                    ? "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                    : "focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                                }`}
                                aria-label={`Enter ${type} mark for ${student.name}`}
                              />
                            </td>
                          ))}
                          <td className="w-[10%] border border-gray-300 dark:border-gray-600 p-1 text-sm truncate">
                            {studentMarks[student.id]?.total ?? 0}
                          </td>
                          <td className="w-[10%] border border-gray-300 dark:border-gray-600 p-1">
                            <select
                              value={studentMarks[student.id]?.action ?? "None"}
                              onChange={(e) => handleMarkChange(student.id, "action", e.target.value)}
                              disabled={isAssessmentComplete}
                              className={`w-full p-1 border rounded focus:outline-none ${
                                isAssessmentComplete
                                  ? "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                  : "focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                              }`}
                              aria-label={`Select action for ${student.name}`}
                            >
                              <option value="None">None</option>
                              <option value="NG">Non-Graded (NG)</option>
                              <option value="F">Fail (F)</option>
                              <option value="W">Withdrawn (W)</option>
                              <option value="AUD">Audit (AUD)</option>
                              <option value="EX">Exempt (EX)</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="p-6 rounded-2xl shadow-xl w-full max-w-sm bg-white dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Do you want to save the file?
            </h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCloseWithoutSaving}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200"
                aria-label="Close without saving"
              >
                No
              </button>
              <button
                onClick={() => handleMarkSubmit(false)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                aria-label="Save and close"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish Confirmation Dialog */}
      {showFinishConfirmDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="p-6 rounded-2xl shadow-xl w-full max-w-sm bg-white dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Are you sure you want to finalize the marks?
            </h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowFinishConfirmDialog(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200"
                aria-label="Cancel finalizing marks"
              >
                No
              </button>
              <button
                onClick={() => handleMarkSubmit(true, true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                aria-label="Confirm and finalize marks"
              >
                Yes
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
        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        table {
          width: 100%;
          table-layout: fixed;
        }
      `}</style>
    </section>
  );
}