import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Home,
  Building,
  ArrowRight,
  RefreshCw,
  Clock,
  Download,
} from "lucide-react";
import { firestore } from "../firebase"; // Import your firebase db
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import * as XLSX from "xlsx"; // Import XLSX for Excel file generation

const HallWorkingDaysTracker = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  // Get current month and year
  const today = new Date();
  const currentMonth = today.toLocaleString("he-IL", { month: "long" });
  const currentYear = today.getFullYear();

  // Fetch employees and halls from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch halls with workingDays field and employees array
        const hallsCollection = collection(firestore, "halls");
        const hallSnapshot = await getDocs(hallsCollection);
        const hallsList = hallSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          location: doc.data().location || "",
          // Get workingDays directly from hall document
          workingDays: parseInt(doc.data().workingDays || "0"),
          // Get employees array directly from hall document
          employees: doc.data().employees || [],
          // Get employeeDates directly from hall document
          employeeDates: doc.data().employeeDates || {},
        }));

        console.log("Halls data with employees:", hallsList);

        // Fetch employees for additional data
        const employeesCollection = collection(firestore, "employees");
        const employeeSnapshot = await getDocs(employeesCollection);
        const employeesList = employeeSnapshot.docs.map((doc) => {
          const data = doc.data();

          // Get additional data for employee dates
          const attendance = data.attendance || {};
          const dailyHalls = data.dailyHalls || {};

          // Get all dates this employee worked
          const workDates = Object.keys(attendance).filter(
            (date) => attendance[date] === true
          );

          return {
            id: doc.id,
            name: data.name || "",
            contactNumber: data.contactNumber || "",
            email: data.email || "",
            assignedHall: data.assignedHall || "",
            workingDays: data.workingDays || "0",
            workDates: workDates,
            dailyHalls: dailyHalls,
          };
        });

        setEmployees(employeesList);
        setHalls(hallsList);
        setLoading(false);
      } catch (error) {
        console.error("שגיאה בטעינת נתונים: ", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [resetting]); // Re-fetch data after resetting

  // Function to reset the working days for a specific hall
  const resetHallWorkingDays = async (hallId) => {
    try {
      setResetting(true);
      // Get a reference to the hall document
      const hallRef = doc(firestore, "halls", hallId);

      // Update the workingDays field to "0", clear employees array and employeeDates
      await updateDoc(hallRef, {
        workingDays: "0",
        employees: [], // Reset employees array
        employeeDates: {}, // Reset employeeDates map
      });

      // Show confirmation
      alert("ימי העבודה אופסו בהצלחה!");

      // Update the local state
      setHalls(
        halls.map((hall) =>
          hall.id === hallId
            ? { ...hall, workingDays: 0, employees: [], employeeDates: {} }
            : hall
        )
      );

      setResetting(false);
    } catch (error) {
      console.error("שגיאה באיפוס ימי עבודה:", error);
      alert("שגיאה באיפוס ימי עבודה. אנא נסה שנית.");
      setResetting(false);
    }
  };

  // Get all unique working dates for a hall
  const getHallWorkDates = (hall) => {
    // Collect all dates from employeeDates
    let allDates = [];

    // If employeeDates exists for this hall
    if (hall.employeeDates) {
      // Go through each employee's dates
      Object.values(hall.employeeDates).forEach((dates) => {
        if (Array.isArray(dates)) {
          allDates = [...allDates, ...dates];
        }
      });
    }

    // If no employeeDates, try to infer from employees' attendance and dailyHalls
    if (allDates.length === 0) {
      hall.employees.forEach((hallEmployee) => {
        const employee = employees.find((e) => e.id === hallEmployee.id);

        if (employee) {
          // Find dates when this employee worked at this hall
          const workDatesInThisHall = employee.workDates.filter(
            (date) => employee.dailyHalls[date] === hall.id
          );

          allDates = [...allDates, ...workDatesInThisHall];
        }
      });
    }

    // Remove duplicates and sort
    return [...new Set(allDates)].sort();
  };

  // Format a date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("he-IL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Export hall data to Excel file
  const exportHallToExcel = (hall) => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create main sheet with hall info
    const mainData = [
      ["שם האולם", hall.name],
      ["מיקום", hall.location],
      ['סה"כ ימי עבודה', hall.totalDaysWorked],
      ["מספר עובדים", hall.employeeCount],
      [""], // Empty row for spacing
      ["נתוני עובדים"], // Header for employee data
      ["שם", "טלפון", "אולם קבוע", "ימי עבודה באולם"],
    ];

    // Add employee rows
    hall.employees
      .sort((a, b) => b.daysWorked - a.daysWorked)
      .forEach((employee) => {
        mainData.push([
          employee.name,
          employee.contactNumber || "",
          employee.isDefaultHall ? "כן" : "לא",
          employee.daysWorked,
        ]);
      });

    // Add empty row and dates section if there are dates
    if (hall.workDates && hall.workDates.length > 0) {
      mainData.push(
        [""], // Empty row
        ["תאריכי עבודה באולם"] // Header for dates
      );

      // Add dates in rows of 5
      for (let i = 0; i < hall.workDates.length; i += 5) {
        const dateRow = [];
        for (let j = 0; j < 5 && i + j < hall.workDates.length; j++) {
          dateRow.push(formatDate(hall.workDates[i + j]));
        }
        mainData.push(dateRow);
      }
    }

    // Convert to worksheet
    const ws = XLSX.utils.aoa_to_sheet(mainData);

    // Set column widths
    const colWidths = [{ wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
    ws["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "מידע אולם");

    // Create Excel file and initiate download
    const fileName = `אולם_${hall.name.replace(
      /\s+/g,
      "_"
    )}_${currentMonth}_${currentYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export all halls to a single Excel file
  const exportAllHallsToExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create summary sheet
    const summaryData = [
      ["סיכום אולמות"],
      [""],
      ["שם האולם", "מיקום", "ימי עבודה", "מספר עובדים"],
    ];

    // Add hall summary rows
    hallStats.forEach((hall) => {
      summaryData.push([
        hall.name,
        hall.location,
        hall.totalDaysWorked,
        hall.employeeCount,
      ]);
    });

    // Convert to worksheet
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, summaryWs, "סיכום אולמות");

    // Create a worksheet for each hall
    hallStats.forEach((hall) => {
      const hallData = [
        [`פרטי אולם: ${hall.name}`],
        [""],
        ["שם", "טלפון", "אולם קבוע", "ימי עבודה באולם"],
      ];

      // Add employee rows
      hall.employees
        .sort((a, b) => b.daysWorked - a.daysWorked)
        .forEach((employee) => {
          hallData.push([
            employee.name,
            employee.contactNumber || "",
            employee.isDefaultHall ? "כן" : "לא",
            employee.daysWorked,
          ]);
        });

      // Add dates section
      if (hall.workDates && hall.workDates.length > 0) {
        hallData.push([""], ["תאריכי עבודה:"]);

        // Format dates
        const formattedDates = hall.workDates.map((date) => formatDate(date));

        // Add dates in rows of 5
        for (let i = 0; i < formattedDates.length; i += 5) {
          const dateRow = [];
          for (let j = 0; j < 5 && i + j < formattedDates.length; j++) {
            dateRow.push(formattedDates[i + j]);
          }
          hallData.push(dateRow);
        }
      }

      // Convert to worksheet
      const hallWs = XLSX.utils.aoa_to_sheet(hallData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, hallWs, hall.name.slice(0, 31)); // Excel sheet names have a 31 char limit
    });

    // Create Excel file and initiate download
    XLSX.writeFile(wb, `סיכום_אולמות_${currentMonth}_${currentYear}.xlsx`);
  };

  // Prepare hall-based statistics directly from hall.employees array
  const hallStats = halls.map((hall) => {
    // Get all working dates for this hall
    const workDates = getHallWorkDates(hall);

    return {
      id: hall.id,
      name: hall.name,
      location: hall.location,
      totalDaysWorked: hall.workingDays,
      employeeCount: hall.employees.length,
      workDates: workDates,
      dateCount: workDates.length,
      employees: hall.employees.map((emp) => {
        // Find additional employee data
        const employeeData = employees.find((e) => e.id === emp.id) || {};

        return {
          id: emp.id,
          name: emp.name,
          daysWorked: emp.daysWorked || 0,
          contactNumber: employeeData.contactNumber || "",
          isDefaultHall: employeeData.assignedHall === hall.id,
        };
      }),
    };
  });

  // Calculate total statistics
  const totalEmployees = employees.length;
  // Calculate total working days from halls collection
  const totalWorkingDays = halls.reduce(
    (total, hall) => total + hall.workingDays,
    0
  );

  const goBackToDashboard = () => {
    navigate("/home");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-xl text-gray-600">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <button
            onClick={goBackToDashboard}
            className="ml-4 p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
          >
            <ArrowRight size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Building className="ml-2" />
            מעקב ימי עבודה באולמות
          </h1>
        </div>

        <p className="text-gray-600 mt-1 mb-6 border-b border-gray-200 pb-4">
          מעקב אחר עובדים באולמות השונים וכמה ימים הם עבדו במהלך {currentMonth}{" "}
          {currentYear}
        </p>

        {/* Overall Stats with export button */}
        <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-800">סיכום כללי</h2>
            <button
              onClick={exportAllHallsToExcel}
              className="flex items-center p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              title="ייצוא כל האולמות לאקסל"
            >
              <Download size={16} className="ml-1" />
              ייצוא כל האולמות לאקסל
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-blue-600">סה"כ עובדים</p>
              <p className="text-xl font-bold text-blue-800 flex items-center">
                <Users size={18} className="ml-1" />
                {totalEmployees}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">סה"כ אולמות</p>
              <p className="text-xl font-bold text-blue-800 flex items-center">
                <Building size={18} className="ml-1" />
                {halls.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">סה"כ ימי עבודה</p>
              <p className="text-xl font-bold text-blue-800 flex items-center">
                <Calendar size={18} className="ml-1" />
                {totalWorkingDays}
              </p>
            </div>
          </div>
        </div>

        {/* Hall Summary Stats */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <Home className="ml-2" /> סיכום אולמות
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hallStats.map((hall) => (
              <div
                key={hall.id}
                className="bg-white p-4 rounded-lg shadow-sm border-r-4 border-blue-500"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-800">{hall.name}</h3>
                  <button
                    onClick={() => exportHallToExcel(hall)}
                    className="p-1 rounded-full bg-green-100 hover:bg-green-200 text-green-700"
                    title={`ייצוא ${hall.name} לאקסל`}
                  >
                    <Download size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">עובדים</p>
                    <p className="text-lg font-semibold text-gray-800 flex items-center">
                      <Users size={16} className="ml-1 text-blue-600" />
                      {hall.employeeCount}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">סה"כ ימי עבודה</p>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `האם אתה בטוח שברצונך לאפס את ימי העבודה באולם ${hall.name}?`
                            )
                          ) {
                            resetHallWorkingDays(hall.id);
                          }
                        }}
                        className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                        title="איפוס ימי עבודה"
                        disabled={resetting}
                      >
                        <RefreshCw
                          size={12}
                          className={resetting ? "animate-spin" : ""}
                        />
                      </button>
                    </div>
                    <p className="text-lg font-semibold text-gray-800 flex items-center">
                      <Calendar size={16} className="ml-1 text-green-600" />
                      {hall.totalDaysWorked}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee List by Hall */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-lg text-gray-800">
              ימי עבודה של עובדים לפי אולם
            </h2>
          </div>

          {hallStats.map((hall) => (
            <div key={hall.id} className="mb-4 border-b border-gray-100 pb-4">
              <div className="px-4 py-2 bg-gray-50 flex justify-between items-center">
                <h3 className="font-medium text-gray-800 flex items-center">
                  <Home size={16} className="ml-2" />
                  {hall.name} ({hall.employeeCount} עובדים)
                </h3>
                <div className="flex items-center">
                  <span className="text-blue-600 font-medium ml-4">
                    סה"כ ימים: {hall.totalDaysWorked}
                  </span>
                  {/* Download button for this hall */}
                  <button
                    onClick={() => exportHallToExcel(hall)}
                    className="p-2 rounded-full bg-green-200 hover:bg-green-300 text-green-700 ml-2"
                    title={`ייצוא ${hall.name} לאקסל`}
                  >
                    <Download size={16} />
                  </button>
                  {/* Reset button for this hall's employee list */}
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `האם אתה בטוח שברצונך לאפס את רשימת העובדים באולם ${hall.name}?`
                        )
                      ) {
                        resetHallWorkingDays(hall.id);
                      }
                    }}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 mr-2"
                    title="איפוס רשימת עובדים"
                    disabled={resetting}
                  >
                    <RefreshCw
                      size={16}
                      className={resetting ? "animate-spin" : ""}
                    />
                  </button>
                </div>
              </div>

              {/* Display Working Dates for this hall - KEEPING THIS SECTION */}
              {hall.workDates.length > 0 && (
                <div className="px-4 py-2 bg-blue-50">
                  <p className="text-sm text-blue-700 font-medium mb-1">
                    תאריכי עבודה באולם זה:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {hall.workDates.map((date) => (
                      <span
                        key={date}
                        className="text-xs bg-white text-blue-700 px-2 py-1 rounded-full border border-blue-200"
                      >
                        {formatDate(date)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hall.employees.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          עובד
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          אולם קבוע
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ימי עבודה באולם זה
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {hall.employees
                        .sort((a, b) => b.daysWorked - a.daysWorked) // Sort by most days worked
                        .map((employee) => (
                          <tr key={employee.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-gray-900">
                                {employee.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {employee.contactNumber}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  employee.isDefaultHall
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {employee.isDefaultHall ? "כן" : "לא"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <Calendar
                                  size={16}
                                  className="ml-2 text-gray-500"
                                />
                                <span className="font-medium text-gray-900">
                                  {employee.daysWorked} ימים
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  אין עובדים שעבדו באולם זה עדיין.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HallWorkingDaysTracker;
