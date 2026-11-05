'use strict';

function nationalPhone(value) {
  const compact = value.trim().replace(/[()\s-]/g, '');
  return /^(?:\+7|7|8)\d{10}$/.test(compact) ? compact.slice(-10) : compact;
}

function checkContact(field) {
  if (field.name === 'name') {
    field.setCustomValidity(field.value.trim().length < 2 ? 'Введите имя от двух символов.' : '');
  }
  if (field.name === 'phone') {
    const valid = /^\d{10}$/.test(nationalPhone(field.value));
    field.setCustomValidity(valid ? '' : 'Введите 10 цифр после +7.');
  }
}

function prepareContactForm(form) {
  const phoneField = form.elements.namedItem('phone');
  form.noValidate = true;
  form.addEventListener('input', event => {
    const field = event.target;
    checkContact(field);
    if (form.classList.contains('was-validated')) {
      field.setAttribute('aria-invalid', String(!field.validity.valid));
    }
  });
  phoneField.addEventListener('blur', () => {
    phoneField.value = nationalPhone(phoneField.value);
    checkContact(phoneField);
  });
  form.addEventListener('reset', () => {
    form.classList.remove('was-validated');
    form.elements.namedItem('name').setCustomValidity('');
    phoneField.setCustomValidity('');
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  });
  form.querySelector('[type="submit"]').disabled = false;
}

function validateContactForm(form) {
  const nameField = form.elements.namedItem('name');
  const phoneField = form.elements.namedItem('phone');
  nameField.value = nameField.value.trim();
  phoneField.value = nationalPhone(phoneField.value);
  checkContact(nameField);
  checkContact(phoneField);
  form.classList.add('was-validated');
  const fields = Array.from(form.elements).filter(field => field.willValidate);
  for (const field of fields) field.setAttribute('aria-invalid', String(!field.validity.valid));
  const firstInvalid = fields.find(field => !field.validity.valid);
  firstInvalid?.focus();
  return !firstInvalid;
}

function setFormPending(form, pending, label) {
  const button = form.querySelector('[type="submit"]');
  if (pending) button.dataset.normalLabel = button.textContent;
  button.textContent = pending ? label : button.dataset.normalLabel;
  button.disabled = pending;
  form.inert = pending;
  form.setAttribute('aria-busy', String(pending));
}
