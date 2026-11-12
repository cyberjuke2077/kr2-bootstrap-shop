'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ URL, location: { href: 'https://pena.test/order.html' } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/programs.js'), 'utf8'), context);
const { recommendWashProgram, findWashProgram, quoteVisit } =
  vm.runInContext('({ recommendWashProgram, findWashProgram, quoteVisit })', context);

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

test('обе допуслуги входят в итог цены и длительности без двойного начисления', () => {
  const program = findWashProgram('complete');
  const quote = quoteVisit(program, ['trunk', 'wax', 'trunk']);
  assert.equal(quote.price, 2200);
  assert.equal(quote.minutes, 80);
  assert.equal(quote.extras.length, 2);
  assert.equal(program.price, 1500);
  assert.equal(program.minutes, 55);
});

test('воск требует мойки кузова, багажник доступен с уборкой салона', () => {
  const interior = findWashProgram('interior');
  assert.throws(() => quoteVisit(interior, ['wax']), /недоступна/);
  assert.throws(() => quoteVisit(interior, ['missing']), /Неизвестная/);
  const quote = quoteVisit(interior, ['trunk']);
  assert.equal(quote.price, 1300);
  assert.equal(quote.minutes, 50);
  assert.equal(quoteVisit(findWashProgram('express'), ['wax']).minutes, 30);
});
