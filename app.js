const state = {
  total: Number(localStorage.getItem('raffle_total') || 5000),
  price: Number(localStorage.getItem('raffle_price') || 500),
  selected: new Set(),
};

function formatRD(n){return new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',maximumFractionDigits:0}).format(n)}
function soldSet(){
  const raw=localStorage.getItem('sold_numbers');
  if(raw) return new Set(JSON.parse(raw));
  const s=new Set();
  for(let i=7;i<=state.total;i+=17) s.add(i);
  return s;
}
const sold=soldSet();

function renderTickets(){
  const grid=document.querySelector('#ticketGrid'); if(!grid) return;
  const search=Number(document.querySelector('#numberSearch')?.value||0);
  const limit=search?1:Math.min(state.total,600);
  grid.innerHTML='';
  const nums=search?[search]:Array.from({length:limit},(_,i)=>i+1);
  for(const n of nums){
    if(n<1||n>state.total) continue;
    const b=document.createElement('button');
    b.className='ticket'+(sold.has(n)?' sold':'')+(state.selected.has(n)?' selected':'');
    b.textContent=String(n).padStart(4,'0');
    b.disabled=sold.has(n);
    b.onclick=()=>{state.selected.has(n)?state.selected.delete(n):state.selected.add(n);renderTickets();updateSummary();};
    grid.appendChild(b);
  }
  const hint=document.querySelector('#gridHint');
  if(hint) hint.textContent=search?'Resultado de búsqueda':`Mostrando los primeros ${limit.toLocaleString()} números. Usa el buscador para consultar cualquiera hasta ${state.total.toLocaleString()}.`;
}
function updateSummary(){
  const holder=document.querySelector('#selectedList'); if(!holder) return;
  const arr=[...state.selected].sort((a,b)=>a-b);
  holder.innerHTML=arr.length?arr.map(n=>`<span class="chip">${String(n).padStart(4,'0')}</span>`).join(''):'<span class="muted">Aún no has seleccionado números.</span>';
  const count=document.querySelector('#ticketCount'); if(count) count.textContent=arr.length;
  const total=document.querySelector('#totalPrice'); if(total) total.textContent=formatRD(arr.length*state.price);
}
function quickPick(){
  const free=[]; for(let i=1;i<=state.total;i++) if(!sold.has(i)&&!state.selected.has(i)) free.push(i);
  if(!free.length) return;
  const n=free[Math.floor(Math.random()*free.length)]; state.selected.add(n); renderTickets(); updateSummary();
}
function clearSelection(){state.selected.clear();renderTickets();updateSummary();}
function checkout(){
  if(!state.selected.size) return alert('Selecciona al menos un número.');
  alert('DEMO: aquí se conectará AZUL, CardNET, BHD u otra pasarela aprobada para tu negocio.');
}
window.addEventListener('DOMContentLoaded',()=>{
  renderTickets(); updateSummary();
  const s=document.querySelector('#numberSearch'); if(s) s.addEventListener('input',renderTickets);
});
