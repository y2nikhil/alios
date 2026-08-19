import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "internships",
  "eyebrow": "Internships",
  "title": "Internships",
  "headline": "Find internships that fit where you are",
  "subhead": "Browse student-friendly openings, track your applications and get your profile ready before you apply.",
  "overview": "Internships on ClassLab helps students find and land early-career opportunities. Browse openings suited to your year and skills, use your ClassLab portfolio as your application profile, and track every application in one place so follow-ups never get forgotten.",
  "features": [
    {
      "title": "Curated openings",
      "desc": "Roles suited to students and freshers."
    },
    {
      "title": "Profile-based applying",
      "desc": "Apply with your ClassLab portfolio."
    },
    {
      "title": "Application tracker",
      "desc": "Know exactly where each application stands."
    },
    {
      "title": "Peer insight",
      "desc": "Ask people who interviewed there before you."
    },
    {
      "title": "Alerts",
      "desc": "Get notified when a matching role appears."
    },
    {
      "title": "Prep resources",
      "desc": "Interview material shared by the community."
    }
  ],
  "steps": [
    {
      "title": "Complete your profile",
      "desc": "Fill in skills, projects and achievements."
    },
    {
      "title": "Browse and apply",
      "desc": "Find matching roles and apply in a few clicks."
    },
    {
      "title": "Track and follow up",
      "desc": "Manage every application from one board."
    }
  ],
  "benefits": [
    "Stop losing track of where you applied",
    "A stronger profile built from real work",
    "Insight from peers who interviewed already",
    "Alerts so you apply early",
    "Prep material in the same place",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Is applying free?",
      "a": "Yes, applying through ClassLab is free for students."
    },
    {
      "q": "Do I need a resume?",
      "a": "Your ClassLab portfolio works as your profile; a resume is optional."
    },
    {
      "q": "Are roles verified?",
      "a": "Listings are reviewed before they are published."
    },
    {
      "q": "Can I get alerts?",
      "a": "Yes, enable notifications for matching roles."
    }
  ],
  "audience": [
    {
      "title": "First-time applicants",
      "desc": "No experience yet? Filter to openings that accept first and second years and apply with your ClassLab portfolio."
    },
    {
      "title": "High-volume applicants",
      "desc": "Twenty applications is normal. Track every one, with status and follow-up date, instead of trusting your inbox."
    },
    {
      "title": "Referral seekers",
      "desc": "Find students already interning at a company and ask them in the open thread how their process ran."
    }
  ],
  "deepDive": [
    {
      "heading": "Tracking is the part people get wrong",
      "paragraphs": [
        "Most missed internships are not rejections \u2014 they are applications nobody followed up on. The tracker keeps every application in one board with its stage, the date you applied and when to nudge, so nothing quietly expires.",
        "Deadlines can be pushed to your calendar and countdown widget, and push notifications warn you the day before one closes."
      ]
    },
    {
      "heading": "Apply with proof, not adjectives",
      "paragraphs": [
        "Your ClassLab portfolio doubles as your application profile: shipped projects, contributions, events run, and peer-visible karma. That is far more convincing than a one-page resume claiming the same things.",
        "Peers who interviewed at the same company post what each round looked like, so you walk in knowing the format."
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
content.icon = Briefcase;

export const Route = createFileRoute("/internships")({
  head: () =>
    featureHead(content, {
      metaTitle: "Internships | ClassLab",
      description: "Discover the Internships feature on ClassLab to help students connect, collaborate and grow.",
      pageType: "CollectionPage",
      keywords: "student internships, peer learning, college students, university students, collaboration",
    }),
  component: InternshipsPage,
});

function InternshipsPage() {
  return <FeaturePage c={content} />;
}
