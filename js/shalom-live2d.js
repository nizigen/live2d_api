/* 瑟琳 Live2D 看板娘 —— 模型和动作都在 live2d_api 仓库里，脚本也从那儿加载
 * 依赖：pixi.js 6 + pixi-live2d-display(cubism4) + Live2D Cubism Core
 * 动作触发规则见 ptn-live2d/动作说明.md
 */
(function () {
  "use strict";

  var SELF = (document.currentScript && document.currentScript.src) || "";
  var SELF_BASE = SELF.replace(/\/js\/[^\/?#]+.*$/, "/model/5732/");

  var MODEL_BASE_CANDIDATES = [
    SELF_BASE,
    "https://fastly.jsdelivr.net/gh/nizigen/live2d_api@main/model/5732/",
    "https://cdn.jsdelivr.net/gh/nizigen/live2d_api@main/model/5732/",
    "https://raw.githubusercontent.com/nizigen/live2d_api/main/model/5732/"
  ];

  var MODELS = ["Shalom_5", "Shalom_4", "Shalom_3", "Shalom_2"];

  var LIBS = [
    [
      "https://fastly.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js",
      "https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js"
    ],
    [
      "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js",
      "https://fastly.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2dcubismcore.js"
    ],
    [
      "https://fastly.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js",
      "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js"
    ]
  ];

  if (window.innerWidth < 900) return;

  var W = 360;
  var H = 520;
  var seq = 0;
  var app = null;
  var model = null;
  var current = 0;
  var lastActive = Date.now();
  var baseIndex = 0;

  function loadScript(urls, i) {
    i = i || 0;
    return new Promise(function (resolve, reject) {
      if (i >= urls.length) return reject(new Error("all cdn failed"));
      var s = document.createElement("script");
      s.src = urls[i];
      s.async = true;
      s.onload = resolve;
      s.onerror = function () {
        loadScript(urls, i + 1).then(resolve, reject);
      };
      document.head.appendChild(s);
    });
  }

  function baseURL() {
    if (window.SHALOM_L2D_BASE) return window.SHALOM_L2D_BASE;
    return MODEL_BASE_CANDIDATES[baseIndex] || MODEL_BASE_CANDIDATES[1];
  }

  function idle() {
    if (!model) return;
    ++seq;
    model.motion("Idle").catch(function () {});
  }

  function play(name) {
    if (!model) return;
    var my = ++seq;
    lastActive = Date.now();
    if (window.console && console.debug) console.debug("[shalom-l2d] motion:", name);
    var done = function () {
      if (my === seq) idle();
    };
    model.motion(name).then(done, done);
  }

  function has(group) {
    if (!model || !model.internalModel || !model.internalModel.settings) return false;
    var defs = model.internalModel.settings.motions;
    return !!(defs && defs[group] && defs[group].length);
  }

  function pick(list) {
    for (var i = 0; i < list.length; i++) if (has(list[i])) return list[i];
    return null;
  }

  /* 贴图按 mipmap + 线性过滤，画布按 2 倍超采样，避免缩小后发虚 */
  function sharpenTextures() {
    if (!model || !model.textures) return;
    model.textures.forEach(function (tex) {
      var bt = tex && tex.baseTexture;
      if (!bt) return;
      bt.mipmap = PIXI.MIPMAP_MODES.ON;
      bt.scaleMode = PIXI.SCALE_MODES.LINEAR;
      bt.update();
    });
  }

  function fit() {
    if (!model) return;
    var s = (H * 0.98) / model.height;
    model.scale.set(s);
    model.anchor.set(0.5, 1);
    model.position.set(W / 2, H);
  }

  function loadModel(index) {
    current = ((index % MODELS.length) + MODELS.length) % MODELS.length;
    var id = MODELS[current];
    if (model) {
      app.stage.removeChild(model);
      model.destroy();
      model = null;
    }
    var url = baseURL() + id + "/" + id + ".model3.json";
    return PIXI.live2d.Live2DModel.from(url, { autoInteract: false }).then(
      function (m) {
        model = m;
        app.stage.addChild(model);
        sharpenTextures();
        fit();
        var greet = pick(["Greet"]);
        if (greet) play(greet);
        else idle();
        lastActive = Date.now();
        return m;
      },
      function (err) {
        /* 这个基地址拿不到模型就换下一条 */
        if (!window.SHALOM_L2D_BASE && baseIndex < MODEL_BASE_CANDIDATES.length - 1) {
          baseIndex += 1;
          return loadModel(current);
        }
        throw err;
      }
    );
  }

  function onClick(ev) {
    if (!model) return;
    var r = ev.currentTarget.getBoundingClientRect();
    var y = (ev.clientY - r.top) / r.height;
    var motion;
    if (y < 0.3) {
      motion = pick(["Click_Head", "Click_Body"]);
    } else if (y < 0.72) {
      motion = pick(["Click_Hand", "Click_HandLeft", "Click_HandRight",
                     "Click_Body", "Click_Body1", "Click_Body2"]);
    } else {
      motion = pick(["Click_Leg", "Click_Body1", "Click_Body2", "Click_Body", "Click_Hand"]);
    }
    play(motion || "Idle");
  }

  function injectStyle() {
    if (document.getElementById("shalom-l2d-style")) return;
    var css = document.createElement("style");
    css.id = "shalom-l2d-style";
    css.textContent =
      "#shalom-l2d{position:fixed;left:16px;bottom:0;width:" + W + "px;z-index:9998;" +
      "font-family:inherit;user-select:none;pointer-events:none}" +
      "#shalom-l2d .sl2d-bar{display:flex;align-items:center;gap:6px;padding:0 6px 2px;" +
      "opacity:.55;transition:opacity .2s;pointer-events:auto}" +
      "#shalom-l2d:hover .sl2d-bar{opacity:1}" +
      "#shalom-l2d .sl2d-title{font-size:12px;letter-spacing:.12em;color:var(--red-1,#c33);" +
      "text-shadow:0 1px 6px rgba(255,255,255,.6)}" +
      "#shalom-l2d .sl2d-btn{margin-left:auto;width:20px;height:20px;line-height:1;padding:0;" +
      "border:0;border-radius:50%;background:rgba(0,0,0,.08);color:inherit;cursor:pointer;font-size:13px}" +
      "#shalom-l2d .sl2d-btn+.sl2d-btn{margin-left:0}" +
      "#shalom-l2d .sl2d-btn:hover{background:rgba(0,0,0,.18)}" +
      "#shalom-l2d .sl2d-stage{pointer-events:auto;cursor:pointer;overflow:hidden;height:" + H + "px}" +
      "#shalom-l2d canvas{display:block}" +
      "@media (max-width:900px){#shalom-l2d{display:none}}";
    document.head.appendChild(css);
  }

  function buildUI() {
    injectStyle();
    var box = document.createElement("div");
    box.id = "shalom-l2d";
    box.innerHTML =
      '<div class="sl2d-bar">' +
      '<span class="sl2d-title">瑟琳 · SHALOM</span>' +
      '<button class="sl2d-btn" data-act="switch" title="换装">↻</button>' +
      '<button class="sl2d-btn" data-act="hide" title="收起">×</button>' +
      "</div>" +
      '<div class="sl2d-stage"></div>';
    document.body.appendChild(box);

    var canvas = document.createElement("canvas");
    box.querySelector(".sl2d-stage").appendChild(canvas);

    app = new PIXI.Application({
      view: canvas,
      transparent: true,
      antialias: true,
      autoStart: true,
      autoDensity: true,
      width: W,
      height: H,
      resolution: Math.max(window.devicePixelRatio || 1, 2)
    });
    app.renderer.resize(W, H);

    canvas.addEventListener("click", onClick);
    box.querySelector('[data-act="switch"]').addEventListener("click", function () {
      loadModel(current + 1).catch(function (e) {
        console.warn("[shalom-l2d]", e);
      });
    });
    box.querySelector('[data-act="hide"]').addEventListener("click", function () {
      box.remove();
    });

    setInterval(function () {
      if (!model || Date.now() - lastActive < 60000) return;
      var b = pick(["Boring"]);
      if (b) play(b);
    }, 5000);
  }

  loadScript(LIBS[0])
    .then(function () { return loadScript(LIBS[1]); })
    .then(function () { return loadScript(LIBS[2]); })
    .then(function () {
      if (!window.PIXI || !PIXI.live2d) throw new Error("pixi-live2d-display 未就绪");
      buildUI();
      return loadModel(0);
    })
    .catch(function (e) {
      console.warn("[shalom-l2d] 加载失败", e);
    });
})();
