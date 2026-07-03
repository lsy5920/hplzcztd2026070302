/* ============================================================
   创作工具间脚本:评分器 / 灵感卡 / 拍摄清单 / 反馈 / 复盘
   ============================================================ */
(function () {
  "use strict";
  const $ = HPLZ.$, $$ = HPLZ.$$;

  /* ---------- 0. 工具标签切换 ---------- */
  const tabs = $$(".tool-tabs button");
  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabs.forEach(function (b) {
        b.classList.toggle("on", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      $$(".tool-panel").forEach(function (p) {
        p.classList.toggle("on", p.id === "tool-" + btn.dataset.tool);
      });
    });
  });
  // 支持 #idea 等锚点直达某个工具
  if (location.hash) {
    const target = $$(".tool-tabs button").find(function (b) {
      return "#" + b.dataset.tool === location.hash;
    });
    if (target) target.click();
  }

  /* ============================================================
     工具① 20 分制选题评分器(手册 3.4)
     ============================================================ */
  // 每个维度 0-4 分的文字说明(与手册评分表逐格对应)
  const SCORE_WORDS = {
    s1: ["设定不清", "需解释较多", "基本理解", "快速理解", "一句话就想看"],
    s2: ["无感觉", "小众", "部分人有感", "较强共鸣", "强烈代入"],
    s3: ["没有", "弱", "可预期", "有效", "出乎意料且合理"],
    s4: ["当前拍不了", "资源压力大", "需较多准备", "可控", "现有条件即可"],
    s5: ["一次性", "难延展", "可做 2 条", "可做多条", "可形成固定 IP"],
  };

  const sliders = ["s1", "s2", "s3", "s4", "s5"].map(function (id) { return $("#" + id); });

  function paintSlider(el) {
    // 用渐变背景画出已滑过的部分
    const pct = (el.value / el.max) * 100;
    el.style.setProperty("--fill", pct + "%");
  }

  function updateScore() {
    let total = 0;
    sliders.forEach(function (el) {
      const v = parseInt(el.value, 10);
      total += v;
      $('[data-val="' + el.id + '"]').textContent = v;
      $('[data-desc="' + el.id + '"]').textContent = SCORE_WORDS[el.id][v];
      paintSlider(el);
    });
    $("#score-total").textContent = total;

    // 图章判定(手册入选规则)
    const verdict = $("#score-verdict");
    const note = $("#score-note");
    let html = "", text = "";
    if (total >= 14) {
      html = '<span class="stamp ok stamp-in">入选!进脚本池</span>';
      text = "手册规定:14 分以上直接进入脚本池,周三写 V1。";
    } else if (total >= 11) {
      html = '<span class="stamp hold stamp-in">先拍小样</span>';
      text = "11-13 分:先用手机固定机位拍个不发布的小样,验证设定、笑点和可执行性。";
    } else {
      html = '<span class="stamp stamp-in">暂存</span>';
      text = "10 分及以下:暂存不硬拍。好点子会等你,烂周日不会。";
    }
    verdict.innerHTML = html;
    note.textContent = text;
  }

  if (sliders[0]) {
    sliders.forEach(function (el) { el.addEventListener("input", updateScore); });
    updateScore();
  }

  /* ============================================================
     工具② 灵感卡生成器(手册附录 B)
     ============================================================ */
  const ideaFields = {
    title: $("#idea-title"), obs: $("#idea-obs"), rule: $("#idea-rule"),
    esc: $("#idea-esc"), end: $("#idea-end"), res: $("#idea-res"), risk: $("#idea-risk"),
  };

  function ideaText() {
    const v = function (el) { return (el && el.value.trim()) || "(待填)"; };
    return [
      "🎬 胡拍乱造 · 灵感卡",
      "──────────────",
      "一句话设定:" + v(ideaFields.title),
      "生活观察:" + v(ideaFields.obs),
      "荒诞规则:" + v(ideaFields.rule),
      "升级路线:" + v(ideaFields.esc),
      "结尾:" + v(ideaFields.end),
      "所需资源:" + v(ideaFields.res),
      "可拍性风险:" + v(ideaFields.risk),
      "──────────────",
      "评分口令:懂/共鸣/反转/可拍/系列,各 0-4 分",
    ].join("\n");
  }

  function updateIdeaPreview() {
    const pv = $("#idea-preview");
    if (pv) pv.textContent = ideaText();
  }

  if (ideaFields.title) {
    Object.keys(ideaFields).forEach(function (k) {
      if (ideaFields[k]) ideaFields[k].addEventListener("input", updateIdeaPreview);
    });
    updateIdeaPreview();

    $("#idea-copy").addEventListener("click", function () { HPLZ.copy(ideaText()); });

    // 登录后可把灵感卡真实提交进 D1 灵感池
    $("#idea-submit").addEventListener("click", async function () {
      const title = ideaFields.title.value.trim();
      if (title.length < 4) {
        HPLZ.toast("一句话设定至少写 4 个字,让大家看得懂", "err");
        ideaFields.title.focus();
        return;
      }
      const me = await HPLZ.me();
      if (!me) {
        HPLZ.toast("投灵感池需要先登录,马上带你去", "err");
        setTimeout(function () { location.href = "login.html"; }, 900);
        return;
      }
      const btn = $("#idea-submit");
      btn.disabled = true;
      try {
        await HPLZ.api("/api/ideas", {
          method: "POST",
          body: {
            title: title,
            observation: ideaFields.obs.value.trim(),
            rule: ideaFields.rule.value.trim(),
            escalation: ideaFields.esc.value.trim(),
            ending: ideaFields.end.value.trim(),
            resources: ideaFields.res.value.trim(),
            risk: ideaFields.risk.value.trim(),
          },
        });
        HPLZ.toast("灵感已投进团队灵感池!去成员空间看看", "ok");
        Object.keys(ideaFields).forEach(function (k) { if (ideaFields[k]) ideaFields[k].value = ""; });
        updateIdeaPreview();
      } catch (e) {
        HPLZ.toast(e.message, "err");
      }
      btn.disabled = false;
    });

    // 已登录用户隐藏「需要登录」的批注
    HPLZ.me().then(function (me) {
      if (me) {
        const tip = $("#idea-login-tip");
        if (tip) tip.innerHTML = "批注:你已登录,点「投进团队灵感池」直接入库,全组可见。";
      }
    });
  }

  /* ============================================================
     工具③ 周日拍摄清单(手册附录 E)
     ============================================================ */
  const CHECKLIST = [
    { group: "出发前", items: ["LOCK 脚本已确认", "镜头单已打印/存手机", "场地已确认可拍", "人员到场已确认", "道具服装已按镜头表装箱", "设备已充电", "存储空间已清出"] },
    { group: "到场后", items: ["噪音检查通过", "光线检查通过", "构图确认", "白平衡/曝光确认", "收声戴耳机试听", "安全与路人情况确认"] },
    { group: "每场结束", items: ["主镜头已拍够", "近景已补", "反应镜头已补", "补镜完成", "连续性照片已拍", "场记已记录"] },
    { group: "撤场前", items: ["按镜头单查漏", "环境音已录", "封面素材已拍", "幕后素材已拍", "场地已恢复原状"] },
    { group: "离场后", items: ["素材双份备份完成", "文件已按规范命名", "素材位置已发群", "缺失项已记录"] },
  ];
  const CHECK_KEY = "hplz_checklist_v1";

  const mount = $("#checklist-mount");
  if (mount) {
    // 恢复本机保存的勾选进度
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(CHECK_KEY) || "{}"); } catch (e) { saved = {}; }

    let idx = 0;
    mount.innerHTML = CHECKLIST.map(function (g) {
      const rows = g.items.map(function (item) {
        const id = "ck" + idx++;
        const checked = saved[id] ? " checked" : "";
        return (
          '<label class="check-item"><input type="checkbox" id="' + id + '"' + checked + ">" +
          '<span class="box">✓</span><span class="txt">' + item + "</span></label>"
        );
      }).join("");
      return (
        '<div class="check-group tape-card no-tape"><h3>' + g.group +
        ' <span class="cnt">' + g.items.length + " 项</span></h3>" + rows + "</div>"
      );
    }).join("");

    const boxes = $$("#checklist-mount input[type=checkbox]");
    const totalEl = $("#check-total");
    const doneEl = $("#check-done");
    const ring = $("#ring-fg");
    const verdict = $("#check-verdict");
    const CIRC = 2 * Math.PI * 46; // 进度环周长

    totalEl.textContent = boxes.length;

    function updateChecklist() {
      const done = boxes.filter(function (b) { return b.checked; }).length;
      doneEl.textContent = done;
      const p = boxes.length ? done / boxes.length : 0;
      ring.style.strokeDashoffset = String(CIRC * (1 - p));
      ring.style.strokeDasharray = String(CIRC);
      ring.style.stroke = p >= 1 ? "var(--green)" : "var(--rec)";
      verdict.innerHTML = p >= 1
        ? '<span class="stamp ok stamp-in">齐活,开机!</span>'
        : (p >= 0.5 ? '<p class="hand">过半了,继续核对……</p>' : '<p class="hand">逐项打勾,别跳步。</p>');
      // 保存进度
      const state = {};
      boxes.forEach(function (b) { if (b.checked) state[b.id] = 1; });
      localStorage.setItem(CHECK_KEY, JSON.stringify(state));
    }

    boxes.forEach(function (b) { b.addEventListener("change", updateChecklist); });
    $("#check-reset").addEventListener("click", function () {
      boxes.forEach(function (b) { b.checked = false; });
      localStorage.removeItem(CHECK_KEY);
      updateChecklist();
      HPLZ.toast("清单已清空,下次拍摄见!", "ok");
    });
    updateChecklist();
  }

  /* ============================================================
     工具④ 粗剪反馈生成器(手册附录 F)
     ============================================================ */
  const fbIds = ["fb-work", "fb-best", "fb-must", "fb-opt", "fb-lesson"];

  function fbText() {
    const v = function (id) { const el = $("#" + id); return (el && el.value.trim()) || "(待填)"; };
    const pass = (document.querySelector('input[name="fb-pass"]:checked') || {}).value || "是";
    return [
      "✂️ 粗剪反馈 · " + v("fb-work"),
      "──────────────",
      "最有效片段:" + v("fb-best"),
      "必须修改:" + v("fb-must"),
      "可选修改:" + v("fb-opt"),
      "达到发布门槛:" + pass,
      "可沉淀经验:" + v("fb-lesson"),
      "──────────────",
      "规则:一人一次,必须改 1 条 + 可选改 1 条,带时间点。",
    ].join("\n");
  }

  function updateFb() {
    const pv = $("#fb-preview");
    if (pv) pv.textContent = fbText();
  }

  if ($("#fb-work")) {
    fbIds.forEach(function (id) { $("#" + id).addEventListener("input", updateFb); });
    $$('input[name="fb-pass"]').forEach(function (r) { r.addEventListener("change", updateFb); });
    $("#fb-copy").addEventListener("click", function () { HPLZ.copy(fbText()); });
    updateFb();
  }

  /* ============================================================
     工具⑤ 每周复盘六问(手册 10.5 + 附录 G)
     ============================================================ */
  const rvIds = ["rv1", "rv2", "rv3", "rv4", "rv5", "rv6"];
  const RV_LABELS = [
    "① 最满意片段",
    "② 可能划走处",
    "③ 有效准备",
    "④ 浪费来源",
    "⑤ 下周唯一实验",
    "⑥ 沉淀进模板",
  ];

  function rvText() {
    const state = (document.querySelector('input[name="rv-state"]:checked') || {}).value || "继续";
    const lines = rvIds.map(function (id, i) {
      const el = $("#" + id);
      return RV_LABELS[i] + ":" + ((el && el.value.trim()) || "(待填)");
    });
    const d = new Date();
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    return [
      "📋 胡拍乱造 · 每周复盘 " + dateStr,
      "──────────────",
    ].concat(lines, [
      "团队状态:" + state,
      "──────────────",
      "禁令:不说「没爆就是失败」,只提可验证改进。",
    ]).join("\n");
  }

  function updateRv() {
    const pv = $("#rv-preview");
    if (pv) pv.textContent = rvText();
  }

  if ($("#rv1")) {
    rvIds.forEach(function (id) { $("#" + id).addEventListener("input", updateRv); });
    $$('input[name="rv-state"]').forEach(function (r) { r.addEventListener("change", updateRv); });
    $("#rv-copy").addEventListener("click", function () { HPLZ.copy(rvText()); });
    updateRv();
  }
})();
