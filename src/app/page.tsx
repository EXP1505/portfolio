import { Nav } from "@/components/Nav";
import { SceneBackdrop } from "@/components/hero/SceneBackdrop";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Systems } from "@/components/sections/Systems";
import { Projects } from "@/components/sections/Projects";
import { VyominCaseStudy } from "@/components/sections/VyominCaseStudy";
import { Fincraft } from "@/components/sections/Fincraft";
import { CompetitiveProgramming } from "@/components/sections/CompetitiveProgramming";
import { Contact, Footer } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      {/* Desktop: the hangar scene, then its blurred still, fixed behind the whole page. */}
      <SceneBackdrop />
      <main className="relative z-10">
        <Hero />
        <About />
        <Systems />
        <Projects />
        <VyominCaseStudy />
        <Fincraft />
        <CompetitiveProgramming />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
