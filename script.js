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

let curUser = null;
let curTab = 'view';
let curTask = null;

db.collection('users').onSnapshot(s => {
    const el = document.getElementById('st-users');
    if (el) el.innerText = s.size + 1400;
});
db.collection('campaigns').onSnapshot(s => {
    const el = document.getElementById('st-tasks');
    if (el) el.innerText = s.size + 52;
});

auth.onAuthStateChanged(async u => {
    if (u) {
        curUser = u;
        document.getElementById('login-gate').style.display = 'none';
        document.getElementById('nav-tabs').style.display = 'flex';
        document.getElementById('feed-ui').style.display = 'block';
        document.getElementById('fab-action').style.display = 'flex';
        document.getElementById('coin-ui').style.display = 'flex';
        document.getElementById('btn-exit').style.display = 'block';
        await initUser();
        renderList();
    } else {
        document.getElementById('login-gate').style.display = 'block';
        document.getElementById('nav-tabs').style.display = 'none';
        document.getElementById('feed-ui').style.display = 'none';
        document.getElementById('fab-action').style.display = 'none';
        document.getElementById('coin-ui').style.display = 'none';
        document.getElementById('btn-exit').style.display = 'none';
    }
});

async function handleLogin() {
    try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch (e) {
        console.error(e);
    }
}

async function handleLogout() {
    await auth.signOut();
    window.location.reload();
}

async function initUser() {
    const ref = db.collection('users').doc(curUser.uid);
    const doc = await ref.get();
    if (!doc.exists) {
        await ref.set({ 
            coins: 1000, 
            name: curUser.displayName, 
            createdAt: Date.now() 
        });
    }
    ref.onSnapshot(s => {
        if(s.exists) {
            const bal = document.getElementById('user-bal');
            if (bal) bal.innerText = s.data().coins.toLocaleString();
        }
    });
}

async function renderList() {
    const grid = document.getElementById('video-grid');
    const logs = await db.collection('users').doc(curUser.uid).collection('history').get();
    const doneIds = logs.docs.map(d => d.id);

    let baseQuery = db.collection('campaigns');
    if (curTab === 'mine') {
        baseQuery = baseQuery.where('owner', '==', curUser.uid);
    } else {
        baseQuery = baseQuery.where('type', '==', curTab);
    }

    baseQuery.orderBy('createdAt', 'desc').onSnapshot(snap => {
        grid.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            if (curTab !== 'mine') {
                if (data.owner === curUser.uid || doneIds.includes(doc.id) || data.qty <= 0) return;
            }

            grid.innerHTML += `
                <div class="video-item">
                    <div class="video-preview"><img src="https://img.youtube.com/vi/${data.vid}/hqdefault.jpg"></div>
                    <div class="video-info">
                        ${curTab === 'mine' ? 
                            `<div style="font-weight:700; color:#888; margin-bottom:12px;">Remaining: ${data.qty}</div>
                             <button class="main-btn btn-delete" onclick="deleteJob('${doc.id}')">Delete Project</button>` :
                            `<button class="main-btn" onclick="processJob('${doc.id}', '${data.vid}', '${data.type}')">
                                <i class="fab fa-youtube"></i> ${data.type === 'view' ? 'Watch' : 'Subscribe'} & Earn 25
                             </button>`
                        }
                    </div>
                </div>`;
        });
    });
}

function processJob(id, vid, type) {
    curTask = { id, vid, type };
    
    const youtubeLink = `https://www.youtube.com/watch?v=${vid}`;
    window.open(youtubeLink, '_blank');

    const lockScreen = document.getElementById('action-lock-screen');
    const lockTimer = document.getElementById('lock-timer-display');
    lockScreen.style.display = 'flex';
    
    let time = 15;
    lockTimer.innerText = time;

    const timer = setInterval(() => {
        time--;
        lockTimer.innerText = time;
        if (time <= 0) {
            clearInterval(timer);
            lockScreen.style.display = 'none';
            
            setTimeout(async () => {
                try {
                    const batch = db.batch();
                    const uRef = db.collection('users').doc(curUser.uid);
                    const cRef = db.collection('campaigns').doc(curTask.id);
                    const hRef = uRef.collection('history').doc(curTask.id);

                    batch.update(uRef, { coins: firebase.firestore.FieldValue.increment(25) });
                    batch.update(cRef, { qty: firebase.firestore.FieldValue.increment(-1) });
                    batch.set(hRef, { time: Date.now() });

                    await batch.commit();
                    alert("Successfully Added 25 Coins!");
                    renderList();
                } catch (e) {
                    console.error(e);
                }
            }, 500);
        }
    }, 1000);
}

async function deleteJob(id) {
    if(confirm("Delete?")) {
        await db.collection('campaigns').doc(id).delete();
        renderList();
    }
}

function setTab(t, event) {
    curTab = t;
    const links = document.querySelectorAll('.tab-link');
    links.forEach(el => el.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    renderList();
}

function updateCost() {
    const q = document.getElementById('inp-qty').value || 0;
    document.getElementById('cost-display').innerText = q * 125;
}

async function startCampaign() {
    const url = document.getElementById('inp-url').value;
    const type = document.getElementById('inp-type').value;
    const qtyInput = document.getElementById('inp-qty').value;
    const qty = parseInt(qtyInput);
    const cost = qty * 125;
    
    let vid = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0] || url.split('shorts/')[1]?.split('?')[0];
    
    if (!vid || isNaN(qty) || qty < 10) {
        return alert("Error: Please provide a valid YouTube link and minimum 10 quantity.");
    }

    const uDoc = await db.collection('users').doc(curUser.uid).get();
    if (uDoc.data().coins < cost) {
        return alert("No coins enough to launch this project.");
    }

    try {
        await db.collection('users').doc(curUser.uid).update({ 
            coins: firebase.firestore.FieldValue.increment(-cost) 
        });
        await db.collection('campaigns').add({ 
            vid, 
            type, 
            qty, 
            owner: curUser.uid, 
            createdAt: Date.now() 
        });
        alert("Live!");
        closeModal();
        renderList();
    } catch (e) {
        console.error(e);
    }
}

function openModal() { document.getElementById('post-modal-ui').style.display = 'block'; }
function closeModal() { document.getElementById('post-modal-ui').style.display = 'none'; }