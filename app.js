// ============================================
// LOCALSTORAGE KEYS
// ============================================

const ANIME_KEY = 'tracker_anime';
const MANGA_KEY = 'tracker_manga';
const TV_KEY = 'tracker_tv';
const MOVIES_KEY = 'tracker_movies';

// Map page to key
function getPageKey() {
    const path = window.location.pathname;
    if (path.includes('anime.html')) return { key: ANIME_KEY, type: 'anime', defaultStatus: 'Plan to Watch' };
    if (path.includes('manga.html')) return { key: MANGA_KEY, type: 'manga', defaultStatus: 'Plan to Read' };
    if (path.includes('tv.html')) return { key: TV_KEY, type: 'tv', defaultStatus: 'Plan to Watch' };
    if (path.includes('movies.html')) return { key: MOVIES_KEY, type: 'movies', defaultStatus: 'Plan to Watch' };
    return null;
}

// ============================================
// LOAD / SAVE
// ============================================

function loadList(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
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
            <img src="${item.image_url}" alt="${item.title}" class="card-image" onerror="this.src='https://via.placeholder.com/200x280/2a2a2a/666?text=No+Image'">
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
    btnTv.addEventListener('click', () => setActive('tv', 'Enter TV show title...'));
    btnMovies.addEventListener('click', () => setActive('movies', 'Enter movie title...'));
    
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
    
    // Anime and Manga use Jikan API
    if (currentSearchType === 'anime' || currentSearchType === 'manga') {
        try {
            const response = await fetch(`https://api.jikan.moe/v4/${currentSearchType}?q=${encodeURIComponent(query)}&limit=24`);
            const data = await response.json();
            
            loading.classList.add('hidden');
            
            if (!data.data || data.data.length === 0) {
                noResults.classList.remove('hidden');
                return;
            }
            
            resultsContainer.innerHTML = data.data.map(item => createSearchCard(item)).join('');
            
        } catch (error) {
            loading.classList.add('hidden');
            showToast('Search failed. Try again.');
            console.error(error);
        }
    } 
    // TV Shows and Movies use manual entry (no free API without key)
    else {
        loading.classList.add('hidden');
        
        // Create a manual entry card
        const manualId = Date.now();
        const manualItem = {
            mal_id: manualId,
            title: query,
            images: { jpg: { image_url: 'https://via.placeholder.com/200x280/2a2a2a/667eea?text=' + encodeURIComponent(query) } },
            score: null
        };
        
        resultsContainer.innerHTML = createSearchCard(manualItem, true);
    }
}

function createSearchCard(item, isManual = false) {
    const title = item.title || item.title_english || 'Unknown Title';
    const image = item.images?.jpg?.image_url || 'https://via.placeholder.com/200x280/2a2a2a/666?text=No+Image';
    const malId = item.mal_id;
    
    const addFunction = isManual 
        ? `addManualFromBrowse(${malId}, '${title.replace(/'/g, "\\'")}', '${image}', '${currentSearchType}')`
        : `addFromBrowse(${malId}, '${title.replace(/'/g, "\\'")}', '${image}', '${currentSearchType}')`;
    
    return `
        <div class="card">
            <img src="${image}" alt="${title}" class="card-image" onerror="this.src='https://via.placeholder.com/200x280/2a2a2a/666?text=No+Image'">
            <div class="card-body">
                <div class="card-title">${title}</div>
                <div class="card-meta">
                    <span class="score-display">${isManual ? 'Manual Entry' : ('★ ' + (item.score || 'N/A'))}</span>
                </div>
                <button class="btn btn-add" style="width:100%;" onclick="${addFunction}">
                    + Add to ${currentSearchType === 'tv' ? 'TV Shows' : currentSearchType === 'movies' ? 'Movies' : 'List'}
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

function addManualFromBrowse(malId, title, imageUrl, type) {
    addFromBrowse(malId, title, imageUrl, type);
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
