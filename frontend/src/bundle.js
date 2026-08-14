(()=>{var ga=Object.defineProperty;var Mt=e=>t=>{var a=e[t];if(a)return a();throw new Error("Module not found in bundle: "+t)};var Z=(e,t)=>()=>(e&&(t=e(e=0)),t);var be=(e,t)=>{for(var a in t)ga(e,a,{get:t[a],enumerable:!0})};function it(){return localStorage.getItem(ot)}function _e(e){e?localStorage.setItem(ot,e):localStorage.removeItem(ot)}function ba(){return window.API_BASE||""}async function Ge(e,t,a){let s={"Content-Type":"application/json"},r=it();r&&(s.Authorization=`Bearer ${r}`);let n;try{n=await fetch(`${ba()}${t}`,{method:e,headers:s,body:a===void 0?void 0:JSON.stringify(a)})}catch{throw new Error("Cannot reach the API server. Is the backend running?")}let i=null;try{i=await n.json()}catch{}if(!n.ok){let l=i?.error?.message||`Request failed (${n.status})`,E=new Error(l);throw E.status=n.status,E.code=i?.error?.code,E.details=i?.error?.details||[],n.status===401&&!t.startsWith("/api/auth/")&&(_e(null),location.hash!=="#/login"&&(location.hash="#/login")),E}return i?.data}var ot,w,ie=Z(()=>{ot="pm_token";w={get:e=>Ge("GET",e),post:(e,t)=>Ge("POST",e,t),put:(e,t)=>Ge("PUT",e,t),del:e=>Ge("DELETE",e)}});function At(){let t=(location.hash||"#/dashboard").replace(/^#\/?/,"").split("/").filter(Boolean);if(t.length===0)return{name:"dashboard",page:"DashboardPage",params:{}};if(t[0]==="login")return{name:"login",page:"LoginPage",params:{}};let a=t.join("/");return a==="projects"||a==="projects/"?{name:"projects",page:"ProjectsPage",params:{}}:t[0]==="projects"&&t.length===2?{name:"projectDetail",page:"ProjectDetailPage",params:{id:t[1]}}:t[0]==="gantt"?{name:"gantt",page:"GanttPage",params:{}}:t[0]==="stakeholders"?{name:"stakeholders",page:"StakeholdersPage",params:{}}:t[0]==="priorities"?{name:"priorities",page:"PrioritiesPage",params:{}}:t[0]==="risks"?{name:"risks",page:"RisksPage",params:{}}:{name:"dashboard",page:"DashboardPage",params:{}}}function Ve(e){location.hash=`#/${e}`}var Ye=Z(()=>{});function d(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function le(e){return e?new Date(e).toISOString().slice(0,10):""}function lt(e){if(!e)return!1;let t=new Date(`${e}T00:00:00Z`);if(Number.isNaN(t.getTime()))return!1;let a=t.getUTCDay();return a===0||a===6}function V(e){if(!e)return"\u2014";let t=new Date(e);return Number.isNaN(t.getTime())?"\u2014":t.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric",timeZone:"UTC"})}var qt,Te,Xe,Rt,ye,Ce,Q=Z(()=>{qt=["PLANNED","IN_PROGRESS","ON_HOLD","COMPLETED","CANCELLED"],Te=["TODO","IN_PROGRESS","BLOCKED","COMPLETED","CANCELLED"],Xe=["OPEN","MITIGATED","CLOSED","ACCEPTED"],Rt=["RESPONSIBLE","ACCOUNTABLE","CONSULTED","INFORMED"],ye={PLANNED:"#6366f1",IN_PROGRESS:"#2563eb",ON_HOLD:"#d97706",COMPLETED:"#16a34a",CANCELLED:"#64748b",TODO:"#64748b",BLOCKED:"#dc2626",OPEN:"#dc2626",MITIGATED:"#2563eb",CLOSED:"#16a34a",ACCEPTED:"#64748b"},Ce={LOW:"#16a34a",MEDIUM:"#eab308",HIGH:"#f97316",CRITICAL:"#dc2626"}});var Qe={};be(Qe,{confirmDialog:()=>se,loadingHtml:()=>de,openModal:()=>Je,priorityChip:()=>Ze,progressBar:()=>ve,riskLevelBadge:()=>Ue,statusBadge:()=>ee,toast:()=>D});function ee(e){let t=ye[e]||"#64748b",a=String(e||"\u2014").replace(/_/g," ");return`<span class="badge" style="background:${t}1a;color:${t}">
    <span class="badge-dot"></span>${d(a)}</span>`}function Ze(e){if(!e)return'<span class="text-muted">\u2014</span>';let t=e.color||"#64748b";return`<span class="priority-chip" style="background:${d(t)}">${d(e.name)}</span>`}function Ue(e){let a={LOW:"#16a34a",MEDIUM:"#ca8a04",HIGH:"#ea580c",CRITICAL:"#dc2626"}[e]||"#64748b";return`<span class="badge" style="background:${a}1a;color:${a}">${d(e||"\u2014")}</span>`}function ve(e,{showLabel:t=!0,color:a}={}){let s=Math.max(0,Math.min(100,Number(e)||0)),r=a||(s>=100?"#16a34a":s>0?"#4f46e5":"#94a3b8");return`<div class="progress-cell"><div class="progress-track">
      <div class="progress-fill" style="width:${s}%;background:${r}"></div>
    </div>${t?`<span class="pct">${s}%</span>`:""}</div>`}function D(e,t="success",a=3500){let s=document.getElementById("toast-root"),r=document.createElement("div");r.className=`toast toast-${t}`,r.textContent=e,s.appendChild(r),setTimeout(()=>{r.style.opacity="0",r.style.transition="opacity 0.3s",setTimeout(()=>r.remove(),300)},a)}function Je({title:e,body:t="",footer:a="",wide:s=!1,onClose:r}={}){let n=document.createElement("div");n.className="modal-overlay",n.innerHTML=`
    <div class="modal ${s?"modal-wide":""}">
      <div class="modal-header">
        <h3>${d(e)}</h3>
        <button class="modal-close" aria-label="Close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="modal-body"></div>
      ${a?`<div class="modal-footer">${a}</div>`:""}
    </div>`;let i=n.querySelector(".modal-body");i.innerHTML=t;let l=()=>{n.remove(),r?.()};return n.querySelector(".modal-close").addEventListener("click",l),n.addEventListener("click",E=>{E.target===n&&l()}),document.addEventListener("keydown",function E(C){C.key==="Escape"&&(l(),document.removeEventListener("keydown",E))}),document.body.appendChild(n),{close:l,body:i,overlay:n}}function se(e,{title:t="Are you sure?",confirmText:a="Delete",danger:s=!0}={}){return new Promise(r=>{let n=Je({title:t,body:`<p style="font-size:14px">${d(e)}</p>`,footer:`
        <button class="btn btn-secondary" data-act="cancel">Cancel</button>
        <button class="btn ${s?"btn-danger":"btn-primary"}" data-act="confirm">${d(a)}</button>`,onClose:()=>r(!1)});n.overlay.querySelector('[data-act="cancel"]').addEventListener("click",()=>{n.close(),r(!1)}),n.overlay.querySelector('[data-act="confirm"]').addEventListener("click",()=>{r(!0),n.close()})})}function de(){return'<div class="page-loading">Loading\u2026</div>'}var ae=Z(()=>{Q()});function dt(e,t){let a=t.reduce((c,u)=>c+(u.value||0),0);if(a===0){e.innerHTML='<div class="empty-state">No data</div>';return}let s=150,r=26,n=(s-r)/2,i=2*Math.PI*n,l=0,E=t.filter(c=>c.value>0).map(c=>{let u=c.value/a*i,x=`<circle cx="${s/2}" cy="${s/2}" r="${n}" fill="none"
        stroke="${c.color||"#94a3b8"}" stroke-width="${r}"
        stroke-dasharray="${u} ${i-u}" stroke-dashoffset="${-l}"
        transform="rotate(-90 ${s/2} ${s/2})" />`;return l+=u,x}).join(""),C=t.map(c=>`<span class="legend-item">
        <span class="legend-swatch" style="background:${c.color||"#94a3b8"}"></span>
        ${d(c.label)} (${c.value})</span>`).join("");e.innerHTML=`
    <div class="chart-box">
      <svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="align-self:center">
        ${E}
        <text x="50%" y="47%" text-anchor="middle" font-size="22" font-weight="700" style="fill:var(--text)">${a}</text>
        <text x="50%" y="58%" text-anchor="middle" font-size="10" style="fill:var(--text-muted)">total</text>
      </svg>
      <div class="chart-legend">${C}</div>
    </div>`}function Pe(e,t,{valueSuffix:a=""}={}){if(!t||t.length===0){e.innerHTML='<div class="empty-state">No data</div>';return}let s=Math.max(...t.map(n=>n.value||0),1),r=t.map(n=>{let i=Math.round((n.value||0)/s*100);return`<div class="bar-row">
        <div class="bar-label" title="${d(n.label)}">${d(n.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${i}%;background:${n.color||"#4f46e5"}"></div></div>
        <div class="bar-value">${n.value}${d(a)}</div>
      </div>`}).join("");e.innerHTML=`<div class="bar-chart">${r}</div>`}var et=Z(()=>{Q()});function ha(e){return va.find(t=>e>=t.min)?.level||"LOW"}function je(e,t=[]){let a=new Map(t.map(l=>[`${l.probability},${l.impact}`,l.count])),s={1:"Very Low",2:"Low",3:"Medium",4:"High",5:"Very High"},r="";for(let l=5;l>=1;l-=1){r+=`<div class="matrix-label" title="Impact: ${s[l]}">I${l}</div>`;for(let E=1;E<=5;E+=1){let C=E*l,c=ha(C),u=a.get(`${E},${l}`)||0,x=`P${E} (${s[E]}) \xD7 I${l} (${s[l]}) = score ${C}`;r+=`<div class="matrix-cell level-${c}" title="${x}">
        ${u>0?u:""}
        <span class="cell-score">${C}</span>
      </div>`}}let n='<div class="matrix-corner">P \u2193</div>'+[1,2,3,4,5].map(l=>`<div class="matrix-label" title="Probability: ${s[l]}">P${l}</div>`).join(""),i=Object.entries(Ce).map(([l,E])=>`<span class="legend-item"><span class="legend-swatch" style="background:${E}"></span> ${l}</span>`).join("");e.innerHTML=`
    <div>
      <div class="risk-matrix">${n}${r}</div>
      <div class="risk-matrix" style="grid-template-columns:36px repeat(5,minmax(52px,1fr));margin-top:2px">
        <span></span>
        <span class="matrix-label" style="font-size:10.5px">Very Low</span>
        <span class="matrix-label" style="font-size:10.5px">Low</span>
        <span class="matrix-label" style="font-size:10.5px">Medium</span>
        <span class="matrix-label" style="font-size:10.5px">High</span>
        <span class="matrix-label" style="font-size:10.5px">Very High</span>
      </div>
      <div style="margin-top:4px;font-size:11.5px;color:var(--text-muted)">\u2190 Probability \u2192 &nbsp;\xB7&nbsp; numbers = open risks</div>
      <div class="risk-matrix-legend" style="display:flex;gap:14px;margin-top:8px;font-size:12px;flex-wrap:wrap">${i}</div>
    </div>`}var va,tt=Z(()=>{Q();va=[{min:16,level:"CRITICAL"},{min:8,level:"HIGH"},{min:4,level:"MEDIUM"},{min:1,level:"LOW"}]});var Nt={};be(Nt,{default:()=>fa});var fa,Ot=Z(()=>{ie();Q();ae();et();tt();Ye();fa={async mount(e){e.innerHTML=de();let[t,a,s,r]=await Promise.all([w.get("/api/dashboard/summary"),w.get("/api/dashboard/projects"),w.get("/api/dashboard/tasks"),w.get("/api/dashboard/risks")]),i=[{label:"Total Projects",value:t.totalProjects,icon:"bi-folder",cls:""},{label:"Active Projects",value:t.activeProjects,icon:"bi-rocket",cls:"primary"},{label:"Completed Projects",value:t.completedProjects,icon:"bi-check-circle",cls:"success"},{label:"Delayed Projects",value:t.delayedProjects,icon:"bi-clock",cls:t.delayedProjects>0?"danger":"success"},{label:"Total Tasks",value:t.totalTasks,icon:"bi-puzzle",cls:""},{label:"Completed Tasks",value:t.completedTasks,icon:"bi-check2-circle",cls:"success"},{label:"Overdue Tasks",value:t.overdueTasks,icon:"bi-exclamation-triangle",cls:t.overdueTasks>0?"danger":"success"},{label:"Open Risks",value:t.openRisks,icon:"bi-shield",cls:t.openRisks>0?"warning":"success"}].map(L=>`<div class="card stat-card ${L.cls}">
          <span class="stat-icon"><i class="bi ${L.icon}"></i></span>
          <div class="stat-label">${L.label}</div>
          <div class="stat-value">${L.value}</div>
        </div>`).join(""),l=a.map(L=>`<tr class="${L.delayed?"overdue-row":""}" data-id="${L.id}">
        <td><strong>${d(L.projectCode)}</strong></td>
        <td>${d(L.name)}</td>
        <td>${ve(L.progressPercentage,{showLabel:!0})}</td>
        <td>${ee(L.status)}</td>
        <td>${V(L.plannedEndDate)}</td>
        <td>${V(L.actualEndDate)}</td>
        <td>${L.delayed?'<span class="badge" style="background:#dc26261a;color:#dc2626">Delayed</span>':"\u2014"}</td>
      </tr>`).join(""),E={TODO:"#94a3b8",IN_PROGRESS:"#2563eb",BLOCKED:"#dc2626",COMPLETED:"#16a34a",CANCELLED:"#64748b"},C=s.byStatus.map(L=>({label:L.status,value:L.count,color:E[L.status]||"#94a3b8"})),c=s.byPriority.map(L=>({label:L.name,value:L.count,color:L.color||"#4f46e5"})),u=s.byProject.map(L=>({label:L.name,value:L.count,color:"#4f46e5"})),x=r.byStatus.map(L=>({label:L.status,value:L.count,color:ye[L.status]||"#64748b"}));e.innerHTML=`
      <div class="page-title">Dashboard</div>
      <div class="page-subtitle">Overview of projects, tasks and risks</div>

      ${t.delayedProjects>0||t.overdueTasks>0?`<div class="delayed-banner"><i class="bi bi-exclamation-triangle"></i> <strong>Attention:</strong> ${t.delayedProjects} delayed project(s) and ${t.overdueTasks} overdue task(s) need review.</div>`:""}

      <div class="stat-grid">${i}</div>

      <div class="card" style="margin-bottom:24px">
        <div class="card-header"><h2>Project Progress</h2></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Code</th><th>Project</th><th>Progress</th><th>Status</th>
              <th>Planned End</th><th>Actual End</th><th>Delay</th>
            </tr></thead>
            <tbody>${l||'<tr class="empty-row"><td colspan="7">No projects yet</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <div class="grid-2">
        <div class="card"><div class="card-header"><h2>Tasks by Status</h2></div>
          <div class="card-body"><div id="chartTasksStatus"></div></div></div>
        <div class="card"><div class="card-header"><h2>Tasks by Priority</h2></div>
          <div class="card-body"><div id="chartTasksPriority"></div></div></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><h2>Tasks by Project</h2></div>
          <div class="card-body"><div id="chartTasksProject"></div></div></div>
        <div class="card"><div class="card-header"><h2>Risk Distribution</h2></div>
          <div class="card-body"><div id="chartRiskStatus"></div></div></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><h2>Open Risk Matrix</h2></div>
          <div class="card-body"><div id="riskMatrix"></div></div></div>
        <div class="card"><div class="card-header"><h2>Risk Levels</h2></div>
          <div class="card-body"><div id="chartRiskLevels"></div></div></div>
      </div>
    `,dt(e.querySelector("#chartTasksStatus"),C),Pe(e.querySelector("#chartTasksPriority"),c),Pe(e.querySelector("#chartTasksProject"),u),dt(e.querySelector("#chartRiskStatus"),x),je(e.querySelector("#riskMatrix"),r.matrix),Pe(e.querySelector("#chartRiskLevels"),r.byLevel.map(L=>({label:L.level,value:L.count,color:Ce[L.level]||"#94a3b8"}))),e.querySelectorAll("tbody tr[data-id]").forEach(L=>{L.addEventListener("click",()=>Ve(`projects/${L.dataset.id}`))})}}});function te({name:e,options:t,value:a="",placeholder:s="",required:r=!1,attrs:n=""}){let i=t.map(C=>{let[c,u]=Array.isArray(C)?C:[C,C],x=a!==""&&String(a)===String(c)?"selected":"";return`<option value="${d(c)}" ${x}>${d(u)}</option>`}).join(""),l=(n.match(/class="([^"]*)"/)||[])[1]||"",E=n.replace(/class="[^"]*"/,"");return`
    <div class="select${l?" "+l:""}" data-placeholder="${d(s)}" ${E}>
      <select class="select-native" name="${e}" ${r?"required":""} tabindex="-1" aria-hidden="true">${i}</select>
      <button type="button" class="select-trigger" aria-haspopup="listbox">
        <span class="select-label${a===""&&s?" placeholder":""}">${d(a===""?s:ya(t,a))}</span>
        <span class="select-caret">\u25BE</span>
      </button>
      <div class="select-panel" hidden>
        <input type="text" class="select-search" placeholder="Search\u2026" autocomplete="off" />
        <div class="select-options" role="listbox"></div>
      </div>
    </div>`}function ya(e,t){for(let a of e){let[s,r]=Array.isArray(a)?a:[a,a];if(String(s)===String(t))return r}return""}function at(){he?._selectClose?.()}function ce(e){e.querySelectorAll(".select").forEach(t=>{t.dataset.mounted||(t.dataset.mounted="1",ka(t))})}function ka(e){let t=e.querySelector(".select-native"),a=e.querySelector(".select-trigger"),s=e.querySelector(".select-label"),r=e.querySelector(".select-panel"),n=e.querySelector(".select-search"),i=e.querySelector(".select-options"),l=Array.from(t.options).map(h=>({value:h.value,label:h.textContent})),E=()=>{let h=l.find(g=>String(g.value)===String(t.value));s.textContent=h?h.label:e.dataset.placeholder||"",s.classList.toggle("placeholder",!h)},C=(h,{silent:g=!1}={})=>{String(t.value)!==String(h)&&(t.value=h,E(),g||e.dispatchEvent(new CustomEvent("change",{bubbles:!0,detail:{value:t.value}})))};Object.defineProperty(e,"value",{get:()=>t.value,set:h=>C(h)}),Object.defineProperty(e,"selectedLabel",{get:()=>l.find(h=>String(h.value)===String(t.value))?.label||""});let c=-1,u=(h="")=>{let g=h.trim().toLowerCase(),m=l.filter($=>!g||$.label.toLowerCase().includes(g));c=-1,i.innerHTML=m.length?m.map(($,S)=>`<div class="select-option${String($.value)===String(t.value)?" selected":""}" data-value="${d($.value)}" data-index="${S}" role="option">${d($.label)}</div>`).join(""):'<div class="select-empty">No matches</div>'},x=h=>{let g=i.querySelectorAll(".select-option");g.length!==0&&(c=(h+g.length)%g.length,g.forEach(m=>m.classList.toggle("highlight",Number(m.dataset.index)===c)),g[c]?.scrollIntoView({block:"nearest"}))},L=()=>{he&&he!==e&&at(),u(n.value);let h=a.getBoundingClientRect();r.style.position="fixed",r.style.zIndex="200",r.style.top=`${Math.round(h.bottom+4)}px`,r.style.left=`${Math.round(h.left)}px`,r.style.width=`${Math.max(h.width,220)}px`,document.body.appendChild(r),r.hidden=!1,e.classList.add("open"),he=e,Ee=r,Ht=Date.now(),n.focus({preventScroll:!0}),x(0);let g=r.getBoundingClientRect();if(g.bottom>window.innerHeight-8){let m=g.height;r.style.top=`${Math.max(8,Math.round(h.top-m-4))}px`}},U=()=>{r.hidden=!0,e.classList.remove("open"),r.parentElement!==e&&e.appendChild(r),r.style.position="",r.style.zIndex="",r.style.top="",r.style.left="",r.style.width="",he===e&&(he=null),Ee===r&&(Ee=null),n.value="",n.blur()};e._selectClose=U,a.addEventListener("click",h=>{h.stopPropagation(),r.hidden?L():U()}),a.addEventListener("keydown",h=>{h.key==="Enter"||h.key===" "||h.key==="ArrowDown"?(h.preventDefault(),L()):h.key==="Escape"&&U()}),i.addEventListener("click",h=>{let g=h.target.closest(".select-option");g&&(C(g.dataset.value),U())}),n.addEventListener("input",()=>u(n.value)),n.addEventListener("keydown",h=>{if(h.key==="ArrowDown")h.preventDefault(),x(c+1);else if(h.key==="ArrowUp")h.preventDefault(),x(c-1);else if(h.key==="Enter"){h.preventDefault();let g=i.querySelector(".select-option.highlight")||i.querySelector(".select-option");g&&C(g.dataset.value),U()}else h.key==="Escape"&&U()}),t.addEventListener("change",E),E()}var he,Ee,Ht,Ie=Z(()=>{Q();he=null,Ee=null,Ht=0;document.addEventListener("click",e=>{he&&Ee&&!he.contains(e.target)&&!Ee.contains(e.target)&&at()});document.addEventListener("scroll",e=>{he&&(Ee&&Ee.contains(e.target)||Date.now()-Ht<300||at())},!0);window.addEventListener("resize",at)});function O({name:e,label:t,type:a="text",value:s="",required:r=!1,options:n=[],placeholder:i="",help:l="",min:E,max:C,step:c,full:u=!1,rows:x}){let L=r?'<span class="req"> *</span>':"",U=u?"full":"",h="";return a==="select"?h=te({name:e,options:n,value:s,required:r,placeholder:i}):a==="textarea"?h=`<textarea name="${e}" ${r?"required":""} rows="${x||3}">${d(s??"")}</textarea>`:h=`<input type="${a}" name="${e}" value="${d(s??"")}"
      ${r?"required":""} ${E!==void 0?`min="${E}"`:""} ${C!==void 0?`max="${C}"`:""}
      ${c!==void 0?`step="${c}"`:""} ${i?`placeholder="${d(i)}"`:""} />`,`<div class="form-field ${U}">
    <label for="${e}">${d(t)}${L}</label>${h}
    ${l?`<div class="help">${l}</div>`:""}
  </div>`}function $a({name:e,label:t,value:a="",options:s=[],required:r=!1,help:n=""}){let i=s.map(([l,E,C])=>{let c=a!==""&&String(l)===String(a);return`<label class="pill-opt${c?" selected":""}" style="--pill-color:${C||"#64748b"}">
        <input type="radio" name="${e}" value="${d(l)}" ${c?"checked":""} ${r?"required":""} />
        <span class="pill-dot" aria-hidden="true"></span>${d(E)}
      </label>`}).join("");return`<div class="form-field">
    <label>${d(t)}${r?'<span class="req"> *</span>':""}</label>
    <div class="pill-group">${i}</div>
    ${n?`<div class="help">${n}</div>`:""}
  </div>`}function Sa({name:e,options:t,selected:a=[]}){return`<div class="form-field"><label>Assignments</label><div class="checkbox-list">${t.map(r=>{let[n,i]=Array.isArray(r)?r:[r,r],l=a.some(E=>String(E)===String(n))?"checked":"";return`<label class="cl-row"><input type="checkbox" name="${e}" value="${d(n)}" ${l}><span class="cl-check"><i class="bi bi-check-lg"></i></span><span class="cl-text">${d(i)}</span></label>`}).join("")}</div></div>`}function wa(e){let t={};for(let a of e.querySelectorAll("[name]"))a.type==="checkbox"?a.checked?(t[a.name]||(t[a.name]=[]),t[a.name].push(a.value)):t[a.name]===void 0&&(t[a.name]=[]):a.type==="radio"?a.checked&&(t[a.name]=a.value):a.type==="number"?t[a.name]=a.value===""?null:Number(a.value):a.type==="date"?t[a.name]=a.value||null:t[a.name]=a.value;return t}function Ea({formFields:e,error:t=""}){return`
    ${t?`<div class="form-error">${d(t)}</div>`:""}
    <form id="entityForm" class="form-grid" novalidate>
      ${e}
    </form>`}function Da(e,t){let a=e.querySelector(".form-error");a&&a.remove();let s=document.createElement("div");s.className="form-error",s.textContent=t,e.prepend(s)}function _t(e,t){ct(e),e.classList.add("field-invalid");let a=document.createElement("div");a.className="field-error",a.innerHTML=`<i class="bi bi-exclamation-circle"></i> ${d(t)}`,e.insertAdjacentElement("afterend",a)}function ct(e){e.classList.remove("field-invalid"),e.closest(".form-field")?.querySelectorAll(".field-error").forEach(t=>t.remove())}function La(e){let t=new Map;e.querySelectorAll('input[type="date"]').forEach(a=>{t.set(a,a.value),a.addEventListener("change",()=>{a.value&&lt(a.value)?(_t(a,"Weekends (Sat/Sun) are not allowed"),a.value=t.get(a)??""):(ct(a),t.set(a,a.value))})})}function xa(e){let t=null;return e.querySelectorAll('input[type="date"]').forEach(a=>{a.value&&lt(a.value)?(_t(a,"Weekends (Sat/Sun) are not allowed"),t||(t=a)):ct(a)}),t}function ze({title:e,fields:t,submitText:a="Save",onSubmit:s,wide:r=!1}){let n=Je({title:e,body:Ea({formFields:t}),footer:`
      <button class="btn btn-secondary" data-act="cancel">Cancel</button>
      <button class="btn btn-primary" data-act="submit">${d(a)}</button>`,wide:r});return ce(n.overlay),La(n.body.querySelector("#entityForm")),n.overlay.querySelector('[data-act="cancel"]').addEventListener("click",()=>n.close()),n.overlay.querySelector('[data-act="submit"]').addEventListener("click",async()=>{let i=n.body.querySelector("#entityForm"),l=xa(i);if(l){l.focus();return}let E=wa(i),C=n.overlay.querySelector('[data-act="submit"]');C.disabled=!0;try{await s(E),n.close(),D("Saved successfully")}catch(c){Da(i,c.message),C.disabled=!1}}),n}async function Fe({project:e,stakeholders:t=[],onSubmit:a}){let s=e||{},r=t.map(l=>[l.id,`${l.name} (${l.email})`]),n=(e?.stakeholders||[]).map(l=>l.stakeholderId),i=`
    ${O({name:"projectCode",label:"Project Code",value:s.projectCode,required:!0,placeholder:"PRJ-010",full:!0})}
    ${O({name:"name",label:"Project Name",value:s.name,required:!0,full:!0})}
    ${O({name:"description",label:"Description",value:s.description,type:"textarea",full:!0,rows:3})}
    ${O({name:"plannedStartDate",label:"Planned Start",value:le(s.plannedStartDate),type:"date",required:!0})}
    ${O({name:"plannedEndDate",label:"Planned End",value:le(s.plannedEndDate),type:"date",required:!0})}
    ${O({name:"actualStartDate",label:"Actual Start",value:le(s.actualStartDate),type:"date"})}
    ${O({name:"actualEndDate",label:"Actual End",value:le(s.actualEndDate),type:"date"})}
    ${O({name:"status",label:"Status",value:s.status||"PLANNED",type:"select",options:qt})}
    ${Sa({name:"stakeholderIds",options:r,selected:n})}
  `;return ze({title:e?`Edit Project \u2014 ${s.projectCode}`:"New Project",fields:i,submitText:e?"Update":"Create",wide:!0,onSubmit:async l=>{let E={projectCode:l.projectCode,name:l.name,description:l.description||null,plannedStartDate:l.plannedStartDate,plannedEndDate:l.plannedEndDate,actualStartDate:l.actualStartDate||null,actualEndDate:l.actualEndDate||null,status:l.status,stakeholderIds:l.stakeholderIds||[]};await a(E)}})}async function ke({task:e,project:t,projects:a=[],priorities:s=[],stakeholders:r=[],onSubmit:n,onDelete:i}){let l=e||{},E=e?e.projectId:t?.id,C=r.map(b=>[b.id,`${b.name} (${b.email})`]),c=(l.stakeholders||[]).map(b=>({id:b.stakeholderId,role:b.role||"RESPONSIBLE"})),u=(l.dependencies||[]).map(b=>b.dependsOnTaskId),x=t?`<div class="form-field full"><label>Project</label><input type="text" value="${d(`${t.projectCode} \u2014 ${t.name}`)}" disabled /></div>`:O({name:"projectId",label:"Project",value:E||"",type:"select",options:[["","Select project\u2026"],...a.map(b=>[b.id,`${b.projectCode} \u2014 ${b.name}`])],placeholder:"Select project\u2026",required:!0}),L="";if(t&&t.tasks){let b=t.tasks.filter(M=>M.id!==(e?.id??null)).map(M=>[M.id,`${M.taskCode} \u2014 ${M.name}`]);L=`<div class="form-field full">
      <label>Dependencies (finish-to-start) <span class="stk-count" id="depCount">0 selected</span></label>
      <div class="checkbox-list deps-list">${b.length?b.map(([M,F])=>{let J=u.includes(M)?"checked":"";return`<label class="cl-row"><input type="checkbox" name="dependencyIds" value="${M}" ${J}><span class="cl-check"><i class="bi bi-check-lg"></i></span><span class="cl-text">${d(F)}</span></label>`}).join(""):'<div class="help">No other tasks in this project yet.</div>'}</div>
      <div class="help"><i class="bi bi-info-circle"></i> The system prevents circular dependencies.</div>
    </div>`}let U=b=>(b||"?").split(/\s+/).map(M=>M[0]).filter(Boolean).slice(0,2).join("").toUpperCase(),h=["#4f46e5","#0ea5e9","#16a34a","#d97706","#dc2626","#7c3aed"],g=(b,M,F,J)=>{let xe=String(M||"").split(" (")[0]||M||"",ge=h[J%h.length];return`<div class="stk-add-row" data-stkrow="${J}">
      <input type="hidden" name="stkId" value="${b}" />
      <span class="stk-avatar" style="background:${ge}1f;color:${ge}" aria-hidden="true">${d(U(xe))}</span>
      <span class="stk-info"><span class="stk-name">${d(M||"")}</span></span>
      ${te({name:"stkRole",options:Rt,value:F,attrs:'style="width:130px"'})}
      <button type="button" class="btn btn-icon btn-ghost" data-remove-stk title="Remove" aria-label="Remove"><i class="bi bi-x-lg"></i></button>
    </div>`},m=c.length?c.map((b,M)=>g(b.id,C.find(F=>Number(F[0])===b.id)?.[1]||`Stakeholder #${b.id}`,b.role,M)).join(""):"",$=`
    <section class="form-section">
      <h4 class="form-section-title"><i class="bi bi-briefcase"></i> Details</h4>
      ${x}
      ${O({name:"taskCode",label:"Task Code",value:l.taskCode,required:!0,placeholder:"TSK-101"})}
      ${O({name:"name",label:"Task Name",value:l.name,required:!0})}
      ${$a({name:"priorityId",label:"Priority",value:l.priorityId?String(l.priorityId):"",options:s.map(b=>[String(b.id),b.name,b.color]),required:!0})}
      ${O({name:"description",label:"Description",value:l.description,type:"textarea",rows:2,full:!0})}
    </section>
    <section class="form-section">
      <h4 class="form-section-title"><i class="bi bi-calendar3"></i> Schedule</h4>
      ${O({name:"plannedStartDate",label:"Planned Start",value:le(l.plannedStartDate),type:"date",required:!0})}
      ${O({name:"plannedEndDate",label:"Planned End",value:le(l.plannedEndDate),type:"date",required:!0})}
      ${O({name:"dueDate",label:"Due Date",value:le(l.dueDate),type:"date",required:!0,help:'<i class="bi bi-info-circle"></i> Must be on or after the planned start date.'})}
      ${O({name:"actualStartDate",label:"Actual Start",value:le(l.actualStartDate),type:"date"})}
      ${O({name:"actualEndDate",label:"Actual End",value:le(l.actualEndDate),type:"date"})}
      <div class="form-field">
        <label>Status</label>
        <div class="pill-group" id="statusPills">
          ${Te.map(b=>`
            <label class="pill-opt" style="--pill-color:${ye[b]||"#64748b"}">
              <input type="radio" name="statusPill" value="${b}" ${(l.status||"")===b?"checked":""} />
              <span class="pill-dot" aria-hidden="true"></span>${b.replace("_"," ")}
            </label>`).join("")}
        </div>
        <input type="hidden" name="status" value="${l.status||""}" />
        <div class="help" id="statusHint"></div>
      </div>
      <div class="form-field">
        <label>Progress <span class="text-muted" style="font-weight:600" id="progressValue">${l.progressPercentage??0}%</span></label>
        <div class="pill-group" id="progressPills">
          ${[0,20,40,60,80,100].map(b=>`
            <label class="pill-opt" style="--pill-color:${b===100?"#16a34a":"#6366f1"}">
              <input type="radio" name="progressPill" value="${b}" ${Number(l.progressPercentage??0)===b?"checked":""} />
              ${b}
            </label>`).join("")}
        </div>
        <input type="hidden" name="progressPercentage" value="${l.progressPercentage??0}" />
        <div class="help" id="progressHint"></div>
      </div>
    </section>
    <section class="form-section">
      <h4 class="form-section-title"><i class="bi bi-link-45deg"></i> Dependencies</h4>
      ${L}
    </section>
    <section class="form-section">
      <h4 class="form-section-title"><i class="bi bi-people"></i> Task Stakeholders &amp; Roles</h4>
      <div class="form-field full">
        <div id="stkRows" class="stk-add-list">${m}</div>
        <div class="stk-add-bar">
          ${te({name:"stkAddSelect",options:[["","Select stakeholder\u2026"],...C],value:"",placeholder:"Select stakeholder\u2026",attrs:'id="stkAddSelect" style="flex:1"'})}
          <button type="button" class="btn btn-secondary btn-sm" id="stkAddBtn"><i class="bi bi-person-plus"></i> Add</button>
        </div>
        <div class="help"><i class="bi bi-info-circle"></i> Choose who works on this task and their role.</div>
      </div>
    </section>
  `,S=ze({title:e?`Edit Task \u2014 ${l.taskCode}`:"New Task",fields:$,submitText:e?"Update":"Create",wide:!0,onSubmit:async b=>{if(!e&&!t&&!b.projectId)throw new Error("Please select a project first");if(!b.priorityId)throw new Error("Please select a priority");let M=Array.from(S.body.querySelectorAll('[name="stkId"]')),F=Array.from(v?S.body.querySelectorAll('[name="stkRole"]'):[]),J={taskCode:b.taskCode,name:b.name,description:b.description||null,priorityId:Number(b.priorityId),plannedStartDate:b.plannedStartDate,plannedEndDate:b.plannedEndDate,dueDate:b.dueDate,actualStartDate:b.actualStartDate||null,actualEndDate:b.actualEndDate||null,status:b.status||void 0,progressPercentage:Number(b.progressPercentage)||0,dependencyIds:(b.dependencyIds||[]).map(Number),stakeholders:M.map((xe,ge)=>({stakeholderId:Number(xe.value),role:F[ge]?.value||"RESPONSIBLE"}))};!e&&!t&&(J.projectId=Number(b.projectId)),await n(J)}});if(i&&e){let b=S.overlay.querySelector(".modal-footer");if(b){let M=document.createElement("button");M.className="btn btn-danger",M.textContent="Delete",M.style.marginRight="auto",M.addEventListener("click",async()=>{if(await se(`Delete task "${e.name}"?`,{title:"Delete task"}))try{await i(e),S.close(),D("Task deleted")}catch(J){D(J.message,"error")}}),b.prepend(M)}}let v=S.body.querySelector("#entityForm"),I=S.body.querySelector("#stkAddSelect"),y=S.body.querySelector("#stkAddBtn"),f=S.body.querySelector("#stkRows");f?.addEventListener("click",b=>{let M=b.target.closest("[data-remove-stk]");M&&M.closest("[data-stkrow]")?.remove()}),y?.addEventListener("click",()=>{let b=I.value;if(!b)return;let M=I.selectedLabel;if(v.querySelector(`input[name="stkId"][value="${b}"]`))return;let F=document.createElement("div");F.innerHTML=g(b,M,"RESPONSIBLE",f.children.length);let J=F.firstElementChild;f.appendChild(J),ce(J),I.value=""});let _=S.body.querySelector('input[name="status"][type="hidden"]'),A=S.body.querySelector('input[name="progressPercentage"][type="hidden"]'),q=S.body.querySelector("#statusPills"),W=S.body.querySelector("#progressPills"),k=S.body.querySelector("#statusHint"),P=S.body.querySelector("#progressHint"),j=S.body.querySelector("#progressValue"),R=(b,M)=>{b.querySelectorAll('input[type="radio"]').forEach(F=>{F.checked=String(F.value)===String(M)})},Y=(b,M)=>{b.classList.toggle("locked",M),b.querySelectorAll("input").forEach(F=>{F.disabled=M})},ue=b=>{_.value=b,R(q,b)},ne=b=>{A.value=String(b),R(W,b),j&&(j.textContent=`${b}%`)},Re=()=>{ue("COMPLETED"),Y(q,!0),k.innerHTML='<i class="bi bi-lock"></i> Progress 100% \u2014 Status is locked to COMPLETED. Choose a lower progress to unlock it.',P.textContent=""},Ne=()=>{ne(100),Y(W,!0),P.innerHTML='<i class="bi bi-lock"></i> Status COMPLETED \u2014 Progress is locked to 100%. Choose another status to unlock it.',k.textContent=""},Oe=()=>{Y(q,!1),Y(W,!1),k.textContent="",P.textContent=""};W.addEventListener("click",b=>{let M=b.target.closest(".pill-opt");if(!M||W.classList.contains("locked"))return;let F=Number(M.querySelector("input").value);A.value!==String(F)&&(ne(F),F===100?Re():(Oe(),_.value==="COMPLETED"&&ue("IN_PROGRESS")))}),q.addEventListener("click",b=>{let M=b.target.closest(".pill-opt");if(!M||q.classList.contains("locked"))return;let F=M.querySelector("input").value;F!==_.value&&(ue(F),F==="COMPLETED"?Ne():(Oe(),A.value==="100"&&ne(80)))}),A.value==="100"?Re():_.value==="COMPLETED"&&Ne();let we=S.body.querySelector(".deps-list"),He=S.body.querySelector("#depCount"),me=()=>{if(He&&we){let b=we.querySelectorAll('input[type="checkbox"]').length,M=we.querySelectorAll('input[type="checkbox"]:checked').length;He.textContent=`${M} of ${b} selected`}};return we?.addEventListener("change",me),me(),S}function pt({stakeholder:e,onSubmit:t}){let a=e||{},s=`
    ${O({name:"name",label:"Name",value:a.name,required:!0})}
    ${O({name:"email",label:"Email",value:a.email,type:"email",required:!0})}
    ${O({name:"phone",label:"Phone",value:a.phone})}
    ${O({name:"position",label:"Position",value:a.position})}
    ${O({name:"department",label:"Department",value:a.department})}
    ${O({name:"organization",label:"Organization",value:a.organization})}
  `;return ze({title:e?`Edit Stakeholder \u2014 ${a.name}`:"New Stakeholder",fields:s,wide:!0,onSubmit:async r=>{await t({name:r.name,email:r.email,phone:r.phone||null,position:r.position||null,department:r.department||null,organization:r.organization||null})}})}function ut({priority:e,onSubmit:t}){let a=e||{},s=`
    ${O({name:"name",label:"Name",value:a.name,required:!0,help:"e.g. Critical, High, Medium, Low"})}
    ${O({name:"level",label:"Level",value:a.level??"",type:"number",min:1,max:100,required:!0,help:"Lower number = higher priority (1 = Critical)"})}
    ${O({name:"description",label:"Description",value:a.description,type:"textarea",rows:2,full:!0})}
    ${O({name:"color",label:"Color (hex)",value:a.color||"",placeholder:"#f97316",full:!0})}
  `;return ze({title:e?`Edit Priority \u2014 ${a.name}`:"New Priority",fields:s,wide:!0,onSubmit:async r=>{await t({name:r.name,level:Number(r.level),description:r.description||null,color:r.color||null})}})}function Me({risk:e,stakeholders:t=[],onSubmit:a}){let s=e||{},r=`
    ${O({name:"title",label:"Title",value:s.title,required:!0,full:!0})}
    ${O({name:"description",label:"Description",value:s.description,type:"textarea",rows:2,full:!0})}
    ${O({name:"probability",label:"Probability",value:s.probability||3,type:"select",options:[1,2,3,4,5].map(n=>[n,Bt[n]])})}
    ${O({name:"impact",label:"Impact",value:s.impact||3,type:"select",options:[1,2,3,4,5].map(n=>[n,Bt[n]])})}
    ${O({name:"status",label:"Status",value:s.status||"OPEN",type:"select",options:Xe})}
    ${O({name:"ownerStakeholderId",label:"Owner",value:s.ownerStakeholderId||"",type:"select",options:[["","None"],...t.map(n=>[n.id,n.name])]})}
    ${O({name:"identifiedDate",label:"Identified Date",value:le(s.identifiedDate)||new Date().toISOString().slice(0,10),type:"date"})}
    ${O({name:"mitigationPlan",label:"Mitigation Plan",value:s.mitigationPlan,type:"textarea",rows:2,full:!0})}
    ${O({name:"contingencyPlan",label:"Contingency Plan",value:s.contingencyPlan,type:"textarea",rows:2,full:!0})}
  `;return ze({title:e?`Edit Risk \u2014 ${s.title}`:"New Risk",fields:r,submitText:e?"Update":"Create",wide:!0,onSubmit:async n=>{await a({title:n.title,description:n.description||null,probability:Number(n.probability),impact:Number(n.impact),status:n.status,ownerStakeholderId:n.ownerStakeholderId?Number(n.ownerStakeholderId):null,identifiedDate:n.identifiedDate||null,mitigationPlan:n.mitigationPlan||null,contingencyPlan:n.contingencyPlan||null})}})}var Bt,De=Z(()=>{ie();Q();ae();Ie();Bt={1:"1 \u2014 Very Low",2:"2 \u2014 Low",3:"3 \u2014 Medium",4:"4 \u2014 High",5:"5 \u2014 Very High"}});function Kt(){try{let e=localStorage.getItem(yt),t=e?JSON.parse(e):null;return t&&typeof t=="object"?t:null}catch{return null}}function ht(e){try{localStorage.setItem(yt,JSON.stringify({...Kt()||{},...e}))}catch{}}function re(e){return new Date(e).toISOString().slice(0,10)}function Ae(e){return new Date(`${e}T00:00:00Z`)}function st(e,t){let a=Ae(e);return a.setUTCDate(a.getUTCDate()+t),re(a)}function Le(e){if(!e)return e;let t=new Date(e);if(Number.isNaN(t.getTime()))return e;t.setUTCHours(0,0,0,0);let a=t.getUTCDay();return a===0?t.setUTCDate(t.getUTCDate()+1):a===6&&t.setUTCDate(t.getUTCDate()-1),t.toISOString().slice(0,10)}function Ft(e,t){if(!e)return t;let a=new Date(e),s=Ae(Le(st(re(e),t)));return Math.round((s-a)/864e5)}function $e(e){let t=new Date(e),a={month:"short",day:"numeric",timeZone:"UTC"};return t.getUTCFullYear()!==new Date().getUTCFullYear()&&(a.year="numeric"),t.toLocaleDateString("en-US",a)}function Ma(e,t){let a=[...e];if(t==="name")a.sort((s,r)=>s.name.localeCompare(r.name));else if(t==="delay"){let s={DELAYED:0,AT_RISK:1,ON_TRACK:2};a.sort((r,n)=>{let i=(s[r.scheduleStatus]??3)-(s[n.scheduleStatus]??3);return i!==0?i:re(r.plannedStartDate).localeCompare(re(n.plannedStartDate))})}else a.sort((s,r)=>(s.sortOrder??0)-(r.sortOrder??0)||re(s.plannedStartDate).localeCompare(re(r.plannedStartDate)));return a}function Se(e,t,{onTaskClick:a,onNewTask:s,onReschedule:r,onResizeEnd:n,onReorder:i}={}){let l=!!t.projects,E=(t.projects||[{project:t.project,tasks:t.tasks||[],schedule:t.schedule}]).map(o=>({...o,_tasks:Ma(o.tasks||[],e.dataset.ganttSort||"order")})),C=E.flatMap(o=>o._tasks);if(C.length===0){e.innerHTML=`
      <div class="card"><div class="card-body">
        <div class="toolbar">
          <button class="btn btn-primary" data-gantt-new>+ New Task</button>
        </div>
        <div class="empty-state"><div class="empty-icon"><i class="bi bi-calendar3"></i></div>No tasks match the current filters.</div>
      </div></div>`,e.querySelector("[data-gantt-new]")?.addEventListener("click",()=>s?.());return}let c=Kt(),u=o=>c&&c[o]!==void 0&&c[o]!==null&&c[o]!==""?c[o]:void 0,x=e.dataset.ganttCol||u("col")||"pin";Ia.includes(x)||(x="pin");let L=e.dataset.ganttScale||u("scale")||"day";vt[L]||(L="day");let U=e.dataset.ganttSort||u("sort")||"order";ja.includes(U)||(U="order");let h=Number(e.dataset.ganttZoom||(u("zoom")??1));We.includes(h)||(h=1);let g=Number(e.dataset.ganttLabelW||u("labelW")||mt);g=Number.isFinite(g)?Math.max(gt,Math.min(bt,g)):mt,e.dataset.ganttCol=x,e.dataset.ganttScale=L,e.dataset.ganttSort=U,e.dataset.ganttZoom=String(h),e.dataset.ganttLabelW=String(g);let m=vt[L],$=We.indexOf(h),S=L==="day"&&U==="order"&&x==="pin"&&h===1&&g===mt,v=C.flatMap(o=>{let p=[re(o.plannedStartDate),re(o.plannedEndDate)];return o.actualStartDate&&p.push(re(o.actualStartDate)),o.actualEndDate&&p.push(re(o.actualEndDate)),p});E.forEach(o=>{o.project.plannedStartDate&&v.push(re(o.project.plannedStartDate)),o.project.plannedEndDate&&v.push(re(o.project.plannedEndDate))}),v.push(re(new Date)),v.sort();let I=st(v[0],-7),y=st(v[v.length-1],7),f=Ae(I).getTime(),_=Ae(y).getTime(),A=Math.max(1,Math.round((_-f)/864e5)),q=A*m.px*h,W=x==="hide"?0:g,k=Math.max(320,e.clientWidth-W),P=Math.max(q,k),j=P/A,R=o=>{if(!o)return null;let p=re(o);return p<I?0:p>y?P:Math.round((Ae(p).getTime()-f)/864e5*j)},Y=(o,p)=>Math.max(j,R(p)-R(o)),ue=[],ne=[],Re=o=>o.toLocaleDateString("en-US",{month:"short",timeZone:"UTC"});for(let o=0;o<=A;o+=1){let p=st(I,o),T=Ae(p),N=T.getUTCDate(),B=T.getUTCMonth(),G=N===1||o===0,H=o===A;if(G&&ue.push({key:p,label:`${Re(T)} '${String(T.getUTCFullYear()).slice(2)}`}),m.kind==="day")(G||N%5===0||H)&&ne.push({key:p,label:String(N)});else if(m.kind==="week"||m.kind==="biweek"){let z=m.kind==="week"?7:14;(o%z===0||H)&&ne.push({key:p,label:`${Re(T)} ${N}`})}else if(m.kind==="month")G&&ne.push({key:p,label:String(N)});else if(m.kind==="quarter"){let z=Math.floor(B/3)+1,X=[0,3,6,9].includes(B)&&N===1,K=ne[ne.length-1]?.label;X?ne.push({key:p,label:`Q${z} '${String(T.getUTCFullYear()).slice(2)}`}):H&&K!==`Q${z} '${String(T.getUTCFullYear()).slice(2)}`&&ne.push({key:p,label:`Q${z} '${String(T.getUTCFullYear()).slice(2)}`})}}let Ne=new Set,Oe=ne.filter(o=>Ne.has(o.key)?!1:(Ne.add(o.key),!0)),we=[],He=-1/0;for(let o of Oe){let p=R(o.key);p-He<38||(we.push(o),He=p)}let me=[];E.forEach((o,p)=>{me.push({kind:"group",gi:p,top:0}),o._tasks.forEach(T=>me.push({kind:"task",gi:p,task:T,top:0}))});let b=0,M=new Map;me.forEach((o,p)=>{o.top=b,o.height=o.kind==="group"?Ca:Ta,b+=o.height,o.kind==="task"&&M.set(o.task.id,p)});let F=b,J=new Map(C.map(o=>[o.id,o])),xe=o=>o._tasks.length===(o._total??o.tasks.length),ge=U==="order"&&typeof i=="function",ra=(o,p)=>ge?xe(p)?o.dependencies&&o.dependencies.length>0?'<span class="gantt-drag locked" title="Has dependencies \u2014 cannot be reordered"><i class="bi bi-lock"></i></span>':'<span class="gantt-drag" title="Drag to reorder within this project"><i class="bi bi-grip-vertical"></i></span>':'<span class="gantt-drag disabled" title="Clear filters to reorder tasks"><i class="bi bi-grip-vertical"></i></span>':"",na=me.map(o=>{if(o.kind==="group"){let H=E[o.gi],z=H.project.plannedStartDate?R(H.project.plannedStartDate):0,X=H.project.plannedEndDate?Y(H.project.plannedStartDate,H.project.plannedEndDate):0,K=Math.round(X*(H.project.progressPercentage||0)/100);return`<div class="gantt-row gantt-group-row" style="height:${o.height}px" data-gi="${o.gi}">
          <div class="gantt-bar project" style="left:${z}px;top:12px;width:${X}px" title="${d(H.project.name)}"></div>
          ${K>0?`<div class="gantt-bar project-progress" style="left:${z}px;top:12px;width:${K}px"></div>`:""}
        </div>`}let p=o.task,T=R(p.plannedStartDate),N=Y(p.plannedStartDate,p.plannedEndDate),B=Math.round(N*(p.progressPercentage||0)/100),G=p.actualStartDate?`<div class="gantt-bar actual status-${p.status}" style="left:${R(p.actualStartDate)}px;top:${Pa}px;width:${Y(p.actualStartDate,p.actualEndDate||new Date)}px"></div>`:"";return`
        <div class="gantt-row ${p.scheduleStatus==="DELAYED"?"delayed":""} ${p.scheduleStatus==="AT_RISK"?"at-risk":""}" style="height:${o.height}px" data-task-id="${p.id}" data-gi="${o.gi}">
          <div class="gantt-bar planned status-${p.status}" style="left:${T}px;top:${Ke}px;width:${N}px" title="${d(p.name)} \u2014 ${$e(p.plannedStartDate)} \u2192 ${$e(p.plannedEndDate)} (drag to move)"></div>
          <div class="gantt-resize" style="left:${T+N-3}px;top:${Ke}px" title="Drag to change the planned end date"></div>
          ${p.progressPercentage>0?`<div class="gantt-bar progress" style="left:${T}px;top:${Ke}px;width:${B}px"></div>`:""}
          ${G}
        </div>`}).join(""),oa=o=>o.scheduleStatus==="DELAYED"&&o.scheduleDaysLate>0?`${o.scheduleDaysLate}d late`:o.scheduleStatus==="AT_RISK"?o.startedLateDays>0?`started ${o.startedLateDays}d late`:"approaching end":"",ia=me.map(o=>{if(o.kind==="group"){let B=E[o.gi];return`<div class="gantt-row-label gantt-group-label" style="height:${o.height}px;width:${g}px">
          <span class="g-main">
            <span class="gname">${d(B.project.name)}</span>
            <span class="gcode">${d(B.project.projectCode)} \xB7 ${B._tasks.length} tasks \xB7 ${B.project.progressPercentage}%</span>
          </span>
          ${ee(B.project.status)}
        </div>`}let p=o.task,T=oa(p),N=`${p.taskCode} \u2014 ${d(p.name)}
Planned: ${$e(p.plannedStartDate)} \u2192 ${$e(p.plannedEndDate)}${p.actualStartDate?`
Actual: ${$e(p.actualStartDate)} \u2192 ${$e(p.actualEndDate)}`:""}${(p.dependencies||[]).length?`
Depends on: ${p.dependencies.map(B=>B.taskCode).join(", ")}`:""}`;return`
        <div class="gantt-row-label ${p.scheduleStatus==="DELAYED"?"delayed":""} ${p.scheduleStatus==="AT_RISK"?"at-risk":""}" style="height:${o.height}px;width:${g}px" data-task-id="${p.id}" data-gi="${o.gi}"
             title="${N}" ${ge&&xe(E[o.gi])&&!(p.dependencies&&p.dependencies.length)?'draggable="true"':""}>
          ${ra(p,E[o.gi])}
          ${p.scheduleStatus!=="ON_TRACK"?`<span class="gantt-sched ${p.scheduleStatus.toLowerCase()}" title="${ft[p.scheduleStatus].label}"><span class="badge-dot gantt-dot" style="background:${ft[p.scheduleStatus].color}"></span></span>`:""}
          <span class="g-main">
            <span class="tname">${d(p.name)}</span>
            <span class="tdates">${$e(p.plannedStartDate)} \u2192 ${$e(p.plannedEndDate)}${T?` <span class="tvar ${p.scheduleStatus.toLowerCase()}">${d(T)}</span>`:""}</span>
          </span>
        </div>`}).join(""),xt="";C.forEach(o=>{for(let p of o.dependencies||[]){let T=J.get(p.dependsOnTaskId),N=T?M.get(T.id):void 0,B=M.get(o.id);if(N===void 0||B===void 0)continue;let G=R(T.plannedEndDate),H=R(o.plannedStartDate),z=me[N].top+Ke+Ut/2,X=me[B].top+Ke+Ut/2,K=(z+X)/2,oe=4;xt+=`<path d="M ${G} ${z}
        L ${G+oe} ${z}
        L ${G+oe} ${K}
        L ${Math.max(H-oe,0)} ${K}
        L ${Math.max(H-oe,0)} ${X}
        L ${H} ${X}" />`}});let Tt=R(new Date),la=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"}),da=t.schedule||{ON_TRACK:0,AT_RISK:0,DELAYED:0},ca=["DELAYED","AT_RISK","ON_TRACK"].map(o=>{let p=ft[o];return`<span class="gantt-chip ${o.toLowerCase()}" style="color:${p.color};background:${p.color}14"><span class="badge-dot" style="background:${p.color}"></span>${p.label}: <strong>${da[o]??0}</strong></span>`}).join(""),pa=[["order","Order (manual)"],["start","Planned start"],["delay","Delayed first"],["name","Name"]];e.innerHTML=`
    <div class="gantt" data-col="${x}">
      <div class="gantt-toolbar">
        <strong>${d(l?"All Projects":E[0].project.name)}</strong>
        <span>${C.length} tasks${l?` \xB7 ${E.length} project(s)`:""}</span>
        <span class="gantt-zoom">
          <button type="button" class="btn btn-sm" data-gantt-zoom-out title="Zoom out" ${$===0?"disabled":""}>\u2212</button>
          <span class="gantt-zoom-label" data-gantt-zoom-label title="Zoom level (100% = default)">${Math.round(h*100)}%</span>
          <button type="button" class="btn btn-sm" data-gantt-zoom-in title="Zoom in" ${$===We.length-1?"disabled":""}>+</button>
        </span>
        ${te({name:"ganttScale",options:Object.entries(vt).map(([o,p])=>[o,p.name]),value:e.dataset.ganttScale||"day",attrs:'class="gantt-scale" title="Timeline scale"'})}
        ${te({name:"ganttSort",options:pa,value:U,attrs:'class="gantt-sort" title="Sort tasks"'})}
        ${te({name:"ganttCol",options:[["scroll","Scroll"],["pin","Pin"],["hide","Hide"]],value:x,attrs:'class="gantt-col" title="Task name column"'})}
        ${S?"":'<button type="button" class="btn btn-sm" data-gantt-view-reset title="Reset scale, sort, column mode/width and zoom to defaults">\u27F2 Reset view</button>'}
        <span class="spacer"></span>
        <button class="btn btn-primary btn-sm" data-gantt-new>+ New Task</button>
      </div>
      <div class="gantt-summary">${ca}</div>
      <div class="gantt-legend">
        <span class="legend-item"><span class="legend-bar planned"></span> Planned (drag to reschedule)</span>
        <span class="legend-item"><span class="legend-bar actual"></span> Actual</span>
        <span class="legend-item"><span class="legend-bar progress"></span> Progress</span>
        <span class="legend-item"><span class="legend-bar today"></span> Today</span>
        ${ge&&x!=="hide"?'<span class="legend-item legend-hint"><i class="bi bi-grip-vertical"></i> drag a task to reorder it (same project only)</span>':""}
      </div>
      <div class="gantt-scroll">
        <div class="gantt-body" style="width:${W+P}px">
          <div class="gantt-left" style="width:${g}px">
            <div class="gantt-left-head" style="height:${zt}px">
              <div class="gantt-left-title">Task</div>
            </div>
            <div class="gantt-labels" style="width:${g}px">${ia}</div>
            <div class="gantt-col-resize" data-gantt-col-resize title="Drag to resize the task-name column"></div>
          </div>
          <div class="gantt-right" style="width:${P}px">
            <div class="gantt-header" style="height:${zt}px;width:${P}px">
              ${ue.map(o=>`<div class="gantt-header-month" style="left:${R(o.key)}px">${d(o.label)}</div>`).join("")}
              ${we.map(o=>`<div class="gantt-header-day" style="left:${R(o.key)}px;transform:translateX(-50%)">${d(o.label)}</div>`).join("")}
              <div class="gantt-today-label" style="left:${Tt}px;top:24px">${d(la)}</div>
            </div>
            <div class="gantt-grid" style="position:relative;width:${P}px;height:${F}px">
              ${Oe.map(o=>`<div class="gantt-grid-line" style="left:${R(o.key)}px"></div>`).join("")}
              <div class="gantt-grid-line today" style="left:${Tt}px"></div>
              <div class="gantt-rows">${na}</div>
              <svg class="gantt-links" width="${P}" height="${F}">${xt}</svg>
            </div>
          </div>
        </div>
      </div>
    </div>`;let fe=!1,rt=()=>{e.dataset.ganttSort=e.querySelector(".gantt-sort")?.value||"order",e.dataset.ganttScale=e.querySelector(".gantt-scale")?.value||"day",e.dataset.ganttCol=e.querySelector(".gantt-col")?.value||"pin",ht({sort:e.dataset.ganttSort,scale:e.dataset.ganttScale,col:e.dataset.ganttCol}),Se(e,t,{onTaskClick:a,onNewTask:s,onReschedule:r,onResizeEnd:n,onReorder:i})};e.querySelector(".gantt-sort")?.addEventListener("change",rt),e.querySelector(".gantt-scale")?.addEventListener("change",rt),e.querySelector(".gantt-col")?.addEventListener("change",rt);let Ct=o=>{let p=We[Math.max(0,Math.min(We.length-1,o))];p!==h&&(e.dataset.ganttZoom=String(p),ht({zoom:p}),Se(e,t,{onTaskClick:a,onNewTask:s,onReschedule:r,onResizeEnd:n,onReorder:i}))};e.querySelector("[data-gantt-zoom-out]")?.addEventListener("click",()=>Ct($-1)),e.querySelector("[data-gantt-zoom-in]")?.addEventListener("click",()=>Ct($+1)),e.querySelector("[data-gantt-view-reset]")?.addEventListener("click",()=>{try{localStorage.removeItem(yt)}catch{}delete e.dataset.ganttScale,delete e.dataset.ganttSort,delete e.dataset.ganttCol,delete e.dataset.ganttZoom,delete e.dataset.ganttLabelW,Se(e,t,{onTaskClick:a,onNewTask:s,onReschedule:r,onResizeEnd:n,onReorder:i})});let Pt=e.querySelector("[data-gantt-col-resize]");if(Pt){let o=e.querySelector(".gantt-left"),p=e.querySelector(".gantt-labels"),T=e.querySelector(".gantt-body");Pt.addEventListener("pointerdown",N=>{if(N.button!==0)return;N.preventDefault(),N.stopPropagation();let B=N.clientX,G=g,H=X=>{let K=Math.max(gt,Math.min(bt,G+(X.clientX-B)));o.style.width=`${K}px`,p.style.width=`${K}px`,o.querySelectorAll(".gantt-row-label").forEach(oe=>oe.style.width=`${K}px`),T.style.width=`${(x==="hide"?0:K)+P}px`},z=X=>{window.removeEventListener("pointermove",H),window.removeEventListener("pointerup",z);let K=Math.max(gt,Math.min(bt,G+(X.clientX-B)));Math.abs(K-g)>=1&&(e.dataset.ganttLabelW=String(K),ht({labelW:K})),Se(e,t,{onTaskClick:a,onNewTask:s,onReschedule:r,onResizeEnd:n,onReorder:i})};window.addEventListener("pointermove",H),window.addEventListener("pointerup",z)})}e.querySelector("[data-gantt-new]")?.addEventListener("click",()=>s?.());let jt=o=>{let p=J.get(o);p&&a?.(p)};e.querySelectorAll(".gantt-row[data-task-id]").forEach(o=>{o.addEventListener("click",()=>{if(fe){fe=!1;return}jt(Number(o.dataset.taskId))})}),e.querySelectorAll(".gantt-row-label[data-task-id]").forEach(o=>{o.addEventListener("click",()=>{if(fe){fe=!1;return}jt(Number(o.dataset.taskId))})});let ua=(o,p)=>{o.addEventListener("pointerdown",T=>{if(T.button!==0)return;T.preventDefault(),fe=!0;let N=T.clientX,B=o.parentElement.querySelector(".gantt-bar.progress"),G=0,H=X=>{let K=Math.round((X.clientX-N)/j);G=Ft(p.plannedStartDate,K),o.style.transform=`translateX(${G*j}px)`,B&&(B.style.transform=`translateX(${G*j}px)`)},z=()=>{window.removeEventListener("pointermove",H),window.removeEventListener("pointerup",z),o.style.transform="",B&&(B.style.transform=""),G!==0?r?.(p,G):fe=!1};window.addEventListener("pointermove",H),window.addEventListener("pointerup",z)})},ma=(o,p)=>{o.addEventListener("pointerdown",T=>{if(T.button!==0)return;T.preventDefault(),T.stopPropagation(),fe=!0;let N=T.clientX,B=o.parentElement,G=B.querySelector(".gantt-bar.planned"),H=B.querySelector(".gantt-bar.progress"),z=G.getBoundingClientRect().width,X=0,K=nt=>{let Be=Math.round((nt.clientX-N)/j);X=Ft(p.plannedEndDate,Be);let It=Math.max(j,z+X*j);G.style.width=`${It}px`,H&&(H.style.width=`${Math.round(It*(p.progressPercentage||0)/100)}px`)},oe=()=>{window.removeEventListener("pointermove",K),window.removeEventListener("pointerup",oe),G.style.width="",H&&(H.style.width=""),X!==0?n?.(p,X):fe=!1};window.addEventListener("pointermove",K),window.addEventListener("pointerup",oe)})};if(e.querySelectorAll(".gantt-bar.planned").forEach(o=>{ua(o,J.get(Number(o.parentElement.dataset.taskId)))}),e.querySelectorAll(".gantt-resize").forEach(o=>{ma(o,J.get(Number(o.parentElement.dataset.taskId)))}),ge){let o=null,p=null;e.querySelectorAll('.gantt-row-label[draggable="true"]').forEach(T=>{T.addEventListener("dragstart",N=>{o=Number(T.dataset.taskId),p=Number(T.dataset.gi),N.dataTransfer.setData("text/plain",String(o)),N.dataTransfer.effectAllowed="move",T.classList.add("dragging")}),T.addEventListener("dragend",()=>{e.querySelectorAll(".insert-before, .insert-after").forEach(N=>N.classList.remove("insert-before","insert-after")),T.classList.remove("dragging"),o=null,p=null})}),e.querySelectorAll(".gantt-row-label[data-task-id], .gantt-row[data-task-id]").forEach(T=>{T.addEventListener("dragover",N=>{if(o===null||Number(T.dataset.gi)!==p||Number(T.dataset.taskId)===o)return;N.preventDefault(),N.dataTransfer.dropEffect="move";let H=T.getBoundingClientRect(),z=N.clientY<H.top+H.height/2;e.querySelectorAll(".insert-before, .insert-after").forEach(X=>X.classList.remove("insert-before","insert-after")),T.classList.add(z?"insert-before":"insert-after")}),T.addEventListener("dragleave",()=>T.classList.remove("insert-before","insert-after")),T.addEventListener("drop",N=>{if(N.preventDefault(),e.querySelectorAll(".insert-before, .insert-after").forEach(Be=>Be.classList.remove("insert-before","insert-after")),o===null)return;let B=Number(T.dataset.gi);if(B!==p)return;let G=Number(T.dataset.taskId);if(G===o)return;let H=E[B],z=H._tasks.map(Be=>Be.id),X=z.indexOf(o),K=z.indexOf(G);if(X===-1||K===-1)return;let oe=T.getBoundingClientRect(),nt=N.clientY>=oe.top+oe.height/2;z.splice(X,1),K>X&&(K-=1),z.splice(nt?K+1:K,0,o),i(H.project.id,z)})})}ce(e)}var Ta,Ca,mt,gt,bt,Ut,Ke,Pa,zt,vt,We,yt,ja,Ia,ft,kt=Z(()=>{Q();ae();Ie();Ta=44,Ca=38,mt=240,gt=160,bt=480,Ut=14,Ke=11,Pa=31,zt=44,vt={day:{px:8,name:"Day",kind:"day"},week:{px:4,name:"Week",kind:"week"},biweek:{px:2.2,name:"2 Weeks",kind:"biweek"},month:{px:1.2,name:"Month",kind:"month"},quarter:{px:.45,name:"Quarter",kind:"quarter"}},We=[.5,.75,1,1.5,2,3,4],yt="ganttView",ja=["order","start","delay","name"],Ia=["scroll","pin","hide"];ft={DELAYED:{label:"Delayed",color:"#dc2626"},AT_RISK:{label:"At risk",color:"#d97706"},ON_TRACK:{label:"On track",color:"#16a34a"}}});var Wt={};be(Wt,{default:()=>Aa});var Aa,Gt=Z(()=>{ie();Q();ae();De();kt();Ie();Aa={async mount(e){let t=[],a=[],s=[],r={projectId:"",stakeholderId:"",status:""},n=async()=>{let[m,$,S]=await Promise.all([w.get("/api/gantt"),w.get("/api/stakeholders"),w.get("/api/priorities")]);t=m.projects,a=$,s=S},i=()=>t.map(m=>{let $=m.tasks;return r.projectId&&m.project.id!==Number(r.projectId)||(r.stakeholderId&&($=$.filter(S=>S.stakeholders.some(v=>v.stakeholderId===Number(r.stakeholderId)))),r.status&&($=$.filter(S=>S.status===r.status)),$.length===0&&!(r.projectId&&m.project.id===Number(r.projectId)))?null:{...m,tasks:$,_total:m.tasks.length}}).filter(Boolean),l=m=>m.reduce(($,S)=>(S.tasks.forEach(v=>{$[v.scheduleStatus]+=1}),$),{ON_TRACK:0,AT_RISK:0,DELAYED:0}),E=()=>{if(!r.projectId)return null;let m=t.find($=>$.project.id===Number(r.projectId));return m?{...m.project,tasks:m.tasks}:null},C=()=>{let m=i(),$={projects:m,schedule:l(m)},S=m.reduce((v,I)=>v+I.tasks.length,0);e.innerHTML=`
        <div class="page-head">
          <h1>Gantt Chart</h1>
          <p class="page-sub">\u0E17\u0E38\u0E01\u0E42\u0E1B\u0E23\u0E40\u0E08\u0E01\u0E15\u0E4C\u0E43\u0E19\u0E44\u0E17\u0E21\u0E4C\u0E44\u0E25\u0E19\u0E4C\u0E40\u0E14\u0E35\u0E22\u0E27 \u2014 \u0E25\u0E32\u0E01\u0E41\u0E16\u0E1A\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14, \u0E25\u0E32\u0E01\u0E07\u0E32\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E25\u0E33\u0E14\u0E31\u0E1A (\u0E20\u0E32\u0E22\u0E43\u0E19\u0E42\u0E1B\u0E23\u0E40\u0E08\u0E01\u0E15\u0E4C\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19)</p>
        </div>
        <div class="card" style="margin-bottom:14px">
          <div class="card-body">
            <div class="filter-bar">
              <label>Project
                ${te({name:"filterProject",options:[["","All Projects"],...t.map(v=>[v.project.id,`${v.project.projectCode} \u2014 ${v.project.name}`])],value:r.projectId,placeholder:"All Projects",attrs:'data-filter="projectId"'})}
              </label>
              <label>Stakeholder
                ${te({name:"filterStakeholder",options:[["","All Stakeholders"],...a.map(v=>[v.id,v.name])],value:r.stakeholderId,placeholder:"All Stakeholders",attrs:'data-filter="stakeholderId"'})}
              </label>
              <label>Status
                ${te({name:"filterStatus",options:[["","All Statuses"],...Te.map(v=>[v,v.replace("_"," ")])],value:r.status,placeholder:"All Statuses",attrs:'data-filter="status"'})}
              </label>
              <button class="btn btn-secondary btn-sm" id="clearFilters">Clear</button>
              <span class="spacer"></span>
              <span class="text-muted" style="font-size:13px">${S} task(s) shown</span>
            </div>
          </div>
        </div>
        <div id="ganttRoot"></div>
      `,ce(e),e.querySelectorAll("[data-filter]").forEach(v=>{v.addEventListener("change",()=>{r[v.dataset.filter]=v.value,C()})}),e.querySelector("#clearFilters").addEventListener("click",()=>{r.projectId="",r.stakeholderId="",r.status="",C()}),Se(e.querySelector("#ganttRoot"),$,{onNewTask:()=>u(E()),onTaskClick:v=>x(v),onReschedule:(v,I)=>U(v,I),onResizeEnd:(v,I)=>h(v,I),onReorder:(v,I)=>g(v,I)})},c=async()=>{await n(),C()},u=m=>{ke({project:m||null,projects:t.map($=>$.project),priorities:s,stakeholders:a,onSubmit:async $=>{let S=m?m.id:Number($.projectId);if(!S){D("Please select a project first","error");return}await w.post(`/api/projects/${S}/tasks`,$),D("Task created"),await c()}})},x=m=>{let $=t.find(S=>S.project.id===m.projectId);ke({task:m,project:$?{...$.project,tasks:$.tasks}:null,priorities:s,stakeholders:a,onSubmit:async S=>{await w.put(`/api/tasks/${m.id}`,S),D("Task updated"),await c()},onDelete:async()=>{await w.del(`/api/tasks/${m.id}`),D("Task deleted"),await c()}})},L=(m,$)=>{let S=new Date(m);return S.setUTCHours(0,0,0,0),S.setUTCDate(S.getUTCDate()+$),S.toISOString().slice(0,10)},U=async(m,$)=>{if($===0)return;let S=L(m.plannedStartDate,$),v=Le(L(m.plannedEndDate,$)),I=Le(L(m.dueDate,$));I<S&&(I=S);try{await w.put(`/api/tasks/${m.id}`,{plannedStartDate:S,plannedEndDate:v,dueDate:I}),D(`${m.taskCode} rescheduled by ${$} day(s)`),await c()}catch(y){D(y.message,"error"),await c()}},h=async(m,$)=>{if($===0)return;let S=m.plannedStartDate,v=L(m.plannedEndDate,$);if(v<=S){D("Planned end must be after planned start","error");return}try{await w.put(`/api/tasks/${m.id}`,{plannedEndDate:v}),D(`${m.taskCode} planned end moved by ${$} day(s)`),await c()}catch(I){D(I.message,"error"),await c()}},g=async(m,$)=>{try{await w.put(`/api/projects/${m}/tasks/reorder`,{taskIds:$}),D("Task order updated"),await c()}catch(S){D(S.message,"error"),await c()}};e.innerHTML=de();try{await n(),C()}catch(m){e.innerHTML=`<div class="page-error"><h2>Failed to load Gantt data</h2><p>${d(m.message)}</p></div>`}}}});var $t={};be($t,{default:()=>qa});var qa,St=Z(()=>{ie();Q();ae();qa={async mount(e){e.innerHTML=`
      <div class="login-card">
        <div class="brand"><span class="brand-logo"><i class="bi bi-bar-chart"></i></span> ProjectFlow</div>
        <div class="login-sub">Project Management System</div>
        <form id="loginForm" novalidate>
          <div class="form-field" style="margin-bottom:14px">
            <label for="username">Username</label>
            <input type="text" id="username" name="username" value="admin" autocomplete="username" required />
          </div>
          <div class="form-field" style="margin-bottom:20px">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" value="admin123" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:10px" id="loginBtn">Sign In</button>
        </form>
        <div class="login-hint">Demo credentials: <strong>admin</strong> / <strong>admin123</strong></div>
      </div>`;let t=e.querySelector("#loginForm"),a=e.querySelector("#loginBtn");t.addEventListener("submit",async s=>{s.preventDefault();let r=t.username.value.trim(),n=t.password.value;a.disabled=!0,a.textContent="Signing in\u2026";try{let i=await w.post("/api/auth/login",{username:r,password:n});_e(i.token),localStorage.setItem("pm_user",i.user?.username||r),D(`Welcome, ${i.user?.name||r}!`,"success"),location.hash="#/dashboard"}catch(i){D(d(i.message),"error"),a.disabled=!1,a.textContent="Sign In"}})}}});function pe(e,{columns:t,fetch:a,onRowClick:s,actions:r=[],emptyText:n="No records found",pageSize:i=10,searchable:l=!0,onCount:E,initialSort:C={},extraParams:c={}}={}){let u={page:1,limit:i,search:"",sortBy:C.sortBy||"",sortDir:C.sortDir||"asc",loading:!1,rows:[],total:0,totalPages:1},x=0,L=()=>{let k=new URLSearchParams;k.set("page",String(u.page)),k.set("limit",String(u.limit)),u.search&&k.set("search",u.search),u.sortBy&&(k.set("sortBy",u.sortBy),k.set("sortDir",u.sortDir));for(let[P,j]of Object.entries(c))j!=null&&j!==""&&k.set(P,String(j));return k.toString()},U=k=>k.sortKey||k.key,h=k=>{let P=k.sortable!==!1&&U(k),j=P&&u.sortBy===U(k),R=j&&u.sortDir==="desc"?"desc":"asc",Y=j?R==="desc"?"bi-arrow-down":"bi-arrow-up":"bi-arrow-down-up";return`<th data-sort="${P?d(U(k)):""}" class="${P?"sortable":""}${j?" sorted":""}" ${k.align?`style="text-align:${k.align}"`:""}>
      ${d(k.label)}${P?`<i class="bi ${Y} sort-icon"></i>`:""}
    </th>`},g=k=>`<tr class="empty-row"><td colspan="${t.length+(r.length?1:0)}">${d(k)}</td></tr>`,m=()=>u.loading?g("Loading\u2026"):u.rows.length===0?g(n):u.rows.map(k=>{let P=t.map(R=>`<td${R.align?` style="text-align:${R.align}"`:""}>${R.render?R.render(k):d(k[R.key]??"\u2014")}</td>`).join(""),j=r.length?`<td class="cell-actions">${r.map(R=>`<button class="btn btn-sm ${R.className||"btn-secondary"}" data-act="${d(R.label)}">${d(R.label)}</button>`).join("")}</td>`:"";return`<tr class="${s?"clickable":""} ${k._rowClass||""}" data-id="${k.id}">${P}${j}</tr>`}).join(""),$=()=>{if(u.total===0)return"Showing 0 of 0";let k=(u.page-1)*u.limit+1,P=Math.min(u.total,u.page*u.limit);return`Showing ${k}\u2013${P} of ${u.total}`},S=()=>{let k=new Set([1,u.totalPages]);for(let Y=Math.max(2,u.page-1);Y<=Math.min(u.totalPages-1,u.page+1);Y++)k.add(Y);let P=[...k].sort((Y,ue)=>Y-ue),j="",R=0;for(let Y of P)Y-R>1&&(j+='<span class="dt-ellipsis">\u2026</span>'),j+=`<button type="button" class="dt-page${Y===u.page?" active":""}" data-page="${Y}">${Y}</button>`,R=Y;return j},v=()=>`
    <button type="button" class="dt-page" data-page="prev" ${u.page<=1?"disabled":""} title="Previous page"><i class="bi bi-chevron-left"></i></button>
    ${S()}
    <button type="button" class="dt-page" data-page="next" ${u.page>=u.totalPages?"disabled":""} title="Next page"><i class="bi bi-chevron-right"></i></button>`;e.innerHTML=`
    <div class="dt-toolbar">
      ${l?`
        <div class="dt-search">
          <i class="bi bi-search"></i>
          <input type="text" placeholder="Search\u2026" data-dt-search autocomplete="off" />
        </div>`:"<span></span>"}
      <div class="dt-pagesize">
        <span>Show</span>
        ${te({name:"dtLimit",options:Ra.map(k=>[k,String(k)]),value:String(u.limit),attrs:'class="dt-limit" title="Rows per page"'})}
        <span>per page</span>
      </div>
    </div>
    <div class="table-wrap"><table class="data-table">
      <thead><tr>${t.map(h).join("")}${r.length?'<th class="cell-actions">Actions</th>':""}</tr></thead>
      <tbody data-dt-body>${m()}</tbody>
    </table></div>
    <div class="dt-footer">
      <span class="dt-info">${$()}</span>
      <div class="dt-pager">${v()}</div>
    </div>`;let I=e.querySelector("[data-dt-body]"),y=e.querySelector("[data-dt-search]"),f=async()=>{let k=++x;u.loading=!0,I.innerHTML=m();try{let P=await a(L());if(k!==x)return;if(u.rows=P.rows||[],u.total=P.total||0,u.totalPages=Math.max(1,P.totalPages||1),u.rows.length===0&&u.page>u.totalPages){u.page=u.totalPages,u.loading=!1,await f();return}E?.(u.total)}catch(P){k===x&&D(P.message,"error")}finally{k===x&&(u.loading=!1,I.innerHTML=m(),e.querySelector(".dt-info").innerHTML=$(),e.querySelector(".dt-pager").innerHTML=v(),A(),_())}},_=()=>{e.querySelectorAll("tbody tr.clickable").forEach(k=>{k.addEventListener("click",P=>{if(P.target.closest("button"))return;let j=u.rows.find(R=>R.id===Number(k.dataset.id));j&&s(j)})}),r.forEach(k=>{e.querySelectorAll(`[data-act="${CSS.escape(k.label)}"]`).forEach(P=>{P.addEventListener("click",j=>{j.stopPropagation();let R=P.closest("tr"),Y=u.rows.find(ue=>ue.id===Number(R.dataset.id));Y&&k.onClick(Y)})})})},A=()=>{e.querySelectorAll(".dt-page[data-page]").forEach(k=>{k.addEventListener("click",()=>{let P=k.dataset.page,j=P==="prev"?u.page-1:P==="next"?u.page+1:Number(P);j<1||j>u.totalPages||j===u.page||(u.page=j,f())})})};if(y){let k=null;y.addEventListener("input",()=>{clearTimeout(k),k=setTimeout(()=>{u.search=y.value.trim(),u.page=1,f()},300)})}let q=e.querySelector("thead tr"),W=()=>{e.querySelectorAll("th[data-sort]").forEach(k=>{k.addEventListener("click",()=>{let P=k.dataset.sort;P&&(u.sortBy===P?u.sortDir=u.sortDir==="asc"?"desc":"asc":(u.sortBy=P,u.sortDir="asc"),u.page=1,q.innerHTML=t.map(h).join("")+(r.length?'<th class="cell-actions">Actions</th>':""),W(),f())})})};return W(),ce(e),e.querySelector(".dt-limit")?.addEventListener("change",k=>{u.limit=Number(k.target.value)||u.limit,u.page=1,f()}),A(),f(),{refresh:()=>f(),setExtraParams:k=>{Object.assign(c,k),u.page=1,f()},state:u}}var Ra,qe=Z(()=>{Q();ae();Ie();Ra=[10,25,50]});var Vt={};be(Vt,{default:()=>Na});var Na,Yt=Z(()=>{ie();Q();ae();qe();De();Na={async mount(e){e.innerHTML=`
      <div class="page-title">Priorities</div>
      <div class="page-subtitle">Task priorities are configurable \u2014 level 1 is the highest priority</div>
      <div class="toolbar">
        <button class="btn btn-primary" id="newPriorityBtn">+ New Priority</button>
      </div>
      <div class="card"><div id="prioritiesTable"></div></div>
    `;let t=pe(e.querySelector("#prioritiesTable"),{columns:[{key:"name",label:"Name",sortable:!1,render:i=>a(i)},{key:"level",label:"Level",render:i=>`<strong>${i.level}</strong>`},{key:"description",label:"Description",render:i=>d(i.description||"\u2014")},{key:"taskCount",label:"Tasks using it",sortable:!1}],fetch:i=>w.get(`/api/priorities?${i}`),actions:[{label:"Edit",className:"btn-secondary",onClick:i=>r(i)},{label:"Delete",className:"btn-danger",onClick:i=>n(i)}],emptyText:"No priorities defined."}),a=i=>`
      <span style="display:inline-flex;align-items:center;gap:8px">
        <span style="width:14px;height:14px;border-radius:4px;background:${d(i.color||"#94a3b8")}"></span>
        <strong>${d(i.name)}</strong>
      </span>`,s=()=>{ut({onSubmit:async i=>{await w.post("/api/priorities",i),D("Priority created"),await t.refresh()}})},r=i=>{ut({priority:i,onSubmit:async l=>{await w.put(`/api/priorities/${i.id}`,l),D("Priority updated"),await t.refresh()}})},n=async i=>{if(await se(`Delete priority "${i.name}"?`,{title:"Delete priority"}))try{await w.del(`/api/priorities/${i.id}`),D("Priority deleted"),await t.refresh()}catch(E){D(E.message,"error")}};e.querySelector("#newPriorityBtn").addEventListener("click",s)}}});var Xt={};be(Xt,{default:()=>Oa});var Oa,Zt=Z(()=>{ie();Q();ae();qe();De();kt();tt();et();Oa={async mount(e,t){let a=Number(t.id),[s,r,n]=await Promise.all([w.get(`/api/projects/${a}`),w.get("/api/stakeholders"),w.get("/api/priorities")]),i="overview",l=()=>{e.innerHTML=`
        <div class="detail-header">
          <div class="info-main">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <h1>${d(s.name)}</h1>
              ${ee(s.status)}
              ${s.delayed?'<span class="badge" style="background:#dc26261a;color:#dc2626">Delayed</span>':""}
            </div>
            <div class="detail-meta">
              <span><strong>${d(s.projectCode)}</strong></span>
              <span>Planned: ${V(s.plannedStartDate)} \u2192 ${V(s.plannedEndDate)}</span>
              <span>Planned duration: ${s.plannedDurationDays??"\u2014"} days</span>
              ${s.actualStartDate?`<span>Actual: ${V(s.actualStartDate)} \u2192 ${V(s.actualEndDate)}</span>`:""}
              ${s.actualDurationDays!=null?`<span>Actual duration: ${s.actualDurationDays} days</span>`:""}
            </div>
          </div>
          <div class="detail-stats">
            <div class="card stat-card"><div class="stat-label">Progress</div><div class="stat-value" style="font-size:20px">${s.progressPercentage}%</div></div>
            <div class="card stat-card"><div class="stat-label">Tasks</div><div class="stat-value" style="font-size:20px">${s.taskCount}</div></div>
            <div class="card stat-card"><div class="stat-label">Risks</div><div class="stat-value" style="font-size:20px">${s.riskCount}</div></div>
          </div>
        </div>
        <div class="tabs">
          <button class="tab" data-tab="overview">Overview</button>
          <button class="tab" data-tab="tasks">Tasks (${s.taskCount})</button>
          <button class="tab" data-tab="gantt">Gantt Chart</button>
          <button class="tab" data-tab="stakeholders">Stakeholders (${s.stakeholders.length})</button>
          <button class="tab" data-tab="risks">Risks (${s.riskCount})</button>
        </div>
        <div id="tabContent"></div>
      `,e.querySelectorAll(".tab").forEach(g=>{g.addEventListener("click",()=>{i=g.dataset.tab,C()})}),E(),C()},E=()=>{e.querySelectorAll(".tab").forEach(g=>{g.classList.toggle("active",g.dataset.tab===i)})},C=()=>{E();let g=e.querySelector("#tabContent");({overview:c,tasks:u,gantt:x,stakeholders:L,risks:U}[i]||c)(g)},c=async g=>{g.innerHTML=de();let m=await w.get(`/api/projects/${s.id}`);Object.assign(s,m);let $={};m.tasks.forEach(v=>{$[v.status]=($[v.status]||0)+1});let S=(m.stakeholders||[]).map(v=>`<span class="chip"><i class="bi bi-person"></i> ${d(v.name)}${v.position?` \u2014 ${d(v.position)}`:""}</span>`).join("");g.innerHTML=`
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h2>Project Information</h2></div>
            <div class="card-body">
              <dl class="kv">
                <dt>Description</dt><dd>${d(m.description||"\u2014")}</dd>
                <dt>Status</dt><dd>${ee(m.status)}</dd>
                <dt>Progress</dt><dd>${ve(m.progressPercentage)}</dd>
                <dt>Planned duration</dt><dd>${m.plannedDurationDays??"\u2014"} days</dd>
                <dt>Actual duration</dt><dd>${m.actualDurationDays!=null?`${m.actualDurationDays} days`:"\u2014"}</dd>
                <dt>Created</dt><dd>${V(m.createdAt)}</dd>
              </dl>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h2>Stakeholders</h2></div>
            <div class="card-body">
              <div class="chip-row">${S||'<span class="text-muted">No stakeholders assigned</span>'}</div>
              <div style="margin-top:16px">
                <button class="btn btn-secondary btn-sm" id="editProjectBtn">Edit Project</button>
              </div>
            </div>
          </div>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><h2>Task Summary</h2></div>
            <div class="card-body">
              <div class="stat-grid" style="margin-bottom:0">
                ${Te.map(v=>`<div class="card stat-card"><div class="stat-label" style="color:${ye[v]||"#94a3b8"}">${v.replace("_"," ")}</div><div class="stat-value" style="font-size:20px">${$[v]||0}</div></div>`).join("")}
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h2>Open Risks</h2></div>
            <div class="card-body">
              ${m.risks.filter(v=>v.status==="OPEN").length?m.risks.filter(v=>v.status==="OPEN").slice(0,5).map(v=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
                        <span>${d(v.title)}</span>
                        <span class="badge" style="background:${v.riskLevel==="CRITICAL"?"#dc2626":v.riskLevel==="HIGH"?"#f97316":"#64748b"}1a;color:${v.riskLevel==="CRITICAL"?"#dc2626":v.riskLevel==="HIGH"?"#ea580c":"#64748b"}">${v.riskLevel}</span>
                      </div>`).join(""):'<div class="empty-state"><i class="bi bi-emoji-smile" style="font-size:28px"></i><br/>No open risks</div>'}
            </div>
          </div>
        </div>`,g.querySelector("#editProjectBtn")?.addEventListener("click",()=>{Fe({project:s,stakeholders:r,onSubmit:async v=>{await w.put(`/api/projects/${s.id}`,v),D("Project updated"),l()}})})},u=async g=>{g.innerHTML=de();let m=await w.get(`/api/projects/${s.id}/tasks`),$={...s,tasks:m};g.innerHTML=`
        <div class="toolbar">
          <button class="btn btn-primary" id="newTaskBtn">+ New Task</button>
          <span class="spacer"></span>
          <span class="text-muted" style="font-size:13px" id="taskCountLabel">${m.length} task(s)</span>
        </div>
        <div class="card"><div id="tasksTable"></div></div>
      `,pe(g.querySelector("#tasksTable"),{columns:[{key:"taskCode",label:"Code",render:f=>`<strong>${d(f.taskCode)}</strong>`},{key:"name",label:"Task"},{key:"priority",label:"Priority",sortable:!1,render:f=>Ze(f.priority)},{key:"status",label:"Status",render:f=>ee(f.status)},{key:"progressPercentage",label:"Progress",render:f=>ve(f.progressPercentage)},{key:"plannedStartDate",label:"Planned",render:f=>`${V(f.plannedStartDate)}<br/><span style="color:var(--text-muted)">\u2192 ${V(f.plannedEndDate)}</span>`},{key:"dueDate",label:"Due",render:f=>V(f.dueDate)},{key:"overdue",label:"Overdue",sortable:!1,render:f=>f.overdue?'<span class="badge" style="background:#dc26261a;color:#dc2626">Overdue</span>':"\u2014"},{key:"dependencies",label:"Dependencies",sortable:!1,render:f=>f.dependencies.length?`<span title="${d(f.dependencies.map(_=>_.name).join(", "))}">${d(f.dependencies.map(_=>_.taskCode).join(", "))}</span>`:"\u2014"}],fetch:f=>w.get(`/api/projects/${s.id}/tasks?${f}`),onRowClick:f=>S(f.id),actions:[{label:"Edit",className:"btn-secondary",onClick:f=>I(f)},{label:"Delete",className:"btn-danger",onClick:f=>y(f)}],emptyText:"No tasks yet.",onCount:f=>{g.querySelector("#taskCountLabel").textContent=`${f} task(s)`}});let S=async f=>{let{openModal:_}=await Promise.resolve().then(()=>(ae(),Qe)),A=await w.get(`/api/tasks/${f}`);_({title:`${A.taskCode} \u2014 ${A.name}`,wide:!0,body:`
            <dl class="kv">
              <dt>Description</dt><dd>${d(A.description||"\u2014")}</dd>
              <dt>Priority</dt><dd>${Ze(A.priority)}</dd>
              <dt>Status</dt><dd>${ee(A.status)} ${A.overdue?'<span class="badge" style="background:#dc26261a;color:#dc2626">Overdue</span>':""}</dd>
              <dt>Progress</dt><dd>${ve(A.progressPercentage)}</dd>
              <dt>Planned</dt><dd>${V(A.plannedStartDate)} \u2192 ${V(A.plannedEndDate)}</dd>
              <dt>Actual</dt><dd>${A.actualStartDate?`${V(A.actualStartDate)} \u2192 ${V(A.actualEndDate)}`:"\u2014"}</dd>
              <dt>Due date</dt><dd>${V(A.dueDate)}</dd>
              <dt>Dependencies</dt><dd>${A.dependencies.length?A.dependencies.map(q=>d(q.name)).join(", "):"\u2014"}</dd>
              <dt>Stakeholders</dt><dd>${A.stakeholders.length?A.stakeholders.map(q=>`${d(q.name)} <span class="text-muted">(${q.role})</span>`).join(", "):"\u2014"}</dd>
            </dl>`})},v=()=>{ke({project:$,priorities:n,stakeholders:r,onSubmit:async f=>{await w.post(`/api/projects/${s.id}/tasks`,f),D("Task created"),h()}})},I=f=>{ke({task:f,project:$,priorities:n,stakeholders:r,onSubmit:async _=>{await w.put(`/api/tasks/${f.id}`,_),D("Task updated"),h()}})},y=async f=>{if(await se(`Delete task "${f.name}"?`,{title:"Delete task"}))try{await w.del(`/api/tasks/${f.id}`),D("Task deleted"),h()}catch(A){D(A.message,"error")}};g.querySelector("#newTaskBtn").addEventListener("click",v)},x=async g=>{g.innerHTML=de();let m=async()=>{let I=await w.get(`/api/projects/${s.id}/gantt`),y={...s,tasks:I.tasks};Se(g,I,{onNewTask:()=>$(y),onTaskClick:f=>S(f,y),onReschedule:(f,_)=>v(f,_),onReorder:async(f,_)=>{try{await w.put(`/api/projects/${f}/tasks/reorder`,{taskIds:_}),D("Task order updated"),h()}catch(A){D(A.message,"error"),h()}}})},$=I=>{ke({project:I,priorities:n,stakeholders:r,onSubmit:async y=>{await w.post(`/api/projects/${s.id}/tasks`,y),D("Task created"),h()}})},S=(I,y)=>{ke({task:I,project:y,priorities:n,stakeholders:r,onSubmit:async f=>{await w.put(`/api/tasks/${I.id}`,f),D("Task updated"),h()},onDelete:async()=>{await w.del(`/api/tasks/${I.id}`),D("Task deleted"),h()}})},v=async(I,y)=>{let f=(_,A)=>{let q=new Date(_);return q.setUTCHours(0,0,0,0),q.setUTCDate(q.getUTCDate()+A),q.toISOString().slice(0,10)};try{await w.put(`/api/tasks/${I.id}`,{plannedStartDate:f(I.plannedStartDate,y),plannedEndDate:Le(f(I.plannedEndDate,y)),dueDate:Le(f(I.dueDate,y))}),D(`${I.taskCode} rescheduled by ${y} day(s)`),h()}catch(_){D(_.message,"error"),h()}};await m()},L=async g=>{g.innerHTML=de();let m=await w.get(`/api/projects/${s.id}`),$=new Set((m.stakeholders||[]).map(q=>q.stakeholderId)),S=new Set($),v=["#4f46e5","#0ea5e9","#16a34a","#d97706","#dc2626","#7c3aed"],I=q=>(q||"?").split(/\s+/).map(W=>W[0]).filter(Boolean).slice(0,2).join("").toUpperCase(),y=(q,W)=>{let k=S.has(q.id)?"checked":"",P=[q.position,q.department].filter(Boolean).join(" \xB7 "),j=v[W%v.length];return`<label class="stk-row" data-id="${q.id}">
          <input type="checkbox" value="${q.id}" ${k} />
          <span class="stk-avatar" style="background:${j}1f;color:${j}" aria-hidden="true">${d(I(q.name))}</span>
          <span class="stk-info">
            <span class="stk-name">${d(q.name)}</span>
            <span class="stk-meta">${d(P||"Stakeholder")}</span>
          </span>
          <span class="stk-email">${d(q.email)}</span>
          <span class="stk-check" aria-hidden="true"><i class="bi bi-check-lg"></i></span>
        </label>`},f=(q="")=>{let W=q.trim().toLowerCase(),k=W?r.filter(j=>[j.name,j.position,j.department,j.organization,j.email].filter(Boolean).some(R=>String(R).toLowerCase().includes(W))):r,P=g.querySelector("#stkList");P.innerHTML=k.length?k.map((j,R)=>y(j,R)).join(""):`<div class="empty-state" role="status"><div class="empty-icon"><i class="bi bi-people"></i></div>${r.length?`No stakeholders match &quot;${d(q.trim())}&quot;.`:"No stakeholders defined yet."}<br/><button type="button" class="btn btn-secondary btn-sm" id="stkEmptyAction">${r.length?"Clear search":"Create stakeholders"}</button></div>`,g.querySelector("#stkResults").textContent=k.length?`${k.length} of ${r.length} shown`:"",g.querySelector("#stkEmptyAction")?.addEventListener("click",()=>{r.length?(g.querySelector("#stkSearch").value="",f()):location.hash="#/stakeholders"})};g.innerHTML=`
        <div class="card">
          <div class="card-header stk-header">
            <h2>Assign Stakeholders to Project</h2>
            <span class="stk-count" id="stkCount">${$.size} of ${r.length} assigned</span>
            <span class="spacer"></span>
            <button class="btn btn-primary btn-sm" id="saveStakeholders"><i class="bi bi-check-lg"></i> Save</button>
          </div>
          <div class="card-body">
            <div class="stk-toolbar">
              <div class="stk-search">
                <i class="bi bi-search"></i>
                <input type="search" id="stkSearch" placeholder="Search by name, role, department\u2026" aria-label="Search stakeholders" />
              </div>
              <span class="stk-results" id="stkResults" aria-live="polite"></span>
            </div>
            <div class="stk-list" id="stkList"></div>
          </div>
        </div>`,f(),g.querySelector("#stkSearch").addEventListener("input",q=>f(q.target.value));let _=g.querySelector("#stkCount");g.querySelector("#stkList").addEventListener("change",q=>{if(q.target.matches('input[type="checkbox"]')){let W=Number(q.target.value);q.target.checked?S.add(W):S.delete(W),_.textContent=`${S.size} of ${r.length} assigned`}});let A=g.querySelector("#saveStakeholders");A.addEventListener("click",async()=>{let q=[...S];A.disabled=!0,A.classList.add("loading"),A.innerHTML='<i class="bi bi-arrow-repeat"></i> Saving\u2026';try{await w.put(`/api/projects/${s.id}`,{stakeholderIds:q}),D("Stakeholders updated"),s.stakeholders=q.map(W=>({stakeholderId:W,name:r.find(k=>k.id===W)?.name||""})),l()}catch(W){D(W.message,"error"),A.disabled=!1,A.classList.remove("loading"),A.innerHTML='<i class="bi bi-check-lg"></i> Save'}})},U=async g=>{g.innerHTML=de();let m=await w.get(`/api/projects/${s.id}/risks`);g.innerHTML=`
        <div class="toolbar">
          <button class="btn btn-primary" id="newRiskBtn">+ New Risk</button>
          <span class="spacer"></span>
          <span class="text-muted" style="font-size:13px" id="riskCountLabel">${m.length} risk(s)</span>
        </div>
        <div class="grid-2" style="margin-bottom:16px">
          <div class="card"><div class="card-header"><h2>Risk Matrix (open risks)</h2></div>
            <div class="card-body"><div id="riskMatrix"></div></div></div>
          <div class="card"><div class="card-header"><h2>Risk Details</h2></div>
            <div class="card-body"><div id="riskTable"></div></div></div>
        </div>
      `,je(g.querySelector("#riskMatrix"),m.filter(y=>y.status==="OPEN").map(y=>({probability:y.probability,impact:y.impact,count:1}))),pe(g.querySelector("#riskTable"),{columns:[{key:"title",label:"Risk"},{key:"riskScore",label:"Score",render:y=>`<strong>${y.riskScore}</strong>`},{key:"riskLevel",label:"Level",render:y=>Ue(y.riskLevel)},{key:"status",label:"Status",render:y=>ee(y.status)},{key:"owner",label:"Owner",sortable:!1,render:y=>d(y.owner?.name||"\u2014")}],fetch:y=>w.get(`/api/projects/${s.id}/risks?${y}`),onRowClick:y=>$(y),actions:[{label:"Edit",className:"btn-secondary",onClick:y=>v(y)},{label:"Delete",className:"btn-danger",onClick:y=>I(y)}],emptyText:"No risks registered.",onCount:y=>{g.querySelector("#riskCountLabel").textContent=`${y} risk(s)`}});let $=async y=>{let{openModal:f}=await Promise.resolve().then(()=>(ae(),Qe));f({title:y.title,wide:!0,body:`
            <dl class="kv">
              <dt>Description</dt><dd>${d(y.description||"\u2014")}</dd>
              <dt>Probability / Impact</dt><dd>${y.probability} \xD7 ${y.impact} = <strong>${y.riskScore}</strong> (${y.riskLevel})</dd>
              <dt>Status</dt><dd>${ee(y.status)}</dd>
              <dt>Owner</dt><dd>${d(y.owner?.name||"\u2014")}</dd>
              <dt>Identified</dt><dd>${V(y.identifiedDate)}</dd>
              ${y.resolvedDate?`<dt>Resolved</dt><dd>${V(y.resolvedDate)}</dd>`:""}
              <dt>Mitigation</dt><dd>${d(y.mitigationPlan||"\u2014")}</dd>
              <dt>Contingency</dt><dd>${d(y.contingencyPlan||"\u2014")}</dd>
            </dl>`})},S=()=>{Me({stakeholders:r,onSubmit:async y=>{await w.post(`/api/projects/${s.id}/risks`,y),D("Risk created"),U(g),h()}})},v=y=>{Me({risk:y,stakeholders:r,onSubmit:async f=>{await w.put(`/api/risks/${y.id}`,f),D("Risk updated"),U(g),h()}})},I=async y=>{if(await se(`Delete risk "${y.title}"?`,{title:"Delete risk"}))try{await w.del(`/api/risks/${y.id}`),D("Risk deleted"),U(g),h()}catch(_){D(_.message,"error")}};g.querySelector("#newRiskBtn").addEventListener("click",S)},h=async()=>{let g=await w.get(`/api/projects/${s.id}`);Object.assign(s,g),l()};l()}}});var Jt={};be(Jt,{default:()=>Ha});var Ha,Qt=Z(()=>{ie();Q();ae();qe();De();Ye();Ha={async mount(e){let[t]=await Promise.all([w.get("/api/stakeholders")]);e.innerHTML=`
      <div class="page-title">Projects</div>
      <div class="page-subtitle" id="projectsCount">Loading\u2026</div>
      <div class="toolbar">
        <button class="btn btn-primary" id="newProjectBtn">+ New Project</button>
      </div>
      <div class="card"><div id="projectsTable"></div></div>
    `;let a=pe(e.querySelector("#projectsTable"),{columns:[{key:"projectCode",label:"Code",render:i=>`<strong>${d(i.projectCode)}</strong>`},{key:"name",label:"Name"},{key:"status",label:"Status",render:i=>ee(i.status)},{key:"progressPercentage",label:"Progress",render:i=>ve(i.progressPercentage)},{key:"plannedStartDate",label:"Planned Start",render:i=>V(i.plannedStartDate)},{key:"plannedEndDate",label:"Planned End",render:i=>V(i.plannedEndDate)},{key:"taskCount",label:"Tasks"},{key:"riskCount",label:"Risks"},{key:"delayed",label:"Delay",sortable:!1,render:i=>i.delayed?'<span class="badge" style="background:#dc26261a;color:#dc2626">Delayed</span>':"\u2014"}],fetch:i=>w.get(`/api/projects?${i}`),onRowClick:i=>Ve(`projects/${i.id}`),actions:[{label:"Edit",className:"btn-secondary",onClick:i=>r(i)},{label:"Delete",className:"btn-danger",onClick:i=>n(i)}],emptyText:'No projects yet. Click "New Project" to create one.',onCount:i=>{e.querySelector("#projectsCount").textContent=`${i} project(s)`}}),s=()=>{Fe({stakeholders:t,onSubmit:async i=>{await w.post("/api/projects",i),await a.refresh()}})},r=i=>{Fe({project:i,stakeholders:t,onSubmit:async l=>{await w.put(`/api/projects/${i.id}`,l),await a.refresh()}})},n=async i=>{if(await se(`Delete project "${i.name}"? This also deletes its tasks, dependencies and risks.`,{title:"Delete project",confirmText:"Delete"}))try{await w.del(`/api/projects/${i.id}`),D("Project deleted"),await a.refresh()}catch(E){D(E.message,"error")}};e.querySelector("#newProjectBtn").addEventListener("click",s)}}});var ea={};be(ea,{default:()=>Ba});var Ba,ta=Z(()=>{ie();Q();ae();qe();De();tt();Ie();et();Ba={async mount(e){let[t,a,s]=await Promise.all([w.get("/api/projects"),w.get("/api/stakeholders"),w.get("/api/dashboard/risks")]);e.innerHTML=`
      <div class="page-title">Risks</div>
      <div class="page-subtitle">Risk score = probability \xD7 impact</div>
      <div class="stat-grid">
        <div class="card stat-card ${s.open>0?"danger":"success"}"><div class="stat-label">Open Risks</div><div class="stat-value">${s.open}</div></div>
        <div class="card stat-card ${s.critical>0?"danger":""}"><div class="stat-label">Critical</div><div class="stat-value">${s.critical}</div></div>
        <div class="card stat-card ${s.high>0?"warning":""}"><div class="stat-label">High</div><div class="stat-value">${s.high}</div></div>
        <div class="card stat-card primary"><div class="stat-label">Mitigated</div><div class="stat-value">${s.mitigated}</div></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><h2>Risk Matrix (open risks)</h2></div>
          <div class="card-body"><div id="riskMatrix"></div></div></div>
        <div class="card"><div class="card-header"><h2>Risk Distribution by Level</h2></div>
          <div class="card-body"><div id="riskDistribution"></div></div></div>
      </div>
      <div class="toolbar">
        <button class="btn btn-primary" id="newRiskBtn">+ New Risk</button>
        <span class="spacer"></span>
        <div class="filters">
          ${te({name:"filterProject",options:[["","All projects"],...t.map(c=>[c.id,`${c.projectCode} \u2014 ${c.name}`])],value:"",placeholder:"All projects",attrs:'id="filterProject"'})}
          ${te({name:"filterStatus",options:[["","All statuses"],...Xe.map(c=>[c,c])],value:"",placeholder:"All statuses",attrs:'id="filterStatus"'})}
        </div>
      </div>
      <div class="card"><div id="risksTable"></div></div>
    `,ce(e),je(e.querySelector("#riskMatrix"),s.matrix),Pe(e.querySelector("#riskDistribution"),s.byLevel.map(c=>({label:c.level,value:c.count,color:Ce[c.level]||"#94a3b8"})));let r={projectId:"",status:""},n=pe(e.querySelector("#risksTable"),{columns:[{key:"title",label:"Risk",render:c=>`<strong>${d(c.title)}</strong>`},{key:"project",label:"Project",sortable:!1,render:c=>d(c.project?.projectCode||"")},{key:"probability",label:"P",render:c=>c.probability},{key:"impact",label:"I",render:c=>c.impact},{key:"riskScore",label:"Score",render:c=>`<strong>${c.riskScore}</strong>`},{key:"riskLevel",label:"Level",render:c=>Ue(c.riskLevel)},{key:"status",label:"Status",render:c=>ee(c.status)},{key:"owner",label:"Owner",sortable:!1,render:c=>d(c.owner?.name||"\u2014")},{key:"identifiedDate",label:"Identified",render:c=>V(c.identifiedDate)}],fetch:c=>w.get(`/api/risks?${c}`),extraParams:{projectId:r.projectId,status:r.status},onRowClick:c=>i(c),actions:[{label:"Edit",className:"btn-secondary",onClick:c=>E(c)},{label:"Delete",className:"btn-danger",onClick:c=>C(c)}],emptyText:"No risks match the filters."}),i=async c=>{let{openModal:u}=await Promise.resolve().then(()=>(ae(),Qe)),x=await w.get(`/api/risks/${c.id}`);u({title:x.title,wide:!0,body:`
          <dl class="kv">
            <dt>Project</dt><dd>${d(x.project?.name||"")}</dd>
            <dt>Description</dt><dd>${d(x.description||"\u2014")}</dd>
            <dt>Probability / Impact</dt><dd>${x.probability} \xD7 ${x.impact} = <strong>${x.riskScore}</strong> (${x.riskLevel})</dd>
            <dt>Status</dt><dd>${ee(x.status)}</dd>
            <dt>Owner</dt><dd>${d(x.owner?.name||"\u2014")}</dd>
            <dt>Identified</dt><dd>${V(x.identifiedDate)}</dd>
            ${x.resolvedDate?`<dt>Resolved</dt><dd>${V(x.resolvedDate)}</dd>`:""}
            <dt>Mitigation Plan</dt><dd>${d(x.mitigationPlan||"\u2014")}</dd>
            <dt>Contingency Plan</dt><dd>${d(x.contingencyPlan||"\u2014")}</dd>
          </dl>`})},l=()=>{Me({stakeholders:a,onSubmit:async c=>{if(!r.projectId){D("Select a project filter first (or create the risk from the project page)","error");return}await w.post(`/api/projects/${r.projectId}/risks`,c),D("Risk created"),await n.refresh()}})},E=c=>{Me({risk:c,stakeholders:a,onSubmit:async u=>{await w.put(`/api/risks/${c.id}`,u),D("Risk updated"),await n.refresh()}})},C=async c=>{if(await se(`Delete risk "${c.title}"?`,{title:"Delete risk"}))try{await w.del(`/api/risks/${c.id}`),D("Risk deleted"),await n.refresh()}catch(x){D(x.message,"error")}};e.querySelector("#newRiskBtn").addEventListener("click",l),e.querySelector("#filterProject").addEventListener("change",c=>{r.projectId=c.target.value,n.setExtraParams({projectId:r.projectId,status:r.status})}),e.querySelector("#filterStatus").addEventListener("change",c=>{r.status=c.target.value,n.setExtraParams({projectId:r.projectId,status:r.status})})}}});var aa={};be(aa,{default:()=>_a});var _a,sa=Z(()=>{ie();Q();ae();qe();De();_a={async mount(e){e.innerHTML=`
      <div class="page-title">Stakeholders</div>
      <div class="page-subtitle">People involved in projects and tasks</div>
      <div class="toolbar">
        <button class="btn btn-primary" id="newStakeholderBtn">+ New Stakeholder</button>
      </div>
      <div class="card"><div id="stakeholdersTable"></div></div>
    `;let t=pe(e.querySelector("#stakeholdersTable"),{columns:[{key:"name",label:"Name",render:n=>`<strong>${d(n.name)}</strong>`},{key:"email",label:"Email"},{key:"position",label:"Position",render:n=>d(n.position||"\u2014")},{key:"department",label:"Department",render:n=>d(n.department||"\u2014")},{key:"organization",label:"Organization",render:n=>d(n.organization||"\u2014")},{key:"phone",label:"Phone",sortable:!1,render:n=>d(n.phone||"\u2014")},{key:"projectCount",label:"Projects"},{key:"taskCount",label:"Tasks"}],fetch:n=>w.get(`/api/stakeholders?${n}`),actions:[{label:"Edit",className:"btn-secondary",onClick:n=>s(n)},{label:"Delete",className:"btn-danger",onClick:n=>r(n)}],emptyText:"No stakeholders yet."}),a=()=>{pt({onSubmit:async n=>{await w.post("/api/stakeholders",n),D("Stakeholder created"),await t.refresh()}})},s=n=>{pt({stakeholder:n,onSubmit:async i=>{await w.put(`/api/stakeholders/${n.id}`,i),D("Stakeholder updated"),await t.refresh()}})},r=async n=>{if(await se(`Delete stakeholder "${n.name}"? Their project/task links will be removed.`,{title:"Delete stakeholder"}))try{await w.del(`/api/stakeholders/${n.id}`),D("Stakeholder deleted"),await t.refresh()}catch(l){D(l.message,"error")}};e.querySelector("#newStakeholderBtn").addEventListener("click",a)}}});ie();Ye();Q();var Ua=Mt({"./pages/DashboardPage.js":()=>Promise.resolve().then(()=>(Ot(),Nt)),"./pages/GanttPage.js":()=>Promise.resolve().then(()=>(Gt(),Wt)),"./pages/LoginPage.js":()=>Promise.resolve().then(()=>(St(),$t)),"./pages/PrioritiesPage.js":()=>Promise.resolve().then(()=>(Yt(),Vt)),"./pages/ProjectDetailPage.js":()=>Promise.resolve().then(()=>(Zt(),Xt)),"./pages/ProjectsPage.js":()=>Promise.resolve().then(()=>(Qt(),Jt)),"./pages/RisksPage.js":()=>Promise.resolve().then(()=>(ta(),ea)),"./pages/StakeholdersPage.js":()=>Promise.resolve().then(()=>(sa(),aa))});var wt=document.getElementById("app"),Dt="pm_theme";function Et(e){document.documentElement.dataset.theme=e,localStorage.setItem(Dt,e);let t=document.getElementById("themeToggle");t&&(t.innerHTML=e==="dark"?'<i class="bi bi-sun"></i>':'<i class="bi bi-moon-stars"></i>'),document.querySelectorAll(".theme-menu button").forEach(a=>{a.classList.toggle("active",a.dataset.themeChoice===e)})}Et(localStorage.getItem(Dt)||"light");var za=[{href:"#/dashboard",label:"Dashboard",icon:"bi-speedometer2"},{href:"#/projects",label:"Projects",icon:"bi-folder"},{href:"#/gantt",label:"Gantt",icon:"bi-calendar3"},{href:"#/stakeholders",label:"Stakeholders",icon:"bi-people"},{href:"#/priorities",label:"Priorities",icon:"bi-tags"},{href:"#/risks",label:"Risks",icon:"bi-exclamation-triangle"}];function Fa(){return'<div class="login-wrap"></div>'}function Ka(){return`
    <header class="app-header">
      <button class="icon-btn sidebar-toggle" id="sidebarToggle" aria-label="Toggle menu"><i class="bi bi-list"></i></button>
      <div class="brand"><span class="brand-logo"><i class="bi bi-bar-chart"></i></span> ProjectFlow</div>
      <div class="header-right">
        <a class="header-link" href="/api-docs" target="_blank" rel="noopener">API Docs</a>
        <span class="header-user"><i class="bi bi-person"></i> <span id="currentUser">admin</span></span>
        <div class="theme-menu-wrap">
          <button class="icon-btn theme-toggle" id="themeToggle" aria-label="Switch theme" title="Switch theme"><i class="bi bi-moon-stars"></i></button>
          <div class="theme-menu" id="themeMenu" hidden>
            <button type="button" data-theme-choice="light"><i class="bi bi-sun"></i> Light</button>
            <button type="button" data-theme-choice="dark"><i class="bi bi-moon-stars"></i> Dark</button>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="logoutBtn"><i class="bi bi-box-arrow-right"></i> Logout</button>
      </div>
    </header>
    <div class="layout" id="layout">
      <aside class="sidebar" id="sidebar">
        <nav class="nav">${za.map(t=>`<a class="nav-item" href="${t.href}" data-nav="${t.href}">
      <span class="nav-icon"><i class="bi ${t.icon}"></i></span><span>${t.label}</span>
    </a>`).join("")}</nav>
        <div class="sidebar-footer">
          <div class="sidebar-footnote">Project Management System</div>
        </div>
      </aside>
      <main class="main" id="main"></main>
    </div>
  `}async function Lt(){let e=At(),t=it();if(!t&&e.name!=="login"){location.hash="#/login";return}if(t&&e.name==="login"){location.hash="#/dashboard";return}if(e.name==="login"){wt.innerHTML=Fa();let i=wt.querySelector(".login-wrap"),{default:l}=await Promise.resolve().then(()=>(St(),$t));await l.mount(i);return}wt.innerHTML=Ka(),Wa(e),document.getElementById("sidebarToggle").addEventListener("click",()=>{document.getElementById("layout").classList.toggle("sidebar-open")}),document.getElementById("logoutBtn").addEventListener("click",()=>{_e(null),location.hash="#/login"}),Et(localStorage.getItem(Dt)||"light");let a=document.getElementById("themeToggle"),s=document.getElementById("themeMenu");a.addEventListener("click",i=>{i.stopPropagation(),s.hidden=!s.hidden}),s.addEventListener("click",i=>{let l=i.target.closest("[data-theme-choice]");l&&(Et(l.dataset.themeChoice),s.hidden=!0)});let r=localStorage.getItem("pm_user");r&&(document.getElementById("currentUser").textContent=r);let n=document.getElementById("main");n.innerHTML='<div class="page-loading">Loading\u2026</div>';try{let{default:i}=await Ua(`./pages/${e.page}.js`);await i.mount(n,e.params||{})}catch(i){console.error(i),n.innerHTML=`
      <div class="page-error">
        <h2>Something went wrong</h2>
        <p>${d(i.message||"Unknown error")}</p>
        <button class="btn btn-primary" onclick="location.hash='#/dashboard'">Go to Dashboard</button>
      </div>`}}function Wa(e){let a={dashboard:"#/dashboard",projects:"#/projects",projectDetail:"#/projects",gantt:"#/gantt",stakeholders:"#/stakeholders",priorities:"#/priorities",risks:"#/risks"}[e.name];document.querySelectorAll(".nav-item").forEach(s=>{s.classList.toggle("active",s.dataset.nav===a)})}document.addEventListener("click",e=>{if(!e.target.closest||e.target.closest(".theme-menu-wrap"))return;let t=document.getElementById("themeMenu");t&&(t.hidden=!0)});document.addEventListener("keydown",e=>{if(e.key==="Escape"){let t=document.getElementById("themeMenu");t&&(t.hidden=!0)}});window.addEventListener("hashchange",Lt);window.addEventListener("DOMContentLoaded",Lt);Lt();})();
