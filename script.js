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
let player;
let timerInterval;
let currentVidId = null;

auth.onAuthStateChanged(async (user) => {
    const lBtn = document.getElementById('l-btn');
    const uPic = document.getElementById('u-avatar');
    const cUi = document.getElementById('coin-ui');
    const rPanel = document.getElementById('ref-panel');
    if (user) {
        activeUser = user;
        lBtn.style.display = 'none';
        uPic.style.display = 'block';
        uPic.src = user.photoURL;
        cUi.style.display = 'flex';
        rPanel.style.display = 'block';
        await handleUser(user);
    } else {
        activeUser = null;
        lBtn.style.display = 'block';
        uPic.style.display = 'none';
        cUi.style.display = 'none';
        rPanel.style.display = 'none';
    }
    loadVideos();
});

async function handleUser(user) {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
        const myID = user.uid.substring(0, 8).toUpperCase();
        await ref.set({ coins: 500, referID: myID, joined: Date.now() });
        const params = new URLSearchParams(window.location.search);
        const code = params.get('ref');
        if (code) {
            const master = await db.collection('users').where('referID', '==', code.toUpperCase()).get();
            if (!master.empty && master.docs[0].id !== user.uid) {
                await db.collection('users').doc(master.docs[0].id).update({ coins: firebase.firestore.FieldValue.increment(5000) });
                await ref.update({ coins: firebase.firestore.FieldValue.increment(2000) });
            }
        }
    }
    ref.onSnapshot(s => {
        if(s.exists) {
            document.getElementById('user-bal').innerText = s.data().coins.toLocaleString();
            document.getElementById('ref-code-id').innerText = s.data().referID;
        }
    });
}

function loadVideos() {
    const feed = document.getElementById('video-feed');
    db.collection('campaigns').limit(15).onSnapshot(q => {
        feed.innerHTML = '';
        q.forEach(doc => {
            const d = doc.data();
            feed.innerHTML += `
                <div class="v-card">
                    <div class="thumb">
                        <img src="https://img.youtube.com/vi/${d.vid}/mqdefault.jpg">
                    </div>
                    <div class="btn-area">
                        <button class="btn-watch" onclick="openPlayer('${d.vid}')">
                            <i class="fab fa-youtube"></i> WATCH & EARN 50
                        </button>
                    </div>
                </div>`;
        });
    });
}

function openPlayer(vidId) {
    if(!activeUser) return openAuth();
    currentVidId = vidId;
    document.getElementById('video-modal').style.display = 'flex';
    
    if (player) {
        player.loadVideoById(vidId);
    } else {
        player = new YT.Player('player', {
            height: '100%',
            width: '100%',
            videoId: vidId,
            playerVars: { 'autoplay': 1, 'controls': 0, 'disablekb': 1, 'rel': 0 },
            events: { 'onStateChange': onPlayerStateChange }
        });
    }
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        startTimer(45);
    } else {
        clearInterval(timerInterval);
    }
}

function startTimer(duration) {
    let timeLeft = duration;
    const display = document.getElementById('timer-display');
    const progress = document.getElementById('progress');
    
    clearInterval(timerInterval);
    timerInterval = setInterval(async () => {
        timeLeft--;
        let pWidth = ((duration - timeLeft) / duration) * 100;
        progress.style.width = pWidth + "%";
        display.innerText = `Keep watching: ${timeLeft}s`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            await awardCoins();
        }
    }, 1000);
}

async function awardCoins() {
    try {
        await db.collection('users').doc(activeUser.uid).update({ 
            coins: firebase.firestore.FieldValue.increment(50) 
        });
        closePlayer();
        alert("Success! 50 Coins Added.");
    } catch (e) {
        console.error(e);
    }
}

function closePlayer() {
    if(player) player.stopVideo();
    clearInterval(timerInterval);
    document.getElementById('video-modal').style.display = 'none';
    document.getElementById('progress').style.width = "0%";
}

function copyReferral() {
    const id = document.getElementById('ref-code-id').innerText;
    const link = window.location.origin + window.location.pathname + "?ref=" + id;
    navigator.clipboard.writeText(link);
    alert("Referral link copied!");
}

function openAuth() { document.getElementById('auth-modal').style.display = 'flex'; }
function toggleMenu() { const m = document.getElementById('logout-menu'); m.style.display = (m.style.display === 'block') ? 'none' : 'block'; }
async function googleSignIn() { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); document.getElementById('auth-modal').style.display = 'none'; }
async function logout() { await auth.signOut(); document.getElementById('logout-menu').style.display = 'none'; }
