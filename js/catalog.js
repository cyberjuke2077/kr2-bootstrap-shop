'use strict';

const callbackModal = document.getElementById('callback-modal');
const callbackForm = document.getElementById('callback-form');
const callbackSuccess = document.getElementById('callback-success');

callbackModal.addEventListener('show.bs.modal', event => {
  const program = findWashProgram(event.relatedTarget?.dataset.program);
  if (!program) {
    event.preventDefault();
    return;
  }

  callbackForm.reset();
  callbackForm.hidden = false;
  callbackSuccess.hidden = true;
  document.getElementById('callback-program').textContent = program.name + ' · ' + programPrice(program);
  document.getElementById('callback-booking').href = 'order.html?program=' + program.id;
});

callbackModal.addEventListener('shown.bs.modal', () => {
  callbackForm.elements.namedItem('name').focus();
});

callbackForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!validateContactForm(callbackForm)) return;

  callbackForm.reset();
  callbackForm.hidden = true;
  callbackSuccess.hidden = false;
  callbackSuccess.focus();
});

prepareContactForm(callbackForm);
