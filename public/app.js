import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ ضع بيانات مشروعك هنا من Firebase Console (Web app config)
const firebaseConfig = {
  apiKey: "AIzaSyCf91J74YAinpUsiwo2uKHb1ejp3aKlLw8",
  authDomain: "tal3a-f4d9b.firebaseapp.com",
  projectId: "tal3a-f4d9b",
  storageBucket: "tal3a-f4d9b.firebasestorage.app",
  messagingSenderId: "103353080703",
  appId: "1:103353080703:web:b31304303d991c8b34584a",
  measurementId: "G-KGY2LHVWXK"
};

function $(id) { return document.getElementById(id); }

const tabSignup = $("tabSignup");
const tabLogin = $("tabLogin");

const signupPanel = $("signupPanel");
const loginPanel = $("loginPanel");
const appBox = $("appBox");
const alertBox = $("alertBox");

const signupBtn = $("signupBtn");
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");

const userLabel = $("userLabel");
const roleLabel = $("roleLabel");
const uidLabel = $("uidLabel");

function showAlert(msg, type = "info") {
  if (!alertBox) return;
  alertBox.classList.remove("hidden");
  alertBox.textContent = msg;

  // شكل بسيط حسب النوع
  alertBox.style.borderColor = "rgba(255,255,255,.1)";
  alertBox.style.background = "rgba(255,255,255,.06)";
  if (type === "error") {
    alertBox.style.borderColor = "rgba(244,63,94,.35)";
    alertBox.style.background = "rgba(244,63,94,.12)";
  }
  if (type === "success") {
    alertBox.style.borderColor = "rgba(34,197,94,.35)";
    alertBox.style.background = "rgba(34,197,94,.12)";
  }
}

function clearAlert() {
  if (!alertBox) return;
  alertBox.classList.add("hidden");
  alertBox.textContent = "";
}

function setTab(mode) {
  clearAlert();
  const signupActive = mode === "signup";

  signupPanel.classList.toggle("hidden", !signupActive);
  loginPanel.classList.toggle("hidden", signupActive);

  tabSignup.className = signupActive
    ? "flex-1 rounded-xl px-4 py-2 text-sm font-semibold bg-white/10"
    : "flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white";

  tabLogin.className = !signupActive
    ? "flex-1 rounded-xl px-4 py-2 text-sm font-semibold bg-white/10"
    : "flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white";
}

function getSelectedRole() {
  return document.querySelector('input[name="role"]:checked')?.value || "rider";
}

async function upsertUserProfile(db, user, name, role) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      name: name || "بدون اسم",
      role, // rider | driver
      ratingAvg: 5,
      ratingCount: 0,
      createdAt: serverTimestamp()
    });
  }
}

// ✅ تشغيل Firebase
let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error(e);
  showAlert("في مشكلة في إعداد firebaseConfig. تأكد إنك لصقت config صح داخل app.js.", "error");
}

// ✅ Tabs
tabSignup?.addEventListener("click", () => setTab("signup"));
tabLogin?.addEventListener("click", () => setTab("login"));
setTab("signup");

// ✅ Signup
signupBtn?.addEventListener("click", async () => {
  try {
    clearAlert();

    const name = $("name")?.value?.trim();
    const email = $("email")?.value?.trim();
    const password = $("password")?.value?.trim();
    const role = getSelectedRole();

    if (!email || !password) {
      return showAlert("اكتب الإيميل والرقم السري.", "error");
    }
    if (password.length < 6) {
      return showAlert("الرقم السري لازم يكون 6 حروف/أرقام على الأقل.", "error");
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await upsertUserProfile(db, cred.user, name, role);

    showAlert("تم إنشاء الحساب ✅", "success");
  } catch (e) {
    console.error(e);
    // أخطاء شائعة
    if (String(e.code).includes("auth/email-already-in-use"))
      return showAlert("الإيميل ده مستخدم قبل كده. جرّب تسجيل الدخول.", "error");
    if (String(e.code).includes("auth/invalid-email"))
      return showAlert("الإيميل غير صحيح.", "error");
    if (String(e.code).includes("auth/unauthorized-domain"))
      return showAlert("الدومين غير مصرح. أضف web.app في Authorized domains داخل Firebase Auth.", "error");

    showAlert(e.message || "حصل خطأ.", "error");
  }
});

// ✅ Login
loginBtn?.addEventListener("click", async () => {
  try {
    clearAlert();

    const email = $("loginEmail")?.value?.trim();
    const password = $("loginPassword")?.value?.trim();

    if (!email || !password) {
      return showAlert("اكتب الإيميل والرقم السري.", "error");
    }

    await signInWithEmailAndPassword(auth, email, password);
    showAlert("تم تسجيل الدخول ✅", "success");
  } catch (e) {
    console.error(e);
    if (String(e.code).includes("auth/wrong-password") || String(e.code).includes("auth/invalid-credential"))
      return showAlert("بيانات الدخول غير صحيحة.", "error");
    if (String(e.code).includes("auth/user-not-found"))
      return showAlert("مفيش حساب بالإيميل ده. اعمل إنشاء حساب.", "error");
    if (String(e.code).includes("auth/unauthorized-domain"))
      return showAlert("الدومين غير مصرح. أضف web.app في Authorized domains داخل Firebase Auth.", "error");

    showAlert(e.message || "حصل خطأ.", "error");
  }
});

// ✅ Logout
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  setTab("login");
});

// ✅ Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    appBox?.classList.add("hidden");
    // خليك على آخر تاب مستخدمه أو login
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const profile = snap.exists() ? snap.data() : { name: user.email, role: "rider" };

    userLabel.textContent = profile.name || user.email;
    roleLabel.textContent = profile.role || "rider";
    uidLabel.textContent = user.uid;

    // اخفي فورمات الدخول/التسجيل واظهر صندوق المستخدم
    signupPanel.classList.add("hidden");
    loginPanel.classList.add("hidden");
    appBox.classList.remove("hidden");
  } catch (e) {
    console.error(e);
    showAlert("حصلت مشكلة في قراءة بيانات المستخدم من Firestore.", "error");
  }
});
