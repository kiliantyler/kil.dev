import { GitHubIcon } from "@/components/icons/github";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { EXTERNAL_LINKS, NAVIGATION } from "@/lib/constants";
import Link from "next/link";

function QuickLinks() {
  return (
    <div>
      <h3 className="mb-4 text-lg font-bold text-white">Quick Links</h3>
      <ul className="space-y-2">
        {NAVIGATION.map((item) => {
          const isExternal = item.href.startsWith("http");
          const Component = isExternal ? "a" : Link;

          return (
            <li key={item.href}>
              <Component
                href={item.href}
                className="hover:text-example-primary text-sm text-slate-400 transition-colors"
                {...(isExternal && {
                  target: "_blank",
                  rel: "noopener noreferrer",
                })}
              >
                {item.label}
              </Component>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SocialLinks() {
  return (
    <div>
      <h3 className="mb-4 text-lg font-bold text-white">Connect</h3>
      <div className="flex space-x-4">
        <Link
          href={EXTERNAL_LINKS.GITHUB}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-example-primary text-slate-400 transition-colors"
          aria-label="GitHub"
        >
          <GitHubIcon className="h-6 w-6" />
        </Link>
        <Link
          href={EXTERNAL_LINKS.LINKEDIN}
          className="hover:text-example-primary text-slate-400 transition-colors"
          aria-label="LinkedIn"
        >
          <LinkedInIcon className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-example-border mt-auto w-full bg-slate-900/50 px-10 py-8">
      <div className="border-example-border mt-8 border-t border-solid pt-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} Kilian Tyler. All rights reserved.</p>
      </div>
    </footer>
  );
}

export { Footer, QuickLinks, SocialLinks };
