"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext";
import { BookOpen, Download, Eye, Edit, Trash2, ArrowLeft, X, Share2 } from "lucide-react";
import { toast } from "react-toastify";
import { db } from "../../firebase";
import { doc, setDoc, getDocs, collection, query, where, deleteDoc } from "firebase/firestore";
import LessonPlanForm from "./LessonPlanForm";

interface Unit {
  title: string;
  duration: string;
}

interface LessonPlan {
  id: string;
  email: string;
  department: string;
  subject: string;
  grade: string;
  objectives: string;
  materials: string;
  warmup: string;
  introduction: string;
  mainActivity: string;
  closure: string;
  differentiation: string;
  formativeAssessment: string;
  summativeAssessment: string;
  standards: string;
  status: string;
  assessments: { [key: string]: number | undefined };
  units: Unit[];
  totalUnits: number;
}

export default function LessonPlanning() {
  const context = useContext(ThemeContext);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [department, setDepartment] = useState<string>("N/A");
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<string[]>([]);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan>({
    id: "",
    email: "",
    department: "",
    subject: "",
    grade: "",
    objectives: "",
    materials: "",
    warmup: "",
    introduction: "",
    mainActivity: "",
    closure: "",
    differentiation: "",
    formativeAssessment: "",
    summativeAssessment: "",
    standards: "",
    status: "Draft",
    assessments: {},
    units: [],
    totalUnits: 0,
  });

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
        if (data.role !== "teacher") {
          toast.error("Access denied: Teacher role required");
          router.push("/login");
          return;
        }

        setUserEmail(data.email || null);
        setIsAuthorized(true);

        if (data.email) {
          const teacherQuery = query(
            collection(db, "teachers"),
            where("email", "==", data.email)
          );
          const teacherSnapshot = await getDocs(teacherQuery);
          if (!teacherSnapshot.empty) {
            const teacherData = teacherSnapshot.docs[0].data();
            setDepartment(teacherData.department || "N/A");
            setLessonPlan((prev) => ({ ...prev, department: teacherData.department || "N/A" }));
          } else {
            setDepartment("N/A");
            toast.warn("No department found for this teacher.");
          }
        }
      } catch (error: any) {
        toast.error("Please log in as a teacher to access this page");
        router.push("/login");
      }
    };

    validateSession();
  }, [router]);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const gradesCollection = collection(db, "grades");
        const gradesSnapshot = await getDocs(gradesCollection);
        const gradesList = gradesSnapshot.docs
          .map((doc) => doc.data().grade)
          .filter((grade): grade is string => !!grade)
          .sort();
        setGrades(gradesList);
      } catch (error) {
        console.error("Error fetching grades:", error);
        toast.error("Failed to fetch grades.");
      }
    };

    if (isAuthorized) {
      fetchGrades();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || !userEmail) return;

    const fetchLessonPlans = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "lesson_plans"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);
        const plans: LessonPlan[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          plans.push({
            id: data.id || "",
            email: data.email || "",
            department: data.department || "",
            subject: data.subject || "",
            grade: data.grade || "",
            objectives: data.objectives || "",
            materials: data.materials || "",
            warmup: data.warmup || "",
            introduction: data.introduction || "",
            mainActivity: data.mainActivity || "",
            closure: data.closure || "",
            differentiation: data.differentiation || "",
            formativeAssessment: data.formativeAssessment || "",
            summativeAssessment: data.summativeAssessment || "",
            standards: data.standards || "",
            status: data.status || "Draft",
            assessments: data.assessments || {},
            units: data.units || [],
            totalUnits: data.totalUnits || 0,
          });
        });
        setLessonPlans(plans);
      } catch (error) {
        console.error("Error fetching lesson plans:", error);
        toast.error("Failed to fetch lesson plans.");
      } finally {
        setLoading(false);
      }
    };
    fetchLessonPlans();
  }, [isAuthorized, userEmail]);

  const handleEdit = (plan: LessonPlan) => {
    setLessonPlan(plan);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this lesson plan?")) return;
    try {
      await deleteDoc(doc(db, "lesson_plans", planId));
      setLessonPlans((prev) => prev.filter((plan) => plan.id !== planId));
      toast.success("Lesson plan deleted successfully!");
    } catch (error) {
      console.error("Error deleting lesson plan:", error);
      toast.error("Failed to delete lesson plan.");
    }
  };

  const handleExport = (plan: LessonPlan) => {
    const assessmentDetails = Object.entries(plan.assessments)
      .filter(([_, value]) => value !== undefined && value > 0)
      .map(([type, percentage]) => `${type}: ${percentage}%`)
      .join("\n");
    const unitDetails = plan.units.length > 0
      ? plan.units.map((unit, index) => `Unit ${index + 1}: ${unit.title} - ${unit.duration}`).join("\n")
      : "No units defined";
    const content = `
Lesson Plan
Created by: ${plan.email}
Department: ${plan.department}
Subject: ${plan.subject}
Grade: ${plan.grade}
Standards: ${plan.standards}
Objectives: ${plan.objectives}
Materials: ${plan.materials}
Warm-up: ${plan.warmup}
Introduction: ${plan.introduction}
Main Activity: ${plan.mainActivity}
Closure: ${plan.closure}
Differentiation: ${plan.differentiation}
Formative Assessment: ${plan.formativeAssessment}
Summative Assessment: ${plan.summativeAssessment}
Status: ${plan.status}
Assessments:\n${assessmentDetails}
Units:\n${unitDetails}
    `.trim();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.subject || "lesson-plan"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lesson plan exported successfully!");
  };

  const handleShare = (plan: LessonPlan) => {
    const shareLink = `https://school.example.com/lesson-plan/${plan.id}`;
    navigator.clipboard.writeText(shareLink);
    toast.success("Share link copied to clipboard!");
  };

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  if (loading || !isAuthorized || !userEmail) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <section className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
      {lessonPlans.length === 0 ? (
        <div className="text-center py-16 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl animate-slide-in">
          <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">No Lesson Plans Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Create a new lesson plan to start organizing your teaching.</p>
          <p className="text-gray-700 dark:text-gray-200 mb-6">
            <strong>Department:</strong> {department}
          </p>
          <button
            onClick={() => {
              setShowForm(true);
              setIsEditing(false);
              setLessonPlan({
                id: "",
                email: "",
                department: department,
                subject: "",
                grade: "",
                objectives: "",
                materials: "",
                warmup: "",
                introduction: "",
                mainActivity: "",
                closure: "",
                differentiation: "",
                formativeAssessment: "",
                summativeAssessment: "",
                standards: "",
                status: "Draft",
                assessments: {},
                units: [],
                totalUnits: 0,
              });
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md flex items-center gap-2 mx-auto hover:shadow-lg transform hover:-translate-y-1"
            aria-label="Create new lesson plan"
          >
            <BookOpen className="w-5 h-5" />
            Create Lesson Plan
          </button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Lesson Plans</h2>
            <div className="flex items-center gap-4">
              <p className="text-gray-700 dark:text-gray-200">
                <strong>Department:</strong> {department}
              </p>
              <button
                onClick={() => {
                  setShowForm(true);
                  setIsEditing(false);
                  setLessonPlan({
                    id: "",
                    email: "",
                    department: department,
                    subject: "",
                    grade: "",
                    objectives: "",
                    materials: "",
                    warmup: "",
                    introduction: "",
                    mainActivity: "",
                    closure: "",
                    differentiation: "",
                    formativeAssessment: "",
                    summativeAssessment: "",
                    standards: "",
                    status: "Draft",
                    assessments: {},
                    units: [],
                    totalUnits: 0,
                  });
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md flex items-center gap-2 hover:shadow-lg transform hover:-translate-y-1"
                aria-label="Create new lesson plan"
              >
                <BookOpen className="w-5 h-5" />
                Create Lesson Plan
              </button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl shadow-xl bg-white dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Subject *</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Grade *</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lessonPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{plan.subject || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{plan.grade ? plan.grade.replace(/^grade(\d+)$/, "Grade $1") : "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <span className={`px-2 py-1 rounded-full text-xs ${plan.status === "Draft" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                        {plan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm flex space-x-3">
                      <div className="relative group">
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-all duration-200 transform hover:scale-110"
                          aria-label="View lesson plan details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          View Details
                        </span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-all duration-200 transform hover:scale-110"
                          aria-label="Edit lesson plan"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Edit Plan
                        </span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-all duration-200 transform hover:scale-110"
                          aria-label="Delete lesson plan"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Delete Plan
                        </span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => handleShare(plan)}
                          className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800 transition-all duration-200 transform hover:scale-110"
                          aria-label="Share lesson plan"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Share Plan
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <LessonPlanForm
          lessonPlan={lessonPlan}
          setLessonPlan={setLessonPlan}
          grades={grades}
          isEditing={isEditing}
          setShowForm={setShowForm}
          setIsEditing={setIsEditing}
          userEmail={userEmail}
          department={department}
          setLessonPlans={setLessonPlans}
        />
      )}

      {selectedPlan && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="p-8 rounded-3xl shadow-2xl w-full max-w-2xl bg-white dark:bg-gray-800 transition-all duration-300 transform hover:scale-105 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                aria-label="Back to lesson plans"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                aria-label="Close details"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
              Lesson Plan Details
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Created by:</strong> {selectedPlan.email || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Department:</strong> {selectedPlan.department || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Subject:</strong> {selectedPlan.subject || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Grade:</strong> {selectedPlan.grade ? selectedPlan.grade.replace(/^grade(\d+)$/, "Grade $1") : "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Standards:</strong> {selectedPlan.standards || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Objectives:</strong> {selectedPlan.objectives || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Materials:</strong> {selectedPlan.materials || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Warm-up:</strong> {selectedPlan.warmup || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Introduction:</strong> {selectedPlan.introduction || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Main Activity:</strong> {selectedPlan.mainActivity || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Closure:</strong> {selectedPlan.closure || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Differentiation:</strong> {selectedPlan.differentiation || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Formative Assessment:</strong> {selectedPlan.formativeAssessment || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Summative Assessment:</strong> {selectedPlan.summativeAssessment || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Units:</strong>
                <div className="ml-4">
                  {selectedPlan.units.length > 0 ? (
                    selectedPlan.units.map((unit, index) => (
                      <div key={index} className="text-sm">
                        Unit {index + 1}: {unit.title} - {unit.duration}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm">No units defined</div>
                  )}
                </div>
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Assessments:</strong>
                <div className="ml-4">
                  {Object.keys(selectedPlan.assessments).length > 0 ? (
                    Object.entries(selectedPlan.assessments).map(([type, percentage]) =>
                      percentage !== undefined && percentage > 0 ? (
                        <div key={type} className="text-sm">
                          {type}: {percentage}%
                        </div>
                      ) : null
                    )
                  ) : (
                    <div className="text-sm">No assessments assigned</div>
                  )}
                </div>
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Progress:</strong>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full"
                    style={{ width: `${selectedPlan.status === "Draft" ? 50 : 100}%` }}
                  ></div>
                </div>
                <div className="text-sm mt-1">{selectedPlan.status === "Draft" ? "In Progress" : "Completed"}</div>
              </div>
              <div className="flex space-x-4 mt-4">
                <button
                  onClick={() => handleExport(selectedPlan)}
                  className="flex-1 flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 text-white p-3 rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-300 shadow-md hover:shadow-lg justify-center"
                  aria-label="Export lesson plan"
                >
                  <Download className="w-5 h-5" />
                  Export
                </button>
                <button
                  onClick={() => handleShare(selectedPlan)}
                  className="flex-1 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg justify-center"
                  aria-label="Share lesson plan"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>
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
        .max-h-[90vh] {
          max-height: 90vh;
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
      `}</style>
    </section>
  );
}