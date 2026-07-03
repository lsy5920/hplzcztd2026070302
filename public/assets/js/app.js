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
      desk.innerHTML = '<a class="btn sm" href="login.html">登录 / 注册</a>';
      if (drawer) {
        drawer.innerHTML = '<a class="btn primary" href="login.html">登录 / 注册</a>';
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
      '        <li><a href="login.html">登录 / 注册</a></li>' +
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
    const btn = document.createElement("button");
    btn.className = "back-to-top";
    btn.setAttribute("aria-label", "回到顶部");
    btn.setAttribute("title", "回到顶部");
    btn.textContent = "↑";
    document.body.appendChild(btn);

    // 滚动超过一屏时显示
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          btn.classList.toggle("show", window.scrollY > window.innerHeight * 0.6);
          ticking = false;
        });
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 13. 全站阅读进度条 ---------- */
  function initProgressBar() {
    // 若页面已有自己的进度条(手册页)则跳过
    if (document.getElementById("progress-film")) return;
    const bar = document.createElement("div");
    bar.className = "progress-film";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    let ticking = false;
    function update() {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      bar.style.width = (total > 0 ? Math.min(1, window.scrollY / total) * 100 : 0).toFixed(2) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 14. 启动 ---------- */
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
