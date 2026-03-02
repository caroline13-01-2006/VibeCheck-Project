from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
from flask_mysqldb import MySQL
import bcrypt
import os
from werkzeug.utils import secure_filename
from datetime import datetime
import json

app = Flask(__name__)
app.secret_key = 'vibe_check_secret_key_2024'

# MySQL Configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'Enilorac'   # Change this
app.config['MYSQL_DB'] = 'vibecheck'
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

# Upload config
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated

# ─── AUTH ROUTES ────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('feed'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json() or request.form
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        cur = mysql.connection.cursor()
        cur.execute("SELECT * FROM users WHERE username = %s OR email = %s", (username, username))
        user = cur.fetchone()
        cur.close()
        
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['display_name'] = user['display_name']
            if request.is_json:
                return jsonify({'success': True, 'redirect': url_for('feed')})
            return redirect(url_for('feed'))
        else:
            if request.is_json:
                return jsonify({'success': False, 'message': 'Invalid username or password'})
            return render_template('auth.html', error='Invalid credentials')
    
    return render_template('auth.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json() or request.form
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    display_name = data.get('display_name', username).strip()
    
    if not username or not email or not password:
        return jsonify({'success': False, 'message': 'All fields required'})
    
    cur = mysql.connection.cursor()
    cur.execute("SELECT id FROM users WHERE username = %s OR email = %s", (username, email))
    existing = cur.fetchone()
    
    if existing:
        cur.close()
        return jsonify({'success': False, 'message': 'Username or email already exists'})
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    cur.execute(
        "INSERT INTO users (username, email, password, display_name, created_at) VALUES (%s, %s, %s, %s, %s)",
        (username, email, hashed, display_name or username, datetime.now())
    )
    mysql.connection.commit()
    new_id = cur.lastrowid
    cur.close()
    
    session['user_id'] = new_id
    session['username'] = username
    session['display_name'] = display_name or username
    return jsonify({'success': True, 'redirect': url_for('feed')})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ─── MAIN APP ROUTE ─────────────────────────────────────────────────────────────

@app.route('/app')
@login_required
def feed():
    return render_template('app.html')

# ─── API: FEED ───────────────────────────────────────────────────────────────────

@app.route('/api/feed')
@login_required
def api_feed():
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT p.*, u.username, u.display_name, u.avatar,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = %s) as user_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT 50
    """, (session['user_id'],))
    posts = cur.fetchall()
    cur.close()
    for p in posts:
        p['created_at'] = p['created_at'].strftime('%b %d, %Y · %I:%M %p') if p['created_at'] else ''
    return jsonify(posts)

# ─── API: POSTS ──────────────────────────────────────────────────────────────────

@app.route('/api/posts', methods=['POST'])
@login_required
def create_post():
    content = request.form.get('content', '').strip()
    image_path = None
    
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(f"{session['user_id']}_{int(datetime.now().timestamp())}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            image_path = filename
    
    if not content and not image_path:
        return jsonify({'success': False, 'message': 'Post cannot be empty'})
    
    cur = mysql.connection.cursor()
    cur.execute(
        "INSERT INTO posts (user_id, content, image, created_at) VALUES (%s, %s, %s, %s)",
        (session['user_id'], content, image_path, datetime.now())
    )
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True, 'message': 'Post created!'})

@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
@login_required
def delete_post(post_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM posts WHERE id = %s AND user_id = %s", (post_id, session['user_id']))
    post = cur.fetchone()
    if not post:
        cur.close()
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    if post['image']:
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], post['image']))
        except:
            pass
    
    cur.execute("DELETE FROM likes WHERE post_id = %s", (post_id,))
    cur.execute("DELETE FROM comments WHERE post_id = %s", (post_id,))
    cur.execute("DELETE FROM posts WHERE id = %s", (post_id,))
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True})

# ─── API: LIKES ──────────────────────────────────────────────────────────────────

@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
@login_required
def toggle_like(post_id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT id FROM likes WHERE post_id = %s AND user_id = %s", (post_id, session['user_id']))
    existing = cur.fetchone()
    
    if existing:
        cur.execute("DELETE FROM likes WHERE post_id = %s AND user_id = %s", (post_id, session['user_id']))
        liked = False
    else:
        cur.execute("INSERT INTO likes (post_id, user_id, created_at) VALUES (%s, %s, %s)",
                    (post_id, session['user_id'], datetime.now()))
        liked = True
    
    mysql.connection.commit()
    cur.execute("SELECT COUNT(*) as cnt FROM likes WHERE post_id = %s", (post_id,))
    count = cur.fetchone()['cnt']
    cur.close()
    return jsonify({'liked': liked, 'count': count})

# ─── API: COMMENTS ───────────────────────────────────────────────────────────────

@app.route('/api/posts/<int:post_id>/comments', methods=['GET'])
@login_required
def get_comments(post_id):
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT c.*, u.username, u.display_name, u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = %s
        ORDER BY c.created_at ASC
    """, (post_id,))
    comments = cur.fetchall()
    cur.close()
    for c in comments:
        c['created_at'] = c['created_at'].strftime('%b %d · %I:%M %p') if c['created_at'] else ''
    return jsonify(comments)

@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
@login_required
def add_comment(post_id):
    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'success': False, 'message': 'Comment cannot be empty'})
    
    cur = mysql.connection.cursor()
    cur.execute(
        "INSERT INTO comments (post_id, user_id, content, created_at) VALUES (%s, %s, %s, %s)",
        (post_id, session['user_id'], content, datetime.now())
    )
    mysql.connection.commit()
    comment_id = cur.lastrowid
    cur.execute("""
        SELECT c.*, u.username, u.display_name, u.avatar
        FROM comments c JOIN users u ON c.user_id = u.id
        WHERE c.id = %s
    """, (comment_id,))
    comment = cur.fetchone()
    cur.close()
    comment['created_at'] = comment['created_at'].strftime('%b %d · %I:%M %p') if comment['created_at'] else ''
    return jsonify({'success': True, 'comment': comment})

# ─── API: PROFILE ─────────────────────────────────────────────────────────────────

@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    user_id = request.args.get('user_id', session['user_id'])
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, username, display_name, bio, avatar, created_at FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    cur.execute("SELECT COUNT(*) as cnt FROM posts WHERE user_id = %s", (user_id,))
    post_count = cur.fetchone()['cnt']
    cur.execute("""
        SELECT p.*, 
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = %s) as user_liked
        FROM posts p WHERE p.user_id = %s ORDER BY p.created_at DESC
    """, (session['user_id'], user_id))
    posts = cur.fetchall()
    cur.close()
    for p in posts:
        p['created_at'] = p['created_at'].strftime('%b %d, %Y') if p['created_at'] else ''
    user['created_at'] = user['created_at'].strftime('%B %Y') if user['created_at'] else ''
    return jsonify({'user': user, 'post_count': post_count, 'posts': posts})

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json()
    display_name = data.get('display_name', '').strip()
    bio = data.get('bio', '').strip()
    
    cur = mysql.connection.cursor()
    cur.execute("UPDATE users SET display_name = %s, bio = %s WHERE id = %s",
                (display_name, bio, session['user_id']))
    mysql.connection.commit()
    cur.close()
    session['display_name'] = display_name
    return jsonify({'success': True})

@app.route('/api/profile/avatar', methods=['POST'])
@login_required
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({'success': False, 'message': 'No file'})
    file = request.files['avatar']
    if not file or not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Invalid file'})
    
    filename = secure_filename(f"avatar_{session['user_id']}_{int(datetime.now().timestamp())}.{file.filename.rsplit('.', 1)[1].lower()}")
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    
    cur = mysql.connection.cursor()
    cur.execute("UPDATE users SET avatar = %s WHERE id = %s", (filename, session['user_id']))
    mysql.connection.commit()
    cur.close()
    return jsonify({'success': True, 'avatar': filename})

@app.route('/api/me')
@login_required
def get_me():
    cur = mysql.connection.cursor()
    cur.execute("SELECT id, username, display_name, bio, avatar FROM users WHERE id = %s", (session['user_id'],))
    user = cur.fetchone()
    cur.close()
    return jsonify(user)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)