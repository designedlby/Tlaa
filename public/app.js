import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// 1) ضع بيانات مشروعك هنا (من Firebase Console -> Web app config)
const firebaseConfig = {
  apiKey: "AIzaSyDphYF6FM7ILBTtQYz1USvJz53rmYVprUk",
  authDomain: "tal3a-app-35b4c.firebaseapp.com",
  projectId: "tal3a-app-35b4c",
  storageBucket: "tal3a-app-35b4c.firebasestorage.app",
  messagingSenderId: "831003684441",
  appId: "1:831003684441:web:11eee75632795987f38b48",
  measurementId: "G-6J6R8E38CQ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// عناصر UI
const authBox = document.getElementById("authBox");
const appBox = document.getElementById("appBox");
const userLabel = document.getElementById("userLabel");
const roleLabel = document.getElementById("roleLabel");
const uidLabel = document.getElementById("uidLabel");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

function getSelectedRole() {
  return document.querySelector('input[name="role"]:checked')?.value || "rider";
}

async function ensureUserProfile(user, name, role) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      name: name || "بدون اسم",
      role,                 // rider | driver
      ratingAvg: 5,
      ratingCount: 0,
      createdAt: serverTimestamp()
    });
  }
}

signupBtn.addEventListener("click", async () => {
  try {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = getSelectedRole();

    if (!email || !password) return alert("اكتب الإيميل والرقم السري.");

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserProfile(cred.user, name, role);

    alert("تم إنشاء الحساب ✅");
  } catch (e) {
    alert(e.message);
  }
});

loginBtn.addEventListener("click", async () => {
  try {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    if (!email || !password) return alert("اكتب الإيميل والرقم السري.");

    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert(e.message);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    authBox.classList.remove("hidden");
    appBox.classList.add("hidden");
    return;
  }

  // اقرأ دور المستخدم من Firestore
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const profile = snap.exists() ? snap.data() : { role: "rider", name: user.email };

  authBox.classList.add("hidden");
  appBox.classList.remove("hidden");

  userLabel.textContent = profile.name || user.email;
  roleLabel.textContent = profile.role || "rider";
  uidLabel.textContent = user.uid;
});
