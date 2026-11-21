(() => {
  const $ = id => document.getElementById(id);

  // Move employee maintenance into a closed-by-default disclosure panel.
  const dbHeading = [...document.querySelectorAll("h2")]
    .find(el => el.textContent.trim() === "Employee database");
  if (dbHeading) {
    const addField = dbHeading.nextElementSibling;
    const savedField = addField && addField.nextElementSibling;
    const panel = document.createElement("details");
    panel.className = "employee-manager";
    const summary = document.createElement("summary");
    summary.textContent = "Manage saved employee database";
    const note = document.createElement("p");
    note.className = "notice";
    note.textContent = "The directory is hidden until opened. Search for a specific name to view or edit matching records; the full team list is not displayed.";
    const searchField = document.createElement("div");
    searchField.className = "field";
    const label = document.createElement("label");
    label.htmlFor = "directorySearch";
    label.textContent = "Search saved employees";
    const search = document.createElement("input");
    search.id = "directorySearch";
    search.type = "search";
    search.autocomplete = "off";
    search.placeholder = "Type part of a name to find it";
    searchField.append(label, search);
    dbHeading.replaceWith(panel);
    panel.append(summary, note, searchField);
    if (addField) panel.append(addField);
    if (savedField) panel.append(savedField);
    search.addEventListener("input", () => renderDirectory());
  }

  // Only display directory records when a search term is entered.
  renderDirectory = function () {
    const root = $("directory");
    if (!root) return;
    root.innerHTML = "";
    const query = ($("directorySearch")?.value || "").trim().toLowerCase();
    if (!query) {
      const note = document.createElement("p");
      note.className = "notice";
      note.textContent = "Type part of an employee name above to see matching records. The full list stays hidden.";
      root.append(note);
      return;
    }
    const matches = employees.filter(emp => emp.name.toLowerCase().includes(query)).slice(0, 10);
    if (!matches.length) {
      const note = document.createElement("p");
      note.className = "notice";
      note.textContent = "No saved employees match that search.";
      root.append(note);
      return;
    }
    matches.forEach(emp => {
      const row = document.createElement("div");
      row.className = "directory-row";
      const name = document.createElement("span");
      name.textContent = emp.name;
      const actions = document.createElement("div");
      actions.className = "directory-actions";
      const edit = document.createElement("button");
      edit.className = "secondary";
      edit.textContent = "Edit";
      edit.onclick = async () => {
        const next = prompt("Edit employee name:", emp.name);
        if (next === null) return;
        const clean = next.trim();
        if (!clean) return alert("Name cannot be blank.");
        try {
          await db(`employees?id=eq.${emp.id}`, { method: "PATCH", body: JSON.stringify({ name: clean }) });
          await loadEmployees();
        } catch (e) { alert("Could not update employee: " + e.message); }
      };
      const del = document.createElement("button");
      del.className = "remove";
      del.textContent = "Delete";
      del.onclick = async () => {
        if (!confirm(`Remove ${emp.name} from the shared employee list?`)) return;
        try {
          await db(`employees?id=eq.${emp.id}`, { method: "DELETE" });
          people = people.map(p => p.name === emp.name ? { ...p, name: "" } : p);
          await loadEmployees();
        } catch (e) { alert("Could not delete employee: " + e.message); }
      };
      actions.append(edit, del);
      row.append(name, actions);
      root.append(row);
    });
  };

  // Replace the full dropdown list with a type-to-search picker.
  renderInputs = function () {
    $("people").innerHTML = "";
    people.forEach((p, i) => {
      const row = document.createElement("div");
      row.className = "person";
      const picker = document.createElement("div");
      picker.className = "employee-picker";
      const search = document.createElement("input");
      search.type = "text";
      search.autocomplete = "off";
      search.placeholder = "Type to search employees";
      search.value = employees.some(emp => emp.name === p.name) ? p.name : "";
      search.setAttribute("aria-label", "Search employee name");
      const options = document.createElement("div");
      options.className = "employee-options";
      options.hidden = true;

      function showMatches() {
        options.innerHTML = "";
        const query = search.value.trim().toLowerCase();
        if (!query || query === String(people[i].name || "").toLowerCase()) {
          options.hidden = true;
          return;
        }
        const matches = employees.filter(emp => emp.name.toLowerCase().includes(query)).slice(0, 8);
        if (!matches.length) {
          options.hidden = true;
          return;
        }
        matches.forEach(emp => {
          const choice = document.createElement("button");
          choice.type = "button";
          choice.className = "employee-option";
          choice.textContent = emp.name;
          choice.addEventListener("mousedown", event => event.preventDefault());
          choice.addEventListener("click", () => {
            people[i].name = emp.name;
            search.value = emp.name;
            options.hidden = true;
            calculate();
          });
          options.append(choice);
        });
        options.hidden = false;
      }

      search.addEventListener("input", () => {
        const exact = employees.find(emp => emp.name.toLowerCase() === search.value.trim().toLowerCase());
        people[i].name = exact ? exact.name : "";
        showMatches();
        calculate();
      });
      search.addEventListener("focus", showMatches);
      search.addEventListener("blur", () => window.setTimeout(() => options.hidden = true, 160));
      search.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          const query = search.value.trim().toLowerCase();
          const match = employees.find(emp => emp.name.toLowerCase().includes(query));
          if (match && query) {
            event.preventDefault();
            people[i].name = match.name;
            search.value = match.name;
            options.hidden = true;
            calculate();
          }
        }
      });
      picker.append(search, options);

      const hours = document.createElement("input");
      hours.type = "number";
      hours.min = "0";
      hours.step = "0.01";
      hours.placeholder = "Hours";
      hours.value = p.hours;
      hours.setAttribute("aria-label", "Hours worked");
      hours.addEventListener("input", event => { people[i].hours = event.target.value; calculate(); });

      const del = document.createElement("button");
      del.className = "remove";
      del.textContent = "×";
      del.title = "Remove hours row";
      del.onclick = () => { people.splice(i, 1); renderInputs(); calculate(); };
      row.append(picker, hours, del);
      $("people").append(row);
    });
    calculate();
  };

  const style = document.createElement("style");
  style.textContent = `
    .employee-manager{margin-top:20px;border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:var(--cream)}
    .employee-manager summary{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;font-weight:800;color:var(--deep)}
    .employee-manager summary::-webkit-details-marker{display:none}
    .employee-manager summary::after{content:"＋";margin-left:auto;font-size:18px}
    .employee-manager[open] summary::after{content:"−"}
    .employee-manager .notice{margin:10px 0 12px}
    .employee-picker{position:relative;min-width:0}
    .employee-picker>input{width:100%}
    .employee-options{position:absolute;z-index:30;top:calc(100% + 4px);left:0;right:0;max-height:210px;overflow-y:auto;padding:4px;background:white;border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px #34251b20;display:grid;gap:3px}
    .employee-options[hidden]{display:none}
    .employee-option{width:100%;text-align:left;padding:9px 10px;background:white;color:var(--ink);border-radius:7px;font-weight:600}
    .employee-option:hover{background:var(--pale)}
  `;
  document.head.append(style);
  renderDirectory();
  renderInputs();
})();