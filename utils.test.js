const test = require('node:test');
const assert = require('node:assert');
const { money } = require('./utils.js');

test('money utility tests', async (t) => {
  await t.test('formats positive numbers with commas', () => {
    assert.strictEqual(money(1000), '1,000');
    assert.strictEqual(money(1000000), '1,000,000');
    assert.strictEqual(money(123456789), '123,456,789');
  });

  await t.test('handles numbers less than 1000 without commas', () => {
    assert.strictEqual(money(999), '999');
    assert.strictEqual(money(0), '0');
  });

  await t.test('rounds floating point numbers to nearest integer', () => {
    assert.strictEqual(money(1000.4), '1,000');
    assert.strictEqual(money(1000.5), '1,001');
    assert.strictEqual(money(99.9), '100');
  });

  await t.test('handles negative numbers', () => {
    assert.strictEqual(money(-1000), '-1,000');
    assert.strictEqual(money(-1000.5), '-1,000'); // Math.round(-1000.5) is -1000
    assert.strictEqual(money(-1000.6), '-1,001'); // Math.round(-1000.6) is -1001
  });

  await t.test('coerces strings containing numbers correctly', () => {
    assert.strictEqual(money('1000'), '1,000');
    assert.strictEqual(money('-5000'), '-5,000');
    assert.strictEqual(money('1000.5'), '1,001');
  });

  await t.test('handles falsy or invalid inputs gracefully', () => {
    // Falsy inputs are converted to 0 due to `n || 0`
    assert.strictEqual(money(null), '0');
    assert.strictEqual(money(undefined), '0');
    assert.strictEqual(money(''), '0');
    assert.strictEqual(money(false), '0');

    // Number(true || 0) -> Number(true) -> 1
    assert.strictEqual(money(true), '1');

    // Invalid string returns localized NaN string ("非數值" in zh-TW)
    assert.strictEqual(money('invalid'), '非數值');
    assert.strictEqual(money({}), '非數值');
  });
});
