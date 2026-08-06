import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "ai-study-assistant",
  "eyebrow": "AI Study Assistant",
  "title": "AI Study Assistant",
  "headline": "An AI study assistant that knows your prep",
  "subhead": "Ask about your week, plan tomorrow, or get unstuck — with answers grounded in your own exam, tasks and focus data.",
  "overview": "The AI Study Assistant on ClassLab is personalised to you. It reads your prep profile, your recent focus sessions, your open tasks and your milestones, so answers reference your actual exam, weak subjects and study hours instead of generic advice. Ask it to plan a week, review your consistency, quiz you on a weak topic or explain a concept.",
  "features": [
    {
      "title": "Knows your context",
      "desc": "Uses your exam, stage, weak areas and tracked hours."
    },
    {
      "title": "Weekly reviews",
      "desc": "Summaries of what you actually studied."
    },
    {
      "title": "Plan building",
      "desc": "Turn a goal into a realistic day or week plan."
    },
    {
      "title": "Topic help",
      "desc": "Explanations and quick quizzes on weak areas."
    },
    {
      "title": "Task aware",
      "desc": "Sees your open tasks and upcoming deadlines."
    },
    {
      "title": "Private to you",
      "desc": "Your data personalises only your assistant."
    }
  ],
  "steps": [
    {
      "title": "Complete onboarding",
      "desc": "Tell ClassLab your exam, hours and weak areas."
    },
    {
      "title": "Study normally",
      "desc": "Focus sessions and tasks build your context automatically."
    },
    {
      "title": "Ask anything",
      "desc": "Get answers grounded in your real data."
    }
  ],
  "benefits": [
    "Advice that fits your timeline, not a generic template",
    "Honest feedback based on tracked hours",
    "Fast planning without spreadsheets",
    "Instant help on weak topics",
    "Available on every device",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Is my data used to train models?",
      "a": "No. Your data personalises only your own assistant responses."
    },
    {
      "q": "What does it know about me?",
      "a": "Your prep profile, focus sessions, tasks and milestones from your account."
    },
    {
      "q": "Can it plan my week?",
      "a": "Yes, ask it for a plan based on your daily capacity."
    },
    {
      "q": "Is it free?",
      "a": "Yes, included with your student account."
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
content.icon = Sparkles;

export const Route = createFileRoute("/ai-study-assistant")({
  head: () =>
    featureHead(content, {
      metaTitle: "AI Study Assistant | ClassLab",
      description: "Discover the AI Study Assistant feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "AI study assistant, peer learning, college students, university students, collaboration",
    }),
  component: AIStudyAssistantPage,
});

function AIStudyAssistantPage() {
  return <FeaturePage c={content} />;
}
