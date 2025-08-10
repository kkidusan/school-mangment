"use client";

import Link from "next/link";
import { useContext, useState } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "../../../context/ThemeContext";
import { db, auth } from "../../../firebase";
import { collection, addDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface FormData {
  firstName: string;
  contact: string;
  address: string;
  dob: string;
  gender: string;
  qualifications: string;
  certifications: string;
  specializations: string;
  joiningDate: string;
  contractType: string;
  salary: string;
  subjects: string;
  role: string;
  department: string;
}

interface Errors {
  [key: string]: string | undefined;
  general?: string;
}

export default function RegisterForm() {
  const context = useContext(ThemeContext);
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    contact: "",
    address: "",
    dob: "",
    gender: "",
    qualifications: "",
    certifications: "",
    specializations: "",
    joiningDate: "",
    contractType: "",
    salary: "",
    subjects: "",
    role: "",
    department: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as keyof FormData]: value }));
    setErrors((prev) => ({ ...prev, [name]: "", general: "" }));
  };

  const validateForm = () => {
    const newErrors: Errors = {};
    const requiredFields: (keyof FormData)[] = [
      "firstName",
      "contact",
      "address",
      "dob",
      "gender",
      "qualifications",
      "joiningDate",
      "contractType",
      "salary",
      "subjects",
      "role",
      "department",
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        newErrors[field] = `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} is required.`;
      }
    }

    if (formData.contact && !/^\d{10}$/.test(formData.contact)) {
      newErrors.contact = "Contact number must be 10 digits.";
    }

    if (formData.salary && isNaN(parseFloat(formData.salary))) {
      newErrors.salary = "Salary must be a valid number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      toast.error("Please correct the form errors and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const email = `${formData.firstName.toLowerCase().replace(/\s/g, "")}_${Date.now()}@school.com`;
      const password = "defaultPassword123";

      if (!auth) {
        throw new Error("Firebase Auth is not initialized.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      const userData = {
        userId,
        email,
        firstName: formData.firstName.trim(),
        contact: formData.contact,
        address: formData.address,
        dob: formData.dob,
        gender: formData.gender,
        qualifications: formData.qualifications,
        certifications: formData.certifications || "",
        specializations: formData.specializations || "",
        joiningDate: formData.joiningDate,
        contractType: formData.contractType,
        salary: parseFloat(formData.salary),
        subjects: formData.subjects.split(",").map((s) => s.trim()).filter((s) => s),
        role: formData.role.toLowerCase(),
        department: formData.department,
        createdAt: new Date().toISOString(),
      };

      if (formData.role.toLowerCase() === "admin") {
        await addDoc(collection(db, "admin"), userData);
      } else {
        await addDoc(collection(db, "teachers"), {
          ...userData,
          attendance: 0,
        });
      }

      toast.success(`${formData.role} registered successfully!`);
      setFormData({
        firstName: "",
        contact: "",
        address: "",
        dob: "",
        gender: "",
        qualifications: "",
        certifications: "",
        specializations: "",
        joiningDate: "",
        contractType: "",
        salary: "",
        subjects: "",
        role: "",
        department: "",
      });
      router.push(formData.role.toLowerCase() === "admin" ? "/admin" : "/dashboard/teachers");
    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMessage = "Registration failed. Please try again.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Try a different name.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Generated email is invalid.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      } else if (error.message.includes("Firebase")) {
        errorMessage = "Firebase service error. Check your configuration.";
      }
      setErrors({ general: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto p-6"
    >
      <h1
        className={`text-3xl font-bold mb-6 ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}
      >
        Register New User
      </h1>
      <form
        onSubmit={handleSubmit}
        className={`p-6 rounded-xl shadow-sm ${
          theme === "light"
            ? "bg-gradient-to-br from-blue-100 to-purple-100"
            : "bg-gradient-to-br from-gray-700 to-gray-800"
        }`}
      >
        {errors.general && (
          <motion.div
            className="mb-6 p-4 rounded-lg bg-red-100 text-red-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {errors.general}
          </motion.div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h2
              className={`text-xl font-semibold mb-4 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              Personal Information
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.firstName ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.firstName ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter full name"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.contact ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.contact ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter 10-digit contact number"
                />
                {errors.contact && (
                  <p className="text-red-500 text-sm mt-1">{errors.contact}</p>
                )}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.address ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.address ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter address"
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                )}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.dob ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.dob ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.gender ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.gender ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && (
                  <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2
              className={`text-xl font-semibold mb-4 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              Professional & Employment Details
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Qualifications
                </label>
                <input
                  type="text"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.qualifications ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.qualifications ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g., M.Ed, B.Sc"
                />
                {errors.qualifications && (
                  <p className="text-red-500 text-sm mt-1">{errors.qualifications}</p>
                )}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Certifications
                </label>
                <input
                  type="text"
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.certifications ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.certifications ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g., TESOL, CTET"
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Specializations
                </label>
                <input
                  type="text"
                  name="specializations"
                  value={formData.specializations}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.specializations ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.specializations ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g., Math Education, Special Needs"
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.joiningDate ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.joiningDate ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
                {errors.joiningDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.joiningDate}</p>
                )}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}
                >
                  Contract Type
                </label>
                <select
                  name="contractType"
                  value={formData.contractType}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.contractType ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.contractType ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Select contract type</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-Time">Part-Time</option>
                </select>
                {errors.contractType && (
                  <p className="text-red-500 text-sm mt-1">{errors.contractType}</p>
                )}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Salary (USD)
                </label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.salary ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.salary ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter salary"
                />
                {errors.salary && (
                  <p className="text-red-500 text-sm mt-1">{errors.salary}</p>
                )}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Department
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.department ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.department ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Select department</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="History">History</option>
                  <option value="Other">Other</option>
                </select>
                {errors.department && (
                  <p className="text-red-500 text-sm mt-1">{errors.department}</p>
                )}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <h2
              className={`text-xl font-semibold mb-4 ${
                theme === "light" ? "text-zinc-700" : "text-zinc-300"
              }`}
            >
              Subjects & Roles
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Subjects (comma-separated)
                </label>
                <input
                  type="text"
                  name="subjects"
                  value={formData.subjects}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.subjects ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.subjects ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g., Math, Science, English"
                />
                {errors.subjects && (
                  <p className="text-red-500 text-sm mt-1">{errors.subjects}</p>
                )}
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={`mt-1 p-2 w-full rounded-md border ${
                    theme === "light"
                      ? `border-zinc-300 bg-white ${errors.role ? "border-red-500" : ""}`
                      : `border-zinc-600 bg-gray-700 text-zinc-100 ${errors.role ? "border-red-500" : ""}`
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">Select role</option>
                  <option value="Class Teacher">Class Teacher</option>
                  <option value="Subject Teacher">Subject Teacher</option>
                  <option value="Coordinator">Coordinator</option>
                  <option value="Admin">Admin</option>
                </select>
                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
              </div>
            </div>
          </div>
        </div>
        <motion.button
          type="submit"
          disabled={isSubmitting}
          className={`mt-6 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all ${
            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Registering...
            </>
          ) : (
            "Register User"
          )}
        </motion.button>
      </form>
      <div className="mt-6 text-center">
        <p
          className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className={`underline ${theme === "light" ? "text-blue-600" : "text-blue-400"} hover:text-blue-500`}
          >
            Log In
          </Link>
        </p>
      </div>
    </motion.div>
  );
}