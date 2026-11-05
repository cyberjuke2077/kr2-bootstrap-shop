'use strict';

const bookingForm = document.getElementById('booking-form');
const programField = bookingForm.elements.namedItem('program');
const dateField = bookingForm.elements.namedItem('date');
const timeField = bookingForm.elements.namedItem('time');
const confirmation = document.getElementById('confirmation-modal');
const moscowClock = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

function moscowNow() {
  const values = {};
  for (const part of moscowClock.formatToParts(new Date())) {
    values[part.type] = part.value;
  }
  return {
    day: values.year + '-' + values.month + '-' + values.day,
    minutes: Number(values.hour) * 60 + Number(values.minute)
  };
}

function startTimes(duration, earliestMinute) {
  const times = [];
  const opening = 8 * 60;
  const closing = 22 * 60;
  for (let start = opening; start + duration <= closing; start += 30) {
    if (start < earliestMinute) continue;
    const hour = String(Math.floor(start / 60)).padStart(2, '0');
    const minute = String(start % 60).padStart(2, '0');
    times.push(hour + ':' + minute);
  }
  return times;
}

function visitTimeLabel() {
  if (!dateField.valueAsDate) return 'Дата и время появятся после выбора.';
  const day = dateField.valueAsDate.toLocaleDateString('ru-RU', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric'
  });
  return timeField.value ? day + ', ' + timeField.value + ' (МСК)' : day;
}

function updateVisit() {
  const program = findWashProgram(programField.value);
  document.getElementById('visit-program').textContent = program
    ? program.name + ' · ' + program.minutes + ' минут · ' + programPrice(program)
    : 'Выберите программу';
  document.getElementById('visit-time').textContent = visitTimeLabel();
}

function refreshTimes() {
  const now = moscowNow();
  const program = findWashProgram(programField.value);
  const previousTime = timeField.value;
  const noSlotsMessage = 'На этот день подходящего времени уже нет. Выберите следующую дату.';
  dateField.min = now.day;
  const ready = program && dateField.value && !dateField.validity.rangeUnderflow;
  const earliest = dateField.value === now.day ? now.minutes + 1 : 0;
  const times = ready ? startTimes(program.minutes, earliest) : [];
  const exhausted = ready && times.length === 0;

  timeField.replaceChildren(new Option('Выберите время', ''));
  for (const time of times) timeField.add(new Option(time, time));
  if (times.includes(previousTime)) timeField.value = previousTime;
  timeField.disabled = times.length === 0;
  dateField.setCustomValidity(exhausted ? noSlotsMessage : '');
  document.getElementById('booking-date-error').textContent =
    exhausted ? noSlotsMessage : 'Выберите сегодняшнюю или будущую дату.';
  const hint = document.getElementById('booking-time-hint');
  if (exhausted) hint.textContent = noSlotsMessage;
  else if (ready) hint.textContent = 'Показаны сеансы, которые закончатся до закрытия.';
  else hint.textContent = 'Сначала выберите программу и подходящую дату.';
  updateVisit();
}

for (const program of washPrograms) {
  programField.add(new Option(program.name + ' - ' + programPrice(program), program.id));
}
const initialProgram = findWashProgram(new URLSearchParams(location.search).get('program'));
if (initialProgram) programField.value = initialProgram.id;

programField.addEventListener('change', refreshTimes);
dateField.addEventListener('change', refreshTimes);
timeField.addEventListener('change', updateVisit);
window.addEventListener('pageshow', refreshTimes);
window.addEventListener('focus', refreshTimes);
bookingForm.addEventListener('reset', () => queueMicrotask(refreshTimes));
bookingForm.addEventListener('submit', event => {
  event.preventDefault();
  refreshTimes();
  if (!validateContactForm(bookingForm)) return;

  const program = findWashProgram(programField.value);
  document.getElementById('confirmation-summary').textContent =
    program.name + ' · ' + visitTimeLabel() + ' · ' + program.minutes + ' минут · ' + programPrice(program);
  bookingForm.reset();
  bootstrap.Modal.getOrCreateInstance(confirmation).show();
});
confirmation.addEventListener('hidden.bs.modal', () => programField.focus());

refreshTimes();
prepareContactForm(bookingForm);
