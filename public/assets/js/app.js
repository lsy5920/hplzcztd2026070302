/* ============================================================
   胡拍乱造创作组 · 全站共享脚本
   职责:导航渲染、登录状态、滚动动画、提示浮层、接口封装
   所有页面均先引入本文件,再引入各自的页面脚本
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 全局命名空间 ---------- */
  const HPLZ = (window.HPLZ = window.HPLZ || {});

  /* ---------- 1. 站点导航配置(新增页面时在此登记即可) ---------- */
  const NAV_ITEMS = [
    { no: "01", href: "index.html", text: "首页" },
    { no: "02", href: "works.html", text: "系列与选题" },
    { no: "03", href: "manual.html", text: "团队手册" },
    { no: "04", href: "tools.html", text: "创作工具" },
    { no: "05", href: "join.html", text: "申请加入" },
  ];

  /* ---------- 2. 小工具函数 ---------- */
  // 简写选择器
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  HPLZ.$ = $;
  HPLZ.$$ = $$;

  // 转义 HTML,防止用户输入注入页面
  HPLZ.esc = function (str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  // 当前页面文件名(默认 index.html)
  function currentPage() {
    const path = location.pathname.split("/").pop();
    return path === "" ? "index.html" : path;
  }

  /* ---------- 3. 提示浮层 toast ---------- */
  HPLZ.toast = function (msg, type) {
    let wrap = $(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.setAttribute("role", "status");
    el.textContent = msg;
    wrap.appendChild(el);
    // 4 秒后淡出移除
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 350);
    }, 4000);
  };

  /* ---------- 4. 接口封装(统一处理错误与中文提示) ---------- */
  HPLZ.api = async function (path, options) {
    const opts = Object.assign({ headers: {} }, options || {});
    if (opts.body && typeof opts.body === "object") {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(opts.body);
    }
    let res;
    try {
      res = await fetch(path, opts);
    } catch (e) {
      throw new Error("网络连接失败,请检查网络后重试");
    }
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      // 后端函数不存在时(本地直接打开 HTML),给出可理解的提示
      throw new Error("接口无响应:本页面需要部署在 Cloudflare Pages 上才能使用账号功能");
    }
    if (!res.ok || (data && data.ok === false)) {
      throw new Error((data && data.error) || "请求失败,请稍后重试");
    }
    return data;
  };

  /* ---------- 5. 登录状态(带 60 秒内存缓存) ---------- */
  let meCache = null;
  let meCacheAt = 0;
  HPLZ.me = async function (force) {
    const now = Date.now();
    if (!force && meCache !== null && now - meCacheAt < 60000) return meCache;
    try {
      const data = await HPLZ.api("/api/me");
      meCache = data.user || null;
    } catch (e) {
      meCache = null; // 未部署后端 / 未登录时静默降级
    }
    meCacheAt = Date.now();
    return meCache;
  };

  HPLZ.logout = async function () {
    try {
      await HPLZ.api("/api/logout", { method: "POST" });
    } catch (e) { /* 忽略 */ }
    meCache = null;
    HPLZ.toast("已退出登录,片场见!", "ok");
    setTimeout(() => (location.href = "index.html"), 600);
  };

  /* ---------- 6. 导航渲染 ---------- */
  function renderNav() {
    const mount = $("#site-nav");
    if (!mount) return;
    const page = currentPage();

    const linksHtml = NAV_ITEMS.map(function (item) {
      const active = item.href === page ? ' class="active"' : "";
      return '<li><a href="' + item.href + '"' + active + ">" + item.text + "</a></li>";
    }).join("");

    const drawerLinks = NAV_ITEMS.map(function (item) {
      const active = item.href === page ? ' class="active"' : "";
      return '<a href="' + item.href + '"' + active + '><span class="no">SCENE ' + item.no + "</span>" + item.text + "</a>";
    }).join("");

    mount.innerHTML =
      '<nav class="nav" id="nav-bar">' +
      '  <div class="nav-inner">' +
      '    <a class="nav-logo" href="index.html">' +
      '      <img src="assets/img/favicon.svg" alt="胡拍乱造四格标识">' +
      '      <span>胡拍乱造<span class="sub">HU PAI LUAN ZAO</span></span>' +
      "    </a>" +
      '    <ul class="nav-links">' + linksHtml + "</ul>" +
      '    <div class="nav-user" id="nav-user"></div>' +
      '    <button class="nav-burger" id="nav-burger" aria-label="打开菜单" aria-expanded="false"><span></span></button>' +
      "  </div>" +
      "</nav>" +
      '<div class="nav-drawer" id="nav-drawer">' + drawerLinks +
      '  <div class="drawer-user" id="drawer-user"></div>' +
      "</div>";

    // 汉堡菜单开合
    const burger = $("#nav-burger");
    burger.addEventListener("click", function () {
      const open = document.body.classList.toggle("menu-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.documentElement.style.overflow = open ? "hidden" : "";
    });
    // 点击抽屉内链接后收起
    $("#nav-drawer").addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        document.body.classList.remove("menu-open");
        document.documentElement.style.overflow = "";
      }
    });

    // 滚动加阴影
    const bar = $("#nav-bar");
    window.addEventListener("scroll", function () {
      bar.classList.toggle("scrolled", window.scrollY > 8);
    }, { passive: true });

    // 渲染登录状态
    renderUserArea();
  }

  async function renderUserArea() {
    const desk = $("#nav-user");
    const drawer = $("#drawer-user");
    if (!desk) return;
    const user = await HPLZ.me();

    if (user) {
      const roleText = { admin: "主理人", member: "成员", visitor: "访客" }[user.role] || user.role;
      desk.innerHTML =
        '<span class="who" title="' + HPLZ.esc(user.display_name) + '">' + HPLZ.esc(user.display_name) + "</span>" +
        '<a class="btn sm yellow" href="dashboard.html">成员空间</a>';
      if (drawer) {
        drawer.innerHTML =
          '<p class="hand">你好,' + HPLZ.esc(user.display_name) + "(" + roleText + ")</p>" +
          '<a class="btn yellow" href="dashboard.html">进入成员空间</a>' +
          '<button class="btn ghost" id="drawer-logout">退出登录</button>';
        const btn = $("#drawer-logout");
        if (btn) btn.addEventListener("click", HPLZ.logout);
      }
    } else {
      desk.innerHTML = '<button class="btn sm" id="nav-login-btn">登录 / 注册</button>';
      const nb = $("#nav-login-btn");
      if (nb) nb.addEventListener("click", function () { HPLZ.openLoginModal(); });
      if (drawer) {
        drawer.innerHTML = '<button class="btn primary" id="drawer-login-btn" style="width:100%;">登录 / 注册</button>';
        const db2 = $("#drawer-login-btn");
        if (db2) db2.addEventListener("click", function () {
          document.body.classList.remove("menu-open");
          document.documentElement.style.overflow = "";
          HPLZ.openLoginModal();
        });
      }
    }
  }
  HPLZ.refreshUserArea = renderUserArea;

  /* ---------- 7. 页脚渲染 ---------- */
  function renderFooter() {
    const mount = $("#site-footer");
    if (!mount) return;
    const year = new Date().getFullYear();
    mount.innerHTML =
      '<footer class="footer">' +
      '  <div class="footer-inner">' +
      "    <div>" +
      '      <div class="footer-brand"><img src="assets/img/favicon.svg" alt="胡拍乱造四格标识"><strong>胡拍乱造创作组</strong></div>' +
      '      <p class="footer-slogan">把脑洞拍出来,把日子造有趣。</p>' +
      '      <p class="footer-rec">REC · 第一个 12 周试运行进行中</p>' +
      "    </div>" +
      "    <div>" +
      "      <h4>SCENE INDEX / 页面</h4>" +
      "      <ul>" +
      NAV_ITEMS.map(function (i) { return '<li><a href="' + i.href + '">' + i.text + "</a></li>"; }).join("") +
      '        <li><a href="#" onclick="HPLZ.openLoginModal();return false;">登录 / 注册</a></li>' +
      "      </ul>" +
      "    </div>" +
      "    <div>" +
      "      <h4>CREW NOTES / 约定</h4>" +
      "      <ul>" +
      "        <li>兴趣优先 · 学习驱动 · 稳定共创</li>" +
      "        <li>完成优于完美,创意要能拍</li>" +
      "        <li>周日是拍摄日,也是见面日</li>" +
      "        <li>对事不对人,作品要留痕</li>" +
      "      </ul>" +
      "    </div>" +
      "  </div>" +
      '  <div class="footer-bottom"><p><span>© ' + year + " 胡拍乱造创作组 · 四个人的片场</span><span>本站为兴趣团队自建官网,不含商业推广</span><span>抖音搜索:胡拍乱造</span></p></div>" +
      "</footer>";
  }

  /* ---------- 8. 滚动进场动画 ---------- */
  function initReveal() {
    const items = $$(".rv");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("on"); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("on");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 9. 数字滚动 ---------- */
  function initCountUp() {
    const nums = $$("[data-count]");
    if (!nums.length) return;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const target = parseInt(el.getAttribute("data-count"), 10) || 0;
        const dur = 1100;
        const start = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 10. 跑马灯内容克隆(保证无缝循环) ---------- */
  function initMarquee() {
    $$(".marquee-track").forEach(function (track) {
      track.innerHTML = track.innerHTML + track.innerHTML;
    });
  }

  /* ---------- 11. 复制到剪贴板 ---------- */
  HPLZ.copy = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      HPLZ.toast("已复制到剪贴板,去粘贴吧!", "ok");
    } catch (e) {
      // 剪贴板接口不可用时的兜底方案
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        HPLZ.toast("已复制到剪贴板,去粘贴吧!", "ok");
      } catch (e2) {
        HPLZ.toast("复制失败,请手动选择文本复制", "err");
      }
      ta.remove();
    }
  };

  /* ---------- 12. 一键回顶部悬浮按钮 ---------- */
  function initBackToTop() {
    var btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', '回到顶部');
    btn.setAttribute('title', '回到顶部');
    btn.innerHTML = '&#8593;';
    document.body.appendChild(btn);
    var ticking = false;
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          btn.classList.toggle('show', window.scrollY > window.innerHeight * 0.6);
          ticking = false;
        });
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 13. 全站阅读进度条 ---------- */
  function initProgressBar() {
    if (document.getElementById('progress-film')) return;
    var bar = document.createElement('div');
    bar.className = 'progress-film';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking2 = false;
    function update() {
      var doc = document.documentElement;
      var total = doc.scrollHeight - window.innerHeight;
      bar.style.width = (total > 0 ? Math.min(1, window.scrollY / total) * 100 : 0).toFixed(2) + '%';
      ticking2 = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking2) { ticking2 = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 15. 全局登录/注册弹窗 ---------- */
  var _modalEl = null;
  var _modalCallback = null;

  function buildModal() {
    if (_modalEl) return _modalEl;
    var div = document.createElement("div");
    div.className = "auth-overlay";
    div.id = "auth-overlay";
    div.setAttribute("role", "dialog");
    div.setAttribute("aria-modal", "true");
    div.setAttribute("aria-label", "登录或注册");
    div.innerHTML =
      '<div class="auth-modal">' +
      '  <div class="auth-modal-head">' +
      '    <h2 class="huazi">签到，进片场</h2>' +
      '    <button class="auth-modal-close" id="auth-modal-close" aria-label="关闭">✕</button>' +
      "  </div>" +
      '  <div class="auth-modal-body">' +
      '    <div class="auth-modal-tabs" role="tablist">' +
      '      <button class="on" id="mtab-login" role="tab" aria-selected="true">登录</button>' +
      '      <button id="mtab-register" role="tab" aria-selected="false">注册新账号</button>' +
      "    </div>" +
      /* 登录面板 */
      '    <div class="auth-modal-panel on" id="mpanel-login" role="tabpanel">' +
      '      <form id="mlogin-form" novalidate>' +
      '        <div class="field" id="mlf-username"><label for="ml-username">账号</label>' +
      '          <input type="text" id="ml-username" autocomplete="username" maxlength="20" placeholder="你的账号">' +
      '          <span class="err">请填写账号</span></div>' +
      '        <div class="field" id="mlf-password"><label for="ml-password">密码</label>' +
      '          <input type="password" id="ml-password" autocomplete="current-password" maxlength="64" placeholder="你的密码">' +
      '          <span class="err">请填写密码</span></div>' +
      '        <button type="submit" class="btn primary" id="mlogin-btn" style="width:100%;margin-top:8px;">登录</button>' +
      "      </form>" +
      "    </div>" +
      /* 注册面板 */
      '    <div class="auth-modal-panel" id="mpanel-register" role="tabpanel">' +
      '      <form id="mregister-form" novalidate>' +
      '        <div class="field" id="mrf-username"><label for="mr-username">账号 <span class="tip">3-20位字母数字下划线</span></label>' +
      '          <input type="text" id="mr-username" autocomplete="username" maxlength="20" placeholder="例:xiaoming_01">' +
      '          <span class="err">账号格式不对</span></div>' +
      '        <div class="field" id="mrf-display"><label for="mr-display">昵称</label>' +
      '          <input type="text" id="mr-display" maxlength="20" placeholder="片场里大家怎么叫你">' +
      '          <span class="err">昵称不能为空</span></div>' +
      '        <div class="field"><label for="mr-email">邮箱 <span class="tip">用于接收审核通知，可以后再填</span></label>' +
      '          <input type="email" id="mr-email" autocomplete="email" maxlength="120" placeholder="例:xiaoming@example.com"></div>' +
      '        <div class="field" id="mrf-password"><label for="mr-password">密码 <span class="tip">至少6位</span></label>' +
      '          <input type="password" id="mr-password" autocomplete="new-password" maxlength="64" placeholder="至少6位">' +
      '          <span class="err">密码需6-64位</span></div>' +
      '        <div class="field" id="mrf-password2"><label for="mr-password2">再输一遍</label>' +
      '          <input type="password" id="mr-password2" autocomplete="new-password" maxlength="64" placeholder="两次要一致">' +
      '          <span class="err">两次密码不一致</span></div>' +
      '        <button type="submit" class="btn primary" id="mregister-btn" style="width:100%;margin-top:8px;">注册并进入片场</button>' +
      "      </form>" +
      "    </div>" +
      "  </div>" +
      "</div>";
    document.body.appendChild(div);
    _modalEl = div;

    // 关闭按钮 & 点遮罩关闭
    div.querySelector("#auth-modal-close").addEventListener("click", HPLZ.closeLoginModal);
    div.addEventListener("click", function (e) {
      if (e.target === div) HPLZ.closeLoginModal();
    });
    // Escape 关闭
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") HPLZ.closeLoginModal();
    });

    // 标签切换
    function switchMTab(showLogin) {
      div.querySelector("#mtab-login").classList.toggle("on", showLogin);
      div.querySelector("#mtab-register").classList.toggle("on", !showLogin);
      div.querySelector("#mtab-login").setAttribute("aria-selected", showLogin ? "true" : "false");
      div.querySelector("#mtab-register").setAttribute("aria-selected", showLogin ? "false" : "true");
      div.querySelector("#mpanel-login").classList.toggle("on", showLogin);
      div.querySelector("#mpanel-register").classList.toggle("on", !showLogin);
    }
    div.querySelector("#mtab-login").addEventListener("click", function () { switchMTab(true); });
    div.querySelector("#mtab-register").addEventListener("click", function () { switchMTab(false); });

    function setMInvalid(id, invalid) {
      var el = div.querySelector("#" + id);
      if (el) el.classList.toggle("invalid", invalid);
    }

    // 登录表单
    div.querySelector("#mlogin-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var username = div.querySelector("#ml-username").value.trim();
      var password = div.querySelector("#ml-password").value;
      setMInvalid("mlf-username", !username);
      setMInvalid("mlf-password", !password);
      if (!username || !password) return;
      var btn = div.querySelector("#mlogin-btn");
      btn.disabled = true; btn.textContent = "登录中…";
      try {
        var data = await HPLZ.api("/api/login", { method: "POST", body: { username: username, password: password } });
        meCache = data.user; meCacheAt = Date.now();
        HPLZ.toast("欢迎回来，" + data.user.display_name + "！", "ok");
        HPLZ.closeLoginModal();
        renderUserArea();
        if (_modalCallback) { _modalCallback(data.user); _modalCallback = null; }
      } catch (err) {
        HPLZ.toast(err.message, "err");
        btn.disabled = false; btn.textContent = "登录";
      }
    });

    // 注册表单
    div.querySelector("#mregister-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var username = div.querySelector("#mr-username").value.trim();
      var display  = div.querySelector("#mr-display").value.trim();
      var email    = div.querySelector("#mr-email").value.trim();
      var pwd      = div.querySelector("#mr-password").value;
      var pwd2     = div.querySelector("#mr-password2").value;
      var okUser   = /^[A-Za-z0-9_]{3,20}$/.test(username);
      var okDisp   = display.length >= 1;
      var okPwd    = pwd.length >= 6 && pwd.length <= 64;
      var okSame   = pwd === pwd2;
      setMInvalid("mrf-username", !okUser);
      setMInvalid("mrf-display", !okDisp);
      setMInvalid("mrf-password", !okPwd);
      setMInvalid("mrf-password2", !okSame);
      if (!okUser || !okDisp || !okPwd || !okSame) return;
      var btn = div.querySelector("#mregister-btn");
      btn.disabled = true; btn.textContent = "注册中…";
      try {
        var data = await HPLZ.api("/api/register", {
          method: "POST",
          body: { username: username, display_name: display, email: email, password: pwd },
        });
        meCache = data.user; meCacheAt = Date.now();
        HPLZ.toast(data.first_admin ? "注册成功！你是第一位用户，已自动成为主理人" : "注册成功，欢迎来到片场！", "ok");
        HPLZ.closeLoginModal();
        renderUserArea();
        if (_modalCallback) { _modalCallback(data.user); _modalCallback = null; }
      } catch (err) {
        HPLZ.toast(err.message, "err");
        btn.disabled = false; btn.textContent = "注册并进入片场";
      }
    });

    return div;
  }

  HPLZ.openLoginModal = function (opts) {
    var o = opts || {};
    _modalCallback = o.onSuccess || null;
    var overlay = buildModal();
    // 如需直接打开注册标签
    if (o.tab === "register") {
      overlay.querySelector("#mtab-register") && overlay.querySelector("#mtab-register").click();
    }
    overlay.classList.add("open");
    document.body.classList.add("auth-open");
    setTimeout(function () {
      var first = overlay.querySelector("input");
      if (first) first.focus();
    }, 200);
  };

  HPLZ.closeLoginModal = function () {
    if (!_modalEl) return;
    _modalEl.classList.remove("open");
    document.body.classList.remove("auth-open");
    _modalCallback = null;
  };

  /* ---------- 16. 启动 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    renderNav();
    renderFooter();
    initReveal();
    initCountUp();
    initMarquee();
    initBackToTop();
    initProgressBar();
  });
})();
