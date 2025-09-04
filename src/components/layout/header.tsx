import { GitHubIcon } from "@/components/icons/github";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/link-button";
import { CONTENT, EXTERNAL_LINKS, IMAGES, NAVIGATION } from "@/lib/constants";
import Link from "next/link";

function Navigation() {
  return (
    <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
      {NAVIGATION.map((item) => {
        const isExternal = item.href.startsWith("http");
        const Component = isExternal ? "a" : Link;

        return (
          <Component
            key={item.href}
            href={item.href}
            className="hover:text-example-primary text-sm font-medium text-slate-300 transition-colors"
            {...(isExternal && {
              target: "_blank",
              rel: "noopener noreferrer",
            })}
          >
            {item.label}
          </Component>
        );
      })}
    </nav>
  );
}

function GitHubButton() {
  return (
    <LinkButton
      href={EXTERNAL_LINKS.GITHUB}
      external
      className="bg-example-secondary hover:bg-example-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-white transition-colors"
      aria-label="Open Kilian's GitHub profile in a new tab"
    >
      <GitHubIcon className="size-5" />
      <span className="hidden md:inline">GitHub</span>
    </LinkButton>
  );
}

function Header() {
  return (
    <header className="border-example-border flex items-center justify-between border-b border-solid px-10 py-5 whitespace-nowrap">
      <div className="flex items-center gap-3 text-white">
        <Avatar className="size-12">
          <AvatarImage alt={`${CONTENT.NAME} headshot`} src={IMAGES.AVATAR} />
          <AvatarFallback>KT</AvatarFallback>
        </Avatar>
        <h2 className="text-xl leading-tight font-bold text-white">
          {CONTENT.NAME}
        </h2>
      </div>
      <Navigation />
      <GitHubButton />
    </header>
  );
}

export { GitHubButton, Header, Navigation };
