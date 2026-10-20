/* 背景开关：把模型里属于「场景」的 part 透明度切 0
 * 依赖 chunk/index2.js 暴露的 window.__l2dModel
 * part 下标按 moc3 里的顺序写死（用 part 数量区分模型，四个模型数量都不同）
 */
(function () {
  "use strict";

  var BG = {
    "54":  [0, 3, 4, 5, 6, 7, 8, 9, 10, 11],                        // Shalom_5 兰亭月会
    "90":  [2, 5, 18, 19, 20, 38, 39, 40, 72],                      // Shalom_2 审判席
    "92":  [9, 31, 32, 33, 34, 36], // Shalom_3 夜花如昼（只隐藏背景板/沙发/桌/烛台/窗帘/雕像） // Shalom_3 夜花如昼
    "108": [2, 4, 5, 6, 9, 10, 11, 12, 13, 21]                      // Shalom_4 星空红裙
  };

  var hidden = false;
  var btn = null;
  var appliedOn = null;

  function core() {
    var m = window.__l2dModel;
    if (!m || typeof m.getModel !== "function") return null;
    var c = m.getModel();
    return c && typeof c.setPartOpacityByIndex === "function" ? c : null;
  }

  function setAll(v) {
    var c = core();
    if (!c) return;
    var list = BG[String(c.getPartCount())];
    if (!list) return;
    for (var i = 0; i < list.length; i++) c.setPartOpacityByIndex(list[i], v);
  }

  function toggle() {
    hidden = !hidden;
    setAll(hidden ? 0 : 1);
    appliedOn = window.__l2dModel;
    if (btn) {
      btn.style.opacity = hidden ? "1" : ".6";
      btn.textContent = hidden ? "显示背景" : "隐藏背景";
    }
    return hidden;
  }

  function addButton() {
    var host = document.getElementById("waifu");
    if (!host) {
      setTimeout(addButton, 800);
      return;
    }
    if (document.getElementById("l2d-bg-toggle")) return;
    btn = document.createElement("button");
    btn.id = "l2d-bg-toggle";
    btn.type = "button";
    btn.textContent = "隐藏背景";
    btn.style.cssText =
      "position:absolute;top:6px;right:6px;z-index:30;padding:1px 8px;font-size:12px;line-height:20px;" +
      "border:0;border-radius:10px;background:rgba(0,0,0,.35);color:#fff;cursor:pointer;opacity:.6;" +
      "transition:opacity .2s";
    btn.addEventListener("mouseenter", function () { btn.style.opacity = "1"; });
    btn.addEventListener("mouseleave", function () { btn.style.opacity = hidden ? "1" : ".6"; });
    btn.addEventListener("click", toggle);
    host.appendChild(btn);
  }

  // 换模型后重新压一次
  setInterval(function () {
    if (!hidden) return;
    if (window.__l2dModel && window.__l2dModel !== appliedOn) {
      setAll(0);
      appliedOn = window.__l2dModel;
    }
  }, 800);

  window.__l2dBgToggle = toggle;
  window.__l2dBgIndices = BG;

  addButton();
})();
