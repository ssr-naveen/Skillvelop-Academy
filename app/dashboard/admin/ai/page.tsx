import { all, first } from "@/db/lms";
import { env } from "@/lib/platform-env";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import AIAssistant from "../../AIAssistant";
import { LmsShell, Notice, Status } from "../../components";
import { requireRole } from "../../auth";

type Settings={provider:"openai"|"anthropic";model:string;enabled:number;system_guidance:string};
type Credential={provider:"openai"|"anthropic";key_hint:string;updated_at:string};
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireRole("admin","/dashboard/admin/ai");
  const settings=await first<Settings>("SELECT provider,model,enabled,system_guidance FROM ai_settings WHERE id='platform'")??{provider:"openai",model:"gpt-5-mini",enabled:0,system_guidance:""};
  const stored=await all<Credential>("SELECT provider,key_hint,updated_at FROM ai_provider_credentials ORDER BY provider"),byProvider=Object.fromEntries(stored.map(item=>[item.provider,item]));
  const openaiConnected=Boolean(env.OPENAI_API_KEY||byProvider.openai),claudeConnected=Boolean(env.ANTHROPIC_API_KEY||byProvider.anthropic),selectedConnected=settings.provider==='openai'?openaiConnected:claudeConnected;
  return <LmsShell profile={profile} activeRole="admin" activePath="/dashboard/admin/ai" eyebrow="VIYU control centre" title="Configure VIYU" subtitle="Connect the private intelligence engine, choose its model and govern how VIYU supports course teams and learners.">
    <Notice params={await searchParams}/>
    <div className="ai-admin-layout"><section className="panel ai-provider-panel"><div className="panel-head"><div><span className="panel-kicker">PRIVATE CONNECTION</span><h2>Provider and API credential</h2></div><Status tone={settings.enabled&&selectedConnected?"green":"amber"}>{settings.enabled&&selectedConnected?"VIYU live":"Setup needed"}</Status></div>
      <div className="credential-intro"><LockKeyhole size={22}/><div><strong>Where to enter the API key</strong><p>Use the write-only credential field below. The key is encrypted before storage and is never displayed again to any user.</p></div></div>
      <form className="credential-form" action="/api/lms" method="post"><input type="hidden" name="action" value="save-ai-credential"/><label>Provider<select name="provider" defaultValue={settings.provider}><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select></label><label>API key<input type="password" name="apiKey" required minLength={20} autoComplete="new-password" placeholder="Paste the provider API key securely"/><small>Saving replaces the selected provider’s previous key. The value will not be shown again.</small></label><button><KeyRound size={18}/> Encrypt and connect key</button></form>
      <div className="provider-grid"><article className={settings.provider==='openai'?"provider-card selected":"provider-card"}><strong>Connection A</strong><span>Available as a private VIYU engine.</span><i className={openaiConnected?"connected":"missing"}>{openaiConnected?`${byProvider.openai?.key_hint??"Deployment secret"} connected`:"Credential required"}</i></article><article className={settings.provider==='anthropic'?"provider-card selected":"provider-card"}><strong>Connection B</strong><span>Available as a private VIYU engine.</span><i className={claudeConnected?"connected":"missing"}>{claudeConnected?`${byProvider.anthropic?.key_hint??"Deployment secret"} connected`:"Credential required"}</i></article></div>
      <form className="ai-settings-form" action="/api/lms" method="post"><input type="hidden" name="action" value="save-ai-settings"/><label>Active VIYU engine<select name="provider" defaultValue={settings.provider}><option value="openai">Connection A</option><option value="anthropic">Connection B</option></select></label><label>Model name<input name="model" defaultValue={settings.model} placeholder="Provider model identifier"/><small>This technical setting is visible only to super admins. Tutors and students see VIYU only.</small></label><label>Academy guidance<textarea name="systemGuidance" rows={4} defaultValue={settings.system_guidance} placeholder="Teaching standards, safeguarding rules, curriculum framework and tone…"/></label><label className="check-row"><input type="checkbox" name="enabled" defaultChecked={Boolean(settings.enabled)}/> Enable VIYU for course authoring and student doubt clarification</label><button>Save VIYU configuration →</button></form>
      <div className="secret-note"><ShieldCheck size={20}/><div><strong>Protected credential design</strong><p>Credentials are write-only, encrypted at rest and used only on the server. Tutors and learners cannot see the selected provider, model or API key.</p></div></div>
    </section><AIAssistant mode="authoring" enabled={Boolean(settings.enabled&&selectedConnected)}/></div>
  </LmsShell>;
}
