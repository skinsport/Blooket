const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// Custom JavaScript to inject
const CUSTOM_JS = `
// Blooket Join Page Enhancer
console.log("Blooket Proxy Loaded!");

// Auto-fill game code if in URL
const urlParams = new URLSearchParams(window.location.search);
const gameCode = urlParams.get('code');
if (gameCode) {
    setTimeout(() => {
        const codeInput = document.querySelector('input[type="text"]');
        if (codeInput) {
            codeInput.value = gameCode;
            console.log('Auto-filled game code:', gameCode);
            
            // Trigger input event
            codeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 1000);
}

// Add custom styling
const style = document.createElement('style');
style.textContent = \`
    .proxy-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
        text-align: center;
    }
    .proxy-notice {
        background: #f0f9ff;
        border: 2px solid #3b82f6;
        padding: 10px;
        border-radius: 5px;
        margin: 10px 0;
    }
\`;
document.head.appendChild(style);

// Add custom header
document.addEventListener('DOMContentLoaded', function() {
    const header = document.createElement('div');
    header.className = 'proxy-header';
    header.innerHTML = \`
        <h2>🎮 Blooket Join Portal</h2>
        <p>Enter your game code below to join!</p>
        <div class="proxy-notice">
            <small>Powered by Educational Proxy</small>
        </div>
    \`;
    
    // Insert at top of body
    const body = document.querySelector('body');
    if (body) {
        body.insertBefore(header, body.firstChild);
    }
});

// Add quick code buttons
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const container = document.querySelector('.proxy-header') || document.body;
        const buttonDiv = document.createElement('div');
        buttonDiv.style.margin = '10px 0';
        buttonDiv.style.textAlign = 'center';
        
        buttonDiv.innerHTML = \`
            <p><strong>Quick Test Codes:</strong></p>
            <button onclick="document.querySelector('input[type=\\\\"text\\\\"]').value='123456'">Test Code 1: 123456</button>
            <button onclick="document.querySelector('input[type=\\\\"text\\\\"]').value='789012'">Test Code 2: 789012</button>
        \`;
        
        container.appendChild(buttonDiv);
    }, 1500);
});
`;

// Main proxy route
app.get('/', async (req, res) => {
    try {
        const gameCode = req.query.code;
        const blooketUrl = gameCode 
            ? `https://www.blooket.com/join?code=${gameCode}`
            : 'https://www.blooket.com/join';
        
        console.log('Fetching:', blooketUrl);
        
        // Fetch the Blooket page
        const response = await fetch(blooketUrl);
        const html = await response.text();
        
        // Parse HTML with Cheerio
        const $ = cheerio.load(html);
        
        // Remove Blooket's CSP meta tag (allows our JS to run)
        $('meta[http-equiv="Content-Security-Policy"]').remove();
        
        // Inject our custom JavaScript
        $('head').append(`<script>${CUSTOM_JS}</script>`);
        
        // Fix relative URLs
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
        
        // Send modified page
        res.send($.html());
        
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).send(`
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h1>⚠️ Proxy Error</h1>
                    <p>Unable to load Blooket. Try again in a moment.</p>
                    <p><a href="/">Return to join page</a></p>
                    <p>Error details: ${error.message}</p>
                </body>
            </html>
        `);
    }
});

// Additional routes for other Blooket pages
app.get('/proxy/*', async (req, res) => {
    try {
        const path = req.path.replace('/proxy', '');
        const blooketUrl = `https://www.blooket.com${path}`;
        
        const response = await fetch(blooketUrl);
        const html = await response.text();
        
        // Modify HTML similarly
        const $ = cheerio.load(html);
        $('head').append(`<script>${CUSTOM_JS}</script>`);
        
        res.send($.html());
    } catch (error) {
        res.redirect('/');
    }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Blooket Proxy running on port ${PORT}`);
    console.log(`📚 Access at: http://localhost:${PORT}`);
    console.log(`🎮 Example with game code: http://localhost:${PORT}?code=123456`);
});
