import { useState } from "react";
import { signIn } from "./firebase/authService";
import { getUserDocument, saveAccountRequest } from "./firebase/userService";

const maroon = "#7a0019";

export default function Auth({ onLogin, onBackToRole }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterDepartment, setRequesterDepartment] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isRequestingAccount, setIsRequestingAccount] = useState(false);
  const [accountRequests, setAccountRequests] = useState(() => {
    const saved = localStorage.getItem("accountRequests");
    return saved ? JSON.parse(saved) : [];
  });

  const handleLogin = (e) => {
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

        // Save to localStorage
        localStorage.setItem("currentUser", JSON.stringify(userDoc.data));
        
        setLoading(false);
        onLogin();
      })
      .catch((err) => {
        console.error("[Auth] Login error:", err);
        setError("Login failed: " + err.message);
        setLoading(false);
      });
  };

  const handleRequestAccount = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!requesterName.trim() || !requesterDepartment.trim() || !requesterEmail.trim()) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail.trim())) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      console.log("[Auth] Submitting account request...");
      
      // Create account request
      const accountRequest = {
        name: requesterName.trim(),
        department: requesterDepartment.trim(),
        email: requesterEmail.trim(),
        status: "pending"
      };

      console.log("[Auth] Account request created:", accountRequest);

      // Step 1: Save to Firestore
      const firestoreResult = await saveAccountRequest(accountRequest);
      
      if (!firestoreResult.success) {
        console.error("[Auth] Firestore save failed:", firestoreResult.error);
        setError("Request submission failed: " + firestoreResult.error);
        setLoading(false);
        return;
      }

      console.log("[Auth] Request saved to Firestore with ID:", firestoreResult.id);

      // Step 2: Save to localStorage for backup
      const updatedRequests = [...accountRequests, { ...accountRequest, id: firestoreResult.id, requestedAt: new Date().toISOString() }];
      localStorage.setItem("accountRequests", JSON.stringify(updatedRequests));
      setAccountRequests(updatedRequests);

      // Show success modal
      setSuccessMessage(` Success!\n\nCheck your email at: ${requesterEmail}\n\nWe will send your account details once the admin approves your request.`);
      setShowSuccessModal(true);
      
      setLoading(false);
      
      // Reset form
      setRequesterName("");
      setRequesterDepartment("");
      setRequesterEmail("");

    } catch (err) {
      console.error("[Auth] Unexpected error:", err.message);
      setError("Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.container}>
      <div style={styles.formCard}>
        <div style={styles.header}>
          <h1 style={styles.title}>BAC Records System</h1>
          <p style={styles.subtitle}>Bids and Awards Committee</p>
        </div>

        {!isSignup ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <h2 style={styles.formTitle}>Login</h2>
            <p style={styles.formSubtitle}>Access your account to manage documents</p>

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
                placeholder="your.email@institution.edu"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={{...styles.submitButton, ...(loading ? styles.buttonDisabled : {})}}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <div style={styles.divider}>or</div>

            <p style={styles.toggleText}>
              Don't have an account?{" "}
              <span style={styles.toggleLink} onClick={() => {
                setIsSignup(true);
                setError("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setFirstName("");
                setLastName("");
                setRequesterName("");
                setRequesterDepartment("");
                setRequesterEmail("");
              }}>
                Request account here
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRequestAccount} style={styles.form}>
            <h2 style={styles.formTitle}>Request Account</h2>
            <p style={styles.formSubtitle}>Submit your information for admin approval</p>

            {error && (
              <div style={styles.errorBox}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>Name</label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Full name"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Department</label>
              <input
                type="text"
                value={requesterDepartment}
                onChange={(e) => setRequesterDepartment(e.target.value)}
                placeholder="e.g., Finance, HR, Registrar"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                placeholder="your.email@gmail.com"
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={{...styles.submitButton, ...(loading ? styles.buttonDisabled : {})}}>
              {loading ? "Submitting request..." : "Request Account"}
            </button>

            <div style={styles.divider}>or</div>

            <p style={styles.toggleText}>
              Already have an account?{" "}
              <span style={styles.toggleLink} onClick={() => {
                setIsSignup(false);
                setError("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setFirstName("");
                setLastName("");
                setRequesterName("");
                setRequesterDepartment("");
                setRequesterEmail("");
              }}>
                Login here
              </span>
            </p>
          </form>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>© 2026 BAC | Records Management System</p>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, color: "white" }}> Success!</h2>
            </div>
            <div style={styles.modalBody}>
              <p style={{ fontSize: 16, color: "#333", marginBottom: 20 }}>
                {successMessage}
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button
                style={styles.submitButton}
                onClick={() => {
                  setShowSuccessModal(false);
                  setIsSignup(false);
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>{isSignup ? "Submitting request..." : "Logging in..."}</p>
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
        {/* <p style={styles.footerText}>© 2026 BAC | Records Management System</p> */}
      </div>
    </div>
    </>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100vw",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)",
    fontFamily: "Segoe UI",
    padding: "20px",
    boxSizing: "border-box",
  },

  formCard: {
    background: "white",
    borderRadius: 12,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
    width: "100%",
    maxWidth: 450,
    overflow: "hidden",
  },

  header: {
    background: maroon,
    color: "white",
    padding: 30,
    textAlign: "center",
  },

  title: {
    margin: "0 0 5px 0",
    fontSize: 32,
    fontWeight: 700,
  },

  subtitle: {
    margin: 0,
    fontSize: 14,
    opacity: 0.9,
  },

  form: {
    padding: 30,
  },

  formTitle: {
    margin: "0 0 8px 0",
    fontSize: 24,
    fontWeight: 600,
    color: "#333",
  },

  formSubtitle: {
    margin: "0 0 20px 0",
    fontSize: 14,
    color: "#666",
  },

  inputGroup: {
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
  },

  twoColumnGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
    marginBottom: 6,
  },

  input: {
    padding: 11,
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "Segoe UI",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
    width: "100%",
  },

  errorBox: {
    background: "#fdecea",
    color: "#a60000",
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    borderLeft: "4px solid #a60000",
    fontSize: 13,
    fontWeight: 500,
  },

  submitButton: {
    width: "100%",
    padding: 12,
    background: maroon,
    color: "white",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s",
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },

  divider: {
    textAlign: "center",
    margin: "20px 0",
    fontSize: 13,
    color: "#999",
    position: "relative",
  },

  toggleText: {
    textAlign: "center",
    fontSize: 13,
    color: "#666",
    margin: 0,
  },

  toggleLink: {
    color: maroon,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    borderBottom: `1px solid ${maroon}`,
    transition: "opacity 0.2s",
  },

  footer: {
    padding: 15,
    background: "transparent",
    textAlign: "center",
    marginTop: 20,
    width: "100%",
    maxWidth: 450,
  },

  backButton: {
    background: "none",
    border: "none",
    color: maroon,
    fontSize: "13px",
    cursor: "pointer",
    marginBottom: "10px",
    fontWeight: 500,
    display: "block",
    width: "100%",
    padding: "8px 0",
    transition: "opacity 0.2s",
  },

  footerText: {
    margin: 0,
    fontSize: 12,
    color: "#999",
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
  },

  modalContent: {
    background: "white",
    borderRadius: 12,
    boxShadow: "0 10px 50px rgba(0, 0, 0, 0.2)",
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    animation: "slideIn 0.3s ease-out",
  },

  modalHeader: {
    background: maroon,
    color: "white",
    padding: 25,
    textAlign: "center",
  },

  modalBody: {
    padding: 30,
    textAlign: "center",
  },

  modalFooter: {
    padding: 20,
    textAlign: "center",
    background: "#f9f9f9",
  },

  spinner: {
    display: "inline-block",
    width: 20,
    height: 20,
    border: "3px solid #f0f0f0",
    borderTop: `3px solid ${maroon}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
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
    border: "4px solid rgba(122, 0, 25, 0.2)",
    borderTop: "4px solid #7a0019",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  loadingText: {
    color: "white",
    fontSize: 16,
    fontWeight: 600,
  },
};
