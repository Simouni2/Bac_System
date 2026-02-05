import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { auth } from "./config";

// Log when module loads
console.log("[authService] ✅ Module loaded. Auth available:", auth ? "YES" : "NO");

export const signUp = async (email, password, displayName = "") => {
  try {
    console.log("[signUp] 🔵 Starting signup for:", email);
    
    if (!auth) {
      console.error("[signUp] ❌ CRITICAL: auth is null/undefined!");
      throw new Error("Firebase Auth not initialized. Check Firebase config and credentials.");
    }
    
    console.log("[signUp] 🔵 Creating Firebase user...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log("[signUp] ✅ Firebase user created. UID:", user.uid);

    if (displayName) {
      await updateProfile(user, { displayName });
      console.log("[signUp] ✅ Profile updated with display name");
    }

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch (error) {
    console.error("[signUp] ❌ ERROR CODE:", error.code);
    console.error("[signUp] ❌ ERROR MESSAGE:", error.message);
    console.error("[signUp] ❌ FULL ERROR:", error);
    
    return {
      success: false,
      error: error.message || "Signup failed - check console for details",
      code: error.code
    };
  }
};

export const signIn = async (email, password) => {
  try {
    console.log("[signIn] Attempting login:", email);
    
    if (!auth) {
      throw new Error("Firebase Auth not initialized");
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("[signIn] Login successful, UID:", user.uid);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch (error) {
    console.error("[signIn] Error:", error.code, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

export const logOut = async () => {
  try {
    console.log("[logOut] Signing out...");
    
    if (!auth) {
      throw new Error("Firebase Auth not initialized");
    }
    
    await signOut(auth);
    console.log("[logOut] Logout successful");
    
    return { success: true };
  } catch (error) {
    console.error("[logOut] Error:", error.message);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = () => {
  return auth?.currentUser || null;
};

export const onAuthChange = (callback) => {
  if (!auth) {
    console.error("[onAuthChange] Auth not initialized");
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const resetPassword = async (email) => {
  try {
    if (!auth) {
      throw new Error("Firebase Auth not initialized");
    }
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset email sent" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const changePassword = async (newPassword) => {
  try {
    const user = auth?.currentUser;
    if (!user) {
      throw new Error("No user logged in");
    }
    await updatePassword(user, newPassword);
    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUserProfile = async (updates) => {
  try {
    const user = auth?.currentUser;
    if (!user) {
      throw new Error("No user logged in");
    }
    await updateProfile(user, updates);
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const adminCreateUser = async (email, password, displayName = "") => {
  try {
    console.log("[adminCreateUser] 🔵 Admin creating account for:", email);
    
    if (!auth) {
      console.error("[adminCreateUser] ❌ CRITICAL: auth is null/undefined!");
      throw new Error("Firebase Auth not initialized");
    }
    
    console.log("[adminCreateUser] 🔵 Creating Firebase user for:", email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log("[adminCreateUser] ✅ Firebase user created. UID:", user.uid);

    if (displayName) {
      await updateProfile(user, { displayName });
      console.log("[adminCreateUser] ✅ Profile updated with display name");
    }

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      }
    };
  } catch (error) {
    console.error("[adminCreateUser] ❌ ERROR CODE:", error.code);
    console.error("[adminCreateUser] ❌ ERROR MESSAGE:", error.message);
    
    return {
      success: false,
      error: error.message || "Account creation failed",
      code: error.code
    };
  }
};
