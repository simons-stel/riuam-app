// --- 1. Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBafhddrBu5i270pqEDl8i3slqJFt9k8mw",
  authDomain: "riuam-auth.firebaseapp.com",
  projectId: "riuam-auth",
  storageBucket: "riuam-auth.firebasestorage.app",
  messagingSenderId: "35798755753",
  appId: "1:35798755753:web:d73b26ddc3209b83657cb8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
if (typeof emailjs !== 'undefined') emailjs.init("LoBixMLh3PrsylJYx");

let cropper;
let finalIconBase64 = ""; 
let userEmail = "";

const log = (id, msg, color = "gray") => {
    const el = document.getElementById(id);
    if (el) { el.innerText = msg; el.style.color = color; }
};

// --- 2. ページ読み込み時の処理 ---
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (window.location.pathname.includes("profile.html")) {
        if (urlParams.get('mode') === 'discord') {
            const discordData = JSON.parse(sessionStorage.getItem("discord_temp"));
            if (discordData) {
                document.getElementById('userId').value = discordData.userId || "";
                document.getElementById('displayName').value = discordData.dName || "";
                document.getElementById('icon-preview').src = discordData.icon || "";
                finalIconBase64 = discordData.icon || "";
                userEmail = discordData.email || "discord_user@riuam.com";
            }
        } else {
            userEmail = sessionStorage.getItem("temp_email") || "";
        }
    }
};

// --- 3. 画像クロップ処理 ---
const iconInput = document.getElementById('icon-input');
if (iconInput) {
    iconInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const modal = document.getElementById('cropper-modal');
            const img = document.getElementById('cropper-image');
            img.src = ev.target.result;
            modal.style.display = 'flex';
            if (cropper) cropper.destroy();
            cropper = new Cropper(img, { aspectRatio: 1, viewMode: 1 });
        };
        reader.readAsDataURL(file);
    };
}

const cropBtn = document.getElementById('cropDoneBtn');
if (cropBtn) {
    cropBtn.onclick = () => {
        finalIconBase64 = cropper.getCroppedCanvas({ width: 150, height: 150 }).toDataURL('image/jpeg', 0.7);
        document.getElementById('icon-preview').src = finalIconBase64;
        document.getElementById('cropper-modal').style.display = 'none';
    };
}

// --- 4. メール認証 (mail.html) ---
const sendCodeBtn = document.getElementById('sendCodeBtn');
if (sendCodeBtn) {
    sendCodeBtn.onclick = async () => {
        const email = document.getElementById('email').value;
        if (!email) return log("statusLog", "Please enter email", "#ff4d4d");
        userEmail = email;
        log("statusLog", "Requesting...", "#888");
        try {
            const code = Math.random().toString(36).substring(2, 6).toUpperCase();
            await db.collection("auth_codes").doc(email).set({ code, expiresAt: Date.now() + 900000 });
            emailjs.send("service_ovxb8ri", "template_jxmdzfj", { to_email: email, message: code })
                .then(() => log("statusLog", "Code sent!", "#4dff4d"));
        } catch (e) { log("statusLog", "Error occurred", "#ff4d4d"); }
    };
}

const verifyBtn = document.getElementById('verifyBtn');
if (verifyBtn) {
    verifyBtn.onclick = async () => {
        const input = document.getElementById('codeInput').value;
        const doc = await db.collection("auth_codes").doc(userEmail).get();
        if (doc.exists && doc.data().code === input.toUpperCase()) {
            sessionStorage.setItem("temp_email", userEmail);
            window.location.href = "profile.html"; 
        } else { log("statusLog", "Invalid code", "#ff4d4d"); }
    };
}

// --- 5. 最終登録 (profile.html) ---
const finalBtn = document.getElementById('finalSubmitBtn');
if (finalBtn) {
    finalBtn.onclick = async () => {
        const userId = document.getElementById('userId').value;
        const dName = document.getElementById('displayName').value;
        const pass = document.getElementById('password').value;
        const conf = document.getElementById('confirmPassword').value;
        const keepLogin = document.getElementById('keepLogin').checked;

        if (pass.length < 6 || pass !== conf || !userId || !dName) return log("profileLog", "Check your inputs", "#ff4d4d");

        log("profileLog", "Saving...", "#888");
        try {
            await db.collection("user").doc(userId).set({
                userId, displayName: dName, password: pass, email: userEmail,
                icon: finalIconBase64, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            const session = JSON.stringify({ userId, dName, icon: finalIconBase64 });
            sessionStorage.setItem("riuam_session", session);
            if (keepLogin) localStorage.setItem("riuam_session", session);
            window.location.href = "home.html";
        } catch (e) { log("profileLog", "Failed", "#ff4d4d"); }
    };
}