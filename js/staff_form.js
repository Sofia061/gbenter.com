/* ===== STAFF AUDITION FORM (no photos, no promo field, skills = textarea) =====
   Works for every staff role page that uses the same fields. Set the role on
   <main> with data-category, e.g.  <main class="audition-page solo-page" data-category="Lyricist">
   (if the attribute is missing, "Lyricist" is used). */
(() => {
  "use strict";

  const main = document.querySelector("main");

  const CONFIG = {
    SCRIPT_URL:
      "https://script.google.com/macros/s/AKfycbxSB3mPI4Bb5FO6NRrB1WBM-Dpen2v5vesRK6kEO-9rxoIfDQ0pBkWeNrIl-KMiufnH/exec",
    ROLE: (main && main.dataset.category) || "Lyricist",

    // optional audio upload (beats / instrumentals the lyrics were written for)
    MAX_AUDIO: 3, // files
    MAX_AUDIO_MB: 20, // per file
    MAX_TOTAL_MB: 28, // all audio together (Google Apps Script accepts ~50 MB per request)

    // photo uploads (e.g. designers' works): photos are shrunk in the browser before sending
    MAX_PHOTO_MB: 25, // per original photo

    // video uploads (e.g. video editors). Big videos should be sent as links instead.
    MAX_VIDEO_MB: 25, // per video file
    MAX_LINKS: 5, // links per field that has a links box
    PHOTO_MAX_SIDE: 1600,
    PHOTO_QUALITY: 0.85,
  };

  const MB = 1024 * 1024;

  const $ = (id) => document.getElementById(id);

  const steps = {
    rules: $("stepRules"),
    form: $("stepForm"),
    thanks: $("stepThanks"),
  };
  const progressItems = document.querySelectorAll("#saProgress li");
  const agree = $("agreeRules");
  const rulesContinue = $("rulesContinue");
  const backToRules = $("backToRules");

  const form = $("soloForm");
  const submitBtn = $("submitBtn");
  const statusBox = $("formStatus");

  const contactType = $("contactType");
  const contactValue = $("contactValue");
  const contactValueLabel = $("contactValueLabel");
  const contactPlatformField = $("contactPlatformField");
  const contactPlatform = $("contactPlatform");

  const val = (el) => el.value.trim();

  /* ---------------- steps ---------------- */
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

  /* ---------------- errors + summary ---------------- */
  const fieldByKey = (key) =>
    form.querySelector(`.sa-field[data-field="${key}"]`);

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
    const lbl = field && field.querySelector("label:not(.sa-drop), .sa-label");
    return lbl ? lbl.textContent.replace("*", "").trim() : key;
  }

  function goToField(key) {
    const field = fieldByKey(key);
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = field.querySelector("input, textarea, select");
    if (focusable) focusable.focus({ preventScroll: true });
    field.classList.remove("flash");
    void field.offsetWidth;
    field.classList.add("flash");
  }

  const summaryTitle = (n) =>
    n === 1
      ? "Please fix this field before continuing:"
      : `Please fix these ${n} fields before continuing:`;

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

  function clearErrors() {
    form
      .querySelectorAll(".sa-field")
      .forEach((f) => f.classList.remove("has-error", "flash"));
    if (summary) summary.hidden = true;
    statusBox.hidden = true;
  }

  // clear a field's error as soon as the user edits it
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

  /* ---------------- connection type ---------------- */
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

  /* ---------------- file upload fields (audio or photos) ----------------
     Every file field in the form is picked up automatically (no ids needed):
       <div class="sa-field" data-field="audio_before" data-required="true" data-min="2" data-max="3"> ... </div>
     data-field    = the key sent to the server (audio, audio_before, audio_after, works, ...)
     data-required = "true" makes it mandatory
     data-min      = minimum number of files (default 1 when required)
     data-max      = maximum number of files (default CONFIG.MAX_AUDIO)
     The type comes from the input: accept="audio/*" = audio list, accept="image/*" = photo thumbnails
     (use <ul class="sa-files"></ul> for audio and <div class="sa-thumbs"></div> for photos).
     Pages without any file field simply skip this part. */
  const fmtSize = (bytes) =>
    bytes >= MB
      ? (bytes / MB).toFixed(1) + " MB"
      : Math.max(1, Math.round(bytes / 1024)) + " KB";
  const fileKey = (f) => `${f.name}|${f.size}|${f.lastModified}`;
  const isAudio = (f) =>
    f.type.startsWith("audio/") ||
    /\.(mp3|wav|flac|m4a|aac|ogg|aiff?)$/i.test(f.name);
  const isImage = (f) =>
    f.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name);
  const isVideo = (f) =>
    f.type.startsWith("video/") ||
    /\.(mp4|mov|webm|mkv|avi|m4v|wmv)$/i.test(f.name);
  const LINK_RE = /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i;

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
      // the browser can't decode it (e.g. HEIC): send the original if it's small enough
      if (file.size > 6 * MB) {
        throw new Error(
          `"${file.name}" can't be processed. Please use a JPG or PNG image.`,
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

  async function prepareAudio(file) {
    return {
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      data: await readAsBase64(file),
    };
  }

  const fileGroups = [];

  // links pasted into the optional <textarea class="sa-links"> of a file field
  const groupLinks = (g) =>
    g.linksEl
      ? g.linksEl.value
          .split(/[\s,;]+/)
          .map((l) => l.trim())
          .filter(Boolean)
      : [];

  // photos are shrunk before sending, so count them smaller than their original size
  const estimateBytes = (g, f) =>
    g.kind === "photos" ? Math.min(f.size, 1.2 * MB) : f.size;
  const totalEstimate = () =>
    fileGroups.reduce(
      (sum, g) =>
        sum + g.items.reduce((s, it) => s + estimateBytes(g, it.file), 0),
      0,
    );

  function renderGroup(g) {
    g.list.innerHTML = "";
    g.items.forEach((it, i) => {
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "sa-remove";
      rm.setAttribute("aria-label", `Remove ${it.file.name}`);
      rm.innerHTML = "&times;";
      rm.addEventListener("click", () => {
        if (it.url) URL.revokeObjectURL(it.url);
        g.items = g.items.filter((x) => x !== it);
        renderGroup(g);
        setError(g.key, "");
      });

      if (g.kind === "photos") {
        const box = document.createElement("div");
        box.className = "sa-thumb";
        const img = document.createElement("img");
        img.src = it.url;
        img.alt = `Photo ${i + 1}`;
        box.append(img, rm);
        g.list.append(box);
      } else {
        const li = document.createElement("li");
        li.className = "sa-file";
        const badge = document.createElement("span");
        badge.className = "sa-file-badge";
        badge.textContent = g.kind === "video" ? "Video" : "Audio";
        const name = document.createElement("span");
        name.className = "sa-file-name";
        name.textContent = it.file.name;
        name.title = it.file.name;
        const size = document.createElement("span");
        size.className = "sa-file-size";
        size.textContent = fmtSize(it.file.size);
        li.append(badge, name, size, rm);
        g.list.append(li);
      }
    });
    g.count.textContent = `${g.items.length} / ${g.max} ${g.kind === "photos" ? "photos" : "files"}`;
  }

  function addFiles(g, fileList) {
    let msg = "";
    const photos = g.kind === "photos";
    Array.from(fileList).forEach((file) => {
      const okType = photos
        ? isImage(file)
        : g.kind === "video"
          ? isVideo(file)
          : isAudio(file);
      if (!okType) {
        msg = photos
          ? "Please choose image files (JPG, PNG or WEBP)."
          : g.kind === "video"
            ? "Only video files are allowed (MP4, MOV, WEBM, etc.)."
            : "Only audio files are allowed (MP3, WAV, M4A, etc.).";
        return;
      }
      if (g.items.some((it) => fileKey(it.file) === fileKey(file))) return;
      const limit = photos
        ? CONFIG.MAX_PHOTO_MB
        : g.kind === "video"
          ? CONFIG.MAX_VIDEO_MB
          : CONFIG.MAX_AUDIO_MB;
      if (file.size > limit * MB) {
        msg = `"${file.name}" is too large (max ${limit} MB per file)${g.linksEl ? " \u2013 paste a link instead" : ""}.`;
        return;
      }
      if (g.items.length >= g.max) {
        msg = `You can upload up to ${g.max} ${photos ? "photos" : "files"} here.`;
        return;
      }
      if (totalEstimate() + estimateBytes(g, file) > CONFIG.MAX_TOTAL_MB * MB) {
        msg = `All files together can't be larger than ${CONFIG.MAX_TOTAL_MB} MB.`;
        return;
      }
      g.items.push({ file, url: photos ? URL.createObjectURL(file) : null });
    });
    renderGroup(g);
    setError(g.key, msg);
  }

  form.querySelectorAll('.sa-field input[type="file"]').forEach((input) => {
    const field = input.closest(".sa-field");
    const drop = field.querySelector(".sa-drop");
    const list = field.querySelector(".sa-files, .sa-thumbs");
    const count = field.querySelector(".sa-drop-sub");
    if (!drop || !list || !count) return;

    const g = {
      key: field.dataset.field,
      field,
      input,
      drop,
      list,
      count,
      kind: (input.accept || "").startsWith("image")
        ? "photos"
        : (input.accept || "").startsWith("video")
          ? "video"
          : "audio",
      linksEl: field.querySelector("textarea.sa-links"),
      max: Number(field.dataset.max) || CONFIG.MAX_AUDIO,
      min:
        Number(field.dataset.min) ||
        (field.dataset.required === "true" ? 1 : 0),
      items: [],
    };
    fileGroups.push(g);

    input.addEventListener("change", () => {
      addFiles(g, input.files);
      input.value = "";
    });
    ["dragenter", "dragover"].forEach((evt) =>
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.add("is-over");
      }),
    );
    ["dragleave", "drop"].forEach((evt) =>
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.remove("is-over");
      }),
    );
    drop.addEventListener("drop", (e) => {
      if (e.dataTransfer && e.dataTransfer.files.length)
        addFiles(g, e.dataTransfer.files);
    });
    renderGroup(g);
  });

  /* ---------------- extra text fields ----------------
     Any <input> / <textarea> with the attribute data-extra is sent together with its question
     (the field's label) in "extras", and is saved in the Sheet and email automatically.
     Make it mandatory with data-required="true" on its .sa-field. Handy for role-specific
     questions (e.g. PR-producers) without changing the script or Code.gs. */
  const extraEls = Array.from(form.querySelectorAll("[data-extra]"));

  function collectExtras() {
    return extraEls
      .map((el) => ({
        label: fieldLabel(el.closest(".sa-field").dataset.field),
        value: val(el),
      }))
      .filter((e) => e.value);
  }

  /* ---------------- validation ---------------- */
  function validate() {
    clearErrors();
    const errors = [];
    const add = (key, msg) => errors.push([key, msg]);

    if (!val($("firstName"))) add("firstName", "Please enter your first name.");
    if (!val($("stage_name")))
      add("stage_name", "Please enter your pseudonym.");

    const ageEl = $("age");
    const age = Number(ageEl.value);
    if (!val(ageEl)) add("age", "Please enter your age.");
    else if (
      !Number.isInteger(age) ||
      age < Number(ageEl.min) ||
      age > Number(ageEl.max)
    ) {
      add("age", `Age must be between ${ageEl.min} and ${ageEl.max}.`);
    }

    if (!val($("experience")))
      add("experience", "Please describe your experience.");

    // Skills textarea (lyricists etc.). Pages without this textarea simply skip the check.
    const skillsEl = $("skills");
    if (skillsEl && !val(skillsEl)) {
      add(
        "skills",
        "Please show us what you can do (e.g. paste a sample of your work).",
      );
    }

    // File fields: required when data-required="true" / data-min is set.
    // Fields with a links box accept files and/or links (both count towards the minimum).
    fileGroups.forEach((g) => {
      const links = groupLinks(g);
      const noun =
        g.kind === "photos"
          ? "photo"
          : g.kind === "video"
            ? "video"
            : "audio file";
      const plural =
        g.kind === "photos"
          ? "photos"
          : g.kind === "video"
            ? "videos"
            : "audio files";

      if (links.length > CONFIG.MAX_LINKS) {
        add(g.key, `You can add up to ${CONFIG.MAX_LINKS} links.`);
      } else if (links.some((l) => !LINK_RE.test(l))) {
        add(
          g.key,
          "One of the links doesn't look valid. Links must start with http:// or https://",
        );
      } else if (g.items.length + links.length < g.min) {
        add(
          g.key,
          g.linksEl
            ? g.min === 1
              ? `Please add at least one ${noun}: upload a file or paste a link.`
              : `Please add at least ${g.min} ${plural}: upload files or paste links.`
            : g.min === 1
              ? `Please upload at least one ${noun}.`
              : g.min >= g.max
                ? `Please upload ${g.min} ${plural}.`
                : `Please upload at least ${g.min} ${plural} (up to ${g.max}).`,
        );
      }
    });

    extraEls.forEach((el) => {
      const f = el.closest(".sa-field");
      if (f && f.dataset.required === "true" && !val(el)) {
        add(f.dataset.field, "Please fill in this field.");
      }
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

  /* ---------------- submit ---------------- */
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
        "The form is not connected yet: set SCRIPT_URL in js/staff_form.js (see apps-script/SETUP.md).",
      );
      return;
    }

    setLoading(true);
    try {
      const type = contactType.value;
      const payload = {
        category: "Staff - " + CONFIG.ROLE,
        firstName: val($("firstName")),
        stage_name: val($("stage_name")),
        age: val($("age")),
        experience: val($("experience")),
        skills: $("skills") ? val($("skills")) : "",
        contactType: type,
        contactPlatform: type === "other" ? val(contactPlatform) : "",
        contactValue: val(contactValue),
        website: $("website").value, // honeypot
        extras: collectExtras(),
      };

      // every file field is sent under its own key: audio, audio_before, audio_after, works, ...
      let totalBytes = 0;
      for (const g of fileGroups) {
        payload[g.key] = await Promise.all(
          g.items.map((it) =>
            g.kind === "photos" ? preparePhoto(it.file) : prepareAudio(it.file),
          ),
        );
        totalBytes += payload[g.key].reduce((sum, f) => sum + f.size, 0);
        if (g.linksEl) payload[g.key + "_links"] = groupLinks(g);
      }
      if (totalBytes > CONFIG.MAX_TOTAL_MB * MB) {
        throw new Error(
          `Your files are too large in total (${fmtSize(totalBytes)}). The limit is ${CONFIG.MAX_TOTAL_MB} MB. Please remove or shrink a file.`,
        );
      }

      // text/plain avoids a CORS preflight, which Google Apps Script doesn't support
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

      form.reset();
      fileGroups.forEach((g) => {
        g.items.forEach((it) => it.url && URL.revokeObjectURL(it.url));
        g.items = [];
        if (g.linksEl) g.linksEl.value = "";
        renderGroup(g);
      });
      contactType.dispatchEvent(new Event("change"));
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
})();
