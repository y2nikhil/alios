import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { FeaturePage, featureHead, type FeaturePageContent } from "@/components/marketing/FeaturePage";

const content: FeaturePageContent = {
  "slug": "projects",
  "eyebrow": "Projects",
  "title": "Projects",
  "headline": "Student project collaboration that stays on track",
  "subhead": "Find teammates, split the work, track progress and ship your project before the deadline.",
  "overview": "Projects on ClassLab combine a team space, task board and chat so student teams can plan and deliver together. Post a project to find teammates with the skills you need, assign tasks with due dates, and keep files and discussion attached to the work instead of scattered across apps.",
  "features": [
    {
      "title": "Find teammates",
      "desc": "Post what you are building and the skills you need."
    },
    {
      "title": "Task board",
      "desc": "Assign work with owners, priorities and due dates."
    },
    {
      "title": "Team chat",
      "desc": "Discussion attached to the project it belongs to."
    },
    {
      "title": "File sharing",
      "desc": "Keep specs, designs and drafts with the team."
    },
    {
      "title": "Progress view",
      "desc": "See what is done and what is blocked at a glance."
    },
    {
      "title": "Deadlines",
      "desc": "Due dates and reminders so nothing slips."
    }
  ],
  "steps": [
    {
      "title": "Create the project",
      "desc": "Describe the goal, scope and skills needed."
    },
    {
      "title": "Build the team",
      "desc": "Invite classmates or accept applicants."
    },
    {
      "title": "Ship it",
      "desc": "Assign tasks, track progress and deliver on time."
    }
  ],
  "benefits": [
    "Fewer missed deadlines with clear ownership",
    "Find teammates outside your usual circle",
    "All context in one place for the next contributor",
    "Great material for your student portfolio",
    "Works for coursework, hackathons and side projects",
    "Free for students"
  ],
  "faqs": [
    {
      "q": "Can I find teammates outside my college?",
      "a": "Yes, projects can be open to the wider ClassLab network."
    },
    {
      "q": "Is there a task board?",
      "a": "Yes, with assignees, priorities and due dates."
    },
    {
      "q": "Can I keep a project private?",
      "a": "Yes, projects can be invite-only."
    },
    {
      "q": "Does it cost anything?",
      "a": "No, project collaboration is free."
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
content.icon = Briefcase;

export const Route = createFileRoute("/projects")({
  head: () =>
    featureHead(content, {
      metaTitle: "Projects | ClassLab",
      description: "Discover the Projects feature on ClassLab to help students connect, collaborate and grow.",
      pageType: "CollectionPage",
      keywords: "student collaboration, peer learning, college students, university students, collaboration",
    }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return <FeaturePage c={content} />;
}
