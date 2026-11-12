'use strict';

function renderExtraOptions(container) {
  for (const extra of washExtras) {
    const label = document.createElement('label');
    label.className = 'extra-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'extras';
    input.value = extra.id;
    input.id = 'extra-' + extra.id;
    input.className = 'form-check-input';
    input.setAttribute('aria-describedby', 'extra-detail-' + extra.id);
    const description = textElement('span', '', 'extra-description');
    const detail = textElement('small', extra.description);
    detail.id = 'extra-detail-' + extra.id;
    description.append(textElement('strong', extra.name), detail);
    const facts = textElement('span', '+' + programPrice(extra), 'extra-facts');
    facts.append(textElement('small', '+' + extra.minutes + ' минут'));
    label.append(input, description, facts);
    container.append(label);
  }
}

function syncExtraOptions(container, program) {
  for (const input of container.querySelectorAll('input')) {
    const extra = washExtras.find(item => item.id === input.value);
    input.disabled = !isExtraAvailable(program, extra);
    if (input.disabled) input.checked = false;
  }
}

function showVisitExtras(container, extras) {
  container.replaceChildren(...extras.map(extra =>
    textElement('li', extra.name + ': +' + programPrice(extra) + ', ' + extra.minutes + ' мин')
  ));
  container.hidden = !extras.length;
}
