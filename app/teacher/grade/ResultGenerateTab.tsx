"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
import { Eye, X, CheckCircle, Download } from "lucide-react";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import FocusTrap from "focus-trap-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

interface ResultGenerateTabProps {
  grade: string; // e.g., "grade2", "Grade 2", "2nd Grade"
}

interface StudentResult {
  [subject: string]: number; // e.g., { Math: 85, Science: 90 }
}

interface Student {
  fullName: string;
  stuId: string;
  section: string;
  results: {
    semester1: { [date: string]: StudentResult };
    semester2: { [date: string]: StudentResult };
  };
}

export default function ResultGenerateTab({ grade }: ResultGenerateTabProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectsWithSemester2, setSubjectsWithSemester2] = useState<Set<string>>(new Set());
  const tableRef = useRef<HTMLTableElement>(null);

  // Normalize grade for Firestore and display
  const normalizedGrade = grade
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^grade(\d+)$/, "$1")
    .replace(/(\d+)(st|nd|rd|th)?grade/, "$1");
  const formattedGrade = `Grade ${normalizedGrade}`;

  // Fetch students and their results from Firestore with real-time listener
  useEffect(() => {
    setLoading(true);
    const gradeRef = collection(db, "grades");
    const gradeQuery = query(gradeRef, where("grade", "==", `grade${normalizedGrade}`));
    const assessmentsRef = collection(db, "assessments");
    const assessmentsQuery = query(
      assessmentsRef,
      where("grade", "==", `grade${normalizedGrade}`),
      where("status", "==", "complete")
    );

    const unsubscribeGrades = onSnapshot(gradeQuery, (gradeSnapshot) => {
      const studentData: Student[] = [];
      const studentMap: { [stuId: string]: { fullName: string; section: string } } = {};
      const allSubjects = new Set<string>();
      const subjectsWithSem2 = new Set<string>();

      if (gradeSnapshot.empty) {
        toast.warn(`No students found for ${formattedGrade}.`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setStudents([]);
        setSubjects([]);
        setSubjectsWithSemester2(new Set());
        setLoading(false);
        return;
      }

      gradeSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.students && Array.isArray(data.students)) {
          data.students.forEach((student: any) => {
            studentMap[student.stuId] = {
              fullName: student.fullName || "Unknown",
              section: student.section || "A",
            };
          });
        }
      });

      const unsubscribeAssessments = onSnapshot(assessmentsQuery, (assessmentsSnapshot) => {
        const resultsByStudent: {
          [stuId: string]: { semester1: { [date: string]: StudentResult }; semester2: { [date: string]: StudentResult } };
        } = {};

        assessmentsSnapshot.forEach((assessmentDoc) => {
          const assessmentData = assessmentDoc.data();
          if (assessmentData.marks && assessmentData.subject && assessmentData.timestamp && assessmentData.semester) {
            const date = assessmentData.timestamp.toDate().toISOString().split("T")[0];
            const subject = assessmentData.subject;
            const semester = assessmentData.semester === "Semester 1" ? "semester1" : "semester2";
            allSubjects.add(subject);
            if (semester === "semester2") {
              subjectsWithSem2.add(subject);
            }

            Object.entries(assessmentData.marks).forEach(([stuId, marks]: [string, any]) => {
              if (!resultsByStudent[stuId]) {
                resultsByStudent[stuId] = { semester1: {}, semester2: {} };
              }
              if (!resultsByStudent[stuId][semester][date]) {
                resultsByStudent[stuId][semester][date] = {};
              }
              resultsByStudent[stuId][semester][date][subject] = marks.total || 0;
            });
          }
        });

        const updatedStudentData: Student[] = [];
        Object.entries(studentMap).forEach(([stuId, { fullName, section }]) => {
          updatedStudentData.push({
            fullName,
            stuId,
            section,
            results: {
              semester1: resultsByStudent[stuId]?.semester1 || {},
              semester2: resultsByStudent[stuId]?.semester2 || {},
            },
          });
        });

        setStudents(updatedStudentData);
        setSubjects(Array.from(allSubjects).sort());
        setSubjectsWithSemester2(subjectsWithSem2);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching assessments:", error);
        toast.error(`Failed to fetch assessment data: ${error.message}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setStudents([]);
        setSubjects([]);
        setSubjectsWithSemester2(new Set());
        setLoading(false);
      });

      return () => {
        unsubscribeAssessments();
      };
    }, (error) => {
      console.error("Error fetching students:", error);
      toast.error(`Failed to fetch student data: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setStudents([]);
      setSubjects([]);
      setSubjectsWithSemester2(new Set());
      setLoading(false);
    });

    return () => {
      unsubscribeGrades();
    };
  }, [grade, normalizedGrade]);

  // Check if any Semester 2 data exists
  const hasSemester2Data = subjectsWithSemester2.size > 0;

  // Calculate total, average, rank, and pass/fail for a student's results
  const calculateResultMetrics = (
    result1: StudentResult,
    result2: StudentResult,
    allStudents: Student[],
    semester: "semester1" | "semester2"
  ) => {
    const subjects1 = Object.keys(result1);
    const total1 = subjects1.reduce((sum, subject) => sum + (result1[subject] || 0), 0);
    const average1 = subjects1.length > 0 ? Number((total1 / subjects1.length).toFixed(2)) : 0;

    const subjects2 = Object.keys(result2);
    const total2 = subjects2.reduce((sum, subject) => sum + (result2[subject] || 0), 0);
    const average2 = subjects2.length > 0 ? Number((total2 / subjects2.length).toFixed(2)) : 0;

    let rank;
    if (semester === "semester1") {
      const studentAverages = allStudents.map((student) => {
        const studentResults = Object.values(student.results.semester1);
        const studentTotal = studentResults.reduce((sum, res) => {
          const resSubjects = Object.keys(res);
          const resTotal = resSubjects.reduce((s, subject) => s + (res[subject] || 0), 0);
          return sum + (resSubjects.length > 0 ? resTotal / resSubjects.length : 0);
        }, 0);
        return {
          stuId: student.stuId,
          average: studentResults.length > 0 ? Number((studentTotal / studentResults.length).toFixed(2)) : 0,
        };
      });
      const sortedAverages = [...new Set(studentAverages.map((s) => s.average))].sort((a, b) => b - a);
      rank = sortedAverages.indexOf(average1) + 1;
    } else {
      const studentCombinedAverages = allStudents.map((student) => {
        const results1 = Object.values(student.results.semester1);
        const total1 = results1.reduce((sum, res) => {
          const resSubjects = Object.keys(res);
          return sum + (resSubjects.length > 0 ? resSubjects.reduce((s, subject) => s + (res[subject] || 0), 0) / resSubjects.length : 0);
        }, 0);
        const avg1 = results1.length > 0 ? Number((total1 / results1.length).toFixed(2)) : 0;

        const results2 = Object.values(student.results.semester2);
        const total2 = results2.reduce((sum, res) => {
          const resSubjects = Object.keys(res);
          return sum + (resSubjects.length > 0 ? resSubjects.reduce((s, subject) => s + (res[subject] || 0), 0) / resSubjects.length : 0);
        }, 0);
        const avg2 = results2.length > 0 ? Number((total2 / results2.length).toFixed(2)) : 0;

        return {
          stuId: student.stuId,
          combinedAverage: avg1 + avg2,
        };
      });
      const sortedCombinedAverages = [...new Set(studentCombinedAverages.map((s) => s.combinedAverage))].sort((a, b) => b - a);
      rank = sortedCombinedAverages.indexOf(average1 + average2) + 1;
    }

    // Calculate pass/fail based on combined average (only if both semesters exist)
    let passFailStatus: string | null = null;
    if (hasSemester2Data) {
      const combinedAverage = Number(((average1 + average2) / 2).toFixed(2));
      passFailStatus = combinedAverage > 50 ? "Pass" : "Fail";
    }

    return {
      total: semester === "semester1" ? total1 : total2,
      average: semester === "semester1" ? average1 : average2,
      rank,
      passFailStatus,
    };
  };

  // Calculate class summary for both semesters
  const classSummary = useMemo(() => {
    let totalAverage1 = 0;
    let passCount1 = 0;
    let studentCount1 = 0;
    let totalAverage2 = 0;
    let passCount2 = 0;
    let studentCount2 = 0;
    let combinedPassCount = 0;
    let combinedStudentCount = 0;

    students.forEach((student) => {
      Object.values(student.results.semester1).forEach((result: StudentResult) => {
        const { average, rank } = calculateResultMetrics(result, {}, students, "semester1");
        totalAverage1 += average;
        if (rank <= Math.ceil(students.length / 2)) passCount1++;
        studentCount1++;
      });
      Object.values(student.results.semester2).forEach((result: StudentResult) => {
        const { average, rank } = calculateResultMetrics({}, result, students, "semester2");
        totalAverage2 += average;
        if (rank <= Math.ceil(students.length / 2)) passCount2++;
        studentCount2++;
      });
      if (hasSemester2Data) {
        const aggregatedResult1: StudentResult = {};
        const aggregatedResult2: StudentResult = {};
        subjects.forEach((subject) => {
          let totalScore1 = 0;
          let count1 = 0;
          let totalScore2 = 0;
          let count2 = 0;
          Object.values(student.results.semester1).forEach((result: StudentResult) => {
            if (result[subject]) {
              totalScore1 += result[subject];
              count1++;
            }
          });
          Object.values(student.results.semester2).forEach((result: StudentResult) => {
            if (result[subject]) {
              totalScore2 += result[subject];
              count2++;
            }
          });
          aggregatedResult1[subject] = count1 > 0 ? Number((totalScore1 / count1).toFixed(2)) : 0;
          aggregatedResult2[subject] = count2 > 0 ? Number((totalScore2 / count2).toFixed(2)) : 0;
        });
        const { passFailStatus } = calculateResultMetrics(aggregatedResult1, aggregatedResult2, students, "semester2");
        if (passFailStatus === "Pass") combinedPassCount++;
        combinedStudentCount++;
      }
    });

    return {
      semester1: {
        averageScore: studentCount1 > 0 ? Number((totalAverage1 / studentCount1).toFixed(2)) : 0,
        passRate: studentCount1 > 0 ? Number(((passCount1 / studentCount1) * 100).toFixed(2)) : 0,
        studentCount: studentCount1,
      },
      semester2: {
        averageScore: studentCount2 > 0 ? Number((totalAverage2 / studentCount2).toFixed(2)) : 0,
        passRate: studentCount2 > 0 ? Number(((passCount2 / studentCount2) * 100).toFixed(2)) : 0,
        studentCount: studentCount2,
      },
      combined: hasSemester2Data
        ? {
            passRate: combinedStudentCount > 0 ? Number(((combinedPassCount / combinedStudentCount) * 100).toFixed(2)) : 0,
            studentCount: combinedStudentCount,
          }
        : null,
    };
  }, [students, hasSemester2Data]);

  // Handle export to different formats
  const handleExport = async (format: "excel" | "pdf" | "image") => {
    try {
      const data = students.map((student) => {
        const aggregatedResult1: StudentResult = {};
        const aggregatedResult2: StudentResult = {};
        subjects.forEach((subject) => {
          let totalScore1 = 0;
          let count1 = 0;
          let totalScore2 = 0;
          let count2 = 0;
          Object.values(student.results.semester1).forEach((result: StudentResult) => {
            if (result[subject]) {
              totalScore1 += result[subject];
              count1++;
            }
          });
          Object.values(student.results.semester2).forEach((result: StudentResult) => {
            if (result[subject]) {
              totalScore2 += result[subject];
              count2++;
            }
          });
          aggregatedResult1[subject] = count1 > 0 ? Number((totalScore1 / count1).toFixed(2)) : 0;
          aggregatedResult2[subject] = count2 > 0 ? Number((totalScore2 / count2).toFixed(2)) : 0;
        });
        const metrics1 = calculateResultMetrics(aggregatedResult1, aggregatedResult2, students, "semester1");
        const metrics2 = calculateResultMetrics(aggregatedResult1, aggregatedResult2, students, "semester2");

        const row: { [key: string]: string | number } = {
          "Student ID": student.stuId,
          "Student Name": student.fullName,
          "Section": student.section,
        };
        subjects.forEach((subject) => {
          row[`${subject} I`] = aggregatedResult1[subject] || "-";
          if (subjectsWithSemester2.has(subject)) {
            row[`${subject} II`] = aggregatedResult2[subject] || "-";
          }
        });
        row["Total I"] = metrics1.total || "-";
        if (hasSemester2Data) {
          row["Total II"] = metrics2.total || "-";
        }
        row["Average I"] = metrics1.average || "-";
        if (hasSemester2Data) {
          row["Average II"] = metrics2.average || "-";
        }
        row["Rank I"] = metrics1.rank || "-";
        if (hasSemester2Data) {
          row["Rank II"] = metrics2.rank || "-";
        }
        if (hasSemester2Data) {
          row["Status"] = metrics2.passFailStatus || "-";
        }

        return row;
      });

      if (format === "excel") {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Results_${formattedGrade}`);
        XLSX.writeFile(wb, `results_grade_${normalizedGrade}.xlsx`);
        toast.success("Exported as Excel successfully!");
      } else if (format === "pdf") {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Results for ${formattedGrade}`, 14, 20);
        autoTable(doc, {
          head: [Object.keys(data[0])],
          body: data.map((row) => Object.values(row)),
          startY: 30,
          theme: "grid",
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
          bodyStyles: { textColor: [0, 0, 0] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
        });
        doc.save(`results_grade_${normalizedGrade}.pdf`);
        toast.success("Exported as PDF successfully!");
      } else if (format === "image") {
        if (tableRef.current) {
          const table = tableRef.current as HTMLTableElement;
          const originalTableStyle = table.style.background;
          const headers = table.querySelectorAll("thead tr") as NodeListOf<HTMLTableRowElement>;
          const originalHeaderStyles: string[] = [];
          headers.forEach((header) => originalHeaderStyles.push(header.style.background));
          const summaryCard = tableRef.current.parentElement?.parentElement?.querySelector(".shadow-md") as HTMLDivElement | null;
          const originalSummaryStyle = summaryCard ? summaryCard.style.background : "";

          table.style.background = "#ffffff";
          headers.forEach((header, index) => {
            header.style.background = index === 0 ? "#3b82f6" : "#bfdbfe";
          });
          if (summaryCard) {
            summaryCard.style.background = "#dbeafe";
          }

          const canvas = await html2canvas(tableRef.current, { scale: 2 });
          const imgData = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = imgData;
          link.download = `results_grade_${normalizedGrade}.png`;
          link.click();

          table.style.background = originalTableStyle;
          headers.forEach((header, index) => {
            header.style.background = originalHeaderStyles[index];
          });
          if (summaryCard) {
            summaryCard.style.background = originalSummaryStyle;
          }

          toast.success("Exported as Image successfully!");
        } else {
          throw new Error("Table reference not found");
        }
      }

      setShowExportModal(false);
    } catch (error) {
      console.error("Error exporting results:", error);
      toast.error("Failed to export results.");
    }
  };

  // Handle approve or save action to store results in transcripts collection
  const handleApprove = async () => {
    try {
      const currentYear = new Date().getFullYear().toString();
      const transcriptData = students.map((student) => {
        const aggregatedResult1: StudentResult = {};
        const aggregatedResult2: StudentResult = {};
        subjects.forEach((subject) => {
          let totalScore1 = 0;
          let count1 = 0;
          let totalScore2 = 0;
          let count2 = 0;
          Object.values(student.results.semester1).forEach((result: StudentResult) => {
            if (result[subject]) {
              totalScore1 += result[subject];
              count1++;
            }
          });
          Object.values(student.results.semester2).forEach((result: StudentResult) => {
            if (result[subject]) {
              totalScore2 += result[subject];
              count2++;
            }
          });
          aggregatedResult1[subject] = count1 > 0 ? Number((totalScore1 / count1).toFixed(2)) : 0;
          aggregatedResult2[subject] = count2 > 0 ? Number((totalScore2 / count2).toFixed(2)) : 0;
        });
        const metrics1 = calculateResultMetrics(aggregatedResult1, aggregatedResult2, students, "semester1");
        const metrics2 = calculateResultMetrics(aggregatedResult1, aggregatedResult2, students, "semester2");

        return {
          stuId: student.stuId,
          fullName: student.fullName,
          section: student.section,
          results: {
            semester1: aggregatedResult1,
            semester2: hasSemester2Data ? aggregatedResult2 : {},
          },
          total: {
            semester1: metrics1.total,
            semester2: hasSemester2Data ? metrics2.total : 0,
          },
          average: {
            semester1: metrics1.average,
            semester2: hasSemester2Data ? metrics2.average : 0,
          },
          rank: {
            semester1: metrics1.rank,
            semester2: hasSemester2Data ? metrics2.rank : 0,
          },
          passFailStatus: hasSemester2Data ? metrics2.passFailStatus : null,
          approvedAt: new Date().toISOString(),
        };
      });

      const transcriptRef = doc(db, "transcripts", currentYear, `grade${normalizedGrade}`, `grade${normalizedGrade}`);
      await setDoc(transcriptRef, {
        grade: `grade${normalizedGrade}`,
        students: transcriptData,
        approved: "approved",
        approvedAt: new Date().toISOString(),
      });

      toast.success(`Results for ${formattedGrade} ${hasSemester2Data ? "approved" : "saved"} successfully!`);
      setShowDetailsModal(false);
    } catch (error: any) {
      console.error("Error approving results:", error);
      toast.error(`Failed to ${hasSemester2Data ? "approve" : "save"} results: ${error.message}`);
    }
  };

  // Handle details modal
  const openDetailsModal = (student: Student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  // Check if there are any results
  const hasResults = useMemo(() => {
    return students.some(
      (student) =>
        Object.keys(student.results.semester1).length > 0 || Object.keys(student.results.semester2).length > 0
    );
  }, [students]);

  // Handle loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </motion.div>
    );
  }

  // Handle empty state
  if (students.length === 0 || !hasResults) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
      >
        <h2 className="text-2xl font-semibold dark:text-gray-100" style={{ background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(139, 92, 246))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
          Result Generate for {formattedGrade}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {students.length === 0
            ? `No students available for ${formattedGrade}.`
            : `No completed assessments found for ${formattedGrade}.`}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-300 ${
          showDetailsModal || showExportModal ? "blur-md" : ""
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold dark:text-gray-100" style={{ background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(139, 92, 246))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            Result Generate for {formattedGrade}
          </h2>
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={handleApprove}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-all duration-200"
              aria-label={hasSemester2Data ? "Approve all results" : "Save all results"}
            >
              <CheckCircle className="w-5 h-5" />
              {hasSemester2Data ? "Approve" : "Save"}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all duration-200"
              aria-label="Export all results"
            >
              <Download className="w-5 h-5" />
              Export
            </motion.button>
          </div>
        </div>

        {/* Class Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 p-4 rounded-lg shadow-md"
          style={{ background: 'linear-gradient(to right, rgb(219, 234, 254), rgb(221, 214, 254))' }}
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
            Class Summary for {formattedGrade}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 dark:text-gray-300 font-semibold">Semester I</p>
              <p className="text-gray-600 dark:text-gray-300">
                Average Score: <span className="font-semibold">{classSummary.semester1.averageScore}</span> | 
                Pass Rate: <span className="font-semibold">{classSummary.semester1.passRate}%</span> | 
                Total Results: <span className="font-semibold">{classSummary.semester1.studentCount}</span>
              </p>
            </div>
            {hasSemester2Data && (
              <div>
                <p className="text-gray-600 dark:text-gray-300 font-semibold">Semester II</p>
                <p className="text-gray-600 dark:text-gray-300">
                  Average Score: <span className="font-semibold">{classSummary.semester2.averageScore}</span> | 
                  Pass Rate: <span className="font-semibold">{classSummary.semester2.passRate}%</span> | 
                  Total Results: <span className="font-semibold">{classSummary.semester2.studentCount}</span>
                </p>
                <p className="text-gray-600 dark:text-gray-300 font-semibold">Combined</p>
                <p className="text-gray-600 dark:text-gray-300">
                  Pass Rate: <span className="font-semibold">{classSummary.combined?.passRate}%</span> | 
                  Total Students: <span className="font-semibold">{classSummary.combined?.studentCount}</span>
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Results Table */}
        <div className="overflow-x-auto rounded-lg shadow-md">
          <table ref={tableRef} className="w-full border-collapse border-2" style={{ borderColor: '#2563eb' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, rgb(191, 219, 254), rgb(196, 181, 253))' }}>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                  Student Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                  Student ID
                </th>
                {subjects.map((subject) => (
                  <th
                    key={subject}
                    className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border-r-2"
                    style={{ borderColor: '#2563eb' }}
                    colSpan={subjectsWithSemester2.has(subject) ? 2 : 1}
                  >
                    {subject}
                  </th>
                ))}
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }} colSpan={hasSemester2Data ? 2 : 1}>
                  Total
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }} colSpan={hasSemester2Data ? 2 : 1}>
                  Average
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }} colSpan={hasSemester2Data ? 2 : 1}>
                  Rank
                </th>
                {hasSemester2Data && (
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                    Status
                  </th>
                )}
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Details
                </th>
              </tr>
              <tr style={{ background: '#bfdbfe' }}>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}></th>
                {subjects.map((subject) => (
                  <React.Fragment key={subject}>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}>
                      I
                    </th>
                    {subjectsWithSemester2.has(subject) && (
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}>
                        II
                      </th>
                    )}
                  </React.Fragment>
                ))}
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}>
                  I
                </th>
                {hasSemester2Data && (
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}>
                    II
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}>
                  I
                </th>
                {hasSemester2Data && (
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}>
                    II
                  </th>
                )}
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}>
                  I
                </th>
                {hasSemester2Data && (
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}>
                    II
                  </th>
                )}
                {hasSemester2Data && (
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 border-r-2" style={{ borderColor: '#2563eb' }}></th>
                )}
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const aggregatedResult1: StudentResult = {};
                const aggregatedResult2: StudentResult = {};
                subjects.forEach((subject) => {
                  let totalScore1 = 0;
                  let count1 = 0;
                  let totalScore2 = 0;
                  let count2 = 0;
                  Object.values(student.results.semester1).forEach((result: StudentResult) => {
                    if (result[subject]) {
                      totalScore1 += result[subject];
                      count1++;
                    }
                  });
                  Object.values(student.results.semester2).forEach((result: StudentResult) => {
                    if (result[subject]) {
                      totalScore2 += result[subject];
                      count2++;
                    }
                  });
                  aggregatedResult1[subject] = count1 > 0 ? Number((totalScore1 / count1).toFixed(2)) : 0;
                  aggregatedResult2[subject] = count2 > 0 ? Number((totalScore2 / count2).toFixed(2)) : 0;
                });
                const metrics1 = calculateResultMetrics(aggregatedResult1, aggregatedResult2, students, "semester1");
                const metrics2 = calculateResultMetrics(aggregatedResult1, aggregatedResult2, students, "semester2");
                return (
                  <motion.tr
                    key={student.stuId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="border-b-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                    style={{ borderColor: '#2563eb' }}
                  >
                    <td className="px-6 py-4 text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                      {student.fullName}
                    </td>
                    <td className="px-6 py-4 text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                      {student.stuId}
                    </td>
                    {subjects.map((subject) => (
                      <React.Fragment key={subject}>
                        <td className="px-6 py-4 text-center text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                          {aggregatedResult1[subject] || "-"}
                        </td>
                        {subjectsWithSemester2.has(subject) && (
                          <td className="px-6 py-4 text-center text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                            {aggregatedResult2[subject] || "-"}
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                    <td className="px-6 py-4 text-center text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                      {metrics1.total || "-"}
                    </td>
                    {hasSemester2Data && (
                      <td className="px-6 py-4 text-center text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                        {metrics2.total || "-"}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                      {metrics1.average || "-"}
                    </td>
                    {hasSemester2Data && (
                      <td className="px-6 py-4 text-center text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                        {metrics2.average || "-"}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                      {metrics1.rank || "-"}
                    </td>
                    {hasSemester2Data && (
                      <td className="px-6 py-4 text-center text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                        {metrics2.rank || "-"}
                      </td>
                    )}
                    {hasSemester2Data && (
                      <td className="px-6 py-4 text-center text-gray-800 dark:text-gray-200 border-r-2" style={{ borderColor: '#2563eb' }}>
                        {metrics2.passFailStatus || "-"}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <motion.button
                        whileHover={{ scale: 1.2 }}
                        onClick={() => openDetailsModal(student)}
                        className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                        aria-label={`View result details for ${student.fullName}`}
                      >
                        <Eye className="w-5 h-5" />
                      </motion.button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedStudent && (
          <FocusTrap>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-md flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-lg"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold dark:text-gray-100" style={{ background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(139, 92, 246))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                    Result History for {selectedStudent.fullName}
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label="Close modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-6">
                    {/* Semester 1 Results */}
                    <div>
                      <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Semester I</h4>
                      {Object.keys(selectedStudent.results.semester1).length > 0 ? (
                        Object.entries(selectedStudent.results.semester1)
                          .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                          .map(([date, result], index) => {
                            const { total, average, rank } = calculateResultMetrics(result, {}, students, "semester1");
                            return (
                              <motion.div
                                key={`sem1-${index}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="p-3 rounded-lg mb-2"
                                style={{ background: 'linear-gradient(to right, rgb(219, 234, 254), rgb(221, 214, 254))' }}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                                    {new Date(date).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-300 font-semibold">
                                    Rank: {rank}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(result).map(([subject, score]) => (
                                    <p key={subject} className="text-gray-600 dark:text-gray-300">
                                      {subject}: {score}
                                    </p>
                                  ))}
                                  <p className="text-gray-600 dark:text-gray-300">Total: {total}</p>
                                  <p className="text-gray-600 dark:text-gray-300">Average: {average}</p>
                                </div>
                              </motion.div>
                            );
                          })
                      ) : (
                        <p className="text-gray-600 dark:text-gray-300">No results available for Semester I.</p>
                      )}
                    </div>
                    {/* Semester 2 Results */}
                    {hasSemester2Data && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">Semester II</h4>
                        {Object.keys(selectedStudent.results.semester2).length > 0 ? (
                          Object.entries(selectedStudent.results.semester2)
                            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
                            .map(([date, result], index) => {
                              const { total, average, rank, passFailStatus } = calculateResultMetrics({}, result, students, "semester2");
                              return (
                                <motion.div
                                  key={`sem2-${index}`}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="p-3 rounded-lg mb-2"
                                  style={{ background: 'linear-gradient(to right, rgb(219, 234, 254), rgb(221, 214, 254))' }}
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                                      {new Date(date).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-300 font-semibold">
                                      Rank: {rank}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(result).map(([subject, score]) => (
                                      <p key={subject} className="text-gray-600 dark:text-gray-300">
                                        {subject}: {score}
                                      </p>
                                    ))}
                                    <p className="text-gray-600 dark:text-gray-300">Total: {total}</p>
                                    <p className="text-gray-600 dark:text-gray-300">Average: {average}</p>
                                    <p className="text-gray-600 dark:text-gray-300">Status: {passFailStatus || "-"}</p>
                                  </div>
                                </motion.div>
                              );
                            })
                        ) : (
                          <p className="text-gray-600 dark:text-gray-300">No results available for Semester II.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>

      {/* Export Format Selection Modal */}
      <AnimatePresence>
        {showExportModal && (
          <FocusTrap>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-500 bg-opacity-50 backdrop-blur-md flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-md"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold dark:text-gray-100" style={{ background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(139, 92, 246))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                    Select Export Format
                  </h3>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label="Close export modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex flex-col space-y-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleExport("excel")}
                    className="px-4 py-2 rounded-lg text-white bg-blue-500"
                    aria-label="Export as Excel"
                  >
                    Export as Excel (.xlsx)
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleExport("pdf")}
                    className="px-4 py-2 rounded-lg text-white bg-purple-500"
                    aria-label="Export as PDF"
                  >
                    Export as PDF (.pdf)
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleExport("image")}
                    className="px-4 py-2 rounded-lg text-white bg-green-500"
                    aria-label="Export as Image"
                  >
                    Export as Image (.png)
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>

      <style jsx>{`
        .max-h-96::-webkit-scrollbar {
          width: 8px;
        }
        .max-h-96::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }
        .max-h-96::-webkit-scrollbar-thumb {
          background: rgb(160, 174, 192);
          border-radius: 10px;
        }
        .max-h-96::-webkit-scrollbar-thumb:hover {
          background: rgb(113, 128, 150);
        }
        [data-theme='dark'] .border-2, [data-theme='dark'] .border-r-2, [data-theme='dark'] .border-b-2 {
          border-color: rgb(167, 139, 250) !important;
        }
        [data-theme='dark'] thead tr:first-child {
          background: linear-gradient(to right, rgb(30, 58, 138), rgb(107, 33, 168)) !important;
        }
        [data-theme='dark'] thead tr:nth-child(2) {
          background: rgb(30, 64, 175) !important;
        }
        [data-theme='dark'] .bg-white {
          background-color: rgb(31, 41, 55) !important;
        }
        [data-theme='dark'] .bg-gray-50 {
          background-color: rgb(55, 65, 81) !important;
        }
        [data-theme='dark'] .rounded-lg {
          background: linear-gradient(to right, rgb(30, 58, 138), rgb(107, 33, 168)) !important;
        }
      `}</style>
    </div>
  );
}