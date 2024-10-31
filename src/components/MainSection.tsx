import React from 'react';
import Terminal from './Terminal';
import AboutMe from './AboutMe';

const whoAmI = "Dmytro Koval"
const headshotImage = "images/dmytro_koval_headshot.jpg"

const summary = [
  "I am a seasoned software engineer with over 15 years of experience in the industry. \
  I specialize in backend development using a wide range of open-source technologies in Java and Kotlin.",
  "My expertise lies in building robust, scalable, and efficient server-side applications, \
  but I am genuinely interested in any intellectually engaging engineering problem."
]

const skills = [
  "Java and Kotlin programming languages",
  "Microservices and distributed systems",
  "API design and integration",
  "Concurrent, latency-sensitive applications",
  "Event-driven architecture",
  "Technical leadership"
]

const MainSection: React.FC = () => {
  return (
    <main className="flex-grow container mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6">
      <div className="bg-gray-800 bg-opacity-80 p-4 sm:p-8 rounded-lg shadow-lg flex-grow">
        <AboutMe 
          whoAmI={whoAmI}
          headshotImage={headshotImage}
          summary={summary}
          skills={skills}
        />
        <Terminal />
      </div>
    </main>
  );
};

export default MainSection;
