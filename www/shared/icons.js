/**
 * icons.js — draws the small icons on signup, login-help and onboarding pages.
 * Those pages write icon names like <span class="material-symbols-outlined">lock</span>,
 * but the Material Symbols font was never bundled, so the NAME showed as text
 * (e.g. "alternate_email" over the email box). This swaps each name for a
 * matching inline SVG, and keeps working when page code changes the name
 * (e.g. the show/hide-password eye toggling to "visibility_off").
 */
(function () {
  var ICONS = {"alternate_email":"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8\"/>","mark_email_read":"<path d=\"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8\"/><path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\"/><path d=\"m16 19 2 2 4-4\"/>","history":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/><path d=\"M12 7v5l4 2\"/>","target":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>","arrow_forward":"<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>","lock":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>","visibility":"<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>","visibility_off":"<path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\"/><path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\"/><path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\"/><path d=\"m2 2 20 20\"/>","error":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"/><line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"/>","check_circle":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/>","person":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>","phone":"<path d=\"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z\"/>"};
  var style = document.createElement("style");
  style.textContent = ".material-symbols-outlined{font-family:inherit!important;line-height:1}" +
    ".material-symbols-outlined:not([data-ms]){color:transparent!important}" +
    ".material-symbols-outlined svg{width:1em;height:1em;display:block}";
  document.head.appendChild(style);

  function render(el) {
    var name = (el.textContent || "").trim();
    if (!name && el.dataset.ms) return;
    if (el.dataset.ms === name && el.querySelector("svg")) return;
    var body = ICONS[name];
    if (!body) return;
    el.dataset.ms = name;
    el.setAttribute("aria-hidden", el.tagName === "BUTTON" ? "false" : "true");
    if (el.tagName === "BUTTON" && !el.getAttribute("aria-label")) el.setAttribute("aria-label", name === "visibility_off" ? "Hide password" : "Show password");
    el.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" + body + "</svg>";
  }
  function all() { document.querySelectorAll(".material-symbols-outlined").forEach(render); }

  // Page code sets btn.textContent = "visibility_off" → re-draw that icon
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      var el = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      if (el && el.classList && el.classList.contains("material-symbols-outlined") && !el.querySelector("svg")) render(el);
    });
  }).observe(document.documentElement, { childList: true, characterData: true, subtree: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", all); else all();
})();
