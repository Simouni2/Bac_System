import { useState, useMemo, useEffect } from "react";
import { adminCreateUser } from "./firebase/authService";
import { createUserDocument, saveAccountRequest, getAllAccountRequests, updateAccountRequestStatus, getAllCreatedAccounts } from "./firebase/userService";

const maroon = "#7a0019";
const PPMP_VERIFIER_EMAIL = "bacadmin@gmail.com";

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

export default function BACDashboard({ files, setFiles }) {
  // Get current user from localStorage
  const [currentUser] = useState(() => {
    const saved = localStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState("dashboard"); // dashboard | archive | department | ppmp
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("latest"); // latest | oldest
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processing...");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // PPMP STATES
  const [ppmpDepartments, setPpmpDepartments] = useState(() => {
    const saved = localStorage.getItem("ppmpDepartments");
    return saved ? JSON.parse(saved) : [];
  });
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [allUsers, setAllUsers] = useState(() => {
    const saved = localStorage.getItem("bacUsers");
    return saved ? JSON.parse(saved) : [];
  });
  const [userPPMPStatuses, setUserPPMPStatuses] = useState(() => {
    const saved = localStorage.getItem("userPPMPStatuses");
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [showPPMPUpdateModal, setShowPPMPUpdateModal] = useState(false);
  const [ppmpUpdateDept, setPpmpUpdateDept] = useState("");
  const [ppmpUpdateStatus, setPpmpUpdateStatus] = useState("No PPMP");

  // BAC TEAM MANAGEMENT STATES
  const [bacTeamMembers, setBacTeamMembers] = useState(() => {
    const saved = localStorage.getItem("bacTeamMembers");
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddTeamMemberModal, setShowAddTeamMemberModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [teamMemberForm, setTeamMemberForm] = useState({
    name: "",
    position: "",
    email: "",
    image: ""
  });

  // DOCUMENT TEMPLATES STATES
  const [docTemplates, setDocTemplates] = useState(() => {
    const saved = localStorage.getItem("docTemplates");
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    fileData: ""
  });

  // ACCOUNT CREATION STATES
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState([]);
  const [accountForm, setAccountForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user"
  });
  const [accountError, setAccountError] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountRequests, setAccountRequests] = useState(() => {
    const saved = localStorage.getItem("accountRequests");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [isLoadingFromFirestore, setIsLoadingFromFirestore] = useState(false);
  const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  
  // Delete confirmation modals
  const [showDeleteTeamMemberModal, setShowDeleteTeamMemberModal] = useState(false);
  const [teamMemberToDelete, setTeamMemberToDelete] = useState(null);
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  // ✅ DEBUG: Log when files prop changes
  useEffect(() => {
    console.log("📊 Admin - Files prop updated:", files?.length || 0, "files", files);
  }, [files]);

  // ✅ SYNC FILES TO LOCALSTORAGE ONLY (Firestore is the single source of truth)
  useEffect(() => {
    try {
      const filesMetadata = files.map(file => {
        // Create a copy without the large fileData
        const { fileData, ...metadata } = file;
        return metadata;
      });
      // Save to localStorage as backup
      localStorage.setItem("bacFiles", JSON.stringify(filesMetadata));
      localStorage.setItem("bacFiles_backup", JSON.stringify(filesMetadata));
      localStorage.setItem("bacFiles_lastUpdate", new Date().toISOString());
      console.log("💾 Admin - Files synced to localStorage:", filesMetadata.length, "files");
    } catch (err) {
      console.warn("⚠️ Error syncing files:", err.message);
    }
  }, [files]);

  // ✅ LOAD ACCOUNT REQUESTS FROM FIRESTORE ON ADMIN MOUNT
  useEffect(() => {
    const loadAccountRequestsFromFirestore = async () => {
      try {
        const result = await getAllAccountRequests();
        if (result.success) {
          setAccountRequests(result.data);
          localStorage.setItem("accountRequests", JSON.stringify(result.data));
          console.log("✅ Admin - Account requests loaded from Firestore:", result.data.length);
        } else {
          console.log("⚠️ No account requests in Firestore");
          setAccountRequests([]);
        }
      } catch (err) {
        console.warn("⚠️ Could not load account requests from Firestore:", err.message);
      }
    };
    
    loadAccountRequestsFromFirestore();
  }, []);

  // ✅ LOAD CREATED ACCOUNTS FROM FIRESTORE ON ADMIN MOUNT
  useEffect(() => {
    const loadCreatedAccountsFromFirestore = async () => {
      try {
        const result = await getAllCreatedAccounts();
        if (result.success && result.data.length > 0) {
          const formattedAccounts = result.data.map(account => ({
            id: account.uid || account.id,
            firstName: account.firstName || "",
            lastName: account.lastName || "",
            email: account.email || "",
            role: account.role || "user",
            createdBy: account.createdBy || "admin",
            createdDate: account.createdAt || new Date().toISOString()
          }));
          setCreatedAccounts(formattedAccounts);
          localStorage.setItem("createdAccounts", JSON.stringify(formattedAccounts));
          console.log("✅ Admin - Created accounts loaded from Firestore:", formattedAccounts.length);
        }
      } catch (err) {
        console.warn("⚠️ Could not load created accounts from Firestore:", err.message);
      }
    };
    
    loadCreatedAccountsFromFirestore();
  }, []);

  // ✅ PERSIST PPMP DEPARTMENTS
  useEffect(() => {
    try {
      localStorage.setItem("ppmpDepartments", JSON.stringify(ppmpDepartments));
      console.log("💾 PPMP Departments saved:", ppmpDepartments.length);
    } catch (err) {
      console.warn("⚠️ Could not save PPMP departments:", err.message);
    }
  }, [ppmpDepartments]);

  // ✅ PERSIST USER PPMP STATUSES
  useEffect(() => {
    try {
      localStorage.setItem("userPPMPStatuses", JSON.stringify(userPPMPStatuses));
      console.log("💾 User PPMP statuses saved");
    } catch (err) {
      console.warn("⚠️ Could not save PPMP statuses:", err.message);
    }
  }, [userPPMPStatuses]);

  // ✅ PERSIST BAC TEAM MEMBERS
  useEffect(() => {
    try {
      localStorage.setItem("bacTeamMembers", JSON.stringify(bacTeamMembers));
      console.log("💾 BAC Team Members saved:", bacTeamMembers.length);
    } catch (err) {
      console.warn("⚠️ Could not save BAC team members:", err.message);
    }
  }, [bacTeamMembers]);

  // ✅ PERSIST DOCUMENT TEMPLATES
  useEffect(() => {
    try {
      localStorage.setItem("docTemplates", JSON.stringify(docTemplates));
      console.log("💾 Document Templates saved:", docTemplates.length);
    } catch (err) {
      console.warn("⚠️ Could not save document templates:", err.message);
    }
  }, [docTemplates]);

  // ✅ PERSIST CREATED ACCOUNTS
  useEffect(() => {
    try {
      localStorage.setItem("createdAccounts", JSON.stringify(createdAccounts));
      console.log("💾 Created Accounts saved:", createdAccounts.length);
    } catch (err) {
      console.warn("⚠️ Could not save created accounts:", err.message);
    }
  }, [createdAccounts]);

  // ✅ PERSIST ACCOUNT REQUESTS
  useEffect(() => {
    try {
      localStorage.setItem("accountRequests", JSON.stringify(accountRequests));
      console.log("💾 Account Requests saved:", accountRequests.length);
    } catch (err) {
      console.warn("⚠️ Could not save account requests:", err.message);
    }
  }, [accountRequests]);

  /* ===== UPDATE STATUS WITH LOADING ===== */
  const updateStatus = (index, status) => {
    setIsLoading(true);
    setLoadingMessage(`${status === "Approved" ? "Approving" : status === "Declined" ? "Declining" : "Processing"} file...`);
    
    setTimeout(() => {
      const updated = [...files];
      const fileName = updated[index].name;
      updated[index] = { ...updated[index], status }; 
      setFiles(updated);
      setIsLoading(false);
      setLoadingMessage("Processing...");
      
      // Show success modal
      const action = status === "Approved" ? "approved" : status === "Declined" ? "declined" : "processed";
      setSuccessMessage(`File "${fileName}" has been ${action} successfully!`);
      setShowSuccessModal(true);
    }, 1000);
  };

  /* ===== VIEW FILE ===== */
  const handleViewFile = (file) => {
    setSelectedFile(file);
    setShowFileModal(true);
  };

  // ===== BAC TEAM MANAGEMENT FUNCTIONS =====
  const handleSaveTeamMember = () => {
    if (!teamMemberForm.name.trim() || !teamMemberForm.position.trim()) {
      alert("Please fill in name and position");
      return;
    }

    if (editingMemberId !== null) {
      // Update existing member
      const updated = bacTeamMembers.map(m => 
        m.id === editingMemberId ? { ...teamMemberForm, id: editingMemberId } : m
      );
      setBacTeamMembers(updated);
    } else {
      // Add new member
      const newMember = {
        id: Date.now(),
        ...teamMemberForm
      };
      setBacTeamMembers([...bacTeamMembers, newMember]);
    }

    setTeamMemberForm({ name: "", position: "", email: "", image: "" });
    setEditingMemberId(null);
    setShowAddTeamMemberModal(false);
    setSuccessMessage(editingMemberId ? "Team member updated!" : "Team member added!");
    setShowSuccessModal(true);
  };

  const handleEditTeamMember = (member) => {
    setTeamMemberForm(member);
    setEditingMemberId(member.id);
    setShowAddTeamMemberModal(true);
  };

  const handleDeleteTeamMember = (id) => {
    const member = bacTeamMembers.find(m => m.id === id);
    setTeamMemberToDelete(member);
    setShowDeleteTeamMemberModal(true);
  };

  const confirmDeleteTeamMember = () => {
    if (teamMemberToDelete) {
      setBacTeamMembers(bacTeamMembers.filter(m => m.id !== teamMemberToDelete.id));
      setSuccessMessage("Team member deleted!");
      setShowSuccessModal(true);
      setShowDeleteTeamMemberModal(false);
      setTeamMemberToDelete(null);
    }
  };

  const cancelDeleteTeamMember = () => {
    setShowDeleteTeamMemberModal(false);
    setTeamMemberToDelete(null);
  };

  // DOCUMENT TEMPLATE FUNCTIONS
  const handleSaveTemplate = () => {
    if (!templateForm.name.trim()) {
      alert("Please enter a template name");
      return;
    }
    if (!templateForm.fileData) {
      alert("Please upload a file");
      return;
    }

    if (editingTemplateId) {
      // Edit existing template
      setDocTemplates(docTemplates.map(t => t.id === editingTemplateId ? { ...templateForm, id: editingTemplateId } : t));
      setSuccessMessage("Template updated successfully!");
    } else {
      // Add new template
      const newTemplate = {
        id: Date.now(),
        ...templateForm
      };
      setDocTemplates([...docTemplates, newTemplate]);
      setSuccessMessage("Template added successfully!");
    }
    
    setShowAddTemplateModal(false);
    setTemplateForm({ name: "", description: "", fileData: "" });
    setEditingTemplateId(null);
    setShowSuccessModal(true);
  };

  const handleEditTemplate = (template) => {
    setTemplateForm(template);
    setEditingTemplateId(template.id);
    setShowAddTemplateModal(true);
  };

  const handleDeleteTemplate = (id) => {
    const template = docTemplates.find(t => t.id === id);
    setTemplateToDelete(template);
    setShowDeleteTemplateModal(true);
  };

  const confirmDeleteTemplate = () => {
    if (templateToDelete) {
      setDocTemplates(docTemplates.filter(t => t.id !== templateToDelete.id));
      setSuccessMessage("Template deleted!");
      setShowSuccessModal(true);
      setShowDeleteTemplateModal(false);
      setTemplateToDelete(null);
    }
  };

  const cancelDeleteTemplate = () => {
    setShowDeleteTemplateModal(false);
    setTemplateToDelete(null);
  };

  const handleTemplateFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTemplateForm({ ...templateForm, fileData: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTeamMemberForm({ ...teamMemberForm, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const downloadFile = (file) => {
    if (file.fileData) {
      const link = document.createElement("a");
      link.href = file.fileData;
      link.download = file.name;
      link.click();
    }
  };

  // ===== ACCOUNT CREATION FUNCTIONS =====
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setAccountError("");
    setAccountLoading(true);

    // Validation
    if (!accountForm.firstName.trim() || !accountForm.lastName.trim() || !accountForm.email.trim() || !accountForm.password.trim()) {
      setAccountError("All fields are required");
      setAccountLoading(false);
      return;
    }

    if (accountForm.password !== accountForm.confirmPassword) {
      setAccountError("Passwords do not match");
      setAccountLoading(false);
      return;
    }

    if (accountForm.password.length < 6) {
      setAccountError("Password must be at least 6 characters");
      setAccountLoading(false);
      return;
    }

    if (!accountForm.email.includes("@")) {
      setAccountError("Please enter a valid email address");
      setAccountLoading(false);
      return;
    }

    try {
      console.log("[AdminCreateAccount] Creating account for:", accountForm.email);
      
      // Step 1: Create Firebase Auth user
      const authResult = await adminCreateUser(accountForm.email, accountForm.password, `${accountForm.firstName} ${accountForm.lastName}`);
      
      if (!authResult.success) {
        console.error("[AdminCreateAccount] Firebase creation failed:", authResult.error);
        setAccountError("Account creation failed: " + authResult.error);
        setAccountLoading(false);
        return;
      }

      console.log("[AdminCreateAccount] Firebase user created, UID:", authResult.user.uid);

      // Step 2: Save user data to Firestore
      const userData = {
        uid: authResult.user.uid,
        email: accountForm.email.trim(),
        fname: accountForm.firstName.trim(),
        lname: accountForm.lastName.trim(),
        displayName: `${accountForm.firstName} ${accountForm.lastName}`,
        firstName: accountForm.firstName.trim(),
        lastName: accountForm.lastName.trim(),
        role: accountForm.role,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.email || "admin"
      };

      console.log("[AdminCreateAccount] Saving to Firestore:", userData);
      
      const dbResult = await createUserDocument(authResult.user.uid, userData);

      if (!dbResult.success) {
        console.error("[AdminCreateAccount] Firestore save failed:", dbResult.error);
        setAccountError("Account created in Auth but database save failed: " + dbResult.error);
        setAccountLoading(false);
        return;
      }

      console.log("[AdminCreateAccount] Account created successfully!");

      // Step 3: Add to created accounts list
      const newAccount = {
        id: authResult.user.uid,
        ...userData,
        createdDate: new Date().toISOString()
      };
      setCreatedAccounts([...createdAccounts, newAccount]);

      // Step 4: Remove from pending requests if created from a request
      if (selectedRequestId) {
        const updatedRequests = accountRequests.filter(req => req.id !== selectedRequestId);
        setAccountRequests(updatedRequests);
        localStorage.setItem("accountRequests", JSON.stringify(updatedRequests));
      }

      // Show success
      setSuccessMessage(`Account created successfully for ${accountForm.firstName} ${accountForm.lastName}! Email: ${accountForm.email}`);
      setShowSuccessModal(true);

      // Reset form
      setAccountForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user"
      });
      setShowCreateAccountModal(false);
      setSelectedRequestId(null);
      setAccountLoading(false);

    } catch (err) {
      console.error("[AdminCreateAccount] Unexpected error:", err.message);
      setAccountError("Error: " + err.message);
      setAccountLoading(false);
    }
  };

  const handleDeleteAccount = (accountId) => {
    const account = createdAccounts.find(a => a.id === accountId);
    setAccountToDelete(account);
    setShowDeleteAccountModal(true);
  };

  const confirmDeleteAccount = () => {
    if (accountToDelete) {
      setCreatedAccounts(createdAccounts.filter(a => a.id !== accountToDelete.id));
      setSuccessMessage("Account record deleted!");
      setShowSuccessModal(true);
      setShowDeleteAccountModal(false);
      setAccountToDelete(null);
    }
  };

  const cancelDeleteAccount = () => {
    setShowDeleteAccountModal(false);
    setAccountToDelete(null);
  };

  const handleApproveRequest = (requestId) => {
    const updatedRequests = accountRequests.map(req => 
      req.id === requestId ? { ...req, status: "approved", approvedDate: new Date().toISOString() } : req
    );
    setAccountRequests(updatedRequests);
    localStorage.setItem("accountRequests", JSON.stringify(updatedRequests));
    
    // Also update in Firestore
    updateAccountRequestStatus(requestId, "approved");
    
    setSuccessMessage("Account request approved!");
    setShowSuccessModal(true);
  };

  const handleRejectRequest = (requestId) => {
    const request = accountRequests.find(req => req.id === requestId);
    setRequestToReject(request);
    setShowRejectConfirmModal(true);
  };

  const confirmRejectRequest = () => {
    if (requestToReject) {
      const updatedRequests = accountRequests.map(req => 
        req.id === requestToReject.id ? { ...req, status: "declined", declinedDate: new Date().toISOString() } : req
      );
      setAccountRequests(updatedRequests);
      localStorage.setItem("accountRequests", JSON.stringify(updatedRequests));
      
      // Also update in Firestore
      updateAccountRequestStatus(requestToReject.id, "declined");
      
      setSuccessMessage("Account request declined.");
      setShowSuccessModal(true);
      setShowRejectConfirmModal(false);
      setRequestToReject(null);
    }
  };

  const cancelRejectRequest = () => {
    setShowRejectConfirmModal(false);
    setRequestToReject(null);
  };

  const handleCreateAccountFromRequest = (request) => {
    // Parse name into first and last name
    const nameParts = request.name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    setAccountForm({
      firstName: firstName,
      lastName: lastName,
      email: "",
      password: "",
      confirmPassword: "",
      role: "user"
    });
    setSelectedRequestId(request.id);
    setShowCreateAccountModal(true);
    setAccountError("");
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
    
    setIsLoading(true);
    setLoadingMessage("Declining file...");
    
    setTimeout(() => {
      const updated = [...files];
      const fileName = updated[selectedFileIndex].name;
      updated[selectedFileIndex] = { 
        ...updated[selectedFileIndex], 
        status: "Declined",
        declineReason: declineReason 
      };
      setFiles(updated);
      setShowDeclineModal(false);
      setDeclineReason("");
      setSelectedFileIndex(null);
      setIsLoading(false);
      setLoadingMessage("Processing...");
      
      // Show success modal
      setSuccessMessage(`File "${fileName}" has been declined successfully!`);
      setShowSuccessModal(true);
    }, 1000);
    setDeclineReason("");
  };

  /* ===== SUMMARY COUNTS ===== */
  const totalFiles = files.length;
  const pendingCount = files.filter(f => f.status === "Pending" && !f.isArchived).length;
  const approvedCount = files.filter(f => f.status === "Approved" && !f.isArchived).length;
  const archivedCount = files.filter(f => f.isArchived).length;
  const newSubmissionCount = files.filter(
  (f) => f.status === "Pending" && !f.isArchived
).length;
  const pendingAccountRequestsCount = accountRequests.filter(req => !req.status || req.status === "pending").length;


  /* ===== FILTERED FILES ===== */
  const filteredFiles = useMemo(() => {
    return files.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase()) &&
      (departmentFilter ? f.department === departmentFilter : true) &&
      (statusFilter ? f.status === statusFilter : true)
    );
  }, [files, search, departmentFilter, statusFilter]);

  const activeFiles = useMemo(() => {
    const active = filteredFiles.filter(f => !f.isArchived);
    const sorted = [...active].sort((a, b) => {
      const getTimestamp = (f) => {
        if (f.uploadedAt) return new Date(f.uploadedAt).getTime();
        if (f.createdAt) return new Date(f.createdAt).getTime();
        if (f.date) return new Date(f.date).getTime();
        return 0;
      };
      
      const aTime = getTimestamp(a);
      const bTime = getTimestamp(b);
      
      if (sortOrder === "latest") {
        return bTime - aTime;
      } else {
        return aTime - bTime;
      }
    });
    return sorted;
  }, [filteredFiles, sortOrder]);

  const archivedFiles = useMemo(() => {
    const archived = filteredFiles.filter(f => f.isArchived);
    const sorted = [...archived].sort((a, b) => {
      const getTimestamp = (f) => {
        if (f.uploadedAt) return new Date(f.uploadedAt).getTime();
        if (f.createdAt) return new Date(f.createdAt).getTime();
        if (f.date) return new Date(f.date).getTime();
        return 0;
      };
      
      const aTime = getTimestamp(a);
      const bTime = getTimestamp(b);
      
      if (sortOrder === "latest") {
        return bTime - aTime;
      } else {
        return aTime - bTime;
      }
    });
    return sorted;
  }, [filteredFiles, sortOrder]);

  const departments = useMemo(() => {
    const uniqueDepts = [...new Set(files.map(f => normalizeDepartment(f.department)))].filter(d => d);
    return uniqueDepts.sort();
  }, [files]);

  return (
    <div style={styles.layout}>
      {/* LOADING SCREEN */}
      {isLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* ===== SIDEBAR ===== */}
      <aside style={styles.sidebar}>
        <div style={styles.logoBox}>
          <h1 style={styles.logo}>BAC</h1>
          <p style={styles.subLogo}>Records System</p>
        </div>

        <nav>
          <div
            style={view === "analytics" ? styles.navActive : styles.nav}
            onClick={() => setView("analytics")}
          >
             Analytics
          </div>

<div
  style={view === "dashboard" ? styles.navActive : styles.nav}
  onClick={() => setView("dashboard")}
>
  <span>Records</span>

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

          <div
            style={view === "department" ? styles.navActive : styles.nav}
            onClick={() => setView("department")}
          >
            By Department
          </div>

          <div
            style={view === "createAccount" ? styles.navActive : styles.nav}
            onClick={() => setView("createAccount")}
          >
            <span>Create User Account</span>
          </div>

          <div
            style={view === "accountRequests" ? styles.navActive : styles.nav}
            onClick={() => setView("accountRequests")}
          >
            <span>Account Requests</span>
            {pendingAccountRequestsCount > 0 && (
              <span style={styles.badge}>
                {pendingAccountRequestsCount}
              </span>
            )}
          </div>

          <div
            style={view === "ppmp" ? styles.navActive : styles.nav}
            onClick={() => setView("ppmp")}
          >
             PPMP Management
          </div>

          <div
            style={view === "editAboutBac" ? styles.navActive : styles.nav}
            onClick={() => setView("editAboutBac")}
          >
            Edit About BAC
          </div>

          <div
            style={view === "editDocTemplates" ? styles.navActive : styles.nav}
            onClick={() => setView("editDocTemplates")}
          >
            Edit Documents Template
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
              : view === "department"
              ? "Files by Department"
              : view === "ppmp"
              ? "PPMP Management"
              : view === "editAboutBac"
              ? "Edit About BAC"
              : view === "editDocTemplates"
              ? "Edit Documents Template"
              : view === "createAccount"
              ? "Create User Account"
              : view === "analytics"
              ? "Analytics & Reports"
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

        {/* FILTER BAR - Not shown in Department, PPMP Management, Edit About BAC, Edit Document Template, Create Account, Account Requests, or Analytics view */}
        {view !== "department" && view !== "ppmp" && view !== "editAboutBac" && view !== "editDocTemplates" && view !== "createAccount" && view !== "accountRequests" && view !== "analytics" && view !== "pendingRequests" && view !== "approvedRequests" && view !== "declinedRequests" && (
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
            style={styles.sortButton}
            onClick={() => setSortOrder(sortOrder === "latest" ? "oldest" : "latest")}
            title={sortOrder === "latest" ? "Latest to Oldest" : "Oldest to Latest"}
          >
            {sortOrder === "latest" ? "↓" : "↑"}
          </button>

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
        )}

        {/* TABLE - Not shown in Department, PPMP Management, Edit About BAC, Edit Document Template, Create Account, Account Requests, or Analytics view */}
        {view !== "department" && view !== "ppmp" && view !== "editAboutBac" && view !== "editDocTemplates" && view !== "createAccount" && view !== "accountRequests" && view !== "analytics" && view !== "pendingRequests" && view !== "approvedRequests" && view !== "declinedRequests" && (
        <div style={styles.tableBox}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Department</th>
                <th>Type</th>
                <th>Date</th>
                <th>Time Submitted</th>
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
                      <td>{f.time || "N/A"}</td>
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
                            onClick={() => {
                              setIsLoading(true);
                              setLoadingMessage("Archiving file...");
                              setTimeout(() => {
                                const updated = [...files];
                                const fileName = updated[realIndex].name;
                                updated[realIndex] = { ...updated[realIndex], isArchived: true };
                                setFiles(updated);
                                setIsLoading(false);
                                setLoadingMessage("Processing...");
                                
                                // Show success modal
                                setSuccessMessage(`File "${fileName}" has been archived successfully!`);
                                setShowSuccessModal(true);
                              }, 1000);
                            }}
                          >
                            Archive
                          </button>
                        )}

                        {view === "archive" && (
                          <button
                            style={styles.restoreButton}
                            onClick={() => {
                              setIsLoading(true);
                              setLoadingMessage("Restoring file...");
                              setTimeout(() => {
                                const updated = [...files];
                                const fileName = updated[realIndex].name;
                                updated[realIndex] = { ...updated[realIndex], isArchived: false };
                                setFiles(updated);
                                setIsLoading(false);
                                setLoadingMessage("Processing...");
                                
                                // Show success modal
                                setSuccessMessage(`File "${fileName}" has been restored successfully!`);
                                setShowSuccessModal(true);
                              }, 1000);
                            }}
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
        )}

        {/* DEPARTMENT VIEW */}
        {view === "department" && (
          <div style={styles.departmentContainer}>
            {departments.map((dept) => {
              const deptFiles = files.filter(f => normalizeDepartment(f.department) === dept && !f.isArchived);
              const approvedFiles = [...deptFiles.filter(f => f.status === "Approved")].sort((a, b) => {
                if (sortOrder === "latest") {
                  return (b.timestamp || 0) - (a.timestamp || 0);
                } else {
                  return (a.timestamp || 0) - (b.timestamp || 0);
                }
              });
              const declinedFiles = [...deptFiles.filter(f => f.status === "Declined")].sort((a, b) => {
                if (sortOrder === "latest") {
                  return (b.timestamp || 0) - (a.timestamp || 0);
                } else {
                  return (a.timestamp || 0) - (b.timestamp || 0);
                }
              });
              
              return (
                <div key={dept} style={styles.departmentSection}>
                  <div style={styles.deptHeader}>
                    <h3 style={styles.deptTitle}>{dept}</h3>
                    <span style={styles.deptCount}>
                      Approved: {approvedFiles.length} | Declined: {declinedFiles.length}
                    </span>
                  </div>

                  {/* APPROVED FILES */}
                  {approvedFiles.length > 0 && (
                    <div style={styles.deptSubsection}>
                      <h4 style={styles.statusHeader}>✓ Approved ({approvedFiles.length})</h4>
                      <table style={styles.deptTable}>
                        <thead>
                          <tr>
                            <th>File Name</th>
                            <th>Date Submitted</th>
                            <th>Time Submitted</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvedFiles.map((file, idx) => (
                            <tr key={idx}>
                              <td style={styles.fileName}>{file.name}</td>
                              <td>{file.date}</td>
                              <td>{file.time || "N/A"}</td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  style={styles.viewButton}
                                  onClick={() => handleViewFile(file)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* DECLINED FILES */}
                  {declinedFiles.length > 0 && (
                    <div style={styles.deptSubsection}>
                      <h4 style={styles.statusHeaderDeclined}>✗ Declined ({declinedFiles.length})</h4>
                      <table style={styles.deptTable}>
                        <thead>
                          <tr>
                            <th>File Name</th>
                            <th>Date Submitted</th>
                            <th>Reason</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {declinedFiles.map((file, idx) => (
                            <tr key={idx}>
                              <td style={styles.fileName}>{file.name}</td>
                              <td>{file.date}</td>
                              <td style={{ fontSize: "12px", color: "#666" }}>{file.declineReason || "N/A"}</td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  style={styles.viewButton}
                                  onClick={() => handleViewFile(file)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}


                </div>
              );
            })}
          </div>
        )}

        {/* PPMP MANAGEMENT VIEW */}
        {view === "ppmp" && (
          <>
            {/* ADD NEW DEPARTMENT SECTION - Only show if current user is the PPMP verifier */}
            {currentUser?.email === PPMP_VERIFIER_EMAIL && (
            <div style={styles.card}>
              <h3>Add PPMP Department</h3>
              <p style={styles.cardDescription}>
                Create new PPMP departments that users can track in their PPMP Status page.
              </p>
              <div style={styles.ppmpInputContainer}>
                <input
                  type="text"
                  placeholder="Enter department name (e.g., Finance, HR, Registrar)"
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  style={styles.ppmpInput}
                />
                <button
                  style={styles.ppmpAddButton}
                  onClick={() => {
                    if (newDepartmentName.trim()) {
                      const normalized = newDepartmentName.charAt(0).toUpperCase() + newDepartmentName.slice(1).toLowerCase();
                      if (!ppmpDepartments.includes(normalized)) {
                        const updated = [...ppmpDepartments, normalized];
                        setPpmpDepartments(updated);
                        localStorage.setItem("ppmpDepartments", JSON.stringify(updated));
                        
                        // Update all existing users with this department
                        const updatedStatuses = { ...userPPMPStatuses };
                        setNewDepartmentName("");
                        setShowSuccessModal(true);
                        setSuccessMessage(`Department "${normalized}" has been added successfully!`);
                      } else {
                        alert("This department already exists!");
                      }
                    }
                  }}
                >
                  + Add Department
                </button>
              </div>
            </div>
            )}

            {/* EXISTING DEPARTMENTS LIST */}
            {currentUser?.email === PPMP_VERIFIER_EMAIL && ppmpDepartments.length > 0 && (
              <div style={styles.card}>
                <h3>Active PPMP Departments</h3>
                <div style={styles.ppmpDeptGrid}>
                  {ppmpDepartments.map((dept) => (
                    <div key={dept} style={styles.ppmpDeptTag}>
                      <span>{dept}</span>
                      <button
                        style={styles.ppmpRemoveBtn}
                        onClick={() => {
                          const updated = ppmpDepartments.filter(d => d !== dept);
                          setPpmpDepartments(updated);
                          localStorage.setItem("ppmpDepartments", JSON.stringify(updated));
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADMIN PPMP VERIFICATION SECTION - Only for admin */}
            {currentUser?.email === PPMP_VERIFIER_EMAIL && (
            <div style={styles.card}>
              <h3>Verify User PPMP Status</h3>
              <p style={styles.cardDescription}>
                Select a user and update their PPMP status for each department.
              </p>

              <select
                style={styles.ppmpInput}
                value={selectedUserEmail}
                onChange={(e) => {
                  setSelectedUserEmail(e.target.value);
                  setPpmpUpdateDept("");
                  setPpmpUpdateStatus("No PPMP");
                }}
              >
                <option value="">-- Select a user --</option>
                {allUsers.map((user, idx) => (
                  <option key={idx} value={user.email}>{user.email}</option>
                ))}
              </select>

              {selectedUserEmail && (
                <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f0f8ff", borderRadius: "5px", fontSize: "12px", color: "#666" }}>
                  <strong>Verified by:</strong> {currentUser?.email || "Unknown Admin"}
                </div>
              )}

              {selectedUserEmail && ppmpDepartments.length > 0 && (
                <>
                  <div style={styles.ppmpStatusGrid}>
                    {ppmpDepartments.map((dept) => {
                      const userKey = selectedUserEmail;
                      const statusKey = `${userKey}_${dept}`;
                      const currentStatus = userPPMPStatuses[statusKey] || "No PPMP";

                      return (
                        <div key={dept} style={styles.ppmpStatusCard}>
                          <div style={styles.ppmpStatusHeader}>
                            <h4 style={styles.ppmpStatusDept}>{dept}</h4>
                            <span
                              style={{
                                ...styles.ppmpStatusBadge,
                                backgroundColor:
                                  currentStatus === "Complete"
                                    ? "#22c55e"
                                    : currentStatus === "Incomplete"
                                    ? "#f97316"
                                    : "#ef4444"
                              }}
                            >
                              {currentStatus}
                            </span>
                          </div>
                          <div style={styles.ppmpStatusButtons}>
                            <button
                              style={{
                                ...styles.ppmpStatusBtn,
                                ...(currentStatus === "Complete" ? styles.ppmpStatusBtnActive : {})
                              }}
                              onClick={() => {
                                const statusKey = `${selectedUserEmail}_${dept}`;
                                const updated = { ...userPPMPStatuses, [statusKey]: "Complete" };
                                setUserPPMPStatuses(updated);
                                localStorage.setItem("userPPMPStatuses", JSON.stringify(updated));
                                
                                // Also update user's local PPMP
                                let userPPMP = JSON.parse(localStorage.getItem(`userPPMP_${selectedUserEmail}`) || "{}");
                                userPPMP[dept] = "Complete";
                                localStorage.setItem(`userPPMP_${selectedUserEmail}`, JSON.stringify(userPPMP));
                              }}
                            >
                              Complete
                            </button>
                            <button
                              style={{
                                ...styles.ppmpStatusBtn,
                                ...(currentStatus === "Incomplete" ? styles.ppmpStatusBtnActive : {})
                              }}
                              onClick={() => {
                                const statusKey = `${selectedUserEmail}_${dept}`;
                                const updated = { ...userPPMPStatuses, [statusKey]: "Incomplete" };
                                setUserPPMPStatuses(updated);
                                localStorage.setItem("userPPMPStatuses", JSON.stringify(updated));
                                
                                // Also update user's local PPMP
                                let userPPMP = JSON.parse(localStorage.getItem(`userPPMP_${selectedUserEmail}`) || "{}");
                                userPPMP[dept] = "Incomplete";
                                localStorage.setItem(`userPPMP_${selectedUserEmail}`, JSON.stringify(userPPMP));
                              }}
                            >
                              Incomplete
                            </button>
                            <button
                              style={{
                                ...styles.ppmpStatusBtn,
                                ...(currentStatus === "No PPMP" ? styles.ppmpStatusBtnActive : {})
                              }}
                              onClick={() => {
                                const statusKey = `${selectedUserEmail}_${dept}`;
                                const updated = { ...userPPMPStatuses, [statusKey]: "No PPMP" };
                                setUserPPMPStatuses(updated);
                                localStorage.setItem("userPPMPStatuses", JSON.stringify(updated));
                                
                                // Also update user's local PPMP
                                let userPPMP = JSON.parse(localStorage.getItem(`userPPMP_${selectedUserEmail}`) || "{}");
                                userPPMP[dept] = "No PPMP";
                                localStorage.setItem(`userPPMP_${selectedUserEmail}`, JSON.stringify(userPPMP));
                              }}
                            >
                              No PPMP
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            )}

          </>
        )}

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

        {/* EDIT ABOUT BAC VIEW */}
        {view === "editAboutBac" && (
          <>
            <div style={styles.card}>
              <h3>Edit BAC Leadership Team</h3>
              <p style={styles.cardDescription}>
                Manage BAC team members: add, edit, or remove members with their names, positions, and profile images.
              </p>
              <button
                style={styles.button}
                onClick={() => {
                  setTeamMemberForm({ name: "", position: "", email: "", image: "" });
                  setEditingMemberId(null);
                  setShowAddTeamMemberModal(true);
                }}
              >
                + Add Team Member
              </button>
            </div>

            {bacTeamMembers.length > 0 && (
              <div style={styles.card}>
                <h3>Current Team Members</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                  {bacTeamMembers.map((member) => (
                    <div key={member.id} style={{
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      padding: "15px",
                      textAlign: "center"
                    }}>
                      {member.image && (
                        <img
                          src={member.image}
                          alt={member.name}
                          style={{
                            width: "100px",
                            height: "100px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            marginBottom: "10px"
                          }}
                        />
                      )}
                      <h4 style={{ margin: "10px 0", color: maroon }}>{member.name}</h4>
                      <p style={{ margin: "5px 0", fontSize: "12px", color: "#666" }}>{member.position}</p>
                      {member.email && <p style={{ margin: "5px 0", fontSize: "11px", color: "#999" }}>{member.email}</p>}
                      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <button
                          style={{...styles.button, flex: 1, padding: "8px"}}
                          onClick={() => handleEditTeamMember(member)}
                        >
                          Edit
                        </button>
                        <button
                          style={{...styles.declineButtonSmall, flex: 1, padding: "8px"}}
                          onClick={() => handleDeleteTeamMember(member.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* EDIT DOCUMENTS TEMPLATE VIEW */}
        {view === "editDocTemplates" && (
          <>
            <div style={styles.card}>
              <h3>Edit Document Templates</h3>
              <p style={styles.cardDescription}>
                Upload templates that will be displayed in the user's guidelines section. Users can download these templates for reference.
              </p>
              <button
                style={styles.button}
                onClick={() => {
                  setTemplateForm({ name: "", description: "", fileData: "" });
                  setEditingTemplateId(null);
                  setShowAddTemplateModal(true);
                }}
              >
                + Add Template
              </button>
            </div>

            {docTemplates.length > 0 && (
              <div style={styles.card}>
                <h3>Current Templates</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                  {docTemplates.map((template) => (
                    <div key={template.id} style={{
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      padding: "15px",
                      backgroundColor: "#f9f9f9"
                    }}>
                      <h4 style={{ margin: "0 0 8px 0", color: maroon }}>{template.name}</h4>
                      {template.description && (
                        <p style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#666" }}>{template.description}</p>
                      )}
                      <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#999" }}>
                        📄 File uploaded
                      </p>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          style={{...styles.button, flex: 1, padding: "8px", fontSize: "13px"}}
                          onClick={() => handleEditTemplate(template)}
                        >
                          Edit
                        </button>
                        <button
                          style={{...styles.declineButtonSmall, flex: 1, padding: "8px", fontSize: "13px"}}
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {docTemplates.length === 0 && (
              <div style={styles.card}>
                <p style={{ textAlign: "center", color: "#999" }}>No templates added yet. Click "+ Add Template" to get started.</p>
              </div>
            )}
          </>
        )}

        {/* CREATE USER ACCOUNT VIEW */}
        {view === "createAccount" && (
          <>
            <div style={styles.card}>
              <h3>Create User Account</h3>
              <p style={styles.cardDescription}>
                Manually create a new user account. The account details will be stored in the database and users can log in with their email and password.
              </p>
              <button
                style={styles.button}
                onClick={() => {
                  setShowCreateAccountModal(true);
                  setAccountForm({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", role: "user" });
                  setAccountError("");
                  setSelectedRequestId(null);
                }}
              >
                + Create New Account
              </button>
            </div>

            {createdAccounts.length > 0 && (
              <div style={styles.card}>
                <h3>Created Accounts ({createdAccounts.length})</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Created By</th>
                        <th>Created Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {createdAccounts.map((account) => (
                        <tr key={account.id}>
                          <td style={{ fontWeight: "500" }}>{account.firstName} {account.lastName}</td>
                          <td>{account.email}</td>
                          <td>
                            <span style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              backgroundColor: account.role === "admin" ? "#fdecea" : "#d1fae5",
                              color: account.role === "admin" ? "#a60000" : "#065f46",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              {account.role}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "#666" }}>{account.createdBy}</td>
                          <td style={{ fontSize: "12px", color: "#999" }}>
                            {new Date(account.createdDate).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              style={{...styles.declineButtonSmall, padding: "6px 12px", fontSize: "12px"}}
                              onClick={() => handleDeleteAccount(account.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {createdAccounts.length === 0 && (
              <div style={styles.card}>
                <p style={{ textAlign: "center", color: "#999" }}>No created accounts yet.</p>
              </div>
            )}
          </>
        )}

        {/* ACCOUNT REQUESTS VIEW - Combined view for all request statuses */}
        {view === "accountRequests" && (
          <>
            {/* PENDING REQUESTS SECTION */}
            {accountRequests.filter(req => !req.status || req.status === "pending").length > 0 && (
              <div style={styles.card}>
                <h3>⏳ Pending Account Requests ({accountRequests.filter(req => !req.status || req.status === "pending").length})</h3>
                <p style={styles.cardDescription}>
                  Users who have requested accounts. Approve or reject their requests.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Email</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountRequests.filter(req => !req.status || req.status === "pending").map((request) => (
                        <tr key={request.id}>
                          <td style={{ fontWeight: "500" }}>{request.name}</td>
                          <td>{request.department}</td>
                          <td style={{ fontSize: "12px", color: "#666" }}>{request.email}</td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <button
                                style={{...styles.button, padding: "6px 12px", fontSize: "12px"}}
                                onClick={() => handleApproveRequest(request.id)}
                              >
                                ✓ Approve
                              </button>
                              <button
                                style={{...styles.declineButtonSmall, padding: "6px 12px", fontSize: "12px"}}
                                onClick={() => handleRejectRequest(request.id)}
                              >
                                ✕ Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* APPROVED REQUESTS SECTION */}
            {accountRequests.filter(req => req.status === "approved").length > 0 && (
              <div style={styles.card}>
                <h3>✓ Approved Requests ({accountRequests.filter(req => req.status === "approved").length})</h3>
                <p style={styles.cardDescription}>
                  Account requests that have been approved.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Email</th>
                        <th>Approved Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountRequests.filter(req => req.status === "approved").map((request) => (
                        <tr key={request.id}>
                          <td style={{ fontWeight: "500" }}>{request.name}</td>
                          <td>{request.department}</td>
                          <td style={{ fontSize: "12px", color: "#666" }}>{request.email}</td>
                          <td style={{ fontSize: "12px", color: "#22c55e", fontWeight: "600" }}>
                            {new Date(request.approvedDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DECLINED REQUESTS SECTION */}
            {accountRequests.filter(req => req.status === "declined").length > 0 && (
              <div style={styles.card}>
                <h3>✕ Declined Requests ({accountRequests.filter(req => req.status === "declined").length})</h3>
                <p style={styles.cardDescription}>
                  Account requests that have been declined.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Email</th>
                        <th>Declined Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountRequests.filter(req => req.status === "declined").map((request) => (
                        <tr key={request.id}>
                          <td style={{ fontWeight: "500" }}>{request.name}</td>
                          <td>{request.department}</td>
                          <td style={{ fontSize: "12px", color: "#666" }}>{request.email}</td>
                          <td style={{ fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>
                            {new Date(request.declinedDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {accountRequests.length === 0 && (
              <div style={styles.card}>
                <p style={{ textAlign: "center", color: "#999" }}>No account requests yet.</p>
              </div>
            )}
          </>
        )}

        {/* ANALYTICS VIEW */}
        {view === "analytics" && (
          <>
            <div style={styles.card}>
              <h3>User Submissions Analytics</h3>
              <p style={styles.cardDescription}>
                Overview of file submissions and PPMP status by department
              </p>
            </div>

            {/* ANALYTICS GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "20px" }}>
              {/* SUBMISSIONS BY DEPARTMENT - PIE CHART DATA */}
              <div style={styles.card}>
                <h4 style={{ marginTop: 0 }}> Submissions by Department</h4>
                <div style={{ minHeight: "300px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(() => {
                    const deptStats = {};
                    files.forEach(f => {
                      const dept = normalizeDepartment(f.department) || "Other";
                      deptStats[dept] = (deptStats[dept] || 0) + 1;
                    });
                    
                    const total = Object.values(deptStats).reduce((a, b) => a + b, 0);
                    
                    return Object.entries(deptStats).length === 0 ? (
                      <p style={{ color: "#999", textAlign: "center" }}>No submissions yet</p>
                    ) : (
                      <>
                        {Object.entries(deptStats).map(([dept, count]) => {
                          const percentage = ((count / total) * 100).toFixed(1);
                          return (
                            <div key={dept} style={{ marginBottom: "12px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontWeight: "500", color: "#333" }}>{dept}</span>
                                <span style={{ color: maroon, fontWeight: "600" }}>{count} ({percentage}%)</span>
                              </div>
                              <div style={{ width: "100%", height: "20px", backgroundColor: "#e0e0e0", borderRadius: "10px", overflow: "hidden" }}>
                                <div style={{
                                  width: `${percentage}%`,
                                  height: "100%",
                                  backgroundColor: maroon,
                                  transition: "width 0.3s ease"
                                }}></div>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "5px", textAlign: "center" }}>
                          <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                            <strong>Total Submissions:</strong> {total}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* FILE STATUS DISTRIBUTION */}
              <div style={styles.card}>
                <h4 style={{ marginTop: 0 }}> File Status Distribution</h4>
                <div style={{ minHeight: "300px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(() => {
                    const statusStats = {
                      "Pending": files.filter(f => f.status === "Pending" && !f.isArchived).length,
                      "Approved": files.filter(f => f.status === "Approved" && !f.isArchived).length,
                      "Declined": files.filter(f => f.status === "Declined" && !f.isArchived).length,
                      "Archived": files.filter(f => f.isArchived).length
                    };
                    
                    const total = Object.values(statusStats).reduce((a, b) => a + b, 0);
                    const statusColors = {
                      "Pending": "#f59e0b",
                      "Approved": "#10b981",
                      "Declined": "#ef4444",
                      "Archived": "#6b7280"
                    };
                    
                    return total === 0 ? (
                      <p style={{ color: "#999", textAlign: "center" }}>No files yet</p>
                    ) : (
                      <>
                        {Object.entries(statusStats).map(([status, count]) => {
                          const percentage = ((count / total) * 100).toFixed(1);
                          return (
                            <div key={status} style={{ marginBottom: "12px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontWeight: "500", color: "#333" }}>{status}</span>
                                <span style={{ color: statusColors[status], fontWeight: "600" }}>{count} ({percentage}%)</span>
                              </div>
                              <div style={{ width: "100%", height: "20px", backgroundColor: "#e0e0e0", borderRadius: "10px", overflow: "hidden" }}>
                                <div style={{
                                  width: `${percentage}%`,
                                  height: "100%",
                                  backgroundColor: statusColors[status],
                                  transition: "width 0.3s ease"
                                }}></div>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "5px", textAlign: "center" }}>
                          <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                            <strong>Total Files:</strong> {total}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* PPMP STATUS OVERVIEW */}
              <div style={styles.card}>
                <h4 style={{ marginTop: 0 }}>PPMP Status Summary</h4>
                <div style={{ minHeight: "300px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(() => {
                    const ppmpStats = {
                      "Complete": 0,
                      "Incomplete": 0,
                      "No PPMP": 0
                    };
                    
                    Object.values(userPPMPStatuses).forEach(status => {
                      if (ppmpStats.hasOwnProperty(status)) {
                        ppmpStats[status]++;
                      }
                    });
                    
                    const total = Object.values(ppmpStats).reduce((a, b) => a + b, 0);
                    const ppmpColors = {
                      "Complete": "#10b981",
                      "Incomplete": "#f59e0b",
                      "No PPMP": "#ef4444"
                    };
                    
                    return total === 0 ? (
                      <p style={{ color: "#999", textAlign: "center" }}>No PPMP data yet</p>
                    ) : (
                      <>
                        {Object.entries(ppmpStats).map(([status, count]) => {
                          const percentage = ((count / total) * 100).toFixed(1);
                          return (
                            <div key={status} style={{ marginBottom: "12px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontWeight: "500", color: "#333" }}>{status}</span>
                                <span style={{ color: ppmpColors[status], fontWeight: "600" }}>{count} ({percentage}%)</span>
                              </div>
                              <div style={{ width: "100%", height: "20px", backgroundColor: "#e0e0e0", borderRadius: "10px", overflow: "hidden" }}>
                                <div style={{
                                  width: `${percentage}%`,
                                  height: "100%",
                                  backgroundColor: ppmpColors[status],
                                  transition: "width 0.3s ease"
                                }}></div>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ marginTop: "15px", padding: "10px", backgroundColor: "#f5f5f5", borderRadius: "5px", textAlign: "center" }}>
                          <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
                            <strong>Total PPMP Records:</strong> {total}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* DETAILED STATS TABLE */}
            <div style={styles.card}>
              <h4>Department Statistics</h4>
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Total Files</th>
                      <th>Pending</th>
                      <th>Approved</th>
                      <th>Declined</th>
                      <th>Approval Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const deptData = {};
                      files.forEach(f => {
                        const dept = normalizeDepartment(f.department) || "Other";
                        if (!deptData[dept]) {
                          deptData[dept] = { total: 0, pending: 0, approved: 0, declined: 0 };
                        }
                        deptData[dept].total++;
                        if (f.status === "Pending" && !f.isArchived) deptData[dept].pending++;
                        if (f.status === "Approved" && !f.isArchived) deptData[dept].approved++;
                        if (f.status === "Declined" && !f.isArchived) deptData[dept].declined++;
                      });
                      
                      return Object.keys(deptData).length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: "center", color: "#999" }}>No data available</td></tr>
                      ) : (
                        Object.entries(deptData).map(([dept, stats]) => {
                          const approvalRate = stats.total > 0 
                            ? ((stats.approved / (stats.approved + stats.declined)) * 100).toFixed(1)
                            : "N/A";
                          return (
                            <tr key={dept}>
                              <td><strong>{dept}</strong></td>
                              <td style={{ textAlign: "center", color: maroon, fontWeight: "600" }}>{stats.total}</td>
                              <td style={{ textAlign: "center", color: "#f59e0b", fontWeight: "600" }}>{stats.pending}</td>
                              <td style={{ textAlign: "center", color: "#10b981", fontWeight: "600" }}>{stats.approved}</td>
                              <td style={{ textAlign: "center", color: "#ef4444", fontWeight: "600" }}>{stats.declined}</td>
                              <td style={{ textAlign: "center" }}>
                                <span style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  backgroundColor: approvalRate === "N/A" ? "#e0e0e0" : approvalRate > 70 ? "#d1fae5" : "#fef3c7",
                                  borderRadius: "4px",
                                  color: approvalRate > 70 ? "#065f46" : "#92400e",
                                  fontWeight: "600"
                                }}>
                                  {approvalRate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </>
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
                     Download File
                  </button>
                </>
              ) : (
                <div style={styles.noFileDataBox}>
                  <p style={styles.noFileDataMessage}>
                    File data is not available for this file. This may be because it was uploaded before the file viewer feature was added.
                  </p>
                </div>
              )}
              <div style={styles.buttonContainer}>
                <button
                  style={styles.closeFileButton}
                  onClick={() => setShowFileModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE ACCOUNT MODAL */}
        {showCreateAccountModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>
                {selectedRequestId ? "Create Account from Request" : "Create New User Account"}
              </h3>
              
              {accountError && (
                <div style={styles.errorBox}>
                  <strong>Error:</strong> {accountError}
                </div>
              )}

              <form onSubmit={handleCreateAccount} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>First Name *</label>
                    <input
                      type="text"
                      value={accountForm.firstName}
                      onChange={(e) => setAccountForm({ ...accountForm, firstName: e.target.value })}
                      placeholder="First name"
                      style={styles.input}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Last Name *</label>
                    <input
                      type="text"
                      value={accountForm.lastName}
                      onChange={(e) => setAccountForm({ ...accountForm, lastName: e.target.value })}
                      placeholder="Last name"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Email Address *</label>
                  <input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    placeholder="user@institution.edu"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Password *</label>
                  <input
                    type="password"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Confirm Password *</label>
                  <input
                    type="password"
                    value={accountForm.confirmPassword}
                    onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Role *</label>
                  <select
                    value={accountForm.role}
                    onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}
                    style={styles.input}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div style={styles.modalButtons}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => {
                      setShowCreateAccountModal(false);
                      setAccountForm({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", role: "user" });
                      setAccountError("");
                      setSelectedRequestId(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{...styles.confirmButton, ...(accountLoading ? styles.buttonDisabled : {})}}
                    disabled={accountLoading}
                  >
                    {accountLoading ? "Creating Account..." : "Create Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD/EDIT TEAM MEMBER MODAL */}
        {showAddTeamMemberModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>{editingMemberId ? "Edit Team Member" : "Add Team Member"}</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Full Name *</label>
                  <input
                    type="text"
                    value={teamMemberForm.name}
                    onChange={(e) => setTeamMemberForm({ ...teamMemberForm, name: e.target.value })}
                    placeholder="Enter full name"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Position *</label>
                  <input
                    type="text"
                    value={teamMemberForm.position}
                    onChange={(e) => setTeamMemberForm({ ...teamMemberForm, position: e.target.value })}
                    placeholder="e.g., BAC Chairperson"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Email</label>
                  <input
                    type="email"
                    value={teamMemberForm.email}
                    onChange={(e) => setTeamMemberForm({ ...teamMemberForm, email: e.target.value })}
                    placeholder="Enter email (optional)"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Profile Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={styles.input}
                  />
                  {teamMemberForm.image && (
                    <img
                      src={teamMemberForm.image}
                      alt="Preview"
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        marginTop: "10px"
                      }}
                    />
                  )}
                </div>
              </div>

              <div style={styles.modalButtons}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowAddTeamMemberModal(false);
                    setEditingMemberId(null);
                    setTeamMemberForm({ name: "", position: "", email: "", image: "" });
                  }}
                >
                  Cancel
                </button>
                <button
                  style={styles.confirmButton}
                  onClick={handleSaveTeamMember}
                >
                  {editingMemberId ? "Update Member" : "Add Member"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD/EDIT TEMPLATE MODAL */}
        {showAddTemplateModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>{editingTemplateId ? "Edit Template" : "Add Template"}</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Template Name *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Bid Evaluation Form"
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Description</label>
                  <textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Brief description of the template (optional)"
                    style={{...styles.input, minHeight: "80px", resize: "vertical"}}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Upload File *</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx"
                    onChange={handleTemplateFileUpload}
                    style={styles.input}
                  />
                  {templateForm.fileData && (
                    <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#22c55e", fontWeight: "500" }}>
                      ✓ File uploaded
                    </p>
                  )}
                </div>
              </div>

              <div style={styles.modalButtons}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowAddTemplateModal(false);
                    setEditingTemplateId(null);
                    setTemplateForm({ name: "", description: "", fileData: "" });
                  }}
                >
                  Cancel
                </button>
                <button
                  style={styles.confirmButton}
                  onClick={handleSaveTemplate}
                >
                  {editingTemplateId ? "Update Template" : "Add Template"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS MODAL */}
        {showSuccessModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.successModalContent}>
              <div style={styles.successModalHeader}>
                <h2 style={{ margin: 0, color: "white" }}>✓ Success!</h2>
              </div>
              <div style={styles.successModalBody}>
                <p style={{ fontSize: 16, color: "#333", marginBottom: 0 }}>
                  {successMessage}
                </p>
              </div>
              <div style={styles.successModalFooter}>
                <button
                  style={styles.successModalButton}
                  onClick={() => setShowSuccessModal(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {showRejectConfirmModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.successModalContent}>
              <div style={styles.successModalHeader}>
                <h2 style={{ margin: 0, color: "white" }}>⚠️ Confirm Rejection</h2>
              </div>
              <div style={styles.successModalBody}>
                <p style={{ fontSize: 16, color: "#333", marginBottom: 15 }}>
                  Are you sure you want to reject the account request for <strong>{requestToReject?.name}</strong>?
                </p>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
                  This action will update their status to "Declined".
                </p>
              </div>
              <div style={styles.successModalFooter}>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#dc3545" }}
                  onClick={confirmRejectRequest}
                >
                  Yes, Reject
                </button>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#6c757d", marginLeft: 10 }}
                  onClick={cancelRejectRequest}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE TEAM MEMBER CONFIRMATION MODAL */}
        {showDeleteTeamMemberModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.successModalContent}>
              <div style={styles.successModalHeader}>
                <h2 style={{ margin: 0, color: "white" }}>Delete Team Member</h2>
              </div>
              <div style={styles.successModalBody}>
                <p style={{ fontSize: 16, color: "#333", marginBottom: 15 }}>
                  Are you sure you want to delete <strong>{teamMemberToDelete?.name}</strong>?
                </p>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
                  This action cannot be undone.
                </p>
              </div>
              <div style={styles.successModalFooter}>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#dc3545" }}
                  onClick={confirmDeleteTeamMember}
                >
                  Yes, Delete
                </button>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#6c757d", marginLeft: 10 }}
                  onClick={cancelDeleteTeamMember}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE TEMPLATE CONFIRMATION MODAL */}
        {showDeleteTemplateModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.successModalContent}>
              <div style={styles.successModalHeader}>
                <h2 style={{ margin: 0, color: "white" }}>🗑️ Delete Template</h2>
              </div>
              <div style={styles.successModalBody}>
                <p style={{ fontSize: 16, color: "#333", marginBottom: 15 }}>
                  Are you sure you want to delete <strong>{templateToDelete?.name}</strong>?
                </p>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
                  This action cannot be undone.
                </p>
              </div>
              <div style={styles.successModalFooter}>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#dc3545" }}
                  onClick={confirmDeleteTemplate}
                >
                  Yes, Delete
                </button>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#6c757d", marginLeft: 10 }}
                  onClick={cancelDeleteTemplate}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE ACCOUNT CONFIRMATION MODAL */}
        {showDeleteAccountModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.successModalContent}>
              <div style={styles.successModalHeader}>
                <h2 style={{ margin: 0, color: "white" }}>🗑️ Delete Account Record</h2>
              </div>
              <div style={styles.successModalBody}>
                <p style={{ fontSize: 16, color: "#333", marginBottom: 15 }}>
                  Are you sure you want to delete the account for <strong>{accountToDelete?.firstName} {accountToDelete?.lastName}</strong>?
                </p>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
                  This only removes the record from the list, not from Firebase.
                </p>
              </div>
              <div style={styles.successModalFooter}>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#dc3545" }}
                  onClick={confirmDeleteAccount}
                >
                  Yes, Delete
                </button>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#6c757d", marginLeft: 10 }}
                  onClick={cancelDeleteAccount}
                >
                  Cancel
                </button>
              </div>
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
    padding: "40px",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    minWidth: "300px",
  },

  loadingSpinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #f0f0f0",
    borderTop: `4px solid ${maroon}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 20px",
  },

  loadingText: {
    color: maroon,
    fontSize: "16px",
    fontWeight: 600,
    margin: 0,
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

  sortButton: {
    background: "transparent",
    color: maroon,
    padding: "8px 12px",
    border: "none",
    outline: "none",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: "bold",
    transition: "opacity 0.2s",
  },

  buttonSmall: {
    color: "white",
    background: "#22c55e",
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },

  declineButtonSmall: {
    color: "white",
    background: "red",
  },

  archiveButton: {
    color: "white",
    background: "#22c55e",
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },

  restoreButton: {
    color: "white",
    background: "#22c55e",
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
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
    color: "white",
    background: "#22c55e",
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    width: "100%",
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
    color: "white",
    background: "#666",
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    width: "100%",
  },

  buttonContainer: {
    marginTop: 15,
    display: "flex",
    gap: 10,
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

  /* ===== DEPARTMENT VIEW STYLES ===== */
  departmentContainer: {
    padding: "20px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(700px, 1fr))",
    gap: "20px",
  },

  departmentSection: {
    background: "#fff",
    border: `2px solid ${maroon}`,
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  deptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `2px solid ${maroon}`,
    paddingBottom: "12px",
    marginBottom: "16px",
  },

  deptTitle: {
    margin: "0",
    fontSize: "18px",
    fontWeight: "700",
    color: maroon,
  },

  deptCount: {
    fontSize: "12px",
    color: "#666",
    fontWeight: "500",
  },

  deptSubsection: {
    marginBottom: "16px",
  },

  statusHeader: {
    margin: "12px 0 8px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#2d5f2d",
  },

  statusHeaderDeclined: {
    margin: "12px 0 8px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#d32f2f",
  },

  deptTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "8px",
    fontSize: "13px",
  },

  noDeptFiles: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    margin: "20px 0",
  },

  successModalContent: {
    background: "white",
    borderRadius: 12,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    minWidth: 350,
    maxWidth: 500,
    overflow: "hidden",
  },

  successModalHeader: {
    background: "#22c55e",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  successModalBody: {
    padding: "20px",
    textAlign: "center",
  },

  successModalFooter: {
    padding: "15px 20px",
    display: "flex",
    justifyContent: "center",
    background: "#f5f5f5",
    borderTop: "1px solid #eee",
  },

  successModalButton: {
    background: "#22c55e",
    color: "white",
    padding: "10px 30px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
  },

  /* ===== PPMP STYLES ===== */
  ppmpInputContainer: {
    display: "flex",
    gap: 12,
    marginTop: 16,
  },

  ppmpInput: {
    flex: 1,
    padding: "12px 16px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "Segoe UI",
  },

  ppmpAddButton: {
    background: maroon,
    color: "white",
    padding: "12px 24px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    whiteSpace: "nowrap",
  },

  ppmpDeptGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },

  ppmpDeptTag: {
    background: "#f0f0f0",
    border: `2px solid ${maroon}`,
    padding: "8px 12px",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: maroon,
  },

  ppmpRemoveBtn: {
    background: "transparent",
    border: "none",
    color: maroon,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: "bold",
    padding: 0,
  },

  ppmpStatusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
    marginTop: 20,
  },

  ppmpStatusCard: {
    background: "#f9f9f9",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
  },

  ppmpStatusHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: "1px solid #e5e7eb",
  },

  ppmpStatusDept: {
    fontSize: 16,
    fontWeight: 700,
    color: maroon,
    margin: 0,
  },

  ppmpStatusBadge: {
    padding: "4px 12px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: "white",
  },

  ppmpStatusButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
  },

  ppmpStatusBtn: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #ddd",
    background: "white",
    color: "#333",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    transition: "all 0.2s",
  },

  ppmpStatusBtnActive: {
    background: maroon,
    color: "white",
    border: `1px solid ${maroon}`,
  },

  cardDescription: {
    fontSize: 14,
    color: "#666",
    margin: "12px 0 0 0",
    lineHeight: 1.6,
  },

  emptyMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    padding: "20px 0",
    fontStyle: "italic",
  },

};
