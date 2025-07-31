const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const https = require('https');
const WooCommerceRestApi = require('woocommerce-rest-api').default;

const app = express();
const PORT = process.env.PORT || 3500;

const createApi = ({ url, key, secret, version = 'wc/v3', ignoreSsl }) => {
  return new WooCommerceRestApi({
    url,
    consumerKey: key,
    consumerSecret: secret,
    version,
    axiosConfig: {
      httpsAgent: new https.Agent({ rejectUnauthorized: !ignoreSsl })
    }
  });
};

// Directories
const PUBLIC_DIR = path.join(__dirname, 'public');
const HISTORY_DIR = path.join(__dirname, 'history');
const HISTORY_JSON = path.join(HISTORY_DIR, 'history.json');

if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR);
if (!fs.existsSync(HISTORY_JSON)) fs.writeFileSync(HISTORY_JSON, '[]', 'utf8');

app.use(express.static(PUBLIC_DIR));
app.use('/history', express.static(HISTORY_DIR));
app.use(express.json({ limit: '5mb' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, HISTORY_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.get('/api/history', (req, res) => {
  fs.readFile(HISTORY_JSON, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Unable to read history' });
    let entries = [];
    try { entries = JSON.parse(data); } catch { entries = []; }
    res.json(entries);
  });
});

app.post('/api/history', upload.single('file'), (req, res) => {
  const { parents, variations } = req.body;
  const entry = {
    id: Date.now(),
    file: req.file.filename,
    timestamp: new Date().toISOString(),
    parents: Number(parents) || 0,
    variations: Number(variations) || 0
  };
  let entries = [];
  try { entries = JSON.parse(fs.readFileSync(HISTORY_JSON, 'utf8')); } catch {}
  entries.unshift(entry);
  fs.writeFileSync(HISTORY_JSON, JSON.stringify(entries, null, 2));
  res.json({ success: true, entry });
});

app.post('/api/test-woocommerce', async (req, res) => {
  try {
    const api = createApi(req.body);
    await api.get('products', { per_page: 1 });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.post('/api/export-woocommerce', async (req, res) => {
  const { categories = [], products = [], visibility } = req.body;
  try {
    const api = createApi(req.body);
    let catCount = 0, prodCount = 0;
    for (const cat of categories) {
      await api.post('products/categories', cat);
      catCount++;
    }
    for (const p of products) {
      const prod = { ...p };
      if (visibility) prod.catalog_visibility = visibility;
      await api.post('products', prod);
      prodCount++;
    }
    res.json({ success: true, categories: catCount, products: prodCount });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
