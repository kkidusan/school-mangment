
"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { db } from "../../firebase";
import { getDocs, collection, updateDoc, doc, query, where, QueryConstraint, onSnapshot } from "firebase/firestore";
import { ArrowLeft, X, Download, Check, RefreshCw, XCircle, Eye } from "lucide-react";

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
  warmup: string; // Added warmup property to fix TypeScript error
}

interface Department {
  id: string;
  name: string;
}

export default function ApproveLessonPlans() {
  const context = useContext(ThemeContext);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [commentInput, setCommentInput] = useState<{ [key: string]: string }>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);

  // Debug state initialization
  useEffect(() => {
    console.log("selectedPlans initialized:", selectedPlans);
  }, [selectedPlans]);

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
          toast.error(error || "Please log in as an admin to access this page");
          router.push("/login");
          return;
        }

        const data = await response.json();
        if (data.role !== "teacher" && data.role !== "admin") {
          toast.error("Access denied: Admin or Teacher role required");
          router.push("/login");
          return;
        }

        setUserEmail(data.email);
        setIsAuthorized(true);
      } catch (error: any) {
        console.error("Session validation error:", error);
        toast.error("Please log in as an admin to access this page");
        router.push("/login");
      }
    };

    validateSession();
  }, [router]);

  // Fetch departments where hod matches userEmail
  useEffect(() => {
    if (!isAuthorized || !userEmail) return;

    const fetchDepartments = async () => {
      try {
        const q = query(
          collection(db, "departments"),
          where("hod", "==", userEmail)
        );
        const querySnapshot = await getDocs(q);
        const deptList: Department[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.name) {
            deptList.push({
              id: doc.id,
              name: data.name,
            });
          }
        });
        setDepartments(deptList);
      } catch (error) {
        console.error("Error fetching departments:", error);
        toast.error("Failed to fetch departments.");
      }
    };

    fetchDepartments();
  }, [isAuthorized, userEmail]);

  // Fetch lesson plans with real-time listener
  useEffect(() => {
    if (!isAuthorized || departments.length === 0 || !userEmail) return;

    setLoading(true);
    const departmentNames = departments.map((dept) => dept.name);
    const queryConstraints: QueryConstraint[] = [];
    if (departmentNames.length > 0) {
      queryConstraints.push(where("department", "in", departmentNames.slice(0, 10)));
    }

    const q = query(collection(db, "lesson_plans"), ...queryConstraints);
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
            status: data.status || "Draft",
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
            warmup: data.warmup || "", // Ensure warmup is included
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
  }, [isAuthorized, departments, userEmail]);

  // Handle bulk actions
  const handleBulkAction = async (action: "approve" | "reject" | "revision") => {
    if (!selectedPlans || selectedPlans.length === 0) {
      toast.warn("Please select at least one lesson plan.");
      return;
    }

    try {
      const statusMap = {
        approve: "Approved",
        reject: "Rejected",
        revision: "Revision Requested",
      };
      const iconMap = {
        approve: "✅",
        reject: "❌",
        revision: "🔄",
      };

      const updates = selectedPlans.map(async (id) => {
        const planRef = doc(db, "lesson_plans", id);
        const currentPlan = lessonPlans.find((plan) => plan.id === id);
        const userComment = commentInput[id] || "";
        const existingComments = currentPlan?.comments || "";
        const newComment = userComment
          ? `${existingComments}\n${iconMap[action]} ${statusMap[action]}: ${userComment}`
          : `${existingComments}\n${iconMap[action]} ${statusMap[action]}`;
        const updateData: Partial<LessonPlan> = {
          status: statusMap[action],
          comments: newComment.trim(),
        };
        await updateDoc(planRef, updateData);
        return { id, ...updateData };
      });

      await Promise.all(updates);
      setLessonPlans((prev) =>
        prev.map((plan) =>
          selectedPlans.includes(plan.id)
            ? {
                ...plan,
                status: statusMap[action],
                comments: commentInput[plan.id]
                  ? `${plan.comments}\n${iconMap[action]} ${statusMap[action]}: ${commentInput[plan.id]}`
                  : `${plan.comments}\n${iconMap[action]} ${statusMap[action]}`,
              }
            : plan
        )
      );
      setSelectedPlans([]);
      setCommentInput({});
      toast.success(`Successfully ${action}ed selected lesson plans.`);
    } catch (error) {
      console.error(`Error ${action}ing lesson plans:`, error);
      toast.error(`Failed to ${action} lesson plans.`);
    }
  };

  // Handle single lesson plan action
  const handleSingleAction = async (id: string, action: "approve" | "reject" | "revision") => {
    try {
      const statusMap = {
        approve: "Approved",
        reject: "Rejected",
        revision: "Revision Requested",
      };
      const iconMap = {
        approve: "✅",
        reject: "❌",
        revision: "🔄",
      };

      const planRef = doc(db, "lesson_plans", id);
      const currentPlan = lessonPlans.find((plan) => plan.id === id);
      const userComment = commentInput[id] || "";
      const existingComments = currentPlan?.comments || "";
      const newComment = userComment
        ? `${existingComments}\n${iconMap[action]} ${statusMap[action]}: ${userComment}`
        : `${existingComments}\n${iconMap[action]} ${statusMap[action]}`;
      const updateData: Partial<LessonPlan> = {
        status: statusMap[action],
        comments: newComment.trim(),
      };

      await updateDoc(planRef, updateData);
      setLessonPlans((prev) =>
        prev.map((plan) =>
          plan.id === id
            ? {
                ...plan,
                status: statusMap[action],
                comments: newComment.trim(),
              }
            : plan
        )
      );
      setCommentInput((prev) => {
        const newComments = { ...prev };
        delete newComments[id];
        return newComments;
      });
      toast.success(`Lesson plan ${action}ed successfully.`);
    } catch (error) {
      console.error(`Error ${action}ing lesson plan:`, error);
      toast.error(`Failed to ${action} lesson plan.`);
    }
  };

  // Handle checkbox selection
  const toggleSelectPlan = (id: string) => {
    setSelectedPlans((prev) =>
      prev.includes(id)
        ? prev.filter((planId) => planId !== id)
        : [...prev, id]
    );
  };

  // Handle comment input change
  const handleCommentChange = (id: string, value: string) => {
    setCommentInput((prev) => ({ ...prev, [id]: value }));
  };

  // Handle export
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
Semester: ${plan.semester || "N/A"}
Standards: ${plan.standards || "N/A"}
Objectives: ${plan.objectives || "N/A"}
Materials: ${plan.materials || "N/A"}
Warm-up: ${plan.warmup || "N/A"}
Introduction: ${plan.introduction || "N/A"}
Main Activity: ${plan.mainActivity || "N/A"}
Closure: ${plan.closure || "N/A"}
Differentiation: ${plan.differentiation || "N/A"}
Formative Assessment: ${plan.formativeAssessment || "N/A"}
Summative Assessment: ${plan.summativeAssessment || "N/A"}
Status: ${plan.status}
Comments: ${plan.comments || "No comments"}
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
      {/* Departments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Your Departments
        </h2>
        {departments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            You are not assigned as HOD for any department.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 animate-slide-in"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {dept.name}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lesson Plans Section */}
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Lesson Plans for Approval
          </h2>
          <div className="space-x-4">
            <button
              onClick={() => handleBulkAction("approve")}
              className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedPlans || selectedPlans.length === 0}
              title="Approve Selected"
              aria-label="Approve selected lesson plans"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleBulkAction("revision")}
              className="p-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedPlans || selectedPlans.length === 0}
              title="Request Revision"
              aria-label="Request revision for selected lesson plans"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleBulkAction("reject")}
              className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedPlans || selectedPlans.length === 0}
              title="Reject Selected"
              aria-label="Reject selected lesson plans"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {lessonPlans.length === 0 ? (
          <div className="text-center py-16 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
              No Lesson Plans Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              No lesson plans are available for review.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl shadow-xl bg-white dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed" aria-label="Lesson Plans Table">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="w-[5%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        setSelectedPlans(
                          e.target.checked && lessonPlans ? lessonPlans.map((plan) => plan.id) : []
                        )
                      }
                      checked={selectedPlans && lessonPlans && selectedPlans.length === lessonPlans.length}
                      className="rounded text-blue-500"
                      aria-label="Select all lesson plans"
                    />
                  </th>
                  <th scope="col" className="w-[20%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Email</th>
                  <th scope="col" className="w-[10%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Grade</th>
                  <th scope="col" className="w-[15%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Subject</th>
                  <th scope="col" className="w-[10%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Status</th>
                  <th scope="col" className="w-[30%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Comments</th>
                  <th scope="col" className="w-[10%] px-2 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lessonPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    aria-label={`Lesson plan by ${plan.email}`}
                  >
                    <td className="w-[5%] px-2 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPlans ? selectedPlans.includes(plan.id) : false}
                        onChange={() => toggleSelectPlan(plan.id)}
                        className="rounded text-blue-500"
                        aria-label={`Select lesson plan by ${plan.email}`}
                      />
                    </td>
                    <td className="w-[20%] px-2 py-4 text-sm text-gray-900 dark:text-gray-100 truncate" title={plan.email}>
                      {plan.email}
                    </td>
                    <td className="w-[10%] px-2 py-4 text-sm text-gray-900 dark:text-gray-100 truncate" title={plan.grade}>
                      {plan.grade ? plan.grade.replace(/^grade(\d+)$/, "Grade $1") : "N/A"}
                    </td>
                    <td className="w-[15%] px-2 py-4 text-sm text-gray-900 dark:text-gray-100 truncate" title={plan.subject}>
                      {plan.subject || "N/A"}
                    </td>
                    <td className="w-[10%] px-2 py-4 text-sm text-gray-900 dark:text-gray-100 truncate">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          plan.status === "Approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : plan.status === "Rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            : plan.status === "Revision Requested"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                        }`}
                      >
                        {plan.status}
                      </span>
                    </td>
                    <td className="w-[30%] px-2 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <textarea
                        value={commentInput[plan.id] || ""}
                        onChange={(e) => handleCommentChange(plan.id, e.target.value)}
                        placeholder="Add comments..."
                        className="w-full p-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        rows={2}
                        aria-label={`Comments for lesson plan by ${plan.email}`}
                      />
                    </td>
                    <td className="w-[10%] px-2 py-4 text-sm flex space-x-1">
                      <div className="relative group">
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-all duration-200 transform hover:scale-110"
                          aria-label={`View details for lesson plan by ${plan.email}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          View Details
                        </span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => handleSingleAction(plan.id, "approve")}
                          className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800 transition-all duration-200 transform hover:scale-110"
                          aria-label={`Approve lesson plan by ${plan.email}`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Approve
                        </span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => handleSingleAction(plan.id, "revision")}
                          className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-all duration-200 transform hover:scale-110"
                          aria-label={`Request revision for lesson plan by ${plan.email}`}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Request Revision
                        </span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => handleSingleAction(plan.id, "reject")}
                          className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800 transition-all duration-200 transform hover:scale-110"
                          aria-label={`Reject lesson plan by ${plan.email}`}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-10 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          Reject
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

      {/* Details Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="p-8 rounded-3xl shadow-2xl w-full max-w-lg bg-white dark:bg-gray-800 transition-all duration-300 transform hover:scale-105 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedPlan(null)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200"
                aria-label="Go back"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setSelectedPlan(null)}
                className="text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
              Lesson Plan Details
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Created by:</strong> {selectedPlan.email || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Department:</strong> {selectedPlan.department || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Subject:</strong> {selectedPlan.subject || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Grade:</strong> {selectedPlan.grade ? selectedPlan.grade.replace(/^grade(\d+)$/, "Grade $1") : "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Semester:</strong> {selectedPlan.semester || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Standards:</strong> {selectedPlan.standards || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Objectives:</strong> {selectedPlan.objectives || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Materials:</strong> {selectedPlan.materials || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Warm-up:</strong> {selectedPlan.warmup || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Introduction:</strong> {selectedPlan.introduction || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Main Activity:</strong> {selectedPlan.mainActivity || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Closure:</strong> {selectedPlan.closure || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Differentiation:</strong> {selectedPlan.differentiation || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Formative Assessment:</strong> {selectedPlan.formativeAssessment || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Summative Assessment:</strong> {selectedPlan.summativeAssessment || "N/A"}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Units:</strong>
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
                <strong className="text-blue-500 dark:text-blue-400">Assessments:</strong>
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
                <strong className="text-blue-500 dark:text-blue-400">Status:</strong> {selectedPlan.status}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <strong className="text-blue-500 dark:text-blue-400">Comments:</strong> {selectedPlan.comments || "No comments"}
              </div>
              <button
                onClick={() => handleExport(selectedPlan)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-teal-500 text-white p-3 rounded-lg hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-md hover:shadow-lg w-full justify-center mt-4"
                aria-label="Export lesson plan"
              >
                <Download className="w-5 h-5" />
                Export Lesson Plan
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
        .max-h-[80vh] {
          max-height: 80vh;
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
