'use strict';

const bookingForm = document.getElementById('booking-form');
const programField = bookingForm.elements.namedItem('program');
const dateField = bookingForm.elements.namedItem('date');
const timeField = bookingForm.elements.namedItem('time');
const departureField = bookingForm.elements.namedItem('departure');
const bookingError = document.getElementById('booking-error');
const confirmation = document.getElementById('confirmation-modal');
const retryTimes = document.getElementById('retry-times');
const extraOptions = document.getElementById('extra-options');
const preset = findWashProgram(new URLSearchParams(location.search).get('program'));
let timesRevision = 0;
let savingBooking = false;

function selectedVisit() {
  const program = findWashProgram(programField.value);
  const extras = Array.from(extraOptions.querySelectorAll('input:checked'), input => input.value);
  return program ? quoteVisit(program, extras) : undefined;
}

function updateVisit() {
  const program = selectedVisit();
  document.getElementById('visit-program').textContent = program?.name || 'Выберите программу';
  document.getElementById('visit-duration').textContent = program ? program.minutes + ' минут' : 'По программе';
  document.getElementById('visit-price').textContent = program ? programPrice(program) : 'По программе';
  showVisitExtras(document.getElementById('visit-extras'), program?.extras || []);
  const [hours, minutes] = timeField.value.split(':').map(Number);
  document.getElementById('visit-finish').textContent = program && timeField.value
    ? clockLabel(hours * 60 + minutes + program.minutes) + ' (МСК)' : 'Выберите начало';
  let label = 'Пока не выбраны';
  if (dateField.valueAsDate && !dateField.validity.rangeUnderflow) {
    label = visitDayLabel(dateField.value) + (timeField.value ? ', ' + timeField.value : '');
  }
  document.getElementById('visit-time').textContent = label;
}

function setTimeChoices(times, hint, previous = '') {
  const duration = selectedVisit()?.minutes || 0;
  timeField.replaceChildren(new Option('Выберите время', ''));
  for (const time of times) {
    const label = time + ' - готово в ' + clockLabel(clockMinutes(time) + duration);
    timeField.add(new Option(label, time));
  }
  if (times.includes(previous)) timeField.value = previous;
  timeField.disabled = !times.length;
  if (bookingForm.classList.contains('was-validated')) {
    timeField.setAttribute('aria-invalid', String(timeField.willValidate && !timeField.validity.valid));
  }
  document.getElementById('booking-time-hint').textContent = hint;
  updateVisit();
}

function setDateProblem(message = '') {
  dateField.setCustomValidity(message);
  document.getElementById('booking-date-error').textContent = message || 'Выберите сегодняшнюю или будущую дату.';
  if (bookingForm.classList.contains('was-validated')) {
    dateField.setAttribute('aria-invalid', String(!dateField.validity.valid));
  }
}

function applyAvailability(program, day, bookings, previous) {
  const now = moscowNow();
  const deadline = departureField.value ? clockMinutes(departureField.value) : washHours.close;
  const times = availableStarts(day, program.minutes, bookings, now, deadline);
  let hint = departureField.value ? 'Машина будет готова не позднее ' + departureField.value + '.' : 'Выберите начало. Рядом указано время готовности.';
  if (!times.length) {
    const anyTime = availableStarts(day, program.minutes, bookings, now).length;
    hint = anyTime && departureField.value
      ? 'К ' + departureField.value + ' не успеваем. Укажите более поздний выезд или сократите состав услуг.'
      : 'Для этих работ свободного времени нет. Выберите другую дату или сократите состав услуг.';
  }
  setTimeChoices(times, hint, previous);
}

async function refreshTimes() {
  const revision = ++timesRevision;
  syncExtraOptions(extraOptions, findWashProgram(programField.value));
  const program = selectedVisit();
  const day = dateField.value;
  const previous = timeField.value;
  dateField.min = moscowNow().day;
  setDateProblem();
  retryTimes.hidden = true;
  if (!program || !dateField.valueAsDate || dateField.validity.rangeUnderflow) {
    setTimeChoices([], 'Сначала выберите программу и подходящую дату.');
    return;
  }
  if (!departureField.validity.valid) {
    setTimeChoices([], 'Проверьте время выезда.');
    return;
  }
  setTimeChoices([], 'Проверяем доступное время…');
  try {
    const bookings = await readRequests(day);
    if (revision !== timesRevision) return;
    applyAvailability(program, day, bookings, previous);
  } catch {
    if (revision !== timesRevision) return;
    const error = 'Не удалось прочитать расписание в этом браузере. Разрешите хранение данных и повторите проверку.';
    setTimeChoices([], error);
    retryTimes.hidden = false;
  }
}

function showBookingError(message) {
  bookingError.textContent = message;
  bookingError.hidden = false;
}

async function submitBooking(event) {
  event.preventDefault();
  if (savingBooking) return;
  bookingError.hidden = true;
  dateField.min = moscowNow().day;
  if (!validateContactForm(bookingForm)) return;
  const program = selectedVisit();
  if (!program || timeField.disabled || !timeField.value) {
    showBookingError(timeField.disabled ? document.getElementById('booking-time-hint').textContent : 'Выберите доступное время начала визита.');
    return;
  }

  savingBooking = true;
  setFormPending(bookingForm, true, 'Сохраняем запись…');
  try {
    const record = createRequest('booking', bookingForm, program);
    const [hours, minutes] = timeField.value.split(':').map(Number);
    record.day = dateField.value;
    record.start = hours * 60 + minutes;
    await saveRequest(record);
    showReceipt(document.getElementById('confirmation-summary'), record);
    bookingForm.reset();
    bootstrap.Modal.getOrCreateInstance(confirmation).show();
  } catch (error) {
    showBookingError(error instanceof VisitConflict ? error.message : 'Запись не сохранена. Проверьте разрешение на хранение данных и попробуйте ещё раз.');
    await refreshTimes();
  } finally {
    savingBooking = false;
    setFormPending(bookingForm, false);
    if (!bookingError.hidden) bookingError.focus();
  }
}

renderExtraOptions(extraOptions);
for (const program of washPrograms) {
  programField.add(new Option(program.name + ' - ' + programPrice(program), program.id));
}
if (preset) programField.value = preset.id;
programField.addEventListener('change', refreshTimes);
extraOptions.addEventListener('change', refreshTimes);
dateField.addEventListener('change', refreshTimes);
departureField.addEventListener('input', refreshTimes);
timeField.addEventListener('change', updateVisit);
retryTimes.addEventListener('click', refreshTimes);
bookingForm.addEventListener('submit', submitBooking);
bookingForm.addEventListener('reset', () => queueMicrotask(refreshTimes));
confirmation.addEventListener('hidden.bs.modal', () => {
  if (location.hash === '#requests') document.getElementById('requests-title').focus();
  else programField.focus();
});
prepareContactForm(bookingForm);
