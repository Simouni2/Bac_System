import { useState, useEffect, useMemo } from "react";
import { saveFilesToFirestore } from "./firebase/userService";
import profileImage from "./assets/profile2.jpg";

const maroon = "#7a0019";

/* ===== DEPARTMENT NORMALIZATION ===== */
const normalizeDepartment = (dept) => {
  if (!dept) return "";
  const normalizedMap = {
    "hr": "HR",
    "finance": "Finance",
    "registrar": "Registrar",
    "accounting": "Accounting",
  };
  
  const lowerDept = dept.toLowerCase();
  return normalizedMap[lowerDept] || dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase();
};


export default function UserDashboard({ files, setFiles }) {

  // ✅ GET LOGGED-IN USER FIRST
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const userKey = currentUser?.email;

  // Safety check - if no user or no files state, show error
  if (!userKey || files === undefined || !setFiles) {
    console.error("❌ UserDashboard Error:", { 
      userKey, 
      currentUser,
      hasFiles: files !== undefined,
      hasSetFiles: typeof setFiles === 'function',
      filesType: typeof files,
      fileValue: files
    });
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 18, color: "#999" }}>⚠️ Error loading user dashboard.</div>
        <button onClick={() => window.location.reload()} style={{ padding: "10px 20px", background: "#7a0019", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
          Refresh Page
        </button>
      </div>
    );
  }

  // ================= UI STATES - DECLARE FIRST =================
  const [view, setView] = useState("upload");
  const [sortOrder, setSortOrder] = useState("latest"); // latest | oldest
  const [showUploadSuccessModal, setShowUploadSuccessModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filesToUpload, setFilesToUpload] = useState([]); // Files being uploaded before confirmation
  const [ppmpDepartments, setPpmpDepartments] = useState(() => {
    const saved = localStorage.getItem("ppmpDepartments");
    return saved ? JSON.parse(saved) : [];
  });
  const [userPPMPStatus, setUserPPMPStatus] = useState(() => {
    const saved = localStorage.getItem(`userPPMP_${userKey}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [userPPMPStatuses, setUserPPMPStatuses] = useState(() => {
    const saved = localStorage.getItem("userPPMPStatuses");
    return saved ? JSON.parse(saved) : {};
  });
  const [bacTeamMembers, setBacTeamMembers] = useState(() => {
    const saved = localStorage.getItem("bacTeamMembers");
    return saved ? JSON.parse(saved) : [];
  });
  const [docTemplates, setDocTemplates] = useState(() => {
    const saved = localStorage.getItem("docTemplates");
    return saved ? JSON.parse(saved) : [];
  });
  const [allUsers, setAllUsers] = useState(() => {
    const saved = localStorage.getItem("bacUsers");
    return saved ? JSON.parse(saved) : [];
  });



  // ✅ GET ONLY THIS USER'S FILES FROM GLOBAL STORAGE
  const userFiles = (files && userKey) ? files.filter(f => f.userEmail === userKey) : [];

  // ✅ SORTED FILES BASED ON SORT ORDER
  const sortedUserFiles = useMemo(() => {
    const sorted = [...userFiles].sort((a, b) => {
      if (sortOrder === "latest") {
        return (b.timestamp || 0) - (a.timestamp || 0);
      } else {
        return (a.timestamp || 0) - (b.timestamp || 0);
      }
    });
    return sorted;
  }, [userFiles, sortOrder]);

  const pendingFiles = useMemo(() => {
    return sortedUserFiles.filter(f => f.status === "Pending");
  }, [sortedUserFiles]);

  const approvedFiles = useMemo(() => {
    return sortedUserFiles.filter(f => f.status === "Approved");
  }, [sortedUserFiles]);

  const declinedFiles = useMemo(() => {
    return sortedUserFiles.filter(f => f.status === "Declined");
  }, [sortedUserFiles]);

  // ================= APPROVAL NOTIFICATIONS (PER USER) =================
  const [shownApprovedFileNames, setShownApprovedFileNames] = useState(() => {
    if (!userKey) return new Set();
    const saved = localStorage.getItem(`shownApprovedFileNames_${userKey}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    if (userKey) {
      localStorage.setItem(
        `shownApprovedFileNames_${userKey}`,
        JSON.stringify([...shownApprovedFileNames])
      );
    }
  }, [shownApprovedFileNames, userKey]);

  useEffect(() => {
    const approved = userFiles.filter(f => f.status === "Approved");
    const newlyApproved = approved.filter(f => !shownApprovedFileNames.has(f.name));
    if (newlyApproved.length > 0) {
      setShowSuccessModal(true);
    }
  }, [userFiles, shownApprovedFileNames]);

  useEffect(() => {
    if (showSuccessModal) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        const approved = userFiles.filter(f => f.status === "Approved");
        setShownApprovedFileNames(prev =>
          new Set([...prev, ...approved.map(f => f.name)])
        );
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal, userFiles]);

  // ✅ DATA PERSISTENCE & RECOVERY - BACKUP FILES
  useEffect(() => {
    if (files && files.length > 0) {
      try {
        // Create backup of files every time they change
        const backup = files.map(f => {
          const { fileData, ...metadata } = f;
          return { ...metadata, hasFileData: !!fileData };
        });
        localStorage.setItem("bacFiles_backup", JSON.stringify(backup));
        localStorage.setItem("bacFiles_lastUpdate", new Date().toISOString());
      } catch (err) {
        console.warn("⚠️ Could not backup files:", err.message);
      }
    }
  }, [files]);

  // ✅ RECOVER LOST FILES IF NEEDED
  useEffect(() => {
    if (files && files.length === 0) {
      try {
        const backup = localStorage.getItem("bacFiles_backup");
        if (backup) {
          const parsedBackup = JSON.parse(backup);
          if (parsedBackup.length > 0) {
            console.log("🔄 Attempting file recovery from backup...");
            setFiles(parsedBackup);
          }
        }
      } catch (err) {
        console.warn("⚠️ Could not recover files:", err.message);
      }
    }
  }, []);

  // ✅ LOAD FILES FROM LOCALSTORAGE ON COMPONENT MOUNT
  useEffect(() => {
    if (files.length === 0 && !localStorage.getItem("filesLoadedInSession")) {
      try {
        const savedFiles = localStorage.getItem("bacFiles");
        if (savedFiles) {
          const parsedFiles = JSON.parse(savedFiles);
          if (parsedFiles.length > 0) {
            setFiles(parsedFiles);
            localStorage.setItem("filesLoadedInSession", "true");
            console.log("✅ Files restored from localStorage:", parsedFiles.length, "files loaded");
          }
        }
      } catch (err) {
        console.warn("⚠️ Could not load files from localStorage:", err.message);
      }
    }
  }, []);

  // ✅ SYNC FILES TO LOCALSTORAGE IN REAL-TIME
  useEffect(() => {
    if (files && files.length > 0) {
      try {
        const filesMetadata = files.map(f => {
          const { fileData, ...metadata } = f;
          return metadata;
        });
        localStorage.setItem("bacFiles", JSON.stringify(filesMetadata));
        console.log("💾 Files synced to localStorage:", filesMetadata.length, "files saved");
      } catch (err) {
        console.warn("⚠️ Could not sync files to localStorage:", err.message);
      }
    }
  }, [files]);

  // ✅ LISTEN FOR STORAGE CHANGES (syncs data from admin dashboard)
  useEffect(() => {
    // Handle cross-tab storage changes
    const handleStorageChange = (e) => {
      if (e.key === "bacTeamMembers") {
        const updated = localStorage.getItem("bacTeamMembers");
        if (updated) {
          setBacTeamMembers(JSON.parse(updated));
          console.log("🔄 BAC Team Members updated from storage");
        }
      }
      if (e.key === "docTemplates") {
        const updated = localStorage.getItem("docTemplates");
        if (updated) {
          setDocTemplates(JSON.parse(updated));
          console.log("🔄 Document Templates updated from storage");
        }
      }
    };

    // Handle same-tab custom events
    const handleTeamMembersUpdated = (e) => {
      setBacTeamMembers(e.detail);
      console.log("🔄 BAC Team Members updated (same-tab)");
    };

    const handleDocTemplatesUpdated = (e) => {
      setDocTemplates(e.detail);
      console.log("🔄 Document Templates updated (same-tab)");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("bacTeamMembersUpdated", handleTeamMembersUpdated);
    window.addEventListener("docTemplatesUpdated", handleDocTemplatesUpdated);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("bacTeamMembersUpdated", handleTeamMembersUpdated);
      window.removeEventListener("docTemplatesUpdated", handleDocTemplatesUpdated);
    };
  }, []);

  // ================= HELPERS =================
  const validate = () => {
    if (!department.trim()) {
      setError("Department is required before uploading documents.");
      return false;
    }
    setError("");
    return true;
  };

  const handleFiles = (fileList) => {
    if (!validate()) return;

    setIsUploading(true);
    setUploadProgress("Processing files...");

    const filePromises = Array.from(fileList).map((f, index) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          // Get current date and time
          const now = new Date();
          const date = now.toLocaleDateString();
          const time = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });

          // Update progress
          setUploadProgress(`Processing: ${index + 1}/${fileList.length}`);

          resolve({
            name: f.name,
            department: normalizeDepartment(department),
            type: "General",
            date: date,
            time: time,
            timestamp: now.getTime(),
            status: "Pending",
            fileData: e.target.result,
            userEmail: userKey,
          });
        };
        reader.readAsDataURL(f);
      });
    });

    Promise.all(filePromises).then((newFiles) => {
      setFilesToUpload(newFiles);
      setIsUploading(false);
      setUploadProgress("");
      setShowConfirmModal(true);
    });
  };

  const confirmUpload = async () => {
    // Show loading screen
    setShowConfirmModal(false);
    setIsUploading(true);
    setUploadProgress("Uploading to database...");

    try {
      console.log("📤 Starting Firestore upload...");
      console.log("Files to upload:", filesToUpload);
      console.log("User email:", userKey);
      
      // Save files to Firestore
      const firestoreResult = await saveFilesToFirestore(
        filesToUpload,
        userKey,
        currentUser?.firstName || currentUser?.fname || userKey.split("@")[0]
      );

      console.log("✓ Firestore upload result:", firestoreResult);

      // Update local state with files
      setFiles(prev => {
        const updated = [...prev, ...filesToUpload];
        console.log("✅ Files being saved:", updated.length, "total files");
        return updated;
      });

      setFilesToUpload([]);
      setIsUploading(false);
      setUploadProgress("");
      setShowUploadSuccessModal(true);

      // Show notification about Firestore status
      if (!firestoreResult.success) {
        console.warn("⚠️ Warning: Files saved locally but Firestore upload had issues");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      setIsUploading(false);
      setUploadProgress("");
      setError("Error uploading files. Please try again.");
    }
  };

  const cancelUpload = () => {
    setShowConfirmModal(false);
    setFilesToUpload([]);
  };

  const uploadFile = (e) => {
    handleFiles(e.target.files);
    e.target.value = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleViewDeclineReason = (reason) => {
    setSelectedDeclineReason(reason);
    setShowDeclineModal(true);
  };

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




  return (
    <div style={styles.layout}>
      {/* LOADING SCREEN */}
      {isUploading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContainer}>
            <div style={styles.uploadSpinner}></div>
            <h3 style={styles.loadingTitle}>Uploading Documents</h3>
            <p style={styles.uploadProgressText}>{uploadProgress}</p>
            <div style={styles.progressBar}>
              <div style={styles.progressFill}></div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}>
          <h1 style={styles.logo}>BAC</h1>
          <p style={styles.subLogo}>User Portal</p>
        </div>

        <div 
          style={view === "upload" ? styles.navActive : styles.nav}
          onClick={() => setView("upload")}
        >
          Upload Files
        </div>
        <div 
          style={view === "submissions" ? styles.navActive : styles.nav}
          onClick={() => setView("submissions")}
        >
          My Submissions
        </div>
        <div 
          style={view === "guidelines" ? styles.navActive : styles.nav}
          onClick={() => setView("guidelines")}
        >
          Guidelines
        </div>
        <div 
          style={view === "about" ? styles.navActive : styles.nav}
          onClick={() => setView("about")}
        >
          About BAC
        </div>
        <div 
          style={view === "ppmp" ? styles.navActive : styles.nav}
          onClick={() => setView("ppmp")}
        >
           PPMP Status
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        {/* HEADER */}
        <div style={styles.header}>
          <h2>
            {view === "upload" 
              ? "Document Submission" 
              : view === "submissions" 
              ? "My Submissions"
              : view === "guidelines"
              ? "Guidelines"
              : view === "about"
              ? "About BAC"
              : "PPMP Status"}
          </h2>
          <span style={styles.schoolYear}>School Year 2025–2026</span>
        </div>

        {/* UPLOAD VIEW */}
        {view === "upload" && (
          <>
            {/* CARD */}
            <div style={styles.card}>
              <h4>Upload New Document</h4>

              {/* ERROR MESSAGE */}
              {error && (
                <div style={styles.errorBox}>
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* DEPARTMENT INPUT */}
              <input
                type="text"
                placeholder="Enter your Department (e.g. Finance, HR, Registrar)"
                value={department}
                onChange={(e) => {
                  setDepartment(normalizeDepartment(e.target.value));
                  if (error) setError("");
                }}
                style={{
                  ...styles.input,
                  ...(error ? styles.inputError : {}),
                }}
              />

              {/* DROP ZONE */}
              <div
                style={{
                  ...styles.dropZone,
                  ...(isDragging ? styles.dropZoneActive : {}),
                  ...(error ? styles.dropZoneError : {}),
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() =>
                  document.getElementById("fileInput").click()
                }
              >
                <input
                  id="fileInput"
                  type="file"
                  multiple
                  onChange={uploadFile}
                  style={{ display: "none" }}
                />

                <p style={{ margin: 0, fontWeight: 600 }}>
                  Drag & drop files here
                </p>
                <p style={styles.dropHint}>or click to browse</p>
              </div>

              <p style={styles.note}>
                Files will be reviewed and approved by the administrator.
              </p>
            </div>

            {/* TABLE */}
            <div style={styles.tableBox}>
              <div style={styles.tableHeader}>
                <h3>My Submitted Files</h3>
                <button
                  style={styles.sortButton}
                  onClick={() => setSortOrder(sortOrder === "latest" ? "oldest" : "latest")}
                  title={sortOrder === "latest" ? "Latest to Oldest" : "Oldest to Latest"}
                >
                  {sortOrder === "latest" ? "↓ Latest" : "↑ Oldest"}
                </button>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Time Submitted</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUserFiles.map((f, i) => (
                    <tr key={i} style={f.status === "Declined" ? { cursor: "pointer" } : {}} onClick={() => f.status === "Declined" && handleViewDeclineReason(f.declineReason)}>
                      <td style={{ cursor: "pointer", color: "#0066cc" }} onClick={(e) => { e.stopPropagation(); handleViewFile(f); }}>{f.name}</td>
                      <td>{f.department}</td>
                      <td>{f.date}</td>
                      <td>{f.time || "N/A"}</td>
                      <td style={{ textAlign: "center", paddingTop: "16px", paddingBottom: "16px" }}>
                        <span
                          style={
                            f.status === "Approved"
                              ? styles.approved
                              : f.status === "Declined"
                              ? styles.declined
                              : styles.pending
                          }
                        >
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* SUBMISSIONS VIEW */}
        {view === "submissions" && (
          <>
            {sortedUserFiles.length === 0 ? (
              <div style={styles.card}>
                <p style={styles.emptyMessage}>No submissions yet. Start by uploading a document in the "Upload Files" section.</p>
              </div>
            ) : (
              <>
                <div style={styles.sortButtonContainer}>
                  <button
                    style={styles.sortButton}
                    onClick={() => setSortOrder(sortOrder === "latest" ? "oldest" : "latest")}
                    title={sortOrder === "latest" ? "Latest to Oldest" : "Oldest to Latest"}
                  >
                    {sortOrder === "latest" ? "↓" : "↑"}
                  </button>
                </div>

                {/* PENDING SECTION */}
                {pendingFiles.length > 0 && (
                  <div style={styles.card}>
                    <h3>Pending Review</h3>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th>File Name</th>
                          <th>Department</th>
                          <th>Date</th>
                          <th>Time Submitted</th>
                          <th style={{ textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingFiles.map((f, i) => (
                          <tr key={i}>
                            <td style={{ cursor: "pointer", color: "#0066cc" }} onClick={() => handleViewFile(f)}>{f.name}</td>
                            <td>{f.department}</td>
                            <td>{f.date}</td>
                            <td>{f.time || "N/A"}</td>
                            <td style={{ textAlign: "center", paddingTop: "16px", paddingBottom: "16px" }}>
                              <span style={styles.pending}>
                                {f.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* APPROVED SECTION */}
                {approvedFiles.length > 0 && (
                  <div style={styles.card}>
                    <h3>Approved Papers</h3>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th>File Name</th>
                          <th>Department</th>
                          <th>Date</th>
                          <th>Time Submitted</th>
                          <th style={{ textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedFiles.map((f, i) => (
                          <tr key={i}>
                            <td style={{ cursor: "pointer", color: "#0066cc" }} onClick={() => handleViewFile(f)}>{f.name}</td>
                            <td>{f.department}</td>
                            <td>{f.date}</td>
                            <td>{f.time || "N/A"}</td>
                            <td style={{ textAlign: "center", paddingTop: "16px", paddingBottom: "16px" }}>
                              <span style={styles.approved}>
                                {f.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* DECLINED SECTION */}
                {declinedFiles.length > 0 && (
                  <div style={styles.card}>
                    <h3>Declined Papers</h3>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th>File Name</th>
                          <th>Department</th>
                          <th>Date</th>
                          <th>Time Submitted</th>
                          <th>Decline Reason</th>
                          <th style={{ textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {declinedFiles.map((f, i) => (
                          <tr key={i}>
                            <td style={{ cursor: "pointer", color: "#0066cc" }} onClick={() => handleViewFile(f)}>{f.name}</td>
                            <td>{f.department}</td>
                            <td>{f.date}</td>
                            <td>{f.time || "N/A"}</td>
                            <td style={{ fontSize: "13px", color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }} title={f.declineReason}>
                              {f.declineReason || "N/A"}
                            </td>
                            <td style={{ textAlign: "center", paddingTop: "16px", paddingBottom: "16px" }}>
                              <span style={styles.declined}>
                                {f.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}

{/* GUIDELINES VIEW */}
{view === "guidelines" && (
  <>
    <div style={styles.card}>
      <h3>Document Submission Guidelines</h3>
      <p style={styles.guidelineIntro}>
        Please follow these guidelines carefully to ensure smooth processing of your document submissions.
      </p>

      {/* 1 */}
      <div style={styles.guidelineSection}>
        <h4 style={styles.guidelineTitle}>1. File Requirements</h4>
        <ul style={styles.guidelineList}>
          <li>Accepted formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</li>
          <li>Maximum file size: 25 MB per file</li>
          <li>File names should be descriptive and include the date (e.g., FIN_Report_2025-01-15.pdf)</li>
          <li>Ensure files are clear, legible, and properly scanned if physical documents</li>
        </ul>
      </div>

      {/* 2 */}
      <div style={styles.guidelineSection}>
        <h4 style={styles.guidelineTitle}>2. Department Classification</h4>
        <ul style={styles.guidelineList}>
          <li><strong>Finance:</strong> Budget reports, financial statements, procurement documents</li>
          <li><strong>HR:</strong> Personnel files, payroll documents, leave records</li>
          <li><strong>Registrar:</strong> Student records, transcripts, enrollment documents</li>
          <li><strong>Academic:</strong> Course materials, syllabi, research papers</li>
          <li><strong>Administration:</strong> Policies, memoranda, administrative records</li>
        </ul>
      </div>

      {/* 3 */}
      <div style={styles.guidelineSection}>
        <h4 style={styles.guidelineTitle}>3. Submission Process</h4>
        <ul style={styles.guidelineList}>
          <li>Enter your department before uploading</li>
          <li>Drag and drop files or click to browse your computer</li>
          <li>Review the file details in the confirmation dialog</li>
          <li>Click <strong>Continue</strong> to submit your files</li>
          <li>You will receive a confirmation notification once submitted</li>
        </ul>
      </div>

      {/* 4 */}
      <div style={styles.guidelineSection}>
        <h4 style={styles.guidelineTitle}>4. Review and Approval Process</h4>
        <ul style={styles.guidelineList}>
          <li>Files are reviewed within 2–3 business days</li>
          <li>Track your submissions under <strong>My Submissions</strong></li>
          <li>Status indicators: <span style={styles.pendingBadge}>Pending</span>, <span style={styles.approvedBadge}>Approved</span>, <span style={styles.declinedBadge}>Declined</span></li>
          <li>Declined files will include a reason for correction</li>
          <li>You may re-submit corrected files anytime</li>
        </ul>
      </div>

      {/* 5 */}
      <div style={styles.guidelineSection}>
        <h4 style={styles.guidelineTitle}>5. Common Rejection Reasons</h4>
        <ul style={styles.guidelineList}>
          <li>Incomplete or missing information</li>
          <li>Illegible or low-quality scans</li>
          <li>Incorrect file format or corrupted files</li>
          <li>Missing signatures or approvals</li>
          <li>Insufficient supporting documents</li>
        </ul>
      </div>

      {/* 6 */}
      <div style={styles.guidelineSection}>
        <h4 style={styles.guidelineTitle}>6. Best Practices</h4>
        <ul style={styles.guidelineList}>
          <li>Keep copies of all submitted documents</li>
          <li>Use official templates whenever available</li>
          <li>Double-check data before uploading</li>
          <li>Submit during office hours for faster processing</li>
          <li>Contact support if unsure of requirements</li>
        </ul>
      </div>

      {/* 7 — TEMPLATES */}
      <div style={styles.guidelineSection}>
        <h4 style={styles.guidelineTitle}>7. Document Templates</h4>
        <p style={{ fontSize: "14px", color: "#555", marginBottom: "12px" }}>
          Download and use the official BAC-approved templates below to ensure correct formatting and faster approval.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "14px"
        }}>
          {docTemplates.length > 0 ? (
            docTemplates.map((template) => (
              <div key={template.id} style={{
                border: "1px solid #ddd",
                borderRadius: "6px",
                padding: "14px",
                background: "#fff"
              }}>
                <h5 style={{ margin: "0 0 4px 0", fontSize: "15px" }}>{template.name}</h5>
                {template.description && (
                  <p style={{ fontSize: "13px", color: "#555", marginBottom: "10px" }}>{template.description}</p>
                )}
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = template.fileData;
                    link.download = template.name;
                    link.click();
                  }}
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    background: maroon,
                    color: "#fff",
                    borderRadius: "4px",
                    fontSize: "12px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Download Template
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: "#999", fontSize: "13px" }}>No templates available yet.</p>
          )}
        </div>
      </div>

      {/* SUPPORT */}
      <div style={{ ...styles.guidelineSection, backgroundColor: "#f9f9f9", borderLeft: `4px solid ${maroon}`, marginTop: 20 }}>
        <h4 style={styles.guidelineTitle}>📞 Support</h4>
        <p>For questions or assistance, please contact:</p>
        <ul style={styles.guidelineList}>
          <li>Email: records@institution.edu</li>
          <li>Phone: (555) 123-4567</li>
          <li>Office Hours: Monday – Friday, 9 AM – 5 PM</li>
        </ul>
      </div>
    </div>
  </>
)}


        {/* ABOUT BAC VIEW */}
        {view === "about" && (
          <>
            <div style={styles.card}>
              <h3>About BAC</h3>
              
              <div style={styles.aboutSection}>
                <h4 style={styles.aboutTitle}>What is BAC?</h4>
                <p style={styles.aboutText}>
                  The <strong>Bids and Awards Committee (BAC)</strong> is an essential governance body established to ensure fair, transparent, and competitive procurement processes within our institution. The BAC oversees the evaluation and selection of vendors and contractors to guarantee that we receive the best value for public funds while maintaining the highest standards of integrity and accountability.
                </p>
              </div>

              <div style={styles.aboutSection}>
                <h4 style={styles.aboutTitle}>Our Mission</h4>
                <p style={styles.aboutText}>
                  To conduct fair, transparent, and efficient procurement processes that promote competition, ensure value for money, and uphold the highest standards of institutional integrity while serving the needs of the institution and its stakeholders.
                </p>
              </div>

              <div style={styles.aboutSection}>
                <h4 style={styles.aboutTitle}>Our Functions</h4>
                <ul style={styles.guidelineList}>
                  <li>Evaluate bids and proposals from potential suppliers and contractors</li>
                  <li>Ensure compliance with procurement policies and regulations</li>
                  <li>Recommend the most qualified and cost-effective vendors</li>
                  <li>Maintain transparent and detailed records of all procurement activities</li>
                  <li>Promote fair competition and equal opportunity</li>
                  <li>Protect institutional interests and public funds</li>
                </ul>
              </div>

              <div style={styles.aboutSection}>
                <h4 style={styles.aboutTitle}>Core Values</h4>
                <div style={styles.valuesContainer}>
                  <div style={styles.valueCard}>
                    <h5 style={styles.valueTitle}>🎯 Transparency</h5>
                    <p style={styles.valueText}>All procurement processes are conducted openly and fairly.</p>
                  </div>
                  <div style={styles.valueCard}>
                    <h5 style={styles.valueTitle}>⚖️ Integrity</h5>
                    <p style={styles.valueText}>We maintain the highest ethical standards in all decisions.</p>
                  </div>
                  <div style={styles.valueCard}>
                    <h5 style={styles.valueTitle}>💰 Value</h5>
                    <p style={styles.valueText}>We ensure the best return on institutional investments.</p>
                  </div>
                  <div style={styles.valueCard}>
                    <h5 style={styles.valueTitle}>🤝 Fairness</h5>
                    <p style={styles.valueText}>We treat all vendors and contractors equitably.</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3>BAC Leadership Team</h3>
              <p style={styles.aboutText}>
                Our dedicated team of professionals works tirelessly to ensure fair and efficient procurement processes.
              </p>
              
              <div style={styles.staffContainer}>
                {bacTeamMembers.length > 0 ? (
                  bacTeamMembers.map((member) => (
                    <div key={member.id} style={styles.staffMember}>
                      {member.image ? (
                        <img 
                          src={member.image} 
                          alt={member.name}
                          style={styles.staffImage}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        style={styles.staffPlaceholder}
                        id={`placeholder-${member.id}`}
                        ref={(el) => {
                          if (el && member.image) el.style.display = 'none';
                        }}
                      >
                        <span style={styles.staffInitial}>
                          {(member.name.charAt(0) + member.name.split(' ')[1]?.charAt(0) || member.name.charAt(1)).toUpperCase()}
                        </span>
                      </div>
                      <h5 style={styles.staffName}>{member.name}</h5>
                      <p style={styles.staffPosition}>{member.position}</p>
                      <p style={styles.staffEmail}>{member.email}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: "center", color: "#999", padding: "40px 20px" }}>
                    No team members added yet. Admin can add team members from the Edit About BAC section.
                  </p>
                )}
              </div>
            </div>

            <div style={styles.card}>
              <h3>Development Team</h3>
              <p style={styles.aboutText}>
                Our talented developer who built and maintain this system to serve your needs.
              </p>
              
              <div style={styles.staffContainer}>
                <div style={styles.staffMember}>
                  <div style={styles.staffPlaceholder}>
                    <img 
                      src={profileImage} 
                      alt="Stephen Simoun Gee Bacani" 
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        borderRadius: "50%", 
                        objectFit: "cover",
                        display: "block"
                      }} 
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextElementSibling.style.display = "flex";
                      }}
                    />
                    <span style={{...styles.staffInitial, display: "none"}}>SGB</span>
                  </div>
                  <h5 style={styles.staffName}>Stephen Simoun Gee Bacani</h5>
                  <p style={styles.staffPosition}>Full Stack Developer</p>
                  <p style={styles.staffEmail}>bacanistephen1@gmail.com</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* PPMP VIEW */}
        {view === "ppmp" && (
          <>
            <div style={styles.card}>
              <h3>Project Procurement Management Plan (PPMP) Status</h3>
              <p style={styles.cardDescription}>
                PPMP verification status across all departments.
              </p>
            </div>

            {ppmpDepartments.length > 0 && allUsers.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {ppmpDepartments.map((dept) => (
                  <div key={dept} style={{
                    backgroundColor: "white",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "20px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}>
                    <div style={{ marginBottom: "15px" }}>
                      <h4 style={{ margin: "0 0 10px 0", color: maroon, fontSize: "16px", fontWeight: "600" }}>
                        {dept}
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {allUsers.map((user, userIdx) => {
                          const statusKey = `${user.email}_${dept}`;
                          const status = userPPMPStatuses[statusKey] || "No PPMP";
                          const statusColor = 
                            status === "Complete" ? "#22c55e" :
                            status === "Incomplete" ? "#f97316" :
                            "#ef4444";

                          return (
                            <div key={userIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                              <span style={{ color: "#555", fontWeight: "500" }}>{user.email}</span>
                              <span style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                backgroundColor: statusColor,
                                color: "white",
                                borderRadius: "3px",
                                fontSize: "11px",
                                fontWeight: "600"
                              }}>
                                {status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.card}>
                <p style={styles.emptyMessage}>
                  {ppmpDepartments.length === 0 
                    ? "No PPMP departments have been set up yet." 
                    : "No users available."}
                </p>
              </div>
            )}
          </>
        )}

        {showConfirmModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>Confirm Upload</h3>
              <p style={styles.modalSubtitle}>
                You are about to upload {filesToUpload.length} file{filesToUpload.length !== 1 ? 's' : ''} to the {department} department.
              </p>
              <p style={styles.modalSubtitle}>Do you want to continue?</p>
              <div style={styles.modalButtons}>
                <button
                  style={styles.cancelButton}
                  onClick={cancelUpload}
                >
                  Cancel
                </button>
                <button
                  style={styles.confirmButton}
                  onClick={confirmUpload}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
        {showUploadSuccessModal && (
  <div style={styles.modalOverlay}>
    <div style={styles.modal}>
      <h3 style={styles.modalTitleSuccess}>Upload Successful </h3>
      <p style={styles.modalSubtitle}>
        {filesToUpload.length || "Your"} file
        {filesToUpload.length !== 1 ? "s have" : " has"} been successfully uploaded.
      </p>
      <p style={styles.modalSubtitle}>
        Please wait for administrator review.
      </p>

      <div style={styles.modalButtons}>
        <button
          style={styles.confirmButton}
          onClick={() => setShowUploadSuccessModal(false)}
        >
          OK
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
                     Download File
                  </button>
                </>
              ) : (
                <div style={styles.noFileDataBox}>
                  <p style={styles.noFileDataMessage}>
                    File data is not available for this file. This may be because it was uploaded before the file viewer feature was added.
                  </p>
                  <p style={styles.reuploadHint}>
                    You can re-upload the file to view its content, or contact the administrator if you need further assistance.
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

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitleSuccess}>File Approved!</h3>
              <p style={styles.modalSubtitle}>
                Your file has been approved. You can now proceed to the office to submit the required documents.
              </p>
              <div style={styles.approvedFilesList}>
                {approvedFiles.map((f, i) => (
                  <div key={i} style={styles.approvedFileItem}>
                    <span style={styles.checkmark}>✓</span>
                    <span>{f.name}</span>
                  </div>
                ))}
              </div>
              <p style={styles.autoCloseHint}>This notification will close automatically in 5 seconds</p>
              <button
                style={styles.okButton}
                onClick={() => {
                  setShowSuccessModal(false);
                  setShownApprovedFileNames(prev => new Set([...prev, ...approvedFiles.map(f => f.name)]));
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* DECLINE REASON MODAL */}
        {showDeclineModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>File Declined</h3>
              <p style={styles.modalSubtitle}>Reason for decline:</p>
              <div style={styles.reasonBox}>
                {selectedDeclineReason}
              </div>
              <button
                style={styles.closeButton}
                onClick={() => setShowDeclineModal(false)}
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

const styles = {
  layout: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    fontFamily: "Segoe UI",
    overflow: "hidden",
    position: "relative",
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
    background: "white",
    borderRadius: "12px",
    padding: "50px 40px",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    minWidth: "350px",
  },

  uploadSpinner: {
    width: "60px",
    height: "60px",
    border: "5px solid #f0f0f0",
    borderTop: `5px solid ${maroon}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 25px",
  },

  loadingTitle: {
    color: maroon,
    fontSize: "20px",
    fontWeight: 600,
    margin: "0 0 15px 0",
  },

  uploadProgressText: {
    color: "#666",
    fontSize: "14px",
    margin: "0 0 20px 0",
  },

  progressBar: {
    width: "100%",
    height: "6px",
    background: "#e0e0e0",
    borderRadius: "3px",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: maroon,
    borderRadius: "3px",
    animation: "slideProgress 2s infinite",
  },

  sidebar: {
    width: 320,
    background: maroon,
    color: "white",
    padding: 32,
    overflowY: "auto",
  },

  logoBox: { textAlign: "center", marginBottom: 40 },
  logo: { margin: 0, fontSize: 48, letterSpacing: 2 },
  subLogo: { margin: 0, fontSize: 15, opacity: 0.85, marginTop: 8 },

  nav: {
    padding: "14px 16px",
    marginBottom: 10,
    cursor: "pointer",
    borderRadius: 8,
    fontSize: 15,
    transition: "all 0.2s",
  },

  navActive: {
    padding: "14px 16px",
    background: "#5c0013",
    borderRadius: 8,
    marginBottom: 10,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 15,
    transition: "all 0.2s",
  },

  main: {
    flex: 1,
    padding: 48,
    background: "#f0f0f0",
    overflowY: "auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
    borderBottom: "2px solid #ddd",
    paddingBottom: 20,
  },

  schoolYear: { fontWeight: 600, fontSize: 16 },

  card: {
    background: "white",
    padding: 32,
    borderTop: `6px solid ${maroon}`,
    borderRadius: 12,
    marginBottom: 32,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  errorBox: {
    background: "#fdecea",
    color: "#a60000",
    padding: "14px 16px",
    borderRadius: 8,
    marginBottom: 16,
    borderLeft: "5px solid #a60000",
    fontSize: 14,
  },

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #ddd",
    marginBottom: 16,
    fontSize: 14,
  },

  inputError: {
    borderColor: "#a60000",
    background: "#fff5f5",
  },

  dropZone: {
    padding: 40,
    border: "2px dashed #ccc",
    borderRadius: 12,
    textAlign: "center",
    cursor: "pointer",
    background: "#fafafa",
    transition: "0.2s",
  },

  dropZoneActive: {
    borderColor: maroon,
    background: "#fff0f3",
  },

  dropZoneError: {
    borderColor: "#a60000",
  },

  dropHint: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },

  tableBox: {
    background: "white",
    padding: 32,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: 32,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  "table th": {
    padding: "14px 18px",
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    fontSize: 15,
    fontWeight: 700,
    color: "#333",
  },

  "table td": {
    padding: "18px",
    borderBottom: "1px solid #eee",
    fontSize: 14,
  },

  "table tbody tr": {
    transition: "background-color 0.2s",
  },

  "table tbody tr:hover": {
    backgroundColor: "#f5f5f5",
  },

  approved: {
    background: "#e6f4ea",
    color: "#137333",
    padding: "10px 18px",
    borderRadius: 20,
    fontSize: 13,
    display: "inline-block",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },

  pending: {
    background: "#fff3cd",
    color: "#856404",
    padding: "10px 18px",
    borderRadius: 20,
    fontSize: 13,
    display: "inline-block",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },

  declined: {
    background: "#f8d7da",
    color: "#721c24",
    padding: "10px 18px",
    borderRadius: 20,
    fontSize: 13,
    display: "inline-block",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },

  note: {
    fontSize: 14,
    color: "#666",
    marginTop: 16,
    lineHeight: 1.6,
  },

  guidelineIntro: {
    fontSize: 16,
    color: "#333",
    marginBottom: 28,
    lineHeight: 1.7,
  },

  guidelineSection: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: "1px solid #eee",
  },

  guidelineTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: maroon,
    marginBottom: 16,
    marginTop: 0,
  },

  guidelineList: {
    marginLeft: 24,
    marginTop: 12,
    color: "#555",
    lineHeight: 2,
    fontSize: 15,
  },

  pendingBadge: {
    background: "#fff3cd",
    color: "#856404",
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
  },

  approvedBadge: {
    background: "#e6f4ea",
    color: "#137333",
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
  },

  declinedBadge: {
    background: "#f8d7da",
    color: "#721c24",
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
  },

  aboutSection: {
    marginBottom: 36,
    paddingBottom: 24,
    borderBottom: "1px solid #eee",
  },

  aboutTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: maroon,
    marginBottom: 16,
    marginTop: 0,
  },

  aboutText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 1.9,
    margin: "0 0 18px 0",
  },

  valuesContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 18,
    marginTop: 18,
  },

  valueCard: {
    background: "#f9f9f9",
    padding: 20,
    borderRadius: 10,
    border: `3px solid ${maroon}`,
    textAlign: "center",
  },

  valueTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: maroon,
    margin: "0 0 12px 0",
  },

  valueText: {
    fontSize: 14,
    color: "#666",
    margin: 0,
    lineHeight: 1.7,
  },

  staffContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 24,
    marginTop: 24,
  },

  staffMember: {
    textAlign: "center",
    padding: 20,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    border: "1px solid #ddd",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
  },

  staffPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: "50%",
    background: maroon,
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    fontSize: 16,
  },

  staffImage: {
    width: 100,
    height: 100,
    borderRadius: "50%",
    objectFit: "cover",
    margin: "0 auto 16px",
    display: "block",
  },

  staffInitial: {
    fontSize: 32,
    fontWeight: "bold",
  },

  staffName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#333",
    margin: "12px 0 6px 0",
  },

  staffPosition: {
    fontSize: 13,
    color: maroon,
    fontWeight: 600,
    margin: "0 0 10px 0",
  },

  staffEmail: {
    fontSize: 12,
    color: "#666",
    margin: 0,
    wordBreak: "break-all",
  },

  settingsSection: {
    marginBottom: 32,
  },

  settingsTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: maroon,
    margin: "0 0 18px 0",
  },

  settingsDescription: {
    fontSize: 14,
    color: "#666",
    margin: "0 0 18px 0",
    lineHeight: 1.7,
  },

  profileInputGroup: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
    marginBottom: 28,
  },

  passwordInputGroup: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
    marginBottom: 28,
  },

  inputWrapper: {
    display: "flex",
    flexDirection: "column",
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#333",
    marginBottom: 8,
  },

  settingsInput: {
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "Segoe UI",
    transition: "border-color 0.2s",
  },

  messageBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 18,
    fontSize: 14,
    fontWeight: 500,
  },

  successMessage: {
    background: "#e6f4ea",
    color: "#137333",
    border: "1px solid #34a853",
  },

  errorMessage: {
    background: "#fdecea",
    color: "#a60000",
    border: "1px solid #a60000",
  },

  saveButton: {
    color:"white",
    background: "green",
  },

  resetPasswordButton: {
    color: "white",
    background: maroon,
  },

  emptyMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    padding: "20px 0",
    fontStyle: "italic",
  },

  footer: {
    marginTop: 40,
    paddingTop: 24,
    textAlign: "center",
    fontSize: 14,
    color: "#999",
    borderTop: "1px solid #ddd",
  },

  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  modal: {
    background: "white",
    padding: 40,
    borderRadius: 14,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    minWidth: 450,
    maxWidth: 550,
  },

  fileModal: {
    background: "white",
    padding: 40,
    borderRadius: 14,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    minWidth: 520,
    maxWidth: 950,
    maxHeight: "90vh",
    overflowY: "auto",
  },

  modalTitle: {
    margin: "0 0 12px 0",
    fontSize: 24,
    fontWeight: 700,
    color: "#721c24",
  },

  modalTitleSuccess: {
    margin: "0 0 12px 0",
    fontSize: 24,
    fontWeight: 700,
    color: "#137333",
  },

  modalSubtitle: {
    margin: "0 0 20px 0",
    fontSize: 15,
    color: "#666",
    lineHeight: 1.7,
  },

  reasonBox: {
    background: "#fff5f5",
    padding: 20,
    borderRadius: 8,
    border: "1px solid #f8d7da",
    marginBottom: 24,
    lineHeight: 1.8,
    color: "#333",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    fontSize: 14,
  },

  modalButtons: {
    display: "flex",
    gap: 16,
    marginTop: 28,
    justifyContent: "flex-end",
  },

  cancelButton: {
    color: "white",
    background: "#666",
    padding: "10px 20px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },

  confirmButton: {
    color: "white",
    background: "#22c55e",
    padding: "10px 20px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },

  sortButton: {
    background: "transparent",
    color: "#7a0019",
    padding: "8px 12px",
    border: "none",
    outline: "none",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: "bold",
    transition: "opacity 0.2s",
  },

  sortButtonContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "16px",
  },

  approvedFilesList: {
    background: "#e6f4ea",
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
    border: "1px solid #34a853",
  },

  approvedFileItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
    color: "#137333",
    fontSize: 15,
  },

  checkmark: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#34a853",
  },

  autoCloseHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    margin: "14px 0 20px 0",
    fontStyle: "italic",
  },

  okButton: {
  },

  closeButton: {
  },

  fileInfoBox: {
    background: "#f9f9f9",
    padding: 20,
    borderRadius: 8,
    border: "1px solid #ddd",
    marginBottom: 24,
    lineHeight: 1.9,
    fontSize: 14,
  },

  downloadButton: {
  },

  noFileMessage: {
    color: "#666",
    fontSize: 15,
    marginBottom: 18,
    textAlign: "center",
  },

  closeFileButton: {
    background: maroon,
    color: "white",
    border: "none",
    padding: "12px 28px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 500,
    width: "100%",
  },

  filePreviewContainer: {
    background: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    minHeight: 300,
    maxHeight: 550,
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
    minHeight: 500,
    border: "none",
  },

  filePreviewText: {
    width: "100%",
    fontSize: 14,
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    color: "#333",
    margin: 0,
    lineHeight: 1.6,
  },

  filePreviewPlaceholder: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
  },

  noFileDataBox: {
    background: "#fff3cd",
    border: "1px solid #ffc107",
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    textAlign: "center",
  },

  noFileDataMessage: {
    color: "#856404",
    fontSize: 15,
    marginBottom: 10,
    margin: "0 0 12px 0",
  },

  reuploadHint: {
    color: "#856404",
    fontSize: 14,
    marginBottom: 0,
    margin: 0,
  },

  ppmpContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 24,
    marginBottom: 20,
  },

  ppmpCard: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderLeft: "5px solid #22c55e",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
    transition: "all 0.3s ease",
  },

  ppmpHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },

  ppmpDepartment: {
    fontSize: 18,
    fontWeight: 700,
    color: maroon,
    margin: 0,
    flex: 1,
  },

  ppmpStatus: {
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    color: "white",
    whiteSpace: "nowrap",
  },

  ppmpDescription: {
    fontSize: 14,
    color: "#555",
    margin: 0,
    lineHeight: 1.6,
  },

  cardDescription: {
    fontSize: 15,
    color: "#666",
    margin: "12px 0 0 0",
    lineHeight: 1.7,
  },
};
