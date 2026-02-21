{\rtf1\ansi\ansicpg1252\cocoartf2818
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;\f1\fnil\fcharset178 GeezaPro;\f2\fnil\fcharset0 AppleColorEmoji;
}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import \{ initializeApp \} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";\
import \{\
  getAuth,\
  createUserWithEmailAndPassword,\
  signInWithEmailAndPassword,\
  onAuthStateChanged,\
  signOut\
\} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";\
\
import \{\
  getFirestore,\
  doc,\
  setDoc,\
  getDoc,\
  serverTimestamp\
\} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";\
\
// 1) 
\f1 \'d6\'da
\f0  
\f1 \'c8\'ed\'c7\'e4\'c7\'ca
\f0  
\f1 \'e3\'d4\'d1\'e6\'da\'df
\f0  
\f1 \'e5\'e4\'c7
\f0  (
\f1 \'e3\'e4
\f0  Firebase Console -> Web app config)\
const firebaseConfig = \{\
  apiKey: "AIzaSyDphYF6FM7ILBTtQYz1USvJz53rmYVprUk",\
  authDomain: "tal3a-app-35b4c.firebaseapp.com",\
  projectId: "tal3a-app-35b4c",\
  storageBucket: "tal3a-app-35b4c.firebasestorage.app",\
  messagingSenderId: "831003684441",\
  appId: "1:831003684441:web:993308a130917ba2f38b48",\
  measurementId: "G-20L21KQ745"\
\};\
\
const app = initializeApp(firebaseConfig);\
const analytics = getAnalytics(app);\
const auth = getAuth(app);\
const db = getFirestore(app);\
\
// 
\f1 \'da\'e4\'c7\'d5\'d1
\f0  UI\
const authBox = document.getElementById("authBox");\
const appBox = document.getElementById("appBox");\
const userLabel = document.getElementById("userLabel");\
const roleLabel = document.getElementById("roleLabel");\
const uidLabel = document.getElementById("uidLabel");\
\
const signupBtn = document.getElementById("signupBtn");\
const loginBtn = document.getElementById("loginBtn");\
const logoutBtn = document.getElementById("logoutBtn");\
\
function getSelectedRole() \{\
  return document.querySelector('input[name="role"]:checked')?.value || "rider";\
\}\
\
async function ensureUserProfile(user, name, role) \{\
  const ref = doc(db, "users", user.uid);\
  const snap = await getDoc(ref);\
\
  if (!snap.exists()) \{\
    await setDoc(ref, \{\
      uid: user.uid,\
      name: name || "
\f1 \'c8\'cf\'e6\'e4
\f0  
\f1 \'c7\'d3\'e3
\f0 ",\
      role,                 // rider | driver\
      ratingAvg: 5,\
      ratingCount: 0,\
      createdAt: serverTimestamp()\
    \});\
  \}\
\}\
\
signupBtn.addEventListener("click", async () => \{\
  try \{\
    const name = document.getElementById("name").value.trim();\
    const email = document.getElementById("email").value.trim();\
    const password = document.getElementById("password").value.trim();\
    const role = getSelectedRole();\
\
    if (!email || !password) return alert("
\f1 \'c7\'df\'ca\'c8
\f0  
\f1 \'c7\'e1\'c5\'ed\'e3\'ed\'e1
\f0  
\f1 \'e6\'c7\'e1\'d1\'de\'e3
\f0  
\f1 \'c7\'e1\'d3\'d1\'ed
\f0 .");\
\
    const cred = await createUserWithEmailAndPassword(auth, email, password);\
    await ensureUserProfile(cred.user, name, role);\
\
    alert("
\f1 \'ca\'e3
\f0  
\f1 \'c5\'e4\'d4\'c7\'c1
\f0  
\f1 \'c7\'e1\'cd\'d3\'c7\'c8
\f0  
\f2 \uc0\u9989 
\f0 ");\
  \} catch (e) \{\
    alert(e.message);\
  \}\
\});\
\
loginBtn.addEventListener("click", async () => \{\
  try \{\
    const email = document.getElementById("loginEmail").value.trim();\
    const password = document.getElementById("loginPassword").value.trim();\
    if (!email || !password) return alert("
\f1 \'c7\'df\'ca\'c8
\f0  
\f1 \'c7\'e1\'c5\'ed\'e3\'ed\'e1
\f0  
\f1 \'e6\'c7\'e1\'d1\'de\'e3
\f0  
\f1 \'c7\'e1\'d3\'d1\'ed
\f0 .");\
\
    await signInWithEmailAndPassword(auth, email, password);\
  \} catch (e) \{\
    alert(e.message);\
  \}\
\});\
\
logoutBtn.addEventListener("click", async () => \{\
  await signOut(auth);\
\});\
\
onAuthStateChanged(auth, async (user) => \{\
  if (!user) \{\
    authBox.classList.remove("hidden");\
    appBox.classList.add("hidden");\
    return;\
  \}\
\
  // 
\f1 \'c7\'de\'d1\'c3
\f0  
\f1 \'cf\'e6\'d1
\f0  
\f1 \'c7\'e1\'e3\'d3\'ca\'ce\'cf\'e3
\f0  
\f1 \'e3\'e4
\f0  Firestore\
  const ref = doc(db, "users", user.uid);\
  const snap = await getDoc(ref);\
\
  const profile = snap.exists() ? snap.data() : \{ role: "rider", name: user.email \};\
\
  authBox.classList.add("hidden");\
  appBox.classList.remove("hidden");\
\
  userLabel.textContent = profile.name || user.email;\
  roleLabel.textContent = profile.role || "rider";\
  uidLabel.textContent = user.uid;\
\});\
}