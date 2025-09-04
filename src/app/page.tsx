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
    <div
      className={`${spaceGrotesk.variable} ${notoSans.variable}`}
      style={{
        ["--primary-color" as any]: "#03a9f4",
        ["--secondary-color" as any]: "#1e293b",
        ["--accent-color" as any]: "#0ea5e9",
        ["--background-color" as any]: "#0f172a",
        ["--text-color" as any]: "#e2e8f0",
        ["--border-color" as any]: "#334155",
      }}
    >
      <div
        className="relative min-h-screen bg-(--background-color) text-(--text-color)"
        style={{
          fontFamily:
            "var(--font-space-grotesk), var(--font-noto-sans), ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji",
        }}
      >
        <div
          className="absolute inset-0 z-0"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(30,41,59,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,41,59,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            backgroundPosition: "-1px -1px",
          }}
        />
        <div
          className="absolute inset-0 z-10 bg-linear-to-b from-transparent to-(--background-color)"
          aria-hidden
        />
        <div className="relative z-20 flex size-full flex-col overflow-x-hidden">
          <div className="layout-container flex h-full grow flex-col">
            <header className="flex items-center justify-between border-b border-solid border-(--border-color) px-10 py-5 whitespace-nowrap">
              <div className="flex items-center gap-3 text-white">
                <div
                  className="aspect-square size-12 rounded-full bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage:
                      "url(https://lh3.googleusercontent.com/aida-public/AB6AXuDL-Kljo54ODUhUxDBz0oabZ2ghbmfPPPh5NYtLhsmfMJHEAts9dK4lOoKMlHJYwXzDBRDmuC_vCcykQGg8cUBOdLs6Yi64qUDQvtspNO1FhkHPPNPaG18XDMevZIGwFMzmyizgImDedgjCFw9hVBf97y8t4I4Q9pw8xLTgtUvM8m0Z6Iw1Cg7WZZHWukAGZVAs6TIoBkfQ83J1LCuEN65wDKIKOhx0bhawX3NfQvtltWobM0X5py9sQHHyA9Un5ykIGWjoSKKEtsPW)",
                  }}
                  role="img"
                  aria-label="Kilian Tyler headshot"
                />
                <h2 className="text-xl leading-tight font-bold text-white">
                  Kilian Tyler
                </h2>
              </div>
              <nav
                className="hidden items-center gap-8 md:flex"
                aria-label="Primary"
              >
                <a
                  className="text-sm font-medium text-slate-300 transition-colors hover:text-(--primary-color)"
                  href="#about"
                >
                  About
                </a>
                <a
                  className="text-sm font-medium text-slate-300 transition-colors hover:text-(--primary-color)"
                  href="#projects"
                >
                  Projects
                </a>
                <Link
                  className="text-sm font-medium text-slate-300 transition-colors hover:text-(--primary-color)"
                  href="/contact"
                  aria-label="Go to contact page"
                >
                  Contact
                </Link>
              </nav>
              <a
                className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg bg-(--secondary-color) px-4 text-sm font-bold text-white transition-colors hover:bg-(--accent-color)"
                href="https://github.com/kiliantyler/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Kilian's GitHub profile in a new tab"
              >
                <svg
                  fill="currentColor"
                  height="20"
                  viewBox="0 0 256 256"
                  width="20"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path d="M208.31,75.68A59.78,59.78,0,0,0,202.93,28,8,8,0,0,0,196,24a59.75,59.75,0,0,0-48,24H124A59.75,59.75,0,0,0,76,24a8,8,0,0,0-6.93,4,59.78,59.78,0,0,0-5.38,47.68A58.14,58.14,0,0,0,56,104v8a56.06,56.06,0,0,0,48.44,55.47A39.8,39.8,0,0,0,96,192v8H72a24,24,0,0,1-24-24A40,40,0,0,0,8,136a8,8,0,0,0,0,16,24,24,0,0,1,24,24,40,40,0,0,0,40,40H96v16a8,8,0,0,0,16,0V192a24,24,0,0,1,48,0v40a8,8,0,0,0,16,0V192a39.8,39.8,0,0,0-8.44-24.53A56.06,56.06,0,0,0,216,112v-8A58.14,58.14,0,0,0,208.31,75.68ZM200,112a40,40,0,0,1-40,40H112a40,40,0,0,1-40-40v-8a41.74,41.74,0,0,1,6.9-22.48A8,8,0,0,0,80,73.83a43.81,43.81,0,0,1,.79-33.58,43.88,43.88,0,0,1,32.32,20.06A8,8,0,0,0,119.82,64h32.35a8,8,0,0,0,6.74-3.69,43.87,43.87,0,0,1,32.32-20.06A43.81,43.81,0,0,1,192,73.83a8.09,8.09,0,0,0,1,7.65A41.72,41.72,0,0,1,200,104Z" />
                </svg>
                <span className="hidden md:inline">GitHub</span>
              </a>
            </header>

            <main className="flex flex-1 items-center px-10 py-20 md:px-20 lg:px-40">
              <div className="w-full text-center lg:text-left">
                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
                  <div className="relative order-1 mx-auto w-full max-w-md lg:order-2 lg:mx-0">
                    <div className="absolute -top-4 -left-4 h-full w-full -rotate-3 rounded-lg border-4 border-(--primary-color) transition-transform duration-500 hover:rotate-0" />
                    <div className="relative h-auto w-full rounded-lg bg-cover bg-center bg-no-repeat shadow-2xl">
                      <Image
                        alt="Kilian Tyler headshot"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFvwFvdX5-j3kLLkI-wXEbFy8oyOG0ezsruGyeYR1CkOfTp1uq8QD8byb2mAA4pIAy8gITiJgXcoF1gIqSx70oOPYigcYLKB925Q4ptJ6M94kwKV-9zbntwJNVPmOVjN7M1V5fuPKG8doKBsB_COzzw6QvQOLLm9X1q-_b_RK6XzPpsf86fUaGqMX-r6GyRKev8YxC2UKtxFdveHjiTTG6vyBGI1yuUeSFTYyNhXvj5mTC7IQ8PwbEQ3mgFaE5xomlQMKxFLpaPKzS"
                        className="rounded-lg"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  <div className="order-2 flex flex-col gap-6 lg:order-1">
                    <div className="flex flex-col gap-2">
                      <h1 className="text-5xl leading-tight font-black tracking-tight text-white md:text-6xl">
                        Kilian Tyler
                      </h1>
                      <p className="text-lg font-semibold text-(--primary-color) md:text-xl">
                        Site Reliability Engineer | DevOps Engineer | Hosted
                        Sites Creator
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
                      <a
                        className="flex h-12 min-w-[140px] items-center justify-center gap-2 overflow-hidden rounded-md bg-(--primary-color) px-6 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-(--accent-color) hover:shadow-xl"
                        href="#"
                        aria-label="Download resume"
                      >
                        <span>Download Resume</span>
                        <svg
                          fill="currentColor"
                          height="20"
                          viewBox="0 0 256 256"
                          width="20"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          <path d="M213.66,122.34a8,8,0,0,1-11.32,0L136,56,68.66,122.34a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,213.66,122.34Zm-99.32,29.32a8,8,0,0,0-11.32,0L36.66,218.34a8,8,0,0,0,11.32,11.32L128,153.31l79.31,76.35a8,8,0,0,0,11.32-11.32Z" />
                        </svg>
                      </a>
                      <a
                        className="flex h-12 min-w-[140px] items-center justify-center overflow-hidden rounded-md bg-(--secondary-color) px-6 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-slate-700 hover:shadow-xl"
                        href="#projects"
                        aria-label="Jump to projects section"
                      >
                        <span className="truncate">View Projects</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            <footer className="mt-auto w-full border-t border-solid border-(--border-color) bg-slate-900/50 px-10 py-8">
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
                      <a
                        className="text-sm text-slate-400 transition-colors hover:text-(--primary-color)"
                        href="#about"
                      >
                        About
                      </a>
                    </li>
                    <li>
                      <a
                        className="text-sm text-slate-400 transition-colors hover:text-(--primary-color)"
                        href="#projects"
                      >
                        Projects
                      </a>
                    </li>
                    <li>
                      <Link
                        className="text-sm text-slate-400 transition-colors hover:text-(--primary-color)"
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
                    <a
                      className="text-slate-400 transition-colors hover:text-(--primary-color)"
                      href="https://github.com/kiliantyler/"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </a>
                    <a
                      className="text-slate-400 transition-colors hover:text-(--primary-color)"
                      href="#"
                      aria-label="LinkedIn"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-8 border-t border-solid border-(--border-color) pt-8 text-center text-sm text-slate-500">
                <p>© 2024 Kilian Tyler. All rights reserved.</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
