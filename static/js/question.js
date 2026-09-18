document.addEventListener("DOMContentLoaded", function () {
  initSteppers();
  initDropzone();
  initSubmitState();
  renderResults();
});

/* -----------------------------------------------------------
   Stepper (+/-) controls for MCQ / question counts
----------------------------------------------------------- */
function initSteppers() {
  document.querySelectorAll("[data-stepper]").forEach(function (stepper) {
    var input = stepper.querySelector("input[type=number]");
    var min = parseInt(input.min, 10) || 1;
    var max = parseInt(input.max, 10) || 15;

    stepper.querySelectorAll(".stepper__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var delta = parseInt(btn.dataset.step, 10);
        var next = (parseInt(input.value, 10) || min) + delta;
        next = Math.max(min, Math.min(max, next));
        input.value = next;
      });
    });

    input.addEventListener("blur", function () {
      var val = parseInt(input.value, 10);
      if (isNaN(val)) val = min;
      input.value = Math.max(min, Math.min(max, val));
    });
  });
}

/* -----------------------------------------------------------
   Dropzone: click-to-browse + drag & drop + filename preview
----------------------------------------------------------- */
function initDropzone() {
  var dropzone = document.getElementById("dropzone");
  var fileInput = document.getElementById("pdf_file");
  var textEl = document.getElementById("dropzone-text");
  var hintEl = document.getElementById("dropzone-hint");
  if (!dropzone || !fileInput) return;

  function showFile(file) {
    if (!file) return;
    textEl.textContent = file.name;
    hintEl.textContent = formatFileSize(file.size) + " \u00b7 ready to upload";
  }

  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) showFile(fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", function (e) {
    var files = e.dataTransfer.files;
    if (files && files[0] && files[0].type === "application/pdf") {
      fileInput.files = files;
      showFile(files[0]);
    }
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/* -----------------------------------------------------------
   Submit: show a brief loading state while the page reloads
   with results (this is a normal Django POST + full reload)
----------------------------------------------------------- */
function initSubmitState() {
  var form = document.getElementById("qgen-form");
  var btn = document.getElementById("submit-btn");
  var overlay = document.getElementById("loading-overlay");
  if (!form || !btn) return;

  form.addEventListener("submit", function (e) {
    var fileInput = document.getElementById("pdf_file");
    if (!fileInput.files || !fileInput.files[0]) return; // let native validation handle it

    btn.classList.add("is-stamping");
    btn.disabled = true;
    if (overlay) overlay.classList.add("is-visible");
  });
}

/* -----------------------------------------------------------
   Results: lightly parse the AI's markdown-ish output into
   HTML, then run a single staggered reveal animation.
----------------------------------------------------------- */
function renderResults() {
  var section = document.getElementById("results");
  var body = document.getElementById("results-body");
  if (!section || !body) return;

  var raw = body.dataset.raw || "";
  body.innerHTML = markdownLiteToHtml(raw);

  // Stagger the reveal of headings and question blocks by a small delay each,
  // as one orchestrated sequence rather than scroll-triggered effects.
  var blocks = body.querySelectorAll("h2, .qa-block");
  blocks.forEach(function (el, i) {
    el.style.animationDelay = (i * 45) + "ms";
  });

  // Trigger the reveal on the next frame so the animation classes apply cleanly.
  requestAnimationFrame(function () {
    section.classList.add("is-revealed");
  });

  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function markdownLiteToHtml(text) {
  if (!text) return "";

  // Normalize escaped newlines that may come through as literal \n
  text = text.replace(/\\n/g, "\n");

  var lines = text.split("\n");
  var html = "";
  var inList = false;
  var openBlock = false;

  function closeList() {
    if (inList) { html += "</ul>"; inList = false; }
  }
  function closeBlock() {
    closeList();
    if (openBlock) { html += "</div>"; openBlock = false; }
  }

  lines.forEach(function (line) {
    var trimmed = line.trim();

    if (/^#{1,2}\s+/.test(trimmed)) {
      closeBlock();
      html += "<h2>" + inlineFormat(trimmed.replace(/^#{1,2}\s+/, "")) + "</h2>";
      openBlock = true;
      html += '<div class="qa-block">';
      return;
    }
    if (/^#{3,4}\s+/.test(trimmed)) {
      closeList();
      html += "<h3>" + inlineFormat(trimmed.replace(/^#{3,4}\s+/, "")) + "</h3>";
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += "<li>" + inlineFormat(trimmed.replace(/^[-*]\s+/, "")) + "</li>";
      return;
    }
    if (trimmed === "") {
      closeList();
      return;
    }
    closeList();
    html += "<p>" + inlineFormat(trimmed) + "</p>";
  });

  closeBlock();
  return html || "<p>No content was returned.</p>";
}

function inlineFormat(str) {
  var escaped = str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}