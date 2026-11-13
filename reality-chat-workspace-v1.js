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
  if (title) title.textContent = 'Your Reality workspace';

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

  // Center: a conversation, not a stack of operational cards.
  const threadHeader = node('div', 'reality-chat-thread-heading');
  const threadTitle = node('div');
  threadTitle.append(node('strong', '', 'Conversation'));
  threadTitle.append(node('small', '', 'Reality keeps source claims, goals and execution authority separate.'));
  const threadButtons = node('div', 'reality-chat-thread-buttons');
  // Redundant direct navigation is intentional: a signed-in user should
  // never depend on scrolling past an operational card to leave the chat.
  const homeLink = node('a', 'reality-chat-home-link', '← Home');
  homeLink.href = '/';
  homeLink.setAttribute('aria-label','Return to Reality Home');
  const historyToggle = node('button', 'reality-chat-mobile-tool', 'Chats');
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
  const smallScreen = () => window.matchMedia('(max-width:600px)').matches;
  function updateFocusLabel(){
    inspectorToggle.textContent = smallScreen() ? 'Work' : 'Work & approvals';
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
    if(smallScreen()) document.body.classList.toggle('reality-chat-compact');
    else document.body.classList.toggle('reality-chat-focus');
    updateFocusLabel();
  });
  updateFocusLabel();
  window.addEventListener('resize', updateFocusLabel);
  threadButtons.append(homeLink, historyToggle, inspectorToggle, focusToggle);
  threadHeader.append(threadTitle, threadButtons);
  conversation.append(threadHeader, transcript, composer);

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
  const composerControls = node('div', 'reality-chat-composer-controls');
  composerControls.append(goalOptions, get('privateSend'));
  composer.append(composerControls);
  composer.append(node('p','reality-chat-typing-note','Enter to send on desktop · Shift+Enter for a new line · No message grants installation permission.'));

  const statusBar = node('div', 'reality-chat-status-bar');
  // Mirror the existing response/verification status into the conversation.
  // Keep its original live-region outside the authenticated panel so login
  // and session errors remain visible even before sign-in.
  const originalStatus = get('privateStatus');
  const statusCopy = node('p', 'muted');
  statusCopy.id = 'realityChatStatusSummary';
  if (originalStatus) {
    const syncStatus = () => { statusCopy.textContent = originalStatus.textContent; };
    new MutationObserver(syncStatus).observe(originalStatus, {
      childList:true, characterData:true, subtree:true
    });
    syncStatus();
  }
  statusBar.append(statusCopy);
  const statusExpand = node('button', '', 'Details');
  statusExpand.type = 'button';
  statusExpand.setAttribute('aria-expanded', 'false');
  statusExpand.addEventListener('click', () => {
    const expanded = statusBar.dataset.expanded !== 'true';
    statusBar.dataset.expanded = String(expanded);
    statusExpand.textContent = expanded ? 'Less' : 'Details';
    statusExpand.setAttribute('aria-expanded',String(expanded));
  });
  statusBar.append(statusExpand);
  conversation.append(statusBar);

  // Right: the existing authenticated provider readbacks and real approval UI.
  const closeInspector = node('button','reality-chat-panel-close','Close work panel');
  closeInspector.type='button';
  inspector.append(closeInspector);
  inspector.append(heading('Reality operations', 'Source-backed status and decisions. No simulated progress.'));
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
  inspector.append(tabs,...panelNames.map(([key])=>panels[key]));
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
  const refreshReadyDisplay = () => document.body.classList.toggle(
    'reality-chat-signed-in', ready.style.display === 'block'
  );
  new MutationObserver(refreshReadyDisplay).observe(ready, {
    attributes:true,attributeFilter:['style']
  });
  refreshReadyDisplay();

  // On smaller screens the conversation fills the page. The side panels
  // overlay it only when explicitly opened, and remain available to screen readers.
  function closePanel() {
    document.body.dataset.realityChatPanel='';
    historyToggle.setAttribute('aria-expanded','false');
    inspectorToggle.setAttribute('aria-expanded','false');
  }
  function openPanel(name) {
    const next = document.body.dataset.realityChatPanel===name?'':name;
    document.body.dataset.realityChatPanel=next;
    historyToggle.setAttribute('aria-expanded',String(next==='history'));
    inspectorToggle.setAttribute('aria-expanded',String(next==='work'));
    if(next==='history') closeSidebar.focus({preventScroll:true});
    if(next==='work') closeInspector.focus({preventScroll:true});
    if(!next) (name==='history'?historyToggle:inspectorToggle).focus({preventScroll:true});
  }
  historyToggle.addEventListener('click',()=>openPanel('history'));
  inspectorToggle.addEventListener('click',()=>openPanel('work'));
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
    const hasMessage=[...transcript.children].some(el=>el.classList.contains('bubble'));
    let empty=transcript.querySelector('.reality-chat-empty');
    if(hasMessage){if(empty)empty.remove();return;}
    if(empty)return;
    empty=node('div','reality-chat-empty');
    const symbol=node('div','reality-chat-empty-mark','✦');
    const h=node('h3','','Work with Reality');
    const p=node('p','',
      'Ask about your business, investigate a problem, or prepare a governed development task. Reality will distinguish evidence from suggestions and ask for exact approval before consequential actions.');
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

  // Work-in-progress indicator reflects the REAL request lifecycle only.
  const prompt=get('privatePrompt'),send=get('privateSend');
  if(prompt&&send){
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
