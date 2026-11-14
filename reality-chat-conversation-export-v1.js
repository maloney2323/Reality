/* Reality conversation exports: owner authenticated, source-backed, local files.
   Copy messages and export saved current conversation as Markdown / JSON /
   print-to-PDF. No server-side file publication, email, worker or approval. */
(() => {
 'use strict';
 const main=/^\/chat\/?$/.test(location.pathname);
 const simple=/^\/chat-simple\/?$/.test(location.pathname);
 if(!main&&!simple)return;
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 const transcript=document.getElementById(main?'privateTranscript':'thread');
 if(!transcript)return;
 const wrapper=main?document.getElementById('realityChatConversation'):
  document.getElementById('rileyConversationDisclosure');
 if(!wrapper)return;
 const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;return x;};
 const action=label=>{const b=el('button',label);b.type='button';return b;};
 const controls=el('div');controls.className='reality-conversation-exports';
 controls.setAttribute('aria-label','Saved conversation actions');
 const copy=action('Copy conversation');
 const markdown=action('Export Markdown');
 const json=action('Export JSON');
 const pdf=action('Print / Save PDF');
 const msg=el('p','Export the saved conversation for this account. PDF uses your device’s Print / Save as PDF option.');
 msg.setAttribute('role','status');msg.className='reality-conversation-export-status';
 controls.append(copy,markdown,json,pdf,msg);
 // Keep document-export controls OUT of the flex conversation thread.
 // On narrow screens, placing them between the scroll pane and composer
 // consumes the scroll height and makes past messages appear trapped.
 // The existing Chats side panel is an independently scrollable home for them.
 if(main){
  const sidebar=document.getElementById('realityChatSidebar');
  if(sidebar){
   const title=el('h3','Saved conversation');
   title.className='reality-chat-panel-heading';
   sidebar.append(title,controls);
  }else{
   // Safe legacy layout: outside the thread, never inside its flex column.
   (document.getElementById('privateReady')||wrapper).append(controls);
  }
 }else transcript.insertAdjacentElement('beforebegin',controls);
 const key='reality.private.chat.conversation.v1';
 function currentId(){
  const id=main&&typeof window.realityActiveConversationId==='function'?
   window.realityActiveConversationId():localStorage.getItem(key);
  if(!uuid.test(id||''))throw Error('No verified active conversation');
  return id;
 }
 function validate(messages){
  if(!Array.isArray(messages)||messages.length>240||
    messages.some(m=>!m||!['user','assistant'].includes(m.role)||
      typeof m.text!=='string'||m.text.length>30000))
   throw Error('Saved transcript source could not be verified');
  return messages;
 }
 async function saved(){
  const id=currentId();
  const res=await fetch('/api/reality/personal-chat?conversation_id='+encodeURIComponent(id),{
   method:'GET',credentials:'same-origin',cache:'no-store',
   signal:AbortSignal.timeout(20000)
  });
  const result=await res.json().catch(()=>null);
  if(!res.ok||result?.ok!==true)throw Error('Authenticated saved history unavailable');
  const messages=validate(result.messages);
  if(!messages.length)throw Error('No saved messages to export yet');
  return {id,messages,continuity:result.continuity||null};
 }
 function markdownText(archive){
  const lines=['# Reality conversation','',
   'Conversation ID: '+archive.id,'',
   'Source: Authenticated Reality saved Chat',
   'Exported: '+new Date().toISOString(),'',
   archive.continuity?.older_messages_may_be_missing===true?
    'Note: The history readback indicates older messages may be missing.':'',
   ''];
  for(const m of archive.messages){
   lines.push('## '+(m.role==='user'?'You':'Reality'),'',
    m.text.replace(/^#/gm,'\\#'),'');
  }
  return lines.join('\n');
 }
 function download(filename,text,type){
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=el('a');a.href=url;a.download=filename;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
 }
 async function run(btn,operation){
  if(btn.disabled)return;
  btn.disabled=true;msg.textContent='Reading authenticated saved conversation…';
  try{
   const data=await saved();
   await operation(data);
   msg.textContent='Export prepared from '+data.messages.length+' saved messages. No job or approval was created.';
  }catch(e){msg.textContent=String(e.message||'Export unavailable').slice(0,180);}
  finally{btn.disabled=false;}
 }
 copy.addEventListener('click',()=>void run(copy,data=>
  navigator.clipboard.writeText(markdownText(data))));
 markdown.addEventListener('click',()=>void run(markdown,data=>
  download('reality-conversation-'+data.id+'.md',markdownText(data),'text/markdown;charset=utf-8')));
 json.addEventListener('click',()=>void run(json,data=>
  download('reality-conversation-'+data.id+'.json',
   JSON.stringify({schema:'reality-owner-conversation-export-v1',
    conversation_id:data.id,exported_at:new Date().toISOString(),
    history_partial:data.continuity?.older_messages_may_be_missing===true,
    messages:data.messages},null,2),'application/json;charset=utf-8')));
 pdf.addEventListener('click',()=>{
  // Open synchronously from the user's click before async authenticated fetch.
  const popup=window.open('','_blank');
  if(!popup){msg.textContent='Browser blocked the print window. Enable popups to save PDF.';return;}
  void run(pdf,async data=>{
   popup.document.title='Reality conversation · '+data.id;
   const css=el('style');
   css.textContent='@page{margin:16mm}body{font:11pt/1.5 system-ui,Arial,sans-serif;color:#101828;max-width:770px;margin:auto;padding:18px}h1{font-size:20pt}h2{font-size:12pt;margin-top:22px;border-bottom:1px solid #ccc;padding-bottom:4px}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}p{font-size:9pt;color:#475467}';
   popup.document.head.append(css);
   popup.document.body.replaceChildren();
   popup.document.body.append(el('h1','Reality conversation'),
    el('p','Saved conversation · '+data.id+' · '+new Date().toLocaleString()));
   if(data.continuity?.older_messages_may_be_missing===true)
    popup.document.body.append(el('p','Warning: older conversation messages may be missing.'));
   for(const m of data.messages){
    popup.document.body.append(el('h2',m.role==='user'?'You':'Reality'),el('pre',m.text));
   }
   popup.focus();popup.print();
  }).catch(()=>popup.close());
 });
 // Copy any individual assistant/user response. New messages get actions too.
 function attachMessageCopy(){
  for(const bubble of transcript.querySelectorAll(main?'.bubble':'.message')){
   if(bubble.querySelector('.reality-copy-message'))continue;
   const contents=main?bubble.querySelector('div[style*="white-space"]'):
    bubble.querySelector('div:last-of-type');
   if(!contents||!contents.textContent.trim())continue;
   const button=action('Copy message');
   button.className='reality-copy-message';
   button.setAttribute('aria-label','Copy this conversation message');
   button.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(contents.textContent);
     button.textContent='Copied';setTimeout(()=>button.textContent='Copy message',1500);
    }catch{msg.textContent='Clipboard access unavailable on this device.';}
   });
   bubble.append(button);
  }
 }
 const observer=new MutationObserver(attachMessageCopy);
 observer.observe(transcript,{childList:true});
 attachMessageCopy();
})();
