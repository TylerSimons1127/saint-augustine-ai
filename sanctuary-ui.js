/* Sanctuary: presentation only. Original controls, listeners and storage remain the source of truth. */
(() => {
  function initialise() {
    const root = document.documentElement;
    root.setAttribute('data-sanctuary', '');
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => root.dataset.motion === 'reduced' || motionQuery.matches;
    const animations = new Set();
    const animate = (element, frames, options) => {
      const animation = element.animate(frames, options);
      animations.add(animation);
      animation.finished.catch(() => {}).finally(() => animations.delete(animation));
      return animation;
    };
    const cancelMotion = () => { if (reduced()) animations.forEach(animation => animation.cancel()); };

    function composeIntro(head, className) {
      if (!head || head.querySelector('.sc-intro-copy')) return;
      head.classList.add(className);
      const copy = document.createElement('div');
      copy.className = 'sc-intro-copy';
      while (head.firstChild) copy.append(head.firstChild);
      const scenery = document.createElement('div');
      scenery.className = 'sc-intro-scenery';
      scenery.setAttribute('aria-hidden', 'true');
      head.append(copy, scenery);
    }

    const studyPage = document.querySelector('#page-study .daily-page');
    const studyIntro = document.querySelector('#page-study .dp-head');
    if (studyPage && studyIntro) studyPage.prepend(studyIntro);
    composeIntro(studyIntro, 'sc-study-intro');
    composeIntro(document.querySelector('#page-today .dp-head'), 'sc-today-intro');
    const prayerPage = document.querySelector('#page-prayer .pray-page');
    const prayerIntro = document.querySelector('#page-prayer .dp-head');
    if (prayerPage && prayerIntro) prayerPage.prepend(prayerIntro);
    composeIntro(prayerIntro, 'sc-prayer-intro');

    const tradition = document.querySelector('#page-prayer [aria-label="Prayers of the tradition"]');
    tradition?.classList.add('sc-prayer-index');
    const greeting = document.getElementById('greet');
    const artwork = greeting?.querySelector('.room-art');
    if (greeting && artwork) greeting.prepend(artwork);

    // Give every landscape a visible name as well as its existing accessible name.
    document.querySelectorAll('#bgGrid .bg-thumb').forEach(button => {
      const name = document.createElement('span');
      name.className = 'sc-scene-name';
      name.setAttribute('aria-hidden', 'true');
      name.textContent = button.getAttribute('aria-label') || '';
      button.append(name);
      button.title = name.textContent;
    });

    // Selection moves as one object, following the 21st tabs pattern with native geometry and WAAPI.
    function selectionIndicator(track, selector, selected, type) {
      if (!track) return;
      const indicator = document.createElement('span');
      indicator.className = 'sc-selection sc-selection-' + type;
      indicator.setAttribute('aria-hidden', 'true');
      track.append(indicator);
      let previous = null;
      let animation = null;
      let frame = 0;
      let keyboard = false;
      track.addEventListener('keydown', () => { keyboard = true; });
      track.addEventListener('pointerdown', () => { keyboard = false; });
      const update = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const active = [...track.querySelectorAll(selector)].find(selected);
          if (!active || !track.getClientRects().length || !active.getClientRects().length) {
            indicator.hidden = true;
            previous = null;
            return;
          }
          const parent = track.getBoundingClientRect();
          const rect = active.getBoundingClientRect();
          const inset = type === 'nav' ? (parent.width < 500 ? 24 : 18) : 2;
          const next = {x:rect.left-parent.left+inset,width:Math.max(8,rect.width-inset*2)};
          indicator.hidden = false;
          indicator.style.width = next.width + 'px';
          indicator.style.transform = `translateX(${next.x}px)`;
          animation?.cancel();
          if (previous && !reduced() && !keyboard && (Math.abs(previous.x-next.x) > .5 || Math.abs(previous.width-next.width) > .5)) {
            animation = animate(indicator, [
              {transform:`translateX(${previous.x}px) scaleX(${previous.width/next.width})`},
              {transform:`translateX(${next.x}px) scaleX(1)`}
            ], {duration:220,easing:'cubic-bezier(0.22, 1, 0.36, 1)'});
          }
          previous = next;
          keyboard = false;
        });
      };
      const observer = new MutationObserver(update);
      track.querySelectorAll(selector).forEach(item => observer.observe(item,{attributes:true,attributeFilter:['class','aria-pressed','aria-selected']}));
      new ResizeObserver(update).observe(track);
      window.addEventListener('pagechange', update);
      window.addEventListener('resize', update, {passive:true});
      document.fonts?.ready.then(update);
      update();
    }
    selectionIndicator(document.querySelector('.nav-tabs'), '.nav-tab', e => e.classList.contains('on'), 'nav');
    document.querySelectorAll('.reasoning').forEach(track => selectionIndicator(track,'.seg',e => e.getAttribute('aria-pressed') === 'true','mode'));

    let keyboardNavigation = false;
    document.addEventListener('keydown', event => {
      if (['Enter',' ','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) keyboardNavigation = true;
    }, true);
    document.addEventListener('pointerdown', () => {keyboardNavigation = false;}, true);
    let pageAnimation;
    window.addEventListener('pagechange', () => {
      const page = document.querySelector('.page.on');
      if (!page) return;
      const name = page.getAttribute('aria-label') || 'Chat';
      document.title = name + ' · Saint Augustine AI';
      pageAnimation?.cancel();
      if (!reduced() && !keyboardNavigation) {
        const cover = page.querySelector('.dp-head, #greet');
        if (cover?.getClientRects().length) pageAnimation = animate(cover, [
          {opacity:.5,transform:'translateY(6px)'},
          {opacity:1,transform:'translateY(0)'}
        ],{duration:180,easing:'cubic-bezier(0.22, 1, 0.36, 1)'});
      }
      if (keyboardNavigation) {
        const heading = page.querySelector('h1,h2') || page;
        heading.setAttribute('tabindex','-1');
        heading.focus({preventScroll:true});
      }
      keyboardNavigation = false;
    });

    // Native <details> retains disclosure semantics. Only newly opened content receives a brief entrance.
    document.querySelectorAll('.lesson-flow details').forEach(details => {
      let keyboard = false;
      const summary = details.querySelector('summary');
      summary?.addEventListener('keydown', () => {keyboard = true;});
      summary?.addEventListener('pointerdown', () => {keyboard = false;});
      details.addEventListener('toggle', () => {
        if (!details.open || reduced() || keyboard) return;
        const content = details.querySelector('.ls-b');
        if (content) animate(content, [
          {opacity:.45,transform:'translateY(-3px)'},
          {opacity:1,transform:'translateY(0)'}
        ],{duration:160,easing:'cubic-bezier(0.22, 1, 0.36, 1)'});
      });
    });
    new MutationObserver(cancelMotion).observe(root,{attributes:true,attributeFilter:['data-motion']});
    motionQuery.addEventListener('change', cancelMotion);
  }
  // Deferred scripts run while readyState is interactive. Wait for the legacy
  // DOMContentLoaded layout hooks before composing the new page covers.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', () => queueMicrotask(initialise), {once:true});
  else initialise();
})();
