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
    if (user) {
        activeUser = user;
        document.getElementById('l-btn').style.display = 'none';
        document.getElementById('u-avatar').style.display = 'block';
        document.getElementById('u-avatar').src = user.photoURL;
        document.getElementById('coin-ui').style.display = 'flex';
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
        await ref.set({ coins: 500, referID: myID, joined: Date.now() });
        
        // Referral Logic Official
        const params = new URLSearchParams(window.location.search);
        const code = params.get('ref');
        if (code) {
            const masterQuery = await db.collection('users').where('referID', '==', code.toUpperCase()).get();
            if (!masterQuery.empty) {
                const masterDoc = masterQuery.docs[0];
                if (masterDoc.id !== user.uid) {
                    // Update both with 6000 coins
                    await db.collection('users').doc(masterDoc.id).update({ 
                        coins: firebase.firestore.FieldValue.increment(6000) 
                    });
                    await ref.update({ 
                        coins: firebase.firestore.FieldValue.increment(6000) 
                    });
                }
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
    let timeLeft = 30; // Official 30 seconds
    
    overlay.style.display = 'flex';
    const win = window.open(`https://youtube.com/watch?v=${vid}`, '_blank');
    
    const timer = setInterval(async () => {
        timeLeft--;
        display.innerText = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            overlay.style.display = 'none';
            if (win) win.close();
            
            // Add 50 coins for watching
            await db.collection('users').doc(activeUser.uid).update({ 
                coins: firebase.firestore.FieldValue.increment(50) 
            });
            showToast("Success! 50 Coins Added.");
        }
    }, 1000);
}

function loadVideos() {
    const feed = document.getElementById('video-feed');
    db.collection('campaigns').limit(15).onSnapshot(q => {
        feed.innerHTML = '';
        if(q.empty) {
            feed.innerHTML = '<p style="text-align:center; padding:20px; opacity:0.5;">No videos available...</p>';
            return;
        }
        q.forEach(doc => {
            const d = doc.data();
            feed.innerHTML += `
                <div class="v-card">
                    <div class="thumb">
                        <img src="https://img.youtube.com/vi/${d.vid}/maxresdefault.jpg">
                        <i class="fas fa-play play-icon"></i>
                    </div>
                    <div class="btn-area">
                        <button class="btn-watch" onclick="startWatching('${d.vid}')">
                            <i class="fab fa-youtube"></i> WATCH & EARN 50 COINS
                        </button>
                    </div>
                </div>`;
        });
    });
}

function copyReferral() {
    const id = document.getElementById('ref-code-id').innerText;
    const officialLink = window.location.origin + window.location.pathname + "?ref=" + id;
    navigator.clipboard.writeText(officialLink).then(() => {
        showToast("Official Referral Link Copied!");
    });
}

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.className = "show";
    setTimeout(() => { t.className = t.className.replace("show", ""); }, 3000);
}

function showRefer() {
    const panel = document.getElementById('ref-panel');
    panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
}

function openAuth() { document.getElementById('auth-modal').style.display = 'flex'; }
async function googleSignIn() { 
    try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        document.getElementById('auth-modal').style.display = 'none';
    } catch(e) { alert("Sign in failed. Try again."); }
}
