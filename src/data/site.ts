export type SocialLink = {
  icon: string;
  url: string;
  label: string;
};

export type Resume = {
  url: string;
  text: string;
  visible: boolean;
};

export type Profile = {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  social: SocialLink[];
  resume: Resume;
};

export type WorkItemType = 'Project' | 'Paper';

export type WorkItem = {
  type: WorkItemType;
  year: string;
  title: string;
  description: string;
  image?: string;
  url: string;
};

export type Status = {
  title: string;
  text: string;
  indicatorText: string;
};

export type ThoughtLink = {
  title: string;
  url: string;
};

export type FooterConfig = {
  text: string;
};

export type SiteData = {
  profile: Profile;
  items: WorkItem[];
  status: Status;
  thoughts: ThoughtLink[];
  footer: FooterConfig;
};

export const siteData: SiteData = {
  profile: {
    name: 'Zichao Yang (杨 子超)',
    role: 'Researcher & Developer',
    bio: 'Theoretical Physics PhD. App Developer. SDE @ Mission Critical Service. Ex-Cited Researcher. Expert Lumberjack & Ordained Wedding Officiant. Building AI, or being built by it.',
    avatar: '/avatar.jpg',
    social: [
      { icon: 'ph-github-logo', url: 'https://github.com/yangzichao', label: 'GitHub' },
      { icon: 'ph-linkedin-logo', url: 'https://www.linkedin.com/in/zichaoyang/', label: 'LinkedIn' },
    ],
    resume: {
      // TODO: 占位,待填入真实简历链接
      url: '#',
      text: 'Download Resume',
      visible: true,
    },
  },
  items: [
    {
      type: 'Project',
      year: '2024',
      title: 'HoAh (吼蛙)',
      description:
        'Fast, Local, Multilingual, and Non-Profit & Free speech-to-text for macOS.',
      image: '/hoah-cover.jpg',
      url: 'https://hoah.app/',
    },
    {
      type: 'Paper',
      year: '2021',
      title: 'β-delayed proton emission from ¹¹Be in effective field theory',
      description:
        'Resolved a major experimental controversy in ¹¹Be decay using Halo Effective Field Theory. Our theoretical predictions were subsequently validated by high-precision experiments at CERN, debunking previous anomalies and establishing the definitive benchmark for this rare decay channel.',
      url: '/blog/physics/11be-proton-emission/',
    },
  ],
  status: {
    title: 'Current Focus',
    text: 'Explaining complex systems through simple UI.',
    indicatorText: 'Open to collaboration',
  },
  // TODO: 占位,thoughts/blog 模块待启用(目前 UI 未渲染)
  thoughts: [
    { title: 'The future of statically generated sites', url: '#' },
    { title: 'Why I switched to Rust', url: '#' },
  ],
  footer: {
    text: 'Built with curiosity.',
  },
};
