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
    
// Show rider/driver boxes
const riderBox = document.getElementById("riderBox");
const driverBox = document.getElementById("driverBox");

if (profile.role === "driver") {
  driverBox?.classList.remove("hidden");
  riderBox?.classList.add("hidden");
  await loadPendingTripsForDriver(user.uid);
} else {
  riderBox?.classList.remove("hidden");
  driverBox?.classList.add("hidden");
  initMapOnce();
  watchMyLatestTrip(user.uid);
}
  } catch (e) {
    console.error(e);
    showAlert("حصلت مشكلة في قراءة بيانات المستخدم من Firestore.", "error");
  }
});

async function createTrip(riderId) {
  const riderStatus = document.getElementById("riderStatus");

  if (!pickupLatLng || !dropoffLatLng) {
    if (riderStatus) riderStatus.textContent = "لازم تختار مكان الركوب والوجهة على الخريطة أو بالبحث.";
    return;
  }

  const kmStraight = haversineKm(pickupLatLng, dropoffLatLng);
  const kmRoad = kmStraight * PRICING.roadFactor;
  const price = computePrice(kmRoad);

  await addDoc(collection(db, "trips"), {
    riderId,
    driverId: null,

    pickup: document.getElementById("pickupSearch")?.value?.trim() || "Pickup",
    dropoff: document.getElementById("dropoffSearch")?.value?.trim() || "Dropoff",

    pickupLat: pickupLatLng.lat,
    pickupLng: pickupLatLng.lng,
    dropoffLat: dropoffLatLng.lat,
    dropoffLng: dropoffLatLng.lng,

    kmEstimated: Number(kmRoad.toFixed(2)),
    price,

    status: "pending",
    createdAt: serverTimestamp()
  });

  if (riderStatus) riderStatus.textContent = "تم إرسال الطلب ✅ انتظر قبول السائق.";
}

async function loadPendingTripsForDriver(driverId) {
  const list = document.getElementById("tripsList");
  if (!list) return;

  list.innerHTML = `<div class="text-xs text-slate-400">جارٍ تحميل الطلبات...</div>`;

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

  snap.forEach((docSnap) => {
    const t = docSnap.data();
    const id = docSnap.id;

    const card = document.createElement("div");
    card.className = "rounded-2xl bg-white/5 ring-1 ring-white/10 p-4";

    card.innerHTML = `
  <div class="flex items-center justify-between gap-3">
    <div class="min-w-0">
      <div class="text-sm font-semibold truncate">
        ${escapeHtml(t.pickup)} → ${escapeHtml(t.dropoff)}
      </div>
      <div class="mt-1 text-xs text-slate-300">
        السعر: <b>${t.price}</b> جنيه
        ${t.kmEstimated ? ` | المسافة: <b>${t.kmEstimated}</b> كم` : ""}
      </div>
    </div>
    <button data-trip="${id}"
      class="acceptBtn shrink-0 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2">
      قبول
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

  // bind accept buttons
  list.querySelectorAll(".acceptBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tripId = btn.getAttribute("data-trip");
      if (!tripId) return;
      btn.setAttribute("disabled", "true");
      btn.textContent = "جارٍ القبول...";

      try {
        await acceptTrip(driverId, tripId);
        btn.textContent = "تم ✅";
        // reload
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
    driverId
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

function renderMiniMap(mapId, trip) {
  try {
    if (typeof L === "undefined") return;

    const el = document.getElementById(mapId);
    if (!el) return;

    // لازم يكون عندنا lat/lng
    if (!trip.pickupLat || !trip.pickupLng || !trip.dropoffLat || !trip.dropoffLng) {
      el.innerHTML = `<div class="p-4 text-xs text-slate-300">لا توجد إحداثيات للخريطة.</div>`;
      return;
    }

    const p1 = [trip.pickupLat, trip.pickupLng];
    const p2 = [trip.dropoffLat, trip.dropoffLng];

    const m = L.map(mapId, { zoomControl: false, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(m);

    const b = L.latLngBounds([p1, p2]);
    m.fitBounds(b.pad(0.25));

    L.marker(p1).addTo(m);
    L.marker(p2).addTo(m);

    // منع مشاكل اللمس داخل الكارت
    m.dragging.disable();
    m.scrollWheelZoom.disable();
    m.doubleClickZoom.disable();
    m.boxZoom.disable();
    m.keyboard.disable();
    if (m.tap) m.tap.disable();
    el.style.pointerEvents = "none";
  } catch (e) {
    console.error("miniMap error", e);
  }
}

// ================= Map + Search + Pricing (Rider) =================
const PRICING = {
  baseFare: 20,
  ratePerKm: 8,
  roadFactor: 1.3,
  minFare: 35,
  roundTo: 5
};

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

  map.on("click", (e) => {
    if (selecting === "pickup") setPickup(e.latlng, "من الخريطة");
    else setDropoff(e.latlng, "من الخريطة");
  });

  updatePickModeLabel();
  updateMetrics();
}

function updatePickModeLabel() {
  const el = document.getElementById("pickMode");
  if (!el) return;
  el.textContent = selecting === "pickup" ? "اختيار: Pickup" : "اختيار: Dropoff";
}

function setPickup(latlng, label = "") {
  pickupLatLng = latlng;
  selecting = "dropoff";
  updatePickModeLabel();

  if (!pickupMarker) pickupMarker = L.marker(latlng, { draggable: true }).addTo(map);
  else pickupMarker.setLatLng(latlng);

  pickupMarker.on("dragend", () => {
    pickupLatLng = pickupMarker.getLatLng();
    updateMetrics();
  });

  if (label) document.getElementById("pickupSearch") && (document.getElementById("pickupSearch").value = label);
  map.setView(latlng, Math.max(map.getZoom(), 13));
  updateMetrics();
}

function setDropoff(latlng, label = "") {
  dropoffLatLng = latlng;
  selecting = "pickup";
  updatePickModeLabel();

  if (!dropoffMarker) dropoffMarker = L.marker(latlng, { draggable: true }).addTo(map);
  else dropoffMarker.setLatLng(latlng);

  dropoffMarker.on("dragend", () => {
    dropoffLatLng = dropoffMarker.getLatLng();
    updateMetrics();
  });

  if (label) document.getElementById("dropoffSearch") && (document.getElementById("dropoffSearch").value = label);
  map.setView(latlng, Math.max(map.getZoom(), 13));
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

function computePrice(kmRoad) {
  const raw = PRICING.baseFare + kmRoad * PRICING.ratePerKm;
  const withMin = Math.max(raw, PRICING.minFare);
  return roundTo(withMin, PRICING.roundTo);
}

function updateMetrics() {
  const el = document.getElementById("tripMetrics");
  if (!el) return;

  if (!pickupLatLng || !dropoffLatLng) {
    el.textContent = "اختر نقطتين على الخريطة أو بالبحث.";
    return;
  }

  const kmStraight = haversineKm(pickupLatLng, dropoffLatLng);
  const kmRoad = kmStraight * PRICING.roadFactor;
  const price = computePrice(kmRoad);

  el.textContent =
    `المسافة التقديرية: ${kmRoad.toFixed(1)} كم | السعر المقترح: ${price} جنيه`;
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

function watchMyLatestTrip(riderId) {
  const info = document.getElementById("myTripInfo");
  const cancelBtn = document.getElementById("cancelTripBtn");

  if (unsubscribeMyTrip) unsubscribeMyTrip();

  const q = query(
    collection(db, "trips"),
    where("riderId", "==", riderId),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  unsubscribeMyTrip = onSnapshot(q, (snap) => {
    if (snap.empty) {
      if (info) info.textContent = "لا يوجد طلب حاليًا.";
      cancelBtn?.classList.add("hidden");
      return;
    }

    const docSnap = snap.docs[0];
    const t = docSnap.data();

    const status = t.status || "pending";
    const driverTxt = t.driverId ? ` | سائق: ${t.driverId}` : "";
    const priceTxt = t.price ? ` | السعر: ${t.price} جنيه` : "";

    if (info) {
      info.textContent = `الحالة: ${status} | ${t.pickup} → ${t.dropoff}${priceTxt}${driverTxt}`;
    }

    if (status === "pending") cancelBtn?.classList.remove("hidden");
    else cancelBtn?.classList.add("hidden");

    cancelBtn?.setAttribute("data-trip", docSnap.id);
  }, (err) => {
    console.error(err);
    showAlert("مشكلة في متابعة الرحلة الحالية (Realtime).", "error");
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

