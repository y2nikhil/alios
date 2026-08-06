import { createFileRoute } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "career",
  "eyebrow": "Career Hub",
  "title": "Career Hub",
  "headline": "Plan your career from your first year",
  "subhead": "Explore paths, build the right skills, prepare for interviews and connect with students already on the road you want.",
  "overview": "Career Hub on ClassLab helps students move from studying to working. Explore career paths relevant to your course, see the skills each one needs, follow curated preparation tracks, and talk to peers and seniors who have already interviewed or interned in that field. Your portfolio and internship tracker live right alongside it.",
  "features": [
    {
      "title": "Path explorer",
      "desc": "Understand roles, skills and typical entry routes."
    },
    {
      "title": "Skill tracks",
      "desc": "Curated learning sequences for each path."
    },
    {
      "title": "Interview prep",
      "desc": "Question banks and experiences shared by peers."
    },
    {
      "title": "Mentorship",
      "desc": "Learn from seniors who took the same route."
    },
    {
      "title": "Portfolio integration",
      "desc": "Your work is already attached to your profile."
    },
    {
      "title": "Opportunity feed",
      "desc": "Internships and roles matched to your path."
    }
  ],
  "steps": [
    {
      "title": "Explore",
      "desc": "Browse paths that match your course and interests."
    },
    {
      "title": "Prepare",
      "desc": "Follow the skill track and practise with peers."
    },
    {
      "title": "Apply",
      "desc": "Use your portfolio and the internship tracker to land the role."
    }
  ],
  "benefits": [
    "Clarity about what a role actually requires",
    "Preparation guided by people who succeeded",
    "Portfolio and applications in the same place",
    "Start early instead of in your final semester",
    "Peer insight beats generic advice",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Is Career Hub only for final-year students?",
      "a": "No, it is designed to be useful from your first year."
    },
    {
      "q": "Are mentors verified?",
      "a": "Mentors are students and alumni within the ClassLab network."
    },
    {
      "q": "Does it include interview questions?",
      "a": "Yes, shared by students who interviewed recently."
    },
    {
      "q": "Is it free?",
      "a": "Yes."
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
content.icon = Compass;

export const Route = createFileRoute("/career")({
  head: () =>
    featureHead(content, {
      metaTitle: "Career Hub | ClassLab",
      description: "Discover the Career Hub feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "student careers, peer learning, college students, university students, collaboration",
    }),
  component: CareerHubPage,
});

function CareerHubPage() {
  return <FeaturePage c={content} />;
}
