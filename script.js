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

function showMessage(msg) {
    const toast = document.getElementById('toast-message');
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

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
        await initUserWithReferral();
        renderList();
    } else {
        document.getElementById('login-gate').style.display = 'block';
        document.getElementById('nav-tabs').style.display = 'none';
        document.getElementById('feed-ui').style.display = 'none';
        document.getElementById('fab-action').style.display = 'none';
        document.getElementById('coin-ui').style.display = 'none';
        document.getElementById('btn-exit').style.display = 'none';
        document.getElementById('ref-code-ui').style.display = 'none';
    }
});

async function handleLogin() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode && result.user) {
            sessionStorage.setItem('pendingRef', refCode);
        }
    } catch (e) {
        console.error(e);
        showMessage('Login failed');
    }
}

async function initUserWithReferral() {
    const ref = db.collection('users').doc(curUser.uid);
    const doc = await ref.get();
    const pendingRef = sessionStorage.getItem('pendingRef');
    
    if (!doc.exists) {
        let bonusCoins = 100;
        let referrerId = null;
        
        if (pendingRef) {
            const referrerQuery = await db.collection('users').where('referralCode', '==', pendingRef).get();
            if (!referrerQuery.empty) {
                const referrerDoc = referrerQuery.docs[0];
                referrerId = referrerDoc.id;
                bonusCoins = 100 + 5000;
                if (referrerId && referrerId !== curUser.uid) {
                    await db.collection('users').doc(referrerId).update({
                        coins: firebase.firestore.FieldValue.increment(2000)
                    });
                    showMessage('Referral applied! +5000 bonus coins!');
                }
            } else {
                showMessage('Invalid referral code, but you get 100 starting coins.');
            }
            sessionStorage.removeItem('pendingRef');
        }
        
        const refCode = generateReferralCode(curUser.uid);
        await ref.set({
            coins: bonusCoins,
            name: curUser.displayName,
            createdAt: Date.now(),
            referralCode: refCode,
            referredBy: referrerId || null,
            campaignsCreated: 0
        });
    } else {
        if (!doc.data().referralCode) {
            await ref.update({ referralCode: generateReferralCode(curUser.uid) });
        }
    }
    
    document.getElementById('ref-code-ui').style.display = 'flex';
    const userSnap = await db.collection('users').doc(curUser.uid).get();
    const code = userSnap.data().referralCode || 'N/A';
    document.getElementById('ref-code-text').innerText = code;
    
    db.collection('users').doc(curUser.uid).onSnapshot(s => {
        if(s.exists) {
            const bal = document.getElementById('user-bal');
            if (bal) bal.innerText = s.data().coins.toLocaleString();
        }
    });
}

function generateReferralCode(uid) {
    return uid.substring(0, 5) + Math.random().toString(36).substring(2, 7).toUpperCase();
}

function copyReferralCode() {
    const codeSpan = document.getElementById('ref-code-text');
    const code = codeSpan.innerText;
    const link = `${window.location.origin}${window.location.pathname}?ref=${code}`;
    navigator.clipboard.writeText(link);
    showMessage(`Referral link copied! Share: ${link}`);
}

async function handleLogout() {
    await auth.signOut();
    window.location.reload();
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
        let hasItems = false;
        snap.forEach(doc => {
            const data = doc.data();
            if (curTab !== 'mine') {
                if (data.owner === curUser.uid || doneIds.includes(doc.id) || data.qty <= 0) return;
            }
            hasItems = true;
            let rewardAmount = (data.type === 'view') ? 1 : 2;
            let actionText = (data.type === 'view') ? 'Watch & Earn +1' : 'Subscribe & Earn +2';
            
            grid.innerHTML += `
                <div class="video-item">
                    <div class="video-preview"><img src="https://img.youtube.com/vi/${data.vid}/hqdefault.jpg"></div>
                    <div class="video-info">
                        ${curTab === 'mine' ? 
                            `<div style="font-weight:700; color:#888; margin-bottom:12px;">Remaining: ${data.qty}</div>
                             <button class="main-btn btn-delete" onclick="deleteJob('${doc.id}')">Delete Project</button>` :
                            `<button class="main-btn" onclick="processJob('${doc.id}', '${data.vid}', '${data.type}')">
                                <i class="fab fa-youtube"></i> ${actionText}
                             </button>`
                        }
                    </div>
                </div>`;
        });
        if (!hasItems && curTab !== 'mine') {
            grid.innerHTML = `<div style="text-align:center; padding:60px 20px; color:#aaa;">No active campaigns. Create your own project!</div>`;
        }
        if (curTab === 'mine' && !hasItems) {
            grid.innerHTML = `<div style="text-align:center; padding:60px 20px; color:#aaa;">You have no active projects. Tap + to start a campaign.</div>`;
        }
    });
}

async function processJob(id, vid, type) {
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
                    const userRef = db.collection('users').doc(curUser.uid);
                    const campaignRef = db.collection('campaigns').doc(curTask.id);
                    const historyRef = userRef.collection('history').doc(curTask.id);
                    
                    const campaignSnap = await campaignRef.get();
                    if (!campaignSnap.exists || campaignSnap.data().qty <= 0) {
                        showMessage('This project is already completed.');
                        renderList();
                        return;
                    }
                    
                    const reward = (curTask.type === 'view') ? 1 : 2;
                    const batch = db.batch();
                    batch.update(userRef, { coins: firebase.firestore.FieldValue.increment(reward) });
                    batch.update(campaignRef, { qty: firebase.firestore.FieldValue.increment(-1) });
                    batch.set(historyRef, { time: Date.now(), reward: reward });
                    await batch.commit();
                    
                    showMessage(`+${reward} Coins earned!`);
                    renderList();
                } catch (e) {
                    console.error(e);
                    showMessage('Error processing action, please retry.');
                }
            }, 500);
        }
    }, 1000);
}

async function deleteJob(id) {
    if(confirm('Delete this project permanently?')) {
        await db.collection('campaigns').doc(id).delete();
        renderList();
        showMessage('Campaign removed.');
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
    const costPer = 125;
    document.getElementById('cost-display').innerText = q * costPer;
    checkCampaignLimit();
}

async function checkCampaignLimit() {
    const userSnap = await db.collection('users').doc(curUser.uid).get();
    const userData = userSnap.data();
    const userCoins = userData?.coins || 0;
    const campaignsCount = userData?.campaignsCreated || 0;
    const warningDiv = document.getElementById('campaign-warning');
    
    if (userCoins < 170 && campaignsCount >= 10) {
        warningDiv.innerText = 'Need at least 170 coins to share 10 videos!';
        warningDiv.style.color = '#ff4444';
    } else if (campaignsCount >= 10) {
        warningDiv.innerText = 'You have reached 10 video limit. Need 170+ coins to create more.';
        warningDiv.style.color = '#ff9800';
    } else {
        warningDiv.innerText = '';
    }
}

async function startCampaign() {
    const url = document.getElementById('inp-url').value.trim();
    const type = document.getElementById('inp-type').value;
    const qtyInput = document.getElementById('inp-qty').value;
    const qty = parseInt(qtyInput);
    const costPerUnit = 125;
    const cost = qty * costPerUnit;
    
    let vid = '';
    if (url.includes('v=')) {
        vid = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        vid = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('shorts/')) {
        vid = url.split('shorts/')[1]?.split('?')[0];
    }
    
    if (!vid || isNaN(qty) || qty < 10) {
        return showMessage('Valid YouTube link required & minimum 10 quantity.');
    }
    
    const userSnap = await db.collection('users').doc(curUser.uid).get();
    const userData = userSnap.data();
    const currentCoins = userData.coins;
    const campaignsCreated = userData.campaignsCreated || 0;
    
    if (currentCoins < cost) {
        return showMessage(`Insufficient coins! Need ${cost} coins.`);
    }
    
    if (campaignsCreated >= 10 && currentCoins < 170) {
        return showMessage(`Need at least 170 coins to create more than 10 videos. Current coins: ${currentCoins}`);
    }
    
    try {
        await db.collection('users').doc(curUser.uid).update({ 
            coins: firebase.firestore.FieldValue.increment(-cost),
            campaignsCreated: firebase.firestore.FieldValue.increment(1)
        });
        await db.collection('campaigns').add({ 
            vid, 
            type, 
            qty, 
            owner: curUser.uid, 
            createdAt: Date.now()
        });
        showMessage('Project launched! Visible in MY PROJECTS.');
        closeModal();
        renderList();
    } catch (e) {
        console.error(e);
        showMessage('Launch failed.');
    }
}

function openModal() {
    document.getElementById('post-modal-ui').style.display = 'block';
    document.getElementById('inp-url').value = '';
    document.getElementById('inp-qty').value = '10';
    updateCost();
    checkCampaignLimit();
}
function closeModal() { document.getElementById('post-modal-ui').style.display = 'none'; }