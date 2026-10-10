import { Nav } from "@/components/Nav";
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
      <main>
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
