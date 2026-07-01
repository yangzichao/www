type SocialLink = {
  icon: string;
  url: string;
  label: string;
};

type Resume = {
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

type WorkItemType = 'Project' | 'Paper';

export type WorkItem = {
  type: WorkItemType;
  year: string;
  title: string;
  description: string;
  image?: string;
  url: string;
};

type SiteData = {
  profile: Profile;
  items: WorkItem[];
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
      year: '2026',
      title: 'Quaternion Rotation Lab',
      description:
        'An interactive 3D teaching lab for quaternion rotations, SLERP, the SU(2) double cover, Pauli matrices, and Bloch-sphere motion.',
      // Moved to the dedicated lab subdomain (yangzichao/lab).
      url: 'https://lab.zichaoyang.com/quaternions/',
    },
    {
      type: 'Project',
      year: '2026',
      title: 'Physics Simulation Lab',
      description:
        'Three browser-based simulations in one lab: double pendulum chaos, central-force orbital mechanics, and two-source wave interference with live controls and canvas rendering.',
      // Moved to the dedicated lab subdomain (yangzichao/lab).
      url: 'https://lab.zichaoyang.com/physics-simulations/',
    },
    {
      type: 'Project',
      year: '2026',
      title: 'Feynman Diagram Editor',
      description:
        'A browser-based take on JaxoDraw: draw Feynman diagrams with click-and-drag — fermion, photon, gluon, scalar and ghost propagators, arcs, loops and LaTeX labels — then export to axodraw2 LaTeX, SVG or PNG. Runs entirely in your browser.',
      // Split out into its own repo + subdomain (yangzichao/feynman-editor).
      url: 'https://feynman.zichaoyang.com/',
    },
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
};
