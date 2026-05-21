document.addEventListener('DOMContentLoaded', function() {

  /* -- STORE ------------------------------------------------------- */
  var STORE = 'qac6';
  var STORE_HIST  = 'qac6_hist';   /* last 5 searches */
  var STORE_ACCS   = 'qac6_accs';   /* offline acciones cache */
  var STORE_STATIC = 'qac6_static'; /* offline LDP+Precios+Config cache */
  var AUTO_REFRESH_MS = 15 * 60 * 1000; /* 15 minutes */
  var lastRefreshTime = 0;
  var MAX_HIST    = 5;
  var MAX_OFFLINE = 30;             /* max PDVs cached for offline */
  var TODAY       = new Date().toDateString();


  var saved = JSON.parse(localStorage.getItem(STORE) || '{}');
  var cfg = {
    pin:        saved.pin        || '1234',
    sheets:     saved.sheets     || ['','','',''],
    activeSheet:saved.activeSheet !== undefined ? saved.activeSheet : 0,
    tab:        saved.tab        || 'Acciones',
    tabPrec:    saved.tabPrec    || 'Precios',
    tabLdp:     saved.tabLdp     || 'LDP',
    tabCfg:     saved.tabCfg     || 'Config',
    tabEtiqSeg: saved.tabEtiqSeg || 'Etiq Segmento',
    tabEtiqPdv: saved.tabEtiqPdv || 'Etiq PDV',
    tabEtiqCcc: saved.tabEtiqCcc || 'Etiq CCC',
    tabDatosPdv: saved.tabDatosPdv || 'Datos PDV',
    whatsapp:    saved.whatsapp    || '',
    muroUrls:    saved.muroUrls    || ['','','',''],
    autorNombre: saved.autorNombre || '',
    modoPTC:       saved.modoPTC       || false,
    markupIdx:     saved.markupIdx     !== undefined ? saved.markupIdx : 0,
    precioUnitario: saved.precioUnitario || false
  };
  /* sheetId computed from active sheet for backward compat */
  Object.defineProperty(cfg, 'sheetId', {
    get: function() { return cfg.sheets[cfg.activeSheet] || ''; },
    enumerable: true
  });
  function getMuroUrl() {
    /* Check in-memory cfg first, then localStorage as fallback */
    var url = (cfg.muroUrls && cfg.muroUrls[cfg.activeSheet]) || '';
    if (!url) {
      try {
        var saved = JSON.parse(localStorage.getItem(STORE) || '{}');
        url = (saved.muroUrls && saved.muroUrls[saved.activeSheet !== undefined ? saved.activeSheet : 0]) || '';
      } catch(e) {}
    }
    return url;
  }

  /* -- CACHE (LDP, Precios, Config - se refresca manualmente) ------ */
  var cache = { ldp: null, precios: null, distri: 1, nombre: '', etiqSeg: {}, etiqPdv: {}, etiqCcc: {}, datosPdv: [], accionesIndex: null };

  /* -- HISTORIAL --------------------------------------------------- */
  function histLoad() {
    try { return JSON.parse(localStorage.getItem(STORE_HIST) || '[]'); } catch(e) { return []; }
  }
  function histSave(codigo) {
    var hist = histLoad();
    /* Remove if already exists, then prepend */
    hist = hist.filter(function(h) { return h !== codigo; });
    hist.unshift(codigo);
    if (hist.length > MAX_HIST) { hist = hist.slice(0, MAX_HIST); }
    localStorage.setItem(STORE_HIST, JSON.stringify(hist));
  }
  function histRender() {
    var hist = histLoad();
    var wrap = document.getElementById('shist');
    if (!wrap) { return; }
    if (hist.length === 0) { wrap.classList.remove('on'); return; }
    var html = '';
    for (var hi = 0; hi < hist.length; hi++) {
      var cod = hist[hi];
      var rs = '';
      if (cache.datosPdv) {
        for (var di = 0; di < cache.datosPdv.length; di++) {
          if (cache.datosPdv[di].pdv === cod) { rs = cache.datosPdv[di].rs; break; }
        }
      }
      html += '<span class="shist-chip" data-cod="' + escHtml(cod) + '">' + escHtml(cod);
      if (rs) { html += ' <span class="shist-chip-rs">' + escHtml(rs) + '</span>'; }
      html += '</span>';
    }
    wrap.innerHTML = html;
    wrap.classList.add('on');
    var chips = wrap.querySelectorAll('.shist-chip');
    for (var ci = 0; ci < chips.length; ci++) {
      chips[ci].addEventListener('click', function() {
        document.getElementById('codinput').value = this.getAttribute('data-cod');
        hidesugg();
        doBuscar(false);
      });
    }
  }

  /* -- OFFLINE CACHE ----------------------------------------------- */
  function offlineSave(codigo, rawAcciones) {
    try {
      var store = JSON.parse(localStorage.getItem(STORE_ACCS) || '{}');
      store[codigo] = { ts: Date.now(), raw: rawAcciones };
      /* Keep only MAX_OFFLINE most recent */
      var keys = Object.keys(store);
      if (keys.length > MAX_OFFLINE) {
        keys.sort(function(a,b) { return store[a].ts - store[b].ts; });
        delete store[keys[0]];
      }
      localStorage.setItem(STORE_ACCS, JSON.stringify(store));
    } catch(e) {}
  }
  function offlineSaveStatic(rawLdp, rawPrec, rawCfg) {
    try {
      localStorage.setItem(STORE_STATIC, JSON.stringify({
        ts: Date.now(), ldp: rawLdp, prec: rawPrec, cfg: rawCfg
      }));
    } catch(e) {}
  }
  function offlineLoadStatic() {
    try {
      var s = localStorage.getItem(STORE_STATIC);
      return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
  }
  function offlineRestoreStatic() {
    var s = offlineLoadStatic();
    if (!s) { return false; }
    try {
      cache.ldp     = parseLDP(s.ldp);
      cache.precios = parsePreciosHoja(s.prec);
      if (s.cfg) { parseConfig(s.cfg); }
      return true;
    } catch(e) { return false; }
  }
  function offlineLoad(codigo) {
    try {
      var store = JSON.parse(localStorage.getItem(STORE_ACCS) || '{}');
      return store[codigo] ? store[codigo] : null;
    } catch(e) { return null; }
  }
  function offlineBadgeShow(ts) {
    var el = document.getElementById('offline-badge');
    if (!el) { return; }
    var d = new Date(ts);
    var hh = ('0'+d.getHours()).slice(-2);
    var mm = ('0'+d.getMinutes()).slice(-2);
    el.textContent = 'Sin conexion - ' + hh + ':' + mm;
    el.style.display = 'inline-block';
  }
  function offlineBadgeHide() {
    var el = document.getElementById('offline-badge');
    if (el) { el.style.display = 'none'; }
  }

  /* -- SEARCH SUGGESTIONS ------------------------------------------ */
  function hidesugg() {
    var s = document.getElementById('ssugg');
    if (s) { s.classList.remove('on'); s.innerHTML = ''; }
    var inp = document.getElementById('codinput');
    if (inp) { inp.classList.remove('sugg-open'); }
  }
  function showSuggestions(q) {
    var s = document.getElementById('ssugg');
    if (!s) { return; }
    if (!q || !cache.datosPdv || cache.datosPdv.length === 0) { hidesugg(); return; }
    var qLow = q.toLowerCase();
    var isNum = /^\d+$/.test(q);
    var matches = [];
    for (var di = 0; di < cache.datosPdv.length && matches.length < 5; di++) {
      var d = cache.datosPdv[di];
      var matchesPdv = isNum ? d.pdv.indexOf(q) === 0 : false;
      var matchesRs  = !isNum ? d.rs.toLowerCase().indexOf(qLow) !== -1 : false;
      if (matchesPdv || matchesRs) { matches.push(d); }
    }
    if (matches.length === 0) { hidesugg(); return; }
    var html = '';
    for (var mi = 0; mi < matches.length; mi++) {
      var m = matches[mi];
      html += '<div class="ssugg-item" data-cod="' + escHtml(m.pdv) + '">';
      html += '<span class="ssugg-cod">' + escHtml(m.pdv) + '</span>';
      html += '<span class="ssugg-rs">' + escHtml(m.rs) + '</span>';
      html += '</div>';
    }
    s.innerHTML = html;
    s.classList.add('on');
    document.getElementById('codinput').classList.add('sugg-open');
    var items = s.querySelectorAll('.ssugg-item');
    for (var ii = 0; ii < items.length; ii++) {
      items[ii].addEventListener('click', function() {
        document.getElementById('codinput').value = this.getAttribute('data-cod');
        hidesugg();
        doBuscar(false);
      });
    }
  }


  /* -- PTR / PTC --------------------------------------------------- */
  var MARKUPS = [30, 35, 40];
  function getMarkup()  { return MARKUPS[cfg.markupIdx] / 100; }
  function getMarkupLabel() { return MARKUPS[cfg.markupIdx] + '%'; }
  function applyPTC(precio) { return precio * (1 + getMarkup()); }

  function savePricingPrefs() {
    localStorage.setItem(STORE, JSON.stringify(cfg));
  }
  function syncPricingBtns() {
    var btnU = document.getElementById('btn-unitario');
    if (btnU) {
      btnU.style.background  = 'var(--azul-m)';
      btnU.style.color       = '#fff';
      btnU.style.borderColor = 'var(--azul-m)';
    }
    var btnModo = document.getElementById('btn-modo');
    var btnMkp  = document.getElementById('btn-markup');
    if (btnModo) {
      btnModo.textContent = cfg.modoPTC ? 'PTC' : 'PTR';
      btnModo.style.background  = 'var(--azul-m)';
      btnModo.style.color       = '#fff';
    }
    if (btnMkp) {
      btnMkp.textContent = getMarkupLabel();
      btnMkp.style.background  = cfg.modoPTC ? 'var(--azul-m)' : 'var(--gris-f)';
      btnMkp.style.color       = cfg.modoPTC ? '#fff' : 'var(--txt-s)';
      btnMkp.style.borderLeft  = cfg.modoPTC ? '1.5px solid rgba(255,255,255,0.35)' : '1.5px solid var(--gris-b)';
    }
  }

  /* -- PALETA DE COLORES ------------------------------------------- */
  var PALETTE = [
    ['#EAF2FF','#D6E8FF','#A8CAEF','#003DA5'],
    ['#FFF4EC','#FFD9BE','#F5C4A0','#B34500'],
    ['#EDFAF3','#C2EDD3','#9AD4B4','#0F5229'],
    ['#F5EEFF','#E8D5F7','#CBA8E8','#4A1275'],
    ['#FFF9E6','#FFE9A0','#F5D060','#7A5500'],
    ['#E6FAF8','#B8EDE8','#7FD4CC','#0A5A55'],
    ['#FDECEA','#F9C4C0','#EF9490','#8B1A17'],
    ['#EAF6FF','#B8DFF7','#7ABDE8','#0A3F6B'],
    ['#F0FDE8','#CCEFB0','#9ED87A','#2D6010'],
    ['#FFF0F8','#F7C8E8','#EE96D0','#7A1855'],
    ['#FFF8F0','#FFD8A8','#F5B070','#7A3A00'],
    ['#F0F8FF','#C8DCEE','#90B8DC','#1A3E5C']
  ];
  var segColorMap = {};
  var colorCounter = 1;

  function getSegPalette(segKey) {
    /* Check color group first - if segment has a group, use that as the key */
    var segCol = (cache.precios && cache.precios._segColor) ? cache.precios._segColor : {};
    var groupKey = segCol[segKey] || segKey;
    /* Only use fixed blue for Core if it has NO color group assigned */
    if (/^core$/.test(segKey.toLowerCase()) && !segCol[segKey]) { return PALETTE[0]; }
    if (segColorMap[groupKey] === undefined) {
      segColorMap[groupKey] = colorCounter % (PALETTE.length - 1) + 1;
      colorCounter++;
    }
    return PALETTE[segColorMap[groupKey]];
  }

  /* -- PIN --------------------------------------------------------- */
  var pids = ['p0','p1','p2','p3'];
  pids.forEach(function(id, i) {
    var el = document.getElementById(id);
    el.addEventListener('input', function() {
      el.value = el.value.replace(/\D/g,'').slice(-1);
      if (el.value && i < 3) { document.getElementById(pids[i+1]).focus(); }
      if (el.value && i === 3) { setTimeout(doLogin, 80); }
    });
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !el.value && i > 0) { document.getElementById(pids[i-1]).focus(); }
      if (e.key === 'Enter') { doLogin(); }
    });
  });

  document.getElementById('btn-entrar').addEventListener('click', doLogin);
  document.getElementById('btn-salir').addEventListener('click', doLogout);
  document.getElementById('btn-buscar').addEventListener('click', function() { doBuscar(false); });
  document.getElementById('codinput').addEventListener('keydown', function(e) { if (e.key === 'Enter') { doBuscar(false); } });
  document.getElementById('codinput').addEventListener('input', function() {
    var q = this.value.trim();
    var hist = document.getElementById('shist');
    if (hist) { hist.classList.toggle('on', q.length === 0 && histLoad().length > 0); }
    if (q.length >= 2) { showSuggestions(q); } else { hidesugg(); }
  });
  document.getElementById('codinput').addEventListener('focus', function() {
    if (!this.value.trim()) { histRender(); }
  });
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.swrap') && !e.target.closest('.shist')) { hidesugg(); }
  });
  document.getElementById('btn-cfg').addEventListener('click', function() { document.getElementById('cfgbody').classList.toggle('open'); });
  document.getElementById('btn-save').addEventListener('click', doSave);
  document.getElementById('btn-save-top').addEventListener('click', doSave);
  document.getElementById('btn-refresh').addEventListener('click', doRefresh);
  document.getElementById('btn-modo').addEventListener('click', function() {
    cfg.modoPTC = !cfg.modoPTC;
    savePricingPrefs();
    syncPricingBtns();
    /* Auto-activar unitario al entrar en PTC */
    if (cfg.modoPTC && !precioUnitario) {
      precioUnitario = true;
      var bu = document.getElementById('btn-unitario');
      if (bu) {
        bu.style.background  = 'var(--azul-m)';
        bu.style.color       = '#fff';
        bu.style.borderColor = 'var(--azul-m)';
        bu.textContent = 'Un';
      }
    }
    refreshTablesInDOM();
  });
  document.getElementById('btn-markup').addEventListener('click', function() {
    cfg.markupIdx = (cfg.markupIdx + 1) % MARKUPS.length;
    savePricingPrefs();
    syncPricingBtns();
    refreshTablesInDOM();
    calcRecalc();
  });
  document.getElementById('btn-tog').addEventListener('click', function() {
    allOpen = !allOpen;
    var blocks = document.querySelectorAll('.segblock');
    for (var b = 0; b < blocks.length; b++) {
      if (allOpen) { blocks[b].classList.add('open'); }
      else { blocks[b].classList.remove('open'); }
    }
    document.getElementById('btn-tog').innerHTML = allOpen ? '&#9650;&#9650;' : '&#9660;&#9660;';
  });

  var allOpen = false;
  var precioUnitario = cfg.precioUnitario || false;

  function doLogin() {
    var val = pids.map(function(id) { return document.getElementById(id).value; }).join('');
    if (val === cfg.pin) {
      document.getElementById('login').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      for (var si = 0; si < 4; si++) {
        var el = document.getElementById('cid' + si);
        if (el) { el.value = cfg.sheets[si] || ''; }
      }
      updateSheetNombres();
      document.getElementById('ctab').value = cfg.tab;
      document.getElementById('ctabprec').value = cfg.tabPrec;
      document.getElementById('ctabldp').value = cfg.tabLdp;
      document.getElementById('ctabcfg').value = cfg.tabCfg;
      document.getElementById('ctabetiqseg').value = cfg.tabEtiqSeg;
      document.getElementById('ctabetiqpdv').value = cfg.tabEtiqPdv;
      document.getElementById('ctabetiqccc').value = cfg.tabEtiqCcc;
      document.getElementById('ctabdatospdv').value = cfg.tabDatosPdv;
      document.getElementById('cpin').value = cfg.pin;
      document.getElementById('cwhatsapp').value = cfg.whatsapp || '';
      for (var mi = 0; mi < 4; mi++) {
        var mEl = document.getElementById('cmuro' + mi);
        if (mEl) { mEl.value = (cfg.muroUrls && cfg.muroUrls[mi]) || ''; }
      }
      var cautorEl = document.getElementById('cautor'); if (cautorEl) { cautorEl.value = cfg.autorNombre || ''; }
      cargarCacheEstaticoSiNecesario();
      syncPricingBtns();
      histRender();
      setTimeout(function() { document.getElementById('codinput').focus(); }, 150);
    } else {
      var err = document.getElementById('lerr');
      err.textContent = 'PIN incorrecto. Intentalo de nuevo.';
      pids.forEach(function(id) { document.getElementById(id).value = ''; });
      document.getElementById('p0').focus();
      setTimeout(function() { err.textContent = ''; }, 3000);
    }
  }

  document.getElementById('btn-muro').addEventListener('click', function() {
    var pdv = document.getElementById('codinput').value.trim();
    var rrs = document.getElementById('rrs').textContent;
    muroAbrir(pdv, rrs);
  });
  document.getElementById('btn-muro-cerrar').addEventListener('click', muroCerrar);
  document.getElementById('muro-overlay').addEventListener('click', muroCerrar);
  document.getElementById('muro-handle').addEventListener('click', muroCerrar);
  /* Swipe down to close */
  var muroTouchY = 0;
  document.getElementById('muro-sheet').addEventListener('touchstart', function(e) {
    muroTouchY = e.touches[0].clientY;
  }, { passive: true });
  document.getElementById('muro-sheet').addEventListener('touchend', function(e) {
    if (e.changedTouches[0].clientY - muroTouchY > 60) { muroCerrar(); }
  }, { passive: true });
  document.getElementById('btn-muro-enviar').addEventListener('click', muroEnviar);
  document.getElementById('muro-texto').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { muroEnviar(); }
  });
  document.getElementById('btn-gps').addEventListener('click', nearbyAbrir);
  document.getElementById('btn-nearby-cerrar').addEventListener('click', nearbyCerrar);
  document.getElementById('nearby-overlay').addEventListener('click', nearbyCerrar);

  /* Auto-refresh: on visibility change (user returns to tab/app) */
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') { autoRefreshIfNeeded(); }
  });
  /* Auto-refresh: interval check every 15 min while app is open */
  setInterval(autoRefreshIfNeeded, AUTO_REFRESH_MS);

  function doLogout() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('login').style.display = 'flex';
    pids.forEach(function(id) { document.getElementById(id).value = ''; });
    resetUI();
    document.getElementById('codinput').value = '';
    setTimeout(function() { document.getElementById('p0').focus(); }, 100);
  }

  function doSave() {
    for (var si = 0; si < 4; si++) {
      var el = document.getElementById('cid' + si);
      if (el) { cfg.sheets[si] = el.value.trim(); }
    }
    var tab  = document.getElementById('ctab').value.trim();
    var tabp = document.getElementById('ctabprec').value.trim();
    var tabl = document.getElementById('ctabldp').value.trim();
    var tabc    = document.getElementById('ctabcfg').value.trim();
    var tabes   = document.getElementById('ctabetiqseg').value.trim();
    var tabep   = document.getElementById('ctabetiqpdv').value.trim();
    var pin  = document.getElementById('cpin').value.trim();
    if (tab)  { cfg.tab = tab; }
    if (tabp) { cfg.tabPrec = tabp; }
    if (tabl) { cfg.tabLdp = tabl; }
    if (tabc)  { cfg.tabCfg = tabc; }
    if (tabes) { cfg.tabEtiqSeg = tabes; }
    if (tabep) { cfg.tabEtiqPdv = tabep; }
    var tabec = document.getElementById('ctabetiqccc').value.trim();
    if (tabec) { cfg.tabEtiqCcc = tabec; }
    var tabdp = document.getElementById('ctabdatospdv').value.trim();
    if (tabdp) { cfg.tabDatosPdv = tabdp; }
    if (pin.length === 4) { cfg.pin = pin; }
    var wa = document.getElementById('cwhatsapp').value.trim().replace(/[^0-9]/g,'');
    if (wa) { cfg.whatsapp = wa; }
    var newMuroUrls = ['','','',''];
    for (var msi = 0; msi < 4; msi++) {
      var msEl = document.getElementById('cmuro' + msi);
      if (msEl) { newMuroUrls[msi] = msEl.value.trim(); }
    }
    cfg.muroUrls = newMuroUrls;
    var cautorEl2 = document.getElementById('cautor');
    if (cautorEl2) { cfg.autorNombre = cautorEl2.value.trim(); }
    localStorage.setItem(STORE, JSON.stringify(cfg));
    cache.ldp = null; cache.precios = null; cache.accionesIndex = null;
    cache.etiqSeg = {}; cache.etiqPdv = {}; cache.etiqCcc = {}; cache.datosPdv = [];
    document.getElementById('cfgbody').classList.remove('open');
    updateSheetNombres();
    setCfgStatus('Guardado', 'ok');
  }

  function setCfgStatus(msg, type) {
    var el = document.getElementById('cfg-status');
    el.textContent = msg;
    el.className = 'cfg-status ' + (type || '');
    setTimeout(function() { el.textContent = ''; el.className = 'cfg-status'; }, 3000);
  }

  /* -- CACHE ESTATICO (LDP + Precios + Config) --------------------- */
  var sheetNombres = ['','','',''];

  function updateSheetNombres() {
    for (var si = 0; si < 4; si++) {
      (function(idx) {
        var sid = cfg.sheets[idx];
        var el = document.getElementById('cid' + idx);
        var lblEl = document.getElementById('snombre' + idx);
        var dot = document.getElementById('sdot' + idx);
        if (!sid) {
          if (lblEl) { lblEl.textContent = '-'; }
          if (dot) { dot.classList.remove('on'); }
          sheetNombres[idx] = '';
          renderDistriDropdown();
          return;
        }
        var url = 'https://docs.google.com/spreadsheets/d/' + sid + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(cfg.tabCfg);
        fetch(url, { cache: 'no-store' }).then(function(res) { return res.text(); }).then(function(txt) {
          if (txt.trim().charAt(0) === '<') { throw new Error(''); }
          var rows = parseCSV(txt);
          var nombre = '';
          for (var r = 0; r < rows.length; r++) {
            var v = (rows[r][0] || '').trim();
            if (v && !/nombre|distri|intern/i.test(v)) { nombre = v; break; }
          }
          sheetNombres[idx] = nombre || ('Distri ' + (idx + 1));
          if (lblEl) { lblEl.textContent = sheetNombres[idx]; }
          if (dot) { dot.classList.toggle('on', idx === cfg.activeSheet); }
          renderDistriDropdown();
        }).catch(function() {
          sheetNombres[idx] = 'Sheet ' + (idx + 1);
          if (lblEl) { lblEl.textContent = sheetNombres[idx]; }
          renderDistriDropdown();
        });
      })(si);
    }
  }

  function renderDistriDropdown() {
    var dd = document.getElementById('distri-dropdown');
    if (!dd) { return; }
    var html = '';
    for (var i = 0; i < 4; i++) {
      if (!cfg.sheets[i]) { continue; }
      var nombre = sheetNombres[i] || ('Sheet ' + (i + 1));
      var isCurrent = i === cfg.activeSheet;
      html += '<div class="distri-option' + (isCurrent ? ' active' : '') + '" data-idx="' + i + '">';
      html += '<span class="dot"></span>' + escHtml(nombre) + '</div>';
    }
    dd.innerHTML = html;
    var opts = dd.querySelectorAll('.distri-option');
    for (var o = 0; o < opts.length; o++) {
      opts[o].addEventListener('click', function() {
        switchDistri(parseInt(this.getAttribute('data-idx')));
      });
    }
  }

  function switchDistri(idx) {
    cfg.activeSheet = idx;
    localStorage.setItem(STORE, JSON.stringify(cfg));
    var nd = document.getElementById('tdistri');
    if (nd) { nd.textContent = sheetNombres[idx] || 'Acciones Comerciales'; }
    for (var i = 0; i < 4; i++) {
      var dot = document.getElementById('sdot' + i);
      if (dot) { dot.classList.toggle('on', i === idx); }
    }
    document.getElementById('distri-dropdown').classList.remove('on');
    var chev = document.getElementById('tname-chevron');
    if (chev) { chev.innerHTML = '&#9660;'; }
    cache.ldp = null; cache.precios = null; cache.accionesIndex = null;
    cache.etiqSeg = {}; cache.etiqPdv = {}; cache.etiqCcc = {}; cache.datosPdv = [];
    resetUI();
    document.getElementById('codinput').value = '';
    cargarCacheEstaticoSiNecesario();
  }

  function cargarCacheEstaticoSiNecesario() {
    if (cache.ldp && cache.precios && Object.keys(cache.ldp).length > 0) { return Promise.resolve(); }
    return cargarCacheEstatico();
  }

  function cargarCacheEstatico() {
    return Promise.all([
      fetchSheet(cfg.tabLdp),
      fetchSheet(cfg.tabPrec),
      fetchSheet(cfg.tabCfg).catch(function() { return null; }),
      fetchSheetSafe(cfg.tabEtiqSeg),
      fetchSheetSafe(cfg.tabEtiqPdv),
      fetchSheetSafe(cfg.tabDatosPdv),
      fetchSheetSafe(cfg.tabEtiqCcc),
      fetchSheet(cfg.tab).catch(function() { return null; })
    ]).then(function(results) {
      cache.ldp     = parseLDP(results[0]);
      cache.precios = parsePreciosHoja(results[1]);
      if (results[2]) { parseConfig(results[2]); }
      /* Save raw CSVs for offline use */
      offlineSaveStatic(results[0], results[1], results[2] || '');
      lastRefreshTime = Date.now();
      cache.etiqSeg  = results[3] ? parseEtiqSegmento(results[3]) : {};
      cache.etiqPdv  = results[4] ? parseEtiqPdv(results[4]) : {};
      cache.datosPdv      = results[5] ? parseDatosPdv(results[5]) : [];
      cache.etiqCcc  = results[6] ? parseEtiqPdv(results[6]) : {};
      cache.accionesIndex = results[7] ? buildAccionesIndex(results[7]) : null;
      var nd = document.getElementById('tdistri');
      if (cache.nombre) {
        nd.textContent = cache.nombre;
        sheetNombres[cfg.activeSheet] = cache.nombre;
        renderDistriDropdown();
      } else { nd.textContent = 'Acciones Comerciales'; }
    }).catch(function(e) {
      /* Mantener null para que el proximo buscar reintente */
      cache.ldp = null; cache.precios = null;
    });
  }

  function autoRefreshIfNeeded() {
    /* Skip if not logged in, no sheetId, or refreshed recently */
    if (!cfg.sheetId) { return; }
    if (document.getElementById('app').style.display === 'none') { return; }
    var elapsed = Date.now() - lastRefreshTime;
    if (lastRefreshTime > 0 && elapsed < AUTO_REFRESH_MS) { return; }
    /* Silent refresh - no spinner, no alert */
    cache.ldp = null; cache.precios = null;
    cargarCacheEstatico().then(function() {
      var cod = document.getElementById('codinput').value.trim();
      if (cod && document.getElementById('reshdr').classList.contains('on')) {
        doBuscar(true);
      }
    }).catch(function() { /* silent fail - offline cache still works */ });
  }

  /* -- MURO ------------------------------------------------------- */
  var muroCurrentPdv = '';

  function muroCerrar() {
    var ms = document.getElementById('muro-sheet');
    ms.classList.remove('open');
    document.getElementById('muro-overlay').classList.remove('on');
    setTimeout(function() { ms.classList.remove('on'); }, 320);
  }

  function muroAbrir(pdv, rs) {
    if (!getMuroUrl()) { return; }
    muroCurrentPdv = pdv;
    var title = document.querySelector('.muro-title');
    if (title) { title.textContent = '\u00a0\u00a0Muro - ' + pdv + ' ' + (rs || ''); }
    var list = document.getElementById('muro-list');
    list.innerHTML = '<div class="muro-empty">Cargando...</div>';
    document.getElementById('muro-texto').value = '';
    var ms = document.getElementById('muro-sheet');
    ms.classList.add('on');
    setTimeout(function() { ms.classList.add('open'); }, 10);
    document.getElementById('muro-overlay').classList.add('on');
    /* Fetch comments via fetch with CORS */
    fetch(getMuroUrl() + '?pdv=' + encodeURIComponent(pdv), {
      method: 'GET', mode: 'cors', redirect: 'follow'
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.ok || !data.data || data.data.length === 0) {
        list.innerHTML = '<div class="muro-empty">Sin comentarios todav\u00eda.</div>';
        return;
      }
      var html = '';
      for (var i = 0; i < data.data.length; i++) {
        var item = data.data[i];
        html += '<div class="muro-comment">';
        html += '<div class="muro-comment-text">' + escHtml(item.texto) + '</div>';
        html += '<div class="muro-comment-meta">';
        if (item.autor) { html += escHtml(item.autor) + ' &middot; '; }
        html += escHtml(item.fecha) + '</div>';
        html += '</div>';
      }
      list.innerHTML = html;
    })
    .catch(function() {
      list.innerHTML = '<div class="muro-empty">Error al cargar comentarios.</div>';
    });
  }

  function muroEnviar() {
    var texto = document.getElementById('muro-texto').value.trim();
    if (!texto || !muroCurrentPdv || !getMuroUrl()) { return; }
    if (!cfg.autorNombre) {
      var nombre = (prompt('Como te llamas? (se guarda para futuros comentarios)') || '').trim();
      if (!nombre) { return; }
      cfg.autorNombre = nombre;
      localStorage.setItem(STORE, JSON.stringify(cfg));
      var cautorEl3 = document.getElementById('cautor'); if (cautorEl3) { cautorEl3.value = nombre; }
    }
    var btn = document.getElementById('btn-muro-enviar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    var autor = cfg.autorNombre || '';
    fetch(getMuroUrl(), {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ pdv: muroCurrentPdv, texto: texto, autor: autor }),
      headers: { 'Content-Type': 'text/plain' }
    })
    .then(function() {
      /* no-cors means we can't read response - assume ok */
      btn.disabled = false;
      btn.textContent = 'Guardar comentario';
      document.getElementById('muro-texto').value = '';
      var datoCliente = null;
      for (var dp = 0; dp < cache.datosPdv.length; dp++) {
        if (cache.datosPdv[dp].pdv === muroCurrentPdv) { datoCliente = cache.datosPdv[dp]; break; }
      }
      /* Brief delay so Sheet has time to write */
      setTimeout(function() {
        muroAbrir(muroCurrentPdv, datoCliente ? datoCliente.rs : '');
      }, 1500);
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = 'Guardar comentario';
      alert('Error de conexi\u00f3n al guardar.');
    });
  }

  /* -- HAVERSINE DISTANCE (meters) -------------------------------- */
  function haversine(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function formatDist(m) {
    if (m < 1000) { return Math.round(m) + ' m'; }
    return (m / 1000).toFixed(1) + ' km';
  }

  function nearbyCerrar() {
    document.getElementById('nearby-sheet').classList.remove('on');
    document.getElementById('nearby-overlay').classList.remove('on');
  }

  function nearbyAbrir() {
    var datos = cache.datosPdv || [];
    /* Check if any PDV has coordinates */
    var hasCoords = false;
    for (var i = 0; i < datos.length; i++) {
      if (datos[i].lat && datos[i].lng) { hasCoords = true; break; }
    }
    if (!hasCoords) {
      document.getElementById('nearby-list').innerHTML = '<div style="padding:24px 16px;text-align:center;color:var(--txt-s);font-size:13px">No hay coordenadas cargadas.<br>Agrega columnas <b>Latitud</b> y <b>Longitud</b> a la hoja Datos PDV.</div>';
      document.getElementById('nearby-sheet').classList.add('on');
      document.getElementById('nearby-overlay').classList.add('on');
      btn.classList.remove('loading'); btn.innerHTML = '&#128207;';
      return;
    }
    var btn = document.getElementById('btn-gps');
    btn.classList.add('loading');
    btn.innerHTML = '&#8987;';
    if (!navigator.geolocation) {
      btn.classList.remove('loading'); btn.innerHTML = '&#128207;';
      alert('Tu dispositivo no soporta GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
      btn.classList.remove('loading'); btn.innerHTML = '&#128207;';
      var myLat = pos.coords.latitude;
      var myLng = pos.coords.longitude;
      /* Calculate distances and sort */
      var withDist = [];
      for (var di = 0; di < datos.length; di++) {
        var d = datos[di];
        if (!d.lat || !d.lng) { continue; }
        var dist = haversine(myLat, myLng, d.lat, d.lng);
        withDist.push({ d: d, dist: dist });
      }
      withDist.sort(function(a, b) { return a.dist - b.dist; });
      var top = withDist.slice(0, 10);
      if (top.length === 0) {
        alert('No se encontraron PDVs con coordenadas.');
        return;
      }
      /* Render list */
      var etiqSegN = cache.etiqSeg || {};
      var etiqPdvN = cache.etiqPdv || {};
      var etiqCccN = cache.etiqCcc || {};
      var html = '';
      for (var ni = 0; ni < top.length; ni++) {
        var item = top[ni];
        var d = item.d;
        var mapsHref = d.lat ? 'https://www.google.com/maps/dir/?api=1&destination=' + d.lat + ',' + d.lng : '';
        /* Build etiquetas */
        var eHtml = '';
        var peN = etiqPdvN[d.pdv] || [];
        for (var pni = 0; pni < peN.length; pni++) {
          eHtml += '<span class="etiq-pdv" style="font-size:10px;padding:2px 7px">' + escHtml(peN[pni]) + '</span>';
        }
        var segsN = (cache.accionesIndex && cache.accionesIndex[d.pdv]) ? cache.accionesIndex[d.pdv] : [];
        var seenN = {};
        for (var sni = 0; sni < segsN.length; sni++) {
          var evN = etiqSegN[segsN[sni]];
          if (evN && !seenN[evN]) { seenN[evN] = true; eHtml += '<span class="etiq-seg" style="font-size:10px;padding:2px 7px">' + escHtml(evN) + '</span>'; }
        }
        var cccN = etiqCccN[d.pdv] || [];
        for (var cni = 0; cni < cccN.length; cni++) {
          eHtml += '<span class="etiq-ccc" style="font-size:10px;padding:2px 7px">' + escHtml(cccN[cni]) + '</span>';
        }
        html += '<div class="nearby-item" data-pdv="' + escHtml(d.pdv) + '">';
        html += '<div class="nearby-dist">' + formatDist(item.dist) + '</div>';
        html += '<div class="nearby-info">';
        /* Row 1: code + RS + canal */
        html += '<div class="nearby-row1">';
        html += '<span class="nearby-rs">' + escHtml(d.pdv) + ' - ' + escHtml(d.rs) + '</span>';
        if (d.canal) { html += '<span class="nearby-canal">' + escHtml(d.canal) + '</span>'; }
        html += '</div>';
        /* Domicilio */
        if (d.dom) { html += '<div class="nearby-dom">&#128205; ' + escHtml(d.dom) + (d.loc ? ' &middot; ' + escHtml(d.loc) : '') + '</div>'; }
        /* Vendedor / Supervisor */
        var vendLine = '';
        if (d.vend) { vendLine += d.vend; }
        if (d.sup)  { vendLine += (vendLine ? ' &middot; ' : '') + d.sup; }
        if (vendLine) { html += '<div class="nearby-vend">&#128100; ' + vendLine + '</div>'; }
        /* Etiquetas */
        if (eHtml) { html += '<div class="nearby-etiqs">' + eHtml + '</div>'; }
        /* Action buttons */
        html += '<div class="nearby-actions">';
        if (mapsHref) { html += '<a href="' + mapsHref + '" target="_blank" class="nearby-maps" onclick="event.stopPropagation()">&#128205; Maps</a>'; }
        html += '<button class="nearby-buscar" data-pdv="' + escHtml(d.pdv) + '" onclick="event.stopPropagation()">&#128269; Acciones</button>';
        html += '</div>';
        html += '</div></div>';
      }
      document.getElementById('nearby-list').innerHTML = html;
      document.getElementById('nearby-sheet').classList.add('on');
      document.getElementById('nearby-overlay').classList.add('on');
      /* Click on item -> search that PDV */
      document.getElementById('nearby-list').addEventListener('click', function(e) {
        /* Buscar button */
        var buscarBtn = e.target.closest('.nearby-buscar');
        if (buscarBtn) {
          var pdv = buscarBtn.getAttribute('data-pdv');
          nearbyCerrar();
          document.getElementById('codinput').value = pdv;
          doBuscar(false);
          return;
        }
        /* Click on card (not maps/buscar) -> also search */
        var item = e.target.closest('.nearby-item');
        if (item && !e.target.closest('.nearby-maps') && !e.target.closest('.nearby-buscar')) {
          var pdv2 = item.getAttribute('data-pdv');
          nearbyCerrar();
          document.getElementById('codinput').value = pdv2;
          doBuscar(false);
        }
      });
    }, function() {
      btn.classList.remove('loading'); btn.innerHTML = '&#128207;';
      alert('No se pudo obtener tu ubicacion. Verifica que el GPS este habilitado.');
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  function doRefresh() {
    var btn = document.getElementById('btn-refresh');
    btn.classList.add('spinning');
    btn.disabled = true;
    cache.ldp = null; cache.precios = null; cache.accionesIndex = null;
    cache.etiqSeg = {}; cache.etiqPdv = {}; cache.etiqCcc = {}; cache.datosPdv = [];
    cargarCacheEstatico().then(function() {
      btn.classList.remove('spinning');
      btn.disabled = false;
      setCfgStatus('Precios actualizados', 'ok');
      var cod = document.getElementById('codinput').value.trim();
      if (cod && document.getElementById('reshdr').classList.contains('on')) { doBuscar(true); }
    }).catch(function() {
      btn.classList.remove('spinning');
      btn.disabled = false;
      setCfgStatus('Error al actualizar', 'err');
    });
  }

  /* -- FETCH ------------------------------------------------------- */
  function fetchSheet(tabName) {
    var url = 'https://docs.google.com/spreadsheets/d/' + cfg.sheetId +
              '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(tabName);
    return fetch(url, { cache: 'no-store' }).then(function(res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      /* Force UTF-8 decode to avoid browser misinterpreting charset */
      return res.arrayBuffer();
    }).then(function(buf) {
      var txt = new TextDecoder('utf-8').decode(buf);
      if (txt.trim().charAt(0) === '<') { throw new Error('Sheet no publico o ID incorrecto.'); }
      return txt;
    });
  }

  /* fetchSheetSafe: verifica via JSON que la hoja exista antes de fetchear CSV.
     Si la hoja no existe devuelve null en lugar de tirar error o devolver datos incorrectos. */
  function fetchSheetSafe(tabName) {
    /* Always try CSV directly - if sheet doesn't exist Google returns HTML which parseCSV rejects */
    return fetchSheet(tabName).then(function(txt) {
      /* Extra safety: if response looks like wrong sheet data, return it anyway - parsers validate */
      return txt;
    }).catch(function() { return null; });
  }

  function parseCSV(txt) {
    /* Handles quoted fields with embedded newlines and commas */
    var rows = []; var cols = []; var cur = ''; var inQ = false;
    var s = txt.trim();
    for (var ci = 0; ci < s.length; ci++) {
      var ch = s[ci];
      if (ch === '"') {
        /* Check for escaped quote "" */
        if (inQ && s[ci+1] === '"') { cur += '"'; ci++; }
        else { inQ = !inQ; }
      } else if (ch === ',' && !inQ) {
        cols.push(cur.trim()); cur = '';
      } else if ((ch === '\n' || (ch === '\r' && s[ci+1] === '\n')) && !inQ) {
        if (ch === '\r') { ci++; } /* skip \r in \r\n */
        cols.push(cur.trim()); rows.push(cols);
        cols = []; cur = '';
      } else {
        if (!(ch === '\r')) { cur += ch; } /* skip bare \r */
      }
    }
    /* Last field and row */
    cols.push(cur.trim());
    if (cols.some(function(x) { return x !== ''; })) { rows.push(cols); }
    return rows;
  }

  /* -- PARSE CONFIG ------------------------------------------------ */
  /* Config sheet: col A = Nombre distri, col B = Internos (1 = descuento aplica a internos, 2 = no aplica)
     Fila 1: encabezados (se ignoran). Fila 2: datos del distribuidor. */
  function parseConfig(txt) {
    var rows = parseCSV(txt);
    /* Buscar primera fila con datos reales (saltar encabezado) */
    for (var i = 0; i < rows.length; i++) {
      var nombre = (rows[i][0] || '').trim();
      var tipo   = (rows[i][1] || '').trim();
      /* Saltar si parece encabezado */
      if (/nombre|distri|intern/i.test(nombre)) { continue; }
      if (nombre) { cache.nombre = nombre; }
      if (tipo === '2') { cache.distri = 2; } else { cache.distri = 1; }
      break;
    }
  }

  /* -- PARSE LDP --------------------------------------------------- */
  /* LDP sheet: SKU | Detalle | Neto | Internos */
  /* Etiq Segmento: col A = Segmento (exact match), col B = Etiqueta */
  function parseEtiqSegmento(txt) {
    if (!txt || txt.trim().charAt(0) === '<') { return {}; }
    var rows = parseCSV(txt);
    if (rows.length < 1) { return {}; }
    /* Strict header check: first row must have exactly 2 non-empty cols
       and must NOT look like Acciones/Precios/LDP headers */
    var hdr0 = (rows[0][0] || '').trim().toLowerCase();
    var hdr1 = (rows[0][1] || '').trim().toLowerCase();
    /* Reject if looks like known sheet headers */
    if (/^pdv$|^negocio$|^sku$|^neto$/.test(hdr0)) { return {}; }
    /* Reject if too many columns (Acciones has many) */
    var nonEmpty = 0;
    for (var h = 0; h < rows[0].length; h++) { if ((rows[0][h] || '').trim()) { nonEmpty++; } }
    if (nonEmpty > 3) { return {}; }
    var result = {};
    for (var r = 0; r < rows.length; r++) {
      var seg  = (rows[r][0] || '').trim();
      var etiq = (rows[r][1] || '').trim();
      if (!seg || !etiq) { continue; }
      if (/^segmento|^etiqueta/i.test(seg)) { continue; }
      if (/^\d+$/.test(seg)) { continue; }
      result[seg.toLowerCase()] = etiq;
    }
    return result;
  }

  /* Etiq PDV: multiple listado blocks side by side separated by empty cols
     Format: PDV | Etiq | (empty) | PDV | Etiq | (empty) | PDV | Etiq ...
     Detects all blocks automatically and merges into one PDV->etiquetas map */
  function parseEtiqPdv(txt) {
    if (!txt || txt.trim().charAt(0) === '<') { return {}; }
    var rows = parseCSV(txt);
    if (rows.length < 1) { return {}; }
    var hdr = rows[0];
    /* Reject if too many columns - Acciones/Precios/LDP have many more than 2 per block */
    var nonEmpty = 0;
    for (var hi3 = 0; hi3 < hdr.length; hi3++) { if ((hdr[hi3] || '').trim()) { nonEmpty++; } }
    /* Each block is PDV+Etiq = 2 cols, separated by empty. Max ~10 blocks = 20 non-empty cols.
       Acciones has 15+ non-etiq cols so reject if avg cols per block > 3 */
    /* Simpler rule: reject if any non-empty col header doesnt match pdv/etiq/label/tag/empty pattern */
    var blocks = [];
    var hi2 = 0;
    while (hi2 < hdr.length) {
      var hv = (hdr[hi2] || '').trim().toLowerCase();
      if (/^pdv$|^cod/.test(hv) && hi2 + 1 < hdr.length) {
        var nextHv = (hdr[hi2+1] || '').trim().toLowerCase();
        /* Next column must look like an etiqueta column, not a segment name */
        if (nextHv && /etiq|label|tag|etiqueta/.test(nextHv)) {
          blocks.push({ pdv: hi2, etiq: hi2 + 1 });
          hi2 += 2;
        } else {
          hi2++;
        }
      } else {
        hi2++;
      }
    }
    /* Fallback: if no labeled blocks found, check if it's a simple 2-col sheet */
    if (blocks.length === 0) {
      if (nonEmpty > 4) { return {}; } /* too many cols for a simple etiq sheet */
      var firstDataOk = false;
      for (var fi = 0; fi < Math.min(rows.length, 5); fi++) {
        var fv = (rows[fi][0] || '').toString().trim().replace(/\.0+$/, '');
        if (!fv || /pdv|cliente|etiq/i.test(fv)) { continue; }
        firstDataOk = /^\d+$/.test(fv); break;
      }
      if (!firstDataOk) { return {}; }
      blocks.push({ pdv: 0, etiq: 1 });
    }
    var result = {};
    for (var r = 1; r < rows.length; r++) {
      for (var bi = 0; bi < blocks.length; bi++) {
        var pdv = (rows[r][blocks[bi].pdv] || '').toString().trim().replace(/\.0+$/, '');
        var etiq = (rows[r][blocks[bi].etiq] || '').trim();
        if (!pdv || !/^\d+$/.test(pdv) || !etiq) { continue; }
        if (!result[pdv]) { result[pdv] = []; }
        if (result[pdv].indexOf(etiq) === -1) { result[pdv].push(etiq); }
      }
    }
    return result;
  }

  /* Acciones index: PDV -> array of segment labels for etiq matching in planificador */
  function buildAccionesIndex(txt) {
    var rows = parseCSV(txt);
    if (rows.length < 2) { return null; }
    var headers = rows[0];
    var iCod = 0;
    for (var i = 0; i < headers.length; i++) {
      if (/^pdv$|^cod|^c.digo/.test((headers[i] || '').toLowerCase().trim())) { iCod = i; break; }
    }
    var segCols = [];
    for (var j = 0; j < headers.length; j++) {
      if (j !== iCod && (headers[j] || '').trim()) {
        segCols.push({ i: j, label: headers[j].trim() });
      }
    }
    var VACIAS2 = ['', '-', 'n/a', 'na', 'sin accion'];
    var index = {};
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var pdv = (row[iCod] || '').toString().trim().replace(/\.0+$/, '');
      if (!pdv) { continue; }
      var segs = [];
      for (var k = 0; k < segCols.length; k++) {
        var val = (row[segCols[k].i] || '').trim();
        if (VACIAS2.indexOf(val.toLowerCase()) === -1) {
          segs.push(segCols[k].label.toLowerCase());
        }
      }
      if (segs.length > 0) { index[pdv] = segs; }
    }
    return index;
  }

  /* Datos PDV: PDV | Razon social | Domicilio | Supervisor | Vendedor | Frecuencia */
  function parseDatosPdv(txt) {
    if (!txt || txt.trim().charAt(0) === '<') { return []; }
    var rows = parseCSV(txt);
    if (rows.length < 2) { return []; }
    var hdr = rows[0].map(function(h) { return (h || '').toLowerCase().trim(); });
    /* Detect columns */
    var iPdv = 0; var iRs = 1; var iCanal = -1; var iDom = 2; var iLoc = -1; var iSup = 3; var iVend = 4; var iFrec = 5; var iLat = -1; var iLng = -1;
    for (var hi = 0; hi < hdr.length; hi++) {
      if (/^pdv$|^cod|^c.digo/.test(hdr[hi]))             { iPdv  = hi; }
      if (/razon|social|nombre/.test(hdr[hi]))             { iRs   = hi; }
      if (/^canal$/.test(hdr[hi]))                          { iCanal = hi; }
      if (/domicilio|direcci|address/.test(hdr[hi]))       { iDom  = hi; }
      if (/localidad|ciudad|city/.test(hdr[hi]))            { iLoc  = hi; }
      if (/supervisor/.test(hdr[hi]))                      { iSup  = hi; }
      if (/vendedor|promotor/.test(hdr[hi]))               { iVend = hi; }
      if (/frecuencia|dias|freq/.test(hdr[hi]))            { iFrec = hi; }
      if (/^lat(itud)?$/.test(hdr[hi]))                     { iLat  = hi; }
      if (/^l(o|n)g(itud)?$/.test(hdr[hi]))                 { iLng  = hi; }
    }
    /* Validate: first data row col 0 must be numeric PDV */
    var firstVal = (rows[1][iPdv] || '').toString().trim().replace(/\.0+$/, '');
    if (!/^\d+$/.test(firstVal)) { return []; }
    var result = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var pdv = (row[iPdv] || '').toString().trim().replace(/\.0+$/, '');
      if (!pdv || !/^\d+$/.test(pdv)) { continue; }
      result.push({
        pdv:  pdv,
        rs:     (row[iRs]    || '').trim(),
        canal:  iCanal >= 0 ? (row[iCanal] || '').trim().toUpperCase() : '',
        dom:    (row[iDom]   || '').trim(),
        loc:    iLoc >= 0 ? (row[iLoc] || '').trim() : '',
        sup:  (row[iSup]  || '').trim(),
        vend: (row[iVend] || '').trim(),
        frec: (row[iFrec] || '').trim().toUpperCase(),
        lat:  iLat >= 0 ? parseFloat((row[iLat] || '').toString().replace(',','.')) || 0 : 0,
        lng:  iLng >= 0 ? parseFloat((row[iLng] || '').toString().replace(',','.')) || 0 : 0
      });
    }
    return result;
  }

  function parseLDP(txt) {
    var rows = parseCSV(txt);
    if (rows.length < 2) { return {}; }
    var hdr = rows[0].map(function(h) { return h.toLowerCase().trim(); });
    var iSku = 0; var iDet = 1; var iUxb = 2; var iNeto = 3; var iInt = 4;
    for (var hi = 0; hi < hdr.length; hi++) {
      if (/^sku$|cod/.test(hdr[hi]))                               { iSku  = hi; }
      if (/detalle|producto|descripcion/.test(hdr[hi]))            { iDet  = hi; }
      if (/uxb/i.test(hdr[hi]))                                    { iUxb  = hi; }
      if (/neto/.test(hdr[hi]))                                    { iNeto = hi; }
      if (/interno/.test(hdr[hi]))                                 { iInt  = hi; }
    }
    var result = {};
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var sku = (row[iSku] || '').toString().trim().replace(/\.0+$/, '');
      if (!sku) { continue; }
      var neto  = parseFloat((row[iNeto] || '0').toString().replace(/[^0-9.,]/g,'').replace(',','.')) || 0;
      var inter = parseFloat((row[iInt]  || '0').toString().replace(/[^0-9.,]/g,'').replace(',','.')) || 0;
      var uxbVal = parseFloat((row[iUxb] || '1').toString().replace(',','.')) || 1;
      result[sku] = { detalle: (row[iDet] || '').trim(), neto: neto, internos: inter, uxb: uxbVal };
    }
    return result;
  }

  /* -- PARSE PRECIOS ----------------------------------------------- */
  /* Precios sheet: Segmento | SKU
     Solo asignacion - precios se calculan desde LDP */
  function parsePreciosHoja(txt) {
    var rows = parseCSV(txt);
    if (rows.length < 2) { return {}; }
    var hdr = rows[0].map(function(h) { return h.toLowerCase().trim(); });
    var iNeg = -1; var iSeg = 0; var iSku = 1; var iCol = -1;
    for (var hi = 0; hi < hdr.length; hi++) {
      if (/negocio/.test(hdr[hi]))          { iNeg = hi; }
      if (/segmento|segment/.test(hdr[hi])) { iSeg = hi; }
      if (/^sku$|cod/.test(hdr[hi]))        { iSku = hi; }
      if (/^color$|^grupo$/.test(hdr[hi]))  { iCol = hi; }
    }
    var result = {};
    var order = [];
    var negocios = [];
    var segNegocio = {};
    var segColor = {};       /* seg -> color group name */
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var neg = iNeg >= 0 ? (row[iNeg] || '').trim() : '';
      var seg = (row[iSeg] || '').trim().toLowerCase();
      var sku = (row[iSku] || '').toString().trim().replace(/\.0+$/, '');
      if (!seg || !sku) { continue; }
      if (!result[seg]) { result[seg] = []; order.push(seg); }
      result[seg].push(sku);
      if (neg && !segNegocio[seg]) {
        segNegocio[seg] = neg;
        var negLow = neg.toLowerCase();
        var found = false;
        for (var ni = 0; ni < negocios.length; ni++) {
          if (negocios[ni].toLowerCase() === negLow) { found = true; break; }
        }
        if (!found) { negocios.push(neg); }
      }
      if (iCol >= 0 && !segColor[seg]) {
        var colVal = (row[iCol] || '').trim().replace(/\.0+$/, '');
        if (colVal) { segColor[seg] = colVal; }
      }
    }
    result._order    = order;
    result._negocios = negocios;
    result._segNeg   = segNegocio;
    result._segColor = segColor;   /* seg -> color group, same group = same palette color */
    return result;
  }

  /* -- CALCULAR PRECIO --------------------------------------------- */
  /* Distri 1: (Neto + Internos + Neto*0.21) * (1 - dto)
     Distri 2: (Neto + Neto*0.21) * (1 - dto) + Internos */
  function calcPrecio(neto, internos, dto) {
    var d = dto / 100;
    if (cache.distri === 2) {
      return (neto + neto * 0.21) * (1 - d) + internos;
    }
    return (neto + internos + neto * 0.21) * (1 - d);
  }

  function fmtPrecio(n) {
    return '$' + Math.round(n).toLocaleString('es-AR');
  }

  /* -- EXTRAER PORCENTAJES ---------------------------------------- */
  function extraerPorcentajes(detalleStr) {
    var parts = detalleStr.split('|'); var result = [];
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i].match(/(\d+[,.]?\d*)\s*%/);
      if (m) {
        result.push(parseFloat(m[1].replace(',','.')));
      } else {
        /* Detect decimal values < 1 as percentage (e.g. 0.1 = 10%, 0,15 = 15%) */
        var m2 = parts[i].match(/\b(0[,.]\d+)\b/);
        if (m2) {
          var dec = parseFloat(m2[1].replace(',','.'));
          result.push(dec * 100); /* 0.1 -> 10 */
        } else {
          result.push(null);
        }
      }
    }
    return result;
  }

  /* -- BUILD PRICE TABLE ------------------------------------------- */
  function buildPriceTable(segKey, detalleStr, esUnitario) {
    var ldp     = cache.ldp;
    var precios = cache.precios;
    if (!ldp || !precios) { return '<div class="no-precios">Precios no cargados. Usa el boton refresh en Configuracion.</div>'; }

    /* Obtener SKUs del segmento */
    var segSkus = null;
    segSkus = precios[segKey] || null;
    if (!segSkus || segSkus.length === 0) {
      return '<div class="no-precios">Sin precios asignados para este segmento.</div>';
    }

    /* Porcentajes del cliente para este segmento */
    var dtos = extraerPorcentajes(detalleStr);
    var parts = detalleStr.split('|');

    /* Encabezados de columnas: una por burbuja con % */
    var colHeaders = [];
    for (var p = 0; p < parts.length; p++) {
      if (dtos[p] !== null) { colHeaders.push({ label: parts[p].trim(), dto: dtos[p] }); }
    }
    if (colHeaders.length === 0) {
      return '<div class="no-precios">Sin descuentos validos para calcular precios.</div>';
    }

    /* Filas de productos */
    var productRows = [];
    for (var s = 0; s < segSkus.length; s++) {
      var sku = segSkus[s];
      var prod = ldp[sku];
      if (!prod) { continue; }
      productRows.push({ sku: sku, detalle: prod.detalle, neto: prod.neto, internos: prod.internos, uxb: prod.uxb });
    }
    if (productRows.length === 0) {
      return '<div class="no-precios">SKUs del segmento no encontrados en la LDP.</div>';
    }

    /* Construir tabla */
    var modoLabel = cfg.modoPTC ? 'PTC' : 'PTR';
    var precioLabel = esUnitario ? ('x un ' + modoLabel) : ('x bt ' + modoLabel);
    var html = '<table class="price-table"><thead><tr>';
    html += '<th>SKU</th><th>Producto</th>';
    for (var h = 0; h < colHeaders.length; h++) {
      html += '<th>' + escHtml(colHeaders[h].label) + '<br><span style="opacity:.65;font-size:9px;font-weight:400">' + precioLabel + '</span></th>';
    }
    html += '</tr></thead><tbody>';
    for (var rr = 0; rr < productRows.length; rr++) {
      var pr = productRows[rr];
      html += '<tr><td>' + escHtml(pr.sku) + '</td><td>' + escHtml(pr.detalle) + '</td>';
      for (var cc = 0; cc < colHeaders.length; cc++) {
        var precioBulto = calcPrecio(pr.neto, pr.internos, colHeaders[cc].dto);
        var precioFinal = esUnitario ? precioBulto / (pr.uxb || 1) : precioBulto;
        if (cfg.modoPTC) { precioFinal = applyPTC(precioFinal); }
        var precio = precioFinal;
        html += '<td>' + fmtPrecio(precio) + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  /* -- PROCESAR ACCIONES CSV --------------------------------------- */
  function procesarAccionesCSV(raw, codigo) {
    var rows = parseCSV(raw);
    if (rows.length < 2) { throw new Error('Hoja de acciones vacia.'); }
    var headers = rows[0];
    var iCod = 0;
    for (var i = 0; i < headers.length; i++) {
      if (/^pdv$/.test(headers[i].toLowerCase().trim()) || /cod|cliente|codigo|c.digo/.test(headers[i].toLowerCase())) {
        iCod = i; break;
      }
    }
    var segCols = [];
    for (var j = 0; j < headers.length; j++) {
      if (j !== iCod && headers[j].trim()) { segCols.push({ i: j, raw: headers[j].trim() }); }
    }
    var fila = null;
    for (var r = 1; r < rows.length; r++) {
      var rawCod = (rows[r][iCod] || '').toString().trim().replace(/\.0+$/, '');
      if (rawCod === codigo) { fila = rows[r]; break; }
    }
    if (!fila) { return null; }
    var VACIAS = ['', '-', 'n/a', 'na', 'sin accion'];

    /* Merge columns that are duplicates: "Value Lata 2", "Value Lata 3" -> "Value Lata" */
    var mergedMap = {}; /* base label -> { key, label, detalle, srcLabels } */
    var mergedOrder = []; /* to preserve column order */
    for (var k = 0; k < segCols.length; k++) {
      var rawLabel = segCols[k].raw;
      var detalle  = (fila[segCols[k].i] || '').trim();
      /* Check if this column is a numbered duplicate: ends with " 2"..." 9" (single digit only) */
      var baseLabel = rawLabel.replace(/\s+[2-9]$/, '').trim();
      var isExtra   = baseLabel !== rawLabel; /* true if " 2" or " 3" was stripped */
      var useLabel  = isExtra ? baseLabel : rawLabel;
      var useKey    = useLabel.toLowerCase();
      if (!mergedMap[useKey]) {
        mergedMap[useKey] = { key: useKey, label: useLabel, detalle: '', srcLabels: [], extraFlags: [] };
        mergedOrder.push(useKey);
      }
      /* Only track original label if this client has a value in that column */
      if (VACIAS.indexOf(detalle.toLowerCase()) === -1) {
        mergedMap[useKey].srcLabels.push(rawLabel.toLowerCase());
      }
      /* Append detalle if non-empty, tracking if it's from a numbered column */
      if (VACIAS.indexOf(detalle.toLowerCase()) === -1) {
        if (mergedMap[useKey].detalle === '') {
          mergedMap[useKey].detalle = detalle;
          mergedMap[useKey].extraFlags.push(isExtra);
        } else {
          mergedMap[useKey].detalle += ' | ' + detalle;
          mergedMap[useKey].extraFlags.push(isExtra);
        }
      }
    }

    /* Build acciones array, skip entries with no detalle */
    var acciones = [];
    for (var m = 0; m < mergedOrder.length; m++) {
      var entry = mergedMap[mergedOrder[m]];
      if (entry.detalle !== '') {
        acciones.push({ key: entry.key, label: entry.label, detalle: entry.detalle, srcLabels: entry.srcLabels, extraFlags: entry.extraFlags });
      }
    }
    return acciones;
  }

  /* -- NEGOCIO TABS ------------------------------------------------- */
  var negocioActivo = ''; /* '' = todos */

  function renderNegocioTabs(negocios) {
    var wrap = document.getElementById('negocio-tabs');
    if (!wrap) { return; }
    if (!negocios || negocios.length === 0) { wrap.innerHTML = ''; return; }
    /* Auto-select first negocio if none active yet */
    if (negocioActivo === '' && negocios.length > 0) {
      negocioActivo = negocios[0];
    }
    var html = '';
    for (var i = 0; i < negocios.length; i++) {
      var neg = negocios[i];
      var isActive = negocioActivo.toLowerCase() === neg.toLowerCase();
      html += '<button class="negocio-tab' + (isActive ? ' active' : '') + '" data-neg="' + escHtml(neg) + '">' + escHtml(neg) + '</button>';
    }
    wrap.innerHTML = html;
    var tabs = wrap.querySelectorAll('.negocio-tab');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function() {
        negocioActivo = this.getAttribute('data-neg');
        /* Update active styles */
        var all = document.querySelectorAll('.negocio-tab');
        for (var a = 0; a < all.length; a++) {
          all[a].classList.toggle('active', all[a].getAttribute('data-neg') === negocioActivo);
        }
        /* Show/hide pills based on negocio */
        filterPillsByNegocio();
      });
    }
  }

  function filterPillsByNegocio() {
    var blocks = document.querySelectorAll('.segblock');
    var segNeg = (cache.precios && cache.precios._segNeg) ? cache.precios._segNeg : {};
    for (var b = 0; b < blocks.length; b++) {
      var segtit = blocks[b].querySelector('.segtit');
      if (!segtit) { continue; }
      var segKey = segtit.textContent.trim().toLowerCase();
      /* Also try matching via segNeg keys directly */
      var segN = segNeg[segKey] || '';
      if (!segN) {
        var snKeys = Object.keys(segNeg);
        for (var sk = 0; sk < snKeys.length; sk++) {
          if (snKeys[sk].indexOf(segKey) !== -1 || segKey.indexOf(snKeys[sk]) !== -1) {
            segN = segNeg[snKeys[sk]]; break;
          }
        }
      }
      var show = negocioActivo === '' || segN.toLowerCase() === negocioActivo.toLowerCase();
      /* Remove animation class to avoid delay on filter */
      blocks[b].classList.remove('fade-in');
      blocks[b].style.display = show ? '' : 'none';
    }
  }

  /* -- RENDER RESULTADO -------------------------------------------- */
  function renderResultado(codigo, acciones) {
    hideEst();
    document.getElementById('reshdr').classList.add('on','fade-in');
    document.getElementById('rcod').textContent = codigo;
    /* Razon social y domicilio desde Datos PDV */
    var datoCliente = null;
    if (cache.datosPdv && cache.datosPdv.length > 0) {
      for (var dp = 0; dp < cache.datosPdv.length; dp++) {
        if (cache.datosPdv[dp].pdv === codigo) { datoCliente = cache.datosPdv[dp]; break; }
      }
    }
    document.getElementById('rrs').textContent  = datoCliente ? datoCliente.rs  : '';
    var btnMuro = document.getElementById('btn-muro');
    if (btnMuro) { btnMuro.style.display = datoCliente && getMuroUrl() ? 'inline-block' : 'none'; }
    var rcEl = document.getElementById('rcanal');
    if (rcEl) {
      if (datoCliente && datoCliente.canal) {
        rcEl.textContent = datoCliente.canal;
        rcEl.style.display = '';
      } else { rcEl.style.display = 'none'; }
    }
    document.getElementById('rdom').textContent = datoCliente ? datoCliente.dom : '';
    var btnMaps = document.getElementById('btn-maps');
    if (btnMaps) {
      if (datoCliente && datoCliente.dom) {
        var dest = encodeURIComponent(datoCliente.dom + (datoCliente.loc ? ' ' + datoCliente.loc : ''));
        btnMaps.href = 'https://www.google.com/maps/dir/?api=1&destination=' + dest;
        btnMaps.style.display = '';
      } else {
        btnMaps.style.display = 'none';
      }
    }
    /* Render etiquetas */
    var etiqHtml = '';
    /* PDV etiquetas first */
    var pdvEtiqs = (cache.etiqPdv && cache.etiqPdv[codigo]) ? cache.etiqPdv[codigo] : [];
    for (var ei = 0; ei < pdvEtiqs.length; ei++) {
      etiqHtml += '<span class="etiq-pdv">' + escHtml(pdvEtiqs[ei]) + '</span>';
    }
    /* Segment etiquetas - check base label AND original column names */
    var segEtiqs = cache.etiqSeg || {};
    var shownEtiqs = {};
    for (var ai = 0; ai < acciones.length; ai++) {
      /* Build list of keys to check: base label + all source labels */
      var keysToCheck = [acciones[ai].label.toLowerCase()];
      var srcs = acciones[ai].srcLabels || [];
      for (var sk = 0; sk < srcs.length; sk++) {
        if (keysToCheck.indexOf(srcs[sk]) === -1) { keysToCheck.push(srcs[sk]); }
      }
      for (var ki = 0; ki < keysToCheck.length; ki++) {
        var k = keysToCheck[ki];
        if (segEtiqs[k] && !shownEtiqs[segEtiqs[k]]) {
          etiqHtml += '<span class="etiq-seg">' + escHtml(segEtiqs[k]) + '</span>';
          shownEtiqs[segEtiqs[k]] = true;
        }
      }
    }
    /* CCC etiquetas */
    var cccEtiqs = cache.etiqCcc || {};
    var cccPdvEtiqs = (cccEtiqs && cccEtiqs[codigo]) ? cccEtiqs[codigo] : [];
    for (var ci2 = 0; ci2 < cccPdvEtiqs.length; ci2++) {
      etiqHtml += '<span class="etiq-ccc">' + escHtml(cccPdvEtiqs[ci2]) + '</span>';
    }
    document.getElementById('etiq-wrap').innerHTML = etiqHtml;
    var negs = (cache.precios && cache.precios._negocios) ? cache.precios._negocios : [];
    renderNegocioTabs(negs);

    /* Ordenar: con precios primero, sin precios al fondo */
    var conPrecios = []; var sinPrecios = [];
    for (var si = 0; si < acciones.length; si++) {
      var segKey = acciones[si].key;
      var tienePrecios = false;
      if (cache.precios) {
        if (cache.precios[segKey]) { tienePrecios = true; }
      }
      acciones[si].hasPrices = tienePrecios;
      if (tienePrecios) { conPrecios.push(acciones[si]); }
      else { sinPrecios.push(acciones[si]); }
    }
    /* Sort conPrecios by the order they appear in the Precios sheet */
    var preciosOrder = (cache.precios && cache.precios._order) ? cache.precios._order : [];
    conPrecios.sort(function(a, b) {
      var ia = preciosOrder.indexOf(a.key);
      var ib = preciosOrder.indexOf(b.key);
      /* If not found directly, try partial match */
      /* exact match only - unmatched go to end */
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    acciones = conPrecios.concat(sinPrecios);

    var wrap = document.getElementById('segswrap');
    var html = '';
    for (var i = 0; i < acciones.length; i++) {
      var acc = acciones[i];
      var pal = acc.hasPrices ? getSegPalette(acc.key) : null;
      var dynCls = pal ? 's-dyn' : 's-grey';
      var dynSty = pal
        ? ' style="--s-light:' + pal[0] + ';--s-mid:' + pal[1] + ';--s-border:' + pal[2] + ';--s-dark:' + pal[3] + ';animation-delay:' + (i*0.07) + 's"'
        : ' style="animation-delay:' + (i*0.07) + 's"';

      /* Burbujas */
      var bubblesHtml = '';
      var parts = acc.detalle.split('|');
      var extraFlags = acc.extraFlags || [];
      for (var p = 0; p < parts.length; p++) {
        var part = parts[p].trim();
        var isExtraBubble = extraFlags[p] === true;
        if (part) { bubblesHtml += '<span class="bubble' + (isExtraBubble ? ' bubble-extra' : '') + '">' + escHtml(part) + '</span>'; }
      }

      /* Tabla de precios */
      var tableHtml = acc.hasPrices
        ? buildPriceTable(acc.key, acc.detalle, precioUnitario)
        : '<div class="no-precios">Sin precios cargados para este segmento.</div>';

      html += '<div class="segblock ' + dynCls + ' fade-in"' + dynSty + '>';
      html += '<div class="segpill" onclick="this.closest(\'.segblock\').classList.toggle(\'open\')">';
      html += '<div class="segtit">' + escHtml(acc.label) + '</div>';
      html += '<div class="detval">' + bubblesHtml + '</div>';
      html += '<span class="pill-chevron">&#9660;</span>';
      html += '</div>';
      html += '<div class="price-table-wrap">';
      html += '<div class="price-scroll">' + tableHtml + '</div>';
      html += '<div class="price-scroll-fade"></div>';
      html += '</div>';
      html += '</div>';
    }
    wrap.innerHTML = html;
    filterPillsByNegocio();

    /* Detectar si hay scroll horizontal en tablas */
    setTimeout(function() {
      var scrolls = wrap.querySelectorAll('.price-scroll');
      for (var s = 0; s < scrolls.length; s++) {
        var fade = scrolls[s].parentNode.querySelector('.price-scroll-fade');
        if (fade) {
          fade.style.display = scrolls[s].scrollWidth > scrolls[s].clientWidth ? 'block' : 'none';
        }
      }
    }, 100);
  }

  /* -- BUSCAR ------------------------------------------------------ */
  function doBuscar(preservePills) {
    var codigo = document.getElementById('codinput').value.trim();
    if (!codigo) { document.getElementById('codinput').focus(); return; }
    hidesugg();
    var inp = document.getElementById('codinput');
    if (inp.select) { inp.select(); }
    var savedPills = preservePills ? getOpenPills() : [];
    resetUI();
    showEst('loading');

    cargarCacheEstaticoSiNecesario().then(function() {
      return fetchSheet(cfg.tab);
    }).then(function(rawAcciones) {
      offlineSave(codigo, rawAcciones);
      histSave(codigo); histRender();
      offlineBadgeHide();
      var acciones = procesarAccionesCSV(rawAcciones, codigo);
      if (!acciones || acciones.length === 0) {
        showEst('vacio');
        document.getElementById('evacsub').textContent = 'El cliente ' + codigo + ' no tiene acciones activas en el periodo actual.';
        return;
      }
      renderResultado(codigo, acciones);
      if (savedPills.length > 0) { restoreOpenPills(savedPills); }
    }).catch(function(e) {
      var cached = offlineLoad(codigo);
      if (cached) {
        /* Restore LDP+Precios if not in memory */
        if (!cache.ldp || Object.keys(cache.ldp).length === 0) {
          offlineRestoreStatic();
        }
        histSave(codigo); histRender();
        var acciones = procesarAccionesCSV(cached.raw, codigo);
        if (acciones && acciones.length > 0) {
          renderResultado(codigo, acciones);
          offlineBadgeShow(cached.ts);
          if (savedPills.length > 0) { restoreOpenPills(savedPills); }
          return;
        }
      }
      showEst('error');
      if (!cfg.sheetId) {
        document.getElementById('etitle').textContent = 'Sheet no configurado';
        document.getElementById('esub').textContent = '1. Toca el icono abajo (engranaje)  2. Pega el ID del Sheet  3. Toca Guardar  4. Volve a buscar.';
      } else if (/fetch|Failed|Load|network/i.test(e.message)) {
        document.getElementById('etitle').textContent = 'Sin conexion';
        document.getElementById('esub').textContent = 'No hay datos guardados para este cliente. Busca otro cliente que hayas consultado antes.';
      } else {
        document.getElementById('etitle').textContent = 'Error al leer el Sheet';
        document.getElementById('esub').textContent = e.message;
      }
    });
  }

  /* -- HELPERS ----------------------------------------------------- */
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function showEst(t) {
    ['loading','error','vacio'].forEach(function(x) { document.getElementById('st-'+x).classList.remove('on'); });
    document.getElementById('st-'+t).classList.add('on');
  }
  function hideEst() {
    ['loading','error','vacio'].forEach(function(x) { document.getElementById('st-'+x).classList.remove('on'); });
  }
  function getOpenPills() {
    var open = [];
    var blocks = document.querySelectorAll('.segblock');
    for (var b = 0; b < blocks.length; b++) {
      open.push(blocks[b].classList.contains('open'));
    }
    return open;
  }

  function restoreOpenPills(open) {
    var blocks = document.querySelectorAll('.segblock');
    for (var b = 0; b < blocks.length; b++) {
      if (open[b]) { blocks[b].classList.add('open'); }
    }
  }

  function resetUI() {
    hideEst();
    hidesugg();
    document.getElementById('reshdr').classList.remove('on','fade-in');
    document.getElementById('segswrap').innerHTML = '';
    document.getElementById('etiq-wrap').innerHTML = '';
    document.getElementById('rrs').textContent = '';
    var rcEl2 = document.getElementById('rcanal'); if (rcEl2) { rcEl2.style.display = 'none'; }
    var bMuro = document.getElementById('btn-muro'); if (bMuro) { bMuro.style.display = 'none'; }
    document.getElementById('rdom').textContent = '';
    var bm = document.getElementById('btn-maps'); if (bm) { bm.style.display = 'none'; }
    allOpen = false;
    negocioActivo = '';
    segColorMap = {}; colorCounter = 1;
    var tb = document.getElementById('btn-tog'); if (tb) { tb.innerHTML = '&#9660;&#9660;'; }
    /* Sync unitario button visual state */
    var bu = document.getElementById('btn-unitario');
    if (bu) {
      bu.style.background = 'var(--azul-m)';
      bu.style.color = '#fff';
      bu.style.borderColor = 'var(--azul-m)';
      bu.textContent = precioUnitario ? 'Un' : 'Bt';
    }
  }

  document.getElementById('btn-unitario').addEventListener('click', function() {
    precioUnitario = !precioUnitario;
    cfg.precioUnitario = precioUnitario;
    localStorage.setItem(STORE, JSON.stringify(cfg));
    var btn = document.getElementById('btn-unitario');
    btn.style.background = 'var(--azul-m)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--azul-m)';
    btn.textContent = precioUnitario ? 'Un' : 'Bt';
    refreshTablesInDOM();
  });

  function refreshTablesInDOM() {
    var blocks = document.querySelectorAll('.segblock');
    for (var b = 0; b < blocks.length; b++) {
      var segtit = blocks[b].querySelector('.segtit');
      var detval = blocks[b].querySelector('.detval');
      if (!segtit || !detval) { continue; }
      var segLabel = segtit.textContent.trim();
      var bubbles = detval.querySelectorAll('.bubble');
      var parts = [];
      for (var bb = 0; bb < bubbles.length; bb++) { parts.push(bubbles[bb].textContent.trim()); }
      var detalleStr = parts.join(' | ');
      var segKey = segLabel.toLowerCase();
      var scroll = blocks[b].querySelector('.price-scroll');
      if (scroll) {
        scroll.innerHTML = buildPriceTable(segKey, detalleStr, precioUnitario);
      }
    }
  }

  /* -- CALCULADORA ------------------------------------------------- */
  var calcDistriOverride = null;
  var calcLongPressTimer = null;

  function calcAbrir() {
    calcDistriOverride = null;
    var ind = document.getElementById('calc-title-indicator');
    if (ind) { ind.style.display = 'none'; }
    document.getElementById('calc-sheet').classList.add('on');
    setTimeout(function() { document.getElementById('calc-sheet').classList.add('open'); }, 10);
    document.getElementById('calc-overlay').classList.add('on');
    setTimeout(function() { document.getElementById('calc-sku').focus(); }, 350);
  }
  function calcCerrar() {
    calcDistriOverride = null;
    var ind = document.getElementById('calc-title-indicator');
    if (ind) { ind.style.display = 'none'; }
    document.getElementById('calc-sheet').classList.remove('open');
    document.getElementById('calc-overlay').classList.remove('on');
    setTimeout(function() { document.getElementById('calc-sheet').classList.remove('on'); }, 320);
  }
  function calcGetDistri() {
    return calcDistriOverride !== null ? calcDistriOverride : cache.distri;
  }
  function calcRecalc() {
    var skuRaw = document.getElementById('calc-sku').value.trim().replace(/\.0+$/, '');
    var dtoRaw = document.getElementById('calc-dto').value.trim().replace(',', '.');
    var qtyRaw = parseInt(document.getElementById('calc-qty').value) || 1;
    if (qtyRaw < 1) { qtyRaw = 1; }
    document.getElementById('calc-qty').value = qtyRaw;
    document.getElementById('calc-qty-display').textContent = qtyRaw;
    var prod = cache.ldp ? cache.ldp[skuRaw] : null;
    var detEl = document.getElementById('calc-detalle');
    if (skuRaw && prod) { detEl.textContent = prod.detalle; }
    else if (skuRaw)    { detEl.textContent = 'SKU no encontrado en LDP'; }
    else                { detEl.textContent = ''; }
    var dto = parseFloat(dtoRaw);
    if (!prod || isNaN(dto)) {
      document.getElementById('calc-val-bulto').textContent = '-';
      document.getElementById('calc-val-unit').textContent  = '-';
      document.getElementById('calc-val-total').textContent = '-';
      document.getElementById('calc-val-ptc').textContent   = '-';
      return;
    }
    /* Usar override de distri si esta activo */
    var distri = calcGetDistri();
    var bulto;
    if (distri === 2) {
      bulto = (prod.neto + prod.neto * 0.21) * (1 - dto / 100) + prod.internos;
    } else {
      bulto = (prod.neto + prod.internos + prod.neto * 0.21) * (1 - dto / 100);
    }
    var unit  = bulto / (prod.uxb || 1);
    var total = bulto * qtyRaw;
    var ptcUnit = applyPTC(unit);
    document.getElementById('calc-val-bulto').textContent = fmtPrecio(bulto);
    document.getElementById('calc-val-unit').textContent  = fmtPrecio(unit);
    document.getElementById('calc-val-total').textContent = fmtPrecio(total);
    /* PTC unit row */
    var ptcBox = document.getElementById('calc-ptc-box');
    var ptcEl  = document.getElementById('calc-val-ptc');
    var mkpBtn = document.getElementById('calc-btn-markup');
    /* ptc box always visible */
    if (ptcEl)  { ptcEl.textContent = fmtPrecio(ptcUnit); }
    if (mkpBtn) { mkpBtn.textContent = getMarkupLabel(); }
  }
  document.getElementById('btn-calc').addEventListener('click', calcAbrir);
  document.getElementById('calc-overlay').addEventListener('click', calcCerrar);
  document.getElementById('calc-sku').addEventListener('input', calcRecalc);
  document.getElementById('calc-dto').addEventListener('input', calcRecalc);
  document.getElementById('calc-qty').addEventListener('input', calcRecalc);
  /* In-calc markup button */
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'calc-btn-markup') {
      cfg.markupIdx = (cfg.markupIdx + 1) % MARKUPS.length;
      savePricingPrefs();
      syncPricingBtns();
      calcRecalc();
    }
  });
  document.getElementById('calc-qty-minus').addEventListener('click', function() {
    var v = parseInt(document.getElementById('calc-qty').value) || 1;
    if (v > 1) { document.getElementById('calc-qty').value = v - 1; calcRecalc(); }
  });
  document.getElementById('calc-qty-plus').addEventListener('click', function() {
    var v = parseInt(document.getElementById('calc-qty').value) || 1;
    document.getElementById('calc-qty').value = v + 1; calcRecalc();
  });

  /* Toque largo 3s en el titulo - toggle secreto de tipo distribuidor */
  var calcTitleEl = document.getElementById('calc-title');
  calcTitleEl.addEventListener('touchstart', function() {
    var self = this;
    self.style.opacity = '.5';
    calcLongPressTimer = setTimeout(function() {
      self.style.opacity = '';
      var current = calcGetDistri();
      calcDistriOverride = current === 1 ? 2 : 1;
      var ind = document.getElementById('calc-title-indicator');
      ind.textContent = calcDistriOverride === 1 ? ' Bonif.' : ' No bonif.';
      ind.style.display = 'inline';
      calcRecalc();
    }, 3000);
  });
  calcTitleEl.addEventListener('touchend',  function() { clearTimeout(calcLongPressTimer); this.style.opacity = ''; });
  calcTitleEl.addEventListener('touchmove', function() { clearTimeout(calcLongPressTimer); this.style.opacity = ''; });

  var tnameWrap = document.getElementById('tname-wrap');
  if (tnameWrap) {
    tnameWrap.addEventListener('click', function() {
      var dd = document.getElementById('distri-dropdown');
      var chev = document.getElementById('tname-chevron');
      var isOpen = dd.classList.contains('on');
      dd.classList.toggle('on');
      if (chev) { chev.innerHTML = isOpen ? '&#9660;' : '&#9650;'; }
    });
  }
  document.addEventListener('click', function(e) {
    var wrap = document.getElementById('tname-wrap');
    var dd = document.getElementById('distri-dropdown');
    if (wrap && dd && !wrap.contains(e.target)) {
      dd.classList.remove('on');
      var chev = document.getElementById('tname-chevron');
      if (chev) { chev.innerHTML = '&#9660;'; }
    }
  });

  /* -- PLANIFICADOR ----------------------------------------------- */
  function planAbrir() {
    if (!cache.datosPdv || cache.datosPdv.length === 0) {
      alert('No hay datos de PDV cargados. Verifica que exista la hoja "' + cfg.tabDatosPdv + '" en el Sheet y toca Actualizar.');
      return;
    }
    /* Keep filter state between open/close - reset only on logout/refresh */
    planPoblarFiltros();
    var sh = document.getElementById('plan-sheet');
    sh.classList.add('on');
    setTimeout(function() { sh.classList.add('open'); }, 10);
    document.getElementById('plan-overlay').classList.add('on');
  }

  function planCerrar() {
    var sh = document.getElementById('plan-sheet');
    sh.classList.remove('open');
    document.getElementById('plan-overlay').classList.remove('on');
    setTimeout(function() { sh.classList.remove('on'); }, 320);
  }

  function planPoblarFiltros() {
    var datos = cache.datosPdv || [];
    var sups  = {}; var vends = {};
    for (var i = 0; i < datos.length; i++) {
      if (datos[i].sup)  { sups[datos[i].sup]   = 1; }
      if (datos[i].vend) { vends[datos[i].vend]  = 1; }
    }
    var selSup  = document.getElementById('plan-sup');
    var selVend = document.getElementById('plan-vend');
    var curSup  = selSup.value;
    var curVend = selVend.value;
    /* Rebuild supervisor options */
    selSup.innerHTML = '<option value="">Todos</option>';
    Object.keys(sups).sort().forEach(function(s) {
      var o = document.createElement('option');
      o.value = s; o.textContent = s;
      if (s === curSup) { o.selected = true; }
      selSup.appendChild(o);
    });
    /* Rebuild vendedor filtered by supervisor */
    planActualizarVendedores();
  }

  function planActualizarVendedores() {
    var datos = cache.datosPdv || [];
    var sup   = document.getElementById('plan-sup').value;
    var selVend = document.getElementById('plan-vend');
    var curVend = selVend.value;
    var vends = {};
    for (var i = 0; i < datos.length; i++) {
      if (!sup || datos[i].sup === sup) {
        if (datos[i].vend) { vends[datos[i].vend] = 1; }
      }
    }
    selVend.innerHTML = '<option value="">Todos</option>';
    Object.keys(vends).sort().forEach(function(v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (v === curVend) { o.selected = true; }
      selVend.appendChild(o);
    });
    planFiltrar();
  }

  function planGetDiasSeleccionados() {
    var cbs = document.querySelectorAll('#plan-dias input[type=checkbox]');
    var dias = [];
    for (var i = 0; i < cbs.length; i++) {
      if (cbs[i].checked) { dias.push(cbs[i].value); }
    }
    return dias;
  }

  var planCanalesActivos = {}; /* canal -> true if active */
  var planSortCol = ''; /* current sort column key */
  var planSortDir = 1;  /* 1=asc, -1=desc */
  var PLAN_BATCH = 50;  /* rows per render batch */
  var PLAN_MAX   = 200; /* max rows to render */
  var planRenderOffset = 0; /* how many rows rendered so far */
  var planTodosFiltrados = []; /* full filtered list for batch rendering */
  var planEtiqActivas = {}; /* etiqueta text -> true if active filter */

  function planRenderCanalFiltros(filtrados) {
    var wrap = document.getElementById('plan-canal-filters');
    if (!wrap) { return; }
    /* Count canal occurrences */
    var counts = {};
    for (var fi = 0; fi < filtrados.length; fi++) {
      var canal = filtrados[fi].canal;
      if (canal) {
        if (!counts[canal]) { counts[canal] = 0; }
        counts[canal]++;
      }
    }
    var keys = Object.keys(counts);
    if (keys.length === 0) { wrap.innerHTML = ''; return; }
    keys.sort();
    var html = '';
    for (var ki = 0; ki < keys.length; ki++) {
      var canal = keys[ki];
      var isActive = !!planCanalesActivos[canal];
      html += '<button class="plan-canal-btn' + (isActive ? ' active' : '') + '" data-canal="' + canal + '">';
      html += canal;
      html += ' <span class="etiq-count">' + counts[canal] + '</span>';
      html += '</button>';
    }
    /* X button - only when at least one canal active */
    var hasActiveCanal = Object.keys(planCanalesActivos).length > 0;
    if (hasActiveCanal) { html += '<button class="plan-filter-clear" id="btn-clear-canal">&#10005;</button>'; }
    wrap.innerHTML = html;
    var btns = wrap.querySelectorAll('.plan-canal-btn');
    for (var bi = 0; bi < btns.length; bi++) {
      btns[bi].addEventListener('click', function() {
        var canal2 = this.getAttribute('data-canal');
        if (planCanalesActivos[canal2]) { delete planCanalesActivos[canal2]; }
        else { planCanalesActivos[canal2] = true; }
        planFiltrar();
      });
    }
    var clearCanalBtn = document.getElementById('btn-clear-canal');
    if (clearCanalBtn) {
      clearCanalBtn.addEventListener('click', function() {
        planCanalesActivos = {};
        planFiltrar();
      });
    }
  }
  var planUltimosFiltrados = [];

  function planBuildRow(d) {
    var etiqSeg = cache.etiqSeg || {};
    var etiqPdv = cache.etiqPdv || {};
    var eHtml = '';
    var pe = etiqPdv[d.pdv] || [];
    for (var pi = 0; pi < pe.length; pi++) {
      eHtml += '<span class="etiq-pdv" style="font-size:10px;padding:2px 8px">' + escHtml(pe[pi]) + '</span> ';
    }
    var segsForPdv = (cache.accionesIndex && cache.accionesIndex[d.pdv]) ? cache.accionesIndex[d.pdv] : [];
    var shownSeg = {};
    for (var si2 = 0; si2 < segsForPdv.length; si2++) {
      var sk2 = segsForPdv[si2];
      if (etiqSeg[sk2] && !shownSeg[etiqSeg[sk2]]) {
        eHtml += '<span class="etiq-seg" style="font-size:10px;padding:2px 8px">' + escHtml(etiqSeg[sk2]) + '</span> ';
        shownSeg[etiqSeg[sk2]] = true;
      }
    }
    var cccMap = cache.etiqCcc || {};
    var cccItems = cccMap[d.pdv] || [];
    for (var ci3 = 0; ci3 < cccItems.length; ci3++) {
      eHtml += '<span class="etiq-ccc" style="font-size:10px;padding:2px 8px">' + escHtml(cccItems[ci3]) + '</span> ';
    }
    var mapsHref = d.dom ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(d.dom + (d.loc ? ' ' + d.loc : '')) : '';
    var row = '<tr>';
    row += '<td><span class="plan-pdv-link" data-pdv="' + escHtml(d.pdv) + '" style="display:inline-block;background:rgba(0,61,165,.08);color:var(--azul-m);font-weight:700;cursor:pointer;font-family:DM Mono,monospace;padding:4px 10px;border-radius:8px;border:1.5px solid rgba(0,61,165,.15)">' + escHtml(d.pdv) + '</span></td>';
    row += '<td>' + escHtml(d.rs) + '</td>';
    row += '<td style="font-size:11px;font-weight:700;color:var(--txt-s)">' + escHtml(d.canal) + '</td>';
    row += '<td>' + (eHtml || '<span style="color:var(--gris-b)">-</span>') + '</td>';
    row += '<td>' + escHtml(d.dom) + (mapsHref ? ' <a href="' + mapsHref + '" target="_blank" style="display:inline-block;background:rgba(0,61,165,.1);color:var(--azul-m);font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;text-decoration:none;white-space:nowrap">&#128205;</a>' : '') + '</td>';
    row += '<td>' + escHtml(d.loc) + '</td>';
    row += '<td>' + escHtml(d.sup) + '</td>';
    row += '<td>' + escHtml(d.vend) + '</td>';
    row += '</tr>';
    return row;
  }

  function planAppendRows(tbody, from, count) {
    var list = planTodosFiltrados;
    var end = Math.min(from + count, list.length, PLAN_MAX);
    var html = '';
    for (var i = from; i < end; i++) { html += planBuildRow(list[i]); }
    tbody.insertAdjacentHTML('beforeend', html);
    planRenderOffset = end;
    /* Update count label */
    var countEl = document.getElementById('plan-count');
    if (countEl) {
      var total = list.length;
      var shown = Math.min(end, PLAN_MAX);
      if (total === 0) { countEl.innerHTML = 'Sin resultados'; }
      else if (total > PLAN_MAX) { countEl.innerHTML = '<strong>' + total + ' PDVs</strong> - Mostrando ' + shown + ' (max ' + PLAN_MAX + ')'; }
      else if (shown < total) { countEl.innerHTML = '<strong>' + total + ' PDVs</strong> - Mostrando ' + shown; }
      else { countEl.innerHTML = '<strong>' + total + ' PDV' + (total !== 1 ? 's' : '') + '</strong>'; }
    }
  }

  function planEnviarWA() {
    var filtrados = planUltimosFiltrados;
    if (!filtrados || filtrados.length === 0) { return; }
    var etiqSeg = cache.etiqSeg || {};
    var etiqPdv = cache.etiqPdv || {};
    var sup  = document.getElementById('plan-sup').value;
    var vend = document.getElementById('plan-vend').value;
    var dias = planGetDiasSeleccionados();
    var etiqFiltrosWa = Object.keys(planEtiqActivas);
    /* Build message */
    var lines = [];
    lines.push('🗓️ *Planificador de visitas*');
    lines.push('──────────────────');
    if (vend)  { lines.push('👤 *Vendedor:* ' + vend); }
    if (sup)   { lines.push('📋 *Supervisor:* ' + sup); }
    if (dias.length > 0) { lines.push('📅 *Dias:* ' + dias.join(', ')); }
    if (etiqFiltrosWa.length > 0) { lines.push('🎯 *Foco:* ' + etiqFiltrosWa.join(', ')); }
    lines.push('📍 *' + filtrados.length + ' PDV' + (filtrados.length !== 1 ? 's' : '') + '*');
    lines.push('──────────────────');
    lines.push('');
    for (var fi = 0; fi < filtrados.length; fi++) {
      var d = filtrados[fi];
      var line = '- *' + d.pdv + ' - ' + d.rs + '*';
      /* Etiquetas: if filters active, only show matching ones */
      var etqs = [];
      var pe = etiqPdv[d.pdv] || [];
      for (var pi = 0; pi < pe.length; pi++) {
        if (etiqFiltrosWa.length === 0 || planEtiqActivas[pe[pi]]) { etqs.push(pe[pi]); }
      }
      var segs = (cache.accionesIndex && cache.accionesIndex[d.pdv]) ? cache.accionesIndex[d.pdv] : [];
      var seenE = {};
      for (var si4 = 0; si4 < segs.length; si4++) {
        var ev4 = etiqSeg[segs[si4]];
        if (ev4 && !seenE[ev4]) {
          seenE[ev4] = true;
          if (etiqFiltrosWa.length === 0 || planEtiqActivas[ev4]) { etqs.push(ev4); }
        }
      }
      var cccWa = (cache.etiqCcc && cache.etiqCcc[d.pdv]) ? cache.etiqCcc[d.pdv] : [];
      for (var cwi = 0; cwi < cccWa.length; cwi++) {
        if (etiqFiltrosWa.length === 0 || planEtiqActivas[cccWa[cwi]]) { etqs.push(cccWa[cwi]); }
      }
      if (etqs.length > 0) { line += ' ' + etqs.join(', '); }
      lines.push(line);
    }
    var msg = lines.join('\n');
    var wa = cfg.whatsapp || '';
    var url = wa
      ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg)
      : 'https://wa.me/?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  }

  /* Build etiqueta filter bubbles based on current filtrados */
  function planRenderEtiqFiltros(filtradosBase, filtradosActual) {
    var wrap = document.getElementById('plan-etiq-filters');
    if (!wrap) { return; }
    var etiqSeg = cache.etiqSeg || {};
    var etiqPdv = cache.etiqPdv || {};
    var base = filtradosBase || [];

    /* Count etiquetas from BASE (sup/vend/dia/canal) - ignores etiq filter so never 0 */
    var counts = {};
    for (var fi = 0; fi < base.length; fi++) {
      var d = base[fi];
      var pe = etiqPdv[d.pdv] || [];
      for (var pi = 0; pi < pe.length; pi++) {
        var k = pe[pi];
        if (!counts[k]) { counts[k] = { count: 0, type: 'pdv' }; }
        counts[k].count++;
      }
      var cccMapR = cache.etiqCcc || {};
      var cccItemsR = cccMapR[d.pdv] || [];
      for (var ci4 = 0; ci4 < cccItemsR.length; ci4++) {
        var kc = cccItemsR[ci4];
        if (!counts[kc]) { counts[kc] = { count: 0, type: 'ccc' }; }
        counts[kc].count++;
      }
      var segs = (cache.accionesIndex && cache.accionesIndex[d.pdv]) ? cache.accionesIndex[d.pdv] : [];
      var seenSeg = {};
      for (var si3 = 0; si3 < segs.length; si3++) {
        var ev = etiqSeg[segs[si3]];
        if (ev && !seenSeg[ev]) {
          seenSeg[ev] = true;
          if (!counts[ev]) { counts[ev] = { count: 0, type: 'seg' }; }
          counts[ev].count++;
        }
      }
    }
    var keys = Object.keys(counts);
    if (keys.length === 0) { wrap.innerHTML = ''; return; }
    /* Sort: active first, then by count desc */
    keys.sort(function(a, b) {
      var aAct = !!planEtiqActivas[a]; var bAct = !!planEtiqActivas[b];
      if (aAct !== bAct) { return aAct ? -1 : 1; }
      return counts[b].count - counts[a].count;
    });
    var html = '';
    for (var ki = 0; ki < keys.length; ki++) {
      var etxt = keys[ki];
      var info = counts[etxt];
      var isActive = !!planEtiqActivas[etxt];
      html += '<button class="plan-etiq-btn ' + info.type + (isActive ? ' active' : '') + '" data-etiq="' + escHtml(etxt) + '">';
      html += escHtml(etxt);
      html += ' <span class="etiq-count">' + info.count + '</span>';
      html += '</button>';
    }
    /* X button - only when at least one etiq active */
    var hasActiveEtiq = Object.keys(planEtiqActivas).length > 0;
    if (hasActiveEtiq) { html += '<button class="plan-filter-clear" id="btn-clear-etiq">&#10005;</button>'; }
    wrap.innerHTML = html;
    var btns = wrap.querySelectorAll('.plan-etiq-btn');
    for (var bi = 0; bi < btns.length; bi++) {
      btns[bi].addEventListener('click', function() {
        var etxt2 = this.getAttribute('data-etiq');
        if (planEtiqActivas[etxt2]) { delete planEtiqActivas[etxt2]; }
        else { planEtiqActivas[etxt2] = true; }
        planFiltrar();
      });
    }
    var clearEtiqBtn = document.getElementById('btn-clear-etiq');
    if (clearEtiqBtn) {
      clearEtiqBtn.addEventListener('click', function() {
        planEtiqActivas = {};
        planFiltrar();
      });
    }
  }

  /* Remove active etiq/canal filters that have 0 results in new base */
  function planLimpiarFiltrosHuerfanos(filtradosBase) {
    var etiqSeg = cache.etiqSeg || {};
    var etiqPdv2 = cache.etiqPdv || {};
    /* Build set of etiquetas present in new base */
    var etiqEnBase = {};
    var canalEnBase = {};
    for (var fi = 0; fi < filtradosBase.length; fi++) {
      var d = filtradosBase[fi];
      if (d.canal) { canalEnBase[d.canal] = true; }
      var pe = etiqPdv2[d.pdv] || [];
      for (var pi = 0; pi < pe.length; pi++) { etiqEnBase[pe[pi]] = true; }
      var cccM = cache.etiqCcc || {};
      var cccI = cccM[d.pdv] || [];
      for (var ci = 0; ci < cccI.length; ci++) { etiqEnBase[cccI[ci]] = true; }
      var segs = (cache.accionesIndex && cache.accionesIndex[d.pdv]) ? cache.accionesIndex[d.pdv] : [];
      var seen = {};
      for (var si = 0; si < segs.length; si++) {
        var ev = etiqSeg[segs[si]];
        if (ev && !seen[ev]) { seen[ev] = true; etiqEnBase[ev] = true; }
      }
    }
    /* Remove active filters not present in base */
    var changed = false;
    Object.keys(planEtiqActivas).forEach(function(k) {
      if (!etiqEnBase[k]) { delete planEtiqActivas[k]; changed = true; }
    });
    Object.keys(planCanalesActivos).forEach(function(k) {
      if (!canalEnBase[k]) { delete planCanalesActivos[k]; changed = true; }
    });
    return changed;
  }

  function planFiltrar() {
    var datos = cache.datosPdv || [];
    var sup   = document.getElementById('plan-sup').value;
    var vend  = document.getElementById('plan-vend').value;
    var dias  = planGetDiasSeleccionados();

    var etiqFiltros = Object.keys(planEtiqActivas);
    var canalFiltros = Object.keys(planCanalesActivos);

    /* filtradosBase: PDVs after sup/vend/canal/dia filters but BEFORE etiq filter
       Used to count etiquetas so all bubbles stay visible even when etiq filter is active */
    var filtradosBase = datos.filter(function(d) {
      if (sup  && d.sup  !== sup)  { return false; }
      if (vend && d.vend !== vend) { return false; }
      if (canalFiltros.length > 0 && !planCanalesActivos[d.canal]) { return false; }
      if (dias.length > 0) {
        var frec = d.frec.toUpperCase();
        var match = false;
        for (var di2 = 0; di2 < dias.length; di2++) {
          if (new RegExp('(^|[^A-Z])' + dias[di2] + '[A-Z]?($|[^A-Z])').test(frec) || frec === dias[di2]) {
            match = true; break;
          }
        }
        if (!match) { return false; }
      }
      return true;
    });

    var filtrados = datos.filter(function(d) {
      if (sup  && d.sup  !== sup)  { return false; }
      if (vend && d.vend !== vend) { return false; }
      /* Canal filter: OR between selected canales */
      if (canalFiltros.length > 0 && !planCanalesActivos[d.canal]) { return false; }
      /* Etiqueta filter: OR - at least one active etiqueta must match */
      if (etiqFiltros.length > 0) {
        var etiqSeg2 = cache.etiqSeg || {};
        var etiqPdv2 = cache.etiqPdv || {};
        var hasMatch = false;
        /* Check PDV etiquetas */
        var pe2 = etiqPdv2[d.pdv] || [];
        for (var pei = 0; pei < pe2.length && !hasMatch; pei++) {
          if (planEtiqActivas[pe2[pei]]) { hasMatch = true; }
        }
        /* Check CCC etiquetas */
        if (!hasMatch) {
          var cccF = (cache.etiqCcc && cache.etiqCcc[d.pdv]) ? cache.etiqCcc[d.pdv] : [];
          for (var cfi = 0; cfi < cccF.length && !hasMatch; cfi++) {
            if (planEtiqActivas[cccF[cfi]]) { hasMatch = true; }
          }
        }
        /* Check segment etiquetas */
        if (!hasMatch) {
          var segs2 = (cache.accionesIndex && cache.accionesIndex[d.pdv]) ? cache.accionesIndex[d.pdv] : [];
          var seenSeg2 = {};
          for (var sei = 0; sei < segs2.length && !hasMatch; sei++) {
            var ev2 = etiqSeg2[segs2[sei]];
            if (ev2 && !seenSeg2[ev2] && planEtiqActivas[ev2]) { hasMatch = true; }
            if (ev2) { seenSeg2[ev2] = true; }
          }
        }
        if (!hasMatch) { return false; }
      }
      if (dias.length > 0) {
        /* OR: at least one selected day appears in frecuencia */
        var frec = d.frec.toUpperCase();
        var match = false;
        for (var di = 0; di < dias.length; di++) {
        /* Match 2 or 3 letter day codes: LU matches LU and LUN */
          if (new RegExp('(^|[^A-Z])' + dias[di] + '[A-Z]?($|[^A-Z])').test(frec) || frec === dias[di]) {
            match = true; break;
          }
        }
        if (!match) { return false; }
      }
      return true;
    });

    /* Clean up orphaned etiq/canal filters before rendering */
    planLimpiarFiltrosHuerfanos(filtradosBase);
    /* Re-read after cleanup */
    etiqFiltros = Object.keys(planEtiqActivas);
    canalFiltros = Object.keys(planCanalesActivos);
    /* Update count and etiqueta filter bubbles */
    var countEl = document.getElementById('plan-count');
    countEl.innerHTML = '';
    planRenderCanalFiltros(filtradosBase);
    planRenderEtiqFiltros(filtradosBase, filtrados);
    /* Show/hide WhatsApp button */
    var btnWa = document.getElementById('btn-plan-wa');
    if (btnWa) { btnWa.style.display = filtrados.length > 0 ? '' : 'none'; }
    /* Store filtrados for WA export */
    planUltimosFiltrados = filtrados;

    /* Build table rows */
    var tbody = document.getElementById('plan-tbody');
    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="plan-empty">Sin PDVs para los filtros seleccionados</td></tr>';
      return;
    }

    var etiqSeg = cache.etiqSeg || {};
    var etiqPdv = cache.etiqPdv || {};

    /* Apply sort if active */
    if (planSortCol) {
      filtrados = filtrados.slice();
      filtrados.sort(function(a, b) {
        var av = (a[planSortCol] || '').toString().toLowerCase();
        var bv = (b[planSortCol] || '').toString().toLowerCase();
        /* Numeric sort for pdv */
        if (planSortCol === 'pdv') { av = parseFloat(a.pdv) || 0; bv = parseFloat(b.pdv) || 0; }
        if (av < bv) { return -1 * planSortDir; }
        if (av > bv) { return  1 * planSortDir; }
        return 0;
      });
    }
    planTodosFiltrados = filtrados;
    planRenderOffset = 0;
    tbody.innerHTML = '';
    planAppendRows(tbody, 0, PLAN_BATCH);
  }

  document.getElementById('plan-tbody').addEventListener('click', function(e) {
    var link = e.target.closest('.plan-pdv-link');
    if (!link) { return; }
    var pdv = link.getAttribute('data-pdv');
    planCerrar();
    setTimeout(function() {
      document.getElementById('codinput').value = pdv;
      doBuscar(false);
    }, 50);
  });
  document.getElementById('btn-plan-wa').addEventListener('click', planEnviarWA);
  document.getElementById('btn-plan').addEventListener('click', planAbrir);
  document.getElementById('plan-overlay').addEventListener('click', planCerrar);
  document.getElementById('btn-plan-cerrar').addEventListener('click', planCerrar);
  document.querySelectorAll('#plan-table th[data-col]').forEach(function(th) {
    th.addEventListener('click', function() {
      var col = this.getAttribute('data-col');
      if (planSortCol === col) {
        planSortDir = planSortDir * -1;
      } else {
        planSortCol = col;
        planSortDir = 1;
      }
      /* Update header indicators */
      document.querySelectorAll('#plan-table th').forEach(function(h) {
        h.classList.remove('sort-asc', 'sort-desc');
      });
      this.classList.add(planSortDir === 1 ? 'sort-asc' : 'sort-desc');
      planFiltrar();
    });
  });
  document.getElementById('plan-scroll').addEventListener('scroll', function() {
    var el = this;
    if (planRenderOffset >= Math.min(planTodosFiltrados.length, PLAN_MAX)) { return; }
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      planAppendRows(document.getElementById('plan-tbody'), planRenderOffset, PLAN_BATCH);
    }
  });
  document.getElementById('plan-sup').addEventListener('change', function() {
    planActualizarVendedores();
  });
  document.getElementById('plan-vend').addEventListener('change', planFiltrar);
  document.querySelectorAll('#plan-dias input[type=checkbox]').forEach(function(cb) {
    cb.addEventListener('change', planFiltrar);
  });

  document.getElementById('p0').focus();
});
