const fs = require('fs');
const assert = require('assert');

// Mock DOM
const mockDOM = {
  result: { innerHTML: '', innerText: '' },
  importBtn: { onclick: null },
  fileInput: { files: [{}] }, // dummy file
  startDate: { value: '2023-01-01' },
  endDate: { value: '2023-12-31' },
  store: { value: 'hsinchu' },
  login: { onclick: null },
  signup: { onclick: null },
  logout: { onclick: null },
  email: { value: '' },
  password: { value: '' },
  authMsg: { innerText: '' },
  auth: { style: {} },
  app: { style: {} }
};

global.document = {
  getElementById: (id) => mockDOM[id]
};

// Mock XLSX
global.XLSX = {
  read: () => ({ Sheets: { 'Sheet1': {} }, SheetNames: ['Sheet1'] }),
  utils: {
    sheet_to_json: () => [
      ['日期', '門市', '設備', '狀態', '付款方式', '金額'],
      ['2023-05-15', '新竹店', 'Device A', '完成', '儲值金', 100],
      ['2023-06-20', '竹北店', 'Device B', '完成', '信用卡', 200], // should be skipped (wrong store)
      ['2023-05-16', '新竹店', 'Device A', '完成', '現金', 150],
      ['2023-05-17', '新竹店', 'Device C', '取消', '現金', 150] // should be skipped (not finished)
    ]
  }
};

// Mock Supabase
global.supabase = {
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => {}
    }
  })
};

// Read and eval the refactored code
const code = fs.readFileSync('./app.js', 'utf-8');
// Mocking arrayBuffer for file
mockDOM.fileInput.files[0].arrayBuffer = async () => new ArrayBuffer(8);

eval(code);

(async () => {
  await mockDOM.importBtn.onclick();

  // The output should contain specific values
  const html = mockDOM.result.innerHTML;
  console.log(html);

  assert(html.includes('完成筆數：<b>2</b>'), "Total count should be 2");
  assert(html.includes('略過 2 筆'), "Skipped count should be 2");
  assert(html.includes('扣款總額：<b>250</b>'), "Total amt should be 250");
  assert(html.includes('儲值金扣款：<b>100</b>'), "Stored amt should be 100");
  assert(html.includes('單次/非儲值：<b>150</b>'), "Other amt should be 150");
  assert(html.includes('<td>Device A</td>'), "Device A should be present");

  console.log("Tests passed!");
})();
