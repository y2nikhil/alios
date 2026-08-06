import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "events",
  "eyebrow": "Events",
  "title": "Events",
  "headline": "Never miss a campus or community event again",
  "subhead": "Fests, workshops, study sprints, AMAs and club sessions — discover, RSVP and get reminded.",
  "overview": "Events on ClassLab brings every student event into one calendar. Browse what is happening across your campus and communities, RSVP in one tap, and get reminders so you actually show up. Hosts get a simple way to publish an event, track attendance and follow up with attendees.",
  "features": [
    {
      "title": "Unified calendar",
      "desc": "Campus, club and community events in one place."
    },
    {
      "title": "RSVP",
      "desc": "Confirm attendance and see who else is going."
    },
    {
      "title": "Reminders",
      "desc": "Push notifications before an event starts."
    },
    {
      "title": "Host tools",
      "desc": "Publish an event in under a minute."
    },
    {
      "title": "Online and offline",
      "desc": "Support for in-person sessions and online rooms."
    },
    {
      "title": "Countdowns",
      "desc": "Pin key dates and see the days remaining."
    }
  ],
  "steps": [
    {
      "title": "Browse",
      "desc": "Explore events from your campus and communities."
    },
    {
      "title": "RSVP",
      "desc": "Reserve your spot in one tap."
    },
    {
      "title": "Show up",
      "desc": "Get a reminder before it begins and join."
    }
  ],
  "benefits": [
    "One calendar instead of ten posters and broadcast lists",
    "Better attendance thanks to reminders",
    "Discover events outside your immediate circle",
    "Simple hosting tools for organisers",
    "Mobile-first for on-the-go RSVPs",
    "Free for students and organisers"
  ],
  "faqs": [
    {
      "q": "How do I host an event?",
      "a": "Create it from your club or community page and publish it."
    },
    {
      "q": "Do I get reminders?",
      "a": "Yes, with push notifications enabled you get a reminder before it starts."
    },
    {
      "q": "Can events be online?",
      "a": "Yes, online sessions and watch parties are supported."
    },
    {
      "q": "Is RSVP required?",
      "a": "No, but it helps hosts plan and helps you get reminders."
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
content.icon = CalendarDays;

export const Route = createFileRoute("/events")({
  head: () =>
    featureHead(content, {
      metaTitle: "Events | ClassLab",
      description: "Discover the Events feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "student events, peer learning, college students, university students, collaboration",
    }),
  component: EventsPage,
});

function EventsPage() {
  return <FeaturePage c={content} />;
}
