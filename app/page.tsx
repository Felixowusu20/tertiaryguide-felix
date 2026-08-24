import { Suspense } from "react";
import { ServicesSection } from "./components/ServicesSection";
import { ProgramSearchPromo } from "./components/ProgramSearchPromo";
import { FindCompareCoursesSection } from "./components/FindCompareCoursesSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { BlogSection } from "./components/BlogSection";
import { FaqSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { HeroSlider } from "./components/HeroSlider";
import { ApproachingDeadlinesSection } from "./components/ApproachingDeadlinesSection";
import { AdsSection } from "./components/AdsSection";
import { HomeShell } from "./components/HomeShell";

function HomeTabContent() {
  return (
    <>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-4 md:gap-8 md:px-10 md:py-6">
        <HeroSlider />
      </div>

      <FindCompareCoursesSection />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10">
        <ApproachingDeadlinesSection />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10">
        <AdsSection />
      </div>

      <ServicesSection />
      <ProgramSearchPromo />
      <TestimonialsSection />
      <BlogSection />
      <FaqSection />
    </>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <Header />

      <Suspense fallback={<div className="min-h-[40vh] animate-pulse bg-white" />}>
        <HomeShell homeContent={<HomeTabContent />} />
      </Suspense>

      <Footer />
    </div>
  );
}
