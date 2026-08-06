import { createFileRoute } from "@tanstack/react-router";
import { Code } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "coding-rooms",
  "eyebrow": "Coding Rooms",
  "title": "Coding Rooms",
  "headline": "Coding rooms for focused, social practice",
  "subhead": "Sit down with other students, work through problems and stay accountable in a live coding room.",
  "overview": "Coding Rooms on ClassLab are focused sessions where students code alongside each other. Share what you are working on, discuss approaches in the room chat, follow along with a tutorial together, and track the focus time you put in. It is body-doubling for programmers — the accountability of a lab, from anywhere.",
  "features": [
    {
      "title": "Live rooms",
      "desc": "Join a session with other students who are coding now."
    },
    {
      "title": "Focus tracking",
      "desc": "Your session time counts toward your study goals."
    },
    {
      "title": "Room chat",
      "desc": "Ask for a hint or share an approach."
    },
    {
      "title": "Tutorial along",
      "desc": "Play a coding tutorial in sync with the room."
    },
    {
      "title": "Topic rooms",
      "desc": "DSA, web, ML and language-specific sessions."
    },
    {
      "title": "Streaks",
      "desc": "Build a consistent daily practice."
    }
  ],
  "steps": [
    {
      "title": "Join a room",
      "desc": "Pick a topic room that matches your practice plan."
    },
    {
      "title": "Set your intent",
      "desc": "Say what you will work on this session."
    },
    {
      "title": "Code and track",
      "desc": "Work through it and log the focus time."
    }
  ],
  "benefits": [
    "Beat procrastination with live accountability",
    "Learn approaches from peers in the room",
    "Consistent daily practice, tracked automatically",
    "No setup — join from the browser",
    "Topic-specific rooms keep sessions relevant",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Do I need to share my screen?",
      "a": "No, screen sharing is not required to join a room."
    },
    {
      "q": "Does room time count toward my goals?",
      "a": "Yes, focus time in a room is tracked to your study stats."
    },
    {
      "q": "Which topics have rooms?",
      "a": "DSA, web development, machine learning and language-specific practice."
    },
    {
      "q": "Is it beginner friendly?",
      "a": "Yes, rooms welcome all levels."
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
content.icon = Code;

export const Route = createFileRoute("/coding-rooms")({
  head: () =>
    featureHead(content, {
      metaTitle: "Coding Rooms | ClassLab",
      description: "Discover the Coding Rooms feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "coding study rooms, peer learning, college students, university students, collaboration",
    }),
  component: CodingRoomsPage,
});

function CodingRoomsPage() {
  return <FeaturePage c={content} />;
}
