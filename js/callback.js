'use strict';

const callbackModal = document.getElementById('callback-modal');
const callbackForm = document.getElementById('callback-form');
const callbackSuccess = document.getElementById('callback-success');
const callbackProgram = callbackForm.elements.namedItem('program');
const callbackError = document.getElementById('callback-error');
let savingCallback = false;

for (const program of washPrograms) callbackProgram.add(new Option(program.name, program.id));
callbackModal.addEventListener('show.bs.modal', () => {
  callbackForm.reset();
  callbackForm.hidden = false;
  callbackSuccess.hidden = true;
  callbackError.hidden = true;
  callbackProgram.value = programField.value || preset?.id || '';
});
callbackModal.addEventListener('shown.bs.modal', () => callbackForm.elements.namedItem('name').focus());
callbackModal.addEventListener('hide.bs.modal', event => {
  if (savingCallback) event.preventDefault();
});
callbackModal.addEventListener('hidden.bs.modal', () => {
  if (location.hash === '#callback') history.replaceState(null, '', '#booking');
  const target = location.hash === '#requests' ? 'requests-title' : 'booking-title';
  document.getElementById(target).focus({ preventScroll: true });
  document.title = location.hash === '#requests' ? 'Мои заявки - Пена' : 'Запись на мойку - Пена';
});

callbackForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (savingCallback || !validateContactForm(callbackForm)) return;
  savingCallback = true;
  setFormPending(callbackForm, true, 'Сохраняем запрос…');
  callbackError.hidden = true;
  try {
    const record = createRequest('callback', callbackForm, findWashProgram(callbackProgram.value));
    await saveRequest(record);
    callbackForm.reset();
    callbackForm.hidden = true;
    showReceipt(callbackSuccess, record);
    callbackSuccess.hidden = false;
    callbackSuccess.focus();
  } catch {
    callbackError.textContent = 'Запрос не сохранён. Разрешите браузеру хранить данные и попробуйте ещё раз.';
    callbackError.hidden = false;
  } finally {
    savingCallback = false;
    setFormPending(callbackForm, false);
    if (!callbackError.hidden) callbackError.focus();
  }
});

function routeOrder(focus) {
  const hash = location.hash;
  if (hash === '#contacts') {
    if (!document.getElementById('booking-panel').hidden) refreshTimes();
    return;
  }
  const historyOpen = hash === '#requests';
  document.getElementById('booking-panel').hidden = historyOpen;
  document.getElementById('requests-panel').hidden = !historyOpen;
  const navRequests = document.getElementById('nav-requests');
  navRequests.classList.toggle('active', historyOpen);
  const navBooking = document.getElementById('nav-booking');
  navRequests.removeAttribute('aria-current');
  navBooking.removeAttribute('aria-current');
  (historyOpen ? navRequests : navBooking).setAttribute('aria-current', 'page');
  if (hash === '#callback') {
    refreshTimes();
    document.title = 'Обратный звонок - Пена';
    bootstrap.Modal.getOrCreateInstance(callbackModal).show();
    return;
  }
  for (const modal of [callbackModal, confirmation]) bootstrap.Modal.getInstance(modal)?.hide();
  document.title = historyOpen ? 'Мои заявки - Пена' : 'Запись на мойку - Пена';
  if (historyOpen) renderHistory();
  else refreshTimes();
  if (focus || historyOpen) document.getElementById(historyOpen ? 'requests-title' : 'booking-title').focus();
}

window.addEventListener('hashchange', () => routeOrder(true));
window.addEventListener('pageshow', event => {
  if (event.persisted) routeOrder(false);
});
window.addEventListener('focus', () => {
  if (savingBooking || savingCallback || document.querySelector('.modal.show')) return;
  if (document.getElementById('requests-panel').hidden) refreshTimes();
  else renderHistory();
});
prepareContactForm(callbackForm);
routeOrder(false);
