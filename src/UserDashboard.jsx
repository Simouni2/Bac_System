import { useState, useEffect, useMemo } from "react";
import { saveFilesToFirestore, getUserDocument } from "./firebase/userService";
import { AlertCircle } from "lucide-react";
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
        <div style={{ fontSize: 18, color: "#999", display: "flex", alignItems: "center", gap: 10 }}>
          <AlertCircle size={24} /> Error loading user dashboard.
        </div>
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
  const [userDepartment, setUserDepartment] = useState(() => {
    // Get department from current user data
    return currentUser?.department || "";
  });
  const [requestingUser, setRequestingUser] = useState("");
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
  const [ppmpOfficeTemplates, setPpmpOfficeTemplates] = useState(() => {
    const saved = localStorage.getItem("ppmpOfficeTemplates");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentOfficeTemplate, setCurrentOfficeTemplate] = useState(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemData, setEditingItemData] = useState({
    name: "",
    status: "No PPMP",
    dueDate: "",
    description: "",
    proofImage: null
  });
  const [ppmpUserInstances, setPpmpUserInstances] = useState(() => {
    const saved = localStorage.getItem("ppmpUserInstances");
    return saved ? JSON.parse(saved) : {};
  });
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newPpmpItem, setNewPpmpItem] = useState({
    name: "",
    status: "No PPMP",
    dueDate: "",
    description: "",
    proofImage: null
  });
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showPpmpSuccessMessage, setShowPpmpSuccessMessage] = useState(false);
  const [ppmpSuccessMessage, setPpmpSuccessMessage] = useState("");
  const [itemProofImages, setItemProofImages] = useState(() => {
    const saved = localStorage.getItem("itemProofImages");
    return saved ? JSON.parse(saved) : {};
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

  // ✅ FETCH USER DEPARTMENT FROM FIRESTORE
  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (!userKey) return;
      try {
        const result = await getUserDocument(userKey);
        if (result.success && result.data?.department) {
          console.log("✅ User department loaded from Firestore:", result.data.department);
          setUserDepartment(result.data.department);
        }
      } catch (error) {
        console.warn("⚠️ Could not fetch user department from Firestore:", error.message);
      }
    };
    fetchUserDepartment();
  }, [userKey]);

  // ✅ LOAD OFFICE TEMPLATE BASED ON USER DEPARTMENT
  useEffect(() => {
    if (userDepartment && ppmpOfficeTemplates.length > 0) {
      const deptLower = userDepartment.toLowerCase();
      const template = ppmpOfficeTemplates.find(t => t.officeCode.toLowerCase() === deptLower);
      if (template) {
        setCurrentOfficeTemplate(template);
        console.log("✅ Office template loaded for department:", userDepartment, template);
      }
    }
  }, [userDepartment, ppmpOfficeTemplates]);

  // ✅ LISTEN FOR PPMP OFFICE TEMPLATES UPDATES
  useEffect(() => {
    const handleTemplatesUpdate = (event) => {
      setPpmpOfficeTemplates(event.detail);
      console.log("🔄 PPMP Office Templates updated from admin");
    };
    window.addEventListener("ppmpOfficeTemplatesUpdated", handleTemplatesUpdate);
    return () => window.removeEventListener("ppmpOfficeTemplatesUpdated", handleTemplatesUpdate);
  }, []);

  // ✅ PERSIST PPMP USER INSTANCES AND SYNC WITH ADMIN
  useEffect(() => {
    try {
      localStorage.setItem("ppmpUserInstances", JSON.stringify(ppmpUserInstances));
      // Broadcast to admin dashboard
      window.dispatchEvent(new CustomEvent("ppmpUserInstancesUpdated", { detail: ppmpUserInstances }));
      console.log("💾 PPMP User Instances saved and synced with admin");
    } catch (err) {
      console.warn("⚠️ Could not save PPMP user instances:", err.message);
    }
  }, [ppmpUserInstances]);

  // ✅ PERSIST PROOF IMAGES
  useEffect(() => {
    try {
      localStorage.setItem("itemProofImages", JSON.stringify(itemProofImages));
      console.log("💾 Item Proof Images saved");
    } catch (err) {
      console.warn("⚠️ Could not save proof images:", err.message);
    }
  }, [itemProofImages]);

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
    if (!requestingUser.trim()) {
      setError("Requesting user name is required before uploading documents.");
      return false;
    }
    if (!userDepartment) {
      setError("Department is not set for your account. Please contact the administrator.");
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
            department: normalizeDepartment(userDepartment),
            requestingUser: requestingUser.trim(),
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
        <div 
          style={view === "templates" ? styles.navActive : styles.nav}
          onClick={() => setView("templates")}
        >
          Templates
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
              : view === "templates"
              ? "Document Templates"
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

              {/* DEPARTMENT DISPLAY */}
              <input
                type="text"
                disabled
                value={userDepartment || "No department assigned"}
                placeholder="Department"
                style={{
                  ...styles.input,
                  backgroundColor: "#f5f5f5",
                  color: userDepartment ? "#333" : "#999",
                }}
              />

              {/* REQUESTING USER INPUT */}
              <input
                type="text"
                placeholder="Enter the name of the user requesting this document"
                value={requestingUser}
                onChange={(e) => {
                  setRequestingUser(e.target.value);
                  if (error) setError("");
                }}
                style={{
                  ...styles.input,
                  ...(error && !requestingUser ? styles.inputError : {}),
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
                    <th>Requesting User</th>
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
                      <td>{f.requestingUser}</td>
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
                          <th>Requesting User</th>
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
                            <td>{f.requestingUser}</td>
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
                          <th>Requesting User</th>
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
                            <td>{f.requestingUser}</td>
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
                          <th>Requesting User</th>
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
                            <td>{f.requestingUser}</td>
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
          <li>Your department is automatically set from your account profile</li>
          <li>Enter the name of the user requesting this document</li>
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

      {/* 7 — SUPPORT */}
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

        {/* TEMPLATES VIEW */}
        {view === "templates" && (
          <>
            <div style={styles.card}>
              <h3>Document Templates</h3>
              <p style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
                Download and use the official BAC-approved templates below to ensure correct formatting and faster approval.
              </p>

              {docTemplates.length > 0 ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: "16px"
                }}>
                  {docTemplates.map((template) => (
                    <div key={template.id} style={{
                      border: "2px solid #ddd",
                      borderRadius: "8px",
                      padding: "16px",
                      background: "#fff",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.borderColor = maroon;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "#ddd";
                    }}>
                      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ fontSize: 24 }}>📄</span>
                      </div>
                      <h5 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: 600, color: "#333", lineHeight: 1.3 }}>{template.name}</h5>
                      {template.description && (
                        <p style={{ fontSize: "13px", color: "#666", marginBottom: "14px", lineHeight: 1.4 }}>{template.description}</p>
                      )}
                      <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = template.fileData;
                          link.download = template.name;
                          link.click();
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "10px 12px",
                          background: maroon,
                          color: "#fff",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "center"
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                        onMouseLeave={(e) => e.target.style.opacity = "1"}
                      >
                         Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  backgroundColor: "#fef2f2",
                  border: "2px dashed #fca5a5",
                  borderRadius: 8,
                  padding: 40,
                  textAlign: "center"
                }}>
                  <p style={{ fontSize: 16, color: "#991b1b", fontWeight: 500, margin: "0 0 8px 0" }}>📋 No Templates Available</p>
                  <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>Document templates will appear here once the admin uploads them.</p>
                </div>
              )}
            </div>

            <div style={styles.card}>
              <h3>How to Use Templates</h3>
              <ul style={styles.guidelineList}>
                <li>Download the template that matches your document type</li>
                <li>Fill in the required information following the format guidelines</li>
                <li>Ensure all mandatory fields are completed</li>
                <li>Save your file with a descriptive name</li>
                <li>Upload your completed document in the "Document Submission" section</li>
              </ul>
            </div>

            <div style={{...styles.card, backgroundColor: "#f0fdf4", borderLeft: `4px solid ${maroon}`}}>
              <h3 style={{ marginTop: 0, color: maroon }}>💡 Pro Tips</h3>
              <ul style={{...styles.guidelineList, margin: 0}}>
                <li>Using official templates significantly speeds up the approval process</li>
                <li>Keep a copy of your submitted documents for your records</li>
                <li>If you have questions about template usage, contact support</li>
              </ul>
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
                View and manage your office's PPMP items and track completion status.
              </p>
            </div>

            {currentOfficeTemplate ? (
              <>
                <div style={styles.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
                    <div>
                      <h3 style={{ margin: 0, color: maroon }}>{currentOfficeTemplate.officeName}</h3>
                      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#666" }}>
                        {currentOfficeTemplate.items.length} PPMP Items
                      </p>
                    </div>
                    <button
                      style={{
                        padding: "8px 16px",
                        borderRadius: 4,
                        border: "none",
                        background: maroon,
                        color: "white",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        transition: "0.2s"
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                      onMouseLeave={(e) => e.target.style.opacity = "1"}
                      onClick={() => {
                        setNewPpmpItem({ name: "", status: "No PPMP", dueDate: "", description: "" });
                        setShowAddItemModal(true);
                      }}
                    >
                      + Add Item
                    </button>
                  </div>

                  {currentOfficeTemplate.items.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, marginTop: 20 }}>
                      {currentOfficeTemplate.items.map((item, idx) => {
                        const userKey = `${currentOfficeTemplate.officeCode}_${item.id}`;
                        const userInstance = ppmpUserInstances[userKey] || {};
                        const currentStatus = userInstance.status || item.status;
                        const lastUpdatedBy = userInstance.lastUpdatedBy;
                        const lastUpdatedAt = userInstance.lastUpdatedAt ? new Date(userInstance.lastUpdatedAt).toLocaleString() : null;
                        const createdBy = item.createdBy || "Unknown";
                        const canDeleteItem = createdBy === currentUser?.email;
                        
                        const statusColor = currentStatus === "Complete" 
                          ? { bg: "#ecfdf5", border: "#6ee7b7", text: "#047857" }
                          : currentStatus === "In Progress"
                          ? { bg: "#eff6ff", border: "#93c5fd", text: "#0284c7" }
                          : currentStatus === "Incomplete"
                          ? { bg: "#fefce8", border: "#fde047", text: "#92400e" }
                          : { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b" };

                        return (
                          <div 
                            key={item.id} 
                            style={{ 
                              border: `2px solid ${statusColor.border}`,
                              borderRadius: 12, 
                              padding: 20, 
                              backgroundColor: statusColor.bg,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                              transition: "all 0.3s ease",
                              display: "flex",
                              flexDirection: "column",
                              height: "100%"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.12)";
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            {/* Status Badge */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>Item #{idx + 1}</span>
                              <span style={{
                                display: "inline-block",
                                padding: "6px 14px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 700,
                                backgroundColor: statusColor.border,
                                color: "white",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                boxShadow: `0 2px 4px ${statusColor.border}40`
                              }}>
                                {currentStatus}
                              </span>
                            </div>

                            {/* Item Title */}
                            <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: statusColor.text, lineHeight: 1.3, marginBottom: 12 }}>
                              {item.name}
                            </h4>

                            {/* Item Description */}
                            {item.description && (
                              <p style={{ margin: 0, fontSize: 13, color: "#555", fontStyle: "italic", lineHeight: 1.5, marginBottom: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 6, borderLeft: `3px solid ${statusColor.border}` }}>
                                {item.description}
                              </p>
                            )}

                            {/* Details Section */}
                            <div style={{ backgroundColor: "rgba(255,255,255,0.7)", padding: 14, borderRadius: 8, marginBottom: 18, fontSize: 13 }}>
                              {/* Due Date */}
                              {item.dueDate && (
                                <div style={{ marginBottom: 12 }}>
                                  <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase" }}>Due Date</p>
                                  <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 500, color: "#333" }}>{new Date(item.dueDate).toLocaleDateString()}</p>
                                </div>
                              )}
                              
                              {/* Created By */}
                              <div>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#999", textTransform: "uppercase" }}>Created By</p>
                                <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 500, color: "#333" }}>{createdBy}</p>
                              </div>
                            </div>

                            {/* Last Updated */}
                            {lastUpdatedAt && (
                              <div style={{ marginBottom: 18, fontSize: 12, color: "#666", padding: "10px 12px", backgroundColor: "rgba(255,255,255,0.5)", borderRadius: 6, borderLeft: `2px solid ${statusColor.border}` }}>
                                <p style={{ margin: "0 0 2px 0", fontWeight: 500 }}>Last updated: {lastUpdatedAt}</p>
                                {lastUpdatedBy && <p style={{ margin: 0, fontSize: 11 }}>by {lastUpdatedBy}</p>}
                              </div>
                            )}

                            {/* Image Section */}
                            {item.proofImage && (
                              <div style={{ marginBottom: 18, padding: 12, backgroundColor: "rgba(255,255,255,0.8)", border: `1px dashed ${statusColor.border}`, borderRadius: 6 }}>
                                <p style={{ margin: "0 0 10px 0", fontSize: 11, fontWeight: 600, color: statusColor.text }}>Proof Image</p>
                                <img 
                                  src={item.proofImage} 
                                  alt="Proof" 
                                  style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 6, cursor: "pointer", border: `2px solid ${statusColor.border}` }} 
                                  onClick={() => window.open(item.proofImage, "_blank")} 
                                  title="Click to view full size" 
                                />
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: 12, marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${statusColor.border}40` }}>
                              <button
                                style={{
                                  padding: "11px 16px",
                                  borderRadius: 6,
                                  border: "none",
                                  background: statusColor.border,
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  transition: "all 0.2s",
                                  flex: 1,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.3
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = "0.85"}
                                onMouseLeave={(e) => e.target.style.opacity = "1"}
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditingItemData({
                                    name: item.name,
                                    status: currentStatus,
                                    dueDate: item.dueDate,
                                    description: item.description,
                                    proofImage: item.proofImage || null
                                  });
                                  setShowEditItemModal(true);
                                }}
                              >
                                Edit
                              </button>
                              {canDeleteItem && (
                                <button
                                  style={{
                                    padding: "11px 16px",
                                    borderRadius: 6,
                                    border: "none",
                                    background: "#fca5a5",
                                    color: "#7f1d1d",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    transition: "all 0.2s",
                                    flex: 1,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.3
                                  }}
                                  onMouseEnter={(e) => e.target.style.opacity = "0.85"}
                                  onMouseLeave={(e) => e.target.style.opacity = "1"}
                                  onClick={() => {
                                    setItemToDelete(item);
                                    setShowDeleteItemModal(true);
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ backgroundColor: "#fef2f2", padding: 20, borderRadius: 8, textAlign: "center", border: "2px dashed #fca5a5" }}>
                      <p style={{ margin: 0, fontSize: 15, color: "#991b1b", fontWeight: 500 }}>📝 No PPMP items added yet</p>
                      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#e3d5d5" }}>Click the "+ Add Item" button above to get started</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={styles.card}>
                <p style={{ textAlign: "center", color: "#999", padding: "20px" }}>
                  {userDepartment 
                    ? `No PPMP template found for your department (${userDepartment}). Please contact BAC admin.`
                    : "Your department information is not set. Please contact BAC admin."}
                </p>
              </div>
            )}
          </>
        )}

        {/* EDIT PPMP ITEM MODAL */}
        {showEditItemModal && currentOfficeTemplate && (
          <div style={styles.modalOverlay}>
            <div style={{ ...styles.modal, maxWidth: 500 }}>
              <h3 style={{ ...styles.modalTitle, marginBottom: 20, borderBottom: `2px solid ${maroon}`, paddingBottom: 12 }}>Edit PPMP Item</h3>
              
              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Item Name</label>
                <input
                  type="text"
                  value={editingItemData.name}
                  onChange={(e) => setEditingItemData({ ...editingItemData, name: e.target.value })}
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                  disabled
                />
                <p style={{ fontSize: 12, color: "#999", marginTop: 6, marginBottom: 0 }}>Read-only</p>
              </div>

              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Status *</label>
                <select
                  value={editingItemData.status}
                  onChange={(e) => setEditingItemData({ ...editingItemData, status: e.target.value })}
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                >
                  <option value="No PPMP">No PPMP</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Incomplete">Incomplete</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Due Date</label>
                <input
                  type="date"
                  value={editingItemData.dueDate}
                  onChange={(e) => setEditingItemData({ ...editingItemData, dueDate: e.target.value })}
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                  disabled
                />
                <p style={{ fontSize: 12, color: "#999", marginTop: 6, marginBottom: 0 }}>Read-only</p>
              </div>

              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Description</label>
                <textarea
                  value={editingItemData.description}
                  onChange={(e) => setEditingItemData({ ...editingItemData, description: e.target.value })}
                  style={{ 
                    ...styles.textarea, 
                    height: 100,
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    fontFamily: "inherit",
                    fontSize: 14,
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    resize: "vertical"
                  }}
                  disabled
                />
                <p style={{ fontSize: 12, color: "#999", marginTop: 6, marginBottom: 0 }}>Read-only</p>
              </div>

              <div style={{ ...styles.modalButtons, marginTop: 24, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowEditItemModal(false);
                    setEditingItemId(null);
                    setEditingItemData({ name: "", status: "No PPMP", dueDate: "", description: "", proofImage: null });
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{ ...styles.button, background: maroon, flex: 1, color: "white" }}
                  onClick={() => {
                    const updated = ppmpOfficeTemplates.map(t =>
                      t.id === currentOfficeTemplate.id
                        ? {
                            ...t,
                            items: t.items.map(i =>
                              i.id === editingItemId
                                ? { ...i, status: editingItemData.status }
                                : i
                            )
                          }
                        : t
                    );
                    setPpmpOfficeTemplates(updated);
                    localStorage.setItem("ppmpOfficeTemplates", JSON.stringify(updated));
                    
                    // Create/update user instance tracking
                    const userKey = `${currentOfficeTemplate.officeCode}_${editingItemId}`;
                    const updatedInstances = {
                      ...ppmpUserInstances,
                      [userKey]: {
                        itemId: editingItemId,
                        itemName: editingItemData.name,
                        officeCode: currentOfficeTemplate.officeCode,
                        officeName: currentOfficeTemplate.officeName,
                        userEmail: userKey.split("_")[0],
                        status: editingItemData.status,
                        lastUpdatedBy: currentUser?.email || "User",
                        lastUpdatedAt: new Date().toISOString()
                      }
                    };
                    setPpmpUserInstances(updatedInstances);
                    
                    setShowEditItemModal(false);
                    setEditingItemId(null);
                    setEditingItemData({ name: "", status: "No PPMP", dueDate: "", description: "", proofImage: null });
                    
                    // Show success message
                    setPpmpSuccessMessage(`✓ Status updated for "${editingItemData.name}"`);
                    setShowPpmpSuccessMessage(true);
                    setTimeout(() => setShowPpmpSuccessMessage(false), 3000);
                  }}
                >
                  Save Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD PPMP ITEM MODAL */}
        {showAddItemModal && currentOfficeTemplate && (
          <div style={styles.modalOverlay}>
            <div style={{ ...styles.modal, maxWidth: 500 }}>
              <h3 style={{ ...styles.modalTitle, marginBottom: 20, borderBottom: `2px solid ${maroon}`, paddingBottom: 12 }}>Add New PPMP Item</h3>
              
              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Budget Submission"
                  value={newPpmpItem.name}
                  onChange={(e) => setNewPpmpItem({ ...newPpmpItem, name: e.target.value })}
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Initial Status *</label>
                <select
                  value={newPpmpItem.status}
                  onChange={(e) => setNewPpmpItem({ ...newPpmpItem, status: e.target.value })}
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                >
                  <option value="No PPMP">No PPMP</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Incomplete">Incomplete</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Due Date</label>
                <input
                  type="date"
                  value={newPpmpItem.dueDate}
                  onChange={(e) => setNewPpmpItem({ ...newPpmpItem, dueDate: e.target.value })}
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Description</label>
                <textarea
                  placeholder="Optional description for this PPMP item"
                  value={newPpmpItem.description}
                  onChange={(e) => setNewPpmpItem({ ...newPpmpItem, description: e.target.value })}
                  style={{ 
                    ...styles.textarea, 
                    height: 100,
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 10,
                    fontFamily: "inherit",
                    fontSize: 14,
                    border: "1px solid #ddd",
                    borderRadius: 6,
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={{ ...styles.label, display: "block", marginBottom: 6, fontWeight: 600, color: "#333" }}>Proof Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const imageData = event.target.result;
                        setNewPpmpItem({ ...newPpmpItem, proofImage: imageData });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ ...styles.input, width: "100%", boxSizing: "border-box" }}
                />
                <p style={{ fontSize: 12, color: "#999", marginTop: 6, marginBottom: 0 }}>💡 Optional: Upload an image as proof for this PPMP item</p>
                
                {newPpmpItem.proofImage && (
                  <div style={{ marginTop: 12, padding: 12, backgroundColor: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: 6 }}>
                    <p style={{ margin: "0 0 10px 0", fontSize: 12, fontWeight: 600, color: "#166534", display: "flex", alignItems: "center", gap: 6 }}>
                      ✓ Preview
                    </p>
                    <img src={newPpmpItem.proofImage} alt="Proof" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 4, border: "1px solid #dcfce7" }} />
                  </div>
                )}
              </div>

              <div style={{ ...styles.modalButtons, marginTop: 24, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowAddItemModal(false);
                    setNewPpmpItem({ name: "", status: "No PPMP", dueDate: "", description: "", proofImage: null });
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{ ...styles.button, background: maroon, flex: 1, color: "white" }}
                  onClick={() => {
                    if (!newPpmpItem.name.trim()) {
                      alert("Please enter an item name");
                      return;
                    }

                    const newItem = {
                      id: Date.now(),
                      name: newPpmpItem.name.trim(),
                      status: newPpmpItem.status,
                      dueDate: newPpmpItem.dueDate,
                      description: newPpmpItem.description.trim(),
                      proofImage: newPpmpItem.proofImage || null,
                      createdBy: currentUser?.email || "User",
                      createdAt: new Date().toISOString()
                    };

                    const updated = ppmpOfficeTemplates.map(t =>
                      t.id === currentOfficeTemplate.id
                        ? {
                            ...t,
                            items: [...t.items, newItem]
                          }
                        : t
                    );
                    setPpmpOfficeTemplates(updated);
                    localStorage.setItem("ppmpOfficeTemplates", JSON.stringify(updated));
                    
                    // Initialize user instance for the new item
                    const userKey = `${currentOfficeTemplate.officeCode}_${newItem.id}`;
                    const updatedInstances = {
                      ...ppmpUserInstances,
                      [userKey]: {
                        itemId: newItem.id,
                        itemName: newItem.name,
                        officeCode: currentOfficeTemplate.officeCode,
                        officeName: currentOfficeTemplate.officeName,
                        status: newItem.status,
                        lastUpdatedBy: currentUser?.email || "User",
                        lastUpdatedAt: new Date().toISOString()
                      }
                    };
                    setPpmpUserInstances(updatedInstances);
                    
                    setShowAddItemModal(false);
                    setNewPpmpItem({ name: "", status: "No PPMP", dueDate: "", description: "", proofImage: null });
                    setPpmpSuccessMessage(`✓ Successfully added "${newItem.name}" to PPMP`);
                    setShowPpmpSuccessMessage(true);
                    setTimeout(() => setShowPpmpSuccessMessage(false), 3000);
                  }}
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE PPMP ITEM MODAL */}
        {showDeleteItemModal && itemToDelete && (
          <div style={styles.modalOverlay}>
            <div style={{ ...styles.modal, maxWidth: 500 }}>
              <h3 style={{ ...styles.modalTitle, marginBottom: 20, borderBottom: `2px solid ${maroon}`, paddingBottom: 12 }}>Delete PPMP Item</h3>
              <div style={{ backgroundColor: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 8, padding: 16, marginBottom: 24 }}>
                <p style={{ margin: 0, fontSize: 14, color: "#991b1b", lineHeight: 1.5 }}>
                  ⚠️ Are you sure you want to delete <strong>"{itemToDelete.name}"</strong>?
                </p>
                <p style={{ margin: "12px 0 0", fontSize: 13, color: "#dc2626" }}>This action cannot be undone.</p>
              </div>
              <div style={{ ...styles.modalButtons, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowDeleteItemModal(false);
                    setItemToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{ ...styles.button, background: "#ef4444", flex: 1, color: "white" }}
                  onClick={() => {
                    const updated = ppmpOfficeTemplates.map(t =>
                      t.id === currentOfficeTemplate.id
                        ? {
                            ...t,
                            items: t.items.filter(i => i.id !== itemToDelete.id)
                          }
                        : t
                    );
                    setPpmpOfficeTemplates(updated);
                    localStorage.setItem("ppmpOfficeTemplates", JSON.stringify(updated));
                    
                    // Remove user instance for deleted item
                    const userKey = `${currentOfficeTemplate.officeCode}_${itemToDelete.id}`;
                    const updatedInstances = { ...ppmpUserInstances };
                    delete updatedInstances[userKey];
                    setPpmpUserInstances(updatedInstances);
                    
                    setShowDeleteItemModal(false);
                    setItemToDelete(null);
                    setPpmpSuccessMessage(`✓ "${itemToDelete.name}" has been deleted`);
                    setShowPpmpSuccessMessage(true);
                    setTimeout(() => setShowPpmpSuccessMessage(false), 3000);
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showConfirmModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>Confirm Upload</h3>
              <p style={styles.modalSubtitle}>
                You are about to upload {filesToUpload.length} file{filesToUpload.length !== 1 ? 's' : ''} from the {userDepartment} department for {requestingUser}.
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
                <p><strong>Requesting User:</strong> {selectedFile.requestingUser || "N/A"}</p>
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

        {/* PPMP SUCCESS TOAST NOTIFICATION */}
        {showPpmpSuccessMessage && (
          <div style={styles.ppmpSuccessToast}>
            <span style={{ marginRight: 12 }}>✓</span>
            <span>{ppmpSuccessMessage}</span>
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
    padding: "56px 48px",
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
    margin: "0 auto 28px",
  },

  loadingTitle: {
    color: maroon,
    fontSize: "22px",
    fontWeight: 600,
    margin: "0 0 16px 0",
  },

  uploadProgressText: {
    color: "#666",
    fontSize: "14px",
    margin: "0 0 24px 0",
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
    marginBottom: 12,
    cursor: "pointer",
    borderRadius: 8,
    fontSize: 15,
    transition: "all 0.2s",
  },

  navActive: {
    padding: "14px 16px",
    background: "#5c0013",
    borderRadius: 8,
    marginBottom: 12,
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
    marginBottom: 48,
    borderBottom: "2px solid #ddd",
    paddingBottom: 24,
  },

  schoolYear: { fontWeight: 600, fontSize: 17 },

  card: {
    background: "white",
    padding: 40,
    borderTop: `6px solid ${maroon}`,
    borderRadius: 12,
    marginBottom: 40,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  errorBox: {
    background: "#fdecea",
    color: "#a60000",
    padding: "18px 20px",
    borderRadius: 8,
    marginBottom: 24,
    borderLeft: "5px solid #a60000",
    fontSize: 14,
  },

  input: {
    width: "100%",
    padding: 15,
    borderRadius: 8,
    border: "1px solid #ddd",
    marginBottom: 20,
    fontSize: 14,
  },

  inputError: {
    borderColor: "#a60000",
    background: "#fff5f5",
  },

  dropZone: {
    padding: 56,
    border: "2px dashed #ddd",
    borderRadius: 12,
    textAlign: "center",
    cursor: "pointer",
    background: "#fafafa",
    transition: "0.2s",
    marginBottom: 24,
  },

  dropZoneActive: {
    borderColor: maroon,
    background: "#fff0f3",
  },

  dropZoneError: {
    borderColor: "#a60000",
  },

  dropHint: {
    fontSize: 15,
    color: "#666",
    marginTop: 12,
  },

  tableBox: {
    background: "white",
    padding: 36,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: 36,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  tableRow: {
    borderBottom: "1px solid #f0f0f0",
  },

  tableHeader: {
    padding: "18px 16px",
    backgroundColor: "#f8f9fa",
    borderBottom: "2px solid #e9ecef",
    fontWeight: 600,
    fontSize: 15,
    color: "#333",
    textAlign: "left",
  },

  tableCell: {
    padding: "16px 14px",
    fontSize: 14,
    color: "#333",
    borderBottom: "1px solid #f0f0f0",
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
    padding: "10px 20px",
    borderRadius: 20,
    fontSize: 14,
    display: "inline-block",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },

  pending: {
    background: "#fff3cd",
    color: "#856404",
    padding: "10px 20px",
    borderRadius: 20,
    fontSize: 14,
    display: "inline-block",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },

  declined: {
    background: "#f8d7da",
    color: "#721c24",
    padding: "10px 20px",
    borderRadius: 20,
    fontSize: 14,
    display: "inline-block",
    whiteSpace: "nowrap",
    fontWeight: 500,
  },

  note: {
    fontSize: 15,
    color: "#666",
    marginTop: 20,
    lineHeight: 1.7,
  },

  guidelineIntro: {
    fontSize: 16,
    color: "#333",
    marginBottom: 32,
    lineHeight: 1.8,
  },

  guidelineSection: {
    marginBottom: 36,
    paddingBottom: 28,
    borderBottom: "1px solid #eee",
  },

  guidelineTitle: {
    fontSize: 19,
    fontWeight: 700,
    color: maroon,
    marginBottom: 18,
    marginTop: 0,
  },

  guidelineList: {
    marginLeft: 32,
    marginTop: 16,
    color: "#555",
    lineHeight: 2.1,
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
    marginBottom: 40,
    paddingBottom: 28,
    borderBottom: "1px solid #eee",
  },

  aboutTitle: {
    fontSize: 19,
    fontWeight: 700,
    color: maroon,
    marginBottom: 18,
    marginTop: 0,
  },

  aboutText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 2,
    margin: "0 0 20px 0",
  },

  valuesContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 24,
    marginTop: 24,
  },

  valueCard: {
    background: "#f9f9f9",
    padding: 24,
    borderRadius: 10,
    border: `3px solid ${maroon}`,
    textAlign: "center",
  },

  valueTitle: {
    fontSize: 17,
    fontWeight: 700,
    color: maroon,
    margin: "0 0 14px 0",
  },

  valueText: {
    fontSize: 14,
    color: "#666",
    margin: 0,
    lineHeight: 1.8,
  },

  staffContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 28,
    marginTop: 28,
  },

  staffMember: {
    textAlign: "center",
    padding: 24,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    border: "1px solid #ddd",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
  },

  staffPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: "50%",
    background: maroon,
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 18px",
    fontSize: 18,
  },

  staffImage: {
    width: 110,
    height: 110,
    borderRadius: "50%",
    objectFit: "cover",
    margin: "0 auto 18px",
    display: "block",
  },

  staffInitial: {
    fontSize: 36,
    fontWeight: "bold",
  },

  staffName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#333",
    margin: "14px 0 8px 0",
  },

  staffPosition: {
    fontSize: 13,
    color: maroon,
    fontWeight: 600,
    margin: "0 0 12px 0",
  },

  staffEmail: {
    fontSize: 13,
    color: "#666",
    margin: 0,
    wordBreak: "break-all",
  },

  settingsSection: {
    marginBottom: 36,
  },

  settingsTitle: {
    fontSize: 19,
    fontWeight: 600,
    color: maroon,
    margin: "0 0 20px 0",
  },

  settingsDescription: {
    fontSize: 15,
    color: "#666",
    margin: "0 0 20px 0",
    lineHeight: 1.8,
  },

  profileInputGroup: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    marginBottom: 32,
  },

  passwordInputGroup: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    marginBottom: 32,
  },

  inputWrapper: {
    display: "flex",
    flexDirection: "column",
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#333",
    marginBottom: 10,
  },

  settingsInput: {
    padding: 14,
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "Segoe UI",
    transition: "border-color 0.2s",
  },

  messageBox: {
    padding: 18,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 15,
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
    padding: "12px 28px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
  },

  resetPasswordButton: {
    color: "white",
    background: maroon,
    padding: "12px 28px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
  },

  emptyMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    padding: "28px 0",
    fontStyle: "italic",
  },

  footer: {
    marginTop: 48,
    paddingTop: 28,
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
    padding: 44,
    borderRadius: 14,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    minWidth: 450,
    maxWidth: 550,
    maxHeight: "90vh",
    overflowY: "auto",
  },

  fileModal: {
    background: "white",
    padding: 44,
    borderRadius: 14,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
    minWidth: 520,
    maxWidth: 950,
    maxHeight: "90vh",
    overflowY: "auto",
  },

  modalTitle: {
    margin: "0 0 14px 0",
    fontSize: 26,
    fontWeight: 700,
    color: "#721c24",
  },

  modalTitleSuccess: {
    margin: "0 0 14px 0",
    fontSize: 26,
    fontWeight: 700,
    color: "#137333",
  },

  modalSubtitle: {
    margin: "0 0 24px 0",
    fontSize: 15,
    color: "#666",
    lineHeight: 1.8,
  },

  reasonBox: {
    background: "#fff5f5",
    padding: 24,
    borderRadius: 8,
    border: "1px solid #f8d7da",
    marginBottom: 28,
    lineHeight: 1.9,
    color: "#333",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    fontSize: 14,
  },

  modalButtons: {
    display: "flex",
    gap: 18,
    marginTop: 32,
    justifyContent: "flex-end",
  },

  cancelButton: {
    color: "white",
    background: "#999",
    padding: "12px 28px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
    transition: "all 0.2s",
  },

  confirmButton: {
    color: "white",
    background: "#22c55e",
    padding: "12px 28px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
    transition: "all 0.2s",
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
    marginBottom: "28px",
  },

  approvedFilesList: {
    background: "#e6f4ea",
    padding: 24,
    borderRadius: 8,
    marginBottom: 28,
    border: "1px solid #34a853",
  },

  approvedFileItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 0",
    color: "#137333",
    fontSize: 15,
  },

  checkmark: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#34a853",
  },

  autoCloseHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    margin: "16px 0 24px 0",
    fontStyle: "italic",
  },

  okButton: {
  },

  closeButton: {
  },

  fileInfoBox: {
    background: "#f9f9f9",
    padding: 24,
    borderRadius: 8,
    border: "1px solid #ddd",
    marginBottom: 28,
    lineHeight: 2,
    fontSize: 15,
  },

  downloadButton: {
  },

  noFileMessage: {
    color: "#666",
    fontSize: 15,
    marginBottom: 20,
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
    padding: 24,
    marginBottom: 28,
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
    padding: 28,
    marginBottom: 28,
    textAlign: "center",
  },

  noFileDataMessage: {
    color: "#856404",
    fontSize: 16,
    marginBottom: 10,
    margin: "0 0 14px 0",
  },

  reuploadHint: {
    color: "#856404",
    fontSize: 14,
    marginBottom: 0,
    margin: 0,
  },

  ppmpContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 28,
    marginBottom: 24,
  },

  ppmpCard: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderLeft: "5px solid #22c55e",
    borderRadius: 12,
    padding: 28,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
    transition: "all 0.3s ease",
  },

  ppmpHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    gap: 14,
  },

  ppmpDepartment: {
    fontSize: 19,
    fontWeight: 700,
    color: maroon,
    margin: 0,
    flex: 1,
  },

  ppmpStatus: {
    padding: "8px 16px",
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    color: "white",
    whiteSpace: "nowrap",
  },

  ppmpDescription: {
    fontSize: 15,
    color: "#555",
    margin: 0,
    lineHeight: 1.8,
  },

  cardDescription: {
    fontSize: 15,
    color: "#666",
    margin: "12px 0 0 0",
    lineHeight: 1.8,
  },

  ppmpSuccessToast: {
    position: "fixed",
    bottom: 28,
    right: 28,
    background: "#e6f4ea",
    color: "#137333",
    border: "1px solid #34a853",
    padding: "16px 24px",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    fontSize: 15,
    fontWeight: 500,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    zIndex: 2000,
    animation: "slideInUp 0.3s ease-out",
  },
};
