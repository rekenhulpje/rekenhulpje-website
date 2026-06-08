const XLSX_SRC = "/assets/vendor/xlsx.mjs.js";

let xlsxPromise = null;

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
  root.querySelectorAll("input, select").forEach((element) => {
    element.addEventListener("input", callback);
    element.addEventListener("change", callback);
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
  const csv = toCsv(rows);
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export async function downloadExcel(filename, sheets) {
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

function ensureXlsx() {
  if (!xlsxPromise) xlsxPromise = import(XLSX_SRC);
  return xlsxPromise;
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
