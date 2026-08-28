import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft, CalendarDays, Globe2, Mail, ShieldCheck } from "lucide-react";
import styles from "./Contact.module.css";

export const metadata: Metadata = {
  title: "Contact Skillvelop Academy",
  description: "Contact Skillvelop Academy for learning, account and class support.",
};

export default function ContactPage() {
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="Contact page navigation">
      <a className={styles.brand} href="/login"><Image src="/skillvelop-logo.png" alt="Skillvelop" width={150} height={100} priority unoptimized/></a>
      <a className={styles.back} href="/login"><ArrowLeft size={16}/> Back to login</a>
    </nav>
    <section className={styles.hero}>
      <div className={styles.intro}><span className={styles.kicker}>CONTACT &amp; SUPPORT</span><h1>We’re here to keep learning moving.</h1><p>For account access, course guidance, class scheduling or platform support, contact the Skillvelop team through the channels below.</p><div className={styles.trust}><ShieldCheck size={17}/><span>Support for learners, parents, tutors and academy staff</span></div></div>
      <div className={styles.cards}>
        <a className={styles.card} href="mailto:support@skillvelop.com"><span><Mail size={20}/></span><div><small>EMAIL SUPPORT</small><strong>support@skillvelop.com</strong><p>Account, course, class and platform enquiries</p></div></a>
        <a className={styles.card} href="/book-demo"><span><CalendarDays size={20}/></span><div><small>DEMO CLASSES</small><strong>Schedule an online demo</strong><p>Choose a curriculum, tutor and timezone-safe slot</p></div></a>
      </div>
    </section>
    <section className={styles.location}>
      <div><span><Globe2 size={20}/></span><div><small>SERVICE ADDRESS</small><h2>Skillvelop Academy</h2></div></div>
      <address><span>Online learning operations</span><span>India</span><span>Serving learners worldwide</span></address>
    </section>
    <footer className={styles.footer}><span>© 2026 Skillvelop Academy</span><span>Global online learning · timezone-aware support</span></footer>
  </main>;
}

