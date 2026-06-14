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
    copy:
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg>',
    "pan-up":
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" fill="currentColor"/></svg>',
    "pan-down":
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" fill="currentColor"/></svg>',
    "pan-left":
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>',
    "pan-right":
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 11h12.17l-5.59-5.59L12 4l8 8-8 8-1.41-1.41L16.17 13H4v-2z" fill="currentColor"/></svg>',
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

  // --- <pre class="mermaid-diagram">를 제자리에서 SVG+툴바로 교체 ---
  function setupAndRender() {
    // DOM에 있는 <pre class="mermaid-diagram"> 수집
    var pres = document.querySelectorAll("pre.mermaid-diagram");
    if (!pres.length) return;

    // Material이 만든 기존 <div class="mermaid"> 제거 (우리가 새로 그림)
    document.querySelectorAll("div.mermaid").forEach(function (el) {
      el.remove();
    });

    loadMermaidVersion(function () {
      mermaid.initialize({ startOnLoad: false });
      var pending = [];

      pres.forEach(function (pre, i) {
        var code = pre.querySelector("code");
        if (!code) return;
        var source = code.textContent || "";
        if (!source.trim()) return;

        var p = mermaid.render("mermaid-svg-" + i, source)
          .then(function (result) {
            var wrapper = document.createElement("div");
            wrapper.className = "mermaid mermaid-enhanced";

            // top toolbar: fullscreen + copy
            var topHtml = '<div class="mermaid-top-toolbar">' +
              '<button class="mermaid-tb-btn" data-action="fullscreen" title="전체화면">' + ICONS["fullscreen"] + '</button>' +
              '<button class="mermaid-tb-btn" data-action="copy" title="SVG 복사">' + ICONS["copy"] + '</button>' +
              '</div>';

            // bottom toolbar: pan + reset + zoom
            var bottomHtml = '<div class="mermaid-bottom-toolbar">' +
              '<button class="mermaid-tb-btn" data-action="pan-up" title="위로">' + ICONS["pan-up"] + '</button>' +
              '<button class="mermaid-tb-btn" data-action="pan-left" title="왼쪽으로">' + ICONS["pan-left"] + '</button>' +
              '<button class="mermaid-tb-btn" data-action="reset" title="원래 위치">' + ICONS["reset"] + '</button>' +
              '<button class="mermaid-tb-btn" data-action="pan-right" title="오른쪽으로">' + ICONS["pan-right"] + '</button>' +
              '<button class="mermaid-tb-btn" data-action="pan-down" title="아래로">' + ICONS["pan-down"] + '</button>' +
              '<span class="mermaid-tb-sep"></span>' +
              '<button class="mermaid-tb-btn" data-action="zoom-out" title="축소">' + ICONS["zoom-out"] + '</button>' +
              '<button class="mermaid-tb-btn" data-action="zoom-in" title="확대">' + ICONS["zoom-in"] + '</button>' +
              '</div>';

            wrapper.innerHTML = result.svg + topHtml + bottomHtml;
            pre.insertAdjacentElement("afterend", wrapper);
            pre.style.display = "none";
            if (result.bindFunctions) result.bindFunctions(wrapper);
            attachToolbarEvents(wrapper);
          })
          .catch(function (err) {
            console.warn("mermaid render error for diagram " + i + ":", err);
          });
        pending.push(p);
      });
    });
  }

  // --- 툴바 이벤트 연결 (하나의 핸들러로 모든 버튼 처리) ---
  function attachToolbarEvents(container) {
    container.addEventListener("click", function (e) {
      var btn = e.target.closest(".mermaid-tb-btn");
      if (!btn) return;

      var svg = container.querySelector("svg");
      if (!svg && btn.dataset.action !== "copy") return;

      switch (btn.dataset.action) {
        case "zoom-in": {
          var w = parseFloat(svg.getAttribute("width") || svg.viewBox.baseVal.width);
          svg.style.width = w * 1.3 + "px";
          svg.style.maxWidth = "none";
          break;
        }
        case "zoom-out": {
          var w2 = parseFloat(svg.style.width || svg.getAttribute("width") || svg.viewBox.baseVal.width);
          svg.style.width = Math.max(w2 / 1.3, 200) + "px";
          svg.style.maxWidth = "none";
          break;
        }
        case "reset":
          svg.style.width = "";
          svg.style.maxWidth = "";
          svg.style.transform = "";
          delete container.dataset.panX;
          delete container.dataset.panY;
          break;
        case "fullscreen":
          openOverlay(svg);
          break;
        case "copy":
          copySvg(container);
          break;
        case "pan-up":
        case "pan-down":
        case "pan-left":
        case "pan-right":
          panSvg(svg, btn.dataset.action);
          break;
      }
    });
  }

  // --- SVG 복사 ---
  function copySvg(container) {
    var svg = container.querySelector("svg");
    if (!svg) return;
    var html = svg.outerHTML;
    navigator.clipboard.writeText(html).catch(function () {
      // fallback
      var ta = document.createElement("textarea");
      ta.value = html;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
  }

  // --- SVG 패닝 (transform 이동, 컨테이너별 독립 상태) ---
  function panSvg(svg, direction) {
    var container = svg.closest(".mermaid") || svg.parentElement;
    var px = parseInt(container.dataset.panX) || 0;
    var py = parseInt(container.dataset.panY) || 0;
    var step = 30;
    switch (direction) {
      case "pan-up": py += step; break;
      case "pan-down": py -= step; break;
      case "pan-left": px += step; break;
      case "pan-right": px -= step; break;
    }
    container.dataset.panX = px;
    container.dataset.panY = py;
    svg.style.transform = "translate(" + px + "px, " + py + "px)";
    svg.style.transformOrigin = "top left";
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
