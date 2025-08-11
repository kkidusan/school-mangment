// app/teacher/lesson-planning/page.tsx
"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext";
import { BookOpen, Save, Download, X, Eye, Edit, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { db } from "../../firebase";
import { doc, setDoc, getDocs, collection, query, where, deleteDoc } from "firebase/firestore";

interface LessonPlan {
  id: string;
  email: string;
  subject: string;
  grade: string;
  duration: string;
  topic: string;
  objectives: string;
  materials: string;
  warmup: string;
  introduction: string;
  mainActivity: string;
  assessment: string;
  closure: string;
  differentiation: string;
  formativeAssessment: string;
  summativeAssessment: string;
}

export default function LessonPlanning() {
  const context = useContext(ThemeContext);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan>({
    id: "",
    email: "",
    subject: "",
    grade: "",
    duration: "",
    topic: "",
    objectives: "",
    materials: "",
    warmup: "",
    introduction: "",
    mainActivity: "",
    assessment: "",
    closure: "",
    differentiation: "",
    formativeAssessment: "",
    summativeAssessment: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fields = [
    ["subject", "grade", "duration"],
    ["topic", "objectives"],
    ["materials", "warmup"],
    ["introduction", "mainActivity"],
    ["assessment", "closure"],
    ["differentiation", "formativeAssessment"],
    ["summativeAssessment"],
  ];

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
        if (data.role !== "teacher") {
          toast.error("Access denied: Teacher role required");
          router.push("/login");
          return;
        }

        setUserEmail(data.email || null);
        setIsAuthorized(true);
      } catch (error: any) {
        toast.error("Please log in as a teacher to access this page");
        router.push("/login");
      }
    };

    validateSession();
  }, [router]);

  // Fetch lesson plans from Firestore for the current user
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
          if (
            data.id &&
            data.email &&
            data.subject &&
            data.grade &&
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
            data.summativeAssessment
          ) {
            plans.push(data as LessonPlan);
          }
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setLessonPlan((prev) => ({ ...prev, [name]: value }));
  };

  const validateSmartObjectives = (objectives: string) => {
    if (!objectives) return false;
    const hasOutcome = objectives.toLowerCase().includes("will be able to");
    const hasMeasure = objectives.match(/(\d+%|correctly|successfully)/i);
    return hasOutcome && hasMeasure;
  };

  const handleNext = async () => {
    const currentFields = fields[currentStep];
    const allFilled = currentFields.every((field) => lessonPlan[field as keyof LessonPlan]);

    if (!allFilled) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (currentFields.includes("objectives") && !validateSmartObjectives(lessonPlan.objectives)) {
      toast.error(
        "Objectives must be SMART (e.g., include 'will be able to' and a measurable outcome like '90% accuracy')."
      );
      return;
    }

    if (currentStep < fields.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      try {
        const planId = lessonPlan.id || doc(collection(db, "lesson_plans")).id;
        const planData = { ...lessonPlan, id: planId, email: userEmail || "" };
        await setDoc(doc(db, "lesson_plans", planId), planData);
        setLessonPlans((prev) =>
          isEditing
            ? prev.map((p) => (p.id === planId ? planData : p))
            : [...prev, planData]
        );
        toast.success(isEditing ? "Lesson plan updated successfully!" : "Lesson plan saved successfully!");
        setLessonPlan({
          id: "",
          email: "",
          subject: "",
          grade: "",
          duration: "",
          topic: "",
          objectives: "",
          materials: "",
          warmup: "",
          introduction: "",
          mainActivity: "",
          assessment: "",
          closure: "",
          differentiation: "",
          formativeAssessment: "",
          summativeAssessment: "",
        });
        setShowForm(false);
        setIsEditing(false);
        setCurrentStep(0);
      } catch (error) {
        console.error("Error saving lesson plan:", error);
        toast.error(isEditing ? "Failed to update lesson plan." : "Failed to save lesson plan.");
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleEdit = (plan: LessonPlan) => {
    setLessonPlan(plan);
    setIsEditing(true);
    setShowForm(true);
    setCurrentStep(0);
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
    const content = `
Lesson Plan
Created by: ${plan.email}
Subject: ${plan.subject}
Grade: ${plan.grade}
Duration: ${plan.duration}
Topic: ${plan.topic}
Objectives: ${plan.objectives}
Materials: ${plan.materials}
Warm-up: ${plan.warmup}
Introduction: ${plan.introduction}
Main Activity: ${plan.mainActivity}
Assessment: ${plan.assessment}
Closure: ${plan.closure}
Differentiation: ${plan.differentiation}
Formative Assessment: ${plan.formativeAssessment}
Summative Assessment: ${plan.summativeAssessment}
    `.trim();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.topic || "lesson-plan"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lesson plan exported successfully!");
  };

  const handleCancelField = (field: string) => {
    setLessonPlan((prev) => ({ ...prev, [field]: "" }));
  };

  const renderInputField = (field: string) => {
    const isTextArea = [
      "objectives",
      "materials",
      "warmup",
      "introduction",
      "mainActivity",
      "assessment",
      "closure",
      "differentiation",
      "formativeAssessment",
      "summativeAssessment",
    ].includes(field);

    const placeholders: { [key: string]: string } = {
      subject: "e.g., Science",
      grade: "e.g., 5",
      duration: "e.g., 45 mins",
      topic: "e.g., States of Matter",
      objectives: "e.g., By the end of the lesson, students will be able to identify and explain the three states of matter with 90% accuracy.",
      materials: "e.g., Textbook, YouTube video, worksheet",
      warmup: "e.g., Quick quiz on previous lesson",
      introduction: "e.g., Show a short video on states of matter",
      mainActivity: "e.g., Hands-on sorting activity",
      assessment: "e.g., Exit ticket—list one example of each state",
      closure: "e.g., Recap key points; preview next lesson",
      differentiation: "e.g., Simplified notes for struggling learners; extension tasks for advanced",
      formativeAssessment: "e.g., Observations, Q&A, mini-quizzes",
      summativeAssessment: "e.g., Tests, projects, presentations",
    };

    return (
      <div key={field} className="animate-fade-in relative">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200 capitalize">
          {field} {["subject", "duration"].includes(field) ? "*" : ""}
        </label>
        <div className="flex items-center space-x-2">
          {isTextArea ? (
            <textarea
              name={field}
              value={lessonPlan[field as keyof LessonPlan]}
              onChange={handleInputChange}
              className={`w-full p-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 ${
                theme === "light" ? "bg-gray-50 text-gray-800 border-gray-300" : "bg-gray-800 text-gray-100 border-gray-600"
              }`}
              placeholder={placeholders[field]}
              rows={4}
              required={["subject", "duration"].includes(field)}
            />
          ) : (
            <input
              type="text"
              name={field}
              value={lessonPlan[field as keyof LessonPlan]}
              onChange={handleInputChange}
              className={`w-full p-3 rounded-lg border-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-colors duration-200 ${
                theme === "light" ? "bg-gray-50 text-gray-800 border-gray-300" : "bg-gray-800 text-gray-100 border-gray-600"
              }`}
              placeholder={placeholders[field]}
              required={["subject", "duration"].includes(field)}
            />
          )}
          <button
            onClick={() => handleCancelField(field)}
            className="p-2 text-gray-700 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400"
            aria-label={`Clear ${field} field`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  if (loading || !isAuthorized || !userEmail) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <section className="space-y-6 relative p-4">
      {lessonPlans.length === 0 ? (
        <div className="text-center py-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
            No Lesson Plans Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create a new lesson plan to start organizing your teaching.
          </p>
          <button
            onClick={() => {
              setShowForm(true);
              setIsEditing(false);
              setLessonPlan({
                id: "",
                email: "",
                subject: "",
                grade: "",
                duration: "",
                topic: "",
                objectives: "",
                materials: "",
                warmup: "",
                introduction: "",
                mainActivity: "",
                assessment: "",
                closure: "",
                differentiation: "",
                formativeAssessment: "",
                summativeAssessment: "",
              });
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center gap-2 mx-auto"
          >
            <BookOpen className="w-5 h-5" />
            Create Lesson Plan
          </button>
        </div>
      ) : (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
              Lesson Plans
            </h2>
            <button
              onClick={() => {
                setShowForm(true);
                setIsEditing(false);
                setLessonPlan({
                  id: "",
                  email: "",
                  subject: "",
                  grade: "",
                  duration: "",
                  topic: "",
                  objectives: "",
                  materials: "",
                  warmup: "",
                  introduction: "",
                  mainActivity: "",
                  assessment: "",
                  closure: "",
                  differentiation: "",
                  formativeAssessment: "",
                  summativeAssessment: "",
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Create Lesson Plan
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === "light" ? "bg-gray-50" : "bg-gray-900"}`}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subject *</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duration *</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className={`${theme === "light" ? "bg-white" : "bg-gray-800"} divide-y divide-gray-200 dark:divide-gray-700`}>
                {lessonPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{plan.subject || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{plan.grade || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{plan.duration || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm flex space-x-3">
                      <div className="relative group">
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200 transform hover:scale-110"
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
                          className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors duration-200 transform hover:scale-110"
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
                          className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-colors duration-200 transform hover:scale-110"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Delete Plan
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

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`p-8 rounded-2xl shadow-2xl max-w-md w-full ${theme === "light" ? "bg-white" : "bg-gray-900"} transition-all duration-300`}>
            <button
              onClick={() => {
                setShowForm(false);
                setIsEditing(false);
                setCurrentStep(0);
                setLessonPlan({
                  id: "",
                  email: "",
                  subject: "",
                  grade: "",
                  duration: "",
                  topic: "",
                  objectives: "",
                  materials: "",
                  warmup: "",
                  introduction: "",
                  mainActivity: "",
                  assessment: "",
                  closure: "",
                  differentiation: "",
                  formativeAssessment: "",
                  summativeAssessment: "",
                });
              }}
              className="absolute top-4 right-4 text-gray-700 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
              {isEditing ? "Edit Lesson Plan" : "Create Lesson Plan"} (Step {currentStep + 1} of {fields.length})
            </h2>
            <div className="mb-6">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / fields.length) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-6">
              {fields[currentStep].map((field) => renderInputField(field))}
            </div>
            <div className="flex justify-between mt-6">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 ml-auto"
              >
                {currentStep === fields.length - 1 ? (
                  <>
                    <Save className="w-5 h-5" />
                    {isEditing ? "Update Lesson Plan" : "Save Lesson Plan"}
                  </>
                ) : (
                  "Next"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-gray-200 bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`p-8 rounded-2xl shadow-2xl w-full max-w-lg ${theme === "light" ? "bg-white" : "bg-gray-900"} transition-all duration-300 transform hover:scale-105`}>
            <button
              onClick={() => setSelectedPlan(null)}
              className="absolute top-4 right-4 text-gray-700 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
              Lesson Plan Details
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Created by:</strong> {selectedPlan.email || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Subject:</strong> {selectedPlan.subject || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Grade:</strong> {selectedPlan.grade || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Duration:</strong> {selectedPlan.duration || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Topic:</strong> {selectedPlan.topic || "N/A"}
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
              <div className="border-b border-gray-200 dark:border-gelative">
                <strong className="text-blue-600 dark:text-blue-400">Introduction:</strong> {selectedPlan.introduction || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Main Activity:</strong> {selectedPlan.mainActivity || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-600 dark:text-blue-400">Assessment:</strong> {selectedPlan.assessment || "N/A"}
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
              <button
                onClick={() => handleExport(selectedPlan)}
                className="flex items-center gap-2 bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 mt-4 transition-colors duration-200"
              >
                <Download className="w-5 h-5" />
                Export Lesson Plan
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </section>
  );
}