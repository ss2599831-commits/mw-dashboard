const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appCode = fs.readFileSync('./app.js', 'utf8');

const context = vm.createContext({
  supabase: {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => {}
      }
    })
  },
  document: {
    getElementById: () => ({ style: {}, onclick: null, value: '' })
  },
  XLSX: {
    read: () => ({ Sheets: {}, SheetNames: [] }),
    utils: { sheet_to_json: () => [] }
  },
  console: console,
  Math: Math,
  Number: Number,
  String: String,
  Array: Array,
  Date: Date,
  Map: Map,
  isNaN: isNaN,
  isFinite: isFinite
});

try {
  vm.runInContext(appCode, context);
} catch (e) {
  console.error("Error evaluating app.js:", e);
  process.exit(1);
}

const excelDateToISO = context.excelDateToISO;

test('excelDateToISO - valid inputs', async (t) => {
  await t.test('valid string', () => {
    assert.equal(excelDateToISO('2023-10-01'), '2023-10-01');
  });

  await t.test('valid excel serial number', () => {
    // 44196 is 2020-12-31 based on Excel 1899 epoch
    assert.equal(excelDateToISO(44196), '2020-12-31');
  });

  await t.test('valid Date object', () => {
    const d = new Date(Date.UTC(2023, 9, 1)); // 2023-10-01T00:00:00.000Z
    assert.equal(excelDateToISO(d), '2023-10-01');
  });
});

test('excelDateToISO - edge cases (invalid inputs)', async (t) => {
  await t.test('null and undefined', () => {
    assert.equal(excelDateToISO(null), null);
    assert.equal(excelDateToISO(undefined), null);
    assert.equal(excelDateToISO(''), null);
  });

  await t.test('invalid string returns null', () => {
    assert.equal(excelDateToISO('invalid date'), null);
    assert.equal(excelDateToISO('2023-13-45'), null);
  });

  await t.test('invalid numbers return null', () => {
    assert.equal(excelDateToISO(NaN), null);
    assert.equal(excelDateToISO(Infinity), null);
    assert.equal(excelDateToISO(-Infinity), null);
  });

  await t.test('invalid Date object returns null', () => {
    const invalidDate = new Date('invalid');
    assert.equal(excelDateToISO(invalidDate), null);
  });
});
