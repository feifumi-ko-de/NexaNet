document.addEventListener('DOMContentLoaded', () => {
  const pc = document.querySelector('#computer_id');
  const duration = document.querySelector('#duration_hours');
  const total = document.querySelector('#total-price');
  const money = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  function recalc(){
    if(!pc || !duration || !total) return;
    const opt = pc.options[pc.selectedIndex];
    const price = Number(opt?.dataset?.price || 0);
    total.textContent = money(price * Number(duration.value || 0));
  }
  pc?.addEventListener('change', recalc);
  duration?.addEventListener('change', recalc);
  recalc();
});
