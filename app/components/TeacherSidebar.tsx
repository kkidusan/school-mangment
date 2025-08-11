"use client";

import { useState, useContext } from "react";
import {
  Calendar, BookOpen, CheckCircle, MessageSquare, Users, Settings, LogOut,
  Brain, FileText, Heart, Trophy, Smartphone, Upload
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";

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

  if (!context) {
    throw new Error("ThemeContext must be used within a ThemeProvider");
  }
  const { theme } = context;

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        toast.success("Logged out successfully");
        router.push("/login");
      } else {
        toast.error("Logout failed. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred during logout.");
      console.error("Logout error:", error);
    }
  };

  const navItems: NavItem[] = [
    { name: "Dashboard", icon: Calendar, href: "/teacher/", action: undefined },
    {
      name: "Lesson Planning",
      icon: BookOpen,
      href: "/teacher/lesson-planning",
      action: () => toast.info("Plan and manage your lessons"),
    },
    {
      name: "Attendance",
      icon: CheckCircle,
      href: "/teacher/attendance",
      action: () => toast.info("Mark and review student attendance"),
    },
    {
      name: "Assignments",
      icon: FileText,
      href: "/teacher/assignments",
      action: () => toast.info("Create and grade assignments"),
    },
    {
      name: "Parent Meetings",
      icon: MessageSquare,
      href: "/teacher/meetings",
      action: () => toast.info("Schedule parent-teacher meetings"),
    },
    {
      name: "Extracurricular",
      icon: Trophy,
      href: "/teacher/extracurricular",
      action: () => toast.info("Manage clubs and events"),
    },
    {
      name: "Student Welfare",
      icon: Heart,
      href: "/teacher/welfare",
      action: () => toast.info("Support student well-being"),
    },
    {
      name: "Resource Library",
      icon: Upload,
      href: "/teacher/resources",
      action: () => toast.info("Access and upload teaching materials"),
    },
    {
      name: "AI Insights",
      icon: Brain,
      href: "/teacher/ai-insights",
      action: () => toast.info("View AI-driven teaching recommendations"),
    },
    {
      name: "Mobile App",
      icon: Smartphone,
      href: "/teacher/mobile",
      action: () => toast.info("Manage mobile app notifications"),
    },
    {
      name: "Settings",
      icon: Settings,
      href: "/teacher/settings",
      action: () => toast.info("Manage your profile and preferences"),
    },
    {
      name: "Logout",
      icon: LogOut,
      href: "#",
      action: handleLogout,
    },
  ];

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
        <div className="flex items-center gap-2">
          <img src="/teacher-profile.jpg" alt="Teacher Profile" className="w-10 h-10 rounded-full" />
          <h2 className={`text-xl font-bold ${theme === "light" ? "text-zinc-800" : "text-zinc-100"}`}>
            Teacher Portal
          </h2>
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
          onClick={() => toast.info("Quick action: Mark attendance")}
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