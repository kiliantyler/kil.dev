import { LinkButton } from "@/components/ui/link-button";
import Headshot from "@/images/cartoon-headshot.jpg";
import { CONTENT } from "@/lib/constants";
import Image from "next/image";

function ProfileImage() {
  return (
    <div className="group relative order-1 mx-auto w-full max-w-md lg:order-2 lg:mx-0">
      <div className="border-example-primary absolute -top-4 -left-4 h-full w-full -rotate-3 rounded-lg border-4 transition-transform duration-500 group-hover:rotate-0" />
      <div className="relative h-auto w-full rounded-lg bg-cover bg-center bg-no-repeat shadow-2xl">
        <Image
          alt={`${CONTENT.NAME} headshot`}
          src={Headshot}
          className="rounded-lg transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105"
          loading="lazy"
          width={500}
          height={500}
        />
      </div>
    </div>
  );
}

function HeroContent() {
  return (
    <div className="order-2 flex flex-col gap-6 lg:order-1">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl leading-tight font-black tracking-tight text-white md:text-6xl">
          {CONTENT.NAME}
        </h1>
        <p className="text-example-primary text-lg font-semibold md:text-xl">
          {CONTENT.TITLE}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
        <LinkButton
          href="#"
          className="bg-example-primary hover:bg-example-accent h-12 min-w-[140px] gap-2 rounded-md px-6 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          aria-label="View resume"
        >
          <span>View Resume</span>
        </LinkButton>
        <LinkButton
          href="#projects"
          variant="secondary"
          className="bg-example-secondary h-12 min-w-[140px] rounded-md px-6 text-base font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-slate-700 hover:shadow-xl"
          aria-label="Jump to projects section"
        >
          <span className="truncate">View Projects</span>
        </LinkButton>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <main className="flex flex-1 items-center px-10 py-20 md:px-20 lg:px-40">
      <div className="w-full text-center lg:text-left">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          <ProfileImage />
          <HeroContent />
        </div>
      </div>
    </main>
  );
}

export { Hero, HeroContent, ProfileImage };
