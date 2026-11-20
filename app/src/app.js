/* Sunset Cover Maker — a GTA-style multi-panel poster maker.
   Everything runs locally: photos are read with FileReader / fetch of
   the app's own sample files and are never uploaded anywhere. */
(function () {
  'use strict';

  var SIZES = {
    '1080x1080': [1080, 1080],
    '1080x1350': [1080, 1350],
    '1920x1080': [1920, 1080]
  };

  var PANEL_NAMES = [
    'Panel 1 — hero (left, tall)',
    'Panel 2 — top right',
    'Panel 3 — middle right',
    'Panel 4 — bottom strip'
  ];

  // Multi-panel layouts, fractions of the canvas, per aspect ratio.
  // Panels of different sizes, like the GTA 6 poster.
  function layoutFor(w, h) {
    var g = 0.008; // gap as a fraction of width
    if (w > h) {
      // 1920x1080 landscape: tall hero left, three stacked panels right.
      return [
        { x: 0, y: 0, w: 0.56, h: 1 },
        { x: 0.56 + g, y: 0, w: 1 - 0.56 - g, h: 0.47 },
        { x: 0.56 + g, y: 0.47 + g * 0.7, w: (1 - 0.56 - g) / 2 - g / 2, h: 1 - 0.47 - g * 0.7 },
        { x: 0.56 + g + (1 - 0.56 - g) / 2 + g / 2, y: 0.47 + g * 0.7, w: (1 - 0.56 - g) / 2 - g / 2, h: 1 - 0.47 - g * 0.7 }
      ];
    }
    if (w === h) {
      // 1080x1080 square: big hero top-left, two right, wide strip bottom.
      return [
        { x: 0, y: 0, w: 0.62, h: 0.60 },
        { x: 0.62 + g, y: 0, w: 1 - 0.62 - g, h: 0.295 },
        { x: 0.62 + g, y: 0.295 + g, w: 1 - 0.62 - g, h: 0.60 - 0.295 - g },
        { x: 0, y: 0.60 + g, w: 1, h: 1 - 0.60 - g }
      ];
    }
    // 1080x1350 portrait: hero on top, two side by side, wide strip bottom.
    return [
      { x: 0, y: 0, w: 1, h: 0.50 },
      { x: 0, y: 0.50 + g, w: 0.495, h: 0.235 },
      { x: 0.505, y: 0.50 + g, w: 0.495, h: 0.235 },
      { x: 0, y: 0.50 + g + 0.235 + g, w: 1, h: 1 - 0.50 - 0.235 - 2 * g }
    ];
  }

  var state = {
    size: '1920x1080',
    title: 'SUNSET CITY',
    subtitle: 'CHASE THE NEON',
    grade: true,
    halftone: true,
    borders: true,
    photos: [], // {img, name, src}
    panels: [
      { photo: -1, zoom: 1, ox: 0, oy: 0 },
      { photo: -1, zoom: 1, ox: 0, oy: 0 },
      { photo: -1, zoom: 1, ox: 0, oy: 0 },
      { photo: -1, zoom: 1, ox: 0, oy: 0 }
    ],
    selected: 0
  };

  var canvas = document.getElementById('preview');
  var ctx = canvas.getContext('2d');
  var statusEl = document.getElementById('status');
  var selectedLabel = document.getElementById('selectedLabel');
  var thumbsEl = document.getElementById('thumbs');
  var panelPhotoSel = document.getElementById('panelPhoto');

  function setStatus(msg) { statusEl.textContent = msg; }

  function sizeWH() { return SIZES[state.size]; }

  // ---- halftone dot pattern (drawn once per render, reused) ----
  var halftonePattern = null;
  function getHalftonePattern() {
    if (halftonePattern) return halftonePattern;
    var p = document.createElement('canvas');
    p.width = 14; p.height = 14;
    var c = p.getContext('2d');
    c.clearRect(0, 0, 14, 14);
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.beginPath(); c.arc(7, 7, 1.6, 0, Math.PI * 2); c.fill();
    halftonePattern = ctx.createPattern(p, 'repeat');
    return halftonePattern;
  }

  function drawPanelInto(c, W, H, rect, panel, isSelected) {
    var px = rect.x * W, py = rect.y * H, pw = rect.w * W, ph = rect.h * H;
    c.save();
    c.beginPath();
    c.rect(px, py, pw, ph);
    c.clip();

    var photo = panel.photo >= 0 ? state.photos[panel.photo] : null;
    if (photo && photo.img && photo.img.naturalWidth > 0) {
      var iw = photo.img.naturalWidth, ih = photo.img.naturalHeight;
      var base = Math.max(pw / iw, ph / ih);
      var scale = base * panel.zoom;
      var dw = iw * scale, dh = ih * scale;
      var dx = px + (pw - dw) / 2 + panel.ox * pw;
      var dy = py + (ph - dh) / 2 + panel.oy * ph;
      c.filter = state.grade ? 'saturate(1.5) contrast(1.14) brightness(1.06) sepia(0.14)' : 'none';
      c.drawImage(photo.img, dx, dy, dw, dh);
      c.filter = 'none';
      // Warm sunset wash over the photo.
      if (state.grade) {
        var wash = c.createLinearGradient(px, py, px + pw, py + ph);
        wash.addColorStop(0, 'rgba(255,126,46,0.10)');
        wash.addColorStop(0.55, 'rgba(255,46,136,0.08)');
        wash.addColorStop(1, 'rgba(90,20,120,0.16)');
        c.fillStyle = wash;
        c.fillRect(px, py, pw, ph);
      }
    } else {
      // Empty panel placeholder: sunset gradient + prompt.
      var g = c.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, '#3b115f');
      g.addColorStop(0.55, '#c22a72');
      g.addColorStop(1, '#ff7e2e');
      c.fillStyle = g;
      c.fillRect(px, py, pw, ph);
      c.fillStyle = 'rgba(255,246,236,0.92)';
      c.font = '700 ' + Math.round(ph * 0.09) + 'px "Segoe UI", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('ADD A PHOTO', px + pw / 2, py + ph / 2);
    }

    // Comic halftone dots, strongest in the shadows (bottom of panel).
    if (state.halftone) {
      c.save();
      c.globalAlpha = 0.10;
      c.fillStyle = getHalftonePattern();
      c.fillRect(px, py, pw, ph);
      c.restore();
    }
    // Vignette.
    var vg = c.createRadialGradient(px + pw / 2, py + ph / 2, Math.min(pw, ph) * 0.35, px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,0,20,0.38)');
    c.fillStyle = vg;
    c.fillRect(px, py, pw, ph);

    c.restore();

    if (state.borders) {
      c.lineWidth = Math.max(3, W * 0.0025);
      c.strokeStyle = isSelected ? '#ffe259' : '#fff6ec';
      c.strokeRect(px + c.lineWidth / 2, py + c.lineWidth / 2, pw - c.lineWidth, ph - c.lineWidth);
    }
    if (isSelected) {
      c.lineWidth = Math.max(2, W * 0.0015);
      c.strokeStyle = '#ff2e88';
      c.setLineDash([Math.max(10, W * 0.008), Math.max(8, W * 0.006)]);
      c.strokeRect(px + 6, py + 6, pw - 12, ph - 12);
      c.setLineDash([]);
    }
  }

  function drawCover(c, W, H) {
    // Backdrop: deep violet sky to hot sunset horizon.
    var sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1b0b3b');
    sky.addColorStop(0.45, '#5b1a6e');
    sky.addColorStop(0.75, '#e8386b');
    sky.addColorStop(1, '#ff7e2e');
    c.fillStyle = sky;
    c.fillRect(0, 0, W, H);
    // Sun glow behind the panels.
    var glow = c.createRadialGradient(W * 0.5, H * 0.42, 10, W * 0.5, H * 0.42, W * 0.55);
    glow.addColorStop(0, 'rgba(255,226,89,0.55)');
    glow.addColorStop(0.5, 'rgba(255,126,46,0.18)');
    glow.addColorStop(1, 'rgba(255,126,46,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);

    var rects = layoutFor(W, H);
    for (var i = 0; i < 4; i++) {
      drawPanelInto(c, W, H, rects[i], state.panels[i], i === state.selected);
    }

    // Bottom scrim so the caption lettering always reads.
    var scrimH = H * 0.24;
    var scrim = c.createLinearGradient(0, H - scrimH, 0, H);
    scrim.addColorStop(0, 'rgba(10,2,24,0)');
    scrim.addColorStop(1, 'rgba(10,2,24,0.72)');
    c.fillStyle = scrim;
    c.fillRect(0, H - scrimH, W, H * 0.24);

    // Caption: heavy display lettering, sunset gradient fill, black outline.
    var title = (state.title || 'SUNSET CITY').toUpperCase();
    var sub = (state.subtitle || '').toUpperCase();
    var titleSize = Math.round(H * (W > H ? 0.115 : 0.085));
    c.save();
    c.translate(W * 0.035, H * 0.965);
    c.rotate(-0.022);
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    c.font = titleSize + 'px Anton, "Arial Black", sans-serif';
    try { c.letterSpacing = '2px'; } catch (e) { /* older canvas: ignore */ }
    var grad = c.createLinearGradient(0, -titleSize, 0, 6);
    grad.addColorStop(0, '#ffe259');
    grad.addColorStop(0.5, '#ff7e2e');
    grad.addColorStop(1, '#ff2e88');
    c.lineJoin = 'round';
    c.lineWidth = Math.max(4, titleSize * 0.11);
    c.strokeStyle = '#12041f';
    c.shadowColor = 'rgba(0,0,0,0.55)';
    c.shadowBlur = Math.round(titleSize * 0.12);
    c.shadowOffsetY = Math.round(titleSize * 0.05);
    c.strokeText(title, 0, 0);
    c.fillStyle = grad;
    c.fillText(title, 0, 0);
    c.restore();

    if (sub) {
      c.save();
      c.font = '700 ' + Math.round(H * 0.026) + 'px "Segoe UI", system-ui, sans-serif';
      try { c.letterSpacing = '6px'; } catch (e) { /* ignore */ }
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      var subY = H * 0.965 - titleSize - Math.round(H * 0.028);
      var tw = c.measureText(sub).width;
      c.fillStyle = 'rgba(10,2,24,0.85)';
      c.fillRect(W * 0.035 - 10, subY - Math.round(H * 0.026) - 8, tw + 20, Math.round(H * 0.026) + 16);
      c.fillStyle = '#fff6ec';
      c.fillText(sub, W * 0.035, subY);
      c.restore();
    }

    // Small corner tag, top right.
    c.save();
    c.font = '700 ' + Math.round(H * 0.018) + 'px "Segoe UI", system-ui, sans-serif';
    try { c.letterSpacing = '3px'; } catch (e) { /* ignore */ }
    c.textAlign = 'right';
    c.fillStyle = 'rgba(255,246,236,0.9)';
    c.fillText('POSTER No. 06', W * 0.985, H * 0.035);
    c.restore();
  }

  function render() {
    var wh = sizeWH();
    canvas.width = wh[0];
    canvas.height = wh[1];
    drawCover(ctx, wh[0], wh[1]);
  }

  // ---- export (the same function the Export button calls) ----
  function exportPNG(w, h) {
    return document.fonts.load('100px Anton').catch(function () {}).then(function () {
      var off = document.createElement('canvas');
      off.width = w; off.height = h;
      var c = off.getContext('2d');
      var saved = state.selected;
      state.selected = -1; // no selection outline on the exported poster
      drawCover(c, w, h);
      state.selected = saved;
      render(); // restore the preview with its selection outline
      return off.toDataURL('image/png');
    });
  }

  function downloadExport() {
    var wh = sizeWH();
    setStatus('Exporting ' + wh[0] + 'x' + wh[1] + ' PNG…');
    exportPNG(wh[0], wh[1]).then(function (url) {
      var a = document.createElement('a');
      a.href = url;
      a.download = 'sunset-cover-' + wh[0] + 'x' + wh[1] + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus('Exported sunset-cover-' + wh[0] + 'x' + wh[1] + '.png — check your downloads.');
    });
  }

  // ---- photos ----
  function addPhoto(img, name) {
    var idx = state.photos.length;
    state.photos.push({ img: img, name: name, src: img.src });
    refreshThumbs();
    refreshPanelPhotoSelect();
    return idx;
  }

  function loadImageFromUrl(url, name) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    }).then(function (blob) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () { resolve(img); };
          img.onerror = function () { reject(new Error('bad image')); };
          img.src = reader.result;
        };
        reader.onerror = function () { reject(new Error('read failed')); };
        reader.readAsDataURL(blob);
      });
    }).then(function (img) { return addPhoto(img, name); });
  }

  function loadSample() {
    setStatus('Loading sample photo…');
    return loadImageFromUrl('samples/boulevard.jpg', 'boulevard.jpg').then(function (idx) {
      for (var i = 0; i < 4; i++) state.panels[i].photo = idx;
      render();
      setStatus('Sample photo loaded into all 4 panels. Pick a panel and drag to reframe it, then Export PNG.');
    }).catch(function (err) {
      setStatus('Could not load the sample photo: ' + err.message);
    });
  }

  function loadSecondSample() {
    setStatus('Loading second sample photo…');
    return loadImageFromUrl('samples/pier.jpg', 'pier.jpg').then(function (idx) {
      state.panels[1].photo = idx;
      state.panels[2].photo = idx;
      state.panels[3].photo = idx;
      render();
      setStatus('Second sample photo loaded into panels 2–4. Hero keeps the first photo.');
    }).catch(function (err) {
      setStatus('Could not load the second sample photo: ' + err.message);
    });
  }

  function handleUpload(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    var pending = list.length;
    list.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var idx = addPhoto(img, file.name);
          // First photo ever uploaded fills every empty panel.
          for (var i = 0; i < 4; i++) if (state.panels[i].photo < 0) state.panels[i].photo = idx;
          if (--pending === 0) {
            render();
            setStatus(list.length + ' photo(s) added. Click a panel, drag to reframe, then Export PNG.');
          }
        };
        img.onerror = function () { if (--pending === 0) render(); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---- editor UI ----
  function refreshThumbs() {
    thumbsEl.innerHTML = '';
    if (!state.photos.length) {
      var span = document.createElement('span');
      span.className = 'empty';
      span.textContent = 'No photos yet.';
      thumbsEl.appendChild(span);
      return;
    }
    state.photos.forEach(function (p, i) {
      var t = document.createElement('img');
      t.src = p.src;
      t.alt = p.name;
      t.title = p.name + ' — click to put it in the selected panel';
      if (state.panels[state.selected] && state.panels[state.selected].photo === i) t.classList.add('picked');
      t.addEventListener('click', function () {
        state.panels[state.selected].photo = i;
        refreshThumbs();
        refreshPanelPhotoSelect();
        render();
      });
      thumbsEl.appendChild(t);
    });
  }

  function refreshPanelPhotoSelect() {
    var cur = state.panels[state.selected].photo;
    panelPhotoSel.innerHTML = '';
    var none = document.createElement('option');
    none.value = '-1';
    none.textContent = '(empty panel)';
    panelPhotoSel.appendChild(none);
    state.photos.forEach(function (p, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = (i + 1) + ' — ' + p.name;
      panelPhotoSel.appendChild(o);
    });
    panelPhotoSel.value = String(cur);
  }

  function syncPanelControls() {
    var p = state.panels[state.selected];
    selectedLabel.textContent = PANEL_NAMES[state.selected];
    document.getElementById('zoom').value = Math.round(p.zoom * 100);
    document.getElementById('zoomOut').textContent = Math.round(p.zoom * 100) + '%';
    document.getElementById('ox').value = Math.round(p.ox * 100);
    document.getElementById('oxOut').textContent = Math.round(p.ox * 100) + '%';
    document.getElementById('oy').value = Math.round(p.oy * 100);
    document.getElementById('oyOut').textContent = Math.round(p.oy * 100) + '%';
    refreshPanelPhotoSelect();
    refreshThumbs();
  }

  function selectPanel(i) {
    state.selected = i;
    syncPanelControls();
    render();
  }

  // Canvas pointer: click selects a panel, drag pans its photo, wheel zooms.
  var dragging = null;
  function canvasPoint(ev) {
    var r = canvas.getBoundingClientRect();
    var wh = sizeWH();
    return {
      x: (ev.clientX - r.left) / r.width * wh[0],
      y: (ev.clientY - r.top) / r.height * wh[1]
    };
  }
  function hitPanel(pt) {
    var wh = sizeWH();
    var rects = layoutFor(wh[0], wh[1]);
    for (var i = 0; i < 4; i++) {
      var rc = rects[i];
      if (pt.x >= rc.x * wh[0] && pt.x <= (rc.x + rc.w) * wh[0] &&
          pt.y >= rc.y * wh[1] && pt.y <= (rc.y + rc.h) * wh[1]) return i;
    }
    return -1;
  }

  canvas.addEventListener('pointerdown', function (ev) {
    var pt = canvasPoint(ev);
    var i = hitPanel(pt);
    if (i < 0) return;
    selectPanel(i);
    dragging = { x: pt.x, y: pt.y, panel: i };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (!dragging) return;
    var pt = canvasPoint(ev);
    var wh = sizeWH();
    var rects = layoutFor(wh[0], wh[1]);
    var rc = rects[dragging.panel];
    var p = state.panels[dragging.panel];
    p.ox += (pt.x - dragging.x) / (rc.w * wh[0]);
    p.oy += (pt.y - dragging.y) / (rc.h * wh[1]);
    p.ox = Math.max(-0.6, Math.min(0.6, p.ox));
    p.oy = Math.max(-0.6, Math.min(0.6, p.oy));
    dragging = { x: pt.x, y: pt.y, panel: dragging.panel };
    syncPanelControls();
    render();
  });
  canvas.addEventListener('pointerup', function () { dragging = null; });
  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var p = state.panels[state.selected];
    p.zoom = Math.max(1, Math.min(3, p.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
    syncPanelControls();
    render();
  }, { passive: false });

  // Wiring.
  document.getElementById('upload').addEventListener('change', function (ev) {
    handleUpload(ev.target.files);
    ev.target.value = '';
  });
  document.getElementById('loadSample').addEventListener('click', loadSample);
  document.getElementById('loadSecond').addEventListener('click', loadSecondSample);
  document.getElementById('fillAll').addEventListener('click', function () {
    if (!state.photos.length) { setStatus('Load or upload a photo first.'); return; }
    var idx = state.panels[state.selected].photo >= 0 ? state.panels[state.selected].photo : 0;
    for (var i = 0; i < 4; i++) state.panels[i].photo = idx;
    render();
    setStatus('All panels now use photo ' + (idx + 1) + '.');
  });
  document.getElementById('shuffle').addEventListener('click', function () {
    if (state.photos.length < 2) { setStatus('Load the second sample (or upload another photo) to shuffle.'); return; }
    for (var i = 0; i < 4; i++) state.panels[i].photo = Math.floor(Math.random() * state.photos.length);
    render();
    setStatus('Panel photos shuffled.');
  });
  document.querySelectorAll('.size-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.size-btn').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      state.size = b.getAttribute('data-size');
      render();
    });
  });
  document.getElementById('exportBtn').addEventListener('click', downloadExport);
  document.getElementById('titleInput').addEventListener('input', function (ev) {
    state.title = ev.target.value;
    render();
  });
  document.getElementById('subtitleInput').addEventListener('input', function (ev) {
    state.subtitle = ev.target.value;
    render();
  });
  document.getElementById('grade').addEventListener('change', function (ev) { state.grade = ev.target.checked; render(); });
  document.getElementById('halftone').addEventListener('change', function (ev) { state.halftone = ev.target.checked; render(); });
  document.getElementById('borders').addEventListener('change', function (ev) { state.borders = ev.target.checked; render(); });
  panelPhotoSel.addEventListener('change', function (ev) {
    state.panels[state.selected].photo = parseInt(ev.target.value, 10);
    refreshThumbs();
    render();
  });
  document.getElementById('zoom').addEventListener('input', function (ev) {
    state.panels[state.selected].zoom = parseInt(ev.target.value, 10) / 100;
    syncPanelControls();
    render();
  });
  document.getElementById('ox').addEventListener('input', function (ev) {
    state.panels[state.selected].ox = parseInt(ev.target.value, 10) / 100;
    syncPanelControls();
    render();
  });
  document.getElementById('oy').addEventListener('input', function (ev) {
    state.panels[state.selected].oy = parseInt(ev.target.value, 10) / 100;
    syncPanelControls();
    render();
  });
  document.getElementById('resetPanel').addEventListener('click', function () {
    state.panels[state.selected] = { photo: state.panels[state.selected].photo, zoom: 1, ox: 0, oy: 0 };
    syncPanelControls();
    render();
  });

  // Headless / test hook: the same export the button calls.
  window.__coverApp = {
    state: state,
    render: render,
    loadSample: loadSample,
    loadSecondSample: loadSecondSample,
    selectPanel: selectPanel,
    exportPNG: exportPNG,
    sizes: SIZES
  };

  syncPanelControls();
  render();
})();
