
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
      animate={{ x: isSidebarOpen ? 0 : -300 }}
      transition={{ duration: 0.3 }}
      className={`fixed inset-y-0 left-0 z-50 w-64 ${
        theme === "light"
          ? "bg-gradient-to-b from-blue-50 to-purple-50"
          : "bg-gradient-to-b from-gray-800 to-gray-900"
      } shadow-lg transform transition-transform duration-300 ease-in-out`}
      aria-label="Teacher Sidebar"
    >
      <div className="p-4 flex items-center justify-between">
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
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-full ${theme === "light" ? "text-zinc-600 hover:bg-blue-100" : "text-zinc-400 hover:bg-gray-700"}`}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? "←" : "→"}
        </button>
      </div>
      <nav className="mt-4 max-h-[calc(100vh-120px)] overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={item.action}
            className={`flex items-center p-4 ${
              theme === "light" ? "text-zinc-700 hover:bg-blue-100" : "text-zinc-300 hover:bg-gray-700"
            } transition-colors duration-200`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
      <div className="absolute bottom-4 p-4">
        <button
          className={`w-full p-2 rounded-lg text-sm ${
            theme === "light" ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          Quick Attendance
        </button>
      </div>
    </motion.aside>
  );
}