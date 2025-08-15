"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Book, Cpu, FileText, Library, Search, Share, Users } from "lucide-react";

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  const tabs = [
    {
      id: "physical-space",
      title: "Organizing the Physical Space",
      icon: Library,
      content: (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
            Organizing the Physical Space
          </h2>
          <ul className="space-y-4 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Designate a central, accessible location in your school for resource storage.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Create distinct sections for books, manipulatives, technology, and other resources.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Use clear labeling and categorization systems for easy identification.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Include comfortable workspaces for teachers to explore and utilize resources.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "digital-organization",
      title: "Digital Organization",
      icon: Cpu,
      content: (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
            Digital Organization
          </h2>
          <ul className="space-y-4 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Implement a digital catalog system using Google Sheets, library software, or specialized platforms.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Create a shared drive or cloud storage for seamless access to digital resources.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Develop a consistent naming convention for all digital files.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "adding-resources",
      title: "Adding Resources to the Library",
      icon: Book,
      content: (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
            Adding Resources to the Library
          </h2>
          <div>
            <button
              className="flex items-center justify-between w-full text-xl font-semibold text-gray-800 dark:text-gray-200"
              onClick={() => toggleSection("acquisition")}
            >
              1. Acquisition Process
              <span>{expandedSections["acquisition"] ? "−" : "+"}</span>
            </button>
            {expandedSections["acquisition"] && (
              <ul className="space-y-4 text-gray-700 dark:text-gray-300 mt-2">
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span><strong>Teacher requests:</strong> Establish a system for teachers to suggest new resources.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span><strong>Curriculum alignment:</strong> Prioritize resources that support current curriculum needs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span><strong>Diverse materials:</strong> Include books, manipulatives, multimedia, and technology tools.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span><strong>Professional development:</strong> Add materials that support teacher growth.</span>
                </li>
              </ul>
            )}
          </div>
          <div>
            <button
              className="flex items-center justify-between w-full text-xl font-semibold text-gray-800 dark:text-gray-200"
              onClick={() => toggleSection("cataloging")}
            >
              2. Cataloging New Resources
              <span>{expandedSections["cataloging"] ? "−" : "+"}</span>
            </button>
            {expandedSections["cataloging"] && (
              <ul className="space-y-4 text-gray-700 dark:text-gray-300 mt-2">
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Assign unique identifiers or barcodes to each resource.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Record title, author/creator, subject, grade level, and keywords.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Note physical location or digital access instructions.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Include brief descriptions and potential uses for each resource.</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "managing-library",
      title: "Managing Library Use",
      icon: FileText,
      content: (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
            Managing Library Use
          </h2>
          <div>
            <button
              className="flex items-center justify-between w-full text-xl font-semibold text-gray-800 dark:text-gray-200"
              onClick={() => toggleSection("checkout")}
            >
              1. Checkout System
              <span>{expandedSections["checkout"] ? "−" : "+"}</span>
            </button>
            {expandedSections["checkout"] && (
              <ul className="space-y-4 text-gray-700 dark:text-gray-300 mt-2">
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Implement a simple sign-out process (digital or paper-based).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Set reasonable loan periods for different resource types.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Create a reservation system for high-demand items.</span>
                </li>
              </ul>
            )}
          </div>
          <div>
            <button
              className="flex items-center justify-between w-full text-xl font-semibold text-gray-800 dark:text-gray-200"
              onClick={() => toggleSection("maintenance")}
            >
              2. Maintenance and Updates
              <span>{expandedSections["maintenance"] ? "−" : "+"}</span>
            </button>
            {expandedSections["maintenance"] && (
              <ul className="space-y-4 text-gray-700 dark:text-gray-300 mt-2">
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Schedule regular inventory checks to ensure accuracy.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Establish a weeding process to remove outdated materials.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Create a repair/replacement protocol for damaged items.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-indigo-500">•</span>
                  <span>Set quarterly reviews to assess resource needs.</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "promoting-library",
      title: "Promoting Library Use",
      icon: Users,
      content: (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
            Promoting Library Use
          </h2>
          <ul className="space-y-4 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Hold orientation sessions for new teachers to familiarize them with the library.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Feature a "resource of the week" in staff communications to highlight valuable materials.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Organize sharing sessions where teachers demonstrate how they’ve used resources.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Create a suggestion box for new resource acquisitions.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "digital-resource-management",
      title: "Digital Resource Management",
      icon: Share,
      content: (
        <div className="space-y-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
            Digital Resource Management
          </h2>
          <ul className="space-y-4 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Use platforms like Google Classroom, Padlet, or Wakelet to share digital resources.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Organize resources by subject, grade level, and resource type for easy access.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Include teacher-created materials with proper credit to the creator.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-indigo-500">•</span>
              <span>Implement version control for updated digital materials.</span>
            </li>
          </ul>
        </div>
      ),
    },
  ];

  const filteredTabs = tabs.filter((tab) =>
    tab.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    // Initialize expanded sections
    const initialExpanded = tabs
      .filter((tab) => tab.id === "adding-resources" || tab.id === "managing-library")
      .reduce((acc, tab) => {
        if (tab.id === "adding-resources") {
          return { ...acc, acquisition: true, cataloging: true };
        }
        if (tab.id === "managing-library") {
          return { ...acc, checkout: true, maintenance: true };
        }
        return acc;
      }, {});
    setExpandedSections(initialExpanded);
  }, []);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleBackClick = () => {
    setActiveTab(null);
  };

  return (
    <section className="min-h-screen p-6 bg-gradient-to-b from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-5xl font-extrabold text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text mb-10">
          Resource Management Hub
        </h1>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-4 pl-12 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>

        {/* Tab Navigation */}
        <div className={`${activeTab ? "hidden md:block" : "block"} mb-8`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-semibold">{tab.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 animate-slide-in">
            <div className="md:hidden mb-6">
              <button
                onClick={handleBackClick}
                className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors duration-200 font-semibold"
              >
                <ArrowLeft className="w-6 h-6" />
                Back to Categories
              </button>
            </div>
            {tabs.find((tab) => tab.id === activeTab)?.content}
          </div>
        )}

        {/* Default View */}
        {!activeTab && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center animate-slide-in">
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Select a category above or use the search bar to explore resource management strategies.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.5s ease-out;
        }
      `}</style>
    </section>
  );
}