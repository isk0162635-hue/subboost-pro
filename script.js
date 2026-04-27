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
let currentDocId = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        activeUser = user;
        document.getElementById('l-btn').style.display = 'none';
        document.getElementById('u-avatar').style.display = 'block';
        document.getElementById('u-avatar').src = user.photoURL;
        document.getElementById('coin-ui').style.display = 'flex';
        document.getElementById('ref-panel').style.display = 'block';
        await handleUser(user);
    } else {
        activeUser = null;
        document.getElementById('l-btn').style.display = 'block';
        document.getElementById('u-avatar').style.display = 'none';
        document.getElementById('coin-ui').style.display = 'none';
        document.getElementById('ref-panel').style.display = 'none';
    }
    loadVideos();
});

async function handleUser(user) {
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
        const myID = user.uid.substring(0, 8).toUpperCase();
        await ref.set({ coins: 1000, referID: myID });
        const params = new URLSearchParams(window.location.search);
        const code = params.get('ref');
        if (code) {
            const master = await db.collection('users').where('referID', '==', code.toUpperCase()).get();
            if (!master.empty) {
                await db.collection('users').doc(master.docs[0].id).update({ coins: firebase.firestore.FieldValue.increment(7000) });
                await ref.update({ coins: firebase.firestore.FieldValue.increment(7000) });
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
    db.collection('campaigns').where('views', '>', 0).onSnapshot(q => {
        feed.innerHTML = '';
        q.forEach(doc => {
            const d = doc.data();
            feed.innerHTML += `
                <div class="v-card">
                    <div class="thumb"><img src="https://img.youtube.com/vi/${d.vid}/mqdefault.jpg"></div>
                    <div class="btn-area">
                        <button class="btn-watch" onclick="openPlayer('${d.vid}', '${doc.id}')">
                            WATCH 50
                        </button>
                    </div>
                </div>`;
        });
    });
}

function openPlayer(vidId, docId) {
    if(!activeUser) return openAuth();
    currentDocId = docId;
    document.getElementById('video-modal').style.display = 'flex';
    if (player) { player.loadVideoById(vidId); } 
    else {
        player = new YT.Player('player', {
            height: '100%', width: '100%', videoId: vidId,
            playerVars: { 'autoplay': 1, 'controls': 0, 'disablekb': 1 },
            events: { 'onStateChange': (e) => { if(e.data == 1) startTimer(30); else clearInterval(timerInterval); } }
        });
    }
}

function startTimer(duration) {
    let timeLeft = duration;
    clearInterval(timerInterval);
    timerInterval = setInterval(async () => {
        timeLeft--;
        document.getElementById('progress').style.width = ((duration - timeLeft) / duration) * 100 + "%";
        document.getElementById('timer-display').innerText = timeLeft + "s";
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            await awardAndDeduct();
        }
    }, 1000);
}

async function awardAndDeduct() {
    await db.collection('users').doc(activeUser.uid).update({ coins: firebase.firestore.FieldValue.increment(50) });
    await db.collection('campaigns').doc(currentDocId).update({ views: firebase.firestore.FieldValue.increment(-1) });
    document.getElementById('video-modal').style.display = 'none';
    if(player) player.stopVideo();
}

function copyReferral() {
    const id = document.getElementById('ref-code-id').innerText;
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?ref=${id}`);
}

function openAuth() { document.getElementById('auth-modal').style.display = 'flex'; }
function toggleMenu() { const m = document.getElementById('logout-menu'); m.style.display = (m.style.display === 'block') ? 'none' : 'block'; }
async function googleSignIn() { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); document.getElementById('auth-modal').style.display = 'none'; }
async function logout() { await auth.signOut(); location.reload(); }
