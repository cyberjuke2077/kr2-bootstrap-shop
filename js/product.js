'use strict';

function showProcessPhoto({ file, alt, caption }) {
  const photo = new Image(1080, 720);
  photo.loading = 'lazy';
  photo.decoding = 'async';
  photo.alt = alt;
  photo.sizes = '(min-width: 1400px) 510px, (min-width: 992px) 39vw, (min-width: 768px) 696px, (min-width: 576px) 516px, 100vw';
  photo.srcset = `images/${file}-480.webp 480w, images/${file}.webp 1080w`;
  photo.src = `images/${file}.webp`;
  const note = document.createElement('figcaption');
  note.textContent = caption;
  document.getElementById('program-process').replaceChildren(photo, note);
}

function showWashProgram(program) {
  document.title = program.name + ' - Пена';
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[name="description"]').content = program.description;
  document.querySelector('meta[property="og:description"]').content = program.description;
  document.getElementById('product-title').textContent = program.name;
  document.getElementById('product-crumb').textContent = program.name;
  document.getElementById('product-category').textContent = program.category;
  document.getElementById('product-duration').textContent = program.minutes + ' минут';
  document.getElementById('product-description').textContent = program.description;
  document.getElementById('product-price').textContent = programPrice(program);
  document.getElementById('product-booking').href = 'order.html?program=' + program.id;
  document.getElementById('product-callback').href = 'order.html?program=' + program.id + '#callback';

  const photo = document.getElementById('product-photo');
  photo.src = program.image;
  photo.alt = program.alt;
  showProcessPhoto(program.processPhoto);
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
  document.title = 'Программа не найдена - Пена';
  document.getElementById('product-crumb').textContent = 'Программа не найдена';
  document.getElementById('product-error').hidden = false;
}
