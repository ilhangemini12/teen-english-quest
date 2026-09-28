(() => {
  const cfg = window.ENGLISH_QUEST_SUPABASE || {};
  let sb = null;
  let currentUser = null;
  let currentProfile = null;

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);

  function configured() {
    return Boolean(cfg.url && cfg.anonKey && window.supabase?.createClient);
  }

  function status(msg, good=false) {
    const el = $("authStatus");
    if (!el) return;
    el.innerHTML = good ? "<b>✓ " + esc(msg) + "</b>" : esc(msg);
  }

  function showAuthMode(loggedIn) {
    const signedOut = $("eqSignedOut");
    const signedIn = $("eqSignedIn");
    if (signedOut) signedOut.style.display = loggedIn ? "none" : "block";
    if (signedIn) signedIn.style.display = loggedIn ? "block" : "none";
    const btn = document.querySelector(".profilebtn");
    if (btn) btn.textContent = loggedIn && currentProfile
      ? "👤 " + currentProfile.username
      : "👤 Account";
  }

  async function loadProfile() {
    if (!currentUser || !sb) return;
    const { data, error } = await sb
      .from("profiles")
      .select("username, invite_code")
      .eq("id", currentUser.id)
      .single();
    if (error) {
      status("Profile could not be loaded yet: " + error.message);
      return;
    }
    currentProfile = data;
    const u = $("eqUsername");
    const code = $("eqInviteCode");
    if (u) u.textContent = data.username;
    if (code) code.textContent = data.invite_code;
    showAuthMode(true);
  }

  async function loadLeague() {
    if (!currentUser || !sb) return;
    const rankList = $("rankList");
    const { data, error } = await sb.rpc("friend_leaderboard");
    if (rankList) {
      if (error) {
        rankList.innerHTML = '<div class="rankrow"><span class="ranknum">!</span><div><b>League unavailable</b><small>' + esc(error.message) + '</small></div><span></span></div>';
      } else {
        const rows = data || [];
        rankList.innerHTML = rows.length ? rows.map(r =>
          '<div class="rankrow"><span class="ranknum">' + esc(r.rank) + '</span><div><b>' +
          (r.is_me ? "⭐ " : "") + esc(r.username) +
          '</b><small>' + (r.is_me ? " You" : " Friend") + ' · Lifetime ' + esc(r.lifetime_xp) + ' XP</small></div><strong>' +
          esc(r.week_xp) + ' XP</strong></div>'
        ).join("") : '<div class="rankrow"><span class="ranknum">1</span><div><b>' +
          esc(currentProfile?.username || "You") + '</b><small> Invite a friend to start a league.</small></div><strong>0 XP</strong></div>';
      }
    }

    const reqBox = $("eqFriendRequests");
    if (reqBox) {
      const rq = await sb.rpc("my_friend_requests");
      if (rq.error) {
        reqBox.innerHTML = "";
      } else {
        reqBox.innerHTML = (rq.data || []).map(r =>
          '<div class="rankrow"><span class="ranknum">👋</span><div><b>' + esc(r.username) +
          '</b><small> wants to join your friends league</small></div><span><button class="btn" onclick="eqRespondFriend(' +
          Number(r.friendship_id) + ',true)">Accept</button> <button class="btn" onclick="eqRespondFriend(' +
          Number(r.friendship_id) + ',false)">Decline</button></span></div>'
        ).join("");
      }
    }
  }

  async function claim(kind, key) {
    if (!currentUser || !sb) return;
    const { error } = await sb.rpc("claim_xp", { p_kind: kind, p_key: key });
    if (!error && document.getElementById("league")) loadLeague();
  }

  async function syncLocalCoreProgress() {
    if (!currentUser || !sb || typeof window.eqGetLocalState !== "function") return;
    const st = window.eqGetLocalState();
    for (const id of (st.done || [])) await claim("mission", "mission:" + id);
    for (const w of (st.boss || [])) await claim("boss", "boss:" + w);
    const t = new Date().toISOString().slice(0,10);
    if (localStorage.getItem("duo-" + t)) await claim("duolingo", "duolingo:" + t);
  }

  window.eqSignUp = async function () {
    if (!configured()) return status("The Supabase project is not connected to the site yet.");
    const email = ($("eqEmail")?.value || "").trim();
    const password = $("eqPassword")?.value || "";
    const username = ($("eqSignupUsername")?.value || "").trim();

    if (!/^[A-Za-z0-9_]{3,20}$/.test(username))
      return status("Nickname must be 3–20 characters using letters, numbers, or underscore.");
    if (!email.includes("@")) return status("Enter a valid email address.");
    if (password.length < 8) return status("Use a password with at least 8 characters.");

    status("Creating account…");
    const { data, error } = await sb.auth.signUp({
      email, password, options: { data: { username } }
    });
    if (error) return status(error.message);
    if (!data.session) {
      status("Account created. Check the private email inbox for the confirmation link.", true);
    } else {
      status("Account created and signed in.", true);
    }
  };

  window.eqSignIn = async function () {
    if (!configured()) return status("The Supabase project is not connected to the site yet.");
    const email = ($("eqEmail")?.value || "").trim();
    const password = $("eqPassword")?.value || "";
    status("Signing in…");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) status(error.message);
  };

  window.eqSignOut = async function () {
    if (sb) await sb.auth.signOut();
    currentUser = null; currentProfile = null;
    showAuthMode(false);
    status("Signed out.");
  };

  window.eqCopyInvite = async function () {
    const code = currentProfile?.invite_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      status("Invite code copied.", true);
    } catch {
      status("Invite code: " + code);
    }
  };

  window.eqSendInvite = async function () {
    if (!currentUser || !sb) return status("Sign in first.");
    const code = ($("eqFriendCode")?.value || "").trim();
    if (!code) return status("Enter your friend’s invite code.");
    const { data, error } = await sb.rpc("send_friend_request_by_code", { p_code: code });
    if (error) return status(error.message);
    const messages = {
      sent:"Friend request sent.",
      not_found:"Invite code not found.",
      self:"That is your own invite code."
    };
    status(messages[data] || String(data), data === "sent");
    await loadLeague();
  };

  window.eqRespondFriend = async function(id, accept) {
    if (!currentUser || !sb) return;
    const { error } = await sb.rpc("respond_friend_request", {
      p_friendship_id: id, p_accept: Boolean(accept)
    });
    if (error) status(error.message);
    else status(accept ? "Friend added." : "Request declined.", true);
    await loadLeague();
  };

  window.eqRefreshLeague = loadLeague;
  window.eqCloudClaim = claim;

  function wrapProgressActions() {
    if (window.__eqCloudWrapped) return;
    window.__eqCloudWrapped = true;

    const oldMission = window.toggleMission;
    if (typeof oldMission === "function") {
      window.toggleMission = function(id) {
        oldMission(id);
        const st = window.eqGetLocalState?.();
        if (st?.done?.includes(id)) claim("mission", "mission:" + id);
      };
    }

    const oldBoss = window.boss;
    if (typeof oldBoss === "function") {
      window.boss = function(w) {
        oldBoss(w);
        const st = window.eqGetLocalState?.();
        if (st?.boss?.includes(w)) claim("boss", "boss:" + w);
      };
    }

    const oldDuo = window.duo;
    if (typeof oldDuo === "function") {
      window.duo = function() {
        oldDuo();
        const t = new Date().toISOString().slice(0,10);
        if (localStorage.getItem("duo-" + t)) claim("duolingo", "duolingo:" + t);
      };
    }

    const oldFresh = window.markFresh;
    if (typeof oldFresh === "function") {
      window.markFresh = function(key) {
        oldFresh(key);
        const st = window.eqGetLocalState?.();
        if (st?.freshDone?.includes(key)) claim("fresh", key);
      };
    }
  }

  async function init() {
    wrapProgressActions();

    if (!configured()) {
      showAuthMode(false);
      status("Supabase is installed, but this site still needs its project URL and publishable key before secure accounts can go live.");
      return;
    }

    sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });

    const { data } = await sb.auth.getSession();
    currentUser = data.session?.user || null;

    sb.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      if (currentUser) {
        await loadProfile();
        await syncLocalCoreProgress();
        await loadLeague();
        showAuthMode(true);
        status("Signed in. Progress can now contribute to your private league.", true);
      } else {
        currentProfile = null;
        showAuthMode(false);
      }
    });

    if (currentUser) {
      await loadProfile();
      await syncLocalCoreProgress();
      await loadLeague();
      showAuthMode(true);
      status("Signed in.", true);
    } else {
      showAuthMode(false);
      status("Sign in or create an account. Your email stays private; friends only see your nickname.");
    }
  }

  window.addEventListener("load", init);
})();
