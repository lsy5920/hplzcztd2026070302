/* ============================================================
   成员空间脚本 v2
   功能：登录验证、今日任务、申请状态/重投、我的名片编辑、
         剧组名片墙、灵感池看板、申请审核(admin)、成员管理(admin)
   ============================================================ */
(function () {
  "use strict";
  const $ = HPLZ.$, $$ = HPLZ.$$;

  /* ---- 职位预设选项 ---- */
  const JOB_OPTIONS = [
    "主理人 / 创意导演", "制片统筹 / 发布运营", "摄影师 / 剪辑技术",
    "编剧 / 表演 / 美术道具", "场务 / 制片助理", "演员",
    "摄影助理", "剪辑助理", "运营助理", "自由人",
  ];

  /* ---- 周流程 ---- */
  const WEEK_FLOW = [
    { day: "周日", icon: "🎬", task: "集中拍摄日", detail: "批量拍 2-4 条；素材当日双备份；每条至少保留主镜头、补镜和干净声音。" },
    { day: "周一", icon: "📊", task: "数据复盘 + 灵感收集", detail: "写出上周复盘结论 3 条；每人至少投 1 张灵感卡。不争论「为什么没爆」，只提可验证改进。" },
    { day: "周二", icon: "💡", task: "选题会 / 异步投票", detail: "从灵感池选 2-3 个题，锁定本周主创。每个入选题都要有一句话设定。" },
    { day: "周三", icon: "✏️", task: "脚本初稿", detail: "本条主创完成脚本 V1：关键台词、结尾方式；演员读一遍能理解即合格。" },
    { day: "周四", icon: "🔒", task: "脚本锁版!", detail: "A+D+C 完成锁版脚本 + 镜头清单 + 道具表。锁版后只允许小改台词，不改核心结构。" },
    { day: "周五", icon: "🗂️", task: "制片准备", detail: "B 主责：场地、服装、道具、设备、授权、交通清单。缺失项有替代方案，高风险项直接删。" },
    { day: "周六", icon: "🏃", task: "轻排练 + 技术确认", detail: "C+D 主责：走位视频或语音排练；设备与存储检查。周日到场即可拍，不现场从零理解剧本。" },
  ];

  const STATUS_NAMES = { pool: "灵感池", review: "待评估", selected: "已入选", hold: "暂存" };
  const STATUS_KEYS  = ["pool", "review", "selected", "hold"];
  const ROLE_NAMES   = { admin: "主理人", member: "成员", visitor: "访客" };

  let currentUser = null;
  let ideasData = [];

  /* ===== 入口：验证登录 ===== */
  async function init() {
    const me = await HPLZ.me(true);
    if (!me) {
      const guard = $("#dash-guard");
      guard.innerHTML =
        '<div style="padding:80px 22px;text-align:center;">' +
        '<p class="hand" style="font-size:18px;margin-bottom:20px;">这里是成员空间，需要先签到才能进来。</p>' +
        '<button class="btn primary" id="guard-login-btn">登录 / 注册</button></div>';
      const btn = $("#guard-login-btn");
      if (btn) btn.addEventListener("click", function () {
        HPLZ.openLoginModal({ onSuccess: function () { location.reload(); } });
      });
      return;
    }
    currentUser = me;
    $("#dash-guard").style.display = "none";
    $("#dash-main").style.display = "block";

    // 欢迎语
    $("#dash-name").textContent = me.display_name;
    $("#dash-role").innerHTML = '<span class="role-badge ' + me.role + '">' + (ROLE_NAMES[me.role] || me.role) + "</span>";
    const greets = ["今天的灵感已经在路上了。", "周日开机，其余异步推进。", "完成优于完美，先拍出来。", "把脑洞拍出来，把日子造有趣。", "轮流做主角，今天轮到你了。"];
    $("#dash-greet").textContent = "—— " + greets[Math.floor(Math.random() * greets.length)];

    // 各区块初始化（并行加载）
    renderTodayCard();
    loadMyAppStatus();
    loadMyProfile();
    loadBoard();
    loadCrewCards();
    bindQuickIdea();
    bindLogout();

    if (me.role === "admin") {
      $$(".admin-only").forEach(function (el) { el.style.display = "block"; });
      loadApplications();
      loadMembers();
    }
  }

  /* ===== 今日任务卡 ===== */
  function renderTodayCard() {
    const d    = new Date().getDay();
    const flow = WEEK_FLOW[d];
    const title = $("#today-title");
    const card  = $("#today-card");
    if (title) title.innerHTML = "今天是<span class='hl'>" + flow.day + "</span>";
    if (!card) return;
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:14px;">' +
      '<span style="font-size:34px;line-height:1;">' + flow.icon + "</span>" +
      '<div><h3 style="font-size:20px;font-weight:900;margin-bottom:6px;">' + flow.task + "</h3>" +
      '<p style="color:var(--ink-soft);">' + HPLZ.esc(flow.detail) + "</p></div></div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;">' +
      '<a class="btn sm yellow" href="tools.html">打开工具间</a>' +
      (d === 0 ? '<a class="btn sm primary" href="tools.html#checklist">周日拍摄清单</a>' : "") +
      (d === 1 || d === 2 ? '<a class="btn sm" href="#board-grid" onclick="document.getElementById(\'quick-idea\').focus()">投一张灵感卡</a>' : "") +
      "</div>";
  }

  /* ===== 我的申请状态 ===== */
  async function loadMyAppStatus() {
    const container = $("#my-app-content");
    if (!container) return;
    try {
      const data = await HPLZ.api("/api/applications/mine");
      const apps = data.applications || [];
      if (!apps.length) {
        container.innerHTML =
          '<div class="pin-note" style="transform:rotate(0);">还没有提交过申请。' +
          '<a href="join.html" style="margin-left:10px;font-weight:800;">去申请加入 →</a></div>';
        return;
      }
      const latest = apps[0];
      const statusMap = { pending: "审核中", approved: "已通过", rejected: "暂未通过" };
      const dotClass  = latest.status === "approved" ? "approved" : (latest.status === "rejected" ? "rejected" : "pending");
      const html = [
        '<div class="app-status-bar">',
        '<span class="app-status-dot ' + dotClass + '"></span>',
        '<div style="flex:1">',
        '<strong>' + (statusMap[latest.status] || latest.status) + "</strong>",
        '<span style="color:var(--ink-faint);font-size:13px;margin-left:12px;">提交于 ' + (latest.created_at || "").slice(0, 10) + "</span>",
        latest.reject_note
          ? '<p style="margin:6px 0 0;font-size:14px;color:var(--ink-soft);">主理人反馈：' + HPLZ.esc(latest.reject_note) + "</p>"
          : "",
        "</div>",
        latest.status === "rejected"
          ? '<button class="btn sm yellow" id="resubmit-toggle">修改后重新提交</button>'
          : "",
        latest.status === "approved"
          ? '<span class="stamp ok" style="font-size:14px;">恭喜入组！</span>'
          : "",
        "</div>",
      ].join("");
      container.innerHTML = html + '<div class="resubmit-area" id="resubmit-area"></div>';

      // 驳回后展开重投表单
      const toggleBtn = $("#resubmit-toggle");
      const resubArea = $("#resubmit-area");
      if (toggleBtn && resubArea) {
        // 把最新一条申请的字段预填进重投表单
        resubArea.innerHTML = buildResubmitForm(latest);
        toggleBtn.addEventListener("click", function () {
          resubArea.classList.toggle("open");
          toggleBtn.textContent = resubArea.classList.contains("open") ? "收起" : "修改后重新提交";
        });
        const resubBtn = $("#do-resubmit");
        if (resubBtn) {
          resubBtn.addEventListener("click", async function () {
            resubBtn.disabled = true;
            resubBtn.textContent = "提交中…";
            try {
              await HPLZ.api("/api/apply", {
                method: "POST",
                body: collectResubmit(),
              });
              HPLZ.toast("新申请已送达，请耐心等待审核", "ok");
              loadMyAppStatus();
            } catch (err) {
              HPLZ.toast(err.message, "err");
              resubBtn.disabled = false;
              resubBtn.textContent = "提交";
            }
          });
        }
      }
    } catch (err) {
      container.innerHTML = '<div class="empty">' + HPLZ.esc(err.message) + "</div>";
    }
  }

  function buildResubmitForm(app) {
    const row = function (id, label, val, tip) {
      return '<div class="field"><label for="rs-' + id + '">' + label +
        (tip ? ' <span class="tip">' + tip + "</span>" : "") + "</label>" +
        '<input type="text" id="rs-' + id + '" maxlength="300" value="' + HPLZ.esc(val || "") + '"></div>';
    };
    return [
      '<div class="tape-card no-tape" style="margin-top:10px;border-style:dashed;">',
      '<h4 style="font-weight:900;margin-bottom:16px;">修改申请内容后重新提交</h4>',
      row("name", "你的称呼 *", app.name, ""),
      row("contact", "联系方式 *", app.contact, "微信/手机/抖音"),
      row("wish", "希望获得 *", app.wish, ""),
      row("strengths", "你擅长的事", app.strengths, ""),
      row("weakness", "不擅长或不愿做", app.weakness, ""),
      row("sunday", "周日参与限制", app.sunday_limit, ""),
      row("goal", "12 周个人目标", app.goal, ""),
      '<div class="field"><label for="rs-msg">想对团队说的话</label><textarea id="rs-msg" maxlength="500" rows="3">' + HPLZ.esc(app.message || "") + "</textarea></div>",
      '<button class="btn primary" id="do-resubmit">提交</button>',
      "</div>",
    ].join("");
  }

  function collectResubmit() {
    const v = function (id) { var el = $("#rs-" + id); return el ? el.value.trim() : ""; };
    return {
      name: v("name"), contact: v("contact"), wish: v("wish"),
      strengths: v("strengths"), weakness: v("weakness"),
      sunday_limit: v("sunday"), goal: v("goal"), message: v("msg"),
    };
  }

  /* ===== 我的名片（资料编辑） ===== */
  async function loadMyProfile() {
    const card = $("#my-profile-card");
    if (!card) return;
    try {
      const data = await HPLZ.api("/api/profile");
      const user = data.user;
      const jobOpts = JOB_OPTIONS.map(function (o) {
        return '<option value="' + HPLZ.esc(o) + '"' + (o === user.job_title ? " selected" : "") + ">" + HPLZ.esc(o) + "</option>";
      }).join("");
      card.innerHTML =
        '<div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center;margin-bottom:6px;">' +
        '<div class="crew-face" style="background:var(--rec);width:56px;height:56px;font-size:24px;">' +
          HPLZ.esc((user.display_name || "").charAt(0).toUpperCase()) +
        "</div>" +
        '<div style="flex:1;">' +
          '<strong style="font-size:18px;font-weight:900;">' + HPLZ.esc(user.display_name) + "</strong>" +
          '<p class="mono" style="font-size:11px;letter-spacing:.12em;color:var(--rec-deep);margin-top:3px;">' +
            (user.job_title || "(职位未设置)") + "</p>" +
          '<p style="font-size:13px;color:var(--ink-faint);margin-top:2px;">' +
            (user.email ? "📧 " + HPLZ.esc(user.email) : "邮箱未填写，审核通知将无法发送") +
          "</p>" +
        "</div>" +
        '<button class="btn sm yellow" id="profile-edit-toggle">编辑名片</button>' +
        "</div>" +
        '<div class="card-edit-form" id="profile-edit-form">' +
          '<div class="field"><label for="pe-name">昵称</label>' +
            '<input type="text" id="pe-name" maxlength="20" value="' + HPLZ.esc(user.display_name) + '"></div>' +
          '<div class="field"><label for="pe-email">邮箱 <span class="tip">用于接收审核通知</span></label>' +
            '<input type="email" id="pe-email" maxlength="120" value="' + HPLZ.esc(user.email || "") + '"></div>' +
          '<div class="field"><label for="pe-job">职位身份</label>' +
            '<div class="job-select-wrap"><select id="pe-job"><option value="">请选择…</option>' + jobOpts +
              '<option value="__custom__">自定义…</option></select>' +
            '<input type="text" id="pe-job-custom" maxlength="40" placeholder="填写自定义职位" style="flex:1;display:none;border:2px solid var(--ink);border-radius:6px;padding:9px 12px;font-family:inherit;font-size:15px;"></div></div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
            '<button class="btn sm primary" id="pe-save">保存</button>' +
            '<button class="btn sm ghost" id="pe-cancel">取消</button>' +
          "</div>" +
        "</div>";
      // 编辑开关
      var toggleBtn = $("#profile-edit-toggle");
      var form      = $("#profile-edit-form");
      toggleBtn.addEventListener("click", function () {
        form.classList.toggle("open");
        toggleBtn.textContent = form.classList.contains("open") ? "收起" : "编辑名片";
      });
      $("#pe-cancel").addEventListener("click", function () {
        form.classList.remove("open");
        toggleBtn.textContent = "编辑名片";
      });
      // 自定义职位切换
      var jobSel    = $("#pe-job");
      var jobCustom = $("#pe-job-custom");
      jobSel.addEventListener("change", function () {
        var show = jobSel.value === "__custom__";
        jobCustom.style.display = show ? "block" : "none";
        if (show) jobCustom.focus();
      });
      // 如果当前职位不在预设列表
      if (user.job_title && JOB_OPTIONS.indexOf(user.job_title) === -1 && user.job_title !== "") {
        jobSel.value = "__custom__";
        jobCustom.value = user.job_title;
        jobCustom.style.display = "block";
      }
      // 保存
      var saveBtn = $("#pe-save");
      saveBtn.addEventListener("click", async function () {
        saveBtn.disabled = true; saveBtn.textContent = "保存中…";
        try {
          var jobVal = jobSel.value === "__custom__" ? jobCustom.value.trim() : jobSel.value;
          await HPLZ.api("/api/profile", {
            method: "PATCH",
            body: {
              display_name: ($("#pe-name").value || "").trim(),
              email:        ($("#pe-email").value || "").trim(),
              job_title:    jobVal,
            },
          });
          HPLZ.toast("名片已保存！", "ok");
          await HPLZ.me(true);
          HPLZ.refreshUserArea();
          loadMyProfile(); // 刷新名片区
        } catch (err) {
          HPLZ.toast(err.message, "err");
        }
        saveBtn.disabled = false; saveBtn.textContent = "保存";
      });
    } catch (err) {
      if (card) card.innerHTML = '<p class="hand">' + HPLZ.esc(err.message) + "</p>";
    }
  }

  /* ===== 剧组名片墙 ===== */
  async function loadCrewCards() {
    const grid = $("#crew-cards");
    if (!grid) return;
    try {
      const data = await HPLZ.api("/api/members");
      const members = data.members || [];
      if (!members.length) {
        grid.innerHTML = '<div class="empty">暂无成员信息</div>';
        return;
      }
      const colors = ["var(--rec)", "var(--tape);color:var(--ink)", "var(--blue)", "var(--green)"];
      grid.innerHTML = members.map(function (m, i) {
        const isMe = currentUser && m.id === currentUser.id;
        const canEdit = isMe || (currentUser && currentUser.role === "admin");
        return (
          '<div class="tape-card crew-card' + (i % 2 === 1 ? " tilt-r" : "") + '">' +
          '<div class="crew-face" style="background:' + colors[i % 4] + ';">' +
            HPLZ.esc((m.display_name || "").charAt(0).toUpperCase()) +
          "</div>" +
          '<h3>' + HPLZ.esc(m.display_name) + (isMe ? ' <span class="role-badge visitor" style="background:var(--tape);">我</span>' : "") + "</h3>" +
          '<p class="role">' + HPLZ.esc(m.job_title || "职位未设置") + "</p>" +
          '<span class="role-badge ' + m.role + '">' + (ROLE_NAMES[m.role] || m.role) + "</span>" +
          (canEdit ? '<div style="margin-top:12px;"><button class="btn sm ghost crew-edit-btn" data-uid="' + m.id + '">编辑名片</button></div>' : "") +
          "</div>"
        );
      }).join("");
      // 绑定「编辑名片」按钮 → 跳到「我的名片」区
      $$(".crew-edit-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var uid = parseInt(btn.dataset.uid, 10);
          if (currentUser && uid === currentUser.id) {
            var form = $("#profile-edit-form");
            if (form) { form.classList.add("open"); form.scrollIntoView({ behavior: "smooth", block: "center" }); }
          } else if (currentUser && currentUser.role === "admin") {
            openAdminEditModal(uid);
          }
        });
      });
    } catch (err) {
      if (grid) grid.innerHTML = '<div class="empty">' + HPLZ.esc(err.message) + "</div>";
    }
  }

  /* 主理人在线编辑任意成员名片 */
  function openAdminEditModal(uid) {
    HPLZ.api("/api/members/" + uid).then(function (data) {
      const m = data.member;
      const jobOpts = JOB_OPTIONS.map(function (o) {
        return '<option value="' + HPLZ.esc(o) + '"' + (o === m.job_title ? " selected" : "") + ">" + HPLZ.esc(o) + "</option>";
      }).join("");
      const overlay = document.createElement("div");
      overlay.className = "auth-overlay open";
      overlay.innerHTML =
        '<div class="auth-modal">' +
        '  <div class="auth-modal-head"><h2 class="huazi">编辑成员名片</h2>' +
        '    <button class="auth-modal-close" id="crew-modal-close">✕</button></div>' +
        '  <div class="auth-modal-body">' +
        '    <div class="field"><label>昵称</label><input type="text" id="cm-name" maxlength="20" value="' + HPLZ.esc(m.display_name) + '"></div>' +
        '    <div class="field"><label>职位身份</label>' +
        '      <select id="cm-job"><option value="">请选择…</option>' + jobOpts +
        '        <option value="__custom__">自定义…</option></select></div>' +
        '    <div class="field" id="cm-custom-wrap" style="display:none;"><label>自定义职位</label>' +
        '      <input type="text" id="cm-job-custom" maxlength="40"></div>' +
        '    <button class="btn primary" id="cm-save">保存名片</button>' +
        "  </div></div>";
      document.body.appendChild(overlay);
      document.body.classList.add("auth-open");
      var close = function () { overlay.remove(); document.body.classList.remove("auth-open"); };
      overlay.querySelector("#crew-modal-close").addEventListener("click", close);
      overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
      // 自定义职位
      var cmJob = overlay.querySelector("#cm-job");
      var cmCustomWrap = overlay.querySelector("#cm-custom-wrap");
      var cmCustom = overlay.querySelector("#cm-job-custom");
      if (m.job_title && JOB_OPTIONS.indexOf(m.job_title) === -1 && m.job_title !== "") {
        cmJob.value = "__custom__"; cmCustomWrap.style.display = "block"; cmCustom.value = m.job_title;
      }
      cmJob.addEventListener("change", function () {
        var show = cmJob.value === "__custom__";
        cmCustomWrap.style.display = show ? "block" : "none";
      });
      overlay.querySelector("#cm-save").addEventListener("click", async function () {
        var btn = overlay.querySelector("#cm-save");
        btn.disabled = true; btn.textContent = "保存中…";
        try {
          var jobVal = cmJob.value === "__custom__" ? cmCustom.value.trim() : cmJob.value;
          await HPLZ.api("/api/members/" + uid, {
            method: "PATCH",
            body: { display_name: (overlay.querySelector("#cm-name").value || "").trim(), job_title: jobVal },
          });
          HPLZ.toast("名片已保存！", "ok");
          close();
          loadCrewCards();
        } catch (err) {
          HPLZ.toast(err.message, "err");
          btn.disabled = false; btn.textContent = "保存名片";
        }
      });
    }).catch(function (err) { HPLZ.toast(err.message, "err"); });
  }

  /* ===== 灵感池看板 ===== */
  function renderBoard() {
    HPLZ.api("/api/ideas").then(function (data) {
      ideasData = data.ideas || [];
      renderColumns();
    }).catch(function (e) { HPLZ.toast(e.message, "err"); });
  }

  function loadBoard() { renderBoard(); }

  function renderColumns() {
    STATUS_KEYS.forEach(function (status) {
      const body = $('[data-body="' + status + '"]');
      const cnt  = $('[data-count-col="' + status + '"]');
      if (!body) return;
      const cards = ideasData.filter(function (i) { return i.status === status; });
      if (cnt) cnt.textContent = cards.length;
      if (!cards.length) { body.innerHTML = '<div class="empty">暂无</div>'; return; }
      body.innerHTML = cards.map(function (idea) { return renderIdeaCard(idea); }).join("");
      body.querySelectorAll("[data-move]").forEach(function (btn) {
        btn.addEventListener("click", function () { moveIdea(parseInt(btn.dataset.id, 10), btn.dataset.move); });
      });
      body.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () { deleteIdea(parseInt(btn.dataset.id, 10)); });
      });
    });
  }

  function renderIdeaCard(idea) {
    const canEdit = currentUser && (currentUser.role === "admin" || currentUser.role === "member");
    const isOwn   = currentUser && idea.user_id === currentUser.id;
    const canDel  = currentUser && (currentUser.role === "admin" || isOwn);
    const moveOpts = STATUS_KEYS.filter(function (s) { return s !== idea.status; }).map(function (s) {
      return '<button class="ops-btn" data-move="' + s + '" data-id="' + idea.id + '">→ ' + STATUS_NAMES[s] + "</button>";
    }).join("");
    return (
      '<div class="idea-card"><h4>' + HPLZ.esc(idea.title) + "</h4>" +
      '<div class="meta"><span>' + HPLZ.esc(idea.author || "") + "</span>" +
      (idea.score_total ? '<span class="sc">' + idea.score_total + " 分</span>" : "<span>未评分</span>") + "</div>" +
      (canEdit || canDel
        ? '<div class="ops">' + (canEdit ? moveOpts : "") +
          (canDel ? '<button class="ops-btn danger" data-del="1" data-id="' + idea.id + '">删除</button>' : "") + "</div>"
        : "") +
      "</div>"
    );
  }

  async function moveIdea(id, newStatus) {
    try {
      await HPLZ.api("/api/ideas/" + id, { method: "PATCH", body: { status: newStatus } });
      const idx = ideasData.findIndex(function (i) { return i.id === id; });
      if (idx !== -1) ideasData[idx].status = newStatus;
      renderColumns();
    } catch (e) { HPLZ.toast(e.message, "err"); }
  }

  async function deleteIdea(id) {
    if (!confirm("确认删除这张灵感卡？操作不可撤销。")) return;
    try {
      await HPLZ.api("/api/ideas/" + id, { method: "DELETE" });
      ideasData = ideasData.filter(function (i) { return i.id !== id; });
      renderColumns();
      HPLZ.toast("已删除", "ok");
    } catch (e) { HPLZ.toast(e.message, "err"); }
  }

  function bindQuickIdea() {
    const input = $("#quick-idea");
    const btn   = $("#quick-idea-btn");
    if (!input || !btn) return;
    btn.addEventListener("click", async function () {
      const title = input.value.trim();
      if (title.length < 4) { HPLZ.toast("一句话设定至少写 4 个字", "err"); input.focus(); return; }
      btn.disabled = true;
      try {
        await HPLZ.api("/api/ideas", { method: "POST", body: { title: title } });
        HPLZ.toast("已投进灵感池！", "ok");
        input.value = "";
        renderBoard();
      } catch (e) { HPLZ.toast(e.message, "err"); }
      btn.disabled = false;
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });
  }

  /* ===== 主理人：申请审核 ===== */
  async function loadApplications() {
    const wrap = $("#applications-list");
    if (!wrap) return;
    try {
      const data = await HPLZ.api("/api/applications");
      const apps = data.applications || [];
      if (!apps.length) { wrap.innerHTML = '<div class="empty">暂无申请</div>'; return; }
      const statusLabel = { pending: "待审核", approved: "已通过", rejected: "已婉拒" };
      wrap.innerHTML = apps.map(function (app) {
        const isPending = app.status === "pending";
        return (
          '<div class="list-row">' +
          '<div class="grow">' +
            '<h4>' + HPLZ.esc(app.name) +
              ' <span class="role-badge ' + (isPending ? "visitor" : app.status === "approved" ? "member" : "") + '">' +
              (statusLabel[app.status] || app.status) + "</span></h4>" +
            '<p class="sub">联系：' + HPLZ.esc(app.contact) + " · " + (app.created_at || "").slice(0, 10) + "</p>" +
            (app.wish ? '<p class="sub">希望：' + HPLZ.esc(app.wish) + "</p>" : "") +
            (app.strengths ? '<p class="sub">擅长：' + HPLZ.esc(app.strengths) + "</p>" : "") +
            (app.message ? '<p class="sub">Ta 说：' + HPLZ.esc(app.message) + "</p>" : "") +
          "</div>" +
          (isPending
            ? '<div class="ops" style="flex-direction:column;gap:8px;">' +
              '<div style="display:flex;gap:8px;">' +
                '<button class="btn sm primary" data-appid="' + app.id + '" data-action="approve">通过</button>' +
                '<button class="btn sm ghost" data-appid="' + app.id + '" data-action="reject">婉拒</button>' +
              "</div>" +
              '<input type="text" class="reject-note-input" data-appid="' + app.id + '" maxlength="200" ' +
                'placeholder="驳回备注（选填，会发邮件给对方）" ' +
                'style="border:1.5px solid var(--line);border-radius:6px;padding:8px 10px;font-family:inherit;font-size:13.5px;width:100%;max-width:300px;">' +
              "</div>"
            : "") +
          "</div>"
        );
      }).join("");
      wrap.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          const id     = parseInt(btn.dataset.appid, 10);
          const action = btn.dataset.action;
          const noteEl = wrap.querySelector('.reject-note-input[data-appid="' + id + '"]');
          const note   = noteEl ? noteEl.value.trim() : "";
          btn.disabled = true;
          try {
            const res = await HPLZ.api("/api/applications/review", {
              method: "POST", body: { id, action, reject_note: note },
            });
            HPLZ.toast(res.message, "ok");
            loadApplications();
          } catch (err) { HPLZ.toast(err.message, "err"); btn.disabled = false; }
        });
      });
    } catch (err) {
      if (wrap) wrap.innerHTML = '<div class="empty">' + HPLZ.esc(err.message) + "</div>";
    }
  }

  /* ===== 主理人：申请审核 ===== */
  async function loadApplications() {
    const wrap = $("#applications-list");
    if (!wrap) return;
    try {
      const data = await HPLZ.api("/api/applications");
      const apps = data.applications || [];
      if (!apps.length) { wrap.innerHTML = '<div class="empty">暂无申请</div>'; return; }
      const statusLabel = { pending: "待审核", approved: "已通过", rejected: "已婉拒" };
      wrap.innerHTML = apps.map(function (app) {
        const isPending = app.status === "pending";
        return (
          '<div class="list-row">' +
          '<div class="grow">' +
          '<h4>' + HPLZ.esc(app.name) +
            ' <span class="role-badge ' + (isPending ? "visitor" : (app.status === "approved" ? "member" : "")) + '">' +
            (statusLabel[app.status] || app.status) + "</span></h4>" +
          '<p class="sub">联系：' + HPLZ.esc(app.contact) + ' · ' + (app.created_at || "").slice(0, 10) + "</p>" +
          (app.wish ? '<p class="sub">希望：' + HPLZ.esc(app.wish) + "</p>" : "") +
          (app.strengths ? '<p class="sub">擅长：' + HPLZ.esc(app.strengths) + "</p>" : "") +
          (app.message ? '<p class="sub">Ta说：' + HPLZ.esc(app.message) + "</p>" : "") +
          "</div>" +
          (isPending
            ? '<div class="ops">' +
              '<button class="btn sm primary" data-appid="' + app.id + '" data-action="approve">通过</button>' +
              '<div style="flex:1 1 100%;max-width:300px;margin-top:6px;">' +
                '<input type="text" class="reject-note-input" data-appid="' + app.id + '" maxlength="200" ' +
                  'placeholder="驳回备注（选填，会发邮件给对方）" ' +
                  'style="width:100%;border:1.5px solid var(--line);border-radius:6px;padding:8px 10px;font-family:inherit;font-size:14px;">' +
              "</div>" +
              '<button class="btn sm ghost" data-appid="' + app.id + '" data-action="reject">婉拒</button>' +
              "</div>"
            : "") +
          "</div>"
        );
      }).join("");
      wrap.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          const id     = parseInt(btn.dataset.appid, 10);
          const action = btn.dataset.action;
          const noteEl = wrap.querySelector('.reject-note-input[data-appid="' + id + '"]');
          const note   = noteEl ? noteEl.value.trim() : "";
          btn.disabled = true;
          try {
            const res = await HPLZ.api("/api/applications/review", {
              method: "POST",
              body: { id: id, action: action, reject_note: note },
            });
            HPLZ.toast(res.message, "ok");
            loadApplications();
          } catch (err) {
            HPLZ.toast(err.message, "err");
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      if (wrap) wrap.innerHTML = '<div class="empty">' + HPLZ.esc(err.message) + "</div>";
    }
  }

  /* ===== 主理人：成员管理 ===== */
  async function loadMembers() {
    const wrap = $("#members-list");
    if (!wrap) return;
    try {
      const data = await HPLZ.api("/api/members");
      const members = data.members || [];
      if (!members.length) { wrap.innerHTML = '<div class="empty">还没有注册用户</div>'; return; }
      const jobOpts = [""].concat(JOB_OPTIONS).map(function (o) {
        return '<option value="' + HPLZ.esc(o) + '">' + (o || "-- 选择职位 --") + "</option>";
      }).join("");
      wrap.innerHTML = members.map(function (m) {
        const isMe = m.id === currentUser.id;
        return (
          '<div class="list-row">' +
          '<div class="grow">' +
            '<h4>' + HPLZ.esc(m.display_name) +
              ' <span class="role-badge ' + m.role + '">' + (ROLE_NAMES[m.role] || m.role) + "</span>" +
              (isMe ? ' <span class="role-badge visitor" style="background:var(--tape);">我</span>' : "") +
            "</h4>" +
            '<p class="sub">账号：' + HPLZ.esc(m.username) + " · " + (m.created_at || "").slice(0, 10) + "</p>" +
            '<p class="sub">职位：' + HPLZ.esc(m.job_title || "未设置") + "</p>" +
          "</div>" +
          '<div class="ops" style="flex-direction:column;align-items:flex-end;gap:8px;">' +
            // 职位设置
            '<div style="display:flex;gap:8px;align-items:center;">' +
              '<select class="job-assign-sel" data-uid="' + m.id + '" style="border:1.5px solid var(--ink);border-radius:6px;padding:6px 10px;font-family:inherit;font-size:13px;">' +
                jobOpts +
              "</select>" +
              '<button class="btn sm yellow job-assign-btn" data-uid="' + m.id + '">设职位</button>' +
            "</div>" +
            // 角色调整（不能改自己或其他admin）
            (!isMe && m.role !== "admin"
              ? '<div style="display:flex;gap:8px;">' +
                  (m.role === "visitor"
                    ? '<button class="btn sm primary role-btn" data-uid="' + m.id + '" data-role="member">提升为成员</button>'
                    : '<button class="btn sm ghost role-btn" data-uid="' + m.id + '" data-role="visitor">调回访客</button>') +
                "</div>"
              : "") +
          "</div></div>"
        );
      }).join("");

      // 绑定职位设置
      wrap.querySelectorAll(".job-assign-btn").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          const uid = parseInt(btn.dataset.uid, 10);
          const sel = wrap.querySelector('.job-assign-sel[data-uid="' + uid + '"]');
          const job = sel ? sel.value : "";
          btn.disabled = true;
          try {
            const res = await HPLZ.api("/api/members/role", {
              method: "POST", body: { id: uid, action: "job_title", job_title: job },
            });
            HPLZ.toast(res.message, "ok");
            loadMembers(); loadCrewCards();
          } catch (err) { HPLZ.toast(err.message, "err"); }
          btn.disabled = false;
        });
      });

      // 绑定角色调整
      wrap.querySelectorAll(".role-btn").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          btn.disabled = true;
          try {
            const res = await HPLZ.api("/api/members/role", {
              method: "POST", body: { id: parseInt(btn.dataset.uid, 10), action: "role", role: btn.dataset.role },
            });
            HPLZ.toast(res.message, "ok");
            loadMembers(); loadCrewCards();
          } catch (err) { HPLZ.toast(err.message, "err"); }
          btn.disabled = false;
        });
      });
    } catch (err) {
      if (wrap) wrap.innerHTML = '<div class="empty">' + HPLZ.esc(err.message) + "</div>";
    }
  }

  /* ===== 退出登录 ===== */
  function bindLogout() {
    const btn = $("#dash-logout");
    if (btn) btn.addEventListener("click", HPLZ.logout);
  }

  /* ops-btn 样式（内联注入，避免污染全局） */
  const sty = document.createElement("style");
  sty.textContent =
    ".ops-btn{font-size:11.5px;border:1.5px solid var(--ink);background:var(--paper);border-radius:5px;" +
    "padding:3px 9px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s ease;}" +
    ".ops-btn:hover{background:var(--tape);transform:translateY(-1px);}" +
    ".ops-btn.danger:hover{background:var(--rec);color:#fff;}" +
    ".ops-btn:disabled{opacity:.4;pointer-events:none;}";
  document.head.appendChild(sty);

  /* ===== 启动 ===== */
  init();
})();