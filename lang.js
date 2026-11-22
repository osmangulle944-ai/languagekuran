// =====================================================================
//  Dil seçici – 120 dil, dünyada en çok konuşulandan aza doğru sıralı
//  [Google Translate kodu, İngilizce adı, bayrak (ülke kodu), sağdan-sola?]
// =====================================================================
const LANGUAGES = [
  ["en", "English", "gb"], ["zh-CN", "Chinese (Simplified)", "cn"], ["hi", "Hindi", "in"],
  ["es", "Spanish", "es"], ["fr", "French", "fr"], ["ar", "Arabic", "sa", 1],
  ["bn", "Bengali", "bd"], ["pt", "Portuguese", "pt"], ["ru", "Russian", "ru"],
  ["ur", "Urdu", "pk", 1], ["id", "Indonesian", "id"], ["de", "German", "de"],
  ["ja", "Japanese", "jp"], ["mr", "Marathi", "in"], ["te", "Telugu", "in"],
  ["tr", "Turkish", "tr"], ["ta", "Tamil", "in"], ["vi", "Vietnamese", "vn"],
  ["tl", "Filipino", "ph"], ["ko", "Korean", "kr"], ["fa", "Persian", "ir", 1],
  ["ha", "Hausa", "ng"], ["sw", "Swahili", "tz"], ["jw", "Javanese", "id"],
  ["it", "Italian", "it"], ["pa", "Punjabi", "in"], ["gu", "Gujarati", "in"],
  ["th", "Thai", "th"], ["kn", "Kannada", "in"], ["am", "Amharic", "et"],
  ["bho", "Bhojpuri", "in"], ["pl", "Polish", "pl"], ["ml", "Malayalam", "in"],
  ["yo", "Yoruba", "ng"], ["or", "Odia", "in"], ["my", "Burmese", "mm"],
  ["uk", "Ukrainian", "ua"], ["zh-TW", "Chinese (Traditional)", "tw"], ["su", "Sundanese", "id"],
  ["ig", "Igbo", "ng"], ["uz", "Uzbek", "uz"], ["sd", "Sindhi", "pk", 1],
  ["ro", "Romanian", "ro"], ["nl", "Dutch", "nl"], ["ps", "Pashto", "af", 1],
  ["mg", "Malagasy", "mg"], ["ku", "Kurdish (Kurmanji)", "iq"], ["ne", "Nepali", "np"],
  ["si", "Sinhala", "lk"], ["km", "Khmer", "kh"], ["az", "Azerbaijani", "az"],
  ["ceb", "Cebuano", "ph"], ["zu", "Zulu", "za"], ["hu", "Hungarian", "hu"],
  ["el", "Greek", "gr"], ["cs", "Czech", "cz"], ["sv", "Swedish", "se"],
  ["kk", "Kazakh", "kz"], ["rw", "Kinyarwanda", "rw"], ["so", "Somali", "so"],
  ["ht", "Haitian Creole", "ht"], ["ny", "Chichewa", "mw"], ["be", "Belarusian", "by"],
  ["xh", "Xhosa", "za"], ["ug", "Uyghur", "cn", 1], ["iw", "Hebrew", "il", 1],
  ["bg", "Bulgarian", "bg"], ["sr", "Serbian", "rs"], ["da", "Danish", "dk"],
  ["fi", "Finnish", "fi"], ["sk", "Slovak", "sk"], ["no", "Norwegian", "no"],
  ["tk", "Turkmen", "tm"], ["ka", "Georgian", "ge"], ["hy", "Armenian", "am"],
  ["sq", "Albanian", "al"], ["hr", "Croatian", "hr"], ["mn", "Mongolian", "mn"],
  ["lo", "Lao", "la"], ["tg", "Tajik", "tj"], ["ky", "Kyrgyz", "kg"],
  ["ti", "Tigrinya", "er"], ["st", "Sesotho", "ls"], ["sn", "Shona", "zw"],
  ["om", "Oromo", "et"], ["ln", "Lingala", "cd"], ["qu", "Quechua", "pe"],
  ["gn", "Guarani", "py"], ["ay", "Aymara", "bo"], ["tt", "Tatar", "ru"],
  ["lt", "Lithuanian", "lt"], ["sl", "Slovenian", "si"], ["lv", "Latvian", "lv"],
  ["mk", "Macedonian", "mk"], ["bs", "Bosnian", "ba"], ["et", "Estonian", "ee"],
  ["gl", "Galician", "es"], ["ca", "Catalan", "ad"], ["eu", "Basque", "es"],
  ["ms", "Malay", "my"], ["af", "Afrikaans", "za"], ["cy", "Welsh", "gb-wls"],
  ["ga", "Irish", "ie"], ["mt", "Maltese", "mt"], ["is", "Icelandic", "is"],
  ["lb", "Luxembourgish", "lu"], ["fy", "Frisian", "nl"], ["gd", "Scots Gaelic", "gb-sct"],
  ["co", "Corsican", "fr"], ["haw", "Hawaiian", "us"], ["sm", "Samoan", "ws"],
  ["mi", "Maori", "nz"], ["la", "Latin", "va"], ["yi", "Yiddish", "il", 1],
  ["dv", "Dhivehi", "mv", 1], ["ckb", "Kurdish (Sorani)", "iq", 1], ["mai", "Maithili", "in"],
  ["as", "Assamese", "in"], ["sa", "Sanskrit", "in"], ["ee", "Ewe", "gh"],
];

const SOURCE_LANG = "tr";          // sitenin yazıldığı dil
const DEFAULT_LANG = "en";         // ilk açılış dili (kayıtlı seçim yoksa)
const STORE_KEY = "site-lang";
const flagUrl = (cc) => `https://flagcdn.com/w40/${cc}.png`;
const byCode = Object.fromEntries(LANGUAGES.map((l) => [l[0], l]));

// ---------- Kayıtlı dil (tarayıcı izin vermezse sessizce geç) ----------
function loadLang() {
  try { const v = localStorage.getItem(STORE_KEY); if (v && byCode[v]) return v; } catch (e) {}
  return DEFAULT_LANG;
}
function saveLang(code) { try { localStorage.setItem(STORE_KEY, code); } catch (e) {} }

// ---------- Google Translate çerezi ----------
function setTransCookie(code) {
  const host = location.hostname;
  const doms = ["", host, "." + host.split(".").slice(-2).join(".")];
  doms.forEach((d) => {
    const dom = d ? `;domain=${d}` : "";
    if (code === SOURCE_LANG) {
      document.cookie = `googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/${dom}`;
    } else {
      document.cookie = `googtrans=/${SOURCE_LANG}/${code};path=/${dom}`;
    }
  });
}

let current = loadLang();
setTransCookie(current);   // element.js yüklenmeden önce: sayfa seçili dilde açılır

function applyDir(code) {
  const rtl = !!(byCode[code] && byCode[code][3]);
  document.documentElement.dir = rtl ? "rtl" : "ltr";
  document.documentElement.classList.toggle("is-rtl", rtl);
}
applyDir(current);

// ---------- Google Translate'i yükle ----------
window.googleTranslateElementInit = function () {
  try {
    new google.translate.TranslateElement(
      { pageLanguage: SOURCE_LANG, autoDisplay: false }, "gt-host");
  } catch (e) { console.warn("Çeviri motoru başlatılamadı", e); }
};
(function loadEngine() {
  const s = document.createElement("script");
  s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  s.onerror = () => showToast("Translation service unavailable");
  document.head.appendChild(s);
})();

function getCombo() { return document.querySelector("select.goog-te-combo"); }

function waitForCombo(timeout = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    (function tick() {
      const c = getCombo();
      if (c && c.options.length > 1) return resolve(c);
      if (Date.now() - start > timeout) return resolve(null);
      setTimeout(tick, 150);
    })();
  });
}

// Dili sayfaya uygula – yeniden yükleme yok, sayfa yerinde yeniden çizilir
async function translateTo(code) {
  setTransCookie(code);
  applyDir(code);
  const combo = await waitForCombo();
  if (!combo) { showToast("Translation service unavailable"); return false; }

  if (code === SOURCE_LANG) {
    combo.value = SOURCE_LANG;
    combo.dispatchEvent(new Event("change"));
    // Google bazen orijinale tam dönmez; garanti için orijinal metni geri yükle
    setTimeout(() => {
      if (document.documentElement.classList.contains("translated-ltr") ||
          document.documentElement.classList.contains("translated-rtl")) {
        const frame = document.querySelector("iframe.skiptranslate, .goog-te-banner-frame");
        const btn = frame && frame.contentDocument &&
          frame.contentDocument.querySelector("[id$='restore']");
        if (btn) btn.click(); else location.reload();
      }
    }, 800);
    return true;
  }

  const exists = Array.from(combo.options).some((o) => o.value === code);
  if (!exists) { showToast("This language is not available right now"); return false; }

  combo.value = code;
  combo.dispatchEvent(new Event("change"));
  // Bilinen Google hatası: ilk değişiklik bazen yakalanmaz, bir kez daha tetikle
  setTimeout(() => {
    if (document.documentElement.lang !== code && combo.value === code) {
      combo.dispatchEvent(new Event("change"));
    }
  }, 900);
  return true;
}

// ---------- Arayüz ----------
const widget = document.getElementById("lang");
const toggle = document.getElementById("lang-toggle");
const panel = document.getElementById("lang-panel");
const search = document.getElementById("lang-search");
const list = document.getElementById("lang-list");
const curFlag = document.getElementById("lang-flag");
const curCode = document.getElementById("lang-code");

function renderCurrent() {
  const l = byCode[current];
  curFlag.src = flagUrl(l[2]);
  curFlag.alt = l[1];
  curCode.textContent = l[0].split("-")[0].toUpperCase();
}

function renderList(q = "") {
  const query = q.trim().toLowerCase();
  const items = LANGUAGES
    .map((l, i) => ({ l, rank: i + 1 }))
    .filter(({ l }) => !query || l[1].toLowerCase().includes(query) || l[0].toLowerCase().startsWith(query));

  list.replaceChildren();
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "lang-empty";
    li.textContent = "No language found";
    list.appendChild(li);
    return;
  }
  for (const { l, rank } of items) {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.dataset.code = l[0];
    li.tabIndex = -1;
    if (l[0] === current) { li.classList.add("active"); li.setAttribute("aria-selected", "true"); }

    const r = document.createElement("span"); r.className = "lang-rank"; r.textContent = rank;
    const img = document.createElement("img");
    img.src = flagUrl(l[2]); img.alt = ""; img.loading = "lazy"; img.width = 20; img.height = 15;
    img.onerror = () => { img.style.visibility = "hidden"; };
    const name = document.createElement("span"); name.className = "lang-name"; name.textContent = l[1];

    li.append(r, img, name);
    list.appendChild(li);
  }
}

function openPanel() {
  widget.classList.add("open");
  toggle.setAttribute("aria-expanded", "true");
  search.value = "";
  renderList();
  setTimeout(() => {
    search.focus();
    const a = list.querySelector(".active");
    if (a) a.scrollIntoView({ block: "center" });
  }, 30);
}
function closePanel() {
  widget.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}

toggle.addEventListener("click", (e) => {
  e.stopPropagation();
  widget.classList.contains("open") ? closePanel() : openPanel();
});
panel.addEventListener("click", (e) => e.stopPropagation());
document.addEventListener("click", closePanel);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });
search.addEventListener("input", () => renderList(search.value));
search.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { const first = list.querySelector("li[data-code]"); if (first) choose(first.dataset.code); }
});
list.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-code]");
  if (li) choose(li.dataset.code);
});

async function choose(code) {
  closePanel();
  if (code === current) return;
  const prev = current;
  current = code;
  saveLang(code);
  renderCurrent();
  const ok = await translateTo(code);
  if (!ok) { current = prev; saveLang(prev); renderCurrent(); applyDir(prev); setTransCookie(prev); }
  window.dispatchEvent(new CustomEvent("sitelang", { detail: current }));
}
window.getSiteLang = () => current;
window.getSiteFlag = () => (byCode[current] ? byCode[current][2] : "tr").split("-")[0];

// ---------- Küçük bilgi balonu ----------
function showToast(msg) {
  let t = document.getElementById("lang-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "lang-toast"; t.className = "notranslate";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2600);
}

renderCurrent();

// Kayıtlı dil (yoksa İngilizce) sayfa açılır açılmaz uygulanır
if (current !== SOURCE_LANG) {
  translateTo(current).then((ok) => {
    if (!ok) { current = SOURCE_LANG; renderCurrent(); applyDir(SOURCE_LANG); setTransCookie(SOURCE_LANG); window.dispatchEvent(new CustomEvent("sitelang", { detail: current })); }
  });
}
