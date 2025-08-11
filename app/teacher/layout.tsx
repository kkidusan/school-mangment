// app/teacher/layout.tsx
"use client";

import { useState } from "react";
import Sidebar from "../components/TeacherSidebar"; // Adjust path based on your project structure
import { ThemeProvider } from "../context/ThemeContext"; // Adjust path
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <ThemeProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

        {/* Main Content */}
        <main
          className={`flex-1 p-6 transition-all duration-300 ${
            isSidebarOpen ? "ml-64" : "ml-0"
          } bg-gray-100 dark:bg-gray-900`}
        >
          {children}
        </main>

        {/* Toast Notifications */}
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </ThemeProvider>
  );
}