(() => {
  "use strict";

  const CONFIG = {
    SCRIPT_URL:
      "https://script.google.com/macros/s/AKfycbxSB3mPI4Bb5FO6NRrB1WBM-Dpen2v5vesRK6kEO-9rxoIfDQ0pBkWeNrIl-KMiufnH/exec",

    MIN_PHOTOS: 3,
    MAX_PHOTOS: 4,
    PHOTO_MAX_SIDE: 1600,
    PHOTO_QUALITY: 0.85,

    MAX_SKILLS: 3,
    MAX_LINKS: 5,
    MAX_SKILL_MB: 500,
    MAX_TOTAL_MB: 1000,
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

  const photosInput = $("photosInput");
  const photosDrop = $("photosDrop");
  const photosList = $("photosList");
  const photosCount = $("photosCount");

  const skillsInput = $("skillsInput");
  const skillsDrop = $("skillsDrop");
  const skillsList = $("skillsList");
  const skillsCount = $("skillsCount");
  const skillsLinks = $("skillsLinks");

  const contactType = $("contactType");
  const contactValue = $("contactValue");
  const contactValueLabel = $("contactValueLabel");
  const contactPlatformField = $("contactPlatformField");
  const contactPlatform = $("contactPlatform");

  $("skillsMaxInfo").textContent = CONFIG.MAX_SKILLS;
  photosCount.textContent = `0 / ${CONFIG.MAX_PHOTOS} photos`;

  let photos = [];
  let skills = [];

  const order = ["rules", "form", "thanks"];

  function showStep(name) {
    Object.entries(steps).forEach(([key, el]) => {
      el.hidden = key !== name;
    });
    const idx = order.indexOf(name);
    progressItems.forEach((li, i) => {
      li.classList.toggle("is-active", i === idx);
      li.classList.toggle("is-done", i < idx);
    });
    document
      .getElementById("saProgress")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }

  agree.addEventListener("change", () => {
    rulesContinue.disabled = !agree.checked;
  });
  rulesContinue.disabled = !agree.checked;

  rulesContinue.addEventListener("click", () => {
    if (agree.checked) showStep("form");
  });

  backToRules.addEventListener("click", () => showStep("rules"));

  const fmtSize = (bytes) =>
    bytes >= MB
      ? (bytes / MB).toFixed(1) + " MB"
      : Math.max(1, Math.round(bytes / 1024)) + " KB";

  const fileKey = (f) => `${f.name}|${f.size}|${f.lastModified}`;

  function setError(fieldName, message) {
    const field = form.querySelector(`[data-field="${fieldName}"]`);
    if (!field) return;
    field.classList.toggle("has-error", Boolean(message));
    const p = field.querySelector(".sa-error");
    if (p) p.textContent = message || "";
    if (!message) removeSummaryItem(fieldName);
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

  function fieldLabel(fieldName) {
    const field = form.querySelector(`[data-field="${fieldName}"]`);
    const lbl = field && field.querySelector("label:not(.sa-drop), .sa-label");
    return lbl ? lbl.textContent.replace("*", "").trim() : fieldName;
  }

  function goToField(fieldName) {
    const field = form.querySelector(`[data-field="${fieldName}"]`);
    if (!field) return;
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = field.querySelector("input, textarea, select");
    if (focusable && focusable.type !== "file") {
      focusable.focus({ preventScroll: true });
    }
    field.classList.remove("flash");
    void field.offsetWidth;
    field.classList.add("flash");
  }

  function renderSummary(errors) {
    const box = getSummary();
    box.innerHTML = "";
    const title = document.createElement("strong");
    title.textContent =
      errors.length === 1
        ? "Please fix this field before continuing:"
        : `Please fix these ${errors.length} fields before continuing:`;
    const ul = document.createElement("ul");
    errors.forEach(([name, msg]) => {
      const li = document.createElement("li");
      li.dataset.field = name;
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = fieldLabel(name);
      a.addEventListener("click", (e) => {
        e.preventDefault();
        goToField(name);
      });
      li.append(a, document.createTextNode(" \u2013 " + msg));
      ul.append(li);
    });
    box.append(title, ul);
    box.hidden = false;
  }

  function removeSummaryItem(fieldName) {
    if (!summary || summary.hidden) return;
    const li = summary.querySelector(`li[data-field="${fieldName}"]`);
    if (li) li.remove();
    const left = summary.querySelectorAll("li").length;
    if (!left) {
      summary.hidden = true;
    } else {
      summary.querySelector("strong").textContent =
        left === 1
          ? "Please fix this field before continuing:"
          : `Please fix these ${left} fields before continuing:`;
    }
  }

  function clearErrors() {
    form
      .querySelectorAll(".sa-field")
      .forEach((f) => f.classList.remove("has-error", "flash"));
    if (summary) summary.hidden = true;
    statusBox.hidden = true;
  }

  form.querySelectorAll("input, textarea, select").forEach((el) => {
    el.addEventListener("input", () => {
      const field = el.closest(".sa-field");
      if (field) {
        field.classList.remove("has-error");
        removeSummaryItem(field.dataset.field);
      }
    });
  });

  function addPhotos(fileList) {
    const incoming = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!incoming.length) {
      setError("photos", "Please choose image files (JPG, PNG or WEBP).");
      return;
    }
    let tooMany = false;
    incoming.forEach((file) => {
      if (photos.some((p) => fileKey(p.file) === fileKey(file))) return;
      if (photos.length >= CONFIG.MAX_PHOTOS) {
        tooMany = true;
        return;
      }
      photos.push({ file, url: URL.createObjectURL(file) });
    });
    renderPhotos();
    setError(
      "photos",
      tooMany ? `You can upload up to ${CONFIG.MAX_PHOTOS} photos.` : "",
    );
  }

  function renderPhotos() {
    photosList.innerHTML = "";
    photos.forEach((p, i) => {
      const box = document.createElement("div");
      box.className = "sa-thumb";

      const img = document.createElement("img");
      img.src = p.url;
      img.alt = `Photo ${i + 1}`;

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "sa-remove";
      rm.setAttribute("aria-label", `Remove photo ${i + 1}`);
      rm.innerHTML = "&times;";
      rm.addEventListener("click", () => {
        URL.revokeObjectURL(p.url);
        photos = photos.filter((x) => x !== p);
        renderPhotos();
      });

      box.append(img, rm);
      photosList.append(box);
    });
    photosCount.textContent = `${photos.length} / ${CONFIG.MAX_PHOTOS} photos`;
  }

  function addSkills(fileList) {
    const incoming = Array.from(fileList);
    let msg = "";
    incoming.forEach((file) => {
      const ok =
        file.type.startsWith("audio/") || file.type.startsWith("video/");
      if (!ok) {
        msg = "Only audio or video files are allowed.";
        return;
      }
      if (skills.some((f) => fileKey(f) === fileKey(file))) return;
      if (file.size > CONFIG.MAX_SKILL_MB * MB) {
        msg = `"${file.name}" is too large (max ${CONFIG.MAX_SKILL_MB} MB per file).`;
        return;
      }
      if (skills.length >= CONFIG.MAX_SKILLS) {
        msg = `You can upload up to ${CONFIG.MAX_SKILLS} files.`;
        return;
      }
      skills.push(file);
    });
    renderSkills();
    setError("skills", msg);
  }

  function renderSkills() {
    skillsList.innerHTML = "";
    skills.forEach((file) => {
      const li = document.createElement("li");
      li.className = "sa-file";

      const badge = document.createElement("span");
      badge.className = "sa-file-badge";
      badge.textContent = file.type.startsWith("video/") ? "Video" : "Audio";

      const name = document.createElement("span");
      name.className = "sa-file-name";
      name.textContent = file.name;
      name.title = file.name;

      const size = document.createElement("span");
      size.className = "sa-file-size";
      size.textContent = fmtSize(file.size);

      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "sa-remove";
      rm.setAttribute("aria-label", `Remove ${file.name}`);
      rm.innerHTML = "&times;";
      rm.addEventListener("click", () => {
        skills = skills.filter((f) => f !== file);
        renderSkills();
      });

      li.append(badge, name, size, rm);
      skillsList.append(li);
    });
    skillsCount.textContent = `${skills.length} / ${CONFIG.MAX_SKILLS} files`;
  }

  function wireDropZone(zone, input, handler) {
    input.addEventListener("change", () => {
      handler(input.files);
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
      if (e.dataTransfer && e.dataTransfer.files.length) {
        handler(e.dataTransfer.files);
      }
    });
  }

  wireDropZone(photosDrop, photosInput, addPhotos);
  wireDropZone(skillsDrop, skillsInput, addSkills);

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
    other: {
      label: "Username",
      placeholder: "@username",
      type: "text",
    },
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

  function parseLinks() {
    return skillsLinks.value
      .split(/[\s,;]+/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function validate() {
    clearErrors();
    const errors = [];
    const val = (el) => el.value.trim();

    if (!val($("firstName")))
      errors.push(["firstName", "Please enter your first name."]);
    if (!val($("stage_name")))
      errors.push(["stage_name", "Please enter your stage name."]);

    const ageEl = $("age");
    const age = Number(ageEl.value);
    if (!val(ageEl)) {
      errors.push(["age", "Please enter your age."]);
    } else if (
      !Number.isInteger(age) ||
      age < Number(ageEl.min) ||
      age > Number(ageEl.max)
    ) {
      errors.push([
        "age",
        `Age must be between ${ageEl.min} and ${ageEl.max}.`,
      ]);
    }

    if (!val($("promo")))
      errors.push([
        "promo",
        "Please enter the social media you use for promoting.",
      ]);

    if (!val($("experience")))
      errors.push(["experience", "Please describe your experience."]);

    if (photos.length < CONFIG.MIN_PHOTOS) {
      errors.push([
        "photos",
        `Please upload at least ${CONFIG.MIN_PHOTOS} photos (up to ${CONFIG.MAX_PHOTOS}).`,
      ]);
    }

    const links = parseLinks();
    if (skills.length < 1 && links.length < 1) {
      errors.push([
        "skills",
        "Please upload an audio/video file or paste at least one link.",
      ]);
    } else if (links.length > CONFIG.MAX_LINKS) {
      errors.push(["skills", `You can add up to ${CONFIG.MAX_LINKS} links.`]);
    } else if (links.some((l) => !/^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(l))) {
      errors.push([
        "skills",
        "One of the links doesn't look valid. Links must start with http:// or https://",
      ]);
    }

    const type = contactType.value;
    if (!type) {
      errors.push(["contactType", "Please choose how we can reach you."]);
    } else {
      const v = val(contactValue);
      if (!v) {
        errors.push(["contactValue", "This field is required."]);
      } else if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        errors.push(["contactValue", "Please enter a valid email address."]);
      } else if (type === "telegram" && !/^@?[A-Za-z0-9_]{4,32}$/.test(v)) {
        errors.push([
          "contactValue",
          "Please enter a valid Telegram username (e.g. @username).",
        ]);
      }
      if (type === "other" && !val(contactPlatform)) {
        errors.push(["contactPlatform", "Please tell us which social media."]);
      }
    }

    errors.forEach(([f, m]) => setError(f, m));

    if (errors.length) {
      renderSummary(errors);
      getSummary().scrollIntoView({ behavior: "smooth", block: "center" });
      errors.forEach(([f]) => {
        const el = form.querySelector(`[data-field="${f}"]`);
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

  async function prepareSkill(file) {
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
      ? "Sending… please wait"
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
        "The form is not connected yet: set SCRIPT_URL in js/solo_audition.js (see apps-script/SETUP.md).",
      );
      return;
    }

    setLoading(true);
    try {
      const [photoData, skillData] = await Promise.all([
        Promise.all(photos.map((p) => preparePhoto(p.file))),
        Promise.all(skills.map(prepareSkill)),
      ]);

      const totalBytes = [...photoData, ...skillData].reduce(
        (sum, f) => sum + f.size,
        0,
      );
      if (totalBytes > CONFIG.MAX_TOTAL_MB * MB) {
        throw new Error(
          `Your files are too large in total (${fmtSize(totalBytes)}). The limit is ${CONFIG.MAX_TOTAL_MB} MB. Please remove or shrink a file.`,
        );
      }

      const type = contactType.value;
      const payload = {
        category: "Solo Artist",
        firstName: $("firstName").value.trim(),
        stage_name: $("stage_name").value.trim(),
        age: $("age").value.trim(),
        experience: $("experience").value.trim(),
        promo: $("promo").value.trim(),
        contactType: type,
        contactPlatform: type === "other" ? contactPlatform.value.trim() : "",
        contactValue: contactValue.value.trim(),
        website: $("website").value,
        photos: photoData,
        skills: skillData,
        skillLinks: parseLinks(),
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

      photos.forEach((p) => URL.revokeObjectURL(p.url));
      form.reset();
      photos = [];
      skills = [];
      skillsLinks.value = "";
      renderPhotos();
      renderSkills();
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
