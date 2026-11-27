/* Reality Chat Workspace v1.
 * Presentation-only re-layout of the EXISTING authenticated Reality Chat.
 * Does not call any execution, installation, model or approval endpoint.
 * All original IDs, trusted event handlers, saved message APIs and receipts are preserved.
 */
(() => {
  'use strict';
  if (!/^\/chat\/?$/.test(window.location.pathname)) return;
  const get = (id) => document.getElementById(id);
  const chat = get('privateChat'), ready = get('privateReady');
  const settings = get('realityChatSettings');
  const transcript = get('privateTranscript');
  const composer = get('realityChatComposer');
  if (!chat || !ready || !settings || !transcript || !composer || get('realityChatWorkspace')) return;

  const node = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };
  const heading = (title, caption) => {
    const wrap = node('div');
    wrap.append(node('h2', 'reality-chat-panel-heading', title));
    if (caption) wrap.append(node('p', 'reality-chat-panel-caption', caption));
    return wrap;
  };
  // This is a page, not the previous center-screen floating console.
  const intro = [...chat.children].filter(el => el.tagName === 'P' && el.classList.contains('muted') && el.id !== 'privateAccountState' && el.id !== 'privateStatus');
  if (intro[0]) intro[0].classList.add('reality-chat-intro');
  for (const p of intro.slice(1)) p.classList.add('reality-chat-secondary-intro');
  const title = get('realityChatTitle');
  if (title) title.textContent = 'Reality Chat';

  const workspace = node('div', 'reality-chat-workspace');
  workspace.id = 'realityChatWorkspace';
  const sidebar = node('aside', 'reality-chat-sidebar');
  sidebar.id = 'realityChatSidebar';
  sidebar.setAttribute('aria-label', 'Conversations, active goal and account');
  const conversation = node('section', 'reality-chat-conversation');
  conversation.id = 'realityChatConversation';
  conversation.setAttribute('aria-label', 'Your conversation with Reality');
  const inspector = node('aside', 'reality-chat-inspector');
  inspector.id = 'realityChatInspector';
  inspector.setAttribute('aria-label', 'Live work, approvals and verified evidence');
  const scrim = node('button', 'reality-chat-panel-scrim');
  scrim.type = 'button';
  scrim.setAttribute('aria-label', 'Close workspace side panel');
  workspace.append(scrim, sidebar, conversation, inspector);

  // Left: existing saved history, new chat and user-controlled objective.
  const closeSidebar = node('button', 'reality-chat-panel-close', 'Close conversations');
  closeSidebar.type = 'button';
  sidebar.append(closeSidebar);
  // Design #1 keeps navigation inside the EXISTING chat workspace.
  // Links go only to existing Reality routes/anchors; no new dashboard.
  const quickNav = node('nav','reality-chat-quick-nav');
  quickNav.setAttribute('aria-label','Reality workspace sections');
  for(const [label,path] of [
    ['Home','/'],['Chat','/chat'],['Employees','/employees'],
    ['ROI & evidence','/value']
  ]){
    const link=node('a','reality-chat-quick-link',label);
    link.href=path;
    if(path==='/chat')link.setAttribute('aria-current','page');
    quickNav.append(link);
  }
  const quickWork=node('button','reality-chat-quick-link','Work & approvals');
  quickWork.type='button';
  quickWork.addEventListener('click',()=>{
    selectTab('work');
    openPanel('work');
  });
  quickNav.insertBefore(quickWork,quickNav.lastChild);
  sidebar.append(quickNav);
  sidebar.append(heading('Conversations', 'Private to your signed-in Reality account.'));
  const conversationLabel = settings.querySelector('label[for="privateConversations"]');
  if (conversationLabel) sidebar.append(conversationLabel);
  sidebar.append(get('privateConversations'));
  const sideActions = node('div', 'reality-chat-sidebar-actions');
  sideActions.append(get('privateNew'), get('privateSignOut'));
  sidebar.append(sideActions);
  const goalCard = node('section', 'reality-chat-sidebar-goal');
  goalCard.append(node('strong', '', 'Active objective'));
  goalCard.append(get('privateGoalStatus'));
  sidebar.append(goalCard);
  const drafts = node('section');
  drafts.append(heading('Ask Reality', 'These fill your message; they never authorize or start a job.'));
  const draftActions = node('div', 'reality-chat-draft-actions');
  const suggestions = [
    ['Inspect my work', 'Review the currently authorized work in my Reality Continuity ledger. Tell me what is verified, what is blocked, and which step is permissible next. Do not execute anything just because I asked for a status report.'],
    ['Show me the evidence', 'Explain the independently verified receipts for my current original job, which stages are proven, and which remain unverified. Distinguish testing, installation and final settlement.'],
    ['Plan Reality development', 'Help me plan one governed self-development job using Reality\'s existing Signal Cleaner, Universe, Continuity, verification, capability engine and worker. Identify the exact first failure to reproduce and the acceptance tests, without starting execution or approving installation.'],
  ];
  for (const [label, text] of suggestions) {
    const button = node('button', '', label);
    button.type = 'button';
    button.addEventListener('click', () => {
      const prompt = get('privatePrompt');
      if (!prompt) return;
      prompt.value = text;
      prompt.dispatchEvent(new Event('input', {bubbles: true}));
      closePanel();
      prompt.focus({preventScroll:true});
    });
    draftActions.append(button);
  }
  drafts.append(draftActions);
  sidebar.append(drafts);
  const settingsSummary = settings.querySelector('summary');
  if (settingsSummary) settingsSummary.textContent = 'Edit goals & account settings';
  sidebar.append(settings);
  // The permanent mission is an account preference, not a blocking Chat
  // banner. Keep its original authenticated DOM nodes/handlers in Settings.
  const missionBanner=get('privateAccountMissionBanner');
  if(missionBanner)settings.insertBefore(missionBanner,settings.children[1]||null);

  // Center: a conversation, not a stack of operational cards.
  const threadHeader = node('div', 'reality-chat-thread-heading');
  const threadTitle = node('div');
  threadTitle.append(node('span','reality-chat-premium-eyebrow',
    'REALITY · CONTINUITY-AWARE CHAT'));
  threadTitle.append(node('strong', '', 'Reality'));
  threadTitle.append(node('small', '', 'Tell Reality what you need.'));
  const threadButtons = node('div', 'reality-chat-thread-buttons');
  // Redundant direct navigation is intentional: a signed-in user should
  // never depend on scrolling past an operational card to leave the chat.
  const homeLink = node('a', 'reality-chat-home-link', '← Home');
  homeLink.href = '/';
  homeLink.setAttribute('aria-label','Return to Reality Home');
  const historyToggle = node('button', 'reality-chat-mobile-tool', '☰ Menu');
  historyToggle.type = 'button';
  historyToggle.id = 'realityChatOpenConversations';
  historyToggle.setAttribute('aria-controls','realityChatSidebar');
  historyToggle.setAttribute('aria-expanded','false');
  const inspectorToggle = node('button', 'reality-chat-mobile-tool', 'Work & approvals');
  inspectorToggle.type = 'button';
  inspectorToggle.id = 'realityChatOpenInspector';
  inspectorToggle.setAttribute('aria-label','Open work, approvals and supporting evidence');
  inspectorToggle.setAttribute('aria-controls','realityChatInspector');
  inspectorToggle.setAttribute('aria-expanded','false');
  const focusToggle = node('button', 'reality-chat-size-toggle');
  focusToggle.type = 'button';
  focusToggle.id = 'realityChatFocusToggle';
  focusToggle.textContent = 'Expand chat';
  focusToggle.setAttribute('aria-pressed','false');
  // This delegates to the EXISTING New Conversation handler. No duplicate intake.
  const newChatHeader=node('button','reality-chat-new-action','＋ New chat');
  newChatHeader.type='button';
  newChatHeader.addEventListener('click',()=>{
    closePanel();
    const existing=get('privateNew');
    if(existing&&!existing.disabled)existing.click();
  });
  const smallScreen = () => window.matchMedia('(max-width:600px)').matches;
  function updateFocusLabel(){
    inspectorToggle.textContent = 'Work';
    if(smallScreen()){
      const expanded = !document.body.classList.contains('reality-chat-compact');
      focusToggle.textContent = expanded ? 'Minimize' : 'Expand chat';
      focusToggle.setAttribute('aria-label', expanded ?
        'Minimize the full-screen conversation to a scrollable chat card' :
        'Expand the conversation to full screen');
      focusToggle.setAttribute('aria-pressed', String(expanded));
    }else{
      const focused = document.body.classList.contains('reality-chat-focus');
      focusToggle.textContent = focused ? 'Show workspace' : 'Focus chat';
      focusToggle.setAttribute('aria-label', focused ?
        'Show the full Reality workspace' : 'Focus on the conversation');
      focusToggle.setAttribute('aria-pressed',String(focused));
    }
  }
  focusToggle.addEventListener('click', () => {
    // Mobile Chat never minimizes into the unusable scrollable card.
    if(smallScreen())return;
    document.body.classList.toggle('reality-chat-focus');
    updateFocusLabel();
  });
  updateFocusLabel();
  window.addEventListener('resize', updateFocusLabel);
  // On mobile Chat is ALWAYS fullscreen; no confusing "Minimize" path.
  // Preserve the desktop focus toggle for larger screens.
  const planShift=node('button','reality-chat-plan-action','Plan a shift');
  planShift.type='button';
  planShift.addEventListener('click',()=>{closePanel();window.dispatchEvent(new Event('reality:open-shift-plan'));});
  const decisionAction=node('button','reality-chat-plan-action','Review decision');
  decisionAction.type='button';decisionAction.id='realityChatDecisionAction';decisionAction.hidden=true;
  decisionAction.addEventListener('click',()=>{const target=decisionAction.dataset.tab||'approvals';selectTab(target);closePanel();openPanel('work');});
  // Each existing control mounts once in its final navigation container.
  // Preserve the actual DOM/handlers; append() would otherwise move history and planShift again.
  threadButtons.append(homeLink, inspectorToggle, newChatHeader, decisionAction, focusToggle);
  quickNav.append(planShift);
  threadHeader.append(historyToggle, threadTitle, threadButtons);
  conversation.append(threadHeader, transcript, composer);
  // Preserve the same live evidence node inside the scrollable conversation,
  // not as a sibling above its header. No extra API calls or worker actions.
  const liveActivity=get('realityChatContinuityActivity');
  function mountLiveActivity(){
    if(liveActivity&&!transcript.contains(liveActivity))transcript.prepend(liveActivity);
  }
  mountLiveActivity();

  // Keep original goal-command selector functional, but move its explanatory
  // controls behind an optional disclosure so ordinary chat stays uncluttered.
  const goalPicker = get('privateGoalCommand');
  const goalLabel = composer.querySelector('label[for="privateGoalCommand"]');
  const composerExplanation = composer.querySelector('p.muted');
  const goalOptions = node('details', 'reality-chat-goal-options');
  goalOptions.append(node('summary', '', 'Change the ongoing goal for this message (optional)'));
  if (goalLabel) goalOptions.append(goalLabel);
  if (goalPicker) goalOptions.append(goalPicker);
  if (composerExplanation) goalOptions.append(composerExplanation);
  // One familiar message field. The original Send handler is moved INSIDE
  // its bordered input, not cloned or replaced; request idempotency survives.
  const inputRow=node('div','reality-chat-input-row');
  inputRow.append(get('privatePrompt'),get('privateSend'));
  composer.append(inputRow);
  const composerControls=node('div','reality-chat-composer-controls');
  composerControls.append(goalOptions);
  composer.append(composerControls);
  composer.append(node('p','reality-chat-typing-note','Enter to send on desktop · Shift+Enter for a new line · No message grants installation permission.'));

  // No floating 'Details' strip between Chat and the message composer.
  // Project genuine delivery/verification feedback as a plain in-thread
  // message, reattached after saved-history rerenders. This read-only
  // projection never triggers a work request, approval or second API call.
  const statusBar = node('div','reality-chat-status-bar');
  statusBar.id='realityChatInlineStatus';
  statusBar.hidden=true;
  statusBar.setAttribute('role','status');
  statusBar.setAttribute('aria-live','polite');
  const originalStatus = get('privateStatus');
  const statusCopy = node('p','muted');
  statusCopy.id='realityChatStatusSummary';
  statusBar.append(statusCopy);
  const inlinePanels=node('article','bubble reality-chat-inline-panels');
  inlinePanels.id='realityChatInlinePanels';
  inlinePanels.hidden=true;
  inlinePanels.setAttribute('aria-label','Conversation controls and verified work');
  const attachInlineStatus=()=>{
    if(!composer.contains(statusBar)) composer.prepend(statusBar);
  };
  if(originalStatus){
    const syncStatus=()=>{
      const raw=String(originalStatus.textContent??'').trim();
      const valid=raw&& !/^(?:null\s*)+$|^(?:undefined|nan|\[object object\])$/i.test(raw);
      statusCopy.textContent=valid?raw:'';
      statusBar.hidden=!valid;
      attachInlineStatus();
    };
    new MutationObserver(syncStatus).observe(originalStatus,{
      childList:true,characterData:true,subtree:true
    });
    syncStatus();
  }

  // Right: the existing authenticated provider readbacks and real approval UI.
  const closeInspector = node('button','reality-chat-panel-close','Close work panel');
  closeInspector.type='button';
  inspector.append(closeInspector);
  inspector.append(heading('Live work & approvals', 'Source-backed status and decisions. No simulated progress.'));
  const tabs = node('div', 'reality-chat-inspector-nav');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Reality operational context');
  const panels = {};
  const buttons = {};
  const panelNames = [['work','Work'],['approvals','Approvals'],['proof','Proof']];
  for (const [key,label] of panelNames) {
    const button = node('button', '', label);
    button.type='button';
    button.id='realityChatTab'+label;
    button.setAttribute('role','tab');
    button.setAttribute('aria-controls','realityChatPanel'+label);
    const panel = node('section','reality-chat-inspector-panel');
    panel.id='realityChatPanel'+label;
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',button.id);
    if (key!=='work') panel.hidden=true;
    button.setAttribute('aria-selected',String(key==='work'));
    button.tabIndex=key==='work'?0:-1;
    buttons[key]=button;
    panels[key]=panel;
    tabs.append(button);
  }
  // A review link, NOT a Start button or an approval grant. Current verified
  // decision controls remain owned by the existing approval inbox.
  const reviewWork=node('button','reality-chat-review-action','Review work & decisions');
  reviewWork.type='button';
  reviewWork.addEventListener('click',()=>selectTab('approvals',true));
  inspector.append(reviewWork,tabs,...panelNames.map(([key])=>panels[key]));
  function selectTab(key, moveFocus=false) {
    for (const [name] of panelNames) {
      const active=key===name;
      buttons[name].setAttribute('aria-selected',String(active));
      buttons[name].tabIndex=active?0:-1;
      panels[name].hidden=!active;
    }
    if(moveFocus) buttons[key].focus();
  }
  for(const [index,[key]] of panelNames.entries()){
    buttons[key].addEventListener('click',()=>selectTab(key));
    buttons[key].addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      const target=event.key==='Home'?0:event.key==='End'?panelNames.length-1:
       (index+(event.key==='ArrowRight'?1:-1)+panelNames.length)%panelNames.length;
      selectTab(panelNames[target][0],true);
    });
  }
  panels.work.append(get('realityChatShiftBrief'),get('realityChatActivity'),get('realityChatAutomationDiagnostics'));
  // Per-conversation technical projections live here, not in the saved transcript.
  const savedWork=node('section','reality-chat-saved-work-readback');
  savedWork.id='realityChatSavedWorkReadback';
  panels.work.append(savedWork);
  // These large intake and shift-launch cards previously preceded the conversation,
  // trapping it below the fold on mobile (especially during session recovery).
  // They remain accessible in Work, but the actual conversation is the first view.
  for(const id of ['realityRileySourceWork','realityRileyShiftLaunch']){
    const existing=get(id);
    if(existing) panels.work.append(existing);
  }
  panels.approvals.append(get('realityChatApprovalInbox'));
  const proofLead = node('p','reality-chat-proof-note',
    'A passing test, provider observation or model statement is not a completed business job. Review only original-job evidence independently verified by Reality.');
  panels.proof.append(proofLead);
  // Research-stage upgrade candidates are NOT this settled original job.
  // Keep them in Work so an uninstalled candidate never visually overrides
  // the independently settled #263 original receipt in the Proof tab.
  const researchCandidate=get('realityChatVerifiedRepairReview');
  if(researchCandidate){
    const otherWork=node('section','reality-chat-other-research');
    otherWork.append(heading('Other research candidates',
      'Separate from completed original #263. Testing is not installation or settlement.'));
    otherWork.append(researchCandidate);
    panels.work.append(otherWork);
  }
  // The settled original's proof panel is mounted here by its read-only UI
  // module. Keep the same original decision control and receipt, not a copy.
  const native263Proof = get('native263InstallApprovalPanel');
  if(native263Proof)panels.proof.append(native263Proof);
  const proofLink = node('a','reality-chat-proof-link','Open Value Verification →');
  proofLink.href='/value';
  panels.proof.append(proofLink);

  // All original controls and handlers remain intact. The page rearranges DOM
  // nodes instead of copying or recreating an approval form or worker action.
  ready.append(workspace);
  // Show a single navigation action only when existing exact decision controls are ready.
  // No action or approval is submitted here; real handlers remain unchanged.
  function syncDecisionAction(){
    const exactIn=p=>[...p.querySelectorAll('button')].some(b=>{
      if(b.disabled||b.hidden||!/^(?:Approve exact|Approve investigation and testing|Continue \d+ unfinished repair)/i.test(b.textContent.trim()))return false;
      for(let n=b;n&&n!==p;n=n.parentElement)if(n.hidden)return false;
      return true;
    });
    const tab=exactIn(panels.approvals)?'approvals':exactIn(panels.work)?'work':'';
    decisionAction.dataset.tab=tab;decisionAction.hidden=!tab;
  }
  const decisionObserver=new MutationObserver(syncDecisionAction);
  for(const p of [panels.approvals,panels.work])decisionObserver.observe(p,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','disabled']});
  syncDecisionAction();
  // Home may open Chat to discuss a gap. Prefill an owner-editable question,
  // but NEVER submit it or grant work authority from a navigation link.
  if(window.location.hash==='#weekly-workload'){
    const input=get('privatePrompt');
    if(input&&!input.value.trim()){
      input.value='Reality, assess our next-week employee workload using your source-backed weekly plan. Show each role’s provisional review timeboxes, the unallocated hypothetical capacity, and what source work needs qualification. Distinguish proposals from authorized jobs, completed work, and verified savings.';
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }
  // Mobile navigation is presentational. Work opens the existing read-only
  // inspector; no job/shift starts when the button is pressed.
  const mobileNav=node('nav','reality-chat-mobile-nav');
  mobileNav.setAttribute('aria-label','Reality mobile navigation');
  function mobileLink(name,url,iconText,active=false){
    const link=node('a','reality-chat-mobile-nav-item');
    link.href=url;
    if(active)link.setAttribute('aria-current','page');
    link.append(node('span','reality-chat-mobile-nav-icon',iconText),
      node('span','',name));
    mobileNav.append(link);
  }
  mobileLink('Home','/','⌂');
  mobileLink('Chat','/chat','▣',true);
  mobileLink('Employees','/employees','♧');
  const mobileWork=node('button','reality-chat-mobile-nav-item');
  mobileWork.type='button';
  mobileWork.append(node('span','reality-chat-mobile-nav-icon','▤'),
    node('span','','Work'));
  mobileWork.addEventListener('click',()=>{selectTab('work');openPanel('work');});
  mobileNav.append(mobileWork);
  mobileLink('Value','/value','◫');
  document.body.append(mobileNav);
  const refreshReadyDisplay = () => document.body.classList.toggle(
    'reality-chat-signed-in', ready.style.display === 'block'
  );
  new MutationObserver(refreshReadyDisplay).observe(ready, {
    attributes:true,attributeFilter:['style']
  });
  refreshReadyDisplay();

  // The mobile keyboard changes Android's visible viewport height. Keep the
  // actual conversation/composer above it without resizing or scrolling the
  // entire page and without touching pending request state.
  const viewport=window.visualViewport;
  if(viewport){
    // Retain the last unfocused screen height: some Android WebViews resize
    // BOTH innerHeight and visualViewport when their keyboard opens.
    let fullViewportHeight=Math.max(
      document.documentElement.clientHeight,window.innerHeight,viewport.height);
    const syncKeyboardViewport=()=>{
      const focused=document.activeElement===get('privatePrompt');
      if(!focused)fullViewportHeight=Math.max(window.innerHeight,viewport.height);
      const keyboardOpen=window.matchMedia('(max-width:900px)').matches&&
        focused&&viewport.height<fullViewportHeight-130;
      document.body.classList.toggle('reality-chat-keyboard-open',keyboardOpen);
      document.documentElement.style.setProperty('--reality-chat-visible-height',
        Math.round(viewport.height)+'px');
    };
    viewport.addEventListener('resize',syncKeyboardViewport,{passive:true});
    get('privatePrompt')?.addEventListener('focus',syncKeyboardViewport);
    get('privatePrompt')?.addEventListener('blur',()=>{
      document.body.classList.remove('reality-chat-keyboard-open');
      document.documentElement.style.removeProperty('--reality-chat-visible-height');
    });
    syncKeyboardViewport();
  }

  // Keep the original authenticated panels in their own on-demand drawers.
  // Never insert an entire operational dashboard into the conversation.
  const inlineScreen=()=>false;
  function restorePanelNodes(){
    if(sidebar.parentElement===inlinePanels)
      workspace.insertBefore(sidebar,conversation);
    if(inspector.parentElement===inlinePanels)
      workspace.append(inspector);
    inlinePanels.hidden=true;
    if(inlinePanels.parentElement)inlinePanels.remove();
  }
  function closePanel() {
    document.body.dataset.realityChatPanel='';
    historyToggle.setAttribute('aria-expanded','false');
    inspectorToggle.setAttribute('aria-expanded','false');
    restorePanelNodes();
  }
  function openPanel(name) {
    const next=document.body.dataset.realityChatPanel===name?'':name;
    closePanel();
    if(!next)return;
    document.body.dataset.realityChatPanel=next;
    if(next==='work')window.dispatchEvent(new CustomEvent('reality:chat-work-opened'));
    historyToggle.setAttribute('aria-expanded',String(next==='history'));
    inspectorToggle.setAttribute('aria-expanded',String(next==='work'));
    if(inlineScreen()){
      inlinePanels.replaceChildren(next==='history'?sidebar:inspector);
      inlinePanels.hidden=false;
      transcript.append(inlinePanels);
      inlinePanels.scrollIntoView({behavior:'smooth',block:'nearest'});
    }else{
      // Desktop retains original sidebar/inspector columns.
      const opened=next==='history'?sidebar:inspector;
      opened.querySelector('.reality-chat-panel-close')?.focus({preventScroll:true});
    }
  }
  historyToggle.addEventListener('click',()=>openPanel('history'));
  inspectorToggle.addEventListener('click',()=>openPanel('work'));
  // A keyboard/viewport resize must not close a user-requested panel.
  closeSidebar.addEventListener('click',closePanel);
  closeInspector.addEventListener('click',closePanel);
  scrim.addEventListener('click',closePanel);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && document.body.dataset.realityChatPanel){
      closePanel();historyToggle.focus({preventScroll:true});
    }
  });

  // Empty conversation is explicitly an invitation, never fabricated history.
  function renderEmpty() {
    const hasMessage=[...transcript.children].some(el=>el!==liveActivity&&el.classList.contains('bubble'));
    let empty=transcript.querySelector('.reality-chat-empty');
    if(hasMessage){if(empty)empty.remove();return;}
    if(empty)return;
    empty=node('div','reality-chat-empty');
    const symbol=node('div','reality-chat-empty-mark','✦');
    const h=node('h3','','Work with Reality');
    const p=node('p','',
      'Ask Reality a question, discuss your goals, or plan work.');
    empty.append(symbol,h,p);
    transcript.append(empty);
  }
  let rendering=false;
  const transcriptObserver=new MutationObserver(()=>{
    if(rendering)return;
    rendering=true;
    try{renderEmpty();}finally{rendering=false;}
  });
  transcriptObserver.observe(transcript,{childList:true});
  renderEmpty();
  // Saved transcripts are allowed to rerender; keep the compact status and
  // any owner-requested inline work card in their conversation, not a layer
  // above it. This is a projection, not a new persisted customer message.
  const inlineRerender=new MutationObserver(()=>{
    mountLiveActivity();
    attachInlineStatus();
    if(inlineScreen()&&!inlinePanels.hidden&&!transcript.contains(inlinePanels))
      transcript.append(inlinePanels);
  });
  inlineRerender.observe(transcript,{childList:true});

  // Work-in-progress indicator reflects the REAL request lifecycle only.
  const prompt=get('privatePrompt'),send=get('privateSend');
  if(prompt&&send){
    prompt.placeholder='Message Reality…';
    prompt.setAttribute('aria-label','Message Reality');
    send.textContent='Send';
    send.setAttribute('aria-label','Send message to Reality');
    prompt.addEventListener('input',()=>{
      prompt.style.height='auto';
      prompt.style.height=Math.min(prompt.scrollHeight,220)+'px';
    });
    prompt.addEventListener('keydown',event=>{
      if(event.isComposing || event.shiftKey || event.altKey || event.key!=='Enter')return;
      const keyboardSubmit=(event.ctrlKey||event.metaKey) ||
        (window.matchMedia && window.matchMedia('(pointer:fine)').matches);
      if(!keyboardSubmit || !prompt.value.trim())return;
      event.preventDefault();
      if(!send.disabled)send.click();
    });
    const originalLabel=send.textContent;
    const updateBusy=()=>{
      const busy=send.disabled;
      transcript.setAttribute('aria-busy',String(busy));
      send.textContent=busy?'Sending…':originalLabel;
    };
    new MutationObserver(updateBusy).observe(send,{attributes:true,attributeFilter:['disabled']});
    updateBusy();
  }
})();
