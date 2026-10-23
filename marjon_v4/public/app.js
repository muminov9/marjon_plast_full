const A = location.origin;
let token = localStorage.getItem("mp_token"),
  me = JSON.parse(localStorage.getItem("mp_user") || "null"),
  db = {};
let lang = localStorage.getItem("mp_lang") || "uz";
let platformToken = null;
try {
  platformToken = sessionStorage.getItem("mp_platform_token") || null;
} catch {}
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
  "Sotuv tarixi": "История продаж",
  "Bugungi sotuvlar": "Продажи сегодня",
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
  "Ko'rsatish": "Показать",
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
  Statistika: "Статистика",
  Zaxira: "Резервная копия",
  "Zaxira nusxalari": "Резервные копии",
  Kunlik: "Дневная",
  Haftalik: "Недельная",
  Oylik: "Месячная",
  Yillik: "Годовая",
  "Sotuv va foyda grafigi": "График продаж и прибыли",
  "Top mahsulotlar": "Топ товары",
  "Top mijozlar": "Топ клиенты",
  Soni: "Кол-во",
  Daromad: "Доход",
  "Yangi zaxira": "Создать копию",
  "Yuklab olish": "Скачать",
  Tiklash: "Восстановить",
  Manba: "Источник",
  Masofaviy: "Облачный",
  "Mahalliy fayl": "Локальный файл",
  Hajm: "Размер",
  "Qidirish...": "Поиск...",
  "Mahsulot yoki mijoz": "Товар или клиент",
  "To'lov turi": "Тип оплаты",
  "Barcha to'lov turlari": "Все типы оплаты",
  "Barcha kategoriyalar": "Все категории",
  "Parol o'zgartirish": "Смена пароля",
  "Joriy parol": "Текущий пароль",
  "Yangi parol (6+)": "Новый пароль (6+)",
  "Parol yangilandi": "Пароль обновлён",
  "Zaxira yaratildi": "Резервная копия создана",
  Tiklandi: "Восстановлено",
  "Tiklashni tasdiqlaysizmi?": "Подтвердить восстановление?",
  "Zaxira izohi":
    "Данные автоматически копируются каждый день и хранятся 14 дней. Можно также создать копию вручную.",
  "Yuklanmoqda...": "Загрузка...",
};
I.en = {
  Dashboard: "Dashboard",
  Mahsulotlar: "Products",
  Mijozlar: "Customers",
  Qarzdorlik: "Debts",
  "Yetkazib beruvchilar": "Suppliers",
  Sotuv: "Sales",
  "Sotuv tarixi": "Sales history",
  "Bugungi sotuvlar": "Today's sales",
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
  "Ko'rsatish": "Show",
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
  Statistika: "Statistics",
  Zaxira: "Backup",
  "Zaxira nusxalari": "Backups",
  Kunlik: "Daily",
  Haftalik: "Weekly",
  Oylik: "Monthly",
  Yillik: "Yearly",
  "Sotuv va foyda grafigi": "Sales & profit chart",
  "Top mahsulotlar": "Top products",
  "Top mijozlar": "Top customers",
  Soni: "Qty",
  Daromad: "Revenue",
  "Yangi zaxira": "New backup",
  "Yuklab olish": "Download",
  Tiklash: "Restore",
  Manba: "Source",
  Masofaviy: "Remote",
  "Mahalliy fayl": "Local file",
  Hajm: "Size",
  "Qidirish...": "Search...",
  "Mahsulot yoki mijoz": "Product or customer",
  "To'lov turi": "Payment type",
  "Barcha to'lov turlari": "All payment types",
  "Barcha kategoriyalar": "All categories",
  "Parol o'zgartirish": "Change password",
  "Joriy parol": "Current password",
  "Yangi parol (6+)": "New password (6+)",
  "Parol yangilandi": "Password updated",
  "Zaxira yaratildi": "Backup created",
  Tiklandi: "Restored",
  "Tiklashni tasdiqlaysizmi?": "Confirm restore?",
  "Zaxira izohi":
    "Data is backed up automatically every day and kept for 14 days. You can also create a backup manually.",
  "Yuklanmoqda...": "Loading...",
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
  ["stats", "📈", "Statistika"],
  ["products", "📦", "Mahsulotlar"],
  ["customers", "👥", "Mijozlar"],
  ["debts", "💳", "Qarzdorlik"],
  ["dpay", "💸", "Qarzdor to'lovlari"],
  ["suppliers", "🚚", "Yetkazib beruvchilar"],
  ["sales", "🛒", "Sotuv"],
  ["saleshist", "🗂", "Sotuv tarixi"],
  ["purchases", "📥", "Kirim"],
  ["workers", "👷", "Ishchilar"],
  ["payroll", "💰", "Oylik"],
  ["rawmat", "🏭", "Xomashyo kelishi"],
  ["expenses", "🧾", "Rasxod"],
  ["reports", "📊", "Hisobot"],
  ["users", "🔐", "Foydalanuvchilar"],
  ["audit", "📝", "Audit log"],
  ["backup", "💾", "Zaxira"],
  ["settings", "⚙️", "Biznes sozlamalari"],
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
  money = (n) => fmtN(n) + " " + (db?.settings?.currency || "UZS"),
  unitOf = (p) => (p && p.unit) || "kg",
  unitSync = (id = "uq") => {
    const sel = document.querySelector('#mf select[name="productId"]'),
      u = sel ? sel.options[sel.selectedIndex]?.dataset.unit : "";
    const s = document.getElementById(id);
    if (s) s.textContent = u || "kg";
  },
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
async function papi(path, opt = {}) {
  opt.headers = { "Content-Type": "application/json", ...(opt.headers || {}) };
  if (platformToken) opt.headers.Authorization = "Bearer " + platformToken;
  const r = await fetch(A + "/api" + path, opt);
  let x = {};
  try {
    x = await r.json();
  } catch {}
  if (r.status === 401) {
    platformToken = null;
    try { sessionStorage.removeItem("mp_platform_token"); } catch {}
    throw Error(x.message || T("Platform sessiyasi tugagan"));
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
    const m = await api("/me");
    me = m.user;
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
    `<div class="login"><div class="login-card"><h1>Marjon Business</h1><p class="muted">${T(
      "Biznes boshqaruv tizimi",
    )}</p><form id="login"><div class="field"><label>${T("Biznes kodi")}</label><input id="w" autocomplete="organization" placeholder="${T(
      "Masalan: marjon-plast",
    )}"></div><div class="field"><label>${T("Login")}</label><input id="u" required autocomplete="username"></div><div class="field"><label>${T(
      "Parol",
    )}</label><div class="pwd-wrap"><input id="p" type="password" required autocomplete="current-password"><button type="button" class="pwd-eye" onclick="togglePwd('p')" title="${T(
      "Ko'rsatish",
    )}">👁</button></div></div><button class="btn primary" style="width:100%">${T(
      "Kirish",
    )}</button></form><p id="boot" class="muted" style="margin-top:18px;font-size:13px"></p></div></div>`;
  document.querySelector("#login").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const x = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ business: w.value.trim(), username: u.value, password: p.value }),
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
      const boot = document.querySelector("#boot");
      if (!boot) return;
      if (!x.hasBusinesses) {
        boot.innerHTML =
          T("Birinchi ishga tushirish:") +
          ' <a class="link" href="#" id="createAdmin">' +
          T("Biznes ochish") +
          "</a>";
        document.querySelector("#createAdmin")?.addEventListener("click", bootstrap);
      } else if (x.onboardingEnabled) {
        boot.innerHTML =
          '<a class="link" href="#" id="createAdmin">' +
          T("Yangi biznes ochish") +
          "</a>";
        document.querySelector("#createAdmin")?.addEventListener("click", bootstrap);
      }
      if (x.platformConfigured || platformToken) {
        boot.insertAdjacentHTML(
          "afterend",
          `<p class="muted" style="margin-top:10px;font-size:13px"><a class="link" href="#" id="platformLink">${T(
            "Platform administrator",
          )}</a></p>`,
        );
        document.querySelector("#platformLink")?.addEventListener("click", (ev) => {
          ev.preventDefault();
          platformLogin();
        });
      }
    })
    .catch(() => {});
}
async function bootstrap(e) {
  e.preventDefault();
  document.querySelector(".login-card").innerHTML =
    `<h1>${T("Biznes ochish")}</h1><p class="muted">${T(
      "Yangi ish maydoni va biznes administratorini yarating.",
    )}</p><form id="bootform"><div class="field"><label>${T(
      "Biznes nomi",
    )}</label><input id="bn" required></div><div class="field"><label>${T(
      "Biznes kodi",
    )}</label><input id="bs" placeholder="${T(
      "avtomatik yaratiladi",
    )}"></div><div class="field"><label>${T(
      "Ism",
    )}</label><input id="n" required></div><div class="field"><label>${T(
      "Login",
    )}</label><input id="u" required></div><div class="field"><label>${T(
      "Parol (8+)",
    )}</label><div class="pwd-wrap"><input id="p" type="password" minlength="8" required><button type="button" class="pwd-eye" onclick="togglePwd('p')" title="${T(
      "Ko'rsatish",
    )}">👁</button></div></div><div class="two"><div class="field"><label>${T(
      "Valyuta",
    )}</label><select id="bc"><option>UZS</option><option>USD</option><option>EUR</option><option>RUB</option><option>KZT</option><option>TRY</option></select></div><div class="field"><label>${T(
      "Til",
    )}</label><select id="bl"><option value="uz">O'zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select></div></div><button class="btn primary" style="width:100%">${T(
      "Biznes ochish",
    )}</button></form>`;
  bootform.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const x = await api("/onboarding/business", {
        method: "POST",
        body: JSON.stringify({
          businessName: bn.value,
          slug: bs.value.trim(),
          name: n.value,
          username: u.value,
          password: p.value,
          currency: bc.value,
          locale: bl.value,
        }),
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
}
async function platformLogin() {
  if (platformToken) {
    try {
      await papi("/platform/me");
      return platformDashboard();
    } catch {
      platformToken = null;
      try { sessionStorage.removeItem("mp_platform_token"); } catch {}
    }
  }
  document.getElementById("app").innerHTML =
    `<div class="login"><div class="login-card"><h1>${T("Platform administrator")}</h1><p class="muted">${T(
      "Bizneslarni yaratish, to'xtatish va tariflarni boshqarish.",
    )}</p><form id="pform"><div class="field"><label>${T(
      "Login",
    )}</label><input id="pu" required autocomplete="username"></div><div class="field"><label>${T(
      "Parol",
    )}</label><div class="pwd-wrap"><input id="pp" type="password" required autocomplete="current-password"><button type="button" class="pwd-eye" onclick="togglePwd('pp')" title="${T(
      "Ko'rsatish",
    )}">👁</button></div></div><button class="btn primary" style="width:100%">${T(
      "Kirish",
    )}</button></form><p class="muted" style="margin-top:16px;font-size:13px"><a class="link" href="#" id="pback">${T(
      "Biznes kirishiga qaytish",
    )}</a></p></div></div>`;
  document.querySelector("#pback").onclick = (e) => {
    e.preventDefault();
    login();
  };
  document.querySelector("#pform").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const x = await papi("/platform/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: pu.value, password: pp.value }),
      });
      platformToken = x.token;
      try { sessionStorage.setItem("mp_platform_token", platformToken); } catch {}
      platformDashboard();
    } catch (e) {
      toast(e.message);
    }
  };
}

async function platformDashboard() {
  const app = document.getElementById("app");
  let list = [];
  try {
    list = await papi("/platform/businesses");
  } catch (e) {
    toast(e.message);
    return platformLogin();
  }
  app.innerHTML =
    `<div class="platform-wrap"><div class="platform-head"><div><h1>${T(
      "Platform administrator",
    )}</h1><p class="muted">${T(
      "Bizneslar, tariflar va holatni boshqarish.",
    )}</p></div><div class="platform-actions"><button class="btn" id="plogout">${T(
      "Chiqish",
    )}</button><button class="btn primary" id="pnew">+ ${T(
      "Yangi biznes",
    )}</button></div></div><div id="pbody"></div></div>`;
  document.querySelector("#plogout").onclick = () => {
    platformToken = null;
    try { sessionStorage.removeItem("mp_platform_token"); } catch {}
    login();
  };
  document.querySelector("#pnew").onclick = () => platformCreateForm();
  const body = document.querySelector("#pbody");
  const rows = list
    .map((b) => {
      const active = b.status === "active";
      return `<tr><td><strong>${esc(b.name)}</strong><div class="muted">${esc(
        b.slug,
      )}</div></td><td>${esc(b.plan)}</td><td><span class="badge ${
        active ? "green" : "red"
      }">${esc(b.status)}</span></td><td>${Number(b.users) || 0}</td><td>${Number(
        b.products,
      ) || 0}</td><td><button class="btn" data-biz="${esc(b.id)}" data-status="${
        active ? "suspended" : "active"
      }">${T(active ? "To'xtatish" : "Faollashtirish")}</button></td></tr>`;
    })
    .join("");
  body.innerHTML =
    `<div class="panel"><div class="panel-head"><h2>${T(
      "Bizneslar",
    )}</h2><span class="muted">${list.length}</span></div>${table(
      [T("Biznes"), T("Tarif"), T("Holat"), T("Foydalanuvchilar"), T("Mahsulotlar"), ""],
      rows,
    )}</div>`;
  body.querySelectorAll("[data-biz]").forEach((btn) => {
    btn.onclick = async () => {
      try {
        await papi("/platform/businesses/" + encodeURIComponent(btn.dataset.biz), {
          method: "PATCH",
          body: JSON.stringify({ status: btn.dataset.status }),
        });
        platformDashboard();
      } catch (e) {
        toast(e.message);
      }
    };
  });
}

function platformCreateForm() {
  const body = document.querySelector("#pbody");
  body.innerHTML =
    `<div class="panel"><div class="panel-head"><h2>${T(
      "Yangi biznes",
    )}</h2><button class="btn" id="pcancel">${T(
      "Bekor",
    )}</button></div><form id="pcreate"><div class="two"><div class="field"><label>${T(
      "Biznes nomi",
    )}</label><input id="pbname" required></div><div class="field"><label>${T(
      "Biznes kodi",
    )}</label><input id="pbslug" placeholder="${T(
      "avtomatik yaratiladi",
    )}"></div></div><div class="two"><div class="field"><label>${T(
      "Valyuta",
    )}</label><select id="pbc"><option>UZS</option><option>USD</option><option>EUR</option><option>RUB</option><option>KZT</option><option>TRY</option></select></div><div class="field"><label>${T(
      "Tarif",
    )}</label><select id="pbplan"><option value="trial">Trial</option><option value="starter">Starter</option><option value="business">Business</option></select></div></div><p class="muted" style="font-size:13px">${T(
      "Biznes administratori (ixtiyoriy)",
    )}</p><div class="two"><div class="field"><label>${T(
      "Ism",
    )}</label><input id="pbn"></div><div class="field"><label>${T(
      "Login",
    )}</label><input id="pbu"></div></div><div class="field"><label>${T(
      "Parol (8+)",
    )}</label><input id="pbp" type="password" minlength="8"></div><button class="btn primary">${T(
      "Yaratish",
    )}</button></form></div>`;
  document.querySelector("#pcancel").onclick = () => platformDashboard();
  document.querySelector("#pcreate").onsubmit = async (e) => {
    e.preventDefault();
    const payload = {
      businessName: pbname.value,
      slug: pbslug.value.trim(),
      currency: pbc.value,
      plan: pbplan.value,
    };
    if (pbn.value || pbu.value || pbp.value) {
      if (!pbn.value || !pbu.value || pbp.value.length < 8) {
        return toast(T("Administrator uchun ism, login va 8+ belgili parol kiriting"));
      }
      payload.name = pbn.value;
      payload.username = pbu.value;
      payload.password = pbp.value;
    }
    try {
      await papi("/platform/businesses", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast(T("Yaratildi"));
      platformDashboard();
    } catch (e) {
      toast(e.message);
    }
  };
}

function layout(active) {
  const bizName = db.settings?.companyName || db.business?.name || "Marjon Business";
  const bizLogo = db.settings?.logo
    ? `<img class="brand-logo" src="${esc(db.settings.logo)}" alt="">`
    : "";
  document.getElementById("app").innerHTML =
    `<div class="shell"><aside class="side"><div class="brand">${bizLogo}${esc(bizName)}</div><nav class="nav">${sections
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
      )} · ${me.role}</span><button class="btn key-btn" onclick="changePw()" title="${T(
        "Parol o'zgartirish",
      )}">🔑</button></div></div><section id="view"></section></main></div>`;
  page(active);
}
function allowed(k) {
  return (
    me?.role === "ADMIN" ||
    (
      {
        dashboard: ["ADMIN", "MANAGER", "CASHIER"],
        stats: ["ADMIN", "MANAGER", "CASHIER"],
        products: ["ADMIN", "MANAGER"],
        customers: ["ADMIN", "MANAGER", "CASHIER"],
        debts: ["ADMIN", "MANAGER", "CASHIER"],
        dpay: ["ADMIN", "MANAGER", "CASHIER"],
        suppliers: ["ADMIN", "MANAGER"],
        sales: ["ADMIN", "MANAGER", "CASHIER"],
        saleshist: ["ADMIN", "MANAGER", "CASHIER"],
        purchases: ["ADMIN", "MANAGER"],
        workers: ["ADMIN", "MANAGER"],
        payroll: ["ADMIN", "MANAGER"],
        rawmat: ["ADMIN", "MANAGER", "CASHIER"],
        expenses: ["ADMIN", "MANAGER", "CASHIER"],
        reports: ["ADMIN", "MANAGER", "CASHIER"],
        users: ["ADMIN"],
        audit: ["ADMIN"],
        backup: ["ADMIN"],
        settings: ["ADMIN"],
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
      stats,
      products,
      customers,
      debts,
      suppliers,
      sales,
      saleshist,
      purchases,
      workers,
      payroll,
      rawmat,
      expenses,
      dpay,
      reports,
      users,
      audit,
      backup,
      settings: settingsPage,
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
function barChart(series, labels) {
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const cols = labels
    .map((l, i) => {
      const bars = series
        .map((s) => {
          const v = s.data[i] || 0;
          const h = Math.round((v / max) * 100);
          return `<div class="bar" style="height:${h}%;background:${s.color}" title="${esc(
            l,
          )}: ${fmtN(v)}"></div>`;
        })
        .join("");
      return `<div class="col">${bars}<span class="lbl">${esc(l)}</span></div>`;
    })
    .join("");
  return `<div class="chart">${cols}</div><div class="legend">${series
    .map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`)
    .join("")}</div>`;
}
let curPeriod = "month";
function stats() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Statistika")}</h2><div class="filters">${[
    ["day", T("Kunlik")],
    ["week", T("Haftalik")],
    ["month", T("Oylik")],
    ["year", T("Yillik")],
  ]
    .map(
      ([p, lbl]) =>
        `<button class="btn seg ${curPeriod === p ? "seg-active" : ""}" onclick="statPeriod('${p}')">${lbl}</button>`,
    )
    .join("")}</div></div><div id="statsbody"></div>`;
  statPeriod(curPeriod);
}
async function statPeriod(p) {
  curPeriod = p;
  const map = { day: T("Kunlik"), week: T("Haftalik"), month: T("Oylik"), year: T("Yillik") };
  document.querySelectorAll(".seg").forEach((b) => {
    b.classList.toggle("seg-active", b.textContent === map[p]);
  });
  try {
    const x = await api("/stats?period=" + p);
    document.getElementById("statsbody").innerHTML =
      `<div class="grid"><div class="card"><span>${T(
        "Sotuv",
      )}</span><strong>${money(x.totals.revenue)}</strong></div><div class="card"><span>${T(
        "Tannarx",
      )}</span><strong>${money(x.totals.cost)}</strong></div><div class="card"><span>${T(
        "Rasxod",
      )}</span><strong>${money(x.totals.expense)}</strong></div><div class="card"><span>${T(
        "Oylik",
      )}</span><strong>${money(x.totals.payroll)}</strong></div><div class="card"><span>${T(
        "Foyda",
      )}</span><strong>${money(x.totals.profit)}</strong></div></div>` +
      `<div class="panel"><div class="panel-head"><h2>${T(
        "Sotuv va foyda grafigi",
      )}</h2></div>${barChart(
        [
          { name: T("Sotuv"), color: "var(--primary-2)", data: x.revenue },
          { name: T("Foyda"), color: "#10b981", data: x.profit },
        ],
        x.labels,
      )}</div>` +
      `<div class="duo"><div class="panel"><h2>${T(
        "Top mahsulotlar",
      )}</h2>${table(
        [T("Nomi"), T("Soni"), T("Daromad")],
        x.topProducts
          .map(
            (t) =>
              `<tr><td><b>${esc(t.product)}</b></td><td>${fmtN(t.qty)}</td><td>${money(
                t.revenue,
              )}</td></tr>`,
          )
          .join(""),
      )}</div><div class="panel"><h2>${T(
        "Top mijozlar",
      )}</h2>${table(
        [T("Mijoz"), T("Daromad")],
        x.topCustomers
          .map(
            (t) =>
              `<tr><td>${esc(t.customer)}</td><td>${money(
                t.revenue,
              )}</td></tr>`,
          )
          .join(""),
      )}</div></div>`;
  } catch (e) {
    toast(e.message);
  }
}
function products() {
  const cats = [...new Set(db.products.map((p) => p.category).filter(Boolean))];
  view.innerHTML = `<div class="toolbar"><div class="filters"><input class="search" id="pq" placeholder="${T(
    "Mahsulot qidirish...",
  )}" oninput="renderProducts()"><select id="pc" class="search" onchange="renderProducts()"><option value="">${T(
    "Barcha kategoriyalar",
  )}</option>${cats.map((c) => `<option ${window.pc?.value === c ? "selected" : ""}>${esc(
    c,
  )}</option>`).join("")}</select></div><button class="btn primary" onclick="productForm()">＋ ${T(
    "Mahsulot",
  )}</button></div><div class="panel"><div id="plist"></div></div>`;
  renderProducts();
}
function renderProducts() {
  const el = document.getElementById("plist");
  if (!el) return;
  const qv = (pq?.value || "").toLowerCase(),
    cv = pc?.value || "";
  const arr = db.products.filter(
    (p) =>
      (!cv || p.category === cv) &&
      (!qv ||
        String(p.name || "").toLowerCase().includes(qv) ||
        String(p.category || "").toLowerCase().includes(qv)),
  );
  el.innerHTML = table(
    [T("Nomi"), T("Kategoriya"), T("Sotish"), T("Qoldiq"), T("Holat"), ""],
    arr.map(
      (p) =>
        `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.category)}</td><td>${money(
          p.sell,
        )}</td><td>${fmtN(p.stock)} ${unitOf(p)}</td><td><span class="badge ${
          p.stock <= p.min ? "red" : "green"
        }">${p.stock <= p.min ? T("Kam") : T("Yetarli")}</span></td><td class="actions"><button onclick="productForm('${q(
          p,
        )}')">✏️</button><button class="danger" onclick="del('products','${p.id}')">🗑</button></td></tr>`,
    ).join(""),
  );
}
function customers() {
  view.innerHTML = `<div class="toolbar"><div class="filters"><input class="search" id="cq" placeholder="${T(
    "Qidirish...",
  )}" oninput="renderCustomers()"></div><button class="btn primary" onclick="customerForm()">＋ ${T(
    "Mijoz",
  )}</button></div><div class="panel"><div id="clist"></div></div>`;
  renderCustomers();
}
function renderCustomers() {
  const el = document.getElementById("clist");
  if (!el) return;
  const qv = (cq?.value || "").toLowerCase();
  const arr = db.customers.filter(
    (c) =>
      !qv ||
      c.name.toLowerCase().includes(qv) ||
      String(c.phone || "").toLowerCase().includes(qv) ||
      String(c.address || "").toLowerCase().includes(qv),
  );
  el.innerHTML = table(
    [T("Ism"), T("Telefon"), T("Manzil"), T("Qarz"), ""],
    arr.map(
      (c) =>
        `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(
          c.address,
        )}</td><td class="${c.debt > 0 ? "low" : ""}">${money(c.debt)}</td><td class="actions"><button onclick="customerForm('${q(
          c,
        )}')">✏️</button><button class="danger" onclick="del('customers','${
          c.id
        }')">🗑</button></td></tr>`,
    ).join(""),
  );
}
function debts() {
  view.innerHTML = `<div class="toolbar"><div class="filters"><input class="search" id="dq" placeholder="${T(
    "Qidirish...",
  )}" oninput="renderDebts()"></div><button class="btn primary" onclick="paymentForm()">＋ ${T(
    "Qarzni qabul qilish",
  )}</button></div><div class="panel"><div id="dlist"></div></div>`;
  renderDebts();
}
function renderDebts() {
  const el = document.getElementById("dlist");
  if (!el) return;
  const qv = (dq?.value || "").toLowerCase();
  const arr = db.customers.filter(
    (c) =>
      c.debt > 0 &&
      (!qv ||
        c.name.toLowerCase().includes(qv) ||
        String(c.phone || "").toLowerCase().includes(qv)),
  );
  el.innerHTML = table(
    [T("Mijoz"), T("Telefon"), T("Qarz"), ""],
    arr.map(
      (c) =>
        `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td class="low">${money(
          c.debt,
        )}</td><td><button class="btn" onclick="paymentForm('${q(
          c,
        )}')">${T("To'lov")}</button></td></tr>`,
    ).join(""),
  );
}
function suppliers() {
  simple(T("Yetkazib beruvchilar"), "suppliers", ["name", "phone", "address", "debt"], "sq");
}
function workers() {
  simple(
    T("Ishchilar"),
    "workers",
    ["name", "role", "salary", "payday", "phone"],
    "wq",
    `<button class="btn" onclick="advanceForm()">＋ ${T("Avans")}</button>`,
  );
}
function simple(titleText, key, fields, qid, extra = "") {
  const input = qid
    ? `<input class="search" id="${qid}" placeholder="${T("Qidirish...")}" oninput="renderSimple('${key}','${q(
        fields,
      )}','${qid}')">`
    : "";
  view.innerHTML = `<div class="toolbar"><h2>${titleText}</h2><div class="filters">${input}<button class="btn primary" onclick="simpleForm('${key}','${q(
    fields,
  )}')">＋ ${T("Qo'shish")}</button>${extra}</div></div><div class="panel"><div id="${key}list"></div></div>`;
  renderSimple(key, fields, qid);
}
function renderSimple(key, fields, qid) {
  const el = document.getElementById(key + "list");
  if (!el) return;
  const qv = qid ? (document.getElementById(qid)?.value || "").toLowerCase() : "";
  const arr = db[key].filter(
    (x) => !qv || fields.some((f) => String(x[f] || "").toLowerCase().includes(qv)),
  );
  el.innerHTML = table(
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
  );
}
function sales() {
  const t = localDate();
  view.innerHTML = `<div class="toolbar"><div><h2>${T("Sotuv")}</h2><input class="search mt" id="salq" placeholder="${T(
    "Qidirish...",
  )}" oninput="renderTodaySales()"></div><div class="actions"><button class="btn" onclick="page('saleshist')">🗂 ${T(
    "Sotuv tarixi",
  )}</button><button class="btn primary" onclick="saleForm()">＋ ${T(
    "Sotuv",
  )}</button></div></div><div class="panel"><div id="slist"></div></div>`;
  renderTodaySales();
}
function renderTodaySales() {
  const el = document.getElementById("slist");
  if (!el) return;
  const t = localDate(),
    qv = (salq?.value || "").toLowerCase();
  const xs = db.sales
    .filter((s) => s.date === t)
    .filter((s) => {
      const p = db.products.find((p) => p.id === s.productId);
      return !qv || (p && p.name.toLowerCase().includes(qv));
    }),
    total = xs.reduce((a, s) => a + s.total, 0);
  el.innerHTML =
    `<div class="grid"><div class="card"><span>${T("Bugungi sotuvlar")}</span><strong>${money(
      total,
    )}</strong></div></div><div class="mt">${table(
      [T("Mahsulot"), T("Miqdor"), T("Jami"), T("To'lov"), T("Mijoz"), ""],
      xs.map((s) => {
        let p = db.products.find((p) => p.id === s.productId),
          c = db.customers.find((c) => c.id === s.customerId);
        return `<tr><td>${esc(p?.name || "-")}</td><td>${fmtN(s.qty)} ${unitOf(
          p,
        )}</td><td>${money(
          s.total,
        )}</td><td>${T(s.payment)}</td><td>${esc(
          c?.name || "-",
        )}</td><td class="actions"><button class="danger" onclick="del('sales','${
          s.id
        }')">🗑</button></td></tr>`;
      }).join(""),
    )}</div>`;
}
function saleshist() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Sotuv tarixi")}</h2></div><div class="panel"><div class="two"><div class="field"><label>${T(
    "Boshlanish",
  )}</label><input id="hfrom" type="date" onchange="histData()"></div><div class="field"><label>${T(
    "Tugash",
  )}</label><input id="hto" type="date" value="${localDate()}" onchange="histData()"></div></div><div class="two"><div class="field"><label>${T(
    "Qidirish...",
  )}</label><input id="hs" placeholder="${T("Mahsulot yoki mijoz")}" oninput="histData()"></div><div class="field"><label>${T(
    "To'lov turi",
  )}</label><select id="hp" onchange="histData()"><option value="">${T(
    "Barcha to'lov turlari",
  )}</option><option>${T("Naqd")}</option><option>${T("Karta")}</option><option>${T(
    "Qarz",
  )}</option></select></div></div><div id="hist" style="margin-top:18px"></div></div>`;
  histData();
}
function histData() {
  const from = hfrom.value || "1900-01-01",
    to = hto.value || "2999-12-31";
  const qv = (hs?.value || "").toLowerCase(),
    pv = hp?.value || "";
  const xs = db.sales
    .filter((s) => s.date >= from && s.date <= to)
    .filter((s) => {
      if (pv && s.payment !== pv) return false;
      if (!qv) return true;
      const p = db.products.find((p) => p.id === s.productId),
        c = db.customers.find((c) => c.id === s.customerId);
      return (
        (p && p.name.toLowerCase().includes(qv)) ||
        (c && c.name.toLowerCase().includes(qv))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = xs.reduce((a, s) => a + s.total, 0);
  if (!xs.length)
    return (hist.innerHTML = `<div class="card"><span>${T(
      "Jami",
    )}</span><strong>${money(0)}</strong></div>`);
  hist.innerHTML = `<div class="grid"><div class="card"><span>${T(
    "Jami",
  )}</span><strong>${money(total)}</strong></div></div><div style="margin-top:14px">${table(
    [T("Sana"), T("Mahsulot"), T("Miqdor"), T("Jami"), T("To'lov"), T("Mijoz"), ""],
    xs.map((s) => {
      let p = db.products.find((p) => p.id === s.productId),
        c = db.customers.find((c) => c.id === s.customerId);
      return `<tr><td>${s.date}</td><td>${esc(p?.name || "-")}</td><td>${fmtN(
        s.qty,
      )} ${unitOf(p)}</td><td>${money(s.total)}</td><td>${T(s.payment)}</td><td>${esc(
        c?.name || "-",
      )}</td><td class="actions"><button class="danger" onclick="del('sales','${
        s.id
      }')">🗑</button></td></tr>`;
    }).join(""),
  )}</div>`;
}
function purchases() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Kirim")}</h2><div class="filters"><input class="search" id="puq" placeholder="${T(
    "Qidirish...",
  )}" oninput="renderPurchases()"></div><button class="btn primary" onclick="purchaseForm()">＋ ${T(
    "Kirim",
  )}</button></div><div class="panel"><div id="pulist"></div></div>`;
  renderPurchases();
}
function renderPurchases() {
  const el = document.getElementById("pulist");
  if (!el) return;
  const qv = (puq?.value || "").toLowerCase();
  const arr = db.purchases.filter((x) => {
    if (!qv) return true;
    const p = db.products.find((p) => p.id === x.productId);
    return p && p.name.toLowerCase().includes(qv);
  });
  el.innerHTML = table(
    [T("Sana"), T("Mahsulot"), T("Miqdor"), T("Jami")],
    arr.map(
      (x) =>
        `<tr><td>${x.date}</td><td>${esc(
          db.products.find((p) => p.id === x.productId)?.name || "-",
        )}</td><td>${fmtN(x.qty)} ${unitOf(
          db.products.find((p) => p.id === x.productId),
        )}</td><td>${money(x.total)}</td></tr>`,
    ).join(""),
  );
}
function payroll() {
  view.innerHTML = `<div class="toolbar"><h2>${T("Oylik to'lovlari")}</h2><div class="filters"><input class="search" id="plq" placeholder="${T(
    "Qidirish...",
  )}" oninput="renderPayroll()"></div><button class="btn primary" onclick="payrollForm()">＋ ${T(
    "To'lov",
  )}</button></div><div class="panel"><div id="payrollist"></div></div>`;
  renderPayroll();
}
function renderPayroll() {
  const el = document.getElementById("payrollist");
  if (!el) return;
  const qv = (plq?.value || "").toLowerCase();
  const arr = db.payroll.filter((x) => {
    if (!qv) return true;
    const w = db.workers.find((w) => w.id === x.workerId);
    return w && w.name.toLowerCase().includes(qv);
  });
  el.innerHTML = table(
    [T("Sana"), T("Ishchi"), T("Oy"), T("Summa"), T("Turi"), ""],
    arr.map(
      (x) =>
        `<tr><td>${x.date}</td><td>${esc(
          db.workers.find((w) => w.id === x.workerId)?.name || "-",
        )}</td><td>${x.month}</td><td>${money(x.amount)}</td><td>${T(
          x.type,
        )}</td><td class="actions"><button onclick="payrollForm('${q(
          x,
        )}')">✏️</button><button class="danger" onclick="del('payroll','${
          x.id
        }')">🗑</button></td></tr>`,
    ).join(""),
  );
}
function rawmat() {
  view.innerHTML = `<div class="toolbar"><div><h2>${T(
    "Xomashyo kelishi",
  )}</h2><input class="search mt" id="rmq" placeholder="${T(
    "Qidirish...",
  )}" oninput="renderRawMaterials()"></div><button class="btn primary" onclick="rawMatForm()">＋ ${T(
    "Xomashyo",
  )}</button></div><div class="panel"><div id="rmlist"></div></div>`;
  renderRawMaterials();
}
function renderRawMaterials() {
  const el = document.getElementById("rmlist");
  if (!el) return;
  const qv = (rmq?.value || "").toLowerCase();
  const arr = db.rawMaterials.filter(
    (x) =>
      !qv ||
      String(x.name || "").toLowerCase().includes(qv) ||
      String(x.date).includes(qv),
  );
  const total = arr.reduce((a, x) => a + x.total, 0);
  el.innerHTML = `<div class="grid"><div class="card"><span>${T(
    "Xomashyo qiymati",
  )}</span><strong>${money(total)}</strong></div></div><div class="mt">${table(
    [T("Sana"), T("Nomi"), T("Miqdor"), T("Narxi"), T("Jami"), ""],
    arr.map(
      (x) =>
        `<tr><td>${x.date}</td><td>${esc(x.name)}</td><td>${fmtN(x.qty)} ${esc(
          x.unit || "kg",
        )}</td><td>${money(x.price)}</td><td>${money(x.total)}</td><td class="actions"><button class="danger" onclick="del('raw-materials','${
          x.id
        }')">🗑</button></td></tr>`,
    ).join(""),
  )}</div>`;
}
function rawMatForm() {
  modal(
    T("Xomashyo kelishi"),
    F(T("Nomi"), "name") +
      F(T("Miqdor"), "qty", "number", 0, 'min="1"') +
      F(T("Birlik"), "unit", "text", "kg") +
      F(T("Narxi"), "price", "number", 0, 'min="0"') +
      F(T("Izoh"), "note") +
      F("Sana", "date", "date", localDate()),
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.qty = num(d.qty);
      d.price = num(d.price);
      await api("/raw-materials", { method: "POST", body: JSON.stringify(d) });
    },
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
function settingsPage() {
  const s = db.settings || {};
  const currencies = ["UZS", "USD", "EUR", "RUB", "KZT", "TRY"];
  view.innerHTML =
    `<div class="toolbar"><h2>${T("Biznes sozlamalari")}</h2><span class="badge">${esc(
      db.business?.slug || "",
    )}</span></div><div class="panel"><form id="bizSettingsForm"><div class="two"><div class="field"><label>${T(
      "Biznes nomi",
    )}</label><input name="companyName" value="${esc(
      s.companyName || "",
    )}" required></div><div class="field"><label>${T(
      "Valyuta",
    )}</label><select name="currency">${currencies
      .map(
        (c) =>
          `<option ${c === (s.currency || "UZS") ? "selected" : ""}>${c}</option>`,
      )
      .join("")}</select></div></div><div class="two"><div class="field"><label>${T(
      "Til",
    )}</label><select name="locale"><option value="uz" ${
      s.locale === "uz" ? "selected" : ""
    }>O'zbekcha</option><option value="ru" ${
      s.locale === "ru" ? "selected" : ""
    }>Русский</option><option value="en" ${
      s.locale === "en" ? "selected" : ""
    }>English</option></select></div><div class="field"><label>${T(
      "Boshlang'ich kassa",
    )}</label><input name="openingCash" inputmode="numeric" value="${fmtN(
      s.openingCash || 0,
    )}" oninput="this.value=fmtN(this.value)"></div></div><div class="field"><label>${T(
      "Logo",
    )}</label><input name="logo" value="${esc(
      s.logo || "",
    )}" placeholder="https://... yoki data:image/png;base64,..."></div><div class="field"><label>${T(
      "Logo fayli",
    )}</label><input id="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></div>${
      s.logo
        ? `<div class="panel" style="box-shadow:none"><img class="settings-logo" src="${esc(
            s.logo,
          )}" alt="logo"></div>`
        : ""
    }<button class="btn primary" type="submit">${T("Saqlash")}</button></form></div>`;
  const file = document.querySelector("#logoFile");
  file?.addEventListener("change", () => {
    const f = file.files?.[0];
    if (!f) return;
    if (f.size > 512 * 1024) return toast(T("Logo hajmi 512 KB dan oshmasligi kerak"));
    const reader = new FileReader();
    reader.onload = () => {
      document.querySelector('#bizSettingsForm [name="logo"]').value = reader.result;
    };
    reader.readAsDataURL(f);
  });
  document.querySelector("#bizSettingsForm").onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    fd.openingCash = num(fd.openingCash);
    try {
      await api("/settings", { method: "PUT", body: JSON.stringify(fd) });
      db = await api("/state");
      layout("settings");
      toast(T("Saqlandi"));
    } catch (err) {
      toast(err.message);
    }
  };
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
function backup() {
  view.innerHTML = `<div class="toolbar"><h2>${T(
    "Zaxira nusxalari",
  )}</h2><div class="actions"><button class="btn" onclick="backupDownload()">⬇ ${T(
    "Yuklab olish",
  )}</button><button class="btn primary" onclick="backupNow()">＋ ${T(
    "Yangi zaxira",
  )}</button></div></div><div class="panel"><p class="muted" style="margin:0 0 14px">${T(
    "Zaxira izohi",
  )}</p><div id="backuplist">${T("Yuklanmoqda...")}</div></div>`;
  backupList();
}
async function backupNow() {
  try {
    const x = await api("/backup", { method: "POST", body: "{}" });
    toast(T("Zaxira yaratildi") + (x.remoteKey || x.localFile ? " — " + (x.remoteKey || x.localFile) : ""));
    page(cur);
  } catch (e) {
    toast(e.message);
  }
}
async function backupList() {
  try {
    const x = await api("/backups");
    const remoteRows = x.remote
      .map(
        (r) =>
          `<tr><td>${T("Masofaviy")} (Neon)</td><td>${esc(r.date)}</td><td>${fmtN(
            r.size,
          )} B</td><td class="actions"><button class="btn" onclick="backupRestoreRemote('${esc(
            r.key,
          )}')">${T("Tiklash")}</button></td></tr>`,
      )
      .join("");
    const localRows = x.local
      .map(
        (r) =>
          `<tr><td>${T("Mahalliy fayl")}</td><td>${esc(r.date)}</td><td>${fmtN(
            r.size,
          )} B</td><td class="actions"><button class="btn" onclick="backupRestoreLocal('${esc(
            r.file,
          )}')">${T("Tiklash")}</button></td></tr>`,
      )
      .join("");
    document.getElementById("backuplist").innerHTML = table(
      [T("Manba"), T("Sana"), T("Hajm"), ""],
      remoteRows + localRows,
    );
  } catch (e) {
    toast(e.message);
  }
}
async function backupRestoreRemote(key) {
  if (!confirm(T("Tiklashni tasdiqlaysizmi?") + "\n" + key)) return;
  try {
    await api("/backup/restore", { method: "POST", body: JSON.stringify({ key }) });
    toast(T("Tiklandi"));
    db = await api("/state");
    page(cur);
  } catch (e) {
    toast(e.message);
  }
}
async function backupRestoreLocal(file) {
  if (!confirm(T("Tiklashni tasdiqlaysizmi?") + "\n" + file)) return;
  try {
    await api("/backup/restore", {
      method: "POST",
      body: JSON.stringify({ filename: file }),
    });
    toast(T("Tiklandi"));
    db = await api("/state");
    page(cur);
  } catch (e) {
    toast(e.message);
  }
}
function backupDownload() {
  fetch("/api/backup/download", { headers: { Authorization: "Bearer " + token } })
    .then((r) => {
      if (!r.ok) throw Error(T("Yuklab olishda xatolik"));
      return r.blob();
    })
    .then((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "marjon-backup-" + localDate() + ".json";
      a.click();
    })
    .catch((e) => toast(e.message));
}
function changePw() {
  modal(
    T("Parol o'zgartirish"),
    PW(T("Joriy parol"), "currentPassword") +
      PW(T("Yangi parol (8+)"), "newPassword", "", 'minlength="8"'),
    async (fd) => {
      const d = Object.fromEntries(fd);
      await api("/me/password", { method: "PATCH", body: JSON.stringify(d) });
      toast(T("Parol yangilandi"));
    },
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
function PW(label, name, value = "", extra = "") {
  const id = "pw_" + name;
  const attrs = extra ? " " + extra : "";
  return `<div class="field"><label>${label}</label><div class="pwd-wrap"><input id="${id}" name="${name}" type="password" value="${esc(
    value,
  )}" autocomplete="new-password" ${attrs}><button type="button" class="pwd-eye" onclick="togglePwd('${id}')" title="${T(
    "Ko'rsatish",
  )}">👁</button></div></div>`;
}
function togglePwd(id) {
  const i = document.getElementById(id);
  if (!i) return;
  const show = i.type === "password";
  i.type = show ? "text" : "password";
  i.closest(".pwd-wrap").querySelector(".pwd-eye").textContent = show ? "🙈" : "👁";
}
function productForm(x) {
  if (typeof x === "string") x = dq(x);
  modal(
    x ? T("Mahsulotni tahrirlash") : T("Mahsulot qo'shish"),
    F(T("Nomi"), "name", "text", x?.name) +
      F(T("Kategoriya"), "category", "text", x?.category) +
      F(T("Birlik"), "unit", "text", x?.unit || "kg") +
      `${F(T("Sotish narxi"), "sell", "number", x?.sell || 0)}<div class="two">${F(
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
function dpay() {
  view.innerHTML = `<div class="toolbar"><div class="filters"><input class="search" id="dpq" placeholder="${T(
    "Qidirish...",
  )}" oninput="renderDpay()"></div><button class="btn primary" onclick="dpayForm()">＋ ${T(
    "To'lov",
  )}</button></div><div class="panel"><div id="dplist"></div></div>`;
  renderDpay();
}
function renderDpay() {
  const el = document.getElementById("dplist");
  if (!el) return;
  const qv = (dpq?.value || "").toLowerCase();
  const arr = (db.payments || []).filter((p) => {
    if (!qv) return true;
    const c = db.customers.find((x) => x.id === p.customerId);
    return (
      (c && c.name.toLowerCase().includes(qv)) || String(p.date).includes(qv)
    );
  });
  if (!arr.length)
    return (el.innerHTML = table(
      [T("Sana"), T("Mijoz"), T("Summa"), T("Izoh"), ""],
      "",
    ));
  const total = arr.reduce((a, x) => a + x.amount, 0);
  el.innerHTML = `<div class="grid"><div class="card"><span>${T(
    "Jami qabul",
  )}</span><strong>${money(total)}</strong></div></div><div class="mt">${table(
    [T("Sana"), T("Mijoz"), T("Summa"), T("Izoh"), ""],
    arr.map(
      (p) =>
        `<tr><td>${p.date}</td><td>${esc(
          db.customers.find((c) => c.id === p.customerId)?.name || "-",
        )}</td><td>${money(p.amount)}</td><td>${esc(
          p.note,
        )}</td><td class="actions"><button class="danger" onclick="del('customer-payments','${
          p.id
        }')">🗑</button></td></tr>`,
    ).join(""),
  )}</div>`;
}
function dpayForm() {
  const debtors = db.customers.filter((c) => c.debt > 0);
  if (!debtors.length) return toast(T("Avval qarzdor mijoz yarating"));
  modal(
    T("Qarz to'lovi"),
    `<div class="field"><label>${T(
      "Mijoz",
    )}</label><select name="customerId">${debtors
      .map(
        (c) =>
          `<option value="${c.id}">${esc(c.name)} — ${T("Qarz")} ${money(
            c.debt,
          )}</option>`,
      )
      .join("")}</select></div>${F(
      T("Summa"),
      "amount",
      "number",
      0,
      'min="1"',
    )}${F(T("Izoh"), "note")}${F("Sana", "date", "date", localDate())}`,
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.amount = num(d.amount);
      await api("/customer-payments", {
        method: "POST",
        body: JSON.stringify(d),
      });
    },
  );
}
function saleForm() {
  modal(
    T("Sotuv"),
    `<div class="field"><label>${T("Mahsulot")}</label><select name="productId" onchange="unitSync()">${db.products
      .map(
        (p) =>
          `<option value="${p.id}" data-unit="${esc(unitOf(p))}">${esc(
            p.name,
          )} — ${money(p.sell)} (${T("Qoldiq")} ${fmtN(p.stock)} ${unitOf(
            p,
          )})</option>`,
      )
      .join("")}</select></div>${F(
      T("Miqdor") + ` (<span id="uq">${
        db.products[0] ? esc(unitOf(db.products[0])) : "kg"
      }</span>)`,
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
    `<div class="field"><label>${T("Mahsulot")}</label><select name="productId" onchange="unitSync()">${db.products
      .map(
        (p) =>
          `<option value="${p.id}" data-unit="${esc(unitOf(p))}">${esc(
            p.name,
          )} — ${money(p.buy)} (${T("Qoldiq")} ${fmtN(p.stock)} ${unitOf(
            p,
          )})</option>`,
      )
      .join("")}</select></div>${F(
      T("Miqdor") + ` (<span id="uq">${
        db.products[0] ? esc(unitOf(db.products[0])) : "kg"
      }</span>)`,
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
function expenses() {
  view.innerHTML = `<div class="toolbar"><div class="filters"><input class="search" id="exq" placeholder="${T(
    "Qidirish...",
  )}" oninput="renderExpenses()"></div><button class="btn primary" onclick="expenseForm()">＋ ${T(
    "Rasxod",
  )}</button></div><div class="panel"><div id="exlist"></div></div>`;
  renderExpenses();
}
function renderExpenses() {
  const el = document.getElementById("exlist");
  if (!el) return;
  const qv = (exq?.value || "").toLowerCase();
  const arr = db.expenses.filter(
    (x) =>
      !qv ||
      String(x.category || "").toLowerCase().includes(qv) ||
      String(x.date).includes(qv) ||
      String(x.note || "").toLowerCase().includes(qv),
  );
  if (!arr.length)
    return (el.innerHTML = table(
      [T("Sana"), T("Turi"), T("Summa"), T("Izoh"), ""],
      "",
    ));
  const total = arr.reduce((a, x) => a + x.amount, 0);
  el.innerHTML = `<div class="grid"><div class="card"><span>${T(
    "Jami rasxod",
  )}</span><strong>${money(total)}</strong></div></div><div class="mt">${table(
    [T("Sana"), T("Turi"), T("Summa"), T("Izoh"), ""],
    arr.map(
      (x) =>
        `<tr><td>${x.date}</td><td>${esc(x.category)}</td><td>${money(
          x.amount,
        )}</td><td>${esc(x.note)}</td><td class="actions"><button onclick="expenseForm('${q(
          x,
        )}')">✏️</button><button class="danger" onclick="del('expenses','${
          x.id
        }')">🗑</button></td></tr>`,
    ).join(""),
  )}</div>`;
}
function expenseForm(x) {
  if (typeof x === "string") x = dq(x);
  modal(
    x ? T("Rasxodni tahrirlash") : T("Rasxod"),
    F(T("Turi"), "category", "text", x?.category) +
      F(T("Summa"), "amount", "number", x?.amount || 0, 'min="1"') +
      F(T("Izoh"), "note", "text", x?.note) +
      F("Sana", "date", "date", x?.date || localDate()),
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.amount = num(d.amount);
      if (x)
        await api("/expenses/" + x.id, {
          method: "PUT",
          body: JSON.stringify(d),
        });
      else await api("/expenses", { method: "POST", body: JSON.stringify(d) });
    },
  );
}
function advanceForm() {
  modal(
    T("Avans"),
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
    )}${F("Sana", "date", "date", localDate())}`,
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.amount = num(d.amount);
      d.month = d.date.slice(0, 7);
      d.type = "advance";
      await api("/payroll", { method: "POST", body: JSON.stringify(d) });
    },
  );
}
function payrollForm(x) {
  if (typeof x === "string") x = dq(x);
  modal(
    x ? T("To'lovni tahrirlash") : T("Oylik to'lovi"),
    `<div class="field"><label>${T(
      "Ishchi",
    )}</label><select name="workerId">${db.workers
      .map(
        (w) =>
          `<option value="${w.id}" ${
            x && x.workerId === w.id ? "selected" : ""
          }>${esc(w.name)} — ${money(w.salary)}</option>`,
      )
      .join("")}</select></div>${F(
      T("Summa"),
      "amount",
      "number",
      x?.amount || 0,
      'min="1"',
    )}<div class="field"><label>${T("Turi")}</label><select name="type"><option value="salary" ${
      x && x.type === "salary" ? "selected" : ""
    }>${T("salary")}</option><option value="advance" ${
      x && x.type === "advance" ? "selected" : ""
    }>${T("advance")}</option></select></div>${F(
      "Sana",
      "date",
      "date",
      x?.date || localDate(),
    )}`,
    async (fd) => {
      const d = Object.fromEntries(fd);
      d.amount = num(d.amount);
      d.month = d.date.slice(0, 7);
      if (x)
        await api("/payroll/" + x.id, {
          method: "PUT",
          body: JSON.stringify(d),
        });
      else await api("/payroll", { method: "POST", body: JSON.stringify(d) });
    },
  );
}
function userForm() {
  modal(
    T("Foydalanuvchi yaratish"),
    F(T("Ism"), "name") +
      F(T("Login"), "username") +
      PW(T("Parol"), "password", "", 'minlength="8"') +
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
      PW(T("Yangi parol (ixtiyoriy)"), "password"),
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