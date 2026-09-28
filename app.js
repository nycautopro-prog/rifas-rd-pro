const state={
  total:Number(localStorage.getItem('raffle_total')||5000),
  price:Number(localStorage.getItem('raffle_price')||500),
  selected:new Set(),
  visible:400
};

function formatRD(n){
  return new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',maximumFractionDigits:0}).format(n);
}
function soldSet(){
  const raw=localStorage.getItem('sold_numbers');
  if(raw) return new Set(JSON.parse(raw));
  const s=new Set();
  for(let i=7;i<=state.total;i+=17) s.add(i);
  return s;
}
const sold=soldSet();

function numberLabel(n){return String(n).padStart(4,'0')}

function renderTickets(){
  const grid=document.querySelector('#ticketGrid'); if(!grid) return;
  const searchEl=document.querySelector('#numberSearch');
  const filter=document.querySelector('#ticketFilter')?.value||'all';
  const search=Number(searchEl?.value||0);
  let nums;

  if(search){
    nums=[search];
  }else if(filter==='selected'){
    nums=[...state.selected].sort((a,b)=>a-b);
  }else{
    const max=Math.min(state.total,state.visible);
    nums=Array.from({length:max},(_,i)=>i+1);
    if(filter==='available') nums=nums.filter(n=>!sold.has(n));
  }

  grid.innerHTML='';
  if(!nums.length){
    grid.innerHTML='<div class="muted" style="grid-column:1/-1;padding:24px;text-align:center">No hay números para mostrar con este filtro.</div>';
  }

  for(const n of nums){
    if(n<1||n>state.total) continue;
    const b=document.createElement('button');
    b.type='button';
    b.className='ticket'+(sold.has(n)?' sold':'')+(state.selected.has(n)?' selected':'');
    b.textContent=numberLabel(n);
    b.disabled=sold.has(n);
    b.setAttribute('aria-label',sold.has(n)?`Número ${numberLabel(n)} vendido`:`Seleccionar número ${numberLabel(n)}`);
    b.onclick=()=>{
      state.selected.has(n)?state.selected.delete(n):state.selected.add(n);
      renderTickets(); updateSummary();
    };
    grid.appendChild(b);
  }

  const hint=document.querySelector('#gridHint');
  if(hint){
    if(search) hint.textContent=search>=1&&search<=state.total?'Resultado de búsqueda.':'Número fuera del rango disponible.';
    else if(filter==='selected') hint.textContent=`${state.selected.size} número(s) seleccionado(s).`;
    else hint.textContent=`Mostrando hasta ${Math.min(state.visible,state.total).toLocaleString()} de ${state.total.toLocaleString()} números.`;
  }
}

function updateSummary(){
  const holder=document.querySelector('#selectedList'); if(!holder) return;
  const arr=[...state.selected].sort((a,b)=>a-b);
  holder.innerHTML=arr.length
    ?arr.map(n=>`<button class="chip" type="button" onclick="removeNumber(${n})" title="Quitar número">${numberLabel(n)} ×</button>`).join('')
    :'<span class="muted">Aún no has seleccionado números.</span>';
  document.querySelector('#ticketCount').textContent=arr.length;
  document.querySelector('#totalPrice').textContent=formatRD(arr.length*state.price);
  const each=document.querySelector('#priceEach'); if(each) each.textContent=formatRD(state.price);
}

function removeNumber(n){
  state.selected.delete(n); renderTickets(); updateSummary();
}
function randomIndex(max){
  if(window.crypto?.getRandomValues){
    const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%max;
  }
  return Math.floor(Math.random()*max);
}
function quickPickMany(qty){
  const free=[];
  for(let i=1;i<=state.total;i++) if(!sold.has(i)&&!state.selected.has(i)) free.push(i);
  const take=Math.min(qty,free.length);
  for(let i=0;i<take;i++){
    const idx=randomIndex(free.length);
    const n=free.splice(idx,1)[0];
    state.selected.add(n);
  }
  renderTickets(); updateSummary();
  showToast(take?`Agregamos ${take} número(s) disponible(s).`:'No quedan números disponibles.');
}
function quickPick(){quickPickMany(1)}
function clearSelection(){state.selected.clear();renderTickets();updateSummary()}
function loadMoreTickets(){
  state.visible=Math.min(state.total,state.visible+400);
  renderTickets();
  showToast(state.visible>=state.total?'Ya estás viendo todos los números.':'Mostramos 400 números adicionales.');
}

function checkout(){
  if(!state.selected.size){
    showToast('Selecciona al menos un número para continuar.');
    document.querySelector('#boletos')?.scrollIntoView({behavior:'smooth'});
    return;
  }
  const arr=[...state.selected].sort((a,b)=>a-b);
  document.querySelector('#modalNumbers').textContent=arr.map(numberLabel).join(', ');
  document.querySelector('#modalTotal').textContent=formatRD(arr.length*state.price);
  const modal=document.querySelector('#checkoutModal');
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}
function closeCheckout(){
  const modal=document.querySelector('#checkoutModal');
  modal?.classList.remove('open'); modal?.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}
function submitDemoOrder(){
  const name=document.querySelector('#buyerName').value.trim();
  const phone=document.querySelector('#buyerPhone').value.trim();
  const email=document.querySelector('#buyerEmail').value.trim();
  const method=document.querySelector('#paymentMethod').value;
  if(!name||!phone){
    showToast('Completa nombre y teléfono para crear la solicitud demo.');
    return;
  }
  const order={
    id:'RD'+Date.now().toString().slice(-8),
    name,phone,email,method,
    numbers:[...state.selected].sort((a,b)=>a-b),
    total:[...state.selected].length*state.price,
    status:'Pendiente demo',
    createdAt:new Date().toISOString()
  };
  const orders=JSON.parse(localStorage.getItem('demo_orders')||'[]');
  orders.unshift(order);
  localStorage.setItem('demo_orders',JSON.stringify(orders.slice(0,50)));
  closeCheckout();
  showToast(`Solicitud demo ${order.id} creada. No se realizó ningún cobro.`);
  state.selected.clear(); renderTickets(); updateSummary();
}

function verifyTicket(){
  const input=document.querySelector('#verifyNumber');
  const result=document.querySelector('#verifyResult');
  const n=Number(input?.value||0);
  result.className='verify-result';
  if(!n||n<1||n>state.total){
    result.textContent=`Ingresa un número entre 1 y ${state.total.toLocaleString()}.`;
    return;
  }
  if(sold.has(n)){
    result.classList.add('bad');
    result.innerHTML=`#${numberLabel(n)} · <b>NO DISPONIBLE</b> en esta demostración.`;
  }else{
    result.classList.add('ok');
    result.innerHTML=`#${numberLabel(n)} · <b>DISPONIBLE</b> en esta demostración.`;
  }
}

let toastTimer;
function showToast(message){
  const el=document.querySelector('#toast'); if(!el) return;
  el.textContent=message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),3200);
}
function openSupport(){
  showToast('El botón de WhatsApp se conectará cuando agreguemos el número oficial de soporte.');
}

window.addEventListener('keydown',e=>{if(e.key==='Escape') closeCheckout()});
window.addEventListener('DOMContentLoaded',()=>{
  state.total=Number(localStorage.getItem('raffle_total')||5000);
  state.price=Number(localStorage.getItem('raffle_price')||500);
  const s=document.querySelector('#numberSearch');
  if(s){
    s.max=state.total;
    s.addEventListener('input',renderTickets);
  }
  const verify=document.querySelector('#verifyNumber');
  if(verify){
    verify.max=state.total;
    verify.addEventListener('keydown',e=>{if(e.key==='Enter') verifyTicket()});
  }
  renderTickets(); updateSummary();
});