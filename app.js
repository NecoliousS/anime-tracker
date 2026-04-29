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

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// LOCALSTORAGE KEYS (fallback when not logged in)
// ============================================

const ANIME_KEY = 'tracker_anime';
const MANGA_KEY = 'tracker_manga';
const TV_KEY = 'tracker_tv';
const MOVIES_KEY = 'tracker_movies';

let currentUser = null;

// ============================================
// AUTH STATE LISTENER
// ============================================

auth.onAuthStateChanged((user) => {
    currentUser = user;
    updateAuthUI();
    if (user) {
        loadUserData();
    } else {
        renderList();
    }
});

function updateAuthUI() {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;
    
    if (currentUser) {
        authContainer.innerHTML = `
            <span style="color:#a0a0a0; font-size:0.85rem;">${currentUser.email || currentUser.displayName}</span>
            <button class="btn btn-danger" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="logout()">Logout</button>
        `;
    } else {
        authContainer.innerHTML = `
            <button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="showLoginModal()">Login</button>
        `;
    }
}

// ============================================
// LOGIN / LOGOUT
// ============================================

function showLoginModal() {
    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2000; display:flex; align-items:center; justify-content:center;">
            <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:2rem; max-width:400px; width:90%; position:relative;">
                <h2 style="margin-bottom:1.5rem; color:#fff;">Login</h2>
                
                <button onclick="loginWithGoogle()" style="width:100%; padding:0.75rem; background:#4285f4; color:white; border:none; border-radius:8px; cursor:pointer; margin-bottom:1rem; font-weight:600;">
                    Sign in with Google
                </button>
                
                <div style="text-align:center; color:#666; margin:1rem 0;">or</div>
                
                <input type="email" id="login-email" placeholder="Email" style="width:100%; padding:0.75rem; background:#0a0a0a; border:1px solid #333; border-radius:8px; color:#e0e0e0; margin-bottom:0.5rem;">
                <input type="password" id="login-password" placeholder="Password" style="width:100%; padding:0.75rem; background:#0a0a0a; border:1px solid #333; border-radius:8px; color:#e0e0e0; margin-bottom:1rem;">
                
                <button onclick="loginWithEmail()" style="width:100%; padding:0.75rem; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none; border-radius:8px; cursor:pointer; margin-bottom:0.5rem; font-weight:600;">
                    Sign In
                </button>
                <button onclick="signupWithEmail()" style="width:100%; padding:0.75rem; background:transparent; color:#667eea; border:1px solid #667eea; border-radius:8px; cursor:pointer; font-weight:600;">
                    Create Account
                </button>
                
                <button onclick="closeLoginModal()" style="position:absolute; top:1rem; right:1rem; background:none; border:none; color:#666; font-size:1.5rem; cursor:pointer;">×</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.remove();
}

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        showToast(err.message);
    });
}

function loginWithEmail() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => closeLoginModal())
        .catch(err => showToast(err.message));
}

function signupWithEmail() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => closeLoginModal())
        .catch(err => showToast(err.message));
}

function logout() {
    auth.signOut();
    showToast('Logged out');
}

// ============================================
// USER DATA (Firestore)
// ============================================

async function loadUserData() {
    if (!currentUser) return;
    
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists) {
        const data = doc.data();
        if (data.anime) localStorage.setItem(ANIME_KEY, JSON.stringify(data.anime));
        if (data.manga) localStorage.setItem(MANGA_KEY, JSON.stringify(data.manga));
        if (data.tv) localStorage.setItem(TV_KEY, JSON.stringify(data.tv));
        if (data.movies) localStorage.setItem(MOVIES_KEY, JSON.stringify(data.movies));
    }
    renderList();
}

async function saveUserData() {
    if (!currentUser) return;
    
    await db.collection('users').doc(currentUser.uid).set({
        anime: JSON.parse(localStorage.getItem(ANIME_KEY) || '[]'),
        manga: JSON.parse(localStorage.getItem(MANGA_KEY) || '[]'),
        tv: JSON.parse(localStorage.getItem(TV_KEY) || '[]'),
        movies: JSON.parse(localStorage.getItem(MOVIES_KEY) || '[]'),
        lastUpdated: new Date()
    });
}

// ============================================
// LOCALSTORAGE WRAPPER (auto-syncs to Firestore)
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
        <div class="card" data-status="${item.status}">
            <img src="${item.image_url}" alt="${item.title}" class="card-image" onerror="this.src='https://via.placeholder.com/200x280/2a2a2a/667eea?text=${encodeURIComponent(item.title)}'">
            <div class="card-body">
                <div class="card-title">${item.title}</div>
                <div class="card-meta">
                    <span class="status-badge ${statusClass}">${item.status}</span>
                    <span class="score-display">★ ${item.score || '-'}</span>
                </div>
                <div class="card-actions">
                    <select onchange="updateStatus('${pageInfo.key}', ${item.mal_id}, this.value)">
                        ${statusOptions.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                    <select onchange="updateScore('${pageInfo.key}', ${item.mal_id}, this.value)">
                        <option value="">Score</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${item.score === n ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </div>
                <button class="btn btn-danger" style="width:100%; margin-top:0.5rem;" onclick="removeFromList('${pageInfo.key}', ${item.mal_id})">Delete</button>
                <button class="btn btn-primary" style="width:100%; margin-top:0.5rem;" onclick="showComments(${item.mal_id}, '${pageInfo.type}')">💬 Comments</button>
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
// COMMENTS (Firestore)
// ============================================

async function showComments(malId, type) {
    const modal = document.createElement('div');
    modal.id = 'comments-modal';
    modal.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:2000; display:flex; align-items:center; justify-content:center;">
            <div style="background:#1a1a1a; border:1px solid #333; border-radius:12px; padding:2rem; max-width:500px; width:90%; max-height:80vh; overflow-y:auto; position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h2 style="color:#fff;">Comments</h2>
                    <button onclick="closeCommentsModal()" style="background:none; border:none; color:#666; font-size:1.5rem; cursor:pointer;">×</button>
                </div>
                <div id="comments-list" style="margin-bottom:1rem;"></div>
                <div style="display:flex; gap:0.5rem;">
                    <input type="text" id="comment-input" placeholder="Add a comment..." style="flex:1; padding:0.75rem; background:#0a0a0a; border:1px solid #333; border-radius:8px; color:#e0e0e0;">
                    <button onclick="addComment(${malId}, '${type}')" class="btn btn-primary">Post</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    loadComments(malId, type);
}

function closeCommentsModal() {
    const modal = document.getElementById('comments-modal');
    if (modal) modal.remove();
}

async function loadComments(malId, type) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<p style="color:#666;">Loading...</p>';
    
    const snapshot = await db.collection('comments')
        .where('malId', '==', malId.toString())
        .where('type', '==', type)
        .orderBy('timestamp', 'desc')
        .get();
    
    if (snapshot.empty) {
        list.innerHTML = '<p style="color:#666;">No comments yet. Be the first!</p>';
        return;
    }
    
    list.innerHTML = snapshot.docs.map(doc => {
        const data = doc.data();
        return `
            <div style="background:#0a0a0a; border:1px solid #333; border-radius:8px; padding:1rem; margin-bottom:0.5rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <span style="color:#667eea; font-weight:600; font-size:0.85rem;">${data.userName || 'Anonymous'}</span>
                    <span style="color:#666; font-size:0.75rem;">${data.timestamp?.toDate().toLocaleDateString() || ''}</span>
                </div>
                <p style="color:#e0e0e0; margin:0;">${data.text}</p>
            </div>
        `;
    }).join('');
}

async function addComment(malId, type) {
    if (!currentUser) {
        showToast('Please login to comment');
        showLoginModal();
        return;
    }
    
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;
    
    await db.collection('comments').add({
        malId: malId.toString(),
        type: type,
        text: text,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    input.value = '';
    loadComments(malId, type);
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
    }, 2000);
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
