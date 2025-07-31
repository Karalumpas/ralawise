// Dashboard script
const state = {
  stats: {
    totalShops: 0,
    connectedShops: 0,
    lastExport: 'Aldrig',
    totalExports: 0
  }
};

const elements = {
  shopForm: document.getElementById('shopForm'),
  shopName: document.getElementById('shopName'),
  shopUrl: document.getElementById('shopUrl'),
  consumerKey: document.getElementById('consumerKey'),
  consumerSecret: document.getElementById('consumerSecret'),
  useSSL: document.getElementById('useSSL'),
  testConnection: document.getElementById('testConnection'),
  addShop: document.getElementById('addShop'),
  connectionStatus: document.getElementById('connectionStatus'),
  shopsList: document.getElementById('shopsList'),
  totalShops: document.getElementById('totalShops'),
  connectedShops: document.getElementById('connectedShops'),
  lastExport: document.getElementById('lastExport'),
  totalExports: document.getElementById('totalExports'),
  testAllConnections: document.getElementById('testAllConnections')
};

const showStatus = (msg, type='info', container=elements.connectionStatus) => {
  container.innerHTML = `<div class="status-message status-${type}">${msg}</div>`;
};

const loadShops = () => {
  try {
    const data = JSON.parse(localStorage.getItem('wooShops')) || [];
    return data.map(s => Object.assign({ ssl: true }, s));
  } catch {
    return [];
  }
};

const saveShops = shops => localStorage.setItem('wooShops', JSON.stringify(shops));

const generateId = () => Date.now().toString();

const validateUrl = url => {
  try { new URL(url); return true; } catch { return false; }
};

const testShopConnection = async shop => {
  if(!validateUrl(shop.url)) throw new Error('Ugyldig URL format');
  const cleanUrl = shop.url.replace(/\/+$/, '');
  const base = cleanUrl.replace(/^https?:\/\//, '');
  const protocol = shop.ssl === false ? 'http://' : 'https://';
  const target = protocol + base;
  const auth = btoa(`${shop.key}:${shop.secret}`);
  try {
    const res = await fetch(`${target}/wp-json/wc/v3/system_status`, {
      headers:{ Authorization:`Basic ${auth}`, 'Content-Type':'application/json' },
      method:'GET', mode:'cors'
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return { success: true };
  } catch (err) {
    try {
      const r = await fetch(`${target}/wp-json/wc/v3/products?per_page=1`, {
        headers:{ Authorization:`Basic ${auth}`, 'Content-Type':'application/json' },
        method:'GET', mode:'cors'
      });
      if(r.ok) return { success: true };
    } catch {}
    throw new Error(err.message || 'Forbindelse fejlede');
  }
};

const updateStats = () => {
  const shops = loadShops();
  state.stats.totalShops = shops.length;
  state.stats.connectedShops = shops.filter(s=>s.status==='connected').length;
  elements.totalShops.textContent = state.stats.totalShops;
  elements.connectedShops.textContent = state.stats.connectedShops;
  elements.lastExport.textContent = state.stats.lastExport;
  elements.totalExports.textContent = state.stats.totalExports;
  const step1 = document.getElementById('step1');
  if(state.stats.connectedShops>0){
    step1.classList.remove('active');
    step1.classList.add('completed');
    document.getElementById('step2').classList.add('active');
  }
};

const renderShops = () => {
  const shops = loadShops();
  if(!shops.length){
    elements.shopsList.innerHTML = `<div class="empty-state"><svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg><h3>Ingen shops oprettet endnu</h3><p>Tilføj din første WooCommerce shop for at komme i gang</p></div>`;
    return;
  }
  const html = shops.map(s=>{
    const cls = s.status||'disconnected';
    const txt = { connected:'Forbundet',disconnected:'Ikke forbundet',testing:'Tester...' }[cls]||'Ukendt';
    return `<div class="shop-card ${cls}" data-id="${s.id}">
      <div class="shop-header"><div class="shop-info"><div class="shop-name">${s.name}</div><div class="shop-url">${s.url}</div><div class="shop-ssl">SSL: ${s.ssl === false ? 'Fra' : 'Til'}</div><div class="shop-status"><div class="status-dot ${cls}"></div><span>${txt}</span></div></div></div>
      <div class="shop-actions">
        <button class="btn btn-secondary test-shop-btn" data-id="${s.id}">Test</button>
        <button class="btn btn-secondary edit-shop-btn" data-id="${s.id}">Rediger</button>
        <button class="btn btn-danger remove-shop-btn" data-id="${s.id}">Slet</button>
      </div>
    </div>`;
  }).join('');
  elements.shopsList.innerHTML = html;
};

const handleTestConnection = async () => {
  const shop = {
    name: elements.shopName.value.trim(),
    url: elements.shopUrl.value.trim(),
    key: elements.consumerKey.value.trim(),
    secret: elements.consumerSecret.value.trim(),
    ssl: elements.useSSL.checked
  };
  if(!shop.name || !shop.url || !shop.key || !shop.secret){
    showStatus('Udfyld alle felter først','error');
    return;
  }
  elements.testConnection.disabled = true;
  elements.testConnection.innerHTML = '<div class="spinner"></div> Tester...';
  showStatus('Tester forbindelse...','info');
  try {
    await testShopConnection(shop);
    showStatus('✅ Forbindelse successfuld! Du kan nu gemme shoppen.','success');
  } catch(err){
    showStatus(`❌ Forbindelse fejlede: ${err.message}`,'error');
  } finally {
    elements.testConnection.disabled = false;
    elements.testConnection.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Test Forbindelse';
  }
};

const handleAddShop = async e => {
  e.preventDefault();
  const shop = {
    id: generateId(),
    name: elements.shopName.value.trim(),
    url: elements.shopUrl.value.trim(),
    key: elements.consumerKey.value.trim(),
    secret: elements.consumerSecret.value.trim(),
    ssl: elements.useSSL.checked,
    status: 'testing'
  };
  if(!shop.name || !shop.url || !shop.key || !shop.secret){
    showStatus('Udfyld alle felter først','error');
    return;
  }
  const shops = loadShops();
  try {
    await testShopConnection(shop);
    shop.status = 'connected';
    showStatus('Shop gemt og forbindelse virker','success');
  } catch(err){
    shop.status = 'disconnected';
    showStatus('Shop gemt, men forbindelse fejlede','warning');
  }
  shops.push(shop);
  saveShops(shops);
  elements.shopForm.reset();
  renderShops();
  updateStats();
};

elements.shopsList.addEventListener('click', async e => {
  const id = e.target.dataset.id;
  if(e.target.classList.contains('remove-shop-btn')){
    const shops = loadShops().filter(s=>s.id!==id);
    saveShops(shops);
    renderShops();
    updateStats();
  } else if(e.target.classList.contains('test-shop-btn')){
    const shops = loadShops();
    const shop = shops.find(s=>s.id===id);
    if(!shop) return;
    e.target.disabled = true;
    const original = e.target.innerHTML;
    e.target.innerHTML = '<div class="spinner"></div>';
    shop.status = 'testing';
    renderShops();
    try {
      await testShopConnection(shop);
      shop.status = 'connected';
    } catch { shop.status = 'disconnected'; }
    saveShops(shops);
    renderShops();
    updateStats();
    e.target.disabled = false;
    e.target.innerHTML = original;
  } else if(e.target.classList.contains('edit-shop-btn')){
    const shop = loadShops().find(s=>s.id===id);
    if(!shop) return;
    elements.shopName.value = shop.name;
    elements.shopUrl.value = shop.url;
    elements.consumerKey.value = shop.key;
    elements.consumerSecret.value = shop.secret;
    elements.useSSL.checked = shop.ssl !== false;
    elements.addShop.textContent = 'Opdater Shop';
    elements.addShop.dataset.editId = id;
  }
});

elements.testAllConnections.addEventListener('click', async () => {
  const shops = loadShops();
  if(!shops.length) return;
  elements.testAllConnections.disabled = true;
  elements.testAllConnections.innerHTML = '<div class="spinner"></div> Tester...';
  for(const shop of shops){
    shop.status = 'testing';
    renderShops();
    try {
      await testShopConnection(shop);
      shop.status = 'connected';
    } catch { shop.status = 'disconnected'; }
  }
  saveShops(shops);
  renderShops();
  updateStats();
  elements.testAllConnections.disabled = false;
  elements.testAllConnections.innerHTML = 'Test Alle Forbindelser';
});

elements.shopForm.addEventListener('submit', e => {
  if(elements.addShop.dataset.editId){
    const shops = loadShops();
    const shop = shops.find(s=>s.id===elements.addShop.dataset.editId);
    if(shop){
      shop.name = elements.shopName.value.trim();
      shop.url = elements.shopUrl.value.trim();
      shop.key = elements.consumerKey.value.trim();
      shop.secret = elements.consumerSecret.value.trim();
      shop.ssl = elements.useSSL.checked;
      shop.status = 'disconnected';
      saveShops(shops);
      renderShops();
      updateStats();
      elements.addShop.textContent = 'Gem Shop';
      delete elements.addShop.dataset.editId;
      elements.shopForm.reset();
      showStatus('Shop opdateret','success');
    }
    e.preventDefault();
  } else {
    handleAddShop(e);
  }
});

elements.testConnection.addEventListener('click', handleTestConnection);

document.addEventListener('DOMContentLoaded', () => {
  renderShops();
  updateStats();
});
