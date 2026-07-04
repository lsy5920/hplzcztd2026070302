/* ============================================================
   成员空间脚本 v3  ——  角色卡统一版
   ============================================================ */
(function () {
  "use strict";
  const $ = HPLZ.$, $$ = HPLZ.$$;

  const JOB_OPTIONS = [
    "主理人 / 创意导演", "制片统筹 / 发布运营", "摄影师 / 剪辑技术",
    "编剧 / 表演 / 美术道具", "场务 / 制片助理", "演员",
    "摄影助理", "剪辑助理", "运营助理", "自由人",
  ];
  const WEEK_FLOW = [
    { day: "周日", icon: "🎬", task: "集中拍摄日", detail: "批量拍 2-4 条；素材当日双备份。" },
    { day: "周一", icon: "📊", task: "数据复盘 + 灵感收集", detail: "写出复盘结论 3 条；每人至少投 1 张灵感卡。" },
    { day: "周二", icon: "💡", task: "选题会 / 异步投票", detail: "从灵感池选 2-3 个题，锁定本周主创。" },
    { day: "周三", icon: "✏️", task: "脚本初稿", detail: "主创完成脚本 V1：关键台词 + 结尾方式。" },
    { day: "周四", icon: "🔒", task: "脚本锁版!", detail: "锁版脚本 + 镜头清单。周四后只改台词。" },
    { day: "周五", icon: "🗂️", task: "制片准备", detail: "B 主责：场地、服装、道具、设备、授权清单。" },
    { day: "周六", icon: "🏃", task: "轻排练 + 技术确认", detail: "C+D 主责：走位视频；设备与存储检查。" },
  ];
  const STATUS_NAMES = { pool: "灵感池", review: "待评估", selected: "已入选", hold: "暂存" };
  const STATUS_KEYS  = ["pool", "review", "selected", "hold"];
  const ROLE_NAMES   = { admin: "主理人", member: "成员", visitor: "访客" };

  let currentUser = null;
  let ideasData   = [];

  /* ========== init ========== */
  async function init() {
    const me = await HPLZ.me(true);
    if (!me) {
      const g = $("#dash-guard");
      if (g) g.innerHTML =
        '<div style="padding:80px 22px;text-align:center;">' +
        '<p class="hand" style="font-size:18px;margin-bottom:20px;">这里是成员空间，需要先签到才能进来。</p>' +
        '<button class="btn primary" id="guard-btn">登录 / 注册</button></div>';
      const b = $("#guard-btn");
      if (b) b.addEventListener("click", function () {
        HPLZ.openLoginModal({ onSuccess: function () { location.reload(); } });
      });
      return;
    }
    currentUser = me;

    /* 访客只能访问角色卡页面，未通过审核前不进入成员空间 */
    if (me.role === "visitor") {
      var g = $("#dash-guard");
      if (g) g.innerHTML =
        '<div style="padding:80px 22px;text-align:center;">' +
        '<p class="hand" style="font-size:18px;margin-bottom:10px;">你的账号还没有通过角色卡审核。</p>' +
        '<p style="color:var(--ink-soft);margin-bottom:24px;">通过审核后身份升级为成员，即可进入成员空间。</p>' +
        '<a class="btn primary" href="join.html">前往角色卡页面查看状态</a>';
      return;
    }

    $("#dash-guard").style.display = "none";
    $("#dash-main").style.display  = "block";
    const dn = $("#dash-name"); if (dn) dn.textContent = me.display_name;
    const dr = $("#dash-role");
    if (dr) dr.innerHTML = '<span class="role-badge ' + me.role + '">' + (ROLE_NAMES[me.role] || me.role) + "</span>";
    const dg = $("#dash-greet");
    if (dg) { const gs = ["今天的灵感在路上。","周日开机。","完成优于完美。","把脑洞拍出来。","轮流做主角。"]; dg.textContent = "—— " + gs[Math.floor(Math.random() * gs.length)]; }
    renderTodayCard(); loadMyCard(); loadBoard(); loadCrewCards(); bindQuickIdea(); bindLogout();
    if (me.role === "admin") {
      $$(".admin-only").forEach(function (el) { el.style.display = "block"; });
      loadApplications(); loadMembers();
    }
  }

  /* ========== 今日任务 ========== */
  function renderTodayCard() {
    const d = new Date().getDay(), flow = WEEK_FLOW[d];
    const t = $("#today-title"), c = $("#today-card");
    if (t) t.innerHTML = "今天是<span class='hl'>" + flow.day + "</span>";
    if (!c) return;
    c.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:14px;">' +
      '<span style="font-size:34px;line-height:1;">' + flow.icon + "</span>" +
      '<div><h3 style="font-size:20px;font-weight:900;margin-bottom:6px;">' + flow.task + "</h3>" +
      '<p style="color:var(--ink-soft);">' + HPLZ.esc(flow.detail) + "</p></div></div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;">' +
      '<a class="btn sm yellow" href="tools.html">打开工具间</a>' +
      (d === 0 ? '<a class="btn sm primary" href="tools.html#checklist">拍摄清单</a>' : "") + "</div>";
  }


  /* ========== 我的角色卡 ========== */
  async function loadMyCard() {
    const box = $("#my-app-content");
    if (!box) return;
    box.innerHTML = '<div class="empty">加载中……</div>';
    try {
      const [ad, pd] = await Promise.all([HPLZ.api("/api/applications/mine"), HPLZ.api("/api/profile")]);
      const apps = ad.applications || [], user = pd.user, latest = apps[0] || null;
      const sMap = { pending: "审核中", approved: "已通过", rejected: "暂未通过" };
      const dot  = latest ? (latest.status === "approved" ? "approved" : latest.status === "rejected" ? "rejected" : "pending") : "";

      const jobOpts = JOB_OPTIONS.map(function (o) {
        return '<option value="' + HPLZ.esc(o) + '"' + (o === (user.job_title || "") ? " selected" : "") + ">" + HPLZ.esc(o) + "</option>";
      }).join("");

      const statusBar = latest
        ? '<div class="app-status-bar" style="margin-bottom:16px;"><span class="app-status-dot ' + dot + '"></span>' +
          '<div style="flex:1"><strong>角色卡状态：' + (sMap[latest.status] || latest.status) + "</strong>" +
          '<span style="color:var(--ink-faint);font-size:13px;margin-left:10px;">提交于 ' + (latest.created_at || "").slice(0, 10) + "</span>" +
          (latest.reject_note ? '<p style="margin:5px 0 0;font-size:14px;color:var(--ink-soft);">主理人反馈：' + HPLZ.esc(latest.reject_note) + "</p>" : "") + "</div>" +
          (latest.status === "approved" ? '<span class="stamp ok" style="font-size:13px;">恭喜入组！</span>' : "") + "</div>"
        : '<div class="pin-note" style="transform:none;margin-bottom:16px;">还没有角色卡。<a href="join.html" style="margin-left:8px;font-weight:800;">去填写 →</a></div>';

      const editCard = (latest && latest.status !== "pending")
        ? '<h4 style="font-weight:900;margin:18px 0 14px;">角色卡详情</h4>' +
          '<div class="field"><label>称呼 / 代号</label><input type="text" id="ce-cname" maxlength="30" value="' + HPLZ.esc(latest.name || "") + '"></div>' +
          '<div class="field"><label>联系方式</label><input type="text" id="ce-contact" maxlength="60" value="' + HPLZ.esc(latest.contact || "") + '"></div>' +
          '<div class="field"><label>希望获得</label><input type="text" id="ce-wish" maxlength="100" value="' + HPLZ.esc(latest.wish || "") + '"></div>' +
          '<div class="field"><label>擅长的事</label><textarea id="ce-str" maxlength="300" rows="2">' + HPLZ.esc(latest.strengths || "") + "</textarea></div>" +
          '<div class="field"><label>不擅长或不愿做</label><textarea id="ce-weak" maxlength="300" rows="2">' + HPLZ.esc(latest.weakness || "") + "</textarea></div>" +
          '<div class="field"><label>周日参与限制</label><input type="text" id="ce-sun" maxlength="200" value="' + HPLZ.esc(latest.sunday_limit || "") + '"></div>' +
          '<div class="field"><label>12 周个人目标</label><input type="text" id="ce-goal" maxlength="300" value="' + HPLZ.esc(latest.goal || "") + '"></div>' +
          '<div class="field"><label>想对团队说的话</label><textarea id="ce-msg" maxlength="500" rows="2">' + HPLZ.esc(latest.message || "") + "</textarea></div>"
        : (latest && latest.status === "pending" ? '<p class="hand" style="margin:12px 0;">角色卡审核中，等审核结束后可以编辑详情。</p>' : "");

      box.innerHTML =
        '<div class="tape-card no-tape">' + statusBar +
        '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">' +
          '<div class="crew-face" style="background:var(--rec);width:52px;height:52px;font-size:22px;">' + HPLZ.esc((user.display_name || "").charAt(0).toUpperCase()) + "</div>" +
          '<div style="flex:1;min-width:0;"><strong style="font-size:17px;">' + HPLZ.esc(user.display_name) + "</strong>" +
            '<p class="mono" style="font-size:11px;color:var(--rec-deep);margin:3px 0;">' + HPLZ.esc(user.job_title || "(职位未设置)") + "</p>" +
            '<p style="font-size:13px;color:var(--ink-faint);">' + (user.email ? "📧 " + HPLZ.esc(user.email) : "⚠️ 邮箱未填写") + "</p>" + (user.birth_year ? '<p style="font-size:12px;color:var(--ink-faint);">🎂 ' + user.birth_year + ' 年生</p>' : "") + "</div>" +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button class="btn sm yellow" id="ce-toggle">编辑角色卡</button>' +
            (latest && latest.status === "rejected" ? '<button class="btn sm primary" id="rs-toggle">修改后重新提交</button>' : "") +
          "</div></div>" +
        '<div class="card-edit-form" id="ce-form">' +
          '<h4 style="font-weight:900;margin:0 0 14px;">基本信息</h4>' +
          '<div class="field"><label>昵称</label><input type="text" id="ce-dname" maxlength="20" value="' + HPLZ.esc(user.display_name) + '"></div>' +
          '<div class="field"><label>邮箱 <span class="tip">接收通知用</span></label><input type="email" id="ce-email" maxlength="120" value="' + HPLZ.esc(user.email || "") + '"></div>' +
          '<div class="field"><label for="ce-birth">出生年份 <span class="tip">如 1998</span></label>' +
            '<input type="number" id="ce-birth" min="1940" max="2010" value="' + (user.birth_year || "") + '" placeholder="例：1998"></div>' +
          (currentUser && currentUser.role === "admin"
            ? '<div class="field"><label>职位身份 <span class="tip">仅主理人可设</span></label>' +
              '<div class="job-select-wrap"><select id="ce-job"><option value="">请选择…</option>' + jobOpts + '<option value="__custom__">自定义…</option></select>' +
              '<input type="text" id="ce-jobc" maxlength="40" placeholder="自定义职位" style="flex:1;display:none;border:2px solid var(--ink);border-radius:6px;padding:9px 12px;font-family:inherit;font-size:15px;"></div></div>'
            : '<p class="hand" style="font-size:13px;margin:4px 0 10px;">职位由主理人统一分配，如需更改请联系主理人。</p>') +
          editCard +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">' +
            '<button class="btn sm primary" id="ce-save">保存角色卡</button>' +
            '<button class="btn sm ghost" id="ce-cancel">取消</button>' +
          "</div></div>" +
        '<div class="resubmit-area" id="rs-area"></div>' +
        "</div>";

      var et = $("#ce-toggle"), ef = $("#ce-form");
      if (et && ef) {
        et.addEventListener("click", function () { ef.classList.toggle("open"); et.textContent = ef.classList.contains("open") ? "收起" : "编辑角色卡"; });
      }
      var cc = $("#ce-cancel"); if (cc) cc.addEventListener("click", function () { ef.classList.remove("open"); et.textContent = "编辑角色卡"; });

      var cj = $("#ce-job"), cjc = $("#ce-jobc");
      if (cj && cjc) {
        if (user.job_title && JOB_OPTIONS.indexOf(user.job_title) === -1 && user.job_title) { cj.value = "__custom__"; cjc.value = user.job_title; cjc.style.display = "block"; }
        cj.addEventListener("change", function () { cjc.style.display = cj.value === "__custom__" ? "block" : "none"; });
      }

      var sv = $("#ce-save");
      if (sv) sv.addEventListener("click", async function () {
        sv.disabled = true; sv.textContent = "保存中…";
        try {
          var jv = (cj && cj.value === "__custom__") ? (cjc ? cjc.value.trim() : "") : (cj ? cj.value : "");
          var birthVal = ($("#ce-birth") && $("#ce-birth").value || "").trim();
          var profileBody = {
            display_name: ($("#ce-dname") && $("#ce-dname").value || "").trim(),
            email: ($("#ce-email") && $("#ce-email").value || "").trim(),
          };
          if (birthVal) profileBody.birth_year = parseInt(birthVal, 10);
          if (currentUser && currentUser.role === "admin" && jv !== undefined) profileBody.job_title = jv;
          var saves = [HPLZ.api("/api/profile", { method: "PATCH", body: profileBody })];
          if (latest && latest.status !== "pending") {
            saves.push(HPLZ.api("/api/applications/mine", { method: "PATCH", body: {
              name: ($("#ce-cname") && $("#ce-cname").value || "").trim(),
              contact: ($("#ce-contact") && $("#ce-contact").value || "").trim(),
              wish: ($("#ce-wish") && $("#ce-wish").value || "").trim(),
              strengths: ($("#ce-str") && $("#ce-str").value || "").trim(),
              weakness: ($("#ce-weak") && $("#ce-weak").value || "").trim(),
              sunday_limit: ($("#ce-sun") && $("#ce-sun").value || "").trim(),
              goal: ($("#ce-goal") && $("#ce-goal").value || "").trim(),
              message: ($("#ce-msg") && $("#ce-msg").value || "").trim(),
            }}));
          }
          await Promise.all(saves);
          HPLZ.toast("角色卡已保存！", "ok"); await HPLZ.me(true); HPLZ.refreshUserArea(); loadMyCard();
        } catch (err) { HPLZ.toast(err.message, "err"); }
        sv.disabled = false; sv.textContent = "保存角色卡";
      });

      var rt = $("#rs-toggle"), ra = $("#rs-area");
      if (rt && ra) {
        ra.innerHTML =
          '<div class="tape-card no-tape" style="margin-top:10px;border-style:dashed;display:none;" id="rs-card">' +
          '<h4 style="font-weight:900;margin-bottom:14px;">修改后重新提交角色卡</h4>' +
          '<div class="field"><label>你的称呼 *</label><input type="text" id="rs-name" maxlength="30" value="' + HPLZ.esc((latest && latest.name) || "") + '"></div>' +
          '<div class="field"><label>联系方式 *</label><input type="text" id="rs-contact" maxlength="60" value="' + HPLZ.esc((latest && latest.contact) || "") + '"></div>' +
          '<div class="field"><label>希望获得</label><input type="text" id="rs-wish" maxlength="100" value="' + HPLZ.esc((latest && latest.wish) || "") + '"></div>' +
          '<div class="field"><label>想对团队说的话</label><textarea id="rs-msg" maxlength="500" rows="2">' + HPLZ.esc((latest && latest.message) || "") + "</textarea></div>" +
          '<button class="btn primary" id="do-rs">提交角色卡</button></div>';
        rt.addEventListener("click", function () {
          var rc = $("#rs-card"); if (rc) { var op = rc.style.display !== "block"; rc.style.display = op ? "block" : "none"; rt.textContent = op ? "收起" : "修改后重新提交"; }
        });
        var dr = $("#do-rs"); if (dr) dr.addEventListener("click", async function () {
          dr.disabled = true; dr.textContent = "提交中…";
          try {
            await HPLZ.api("/api/apply", { method: "POST", body: {
              name: ($("#rs-name") && $("#rs-name").value || "").trim(),
              contact: ($("#rs-contact") && $("#rs-contact").value || "").trim(),
              wish: ($("#rs-wish") && $("#rs-wish").value || "").trim(),
              message: ($("#rs-msg") && $("#rs-msg").value || "").trim(),
            }});
            HPLZ.toast("角色卡已重新提交！", "ok"); loadMyCard();
          } catch (err) { HPLZ.toast(err.message, "err"); }
          dr.disabled = false; dr.textContent = "提交角色卡";
        });
      }
    } catch (err) { box.innerHTML = '<div class="empty">' + HPLZ.esc(err.message) + "</div>"; }
  }

  /* ========== 剧组角色卡墙 ========== */
  async function loadCrewCards() {
    const grid = $("#crew-cards"); if (!grid) return;
    try {
      const data = await HPLZ.api("/api/members");
      const members = data.members || [];
      if (!members.length) { grid.innerHTML = '<div class="empty">暂无成员</div>'; return; }
      const colors = ["var(--rec)", "var(--tape);color:var(--ink)", "var(--blue)", "var(--green)"];
      grid.innerHTML = members.map(function (m, i) {
        const isMe = currentUser && m.id === currentUser.id;
        const canEdit = isMe || (currentUser && currentUser.role === "admin");
        return (
          '<div class="tape-card crew-card' + (i % 2 === 1 ? " tilt-r" : "") + '">' +
          '<div class="crew-face" style="background:' + colors[i % 4] + ';">' + HPLZ.esc((m.display_name || "").charAt(0).toUpperCase()) + "</div>" +
          '<h3>' + HPLZ.esc(m.display_name) + (isMe ? ' <span class="role-badge visitor" style="background:var(--tape);">我</span>' : "") + "</h3>" +
          '<p class="role">' + HPLZ.esc(m.job_title || "职位未设置") + "</p>" +
          '<span class="role-badge ' + m.role + '">' + (ROLE_NAMES[m.role] || m.role) + "</span>" +
          (canEdit ? '<div style="margin-top:12px;"><button class="btn sm ghost crew-edit" data-uid="' + m.id + '">编辑角色卡</button></div>' : "") +
          "</div>"
        );
      }).join("");
      $$(".crew-edit").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var uid = parseInt(btn.dataset.uid, 10);
          if (currentUser && uid === currentUser.id) {
            var f = $("#ce-form"); if (f) { f.classList.add("open"); f.scrollIntoView({ behavior: "smooth", block: "center" }); }
          } else if (currentUser && currentUser.role === "admin") { openAdminCardModal(uid); }
        });
      });
    } catch (err) { if (grid) grid.innerHTML = '<div class="empty">' + HPLZ.esc(err.message) + "</div>"; }
  }

  function openAdminCardModal(uid) {
    HPLZ.api("/api/members/" + uid).then(function (data) {
      var m = data.member;
      var jo = JOB_OPTIONS.map(function (o) {
        return '<option value="' + HPLZ.esc(o) + '"' + (o === m.job_title ? " selected" : "") + ">" + HPLZ.esc(o) + "</option>";
      }).join("");
      var ov = document.createElement("div"); ov.className = "auth-overlay open";
      ov.innerHTML =
        '<div class="auth-modal"><div class="auth-modal-head"><h2 class="huazi">编辑角色卡</h2>' +
        '<button class="auth-modal-close" id="acm-close">✕</button></div>' +
        '<div class="auth-modal-body">' +
        '<div class="field"><label>昵称</label><input type="text" id="acm-name" maxlength="20" value="' + HPLZ.esc(m.display_name) + '"></div>' +
        '<div class="field"><label>职位</label><select id="acm-job"><option value="">请选择…</option>' + jo + '<option value="__custom__">自定义…</option></select></div>' +
        '<div class="field" id="acm-cw" style="display:none;"><label>自定义职位</label><input type="text" id="acm-jobc" maxlength="40"></div>' +
        '<button class="btn primary" id="acm-save">保存</button></div></div>';
      document.body.appendChild(ov); document.body.classList.add("auth-open");
      var cl = function () { ov.remove(); document.body.classList.remove("auth-open"); };
      ov.querySelector("#acm-close").addEventListener("click", cl);
      ov.addEventListener("click", function (e) { if (e.target === ov) cl(); });
      var js = ov.querySelector("#acm-job"), jc = ov.querySelector("#acm-jobc"), jcw = ov.querySelector("#acm-cw");
      if (m.job_title && JOB_OPTIONS.indexOf(m.job_title) === -1 && m.job_title) { js.value = "__custom__"; jcw.style.display = "block"; jc.value = m.job_title; }
      js.addEventListener("change", function () { jcw.style.display = js.value === "__custom__" ? "block" : "none"; });
      var sb = ov.querySelector("#acm-save"); sb.addEventListener("click", async function () {
        sb.disabled = true; sb.textContent = "保存中…";
        try {
          var jv = js.value === "__custom__" ? jc.value.trim() : js.value;
          await HPLZ.api("/api/members/" + uid, { method: "PATCH", body: { display_name: (ov.querySelector("#acm-name").value || "").trim(), job_title: jv } });
          HPLZ.toast("角色卡已保存！", "ok"); cl(); loadCrewCards();
        } catch (err) { HPLZ.toast(err.message, "err"); }
        sb.disabled = false; sb.textContent = "保存";
      });
    }).catch(function (err) { HPLZ.toast(err.message, "err"); });
  }

  /* ========== 灵感池看板 ========== */
  function loadBoard() {
    HPLZ.api("/api/ideas").then(function (d) { ideasData = d.ideas || []; renderCols(); }).catch(function (e) { HPLZ.toast(e.message, "err"); });
  }
  function renderCols() {
    STATUS_KEYS.forEach(function (st) {
      var body = $('[data-body="' + st + '"]'), cnt = $('[data-count-col="' + st + '"]');
      if (!body) return;
      var cards = ideasData.filter(function (i) { return i.status === st; });
      if (cnt) cnt.textContent = cards.length;
      if (!cards.length) { body.innerHTML = '<div class="empty">暂无</div>'; return; }
      body.innerHTML = cards.map(function (idea) {
        var canEdit = currentUser && (currentUser.role === "admin" || currentUser.role === "member");
        var isOwn   = currentUser && idea.user_id === currentUser.id;
        var canDel  = currentUser && (currentUser.role === "admin" || isOwn);
        var moveOpts = STATUS_KEYS.filter(function (s) { return s !== idea.status; }).map(function (s) {
          return '<button class="ops-btn" data-move="' + s + '" data-id="' + idea.id + '">→ ' + STATUS_NAMES[s] + "</button>";
        }).join("");
        return '<div class="idea-card"><h4>' + HPLZ.esc(idea.title) + "</h4>" +
          '<div class="meta"><span>' + HPLZ.esc(idea.author || "") + "</span>" +
          (idea.score_total ? '<span class="sc">' + idea.score_total + " 分</span>" : "<span>未评分</span>") + "</div>" +
          (canEdit || canDel ? '<div class="ops">' + (canEdit ? moveOpts : "") +
            (canDel ? '<button class="ops-btn danger" data-del="1" data-id="' + idea.id + '">删除</button>' : "") + "</div>" : "") + "</div>";
      }).join("");
      body.querySelectorAll("[data-move]").forEach(function (btn) {
        btn.addEventListener("click", function () { moveIdea(parseInt(btn.dataset.id, 10), btn.dataset.move); });
      });
      body.querySelectorAll("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", function () { deleteIdea(parseInt(btn.dataset.id, 10)); });
      });
    });
  }
  async function moveIdea(id, ns) {
    try { await HPLZ.api("/api/ideas/" + id, { method: "PATCH", body: { status: ns } }); var ix = ideasData.findIndex(function (i) { return i.id === id; }); if (ix !== -1) ideasData[ix].status = ns; renderCols(); }
    catch (e) { HPLZ.toast(e.message, "err"); }
  }
  async function deleteIdea(id) {
    if (!confirm("确认删除这张灵感卡？")) return;
    try { await HPLZ.api("/api/ideas/" + id, { method: "DELETE" }); ideasData = ideasData.filter(function (i) { return i.id !== id; }); renderCols(); HPLZ.toast("已删除", "ok"); }
    catch (e) { HPLZ.toast(e.message, "err"); }
  }
  function bindQuickIdea() {
    var inp = $("#quick-idea"), btn = $("#quick-idea-btn"); if (!inp || !btn) return;
    btn.addEventListener("click", async function () {
      var t = inp.value.trim(); if (t.length < 4) { HPLZ.toast("至少写 4 个字", "err"); inp.focus(); return; }
      btn.disabled = true;
      try { await HPLZ.api("/api/ideas", { method: "POST", body: { title: t } }); HPLZ.toast("已投进灵感池！", "ok"); inp.value = ""; loadBoard(); }
      catch (e) { HPLZ.toast(e.message, "err"); }
      btn.disabled = false;
    });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });
  }

  /* ========== 主理人：角色卡审核 ========== */
  /* ========== 角色卡详情弹窗 ========== */
  function openAppModal(app) {
    var sl = { pending: "审核中", approved: "已通过", rejected: "已婉拒" };
    var dotClass = app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : "pending";
    var ip = app.status === "pending";

    /* 信息行辅助 */
    function row(label, val) {
      if (!val) return "";
      return '<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px dashed var(--line);">' +
        '<span style="flex:0 0 90px;font-size:13px;color:var(--ink-faint);font-weight:700;">' + label + "</span>" +
        '<span style="flex:1;font-size:14.5px;line-height:1.7;word-break:break-word;">' + HPLZ.esc(val) + "</span></div>";
    }

    var ov = document.createElement("div");
    ov.className = "auth-overlay open";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.innerHTML =
      '<div class="auth-modal" style="max-width:540px;">' +
      /* 场记板顶条 */
      '<div class="auth-modal-head">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<span class="app-status-dot ' + dotClass + '" style="width:12px;height:12px;flex-shrink:0;"></span>' +
          '<h2 class="huazi" style="font-size:18px;">' + HPLZ.esc(app.name) + '</h2>' +
          '<span class="role-badge ' + (ip ? "visitor" : app.status === "approved" ? "member" : "") + '" style="font-size:11px;">' + (sl[app.status] || app.status) + "</span>" +
        "</div>" +
        '<button class="auth-modal-close" id="app-modal-close" aria-label="关闭">✕</button>' +
      "</div>" +
      /* 正文 */
      '<div class="auth-modal-body" style="padding-top:8px;">' +
        /* 基本信息卡片 */
        '<div style="background:var(--paper-3);border-radius:8px;padding:4px 16px;margin-bottom:16px;">' +
          row("联系方式", app.contact) +
          row("出生年份", app.birth_year ? app.birth_year + " 年" : null) +
          row("提交时间", (app.created_at || "").slice(0, 10)) +
        "</div>" +
        /* 角色卡详情 */
        '<div style="background:var(--paper-2);border:1.5px solid var(--line);border-radius:8px;padding:4px 16px;margin-bottom:16px;">' +
          row("希望获得", app.wish) +
          row("出镜程度", app.on_camera) +
          row("擅长的事", app.strengths) +
          row("不擅长/不愿", app.weakness) +
          row("周日限制", app.sunday_limit) +
          row("12 周目标", app.goal) +
          row("对团队说", app.message) +
        "</div>" +
        /* 驳回备注区（仅 pending 时显示） */
        (ip
          ? '<div style="margin-bottom:12px;">' +
            '<label style="font-size:13px;font-weight:700;display:block;margin-bottom:6px;">驳回备注 <span style="color:var(--ink-faint);font-weight:400;">（选填，婉拒时发邮件给对方）</span></label>' +
            '<input type="text" id="app-modal-note" maxlength="200" placeholder="可以给对方一些具体建议……" ' +
              'style="width:100%;border:2px solid var(--ink);border-radius:6px;padding:10px 12px;font-family:inherit;font-size:14px;">' +
            "</div>" +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
              '<button class="btn primary" id="app-modal-approve" data-appid="' + app.id + '">✓ 通过角色卡</button>' +
              '<button class="btn ghost" id="app-modal-reject" data-appid="' + app.id + '">婉拒</button>' +
            "</div>"
          : (app.reject_note
              ? '<div class="pin-note" style="transform:none;">主理人反馈：' + HPLZ.esc(app.reject_note) + "</div>"
              : "")) +
      "</div></div>";

    document.body.appendChild(ov);
    document.body.classList.add("auth-open");

    var close = function () { ov.remove(); document.body.classList.remove("auth-open"); };
    ov.querySelector("#app-modal-close").addEventListener("click", close);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });

    if (!ip) return;

    /* 审核按钮 */
    async function doReview(action) {
      var note = (ov.querySelector("#app-modal-note") && ov.querySelector("#app-modal-note").value.trim()) || "";
      var ab = ov.querySelector("#app-modal-approve"), rb = ov.querySelector("#app-modal-reject");
      if (ab) ab.disabled = true; if (rb) rb.disabled = true;
      try {
        var res = await HPLZ.api("/api/applications/review", { method: "POST", body: { id: app.id, action: action, reject_note: note } });
        HPLZ.toast(res.message, "ok"); close(); loadApplications();
      } catch (err) {
        HPLZ.toast(err.message, "err");
        if (ab) ab.disabled = false; if (rb) rb.disabled = false;
      }
    }
    ov.querySelector("#app-modal-approve").addEventListener("click", function () { doReview("approve"); });
    ov.querySelector("#app-modal-reject").addEventListener("click", function () { doReview("reject"); });
  }

  async function loadApplications() {
    var wrap = $("#applications-list"); if (!wrap) return;
    try {
      var data = await HPLZ.api("/api/applications");
      var apps = data.applications || [];
      if (!apps.length) { wrap.innerHTML = '<div class="empty">暂无角色卡</div>'; return; }
      var sl = { pending: "审核中", approved: "已通过", rejected: "已婉拒" };
      wrap.innerHTML = apps.map(function (app) {
        var ip = app.status === "pending";
        var dotClass = app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : "pending";
        return (
          '<div class="list-row" style="cursor:pointer;transition:background .2s ease;" data-appcard="' + app.id + '">' +
          '<div style="display:flex;align-items:center;gap:10px;flex:1 1 0;min-width:0;">' +
            '<span class="app-status-dot ' + dotClass + '"></span>' +
            '<div style="flex:1;min-width:0;">' +
              '<h4 style="margin:0 0 3px;">' + HPLZ.esc(app.name) + ' <span class="role-badge ' + (ip ? "visitor" : app.status === "approved" ? "member" : "") + '">' + (sl[app.status] || app.status) + '</span></h4>' +
              '<p class="sub" style="margin:0;">' + HPLZ.esc(app.contact) + ' · ' + (app.created_at || "").slice(0, 10) + (app.wish ? ' · ' + HPLZ.esc(app.wish) : "") + '</p>' +
            '</div>' +
          '</div>' +
          '<span style="color:var(--ink-faint);font-size:13px;padding-left:8px;flex-shrink:0;">查看详情 →</span>' +
          '</div>'
        );
      }).join("");
      /* 点击卡片打开弹窗 */
      wrap.querySelectorAll("[data-appcard]").forEach(function (row) {
        var appId = parseInt(row.dataset.appcard, 10);
        var app   = apps.find(function (a) { return a.id === appId; });
        if (!app) return;
        row.addEventListener("mouseenter", function () { row.style.background = "var(--tape-soft)"; });
        row.addEventListener("mouseleave", function () { row.style.background = ""; });
        row.addEventListener("click", function () { openAppModal(app); });
      });
    } catch (err) { wrap.innerHTML = '<div class="empty">' + HPLZ.esc(err.message) + '</div>'; }
  }

  /* ========== 主理人：成员管理 ========== */
  async function loadMembers() {
    var wrap = $("#members-list"); if (!wrap) return;
    try {
      var data = await HPLZ.api("/api/members");
      var members = data.members || [];
      if (!members.length) { wrap.innerHTML = '<div class="empty">还没有注册用户</div>'; return; }
      wrap.innerHTML = members.map(function (m) {
        var isMe = m.id === currentUser.id;
        /* 在循环体内生成options，才能对当前职位加selected */
        var mJo = [""].concat(JOB_OPTIONS).map(function (o) {
          var sel = (o === (m.job_title || "")) ? " selected" : "";
          return '<option value="' + HPLZ.esc(o) + '"' + sel + '>' + (o || "-- 选择职位 --") + "</option>";
        }).join("");
        return '<div class="list-row"><div class="grow">' +
          '<h4>' + HPLZ.esc(m.display_name) + ' <span class="role-badge ' + m.role + '">' + (ROLE_NAMES[m.role] || m.role) + "</span>" +
          (isMe ? ' <span class="role-badge visitor" style="background:var(--tape);">我</span>' : "") + "</h4>" +
          '<p class="sub">@' + HPLZ.esc(m.username) + " · 职位：" + HPLZ.esc(m.job_title || "未设置") + "</p></div>" +
          '<div class="ops" style="flex-direction:column;gap:8px;">' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
              '<select class="js-sel" data-uid="' + m.id + '" style="border:1.5px solid var(--ink);border-radius:6px;padding:6px 10px;font-family:inherit;font-size:13px;">' + mJo + "</select>" +
              '<button class="btn sm yellow js-set" data-uid="' + m.id + '">设职位</button>' +
            "</div>" +
            (!isMe && m.role !== "admin"
              ? (m.role === "visitor"
                  ? '<button class="btn sm primary role-up" data-uid="' + m.id + '">提升为成员</button>'
                  : '<button class="btn sm ghost role-dn" data-uid="' + m.id + '">调回访客</button>')
              : "") +
            (isMe || true  /* 主理人可删除任何非自身账号 */
              ? (!isMe ? '<button class="btn sm ghost del-account" data-uid="' + m.id + '" data-name="' + HPLZ.esc(m.display_name) + '" style="color:var(--rec);border-color:var(--rec);">删除账号</button>' : "")
              : "") +
          "</div></div>";
      }).join("");
      wrap.querySelectorAll(".js-set").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var uid = parseInt(btn.dataset.uid, 10);
          var sel = wrap.querySelector('.js-sel[data-uid="' + uid + '"]');
          btn.disabled = true;
          try { var res = await HPLZ.api("/api/members/role", { method: "POST", body: { id: uid, action: "job_title", job_title: sel ? sel.value : "" } }); HPLZ.toast(res.message, "ok"); loadMembers(); loadCrewCards(); }
          catch (err) { HPLZ.toast(err.message, "err"); }
          btn.disabled = false;
        });
      });
      wrap.querySelectorAll(".role-up,.role-dn").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          btn.disabled = true;
          try { var res = await HPLZ.api("/api/members/role", { method: "POST", body: { id: parseInt(btn.dataset.uid, 10), action: "role", role: btn.classList.contains("role-up") ? "member" : "visitor" } }); HPLZ.toast(res.message, "ok"); loadMembers(); loadCrewCards(); }
          catch (err) { HPLZ.toast(err.message, "err"); }
          btn.disabled = false;
        });
      });
      /* 删除账号 */
      wrap.querySelectorAll(".del-account").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var uid  = parseInt(btn.dataset.uid, 10);
          var name = btn.dataset.name || "该用户";
          if (!confirm("确认彻底删除「" + name + "」的账号？这将同时删除其所有数据且不可撤销。")) return;
          btn.disabled = true;
          try {
            var res = await HPLZ.api("/api/users/" + uid, { method: "DELETE" });
            HPLZ.toast(res.message, "ok"); loadMembers(); loadCrewCards();
          } catch (err) { HPLZ.toast(err.message, "err"); btn.disabled = false; }
        });
      });
    } catch (err) { wrap.innerHTML = '<div class="empty">' + HPLZ.esc(err.message) + "</div>"; }
  }

  /* ========== 退出 + ops 样式 + 启动 ========== */
  function bindLogout() {
    var btn = $("#dash-logout"); if (btn) btn.addEventListener("click", HPLZ.logout);
  }

  var _s = document.createElement("style");
  _s.textContent =
    ".ops-btn{font-size:11.5px;border:1.5px solid var(--ink);background:var(--paper);border-radius:5px;padding:3px 9px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s ease;}" +
    ".ops-btn:hover{background:var(--tape);transform:translateY(-1px);}.ops-btn.danger:hover{background:var(--rec);color:#fff;}.ops-btn:disabled{opacity:.4;pointer-events:none;}";
  document.head.appendChild(_s);

  init();
})();
