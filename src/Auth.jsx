import { useState } from "react";
import { signUp, signIn } from "./firebase/authService";
import { createUserDocument, getUserDocument } from "./firebase/userService";

const maroon = "#7a0019";

export default function Auth({ onLogin, onBackToRole }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      console.log("[Auth] Starting signup...");
      
      // Step 1: Create Firebase Auth user
      const signUpResult = await signUp(email, password, `${firstName} ${lastName}`);
      
      if (!signUpResult.success) {
        console.error("[Auth] Firebase signup failed:", signUpResult.error);
        setError("Signup failed: " + signUpResult.error);
        setLoading(false);
        return;
      }

      console.log("[Auth] Firebase user created, UID:", signUpResult.user.uid);

      // Step 2: Save user data to Firestore
      const userData = {
        uid: signUpResult.user.uid,
        email: email.trim(),
        fname: firstName.trim(),
        lname: lastName.trim(),
        displayName: `${firstName} ${lastName}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: "user",
        createdAt: new Date().toISOString(),
      };

      console.log("[Auth] Saving to Firestore:", userData);
      
      const dbResult = await createUserDocument(signUpResult.user.uid, userData);

      if (!dbResult.success) {
        console.error("[Auth] Firestore save failed:", dbResult.error);
        setError("Signup succeeded but database save failed: " + dbResult.error);
        setLoading(false);
        return;
      }

      console.log("[Auth] Success! User saved to database");

      // Save to localStorage
      localStorage.setItem("currentUser", JSON.stringify(userData));

      // Show success modal
      setSuccessMessage(`Welcome ${firstName}! Your account has been created successfully.`);
      setShowSuccessModal(true);
      
      setLoading(false);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
        onLogin();
      }, 2000);

    } catch (err) {
      console.error("[Auth] Unexpected error:", err.message);
      setError("Error: " + err.message);
      setLoading(false);
    }
  };

  return (
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
              }}>
                Sign up here
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup} style={styles.form}>
            <h2 style={styles.formTitle}>Create Account</h2>
            <p style={styles.formSubtitle}>Register to start submitting documents</p>

            {error && (
              <div style={styles.errorBox}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <div style={styles.twoColumnGroup}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  style={styles.input}
                />
              </div>
            </div>

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
                placeholder="Minimum 6 characters"
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={{...styles.submitButton, ...(loading ? styles.buttonDisabled : {})}}>
              {loading ? "Creating account..." : "Sign Up"}
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
              <p style={{ fontSize: 13, color: "#666", marginBottom: 0 }}>
                Redirecting to dashboard...
              </p>
            </div>
            <div style={styles.modalFooter}>
              <div style={styles.spinner}></div>
            </div>
          </div>
        </div>
      )}

      {/* LOADING SCREEN */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Logging in...</p>
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
        <p style={styles.footerText}>© 2026 BAC | Records Management System</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100vw",
    height: "100vh",
    background: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)",
    fontFamily: "Segoe UI",
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
    background: "#f9f9f9",
    borderTop: "1px solid #eee",
    textAlign: "center",
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
