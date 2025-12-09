const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// CONFIGURATION
// ======================

// Set to true to enable custom JS injection
const ENABLE_CUSTOM_JS = false;

// Path to your custom JavaScript file (if enabled)
const CUSTOM_JS_PATH = './custom.js';

// ======================
// PROXY CORE
// ======================

// Helper to load custom JS if enabled
function getCustomJS() {
    if (!ENABLE_CUSTOM_JS) return '';
    
    try {
        if (fs.existsSync(CUSTOM_JS_PATH)) {
            const jsContent = fs.readFileSync(CUSTOM_JS_PATH, 'utf8');
            return `<script>${jsContent}</script>`;
        }
    } catch (error) {
        console.error('Error loading custom JS:', error);
    }
    return '';
}

// Helper function to fetch with headers
async function fetchWithHeaders(url) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    };
    
    return await fetch(url, { headers });
}

// Main proxy route for Blooket
app.get('/', async (req, res) => {
    try {
        const gameCode = req.query.code;
        const targetUrl = gameCode 
            ? `https://www.blooket.com/join?code=${gameCode}`
            : 'https://www.blooket.com/join';
        
        console.log('Proxying:', targetUrl);
        
        // Fetch the page
        const response = await fetchWithHeaders(targetUrl);
        const html = await response.text();
        
        // Parse with Cheerio
        const $ = cheerio.load(html);
        
        // Remove Blooket's CSP meta tag
        $('meta[http-equiv="Content-Security-Policy"]').remove();
        
        // Inject custom JS if enabled
        if (ENABLE_CUSTOM_JS) {
            $('head').append(getCustomJS());
        }
        
        // Fix all relative URLs to absolute
        $('a[href^="/"]').each((i, elem) => {
            const href = $(elem).attr('href');
            $(elem).attr('href', `/proxy${href}`);
        });
        
        $('link[href^="/"]').each((i, elem) => {
            const href = $(elem).attr('href');
            $(elem).attr('href', `https://www.blooket.com${href}`);
        });
        
        $('script[src^="/"]').each((i, elem) => {
            const src = $(elem).attr('src');
            $(elem).attr('src', `https://www.blooket.com${src}`);
        });
        
        $('img[src^="/"]').each((i, elem) => {
            const src = $(elem).attr('src');
            $(elem).attr('src', `https://www.blooket.com${src}`);
        });
        
        // Send the modified page
        res.send($.html());
        
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><title>Proxy Error</title></head>
            <body style="font-family: Arial; padding: 20px;">
                <h1>Proxy Error</h1>
                <p>Failed to load Blooket. Please try again.</p>
                <p><a href="/">Retry</a></p>
            </body>
            </html>
        `);
    }
});

// Proxy for other Blooket paths
app.get('/proxy/*', async (req, res) => {
    try {
        const path = req.path.replace('/proxy', '');
        const targetUrl = `https://www.blooket.com${path}`;
        
        const response = await fetchWithHeaders(targetUrl);
        const html = await response.text();
        
        const $ = cheerio.load(html);
        $('meta[http-equiv="Content-Security-Policy"]').remove();
        
        if (ENABLE_CUSTOM_JS) {
            $('head').append(getCustomJS());
        }
        
        res.send($.html());
    } catch (error) {
        res.redirect('/');
    }
});

// Static route for custom.js (optional)
app.get('/custom.js', (req, res) => {
    if (fs.existsSync(CUSTOM_JS_PATH)) {
        res.type('js').sendFile(path.resolve(CUSTOM_JS_PATH));
    } else {
        res.status(404).send('// Custom JS file not found');
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        time: new Date().toISOString(),
        config: {
            customJsEnabled: ENABLE_CUSTOM_JS,
            customJsPath: CUSTOM_JS_PATH
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Blooket Proxy running on port ${PORT}`);
    console.log(`🌐 Access: http://localhost:${PORT}`);
    console.log(`⚙️  Custom JS: ${ENABLE_CUSTOM_JS ? 'ENABLED' : 'DISABLED'}`);
    if (ENABLE_CUSTOM_JS) {
        console.log(`📝 Custom JS file: ${CUSTOM_JS_PATH}`);
    }
});
