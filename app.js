// ====== 你要填的 Supabase 連線資訊（換成你自己的） ======
const SUPABASE_URL = "https://coedqfdxzykoleerhwdb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZWRxZmR4enlrb2xlZXJod2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDEzMTUsImV4cCI6MjA4Nzc3NzMxNX0.OZBHVrgUFUvSaHInP-K34_FvGpqAuNvjPabmOk7SouQ";

// ==========================================================
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const el = (id) => document.getElementById(id);

function msgAuth(t) { el("authMsg").innerText = t || ""; }
function showApp(isIn) {
  el("auth").style.display = isIn ? "none" : "block";
  el("app").style.display = isIn ? "block" : "none";
}

async function refreshSession() {
  const { data: { session } } = await sb.auth.getSession();
  showApp(!!session);
  return session;
}

// ====== Auth ======
el("login").onclick = async () => {
  msgAuth("");
  const email = el("email").value.trim();
  const password = el("password").value;

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) msgAuth("登入失敗：" + error.message);
  else msgAuth("登入成功");
  await refreshSession();
};

el("signup").onclick = async () => {
  msgAuth("");
  const email = el("email").value.trim();
  const password = el("password").value;

  const { error } = await sb.auth.signUp({ email, password });
  if (error) msgAuth("註冊失敗：" + error.message);
  else msgAuth("註冊成功（若你有開 Email 驗證請去信箱確認）");
};

el("logout").onclick = async () => {
  await sb.auth.signOut();
  showApp(false);
};

// ====== Excel 解析工具 ======
function excelDateToISO(v) {
  if (!v) return null;

  // 字串日期
  if (typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return null;
  }

  // Excel serial number
  if (typeof v === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    return d.toISOString().slice(0, 10);
  }

  // Date 物件
  if (v instanceof Date) return v.toISOString().slice(0, 10);

  return null;
}

function money(n) {
  const v = Math.round(Number(n || 0));
  return v.toLocaleString("zh-TW");
}

// ====== 匯入並統計（先做前端統計顯示） ======
el("importBtn").onclick = async () => {
  const file = el("fileInput").files[0];
  const start = el("startDate").value;
  const end = el("endDate").value;
  const store = el("store").value;

  if (!file) {
    el("result").innerText = "請先選擇 1.預約紀錄報表.xlsx";
    return;
  }
  if (!start || !end) {
    el("result").innerText = "請先選起始與結束日期";
    return;
  }

  el("result").innerText = "讀取檔案中…";

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const header = data[0] || [];
  const body = data.slice(1);

  // 依你之前的報表常見欄位找 index（找不到就用備援位置）
  const idxOf = (names, fallbackIdx) => {
    for (const n of names) {
      const i = header.findIndex((h) => String(h).trim() === n);
      if (i >= 0) return i;
    }
    return fallbackIdx;
  };

  // 備援欄位位置（若你實際欄位不同，我們再微調）
  const COL_DATE = idxOf(["日期", "預約日期", "完成時間", "建立時間"], 4);
  const COL_STORE = idxOf(["銷售人員(門市)", "門市", "店別"], 7);
  const COL_DEVICE = idxOf(["設備", "機台", "機台名稱", "服務"], 8);
  const COL_STATUS = idxOf(["訂單狀態", "狀態"], 38);
  const COL_PAY = idxOf(["付款方式", "支付方式"], 16);
  const COL_AMT = idxOf(["實付金額", "金額", "支付金額"], 17);

  let totalCount = 0;
  let totalAmt = 0;
  let storedAmt = 0;
  let otherAmt = 0;

  // 依設備統計（設備 + 付款群組）
  const agg = new Map();

  let skipped = 0;

  for (const r of body) {
    const iso = excelDateToISO(r[COL_DATE]);
    if (!iso) { skipped++; continue; }
    if (iso < start || iso > end) { skipped++; continue; }

    const status = String(r[COL_STATUS] || "").trim();
    if (status !== "完成") { skipped++; continue; }

    const storeName = String(r[COL_STORE] || "").trim();
    const isHsinchu = storeName.includes("新竹");
    const isZhubei = storeName.includes("竹北");
    if (store === "hsinchu" && !isHsinchu) { skipped++; continue; }
    if (store === "zhubei" && !isZhubei) { skipped++; continue; }

    const device = String(r[COL_DEVICE] || "").trim() || "未填";
    const pay = String(r[COL_PAY] || "").trim();
    const amt = Number(r[COL_AMT]) || 0;

    const group = (pay === "儲值金") ? "儲值金" : "單次/非儲值";

    totalCount += 1;
    totalAmt += amt;
    if (group === "儲值金") storedAmt += amt;
    else otherAmt += amt;

    const key = device + "||" + group;
    if (!agg.has(key)) agg.set(key, { device, group, count: 0, amt: 0 });
    const x = agg.get(key);
    x.count += 1;
    x.amt += amt;
  }

  // 組結果表
  const rows = Array.from(agg.values()).sort((a, b) => {
    if (a.device !== b.device) return a.device.localeCompare(b.device, "zh-Hant");
    return a.group.localeCompare(b.group, "zh-Hant");
  });

  let html = "";
  html += `<p>完成筆數：<b>${money(totalCount)}</b>（略過 ${money(skipped)} 筆）</p>`;
  html += `<p>扣款總額：<b>${money(totalAmt)}</b></p>`;
  html += `<p>儲值金扣款：<b>${money(storedAmt)}</b>｜單次/非儲值：<b>${money(otherAmt)}</b></p>`;
  html += `<hr/>`;
  html += `<table border="1" cellpadding="6" cellspacing="0">
    <tr><th>設備</th><th>付款群組</th><th>完成筆數</th><th>扣款金額</th></tr>
    ${rows.map(r => `
      <tr>
        <td>${r.device}</td>
        <td>${r.group}</td>
        <td>${money(r.count)}</td>
        <td>${money(r.amt)}</td>
      </tr>
    `).join("")}
  </table>`;

  el("result").innerHTML = html;
};

// init
refreshSession();
sb.auth.onAuthStateChange(() => refreshSession());
