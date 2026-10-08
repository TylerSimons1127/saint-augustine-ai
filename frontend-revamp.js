/* Presentation only. No storage migration, request interception, or content generation. */
(() => {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sbToggle');
  const scrim = document.getElementById('sbScrim');
  const close = document.getElementById('revampHistoryClose');
  const search = document.getElementById('searchWrap');
  const navActions = document.querySelector('.nav-actions');
  const newChat = document.getElementById('newChat');
  const stage = document.getElementById('stage');
  const small = window.matchMedia('(max-width:1000px)');
  const compactReplyActions = window.matchMedia('(max-width:900px) and (pointer:coarse), (max-width:700px)');
  let activeReplyActions = null;
  function closeReplyActions(acts, returnFocus = false) {
    if (!acts) return;
    const trigger = acts.querySelector('.reply-action-trigger');
    const panel = acts.querySelector('.reply-action-panel');
    acts.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded','false');
    if (panel && compactReplyActions.matches) {
      panel.inert = true;
      panel.setAttribute('aria-hidden','true');
    }
    if (activeReplyActions === acts) {
      activeReplyActions = null;
      chatThread?.classList.remove('reply-actions-open');
    }
    if (returnFocus && trigger?.isConnected && compactReplyActions.matches) trigger.focus({preventScroll:true});
  }
  function keepReplyPanelClearOfDock(acts) {
    const panel = acts?.querySelector('.reply-action-panel');
    if (!panel) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const panelRect = panel.getBoundingClientRect();
      const blockers = [document.querySelector('.composer'),document.querySelector('body > .nav-tabs')]
        .filter(el => el && getComputedStyle(el).display !== 'none')
        .map(el => el.getBoundingClientRect().top);
      const shortLandscape = window.matchMedia('(max-height:480px) and (max-width:900px) and (pointer:coarse)').matches;
      const clearance = shortLandscape ? 8 : 12;
      const safeBottom = Math.min(window.innerHeight-12,...blockers) - clearance;
      const distance = panelRect.bottom - safeBottom;
      if (distance <= 0) return;
      const documentScroll = window.matchMedia('(max-width:768px), (max-height:480px) and (max-width:900px) and (pointer:coarse)').matches;
      const scrollTarget = documentScroll ? document.scrollingElement : stage;
      if (scrollTarget) scrollTarget.scrollTo({top:scrollTarget.scrollTop+distance,behavior:'instant'});
    }));
  }
  function syncReplyActions(root = document) {
    const rows = [];
    if (root.matches?.('.msg .acts')) rows.push(root);
    root.querySelectorAll?.('.msg .acts').forEach(acts => rows.push(acts));
    rows.forEach(acts => {
      const trigger = acts.querySelector('.reply-action-trigger');
      const panel = acts.querySelector('.reply-action-panel');
      if (!trigger || !panel) return;
      if (!panel.querySelector('.reply-action-group')) {
        const common = document.createElement('div');
        common.className = 'reply-action-group';
        common.setAttribute('role','group');
        common.setAttribute('aria-label','Response actions');
        const feedback = document.createElement('div');
        feedback.className = 'reply-feedback-group';
        feedback.setAttribute('role','group');
        feedback.setAttribute('aria-label','Response feedback');
        [...panel.children].forEach(button => (button.matches('[data-fb]') ? feedback : common).appendChild(button));
        panel.append(common);
        if (feedback.children.length) panel.append(feedback);
      }
      const compact = compactReplyActions.matches;
      trigger.hidden = !compact;
      if (compact) {
        const open = acts.classList.contains('is-open');
        panel.inert = !open;
        panel.setAttribute('aria-hidden',String(!open));
        trigger.setAttribute('aria-expanded',String(open));
      } else {
        acts.classList.remove('is-open');
        panel.inert = false;
        panel.setAttribute('aria-hidden','false');
        trigger.setAttribute('aria-expanded','false');
      }
    });
    if (activeReplyActions && !activeReplyActions.isConnected) {
      activeReplyActions = null;
      chatThread?.classList.remove('reply-actions-open');
    }
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('.reply-action-trigger');
    if (trigger && compactReplyActions.matches) {
      const acts = trigger.closest('.acts');
      if (!acts) return;
      if (acts.classList.contains('is-open')) {
        closeReplyActions(acts);
      } else {
        if (activeReplyActions && activeReplyActions !== acts) closeReplyActions(activeReplyActions);
        acts.classList.add('is-open');
        activeReplyActions = acts;
        chatThread?.classList.add('reply-actions-open');
        syncReplyActions(acts);
        keepReplyPanelClearOfDock(acts);
        if (event.detail === 0) acts.querySelector('.reply-action-panel .act:not([style*="display: none"])')?.focus({preventScroll:true});
      }
      return;
    }
    const action = event.target.closest?.('.reply-action-panel .act');
    if (action && compactReplyActions.matches) closeReplyActions(action.closest('.acts'),event.detail === 0 && action.dataset.fb !== 'report');
    else if (activeReplyActions && !activeReplyActions.contains(event.target)) closeReplyActions(activeReplyActions);
  });
  document.addEventListener('pointerdown', event => {
    if (activeReplyActions && !activeReplyActions.contains(event.target)) closeReplyActions(activeReplyActions);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeReplyActions) {
      event.preventDefault();
      closeReplyActions(activeReplyActions,true);
    }
  });
  compactReplyActions.addEventListener('change', () => {
    if (activeReplyActions) closeReplyActions(activeReplyActions);
    syncReplyActions();
  });
  const replyActionObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) syncReplyActions(node);
    }));
  });
  const chatThread = document.getElementById('thread');
  if (chatThread) replyActionObserver.observe(chatThread,{childList:true,subtree:true});
  syncReplyActions();
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
    document.body.classList.toggle('history-contextual',active?.dataset.page !== 'chat');
    if (sidebar.classList.contains('open')) toggle.click();
    syncDrawer();
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
    const drawer = small.matches || document.body.classList.contains('history-contextual');
    const open = sidebar.classList.contains('open') && drawer;
    sidebar.inert = drawer && !open;
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
    if (!(small.matches || document.body.classList.contains('history-contextual')) || !sidebar.classList.contains('open')) return;
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

  // Organize preferences without replacing controls or their saved values.
  const settings = document.getElementById('settingsSheet');
  const settingsBody = settings?.querySelector('.settings-body');
  if (settingsBody) {
    const sections = [...settingsBody.querySelectorAll(':scope > .set-sec')];
    const names = ['Appearance','Atmosphere','Conversation','Data'];
    const categories = document.createElement('div');
    categories.className = 'settings-categories';
    categories.setAttribute('role','tablist');
    categories.setAttribute('aria-label','Settings categories');
    const about = settingsBody.querySelector('.about');
    if (sections[3] && about) sections[3].appendChild(about);
    const soundRow = document.getElementById('soundToggle')?.closest('.set-row');
    if (sections[2] && soundRow) sections[2].appendChild(soundRow);
    function chooseCategory(index, focus = false) {
      sections.forEach((section,i) => {
        section.hidden = i !== index;
        section.inert = i !== index;
        const tab = categories.children[i];
        tab.setAttribute('aria-selected',String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      settingsBody.scrollTop = 0;
      if (focus) categories.children[index]?.focus();
    }
    sections.forEach((section,index) => {
      section.id = section.id || 'settings-category-' + index;
      section.setAttribute('role','tabpanel');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'settings-category';
      button.id = 'settings-category-tab-' + index;
      button.textContent = names[index] || 'Other';
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls',section.id);
      section.setAttribute('aria-labelledby',button.id);
      button.addEventListener('click',() => chooseCategory(index));
      button.addEventListener('keydown',event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % sections.length;
        if (event.key === 'ArrowLeft') next = (index + sections.length - 1) % sections.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = sections.length - 1;
        if (next !== undefined) {event.preventDefault();chooseCategory(next,true);}
      });
      categories.appendChild(button);
    });
    settings.insertBefore(categories,settingsBody);
    if (sections.length) chooseCategory(0);
  }

  // One heading and close treatment for searchable reading dialogs.
  [['lessonBrowserScrim','lessonBrowserTitle','lessonBrowserClose'],['glossaryScrim','glossaryTitle','glossaryClose']].forEach(([scrimId,titleId,closeId]) => {
    const title = document.getElementById(titleId);
    const button = document.getElementById(closeId);
    const modal = title?.closest('.beta-modal');
    if (!modal || !button) return;
    modal.querySelector(':scope > .tag')?.remove();
    const header = document.createElement('div');
    header.className = 'dialog-head';
    modal.insertBefore(header,modal.firstChild);
    header.append(title,button);
    button.className = 'dialog-close';
    button.removeAttribute('style');
    button.textContent = '×';
    button.setAttribute('aria-label','Close ' + title.textContent.toLowerCase());
  });

  const focusable = root => [...root.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.closest('[hidden],[inert]') && element.getClientRects().length);
  function manageDialog(element, closeButton, isOpen) {
    if (!element) return;
    let wasVisible = false;
    let returnTo = null;
    const sync = () => {
      const visible = isOpen();
      element.inert = !visible;
      element.setAttribute('aria-hidden',String(!visible));
      if (visible && !wasVisible) {
        returnTo = document.activeElement.closest?.('.acts')?.querySelector('.reply-action-trigger') || document.activeElement;
        requestAnimationFrame(() => (closeButton || focusable(element)[0])?.focus({preventScroll:true}));
      }
      if (!visible && wasVisible && returnTo?.isConnected) returnTo.focus({preventScroll:true});
      wasVisible = visible;
    };
    new MutationObserver(sync).observe(element,{attributes:true,attributeFilter:['class','hidden']});
    element.addEventListener('keydown',event => {
      if (!isOpen()) return;
      if (event.key === 'Escape' && closeButton) {event.preventDefault();closeButton.click();return;}
      if (event.key !== 'Tab') return;
      const controls = focusable(element), first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
    });
    sync();
  }
  manageDialog(settings,document.getElementById('settingsClose'),() => settings.classList.contains('show'));
  [['lessonBrowserScrim','lessonBrowserClose'],['glossaryScrim','glossaryClose'],['whatsNewScrim','whatsNewClose'],['betaModal','betaAgree'],['tutModal','tutSkip'],['confirmScrim','confirmCancel']].forEach(([id,button]) => {
    const element = document.getElementById(id);
    manageDialog(element,document.getElementById(button),() => element.classList.contains('show'));
  });
  ['modelPop','sceneryPop'].forEach(id => {
    const popover = document.getElementById(id);
    if (!popover) return;
    const syncPopover = () => {popover.inert = popover.hidden || !popover.classList.contains('open');};
    new MutationObserver(syncPopover).observe(popover,{attributes:true,attributeFilter:['class','hidden']});
    syncPopover();
  });
  manageDialog(examen,document.getElementById('examenClose'),() => !examen.hidden);
  const reportObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(element => {
      if (element.nodeType !== 1 || !element.matches('.report-scrim')) return;
      const cancel = element.querySelector('.rp-cancel');
      const head = element.querySelector('.rp-head');
      const dismiss = document.createElement('button');
      dismiss.className = 'dialog-close';
      dismiss.type = 'button';
      dismiss.textContent = '×';
      dismiss.setAttribute('aria-label','Close report');
      dismiss.addEventListener('click',() => cancel?.click());
      head?.appendChild(dismiss);
      manageDialog(element,dismiss,() => element.classList.contains('show'));
    }));
  });
  reportObserver.observe(document.body,{childList:true});

  // Keep a biography concise initially while retaining the entire supplied text.
  const biography = document.getElementById('saintBio');
  if (biography) {
    const readMore = document.createElement('button');
    readMore.className = 'saint-bio-toggle';
    readMore.type = 'button';
    readMore.setAttribute('aria-controls','saintBio');
    biography.insertAdjacentElement('afterend',readMore);
    let previousBio = '';
    const syncBio = () => {
      const text = biography.textContent.trim();
      if (text !== previousBio) {
        previousBio = text;
        biography.classList.add('saint-bio-collapsed');
        readMore.setAttribute('aria-expanded','false');
        readMore.textContent = 'Read full biography';
      }
      readMore.hidden = text.length < 380 || Boolean(biography.querySelector('.skel,button'));
      if (readMore.hidden) biography.classList.remove('saint-bio-collapsed');
    };
    readMore.addEventListener('click',() => {
      const expanded = readMore.getAttribute('aria-expanded') !== 'true';
      readMore.setAttribute('aria-expanded',String(expanded));
      readMore.textContent = expanded ? 'Show less' : 'Read full biography';
      biography.classList.toggle('saint-bio-collapsed',!expanded);
    });
    new MutationObserver(syncBio).observe(biography,{childList:true,subtree:true,characterData:true});
    syncBio();
  }
  const portrait = document.getElementById('saintPortrait');
  if (portrait) {
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.className = 'saint-portrait-image';
    image.hidden = true;
    const fallback = document.createElement('span');
    fallback.className = 'saint-portrait-fallback';
    fallback.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><use href="#ic-halo"/></svg>';
    portrait.append(image,fallback);
    let lastImage = '';
    const syncPortrait = () => {
      const url = portrait.style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1] || '';
      if (url === lastImage) return;
      lastImage = url;
      portrait.classList.add('is-fallback');
      image.hidden = true;
      fallback.hidden = false;
      if (url) image.src = url;
      else image.removeAttribute('src');
    };
    image.addEventListener('load',() => {
      const usable = image.naturalWidth >= 96 && image.naturalHeight >= 96;
      image.hidden = !usable;
      fallback.hidden = usable;
      portrait.classList.toggle('is-fallback',!usable);
    });
    image.addEventListener('error',() => {image.hidden = true;fallback.hidden = false;portrait.classList.add('is-fallback');});
    new MutationObserver(syncPortrait).observe(portrait,{attributes:true,attributeFilter:['style']});
    syncPortrait();
    // Empty initial response needs the same intentional fallback.
    if (!lastImage) portrait.classList.add('is-fallback');
  }
  ['lessonQuoteSource','lessonReadingCitation','lessonPrimarySource'].forEach(id => document.getElementById(id)?.classList.add('source-footer'));
  const studyHead = document.getElementById('threadStudy')?.closest('.dp-thread')?.querySelector('.phead');
  const studyAsk = document.getElementById('lessonAsk');
  if (studyHead && studyAsk) {
    const customAsk = studyHead.querySelector('.reader-ask');
    if (customAsk) {
      customAsk.classList.add('reader-ask-secondary');
      customAsk.querySelector('span').textContent = 'Ask your own question';
      customAsk.dataset.readerTitle = 'Ask about this lesson';
    }
    const heading = studyHead.querySelector('h3');
    if (heading) heading.textContent = 'Reflect on this lesson';
    studyHead.insertBefore(studyAsk,customAsk || null);
  }
  const shareTools = document.getElementById('threadShareTools');
  if (shareTools) {
    const syncShare = () => shareTools.classList.toggle('is-compact-share',!chatThread.classList.contains('share-selecting'));
    new MutationObserver(syncShare).observe(chatThread,{attributes:true,attributeFilter:['class']});
    syncShare();
  }
  const todayReadings = document.getElementById('sec-readings');
  if (todayReadings) {
    const columns = [['today-reading-column',['sec-readings','sec-lesson']],['today-saint-column',['saintCard','sec-quiz']]];
    const parent = todayReadings.parentElement;
    columns.forEach(([className,ids]) => {
      const wrapper = document.createElement('div');
      wrapper.className = className;
      parent.insertBefore(wrapper,parent.querySelector('.dp-thread'));
      ids.forEach(id => {const card = document.getElementById(id);if (card) wrapper.appendChild(card);});
    });
  }
  const prayerIntention = document.getElementById('prayIntent2');
  if (prayerIntention?.tagName === 'TEXTAREA') {
    const resizeIntention = () => {
      prayerIntention.style.height = 'auto';
      const height = Math.min(prayerIntention.scrollHeight,144);
      prayerIntention.style.height = height + 'px';
      prayerIntention.style.overflowY = prayerIntention.scrollHeight > 144 ? 'auto' : 'hidden';
    };
    prayerIntention.addEventListener('input',resizeIntention);
    window.addEventListener('pagechange',() => {
      if (document.body.dataset.page === 'prayer') requestAnimationFrame(resizeIntention);
    });
    if (prayerIntention.getClientRects().length) resizeIntention();
  }
  placeSearch(); syncPage(); syncDrawer();
})();
