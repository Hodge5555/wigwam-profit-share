(() => {
  const $ = id => document.getElementById(id);
  const root = $("paymentList");
  const status = $("paymentStatus");
  const codeField = $("postCode");
  const endpoint = "https://mztgimetelvfsctqytqj.supabase.co/functions/v1/wigwam-discord-post";
  const publicKey = "sb_publishable_C_WY9FIK32q25OD3NYoKhQ_WPXV8SbU";

  if (!root || !status || !codeField) return;

  const style = document.createElement("style");
  style.textContent = `
    .payments{display:grid;gap:8px;margin-top:12px}
    .payment-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#fff}
    .payment-person{font-weight:750;min-width:0;overflow-wrap:anywhere}
    .payment-meta{display:flex;align-items:center;gap:10px;flex-shrink:0}
    .payment-state{font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--muted)}
    .payment-state.is-paid{color:var(--green)}
    button.paid{background:#edf8f1;color:var(--green)}
    button:disabled{opacity:.55;cursor:wait}
    @media(max-width:520px){.payment-row{align-items:flex-start;flex-direction:column}.payment-meta{width:100%;justify-content:space-between}}
  `;
  document.head.append(style);

  async function request(payload) {
    const code = codeField.value.trim();
    if (!code) throw new Error("Enter the private Discord posting code above first.");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": publicKey,
        "x-wigwam-post-code": code
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || ("Payment service returned HTTP " + response.status));
    return data;
  }

  function render(data) {
    root.innerHTML = "";
    const paid = new Set(data.paid_names || []);
    (data.participants || []).forEach(name => {
      const isPaid = paid.has(name);
      const row = document.createElement("div");
      row.className = "payment-row";
      const person = document.createElement("span");
      person.className = "payment-person";
      person.textContent = name;
      const meta = document.createElement("div");
      meta.className = "payment-meta";
      const label = document.createElement("span");
      label.className = "payment-state" + (isPaid ? " is-paid" : "");
      label.textContent = isPaid ? "PAID" : "AWAITING";
      const button = document.createElement("button");
      button.className = isPaid ? "paid" : "secondary";
      button.textContent = isPaid ? "Undo paid" : "Mark paid";
      button.addEventListener("click", () => update(name, !isPaid, button));
      meta.append(label, button);
      row.append(person, meta);
      root.append(row);
    });
  }

  async function load(silent = false) {
    if (!silent) {
      status.className = "status";
      status.textContent = "Loading the latest profit-share payment list…";
    }
    try {
      const data = await request({ action: "get_state" });
      if (!data.exists) {
        root.innerHTML = "";
        status.className = "status";
        status.textContent = "No profit share has been posted yet. Post one above to start payment tracking.";
        return;
      }
      render(data);
      const paid = (data.paid_names || []).length;
      const total = (data.participants || []).length;
      status.className = "status ok";
      status.textContent = paid + " of " + total + " team members marked paid. Changes update the Discord status." + (data.payroll_ready ? " Main profit-share and payroll embeds are synced." : " Payroll channel is awaiting its webhook setup.") + (data.bonus_button_ready ? " Check Bonus button is active." : " Check Bonus button is waiting for Discord bot setup.");
    } catch (error) {
      status.className = "status err";
      status.textContent = "Could not load payments: " + error.message;
    }
  }

  async function update(name, isPaid, button) {
    button.disabled = true;
    status.className = "status";
    status.textContent = "Updating " + name + " in Discord…";
    try {
      const result = await request({ action: "mark_paid", employee_name: name, paid: isPaid });
      await load(true);
      status.className = "status ok";
      status.textContent = result.message || "The existing Discord embed has been updated.";
    } catch (error) {
      status.className = "status err";
      status.textContent = "Could not update payment: " + error.message;
      button.disabled = false;
    }
  }

  $("loadPayments")?.addEventListener("click", () => load(false));

  // After a new statement has posted, automatically load its new payment list.
  const postStatus = $("postStatus");
  if (postStatus && "MutationObserver" in window) {
    const observer = new MutationObserver(() => {
      if (postStatus.classList.contains("ok")) load(true);
    });
    observer.observe(postStatus, { attributes: true, childList: true, subtree: true });
  }
})();