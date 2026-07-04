/* ============================================================
   申请加入页脚本：登录验证 + 表单校验 + 提交接口
   ============================================================ */
(function () {
  "use strict";
  const $ = HPLZ.$, $$ = HPLZ.$$;

  /* ---------- 优先检查登录状态 ---------- */
  async function checkAuth() {
    const me = await HPLZ.me();
    const guard = $("#join-auth-guard");
    const formWrap = $("#join-form-wrap");

    if (!me) {
      // 未登录：显示引导，隐藏表单
      if (guard) guard.style.display = "block";
      if (formWrap) formWrap.style.display = "none";
      return null;
    }
    // 已登录：隐藏引导，显示表单
    if (guard) guard.style.display = "none";
    if (formWrap) formWrap.style.display = "block";

    // 检查是否有待审核申请
    try {
      const data = await HPLZ.api("/api/applications/mine");
      const pending = (data.applications || []).find(a => a.status === "pending");
      if (pending) {
        // 已有待审核申请，引导去成员空间查看
        if (formWrap) formWrap.style.display = "none";
        const already = $("#join-already");
        if (already) already.style.display = "block";
      }
    } catch (_) {}

    return me;
  }

  checkAuth().then(function (me) {
    // 绑定未登录状态下的「登录/注册」按钮
    var loginBtn = HPLZ.$("#join-login-btn");
    if (loginBtn) {
      loginBtn.addEventListener("click", function () {
        HPLZ.openLoginModal({
          onSuccess: function () {
            // 登录成功后重新执行登录校验，刷新页面状态
            window.location.reload();
          },
        });
      });
    }

    if (!me) return;

    const form = $("#join-form");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = $("#j-name").value.trim();
      const contact = $("#j-contact").value.trim();
      const wishes = $$("#j-wish input:checked").map(function (c) { return c.value; });

      let bad = false;
      if (name.length < 1) { HPLZ.$$("#f-name")[0] && HPLZ.$$("#f-name")[0].classList.add("invalid"); bad = true; }
      if (contact.length < 3) { HPLZ.$$("#f-contact")[0] && HPLZ.$$("#f-contact")[0].classList.add("invalid"); bad = true; }
      if (!wishes.length) { HPLZ.toast("至少选一个你想尝试的方向", "err"); bad = true; }
      if (bad) return;

      const btn = $("#j-submit");
      btn.disabled = true;
      btn.textContent = "递交中…";

      try {
        await HPLZ.api("/api/apply", {
          method: "POST",
          body: {
            name: name,
            contact: contact,
            wish: wishes.join("、"),
            on_camera: (document.querySelector('input[name="camera"]:checked') || {}).value || "",
            strengths: $("#j-strengths").value.trim(),
            weakness: $("#j-weakness").value.trim(),
            sunday_limit: $("#j-sunday").value.trim(),
            goal: $("#j-goal").value.trim(),
            message: $("#j-message").value.trim(),
          },
        });
        form.style.display = "none";
        const done = $("#join-done");
        if (done) { done.style.display = "block"; done.scrollIntoView({ behavior: "smooth", block: "center" }); }
      } catch (err) {
        HPLZ.toast(err.message, "err");
        btn.disabled = false;
        btn.textContent = "递交角色卡";
      }
    });
  });
})();
