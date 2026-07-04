/* ============================================================
   登录/注册页脚本:标签切换、表单校验、调用后端接口
   ============================================================ */
(function () {
  "use strict";
  const $ = HPLZ.$;

  /* ---------- 已登录用户直接送进成员空间 ---------- */
  HPLZ.me().then(function (me) {
    if (me) location.href = "dashboard.html";
  });

  /* ---------- 登录 / 注册标签切换 ---------- */
  const tabLogin = $("#tab-login");
  const tabRegister = $("#tab-register");
  const panelLogin = $("#panel-login");
  const panelRegister = $("#panel-register");

  function switchTab(showLogin) {
    tabLogin.classList.toggle("on", showLogin);
    tabRegister.classList.toggle("on", !showLogin);
    tabLogin.setAttribute("aria-selected", showLogin ? "true" : "false");
    tabRegister.setAttribute("aria-selected", showLogin ? "false" : "true");
    panelLogin.style.display = showLogin ? "block" : "none";
    panelRegister.style.display = showLogin ? "none" : "block";
  }
  tabLogin.addEventListener("click", function () { switchTab(true); });
  tabRegister.addEventListener("click", function () { switchTab(false); });
  // 支持 login.html#register 直达注册
  if (location.hash === "#register") switchTab(false);

  function setInvalid(id, invalid) {
    const el = $("#" + id);
    if (el) el.classList.toggle("invalid", invalid);
  }

  /* ---------- 登录 ---------- */
  $("#login-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = $("#l-username").value.trim();
    const password = $("#l-password").value;

    setInvalid("lf-username", !username);
    setInvalid("lf-password", !password);
    if (!username || !password) return;

    const btn = $("#login-btn");
    btn.disabled = true;
    btn.textContent = "登录中…";
    try {
      const data = await HPLZ.api("/api/login", {
        method: "POST",
        body: { username: username, password: password },
      });
      HPLZ.toast("欢迎回来," + data.user.display_name + "!", "ok");
      setTimeout(function () { location.href = "dashboard.html"; }, 700);
    } catch (err) {
      HPLZ.toast(err.message, "err");
      btn.disabled = false;
      btn.textContent = "登录";
    }
  });

  /* ---------- 注册 ---------- */
  $("#register-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = $("#r-username").value.trim();
    const display = $("#r-display").value.trim();
    const pwd = $("#r-password").value;
    const pwd2 = $("#r-password2").value;

    const okUser = /^[A-Za-z0-9_]{3,20}$/.test(username);
    const okDisplay = display.length >= 1;
    const okPwd = pwd.length >= 6 && pwd.length <= 64;
    const okSame = pwd === pwd2;

    setInvalid("rf-username", !okUser);
    setInvalid("rf-display", !okDisplay);
    setInvalid("rf-password", !okPwd);
    setInvalid("rf-password2", !okSame);
    if (!okUser || !okDisplay || !okPwd || !okSame) return;

    const btn = $("#register-btn");
    btn.disabled = true;
    btn.textContent = "注册中…";
    try {
      const email = ($("#r-email") && $("#r-email").value.trim()) || "";
      const data = await HPLZ.api("/api/register", {
        method: "POST",
        body: { username: username, display_name: display, password: pwd, email: email },
      });
      if (data.first_admin) {
        HPLZ.toast("注册成功!你是第一位用户,已自动成为主理人", "ok");
      } else {
        HPLZ.toast("注册成功,欢迎来到片场!", "ok");
      }
      setTimeout(function () { location.href = "dashboard.html"; }, 900);
    } catch (err) {
      HPLZ.toast(err.message, "err");
      btn.disabled = false;
      btn.textContent = "注册并进入片场";
    }
  });
})();
