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
        await ref.set({ coins: 450, referID: myID, joined: Date.now() });
        
        const params = new URLSearchParams(window.location.search);
        const code = params.get('ref');
        if (code) {
            const master = await db.collection('users').where('referID', '==', code.toUpperCase()).get();
            if (!master.empty && master.docs[0].id !== user.uid) {
                // Reward both master and new user with 6000 coins
                await db.collection('users').doc(master.docs[0].id).update({ coins: firebase.firestore.FieldValue.increment(6000) });
                await ref.update({ coins: firebase.firestore.FieldValue.increment(6000) });
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

function startWatching(vid) {
    if(!activeUser) return openAuth();
    const overlay = document.getElementById('timer-overlay');
    const display = document.getElementById('cd-ui');
    const times = [25, 30, 32];
    let timeLeft = times[Math.floor(Math.random() * times.length)];
    overlay.style.display = 'flex';
    const win = window.open(`https://youtube.com/watch?v=${vid}`, '_blank');
    const timer = setInterval(async () => {
        timeLeft--;
        display.innerText = timeLeft < 10 ? '0' + timeLeft : timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            overlay.style.display = 'none';
            if (win) win.close();
            await db.collection('users').doc(activeUser.uid).update({ coins: firebase.firestore.FieldValue.increment(25) });
        }
    }, 1000);
}

function loadVideos() {
    const feed = document.getElementById('video-feed');
    db.collection('campaigns').limit(10).onSnapshot(q => {
        feed.innerHTML = '';
        q.forEach(doc => {
            const d = doc.data();
            feed.innerHTML += `
                <div class="v-card">
                    <div class="thumb"><img src="https://img.youtube.com/vi/${d.vid}/mqdefault.jpg"></div>
                    <div class="btn-area">
                        <button class="btn-watch" onclick="startWatching('${d.vid}')">
                            <i class="fab fa-youtube"></i> WATCH & EARN 25
                        </button>
                    </div>
                </div>`;
        });
    });
}

function copyReferral() {
    const id = document.getElementById('ref-code-id').innerText;
    const link = window.location.origin + window.location.pathname + "?ref=" + id;
    navigator.clipboard.writeText(link).then(() => {
        const toast = document.getElementById("toast");
        toast.className = "show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    });
}

function openAuth() { document.getElementById('auth-modal').style.display = 'flex'; }
function toggleMenu() { const m = document.getElementById('logout-menu'); m.style.display = (m.style.display === 'block') ? 'none' : 'block'; }
async function googleSignIn() { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); document.getElementById('auth-modal').style.display = 'none'; }
async function logout() { await auth.signOut(); document.getElementById('logout-menu').style.display = 'none'; }
