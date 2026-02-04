import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp
} from "firebase/firestore";
import { db } from "./config";

const USERS_COLLECTION = "users";

// Create or update user document in Firestore
export const createUserDocument = async (userId, userData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    
    // Build the document data with all required fields
    const docData = {
      uid: userId,
      email: userData.email || "",
      fname: userData.fname || userData.firstName || "",
      lname: userData.lname || userData.lastName || "",
      displayName: userData.displayName || "",
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      role: userData.role || "user",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    
    console.log("Writing to Firestore - Collection: users, Doc ID:", userId);
    console.log("Data being written:", docData);
    
    await setDoc(userRef, docData);
    
    console.log("✓ Successfully saved to Firestore");
    return {
      success: true,
      message: "User document created",
      data: docData
    };
  } catch (error) {
    console.error("✗ Firestore error:", error.code, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get user document
export const getUserDocument = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return {
        success: true,
        data: {
          id: userSnap.id,
          ...userSnap.data()
        }
      };
    } else {
      return {
        success: false,
        error: "User not found"
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Update user document
export const updateUserDocument = async (userId, updates) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    return {
      success: true,
      message: "User document updated"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete user document
export const deleteUserDocument = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userRef);
    return {
      success: true,
      message: "User document deleted"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Search users by email
export const searchUserByEmail = async (email) => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const user = querySnapshot.docs[0];
      return {
        success: true,
        data: {
          id: user.id,
          ...user.data()
        }
      };
    } else {
      return {
        success: false,
        error: "User not found"
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all users
export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users = [];

    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      data: users
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// ===== PPMP MANAGEMENT =====

// Get user's PPMP data
export const getUserPPMP = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const ppmpData = userSnap.data().ppmp || {};
      return {
        success: true,
        data: ppmpData
      };
    } else {
      return {
        success: false,
        error: "User not found"
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Update user's PPMP status for a department
export const updateUserPPMP = async (userId, departmentName, status) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return {
        success: false,
        error: "User not found"
      };
    }

    const currentPPMP = userSnap.data().ppmp || {};
    const updatedPPMP = {
      ...currentPPMP,
      [departmentName]: {
        status: status, // "Complete", "Incomplete", "No PPMP"
        lastUpdated: Timestamp.now()
      }
    };

    await updateDoc(userRef, {
      ppmp: updatedPPMP,
      updatedAt: Timestamp.now()
    });

    return {
      success: true,
      message: "PPMP status updated",
      data: updatedPPMP
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all departments for PPMP
export const getAllPPMPDepartments = async () => {
  try {
    const q = query(collection(db, "ppmp_departments"));
    const querySnapshot = await getDocs(q);
    const departments = [];

    querySnapshot.forEach((doc) => {
      departments.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return {
      success: true,
      data: departments
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Add new PPMP department
export const addPPMPDepartment = async (departmentName) => {
  try {
    const departmentRef = doc(collection(db, "ppmp_departments"));
    await setDoc(departmentRef, {
      name: departmentName,
      createdAt: Timestamp.now(),
      createdBy: "admin"
    });

    return {
      success: true,
      message: "Department added successfully",
      id: departmentRef.id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Get all users with their PPMP statuses
export const getUsersWithPPMPStatus = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users = [];

    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        email: userData.email,
        fname: userData.fname || "",
        lname: userData.lname || "",
        role: userData.role,
        ppmp: userData.ppmp || {}
      });
    });

    return {
      success: true,
      data: users
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// ==================== FILES MANAGEMENT ====================

// Save uploaded files to Firestore top-level files collection
export const saveFilesToFirestore = async (files, userEmail, userName = "") => {
  try {
    // Get user document first to retrieve user info
    const usersCollection = collection(db, "users");
    const userQuery = query(usersCollection, where("email", "==", userEmail));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      console.warn("⚠️ User document not found for email:", userEmail);
      return {
        success: false,
        error: "User document not found",
        message: "Cannot upload files - user record not found in database"
      };
    }

    const userDoc = userSnapshot.docs[0];
    const userRole = userDoc.data().role || "user";
    
    // Create files collection reference at top level
    const filesCollection = collection(db, "files");
    const uploadTimestamp = Timestamp.now();
    const batchUploadId = `batch_${userEmail}_${Date.now()}`;

    console.log(`📁 Saving files to top-level files collection`);

    const filePromises = files.map(async (file) => {
      try {
        const fileDocRef = doc(filesCollection);
        
        // Use existing fileData if available, otherwise read the file
        let fileUrl = file.fileData;
        
        // If fileData doesn't exist, this is a raw File object, so read it
        if (!fileUrl && file instanceof File) {
          fileUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        const fileData = {
          // User Information
          username: userName || userEmail.split("@")[0],
          email: userEmail,
          role: userRole,
          
          // File Information
          fileName: file.name || "Unnamed File",
          fileSize: file.size || 0,
          fileType: file.type || "unknown",
          fileUrl: fileUrl,
          
          // File Status
          department: file.department || "General",
          status: file.status || "Pending",
          batchUploadId: batchUploadId,
          
          // Timestamps
          createdAt: uploadTimestamp,
          uploadedAt: uploadTimestamp,
          lastModified: file.lastModified ? new Date(file.lastModified) : uploadTimestamp,
          
          // Metadata
          metadata: {
            uploadSource: "web",
            uploadMethod: "direct",
            ipAddress: "client"
          }
        };

        await setDoc(fileDocRef, fileData);
        console.log(`✓ File saved to files collection: ${file.name}`);

        return {
          success: true,
          fileId: fileDocRef.id,
          fileName: file.name
        };
      } catch (error) {
        console.error(`✗ Error saving file ${file.name}:`, error.message);
        return {
          success: false,
          fileName: file.name,
          error: error.message
        };
      }
    });

    const results = await Promise.all(filePromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`📊 Upload Summary: ${successCount} succeeded, ${failureCount} failed`);

    return {
      success: successCount > 0,
      batchUploadId: batchUploadId,
      totalFiles: files.length,
      successCount: successCount,
      failureCount: failureCount,
      results: results,
      message: `${successCount} file(s) uploaded successfully${failureCount > 0 ? `, ${failureCount} failed` : ""}`
    };
  } catch (error) {
    console.error("✗ Error in saveFilesToFirestore:", error.message);
    return {
      success: false,
      error: error.message,
      message: "Failed to upload files to database"
    };
  }
};

// Get all files from top-level files collection
export const getAllUploadedFiles = async () => {
  try {
    const filesCollection = collection(db, "files");
    const q = query(filesCollection);
    const querySnapshot = await getDocs(q);
    
    const files = [];
    querySnapshot.forEach((doc) => {
      files.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✓ Retrieved ${files.length} files from files collection`);
    return {
      success: true,
      data: files
    };
  } catch (error) {
    console.error("✗ Error getting all files:", error.message);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};

// Get all files for a specific user
export const getUserFilesFromFirestore = async (userEmail) => {
  try {
    const filesCollection = collection(db, "files");
    const q = query(filesCollection, where("email", "==", userEmail));
    const querySnapshot = await getDocs(q);
    
    const files = [];
    querySnapshot.forEach((doc) => {
      files.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✓ Retrieved ${files.length} files for user ${userEmail}`);
    return {
      success: true,
      data: files
    };
  } catch (error) {
    console.error("✗ Error getting user files:", error.message);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};

// Update file status in Firestore
export const updateFileStatus = async (fileId, newStatus) => {
  try {
    const fileRef = doc(db, "files", fileId);
    await updateDoc(fileRef, {
      status: newStatus,
      lastUpdated: Timestamp.now()
    });

    console.log(`✓ File ${fileId} status updated to ${newStatus}`);
    return {
      success: true,
      message: "File status updated successfully"
    };
  } catch (error) {
    console.error("✗ Error updating file status:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete file from Firestore
export const deleteFileFromFirestore = async (fileId) => {
  try {
    const fileRef = doc(db, "files", fileId);
    await deleteDoc(fileRef);

    console.log(`✓ File ${fileId} deleted from files collection`);
    return {
      success: true,
      message: "File deleted successfully"
    };
  } catch (error) {
    console.error("✗ Error deleting file:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
};
