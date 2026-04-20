// ===== 初始化 =====
function init(){
  if(!localStorage.getItem("products")){
    localStorage.setItem("products", JSON.stringify([
      {id:1,name:"雞蛋糕",price:50,category:"餐點"}
    ]));
  }

  if(!localStorage.getItem("orders")){
    localStorage.setItem("orders","[]");
  }
}
init();

// ===== 資料 =====
let products = JSON.parse(localStorage.getItem("products"));
let orders = JSON.parse(localStorage.getItem("orders"));
let order = [];
let currentCategory="全部";

// ===== 分類順序（⭐關鍵）=====
let categoryOrder = JSON.parse(localStorage.getItem("categoryOrder") || "null");

if(!categoryOrder){
  categoryOrder = [...new Set(products.map(p=>p.category))];
  localStorage.setItem("categoryOrder", JSON.stringify(categoryOrder));
}

// ===== 分頁切換 =====
function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const target = document.getElementById("page-" + page);
  if(target) target.classList.add("active");

  // ⭐ 分頁渲染（關鍵）
  if(page === "history"){
    renderHistory();
  }

  if(page === "monthDaily"){
    renderMonthDaily();
    renderMonthProductStats();
  }

  if(page === "todayStats"){
    renderProductStats();
  }

  if(page === "products"){
    renderProductList();
  }

  // POS永遠同步
  renderPOSCore();
}
// ===== DOM =====
const nameInput = document.getElementById("name");
const priceInput = document.getElementById("price");
const categoryInput = document.getElementById("category");

const posMenu = document.getElementById("posMenu");
const categoryFilter = document.getElementById("categoryFilter");
const orderList = document.getElementById("orderList");
const totalEl = document.getElementById("total");

const todayRevenue = document.getElementById("todayRevenue");
const todayOrders = document.getElementById("todayOrders");
const todayQty = document.getElementById("todayQty");
const monthRevenue = document.getElementById("monthRevenue");

const cashInput = document.getElementById("cashInput");
const changeEl = document.getElementById("change");

// ===== 工具 =====
function generateOrderId(){
  return orders.length + 1;
}

// ===== POS核心 =====
function renderPOSCore(){
  renderCategories();
  renderPOS();
  renderOrder();
  renderToday();
}

// ===== 商品新增 =====
function addProduct(){
  const name = nameInput.value.trim();
  const price = priceInput.value;
  const category = categoryInput.value || "其他";

  if(!name || !price) return alert("請輸入完整");

  products.push({
    id:Date.now(),
    name,
    price:Number(price),
    category
  });

  // ⭐ 若新分類不存在 → 加入分類順序
  if(!categoryOrder.includes(category)){
    categoryOrder.push(category);
    localStorage.setItem("categoryOrder", JSON.stringify(categoryOrder));
  }

  localStorage.setItem("products", JSON.stringify(products));

  nameInput.value="";
  priceInput.value="";
  categoryInput.value="";

  renderProductList();
  renderPOSCore();
}

// ===== 商品刪除 =====
function deleteProduct(id){
  if(!confirm("確定刪除商品？")) return;

  products = products.filter(p=>p.id!==id);
  localStorage.setItem("products", JSON.stringify(products));

  renderProductList();
  renderPOSCore();
}

// ===== 分類 =====
function renderCategories(){
  if(!categoryFilter) return;

  const cats=["全部",...categoryOrder];

  categoryFilter.innerHTML="";
  cats.forEach(c=>{
    const btn=document.createElement("button");
    btn.innerText=c;
    btn.onclick=()=>{currentCategory=c; renderPOSCore();}
    categoryFilter.appendChild(btn);
  });
}

// ===== 商品按鈕 =====
function renderPOS(){
  if(!posMenu) return;

  posMenu.innerHTML="";

  products
    .filter(p=>currentCategory==="全部"||p.category===currentCategory)
    .forEach(p=>{
      const btn=document.createElement("button");
      btn.innerText=`${p.name}\n$${p.price}`;
      btn.onclick=()=>addToOrder(p);
      posMenu.appendChild(btn);
    });
}

// ===== 訂單 =====
function addToOrder(p){

  let item = order.find(i=>i.id===p.id);

  if(item){
    item.qty++;
  }else{
    order.push({...p,qty:1});
  }

  renderOrder();

  // ⭐ 滾到最底（很有感）
  const list = document.getElementById("orderList");
  if(list){
    list.scrollTop = list.scrollHeight;
  }
}

function changeQty(i,d){
  order[i].qty+=d;
  if(order[i].qty<=0) order.splice(i,1);
  renderOrder();
}

function renderOrder(){
  if(!orderList) return;

  orderList.innerHTML="";
  let total=0;

  order.forEach((i,idx)=>{
    total+=i.price*i.qty;

    orderList.innerHTML+=`
      <div class="order-item">
        ${i.name} x${i.qty}
        <button onclick="changeQty(${idx},1)">+</button>
        <button onclick="changeQty(${idx},-1)">-</button>
      </div>`;
  });

  totalEl.innerText=total;
  calculateChange();
}

// ===== 找零 =====
function addCash(amount){
  if(!cashInput) return;
  cashInput.value = Number(cashInput.value||0)+amount;
  calculateChange();
}

function calculateChange(){
  if(!cashInput || !totalEl || !changeEl) return;
  const cash = Number(cashInput.value||0);
  const total = Number(totalEl.innerText);
  changeEl.innerText = cash-total >=0 ? cash-total : 0;
}

// ===== 結帳 =====
function checkout(){
  if(order.length===0) return;

  const total = Number(totalEl.innerText);

  let qty=0;
  order.forEach(i=> qty+=i.qty);

  orders.push({
    id: generateOrderId(),
    time:Date.now(),
    total,
    qty,
    items: JSON.parse(JSON.stringify(order))
  });

  localStorage.setItem("orders", JSON.stringify(orders));

  order=[];
  if(cashInput) cashInput.value="";
  if(changeEl) changeEl.innerText=0;

  renderPOSCore();
}

// ===== 商品管理（含拖曳）=====
function renderProductList(){
  const box = document.getElementById("productList");
  if(!box) return;

  box.innerHTML="";

  const group = {};

  products.forEach(p=>{
    if(!group[p.category]) group[p.category]=[];
    group[p.category].push(p);
  });

  categoryOrder.forEach(cat=>{
    if(!group[cat]) return;

    box.innerHTML += `
      <h3 draggable="true"
          ondragstart="categoryDragStart('${cat}')"
          ondragover="dragOver(event)"
          ondrop="categoryDrop('${cat}')">
        ${cat}
      </h3>
    `;

    group[cat].forEach(p=>{
      box.innerHTML += `
        <div class="item-row"
            draggable="true"
            ondragstart="dragStart(${p.id}, '${cat}')"
            ondragover="dragOver(event)"
            ondrop="dropItem(${p.id}, '${cat}')">
          <span>${p.name}</span>
          <span>$${p.price}</span>
          <button onclick="deleteProduct(${p.id})">刪除</button>
        </div>
      `;
    });
  });
}

// ===== 商品拖曳 =====
let dragId = null;
let dragCategory = null;

function dragStart(id, category){
  dragId = id;
  dragCategory = category;
}

function dragOver(e){
  e.preventDefault();
}

function dropItem(targetId, category){
  if(category !== dragCategory) return;

  const from = products.findIndex(p=>p.id===dragId);
  const to   = products.findIndex(p=>p.id===targetId);

  if(from===-1||to===-1) return;

  const item = products.splice(from,1)[0];
  products.splice(to,0,item);

  localStorage.setItem("products", JSON.stringify(products));

  renderProductList();
  renderPOSCore();
}

// ===== 分類拖曳 =====
let dragCategoryName=null;

function categoryDragStart(cat){
  dragCategoryName=cat;
}

function categoryDrop(targetCat){
  const from = categoryOrder.indexOf(dragCategoryName);
  const to   = categoryOrder.indexOf(targetCat);

  if(from===-1||to===-1) return;

  const item = categoryOrder.splice(from,1)[0];
  categoryOrder.splice(to,0,item);

  localStorage.setItem("categoryOrder", JSON.stringify(categoryOrder));

  renderProductList();
}

// ===== 今日銷售 =====

function renderProductStats(){
  const box = document.getElementById("productStats");
  if(!box) return;

  const stats = {};
  let today = new Date();
  let totalRevenue = 0;

  orders.forEach(o=>{
    let d = new Date(o.time);

    if(d.toDateString() === today.toDateString()){
      totalRevenue += o.total;

      o.items.forEach(i=>{
        if(!stats[i.name]){
          stats[i.name] = {qty:0, amount:0};
        }

        stats[i.name].qty += i.qty;
        stats[i.name].amount += i.qty * i.price;
      });
    }
  });

  box.innerHTML = "";

  // ⭐ 固定順序（對帳用）
Object.keys(stats).forEach(name=>{
  const data = stats[name];

  box.innerHTML += `
    <div class="stats-card">
      <div class="name">${name}</div>
      <div class="info">
        <span>數量：${data.qty}</span>
        <span>金額：$${data.amount}</span>
      </div>
    </div>
  `;
});

if(Object.keys(stats).length === 0){
  box.innerHTML = "今日無銷售";
  return;
}

  // ⭐ 總營收
  box.innerHTML += `
    <div class="stats-total">
      今日總營收 $${totalRevenue}
    </div>
  `;
}


// ===== 本月銷售 =====
function renderMonthProductStats(){
  const box = document.getElementById("monthProductStats");
  if(!box) return;

  const stats = {};
  let now = new Date();

  orders.forEach(o=>{
    let d = new Date(o.time);

    if(
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    ){
      o.items.forEach(i=>{
        stats[i.name] = (stats[i.name] || 0) + i.qty;
      });
    }
  });

  box.innerHTML = "";

  const keys = Object.keys(stats);

  // ⭐ 沒有任何銷售
  if(keys.length === 0){
    box.innerHTML = "本月尚無商品銷售";
    return;
  }

  // ⭐ 只顯示有賣的
  keys.forEach(name=>{
    box.innerHTML += `<div>${name}：${stats[name]}</div>`;
  });
}


function renderHistory(){
  const box = document.getElementById("historyList");
  if(!box) return;

  box.innerHTML="";

  orders.slice().reverse().forEach((o, idx)=>{

    // ⭐ 真實 index（重點）
    const realIndex = orders.length - 1 - idx;

    box.innerHTML += `
      <div class="history-item">

        <div onclick="toggleOrder('${o.id}')">
          #${o.id} 💰${o.total} 📦${o.qty}
        </div>

        <div id="detail-${o.id}" style="display:block">
          ${o.items.map(i=>`${i.name} x${i.qty}`).join("<br>")}
          <br>
          <button onclick="deleteOrder(${realIndex})">刪除</button>
        </div>

      </div>
    `;
  });
}


function toggleOrder(id){
  const el = document.getElementById("detail-" + id);
  if(!el) return;

  el.style.display = (el.style.display === "none") ? "block" : "none";
}

function renderMonthDaily(){
  const box = document.getElementById("monthDaily");
  if(!box) return;

  const map = {};
  let now = new Date();

  orders.forEach(o=>{
    let d = new Date(o.time);

    if(
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    ){
      const day = d.getDate();

      if(!map[day]){
        map[day] = {
          list: [],
          total: 0
        };
      }

      map[day].list.push(o);
      map[day].total += o.total; // ⭐累加金額
    }
  });

  box.innerHTML = "";

  const validDays = Object.keys(map);

  if(validDays.length === 0){
    box.innerHTML = "本月尚無銷售";
    return;
  }

  validDays
    .sort((a,b)=>b-a)
    .forEach(day=>{
      const count = map[day].list.length;
      const total = map[day].total;

      box.innerHTML += `
        <div onclick="showDayDetail(${day})" style="cursor:pointer;">
          ${day}號（${count}筆）$${total}
        </div>
      `;
    });
}

function showDayDetail(day){

  const panel = document.getElementById("dayPanel");
  const body = document.getElementById("panelBody");
  const title = document.getElementById("panelTitle");

  if(!panel || !body) return;

  const list = orders.filter(o=>{
    let d=new Date(o.time);
    return d.getDate()==day;
  });

  title.innerText = `${day}號 明細`;

  if(list.length===0){
    body.innerHTML = "沒有資料";
  }else{
    let html = "";

    list.forEach(o=>{
      html += `
        <div class="panel-order">
          <div>#${o.id} 💰${o.total}</div>
          <div class="items">
            ${o.items.map(i=>`${i.name} x${i.qty}`).join("<br>")}
          </div>
        </div>
      `;
    });

    body.innerHTML = html;
  }

  panel.classList.add("show");
}

function closePanel(){
  const panel = document.getElementById("dayPanel");
  if(panel){
    panel.classList.remove("show");
  }
}

function renderToday(){
  if(!todayRevenue || !todayOrders || !todayQty) return;

  let today = new Date();
  let revenue = 0;
  let count = 0;
  let qty = 0;

  orders.forEach(o=>{
    let d = new Date(o.time);

    if(
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    ){
      revenue += o.total;
      count++;
      qty += o.qty;
    }
  });

  todayRevenue.innerText = revenue;
  todayOrders.innerText = count;
  todayQty.innerText = qty;
}

// ===== 數字鍵盤（唯一版本）=====
let currentInput = "";

function openPad(){
  const pad = document.getElementById("numPad");

  currentInput = ""; 

  if(pad){
    pad.classList.add("show");
  }
}

function closePad(){
  const pad = document.getElementById("numPad");
  if(pad){
    pad.classList.remove("show");
  }
}

function pressNum(num){
  currentInput += num;
  updateCash();
}

function clearNum(){
  currentInput = "";
  updateCash();
}




// 刪除一位（超重要）
function deleteOne(){
  currentInput = currentInput.slice(0, -1);
  updateCash();
}

// 點外面關閉
function closePadOutside(e){
  const pad = document.querySelector(".pad");

  // 如果點的是鍵盤內 → 不關
  if(pad.contains(e.target)) return;

  closePad();
} 

function clearCash(){
  const input = document.getElementById("cashInput");

  if(input){
    input.value = "";
  }

  // 同步找零
  const change = document.getElementById("change");
  if(change){
    change.innerText = 0;
  }
}

let lastDeletedOrder = null;
let undoTimer = null;

function deleteOrder(index){

  // 記住被刪的
  lastDeletedOrder = {
    data: orders[index],
    index: index
  };

  orders.splice(index, 1);

  localStorage.setItem("orders", JSON.stringify(orders));

  renderHistory();
  renderPOSCore();
  renderMonthDaily();
}


function showUndo(){
  const bar = document.getElementById("undoBar");
  if(!bar) return;

  if(undoTimer){
    clearTimeout(undoTimer);
  }

  bar.classList.add("show");

  undoTimer = setTimeout(()=>{
    bar.classList.remove("show");
  }, 3000);
}

function undoDelete(){
  if(!lastDeletedOrder) return;

  if(undoTimer){
    clearTimeout(undoTimer);
  }

  orders.splice(lastDeletedOrder.index, 0, lastDeletedOrder.data);

  localStorage.setItem("orders", JSON.stringify(orders));

  renderHistory();
  renderPOSCore();

  document.getElementById("undoBar").classList.remove("show");
}

function updateCash(){
  const input = document.getElementById("cashInput");
  if(input){
    input.value = currentInput;
  }

  calculateChange();
}

// ===== 啟動 =====
renderPOSCore();