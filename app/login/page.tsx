import { getChatGPTUser, safeRelativeReturnPath } from "@/app/chatgpt-auth";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Poppins } from "next/font/google";
import Image from "next/image";
import { ArrowRight, CalendarClock, ClipboardCheck, GraduationCap, LibraryBig, LockKeyhole, Mail, ShieldCheck, TrendingUp } from "lucide-react";
import styles from "./Login.module.css";

export const dynamic = "force-dynamic";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600"], display: "swap", variable: "--font-poppins" });

const pageTitle = "Login | Skillvelop Academy — Learning Management System";
const pageDescription = "Sign in to Skillvelop Academy, the learning management system for live 1:1 online classes, structured courses, assignments, quizzes, tutor feedback and progress tracking.";
const organisationDescription = "Skillvelop Academy is a role-based learning management system for live 1:1 online classes, giving administrators, tutors and students one workspace for courses, scheduled classes, assignments, quizzes, feedback, reports and certificates.";
const supportEmail = "support@skillvelop.com";

async function siteOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const origin = await siteOrigin();
  const image = { url: `${origin}/og.png`, width: 1731, height: 909, alt: "Skillvelop Academy learning management system" };
  return {
    title: pageTitle,
    description: pageDescription,
    keywords: [
      "Skillvelop Academy login",
      "Skillvelop LMS",
      "learning management system login",
      "student login portal",
      "tutor login",
      "online tutoring platform",
      "live 1:1 online classes",
      "online learning platform",
      "course and assignment management",
      "student progress tracking",
    ],
    applicationName: "Skillvelop Academy",
    alternates: { canonical: `${origin}/login` },
    robots: { index: true, follow: true },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${origin}/login`,
      siteName: "Skillvelop Academy",
      type: "website",
      locale: "en_US",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: pageTitle, description: pageDescription, images: [image.url] },
  };
}

function structuredData(origin: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["EducationalOrganization", "Organization"],
        "@id": `${origin}/#organization`,
        name: "Skillvelop Academy",
        alternateName: "Skillvelop",
        url: `${origin}/`,
        description: organisationDescription,
        slogan: "Everything you need to keep moving forward",
        email: supportEmail,
        logo: { "@type": "ImageObject", "@id": `${origin}/#logo`, url: `${origin}/skillvelop-logo.png`, contentUrl: `${origin}/skillvelop-logo.png`, width: 2752, height: 1536, caption: "Skillvelop Academy" },
        image: { "@id": `${origin}/#logo` },
        knowsAbout: ["Live 1:1 online tutoring", "Curriculum and course management", "Assignments and quizzes", "Learner progress tracking"],
        contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: supportEmail, availableLanguage: ["English"] },
      },
      { "@type": "WebSite", "@id": `${origin}/#website`, url: `${origin}/`, name: "Skillvelop Academy", description: organisationDescription, inLanguage: "en", publisher: { "@id": `${origin}/#organization` } },
      { "@type": "WebPage", "@id": `${origin}/login#webpage`, url: `${origin}/login`, name: pageTitle, description: pageDescription, inLanguage: "en", isPartOf: { "@id": `${origin}/#website` }, about: { "@id": `${origin}/#organization` }, primaryImageOfPage: { "@id": `${origin}/#logo` } },
    ],
  };
}

const highlights = [
  { icon: CalendarClock, title: "Live 1:1 classes", note: "Scheduled sessions with your tutor, shown in your own timezone." },
  { icon: LibraryBig, title: "Structured curriculum", note: "Courses, chapters and lessons that open up as you progress." },
  { icon: ClipboardCheck, title: "Practice and assessment", note: "Homework, quizzes and assignments reviewed by your tutor." },
  { icon: TrendingUp, title: "Measurable progress", note: "Scores, reports and certificates for every milestone reached." },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const user = await getChatGPTUser();
  const returnTo = safeRelativeReturnPath(params.returnTo || "/dashboard");
  const origin = await siteOrigin();
  const initials = user ? user.displayName.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() : "";

  return <main className={`${poppins.variable} ${styles.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(origin)).replace(/</g, "\\u003c") }}/>

    <header className={styles.topbar}>
      <a className={styles.brand} href="/" aria-label="Skillvelop Academy home">
        <span className={styles.brandMark}><Image src="/skillvelop-logo.png" alt="Skillvelop Academy" width={133} height={74} priority unoptimized/></span>
        <span className={styles.brandNote}><strong>Skillvelop Academy</strong>Learning management system</span>
      </a>
      <span className={styles.securePill}><ShieldCheck size={15}/><span>Secure, role-based access</span></span>
    </header>

    <section className={styles.shell}>
      <div className={styles.story}>
        <div>
          <span className={styles.eyebrow}><GraduationCap/> Learning workspace</span>
          <h1>One place for every class, task and <em>milestone</em>.</h1>
          <p className={styles.storyLead}>Skillvelop Academy keeps live teaching, curriculum, practice and feedback together, so every learner always knows exactly what to do next.</p>
        </div>

        <div className={styles.valueList}>
          {highlights.map(({ icon: Icon, title, note }) => <div className={styles.valueItem} key={title}>
            <span className={styles.valueIcon}><Icon size={18}/></span>
            <div><strong>{title}</strong><span>{note}</span></div>
          </div>)}
        </div>

        <div className={styles.roles}><b>Built for</b><span>Administrators</span><span>Tutors</span><span>Students</span></div>
      </div>

      <div className={styles.panel}>
        <span className={styles.panelKicker}>Welcome back</span>
        <h2>{user ? `Continue as ${user.displayName}` : "Sign in to your workspace"}</h2>
        <p className={styles.panelIntro}>{user ? "You are already signed in. Continue securely to your Skillvelop dashboard." : "Enter the username or email issued by your academy administrator to open your classes, courses and assigned work."}</p>

        {params.error && <div className={styles.error} role="alert"><LockKeyhole size={15}/> The username or password is incorrect. Please try again.</div>}

        {user ? <div className={styles.continueCard}>
          <div className={styles.welcomeIdentity}>
            <span className={styles.avatar} aria-hidden="true">{initials}</span>
            <div><strong>{user.displayName}</strong><small>Verified Skillvelop account</small></div>
          </div>
          <a className={styles.button} href={returnTo}><span>Open my dashboard</span><span className={styles.buttonArrow}><ArrowRight size={18}/></span></a>
        </div> : <form className={styles.form} action="/api/auth/login" method="post">
          <input type="hidden" name="returnTo" value={returnTo}/>
          <label className={styles.field}>Username or email
            <span className={styles.fieldShell}>
              <span className={styles.fieldIcon}><Mail size={18}/></span>
              <input name="identifier" required autoComplete="username" placeholder="you@example.com"/>
            </span>
          </label>
          <label className={styles.field}>Password
            <span className={styles.fieldShell}>
              <span className={styles.fieldIcon}><LockKeyhole size={18}/></span>
              <input type="password" name="password" required autoComplete="current-password" placeholder="Enter your password"/>
            </span>
          </label>
          <button className={styles.button} type="submit"><span>Sign in securely</span><span className={styles.buttonArrow}><ArrowRight size={18}/></span></button>
        </form>}

        <p className={styles.support}>Skillvelop accounts are created by your academy administrator. Need access or help signing in? <a href={`mailto:${supportEmail}`}>Contact support</a>.</p>
        <p className={styles.terms}>Sessions are encrypted and role protected. By continuing you agree to Skillvelop&apos;s learning platform terms and privacy policy.</p>
      </div>
    </section>

    <footer className={styles.footer}>
      <span>© {new Date().getFullYear()} Skillvelop Academy</span>
      <span className={styles.footerTrust}><ShieldCheck size={13}/> Encrypted, role-based access</span>
      <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
    </footer>
  </main>;
}
