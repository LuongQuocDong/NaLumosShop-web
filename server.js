const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;
const distPath = path.join(__dirname, 'dist', 'NaLumosShop-web');

app.use(express.static(distPath, {
  maxAge: '1d',
  index: false
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`NaLumosShop web server listening on port ${port}`);
});

