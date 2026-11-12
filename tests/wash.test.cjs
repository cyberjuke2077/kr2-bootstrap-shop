'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ URL, location: { href: 'https://pena.test/order.html' } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/programs.js'), 'utf8'), context);
const { recommendWashProgram } = vm.runInContext('({ recommendWashProgram })', context);

test('подбор покрывает все 15 непустых сочетаний зон минимальной программой', () => {
  const zones = ['body', 'wheels', 'seats', 'mats'];
  for (let mask = 1; mask < 16; mask++) {
    const needs = zones.filter((_, index) => mask & (1 << index));
    const exterior = needs.some(id => id === 'body' || id === 'wheels');
    const interior = needs.some(id => id === 'seats' || id === 'mats');
    const expected = exterior && interior ? 'complete' : exterior ? 'express' : 'interior';
    const program = recommendWashProgram(needs);
    assert.equal(program.id, expected, needs.join(', '));
    assert.ok(needs.every(id => program.work.includes(id)));
  }
});

test('пустой или неизвестный набор работ не даёт случайную рекомендацию', () => {
  assert.equal(recommendWashProgram([]), undefined);
  assert.equal(recommendWashProgram(['unknown']), undefined);
});
