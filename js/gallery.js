'use strict';

for (const slider of document.querySelectorAll('.comparison-range')) {
  const frame = slider.closest('.comparison-frame');
  const update = () => {
    frame.style.setProperty('--reveal', slider.value + '%');
    slider.setAttribute('aria-valuetext', 'До: ' + slider.value + '%, после: ' + (100 - Number(slider.value)) + '%');
  };
  slider.disabled = false;
  slider.addEventListener('input', update);
  update();
}
