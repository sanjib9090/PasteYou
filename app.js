const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const crypto = require('crypto');
const mime = require('mime-types');

const app = express();
const db = new sqlite3.Database('database.db');

// Configure multer to save files with their original names and extensions
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || `.${mime.extension(file.mimetype)}`;
        const filename = crypto.randomBytes(16).toString('hex') + ext;
        cb(null, filename);
    }
});

const upload = multer({ storage });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('view engine', 'ejs');
app.use(upload.single('file'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS pastes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        title TEXT,
        token TEXT UNIQUE,
        expire_at TIMESTAMP,
        password TEXT,
        url_short TEXT UNIQUE,
        file_path TEXT,
        visibility TEXT DEFAULT 'public',
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
});

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/create', requireLogin, (req, res) => {
    const { content, title, expire_at, visibility, password, url_short } = req.body;
    const token = uuidv4();
    const expireAt = expire_at ? new Date(Date.now() + parseTime(expire_at)) : null;
    const shortUrl = url_short ? url_short : crypto.randomBytes(4).toString('hex');

    let filePath = null;
    if (req.file) {
        filePath = req.file.filename;
    }

    const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;

    db.run(`INSERT INTO pastes (content, title, token, expire_at, password, url_short, file_path, visibility, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
           [content, title, token, expireAt, hashedPassword, shortUrl, filePath, visibility, req.session.userId], function(err) {
        if (err) {
            console.error("Error creating paste:", err.message);
            return res.send("Error creating paste.");
        }
        res.redirect(`/paste/${shortUrl}`);
    });
});

app.get('/paste/:shortUrl', (req, res) => {
    const shortUrl = req.params.shortUrl;
    db.get('SELECT * FROM pastes WHERE url_short = ?', [shortUrl], (err, row) => {
        if (err || !row || (row.expire_at && new Date(row.expire_at) < new Date())) {
            return res.send("Paste not found or has expired.");
        }

        if (row.password) {
            // Render the paste page with a password form if password is set
            return res.render('paste', { paste: row, passwordEntered: false });
        }

        res.render('paste', { paste: row, passwordEntered: true });
    });
});

app.post('/paste/:shortUrl', (req, res) => {
    const shortUrl = req.params.shortUrl;
    const { password } = req.body;

    db.get('SELECT * FROM pastes WHERE url_short = ?', [shortUrl], (err, row) => {
        if (err || !row || (row.expire_at && new Date(row.expire_at) < new Date())) {
            return res.send("Paste not found or has expired.");
        }

        if (row.password && !bcrypt.compareSync(password, row.password)) {
            return res.render('paste', { paste: row, passwordEntered: false });
        }

        res.render('paste', { paste: row, passwordEntered: true });
    });
});

app.get('/paste/:shortUrl/update', requireLogin, (req, res) => {
    const shortUrl = req.params.shortUrl;
    db.get(`SELECT * FROM pastes WHERE url_short = ? AND user_id = ?`, [shortUrl, req.session.userId], (err, row) => {
        if (err || !row) {
            return res.status(404).send("Paste not found.");
        }
        res.render('update', { paste: row });
    });
});

app.post('/paste/:shortUrl/update', requireLogin, (req, res) => {
    const shortUrl = req.params.shortUrl;
    const { content, title, expire_at, visibility, password } = req.body;

    const expireAt = expire_at ? new Date(Date.now() + parseTime(expire_at)) : null;
    const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;

    db.run(`UPDATE pastes SET content = ?, title = ?, expire_at = ?, visibility = ?, password = ? WHERE url_short = ? AND user_id = ?`, 
           [content, title, expireAt, visibility, hashedPassword, shortUrl, req.session.userId], function(err) {
        if (err) {
            console.error("Error updating paste:", err.message);
            return res.status(500).send("Error updating paste.");
        }
        res.redirect(`/paste/${shortUrl}`);
    });
});

app.post('/paste/:shortUrl/delete', requireLogin, (req, res) => {
    const shortUrl = req.params.shortUrl;

    db.run(`DELETE FROM pastes WHERE url_short = ? AND user_id = ?`, [shortUrl, req.session.userId], function(err) {
        if (err) {
            console.error("Error deleting paste:", err.message);
            return res.status(500).send("Error deleting paste.");
        }
        res.redirect('/dashboard');
    });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function(err) {
        if (err) {
            console.error("Error registering user:", err.message);
            return res.send("Error registering user.");
        }
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user || !bcrypt.compareSync(password, user.password)) {
            return res.send("Invalid credentials.");
        }
        req.session.userId = user.id;
        res.redirect('/');
    });
});

app.get('/dashboard', requireLogin, (req, res) => {
    db.all(`SELECT * FROM pastes WHERE user_id = ?`, [req.session.userId], (err, rows) => {
        if (err) {
            console.error("Error retrieving pastes:", err.message);
            return res.send("Error retrieving your pastes.");
        }
        res.render('dashboard', { pastes: rows });
    });
});

app.get('/search', (req, res) => {
    const query = `%${req.query.q}%`;
    db.all(`SELECT * FROM pastes WHERE (title LIKE ? OR content LIKE ?) AND visibility = 'public'`, [query, query], (err, rows) => {
        if (err) {
            console.error("Error searching for pastes:", err.message);
            return res.send("Error searching for pastes.");
        }
        res.render('search_results', { results: rows });
    });
});

function parseTime(timeStr) {
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000, M: 2629800000 };
    const match = timeStr.match(/^(\d+)([smhdM])$/);
    if (!match) return 0;
    const [, num, unit] = match;
    return num * units[unit];
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
