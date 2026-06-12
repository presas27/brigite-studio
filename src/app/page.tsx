import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Plans } from "@/components/sections/Plans";
import { Work } from "@/components/sections/Work";
import { TestimonialBanner } from "@/components/sections/TestimonialBanner";
import { FAQ } from "@/components/sections/FAQ";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <About />
        <Plans />
        <Work />
        <TestimonialBanner />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
