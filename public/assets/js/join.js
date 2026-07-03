/* ============================================================
   申请加入页脚本:表单校验 + 提交到 /api/apply
   ============================================================ */
(function () {
  "use strict";
  const $ = HPLZ.$, $$ = HPLZ.$$;

  const form = $("#join-form");
  if (!form) return;

  /* 单字段错误提示 */
  function setInvalid(fieldId, invalid) {
    const field = $("#" + fieldId);
    if (field) field.classList.toggle("invalid", invalid);
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = $("#j-name").value.trim();
    const contact = $("#j-contact").value.trim();
    // 收集多选「希望获得」
    const wishes = $$("#j-wish input:checked").map(function (c) { return c.value; });
    const camera = (document.querySelector('input[name="camera"]:checked') || {}).value || "";

    // 前端校验(后端还会再验一遍)
    let bad = false;
    setInvalid("f-name", name.length < 1);
    setInvalid("f-contact", contact.length < 3);
    if (name.length < 1) { bad = true; }
    if (contact.length < 3) { bad = true; }
    if (!wishes.length) {
      HPLZ.toast("至少选一个你想尝试的方向", "err");
      bad = true;
    }
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
          on_camera: camera,
          strengths: $("#j-strengths").value.trim(),
          weakness: $("#j-weakness").value.trim(),
          sunday_limit: $("#j-sunday").value.trim(),
          goal: $("#j-goal").value.trim(),
          message: $("#j-message").value.trim(),
        },
      });
      // 成功:切换到「已收到」场记板
      form.style.display = "none";
      const done = $("#join-done");
      done.style.display = "block";
      done.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      HPLZ.toast(err.message, "err");
      btn.disabled = false;
      btn.textContent = "递交角色卡";
    }
  });
})();
