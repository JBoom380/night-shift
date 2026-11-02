(function () {
  'use strict';

  var NS = window.NS;
  var S = NS.story;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var advanceFn = null;
  var boardRedraw = null;
  var SCREENS = ['title', 'prologue', 'card', 'notebook', 'dialog', 'pause', 'board', 'ending', 'credits'];

  function $(id) { return document.getElementById(id); }

  function txt(el, s) { el.textContent = s || ''; }

  function show(name) {
    for (var i = 0; i < SCREENS.length; i++) {
      $('scr-' + SCREENS[i]).classList.toggle('on', SCREENS[i] === name);
    }
    advanceFn = null;
    if (name !== 'board') { boardRedraw = null; }
  }

  function setAdvance(fn) { advanceFn = fn; }

  function advance() {
    if (advanceFn) { advanceFn(); }
  }

  function bindScreens() {
    for (var i = 0; i < SCREENS.length; i++) {
      (function (el) {
        el.addEventListener('click', function (e) {
          if (e.target.closest && e.target.closest('button')) { return; }
          advance();
        });
      })($('scr-' + SCREENS[i]));
    }
    window.addEventListener('resize', function () {
      if (boardRedraw) { boardRedraw(); }
    });
  }

  function showTitle(onStart) {
    txt($('t-title'), S.title);
    txt($('t-sub'), S.subtitle);
    txt($('t-credit'), S.credit);
    txt($('t-disc'), S.disclaimer);
    $('btn-start').onclick = function () { onStart(); };
    show('title');
  }

  function prologue(onDone) {
    var cards = S.prologue || [];
    var idx = 0;
    function render() {
      txt($('pro-text'), cards[idx] ? cards[idx].text : '');
      txt($('pro-count'), (idx + 1) + ' of ' + cards.length);
    }
    show('prologue');
    render();
    setAdvance(function () {
      idx++;
      if (idx >= cards.length) { onDone(); return; }
      render();
    });
  }

  function openCard(i, onClose) {
    var c = S.clues[i] || {};
    txt($('c-num'), 'Card ' + (i + 1) + ' of ' + S.clues.length);
    txt($('c-object'), c.object);
    txt($('c-look'), c.look);
    txt($('c-line'), c.line);
    txt($('c-fact'), c.fact);
    txt($('c-section'), c.section);
    txt($('c-source'), c.source);
    show('card');
    var close = function () { onClose(); };
    $('btn-card-close').onclick = close;
    setAdvance(close);
  }

  function openNotebook(found, onOpen, onClose) {
    var list = $('nb-list');
    list.innerHTML = '';
    txt($('nb-count'), found.length + ' of ' + S.clues.length + ' cards');
    for (var i = 0; i < S.clues.length; i++) {
      var li = document.createElement('li');
      if (found.indexOf(i) >= 0) {
        var b = document.createElement('button');
        b.className = 'btn ghost wide';
        b.textContent = (i + 1) + '. ' + (S.clues[i].object || '');
        (function (idx) { b.onclick = function () { onOpen(idx); }; })(i);
        li.appendChild(b);
      } else {
        var s = document.createElement('p');
        s.className = 'nb-empty';
        s.textContent = (i + 1) + '. Not found yet';
        li.appendChild(s);
      }
      list.appendChild(li);
    }
    $('btn-nb-close').onclick = function () { onClose(); };
    show('notebook');
  }

  function dialog(lines, onDone) {
    var idx = 0;
    function render() {
      var l = lines[idx] || { who: '', text: '' };
      txt($('dlg-who'), l.who);
      txt($('dlg-text'), l.text);
    }
    show('dialog');
    render();
    setAdvance(function () {
      idx++;
      if (idx >= lines.length) { onDone(); return; }
      render();
    });
  }

  function pause(onResume) {
    show('pause');
    $('btn-resume').onclick = function () { onResume(); };
  }

  function shortSection(sec) {
    var m = /Sec\. [^,;]+/.exec(sec || '');
    return m ? m[0] : '';
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined) { e.textContent = text; }
    return e;
  }

  function readingPanel(label, text) {
    var d = $('detail');
    d.innerHTML = '';
    d.appendChild(el('p', 'card-num', label));
    d.appendChild(el('p', 'small-text', text));
  }

  function showDetail(i) {
    var d = $('detail');
    d.innerHTML = '';
    if (i < 0) {
      d.appendChild(el('p', 'card-num', 'The case'));
      d.appendChild(el('p', 'small-text', (S.board && S.board.intro) || ''));
      return;
    }
    var c = S.clues[i] || {};
    d.appendChild(el('p', 'card-num', 'Card ' + (i + 1) + ' of ' + S.clues.length));
    d.appendChild(el('p', 'detail-object', c.object || ''));
    d.appendChild(el('p', 'card-meta', c.section || ''));
    d.appendChild(el('p', 'small-text', c.fact || ''));
    var pins = $('pins').children;
    for (var k = 0; k < pins.length; k++) {
      pins[k].classList.toggle('selected', k === i);
    }
  }

  function buildPins() {
    var wrap = $('pins');
    wrap.innerHTML = '';
    for (var i = 0; i < S.clues.length; i++) {
      var c = S.clues[i];
      var d = el('div', 'pin');
      d.setAttribute('role', 'button');
      d.setAttribute('tabindex', '0');
      d.appendChild(el('span', 'pin-n', String(i + 1)));
      d.appendChild(el('b', '', c.object || ''));
      d.appendChild(el('span', 'pin-sec', shortSection(c.section)));
      (function (idx) {
        d.addEventListener('click', function () { showDetail(idx); });
      })(i);
      wrap.appendChild(d);
    }
  }

  function drawStrings() {
    var inner = $('board-inner');
    var svg = $('strings');
    var knot = $('knot');
    svg.setAttribute('width', inner.offsetWidth);
    svg.setAttribute('height', inner.offsetHeight);
    svg.innerHTML = '';
    var base = inner.getBoundingClientRect();
    var kr = knot.getBoundingClientRect();
    var cx = kr.left + kr.width / 2 - base.left;
    var cy = kr.top + 6 - base.top;
    var pins = $('pins').children;
    for (var i = 0; i < pins.length; i++) {
      var r = pins[i].getBoundingClientRect();
      var x1 = r.left + r.width / 2 - base.left;
      var y1 = r.top + 6 - base.top;
      var line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', cx);
      line.setAttribute('y2', cy);
      line.setAttribute('class', 'string');
      svg.appendChild(line);
    }
  }

  function board(onDone) {
    var b = S.board || {};
    buildPins();
    showDetail(-1);
    var nums = $('nums');
    nums.innerHTML = '';
    var numbers = b.numbers || [];
    for (var i = 0; i < numbers.length; i++) {
      var n = numbers[i];
      var row = document.createElement('div');
      row.className = 'num-row';
      var lab = document.createElement('p');
      lab.className = 'num-label';
      lab.textContent = n.label || '';
      var val = document.createElement('p');
      val.className = 'num-value';
      val.textContent = n.value || '';
      var src = document.createElement('p');
      src.className = 'num-src';
      src.textContent = n.source || '';
      row.appendChild(lab);
      row.appendChild(val);
      row.appendChild(src);
      nums.appendChild(row);
    }

    var sus = $('suspects');
    sus.innerHTML = '';
    var next = $('btn-verdict-next');
    next.hidden = true;
    var list = b.suspects || [];
    for (var j = 0; j < list.length; j++) {
      var s = list[j];
      var btn = document.createElement('button');
      btn.className = 'btn wide';
      btn.textContent = s.name || '';
      (function (sp) {
        btn.onclick = function () {
          if (sp.correct) {
            readingPanel('Verdict', b.verdict || '');
            next.hidden = false;
            sus.classList.add('done');
          } else {
            readingPanel('Rebuttal', sp.rebuttal || '');
          }
        };
      })(s);
      sus.appendChild(btn);
    }
    next.onclick = function () { onDone(); };

    show('board');
    boardRedraw = function () {
      if ($('scr-board').classList.contains('on')) { drawStrings(); }
    };
    requestAnimationFrame(function () { drawStrings(); });
    setTimeout(drawStrings, 250);
  }

  function ending(onDone) {
    var lines = S.ending || [];
    var idx = 0;
    function render() {
      txt($('end-text'), lines[idx] ? lines[idx].text : '');
    }
    show('ending');
    render();
    setAdvance(function () {
      idx++;
      if (idx >= lines.length) { onDone(); return; }
      render();
    });
  }

  function credits() {
    txt($('cr-title'), S.title);
    txt($('cr-credit'), S.credit);
    txt($('cr-disc'), S.disclaimer);
    var list = $('cr-sources');
    list.innerHTML = '';
    var src = S.sources || [];
    for (var i = 0; i < src.length; i++) {
      var li = document.createElement('li');
      li.textContent = src[i];
      list.appendChild(li);
    }
    show('credits');
  }

  function hud(state) {
    var root = $('hud');
    root.hidden = !state.visible;
    if (!state.visible) { return; }
    txt($('hud-count'), 'Clues ' + state.found + ' of ' + S.clues.length);
    $('btn-inspect').hidden = !(state.touch && state.inspectable);
    $('btn-notebook').hidden = !state.touch;
    $('btn-board').hidden = !state.boardReady;
    txt($('hud-prompt'), state.prompt || '');
    txt($('hud-hint'), state.hint || '');
  }

  NS.UI = {
    show: show,
    advance: advance,
    bindScreens: bindScreens,
    showTitle: showTitle,
    prologue: prologue,
    openCard: openCard,
    openNotebook: openNotebook,
    dialog: dialog,
    pause: pause,
    board: board,
    ending: ending,
    credits: credits,
    hud: hud
  };
})();
