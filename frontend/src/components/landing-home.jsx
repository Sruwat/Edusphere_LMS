import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarRange,
  CheckCircle2,
  GraduationCap,
  LibraryBig,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import "./landing-home.css";

const audiences = [
  {
    title: "Schools and colleges",
    description:
      "Centralize academic delivery, communication, assessments, attendance, and reporting in one digital campus.",
  },
  {
    title: "Coaching institutes",
    description:
      "Run high-intensity learning programs with live classes, assignments, tests, AI support, and student progress tracking.",
  },
  {
    title: "Academies and training teams",
    description:
      "Deliver modern programs with structured content, learner engagement tools, and operational visibility.",
  },
];

const highlights = [
  {
    icon: BrainCircuit,
    title: "AI Tutor",
    text: "Help students understand concepts faster with guided explanations, doubt solving, and revision support.",
  },
  {
    icon: MessageSquareText,
    title: "AI Chatbot",
    text: "Provide a conversational support layer that makes the LMS feel active, modern, and intelligent.",
  },
  {
    icon: Video,
    title: "Live Classes",
    text: "Schedule, join, and manage live sessions without sending users across multiple disconnected tools.",
  },
  {
    icon: LibraryBig,
    title: "Digital Library",
    text: "Organize academic content, resources, uploads, and access history in one elegant resource hub.",
  },
  {
    icon: CalendarRange,
    title: "Tests and Assignments",
    text: "Run evaluations, monitor deadlines, manage submissions, and keep academic accountability visible.",
  },
  {
    icon: ShieldCheck,
    title: "Admin Control",
    text: "Track attendance, announcements, notifications, platform activity, and institutional operations from one place.",
  },
];

const workflow = [
  {
    number: "01",
    title: "Create programs and publish learning",
    text: "Set up courses, lectures, resources, live sessions, tests, and assignments through one coordinated academic workspace.",
  },
  {
    number: "02",
    title: "Guide learners with AI and structure",
    text: "Students learn through clear dashboards, content flow, submission systems, notifications, and on-demand AI support.",
  },
  {
    number: "03",
    title: "Track outcomes with operational clarity",
    text: "Educators and admins monitor attendance, activity, engagement, alerts, and performance from role-aware dashboards.",
  },
];

const featureList = [
  "Course publishing, enrollment, lecture delivery, and learner progress",
  "AI Tutor and AI Chatbot integrated into the learning experience",
  "Live classes, events, schedules, and time-aware academic coordination",
  "Assignments, tests, submissions, grading flows, and evaluation workflows",
  "Digital library, smart resources, uploads, and content access management",
  "Attendance, announcements, notifications, analytics, and role-based dashboards",
];

export function LandingHome() {
  return (
    <div className="landing-home">
      <div className="landing-orb landing-orb-a" />
      <div className="landing-orb landing-orb-b" />
      <div className="landing-grid" />

      <div className="landing-shell">
        <header className="landing-header">
          <div className="landing-brand">
            <div className="landing-brand-mark">
              <GraduationCap size={24} />
            </div>
            <div>
              <div className="landing-brand-name">Aiwana Edusphere LMS</div>
              <div className="landing-brand-subtitle">AI-powered academic operating system</div>
            </div>
          </div>

          <nav className="landing-nav">
            <a href="#features">Features</a>
            <a href="#audience">Who It Helps</a>
            <a href="#workflow">How It Works</a>
          </nav>

          <div className="landing-header-actions">
            <Link to="/login" className="landing-btn landing-btn-ghost">
              Sign In
            </Link>
            <Link to="/login" className="landing-btn landing-btn-primary">
              Sign Up
            </Link>
          </div>
        </header>

        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-badge">
              <Sparkles size={16} />
              Premium LMS for modern institutions
            </div>

            <h1>
              The violet-and-white academic platform that explains the whole product before users even log in.
            </h1>

            <p>
              Aiwana Edusphere LMS is built for schools, colleges, coaching institutes, academies, and training organizations
              that want courses, live classes, tests, assignments, notifications, analytics, digital resources, AI Tutor,
              and AI Chatbot support in one clean and advanced learning system.
            </p>

            <div className="landing-hero-actions">
              <Link to="/login" className="landing-btn landing-btn-primary landing-btn-large">
                Explore The Platform
                <ArrowRight size={16} />
              </Link>
              <a href="#features" className="landing-btn landing-btn-ghost landing-btn-large">
                See All Features
              </a>
            </div>

            <div className="landing-stat-row">
              <div className="landing-stat">
                <strong>3</strong>
                <span>Core roles</span>
              </div>
              <div className="landing-stat">
                <strong>10+</strong>
                <span>Academic systems</span>
              </div>
              <div className="landing-stat">
                <strong>24/7</strong>
                <span>AI-supported help</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="hero-window hero-window-main">
              <div className="hero-window-top">
                <span />
                <span />
                <span />
              </div>
              <div className="hero-dashboard-grid">
                <div className="hero-panel hero-panel-xl">
                  <div className="hero-panel-kicker">Academic Overview</div>
                  <h3>One dashboard for learning, AI support, attendance, and academic operations.</h3>
                  <div className="hero-bars">
                    <div />
                    <div />
                    <div />
                  </div>
                </div>
                <div className="hero-panel">
                  <Bot size={18} />
                  <h4>AI Tutor</h4>
                  <p>Instant concept help and guided learning support.</p>
                </div>
                <div className="hero-panel">
                  <Users size={18} />
                  <h4>Role Views</h4>
                  <p>Student, teacher, and admin workflows in one product.</p>
                </div>
                <div className="hero-panel hero-panel-wide">
                  <div className="hero-mini-chart">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div>
                    <h4>Progress, alerts, and live academic activity</h4>
                    <p>Surface the most important actions and signals without overwhelming the user.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="hero-floating-card hero-floating-left">
              <BrainCircuit size={18} />
              <div>
                <strong>AI-first learning layer</strong>
                <span>Built into the platform, not bolted onto it.</span>
              </div>
            </div>
            <div className="hero-floating-card hero-floating-right">
              <CheckCircle2 size={18} />
              <div>
                <strong>Assessment ready</strong>
                <span>Tests, assignments, submissions, and evaluation flows.</span>
              </div>
            </div>
          </div>
        </section>

        <section id="audience" className="landing-section">
          <div className="landing-section-head">
            <span>Who can use it</span>
            <h2>Made for institutions that need real academic infrastructure, not just a basic course page.</h2>
          </div>

          <div className="landing-card-grid landing-card-grid-3">
            {audiences.map((item) => (
              <article key={item.title} className="landing-card">
                <div className="landing-card-tag">Audience</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="landing-section landing-section-panel">
          <div className="landing-section-head">
            <span>How it works</span>
            <h2>A product flow that is clear enough for first-time users and deep enough for serious institutions.</h2>
          </div>

          <div className="landing-workflow">
            {workflow.map((item) => (
              <article key={item.number} className="workflow-card">
                <div className="workflow-number">{item.number}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="landing-section landing-feature-layout">
          <div className="landing-feature-story">
            <div className="landing-section-head left">
              <span>What is inside</span>
              <h2>Everything the landing page should communicate about the LMS, fully and clearly.</h2>
            </div>

            <p className="landing-story-text">
              Aiwana Edusphere LMS is designed to help institutions manage teaching, learning, evaluation, communication, and
              student support in one unified platform. Instead of separating the learning experience across multiple
              tools, it keeps the academic journey connected from the first login to ongoing daily operations.
            </p>

            <div className="landing-feature-list">
              {featureList.map((item) => (
                <div key={item} className="landing-feature-list-item">
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-card-grid landing-card-grid-2">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="landing-card landing-card-feature">
                  <div className="landing-icon-chip">
                    <Icon size={18} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="landing-section landing-proof-band">
          <div className="landing-proof-copy">
            <span className="landing-proof-label">Why this design works</span>
            <h2>Premium, clean, product-led, and focused on clarity.</h2>
            <p>
              The page now acts as a real front door for the LMS: it explains what the platform is, who it serves, how
              it works, and why features like AI Tutor, AI Chatbot, assessments, and digital resource management matter.
            </p>
          </div>

          <div className="landing-proof-points">
            <div>Strong product story before authentication</div>
            <div>Better CTA visibility with separate sign in and sign up access</div>
            <div>Modern SaaS-style layout with a premium hero and bento-inspired information blocks</div>
            <div>Violet and white visual language with a more polished and memorable identity</div>
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-cta-card">
            <div className="landing-badge">
              <Sparkles size={16} />
              Ready to continue
            </div>
            <h2>Read the story, understand the LMS, then continue to sign in or sign up.</h2>
            <p>
              The home page now gives the full product overview. The auth page remains separate and focused on access.
            </p>
            <div className="landing-hero-actions centered">
              <Link to="/login" className="landing-btn landing-btn-primary landing-btn-large">
                Go To Sign In / Sign Up
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
