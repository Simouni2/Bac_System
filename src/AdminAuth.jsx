import { useState } from "react";
import { signIn } from "./firebase/authService";
import { getUserDocument } from "./firebase/userService";
import { Lock } from "lucide-react";

const maroon = "#7a0019";

export default function AdminAuth({ onLogin, onBackToRole }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    // Firebase login
    signIn(email, password)
      .then(async (result) => {
        if (!result.success) {
          setError(result.error || "Login failed. Please check your credentials.");
          setLoading(false);
          return;
        }

        // Get user data from Firestore
        const userDoc = await getUserDocument(result.user.uid);
        
        if (!userDoc.success || !userDoc.data) {
          setError("User profile not found in database");
          setLoading(false);
          return;
        }

        // Check if user is an admin
        if (userDoc.data.role !== "admin") {
          setError("Access denied. You do not have admin privileges.");
          setLoading(false);
          return;
        }

        // Save to localStorage
        localStorage.setItem("currentUser", JSON.stringify(userDoc.data));

        setShowSuccessModal(true);
        
        // Redirect after 1 second
        setTimeout(() => {
          setShowSuccessModal(false);
          onLogin("admin");
        }, 1000);
      })
      .catch((err) => {
        console.error("[AdminAuth] Login error:", err);
        setError("Login failed: " + err.message);
        setLoading(false);
      });
  };

  return (
    <div style={styles.container}>
      <div style={styles.decorativeShapes}>
        <div style={styles.shape1}></div>
        <div style={styles.shape2}></div>
        <div style={styles.shape3}></div>
      </div>
      
      <div style={styles.formCard}>
        <div style={styles.header}>
          <div style={{...styles.adminIcon, display: "flex", alignItems: "center", justifyContent: "center"}}>
            <Lock size={40} color="white" strokeWidth={1.5} />
          </div>
          <h1 style={styles.title}>BAC Records System</h1>
          <p style={styles.subtitle}>Admin Access Portal</p>
        </div>

        <form onSubmit={handleAdminLogin} style={styles.form}>
          <h2 style={styles.formTitle}>Admin Login</h2>
          <p style={styles.formSubtitle}>Access the administration dashboard</p>

          {error && (
            <div style={styles.errorBox}>
              <strong>Error:</strong> {error}
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter admin email"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer"
            }}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </form>
      </div>

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Success!</h2>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalMessage}>Welcome to the Admin Dashboard</p>
              <div style={styles.spinner}></div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.footer}>
        <button
          onClick={onBackToRole}
          style={styles.backButton}
        >
          ← Back to Role Selection
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: `linear-gradient(135deg, ${maroon} 0%, #5a0014 100%)`,
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    position: "relative",
    overflow: "hidden"
  },
  decorativeShapes: {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    pointerEvents: "none"
  },
  shape1: {
    position: "absolute",
    width: "300px",
    height: "300px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "50%",
    top: "-100px",
    left: "-100px"
  },
  shape2: {
    position: "absolute",
    width: "200px",
    height: "200px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "50%",
    bottom: "50px",
    right: "-50px"
  },
  shape3: {
    position: "absolute",
    width: "150px",
    height: "150px",
    background: "rgba(255, 255, 255, 0.04)",
    borderRadius: "50%",
    top: "50%",
    right: "10%"
  },
  formCard: {
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    padding: "40px",
    width: "100%",
    maxWidth: "450px",
    position: "relative",
    zIndex: 10
  },
  header: {
    textAlign: "center",
    marginBottom: "30px"
  },
  adminIcon: {
    fontSize: "48px",
    marginBottom: "15px",
    display: "block"
  },
  title: {
    color: maroon,
    fontSize: "28px",
    margin: "0 0 10px 0",
    fontWeight: 700
  },
  subtitle: {
    color: "#666",
    fontSize: "14px",
    margin: 0
  },
  form: {
    display: "flex",
    flexDirection: "column"
  },
  formTitle: {
    color: maroon,
    fontSize: "22px",
    margin: "0 0 8px 0",
    fontWeight: 600
  },
  formSubtitle: {
    color: "#999",
    fontSize: "13px",
    margin: "0 0 20px 0"
  },
  inputGroup: {
    marginBottom: "18px"
  },
  label: {
    display: "block",
    marginBottom: "6px",
    color: "#333",
    fontSize: "14px",
    fontWeight: 500
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box",
    fontFamily: "inherit"
  },
  errorBox: {
    background: "#fee",
    border: `1px solid ${maroon}`,
    borderRadius: "6px",
    padding: "12px",
    marginBottom: "15px",
    color: maroon,
    fontSize: "13px"
  },
  submitBtn: {
    background: maroon,
    color: "white",
    border: "none",
    padding: "12px",
    fontSize: "14px",
    fontWeight: 600,
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "10px",
    transition: "background 0.3s"
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    animation: "slideIn 0.3s ease-out"
  },
  modal: {
    background: "white",
    borderRadius: "12px",
    padding: "40px",
    textAlign: "center",
    maxWidth: "400px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)"
  },
  modalHeader: {
    borderBottom: `2px solid ${maroon}`,
    paddingBottom: "15px",
    marginBottom: "20px"
  },
  modalTitle: {
    color: maroon,
    margin: 0,
    fontSize: "24px",
    fontWeight: 700
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  modalMessage: {
    color: "#333",
    fontSize: "16px",
    margin: "0 0 20px 0"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: `4px solid ${maroon}33`,
    borderTop: `4px solid ${maroon}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  },
  footer: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: "450px",
    padding: "0 20px",
    textAlign: "center"
  },
  backButton: {
    background: "none",
    border: "none",
    color: "white",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: 500,
    padding: "8px 0",
    width: "100%",
    transition: "opacity 0.2s",
    textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
  },

  loadingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },

  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },

  loadingSpinner: {
    width: 50,
    height: 50,
    border: "4px solid rgba(255, 255, 255, 0.3)",
    borderTop: "4px solid white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  loadingText: {
    color: "white",
    fontSize: 16,
    fontWeight: 600,
  },
};
