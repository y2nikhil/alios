import { createFileRoute } from "@tanstack/react-router";
import { Network } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "campus-network",
  "eyebrow": "Campus Network",
  "title": "Campus Network",
  "headline": "Your campus network, finally in one place",
  "subhead": "Connect with classmates, seniors and students from other colleges who are working toward the same goals.",
  "overview": "Campus Network on ClassLab is your student graph: friends, classmates, seniors and peers across colleges. Search anyone by name, username or email, see who is studying right now, and start a conversation. It is professional networking without the noise, built specifically for student life.",
  "features": [
    {
      "title": "Smart search",
      "desc": "Find people by name, username or email with instant suggestions."
    },
    {
      "title": "Live presence",
      "desc": "See who is studying or in a room right now."
    },
    {
      "title": "Friend requests",
      "desc": "Build a network you actually know and trust."
    },
    {
      "title": "Cross-college reach",
      "desc": "Connect beyond your own campus."
    },
    {
      "title": "Profiles",
      "desc": "See goals, exams and shared communities at a glance."
    },
    {
      "title": "Privacy first",
      "desc": "Control what your profile reveals."
    }
  ],
  "steps": [
    {
      "title": "Set up your profile",
      "desc": "Add your college, exam and interests."
    },
    {
      "title": "Find people",
      "desc": "Search or browse suggestions from your communities."
    },
    {
      "title": "Stay connected",
      "desc": "Chat, study together and keep up with each other's progress."
    }
  ],
  "benefits": [
    "Meet peers preparing for the same exam",
    "Get guidance from seniors who have done it",
    "Study partners are one search away",
    "Cross-college reach, not just your class",
    "Strong privacy controls",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "How do I find someone?",
      "a": "Search their name, username or email, or type @ for suggestions."
    },
    {
      "q": "Can I control my visibility?",
      "a": "Yes, profile visibility is configurable in settings."
    },
    {
      "q": "Can I connect across colleges?",
      "a": "Yes, the network is open across campuses."
    },
    {
      "q": "Is it free?",
      "a": "Yes, completely free for students."
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
    }
  ]
} as unknown as FeaturePageContent;
content.icon = Network;

export const Route = createFileRoute("/campus-network")({
  head: () =>
    featureHead(content, {
      metaTitle: "Campus Network | ClassLab",
      description: "Discover the Campus Network feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "campus networking, peer learning, college students, university students, collaboration",
    }),
  component: CampusNetworkPage,
});

function CampusNetworkPage() {
  return <FeaturePage c={content} />;
}
