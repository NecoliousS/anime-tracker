// ============================================
// LOCALSTORAGE DATA MANAGEMENT
// ============================================

// Keys for localStorage
const ANIME_KEY = 'anime_tracker_anime';
const MANGA_KEY = 'anime_tracker_manga';

// Load list from localStorage
function loadList(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// Save list to localStorage
function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
}

// Get the correct key based on page type
function getCurrentKey() {
    const path = window.location.pathname;
    if (path.includes('anime.html')) return ANIME_KEY;
    if (path.includes('manga.html')) return MANGA_KEY;
    return null;
}

// ============================================
// ADD / REMOVE / UPDATE ITEMS
// ============================================

// Add item to a list (used by browse page)
function addToList(key, item) {
    const list = loadList(key);
    
    // Check if already in list
    if (list.some(i => i.mal_id === item.mal_id)) {
        showToast('Already in your list!');
        return false;
    }
    
    list.push(item);
    saveList(key, list);
    showToast('Added successfully!');
    return true;
}

// Remove item from list
function removeFromList(key, malId) {
    let list = loadList(key);
    list = list.filter(item => item.mal_id !== malId);
    saveList(key, list);
    renderList();
    showToast('Removed');
}

// Update item status
function updateStatus(key, malId, newStatus) {
    const list = loadList(key);
    const item = list.find(i => i.mal_id === malId);
    if (item) {
        item.status = newStatus;
        saveList(key, list);
        renderList();
    }
}

// Update item score
function updateScore(key, malId, newScore) {
    const list = loadList(key);
    const item = list.find(i => i.mal_id === malId);
    if (item) {
        item.score = parseInt(newScore);
        saveList(key, list);
    }
}

// ============================================
// RENDER LIST CARDS
// ============================================

// Create HTML for a single card
function createCard(item, type) {
    const statusClass = getStatusClass(item.status);
    const statusOptions = type === 'anime' 
        ? ['Watching', 'Completed', 'Dropped', 'Plan to Watch']
        : ['Reading', 'Completed', 'Dropped', 'Plan to Read'];
    
    return `
        <div class="card" data-status="${item.status}">
            <img src="${item.image_url}" alt="${item.title}" class="card-image" onerror="this.src='https://via.placeholder.com/200x280/2a2a2a/666?text=No+Image'">
            <div class="card-body">
                <div class="card-title">${item.title}</div>
                <div class="card-meta">
                    <span class="status-badge ${statusClass}">${item.status}</span>
                    <span class="score-display">★ ${item.score || '-'}</span>
                </div>
                <div class="card-actions">
                    <select onchange="updateStatus('${type === 'anime' ? ANIME_KEY : MANGA_KEY}', ${item.mal_id}, this.value)">
                        ${statusOptions.map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                    <select onchange="updateScore('${type === 'anime' ? ANIME_KEY : MANGA_KEY}', ${item.mal_id}, this.value)">
                        <option value="">Score</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${item.score === n ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </div>
                <button class="btn btn-danger" style="width:100%; margin-top:0.5rem;" onclick="removeFromList('${type === 'anime' ? ANIME_KEY : MANGA_KEY}', ${item.mal_id})">Delete</button>
            </div>
        </div>
    `;
}

// Get CSS class for status badge
function getStatusClass(status) {
    if (status === 'Watching' || status === 'Reading') return 'status-watching';
    if (status === 'Completed') return 'status-completed';
    if (status === 'Dropped') return 'status-dropped';
    return 'status-plan';
}

// Render the list based on current filter
function renderList() {
    const key = getCurrentKey();
    if (!key) return;
    
    const type = key === ANIME_KEY ? 'anime' : 'manga';
    const list = loadList(key);
    const container = document.getElementById(type + '-list');
    const emptyState = document.getElementById('empty-state');
    
    // Get active filter
    const activeFilter = document.querySelector('.filter-btn.active');
    const filter = activeFilter ? activeFilter.dataset.filter : 'all';
    
    // Filter items
    const filtered = filter === 'all' ? list : list.filter(item => item.status === filter);
    
    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        container.innerHTML = filtered.map(item => createCard(item, type)).join('');
    }
}

// ============================================
// FILTER BUTTONS
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
// TOAST NOTIFICATIONS
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
// INITIALIZE PAGES
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Setup anime/manga list pages
    if (document.getElementById('anime-list') || document.getElementById('manga-list')) {
        setupFilters();
        renderList();
    }
});
