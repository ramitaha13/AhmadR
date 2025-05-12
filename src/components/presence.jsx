// StaffPresenceTracker.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle,
  XCircle,
  Check,
  X,
  Download,
  ArrowRight,
  Car,
  Search,
} from "lucide-react";
import { firestore } from "../firebase"; // Import your firebase db
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  getDoc,
} from "firebase/firestore";

const StaffPresenceTracker = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  // Format date for display
  const formattedDate = new Date(currentDate).toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Fetch employees and halls from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch halls for filtering
        const hallsCollection = collection(firestore, "halls");
        const hallSnapshot = await getDocs(hallsCollection);
        const hallsList = hallSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          location: doc.data().location || "",
          workingDays: doc.data().workingDays || "0", // Add workingDays for halls
          employees: doc.data().employees || [],
          // Track dates for each employee
          employeeDates: doc.data().employeeDates || {},
        }));

        // Debug: Log current hall data
        console.log(
          "Current halls data:",
          hallSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );

        setHalls(hallsList);

        // Build query for employees
        let employeesQuery;
        const employeesCollection = collection(firestore, "employees");

        if (selectedHall) {
          employeesQuery = query(
            employeesCollection,
            where("assignedHall", "==", selectedHall)
          );
        } else {
          employeesQuery = employeesCollection;
        }

        // Fetch employees
        const employeeSnapshot = await getDocs(employeesQuery);
        const employeesList = employeeSnapshot.docs.map((doc) => {
          const data = doc.data();
          // Check if there's attendance data for current date
          const attendance = data.attendance || {};
          const isWorkingToday = attendance[currentDate] === true;

          // Get daily hall assignment if exists
          const dailyHalls = data.dailyHalls || {};
          const todayHall = dailyHalls[currentDate] || "";

          // Check if employee has car for today
          const carData = data.carAvailability || {};
          const hasCarToday = carData[currentDate] === true;

          // Count how many days the employee has a car
          const carDaysCount = Object.values(carData).filter(
            (value) => value === true
          ).length;

          return {
            id: doc.id,
            name: data.name,
            contactNumber: data.contactNumber,
            email: data.email,
            assignedHall: data.assignedHall,
            todayHall: todayHall,
            workingDays: data.workingDays || "0",
            workingToday: isWorkingToday,
            hasCarToday: hasCarToday,
            carDaysCount: carDaysCount,
          };
        });

        setEmployees(employeesList);
        setLoading(false);
      } catch (error) {
        console.error("שגיאה בטעינת נתונים: ", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [currentDate, selectedHall]);

  // Apply name filter to employees list
  useEffect(() => {
    if (nameFilter.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter((employee) =>
        employee.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [nameFilter, employees]);

  // Toggle employee working status and increment/decrement workingDays
  const toggleWorkingStatus = async (id) => {
    try {
      const employeeToUpdate = employees.find((emp) => emp.id === id);
      const employeeRef = doc(firestore, "employees", id);

      // Create a new status based on the current one
      const newWorkingStatus = !employeeToUpdate.workingToday;

      if (newWorkingStatus) {
        // Employee is now marked as working, so increment workingDays
        await updateDoc(employeeRef, {
          [`attendance.${currentDate}`]: true,
          // Convert to number, increment by 1, then convert back to string
          workingDays: String(
            parseInt(employeeToUpdate.workingDays || "0") + 1
          ),
        });

        // Update local state
        setEmployees(
          employees.map((employee) =>
            employee.id === id
              ? {
                  ...employee,
                  workingToday: true,
                  workingDays: String(
                    parseInt(employee.workingDays || "0") + 1
                  ),
                }
              : employee
          )
        );
      } else {
        // Employee is now marked as not working, so decrement workingDays
        // Make sure workingDays doesn't go below 0
        const currentWorkingDays = parseInt(
          employeeToUpdate.workingDays || "0"
        );
        const newWorkingDays = Math.max(0, currentWorkingDays - 1); // Ensure it doesn't go below 0

        await updateDoc(employeeRef, {
          [`attendance.${currentDate}`]: false,
          workingDays: String(newWorkingDays),
        });

        // If the employee was assigned to a hall today and now is not working,
        // also decrement the hall's workingDays and update the employee's daysWorked
        if (employeeToUpdate.todayHall) {
          const hallRef = doc(firestore, "halls", employeeToUpdate.todayHall);
          const hallDoc = await getDoc(hallRef);

          if (hallDoc.exists()) {
            const hallData = hallDoc.data();
            const hallWorkingDays = parseInt(hallData.workingDays || "0");
            const newHallWorkingDays = Math.max(0, hallWorkingDays - 1);

            // Handle employees array - FIXED: Don't remove the employee, just decrement their daysWorked
            let updatedEmployees = hallData.employees || [];

            // Find employee in the hall's employee array
            const empIndex = updatedEmployees.findIndex((emp) => emp.id === id);

            if (empIndex !== -1) {
              // Employee exists, just decrement their daysWorked (ensure it doesn't go below 0)
              const currentDaysWorked =
                updatedEmployees[empIndex].daysWorked || 0;
              updatedEmployees[empIndex].daysWorked = Math.max(
                0,
                currentDaysWorked - 1
              );

              // If daysWorked becomes 0, then we can remove the employee
              if (updatedEmployees[empIndex].daysWorked === 0) {
                updatedEmployees = updatedEmployees.filter(
                  (emp) => emp.id !== id
                );
              }
            }

            // Handle employeeDates map
            let employeeDates = hallData.employeeDates || {};

            // Remove this date from employee's dates if it exists
            if (employeeDates[id]) {
              const dateArray = employeeDates[id] || [];
              const updatedDates = dateArray.filter(
                (date) => date !== currentDate
              );

              if (updatedDates.length > 0) {
                employeeDates[id] = updatedDates;
              } else {
                // If no dates left, remove employee entry
                delete employeeDates[id];
              }
            }

            await updateDoc(hallRef, {
              workingDays: String(newHallWorkingDays),
              employees: updatedEmployees,
              employeeDates: employeeDates,
            });

            // Also update local halls state
            setHalls(
              halls.map((hall) =>
                hall.id === employeeToUpdate.todayHall
                  ? {
                      ...hall,
                      workingDays: String(newHallWorkingDays),
                      employees: updatedEmployees,
                      employeeDates: employeeDates,
                    }
                  : hall
              )
            );
          }

          // Also remove the hall assignment for today
          await updateDoc(employeeRef, {
            [`dailyHalls.${currentDate}`]: "",
          });
        }

        // Update local state
        setEmployees(
          employees.map((employee) =>
            employee.id === id
              ? {
                  ...employee,
                  workingToday: false,
                  workingDays: String(
                    Math.max(0, parseInt(employee.workingDays || "0") - 1)
                  ),
                  todayHall: "", // Clear the hall assignment for today
                }
              : employee
          )
        );
      }

      // Show quick feedback (optional)
      const actionText = newWorkingStatus ? "סומן כנוכח" : "סומן כלא נוכח";
      console.log(
        `${employeeToUpdate.name} ${actionText} לתאריך ${formattedDate}`
      );
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס עובד: ", error);
      alert("שגיאה בעדכון סטטוס עובד. אנא נסה שנית.");
    }
  };

  // Toggle car availability for an employee on the current day
  const toggleCarAvailability = async (id) => {
    try {
      const employeeToUpdate = employees.find((emp) => emp.id === id);
      const employeeRef = doc(firestore, "employees", id);

      // Create a new status based on the current one
      const newCarStatus = !employeeToUpdate.hasCarToday;

      // Update in Firestore
      await updateDoc(employeeRef, {
        [`carAvailability.${currentDate}`]: newCarStatus,
      });

      // Calculate the new carDaysCount
      let newCarDaysCount = employeeToUpdate.carDaysCount;
      if (newCarStatus) {
        newCarDaysCount += 1;
      } else {
        newCarDaysCount = Math.max(0, newCarDaysCount - 1);
      }

      // Update local state
      setEmployees(
        employees.map((employee) =>
          employee.id === id
            ? {
                ...employee,
                hasCarToday: newCarStatus,
                carDaysCount: newCarDaysCount,
              }
            : employee
        )
      );

      // Show quick feedback (optional)
      const actionText = newCarStatus ? "יש רכב היום" : "אין רכב היום";
      console.log(
        `${employeeToUpdate.name} ${actionText} לתאריך ${formattedDate}`
      );
    } catch (error) {
      console.error("שגיאה בעדכון זמינות רכב: ", error);
      alert("שגיאה בעדכון זמינות רכב. אנא נסה שנית.");
    }
  };

  // Update employee's hall for the selected day
  const updateEmployeeHall = async (id, hallId) => {
    try {
      // Only proceed if the employee is working today
      const employeeToUpdate = employees.find((emp) => emp.id === id);
      if (!employeeToUpdate.workingToday) {
        console.log("לא ניתן לשייך אולם לעובד שאינו עובד היום");
        return;
      }

      const employeeRef = doc(firestore, "employees", id);
      const previousHallId = employeeToUpdate.todayHall;

      // 1. Update the employee's dailyHalls in Firestore
      await updateDoc(employeeRef, {
        [`dailyHalls.${currentDate}`]: hallId,
      });

      // 2. If there was a previous hall assigned for today, handle that first
      if (previousHallId && previousHallId !== hallId) {
        // Get reference to previous hall document
        const previousHallRef = doc(firestore, "halls", previousHallId);
        const previousHallDoc = await getDoc(previousHallRef);

        if (previousHallDoc.exists()) {
          // Get current data
          const hallData = previousHallDoc.data();
          const currentWorkingDays = parseInt(hallData.workingDays || "0");
          const newWorkingDays = Math.max(0, currentWorkingDays - 1);

          // Handle employees array - FIXED: Don't completely remove employee, just decrement daysWorked
          let updatedEmployees = hallData.employees || [];

          // Find employee in the previous hall's employee array
          const empIndex = updatedEmployees.findIndex((emp) => emp.id === id);

          if (empIndex !== -1) {
            // Employee exists, just decrement their daysWorked (ensure it doesn't go below 0)
            const currentDaysWorked =
              updatedEmployees[empIndex].daysWorked || 0;
            updatedEmployees[empIndex].daysWorked = Math.max(
              0,
              currentDaysWorked - 1
            );

            // If daysWorked becomes 0, then we can remove the employee
            if (updatedEmployees[empIndex].daysWorked === 0) {
              updatedEmployees = updatedEmployees.filter(
                (emp) => emp.id !== id
              );
            }
          }

          // Handle employeeDates map
          let employeeDates = hallData.employeeDates || {};

          // Remove this date from employee's dates if it exists
          if (employeeDates[id]) {
            const dateArray = employeeDates[id] || [];
            const updatedDates = dateArray.filter(
              (date) => date !== currentDate
            );

            if (updatedDates.length > 0) {
              employeeDates[id] = updatedDates;
            } else {
              // If no dates left, remove employee entry
              delete employeeDates[id];
            }
          }

          // Update previous hall document
          await updateDoc(previousHallRef, {
            workingDays: String(newWorkingDays),
            employees: updatedEmployees,
            employeeDates: employeeDates,
          });

          // Update local state for previous hall
          setHalls(
            halls.map((hall) =>
              hall.id === previousHallId
                ? {
                    ...hall,
                    workingDays: String(newWorkingDays),
                    employees: updatedEmployees,
                    employeeDates: employeeDates,
                  }
                : hall
            )
          );
        }
      }

      // 3. If assigning to a new hall, update that hall
      if (hallId) {
        // Get reference to new hall document
        const hallRef = doc(firestore, "halls", hallId);
        const hallDoc = await getDoc(hallRef);

        if (hallDoc.exists()) {
          // Get current data
          const hallData = hallDoc.data();
          const currentWorkingDays = parseInt(hallData.workingDays || "0");
          const newWorkingDays = currentWorkingDays + 1;

          // Handle employees array
          let updatedEmployees = hallData.employees || [];

          // Check if employee already exists in the array
          const existingEmpIndex = updatedEmployees.findIndex(
            (emp) => emp.id === id
          );

          if (existingEmpIndex !== -1) {
            // Update existing employee entry
            updatedEmployees[existingEmpIndex].daysWorked =
              (updatedEmployees[existingEmpIndex].daysWorked || 0) + 1;
          } else {
            // Add new employee entry
            updatedEmployees.push({
              id: id,
              name: employeeToUpdate.name,
              daysWorked: 1,
            });
          }

          // Handle employeeDates map to track dates for each employee
          let employeeDates = hallData.employeeDates || {};

          // Get or initialize the array of dates for this employee
          let employeeDateArray = employeeDates[id] || [];

          // Add the current date if it's not already in the array
          if (!employeeDateArray.includes(currentDate)) {
            employeeDateArray.push(currentDate);
          }

          // Update the dates map
          employeeDates[id] = employeeDateArray;

          // Update new hall document
          await updateDoc(hallRef, {
            workingDays: String(newWorkingDays),
            employees: updatedEmployees,
            employeeDates: employeeDates,
          });

          // Debug log
          console.log("Updated hall data:", {
            id: hallId,
            workingDays: String(newWorkingDays),
            employees: updatedEmployees,
            employeeDates: employeeDates,
          });

          // Update local state for new hall
          setHalls(
            halls.map((hall) =>
              hall.id === hallId
                ? {
                    ...hall,
                    workingDays: String(newWorkingDays),
                    employees: updatedEmployees,
                    employeeDates: employeeDates,
                  }
                : hall
            )
          );
        }
      }

      // 4. Update local employees state
      setEmployees(
        employees.map((employee) =>
          employee.id === id
            ? {
                ...employee,
                todayHall: hallId,
              }
            : employee
        )
      );

      console.log(`שיוך אולם עודכן לתאריך ${currentDate}`);
    } catch (error) {
      console.error("שגיאה בעדכון שיוך אולם: ", error);
      alert("שגיאה בעדכון שיוך אולם. אנא נסה שנית.");
    }
  };

  // Change date handler
  const handleDateChange = (e) => {
    setCurrentDate(e.target.value);
  };

  // Handle hall filter change
  const handleHallChange = (e) => {
    setSelectedHall(e.target.value);
  };

  // Clear name filter
  const clearNameFilter = () => {
    setNameFilter("");
  };

  // Export employee list to CSV
  const exportToCSV = () => {
    // Create CSV header
    let csvContent =
      "שם,מספר טלפון,דוא״ל,אולם משויך,ימי עבודה,עובד היום,יש רכב,ימים עם רכב\n";

    // Add each employee as a row
    filteredEmployees.forEach((employee) => {
      const hallName = employee.todayHall
        ? halls.find((hall) => hall.id === employee.todayHall)?.name || "-"
        : "-";

      const row = [
        employee.name,
        employee.contactNumber || "-",
        employee.email || "-",
        hallName,
        employee.workingDays || "0",
        employee.workingToday ? "כן" : "לא",
        employee.hasCarToday ? "כן" : "לא",
        employee.carDaysCount || "0",
      ]
        .map((field) => `"${field}"`)
        .join(",");

      csvContent += row + "\n";
    });

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `עובדים_${currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Count working employees among filtered employees
  const workingCount = filteredEmployees.filter(
    (emp) => emp.workingToday
  ).length;

  // Count employees with cars among filtered employees
  const carsCount = filteredEmployees.filter(
    (emp) => emp.hasCarToday && emp.workingToday
  ).length;

  // Count employees per hall for the current date - only counting filtered employees
  const hallEmployeeCounts = halls.map((hall) => {
    const count = filteredEmployees.filter(
      (emp) => emp.workingToday && emp.todayHall === hall.id
    ).length;
    return {
      id: hall.id,
      name: hall.name,
      count: count,
    };
  });

  const goBackToDashboard = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <button
            onClick={goBackToDashboard}
            className="ml-4 p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
          >
            <ArrowRight size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">מעקב נוכחות צוות</h1>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <Users size={24} className="text-blue-600 ml-2" />
              <h2 className="text-xl font-bold">ניהול צוות</h2>
            </div>

            <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תאריך
                </label>
                <input
                  type="date"
                  value={currentDate}
                  onChange={handleDateChange}
                  className="p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סינון לפי אולם
                </label>
                <select
                  value={selectedHall}
                  onChange={handleHallChange}
                  className="p-2 border border-gray-300 rounded-md w-full"
                >
                  <option value="">כל האולמות</option>
                  {halls.map((hall) => (
                    <option key={hall.id} value={hall.id}>
                      {hall.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="self-end">
                <button
                  onClick={exportToCSV}
                  className="flex items-center p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  title="ייצוא ל-CSV"
                >
                  <Download size={18} className="ml-1" />
                  ייצוא
                </button>
              </div>
            </div>
          </div>

          {/* Name Filter */}
          <div className="mb-6">
            <div className="flex items-center">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="block w-full p-2 pr-10 border border-gray-300 rounded-md text-right"
                  placeholder="סנן לפי שם עובד"
                />
              </div>
              {nameFilter && (
                <button
                  onClick={clearNameFilter}
                  className="mr-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm"
                >
                  נקה סינון
                </button>
              )}
            </div>
          </div>

          {/* Current Date Display */}
          <div className="mb-6 text-center">
            <h3 className="text-lg font-medium text-gray-700">
              נוכחות ליום {formattedDate}
            </h3>
          </div>

          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2 text-gray-700 flex items-center">
                <CheckCircle size={18} className="ml-2 text-green-600" />
                עובדים היום
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {workingCount}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2 text-gray-700 flex items-center">
                <XCircle size={18} className="ml-2 text-red-600" />
                לא עובדים היום
              </h3>
              <p className="text-3xl font-bold text-red-600">
                {filteredEmployees.length - workingCount}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2 text-gray-700 flex items-center">
                <Car size={18} className="ml-2 text-blue-600" />
                עובדים עם רכב
              </h3>
              <p className="text-3xl font-bold text-blue-600">{carsCount}</p>
            </div>
          </div>

          {/* Hall Distribution Stats */}
          {hallEmployeeCounts.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium mb-2 text-gray-700">
                התפלגות עובדים לפי אולמות
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hallEmployeeCounts.map((hall) => (
                  <div key={hall.id} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-1 text-gray-700">
                      {hall.name}
                    </h4>
                    <p className="text-2xl font-bold text-blue-600">
                      {hall.count} עובדים
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">טוען רשימת עובדים...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      שם
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      טלפון
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      דוא״ל
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      אולם משויך להיום
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ימי עבודה
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ימים עם רכב
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סטטוס
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      יש רכב
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        {nameFilter
                          ? "לא נמצאו עובדים התואמים לחיפוש."
                          : "לא נמצאו עובדים לפי הקריטריונים שנבחרו."}
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.contactNumber || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.email || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <select
                            value={employee.todayHall || ""}
                            onChange={(e) =>
                              updateEmployeeHall(employee.id, e.target.value)
                            }
                            className="p-2 border border-gray-300 rounded-md w-full"
                            disabled={!employee.workingToday}
                          >
                            <option value="">-- בחר אולם --</option>
                            {halls.map((hall) => (
                              <option key={hall.id} value={hall.id}>
                                {hall.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.workingDays || "0"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                          <Car size={16} className="ml-2 text-blue-600" />
                          {employee.carDaysCount || "0"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <button
                            onClick={() => toggleWorkingStatus(employee.id)}
                            className={`p-2 rounded-full ${
                              employee.workingToday
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                            title={
                              employee.workingToday
                                ? "עובד היום"
                                : "לא עובד היום"
                            }
                          >
                            {employee.workingToday ? (
                              <Check size={18} />
                            ) : (
                              <X size={18} />
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <button
                            onClick={() => toggleCarAvailability(employee.id)}
                            className={`p-2 rounded-full ${
                              employee.hasCarToday
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title={
                              employee.hasCarToday
                                ? "יש רכב היום"
                                : "אין רכב היום"
                            }
                            disabled={!employee.workingToday}
                          >
                            <Car size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffPresenceTracker;
