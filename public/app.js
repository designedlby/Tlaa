// ================= FIREBASE INIT =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);


// ================= UTIL =================
function showAlert(msg, type = "info") {
  console.log(type, msg);
}

function escapeHtml(str) {
  return str?.replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[m]));
}


// ================= ACTIVE TRIP HELPERS =================
async function clearActiveTripForTrip(tripId) {
  if (!tripId) return;

  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) return;

  const t = tripSnap.data();

  if (t.riderId) {
    await updateDoc(doc(db, "users", t.riderId), {
      activeTripId: null
    });
  }

  if (t.driverId) {
    await updateDoc(doc(db, "users", t.driverId), {
      activeTripId: null
    });
  }
}

// ================= CREATE TRIP =================
async function createTrip(riderId) {

  const riderSnap = await getDoc(doc(db, "users", riderId));
  if (riderSnap.exists() && riderSnap.data().activeTripId) {
    showAlert("لديك رحلة نشطة", "error");
    return;
  }

  const newTripRef = await addDoc(collection(db, "trips"), {
    riderId,
    status: "pending",
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, "users", riderId), {
    activeTripId: newTripRef.id
  });

  showAlert("تم إرسال الطلب", "success");
}


// ================= ACCEPT =================
async function acceptTrip(driverId, tripId) {

  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) throw new Error("trip not found");

  const t = tripSnap.data();

  await updateDoc(tripRef, {
    status: "accepted",
    driverId,
    acceptedAt: serverTimestamp()
  });

  await updateDoc(doc(db, "users", driverId), {
    activeTripId: tripId
  });

  if (t.riderId) {
    await updateDoc(doc(db, "users", t.riderId), {
      activeTripId: tripId
    });
  }
}

// ================= CANCEL (RIDER) =================
document.getElementById("cancelTripBtn")?.addEventListener("click", async () => {

  const user = auth.currentUser;
  if (!user) return;

  const tripId = document.getElementById("cancelTripBtn")?.dataset.trip;
  if (!tripId) return;

  await updateDoc(doc(db, "trips", tripId), {
    status: "cancelled",
    cancelledBy: user.uid,
    cancelledAt: serverTimestamp()
  });

  await clearActiveTripForTrip(tripId);

  showAlert("تم الإلغاء", "success");
});


// ================= APPROVE CANCEL (DRIVER) =================
document.getElementById("approveCancelBtn")?.addEventListener("click", async () => {

  const user = auth.currentUser;
  if (!user) return;

  const tripId = document.getElementById("approveCancelBtn")?.dataset.trip;
  if (!tripId) return;

  await updateDoc(doc(db, "trips", tripId), {
    status: "cancelled",
    cancelledBy: user.uid,
    cancelledAt: serverTimestamp()
  });

  await clearActiveTripForTrip(tripId);

  showAlert("تمت الموافقة على الإلغاء", "success");
});


// ================= COMPLETE =================
document.getElementById("completeTripBtn")?.addEventListener("click", async () => {

  const user = auth.currentUser;
  if (!user) return;

  const tripId = document.getElementById("completeTripBtn")?.dataset.trip;
  if (!tripId) return;

  await updateDoc(doc(db, "trips", tripId), {
    status: "completed",
    completedBy: user.uid,
    completedAt: serverTimestamp()
  });

  await clearActiveTripForTrip(tripId);

  showAlert("تم إنهاء الرحلة", "success");
});

// ================= WATCH RIDER =================
function watchMyLatestTrip(riderId) {

  const userRef = doc(db, "users", riderId);

  onSnapshot(userRef, async (snap) => {

    const user = snap.data();
    if (!user || !user.activeTripId) return;

    const tripSnap = await getDoc(doc(db, "trips", user.activeTripId));
    if (!tripSnap.exists()) return;

    const t = tripSnap.data();
    console.log("Trip:", t);

  });
}


// ================= WATCH DRIVER =================
function watchDriverCurrentTrip(driverId) {

  const userRef = doc(db, "users", driverId);

  onSnapshot(userRef, async (snap) => {

    const user = snap.data();
    if (!user || !user.activeTripId) return;

    const tripSnap = await getDoc(doc(db, "trips", user.activeTripId));
    if (!tripSnap.exists()) return;

    const t = tripSnap.data();
    console.log("Driver trip:", t);

  });
}


// ================= RATING OPTIMIZED =================
async function submitRating(userId, targetUserId, score) {

  const ref = doc(db, "users", targetUserId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();

  const newCount = (data.ratingCount || 0) + 1;
  const newAvg =
    ((data.ratingAvg || 0) * (newCount - 1) + score) / newCount;

  await updateDoc(ref, {
    ratingAvg: Number(newAvg.toFixed(2)),
    ratingCount: newCount
  });
}
