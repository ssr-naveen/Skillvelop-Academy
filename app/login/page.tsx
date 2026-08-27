import { getChatGPTUser, safeRelativeReturnPath } from "@/app/chatgpt-auth";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Poppins } from "next/font/google";
import Image from "next/image";
import { ArrowRight, BookOpen, GraduationCap, Lightbulb, LockKeyhole, Mail, ShieldCheck, TrendingUp, Video } from "lucide-react";
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

const chips = [
  { icon: Video, label: "Live 1:1 classes" },
  { icon: BookOpen, label: "Guided curriculum" },
  { icon: TrendingUp, label: "Tracked progress" },
];

const dots = [
  { left: "7%", bottom: "12%", size: 5, duration: 15, delay: 0 },
  { left: "19%", bottom: "4%", size: 3, duration: 19, delay: 3 },
  { left: "28%", bottom: "26%", size: 4, duration: 17, delay: 6 },
  { left: "38%", bottom: "8%", size: 6, duration: 22, delay: 1.5 },
  { left: "47%", bottom: "34%", size: 3, duration: 16, delay: 8 },
  { left: "56%", bottom: "16%", size: 4, duration: 20, delay: 4 },
  { left: "12%", bottom: "48%", size: 3, duration: 18, delay: 10 },
  { left: "33%", bottom: "58%", size: 4, duration: 23, delay: 7 },
  { left: "62%", bottom: "44%", size: 3, duration: 21, delay: 2 },
  { left: "50%", bottom: "62%", size: 5, duration: 25, delay: 12 },
];

const glyphs = [
  { icon: GraduationCap, left: "9%", top: "22%", size: 46, duration: 13, delay: 0 },
  { icon: BookOpen, left: "44%", top: "68%", size: 38, duration: 16, delay: 2.5 },
  { icon: Lightbulb, left: "31%", top: "12%", size: 32, duration: 15, delay: 5 },
];
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  const params = await searchParams;
  const user = await getChatGPTUser();
  const returnTo = safeRelativeReturnPath(params.returnTo || "/dashboard");
  const origin = await siteOrigin();
  const initials = user ? user.displayName.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() : "";

  return <main className={`${poppins.variable} ${styles.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(origin)).replace(/</g, "\\u003c") }}/>

    <div className={styles.scene} aria-hidden="true"/>
    <div className={styles.particles} aria-hidden="true">
      {dots.map((dot, index) => <span key={index} className={styles.dot} style={{ left: dot.left, bottom: dot.bottom, width: dot.size, height: dot.size, animationDuration: `${dot.duration}s`, animationDelay: `${dot.delay}s` }}/>)}
      {glyphs.map(({ icon: Icon, left, top, size, duration, delay }, index) => <span key={index} className={styles.glyph} style={{ left, top, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}><Icon size={size} strokeWidth={1}/></span>)}
    </div>

    <header className={styles.topbar}>
      <a className={styles.brand} href="/" aria-label="Skillvelop Academy home">
        <span className={styles.brandMark}><Image src="/skillvelop-logo.png" alt="Skillvelop Academy" width={127} height={71} priority unoptimized/></span>
        <span className={styles.brandNote}><strong>Skillvelop Academy</strong>Learning management system</span>
      </a>
      <span className={styles.securePill}><ShieldCheck size={15}/><span>Secure, role-based access</span></span>
    </header>

    <section className={styles.stage}>
      <div className={styles.intro}>
        <span className={styles.eyebrow}><span className={styles.live}/> Live 1:1 learning</span>
        <h1>Your next class is <em>ready</em> when you are.</h1>
        <p className={styles.lead}>Live teaching, coursework and feedback in one workspace.</p>
        <div className={styles.chips}>
          {chips.map(({ icon: Icon, label }) => <span className={styles.chip} key={label}><Icon size={15}/>{label}</span>)}
        </div>
      </div>

      <div className={styles.card}>
        <span className={styles.cardKicker}>Welcome back</span>
        <h2>{user ? `Continue as ${user.displayName}` : "Sign in to Skillvelop"}</h2>
        <p className={styles.cardIntro}>{user ? "Your workspace is ready. Continue securely to your dashboard." : "Use the account your academy administrator issued you."}</p>

        {params.error && <div className={styles.error} role="alert"><LockKeyhole size={15}/> The username or password is incorrect.</div>}

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

        <p className={styles.support}>Accounts are created by your administrator. <a href={`mailto:${supportEmail}`}>Need help?</a></p>
      </div>
    </section>

    <footer className={styles.footer}>
      <span>© {new Date().getFullYear()} Skillvelop Academy</span>
      <span className={styles.footerTrust}><ShieldCheck size={12}/> Encrypted, role-based access</span>
      <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
    </footer>
  </main>;
}
