/**
 * Mermaid 다이어그램 툴바 — 확대/축소, 전체화면, 패닝
 * GitHub의 Mermaid 뷰어 스타일 구현
 */
(function () {
  "use strict";

  var ZOOM_STEP = 1.3;
  var ZOOM_MIN = 0.2;
  var ZOOM_MAX = 5;

  // --- SVG 아이콘 ---
  var ICONS = {
    fullscreen:
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="currentColor"/></svg>',
    "zoom-in":
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>',
    "zoom-out":
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 13H5v-2h14v2z" fill="currentColor"/></svg>',
    reset:
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 5c-3.87 0-7 3.13-7 7h2c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5c-1.13 0-2.16-.37-3-1.01V16h-2v-5h5v2h-1.79c.77.61 1.71 1 2.79 1 2.48 0 4.5-2.02 4.5-4.5S14.48 5 12 5z" fill="currentColor"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>',
  };

  // --- 상태 ---
  var overlayEl = null;
  var zoomLevel = 1;
  var panX = 0;
  var panY = 0;
  var isPanning = false;
  var panStartX = 0;
  var panStartY = 0;

  function resetView() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
  }

  function applyTransform(svg) {
    if (!svg) return;
    svg.style.transform =
      "translate(" + panX + "px, " + panY + "px) scale(" + zoomLevel + ")";
    svg.style.transformOrigin = "center center";
  }

  function createOverlay() {
    overlayEl = document.createElement("div");
    overlayEl.className = "mermaid-overlay";
    overlayEl.innerHTML =
      '<div class="mermaid-overlay-backdrop"></div>' +
      '<div class="mermaid-overlay-container">' +
      '<div class="mermaid-overlay-toolbar">' +
      '<span class="mermaid-overlay-zoom-label">100%</span>' +
      '<button class="mermaid-tb-btn mermaid-tb-btn--overlay" data-action="zoom-out">' +
      ICONS["zoom-out"] +
      "</button>" +
      '<button class="mermaid-tb-btn mermaid-tb-btn--overlay" data-action="zoom-in">' +
      ICONS["zoom-in"] +
      "</button>" +
      '<button class="mermaid-tb-btn mermaid-tb-btn--overlay" data-action="reset">' +
      ICONS["reset"] +
      "</button>" +
      '<button class="mermaid-tb-btn mermaid-tb-btn--overlay mermaid-tb-btn--close" data-action="close">' +
      ICONS["close"] +
      "</button>" +
      "</div>" +
      '<div class="mermaid-overlay-body"><div class="mermaid-overlay-svg"></div></div>' +
      "</div>";
    document.body.appendChild(overlayEl);

    // 이벤트
    var container = overlayEl.querySelector(".mermaid-overlay-container");

    // 툴바 버튼
    container.addEventListener("click", function (e) {
      var btn = e.target.closest(".mermaid-tb-btn");
      if (!btn) return;
      var svgEl = overlayEl.querySelector(".mermaid-overlay-svg svg");

      switch (btn.dataset.action) {
        case "zoom-in":
          zoomLevel = Math.min(zoomLevel * ZOOM_STEP, ZOOM_MAX);
          applyTransform(svgEl);
          updateZoomLabel();
          break;
        case "zoom-out":
          zoomLevel = Math.max(zoomLevel / ZOOM_STEP, ZOOM_MIN);
          applyTransform(svgEl);
          updateZoomLabel();
          break;
        case "reset":
          resetView();
          applyTransform(svgEl);
          updateZoomLabel();
          break;
        case "close":
          closeOverlay();
          break;
      }
    });

    // 뒤쪽 클릭 → 닫기
    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl || e.target.classList.contains("mermaid-overlay-backdrop")) {
        closeOverlay();
      }
    });

    // 마우스 휠 → 줌
    overlayEl.addEventListener(
      "wheel",
      function (e) {
        if (!overlayEl.classList.contains("active")) return;
        e.preventDefault();
        var svgEl = overlayEl.querySelector(".mermaid-overlay-svg svg");
        if (!svgEl) return;
        var delta = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
        zoomLevel = Math.min(Math.max(zoomLevel * delta, ZOOM_MIN), ZOOM_MAX);
        applyTransform(svgEl);
        updateZoomLabel();
      },
      { passive: false }
    );

    // 마우스 드래그 → 팬
    var bodyEl = overlayEl.querySelector(".mermaid-overlay-body");
    bodyEl.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      isPanning = true;
      panStartX = e.clientX - panX;
      panStartY = e.clientY - panY;
      bodyEl.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", function (e) {
      if (!isPanning) return;
      panX = e.clientX - panStartX;
      panY = e.clientY - panStartY;
      var svgEl = overlayEl.querySelector(".mermaid-overlay-svg svg");
      applyTransform(svgEl);
    });

    document.addEventListener("mouseup", function () {
      if (isPanning) {
        isPanning = false;
        var body = overlayEl.querySelector(".mermaid-overlay-body");
        if (body) body.style.cursor = "grab";
      }
    });

    // ESC → 닫기
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlayEl.classList.contains("active")) {
        closeOverlay();
      }
    });
  }

  function updateZoomLabel() {
    var label = overlayEl.querySelector(".mermaid-overlay-zoom-label");
    if (label) label.textContent = Math.round(zoomLevel * 100) + "%";
  }

  function openOverlay(svg) {
    if (!overlayEl) createOverlay();
    resetView();
    var container = overlayEl.querySelector(".mermaid-overlay-svg");
    container.innerHTML = "";
    var clone = svg.cloneNode(true);
    // viewBox 유지, 크기는 CSS로 조정
    container.appendChild(clone);
    overlayEl.classList.add("active");
    document.body.style.overflow = "hidden";
    updateZoomLabel();
    applyTransform(clone);
  }

  function closeOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.remove("active");
    document.body.style.overflow = "";
  }

  // --- Mermaid 소스 추출 (fetch로 원본 HTML에서 추출) ---
  // Material의 bundle.js가 DOM을 변조하기 때문에, fetch로 원본 HTML을 다시 받아서
  // <pre class="mermaid-diagram"><code>의 내용을 추출한다.
  function fetchMermaidSources() {
    // cache-busting: CDN edge가 다른 버전을 제공할 수 있음
    return fetch(window.location.href + "?t=" + Date.now())
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");
        var codes = doc.querySelectorAll("pre.mermaid-diagram code, pre.mermaid code");
        var sources = [];
        codes.forEach(function (code) {
          sources.push(code.textContent || "");
        });
        return sources;
      })
      .catch(function () {
        // fetch 실패 시 fallback: 현재 DOM에서 시도
        var sources = [];
        document.querySelectorAll("div.mermaid").forEach(function (div) {
          if (div.textContent.trim()) sources.push(div.textContent);
        });
        return sources;
      });
  }

  // --- Mermaid 11.4.1 동적 로드 ---
  function loadMermaidVersion(callback) {
    if (typeof mermaid !== "undefined" && mermaid.version && mermaid.version.indexOf("11.4") >= 0) {
      callback();
      return;
    }
    var script = document.createElement("script");
    script.src = "https://unpkg.com/mermaid@11.4.1/dist/mermaid.min.js";
    script.onload = callback;
    script.onerror = function () {
      setTimeout(function () { loadMermaidVersion(callback); }, 2000);
    };
    document.head.appendChild(script);
  }

  // --- fetch로 얻은 소스로 <div class="mermaid"> 생성 후 Mermaid 실행 ---
  function setupAndRender() {
    fetchMermaidSources().then(function (sources) {
      if (!sources || sources.length === 0) return;

      // Material이 만든 모든 기존 <div class="mermaid"> 제거
      document.querySelectorAll("div.mermaid").forEach(function (el) {
        el.remove();
      });

      // Mermaid 실행 (개별 render로 DOM 제어)
      loadMermaidVersion(function () {
        mermaid.initialize({ startOnLoad: false });
        var contentArea = document.querySelector(".md-content__inner") || document.querySelector("article") || document.body;
        var promises = [];

        sources.forEach(function (source, i) {
          var p = mermaid.render("mermaid-svg-" + i, source)
            .then(function (result) {
              var wrapper = document.createElement("div");
              wrapper.className = "mermaid";
              wrapper.innerHTML = result.svg + toolbarHtml({
                "zoom-in": ICONS["zoom-in"],
                "zoom-out": ICONS["zoom-out"],
                reset: ICONS["reset"],
                fullscreen: ICONS["fullscreen"],
              });
              contentArea.appendChild(wrapper);
              if (result.bindFunctions) result.bindFunctions(wrapper);

              // attach overlay events to the new wrapper
              attachToolbarEvents(wrapper);
              return wrapper;
            })
            .catch(function (err) {
              console.warn("mermaid render error for div " + i + ":", err);
            });
          promises.push(p);
        });

        Promise.all(promises).then(function () {
          // all toolbars are already in the DOM from .then() above
        });
      });
    });
  }

  // --- 툴바 HTML 생성 ---
  function toolbarHtml(icons) {
    return '<div class="mermaid-diagram-toolbar">' +
      '<button class="mermaid-tb-btn" data-action="zoom-in" title="확대">' + icons["zoom-in"] + '</button>' +
      '<button class="mermaid-tb-btn" data-action="zoom-out" title="축소">' + icons["zoom-out"] + '</button>' +
      '<button class="mermaid-tb-btn" data-action="reset" title="원래 크기">' + icons["reset"] + '</button>' +
      '<button class="mermaid-tb-btn" data-action="fullscreen" title="전체화면">' + icons["fullscreen"] + '</button>' +
      "</div>";
  }

  // --- 툴바 이벤트 연결 ---
  function attachToolbarEvents(container) {
    var toolbar = container.querySelector(".mermaid-diagram-toolbar");
    if (!toolbar) return;
    toolbar.addEventListener("click", function (e) {
      var btn = e.target.closest(".mermaid-tb-btn");
      if (!btn) return;
      var s = container.querySelector("svg");
      if (!s) return;
      switch (btn.dataset.action) {
        case "zoom-in": {
          var w = parseFloat(s.getAttribute("width") || s.viewBox.baseVal.width);
          s.style.width = w * 1.3 + "px";
          s.style.maxWidth = "none";
          break;
        }
        case "zoom-out": {
          var w2 = parseFloat(s.style.width || s.getAttribute("width") || s.viewBox.baseVal.width);
          s.style.width = Math.max(w2 / 1.3, 200) + "px";
          s.style.maxWidth = "none";
          break;
        }
        case "reset":
          s.style.width = "";
          s.style.maxWidth = "";
          break;
        case "fullscreen":
          openOverlay(s);
          break;
      }
    });
  }

  // --- 초기화: 한 번만 실행 ---
  var rendered = false;
  function init() {
    if (rendered) return;
    rendered = true;
    setupAndRender();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
