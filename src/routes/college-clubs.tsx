import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "college-clubs",
  "eyebrow": "College Clubs",
  "title": "College Clubs",
  "headline": "Run your college club without the group-chat chaos",
  "subhead": "Members, announcements, events and discussions for every campus club in one organised home.",
  "overview": "College Clubs on ClassLab give societies, chapters and campus clubs a proper home: a member directory, announcement channel, discussion space and an events calendar. Recruit new members, plan sessions and keep the whole club informed without spreadsheets and scattered broadcast lists.",
  "features": [
    {
      "title": "Member directory",
      "desc": "See who is in the club and their role."
    },
    {
      "title": "Announcements",
      "desc": "Broadcast updates everyone actually sees."
    },
    {
      "title": "Event planning",
      "desc": "Schedule sessions and track who is attending."
    },
    {
      "title": "Discussion space",
      "desc": "Threads for committees, projects and planning."
    },
    {
      "title": "Recruitment",
      "desc": "Let students discover and request to join your club."
    },
    {
      "title": "Roles and permissions",
      "desc": "Give core members the right level of access."
    }
  ],
  "steps": [
    {
      "title": "Create your club",
      "desc": "Set up the club page with a name and description."
    },
    {
      "title": "Add members",
      "desc": "Invite the core team and open recruitment."
    },
    {
      "title": "Run it",
      "desc": "Post announcements, schedule events and keep discussion in one place."
    }
  ],
  "benefits": [
    "One home for every club activity",
    "Higher turnout with proper event reminders",
    "Easier handover between yearly committees",
    "Discoverable by new students on campus",
    "Moderated and safe",
    "Free for campus clubs"
  ],
  "faqs": [
    {
      "q": "Can any student create a club?",
      "a": "Yes, any student can create a club page and invite members."
    },
    {
      "q": "Can I control who joins?",
      "a": "Yes, clubs can be open or approval-based."
    },
    {
      "q": "Can we run events from the club page?",
      "a": "Yes, events and attendance are built in."
    },
    {
      "q": "Is it free?",
      "a": "Yes, College Clubs is free on ClassLab."
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
content.icon = Building2;

export const Route = createFileRoute("/college-clubs")({
  head: () =>
    featureHead(content, {
      metaTitle: "College Clubs | ClassLab",
      description: "Discover the College Clubs feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "college clubs, peer learning, college students, university students, collaboration",
    }),
  component: CollegeClubsPage,
});

function CollegeClubsPage() {
  return <FeaturePage c={content} />;
}
