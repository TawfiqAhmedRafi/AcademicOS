import Navbar from "./components/Navbar";
import Footer from "./components/Footer"; // Use the one from the previous step
import Hero from "./components/home/Hero";
import TrustBar from "./components/home/TrustBar";
import Features from "./components/home/Features";
import FinalCTA from "./components/home/FinalCTA";
import RoleBasedAccess from "./components/home/RoleBasedAccess";
import HowItWorks from "./components/home/HowItWorks";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col selection:bg-ruet-gold selection:text-black">
      <Navbar />
      
      <main className="flex-1 w-full">
        <Hero />
        <TrustBar />
        <Features />
        <HowItWorks />
        <RoleBasedAccess />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}