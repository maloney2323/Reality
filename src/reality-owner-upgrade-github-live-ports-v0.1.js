// Connect existing owner-bound closure to the REAL GitHub merge connector
// and independent readback, without inventing owner grants/registry/runtime.
// The other nine closure ports remain mandatory trusted server services.
import {installExactOwnerAuthorizedGithubUpgrade}
 from './reality-owner-upgrade-github-install-v0.1.js';
import {observeOwnerGithubUpgradeInstall}
 from './reality-owner-upgrade-github-install-readback-v0.1.js';
import {appendVerifiedOwnerUpgradeJobSettlement,readVerifiedOwnerUpgradeJobSettlement}
 from './reality-owner-upgrade-original-job-settlement-v0.1.js';
export const OWNER_UPGRADE_GITHUB_LIVE_PORTS_VERSION='reality-owner-upgrade-github-live-ports-v0.1';
const missing=(name)=>{throw Error('UPGRADE_LIVE_PORT_REQUIRED_'+name)};
export function connectOwnerGithubUpgradeToClosure({
 authorityPorts,runtimePorts,continuityPorts,
 install=installExactOwnerAuthorizedGithubUpgrade,
 observe=observeOwnerGithubUpgradeInstall,
 appendSettlement=appendVerifiedOwnerUpgradeJobSettlement,
 readSettlement=readVerifiedOwnerUpgradeJobSettlement,
}={}){
 const external={...authorityPorts,...runtimePorts,...continuityPorts};
 const required=['consumeInstallGrant','register','readRegistry','readFreshGoal',
  'consumeResumeGrant','resumeOriginal','observeOriginal'];
 for(const key of required){
  if(typeof external[key]!=='function')missing(key);
 }
 if(typeof install!=='function'||typeof observe!=='function'||
    typeof appendSettlement!=='function'||typeof readSettlement!=='function')
  missing('GITHUB_VERIFIED_INSTALL');
 // Always override any caller-defined install/observe hooks with the
 // independent real provider pair. Do not expose a bypass injection route.
 return Object.freeze({
  ...external,
  install:async({session,scope,plan,grant,env})=>
   install({session,scope,plan,grant,env}),
  observeInstall:async({session,scope,plan,grant,issued,env})=>
   observe({session,conversationId:scope.conversationId,
    originalWorkId:scope.workId,plan,issued,env}),
  appendSettlement:async({session,scope,plan,installed,active,outcome,env})=>
   appendSettlement({session,scope,plan,installed,active,outcome,env}),
  readSettlement:async({session,scope,plan,receipt,outcome,env})=>{
   const saved=await readSettlement({session,scope,plan,env});
   if(saved?.settlement_receipt_id!==receipt?.receipt_id)
    throw Error('UPGRADE_LIVE_SETTLEMENT_READBACK_RECEIPT_MISMATCH');
   return saved;
  },
 });
}
