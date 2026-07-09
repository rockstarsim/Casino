/** Quick bet chip buttons — works on any page with .chip-pick + nearby number input */
document.querySelectorAll('.chip-pick').forEach(btn => {
  btn.addEventListener('click', () => {
    const row = btn.closest('.bet-controls') || btn.closest('.control-step');
    const input = row?.querySelector('input[type="number"]');
    if (input) input.value = btn.dataset.amount;
  });
});
