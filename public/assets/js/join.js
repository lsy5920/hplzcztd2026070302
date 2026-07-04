/* ============================================================
   角色卡页脚本：登录验证 + 出生年份校验 + 提交
   ============================================================ */
(function () {
  "use strict";
  const $ = HPLZ.$, $$ = HPLZ.$$;

  async function checkAuth() {
    const me = await HPLZ.me();
    const guard   = $("#join-auth-guard");
    const formWrap = $("#join-form-wrap");

    if (!me) {
      if (guard) guard.style.display = "block";
      if (formWrap) formWrap.style.display = "none";
      return null;
    }
    if (guard) guard.style.display = "none";
    if (formWrap) formWrap.style.display = "block";

    // 已有待审核角色卡 → 引导去成员空间
    try {
      const data = await HPLZ.api("/api/applications/mine");
      const pending = (data.applications || []).find(function (a) { return a.status === "pending"; });
      if (pending) {
        if (formWrap) formWrap.style.display = "none";
        const already = $("#join-already");
        if (already) already.style.display = "block";
      }
    } catch (_) {}

    return me;
  }

  checkAuth().then(function (me) {
    var loginBtn = HPLZ.$("#join-login-btn");
    if (loginBtn) {
      loginBtn.addEventListener("click", function () {
        HPLZ.openLoginModal({ onSuccess: function () { window.location.reload(); } });
      });
    }
    if (!me) return;

    const form = $("#join-form");
    if (!form) return;

    function setInvalid(id, invalid) {
      var el = $(id); if (el) el.classList.toggle("invalid", invalid);
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const name    = ($("#j-name") && $("#j-name").value.trim()) || "";
      const contact = ($("#j-contact") && $("#j-contact").value.trim()) || "";
      const wishes  = $$("#j-wish input:checked").map(function (c) { return c.value; });
      const birthRaw = ($("#j-birth") && $("#j-birth").value.trim()) || "";
      const birth   = parseInt(birthRaw, 10);
      const curYear = new Date().getFullYear();
      const validBirth = !isNaN(birth) && birth >= 1940 && birth <= curYear - 10;

      let bad = false;
      setInvalid("#f-name",  name.length < 1);   if (name.length < 1) bad = true;
      setInvalid("#f-contact", contact.length < 3); if (contact.length < 3) bad = true;
      setInvalid("#f-birth", !validBirth);          if (!validBirth) bad = true;
      if (!wishes.length) { HPLZ.toast("至少选一个你想尝试的方向", "err"); bad = true; }
      if (bad) return;

      const btn = $("#j-submit");
      btn.disabled = true;
      btn.textContent = "递交中…";

      try {
        // 同步更新出生年份到用户资料
        await HPLZ.api("/api/profile", {
          method: "PATCH",
          body: { birth_year: birth },
        });

        // 提交角色卡申请
        await HPLZ.api("/api/apply", {
          method: "POST",
          body: {
            name:         name,
            contact:      contact,
            wish:         wishes.join("、"),
            on_camera:    (document.querySelector('input[name="camera"]:checked') || {}).value || "",
            strengths:    ($("#j-strengths") && $("#j-strengths").value.trim()) || "",
            weakness:     ($("#j-weakness") && $("#j-weakness").value.trim()) || "",
            sunday_limit: ($("#j-sunday") && $("#j-sunday").value.trim()) || "",
            goal:         ($("#j-goal") && $("#j-goal").value.trim()) || "",            message:      ($("#j-message") && $("#j-message").value.trim()) || "",
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

