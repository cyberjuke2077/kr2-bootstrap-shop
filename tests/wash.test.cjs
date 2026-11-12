'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ URL, location: { href: 'https://pena.test/order.html' } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/programs.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/requests.js'), 'utf8'), context);
const { recommendWashProgram, findWashProgram, quoteVisit } =
  vm.runInContext('({ recommendWashProgram, findWashProgram, quoteVisit })', context);
const { availableStarts, clockMinutes, validateBookingDetails, moscowNow } =
  vm.runInContext('({ availableStarts, clockMinutes, validateBookingDetails, moscowNow })', context);
const day = '2027-01-16';
const now = { day: '2027-01-15', minutes: 9 * 60 };
const starts = (duration, visits = [], deadline, clock = now) =>
  Array.from(availableStarts(day, duration, visits, clock, deadline));

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

test('границы рабочего дня включают точное окончание в 22:00', () => {
  assert.equal(starts(30)[0], '08:00');
  assert.equal(starts(30).at(-1), '21:30');
  assert.equal(starts(55).at(-1), '21:00');
  assert.equal(starts(80).at(-1), '20:30');
  assert.deepEqual(starts(840), ['08:00']);
  assert.deepEqual(starts(841), []);
});

test('время выезда ограничивает окончание с точностью до минуты', () => {
  assert.deepEqual(starts(80, [], clockMinutes('09:20')), ['08:00']);
  assert.deepEqual(starts(80, [], clockMinutes('09:19')), []);
  assert.deepEqual(starts(20, [], clockMinutes('07:59')), []);
  assert.deepEqual(starts(30, [], clockMinutes('23:59')), starts(30));
});

test('занятый интервал исключает пересечения, но разрешает соседние визиты', () => {
  const visits = [{ kind: 'booking', day, start: 600, minutes: 80 }];
  const times = starts(30, visits);
  assert.ok(times.includes('09:30'));
  for (const time of ['10:00', '10:30', '11:00']) assert.ok(!times.includes(time), time);
  assert.ok(times.includes('11:30'));
  assert.ok(!starts(80, visits).includes('09:00'));
  assert.deepEqual(starts(30, [{ kind: 'booking', day, start: 600, minutes: 60 }], 690).slice(-1), ['11:00']);
});

test('прошедшие начала и даты скрыты, чужие даты и обратные звонки не блокируют бокс', () => {
  const clock = { day, minutes: 600 };
  assert.equal(starts(20, [], undefined, clock)[0], '10:30');
  assert.deepEqual(starts(20, [], undefined, { day: '2027-01-17', minutes: 0 }), []);
  const irrelevant = [
    { kind: 'callback', day, start: 480, minutes: 840 },
    { kind: 'booking', day: '2027-01-17', start: 480, minutes: 840 }
  ];
  assert.deepEqual(starts(20, irrelevant), starts(20));
});

test('некорректная длительность или время не создают бесконечный список слотов', () => {
  for (const duration of [0, -10, NaN, Infinity, 1.5]) assert.deepEqual(starts(duration), []);
  for (const value of ['', '25:00', '09:60', '9:00', 'abc']) assert.ok(Number.isNaN(clockMinutes(value)));
  assert.deepEqual(starts(20, [], NaN), []);
});

test('перед сохранением заново проверяется состав, цена и длительность', () => {
  const record = { programId: 'complete', price: 2200, minutes: 80, extras: [{ id: 'trunk' }, { id: 'wax' }], departure: '12:00' };
  assert.equal(validateBookingDetails(record), 720);
  assert.throws(() => validateBookingDetails({ ...record, minutes: 55 }), /изменились/);
  assert.throws(() => validateBookingDetails({ ...record, price: 1500 }), /изменились/);
  assert.throws(() => validateBookingDetails({ ...record, departure: '24:00' }), /выезда/);
  assert.equal(validateBookingDetails({ programId: 'express', price: 650, minutes: 20 }), 1320);
});

test('московские часы корректно переходят на следующий день независимо от зоны браузера', () => {
  vm.runInContext('Date = class extends Date { constructor() { super("2027-01-15T21:05:00Z"); } }', context);
  assert.equal(moscowNow().day, '2027-01-16');
  assert.equal(moscowNow().minutes, 5);
});
