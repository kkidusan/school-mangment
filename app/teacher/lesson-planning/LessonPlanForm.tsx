"use client";

import { useState, useContext, useEffect } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import { Save, X, FileText } from "lucide-react";
import { toast } from "react-toastify";
import { db } from "../../firebase";
import { doc, setDoc, collection } from "firebase/firestore";

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

interface LessonPlanFormProps {
  lessonPlan: LessonPlan;
  setLessonPlan: React.Dispatch<React.SetStateAction<LessonPlan>>;
  grades: string[];
  isEditing: boolean;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  userEmail: string | null;
  department: string;
  setLessonPlans: React.Dispatch<React.SetStateAction<LessonPlan[]>>;
}

export default function LessonPlanForm({
  lessonPlan,
  setLessonPlan,
  grades,
  isEditing,
  setShowForm,
  setIsEditing,
  userEmail,
  department,
  setLessonPlans,
}: LessonPlanFormProps) {
  const context = useContext(ThemeContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    subject: true,
    grade: true,
    objectives: true,
    materials: true,
    warmup: true,
    introduction: true,
    mainActivity: true,
    closure: true,
    differentiation: true,
    formativeAssessment: true,
    summativeAssessment: true,
    standards: true,
    assessments: true,
    units: true,
  });

  const assessmentTypes = [
    "Final Exams",
    "Quizzes",
    "Lab Experiments",
    "Tests",
    "Mid Exam",
    "Projects & Presentations",
    "Assignments & Presentations",
    "Presentation",
  ];

  const allFields = [
    "subject",
    "grade",
    "objectives",
    "materials",
    "warmup",
    "introduction",
    "mainActivity",
    "closure",
    "differentiation",
    "formativeAssessment",
    "summativeAssessment",
    "standards",
    "assessments",
    "units",
  ];

  // Filter fields based on selectedFields, grouped into steps
  const fields = [
    ["subject", "grade"],
    ["objectives", "standards"],
    ["materials", "warmup"],
    ["introduction", "mainActivity"],
    ["closure", "differentiation"],
    ["formativeAssessment", "summativeAssessment"],
    ["assessments"],
    ["units"],
  ].map((stepFields) => stepFields.filter((field) => selectedFields[field])).filter((step) => step.length > 0);

  // Reset currentStep if it exceeds the new fields length
  useEffect(() => {
    if (currentStep >= fields.length) {
      setCurrentStep(Math.max(0, fields.length - 1));
    }
  }, [fields.length, currentStep]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setLessonPlan((prev) => ({ ...prev, [name]: value }));
  };

  const handleUnitChange = (index: number, field: keyof Unit, value: string) => {
    setLessonPlan((prev) => {
      const newUnits = [...prev.units];
      newUnits[index] = { ...newUnits[index], [field]: value };
      return { ...prev, units: newUnits };
    });
  };

  const handleTotalUnitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const total = parseInt(e.target.value) || 0;
    if (total < 1) return;
    setLessonPlan((prev) => {
      const newUnits = Array(total).fill(null).map((_, i) => ({
        title: prev.units[i]?.title || "",
        duration: prev.units[i]?.duration || "",
      }));
      return { ...prev, totalUnits: total, units: newUnits };
    });
  };

  const handleAssessmentChange = (type: string, percentage: string) => {
    const value = percentage ? parseInt(percentage) : 0;
    if (isNaN(value) || value < 0 || value > 100) return;

    setLessonPlan((prev) => ({
      ...prev,
      assessments: value > 0 ? { ...prev.assessments, [type]: value } : { ...prev.assessments, [type]: undefined },
    }));
  };

  const handleAssessmentToggle = (type: string) => {
    setLessonPlan((prev) => {
      const newAssessments = { ...prev.assessments };
      if (newAssessments[type]) {
        delete newAssessments[type];
      } else {
        newAssessments[type] = 0;
      }
      return { ...prev, assessments: newAssessments };
    });
  };

  const handleAssessmentCancel = (type: string) => {
    setLessonPlan((prev) => {
      const newAssessments = { ...prev.assessments };
      delete newAssessments[type];
      return { ...prev, assessments: newAssessments };
    });
  };

  const handleCancelField = (field: string) => {
    if (field === "assessments") {
      setLessonPlan((prev) => ({ ...prev, assessments: {} }));
    } else if (field === "units") {
      setLessonPlan((prev) => ({ ...prev, units: [], totalUnits: 0 }));
    } else {
      setLessonPlan((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateSmartObjectives = (objectives: string) => {
    if (!objectives) return false;
    const hasOutcome = objectives.toLowerCase().includes("will be able to");
    const hasMeasure = objectives.match(/(\d+%|correctly|successfully)/i);
    return hasOutcome && hasMeasure;
  };

  const validateAssessments = () => {
    const total = Object.values(lessonPlan.assessments)
      .filter((val): val is number => val !== undefined && val > 0)
      .reduce((sum: number, val: number) => sum + val, 0);
    return total === 100;
  };

  const validateUnits = () => {
    if (lessonPlan.totalUnits === 0) return false;
    return lessonPlan.units.every((unit) => unit.title && unit.duration);
  };

  const handleChangeFormat = () => {
    setShowFormatModal(true);
  };

  const handleFieldToggle = (field: string) => {
    if (["subject", "grade", "objectives", "introduction", "assessments", "units"].includes(field)) {
      toast.warn(`${field.charAt(0).toUpperCase() + field.slice(1)} is a required field and cannot be deselected.`);
      return;
    }
    setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleGenerateFields = () => {
    setCurrentStep(0);
    setShowFormatModal(false);
    toast.success("Form fields updated based on your selection!");
  };

  const handleNext = async () => {
    const currentFields = fields[currentStep] || [];
    if (!currentFields.length) {
      if (currentStep < fields.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
      return;
    }

    // Validate required fields in the current step
    if (currentFields.includes("objectives") && !validateSmartObjectives(lessonPlan.objectives)) {
      toast.error(
        "Objectives must be SMART (e.g., include 'will be able to' and a measurable outcome like '90% accuracy')."
      );
      return;
    }
    if (currentFields.includes("assessments")) {
      if (Object.keys(lessonPlan.assessments).length === 0 || !validateAssessments()) {
        toast.error("At least one assessment must be selected, and percentages must total exactly 100%.");
        return;
      }
    }
    if (currentFields.includes("units")) {
      if (!validateUnits()) {
        toast.error("At least one unit must be defined, and all unit titles and durations must be filled.");
        return;
      }
    }
    if (currentFields.includes("introduction") && !lessonPlan.introduction) {
      toast.error("Introduction is required and must be filled.");
      return;
    }
    if (currentFields.includes("grade") && !lessonPlan.grade) {
      toast.error("Grade is required and must be selected.");
      return;
    }

    // Validate other fields in the current step
    const allFilled = currentFields.every((field) =>
      ["objectives", "introduction", "assessments", "units", "grade"].includes(field)
        ? true // Already validated above
        : lessonPlan[field as keyof LessonPlan]
    );
    if (!allFilled) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (currentStep < fields.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      try {
        const planId = lessonPlan.id || doc(collection(db, "lesson_plans")).id;
        const filteredAssessments = Object.fromEntries(
          Object.entries(lessonPlan.assessments).filter(([_, value]) => value !== undefined && value > 0)
        );
        // Create a new LessonPlan object with all required fields
        const filteredPlanData: LessonPlan = {
          id: planId,
          email: userEmail || "",
          department: department,
          subject: lessonPlan.subject,
          grade: lessonPlan.grade,
          objectives: lessonPlan.objectives,
          materials: selectedFields.materials ? lessonPlan.materials : "",
          warmup: selectedFields.warmup ? lessonPlan.warmup : "",
          introduction: lessonPlan.introduction,
          mainActivity: selectedFields.mainActivity ? lessonPlan.mainActivity : "",
          closure: selectedFields.closure ? lessonPlan.closure : "",
          differentiation: selectedFields.differentiation ? lessonPlan.differentiation : "",
          formativeAssessment: selectedFields.formativeAssessment ? lessonPlan.formativeAssessment : "",
          summativeAssessment: selectedFields.summativeAssessment ? lessonPlan.summativeAssessment : "",
          standards: selectedFields.standards ? lessonPlan.standards : "",
          status: lessonPlan.status || "Draft",
          assessments: filteredAssessments,
          units: lessonPlan.units,
          totalUnits: lessonPlan.totalUnits,
        };
        await setDoc(doc(db, "lesson_plans", planId), filteredPlanData);
        setLessonPlans((prev) =>
          isEditing
            ? prev.map((p) => (p.id === planId ? filteredPlanData : p))
            : [...prev, filteredPlanData]
        );
        toast.success(isEditing ? "Lesson plan updated successfully!" : "Lesson plan saved successfully!");
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

  const renderInputField = (field: string) => {
    const isTextArea = [
      "objectives",
      "materials",
      "warmup",
      "introduction",
      "mainActivity",
      "closure",
      "differentiation",
      "formativeAssessment",
      "summativeAssessment",
      "standards",
    ].includes(field);

    const placeholders: { [key: string]: string } = {
      subject: "e.g., Biology",
      grade: "Select a grade",
      objectives: "e.g., Students will be able to identify cell structures with 90% accuracy.",
      materials: "e.g., Microscopes, slides, textbook",
      warmup: "e.g., Quick quiz on cell types",
      introduction: "e.g., Video on cell functions",
      mainActivity: "e.g., Lab experiment with microscopes",
      closure: "e.g., Discuss findings from lab",
      differentiation: "e.g., Simplified diagrams for visual learners",
      formativeAssessment: "e.g., Class discussion, quizzes",
      summativeAssessment: "e.g., Unit test, project",
      standards: "e.g., NGSS HS-LS1-2",
    };

    if (field === "assessments") {
      const totalPercentage = Object.values(lessonPlan.assessments)
        .filter((val): val is number => val !== undefined && val > 0)
        .reduce((sum: number, val: number) => sum + val, 0) || 0;
      return (
        <div key={field} className="animate-slide-in">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
            Assessments (Total must be 100%) *
          </label>
          <div className="space-y-3">
            {assessmentTypes.map((type) => (
              <div key={type} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={!!lessonPlan.assessments[type]}
                  onChange={() => handleAssessmentToggle(type)}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  aria-label={`Toggle ${type} assessment`}
                />
                <label className="flex-1 text-sm text-gray-700 dark:text-gray-200">{type}</label>
                {lessonPlan.assessments[type] !== undefined && (
                  <>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={lessonPlan.assessments[type] ?? ""}
                      onChange={(e) => handleAssessmentChange(type, e.target.value)}
                      className="w-20 p-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="%"
                      aria-label={`${type} percentage`}
                    />
                    <button
                      onClick={() => handleAssessmentCancel(type)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                      aria-label={`Cancel ${type} percentage`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            ))}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total: {totalPercentage}% {totalPercentage !== 100 && totalPercentage > 0 && <span className="text-red-500">(Must be 100%)</span>}
            </div>
          </div>
        </div>
      );
    }

    if (field === "units") {
      return (
        <div key={field} className="animate-slide-in">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
            Unit Planning *
          </label>
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="number"
              min="1"
              name="totalUnits"
              value={lessonPlan.totalUnits}
              onChange={handleTotalUnitsChange}
              className="w-24 p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Total units"
              aria-label="Total units"
              required
            />
            <label className="text-sm text-gray-700 dark:text-gray-200">Total Units</label>
            <button
              onClick={() => handleCancelField(field)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
              aria-label="Clear units field"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            {Array.from({ length: lessonPlan.totalUnits }, (_, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={lessonPlan.units[index]?.title || ""}
                  onChange={(e) => handleUnitChange(index, "title", e.target.value)}
                  className="flex-1 p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder={`e.g., Unit ${index + 1}: Cell Biology`}
                  aria-label={`Unit ${index + 1} title`}
                  required
                />
                <input
                  type="text"
                  value={lessonPlan.units[index]?.duration || ""}
                  onChange={(e) => handleUnitChange(index, "duration", e.target.value)}
                  className="w-32 p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., 4 Weeks"
                  aria-label={`Unit ${index + 1} duration`}
                  required
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (field === "grade") {
      return (
        <div key={field} className="animate-slide-in relative">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200 capitalize">
            Grade *
          </label>
          <div className="flex items-center space-x-2">
            <select
              name={field}
              value={lessonPlan.grade}
              onChange={handleInputChange}
              className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
              aria-label="Select grade"
            >
              <option value="" disabled>
                {placeholders[field]}
              </option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade.replace(/^grade(\d+)$/, "Grade $1")}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleCancelField(field)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
              aria-label={`Clear ${field} field`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={field} className="animate-slide-in relative">
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200 capitalize">
          {field} {["subject", "objectives", "introduction"].includes(field) ? "*" : ""}
        </label>
        <div className="flex items-center space-x-2">
          {isTextArea ? (
            <textarea
              name={field}
              value={lessonPlan[field as keyof LessonPlan] as string}
              onChange={handleInputChange}
              className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder={placeholders[field]}
              rows={4}
              required={["subject", "objectives", "introduction"].includes(field)}
              aria-label={field}
            />
          ) : (
            <input
              type="text"
              name={field}
              value={lessonPlan[field as keyof LessonPlan] as string}
              onChange={handleInputChange}
              className="w-full p-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder={placeholders[field]}
              required={["subject", "objectives", "introduction"].includes(field)}
              aria-label={field}
            />
          )}
          <button
            onClick={() => handleCancelField(field)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
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

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-4xl p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transition-all duration-300 flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text flex-1">
            {isEditing ? "Edit Lesson Plan" : "Create Lesson Plan"} (Step {currentStep + 1} of {fields.length})
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleChangeFormat}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200 flex items-center gap-2"
              aria-label="Change form format"
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium">Customize Fields</span>
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setIsEditing(false);
                setCurrentStep(0);
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
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
              aria-label="Close form"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / fields.length) * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-6 px-4">
          {fields[currentStep]?.length > 0 ? (
            fields[currentStep].map((field) => renderInputField(field))
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-center">
              No fields selected for this step. Please customize fields.
            </div>
          )}
        </div>
        <div className="flex justify-between mt-6 px-4">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
              aria-label="Previous step"
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 ml-auto shadow-md hover:shadow-lg"
            aria-label={currentStep === fields.length - 1 ? (isEditing ? "Update lesson plan" : "Save lesson plan") : "Next step"}
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

      {/* Format Selection Modal */}
      {showFormatModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto transform transition-all duration-300 animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                Customize Form Fields
              </h3>
              <button
                onClick={() => setShowFormatModal(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                aria-label="Close format selection"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              {allFields.map((field) => (
                <div key={field} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedFields[field]}
                    onChange={() => handleFieldToggle(field)}
                    disabled={["subject", "grade", "objectives", "introduction", "assessments", "units"].includes(field)}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                    aria-label={`Toggle ${field} field`}
                  />
                  <label className="flex-1 text-sm text-gray-700 dark:text-gray-200 capitalize">
                    {field} {["subject", "grade", "objectives", "introduction", "assessments", "units"].includes(field) ? "(Required)" : ""}
                  </label>
                </div>
              ))}
            </div>
            <button
              onClick={handleGenerateFields}
              className="mt-6 w-full px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              aria-label="Generate form with selected fields"
            >
              <Save className="w-5 h-5" />
              Generate Form
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
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
      `}</style>
    </div>
  );
}