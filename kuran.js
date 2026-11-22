/* =========================================================
   Kur'an bölümü: Sure / Cüz / Anahtar Kelime + okuma ekranı (ses + metin)
   + köşedeki site araması.
   Veri: api.quran.com (Quran Foundation açık API'si, CORS açık)
   ========================================================= */
(() => {
  "use strict";

  const API = "https://api.quran.com/api/v4";
  const AUDIO_CDN = "https://verses.quran.com/";
  const DEFAULT_RECITER = 6;                 // Mahmoud Khalil Al-Husary (quran.com ile aynı)
  const DEFAULT_MEAL = { tr: 77, en: 20 };   // tr: Diyanet İşleri, en: Saheeh International
  const FALLBACK_MEAL = 20;
  const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";

  // ---------- yardımcılar ----------
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (k === "notr") { if (v) { n.classList.add("notranslate"); n.setAttribute("translate", "no"); } }
      else n.setAttribute(k, v);
    }
    for (const c of kids) if (c != null) n.append(c);
    return n;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const cache = new Map();
  async function api(path, { signal } = {}) {
    if (cache.has(path)) return cache.get(path);
    const res = await fetch(API + path, { signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    cache.set(path, data);
    return data;
  }
  // Google çeviri kodu -> API dil kodu
  function apiLang() {
    const c = (window.getSiteLang ? window.getSiteLang() : "tr") || "tr";
    const map = { "zh-CN": "zh", "zh-TW": "zh", iw: "he", jw: "jv" };
    return map[c] || c.split("-")[0];
  }
  // Aramada eşleşme için sadeleştir (ı/i, â/a, ' - boşluk)
  function norm(s) {
    return String(s || "").toLocaleLowerCase("tr")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/ı/g, "i").replace(/[‘’'`ʿʾ\-\s.]/g, "");
  }
  // API'den gelen HTML'i güvenle aktar: yalnız metin + <em>, dipnot <sup> küçük gösterilir
  function safeRich(html) {
    const doc = new DOMParser().parseFromString("<div>" + (html || "") + "</div>", "text/html");
    const out = document.createDocumentFragment();
    (function walk(src, dst) {
      for (const n of src.childNodes) {
        if (n.nodeType === 3) dst.append(n.textContent);
        else if (n.nodeType === 1) {
          const t = n.tagName;
          if (t === "SUP") dst.append(el("span", { class: "fn", text: n.textContent }));
          else if (t === "EM" || t === "B") { const e = el("em"); walk(n, e); dst.append(e); }
          else walk(n, dst);
        }
      }
    })(doc.body.firstChild, out);
    return out;
  }
  const fmtTime = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const ayetWord = (n) => (/100/.test(T.verses_tpl) ? T.verses_tpl.replace("100", n) : n + " " + T.verses_tpl);


  // =========================================================
  //  ARAYÜZ DİLİ — bölümün bütün yazıları buradan basılır.
  //  Türkçe: aşağıdaki metinler aynen. İngilizce: aşağıdaki metinler.
  //  Diğer 118 dil: İngilizce metinler bir kez çevrilir, tarayıcıda saklanır.
  // =========================================================
  const UI_TR = {
    title: "KUR'AN", tab_sure: "Sure", tab_cuz: "Cüz", tab_kw: "Anahtar Kelime",
    sort: "SIRALA:", asc: "ARTAN", desc: "AZALAN", verses_tpl: "100 Ayet", juz: "Cüz",
    kw_ph: "Anahtar kelime yazın…", search_btn: "Ara", more: "Daha fazla göster",
    results: "sonuç", no_results: "Sonuç bulunamadı.", min2: "En az 2 harf yazın.",
    searching: "Aranıyor…", search_fail: "Arama yapılamadı.", retry: "Tekrar dene",
    load_fail: "Veriler yüklenemedi. İnternet bağlantınızı kontrol edin.", loading: "Yükleniyor…",
    surah_fail: "Sure yüklenemedi.", reciter: "Kâri", meal: "Meal", mecca: "Mekke", medina: "Medine",
    audio_fail: "Ses yüklenemedi", ss_label: "Ara", ss_ph: "Sure, ayet, kelime ara…",
    g_surahs: "Sureler", g_verse: "Ayet", g_verses: "Ayetler", close: "Kapat",
    play_from: "Bu ayetten oynat", play: "Oynat", pause: "Duraklat",
    kf_title: "Keşfet", kf_greet: "Ne arıyorsun?", kf_send: "Gönder",
    kf_hint: "Yalnızca Kur'an ayetleriyle, sure ve ayet numarasını göstererek cevap verir.",
    kf_topics: "Ya da bir başlık seç:",
    kf_found: "Kur'an'da bununla ilgili şu ayetler geçiyor:",
    kf_sura: "Bu adla geçen sure:",
    kf_ref: "İstediğin ayet:",
    kf_none: "Bununla ilgili bir ayet bulamadım. Başka kelimelerle anlatır mısın?",
    kf_fail: "Bağlantı kurulamadı. Tekrar dener misin?",
    kf_more: "Daha fazla ayet", kf_end: "Bununla ilgili bulduğum ayetler bu kadar.",
    kf_short: "Biraz daha açık yazar mısın? Bir konu, bir duygu ya da bir soru olabilir.",
    kf_bad_sura: "Kur'an'da 114 sure var; bu numarada bir sure yok.",
    kf_bad_ayah: "Bu surede o numarada bir ayet yok. Surenin ayet sayısı:",
    kf_help: "Yalnız değilsin. Kendine zarar vermeyi düşünüyorsan hemen 112'yi ara ya da güvendiğin biriyle konuş.",
    t_patience: "Sabır", t_prayer: "Namaz", t_dua: "Dua", t_mercy: "Merhamet", t_repent: "Tövbe",
    t_grateful: "Şükür", t_justice: "Adalet", t_friend: "Arkadaşlık", t_parents: "Anne ve baba", t_family: "Aile",
    t_marriage: "Evlilik", t_orphan: "Yetim", t_poor: "Yoksula yardım", t_paradise: "Cennet", t_hell: "Cehennem",
    t_death: "Ölüm", t_hereafter: "Ahiret", t_provision: "Rızık", t_knowledge: "İlim", t_trust: "Tevekkül",
    t_fasting: "Oruç", t_charity: "Sadaka", t_forgive: "Affetmek", t_peace: "Barış", t_fear: "Korku",
    t_hope: "Umut", t_love: "Sevgi", t_heart: "Kalp", t_truth: "Doğruluk", t_lie: "Yalan",
    t_arrogance: "Kibir", t_prophets: "Peygamberler", t_angels: "Melekler", t_nature: "Doğa", t_creation: "Yaratılış",
    t_trial: "İmtihan", t_nightday: "Gece ve gündüz",
  };
  const UI_EN = {
    title: "QURAN", tab_sure: "Surah", tab_cuz: "Juz", tab_kw: "Keyword",
    sort: "SORT BY:", asc: "ASCENDING", desc: "DESCENDING", verses_tpl: "100 verses", juz: "Juz",
    kw_ph: "Type a keyword…", search_btn: "Search", more: "Show more",
    results: "results", no_results: "No results found.", min2: "Type at least 2 letters.",
    searching: "Searching…", search_fail: "Search failed.", retry: "Try again",
    load_fail: "Data could not be loaded. Check your internet connection.", loading: "Loading…",
    surah_fail: "The surah could not be loaded.", reciter: "Reciter", meal: "Translation", mecca: "Mecca", medina: "Medina",
    audio_fail: "Audio could not be loaded", ss_label: "Search", ss_ph: "Search surah, verse, word…",
    g_surahs: "Surahs", g_verse: "Verse", g_verses: "Verses", close: "Close",
    play_from: "Play from this verse", play: "Play", pause: "Pause",
    kf_title: "Explore", kf_greet: "What are you looking for?", kf_send: "Send",
    kf_hint: "Answers only with verses of the Quran, showing the surah and verse number.",
    kf_topics: "Or pick a topic:",
    kf_found: "These verses of the Quran speak about this:",
    kf_sura: "The surah with this name:",
    kf_ref: "The verse you asked for:",
    kf_none: "I could not find a verse about this. Could you describe it in other words?",
    kf_fail: "Could not connect. Could you try again?",
    kf_more: "More verses", kf_end: "These are all the verses I found about this.",
    kf_short: "Could you write a little more? A topic, a feeling or a question.",
    kf_bad_sura: "The Quran has 114 surahs; there is no surah with this number.",
    kf_bad_ayah: "This surah has no verse with that number. Number of verses in the surah:",
    kf_help: "You are not alone. If you are thinking of harming yourself, call your local emergency number now or talk to someone you trust.",
    t_patience: "Patience", t_prayer: "Prayer", t_dua: "Supplication", t_mercy: "Mercy", t_repent: "Repentance",
    t_grateful: "Gratitude", t_justice: "Justice", t_friend: "Friendship", t_parents: "Parents", t_family: "Family",
    t_marriage: "Marriage", t_orphan: "Orphans", t_poor: "Helping the poor", t_paradise: "Paradise", t_hell: "Hell",
    t_death: "Death", t_hereafter: "Hereafter", t_provision: "Provision", t_knowledge: "Knowledge", t_trust: "Trust in God",
    t_fasting: "Fasting", t_charity: "Charity", t_forgive: "Forgiveness", t_peace: "Peace", t_fear: "Fear",
    t_hope: "Hope", t_love: "Love", t_heart: "Heart", t_truth: "Truthfulness", t_lie: "Lying",
    t_arrogance: "Arrogance", t_prophets: "Prophets", t_angels: "Angels", t_nature: "Nature", t_creation: "Creation",
    t_trial: "Trials", t_nightday: "Night and day",
  };
  // Çeviriye gönderilen kaynak: tek kelimeler yanlış çevrilmesin diye bağlamlı yazıldı
  // ("verse" tek başına bazı dillerde "şiir" oluyor; "Quranic verse" doğru çıkıyor).
  const UI_SRC = Object.assign({}, UI_EN, {
    verses_tpl: "100 Quranic verses", g_verse: "Quranic verse", g_verses: "Quranic verses",
    play_from: "Play from this Quranic verse", ss_ph: "Search surah, Quranic verse, word…",
  });
  const UPPER_KEYS = ["title", "sort", "asc", "desc"];
  let T = UI_TR;
  const siteLang = () => (window.getSiteLang ? window.getSiteLang() : "tr") || "tr";

  async function translateUI(code) {
    const key = "q-ui-v4-" + code;
    const saved = store.get(key, null);
    if (saved && saved.title) return saved;
    const keys = Object.keys(UI_EN);
    const q = keys.map((k) => UI_SRC[k]).join("\n");
    const url = "https://translate.googleapis.com/translate_a/single?" +
      new URLSearchParams({ client: "gtx", sl: "en", tl: code, dt: "t", q });
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const d = await res.json();
    const lines = d[0].map((seg) => seg[0]).join("").split("\n").map((x) => x.trim());
    if (lines.length !== keys.length) throw new Error("çeviri satırları eşleşmedi");
    const out = {};
    keys.forEach((k, i) => { out[k] = lines[i] || UI_EN[k]; });
    UPPER_KEYS.forEach((k) => { out[k] = out[k].toLocaleUpperCase(code); });
    store.set(key, out);
    return out;
  }
  // Hızlı dil değişiminde geç gelen eski dilin çevirisi yenisinin üstüne yazılmasın
  let uiTok = 0, chTok = 0;
  async function loadUI() {
    const tok = ++uiTok, code = siteLang();
    let t;
    if (code === "tr") t = UI_TR;
    else if (code === "en") t = UI_EN;
    else {
      try { t = await translateUI(code); }
      catch (e) { console.warn("Arayüz çevirisi alınamadı, İngilizce gösteriliyor:", e); t = UI_EN; }
    }
    if (tok !== uiTok || code !== siteLang()) return;
    T = t;
    applyStaticUI();
  }
  function applyStaticUI() {
    document.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = T[n.dataset.i18n]; });
    document.querySelectorAll("[data-i18n-ph]").forEach((n) => { n.placeholder = T[n.dataset.i18nPh]; });
    document.querySelectorAll("[data-i18n-aria]").forEach((n) => { n.setAttribute("aria-label", T[n.dataset.i18nAria]); });
    const sl = document.getElementById("kuran-sort-label");
    if (sl) sl.textContent = asc ? T.asc : T.desc;
  }

  // ---------- veri ----------
  let chapters = [];          // 114 sure (seçili dilde)
  let juzs = [];              // 30 cüz
  const chapterById = (id) => chapters[id - 1];

  async function loadChapters() {
    const tok = ++chTok, lang = apiLang();
    const d = await api("/chapters?language=" + lang);
    // Kaynakta bu dilde sure adı yoksa (İngilizce gelir) İngilizce adları bir kez o dile çevir
    let local = null;
    if (lang !== "en" && lang !== "ar" && d.chapters[0].translated_name?.language_name === "english") {
      local = await translateNames(siteLang(), d.chapters.map((c) => c.translated_name.name)).catch(() => null);
    }
    if (tok !== chTok) return;
    chapters = d.chapters.map((c, i) => Object.assign({}, c, {
      _name: lang === "ar" ? c.name_arabic : (local && local[i]) || c.translated_name?.name || c.name_simple,
    }));
  }
  async function translateNames(code, names) {
    const key = "q-sname-v1-" + code;
    const saved = store.get(key, null);
    if (saved && saved.length === names.length) return saved;
    const url = "https://translate.googleapis.com/translate_a/single?" +
      new URLSearchParams({ client: "gtx", sl: "en", tl: code, dt: "t", q: names.join("\n") });
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const d = await res.json();
    const out = d[0].map((seg) => seg[0]).join("").split("\n").map((x) => x.trim());
    if (out.length !== names.length || out.some((x) => !x)) throw new Error("ad çevirisi eşleşmedi");
    store.set(key, out);
    return out;
  }
  // Ekranda gösterilen sure adı: yalnızca sitenin dilinde (Latin harfli Arapça okunuş yok)
  const sName = (c) => (c ? c._name || c.translated_name?.name || c.name_simple : "");
  async function loadJuzs() {
    if (juzs.length) return;
    const d = await api("/juzs");
    const seen = new Set();
    juzs = d.juzs.filter((j) => !seen.has(j.juz_number) && seen.add(j.juz_number))
      .sort((a, b) => a.juz_number - b.juz_number);
  }

  // =========================================================
  //  BÖLÜM: sekmeler + ızgara
  // =========================================================
  const grid = $("kuran-grid");
  const kwBox = $("kuran-kelime");
  const tools = document.querySelector(".kuran-tools");
  const sortBtn = $("kuran-sort");
  let tab = "sure";
  let asc = true;

  function setTab(t) {
    tab = t;
    document.querySelectorAll(".kuran-tabs [role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === t)));
    const isKw = t === "kelime";
    grid.hidden = isKw; kwBox.hidden = !isKw;
    tools.classList.toggle("hide", isKw);
    if (isKw) setTimeout(() => $("kw-input").focus({ preventScroll: true }), 0);
    else render();
  }
  document.querySelectorAll(".kuran-tabs [role=tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  // sekmeler arası ok tuşları
  document.querySelector(".kuran-tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const tabs = [...document.querySelectorAll(".kuran-tabs [role=tab]")];
    const i = tabs.findIndex((b) => b.dataset.tab === tab);
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    n.focus(); setTab(n.dataset.tab);
  });

  sortBtn.addEventListener("click", () => {
    asc = !asc;
    sortBtn.classList.toggle("desc", !asc);
    $("kuran-sort-label").textContent = asc ? T.asc : T.desc;
    render();
  });

  function skeleton() {
    grid.replaceChildren(...Array.from({ length: 9 }, () => el("div", { class: "q-skel" })));
  }
  function errorState(msg, retry) {
    grid.replaceChildren(el("div", { class: "q-state" },
      el("div", { text: msg }), el("button", { type: "button", text: T.retry, onclick: retry })));
  }

  function surahCard(c) {
    return el("button", { class: "q-card", type: "button", "data-ch": c.id, onclick: () => openReader(c.id) },
      el("div", { class: "q-diamond", notr: true }, el("span", { text: c.id })),
      el("div", { class: "q-info" },
        el("div", { class: "q-name", notr: true, text: sName(c) })),
      el("div", { class: "q-right" },
        apiLang() === "ar" ? null : el("div", { class: "q-ar", notr: true, lang: "ar", text: c.name_arabic }),
        el("div", { class: "q-count", text: ayetWord(c.verses_count) })));
  }

  function juzCard(j) {
    const rows = Object.entries(j.verse_mapping).map(([ch, range]) => {
      const c = chapterById(+ch);
      const start = +range.split("-")[0];
      return el("li", {}, el("button", { type: "button", onclick: (e) => { e.stopPropagation(); openReader(+ch, start); } },
        el("span", { notr: true, text: ch + ". " + sName(c) }),
        el("span", { class: "r", notr: true, text: range })));
    });
    const firstCh = +Object.keys(j.verse_mapping)[0];
    const firstV = +Object.values(j.verse_mapping)[0].split("-")[0];
    const card = el("div", { class: "q-card q-juz", role: "button", tabindex: "0",
      onclick: () => openReader(firstCh, firstV),
      onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openReader(firstCh, firstV); } } },
      el("div", { class: "q-diamond", notr: true }, el("span", { text: j.juz_number })),
      el("div", { class: "q-info" },
        el("div", { class: "q-name", text: T.juz + " " + j.juz_number }),
        el("ul", { class: "q-juz-list" }, ...rows)),
      el("div", { class: "q-right" }, el("div", { class: "q-count", text: ayetWord(j.verses_count) })));
    return card;
  }

  async function render() {
    try {
      if (!chapters.length) { skeleton(); await loadChapters(); }
      if (tab === "sure") {
        const list = asc ? chapters : [...chapters].reverse();
        grid.replaceChildren(...list.map(surahCard));
      } else if (tab === "cuz") {
        if (!juzs.length) { skeleton(); await loadJuzs(); }
        const list = asc ? juzs : [...juzs].reverse();
        grid.replaceChildren(...list.map(juzCard));
      }
    } catch (e) {
      console.warn("Kur'an verisi yüklenemedi:", e);
      errorState(T.load_fail, render);
    }
  }

  // ---------- Anahtar kelime sekmesi ----------
  let kwQuery = "", kwPage = 1, kwCtl = null;
  function verseResult(r) {
    const [ch, v] = r.verse_key.split(":").map(Number);
    const c = chapterById(ch);
    const tr = (r.translations || [])[0];
    return el("button", { class: "q-verse", type: "button", "data-key": r.verse_key, onclick: () => openReader(ch, v) },
      el("div", { class: "q-verse-key", notr: true, text: (c ? sName(c) + " " : "") + r.verse_key }),
      el("div", { class: "q-verse-ar", notr: true, lang: "ar", text: r.text || "" }),
      tr ? el("div", { class: "q-verse-tr", notr: true }, safeRich(tr.text)) : null);
  }
  async function kwSearch(q, page = 1) {
    q = q.trim();
    if (q.length < 2) { $("kw-info").textContent = T.min2; return; }
    kwCtl?.abort(); kwCtl = new AbortController();
    kwQuery = q; kwPage = page;
    $("kw-info").textContent = T.searching;
    if (page === 1) $("kw-results").replaceChildren();
    $("kw-more").hidden = true;
    try {
      if (!chapters.length) await loadChapters();
      const d = await api(`/search?q=${encodeURIComponent(q)}&size=20&page=${page}&language=${apiLang()}`, { signal: kwCtl.signal });
      const s = d.search;
      $("kw-info").textContent = s.total_results ? `${s.total_results} ${T.results}` : T.no_results;
      const shown = new Set([...$("kw-results").children].map((n) => n.dataset.key));
      $("kw-results").append(...s.results.filter((r) => !shown.has(r.verse_key)).map(verseResult));
      $("kw-more").hidden = !(s.current_page < s.total_pages);
    } catch (e) {
      if (e.name === "AbortError") return;
      $("kw-info").replaceChildren(el("span", { text: T.search_fail + " " }),
        el("button", { class: "q-retry", type: "button", text: T.retry, onclick: () => kwSearch(q, page) }));
    }
  }
  $("kw-form").addEventListener("submit", (e) => { e.preventDefault(); kwSearch($("kw-input").value, 1); });
  $("kw-more").addEventListener("click", () => kwSearch(kwQuery, kwPage + 1));

  // =========================================================
  //  OKUMA EKRANI (ses + metin)
  // =========================================================
  const reader = $("reader"), body = $("rd-body"), audio = $("rd-audio");
  const playBtn = $("rd-play"), seek = $("rd-seek");
  let rd = { ch: 0, startVerse: 1, timings: [], activeKey: null, loadToken: 0, audioCh: 0, audioRec: 0 };
  let reciters = [], translations = [];
  let pushedHash = false;
  const baseTitle = document.title;

  function currentReciter() { return store.get("q-reciter", DEFAULT_RECITER); }
  function currentMeal() {
    const lang = apiLang();
    const saved = store.get("q-meal-" + lang, null);
    if (saved && translations.some((t) => t.id === saved)) return saved;
    if (DEFAULT_MEAL[lang]) return DEFAULT_MEAL[lang];
    const name = langNames[lang];
    const t = translations.find((x) => x.language_name === name);
    return t ? t.id : FALLBACK_MEAL;
  }
  let langNames = {};   // iso -> "turkish"

  async function loadReaderOptions() {
    if (!reciters.length) {
      const [r, t, l] = await Promise.all([
        api("/resources/chapter_reciters?language=en"),
        api("/resources/translations"),
        api("/resources/languages"),
      ]);
      reciters = r.reciters;
      translations = t.translations;
      l.languages.forEach((x) => { langNames[x.iso_code] = String(x.name).toLowerCase(); });
    }
    // Kâri listesi
    const rec = currentReciter();
    $("rd-reciter").replaceChildren(...reciters.map((x) =>
      el("option", { value: x.id, text: x.name + (x.style?.name ? " — " + x.style.name : "") })));
    $("rd-reciter").value = String(reciters.some((x) => x.id === rec) ? rec : DEFAULT_RECITER);
    // Meal listesi: önce seçili dil, sonra diğer diller (gruplu)
    const myLang = langNames[apiLang()];
    const groups = {};
    translations.forEach((t) => { (groups[t.language_name] ||= []).push(t); });
    const order = Object.keys(groups).sort((a, b) => (a === myLang ? -1 : b === myLang ? 1 : a.localeCompare(b)));
    $("rd-meal").replaceChildren(...order.map((g) => el("optgroup", { label: g.charAt(0).toUpperCase() + g.slice(1) },
      ...groups[g].sort((a, b) => a.name.localeCompare(b.name)).map((t) => el("option", { value: t.id, text: t.name })))));
    $("rd-meal").value = String(currentMeal());
  }

  async function openReader(ch, verse = 1, { fromHistory = false } = {}) {
    ch = Math.min(114, Math.max(1, +ch || 1));
    rd.ch = ch; rd.startVerse = Math.max(1, +verse || 1);
    reader.hidden = false;
    document.body.classList.add("reader-open");
    if (!fromHistory) {
      const h = "#sure-" + ch + (rd.startVerse > 1 ? "-" + rd.startVerse : "");
      if (location.hash.startsWith("#sure-")) history.replaceState({ reader: true }, "", h);
      else { history.pushState({ reader: true }, "", h); pushedHash = true; }
    }
    kfHide();
    $("rd-close").focus({ preventScroll: true });
    await loadReader();
  }

  function closeReader({ fromHistory = false } = {}) {
    audio.pause();
    reader.hidden = true;
    document.title = baseTitle;
    document.body.classList.remove("reader-open");
    if (!fromHistory && location.hash.startsWith("#sure-")) {
      if (pushedHash) history.back();
      else history.replaceState(null, "", location.pathname + location.search);
    }
    pushedHash = false;
    const card = grid.querySelector(`[data-ch="${rd.ch}"]`);
    card?.focus({ preventScroll: true });
  }

  async function loadReader() {
    const token = ++rd.loadToken;
    const ch = rd.ch;
    body.replaceChildren(el("div", { class: "q-state", text: T.loading }));
    $("rd-name").textContent = ""; $("rd-sub").textContent = ""; $("rd-arabic").textContent = "";
    try {
      if (!chapters.length) await loadChapters();
      await loadReaderOptions();
      if (token !== rd.loadToken) return;
      const c = chapterById(ch);
      $("rd-name").textContent = c.id + ". " + sName(c);
      $("rd-sub").replaceChildren(
        el("span", { text: c.revelation_place === "makkah" ? T.mecca : T.medina }),
        el("span", { text: " · " + ayetWord(c.verses_count) }));
      $("rd-arabic").textContent = c.name_arabic;
      document.title = sName(c);

      const meal = $("rd-meal").value;
      const d = await api(`/verses/by_chapter/${ch}?language=${apiLang()}&translations=${meal}&fields=text_uthmani&per_page=300`);
      if (token !== rd.loadToken) return;

      const frag = document.createDocumentFragment();
      if (c.bismillah_pre) frag.append(el("div", { class: "rd-bismillah", notr: true, lang: "ar", text: BISMILLAH }));
      d.verses.forEach((v) => {
        const tr = (v.translations || [])[0];
        frag.append(el("article", { class: "rd-verse", id: "v-" + v.verse_key.replace(":", "-"), "data-key": v.verse_key },
          el("div", { class: "rd-vtop" },
            el("span", { class: "rd-vkey", notr: true, text: v.verse_key }),
            el("button", { class: "rd-vplay", type: "button", "aria-label": T.play_from, onclick: () => playFrom(v.verse_key) },
              el("span", { notr: true, text: "▶" }))),
          el("div", { class: "rd-ar", notr: true, lang: "ar", dir: "rtl", text: v.text_uthmani }),
          tr ? el("div", { class: "rd-tr", notr: true }, safeRich(tr.text)) : null));
      });
      body.replaceChildren(frag);
      body.scrollTop = 0;
      if (rd.startVerse > 1) {
        const target = $("v-" + ch + "-" + rd.startVerse);
        if (target) { target.scrollIntoView({ block: "start" }); setActive(ch + ":" + rd.startVerse, false); }
      }
      await prepareAudio(token);
    } catch (e) {
      if (token !== rd.loadToken) return;
      console.warn("Sure yüklenemedi:", e);
      body.replaceChildren(el("div", { class: "q-state" },
        el("div", { text: T.surah_fail }), el("button", { type: "button", text: T.retry, onclick: loadReader })));
    }
  }

  async function prepareAudio(token) {
    const rec = +$("rd-reciter").value;
    if (rd.audioCh === rd.ch && rd.audioRec === rec && audio.src) return;
    audio.pause();
    playBtn.disabled = true; playBtn.classList.remove("playing");
    rd.timings = [];
    try {
      const d = await api(`/chapter_recitations/${rec}/${rd.ch}?segments=true`);
      if (token !== rd.loadToken) return;
      const f = d.audio_file;
      let url = f.audio_url || "";
      if (url && !/^https?:/.test(url)) url = AUDIO_CDN + url.replace(/^\/+/, "");
      audio.src = url;
      audio.preload = "metadata";
      rd.timings = (f.timestamps || []).map((t) => ({ key: t.verse_key, from: t.timestamp_from / 1000, to: t.timestamp_to / 1000 }));
      rd.audioCh = rd.ch; rd.audioRec = rec;
      playBtn.disabled = false;
      updateTime();
    } catch (e) {
      console.warn("Ses yüklenemedi:", e);
      $("rd-verse").textContent = T.audio_fail;
    }
  }

  function playFrom(key) {
    const t = rd.timings.find((x) => x.key === key);
    const go = () => { audio.currentTime = t ? t.from : 0; audio.play().catch(() => {}); };
    if (audio.readyState >= 1) go();
    else { audio.addEventListener("loadedmetadata", go, { once: true }); audio.load(); }
  }

  playBtn.addEventListener("click", () => {
    if (!audio.src) return;
    if (audio.paused) {
      // okuma ekranı bir ayette açıldıysa ilk basışta oradan başla
      if (audio.currentTime === 0 && rd.startVerse > 1) playFrom(rd.ch + ":" + rd.startVerse);
      else audio.play().catch(() => {});
    } else audio.pause();
  });
  audio.addEventListener("play", () => { playBtn.classList.add("playing"); playBtn.setAttribute("aria-label", T.pause); });
  audio.addEventListener("pause", () => { playBtn.classList.remove("playing"); playBtn.setAttribute("aria-label", T.play); });
  audio.addEventListener("ended", () => { playBtn.classList.remove("playing"); });
  audio.addEventListener("error", () => { if (audio.src) $("rd-verse").textContent = T.audio_fail; });

  let seeking = false;
  seek.addEventListener("input", () => {
    seeking = true;
    if (audio.duration) $("rd-time").textContent = fmtTime(seek.value / 1000 * audio.duration) + " / " + fmtTime(audio.duration);
  });
  seek.addEventListener("change", () => {
    if (audio.duration) audio.currentTime = seek.value / 1000 * audio.duration;
    seeking = false;
  });

  function updateTime() {
    const dur = audio.duration || 0;
    if (!seeking) seek.value = dur ? Math.round(audio.currentTime / dur * 1000) : 0;
    $("rd-time").textContent = fmtTime(audio.currentTime) + " / " + fmtTime(dur);
  }
  audio.addEventListener("timeupdate", () => {
    updateTime();
    if (audio.paused && audio.currentTime === 0) return;   // yeni ses yüklenirken seçili ayeti bozma
    const t = audio.currentTime;
    const cur = rd.timings.find((x) => t >= x.from && t < x.to);
    if (cur && cur.key !== rd.activeKey) setActive(cur.key, !audio.paused);
  });
  audio.addEventListener("loadedmetadata", updateTime);

  function setActive(key, scroll) {
    rd.activeKey = key;
    body.querySelectorAll(".rd-verse.active").forEach((n) => n.classList.remove("active"));
    const n = $("v-" + key.replace(":", "-"));
    if (n) {
      n.classList.add("active");
      if (scroll) n.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    $("rd-verse").textContent = key;
  }

  $("rd-reciter").addEventListener("change", async (e) => {
    store.set("q-reciter", +e.target.value);
    const wasPlaying = !audio.paused;
    const key = rd.activeKey;
    rd.audioRec = 0;
    await prepareAudio(rd.loadToken);
    if (wasPlaying && key) playFrom(key);
  });
  $("rd-meal").addEventListener("change", (e) => {
    store.set("q-meal-" + apiLang(), +e.target.value);
    rd.startVerse = rd.activeKey ? +rd.activeKey.split(":")[1] : rd.startVerse;
    const wasPlaying = !audio.paused;
    loadReader().then(() => { if (wasPlaying) audio.play().catch(() => {}); });
  });

  $("rd-close").addEventListener("click", () => closeReader());
  document.addEventListener("keydown", (e) => {
    if (reader.hidden) return;
    if (e.key === "Escape") closeReader();
    if (e.key === " " && e.target === document.body) { e.preventDefault(); playBtn.click(); }
  });

  // Geri tuşu / bağlantı ile açma (#sure-2-255)
  function routeFromHash(fromHistory) {
    const m = location.hash.match(/^#sure-(\d{1,3})(?:-(\d{1,3}))?$/);
    if (m) { kfHide(); openReader(+m[1], +(m[2] || 1), { fromHistory: true }); return; }
    if (!reader.hidden) closeReader({ fromHistory: true });
    if (location.hash === "#kesfet") kfShow(); else kfHide();
  }
  window.addEventListener("popstate", () => routeFromHash(true));

  // =========================================================
  //  KEŞFET: Kur'an'a dayalı sohbet.
  //  Her cevap yalnızca ayetlerden oluşur ve her ayetin altında sure + ayet numarası yazar.
  //  Kaynaksız tek cümle bilgi verilmez; ayet bulunamazsa bunu açıkça söyler.
  // =========================================================
  const kf = $("kesfet"), kfPanel = $("kf-panel"), kfLog = $("kf-log"), kfInput = $("kf-input"), kfSend = $("kf-send");
  const kfHeroPh = $("kf-hero-ph");
  let kfPushed = false, kfTurns = [], kfRender = 0;

  // Başlıklar: ekrandaki ad sitenin dilinde (T), arama İngilizce anahtarla yapılır (daha çok ve isabetli sonuç)
  const KF_TOPICS = [
    ["t_patience", "patience patient"], ["t_prayer", "establish prayer"], ["t_dua", "supplication call upon"],
    ["t_mercy", "mercy merciful"], ["t_repent", "repent repentance"], ["t_grateful", "grateful gratitude thankful"],
    ["t_justice", "justice just"], ["t_friend", "friends allies"], ["t_parents", "parents mother father"],
    ["t_family", "family relatives kin"], ["t_marriage", "marry wives husbands"], ["t_orphan", "orphan orphans"],
    ["t_poor", "poor needy feed"], ["t_paradise", "paradise gardens"], ["t_hell", "hellfire hell"],
    ["t_death", "death die"], ["t_hereafter", "hereafter resurrection"], ["t_provision", "provision provide"],
    ["t_knowledge", "knowledge know"], ["t_trust", "rely trust Allah"], ["t_fasting", "fasting fast"],
    ["t_charity", "charity spend"], ["t_forgive", "forgive forgiveness"], ["t_peace", "peace"],
    ["t_fear", "fear"], ["t_hope", "hope despair"], ["t_love", "love"], ["t_heart", "hearts heart"],
    ["t_truth", "truthful truth"], ["t_lie", "lie liars"], ["t_arrogance", "arrogant arrogance"],
    ["t_prophets", "prophets messengers"], ["t_angels", "angels"], ["t_nature", "rain earth sky"],
    ["t_creation", "created creation"], ["t_trial", "test trial"], ["t_nightday", "night day"],
  ];
  const EN_STOP = new Set(("a an the of to in on at for with about by from into over under is are was were be been being am do does did " +
    "i me my mine we us our you your he him his she her it its they them their what which who whom whose why how when where " +
    "this that these those there here and or but if then so than as not no nor can could should would will shall may might must " +
    "want need tell say said know show give find search look looking related regarding concerning verse verses quran koran surah ayah " +
    "please something anything thing things some any all very just also only more most let lets s t").split(" "));

  // Sık sorulan sorular: konunun en bilinen ayetleri öne alınır, sonra genel arama devam eder.
  // Eşleşme İngilizce çeviri üzerinden yapıldığı için her dilde çalışır.
  const KF_INTENTS = [
    { re: /^\W*(hello|hi|hey|greetings|good (morning|evening|day|night)|welcome|salam|salaam|selam|merhaba|assalam|peace be upon you)\b/, keys: ["6:54", "36:58", "10:10", "33:44"], only: true },
    { re: /(suicid|kill myself|end my life|want to die|(don'?t|do not) want to live|no reason to live|harm myself)/, keys: ["39:53", "4:29", "12:87", "94:5", "94:6", "2:286", "13:28", "93:3"], crisis: true, only: true },
    { re: /(unhappy|\bsad\b|sadness|depress|hopeless|despair|lonely|\balone\b|broken|crying|miserable|tired of)/, keys: ["39:53", "94:5", "94:6", "13:28", "2:286", "12:87", "93:3", "2:186"], only: true },
    { re: /(anxi|worr|afraid|scared|stress|panic)/, keys: ["13:28", "65:3", "9:51", "2:286", "2:155", "2:156"], only: true },
    { re: /(grief|griev|passed away|lost my|death of my)/, keys: ["2:155", "2:156", "2:157", "3:185", "29:57", "94:5"], only: true },
    { re: /(who is (allah|god)|what is (allah|god)|existence of (allah|god)|does (allah|god) exist|is there a god|tell me about (allah|god)|^\W*(allah|god)\W*$)/, keys: ["112:1", "112:2", "112:3", "112:4", "2:255", "59:22", "59:23", "59:24", "57:3", "42:11"] },
    { re: /(where is (allah|god)|is (allah|god) near|(allah|god) hears?|close to (allah|god))/, keys: ["2:186", "50:16", "40:60"] },
    { re: /(forgive me|be forgiven|my sins|forgive my|i (have )?sinned|forgiveness for)/, keys: ["39:53", "4:110", "3:135", "25:70", "7:156"] },
    { re: /(purpose of life|meaning of life|why (were|was|are|am) (we|i|you|humans) created|why do (we|i) exist|why are we here)/, keys: ["51:56", "67:2", "23:115", "3:191"] },
    { re: /(prayer times|times? of (the )?prayers?|how many (times|prayers)|when (to|should i|do we|should we) pray)/, keys: ["4:103", "11:114", "17:78", "2:238", "20:14"] },
    { re: /(prophet muhammad|\bmuhammad\b|messenger of (allah|god))/, keys: ["33:40", "21:107", "68:4", "3:144"] },
  ];
  function intentsFor(textAll) {
    const hay = textAll.toLowerCase();
    return KF_INTENTS.filter((x) => x.re.test(hay));
  }

  // Kullanıcının yazdığını İngilizceye çevir (anlamdan arama için), sonucu sakla
  const enCache = new Map();
  async function toEnglish(text) {
    const k = text.toLowerCase();
    if (enCache.has(k)) return enCache.get(k);
    const url = "https://translate.googleapis.com/translate_a/single?" +
      new URLSearchParams({ client: "gtx", sl: "auto", tl: "en", dt: "t", q: text });
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const d = await res.json();
    const out = d[0].map((seg) => seg[0]).join("").trim();
    enCache.set(k, out);
    return out;
  }
  function keywords(en) {
    const w = en.toLowerCase().replace(/[^a-z\s'-]/g, " ").split(/\s+/).map((x) => x.replace(/^'+|'+$/g, "")).filter(Boolean);
    const kept = w.filter((x) => x.length > 1 && !EN_STOP.has(x));
    return (kept.length ? kept : w).join(" ");
  }
  const hasArabic = (s) => /[؀-ۿ]/.test(s);

  // Mesajdan sure adı / ayet numarası yakala
  // "2:255", "2 255", "Bakara 255", "Bakara suresi 255. ayet" -> ayet; yanlış numarada ne olduğu söylenir
  function parseRef(text) {
    const t = text.trim().replace(/[.!?]+$/, "");
    let m = t.match(/^(\d{1,3})\s*[:.\/,\s-]\s*(\d{1,4})$/), ch, v;
    if (m) { ch = +m[1]; v = +m[2]; }
    else {
      m = t.match(/^(.*\D)\s*[,:.\-]?\s*(\d{1,4})\s*\.?\s*(ayet|ayeti|ayat|verse|ayah|aya|vers)?$/i);
      if (!m) return null;
      const ids = findSurahs(m[1]);
      if (ids.length !== 1) return null;
      ch = ids[0]; v = +m[2];
    }
    if (ch < 1 || ch > 114) return { bad: "sura" };
    const c = chapterById(ch);
    if (v < 1 || v > c.verses_count) return { bad: "ayah", ch };
    return { key: ch + ":" + v };
  }
  function findSurahs(text) {
    const t = norm(text);
    if (t.length < 3 && !/^\d+$/.test(t)) return [];
    const strip = (x) => norm(x).replace(/^(suresi|sure|surah|surat|sura)|(suresi|sure|surah|sura)$/g, "");
    if (/^\d{1,3}$/.test(text.trim())) { const n = +text.trim(); return n >= 1 && n <= 114 ? [n] : []; }
    const q = strip(text);
    if (q.length < 3) return [];
    return chapters.filter((c) => [c._name, c.translated_name?.name, c.name_simple, c.name_arabic]
      .some((n) => n && norm(n).length >= 3 && (norm(n) === q || strip(n) === q))).map((c) => c.id);
  }

  // ---------- arama motoru: birden çok sorguyu birleştir, tekrarları at ----------
  function makeCursor(text, enHint, native = true) {
    return { text, enHint, native, enFull: null, page: 0, buf: [], seen: new Set(), done: false, queries: null };
  }
  async function buildQueries(cur) {
    if (cur.queries) return cur.queries;
    const qs = [];
    // Arapça dahil her yazı İngilizceye çevrilip anlamdan aranır (API'nin Arapça araması hata veriyor)
    let en = cur.enHint;
    if (!en) { try { cur.enFull = cur.enFull || await toEnglish(cur.text); en = keywords(cur.enFull); } catch (e) { en = ""; } }
    if (en) qs.push({ q: en, lang: "en" });
    const L = apiLang();
    if (cur.native && !hasArabic(cur.text) && L !== "en" && L !== "ar") qs.push({ q: cur.text, lang: L });
    if (!qs.length) qs.push({ q: cur.text, lang: "en" });
    cur.queries = qs.map((x) => Object.assign(x, { total: Infinity }));
    return cur.queries;
  }
  async function nextKeys(cur, n = 5) {
    const qs = await buildQueries(cur);
    while (cur.buf.length < n && !cur.done) {
      cur.page++;
      const live = qs.filter((x) => cur.page <= x.total);
      if (!live.length) { cur.done = true; break; }
      const lists = await Promise.all(live.map((x) =>
        api(`/search?q=${encodeURIComponent(x.q)}&size=10&page=${cur.page}&language=${x.lang}`)
          .then((d) => { x.total = d.search.total_pages || 0; return d.search.results || []; })
          .catch(() => { x.total = 0; return []; })));
      const max = Math.max(0, ...lists.map((l) => l.length));
      for (let i = 0; i < max; i++) for (const l of lists) {
        const k = l[i]?.verse_key;
        if (k && !cur.seen.has(k)) { cur.seen.add(k); cur.buf.push(k); }
      }
      if (cur.page > 30) cur.done = true;
    }
    return cur.buf.splice(0, n);
  }

  // ---------- ekrana yazma ----------
  function scrollEnd() { requestAnimationFrame(() => { kfLog.scrollTop = kfLog.scrollHeight; }); }
  function aiRow() {
    const body = el("div", { class: "kf-body" });
    const row = el("div", { class: "kf-msg kf-ai" }, el("div", { class: "kf-av", "aria-hidden": "true", text: "۞" }), body);
    kfLog.append(row); scrollEnd();
    return body;
  }
  function typeText(node, text, animate) {
    if (!animate) { node.textContent = text; return Promise.resolve(); }
    node.classList.add("kf-caret");
    return new Promise((done) => {
      let i = 0; const step = Math.max(1, Math.round(text.length / 40));
      (function tick() {
        i = Math.min(text.length, i + step); node.textContent = text.slice(0, i);
        if (i < text.length) setTimeout(tick, 16); else { node.classList.remove("kf-caret"); done(); }
      })();
    });
  }
  function dots(body) { const d = el("div", { class: "kf-dots" }, el("i"), el("i"), el("i")); body.append(d); scrollEnd(); return d; }
  function ayahCard(v, i) {
    return el("button", { class: "kf-ayah", type: "button", style: "--i:" + i, onclick: () => openReader(v.ch, v.n) },
      el("div", { class: "kf-ref", dir: "auto", text: akRefText(v.ch, v.n) }),
      el("div", { class: "kf-ar", lang: "ar" }, v.ar + " ", el("span", { class: "ak-no", text: v.n.toLocaleString("ar-EG") })),
      apiLang() === "ar" ? null : el("div", { class: "kf-tr", dir: "auto", text: v.meal }));
  }
  function suraCard(id, i) {
    const c = chapterById(id);
    return el("button", { class: "kf-ayah kf-sura", type: "button", style: "--i:" + i, onclick: () => openReader(id, 1) },
      el("div", { class: "kf-ar", lang: "ar", text: c.name_arabic }),
      el("div", { class: "kf-tr", dir: "auto", text: `${id}. ${sName(c)} · ${ayetWord(c.verses_count)}` }));
  }
  async function showVerses(body, keys, tok) {
    const vs = await Promise.all(keys.map((k) => akFetch(k)));
    if (tok !== kfRender) return;
    vs.forEach((v, i) => body.append(ayahCard(v, i)));
    scrollEnd();
  }

  // Bir sohbet adımını çiz (dil değişince hepsi baştan, yeni dilde çizilir)
  async function drawTurn(turn, animate) {
    const tok = kfRender;
    if (turn.role === "me") {
      kfLog.append(el("div", { class: "kf-msg kf-me" }, el("div", { class: "kf-bubble", dir: "auto", text: turn.text })));
      scrollEnd(); return;
    }
    const body = aiRow();
    if (turn.kind === "greet") {
      await typeText(body.appendChild(el("div", { class: "kf-say big" })), T.kf_greet, animate);
      if (tok !== kfRender) return;
      body.append(el("div", { class: "kf-say", text: T.kf_topics }));
      body.append(el("div", { class: "kf-chips" }, ...KF_TOPICS.map(([k, en], i) =>
        el("button", { class: "kf-chip", type: "button", style: "--i:" + i, text: T[k], onclick: () => kfAsk(T[k], en) }))));
      scrollEnd(); return;
    }
    // cevap
    let d = animate ? dots(body) : null;
    try {
      if (!turn.ready) {                       // ilk kez: ne gösterileceğini bul
        turn.pages = []; turn.sura = []; turn.ref = null; turn.bad = null; turn.crisis = false;
        turn.short = norm(turn.text).replace(/[^\p{L}\p{N}]/gu, "").length < 2;
        if (!turn.short) {
          const r = parseRef(turn.text);
          turn.ref = r?.key || null; turn.bad = r?.bad ? r : null;
          if (!r) turn.sura = findSurahs(turn.text);
          if (turn.sura.length === 1 && /^\s*\d+\s*$/.test(turn.text)) { turn.cur = makeCursor(turn.text, null, false); turn.cur.done = true; }
          else if (turn.sura.length === 1) {
            // Sure adı: sureyi göster + adın anlamıyla ilgili ayetler (İnek, Yusuf, Meryem…)
            const en = (await api("/chapters?language=en")).chapters[turn.sura[0] - 1].translated_name.name;
            turn.cur = makeCursor(en, keywords(en), false);
          } else turn.cur = makeCursor(turn.text, turn.en);
          if (!r && !turn.sura.length) {
            let enFull = turn.en || "";
            if (!enFull) { try { enFull = turn.cur.enFull = await toEnglish(turn.text); } catch (e) {} }
            const hits = intentsFor(enFull + " \n " + turn.text);
            turn.crisis = hits.some((h) => h.crisis);
            const pinned = [...new Set(hits.flatMap((h) => h.keys))].slice(0, 10);
            pinned.forEach((k) => turn.cur.seen.add(k));
            if (pinned.length) turn.pages.push(pinned);
            if (hits.length && hits.every((h) => h.only)) turn.cur.done = true;
          }
          // Konu ayetleri bulunduysa ilk cevap yalnız onlar; genel arama "Daha fazla ayet" ile gelir
          if (!r && !turn.cur.done && !turn.pages.length) { const k = await nextKeys(turn.cur); if (k.length) turn.pages.push(k); }
        }
        turn.ready = true;
      }
      if (tok !== kfRender) return;
      d?.remove(); d = null;
      if (turn.short) await typeText(body.appendChild(el("div", { class: "kf-say" })), T.kf_short, animate);
      if (turn.bad) {
        await typeText(body.appendChild(el("div", { class: "kf-say" })), turn.bad.bad === "sura" ? T.kf_bad_sura : T.kf_bad_ayah, animate);
        if (turn.bad.ch) body.append(suraCard(turn.bad.ch, 0));
      }
      if (turn.crisis) body.append(el("div", { class: "kf-help", dir: "auto", text: T.kf_help }));
      if (turn.ref) {
        await typeText(body.appendChild(el("div", { class: "kf-say" })), T.kf_ref, animate);
        await showVerses(body, [turn.ref], tok);
      }
      if (turn.sura.length) {
        await typeText(body.appendChild(el("div", { class: "kf-say" })), T.kf_sura, animate);
        if (tok !== kfRender) return;
        turn.sura.forEach((id, i) => body.append(suraCard(id, i)));
      }
      if (turn.pages.length) {
        await typeText(body.appendChild(el("div", { class: "kf-say" })), T.kf_found, animate);
        for (const keys of turn.pages) { await showVerses(body, keys, tok); if (tok !== kfRender) return; }
        if (!turn.cur.done || turn.cur.buf.length) {
          const more = el("button", { class: "kf-more", type: "button", text: T.kf_more });
          more.addEventListener("click", async () => {
            more.disabled = true;
            try {
              const keys = await nextKeys(turn.cur);
              if (tok !== kfRender) return;
              if (keys.length) { turn.pages.push(keys); const wrap = el("div", { class: "kf-body" }); more.before(wrap); await showVerses(wrap, keys, tok); }
              if (!keys.length || (turn.cur.done && !turn.cur.buf.length)) more.replaceWith(el("div", { class: "kf-say", text: T.kf_end }));
              else more.disabled = false;
            } catch (e) { more.disabled = false; }
          });
          body.append(more);
        }
      } else if (!turn.ref && !turn.sura.length && !turn.short && !turn.bad) {
        await typeText(body.appendChild(el("div", { class: "kf-say" })), T.kf_none, animate);
      }
      scrollEnd();
    } catch (e) {
      console.warn(e);
      d?.remove();
      if (tok !== kfRender) return;
      turn.ready = false;
      body.append(el("div", { class: "kf-say", text: T.kf_fail }),
        el("button", { class: "kf-more", type: "button", text: T.retry, onclick: () => { body.parentNode.remove(); drawTurn(turn, true); } }));
    }
  }

  async function kfAsk(text, enHint) {
    text = String(text || "").trim();
    if (!text) return;
    kfInput.value = ""; kfSend.disabled = true;
    await Promise.all([loadReaderOptions(), loadChapters()]).catch(() => {});
    // yazılan şey bir başlığın adıysa onun İngilizce anahtarını kullan
    if (!enHint) { const hit = KF_TOPICS.find(([k]) => norm(T[k]) === norm(text)); if (hit) enHint = hit[1]; }
    const me = { role: "me", text }, ai = { role: "ai", kind: "answer", text, en: enHint || null };
    kfTurns.push(me, ai);
    drawTurn(me, true);
    drawTurn(ai, true);
  }

  function kfRedraw() {
    kfRender++;
    kfLog.replaceChildren();
    kf.dir = apiLang() === "ar" || /^(fa|ur|he|iw|ps|sd|ug|yi)$/.test(siteLang()) ? "rtl" : "ltr";
    (async () => { const tok = kfRender; for (const t of kfTurns) { if (tok !== kfRender) return; await drawTurn(t, false); } })();
  }

  // ---------- aç / kapat ----------
  function kfShow() {
    if (!kf.hidden) return;
    const r = $("kf-hero").getBoundingClientRect();
    // Çubuğun olduğu yerden aşağı açılır; ekranda en az ~560px sohbet alanı kalacak kadar yukarıda durur
    const H = window.innerHeight, want = Math.min(860, H - 48, Math.max(560, H * 0.7));
    kfPanel.style.setProperty("--top", Math.round(Math.max(16, Math.min(r.top, H - want - 24))) + "px");
    kf.hidden = false;
    document.body.classList.add("kf-open");
    kf.dir = apiLang() === "ar" || /^(fa|ur|he|iw|ps|sd|ug|yi)$/.test(siteLang()) ? "rtl" : "ltr";
    requestAnimationFrame(() => requestAnimationFrame(() => kf.classList.add("open")));
    if (!kfTurns.length) { kfTurns.push({ role: "ai", kind: "greet" }); drawTurn(kfTurns[0], true); }
    setTimeout(() => kfInput.focus({ preventScroll: true }), 60);
  }
  function kfHide() {
    if (kf.hidden) return;
    kf.classList.remove("open");
    document.body.classList.remove("kf-open");
    setTimeout(() => { if (!kf.classList.contains("open")) kf.hidden = true; }, 320);
  }
  function kfOpen() {
    if (location.hash !== "#kesfet") { history.pushState({ kesfet: true }, "", "#kesfet"); kfPushed = true; }
    kfShow();
  }
  function kfClose() {
    if (location.hash === "#kesfet") {
      if (kfPushed) { kfPushed = false; history.back(); return; }
      history.replaceState(null, "", location.pathname + location.search);
    }
    kfHide();
  }
  $("kf-hero").addEventListener("click", kfOpen);
  $("kf-open").addEventListener("click", kfOpen);
  $("kf-close").addEventListener("click", kfClose);
  $("kf-backdrop").addEventListener("click", kfClose);
  $("kf-form").addEventListener("submit", (e) => { e.preventDefault(); kfAsk(kfInput.value); });
  kfInput.addEventListener("input", () => { kfSend.disabled = !kfInput.value.trim(); });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (kf.hidden) kfOpen(); else kfInput.focus(); return; }
    if (e.key === "Escape" && !kf.hidden && reader.hidden) kfClose();
  });

  // Videodaki çubukta dönen yazı: "Ne arıyorsun?" ve başlıklar
  let kfPhI = -1;
  function kfHeroTick() {
    const items = [T.kf_greet, ...KF_TOPICS.map(([k]) => T[k] + "…")];
    kfPhI = (kfPhI + 1) % items.length;
    const txt = kfPhI % 2 === 0 ? T.kf_greet : items[1 + ((kfPhI >> 1) % (items.length - 1))];
    kfHeroPh.classList.add("swap");
    setTimeout(() => { kfHeroPh.textContent = txt; kfHeroPh.classList.remove("swap"); }, 350);
  }
  kfHeroPh.textContent = T.kf_greet;
  setInterval(kfHeroTick, 2800);
  function kfOnLang() { kfHeroPh.textContent = T.kf_greet; kfPhI = -1; if (kfTurns.length) kfRedraw(); }
  if (location.hash === "#kesfet") loadUI().then(kfShow);

  // =========================================================
  //  DİL DEĞİŞİNCE: her şeyi o dilde yeniden çiz
  // =========================================================
  window.addEventListener("sitelang", async () => {
    try {
      await Promise.all([loadUI(), loadChapters()]);
      render();
      if (!reader.hidden) { rd.startVerse = rd.activeKey ? +rd.activeKey.split(":")[1] : rd.startVerse; await loadReader(); }
      if (tab === "kelime" && kwQuery) kwSearch(kwQuery, 1);
      kfOnLang();
    } catch (e) { console.warn(e); }
  });

  // =========================================================
  //  AYET AKIŞI: mezar taşında Kur'an'ın bütün ayetlerinden karışık, her ayet 3 saniye.
  //  Meal ve sure adı sitenin seçili dilinde.
  // =========================================================
  const AK_MS = 3000, AK_FADE = 500;
  const akText = $("ak-text"), akAr = $("ak-ar"), akMeal = $("ak-meal"), akRef = $("ak-ref");
  let akCur = null, akNext = null, akLangTok = 0;

  function plainMeal(html) {
    const doc = new DOMParser().parseFromString("<div>" + (html || "") + "</div>", "text/html");
    doc.querySelectorAll("sup").forEach((n) => n.remove());
    return doc.body.textContent.replace(/\s+/g, " ").trim();
  }
  // 6236 ayetten rastgele biri
  function randomKey() {
    let k = Math.floor(Math.random() * 6236), ch = 1;
    while (k >= chapterById(ch).verses_count) { k -= chapterById(ch).verses_count; ch++; }
    return ch + ":" + (k + 1);
  }
  async function akFetch(key) {
    const v = (await api(`/verses/by_key/${key}?translations=${currentMeal()}&fields=text_uthmani`)).verse;
    return { ch: +key.split(":")[0], n: v.verse_number, ar: v.text_uthmani,
             meal: plainMeal(v.translations && v.translations[0] && v.translations[0].text) };
  }
  function akRefText(ch, n) {
    const name = sName(chapterById(ch)) || String(ch);
    const lang = siteLang();
    if (lang === "tr") return `${name} Suresi, ${n}. Ayet`;
    if (lang === "ar") return `سورة ${name}، الآية ${n.toLocaleString("ar-EG")}`;
    return `${name}, ${T.g_verse} ${n}`;
  }
  // Yazı taşın yüzeyine sığana kadar küçült
  function akFit() {
    const face = akText.parentElement, H = face.clientHeight, W = face.clientWidth;
    if (!H || !W) return;
    let size = Math.min(W * 0.15, H * 0.15);
    akText.style.fontSize = size + "px";
    while ((akText.scrollHeight > H || akText.scrollWidth > W) && size > 5) {
      size *= 0.92;
      akText.style.fontSize = size + "px";
    }
  }
  function akShow(v) {
    akCur = v;
    akAr.replaceChildren(v.ar + " ", el("span", { class: "ak-no", text: v.n.toLocaleString("ar-EG") }));
    akMeal.textContent = v.meal;
    akMeal.hidden = apiLang() === "ar";   // Arapça seçiliyse ayetin kendisi zaten Arapça
    akRef.textContent = akRefText(v.ch, v.n);
    akText.dataset.key = v.ch + ":" + v.n;
    akFit();
  }
  function akPrepare() { akNext = akFetch(randomKey()); akNext.catch(() => {}); }
  async function akTick() {
    try {
      const tok = akLangTok, v = await akNext;
      akPrepare();
      if (tok !== akLangTok) return;
      akText.classList.add("out");
      await new Promise((r) => setTimeout(r, AK_FADE));
      if (tok === akLangTok) akShow(v);
    } catch (e) { akPrepare(); }   // ağ hatası: bu turu atla
    finally { akText.classList.remove("out"); setTimeout(akTick, AK_MS - AK_FADE); }
  }
  // Başlat / dil değişince: gösterilen ayeti yeni dilde yeniden çiz
  async function akLoad() {
    const tok = ++akLangTok;
    try {
      await Promise.all([loadReaderOptions(), loadUI(), loadChapters()]);
      const v = await akFetch(akCur ? akCur.ch + ":" + akCur.n : randomKey());
      if (tok !== akLangTok) return;
      akShow(v);
      akPrepare();
      return true;
    } catch (e) {
      console.warn(e);
      if (tok === akLangTok) setTimeout(akLoad, 5000);
    }
  }
  if ("ResizeObserver" in window) new ResizeObserver(akFit).observe(akText.parentElement);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(akFit);
  window.addEventListener("sitelang", akLoad);
  akLoad().then(() => setTimeout(akTick, AK_MS));

  // ---------- başlat ----------
  loadUI().then(() => { render(); kfHeroPh.textContent = T.kf_greet; });
  routeFromHash(true);
})();
