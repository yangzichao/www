const siteData = {
    profile: {
        name: "Zichao Yang (杨 子超)",
        role: "Researcher & Developer",
        bio: "Theoretical Physics PhD. App Developer. SDE @ Mission Critical Service. Ex-Cited Researcher. Expert Lumberjack & Ordained Wedding Officiant. Building AI, or being built by it.",
        avatar: "avatar.jpg",
        social: [
            { icon: "ph-github-logo", url: "https://github.com/yangzichao", label: "GitHub" },
            { icon: "ph-linkedin-logo", url: "https://www.linkedin.com/in/zichaoyang/", label: "LinkedIn" }
        ],
        resume: {
            url: "#",
            text: "Download Resume",
            visible: true // Set to false to hide the button
        }
    },
    items: [
        {
            type: "Project",
            year: "2024",
            title: "HoAh (吼蛙)",
            description: "Fast, Local, Multilingual, and Non-Profit & Free speech-to-text for macOS.",
            image: "hoah-cover.jpg",
            url: "https://hoah.app/"
        },
        {
            type: "Paper",
            year: "2021",
            title: "β-delayed proton emission from ¹¹Be in effective field theory",
            description: "Resolved a major experimental controversy in ¹¹Be decay using Halo Effective Field Theory. Our theoretical predictions were subsequently validated by high-precision experiments at CERN, debunking previous anomalies and establishing the definitive benchmark for this rare decay channel.",
            url: "/research/11be-proton-emission/"
        }
    ],
    status: {
        title: "Current Focus",
        text: "Explaining complex systems through simple UI.",
        indicatorText: "Open to collaboration"
    },
    thoughts: [
        { title: "The future of statically generated sites", url: "#" },
        { title: "Why I switched to Rust", url: "#" }
    ],
    footer: {
        text: "Built with curiosity."
    }
};
