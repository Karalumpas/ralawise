// Constants
const DEFAULT_MAX_VARIATIONS_PER_FILE = 25000;
const PRICE_FIELDS = ['price', 'regular_price', 'sale_price'];
const PREVIEW_LIMIT = 20;

// State
const state = {
  selectedFiles: [],
  processedData: { parents: [], variations: [] },
  categories: new Map(),
  products: new Map(),
  selectedCategories: new Set(),
  selectedProducts: new Set(),
  statistics: {},
  filteredCategories: [],
  filteredProducts: [],
  activePreviewTab: 'parents'
};

// DOM elements
const elements = {
  uploadSection: document.getElementById('uploadSection'),
  fileInput: document.getElementById('fileInput'),
  fileList: document.getElementById('fileList'),
  processBtn: document.getElementById('processBtn'),
  btnText: document.getElementById('btnText'),
  statusMsg: document.getElementById('statusMsg'),
  exportSection: document.getElementById('exportSection'),
  statsGrid: document.getElementById('statsGrid'),
  categoryList: document.getElementById('categoryList'),
  productList: document.getElementById('productList'),
  categorySearch: document.getElementById('categorySearch'),
  productSearch: document.getElementById('productSearch'),
  categoryCount: document.getElementById('categoryCount'),
  productCount: document.getElementById('productCount'),
  exchangeRateInput: document.getElementById('exchangeRateInput'),
  maxVariationsInput: document.getElementById('maxVariationsInput'),
  exportBtn: document.getElementById('exportBtn'),
  previewHeader: document.getElementById('previewHeader'),
  previewBody: document.getElementById('previewBody'),
  exportStatus: document.getElementById('exportStatus'),
  historySection: document.getElementById('historySection'),
  historyList: document.getElementById('historyList')
};

// Utility functions
const formatFileSize = bytes => {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes)/Math.log(k));
  return (bytes/Math.pow(k,i)).toFixed(1) + ' ' + sizes[i];
};

const timestamp = () => {
  const now = new Date(), pad = n => String(n).padStart(2,'0');
  return `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
};

const sanitizeFileName = name => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9-_.]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'file';
};

const showStatus = (msg,type='info') => {
  elements.statusMsg.innerHTML = `<div class="status ${type}">${msg}</div>`;
};

const showExportStatus = (msg,type='info') => {
  elements.exportStatus.innerHTML = `<div class="status ${type}">${msg}</div>`;
};

const setButtonLoading = (btn,loading) => {
  const svg = btn.querySelector('svg'), txt = btn.querySelector('span')||btn;
  if (loading) {
    btn.disabled = true;
    if(svg) svg.style.display='none';
    txt.innerHTML = '<div class="spinner"></div> Behandler...';
  } else {
    btn.disabled = false;
    if(svg) svg.style.display='block';
    txt.textContent = btn.id==='processBtn'? 'Behandl filer' : 'Eksporter CSV';
  }
};

// CSV parsing
const parseCSV = content => {
  const res = Papa.parse(content, {
    header: true, skipEmptyLines: true, delimiter: ',',
    quoteChar: '"', escapeChar: '"',
    transform: v => typeof v==='string'?v.trim():v,
    transformHeader: h=>h.trim()
  });
  if (res.errors.length) console.warn(res.errors);
  return res.data.filter(row =>
    Object.values(row).some(v => v && v.toString().trim())
  );
};

// Price conversion for preview/export
const convertPrice = (val,rate) => {
  if (!val) return '';
  const num = parseFloat(val.toString().replace(',', '.'));
  return isNaN(num)?'': (num*rate).toFixed(2).replace('.',',');
};

// Selection helpers
const getSelectedParents = () => {
  if (state.selectedCategories.size) {
    return state.processedData.parents.filter(p =>
      state.selectedCategories.has(p['tax:product_cat']||'Ukategoriseret')
    );
  }
  if (state.selectedProducts.size) {
    return state.processedData.parents.filter(p =>
      state.selectedProducts.has(p.sku)
    );
  }
  return [];
};

const getSelectedVariations = () => {
  const parents = getSelectedParents().map(p=>p.sku);
  return state.processedData.variations.filter(v=>
    parents.includes(v.parent_sku)
  );
};

// Statistics
const updateStatistics = () => {
  const stats = state.statistics;
  const selP = getSelectedParents().length;
  const selV = getSelectedVariations().length;
  elements.statsGrid.innerHTML = `
    <div class="stat-card"><div class="stat-title">Indlæste Parents</div><div class="stat-value">${stats.parents_valid||0}</div></div>
    <div class="stat-card"><div class="stat-title">Indlæste Variationer</div><div class="stat-value">${stats.variations_valid||0}</div></div>
    <div class="stat-card"><div class="stat-title">Valgte Parents</div><div class="stat-value">${selP}</div></div>
    <div class="stat-card"><div class="stat-title">Valgte Variationer</div><div class="stat-value">${selV}</div></div>
  `;
};

// Rendering filters
const renderFilters = () => {
  const catTerm = elements.categorySearch.value.toLowerCase();
  state.filteredCategories = Array.from(state.categories.values()).filter(c=>
    c.name.toLowerCase().includes(catTerm)
  );
  elements.categoryList.innerHTML = state.filteredCategories.map(c=>`
    <div class="filter-item${state.selectedCategories.has(c.name)?' selected':''}" data-category="${c.name}">
      <input type="checkbox" class="filter-checkbox"${state.selectedCategories.has(c.name)?' checked':''}>
      <div class="filter-content">
        <div class="filter-name">${c.name}</div>
        <div class="filter-meta"><span class="meta-tag">${c.products.length} produkter</span></div>
      </div>
    </div>
  `).join('');
  elements.categoryCount.textContent = `${state.selectedCategories.size} valgt`;

  const prodTerm = elements.productSearch.value.toLowerCase();
  state.filteredProducts = Array.from(state.products.values()).filter(p=>
    p.name.toLowerCase().includes(prodTerm)||p.sku.toLowerCase().includes(prodTerm)
  );
  elements.productList.innerHTML = state.filteredProducts.map(p=>`
    <div class="filter-item${state.selectedProducts.has(p.sku)?' selected':''}" data-sku="${p.sku}">
      <input type="checkbox" class="filter-checkbox"${state.selectedProducts.has(p.sku)?' checked':''}>
      <div class="filter-content">
        <div class="filter-name">${p.name}</div>
        <div class="filter-meta">
          <span class="meta-tag">${p.sku}</span>
          <span class="meta-tag">${p.category}</span>
          <span class="meta-tag">DKK ${parseFloat(p.price||0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  `).join('');
  elements.productCount.textContent = `${state.selectedProducts.size} valgt`;

  updateStatistics();
  updatePreview();
};

// Live preview
const updatePreview = () => {
  const raw = state.activePreviewTab==='parents'
    ? getSelectedParents() : getSelectedVariations();
  if (!raw.length) {
    elements.previewHeader.innerHTML = '';
    elements.previewBody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:2rem;">Ingen data til forhåndsvisning.</td></tr>';
    return;
  }
  const rate = parseFloat(elements.exchangeRateInput.value.replace(',', '.'))||1;
  const data = raw.map(r=>{
    const o = {...r};
    PRICE_FIELDS.forEach(f=>{ if(f in o) o[f]=convertPrice(o[f],rate); });
    return o;
  });
  const cols = Object.keys(data[0]);
  elements.previewHeader.innerHTML = '<tr>'+cols.map(h=>`<th>${h}</th>`).join('')+'</tr>';
  elements.previewBody.innerHTML = data.slice(0,PREVIEW_LIMIT).map(r=>
    '<tr>'+cols.map(h=>`<td title="${r[h]||''}">${r[h]||''}</td>`).join('')+'</tr>'
  ).join('') +
    (data.length>PREVIEW_LIMIT
      ? `<tr><td colspan="${cols.length}" style="text-align:center;font-style:italic;padding:1rem;">… og ${data.length-PREVIEW_LIMIT} flere rækker</td></tr>`
      : '');

};

// File list
const updateFileList = () => {
  if (!state.selectedFiles.length) {
    elements.fileList.classList.add('hidden');
    return;
  }
  elements.fileList.classList.remove('hidden');
  elements.fileList.innerHTML = state.selectedFiles.map(f=>`
    <div class="file-item">
      <svg class="file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
        </path>
      </svg>
      <div class="filter-content">
        <div class="filter-name">${f.name}</div>
        <div class="filter-meta"><span class="meta-tag">${formatFileSize(f.size)}</span></div>
      </div>
    </div>
  `).join('');
};

// Fetch and render history
const fetchHistory = async () => {
  try {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('Cannot load history');
    const entries = await res.json();
    if (!entries.length) return;
    elements.historySection.classList.remove('hidden');
    elements.historyList.innerHTML = entries.map(e=>`<div class="p-2 bg-gray-100 rounded" data-file="${e.file}">
        <a href="/history/${e.file}" class="text-blue-600 underline mr-2">${e.file}</a>
        <span class="text-sm">(${new Date(e.timestamp).toLocaleString()}, P: ${e.parents}, V: ${e.variations})</span>
      </div>`).join('');
  } catch {
    console.warn('Unable to fetch history');
  }
};

// Handle file selection
const handleFiles = files => {
  const zips = Array.from(files).filter(f=>f.name.toLowerCase().endsWith('.zip'));
  if (!zips.length) {
    showStatus('Kun ZIP-filer er understøttet','error');
    return;
  }
  state.selectedFiles = zips;
  updateFileList();
  elements.processBtn.disabled = false;
  showStatus(`${zips.length} ZIP-fil(er) valgt og klar til behandling`,'success');
};

// Process ZIPs
const processZipFiles = async () => {
  setButtonLoading(elements.processBtn,true);
  showStatus('Læser ZIP-filer...','info');
  state.processedData = { parents:[], variations:[] };
  state.categories.clear(); state.products.clear();
  state.selectedCategories.clear(); state.selectedProducts.clear();
  try {
    let count=0;
    for (const file of state.selectedFiles) {
      const zip = await JSZip.loadAsync(file);
      for (const [path, zf] of Object.entries(zip.files)) {
        if (zf.dir||!path.toLowerCase().endsWith('.csv')) continue;
        count++;
        showStatus(`Behandler fil ${count}: ${path}`,'info');
        const u8 = await zf.async('uint8array');
        let text;
        try { text = new TextDecoder('utf-8',{fatal:true}).decode(u8); }
        catch { text = new TextDecoder('windows-1252').decode(u8); }
        const data = parseCSV(text);
        if (!data.length) continue;
        const isParent = path.toLowerCase().includes('parent') ||
          data.some(r=>!r.parent_sku||r.parent_sku===r.sku);
        (isParent ? state.processedData.parents : state.processedData.variations)
          .push(...data);
      }
    }
    if (!state.processedData.parents.length&&!state.processedData.variations.length) {
      throw new Error('Ingen gyldige CSV-data fundet');
    }
    await processProductData();
    elements.exportSection.classList.remove('hidden');
    showStatus('Filer behandlet succesfuldt!','success');
  } catch (e) {
    showStatus(`Fejl: ${e.message}`,'error');
  } finally {
    setButtonLoading(elements.processBtn,false);
  }
};

// Post-process data
const processProductData = async () => {
  const { parents, variations } = state.processedData;
  state.statistics = { parents_total: parents.length, variations_total: variations.length };
  const skuSet = new Set(parents.map(p=>p.sku?.trim()).filter(Boolean));
  const before = variations.length;
  state.processedData.variations = variations.filter(v=>skuSet.has(v.parent_sku?.trim()));
  state.statistics.variations_discarded = before - state.processedData.variations.length;
  state.statistics.parents_valid = parents.length;
  state.statistics.variations_valid = state.processedData.variations.length;
  // categories
  parents.forEach(p=>{
    const cat = (p['tax:product_cat']||'Ukategoriseret').trim();
    if (!state.categories.has(cat)) state.categories.set(cat,{name:cat,products:[]});
    state.categories.get(cat).products.push(p);
  });
  // products
  parents.forEach(p=>{
    const sku = p.sku?.trim();
    if (!sku) return;
    state.products.set(sku,{
      sku, name: (p.name||sku).trim(),
      category: p['tax:product_cat']||'Ukategoriseret',
      price: p.regular_price||p.price||'0',
      status: p.status||'publish'
    });
  });
  renderFilters();
  updateStatistics();
  updatePreview();
};

// Event handlers
const initEventHandlers = () => {
  // file upload
  elements.uploadSection.addEventListener('dragover',e=>{ e.preventDefault(); elements.uploadSection.classList.add('dragover'); });
  elements.uploadSection.addEventListener('dragleave',e=>{ if(!elements.uploadSection.contains(e.relatedTarget)) elements.uploadSection.classList.remove('dragover'); });
  elements.uploadSection.addEventListener('drop',e=>{ e.preventDefault(); elements.uploadSection.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  elements.fileInput.addEventListener('change',e=>handleFiles(e.target.files));

  // process
  elements.processBtn.addEventListener('click', processZipFiles);

  // filters
  elements.categorySearch.addEventListener('input', renderFilters);
  elements.productSearch.addEventListener('input', renderFilters);
  document.getElementById('selectAllCategories').addEventListener('click',()=>{
    state.filteredCategories.forEach(c=>state.selectedCategories.add(c.name));
    state.selectedProducts.clear();
    renderFilters();
  });
  document.getElementById('clearAllCategories').addEventListener('click',()=>{
    state.selectedCategories.clear(); renderFilters();
  });
  document.getElementById('selectAllProducts').addEventListener('click',()=>{
    state.filteredProducts.forEach(p=>state.selectedProducts.add(p.sku));
    state.selectedCategories.clear(); renderFilters();
  });
  document.getElementById('clearAllProducts').addEventListener('click',()=>{
    state.selectedProducts.clear(); renderFilters();
  });
  elements.categoryList.addEventListener('click',e=>{
    const item = e.target.closest('.filter-item'); if(!item) return;
    const cat = item.dataset.category;
    state.selectedCategories.has(cat)? state.selectedCategories.delete(cat) : state.selectedCategories.add(cat);
    state.selectedProducts.clear(); renderFilters();
  });
  elements.productList.addEventListener('click',e=>{
    const item = e.target.closest('.filter-item'); if(!item) return;
    const sku = item.dataset.sku;
    state.selectedProducts.has(sku)? state.selectedProducts.delete(sku) : state.selectedProducts.add(sku);
    state.selectedCategories.clear(); renderFilters();
  });

  // preview tabs & rate change
  elements.exchangeRateInput.addEventListener('input', updatePreview);
  document.querySelectorAll('.preview-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.preview-tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.activePreviewTab = btn.dataset.tab;
      updatePreview();
    });
  });

  // export
  elements.exportBtn.addEventListener('click', async ()=>{
    const rate = parseFloat(elements.exchangeRateInput.value.replace(',', '.'));
    if (!rate||rate<=0) return showExportStatus('Ugyldig valutakurs','error');
    const parents = getSelectedParents(), variations = getSelectedVariations();
    if (!parents.length && !variations.length) return showExportStatus('Ingen data valgt til eksport','warning');
    const files = [];
    const addCSVChunk = (rows,name)=>{
      if (!rows.length) return;
      const cols = Object.keys(rows[0]);
      const data = rows.map(r=>{
        const o = {...r};
        PRICE_FIELDS.forEach(f=>{ if(f in o) o[f] = convertPrice(o[f],rate); });
        return o;
      });
      files.push({ filename: name, content: Papa.unparse(data,{columns:cols,delimiter:',',quotes:true}) });
    };
    const addCSV = (rows,name,isVariations=false)=>{
      if(!rows.length) return;
      if(isVariations){
        const maxLines = parseInt(elements.maxVariationsInput.value,10) || DEFAULT_MAX_VARIATIONS_PER_FILE;
        for(let i=0;i<rows.length;i+=maxLines){
          const chunk = rows.slice(i,i+maxLines);
          const idx = Math.floor(i/maxLines)+1;
          const base = name.replace(/\.csv$/,'');
          const fname = rows.length>maxLines ? `${base}-part${idx}.csv` : `${base}.csv`;
          addCSVChunk(chunk,fname);
        }
      } else {
        addCSVChunk(rows,name);
      }
    };
    try {
      showExportStatus('Genererer eksport...','info');
      if (state.selectedCategories.size) {
        state.selectedCategories.forEach(cat=>{
          const safe = sanitizeFileName(cat);
          const p = parents.filter(r=> (r['tax:product_cat']||'Ukategoriseret')===cat);
          addCSV(p,`parents-${safe}-${timestamp()}.csv`);
          const v = variations.filter(vr=>p.find(pp=>pp.sku===vr.parent_sku));
          addCSV(v,`variations-${safe}-${timestamp()}.csv`,true);
        });
      } else {
        addCSV(parents,`parents-${timestamp()}.csv`);
        addCSV(variations,`variations-${timestamp()}.csv`,true);
      }
      if (!files.length) return showExportStatus('Ingen data til eksport','warning');
      showExportStatus('Genererer ZIP-fil...','info');
      const zip = new JSZip();
      files.forEach(f=> zip.file(f.filename,f.content));
      const blob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{level:6} });
      const fileName = `woocommerce-export-${timestamp()}.zip`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // send to server for history
      const fd = new FormData();
      fd.append('file', blob, fileName);
      fd.append('parents', parents.length);
      fd.append('variations', variations.length);
      try { await fetch('/api/history', { method:'POST', body: fd }); } catch {}

      showExportStatus(`ZIP-fil genereret med ${files.length} filer!`,'success');
      fetchHistory();
    } catch(e) {
      showExportStatus(`Eksport fejl: ${e.message}`,'error');
    }
  });
};

// Init app
const init = () => {
  showStatus('Upload én eller flere ZIP-filer med WooCommerce CSV-data','info');
  initEventHandlers();
  fetchHistory();
};

document.addEventListener('DOMContentLoaded', init);
