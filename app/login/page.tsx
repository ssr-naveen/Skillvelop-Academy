import { getChatGPTUser, safeRelativeReturnPath } from "@/app/chatgpt-auth";
import Image from "next/image";
import { ArrowRight, BookOpenCheck, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import styles from "./Login.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const user = await getChatGPTUser();
  const returnTo = safeRelativeReturnPath(params.returnTo || "/dashboard");
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <a className={styles.brand} href="/" aria-label="Skillvelop Academy home"><span className={styles.brandMark}><Image src="/skillvelop-logo.png" alt="Skillvelop" width={130} height={87} priority unoptimized /></span><span className={styles.brandNote}>Skillvelop Academy</span></a>
      <span className={styles.securePill}><ShieldCheck size={15}/><span>Secure learning access</span></span>
    </header>

    <section className={styles.shell}>
      <div className={styles.story}>
        <div className={styles.storyContent}><span className={styles.eyebrow}><Sparkles/> YOUR LEARNING SPACE</span><h1>Everything you need to<br/><em>keep moving forward.</em></h1><p className={styles.storyLead}>Step into one focused workspace for live learning, meaningful practice, tutor feedback and visible progress.</p></div>
        <div className={styles.valueList}>
          <div className={styles.valueItem}><span className={styles.valueIcon}><BookOpenCheck size={17}/></span><div><strong>Learn with clarity</strong><span>Courses, classes and assignments in one place</span></div></div>
          <div className={styles.valueItem}><span className={styles.valueIcon}><UserRound size={17}/></span><div><strong>Stay connected</strong><span>Work closely with your tutor and learning team</span></div></div>
          <div className={styles.valueItem}><span className={styles.valueIcon}><Sparkles size={17}/></span><div><strong>See your growth</strong><span>Track progress, feedback and achievements</span></div></div>
        </div>
      </div>

      <div className={styles.panel}>
        <span className={styles.panelKicker}>WELCOME BACK</span><h2>{user ? `Continue as ${user.displayName}` : "Sign in to Skillvelop"}</h2><p className={styles.panelIntro}>{user ? "Your workspace is ready. Continue securely to your dashboard." : "Use the account details provided by Skillvelop to enter your learning workspace."}</p>
        {params.error && <div className={styles.error} role="alert"><LockKeyhole size={15}/> The username or password is incorrect.</div>}
        {user ? <div className={styles.continueCard}><div className={styles.welcomeIdentity}><span className={styles.avatar}>{user.displayName.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase()}</span><div><strong>{user.displayName}</strong><small>Authenticated Skillvelop account</small></div></div><a className={styles.button} href={returnTo}><span>Open my dashboard</span><span className={styles.buttonArrow}><ArrowRight size={18}/></span></a></div> : <form className={styles.form} action="/api/auth/login" method="post"><input type="hidden" name="returnTo" value={returnTo}/><label className={styles.field}>Username or email<span className={styles.fieldShell}><span className={styles.fieldIcon}><Mail size={18}/></span><input name="identifier" required autoComplete="username" placeholder="Enter your username or email"/></span></label><label className={styles.field}>Password<span className={styles.fieldShell}><span className={styles.fieldIcon}><LockKeyhole size={18}/></span><input type="password" name="password" required autoComplete="current-password" placeholder="Enter your password"/></span></label><button className={styles.button} type="submit"><span>Sign in securely</span><span className={styles.buttonArrow}><ArrowRight size={18}/></span></button></form>}
        <p className={styles.terms}>By continuing, you agree to Skillvelop&apos;s learning platform terms and privacy policy.</p>
      </div>
    </section>

    <footer className={styles.footer}><span>© 2026 Skillvelop Academy</span><span className={styles.footerTrust}><ShieldCheck size={12}/> Protected access</span><a href="mailto:support@skillvelop.com">Need help?</a></footer>
  </main>;
}
