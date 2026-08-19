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
  "audience": [
    {
      "title": "Exam aspirants",
      "desc": "Skip the search. Browse only what students who cleared your exam actually used, ranked by upvotes from your community."
    },
    {
      "title": "Subject strugglers",
      "desc": "Stuck on one topic? Pull the three best explanations for it into a saved list and work through them in a focus session."
    },
    {
      "title": "Note makers",
      "desc": "Share your material, get feedback, and build karma that makes your future posts more visible."
    }
  ],
  "deepDive": [
    {
      "heading": "Curation beats collection",
      "paragraphs": [
        "A folder with 400 PDFs is not a resource library, it is a backlog. ClassLab ranks material by what students in the same exam or subject community actually voted useful, so the top of the list is the shortlist you would have built after weeks of trial and error.",
        "Every resource carries its context \u2014 which exam, which topic, which year it was useful for \u2014 so outdated material naturally sinks."
      ]
    },
    {
      "heading": "From a saved link to a study session",
      "paragraphs": [
        "Saving something is not studying it. Attach a resource to a task or to a mind-map node, and it appears in your plan on the day you intended to use it.",
        "Video playlists can be checked off as you complete them, and time spent is logged against your daily focus goal automatically."
      ]
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
      pageType: "CollectionPage",
      keywords: "student resources, peer learning, college students, university students, collaboration",
    }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return <FeaturePage c={content} />;
}
