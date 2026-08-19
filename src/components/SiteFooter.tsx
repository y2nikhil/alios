import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";

const COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About us", to: "/about" },
      { label: "Blog", to: "/blog" },
      { label: "Student feed", to: "/feed" },
      { label: "Careers hub", to: "/career" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "Watch Party", to: "/watch-party" },
      { label: "Student Chat", to: "/student-chat" },
      { label: "Study Groups", to: "/study-groups" },
      { label: "AI Study Assistant", to: "/ai-study-assistant" },
      { label: "Coding Rooms", to: "/coding-rooms" },
    ],
  },
  {
    title: "Campus",
    links: [
      { label: "Communities", to: "/communities" },
      { label: "College Clubs", to: "/college-clubs" },
      { label: "Campus Network", to: "/campus-network" },
      { label: "Events", to: "/events" },
      { label: "Discussion Forums", to: "/forums" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Exam Prep", to: "/exam-prep" },
      { label: "JEE Prep", to: "/exams/jee" },
      { label: "Notes Sharing", to: "/notes-sharing" },
      { label: "Internships", to: "/internships" },
      { label: "Projects", to: "/projects" },
      { label: "Portfolio", to: "/portfolio" },
      { label: "Resources", to: "/resources" },
    ],
  },
];

/** Shared public site footer with all important links. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <BrandLogo size={34} tagline="The Digital Campus" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              ClassLab brings students together — focus tracking, communities, notes, watch parties and an AI study
              assistant in one campus.
            </p>
            <a
              href="mailto:y2nikhil@gmail.com"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              y2nikhil@gmail.com
            </a>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold">{col.title}</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to as never} className="hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground lg:flex-row lg:px-10">
          <span>© {new Date().getFullYear()} ClassLab · The Digital Campus for Every Student</span>
          <div className="flex gap-5">
            {user ? (
              <Link to="/app" className="hover:text-foreground">Open ClassLab</Link>
            ) : (
              <>
                <Link to="/login" className="hover:text-foreground">Log In</Link>
                <Link to="/signup" className="hover:text-foreground">Join ClassLab</Link>
              </>
            )}
            <Link to="/about" className="hover:text-foreground">Contact</Link>

          </div>
        </div>
      </div>
    </footer>
  );
}
