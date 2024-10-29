import React from 'react';
import { Terminal } from 'lucide-react';

const LoadingTerminal: React.FC = () => {
  return (
    <div className="absolute inset-0 flex flex-col p-4 font-mono text-sm">
      <div className="flex items-center gap-2 text-green-400 mb-2">
        <Terminal className="w-4 h-4" />
        <span>loading_image.sh headshot.jpg</span>
      </div>
      <div className="text-green-400 typewriter-effect">
        <p>$ loading profile image...</p>
        <p className="mt-1">[====================] 100%</p>
        <p className="mt-1 text-yellow-400">chmod 644 headshot.jpg</p>
        <p className="mt-1 text-blue-400">cat headshot.jpg &gt; /dev/display</p>
        <div className="mt-2 animate-pulse">_</div>
      </div>
    </div>
  );
};

export default LoadingTerminal;
