/* Presentation only. No storage migration, request interception, or content generation. */
(() => {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sbToggle');
  const scrim = document.getElementById('sbScrim');
  const close = document.getElementById('revampHistoryClose');
  const search = document.getElementById('searchWrap');
  const navActions = document.querySelector('.nav-actions');
  const newChat = document.getElementById('newChat');
  const small = window.matchMedia('(max-width:1000px)');
  const peek = document.createElement('div');
  peek.className = 'revamp-conversation-peek';
  peek.setAttribute('aria-hidden','true');
  peek.hidden = true;
  document.body.appendChild(peek);
  function showPeek(event) {
    const row = event.target.closest('.sb-item');
    if(small.matches || !row || row.classList.contains('selmode')) {peek.hidden=true; return;}
    const content = row.querySelector('.sb-peek');
    if(!content) return;
    peek.innerHTML = content.innerHTML;
    peek.hidden = false;
    const rect = row.getBoundingClientRect();
    peek.style.left = Math.min(rect.right+12,window.innerWidth-292)+'px';
    peek.style.top = Math.max(84,Math.min(rect.top,window.innerHeight-peek.offsetHeight-16))+'px';
  }
  function hidePeek(event) {
    if(event.target.closest('.sb-item')?.contains(event.relatedTarget)) return;
    peek.hidden=true;
  }
  sidebar.addEventListener('pointerover',showPeek);
  sidebar.addEventListener('pointerout',hidePeek);
  sidebar.addEventListener('focusin',showPeek);
  sidebar.addEventListener('focusout',hidePeek);
  sidebar.addEventListener('scroll',()=>{peek.hidden=true;},true);
  window.addEventListener('pagechange',()=>{peek.hidden=true;});
  let previousFocus = null;
  let wasOpen = false;

  function placeSearch() {
    if (small.matches) sidebar.insertBefore(search, newChat);
    else navActions.insertBefore(search, document.getElementById('settingsBtn'));
    if (!small.matches && sidebar.classList.contains('open')) toggle.click();
  }
  function syncPage() {
    const active = document.querySelector('.nav-tab.on');
    if (active) document.body.dataset.page = active.dataset.page;
  }
  function syncDrawer() {
    const open = sidebar.classList.contains('open') && small.matches;
    sidebar.inert = small.matches && !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-controls', 'sidebar');
    sidebar.setAttribute('aria-label', 'Conversations');
    if (open) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      if (!wasOpen) {previousFocus = document.activeElement; close.focus();}
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      if (wasOpen && previousFocus && previousFocus.isConnected) previousFocus.focus();
    }
    wasOpen = open;
  }
  close.addEventListener('click', () => {if(sidebar.classList.contains('open')) toggle.click();});
  sidebar.addEventListener('keydown', event => {
    if (!small.matches || !sidebar.classList.contains('open')) return;
    if (event.key === 'Tab') {
      const controls = [...sidebar.querySelectorAll('button,input,a,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    }
  });
  new MutationObserver(syncDrawer).observe(sidebar,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pagechange',syncPage);
  small.addEventListener('change',() => {placeSearch(); syncDrawer();});
  // This shared control belongs outside the Chat panel so other pages can use it.
  document.getElementById('stage').appendChild(document.getElementById('toTop'));
  const examen = document.getElementById('examenModal');
  document.body.appendChild(examen);
  examen.setAttribute('role','dialog');
  examen.setAttribute('aria-modal','true');
  examen.setAttribute('aria-labelledby','examenTitle');
  let examenFocus = null;
  new MutationObserver(() => {
    if (!examen.hidden) {examenFocus = document.activeElement; document.getElementById('examenClose').focus();}
    else if (examenFocus?.isConnected) examenFocus.focus();
  }).observe(examen,{attributes:true,attributeFilter:['hidden']});
  examen.addEventListener('keydown',event => {
    if(event.key !== 'Tab') return;
    const controls = [...examen.querySelectorAll('button')].filter(el => !el.hidden && !el.disabled);
    const first = controls[0], last = controls[controls.length-1];
    if(event.shiftKey && document.activeElement === first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement === last){event.preventDefault();first.focus();}
  });
  placeSearch(); syncPage(); syncDrawer();
})();
