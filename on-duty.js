(() => {
  "use strict";

  const API = "https://mztgimetelvfsctqytqj.supabase.co/functions/v1/wigwam-catering";
  const PUBLIC_KEY = "sb_publishable_C_WY9FIK32q25OD3NYoKhQ_WPXV8SbU";
  const REFRESH_MS = 60000;
  let lastRequestAt = 0;
  let refreshing = false;
  let lastSuccessfulCount = null;
  let widget;
  let countElement;
  let detailElement;
  let dotElement;

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #wigwam-on-duty-widget {
        position:static;z-index:2;display:flex;flex:0 0 auto;align-items:center;gap:7px;
        width:max-content;max-width:100%;margin-left:12px;padding:7px 10px;
        border:1px solid #80670b;border-radius:12px;
        background:rgba(10,10,10,.96);color:#f8f5e8;box-shadow:0 4px 16px #0008;
        font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
        pointer-events:none
      }
      #wigwam-on-duty-widget .wigwam-duty-dot{width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:#d9a928;box-shadow:0 0 8px #d9a92888}
      #wigwam-on-duty-widget[data-state="live"] .wigwam-duty-dot{background:#65d98a;box-shadow:0 0 8px #65d98a99}
      #wigwam-on-duty-widget[data-state="error"] .wigwam-duty-dot{background:#e39a58;box-shadow:0 0 8px #e39a5888}
      #wigwam-on-duty-widget .wigwam-duty-copy{display:grid;grid-template-columns:auto auto;align-items:center;column-gap:6px;row-gap:1px;min-width:0}
      #wigwam-on-duty-widget .wigwam-duty-label{grid-column:1/-1;color:#d9cda0;font-size:8px;font-weight:900;letter-spacing:.12em;line-height:1.2;white-space:nowrap}
      #wigwam-on-duty-widget .wigwam-duty-count{color:#ffd000;font-size:21px;font-weight:1000;line-height:1.05;font-variant-numeric:tabular-nums}
      #wigwam-on-duty-widget .wigwam-duty-detail{align-self:center;color:#b8b3a4;font-size:8px;line-height:1.3;white-space:nowrap}
      @media(max-width:760px){
        header .top,header .head,header.wigwam-brandbar{flex-wrap:wrap}
        #wigwam-on-duty-widget{margin-left:auto;padding:6px 8px}
      }
      @media(max-width:420px){
        #wigwam-on-duty-widget{gap:5px;margin-left:8px;padding:5px 7px}
        #wigwam-on-duty-widget .wigwam-duty-label{font-size:7px;letter-spacing:.08em}
        #wigwam-on-duty-widget .wigwam-duty-count{font-size:19px}
        #wigwam-on-duty-widget .wigwam-duty-detail{font-size:7px}
      }
    `;
    document.head.appendChild(style);
  }

  function makeWidget() {
    widget = document.createElement("aside");
    widget.id = "wigwam-on-duty-widget";
    widget.setAttribute("role", "status");
    widget.setAttribute("aria-live", "polite");
    widget.setAttribute("aria-atomic", "true");
    widget.title = 'Live count of members with the Discord "Clocked In" role';

    dotElement = document.createElement("span");
    dotElement.className = "wigwam-duty-dot";
    dotElement.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "wigwam-duty-copy";

    const label = document.createElement("span");
    label.className = "wigwam-duty-label";
    label.textContent = "WORKERS ON DUTY";

    countElement = document.createElement("strong");
    countElement.className = "wigwam-duty-count";
    countElement.textContent = "—";

    detailElement = document.createElement("small");
    detailElement.className = "wigwam-duty-detail";
    detailElement.textContent = "Checking Discord…";

    copy.append(label, countElement, detailElement);
    widget.append(dotElement, copy);

    const header = document.querySelector("header");
    const brand = header && header.querySelector(".wigwam-brand-lockup, .brand-lockup, .brand");
    if (brand && brand.parentElement) {
      brand.insertAdjacentElement("afterend", widget);
    } else if (header) {
      header.appendChild(widget);
    } else {
      document.body.insertBefore(widget, document.body.firstChild);
    }
  }

  function setUnavailable(message) {
    widget.dataset.state = "error";
    if (lastSuccessfulCount === null) countElement.textContent = "—";
    detailElement.textContent = message;
    widget.title = message;
  }

  async function refreshCount() {
    if (refreshing || document.visibilityState === "hidden") return;
    refreshing = true;
    lastRequestAt = Date.now();

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: PUBLIC_KEY },
        body: JSON.stringify({ action: "workers_on_duty" }),
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || ("HTTP " + response.status));

      if (!data.configured) {
        lastSuccessfulCount = null;
        setUnavailable('Discord "Clocked In" role is not configured');
        return;
      }

      const count = Number(data.count);
      if (!Number.isInteger(count) || count < 0) throw new Error("Discord returned an invalid worker count.");

      lastSuccessfulCount = count;
      widget.dataset.state = "live";
      countElement.textContent = count.toLocaleString("en-GB");
      const updated = new Date(data.retrieved_at);
      const time = Number.isFinite(updated.getTime())
        ? updated.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "just now";
      detailElement.textContent = "Live · " + time;
      widget.title = "Live count from Discord's Clocked In role. Updated " + time;
    } catch (error) {
      console.warn("WigWam on-duty count could not refresh:", error);
      setUnavailable(lastSuccessfulCount === null ? "Live count unavailable" : "Update failed · last count " + lastSuccessfulCount);
    } finally {
      refreshing = false;
    }
  }

  function start() {
    if (!document.body || !document.head) return;
    addStyles();
    makeWidget();
    refreshCount();
    window.setInterval(refreshCount, REFRESH_MS);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && Date.now() - lastRequestAt > 10000) refreshCount();
    });
    window.addEventListener("online", refreshCount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
