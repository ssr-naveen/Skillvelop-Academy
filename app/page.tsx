import Image from "next/image";
import { BadgeCheck, MapPin } from "lucide-react";
import { all } from "@/db/lms";

const tracks = [
  { icon: "Aa", tone: "coral", title: "Product Design", description: "Research, wireframe and ship thoughtful digital products.", meta: "8 weeks · 24 projects" },
  { icon: "</>", tone: "blue", title: "Full-Stack Development", description: "Build modern web apps from interface to deployment.", meta: "12 weeks · 32 projects" },
  { icon: "↗", tone: "green", title: "Growth Marketing", description: "Turn sharp strategy into measurable, sustainable growth.", meta: "6 weeks · 18 projects" },
];

const steps = [
  ["01", "Choose your path", "Start with a focused roadmap built around the role you want."],
  ["02", "Learn by building", "Practice each concept in guided, portfolio-ready projects."],
  ["03", "Get expert feedback", "Improve faster with mentor reviews and an ambitious community."],
];

type PublicTutor={public_id:string;name:string;headline:string;specialties:string;location:string;avatar_r2_key:string};
export const dynamic="force-dynamic";
export default async function Home() {
  let tutors:PublicTutor[]=[];try{tutors=await all<PublicTutor>(`SELECT u.public_id,u.name,p.headline,p.specialties,p.location,p.avatar_r2_key FROM users u JOIN user_profiles p ON p.user_id=u.id WHERE u.role='tutor' AND u.status='active' AND p.is_public=1 AND u.public_id IS NOT NULL ORDER BY p.updated_at DESC LIMIT 6`);}catch{}
  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand brand-logo-shell" href="#top" aria-label="Skillvelop Academy home"><Image src="/skillvelop-logo.png" alt="Skillvelop" width={140} height={93} priority unoptimized /></a>
        <div className="nav-links"><a href="#paths">Learning paths</a><a href="#method">How it works</a>{tutors.length>0&&<a href="#tutors">Our tutors</a>}<a href="#stories">Success stories</a></div>
        <a className="button button-small button-dark" href="/login">LMS login <span>↗</span></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> Career skills, taught differently</div>
          <h1>Don&apos;t just learn.<br /><em>Skillvelop.</em></h1>
          <p className="hero-lede">Build practical, job-ready skills through guided projects, expert mentorship and a community that keeps you moving.</p>
          <div className="hero-actions"><a className="button button-primary" href="/login">Enter Skillvelop LMS <span>→</span></a><a className="text-link" href="#method"><span className="play">▶</span> See how it works</a></div>
          <div className="learner-proof"><div className="avatars" aria-hidden="true"><span>NK</span><span>AS</span><span>JM</span><span>+</span></div><p><strong>4.9/5</strong> from 2,000+ growing professionals</p></div>
        </div>

        <div className="hero-visual" aria-label="Sample learner dashboard">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="dashboard-card">
            <div className="dash-head"><div><span className="dash-label">YOUR LEARNING PATH</span><h2>Product Designer</h2></div><span className="mini-avatar">NS</span></div>
            <div className="progress-row"><span>Overall progress</span><strong>68%</strong></div><div className="progress"><span /></div>
            <div className="lesson-card active-lesson"><span className="lesson-icon">✦</span><div><small>UP NEXT · 12 MIN</small><strong>Designing with hierarchy</strong></div><span className="round-arrow">→</span></div>
            <div className="lesson-card"><span className="lesson-icon pale">✓</span><div><small>COMPLETED</small><strong>Foundations of visual design</strong></div><span className="score">92</span></div>
            <div className="dash-footer"><span>🔥 7 day streak</span><span>12 projects shipped</span></div>
          </div>
          <div className="floating-card mentor-card"><span className="mentor-face">MR</span><div><small>MENTOR FEEDBACK</small><strong>“Great improvement!”</strong></div></div>
          <div className="floating-card badge-card"><span>🏆</span><div><small>NEW BADGE</small><strong>Design Thinker</strong></div></div>
        </div>
      </section>

      <section className="trust-strip"><div className="shell trust-inner"><p>Skills built for where work is going</p><div className="trust-items" aria-label="Learning benefits"><span>● Project-first</span><span>✦ Mentor reviewed</span><span>◎ Career focused</span><span>↗ Always current</span></div></div></section>

      <section className="section shell" id="paths">
        <div className="section-heading"><div><span className="kicker">LEARNING PATHS</span><h2>Pick a direction.<br />Build real momentum.</h2></div><p>Focused programs designed with industry experts and built around the work employers actually value.</p></div>
        <div className="track-grid">{tracks.map((track, index) => <article className="track-card" key={track.title}><div className={`track-icon ${track.tone}`}>{track.icon}</div><span className="track-number">0{index + 1}</span><h3>{track.title}</h3><p>{track.description}</p><div className="track-meta"><span>{track.meta}</span><span className="track-arrow">↗</span></div></article>)}</div>
        <div className="center-action"><a className="button button-outline" href="#start">View all learning paths <span>→</span></a></div>
      </section>

      <section className="method-section" id="method"><div className="shell method-grid"><div className="method-copy"><span className="kicker kicker-light">THE SKILLVELOP METHOD</span><h2>Real skills come<br />from <em>doing.</em></h2><p>No endless playlists. Every lesson moves you toward something tangible—a project, a stronger portfolio and a clearer next step.</p><a className="button button-light" href="#start">Our learning approach <span>→</span></a></div><div className="steps">{steps.map(([number, title, description]) => <div className="step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div></div></section>

      {tutors.length>0&&<section className="section shell portal-tutors" id="tutors"><div className="section-heading"><div><span className="kicker">LIVE 1:1 EDUCATORS</span><h2>Meet the people<br/>behind the progress.</h2></div><p>Verified tutors with permanent Skillvelop teaching identities and learning experiences shaped around each student.</p></div><div className="portal-tutor-grid">{tutors.map(tutor=><a href={`/tutors/${tutor.public_id}`} key={tutor.public_id}><div className="portal-tutor-photo">{tutor.avatar_r2_key?<img src={`/api/profile-photo/${tutor.public_id}`} alt={tutor.name}/>:<span>{tutor.name.split(/\s+/).map(part=>part[0]).join('').slice(0,2)}</span>}<i><BadgeCheck size={18}/></i></div><small><MapPin size={14}/>{tutor.location||'Online worldwide'}</small><h3>{tutor.name}</h3><p>{tutor.headline||tutor.specialties||'Dedicated live 1:1 Skillvelop tutor'}</p><strong>View teaching profile →</strong></a>)}</div></section>}

      <section className="section shell outcomes" id="stories">
        <div className="outcome-quote"><span className="quote-mark">“</span><blockquote>Skillvelop made learning feel like real work—in the best way. I stopped collecting courses and started building a career.</blockquote><div className="quote-person"><span>AP</span><p><strong>Ananya Patel</strong><small>Associate Product Designer</small></p></div></div>
        <div className="outcome-stats"><div><strong>87%</strong><span>finish their chosen learning path</span></div><div><strong>3.2×</strong><span>more projects shipped than video-only courses</span></div><div><strong>42</strong><span>expert mentors across every discipline</span></div><p>Based on early learner cohorts and platform benchmarks.</p></div>
      </section>

      <section className="cta-section shell" id="start"><div className="cta-copy"><span className="kicker">YOUR NEXT CHAPTER</span><h2>Ready to build<br />what&apos;s next?</h2></div><div className="cta-action"><p>Learn live with a dedicated tutor, complete meaningful work and see your progress in one place.</p><a className="button button-primary" href="/login">Open the learning platform <span>→</span></a><small>Secure access for students, tutors and administrators.</small></div></section>

      <footer className="footer shell"><a className="brand brand-logo-shell" href="#top" aria-label="Skillvelop Academy home"><Image src="/skillvelop-logo.png" alt="Skillvelop" width={140} height={93} unoptimized /></a><p>Learn with purpose. Build with confidence.</p><div><a href="#paths">Paths</a><a href="#method">Method</a><a href="mailto:hello@skillvelop.com">Contact</a></div><span>© 2026 Skillvelop Academy</span></footer>
    </main>
  );
}
