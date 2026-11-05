'use strict';

function nationalPhone(value) {
  const compact = value.trim().replace(/[()\s-]/g, '');
  return /^(?:\+7|7|8)\d{10}$/.test(compact) ? compact.slice(-10) : compact;
}

function prepareContactForm(form) {
  const nameField = form.elements.namedItem('name');
  const phoneField = form.elements.namedItem('phone');

  form.noValidate = true;
  form.addEventListener('input', event => {
    if (event.target === nameField) nameField.setCustomValidity('');
    event.target.removeAttribute('aria-invalid');
  });
  phoneField.addEventListener('blur', () => {
    phoneField.value = nationalPhone(phoneField.value);
  });
  form.addEventListener('reset', () => {
    form.classList.remove('was-validated');
    nameField.setCustomValidity('');
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
  });
  form.querySelector('[type="submit"]').disabled = false;
}

function validateContactForm(form) {
  const nameField = form.elements.namedItem('name');
  const phoneField = form.elements.namedItem('phone');
  nameField.value = nameField.value.trim();
  nameField.setCustomValidity(nameField.value.length < 2 ? 'Введите имя от двух символов.' : '');
  phoneField.value = nationalPhone(phoneField.value);

  form.classList.add('was-validated');
  const fields = Array.from(form.elements).filter(field => field.willValidate);
  for (const field of fields) {
    field.setAttribute('aria-invalid', String(!field.validity.valid));
  }
  const firstInvalid = fields.find(field => !field.validity.valid);
  firstInvalid?.focus();
  return !firstInvalid;
}
