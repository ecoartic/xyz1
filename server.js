const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8082;
const CONFIG_FILE = path.join(__dirname, 'config.json');
const CONFIG_DEFAULT_FILE = path.join(__dirname, 'config.default.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
try {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR);
        console.log('Created uploads directory');
    }
} catch (e) {
    console.error('Failed to create uploads directory:', e);
}

// Ensure config.json exists from template fallback
try {
    if (!fs.existsSync(CONFIG_FILE)) {
        if (fs.existsSync(CONFIG_DEFAULT_FILE)) {
            fs.copyFileSync(CONFIG_DEFAULT_FILE, CONFIG_FILE);
            console.log('Created config.json from config.default.json template');
        } else {
            console.error('config.default.json template not found!');
        }
    }
} catch (e) {
    console.error('Failed to initialize config.json:', e);
}

// Environment configuration
const ALLOW_UNSAFE_EVAL = process.env.ALLOW_UNSAFE_EVAL === 'true' || false;
const ADMIN_USER = process.env.ADMIN_USER || 'Admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || 'Eco1360724@';

// Express Middleware
app.use(express.json());

// Set Headers to disable caching and set Content-Security-Policy
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    // Set Content Security Policy for scripts
    const csp = ALLOW_UNSAFE_EVAL 
        ? "script-src 'self' 'unsafe-eval'" 
        : "script-src 'self'";
    res.setHeader('Content-Security-Policy', csp);
    
    next();
});

// Simple In-Memory Rate Limiter for Login/Admin Routes
const loginAttempts = new Map();
const rateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const attempts = loginAttempts.get(ip) || [];
    
    // Filter attempts in the last 15 minutes (900,000 ms)
    const recentAttempts = attempts.filter(time => now - time < 900000);
    
    if (recentAttempts.length >= 60) {
        return res.status(429).send('Too many requests. Please try again after 15 minutes.');
    }
    
    recentAttempts.push(now);
    loginAttempts.set(ip, recentAttempts);
    next();
};

// Basic Authentication Middleware
const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Authentication required');
    }

    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        return next();
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Panel"');
        return res.status(401).send('Authentication required');
    }
};

// Block public access to default admin URL paths
app.get('/admin', (req, res) => {
    res.status(404).send('Not Found');
});
app.get('/admin.html', (req, res) => {
    res.status(404).send('Not Found');
});

// Protect custom admin panel path (defined BEFORE static to override serving)
app.get('/studio-control', rateLimiter, basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.use(express.static(__dirname));

// Multer Storage Configuration for Video Upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const pageId = req.query.page || 'default';
        if (pageId === 'default') {
            cb(null, 'mp_.mp4');
        } else {
            // Clean pageId to prevent directory traversal
            const cleanPageId = pageId.replace(/[^a-zA-Z0-9_-]/g, '');
            cb(null, `video_${cleanPageId}.mp4`);
        }
    }
});

// Filter to ensure only MP4 video is uploaded
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'video/mp4' || file.originalname.endsWith('.mp4')) {
        cb(null, true);
    } else {
        cb(new Error('Only MP4 video files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // limit file size to 100MB
});

// API Routes
// 1. GET config
app.get('/api/config', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    fs.readFile(CONFIG_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read config file' });
        }
        try {
            const config = JSON.parse(data);
            res.json(config);
        } catch (parseErr) {
            res.status(500).json({ error: 'Config file format is invalid' });
        }
    });
});

// 2. POST config (Save configuration settings)
app.post('/api/config', rateLimiter, basicAuth, (req, res) => {
    const newConfig = req.body;
    
    if (!newConfig || typeof newConfig !== 'object') {
        return res.status(400).json({ error: 'Invalid configuration payload' });
    }

    fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8', (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to write config file' });
        }
        res.json({ success: true, message: 'Settings saved successfully' });
    });
});

// 3. POST video upload
app.post('/api/upload-video', rateLimiter, basicAuth, (req, res) => {
    // Custom upload handler to support progress reporting on clients
    const uploadSingle = upload.single('video');
    
    uploadSingle(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'No video file received' });
        }
        
        res.json({ success: true, message: 'Video uploaded and replaced successfully', filename: req.file.filename });
    });
});



// Start Server
app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`  AETHER Server running on port ${PORT}`);
    console.log(`  Landing Page:    http://localhost:${PORT}/`);
    console.log(`  Admin Dashboard: http://localhost:${PORT}/studio-control`);
    console.log(`=================================================`);
});
