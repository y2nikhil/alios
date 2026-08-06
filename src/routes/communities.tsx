import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "communities",
  "eyebrow": "Communities",
  "title": "Communities",
  "headline": "Find the student community that fits you",
  "subhead": "Exam cohorts, campus circles, hobby groups and subject communities — discover people who are working on the same things as you.",
  "overview": "Communities on ClassLab are larger, topic-based spaces where students gather around an exam, a college, a subject or an interest. Each community has discussions, shared resources, events and a member directory. When you complete onboarding, ClassLab suggests and auto-joins the communities that match your exam and stage.",
  "features": [
    {
      "title": "Exam cohorts",
      "desc": "CAT, JEE, NEET, SSC, Banking and Railways communities."
    },
    {
      "title": "Campus circles",
      "desc": "Connect with students from your own college."
    },
    {
      "title": "Discussions",
      "desc": "Ask questions and get answers from people ahead of you."
    },
    {
      "title": "Shared resources",
      "desc": "Notes, playlists and links curated by the community."
    },
    {
      "title": "Events",
      "desc": "Community-hosted sessions, AMAs and study sprints."
    },
    {
      "title": "Smart matching",
      "desc": "Get suggested communities based on your prep profile."
    }
  ],
  "steps": [
    {
      "title": "Tell us your goal",
      "desc": "Answer a few onboarding questions about your exam and stage."
    },
    {
      "title": "Get matched",
      "desc": "ClassLab suggests communities that fit your goal."
    },
    {
      "title": "Participate",
      "desc": "Join discussions, share resources and attend community events."
    }
  ],
  "benefits": [
    "Learn from students a year ahead of you",
    "Curated resources instead of endless searching",
    "Peer support during a long prep cycle",
    "Discover events and study sprints you would miss otherwise",
    "Safe, moderated spaces",
    "Free to join"
  ],
  "faqs": [
    {
      "q": "Are communities free to join?",
      "a": "Yes, all student communities on ClassLab are free."
    },
    {
      "q": "Can I create my own community?",
      "a": "Yes, you can create one and invite members."
    },
    {
      "q": "Are communities moderated?",
      "a": "Yes, every community has moderation and reporting built in."
    },
    {
      "q": "Will ClassLab suggest communities for me?",
      "a": "Yes, based on your exam, year and prep stage from onboarding."
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
      "label": "Notes Sharing",
      "to": "/notes-sharing"
    },
    {
      "label": "College Clubs",
      "to": "/college-clubs"
    }
  ]
} as unknown as FeaturePageContent;
content.icon = Users;

export const Route = createFileRoute("/communities")({
  head: () =>
    featureHead(content, {
      metaTitle: "Communities | ClassLab",
      description: "Discover the Communities feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "student communities, peer learning, college students, university students, collaboration",
    }),
  component: CommunitiesPage,
});

function CommunitiesPage() {
  return <FeaturePage c={content} />;
}
