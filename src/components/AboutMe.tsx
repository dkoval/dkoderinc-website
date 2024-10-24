import React from 'react';
import { Code2 } from 'lucide-react';

const AboutMe: React.FC = () => {
  return (
    <section className="w-full mb-8 flex flex-col md:flex-row gap-6">
      <div className="md:w-1/3">
        <div className="w-full aspect-square bg-gray-700 rounded-lg mb-4 overflow-hidden">
          <img
            src="images/dmytro_koval_headshot.jpg"
            alt="Dmytro Koval"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="md:w-2/3 font-mono font-argon">
        <div className="bg-black p-4 rounded-lg text-green-400">
          <p className="mb-2">$ cat about_dmytro_koval.txt</p>
          <div className="text-blue-300">
            <p className="mb-2">Hi, my name is ...</p>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-yellow-400">
              Dmytro Koval
            </h2>
            <p className="mb-4 text-sm sm:text-base">
              I am a seasoned software engineer with over 15 years of experience
              in the industry. I specialize in backend development using a wide
              range of open-source technologies in Java and Kotlin.
            </p>
            <p className="mb-4 text-sm sm:text-base">
              My expertise lies in building robust, scalable, and efficient
              server-side applications, but I am genuinely interested in any
              engineering problem that is intellectually challenging.
            </p>
          </div>
          <p className="mb-2 mt-4">$ ls skills/</p>
          <ul className="list-none text-blue-300 text-sm sm:text-base">
            <li className="flex items-center mb-1">
              <Code2 className="inline-block mr-2 text-yellow-400 w-5 h-5" />
              Java and Kotlin programming languages
            </li>
            <li className="flex items-center mb-1">
              <Code2 className="inline-block mr-2 text-yellow-400 w-5 h-5" />
              Microservices and distributed systems
            </li>
            <li className="flex items-center mb-1">
              <Code2 className="inline-block mr-2 text-yellow-400 w-5 h-5" />
              API design and integration
            </li>
            <li className="flex items-center mb-1">
              <Code2 className="inline-block mr-2 text-yellow-400 w-5 h-5" />
              Concurrent, latency-sensitive applications
            </li>
            <li className="flex items-center mb-1">
              <Code2 className="inline-block mr-2 text-yellow-400 w-5 h-5" />
              Event-driven architecture
            </li>
            <li className="flex items-center mb-1">
              <Code2 className="inline-block mr-2 text-yellow-400 w-5 h-5" />
              Apache Kafka and Kafka Streams
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default AboutMe;
