// Dashboard.js
import React from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import {
  Users,
  Building,
  DollarSign,
  Calendar,
  Map,
  BarChart,
  LogOut,
  UserPlus,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  // Navigate to different pages
  const goToHallManagement = () => {
    navigate("/hallmanagment");
  };

  const goToEmployeeManagement = () => {
    navigate("/employeemanagement");
  };

  const goToPresenceManagement = () => {
    navigate("/presence");
  };

  const goToSalaryPage = () => {
    navigate("/salary");
  };

  const goToEmployeeHallTracker = () => {
    navigate("/employeeHallTracker");
  };

  const goToHallSummaryPage = () => {
    navigate("/hallprice");
  };

  const goToSignupPage = () => {
    navigate("/signup");
  };

  const handleLogout = () => {
    // Clear user from localStorage
    localStorage.removeItem("user");
    // Redirect to login page
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 pb-2 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-blue-600">ניהול אולמות</h1>
            <p className="text-gray-600 mt-1">
              בחר חלק לניהול פעילויות האולם שלך
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <span>התנתק</span>
            <LogOut size={18} className="ml-3" />
          </button>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <NavigationCard
            icon={<Building size={24} />}
            title="אולמות"
            description="ניהול אולמות ומתקנים"
            color="bg-blue-500"
            onClick={goToHallManagement}
          />

          <NavigationCard
            icon={<Users size={24} />}
            title="עובדים"
            description="ניהול פרטי צוות ושיבוצים"
            color="bg-green-500"
            onClick={goToEmployeeManagement}
          />

          <NavigationCard
            icon={<DollarSign size={24} />}
            title="משכורות"
            description="מעקב וניהול משכורות עובדים"
            color="bg-purple-500"
            onClick={goToSalaryPage}
          />

          <NavigationCard
            icon={<Map size={24} />}
            title="מעקב עובדים"
            description="צפייה בשיבוצי עובדים והיסטוריה"
            color="bg-amber-500"
            onClick={goToEmployeeHallTracker}
          />

          <NavigationCard
            icon={<Calendar size={24} />}
            title="נוכחות"
            description="רישום ומעקב נוכחות יומית"
            color="bg-red-500"
            onClick={goToPresenceManagement}
          />

          <NavigationCard
            icon={<BarChart size={24} />}
            title="סיכום אולמות"
            description="ניתוח שימוש באולמות ומדדי ביצועים"
            color="bg-indigo-500"
            onClick={goToHallSummaryPage}
          />

          <NavigationCard
            icon={<UserPlus size={24} />}
            title="הרשמת משתמשים"
            description="הוספת משתמשים חדשים למערכת"
            color="bg-teal-500"
            onClick={goToSignupPage}
          />
        </div>
      </div>
    </div>
  );
};

// Navigation Card Component
const NavigationCard = ({ icon, title, description, color, onClick }) => {
  return (
    <div
      className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer text-right"
      onClick={onClick}
    >
      <div className="flex items-center mb-3 justify-end">
        <h3 className="text-lg font-semibold text-gray-800 ml-10">{title}</h3>
        <div className={`${color} p-3 rounded-full text-white`}>{icon}</div>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
};

export default Dashboard;
