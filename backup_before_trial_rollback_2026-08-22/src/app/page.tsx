import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/hero/Hero";
import FeatureCard from "@/components/hero/FeatureCard";
import TrustBanner from "@/components/hero/TrustBanner";
import Footer from "@/components/layout/Footer";
import CareerJourney from "@/components/career/CareerJourney";
import FeaturedCourses from "@/components/featured-courses/FeaturedCourses";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
     <FeatureCard />
      <CareerJourney />
      <TrustBanner />
           <Footer />
    </>
  );
}