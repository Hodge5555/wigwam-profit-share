(() => {
  "use strict";

  // New image uploads in this GitHub folder are picked up automatically.
  const REPOSITORY = "Hodge5555/wigwam-profit-share";
  const UPLOAD_FOLDER = "assets/sign-in-images";
  const API_BASE = "https://api.github.com/repos/" + REPOSITORY;
  const CACHE_KEY = "wigwamSignInImageWatcherV1";
  const CHECK_COOLDOWN_MS = 90000;
  const POLL_INTERVAL_MS = 15000;
  const IMAGE_EXTENSIONS = /\\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i;

  const area = document.getElementById("uploadedImageArea");
  const img = document.getElementById("uploadedImage");
  if (!area || !img) return;

  let memoryState = { checkedAt: 0, lockUntil: 0, latestCommit: "", imagePath: "", imageCommit: "" };
  let displayedKey = "";

  function readState() {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      return saved ? { ...memoryState, ...JSON.parse(saved) } : { ...memoryState };
    } catch (_) {
      return { ...memoryState };
    }
  }

  function writeState(state) {
    memoryState = state;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function encodedPath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  function applyImage(state) {
    if (!state.imagePath || !state.imageCommit) {
      area.hidden = true;
      return;
    }

    const key = state.imageCommit + ":" + state.imagePath;
    if (key === displayedKey) return;
    displayedKey = key;

    const imageUrl = "https://raw.githubusercontent.com/" + REPOSITORY + "/"
      + encodeURIComponent(state.imageCommit) + "/" + encodedPath(state.imagePath);

    img.onload = () => { area.hidden = false; };
    img.onerror = () => { area.hidden = true; };
    img.src = imageUrl;
  }

  async function fetchJson(url) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "Accept": "application/vnd.github+json" }
    });
    if (!response.ok) throw new Error("Image upload check returned HTTP " + response.status);
    return response.json();
  }

  function findImage(files) {
    if (!Array.isArray(files)) return null;
    const candidates = files.filter(file =>
      file &&
      file.status !== "removed" &&
      typeof file.filename === "string" &&
      file.filename.startsWith(UPLOAD_FOLDER + "/") &&
      IMAGE_EXTENSIONS.test(file.filename)
    );
    if (!candidates.length) return null;
    // One image per upload commit is recommended; deterministic fallback for batches.
    candidates.sort((a, b) => a.filename.localeCompare(b.filename));
    return candidates[candidates.length - 1];
  }

  async function checkForNewImage() {
    let state = readState();
    applyImage(state);

    const now = Date.now();
    if (now - Number(state.checkedAt || 0) < CHECK_COOLDOWN_MS) return;
    if (Number(state.lockUntil || 0) > now) return;

    // Shared localStorage throttles simultaneous open sign-in pages.
    state.checkedAt = now;
    state.lockUntil = now + 30000;
    writeState(state);

    try {
      const commits = await fetchJson(
        API_BASE + "/commits?path=" + encodeURIComponent(UPLOAD_FOLDER) + "&per_page=10"
      );
      const newestCommit = Array.isArray(commits) && commits.length ? commits[0] : null;

      if (newestCommit && newestCommit.sha !== state.latestCommit) {
        let selected = null;

        for (const entry of commits) {
          if (!entry || !entry.sha) continue;
          const details = await fetchJson(API_BASE + "/commits/" + encodeURIComponent(entry.sha));
          const match = findImage(details.files);
          if (match) {
            selected = { imagePath: match.filename, imageCommit: entry.sha };
            break;
          }
        }

        if (selected) {
          state.imagePath = selected.imagePath;
          state.imageCommit = selected.imageCommit;
        }
        state.latestCommit = newestCommit.sha;
      }

      state.checkedAt = Date.now();
      state.lockUntil = 0;
      writeState(state);
      applyImage(state);
    } catch (_) {
      state.lockUntil = 0;
      // Retry sooner after network/API failures without causing rapid repeated requests.
      state.checkedAt = Date.now() - 45000;
      writeState(state);
    }
  }

  checkForNewImage();
  window.setInterval(checkForNewImage, POLL_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkForNewImage();
  });
  window.addEventListener("focus", checkForNewImage);
})();