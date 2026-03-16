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
    createdAt: serverTimestamp()
  }, { merge: true });
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
    
if (profile.role === "admin") {

  adminBox?.classList.remove("hidden");
  riderBox?.classList.add("hidden");
  driverBox?.classList.add("hidden");

  await loadPendingDriverVerifications();
  await loadPendingProfileUpdateRequests();

} else if (profile.role === "driver") {

  driverBox?.classList.remove("hidden");
  riderBox?.classList.add("hidden");
  adminBox?.classList.add("hidden");

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

  initMapOnce();
  watchMyLatestTrip(user.uid);
  await loadMyLatestProfileUpdateRequest(user.uid);
  initRatingWidgets();
  initTripOptionsUI();

  window.currentKmRoad = Number(window.currentKmRoad || 0);
renderTripPricingSummary(window.currentKmRoad);
}
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
  const activeTripQuery = query(
    collection(db, "trips"),
    where("riderId", "==", riderId),
    where("status", "in", ["pending", "accepted", "cancel_requested", "waiting_return"]),
    limit(1)
  );

  const activeTripSnap = await getDocs(activeTripQuery);

  if (!activeTripSnap.empty) {
    if (riderStatus) {
      riderStatus.textContent = "لديك بالفعل رحلة أو طلب نشط. لا يمكنك إنشاء طلب جديد قبل إنهاء أو إلغاء الحالي.";
    }
    return;
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

  const pickupPlace = pickupLatLng
    ? await reverseGeocode(pickupLatLng.lat, pickupLatLng.lng)
    : { shortText: pickup, fullText: pickup };

  const dropoffPlace = dropoffLatLng
    ? await reverseGeocode(dropoffLatLng.lat, dropoffLatLng.lng)
    : { shortText: dropoff, fullText: dropoff };

  const pickupDisplay = pickupPlace.shortText || pickup;
  const dropoffDisplay = dropoffPlace.shortText || dropoff;
  
  const pricing = computeTripPricing(Number(window.currentKmRoad || 0));
  const kmEstimated = Number(window.currentKmRoad || 0);

const pickupLat = pickupLatLng?.lat ?? null;
const pickupLng = pickupLatLng?.lng ?? null;
const dropoffLat = dropoffLatLng?.lat ?? null;
const dropoffLng = dropoffLatLng?.lng ?? null;
  
  await addDoc(collection(db, "trips"), {
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
    price: pricing.finalPrice,
    status: "pending",
    createdAt: serverTimestamp(),
    
    passengerCount,
    luggageType,
    tripType,
    waitingMinutes: tripType === "round_same_day" ? waitingMinutes : 0,
    returnDate: tripType === "return_other_day" ? returnDate : "",
    tripNotes,
    returnRequestScheduled: tripType === "return_other_day",
    priceBreakdown: pricing
  });

  if (riderStatus) riderStatus.textContent = "تم إرسال الطلب ✅ انتظر قبول السائق.";
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
  ${escapeHtml(t.pickupAddress || t.pickup)} → ${escapeHtml(t.dropoffAddress || t.dropoff)}
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
  const ref = doc(db, "trips", tripId);

  // تحديث واحد: pending -> accepted + driverId
  await updateDoc(ref, {
    status: "accepted",
    driverId,
    acceptedAt: serverTimestamp(),
    cancelRequestedBy: null,
    cancelRequestedAt: null,
    cancelledAt: null,
    completedAt: null
  });
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
}

async function getUserAverageRating(uid) {
  if (!uid) return { avg: 0, count: 0 };

  try {
    const q = query(
      collection(db, "trip_ratings"),
      where("targetUid", "==", uid)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return { avg: 0, count: 0 };
    }

    let total = 0;
    let count = 0;

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const score = Number(data.score || 0);

      if (score >= 1 && score <= 5) {
        total += score;
        count++;
      }
    });

    if (count === 0) {
      return { avg: 0, count: 0 };
    }

    return {
      avg: Number((total / count).toFixed(1)),
      count
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

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          await setDoc(doc(db, "users", uid), {
            location: {
              lat,
              lng,
              updatedAt: new Date().toISOString()
            }
          }, { merge: true });

          if (statusEl) {
            statusEl.textContent = `تم تحديث موقعك ✅ (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          }

          resolve({ lat, lng });
        } catch (e) {
          console.error(e);
          if (statusEl) statusEl.textContent = "فشل حفظ موقع السائق.";
          reject(e);
        }
      },
      (err) => {
        console.error(err);
        if (statusEl) statusEl.textContent = "لم نتمكن من تحديد موقع السائق. تأكد من السماح بالـLocation.";
        reject(err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
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

const PRICING = {
  baseFare: 35,
  perKm: 7.5,
  minimumFare: 55,
  luggageBagsFee: 15,
  luggageExtraFee: 30,
  extraPassengerAfter4: 10,
  waitingPer30Min: 20,
  futureReturnBookingFee: 40
};

function roundMoney(x) {
  return Math.round(Number(x || 0));
}

function getSelectedTripType() {
  const selected = document.querySelector('input[name="tripType"]:checked');
  return selected?.value || "one_way";
}

function computeTripPricing(kmRoad) {
  const passengerCount = Number(document.getElementById("passengerCount")?.value || 1);
  const luggageType = document.getElementById("luggageType")?.value || "none";
  const tripType = getSelectedTripType();
  const waitingMinutes = Number(document.getElementById("waitingMinutes")?.value || 0);

  const baseOneWayRaw = PRICING.baseFare + (Number(kmRoad || 0) * PRICING.perKm);
  const oneWayFare = Math.max(PRICING.minimumFare, roundMoney(baseOneWayRaw));

  let luggageFee = 0;
  if (luggageType === "bags") luggageFee = PRICING.luggageBagsFee;
  if (luggageType === "extra") luggageFee = PRICING.luggageExtraFee;

  let extraPassengerFee = 0;
  if (passengerCount > 4) {
    extraPassengerFee = (passengerCount - 4) * PRICING.extraPassengerAfter4;
  }

  const oneWayTotal = oneWayFare + luggageFee + extraPassengerFee;

  let waitingFee = 0;
  let bookingFee = 0;
  let finalPrice = oneWayTotal;
  let tripLabel = "ذهاب فقط";

  if (tripType === "round_same_day") {
    const waitingBlocks = Math.ceil(waitingMinutes / 30);
    waitingFee = waitingBlocks * PRICING.waitingPer30Min;
    finalPrice = (oneWayTotal * 2) + waitingFee;
    tripLabel = "ذهاب وعودة في نفس اليوم";
  }

  if (tripType === "return_other_day") {
    bookingFee = PRICING.futureReturnBookingFee;
    finalPrice = oneWayTotal + bookingFee;
    tripLabel = "ذهاب الآن وعودة في يوم آخر";
  }

  return {
    tripType,
    tripLabel,
    km: Number(Number(kmRoad || 0).toFixed(1)),
    passengerCount,
    luggageType,
    waitingMinutes,
    oneWayFare,
    luggageFee,
    extraPassengerFee,
    waitingFee,
    bookingFee,
    finalPrice: roundMoney(finalPrice)
  };
}

function renderTripPricingSummary(kmRoad = 0) {
  const detailsEl = document.getElementById("tripPricingDetails");
  if (!detailsEl) return;

  const result = computeTripPricing(kmRoad);

  let luggageText = "لا يوجد";
  if (result.luggageType === "bags") luggageText = "شنط عادية";
  if (result.luggageType === "extra") luggageText = "حمولة إضافية";

  let extraLines = "";

  if (result.tripType === "round_same_day") {
    extraLines += `<div>رسوم الانتظار: <b>${result.waitingFee}</b> جنيه</div>`;
  }

  if (result.tripType === "return_other_day") {
    extraLines += `<div>رسوم حجز/تنسيق العودة: <b>${result.bookingFee}</b> جنيه</div>`;
    extraLines += `<div class="text-amber-300">سعر العودة النهائي يُحسب لاحقًا عند موعد الرجوع.</div>`;
  }

  detailsEl.innerHTML = `
    <div>نوع الرحلة: <b>${result.tripLabel}</b></div>
    <div>المسافة التقديرية: <b>${result.km}</b> كم</div>
    <div>عدد الركاب: <b>${result.passengerCount}</b></div>
    <div>الشنط/الحمولة: <b>${luggageText}</b></div>
    <div>سعر الذهاب الأساسي: <b>${result.oneWayFare}</b> جنيه</div>
    ${result.luggageFee ? `<div>رسوم الشنط/الحمولة: <b>${result.luggageFee}</b> جنيه</div>` : ""}
    ${result.extraPassengerFee ? `<div>رسوم ركاب إضافيين: <b>${result.extraPassengerFee}</b> جنيه</div>` : ""}
    ${extraLines}
    <div class="mt-2 rounded-xl bg-indigo-500/15 px-3 py-2 text-white ring-1 ring-indigo-500/20">
      السعر النهائي المبدئي: <b>${result.finalPrice}</b> جنيه
    </div>
  `;
}

function toggleTripTypeFields() {
  const tripType = getSelectedTripType();

  const sameDayBox = document.getElementById("sameDayReturnFields");
  const differentDaysBox = document.getElementById("differentDaysReturnFields");

  sameDayBox?.classList.add("hidden");
  differentDaysBox?.classList.add("hidden");

  if (tripType === "round_same_day") {
    sameDayBox?.classList.remove("hidden");
  }

  if (tripType === "return_other_day") {
    differentDaysBox?.classList.remove("hidden");
  }

  const kmRoad = Number(window.currentKmRoad || 0);
  window.currentKmRoad = Number(kmRoad || 0);
renderTripPricingSummary(window.currentKmRoad);
}

function initTripOptionsUI() {
  const passengerCount = document.getElementById("passengerCount");
  const luggageType = document.getElementById("luggageType");
  const waitingMinutes = document.getElementById("waitingMinutes");
  const returnDate = document.getElementById("returnDate");

  document.querySelectorAll('input[name="tripType"]').forEach((radio) => {
    radio.addEventListener("change", toggleTripTypeFields);
  });

  passengerCount?.addEventListener("change", () => renderTripPricingSummary(Number(window.currentKmRoad || 0)));
  luggageType?.addEventListener("change", () => renderTripPricingSummary(Number(window.currentKmRoad || 0)));
  waitingMinutes?.addEventListener("change", () => renderTripPricingSummary(Number(window.currentKmRoad || 0)));
  returnDate?.addEventListener("change", () => renderTripPricingSummary(Number(window.currentKmRoad || 0)));

  toggleTripTypeFields();
}

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

function updateMetrics() {
  const el = document.getElementById("tripMetrics");
  if (!el) return;

  if (!pickupLatLng || !dropoffLatLng) {
    el.textContent = "اختر نقطتين على الخريطة أو بالبحث.";
    window.currentKmRoad = 0;
    renderTripPricingSummary(0);
    return;
  }

  const kmRoad = haversineKm(pickupLatLng, dropoffLatLng);

  window.currentKmRoad = Number(kmRoad || 0);

  const pricing = computeTripPricing(window.currentKmRoad);
  const price = pricing.finalPrice;

  renderTripPricingSummary(window.currentKmRoad);

  el.textContent =
    `المسافة التقديرية: ${window.currentKmRoad.toFixed(1)} كم | السعر المقترح: ${price} جنيه`;
}

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
let unsubscribeMyTrip = null;
let currentDriverVerification = { ok: true, issues: [] };
let selectedRiderRating = 0;
let selectedDriverRating = 0;
let ratingWidgetsInitialized = false;

function watchMyLatestTrip(riderId) {
  const info = document.getElementById("myTripInfo");
  const cancelBtn = document.getElementById("cancelTripBtn");
  const requestBtn = document.getElementById("requestCancelBtn");
  const createTripBtn = document.getElementById("createTripBtn");
  const riderRatingBox = document.getElementById("riderRatingBox");
const riderRatingStatus = document.getElementById("riderRatingStatus");
const submitRiderRatingBtn = document.getElementById("submitRiderRatingBtn");
  
  if (unsubscribeMyTrip) unsubscribeMyTrip();

  const q = query(
  collection(db, "trips"),
  where("riderId", "==", riderId),
  where("status", "in", ["pending", "accepted", "cancel_requested", "waiting_return"]),
  limit(1)
);

  unsubscribeMyTrip = onSnapshot(q, async (snap) => {
    if (snap.empty) {
  if (info) info.textContent = "لا يوجد طلب حاليًا.";
  cancelBtn?.classList.add("hidden");
  requestBtn?.classList.add("hidden");
  riderRatingBox?.classList.add("hidden");

  if (createTripBtn) {
    createTripBtn.disabled = false;
    createTripBtn.classList.remove("opacity-50", "cursor-not-allowed");
    createTripBtn.textContent = "إرسال الطلب";
  }

  return;
}

    const docSnap = snap.docs[0];
    const t = docSnap.data();

    const status = t.status || "pending";
    const isActiveTrip = ["pending", "accepted", "cancel_requested", "waiting_return"].includes(status);
    const priceTxt = t.price ? ` | السعر: ${t.price} جنيه` : "";

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

    ${driverTxt}
  `;
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
    
    // pending: الراكب يقدر يلغي فورًا (قبل ما السائق يقبل)
if (status === "pending") {
  cancelBtn?.classList.remove("hidden");
  requestBtn?.classList.add("hidden");
}
// accepted: الراكب مايلغيش فورًا، يطلب إلغاء والسائق يوافق
else if (status === "accepted") {
  cancelBtn?.classList.add("hidden");
  requestBtn?.classList.remove("hidden");
}
// أي حالة تانية: اخفي الاتنين
else {
  cancelBtn?.classList.add("hidden");
  requestBtn?.classList.add("hidden");
}

// خزّن tripId في الأزرار
cancelBtn?.setAttribute("data-trip", docSnap.id);
requestBtn?.setAttribute("data-trip", docSnap.id);

// Rating UI for rider after completed
riderRatingBox?.classList.add("hidden");
if (riderRatingStatus) riderRatingStatus.textContent = "";
submitRiderRatingBtn?.setAttribute("data-trip", docSnap.id);

if (status === "completed") {
  riderRatingBox?.classList.remove("hidden");

  try {
    const ratingRef = doc(db, "trip_ratings", `${docSnap.id}_rider`);
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
  }, (err) => {
    console.error(err);
    showAlert("مشكلة في متابعة الرحلة الحالية (Realtime).", "error");
  });
}

// ========== Driver Realtime: watch current trip ==========
let unsubscribeDriverTrip = null;

// هنعتبر "الرحلة الحالية" هي آخر رحلة للسائق ليست completed/cancelled
function watchDriverCurrentTrip(driverId) {
  const info = document.getElementById("driverTripInfo");
  const approveBtn = document.getElementById("approveCancelBtn");
  const completeBtn = document.getElementById("completeTripBtn");
  const startBtn = document.getElementById("startTripBtn"); // مش هنستخدمه دلوقتي (اختياري)
  const driverRatingBox = document.getElementById("driverRatingBox");
const driverRatingStatus = document.getElementById("driverRatingStatus");
const submitDriverRatingBtn = document.getElementById("submitDriverRatingBtn");
  
  if (unsubscribeDriverTrip) unsubscribeDriverTrip();

  const q = query(
    collection(db, "trips"),
    where("driverId", "==", driverId),
    orderBy("acceptedAt", "desc"),
    limit(1)
  );

  unsubscribeDriverTrip = onSnapshot(q, async (snap) => {
    if (snap.empty) {
      if (info) info.textContent = "لا توجد رحلة حالية.";
      approveBtn?.classList.add("hidden");
      completeBtn?.classList.add("hidden");
      startBtn?.classList.add("hidden");
driverRatingBox?.classList.add("hidden");
return;
    }

    const docSnap = snap.docs[0];
    const t = docSnap.data();
    const tripId = docSnap.id;

    const status = t.status || "accepted";
    const priceTxt = t.price ? ` | السعر: ${t.price} جنيه` : "";
const kmTxt = t.kmEstimated ? ` | ${t.kmEstimated} كم` : "";

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
          <span>رحلتك الحالية</span>
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
        <span>${kmTxt}</span>
        <span>${priceTxt}</span>
      </div>
    </div>

    ${riderTxt}
  `;
}
    
    // أخفي الكل افتراضيًا
    approveBtn?.classList.add("hidden");
    completeBtn?.classList.add("hidden");
    startBtn?.classList.add("hidden");

    // لو الراكب طلب إلغاء
    if (status === "cancel_requested") {
      approveBtn?.classList.remove("hidden");
    }

    // لو الرحلة مقبولة (ولسه شغالة)
    if (status === "accepted") {
      completeBtn?.classList.remove("hidden");
    }

    // خزّن tripId في الأزرار
    approveBtn?.setAttribute("data-trip", tripId);
    completeBtn?.setAttribute("data-trip", tripId);
    startBtn?.setAttribute("data-trip", tripId);

    // Rating UI for driver after completed
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
    await updateDoc(doc(db, "trips", tripId), { status: "cancelled" });
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
    await updateDoc(doc(db, "trips", tripId), {
      status: "completed",
      completedAt: serverTimestamp(),
      completedBy: user.uid
    });
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

// buttons
document.getElementById("pasteNationalId")?.addEventListener("click",()=>pasteFromClipboard("nationalIdUrl"));
document.getElementById("pasteDriverLicense")?.addEventListener("click",()=>pasteFromClipboard("driverLicenseUrl"));
document.getElementById("pasteVehicleLicense")?.addEventListener("click",()=>pasteFromClipboard("vehicleLicenseUrl"));
document.getElementById("pasteSelfie")?.addEventListener("click",()=>pasteFromClipboard("selfieUrl"));
document.getElementById("pasteCarOutside")?.addEventListener("click",()=>pasteFromClipboard("carOutsideUrl"));
document.getElementById("pasteCarInside")?.addEventListener("click",()=>pasteFromClipboard("carInsideUrl"));

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
