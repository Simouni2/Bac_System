import { useState, useEffect } from "react";
import Auth from "./Auth";
import AdminDashboard from "./AdminDashboard";
import UserDashboard from "./UserDashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem("currentUser");
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
  });
  const [view, setView] = useState("user");

  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem("bacFiles");
    return saved ? JSON.parse(saved) : [
      {
        name: "FIN_BIR2307_2025-01-15_v1.0.pdf",
        department: "Finance",
        type: "BIR",
        date: "Jan 15, 2025",
        status: "Pending"
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("bacFiles", JSON.stringify(files));
  }, [files]);

  const handleLogin = () => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <>
{/* TOP BAR */}
<div style={styles.topBar}>
  <strong style={styles.title}>BAC Records System</strong>

  <div style={styles.userSection}>
    <span style={styles.userGreeting}>Welcome, {currentUser?.firstName || "User"}</span>
    <div style={styles.switch}>
      <button
        onClick={() => setView("user")}
        style={{
          ...styles.switchBtn,
          ...(view === "user" ? styles.activeBtn : {})
        }}
      >
        User
      </button>

      <button
        onClick={() => setView("admin")}
        style={{
          ...styles.switchBtn,
          ...(view === "admin" ? styles.activeBtn : {})
        }}
      >
        Admin
      </button>

      <button
        onClick={handleLogout}
        style={{
          ...styles.switchBtn,
          background: "#a60000",
          color: "white"
        }}
      >
        Logout
      </button>
    </div>
  </div>
</div>

      {view === "admin" ? (
        <AdminDashboard files={files} setFiles={setFiles} />
      ) : (
        <UserDashboard files={files} setFiles={setFiles} />
      )}
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
