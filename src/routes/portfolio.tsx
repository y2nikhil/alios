import { createFileRoute } from "@tanstack/react-router";
import { Award } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "portfolio",
  "eyebrow": "Portfolio",
  "title": "Portfolio",
  "headline": "Build a student portfolio worth sharing",
  "subhead": "Turn your projects, clubs, events and achievements into a profile recruiters can actually read.",
  "overview": "Portfolio on ClassLab automatically reflects what you do on the platform: projects you shipped, clubs you led, events you hosted and milestones you earned. Add your own work, skills and links, and share one clean profile URL in applications instead of a patchwork of documents.",
  "features": [
    {
      "title": "Auto-populated",
      "desc": "Projects, clubs and achievements appear as you do them."
    },
    {
      "title": "Custom sections",
      "desc": "Add your own work, skills and links."
    },
    {
      "title": "Shareable link",
      "desc": "One clean profile URL for applications."
    },
    {
      "title": "Achievements",
      "desc": "Trophies and milestones from your study streaks."
    },
    {
      "title": "Privacy controls",
      "desc": "Choose what is public and what stays private."
    },
    {
      "title": "Mobile-ready",
      "desc": "Looks right on every screen."
    }
  ],
  "steps": [
    {
      "title": "Do the work",
      "desc": "Join clubs, ship projects and study consistently."
    },
    {
      "title": "Curate",
      "desc": "Highlight what matters and hide what does not."
    },
    {
      "title": "Share",
      "desc": "Send your profile link with internship applications."
    }
  ],
  "benefits": [
    "Evidence of what you did, not just claims",
    "Ready when an opportunity appears",
    "Stands out more than a plain resume line",
    "You control visibility",
    "Updates itself as you keep working",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Is my portfolio public?",
      "a": "Only if you choose. You control the visibility of your profile."
    },
    {
      "q": "What appears automatically?",
      "a": "Projects, clubs, events and achievements from your ClassLab activity."
    },
    {
      "q": "Can I add outside work?",
      "a": "Yes, add external projects, skills and links."
    },
    {
      "q": "Can I share it with recruiters?",
      "a": "Yes, via a single profile link."
    }
  ],
  "audience": [
    {
      "title": "Students applying for internships",
      "desc": "Send one link instead of a resume, a Drive folder and three screenshots. Recruiters see shipped work, not claims."
    },
    {
      "title": "Club and society leads",
      "desc": "Events you hosted and teams you ran show up automatically as leadership evidence."
    },
    {
      "title": "Anyone building in public",
      "desc": "A permanent, indexable page at classlab.in/u/yourname that grows every time you finish something."
    }
  ],
  "deepDive": [
    {
      "heading": "A portfolio that fills itself",
      "paragraphs": [
        "The hardest part of a student portfolio is maintaining it. ClassLab solves that by generating it from activity you already do here: projects delivered, events hosted, notes contributed, milestones earned, questions answered in forums.",
        "You keep full control \u2014 add external work, reorder sections, write your own summary, and hide anything you would rather not show."
      ]
    },
    {
      "heading": "Built to be found",
      "paragraphs": [
        "Your profile is a real public page with its own title, description and structured data, so it can be found when someone searches your name alongside your college or skill.",
        "Karma from helpful comments and upvotes on your posts appears on the profile too, which gives a stranger a quick read on whether you actually help other students."
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
content.icon = Award;

export const Route = createFileRoute("/portfolio")({
  head: () =>
    featureHead(content, {
      metaTitle: "Portfolio | ClassLab",
      description: "Discover the Portfolio feature on ClassLab to help students connect, collaborate and grow.",
      pageType: "CollectionPage",
      keywords: "student portfolio, peer learning, college students, university students, collaboration",
    }),
  component: PortfolioPage,
});

function PortfolioPage() {
  return <FeaturePage c={content} />;
}
