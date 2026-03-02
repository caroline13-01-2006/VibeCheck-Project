// VibeSocial — App JS (Fixed)

let currentSlide = 0;
let currentUser = null;
let activeCommentPostId = null;

// SLIDE NAVIGATION
function goToSlide(index) {
    currentSlide = index;
    const track = document.getElementById('slides-track');
    // Each slide is 20% of the 500% wide track
    // To show slide N, we shift left by N * 20%
    track.style.transform = `translateX(-${index * 20}%)`;

    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', parseInt(el.dataset.slide) === index));
    document.querySelectorAll('.mnav-item').forEach(el => el.classList.toggle('active', parseInt(el.dataset.slide) === index));

    if (index === 1) loadProfile();
    if (index === 3) loadFeed();
    if (index === 4) populateSettings();
}

document.querySelectorAll('.nav-item, .mnav-item').forEach(item => {
    item.addEventListener('click', e => { e.preventDefault(); goToSlide(parseInt(item.dataset.slide)); });
});

// INIT
async function init() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) { window.location.href = '/login'; return; }
        currentUser = await res.json();
        updateUI();
        loadFeed();
        loadHomeStats();
    } catch(e) { console.error('Init error', e); }
}

function updateUI() {
    if (!currentUser) return;
    const name = currentUser.display_name || currentUser.username;

    // Sidebar
    setAvatarEl('sidebar-avatar', currentUser);
    setText('sidebar-name', name);
    setText('sidebar-handle', '@' + currentUser.username);

    // Home
    setText('home-name', name);

    // Create
    setAvatarEl('create-avatar', currentUser);
    setText('create-display-name', name);

    // Comment modal avatar
    setAvatarEl('comment-modal-avatar', currentUser);
}

function setAvatarEl(id, user) {
    const el = document.getElementById(id);
    if (!el) return;
    if (user && user.avatar) {
        el.innerHTML = `<img src="/uploads/${user.avatar}" alt="avatar">`;
    } else {
        el.textContent = (user?.display_name || user?.username || '?')[0].toUpperCase();
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// HOME STATS
async function loadHomeStats() {
    try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        setText('stat-posts', data.post_count || 0);
    } catch(e) {}
}

// FEED
async function loadFeed() {
    const container = document.getElementById('feed-container');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading vibes...</p></div>';
    try {
        const res = await fetch('/api/feed');
        const posts = await res.json();
        if (!posts || posts.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-icon">📡</div><h3>No posts yet</h3><p>Be the first! <a href="#" onclick="goToSlide(2)">Create a post</a></p></div>`;
            return;
        }
        container.innerHTML = posts.map(renderPost).join('');
        // Also show recent on home
        const homeRecent = document.getElementById('home-recent-posts');
        if (homeRecent) homeRecent.innerHTML = posts.slice(0,2).map(renderPost).join('');
    } catch(e) {
        container.innerHTML = '<div class="loading-state"><p>Failed to load. Try refreshing.</p></div>';
    }
}

function renderPost(post) {
    const isOwner = currentUser && post.user_id === currentUser.id;
    const avatarHtml = post.avatar
        ? `<img src="/uploads/${post.avatar}" alt="av">`
        : `<span>${(post.display_name || post.username || '?')[0].toUpperCase()}</span>`;
    return `
    <div class="post-card" id="post-${post.id}">
      <div class="post-header">
        <div class="post-user">
          <div class="post-avatar">${avatarHtml}</div>
          <div>
            <div class="post-display-name">${esc(post.display_name || post.username)}</div>
            <div class="post-meta">@${esc(post.username)} · ${post.created_at}</div>
          </div>
        </div>
        ${isOwner ? `<button class="post-delete-btn" onclick="deletePost(${post.id})">🗑️</button>` : ''}
      </div>
      <div class="post-body">
        ${post.content ? `<div class="post-content">${esc(post.content)}</div>` : ''}
        ${post.image ? `<img class="post-image" src="/uploads/${post.image}" loading="lazy" alt="Post image">` : ''}
      </div>
      <div class="post-actions">
        <button class="action-btn ${post.user_liked ? 'liked' : ''}" id="like-btn-${post.id}" onclick="toggleLike(${post.id}, this)">
          <span class="action-icon">❤️</span>
          <span id="like-count-${post.id}">${post.like_count}</span>
        </button>
        <button class="action-btn" onclick="openComments(${post.id})">
          <span class="action-icon">💬</span>
          <span id="comment-count-${post.id}">${post.comment_count}</span>
        </button>
      </div>
    </div>`;
}

// LIKES
async function toggleLike(postId, btn) {
    const icon = btn.querySelector('.action-icon');
    icon.classList.add('like-pop');
    setTimeout(() => icon.classList.remove('like-pop'), 300);
    try {
        const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
        const data = await res.json();
        btn.classList.toggle('liked', data.liked);
        setText(`like-count-${postId}`, data.count);
    } catch(e) { showToast('Failed to like', 'error'); }
}

// COMMENTS
function openComments(postId) {
    activeCommentPostId = postId;
    openModal('comments-modal');
    loadComments(postId);
}

async function loadComments(postId) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<div class="loading-state" style="padding:16px"><div class="spinner"></div></div>';
    try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        const comments = await res.json();
        if (!comments || comments.length === 0) {
            list.innerHTML = '<div class="loading-state" style="padding:20px;font-size:0.88rem">No comments yet. Say something! 💬</div>';
            return;
        }
        list.innerHTML = comments.map(renderComment).join('');
        list.scrollTop = list.scrollHeight;
    } catch(e) { list.innerHTML = '<div class="loading-state">Failed to load</div>'; }
}

function renderComment(c) {
    const av = c.avatar ? `<img src="/uploads/${c.avatar}" alt="av">` : `<span>${(c.display_name||c.username||'?')[0].toUpperCase()}</span>`;
    return `
    <div class="comment-item">
      <div class="comment-avatar">${av}</div>
      <div class="comment-bubble">
        <div><span class="comment-name">${esc(c.display_name||c.username)}</span><span class="comment-time">${c.created_at}</span></div>
        <p class="comment-text">${esc(c.content)}</p>
      </div>
    </div>`;
}

async function submitComment() {
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content || !activeCommentPostId) return;
    try {
        const res = await fetch(`/api/posts/${activeCommentPostId}/comments`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ content })
        });
        const data = await res.json();
        if (data.success) {
            input.value = '';
            const list = document.getElementById('comments-list');
            const empty = list.querySelector('.loading-state');
            if (empty) list.innerHTML = '';
            list.insertAdjacentHTML('beforeend', renderComment(data.comment));
            list.scrollTop = list.scrollHeight;
            const cc = document.getElementById(`comment-count-${activeCommentPostId}`);
            if (cc) cc.textContent = parseInt(cc.textContent) + 1;
        }
    } catch(e) { showToast('Failed to post comment', 'error'); }
}

// CREATE POST
function previewImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('image-preview').src = e.target.result;
        document.getElementById('image-preview-wrapper').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    document.getElementById('post-image').value = '';
    document.getElementById('image-preview-wrapper').style.display = 'none';
    document.getElementById('image-preview').src = '';
}

function updateCharCount(el) { setText('char-count', el.value.length); }

async function submitPost() {
    const content = document.getElementById('post-content').value.trim();
    const imageFile = document.getElementById('post-image').files[0];
    if (!content && !imageFile) { showToast('Add some content or image', 'error'); return; }

    const fd = new FormData();
    fd.append('content', content);
    if (imageFile) fd.append('image', imageFile);

    const btn = document.querySelector('.create-wrap .btn-grad');
    btn.textContent = 'Posting...'; btn.disabled = true;

    try {
        const res = await fetch('/api/posts', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            document.getElementById('post-content').value = '';
            setText('char-count', '0');
            removeImage();
            const succ = document.getElementById('post-success');
            succ.classList.add('show');
            setTimeout(() => succ.classList.remove('show'), 4000);
            showToast('Post published! ⚡', 'success');
            loadHomeStats();
        } else { showToast(data.message || 'Failed', 'error'); }
    } catch(e) { showToast('Connection error', 'error'); }

    btn.textContent = 'Post It ⚡'; btn.disabled = false;
}

// DELETE POST
async function deletePost(postId) {
    if (!confirm('Delete this post?')) return;
    try {
        const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            const el = document.getElementById(`post-${postId}`);
            if (el) { el.style.opacity='0'; el.style.transform='scale(0.95)'; el.style.transition='all 0.3s'; setTimeout(()=>el.remove(),300); }
            showToast('Post deleted', 'success');
            loadHomeStats();
        }
    } catch(e) { showToast('Failed to delete', 'error'); }
}

// PROFILE
async function loadProfile() {
    try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        const { user, post_count, posts } = data;

        setText('profile-display-name', user.display_name || user.username);
        setText('profile-username', '@' + user.username);
        setText('profile-bio', user.bio || 'No bio yet. Click Edit to add one!');
        setText('profile-joined', '✦ Joined ' + user.created_at);
        setText('p-post-count', post_count);
        setAvatarEl('profile-avatar', user);

        const grid = document.getElementById('profile-posts-grid');
        if (!posts || posts.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📝</div><h3>No posts yet</h3><p><a href="#" onclick="goToSlide(2)">Create your first post!</a></p></div>`;
        } else {
            grid.innerHTML = posts.map(p => `
            <div class="mini-post-card">
              ${p.image ? `<img src="/uploads/${p.image}" alt="post">` : `<div class="mini-post-text">${esc(p.content||'')}</div>`}
              <div class="mini-post-overlay"><span>❤️ ${p.like_count}</span><span>💬 ${p.comment_count}</span></div>
            </div>`).join('');
        }
    } catch(e) { console.error('Profile load failed', e); }
}

async function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('avatar', file);
    showToast('Uploading...', 'success');
    try {
        const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            currentUser.avatar = data.avatar;
            updateUI(); loadProfile();
            showToast('Profile picture updated! 📷', 'success');
        } else { showToast(data.message || 'Upload failed', 'error'); }
    } catch(e) { showToast('Upload failed', 'error'); }
}

function openEditModal() {
    if (currentUser) {
        const dn = document.getElementById('edit-display-name');
        const bio = document.getElementById('edit-bio');
        if (dn) dn.value = currentUser.display_name || '';
        if (bio) bio.value = currentUser.bio || '';
    }
    openModal('edit-modal');
}

async function saveProfile() {
    const display_name = document.getElementById('edit-display-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    try {
        const res = await fetch('/api/profile', {
            method: 'PUT', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ display_name, bio })
        });
        const data = await res.json();
        if (data.success) {
            currentUser.display_name = display_name;
            currentUser.bio = bio;
            updateUI(); loadProfile(); populateSettings();
            closeModal('edit-modal');
            showToast('Profile updated! ✦', 'success');
        }
    } catch(e) { showToast('Save failed', 'error'); }
}

// SETTINGS
function populateSettings() {
    if (!currentUser) return;
    setText('settings-display-name', currentUser.display_name || '—');
    setText('settings-username', '@' + currentUser.username);
}

function toggleDarkMode(cb) {
    document.body.classList.toggle('light-mode', !cb.checked);
    localStorage.setItem('theme', cb.checked ? 'dark' : 'light');
}

// Restore theme
const saved = localStorage.getItem('theme');
if (saved === 'light') {
    document.body.classList.add('light-mode');
    const t = document.getElementById('dark-mode-toggle');
    if (t) t.checked = false;
}

// MODALS
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) closeModal(o.id); });
});

// TOAST
let _toastTimer;
function showToast(msg, type='success') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = `toast ${type} show`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// UTILS
function esc(s) {
    if (!s) return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', e => {
    if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    const map = {'1':0,'2':1,'3':2,'4':3,'5':4};
    if (map[e.key]!==undefined) goToSlide(map[e.key]);
    if (e.key==='Escape') document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));
});

// BOOT
init();
