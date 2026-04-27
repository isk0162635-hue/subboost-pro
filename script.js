const firebaseConfig = {
    apiKey: "AIzaSyBDc7r6FtE6wdFwouFcRsWehgoq0QQwV1o",
    authDomain: "subboost-pro.firebaseapp.com",
    projectId: "subboost-pro",
    storageBucket: "subboost-pro.firebasestorage.app",
    messagingSenderId: "812839582734",
    appId: "1:812839582734:web:b1925a39845fbba3bd505f"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let user = null;
let currentTab = "views";

function showAuth() { document.getElementById("authModal").style.display = "flex"; }
function closeAuth() { document.getElementById("authModal").style.display = "none"; }
function openPost() { if(!user) return showAuth(); document.getElementById("postModal").style.display = "flex"; }
function closePost() { document.getElementById("postModal").style.display = "none"; }

async function googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        closeAuth();
    } catch(e) { alert("Login failed"); }
}

auth.onAuthStateChanged(async (u) => {
    if (u) {
        user = u;
        document.getElementById("loginBtn").style.display = "none";
        document.getElementById("coinBox").style.display = "flex";
        document.getElementById("userImg").style.display = "block";
        document.getElementById("userImg").src = u.photoURL || "https://ui-avatars.com/api/?background=ff0000&color=fff&name=User";
        await initUser();
        refreshCoins();
    } else {
        user = null;
        document.getElementById("loginBtn").style.display = "block";
        document.getElementById("coinBox").style.display = "none";
        document.getElementById("userImg").style.display = "none";
    }
    fetchVideos();
});

async function initUser() {
    const ref = db.collection("users").doc(user.uid);
    const doc = await ref.get();
    if (!doc.exists) {
        await ref.set({ name: user.displayName, coins: 500 });
    }
}

async function refreshCoins() {
    if (!user) return;
    const doc = await db.collection("users").doc(user.uid).get();
    document.getElementById("coinAmount").innerText = doc.data().coins || 0;
}

async function createDemoVideos() {
    const snap = await db.collection("videos").limit(1).get();
    if (!snap.empty) return;
    
    const demos = [
        { vid: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", owner: "demo", likes: 0, subs: 0, likedBy: [], subscribedBy: [] },
        { vid: "9bZkp7q19f0", title: "Gangnam Style", owner: "demo", likes: 0, subs: 0, likedBy: [], subscribedBy: [] },
        { vid: "kJQP7kiw5Fk", title: "Despacito", owner: "demo", likes: 0, subs: 0, likedBy: [], subscribedBy: [] }
    ];
    for (const demo of demos) {
        await db.collection("videos").add(demo);
    }
}

function fetchVideos() {
    const box = document.getElementById("videoList");
    box.innerHTML = '<div style="text-align:center; padding:40px;">Loading...</div>';
    
    let query = db.collection("videos");
    if (currentTab === "my" && user) {
        query = query.where("owner", "==", user.uid);
    }
    
    query.onSnapshot(async (snap) => {
        box.innerHTML = "";
        if (snap.empty) {
            box.innerHTML = '<div style="text-align:center; padding:40px;">No videos found.<br><button class="login-btn" style="margin-top:15px;" onclick="openPost()">+ Upload</button></div>';
            return;
        }
        
        snap.forEach(doc => {
            const data = doc.data();
            box.appendChild(createVideoCard(doc.id, data));
        });
    });
}

function createVideoCard(id, data) {
    const div = document.createElement("div");
    div.className = "video-card";
    
    const isLiked = user ? (data.likedBy || []).includes(user.uid) : false;
    const isSubscribed = user ? (data.subscribedBy || []).includes(user.uid) : false;
    
    div.innerHTML = `
        <iframe class="yt-iframe" src="https://www.youtube.com/embed/${data.vid}?autoplay=0&modestbranding=1&rel=0" frameborder="0" allowfullscreen></iframe>
        <div class="card-body">
            <div class="reward-badge">
                <i class="fas fa-coins"></i> +20 per Like | +50 per Subscribe
            </div>
            <div class="video-title">${escapeHtml(data.title)}</div>
            <div class="action-buttons">
                <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="handleLike('${id}')">
                    <i class="fas fa-thumbs-up"></i> Like ${data.likes || 0}
                </button>
                <button class="action-btn subs-btn ${isSubscribed ? 'subscribed' : ''}" onclick="handleSubscribe('${id}')">
                    <i class="fab fa-youtube"></i> Subscribe ${data.subs || 0}
                </button>
            </div>
            ${data.owner !== user?.uid ? '<button class="btn-main" onclick="watchAndEarn(\''+id+'\')"><i class="fas fa-play"></i> Watch & Earn +10</button>' : '<div style="text-align:center; color:#666; padding:10px;">Your video</div>'}
        </div>
    `;
    return div;
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
    });
}

async function handleLike(videoId) {
    if (!user) return showAuth();
    
    const videoRef = db.collection("videos").doc(videoId);
    const video = await videoRef.get();
    const data = video.data();
    
    if (data.owner === user.uid) {
        alert("You cannot like your own video");
        return;
    }
    
    const likedBy = data.likedBy || [];
    if (likedBy.includes(user.uid)) {
        alert("You already liked this video");
        return;
    }
    
    await videoRef.update({
        likes: firebase.firestore.FieldValue.increment(1),
        likedBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
    });
    
    await db.collection("users").doc(user.uid).update({
        coins: firebase.firestore.FieldValue.increment(20)
    });
    
    await db.collection("users").doc(user.uid).collection("history").doc(videoId + "_like").set({
        type: "like", at: new Date()
    });
    
    refreshCoins();
    alert("+20 coins for liking!");
}

async function handleSubscribe(videoId) {
    if (!user) return showAuth();
    
    const videoRef = db.collection("videos").doc(videoId);
    const video = await videoRef.get();
    const data = video.data();
    
    if (data.owner === user.uid) {
        alert("You cannot subscribe to your own channel");
        return;
    }
    
    const subscribedBy = data.subscribedBy || [];
    if (subscribedBy.includes(user.uid)) {
        alert("You already subscribed");
        return;
    }
    
    await videoRef.update({
        subs: firebase.firestore.FieldValue.increment(1),
        subscribedBy: firebase.firestore.FieldValue.arrayUnion(user.uid)
    });
    
    await db.collection("users").doc(user.uid).update({
        coins: firebase.firestore.FieldValue.increment(50)
    });
    
    await db.collection("users").doc(user.uid).collection("history").doc(videoId + "_sub").set({
        type: "subscribe", at: new Date()
    });
    
    refreshCoins();
    alert("+50 coins for subscribing!");
}

async function watchAndEarn(videoId) {
    if (!user) return showAuth();
    
    const historyCheck = await db.collection("users").doc(user.uid).collection("history").doc(videoId + "_watch").get();
    if (historyCheck.exists) {
        alert("You already earned from this video");
        return;
    }
    
    const videoRef = db.collection("videos").doc(videoId);
    const video = await videoRef.get();
    const data = video.data();
    
    if (data.owner === user.uid) {
        alert("You cannot earn from your own video");
        return;
    }
    
    await db.collection("users").doc(user.uid).update({
        coins: firebase.firestore.FieldValue.increment(10)
    });
    
    await db.collection("users").doc(user.uid).collection("history").doc(videoId + "_watch").set({
        type: "watch", at: new Date()
    });
    
    refreshCoins();
    alert("+10 coins for watching!");
}

async function savePost() {
    if (!user) return showAuth();
    
    const url = document.getElementById("postUrl").value.trim();
    const title = document.getElementById("postTitle").value.trim();
    
    let vid = "";
    if (url.includes("v=")) vid = url.split("v=")[1].split("&")[0];
    else if (url.includes("youtu.be/")) vid = url.split("youtu.be/")[1].split("?")[0];
    else if (url.includes("shorts/")) vid = url.split("shorts/")[1].split("?")[0];
    
    if (!vid || !title) return alert("Invalid YouTube link");
    
    const userDoc = await db.collection("users").doc(user.uid).get();
    if (userDoc.data().coins < 300) return alert("Need 300 coins to post");
    
    await db.collection("users").doc(user.uid).update({
        coins: firebase.firestore.FieldValue.increment(-300)
    });
    
    await db.collection("videos").add({
        vid, title, owner: user.uid, likes: 0, subs: 0, likedBy: [], subscribedBy: []
    });
    
    alert("Video posted!");
    closePost();
    refreshCoins();
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");
    fetchVideos();
}

createDemoVideos();
window.onclick = (e) => { if(e.target.classList.contains('modal')) e.target.style.display = 'none'; };