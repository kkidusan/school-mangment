"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LessonPlanningTab from "./components/LessonPlanningTab";
import GradingAssessmentTab from "./components/GradingAssessmentTab";
import ParentMeetingsTab from "./components/ParentMeetingsTab";
import ProfessionalDevelopmentTab from "./components/ProfessionalDevelopmentTab";
import AdministrativeWorkTab from "./components/AdministrativeWorkTab";
import ExtracurricularActivitiesTab from "./components/ExtracurricularActivitiesTab";

export default function PlanningSystem() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Lesson Planning");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [userRole, setUserRole] = useState("teacher"); // Default role

  // Fetch plans and user role (mocked)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Mock data
        const mockPlans = [];
        setPlans(mockPlans);
        
        // In a real app, you would fetch the user role here
        // setUserRole(fetchedRole);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle bulk status update
  const handleBulkStatusUpdate = async (newStatus) => {
    try {
      setPlans(plans.map((plan) =>
        selectedPlans.includes(plan.plan_id)
          ? { ...plan, status: newStatus, last_modified: new Date().toISOString() }
          : plan
      ));
      setSelectedPlans([]);
      console.log(`Updated ${selectedPlans.length} plans to ${newStatus}`);
    } catch (error) {
      console.error("Error updating plans:", error);
    }
  };

  // Handle plan archiving
  const handleArchivePlan = async (planId) => {
    try {
      setPlans(plans.map((plan) =>
        plan.plan_id === planId ? { ...plan, status: "Archived", last_modified: new Date().toISOString() } : plan
      ));
      console.log("Plan archived successfully!");
    } catch (error) {
      console.error("Error archiving plan:", error);
    }
  };

  // Filter plans by search query
  const filteredPlans = plans.filter((plan) =>
    (searchQuery === "" ||
      plan.academic_year.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.lesson_data.objectives.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.subject && plan.subject.toLowerCase().includes(searchQuery.toLowerCase()))) &&
    plan.category === activeTab &&
    plan.status !== "Archived"
  );

  const tabs = [
    "Lesson Planning",
    "Grading/Assessment",
    "Parent Meetings",
    "Professional Development",
    "Administrative Work",
    "Extracurricular Activities",
  ];

  // Common props for all tab components
  const commonTabProps = {
    plans: filteredPlans,
    theme: "light",
    setPlans,
    selectedPlans,
    setSelectedPlans,
    handleArchivePlan,
    userRole
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            Planning System
          </h1>
          <Link href="/dashboard">
            <button
              className="px-4 py-2 rounded-lg flex items-center"
              aria-label="Back to dashboard"
            >
              Back to Dashboard
            </button>
          </Link>
        </div>

        {/* Search and Bulk Actions */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plans..."
                className="pl-10 p-2 rounded-lg"
                aria-label="Search plans"
              />
            </div>
            {selectedPlans.length > 0 && (
              <select
                onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                className="p-2 rounded-lg"
                aria-label="Bulk status update"
              >
                <option value="">Bulk Status Update</option>
                <option value="Draft">Draft</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Published">Published</option>
              </select>
            )}
          </div>
          <div className="flex space-x-2">
            <Link href="/dashboard">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                aria-label="Create new plan"
              >
                New Plan
              </button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedPlans([]);
              }}
              className={`px-4 py-2 -mb-px border-b-2 ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <p className="text-center">
            Loading plans...
          </p>
        ) : (
          <>
            {activeTab === "Lesson Planning" && <LessonPlanningTab {...commonTabProps} />}
            {activeTab === "Grading/Assessment" && <GradingAssessmentTab {...commonTabProps} />}
            {activeTab === "Parent Meetings" && <ParentMeetingsTab {...commonTabProps} />}
            {activeTab === "Professional Development" && <ProfessionalDevelopmentTab {...commonTabProps} />}
            {activeTab === "Administrative Work" && <AdministrativeWorkTab {...commonTabProps} />}
            {activeTab === "Extracurricular Activities" && <ExtracurricularActivitiesTab {...commonTabProps} />}
          </>
        )}
      </div>
    </div>
  );
}