var IMG_PREFIX = window.IMG_PREFIX || '';
var allPosts = [];
var postsData = [];
var fnRefCounts = {}, fnRefs = {};

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatText(str) {
  if (!str) return '';
  var saved = {}, n = 0;
  str = str.replace(/\\(.)/g, function(_, c) { var k = '\x00' + n++; saved[k] = c; return k; });
  str = str.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  str = str.replace(/~~(.+?)~~/g, '<s>$1</s>');
  str = str.replace(/\+\+(.+?)\+\+/g, '<u>$1</u>');
  str = str.replace(/==(.+?)==/g, '<mark>$1</mark>');
  str = str.replace(/\|\|(.+?)\|\|/g, '<span class="blog-spoiler">$1</span>');
  str = str.replace(/\^(.+?)\^/g, '<sup>$1</sup>');
  str = str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  str = str.replace(/__(.+?)__/g, '<strong>$1</strong>');
  str = str.replace(/\*(.+?)\*/g, '<em>$1</em>');
  str = str.replace(/_(.+?)_/g, '<em>$1</em>');
  str = str.replace(/~(.+?)~/g, '<sub>$1</sub>');
  str = str.replace(/`(.+?)`/g, '<code>$1</code>');
  str = str.replace(/\(fn:([\w.-]+)\)/g, function(_, id) {
    if (!fnRefCounts[id]) fnRefCounts[id] = 0;
    var idx = fnRefCounts[id]++;
    var refId = 'fnref-' + id + '-' + idx;
    if (!fnRefs[id]) fnRefs[id] = [];
    fnRefs[id].push(refId);
    return '<sup class="fn-ref" id="' + refId + '"><a href="#" class="fn-link" data-fn="' + id + '">' + id + '</a></sup>';
  });
  str = str.replace(/\{([^}|]+)\|([^}]+)\}/g, function(_, text, url) { return '<a href="' + url + '">' + text + '</a>'; });
  var aTags = {}, aN = 0;
  str = str.replace(/<a\b[^>]*>.*?<\/a>/g, function(m) { var k = '\x01A' + aN++; aTags[k] = m; return k; });
  str = str.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  str = str.replace(/\x01A\d+/g, function(m) { return aTags[m] || ''; });
  str = str.replace(/\x00\d+/g, function(m) { return saved[m] || ''; });
  return str;
}

function blogHtml(t) { return formatText(escapeHTML(t)); }

function imgPath(src) {
  if (!src || src.indexOf('http') === 0 || src.indexOf('//') === 0) return src;
  return IMG_PREFIX + src;
}

function renderBlock(block, context) {
  switch (block.type) {
    case 'heading': {
      var level = Math.min(Math.max(block.level || 2, 1), 6);
      return '<div class="block block-heading"><h' + level + '>' + blogHtml(block.text || '') + '</h' + level + '></div>';
    }
    case 'paragraph': return '<div class="block block-paragraph"><p>' + blogHtml(block.content || '') + '</p></div>';
    case 'text': return '<div class="block block-text"><p>' + blogHtml(block.text || '') + '</p></div>';
    case 'image': {
      var layout = block.layout || 'center', size = block.size || 'large';
      var alt = escapeHTML(block.alt || '');
      var caption = block.caption ? '<figcaption>' + escapeHTML(block.caption) + '</figcaption>' : '';
      var credit = block.credit ? '<span class="img-credit">' + escapeHTML(block.credit) + '</span>' : '';
      var borderCls = block.border ? ' img-border' : '';
      var lightboxAttr = block.lightbox ? ' data-lightbox="true"' : '';
      var img = '<img src="' + imgPath(block.src) + '" alt="' + alt + '" loading="lazy">';
      if (block.link) {
        var tgt = block.target === '_blank' ? ' target="_blank" rel="noopener"' : '';
        img = '<a href="' + escapeHTML(block.link) + '"' + tgt + '>' + img + '</a>';
      }
      var figure = '<figure class="img-figure' + borderCls + '"' + lightboxAttr + '>' + img + credit + caption + '</figure>';
      if (layout === 'left' || layout === 'right') {
        var text = block.text ? '<div class="img-text">' + blogHtml(block.text) + '</div>' : '';
        return '<div class="block block-image layout-' + layout + ' size-' + size + '">' + (layout === 'left' ? figure + text : text + figure) + '</div>';
      }
      return '<div class="block block-image layout-' + layout + ' size-' + size + '">' + figure + '</div>';
    }
    case 'code': {
      var lang = block.language ? '<span class="code-lang">' + escapeHTML(block.language) + '</span>' : '';
      var filename = block.filename ? '<span class="code-filename">' + escapeHTML(block.filename) + '</span>' : '';
      var showCopy = block.enableCopy !== false;
      var copyBtn = showCopy ? '<button class="code-copy" data-copy="' + escapeHTML(block.code) + '">Copy</button>' : '';
      var header = (lang || filename || copyBtn) ? '<div class="code-header">' + lang + filename + copyBtn + '</div>' : '';
      var hlSet = {};
      if (block.highlightLines) for (var h = 0; h < block.highlightLines.length; h++) hlSet[block.highlightLines[h]] = true;
      var lines = block.code.split('\n');
      var numbered = block.showLineNumbers;
      var padLen = numbered ? String(lines.length).length : 0;
      var codeHtml = '';
      for (var i = 0; i < lines.length; i++) {
        var lineNum = numbered ? '<span class="cl-num">' + String(i + 1).padStart(padLen, ' ') + '</span>' : '';
        var hl = hlSet[i + 1] ? ' cl-hl' : '';
        codeHtml += '<span class="cl-line' + hl + '">' + lineNum + '<span class="cl-text">' + escapeHTML(lines[i]) + '</span></span>';
      }
      return '<div class="block block-code">' + header + '<pre class="code-pre"><code>' + codeHtml + '</code></pre></div>';
    }
    case 'blockquote': {
      var attr = '';
      if (block.attribution) {
        var cite = '<cite>' + blogHtml(block.attribution) + '</cite>';
        attr = '<p class="quote-attribution">&mdash; ' + (block.citeUrl ? '<a href="' + escapeHTML(block.citeUrl) + '">' + cite + '</a>' : cite) + '</p>';
      }
      return '<div class="block block-blockquote">' + blogHtml(block.text || '') + attr + '</div>';
    }
    case 'pullquote': case 'epigraph': {
      var layout2 = block.type === 'pullquote' ? (block.layout || 'center') : (block.layout || 'right');
      var attr = '';
      if (block.attribution) {
        var cite = '<cite>' + blogHtml(block.attribution) + '</cite>';
        attr = '<p class="quote-attribution">&mdash; ' + (block.citeUrl ? '<a href="' + escapeHTML(block.citeUrl) + '">' + cite + '</a>' : cite) + '</p>';
      }
      return '<div class="block block-' + block.type + ' layout-' + layout2 + '">' + blogHtml(block.text || '') + attr + '</div>';
    }
    case 'math': {
      var formula = block.formula || '';
      var displayMode = block.displayMode !== false;
      var label = block.label ? '<span class="math-label">(' + escapeHTML(block.label) + ')</span>' : '';
      var caption = block.caption ? '<figcaption class="math-caption">' + blogHtml(block.caption) + '</figcaption>' : '';
      var rendered;
      try {
        rendered = typeof katex !== 'undefined' ? katex.renderToString(formula, { displayMode: displayMode, throwOnError: false }) : '<code class="math-fallback">' + escapeHTML(formula) + '</code>';
      } catch (e) { rendered = '<code class="math-fallback">' + escapeHTML(formula) + '</code>'; }
      if (!displayMode) return '<span class="block-math math-inline">' + rendered + '</span>';
      var alignCls = block.align === 'left' ? ' math-left' : '';
      return '<div class="block block-math math-display' + alignCls + '">' + rendered + label + '</div>' + (caption ? '<div class="block block-math-caption">' + caption + '</div>' : '');
    }
    case 'table': {
      var headers = block.headers || [], aligns = block.alignments || [];
      var striped = block.striped ? ' table-striped' : '';
      var capPos = block.captionPosition === 'top' ? ' cap-top' : '';
      var caption2 = block.caption ? '<caption>' + blogHtml(block.caption) + '</caption>' : '';
      var rows = block.rows || [];
      var thead = headers.length ? '<thead><tr>' + headers.map(function(h, i) { return '<th' + (aligns[i] ? ' style="text-align:' + aligns[i] + '"' : '') + '>' + escapeHTML(h) + '</th>'; }).join('') + '</tr></thead>' : '';
      var tbody = '<tbody>' + rows.map(function(row) {
        if (!Array.isArray(row)) return '';
        return '<tr>' + row.map(function(cell, i) { return '<td' + (aligns[i] ? ' style="text-align:' + aligns[i] + '"' : '') + '>' + blogHtml(String(cell)) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody>';
      return '<div class="block block-table' + striped + capPos + '"><table>' + caption2 + thead + tbody + '</table></div>';
    }
    case 'link': return '<div class="block block-link"><a href="' + escapeHTML(block.url || '') + '" target="_blank" rel="noopener" class="cta-link">' + blogHtml(block.text || '') + '</a></div>';
    case 'button': {
      var align = block.align || 'left';
      var variant = block.variant === 'outline' ? ' btn-outline' : ' btn-primary';
      return '<div class="block block-button align-' + align + '"><a href="' + escapeHTML(block.url || '#') + '" target="_blank" rel="noopener" class="btn' + variant + '">' + blogHtml(block.text || '') + '</a></div>';
    }
    case 'video': {
      var url = block.url || '';
      var caption3 = block.caption ? '<figcaption>' + escapeHTML(block.caption) + '</figcaption>' : '';
      var poster = block.poster ? ' poster="' + escapeHTML(block.poster) + '"' : '';
      var embed = '';
      var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
      if (yt) embed = '<iframe src="https://www.youtube.com/embed/' + yt[1] + '" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      var vm = url.match(/vimeo\.com\/(\d+)/);
      if (vm) embed = '<iframe src="https://player.vimeo.com/video/' + vm[1] + '" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
      if (!embed) embed = '<video controls' + poster + '><source src="' + escapeHTML(url) + '" type="video/' + (url.endsWith('.webm') ? 'webm' : url.endsWith('.ogg') ? 'ogg' : 'mp4') + '">Your browser does not support the video tag.</video>';
      return '<div class="block block-video"><figure class="video-figure">' + embed + caption3 + '</figure></div>';
    }
    case 'gallery': {
      var images = block.images || [], layout3 = block.layout || 'grid', cols = block.columns || 3, ratio = block.ratio || 'original';
      var imgHtml2 = function(img) {
        var alt2 = escapeHTML(img.alt || ''), credit2 = img.credit ? '<span class="img-credit">' + escapeHTML(img.credit) + '</span>' : '';
        var cap2 = img.caption ? '<figcaption>' + blogHtml(img.caption) + '</figcaption>' : '';
        return '<figure class="gallery-figure">' + credit2 + '<img src="' + imgPath(img.src) + '" alt="' + alt2 + '" loading="lazy">' + cap2 + '</figure>';
      };
      if (layout3 === 'masonry') return '<div class="block block-gallery layout-masonry ratio-' + ratio + '"><div class="gallery-masonry">' + images.slice(0, 2).map(function(img, i) { return '<div class="gallery-cell' + (i === 0 ? ' masonry-hero' : ' masonry-side') + '">' + imgHtml2(img) + '</div>'; }).join('') + '</div></div>';
      if (layout3 === 'carousel') return '<div class="block block-gallery layout-carousel"><div class="gallery-track">' + images.map(function(img) { return '<div class="gallery-cell">' + imgHtml2(img) + '</div>'; }).join('') + '</div></div>';
      return '<div class="block block-gallery layout-grid cols-' + cols + ' ratio-' + ratio + '"><div class="gallery-grid">' + images.map(function(img) { return '<div class="gallery-cell">' + imgHtml2(img) + '</div>'; }).join('') + '</div></div>';
    }
    case 'audio': {
      var title = block.title ? '<div class="audio-title">' + escapeHTML(block.title) + '</div>' : '';
      var cap4 = block.caption ? '<figcaption>' + escapeHTML(block.caption) + '</figcaption>' : '';
      return '<div class="block block-audio"><figure>' + title + '<audio controls src="' + escapeHTML(block.src || '') + '"></audio>' + cap4 + '</figure></div>';
    }
    case 'embed': {
      var embedCap = block.caption ? '<figcaption style="text-align:center;font-size:.85rem;color:var(--on-surface-muted);margin-top:.4rem">' + escapeHTML(block.caption) + '</figcaption>' : '';
      return '<div class="block block-embed" style="position:relative;width:100%;aspect-ratio:' + (block.ratio || '16/9') + ';margin:1.5rem 0"><iframe src="' + escapeHTML(block.src) + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe>' + embedCap + '</div>';
    }
    case 'divider': return '<hr class="block block-divider divider-' + (block.style || 'solid') + '">';
    case 'spacer': return '<div class="block block-spacer" style="height:' + Math.max(parseInt(block.height, 10) || 40, 1) + 'px"></div>';
    case 'columns': {
      var count = Math.min(Math.max(block.count || 2, 2), 3);
      var cols2 = block.columns || [];
      return '<div class="block block-columns cols-' + count + '">' + cols2.map(function(col) { return '<div class="col">' + (col.blocks || []).map(function(b) { return renderBlock(b, context); }).join('') + '</div>'; }).join('') + '</div>';
    }
    case 'callout': {
      var icons = { info: '\u2139\ufe0f', tip: '\ud83d\udca1', warning: '\u26a0\ufe0f', error: '\u274c' };
      var style = block.style || 'info';
      return '<div class="block block-callout callout-' + style + '"><span class="callout-icon">' + (icons[style] || icons.info) + '</span><div class="callout-body">' + blogHtml(block.text || '') + '</div></div>';
    }
    case 'accordion': return '<details class="block block-accordion"' + (block.open ? ' open' : '') + '><summary>' + escapeHTML(block.summary || '') + '</summary><div class="accordion-content">' + blogHtml(block.text || '') + '</div></details>';
    default: return '';
  }
}

function renderPostDetail(post, isHidden) {
  fnRefCounts = {}; fnRefs = {};
  var ctx = { posts: postsData, view: 'post' };
  var blocks = '';
  if (post.blocks) for (var i = 0; i < post.blocks.length; i++) blocks += renderBlock(post.blocks[i], ctx);
  var footnotesHtml = '';
  if (post.footnotes && post.footnotes.length) {
    footnotesHtml = '<section class="footnotes"><h2 class="footnotes-title">Footnotes</h2><ol>' + post.footnotes.map(function(fn) {
      var refs = fnRefs[fn.id] || [];
      return '<li id="fn-' + escapeHTML(fn.id) + '">' + blogHtml(fn.text) + ' ' + refs.map(function(refId, i) { return '<a href="#" class="fn-back" data-fnref="' + refId + '" aria-label="Back to reference">&#8617;<sup>' + (i + 1) + '</sup></a>'; }).join(' ') + '</li>';
    }).join('') + '</ol></section>';
  }
  var heroHtml = '';
  if (post.hero) {
    var hero = typeof post.hero === 'string' ? { src: post.hero } : post.hero;
    var alt = escapeHTML(hero.alt || post.title || '');
    var align = hero.align || 'center';
    var tagSize = hero.taglineSize || 'xl';
    var caption = hero.caption ? '<figcaption>' + escapeHTML(hero.caption) + '</figcaption>' : '';
    var tagline = hero.tagline ? '<p class="hero-tagline size-' + tagSize + '">' + blogHtml(hero.tagline) + '</p>' : '';
    var credit = hero.credit ? '<span class="img-credit">' + escapeHTML(hero.credit) + '</span>' : '';
    heroHtml = '<figure class="hero-figure align-' + align + '">' + credit + '<img src="' + imgPath(hero.src) + '" alt="' + alt + '" class="hero-img">' + caption + tagline + '</figure>';
  }
  var backHtml = isHidden ? '' : '<a href="blog.html" class="back-btn">&larr; Back to all posts</a>';
  return '<div class="post-detail" style="display:block">' + backHtml + heroHtml + '<h1 class="post-title">' + escapeHTML(post.title || '') + '</h1><div class="post-meta">' + formatDate(post.date) + '</div>' + blocks + footnotesHtml + '</div>';
}

function showPost(id, replace) {
  var post = allPosts.find(function(p) { return p.id === id; });
  if (!post) return;
  fetch(post.file).then(function(r) { return r.json(); }).then(function(data) {
    var app = document.getElementById('app');
    app.innerHTML = renderPostDetail(data, post.hide);
    if (replace) history.replaceState({ view: 'post', id: id }, '', '?post=' + id);
    else history.pushState({ view: 'post', id: id }, '', '?post=' + id);
  });
}

function showList() {
  var html = '<div class="blog-listing"><div class="blog-grid">';
  for (var i = 0; i < postsData.length; i++) {
    var p = postsData[i];
    var excerpt = p.excerpt ? '<p class="blog-excerpt">' + escapeHTML(p.excerpt) + '</p>' : '';
    var image = p.image ? '<img class="blog-card-img" src="' + imgPath(p.image) + '" alt="' + escapeHTML(p.title) + '" loading="lazy">' : '';
    html += '<div class="blog-card" data-id="' + escapeHTML(p.id) + '">' +
      '<div class="blog-card-meta"><span class="blog-date">' + formatDate(p.date) + '</span></div>' +
      image +
      '<h3 class="blog-title">' + escapeHTML(p.title) + '</h3>' +
      excerpt +
      '<div class="blog-card-footer">Read more</div></div>';
  }
  html += '</div></div>';
  document.getElementById('app').innerHTML = html;
  history.pushState({ view: 'list' }, '', 'blog.html');
}

function initBlog(t, e) {
  var app = document.getElementById(t);
  if (!app) return;
  fetch(e + '?t=' + Date.now()).then(function(r) { return r.json(); }).then(function(manifest) {
    allPosts = manifest.posts || [];
    postsData = allPosts.filter(function(p) { return !p.hide; });
    var params = new URLSearchParams(window.location.search);
    var postId = params.get('post');
    if (postId) showPost(postId, true);
    else showList();
  }).catch(function() { app.innerHTML = '<div class="blog-empty">Failed to load posts.</div>'; });
}

function initBlogPreview(t, e, limit, linkBase) {
  var app = document.getElementById(t);
  if (!app) return;
  fetch(e + '?t=' + Date.now()).then(function(r) { return r.json(); }).then(function(manifest) {
    var featured = (manifest.posts || []).filter(function(p) { return p.featured && !p.hide; });
    if (!featured.length) { app.innerHTML = '<div class="blog-empty">No featured posts yet.</div>'; return; }
    var count = Math.min(limit || featured.length, featured.length);
    var html = '<div class="blog-grid">';
    for (var i = 0; i < count; i++) {
      var p = featured[i];
      var excerpt = p.excerpt ? '<p class="blog-excerpt">' + escapeHTML(p.excerpt) + '</p>' : '';
      var image = p.image ? '<img class="blog-card-img" src="' + imgPath(p.image) + '" alt="' + escapeHTML(p.title) + '" loading="lazy">' : '';
      var link = (linkBase || 'pages/blog.html') + '?post=' + escapeHTML(p.id);
      html += '<div class="blog-card" data-id="' + escapeHTML(p.id) + '">' +
        '<div class="blog-card-meta"><span class="blog-date">' + formatDate(p.date) + '</span></div>' +
        image +
        '<h3 class="blog-title">' + escapeHTML(p.title) + '</h3>' +
        excerpt +
        '<div class="blog-card-footer"><a href="' + escapeHTML(link) + '">Read more</a></div></div>';
    }
    html += '</div>';
    app.innerHTML = html;
  }).catch(function() { app.innerHTML = '<div class="blog-empty">Failed to load posts.</div>'; });
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('app').addEventListener('click', function(e) {
    var card = e.target.closest('.blog-card');
    if (card && card.dataset.id) {
      e.preventDefault();
      var footerLink = card.querySelector('.blog-card-footer a');
      if (footerLink) { window.location.href = footerLink.getAttribute('href'); return; }
      showPost(card.dataset.id);
      return;
    }
    var fnLink = e.target.closest('.fn-link');
    if (fnLink) {
      e.preventDefault();
      var fnId = fnLink.dataset.fn;
      var fnEl = document.getElementById('fn-' + fnId);
      if (!fnEl) return;
      var active = document.querySelectorAll('.fn-active');
      for (var i = 0; i < active.length; i++) active[i].classList.remove('fn-active');
      fnEl.classList.add('fn-active');
      fnEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    var fnBack = e.target.closest('.fn-back');
    if (fnBack) {
      e.preventDefault();
      var refId = fnBack.dataset.fnref;
      var refEl = document.getElementById(refId);
      if (refEl) refEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    var lb = e.target.closest('[data-lightbox="true"]');
    if (lb) {
      e.preventDefault();
      var img = lb.querySelector('img');
      if (!img) return;
      var overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      overlay.innerHTML = '<div class="lightbox-bg"></div><img src="' + escapeHTML(img.src) + '" alt="' + escapeHTML(img.alt) + '" class="lightbox-img"><button class="lightbox-close">&times;</button>';
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      overlay.addEventListener('click', function(ev) {
        if (ev.target.closest('.lightbox-close') || ev.target.classList.contains('lightbox-bg')) {
          overlay.remove();
          document.body.style.overflow = '';
        }
      });
      return;
    }
    var copyBtn = e.target.closest('.code-copy');
    if (copyBtn) {
      e.preventDefault();
      var code = copyBtn.dataset.copy;
      navigator.clipboard.writeText(code).then(function() {
        copyBtn.textContent = 'Copied!';
        setTimeout(function() { copyBtn.textContent = 'Copy'; }, 2000);
      }).catch(function() {
        var ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copyBtn.textContent = 'Copied!';
        setTimeout(function() { copyBtn.textContent = 'Copy'; }, 2000);
      });
      return;
    }
  });
});
