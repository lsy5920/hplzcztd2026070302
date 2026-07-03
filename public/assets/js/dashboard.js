/* ============================================================
   成员空间脚本:登录验证、今日任务、灵感池看板、申请审核、成员管理
   ============================================================ */
(function () {
  "use strict";
  const $ = HPLZ.$, $$ = HPLZ.$$;

  /* ---- 手册周流程(按星期高亮今日任务) ---- */
  const WEEK_FLOW = [
    { day: "周日", icon: "🎬", task: "集中拍摄日", detail: "批量拍 2-4 条短视频;素材当日双备份;每条至少保留主镜头、补镜和干净声音。" },
    { day: "周一", icon: "📊", task: "数据复盘 + 灵感收集", detail: "写出上周复盘结论 3 条;每人至少投 1 张灵感卡进灵感池。不争论「为什么没爆」,只提可验证改进。" },
    { day: "周二", icon: "💡", task: "选题会 / 异步投票", detail: "从灵感池选 2-3 个题,锁定本周主创。每个入选题都要有一句话设定。" },
    { day: "周三", icon: "✏️", task: "脚本初稿", detail: "本条主创完成脚本 V1:关键台词、结尾方式;演员读一遍能理解即合格。" },
    { day: "周四", icon: "🔒", task: "脚本锁版!", detail: "A+D+C 完成锁版脚本 + 镜头清单 + 道具表。锁版后只允许小改台词,不改核心结构。" },
    { day: "周五", icon: "🗂️", task: "制片准备", detail: "B 主责:场地、服装、道具、设备、授权、交通清单。缺失项有替代方案,高风险项直接删。" },
    { day: "周六", icon: "🏃", task: "轻排练 + 技术确认", detail: "C+D 主责:走位视频或语音排练;设备与存储检查。周日到场即可拍,不现场从零理解剧本。" },
  ];

  /* ---- 看板状态中文名 ---- */
  const STATUS_NAMES = { pool: "灵感池", review: "待评估", selected: "已入选", hold: "暂存" };
  const STATUS_KEYS = ["pool", "review", "selected", "hold"];

  let currentUser = null;
  let ideasData = [];

  /* ========== 入口:校验登录 ========== */
  async function init() {
    const me = await HPLZ.me(true);
    if (!me) {
      document.getElementById("dash-guard").innerHTML =
        '<div style="padding:90px 22px;text-align:center;">' +
        '<p class="hand" style="font-size:18px;margin-bottom:20px;">这里是成员空间,需要先签到才能进来。</p>' +
        '<a class="btn primary" href="login.html">去登录 / 注册</a>' +
        "</div>";
      return;
    }
    currentUser = me;

    /* 显示主体,隐藏加载提示 */
    $("#dash-guard").style.display = "none";
    $("#dash-main").style.display = "block";

    /* 渲染顶部欢迎 */
    const roleMap = { admin: "主理人", member: "成员", visitor: "访客" };
    $("#dash-name").textContent = me.display_name;
    $("#dash-role").innerHTML = '<span class="role-badge ' + me.role + '">' + (roleMap[me.role] || me.role) + "</span>";
    const greets = ["今天的灵感已经在路上了。", "周日开机,其余异步推进。", "完成优于完美,先拍出来。", "把脑洞拍出来,把日子造有趣。", "轮流做主角,今天轮到你了。"];
    $("#dash-greet").textContent = "—— " + greets[Math.floor(Math.random() * greets.length)];

    renderTodayCard();
    renderBoard();
    bindQuickIdea();
    bindLogout();

    /* 主理人专属板块 */
    if (me.role === "admin") {
      $$(".admin-only").forEach(function (el) { el.style.display = "block"; });
      loadApplications();
      loadMembers();
    } else if (me.role !== "member") {
      /* 访客提示 */
      const tip = $("#board-role-tip");
      if (tip) tip.textContent = "批注:你目前是访客,灵感卡可以投,但看板流转(移动/删除)需要主理人把你提升为「团队成员」。";
    }
  }

  /* ========== 今日任务卡 ========== */
  function renderTodayCard() {
    const d = new Date().getDay();
    const flow = WEEK_FLOW[d];
    const card = $("#today-card");
    const title = $("#today-title");
    if (!card || !flow) return;
    title.innerHTML = "今天是<span class='hl'>" + flow.day + "</span>";
    card.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:14px;">' +
      '<span style="font-size:34px;line-height:1;">' + flow.icon + "</span>" +
      '<div><h3 style="font-size:20px;font-weight:900;margin-bottom:6px;">' + flow.task + "</h3>" +
      '<p style="color:var(--ink-soft);">' + flow.detail + "</p></div></div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;">' +
      '<a class="btn sm yellow" href="tools.html">打开工具间</a>' +
      (d === 0 ? '<a class="btn sm primary" href="tools.html#checklist">周日拍摄清单</a>' : "") +
      (d === 1 || d === 2 ? '<a class="btn sm" href="#board-grid">投一张灵感卡</a>' : "") +
      "</div>";
  }

  /* ========== 灵感池看板 ========== */
  function renderBoard() {
    HPLZ.api("/api/ideas").then(function (data) {
      ideasData = data.ideas || [];
      renderColumns();
    }).catch(function (e) {
      HPLZ.toast(e.message, "err");
    });
  }

  function renderColumns() {
    STATUS_KEYS.forEach(function (status) {
      const body = $('[data-body="' + status + '"]');
      const cnt = $('[data-count-col="' + status + '"]');
      if (!body) return;
      const cards = ideasData.filter(function (i) { return i.status === status; });
      if (cnt) cnt.textContent = cards.length;
      if (!cards.length) {
        body.innerHTML = '<div class="empty">暂无</div>';
        return;
      }
      body.innerHTML = cards.map(function (idea) { return renderIdeaCard(idea); }).join("");
      /* 绑定操作按钮 */
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
    const isOwn = currentUser && idea.user_id === currentUser.id;
    const canDel = currentUser && (currentUser.role === "admin" || isOwn);

    const moveOpts = STATUS_KEYS.filter(function (s) { return s !== idea.status; }).map(function (s) {
      return '<button class="ops-btn" data-move="' + s + '" data-id="' + idea.id + '" title="移到' + STATUS_NAMES[s] + '">→ ' + STATUS_NAMES[s] + "</button>";
    }).join("");

    return (
      '<div class="idea-card">' +
      '<h4>' + HPLZ.esc(idea.title) + "</h4>" +
      '<div class="meta"><span>' + HPLZ.esc(idea.author) + "</span>" +
      (idea.score_total ? '<span class="sc">' + idea.score_total + " 分</span>" : "<span>未评分</span>") +
      "</div>" +
      (canEdit || canDel ?
        '<div class="ops">' +
        (canEdit ? moveOpts : "") +
        (canDel ? '<button class="ops-btn danger" data-del="1" data-id="' + idea.id + '">删除</button>' : "") +
        "</div>" : "") +
      "</div>"
    );
  }

  /* 移动看板列 */
  async function moveIdea(id, newStatus) {
    try {
      await HPLZ.api("/api/ideas/" + id, { method: "PATCH", body: { status: newStatus } });
      const idx = ideasData.findIndex(function (i) { return i.id === id; });
      if (idx !== -1) ideasData[idx].status = newStatus;
      renderColumns();
    } catch (e) {
      HPLZ.toast(e.message, "err");
    }
  }

  /* 删除灵感卡 */
  async function deleteIdea(id) {
    if (!confirm("确认删除这张灵感卡?操作不可撤销。")) return;
    try {
      await HPLZ.api("/api/ideas/" + id, { method: "DELETE" });
      ideasData = ideasData.filter(function (i) { return i.id !== id; });
      renderColumns();
      HPLZ.toast("已删除", "ok");
    } catch (e) {
      HPLZ.toast(e.message, "err");
    }
  }

  /* 快速投一条灵感 */
  function bindQuickIdea() {
    const input = $("#quick-idea");
    const btn = $("#quick-idea-btn");
    if (!input || !btn) return;
    btn.addEventListener("click", async function () {
      const title = input.value.trim();
      if (title.length < 4) {
        HPLZ.toast("一句话设定至少写 4 个字", "err");
        input.focus();
        return;
      }
      btn.disabled = true;
      try {
        await HPLZ.api("/api/ideas", { method: "POST", body: { title: title } });
        HPLZ.toast("已投进灵感池!", "ok");
        input.value = "";
        renderBoard();
      } catch (e) {
        HPLZ.toast(e.message, "err");
      }
      btn.disabled = false;
    });
    /* 回车快捷键 */
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") btn.click();
    });
  }

  /* ========== 主理人:申请审核 ========== */
  async function loadApplications() {
    const wrap = $("#applications-list");
    try {
      const data = await HPLZ.api("/api/applications");
      const apps = data.applications || [];
      if (!apps.length) {
        wrap.innerHTML = '<div class="empty">暂无申请</div>';
        return;
      }
      wrap.innerHTML = apps.map(function (app) {
        const statusLabel = { pending: "待审核", approved: "已通过", rejected: "已婉拒" }[app.status] || app.status;
        const isPending = app.status === "pending";
        return (
          '<div class="list-row">' +
          '<div class="grow">' +
          '<h4>' + HPLZ.esc(app.name) + ' <span class="role-badge ' + (isPending ? "visitor" : (app.status === "approved" ? "member" : "")) + '">' + statusLabel + "</span></h4>" +
          '<p class="sub">联系方式:' + HPLZ.esc(app.contact) + " · 申请时间:" + app.created_at.slice(0, 10) + "</p>" +
          (app.wish ? '<p class="sub">希望获得:' + HPLZ.esc(app.wish) + "</p>" : "") +
          (app.strengths ? '<p class="sub">擅长:' + HPLZ.esc(app.strengths) + "</p>" : "") +
          (app.message ? '<p class="sub">Ta 说:' + HPLZ.esc(app.message) + "</p>" : "") +
          "</div>" +
          (isPending ?
            '<div class="ops">' +
            '<button class="btn sm primary" data-review-id="' + app.id + '" data-action="approve">通过</button>' +
            '<button class="btn sm ghost" data-review-id="' + app.id + '" data-action="reject">婉拒</button>' +
            "</div>" : "") +
          "</div>"
        );
      }).join("");

      wrap.querySelectorAll("[data-review-id]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          btn.disabled = true;
          try {
            const res = await HPLZ.api("/api/applications/review", {
              method: "POST",
              body: { id: parseInt(btn.dataset.reviewId, 10), action: btn.dataset.action },
            });
            HPLZ.toast(res.message, "ok");
            loadApplications();
          } catch (e) {
            HPLZ.toast(e.message, "err");
            btn.disabled = false;
          }
        });
      });
    } catch (e) {
      wrap.innerHTML = '<div class="empty">' + HPLZ.esc(e.message) + "</div>";
    }
  }

  /* ========== 主理人:成员管理 ========== */
  async function loadMembers() {
    const wrap = $("#members-list");
    try {
      const data = await HPLZ.api("/api/members");
      const members = data.members || [];
      if (!members.length) {
        wrap.innerHTML = '<div class="empty">还没有注册用户</div>';
        return;
      }
      const roleLabel = { admin: "主理人", member: "成员", visitor: "访客" };
      wrap.innerHTML = members.map(function (m) {
        const isMe = m.id === currentUser.id;
        const canPromote = !isMe && m.role !== "admin";
        return (
          '<div class="list-row">' +
          '<div class="grow">' +
          '<h4>' + HPLZ.esc(m.display_name) +
          " <span class=\"role-badge " + m.role + '">' + (roleLabel[m.role] || m.role) + "</span>" +
          (isMe ? ' <span class="role-badge visitor" style="background:var(--tape);">我</span>' : "") +
          "</h4>" +
          '<p class="sub">账号:' + HPLZ.esc(m.username) + " · 注册时间:" + m.created_at.slice(0, 10) + "</p>" +
          "</div>" +
          (canPromote ?
            '<div class="ops">' +
            (m.role === "visitor" ? '<button class="btn sm yellow" data-role-id="' + m.id + '" data-role="member">提升为成员</button>' : "") +
            (m.role === "member" ? '<button class="btn sm ghost" data-role-id="' + m.id + '" data-role="visitor">调回访客</button>' : "") +
            "</div>" : "") +
          "</div>"
        );
      }).join("");

      wrap.querySelectorAll("[data-role-id]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          btn.disabled = true;
          try {
            const res = await HPLZ.api("/api/members/role", {
              method: "POST",
              body: { id: parseInt(btn.dataset.roleId, 10), role: btn.dataset.role },
            });
            HPLZ.toast(res.message, "ok");
            loadMembers();
          } catch (e) {
            HPLZ.toast(e.message, "err");
            btn.disabled = false;
          }
        });
      });
    } catch (e) {
      wrap.innerHTML = '<div class="empty">' + HPLZ.esc(e.message) + "</div>";
    }
  }

  /* ========== 退出登录 ========== */
  function bindLogout() {
    const btn = $("#dash-logout");
    if (btn) btn.addEventListener("click", HPLZ.logout);
  }

  /* CSS:看板操作按钮小样式(避免污染全局 style.css) */
  const style = document.createElement("style");
  style.textContent =
    ".ops-btn{font-size:11.5px;border:1.5px solid var(--ink);background:var(--paper);border-radius:5px;padding:3px 9px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s ease;}" +
    ".ops-btn:hover{background:var(--tape);transform:translateY(-1px);}" +
    ".ops-btn.danger:hover{background:var(--rec);color:#fff;}" +
    ".ops-btn:disabled{opacity:.4;pointer-events:none;}";
  document.head.appendChild(style);

  init();
})();
