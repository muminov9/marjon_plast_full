const A = location.origin;
let token = localStorage.getItem("mp_token"),
  me = JSON.parse(localStorage.getItem("mp_user") || "null"),
  db = {};
let lang = localStorage.getItem("mp_lang") || "uz";
let theme =
  localStorage.getItem("mp_theme") ||
  (globalThis.matchMedia && globalThis.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light");
document.documentElement.dataset.theme = theme;
const LOC = lang === "ru" ? "ru-RU" : lang === "en" ? "en-GB" : "uz-UZ";
const I = {
  uz: {
    Cash_qoldiq: "Qoldiq",
    salary_label: "Oylik",
    sale: "Sotuv",
    purchase: "Kirim",
    expense: "Rasxod",
    debt_payment: "Qarz to'lovi",
    payroll: "Oylik",
    salary: "Oylik",
    advance: "Avans",
  },
  ru: {},
  en: {},
};
I.ru = {
  Dashboard: "Панель",
  Mahsulotlar: "Товары",
  Mijozlar: "Клиенты",
  Qarzdorlik: "Задолженность",
  "Yetkazib beruvchilar": "Поставщики",
  Sotuv: "Продажа",
  Kirim: "Поступление",
  Ishchilar: "Работники",
  Oylik: "Зарплата",
  Kassa: "Касса",
  Hisobot: "Отчёт",
  Foydalanuvchilar: "Пользователи",
  "Audit log": "Журнал аудита",
  Chiqish: "Выход",
  "Biznes boshqaruv tizimi": "Система управления бизнесом",
  Login: "Логин",
  Parol: "Пароль",
  "Parol (6+)": "Пароль (6+)",
  Kirish: "Войти",
  "Birinchi ishga tushirish:": "Первый запуск:",
  "Admin yaratish": "Создать админа",
  "Tizimga birinchi kirish uchun asosiy administrator.":
    "Основной администратор для первого входа в систему.",
  Ism: "Имя",
  "Admin yaratildi": "Админ создан",
  "Login kerak": "Нужен вход",
  Xatolik: "Ошибка",
  "Ruxsat yo'q": "Нет доступа",
  "Ma'lumot yo'q": "Нет данных",
  Til: "Язык",
  Tema: "Тема",
  Bekor: "Отмена",
  Saqlash: "Сохранить",
  Saqlandi: "Сохранено",
  "Bugun: ": "Сегодня: ",
  "O'chirishni tasdiqlaysizmi?": "Подтвердить удаление?",
  "O'chirildi": "Удалено",
  "Yuklab olishda xatolik": "Ошибка скачивания",
  "Bugungi sotuv": "Продажи сегодня",
  "Bugungi foyda": "Прибыль сегодня",
  Qarzlar: "Долги",
  "Ombor qiymati": "Стоимость склада",
  "Tizim holati": "Состояние системы",
  Online: "Онлайн",
  "Ko'rsatkich": "Показатель",
  Qiymat: "Значение",
  "Kam qolgan mahsulot": "Товары заканчиваются",
  "Mahsulot qidirish...": "Поиск товара...",
  "Mahsulot qo'shish": "Добавить товар",
  "Mahsulotni tahrirlash": "Редактировать товар",
  Nomi: "Название",
  Kategoriya: "Категория",
  Birlik: "Ед. изм.",
  dona: "шт",
  "Kelish narxi": "Закупочная цена",
  "Sotish narxi": "Цена продажи",
  "Minimal qoldiq": "Мин. остаток",
  Kelish: "Закупка",
  Sotish: "Продажа",
  Qoldiq: "Остаток",
  "Cash_qoldiq": "Остаток",
  salary_label: "Зарплата",
  Holat: "Статус",
  Kam: "Мало",
  Yetarli: "Достаточно",
  "Mijoz qo'shish": "Добавить клиента",
  "Mijozni tahrirlash": "Редактировать клиента",
  Telefon: "Телефон",
  Manzil: "Адрес",
  Qarz: "Долг",
  "Qarzni qabul qilish": "Принять платёж",
  Mijoz: "Клиент",
  "To'lov": "Оплата",
  "Avval qarzdor mijoz yarating": "Сначала создайте должника",
  "Qarz to'lovi": "Оплата долга",
  Summa: "Сумма",
  Izoh: "Примечание",
  "Qo'shish": "Добавить",
  Tahrirlash: "Изменить",
  Sana: "Дата",
  Miqdor: "Количество",
  Mahsulot: "Товар",
  Jami: "Итого",
  Naqd: "Наличные",
  Karta: "Карта",
  "Mijoz (qarz bo'lsa)": "Клиент (если в долг)",
  Tanlang: "Выбрать",
  "Yetkazib beruvchi": "Поставщик",
  "Oylik to'lovlari": "Зарплатные выплаты",
  "Oylik to'lovi": "Зарплата",
  Ishchi: "Работник",
  Oy: "Месяц",
  Turi: "Тип",
  salary: "Зарплата",
  advance: "Аванс",
  "Boshlang'ich": "Начальная",
  Tushum: "Доход",
  Chiqim: "Расход",
  "Kassa ochish": "Открыть кассу",
  Manba: "Источник",
  Rasxod: "Расход",
  "Hisobotlar": "Отчёты",
  Boshlanish: "Начало",
  Tugash: "Конец",
  "Hisobotni ko'rish": "Показать отчёт",
  Tannarx: "Себестоимость",
  Foyda: "Прибыль",
  "Foydalanuvchi": "Пользователь",
  Rol: "Роль",
  Faol: "Активен",
  Bloklangan: "Заблокирован",
  "Foydalanuvchi yaratish": "Создать пользователя",
  "Foydalanuvchini tahrirlash": "Редактировать пользователя",
  "Yangi parol (ixtiyoriy)": "Новый пароль (необязательно)",
  Vaqt: "Время",
  Amal: "Действие",
  "Bo'lim": "Раздел",
  Lavozim: "Должность",
  Narx: "Цена",
  "Oylik kuni": "День выплаты",
  sale: "Продажа",
  purchase: "Поступление",
  expense: "Расход",
  debt_payment: "Оплата долга",
  payroll: "Зарплата",
  Tema: "Тема",
};
I.en = {
  Dashboard: "Dashboard",
  Mahsulotlar: "Products",
  Mijozlar: "Customers",
  Qarzdorlik: "Debts",
  "Yetkazib beruvchilar": "Suppliers",
  Sotuv: "Sales",
  Kirim: "Purchases",
  Ishchilar: "Workers",
  Oylik: "Payroll",
  Kassa: "Cash",
  Hisobot: "Report",
  Foydalanuvchilar: "Users",
  "Audit log": "Audit log",
  Chiqish: "Logout",
  "Biznes boshqaruv tizimi": "Business management system",
  Login: "Login",
  Parol: "Password",
  "Parol (6+)": "Password (6+)",
  Kirish: "Sign in",
  "Birinchi ishga tushirish:": "First launch:",
  "Admin yaratish": "Create admin",
  "Tizimga birinchi kirish uchun asosiy administrator.":
    "Set up the main administrator for first login.",
  Ism: "Name",
  "Admin yaratildi": "Admin created",
  "Login kerak": "Login required",
  Xatolik: "Error",
  "Ruxsat yo'q": "Access denied",
  "Ma'lumot yo'q": "No data",
  Til: "Language",
  Tema: "Theme",
  Bekor: "Cancel",
  Saqlash: "Save",
  Saqlandi: "Saved",
  "Bugun: ": "Today: ",
  "O'chirishni tasdiqlaysizmi?": "Delete confirmation?",
  "O'chirildi": "Deleted",
  "Yuklab olishda xatolik": "Download error",
  "Bugungi sotuv": "Today's sales",
  "Bugungi foyda": "Today's profit",
  Qarzlar: "Debts",
  "Ombor qiymati": "Stock value",
  "Tizim holati": "System status",
  Online: "Online",
  "Ko'rsatkich": "Indicator",
  Qiymat: "Value",
  "Kam qolgan mahsulot": "Low stock",
  "Mahsulot qidirish...": "Search product...",
  "Mahsulot qo'shish": "Add product",
  "Mahsulotni tahrirlash": "Edit product",
  Nomi: "Name",
  Kategoriya: "Category",
  Birlik: "Unit",
  dona: "pcs",
  "Kelish narxi": "Purchase price",
  "Sotish narxi": "Sell price",
  "Minimal qoldiq": "Min stock",
  Kelish: "Purchase",
  Sotish: "Selling",
  Qoldiq: "Stock",
  "Cash_qoldiq": "Balance",
  salary_label: "Salary",
  Holat: "Status",
  Kam: "Low",
  Yetarli: "Enough",
  "Mijoz qo'shish": "Add customer",
  "Mijozni tahrirlash": "Edit customer",
  Telefon: "Phone",
  Manzil: "Address",
  Qarz: "Debt",
  "Qarzni qabul qilish": "Receive payment",
  Mijoz: "Customer",
  "To'lov": "Payment",
  "Avval qarzdor mijoz yarating": "Create a debtor customer first",
  "Qarz to'lovi": "Debt payment",
  Summa: "Amount",
  Izoh: "Note",
  "Qo'shish": "Add",
  Tahrirlash: "Edit",
  Sana: "Date",
  Miqdor: "Quantity",
  Mahsulot: "Product",
  Jami: "Total",
  Naqd: "Cash",
  Karta: "Card",
  "Mijoz (qarz bo'lsa)": "Customer (if on credit)",
  Tanlang: "Select",
  "Yetkazib beruvchi": "Supplier",
  "Oylik to'lovlari": "Salary payments",
  "Oylik to'lovi": "Salary payment",
  Ishchi: "Worker",
  Oy: "Month",
  Turi: "Type",
  salary: "Salary",
  advance: "Advance",
  "Boshlang'ich": "Opening",
  Tushum: "Income",
  Chiqim: "Expense",
  Manba: "Source",
  Rasxod: "Expense",
  "Hisobotlar": "Reports",
  Boshlanish: "Start",
  Tugash: "End",
  "Hisobotni ko'rish": "View report",
  Tannarx: "Cost",
  Foyda: "Profit",
  "Foydalanuvchi": "User",
  Rol: "Role",
  Faol: "Active",
  Bloklangan: "Blocked",
  "Foydalanuvchi yaratish": "Create user",
  "Foydalanuvchini tahrirlash": "Edit user",
  "Yangi parol (ixtiyoriy)": "New password (optional)",
  Vaqt: "Time",
  Amal: "Action",
  "Bo'lim": "Section",
  Lavozim: "Role",
  Narx: "Cost",
  "Oylik kuni": "Payday",
  sale: "Sale",
  purchase: "Purchase",
  expense: "Expense",
  debt_payment: "Debt payment",
  payroll: "Salary",
  Tema: "Theme",
};
const T = (s) => I[lang][s] ?? s;
const secLabel = (k) => {
  const s = sections.find((x) => x[0] === k);
  return s ? s[1] + " " + T(s[2]) : k;
};
const fieldLabels = {
  name: "Nomi",
  phone: "Telefon",
  address: "Manzil",
  debt: "Qarz",
  unit: "Birlik",
  cost: "Narx",
  stock: "Qoldiq",
  min: "Minimal qoldiq",
  role: "Lavozim",
  salary: "salary_label",
  payday: "Oylik kuni",
};
const fl = (f) => T(fieldLabels[f] || f);
const langSel = () =>
  `<div class="langbar"><div class="langseg">${[
    ["uz", "O'z"],
    ["ru", "Ру"],
    ["en", "En"],
  ]
    .map(
      ([c, lbl]) =>
        `<button type="button" class="lng ${c === lang ? "lng-active" : ""}" onclick="setLang('${c}')" title="${T(
          "Til",
        )}">${lbl}</button>`,
    )
    .join("")}</div><button type="button" class="theme-btn" onclick="setTheme()" title="${T(
    "Tema",
  )}">${theme === "dark" ? "🌙" : "☀️"}</button></div>`;
const sections = [
  ["dashboard", "🏠", "Dashboard"],
  ["products", "📦", "Mahsulotlar"],
  ["customers", "👥", "Mijozlar"],
  ["debts", "💳", "Qarzdorlik"],
  ["suppliers", "🚚", "Yetkazib beruvchilar"],
  ["sales", "🛒", "Sotuv"],
  ["purchases", "📥", "Kirim"],
  ["workers", "👷", "Ishchilar"],
  ["payroll", "💰", "Oylik"],
  ["cash", "💵", "Kassa"],
  ["reports", "📊", "Hisobot"],
  ["users", "🔐", "Foydalanuvchilar"],
  ["audit", "📝", "Audit log"],
];
const fmtN = (v) => {
    if (typeof v === "number") {
      const n = Math.round(v || 0),
        s = Math.abs(n).toString();
      return (n < 0 ? "-" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    const raw = String(v ?? "").replace(/[^\d]/g, "");
    return raw
      ? String(Number(raw) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      : "";
  },
  num = (v) => {
    const n = Number(String(v ?? "").replace(/\./g, "").replace(/\s/g, ""));
    return Number.isFinite(n) ? n : 0;
  },
  money = (n) => fmtN(n) + " UZS",
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    ),
  q = (o) => encodeURIComponent(JSON.stringify(o)),
  dq = (s) => JSON.parse(decodeURIComponent(s)),
  localDate = () =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
async function api(path, opt = {}) {
  opt.headers = { "Content-Type": "application/json", ...(opt.headers || {}) };
  if (token) opt.headers.Authorization = "Bearer " + token;
  const r = await fetch(A + "/api" + path, opt);
  let x = {};
  try {
    x = await r.json();
  } catch {}
  if (r.status === 401) {
    logout();
    throw Error(x.message || T("Login kerak"));
  }
  if (!r.ok) throw Error(x.message || T("Xatolik"));
  return x;
}
function toast(x) {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = x;
  document.body.append(d);
  setTimeout(() => d.remove(), 2500);
}
function setLang(v) {
  if (!["uz", "ru", "en"].includes(v)) v = "uz";
  localStorage.setItem("mp_lang", v);
  location.reload();
}
function setTheme() {
  theme = theme === "dark" ? "light" : "dark";
  localStorage.setItem("mp_theme", theme);
  document.documentElement.dataset.theme = theme;
  const b = document.getElementById("btnTheme");
  if (b) b.textContent = theme === "dark" ? "🌙" : "☀️";
}
function logout() {
  localStorage.removeItem("mp_token");
  localStorage.removeItem("mp_user");
  token = null;
  me = null;
  location.reload();
}
async function init() {
  if (!token) return login();
  try {
    me = (await api("/me")).user;
    localStorage.setItem("mp_user", JSON.stringify(me));
    db = await api("/state");
    layout("dashboard");
  } catch (e) {
    logout();
  }
}
function login() {
  document.getElementById("app").innerHTML =
    `<div class="login-lang">${langSel()}</div>` +
    `<div class="login"><div class="login-card"><h1>Marjon Plast</h1><p class="muted">${T(
      "Biznes boshqaruv tizimi",
    )}</p><form id="login"><div class="field"><label>${T("Login")}</label><input id="u" required autocomplete="username"></div><div class="field"><label>${T(
      "Parol",
    )}</label><input id="p" type="password" required autocomplete="current-password"></div><button class="btn primary" style="width:100%">${T(
      "Kirish",
    )}</button></form><p id="boot" class="muted" style="margin-top:18px;font-size:13px"></p></div></div>`;
  document.querySelector("#login").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const x = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: u.value, password: p.value }),
      });
      token = x.token;
      me = x.user;
      localStorage.setItem("mp_token", token);
      localStorage.setItem("mp_user", JSON.stringify(me));
      location.reload();
    } catch (e) {
      toast(e.message);
    }
  };
  api("/auth/status")
    .then((x) => {
      if (!x.hasUsers)
        document.querySelector("#boot").innerHTML =
          T("Birinchi ishga tushirish:") +
          ' <a class="link" href="#" id="createAdmin">' +
          T("Admin yaratish") +
          "</a>";
      document
        .querySelector("#createAdmin")
        ?.addEventListener("click", bootstrap);
    })
    .catch(() => {});
}
async function bootstrap(e) {
  e.preventDefault();
  document.querySelector(".login-card").innerHTML =
    `<h1>${T("Admin yaratish")}</h1><p class="muted">${T(
      "Tizimga birinchi kirish uchun asosiy administrator.",
    )}</p><form id="bootform"><div class="field"><label>${T(
      "Ism",
    )}</label><input id="n" required></div><div class="field"><label>${T(
      "Login",
    )}</label><input id="u" required></div><div class="field"><label>${T(
      "Parol (6+)",
    )}</label><input id="p" type="password" minlength="6" required></div><button class="btn primary" style="width:100%">${T(
      "Admin yaratish",
    )}</button></form>`;
  bootform.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/auth/bootstrap", {
        method: "POST",
        body: JSON.stringify({
          name: n.value,
          username: u.value,
          password: p.value,
        }),
      });
      toast(T("Admin yaratildi"));
      login();
    } catch (e) {
      toast(e.message);
    }
  };
}
function layout(active) {
  document.getElementById("app").innerHTML =
    `<div class="shell"><aside class="side"><div class="brand">Marjon Plast</div><nav class="nav">${sections
      .filter(([k]) => allowed(k))
      .map(
        ([k, emoji, lbl]) =>
          `<button class="${k === active ? "active" : ""}" onclick="page('${k}')">${emoji} ${T(
            lbl,
          )}</button>`,
      )
      .join("")}<button onclick="logout()">🚪 ${T("Chiqish")}</button></nav>${langSel()}</aside><main class="main"><div class="top"><div><h1 id="title">${secLabel(
        active,
      )}</h1><span class="muted">${T("Bugun: ")}${new Date().toLocaleDateString(
        LOC,
      )}</span></div><div class="userbox"><span class="badge">${esc(
        me.name,
      )} · ${me.role}</span></div></div><section id="view"></section></main></div>`;
  page(active);
}
function allowed(k) {
  return (
    me?.role === "ADMIN" ||
    (
      {
        dashboard: ["ADMIN", "MANAGER", "CASHIER"],
        products: ["ADMIN", "MANAGER"],
        customers: ["ADMIN", "MANAGER", "CASHIER"],
        debts: ["ADMIN", "MANAGER", "CASHIER"],
        suppliers: ["ADMIN", "MANAGER"],
        sales: ["ADMIN", "MANAGER", "CASHIER"],
        purchases: ["ADMIN", "MANAGER"],
        workers: ["ADMIN", "MANAGER"],
        payroll: ["ADMIN", "MANAGER"],
        cash: ["ADMIN", "MANAGER", "CASHIER"],
        reports: ["ADMIN", "MANAGER", "CASHIER"],
        users: ["ADMIN"],
        audit: ["ADMIN"],
      }[k] || []
    ).includes(me.role)
  );
}
function title(k) {
  const s = sections.find((x) => x[0] === k);
  return s ? T(s[2]) : k;
}
async function page(k) {
  if (!allowed(k)) return toast(T("Ruxsat yo'q"));
  db = await api("/state");
  document.getElementById("title").textContent = title(k);
  (
    ({
      dashboard,
      products,
      customers,
      debts,
      suppliers,
      sales,
      purchases,
      workers,
      payroll,
      cash,
      reports,
      users,
      audit,
    })[k] || dashboard
  )();
}
const table = (headers, rows) =>
  `<div class="table-wrap"><table><thead><tr>${headers
    .map((h) => `<th>${h}</th>`)
    .join("")}</tr></thead><tbody>${
    rows || `<tr><td colspan="${headers.length}" class="empty">${T("Ma'lumot yo'q")}</td></tr>`
  }</tbody></table></div>`;
function dashboard() {
  api("/dashboard").then(
    (x) =>
      (view.innerHTML = `<div class="grid"><div class="card"><span>${T(
        "Bugungi sotuv",
      )}</span><strong>${money(x.revenue)}</strong></div><div class="card"><span>${T(
        "Bugungi foyda",
      )}</span><strong>${money(x.profit)}</strong></div><div class="card"><span>${T(
        "Qarzlar",
      )}</span><strong>${money(x.debt)}</strong></div><div class="card"><span>${T(
        "Ombor qiymati",
      )}</span><strong>${money(x.stockValue)}</strong></div></div><div class="panel"><div class="panel-head"><h2>${T(
        "Tizim holati",
      )}</h2><span class="badge green">${T("Online")}</span></div>${table(
        [T("Ko'rsatkich"), T("Qiymat")],
        [
          [T("Mahsulotlar"), x.products],
          [T("Mijozlar"), x.customers],
          [T("Ishchilar"), x.workers],
          [
            T("Kam qolgan mahsulot"),
            `<span class="${x.lowStock.length ? "low" : ""}">${x.lowStock.length}</span>`,
          ],
        ]
          .map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`)
          .join(""),
      )}</div>`),
  );
}
function products() {
  view.innerHTML = `<div class="toolbar"><input class="search" id="q" placeholder="${T(
    "Mahsulot qidirish...",
  )}" oninput="products()"><button class="btn primary" onclick="productForm()">＋ ${T(
    "Mahsulot",
  )}</button></div><div class="panel">${table(
    [T("Nomi"), T("Kategoriya"), T("Kelish"), T("Sotish"), T("Qoldiq"), T("Holat"), ""],
    db.products.map(
      (p) =>
        `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.category)}</td><td>${money(
          p.buy,
        )}</td><td>${money(p.sell)}</td><td>${fmtN(p.stock)}</td><td><span class="badge ${
          p.stock <= p.min ? "red" : "green"
        }">${p.stock <= p.min ? T("Kam") : T("Yetarli")}</span></td><td class="actions"><button onclick="productForm('${q(
          p,
        )}')">✏️</button><button class="danger" onclick="del('products','${p.id}')">🗑</button></td></tr>`,
    ).join(""),
  )}</div>`;
}
function customers() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Mijozlar")}</h2><button class="btn primary" onclick="customerForm()">＋ ${T(
    "Mijoz",
  )}</button></div><div class="panel">${table(
    [T("Ism"), T("Telefon"), T("Manzil"), T("Qarz"), ""],
    db.customers.map(
      (c) =>
        `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(
          c.address,
        )}</td><td class="${c.debt > 0 ? "low" : ""}">${money(c.debt)}</td><td class="actions"><button onclick="customerForm('${q(
          c,
        )}')">✏️</button><button class="danger" onclick="del('customers','${c.id}')">🗑</button></td></tr>`,
    ).join(""),
  )}</div>`;
}
function debts() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Qarzdorlik")}</h2><button class="btn primary" onclick="paymentForm()">＋ ${T(
    "Qarzni qabul qilish",
  )}</button></div><div class="panel">${table(
    [T("Mijoz"), T("Telefon"), T("Qarz"), ""],
    db.customers
      .filter((c) => c.debt > 0)
      .map(
        (c) =>
          `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td class="low">${money(
            c.debt,
          )}</td><td><button class="btn" onclick="paymentForm('${q(
            c,
          )}')">${T("To'lov")}</button></td></tr>`,
      )
      .join(""),
  )}</div>`;
}
function suppliers() {
  simple(T("Yetkazib beruvchilar"), "suppliers", ["name", "phone", "address", "debt"]);
}
function workers() {
  simple(T("Ishchilar"), "workers", ["name", "role", "salary", "payday", "phone"]);
}
function simple(titleText, key, fields) {
  const arr = db[key];
  view.innerHTML = `<div class="toolbar"><h2>${titleText}</h2><button class="btn primary" onclick="simpleForm('${key}','${q(
    fields,
  )}')">＋ ${T("Qo'shish")}</button></div><div class="panel">${table(
    fields.map((x) => fl(x)),
    arr
      .map(
        (x) =>
          `<tr>${fields
            .map(
              (f) =>
                `<td>${
                  f === "salary" || f === "cost" || f === "debt"
                    ? money(x[f])
                    : esc(x[f])
                }</td>`,
            )
            .join("")}<td class="actions"><button onclick="simpleForm('${key}','${q(
            fields,
          )}','${q(x)}')">✏️</button><button class="danger" onclick="del('${key}','${
            x.id
          }')">🗑</button></td></tr>`,
      )
      .join(""),
  )}</div>`;
}
function sales() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Sotuv")}</h2><button class="btn primary" onclick="saleForm()">＋ ${T(
    "Sotuv",
  )}</button></div><div class="panel">${table(
    [T("Sana"), T("Mahsulot"), T("Miqdor"), T("Jami"), T("To'lov"), T("Mijoz")],
    db.sales
      .map((s) => {
        let p = db.products.find((p) => p.id === s.productId),
          c = db.customers.find((c) => c.id === s.customerId);
        return `<tr><td>${s.date}</td><td>${esc(p?.name || "-")}</td><td>${fmtN(
          s.qty,
        )}</td><td>${money(s.total)}</td><td>${T(s.payment)}</td><td>${esc(
          c?.name || "-",
        )}</td></tr>`;
      })
      .join(""),
  )}</div>`;
}
function purchases() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Kirim")}</h2><button class="btn primary" onclick="purchaseForm()">＋ ${T(
    "Kirim",
  )}</button></div><div class="panel">${table(
    [T("Sana"), T("Mahsulot"), T("Miqdor"), T("Jami")],
    db.purchases.map(
      (x) =>
        `<tr><td>${x.date}</td><td>${esc(
          db.products.find((p) => p.id === x.productId)?.name || "-",
        )}</td><td>${fmtN(x.qty)}</td><td>${money(x.total)}</td></tr>`,
    ).join(""),
  )}</div>`;
}
function payroll() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Oylik to'lovlari")}</h2><button class="btn primary" onclick="payrollForm()">＋ ${T(
    "To'lov",
  )}</button></div><div class="panel">${table(
    [T("Sana"), T("Ishchi"), T("Oy"), T("Summa"), T("Turi")],
    db.payroll.map(
      (x) =>
        `<tr><td>${x.date}</td><td>${esc(
          db.workers.find((w) => w.id === x.workerId)?.name || "-",
        )}</td><td>${x.month}</td><td>${money(x.amount)}</td><td>${T(x.type)}</td></tr>`,
    ).join(""),
  )}</div>`;
}
function cash() {
  api("/cash").then(
    (x) =>
      (view.innerHTML = `<div class="grid"><div class="card"><span>${T(
        "Boshlang'ich",
      )}</span><strong>${money(x.openingCash)}</strong></div><div class="card"><span>${T(
        "Tushum",
      )}</span><strong>${money(x.income)}</strong></div><div class="card"><span>${T(
        "Chiqim",
      )}</span><strong>${money(x.expense)}</strong></div><div class="card"><span>${T(
        "Cash_qoldiq",
      )}</span><strong>${money(x.balance)}</strong></div></div><div class="panel"><div class="panel-head"><h2>${T(
        "Kassa",
      )}</h2><button class="btn" onclick="expenseForm()">＋ ${T(
        "Rasxod",
      )}</button></div>${table(
        [T("Sana"), T("Turi"), T("Summa"), T("Manba"), T("Izoh")],
        x.items.map(
          (i) =>
            `<tr><td>${i.date}</td><td>${
              i.type === "income" ? T("Tushum") : T("Chiqim")
            }</td><td>${money(i.amount)}</td><td>${T(i.source)}</td><td>${esc(
              i.note,
            )}</td></tr>`,
        ).join(""),
      )}</div>`),
  );
}
function reports() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Hisobotlar")}</h2><div class="actions"><button class="btn" onclick="downloadXlsx()">Excel</button><button class="btn" onclick="downloadPdf()">PDF</button></div></div><div class="panel"><div class="two"><div class="field"><label>${T(
    "Boshlanish",
  )}</label><input id="from" type="date"></div><div class="field"><label>${T(
    "Tugash",
  )}</label><input id="to" type="date" value="${localDate()}"></div></div><button class="btn primary" onclick="reportData()">${T(
    "Hisobotni ko'rish",
  )}</button><div id="rep" style="margin-top:18px"></div></div>`;
  reportData();
}
async function reportData() {
  const x = await api(
    "/reports?from=" +
      (from.value || "1900-01-01") +
      "&to=" +
      (to.value || "2999-12-31"),
  );
  rep.innerHTML = `<div class="grid"><div class="card"><span>${T(
    "Sotuv",
  )}</span><strong>${money(x.revenue)}</strong></div><div class="card"><span>${T(
    "Tannarx",
  )}</span><strong>${money(x.cost)}</strong></div><div class="card"><span>${T(
    "Rasxod",
  )}</span><strong>${money(x.expense)}</strong></div><div class="card"><span>${T(
    "Oylik",
  )}</span><strong>${money(x.payroll)}</strong></div><div class="card"><span>${T(
    "Foyda",
  )}</span><strong>${money(x.profit)}</strong></div></div>`;
}
function downloadXlsx() {
  fetch("/api/export/xlsx", { headers: { Authorization: "Bearer " + token } })
    .then((r) => {
      if (!r.ok) throw Error(T("Yuklab olishda xatolik"));
      return r.blob();
    })
    .then((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "marjon-hisobot.xlsx";
      a.click();
    })
    .catch((e) => toast(e.message));
}
function downloadPdf() {
  fetch("/api/export/pdf", { headers: { Authorization: "Bearer " + token } })
    .then((r) => {
      if (!r.ok) throw Error(T("Yuklab olishda xatolik"));
      return r.blob();
    })
    .then((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "marjon-hisobot.pdf";
      a.click();
    })
    .catch((e) => toast(e.message));
}
function users() {
  api("/users").then(
    (us) =>
      (view.innerHTML = `<div class="toolbar"><h2>${T(
        "Foydalanuvchilar",
      )}</h2><button class="btn primary" onclick="userForm()">＋ ${T(
        "Foydalanuvchi",
      )}</button></div><div class="panel">${table(
        [T("Ism"), T("Login"), T("Rol"), T("Holat"), ""],
        us.map(
          (u) =>
            `<tr><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td>${
              u.role
            }</td><td><span class="badge ${u.active ? "green" : "red"}">${
              u.active ? T("Faol") : T("Bloklangan")
            }</span></td><td><button class="btn" onclick="userEdit('${q(
              u,
            )}')">${T("Tahrirlash")}</button></td></tr>`,
        ).join(""),
      )}</div>`),
  );
}
function audit() {
  api("/audit").then(
    (a) =>
      (view.innerHTML = `<div class="panel"><h2>${T("Audit log")}</h2>${table(
        [T("Vaqt"), T("Foydalanuvchi"), T("Amal"), T("Bo'lim"), "ID"],
        a.map(
          (x) =>
            `<tr><td>${new Date(x.date).toLocaleString(LOC)}</td><td>${esc(
              x.userName,
            )}</td><td>${x.action}</td><td>${x.entity}</td><td>${
              x.entityId
            }</td></tr>`,
        ).join(""),
      )}</div>`),
  );
}
function modal(title, body, submit) {
  const b = document.createElement("div");
  b.className = "modal-bg";
  b.innerHTML = `<div class="modal"><h2>${title}</h2><form id="mf">${body}<div class="modal-actions"><button type="button" class="btn" onclick="this.closest('.modal-bg').remove()">${T(
    "Bekor",
  )}</button><button class="btn primary">${T("Saqlash")}</button></div></form></div>`;
  document.body.append(b);
  mf.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await submit(new FormData(mf));
      b.remove();
      db = await api("/state");
      page(currentPage());
      toast(T("Saqlandi"));
    } catch (e) {
      toast(e.message);
    }
  };
}
let cur = "dashboard";
function currentPage() {
  return cur;
}
const oldPage = page;
page = async (k) => {
  cur = k;
  await oldPage(k);
};
function F(label, name, type = "text", value = "", extra = "") {
  const numInput = type === "number";
  const t = numInput ? "text" : type;
  const attrs =
    (numInput ? ' inputmode="numeric" oninput="this.value=fmtN(this.value)"' : "") +
    (extra ? " " + extra : "");
  return `<div class="field"><label>${label}</label><input name="${name}" type="${t}" value="${esc(
    numInput ? fmtN(value) : value,
  )}" ${attrs}></div>`;
}
function productForm(x) {
  if (typeof x === "string") x = dq(x);
  modal(
    x ? T("Mahsulotni tahrirlash") : T("Mahsulot qo'shish"),
    F(T("Nomi"), "name", "text", x?.name) +
      F(T("Kategoriya"), "category", "text", x?.category) +
      F(T("Birlik"), "unit", "text", x?.unit || T("dona")) +
      `<div class="two">${F(T("Kelish narxi"), "buy", "number", x?.buy || 0)}${F(
        T("Sotish narxi"),
        "sell",
        "number",
        x?.sell || 0,
      )}</div><div class="two">${F(
        T("Qoldiq"),
        "stock",
        "number",
        x?.stock || 0,
      )}${F(T("Minimal qoldiq"), "min", "number", x?.min || 0)}</div>`,
    async (fd) => {
      const data = Object.fromEntries(fd);
      for (const k of ["buy", "sell", "stock", "min"]) data[k] = num(data[k]);
      if (x)
        await api("/products/" + x.id, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      else
        await api("/products", { method: "POST", body: JSON.stringify(data) });
    },
  );
}
function customerForm(x) {
  if (typeof x === "string") x = dq(x);
  modal(
    x ? T("Mijozni tahrirlash") : T("Mijoz qo'shish"),
    F(T("Ism"), "name", "text", x?.name) +
      F(T("Telefon"), "phone", "text", x?.phone) +
      F(T("Manzil"), "address", "text", x?.address),
    async (fd) => {
      const d = Object.fromEntries(fd);
      if (x)
        await api("/customers/" + x.id, {
          method: "PUT",
          body: JSON.stringify(d),
        });
      else await api("/customers", { method: "POST", body: JSON.stringify(d) });
    },
  );
}
function simpleForm(key, fields, x) {
  if (typeof fields === "string") fields = dq(fields);
  if (typeof x === "string") x = dq(x);
  modal(
    x ? T("Tahrirlash") : T("Qo'shish"),
    fields
      .map((f) =>
        F(
          fl(f),
          f,
          f === "salary" || f === "cost" || f === "debt" ? "number" : "text",
          x?.[f] ?? "",
        ),
      )
      .join(""),
    async (fd) => {
      const d = Object.fromEntries(fd);
      for (const f of fields)
        if (["salary", "cost", "debt", "stock", "min", "payday"].includes(f))
          d[f] = num(d[f]);
      if (x)
        await api("/" + key + "/" + x.id, {
          method: "PUT",
          body: JSON.stringify(d),
        });
      else
        await api("/" + key, {
          method: "POST",
          body: JSON.stringify(d),
        });
    },
  );
}
function paymentForm(c) {
  if (typeof c === "string") c = dq(c);
  if (!c) c = db.customers.find((x) => x.debt > 0);
  if (!c) return toast(T("Avval qarzdor mijoz yarating"));
  modal(
    T("Qarz to'lovi"),
    F(T("Mijoz"), "customerId", "text", c.id, "readonly") +
      F(T("Summa"), "amount", "number", "", 'min="1"') +
      F(T("Izoh"), "note"),
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.amount = num(d.amount);
      return api("/customer-payments", {
        method: "POST",
        body: JSON.stringify(d),
      });
    },
  );
}
function saleForm() {
  modal(
    T("Sotuv"),
    `<div class="field"><label>${T("Mahsulot")}</label><select name="productId">${db.products
      .map(
        (p) =>
          `<option value="${p.id}">${esc(p.name)} — ${money(p.sell)} (${T(
            "Qoldiq",
          )} ${fmtN(p.stock)})</option>`,
      )
      .join("")}</select></div>${F(
      T("Miqdor"),
      "qty",
      "number",
      1,
      'min="1"',
    )}<div class="field"><label>${T("To'lov")}</label><select name="payment"><option>${T(
      "Naqd",
    )}</option><option>${T("Karta")}</option><option>${T(
      "Qarz",
    )}</option></select></div><div class="field"><label>${T(
      "Mijoz (qarz bo'lsa)",
    )}</label><select name="customerId"><option value="">${T(
      "Tanlang",
    )}</option>${db.customers
      .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
      .join("")}</select></div>${F("Sana", "date", "date", localDate())}`,
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.qty = num(d.qty);
      await api("/sales", { method: "POST", body: JSON.stringify(d) });
    },
  );
}
function purchaseForm() {
  modal(
    T("Kirim"),
    `<div class="field"><label>${T("Mahsulot")}</label><select name="productId">${db.products
      .map((p) => `<option value="${p.id}">${esc(p.name)}</option>`)
      .join("")}</select></div>${F(
      T("Miqdor"),
      "qty",
      "number",
      1,
      'min="1"',
    )}${F(T("Kelish narxi"), "buy", "number", 0, 'min="0"')}<div class="field"><label>${T(
      "Yetkazib beruvchi",
    )}</label><select name="supplierId"><option value="">${T(
      "Tanlang",
    )}</option>${db.suppliers
      .map((s) => `<option value="${s.id}">${esc(s.name)}</option>`)
      .join("")}</select></div>${F("Sana", "date", "date", localDate())}`,
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.qty = num(d.qty);
      d.buy = num(d.buy);
      await api("/purchases", { method: "POST", body: JSON.stringify(d) });
    },
  );
}
function expenseForm() {
  modal(
    T("Rasxod"),
    F(T("Turi"), "category") +
      F(T("Summa"), "amount", "number", 0, 'min="1"') +
      F(T("Izoh"), "note") +
      F("Sana", "date", "date", localDate()),
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.amount = num(d.amount);
      await api("/expenses", { method: "POST", body: JSON.stringify(d) });
    },
  );
}
function payrollForm() {
  modal(
    T("Oylik to'lovi"),
    `<div class="field"><label>${T(
      "Ishchi",
    )}</label><select name="workerId">${db.workers
      .map(
        (w) =>
          `<option value="${w.id}">${esc(w.name)} — ${money(w.salary)}</option>`,
      )
      .join("")}</select></div>${F(
      T("Summa"),
      "amount",
      "number",
      0,
      'min="1"',
    )}<div class="field"><label>${T("Turi")}</label><select name="type"><option value="salary">${T(
      "salary",
    )}</option><option value="advance">${T(
      "advance",
    )}</option></select></div>${F("Sana", "date", "date", localDate())}`,
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.amount = num(d.amount);
      d.month = d.date.slice(0, 7);
      await api("/payroll", { method: "POST", body: JSON.stringify(d) });
    },
  );
}
function userForm() {
  modal(
    T("Foydalanuvchi yaratish"),
    F(T("Ism"), "name") +
      F(T("Login"), "username") +
      F(T("Parol"), "password", "password", "", 'minlength="6"') +
      `<div class="field"><label>${T("Rol")}</label><select name="role"><option>MANAGER</option><option>CASHIER</option><option>ADMIN</option></select></div>`,
    async (fd) =>
      api("/users", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(fd)),
      }),
  );
}
function userEdit(u) {
  if (typeof u === "string") u = dq(u);
  modal(
    T("Foydalanuvchini tahrirlash"),
    F(T("Ism"), "name", "text", u.name) +
      `<div class="field"><label>${T("Rol")}</label><select name="role"><option ${
        u.role === "MANAGER" ? "selected" : ""
      }>MANAGER</option><option ${
        u.role === "CASHIER" ? "selected" : ""
      }>CASHIER</option><option ${
        u.role === "ADMIN" ? "selected" : ""
      }>ADMIN</option></select></div>` +
      `<div class="field"><label>${T("Holat")}</label><select name="active"><option value="true" ${
        u.active ? "selected" : ""
      }>${T("Faol")}</option><option value="false" ${
        !u.active ? "selected" : ""
      }>${T("Bloklangan")}</option></select></div>` +
      F(T("Yangi parol (ixtiyoriy)"), "password", "password"),
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.active = d.active === "true";
      if (!d.password) delete d.password;
      await api("/users/" + u.id, {
        method: "PATCH",
        body: JSON.stringify(d),
      });
    },
  );
}
async function del(key, idv) {
  if (!confirm(T("O'chirishni tasdiqlaysizmi?"))) return;
  try {
    await api("/" + key + "/" + idv, { method: "DELETE" });
    toast(T("O'chirildi"));
    page(cur);
  } catch (e) {
    toast(e.message);
  }
}
init();