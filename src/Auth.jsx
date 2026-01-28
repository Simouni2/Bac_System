import { useState } from "react";

const maroon = "#7a0019";

export default function Auth({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    const users = JSON.parse(localStorage.getItem("bacUsers") || "[]");
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }));

    setLoading(false);
    onLogin();
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

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

    const users = JSON.parse(localStorage.getItem("bacUsers") || "[]");
    
    if (users.find(u => u.email === email)) {
      setError("Email already registered");
      setLoading(false);
      return;
    }

    const newUser = { firstName, lastName, email, password };
    users.push(newUser);
    localStorage.setItem("bacUsers", JSON.stringify(users));
    localStorage.setItem("currentUser", JSON.stringify({
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    }));

    setLoading(false);
    onLogin();
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

  footerText: {
    margin: 0,
    fontSize: 12,
    color: "#999",
  },
};
