
"use client";

import { useState, useContext, useEffect } from "react";
import {
  Calendar, BookOpen, CheckCircle, MessageSquare, Settings, LogOut,
  Brain, FileText, Heart, Trophy, Smartphone, Upload, CheckSquare
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; // Adjust path to your Firebase config

interface NavItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  action?: () => void;
}

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isSidebarOpen, toggleSidebar }: SidebarProps) {
  const context = useContext(ThemeContext);
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState("Unknown");
  const [isHOD, setIsHOD] = useState(false);

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  useEffect(() => {
    const validateSession = async () => {
      try {
        // Validate teacher role
        const response = await fetch("/api/validate-teacher", {
          method: "GET",
          credentials: "include", // Include cookies
        });

        if (!response.ok) {
          router.push("/");
          return;
        }

        const data = await response.json();
        if (data.role !== "teacher") {
          router.push("/");
          return;
        }

        const email = data.email || "Unknown";
        setUserEmail(email);
        setIsAuthorized(true);

        // Real-time check for HOD status
        const q = query(collection(db, "departments"), where("hod", "==", email));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
          setIsHOD(!querySnapshot.empty);
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error("Session validation error:", error);
        router.push("/");
      }
    };

    validateSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        router.push("/login");
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems: NavItem[] = [
    { name: "Dashboard", icon: Calendar, href: "/teacher/" },
    { name: "Lesson Planning", icon: BookOpen, href: "/teacher/lesson-planning" },
    { name: "Attendance", icon: CheckCircle, href: "/teacher/attendance" },
    { name: "Assignments", icon: FileText, href: "/teacher/assignments" },
    { name: "Parent Meetings", icon: MessageSquare, href: "/teacher/meetings" },
    { name: "Extracurricular", icon: Trophy, href: "/teacher/extracurricular" },
    { name: "Student Welfare", icon: Heart, href: "/teacher/welfare" },
    { name: "Resource Library", icon: Upload, href: "/teacher/resources" },
    { name: "AI Insights", icon: Brain, href: "/teacher/ai-insights" },
    ...(isHOD
      ? [{ name: "Approve Lesson", icon: CheckSquare, href: "/teacher/approve-lesson" }]
      : []),
    { name: "Settings", icon: Settings, href: "/teacher/settings" },
    { name: "Logout", icon: LogOut, href: "#", action: handleLogout },
  ];

  if (!isAuthorized) {
    return null; // Render nothing while redirecting
  }

  return (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
      className={`fixed inset-y-0 left-0 z-50 ${
        isSidebarOpen ? "w-64" : "w-16"
      } ${
        theme === "light"
          ? "bg-gradient-to-b from-blue-50 to-purple-50"
          : "bg-gradient-to-b from-gray-800 to-gray-900"
      } shadow-lg rounded-r-2xl transition-all duration-300 ease-in-out font-sans`}
      aria-label="Teacher Sidebar"
    >
      <div className={`p-4 flex items-center ${isSidebarOpen ? "justify-between" : "justify-center"}`}>
        {isSidebarOpen && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <img src="/teacher-profile.jpg" alt="Teacher Profile" className="w-10 h-10 rounded-full" />
              <h2 className={`text-xl font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
                Teacher Portal
              </h2>
            </div>
            <span className={`text-sm ${theme === "light" ? "text-zinc-600" : "text-zinc-400"}`}>
              {userEmail}
            </span>
          </div>
        )}
        <div className="relative group">
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-full ${
              theme === "light" ? "text-zinc-600 hover:bg-blue-100" : "text-zinc-400 hover:bg-gray-700"
            } transition-colors duration-200`}
            aria-label={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          >
            {isSidebarOpen ? "←" : "→"}
          </button>
          {!isSidebarOpen && (
            <span
              className={`
                absolute left-full ml-3 px-3 py-1.5 text-sm font-medium
                rounded-lg shadow-lg transform translate-y-[-50%] top-1/2
                transition-all duration-200 ease-in-out
                opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-95
                ${
                  theme === "light"
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-800 text-indigo-100"
                }
              `}
            >
              Open Sidebar
            </span>
          )}
        </div>
      </div>
      <nav className="mt-4 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-400">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={item.action}
            className={`relative flex items-center p-4 mx-2 my-1 rounded-lg ${
              theme === "light"
                ? "text-zinc-700 hover:bg-blue-100"
                : "text-zinc-300 hover:bg-gray-700"
            } transition-all duration-200 group ${isSidebarOpen ? "justify-start" : "justify-center"}`}
            aria-label={item.name}
          >
            <motion.div
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            >
              <item.icon className="w-5 h-5" />
            </motion.div>
            {isSidebarOpen && <span className="ml-3 text-sm font-medium">{item.name}</span>}
            {!isSidebarOpen && (
              <span
                className={`
                  absolute left-full ml-3 px-3 py-1.5 text-sm font-medium
                  rounded-lg shadow-lg transform translate-y-[-50%] top-1/2
                  transition-all duration-200 ease-in-out
                  opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-95
                  ${
                    theme === "light"
                      ? "bg-indigo-600 text-white"
                    : "bg-indigo-800 text-indigo-100"
                  }
                `}
              >
                {item.name}
              </span>
            )}
          </Link>
        ))}
      </nav>
      {isSidebarOpen && (
        <div className="absolute bottom-4 p-4">
          <button
            className={`w-full p-2 rounded-lg text-sm ${
              theme === "light" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            Quick Attendance
          </button>
        </div>
      )}
    </motion.aside>
  );
}
