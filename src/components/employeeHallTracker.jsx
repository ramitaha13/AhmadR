// EmployeeHallTracker.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ArrowRight,
  Download,
  Calendar,
  Building,
  Search,
  CheckCircle,
  Car,
} from "lucide-react";
import { firestore } from "../firebase"; // Import your firebase db
import { collection, getDocs, doc } from "firebase/firestore";

const EmployeeHallTracker = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [assignmentData, setAssignmentData] = useState([]);
  const [workingDaysCount, setWorkingDaysCount] = useState(0);
  const [carDaysCount, setCarDaysCount] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0], // First day of current month
    endDate: new Date().toISOString().split("T")[0], // Today
  });

  // Fetch employees and halls from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch halls
        const hallsCollection = collection(firestore, "halls");
        const hallSnapshot = await getDocs(hallsCollection);
        const hallsList = hallSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setHalls(hallsList);

        // Fetch employees
        const employeesCollection = collection(firestore, "employees");
        const employeeSnapshot = await getDocs(employeesCollection);
        const employeesList = employeeSnapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            name: data.name,
            contactNumber: data.contactNumber,
            email: data.email,
            assignedHall: data.assignedHall,
            attendance: data.attendance || {},
            dailyHalls: data.dailyHalls || {},
            carAvailability: data.carAvailability || {}, // Add car availability
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
  }, []);

  // Generate assignment data whenever selectedEmployee or dateRange changes
  useEffect(() => {
    if (selectedEmployee && employees.length > 0) {
      generateAssignmentData();
    }
  }, [selectedEmployee, dateRange]);

  // Generate data for the selected employee within the date range
  const generateAssignmentData = () => {
    const employee = employees.find((emp) => emp.id === selectedEmployee);

    if (!employee) {
      setAssignmentData([]);
      setWorkingDaysCount(0);
      setCarDaysCount(0);
      return;
    }

    const { attendance, dailyHalls, assignedHall, carAvailability } = employee;
    const { startDate, endDate } = dateRange;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const assignmentArray = [];
    let workingCount = 0;
    let carCount = 0;

    // Loop through each day in the date range
    for (
      let day = new Date(start);
      day <= end;
      day.setDate(day.getDate() + 1)
    ) {
      const dateString = day.toISOString().split("T")[0]; // Format: YYYY-MM-DD
      const wasWorking = attendance[dateString] === true;

      // Only include days the employee was working
      if (wasWorking) {
        workingCount++;

        // Determine which hall the employee worked in that day
        const hallId = dailyHalls[dateString] || assignedHall || null;

        // Find hall name
        const hallName = hallId
          ? halls.find((hall) => hall.id === hallId)?.name || "אולם לא ידוע"
          : "-";

        // Get day of week
        const dayOfWeek = new Date(dateString).toLocaleDateString("he-IL", {
          weekday: "long",
        });

        // Check if employee had a car that day
        const hadCar = carAvailability[dateString] === true;
        if (hadCar) {
          carCount++;
        }

        assignmentArray.push({
          date: dateString,
          dayOfWeek: dayOfWeek,
          working: true, // Always true since we're only showing working days
          hallId: hallId,
          hallName: hallName,
          hadCar: hadCar,
        });
      }
    }

    setWorkingDaysCount(workingCount);
    setCarDaysCount(carCount);
    setAssignmentData(assignmentArray);
  };

  // Handle employee selection change
  const handleEmployeeChange = (e) => {
    setSelectedEmployee(e.target.value);
  };

  // Handle date range changes
  const handleDateChange = (e, field) => {
    setDateRange({
      ...dateRange,
      [field]: e.target.value,
    });
  };

  // Format date for display (dd/mm/yyyy)
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  // Export assignment data to CSV
  const exportToCSV = () => {
    if (assignmentData.length === 0) return;

    const employee = employees.find((emp) => emp.id === selectedEmployee);

    // Create CSV header
    let csvContent = "תאריך,יום,אולם,יש רכב\n";

    // Add each day as a row
    assignmentData.forEach((day) => {
      const row = [
        formatDate(day.date),
        day.dayOfWeek,
        day.hallName,
        day.hadCar ? "כן" : "לא",
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
    link.setAttribute("download", `${employee.name}_ימי_עבודה.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          <h1 className="text-2xl font-bold text-gray-800">
            מעקב ימי עבודה של עובדים
          </h1>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex items-center mb-6">
            <Building size={24} className="text-blue-600 ml-2" />
            <h2 className="text-xl font-bold">היסטוריית שיבוץ אולמות</h2>
          </div>

          {/* Controls */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                בחר עובד
              </label>
              <select
                value={selectedEmployee}
                onChange={handleEmployeeChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">-- בחר עובד --</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך התחלה
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange(e, "startDate")}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך סיום
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange(e, "endDate")}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Summary Stats */}
          {selectedEmployee && assignmentData.length > 0 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle size={24} className="text-green-600 ml-2" />
                  <h3 className="text-lg font-medium">
                    סך הכל ימי עבודה:{" "}
                    <span className="font-bold">{workingDaysCount}</span>
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {employees.find((emp) => emp.id === selectedEmployee)?.name}{" "}
                  עבד/ה {workingDaysCount} ימים בטווח התאריכים שנבחר.
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Car size={24} className="text-blue-600 ml-2" />
                  <h3 className="text-lg font-medium">
                    ימים עם רכב:{" "}
                    <span className="font-bold">{carDaysCount}</span>
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  מתוך {workingDaysCount} ימי עבודה, היה רכב ב-{carDaysCount}{" "}
                  ימים.
                </p>
              </div>
            </div>
          )}

          {/* Export button */}
          {selectedEmployee && assignmentData.length > 0 && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={exportToCSV}
                className="flex items-center p-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                title="ייצא ל-CSV"
              >
                <Download size={18} className="ml-1" />
                ייצוא
              </button>
            </div>
          )}

          {/* Assignment Table */}
          {loading ? (
            <div className="text-center py-4">טוען נתונים...</div>
          ) : selectedEmployee ? (
            assignmentData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        תאריך
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        יום
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        אולם משובץ
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        יש רכב
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignmentData.map((day, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <Calendar
                              size={16}
                              className="ml-2 text-gray-500"
                            />
                            {formatDate(day.date)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {day.dayOfWeek}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Building
                              size={16}
                              className="ml-2 text-gray-500"
                            />
                            {day.hallName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div
                            className={`inline-flex items-center justify-center p-1 rounded-full ${
                              day.hadCar
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            <Car size={18} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Search size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  לא נמצאו ימי עבודה בטווח התאריכים שנבחר.
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  נסה לבחור טווח תאריכים אחר או עובד אחר.
                </p>
              </div>
            )
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                אנא בחר עובד כדי לצפות בימי העבודה שלו.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeHallTracker;
