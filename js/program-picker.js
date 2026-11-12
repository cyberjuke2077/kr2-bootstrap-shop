'use strict';

const conditionForm = document.getElementById('condition-form');
const recommendation = document.getElementById('recommendation');
const recommendationEmpty = document.getElementById('recommendation-empty');

function updateRecommendation() {
  const needs = Array.from(conditionForm.querySelectorAll('input:checked'), input => input.value);
  const program = recommendWashProgram(needs);
  recommendation.hidden = !program;
  recommendationEmpty.hidden = Boolean(program);
  if (!program) return;
  document.getElementById('recommended-name').textContent = program.name;
  document.getElementById('recommended-price').textContent = programPrice(program);
  document.getElementById('recommended-duration').textContent = program.minutes + ' минут';
  document.getElementById('recommended-reason').textContent = 'Включает все выбранные работы: ' +
    washWorkItems.filter(work => needs.includes(work.id)).map(work => work.name.toLowerCase()).join(', ') + '.';
  document.getElementById('recommended-booking').href = 'order.html?program=' + program.id;
  document.getElementById('recommended-details').href = 'product.html?program=' + program.id;
}

conditionForm.addEventListener('change', updateRecommendation);
// При нажатии reset микрозадача может выполниться до стандартного сброса полей.
conditionForm.addEventListener('reset', () => setTimeout(updateRecommendation, 0));
conditionForm.addEventListener('submit', event => event.preventDefault());
updateRecommendation();
