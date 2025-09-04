import { DownloadIcon } from "@/components/icons/download";
import { GitHubIcon } from "@/components/icons/github";
import { LinkedInIcon } from "@/components/icons/linkedin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { Noto_Sans, Space_Grotesk } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kilian Tyler | Site Reliability Engineer",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-sans",
});

export default function Homepage() {
  return (
    <div className={`${spaceGrotesk.variable} ${notoSans.variable}`}>
      <div
        className="bg-example-background text-example-text relative min-h-screen"
        style={{
          fontFamily:
            "var(--font-space-grotesk), var(--font-noto-sans), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji",
        }}
      >
        <div className="circuit-bg absolute inset-0 z-0" aria-hidden />
        <div
          className="to-example-background absolute inset-0 z-10 bg-linear-to-b from-transparent"
          aria-hidden
        />
        <div className="relative z-20 flex size-full flex-col overflow-x-hidden">
          <div className="layout-container flex h-full grow flex-col">
            <header className="border-example-border flex items-center justify-between border-b border-solid px-10 py-5 whitespace-nowrap">
              <div className="flex items-center gap-3 text-white">
                <Avatar className="size-12">
                  <AvatarImage
                    alt="Kilian Tyler headshot"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDL-Kljo54ODUhUxDBz0oabZ2ghbmfPPPh5NYtLhsmfMJHEAts9dK4lOoKMlHJYwXzDBRDmuC_vCcykQGg8cUBOdLs6Yi64qUDQvtspNO1FhkHPPNPaG18XDMevZIGwFMzmyizgImDedgjCFw9hVBf97y8t4I4Q9pw8xLTgtUvM8m0Z6Iw1Cg7WZZHWukAGZVAs6TIoBkfQ83J1LCuEN65wDKIKOhx0bhawX3NfQvtltWobM0X5py9sQHHyA9Un5ykIGWjoSKKEtsPW"
                  />
                  <AvatarFallback>KT</AvatarFallback>
                </Avatar>
                <h2 className="text-xl leading-tight font-bold text-white">
                  Kilian Tyler
                </h2>
              </div>
              <nav
                className="hidden items-center gap-8 md:flex"
                aria-label="Primary"
              >
                <a
                  className="hover:text-example-primary text-sm font-medium text-slate-300 transition-colors"
                  href="#about"
                >
                  About
                </a>
                <a
                  className="hover:text-example-primary text-sm font-medium text-slate-300 transition-colors"
                  href="#projects"
                >
                  Projects
                </a>
                <Link
                  className="hover:text-example-primary text-sm font-medium text-slate-300 transition-colors"
                  href="/contact"
                  aria-label="Go to contact page"
                >
                  Contact
                </Link>
              </nav>
              <Button
                asChild
                className="bg-example-secondary hover:bg-example-accent h-10 min-w-0 rounded-lg px-4 text-sm font-bold text-white transition-colors"
              >
                <a
                  href="https://github.com/kiliantyler/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Kilian's GitHub profile in a new tab"
                >
                  <GitHubIcon className="size-5" />
                  <span className="hidden md:inline">GitHub</span>
                </a>
              </Button>
            </header>

            <main className="flex flex-1 items-center px-10 py-20 md:px-20 lg:px-40">
              <div className="w-full text-center lg:text-left">
                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                  <div className="relative order-1 mx-auto w-full max-w-md lg:order-2 lg:mx-0">
                    <div className="border-example-primary absolute -top-4 -left-4 h-full w-full -rotate-3 rounded-lg border-4 transition-transform duration-500 hover:rotate-0" />
                    <div className="relative h-auto w-full rounded-lg bg-cover bg-center bg-no-repeat shadow-2xl">
                      <Image
                        alt="Kilian Tyler headshot"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFvwFvdX5-j3kLLkI-wXEbFy8oyOG0ezsruGyeYR1CkOfTp1uq8QD8byb2mAA4pIAy8gITiJgXcoF1gIqSx70oOPYigcYLKB925Q4ptJ6M94kwKV-9zbntwJNVPmOVjN7M1V5fuPKG8doKBsB_COzzw6QvQOLLm9X1q-_b_RK6XzPpsf86fUaGqMX-r6GyRKev8YxC2UKtxFdveHjiTTG6vyBGI1yuUeSFTYyNhXvj5mTC7IQ8PwbEQ3mgFaE5xomlQMKxFLpaPKzS"
                        className="rounded-lg"
                        loading="lazy"
                        width={500}
                        height={500}
                      />
                    </div>
                  </div>

                  <div className="order-2 flex flex-col gap-6 lg:order-1">
                    <div className="flex flex-col gap-2">
                      <h1 className="text-5xl leading-tight font-black tracking-tight text-white md:text-6xl">
                        Kilian Tyler
                      </h1>
                      <p className="text-example-primary text-lg font-semibold md:text-xl">
                        Site Reliability Engineer | DevOps Engineer | Hosted
                        Sites Creator
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
                      <Button
                        asChild
                        className="bg-example-primary hover:bg-example-accent h-12 min-w-[140px] gap-2 rounded-md px-6 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                      >
                        <a href="#" aria-label="Download resume">
                          <span>Download Resume</span>
                          <DownloadIcon className="size-5" />
                        </a>
                      </Button>
                      <Button
                        asChild
                        variant="secondary"
                        className="bg-example-secondary h-12 min-w-[140px] rounded-md px-6 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-slate-700 hover:shadow-xl"
                      >
                        <a
                          href="#projects"
                          aria-label="Jump to projects section"
                        >
                          <span className="truncate">View Projects</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            <footer className="border-example-border mt-auto w-full border-t border-solid bg-slate-900/50 px-10 py-8">
              <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
                <div>
                  <h3 className="mb-4 text-lg font-bold text-white">
                    Kilian Tyler
                  </h3>
                  <p className="text-sm text-slate-400">
                    Site Reliability Engineer & DevOps specialist. Building
                    resilient and scalable systems.
                  </p>
                </div>
                <div>
                  <h3 className="mb-4 text-lg font-bold text-white">
                    Quick Links
                  </h3>
                  <ul className="space-y-2">
                    <li>
                      <Link
                        className="hover:text-example-primary text-sm text-slate-400 transition-colors"
                        href="#about"
                      >
                        About
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="hover:text-example-primary text-sm text-slate-400 transition-colors"
                        href="#projects"
                      >
                        Projects
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="hover:text-example-primary text-sm text-slate-400 transition-colors"
                        href="/contact"
                      >
                        Contact
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-4 text-lg font-bold text-white">Connect</h3>
                  <div className="flex space-x-4">
                    <Link
                      className="hover:text-example-primary text-slate-400 transition-colors"
                      href="https://github.com/kiliantyler/"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub"
                    >
                      <GitHubIcon className="h-6 w-6" />
                    </Link>
                    <Link
                      className="hover:text-example-primary text-slate-400 transition-colors"
                      href="#"
                      aria-label="LinkedIn"
                    >
                      <LinkedInIcon className="h-6 w-6" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="border-example-border mt-8 border-t border-solid pt-8 text-center text-sm text-slate-500">
                <p>© 2024 Kilian Tyler. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
