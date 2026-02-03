import { useState, useEffect } from "react";
import RoleSelector from "./RoleSelector";
import Auth from "./Auth";
import AdminAuth from "./AdminAuth";
import AdminDashboard from "./AdminDashboard";
import UserDashboard from "./UserDashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [dashboardView, setDashboardView] = useState("user");
  const [loading, setLoading] = useState(true);

  // Initialize files from localStorage
  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem("bacFiles");
    const initial = saved ? JSON.parse(saved) : [];
    console.log("📂 Loaded from localStorage:", initial.length, "files");
    return initial;
  });

  // Initialize app state from localStorage on mount
  useEffect(() => {
    // Check if user is already logged in from localStorage
    const user = localStorage.getItem("currentUser");
    const userRole = localStorage.getItem("userRole");
    
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
        setSelectedRole(userData.role || userRole || "user");
        setIsLoggedIn(true);
      } catch (err) {
        console.error("Error restoring user data:", err);
        localStorage.removeItem("currentUser");
      }
    }
    setLoading(false);
  }, []);

  // Persist files to localStorage whenever they change
  // NOTE: Only store metadata (not fileData) to avoid quota exceeded errors
  useEffect(() => {
    try {
      const filesMetadata = files.map(file => {
        // Create a copy without the large fileData
        const { fileData, ...metadata } = file;
        return metadata;
      });
      localStorage.setItem("bacFiles", JSON.stringify(filesMetadata));
      console.log("💾 Saved to localStorage:", filesMetadata.length, "files (metadata only)");
    } catch (err) {
      console.warn("⚠️ localStorage quota exceeded:", err.message);
      console.log("Files are still in memory and will persist for this session");
    }
  }, [files]);

  // Persist user role to localStorage
  useEffect(() => {
    if (currentUser?.role) {
      localStorage.setItem("userRole", currentUser.role);
    }
  }, [currentUser]);

  // Auto logout when user closes or leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear user data when closing/leaving page (but keep files)
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userRole");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleBackToRole = () => {
    setSelectedRole(null);
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  const handleAdminLogin = (role) => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    setCurrentUser(user);
    setSelectedRole(role);
    setIsLoggedIn(true);
  };

  const handleUserLogin = () => {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    console.log("👤 [handleUserLogin] User from localStorage:", user);
    setCurrentUser(user);
    setSelectedRole("user");
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    // Clear user data but keep files
    localStorage.removeItem("currentUser");
    localStorage.removeItem("userRole");
    setCurrentUser(null);
    setIsLoggedIn(false);
    setSelectedRole(null);
  };

  if (loading) {
    console.log("📋 [App] Rendering: Loading screen");
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: 18 }}>Loading...</div>;
  }

  // Not logged in and no role selected - show role selector
  if (!isLoggedIn && !selectedRole) {
    console.log("📋 [App] Rendering: RoleSelector (not logged in, no role)");
    return <RoleSelector onSelectRole={handleRoleSelect} />;
  }

  // Role selected but not logged in
  if (!isLoggedIn && selectedRole === "admin") {
    console.log("📋 [App] Rendering: AdminAuth (admin role selected, not logged in)");
    return <AdminAuth onLogin={handleAdminLogin} onBackToRole={handleBackToRole} />;
  }

  if (!isLoggedIn && selectedRole === "user") {
    console.log("📋 [App] Rendering: Auth (user role selected, not logged in)");
    return <Auth onLogin={handleUserLogin} onBackToRole={handleBackToRole} />;
  }

  // Must be logged in to reach here
  if (!isLoggedIn || !currentUser) {
    console.error("❌ [App] State error: isLoggedIn=%o, currentUser=%o", isLoggedIn, currentUser);
    return <RoleSelector onSelectRole={handleRoleSelect} />;
  }

  // Admin dashboard view
  if (currentUser.role === "admin") {
    console.log("📋 [App] Rendering: AdminDashboard (user is admin)");
    return (
      <>
        <div style={styles.topBar}>
          <strong style={styles.title}>BAC Records System - Admin</strong>
          <div style={styles.userSection}>
            <span style={styles.userGreeting}>Welcome, {currentUser.firstName || "Admin"}</span>
            <button
              onClick={handleLogout}
              style={{
                ...styles.switchBtn,
                background: "#7b0e0e",
                color: "white"
              }}
            >
              Logout
            </button>
          </div>
        </div>
        <AdminDashboard files={files} setFiles={setFiles} />
      </>
    );
  }

  // User dashboard view
  console.log("📋 [App] Rendering: UserDashboard (user is regular user)");
  return (
    <>
      <div style={styles.topBar}>
        <strong style={styles.title}>BAC Records System</strong>
        <div style={styles.userSection}>
          <span style={styles.userGreeting}>Welcome, {currentUser.firstName || "User"}</span>
          <button
            onClick={handleLogout}
            style={{
              ...styles.switchBtn,
              background: "#7b0e0e",
              color: "white"
            }}
          >
            Logout
          </button>
        </div>
      </div>
      <UserDashboard files={files} setFiles={setFiles} />
    </>
  );
}

const styles = {
  topBar: {
    background: "#7a0019",
    color: "white",
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  title: {
    fontSize: 18,
    fontWeight: 600
  },

  userSection: {
    display: "flex",
    alignItems: "center",
    gap: 20
  },

  userGreeting: {
    fontSize: 14,
    fontWeight: 500,
    color: "white"
  },

  switch: {
    display: "flex",
    gap: 12
  },

  switchBtn: {
    padding: 0,
    marginRight: 24,
    borderRadius: 0,
    border: "none",
    background: "transparent",
    color: "white",
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 14,
    transition: "all 0.2s ease",
    borderBottom: "2px solid transparent"
  },

  activeBtn: {
    background: "transparent",
    color: "white",
    borderBottom: "2px solid white"
  }
};
