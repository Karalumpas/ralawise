const elements = {
  nameInput: document.getElementById('nameInput'),
  urlInput: document.getElementById('urlInput'),
  keyInput: document.getElementById('keyInput'),
  secretInput: document.getElementById('secretInput'),
  addShopBtn: document.getElementById('addShopBtn'),
  shopList: document.getElementById('shopList'),
  settingsStatus: document.getElementById('settingsStatus')
};

const loadShops = () => {
  try { return JSON.parse(localStorage.getItem('wooShops')) || []; } catch { return []; }
};
const saveShops = shops => localStorage.setItem('wooShops', JSON.stringify(shops));

const showStatus = (msg,type='info') => {
  elements.settingsStatus.innerHTML = `<div class="status ${type}">${msg}</div>`;
};

const renderShops = () => {
  const shops = loadShops();
  if(!shops.length){
    elements.shopList.innerHTML = '<li>Ingen shops gemt</li>';
    return;
  }
  elements.shopList.innerHTML = shops.map(s=>
    `<li class="flex items-center justify-between p-2 border rounded">
       <span>${s.name} (${s.url})</span>
       <button class="remove-btn text-red-600" data-id="${s.id}">Fjern</button>
     </li>`).join('');
};

elements.addShopBtn.addEventListener('click', () => {
  const name = elements.nameInput.value.trim();
  const url = elements.urlInput.value.trim();
  const key = elements.keyInput.value.trim();
  const secret = elements.secretInput.value.trim();
  if(!name || !url || !key || !secret){
    return showStatus('Udfyld alle felter','error');
  }
  try { new URL(url); } catch { return showStatus('Ugyldig URL','error'); }
  const shops = loadShops();
  shops.push({ id: Date.now().toString(), name, url, key, secret });
  saveShops(shops);
  renderShops();
  showStatus('Shop gemt','success');
  elements.nameInput.value = elements.urlInput.value = elements.keyInput.value = elements.secretInput.value = '';
});

elements.shopList.addEventListener('click', e => {
  if(e.target.matches('.remove-btn')){
    const id = e.target.dataset.id;
    const shops = loadShops().filter(s=>s.id!==id);
    saveShops(shops);
    renderShops();
  }
});

document.addEventListener('DOMContentLoaded', renderShops);
