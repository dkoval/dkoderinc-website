import React, { useState, useEffect } from 'react';
import { Github, Linkedin, Twitter, Mail } from 'lucide-react';

const pageLoadTime = Date.now();

const Sidebar: React.FC = () => {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(Math.floor((Date.now() - pageLoadTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col p-4 gap-4 shrink-0"
        style={{ width: '280px', borderRight: '1px solid #005500' }}
      >
        {/* Headshot */}
        <div className="relative overflow-hidden rounded" style={{ aspectRatio: '1/1' }}>
          <img
            src="images/headshot.webp"
            alt="Dmytro Koval"
            className="w-full h-full object-cover"
            style={{ filter: 'grayscale(100%) sepia(60%) hue-rotate(80deg) saturate(200%)' }}
          />
        </div>
        {/* Name + title */}
        <div className="font-mono">
          <p className="font-bold text-lg" style={{ color: '#00FF41' }}>Dmytro Koval</p>
          <p className="text-sm" style={{ color: '#005500' }}>Senior Software Engineer</p>
        </div>
        {/* /proc/dmytro/status */}
        <div className="font-mono text-xs border rounded p-3" style={{ borderColor: '#005500', color: '#005500' }}>
          <p className="mb-1" style={{ color: '#00FF41' }}>/proc/dmytro/status</p>
          <p>Name:   Dmytro Koval</p>
          <p>Role:   Backend Engineer</p>
          <p>Exp:    15+ years</p>
          <p>Stack:  Java, Kotlin</p>
          <p>Status: available</p>
          <p>Uptime: {formatUptime(uptime)} (session)</p>
          <p style={{ color: '#005500' }}>       15y+ (career)</p>
        </div>
        {/* Social links */}
        <div className="font-mono text-xs flex flex-col gap-2">
          {[
            { href: 'https://github.com/dkoval', icon: <Github className="w-4 h-4" />, label: 'github.com/dkoval' },
            { href: 'https://linkedin.com/in/dmytrokoval', icon: <Linkedin className="w-4 h-4" />, label: 'linkedin.com/in/dmytrokoval' },
            { href: 'https://twitter.com/dkovalbuzz', icon: <Twitter className="w-4 h-4" />, label: 'twitter.com/dkovalbuzz' },
            { href: 'mailto:dkoderinc@gmail.com', icon: <Mail className="w-4 h-4" />, label: 'dkoderinc@gmail.com' },
          ].map(({ href, icon, label }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              style={{ color: '#00FF41' }}>
              {icon}
              <span className="truncate">{label}</span>
            </a>
          ))}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex md:hidden items-center gap-3 p-3 border-b" style={{ borderColor: '#005500' }}>
        <img
          src="images/headshot.webp"
          alt="Dmytro Koval"
          className="w-10 h-10 rounded-full object-cover"
          style={{ filter: 'grayscale(100%) sepia(60%) hue-rotate(80deg) saturate(200%)' }}
        />
        <span className="font-mono font-bold" style={{ color: '#00FF41' }}>Dmytro Koval</span>
        <div className="flex gap-2 ml-auto">
          {[
            { href: 'https://github.com/dkoval', icon: <Github className="w-4 h-4" /> },
            { href: 'https://linkedin.com/in/dmytrokoval', icon: <Linkedin className="w-4 h-4" /> },
            { href: 'https://twitter.com/dkovalbuzz', icon: <Twitter className="w-4 h-4" /> },
            { href: 'mailto:dkoderinc@gmail.com', icon: <Mail className="w-4 h-4" /> },
          ].map(({ href, icon }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              style={{ color: '#00FF41' }} className="hover:opacity-80">
              {icon}
            </a>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
