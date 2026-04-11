(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data layer
  // ---------------------------------------------------------------------------
  const pages = window.WIKI_DATA || [];
  const searchData = window.WIKI_SEARCH || [];
  const slugMap = new Map();
  pages.forEach(function (p) { slugMap.set(p.slug, p); });

  const CATEGORY_META = {
    people:    { icon: '\u2694\uFE0F', label: 'People' },
    locations: { icon: '\uD83C\uDFF0', label: 'Locations' },
    factions:  { icon: '\u2694',       label: 'Factions' },
    faiths:    { icon: '\u2728',       label: 'Faiths' },
    lore:      { icon: '\uD83D\uDCDC', label: 'Lore' },
    sessions:  { icon: '\uD83D\uDCD6', label: 'Sessions' },
    sources:   { icon: '\uD83D\uDCC2', label: 'Sources' },
    overview:  { icon: '\uD83C\uDF1F', label: 'Overview' },
  };

  function categoryLabel(cat) {
    return (CATEGORY_META[cat] || {}).label || cat.charAt(0).toUpperCase() + cat.slice(1);
  }

  function categoryIcon(cat) {
    return (CATEGORY_META[cat] || {}).icon || '\uD83D\uDCC4';
  }

  function countByCategory() {
    var counts = {};
    pages.forEach(function (p) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }

  function pagesInCategory(cat) {
    return pages
      .filter(function (p) { return p.category === cat; })
      .sort(function (a, b) { return a.title.localeCompare(b.title); });
  }

  function statusColor(status) {
    switch (status) {
      case 'active': return 'status-active';
      case 'dead': case 'deceased': return 'status-dead';
      case 'destroyed': return 'status-destroyed';
      case 'dormant': case 'missing': case 'unknown': return 'status-unknown';
      default: return 'status-unknown';
    }
  }

  function truncateText(html, maxLen) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var text = tmp.textContent || tmp.innerText || '';
    // Skip past the title heading
    text = text.replace(/^\s*\S+.*\n?/, '');
    if (text.length > maxLen) return text.substring(0, maxLen) + '...';
    return text;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------
  function doSearch(query) {
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    var results = [];
    for (var i = 0; i < searchData.length; i++) {
      var entry = searchData[i];
      var score = 0;
      var titleLower = entry.title.toLowerCase();
      var tagsLower = entry.tags.toLowerCase();
      var textLower = entry.text.toLowerCase();

      if (titleLower === q) { score = 100; }
      else if (titleLower.indexOf(q) === 0) { score = 80; }
      else if (titleLower.indexOf(q) !== -1) { score = 60; }
      else if (tagsLower.indexOf(q) !== -1) { score = 40; }
      else if (textLower.indexOf(q) !== -1) { score = 20; }

      if (score > 0) {
        // Extract snippet
        var snippet = '';
        if (score <= 20) {
          var idx = textLower.indexOf(q);
          var start = Math.max(0, idx - 40);
          var end = Math.min(entry.text.length, idx + q.length + 60);
          snippet = (start > 0 ? '...' : '') + entry.text.substring(start, end) + (end < entry.text.length ? '...' : '');
        }
        results.push({ slug: entry.slug, title: entry.title, category: entry.category, score: score, snippet: snippet });
      }
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, 30);
  }

  // ---------------------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------------------
  var content = document.getElementById('content');
  var sidebar = document.getElementById('sidebar');
  var sidebarOverlay = document.getElementById('sidebar-overlay');
  var sidebarList = document.getElementById('sidebar-list');
  var hamburgerBtn = document.getElementById('hamburger-btn');
  var searchBtn = document.getElementById('search-btn');
  var searchInput = document.getElementById('search-input');
  var searchClose = document.getElementById('search-close');
  var searchArea = document.getElementById('search-area');
  var headerTitle = document.getElementById('header-title');
  var appHeader = document.getElementById('app-header');

  // ---------------------------------------------------------------------------
  // Sidebar
  // ---------------------------------------------------------------------------
  function buildSidebar() {
    var counts = countByCategory();
    var cats = ['overview', 'people', 'locations', 'factions', 'faiths', 'lore', 'sessions', 'sources'];
    var html = '';
    cats.forEach(function (cat) {
      if (!counts[cat]) return;
      html += '<li><a href="#/category/' + cat + '">'
        + '<span class="sidebar-icon">' + categoryIcon(cat) + '</span>'
        + '<span class="sidebar-label">' + categoryLabel(cat) + '</span>'
        + '<span class="sidebar-count">' + counts[cat] + '</span>'
        + '</a></li>';
    });
    sidebarList.innerHTML = html;
  }

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
    document.body.classList.add('sidebar-open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
    document.body.classList.remove('sidebar-open');
  }

  hamburgerBtn.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) { closeSidebar(); }
    else { openSidebar(); }
  });
  sidebarOverlay.addEventListener('click', closeSidebar);
  sidebarList.addEventListener('click', function () {
    closeSidebar();
  });

  // ---------------------------------------------------------------------------
  // Search UI
  // ---------------------------------------------------------------------------
  var searchActive = false;

  function openSearch() {
    searchActive = true;
    appHeader.classList.add('search-active');
    searchInput.focus();
  }

  function closeSearch() {
    searchActive = false;
    appHeader.classList.remove('search-active');
    searchInput.value = '';
  }

  searchBtn.addEventListener('click', openSearch);
  searchClose.addEventListener('click', function () {
    closeSearch();
    // If we're on a search route, go home
    if (location.hash.indexOf('#/search') === 0) {
      location.hash = '#/';
    }
  });

  var searchDebounce = null;
  searchInput.addEventListener('input', function () {
    var val = searchInput.value.trim();
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () {
      if (val.length >= 2) {
        location.hash = '#/search?q=' + encodeURIComponent(val);
      }
    }, 200);
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeSearch();
    }
  });

  // ---------------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------------
  function parseRoute() {
    var hash = location.hash || '#/';
    if (hash === '#' || hash === '#/') return { view: 'home' };

    var match;

    match = hash.match(/^#\/category\/([^?]+)/);
    if (match) return { view: 'category', name: decodeURIComponent(match[1]) };

    match = hash.match(/^#\/page\/([^?]+)/);
    if (match) return { view: 'page', slug: decodeURIComponent(match[1]) };

    match = hash.match(/^#\/search\?q=([^&]*)/);
    if (match) return { view: 'search', query: decodeURIComponent(match[1]) };

    return { view: 'home' };
  }

  function navigate() {
    var route = parseRoute();
    content.classList.add('fade-out');
    setTimeout(function () {
      switch (route.view) {
        case 'home':
          renderHome();
          break;
        case 'category':
          renderCategory(route.name);
          break;
        case 'page':
          renderPage(route.slug);
          break;
        case 'search':
          renderSearch(route.query);
          break;
        default:
          renderHome();
      }
      content.classList.remove('fade-out');
      content.classList.add('fade-in');
      setTimeout(function () { content.classList.remove('fade-in'); }, 300);
      window.scrollTo(0, 0);
    }, 50);
  }

  window.addEventListener('hashchange', navigate);

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  // Home
  function renderHome() {
    var overviewPage = slugMap.get('overview');
    var overviewHtml = '';
    if (overviewPage) {
      // Extract just a summary from the overview - first few paragraphs
      var tmp = document.createElement('div');
      tmp.innerHTML = overviewPage.html;
      var paras = tmp.querySelectorAll('p');
      var snippetParts = [];
      for (var i = 0; i < Math.min(3, paras.length); i++) {
        snippetParts.push(paras[i].outerHTML);
      }
      overviewHtml = snippetParts.join('');
    }

    var counts = countByCategory();
    var cats = ['people', 'locations', 'factions', 'faiths', 'lore', 'sessions', 'sources'];
    var cardsHtml = '';
    cats.forEach(function (cat) {
      if (!counts[cat]) return;
      cardsHtml += '<a href="#/category/' + cat + '" class="category-card">'
        + '<div class="card-icon">' + categoryIcon(cat) + '</div>'
        + '<div class="card-label">' + categoryLabel(cat) + '</div>'
        + '<div class="card-count">' + counts[cat] + ' pages</div>'
        + '</a>';
    });

    content.innerHTML =
      '<div class="home-view">'
      + '<div class="home-header">'
      + '<h1 class="home-title">The Fallen Empire</h1>'
      + '<p class="home-subtitle">Campaign Wiki</p>'
      + '</div>'
      + (overviewHtml ? '<div class="home-overview">' + overviewHtml + '</div>' : '')
      + '<div class="category-grid">' + cardsHtml + '</div>'
      + '</div>';

    interceptLinks();
  }

  // Category listing
  function renderCategory(name) {
    var catPages = pagesInCategory(name);
    var html = '<div class="category-view">';
    html += '<nav class="breadcrumb"><a href="#/">Home</a> <span class="sep">/</span> ' + categoryLabel(name) + '</nav>';
    html += '<h1 class="category-title">' + categoryIcon(name) + ' ' + categoryLabel(name) + '</h1>';

    if (catPages.length === 0) {
      html += '<p class="empty-state">No pages in this category.</p>';
    } else {
      html += '<ul class="page-list">';
      catPages.forEach(function (p) {
        var preview = truncateText(p.html, 120);
        html += '<li class="page-list-item">'
          + '<a href="#/page/' + p.slug + '">'
          + '<div class="page-list-header">'
          + '<span class="page-list-title">' + p.title + '</span>'
          + '<span class="status-badge ' + statusColor(p.status) + '">' + p.status + '</span>'
          + '</div>'
          + '<div class="page-list-preview">' + escapeHtml(preview) + '</div>'
          + '</a></li>';
      });
      html += '</ul>';
    }
    html += '</div>';
    content.innerHTML = html;
  }

  // Page view
  function renderPage(slug) {
    var page = slugMap.get(slug);
    if (!page) {
      content.innerHTML = '<div class="page-view"><h1>Page Not Found</h1><p>No page found for "' + escapeHtml(slug) + '".</p><p><a href="#/">Return home</a></p></div>';
      return;
    }

    var html = '<div class="page-view">';
    html += '<nav class="breadcrumb">'
      + '<a href="#/">Home</a> <span class="sep">/</span> '
      + '<a href="#/category/' + page.category + '">' + categoryLabel(page.category) + '</a>'
      + ' <span class="sep">/</span> ' + escapeHtml(page.title)
      + '</nav>';

    if (page.tags && page.tags.length > 0) {
      html += '<div class="page-tags">';
      page.tags.forEach(function (tag) {
        html += '<span class="tag">' + escapeHtml(tag) + '</span>';
      });
      html += '</div>';
    }

    html += '<article class="page-content">' + page.html + '</article>';
    html += '</div>';
    content.innerHTML = html;
    interceptLinks();
  }

  // Search results
  function renderSearch(query) {
    if (!searchActive) {
      openSearch();
      searchInput.value = query;
    }

    var results = doSearch(query);
    var html = '<div class="search-view">';
    html += '<h2 class="search-heading">Search results for "' + escapeHtml(query) + '"</h2>';

    if (results.length === 0) {
      html += '<p class="empty-state">No results found.</p>';
    } else {
      html += '<ul class="page-list">';
      results.forEach(function (r) {
        html += '<li class="page-list-item">'
          + '<a href="#/page/' + r.slug + '">'
          + '<div class="page-list-header">'
          + '<span class="page-list-title">' + escapeHtml(r.title) + '</span>'
          + '<span class="category-badge">' + categoryLabel(r.category) + '</span>'
          + '</div>'
          + (r.snippet ? '<div class="page-list-preview">' + escapeHtml(r.snippet) + '</div>' : '')
          + '</a></li>';
      });
      html += '</ul>';
    }
    html += '</div>';
    content.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function interceptLinks() {
    var links = content.querySelectorAll('a.wiki-link');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (href && href.charAt(0) === '#') {
          e.preventDefault();
          location.hash = href;
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Service worker
  // ---------------------------------------------------------------------------
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'activated') {
            showUpdateBanner();
          }
        });
      });
    });

    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) return;
      refreshing = true;
      showUpdateBanner();
    });
  }

  function showUpdateBanner() {
    if (document.getElementById('update-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = 'Wiki updated. <button onclick="location.reload()">Refresh</button>';
    document.body.appendChild(banner);
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  buildSidebar();
  navigate();

})();
