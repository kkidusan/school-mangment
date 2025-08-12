// File: app/dashboard/digital-library/page.tsx
"use client";

import { useState, useEffect, useContext } from "react";
import { db } from "../../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";

// Types
interface DigitalResource {
  id: string;
  title: string;
  author: string;
  gradeLevel: string; // e.g., "1", "2", ..., "8"
  url: string; // Link to e-book or resource
  description: string;
  type: "ebook" | "video" | "article" | "subscription";
}

export default function DigitalLibraryPage() {
  const [resources, setResources] = useState<DigitalResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [activeGrade, setActiveGrade] = useState<string>("1");
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

  // Fetch digital resources
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const resourcesSnapshot = await getDocs(collection(db, "digitalResources"));
        setResources(resourcesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DigitalResource)));
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching digital resources:", error);
        toast.error("Failed to load digital resources. Please try again.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthorized]);

  // Handler for adding new digital resource
  const addResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newResource = {
      title: formData.get("title") as string,
      author: formData.get("author") as string,
      gradeLevel: formData.get("gradeLevel") as string,
      url: formData.get("url") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as "ebook" | "video" | "article" | "subscription",
    };

    try {
      const docRef = await addDoc(collection(db, "digitalResources"), newResource);
      toast.success("Digital resource added successfully");
      setResources([...resources, { id: docRef.id, ...newResource }]);
    } catch (error) {
      toast.error("Failed to add digital resource");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const grades = ["1", "2", "3", "4", "5", "6", "7", "8"];

  const filteredResources = resources.filter((resource) => resource.gradeLevel === activeGrade);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto p-6"
    >
      <h1
        className={theme === "light" ? "text-3xl font-bold mb-6 text-zinc-800" : "text-3xl font-bold mb-6 text-zinc-100"}
      >
        Digital Library (Grades 1-8)
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grade Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {grades.map((grade) => (
              <button
                key={grade}
                onClick={() => setActiveGrade(grade)}
                className={
                  activeGrade === grade
                    ? `px-4 py-2 text-sm font-medium border-b-2 border-blue-600 ${
                        theme === "light" ? "text-blue-600" : "text-blue-400"
                      }`
                    : `px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200`
                }
              >
                Grade {grade}
              </button>
            ))}
          </div>

          {/* Add Resource Form */}
          <motion.div
            className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2
              className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
            >
              Add Digital Resource for Grade {activeGrade}
            </h2>
            <form onSubmit={addResource} className="space-y-4">
              <div>
                <label
                  className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                >
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                  required
                />
              </div>
              <div>
                <label
                  className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                >
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                  required
                />
              </div>
              <div>
                <label
                  className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                >
                  Grade Level
                </label>
                <select
                  name="gradeLevel"
                  className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                  required
                  defaultValue={activeGrade}
                >
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                >
                  URL (Link to Resource)
                </label>
                <input
                  type="url"
                  name="url"
                  className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                  required
                />
              </div>
              <div>
                <label
                  className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                >
                  Description
                </label>
                <textarea
                  name="description"
                  className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                  required
                />
              </div>
              <div>
                <label
                  className={theme === "light" ? "block text-sm text-zinc-600" : "block text-sm text-zinc-400"}
                >
                  Type
                </label>
                <select
                  name="type"
                  className={theme === "light" ? "w-full p-2 rounded bg-white text-zinc-800" : "w-full p-2 rounded bg-gray-800 text-zinc-100"}
                  required
                >
                  <option value="ebook">E-Book</option>
                  <option value="video">Video</option>
                  <option value="article">Article</option>
                  <option value="subscription">Subscription</option>
                </select>
              </div>
              <button
                type="submit"
                className={theme === "light" ? "px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" : "px-4 py-2 rounded bg-blue-400 text-gray-900 hover:bg-blue-500"}
              >
                Add Resource
              </button>
            </form>
          </motion.div>

          {/* Resource List for Selected Grade */}
          <motion.div
            className={theme === "light" ? "p-6 rounded-xl shadow-sm bg-gradient-to-br from-blue-100 to-purple-100" : "p-6 rounded-xl shadow-sm bg-gradient-to-br from-gray-700 to-gray-800"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2
              className={theme === "light" ? "text-2xl font-semibold text-zinc-700 mb-4" : "text-2xl font-semibold text-zinc-300 mb-4"}
            >
              Resources for Grade {activeGrade}
            </h2>
            {filteredResources.length === 0 ? (
              <p className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}>
                No resources available for this grade yet.
              </p>
            ) : (
              filteredResources.map((resource) => (
                <div key={resource.id} className="py-2">
                  <p
                    className={theme === "light" ? "text-sm text-zinc-600" : "text-sm text-zinc-400"}
                  >
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {resource.title}
                    </a> by {resource.author} ({resource.type}) - {resource.description}
                  </p>
                </div>
              ))
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}