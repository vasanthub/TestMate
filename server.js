const express = require('express');
const path = require('path');
const app = express();

const DIST_FOLDER = path.join(__dirname, 'dist/testmate');

// Serve static files with the '/testmate' prefix
app.use('/testmate', express.static(DIST_FOLDER));

// Handles Angular routing within the '/testmate' prefix
app.get(/^\/testmate.*/, (req, res) => {
  res.sendFile(path.join(DIST_FOLDER, 'index.html'));
});

// Redirect root to /testmate/
app.get('/', (req, res) => {
  res.redirect('/testmate/');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`TestMate is running on http://localhost:${PORT}/testmate/`);
});
