import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Calendar,
  Home,
  Building,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { firestore } from "../firebase"; // Import your firebase db
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

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
        // Fetch halls with workingDays field
        const hallsCollection = collection(firestore, "halls");
        const hallSnapshot = await getDocs(hallsCollection);
        const hallsList = hallSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          location: doc.data().location || "",
          // Get workingDays directly from hall document
          workingDays: parseInt(doc.data().workingDays || "0"),
          employees: doc.data().employees || [],
        }));

        // Fetch employees
        const employeesCollection = collection(firestore, "employees");
        const employeeSnapshot = await getDocs(employeesCollection);
        const employeesList = employeeSnapshot.docs.map((doc) => {
          const data = doc.data();

          // Get employee details
          const attendance = data.attendance || {};
          const dailyHalls = data.dailyHalls || {};

          // Calculate total working days per hall
          const hallWorkingDays = {};

          // Process attendance data to calculate days worked in each hall
          Object.keys(attendance).forEach((date) => {
            if (attendance[date] === true) {
              // This employee worked on this date
              // Check which hall they worked in
              const hallId = dailyHalls[date] || data.assignedHall || "";

              if (hallId) {
                hallWorkingDays[hallId] = (hallWorkingDays[hallId] || 0) + 1;
              }
            }
          });

          return {
            id: doc.id,
            name: data.name || "",
            contactNumber: data.contactNumber || "",
            email: data.email || "",
            assignedHall: data.assignedHall || "",
            defaultHallName: data.assignedHall
              ? hallsList.find((h) => h.id === data.assignedHall)?.name ||
                "לא ידוע"
              : "לא משויך",
            workingDays: data.workingDays || "0",
            attendance: attendance,
            dailyHalls: dailyHalls,
            hallWorkingDays: hallWorkingDays,
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

      // Update the workingDays field to "0"
      await updateDoc(hallRef, {
        workingDays: "0",
      });

      // Show confirmation
      alert("ימי העבודה אופסו בהצלחה!");

      // Update the local state
      setHalls(
        halls.map((hall) =>
          hall.id === hallId ? { ...hall, workingDays: 0 } : hall
        )
      );

      setResetting(false);
    } catch (error) {
      console.error("שגיאה באיפוס ימי עבודה:", error);
      alert("שגיאה באיפוס ימי עבודה. אנא נסה שנית.");
      setResetting(false);
    }
  };

  // Prepare hall-based statistics
  const hallStats = halls.map((hall) => {
    // Find employees who have worked in this hall
    const hallEmployees = employees.filter(
      (emp) => emp.hallWorkingDays[hall.id] && emp.hallWorkingDays[hall.id] > 0
    );

    return {
      id: hall.id,
      name: hall.name,
      location: hall.location,
      // Use workingDays directly from the hall document
      totalDaysWorked: hall.workingDays,
      employeeCount: hallEmployees.length,
      employees: hallEmployees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        contactNumber: emp.contactNumber,
        daysWorked: emp.hallWorkingDays[hall.id] || 0,
        isDefaultHall: emp.assignedHall === hall.id,
      })),
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

        {/* Overall Stats */}
        <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            סיכום כללי
          </h2>
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
                <h3 className="font-medium text-gray-800">{hall.name}</h3>
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
                <span className="text-blue-600 font-medium">
                  סה"כ ימים: {hall.totalDaysWorked}
                </span>
              </div>

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
