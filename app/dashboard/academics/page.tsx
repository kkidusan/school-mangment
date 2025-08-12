"use client";

import { useState, useEffect, useContext } from "react";
import { db } from "../../firebase";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";

// Types
interface Class {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  schedule: string;
}

interface Curriculum {
  id: string;
  subject: string;
  grade: string;
  syllabus: string[];
  standardsAligned: boolean;
}

interface Assessment {
  id: string;
  title: string;
  date: string;
  type: "formative" | "summative";
  subject: string;
}

export default function AcademicsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [curriculum, setCurriculum] = useState<Curriculum[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("curriculum");
  const context = useContext(ThemeContext);
  const router = useRouter();

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Validate session and role
  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch("/api/validate", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          toast.error("Please log in as an admin to access this page");
          router.push("/login");
          return;
        }
        setIsAuthorized(true);
      } catch (error: any) {
        toast.error("Please log in as an admin to access this page");
        router.push("/login");
      }
    };

    validateSession();
  }, [router]);

  // Fetch academic data
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [classesSnapshot, curriculumSnapshot, assessmentsSnapshot] = await Promise.all([
          getDocs(collection(db, "classes")),
          getDocs(collection(db, "curriculum")),
          getDocs(collection(db, "assessments")),
        ]);

        setClasses(
          classesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Class))
        );
        setCurriculum(
          curriculumSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Curriculum))
        );
        setAssessments(
          assessmentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Assessment))
        );
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching academic data:", error);
        toast.error("Failed to load academic data. Please try again.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized]);

  // Handlers for adding new data
  const addClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newClass = {
      name: formData.get("className") as string,
      subject: formData.get("subject") as string,
      teacherId: formData.get("teacherId") as string,
      schedule: formData.get("schedule") as string,
    };

    try {
      await addDoc(collection(db, "classes"), newClass);
      toast.success("Class added successfully");
      setClasses([...classes, { id: "temp", ...newClass }]);
    } catch (error) {
      toast.error("Failed to add class");
    }
  };

  const addCurriculum = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCurriculum = {
      subject: formData.get("subject") as string,
      grade: formData.get("grade") as string,
      syllabus: (formData.get("syllabus") as string).split(",").map((item) => item.trim()),
      standardsAligned: formData.get("standardsAligned") === "on",
    };

    try {
      await addDoc(collection(db, "curriculum"), newCurriculum);
      toast.success("Curriculum added successfully");
      setCurriculum([...curriculum, { id: "temp", ...newCurriculum }]);
    } catch (error) {
      toast.error("Failed to add curriculum");
    }
  };

  const addAssessment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAssessment = {
      title: formData.get("title") as string,
      date: formData.get("date") as string,
      type: formData.get("type") as "formative" | "summative",
      subject: formData.get("subject") as string,
    };

    try {
      await addDoc(collection(db, "assessments"), newAssessment);
      toast.success("Assessment added successfully");
      setAssessments([...assessments, { id: "temp", ...newAssessment }]);
    } catch (error) {
      toast.error("Failed to add assessment");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto p-6"
    >
      <h1
        className={`text-3xl font-bold mb-6 ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}
      >
        Academics Management
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: "curriculum", label: "Curriculum Planning" },
              { id: "classes", label: "Class Management" },
              { id: "assessments", label: "Assessments" },
              { id: "tools", label: "Additional Tools" },
              { id: "extracurricular", label: "Co-Curricular" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? `border-b-2 border-blue-600 ${
                        theme === "light" ? "text-blue-600" : "text-blue-400"
                      }`
                    : `text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {/* 1. Curriculum Planning and Development */}
            {activeTab === "curriculum" && (
              <motion.div
                className={`p-6 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={`text-2xl font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-4`}
                >
                  Curriculum Planning
                </h2>
                <form onSubmit={addCurriculum} className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Grade
                    </label>
                    <input
                      type="text"
                      name="grade"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Syllabus (comma-separated)
                    </label>
                    <textarea
                      name="syllabus"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`flex items-center text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      <input type="checkbox" name="standardsAligned" className="mr-2" />
                      Aligned with Standards
                    </label>
                  </div>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded ${
                      theme === "light"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                    }`}
                  >
                    Add Curriculum
                  </button>
                </form>
                <div className="mt-4">
                  {curriculum.map((item) => (
                    <div key={item.id} className="py-2">
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        {item.subject} (Grade {item.grade}): {item.syllabus.join(", ")}{" "}
                        {item.standardsAligned ? "(Standards Aligned)" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2. Class Management (Effective Teaching Strategies) */}
            {activeTab === "classes" && (
              <motion.div
                className={`p-6 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={`text-2xl font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-4`}
                >
                  Class Management
                </h2>
                <form onSubmit={addClass} className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Class Name
                    </label>
                    <input
                      type="text"
                      name="className"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Teacher ID
                    </label>
                    <input
                      type="text"
                      name="teacherId"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Schedule
                    </label>
                    <input
                      type="text"
                      name="schedule"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded ${
                      theme === "light"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                    }`}
                  >
                    Add Class
                  </button>
                </form>
                <div className="mt-4">
                  {classes.map((cls) => (
                    <div key={cls.id} className="py-2">
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        {cls.name} ({cls.subject}) - Teacher: {cls.teacherId}, Schedule: {cls.schedule}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/admin/teachers"
                  className={`mt-4 inline-block text-sm ${
                    theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"
                  }`}
                  onClick={() => toast.info("Manage teacher training and assignments")}
                >
                  Manage Teachers
                </Link>
              </motion.div>
            )}

            {/* 3. Student Assessment and Evaluation */}
            {activeTab === "assessments" && (
              <motion.div
                className={`p-6 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={`text-2xl font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-4`}
                >
                  Assessments
                </h2>
                <form onSubmit={addAssessment} className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Type
                    </label>
                    <select
                      name="type"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    >
                      <option value="formative">Formative</option>
                      <option value="summative">Summative</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className={`block text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      className={`w-full p-2 rounded ${
                        theme === "light" ? "bg-white text-zinc-800" : "bg-gray-800 text-zinc-100"
                      }`}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded ${
                      theme === "light"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-400 text-gray-900 hover:bg-blue-500"
                    }`}
                  >
                    Add Assessment
                  </button>
                </form>
                <div className="mt-4">
                  {assessments.map((assessment) => (
                    <div key={assessment.id} className="py-2">
                      <p
                        className={`text-sm ${
                          theme === "light" ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        {assessment.title} ({assessment.type}) - {assessment.subject}, {assessment.date}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/admin/students"
                  className={`mt-4 inline-block text-sm ${
                    theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"
                  }`}
                  onClick={() => toast.info("View student performance and provide feedback")}
                >
                  Manage Student Assessments
                </Link>
              </motion.div>
            )}

            {/* 4. Additional Features (Time Management, Teacher Training, etc.) */}
            {activeTab === "tools" && (
              <motion.div
                className={`p-6 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={`text-2xl font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-4`}
                >
                  Additional Academic Tools
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Timetable Management
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Create and manage balanced timetables for all classes.
                    </p>
                    <Link
                      href="/admin/timetable"
                      className={`mt-2 inline-block text-sm ${
                        theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"
                      }`}
                      onClick={() => toast.info("Manage class timetables")}
                    >
                      Manage Timetable
                    </Link>
                  </div>
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Teacher Training
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Schedule workshops and peer observations.
                    </p>
                    <Link
                      href="/admin/training"
                      className={`mt-2 inline-block text-sm ${
                        theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"
                      }`}
                      onClick={() => toast.info("Schedule teacher training")}
                    >
                      Manage Training
                    </Link>
                  </div>
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Parent-Teacher Collaboration
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Organize PTMs and send updates to parents.
                    </p>
                    <Link
                      href="/admin/parent-communication"
                      className={`mt-2 inline-block text-sm ${
                        theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"
                      }`}
                      onClick={() => toast.info("Manage parent communication")}
                    >
                      Manage Communication
                    </Link>
                  </div>
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Data Analytics
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === "light" ? "text-zinc-600" : "text-zinc-400"
                      }`}
                    >
                      Track performance trends and personalize learning.
                    </p>
                    <Link
                      href="/admin/analytics"
                      className={`mt-2 inline-block text-sm ${
                        theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"
                      }`}
                      onClick={() => toast.info("View academic analytics")}
                    >
                      View Analytics
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. Co-Curricular & Extracurricular Balance */}
            {activeTab === "extracurricular" && (
              <motion.div
                className={`p-6 rounded-xl shadow-sm ${
                  theme === "light"
                    ? "bg-gradient-to-br from-blue-100 to-purple-100"
                    : "bg-gradient-to-br from-gray-700 to-gray-800"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2
                  className={`text-2xl font-semibold ${
                    theme === "light" ? "text-zinc-700" : "text-zinc-300"
                  } mb-4`}
                >
                  Co-Curricular & Extracurricular Activities
                </h2>
                <p
                  className={`text-sm ${
                    theme === "light" ? "text-zinc-600" : "text-zinc-400"
                  }`}
                >
                  Manage sports, arts, and clubs to ensure holistic development without clashing with academics.
                </p>
                <Link
                  href="/admin/extracurricular"
                  className={`mt-4 inline-block text-sm ${
                    theme === "light" ? "text-blue-600 hover:text-blue-700" : "text-blue-400 hover:text-blue-500"
                  }`}
                  onClick={() => toast.info("Manage extracurricular activities")}
                >
                  Manage Activities
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}