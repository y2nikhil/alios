import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "student-chat",
  "eyebrow": "Student Chat",
  "title": "Student Chat",
  "headline": "A chat app built for students, not offices",
  "subhead": "Direct messages, group threads, polls, files and mentions — a clean, distraction-free chat made for coursework and campus life.",
  "overview": "Student Chat on ClassLab gives you organised conversations for every part of student life: one-to-one DMs, subject groups, project rooms and campus-wide channels. Share notes and files, run quick polls before a group decision, react to messages and mention classmates so nothing important is missed. Moderation tools keep the space safe and on-topic.",
  "features": [
    {
      "title": "Direct messages",
      "desc": "Private one-to-one conversations with anyone on your campus network."
    },
    {
      "title": "Group threads",
      "desc": "Dedicated rooms for subjects, projects and clubs."
    },
    {
      "title": "File and note sharing",
      "desc": "Send PDFs, images and study material inline."
    },
    {
      "title": "Polls",
      "desc": "Settle a meeting time or topic in seconds."
    },
    {
      "title": "Mentions and reactions",
      "desc": "Pull the right person in and respond without typing."
    },
    {
      "title": "Reporting and moderation",
      "desc": "Flag content and let moderators act quickly."
    }
  ],
  "steps": [
    {
      "title": "Create your profile",
      "desc": "Sign up and pick a username your classmates can find."
    },
    {
      "title": "Find your people",
      "desc": "Search by name, username or email and start a chat."
    },
    {
      "title": "Start collaborating",
      "desc": "Open a group for each subject or project and keep it all in one place."
    }
  ],
  "benefits": [
    "All coursework conversation in one searchable place",
    "Far less noise than general-purpose messaging apps",
    "Share study material without leaving the thread",
    "Built-in moderation and reporting",
    "Works across desktop, tablet and mobile",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Is Student Chat private?",
      "a": "Direct messages are private between participants, and group access is controlled by group members."
    },
    {
      "q": "Can I share files?",
      "a": "Yes — PDFs, images and notes can be attached directly to any conversation."
    },
    {
      "q": "How do I find classmates?",
      "a": "Search by name, username or email, or type @ to see suggestions."
    },
    {
      "q": "What if someone misbehaves?",
      "a": "Report the message and campus moderators will review it."
    }
  ],
  "related": [
    {
      "label": "Watch Party",
      "to": "/watch-party"
    },
    {
      "label": "Study Groups",
      "to": "/study-groups"
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
content.icon = MessageSquare;

export const Route = createFileRoute("/student-chat")({
  head: () =>
    featureHead(content, {
      metaTitle: "Student Chat | ClassLab",
      description: "Discover the Student Chat feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "student chat app, peer learning, college students, university students, collaboration",
    }),
  component: StudentChatPage,
});

function StudentChatPage() {
  return <FeaturePage c={content} />;
}
