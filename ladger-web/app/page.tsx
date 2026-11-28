import { Header } from "@/components/Header";
import { Features, FinalCta, Install, Steps } from "@/components/Sections";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Features />
        <Steps />
        <Install />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
