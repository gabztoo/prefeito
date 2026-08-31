import Link from "next/link";

const credits = [
  {
    label: "@sugiiartz",
    href: "https://www.instagram.com/sugiiartz?igsi=dXEyeHo4cDhoZjNn",
  },
  {
    label: "@macae092",
    href: "https://www.instagram.com/gabztoo?igsi=OWJvZDQ3M21qbHE1",
  },
];

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function FooterSection() {
  return (
    <footer className="bg-background py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground text-sm">
            Desenvolvido por
          </p>
          <div className="flex items-center gap-6">
            {credits.map((credit, index) => (
              <Link
                key={index}
                href={credit.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary flex items-center gap-2 duration-150"
              >
                <InstagramIcon className="h-5 w-5" />
                <span className="text-sm font-medium">{credit.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
