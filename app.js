// ============================================================
// DENAH BUS PP. MAMBAUL HISAN — 4 BUS x 59 KURSI
// ============================================================

// Konfigurasi memakai project Supabase dari website denah sebelumnya.
const SUPABASE_URL = "https://kkguhtvejtcrieaumibe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sOcUbRKsN9UEzh6z2wUnyg_iYrmlYqs";
const TABLE = "bus_seats_multi";
const BUS_IDS = ["bus-1", "bus-2", "bus-3", "bus-4"];
const BUS_LABELS = ["Bus 1", "Bus 2", "Bus 3", "Bus 4"];

const db = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let activeBus = "bus-1";
let selectedSeat = null;
let isAdmin = false;
let realtimeChannel = null;
let seats = {};
let useLocalMode = false;

const $ = (id) => document.getElementById(id);
const emptySeat = (busId, number) => ({
  bus_id: busId, number, name: "", status: "available", color: ""
});

function makeInitialData() {
  const result = {};
  BUS_IDS.forEach((busId) => {
    result[busId] = {};
    for (let number = 1; number <= 59; number++) {
      result[busId][number] = emptySeat(busId, number);
    }
  });
  return result;
}
seats = makeInitialData();

function setConnection(state, label) {
  $("connection").className = `connection ${state}`;
  $("connection").querySelector("span").textContent = label;
}
function setMessage(id, message, success = false) {
  const element = $(id);
  element.textContent = message;
  element.classList.toggle("success", success);
}
function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function statusLabel(status) {
  return status === "filled" ? "Terisi" : status === "reserved" ? "Khusus" : "Kosong";
}
function currentSeat(number) {
  return seats[activeBus][number] || emptySeat(activeBus, number);
}

// ------------------------------------------------------------
// PILIHAN BUS
// ------------------------------------------------------------
function renderBusTabs() {
  $("busTabs").innerHTML = "";
  BUS_IDS.forEach((busId, index) => {
    const data = Object.values(seats[busId]);
    const filled = data.filter((seat) => seat.status === "filled").length;
    const reserved = data.filter((seat) => seat.status === "reserved").length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `bus-tab ${activeBus === busId ? "active" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(activeBus === busId));
    button.innerHTML = `<strong>${BUS_LABELS[index]}</strong><small>${filled + reserved} kursi terpakai · ${59 - filled - reserved} kosong</small>`;
    button.addEventListener("click", () => {
      activeBus = busId;
      if ($("adminBus")) $("adminBus").value = busId;
      selectedSeat = null;
      renderAll();
    });
    $("busTabs").append(button);
  });
}
function renderSummary() {
  const data = Object.values(seats[activeBus]);
  $("totalSeats").textContent = "59";
  $("filledSeats").textContent = data.filter((seat) => seat.status === "filled").length;
  $("reservedSeats").textContent = data.filter((seat) => seat.status === "reserved").length;
  $("emptySeats").textContent = data.filter((seat) => seat.status === "available").length;
  $("selectedBusTitle").textContent = `Denah ${BUS_LABELS[BUS_IDS.indexOf(activeBus)]}`;
}
function makeSeatButton(number) {
  const seat = currentSeat(number);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `seat ${seat.status} ${seat.color || ""}`;
  button.innerHTML = `<span class="num">${number}</span><span class="name">${safeText(seat.name)}</span>`;
  button.title = `Kursi ${number}${seat.name ? " — " + seat.name : ""}`;
  button.setAttribute("aria-label", `Kursi ${number}, ${statusLabel(seat.status)}${seat.name ? ", " + seat.name : ""}`);
  button.addEventListener("click", () => chooseSeat(number));
  return button;
}

// Susunan utama 2 kursi - lorong - 3 kursi, sama dengan denah project sebelumnya.
function renderSeatPlan() {
  const grid = $("seatGrid");
  grid.innerHTML = "";
  const rows = [
    [1, 2, null, 3, 4, 5], [6, 7, null, 8, 9, 10],
    [11, 12, null, 13, 14, 15], [16, 17, null, 18, 19, 20],
    [21, 22, null, 23, 24, 25], [26, 27, null, 28, 29, 30],
    [31, 32, null, 33, 34, 35], [36, 37, null, 38, 39, 40],
    [41, 42, null, 43, 44, 45], [46, 47, null, 48, 49, 50]
  ];
  rows.forEach((row, rowIndex) => row.forEach((number, columnIndex) => {
    if (number === null) {
      const aisle = document.createElement("div");
      aisle.className = "aisle";
      aisle.style.gridColumn = String(columnIndex + 1);
      aisle.style.gridRow = String(rowIndex + 1);
      grid.append(aisle);
    } else grid.append(makeSeatButton(number));
  }));
  $("backRight").innerHTML = "";
  [51, 52, 53].forEach((number) => $("backRight").append(makeSeatButton(number)));
  $("backRow").innerHTML = "";
  [54, 55, 56, 57, 58, 59].forEach((number) => $("backRow").append(makeSeatButton(number)));
}
function renderAll() {
  renderBusTabs();
  renderSummary();
  renderSeatPlan();
}

// ------------------------------------------------------------
// PILIH KURSI & ADMIN
// ------------------------------------------------------------
function chooseSeat(number) {
  selectedSeat = number;
  const seat = currentSeat(number);
  if (isAdmin) {
    $("adminBus").value = activeBus;
    $("editNumber").value = number;
    $("editName").value = seat.name || "";
    $("editStatus").value = seat.status || "available";
    $("editColor").value = seat.color || "";
    setMessage("saveMsg", "");
    $("adminModal").classList.add("show");
    $("adminModal").setAttribute("aria-hidden", "false");
    $("loginPanel").hidden = true;
    $("editorPanel").hidden = false;
    return;
  }
  $("detailTitle").textContent = `Kursi ${number} · ${BUS_LABELS[BUS_IDS.indexOf(activeBus)]}`;
  $("detailInfo").textContent = seat.name
    ? `${seat.name} · ${statusLabel(seat.status)}`
    : `Kursi ini masih kosong pada ${BUS_LABELS[BUS_IDS.indexOf(activeBus)]}.`;
  showModal("detailModal");
}
function showModal(id) {
  $(id).classList.add("show");
  $(id).setAttribute("aria-hidden", "false");
}
function hideModal(id) {
  $(id).classList.remove("show");
  $(id).setAttribute("aria-hidden", "true");
}
function renderAdminBusOptions() {
  $("adminBus").innerHTML = BUS_IDS.map((id, index) =>
    `<option value="${id}">${BUS_LABELS[index]}</option>`).join("");
  $("editNumber").innerHTML = '<option value="">Pilih nomor kursi</option>' +
    Array.from({ length: 59 }, (_, index) =>
      `<option value="${index + 1}">Kursi ${index + 1}</option>`).join("");
}
function loadSeatIntoEditor(number) {
  selectedSeat = Number(number) || null;
  if (!selectedSeat) {
    $("editName").value = "";
    $("editStatus").value = "available";
    $("editColor").value = "";
    return;
  }
  const seat = seats[activeBus][selectedSeat] || emptySeat(activeBus, selectedSeat);
  $("editName").value = seat.name || "";
  $("editStatus").value = seat.status || "available";
  $("editColor").value = seat.color || "";
}
async function checkAdmin(session) {
  isAdmin = false;
  if (session?.user && db) {
    const { data, error } = await db.from("admin_users")
      .select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (error) console.warn("Pemeriksaan hak admin:", error.message);
    isAdmin = Boolean(data);
  }
  $("loginPanel").hidden = isAdmin;
  $("editorPanel").hidden = !isAdmin;
  $("adminOpen").textContent = isAdmin ? "Panel Admin" : "Login Admin";
  if (session && !isAdmin) {
    setMessage("loginMsg", "Akun belum terdaftar sebagai admin. Hubungi pengelola database.");
    await db.auth.signOut();
  }
}
async function saveSeat() {
  if (!isAdmin || !selectedSeat) {
    setMessage("saveMsg", "Login admin dan pilih kursi terlebih dahulu.");
    return;
  }
  const busId = $("adminBus").value;
  const row = {
    bus_id: busId,
    number: Number(selectedSeat),
    name: $("editName").value.trim(),
    status: $("editStatus").value,
    color: $("editColor").value
  };
  if (!db) {
    setMessage("saveMsg", "Koneksi database belum tersedia.");
    return;
  }
  $("saveSeat").disabled = true;
  setMessage("saveMsg", "Menyimpan perubahan…");
  const { error } = await db.from(TABLE).upsert(row, { onConflict: "bus_id,number" });
  $("saveSeat").disabled = false;
  if (error) {
    setMessage("saveMsg", `Gagal menyimpan: ${error.message}`);
    return;
  }
  seats[busId][row.number] = row;
  activeBus = busId;
  renderAll();
  setMessage("saveMsg", "Tersimpan. Perubahan akan tampil realtime untuk pengunjung.", true);
}
async function clearSeat() {
  if (!selectedSeat) return;
  $("editName").value = "";
  $("editStatus").value = "available";
  $("editColor").value = "";
  await saveSeat();
}

// ------------------------------------------------------------
// DATABASE SUPABASE & REALTIME
// ------------------------------------------------------------
async function fetchSeats() {
  if (!db) {
    setConnection("offline", "Mode lokal");
    return;
  }
  setConnection("", "Mengambil data…");
  const { data, error } = await db.from(TABLE)
    .select("bus_id,number,name,status,color").order("number");
  if (error) {
    console.error(error);
    setConnection("offline", "Database perlu disiapkan");
    $("lastUpdated")?.remove();
    return;
  }
  data.forEach((row) => {
    if (seats[row.bus_id]) seats[row.bus_id][row.number] = row;
  });
  renderAll();
  setConnection("online", "Online");
}
function subscribeRealtime() {
  if (!db) return;
  if (realtimeChannel) db.removeChannel(realtimeChannel);
  realtimeChannel = db.channel("mambaul-hisan-four-buses")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, (payload) => {
      const row = payload.new;
      if (payload.eventType === "DELETE") {
        const old = payload.old;
        if (seats[old.bus_id]) seats[old.bus_id][old.number] = emptySeat(old.bus_id, old.number);
      } else if (row?.bus_id && seats[row.bus_id]) {
        seats[row.bus_id][row.number] = row;
      }
      renderAll();
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") setConnection("online", "Realtime aktif");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("offline", "Realtime terputus");
    });
}
async function loginAdmin() {
  if (!db) {
    setMessage("loginMsg", "Supabase belum tersedia.");
    return;
  }
  $("loginBtn").disabled = true;
  setMessage("loginMsg", "Memeriksa akun…");
  const { data, error } = await db.auth.signInWithPassword({
    email: $("email").value.trim(), password: $("password").value
  });
  $("loginBtn").disabled = false;
  if (error) {
    setMessage("loginMsg", error.message);
    return;
  }
  await checkAdmin(data.session);
  if (isAdmin) {
    setMessage("loginMsg", "Login admin berhasil.", true);
    await fetchSeats();
  }
}
async function logoutAdmin() {
  if (db) await db.auth.signOut();
  isAdmin = false;
  selectedSeat = null;
  $("loginPanel").hidden = false;
  $("editorPanel").hidden = true;
  $("password").value = "";
  $("adminOpen").textContent = "Login Admin";
}
async function importJson(file) {
  try {
    const rows = JSON.parse(await file.text());
    if (!Array.isArray(rows)) throw new Error("Format JSON harus berupa array.");
    const validRows = rows.filter((row) =>
      BUS_IDS.includes(row.bus_id) && Number.isInteger(Number(row.number)) &&
      Number(row.number) >= 1 && Number(row.number) <= 59
    ).map((row) => ({
      bus_id: row.bus_id, number: Number(row.number),
      name: String(row.name || ""),
      status: ["available", "filled", "reserved"].includes(row.status) ? row.status : "available",
      color: ["", "green", "gold", "mint"].includes(row.color) ? row.color : ""
    }));
    if (!db || !isAdmin) throw new Error("Login admin dan koneksi Supabase diperlukan.");
    const { error } = await db.from(TABLE).upsert(validRows, { onConflict: "bus_id,number" });
    if (error) throw error;
    await fetchSeats();
    setMessage("saveMsg", `Impor berhasil: ${validRows.length} data kursi.`, true);
  } catch (error) {
    setMessage("saveMsg", `Gagal impor: ${error.message}`);
  }
}
function exportJson() {
  const all = BUS_IDS.flatMap((busId) => Object.values(seats[busId]));
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cadangan-denah-4-bus-mambaul-hisan.json";
  link.click();
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------
// TIMELINE: disalin dari rundown PDF yang diunggah (halaman 1).
// Rentang waktu dipertahankan sesuai dokumen, termasuk yang perlu dikonfirmasi.
// ------------------------------------------------------------
const dayOne = [
  ["06.00–07.00","Persiapan pemberangkatan","PP. Mambaul Hisan"],
  ["07.00–11.00","Perjalanan",""],
  ["11.00–12.30","Makan siang + sholat Dhuhur–Ashar taqdim","Masjid Agung Sidayu"],
  ["12.30–14.30","Sowan Pondok Sidayu",""],
  ["14.30–14.45","Perjalanan",""],
  ["14.45–15.45","Ziarah Maqam Mu’assis Sidayu","Makam Desa Sidayu"],
  ["15.00–17.00","Perjalanan","To Al Fitrah Surabaya"],
  ["17.00–18.00","Ziarah Makam Al Fitrah",""],
  ["18.00–19.00","Perjalanan","To Bangkalan"],
  ["19.00–20.00","Makan malam","Bebek Sinjay"],
  ["20.00–20.30","Perjalanan",""],
  ["20.30–22.30","Ziarah Maqam Syaikhona Kholil Bangkalan","Maghrib Isya Ta’khir"],
  ["22.30–23.30","Perjalanan","To Ampel Surabaya"],
  ["23.30–01.30","Ziarah Maqam Sunan Ampel",""],
  ["01.00–04.00","Perjalanan","To Batu"]
];
const dayTwo = [
  ["04.00–08.30","Sholat Subuh, mandi pagi, sarapan pagi","RM. HC Putra Batu"],
  ["08.30–08.00","Perjalanan","To Taman Selecta"],
  ["08.00–09.00","Persiapan masuk","All"],
  ["09.00–14.00","Explore Taman Selecta","Dhuhur Ashar Takdim"],
  ["14.00–14.30","Perjalanan","To Brawijaya Resto"],
  ["14.30–16.00","Makan sore + belanja pusat oleh-oleh","Brawijaya"],
  ["16.00–19.00","Perjalanan pulang",""],
  ["19.00–20.00","Transit sholat Maghrib, Isya ta’khir","Masjid Raya Wlingi"],
  ["20.00–20.30","Next perjalanan",""],
  ["20.30–Selesai","Finish Pondok Gondang",""]
];
function renderTimeline(targetId, items) {
  const target = $(targetId);
  target.innerHTML = items.map(([time, activity, location]) => `
    <article class="timeline-item">
      <time class="timeline-time">${safeText(time)}</time>
      <div class="timeline-activity">${safeText(activity)}</div>
      <div class="timeline-location">${safeText(location || "—")}</div>
    </article>`).join("");
}

// ------------------------------------------------------------
// EVENT LISTENERS & INISIALISASI
// ------------------------------------------------------------
$("adminOpen").addEventListener("click", () => showModal("adminModal"));
document.querySelectorAll("[data-close]").forEach((button) =>
  button.addEventListener("click", () => hideModal(button.dataset.close)));
document.querySelectorAll(".modal").forEach((modal) =>
  modal.addEventListener("click", (event) => {
    if (event.target === modal) hideModal(modal.id);
  }));
$("loginBtn").addEventListener("click", loginAdmin);
$("logoutBtn").addEventListener("click", logoutAdmin);
$("saveSeat").addEventListener("click", saveSeat);
$("clearSeat").addEventListener("click", clearSeat);
$("printBtn").addEventListener("click", () => window.print());
$("adminBus").addEventListener("change", () => {
  activeBus = $("adminBus").value;
  $("editNumber").value = "";
  loadSeatIntoEditor("");
  renderAll();
});
$("editNumber").addEventListener("change", () => {
  loadSeatIntoEditor($("editNumber").value);
});
$("exportBtn").addEventListener("click", exportJson);
$("importFile").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (file) await importJson(file);
  event.target.value = "";
});
$("password").addEventListener("keydown", (event) => {
  if (event.key === "Enter") loginAdmin();
});

renderAdminBusOptions();
renderTimeline("dayOne", dayOne);
renderTimeline("dayTwo", dayTwo);
renderAll();
if (db) {
  fetchSeats();
  subscribeRealtime();
  db.auth.getSession().then(({ data }) => {
    if (data.session) checkAdmin(data.session);
  });
  db.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => checkAdmin(session), 0);
  });
} else {
  setConnection("offline", "Mode lokal");
}
