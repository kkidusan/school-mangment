// app/teacher/dashboard/page.tsx
"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeContext } from "../context/ThemeContext"; // Adjust path
import { Calendar, BookOpen, CheckCircle, MessageSquare, Trophy } from "lucide-react";
import { toast } from "react-hot-toast";

export default function Dashboard() {
  const context = useContext(ThemeContext);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null); // State for email

  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch("/api/validate-teacher", {
          method: "GET",
          credentials: "include", // Include cookies
        });

        if (!response.ok) {
          const { error } = await response.json();
          toast.error(error || "Please log in as a teacher to access this page");
          router.push("/");
          return;
        }

        const data = await response.json();
        // Check if role is teacher
        if (data.role !== "teacher") {
          toast.error("Access denied: Teacher role required");
          router.push("/");
          return;
        }

        // Set email and authorization
        setUserEmail(data.email || "Unknown"); // Fallback if email is not provided
        setIsAuthorized(true);
      } catch (error: any) {
        toast.error("Please log in as a teacher to access this page");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [router]);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Render nothing while redirecting
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Welcome to Your Teacher Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Logged in as: <span className="font-semibold">{userEmail}</span>
        </p>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Manage your teaching tasks efficiently using the sidebar to navigate.
        </p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center">
          <Calendar className="w-8 h-8 text-blue-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Upcoming Classes</h3>
            <p className="text-gray-600 dark:text-gray-300">5 classes today</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center">
          <BookOpen className="w-8 h-8 text-green-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Lesson Plans</h3>
            <p className="text-gray-600 dark:text-gray-300">3 plans pending</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center">
          <CheckCircle className="w-8 h-8 text-purple-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Attendance</h3>
            <p className="text-gray-600 dark:text-gray-300">90% marked</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center">
          <MessageSquare className="w-8 h-8 text-red-500 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Parent Meetings</h3>
            <p className="text-gray-600 dark:text-gray-300">2 scheduled</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Recent Activity
        </h2>
        <ul className="space-y-2">
          <li className="text-gray-600 dark:text-gray-300">
            <Trophy className="inline w-5 h-5 mr-2 text-yellow-500" />
            Awarded "Star Teacher" badge for excellent feedback.
          </li>
          <li className="text-gray-600 dark:text-gray-300">
            <BookOpen className="inline w-5 h-5 mr-2 text-green-500" />
            Uploaded new lesson plan for Algebra II.
          </li>
          <li className="text-gray-600 dark:text-gray-300">
            <MessageSquare className="inline w-5 h-5 mr-2 text-red-500" />
            Scheduled parent meeting for tomorrow.
          </li>
        </ul>
      </div>
    </section>
  );
}