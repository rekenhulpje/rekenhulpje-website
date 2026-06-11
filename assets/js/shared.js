const XLSX_SRC = "/assets/vendor/xlsx.mjs.js";

let xlsxPromise = null;
const usedCalculators = new Set();

export function byId(id) {
  return document.getElementById(id);
}

export function euro(value, decimals = 0) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);
}

export function euroMonth(value) {
  return `${euro(value)}/mnd`;
}

export function percent(value, decimals = 2) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(decimals).replace(".", ",")}%`;
}

export function valueNumber(id) {
  const element = byId(id);
  if (!element) return 0;
  const value = Number(String(element.value).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

export function valueString(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

export function syncRangeNumber(rangeId, numberId, callback) {
  const range = byId(rangeId);
  const number = byId(numberId);
  if (!range || !number) return;

  range.addEventListener("input", () => {
    number.value = range.value;
    callback();
  });
  number.addEventListener("input", () => {
    range.value = number.value;
    callback();
  });
}

export function bindCalculator(root, callback) {
  root.addEventListener("click", (event) => {
    const label = event.target.closest?.("label");
    const input = label?.querySelector?.('input[type="radio"], input[type="checkbox"]');
    if (!input) return;

    trackCalculatorUsed(root);
    requestAnimationFrame(callback);
  });

  root.querySelectorAll("input, select").forEach((element) => {
    element.addEventListener("input", () => {
      trackCalculatorUsed(root);
      callback();
    });
    element.addEventListener("change", () => {
      trackCalculatorUsed(root);
      callback();
    });
    element.addEventListener("keyup", () => {
      trackCalculatorUsed(root);
      callback();
    });
    if (element.type === "radio" || element.type === "checkbox") {
      element.addEventListener("click", () => {
        trackCalculatorUsed(root);
        callback();
      });
    }
  });
}

export function renderMetrics(container, metrics) {
  container.innerHTML = metrics
    .map(
      (item) => `
        <div class="metric-card native">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `
    )
    .join("");
}

export function renderDetails(container, rows) {
  container.innerHTML = rows
    .map(
      (row) => `
        <div class="details-row">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value)}</strong>
        </div>
      `
    )
    .join("");
}

export function renderTable(container, columns, rows) {
  container.innerHTML = `
    <table>
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                ${columns
                  .map((column) => `<td>${escapeHtml(formatCell(row[column.key]))}</td>`)
                  .join("")}
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function downloadCsv(filename, rows) {
  trackEvent("download_csv", downloadEventParams(filename));
  const csv = toCsv(rows);
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export async function downloadExcel(filename, sheets) {
  trackEvent("download_excel", downloadEventParams(filename));
  const XLSX = await ensureXlsx();
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });
  XLSX.writeFile(workbook, filename);
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function destroyChart(chart) {
  if (chart) chart.destroy();
}

export function debounce(callback) {
  let frame = null;
  return () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(callback);
  };
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, {
    page_path: window.location.pathname,
    ...params,
  });
}

function trackCalculatorUsed(root) {
  const calculatorName = calculatorNameFromRoot(root);
  if (usedCalculators.has(calculatorName)) return;
  usedCalculators.add(calculatorName);
  trackEvent("calculator_used", {
    calculator_name: calculatorName,
  });
}

function downloadEventParams(filename) {
  return {
    file_name: filename,
    calculator_name: calculatorNameFromPath(window.location.pathname),
  };
}

function ensureXlsx() {
  if (!xlsxPromise) xlsxPromise = import(XLSX_SRC);
  return xlsxPromise;
}

function calculatorNameFromRoot(root) {
  const id = root?.id || "";
  if (id.includes("hypotheek")) return "hypotheekcalculator";
  if (id.includes("woonlasten")) return "woonlastencalculator";
  if (id.includes("verkoopopbrengst")) return "verkoopopbrengstcalculator";
  if (id.includes("brandstof")) return "brandstofkostencalculator";
  return calculatorNameFromPath(window.location.pathname);
}

function calculatorNameFromPath(pathname) {
  if (pathname.includes("hypotheek")) return "hypotheekcalculator";
  if (pathname.includes("woonlasten")) return "woonlastencalculator";
  if (pathname.includes("verkoopopbrengst")) return "verkoopopbrengstcalculator";
  if (pathname.includes("brandstof")) return "brandstofkostencalculator";
  return "website";
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = formatCell(row[header]);
          return `"${String(value).replaceAll('"', '""')}"`;
        })
        .join(";")
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

function formatCell(value) {
  if (typeof value === "number") return String(Math.round(value * 100) / 100).replace(".", ",");
  if (value === null || value === undefined) return "";
  return String(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
