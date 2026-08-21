import { database } from "@/db/lms";
import { env } from "@/lib/platform-env";

export type ViyuProvider="openai"|"anthropic";
export type ViyuSettings={provider:ViyuProvider;model:string;enabled:number;system_guidance:string};
type ProviderMessage={role:string;body:string};
type Credential={encrypted_key:string;iv:string};

function bytesToBase64(bytes:Uint8Array){let raw="";for(const byte of bytes)raw+=String.fromCharCode(byte);return btoa(raw);}
function base64ToBytes(value:string){const raw=atob(value);return Uint8Array.from(raw,char=>char.charCodeAt(0));}
async function masterKey(){const secret=env.AI_CREDENTIAL_MASTER_KEY;if(!secret)throw new Error("The protected VIYU credential vault is not configured.");let bytes:Uint8Array;if(/^[a-f0-9]{64}$/i.test(secret))bytes=Uint8Array.from(secret.match(/.{2}/g)??[],part=>parseInt(part,16));else bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret)));return crypto.subtle.importKey("raw",new Uint8Array(bytes).buffer,"AES-GCM",false,["encrypt","decrypt"]);}

export async function encryptProviderKey(apiKey:string){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},await masterKey(),new TextEncoder().encode(apiKey));return {encryptedKey:bytesToBase64(new Uint8Array(encrypted)),iv:bytesToBase64(iv),hint:`•••• ${apiKey.slice(-4)}`};}
async function decryptProviderKey(row:Credential){const decrypted=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(row.iv)},await masterKey(),base64ToBytes(row.encrypted_key));return new TextDecoder().decode(decrypted);}

export async function getViyuSettings(){return await database().prepare("SELECT provider,model,enabled,system_guidance FROM ai_settings WHERE id='platform'").first<ViyuSettings>();}
export async function hasStoredCredential(provider:ViyuProvider){if(provider==="openai"&&env.OPENAI_API_KEY)return true;if(provider==="anthropic"&&env.ANTHROPIC_API_KEY)return true;return Boolean(await database().prepare("SELECT provider FROM ai_provider_credentials WHERE provider=?").bind(provider).first());}
async function providerKey(provider:ViyuProvider){const direct=provider==="openai"?env.OPENAI_API_KEY:env.ANTHROPIC_API_KEY;if(direct)return direct;const row=await database().prepare("SELECT encrypted_key,iv FROM ai_provider_credentials WHERE provider=?").bind(provider).first<Credential>();if(!row)throw new Error("VIYU has not been connected by the super admin yet.");return decryptProviderKey(row);}

function normaliseAnthropicModel(model:string){
  const value=model.trim().toLowerCase();
  const aliases:Record<string,string>={
    "haiku-4.5":"claude-haiku-4-5",
    "haiku-4-5":"claude-haiku-4-5",
    "claude-haiku-4.5":"claude-haiku-4-5",
    "sonnet-4.5":"claude-sonnet-4-5",
    "sonnet-4-5":"claude-sonnet-4-5",
    "claude-sonnet-4.5":"claude-sonnet-4-5",
  };
  return aliases[value]??model.trim();
}

export async function callViyu(settings:ViyuSettings,system:string,messages:ProviderMessage[],maxTokens=1800){
  const key=await providerKey(settings.provider);
  if(settings.provider==="anthropic"){
    const model=normaliseAnthropicModel(settings.model||"claude-haiku-4-5");
    const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","Content-Type":"application/json"},body:JSON.stringify({model,max_tokens:maxTokens,system,messages:messages.map(item=>({role:item.role,content:item.body}))})});
    if(!response.ok){const detail=await response.text().catch(()=>"");console.error("VIYU Anthropic request failed",response.status,detail.slice(0,600));throw new Error("VIYU could not connect. Ask the super admin to check the AI credential and model.");}
    const payload=await response.json() as {content?:{type:string;text?:string}[]};return payload.content?.filter(item=>item.type==="text").map(item=>item.text??"").join("\n")??"";
  }
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:settings.model,input:[{role:"system",content:system},...messages.map(item=>({role:item.role,content:item.body}))],max_output_tokens:maxTokens})});
  if(!response.ok)throw new Error("VIYU could not connect. Ask the super admin to check the AI credential and model.");
  const payload=await response.json() as {output_text?:string;output?:{content?:{type?:string;text?:string}[]}[]};return payload.output_text??payload.output?.flatMap(item=>item.content??[]).filter(item=>item.type==="output_text").map(item=>item.text??"").join("\n")??"";
}
