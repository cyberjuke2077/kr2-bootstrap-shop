'use strict';

function comparisonCell(tag, text, scope) {
  const cell = document.createElement(tag);
  cell.textContent = text;
  if (scope) cell.scope = scope;
  return cell;
}

function comparisonRow(label, values) {
  const row = document.createElement('tr');
  row.append(comparisonCell('th', label, 'row'));
  for (const value of values) row.append(comparisonCell('td', value));
  return row;
}

function renderComparison() {
  const table = document.getElementById('program-comparison');
  const heading = table.createTHead().insertRow();
  heading.append(comparisonCell('th', 'Программа', 'col'));
  for (const program of washPrograms) heading.append(comparisonCell('th', program.name, 'col'));
  const body = table.createTBody();
  body.append(comparisonRow('Стоимость', washPrograms.map(programPrice)));
  body.append(comparisonRow('Длительность', washPrograms.map(program => program.minutes + ' минут')));
  for (const work of washWorkItems) {
    body.append(comparisonRow(work.name, washPrograms.map(program =>
      program.work.includes(work.id) ? 'Входит' : 'Не входит'
    )));
  }
  const footer = table.createTFoot().insertRow();
  footer.append(comparisonCell('th', 'Запись', 'row'));
  for (const program of washPrograms) {
    const link = document.createElement('a');
    link.href = 'order.html?program=' + program.id;
    link.className = 'text-action';
    link.textContent = 'Выбрать →';
    link.setAttribute('aria-label', 'Выбрать программу «' + program.name + '»');
    footer.insertCell().append(link);
  }
}

renderComparison();
