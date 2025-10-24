// app.js — Version complète et corrigée (Flèches OK)
(async () => {
  const LS_KEY = "proc_lib_v3";

  // DOM refs
  const btnGoProcesses = document.getElementById("btnGoProcesses");
  const btnGoNew = document.getElementById("btnGoNew");
  const homePanel = document.getElementById("homePanel");
  const appPanel = document.getElementById("appPanel");
  const homeCards = document.getElementById("homeCards");

  const searchEl = document.getElementById("search");
  const listEl = document.getElementById("processList");
  const detailContent = document.getElementById("detailContent");
  const btnNew = document.getElementById("btnNew");
  const filterCategory = document.getElementById("filterCategory");
  const filterIndustry = document.getElementById("filterIndustry");
  const btnExport = document.getElementById("btnExport");
  const btnExportPdf = document.getElementById("btnExportPdf");
  const importFile = document.getElementById("importFile");

  // modal & form
  const modal = document.getElementById("modal");
  const closeModal = document.getElementById("closeModal");
  const editorForm = document.getElementById("editorForm");
  const modalTitle = document.getElementById("modalTitle");

  const procId = document.getElementById("procId");
  const titleEl = document.getElementById("title");
  const shortDescriptionEl = document.getElementById("shortDescription");
  const industryEl = document.getElementById("industry");
  const categoriesEl = document.getElementById("categories");
  const keywordsEl = document.getElementById("keywords");
  const versionEl = document.getElementById("version");
  const statusEl = document.getElementById("status");
  const publishBtn = document.getElementById("publishBtn");
  const stepsContainer = document.getElementById("stepsContainer");
  const addStepBtn = document.getElementById("addStepBtn");

  // Nouveaux champs de la modale (JSON)
  const qualityControlsEl = document.getElementById("qualityControls");
  const kpisEl = document.getElementById("kpis");
  const risksEl = document.getElementById("risks");

  let data = [];
  let currentDetailId = null;

  // ------------------ Navigation & Events ------------------
  function attachEvents(){
    if(btnGoProcesses) btnGoProcesses.addEventListener('click', ()=> showApp());
    if(btnGoNew) btnGoNew.addEventListener('click', ()=> { showApp(); openEditor(); });

    if(searchEl) searchEl.addEventListener("input", renderList);
    if(filterCategory) filterCategory.addEventListener("change", renderList);
    if(btnNew) btnNew.addEventListener("click", ()=> openEditor());
    if(closeModal) closeModal.addEventListener("click", closeEditor);
    if(editorForm) editorForm.addEventListener("submit", onSave);
    if(publishBtn) publishBtn.addEventListener("click", onPublish);
    if(btnExport) btnExport.addEventListener('click', onExport);
    if(btnExportPdf) btnExportPdf.addEventListener("click", onExportPdfCurrent);
    if(importFile) importFile.addEventListener("change", onImport);
    if(addStepBtn) addStepBtn.addEventListener("click", ()=> addStepRow()); // addStepRow sans argument pour "nouveau"

    document.addEventListener("keydown", (e)=> { if(e.key === "Escape") {
      const pop = document.querySelector('.step-popover'); if(pop) pop.remove(); else closeEditor();
    }});
    document.addEventListener("click", (e)=>{
      const pop = document.querySelector('.step-popover');
      if(pop && !pop.contains(e.target) && !e.target.closest('.timeline-step')) pop.remove();
    });
  }

  function showHome(){
    if(homePanel) homePanel.classList.remove('hidden');
    if(appPanel) appPanel.classList.add('hidden');
    renderHomeCards();
  }

  function showApp(){
    if(homePanel) homePanel.classList.add('hidden');
    if(appPanel) appPanel.classList.remove('hidden');
    renderFilters();
    renderList();
  }

  // ------------------ Load / Save ------------------
  async function loadData(){
    try {
      const raw = localStorage.getItem(LS_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        return parsed;
      }

      console.log("LocalStorage vide. Chargement du JSON externe par défaut...");
      const response = await fetch('process_chocolate_enriched.json');
      if (!response.ok) {
        throw new Error(`Erreur HTTP! statut: ${response.status}`);
      }
      const externalData = await response.json();
      const dataToStore = Array.isArray(externalData) ? externalData : [externalData];
      localStorage.setItem(LS_KEY, JSON.stringify(dataToStore, null, 2));
      return deepClone(dataToStore);

    } catch(e){
      console.error("Erreur lors du chargement des données", e);
      localStorage.removeItem(LS_KEY);
      return [];
    }
  }

  function saveData(){
    localStorage.setItem(LS_KEY, JSON.stringify(data, null, 2));
  }

  function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function escapeHtml(s){ if(!s) return ""; return (""+s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }
  
  // Helpers JSON pour les textareas
  function safeJsonStringify(data) {
    if (!data || (Array.isArray(data) && data.length === 0)) return "";
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return "";
    }
  }
  function safeJsonParse(str, defaultVal = []) {
    if (!str) return defaultVal;
    try {
      const parsed = JSON.parse(str);
      return parsed;
    } catch (e) {
      console.warn("Erreur JSON Parse:", e.message);
      return defaultVal; // Retourne la valeur par défaut en cas d'erreur
    }
  }


  // ------------------ Filters / Lists / Home cards ------------------
  function renderFilters(){
    const industries = Array.from(new Set(data.map(d => d.industry).filter(Boolean)));
    const categories = Array.from(new Set(data.flatMap(d=>d.categories||[])));
    fillSelect(filterIndustry, ["", ...industries], ["Toutes industries","..."]);
    fillSelect(filterCategory, ["", ...categories], ["Toutes catégories","..."]);
  }
  function fillSelect(selectEl, values, placeholders=[]){
    if(!selectEl) return;
    const prev = selectEl.value || "";
    selectEl.innerHTML = "";
    if(placeholders[0]) selectEl.appendChild(option("", placeholders[0]));
    values.forEach(v=> selectEl.appendChild(option(v, v || "—")));
    selectEl.value = prev;
  }
  function option(val, text){ const o = document.createElement("option"); o.value = val; o.textContent = text; return o; }
  function renderHomeCards(){
    if(!homeCards) return;
    homeCards.innerHTML = "";
    const createCard = document.createElement("div");
    createCard.className = "proc-card create";
    createCard.innerHTML = `<div style="text-align:center"><div style="font-size:36px; margin-bottom:8px; color:rgba(255,255,255,0.7)">＋</div><div>Créer un procédé</div></div>`;
    createCard.onclick = ()=> { showApp(); openEditor(); };
    homeCards.appendChild(createCard);
    data.slice().reverse().forEach((p, idx) => {
      const card = document.createElement("div");
      card.className = "proc-card";
      const hue = (idx * 47) % 360;
      const bar = document.createElement("div");
      bar.className = "accent-bar";
      bar.style.background = `hsl(${hue} 60% 45%)`;
      card.appendChild(bar);
      const top = document.createElement("div");
      top.className = "top-row";
      const iconWrap = document.createElement("div");
      iconWrap.className = "icon-wrap";
      iconWrap.innerHTML = getIconSvg(p.title || "");
      top.appendChild(iconWrap);
      const titleWrap = document.createElement("div");
      titleWrap.innerHTML = `<div class="title">${escapeHtml(p.title || "Untitled")}</div>`;
      top.appendChild(titleWrap);
      card.appendChild(top);
      const dots = document.createElement("div");
      dots.className = "dots";
      dots.innerHTML = "⋮";
      dots.onclick = (ev)=> { ev.stopPropagation(); openCardMenu(ev, p); };
      card.appendChild(dots);
      const meta = document.createElement("div");
      meta.className = "meta";
      const date = p.updated_at ? (new Date(p.updated_at).toLocaleDateString()) : "";
      meta.textContent = `${date} • ${p.status || ""} • ${(p.steps||[]).length} étapes`;
      card.appendChild(meta);
      card.onclick = ()=> {
        showApp();
        setTimeout(()=> showDetail(p.id), 60);
      };
      homeCards.appendChild(card);
    });
  }
  function openCardMenu(ev, p){
    ev.stopPropagation();
    const menu = document.createElement('div');
    menu.className = 'step-popover';
    menu.style.minWidth = '160px';
    menu.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px">
      <button class="small">Éditer</button>
      <button class="small">Publier</button>
      <button class="small" style="color:#ffb3a7">Supprimer</button>
      <button class="small">Fermer</button>
    </div>`;
    document.body.appendChild(menu);
    const rect = ev.target.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 8 + window.scrollY}px`;
    menu.style.left = `${Math.max(8, rect.left + window.scrollX - 120)}px`;
    menu.querySelector('button.small').addEventListener('click', ()=>{
      menu.remove();
      openEditor(p.id);
    });
    menu.querySelectorAll('button.small')[1].addEventListener('click', ()=>{
      menu.remove();
      publishProcess(p.id);
    });
    menu.querySelectorAll('button.small')[2].addEventListener('click', ()=>{
      menu.remove();
      if(confirm('Supprimer ce procédé ?')) { onDelete(p.id); renderHomeCards(); }
    });
    menu.querySelectorAll('button.small')[3].addEventListener('click', ()=> menu.remove());
    setTimeout(()=> document.addEventListener('click', ()=> menu.remove(), { once: true }), 50);
  }

  // ------------------ List & Detail ------------------
  function renderList(){
    if(!listEl) return;
    const q = (searchEl.value||"").toLowerCase().trim();
    const ind = filterIndustry ? filterIndustry.value : "";
    const cat = filterCategory ? filterCategory.value : "";
    listEl.innerHTML = "";
    const filtered = data.filter(p=>{
      if(ind && p.industry !== ind) return false;
      if(cat && !(p.categories||[]).includes(cat)) return false;
      if(!q) return true;
      if((p.title||"").toLowerCase().includes(q)) return true;
      if((p.short_description||"").toLowerCase().includes(q)) return true;
      const stepsText = (p.steps||[]).map(s=> (s.title+" "+(s.description||"")) ).join(" ").toLowerCase();
      if(stepsText.includes(q)) return true;
      if((p.keywords||[]).some(k=>k.toLowerCase().includes(q))) return true;
      return false;
    });
    if(filtered.length===0){
      const li = document.createElement("li");
      li.textContent = "Aucun procédé trouvé.";
      listEl.appendChild(li);
      detailContent.innerHTML = "Sélectionne ou crée un procédé.";
      return;
    }
    filtered.sort((a,b)=> new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    filtered.forEach(p=>{
      const li = document.createElement("li");
      li.className = "process-item";
      li.onclick = ()=> showDetail(p.id);
      li.tabIndex = 0;
      li.onkeypress = (e)=> { if(e.key === "Enter") showDetail(p.id); };

      const meta = document.createElement("div");
      meta.className = "process-meta";
      meta.innerHTML = `<strong>${escapeHtml(p.title)}</strong>
        <div class="muted">${escapeHtml(p.short_description||"")}</div>
        <div class="tags">${(p.categories||[]).map(c=>`<span class="tag">${escapeHtml(c)}</span>`).join(" ")}</div>
        <div class="small-muted">v${p.version || 1} • ${p.status}</div>`;
      const actions = document.createElement("div");
      actions.className = "process-actions";

      const btnEdit = document.createElement("button");
      btnEdit.textContent = "✏️";
      btnEdit.title = "éditer";
      btnEdit.onclick = (ev)=>{ ev.stopPropagation(); openEditor(p.id); };

      const btnPub = document.createElement("button");
      btnPub.textContent = "📢";
      btnPub.title = "publier";
      btnPub.onclick = (ev)=>{ ev.stopPropagation(); publishProcess(p.id); };

      const btnDel = document.createElement("button");
      btnDel.textContent = "🗑️";
      btnDel.title = "supprimer";
      btnDel.onclick = (ev)=>{ ev.stopPropagation(); onDelete(p.id); renderList(); renderHomeCards(); };

      actions.appendChild(btnEdit);
      actions.appendChild(btnPub);
      actions.appendChild(btnDel);

      li.appendChild(meta);
      li.appendChild(actions);
      listEl.appendChild(li);
    });
  }
  function showDetail(id){
    const p = data.find(x=>x.id===id); if(!p) return;
    currentDetailId = id;
    detailContent.innerHTML = renderDetailHtml(p);
    requestAnimationFrame(()=> renderInfographic(p));
  }
  function renderDetailHtml(p){
    const stepsHtml = (p.steps||[]).sort((a,b)=>a.order-b.order).map(s=>`<li><strong>${escapeHtml(s.title)}</strong> — ${escapeHtml(s.duration||'')} — <em>${escapeHtml(s.equipment||'')}</em><br/>${escapeHtml(s.description||"")}</li>`).join("");
    
    const risksHtml = (p.risks||[]).map(r => `<li><strong>${escapeHtml(r.hazard)}:</strong> ${escapeHtml(r.mitigation)}</li>`).join("");
    const kpisHtml = (p.kpis||[]).map(k => `<li><strong>${escapeHtml(k.name)}:</strong> ${escapeHtml(k.target)} ${escapeHtml(k.unit||'')}</li>`).join("");
    
    return `<h3>${escapeHtml(p.title)}</h3>
      <div class="tags">${(p.categories||[]).map(c=>`<span class="tag">${escapeHtml(c)}</span>`).join(" ")}</div>
      <p>${escapeHtml(p.short_description||"")}</p>
      <div><strong>Industrie:</strong> ${escapeHtml(p.industry||"")}</div>
      <div><strong>Version:</strong> ${p.version || 1} • <strong>Status:</strong> ${escapeHtml(p.status||"")}</div>

      <div class="infographic" id="infographic_${escapeHtml(p.id)}">
        <div class="small-muted">Visualisation des étapes</div>
        <div class="timeline" role="list" aria-label="Timeline des étapes"></div>

        <div class="diagram-panel">
          <div class="diagram-canvas" id="diagramCanvas_${escapeHtml(p.id)}">
            <div class="small-muted">Cliquez sur une étape pour afficher le diagramme</div>
          </div>
          <div class="diagram-details" id="diagramDetails_${escapeHtml(p.id)}">
            <h4>Détails étape</h4>
            <p class="small-muted">Sélectionne une étape dans la timeline pour voir plus d'informations ici.</p>
          </div>
        </div>
      </div>

      <h4>Étapes (liste)</h4><ul>${stepsHtml || "<li>—</li>"}</ul>
      ${kpisHtml ? `<h4>KPIs</h4><ul>${kpisHtml}</ul>` : ''}
      ${risksHtml ? `<h4>Risques Principaux</h4><ul>${risksHtml}</ul>` : ''}

      <div style="margin-top:12px">
        <button onclick="window.__proto_openEdit && window.__proto_openEdit('${p.id}')">Éditer</button>
        <button onclick="window.__proto_publish && window.__proto_publish('${p.id}')">Publier</button>
      </div>`;
  }

  // ------------------ Icons & Detailed SVG library ------------------
  function getIconSvg(title){
    const t = (title||"").toLowerCase();
    if(t.includes("torref") || t.includes("torréfaction") || t.includes("torréfact")) return svgRoasterSmall();
    if(t.includes("broy") || t.includes("mouture") || t.includes("broyage")) return svgGrinderSmall();
    if(t.includes("press") || t.includes("presse") || t.includes("pressage")) return svgPressSmall();
    if(t.includes("conch") || t.includes("conchage")) return svgConcheSmall();
    if(t.includes("moul") || t.includes("moulage") || t.includes("enrob")) return svgMoldSmall();
    if(t.includes("séch") || t.includes("sech")) return svgDrySmall();
    if(t.includes("ferment") || t.includes("fermentation")) return svgFermentSmall();
    if(t.includes("écaboss") || t.includes("écabossage") || t.includes("ecaboss")) return svgPodSmall();
    if(t.includes("malax") || t.includes("malaxage")) return svgMixerSmall();
    if(t.includes("concass") || t.includes("concassage")) return svgCrushSmall();
    return svgGearSmall();
  }
  function svgRoasterSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="18" height="10" rx="2" stroke="white" stroke-opacity="0.95" fill="none"/><path d="M7 6v-2h10v2" stroke="white" stroke-opacity="0.95"/></svg>`; }
  function svgGrinderSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="9" r="3" stroke="white" stroke-opacity="0.95" fill="none"/><path d="M4 18h16" stroke="white" stroke-opacity="0.95"/></svg>`; }
  function svgPressSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="3" width="12" height="4" rx="1" stroke="white" stroke-opacity="0.95" fill="none"/><rect x="8" y="9" width="8" height="10" rx="1" stroke="white" stroke-opacity="0.95" fill="none"/></svg>`; }
  function svgConcheSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 12h18" stroke="white" stroke-opacity="0.95" fill="none"/><circle cx="12" cy="12" r="5" stroke="white" stroke-opacity="0.95" fill="none"/></svg>`; }
  function svgMoldSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="6" width="16" height="12" rx="2" stroke="white" stroke-opacity="0.95" fill="none"/></svg>`; }
  function svgDrySmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 12h16" stroke="white" stroke-opacity="0.95" fill="none"/></svg>`; }
  function svgFermentSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="6" width="14" height="10" rx="2" stroke="white" stroke-opacity="0.95" fill="none"/></svg>`; }
  function svgPodSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 3c3 3 6 6 6 9s-3 6-6 9c-3-3-6-6-6-9s3-6 6-9z" stroke="white" stroke-opacity="0.95" fill="none"/></svg>`; }
  function svgMixerSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h16" stroke="white" stroke-opacity="0.95" fill="none"/></svg>`; }
  function svgCrushSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 6l6 6" stroke="white" stroke-opacity="0.95" fill="none"/></svg>`; }
  function svgGearSmall(){ return `<svg class="step-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="white" stroke-opacity="0.95" fill="none"/></svg>`; }
  function detailedRoasterSVG(){
    return `
      <svg width="300" height="140" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Torréfacteur illustration">
        <defs>
          <linearGradient id="gR" x1="0" x2="1"><stop offset="0" stop-color="#f6c16a"/><stop offset="1" stop-color="#ff7a59"/></linearGradient>
        </defs>
        <rect x="8" y="8" width="284" height="124" rx="8" fill="rgba(255,255,255,0.02)"/>
        <g transform="translate(20,18)">
          <rect x="0" y="0" width="120" height="104" rx="8" fill="url(#gR)" opacity="0.12"/>
          <circle cx="60" cy="52" r="20" fill="#fff3e6" stroke="#ffb86b" />
          <rect x="140" y="12" width="120" height="80" rx="8" fill="#0b1220" stroke="#18324a" />
          <text x="148" y="34" fill="#e6eef8" font-size="12" font-weight="600">Torréfacteur</text>
          <text x="148" y="54" fill="#9aa4b2" font-size="11">Profil: 120–150°C</text>
        </g>
      </svg>`;
  }
  function detailedGrinderSVG(){
    return `
      <svg width="300" height="140" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Moulin illustration">
        <rect x="8" y="8" width="284" height="124" rx="8" fill="rgba(255,255,255,0.02)"/>
        <g transform="translate(18,18)">
          <rect x="0" y="8" width="120" height="88" rx="8" fill="#162533" stroke="#274b5a"/>
          <circle cx="60" cy="52" r="28" fill="#cfe9ff" stroke="#8bbfe8"/>
          <text x="140" y="34" fill="#e6eef8" font-size="12" font-weight="600">Moulin / Raffineur</text>
          <text x="140" y="54" fill="#9aa4b2" font-size="11">Granulométrie cible : &lt;25 µm</text>
        </g>
      </svg>`;
  }
  function detailedPressSVG(){
    return `
      <svg width="300" height="140" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Presse illustration">
        <rect x="8" y="8" width="284" height="124" rx="8" fill="rgba(255,255,255,0.02)"/>
        <g transform="translate(18,18)">
          <rect x="0" y="10" width="120" height="80" rx="6" fill="#2c2f36" stroke="#3f5566"/>
          <rect x="140" y="10" width="120" height="80" rx="6" fill="#122127" stroke="#234"/>
          <text x="142" y="36" fill="#e6eef8" font-size="12" font-weight="600">Presse hydraulique</text>
          <text x="142" y="56" fill="#9aa4b2" font-size="11">Contrôle pression et débit</text>
        </g>
      </svg>`;
  }
  function detailedConcheSVG(){
    return `
      <svg width="300" height="140" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Conche illustration">
        <rect x="8" y="8" width="284" height="124" rx="8" fill="rgba(255,255,255,0.02)"/>
        <g transform="translate(18,18)">
          <rect x="0" y="6" width="120" height="92" rx="8" fill="#1b2b30" stroke="#2e4a52"/>
          <circle cx="60" cy="52" r="28" fill="#f0f7ff" stroke="#c0e0ff"/>
          <text x="140" y="36" fill="#e6eef8" font-size="12" font-weight="600">Conche</text>
          <text x="140" y="56" fill="#9aa4b2" font-size="11">Affinage long (h)</text>
        </g>
      </svg>`;
  }
  function detailedMoldSVG(){
    return `
      <svg width="300" height="140" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Moulage illustration">
        <rect x="8" y="8" width="284" height="124" rx="8" fill="rgba(255,255,255,0.02)"/>
        <g transform="translate(18,18)">
          <rect x="0" y="6" width="120" height="92" rx="8" fill="#15222a" stroke="#2b474f"/>
          <rect x="140" y="6" width="120" height="92" rx="8" fill="#0e1a20" stroke="#21333b"/>
          <text x="142" y="36" fill="#e6eef8" font-size="12" font-weight="600">Moulage & Refroidissement</text>
          <text x="142" y="56" fill="#9aa4b2" font-size="11">Tunnel de refroidissement</text>
        </g>
      </svg>`;
  }
  function detailedDrySVG(){ return detailedRoasterSVG(); }
  function detailedFermentSVG(){ return detailedConcheSVG(); }
  function detailedPodSVG(){ return detailedMoldSVG(); }
  function detailedMixerSVG(){ return detailedGrinderSVG(); }
  function detailedCrushSVG(){ return detailedPressSVG(); }
  function detailedGearSVG(){ return detailedRoasterSVG(); }
  function stepDetailedSvgForTitle(title){
    const t = (title||"").toLowerCase();
    if(t.includes("torr") || t.includes("torref")) return detailedRoasterSVG();
    if(t.includes("broy") || t.includes("mouture")) return detailedGrinderSVG();
    if(t.includes("press")) return detailedPressSVG();
    if(t.includes("conch")) return detailedConcheSVG();
    if(t.includes("moul") || t.includes("enrob")) return detailedMoldSVG();
    if(t.includes("séch") || t.includes("sech")) return detailedDrySVG();
    if(t.includes("ferment")) return detailedFermentSVG();
    if(t.includes("écaboss") || t.includes("ecaboss")) return detailedPodSVG();
    if(t.includes("malax")) return detailedMixerSVG();
    if(t.includes("concass")) return detailedCrushSVG();
    return detailedGearSVG();
  }

  // ------------------ Connectors & infographic render (CORRIGÉ) ------------------
  
  // (CORRIGÉ: Accepte processId pour garantir un ID de flèche unique)
  function createArrowConnector(idx, processId){ // <-- Recevoir p.id
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "64");
    svg.setAttribute("height", "48");
    svg.setAttribute("viewBox", "0 0 64 48");
    svg.classList.add("connector-svg");

    // ID unique pour le marker (flèche)
    const uniqueMarkerId = `arrowhead_${processId}_${idx}`; 

    const defs = document.createElementNS(svgNS, "defs");
    const marker = document.createElementNS(svgNS, "marker");
    
    marker.setAttribute("id", uniqueMarkerId); // <-- Appliquer ID unique
    
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "8"); 
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "6");
    marker.setAttribute("markerHeight", "6");
    marker.setAttribute("orient", "auto-start-reverse");
    
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z"); 
    path.setAttribute("fill", "currentColor"); 
    
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1","4"); 
    line.setAttribute("y1","24"); 
    line.setAttribute("x2","60"); 
    line.setAttribute("y2","24");
    line.setAttribute("stroke","currentColor"); 
    line.setAttribute("stroke-width","3");
    
    line.setAttribute("marker-end", `url(#${uniqueMarkerId})`); // <-- Référencer ID unique

    svg.appendChild(line);
    const wrapper = document.createElement("div");
    wrapper.className = "timeline-connector";
    wrapper.appendChild(svg);
    return { wrapper, svg, line };
  }

  // (CORRIGÉ: Doit passer p.id à createArrowConnector)
  function renderInfographic(p){
    const container = document.querySelector(`#infographic_${CSS.escape(p.id)}`);
    if(!container) return;
    const timelineEl = container.querySelector(".timeline");
    const diagramCanvas = document.getElementById(`diagramCanvas_${p.id}`);
    const diagramDetails = document.getElementById(`diagramDetails_${p.id}`);
    timelineEl.innerHTML = "";
    if(diagramCanvas) diagramCanvas.innerHTML = `<div class="small-muted">Cliquez sur une étape pour afficher le diagramme</div>`;
    if(diagramDetails) diagramDetails.innerHTML = `<h4>Détails étape</h4><p class="small-muted">Sélectionne une étape dans la timeline pour voir plus d'informations ici.</p>`;

    const steps = (p.steps || []).slice().sort((a,b)=>a.order-b.order);
    if(steps.length === 0){ timelineEl.innerHTML = `<div class="small-muted">Aucune étape définie</div>`; return; }

    steps.forEach((s, idx) => {
      const step = document.createElement("div");
      step.className = "timeline-step";
      const delayMs = idx * 80;
      step.style.setProperty('--delay', `${delayMs}ms`); 

      const circle = document.createElement("div");
      circle.className = "step-circle";
      circle.textContent = String(idx+1);
      circle.style.setProperty('--delay', `${delayMs}ms`);
      const iconWrapper = document.createElement("div");
      iconWrapper.innerHTML = getIconSvg(s.title || "");
      circle.appendChild(iconWrapper.firstChild);

      const card = document.createElement("div");
      card.className = "step-card";
      const durationHtml = s.duration ? `<div class="meta-row"><strong>Durée:</strong>&nbsp;<span>${escapeHtml(s.duration)}</span></div>` : "";
      const equipHtml = s.equipment ? `<div class="meta-row"><strong>Équipements:</strong>&nbsp;<span>${escapeHtml(s.equipment)}</span></div>` : "";
      card.innerHTML = `<div class="step-title">${escapeHtml(s.title || ("Étape " + (idx+1)))}</div>
                        <div class="step-desc">${escapeHtml((s.description||"").slice(0,220))}</div>
                        <div class="step-meta">${durationHtml}${equipHtml}</div>`;
      card.style.setProperty('--delay', `${delayMs}ms`);

      circle.addEventListener('click', (ev)=> { ev.stopPropagation(); showStepPopover(p, idx, circle); showStepDiagram(p, idx); });
      card.addEventListener('click', (ev)=> { ev.stopPropagation(); showStepPopover(p, idx, card); showStepDiagram(p, idx); });

      step.appendChild(circle);
      step.appendChild(card);
      timelineEl.appendChild(step);

      if(idx < steps.length - 1){
        const { wrapper } = createArrowConnector(idx, p.id); // <-- p.id est maintenant passé
        wrapper.style.setProperty('--delay', `${delayMs + 40}ms`); 
        timelineEl.appendChild(wrapper);
      }
    });

    requestAnimationFrame(()=> {
      timelineEl.querySelectorAll('.timeline-step').forEach((el)=> el.classList.add('animated'));
      timelineEl.querySelectorAll('.timeline-connector').forEach((c)=> c.classList.add('animated'));
    });
  }

  // ------------------ Popover ------------------
  function showStepPopover(p, stepIndex, anchorEl){
    const existing = document.querySelector('.step-popover'); if(existing) existing.remove();
    const step = (p.steps||[]).slice().sort((a,b)=>a.order-b.order)[stepIndex]; if(!step) return;
    const pop = document.createElement('div'); pop.className = 'step-popover';
    pop.innerHTML = `<h4>${escapeHtml(step.title)}</h4><p>${escapeHtml(step.description||"")}</p>
      <div class="meta"><div><strong>Durée:</strong> ${escapeHtml(step.duration||'—')}</div><div><strong>Équipements:</strong> ${escapeHtml(step.equipment||'—')}</div></div>
      <div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end"><button class="edit-step">Éditer</button><button class="close-pop">Fermer</button></div>`;
    document.body.appendChild(pop);
    const rect = anchorEl.getBoundingClientRect(); const popRect = pop.getBoundingClientRect();
    let top = window.scrollY + rect.top - popRect.height - 10;
    let left = window.scrollX + rect.left + rect.width/2 - popRect.width/2;
    if(top < window.scrollY + 10) top = window.scrollY + rect.bottom + 10;
    left = Math.max(window.scrollX + 8, Math.min(left, window.scrollX + document.documentElement.clientWidth - popRect.width - 8));
    pop.style.top = `${top}px`; pop.style.left = `${left}px`;
    pop.querySelector('.close-pop').addEventListener('click', ()=> pop.remove());
    pop.querySelector('.edit-step').addEventListener('click', ()=> { pop.remove(); openEditor(p.id, stepIndex); });
    return pop;
  }

  // ------------------ Diagram display ------------------
  function showStepDiagram(p, stepIndex){
    const step = (p.steps||[]).slice().sort((a,b)=>a.order-b.order)[stepIndex];
    if(!step) return;
    const canvas = document.getElementById(`diagramCanvas_${p.id}`);
    const details = document.getElementById(`diagramDetails_${p.id}`);
    if(!canvas || !details) return;

    const detailedSvg = stepDetailedSvgForTitle(step.title || "");
    canvas.innerHTML = detailedSvg;

    const paramsHtml = (step.parameters||[]).map(p=> `<div><strong>${escapeHtml(p.name)}</strong>: ${escapeHtml(p.target||'')} ${escapeHtml(p.unit||'')
}</div>`).join("");
    const sopHtml = (step.sop_checklist||[]).map(i=> `<li>${escapeHtml(i)}</li>`).join("");
    const equipSpecsHtml = (step.equipment_specs) ? Object.entries(step.equipment_specs).map(([k,v])=>`<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`).join("") : "";
    
    details.innerHTML = `<h4>${escapeHtml(step.title)}</h4>
      <p>${escapeHtml(step.description||'')}</p>
      <div class="meta"><div><strong>Durée:</strong> ${escapeHtml(step.duration||'—')}</div><div><strong>Équipements:</strong> ${escapeHtml(step.equipment||'—')}</div></div>
      ${paramsHtml ? `<div style="margin-top:8px"><strong>Paramètres:</strong>${paramsHtml}</div>` : ''}
      ${sopHtml ? `<div style="margin-top:8px"><strong>SOP (checklist):</strong><ul>${sopHtml}</ul></div>` : ''}
      ${equipSpecsHtml ? `<div style="margin-top:8px"><strong>Specs Équipement:</strong><ul>${equipSpecsHtml}</ul></div>` : ''}
    `;
  }

  // ------------------ Editor / CRUD ------------------
  
  function openEditor(id, focusStepIndex){
    modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
    modalTitle.textContent = id ? "Éditer procédé" : "Nouveau procédé";
    clearRepeater(stepsContainer);
    
    procId.value=""; titleEl.value=""; shortDescriptionEl.value=""; industryEl.value=""; 
    categoriesEl.value=""; keywordsEl.value=""; statusEl.value="draft"; versionEl.value=1;
    qualityControlsEl.value = ""; kpisEl.value = ""; risksEl.value = "";

    if(!id){
      addStepRow(); 
      return;
    }
    
    const p = data.find(x=>x.id===id); if(!p) return;
    procId.value=p.id; titleEl.value=p.title||""; shortDescriptionEl.value=p.short_description||""; industryEl.value=p.industry||"";
    categoriesEl.value=(p.categories||[]).join(","); keywordsEl.value=(p.keywords||[]).join(","); 
    statusEl.value=p.status||"draft"; versionEl.value=p.version||1;

    qualityControlsEl.value = safeJsonStringify(p.quality_controls);
    kpisEl.value = safeJsonStringify(p.kpis);
    risksEl.value = safeJsonStringify(p.risks);

    (p.steps||[]).sort((a,b)=>a.order-b.order).forEach(s=> addStepRow(s));
    
    if(typeof focusStepIndex === 'number'){ setTimeout(()=>{ const rows = Array.from(stepsContainer.querySelectorAll('.step-row')); rows.forEach(r=> r.classList.remove('highlight')); const target = rows[focusStepIndex]; if(target){ target.classList.add('highlight'); target.scrollIntoView({behavior:'smooth', block:'center'}); setTimeout(()=> target.classList.remove('highlight'), 3000); } }, 220); }
  }

  function closeEditor(){ modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); }

  function onSave(e){ 
    e.preventDefault();
    const id = procId.value || genId(); 
    const existing = data.find(d=>d.id===id);
    
    let steps;
    try {
      steps = collectSteps(); 
    } catch (err) {
      alert(`Erreur de format JSON dans une étape: ${err.message}`);
      return; 
    }
    
    const obj = {
      id, 
      title: titleEl.value.trim(), 
      short_description: shortDescriptionEl.value.trim(), 
      industry: industryEl.value.trim(),
      categories: categoriesEl.value.split(",").map(s=>s.trim()).filter(Boolean),
      keywords: keywordsEl.value.split(",").map(s=>s.trim()).filter(Boolean),
      status: statusEl.value, 
      version: Number(versionEl.value) || (existing ? existing.version : 1),
      updated_at: new Date().toISOString(), 
      created_at: existing ? existing.created_at : new Date().toISOString(), 
      author: existing ? existing.author : "local_user",
      
      quality_controls: safeJsonParse(qualityControlsEl.value, []),
      kpis: safeJsonParse(kpisEl.value, []),
      risks: safeJsonParse(risksEl.value, []),
      
      steps: steps,

      ...(existing?.attachments && { attachments: existing.attachments }),
      ...(existing?.references && { references: existing.references }),
      ...(existing?.estimated_yield && { estimated_yield: existing.estimated_yield })
    };
    
    if(existing) Object.assign(existing, obj); else data.push(obj);
    saveData(); 
    renderFilters(); 
    renderList(); 
    renderHomeCards(); 
    closeEditor(); 
    showDetail(id); 
  }

  function onDelete(id){ if(!confirm("Supprimer ce procédé ? (action irréversible)")) return; data = data.filter(d=>d.id!==id); saveData(); renderFilters(); renderList(); renderHomeCards(); detailContent.innerHTML = "Procédé supprimé."; currentDetailId=null; }
  function publishProcess(id){ const p=data.find(d=>d.id===id); if(!p) return; if(!confirm("Publier : incrémenter version ?")) return; p.version=(p.version||1)+1; p.status="published"; p.updated_at=new Date().toISOString(); saveData(); renderList(); renderHomeCards(); showDetail(id); alert("Publié (version "+p.version+")"); }
  function onPublish(e){ e.preventDefault(); const id=procId.value; if(!id) return alert("Enregistrer d'abord"); publishProcess(id); closeEditor(); }

  function onExport(){ const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="processes_export.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

  function onImport(e){ const f=e.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=(evt)=>{ try{ const imported=JSON.parse(evt.target.result); 
      const dataToImport = Array.isArray(imported) ? imported : [imported]; 
      dataToImport.forEach(item=>{ 
        if(!item.id || data.some(d=>d.id===item.id)) item.id=genId(); 
        item.steps = item.steps || []; 
        item.categories = item.categories || []; 
        item.keywords = item.keywords || []; 
        item.created_at = item.created_at || new Date().toISOString(); 
        item.updated_at = new Date().toISOString(); 
        data.push(item); 
      }); 
      saveData(); renderFilters(); renderList(); renderHomeCards(); alert("Import terminé: "+dataToImport.length+" éléments ajoutés"); }catch(err){ alert("Erreur import: "+err.message); } }; reader.readText(f); importFile.value=""; 
  }

  // ------------------ Steps editor ------------------
  function addStepRow(step) {
    const s = step || { 
      order: 1, title: "", description: "", duration: "", equipment: "",
      parameters: [], sop_checklist: [], equipment_specs: {} 
    };

    const row = document.createElement("div");
    row.className = "step-row";
    
    const paramsStr = safeJsonStringify(s.parameters);
    const sopStr = safeJsonStringify(s.sop_checklist);
    const specsStr = (s.equipment_specs && typeof s.equipment_specs === 'object' && Object.keys(s.equipment_specs).length > 0) 
                   ? safeJsonStringify(s.equipment_specs) 
                   : ""; 

    row.innerHTML = `
      <div class="fields">
        <input type="text" placeholder="Titre de l'étape" class="step-title" value="${escapeHtml(s.title || "")}">
        <textarea rows="2" placeholder="Description" class="step-description">${escapeHtml(s.description || "")}</textarea>
        
        <div class="row-two">
          <input type="text" placeholder="Durée (ex: 30 min)" class="step-duration" value="${escapeHtml(s.duration || "")}">
          <input type="text" placeholder="Équipements (ex: torréfacteur)" class="step-equipment" value="${escapeHtml(s.equipment || "")}">
        </div>
        
        <div class="step-json-fields">
          <label>Paramètres (JSON)
            <textarea rows="3" class="step-parameters" placeholder="[ { &quot;name&quot;: &quot;...&quot; } ]">${escapeHtml(paramsStr)}</textarea>
          </label>
          <label>SOP Checklist (JSON)
            <textarea rows="3" class="step-sop" placeholder="[ &quot;Vérifier ceci&quot;, &quot;...&quot; ]">${escapeHtml(sopStr)}</textarea>
          </label>
        </div>
        
        <label>Specs Équipement (JSON)
          <textarea rows="3" class="step-specs" placeholder="{ &quot;capacité&quot;: &quot;5 t/h&quot; }">${escapeHtml(specsStr)}</textarea>
        </label>
      </div>
      
      <div class="step-actions">
        <button type="button" class="move-up" title="Monter">↑</button>
        <button type="button" class="move-down" title="Descendre">↓</button>
        <button type="button" class="delete-row" title="Supprimer">Suppr</button>
      </div>
    `;

    row.querySelector('.move-up').onclick = () => moveRow(row, -1, stepsContainer);
    row.querySelector('.move-down').onclick = () => moveRow(row, 1, stepsContainer);
    row.querySelector('.delete-row').onclick = () => row.remove();

    stepsContainer.appendChild(row);
  }

  function collectSteps() { 
    const rows = Array.from(stepsContainer.children); 
    return rows.map((r, i) => {
      const title = r.querySelector(".step-title").value.trim();
      const description = r.querySelector(".step-description").value.trim();
      const duration = r.querySelector(".step-duration").value.trim();
      const equipment = r.querySelector(".step-equipment").value.trim();
      
      const parameters = safeJsonParse(r.querySelector(".step-parameters").value, []);
      const sop_checklist = safeJsonParse(r.querySelector(".step-sop").value, []);
      const equipment_specs = safeJsonParse(r.querySelector(".step-specs").value, {});

      return { 
        order: i + 1, 
        title, 
        description, 
        duration, 
        equipment,
        parameters,
        sop_checklist,
        equipment_specs
      };
    }).filter(s => s.title || s.description); 
  }

  function clearRepeater(container){ container.innerHTML = ""; }
  function moveRow(row, dir, container){ const sibling = (dir<0) ? row.previousElementSibling : row.nextElementSibling; if(!sibling) return; if(dir<0) container.insertBefore(row, sibling); else container.insertBefore(sibling, row); }

  // ------------------ PDF export ------------------
  async function onExportPdfCurrent(){
    if(!currentDetailId) return alert("Sélectionne d'abord une fiche à exporter.");
    const p = data.find(d=>d.id===currentDetailId); if(!p) return alert("Fiche introuvable.");
    const container = document.querySelector(`#infographic_${CSS.escape(p.id)}`); if(!container) return alert("Infographie introuvable.");
    try {
      const clone = container.cloneNode(true); clone.style.width = getComputedStyle(container).width;
      const wrapper = document.createElement('div'); wrapper.style.position = 'fixed'; wrapper.style.left = '-9999px'; wrapper.style.top = '0'; wrapper.appendChild(clone); document.body.appendChild(wrapper);
      const canvas = await html2canvas(clone, { scale: 2, backgroundColor: null, useCORS: true });
      document.body.removeChild(wrapper);
      const imgData = canvas.toDataURL('image/png'); const { jsPDF } = window.jspdf; const pdf = new jsPDF('landscape', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); const imgWidth = pageWidth - 40; const imgHeight = (canvas.height * imgWidth) / canvas.width; const x = 20; const y = 40;
      pdf.setFontSize(14); pdf.text(p.title, x, 28); pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      const filename = (p.title || 'fiche') + '.pdf'; pdf.save(filename);
    } catch(err){ console.error("PDF export error", err); alert("Erreur lors de la génération du PDF : " + err.message); }
  }

  // ------------------ Utilities ------------------
  function genId(){ return 'p_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }

  // expose helpers
  window.__proto_openEdit = openEditor;
  window.__proto_publish = publishProcess;

  // --- Initialisation de l'application ---
  data = await loadData(); 
  
  showHome();
  attachEvents();
  renderFilters();
  
  if (data.length > 0 && appPanel.classList.contains('hidden') === false) {
    showDetail(data[0].id);
  }

})();