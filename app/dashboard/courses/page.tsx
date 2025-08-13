"use client";

import { useContext, useState, useEffect, useRef } from "react";
import { ThemeContext } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Book, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { db } from "../../firebase";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import { arrayUnion } from "firebase/firestore";

interface Course {
  id: string;
  name: string;
  grade: string;
}

interface Grade {
  id: string;
  grade: string;
  depleted?: boolean;
}

interface Student {
  fullName: string;
  section: string;
  stuId: string;
}

interface CourseDocument {
  grade: string;
  courses: { name: string; students: Student[] }[];
}

export default function Courses() {
  const context = useContext(ThemeContext);
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [newCourse, setNewCourse] = useState({ name: "", grade: "" });
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  // Common course suggestions
  const commonCourses = [
    "Mathematics",
    "Science",
    "English",
    "History",
    "Physics",
    "Chemistry",
    "Biology",
    "Geography",
    "Computer Science",
    "Literature"
  ];

  // Function to normalize course name
  const normalizeCourseName = (name: string): string => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  };

  // Function to transform Firestore grade format to display format
  const formatGradeDisplay = (grade: string) => {
    if (grade === "all") return "All";
    return `Grade ${grade.replace("grade", "")}`;
  };

  // Function to transform display format to Firestore format
  const formatGradeFirestore = (grade: string) => {
    if (grade === "All") return "all";
    return `grade${grade.replace("Grade ", "")}`;
  };

  // Fetch grades and courses from Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Fetch grades (not depleted)
    const gradesUnsubscribe = onSnapshot(
      collection(db, "grades"),
      (snapshot) => {
        const gradeList = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            grade: doc.data().grade,
            depleted: doc.data().depleted,
          }))
          .filter((grade) => !grade.depleted) as Grade[];
        setGrades([{ id: "all", grade: "all" }, ...gradeList]);
      },
      (error) => {
        console.error("Error fetching grades:", error);
        toast.error("Failed to load grades");
        setIsLoading(false);
      }
    );

    // Fetch courses
    const coursesUnsubscribe = onSnapshot(
      collection(db, "courses"),
      (snapshot) => {
        const courseList: Course[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as CourseDocument;
          data.courses.forEach((course) => {
            courseList.push({
              id: `${doc.id}-${course.name}`,
              name: course.name,
              grade: data.grade,
            });
          });
        });
        setCourses(courseList);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching courses:", error);
        toast.error("Failed to load courses");
        setIsLoading(false);
      }
    );

    unsubscribes.push(gradesUnsubscribe, coursesUnsubscribe);
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, []);

  // Autocomplete suggestions
  useEffect(() => {
    if (newCourse.name.length > 0) {
      const filteredSuggestions = commonCourses
        .filter(course => 
          course.toLowerCase().includes(newCourse.name.toLowerCase()) &&
          !courses.some(c => typeof c.name === 'string' && c.name.toLowerCase() === course.toLowerCase())
        )
        .slice(0, 5);
      setSuggestions(filteredSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [newCourse.name, courses]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.name || !newCourse.grade) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      const normalizedName = normalizeCourseName(newCourse.name);
      const gradeFirestore = formatGradeFirestore(newCourse.grade);
      const courseDocRef = doc(db, "courses", gradeFirestore);
      await setDoc(
        courseDocRef,
        {
          grade: gradeFirestore,
          courses: arrayUnion({ name: normalizedName, students: [] }),
        },
        { merge: true }
      );
      toast.success("Course added successfully");
      setNewCourse({ name: "", grade: "" });
      setIsFormOpen(false);
      setSuggestions([]);
      if (formRef.current) {
        formRef.current.reset();
      }
    } catch (error) {
      console.error("Error adding course:", error);
      toast.error("Failed to add course");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNewCourse({ ...newCourse, name: suggestion });
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const toggleForm = () => {
    setIsFormOpen(!isFormOpen);
    setSuggestions([]);
  };

  const groupedCourses = grades
    .filter((g) => g.grade !== "all")
    .map((g) => ({
      grade: g.grade,
      courses: courses.filter((course) => course.grade === g.grade),
    }))
    .filter((group) => group.courses.length > 0);

  return (
    <div className={`relative min-h-screen p-6 ${theme === "light" ? "bg-gradient-to-br from-blue-200 to-purple-200" : "bg-gradient-to-br from-gray-800 to-gray-900"}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`w-full max-w-4xl mx-auto ${isFormOpen ? "blur-sm" : ""}`}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
            Course Management
          </h1>
          <button
            onClick={toggleForm}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${theme === "light" ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg" : "bg-blue-400 text-gray-900 hover:bg-blue-500 shadow-md hover:shadow-lg"} transition-all duration-200`}
          >
            <Plus className="w-5 h-5" />
            Add Course
          </button>
        </div>

        {/* Grade Filter */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`p-6 rounded-xl shadow-lg mb-8 ${theme === "light" ? "bg-white" : "bg-gray-800"} border ${theme === "light" ? "border-blue-100" : "border-gray-700"}`}
        >
          <label className={`block text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"} mb-2`}>
            Filter by Grade
          </label>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className={`w-full max-w-xs p-2 rounded-lg border ${theme === "light" ? "border-gray-300 bg-white text-zinc-800" : "border-gray-600 bg-gray-700 text-zinc-100"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            {grades.map((g) => (
              <option key={g.id} value={g.grade}>
                {formatGradeDisplay(g.grade)}
              </option>
            ))}
          </select>
        </motion.div>

        {/* Course Table */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className={`animate-spin ${theme === "light" ? "text-blue-600" : "text-blue-400"}`} size={40} />
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={`rounded-xl shadow-lg ${theme === "light" ? "bg-white" : "bg-gray-800"} border ${theme === "light" ? "border-blue-100" : "border-gray-700"}`}
          >
            <table className="w-full">
              <thead>
                <tr className={`${theme === "light" ? "bg-blue-100" : "bg-gray-700"}`}>
                  <th className={`p-4 text-left text-sm font-semibold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}>Grade</th>
                  <th className={`p-4 text-left text-sm font-semibold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"}`}>Courses</th>
                </tr>
              </thead>
              <tbody>
                {groupedCourses.length === 0 ? (
                  <tr>
                    <td colSpan={2} className={`p-4 text-center ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                      No courses found for {formatGradeDisplay(selectedGrade)}.
                    </td>
                  </tr>
                ) : (
                  groupedCourses
                    .filter((group) => selectedGrade === "all" || group.grade === selectedGrade)
                    .map((group) => (
                      <tr key={group.grade} className={`border-t ${theme === "light" ? "border-gray-200" : "border-gray-700"}`}>
                        <td className={`p-4 ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>{formatGradeDisplay(group.grade)}</td>
                        <td className={`p-4 ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                          {group.courses.map((course) => (
                            <div key={course.id} className="flex items-center gap-2 mb-2">
                              <Book className={`w-5 h-5 ${theme === "light" ? "text-blue-600" : "text-blue-400"}`} />
                              <span>{course.name}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </motion.div>
        )}
      </motion.div>

      {/* Add Course Form (Centered Modal) */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 backdrop-blur-sm flex justify-center items-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className={`p-6 rounded-xl shadow-2xl w-full max-w-md ${theme === "light" ? "bg-white" : "bg-gray-800"} border ${theme === "light" ? "border-blue-100" : "border-gray-700"}`}
            >
              <h2 className={`text-2xl font-semibold ${theme === "light" ? "text-zinc-700" : "text-zinc-300"} mb-4 text-center`}>
                Add New Course
              </h2>
              <form ref={formRef} onSubmit={handleAddCourse} className="space-y-4">
                <div className="relative">
                  <label className={`block text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                    Course Name
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    className={`w-full p-2 rounded-lg border ${theme === "light" ? "border-gray-300 bg-white text-zinc-800" : "border-gray-600 bg-gray-700 text-zinc-100"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Enter course name"
                    required
                  />
                  {suggestions.length > 0 && (
                    <motion.ul
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg ${theme === "light" ? "bg-white border-gray-300" : "bg-gray-700 border-gray-600"} border max-h-60 overflow-auto`}
                    >
                      {suggestions.map((suggestion) => (
                        <li
                          key={suggestion}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={`px-4 py-2 cursor-pointer ${theme === "light" ? "hover:bg-blue-100 text-zinc-800" : "hover:bg-gray-600 text-zinc-100"}`}
                        >
                          {suggestion}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </div>
                <div>
                  <label className={`block text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
                    Grade
                  </label>
                  <select
                    value={newCourse.grade}
                    onChange={(e) => setNewCourse({ ...newCourse, grade: e.target.value })}
                    className={`w-full p-2 rounded-lg border ${theme === "light" ? "border-gray-300 bg-white text-zinc-800" : "border-gray-600 bg-gray-700 text-zinc-100"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  >
                    <option value="">Select grade</option>
                    {grades.filter((g) => g.grade !== "all").map((g) => (
                      <option key={g.id} value={formatGradeDisplay(g.grade)}>
                        {formatGradeDisplay(g.grade)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={toggleForm}
                    className={`px-4 py-2 rounded-lg ${theme === "light" ? "bg-gray-200 text-zinc-800 hover:bg-gray-300" : "bg-gray-600 text-zinc-100 hover:bg-gray-700"} transition-all duration-200`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-lg ${theme === "light" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-400 text-gray-900 hover:bg-blue-500"} transition-all duration-200`}
                  >
                    Add Course
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}