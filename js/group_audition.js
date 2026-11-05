(() => {
  "use strict";

  const page = document.querySelector(".group-page");

  const CONFIG = {
    SCRIPT_URL:
      "https://script.google.com/macros/s/AKfycbxSB3mPI4Bb5FO6NRrB1WBM-Dpen2v5vesRK6kEO-9rxoIfDQ0pBkWeNrIl-KMiufnH/exec",

    CATEGORY: page.dataset.category,
    NOUN: page.dataset.noun,
    EXP_EXAMPLE: page.dataset.expExample,
    MIN_MEMBERS: Number(page.dataset.minMembers),
    MAX_MEMBERS: Number(page.dataset.maxMembers),

    MIN_PHOTOS: 2,
    MAX_PHOTOS: 4,
    PHOTO_MAX_SIDE: 1600,
    PHOTO_QUALITY: 0.85,

    MAX_MEMBER_SKILLS: 2,
    MAX_COVER_FILES: 2,
    MAX_LINKS: 3,
    MAX_SKILL_MB: 100,
    MAX_TOTAL_MB: 500,
  };

  const MB = 1024 * 1024;
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  const steps = {
    rules: $("stepRules"),
    form: $("stepForm"),
    thanks: $("stepThanks"),
  };
  const progressItems = document.querySelectorAll("#saProgress li");
  const agree = $("agreeRules");
  const rulesContinue = $("rulesContinue");
  const backToRules = $("backToRules");

  const form = $("groupForm");
  const submitBtn = $("submitBtn");
  const statusBox = $("formStatus");
  const sizeInfo = $("sizeInfo");

  const countEl = $("member_count");
  const membersMount = $("membersMount");
  const membersEmpty = $("membersEmpty");

  const contactType = $("contactType");
  const contactValue = $("contactValue");
  const contactValueLabel = $("contactValueLabel");
  const contactPlatformField = $("contactPlatformField");
  const contactPlatform = $("contactPlatform");

  const fmtSize = (bytes) =>
    bytes >= MB
      ? (bytes / MB).toFixed(1) + " MB"
      : Math.max(1, Math.round(bytes / 1024)) + " KB";

  const fileKey = (f) => `${f.name}|${f.size}|${f.lastModified}`;
  const val = (el) => el.value.trim();
  const LINK_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

  function splitLinks(text) {
    return text
      .split(/[\s,;]+/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  const order = ["rules", "form", "thanks"];

  function showStep(name) {
    Object.entries(steps).forEach(([key, el]) => (el.hidden = key !== name));
    const idx = order.indexOf(name);
    progressItems.forEach((li, i) => {
      li.classList.toggle("is-active", i === idx);
      li.classList.toggle("is-done", i < idx);
    });
    $("saProgress").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  agree.addEventListener(
    "change",
    () => (rulesContinue.disabled = !agree.checked),
  );
  rulesContinue.disabled = !agree.checked;
  rulesContinue.addEventListener(
    "click",
    () => agree.checked && showStep("form"),
  );
  backToRules.addEventListener("click", () => showStep("rules"));

  const fieldByKey = (key) => form.querySelector(`[data-field="${key}"]`);

  function setError(key, message) {
    const field = fieldByKey(key);
    if (!field) return;
    field.classList.toggle("has-error", Boolean(message));
    const p = field.querySelector(".sa-error");
    if (p) p.textContent = message || "";
    if (!message) removeSummaryItem(key);
  }

  let summary = null;

  function getSummary() {
    if (!summary) {
      summary = document.createElement("div");
      summary.className = "sa-summary";
      summary.id = "errorSummary";
      summary.setAttribute("role", "alert");
      summary.tabIndex = -1;
      summary.hidden = true;
      form.prepend(summary);
    }
    return summary;
  }

  function fieldLabel(key) {
    const field = fieldByKey(key);
    if (!field) return key;
    const lbl = field.querySelector("label:not(.sa-drop), .sa-label");
    let text = lbl
      ? lbl.textContent.replace("*", "").replace("(optional)", "").trim()
      : key;
    const member = field.closest(".gm-member");
    if (member) text = `Member ${member.dataset.member} \u2013 ${text}`;
    return text;
  }

  function goToField(key) {
    const field = fieldByKey(key);
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = field.querySelector("input, textarea, select");
    if (focusable && focusable.type !== "file")
      focusable.focus({ preventScroll: true });
    field.classList.remove("flash");
    void field.offsetWidth;
    field.classList.add("flash");
  }

  function summaryTitle(n) {
    return n === 1
      ? "Please fix this field before continuing:"
      : `Please fix these ${n} fields before continuing:`;
  }

  function renderSummary(errors) {
    const box = getSummary();
    box.innerHTML = "";
    const title = document.createElement("strong");
    title.textContent = summaryTitle(errors.length);
    const ul = document.createElement("ul");
    errors.forEach(([key, msg]) => {
      const li = document.createElement("li");
      li.dataset.field = key;
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = fieldLabel(key);
      a.addEventListener("click", (e) => {
        e.preventDefault();
        goToField(key);
      });
      li.append(a, document.createTextNode(" \u2013 " + msg));
      ul.append(li);
    });
    box.append(title, ul);
    box.hidden = false;
  }

  function removeSummaryItem(key) {
    if (!summary || summary.hidden) return;
    const li = summary.querySelector(`li[data-field="${key}"]`);
    if (li) li.remove();
    const left = summary.querySelectorAll("li").length;
    if (!left) summary.hidden = true;
    else summary.querySelector("strong").textContent = summaryTitle(left);
  }

  function pruneSummary() {
    if (!summary) return;
    summary.querySelectorAll("li").forEach((li) => {
      if (!fieldByKey(li.dataset.field)) removeSummaryItem(li.dataset.field);
    });
  }

  function clearErrors() {
    form
      .querySelectorAll(".sa-field")
      .forEach((f) => f.classList.remove("has-error", "flash"));
    if (summary) summary.hidden = true;
    statusBox.hidden = true;
  }

  function onEdit(e) {
    if (e.target.type === "file") return;
    const field = e.target.closest(".sa-field");
    if (field) {
      field.classList.remove("has-error");
      removeSummaryItem(field.dataset.field);
    }
  }
  form.addEventListener("input", onEdit);
  form.addEventListener("change", onEdit);

  const uploaders = [];

  function createUploader(o) {
    const isPhoto = o.kind === "photos";
    const uid = "up_" + o.key;
    const field = document.createElement("div");
    field.className = "sa-field";
    field.dataset.field = o.key;
    field.innerHTML = `
      <span class="sa-label">${o.label} <span class="sa-req">*</span></span>
      <p class="sa-hint">${o.hint}</p>
      <label class="sa-drop" for="${uid}">
        <input type="file" id="${uid}" accept="${isPhoto ? "image/*" : "audio/*,video/*"}" multiple />
        <span class="sa-drop-icon" aria-hidden="true">+</span>
        <span class="sa-drop-title">Click to upload or drag &amp; drop</span>
        <span class="sa-drop-sub"></span>
      </label>
      ${isPhoto ? '<div class="sa-thumbs"></div>' : '<ul class="sa-files"></ul>'}
      ${
        o.links
          ? `<div class="sa-or"><span>or</span></div>
             <label class="sa-sublabel" for="${uid}_links">Paste links (YouTube, Google Drive, SoundCloud, etc.)</label>
             <textarea id="${uid}_links" class="sa-links-ta" rows="2" placeholder="One link per line (up to ${CONFIG.MAX_LINKS})"></textarea>`
          : ""
      }
      <p class="sa-error" aria-live="polite"></p>`;

    const input = field.querySelector('input[type="file"]');
    const zone = field.querySelector(".sa-drop");
    const sub = field.querySelector(".sa-drop-sub");
    const list = field.querySelector(".sa-thumbs, .sa-files");
    const linksEl = field.querySelector("textarea");
    let items = [];
    const unit = isPhoto ? "photos" : "files";

    function render() {
      list.innerHTML = "";
      items.forEach((it, i) => {
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "sa-remove";
        rm.setAttribute("aria-label", `Remove ${it.file.name}`);
        rm.innerHTML = "&times;";
        rm.addEventListener("click", () => {
          if (it.url) URL.revokeObjectURL(it.url);
          items = items.filter((x) => x !== it);
          render();
          o.onChange && o.onChange();
        });

        if (isPhoto) {
          const box = document.createElement("div");
          box.className = "sa-thumb";
          const img = document.createElement("img");
          img.src = it.url;
          img.alt = `Photo ${i + 1}`;
          box.append(img, rm);
          list.append(box);
        } else {
          const li = document.createElement("li");
          li.className = "sa-file";
          const badge = document.createElement("span");
          badge.className = "sa-file-badge";
          badge.textContent = it.file.type.startsWith("video/")
            ? "Video"
            : "Audio";
          const name = document.createElement("span");
          name.className = "sa-file-name";
          name.textContent = it.file.name;
          name.title = it.file.name;
          const size = document.createElement("span");
          size.className = "sa-file-size";
          size.textContent = fmtSize(it.file.size);
          li.append(badge, name, size, rm);
          list.append(li);
        }
      });
      sub.textContent = `${items.length} / ${o.max} ${unit}`;
    }

    function setMsg(msg) {
      setError(o.key, msg);
    }

    function add(fileList) {
      let msg = "";
      Array.from(fileList).forEach((file) => {
        const ok = isPhoto
          ? file.type.startsWith("image/")
          : file.type.startsWith("audio/") || file.type.startsWith("video/");
        if (!ok) {
          msg = isPhoto
            ? "Please choose image files (JPG, PNG or WEBP)."
            : "Only audio or video files are allowed.";
          return;
        }
        if (items.some((it) => fileKey(it.file) === fileKey(file))) return;
        if (!isPhoto && file.size > CONFIG.MAX_SKILL_MB * MB) {
          msg = `"${file.name}" is too large (max ${CONFIG.MAX_SKILL_MB} MB per file) \u2013 paste a link instead.`;
          return;
        }
        if (items.length >= o.max) {
          msg = `You can upload up to ${o.max} ${unit}.`;
          return;
        }
        items.push({ file, url: isPhoto ? URL.createObjectURL(file) : null });
      });
      render();
      setMsg(msg);
      o.onChange && o.onChange();
    }

    input.addEventListener("change", () => {
      add(input.files);
      input.value = "";
    });
    ["dragenter", "dragover"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add("is-over");
      }),
    );
    ["dragleave", "drop"].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.remove("is-over");
      }),
    );
    zone.addEventListener("drop", (e) => {
      if (e.dataTransfer && e.dataTransfer.files.length)
        add(e.dataTransfer.files);
    });

    const api = {
      key: o.key,
      field,
      files: () => items.map((it) => it.file),
      links: () => (linksEl ? splitLinks(linksEl.value) : []),
      hasData: () =>
        items.length > 0 || (linksEl && linksEl.value.trim() !== ""),
      estimate: () =>
        items.reduce(
          (s, it) =>
            s + (isPhoto ? Math.min(it.file.size, 1.2 * MB) : it.file.size),
          0,
        ),
      validate() {
        const links = api.links();
        if (isPhoto) {
          return items.length < CONFIG.MIN_PHOTOS
            ? `Please upload at least ${CONFIG.MIN_PHOTOS} photos (up to ${o.max}).`
            : "";
        }
        if (items.length + links.length < 1) {
          return "Please upload an audio/video file or paste at least one link.";
        }
        if (links.length > CONFIG.MAX_LINKS)
          return `You can add up to ${CONFIG.MAX_LINKS} links.`;
        if (links.some((l) => !LINK_RE.test(l))) {
          return "One of the links doesn't look valid. Links must start with http:// or https://";
        }
        return "";
      },
      destroy() {
        items.forEach((it) => it.url && URL.revokeObjectURL(it.url));
        const i = uploaders.indexOf(api);
        if (i > -1) uploaders.splice(i, 1);
      },
    };

    render();
    uploaders.push(api);
    return api;
  }

  function updateSize() {
    const total = uploaders.reduce((s, u) => s + u.estimate(), 0);
    const over = total > CONFIG.MAX_TOTAL_MB * MB;
    sizeInfo.classList.toggle("is-over", over);
    sizeInfo.textContent = total
      ? `Selected files: about ${fmtSize(total)} of ${CONFIG.MAX_TOTAL_MB} MB allowed in total.${
          over
            ? " Too much \u2013 paste links for the biggest files instead."
            : ""
        }`
      : `Upload limit: ${CONFIG.MAX_TOTAL_MB} MB in total for all files. For bigger files, paste a link instead.`;
  }

  const coverMount = $("coverMount");
  const cover = createUploader({
    key: coverMount.dataset.key,
    label: coverMount.dataset.label,
    hint: coverMount.dataset.hint,
    kind: "media",
    max: CONFIG.MAX_COVER_FILES,
    links: true,
    onChange: updateSize,
  });
  coverMount.replaceWith(cover.field);

  const members = [];

  function createMember(i) {
    const el = document.createElement("div");
    el.className = "gm-member";
    el.dataset.member = i;
    el.innerHTML = `
      <div class="gm-head"><span class="gm-num">${pad(i)}</span><span class="gm-title"> Member ${i}</span></div>

      <div class="sa-grid">
        <div class="sa-field" data-field="m${i}_stage_name">
          <label for="m${i}_stage_name">Stage name <span class="sa-req">*</span></label>
          <input type="text" id="m${i}_stage_name" maxlength="60" />
          <p class="sa-error" aria-live="polite"></p>
        </div>
        <div class="sa-field" data-field="m${i}_age">
          <label for="m${i}_age">Age <span class="sa-req">*</span></label>
          <!-- TODO: adjust min/max age to match your rules -->
          <input type="number" id="m${i}_age" min="10" max="99" inputmode="numeric" />
          <p class="sa-error" aria-live="polite"></p>
        </div>
      </div>

      <div class="sa-field" data-field="m${i}_experience">
        <label for="m${i}_experience">Experience <span class="sa-req">*</span></label>
        <p class="sa-hint">Tell us about your musical background, previous projects, training, performances…</p>
        <textarea id="m${i}_experience" rows="4" maxlength="2000"></textarea>
        <p class="sa-error" aria-live="polite"></p>
      </div>
      
      <div class="gm-photos"></div>
      <div class="gm-skills"></div>`;

    const skills = createUploader({
      key: `m${i}_skills`,
      label: "Skills (audio / video)",
      hint: "Separate for each member \u2013 show what this member can do.",
      kind: "media",
      max: CONFIG.MAX_MEMBER_SKILLS,
      links: true,
      onChange: updateSize,
    });
    const photos = createUploader({
      key: `m${i}_photos`,
      label: "Member photos",
      hint: `Separate for each member, professional ones preferred. JPG, PNG or WEBP. (${CONFIG.MIN_PHOTOS}\u2013${CONFIG.MAX_PHOTOS}).`,
      kind: "photos",
      max: CONFIG.MAX_PHOTOS,
      onChange: updateSize,
    });
    el.querySelector(".gm-skills").replaceWith(skills.field);
    el.querySelector(".gm-photos").replaceWith(photos.field);

    const q = (name) => el.querySelector(`#m${i}_${name}`);
    return {
      i,
      el,
      skills,
      photos,
      q,
      hasData: () =>
        ["stage_name", "age", "experience", "pro_experience"].some((n) =>
          q(n).value.trim(),
        ) ||
        skills.hasData() ||
        photos.hasData(),
      destroy() {
        skills.destroy();
        photos.destroy();
        el.remove();
      },
    };
  }

  function applyCount(n) {
    if (members.length > n) {
      const removing = members.slice(n);
      if (removing.some((m) => m.hasData())) {
        const ok = window.confirm(
          `Reducing the number of members will remove the details you entered for member${
            removing.length > 1 ? "s" : ""
          } ${removing.map((m) => m.i).join(", ")}. Continue?`,
        );
        if (!ok) {
          countEl.value = members.length;
          return;
        }
      }
      removing.forEach((m) => m.destroy());
      members.length = n;
    }
    while (members.length < n) {
      const m = createMember(members.length + 1);
      members.push(m);
      membersMount.append(m.el);
    }
    membersEmpty.hidden = members.length > 0;
    pruneSummary();
    updateSize();
  }

  function countError() {
    const raw = val(countEl);
    const n = Number(raw);
    if (!raw) return "Please enter the number of members.";
    if (
      !Number.isInteger(n) ||
      n < CONFIG.MIN_MEMBERS ||
      n > CONFIG.MAX_MEMBERS
    ) {
      return `Number of members must be between ${CONFIG.MIN_MEMBERS} and ${CONFIG.MAX_MEMBERS}.`;
    }
    return "";
  }

  let countTimer;
  function syncCount(final) {
    const raw = val(countEl);
    const n = Number(raw);
    const valid =
      raw &&
      Number.isInteger(n) &&
      n >= CONFIG.MIN_MEMBERS &&
      n <= CONFIG.MAX_MEMBERS;
    if (valid) {
      applyCount(n);
      setError("member_count", "");
    } else if (final && raw) {
      setError("member_count", countError());
    }
  }
  countEl.addEventListener("input", () => {
    clearTimeout(countTimer);
    countTimer = setTimeout(() => syncCount(false), 500);
  });
  countEl.addEventListener("change", () => {
    clearTimeout(countTimer);
    syncCount(true);
  });

  const contactModes = {
    telegram: {
      label: "Telegram username",
      placeholder: "@username",
      type: "text",
    },
    email: {
      label: "Email address",
      placeholder: "name@example.com",
      type: "email",
    },
    other: { label: "Username", placeholder: "@username", type: "text" },
  };

  contactType.addEventListener("change", () => {
    const mode = contactModes[contactType.value];
    contactValue.value = "";
    setError("contactValue", "");
    setError("contactPlatform", "");

    if (!mode) {
      contactValue.disabled = true;
      contactValue.type = "text";
      contactValue.placeholder = "Choose a connection type first";
      contactValueLabel.innerHTML =
        'Username / address <span class="sa-req">*</span>';
      contactPlatformField.hidden = true;
      return;
    }
    contactValue.disabled = false;
    contactValue.type = mode.type;
    contactValue.placeholder = mode.placeholder;
    contactValueLabel.innerHTML = `${mode.label} <span class="sa-req">*</span>`;
    contactPlatformField.hidden = contactType.value !== "other";
    if (contactType.value !== "other") contactPlatform.value = "";
  });

  function validate() {
    clearErrors();
    const errors = [];
    const add = (key, msg) => errors.push([key, msg]);
    const noun = CONFIG.NOUN;

    if (!val($("group_name")))
      add("group_name", `Please enter the ${noun} name.`);

    const cErr = countError();
    if (cErr) add("member_count", cErr);
    else if (members.length !== Number(countEl.value))
      applyCount(Number(countEl.value));

    if (!val($("about")))
      add("about", `Please tell us a little about your ${noun}.`);

    const coverMsg = cover.validate();
    if (coverMsg) add(cover.key, coverMsg);

    if (!val($("promo")))
      add("promo", "Please enter your main platform and username.");

    members.forEach((m) => {
      const i = m.i;
      if (!val(m.q("stage_name")))
        add(`m${i}_stage_name`, "Please enter a stage name.");

      const ageEl = m.q("age");
      const age = Number(ageEl.value);
      if (!val(ageEl)) add(`m${i}_age`, "Please enter an age.");
      else if (
        !Number.isInteger(age) ||
        age < Number(ageEl.min) ||
        age > Number(ageEl.max)
      ) {
        add(`m${i}_age`, `Age must be between ${ageEl.min} and ${ageEl.max}.`);
      }

      if (!val(m.q("experience")))
        add(`m${i}_experience`, "Please describe the experience.");

      const sMsg = m.skills.validate();
      if (sMsg) add(m.skills.key, sMsg);
      const pMsg = m.photos.validate();
      if (pMsg) add(m.photos.key, pMsg);
    });

    const type = contactType.value;
    if (!type) {
      add("contactType", "Please choose how we can reach you.");
    } else {
      const v = val(contactValue);
      if (!v) add("contactValue", "This field is required.");
      else if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        add("contactValue", "Please enter a valid email address.");
      } else if (type === "telegram" && !/^@?[A-Za-z0-9_]{4,32}$/.test(v)) {
        add(
          "contactValue",
          "Please enter a valid Telegram username (e.g. @username).",
        );
      }
      if (type === "other" && !val(contactPlatform)) {
        add("contactPlatform", "Please tell us which social media.");
      }
    }

    errors.forEach(([k, m]) => setError(k, m));
    if (errors.length) {
      renderSummary(errors);
      getSummary().scrollIntoView({ behavior: "smooth", block: "center" });
      errors.forEach(([k]) => {
        const el = fieldByKey(k);
        if (el) el.classList.add("flash");
      });
      return false;
    }
    return true;
  }

  function readAsBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("Could not read a file."));
      r.readAsDataURL(blob);
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("decode failed"));
      };
      img.src = url;
    });
  }

  async function preparePhoto(file) {
    try {
      const img = await loadImage(file);
      const scale = Math.min(
        1,
        CONFIG.PHOTO_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight),
      );
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise((res) =>
        canvas.toBlob(res, "image/jpeg", CONFIG.PHOTO_QUALITY),
      );
      if (!blob) throw new Error("encode failed");
      return {
        name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
        type: "image/jpeg",
        size: blob.size,
        data: await readAsBase64(blob),
      };
    } catch (_) {
      if (file.size > 6 * MB) {
        throw new Error(
          `"${file.name}" can't be processed. Please use a JPG or PNG photo.`,
        );
      }
      return {
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        data: await readAsBase64(file),
      };
    }
  }

  async function prepareMedia(file) {
    return {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      data: await readAsBase64(file),
    };
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle("is-loading", on);
    submitBtn.querySelector(".sa-btn-text").textContent = on
      ? "Sending\u2026 please wait"
      : "Continue";
  }

  function showStatus(msg) {
    statusBox.textContent = msg;
    statusBox.hidden = false;
    statusBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (CONFIG.SCRIPT_URL.startsWith("PASTE_YOUR")) {
      showStatus(
        "The form is not connected yet: set SCRIPT_URL in js/group_audition.js (see apps-script/SETUP.md).",
      );
      return;
    }

    setLoading(true);
    try {
      const coverFiles = await Promise.all(cover.files().map(prepareMedia));

      const membersPayload = [];
      for (const m of members) {
        membersPayload.push({
          index: m.i,
          stage_name: val(m.q("stage_name")),
          age: val(m.q("age")),
          experience: val(m.q("experience")),
          professional_experience: val(m.q("pro_experience")),
          photos: await Promise.all(m.photos.files().map(preparePhoto)),
          skills: await Promise.all(m.skills.files().map(prepareMedia)),
          skillLinks: m.skills.links(),
        });
      }

      const allFiles = [
        ...coverFiles,
        ...membersPayload.flatMap((m) => [...m.photos, ...m.skills]),
      ];
      const totalBytes = allFiles.reduce((s, f) => s + f.size, 0);
      if (totalBytes > CONFIG.MAX_TOTAL_MB * MB) {
        throw new Error(
          `Your files are too large in total (${fmtSize(totalBytes)}). The limit is ${CONFIG.MAX_TOTAL_MB} MB. Please paste links for the biggest files instead.`,
        );
      }

      const type = contactType.value;
      const payload = {
        category: CONFIG.CATEGORY,
        group_name: val($("group_name")),
        member_count: members.length,
        about: val($("about")),
        coverFiles,
        coverLinks: cover.links(),
        promo: val($("promo")),
        other_socials: val($("other_socials")),
        contactType: type,
        contactPlatform: type === "other" ? val(contactPlatform) : "",
        contactValue: val(contactValue),
        website: $("website").value,
        members: membersPayload,
      };

      const res = await fetch(CONFIG.SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result || !result.ok) {
        throw new Error(
          (result && result.error) ||
            "The server could not save your application.",
        );
      }

      showStep("thanks");
    } catch (err) {
      console.error(err);
      showStatus(
        err instanceof TypeError
          ? "Network error. Please check your connection and try again."
          : err.message || "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  });

  updateSize();
})();
