'use strict';

function showWashProgram(program) {
  document.title = program.name + ' - Пена';
  document.getElementById('product-title').textContent = program.name;
  document.getElementById('product-crumb').textContent = program.name;
  document.getElementById('product-category').textContent = program.category;
  document.getElementById('product-duration').textContent = program.minutes + ' минут';
  document.getElementById('product-description').textContent = program.description;
  document.getElementById('product-price').textContent = programPrice(program);
  document.getElementById('product-booking').href = 'order.html?program=' + program.id;

  const photo = document.getElementById('product-photo');
  photo.src = program.image;
  photo.alt = program.alt;
  const steps = document.getElementById('product-steps');
  for (const [stage, description] of program.steps) {
    const row = steps.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = stage;
    row.append(heading);
    row.insertCell().textContent = description;
  }
  document.getElementById('product-details').hidden = false;
}

const requestedId = new URLSearchParams(location.search).get('program') ?? 'express';
const selectedProgram = findWashProgram(requestedId);
if (selectedProgram) {
  showWashProgram(selectedProgram);
} else {
  document.getElementById('product-title').textContent = 'Программа не найдена';
  document.getElementById('product-error').hidden = false;
}
