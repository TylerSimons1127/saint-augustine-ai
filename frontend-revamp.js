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
    if (readerOpen && active?.dataset.page !== readerPage) closeReaderComposer(false);
  }
  const saintName = document.getElementById('saintName');
  const saintPrefix = document.querySelector('.saint-heading-prefix');
  function syncSaintHeading() {
    if (!saintName || !saintPrefix) return;
    saintPrefix.hidden = /^(?:feast of|saint)\b/i.test(saintName.textContent.trim());
  }
  if (saintName && saintPrefix) {
    new MutationObserver(syncSaintHeading).observe(saintName,{childList:true,characterData:true,subtree:true});
    syncSaintHeading();
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

  // On reading pages, the shared composer opens as an intentional reflection sheet
  // instead of covering the source material at all times.
  const dock = document.querySelector('.dock');
  const composer = document.getElementById('composer');
  const prompt = document.getElementById('prompt');
  const readerScrim = document.createElement('div');
  readerScrim.className = 'reader-composer-scrim';
  readerScrim.hidden = true;
  readerScrim.setAttribute('aria-hidden','true');
  document.body.insertBefore(readerScrim,dock);
  const readerHead = document.createElement('div');
  readerHead.className = 'reader-composer-head';
  readerHead.innerHTML = '<div><span>Take a moment</span><strong id="readerComposerTitle">Continue your reflection</strong></div><button class="reader-composer-close" type="button" aria-label="Close reflection composer">×</button>';
  composer.insertBefore(readerHead,composer.firstElementChild);
  const readerTitle = readerHead.querySelector('#readerComposerTitle');
  const readerClose = readerHead.querySelector('.reader-composer-close');
  const readerTriggers = [];
  const readingPrompts = [
    {id:'threadStudy',title:"Explore today’s lesson",label:'Ask Augustine about this lesson'},
    {id:'threadDaily',title:"Reflect on today’s readings",label:'Ask Augustine about today'},
    {id:'threadPrayer',title:'Continue in prayer',label:'Open a prayer conversation'}
  ];
  readingPrompts.forEach(item => {
    const thread = document.getElementById(item.id);
    const head = thread?.closest('.dp-thread')?.querySelector('.phead');
    if (!head) return;
    const button = document.createElement('button');
    button.className = 'reader-ask';
    button.type = 'button';
    button.setAttribute('aria-controls','composer');
    button.setAttribute('aria-expanded','false');
    button.dataset.readerTitle = item.title;
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#ic-chat"/></svg><span>' + item.label + '</span>';
    head.appendChild(button);
    button.addEventListener('click',() => openReaderComposer(button));
    readerTriggers.push(button);
  });
  let readerOpen = false;
  let readerPage = '';
  let readerReturnFocus = null;
  let readerInertState = [];
  function openReaderComposer(trigger) {
    if (readerOpen) return;
    readerOpen = true;
    readerPage = document.body.dataset.page || '';
    readerReturnFocus = trigger;
    readerTitle.textContent = trigger.dataset.readerTitle || 'Continue your reflection';
    readerTriggers.forEach(button => button.setAttribute('aria-expanded',String(button === trigger)));
    dock.classList.add('reader-open');
    composer.classList.add('reader-composer');
    composer.setAttribute('role','dialog');
    composer.setAttribute('aria-modal','true');
    composer.setAttribute('aria-labelledby','readerComposerTitle');
    readerScrim.hidden = false;
    readerInertState = [...document.body.children]
      .filter(element => element !== dock && element !== readerScrim && element instanceof HTMLElement)
      .map(element => [element,element.inert]);
    readerInertState.forEach(([element]) => {element.inert = true;});
    document.body.dataset.readerComposerOpen = 'true';
    window.requestAnimationFrame(() => prompt.focus({preventScroll:true}));
  }
  function closeReaderComposer(returnFocus = true) {
    if (!readerOpen) return;
    readerOpen = false;
    readerTriggers.forEach(button => button.setAttribute('aria-expanded','false'));
    dock.classList.remove('reader-open');
    composer.classList.remove('reader-composer');
    composer.removeAttribute('role');
    composer.removeAttribute('aria-modal');
    composer.removeAttribute('aria-labelledby');
    readerScrim.hidden = true;
    delete document.body.dataset.readerComposerOpen;
    readerInertState.forEach(([element,wasInert]) => {if (element.isConnected) element.inert = wasInert;});
    readerInertState = [];
    const target = readerReturnFocus;
    readerReturnFocus = null;
    if (returnFocus && target?.isConnected && target.closest('.page')?.classList.contains('on')) target.focus({preventScroll:true});
  }
  readerClose.addEventListener('click',() => closeReaderComposer());
  readerScrim.addEventListener('click',() => closeReaderComposer());
  document.addEventListener('keydown',event => {
    if (!readerOpen) return;
    if (event.key === 'Escape') {event.preventDefault();closeReaderComposer();return;}
    if (event.key !== 'Tab') return;
    const controls = [...composer.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hidden && element.getClientRects().length);
    const first = controls[0], last = controls[controls.length-1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
  });
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
