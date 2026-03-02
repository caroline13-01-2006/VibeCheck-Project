# ⚡ VibeSocial — Mini Social Media App

A fully functional social media web app built with **Flask + MySQL + Vanilla JS**.

---

## 🚀 Quick Setup

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Set up MySQL database
Open MySQL and run the schema:
```bash
mysql -u root -p < schema.sql
```

### 3. Configure database connection
Edit `app.py` and update these lines:
```python
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'your_password'   # ← Change this!
app.config['MYSQL_DB'] = 'vibesocial'
```

### 4. Run the app
```bash
python app.py
```

### 5. Open in browser
```
http://localhost:5000
```

---

## 📁 Project Structure

```
vibesocial/
├── app.py                  # Flask backend + all API routes
├── schema.sql              # MySQL database schema
├── requirements.txt        # Python dependencies
├── templates/
│   ├── auth.html           # Login / Register page
│   └── app.html            # Main 5-slide app
└── static/
    ├── css/
    │   ├── auth.css         # Auth page styles
    │   └── app.css          # Main app styles
    ├── js/
    │   ├── auth.js          # Auth page logic
    │   └── app.js           # Main app logic
    └── uploads/             # User uploaded images (auto-created)
```

---

## ✨ Features

| Feature | Status |
|--------|--------|
| Register / Login / Logout | ✅ |
| Create Post (text + image) | ✅ |
| Delete Own Posts | ✅ |
| Like / Unlike Posts | ✅ |
| Comment on Posts | ✅ |
| Upload Profile Picture | ✅ |
| Edit Display Name & Bio | ✅ |
| Live Feed | ✅ |
| Profile Grid View | ✅ |
| Dark / Light Mode | ✅ |
| 5-Slide Navigation | ✅ |
| Mobile Responsive | ✅ |
| Keyboard Shortcuts (1-5) | ✅ |

---

## 🎨 Design

- **Aesthetic**: Electric Neo-Brutalist Dark with glowing accents
- **Fonts**: Syne (display) + DM Sans (body)
- **Colors**: Deep navy + Purple (#6c63ff) + Pink (#ff6b9d) + Teal (#00d4aa)
- **Inspired by**: Instagram + Twitter/X layout patterns

---

## 🔑 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/login` | User login |
| POST | `/register` | User registration |
| GET | `/logout` | Logout |
| GET | `/api/feed` | Get all posts |
| POST | `/api/posts` | Create post |
| DELETE | `/api/posts/<id>` | Delete post |
| POST | `/api/posts/<id>/like` | Toggle like |
| GET | `/api/posts/<id>/comments` | Get comments |
| POST | `/api/posts/<id>/comments` | Add comment |
| GET | `/api/profile` | Get profile + posts |
| PUT | `/api/profile` | Update name/bio |
| POST | `/api/profile/avatar` | Upload avatar |
| GET | `/api/me` | Get current user |

---

## ⌨️ Keyboard Shortcuts
- `1` → Home
- `2` → Profile  
- `3` → Create Post
- `4` → Feed
- `5` → Settings
- `Esc` → Close modals
