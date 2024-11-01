import React, { useState, useEffect } from 'react';
import { Code2, Terminal } from 'lucide-react';

type AboutMeProps = {
  whoAmI: string;
  headshotImage: string;
  summary: string[];
  skills: string[];
};

const FakeImageLoader: React.FC = () => {
  return (
    <div className="absolute inset-0 flex flex-col p-4 font-mono text-sm">
      <div className="flex items-center gap-2 text-green-400 mb-2">
        <Terminal className="w-4 h-4" />
        <span>load_image.sh headshot.webp</span>
      </div>
      <div className="text-green-400 typewriter-effect">
        <p className="mt-1">loading image...</p>
        <p className="mt-1">[====================] 100%</p>
        <p className="mt-1 text-green-400">chmod 644 headshot.web</p>
        <p className="mt-1 text-green-400">cat headshot.webp &gt; /dev/display</p>
        <div className="mt-2 animate-blink">_</div>
      </div>
    </div>
  );
};

const AboutMe: React.FC<AboutMeProps> = ({ whoAmI, headshotImage, summary, skills }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (imageLoaded) {
      // set delay to 1.5 seconds for a snappier experience
      const timer = setTimeout(() => {
        setShowImage(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [imageLoaded]);

  return (
    <section className="w-full mb-8 flex flex-col md:flex-row gap-6">
      <div className="md:w-1/3">
        <div className="relative w-full aspect-[4/5] md:aspect-square bg-gray-900 rounded-lg mb-4 overflow-hidden">
          {!showImage && <FakeImageLoader />}
          <div
            className="absolute inset-0 bg-cover bg-center blur-lg scale-110 transition-opacity duration-500 opacity-0"
            style={{
              backgroundImage: `url(${headshotImage}?quality=1&width=50)`,
            }}
          />
          <picture>
            <source
              media="(min-width: 768px)"
              srcSet={`${headshotImage}?width=400 1x, ${headshotImage}?width=800 2x`}
            />
            <source
              srcSet={`${headshotImage}?width=300 1x, ${headshotImage}?width=600 2x`}
            />
            <img
              src={`${headshotImage}?width=400`}
              alt={whoAmI}
              width={400}
              height={400}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${showImage ? 'opacity-100' : 'opacity-0'}`}
            />
          </picture>
        </div>
      </div>
      <div className="md:w-2/3 font-mono font-argon">
        <div className="bg-black p-4 rounded-lg text-green-400">
          <p className="mb-2 text-sm sm:text-base">$ cat about_me.txt</p>
          <div className="text-gray-200">
            <p className="mb-2 text-sm sm:text-base">Hi, my name is ...</p>
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-yellow-400">
              {whoAmI}
            </h2>
            {summary.map((paragraph, index) => (
              <p key={index} className="mb-4 text-sm sm:text-base">
                {paragraph}
              </p>
            ))}
          </div>
          <p className="mb-2 mt-4 text-sm sm:text-base">$ ls skills/</p>
          <ul className="list-none text-gray-200">
            {skills.map((skill, index) => (
              <li key={index} className="flex items-center mb-1 text-sm sm:text-base">
                <Code2 className="inline-block mr-2 text-yellow-400 w-4 h-4 sm:w-5 sm:h-5" />
                {skill}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default AboutMe;
