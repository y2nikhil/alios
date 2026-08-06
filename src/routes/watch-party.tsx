import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "watch-party",
  "eyebrow": "Watch Party",
  "title": "Watch Party",
  "headline": "Watch lectures and shows together, in sync",
  "subhead": "Host a synced watch party with friends: one queue, one timeline, one chat. Perfect for lecture playlists, revision marathons or a well-earned break.",
  "overview": "Watch Party on ClassLab lets you play a YouTube video or an entire study playlist in perfect sync with everyone in the room. Playback, pause and seek stay aligned for every participant, while a live chat panel sits next to the player so reactions, doubts and timestamps never get lost. Students use it for group revision, coding tutorials, project walkthroughs and casual downtime with their campus circle.",
  "features": [
    {
      "title": "Synced playback",
      "desc": "Play, pause and seek stay in sync for everyone in the room, no matter their connection."
    },
    {
      "title": "Live room chat",
      "desc": "Discuss what you are watching in real time without leaving the player."
    },
    {
      "title": "Shared queue",
      "desc": "Line up an entire playlist and move through it together."
    },
    {
      "title": "Instant invites",
      "desc": "Share a single link to bring classmates into the room."
    },
    {
      "title": "Works on mobile",
      "desc": "Responsive player and chat designed for phones and tablets."
    },
    {
      "title": "Moderated rooms",
      "desc": "Hosts can manage participants and keep the room focused."
    }
  ],
  "steps": [
    {
      "title": "Create a room",
      "desc": "Start a watch party from your dashboard in one click."
    },
    {
      "title": "Add your video",
      "desc": "Paste a YouTube link or pull in a saved study playlist."
    },
    {
      "title": "Invite and watch",
      "desc": "Share the link, and everyone watches and chats in sync."
    }
  ],
  "benefits": [
    "Revise together even when you are on different campuses",
    "Turn long lecture playlists into a shared, accountable session",
    "Ask doubts the moment they come up, with timestamps",
    "Keep study breaks social instead of isolating",
    "No installs — it runs in the browser",
    "Free for every student account"
  ],
  "faqs": [
    {
      "q": "Is Watch Party free for students?",
      "a": "Yes. Watch Party is included with every free ClassLab student account."
    },
    {
      "q": "How many people can join a room?",
      "a": "Rooms are built for study-group sizes and comfortably handle a full class group."
    },
    {
      "q": "Can I watch a full playlist?",
      "a": "Yes. Add a YouTube playlist and the room moves through it together."
    },
    {
      "q": "Does it work on mobile?",
      "a": "Yes, the player and chat are fully responsive on phones and tablets."
    }
  ],
  "related": [
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
    },
    {
      "label": "College Clubs",
      "to": "/college-clubs"
    }
  ]
} as unknown as FeaturePageContent;
content.icon = Sparkles;

export const Route = createFileRoute("/watch-party")({
  head: () =>
    featureHead(content, {
      metaTitle: "Watch Party | ClassLab",
      description: "Discover the Watch Party feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "watch party for students, peer learning, college students, university students, collaboration",
    }),
  component: WatchPartyPage,
});

function WatchPartyPage() {
  return <FeaturePage c={content} />;
}
