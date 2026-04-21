import { useState, useMemo, useEffect, useCallback } from "react";
import { adminCreateUser } from "./firebase/authService";
import { createUserDocument, saveAccountRequest, getAllAccountRequests, updateAccountRequestStatus, getAllCreatedAccounts } from "./firebase/userService";
import { Check, X, Clock, Trash2, AlertCircle, FileText } from "lucide-react";

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
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [selectedAccountRequests, setSelectedAccountRequests] = useState(new Set());
  const [selectedCreatedAccounts, setSelectedCreatedAccounts] = useState(new Set());
  const [createdAccountsCurrentPage, setCreatedAccountsCurrentPage] = useState(1);
  const [createdAccountsItemsPerPage] = useState(10);
  const [filesCurrentPage, setFilesCurrentPage] = useState(1);
  const [filesItemsPerPage] = useState(10);
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
  const [approvedCurrentPage, setApprovedCurrentPage] = useState(1);
  const [declinedCurrentPage, setDeclinedCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
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

  // PPMP OFFICE TEMPLATES STATES
  const [ppmpOfficeTemplates, setPpmpOfficeTemplates] = useState(() => {
    const saved = localStorage.getItem("ppmpOfficeTemplates");
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddOfficeTemplateModal, setShowAddOfficeTemplateModal] = useState(false);
  const [editingOfficeTemplateId, setEditingOfficeTemplateId] = useState(null);
  const [officeTemplateForm, setOfficeTemplateForm] = useState({
    officeName: "",
    officeCode: "",
    items: []
  });
  const [showDeleteOfficeTemplateModal, setShowDeleteOfficeTemplateModal] = useState(false);
  const [officeTemplateToDelete, setOfficeTemplateToDelete] = useState(null);
  const [showViewOfficeTemplateModal, setShowViewOfficeTemplateModal] = useState(false);
  const [viewingOfficeTemplate, setViewingOfficeTemplate] = useState(null);

  // PPMP USER INSTANCES - TRACKING ALL USER EDITS
  const [ppmpUserInstances, setPpmpUserInstances] = useState(() => {
    const saved = localStorage.getItem("ppmpUserInstances");
    return saved ? JSON.parse(saved) : {};
  });
  const [ppmpFilterOffice, setPpmpFilterOffice] = useState("all");
  const [ppmpSortBy, setPpmpSortBy] = useState("lastUpdated"); // lastUpdated | office | user

  // ACCOUNT CREATION STATES
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [createdAccounts, setCreatedAccounts] = useState([]);
  const [accountForm, setAccountForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    department: "",
    adminConfirm: false
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
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState(null);
  const [approvalsToProcess, setApprovalsToProcess] = useState(new Set());
  const [approvalType, setApprovalType] = useState("single"); // single | bulk | quickAll
  const [showRejectAllConfirmModal, setShowRejectAllConfirmModal] = useState(false);
  const [rejectAllCount, setRejectAllCount] = useState(0);
  const [showApproveFilesConfirmModal, setShowApproveFilesConfirmModal] = useState(false);
  const [approveFilesCount, setApproveFilesCount] = useState(0);
  const [showDeleteCreatedAccountsModal, setShowDeleteCreatedAccountsModal] = useState(false);
  const [deleteCreatedAccountsCount, setDeleteCreatedAccountsCount] = useState(0);
  
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

  // ✅ CLEAR SELECTION WHEN VIEW CHANGES
  useEffect(() => {
    setSelectedFiles(new Set());
    setSelectedAccountRequests(new Set());
    setSelectedCreatedAccounts(new Set());
    setFilesCurrentPage(1);
    setPendingCurrentPage(1);
    setApprovedCurrentPage(1);
    setDeclinedCurrentPage(1);
  }, [view]);

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
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent("bacTeamMembersUpdated", { detail: bacTeamMembers }));
    } catch (err) {
      console.warn("⚠️ Could not save BAC team members:", err.message);
    }
  }, [bacTeamMembers]);

  // ✅ PERSIST DOCUMENT TEMPLATES
  useEffect(() => {
    try {
      localStorage.setItem("docTemplates", JSON.stringify(docTemplates));
      console.log("💾 Document Templates saved:", docTemplates.length);
      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new CustomEvent("docTemplatesUpdated", { detail: docTemplates }));
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

  // ✅ RELOAD BAC TEAM MEMBERS WHEN SWITCHING ACCOUNTS OR VIEWING EDIT PAGE
  useEffect(() => {
    if (view === "editAboutBac") {
      const saved = localStorage.getItem("bacTeamMembers");
      if (saved) {
        const reloadedMembers = JSON.parse(saved);
        setBacTeamMembers(reloadedMembers);
        console.log("🔄 BAC Team Members reloaded from localStorage:", reloadedMembers.length);
      }
    }
    if (view === "editDocTemplates") {
      const saved = localStorage.getItem("docTemplates");
      if (saved) {
        const reloadedTemplates = JSON.parse(saved);
        setDocTemplates(reloadedTemplates);
        console.log("🔄 Document Templates reloaded from localStorage:", reloadedTemplates.length);
      }
    }
  }, [view]);

  // ✅ PERSIST PPMP OFFICE TEMPLATES
  useEffect(() => {
    try {
      localStorage.setItem("ppmpOfficeTemplates", JSON.stringify(ppmpOfficeTemplates));
      console.log("💾 PPMP Office Templates saved:", ppmpOfficeTemplates.length);
      window.dispatchEvent(new CustomEvent("ppmpOfficeTemplatesUpdated", { detail: ppmpOfficeTemplates }));
    } catch (err) {
      console.warn("⚠️ Could not save PPMP office templates:", err.message);
    }
  }, [ppmpOfficeTemplates]);

  // ✅ PERSIST PPMP USER INSTANCES
  useEffect(() => {
    try {
      localStorage.setItem("ppmpUserInstances", JSON.stringify(ppmpUserInstances));
      console.log("💾 PPMP User Instances saved");
    } catch (err) {
      console.warn("⚠️ Could not save PPMP user instances:", err.message);
    }
  }, [ppmpUserInstances]);

  // ✅ LISTEN FOR PPMP USER INSTANCE UPDATES FROM USERS
  useEffect(() => {
    const handleUserPPMPUpdate = (event) => {
      setPpmpUserInstances(event.detail);
      console.log("🔄 PPMP User Instances updated from user dashboard");
    };
    window.addEventListener("ppmpUserInstancesUpdated", handleUserPPMPUpdate);
    return () => window.removeEventListener("ppmpUserInstancesUpdated", handleUserPPMPUpdate);
  }, []);

  // ✅ PERSIST ACCOUNT REQUESTS
  useEffect(() => {
    try {
      localStorage.setItem("accountRequests", JSON.stringify(accountRequests));
      console.log("💾 Account Requests saved:", accountRequests.length);
    } catch (err) {
      console.warn("⚠️ Could not save account requests:", err.message);
    }
  }, [accountRequests]);

  // ✅ RELOAD DATA WHEN ACCOUNT CHANGES (NEW ADMIN LOGS IN)
  useEffect(() => {
    const savedMembers = localStorage.getItem("bacTeamMembers");
    if (savedMembers) {
      setBacTeamMembers(JSON.parse(savedMembers));
      console.log("🔄 BAC Team Members synced on account change");
    }
    const savedTemplates = localStorage.getItem("docTemplates");
    if (savedTemplates) {
      setDocTemplates(JSON.parse(savedTemplates));
      console.log("🔄 Document Templates synced on account change");
    }
  }, [currentUser?.email]);

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
    if (!accountForm.firstName.trim() || !accountForm.lastName.trim() || !accountForm.email.trim() || !accountForm.password.trim() || !accountForm.department.trim()) {
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
        department: normalizeDepartment(accountForm.department.trim()),
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
      setSuccessMessage(`Account created successfully for ${accountForm.firstName} ${accountForm.lastName}! Email: ${accountForm.email} | Department: ${normalizeDepartment(accountForm.department)}`);
      setShowSuccessModal(true);

      // Reset form
      setAccountForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
        department: ""
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
    const request = accountRequests.find(req => req.id === requestId);
    setRequestToApprove(request);
    setApprovalsToProcess(new Set([requestId]));
    setApprovalType("single");
    setShowApproveConfirmModal(true);
  };

  const confirmApproveRequest = () => {
    setIsLoading(true);
    setLoadingMessage("Approving request...");
    
    setTimeout(() => {
      const updatedRequests = accountRequests.map(req => 
        approvalsToProcess.has(req.id) ? { ...req, status: "approved", approvedDate: new Date().toISOString() } : req
      );
      setAccountRequests(updatedRequests);
      localStorage.setItem("accountRequests", JSON.stringify(updatedRequests));
      
      // Update each request in Firestore
      Array.from(approvalsToProcess).forEach(requestId => {
        updateAccountRequestStatus(requestId, "approved");
      });
      
      setIsLoading(false);
      setLoadingMessage("Processing...");
      setShowApproveConfirmModal(false);
      setRequestToApprove(null);
      setApprovalsToProcess(new Set());
      
      const count = approvalsToProcess.size;
      setSuccessMessage(count === 1 ? "Account request approved!" : `${count} account request(s) approved successfully!`);
      setShowSuccessModal(true);
    }, 800);
  };

  const cancelApproveRequest = () => {
    setShowApproveConfirmModal(false);
    setRequestToApprove(null);
    setApprovalsToProcess(new Set());
  };

  const handleRejectRequest = (requestId) => {
    const request = accountRequests.find(req => req.id === requestId);
    setRequestToReject(request);
    setShowRejectConfirmModal(true);
  };

  const confirmRejectRequest = () => {
    if (requestToReject) {
      setIsLoading(true);
      setLoadingMessage("Rejecting request...");
      
      setTimeout(() => {
        const updatedRequests = accountRequests.map(req => 
          req.id === requestToReject.id ? { ...req, status: "declined", declinedDate: new Date().toISOString() } : req
        );
        setAccountRequests(updatedRequests);
        localStorage.setItem("accountRequests", JSON.stringify(updatedRequests));
        
        // Also update in Firestore
        updateAccountRequestStatus(requestToReject.id, "declined");
        
        setIsLoading(false);
        setLoadingMessage("Processing...");
        setSuccessMessage("Account request declined.");
        setShowSuccessModal(true);
        setShowRejectConfirmModal(false);
        setRequestToReject(null);
      }, 800);
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
    
    // Check if this is bulk decline (selectedFileIndex === -1)
    if (selectedFileIndex === -1) {
      return submitBulkDecline();
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

  /* ===== BULK ACTION HANDLERS ===== */
  const handleSelectFile = (fileIndex) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileIndex)) {
      newSelected.delete(fileIndex);
    } else {
      newSelected.add(fileIndex);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = (shouldSelect) => {
    if (shouldSelect) {
      const allIndices = new Set();
      const filesToShow = view === "dashboard" ? activeFiles : archivedFiles;
      filesToShow.forEach(f => {
        const idx = files.indexOf(f);
        if (idx !== -1) allIndices.add(idx);
      });
      setSelectedFiles(allIndices);
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleBulkApprove = () => {
    if (selectedFiles.size === 0) {
      alert("Please select files to approve.");
      return;
    }

    let approveCount = 0;
    selectedFiles.forEach(index => {
      if (files[index] && files[index].status === "Pending") {
        approveCount++;
      }
    });
    
    setApproveFilesCount(approveCount);
    setShowApproveFilesConfirmModal(true);
  };

  const confirmApproveFiles = () => {
    setIsLoading(true);
    setLoadingMessage("Approving selected files...");
    
    setTimeout(() => {
      const updated = [...files];
      let approvedCount = 0;
      
      selectedFiles.forEach(index => {
        if (updated[index] && updated[index].status === "Pending") {
          updated[index] = { ...updated[index], status: "Approved" };
          approvedCount++;
        }
      });
      
      setFiles(updated);
      setIsLoading(false);
      setLoadingMessage("Processing...");
      setSelectedFiles(new Set());
      setShowApproveFilesConfirmModal(false);
      
      setSuccessMessage(`${approvedCount} file(s) approved successfully!`);
      setShowSuccessModal(true);
    }, 800);
  };

  const cancelApproveFiles = () => {
    setShowApproveFilesConfirmModal(false);
    setApproveFilesCount(0);
  };

  const handleBulkDecline = () => {
    if (selectedFiles.size === 0) {
      alert("Please select files to decline.");
      return;
    }

    setSelectedFileIndex(-1); // Special marker for bulk decline
    setShowDeclineModal(true);
  };

  const submitBulkDecline = () => {
    if (!declineReason.trim()) {
      alert("Please enter a reason for declining.");
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage("Declining selected files...");
    
    setTimeout(() => {
      const updated = [...files];
      let declinedCount = 0;
      
      selectedFiles.forEach(index => {
        if (updated[index] && updated[index].status === "Pending") {
          updated[index] = { 
            ...updated[index], 
            status: "Declined",
            declineReason: declineReason 
          };
          declinedCount++;
        }
      });
      
      setFiles(updated);
      setShowDeclineModal(false);
      setDeclineReason("");
      setSelectedFileIndex(null);
      setIsLoading(false);
      setLoadingMessage("Processing...");
      setSelectedFiles(new Set());
      
      setSuccessMessage(`${declinedCount} file(s) declined successfully!`);
      setShowSuccessModal(true);
    }, 1000);
  };

  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) {
      alert("Please select files to delete.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)? This action cannot be undone.`)) {
      setIsLoading(true);
      setLoadingMessage("Deleting selected files...");
      
      setTimeout(() => {
        const updated = files.filter((f, idx) => !selectedFiles.has(idx));
        setFiles(updated);
        setIsLoading(false);
        setLoadingMessage("Processing...");
        setSelectedFiles(new Set());
        
        setSuccessMessage(`${selectedFiles.size} file(s) deleted successfully!`);
        setShowSuccessModal(true);
      }, 1000);
    }
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  /* ===== ACCOUNT REQUEST SELECTION HANDLERS ===== */
  const handleSelectAccountRequest = (requestId) => {
    const newSelected = new Set(selectedAccountRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedAccountRequests(newSelected);
  };

  const handleSelectAllAccountRequests = (shouldSelect) => {
    if (shouldSelect) {
      const pendingRequests = accountRequests.filter(req => !req.status || req.status === "pending");
      setSelectedAccountRequests(new Set(pendingRequests.map(r => r.id)));
    } else {
      setSelectedAccountRequests(new Set());
    }
  };

  const handleBulkApproveAccountRequests = () => {
    if (selectedAccountRequests.size === 0) {
      alert("Please select account requests to approve.");
      return;
    }

    setApprovalsToProcess(new Set(selectedAccountRequests));
    setApprovalType("bulk");
    setShowApproveConfirmModal(true);
  };

  const handleBulkRejectAccountRequests = () => {
    if (selectedAccountRequests.size === 0) {
      alert("Please select account requests to reject.");
      return;
    }

    if (window.confirm(`Are you sure you want to reject ${selectedAccountRequests.size} account request(s)?`)) {
      setIsLoading(true);
      setLoadingMessage("Rejecting selected requests...");
      
      setTimeout(() => {
        const updated = accountRequests.map(req => 
          selectedAccountRequests.has(req.id) ? { ...req, status: "declined", declinedDate: new Date().toISOString() } : req
        );
        setAccountRequests(updated);
        localStorage.setItem("accountRequests", JSON.stringify(updated));
        
        // Update each request in Firestore
        Array.from(selectedAccountRequests).forEach(requestId => {
          updateAccountRequestStatus(requestId, "declined");
        });
        
        setIsLoading(false);
        setLoadingMessage("Processing...");
        setSelectedAccountRequests(new Set());
        
        setSuccessMessage(`${selectedAccountRequests.size} account request(s) rejected successfully!`);
        setShowSuccessModal(true);
      }, 800);
    }
  };

  /* ===== CREATED ACCOUNT SELECTION HANDLERS ===== */
  const handleSelectCreatedAccount = (accountId) => {
    const newSelected = new Set(selectedCreatedAccounts);
    if (newSelected.has(accountId)) {
      newSelected.delete(accountId);
    } else {
      newSelected.add(accountId);
    }
    setSelectedCreatedAccounts(newSelected);
  };

  const handleSelectAllCreatedAccounts = (shouldSelect) => {
    if (shouldSelect) {
      setSelectedCreatedAccounts(new Set(createdAccounts.map(a => a.id)));
    } else {
      setSelectedCreatedAccounts(new Set());
    }
  };

  const handleBulkDeleteCreatedAccounts = () => {
    if (selectedCreatedAccounts.size === 0) {
      alert("Please select accounts to delete.");
      return;
    }

    setDeleteCreatedAccountsCount(selectedCreatedAccounts.size);
    setShowDeleteCreatedAccountsModal(true);
  };

  const confirmDeleteCreatedAccounts = () => {
    const countToDelete = selectedCreatedAccounts.size;
    
    setIsLoading(true);
    setLoadingMessage("Deleting selected accounts...");
    
    setTimeout(() => {
      const updated = createdAccounts.filter(a => !selectedCreatedAccounts.has(a.id));
      setCreatedAccounts(updated);
      setIsLoading(false);
      setLoadingMessage("Processing...");
      setSelectedCreatedAccounts(new Set());
      setShowDeleteCreatedAccountsModal(false);
      setDeleteCreatedAccountsCount(0);
      
      setSuccessMessage(`${countToDelete} account(s) deleted successfully!`);
      setShowSuccessModal(true);
    }, 800);
  };

  const cancelDeleteCreatedAccounts = () => {
    setShowDeleteCreatedAccountsModal(false);
    setDeleteCreatedAccountsCount(0);
  };

  /* ===== QUICK APPROVE/REJECT ALL FOR ACCOUNT REQUESTS ===== */
  const handleQuickApproveAll = () => {
    const pendingRequests = accountRequests.filter(req => !req.status || req.status === "pending");
    if (pendingRequests.length === 0) {
      alert("No pending account requests to approve.");
      return;
    }

    setApprovalsToProcess(new Set(pendingRequests.map(r => r.id)));
    setApprovalType("quickAll");
    setShowApproveConfirmModal(true);
  };

  const handleQuickRejectAll = () => {
    const pendingRequests = accountRequests.filter(req => !req.status || req.status === "pending");
    if (pendingRequests.length === 0) {
      alert("No pending account requests to reject.");
      return;
    }

    setRejectAllCount(pendingRequests.length);
    setShowRejectAllConfirmModal(true);
  };

  const confirmRejectAll = () => {
    const pendingRequests = accountRequests.filter(req => !req.status || req.status === "pending");
    
    setIsLoading(true);
    setLoadingMessage("Rejecting all pending requests...");
    
    setTimeout(() => {
      const updated = accountRequests.map(req => 
        (!req.status || req.status === "pending") ? { ...req, status: "declined", declinedDate: new Date().toISOString() } : req
      );
      setAccountRequests(updated);
      localStorage.setItem("accountRequests", JSON.stringify(updated));
      
      // Update each pending request in Firestore
      pendingRequests.forEach(req => {
        updateAccountRequestStatus(req.id, "declined");
      });
      
      setIsLoading(false);
      setLoadingMessage("Processing...");
      setSelectedAccountRequests(new Set());
      setShowRejectAllConfirmModal(false);
      setRejectAllCount(0);
      
      setSuccessMessage(`${pendingRequests.length} account request(s) rejected successfully!`);
      setShowSuccessModal(true);
    }, 800);
  };

  const cancelRejectAll = () => {
    setShowRejectAllConfirmModal(false);
    setRejectAllCount(0);
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
    const filtered = files.filter(f =>
      (f.name || f.fileName || "").toLowerCase().includes(search.toLowerCase()) &&
      (departmentFilter ? f.department === departmentFilter : true) &&
      (statusFilter ? f.status === statusFilter : true)
    );
    console.log("📊 Filtered files:", filtered.length, "files from", files.length, "total");
    if (filtered.length > 0) {
      console.log("📋 Sample file:", { 
        name: filtered[0].name || filtered[0].fileName, 
        date: filtered[0].date, 
        time: filtered[0].time,
        timestamp: filtered[0].timestamp,
        uploadedAt: filtered[0].uploadedAt,
        createdAt: filtered[0].createdAt
      });
    }
    return filtered;
  }, [files, search, departmentFilter, statusFilter]);

  /* ===== SORTED FILES ===== */
  // Helper function to extract timestamp from file - tries timestamp first (UserDashboard format)
  const getTimestamp = useCallback((f) => {
    let timestamp = 0;
    
    // Try timestamp first (this is what UserDashboard uses)
    if (f.timestamp) {
      timestamp = f.timestamp;
    } 
    // Try Firebase timestamps next
    else if (f.uploadedAt) {
      timestamp = new Date(f.uploadedAt).getTime();
    } 
    else if (f.createdAt) {
      timestamp = new Date(f.createdAt).getTime();
    } 
    // Try date/time string
    else if (f.date) {
      timestamp = new Date(f.date).getTime();
    } 
    else if (f.lastModified) {
      timestamp = f.lastModified;
    }
    
    return isNaN(timestamp) ? 0 : timestamp;
  }, []);

  const activeFiles = useMemo(() => {
    const active = filteredFiles.filter(f => !f.isArchived);
    const sorted = [...active].sort((a, b) => {
      const aTime = getTimestamp(a);
      const bTime = getTimestamp(b);
      
      if (sortOrder === "latest") {
        return bTime - aTime; // Newest first
      } else {
        return aTime - bTime; // Oldest first
      }
    });
    console.log("⬇️ Active files sorted:", sorted.length, "files, order:", sortOrder,
      sorted.map(f => ({ name: f.name, date: f.date, time: f.time, timestamp: getTimestamp(f) })));
    return sorted;
  }, [filteredFiles, sortOrder, getTimestamp]);

  const archivedFiles = useMemo(() => {
    const archived = filteredFiles.filter(f => f.isArchived);
    const sorted = [...archived].sort((a, b) => {
      const aTime = getTimestamp(a);
      const bTime = getTimestamp(b);
      
      if (sortOrder === "latest") {
        return bTime - aTime; // Newest first
      } else {
        return aTime - bTime; // Oldest first
      }
    });
    console.log("📦 Archived files sorted:", sorted.length, "files, order:", sortOrder, 
      sorted.map(f => ({ name: f.name, date: f.date, time: f.time, timestamp: getTimestamp(f) })));
    return sorted;
  }, [filteredFiles, sortOrder, getTimestamp]);

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

      {/* ACCOUNT CREATION LOADING MODAL */}
      {accountLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p style={styles.loadingText}>Creating account...</p>
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
            style={view === "ppmpOfficeTemplates" ? styles.navActive : styles.nav}
            onClick={() => setView("ppmpOfficeTemplates")}
          >
             PPMP Office Templates
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
              : view === "ppmpOfficeTemplates"
              ? "PPMP Office Templates"
              : view === "editAboutBac"
              ? "Edit About BAC"
              : view === "editDocTemplates"
              ? "Edit Documents Template"
              : view === "createAccount"
              ? "Create User Account"
              : view === "accountRequests"
              ? "Account Requests"
              : view === "analytics"
              ? "Analytics & Reports"
              : "File Compilation Dashboard"}
          </h2>
          <span style={styles.schoolYear}>School Year 2025–2026</span>
        </div>

        {/* SUMMARY CARDS (Dashboard only) */}
        {view === "dashboard" && (
          <div style={styles.cards}>
            <div style={styles.card}><h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Total Files</h4><p style={{ fontSize: 28, fontWeight: 700, color: maroon, margin: 0 }}>{totalFiles}</p></div>
            <div style={styles.card}><h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Pending</h4><p style={{ fontSize: 28, fontWeight: 700, color: maroon, margin: 0 }}>{pendingCount}</p></div>
            <div style={styles.card}><h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Approved</h4><p style={{ fontSize: 28, fontWeight: 700, color: maroon, margin: 0 }}>{approvedCount}</p></div>
            <div style={styles.card}><h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Archived</h4><p style={{ fontSize: 28, fontWeight: 700, color: maroon, margin: 0 }}>{archivedCount}</p></div>
          </div>
        )}

        {/* FILTER BAR - Not shown in Department, PPMP Management, PPMP Office Templates, Edit About BAC, Edit Document Template, Create Account, Account Requests, or Analytics view */}
        {view !== "department" && view !== "ppmp" && view !== "ppmpOfficeTemplates" && view !== "editAboutBac" && view !== "editDocTemplates" && view !== "createAccount" && view !== "accountRequests" && view !== "analytics" && view !== "pendingRequests" && view !== "approvedRequests" && view !== "declinedRequests" && (
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
            title={sortOrder === "latest" ? "Showing Latest to Oldest - Click for Oldest to Latest" : "Showing Oldest to Latest - Click for Latest to Oldest"}
          >
            {sortOrder === "latest" ? " Latest" : " Oldest"}
          </button>

          {/* <button
            style={styles.button}
            onClick={() => {
              setSearch("");
              setDepartmentFilter("");
              setStatusFilter("");
            }}
          >
            Reset
          </button> */}
        </div>
        )}

        {/* TABLE - Not shown in Department, PPMP Management, PPMP Office Templates, Edit About BAC, Edit Document Template, Create Account, Account Requests, or Analytics view */}
        {view !== "department" && view !== "ppmp" && view !== "ppmpOfficeTemplates" && view !== "editAboutBac" && view !== "editDocTemplates" && view !== "createAccount" && view !== "accountRequests" && view !== "analytics" && view !== "pendingRequests" && view !== "approvedRequests" && view !== "declinedRequests" && (
        <div style={styles.tableBox}>
          {/* BULK ACTIONS BAR */}
          {selectedFiles.size > 0 && (
            <div style={{
              background: "#f0f3f7",
              border: `2px solid ${maroon}`,
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20
            }}>
              <div style={{ fontWeight: 600, color: "#333" }}>
                {selectedFiles.size} file(s) selected
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  style={{
                    background: "#22c55e",
                    color: "white",
                    padding: "10px 18px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    transition: "0.2s"
                  }}
                  onClick={handleBulkApprove}
                  onMouseEnter={(e) => e.target.style.background = "#16a34a"}
                  onMouseLeave={(e) => e.target.style.background = "#22c55e"}
                >
                  Approve All
                </button>
                <button
                  style={{
                    background: "#f59e0b",
                    color: "white",
                    padding: "10px 18px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    transition: "0.2s"
                  }}
                  onClick={handleBulkDecline}
                  onMouseEnter={(e) => e.target.style.background = "#d97706"}
                  onMouseLeave={(e) => e.target.style.background = "#f59e0b"}
                >
                  Decline All
                </button>
                {/* <button
                  style={{
                    background: "#ef4444",
                    color: "white",
                    padding: "10px 18px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    transition: "0.2s"
                  }}
                  onClick={handleBulkDelete}
                  onMouseEnter={(e) => e.target.style.background = "#dc2626"}
                  onMouseLeave={(e) => e.target.style.background = "#ef4444"}
                >
                  Delete All
                </button> */}
                <button
                  style={{
                    background: "#e5e7eb",
                    color: "#333",
                    padding: "10px 18px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    transition: "0.2s"
                  }}
                  onClick={clearSelection}
                  onMouseEnter={(e) => e.target.style.background = "#d1d5db"}
                  onMouseLeave={(e) => e.target.style.background = "#e5e7eb"}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "center", width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.size > 0 && selectedFiles.size === (view === "dashboard" ? activeFiles : archivedFiles).length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ cursor: "pointer", width: 18, height: 18 }}
                  />
                </th>
                <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>File Name</th>
                <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Department</th>
                <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Requesting User</th>
                <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Type</th>
                <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Date</th>
                <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Time Submitted</th>
                <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "center" }}>Status</th>
                <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "center" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {(() => {
                const filesToDisplay = view === "dashboard" ? activeFiles : archivedFiles;
                const startIdx = (filesCurrentPage - 1) * filesItemsPerPage;
                const endIdx = startIdx + filesItemsPerPage;
                const paginatedFiles = filesToDisplay.slice(startIdx, endIdx);
                
                if (paginatedFiles.length === 0) {
                  return (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: 24 }}>
                        No records found
                      </td>
                    </tr>
                  );
                }
                
                return paginatedFiles.map((f, i) => {
                  const realIndex = files.indexOf(f);

                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: selectedFiles.has(realIndex) ? "#f0f3f7" : "transparent" }}>
                      <td style={{ padding: "16px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(realIndex)}
                          onChange={() => handleSelectFile(realIndex)}
                          style={{ cursor: "pointer", width: 18, height: 18 }}
                        />
                      </td>
                      <td style={{ padding: "16px 14px", cursor: "pointer", color: "#0066cc" }} onClick={() => handleViewFile(f)}>{f.name}</td>
                      <td style={{ padding: "16px 14px" }}>{f.department}</td>
                      <td style={{ padding: "16px 14px" }}>{f.requestingUser || "N/A"}</td>
                      <td style={{ padding: "16px 14px" }}>{f.type}</td>
                      <td style={{ padding: "16px 14px" }}>{f.date}</td>
                      <td style={{ padding: "16px 14px" }}>{f.time || "N/A"}</td>
                      <td style={{ padding: "16px 14px", textAlign: "center" }}>
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
              })()} 
            </tbody>
          </table>

          {/* FILES PAGINATION CONTROLS */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid #e9ecef" }}>
            <div style={{ fontSize: 13, color: "#666" }}>
              Page {filesCurrentPage} of {Math.ceil((view === "dashboard" ? activeFiles : archivedFiles).length / filesItemsPerPage)} • Showing {Math.min((filesCurrentPage - 1) * filesItemsPerPage + 1, (view === "dashboard" ? activeFiles : archivedFiles).length)}-{Math.min(filesCurrentPage * filesItemsPerPage, (view === "dashboard" ? activeFiles : archivedFiles).length)} of {(view === "dashboard" ? activeFiles : archivedFiles).length}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{
                  background: filesCurrentPage === 1 ? "#e5e7eb" : "#ffffff",
                  color: filesCurrentPage === 1 ? "#999" : "#333",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  cursor: filesCurrentPage === 1 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: 12,
                  transition: "0.2s"
                }}
                onClick={() => filesCurrentPage > 1 && setFilesCurrentPage(filesCurrentPage - 1)}
                disabled={filesCurrentPage === 1}
                onMouseEnter={(e) => { if (filesCurrentPage > 1) e.target.style.background = "#f3f4f6"; }}
                onMouseLeave={(e) => { if (filesCurrentPage > 1) e.target.style.background = "#ffffff"; }}
              >
                ← Previous
              </button>
              <button
                style={{
                  background: filesCurrentPage >= Math.ceil((view === "dashboard" ? activeFiles : archivedFiles).length / filesItemsPerPage) ? "#e5e7eb" : "#ffffff",
                  color: filesCurrentPage >= Math.ceil((view === "dashboard" ? activeFiles : archivedFiles).length / filesItemsPerPage) ? "#999" : "#333",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  cursor: filesCurrentPage >= Math.ceil((view === "dashboard" ? activeFiles : archivedFiles).length / filesItemsPerPage) ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: 12,
                  transition: "0.2s"
                }}
                onClick={() => filesCurrentPage < Math.ceil((view === "dashboard" ? activeFiles : archivedFiles).length / filesItemsPerPage) && setFilesCurrentPage(filesCurrentPage + 1)}
                disabled={filesCurrentPage >= Math.ceil((view === "dashboard" ? activeFiles : archivedFiles).length / filesItemsPerPage)}
                onMouseEnter={(e) => { if (filesCurrentPage < Math.ceil((view === "dashboard" ? activeFiles : archivedFiles).length / filesItemsPerPage)) e.target.style.background = "#f3f4f6"; }}
                onMouseLeave={(e) => { if (filesCurrentPage < Math.ceil((view === "dashboard" ? activeFiles : archivedFiles).length / filesItemsPerPage)) e.target.style.background = "#ffffff"; }}
              >
                Next →
              </button>
            </div>
          </div>
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
                      <h4 style={{...styles.statusHeader, display: "flex", alignItems: "center", gap: 8}}><Check size={18} strokeWidth={2.5} /> Approved ({approvedFiles.length})</h4>
                      <table style={styles.deptTable}>
                        <thead>
                          <tr>
                            <th>File Name</th>
                            <th>Requesting User</th>
                            <th>Date Submitted</th>
                            <th>Time Submitted</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvedFiles.map((file, idx) => (
                            <tr key={idx}>
                              <td style={styles.fileName}>{file.name}</td>
                              <td>{file.requestingUser || "N/A"}</td>
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
                            <th>Requesting User</th>
                            <th>Date Submitted</th>
                            <th>Reason</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {declinedFiles.map((file, idx) => (
                            <tr key={idx}>
                              <td style={styles.fileName}>{file.name}</td>
                              <td>{file.requestingUser || "N/A"}</td>
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


        {/* PPMP OFFICE TEMPLATES VIEW */}
        {view === "ppmpOfficeTemplates" && (
          <>
            {/* ADD NEW OFFICE TEMPLATE SECTION */}
            <div style={styles.card}>
              <h3>Create New Office PPMP Template</h3>
              <p style={styles.cardDescription}>
                Create a template structure for a specific office. Users from that office will add and manage PPMP items.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Office Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Registrar, Finance, HR"
                    value={officeTemplateForm.officeName}
                    onChange={(e) => setOfficeTemplateForm({ ...officeTemplateForm, officeName: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Office Code *</label>
                  <input
                    type="text"
                    placeholder="e.g., registrar, finance, hr"
                    value={officeTemplateForm.officeCode}
                    onChange={(e) => setOfficeTemplateForm({ ...officeTemplateForm, officeCode: e.target.value.toLowerCase() })}
                    style={styles.input}
                  />
                </div>
              </div>
              <button
                style={styles.button}
                onClick={() => {
                  if (!officeTemplateForm.officeName.trim() || !officeTemplateForm.officeCode.trim()) {
                    alert("Please fill in both office name and code");
                    return;
                  }

                  if (editingOfficeTemplateId !== null) {
                    // Update existing template
                    const updated = ppmpOfficeTemplates.map(t =>
                      t.id === editingOfficeTemplateId ? { ...officeTemplateForm, id: editingOfficeTemplateId } : t
                    );
                    setPpmpOfficeTemplates(updated);
                    setSuccessMessage("Office template updated successfully!");
                    setEditingOfficeTemplateId(null);
                  } else {
                    // Add new template
                    const newTemplate = {
                      id: Date.now(),
                      ...officeTemplateForm,
                      createdAt: new Date().toISOString(),
                      items: []
                    };
                    setPpmpOfficeTemplates([...ppmpOfficeTemplates, newTemplate]);
                    setSuccessMessage("Office template created successfully!");
                  }

                  setOfficeTemplateForm({ officeName: "", officeCode: "", items: [] });
                  setSelectedOfficeTemplateId(null);
                  setShowSuccessModal(true);
                }}
              >
                {editingOfficeTemplateId ? "✓ Update Template" : "+ Create Template"}
              </button>
              {editingOfficeTemplateId && (
                <button
                  style={{ ...styles.button, background: "#6b7280", marginTop: 10 }}
                  onClick={() => {
                    setOfficeTemplateForm({ officeName: "", officeCode: "", items: [] });
                    setEditingOfficeTemplateId(null);
                  }}
                >
                  ✕ Cancel Edit
                </button>
              )}
            </div>

            {/* EXISTING OFFICE TEMPLATES LIST */}
            {ppmpOfficeTemplates.length > 0 && (
              <div style={styles.card}>
                <h3>Office PPMP Templates ({ppmpOfficeTemplates.length})</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
                  {ppmpOfficeTemplates.map((template) => (
                    <div key={template.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, backgroundColor: "#f9fafb" }}>
                      <div style={{ marginBottom: 12 }}>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: maroon }}>{template.officeName}</h4>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>Code: {template.officeCode}</p>
                      </div>

                      <div style={{ marginBottom: 12, fontSize: 13, color: "#666" }}>
                        <strong>{template.items.length}</strong> PPMP Items
                      </div>

                      {/* ITEMS LIST */}
                      {template.items.length > 0 && (
                        <div style={{ marginBottom: 12, maxHeight: 200, overflowY: "auto", backgroundColor: "white", padding: 8, borderRadius: 4, border: "1px solid #e5e7eb" }}>
                          {template.items.map((item, idx) => (
                            <div key={item.id} style={{ fontSize: 12, paddingBottom: 8, borderBottom: idx < template.items.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 4 }}>
                                <p style={{ margin: 0, fontWeight: 500 }}>{item.name}</p>
                                <span style={{ fontSize: 11, color: "#999", backgroundColor: item.status === "Complete" ? "#d1fae5" : item.status === "Incomplete" ? "#fed7aa" : "#fee2e2", padding: "2px 6px", borderRadius: 3, display: "inline-block" }}>
                                  {item.status}
                                </span>
                              </div>
                              <p style={{ margin: "2px 0", fontSize: 11, color: "#666" }}>Added by: {item.createdBy || "Unknown"}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ACTION BUTTONS */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          style={{ ...styles.button, flex: 1, fontSize: 13, padding: "8px 12px", background: "#3b82f6" }}
                          onClick={() => {
                            setViewingOfficeTemplate(template);
                            setShowViewOfficeTemplateModal(true);
                          }}
                        >
                          View
                        </button>
                        <button
                          style={{ ...styles.button, flex: 1, fontSize: 13, padding: "8px 12px", background: "#ef4444" }}
                          onClick={() => {
                            setOfficeTemplateToDelete(template);
                            setShowDeleteOfficeTemplateModal(true);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ppmpOfficeTemplates.length === 0 && (
              <div style={styles.card}>
                <p style={{ textAlign: "center", color: "#999" }}>No office templates created yet. Create one above to get started.</p>
              </div>
            )}
          </>
        )}

        {/* VIEW OFFICE TEMPLATE MODAL */}
        {showViewOfficeTemplateModal && viewingOfficeTemplate && (
          <div style={styles.modalOverlay}>
            <div style={{ ...styles.modal, minWidth: 550, maxWidth: 800 }}>
              {/* HEADER */}
              <div style={{ borderBottom: `3px solid ${maroon}`, paddingBottom: 16, marginBottom: 20 }}>
                <h3 style={{ ...styles.modalTitle, margin: 0, color: maroon }}>{viewingOfficeTemplate.officeName}</h3>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#666" }}>Office Code: <strong style={{ fontSize: 14 }}>{viewingOfficeTemplate.officeCode.toUpperCase()}</strong></p>
              </div>
              
              {/* TEMPLATE DETAILS */}
              <div style={{ backgroundColor: "#f0fdf4", padding: 16, borderRadius: 8, marginBottom: 20, border: "1px solid #dcfce7" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Total Items</p>
                    <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: maroon }}>{viewingOfficeTemplate.items.length}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Created</p>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "#333" }}>{viewingOfficeTemplate.createdAt ? new Date(viewingOfficeTemplate.createdAt).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
              </div>
              
              {/* ITEMS LIST */}
              {viewingOfficeTemplate.items.length > 0 ? (
                <div style={{ maxHeight: 450, overflowY: "auto", marginBottom: 20 }}>
                  <h4 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: 0.5 }}>PPMP Items</h4>
                  <div style={{ display: "grid", gap: 12 }}>
                    {viewingOfficeTemplate.items.map((item, idx) => (
                      <div key={item.id} style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        padding: 14,
                        backgroundColor: "#fafafa",
                        transition: "all 0.2s"
                      }}>
                        {/* Item Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{ flex: 1 }}>
                            <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: maroon }}>{item.name}</h5>
                            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#999" }}>Item #{idx + 1}</p>
                          </div>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "white",
                            backgroundColor: item.status === "Complete" ? "#22c55e" : item.status === "In Progress" ? "#f59e0b" : item.status === "Incomplete" ? "#ef4444" : "#6b7280",
                            padding: "5px 12px",
                            borderRadius: 4,
                            textTransform: "capitalize",
                            whiteSpace: "nowrap"
                          }}>
                            {item.status}
                          </span>
                        </div>
                        
                        {/* Item Description */}
                        {item.description && (
                          <p style={{ margin: "10px 0", fontSize: 12, color: "#555", fontStyle: "italic", lineHeight: 1.5 }}>📝 {item.description}</p>
                        )}
                        
                        {/* Item Details Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10, fontSize: 12, color: "#666" }}>
                          {item.dueDate && (
                            <div>
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase" }}>Due Date</p>
                              <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 500, color: "#333" }}>📅 {new Date(item.dueDate).toLocaleDateString()}</p>
                            </div>
                          )}
                          <div>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase" }}>Added By</p>
                            <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 500, color: "#333" }}>👤 {item.createdBy || "Unknown"}</p>
                          </div>
                        </div>
                        
                        {/* Metadata */}
                        <p style={{ margin: "8px 0 0", fontSize: 11, color: "#999", borderTop: "1px solid #f0f0f0", paddingTop: 8 }}>
                          ⏰ {new Date(item.createdAt).toLocaleString()}
                        </p>
                        
                        {/* Image Display */}
                        {item.proofImage && (
                          <div style={{ marginTop: 10, padding: 8, backgroundColor: "#f0f9ff", borderRadius: 4, border: "1px solid #bfdbfe" }}>
                            <p style={{ margin: "0 0 6px 0", fontSize: 11, fontWeight: 600, color: "#1e40af" }}>📸 Image Attached</p>
                            <img src={item.proofImage} alt="Item" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 4, cursor: "pointer" }} onClick={() => window.open(item.proofImage, "_blank")} title="Click to view full size" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: "#fef2f2", padding: 20, borderRadius: 8, textAlign: "center", border: "1px solid #fecaca", marginBottom: 20 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "#991b1b" }}>ℹ️ No items in this template yet</p>
                </div>
              )}
              
              <div style={styles.modalButtons}>
                <button
                  style={styles.confirmButton}
                  onClick={() => {
                    setShowViewOfficeTemplateModal(false);
                    setViewingOfficeTemplate(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE OFFICE TEMPLATE MODAL */}
        {showDeleteOfficeTemplateModal && officeTemplateToDelete && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h3 style={styles.modalTitle}>Delete Office Template</h3>
              <p style={styles.modalSubtitle}>
                Are you sure you want to delete the "{officeTemplateToDelete.officeName}" template? This action cannot be undone.
              </p>
              <div style={styles.modalButtons}>
                <button
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowDeleteOfficeTemplateModal(false);
                    setOfficeTemplateToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{ ...styles.button, background: "#ef4444" }}
                  onClick={() => {
                    setPpmpOfficeTemplates(ppmpOfficeTemplates.filter(t => t.id !== officeTemplateToDelete.id));
                    setSuccessMessage("Office template deleted successfully!");
                    setShowSuccessModal(true);
                    setShowDeleteOfficeTemplateModal(false);
                    setOfficeTemplateToDelete(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW ALL PPMP STATUS */}


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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "32px" }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "32px" }}>
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
                      <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#999", display: "flex", alignItems: "center", gap: 6 }}>
                        <FileText size={14} /> File uploaded
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
                  setAccountForm({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", role: "user", adminConfirm: false });
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

                {/* BULK ACTIONS BAR */}
                {selectedCreatedAccounts.size > 0 && (
                  <div style={{
                    background: "#f0f3f7",
                    border: `2px solid ${maroon}`,
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 20,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 20
                  }}>
                    <div style={{ fontWeight: 600, color: "#333" }}>
                      {selectedCreatedAccounts.size} account(s) selected
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button
                        style={{
                          background: "#ef4444",
                          color: "white",
                          padding: "10px 18px",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 13,
                          transition: "0.2s"
                        }}
                        onClick={handleBulkDeleteCreatedAccounts}
                        onMouseEnter={(e) => e.target.style.background = "#dc2626"}
                        onMouseLeave={(e) => e.target.style.background = "#ef4444"}
                      >
                        Delete All
                      </button>
                      <button
                        style={{
                          background: "#e5e7eb",
                          color: "#333",
                          padding: "10px 18px",
                          borderRadius: 6,
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: 13,
                          transition: "0.2s"
                        }}
                        onClick={() => setSelectedCreatedAccounts(new Set())}
                        onMouseEnter={(e) => e.target.style.background = "#d1d5db"}
                        onMouseLeave={(e) => e.target.style.background = "#e5e7eb"}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                        <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "center", width: "40px" }}>
                          <input
                            type="checkbox"
                            checked={(() => {
                              const startIdx = (createdAccountsCurrentPage - 1) * createdAccountsItemsPerPage;
                              const endIdx = startIdx + createdAccountsItemsPerPage;
                              const pageAccounts = createdAccounts.slice(startIdx, endIdx);
                              return pageAccounts.length > 0 && pageAccounts.every(acc => selectedCreatedAccounts.has(acc.id));
                            })()}
                            onChange={(e) => {
                              const startIdx = (createdAccountsCurrentPage - 1) * createdAccountsItemsPerPage;
                              const endIdx = startIdx + createdAccountsItemsPerPage;
                              const pageAccounts = createdAccounts.slice(startIdx, endIdx);
                              if (e.target.checked) {
                                const newSelected = new Set(selectedCreatedAccounts);
                                pageAccounts.forEach(a => newSelected.add(a.id));
                                setSelectedCreatedAccounts(newSelected);
                              } else {
                                const newSelected = new Set(selectedCreatedAccounts);
                                pageAccounts.forEach(a => newSelected.delete(a.id));
                                setSelectedCreatedAccounts(newSelected);
                              }
                            }}
                          />
                        </th>
                        <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Name</th>
                        <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Email</th>
                        <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Department</th>
                        <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Role</th>
                        <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Created By</th>
                        <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "left" }}>Created Date</th>
                        <th style={{ padding: "18px 16px", fontWeight: 600, fontSize: 14, color: "#333", textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const startIdx = (createdAccountsCurrentPage - 1) * createdAccountsItemsPerPage;
                        const endIdx = startIdx + createdAccountsItemsPerPage;
                        return createdAccounts.slice(startIdx, endIdx).map((account) => (
                          <tr key={account.id} style={{ backgroundColor: selectedCreatedAccounts.has(account.id) ? "#f0f3f7" : "transparent", borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "16px 14px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={selectedCreatedAccounts.has(account.id)}
                                onChange={() => handleSelectCreatedAccount(account.id)}
                                style={{ cursor: "pointer", width: 18, height: 18 }}
                              />
                            </td>
                            <td style={{ padding: "16px 14px", fontWeight: "500" }}>{account.firstName} {account.lastName}</td>
                            <td style={{ padding: "16px 14px" }}>{account.email}</td>
                            <td style={{ padding: "16px 14px", fontSize: "12px", color: "#333" }}>{account.department || "N/A"}</td>
                            <td style={{ padding: "16px 14px" }}>
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
                            <td style={{ padding: "16px 14px", fontSize: "12px", color: "#666" }}>{account.createdBy}</td>
                            <td style={{ padding: "16px 14px", fontSize: "12px", color: "#999" }}>
                              {new Date(account.createdDate).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "16px 14px", textAlign: "center" }}>
                              <button
                                style={{...styles.declineButtonSmall, padding: "6px 12px", fontSize: "12px"}}
                                onClick={() => handleDeleteAccount(account.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid #e9ecef" }}>
                  <div style={{ fontSize: 13, color: "#666" }}>
                    Page {createdAccountsCurrentPage} of {Math.ceil(createdAccounts.length / createdAccountsItemsPerPage)} • Showing {Math.min((createdAccountsCurrentPage - 1) * createdAccountsItemsPerPage + 1, createdAccounts.length)}-{Math.min(createdAccountsCurrentPage * createdAccountsItemsPerPage, createdAccounts.length)} of {createdAccounts.length}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={{
                        background: createdAccountsCurrentPage === 1 ? "#e5e7eb" : "#ffffff",
                        color: createdAccountsCurrentPage === 1 ? "#999" : "#333",
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        cursor: createdAccountsCurrentPage === 1 ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: 12,
                        transition: "0.2s"
                      }}
                      onClick={() => createdAccountsCurrentPage > 1 && setCreatedAccountsCurrentPage(createdAccountsCurrentPage - 1)}
                      disabled={createdAccountsCurrentPage === 1}
                      onMouseEnter={(e) => { if (createdAccountsCurrentPage > 1) e.target.style.background = "#f3f4f6"; }}
                      onMouseLeave={(e) => { if (createdAccountsCurrentPage > 1) e.target.style.background = "#ffffff"; }}
                    >
                      ← Previous
                    </button>
                    <button
                      style={{
                        background: createdAccountsCurrentPage >= Math.ceil(createdAccounts.length / createdAccountsItemsPerPage) ? "#e5e7eb" : "#ffffff",
                        color: createdAccountsCurrentPage >= Math.ceil(createdAccounts.length / createdAccountsItemsPerPage) ? "#999" : "#333",
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        cursor: createdAccountsCurrentPage >= Math.ceil(createdAccounts.length / createdAccountsItemsPerPage) ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: 12,
                        transition: "0.2s"
                      }}
                      onClick={() => createdAccountsCurrentPage < Math.ceil(createdAccounts.length / createdAccountsItemsPerPage) && setCreatedAccountsCurrentPage(createdAccountsCurrentPage + 1)}
                      disabled={createdAccountsCurrentPage >= Math.ceil(createdAccounts.length / createdAccountsItemsPerPage)}
                      onMouseEnter={(e) => { if (createdAccountsCurrentPage < Math.ceil(createdAccounts.length / createdAccountsItemsPerPage)) e.target.style.background = "#f3f4f6"; }}
                      onMouseLeave={(e) => { if (createdAccountsCurrentPage < Math.ceil(createdAccounts.length / createdAccountsItemsPerPage)) e.target.style.background = "#ffffff"; }}
                    >
                      Next →
                    </button>
                  </div>
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
            {accountRequests.length === 0 ? (
              <div style={styles.card}>
                <p style={{ textAlign: "center", color: "#999" }}>No account requests yet.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "28px" }}>
                {/* PENDING REQUESTS SECTION */}
                {accountRequests.filter(req => !req.status || req.status === "pending").length > 0 && (
                  <div style={styles.card}>
                    <h3 style={{display: "flex", alignItems: "center", gap: 10}}><Clock size={24} strokeWidth={2} /> Pending ({accountRequests.filter(req => !req.status || req.status === "pending").length})</h3>
                    <p style={styles.cardDescription}>
                      Users who have requested accounts. Approve or reject their requests.
                    </p>

                    {/* BULK ACTIONS BAR */}
                    {selectedAccountRequests.size > 0 && (
                      <div style={{
                        background: "#f0f3f7",
                        border: `2px solid ${maroon}`,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap"
                      }}>
                        <div style={{ fontWeight: 600, color: "#333", fontSize: 13 }}>
                          {selectedAccountRequests.size} selected
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            style={{
                              background: "#22c55e",
                              color: "white",
                              padding: "8px 14px",
                              borderRadius: 5,
                              border: "none",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 12,
                              transition: "0.2s"
                            }}
                            onClick={handleBulkApproveAccountRequests}
                            onMouseEnter={(e) => e.target.style.background = "#16a34a"}
                            onMouseLeave={(e) => e.target.style.background = "#22c55e"}
                          >
                            Approve
                          </button>
                          <button
                            style={{
                              background: "#ef4444",
                              color: "white",
                              padding: "8px 14px",
                              borderRadius: 5,
                              border: "none",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 12,
                              transition: "0.2s"
                            }}
                            onClick={handleBulkRejectAccountRequests}
                            onMouseEnter={(e) => e.target.style.background = "#dc2626"}
                            onMouseLeave={(e) => e.target.style.background = "#ef4444"}
                          >
                            Reject
                          </button>
                          <button
                            style={{
                              background: "#e5e7eb",
                              color: "#333",
                              padding: "8px 14px",
                              borderRadius: 5,
                              border: "none",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: 12,
                              transition: "0.2s"
                            }}
                            onClick={() => setSelectedAccountRequests(new Set())}
                            onMouseEnter={(e) => e.target.style.background = "#d1d5db"}
                            onMouseLeave={(e) => e.target.style.background = "#e5e7eb"}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ overflowX: "auto" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                            <th style={{ padding: "14px 12px", fontWeight: 600, fontSize: 13, color: "#333", textAlign: "center", width: "32px" }}>
                              <input
                                type="checkbox"
                                checked={(() => {
                                  const pendingRequests = accountRequests.filter(req => !req.status || req.status === "pending");
                                  const startIdx = (pendingCurrentPage - 1) * itemsPerPage;
                                  const endIdx = startIdx + itemsPerPage;
                                  const pageRequests = pendingRequests.slice(startIdx, endIdx);
                                  return pageRequests.length > 0 && pageRequests.every(req => selectedAccountRequests.has(req.id));
                                })()}
                                onChange={(e) => {
                                  const pendingRequests = accountRequests.filter(req => !req.status || req.status === "pending");
                                  const startIdx = (pendingCurrentPage - 1) * itemsPerPage;
                                  const endIdx = startIdx + itemsPerPage;
                                  const pageRequests = pendingRequests.slice(startIdx, endIdx);
                                  if (e.target.checked) {
                                    const newSelected = new Set(selectedAccountRequests);
                                    pageRequests.forEach(r => newSelected.add(r.id));
                                    setSelectedAccountRequests(newSelected);
                                  } else {
                                    const newSelected = new Set(selectedAccountRequests);
                                    pageRequests.forEach(r => newSelected.delete(r.id));
                                    setSelectedAccountRequests(newSelected);
                                  }
                                }}
                                style={{ cursor: "pointer", width: 16, height: 16 }}
                              />
                            </th>
                            <th style={{ padding: "14px 12px", fontWeight: 600, fontSize: 13, color: "#333", textAlign: "left" }}>Name</th>
                            <th style={{ padding: "14px 12px", fontWeight: 600, fontSize: 13, color: "#333", textAlign: "left" }}>Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const pendingRequests = accountRequests.filter(req => !req.status || req.status === "pending");
                            const startIdx = (pendingCurrentPage - 1) * itemsPerPage;
                            const endIdx = startIdx + itemsPerPage;
                            const paginatedRequests = pendingRequests.slice(startIdx, endIdx);
                            
                            if (paginatedRequests.length === 0) {
                              return <tr><td colSpan="3" style={{ textAlign: "center", padding: 12 }}>No pending requests</td></tr>;
                            }
                            
                            return paginatedRequests.map((request) => (
                              <tr key={request.id} style={{ backgroundColor: selectedAccountRequests.has(request.id) ? "#f0f3f7" : "transparent", borderBottom: "1px solid #f0f0f0" }}>
                                <td style={{ padding: "12px", textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedAccountRequests.has(request.id)}
                                    onChange={() => handleSelectAccountRequest(request.id)}
                                    style={{ cursor: "pointer", width: 16, height: 16 }}
                                  />
                                </td>
                                <td style={{ padding: "12px", fontWeight: "500", fontSize: 13 }}>{request.name}</td>
                                <td style={{ padding: "12px", fontSize: "12px", color: "#666" }}>{request.email}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* PENDING PAGINATION CONTROLS */}
                    {accountRequests.filter(req => !req.status || req.status === "pending").length > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #e9ecef" }}>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          Page {pendingCurrentPage} of {Math.ceil(accountRequests.filter(req => !req.status || req.status === "pending").length / itemsPerPage)} • Showing {Math.min((pendingCurrentPage - 1) * itemsPerPage + 1, accountRequests.filter(req => !req.status || req.status === "pending").length)}-{Math.min(pendingCurrentPage * itemsPerPage, accountRequests.filter(req => !req.status || req.status === "pending").length)} of {accountRequests.filter(req => !req.status || req.status === "pending").length}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{
                              background: pendingCurrentPage === 1 ? "#e5e7eb" : "#ffffff",
                              color: pendingCurrentPage === 1 ? "#999" : "#333",
                              padding: "6px 10px",
                              border: "1px solid #ddd",
                              borderRadius: 4,
                              cursor: pendingCurrentPage === 1 ? "not-allowed" : "pointer",
                              fontWeight: 600,
                              fontSize: 11,
                              transition: "0.2s"
                            }}
                            onClick={() => pendingCurrentPage > 1 && setPendingCurrentPage(pendingCurrentPage - 1)}
                            disabled={pendingCurrentPage === 1}
                            onMouseEnter={(e) => { if (pendingCurrentPage > 1) e.target.style.background = "#f3f4f6"; }}
                            onMouseLeave={(e) => { if (pendingCurrentPage > 1) e.target.style.background = "#ffffff"; }}
                          >
                            ← Prev
                          </button>
                          <button
                            style={{
                              background: pendingCurrentPage >= Math.ceil(accountRequests.filter(req => !req.status || req.status === "pending").length / itemsPerPage) ? "#e5e7eb" : "#ffffff",
                              color: pendingCurrentPage >= Math.ceil(accountRequests.filter(req => !req.status || req.status === "pending").length / itemsPerPage) ? "#999" : "#333",
                              padding: "6px 10px",
                              border: "1px solid #ddd",
                              borderRadius: 4,
                              cursor: pendingCurrentPage >= Math.ceil(accountRequests.filter(req => !req.status || req.status === "pending").length / itemsPerPage) ? "not-allowed" : "pointer",
                              fontWeight: 600,
                              fontSize: 11,
                              transition: "0.2s"
                            }}
                            onClick={() => pendingCurrentPage < Math.ceil(accountRequests.filter(req => !req.status || req.status === "pending").length / itemsPerPage) && setPendingCurrentPage(pendingCurrentPage + 1)}
                            disabled={pendingCurrentPage >= Math.ceil(accountRequests.filter(req => !req.status || req.status === "pending").length / itemsPerPage)}
                            onMouseEnter={(e) => { if (pendingCurrentPage < Math.ceil(accountRequests.filter(req => !req.status || req.status === "pending").length / itemsPerPage)) e.target.style.background = "#f3f4f6"; }}
                            onMouseLeave={(e) => { if (pendingCurrentPage < Math.ceil(accountRequests.filter(req => !req.status || req.status === "pending").length / itemsPerPage)) e.target.style.background = "#ffffff"; }}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}

                    {accountRequests.filter(req => !req.status || req.status === "pending").length > 0 && (
                      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button
                          style={{...styles.button, padding: "8px 12px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6}}
                          onClick={handleQuickApproveAll}
                        >
                          <Check size={16} strokeWidth={2.5} /> Approve All
                        </button>
                        <button
                          style={{...styles.declineButtonSmall, padding: "8px 12px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6}}
                          onClick={handleQuickRejectAll}
                        >
                          <X size={16} strokeWidth={2.5} /> Reject All
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* APPROVED REQUESTS SECTION */}
                {accountRequests.filter(req => req.status === "approved").length > 0 && (
                  <div style={styles.card}>
                    <h3 style={{display: "flex", alignItems: "center", gap: 10}}><Check size={24} strokeWidth={2} /> Approved ({accountRequests.filter(req => req.status === "approved").length})</h3>
                    <p style={styles.cardDescription}>
                      Account requests that have been approved.
                    </p>

                    <div style={{ overflowX: "auto" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                            <th style={{ padding: "14px 12px", fontWeight: 600, fontSize: 13, color: "#333", textAlign: "left" }}>Name</th>
                            <th style={{ padding: "14px 12px", fontWeight: 600, fontSize: 13, color: "#333", textAlign: "left" }}>Email</th>
                            <th style={{ padding: "14px 12px", fontWeight: 600, fontSize: 13, color: "#333", textAlign: "left" }}>Approved Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const approvedRequests = accountRequests.filter(req => req.status === "approved");
                            const startIdx = (approvedCurrentPage - 1) * itemsPerPage;
                            const endIdx = startIdx + itemsPerPage;
                            const paginatedRequests = approvedRequests.slice(startIdx, endIdx);
                            
                            if (paginatedRequests.length === 0) {
                              return <tr><td colSpan="3" style={{ textAlign: "center", padding: 12 }}>No approved requests</td></tr>;
                            }
                            
                            return paginatedRequests.map((request) => (
                              <tr key={request.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                <td style={{ padding: "12px", fontWeight: "500", fontSize: 13 }}>{request.name}</td>
                                <td style={{ padding: "12px", fontSize: "12px", color: "#666" }}>{request.email}</td>
                                <td style={{ padding: "12px", fontSize: "12px", color: "#22c55e", fontWeight: "600" }}>
                                  {new Date(request.approvedDate).toLocaleDateString()}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* APPROVED PAGINATION CONTROLS */}
                    {accountRequests.filter(req => req.status === "approved").length > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid #e9ecef" }}>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          Page {approvedCurrentPage} of {Math.ceil(accountRequests.filter(req => req.status === "approved").length / itemsPerPage)} • Showing {Math.min((approvedCurrentPage - 1) * itemsPerPage + 1, accountRequests.filter(req => req.status === "approved").length)}-{Math.min(approvedCurrentPage * itemsPerPage, accountRequests.filter(req => req.status === "approved").length)} of {accountRequests.filter(req => req.status === "approved").length}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{
                              background: approvedCurrentPage === 1 ? "#e5e7eb" : "#ffffff",
                              color: approvedCurrentPage === 1 ? "#999" : "#333",
                              padding: "6px 10px",
                              border: "1px solid #ddd",
                              borderRadius: 4,
                              cursor: approvedCurrentPage === 1 ? "not-allowed" : "pointer",
                              fontWeight: 600,
                              fontSize: 11,
                              transition: "0.2s"
                            }}
                            onClick={() => approvedCurrentPage > 1 && setApprovedCurrentPage(approvedCurrentPage - 1)}
                            disabled={approvedCurrentPage === 1}
                            onMouseEnter={(e) => { if (approvedCurrentPage > 1) e.target.style.background = "#f3f4f6"; }}
                            onMouseLeave={(e) => { if (approvedCurrentPage > 1) e.target.style.background = "#ffffff"; }}
                          >
                            ← Prev
                          </button>
                          <button
                            style={{
                              background: approvedCurrentPage >= Math.ceil(accountRequests.filter(req => req.status === "approved").length / itemsPerPage) ? "#e5e7eb" : "#ffffff",
                              color: approvedCurrentPage >= Math.ceil(accountRequests.filter(req => req.status === "approved").length / itemsPerPage) ? "#999" : "#333",
                              padding: "6px 10px",
                              border: "1px solid #ddd",
                              borderRadius: 4,
                              cursor: approvedCurrentPage >= Math.ceil(accountRequests.filter(req => req.status === "approved").length / itemsPerPage) ? "not-allowed" : "pointer",
                              fontWeight: 600,
                              fontSize: 11,
                              transition: "0.2s"
                            }}
                            onClick={() => approvedCurrentPage < Math.ceil(accountRequests.filter(req => req.status === "approved").length / itemsPerPage) && setApprovedCurrentPage(approvedCurrentPage + 1)}
                            disabled={approvedCurrentPage >= Math.ceil(accountRequests.filter(req => req.status === "approved").length / itemsPerPage)}
                            onMouseEnter={(e) => { if (approvedCurrentPage < Math.ceil(accountRequests.filter(req => req.status === "approved").length / itemsPerPage)) e.target.style.background = "#f3f4f6"; }}
                            onMouseLeave={(e) => { if (approvedCurrentPage < Math.ceil(accountRequests.filter(req => req.status === "approved").length / itemsPerPage)) e.target.style.background = "#ffffff"; }}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {accountRequests.filter(req => req.status === "declined").length > 0 && (
                  <div style={styles.card}>
                    <h3 style={{display: "flex", alignItems: "center", gap: 10}}><X size={24} strokeWidth={2} /> Declined ({accountRequests.filter(req => req.status === "declined").length})</h3>
                    <p style={styles.cardDescription}>
                      Account requests that have been declined.
                    </p>

                    <div style={{ overflowX: "auto" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #e9ecef" }}>
                            <th style={{ padding: "14px 12px", fontWeight: 600, fontSize: 13, color: "#333", textAlign: "left" }}>Name</th>
                            <th style={{ padding: "14px 12px", fontWeight: 600, fontSize: 13, color: "#333", textAlign: "left" }}>Email</th>
                            <th style={{ padding: "14px 12px", fontWeight: 600, fontSize: 13, color: "#333", textAlign: "left" }}>Declined Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const declinedRequests = accountRequests.filter(req => req.status === "declined");
                            const startIdx = (declinedCurrentPage - 1) * itemsPerPage;
                            const endIdx = startIdx + itemsPerPage;
                            const paginatedRequests = declinedRequests.slice(startIdx, endIdx);
                            
                            if (paginatedRequests.length === 0) {
                              return <tr><td colSpan="3" style={{ textAlign: "center", padding: 12 }}>No declined requests</td></tr>;
                            }
                            
                            return paginatedRequests.map((request) => (
                              <tr key={request.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                <td style={{ padding: "12px", fontWeight: "500", fontSize: 13 }}>{request.name}</td>
                                <td style={{ padding: "12px", fontSize: "12px", color: "#666" }}>{request.email}</td>
                                <td style={{ padding: "12px", fontSize: "12px", color: "#ef4444", fontWeight: "600" }}>
                                  {new Date(request.declinedDate).toLocaleDateString()}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* DECLINED PAGINATION CONTROLS */}
                    {accountRequests.filter(req => req.status === "declined").length > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid #e9ecef" }}>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          Page {declinedCurrentPage} of {Math.ceil(accountRequests.filter(req => req.status === "declined").length / itemsPerPage)} • Showing {Math.min((declinedCurrentPage - 1) * itemsPerPage + 1, accountRequests.filter(req => req.status === "declined").length)}-{Math.min(declinedCurrentPage * itemsPerPage, accountRequests.filter(req => req.status === "declined").length)} of {accountRequests.filter(req => req.status === "declined").length}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            style={{
                              background: declinedCurrentPage === 1 ? "#e5e7eb" : "#ffffff",
                              color: declinedCurrentPage === 1 ? "#999" : "#333",
                              padding: "6px 10px",
                              border: "1px solid #ddd",
                              borderRadius: 4,
                              cursor: declinedCurrentPage === 1 ? "not-allowed" : "pointer",
                              fontWeight: 600,
                              fontSize: 11,
                              transition: "0.2s"
                            }}
                            onClick={() => declinedCurrentPage > 1 && setDeclinedCurrentPage(declinedCurrentPage - 1)}
                            disabled={declinedCurrentPage === 1}
                            onMouseEnter={(e) => { if (declinedCurrentPage > 1) e.target.style.background = "#f3f4f6"; }}
                            onMouseLeave={(e) => { if (declinedCurrentPage > 1) e.target.style.background = "#ffffff"; }}
                          >
                            ← Prev
                          </button>
                          <button
                            style={{
                              background: declinedCurrentPage >= Math.ceil(accountRequests.filter(req => req.status === "declined").length / itemsPerPage) ? "#e5e7eb" : "#ffffff",
                              color: declinedCurrentPage >= Math.ceil(accountRequests.filter(req => req.status === "declined").length / itemsPerPage) ? "#999" : "#333",
                              padding: "6px 10px",
                              border: "1px solid #ddd",
                              borderRadius: 4,
                              cursor: declinedCurrentPage >= Math.ceil(accountRequests.filter(req => req.status === "declined").length / itemsPerPage) ? "not-allowed" : "pointer",
                              fontWeight: 600,
                              fontSize: 11,
                              transition: "0.2s"
                            }}
                            onClick={() => declinedCurrentPage < Math.ceil(accountRequests.filter(req => req.status === "declined").length / itemsPerPage) && setDeclinedCurrentPage(declinedCurrentPage + 1)}
                            disabled={declinedCurrentPage >= Math.ceil(accountRequests.filter(req => req.status === "declined").length / itemsPerPage)}
                            onMouseEnter={(e) => { if (declinedCurrentPage < Math.ceil(accountRequests.filter(req => req.status === "declined").length / itemsPerPage)) e.target.style.background = "#f3f4f6"; }}
                            onMouseLeave={(e) => { if (declinedCurrentPage < Math.ceil(accountRequests.filter(req => req.status === "declined").length / itemsPerPage)) e.target.style.background = "#ffffff"; }}
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "32px" }}>
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
                <p><strong>Requesting User:</strong> {selectedFile.requestingUser || "N/A"}</p>
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
                {selectedRequestId 
                  ? "Create Account from Request" 
                  : accountForm.role === "admin" 
                  ? "Create New Admin Account" 
                  : "Create New User Account"}
              </h3>
              
              {accountError && (
                <div style={styles.errorBox}>
                  <strong>Error:</strong> {accountError}
                </div>
              )}

              {/* ADMIN WARNING */}
              {accountForm.role === "admin" && (
                <div style={{
                  padding: "12px",
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: "5px",
                  marginBottom: "15px"
                }}>
                  <p style={{ margin: 0, fontSize: "13px", color: "#856404", fontWeight: "500", display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={18} strokeWidth={2} /> Warning: You are creating an ADMIN account
                  </p>
                  <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#856404" }}>
                    Admin accounts have full access to all system features including file management, user management, and PPMP verification.
                  </p>
                </div>
              )}

              <form onSubmit={handleCreateAccount} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
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

                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Department *</label>
                  <input
                    type="text"
                    value={accountForm.department}
                    onChange={(e) => setAccountForm({ ...accountForm, department: e.target.value })}
                    placeholder="e.g., HR, Finance, Registrar, Accounting"
                    style={styles.input}
                  />
                </div>

                {/* ADMIN-SPECIFIC FIELDS */}
                {accountForm.role === "admin" && (
                  <>
                    <div style={{
                      padding: "12px",
                      backgroundColor: "#f0f8ff",
                      border: "1px solid #0066cc",
                      borderRadius: "5px"
                    }}>
                      <p style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "500", color: "#0066cc" }}>
                        Admin Responsibilities:
                      </p>
                      <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#333", lineHeight: "1.6" }}>
                        <li>Manage file submissions and approvals</li>
                        <li>Verify PPMP status across departments</li>
                        <li>Create and manage user accounts</li>
                        <li>Edit team members and templates</li>
                        <li>View analytics and reports</li>
                      </ul>
                    </div>

                    <div>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                        <input
                          type="checkbox"
                          checked={accountForm.adminConfirm || false}
                          onChange={(e) => setAccountForm({ ...accountForm, adminConfirm: e.target.checked })}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                        <span style={{ fontWeight: "500" }}>
                          I confirm I want to create this Admin account
                        </span>
                      </label>
                    </div>
                  </>
                )}

                <div style={styles.modalButtons}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={() => {
                      setShowCreateAccountModal(false);
                      setAccountForm({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "", role: "user", department: "", adminConfirm: false });
                      setAccountError("");
                      setSelectedRequestId(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{...styles.confirmButton, ...(accountLoading || (accountForm.role === "admin" && !accountForm.adminConfirm) ? styles.buttonDisabled : {})}}
                    disabled={accountLoading || (accountForm.role === "admin" && !accountForm.adminConfirm)}
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
            <div style={{...styles.modal, minWidth: "550px"}}>
              <h3 style={styles.modalTitle}>{editingTemplateId ? "Edit Template" : "Add Template"}</h3>
              
              <form style={{ display: "flex", flexDirection: "column", gap: "20px", margin: "0" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#333", textTransform: "uppercase", letterSpacing: "0.5px" }}>Template Name *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g., Bid Evaluation Form"
                    style={{...styles.input, padding: "12px 14px", fontSize: "14px", width: "100%", boxSizing: "border-box"}}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#333", textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</label>
                  <textarea
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="Brief description of the template (optional)"
                    style={{...styles.input, minHeight: "120px", padding: "12px 14px", fontSize: "14px", resize: "vertical", fontFamily: "inherit", width: "100%", boxSizing: "border-box"}}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "13px", color: "#333", textTransform: "uppercase", letterSpacing: "0.5px" }}>Upload File *</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx"
                    onChange={handleTemplateFileUpload}
                    style={{...styles.input, padding: "10px 12px", fontSize: "13px", width: "100%", boxSizing: "border-box"}}
                  />
                  {templateForm.fileData && (
                    <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#22c55e", fontWeight: "600", display: "flex", alignItems: "center", gap: 8 }}>
                      <Check size={16} strokeWidth={2.5} /> File uploaded successfully
                    </p>
                  )}
                </div>
              </form>

              <div style={{...styles.modalButtons, marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e5e7eb"}}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <Check size={28} color="white" strokeWidth={2.5} />
                  <h2 style={{ margin: 0, color: "white" }}>Success!</h2>
                </div>
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <X size={28} color="white" strokeWidth={2.5} />
                  <h2 style={{ margin: 0, color: "white" }}>Confirm Rejection</h2>
                </div>
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

        {/* APPROVE CONFIRMATION MODAL */}
        {showApproveConfirmModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.successModalContent}>
              <div style={styles.successModalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <Check size={28} color="white" strokeWidth={2.5} />
                  <h2 style={{ margin: 0, color: "white" }}>Confirm Approval</h2>
                </div>
              </div>
              <div style={styles.successModalBody}>
                <p style={{ fontSize: 16, color: "#333", marginBottom: 15 }}>
                  {approvalType === "single" && (
                    <>Are you sure you want to approve the account request for <strong>{requestToApprove?.name}</strong>?</>
                  )}
                  {approvalType === "bulk" && (
                    <>Are you sure you want to approve <strong>{approvalsToProcess.size} selected account request(s)</strong>?</>
                  )}
                  {approvalType === "quickAll" && (
                    <>Are you sure you want to approve all <strong>{approvalsToProcess.size} pending account request(s)</strong>?</>
                  )}
                </p>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
                  {approvalType === "single" && "This action will update their status to \"Approved\"."}
                  {(approvalType === "bulk" || approvalType === "quickAll") && "This action will update all selected requests to \"Approved\"."}
                </p>
              </div>
              <div style={styles.successModalFooter}>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#22c55e" }}
                  onClick={confirmApproveRequest}
                >
                  Yes, Approve
                </button>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#6c757d", marginLeft: 10 }}
                  onClick={cancelApproveRequest}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT ALL CONFIRMATION MODAL */}
        {showRejectAllConfirmModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.successModalContent}>
              <div style={styles.successModalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <X size={28} color="white" strokeWidth={2.5} />
                  <h2 style={{ margin: 0, color: "white" }}>Confirm Rejection</h2>
                </div>
              </div>
              <div style={styles.successModalBody}>
                <p style={{ fontSize: 16, color: "#333", marginBottom: 15 }}>
                  Are you sure you want to reject all <strong>{rejectAllCount} pending account request(s)</strong>?
                </p>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
                  This action will update all selected requests to "Declined".
                </p>
              </div>
              <div style={styles.successModalFooter}>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#dc3545" }}
                  onClick={confirmRejectAll}
                >
                  Yes, Reject All
                </button>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#6c757d", marginLeft: 10 }}
                  onClick={cancelRejectAll}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* APPROVE FILES CONFIRMATION MODAL */}
        {showApproveFilesConfirmModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.successModalContent}>
              <div style={styles.successModalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <Check size={28} color="white" strokeWidth={2.5} />
                  <h2 style={{ margin: 0, color: "white" }}>Confirm Approval</h2>
                </div>
              </div>
              <div style={styles.successModalBody}>
                <p style={{ fontSize: 16, color: "#333", marginBottom: 15 }}>
                  Are you sure you want to approve <strong>{approveFilesCount} selected file(s)</strong>?
                </p>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
                  This action will update all selected files to "Approved".
                </p>
              </div>
              <div style={styles.successModalFooter}>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#22c55e" }}
                  onClick={confirmApproveFiles}
                >
                  Yes, Approve
                </button>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#6c757d", marginLeft: 10 }}
                  onClick={cancelApproveFiles}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CREATED ACCOUNTS CONFIRMATION MODAL */}
        {showDeleteCreatedAccountsModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.successModalContent}>
              <div style={styles.successModalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                  <Trash2 size={28} color="white" strokeWidth={2.5} />
                  <h2 style={{ margin: 0, color: "white" }}>Delete Accounts</h2>
                </div>
              </div>
              <div style={styles.successModalBody}>
                <p style={{ fontSize: 16, color: "#333", marginBottom: 15 }}>
                  Are you sure you want to delete <strong>{deleteCreatedAccountsCount} account(s)</strong>?
                </p>
                <p style={{ fontSize: 14, color: "#666", marginBottom: 0 }}>
                  This action cannot be undone. The accounts will be permanently deleted from the system.
                </p>
              </div>
              <div style={styles.successModalFooter}>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#dc3545" }}
                  onClick={confirmDeleteCreatedAccounts}
                >
                  Yes, Delete
                </button>
                <button
                  style={{ ...styles.successModalButton, backgroundColor: "#6c757d", marginLeft: 10 }}
                  onClick={cancelDeleteCreatedAccounts}
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
                <h2 style={{ margin: 0, color: "white" }}>Delete Template</h2>
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
                <h2 style={{ margin: 0, color: "white" }}> Delete Account Record</h2>
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
  padding: "14px 16px",
  marginBottom: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 6,
  transition: "all 0.2s",
},

navActive: {
  padding: "14px 16px",
  background: "#5c0013",
  borderRadius: 6,
  marginBottom: 12,
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 600,
  transition: "all 0.2s",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 28,
    marginBottom: 32,
  },

  card: {
    background: "white",
    padding: 28,
    borderTop: `5px solid ${maroon}`,
    borderRadius: 12,
    marginBottom: 24,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },

  filterBar: {
    display: "flex",
    gap: 18,
    flexWrap: "wrap",
    marginBottom: 28,
  },

  input: {
    padding: 14,
    borderRadius: 8,
    border: "1px solid #ddd",
    flex: "1 1 220px",
    fontSize: 14,
    marginBottom: 4,
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

  tableHeader: {
    padding: "18px 16px",
    backgroundColor: "#f8f9fa",
    borderBottom: "2px solid #e9ecef",
    fontWeight: 600,
    fontSize: 14,
    color: "#333",
    textAlign: "left",
  },

  tableCell: {
    padding: "16px 14px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: 14,
    color: "#333",
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
    background: maroon,
    color: "white",
    padding: "10px 16px",
    border: "none",
    borderRadius: 6,
    outline: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 6,
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
    padding: 36,
    borderRadius: 14,
    boxShadow: "0 6px 30px rgba(0, 0, 0, 0.15)",
    minWidth: 400,
    maxWidth: 550,
    maxHeight: "85vh",
    overflow: "auto",
  },

  modalTitle: {
    margin: "0 0 12px 0",
    fontSize: 22,
    fontWeight: 700,
    color: maroon,
  },

  modalSubtitle: {
    margin: "0 0 24px 0",
    fontSize: 15,
    color: "#666",
    lineHeight: 1.5,
  },

  textarea: {
    width: "100%",
    height: 120,
    padding: 14,
    borderRadius: 8,
    border: "1px solid #ddd",
    fontFamily: "Segoe UI",
    fontSize: 14,
    resize: "vertical",
    boxSizing: "border-box",
  },

  modalButtons: {
    display: "flex",
    gap: 16,
    marginTop: 28,
    justifyContent: "flex-end",
  },

  cancelButton: {
    color: "white",
    background: "#999",
    padding: "12px 24px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    transition: "all 0.2s",
  },

  confirmButton: {
    color: "white",
    background: "#22c55e",
    padding: "12px 24px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    transition: "all 0.2s",
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
    padding: "32px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(750px, 1fr))",
    gap: "32px",
  },

  departmentSection: {
    background: "#fff",
    border: `2px solid ${maroon}`,
    borderRadius: "10px",
    padding: "28px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  deptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `2px solid ${maroon}`,
    paddingBottom: "16px",
    marginBottom: "24px",
  },

  deptTitle: {
    margin: "0",
    fontSize: "20px",
    fontWeight: "700",
    color: maroon,
  },

  deptCount: {
    fontSize: "13px",
    color: "#666",
    fontWeight: "500",
  },

  deptSubsection: {
    marginBottom: "24px",
  },

  statusHeader: {
    margin: "16px 0 12px 0",
    fontSize: "15px",
    fontWeight: "600",
    color: "#2d5f2d",
  },

  statusHeaderDeclined: {
    margin: "16px 0 12px 0",
    fontSize: "15px",
    fontWeight: "600",
    color: "#d32f2f",
  },

  deptTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "16px",
    fontSize: "14px",
  },

  noDeptFiles: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    margin: "28px 0",
    padding: "20px",
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
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  successModalBody: {
    padding: "28px",
    textAlign: "center",
  },

  successModalFooter: {
    padding: "20px 28px",
    display: "flex",
    justifyContent: "center",
    background: "#f5f5f5",
    borderTop: "1px solid #eee",
  },

  successModalButton: {
    background: "#22c55e",
    color: "white",
    padding: "12px 32px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
  },

  /* ===== PPMP STYLES ===== */
  ppmpInputContainer: {
    display: "flex",
    gap: 16,
    marginTop: 20,
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
    gap: 16,
    marginTop: 20,
  },

  ppmpDeptTag: {
    background: "#f0f0f0",
    border: `2px solid ${maroon}`,
    padding: "10px 16px",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    gap: 10,
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
