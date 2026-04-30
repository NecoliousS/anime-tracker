// ============================================
// FIREBASE CONFIG
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyBJdMh4KAScijprkAvLtYos-8e8wvMkh00",
  authDomain: "media-tracker-6b815.firebaseapp.com",
  projectId: "media-tracker-6b815",
  storageBucket: "media-tracker-6b815.firebasestorage.app",
  messagingSenderId: "925225760281",
  appId: "1:925225760281:web:8dedd870eead7dc43cdc88",
  measurementId: "G-DY6SQ0CPT8"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// CONSTANTS
// ============================================

const ANIME_KEY = 'tracker_anime';
const MANGA_KEY = 'tracker_manga';
const TV_KEY = 'tracker_tv';
const MOVIES_KEY = 'tracker_movies';

const BANNED_USERNAMES = ['Zer0H20', 'Zer0', 'Nik0', 'niko', 'zero', 'H20'];
const PROFANITY_LIST = ['fuck', 'shit', 'bitch', 'nigger', 'nigga', 'fag', 'retard', 'cunt', 'whore', 'slut', 'chink', 'kike', 'dyke', 'tranny', 'spic', 'wetback', 'coon', 'jigaboo', 'raghead', 'towelhead', 'cameljockey'];

let currentUser = null;
let currentUsername = null;
let appMode = localStorage.getItem('tracker_mode') || 'solo';
let currentDetailItem = null;
let currentDetailType = null;

// ============================================
// UTILS
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// MODE TOGGLE
// ============================================

function initModeToggle() {
    const toggleContainer = document.getElementById('mode-toggle');
    if (!toggleContainer) return;
    
    toggleContainer.style.display = 'block';
    
    const soloBtn = document.getElementById('mode-solo');
    const communityBtn = document.getElementById('mode-community');
    
    if (!soloBtn || !communityBtn) return;
    
    if (appMode === 'solo') {
        soloBtn.classList.add('active');
        communityBtn.classList.remove('active');
        document.body.classList.add('solo-mode');
    } else {
        soloBtn.classList.remove('active');
        communityBtn.classList.add('active');
        document.body.classList.remove('solo-mode');
    }
    
    soloBtn.addEventListener('click', () => {
        appMode = 'solo';
        localStorage.setItem('tracker_mode', 'solo');
        soloBtn.classList.add('active');
        communityBtn.classList.remove('active');
        document.body.classList.add('solo-mode');
        showToast('Solo Mode activated');
        updateDetailModal();
    });
    
    communityBtn.addEventListener('click', () => {
        if (!currentUser) {
            showToast('Login required for Community Mode');
            showLoginModal();
            return;
        }
        appMode = 'community';
        localStorage.setItem('tracker_mode', 'community');
        soloBtn.classList.remove('active');
        communityBtn.classList.add('active');
        document.body.classList.remove('solo-mode');
        showToast('Community Mode activated');
        updateDetailModal();
    });
}

// ============================================
// AUTH STATE
// ============================================

auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        await loadUsername();
        await loadUserData();
    } else {
        currentUsername = null;
        if (appMode === 'community') {
            appMode = 'solo';
            localStorage.setItem('tracker_mode', 'solo');
        }
    }
    updateAuthUI();
    renderList();
    initModeToggle();
});

async function loadUsername() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('usernames').doc(currentUser.uid).get();
        if (doc.exists) {
            currentUsername = doc.data().username;
        }
    } catch (err) {
        console.error('Load username error:', err);
    }
}

// ============================================
// USERNAME SYSTEM
// ============================================

function showUsernameModal() {
    closeLoginModal();
    
    const modal = document.createElement('div');
    modal.id = 'username-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:2000; display:flex; align-items:center; justify-content:center;';
    
    modal.innerHTML = `
        <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:2rem; max-width:400px; width:90%; text-align:center;">
            <h2 style="color:#fff; margin-bottom:0.5rem;">Choose Your Username</h2>
            <p style="color:#666; margin-bottom:1.5rem;">This will be visible to other users. You cannot change it later.</p>
            
            <input type="text" id="username-input" placeholder="Enter username..." maxlength="20" style="width:100%; padding:0.75rem; background:#0a0a0a; border:1px solid #333; border-radius:8px; color:#e0e0e0; margin-bottom:1rem; text-align:center;">
            
            <div id="username-error" style="color:#ef4444; font-size:0.85rem; margin-bottom:1rem; display:none;"></div>
            
            <button id="save-username-btn" style="width:100%; padding:0.75rem; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">
                Save Username
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        const saveBtn = document.getElementById('save-username-btn');
        if (saveBtn) saveBtn.addEventListener('click', saveUsername);
        
        // Allow Enter key
        const input = document.getElementById('username-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') saveUsername();
            });
            input.focus();
        }
    }, 0);
}

async function saveUsername() {
    const input = document.getElementById('username-input');
    const errorDiv = document.getElementById('username-error');
    const username = input.value.trim();
    
    if (!username) {
        errorDiv.textContent = 'Username cannot be empty';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (username.length < 3) {
        errorDiv.textContent = 'Username must be at least 3 characters';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (username.length > 20) {
        errorDiv.textContent = 'Username must be 20 characters or less';
        errorDiv.style.display = 'block';
        return;
    }
    
    const lowerUsername = username.toLowerCase();
    for (const banned of BANNED_USERNAMES) {
        if (lowerUsername === banned.toLowerCase()) {
            errorDiv.textContent = 'This username is reserved';
            errorDiv.style.display = 'block';
            return;
        }
    }
    
    for (const word of PROFANITY_LIST) {
        if (lowerUsername.includes(word)) {
            errorDiv.textContent = 'Username contains inappropriate language';
            errorDiv.style.display = 'block';
            return;
        }
    }
    
    // Check if username taken
    try {
        const existing = await db.collection('usernames').where('username', '==', username).get();
        if (!existing.empty) {
            // Make sure it's not the current user
            const doc = existing.docs[0];
            if (doc.id !== currentUser.uid) {
                errorDiv.textContent = 'Username already taken';
                errorDiv.style.display = 'block';
                return;
            }
        }
        
        await db.collection('usernames').doc(currentUser.uid).set({
            username: username,
            email: currentUser.email,
            createdAt: new Date()
        });
        
        currentUsername = username;
        closeUsernameModal();
        showToast('Welcome, ' + username + '!');
        updateAuthUI();
    } catch (err) {
        errorDiv.textContent = 'Error saving username. Try again.';
        errorDiv.style.display = 'block';
        console.error(err);
    }
}

function closeUsernameModal() {
    const modal = document.getElementById('username-modal');
    if (modal) modal.remove();
}

// Force username before community actions
async function ensureUsername() {
    if (!currentUser) {
        showToast('Login required');
        showLoginModal();
        return false;
    }
    if (!currentUsername) {
        await loadUsername();
        if (!currentUsername) {
            showUsernameModal();
            return false;
        }
    }
    return true;
}

// ============================================
// LOGIN MODAL
// ============================================

function updateAuthUI() {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;
    
    if (currentUser) {
        const displayName = currentUsername || currentUser.email?.split('@')[0] || 'User';
        authContainer.innerHTML = `
            <span style="color:#a0a0a0; font-size:0.85rem;">${displayName}</span>
            <button id="logout-btn" class="btn btn-danger" style="padding:0.4rem 0.8rem; font-size:0.8rem;">Logout</button>
        `;
        setTimeout(() => {
            const btn = document.getElementById('logout-btn');
            if (btn) btn.addEventListener('click', logout);
        }, 0);
    } else {
        authContainer.innerHTML = `
            <button id="login-btn" class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem;">Login</button>
        `;
        setTimeout(() => {
            const btn = document.getElementById('login-btn');
            if (btn) btn.addEventListener('click', showLoginModal);
        }, 0);
    }
}

function showLoginModal() {
    closeLoginModal();
    
    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2000; display:flex; align-items:center; justify-content:center;';
    
    modal.innerHTML = `
        <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:2rem; max-width:400px; width:90%; position:relative;">
            <h2 style="margin-bottom:1.5rem; color:#fff;">Login</h2>
            
            <button id="google-login-btn" style="width:100%; padding:0.75rem; background:#4285f4; color:white; border:none; border-radius:8px; cursor:pointer; margin-bottom:1rem; font-weight:600;">
                Sign in with Google
            </button>
            
            <div style="text-align:center; color:#666; margin:1rem 0;">or</div>
            
            <input type="email" id="login-email" placeholder="Email" style="width:100%; padding:0.75rem; background:#0a0a0a; border:1px solid #333; border-radius:8px; color:#e0e0e0; margin-bottom:0.5rem;">
            <input type="password" id="login-password" placeholder="Password" style="width:100%; padding:0.75rem; background:#0a0a0a; border:1px solid #333; border-radius:8px; color:#e0e0e0; margin-bottom:1rem;">
            
            <button id="email-login-btn" style="width:100%; padding:0.75rem; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none; border-radius:8px; cursor:pointer; margin-bottom:0.5rem; font-weight:600;">
                Sign In
            </button>
            <button id="signup-btn" style="width:100%; padding:0.75rem; background:transparent; color:#667eea; border:1px solid #667eea; border-radius:8px; cursor:pointer; font-weight:600;">
                Create Account
            </button>
            
            <button id="close-modal-btn" style="position:absolute; top:1rem; right:1rem; background:none; border:none; color:#666; font-size:1.5rem; cursor:pointer;">×</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
        document.getElementById('close-modal-btn').addEventListener('click', closeLoginModal);
        document.getElementById('google-login-btn').addEventListener('click', loginWithGoogle);
        document.getElementById('email-login-btn').addEventListener('click', loginWithEmail);
        document.getElementById('signup-btn').addEventListener('click', signupWithEmail);
    }, 0);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeLoginModal();
    });
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.remove();
}

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(async (result) => {
            closeLoginModal();
            const doc = await db.collection('usernames').doc(result.user.uid).get();
            if (!doc.exists) {
                showUsernameModal();
            } else {
                currentUsername = doc.data().username;
                showToast('Signed in as ' + currentUsername);
                updateAuthUI();
            }
        })
        .catch(err => {
            showToast('Google sign-in failed: ' + err.message);
        });
}

function loginWithEmail() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showToast('Please enter email and password');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then(async (result) => {
            closeLoginModal();
            const doc = await db.collection('usernames').doc(result.user.uid).get();
            if (!doc.exists) {
                showUsernameModal();
            } else {
                currentUsername = doc.data().username;
                showToast('Signed in as ' + currentUsername);
                updateAuthUI();
            }
        })
        .catch(err => {
            showToast('Sign in failed: ' + err.message);
        });
}

function signupWithEmail() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showToast('Please enter email and password');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            closeLoginModal();
            showUsernameModal();
        })
        .catch(err => {
            showToast('Sign up failed: ' + err.message);
        });
}

function logout() {
    auth.signOut().then(() => {
        currentUsername = null;
        showToast('Logged out');
    });
}

// ============================================
// USER DATA
// ============================================

async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const doc = await db.collection('users').doc(currentUser.uid).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.anime) localStorage.setItem(ANIME_KEY, JSON.stringify(data.anime));
            if (data.manga) localStorage.setItem(MANGA_KEY, JSON.stringify(data.manga));
            if (data.tv) localStorage.setItem(TV_KEY, JSON.stringify(data.tv));
            if (data.movies) localStorage.setItem(MOVIES_KEY, JSON.stringify(data.movies));
        }
        renderList();
    } catch (err) {
        console.error('Load user data error:', err);
    }
}

async function saveUserData() {
    if (!currentUser) return;
    
    try {
        await db.collection('users').doc(currentUser.uid).set({
            anime: JSON.parse(localStorage.getItem(ANIME_KEY) || '[]'),
            manga: JSON.parse(localStorage.getItem(MANGA_KEY) || '[]'),
            tv: JSON.parse(localStorage.getItem(TV_KEY) || '[]'),
            movies: JSON.parse(localStorage.getItem(MOVIES_KEY) || '[]'),
            lastUpdated: new Date()
        });
    } catch (err) {
        console.error('Save user data error:', err);
    }
}

// ============================================
// LOCALSTORAGE
// ============================================

function loadList(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
    saveUserData();
}

function getPageKey() {
    const path = window.location.pathname;
    if (path.includes('anime.html')) return { key: ANIME_KEY, type: 'anime', defaultStatus: 'Plan to Watch' };
    if (path.includes('manga.html')) return { key: MANGA_KEY, type: 'manga', defaultStatus: 'Plan to Read' };
    if (path.includes('tv.html')) return { key: TV_KEY, type: 'tv', defaultStatus: 'Plan to Watch' };
    if (path.includes('movies.html')) return { key: MOVIES_KEY, type: 'movies', defaultStatus: 'Plan to Watch' };
    return null;
}

// ============================================
// ADD / REMOVE / UPDATE
// ============================================

function addToList(key, item) {
    const list = loadList(key);
    if (list.some(i => i.mal_id === item.mal_id)) {
        showToast('Already in your list!');
        return false;
    }
    list.push(item);
    saveList(key, list);
    showToast('Added successfully!');
    return true;
}

function removeFromList(key, malId) {
    let list = loadList(key);
    list = list.filter(item => item.mal_id !== malId);
    saveList(key, list);
    renderList();
    showToast('Removed');
}

function updateStatus(key, malId, newStatus) {
    const list = loadList(key);
    const item = list.find(i => i.mal_id === malId);
    if (item) {
        item.status = newStatus;
        saveList(key, list);
        renderList();
    }
}

function updateScore(key, malId, newScore) {
    const list = loadList(key);
    const item = list.find(i => i.mal_id === malId);
    if (item) {
        item.score = parseInt(newScore) || null;
        saveList(key, list);
    }
}

// ============================================
// RENDER CARDS
// ============================================

function createCard(item, pageInfo) {
    const statusClass = getStatusClass(item.status);
    const statusOptions = pageInfo.type === 'manga' 
        ? ['Reading', 'Completed', 'Dropped', 'Plan to Read']
        : ['Watching', 'Completed', 'Dropped', 'Plan to Watch'];
    
    return `
        <div class="card" data-status="${item.status}" onclick="openDetailModal(${item.mal_id}, '${pageInfo.type}')">
            <img src="${item.image_url}" alt="${item.title}" class="card-image" onerror="this.src='https://via.placeholder.com/200x280/2a2a2a/667eea?text=${encodeURIComponent(item.title)}'">
            <div class="card-body">
                <div class="card-title">${item.title}</div>
                <div class="card-meta">
                    <span class="status-badge ${statusClass}">${item.status}</span>
                    <span class="score-display">★ ${item.score || '-'}</span>
                </div>
                <div class="card-actions" onclick="event.stopPropagation()">
                    <select onchange="updateStatus('${pageInfo.key}', ${item.mal_id}, this.value)">
                        ${statusOptions.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                    <select onchange="updateScore('${pageInfo.key}', ${item.mal_id}, this.value)">
                        <option value="">Score</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${item.score === n ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </div>
                <button class="btn btn-danger" style="width:100%; margin-top:0.5rem;" onclick="event.stopPropagation(); removeFromList('${pageInfo.key}', ${item.mal_id})">Delete</button>
            </div>
        </div>
    `;
}

function getStatusClass(status) {
    if (status === 'Watching' || status === 'Reading') return 'status-watching';
    if (status === 'Completed') return 'status-completed';
    if (status === 'Dropped') return 'status-dropped';
    return 'status-plan';
}

function renderList() {
    const pageInfo = getPageKey();
    if (!pageInfo) return;
    
    const list = loadList(pageInfo.key);
    const container = document.getElementById(pageInfo.type + '-list');
    const emptyState = document.getElementById('empty-state');
    
    const activeFilter = document.querySelector('.filter-btn.active');
    const filter = activeFilter ? activeFilter.dataset.filter : 'all';
    
    const filtered = filter === 'all' ? list : list.filter(item => item.status === filter);
    
    if (filtered.length === 0) {
        if (container) container.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        if (container) container.innerHTML = filtered.map(item => createCard(item, pageInfo)).join('');
    }
}

// ============================================
// DETAIL MODAL
// ============================================

async function openDetailModal(malId, type) {
    const pageInfo = getPageKey();
    const list = loadList(pageInfo.key);
    const item = list.find(i => i.mal_id === malId);
    if (!item) return;
    
    currentDetailItem = item;
    currentDetailType = type;
    
    const modal = document.createElement('div');
    modal.id = 'detail-modal';
    modal.className = 'detail-modal';
    
    modal.innerHTML = `
        <div class="detail-content">
            <button class="close-detail" onclick="closeDetailModal()">×</button>
            
            <div class="detail-left">
                <img src="${item.image_url}" alt="${item.title}" class="detail-image-large" onerror="this.src='https://via.placeholder.com/300x420/2a2a2a/667eea?text=${encodeURIComponent(item.title)}'">
                <div class="community-only">
                    <div class="rating-header">
                        <span>Your Rating</span>
                    </div>
                    <div class="star-rating-input" id="user-star-rating">
                        <button class="star-input" data-rating="1">★</button>
                        <button class="star-input" data-rating="2">★</button>
                        <button class="star-input" data-rating="3">★</button>
                        <button class="star-input" data-rating="4">★</button>
                        <button class="star-input" data-rating="5">★</button>
                    </div>
                    <button id="submit-rating-btn" class="btn btn-primary" style="display:none;">Submit Rating</button>
                </div>
            </div>
            
            <div class="detail-right">
                <h2>${item.title}</h2>
                <div class="detail-meta-info">
                    <span class="status-badge ${getStatusClass(item.status)}">${item.status}</span>
                    <span>Your Score: ★ ${item.score || 'Not rated'}</span>
                </div>
                
                <div class="community-only">
                    <div class="community-rating">
                        <div class="rating-header">
                            <span>Community Rating</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:1rem;">
                            <span class="rating-stars" id="community-stars">★★★★★</span>
                            <div>
                                <div class="rating-score" id="community-score">0.0</div>
                                <div class="rating-count" id="community-count">0 ratings</div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="recommendations" class="recommendations" style="display:none;">
                        <h3>Because you rated this, you might like:</h3>
                        <div id="rec-list" class="list-grid"></div>
                    </div>
                    
                    <div class="comments-section">
                        <h3>Comments</h3>
                        <div id="detail-comments-list"></div>
                        <div class="comment-input-area">
                            <input type="text" id="detail-comment-input" placeholder="Add a comment...">
                            <button id="detail-post-comment" class="btn btn-primary">Post</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup star rating
    setupStarRating();
    
    // Load community data
    await loadCommunityData(malId, type);
    
    // Setup comment posting
    setTimeout(() => {
        const postBtn = document.getElementById('detail-post-comment');
        if (postBtn) postBtn.addEventListener('click', () => postDetailComment(malId, type));
    }, 0);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDetailModal();
    });
    
    // Update based on mode
    updateDetailModal();
}

function closeDetailModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) modal.remove();
    currentDetailItem = null;
    currentDetailType = null;
}

function updateDetailModal() {
    const modal = document.getElementById('detail-modal');
    if (!modal) return;
    
    const communitySections = modal.querySelectorAll('.community-only');
    communitySections.forEach(section => {
        section.style.display = appMode === 'community' ? 'block' : 'none';
    });
}

function setupStarRating() {
    const stars = document.querySelectorAll('.star-input');
    let selectedRating = 0;
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            stars.forEach((s, index) => {
                if (index < selectedRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
            document.getElementById('submit-rating-btn').style.display = 'block';
        });
    });
    
    const submitBtn = document.getElementById('submit-rating-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const hasUsername = await ensureUsername();
            if (!hasUsername) return;
            if (selectedRating === 0) return;
            
            await submitRating(currentDetailItem.mal_id, currentDetailType, selectedRating);
        });
    }
}

async function loadCommunityData(malId, type) {
    if (appMode !== 'community') return;
    
    try {
        // Load all ratings for this item
        const ratingsSnapshot = await db.collection('ratings')
            .where('malId', '==', malId.toString())
            .where('type', '==', type)
            .get();
        
        if (!ratingsSnapshot.empty) {
            // Count UNIQUE users (fixes old duplicate docs)
            const userRatings = {};
            ratingsSnapshot.forEach(doc => {
                const data = doc.data();
                // Keep the latest rating per user
                const existing = userRatings[data.userId];
                const currentTime = data.timestamp?.toMillis?.() || 0;
                if (!existing || currentTime > existing.time) {
                    userRatings[data.userId] = { rating: data.rating, time: currentTime };
                }
            });
            
            const uniqueCount = Object.keys(userRatings).length;
            const total = Object.values(userRatings).reduce((sum, u) => sum + u.rating, 0);
            const avg = uniqueCount > 0 ? (total / uniqueCount).toFixed(1) : '0.0';
            
            document.getElementById('community-score').textContent = avg;
            document.getElementById('community-count').textContent = uniqueCount + ' rating' + (uniqueCount !== 1 ? 's' : '');
            
            // Update stars display
            const stars = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
            document.getElementById('community-stars').textContent = stars;
        }
        
        // Load current user's existing rating to show on stars
        if (currentUser) {
            const userRatingSnap = await db.collection('ratings')
                .where('userId', '==', currentUser.uid)
                .where('malId', '==', malId.toString())
                .where('type', '==', type)
                .get();
            
            if (!userRatingSnap.empty) {
                // Get the latest one
                let latestRating = 0;
                let latestTime = 0;
                userRatingSnap.forEach(doc => {
                    const data = doc.data();
                    const time = data.timestamp?.toMillis?.() || 0;
                    if (time >= latestTime) {
                        latestTime = time;
                        latestRating = data.rating;
                    }
                });
                
                const stars = document.querySelectorAll('.star-input');
                stars.forEach((s, index) => {
                    if (index < latestRating) s.classList.add('active');
                    else s.classList.remove('active');
                });
                const submitBtn = document.getElementById('submit-rating-btn');
                submitBtn.textContent = 'Update Rating';
                submitBtn.style.display = 'block';
            }
        }
        
        // Load comments
        await loadDetailComments(malId, type);
    } catch (err) {
        console.error('Load community data error:', err);
    }
}

async function submitRating(malId, type, rating) {
    try {
        // Check if user already rated this item
        const existing = await db.collection('ratings')
            .where('userId', '==', currentUser.uid)
            .where('malId', '==', malId.toString())
            .where('type', '==', type)
            .get();
        
        if (!existing.empty) {
            // Update existing rating (latest one)
            let latestDoc = existing.docs[0];
            let latestTime = existing.docs[0].data().timestamp?.toMillis?.() || 0;
            
            existing.forEach(doc => {
                const time = doc.data().timestamp?.toMillis?.() || 0;
                if (time > latestTime) {
                    latestTime = time;
                    latestDoc = doc;
                }
            });
            
            await db.collection('ratings').doc(latestDoc.id).update({
                rating: rating,
                username: currentUsername,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Rating updated!');
        } else {
            // Add new rating
            await db.collection('ratings').add({
                malId: malId.toString(),
                type: type,
                rating: rating,
                userId: currentUser.uid,
                username: currentUsername,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Rating submitted!');
        }
        
        await loadCommunityData(malId, type);
        
        // Show recommendations
        document.getElementById('recommendations').style.display = 'block';
        loadRecommendations(type, malId);
    } catch (err) {
        showToast('Failed to submit rating');
        console.error(err);
    }
}

async function loadRecommendations(type, malId) {
    const recList = document.getElementById('rec-list');
    if (!recList) return;
    
    recList.innerHTML = '<p style="color:#666;">Loading recommendations...</p>';
    
    if (type === 'anime' || type === 'manga') {
        try {
            // Add timeout for slow API
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`https://api.jikan.moe/v4/${type}/${malId}/recommendations`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const data = await response.json();
            
            if (!data.data || data.data.length === 0) {
                recList.innerHTML = '<p style="color:#666;">No recommendations available</p>';
                return;
            }
            
            // Show top 4 recommendations
            const recs = data.data.slice(0, 4);
            
            recList.innerHTML = recs.map(rec => {
                const entry = rec.entry;
                return `
                    <div class="card" style="cursor:pointer;" onclick="window.open('${entry.url}', '_blank')">
                        <img src="${entry.images?.jpg?.image_url || 'https://via.placeholder.com/200x280/2a2a2a/667eea?text=No+Image'}" alt="${entry.title}" class="card-image" style="height:200px;">
                        <div class="card-body">
                            <div class="card-title">${entry.title}</div>
                            <div class="card-meta">
                                <span class="score-display">Recommended</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('Recommendations error:', err);
            recList.innerHTML = '<p style="color:#666;">Recommendations unavailable</p>';
        }
    } else {
        recList.innerHTML = '<p style="color:#666;">Recommendations available for Anime & Manga only</p>';
    }
}

async function loadDetailComments(malId, type) {
    const list = document.getElementById('detail-comments-list');
    if (!list) return;
    
    list.innerHTML = '<p style="color:#666;">Loading comments...</p>';
    
    try {
        const snapshot = await db.collection('comments')
            .where('malId', '==', malId.toString())
            .where('type', '==', type)
            .get();
        
        if (snapshot.empty) {
            list.innerHTML = '<p style="color:#666;">No comments yet. Be the first!</p>';
            return;
        }
        
        // Sort client-side by timestamp (newest first)
        const comments = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
                const timeA = a.timestamp?.toMillis?.() || 0;
                const timeB = b.timestamp?.toMillis?.() || 0;
                return timeB - timeA;
            });
        
        list.innerHTML = comments.map(data => {
            return `
                <div class="comment">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(data.username || 'Anonymous')}</span>
                        <span class="comment-time">${data.timestamp?.toDate?.().toLocaleDateString() || ''}</span>
                    </div>
                    <p class="comment-text">${escapeHtml(data.text)}</p>
                    <div class="comment-actions">
                        <button onclick="replyToComment('${data.id}')">Reply</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Comment load error:', err);
        list.innerHTML = '<p style="color:#666;">Error loading comments</p>';
    }
}

async function postDetailComment(malId, type) {
    const hasUsername = await ensureUsername();
    if (!hasUsername) return;
    
    const input = document.getElementById('detail-comment-input');
    const text = input.value.trim();
    if (!text) return;
    
    try {
        await db.collection('comments').add({
            malId: malId.toString(),
            type: type,
            text: text,
            userId: currentUser.uid,
            username: currentUsername,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        input.value = '';
        await loadDetailComments(malId, type);
    } catch (err) {
        showToast('Failed to post comment');
        console.error(err);
    }
}

function replyToComment(commentId) {
    showToast('Reply feature coming soon');
}

// ============================================
// FILTERS
// ============================================

function setupFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderList();
        });
    });
}

// ============================================
// TOAST
// ============================================

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ============================================
// SEARCH / BROWSE
// ============================================

let currentSearchType = 'anime';

function setupSearch() {
    const btnAnime = document.getElementById('search-anime');
    const btnManga = document.getElementById('search-manga');
    const btnTv = document.getElementById('search-tv');
    const btnMovies = document.getElementById('search-movies');
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (!searchBtn) return;
    
    const setActive = (type, placeholder) => {
        currentSearchType = type;
        [btnAnime, btnManga, btnTv, btnMovies].forEach(b => b.classList.remove('active'));
        
        if (type === 'anime') btnAnime.classList.add('active');
        if (type === 'manga') btnManga.classList.add('active');
        if (type === 'tv') btnTv.classList.add('active');
        if (type === 'movies') btnMovies.classList.add('active');
        
        searchInput.placeholder = placeholder;
    };
    
    btnAnime.addEventListener('click', () => setActive('anime', 'Search for anime...'));
    btnManga.addEventListener('click', () => setActive('manga', 'Search for manga...'));
    btnTv.addEventListener('click', () => setActive('tv', 'Search for TV show...'));
    btnMovies.addEventListener('click', () => setActive('movies', 'Search for movie...'));
    
    searchBtn.addEventListener('click', () => performSearch());
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

async function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    const resultsContainer = document.getElementById('search-results');
    const loading = document.getElementById('loading');
    const noResults = document.getElementById('no-results');
    
    resultsContainer.innerHTML = '';
    noResults.classList.add('hidden');
    loading.classList.remove('hidden');
    
    if (currentSearchType === 'anime' || currentSearchType === 'manga') {
        try {
            const response = await fetch(`https://api.jikan.moe/v4/${currentSearchType}?q=${encodeURIComponent(query)}&limit=24`);
            const data = await response.json();
            
            loading.classList.add('hidden');
            
            if (!data.data || data.data.length === 0) {
                noResults.classList.remove('hidden');
                return;
            }
            
            resultsContainer.innerHTML = data.data.map(item => createJikanCard(item)).join('');
            
        } catch (error) {
            loading.classList.add('hidden');
            showToast('Search failed. Try again.');
            console.error(error);
        }
    } else {
        try {
            const searchUrl = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&type=${currentSearchType === 'tv' ? 'series' : 'movie'}&apikey=thewdb`;
            
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            loading.classList.add('hidden');
            
            if (data.Response === 'False' || !data.Search || data.Search.length === 0) {
                showManualEntry(query, resultsContainer);
                return;
            }
            
            resultsContainer.innerHTML = data.Search.map(item => createOmdbCard(item)).join('');
            
        } catch (error) {
            loading.classList.add('hidden');
            showManualEntry(query, resultsContainer);
        }
    }
}

function createJikanCard(item) {
    const title = item.title || item.title_english || 'Unknown Title';
    const image = item.images?.jpg?.image_url || 'https://via.placeholder.com/200x280/2a2a2a/666?text=No+Image';
    const malId = item.mal_id;
    
    return `
        <div class="card">
            <img src="${image}" alt="${title}" class="card-image" onerror="this.src='https://via.placeholder.com/200x280/2a2a2a/666?text=No+Image'">
            <div class="card-body">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span class="score-display">★ ${item.score || 'N/A'}</span>
                </div>
                <button class="btn btn-add" style="width:100%;" onclick="addFromBrowse(${malId}, '${title.replace(/'/g, "\\'")}', '${image}', '${currentSearchType}')">
                    + Add to List
                </button>
            </div>
        </div>
    `;
}

function createOmdbCard(item) {
    const title = item.Title || 'Unknown Title';
    const image = item.Poster !== 'N/A' ? item.Poster : `https://via.placeholder.com/200x280/2a2a2a/667eea?text=${encodeURIComponent(title)}`;
    const year = item.Year || '';
    const imdbId = item.imdbID || Date.now();
    
    return `
        <div class="card">
            <img src="${image}" alt="${title}" class="card-image" onerror="this.src='https://via.placeholder.com/200x280/2a2a2a/667eea?text=${encodeURIComponent(title)}'">
            <div class="card-body">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span class="score-display">${year}</span>
                </div>
                <button class="btn btn-add" style="width:100%;" onclick="addFromBrowse('${imdbId}', '${title.replace(/'/g, "\\'")}', '${image}', '${currentSearchType}')">
                    + Add to ${currentSearchType === 'tv' ? 'TV Shows' : 'Movies'}
                </button>
            </div>
        </div>
    `;
}

function showManualEntry(query, container) {
    const manualId = Date.now();
    container.innerHTML = `
        <div class="card">
            <img src="https://via.placeholder.com/200x280/2a2a2a/667eea?text=${encodeURIComponent(query)}" alt="${query}" class="card-image">
            <div class="card-body">
                <div class="card-title">${query}</div>
                <div class="card-meta">
                    <span class="score-display">Manual Entry</span>
                </div>
                <button class="btn btn-add" style="width:100%;" onclick="addFromBrowse(${manualId}, '${query.replace(/'/g, "\\'")}', 'https://via.placeholder.com/200x280/2a2a2a/667eea?text=${encodeURIComponent(query)}', '${currentSearchType}')">
                    + Add to ${currentSearchType === 'tv' ? 'TV Shows' : 'Movies'}
                </button>
            </div>
        </div>
    `;
}

function addFromBrowse(malId, title, imageUrl, type) {
    let key, defaultStatus;
    
    if (type === 'anime') {
        key = ANIME_KEY;
        defaultStatus = 'Plan to Watch';
    } else if (type === 'manga') {
        key = MANGA_KEY;
        defaultStatus = 'Plan to Read';
    } else if (type === 'tv') {
        key = TV_KEY;
        defaultStatus = 'Plan to Watch';
    } else if (type === 'movies') {
        key = MOVIES_KEY;
        defaultStatus = 'Plan to Watch';
    }
    
    const item = {
        mal_id: malId,
        title: title,
        image_url: imageUrl,
        status: defaultStatus,
        score: null
    };
    
    addToList(key, item);
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const pageInfo = getPageKey();
    if (pageInfo) {
        setupFilters();
        renderList();
    }
    
    if (document.getElementById('search-results')) {
        setupSearch();
    }
});
