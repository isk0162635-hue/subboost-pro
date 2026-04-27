const firebaseConfig = {
    apiKey: "AIzaSyBDc7r6FtE6wdFwouFcRsWehgoq0QQwV1o",
    authDomain: "subboost-pro.firebaseapp.com",
    projectId: "subboost-pro",
    storageBucket: "subboost-pro.appspot.com",
    messagingSenderId: "812839582734",
    appId: "1:812839582734:web:b1925a39845fbba3bd505f"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let activeUser = null;
let userCoins = 0;

auth.onAuthStateChanged(user => {
    if (user) {
        activeUser = user;
        document.getElementById('l-btn').style.display = 'none';
        document.getElementById('coin-ui').style.display = 'flex';
        db.collection('users').doc(user.uid).onSnapshot(s => {
            if(s.exists) {
                userCoins = s.data().coins;
                document.getElementById('user-bal').innerText = userCoins;
            } else {
                db.collection('users').doc(user.uid).set({ coins: 200 });
            }
        });
    } else {
        activeUser = null;
        document.getElementById('l-btn').style.display = 'block';
        document.getElementById('coin-ui').style.display = 'none';
    }
    loadVideos();
});

function switchTab(t) {
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    if(t === 'upload') {
        document.getElementById('upload-box').style.display = 'block';
        document.querySelector('.tab:nth-child(2)').classList.add('active');
    } else if(t === 'views') {
        document.getElementById('upload-box').style.display = 'none';
        document.querySelector('.tab:nth-child(1)').classList.add('active');
    } else {
        document.getElementById('upload-box').style.display = 'none';
        document.querySelector('.tab:nth-child(3)').classList.add('active');
        showToast("Referral link: share this app");
    }
}

async function uploadVideo() {
    if(!activeUser) {
        googleSignIn();
        return;
    }
    const vid = document.getElementById('yt-link').value.trim();
    if(userCoins < 150) return showToast("Need 150 coins");
    if(vid.length < 5) return showToast("Invalid ID");

    await db.collection('campaigns').add({ 
        vid: vid, 
        owner: activeUser.uid,
        timestamp: Date.now()
    });
    await db.collection('users').doc(activeUser.uid).update({
        coins: firebase.firestore.FieldValue.increment(-50)
    });
    showToast("Video shared! -50 coins");
    document.getElementById('yt-link').value = '';
}

let currentTimer = null;
let currentVideoId = null;

function startWatching(vid) {
    if(!activeUser) {
        googleSignIn();
        return;
    }
    currentVideoId = vid;
    const overlay = document.getElementById('timer-overlay');
    const display = document.getElementById('cd-ui');
    const actionArea = document.getElementById('action-area');
    let timeLeft = 20;

    overlay.style.display = 'flex';
    actionArea.style.display = 'none';
    document.getElementById('status-msg').innerHTML = 'Watch video on YouTube';
    display.innerText = timeLeft;

    window.open(`https://www.youtube.com/watch?v=${vid}`, '_blank');

    if(currentTimer) clearInterval(currentTimer);
    currentTimer = setInterval(() => {
        timeLeft--;
        display.innerText = timeLeft;
        if(timeLeft <= 0) {
            clearInterval(currentTimer);
            currentTimer = null;
            actionArea.style.display = 'block';
            document.getElementById('status-msg').innerHTML = 'Click DONE after Like & Subscribe';
        }
    }, 1000);
}

async function verifyAction() {
    if(!activeUser) return;
    await db.collection('users').doc(activeUser.uid).update({
        coins: firebase.firestore.FieldValue.increment(25)
    });
    document.getElementById('timer-overlay').style.display = 'none';
    showToast("+25 coins added");
    if(currentTimer) clearInterval(currentTimer);
    currentTimer = null;
}

function loadVideos() {
    const feed = document.getElementById('video-feed');
    db.collection('campaigns').orderBy('timestamp', 'desc').onSnapshot(q => {
        feed.innerHTML = '';
        q.forEach(doc => {
            const d = doc.data();
            if(!d.vid) return;
            feed.innerHTML += `
                <div class="v-card">
                    <div class="thumb"><img src="https://img.youtube.com/vi/${d.vid}/mqdefault.jpg" alt="thumbnail"></div>
                    <div style="padding:15px;"><button class="btn-main" onclick="startWatching('${d.vid}')">WATCH & EARN</button></div>
                </div>`;
        });
    });
}

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.className = "show";
    setTimeout(() => t.className = "", 3000);
}

async function googleSignIn() {
    try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch(e) {
        showToast("Login failed");
    }
}