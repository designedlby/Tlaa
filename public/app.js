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
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  getDatabase,
  ref as rtdbRef,
  set as rtdbSet,
  onValue,
  remove as rtdbRemove
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// ✅ ضع بيانات مشروعك هنا من Firebase Console (Web app config)
const firebaseConfig = {
  apiKey: "AIzaSyCf91J74YAinpUsiwo2uKHb1ejp3aKlLw8",
  authDomain: "tal3a-f4d9b.firebaseapp.com",
  projectId: "tal3a-f4d9b",
  storageBucket: "tal3a-f4d9b.firebasestorage.app",
  messagingSenderId: "103353080703",
  appId: "1:103353080703:web:b31304303d991c8b34584a",
  databaseURL: "https://tal3a-f4d9b-default-rtdb.europe-west1.firebasedatabase.app/",
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
  const driver = document.getElementById("roleDriver");
  return driver && driver.checked ? "driver" : "rider";
}

async function upsertUserProfile(db, user, name, role) {
  const ref = doc(db, "users", user.uid);

  await setDoc(ref, {
    uid: user.uid,
    name: name || "بدون اسم",
    role,

    ratingAvg: 5,
    ratingCount: 0,

    activeTripId: null,

    accountStatus: "active",
    accountStatusReason: "",
    adminNote: "",

    tripsCount: 0,
    complaintsOpenCount: 0,

    verificationStatus: role === "driver" ? "not_submitted" : "",

    carModel: "",
    carColor: "",
    carPlate: "",

    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp()
  }, { merge: true });
}

// ✅ تشغيل Firebase
let app, auth, db, rtdb;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  rtdb = getDatabase(app);
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
  return showAlert("اكتب الإيميل وكلمة المرور.", "error");
}

if (!isStrongPassword(password)) {
  return showAlert(getPasswordError(password), "error");
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
  try {
    cleanupRealtimeWatchers();
    await signOut(auth);
  } catch (e) {
    console.error(e);
    showAlert("فشل تسجيل الخروج.", "error");
  }
  setTab("login");
});

function getComplaintStatusBadge(status) {
  if (status === "new") {
    return `<span class="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/20"><span class="h-2 w-2 rounded-full bg-current"></span><span>جديدة</span></span>`;
  }
  if (status === "under_review") {
    return `<span class="inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-500/20"><span class="h-2 w-2 rounded-full bg-current"></span><span>جاري المراجعة</span></span>`;
  }
  if (status === "resolved") {
    return `<span class="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/20"><span class="h-2 w-2 rounded-full bg-current"></span><span>تم الحل</span></span>`;
  }
  if (status === "unresolved") {
    return `<span class="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/20"><span class="h-2 w-2 rounded-full bg-current"></span><span>لم يتم الحل</span></span>`;
  }
  return `<span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10"><span>غير محدد</span></span>`;
}

function getComplaintTypeLabel(type) {
  if (type === "trip_issue") return "مشكلة في رحلة";
  if (type === "app_bug") return "مشكلة في التطبيق / الويب آب";
  if (type === "driver_report") return "شكوى على سائق";
  if (type === "rider_report") return "شكوى على راكب";
  if (type === "payment_issue") return "مشكلة في الدفع / السعر";
  if (type === "account_issue") return "مشكلة في الحساب أو التوثيق";
  return "نوع غير محدد";
}

function parseComplaintAttachmentUrls(text = "") {
  return String(text || "")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);
}

function shouldComplaintUseTrip(type) {
  return ["trip_issue", "driver_report", "rider_report", "payment_issue"].includes(type);
}

function resetComplaintForm() {
  const typeEl = document.getElementById("complaintType");
  const titleEl = document.getElementById("complaintTitle");
  const tripEl = document.getElementById("complaintTripId");
  const issueSummaryEl = document.getElementById("complaintIssueSummary");
  const exactProblemEl = document.getElementById("complaintExactProblem");
  const expectedSolutionEl = document.getElementById("complaintExpectedSolution");
  const extraContextEl = document.getElementById("complaintExtraContext");
  const attachmentUrlsEl = document.getElementById("complaintAttachmentUrls");
  const statusEl = document.getElementById("complaintFormStatus");
  const counterEl = document.getElementById("complaintProblemCounter");

  if (typeEl) typeEl.value = "";
  if (titleEl) titleEl.value = "";
  if (tripEl) tripEl.value = "";
  if (issueSummaryEl) issueSummaryEl.value = "";
  if (exactProblemEl) exactProblemEl.value = "";
  if (expectedSolutionEl) expectedSolutionEl.value = "";
  if (extraContextEl) extraContextEl.value = "";
  if (attachmentUrlsEl) attachmentUrlsEl.value = "";
  if (statusEl) statusEl.textContent = "";
  if (counterEl) counterEl.textContent = "0 / 120 حرف كحد أدنى";

  document.getElementById("complaintTripBox")?.classList.add("hidden");
}

function updateComplaintCounter() {
  const exactProblemEl = document.getElementById("complaintExactProblem");
  const counterEl = document.getElementById("complaintProblemCounter");
  if (!exactProblemEl || !counterEl) return;

  const len = exactProblemEl.value.trim().length;
  counterEl.textContent = `${len} / 120 حرف كحد أدنى`;
}

async function loadComplaintTripOptions(uid, role) {
  const tripEl = document.getElementById("complaintTripId");
  if (!tripEl) return;

  const cacheKey = `${role}_${uid}`;

  // لو موجودة في الكاش، استخدمها فورًا
  if (complaintTripOptionsCache[cacheKey]) {
    tripEl.innerHTML = `<option value="">اختر الرحلة</option>`;
    complaintTripOptionsCache[cacheKey].forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      tripEl.appendChild(option);
    });
    return;
  }

  tripEl.innerHTML = `<option value="">جارٍ تحميل الرحلات...</option>`;

  const field = role === "driver" ? "driverId" : "riderId";

  try {
    const q = query(
      collection(db, "trips"),
      where(field, "==", uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const snap = await getDocs(q);

    const options = [];

    snap.forEach((docSnap) => {
      const t = docSnap.data();
      options.push({
        id: docSnap.id,
        label: `${t.pickup || "—"} → ${t.dropoff || "—"}${t.status ? ` | ${t.status}` : ""}`
      });
    });

    complaintTripOptionsCache[cacheKey] = options;

    tripEl.innerHTML = `<option value="">اختر الرحلة</option>`;

    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      tripEl.appendChild(option);
    });
  } catch (e) {
    console.error("loadComplaintTripOptions error:", e);
    tripEl.innerHTML = `<option value="">تعذر تحميل الرحلات</option>`;
  }
}

function initComplaintFormUI(uid, role) {
  if (complaintFormUiInitialized) return;
  complaintFormUiInitialized = true;

  document.addEventListener("click", async (e) => {
    // زر فتح الفورم
    if (e.target.id === "toggleComplaintFormBtn") {
      const wrap = document.getElementById("complaintFormWrap");
      if (!wrap) return;

      wrap.classList.toggle("hidden");

      if (!wrap.classList.contains("hidden")) {
        const typeEl = document.getElementById("complaintType");
        const type = typeEl?.value || "";

        if (shouldComplaintUseTrip(type)) {
          await loadComplaintTripOptions(uid, role);
        }
      }
    }

    // زر الإلغاء
    if (e.target.id === "cancelComplaintFormBtn") {
      const wrap = document.getElementById("complaintFormWrap");
      wrap?.classList.add("hidden");
      resetComplaintForm();
    }

    // زر الإرسال
    if (e.target.id === "submitComplaintBtn") {
      try {
        await submitComplaint(uid, role);
      } catch (err) {
        console.error(err);
        const statusEl = document.getElementById("complaintFormStatus");
        if (statusEl) statusEl.textContent = "فشل إرسال الشكوى.";
      }
    }
  });

  document.addEventListener("change", async (e) => {
    if (e.target.id === "complaintType") {
      const type = e.target.value;
      const tripBox = document.getElementById("complaintTripBox");

      if (shouldComplaintUseTrip(type)) {
        tripBox?.classList.remove("hidden");
        await loadComplaintTripOptions(uid, role);
      } else {
        tripBox?.classList.add("hidden");
      }
    }
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "complaintExactProblem") {
      updateComplaintCounter();
    }
  });
}


async function submitComplaint(uid, role) {
  const typeEl = document.getElementById("complaintType");
  const titleEl = document.getElementById("complaintTitle");
  const tripEl = document.getElementById("complaintTripId");
  const issueSummaryEl = document.getElementById("complaintIssueSummary");
  const exactProblemEl = document.getElementById("complaintExactProblem");
  const expectedSolutionEl = document.getElementById("complaintExpectedSolution");
  const extraContextEl = document.getElementById("complaintExtraContext");
  const attachmentUrlsEl = document.getElementById("complaintAttachmentUrls");
  const statusEl = document.getElementById("complaintFormStatus");

  const type = typeEl?.value || "";
  const title = titleEl?.value?.trim() || "";
  const tripId = tripEl?.value || "";
  const issueSummary = issueSummaryEl?.value?.trim() || "";
  const exactProblem = exactProblemEl?.value?.trim() || "";
  const expectedSolution = expectedSolutionEl?.value?.trim() || "";
  const extraContext = extraContextEl?.value?.trim() || "";
  const attachmentUrls = parseComplaintAttachmentUrls(attachmentUrlsEl?.value || "");

  if (!type) {
    if (statusEl) statusEl.textContent = "اختر نوع الشكوى.";
    return;
  }

  if (!title || title.length < 8) {
    if (statusEl) statusEl.textContent = "اكتب عنوانًا مختصرًا وواضحًا للشكوى.";
    return;
  }

  if (shouldComplaintUseTrip(type) && !tripId) {
    if (statusEl) statusEl.textContent = "اختر الرحلة المرتبطة بالشكوى.";
    return;
  }

  if (!issueSummary || issueSummary.length < 20) {
    if (statusEl) statusEl.textContent = "اكتب شرحًا مختصرًا واضحًا للمشكلة.";
    return;
  }

  if (!exactProblem || exactProblem.length < 120) {
    if (statusEl) statusEl.textContent = "اكتب تفاصيل كافية للمشكلة (120 حرفًا على الأقل).";
    return;
  }

  if (!expectedSolution || expectedSolution.length < 10) {
    if (statusEl) statusEl.textContent = "اكتب ما الحل الذي تتوقعه.";
    return;
  }

  let tripSnapshot = null;
  let againstUid = "";

  if (tripId) {
    try {
      const tripSnap = await getDoc(doc(db, "trips", tripId));
      if (tripSnap.exists()) {
        const t = tripSnap.data();
        tripSnapshot = {
          pickup: t.pickup || "",
          dropoff: t.dropoff || "",
          driverId: t.driverId || "",
          riderId: t.riderId || "",
          price: t.price || 0
        };

        if (role === "rider") {
          againstUid = t.driverId || "";
        } else if (role === "driver") {
          againstUid = t.riderId || "";
        }
      }
    } catch (e) {
      console.error("submitComplaint trip snapshot error:", e);
    }
  }

  if (statusEl) statusEl.textContent = "جارٍ إرسال الشكوى...";

  await addDoc(collection(db, "complaints"), {
    uid,
    role,
    type,
    status: "new",
    title,
    description: exactProblem,
    tripId: tripId || "",
    againstUid,
    tripSnapshot,
    answers: {
      issueSummary,
      exactProblem,
      expectedSolution,
      extraContext
    },
    attachmentUrls,
    adminNote: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  try {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const currentOpenComplaints = userSnap.exists() ? Number(userSnap.data().complaintsOpenCount || 0) : 0;

  await updateDoc(userRef, {
    complaintsOpenCount: currentOpenComplaints + 1
  });
} catch (e) {
  console.error("update complaintsOpenCount error:", e);
}
  
  if (statusEl) statusEl.textContent = "تم إرسال الشكوى بنجاح ✅";
  resetComplaintForm();
  document.getElementById("complaintFormWrap")?.classList.add("hidden");
}

function renderComplaintCard(id, c) {
  const attachmentsHtml = Array.isArray(c.attachmentUrls) && c.attachmentUrls.length
    ? `
      <div class="mt-3 flex flex-wrap gap-2">
        ${c.attachmentUrls.map((url) => `
          <a target="_blank"
             href="${escapeHtml(url)}"
             class="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white ring-1 ring-white/10 hover:bg-white/15">
            <span>🔗</span>
            <span>فتح مرفق</span>
          </a>
        `).join("")}
      </div>
    `
    : "";

  const tripHtml = c.tripSnapshot
    ? `
      <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
        <div class="text-[11px] font-semibold text-slate-400">الرحلة المرتبطة</div>
        <div class="mt-1 text-xs text-white break-all">
          ${escapeHtml(c.tripSnapshot.pickup || "—")} → ${escapeHtml(c.tripSnapshot.dropoff || "—")}
        </div>
        <div class="mt-2 text-[11px] text-slate-300">
          السعر: ${Number(c.tripSnapshot.price || 0)} جنيه
        </div>
      </div>
    `
    : "";

  const adminNoteHtml = c.adminNote
    ? `
      <div class="mt-3 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 p-3">
        <div class="text-[11px] font-semibold text-emerald-300">ملاحظة الإدارة</div>
        <div class="mt-1 text-xs text-white break-words">${escapeHtml(c.adminNote)}</div>
      </div>
    `
    : "";

  return `
    <div class="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-white break-words">${escapeHtml(c.title || "شكوى بدون عنوان")}</div>
          <div class="mt-1 text-xs text-slate-400">${getComplaintTypeLabel(c.type)}</div>
        </div>
        <div>${getComplaintStatusBadge(c.status)}</div>
      </div>

      <div class="mt-3 text-xs text-slate-200 break-words">
        ${escapeHtml(c.answers?.issueSummary || c.description || "")}
      </div>

      ${tripHtml}

      <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
        <div class="text-[11px] font-semibold text-slate-400">تفاصيل الشكوى</div>
        <div class="mt-1 text-xs text-white break-words">${escapeHtml(c.description || "")}</div>
      </div>

      <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
        <div class="text-[11px] font-semibold text-slate-400">الحل المتوقع</div>
        <div class="mt-1 text-xs text-white break-words">${escapeHtml(c.answers?.expectedSolution || "")}</div>
      </div>

      ${c.answers?.extraContext ? `
        <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
          <div class="text-[11px] font-semibold text-slate-400">معلومات إضافية</div>
          <div class="mt-1 text-xs text-white break-words">${escapeHtml(c.answers.extraContext)}</div>
        </div>
      ` : ""}

      ${attachmentsHtml}
      ${adminNoteHtml}
    </div>
  `;
}

function watchMyComplaints(uid) {
  const list = document.getElementById("myComplaintsList");
  if (!list) return;

  if (unsubscribeMyComplaints) {
  unsubscribeMyComplaints();
  unsubscribeMyComplaints = null;
}

  list.innerHTML = `<div class="text-xs text-slate-400">جارٍ تحميل الشكاوى...</div>`;

  const q = query(
    collection(db, "complaints"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(30)
  );

  unsubscribeMyComplaints = onSnapshot(q, (snap) => {
    if (snap.empty) {
      list.innerHTML = `<div class="text-xs text-slate-400">لا توجد شكاوى حتى الآن.</div>`;
      return;
    }

    list.innerHTML = snap.docs.map((docSnap) => {
      return renderComplaintCard(docSnap.id, docSnap.data());
    }).join("");
  }, (err) => {
  if (!auth.currentUser) return;
  console.error("watchMyComplaints error:", err);
  list.innerHTML = `<div class="text-xs text-rose-300">تعذر تحميل الشكاوى.</div>`;
});
}

function renderAdminComplaintCard(id, c) {
  return `
    <div class="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-white break-words">${escapeHtml(c.title || "شكوى بدون عنوان")}</div>
          <div class="mt-1 text-xs text-slate-400">
            ${getComplaintTypeLabel(c.type)} • ${escapeHtml(c.role || "")} • UID: ${escapeHtml(c.uid || "")}
          </div>
        </div>
        <div>${getComplaintStatusBadge(c.status)}</div>
      </div>

      ${c.tripSnapshot ? `
        <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
          <div class="text-[11px] font-semibold text-slate-400">الرحلة المرتبطة</div>
          <div class="mt-1 text-xs text-white break-all">
            ${escapeHtml(c.tripSnapshot.pickup || "—")} → ${escapeHtml(c.tripSnapshot.dropoff || "—")}
          </div>
          <div class="mt-2 text-[11px] text-slate-300">
            السعر: ${Number(c.tripSnapshot.price || 0)} جنيه
          </div>
        </div>
      ` : ""}

      <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
        <div class="text-[11px] font-semibold text-slate-400">ملخص المشكلة</div>
        <div class="mt-1 text-xs text-white break-words">${escapeHtml(c.answers?.issueSummary || "")}</div>
      </div>

      <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
        <div class="text-[11px] font-semibold text-slate-400">التفاصيل الكاملة</div>
        <div class="mt-1 text-xs text-white break-words">${escapeHtml(c.description || "")}</div>
      </div>

      <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
        <div class="text-[11px] font-semibold text-slate-400">الحل المتوقع من المستخدم</div>
        <div class="mt-1 text-xs text-white break-words">${escapeHtml(c.answers?.expectedSolution || "")}</div>
      </div>

      ${c.answers?.extraContext ? `
        <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
          <div class="text-[11px] font-semibold text-slate-400">ملاحظات إضافية</div>
          <div class="mt-1 text-xs text-white break-words">${escapeHtml(c.answers.extraContext)}</div>
        </div>
      ` : ""}

      ${
        Array.isArray(c.attachmentUrls) && c.attachmentUrls.length
          ? `
            <div class="mt-3 flex flex-wrap gap-2">
              ${c.attachmentUrls.map((url) => `
                <a target="_blank"
                   href="${escapeHtml(url)}"
                   class="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white ring-1 ring-white/10 hover:bg-white/15">
                  <span>🔗</span>
                  <span>فتح مرفق</span>
                </a>
              `).join("")}
            </div>
          `
          : ""
      }

      <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <textarea id="adminNote_${id}"
          class="min-h-[90px] w-full rounded-2xl bg-black/20 ring-1 ring-white/10 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="اكتب ملاحظة الإدارة أو سبب القرار">${escapeHtml(c.adminNote || "")}</textarea>

        <div class="flex flex-col gap-2">
          <button data-id="${id}" data-status="under_review"
            class="adminComplaintStatusBtn rounded-2xl bg-sky-500/90 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2">
            جاري المراجعة
          </button>

          <button data-id="${id}" data-status="resolved"
            class="adminComplaintStatusBtn rounded-2xl bg-emerald-500/90 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2">
            تم الحل
          </button>

          <button data-id="${id}" data-status="unresolved"
            class="adminComplaintStatusBtn rounded-2xl bg-rose-500/90 hover:bg-rose-500 text-white text-sm font-semibold px-4 py-2">
            لم يتم الحل
          </button>
        </div>
      </div>
    </div>
  `;
}

function watchAdminComplaints() {
  const box = document.getElementById("adminComplaintsBox");
  const list = document.getElementById("adminComplaintsList");
  
  if (!box || !list) return;

  if (unsubscribeAdminComplaints) {
    unsubscribeAdminComplaints();
    unsubscribeAdminComplaints = null;
  }
  
  box.classList.remove("hidden");
  list.innerHTML = `<div class="text-xs text-slate-400">جارٍ تحميل الشكاوى...</div>`;

  const q = query(
    collection(db, "complaints"),
    orderBy("createdAt", "desc"),
    limit(100)
  );

  unsubscribeAdminComplaints = onSnapshot(q, (snap) => {
    if (snap.empty) {
      list.innerHTML = `<div class="text-xs text-slate-400">لا توجد شكاوى.</div>`;
      return;
    }

    list.innerHTML = snap.docs.map((docSnap) => {
      return renderAdminComplaintCard(docSnap.id, docSnap.data());
    }).join("");

    list.querySelectorAll(".adminComplaintStatusBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const status = btn.getAttribute("data-status");
        if (!id || !status) return;

        const noteEl = document.getElementById(`adminNote_${id}`);
        const adminNote = noteEl?.value?.trim() || "";

        try {
          const complaintRef = doc(db, "complaints", id);
const complaintSnap = await getDoc(complaintRef);

let oldStatus = "";
let complaintUid = "";

if (complaintSnap.exists()) {
  oldStatus = complaintSnap.data().status || "";
  complaintUid = complaintSnap.data().uid || "";
}

await updateDoc(complaintRef, {
  status,
  adminNote,
  updatedAt: serverTimestamp()
});

try {
  const wasOpen = ["new", "under_review"].includes(oldStatus);
  const nowClosed = ["resolved", "unresolved"].includes(status);

  if (wasOpen && nowClosed && complaintUid) {
    const userRef = doc(db, "users", complaintUid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentOpenComplaints = Number(userSnap.data().complaintsOpenCount || 0);

      await updateDoc(userRef, {
        complaintsOpenCount: Math.max(0, currentOpenComplaints - 1)
      });
    }
  }
} catch (e) {
  console.error("decrease complaintsOpenCount error:", e);
}
          showAlert("تم تحديث حالة الشكوى ✅", "success");
        } catch (e) {
          console.error(e);
          showAlert("فشل تحديث الشكوى.", "error");
        }
      });
    });
  }, (err) => {
  if (!auth.currentUser) return;
  console.error("watchAdminComplaints error:", err);
});
}

function getAccountStatusBadge(status) {
  if (status === "suspended") {
    return `<span class="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/20"><span class="h-2 w-2 rounded-full bg-current"></span><span>موقوف</span></span>`;
  }
  return `<span class="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/20"><span class="h-2 w-2 rounded-full bg-current"></span><span>نشط</span></span>`;
}

function getVerificationBadge(status) {
  if (!status) return `<span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10">غير محدد</span>`;
  if (status === "approved") return `<span class="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/20">معتمد</span>`;
  if (status === "pending") return `<span class="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/20">قيد المراجعة</span>`;
  if (status === "rejected") return `<span class="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/20">مرفوض</span>`;
  if (status === "needs_update") return `<span class="inline-flex items-center gap-2 rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-500/20">مطلوب تعديل</span>`;
  if (status === "not_submitted") return `<span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10">غير مرسل</span>`;
  return `<span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10">${escapeHtml(status)}</span>`;
}

function matchesAdminUserSearch(u, searchTerm) {
  if (!searchTerm) return true;
  const s = searchTerm.toLowerCase();

  const fields = [
    u.name || "",
    u.phone || "",
    u.uid || "",
    u.carPlate || "",
    u.carModel || ""
  ].map(v => String(v).toLowerCase());

  return fields.some(v => v.includes(s));
}

function renderAdminUserCard(userDoc) {
  const id = userDoc.id;
  const u = userDoc.data;

  const ratingAvg = Number(u.ratingAvg || 0).toFixed(1);
  const ratingCount = Number(u.ratingCount || 0);
  const tripsCount = Number(u.tripsCount || 0);
  const complaintsOpenCount = Number(u.complaintsOpenCount || 0);
  const accountStatus = u.accountStatus || "active";
  const verificationStatus = u.verificationStatus || "not_submitted";

  const roleLabel = u.role === "driver" ? "سائق" : "راكب";

  const carHtml = u.role === "driver"
    ? `
      <div class="mt-3 flex flex-wrap gap-2">
        ${u.carModel ? `<span class="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-white/10">🚐 ${escapeHtml(u.carModel)}</span>` : ""}
        ${u.carPlate ? `<span class="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-white/10">🔢 ${escapeHtml(u.carPlate)}</span>` : ""}
        ${u.carColor ? `<span class="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-white/10">🎨 ${escapeHtml(u.carColor)}</span>` : ""}
      </div>
    `
    : "";

  const verificationHtml = u.role === "driver"
    ? `
      <div class="mt-2">
        ${getVerificationBadge(verificationStatus)}
      </div>
    `
    : "";

  return `
    <div class="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-white break-all">${escapeHtml(u.name || "بدون اسم")}</div>
          <div class="mt-1 text-xs text-slate-400 break-all">
            ${roleLabel} • UID: ${escapeHtml(u.uid || id)}
          </div>
          <div class="mt-1 text-xs text-slate-300 break-all">
            ${u.phone ? escapeHtml(u.phone) : "بدون هاتف"}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          ${getAccountStatusBadge(accountStatus)}
          ${u.activeTripId ? `<span class="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 ring-1 ring-indigo-500/20">لديه رحلة حالية</span>` : ""}
        </div>
      </div>

      ${verificationHtml}

      <div class="mt-3 grid gap-2 sm:grid-cols-4 text-xs">
        <div class="rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
          <div class="text-slate-400">التقييم</div>
          <div class="mt-1 font-semibold text-white">⭐ ${ratingAvg} <span class="text-slate-400">(${ratingCount})</span></div>
        </div>

        <div class="rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
          <div class="text-slate-400">الرحلات</div>
          <div class="mt-1 font-semibold text-white">${tripsCount}</div>
        </div>

        <div class="rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
          <div class="text-slate-400">شكاوى مفتوحة</div>
          <div class="mt-1 font-semibold text-white">${complaintsOpenCount}</div>
        </div>

        <div class="rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
          <div class="text-slate-400">آخر نشاط</div>
          <div class="mt-1 font-semibold text-white">
            ${u.lastSeenAt?.seconds ? new Date(u.lastSeenAt.seconds * 1000).toLocaleDateString("ar-EG") : "غير متاح"}
          </div>
        </div>
      </div>

      ${carHtml}

      <div class="mt-4 flex flex-wrap gap-2">
        <button data-user-id="${id}" class="adminViewUserBtn rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-4 py-2">
          عرض التفاصيل
        </button>

        <button data-user-id="${id}" data-user-role="${escapeHtml(u.role || "")}" class="adminViewUserTripsBtn rounded-2xl bg-indigo-500/90 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2">
  عرض الرحلات
</button>

        ${
          accountStatus === "suspended"
            ? `<button data-user-id="${id}" class="adminActivateUserBtn rounded-2xl bg-emerald-500/90 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2">إعادة تفعيل</button>`
            : `<button data-user-id="${id}" class="adminSuspendUserBtn rounded-2xl bg-rose-500/90 hover:bg-rose-500 text-white text-sm font-semibold px-4 py-2">إيقاف الحساب</button>`
        }

        ${
          u.role === "driver"
            ? `<button data-user-id="${id}" class="adminRequestDriverUpdateBtn rounded-2xl bg-sky-500/90 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2">طلب تعديل بيانات</button>`
            : ""
        }
      </div>
    </div>
  `;
}

async function fetchAdminUsersList() {
  const list = document.getElementById("adminUsersList");
  const stats = document.getElementById("adminUsersStats");
  const searchEl = document.getElementById("adminUserSearch");
  const statusFilterEl = document.getElementById("adminUserStatusFilter");
  const verificationFilterEl = document.getElementById("adminVerificationFilter");
  const complaintsFilterEl = document.getElementById("adminComplaintsFilter");
  const pageInfo = document.getElementById("adminUsersPageInfo");
  const prevBtn = document.getElementById("adminUsersPrevBtn");
  const nextBtn = document.getElementById("adminUsersNextBtn");

  if (!list) return;

  list.innerHTML = `<div class="text-xs text-slate-400">جارٍ تحميل المستخدمين...</div>`;

  try {
    const q = query(
      collection(db, "users"),
      limit(300)
    );

    const snap = await getDocs(q);

    let docs = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      data: docSnap.data()
    }));

    const searchTerm = searchEl?.value?.trim() || "";
    const statusFilter = statusFilterEl?.value || "all";
    const verificationFilter = verificationFilterEl?.value || "all";
    const complaintsFilter = complaintsFilterEl?.value || "all";

    docs = docs.filter((item) => {
      const u = item.data || {};

      if (adminUsersCurrentTab !== "all" && (u.role || "") !== adminUsersCurrentTab) {
        return false;
      }

      if (statusFilter !== "all" && (u.accountStatus || "active") !== statusFilter) {
        return false;
      }

      if (verificationFilter !== "all") {
        if ((u.role || "") !== "driver") return false;
        if ((u.verificationStatus || "not_submitted") !== verificationFilter) return false;
      }

      if (complaintsFilter === "open_only" && Number(u.complaintsOpenCount || 0) <= 0) {
        return false;
      }

      if (!matchesAdminUserSearch(u, searchTerm)) {
        return false;
      }

      return true;
    });

    docs.sort((a, b) => {
      const aSeen = a.data.lastSeenAt?.seconds || 0;
      const bSeen = b.data.lastSeenAt?.seconds || 0;
      return bSeen - aSeen;
    });

    adminUsersAllDocsCache = docs;

    const total = docs.length;
    const totalPages = Math.max(1, Math.ceil(total / adminUsersPageSize));

    if (adminUsersCurrentPage > totalPages) adminUsersCurrentPage = totalPages;
    if (adminUsersCurrentPage < 1) adminUsersCurrentPage = 1;

    const start = (adminUsersCurrentPage - 1) * adminUsersPageSize;
    const end = start + adminUsersPageSize;
    const pageDocs = docs.slice(start, end);

    if (stats) {
      const driversCount = docs.filter(x => x.data.role === "driver").length;
      const ridersCount = docs.filter(x => x.data.role === "rider").length;
      stats.textContent = `النتائج: ${total} • السائقون: ${driversCount} • الركاب: ${ridersCount}`;
    }

    if (pageInfo) {
      pageInfo.textContent = `صفحة ${adminUsersCurrentPage} من ${totalPages}`;
    }

    if (prevBtn) prevBtn.disabled = adminUsersCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = adminUsersCurrentPage >= totalPages;

    if (!pageDocs.length) {
      list.innerHTML = `<div class="text-xs text-slate-400">لا توجد نتائج مطابقة.</div>`;
      return;
    }

    list.innerHTML = pageDocs.map(renderAdminUserCard).join("");

    bindAdminUsersActions();
  } catch (e) {
    console.error("fetchAdminUsersList error:", e);
    list.innerHTML = `<div class="text-xs text-rose-300">تعذر تحميل المستخدمين.</div>`;
  }
}

async function openAdminUserDetails(userId) {
  const modal = document.getElementById("adminUserDetailsModal");
  const content = document.getElementById("adminUserDetailsContent");
  if (!modal || !content || !userId) return;

  content.innerHTML = `<div class="text-xs text-slate-400">جارٍ تحميل التفاصيل...</div>`;
  modal.classList.remove("hidden");

  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) {
      content.innerHTML = `<div class="text-xs text-rose-300">المستخدم غير موجود.</div>`;
      return;
    }

    const u = userSnap.data();

    let privateHtml = "";
    if ((u.role || "") === "driver") {
      try {
        const privateSnap = await getDoc(doc(db, "users_private", userId));
        if (privateSnap.exists()) {
          const p = privateSnap.data();

          privateHtml = `
            <div class="mt-4 rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
              <div class="text-sm font-semibold text-white">بيانات التوثيق</div>
              <div class="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-slate-200">
                <div class="rounded-xl bg-black/20 px-3 py-2">
                  <span class="text-slate-400">حالة التوثيق:</span>
                  <div class="mt-1 font-semibold text-white">${escapeHtml(p.verificationStatus || u.verificationStatus || "غير محدد")}</div>
                </div>
                <div class="rounded-xl bg-black/20 px-3 py-2">
                  <span class="text-slate-400">ملاحظة الإدارة:</span>
                  <div class="mt-1 font-semibold text-white break-words">${escapeHtml(p.adminReviewNote || "") || "—"}</div>
                </div>
              </div>
            </div>
          `;
        }
      } catch (e) {
        console.error("openAdminUserDetails private error:", e);
      }
    }

    content.innerHTML = `
      <div class="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
        <div class="text-sm font-semibold text-white">${escapeHtml(u.name || "بدون اسم")}</div>
        <div class="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-slate-200">
          <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">UID:</span><div class="mt-1 font-semibold text-white break-all">${escapeHtml(u.uid || userId)}</div></div>
          <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">الدور:</span><div class="mt-1 font-semibold text-white">${escapeHtml(u.role || "—")}</div></div>
          <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">الهاتف:</span><div class="mt-1 font-semibold text-white">${escapeHtml(u.phone || "—")}</div></div>
          <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">الحالة:</span><div class="mt-1 font-semibold text-white">${escapeHtml(u.accountStatus || "active")}</div></div>
          <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">التقييم:</span><div class="mt-1 font-semibold text-white">${Number(u.ratingAvg || 0).toFixed(1)} (${Number(u.ratingCount || 0)})</div></div>
          <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">عدد الرحلات:</span><div class="mt-1 font-semibold text-white">${Number(u.tripsCount || 0)}</div></div>
          <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">شكاوى مفتوحة:</span><div class="mt-1 font-semibold text-white">${Number(u.complaintsOpenCount || 0)}</div></div>
          <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">آخر نشاط:</span><div class="mt-1 font-semibold text-white">${u.lastSeenAt?.seconds ? new Date(u.lastSeenAt.seconds * 1000).toLocaleString("ar-EG") : "غير متاح"}</div></div>
        </div>

        ${
          u.role === "driver"
            ? `
              <div class="mt-4 grid gap-2 sm:grid-cols-3 text-xs text-slate-200">
                <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">موديل السيارة:</span><div class="mt-1 font-semibold text-white">${escapeHtml(u.carModel || "—")}</div></div>
                <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">اللون:</span><div class="mt-1 font-semibold text-white">${escapeHtml(u.carColor || "—")}</div></div>
                <div class="rounded-xl bg-black/20 px-3 py-2"><span class="text-slate-400">اللوحة:</span><div class="mt-1 font-semibold text-white">${escapeHtml(u.carPlate || "—")}</div></div>
              </div>
            `
            : ""
        }

        <div class="mt-4">
          <label class="mb-2 block text-xs font-semibold text-slate-300">ملاحظة إدارية</label>
          <textarea id="adminUserNote_${userId}" class="min-h-[100px] w-full rounded-2xl bg-black/20 ring-1 ring-white/10 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-400">${escapeHtml(u.adminNote || "")}</textarea>
          <div class="mt-3">
            <button id="saveAdminUserNoteBtn" data-user-id="${userId}" class="rounded-2xl bg-indigo-500/90 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2">
              حفظ الملاحظة
            </button>
          </div>
        </div>
      </div>

      ${privateHtml}
    `;

    document.getElementById("saveAdminUserNoteBtn")?.addEventListener("click", async () => {
      const targetId = document.getElementById("saveAdminUserNoteBtn")?.getAttribute("data-user-id");
      if (!targetId) return;

      const note = document.getElementById(`adminUserNote_${targetId}`)?.value?.trim() || "";

      try {
        await updateDoc(doc(db, "users", targetId), {
          adminNote: note
        });
        showAlert("تم حفظ الملاحظة ✅", "success");
      } catch (e) {
        console.error(e);
        showAlert("فشل حفظ الملاحظة.", "error");
      }
    });
  } catch (e) {
    console.error("openAdminUserDetails error:", e);
    content.innerHTML = `<div class="text-xs text-rose-300">تعذر تحميل التفاصيل.</div>`;
  }
}

function bindAdminUsersActions() {

 document.querySelectorAll(".adminViewUserTripsBtn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const userId = btn.getAttribute("data-user-id");
    const role = btn.getAttribute("data-user-role");
    if (!userId || !role) return;

    await openAdminUserTrips(userId, role);
  });
});
  
  document.querySelectorAll(".adminViewUserBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-user-id");
      if (!userId) return;
      await openAdminUserDetails(userId);
    });
  });

  document.querySelectorAll(".adminSuspendUserBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-user-id");
      if (!userId) return;

      const reason = window.prompt("اكتب سبب إيقاف الحساب:", "مراجعة إدارية");
      if (reason === null) return;

      try {
        await updateDoc(doc(db, "users", userId), {
          accountStatus: "suspended",
          accountStatusReason: reason.trim() || "مراجعة إدارية"
        });
        showAlert("تم إيقاف الحساب ✅", "success");
        await fetchAdminUsersList();
      } catch (e) {
        console.error(e);
        showAlert("فشل إيقاف الحساب.", "error");
      }
    });
  });

  document.querySelectorAll(".adminActivateUserBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-user-id");
      if (!userId) return;

      try {
        await updateDoc(doc(db, "users", userId), {
          accountStatus: "active",
          accountStatusReason: ""
        });
        showAlert("تمت إعادة التفعيل ✅", "success");
        await fetchAdminUsersList();
      } catch (e) {
        console.error(e);
        showAlert("فشل إعادة التفعيل.", "error");
      }
    });
  });

  document.querySelectorAll(".adminRequestDriverUpdateBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-user-id");
      if (!userId) return;

      const note = window.prompt("اكتب المطلوب من السائق تعديله:", "يرجى تعديل بيانات التوثيق");
      if (note === null) return;

      try {
        await updateDoc(doc(db, "users", userId), {
          verificationStatus: "needs_update"
        });

        await updateDoc(doc(db, "users_private", userId), {
          verificationStatus: "needs_update",
          adminReviewNote: note.trim() || "يرجى تعديل بيانات التوثيق"
        });

        showAlert("تم إرسال طلب تعديل البيانات ✅", "success");
        await fetchAdminUsersList();
      } catch (e) {
        console.error(e);
        showAlert("فشل إرسال طلب تعديل البيانات.", "error");
      }
    });
  });
}

function initAdminUsersControls() {
  document.querySelectorAll(".adminUserTabBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tab = btn.getAttribute("data-user-tab") || "all";
      adminUsersCurrentTab = tab;

      document.querySelectorAll(".adminUserTabBtn").forEach((b) => {
        b.classList.remove("bg-indigo-500/90", "hover:bg-indigo-500");
        b.classList.add("bg-white/10", "hover:bg-white/15");
      });

      btn.classList.remove("bg-white/10", "hover:bg-white/15");
      btn.classList.add("bg-indigo-500/90", "hover:bg-indigo-500");
      
      adminUsersCurrentPage = 1;
      await fetchAdminUsersList();
    });
  });

document.getElementById("savePricingSettingsBtn")?.addEventListener("click", async () => {
  await savePricingSettingsFromAdmin();
});

  
document.getElementById("closeAdminUserTripsModalBtn")?.addEventListener("click", () => {
  document.getElementById("adminUserTripsModal")?.classList.add("hidden");
});
  
  document.getElementById("refreshAdminUsersBtn")?.addEventListener("click", async () => {
    adminUsersCurrentPage = 1;
    await fetchAdminUsersList();
  });

  document.getElementById("adminUserStatusFilter")?.addEventListener("change", async () => {
    adminUsersCurrentPage = 1;
    await fetchAdminUsersList();
  });

  document.getElementById("adminVerificationFilter")?.addEventListener("change", async () => {
    adminUsersCurrentPage = 1;
    await fetchAdminUsersList();
  });

  document.getElementById("adminComplaintsFilter")?.addEventListener("change", async () => {
  adminUsersCurrentPage = 1;
  await fetchAdminUsersList();
});
  
  document.getElementById("adminUserSearch")?.addEventListener("input", () => {
  adminUsersCurrentPage = 1;

  if (adminUsersSearchDebounceTimer) {
    clearTimeout(adminUsersSearchDebounceTimer);
  }

  adminUsersSearchDebounceTimer = setTimeout(async () => {
    await fetchAdminUsersList();
  }, 350);
});
  document.getElementById("closeAdminUserDetailsModalBtn")?.addEventListener("click", () => {
    document.getElementById("adminUserDetailsModal")?.classList.add("hidden");
  });

  document.getElementById("adminUsersPrevBtn")?.addEventListener("click", async () => {
  if (adminUsersCurrentPage > 1) {
    adminUsersCurrentPage -= 1;
    await fetchAdminUsersList();
  }
});

document.getElementById("adminUsersNextBtn")?.addEventListener("click", async () => {
  const totalPages = Math.max(1, Math.ceil(adminUsersAllDocsCache.length / adminUsersPageSize));
  if (adminUsersCurrentPage < totalPages) {
    adminUsersCurrentPage += 1;
    await fetchAdminUsersList();
  }
});
}

async function initAdminUsersManagement() {
  const box = document.getElementById("adminUsersBox");
  if (!box) return;

  box.classList.remove("hidden");

  if (!adminUsersLoaded) {
    initAdminUsersControls();
    adminUsersLoaded = true;
  }

  await fetchAdminUsersList();
}

async function openAdminUserTrips(userId, role) {
  const modal = document.getElementById("adminUserTripsModal");
  const content = document.getElementById("adminUserTripsContent");
  if (!modal || !content || !userId || !role) return;

  modal.classList.remove("hidden");
  content.innerHTML = `<div class="text-xs text-slate-400">جارٍ تحميل الرحلات...</div>`;

  try {
    const field = role === "driver" ? "driverId" : "riderId";

    const q = query(
      collection(db, "trips"),
      where(field, "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      content.innerHTML = `<div class="text-xs text-slate-400">لا توجد رحلات لهذا المستخدم.</div>`;
      return;
    }

    content.innerHTML = snap.docs.map((docSnap) => {
      const t = docSnap.data();
      return `
        <div class="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
          <div class="flex flex-wrap items-center gap-2">
            ${statusBadge(t.status || "pending")}
          </div>

          <div class="mt-3 text-sm font-semibold text-white break-all">
            ${escapeHtml(t.pickup || "—")} → ${escapeHtml(t.dropoff || "—")}
          </div>

          <div class="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
            <span>السعر: ${Number(t.price || 0)} جنيه</span>
            <span>الركاب: ${Number(t.passengerCount || 1)}</span>
            <span>النوع: ${escapeHtml(t.tripType || "—")}</span>
          </div>

          <div class="mt-2 text-[11px] text-slate-400 break-all">
            Trip ID: ${docSnap.id}
          </div>
        </div>
      `;
    }).join("");
  } catch (e) {
    console.error("openAdminUserTrips error:", e);
    content.innerHTML = `<div class="text-xs text-rose-300">تعذر تحميل الرحلات.</div>`;
  }
}

const APP_NAV_CONFIG = {
  rider: [
    { key: "request", label: "طلب رحلة", icon: "✦" },
    { key: "my_trip", label: "رحلتي", icon: "◷" },
    { key: "complaints", label: "الشكاوى", icon: "◎" },
    { key: "profile", label: "الحساب", icon: "◉" }
  ],
  driver: [
    { key: "requests", label: "الطلبات", icon: "✦" },
    { key: "current_trip", label: "رحلتي", icon: "◷" },
    { key: "complaints", label: "الشكاوى", icon: "◎" },
    { key: "profile", label: "الحساب", icon: "◉" }
  ],
  admin: [
    { key: "verifications", label: "التوثيق", icon: "✓" },
    { key: "profile_updates", label: "التعديلات", icon: "✎" },
    { key: "complaints", label: "الشكاوى", icon: "◎" },
    { key: "users", label: "المستخدمون", icon: "◈" },
    { key: "pricing", label: "التسعير", icon: "💰" }
  ]
};

let currentAppRole = "guest";
let currentAppSection = "login";

function hideAllAppSections() {
  document.querySelectorAll(".appSection").forEach((el) => {
    el.classList.remove("isActive");
  });
}

function showAppSection(role, section) {
  currentAppRole = role;
  currentAppSection = section;

  try {
    localStorage.setItem("lastAppSectionRole", role);
    localStorage.setItem("lastAppSectionKey", section);
  } catch (e) {
    console.error("save last section error:", e);
  }

  hideAllAppSections();

  const matchedSections = [];

  document.querySelectorAll(".appSection").forEach((el) => {
    const elRole = el.getAttribute("data-role");
    const elSection = el.getAttribute("data-section");
    const sharedRoles = (el.getAttribute("data-shared-roles") || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

    const directMatch = elRole === role && elSection === section;
    const sharedMatch = elSection === section && sharedRoles.includes(role);

    if (directMatch || sharedMatch) {
      el.classList.add("isActive");
      matchedSections.push(el);
    }
  });

  document.querySelectorAll(".appNavBtn").forEach((btn) => {
    const isMatch = btn.getAttribute("data-role") === role && btn.getAttribute("data-section") === section;
    btn.classList.toggle("isActive", isMatch);
  });

  document.querySelectorAll(".appBottomNavBtn").forEach((btn) => {
    const isMatch = btn.getAttribute("data-role") === role && btn.getAttribute("data-section") === section;
    btn.classList.toggle("isActive", isMatch);
  });

  // ✅ انزل للمحتوى الظاهر الجديد
  if (matchedSections.length) {
    const firstSection = matchedSections[0];

    setTimeout(() => {
      firstSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 40);
  }
}

function renderAppNav(role) {
  const wrap = document.getElementById("appNavWrap");
  const nav = document.getElementById("appNav");
  const bottomWrap = document.getElementById("appBottomNavWrap");
  const bottomNav = document.getElementById("appBottomNav");
  const title = document.getElementById("appNavTitle");

  if (!wrap || !nav || !title || !bottomWrap || !bottomNav) return;

  const items = APP_NAV_CONFIG[role] || [];
  if (!items.length) {
    wrap.classList.add("hidden");
    bottomWrap.classList.add("hidden");
    nav.innerHTML = "";
    bottomNav.innerHTML = "";
    return;
  }

  wrap.classList.remove("hidden");
  bottomWrap.classList.remove("hidden");

  title.textContent = role === "rider"
    ? "تنقل الراكب"
    : role === "driver"
    ? "تنقل السائق"
    : "لوحة الإدارة";

    nav.innerHTML = items.map((item) => `
    <button
      class="appNavBtn ${currentAppRole === role && currentAppSection === item.key ? "isActive" : ""}"
      data-role="${role}"
      data-section="${item.key}">
      <span class="text-[15px] leading-none">${item.icon || "•"}</span>
      <span>${item.label}</span>
    </button>
  `).join("");

    bottomNav.innerHTML = items.map((item) => `
    <button
      class="appBottomNavBtn ${currentAppRole === role && currentAppSection === item.key ? "isActive" : ""}"
      data-role="${role}"
      data-section="${item.key}">
      <span class="navIcon">${item.icon || "•"}</span>
      <span class="navLabel">${item.label}</span>
    </button>
  `).join("");
  
  nav.querySelectorAll(".appNavBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetRole = btn.getAttribute("data-role");
      const targetSection = btn.getAttribute("data-section");
      showAppSection(targetRole, targetSection);
    });
  });

  bottomNav.querySelectorAll(".appBottomNavBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetRole = btn.getAttribute("data-role");
      const targetSection = btn.getAttribute("data-section");
      showAppSection(targetRole, targetSection);
    });
  });
}



function initRoleBasedNavigation(role) {
  currentAppRole = role;

  if (role === "guest") {
    const wrap = document.getElementById("appNavWrap");
    const bottomWrap = document.getElementById("appBottomNavWrap");
    if (wrap) wrap.classList.add("hidden");
    if (bottomWrap) bottomWrap.classList.add("hidden");

    hideAllAppSections();

    document.querySelectorAll(`.appSection[data-role="guest"]`).forEach((el) => {
      el.classList.add("isActive");
    });

    return;
  }

  let defaultSection = "request";
  if (role === "driver") defaultSection = "requests";
  if (role === "admin") defaultSection = "verifications";

  let savedRole = null;
  let savedSection = null;

  try {
    savedRole = localStorage.getItem("lastAppSectionRole");
    savedSection = localStorage.getItem("lastAppSectionKey");
  } catch (e) {
    console.error("read last section error:", e);
  }

  const allowedSections = (APP_NAV_CONFIG[role] || []).map(x => x.key);

  if (savedRole === role && savedSection && allowedSections.includes(savedSection)) {
    currentAppSection = savedSection;
  } else {
    currentAppSection = defaultSection;
  }

  renderAppNav(role);
  showAppSection(role, currentAppSection);
}


function cleanupRealtimeWatchers() {
  try {
    if (unsubscribeMyTrip) {
      unsubscribeMyTrip();
      unsubscribeMyTrip = null;
    }
  } catch (e) {
    console.error("cleanup unsubscribeMyTrip error:", e);
  }

  try {
    if (unsubscribeDriverTrip) {
      unsubscribeDriverTrip();
      unsubscribeDriverTrip = null;
    }
  } catch (e) {
    console.error("cleanup unsubscribeDriverTrip error:", e);
  }

  try {
    if (unsubscribeMyComplaints) {
      unsubscribeMyComplaints();
      unsubscribeMyComplaints = null;
    }
  } catch (e) {
    console.error("cleanup unsubscribeMyComplaints error:", e);
  }

  try {
    if (unsubscribeAdminComplaints) {
      unsubscribeAdminComplaints();
      unsubscribeAdminComplaints = null;
    }
  } catch (e) {
    console.error("cleanup unsubscribeAdminComplaints error:", e);
  }

  try {
    if (unsubscribeRiderLiveLocation) {
      unsubscribeRiderLiveLocation();
      unsubscribeRiderLiveLocation = null;
    }
  } catch (e) {
    console.error("cleanup unsubscribeRiderLiveLocation error:", e);
  }

  try {
    stopDriverLiveLocationSharingRTDB?.();
  } catch (e) {
    console.error("cleanup stopDriverLiveLocationSharingRTDB error:", e);
  }

  try {
    clearRiderLiveTrackingUI?.();
  } catch (e) {
    console.error("cleanup clearRiderLiveTrackingUI error:", e);
  }

  try {
    clearDriverLiveLocationRTDB?.();
  } catch (e) {
    console.error("cleanup clearDriverLiveLocationRTDB error:", e);
  }
}

let pricingSettings = {
  baseFare: 15,
  pricePerKm: 6,
  minimumFare: 25,
  waitingPerMinute: 2,
  extraPassengerFee: 5,
  luggageFee: 10,
  cargoFee: 20,
  returnSameDayFee: 25,
  roundTripMultiplier: 1.8
};

window.currentKmRoad = 0;
window.currentRouteMinutes = 0;

async function loadPricingSettings() {
  try {
    const ref = doc(db, "settings", "pricing");
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, pricingSettings, { merge: true });
      return pricingSettings;
    }

    pricingSettings = {
      ...pricingSettings,
      ...snap.data()
    };

    return pricingSettings;
  } catch (e) {
    console.error("loadPricingSettings error:", e);
    return pricingSettings;
  }
}

async function getRoadRouteMetrics(startLatLng, endLatLng) {
  try {
    if (!startLatLng || !endLatLng) {
      return { km: 0, minutes: 0, source: "invalid" };
    }

    const startLat = Number(startLatLng.lat);
    const startLng = Number(startLatLng.lng);
    const endLat = Number(endLatLng.lat);
    const endLng = Number(endLatLng.lng);

    if (
      !Number.isFinite(startLat) || !Number.isFinite(startLng) ||
      !Number.isFinite(endLat) || !Number.isFinite(endLng)
    ) {
      return { km: 0, minutes: 0, source: "invalid" };
    }

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${startLng},${startLat};${endLng},${endLat}` +
      `?overview=false&alternatives=false&steps=false`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Routing HTTP ${res.status}`);

    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) throw new Error("No route returned");

    return {
      km: Number(route.distance || 0) / 1000,
      minutes: Number(route.duration || 0) / 60,
      source: "osrm"
    };
  } catch (e) {
    console.error("getRoadRouteMetrics error:", e);

    try {
      const fallbackKm = distanceKm(startLatLng, endLatLng);
      return {
        km: Number(fallbackKm || 0),
        minutes: Math.max(1, Math.round((Number(fallbackKm || 0) / 28) * 60)),
        source: "fallback_air"
      };
    } catch (fallbackErr) {
      console.error("getRoadRouteMetrics fallback error:", fallbackErr);
      return {
        km: 0,
        minutes: 0,
        source: "failed"
      };
    }
  }
}

function getTripOptionsForPricing() {
  return {
    passengerCount: Number(document.getElementById("passengerCount")?.value || 1),
    hasLuggage: !!document.getElementById("hasLuggage")?.checked,
    hasCargo: !!document.getElementById("hasCargo")?.checked,
    isRoundTrip: !!document.getElementById("isRoundTrip")?.checked,
    hasSameDayReturn: !!document.getElementById("sameDayReturn")?.checked
  };
}

function calculateTripPriceBreakdown({
  km = 0,
  waitingMinutes = 0,
  passengerCount = 1,
  hasLuggage = false,
  hasCargo = false,
  isRoundTrip = false,
  hasSameDayReturn = false
}) {
  const s = pricingSettings || {};

  const baseFare = Number(s.baseFare || 0);
  const pricePerKm = Number(s.pricePerKm || 0);
  const minimumFare = Number(s.minimumFare || 0);
  const waitingPerMinute = Number(s.waitingPerMinute || 0);
  const extraPassengerFee = Number(s.extraPassengerFee || 0);
  const luggageFee = Number(s.luggageFee || 0);
  const cargoFee = Number(s.cargoFee || 0);
  const returnSameDayFee = Number(s.returnSameDayFee || 0);
  const roundTripMultiplier = Number(s.roundTripMultiplier || 1);

  const distanceFare = Number(km || 0) * pricePerKm;
  const waitingFare = Number(waitingMinutes || 0) * waitingPerMinute;
  const extraPassengers = Math.max(0, Number(passengerCount || 1) - 1);
  const passengersFare = extraPassengers * extraPassengerFee;
  const luggageFare = hasLuggage ? luggageFee : 0;
  const cargoFareValue = hasCargo ? cargoFee : 0;
  const sameDayReturnFare = hasSameDayReturn ? returnSameDayFee : 0;

  let subtotal =
    baseFare +
    distanceFare +
    waitingFare +
    passengersFare +
    luggageFare +
    cargoFareValue +
    sameDayReturnFare;

  if (isRoundTrip) {
    subtotal = subtotal * roundTripMultiplier;
  }

  const finalPrice = Math.max(minimumFare, Math.round(subtotal));

  return {
    baseFare,
    distanceFare,
    waitingFare,
    passengersFare,
    luggageFare,
    cargoFare: cargoFareValue,
    sameDayReturnFare,
    km: Number(km || 0),
    waitingMinutes: Number(waitingMinutes || 0),
    isRoundTrip,
    finalPrice
  };
}

function renderTripPricingSummary(breakdown) {
  const detailsEl = document.getElementById("tripPricingDetails");
  if (!detailsEl) return;

  if (!breakdown || !Number.isFinite(breakdown.finalPrice)) {
    detailsEl.innerHTML = `
      <div class="text-xs text-slate-400">
        اختر مكان الركوب والوجهة لعرض التسعير.
      </div>
    `;
    return;
  }

  detailsEl.innerHTML = `
    <div>المسافة الفعلية: <b>${breakdown.km.toFixed(1)}</b> كم</div>
    <div>فتح العداد: <b>${breakdown.baseFare}</b> جنيه</div>
    <div>تكلفة المسافة: <b>${Math.round(breakdown.distanceFare)}</b> جنيه</div>
    ${breakdown.passengersFare ? `<div>ركاب إضافيون: <b>${Math.round(breakdown.passengersFare)}</b> جنيه</div>` : ""}
    ${breakdown.luggageFare ? `<div>شنط: <b>${Math.round(breakdown.luggageFare)}</b> جنيه</div>` : ""}
    ${breakdown.cargoFare ? `<div>حمولة: <b>${Math.round(breakdown.cargoFare)}</b> جنيه</div>` : ""}
    ${breakdown.sameDayReturnFare ? `<div>عودة نفس اليوم: <b>${Math.round(breakdown.sameDayReturnFare)}</b> جنيه</div>` : ""}
    <div class="mt-2 rounded-xl bg-indigo-500/15 px-3 py-2 text-white ring-1 ring-indigo-500/20">
      السعر التقديري: <b>${breakdown.finalPrice}</b> جنيه
    </div>
  `;
}

async function updateMetrics() {
  const el = document.getElementById("tripMetrics");
  if (!el) return;

  if (!pickupLatLng || !dropoffLatLng) {
    el.textContent = "اختر مكان الركوب والوجهة.";
    window.currentKmRoad = 0;
    window.currentRouteMinutes = 0;
    renderTripPricingSummary(null);
    return;
  }

  const routeMetrics = await getRoadRouteMetrics(pickupLatLng, dropoffLatLng);
  const km = Number(routeMetrics.km || 0);
  const minutes = Number(routeMetrics.minutes || 0);

  window.currentKmRoad = km;
  window.currentRouteMinutes = minutes;

  const tripOptions = getTripOptionsForPricing();

  const breakdown = calculateTripPriceBreakdown({
    km,
    waitingMinutes: 0,
    passengerCount: tripOptions.passengerCount,
    hasLuggage: tripOptions.hasLuggage,
    hasCargo: tripOptions.hasCargo,
    isRoundTrip: tripOptions.isRoundTrip,
    hasSameDayReturn: tripOptions.hasSameDayReturn
  });

  renderTripPricingSummary(breakdown);

  el.textContent = `المسافة: ${km.toFixed(1)} كم | الزمن: ${Math.round(minutes)} دقيقة | السعر: ${breakdown.finalPrice} جنيه`;
}

function initTripOptionsUI() {
  [
    "passengerCount",
    "hasLuggage",
    "hasCargo",
    "isRoundTrip",
    "sameDayReturn"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const eventName = el.type === "checkbox" ? "change" : "input";
    el.addEventListener(eventName, async () => {
      await updateMetrics();
    });
  });
}

async function renderPricingSettingsForm() {
  await loadPricingSettings();

  document.getElementById("pricingBaseFare").value = pricingSettings.baseFare ?? 0;
  document.getElementById("pricingPerKm").value = pricingSettings.pricePerKm ?? 0;
  document.getElementById("pricingMinimumFare").value = pricingSettings.minimumFare ?? 0;
  document.getElementById("pricingWaitingPerMinute").value = pricingSettings.waitingPerMinute ?? 0;
  document.getElementById("pricingExtraPassengerFee").value = pricingSettings.extraPassengerFee ?? 0;
  document.getElementById("pricingLuggageFee").value = pricingSettings.luggageFee ?? 0;
  document.getElementById("pricingCargoFee").value = pricingSettings.cargoFee ?? 0;
  document.getElementById("pricingReturnSameDayFee").value = pricingSettings.returnSameDayFee ?? 0;
  document.getElementById("pricingRoundTripMultiplier").value = pricingSettings.roundTripMultiplier ?? 1;
}

async function savePricingSettingsFromAdmin() {
  const statusEl = document.getElementById("pricingSettingsStatus");

  const nextSettings = {
    baseFare: Number(document.getElementById("pricingBaseFare")?.value || 0),
    pricePerKm: Number(document.getElementById("pricingPerKm")?.value || 0),
    minimumFare: Number(document.getElementById("pricingMinimumFare")?.value || 0),
    waitingPerMinute: Number(document.getElementById("pricingWaitingPerMinute")?.value || 0),
    extraPassengerFee: Number(document.getElementById("pricingExtraPassengerFee")?.value || 0),
    luggageFee: Number(document.getElementById("pricingLuggageFee")?.value || 0),
    cargoFee: Number(document.getElementById("pricingCargoFee")?.value || 0),
    returnSameDayFee: Number(document.getElementById("pricingReturnSameDayFee")?.value || 0),
    roundTripMultiplier: Number(document.getElementById("pricingRoundTripMultiplier")?.value || 1)
  };

  try {
    await setDoc(doc(db, "settings", "pricing"), nextSettings, { merge: true });
    pricingSettings = {
      ...pricingSettings,
      ...nextSettings
    };

    if (statusEl) statusEl.textContent = "تم حفظ الأسعار بنجاح ✅";
    showAlert("تم حفظ إعدادات التسعير ✅", "success");
  } catch (e) {
    console.error("savePricingSettingsFromAdmin error:", e);
    if (statusEl) statusEl.textContent = "فشل حفظ الأسعار.";
    showAlert("فشل حفظ إعدادات التسعير.", "error");
  }
}



// ✅ Auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
  cleanupRealtimeWatchers();
  appBox?.classList.add("hidden");
  initRoleBasedNavigation("guest");
  return;
}

  cleanupRealtimeWatchers();
  
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const profile = snap.exists() ? snap.data() : { name: user.email, role: "rider" };

    await loadPricingSettings();
    // ✅ هنا بالظبط تحطها
if (!localStorage.getItem("permissionsAsked") && profile.role !== "admin") {
  setTimeout(() => {
    showPermissionsModal();
  }, 1500);
}

    
        try {
      const patch = {};

      if (profile.accountStatus === undefined) patch.accountStatus = "active";
      if (profile.accountStatusReason === undefined) patch.accountStatusReason = "";
      if (profile.adminNote === undefined) patch.adminNote = "";
      if (profile.activeTripId === undefined) patch.activeTripId = null;
      if (profile.tripsCount === undefined) patch.tripsCount = 0;
      if (profile.complaintsOpenCount === undefined) patch.complaintsOpenCount = 0;
      if (profile.lastSeenAt === undefined) patch.lastSeenAt = serverTimestamp();

      if ((profile.role || "") === "driver") {
        if (profile.verificationStatus === undefined) patch.verificationStatus = "not_submitted";
        if (profile.carModel === undefined) patch.carModel = "";
        if (profile.carColor === undefined) patch.carColor = "";
        if (profile.carPlate === undefined) patch.carPlate = "";
      }

      if (Object.keys(patch).length) {
        await updateDoc(doc(db, "users", user.uid), patch);
        Object.assign(profile, patch);
      }
    } catch (e) {
      console.error("user patch error:", e);
    }

        try {
      await updateDoc(doc(db, "users", user.uid), {
        lastSeenAt: serverTimestamp()
      });
    } catch (e) {
      console.error("lastSeenAt update error:", e);
    }
    
    userLabel.textContent = profile.name || user.email;
    roleLabel.textContent = profile.role || "rider";
    uidLabel.textContent = user.uid;

    const profileRatingValue = document.getElementById("profileRatingValue");
const profileRatingCount = document.getElementById("profileRatingCount");
const profileRatingBadge = document.getElementById("profileRatingBadge");

try {
  const myRating = await getUserAverageRating(user.uid);

  if (profileRatingValue) {
    profileRatingValue.textContent = `${myRating.avg || 0} / 5`;
  }

  if (profileRatingCount) {
    profileRatingCount.textContent = `(${myRating.count || 0})`;
  }

  if (profileRatingBadge) {
    if ((myRating.count || 0) > 0) {
      profileRatingBadge.className =
        "inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/20";
    } else {
      profileRatingBadge.className =
        "inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 ring-1 ring-white/10";
    }
  }
} catch (e) {
  console.error(e);
}
    
const profileBox = document.getElementById("profileBox");
const profileName = document.getElementById("profileName");
const profilePhone = document.getElementById("profilePhone");
const profileUpdateBox = document.getElementById("profileUpdateBox");
const driverUpdateFields = document.getElementById("driverUpdateFields");
const driverDocumentUpdateHint = document.getElementById("driverDocumentUpdateHint");
const driverUpdateDocumentsFields = document.getElementById("driverUpdateDocumentsFields");
const driverCarFields = document.getElementById("driverCarFields");
const carPlate = document.getElementById("carPlate");
const carModel = document.getElementById("carModel");
const carColor = document.getElementById("carColor");
const driverPrivateFields = document.getElementById("driverPrivateFields");

const nationalId = document.getElementById("nationalId");
const nationalIdExpiry = document.getElementById("nationalIdExpiry");
const driverLicenseNumber = document.getElementById("driverLicenseNumber");
const driverLicenseExpiry = document.getElementById("driverLicenseExpiry");
const vehicleLicenseNumber = document.getElementById("vehicleLicenseNumber");
const vehicleLicenseExpiry = document.getElementById("vehicleLicenseExpiry");    
// إظهار صندوق البيانات لو ناقص اسم أو موبايل
const isDriver = (profile.role || "rider") === "driver";

// اقرأ البيانات الخاصة لو السائق
let privateData = null;
if (isDriver) {
  try {
    privateData = await getPrivateDriverData(user.uid);
  } catch (e) {
    console.error(e);
  }
}

const missingBasic = !profile.name || !profile.phone;
const missingDriverCar =
  isDriver && (!profile.carPlate || !profile.carModel || !profile.carColor);

const missingDriverPrivate =
  isDriver && (
    !privateData?.nationalId ||
    !privateData?.nationalIdExpiry ||
    !privateData?.driverLicenseNumber ||
    !privateData?.driverLicenseExpiry ||
    !privateData?.vehicleLicenseNumber ||
    !privateData?.vehicleLicenseExpiry
  );

if (missingBasic || missingDriverCar || missingDriverPrivate) {
  profileBox?.classList.remove("hidden");
} else {
  profileBox?.classList.add("hidden");
}

if (profileName) profileName.value = profile.name || "";
if (profilePhone) profilePhone.value = profile.phone || "";

if (isDriver) {
  driverCarFields?.classList.remove("hidden");
  driverPrivateFields?.classList.remove("hidden");
} else {
  driverCarFields?.classList.add("hidden");
  driverPrivateFields?.classList.add("hidden");
}

profileUpdateBox?.classList.remove("hidden");

if (isDriver) {
  driverUpdateFields?.classList.remove("hidden");
  driverDocumentUpdateHint?.classList.remove("hidden");
} else {
  driverUpdateFields?.classList.add("hidden");
  driverDocumentUpdateHint?.classList.add("hidden");
  driverUpdateDocumentsFields?.classList.add("hidden");
}
    
if (carPlate) carPlate.value = profile.carPlate || "";
if (carModel) carModel.value = profile.carModel || "";
if (carColor) carColor.value = profile.carColor || "";

if (nationalId) nationalId.value = privateData?.nationalId || "";
if (nationalIdExpiry) nationalIdExpiry.value = privateData?.nationalIdExpiry || "";
if (driverLicenseNumber) driverLicenseNumber.value = privateData?.driverLicenseNumber || "";
if (driverLicenseExpiry) driverLicenseExpiry.value = privateData?.driverLicenseExpiry || "";
if (vehicleLicenseNumber) vehicleLicenseNumber.value = privateData?.vehicleLicenseNumber || "";
if (vehicleLicenseExpiry) vehicleLicenseExpiry.value = privateData?.vehicleLicenseExpiry || "";
    
    // اخفي فورمات الدخول/التسجيل واظهر صندوق المستخدم
    signupPanel.classList.add("hidden");
    loginPanel.classList.add("hidden");
    appBox.classList.remove("hidden");
    
// Show rider/driver boxes
const riderBox = document.getElementById("riderBox");
const driverBox = document.getElementById("driverBox");
const adminBox = document.getElementById("adminBox");
initComplaintFormUI(user.uid, profile.role || "rider");
watchMyComplaints(user.uid);
    
if (profile.role === "admin") {
    watchAdminComplaints();
  await initAdminUsersManagement();
  
  await renderPricingSettingsForm();
  document.getElementById("adminPricingBox")?.classList.remove("hidden");
  document.getElementById("savePricingSettingsBtn")?.addEventListener("click", async () => {
    await savePricingSettingsFromAdmin();
  });
  
  adminBox?.classList.remove("hidden");
  riderBox?.classList.add("hidden");
  driverBox?.classList.add("hidden");
  
  initRoleBasedNavigation("admin");
  await loadPendingDriverVerifications();
  await loadPendingProfileUpdateRequests();

} else if (profile.role === "driver") {

  driverBox?.classList.remove("hidden");
  riderBox?.classList.add("hidden");
  adminBox?.classList.add("hidden");

  initRoleBasedNavigation("driver");
  const verification = evaluateDriverVerification(profile, privateData);
  currentDriverVerification = verification;
  renderDriverVerificationUI(verification);

  await loadPendingTripsForDriver(user.uid);
  await loadDriverVerificationState(user.uid);
  initVerificationWizard();
  watchDriverCurrentTrip(user.uid);
  await loadMyLatestProfileUpdateRequest(user.uid);
  initRatingWidgets();

} else {

  riderBox?.classList.remove("hidden");
  driverBox?.classList.add("hidden");
  adminBox?.classList.add("hidden");
  initRoleBasedNavigation("rider");
  
  initMapOnce();
  watchMyLatestTrip(user.uid);
  await loadMyLatestProfileUpdateRequest(user.uid);
  initRatingWidgets();
  initTripOptionsUI();

  window.currentKmRoad = Number(window.currentKmRoad || 0);
renderTripPricingSummary(null);}
  } catch (e) {
    console.error(e);
    showAlert("حصلت مشكلة في قراءة بيانات المستخدم من Firestore.", "error");
  }
});

async function createTrip(riderId) {
  const pickup =
  document.getElementById("pickupSearch")?.value?.trim() ||
  document.getElementById("pickupMapsInput")?.value?.trim() ||
  (pickupLatLng ? `${pickupLatLng.lat.toFixed(6)}, ${pickupLatLng.lng.toFixed(6)}` : "");

const dropoff =
  document.getElementById("dropoffSearch")?.value?.trim() ||
  document.getElementById("dropoffMapsInput")?.value?.trim() ||
  (dropoffLatLng ? `${dropoffLatLng.lat.toFixed(6)}, ${dropoffLatLng.lng.toFixed(6)}` : "");
  
  const riderStatus = document.getElementById("riderStatus");

    // منع إنشاء أكثر من رحلة نشطة لنفس الراكب
    const riderUserSnap = await getDoc(doc(db, "users", riderId));

  if (riderUserSnap.exists()) {
    const riderUserData = riderUserSnap.data();

    if (riderUserData.activeTripId) {
      if (riderStatus) {
        riderStatus.textContent = "لديك بالفعل رحلة أو طلب نشط. لا يمكنك إنشاء طلب جديد قبل إنهاء أو إلغاء الحالي.";
      }
      return;
    }
  }
  
  const passengerCount = Number(document.getElementById("passengerCount")?.value || 1);
  const luggageType = document.getElementById("luggageType")?.value || "none";
  const tripType = getSelectedTripType();
  const waitingMinutes = Number(document.getElementById("waitingMinutes")?.value || 0);
  const returnDate = document.getElementById("returnDate")?.value || "";
  const tripNotes = document.getElementById("tripNotes")?.value?.trim() || "";

  if (!pickupLatLng || !dropoffLatLng) {
  if (riderStatus) riderStatus.textContent = "حدد مكان الانطلاق والوجهة من الخريطة أو البحث أولًا.";
  return;
}

  if (!passengerCount || passengerCount < 1 || passengerCount > 7) {
    if (riderStatus) riderStatus.textContent = "اختر عدد الركاب بشكل صحيح.";
    return;
  }

  if (!luggageType) {
    if (riderStatus) riderStatus.textContent = "اختر حالة الشنط أو الحمولة.";
    return;
  }

  if (!tripType) {
    if (riderStatus) riderStatus.textContent = "اختر نوع الرحلة.";
    return;
  }

  if (tripType === "round_same_day" && waitingMinutes <= 0) {
    if (riderStatus) riderStatus.textContent = "اختر مدة الانتظار لرحلة الذهاب والعودة في نفس اليوم.";
    return;
  }

  if (tripType === "return_other_day" && !returnDate) {
    if (riderStatus) riderStatus.textContent = "اختر تاريخ العودة المطلوب.";
    return;
  }

const hasLuggage = !!document.getElementById("hasLuggage")?.checked;
const hasCargo = !!document.getElementById("hasCargo")?.checked;
const isRoundTrip = !!document.getElementById("isRoundTrip")?.checked;
const hasSameDayReturn = !!document.getElementById("sameDayReturn")?.checked;

  
  const pickupPlace = pickupLatLng
    ? await reverseGeocode(pickupLatLng.lat, pickupLatLng.lng)
    : { shortText: pickup, fullText: pickup };

  const dropoffPlace = dropoffLatLng
    ? await reverseGeocode(dropoffLatLng.lat, dropoffLatLng.lng)
    : { shortText: dropoff, fullText: dropoff };

  const pickupDisplay = pickupPlace.shortText || pickup;
  const dropoffDisplay = dropoffPlace.shortText || dropoff;
  
  const routeMetrics = await getRoadRouteMetrics(pickupLatLng, dropoffLatLng);

const tripOptions = getTripOptionsForPricing();

const kmEstimated = Number(routeMetrics.km || 0);

const pickupLat = pickupLatLng?.lat ?? null;
const pickupLng = pickupLatLng?.lng ?? null;
const dropoffLat = dropoffLatLng?.lat ?? null;
const dropoffLng = dropoffLatLng?.lng ?? null;

const tripOptions = getTripOptionsForPricing();

const priceBreakdown = calculateTripPriceBreakdown({
  km: routeMetrics.km,
  waitingMinutes: 0,
  passengerCount: tripOptions.passengerCount,
  hasLuggage: tripOptions.hasLuggage,
  hasCargo: tripOptions.hasCargo,
  isRoundTrip: tripOptions.isRoundTrip,
  hasSameDayReturn: tripOptions.hasSameDayReturn
});

const kmEstimated = Number(routeMetrics.km || 0);
  
  const newTripRef = await addDoc(collection(db, "trips"), {

  kmEstimated: Number(routeMetrics.km || 0),
durationEstimatedMinutes: Number(routeMetrics.minutes || 0),
price: priceBreakdown.finalPrice,
passengerCount: tripOptions.passengerCount,
hasLuggage: tripOptions.hasLuggage,
hasCargo: tripOptions.hasCargo,
isRoundTrip: tripOptions.isRoundTrip,
hasSameDayReturn: tripOptions.hasSameDayReturn,
priceBreakdown,
    
  riderId,
  driverId: null,
  pickup: pickupDisplay,
  dropoff: dropoffDisplay,
  pickupAddress: pickupDisplay,
  dropoffAddress: dropoffDisplay,
  pickupFullAddress: pickupPlace.fullText || pickupDisplay,
  dropoffFullAddress: dropoffPlace.fullText || dropoffDisplay,
    
    pickupLat,
pickupLng,
dropoffLat,
dropoffLng,
kmEstimated,
  

    status: "pending",
    createdAt: serverTimestamp(),
    luggageType,
    tripType,
    waitingMinutes: tripType === "round_same_day" ? waitingMinutes : 0,
    returnDate: tripType === "return_other_day" ? returnDate : "",
    tripNotes,
    returnRequestScheduled: tripType === "return_other_day",
  
  });

try {
  const riderUserRef = doc(db, "users", riderId);
  const riderSnap = await getDoc(riderUserRef);
  const currentTripsCount = riderSnap.exists() ? Number(riderSnap.data().tripsCount || 0) : 0;

  await updateDoc(riderUserRef, {
    tripsCount: currentTripsCount + 1,
    activeTripId: newTripRef.id
  });
} catch (e) {
  console.error("update rider tripsCount error:", e);
}
  
  await updateDoc(doc(db, "users", riderId), {
    activeTripId: newTripRef.id
  });
  
  if (riderStatus) riderStatus.textContent = "تم إرسال الطلب ✅ انتظر قبول السائق.";
}

function getTripTypeLabel(tripType) {
  if (tripType === "one_way") return "ذهاب فقط";
  if (tripType === "round_same_day") return "ذهاب وعودة في نفس اليوم";
  if (tripType === "return_other_day" || tripType === "round_diff_days") return "ذهاب وعودة في يوم مختلف";
  return "غير محدد";
}

function getLuggageLabel(luggageType) {
  if (luggageType === "none") return "لا يوجد";
  if (luggageType === "bags") return "شنط";
  if (luggageType === "extra") return "حمولة إضافية";
  return "غير محدد";
}

function renderDriverTripDetailsHtml(t) {
  const tripTypeLabel = getTripTypeLabel(t.tripType);
  const luggageLabel = getLuggageLabel(t.luggageType);
  const passengerCount = Number(t.passengerCount || 1);
  const waitingMinutes = Number(t.waitingMinutes || 0);
  const returnDate = t.returnDate || "";
  const tripNotes = (t.tripNotes || "").trim();

  const priceBreakdown = t.priceBreakdown || {};
  const oneWayFare = Number(priceBreakdown.oneWayFare || 0);
  const luggageFee = Number(priceBreakdown.luggageFee || 0);
  const extraPassengerFee = Number(priceBreakdown.extraPassengerFee || 0);
  const waitingFee = Number(priceBreakdown.waitingFee || 0);
  const bookingFee = Number(priceBreakdown.bookingFee || 0);

  return `
    <div class="mt-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
      <div class="text-xs font-semibold text-slate-300 mb-2">تفاصيل الطلب</div>

      <div class="grid gap-2 sm:grid-cols-2 text-xs text-slate-200">
        <div class="rounded-xl bg-black/20 px-3 py-2">
          <span class="text-slate-400">نوع الرحلة:</span>
          <div class="mt-1 font-semibold text-white">${tripTypeLabel}</div>
        </div>

        <div class="rounded-xl bg-black/20 px-3 py-2">
          <span class="text-slate-400">عدد الركاب:</span>
          <div class="mt-1 font-semibold text-white">${passengerCount}</div>
        </div>

        <div class="rounded-xl bg-black/20 px-3 py-2">
          <span class="text-slate-400">الشنط / الحمولة:</span>
          <div class="mt-1 font-semibold text-white">${luggageLabel}</div>
        </div>

        <div class="rounded-xl bg-black/20 px-3 py-2">
          <span class="text-slate-400">السعر الإجمالي:</span>
          <div class="mt-1 font-semibold text-white">${Number(t.price || 0)} جنيه</div>
        </div>

        ${
          waitingMinutes > 0
            ? `
              <div class="rounded-xl bg-black/20 px-3 py-2">
                <span class="text-slate-400">مدة الانتظار:</span>
                <div class="mt-1 font-semibold text-white">${waitingMinutes} دقيقة</div>
              </div>
            `
            : ""
        }

        ${
          returnDate
            ? `
              <div class="rounded-xl bg-black/20 px-3 py-2">
                <span class="text-slate-400">تاريخ العودة:</span>
                <div class="mt-1 font-semibold text-white">${escapeHtml(returnDate)}</div>
              </div>
            `
            : ""
        }
      </div>

      <div class="mt-3 rounded-xl bg-black/20 px-3 py-3">
        <div class="text-[11px] font-semibold text-slate-400 mb-2">تفصيل السعر</div>
        <div class="grid gap-1 text-xs text-slate-200">
          ${oneWayFare ? `<div>سعر الذهاب الأساسي: <span class="font-semibold text-white">${oneWayFare} جنيه</span></div>` : ""}
          ${luggageFee ? `<div>رسوم الشنط / الحمولة: <span class="font-semibold text-white">${luggageFee} جنيه</span></div>` : ""}
          ${extraPassengerFee ? `<div>رسوم ركاب إضافيين: <span class="font-semibold text-white">${extraPassengerFee} جنيه</span></div>` : ""}
          ${waitingFee ? `<div>رسوم الانتظار: <span class="font-semibold text-white">${waitingFee} جنيه</span></div>` : ""}
          ${bookingFee ? `<div>رسوم حجز / تنسيق العودة: <span class="font-semibold text-white">${bookingFee} جنيه</span></div>` : ""}
          ${
            (t.tripType === "return_other_day" || t.tripType === "round_diff_days")
              ? `<div class="text-amber-300">سعر رحلة العودة النهائي يُحسب عند يوم الرجوع.</div>`
              : ""
          }
        </div>
      </div>

      ${
        tripNotes
          ? `
            <div class="mt-3 rounded-xl bg-black/20 px-3 py-3">
              <div class="text-[11px] font-semibold text-slate-400 mb-1">ملاحظات الراكب</div>
              <div class="text-xs text-white break-words">${escapeHtml(tripNotes)}</div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

async function loadPendingTripsForDriver(driverId) {
  const list = document.getElementById("tripsList");
  if (!list) return;

  list.innerHTML = `<div class="text-xs text-slate-400">جارٍ تحميل الطلبات...</div>`;
  const driverRef = doc(db, "users", driverId);
const driverSnap = await getDoc(driverRef);

if (!driverSnap.exists()) {
  list.innerHTML = `<div class="text-xs text-slate-400">تعذر العثور على بيانات السائق.</div>`;
  return;
}

const driverData = driverSnap.data();
const driverLocation = driverData.location;

if (
  !driverLocation ||
  typeof driverLocation.lat !== "number" ||
  typeof driverLocation.lng !== "number"
) {
  list.innerHTML = `<div class="text-xs text-slate-400">حدّث موقعك أولًا لعرض الرحلات القريبة منك.</div>`;
  return;
}

  // ⚠️ للـMVP: هنجيب آخر 20 رحلة pending
  const q = query(
    collection(db, "trips"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  const snap = await getDocs(q);

if (snap.empty) {
  list.innerHTML = `<div class="text-xs text-slate-400">مفيش طلبات حالياً.</div>`;
  return;
}

list.innerHTML = "";

const nearbyTrips = [];

snap.forEach((docSnap) => {
  const t = docSnap.data();

  const pickupLat = Number(t.pickupLat);
  const pickupLng = Number(t.pickupLng);

  const hasPickupLat = Number.isFinite(pickupLat);
  const hasPickupLng = Number.isFinite(pickupLng);

  if (hasPickupLat && hasPickupLng) {
    const kmFromDriver = distanceKm(
      { lat: Number(driverLocation.lat), lng: Number(driverLocation.lng) },
      { lat: pickupLat, lng: pickupLng }
    );

    if (kmFromDriver <= 15) {
      nearbyTrips.push({
        id: docSnap.id,
        ...t,
        pickupLat,
        pickupLng,
        kmFromDriver: Number(kmFromDriver.toFixed(1)),
        distancePriority: kmFromDriver <= 8 ? 1 : 2
      });
    }
  } else {
    nearbyTrips.push({
      id: docSnap.id,
      ...t,
      kmFromDriver: null,
      distancePriority: 3
    });
  }
});

nearbyTrips.sort((a, b) => {
  const p1 = a.distancePriority ?? 99;
  const p2 = b.distancePriority ?? 99;

  if (p1 !== p2) return p1 - p2;

  const d1 = a.kmFromDriver ?? 9999;
  const d2 = b.kmFromDriver ?? 9999;

  return d1 - d2;
});

if (nearbyTrips.length === 0) {
  list.innerHTML = `<div class="text-xs text-slate-400">لا توجد رحلات قريبة منك حاليًا.</div>`;
  return;
}

nearbyTrips.forEach((t) => {
  const id = t.id;
  

    const card = document.createElement("div");
    card.className = "rounded-2xl bg-white/5 ring-1 ring-white/10 p-4";

    card.innerHTML = `
  <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">

    <div class="min-w-0">
      <div class="text-sm font-semibold break-all">
        ${escapeHtml(t.pickup)} → ${escapeHtml(t.dropoff)}
      </div>

      <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300 break-words">
        ${statusBadge(t.status || "pending")}
        <span>السعر: <b>${t.price}</b> جنيه</span>
        ${t.kmEstimated ? `<span>المسافة التقديرية: <b>${t.kmEstimated}</b> كم</span>` : ""}
        ${t.kmFromDriver ? `<span>يبعد عنك: <b>${t.kmFromDriver}</b> كم</span>` : ""}
      </div>
    </div>

    <button data-trip="${id}"
      class="acceptBtn shrink-0 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2">
      قبول الرحلة
    </button>
  </div>

  ${renderDriverTripDetailsHtml(t)}

  <div class="mt-3 rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black/20">
    <div class="miniMap" id="map_${id}" style="height: 180px;"></div>
  </div>

  <div class="mt-2 text-[11px] text-slate-400 break-all">Trip: ${id}</div>
`;

    list.appendChild(card);
    renderMiniMap(`map_${id}`, t);
  });

// =======================
// Disable accept if not verified
// =======================
const privateRef = doc(db, "users_private", driverId);
const privateSnap = await getDoc(privateRef);

let verificationStatus = "not_submitted";

if (privateSnap.exists()) {
  verificationStatus = privateSnap.data().verificationStatus || "not_submitted";
}

if (verificationStatus !== "approved") {
  list.querySelectorAll(".acceptBtn").forEach((btn) => {
    btn.disabled = true;

    btn.classList.remove("bg-emerald-500/90", "hover:bg-emerald-500");
    btn.classList.add("bg-gray-500", "cursor-not-allowed");

    btn.textContent = "الحساب غير موثق";
  });
}
  
  // bind accept buttons
  list.querySelectorAll(".acceptBtn").forEach((btn) => {
  if (!currentDriverVerification.ok) {
    btn.setAttribute("disabled", "true");
    btn.classList.add("opacity-50", "cursor-not-allowed");
    btn.textContent = "غير متاح";
  }

  btn.addEventListener("click", async () => {
    if (!currentDriverVerification.ok) {
      showAlert("لا يمكنك قبول الرحلات قبل استكمال بيانات السائق وصلاحية المستندات.", "error");
      return;
    }

    const tripId = btn.getAttribute("data-trip");
    if (!tripId) return;

    // ⭐ فحص توثيق السائق قبل قبول الرحلة
const privateRef = doc(db,"users_private",driverId);
const privateSnap = await getDoc(privateRef);

let verificationStatus="not_submitted";

if(privateSnap.exists()){
verificationStatus = privateSnap.data().verificationStatus || "not_submitted";
}

if(verificationStatus !== "approved"){

showAlert("لا يمكنك قبول الرحلات قبل توثيق الحساب.","error");

return;

}
    
    btn.setAttribute("disabled", "true");
    btn.textContent = "جارٍ القبول...";

    try {
      await acceptTrip(driverId, tripId);
      btn.textContent = "تم ✅";
      await loadPendingTripsForDriver(driverId);
    } catch (e) {
      console.error(e);
      btn.removeAttribute("disabled");
      btn.textContent = "قبول";
      showAlert("فشل قبول الرحلة. ممكن تكون اتقبلت من سائق تاني.", "error");
    }
  });
});
}


async function acceptTrip(driverId, tripId) {
  const tripRef = doc(db, "trips", tripId);

  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) {
    throw new Error("Trip not found");
  }

  const tripData = tripSnap.data();
  const riderId = tripData.riderId || null;

  await updateDoc(tripRef, {
    status: "accepted",
    driverId,
    acceptedAt: serverTimestamp(),
    cancelRequestedBy: null,
    cancelRequestedAt: null,
    cancelledAt: null,
    completedAt: null
  });

  await updateDoc(doc(db, "users", driverId), {
    activeTripId: tripId
  });

try {
  const driverUserRef = doc(db, "users", driverId);
  const driverSnap = await getDoc(driverUserRef);
  const currentTripsCount = driverSnap.exists() ? Number(driverSnap.data().tripsCount || 0) : 0;

  await updateDoc(driverUserRef, {
    tripsCount: currentTripsCount + 1
  });
} catch (e) {
  console.error("update driver tripsCount error:", e);
}
  
  if (riderId) {
    await updateDoc(doc(db, "users", riderId), {
      activeTripId: tripId
    });
  }
}


async function clearActiveTripForTrip(tripId) {
  if (!tripId) return;

  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);

  if (!tripSnap.exists()) return;

  const tripData = tripSnap.data();

  if (tripData.riderId) {
    await updateDoc(doc(db, "users", tripData.riderId), {
      activeTripId: null
    });
  }

  if (tripData.driverId) {
    await updateDoc(doc(db, "users", tripData.driverId), {
      activeTripId: null
    });
  }
}


function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncateUrl(url, max = 40) {
  const s = String(url || "");
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\s+/g, "").replace(/[^\d+]/g, "");
}

function isValidEgyptPhone(phone) {
  const p = String(phone || "").trim();
  return /^01\d{9}$/.test(p);
}

function isValidNationalId(nationalId) {
  const n = String(nationalId || "").trim();
  return /^\d{14}$/.test(n);
}

function isStrongPassword(password) {
  const p = String(password || "");
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(p);
}

function getPasswordError(password) {
  const p = String(password || "");

  if (p.length < 8) {
    return "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
  }
  if (!/[a-z]/.test(p)) {
    return "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل.";
  }
  if (!/[A-Z]/.test(p)) {
    return "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل.";
  }
  if (!/\d/.test(p)) {
    return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.";
  }
  if (!/[^A-Za-z0-9]/.test(p)) {
    return "كلمة المرور يجب أن تحتوي على رمز واحد على الأقل مثل @ أو #.";
  }

  return "";
}

function phoneForWhatsApp(phone) {
  const p = normalizePhone(phone);

  if (p.startsWith("+")) return p.replace("+", "");
  if (p.startsWith("0")) return "2" + p; // مصر
  if (p.startsWith("20")) return p;

  return p;
}

function statusBadge(status) {
  const map = {
    pending: {
      label: "Pending",
      cls: "inline-flex items-center gap-2 rounded-full bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30 px-2 py-1"
    },
    accepted: {
      label: "Accepted",
      cls: "inline-flex items-center gap-2 rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 px-2 py-1"
    },
    cancel_requested: {
      label: "Cancel Requested",
      cls: "inline-flex items-center gap-2 rounded-full bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30 px-2 py-1"
    },
    cancelled: {
      label: "Cancelled",
      cls: "inline-flex items-center gap-2 rounded-full bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30 px-2 py-1"
    },
    completed: {
      label: "Completed",
      cls: "inline-flex items-center gap-2 rounded-full bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30 px-2 py-1"
    }
  };

  const item = map[status] || {
    label: status || "Unknown",
    cls: "inline-flex items-center gap-2 rounded-full bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30 px-2 py-1"
  };

  return `
    <span class="${item.cls}">
      <span class="h-2 w-2 rounded-full bg-current inline-block"></span>
      <span>${item.label}</span>
    </span>
  `;
}

function highlightRatingButtons(buttonSelector, selectedValue) {
  document.querySelectorAll(buttonSelector).forEach((btn) => {
    const score = Number(btn.getAttribute("data-score"));
    btn.classList.remove("bg-indigo-500", "text-slate-950", "font-semibold");
    btn.classList.add("bg-white/10");

    if (score === selectedValue) {
      btn.classList.remove("bg-white/10");
      btn.classList.add("bg-indigo-500", "text-slate-950", "font-semibold");
    }
  });
}

function initRatingWidgets() {
  if (ratingWidgetsInitialized) return;
  ratingWidgetsInitialized = true;

  document.querySelectorAll(".riderStarBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedRiderRating = Number(btn.getAttribute("data-score")) || 0;
      highlightRatingButtons(".riderStarBtn", selectedRiderRating);
    });
  });

  document.querySelectorAll(".driverStarBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedDriverRating = Number(btn.getAttribute("data-score")) || 0;
      highlightRatingButtons(".driverStarBtn", selectedDriverRating);
    });
  });
}

async function submitTripRating(tripId, byRole, score) {
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);

  if (!tripSnap.exists()) {
    throw new Error("Trip not found");
  }

  const trip = tripSnap.data();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  if (trip.status !== "completed") {
    throw new Error("Trip is not completed yet");
  }

  let ratingDocId = "";
  let targetUid = "";

  if (byRole === "rider") {
    if (trip.riderId !== currentUser.uid) throw new Error("Unauthorized");
    ratingDocId = `${tripId}_rider`;
    targetUid = trip.driverId || "";
  } else if (byRole === "driver") {
    if (trip.driverId !== currentUser.uid) throw new Error("Unauthorized");
    ratingDocId = `${tripId}_driver`;
    targetUid = trip.riderId || "";
  } else {
    throw new Error("Invalid role");
  }

  const ratingRef = doc(db, "trip_ratings", ratingDocId);
  const ratingSnap = await getDoc(ratingRef);

  if (ratingSnap.exists()) {
    throw new Error("Already rated");
  }

  await setDoc(ratingRef, {
    tripId,
    byRole,
    raterUid: currentUser.uid,
    targetUid,
    score,
    createdAt: serverTimestamp()
  });

  if (targetUid) {
    const targetUserRef = doc(db, "users", targetUid);
    const targetUserSnap = await getDoc(targetUserRef);

    if (targetUserSnap.exists()) {
      const targetUserData = targetUserSnap.data();
      const oldAvg = Number(targetUserData.ratingAvg || 0);
      const oldCount = Number(targetUserData.ratingCount || 0);

      const newCount = oldCount + 1;
      const newAvg = ((oldAvg * oldCount) + Number(score)) / newCount;

      await updateDoc(targetUserRef, {
        ratingAvg: Number(newAvg.toFixed(2)),
        ratingCount: newCount
      });
    }
  }
}

async function getUserAverageRating(uid) {
  if (!uid) return { avg: 0, count: 0 };

  try {
    const userSnap = await getDoc(doc(db, "users", uid));

    if (!userSnap.exists()) {
      return { avg: 0, count: 0 };
    }

    const userData = userSnap.data();

    return {
      avg: Number(userData.ratingAvg || 0).toFixed(1),
      count: Number(userData.ratingCount || 0)
    };
  } catch (e) {
    console.error(e);
    return { avg: 0, count: 0 };
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return null;

  const today = new Date();
  const target = new Date(dateStr);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffMs = target - today;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function evaluateDriverVerification(profile, privateData) {
  const issues = [];

  // بيانات عامة
  if (!profile?.name) issues.push("اسم السائق غير مكتمل.");
  if (!profile?.phone) issues.push("رقم موبايل السائق غير مكتمل.");
  if (!profile?.carPlate) issues.push("رقم العربية غير مكتمل.");
  if (!profile?.carModel) issues.push("نوع العربية غير مكتمل.");
  if (!profile?.carColor) issues.push("لون العربية غير مكتمل.");

  // بيانات خاصة
  if (!privateData?.nationalId) issues.push("رقم البطاقة غير مكتمل.");
  if (!privateData?.nationalIdExpiry) issues.push("تاريخ انتهاء البطاقة غير مكتمل.");
  if (!privateData?.driverLicenseNumber) issues.push("بيانات رخصة القيادة غير مكتملة.");
  if (!privateData?.driverLicenseExpiry) issues.push("تاريخ انتهاء رخصة القيادة غير مكتمل.");
  if (!privateData?.vehicleLicenseNumber) issues.push("بيانات رخصة السيارة غير مكتملة.");
  if (!privateData?.vehicleLicenseExpiry) issues.push("تاريخ انتهاء رخصة السيارة غير مكتمل.");

  // فحص التواريخ
  const nationalIdDays = daysUntil(privateData?.nationalIdExpiry);
  const driverLicenseDays = daysUntil(privateData?.driverLicenseExpiry);
  const vehicleLicenseDays = daysUntil(privateData?.vehicleLicenseExpiry);

  if (nationalIdDays !== null && nationalIdDays < 0) {
    issues.push("البطاقة الشخصية منتهية.");
  } else if (nationalIdDays !== null && nationalIdDays <= 30) {
    issues.push(`البطاقة الشخصية ستنتهي خلال ${nationalIdDays} يوم.`);
  }

  if (driverLicenseDays !== null && driverLicenseDays < 0) {
    issues.push("رخصة القيادة منتهية.");
  } else if (driverLicenseDays !== null && driverLicenseDays <= 30) {
    issues.push(`رخصة القيادة ستنتهي خلال ${driverLicenseDays} يوم.`);
  }

  if (vehicleLicenseDays !== null && vehicleLicenseDays < 0) {
    issues.push("رخصة السيارة منتهية.");
  } else if (vehicleLicenseDays !== null && vehicleLicenseDays <= 30) {
    issues.push(`رخصة السيارة ستنتهي خلال ${vehicleLicenseDays} يوم.`);
  }

  const isBlocked =
    issues.some(msg =>
      msg.includes("غير مكتمل") ||
      msg.includes("منتهية")
    );

  return {
    ok: !isBlocked,
    issues
  };
}

function renderDriverVerificationUI(result) {
  const box = document.getElementById("driverVerificationBox");
  const msg = document.getElementById("driverVerificationMsg");

  if (!box || !msg) return;

  if (!result || result.ok) {
    box.classList.add("hidden");
    msg.innerHTML = "";
    return;
  }

  box.classList.remove("hidden");
  msg.innerHTML = result.issues.map(item => `<div>• ${escapeHtml(item)}</div>`).join("");
}

async function saveProfile(uid) {
  const nameInput = document.getElementById("profileName");
  const phoneInput = document.getElementById("profilePhone");
  const statusEl = document.getElementById("profileStatus");
  const roleEl = document.getElementById("roleLabel");

  const carPlateInput = document.getElementById("carPlate");
  const carModelInput = document.getElementById("carModel");
  const carColorInput = document.getElementById("carColor");

  const name = nameInput?.value?.trim();
  const phone = phoneInput?.value?.trim();
  const role = roleEl?.textContent?.trim() || "rider";

  if (!name || !phone) {
  if (statusEl) statusEl.textContent = "اكتب الاسم ورقم الموبايل.";
  return;
}

if (!isValidEgyptPhone(phone)) {
  if (statusEl) statusEl.textContent = "رقم الموبايل غير صحيح. يجب أن يكون 11 رقمًا ويبدأ بـ 01.";
  return;
}

  const payload = {
    name,
    phone,
    updatedAt: serverTimestamp()
  };

  if (role === "driver") {
    payload.carPlate = carPlateInput?.value?.trim() || "";
    payload.carModel = carModelInput?.value?.trim() || "";
    payload.carColor = carColorInput?.value?.trim() || "";
  }

  await setDoc(doc(db, "users", uid), payload, { merge: true });

  if (statusEl) statusEl.textContent = "تم حفظ البيانات ✅";
}

async function savePrivateDriverData(uid) {
  const nationalId = document.getElementById("nationalId")?.value?.trim() || "";
  const nationalIdExpiry = document.getElementById("nationalIdExpiry")?.value || "";

  const driverLicenseNumber = document.getElementById("driverLicenseNumber")?.value?.trim() || "";
  const driverLicenseExpiry = document.getElementById("driverLicenseExpiry")?.value || "";

  const vehicleLicenseNumber = document.getElementById("vehicleLicenseNumber")?.value?.trim() || "";
  const vehicleLicenseExpiry = document.getElementById("vehicleLicenseExpiry")?.value || "";

  if (nationalId && !isValidNationalId(nationalId)) {
  showAlert("رقم البطاقة الشخصية يجب أن يكون 14 رقمًا بالضبط.", "error");
  return;
}

if (driverLicenseNumber && !/^[A-Za-z0-9\-\/\s]{4,30}$/.test(driverLicenseNumber)) {
  showAlert("بيانات رخصة القيادة غير صحيحة.", "error");
  return;
}

if (vehicleLicenseNumber && !/^[A-Za-z0-9\-\/\s]{4,30}$/.test(vehicleLicenseNumber)) {
  showAlert("بيانات رخصة السيارة غير صحيحة.", "error");
  return;
}
  
  await setDoc(doc(db, "users_private", uid), {
    nationalId,
    nationalIdExpiry,
    driverLicenseNumber,
    driverLicenseExpiry,
    vehicleLicenseNumber,
    vehicleLicenseExpiry,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function getPrivateDriverData(uid) {
  const ref = doc(db, "users_private", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data();
}

async function submitProfileUpdateRequest(uid, role) {
  const statusEl = document.getElementById("profileUpdateStatus");

  const reason = document.getElementById("profileUpdateReason")?.value?.trim() || "";
  const name = document.getElementById("updateName")?.value?.trim() || "";
  const phone = document.getElementById("updatePhone")?.value?.trim() || "";

  const carPlate = document.getElementById("updateCarPlate")?.value?.trim() || "";
  const carModel = document.getElementById("updateCarModel")?.value?.trim() || "";
  const carColor = document.getElementById("updateCarColor")?.value?.trim() || "";

  const nationalIdUrl = document.getElementById("updateNationalIdUrl")?.value?.trim() || "";
  const driverLicenseUrl = document.getElementById("updateDriverLicenseUrl")?.value?.trim() || "";
  const vehicleLicenseUrl = document.getElementById("updateVehicleLicenseUrl")?.value?.trim() || "";
  const selfieUrl = document.getElementById("updateSelfieUrl")?.value?.trim() || "";

  if (!reason) {
    if (statusEl) statusEl.textContent = "سبب طلب التحديث إجباري.";
    return;
  }

  if (phone && !isValidEgyptPhone(phone)) {
    if (statusEl) statusEl.textContent = "رقم الموبايل الجديد غير صحيح.";
    return;
  }

  const updatedFields = {};
  if (name) updatedFields.name = name;
  if (phone) updatedFields.phone = phone;

  if (role === "driver") {
    if (carPlate) updatedFields.carPlate = carPlate;
    if (carModel) updatedFields.carModel = carModel;
    if (carColor) updatedFields.carColor = carColor;
  }

  const updatedPrivateFields = {};

  const documentsRequired = role === "driver" && isDocumentUpdateReason(reason);

  if (documentsRequired) {
    if (!isDriveUrl(nationalIdUrl) || !isDriveUrl(driverLicenseUrl) || !isDriveUrl(vehicleLicenseUrl) || !isDriveUrl(selfieUrl)) {
      if (statusEl) statusEl.textContent = "بسبب نوع التعديل، يجب إدخال روابط Google Drive الجديدة للمستندات.";
      return;
    }

    updatedPrivateFields.nationalIdImage = nationalIdUrl;
    updatedPrivateFields.driverLicenseImage = driverLicenseUrl;
    updatedPrivateFields.vehicleLicenseImage = vehicleLicenseUrl;
    updatedPrivateFields.selfieImage = selfieUrl;
  }

  if (Object.keys(updatedFields).length === 0 && Object.keys(updatedPrivateFields).length === 0) {
    if (statusEl) statusEl.textContent = "أدخل على الأقل بيانًا واحدًا تريد تعديله.";
    return;
  }

  await addDoc(collection(db, "profile_update_requests"), {
    uid,
    role,
    requestStatus: "pending",
    requestType: documentsRequired ? "documents_update" : "profile_update",
    reason,
    updatedFields,
    updatedPrivateFields,
    createdAt: serverTimestamp()
  });

  if (statusEl) statusEl.textContent = "تم إرسال طلب التحديث للمراجعة ✅";
}

async function loadMyLatestProfileUpdateRequest(uid) {
  const stateBox = document.getElementById("profileUpdateStateBox");
const stateDot = document.getElementById("profileUpdateStateDot");
const stateDotWrap = document.getElementById("profileUpdateStateDotWrap");
const stateBadge = document.getElementById("profileUpdateStateBadge");
const stateTitle = document.getElementById("profileUpdateStateTitle");
const stateText = document.getElementById("profileUpdateStateText");
const stateReason = document.getElementById("profileUpdateStateReason");

  const form = document.getElementById("profileUpdateForm");
  const toggleBtn = document.getElementById("toggleProfileUpdateBtn");

  if (!stateBox || !form || !toggleBtn) return;

  try {
    const q = query(
      collection(db, "profile_update_requests"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const snap = await getDocs(q);

        // reset
    stateBox.classList.add("hidden");
    stateReason?.classList.add("hidden");

    if (stateDot) {
      stateDot.classList.remove("bg-yellow-400", "bg-emerald-400", "bg-rose-400", "bg-slate-400");
    }

    if (stateDotWrap) {
      stateDotWrap.className = "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/15 ring-1 ring-yellow-500/20";
    }

    if (stateBadge) {
      stateBadge.className = "inline-flex items-center gap-2 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-300 ring-1 ring-yellow-500/25";
      stateBadge.innerHTML = `<span class="h-2 w-2 rounded-full bg-current"></span><span>قيد المراجعة</span>`;
    }

    // لو لا يوجد أي طلبات سابقة
    if (snap.empty) {
      form.classList.add("hidden");
      toggleBtn.textContent = "فتح النموذج";
      return;
    }

    const docSnap = snap.docs[0];
    const req = docSnap.data();
    const status = req.requestStatus || "pending";
    const reason = req.adminResponse || "";

    stateBox.classList.remove("hidden");

        if (status === "pending") {
      if (stateDot) stateDot.classList.add("bg-yellow-400");
      if (stateBadge) {
        stateBadge.className = "inline-flex items-center gap-2 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-300 ring-1 ring-yellow-500/25";
        stateBadge.innerHTML = `<span class="h-2 w-2 rounded-full bg-current"></span><span>قيد المراجعة</span>`;
      }
      if (stateTitle) stateTitle.textContent = "طلب التحديث قيد المراجعة";
      if (stateText) stateText.textContent = "تم استلام طلب التحديث. يرجى الانتظار حتى 48 ساعة لمراجعته.";
      form.classList.add("hidden");
      toggleBtn.textContent = "قيد المراجعة";
      toggleBtn.disabled = true;
      toggleBtn.classList.add("opacity-50", "cursor-not-allowed");
      return;
    }

        if (status === "approved") {
      if (stateDot) stateDot.classList.add("bg-emerald-400");
      if (stateDotWrap) {
        stateDotWrap.className = "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/20";
      }
      if (stateBadge) {
        stateBadge.className = "inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/25";
        stateBadge.innerHTML = `<span class="h-2 w-2 rounded-full bg-current"></span><span>تمت الموافقة</span>`;
      }
      if (stateTitle) stateTitle.textContent = "تمت الموافقة على طلب التحديث";
      if (stateText) stateText.textContent = "تم اعتماد طلبك. يمكنك الآن إرسال طلب جديد عند الحاجة.";
      form.classList.add("hidden");
      toggleBtn.textContent = "فتح النموذج";
      toggleBtn.disabled = false;
      toggleBtn.classList.remove("opacity-50", "cursor-not-allowed");
      return;
    }

        if (status === "rejected") {
      if (stateDot) stateDot.classList.add("bg-rose-400");
      if (stateDotWrap) {
        stateDotWrap.className = "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-500/20";
      }
      if (stateBadge) {
        stateBadge.className = "inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/25";
        stateBadge.innerHTML = `<span class="h-2 w-2 rounded-full bg-current"></span><span>مرفوض</span>`;
      }
      if (stateTitle) stateTitle.textContent = "تم رفض طلب التحديث";
      if (stateText) stateText.textContent = "يمكنك تعديل البيانات وإرسال طلب جديد.";
      if (reason && stateReason) {
        stateReason.classList.remove("hidden");
        stateReason.textContent = `سبب الرفض: ${reason}`;
      }
      form.classList.add("hidden");
      toggleBtn.textContent = "إعادة الإرسال";
      toggleBtn.disabled = false;
      toggleBtn.classList.remove("opacity-50", "cursor-not-allowed");
      return;
    }

  } catch (e) {
    console.error(e);
  }
}

async function updateDriverLocation(uid) {
  const statusEl = document.getElementById("driverLocationStatus");

  if (!navigator.geolocation) {
    if (statusEl) statusEl.textContent = "المتصفح لا يدعم تحديد الموقع.";
    return;
  }

  try {
    const location = await getCurrentBrowserLocation();

    const lat = Number(location.lat);
    const lng = Number(location.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      if (statusEl) statusEl.textContent = "تعذر تحديد موقعك الحالي.";
      return;
    }

    await setDoc(doc(db, "users", uid), {
      location: {
        lat,
        lng,
        updatedAt: Date.now()
      }
    }, { merge: true });

    if (statusEl) {
      statusEl.textContent = `تم تحديث موقعك: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    if (typeof map !== "undefined" && map) {
      map.setView([lat, lng], 15);
    }

    return { lat, lng };
  } catch (e) {
    console.error(e);
    if (statusEl) statusEl.textContent = "تعذر تحديث الموقع. تأكد من إذن الموقع وحاول مرة أخرى.";
  }
}

function renderMiniMap(containerId, trip) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const pickupLat = Number(trip.pickupLat);
  const pickupLng = Number(trip.pickupLng);
  const dropoffLat = Number(trip.dropoffLat);
  const dropoffLng = Number(trip.dropoffLng);

  const hasPickup = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);
  const hasDropoff = Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng);

  if (!hasPickup || !hasDropoff) {
    el.innerHTML = `
      <div class="flex h-full items-center justify-center text-xs text-slate-400 p-4">
        لا توجد إحداثيات للخريطة.
      </div>
    `;
    return;
  }

  const miniMap = L.map(containerId, {
    zoomControl: false,
    attributionControl: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(miniMap);

  const pickup = [pickupLat, pickupLng];
  const dropoff = [dropoffLat, dropoffLng];

  L.marker(pickup).addTo(miniMap);
  L.marker(dropoff).addTo(miniMap);

  const line = L.polyline([pickup, dropoff], {
    weight: 4,
    opacity: 0.8
  }).addTo(miniMap);

  miniMap.fitBounds(line.getBounds(), { padding: [20, 20] });

  setTimeout(() => {
    miniMap.invalidateSize();
    miniMap.fitBounds(line.getBounds(), { padding: [20, 20] });
  }, 150);
}

function clearDriverLiveTracking() {
  const box = document.getElementById("riderLiveTrackingBox");
  const statusEl = document.getElementById("riderLiveTrackingStatus");
  const distanceInfoEl = document.getElementById("riderLiveDistanceInfo");
  const etaInfoEl = document.getElementById("riderLiveEtaInfo");


  if (box) box.classList.add("hidden");
  if (statusEl) statusEl.textContent = "في انتظار تحديث الموقع...";
  if (distanceInfoEl) distanceInfoEl.textContent = "—";
  if (etaInfoEl) etaInfoEl.textContent = "—";

  if (riderLiveMap) {
    riderLiveMap.remove();
    riderLiveMap = null;
    riderLiveDriverMarker = null;
    riderLivePickupMarker = null;
    riderLiveDropoffMarker = null;
    lastTrackedTripId = null;
  }
}

function renderOrUpdateRiderLiveMap(trip, driverLocation) {
  const box = document.getElementById("riderLiveTrackingBox");
  const statusEl = document.getElementById("riderLiveTrackingStatus");
  const distanceInfoEl = document.getElementById("riderLiveDistanceInfo");
  const mapEl = document.getElementById("riderLiveMap");
  const etaInfoEl = document.getElementById("riderLiveEtaInfo");


  if (!box || !mapEl) return;

  const pickupLat = Number(trip.pickupLat);
  const pickupLng = Number(trip.pickupLng);
  const dropoffLat = Number(trip.dropoffLat);
  const dropoffLng = Number(trip.dropoffLng);
  const driverLat = Number(driverLocation?.lat);
  const driverLng = Number(driverLocation?.lng);

  const hasPickup = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);
  const hasDropoff = Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng);
  const hasDriver = Number.isFinite(driverLat) && Number.isFinite(driverLng);

  if (!hasPickup || !hasDropoff || !hasDriver) {
  box.classList.remove("hidden");
  if (statusEl) statusEl.textContent = "تعذر عرض التتبع الحي حاليًا.";
  if (distanceInfoEl) distanceInfoEl.textContent = "المسافة التقريبية غير متاحة.";
  if (etaInfoEl) etaInfoEl.textContent = "الزمن التقريبي غير متاح.";
  return;
}
  box.classList.remove("hidden");

  if (!riderLiveMap || lastTrackedTripId !== trip.id) {
    if (riderLiveMap) {
      riderLiveMap.remove();
      riderLiveMap = null;
    }

    riderLiveMap = L.map("riderLiveMap", {
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(riderLiveMap);

    riderLivePickupMarker = L.marker([pickupLat, pickupLng]).addTo(riderLiveMap);
    riderLiveDropoffMarker = L.marker([dropoffLat, dropoffLng]).addTo(riderLiveMap);
    riderLiveDriverMarker = L.marker([driverLat, driverLng]).addTo(riderLiveMap);

    lastTrackedTripId = trip.id;
  } else {
    riderLivePickupMarker?.setLatLng([pickupLat, pickupLng]);
    riderLiveDropoffMarker?.setLatLng([dropoffLat, dropoffLng]);
    riderLiveDriverMarker?.setLatLng([driverLat, driverLng]);
  }

  const bounds = L.latLngBounds([
    [pickupLat, pickupLng],
    [dropoffLat, dropoffLng],
    [driverLat, driverLng]
  ]);

  riderLiveMap.fitBounds(bounds, { padding: [30, 30] });

  setTimeout(() => {
    riderLiveMap?.invalidateSize();
  }, 100);

    const kmToPickup = distanceKm(
    { lat: driverLat, lng: driverLng },
    { lat: pickupLat, lng: pickupLng }
  );

  if (distanceInfoEl) {
    distanceInfoEl.textContent = `السائق يبعد تقريبًا ${Number(kmToPickup).toFixed(1)} كم عن مكان الالتقاء.`;
  }

// تقدير زمني مبسط داخل المدن: متوسط 28 كم/س
  const averageCitySpeedKmH = 28;
  const etaMinutes = Math.max(1, Math.round((kmToPickup / averageCitySpeedKmH) * 60));

  if (etaInfoEl) {
    etaInfoEl.textContent = `الوصول المتوقع خلال ${etaMinutes} دقيقة تقريبًا.`;
  }
  
  if (statusEl) {
    statusEl.textContent = `آخر تحديث: ${new Date().toLocaleTimeString("ar-EG")}`;
  }
}

function getLiveTripDriverPath(tripId, driverId) {
  return `liveTrips/${tripId}/drivers/${driverId}`;
}

function stopDriverLiveLocationSharingRTDB() {
  if (driverLiveLocationWatchId !== null) {
    navigator.geolocation.clearWatch(driverLiveLocationWatchId);
    driverLiveLocationWatchId = null;
  }

  driverLiveCurrentTripId = null;
  driverLiveLastSentAt = 0;
  driverLiveLastCoords = null;
}

async function clearDriverLiveLocationRTDB(tripId, driverId) {
  if (!tripId || !driverId) return;

  try {
    await rtdbRemove(rtdbRef(rtdb, getLiveTripDriverPath(tripId, driverId)));
  } catch (e) {
    console.error("clearDriverLiveLocationRTDB error:", e);
  }
}

async function startDriverLiveLocationSharingRTDB(driverId, tripId) {
  if (!navigator.geolocation || !driverId || !tripId) return;

  // لو نفس الرحلة شغالة بالفعل لا تعيد تشغيل watcher
  if (driverLiveLocationWatchId !== null && driverLiveCurrentTripId === tripId) {
    return;
  }

  stopDriverLiveLocationSharingRTDB();

  driverLiveCurrentTripId = tripId;
  driverLiveLastSentAt = 0;
  driverLiveLastCoords = null;

  driverLiveLocationWatchId = navigator.geolocation.watchPosition(
    async (pos) => {
      try {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        lastKnownBrowserLocation = { lat, lng };
lastKnownBrowserLocationAt = Date.now();
      
        const now = Date.now();

        // ابعت كل 30 ثانية كحد أدنى
        const minIntervalMs = 30000;

        let movedEnough = true;
        if (driverLiveLastCoords) {
          const movedKm = distanceKm(
            { lat: driverLiveLastCoords.lat, lng: driverLiveLastCoords.lng },
            { lat, lng }
          );
          movedEnough = movedKm >= 0.1; // 100 متر
        }

        const enoughTimePassed = (now - driverLiveLastSentAt) >= minIntervalMs;

        // لا تكتب إلا لو مرّ وقت كفاية أو تحرّك فعلاً
        if (!enoughTimePassed && !movedEnough) {
          return;
        }

        const payload = {
          lat,
          lng,
          updatedAt: now
        };

        await rtdbSet(
          rtdbRef(rtdb, getLiveTripDriverPath(tripId, driverId)),
          payload
        );

        driverLiveLastSentAt = now;
        driverLiveLastCoords = { lat, lng };
      } catch (e) {
        console.error("startDriverLiveLocationSharingRTDB error:", e);
      }
    },
    (err) => {
  console.warn("Driver RTDB watchPosition warning:", err);

  // لا توقف الرحلة ولا تكسر التتبع كله بسبب timeout أو unavailable مؤقت
  if (err?.code === 1) {
    // permission denied
    console.warn("Driver denied geolocation permission.");
  }
},

    {
  enableHighAccuracy: false,
  maximumAge: 30000,
  timeout: 30000
}

  );
}

function clearRiderLiveTrackingUI() {
  const box = document.getElementById("riderLiveTrackingBox");
  const statusEl = document.getElementById("riderLiveTrackingStatus");
  const distanceInfoEl = document.getElementById("riderLiveDistanceInfo");
  const etaInfoEl = document.getElementById("riderLiveEtaInfo");

  if (box) box.classList.add("hidden");
  if (statusEl) statusEl.textContent = "في انتظار تحديث الموقع...";
  if (distanceInfoEl) distanceInfoEl.textContent = "—";
  if (etaInfoEl) etaInfoEl.textContent = "—";

  if (unsubscribeRiderLiveLocation) {
    unsubscribeRiderLiveLocation();
    unsubscribeRiderLiveLocation = null;
  }

  if (riderLiveMap) {
    riderLiveMap.remove();
    riderLiveMap = null;
    riderLiveDriverMarker = null;
    riderLivePickupMarker = null;
    riderLiveDropoffMarker = null;
    riderLivePolyline = null;
    riderLiveCurrentTripId = null;
  }
}

function renderOrUpdateRiderLiveMapFromRTDB(trip, driverLocation) {
  const box = document.getElementById("riderLiveTrackingBox");
  const statusEl = document.getElementById("riderLiveTrackingStatus");
  const distanceInfoEl = document.getElementById("riderLiveDistanceInfo");
  const etaInfoEl = document.getElementById("riderLiveEtaInfo");
  const mapEl = document.getElementById("riderLiveMap");

  if (!box || !mapEl) return;

  const pickupLat = Number(trip.pickupLat);
  const pickupLng = Number(trip.pickupLng);
  const dropoffLat = Number(trip.dropoffLat);
  const dropoffLng = Number(trip.dropoffLng);
  const driverLat = Number(driverLocation?.lat);
  const driverLng = Number(driverLocation?.lng);

  const hasPickup = Number.isFinite(pickupLat) && Number.isFinite(pickupLng);
  const hasDropoff = Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng);
  const hasDriver = Number.isFinite(driverLat) && Number.isFinite(driverLng);

  box.classList.remove("hidden");

  if (!hasPickup || !hasDropoff || !hasDriver) {
    if (statusEl) statusEl.textContent = "تعذر عرض التتبع الحي حاليًا.";
    if (distanceInfoEl) distanceInfoEl.textContent = "المسافة التقريبية غير متاحة.";
    if (etaInfoEl) etaInfoEl.textContent = "الزمن التقريبي غير متاح.";
    return;
  }

  if (!riderLiveMap || riderLiveCurrentTripId !== trip.id) {
    if (riderLiveMap) {
      riderLiveMap.remove();
      riderLiveMap = null;
    }

    riderLiveMap = L.map("riderLiveMap", {
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(riderLiveMap);

    riderLivePickupMarker = L.marker([pickupLat, pickupLng]).addTo(riderLiveMap);
    riderLiveDropoffMarker = L.marker([dropoffLat, dropoffLng]).addTo(riderLiveMap);
    riderLiveDriverMarker = L.marker([driverLat, driverLng]).addTo(riderLiveMap);

    riderLivePolyline = L.polyline(
      [
        [driverLat, driverLng],
        [pickupLat, pickupLng],
        [dropoffLat, dropoffLng]
      ],
      { weight: 4, opacity: 0.8 }
    ).addTo(riderLiveMap);

    riderLiveCurrentTripId = trip.id;
  } else {
    riderLivePickupMarker?.setLatLng([pickupLat, pickupLng]);
    riderLiveDropoffMarker?.setLatLng([dropoffLat, dropoffLng]);
    riderLiveDriverMarker?.setLatLng([driverLat, driverLng]);

    riderLivePolyline?.setLatLngs([
      [driverLat, driverLng],
      [pickupLat, pickupLng],
      [dropoffLat, dropoffLng]
    ]);
  }

  const bounds = L.latLngBounds([
    [pickupLat, pickupLng],
    [dropoffLat, dropoffLng],
    [driverLat, driverLng]
  ]);

  riderLiveMap.fitBounds(bounds, { padding: [30, 30] });

  setTimeout(() => {
    riderLiveMap?.invalidateSize();
  }, 100);

  const kmToPickup = distanceKm(
    { lat: driverLat, lng: driverLng },
    { lat: pickupLat, lng: pickupLng }
  );

  if (distanceInfoEl) {
    distanceInfoEl.textContent = `السائق يبعد تقريبًا ${Number(kmToPickup).toFixed(1)} كم عن مكان الالتقاء.`;
  }

  const averageCitySpeedKmH = 28;
  const etaMinutes = Math.max(1, Math.round((kmToPickup / averageCitySpeedKmH) * 60));

  if (etaInfoEl) {
    etaInfoEl.textContent = `الوصول المتوقع خلال ${etaMinutes} دقيقة تقريبًا.`;
  }

  if (statusEl) {
    const updatedAt = driverLocation?.updatedAt ? new Date(driverLocation.updatedAt) : new Date();
    statusEl.textContent = `آخر تحديث: ${updatedAt.toLocaleTimeString("ar-EG")}`;
  }
}

function listenToDriverLiveLocationRTDB(trip) {
  if (!trip?.id || !trip?.driverId) {
    clearRiderLiveTrackingUI();
    return;
  }

  if (unsubscribeRiderLiveLocation) {
    unsubscribeRiderLiveLocation();
    unsubscribeRiderLiveLocation = null;
  }

  const locationRef = rtdbRef(rtdb, getLiveTripDriverPath(trip.id, trip.driverId));

  unsubscribeRiderLiveLocation = onValue(locationRef, (snap) => {
    const data = snap.val();

    if (!data) {
      clearRiderLiveTrackingUI();
      return;
    }

    renderOrUpdateRiderLiveMapFromRTDB(trip, data);
  }, (err) => {
    console.error("listenToDriverLiveLocationRTDB error:", err);
    clearRiderLiveTrackingUI();
  });
}


async function startDriverLiveLocationSharing(driverId, tripId) {
  return;
}

function stopDriverLiveLocationSharing() {
  if (driverLocationWatcherId !== null) {
    navigator.geolocation.clearWatch(driverLocationWatcherId);
    driverLocationWatcherId = null;
  }

  driverLiveSharingTripId = null;
  driverLiveLastSentAt = 0;
  driverLiveLastCoords = null;
}



// ================= Map + Search + Pricing (Rider) =================

function formatCoordsText(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return "";
  return `${latNum.toFixed(6)}, ${lngNum.toFixed(6)}`;
}

function buildReadableAddress(displayName = "", lat = null, lng = null) {
  const raw = String(displayName || "").trim();
  const coords = formatCoordsText(lat, lng);

  if (!raw) {
    return coords || "مكان غير محدد";
  }

  const parts = raw.split(",").map(s => s.trim()).filter(Boolean);

  // نأخذ أهم 4 أجزاء على الأكثر
  const picked = parts.slice(0, 4);

  let result = picked.join(" - ");

  if (coords) {
    result += ` (${coords})`;
  }

  return result;
}

async function reverseGeocode(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return {
      shortText: "مكان غير محدد",
      fullText: "",
      coordsText: ""
    };
  }

  const coordsText = formatCoordsText(latNum, lngNum);

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(latNum)}` +
      `&lon=${encodeURIComponent(lngNum)}` +
      `&accept-language=ar`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      return {
        shortText: coordsText,
        fullText: coordsText,
        coordsText
      };
    }

    const data = await res.json();
    const displayName = String(data?.display_name || "").trim();

    return {
      shortText: buildReadableAddress(displayName, latNum, lngNum),
      fullText: displayName || coordsText,
      coordsText
    };
  } catch (e) {
    console.error("reverseGeocode error:", e);
    return {
      shortText: coordsText,
      fullText: coordsText,
      coordsText
    };
  }
}

function getGoogleMapsDirectionsUrl({ origin, pickup, destination }) {
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving"
  });

  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }

  if (pickup && Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng)) {
    if (origin) {
      params.set("waypoints", `${pickup.lat},${pickup.lng}`);
    } else {
      params.set("origin", `${pickup.lat},${pickup.lng}`);
    }
  }

  if (destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lng)) {
    params.set("destination", `${destination.lat},${destination.lng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function getCurrentBrowserLocation(options = {}) {
  const maxFreshMs = options.maxFreshMs ?? 30000;

  // لو عندنا موقع حديث خلال آخر 30 ثانية، استخدمه فورًا
  if (
    lastKnownBrowserLocation &&
    (Date.now() - lastKnownBrowserLocationAt) <= maxFreshMs
  ) {
    return Promise.resolve(lastKnownBrowserLocation);
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location = {
          lat: Number(pos.coords.latitude),
          lng: Number(pos.coords.longitude)
        };

        lastKnownBrowserLocation = location;
        lastKnownBrowserLocationAt = Date.now();

        resolve(location);
      },
      (err) => reject(err),
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000
      }
    );
  });
}


async function openTripNavigation(trip) {
  const pickup = {
    lat: Number(trip.pickupLat),
    lng: Number(trip.pickupLng)
  };

  const destination = {
    lat: Number(trip.dropoffLat),
    lng: Number(trip.dropoffLng)
  };

  if (
    !Number.isFinite(pickup.lat) || !Number.isFinite(pickup.lng) ||
    !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)
  ) {
    showAlert("إحداثيات الرحلة غير مكتملة، لا يمكن فتح الملاحة.", "error");
    return;
  }

  try {
const origin = await getCurrentBrowserLocation({ maxFreshMs: 120000 });

    const url = getGoogleMapsDirectionsUrl({
      origin,
      pickup,
      destination
    });

    window.open(url, "_blank", "noopener,noreferrer");
  } catch (e) {
    console.error("Navigation location fallback:", e);

    const url = getGoogleMapsDirectionsUrl({
      origin: null,
      pickup,
      destination
    });

    window.open(url, "_blank", "noopener,noreferrer");

    showAlert("تم فتح الملاحة بدون موقعك الحالي لأن صلاحية الموقع غير متاحة.", "error");
  }
}


let map, pickupMarker, dropoffMarker;
let pickupLatLng = null, dropoffLatLng = null;
let selecting = "pickup"; // pickup | dropoff

function initMapOnce() {
  if (map) return;

  const mapDiv = document.getElementById("map");
  if (!mapDiv || typeof L === "undefined") return;

  map = L.map("map").setView([30.0444, 31.2357], 12); // Cairo default
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  map.on("click", async (e) => {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  const place = await reverseGeocode(lat, lng);

  if (selecting === "pickup") {
    setPickup(lat, lng, place.shortText, place.fullText);
    selecting = "dropoff";
  } else {
    setDropoff(lat, lng, place.shortText, place.fullText);
    selecting = "pickup";
  }

  updatePickModeLabel();
});

  updatePickModeLabel();
  updateMetrics();
}

function updatePickModeLabel() {
  const el = document.getElementById("pickMode");
  if (!el) return;
  el.textContent = selecting === "pickup" ? "اختيار: Pickup" : "اختيار: Dropoff";
}

function shortPlaceName(fullText = "", lat = null, lng = null) {
  const raw = String(fullText || "").trim();

  if (!raw) {
    return "مكان غير محدد";
  }

  const parts = raw.split(",").map(s => s.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]} - ${parts[1]}`;
  }

  return raw;
}

function normalizeLatLngInput(a, b, c, d) {
  // الشكل 1: setPickup({lat, lng}, label, fullAddress)
  if (a && typeof a === "object" && "lat" in a && "lng" in a) {
    return {
      lat: Number(a.lat),
      lng: Number(a.lng),
      label: typeof b === "string" ? b : "",
      fullAddress: typeof c === "string" ? c : ""
    };
  }

  // الشكل 2: setPickup(lat, lng, label, fullAddress)
  return {
    lat: Number(a),
    lng: Number(b),
    label: typeof c === "string" ? c : "",
    fullAddress: typeof d === "string" ? d : ""
  };
}

function setPickup(latlngOrLat, lngOrLabel = null, label = "", fullAddress = "") {
  let lat, lng, labelText, fullText;

  if (typeof latlngOrLat === "object" && latlngOrLat !== null) {
    lat = Number(latlngOrLat.lat);
    lng = Number(latlngOrLat.lng);
    labelText = typeof lngOrLabel === "string" ? lngOrLabel : "";
    fullText = typeof label === "string" ? label : "";
  } else {
    lat = Number(latlngOrLat);
    lng = Number(lngOrLabel);
    labelText = typeof label === "string" ? label : "";
    fullText = typeof fullAddress === "string" ? fullAddress : "";
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error("setPickup invalid lat/lng", latlngOrLat, lngOrLabel, label, fullAddress);
    return;
  }

  pickupLatLng = { lat, lng };

  const pickupInput = document.getElementById("pickupSearch");
  const pickupMapsInput = document.getElementById("pickupMapsInput");

  const shortText = buildReadableAddress(labelText || fullText, lat, lng);
  const fullTextFinal = String(fullText || labelText || "").trim() || formatCoordsText(lat, lng);

  if (pickupInput) pickupInput.value = shortText;
  if (pickupMapsInput) pickupMapsInput.value = fullTextFinal;

  window.pickupLatLng = { lat: Number(lat), lng: Number(lng) };
  window.currentPickupAddress = shortText;
  window.currentPickupFullAddress = fullTextFinal;

  if (pickupMarker) {
    pickupMarker.setLatLng([lat, lng]);
  } else if (typeof L !== "undefined" && map) {
    pickupMarker = L.marker([lat, lng]).addTo(map);
  }

  updateMetrics();
}

function setDropoff(latlngOrLat, lngOrLabel = null, label = "", fullAddress = "") {
  let lat, lng, labelText, fullText;

  if (typeof latlngOrLat === "object" && latlngOrLat !== null) {
    lat = Number(latlngOrLat.lat);
    lng = Number(latlngOrLat.lng);
    labelText = typeof lngOrLabel === "string" ? lngOrLabel : "";
    fullText = typeof label === "string" ? label : "";
  } else {
    lat = Number(latlngOrLat);
    lng = Number(lngOrLabel);
    labelText = typeof label === "string" ? label : "";
    fullText = typeof fullAddress === "string" ? fullAddress : "";
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.error("setDropoff invalid lat/lng", latlngOrLat, lngOrLabel, label, fullAddress);
    return;
  }

  dropoffLatLng = { lat, lng };

  const dropoffInput = document.getElementById("dropoffSearch");
  const dropoffMapsInput = document.getElementById("dropoffMapsInput");

  const shortText = buildReadableAddress(labelText || fullText, lat, lng);
  const fullTextFinal = String(fullText || labelText || "").trim() || formatCoordsText(lat, lng);

  if (dropoffInput) dropoffInput.value = shortText;
  if (dropoffMapsInput) dropoffMapsInput.value = fullTextFinal;

  window.dropoffLatLng = { lat: Number(lat), lng: Number(lng) };
  window.currentDropoffAddress = shortText;
  window.currentDropoffFullAddress = fullTextFinal;

  if (dropoffMarker) {
    dropoffMarker.setLatLng([lat, lng]);
  } else if (typeof L !== "undefined" && map) {
    dropoffMarker = L.marker([lat, lng]).addTo(map);
  }

  updateMetrics();
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(s));
}

function roundTo(x, step) {
  return Math.round(x / step) * step;
}


function distanceKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(s));
}


window.currentKmRoad = 0;
window.currentRouteMinutes = 0;


function openMapsHelperModal(target) {
  currentMapsTarget = target;

  const modal = document.getElementById("mapsHelperModal");
  const title = document.getElementById("mapsHelperTitle");
  const input = document.getElementById("mapsHelperInput");

  if (title) {
    title.textContent = target === "pickup"
      ? "تحديد مكان الركوب من Google Maps"
      : "تحديد الوجهة من Google Maps";
  }

  // املأ المودال بالقيمة الحالية لو موجودة
  if (input) {
    if (target === "pickup") {
      input.value = document.getElementById("pickupMapsInput")?.value || "";
    } else {
      input.value = document.getElementById("dropoffMapsInput")?.value || "";
    }
  }

  modal?.classList.remove("hidden");
  modal?.classList.add("flex");
}

function closeMapsHelperModal() {
  const modal = document.getElementById("mapsHelperModal");
  modal?.classList.add("hidden");
  modal?.classList.remove("flex");
}

function parseLatLngFromText(raw) {
  const text = String(raw || "").trim();

  // helper: يحاول تصحيح ترتيب الإحداثيات لمصر لو كانت معكوسة
  function normalizeEgyptCoords(a, b) {
    let lat = Number(a);
    let lng = Number(b);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    // لو مكتوبة صح أصلًا: lat ~ 22..32 و lng ~ 24..37
    const looksLikeEgyptLatLng =
      lat >= 20 && lat <= 33 &&
      lng >= 24 && lng <= 37;

    if (looksLikeEgyptLatLng) {
      return { lat, lng };
    }

    // لو مكتوبة بالعكس: lng,lat
    const looksLikeEgyptLngLat =
      lng >= 20 && lng <= 33 &&
      lat >= 24 && lat <= 37;

    if (looksLikeEgyptLngLat) {
      return { lat: lng, lng: lat };
    }

    // fallback: خليه كما هو
    return { lat, lng };
  }

  // حالة نص مباشر "x,y"
  let match = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (match) {
    return normalizeEgyptCoords(match[1], match[2]);
  }

  // حالة Google Maps URL فيها @lat,lng
  match = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (match) {
    return normalizeEgyptCoords(match[1], match[2]);
  }

  // حالة q=lat,lng أو ll=lat,lng
  match = text.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (match) {
    return normalizeEgyptCoords(match[1], match[2]);
  }

  return null;
}

function formatLatLngLabel(latlng) {
  return `${Number(latlng.lat).toFixed(6)}, ${Number(latlng.lng).toFixed(6)}`;
}

let currentMapsTarget = "pickup"; // pickup | dropoff


// ---------- Search (Nominatim) ----------
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

async function nominatimSearch(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&accept-language=ar`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

function renderSuggestions(container, items, onPick) {
  if (!container) return;
  if (!items || items.length === 0) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  container.classList.remove("hidden");
  container.innerHTML = items
    .map((it, idx) => `
      <button data-idx="${idx}" class="w-full text-right px-4 py-3 text-sm hover:bg-white/5 border-b border-white/10 last:border-b-0">
        ${escapeHtml(it.display_name)}
      </button>
    `)
    .join("");

  container.querySelectorAll("button[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-idx"));
      onPick(items[idx]);
      container.classList.add("hidden");
      container.innerHTML = "";
    });
  });
}

const pickupSug = document.getElementById("pickupSug");
const dropoffSug = document.getElementById("dropoffSug");

const onPickupInput = debounce(async () => {
  const q = document.getElementById("pickupSearch")?.value?.trim();
  if (!q || q.length < 3) return renderSuggestions(pickupSug, [], () => {});
  try {
    const items = await nominatimSearch(q);
    renderSuggestions(pickupSug, items, (it) => {
      initMapOnce();
      setPickup({ lat: Number(it.lat), lng: Number(it.lon) }, it.display_name);
    });
  } catch (e) {
    console.error(e);
  }
}, 450);

const onDropoffInput = debounce(async () => {
  const q = document.getElementById("dropoffSearch")?.value?.trim();
  if (!q || q.length < 3) return renderSuggestions(dropoffSug, [], () => {});
  try {
    const items = await nominatimSearch(q);
    renderSuggestions(dropoffSug, items, (it) => {
      initMapOnce();
      setDropoff({ lat: Number(it.lat), lng: Number(it.lon) }, it.display_name);
    });
  } catch (e) {
    console.error(e);
  }
}, 450);

document.getElementById("pickupSearch")?.addEventListener("input", onPickupInput);
document.getElementById("dropoffSearch")?.addEventListener("input", onDropoffInput);

// Hide suggestions on outside click
document.addEventListener("click", (e) => {
  const pWrap = document.getElementById("pickupSearch");
  const dWrap = document.getElementById("dropoffSearch");
  if (pickupSug && pWrap && !pickupSug.contains(e.target) && e.target !== pWrap) pickupSug.classList.add("hidden");
  if (dropoffSug && dWrap && !dropoffSug.contains(e.target) && e.target !== dWrap) dropoffSug.classList.add("hidden");
});

// My Location
document.getElementById("useMyLocationBtn")?.addEventListener("click", async () => {
  initMapOnce();
  if (!navigator.geolocation) return showAlert("المتصفح لا يدعم تحديد الموقع.", "error");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const latlng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPickup(latlng, "موقعي الحالي");
      showAlert("تم تحديد موقعك كنقطة ركوب ✅", "success");
    },
    () => showAlert("لم نتمكن من الحصول على موقعك. تأكد من السماح بالـLocation.", "error"),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ========== Rider Realtime: watch latest trip ==========
let currentDriverVerification = { ok: true, issues: [] };
let selectedRiderRating = 0;
let selectedDriverRating = 0;
let ratingWidgetsInitialized = false;
let unsubscribeMyTrip = null;
let unsubscribeMyComplaints = null;
let adminUsersCurrentTab = "all";
let adminUsersLoaded = false;
let adminUsersSearchDebounceTimer = null;
let adminUsersPageSize = 30;
let adminUsersCurrentPage = 1;
let adminUsersAllDocsCache = [];
let complaintFormUiInitialized = false;
const complaintTripOptionsCache = {};
let unsubscribeRiderTripDoc = null;


window.currentKmRoad = 0;
window.currentRouteMinutes = 0;

function watchMyLatestTrip(riderId) {
  const info = document.getElementById("myTripInfo");
  const cancelBtn = document.getElementById("cancelTripBtn");
  const requestBtn = document.getElementById("requestCancelBtn");
  const createTripBtn = document.getElementById("createTripBtn");
  const riderRatingBox = document.getElementById("riderRatingBox");
  const navBtn = document.getElementById("openRiderNavigationBtn");
  const riderRatingStatus = document.getElementById("riderRatingStatus");
  const submitRiderRatingBtn = document.getElementById("submitRiderRatingBtn");

  if (unsubscribeMyTrip) unsubscribeMyTrip();
  if (unsubscribeRiderTripDoc) {
    unsubscribeRiderTripDoc();
    unsubscribeRiderTripDoc = null;
  }

  const resetEmptyState = () => {
    if (info) info.textContent = "لا يوجد طلب حاليًا.";
    cancelBtn?.classList.add("hidden");
    requestBtn?.classList.add("hidden");
    riderRatingBox?.classList.add("hidden");
    navBtn?.classList.add("hidden");
    clearRiderLiveTrackingUI();

    if (createTripBtn) {
      createTripBtn.disabled = false;
      createTripBtn.classList.remove("opacity-50", "cursor-not-allowed");
      createTripBtn.textContent = "إرسال الطلب";
    }
  };

  const renderTripDoc = async (docSnap) => {
    const t = docSnap.data();
    const tripId = docSnap.id;

    const status = t.status || "pending";
    const shouldShowLiveTrackingRTDB = ["accepted", "cancel_requested", "waiting_return"].includes(status);
    const canNavigate = ["accepted", "cancel_requested", "waiting_return"].includes(status);
    const isActiveTrip = ["pending", "accepted", "cancel_requested", "waiting_return"].includes(status);
    const priceTxt = t.price ? `السعر: ${t.price} جنيه` : "السعر غير محدد";

    let driverTxt = "";
    if (t.driverId) {
      try {
        const driverRef = doc(db, "users", t.driverId);
        const driverSnap = await getDoc(driverRef);

        if (driverSnap.exists()) {
          const d = driverSnap.data();

          const name = d.name ? escapeHtml(d.name) : "سائق";
          const phone = d.phone ? normalizePhone(d.phone) : "";
          const waPhone = d.phone ? phoneForWhatsApp(d.phone) : "";

          const carPlate = d.carPlate ? escapeHtml(d.carPlate) : "";
          const carModel = d.carModel ? escapeHtml(d.carModel) : "";
          const carColor = d.carColor ? escapeHtml(d.carColor) : "";
          const driverRating = await getUserAverageRating(t.driverId);

          const phoneHtml = phone
            ? `
              <a class="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20"
                 href="tel:${phone}">
                <span>📞</span>
                <span>${phone}</span>
              </a>
            `
            : "";

          const waHtml = waPhone
            ? `
              <a class="inline-flex items-center gap-2 rounded-2xl bg-green-500/15 px-3 py-2 text-xs font-semibold text-green-300 ring-1 ring-green-500/20 hover:bg-green-500/20"
                 target="_blank"
                 href="https://wa.me/${waPhone}">
                <span>💬</span>
                <span>واتساب</span>
              </a>
            `
            : "";

          const carModelHtml = carModel
            ? `<span class="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-white/10">🚐 ${carModel}</span>`
            : "";

          const carColorHtml = carColor
            ? `<span class="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-200 ring-1 ring-white/10">🎨 ${carColor}</span>`
            : "";

          const plateHtml = carPlate
            ? `
              <div class="inline-flex min-w-[120px] items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold tracking-wide text-slate-900 shadow-sm">
                ${carPlate}
              </div>
            `
            : "";

          driverTxt = `
            <div class="mt-3 rounded-3xl bg-white/5 ring-1 ring-white/10 p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-white">بيانات السائق</div>
                  <div class="mt-1 text-xs text-slate-300 break-all">${name}</div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/20">
                    <span>⭐</span>
                    <span>${driverRating.avg || 0} / 5</span>
                    <span class="text-slate-400">(${driverRating.count})</span>
                  </span>

                  <span class="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
                    <span class="h-2 w-2 rounded-full bg-current"></span>
                    <span>تم قبول الرحلة</span>
                  </span>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                ${phoneHtml}
                ${waHtml}
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-2">
                ${carModelHtml}
                ${carColorHtml}
              </div>

              ${
                plateHtml
                  ? `
                    <div class="mt-4">
                      <div class="mb-2 text-[11px] font-semibold text-slate-400">لوحة السيارة</div>
                      ${plateHtml}
                    </div>
                  `
                  : ""
              }
            </div>
          `;
        } else {
          driverTxt = `
            <div class="mt-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 text-xs text-slate-300 break-all">
              تعذر تحميل بيانات السائق.
            </div>
          `;
        }
      } catch (e) {
        console.error(e);
        driverTxt = `
          <div class="mt-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 text-xs text-slate-300 break-all">
            تعذر تحميل بيانات السائق.
          </div>
        `;
      }
    }

    if (info) {
  info.innerHTML = `
    <div class="flex flex-wrap items-center gap-2">
      ${statusBadge(status)}
    </div>

    <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
      <div class="text-xs text-slate-400">خط الرحلة</div>
      <div class="mt-1 text-sm font-semibold text-white break-all">
        ${escapeHtml(t.pickup)} → ${escapeHtml(t.dropoff)}
      </div>
      <div class="mt-2 text-xs text-slate-300">
        ${priceTxt}
      </div>
    </div>

    <div class="mt-3 rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black/20">
      <div class="miniMap" id="rider_trip_map_${tripId}" style="height: 180px;"></div>
    </div>

    ${driverTxt}
  `;

  setTimeout(() => {
    renderMiniMap(`rider_trip_map_${tripId}`, t);
  }, 50);
}

    if (shouldShowLiveTrackingRTDB && t.driverId) {
      listenToDriverLiveLocationRTDB({ id: tripId, ...t });
    } else {
      clearRiderLiveTrackingUI();
    }

    navBtn?.classList.add("hidden");
    if (canNavigate) {
      navBtn?.classList.remove("hidden");
      navBtn?.setAttribute("data-trip", tripId);
    }

    if (createTripBtn) {
      if (isActiveTrip) {
        createTripBtn.disabled = true;
        createTripBtn.classList.add("opacity-50", "cursor-not-allowed");
        createTripBtn.textContent = "لديك طلب نشط";
      } else {
        createTripBtn.disabled = false;
        createTripBtn.classList.remove("opacity-50", "cursor-not-allowed");
        createTripBtn.textContent = "إرسال الطلب";
      }
    }

    if (status === "pending") {
      cancelBtn?.classList.remove("hidden");
      requestBtn?.classList.add("hidden");
    } else if (status === "accepted") {
      cancelBtn?.classList.add("hidden");
      requestBtn?.classList.remove("hidden");
    } else {
      cancelBtn?.classList.add("hidden");
      requestBtn?.classList.add("hidden");
    }

    cancelBtn?.setAttribute("data-trip", tripId);
    requestBtn?.setAttribute("data-trip", tripId);

    riderRatingBox?.classList.add("hidden");
    if (riderRatingStatus) riderRatingStatus.textContent = "";
    submitRiderRatingBtn?.setAttribute("data-trip", tripId);

    if (status === "completed") {
      riderRatingBox?.classList.remove("hidden");

      try {
        const ratingRef = doc(db, "trip_ratings", `${tripId}_rider`);
        const ratingSnap = await getDoc(ratingRef);

        if (ratingSnap.exists()) {
          const ratingData = ratingSnap.data();
          if (riderRatingStatus) {
            riderRatingStatus.textContent = `تم إرسال تقييمك للسائق ✅ (${ratingData.score || "-"}/5)`;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const userRef = doc(db, "users", riderId);

  unsubscribeMyTrip = onSnapshot(userRef, async (userSnap) => {
    try {
      if (!userSnap.exists()) {
        if (unsubscribeRiderTripDoc) {
          unsubscribeRiderTripDoc();
          unsubscribeRiderTripDoc = null;
        }
        resetEmptyState();
        return;
      }

      const userData = userSnap.data();
      const activeTripId = userData.activeTripId || null;

      if (!activeTripId) {
        if (unsubscribeRiderTripDoc) {
          unsubscribeRiderTripDoc();
          unsubscribeRiderTripDoc = null;
        }

        const latestTripQuery = query(
          collection(db, "trips"),
          where("riderId", "==", riderId),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const latestTripSnap = await getDocs(latestTripQuery);

        if (latestTripSnap.empty) {
          resetEmptyState();
          return;
        }

        await renderTripDoc(latestTripSnap.docs[0]);
        return;
      }

      if (unsubscribeRiderTripDoc) {
        unsubscribeRiderTripDoc();
        unsubscribeRiderTripDoc = null;
      }

      const tripRef = doc(db, "trips", activeTripId);

      unsubscribeRiderTripDoc = onSnapshot(tripRef, async (tripSnap) => {
        if (!tripSnap.exists()) {
          try {
            await updateDoc(doc(db, "users", riderId), {
              activeTripId: null
            });
          } catch (e) {
            console.warn("Failed to clear rider activeTripId:", e);
          }
          resetEmptyState();
          return;
        }

        await renderTripDoc(tripSnap);
      }, async (err) => {
        console.warn("Trip listener error:", err);

        try {
          await updateDoc(doc(db, "users", riderId), {
            activeTripId: null
          });
        } catch (e) {
          console.warn("Failed to clear rider activeTripId after listener error:", e);
        }

        resetEmptyState();
      });
    } catch (err) {
      console.error(err);
      showAlert("مشكلة في متابعة الرحلة الحالية (Realtime).", "error");
    }
  }, (err) => {
    console.error(err);
    showAlert("مشكلة في متابعة الرحلة الحالية (Realtime).", "error");
  });
}

// ========== Driver Realtime: watch current trip ==========
let unsubscribeDriverTrip = null;
let unsubscribeDriverTripDoc = null;
let driverLocationWatcherId = null;
let riderLiveMap = null;
let driverLiveSharingTripId = null;
let driverLiveLastSentAt = 0;
let driverLiveLastCoords = null;
let lastKnownBrowserLocation = null;
let lastKnownBrowserLocationAt = 0;
let riderLiveDriverMarker = null;
let riderLivePickupMarker = null;
let riderLiveDropoffMarker = null;
let lastTrackedTripId = null;

let unsubscribeAdminComplaints = null;

let unsubscribeRiderLiveLocation = null;

let driverLiveLocationWatchId = null;
let driverLiveCurrentTripId = null;
let riderLivePolyline = null;
let riderLiveCurrentTripId = null;

// هنعتبر "الرحلة الحالية" هي آخر رحلة للسائق ليست completed/cancelled
function watchDriverCurrentTrip(driverId) {
  const info = document.getElementById("driverTripInfo");
  const approveBtn = document.getElementById("approveCancelBtn");
  const completeBtn = document.getElementById("completeTripBtn");
  const startBtn = document.getElementById("startTripBtn");
  const navBtn = document.getElementById("openDriverNavigationBtn");
  const driverRatingBox = document.getElementById("driverRatingBox");
  const driverRatingStatus = document.getElementById("driverRatingStatus");
  const submitDriverRatingBtn = document.getElementById("submitDriverRatingBtn");

  if (unsubscribeDriverTrip) unsubscribeDriverTrip();
  if (unsubscribeDriverTripDoc) {
    unsubscribeDriverTripDoc();
    unsubscribeDriverTripDoc = null;
  }

  const resetDriverState = () => {
    if (info) info.textContent = "لا توجد رحلة حالية.";
    approveBtn?.classList.add("hidden");
    completeBtn?.classList.add("hidden");
    startBtn?.classList.add("hidden");
    driverRatingBox?.classList.add("hidden");
    navBtn?.classList.add("hidden");
    stopDriverLiveLocationSharingRTDB();
  };

  const renderDriverTripDoc = async (tripSnap) => {
    const tripId = tripSnap.id;
    const t = tripSnap.data();

    const status = t.status || "accepted";
    const shouldShareDriverLocationRTDB = ["accepted", "cancel_requested", "waiting_return"].includes(status);
    const canNavigate = ["accepted", "cancel_requested", "waiting_return"].includes(status);
    const priceTxt = t.price ? `${t.price} جنيه` : "غير محدد";
    const kmTxt = t.kmEstimated ? `${t.kmEstimated} كم` : "غير محدد";

    let riderTxt = "";
    if (t.riderId) {
      try {
        const riderRef = doc(db, "users", t.riderId);
        const riderSnap = await getDoc(riderRef);

        if (riderSnap.exists()) {
          const r = riderSnap.data();

          const name = r.name ? escapeHtml(r.name) : "راكب";
          const phone = r.phone ? normalizePhone(r.phone) : "";
          const waPhone = r.phone ? phoneForWhatsApp(r.phone) : "";
          const riderRating = await getUserAverageRating(t.riderId);

          const phoneHtml = phone
            ? `
              <a class="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20"
                 href="tel:${phone}">
                <span>📞</span>
                <span>${phone}</span>
              </a>
            `
            : "";

          const waHtml = waPhone
            ? `
              <a class="inline-flex items-center gap-2 rounded-2xl bg-green-500/15 px-3 py-2 text-xs font-semibold text-green-300 ring-1 ring-green-500/20 hover:bg-green-500/20"
                 target="_blank"
                 href="https://wa.me/${waPhone}">
                <span>💬</span>
                <span>واتساب</span>
              </a>
            `
            : "";

          riderTxt = `
            <div class="mt-3 rounded-3xl bg-white/5 ring-1 ring-white/10 p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-white">بيانات الراكب</div>
                  <div class="mt-1 text-xs text-slate-300 break-all">${name}</div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/20">
                    <span>⭐</span>
                    <span>${riderRating.avg || 0} / 5</span>
                    <span class="text-slate-400">(${riderRating.count})</span>
                  </span>

                  <span class="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
                    <span class="h-2 w-2 rounded-full bg-current"></span>
                    <span>${status === "completed" ? "رحلة مكتملة" : "رحلتك الحالية"}</span>
                  </span>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                ${phoneHtml}
                ${waHtml}
              </div>
            </div>
          `;
        } else {
          riderTxt = `
            <div class="mt-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 text-xs text-slate-300 break-all">
              تعذر تحميل بيانات الراكب.
            </div>
          `;
        }
      } catch (e) {
        console.error(e);
        riderTxt = `
          <div class="mt-3 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 text-xs text-slate-300 break-all">
            تعذر تحميل بيانات الراكب.
          </div>
        `;
      }
    }

   if (info) {
  info.innerHTML = `
    <div class="flex flex-wrap items-center gap-2">
      ${statusBadge(status)}
    </div>

    <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
      <div class="text-xs text-slate-400">خط الرحلة</div>
      <div class="mt-1 text-sm font-semibold text-white break-all">
        ${escapeHtml(t.pickup)} → ${escapeHtml(t.dropoff)}
      </div>
      <div class="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
        <span>المسافة: ${kmTxt}</span>
        <span>السعر: ${priceTxt}</span>
      </div>
    </div>

    ${renderDriverTripDetailsHtml(t)}

    <div class="mt-3 rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black/20">
      <div class="miniMap" id="driver_current_trip_map" style="height: 180px;"></div>
    </div>

    ${riderTxt}
  `;

      setTimeout(() => {
        renderMiniMap("driver_current_trip_map", t);
      }, 50);
    }

    if (shouldShareDriverLocationRTDB) {
      if (driverLiveCurrentTripId !== tripId || driverLiveLocationWatchId === null) {
        startDriverLiveLocationSharingRTDB(driverId, tripId);
      }
    } else {
      stopDriverLiveLocationSharingRTDB();
      if (t.driverId) {
        clearDriverLiveLocationRTDB(tripId, t.driverId);
      }
    }

    navBtn?.classList.add("hidden");
    if (canNavigate) {
      navBtn?.classList.remove("hidden");
      navBtn?.setAttribute("data-trip", tripId);
    }

    approveBtn?.classList.add("hidden");
    completeBtn?.classList.add("hidden");
    startBtn?.classList.add("hidden");

    if (status === "cancel_requested") {
      approveBtn?.classList.remove("hidden");
    }

    if (status === "accepted") {
      completeBtn?.classList.remove("hidden");
    }

    approveBtn?.setAttribute("data-trip", tripId);
    completeBtn?.setAttribute("data-trip", tripId);
    startBtn?.setAttribute("data-trip", tripId);

    driverRatingBox?.classList.add("hidden");
    if (driverRatingStatus) driverRatingStatus.textContent = "";
    submitDriverRatingBtn?.setAttribute("data-trip", tripId);

    if (status === "completed") {
      driverRatingBox?.classList.remove("hidden");

      try {
        const ratingRef = doc(db, "trip_ratings", `${tripId}_driver`);
        const ratingSnap = await getDoc(ratingRef);

        if (ratingSnap.exists()) {
          const ratingData = ratingSnap.data();
          if (driverRatingStatus) {
            driverRatingStatus.textContent = `تم إرسال تقييمك للراكب ✅ (${ratingData.score || "-"}/5)`;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const userRef = doc(db, "users", driverId);

  unsubscribeDriverTrip = onSnapshot(userRef, async (userSnap) => {
    try {
      if (!userSnap.exists()) {
        if (unsubscribeDriverTripDoc) {
          unsubscribeDriverTripDoc();
          unsubscribeDriverTripDoc = null;
        }
        resetDriverState();
        return;
      }

      const userData = userSnap.data();
      const activeTripId = userData.activeTripId || null;

      if (!activeTripId) {
        if (unsubscribeDriverTripDoc) {
          unsubscribeDriverTripDoc();
          unsubscribeDriverTripDoc = null;
        }

        // fallback: آخر رحلة للسائق لإظهار completed + rating
        const latestDriverTripQuery = query(
          collection(db, "trips"),
          where("driverId", "==", driverId),
          orderBy("acceptedAt", "desc"),
          limit(1)
        );

        const latestDriverTripSnap = await getDocs(latestDriverTripQuery);

        if (latestDriverTripSnap.empty) {
          resetDriverState();
          return;
        }

        await renderDriverTripDoc(latestDriverTripSnap.docs[0]);
        return;
      }

      if (unsubscribeDriverTripDoc) {
        unsubscribeDriverTripDoc();
        unsubscribeDriverTripDoc = null;
      }

      const tripRef = doc(db, "trips", activeTripId);

      unsubscribeDriverTripDoc = onSnapshot(tripRef, async (tripSnap) => {
        if (!tripSnap.exists()) {
          try {
            await updateDoc(doc(db, "users", driverId), {
              activeTripId: null
            });
          } catch (e) {
            console.warn("Failed to clear driver activeTripId:", e);
          }
          resetDriverState();
          return;
        }

        await renderDriverTripDoc(tripSnap);
      }, async (err) => {
        console.warn("Driver trip listener error:", err);

        try {
          await updateDoc(doc(db, "users", driverId), {
            activeTripId: null
          });
        } catch (e) {
          console.warn("Failed to clear driver activeTripId after listener error:", e);
        }

        resetDriverState();
      });
    } catch (err) {
      console.error(err);
      showAlert("مشكلة في متابعة رحلة السائق الحالية (Realtime).", "error");
    }
  }, (err) => {
    console.error(err);
    showAlert("مشكلة في متابعة رحلة السائق الحالية (Realtime).", "error");
  });
}
// bind rider button
document.getElementById("createTripBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return showAlert("لازم تسجل دخول الأول.", "error");
  try {
    await createTrip(user.uid);
    showAlert("تم إرسال طلب الرحلة ✅", "success");
  } catch (e) {
    console.error(e);
    showAlert("حصل خطأ في إنشاء الرحلة.", "error");
  }
});

// bind driver refresh
document.getElementById("refreshTripsBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return showAlert("لازم تسجل دخول الأول.", "error");
  await loadPendingTripsForDriver(user.uid);
});

document.getElementById("cancelTripBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const btn = document.getElementById("cancelTripBtn");
  const tripId = btn?.getAttribute("data-trip");
  if (!tripId) return;

  try {
    await updateDoc(doc(db, "trips", tripId), {
      status: "cancelled",
      cancelledBy: user.uid,
      cancelledAt: serverTimestamp()
    });

    await clearActiveTripForTrip(tripId);

    const cancelTripSnap = await getDoc(doc(db, "trips", tripId));
    if (cancelTripSnap.exists()) {
      const cancelTripData = cancelTripSnap.data();

      if (cancelTripData.driverId) {
        await clearDriverLiveLocationRTDB(tripId, cancelTripData.driverId);
      }
    }

    showAlert("تم إلغاء الطلب ✅", "success");
  } catch (e) {
    console.error(e);
    showAlert("فشل إلغاء الطلب.", "error");
  }
});


document.getElementById("requestCancelBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const btn = document.getElementById("requestCancelBtn");
  const tripId = btn?.getAttribute("data-trip");
  if (!tripId) return;

  try {
    await updateDoc(doc(db, "trips", tripId), {
      status: "cancel_requested",
      cancelRequestedBy: user.uid,
      cancelRequestedAt: serverTimestamp()
    });
    showAlert("تم إرسال طلب الإلغاء للسائق ✅", "success");
  } catch (e) {
    console.error(e);
    showAlert("فشل إرسال طلب الإلغاء.", "error");
  }
});

// Driver: approve cancel
document.getElementById("approveCancelBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const btn = document.getElementById("approveCancelBtn");
  const tripId = btn?.getAttribute("data-trip");
  if (!tripId) return;

  try {
    await updateDoc(doc(db, "trips", tripId), {
      status: "cancelled",
      cancelledAt: serverTimestamp(),
      cancelledBy: user.uid
    });

    await clearActiveTripForTrip(tripId);

    const cancelTripSnap = await getDoc(doc(db, "trips", tripId));
    if (cancelTripSnap.exists()) {
      const cancelTripData = cancelTripSnap.data();

      if (cancelTripData.driverId) {
        await clearDriverLiveLocationRTDB(tripId, cancelTripData.driverId);
      }
    }

    showAlert("تم إلغاء الرحلة ✅", "success");
  } catch (e) {
    console.error(e);
    showAlert("فشل إلغاء الرحلة.", "error");
  }
});


// Driver: complete trip
document.getElementById("completeTripBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const btn = document.getElementById("completeTripBtn");
  const tripId = btn?.getAttribute("data-trip");
  if (!tripId) return;

  try {
    const tripRef = doc(db, "trips", tripId);
    const tripDocSnap = await getDoc(tripRef);

    if (!tripDocSnap.exists()) {
      showAlert("تعذر العثور على الرحلة.", "error");
      return;
    }

    const tripData = tripDocSnap.data();

    await updateDoc(tripRef, {
      status: "completed",
      completedAt: serverTimestamp(),
      completedBy: user.uid
    });

    await clearActiveTripForTrip(tripId);

    if (tripData.driverId) {
      await clearDriverLiveLocationRTDB(tripId, tripData.driverId);
    }

    showAlert("تم إنهاء الرحلة ✅", "success");
  } catch (e) {
    console.error(e);
    showAlert("فشل إنهاء الرحلة.", "error");
  }
});


document.getElementById("saveProfileBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await saveProfile(user.uid);

    const role = document.getElementById("roleLabel")?.textContent?.trim() || "rider";
    if (role === "driver") {
      await savePrivateDriverData(user.uid);
    }

    showAlert("تم حفظ البيانات ✅", "success");
  } catch (e) {
    console.error(e);
    showAlert("فشل حفظ البيانات.", "error");
  }
}); 

document.getElementById("updateDriverLocationBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDriverLocation(user.uid);
    await loadPendingTripsForDriver(user.uid);
    showAlert("تم تحديث موقع السائق ✅", "success");
  } catch (e) {
    console.error(e);
    showAlert("فشل تحديث موقع السائق.", "error");
  }
});

document.getElementById("openPickupMapsBtn")?.addEventListener("click", () => {
  openMapsHelperModal("pickup");
});

document.getElementById("openDropoffMapsBtn")?.addEventListener("click", () => {
  openMapsHelperModal("dropoff");
});

document.getElementById("applyPickupMapsBtn")?.addEventListener("click", async () => {
  const raw = document.getElementById("pickupMapsInput")?.value?.trim();
  const parsed = parseLatLngFromText(raw);

  if (!parsed) {
    showAlert("تعذر قراءة الموقع. الصق لينك Google Maps أو lat,lng.", "error");
    return;
  }

  initMapOnce();

  const lat = Number(parsed.lat);
  const lng = Number(parsed.lng);

  const place = await reverseGeocode(lat, lng);

  console.log("pickup parsed:", { lat, lng });
  console.log("pickup reverseGeocode:", place);

  setPickup(lat, lng, place.shortText, place.fullText);

  showAlert("تم تحديد مكان الركوب من Google Maps ✅", "success");
});

document.getElementById("applyDropoffMapsBtn")?.addEventListener("click", async () => {
  const raw = document.getElementById("dropoffMapsInput")?.value?.trim();
  const parsed = parseLatLngFromText(raw);

  if (!parsed) {
    showAlert("تعذر قراءة الموقع. الصق لينك Google Maps أو lat,lng.", "error");
    return;
  }

  initMapOnce();

  const lat = Number(parsed.lat);
  const lng = Number(parsed.lng);

  const place = await reverseGeocode(lat, lng);

  console.log("dropoff parsed:", { lat, lng });
  console.log("dropoff reverseGeocode:", place);

  setDropoff(lat, lng, place.shortText, place.fullText);

  showAlert("تم تحديد الوجهة من Google Maps ✅", "success");
});


document.getElementById("closeMapsHelperBtn")?.addEventListener("click", () => {
  closeMapsHelperModal();
});

document.getElementById("openGoogleMapsNowBtn")?.addEventListener("click", () => {
  // best-effort popup; Chrome قد يفتحها tab عادي
  window.open(
    "https://www.google.com/maps",
    "_blank",
    "popup=yes,width=520,height=760"
  );
});

document.getElementById("pasteMapsClipboardBtn")?.addEventListener("click", async () => {
  try {
    const txt = await navigator.clipboard.readText();
    const input = document.getElementById("mapsHelperInput");
    if (input) input.value = txt || "";
  } catch (e) {
    console.error(e);
    showAlert("تعذر القراءة من الحافظة. الصق يدويًا.", "error");
  }
});

document.getElementById("applyMapsHelperBtn")?.addEventListener("click", () => {
  const raw = document.getElementById("mapsHelperInput")?.value?.trim();
  const parsed = parseLatLngFromText(raw);

  if (!parsed) {
    showAlert("تعذر قراءة الموقع. الصق لينك Google Maps أو lat,lng.", "error");
    return;
  }

  initMapOnce();

  const shortLabel = formatLatLngLabel(parsed);

  if (currentMapsTarget === "pickup") {
    setPickup(parsed, shortLabel);

    const input = document.getElementById("pickupMapsInput");
    if (input) input.value = shortLabel;
  } else {
    setDropoff(parsed, shortLabel);

    const input = document.getElementById("dropoffMapsInput");
    if (input) input.value = shortLabel;
  }

  closeMapsHelperModal();
  showAlert("تم تطبيق الموقع من Google Maps ✅", "success");
});

document.getElementById("editProfileBtn")?.addEventListener("click", () => {
  const box = document.getElementById("profileBox");
  if (!box) return;

  box.classList.toggle("hidden");
});

// ===============================
// Driver Verification Wizard System
// ===============================

const driverVerificationSteps = [
  {
    key: "nationalIdUrl",
    title: "الخطوة 1: صورة البطاقة الشخصية",
    desc: `صوّر البطاقة الشخصية بوضوح من الموبايل.
ثم افتح Google Drive وارفع الصورة.
بعد ذلك اضغط:
مشاركة (Share) →
أي شخص لديه الرابط (Anyone with the link) →
مشاهدة فقط (Viewer) →
نسخ الرابط (Copy link)
ثم الصق الرابط هنا.`
  },
  {
    key: "driverLicenseUrl",
    title: "الخطوة 2: رخصة القيادة",
    desc: `صوّر رخصة القيادة بوضوح.
ثم في Google Drive:
مشاركة (Share) →
أي شخص لديه الرابط (Anyone with the link) →
مشاهدة فقط (Viewer) →
نسخ الرابط (Copy link)
ثم الصق الرابط هنا.`
  },
  {
    key: "vehicleLicenseUrl",
    title: "الخطوة 3: رخصة السيارة",
    desc: `صوّر رخصة السيارة بوضوح.
ثم في Google Drive:
مشاركة (Share) →
أي شخص لديه الرابط (Anyone with the link) →
مشاهدة فقط (Viewer) →
نسخ الرابط (Copy link)
ثم الصق الرابط هنا.`
  },
  {
    key: "selfieUrl",
    title: "الخطوة 4: سيلفي مع البطاقة",
    desc: `التقط صورة سيلفي واضحة وأنت تمسك البطاقة.
ثم ارفعها إلى Google Drive.
بعد ذلك اضبط المشاركة على:
Anyone with the link / أي شخص لديه الرابط
واجعلها Viewer / مشاهدة فقط
ثم انسخ الرابط والصقه هنا.`
  },
  {
    key: "carOutsideUrl",
    title: "الخطوة 5: صورة السيارة من الخارج",
    desc: `التقط صورة واضحة للسيارة من الخارج.
يفضل أن تكون السيارة كاملة في الصورة.
ثم ارفع الصورة إلى Google Drive
واجعل المشاركة:
Anyone with the link
Viewer
ثم الصق الرابط هنا.`
  },
  {
    key: "carInsideUrl",
    title: "الخطوة 6: صورة السيارة من الداخل",
    desc: `التقط صورة واضحة للسيارة من الداخل.
ثم ارفع الصورة إلى Google Drive
واضبط المشاركة:
Share → Anyone with the link → Viewer
ثم انسخ الرابط والصقه هنا.`
  }
];

let currentVerificationStep = 0;

function getVerificationWizardEls() {
  return {
    counter: document.getElementById("verificationStepCounter"),
    progress: document.getElementById("verificationProgressBar"),
    title: document.getElementById("verificationStepTitle"),
    desc: document.getElementById("verificationStepDescription"),
    input: document.getElementById("verificationStepInput"),
    msg: document.getElementById("verificationStepMsg"),
    prevBtn: document.getElementById("verificationPrevBtn"),
    nextBtn: document.getElementById("verificationNextBtn"),
    submitBtn: document.getElementById("submitVerificationBtn"),
    openDriveBtn: document.getElementById("verificationOpenDriveBtn")
  };
}

function renderVerificationStep() {
  const els = getVerificationWizardEls();
  const step = driverVerificationSteps[currentVerificationStep];
  if (!step || !els.title) return;

  els.counter.textContent = `${currentVerificationStep + 1} / ${driverVerificationSteps.length}`;
  els.title.textContent = step.title;
  els.desc.textContent = step.desc;

  const percent = ((currentVerificationStep + 1) / driverVerificationSteps.length) * 100;
  els.progress.style.width = `${percent}%`;

  const hiddenInput = document.getElementById(step.key);
  els.input.value = hiddenInput?.value || "";

  els.msg.textContent = "";

  // إظهار/إخفاء الأزرار
  if (currentVerificationStep === 0) {
    els.prevBtn.classList.add("opacity-50", "cursor-not-allowed");
    els.prevBtn.disabled = true;
  } else {
    els.prevBtn.classList.remove("opacity-50", "cursor-not-allowed");
    els.prevBtn.disabled = false;
  }

  if (currentVerificationStep === driverVerificationSteps.length - 1) {
    els.nextBtn.classList.add("hidden");
    els.submitBtn.classList.remove("hidden");
  } else {
    els.nextBtn.classList.remove("hidden");
    els.submitBtn.classList.add("hidden");
  }
}

function storeCurrentVerificationStepValue() {
  const els = getVerificationWizardEls();
  const step = driverVerificationSteps[currentVerificationStep];
  if (!step) return;

  const hiddenInput = document.getElementById(step.key);
  if (hiddenInput) {
    hiddenInput.value = (els.input.value || "").trim();
  }
}

function isDriveUrl(url) {
  return String(url || "").includes("drive.google.com");
}

function isDocumentUpdateReason(reason) {
  const r = String(reason || "").trim();

  return (
    r.includes("بطاقة") ||
    r.includes("البطاقة") ||
    r.includes("رخصة") ||
    r.includes("الرخصة") ||
    r.includes("انتهاء") ||
    r.includes("منتهية") ||
    r.includes("تجديد")
  );
}

function initVerificationWizard() {
  const els = getVerificationWizardEls();
  if (!els.title) return;

  renderVerificationStep();

  els.prevBtn?.addEventListener("click", () => {
    storeCurrentVerificationStepValue();

    if (currentVerificationStep > 0) {
      currentVerificationStep--;
      renderVerificationStep();
    }
  });

  els.nextBtn?.addEventListener("click", () => {
    storeCurrentVerificationStepValue();

    const step = driverVerificationSteps[currentVerificationStep];
    const value = document.getElementById(step.key)?.value?.trim();

    if (!value) {
      els.msg.textContent = "يرجى لصق رابط الصورة أولًا.";
      return;
    }

    if (!isDriveUrl(value)) {
      els.msg.textContent = "الرابط يجب أن يكون من Google Drive.";
      return;
    }

    if (currentVerificationStep < driverVerificationSteps.length - 1) {
      currentVerificationStep++;
      renderVerificationStep();
    }
  });

  els.openDriveBtn?.addEventListener("click", () => {
    window.open("https://drive.google.com", "_blank");
  });

  document.getElementById("verificationPasteBtn")?.addEventListener("click", async () => {
    try {
      const txt = await navigator.clipboard.readText();
      if (els.input) els.input.value = txt || "";
      storeCurrentVerificationStepValue();
      els.msg.textContent = "تم اللصق من الحافظة ✅";
    } catch (e) {
      console.error(e);
      els.msg.textContent = "تعذر اللصق من الحافظة. الصق الرابط يدويًا.";
    }
  });

  els.input?.addEventListener("input", () => {
    storeCurrentVerificationStepValue();
  });
}

document.getElementById("submitVerificationBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) {
    showAlert("يجب تسجيل الدخول أولًا", "error");
    return;
  }

  storeCurrentVerificationStepValue();

  const nationalId = document.getElementById("nationalIdUrl")?.value.trim();
  const driverLicense = document.getElementById("driverLicenseUrl")?.value.trim();
  const vehicleLicense = document.getElementById("vehicleLicenseUrl")?.value.trim();
  const selfie = document.getElementById("selfieUrl")?.value.trim();
  const carOutside = document.getElementById("carOutsideUrl")?.value.trim();
  const carInside = document.getElementById("carInsideUrl")?.value.trim();

  const statusBox = document.getElementById("verificationStatus");

  const urls = [nationalId, driverLicense, vehicleLicense, selfie, carOutside, carInside];

  for (const url of urls) {
    if (!isDriveUrl(url)) {
      if (statusBox) statusBox.textContent = "يرجى إدخال جميع روابط Google Drive بشكل صحيح.";
      return;
    }
  }

  try {
    const ref = doc(db, "users_private", user.uid);

    await setDoc(ref, {
      nationalIdImage: nationalId,
      driverLicenseImage: driverLicense,
      vehicleLicenseImage: vehicleLicense,
      selfieImage: selfie,
      carOutsideImage: carOutside,
      carInsideImage: carInside,
      verificationStatus: "pending",
      submittedAt: serverTimestamp()
    }, { merge: true });

    if (statusBox) {
  statusBox.textContent = "تم إرسال المستندات للمراجعة ✅";
}

currentVerificationStep = 0;
renderVerificationStep();

await loadDriverVerificationState(user.uid);

  } catch (e) {
    console.error(e);

    if (statusBox) {
      statusBox.textContent = "حدث خطأ أثناء إرسال المستندات.";
    }
  }
});

// ============================
// Driver Verification UI
// ============================

async function loadDriverVerificationState(uid) {
  const stateBox = document.getElementById("verificationStateBox");
const title = document.getElementById("verificationStateTitle");
const text = document.getElementById("verificationStateText");
const reason = document.getElementById("verificationStateReason");
const dot = document.getElementById("verificationStateDot");
const dotWrap = document.getElementById("verificationStateDotWrap");
const badge = document.getElementById("verificationStateBadge");
const wizard = document.getElementById("driverVerificationWizard");

  try {
    const ref = doc(db, "users_private", uid);
    const snap = await getDoc(ref);

    let status = "not_submitted";
    let rejectionReason = "";

    if (snap.exists()) {
      const data = snap.data();
      status = data.verificationStatus || "not_submitted";
      rejectionReason = data.rejectionReason || "";
    }

        // reset
    stateBox?.classList.add("hidden");
    reason?.classList.add("hidden");

    if (dot) {
      dot.classList.remove("bg-yellow-400", "bg-emerald-400", "bg-rose-400", "bg-slate-400");
    }

    if (dotWrap) {
      dotWrap.className = "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-yellow-500/15 ring-1 ring-yellow-500/20";
    }

    if (badge) {
      badge.className = "inline-flex items-center gap-2 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-300 ring-1 ring-yellow-500/25";
      badge.innerHTML = `<span class="h-2 w-2 rounded-full bg-current"></span><span>قيد المراجعة</span>`;
    }

    // الحالة 1: لم يتم الإرسال بعد
    if (status === "not_submitted") {
      wizard?.classList.remove("hidden");
      stateBox?.classList.add("hidden");
      return;
    }

    // الحالة 2: قيد المراجعة
        if (status === "pending") {
      wizard?.classList.add("hidden");
      stateBox?.classList.remove("hidden");

      if (dot) dot.classList.add("bg-yellow-400");
      if (badge) {
        badge.className = "inline-flex items-center gap-2 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-300 ring-1 ring-yellow-500/25";
        badge.innerHTML = `<span class="h-2 w-2 rounded-full bg-current"></span><span>قيد المراجعة</span>`;
      }
      if (title) title.textContent = "حسابك قيد المراجعة";
      if (text) text.textContent = "تم استلام المستندات بنجاح. لا يمكنك قبول الرحلات حتى انتهاء المراجعة.";
      return;
    }

    // الحالة 3: موثق
        if (status === "approved") {
      wizard?.classList.add("hidden");
      stateBox?.classList.remove("hidden");

      if (dot) dot.classList.add("bg-emerald-400");
      if (dotWrap) {
        dotWrap.className = "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/20";
      }
      if (badge) {
        badge.className = "inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/25";
        badge.innerHTML = `<span class="h-2 w-2 rounded-full bg-current"></span><span>موثق</span>`;
      }
      if (title) title.textContent = "تم توثيق حسابك";
      if (text) text.textContent = "تم توثيق حساب السائق بنجاح. يمكنك الآن استقبال وقبول الرحلات.";
      return;
    }

    // الحالة 4: مرفوض
        if (status === "rejected") {
      wizard?.classList.remove("hidden");
      stateBox?.classList.remove("hidden");

      if (dot) dot.classList.add("bg-rose-400");
      if (dotWrap) {
        dotWrap.className = "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-500/20";
      }
      if (badge) {
        badge.className = "inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/25";
        badge.innerHTML = `<span class="h-2 w-2 rounded-full bg-current"></span><span>مرفوض</span>`;
      }
      if (title) title.textContent = "تم رفض التوثيق";
      if (text) text.textContent = "يرجى مراجعة البيانات أو الروابط وإعادة الإرسال مرة أخرى.";

      if (rejectionReason && reason) {
        reason.classList.remove("hidden");
        reason.textContent = `سبب الرفض: ${rejectionReason}`;
      }

      return;
    }

  } catch (e) {
    console.error(e);
  }
}

// ===============================
// Admin Review: Pending Drivers
// ===============================
async function loadPendingDriverVerifications() {
  const list = document.getElementById("adminDriversList");
  if (!list) return;

  list.innerHTML = `<div class="text-xs text-slate-400">جارٍ تحميل السائقين...</div>`;

  try {
    const q = query(
      collection(db, "users_private"),
      where("verificationStatus", "==", "pending")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = `<div class="text-xs text-slate-400">لا يوجد سائقون قيد المراجعة حاليًا.</div>`;
      return;
    }

    list.innerHTML = "";

    for (const docSnap of snap.docs) {
      const uid = docSnap.id;
      const privateData = docSnap.data();

      let publicData = {};
      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          publicData = userSnap.data();
        }
      } catch (e) {
        console.error(e);
      }

      const card = document.createElement("div");
      card.className = "overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 to-slate-800/80 ring-1 ring-white/10 shadow-lg";

      card.innerHTML = `
  <div class="p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <div class="text-sm font-semibold text-white break-all">
            ${escapeHtml(publicData.name || "بدون اسم")}
          </div>

          <span class="inline-flex items-center gap-2 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-300 ring-1 ring-yellow-500/20">
            <span class="h-2 w-2 rounded-full bg-current"></span>
            <span>Pending Verification</span>
          </span>
        </div>

        <div class="mt-2 text-xs text-slate-400 break-all">
          UID: ${escapeHtml(uid)}
        </div>

        <div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
          <span class="rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-white/10">
            📞 ${escapeHtml(publicData.phone || "-")}
          </span>
          <span class="rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-white/10">
            🚐 ${escapeHtml(publicData.carModel || "-")}
          </span>
          <span class="rounded-full bg-white/5 px-2.5 py-1 ring-1 ring-white/10">
            🔢 ${escapeHtml(publicData.carPlate || "-")}
          </span>
        </div>
      </div>
    </div>

    <div class="mt-4 grid gap-3">
      <div class="rounded-2xl bg-black/20 ring-1 ring-white/10 p-4">
        <div class="text-xs font-semibold text-white">بيانات المستندات النصية</div>

        <div class="mt-3 grid gap-2 text-xs text-slate-300 break-all">
          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            <span>رقم البطاقة</span>
            <b>${escapeHtml(privateData.nationalId || "-")}</b>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            <span>انتهاء البطاقة</span>
            <b>${escapeHtml(privateData.nationalIdExpiry || "-")}</b>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            <span>رخصة القيادة</span>
            <b>${escapeHtml(privateData.driverLicenseNumber || "-")}</b>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            <span>انتهاء رخصة القيادة</span>
            <b>${escapeHtml(privateData.driverLicenseExpiry || "-")}</b>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            <span>رخصة السيارة</span>
            <b>${escapeHtml(privateData.vehicleLicenseNumber || "-")}</b>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            <span>انتهاء رخصة السيارة</span>
            <b>${escapeHtml(privateData.vehicleLicenseExpiry || "-")}</b>
          </div>
        </div>
      </div>

      <div class="rounded-2xl bg-black/20 ring-1 ring-white/10 p-4">
        <div class="text-xs font-semibold text-white">روابط المستندات والصور</div>

        <div class="mt-3 grid gap-2 text-xs text-slate-300 break-all">
          <div class="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            البطاقة:
            <a class="ml-1 underline text-indigo-300" href="${privateData.nationalIdImage || "#"}" target="_blank">
              ${escapeHtml(truncateUrl(privateData.nationalIdImage || "-"))}
            </a>
          </div>

          <div class="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            رخصة القيادة:
            <a class="ml-1 underline text-indigo-300" href="${privateData.driverLicenseImage || "#"}" target="_blank">
              ${escapeHtml(truncateUrl(privateData.driverLicenseImage || "-"))}
            </a>
          </div>

          <div class="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            رخصة السيارة:
            <a class="ml-1 underline text-indigo-300" href="${privateData.vehicleLicenseImage || "#"}" target="_blank">
              ${escapeHtml(truncateUrl(privateData.vehicleLicenseImage || "-"))}
            </a>
          </div>

          <div class="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            السيلفي:
            <a class="ml-1 underline text-indigo-300" href="${privateData.selfieImage || "#"}" target="_blank">
              ${escapeHtml(truncateUrl(privateData.selfieImage || "-"))}
            </a>
          </div>

          <div class="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            السيارة خارج:
            <a class="ml-1 underline text-indigo-300" href="${privateData.carOutsideImage || "#"}" target="_blank">
              ${escapeHtml(truncateUrl(privateData.carOutsideImage || "-"))}
            </a>
          </div>

          <div class="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
            السيارة داخل:
            <a class="ml-1 underline text-indigo-300" href="${privateData.carInsideImage || "#"}" target="_blank">
              ${escapeHtml(truncateUrl(privateData.carInsideImage || "-"))}
            </a>
          </div>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input data-reason="${uid}"
          class="rejectReasonInput w-full rounded-2xl bg-black/20 ring-1 ring-white/10 px-4 py-3 text-xs text-white outline-none focus:ring-2 focus:ring-rose-400"
          placeholder="سبب الرفض (اختياري)" />

        <button data-approve="${uid}"
          class="approveDriverBtn rounded-2xl bg-emerald-500/90 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-3">
          قبول التوثيق
        </button>

        <button data-reject="${uid}"
          class="rejectDriverBtn rounded-2xl bg-rose-500/90 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-3">
          رفض التوثيق
        </button>
      </div>
    </div>
  </div>
`;

      list.appendChild(card);
    }

    // Approve handlers
    list.querySelectorAll(".approveDriverBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = btn.getAttribute("data-approve");
        if (!uid) return;

        try {
          await setDoc(doc(db, "users_private", uid), {
            verificationStatus: "approved",
            verifiedAt: serverTimestamp()
          }, { merge: true });

          showAlert("تم قبول السائق ✅", "success");
          await loadPendingDriverVerifications();
        } catch (e) {
          console.error(e);
          showAlert("فشل قبول السائق.", "error");
        }
      });
    });

    // Reject handlers
    list.querySelectorAll(".rejectDriverBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = btn.getAttribute("data-reject");
        if (!uid) return;

        const reasonInput = document.querySelector(`[data-reason="${uid}"]`);
        const rejectionReason = reasonInput?.value?.trim() || "";

        try {
          await setDoc(doc(db, "users_private", uid), {
            verificationStatus: "rejected",
            rejectionReason,
            reviewedAt: serverTimestamp()
          }, { merge: true });

          showAlert("تم رفض السائق ✅", "success");
          await loadPendingDriverVerifications();
        } catch (e) {
          console.error(e);
          showAlert("فشل رفض السائق.", "error");
        }
      });
    });

  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="text-xs text-rose-300">حدث خطأ أثناء تحميل السائقين.</div>`;
  }
}


// ===============================
// Admin Review: Profile Update Requests
// ===============================
async function loadPendingProfileUpdateRequests() {
  const list = document.getElementById("adminUpdateRequestsList");
  if (!list) return;

  list.innerHTML = `<div class="text-xs text-slate-400">جارٍ تحميل طلبات التعديل...</div>`;

  try {
    const q = query(
      collection(db, "profile_update_requests"),
      where("requestStatus", "==", "pending")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = `<div class="text-xs text-slate-400">لا توجد طلبات تعديل معلقة حاليًا.</div>`;
      return;
    }

    list.innerHTML = "";

    for (const docSnap of snap.docs) {
      const requestId = docSnap.id;
      const req = docSnap.data();
      const uid = req.uid;

      let publicData = {};
      let privateData = {};

      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) publicData = userSnap.data();
      } catch (e) {
        console.error(e);
      }

      try {
        const privateSnap = await getDoc(doc(db, "users_private", uid));
        if (privateSnap.exists()) privateData = privateSnap.data();
      } catch (e) {
        console.error(e);
      }

      const updatedFieldsHtml = Object.entries(req.updatedFields || {})
  .map(([key, value]) => `
    <div class="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5 text-xs text-slate-300 break-all">
      <div class="font-semibold text-white">${escapeHtml(key)}</div>
      <div class="mt-1">
        <span class="text-slate-500">${escapeHtml(String(publicData[key] || "-"))}</span>
        <span class="mx-1 text-slate-400">→</span>
        <span class="text-emerald-300">${escapeHtml(String(value || "-"))}</span>
      </div>
    </div>
  `).join("");

      const updatedPrivateFieldsHtml = Object.entries(req.updatedPrivateFields || {})
  .map(([key, value]) => `
    <div class="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5 text-xs text-slate-300 break-all">
      <div class="font-semibold text-white">${escapeHtml(key)}</div>
      <div class="mt-1">
        <span class="text-slate-500">${escapeHtml(String(privateData[key] || "-"))}</span>
        <span class="mx-1 text-slate-400">→</span>
        <span class="text-emerald-300">${escapeHtml(String(value || "-"))}</span>
      </div>
    </div>
  `).join("");

      const card = document.createElement("div");
      card.className = "overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/95 to-slate-800/80 ring-1 ring-white/10 shadow-lg";

      card.innerHTML = `
  <div class="p-4 sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <div class="text-sm font-semibold text-white break-all">
            ${escapeHtml(publicData.name || "بدون اسم")}
          </div>

          <span class="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
            <span class="h-2 w-2 rounded-full bg-current"></span>
            <span>${escapeHtml(req.role || "-")}</span>
          </span>

          <span class="inline-flex items-center gap-2 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-300 ring-1 ring-yellow-500/20">
            <span class="h-2 w-2 rounded-full bg-current"></span>
            <span>${escapeHtml(req.requestType || "-")}</span>
          </span>
        </div>

        <div class="mt-2 text-xs text-slate-400 break-all">
          UID: ${escapeHtml(uid)}
        </div>

        <div class="mt-3 rounded-2xl bg-black/20 ring-1 ring-white/10 p-3">
          <div class="text-xs font-semibold text-white">سبب طلب التحديث</div>
          <div class="mt-2 text-xs leading-6 text-slate-300 break-all">
            ${escapeHtml(req.reason || "-")}
          </div>
        </div>
      </div>
    </div>

    ${updatedFieldsHtml ? `
      <div class="mt-4 rounded-2xl bg-black/20 ring-1 ring-white/10 p-4">
        <div class="text-xs font-semibold text-white">البيانات العامة المطلوبة للتعديل</div>
        <div class="mt-3 grid gap-2">${updatedFieldsHtml}</div>
      </div>
    ` : ""}

    ${updatedPrivateFieldsHtml ? `
      <div class="mt-4 rounded-2xl bg-black/20 ring-1 ring-white/10 p-4">
        <div class="text-xs font-semibold text-white">البيانات الخاصة المطلوبة للتعديل</div>
        <div class="mt-3 grid gap-2">${updatedPrivateFieldsHtml}</div>
      </div>
    ` : ""}

    <div class="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
      <input data-update-reason="${requestId}"
        class="updateRejectReasonInput w-full rounded-2xl bg-black/20 ring-1 ring-white/10 px-4 py-3 text-xs text-white outline-none focus:ring-2 focus:ring-rose-400"
        placeholder="سبب الرفض (اختياري)" />

      <button data-update-approve="${requestId}"
        class="approveUpdateBtn rounded-2xl bg-emerald-500/90 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-3">
        اعتماد التعديل
      </button>

      <button data-update-reject="${requestId}"
        class="rejectUpdateBtn rounded-2xl bg-rose-500/90 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-3">
        رفض التعديل
      </button>
    </div>
  </div>
`;

      list.appendChild(card);
    }

    // Approve update request
    list.querySelectorAll(".approveUpdateBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const requestId = btn.getAttribute("data-update-approve");
        if (!requestId) return;

        try {
          const requestRef = doc(db, "profile_update_requests", requestId);
          const requestSnap = await getDoc(requestRef);
          if (!requestSnap.exists()) return;

          const req = requestSnap.data();
          const uid = req.uid;

          // apply public updates
          if (req.updatedFields && Object.keys(req.updatedFields).length > 0) {
            await setDoc(doc(db, "users", uid), req.updatedFields, { merge: true });
          }

          // apply private updates
          if (req.updatedPrivateFields && Object.keys(req.updatedPrivateFields).length > 0) {
            await setDoc(doc(db, "users_private", uid), req.updatedPrivateFields, { merge: true });

            // لو تحديث مستندات، نرجع حالة التوثيق pending للمراجعة الجديدة
            if (req.requestType === "documents_update") {
              await setDoc(doc(db, "users_private", uid), {
                verificationStatus: "pending",
                submittedAt: serverTimestamp()
              }, { merge: true });
            }
          }

          // mark request approved
          await setDoc(requestRef, {
            requestStatus: "approved",
            reviewedAt: serverTimestamp()
          }, { merge: true });

          showAlert("تم اعتماد طلب التحديث ✅", "success");
          await loadPendingProfileUpdateRequests();
        } catch (e) {
          console.error(e);
          showAlert("فشل اعتماد طلب التحديث.", "error");
        }
      });
    });

    // Reject update request
    list.querySelectorAll(".rejectUpdateBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const requestId = btn.getAttribute("data-update-reject");
        if (!requestId) return;

        const reasonInput = document.querySelector(`[data-update-reason="${requestId}"]`);
        const rejectionReason = reasonInput?.value?.trim() || "";

        try {
          await setDoc(doc(db, "profile_update_requests", requestId), {
            requestStatus: "rejected",
            adminResponse: rejectionReason,
            reviewedAt: serverTimestamp()
          }, { merge: true });

          showAlert("تم رفض طلب التحديث ✅", "success");
          await loadPendingProfileUpdateRequests();
        } catch (e) {
          console.error(e);
          showAlert("فشل رفض طلب التحديث.", "error");
        }
      });
    });

  } catch (e) {
    console.error(e);
    list.innerHTML = `<div class="text-xs text-rose-300">حدث خطأ أثناء تحميل طلبات التحديث.</div>`;
  }
}

// ===============================
// Paste from Clipboard
// ===============================

async function pasteFromClipboard(inputId){

try{

const text = await navigator.clipboard.readText();

const input = document.getElementById(inputId);

if(input){
input.value = text;
}

}catch(e){

showAlert("لم نتمكن من قراءة الحافظة. قم باللصق يدويًا.","error");

}

}


async function requestEssentialPermissions() {
  try {
    // 📍 طلب الموقع
    await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    console.log("Location granted ✅");

  } catch (e) {
    console.warn("Location denied ❌", e);
  }

  try {
    // 🔔 طلب الإشعارات
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      console.log("Notification:", permission);
    }
  } catch (e) {
    console.warn("Notification error:", e);
  }

  hidePermissionsModal();
  localStorage.setItem("permissionsAsked", "1");
}

function showPermissionsModal() {
  const modal = document.getElementById("permissionsModal");
  modal?.classList.remove("hidden");
}

function hidePermissionsModal() {
  const modal = document.getElementById("permissionsModal");
  modal?.classList.add("hidden");
}


// buttons
document.getElementById("pasteNationalId")?.addEventListener("click",()=>pasteFromClipboard("nationalIdUrl"));
document.getElementById("pasteDriverLicense")?.addEventListener("click",()=>pasteFromClipboard("driverLicenseUrl"));
document.getElementById("pasteVehicleLicense")?.addEventListener("click",()=>pasteFromClipboard("vehicleLicenseUrl"));
document.getElementById("pasteSelfie")?.addEventListener("click",()=>pasteFromClipboard("selfieUrl"));
document.getElementById("pasteCarOutside")?.addEventListener("click",()=>pasteFromClipboard("carOutsideUrl"));
document.getElementById("pasteCarInside")?.addEventListener("click",()=>pasteFromClipboard("carInsideUrl"));

document.getElementById("enablePermissionsBtn")?.addEventListener("click", async () => {
  await requestEssentialPermissions();
});

document.getElementById("skipPermissionsBtn")?.addEventListener("click", () => {
  hidePermissionsModal();
});


document.getElementById("refreshAdminDriversBtn")?.addEventListener("click", async () => {
  await loadPendingDriverVerifications();
});

document.getElementById("toggleProfileUpdateBtn")?.addEventListener("click", () => {
  const form = document.getElementById("profileUpdateForm");
  if (!form) return;

  form.classList.toggle("hidden");
});

document.getElementById("profileUpdateReason")?.addEventListener("input", () => {
  const reason = document.getElementById("profileUpdateReason")?.value?.trim() || "";
  const docsBox = document.getElementById("driverUpdateDocumentsFields");

  if (isDocumentUpdateReason(reason)) {
    docsBox?.classList.remove("hidden");
  } else {
    docsBox?.classList.add("hidden");
  }
});

document.getElementById("submitProfileUpdateRequestBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  const role = document.getElementById("roleLabel")?.textContent?.trim() || "rider";

  try {
    await submitProfileUpdateRequest(user.uid, role);
    showAlert("تم إرسال طلب التحديث ✅", "success");
    await loadMyLatestProfileUpdateRequest(user.uid);
  } catch (e) {
    console.error(e);
    showAlert("فشل إرسال طلب التحديث.", "error");
  }
});

document.getElementById("refreshUpdateRequestsBtn")?.addEventListener("click", async () => {
  await loadPendingProfileUpdateRequests();
});

document.getElementById("submitRiderRatingBtn")?.addEventListener("click", async () => {
  const tripId = document.getElementById("submitRiderRatingBtn")?.getAttribute("data-trip");
  const statusEl = document.getElementById("riderRatingStatus");

  if (!tripId) return;
  if (!selectedRiderRating || selectedRiderRating < 1 || selectedRiderRating > 5) {
    if (statusEl) statusEl.textContent = "اختر تقييمًا من 1 إلى 5 أولًا.";
    return;
  }

  try {
    await submitTripRating(tripId, "rider", selectedRiderRating);
    if (statusEl) statusEl.textContent = `تم إرسال تقييمك للسائق ✅ (${selectedRiderRating}/5)`;
  } catch (e) {
    console.error(e);
    if (statusEl) statusEl.textContent = "فشل إرسال تقييم السائق.";
  }
});

document.getElementById("submitDriverRatingBtn")?.addEventListener("click", async () => {
  const tripId = document.getElementById("submitDriverRatingBtn")?.getAttribute("data-trip");
  const statusEl = document.getElementById("driverRatingStatus");

  if (!tripId) return;
  if (!selectedDriverRating || selectedDriverRating < 1 || selectedDriverRating > 5) {
    if (statusEl) statusEl.textContent = "اختر تقييمًا من 1 إلى 5 أولًا.";
    return;
  }

  try {
    await submitTripRating(tripId, "driver", selectedDriverRating);
    if (statusEl) statusEl.textContent = `تم إرسال تقييمك للراكب ✅ (${selectedDriverRating}/5)`;
  } catch (e) {
    console.error(e);
    if (statusEl) statusEl.textContent = "فشل إرسال تقييم الراكب.";
  }
});

document.getElementById("openRiderNavigationBtn")?.addEventListener("click", async () => {
  const tripId = document.getElementById("openRiderNavigationBtn")?.getAttribute("data-trip");
  if (!tripId) return;

  try {
    const tripSnap = await getDoc(doc(db, "trips", tripId));
    if (!tripSnap.exists()) {
      showAlert("تعذر العثور على الرحلة.", "error");
      return;
    }

    await openTripNavigation(tripSnap.data());
  } catch (e) {
    console.error(e);
    showAlert("فشل فتح الملاحة.", "error");
  }
});

document.getElementById("openDriverNavigationBtn")?.addEventListener("click", async () => {
  const tripId = document.getElementById("openDriverNavigationBtn")?.getAttribute("data-trip");
  if (!tripId) return;

  try {
    const tripSnap = await getDoc(doc(db, "trips", tripId));
    if (!tripSnap.exists()) {
      showAlert("تعذر العثور على الرحلة.", "error");
      return;
    }

    await openTripNavigation(tripSnap.data());
  } catch (e) {
    console.error(e);
    showAlert("فشل فتح الملاحة.", "error");
  }
});

document.getElementById("refreshPendingTripsBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await loadPendingTripsForDriver(user.uid);
    showAlert("تم تحديث الطلبات ✅", "success");
  } catch (e) {
    console.error(e);
    showAlert("فشل تحديث الطلبات.", "error");
  }
});
