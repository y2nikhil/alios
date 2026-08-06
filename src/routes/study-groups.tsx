import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "study-groups",
  "eyebrow": "Study Groups",
  "title": "Study Groups",
  "headline": "Online study groups that actually keep going",
  "subhead": "Create a group, set a shared goal, track focus time together and keep each other accountable through the semester.",
  "overview": "Study Groups on ClassLab combine chat, shared tasks, focus tracking and a group calendar in one space. Every member's study sessions roll up into a group view, so progress is visible and motivating. Set weekly goals, split revision topics into tasks, and see who is currently studying in real time.",
  "features": [
    {
      "title": "Shared goals",
      "desc": "Set a weekly focus target the whole group works toward."
    },
    {
      "title": "Live presence",
      "desc": "See who is studying right now and join them."
    },
    {
      "title": "Group tasks",
      "desc": "Split the syllabus into assignable, trackable tasks."
    },
    {
      "title": "Group chat",
      "desc": "Discuss, ask doubts and share resources in one thread."
    },
    {
      "title": "Session history",
      "desc": "Review how much the group studied each week."
    },
    {
      "title": "Open or invite-only",
      "desc": "Run a private circle or a public group anyone can join."
    }
  ],
  "steps": [
    {
      "title": "Create a group",
      "desc": "Name it, pick a subject or exam, and set your goal."
    },
    {
      "title": "Invite members",
      "desc": "Share an invite or let classmates request to join."
    },
    {
      "title": "Study and track",
      "desc": "Punch in your focus sessions and watch group progress build."
    }
  ],
  "benefits": [
    "Accountability that keeps you consistent",
    "Clear visibility of who is doing what",
    "Less time coordinating, more time studying",
    "Motivation from seeing peers actively studying",
    "Everything in one place instead of five apps",
    "Free for every student"
  ],
  "faqs": [
    {
      "q": "How many people can be in a study group?",
      "a": "Groups scale from a two-person pair to a full class cohort."
    },
    {
      "q": "Can I join more than one group?",
      "a": "Yes, you can be part of as many groups as you need."
    },
    {
      "q": "Is my study data private?",
      "a": "Focus data is shared with your group only, and you control your profile visibility."
    },
    {
      "q": "Can I make a group private?",
      "a": "Yes, groups can be invite-only."
    }
  ],
  "related": [
    {
      "label": "Watch Party",
      "to": "/watch-party"
    },
    {
      "label": "Student Chat",
      "to": "/student-chat"
    },
    {
      "label": "Communities",
      "to": "/communities"
    },
    {
      "label": "Notes Sharing",
      "to": "/notes-sharing"
    },
    {
      "label": "College Clubs",
      "to": "/college-clubs"
    }
  ]
} as unknown as FeaturePageContent;
content.icon = Users;

export const Route = createFileRoute("/study-groups")({
  head: () =>
    featureHead(content, {
      metaTitle: "Study Groups | ClassLab",
      description: "Discover the Study Groups feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "online study groups, peer learning, college students, university students, collaboration",
    }),
  component: StudyGroupsPage,
});

function StudyGroupsPage() {
  return <FeaturePage c={content} />;
}
