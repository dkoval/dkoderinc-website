import React, { useState, useEffect } from 'react';
import { Github, Linkedin, Twitter, Mail } from 'lucide-react';
import { PAGE_LOAD_TIME, formatUptime } from '../constants';
import { useTheme } from '../ThemeContext';

const Sidebar: React.FC = () => {
  const [uptime, setUptime] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(Math.floor((Date.now() - PAGE_LOAD_TIME) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const headshotFilter = theme === 'amber'
    ? 'grayscale(100%) sepia(80%) saturate(200%)'
    : theme === 'white'
    ? 'grayscale(100%)'
    : 'grayscale(100%) sepia(60%) hue-rotate(80deg) saturate(200%)';


  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col p-4 gap-4 shrink-0 overflow-hidden"
        style={{ width: '280px', borderRight: '1px solid var(--terminal-border)' }}
      >
        {/* Headshot */}
        <div className="relative overflow-hidden rounded" style={{ aspectRatio: '1/1' }}>
          <img
            src="images/headshot.webp"
            alt="Dmytro Koval"
            className="w-full h-full object-cover"
            style={{ filter: headshotFilter }}
          />
        </div>
        {/* Name + title */}
        <div className="font-mono">
          <p className="font-bold text-lg" style={{ color: 'var(--terminal-primary)' }}>Dmytro Koval</p>
          <p className="text-sm" style={{ color: 'var(--terminal-gray)' }}>Senior Software Engineer</p>
        </div>
        {/* /proc/dmytro/status */}
        <div className="font-mono text-sm border rounded p-3" style={{ borderColor: 'var(--terminal-border)' }}>
          <p className="mb-2" style={{ color: 'var(--terminal-gray)' }}>/proc/dmytro/status</p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Name:   </span><span style={{ color: 'var(--terminal-primary)' }}>Dmytro Koval</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Role:   </span><span style={{ color: 'var(--terminal-primary)' }}>Backend Engineer</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Exp:    </span><span style={{ color: 'var(--terminal-primary)' }}>15+ years</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Stack:  </span><span style={{ color: 'var(--terminal-primary)' }}>Java, Kotlin</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Status: </span><span style={{ color: 'var(--terminal-primary)' }}>available</span></p>
          <p><span style={{ color: 'var(--terminal-gray)' }}>Uptime: </span><span style={{ color: 'var(--terminal-primary)' }}>{formatUptime(uptime)}</span></p>
        </div>
        {/* Social links as known_hosts */}
        <div className="font-mono text-sm border rounded p-3" style={{ borderColor: 'var(--terminal-border)' }}>
          <p className="mb-2" style={{ color: 'var(--terminal-gray)' }}>~/.ssh/known_hosts</p>
          {[
            { href: 'https://github.com/dkoval', icon: <Github className="w-3 h-3" />, label: 'github.com' },
            { href: 'https://linkedin.com/in/dmytrokoval', icon: <Linkedin className="w-3 h-3" />, label: 'linkedin.com' },
            { href: 'https://twitter.com/dkovalbuzz', icon: <Twitter className="w-3 h-3" />, label: 'twitter.com' },
            { href: 'mailto:dkoderinc@gmail.com', icon: <Mail className="w-3 h-3" />, label: 'dkoderinc@gmail.com' },
          ].map(({ href, icon, label }) => (
            <a key={href} href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mb-1 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--terminal-primary)' }}>
              {icon}
              <span>{label}</span>
            </a>
          ))}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex md:hidden items-center gap-3 p-3 border-b" style={{ borderColor: 'var(--terminal-border)' }}>
        <img
          src="images/headshot.webp"
          alt="Dmytro Koval"
          className="w-10 h-10 rounded-full object-cover"
          style={{ filter: headshotFilter }}
        />
        <span className="font-mono font-bold" style={{ color: 'var(--terminal-primary)' }}>Dmytro Koval</span>
        <div className="flex gap-2 ml-auto">
          {[
            { href: 'https://github.com/dkoval', icon: <Github className="w-4 h-4" /> },
            { href: 'https://linkedin.com/in/dmytrokoval', icon: <Linkedin className="w-4 h-4" /> },
            { href: 'https://twitter.com/dkovalbuzz', icon: <Twitter className="w-4 h-4" /> },
            { href: 'mailto:dkoderinc@gmail.com', icon: <Mail className="w-4 h-4" /> },
          ].map(({ href, icon }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--terminal-primary)' }} className="hover:opacity-80">
              {icon}
            </a>
          ))}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
