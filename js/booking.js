(() => {
  // ── State ──────────────────────────────────────────────────
  const state = {
    service: null,
    stylist: null,
    date: null,
    time: null,
    name: '',
    email: '',
    phone: '',
    notes: ''
  };

  const STEPS = ['service', 'stylist', 'datetime', 'details', 'confirm'];
  let currentStep = 0;

  // ── Calendar data ──────────────────────────────────────────
  let calYear, calMonth, calInitialized = false;
  const today = new Date();

  // Mock "booked" dates for current month (day numbers)
  const BOOKED_DATES = new Set([3, 7, 12, 14, 18, 21, 25]);

  const TIME_SLOTS = [
    { time: '9:00 AM',  taken: false },
    { time: '10:30 AM', taken: false },
    { time: '12:00 PM', taken: true  },
    { time: '1:30 PM',  taken: false },
    { time: '3:00 PM',  taken: false },
    { time: '4:30 PM',  taken: true  },
  ];

  // ── DOM refs ──────────────────────────────────────────────
  const steps = document.querySelectorAll('.booking-step');
  const stepItems = document.querySelectorAll('.step-item');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  // ── Step rendering ─────────────────────────────────────────
  function goToStep(n) {
    currentStep = Math.max(0, Math.min(n, STEPS.length - 1));

    steps.forEach((s, i) => s.classList.toggle('active', i === currentStep));

    stepItems.forEach((item, i) => {
      const num = item.querySelector('.step-num');
      item.classList.remove('active', 'done', 'prefilled');
      num.classList.remove('active');

      if (i === currentStep) {
        item.classList.add('active');
        num.classList.add('active');
        num.textContent = i + 1;
      } else if (i < currentStep) {
        num.textContent = '✓';
        item.classList.add('done');
      } else {
        num.textContent = i + 1;
        // Re-apply prefilled only for future steps that have pre-filled data
        if (i === 1 && state.stylist) item.classList.add('prefilled');
        if (i === 2 && state.date && state.time) item.classList.add('prefilled');
      }
    });

    if (prevBtn) prevBtn.style.display = currentStep === 0 ? 'none' : 'inline-flex';
    if (nextBtn) {
      nextBtn.style.display = 'inline-flex';
      nextBtn.textContent = currentStep === STEPS.length - 1 ? 'Confirm Booking' : 'Continue →';
    }

    if (STEPS[currentStep] === 'datetime' && !calInitialized) initCalendar();
    if (STEPS[currentStep] === 'confirm') renderSummary();
  }

  function canAdvance() {
    switch (STEPS[currentStep]) {
      case 'service':  return !!state.service;
      case 'stylist':  return !!state.stylist;
      case 'datetime': return !!(state.date && state.time);
      case 'details':  return !!(state.name && state.email);
      default: return true;
    }
  }

  // ── Service selection ──────────────────────────────────────
  document.querySelectorAll('.service-pick-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.service-pick-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.service = card.getAttribute('data-service');
    });
  });

  // ── Stylist selection ──────────────────────────────────────
  document.querySelectorAll('.stylist-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.stylist-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.stylist = card.getAttribute('data-stylist');
    });
  });

  // ── Calendar ───────────────────────────────────────────────
  function initCalendar() {
    if (!calYear) calYear  = today.getFullYear();
    if (calMonth === undefined || calMonth === null) calMonth = today.getMonth();
    calInitialized = true;
    renderCalendar();
    if (state.date) renderTimeSlots();
  }

  function renderCalendar() {
    const calGrid = document.getElementById('calGrid');
    const calMonthLabel = document.getElementById('calMonthLabel');
    if (!calGrid || !calMonthLabel) return;

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    calMonthLabel.textContent = `${monthNames[calMonth]} ${calYear}`;

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    calGrid.innerHTML = '';

    // Day headers
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => {
      const h = document.createElement('div');
      h.className = 'cal-day-label';
      h.textContent = d;
      calGrid.appendChild(h);
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calGrid.appendChild(empty);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
      const isPast  = new Date(calYear, calMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isBooked = BOOKED_DATES.has(d);

      cell.className = 'cal-day';
      if (isToday) cell.classList.add('today');

      if (isPast || isBooked) {
        cell.classList.add('booked');
        cell.textContent = d;
      } else {
        cell.classList.add('available');
        cell.textContent = d;
        cell.addEventListener('click', () => selectDate(d, cell));
      }

      if (state.date && state.date.day === d && state.date.month === calMonth && state.date.year === calYear) {
        cell.classList.add('selected');
      }

      calGrid.appendChild(cell);
    }
  }

  function selectDate(day, cell) {
    document.querySelectorAll('.cal-day.selected').forEach(c => c.classList.remove('selected'));
    cell.classList.add('selected');
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    state.date = { day, month: calMonth, year: calYear, label: `${monthNames[calMonth]} ${day}, ${calYear}` };
    state.time = null;

    renderTimeSlots();
    const slotsEl = document.getElementById('timeSlots');
    if (slotsEl) slotsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderTimeSlots() {
    const slotsEl = document.getElementById('timeSlots');
    if (!slotsEl) return;
    slotsEl.innerHTML = `<div class="time-slots-heading">Available Times</div>`;

    TIME_SLOTS.forEach(slot => {
      const el = document.createElement('div');
      el.className = 'time-slot' + (slot.taken ? ' taken' : '');
      el.innerHTML = `<span class="ts-time">${slot.time}</span><span class="ts-status ${slot.taken ? 'taken' : 'open'}">${slot.taken ? 'Unavailable' : 'Available'}</span>`;

      if (!slot.taken) {
        if (state.time === slot.time) el.classList.add('selected');
        el.addEventListener('click', () => {
          document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
          el.classList.add('selected');
          state.time = slot.time;
        });
      }

      slotsEl.appendChild(el);
    });
  }

  document.getElementById('calPrev')?.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });

  document.getElementById('calNext')?.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  // ── Details form ───────────────────────────────────────────
  document.getElementById('fName')?.addEventListener('input',  e => state.name  = e.target.value);
  document.getElementById('fEmail')?.addEventListener('input', e => state.email = e.target.value);
  document.getElementById('fPhone')?.addEventListener('input', e => state.phone = e.target.value);
  document.getElementById('fNotes')?.addEventListener('input', e => state.notes = e.target.value);

  // ── Summary ────────────────────────────────────────────────
  function renderSummary() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
    set('sumService', state.service);
    set('sumStylist', state.stylist);
    set('sumDate',    state.date?.label);
    set('sumTime',    state.time);
    set('sumName',    state.name);
    set('sumEmail',   state.email);
  }

  // ── Nav buttons ────────────────────────────────────────────
  prevBtn?.addEventListener('click', () => goToStep(currentStep - 1));

  nextBtn?.addEventListener('click', () => {
    if (!canAdvance()) {
      showError();
      return;
    }
    clearError();

    if (STEPS[currentStep] === 'confirm') {
      // Submit: show done screen
      steps.forEach(s => s.classList.remove('active'));
      document.getElementById('step-done')?.classList.add('active');
      document.getElementById('stepNav').style.display = 'none';
      document.querySelectorAll('.step-item').forEach(item => {
        item.classList.remove('active');
        const num = item.querySelector('.step-num');
        num.textContent = '✓';
        item.classList.add('done');
      });
      return;
    }

    goToStep(currentStep + 1);
  });

  function showError() {
    const step = steps[currentStep];
    let msg = step?.querySelector('.step-error');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'step-error';
      msg.style.cssText = 'color:var(--terracotta);font-size:0.85rem;margin-top:1rem;';
      step?.appendChild(msg);
    }
    const messages = {
      service:  'Please select a service to continue.',
      stylist:  'Please choose your stylist.',
      datetime: state.date ? 'Please select a time slot.' : 'Please pick a date.',
      details:  'Name and email are required.',
    };
    msg.textContent = messages[STEPS[currentStep]] || 'Please complete this step.';
  }

  function clearError() {
    document.querySelectorAll('.step-error').forEach(e => e.remove());
  }

  // ── Pre-fill from URL params ───────────────────────────────
  function loadFromParams() {
    const params = new URLSearchParams(window.location.search);
    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const rawDate = params.get('date');
    const rawTime = params.get('time');
    const rawStylist = params.get('stylist');
    const rawService = params.get('service');
    const rawSubservice = params.get('subservice');

    if (rawDate) {
      const parts = rawDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      calYear  = y;
      calMonth = m;
      state.date = { day: d, month: m, year: y, label: `${MONTH_NAMES[m]} ${d}, ${y}` };
    }
    if (rawTime) state.time = rawTime;
    if (rawStylist) state.stylist = rawStylist;

    if (rawService) {
      state.service = rawService;
      document.querySelectorAll('.service-pick-card').forEach(card => {
        if (card.getAttribute('data-service') === rawService) {
          card.classList.add('selected');
          if (rawSubservice) {
            const badge = document.createElement('div');
            badge.className = 'service-sub-badge';
            badge.textContent = rawSubservice;
            card.appendChild(badge);
          }
        }
      });
      stepItems[0]?.classList.add('prefilled');
    }

    if (rawSubservice) {
      const noteText = `Requesting: ${rawSubservice}`;
      state.notes = noteText;
      const notesEl = document.getElementById('fNotes');
      if (notesEl) notesEl.value = noteText;
    }

    // Mark pre-filled step indicators gold
    if (state.stylist) stepItems[1]?.classList.add('prefilled');
    if (state.date && state.time) stepItems[2]?.classList.add('prefilled');

    // Pre-select stylist card if pre-filled
    if (state.stylist) {
      document.querySelectorAll('.stylist-card').forEach(card => {
        if (card.getAttribute('data-stylist') === state.stylist) card.classList.add('selected');
      });
    }
  }

  // ── Init ───────────────────────────────────────────────────
  loadFromParams();
  goToStep(0);
})();
