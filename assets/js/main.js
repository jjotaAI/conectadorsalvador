/* Conecta Dor Salvador · interações da página
   Sem dependências. Tudo aqui é melhoria progressiva: sem JavaScript a página
   continua legível, com as âncoras funcionando e o vídeo com controles nativos. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ------------------------------------------------------------------
     Cabeçalho: estado "rolado" (sombra + logotipo compacto)
     ------------------------------------------------------------------ */
  var header = doc.querySelector('[data-header]');
  var sentinel = doc.querySelector('[data-scroll-sentinel]');

  if (header && sentinel && hasIO) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(sentinel);
  } else if (header) {
    header.classList.add('is-scrolled');
  }

  /* ------------------------------------------------------------------
     Menu (celular e tablet)
     ------------------------------------------------------------------ */
  var toggle = doc.querySelector('[data-menu-toggle]');
  var nav = doc.querySelector('[data-nav]');
  var desktopNav = window.matchMedia('(min-width: 1100px)');

  function setMenu(open, returnFocus) {
    if (!header || !toggle) return;
    header.classList.toggle('is-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    if (open) {
      var first = nav && nav.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    } else if (returnFocus) {
      toggle.focus({ preventScroll: true });
    }
  }

  function menuIsOpen() {
    return !!header && header.classList.contains('is-menu-open');
  }

  if (toggle && nav && header) {
    toggle.addEventListener('click', function () {
      setMenu(!menuIsOpen(), false);
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false, false);
    });

    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menuIsOpen()) setMenu(false, true);
    });

    // Toque ou clique fora do cabeçalho (inclui o véu sobre o conteúdo)
    doc.addEventListener('click', function (event) {
      if (!menuIsOpen()) return;
      var insideBar = event.target.closest('.site-header__inner');
      if (!insideBar) setMenu(false, false);
    });

    var onBreakpoint = function (event) {
      if (event.matches) setMenu(false, false);
    };
    if (desktopNav.addEventListener) desktopNav.addEventListener('change', onBreakpoint);
    else if (desktopNav.addListener) desktopNav.addListener(onBreakpoint);
  }

  /* ------------------------------------------------------------------
     Navegação: destaca a seção visível
     ------------------------------------------------------------------ */
  var navLinks = Array.prototype.slice.call(doc.querySelectorAll('.site-nav__list a[href^="#"]'));

  if (hasIO && navLinks.length) {
    var linkById = {};
    var sections = [];
    navLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = id && doc.getElementById(id);
      if (section) {
        linkById[id] = link;
        sections.push(section);
      }
    });

    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });
      var current = null;
      sections.forEach(function (section) {
        if (visible[section.id]) current = section.id;
      });
      navLinks.forEach(function (link) {
        if (current && linkById[current] === link) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (section) {
      spy.observe(section);
    });
  }

  /* ------------------------------------------------------------------
     Revelação ao rolar
     ------------------------------------------------------------------ */
  var revealItems = Array.prototype.slice.call(doc.querySelectorAll('[data-reveal]'));

  if (hasIO && !reduceMotion && revealItems.length) {
    root.classList.add('reveal-on');

    var release = function (el) {
      // Depois da entrada, devolve o elemento às transições normais (hover etc.)
      window.setTimeout(function () {
        el.removeAttribute('data-reveal');
        el.classList.remove('is-visible');
        el.style.removeProperty('--reveal-delay');
      }, 1100);
    };

    var revealObserver = new IntersectionObserver(function (entries) {
      var batch = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.setProperty('--reveal-delay', Math.min(batch, 5) * 70 + 'ms');
        batch += 1;
        el.classList.add('is-visible');
        revealObserver.unobserve(el);
        release(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     Player de vídeo
     ------------------------------------------------------------------ */
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var total = Math.floor(seconds);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function initPlayer(player) {
    var video = player.querySelector('video');
    var stage = player.querySelector('[data-player-stage]');
    var overlay = player.querySelector('[data-player-overlay]');
    var hint = player.querySelector('[data-player-hint]');
    var dock = player.querySelector('[data-player-dock]');
    var seek = player.querySelector('[data-player-seek]');
    var toggleBtn = player.querySelector('[data-player-toggle]');
    var muteBtn = player.querySelector('[data-player-mute]');
    var fsBtn = player.querySelector('[data-player-fullscreen]');
    var currentEl = player.querySelector('[data-player-current]');
    var totalEl = player.querySelector('[data-player-total]');
    var errorEl = player.querySelector('[data-player-error]');

    if (!video || !stage || !dock || !seek || !toggleBtn) return;

    var fallbackDuration = parseFloat(video.getAttribute('data-duration')) || 0;
    var scrubbing = false;
    var pendingSeek = null;

    // Troca os controles nativos pelos personalizados
    video.controls = false;
    video.removeAttribute('controls');
    overlay.hidden = false;
    dock.hidden = false;
    player.classList.add('is-enhanced');

    function duration() {
      return isFinite(video.duration) && video.duration > 0 ? video.duration : fallbackDuration;
    }

    function render() {
      var d = duration();
      var t = scrubbing ? parseFloat(seek.value) : video.currentTime;
      if (d) {
        seek.max = String(d);
        totalEl.textContent = formatTime(d);
      }
      if (!scrubbing) seek.value = String(t);
      var pct = d ? Math.min(100, Math.max(0, (t / d) * 100)) : 0;
      seek.style.setProperty('--progress', pct + '%');
      seek.setAttribute('aria-valuetext', formatTime(t) + ' de ' + formatTime(d));
      currentEl.textContent = formatTime(t);
    }

    function setState() {
      var playing = !video.paused && !video.ended;
      player.classList.toggle('is-playing', playing);
      player.classList.toggle('is-ended', video.ended);
      toggleBtn.setAttribute('aria-label', playing ? 'Pausar' : (video.ended ? 'Assistir novamente' : 'Reproduzir'));
      if (hint) hint.textContent = video.ended ? 'Assistir novamente' : 'Assistir ao vídeo';
    }

    function showError() {
      player.classList.remove('is-loading', 'is-playing');
      if (errorEl) errorEl.hidden = false;
    }

    function play() {
      if (errorEl) errorEl.hidden = true;
      if (video.ended) video.currentTime = 0;
      var attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function (err) {
          // AbortError acontece quando o usuário pausa logo em seguida: não é falha
          if (err && err.name === 'AbortError') return;
          if (video.error || video.networkState === 3) showError();
          player.classList.remove('is-loading');
          setState();
        });
      }
    }

    function togglePlay() {
      if (video.paused || video.ended) play();
      else video.pause();
    }

    function seekTo(time) {
      var d = duration();
      time = Math.min(Math.max(0, time), d || time);
      if (video.readyState >= 1) {
        video.currentTime = time;
      } else {
        pendingSeek = time;
        if (video.preload === 'none') video.preload = 'metadata';
        video.load();
      }
    }

    /* Reprodução */
    stage.addEventListener('click', function (event) {
      if (event.target.closest('a')) return;
      togglePlay();
    });
    toggleBtn.addEventListener('click', togglePlay);

    video.addEventListener('play', function () {
      player.classList.add('is-started');
      setState();
    });
    video.addEventListener('playing', function () {
      player.classList.remove('is-loading');
      setState();
    });
    video.addEventListener('pause', setState);
    video.addEventListener('ended', function () {
      player.classList.remove('is-loading');
      setState();
      render();
    });
    video.addEventListener('waiting', function () {
      if (!video.paused) player.classList.add('is-loading');
    });
    video.addEventListener('canplay', function () {
      player.classList.remove('is-loading');
    });
    video.addEventListener('loadstart', function () {
      if (!video.paused) player.classList.add('is-loading');
    });
    video.addEventListener('loadedmetadata', function () {
      if (pendingSeek !== null) {
        video.currentTime = pendingSeek;
        pendingSeek = null;
      }
      render();
    });
    video.addEventListener('durationchange', render);
    video.addEventListener('timeupdate', render);
    video.addEventListener('seeked', render);
    video.addEventListener('error', showError);
    var source = video.querySelector('source');
    if (source) source.addEventListener('error', showError);

    /* Barra de progresso */
    seek.addEventListener('input', function () {
      scrubbing = true;
      render();
    });
    seek.addEventListener('change', function () {
      seekTo(parseFloat(seek.value));
      scrubbing = false;
      render();
    });

    /* Som */
    function renderMute() {
      var muted = video.muted || video.volume === 0;
      player.classList.toggle('is-muted', muted);
      muteBtn.setAttribute('aria-pressed', String(muted));
      muteBtn.setAttribute('aria-label', muted ? 'Ativar som' : 'Silenciar');
    }
    if (muteBtn) {
      muteBtn.addEventListener('click', function () {
        video.muted = !video.muted;
      });
      video.addEventListener('volumechange', renderMute);
      renderMute();
    }

    /* Tela cheia */
    function fullscreenElement() {
      return doc.fullscreenElement || doc.webkitFullscreenElement || null;
    }
    function renderFullscreen() {
      var active = fullscreenElement() === player;
      player.classList.toggle('is-fullscreen', active);
      if (fsBtn) fsBtn.setAttribute('aria-label', active ? 'Sair da tela cheia' : 'Tela cheia');
    }
    function toggleFullscreen() {
      if (fullscreenElement()) {
        (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
      } else if (player.requestFullscreen) {
        var request = player.requestFullscreen();
        if (request && typeof request.catch === 'function') request.catch(function () {});
      } else if (player.webkitRequestFullscreen) {
        player.webkitRequestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        // iPhone: tela cheia nativa do sistema (só disponível depois que o vídeo carrega)
        try {
          video.webkitEnterFullscreen();
        } catch (err) {
          video.addEventListener('loadedmetadata', function () {
            try { video.webkitEnterFullscreen(); } catch (ignore) {}
          }, { once: true });
          play();
        }
      }
    }
    if (fsBtn) {
      var canFullscreen = player.requestFullscreen || player.webkitRequestFullscreen || video.webkitEnterFullscreen;
      if (!canFullscreen) {
        fsBtn.hidden = true;
      } else {
        fsBtn.addEventListener('click', toggleFullscreen);
        doc.addEventListener('fullscreenchange', renderFullscreen);
        doc.addEventListener('webkitfullscreenchange', renderFullscreen);
      }
    }

    /* Atalhos de teclado, somente com o foco dentro do player */
    player.addEventListener('keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var key = (event.key || '').toLowerCase();
      var onSeek = event.target === seek;
      var forward = key === 'arrowright' || (onSeek && key === 'arrowup');
      var backward = key === 'arrowleft' || (onSeek && key === 'arrowdown');
      if (key === 'k') {
        togglePlay();
      } else if (key === 'm' && muteBtn) {
        video.muted = !video.muted;
      } else if (key === 'f' && fsBtn && !fsBtn.hidden) {
        toggleFullscreen();
      } else if (forward || backward) {
        // Setas avançam ou voltam 5 segundos (também na barra de progresso)
        seekTo((video.currentTime || 0) + (forward ? 5 : -5));
        render();
      } else {
        return;
      }
      event.preventDefault();
    });

    /* Carregamento sob demanda e pausa ao sair da tela */
    if (hasIO) {
      // Só busca os metadados (duração, primeiro quadro) quando o player aparece na tela
      var warm = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        if (video.preload === 'none') video.preload = 'metadata';
        warm.disconnect();
      }, { threshold: 0.2 });
      warm.observe(player);

      new IntersectionObserver(function (entries) {
        var entry = entries[0];
        var pip = doc.pictureInPictureElement === video;
        if (!entry.isIntersecting && !video.paused && !fullscreenElement() && !pip) {
          video.pause();
        }
      }, { threshold: 0.15 }).observe(player);
    }

    /* Integração com os controles de mídia do sistema */
    if ('mediaSession' in navigator && window.MediaMetadata) {
      video.addEventListener('play', function () {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: video.getAttribute('aria-label') || doc.title,
          artist: 'Conecta Dor Salvador',
          artwork: video.poster ? [{ src: video.poster, sizes: '480x854', type: 'image/jpeg' }] : []
        });
      }, { once: true });
    }

    setState();
    render();
  }

  Array.prototype.forEach.call(doc.querySelectorAll('[data-player]'), initPlayer);
})();
