import Hero from './sections/Hero/Hero';
import Process from './sections/Process/Process';
import Services from './sections/Services/Services';
import Testimonials from './sections/Testimonials/Testimonials';
import Contact from './sections/Contact/Contact';
export default function HomePage({ onApply }) {
  return (
    <main>
      <Hero />
      <Process />
      <Services />
      <Testimonials />
      <Contact onApply={onApply} />
    </main>
  );
}
