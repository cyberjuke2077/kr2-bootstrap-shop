'use strict';

const shopPhone = '+79858717598';
const historyList = document.getElementById('requests-list');
const historyStatus = document.getElementById('requests-status');
let historyRevision = 0;

function visitDayLabel(day) {
  const [year, month, date] = day.split('-').map(Number);
  const value = new Date(0);
  value.setUTCFullYear(year, month - 1, date);
  return value.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function requestSchedule(record) {
  return visitDayLabel(record.day) + ', ' + clockLabel(record.start) + '-' +
    clockLabel(record.start + record.minutes) + ' (МСК)';
}

function displayPhone(number) {
  return number.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4');
}

function requestMessage(record) {
  const intro = record.kind === 'booking'
    ? 'Хочу согласовать визит: ' + record.programName + ', ' + requestSchedule(record) + ', ' + programPrice(record) + '.'
    : 'Прошу перезвонить' + (record.programName ? ' по программе «' + record.programName + '».' : '.');
  return intro + requestOptions(record) + ' ' + record.name + ', +7' + record.phone + '.' +
    (record.comment ? ' Пожелания: ' + record.comment : '');
}

function requestOptions(record) {
  const extras = record.extras?.length
    ? ' Допуслуги: ' + record.extras.map(extra => extra.name + ' (+' + programPrice(extra) + ')').join(', ') + '.' : '';
  return extras + (record.departure ? ' Машина нужна к ' + record.departure + ' (МСК).' : '');
}

function textElement(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function requestLink(text, href, className) {
  const link = textElement('a', text, className);
  link.href = href;
  return link;
}

function smsLink(record) {
  const query = new URLSearchParams({ body: requestMessage(record) }).toString().replace(/\+/g, '%20');
  return requestLink('Открыть SMS', 'sms:' + shopPhone + '?' + query, 'btn btn-primary');
}

function copyRequestButton(record) {
  const button = textElement('button', 'Скопировать текст', 'btn btn-outline-primary');
  const feedback = textElement('div', '', 'share-feedback');
  feedback.setAttribute('role', 'status');
  button.type = 'button';
  button.addEventListener('click', async () => {
    if (!feedback.isConnected) button.closest('.request-actions').after(feedback);
    const message = requestMessage(record);
    try {
      await navigator.clipboard.writeText(message);
      feedback.textContent = 'Текст заявки скопирован.';
    } catch {
      const label = textElement('label', 'Скопируйте выделенный текст вручную.', 'form-label');
      const field = document.createElement('textarea');
      field.className = 'form-control mt-2';
      field.readOnly = true;
      field.rows = 3;
      field.value = message;
      label.append(field);
      feedback.replaceChildren(label);
      field.focus();
      field.select();
    }
  });
  return button;
}

function showReceipt(container, record) {
  const title = record.kind === 'booking' ? record.programName : 'Запрос на звонок сохранён';
  const detail = record.kind === 'booking'
    ? requestSchedule(record) + ' · ' + programPrice(record)
    : record.name + ', ' + displayPhone(record.phone);
  const handoff = textElement('p', 'Заявка сохранена в этом браузере. Для связи с мойкой отправьте подготовленное SMS или позвоните ');
  handoff.append(requestLink(displayPhone(shopPhone.slice(2)), 'tel:' + shopPhone, 'text-action'), '.');
  const actions = textElement('div', '', 'request-actions');
  actions.append(smsLink(record), copyRequestButton(record), requestLink('Мои заявки', '#requests', 'text-action'));
  container.replaceChildren(
    textElement('p', title, 'receipt-lead'), textElement('p', detail),
    handoff, actions
  );
  if (requestOptions(record)) actions.before(textElement('p', requestOptions(record).trim()));
}

function historyCard(record) {
  const card = textElement('article', '', 'request-card');
  card.dataset.id = record.id;
  const booking = record.kind === 'booking';
  const heading = booking ? record.programName : 'Обратный звонок';
  const detail = booking ? requestSchedule(record) + ' · ' + programPrice(record) : record.programName || 'Подбор программы';
  const phone = displayPhone(record.phone);
  const remove = textElement('button', 'Удалить с устройства', 'btn btn-link');
  remove.type = 'button';
  remove.dataset.remove = record.id;
  remove.setAttribute('aria-label', 'Удалить с устройства: ' + heading + ', ' + detail);
  const actions = textElement('div', '', 'request-actions');
  actions.append(smsLink(record), copyRequestButton(record), remove);
  card.append(textElement('h2', heading), textElement('p', detail), textElement('p', record.name + ', ' + phone));
  if (record.email) card.append(textElement('p', record.email));
  if (record.comment) card.append(textElement('p', record.comment));
  if (requestOptions(record)) card.append(textElement('p', requestOptions(record).trim()));
  card.append(actions);
  return card;
}

async function renderHistory() {
  const revision = ++historyRevision;
  historyList.setAttribute('aria-busy', 'true');
  try {
    const records = await readRequests();
    if (revision !== historyRevision) return;
    records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (records.length) {
      historyList.replaceChildren(...records.map(historyCard));
    } else {
      const panel = textElement('div', '', 'empty-panel');
      panel.append(textElement('h2', 'Заявок пока нет'), textElement('p', 'Здесь появятся сохранённые визиты и запросы на звонок.'),
        requestLink('Выбрать программу', 'catalog.html', 'btn btn-primary'));
      historyList.replaceChildren(panel);
    }
  } catch {
    if (revision !== historyRevision) return;
    const retry = textElement('button', 'Повторить', 'btn btn-outline-primary');
    retry.type = 'button';
    retry.addEventListener('click', renderHistory);
    historyList.replaceChildren(textElement('p', 'Не удалось прочитать заявки. Проверьте разрешение браузера на хранение данных.', 'alert alert-warning'), retry);
  } finally {
    if (revision === historyRevision) historyList.setAttribute('aria-busy', 'false');
  }
}

function confirmRemoval(button) {
  const group = textElement('div', '', 'request-actions');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Подтвердите удаление');
  const keep = textElement('button', 'Оставить', 'btn btn-outline-primary');
  const remove = textElement('button', 'Удалить', 'btn btn-primary');
  keep.type = remove.type = 'button';
  group.append(textElement('span', 'Удалить эту заявку из браузера?'), keep, remove);
  button.hidden = true;
  button.parentElement.after(group);
  keep.addEventListener('click', () => { group.remove(); button.hidden = false; button.focus(); });
  remove.addEventListener('click', async () => {
    keep.disabled = remove.disabled = true;
    try {
      await deleteRequest(button.dataset.remove);
      await renderHistory();
      historyStatus.textContent = 'Заявка удалена с этого устройства.';
      document.getElementById('requests-title').focus();
    } catch {
      keep.disabled = remove.disabled = false;
      group.firstElementChild.textContent = 'Не удалось удалить заявку. Попробуйте ещё раз.';
    }
  });
  keep.focus();
}

historyList.addEventListener('click', event => {
  const button = event.target.closest('button[data-remove]');
  if (button) confirmRemoval(button);
});
