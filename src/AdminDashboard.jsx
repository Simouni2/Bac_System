import { useState, useMemo } from "react";

const maroon = "#7a0019";

export default function BACDashboard({ files, setFiles }) {
  const [view, setView] = useState("dashboard"); // dashboard | archive
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);

  /* ===== UPDATE STATUS ===== */
  const updateStatus = (index, status) => {
    const updated = [...files];
    updated[index] = { ...updated[index], status }; 
    setFiles(updated); 
  };

  /* ===== VIEW FILE ===== */
  const handleViewFile = (file) => {
    setSelectedFile(file);
    setShowFileModal(true);
  };

  const downloadFile = (file) => {
    if (file.fileData) {
      const link = document.createElement("a");
      link.href = file.fileData;
      link.download = file.name;
      link.click();
    }
  };

  /* ===== DECLINE FILE ===== */
  const handleDeclineClick = (index) => {
    setSelectedFileIndex(index);
    setShowDeclineModal(true);
  };

  const submitDecline = () => {
    if (!declineReason.trim()) {
      alert("Please enter a reason for declining.");
      return;
    }
    const updated = [...files];
    updated[selectedFileIndex] = { 
      ...updated[selectedFileIndex], 
      status: "Declined",
      declineReason: declineReason 
    };
    setFiles(updated);
    setShowDeclineModal(false);
    setDeclineReason("");
  };

  /* ===== SUMMARY COUNTS ===== */
  const totalFiles = files.length;
  const pendingCount = files.filter(f => f.status === "Pending").length;
  const approvedCount = files.filter(f => f.status === "Approved").length;
  const archivedCount = files.filter(f => f.status === "Archived").length;
  const newSubmissionCount = files.filter(
  (f) => f.status === "Pending"
).length;


  /* ===== FILTERED FILES ===== */
  const filteredFiles = useMemo(() => {
    return files.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase()) &&
      (departmentFilter ? f.department === departmentFilter : true) &&
      (statusFilter ? f.status === statusFilter : true)
    );
  }, [files, search, departmentFilter, statusFilter]);

  const activeFiles = filteredFiles.filter(f => f.status !== "Archived");
  const archivedFiles = filteredFiles.filter(f => f.status === "Archived");

  const departments = [...new Set(files.map(f => f.department))];

  return (
    <div style={styles.layout}>
      {/* ===== SIDEBAR ===== */}
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}>
          <h1 style={styles.logo}>BAC</h1>
          <p style={styles.subLogo}>Records System</p>
        </div>

        <nav>
<div
  style={view === "dashboard" ? styles.navActive : styles.nav}
  onClick={() => setView("dashboard")}
>
  <span>Dashboard</span>

  {newSubmissionCount > 0 && (
    <span style={styles.badge}>
      {newSubmissionCount}
    </span>
  )}
</div>


          <div
            style={view === "archive" ? styles.navActive : styles.nav}
            onClick={() => setView("archive")}
          >
            Archives
          </div>
        </nav>
      </aside>

      {/* ===== MAIN ===== */}
      <main style={styles.main}>
        {/* HEADER */}
        <div style={styles.header}>
          <h2>
            {view === "archive"
              ? "Archived Documents"
              : "File Compilation Dashboard"}
          </h2>
          <span style={styles.schoolYear}>School Year 2025–2026</span>
        </div>

        {/* SUMMARY CARDS (Dashboard only) */}
        {view === "dashboard" && (
          <div style={styles.cards}>
            <div style={styles.card}><h4>Total Files</h4><p>{totalFiles}</p></div>
            <div style={styles.card}><h4>Pending</h4><p>{pendingCount}</p></div>
            <div style={styles.card}><h4>Approved</h4><p>{approvedCount}</p></div>
            <div style={styles.card}><h4>Archived</h4><p>{archivedCount}</p></div>
          </div>
        )}

        {/* FILTER BAR */}
        <div style={styles.filterBar}>
          <input
            style={styles.input}
            placeholder="Search file name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={styles.input}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d, i) => (
              <option key={i} value={d}>{d}</option>
            ))}
          </select>

          <select
            style={styles.input}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
            <option value="Archived">Archived</option>
          </select>

          <button
            style={styles.button}
            onClick={() => {
              setSearch("");
              setDepartmentFilter("");
              setStatusFilter("");
            }}
          >
            Reset
          </button>
        </div>

        {/* TABLE */}
        <div style={styles.tableBox}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Department</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {(view === "dashboard" ? activeFiles : archivedFiles).length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: 20 }}>
                    No records found
                  </td>
                </tr>
              ) : (
                (view === "dashboard" ? activeFiles : archivedFiles).map((f, i) => {
                  const realIndex = files.indexOf(f);

                  return (
                    <tr key={i}>
                      <td style={{ cursor: "pointer", color: "#0066cc" }} onClick={() => handleViewFile(f)}>{f.name}</td>
                      <td>{f.department}</td>
                      <td>{f.type}</td>
                      <td>{f.date}</td>
                      <td style={{ textAlign: "center", paddingTop: "16px", paddingBottom: "16px" }}>
                        <span
                          style={
                            f.status === "Approved"
                              ? styles.approved
                              : f.status === "Archived"
                              ? styles.archived
                              : f.status === "Declined"
                              ? styles.declined
                              : styles.pending
                          }
                        >
                          {f.status}
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {view === "dashboard" && f.status === "Pending" && (
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button
                              style={styles.buttonSmall}
                              onClick={() => updateStatus(realIndex, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              style={styles.declineButtonSmall}
                              onClick={() => handleDeclineClick(realIndex)}
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {view === "dashboard" && f.status === "Approved" && (
                          <button
                            style={styles.archiveButton}
                            onClick={() => updateStatus(realIndex, "Archived")}
                          >
                            Archive
                          </button>
                        )}

                        {view === "archive" && (
                          <button
                            style={styles.restoreButton}
                            onClick={() => updateStatus(realIndex, "Pending")}
                          >
                            Restore
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* DECLINE MODAL */}
        {showDeclineModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>Decline File</h3>
              <p style={styles.modalSubtitle}>
                Please provide a reason for declining this file:
              </p>
              <textarea
                style={styles.textarea}
                placeholder="Enter reason for declining..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
              <div style={styles.modalButtons}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowDeclineModal(false);
                    setDeclineReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  style={styles.confirmButton}
                  onClick={submitDecline}
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FILE VIEW MODAL */}
        {showFileModal && selectedFile && (
          <div style={styles.modalOverlay}>
            <div style={styles.fileModal}>
              <h3 style={styles.modalTitle}>File Viewer</h3>
              <div style={styles.fileInfoBox}>
                <p><strong>File Name:</strong> {selectedFile.name}</p>
                <p><strong>Department:</strong> {selectedFile.department}</p>
                <p><strong>Type:</strong> {selectedFile.type}</p>
                <p><strong>Date Uploaded:</strong> {selectedFile.date}</p>
                <p><strong>Status:</strong> {selectedFile.status}</p>
              </div>

              {selectedFile.fileData ? (
                <>
                  <div style={styles.filePreviewContainer}>
                    {selectedFile.fileData.startsWith("data:image") ? (
                      <img src={selectedFile.fileData} alt={selectedFile.name} style={styles.filePreviewImage} />
                    ) : selectedFile.fileData.startsWith("data:application/pdf") ? (
                      <iframe src={selectedFile.fileData} style={styles.filePreviewPdf}></iframe>
                    ) : selectedFile.fileData.startsWith("data:text") ? (
                      <pre style={styles.filePreviewText}>{atob(selectedFile.fileData.split(',')[1])}</pre>
                    ) : (
                      <p style={styles.filePreviewPlaceholder}>
                        File type not directly viewable. Please download to view.
                      </p>
                    )}
                  </div>

                  <button
                    style={styles.downloadButton}
                    onClick={() => downloadFile(selectedFile)}
                  >
                    ⬇ Download File
                  </button>
                </>
              ) : (
                <div style={styles.noFileDataBox}>
                  <p style={styles.noFileDataMessage}>
                    File data is not available for this file. This may be because it was uploaded before the file viewer feature was added.
                  </p>
                </div>
              )}
              <button
                style={styles.closeFileButton}
                onClick={() => setShowFileModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <footer style={styles.footer}>
          © 2026 BAC | Records Management System
        </footer>
      </main>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  layout: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    fontFamily: "Segoe UI",
  },

  sidebar: {
    width: 280,
    background: maroon,
    color: "white",
    padding: 24,
  },

  logoBox: { textAlign: "center", marginBottom: 30 },
  logo: { margin: 0, fontSize: 36 },
  subLogo: { margin: 0, fontSize: 14, opacity: 0.9 },

nav: {
  padding: "12px 14px",
  marginBottom: 8,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
},

navActive: {
  padding: "12px 14px",
  background: "#5c0013",
  borderRadius: 6,
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  gap: 10,
},


  main: {
    flex: 1,
    padding: 32,
    background: "#f4f4f4",
    overflowY: "auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  schoolYear: { fontWeight: 600 },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    marginBottom: 25,
  },

  card: {
    background: "white",
    padding: 20,
    borderTop: `5px solid ${maroon}`,
    borderRadius: 10,
  },

  filterBar: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 20,
  },

  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
    flex: "1 1 220px",
  },

  tableBox: {
    background: "white",
    padding: 24,
    borderRadius: 10,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  approved: {
    background: "#e6f4ea",
    color: "#137333",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 12,
    display: "inline-block",
    whiteSpace: "nowrap",
  },

  pending: {
    background: "#fff3cd",
    color: "#856404",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 12,
    display: "inline-block",
    whiteSpace: "nowrap",
  },

  archived: {
    background: "#e2e3e5",
    color: "#383d41",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 12,
    display: "inline-block",
    whiteSpace: "nowrap",
  },

  declined: {
    background: "#f8d7da",
    color: "#721c24",
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 12,
    display: "inline-block",
    whiteSpace: "nowrap",
  },

  button: {
  },

  buttonSmall: {
    color: "#dc3545",
  },

  declineButtonSmall: {
  },

  archiveButton: {
  },

  restoreButton: {
    color: "#198754",
  },

  footer: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 12,
    color: "#666",
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

  fileModal: {
    background: "white",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    minWidth: 400,
    maxWidth: 800,
    maxHeight: "85vh",
    overflowY: "auto",
  },

  fileInfoBox: {
    background: "#f9f9f9",
    padding: 15,
    borderRadius: 6,
    border: "1px solid #ddd",
    marginBottom: 20,
    lineHeight: 1.8,
    fontSize: 14,
  },

  filePreviewContainer: {
    background: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: 15,
    marginBottom: 20,
    minHeight: 200,
    maxHeight: 400,
    overflowY: "auto",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  filePreviewImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
  },

  filePreviewPdf: {
    width: "100%",
    height: "100%",
    minHeight: 400,
    border: "none",
  },

  filePreviewText: {
    width: "100%",
    fontSize: 12,
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    color: "#333",
    margin: 0,
  },

  filePreviewPlaceholder: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },

  downloadButton: {
    color: "#198754",
    background: "#e8f5e9",
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #c8e6c9",
  },

  noFileDataBox: {
    background: "#fff3cd",
    border: "1px solid #ffc107",
    borderRadius: 6,
    padding: 20,
    marginBottom: 20,
    textAlign: "center",
  },

  noFileDataMessage: {
    color: "#856404",
    fontSize: 14,
    margin: "0 0 10px 0",
  },

  closeFileButton: {
  },

  modal: {
    background: "white",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    minWidth: 400,
    maxWidth: 500,
  },

  modalTitle: {
    margin: "0 0 10px 0",
    fontSize: 20,
    fontWeight: 600,
    color: maroon,
  },

  modalSubtitle: {
    margin: "0 0 20px 0",
    fontSize: 14,
    color: "#666",
  },

  textarea: {
    width: "100%",
    height: 120,
    padding: 12,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontFamily: "Segoe UI",
    fontSize: 14,
    resize: "vertical",
    boxSizing: "border-box",
  },

  modalButtons: {
    display: "flex",
    gap: 12,
    marginTop: 20,
    justifyContent: "flex-end",
  },

  cancelButton: {
  },

  confirmButton: {
  },
  badge: {
  marginLeft: "auto",
  background: "#ff3b3b",
  color: "white",
  borderRadius: "50%",
  minWidth: 20,
  height: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
},

};
