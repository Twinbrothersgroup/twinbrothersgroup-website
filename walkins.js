/* TBG Walk-Ins — field tool logic.
   Lead/route data lives in walkins-data.js (window.TBG). Visit state is stored
   per-phone in localStorage so it works offline at a job site. "Sync" exports the
   day's outcomes + notes (share sheet / clipboard / email) to push back into the
   Notion CRM. */
(function () {
  var DATA = (window.TBG && window.TBG.companies) || [];
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var OUTCOMES = ['Met DM', 'Left card', 'Gatekeeper', 'Follow-up', 'No answer', 'Not interested'];
  var SKEY = 'tbg_walkins_v1';
  var state = load();
  var current = pickDefaultDay();

  function load() { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(SKEY, JSON.stringify(state)); } catch (e) {} }
  function st(id) { return (state[id] = state[id] || { outcome: '', notes: '' }); }

  function pickDefaultDay() {
    var d = new Date().getDay(); // 0 Sun .. 6 Sat
    if (d >= 1 && d <= 5) return DAYS[d - 1];
    return 'Mon';
  }
  function byDay(day) { return DATA.filter(function (c) { return c.day === day; })
    .sort(function (a, b) { return (a.order || 99) - (b.order || 99); }); }
  function done(c) { return !!st(c.id).outcome; }

  function fmtDate() {
    try { return new Date().toLocaleDateString('en-US',
      { weekday: 'long', month: 'short', day: 'numeric' }); } catch (e) { return ''; }
  }

  function mapsHref(c) {
    var q = encodeURIComponent(c.address || c.company);
    return 'https://www.google.com/maps/dir/?api=1&destination=' + q;
  }
  function telHref(p) { return 'tel:' + (p || '').replace(/[^+\d]/g, ''); }

  function esc(s) { return (s || '').replace(/[&<>"]/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

  function priClass(p) { return p === 'P1' ? 'b-p1' : p === 'P2' ? 'b-p2' : 'b-p3'; }

  function renderTabs() {
    var el = document.getElementById('tabs');
    el.innerHTML = '';
    DAYS.forEach(function (day) {
      var items = byDay(day);
      var d = items.filter(done).length;
      var t = document.createElement('button');
      t.className = 'tab' + (day === current ? ' active' : '');
      t.innerHTML = day + '<span class="n">' + d + '/' + items.length + '</span>';
      t.onclick = function () { current = day; render(); window.scrollTo(0, 0); };
      el.appendChild(t);
    });
  }

  function card(c) {
    var s = st(c.id);
    var el = document.createElement('div');
    el.className = 'card' + (done(c) ? ' done' : '');

    var badges = '<span class="badge ' + priClass(c.priority) + '">' + esc(c.priorityLabel || c.priority) + '</span>'
      + (c.region ? '<span class="badge b-region">' + esc(c.region) + '</span>' : '')
      + (c.status ? '<span class="badge b-status">' + esc(c.status) + '</span>' : '');

    var meta = '';
    if (c.contact) meta += '<div class="row"><span class="ic">👤</span><span>' + esc(c.contact)
      + (c.contactTitle ? ' <span class="k">· ' + esc(c.contactTitle) + '</span>' : '') + '</span></div>';
    if (c.address) meta += '<div class="row"><span class="ic">📍</span><span>' + esc(c.address) + '</span></div>';
    if (c.project) meta += '<div class="row"><span class="ic">🏗️</span><span><span class="k">Hook:</span> ' + esc(c.project) + '</span></div>';
    if (c.nextStep) meta += '<div class="row"><span class="ic">🎯</span><span><span class="k">Goal:</span> ' + esc(c.nextStep) + '</span></div>';

    var chips = OUTCOMES.map(function (o) {
      return '<span class="chip' + (s.outcome === o ? ' sel' : '') + '" data-o="' + o + '">' + o + '</span>';
    }).join('');

    el.innerHTML =
      '<div class="crow"><h3 class="cname">' + (c.order ? c.order + '. ' : '') + esc(c.company) + '</h3></div>'
      + '<div class="badges">' + badges + '</div>'
      + '<div class="meta">' + meta + '</div>'
      + '<div class="actions">'
      +   (c.phone ? '<a class="btn call" href="' + telHref(c.phone) + '">📞 Call</a>' : '<span class="btn" style="opacity:.4">No phone</span>')
      +   '<a class="btn dir" href="' + mapsHref(c) + '" target="_blank" rel="noopener">🧭 Directions</a>'
      + '</div>'
      + (c.opener ? '<div class="toggle">▸ Opening pitch &amp; notes</div>'
        + '<div class="opener"><h4>Say this</h4><p>' + esc(c.opener) + '</p>'
        + (c.intel ? '<h4>Intel</h4><p>' + esc(c.intel) + '</p>' : '') + '</div>' : '')
      + '<div class="outcome"><div class="lab">Outcome</div><div class="chips">' + chips + '</div>'
      + '<textarea placeholder="Notes — who you met, next step, when to follow up…">' + esc(s.notes) + '</textarea></div>';

    // toggle opener
    var tog = el.querySelector('.toggle');
    if (tog) tog.onclick = function () {
      var op = el.querySelector('.opener');
      var open = op.classList.toggle('open');
      tog.innerHTML = (open ? '▾' : '▸') + ' Opening pitch &amp; notes';
    };
    // outcome chips
    el.querySelectorAll('.chip').forEach(function (ch) {
      ch.onclick = function () {
        var o = ch.getAttribute('data-o');
        s.outcome = (s.outcome === o) ? '' : o;
        save(); render();
      };
    });
    // notes
    var ta = el.querySelector('textarea');
    ta.oninput = function () { s.notes = ta.value; save(); updateProgress(); };
    return el;
  }

  function updateProgress() {
    var items = byDay(current);
    var d = items.filter(done).length;
    document.getElementById('prog').innerHTML = '<b>' + d + '</b> / ' + items.length + ' visited';
    renderTabs();
  }

  function render() {
    document.getElementById('today').textContent = fmtDate();
    var meta = (window.TBG && window.TBG.dayNotes && window.TBG.dayNotes[current]) || '';
    document.getElementById('daytip').innerHTML = meta || '';
    document.getElementById('daytip').style.display = meta ? 'block' : 'none';
    document.getElementById('dayLabel').textContent = current + ' route';
    renderTabs();
    var list = document.getElementById('list');
    list.innerHTML = '';
    var items = byDay(current);
    if (!items.length) { list.innerHTML = '<div class="empty">No stops planned for ' + current + '.</div>'; }
    items.forEach(function (c) { list.appendChild(card(c)); });
    updateProgress();
  }

  function syncDay() {
    var items = byDay(current);
    var lines = ['TBG Walk-Ins — ' + current + ' (' + fmtDate() + ')', ''];
    items.forEach(function (c) {
      var s = st(c.id);
      lines.push('• ' + c.company + ' — ' + (s.outcome || 'NOT VISITED'));
      if (s.notes) lines.push('   ' + s.notes.replace(/\n/g, ' '));
    });
    var text = lines.join('\n');
    if (navigator.share) {
      navigator.share({ title: 'TBG Walk-Ins ' + current, text: text }).catch(function () { fallback(text); });
    } else { fallback(text); }
  }
  function fallback(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { alert('Day log copied. Paste it to Rafael / the CRM.'); },
        function () { mail(text); });
    } else { mail(text); }
  }
  function mail(text) {
    window.location.href = 'mailto:rafael@twinbrothersgroup.com?subject='
      + encodeURIComponent('TBG Walk-Ins log — ' + current)
      + '&body=' + encodeURIComponent(text);
  }

  document.getElementById('btnSync').onclick = syncDay;
  document.getElementById('btnReset').onclick = function () {
    if (!confirm('Clear outcomes & notes for ' + current + '?')) return;
    byDay(current).forEach(function (c) { delete state[c.id]; });
    save(); render();
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  }
  render();
})();
