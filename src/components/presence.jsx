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
} from "lucide-react";
import { firestore } from "../firebase"; // Import your firebase db
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

const StaffPresenceTracker = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState("");

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
        }));
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
      const employeeRef = doc(firestore, "employees", id);

      // Update the dailyHalls field in Firestore with the selected hall for this day
      await updateDoc(employeeRef, {
        [`dailyHalls.${currentDate}`]: hallId,
      });

      // Update local state
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

  // Export employee list to CSV
  const exportToCSV = () => {
    // Create CSV header
    let csvContent =
      "שם,מספר טלפון,דוא״ל,אולם משויך,ימי עבודה,עובד היום,יש רכב,ימים עם רכב\n";

    // Add each employee as a row
    employees.forEach((employee) => {
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

  // Count working employees
  const workingCount = employees.filter((emp) => emp.workingToday).length;

  // Count employees with cars
  const carsCount = employees.filter(
    (emp) => emp.hasCarToday && emp.workingToday
  ).length;

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
                {employees.length - workingCount}
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
                  {employees.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        לא נמצאו עובדים לפי הקריטריונים שנבחרו.
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
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
