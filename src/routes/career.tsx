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
  "audience": [
    {
      "title": "First and second year students",
      "desc": "You still have time to choose. Use the path explorer to compare product, data, core engineering, finance and design routes before you commit to a skill stack."
    },
    {
      "title": "Pre-placement year students",
      "desc": "Placement season rewards preparation started 8-10 months early. Run a weekly interview-prep block in a focus room and log every mock in your timeline."
    },
    {
      "title": "Career switchers",
      "desc": "Coming from a non-CS branch into tech, or from tech into consulting? Follow seniors who made the same jump and copy the sequence that worked for them."
    }
  ],
  "deepDive": [
    {
      "heading": "Build a placement timeline that actually holds",
      "paragraphs": [
        "Most students lose placement season to scattered preparation: DSA one week, aptitude the next, resume rewritten the night before the deadline. ClassLab turns that into a visible plan \u2014 pick a target role, get a week-by-week track, and watch the countdown to your campus drive sit next to your daily focus hours.",
        "Because your AUX punches and study sessions are logged automatically, you can see whether you really put in the interview prep you planned, instead of guessing at the end of the month."
      ]
    },
    {
      "heading": "Learn from people one year ahead of you",
      "paragraphs": [
        "The most useful placement intel is never published: which rounds a company actually runs on your campus, how deep the system-design question goes, what the HR round screens for. Seniors post that in forums and community threads after their interviews.",
        "Follow the students in your branch who already interviewed, read their post history, and ask follow-ups in the open \u2014 the answer helps everyone in your batch instead of dying in a private DM."
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
