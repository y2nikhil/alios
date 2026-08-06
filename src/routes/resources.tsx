import { createFileRoute } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "resources",
  "eyebrow": "Resources",
  "title": "Resources",
  "headline": "A curated library of student resources",
  "subhead": "Notes, playlists, past papers, cheat sheets and tools — recommended by students who have already used them.",
  "overview": "Resources on ClassLab is a community-curated library. Instead of searching endlessly, browse material that other students in your exam or subject community have actually found useful. Save resources to your own list, attach them to a study plan and share the best ones back with your group.",
  "features": [
    {
      "title": "Community curated",
      "desc": "Material recommended by students on the same path."
    },
    {
      "title": "Organised by exam and subject",
      "desc": "Filter to exactly what you need."
    },
    {
      "title": "Save for later",
      "desc": "Build a personal reading and watching list."
    },
    {
      "title": "Attach to plans",
      "desc": "Link a resource to a task or mind map node."
    },
    {
      "title": "Playlists",
      "desc": "Structured video sequences instead of random links."
    },
    {
      "title": "Contribute",
      "desc": "Share what helped you and help the next batch."
    }
  ],
  "steps": [
    {
      "title": "Pick your track",
      "desc": "Select your exam or subject."
    },
    {
      "title": "Browse",
      "desc": "Explore what the community recommends."
    },
    {
      "title": "Save and study",
      "desc": "Add resources to your plan and work through them."
    }
  ],
  "benefits": [
    "Skip hours of searching for good material",
    "Trustworthy recommendations from peers",
    "Everything linked to your actual study plan",
    "Contribute back and build reputation",
    "Accessible on any device",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Who adds the resources?",
      "a": "Students and community moderators contribute and curate them."
    },
    {
      "q": "Can I save resources?",
      "a": "Yes, save anything to your personal list."
    },
    {
      "q": "Are resources free?",
      "a": "The library links to free material wherever possible."
    },
    {
      "q": "Can I suggest a resource?",
      "a": "Yes, any student can contribute."
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
content.icon = Library;

export const Route = createFileRoute("/resources")({
  head: () =>
    featureHead(content, {
      metaTitle: "Resources | ClassLab",
      description: "Discover the Resources feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "student resources, peer learning, college students, university students, collaboration",
    }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return <FeaturePage c={content} />;
}
