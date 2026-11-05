'use strict';

const bookingForm = document.getElementById('booking-form');
const programField = bookingForm.elements.namedItem('program');
const dateField = bookingForm.elements.namedItem('date');
const timeField = bookingForm.elements.namedItem('time');
const bookingError = document.getElementById('booking-error');
const confirmation = document.getElementById('confirmation-modal');
const retryTimes = document.getElementById('retry-times');
const preset = findWashProgram(new URLSearchParams(location.search).get('program'));
let timesRevision = 0;
let savingBooking = false;

function updateVisit() {
  const program = findWashProgram(programField.value);
  document.getElementById('visit-program').textContent = program?.name || 'Выберите программу';
  document.getElementById('visit-duration').textContent = program ? program.minutes + ' минут' : 'По программе';
  document.getElementById('visit-price').textContent = program ? programPrice(program) : 'По программе';
  let label = 'Пока не выбраны';
  if (dateField.valueAsDate && !dateField.validity.rangeUnderflow) {
    label = visitDayLabel(dateField.value) + (timeField.value ? ', ' + timeField.value : '');
  }
  document.getElementById('visit-time').textContent = label;
}

function setTimeChoices(times, hint, previous = '') {
  timeField.replaceChildren(new Option('Выберите время', ''));
  for (const time of times) timeField.add(new Option(time, time));
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

async function refreshTimes() {
  const revision = ++timesRevision;
  const program = findWashProgram(programField.value);
  const day = dateField.value;
  const previous = timeField.value;
  dateField.min = moscowNow().day;
  setDateProblem();
  retryTimes.hidden = true;
  if (!program || !dateField.valueAsDate || dateField.validity.rangeUnderflow) {
    setTimeChoices([], 'Сначала выберите программу и подходящую дату.');
    return;
  }

  timeField.disabled = true;
  try {
    const bookings = await readRequests(day);
    if (revision !== timesRevision) return;
    const times = availableStarts(day, program.minutes, bookings);
    const hint = times.length ? 'Учитываем часы работы и ваши сохранённые визиты.' : 'Для этой программы на выбранный день времени больше нет.';
    if (!times.length) setDateProblem(hint);
    setTimeChoices(times, hint, previous);
  } catch {
    if (revision !== timesRevision) return;
    const error = 'Не удалось прочитать расписание в этом браузере. Разрешите хранение данных и повторите проверку.';
    setDateProblem(error);
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
  const program = findWashProgram(programField.value);
  if (!program || timeField.disabled || !timeField.value) {
    showBookingError('Выберите доступное время начала визита.');
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

for (const program of washPrograms) {
  programField.add(new Option(program.name + ' - ' + programPrice(program), program.id));
}
if (preset) programField.value = preset.id;
programField.addEventListener('change', refreshTimes);
dateField.addEventListener('change', refreshTimes);
timeField.addEventListener('change', updateVisit);
retryTimes.addEventListener('click', refreshTimes);
bookingForm.addEventListener('submit', submitBooking);
bookingForm.addEventListener('reset', () => queueMicrotask(refreshTimes));
confirmation.addEventListener('hidden.bs.modal', () => {
  if (location.hash === '#requests') document.getElementById('requests-title').focus();
  else programField.focus();
});
prepareContactForm(bookingForm);
