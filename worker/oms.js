/* Curvas de crecimiento OMS: cálculo de percentiles y gráficas interactivas.
   Usa las tablas LMS de oms-data.js (Patrones OMS 2006 de 0-5 años y
   Referencia OMS 2007 de 5-19 años). */
(function () {
  "use strict";

  const D = window.OMS_DATA || {};
  const Z = [-1.8808, -1.0364, 0, 1.0364, 1.8808]; // z de los percentiles 3, 15, 50, 85 y 97
  const PCT = [3, 15, 50, 85, 97];
  const DAY_MONTHS = 30.4375;

  // ---------- Catálogo: qué tabla se usa a qué edad ----------
  // ages = [desde, hasta) en meses de edad. xmin/xmax = eje X de la gráfica.
  const INDICATORS = {
    wfa: {
      label: "Peso para la edad", tab: "Peso/edad", unit: "kg", yTitle: "Peso (kg)", adjust: true,
      none: "La OMS define peso/edad hasta los 10 años; después usa IMC/edad.",
      ranges: [
        { key: "0_5", label: "0–5 años", data: "wfa_0_5", ages: [0, 61], xmin: 0, xmax: 60, xKind: "age" },
        { key: "5_10", label: "5–10 años", data: "wfa_5_10", ages: [61, 121], xmin: 60, xmax: 120, xKind: "age" },
      ],
    },
    lhfa: {
      label: "Longitud / estatura para la edad", tab: "Talla/edad", unit: "cm", yTitle: "Estatura (cm)", adjust: false,
      ranges: [
        { key: "0_2", label: "0–2 años", data: "lfa_0_2", ages: [0, 24], xmin: 0, xmax: 24, xKind: "age", yTitle: "Longitud (cm)" },
        { key: "2_5", label: "2–5 años", data: "hfa_2_5", ages: [24, 61], xmin: 24, xmax: 60, xKind: "age" },
        { key: "5_19", label: "5–19 años", data: "hfa_5_19", ages: [61, 229], xmin: 60, xmax: 228, xKind: "age" },
      ],
    },
    hcfa: {
      label: "Perímetro cefálico para la edad", tab: "Perímetro cefálico", unit: "cm", yTitle: "Perímetro cefálico (cm)", adjust: false,
      none: "La OMS define el perímetro cefálico solo hasta los 5 años.",
      ranges: [{ key: "0_5", label: "0–5 años", data: "hca_0_5", ages: [0, 61], xmin: 0, xmax: 60, xKind: "age" }],
    },
    bmifa: {
      label: "IMC para la edad", tab: "IMC/edad", unit: "kg/m²", yTitle: "IMC (kg/m²)", adjust: true,
      ranges: [
        { key: "0_5", label: "0–5 años", data: "bmi_0_5", ages: [0, 61], xmin: 0, xmax: 60, xKind: "age" },
        { key: "5_19", label: "5–19 años", data: "bmi_5_19", ages: [61, 229], xmin: 60, xmax: 228, xKind: "age" },
      ],
    },
    wflh: {
      label: "Peso para la longitud / estatura", tab: "Peso/talla", unit: "kg", yTitle: "Peso (kg)", adjust: true,
      none: "La OMS define peso/talla solo hasta los 5 años; usa IMC/edad.",
      ranges: [
        { key: "0_2", label: "Longitud 0–2 años", data: "wfl_0_2", ages: [0, 24], xmin: 45, xmax: 110, xKind: "len", xTitle: "Longitud (cm)" },
        { key: "2_5", label: "Estatura 2–5 años", data: "wfh_2_5", ages: [24, 61], xmin: 65, xmax: 120, xKind: "len", xTitle: "Estatura (cm)" },
      ],
    },
  };
  const ORDER = ["wfa", "lhfa", "hcfa", "bmifa", "wflh"];

  // ---------- Utilidades ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function num(v) {
    if (v === null || v === undefined) return null;
    const n = parseFloat(String(v).replace(",", ".").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function fmtVal(v) { return String(Number(v.toFixed(2))); }

  function fmtAge(m) {
    if (m === null || m === undefined) return "";
    if (m < 1) return Math.round(m * DAY_MONTHS) + " días";
    if (m < 24) {
      const mm = Math.floor(m + 1e-9);
      const d = Math.round((m - mm) * DAY_MONTHS);
      return mm + (mm === 1 ? " mes" : " meses") + (m < 6 && d >= 1 ? " " + d + " d" : "");
    }
    const y = Math.floor(m / 12 + 1e-9);
    const mm = Math.floor(m - y * 12 + 1e-9);
    return y + (y === 1 ? " año" : " años") + (mm ? " " + mm + " m" : "");
  }

  // "8 meses", "3 años", "1 año 2 meses", "3a 4m", "10 días", "6 semanas" o un número solo (años)
  function parseAgeMonths(text) {
    if (text === null || text === undefined) return null;
    const s = String(text).toLowerCase().replace(",", ".").trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s) * 12;
    const re = /(\d+(?:\.\d+)?)\s*(a[ñn]os?|a|meses|mes|m|semanas?|sem|d[ií]as?|d)(?![a-zñ])/g;
    let total = 0, found = false, m;
    while ((m = re.exec(s))) {
      const n = parseFloat(m[1]);
      const u = m[2];
      found = true;
      if (u.startsWith("a")) total += n * 12;
      else if (u.startsWith("m")) total += n;
      else if (u.startsWith("s")) total += (n * 7) / DAY_MONTHS;
      else total += n / DAY_MONTHS;
    }
    return found ? total : null;
  }

  function monthsBetween(fromISO, toISO) {
    const a = Date.parse(fromISO), b = Date.parse(toISO);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
    return (b - a) / 86400000 / DAY_MONTHS;
  }

  const isoDate = (d) => d.toISOString().slice(0, 10);
  const sexOf = (s) => (/^f/i.test(String(s || "").trim()) ? "f" : /^m/i.test(String(s || "").trim()) ? "m" : null);

  // ---------- Matemática LMS ----------
  const dataset = (range, sex) => D[range.data + "_" + sex];

  function lmsAt(ds, x) {
    const n = ds.d.length;
    const f = (x - ds.x0) / ds.step;
    if (f <= 0) return ds.d[0].slice();
    if (f >= n - 1) return ds.d[n - 1].slice();
    const i = Math.floor(f), t = f - i, a = ds.d[i], b = ds.d[i + 1];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function curveVal(L, M, S, z) {
    return Math.abs(L) < 1e-9 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
  }

  // z-score con el ajuste de la OMS para |z| > 3 (peso, IMC y peso/talla)
  function zOf(x, L, M, S, adjust) {
    let z = Math.abs(L) < 1e-9 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S);
    if (adjust && z > 3) {
      const sd3 = curveVal(L, M, S, 3), sd2 = curveVal(L, M, S, 2);
      z = 3 + (x - sd3) / (sd3 - sd2);
    } else if (adjust && z < -3) {
      const sd3 = curveVal(L, M, S, -3), sd2 = curveVal(L, M, S, -2);
      z = -3 + (x - sd3) / (sd2 - sd3);
    }
    return z;
  }

  function cdf(z) { // distribución normal estándar (Zelen y Severo)
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  function pctText(z) {
    const p = cdf(z) * 100;
    return p < 1 ? "<P1" : p > 99 ? ">P99" : "P" + Math.round(p);
  }
  const zText = (z) => (z >= 0 ? "+" : "-") + Math.abs(z).toFixed(2);

  function bandOf(z) {
    if (z < Z[0]) return "bajo P3";
    if (z < Z[1]) return "entre P3 y P15";
    if (z < Z[2]) return "entre P15 y P50";
    if (z < Z[3]) return "entre P50 y P85";
    if (z < Z[4]) return "entre P85 y P97";
    return "sobre P97";
  }

  const pickRange = (ind, ageM) => ind.ranges.find((r) => ageM >= r.ages[0] && ageM < r.ages[1]) || null;
  const autoRange = (indKey, ageM) => {
    const r = ageM == null ? null : pickRange(INDICATORS[indKey], ageM);
    return r ? r.key : null;
  };

  // Ubica una medida en la tabla que corresponde a la edad.
  function evaluate(indKey, sex, ageM, v) {
    const ind = INDICATORS[indKey];
    if (!ind || !sex || ageM === null || ageM === undefined || ageM < 0) return null;
    const range = pickRange(ind, ageM);
    if (!range) return null;
    const value = indKey === "wflh" ? v.w : { wfa: v.w, lhfa: v.h, hcfa: v.hc, bmifa: v.bmi }[indKey];
    const x = indKey === "wflh" ? v.h : ageM;
    if (!(value > 0) || !(x > 0)) return null;
    const ds = dataset(range, sex);
    if (!ds) return null;
    const xEnd = ds.x0 + ds.step * (ds.d.length - 1);
    if (indKey === "wflh" && (x < ds.x0 || x > xEnd)) return { ind: indKey, range: range.key, out: true, x, value, ageM };
    const [L, M, S] = lmsAt(ds, x);
    const z = zOf(value, L, M, S, ind.adjust);
    return { ind: indKey, range: range.key, x, value, ageM, z, pct: pctText(z), zText: zText(z), band: bandOf(z) };
  }

  // ---------- Análisis de un expediente ----------
  function currentAge(rec, now) {
    if (rec.fecha_nacimiento) {
      const m = monthsBetween(rec.fecha_nacimiento, isoDate(now));
      if (m !== null) return m;
    }
    return parseAgeMonths(rec.edad);
  }

  function entryAge(rec, e, now) {
    if (rec.fecha_nacimiento && e.fecha) {
      const m = monthsBetween(rec.fecha_nacimiento, e.fecha);
      if (m !== null) return m;
    }
    const t = parseAgeMonths(rec.edad);
    if (t !== null) return t;
    return rec.fecha_nacimiento ? monthsBetween(rec.fecha_nacimiento, isoDate(now)) : null;
  }

  function analyzeRecord(rec, now) {
    now = now || new Date();
    const sex = sexOf(rec.sexo);
    const ageNow = currentAge(rec, now);
    const entries = (rec.crecimiento || []).map((e, index) => {
      const w = num(e.peso), h = num(e.talla), hc = num(e.perimetro_cefalico);
      const bmi = w && h ? w / Math.pow(h / 100, 2) : null;
      const ageM = entryAge(rec, e, now);
      const res = {};
      if (sex && ageM !== null) ORDER.forEach((k) => { res[k] = evaluate(k, sex, ageM, { w, h, hc, bmi }); });
      return { index, ageM, w, h, hc, bmi, has: !!(w || h || hc), res };
    });
    const withData = entries.filter((e) => e.has && e.ageM !== null);
    const refAge = withData.length ? Math.max(...withData.map((e) => e.ageM)) : ageNow;
    return { sex, ageNow, refAge, entries };
  }

  // Valores que se calculan solos en cada registro de "Crecimiento".
  function computedFields(en) {
    const t = (r) => (r && !r.out ? r.pct + " (z " + r.zText + ")" : null);
    return {
      imc: en.bmi ? en.bmi.toFixed(1) : null,
      peso_edad: t(en.res.wfa),
      talla_edad: t(en.res.lhfa),
      pc_edad: t(en.res.hcfa),
      imc_edad: t(en.res.bmifa),
      peso_talla: en.res.wflh && en.res.wflh.out ? "fuera de rango OMS" : t(en.res.wflh),
    };
  }

  function pointsFor(an, indKey, rangeKey) {
    const ind = INDICATORS[indKey];
    const pts = [];
    an.entries.forEach((en) => {
      const r = en.res[indKey];
      if (!r || r.out || r.range !== rangeKey) return;
      const tip = indKey === "wflh"
        ? fmtVal(r.value) + " kg · " + fmtVal(r.x) + " cm (" + fmtAge(r.ageM) + ") → " + r.pct + " (z " + r.zText + "), " + r.band
        : fmtVal(r.value) + " " + ind.unit + " · " + fmtAge(r.ageM) + " → " + r.pct + " (z " + r.zText + "), " + r.band;
      pts.push({ x: r.x, y: r.value, tag: r.pct, tip, ageM: r.ageM, r });
    });
    pts.sort((a, b) => a.x - b.x);
    if (pts.length) {
      const last = pts.reduce((m, p) => (p.ageM > m.ageM ? p : m), pts[0]);
      last.latest = true;
    }
    return pts;
  }

  // ---------- Gráfica SVG ----------
  function niceStep(span, target) {
    const raw = span / target;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }

  function renderChart(spec) {
    const ind = INDICATORS[spec.ind];
    const range = ind.ranges.find((r) => r.key === spec.range);
    const ds = dataset(range, spec.sex);
    const W = 760, H = 430, ml = 54, mr = 46, mt = 16, mb = 56;
    const pw = W - ml - mr, ph = H - mt - mb;

    const xs = [];
    const curves = PCT.map(() => []);
    ds.d.forEach((row, i) => {
      xs.push(ds.x0 + i * ds.step);
      Z.forEach((z, k) => curves[k].push(curveVal(row[0], row[1], row[2], z)));
    });

    const points = spec.points || [];
    let ymin = Math.min(...curves[0]), ymax = Math.max(...curves[4]);
    points.forEach((p) => { ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y); });
    const ystep = niceStep(ymax - ymin, 8);
    ymin = Math.floor(ymin / ystep) * ystep;
    ymax = Math.ceil(ymax / ystep) * ystep;

    const sx = (x) => ml + ((x - range.xmin) / (range.xmax - range.xmin)) * pw;
    const sy = (y) => mt + ph - ((y - ymin) / (ymax - ymin)) * ph;
    const f1 = (n) => n.toFixed(1);

    // Marcas del eje X
    const ticks = [];
    const span = range.xmax - range.xmin;
    if (range.xKind === "len") {
      for (let x = Math.ceil(range.xmin / 5) * 5; x <= range.xmax; x += 5) ticks.push({ x, label: String(x), major: true });
    } else if (range.xmax <= 24) {
      for (let m = 0; m <= 24; m++) ticks.push({ x: m, label: m % 3 === 0 ? String(m) : "", major: m % 3 === 0 });
    } else {
      const minor = span <= 36 ? 3 : 6;
      for (let m = range.xmin; m <= range.xmax; m += minor) {
        const major = m % 12 === 0;
        ticks.push({ x: m, label: major ? (m === 0 ? "Nac." : String(m / 12)) : "", major });
      }
    }
    const xTitle = range.xKind === "len" ? range.xTitle : range.xmax <= 24 ? "Edad (meses)" : "Edad (años)";
    const yTitle = range.yTitle || ind.yTitle;

    let g = "";
    g += '<rect class="oms-bg" x="0" y="0" width="' + W + '" height="' + H + '"/>';
    for (let y = ymin; y <= ymax + ystep / 1000; y += ystep) {
      g += '<line class="oms-grid" x1="' + ml + '" x2="' + (ml + pw) + '" y1="' + f1(sy(y)) + '" y2="' + f1(sy(y)) + '"/>';
      g += '<text class="oms-tick" x="' + (ml - 8) + '" y="' + f1(sy(y) + 4) + '" text-anchor="end">' + Number(y.toFixed(2)) + "</text>";
    }
    ticks.forEach((t) => {
      g += '<line class="' + (t.major ? "oms-grid" : "oms-grid-minor") + '" x1="' + f1(sx(t.x)) + '" x2="' + f1(sx(t.x)) + '" y1="' + mt + '" y2="' + (mt + ph) + '"/>';
      if (t.label) g += '<text class="oms-tick" x="' + f1(sx(t.x)) + '" y="' + (mt + ph + 17) + '" text-anchor="middle">' + t.label + "</text>";
    });
    g += '<rect class="oms-axis" x="' + ml + '" y="' + mt + '" width="' + pw + '" height="' + ph + '"/>';

    const cls = ["oms-c3", "oms-c15", "oms-p50", "oms-c85", "oms-c97"];
    curves.forEach((c, k) => {
      const d = c.map((y, i) => f1(sx(xs[i])) + "," + f1(sy(y))).join(" ");
      g += '<polyline class="oms-curve ' + cls[k] + '" points="' + d + '"/>';
      g += '<text class="oms-curve-label" x="' + (ml + pw + 6) + '" y="' + f1(sy(c[c.length - 1]) + 4) + '">' + PCT[k] + "</text>";
    });

    g += '<text class="oms-axis-title" x="' + (ml + pw / 2) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(xTitle) + "</text>";
    g += '<text class="oms-axis-title" transform="translate(14 ' + (mt + ph / 2) + ') rotate(-90)" text-anchor="middle">' + esc(yTitle) + "</text>";

    if (points.length > 1) {
      g += '<polyline class="oms-trace" points="' + points.map((p) => f1(sx(p.x)) + "," + f1(sy(p.y))).join(" ") + '"/>';
    }
    points.forEach((p) => {
      const cx = f1(sx(p.x)), cy = f1(sy(p.y));
      g += '<g class="oms-point"><title>' + esc(p.tip) + "</title>";
      if (p.latest) g += '<circle class="oms-pt-ring" cx="' + cx + '" cy="' + cy + '" r="10"/>';
      g += '<circle class="oms-pt" cx="' + cx + '" cy="' + cy + '" r="' + (p.latest ? 6 : 4.5) + '"/>';
      if (p.latest) {
        const tx = Math.min(Math.max(sx(p.x), ml + 22), ml + pw - 22);
        const ty = sy(p.y) - 16 < mt + 12 ? sy(p.y) + 26 : sy(p.y) - 16;
        g += '<text class="oms-pt-tag" x="' + f1(tx) + '" y="' + f1(ty) + '" text-anchor="middle">' + esc(p.tag) + "</text>";
      }
      g += "</g>";
    });

    const label = ind.label + " · " + (spec.sex === "f" ? "niñas" : "niños") + " · " + range.label;
    return '<svg class="oms-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(label) + '">' + g + "</svg>";
  }

  // ---------- Panel completo (pestañas + gráfica + resumen) ----------
  function renderPanel(an, ui) {
    if (!an.sex) {
      return '<p class="growth-note">Selecciona el <strong>sexo</strong> del niño en “Datos generales” para mostrar las curvas de la OMS.</p>';
    }
    const ref = an.refAge;
    const avail = {};
    ORDER.forEach((k) => { avail[k] = ref === null ? true : !!pickRange(INDICATORS[k], ref); });
    if (!INDICATORS[ui.ind] || !avail[ui.ind]) {
      ui.ind = ORDER.find((k) => avail[k]) || "wfa";
      ui.range = null;
    }
    const ind = INDICATORS[ui.ind];
    const auto = ref === null ? null : pickRange(ind, ref);
    const range = ind.ranges.find((r) => r.key === ui.range) || auto || ind.ranges[0];

    let html = '<div class="growth-tabs" role="tablist">';
    ORDER.forEach((k) => {
      const i = INDICATORS[k];
      html += '<button type="button" class="growth-tab' + (k === ui.ind ? " active" : "") + '" data-gtab="' + k + '"' +
        (avail[k] ? "" : ' disabled title="' + esc(i.none || "") + '"') + ">" + esc(i.tab) + "</button>";
    });
    html += "</div>";

    if (ref === null) {
      html += '<p class="growth-note">Escribe la <strong>edad</strong> (por ejemplo “8 meses” o “3 años”) o la <strong>fecha de nacimiento</strong>: con eso se elige automáticamente la tabla correcta.</p>';
    }

    html += '<div class="growth-head"><div class="growth-title">' + esc(ind.label) + " · " + (an.sex === "f" ? "Niñas" : "Niños") + " · " + esc(range.label) + "</div>";
    if (ind.ranges.length > 1) {
      html += '<div class="growth-ranges">' + ind.ranges.map((r) =>
        '<button type="button" class="growth-range' + (r.key === range.key ? " active" : "") + '" data-grange="' + r.key + '">' +
        esc(r.label) + (auto && r.key === auto.key ? " ✓" : "") + "</button>").join("") + "</div>";
    }
    html += "</div>";

    const points = pointsFor(an, ui.ind, range.key);
    html += '<div class="growth-chart">' + renderChart({ ind: ui.ind, range: range.key, sex: an.sex, points }) + "</div>";

    if (ref !== null) {
      html += '<p class="growth-hint">Tabla elegida automáticamente según la edad (' + esc(fmtAge(ref)) + "). Curvas: percentiles 3, 15, 50, 85 y 97 de la OMS.</p>";
    }

    if (points.length) {
      html += '<div class="growth-table-wrap"><table class="growth-table"><thead><tr><th>Edad</th><th>' +
        (ui.ind === "wflh" ? "Peso / talla" : "Medida") + "</th><th>Percentil</th><th>Z</th><th>Ubicación</th></tr></thead><tbody>";
      points.slice().sort((a, b) => a.ageM - b.ageM).forEach((p) => {
        html += "<tr" + (p.latest ? ' class="last"' : "") + "><td>" + esc(fmtAge(p.ageM)) + "</td><td>" +
          (ui.ind === "wflh" ? esc(fmtVal(p.y) + " kg / " + fmtVal(p.x) + " cm") : esc(fmtVal(p.y) + " " + ind.unit)) +
          "</td><td>" + esc(p.r.pct) + "</td><td>" + esc(p.r.zText) + "</td><td>" + esc(p.r.band) + "</td></tr>";
      });
      html += "</tbody></table></div>";
    } else {
      html += '<p class="growth-hint">' + (ui.ind === "wflh"
        ? "Agrega <strong>peso</strong> y <strong>talla</strong> en “Crecimiento” para ubicar al niño en la curva."
        : "Agrega una medida en “Crecimiento” para ubicar al niño en la curva.") + "</p>";
    }

    const elsewhere = an.entries.filter((e) => e.res[ui.ind] && !e.res[ui.ind].out && e.res[ui.ind].range !== range.key).length;
    if (elsewhere) {
      html += '<p class="growth-hint">' + elsewhere + (elsewhere === 1 ? " registro está" : " registros están") +
        " en otra tabla de edad; usa los botones de rango para verlos.</p>";
    }
    const outOfRange = an.entries.filter((e) => e.res[ui.ind] && e.res[ui.ind].out).length;
    if (outOfRange) {
      html += '<p class="growth-hint">' + outOfRange + (outOfRange === 1 ? " registro tiene" : " registros tienen") +
        " una talla fuera del rango de la tabla OMS (" + range.xmin + "–" + range.xmax + " cm).</p>";
    }
    return html;
  }

  window.OMS = {
    INDICATORS, ORDER, parseAgeMonths, fmtAge, monthsBetween, evaluate, analyzeRecord, computedFields,
    pointsFor, autoRange, renderChart, renderPanel, curveVal, lmsAt, zOf, cdf, PCT, Z,
  };
})();
