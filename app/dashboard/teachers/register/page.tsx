"use client";

import { useState, useContext, useCallback } from "react";
import { db, auth } from "../../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { Loader2, Mail, User, Calendar, MapPin, Phone, School, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ThemeContext } from "../../../context/ThemeContext";
import { toast } from "react-toastify";

// Types
interface FormData {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  cnicPassport: string;
  residentialAddress: string;
  phoneNumber: string;
  email: string;
  emergencyContact: string;
  highestDegree: string;
  universityName: string;
  yearOfPassing: string;
  previousSchool: string;
  subjectsGrades: string;
}

interface Errors {
  [key: string]: string | undefined;
  general?: string;
}

interface InputField {
  name: keyof FormData;
  type: string;
  placeholder: string;
  icon?: any;
  label: string;
  showValidation: boolean;
  conditional?: boolean;
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    dateOfBirth: "",
    gender: "",
    nationality: "Ethiopian",
    cnicPassport: "",
    residentialAddress: "",
    phoneNumber: "",
    email: "",
    emergencyContact: "",
    highestDegree: "",
    universityName: "",
    yearOfPassing: "",
    previousSchool: "",
    subjectsGrades: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Memoize completeRegistration to prevent unnecessary re-renders
  const completeRegistration = useCallback(
    async (userId: string) => {
      try {
        await addDoc(collection(db, "teachers"), {
          uid: userId,
          fullName: formData.fullName.trim(),
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          nationality: formData.nationality,
          cnicPassport: formData.cnicPassport.trim(),
          residentialAddress: formData.residentialAddress.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          email: formData.email.trim(),
          emergencyContact: formData.emergencyContact.trim(),
          highestDegree: formData.highestDegree,
          universityName: formData.universityName.trim(),
          yearOfPassing: formData.yearOfPassing.trim(),
          previousSchool: formData.previousSchool.trim(),
          subjectsGrades: formData.subjectsGrades,
          role: "teacher",
        });

        setFormData({
          fullName: "",
          dateOfBirth: "",
          gender: "",
          nationality: "Ethiopian",
          cnicPassport: "",
          residentialAddress: "",
          phoneNumber: "",
          email: "",
          emergencyContact: "",
          highestDegree: "",
          universityName: "",
          yearOfPassing: "",
          previousSchool: "",
          subjectsGrades: "",
        });
        setErrors({});
        setCurrentStep(1);
        toast.success("Registration successful! Redirecting to login...");
        router.push("/login");
      } catch (error: any) {
        console.error("Firestore error:", error);
        setErrors({ general: "Failed to save registration data. Please try again or contact support." });
        toast.error("Failed to save registration data. Please try again.");
        setIsLoading(false);
      }
    },
    [formData, router]
  );

  // Email validation
  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    const regex = /^\+?\d{10,15}$/;
    return regex.test(phone);
  };

  // CNIC/Passport validation
  const validateCnicPassport = (cnic: string): boolean => {
    const regex = /^[A-Za-z0-9-]{5,20}$/;
    return regex.test(cnic);
  };

  // Year of passing validation
  const validateYearOfPassing = (year: string): boolean => {
    const regex = /^\d{4}$/;
    const currentYear = new Date().getFullYear();
    return regex.test(year) && parseInt(year) <= currentYear && parseInt(year) >= 1900;
  };

  const validateStep = (step: number) => {
    const newErrors: Errors = {};
    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full name is required.";
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required.";
      if (!formData.gender) newErrors.gender = "Gender is required.";
      if (!formData.nationality) newErrors.nationality = "Nationality is required.";
      if (formData.nationality === "Other" && !formData.cnicPassport)
        newErrors.cnicPassport = "CNIC/Passport number is required.";
      else if (formData.nationality === "Other" && !validateCnicPassport(formData.cnicPassport))
        newErrors.cnicPassport = "Invalid CNIC/Passport format.";
    } else if (step === 2) {
      if (!formData.residentialAddress.trim()) newErrors.residentialAddress = "Residential address is required.";
      if (!formData.phoneNumber) newErrors.phoneNumber = "Phone number is required.";
      else if (!validatePhoneNumber(formData.phoneNumber)) newErrors.phoneNumber = "Invalid phone number format.";
      if (!formData.email) newErrors.email = "Email is required.";
      else if (!validateEmail(formData.email)) newErrors.email = "Invalid email format.";
      if (!formData.emergencyContact.trim()) newErrors.emergencyContact = "Emergency contact is required.";
    } else if (step === 3) {
      if (!formData.highestDegree) newErrors.highestDegree = "Highest degree is required.";
      if (!formData.universityName.trim()) newErrors.universityName = "University name is required.";
      if (!formData.yearOfPassing) newErrors.yearOfPassing = "Year of passing is required.";
      else if (!validateYearOfPassing(formData.yearOfPassing)) newErrors.yearOfPassing = "Invalid year (1900-current year).";
      if (!formData.previousSchool.trim()) newErrors.previousSchool = "Previous school name is required.";
      if (!formData.subjectsGrades) newErrors.subjectsGrades = "Subjects/grades are required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: keyof FormData) => {
    const value = e.target.value;
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "", general: "" });
  };

  const handleNationalityChange = (nationality: string) => {
    setFormData({ ...formData, nationality, cnicPassport: nationality === "Ethiopian" ? "" : formData.cnicPassport });
    setErrors({ ...errors, nationality: "", cnicPassport: "", general: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateStep(currentStep)) {
      toast.error("Please correct the form errors and try again.");
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), "teacher@1234");
      await completeRegistration(userCredential.user.uid);
    } catch (error: any) {
      let errorMessage = "Registration failed. Please try again.";
      if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format.";
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please try a different email or log in.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later.";
      }
      setErrors({ general: errorMessage });
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const inputFields: InputField[][] = [
    // Step 1: Personal Information
    [
      { name: "fullName", type: "text", placeholder: "Full Name", icon: User, label: "Full Name", showValidation: false },
      { name: "dateOfBirth", type: "date", placeholder: "Date of Birth", icon: Calendar, label: "Date of Birth", showValidation: false },
      { name: "gender", type: "select", placeholder: "Select Gender", label: "Gender", showValidation: false },
      { name: "nationality", type: "checkbox", placeholder: "Nationality", label: "Nationality", showValidation: false },
      { name: "cnicPassport", type: "text", placeholder: "CNIC/Passport Number", icon: User, label: "CNIC/Passport Number", showValidation: true, conditional: formData.nationality === "Other" },
    ],
    // Step 2: Contact Details
    [
      { name: "residentialAddress", type: "text", placeholder: "Residential Address", icon: MapPin, label: "Residential Address", showValidation: false },
      { name: "phoneNumber", type: "tel", placeholder: "Phone Number", icon: Phone, label: "Phone Number", showValidation: true },
      { name: "email", type: "email", placeholder: "Email", icon: Mail, label: "Email", showValidation: true },
      { name: "emergencyContact", type: "text", placeholder: "Name, Relation, Phone", icon: Phone, label: "Emergency Contact", showValidation: false },
    ],
    // Step 3: Educational & Professional Details
    [
      { name: "highestDegree", type: "select", placeholder: "Select Degree", label: "Highest Degree", showValidation: false },
      { name: "universityName", type: "text", placeholder: "University Name", icon: School, label: "University Name", showValidation: false },
      { name: "yearOfPassing", type: "text", placeholder: "Year of Passing", icon: Calendar, label: "Year of Passing", showValidation: true },
      { name: "previousSchool", type: "text", placeholder: "Previous School Name", icon: School, label: "Previous School", showValidation: false },
      { name: "subjectsGrades", type: "select", placeholder: "Select Subjects/Grades", label: "Subjects/Grades", showValidation: false },
    ],
  ];

  const progressPercentage = Math.round((currentStep / 3) * 100);

  return (
    <main className={`min-h-screen flex items-center justify-center p-6 ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
      <motion.div
        className={`w-full max-w-lg rounded-2xl shadow-lg overflow-hidden ${
          theme === "light" ? "bg-gradient-to-br from-blue-50 to-purple-50" : "bg-gradient-to-br from-gray-800 to-gray-900"
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="p-8">
          <h2
            className={`text-3xl font-bold text-center ${theme === "light" ? "text-zinc-800" : "text-zinc-100"} mb-6`}
          >
            Register as Teacher - Step {currentStep} of 3
          </h2>

          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <motion.div
                className="bg-blue-600 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className={`text-sm text-center mt-2 ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
              {progressPercentage}% Complete
            </p>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-4">
            {inputFields[currentStep - 1].map(({ name, type, placeholder, icon: Icon, label, showValidation, conditional }) => (
              conditional !== false && (
                <motion.div
                  key={name}
                  className={`p-4 rounded-xl shadow-sm ${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-100 to-purple-100"
                      : "bg-gradient-to-br from-gray-700 to-gray-800"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + inputFields[currentStep - 1].indexOf(inputFields[currentStep - 1].find((f) => f.name === name)!) * 0.1, duration: 0.4 }}
                >
                  <label
                    htmlFor={name}
                    className={`block text-sm font-medium ${theme === "light" ? "text-zinc-700" : "text-zinc-300"} mb-1`}
                  >
                    {label}
                  </label>
                  <div className="relative">
                    {type === "checkbox" && name === "nationality" ? (
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.nationality === "Ethiopian"}
                            onChange={() => handleNationalityChange("Ethiopian")}
                            className="mr-2"
                          />
                          Ethiopian
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.nationality === "Other"}
                            onChange={() => handleNationalityChange("Other")}
                            className="mr-2"
                          />
                          Other
                        </label>
                      </div>
                    ) : type === "select" ? (
                      <select
                        id={name}
                        name={name}
                        value={formData[name]}
                        onChange={(e) => handleInputChange(e, name)}
                        className={`w-full p-3 border ${
                          theme === "light" ? "border-zinc-200" : "border-zinc-700"
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          theme === "light" ? "bg-white" : "bg-gray-800"
                        } ${errors[name] ? "border-red-500" : formData[name] ? "border-green-500" : ""}`}
                        aria-describedby={errors[name] ? `${name}-error` : undefined}
                        required
                      >
                        {name === "gender" ? (
                          <>
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </>
                        ) : name === "highestDegree" ? (
                          <>
                            <option value="">Select Degree</option>
                            <option value="B.Ed">B.Ed</option>
                            <option value="M.Ed">M.Ed</option>
                            <option value="PhD">PhD</option>
                            <option value="MA">MA</option>
                            <option value="BSc">BSc</option>
                          </>
                        ) : name === "subjectsGrades" ? (
                          <>
                            <option value="">Select Subjects/Grades</option>
                            <option value="Math_1-5">Math (Grades 1-5)</option>
                            <option value="Science_6-8">Science (Grades 6-8)</option>
                            <option value="English_9-12">English (Grades 9-12)</option>
                            <option value="History_6-8">History (Grades 6-8)</option>
                            <option value="All_Primary">All Subjects (Primary)</option>
                          </>
                        ) : null}
                      </select>
                    ) : (
                      <input
                        type={type}
                        id={name}
                        name={name}
                        placeholder={placeholder}
                        value={formData[name]}
                        onChange={(e) => handleInputChange(e, name)}
                        className={`w-full p-3 pl-10 border ${
                          theme === "light" ? "border-zinc-200" : "border-zinc-700"
                        } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          theme === "light" ? "bg-white" : "bg-gray-800"
                        } ${
                          errors[name]
                            ? "border-red-500"
                            : name === "email" && formData.email && validateEmail(formData.email)
                            ? "border-green-500"
                            : name === "phoneNumber" && formData.phoneNumber && validatePhoneNumber(formData.phoneNumber)
                            ? "border-green-500"
                            : name === "cnicPassport" && formData.cnicPassport && validateCnicPassport(formData.cnicPassport)
                            ? "border-green-500"
                            : name === "yearOfPassing" && formData.yearOfPassing && validateYearOfPassing(formData.yearOfPassing)
                            ? "border-green-500"
                            : ""
                        }`}
                        aria-describedby={errors[name] ? `${name}-error` : undefined}
                        required
                      />
                    )}
                    {type !== "select" && type !== "checkbox" && Icon && (
                      <Icon
                        className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                          theme === "light" ? "text-zinc-500" : "text-zinc-400"
                        } w-5 h-5`}
                      />
                    )}
                    {showValidation && name === "email" && formData.email && (
                      <motion.div
                        className="absolute inset-y-0 right-3 flex items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {validateEmail(formData.email) ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </motion.div>
                    )}
                    {showValidation && name === "phoneNumber" && formData.phoneNumber && (
                      <motion.div
                        className="absolute inset-y-0 right-3 flex items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {validatePhoneNumber(formData.phoneNumber) ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </motion.div>
                    )}
                    {showValidation && name === "cnicPassport" && formData.cnicPassport && (
                      <motion.div
                        className="absolute inset-y-0 right-3 flex items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {validateCnicPassport(formData.cnicPassport) ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </motion.div>
                    )}
                    {showValidation && name === "yearOfPassing" && formData.yearOfPassing && (
                      <motion.div
                        className="absolute inset-y-0 right-3 flex items-center"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        {validateYearOfPassing(formData.yearOfPassing) ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </motion.div>
                    )}
                  </div>
                  {errors[name] && (
                    <p id={`${name}-error`} className="text-red-500 text-sm mt-1">
                      {errors[name]}
                    </p>
                  )}
                </motion.div>
              )
            ))}

            <div className="flex justify-between mt-6">
              {currentStep > 1 && (
                <motion.button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className={`px-4 py-3 bg-gray-400 text-white font-medium rounded-lg shadow-md ${
                    theme === "light" ? "hover:bg-gray-500" : "hover:bg-gray-600"
                  } transition-all`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Previous
                </motion.button>
              )}
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-md ${
                  isLoading ? "opacity-50 cursor-not-allowed" : "hover:from-blue-700 hover:to-purple-700"
                } transition-all flex items-center justify-center ${currentStep === 1 ? "ml-auto" : ""}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Registering...
                  </>
                ) : currentStep < 3 ? (
                  "Next"
                ) : (
                  "Register"
                )}
              </motion.button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
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
    </main>
  );
}