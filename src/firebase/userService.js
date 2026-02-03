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
