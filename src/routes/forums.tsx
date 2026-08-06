import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "forums",
  "eyebrow": "Discussion Forums",
  "title": "Discussion Forums",
  "headline": "Student discussion forums with real answers",
  "subhead": "Ask a doubt, get answers from peers and seniors, and keep the good ones searchable for everyone after you.",
  "overview": "Discussion Forums on ClassLab are long-form, searchable spaces for questions that deserve more than a chat message. Post a doubt with context, get answers from students who have solved it, and let the thread stay available to the next batch. Moderation and reporting keep discussions useful and respectful.",
  "features": [
    {
      "title": "Threaded discussions",
      "desc": "Structured answers instead of a scrolling chat."
    },
    {
      "title": "Topic boards",
      "desc": "Boards per subject, exam and campus."
    },
    {
      "title": "Search",
      "desc": "Chances are your doubt is already answered."
    },
    {
      "title": "Reactions",
      "desc": "Surface the most helpful answers."
    },
    {
      "title": "Mentions",
      "desc": "Pull in someone who knows the topic."
    },
    {
      "title": "Moderation",
      "desc": "Report and review keeps discussions clean."
    }
  ],
  "steps": [
    {
      "title": "Search first",
      "desc": "See whether your question already has an answer."
    },
    {
      "title": "Post your doubt",
      "desc": "Add context, screenshots or notes."
    },
    {
      "title": "Get answers",
      "desc": "Peers and seniors respond, and the thread stays searchable."
    }
  ],
  "benefits": [
    "Answers with more depth than a chat reply",
    "Knowledge that compounds for future batches",
    "Recognition for students who help others",
    "Organised by subject and exam",
    "Fully moderated",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Who answers questions?",
      "a": "Fellow students, seniors and community moderators."
    },
    {
      "q": "Can I post anonymously?",
      "a": "Posting visibility follows your profile privacy settings."
    },
    {
      "q": "Are old threads searchable?",
      "a": "Yes, every thread stays searchable."
    },
    {
      "q": "How is spam handled?",
      "a": "Reporting and moderation tools remove it quickly."
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
content.icon = MessagesSquare;

export const Route = createFileRoute("/forums")({
  head: () =>
    featureHead(content, {
      metaTitle: "Discussion Forums | ClassLab",
      description: "Discover the Discussion Forums feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "student discussion forum, peer learning, college students, university students, collaboration",
    }),
  component: DiscussionForumsPage,
});

function DiscussionForumsPage() {
  return <FeaturePage c={content} />;
}
