"use client";

import { useState, useContext, useCallback } from "react";
import { db, auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { Loader2, Mail, User, Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";

// Types
interface FormData {
  firstName: string;
  email: string;
  password: string;
}

interface Errors {
  [key: string]: string | undefined;
  general?: string;
}

interface PasswordValidation {
  minLength: boolean;
  uppercase: boolean;
  number: boolean;
  specialChar: boolean;
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    minLength: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });
  const [showPasswordErrors, setShowPasswordErrors] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
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
        await addDoc(collection(db, "owner"), {
          uid: userId,
          firstName: formData.firstName.trim(),
          email: formData.email.trim(),
          role: "owner",
        });

        setFormData({
          firstName: "",
          email: "",
          password: "",
        });
        setErrors({});
        setPasswordValidation({ minLength: false, uppercase: false, number: false, specialChar: false });
        setShowPasswordErrors(false);
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

  // Password validation
  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const getPasswordErrors = (validation: PasswordValidation): string[] => {
    const errors: string[] = [];
    if (!validation.minLength) errors.push("Password must be at least 8 characters long");
    if (!validation.uppercase) errors.push("Password must contain at least one uppercase letter");
    if (!validation.number) errors.push("Password must contain at least one number");
    if (!validation.specialChar) errors.push("Password must contain at least one special character");
    return errors;
  };

  const validateForm = () => {
    const newErrors: Errors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!formData.email) newErrors.email = "Email is required.";
    else if (!validateEmail(formData.email)) newErrors.email = "Invalid email format.";
    if (!formData.password) newErrors.password = "Password is required.";
    else {
      const pwdValidation = validatePassword(formData.password);
      setPasswordValidation(pwdValidation);
      const pwdErrors = getPasswordErrors(pwdValidation);
      if (pwdErrors.length > 0) {
        newErrors.password = "Password does not meet requirements.";
        setShowPasswordErrors(true);
      } else {
        setShowPasswordErrors(false);
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormData) => {
    const value = e.target.value;
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "", general: "" });
    if (field === "password") {
      setShowPasswordErrors(false);
      const validation = validatePassword(value);
      setPasswordValidation(validation);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      toast.error("Please correct the form errors and try again.");
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
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

  const inputFields = [
    { name: "firstName", type: "text", placeholder: "First Name", icon: User, label: "First Name", showValidation: false },
    { name: "email", type: "email", placeholder: "Email", icon: Mail, label: "Email", showValidation: true },
    { name: "password", type: "password", placeholder: "Password", icon: Lock, label: "Password", showToggle: true, showValidation: true },
  ];

  return (
    <main className={`min-h-screen flex items-center justify-center p-6 ${theme === "light" ? "bg-zinc-100" : "bg-zinc-900"}`}>
      <motion.div
        className={`w-full max-w-md rounded-2xl shadow-lg overflow-hidden ${
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
            Create Your Account
          </h2>

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
            {inputFields.map(({ name, type, placeholder, icon: Icon, label, showToggle, showValidation }) => (
              <motion.div
                key={name}
                className={`p-4 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + inputFields.indexOf(inputFields.find((f) => f.name === name)!) * 0.1, duration: 0.4 }}
              >
                <label
                  htmlFor={name}
                  className={`block text-sm font-medium ${theme === "light" ? "text-zinc-700" : "text-zinc-300"} mb-1`}
                >
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={showToggle ? (showPassword ? "text" : "password") : type}
                    id={name}
                    name={name}
                    placeholder={placeholder}
                    value={formData[name as keyof FormData]}
                    onChange={(e) => handleInputChange(e, name as keyof FormData)}
                    className={`w-full p-3 pl-10 ${showToggle ? "pr-10" : ""} border ${
                      theme === "light" ? "border-zinc-200" : "border-zinc-700"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === "light" ? "bg-white" : "bg-gray-800"
                    } ${
                      errors[name] || (name === "password" && showPasswordErrors)
                        ? "border-red-500"
                        : name === "email" && formData.email && validateEmail(formData.email)
                        ? "border-green-500"
                        : name === "password" &&
                          passwordValidation.minLength &&
                          passwordValidation.uppercase &&
                          passwordValidation.number &&
                          passwordValidation.specialChar
                        ? "border-green-500"
                        : ""
                    }`}
                    aria-describedby={errors[name] || (name === "password" && showPasswordErrors) ? `${name}-error` : undefined}
                    required
                  />
                  <Icon
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                      theme === "light" ? "text-zinc-500" : "text-zinc-400"
                    } w-5 h-5`}
                  />
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
                  {showToggle && (
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 right-3 flex items-center hover:bg-gray-200/50 rounded-full p-1 transition-colors ${
                        theme === "light" ? "text-zinc-500" : "text-zinc-400"
                      }`}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
                {errors[name] && name !== "password" && (
                  <p id={`${name}-error`} className="text-red-500 text-sm mt-1">
                    {errors[name]}
                  </p>
                )}
                {name === "password" && showPasswordErrors && (
                  <motion.div
                    className="mt-2 p-3 rounded-lg bg-red-100 text-red-700"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center">
                        {passwordValidation.minLength ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mr-2" />
                        )}
                        At least 8 characters
                      </li>
                      <li className="flex items-center">
                        {passwordValidation.uppercase ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mr-2" />
                        )}
                        At least one uppercase letter
                      </li>
                      <li className="flex items-center">
                        {passwordValidation.number ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mr-2" />
                        )}
                        At least one number
                      </li>
                      <li className="flex items-center">
                        {passwordValidation.specialChar ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mr-2" />
                        )}
                        At least one special character
                      </li>
                    </ul>
                  </motion.div>
                )}
              </motion.div>
            ))}

            <motion.button
              type="submit"
              disabled={isLoading || !validateEmail(formData.email)}
              className={`w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg shadow-md ${
                isLoading || !validateEmail(formData.email)
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:from-blue-700 hover:to-purple-700"
              } transition-all flex items-center justify-center`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </motion.button>
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