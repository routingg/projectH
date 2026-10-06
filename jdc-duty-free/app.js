(() => {
  const D = window.JDC;
  const $ = (id) => document.getElementById(id);
  const zoneById = Object.fromEntries(D.zones.map((z) => [z.id, z]));
  const catById = Object.fromEntries(D.categories.map((c) => [c.id, c]));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  $("hrs").textContent = `${D.hours.open}–${D.hours.close}`;
  $("upd").textContent = D.updated;

  $("promos").innerHTML = D.promos.map((p) =>
    `<div class="promo"><b>${esc(p.title)}</b><div>${esc(p.body)}</div><small>📍 ${esc(zoneById[p.zone].name)}</small></div>`).join("");

  // 브랜드 목록
  let cat = "all";
  const chips = $("chips");
  chips.innerHTML = [{ id: "all", name: "전체", icon: "✨" }, ...D.categories]
    .map((c) => `<button class="chip" data-c="${c.id}" aria-pressed="${c.id === "all"}">${c.icon} ${esc(c.name)}</button>`).join("");
  function renderBrands() {
    const q = $("q").value.trim().toLowerCase();
    const list = D.brands.filter((b) => (cat === "all" || b.cat === cat) &&
      (!q || (b.name + b.tag + catById[b.cat].name).toLowerCase().includes(q)));
    $("grid").innerHTML = list.length ? list.map((b) =>
      `<article class="card">${b.pick ? '<span class="pick">★ PICK</span>' : ""}<h4>${esc(b.name)}</h4>
       <div class="m">${esc(catById[b.cat].name)} · ${esc(b.tag)}</div>
       <span class="badge">${esc(zoneById[b.zone].name)} · ${esc(zoneById[b.zone].gate)}</span></article>`).join("")
      : '<p class="sub">검색 결과가 없습니다.</p>';
  }
  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    cat = b.dataset.c;
    chips.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
    renderBrands();
  });
  $("q").addEventListener("input", renderBrands);
  renderBrands();

  // 매장 지도
  $("zones").innerHTML = D.zones.map((z) => {
    const bs = D.brands.filter((b) => b.zone === z.id);
    return `<button class="zone" aria-expanded="false" data-z="${z.id}"><b>${esc(z.name)}</b> <small>${esc(z.gate)}</small>
      <div class="m">${esc(z.note)}</div><ul hidden>${bs.map((b) => `<li>${esc(b.name)} (${esc(b.tag)})</li>`).join("")}</ul></button>`;
  }).join("");
  $("zones").addEventListener("click", (e) => {
    const b = e.target.closest(".zone"); if (!b) return;
    const open = b.getAttribute("aria-expanded") === "true";
    b.setAttribute("aria-expanded", !open);
    b.querySelector("ul").hidden = open;
  });

  // 사업 소개
  $("pillars").innerHTML = D.business.pillars.map((p) => `<div class="pillar"><h4>${esc(p.t)}</h4><p>${esc(p.d)}</p></div>`).join("");
  $("flow").innerHTML = D.business.flow.map((f) => `<li>${esc(f)}</li>`).join("");
  $("bnote").textContent = D.business.note;

  // 플래너
  $("pcats").innerHTML = D.categories.map((c) =>
    `<label><input type="checkbox" value="${c.id}"${["beauty", "jeju"].includes(c.id) ? " checked" : ""}> ${c.icon} ${esc(c.name)}</label>`).join("");
  const d = new Date();
  $("now").value = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmt = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  $("pf").addEventListener("submit", (e) => {
    e.preventDefault();
    const out = $("result");
    const picked = [...$("pcats").querySelectorAll("input:checked")].map((i) => i.value);
    if (!picked.length) { out.innerHTML = '<p class="warn">관심 카테고리를 하나 이상 선택하세요.</p>'; return; }
    const start = toMin($("now").value);
    const end = toMin($("dep").value) - Number($("board").value);
    const avail = end - start;
    if (avail <= 0) { out.innerHTML = '<p class="warn">탑승 마감까지 남은 시간이 없습니다. 출발 시간을 확인하세요.</p>'; return; }

    // 구역별 쇼핑 대상 구성: 서편→중앙→동편 순서로 이동
    const stops = D.zones.map((z) => {
      const cs = picked.filter((c) => D.brands.some((b) => b.cat === c && b.zone === z.id));
      return { z, cs, need: cs.reduce((s, c) => s + catById[c].minutes, 0) };
    }).filter((s) => s.cs.length);
    const walk = (stops.length ? stops[stops.length - 1].z.walk - stops[0].z.walk : 0);
    const totalNeed = stops.reduce((s, x) => s + x.need, 0) + walk;
    const scale = Math.min(1, (avail - walk) / Math.max(1, totalNeed - walk));
    let t = start, prevWalk = stops.length ? stops[0].z.walk : 0, html = "";
    stops.forEach((s, i) => {
      t += s.z.walk - prevWalk; prevWalk = s.z.walk;
      const dur = Math.max(3, Math.round(s.need * scale));
      const names = s.cs.map((c) => D.brands.filter((b) => b.cat === c && b.zone === s.z.id).map((b) => b.name).join(", "));
      html += `<div class="step"><div class="n">${i + 1}</div><div><b>${esc(s.z.name)}</b> <small>${fmt(t)}–${fmt(t + dur)} · ${dur}분 · ${esc(s.z.gate)}</small>
        <ul>${s.cs.map((c, k) => `<li>${catById[c].icon} ${esc(catById[c].name)}: ${esc(names[k])}</li>`).join("")}</ul></div></div>`;
      t += dur;
    });
    const missing = picked.filter((c) => !stops.some((s) => s.cs.includes(c)));
    out.innerHTML = `<p class="sub">쇼핑 가능 시간 <b>${avail}분</b> (${fmt(start)}~${fmt(end)})</p>` + html +
      (scale < 1 ? '<p class="warn">시간이 부족해 구역별 체류 시간을 줄였습니다. 우선순위 카테고리만 선택해 보세요.</p>' : "") +
      (missing.length ? `<p class="warn">매장 정보 없음: ${missing.map((c) => esc(catById[c].name)).join(", ")}</p>` : "") +
      '<p class="note">이동·체류 시간은 안내용 추정값입니다.</p>';
  });
})();
