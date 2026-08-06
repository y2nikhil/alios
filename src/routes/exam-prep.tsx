import { createFileRoute } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "exam-prep",
  "eyebrow": "Exam Prep",
  "title": "Exam Prep",
  "headline": "Exam preparation with a plan and a cohort",
  "subhead": "CAT, JEE, NEET, SSC, Banking or Railways — get a personalised plan, track focus hours and prepare alongside your cohort.",
  "overview": "Exam Prep on ClassLab starts with a short onboarding that captures your exam, attempt year, daily capacity, prep stage and weak areas. From there you get a starter study plan, a countdown to exam day, a roadmap on your mind map, an AI assistant that knows your context and automatic entry into your exam community.",
  "features": [
    {
      "title": "Personalised plan",
      "desc": "A starter plan built from your capacity and stage."
    },
    {
      "title": "Exam countdown",
      "desc": "Days remaining, pinned where you see it daily."
    },
    {
      "title": "Focus tracking",
      "desc": "Log study sessions and see real hours, not guesses."
    },
    {
      "title": "Weak-area focus",
      "desc": "Targeted drills for the topics you flagged."
    },
    {
      "title": "Cohort community",
      "desc": "Prepare alongside students taking the same exam."
    },
    {
      "title": "AI assistant",
      "desc": "Answers grounded in your own prep data."
    }
  ],
  "steps": [
    {
      "title": "Answer a few questions",
      "desc": "Exam, year, daily hours, stage and weak areas."
    },
    {
      "title": "Get your plan",
      "desc": "A roadmap, countdown and community, generated for you."
    },
    {
      "title": "Track and adjust",
      "desc": "Study, log hours and let the plan adapt."
    }
  ],
  "benefits": [
    "Structure instead of a vague plan",
    "Honest visibility of hours actually studied",
    "Support from a cohort on the same timeline",
    "Weak areas get deliberate attention",
    "Everything editable as your prep evolves",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Which exams are supported?",
      "a": "CAT, JEE, NEET, SSC/UPSC, Banking and Railways."
    },
    {
      "q": "Can I change my answers later?",
      "a": "Yes, your prep profile is editable anytime in settings."
    },
    {
      "q": "Does the AI know my prep data?",
      "a": "Yes, the assistant uses your prep profile and focus stats to personalise answers."
    },
    {
      "q": "Is exam prep free?",
      "a": "Yes, it is included with a free student account."
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
content.icon = Target;

export const Route = createFileRoute("/exam-prep")({
  head: () =>
    featureHead(content, {
      metaTitle: "Exam Prep | ClassLab",
      description: "Discover the Exam Prep feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "exam preparation, peer learning, college students, university students, collaboration",
    }),
  component: ExamPrepPage,
});

function ExamPrepPage() {
  return <FeaturePage c={content} />;
}
