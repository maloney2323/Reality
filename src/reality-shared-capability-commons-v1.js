// Sanitized product-level capability commons. No tenant data, model output,
// owner work authority, installation key or private regression is shared.
// A portable release is not an installation; a notification is not consent.
import {createHash} from 'node:crypto';
import {BUSINESS_CATEGORIES} from './reality-genuine-capability-value-passport-v1.js';
export const COMMONS_VERSION='reality-shared-capability-commons-v1';
const HASH=/^[a-f0-9]{64}$/;
const CAP=/^[a-z][a-z0-9._-]{2,90}$/;
const SLUG=/^[a-z][a-z0-9_-]{1,60}$/;
const RELEASE_KEYS=['artifact_sha256','capability_id','version','business_categories',
 'industry_tags','required_integrations','capability_interface'];
const isList=(xs,regex,max)=>Array.isArray(xs)&&xs.length<=max&&
 xs.every(x=>typeof x==='string'&&regex.test(x))&&new Set(xs).size===xs.length;
const str=x=>typeof x==='string'&&x.length>0;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function stop(code){throw Error('CAPABILITY_COMMONS_'+code)}
function onlyKeys(record,keys){
 return record&&typeof record==='object'&&!Array.isArray(record)&&
 Object.keys(record).every(k=>keys.includes(k))&&
 keys.every(k=>Object.hasOwn(record,k));
}
// Source-tenant identity remains only in the trusted private release audit;
// it never becomes part of the distributed package.
export function createPortableCapabilityRelease({packageManifest,independentProof,
 releaseAuthorization}={}){
 if(!onlyKeys(packageManifest,RELEASE_KEYS)||
  !CAP.test(packageManifest.capability_id)||!HASH.test(packageManifest.artifact_sha256)||
  !/^[1-9][0-9]{0,4}\.[0-9]{1,4}\.[0-9]{1,4}$/.test(packageManifest.version)||
  !isList(packageManifest.business_categories,
   {test:x=>BUSINESS_CATEGORIES.includes(x)},13)||
  !packageManifest.business_categories.length||
  !isList(packageManifest.industry_tags,SLUG,20)||
  !isList(packageManifest.required_integrations,SLUG,20)||
  !SLUG.test(packageManifest.capability_interface))
  stop('PORTABLE_MANIFEST_INVALID_OR_CONTAINS_TENANT_DATA');
 if(independentProof?.artifact_sha256!==packageManifest.artifact_sha256||
  independentProof?.independent_sandbox_passed!==true||
  independentProof?.historical_regressions_passed!==true||
  independentProof?.security_scan_passed!==true||
  independentProof?.tenant_data_scrubbed===true?false:false){} // checked below
 if(!independentProof||
  independentProof.artifact_sha256!==packageManifest.artifact_sha256||
  independentProof.independent_sandbox_passed!==true||
  independentProof.historical_regressions_passed!==true||
  independentProof.security_scan_passed!==true||
  independentProof.tenant_data_scrubbed!==true||
  independentProof.license_cleared!==true||
  !str(independentProof.signed_attestation_ref)||
  independentProof.signed_attestation_ref.length<16||
  releaseAuthorization?.cross_tenant_reuse_reviewed!==true||
  releaseAuthorization?.source_owner_sharing_permitted!==true||
  releaseAuthorization?.platform_approved_portable_release!==true)
  stop('INDEPENDENT_PORTABILITY_AND_SHARING_AUTHORIZATION_REQUIRED');
 const c=packageManifest;
 const catalog={
  schema:COMMONS_VERSION,capability_id:c.capability_id,version:c.version,
  artifact_sha256:c.artifact_sha256,
  business_categories:[...c.business_categories].sort(),
  industry_tags:[...c.industry_tags].sort(),
  required_integrations:[...c.required_integrations].sort(),
  capability_interface:c.capability_interface,
  verification_attestation_ref:independentProof.signed_attestation_ref,
  portability_status:'INDEPENDENTLY_VERIFIED_PORTABLE_PACKAGE',
  source_tenant_data_included:false,owner_authority_shared:false,
  installation_authorized:false,production_changed:false
 };
 return Object.freeze({
  ...catalog,
  release_id:'reusable:'+digest(catalog),
  distributable_metadata_only:true,
  requires_customer_fit_check:true,
  requires_per_customer_install_approval:true
 });
}
export function recommendPortableCapability({release,customerProfile}={}){
 if(release?.schema!==COMMONS_VERSION||
  release.portability_status!=='INDEPENDENTLY_VERIFIED_PORTABLE_PACKAGE'||
  release.distributable_metadata_only!==true||
  release.source_tenant_data_included!==false||
  release.owner_authority_shared!==false||
  release.requires_per_customer_install_approval!==true||
  !HASH.test(release.artifact_sha256)||!CAP.test(release.capability_id)||
  !customerProfile||typeof customerProfile!=='object'||
  !SLUG.test(customerProfile.industry||'')||
  !isList(customerProfile.business_categories,
   {test:x=>BUSINESS_CATEGORIES.includes(x)},13)||
  !isList(customerProfile.integrations,SLUG,30)||
  !isList(customerProfile.installed_capabilities,CAP,80)||
  typeof customerProfile.upgrade_notifications_opt_in!=='boolean')
  stop('VERIFIED_PACKAGE_AND_CUSTOMER_PROFILE_REQUIRED');
 if(customerProfile.installed_capabilities.includes(release.capability_id))
  return Object.freeze({status:'ALREADY_HAS_CAPABILITY',notify:false,
   can_install:false,installation_authorized:false});
 const industryFit=release.industry_tags.includes('cross_industry')||
  release.industry_tags.includes(customerProfile.industry);
 const businessFit=release.business_categories.some(x=>
  customerProfile.business_categories.includes(x));
 const integrationsFit=release.required_integrations.every(x=>
  customerProfile.integrations.includes(x));
 if(!industryFit||!businessFit||!integrationsFit)
  return Object.freeze({status:'NOT_COMPATIBLE_OR_RELEVANT',notify:false,
   can_install:false,installation_authorized:false});
 return Object.freeze({
  status:'PORTABLE_UPGRADE_OFFER_ELIGIBLE',
  capability_id:release.capability_id,release_id:release.release_id,
  category_match:true,industry_match:true,integrations_match:true,
  notify:customerProfile.upgrade_notifications_opt_in,
  notification_state:customerProfile.upgrade_notifications_opt_in?
   'NOTIFICATION_CANDIDATE_NOT_SENT':'NOTIFICATIONS_DISABLED_CATALOG_ONLY',
  owner_review_required:true,independent_tenant_compatibility_test_required:true,
  per_customer_install_approval_required:true,
  can_install:false,installation_authorized:false,
  customer_data_shared:false,production_changed:false
 });
}
