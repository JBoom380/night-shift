var NS = window.NS = window.NS || {};

(function () {
  'use strict';

  var clues = [];
  for (var i = 0; i < 9; i++) {
    clues.push({ id: 'clue' + (i + 1), object: 'Clue ' + (i + 1), look: '', line: '', fact: '', section: '', source: '' });
  }

  var suspects = [
    { id: 'landlord', name: 'The landlord', correct: false, rebuttal: 'Story file missing.' },
    { id: 'students', name: 'The students', correct: false, rebuttal: 'Story file missing.' },
    { id: 'developers', name: 'The developers', correct: false, rebuttal: 'Story file missing.' },
    { id: 'code', name: 'The code', correct: true, rebuttal: '' }
  ];

  NS.story = window.NS_STORY || {
    title: 'NIGHT SHIFT',
    subtitle: '',
    credit: '',
    disclaimer: '',
    prologue: [{ text: 'Story file missing.' }],
    clues: clues,
    landlord: { trigger_after: 5, lines: [{ who: 'WALT', text: 'Story file missing.' }] },
    board: { intro: '', numbers: [], suspects: suspects, verdict: '' },
    ending: [{ text: 'Story file missing.' }],
    sources: []
  };
})();

NS.Music = (function () {
  'use strict';

  var TRACKS = {
    title: 'assets/music/01_neon_rain_main_theme.mp3',
    prologue: 'assets/music/02_the_office.mp3',
    alley: 'assets/music/05_somebody_elses_rain.mp3',
    landlord: 'assets/music/06_interrogation.mp3',
    board: 'assets/music/09_the_glass_saint.mp3',
    ending: 'assets/music/03_velas_theme.mp3',
    rain: 'assets/rain/rain_13_ext_alley_gutter.mp3'
  };
  var MUSIC_VOL = 0.7;
  var RAIN_VOL = 0.3;
  var unlocked = false;
  var curKey = null;
  var els = [null, null];
  var cur = -1;
  var rain = null;

  function tween(el, to, secs) {
    if (el._tw) { clearInterval(el._tw); }
    var from = el.volume;
    var steps = Math.max(1, Math.round(secs * 20));
    var n = 0;
    el._tw = setInterval(function () {
      n++;
      var v = from + (to - from) * Math.min(1, n / steps);
      el.volume = Math.max(0, Math.min(1, v));
      if (n >= steps) {
        clearInterval(el._tw);
        el._tw = null;
        if (to === 0) { el.pause(); }
      }
    }, 50);
  }

  function playEl(el) {
    var p = el.play();
    if (p && p.catch) { p.catch(function () {}); }
  }

  function play(key, secs) {
    curKey = key;
    if (!unlocked) { return; }
    var old = cur >= 0 ? els[cur] : null;
    if (old && old.getAttribute('data-key') === key && !old.paused) { return; }
    var next = cur === 0 ? 1 : 0;
    var el = els[next];
    if (!el) {
      el = new Audio();
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
      els[next] = el;
    }
    el.setAttribute('data-key', key);
    el.src = TRACKS[key];
    el.currentTime = 0;
    playEl(el);
    tween(el, MUSIC_VOL, secs === undefined ? 1.5 : secs);
    if (old) { tween(old, 0, secs === undefined ? 1.5 : secs); }
    cur = next;
  }

  function unlock() {
    if (unlocked) { return; }
    unlocked = true;
    rain = new Audio();
    rain.src = TRACKS.rain;
    rain.loop = true;
    rain.volume = 0;
    playEl(rain);
    tween(rain, RAIN_VOL, 2);
    if (curKey) { play(curKey, 0.5); }
  }

  return { play: play, unlock: unlock };
})();
