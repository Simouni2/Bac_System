const maroon = "#7a0019";

export default function RoleSelector({ onSelectRole }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>BAC Records System</h1>
          <p style={styles.subtitle}>Bids and Awards Committee</p>
        </div>

        <div style={styles.content}>
          <h2 style={styles.heading}>Select Your Role</h2>
          <p style={styles.description}>Choose whether you are an administrator or a user</p>

          <div style={styles.buttonContainer}>
            <button
              onClick={() => onSelectRole("user")}
              style={styles.roleButton}
              onMouseEnter={(e) => (e.target.style.background = "#5a0014")}
              onMouseLeave={(e) => (e.target.style.background = maroon)}
            >
              <div style={styles.roleIcon}>👤</div>
              <h3 style={styles.roleTitle}>User</h3>
              <p style={styles.roleDescription}>Submit and track documents</p>
            </button>

            <button
              onClick={() => onSelectRole("admin")}
              style={styles.roleButton}
              onMouseEnter={(e) => (e.target.style.background = "#5a0014")}
              onMouseLeave={(e) => (e.target.style.background = maroon)}
            >
              <div style={styles.roleIcon}>⚙️</div>
              <h3 style={styles.roleTitle}>Administrator</h3>
              <p style={styles.roleDescription}>Manage and approve documents</p>
            </button>
          </div>
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
    minHeight: "100vh",
    background: `linear-gradient(135deg, ${maroon} 0%, #5a0014 100%)`,
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  card: {
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    padding: "40px",
    width: "100%",
    maxWidth: "550px"
  },
  header: {
    textAlign: "center",
    marginBottom: "40px"
  },
  title: {
    color: maroon,
    fontSize: "32px",
    margin: "0 0 10px 0",
    fontWeight: 700
  },
  subtitle: {
    color: "#666",
    fontSize: "15px",
    margin: 0
  },
  content: {
    textAlign: "center"
  },
  heading: {
    color: maroon,
    fontSize: "24px",
    margin: "0 0 10px 0",
    fontWeight: 600
  },
  description: {
    color: "#999",
    fontSize: "14px",
    margin: "0 0 30px 0"
  },
  buttonContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px"
  },
  roleButton: {
    background: maroon,
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "30px 20px",
    cursor: "pointer",
    transition: "background 0.3s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    fontSize: "14px"
  },
  roleIcon: {
    fontSize: "48px",
    marginBottom: "10px"
  },
  roleTitle: {
    margin: "0 0 8px 0",
    fontSize: "18px",
    fontWeight: 600
  },
  roleDescription: {
    margin: 0,
    fontSize: "12px",
    opacity: 0.9
  }
};
