"use client";

import { useContext, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../../../context/ThemeContext";
import { db } from "../../../firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { Plus, X, FileText, CheckCircle, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

// Interface for Department
interface Department {
  id: string;
  name: string;
  hod: string;
  subDepartments: string[];
  responsibilities: string;
  createdAt: string;
}

export default function Department() {
  const context = useContext(ThemeContext);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentDepartmentId, setCurrentDepartmentId] = useState<string | null>(null);
  const [department, setDepartment] = useState<Department>({
    id: "",
    name: "",
    hod: "",
    subDepartments: [""],
    responsibilities: "",
    createdAt: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);
        const departmentsRef = collection(db, "departments");
        const snapshot = await getDocs(departmentsRef);
        const departmentList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            hod: data.hod || "",
            subDepartments: Array.isArray(data.subDepartments) ? data.subDepartments : [],
            responsibilities: data.responsibilities || "",
            createdAt: data.createdAt || "",
          } as Department;
        });
        setDepartments(departmentList);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching departments:", error);
        toast.error("Failed to load departments. Please try again.");
        setIsLoading(false);
      }
    };
    fetchDepartments();
  }, []);

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof Department
  ) => {
    setDepartment({ ...department, [field]: e.target.value });
  };

  // Handle sub-department input changes
  const handleSubDepartmentChange = (index: number, value: string) => {
    const updatedSubDepartments = [...department.subDepartments];
    updatedSubDepartments[index] = value;
    setDepartment({ ...department, subDepartments: updatedSubDepartments });
  };

  // Add new sub-department field
  const addSubDepartmentField = () => {
    setDepartment({ ...department, subDepartments: [...department.subDepartments, ""] });
  };

  // Remove sub-department field
  const removeSubDepartmentField = (index: number) => {
    const updatedSubDepartments = department.subDepartments.filter((_, i) => i !== index);
    setDepartment({ ...department, subDepartments: updatedSubDepartments });
  };

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle department creation or update
  const handleSaveDepartment = async () => {
    if (!department.name || !department.hod || !department.responsibilities) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!isValidEmail(department.hod)) {
      toast.error("Please enter a valid email address for Head of Department.");
      return;
    }

    setIsSubmitting(true);
    try {
      const departmentData = {
        ...department,
        subDepartments: department.subDepartments.filter((s) => s !== ""),
        createdAt: isEditing ? department.createdAt : new Date().toISOString(),
      };

      if (isEditing && currentDepartmentId) {
        // Update existing department
        const departmentRef = doc(db, "departments", currentDepartmentId);
        await updateDoc(departmentRef, departmentData);
        setDepartments(
          departments.map((dept) =>
            dept.id === currentDepartmentId ? { ...departmentData, id: currentDepartmentId } : dept
          )
        );
        toast.success(`Department "${department.name}" updated successfully!`);
      } else {
        // Create new department
        const departmentsRef = collection(db, "departments");
        const docRef = await addDoc(departmentsRef, departmentData);
        setDepartments([...departments, { ...departmentData, id: docRef.id }]);
        toast.success(`Department "${department.name}" created successfully!`);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving department:", error);
      toast.error(`Failed to ${isEditing ? "update" : "create"} department. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle department deletion
  const handleDeleteDepartment = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, "departments", id));
      setDepartments(departments.filter((dept) => dept.id !== id));
      toast.success(`Department "${name}" deleted successfully!`);
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("Failed to delete department. Please try again.");
    }
  };

  // Handle edit department
  const handleEditDepartment = (dept: Department) => {
    setDepartment({
      ...dept,
      subDepartments: Array.isArray(dept.subDepartments) && dept.subDepartments.length > 0 ? dept.subDepartments : [""],
    });
    setCurrentDepartmentId(dept.id);
    setIsEditing(true);
    setShowForm(true);
  };

  // Reset form state
  const resetForm = () => {
    setDepartment({
      id: "",
      name: "",
      hod: "",
      subDepartments: [""],
      responsibilities: "",
      createdAt: "",
    });
    setShowForm(false);
    setIsEditing(false);
    setCurrentDepartmentId(null);
  };

  return (
    <div className="min-h-screen relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h1
            className={`text-3xl font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}
          >
            Departments
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowForm(true)}
              className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center ${
                showForm ? "opacity-50 cursor-not-allowed" : ""
              }`}
              aria-label="Create new department"
              disabled={showForm}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Department
            </button>
            <Link href="/dashboard/teachers">
              <button
                className={`px-4 py-2 rounded-lg ${
                  theme === "light" ? "bg-white text-zinc-600" : "bg-gray-800 text-zinc-300"
                } hover:bg-opacity-80`}
                aria-label="Back to dashboard"
              >
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>

        {/* Department Table or No Departments Message */}
        {isLoading ? (
          <p
            className={`text-center text-lg ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
          >
            Loading departments...
          </p>
        ) : departments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-6 rounded-lg text-center ${
              theme === "light" ? "bg-white text-zinc-600" : "bg-gray-800 text-zinc-400"
            }`}
          >
            <FileText className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg">No departments found. Create a new department to get started.</p>
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className={`w-full border-collapse ${
                theme === "light" ? "bg-white" : "bg-gray-800"
              } rounded-lg shadow-sm`}
            >
              <thead>
                <tr
                  className={`${
                    theme === "light" ? "bg-zinc-100" : "bg-gray-700"
                  }`}
                >
                  <th className="p-3 text-left text-sm font-semibold">Name</th>
                  <th className="p-3 text-left text-sm font-semibold">HOD Email</th>
                  <th className="p-3 text-left text-sm font-semibold">Sub-Departments</th>
                  <th className="p-3 text-left text-sm font-semibold">Responsibilities</th>
                  <th className="p-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept, index) => (
                  <motion.tr
                    key={dept.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`border-t ${
                      theme === "light" ? "border-zinc-200" : "border-gray-700"
                    }`}
                  >
                    <td className="p-3">{dept.name}</td>
                    <td className="p-3">{dept.hod}</td>
                    <td className="p-3">{dept.subDepartments?.length > 0 ? dept.subDepartments.join(", ") : "None"}</td>
                    <td className="p-3">{dept.responsibilities}</td>
                    <td className="p-3 flex space-x-2">
                      <button
                        onClick={() => handleEditDepartment(dept)}
                        className="text-blue-500 hover:text-blue-600"
                        aria-label={`Edit department ${dept.name}`}
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        className="text-red-500 hover:text-red-600"
                        aria-label={`Delete department ${dept.name}`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Department Creation/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={`p-6 rounded-xl max-w-lg w-full ${
                theme === "light" ? "bg-white" : "bg-gray-900"
              } max-h-[80vh] overflow-y-auto`}
            >
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-semibold ${
                    theme === "light" ? "text-zinc-800" : "text-zinc-100"
                  }`}
                >
                  {isEditing ? "Edit Department" : "Create New Department"}
                </h2>
                <button
                  onClick={resetForm}
                  className={`p-2 rounded-full ${
                    theme === "light" ? "text-zinc-600 hover:bg-zinc-100" : "text-zinc-400 hover:bg-gray-700"
                  }`}
                  aria-label="Close form"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {/* Step 1: Department Name */}
                <div>
                  <label
                    className={`text-sm font-medium ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={department.name}
                    onChange={(e) => handleInputChange(e, "name")}
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    placeholder="e.g., Science, Mathematics"
                    aria-required="true"
                  />
                </div>

                {/* Step 2: Assign Head of Department */}
                <div>
                  <label
                    className={`text-sm font-medium ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Head of Department (HOD) Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={department.hod}
                    onChange={(e) => handleInputChange(e, "hod")}
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    placeholder="e.g., rajesh.kumar@school.com"
                    aria-required="true"
                  />
                </div>

                {/* Step 3: Sub-Departments (Optional) */}
                <div>
                  <label
                    className={`text-sm font-medium ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Sub-Departments (Optional)
                  </label>
                  {department.subDepartments.map((subDept, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={subDept}
                        onChange={(e) => handleSubDepartmentChange(index, e.target.value)}
                        className={`w-full p-2 rounded-lg ${
                          theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                        }`}
                        placeholder={`Sub-Department ${index + 1} (e.g., Physics)`}
                        aria-label={`Sub-Department ${index + 1}`}
                      />
                      {department.subDepartments.length > 1 && (
                        <button
                          onClick={() => removeSubDepartmentField(index)}
                          className="p-2 text-red-500 hover:text-red-600"
                          aria-label={`Remove sub-department ${index + 1}`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addSubDepartmentField}
                    className={`flex items-center text-sm ${
                      theme === "light" ? "text-blue-600" : "text-blue-400"
                    } hover:underline`}
                    aria-label="Add another sub-department"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Sub-Department
                  </button>
                </div>

                {/* Step 4: Define Department Policies */}
                <div>
                  <label
                    className={`text-sm font-medium ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
                  >
                    Key Responsibilities <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={department.responsibilities}
                    onChange={(e) => handleInputChange(e, "responsibilities")}
                    className={`w-full p-2 rounded-lg ${
                      theme === "light" ? "bg-zinc-100 text-zinc-800" : "bg-gray-700 text-zinc-100"
                    }`}
                    placeholder="e.g., Conduct weekly experiments, organize science fairs"
                    rows={4}
                    aria-required="true"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSaveDepartment}
                  disabled={isSubmitting}
                  className={`w-full p-2 rounded-lg ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  } transition-all flex items-center justify-center`}
                  aria-label={isEditing ? "Update department" : "Create department"}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Department" : "Create Department")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}