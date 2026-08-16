import { createFileRoute } from "@tanstack/react-router";
import { Atom } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  slug: "exams/jee",
  eyebrow: "JEE Main & Advanced",
  title: "JEE Preparation",
  headline: "Prepare for JEE Main and JEE Advanced with a cohort, not alone",
  subhead:
    "Join the ClassLab JEE cohort: Physics, Chemistry and Maths study groups, shared notes, synced lecture watch parties, focus tracking and a countdown to your attempt.",
  overview:
    "ClassLab is a free study campus built for Indian exam aspirants. When you sign up and pick JEE as your target exam, ClassLab sets up your prep profile — attempt year, daily study capacity, prep stage and weak subjects — then places you in the JEE community, seeds a countdown to your exam date and personalises the AI study assistant around your syllabus. From there you study with other aspirants: subject-wise groups for Physics, Physical and Organic Chemistry, and Mathematics, shared notes and PYQ discussions, YouTube lecture playlists you can mark complete, and watch parties where a whole group watches the same lecture in sync.",
  icon: Atom,
  features: [
    { title: "Physics, Chemistry & Maths groups", desc: "Subject-wise study groups where aspirants solve doubts and share approaches to tough problems." },
    { title: "Shared notes and PYQ threads", desc: "Post formula sheets, derivations and previous-year question discussions the whole cohort can search." },
    { title: "Synced lecture watch parties", desc: "Watch the same coaching or YouTube lecture together, paused and played in sync, with live chat." },
    { title: "Lecture playlists with progress", desc: "Track a full JEE playlist, mark each lecture complete and see how much of the syllabus is done." },
    { title: "Focus tracking", desc: "Punch in when you study, track daily hours and see your focus score against your own target." },
    { title: "JEE countdown", desc: "A live countdown to JEE Main and Advanced so every week of prep has a deadline attached." },
    { title: "Mind maps and roadmaps", desc: "Build a chapter-wise roadmap on an infinite canvas and drag lecture videos onto it as tasks." },
    { title: "Personalised AI assistant", desc: "An assistant that already knows your attempt year, weak subjects and study pattern before you ask." },
  ],
  steps: [
    { title: "Create a free account", desc: "Sign up with email or Google — it takes under a minute and costs nothing." },
    { title: "Pick JEE in onboarding", desc: "Tell ClassLab your attempt year, daily hours, prep stage and weak subjects." },
    { title: "Study with the cohort", desc: "You land in the JEE community with a countdown, a starter plan and groups to join." },
  ],
  benefits: [
    "Study alongside other JEE aspirants instead of alone",
    "Keep Physics, Chemistry and Maths revision in one place",
    "Turn long lecture playlists into trackable progress",
    "See real daily study hours instead of guessing",
    "Never lose track of how many days are left to your attempt",
    "Completely free for students",
  ],
  faqs: [
    { q: "Is ClassLab free for JEE aspirants?", a: "Yes. Creating an account, joining the JEE community, study groups, watch parties and focus tracking are all free." },
    { q: "Does ClassLab teach the JEE syllabus?", a: "ClassLab is not a coaching institute. It is the place where you study — with peers, your own material and any lectures you already follow — while tracking progress against your attempt date." },
    { q: "Can I prepare for JEE Main and Advanced together?", a: "Yes. Set your attempt year during onboarding and keep separate countdowns and groups for Main and Advanced." },
    { q: "Can I study with people from my own coaching batch?", a: "Yes. Create a private group or club, invite your batchmates, and run your own watch parties and discussions inside it." },
    { q: "What if I switch to another exam later?", a: "Your prep profile is editable at any time from Settings, and communities update to match your new target exam." },
  ],
  related: [
    { label: "Exam Prep", to: "/exam-prep" },
    { label: "Study Groups", to: "/study-groups" },
    { label: "Notes Sharing", to: "/notes-sharing" },
    { label: "Watch Party", to: "/watch-party" },
    { label: "AI Study Assistant", to: "/ai-study-assistant" },
  ],
};

export const Route = createFileRoute("/exams/jee")({
  head: () =>
    featureHead(content, {
      metaTitle: "JEE Preparation Online — Study Groups, Notes & Focus Tracking | ClassLab",
      description:
        "Prepare for JEE Main and JEE Advanced with ClassLab: PCM study groups, shared notes, synced lecture watch parties, focus tracking and an exam countdown. Free for students.",
      keywords: "jee preparation, jee advanced, jee main, iit jee study group, jee notes, jee online study",
    }),
  component: JeePage,
});

function JeePage() {
  return <FeaturePage c={content} />;
}
