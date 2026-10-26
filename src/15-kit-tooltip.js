'use strict';

/** Floating tooltip showing the bill of materials for a kit product. */
function showKitPop(anchor, product) {
  hideKitPop();
  if (!product || !product.components || !product.components.length) return;
  var rect = anchor.getBoundingClientRect();
  var pop = document.createElement('div');
  pop.className = 'kit-pop';
  pop.id = 'kit-pop';
  pop.innerHTML = '<div class="kit-pop-title">اقلام یک ' + esc(product.unit) + ' کامل</div>' +
    product.components.map(function (c) {
      return '<div class="kit-pop-row"><b>' + esc(c.name) + '</b><span class="kit-pop-qty">×' + c.qty + '</span></div>';
    }).join('');
  document.body.appendChild(pop);
  var pw = pop.offsetWidth, ph = pop.offsetHeight;
  var left = rect.left + rect.width / 2 - pw / 2;
  var top = rect.bottom + 8;
  if (left < 10) left = 10;
  if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
  if (top + ph > window.innerHeight - 10) top = rect.top - ph - 8;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function hideKitPop() {
  var p = document.getElementById('kit-pop');
  if (p) p.remove();
}

document.addEventListener('mouseover', function (e) {
  var chip = e.target.closest && e.target.closest('.kit-chip');
  if (!chip) return;
  var pid = chip.dataset.pid;
  if (!pid) return;
  var p = getProd(loadDB(), pid);
  if (p) showKitPop(chip, p);
});

document.addEventListener('mouseout', function (e) {
  if (e.target.closest && e.target.closest('.kit-chip')) hideKitPop();
});
