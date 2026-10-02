// 더베럴 뮤직 관리자 화면 (빌드 과정 없는 순수 자바스크립트)
(function () {
  'use strict';

  var app = document.getElementById('app');
  var state = { content: null, dirty: false, tab: 'basic' };

  /* ───── 작은 도우미 ───── */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else if (k === 'className') el.className = v;
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function set(obj, path, value) {
    var keys = path.split('.');
    var last = keys.pop();
    var target = keys.reduce(function (o, k) { if (o[k] == null) o[k] = {}; return o[k]; }, obj);
    target[last] = value;
  }
  function api(path, opts) {
    opts = opts || {};
    return fetch(path, Object.assign({ credentials: 'same-origin' }, opts)).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var e = new Error(data.error || '요청에 실패했습니다.'); e.status = res.status; throw e; }
        return data;
      });
    });
  }
  function youtubeId(url) {
    var m = String(url || '').match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  var uid = 0;
  function nextId() { uid += 1; return 'f' + uid; }

  /* ───── 사진 자동 압축: 긴 변 2000px, WebP(안 되면 JPEG) ───── */
  function compressImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.resolve(file);
    return new Promise(function (resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var max = 2000;
        var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * scale), hgt = Math.round(img.naturalHeight * scale);
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = hgt;
        canvas.getContext('2d').drawImage(img, 0, 0, w, hgt);
        var done = function (blob) { resolve(blob && blob.size < file.size ? blob : file); };
        canvas.toBlob(function (webp) {
          if (webp && webp.type === 'image/webp') done(webp);
          else canvas.toBlob(done, 'image/jpeg', 0.85);
        }, 'image/webp', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function upload(file) {
    if (file.size > 50 * 1024 * 1024 && !/^image\//.test(file.type)) {
      return Promise.reject(new Error('영상은 50MB 이하만 올릴 수 있습니다. 긴 영상은 유튜브 링크를 써 주세요.'));
    }
    return compressImage(file).then(function (blob) {
      return api('/api/upload', { method: 'POST', headers: { 'content-type': blob.type || file.type }, body: blob });
    }).then(function (d) { return d.url; });
  }

  function markDirty() {
    state.dirty = true;
    setStatus('저장하지 않은 변경 사항이 있습니다.');
    var btn = document.getElementById('save-btn');
    if (btn) btn.disabled = false;
  }
  function setStatus(text, err) {
    var el = document.getElementById('save-status');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'status' + (err ? ' err' : '');
  }

  /* ───── 입력 칸 ───── */
  function textField(obj, f) {
    var id = nextId();
    var input = h(f.area ? 'textarea' : 'input', {
      id: id, placeholder: f.placeholder || null,
      oninput: function (e) { set(obj, f.key, e.target.value); markDirty(); },
    });
    input.value = get(obj, f.key) || '';
    return h('div', { className: 'field' }, [h('label', { for: id }, [h('span', { text: f.label })]), input]);
  }

  function linesField(obj, f) {
    var id = nextId();
    var ta = h('textarea', {
      id: id,
      oninput: function (e) { set(obj, f.key, e.target.value.split('\n')); markDirty(); },
    });
    ta.value = (get(obj, f.key) || []).join('\n');
    return h('div', { className: 'field' }, [
      h('label', { for: id }, [h('span', { text: f.label })]), ta,
      h('p', { className: 'hint', text: f.hint || '한 줄에 하나씩 적어 주세요.' }),
    ]);
  }

  function preview(m) {
    if (!m || !m.url) return null;
    var box = h('div', { className: 'media-preview' });
    if (m.type === 'youtube') {
      var id = youtubeId(m.url);
      if (!id) return h('p', { className: 'hint', text: '유튜브 주소를 확인해 주세요.' });
      box.style.aspectRatio = '16 / 9';
      box.appendChild(h('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + id, title: '미리보기', allowfullscreen: true }));
    } else if (m.type === 'video') {
      box.appendChild(h('video', { src: m.url, controls: true, playsinline: true, preload: 'metadata' }));
    } else {
      box.appendChild(h('img', { src: m.url, alt: '' }));
    }
    return box;
  }

  function uploadButton(accept, label, onDone) {
    var status = h('span', { className: 'status' });
    var input = h('input', { type: 'file', accept: accept, hidden: true });
    var lab = h('label', { className: 'mini' }, [label, input]);
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      input.value = '';
      if (!f) return;
      status.className = 'status'; status.textContent = '올리는 중…';
      upload(f).then(function (url) { status.textContent = ''; onDone(url); })
        .catch(function (e) { status.className = 'status err'; status.textContent = '업로드 실패: ' + e.message; });
    });
    return h('div', { className: 'upload-row' }, [lab, status]);
  }

  function imageField(obj, f) {
    var wrap = h('div', { className: 'field' });
    function draw() {
      wrap.innerHTML = '';
      var v = get(obj, f.key);
      wrap.appendChild(h('span', { text: f.label }));
      var row = h('div', { className: 'media-edit' }, [
        v ? preview({ type: 'image', url: v }) : null,
        h('div', { className: 'upload-row' }, [
          uploadButton('image/*', v ? '이미지 바꾸기' : '이미지 올리기', function (url) { set(obj, f.key, url); markDirty(); draw(); }),
          v ? h('button', { type: 'button', className: 'mini danger', text: '이미지 빼기',
            onclick: function () { set(obj, f.key, undefined); markDirty(); draw(); } }) : null,
        ]),
      ]);
      wrap.appendChild(row);
    }
    draw();
    return wrap;
  }

  function mediaField(obj, f) {
    var wrap = h('div', { className: 'field' });
    function draw() {
      wrap.innerHTML = '';
      var m = get(obj, f.key) || { type: 'image', url: '' };
      var commit = function (patch, redraw) {
        set(obj, f.key, Object.assign({}, m, patch)); markDirty();
        if (redraw) draw();
      };
      var selId = nextId(), altId = nextId(), urlId = nextId();
      var sel = h('select', { id: selId, onchange: function (e) { commit({ type: e.target.value, url: '' }, true); } }, [
        h('option', { value: 'image', text: '이미지' }),
        h('option', { value: 'video', text: '영상 파일 (mp4)' }),
        h('option', { value: 'youtube', text: '유튜브 링크' }),
      ]);
      sel.value = m.type;
      var alt = h('input', { id: altId, oninput: function (e) { m = Object.assign({}, m, { alt: e.target.value }); set(obj, f.key, m); markDirty(); } });
      alt.value = m.alt || '';

      var source;
      if (m.type === 'youtube') {
        var yt = h('input', { id: urlId, placeholder: 'https://www.youtube.com/watch?v=...',
          onchange: function (e) { commit({ url: e.target.value.trim() }, true); } });
        yt.value = m.url || '';
        source = h('div', { className: 'field' }, [h('label', { for: urlId }, [h('span', { text: '유튜브 주소' })]), yt]);
      } else {
        source = uploadButton(m.type === 'video' ? 'video/mp4,video/webm' : 'image/*', m.url ? '파일 바꾸기' : '파일 올리기',
          function (url) { commit({ url: url }, true); });
      }

      wrap.appendChild(h('span', { text: f.label }));
      wrap.appendChild(h('div', { className: 'media-edit' }, [
        h('div', { className: 'row2' }, [
          h('div', { className: 'field' }, [h('label', { for: selId }, [h('span', { text: '종류' })]), sel]),
          h('div', { className: 'field' }, [h('label', { for: altId }, [h('span', { text: '설명 (화면에 안 보이는 대체 텍스트)' })]), alt]),
        ]),
        source,
        m.type === 'video' ? h('p', { className: 'hint', text: '영상 파일은 50MB 이하 mp4. 길거나 큰 영상은 유튜브에 올리고 링크로 넣어 주세요.' }) : null,
        m.type === 'image' ? h('p', { className: 'hint', text: '사진은 올릴 때 자동으로 알맞은 크기로 줄여서 저장됩니다.' }) : null,
        preview(m),
        f.allowEmpty && get(obj, f.key) ? h('button', { type: 'button', className: 'mini danger', style: 'justify-self:start', text: '비우기 (기본 그림 사용)',
          onclick: function () { set(obj, f.key, null); markDirty(); draw(); } }) : null,
      ]));
    }
    draw();
    return wrap;
  }

  function listField(obj, f) {
    var wrap = h('div', { className: 'panel', style: 'padding-top:0' });
    function draw() {
      wrap.innerHTML = '';
      var items = get(obj, f.key) || [];
      items.forEach(function (item, i) {
        var move = function (d) {
          var t = items[i]; items[i] = items[i + d]; items[i + d] = t; markDirty(); draw();
        };
        wrap.appendChild(h('div', { className: 'item' }, [
          h('div', { className: 'item-head' }, [
            h('b', { text: f.title(item, i) }),
            h('div', { className: 'mini-row' }, [
              h('button', { type: 'button', className: 'mini', 'aria-label': '위로', text: '↑', disabled: i === 0, onclick: function () { move(-1); } }),
              h('button', { type: 'button', className: 'mini', 'aria-label': '아래로', text: '↓', disabled: i === items.length - 1, onclick: function () { move(1); } }),
              h('button', { type: 'button', className: 'mini danger', text: '삭제', onclick: function () { items.splice(i, 1); markDirty(); draw(); } }),
            ]),
          ]),
        ].concat(renderFields(item, f.fields))));
      });
      wrap.appendChild(h('button', { type: 'button', className: 'add', text: '+ 항목 추가',
        onclick: function () { items.push(f.make()); set(obj, f.key, items); markDirty(); draw(); } }));
    }
    draw();
    return wrap;
  }

  function renderFields(obj, fields) {
    return fields.map(function (f) {
      if (f.row) return h('div', { className: 'row2' }, renderFields(obj, f.row));
      if (f.heading) return h('h3', { text: f.heading });
      if (f.hint) return h('p', { className: 'hint', text: f.hint });
      switch (f.type) {
        case 'lines': return linesField(obj, f);
        case 'image': return imageField(obj, f);
        case 'media': return mediaField(obj, f);
        case 'list': return listField(obj, f);
        default: return textField(obj, f);
      }
    });
  }

  /* ───── 탭별 편집 항목 ───── */
  var T = function (key, label, extra) { return Object.assign({ key: key, label: label }, extra || {}); };
  var TABS = [
    { id: 'basic', name: '기본 정보', fields: [
      { row: [T('brand.name', '학원 이름'), T('brand.nameEn', '영문 이름')] },
      { row: [T('contact.phone', '전화번호'), T('contact.email', '이메일')] },
      T('contact.instagram', '인스타그램 주소', { placeholder: 'https://www.instagram.com/...' }),
      T('contact.blog', '블로그 주소', { placeholder: 'https://blog.naver.com/...' }),
      T('contact.kakao', '카카오톡 채널 주소', { placeholder: 'https://pf.kakao.com/...' }),
      { hint: '비워 둔 링크는 홈페이지에 표시되지 않습니다.' },
      { row: [T('business.owner', '대표자'), T('business.bizNo', '사업자등록번호')] },
    ] },
    { id: 'hero', name: '메인', fields: [
      T('hero.eyebrow', '작은 제목 (영문 권장)'),
      T('hero.title', '큰 제목 (줄바꿈 가능)', { area: true }),
      T('hero.lead', '소개 문구', { area: true }),
      T('hero.ctaLabel', '상담 버튼 문구'),
      T('hero.media', '대표 이미지 / 영상 (영상은 소리 없이 자동 반복 재생)', { type: 'media', allowEmpty: true }),
    ] },
    { id: 'about', name: '학원소개', fields: [
      T('about.paragraphs', '소개 글', { type: 'lines', hint: '한 줄이 한 문단입니다.' }),
      T('about.image', '소개 사진 (선택)', { type: 'image' }),
      { heading: '요약 정보' },
      T('about.facts', '', { type: 'list', make: function () { return { label: '', value: '' }; },
        title: function (x, i) { return x.label || '항목 ' + (i + 1); },
        fields: [{ row: [T('label', '제목'), T('value', '값')] }] }),
      { heading: '수업 과정' },
      T('classes', '', { type: 'list', make: function () { return { tag: '', title: '', desc: '' }; },
        title: function (x, i) { return x.title || '과정 ' + (i + 1); },
        fields: [
          { row: [T('title', '과정명'), T('tag', '영문 태그')] },
          T('desc', '설명', { area: true }),
          T('image', '사진 (선택)', { type: 'image' }),
        ] }),
    ] },
    { id: 'space', name: '공간 사진', fields: [
      { hint: '첫 번째 항목이 크게 표시됩니다. 화살표로 순서를 바꿀 수 있어요.' },
      T('gallery', '', { type: 'list', make: function () { return { title: '', caption: '', media: { type: 'image', url: '' } }; },
        title: function (x, i) { return x.title || '사진 ' + (i + 1); },
        fields: [
          { row: [T('title', '공간 이름'), T('caption', '설명')] },
          T('media', '사진 / 영상', { type: 'media' }),
        ] }),
    ] },
    { id: 'video', name: '영상', fields: [
      { hint: '유튜브 주소를 넣으면 홈페이지에 ‘영상’ 메뉴와 섹션이 생깁니다. 비우면 사라집니다.' },
      T('videos', '', { type: 'list', make: function () { return { title: '', url: '' }; },
        title: function (x, i) { return x.title || '영상 ' + (i + 1); },
        fields: [T('title', '제목'), T('url', '유튜브 주소', { placeholder: 'https://youtu.be/...' })] }),
    ] },
    { id: 'price', name: '수강료', fields: [
      T('prices', '', { type: 'list', make: function () { return { name: '', detail: '', note: '', price: '' }; },
        title: function (x, i) { return x.name || '과정 ' + (i + 1); },
        fields: [
          { row: [T('name', '과정'), T('price', '수강료', { placeholder: '200,000원' })] },
          { row: [T('detail', '구성'), T('note', '작은 안내 (선택)')] },
        ] }),
      T('priceNotes', '표 아래 안내 문구', { type: 'lines' }),
    ] },
    { id: 'map', name: '위치', fields: [
      T('location.address', '주소'),
      T('location.transit', '대중교통 안내', { type: 'lines' }),
      T('location.parking', '주차 안내', { area: true }),
      T('location.hours', '운영 시간'),
      T('location.mapUrl', '지도 링크 (네이버/카카오 지도 공유 주소)'),
      T('location.mapImage', '약도 이미지 (선택, 없으면 기본 그림)', { type: 'image' }),
    ] },
  ];

  /* ───── 화면 ───── */
  function showLogin(message) {
    app.innerHTML = '';
    var status = h('p', { className: 'status err', text: message || '' });
    var pw = h('input', { id: 'password', type: 'password', autocomplete: 'current-password', required: true });
    var btn = h('button', { className: 'btn primary', type: 'submit', text: '로그인' });
    var form = h('form', { className: 'login', onsubmit: function (e) {
      e.preventDefault();
      btn.disabled = true; btn.textContent = '로그인 중…'; status.textContent = '';
      api('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw.value }) })
        .then(load)
        .catch(function (err) { status.textContent = err.message; btn.disabled = false; btn.textContent = '로그인'; pw.select(); });
    } }, [
      h('h1', { text: '관리자 로그인' }),
      h('div', { className: 'field' }, [h('label', { for: 'password' }, [h('span', { text: '비밀번호' })]), pw]),
      status, btn,
      h('a', { className: 'hint', href: '/', text: '← 홈페이지로' }),
    ]);
    app.appendChild(form);
    pw.focus();
  }

  function showEditor() {
    var c = state.content;
    app.innerHTML = '';
    var panel = h('div', { className: 'panel' });
    var tabs = h('div', { className: 'admin-tabs', role: 'tablist' });

    function drawTab() {
      panel.innerHTML = '';
      var tab = TABS.filter(function (t) { return t.id === state.tab; })[0];
      renderFields(c, tab.fields).forEach(function (el) { panel.appendChild(el); });
      Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute('aria-selected', String(b.dataset.id === state.tab)); });
    }
    TABS.forEach(function (t) {
      var b = h('button', { type: 'button', role: 'tab', text: t.name, onclick: function () { state.tab = t.id; drawTab(); } });
      b.dataset.id = t.id;
      tabs.appendChild(b);
    });

    var saveBtn = h('button', { id: 'save-btn', type: 'button', className: 'btn primary', text: '저장하기', disabled: !state.dirty, onclick: save });
    app.appendChild(h('div', { className: 'admin' }, [
      h('div', { className: 'admin-top' }, [
        h('h1', { text: (c.brand.name || '더베럴 뮤직') + ' 관리자' }),
        h('div', { className: 'actions' }, [
          h('a', { className: 'mini', href: '/', target: '_blank', rel: 'noopener', style: 'padding:6px 12px;text-decoration:none', text: '홈페이지 보기' }),
          h('button', { type: 'button', className: 'mini', style: 'padding:6px 12px', text: '로그아웃', onclick: function () {
            api('/api/logout', { method: 'POST' }).then(function () { state.dirty = false; showLogin(); });
          } }),
        ]),
      ]),
      tabs, panel,
      h('div', { className: 'savebar' }, [h('span', { id: 'save-status', className: 'status' }),
        h('button', { id: 'preview-btn', type: 'button', className: 'btn', text: '미리보기', onclick: openPreview }), saveBtn]),
    ]));
    drawTab();
  }


  /* ───── 미리보기: 저장하지 않고 지금 고친 내용으로 홈페이지를 보여 준다 ───── */
  var previewEl = null;
  function closePreview() {
    if (!previewEl) return;
    previewEl.remove(); previewEl = null;
    document.body.style.overflow = '';
    var btn = document.getElementById('preview-btn');
    if (btn) btn.focus();
  }
  function openPreview() {
    closePreview();
    var frame = h('iframe', { title: '홈페이지 미리보기', sandbox: 'allow-scripts allow-popups' });
    var stage = h('div', { className: 'pv-stage' }, [h('div', { className: 'pv-device', id: 'pv-device' }, [frame])]);
    var status = h('span', { className: 'status', text: '화면을 만드는 중…' });
    var sizeBtn = function (label, mode) {
      return h('button', { type: 'button', className: 'mini', 'aria-pressed': String(mode === 'desktop'), text: label, onclick: function (e) {
        document.getElementById('pv-device').className = 'pv-device' + (mode === 'mobile' ? ' mobile' : '');
        Array.prototype.forEach.call(e.target.parentNode.children, function (b) { b.setAttribute('aria-pressed', String(b === e.target)); });
      } });
    };
    var saveFromPreview = h('button', { type: 'button', className: 'btn primary', text: '이대로 저장하기', disabled: !state.dirty,
      onclick: function () { closePreview(); save(); } });
    previewEl = h('div', { className: 'pv', role: 'dialog', 'aria-modal': 'true', 'aria-label': '홈페이지 미리보기' }, [
      h('div', { className: 'pv-bar' }, [
        h('b', { text: '미리보기' }),
        h('span', { className: 'hint', text: state.dirty ? '아직 저장 전 내용입니다. 홈페이지에는 저장해야 반영돼요.' : '현재 홈페이지와 같은 내용입니다.' }),
        h('div', { className: 'pv-sizes' }, [sizeBtn('PC', 'desktop'), sizeBtn('모바일', 'mobile')]),
        h('div', { className: 'pv-actions' }, [
          status,
          h('button', { type: 'button', className: 'mini', text: '닫기', onclick: closePreview }),
          saveFromPreview,
        ]),
      ]),
      stage,
    ]);
    document.body.appendChild(previewEl);
    document.body.style.overflow = 'hidden';
    fetch('/api/preview', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state.content) })
      .then(function (res) {
        if (res.status === 401) throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
        if (!res.ok) throw new Error('미리보기를 만들지 못했습니다.');
        return res.text();
      })
      .then(function (html) { frame.srcdoc = html; status.textContent = ''; })
      .catch(function (e) { status.className = 'status err'; status.textContent = e.message; });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePreview(); });

  function save() {
    var btn = document.getElementById('save-btn');
    btn.disabled = true; btn.textContent = '저장 중…';
    api('/api/content', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(state.content) })
      .then(function () {
        state.dirty = false;
        btn.textContent = '저장하기';
        setStatus('저장했습니다. 홈페이지에 바로 반영됩니다.');
      })
      .catch(function (e) {
        btn.disabled = false; btn.textContent = '저장하기';
        if (e.status === 401) setStatus('로그인이 만료되었습니다. 새 탭에서 다시 로그인한 뒤 저장해 주세요.', true);
        else setStatus(e.message, true);
      });
  }

  function load() {
    return api('/api/content').then(function (content) {
      state.content = content;
      state.dirty = false;
      showEditor();
    }).catch(function (e) {
      if (e.status === 401) showLogin();
      else showLogin(e.message);
    });
  }

  window.addEventListener('beforeunload', function (e) {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  load();
})();
