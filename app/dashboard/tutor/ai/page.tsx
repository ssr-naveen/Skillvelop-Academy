import { first } from "@/db/lms";
import { hasStoredCredential } from "@/app/api/ai/provider";
import AIAssistant from "../../AIAssistant";
import { LmsShell } from "../../components";
import { requireRole } from "../../auth";
type Settings={provider:"openai"|"anthropic";enabled:number};export const dynamic="force-dynamic";
export default async function Page(){const profile=await requireRole("tutor","/dashboard/tutor/ai");const settings=await first<Settings>("SELECT provider,enabled FROM ai_settings WHERE id='platform'")??{provider:"openai",enabled:0};const connected=await hasStoredCredential(settings.provider);return <LmsShell profile={profile} activeRole="tutor" activePath="/dashboard/tutor/ai" eyebrow="VIYU course studio" title="Create a complete course from one prompt" subtitle="Describe your learner, subject and goal once. VIYU builds the chapters, lessons, assignments, practice quizzes and assessments for you to review and unlock."><AIAssistant mode="authoring" enabled={Boolean(settings.enabled&&connected)}/></LmsShell>}
