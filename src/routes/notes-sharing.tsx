import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "notes-sharing",
  "eyebrow": "Notes Sharing",
  "title": "Notes Sharing",
  "headline": "Share study notes your classmates will actually use",
  "subhead": "Upload, organise and share notes with your group, your class or your whole exam community.",
  "overview": "Notes Sharing on ClassLab makes study material easy to give and easy to find. Attach notes to a chat, pin them to a group, or link them from a mind map or study plan so they show up exactly where they are needed. Everything stays organised by subject and group instead of being buried in a chat history.",
  "features": [
    {
      "title": "Attach anywhere",
      "desc": "Add notes to chats, groups, tasks and mind maps."
    },
    {
      "title": "Organised by subject",
      "desc": "Find material by group, subject or topic."
    },
    {
      "title": "Multiple formats",
      "desc": "PDFs, images and links all supported."
    },
    {
      "title": "Quick preview",
      "desc": "Open attachments without downloading."
    },
    {
      "title": "Access control",
      "desc": "Notes are visible only to the group you share them with."
    },
    {
      "title": "Search",
      "desc": "Find shared material fast across your groups."
    }
  ],
  "steps": [
    {
      "title": "Upload",
      "desc": "Drop your file into a chat, group or task."
    },
    {
      "title": "Organise",
      "desc": "Tag it to the right subject or topic."
    },
    {
      "title": "Share",
      "desc": "Your group gets instant access — no email chains."
    }
  ],
  "benefits": [
    "Stop losing notes in scattered chat history",
    "Give and get material inside the group that needs it",
    "Contribute back to your exam community",
    "Secure, access-controlled sharing",
    "Works on mobile for quick uploads",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "What file types can I share?",
      "a": "PDFs, images and links are supported today."
    },
    {
      "q": "Who can see my notes?",
      "a": "Only the members of the chat or group you share them with."
    },
    {
      "q": "Can I remove a note later?",
      "a": "Yes, you can delete what you have shared."
    },
    {
      "q": "Is there a storage limit?",
      "a": "Fair-use limits apply for free student accounts."
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
      "label": "College Clubs",
      "to": "/college-clubs"
    }
  ]
} as unknown as FeaturePageContent;
content.icon = FileText;

export const Route = createFileRoute("/notes-sharing")({
  head: () =>
    featureHead(content, {
      metaTitle: "Notes Sharing | ClassLab",
      description: "Discover the Notes Sharing feature on ClassLab to help students connect, collaborate and grow.",
      keywords: "share study notes, peer learning, college students, university students, collaboration",
    }),
  component: NotesSharingPage,
});

function NotesSharingPage() {
  return <FeaturePage c={content} />;
}
