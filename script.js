document.addEventListener('DOMContentLoaded', () => {
    renderContent();
    setupEffects();
});

function renderContent() {
    if (typeof siteData === 'undefined') {
        console.error('siteData is not defined. Make sure data.js is loaded.');
        return;
    }

    // --- Profile ---
    setText('profile-name', siteData.profile.name);
    setText('profile-role', siteData.profile.role);
    setText('profile-bio', siteData.profile.bio);

    // Social Links
    const socialContainer = document.getElementById('social-links');
    if (socialContainer) {
        socialContainer.innerHTML = siteData.profile.social.map(item => `
            <a href="${item.url}" target="_blank" class="social-btn" aria-label="${item.label}">
                <i class="ph ${item.icon}"></i>
            </a>
        `).join('');
    }

    // Resume Button
    const actionsContainer = document.getElementById('profile-actions');
    if (actionsContainer && siteData.profile.resume.visible) {
        actionsContainer.innerHTML = `
            <a href="${siteData.profile.resume.url}" class="btn primary" target="_blank">
                ${siteData.profile.resume.text} <i class="ph ph-download-simple"></i>
            </a>
        `;
    }

    // --- Papers ---
    const paperList = document.getElementById('paper-list');
    if (paperList) {
        paperList.innerHTML = siteData.papers.map(paper => `
            <li class="paper-item">
                <span class="year">${paper.year}</span>
                <div class="paper-details">
                    <a href="${paper.url}" class="paper-title">${paper.title}</a>
                    <p class="paper-venue">${paper.venue}</p>
                </div>
            </li>
        `).join('');
    }

    // --- Projects ---
    const projectList = document.getElementById('project-list');
    if (projectList) {
        projectList.innerHTML = siteData.projects.map(project => `
            <a href="${project.url}" class="project-card">
                <div class="project-icon"><i class="ph ${project.icon}"></i></div>
                <div class="project-info">
                    <h3>${project.title}</h3>
                    <p>${project.description}</p>
                </div>
            </a>
        `).join('');
    }

    // --- Status ---
    setText('status-title', siteData.status.title);
    setText('status-text', siteData.status.text);
    setText('status-indicator-text', siteData.status.indicatorText);

    // --- Thoughts ---
    const thoughtsList = document.getElementById('thoughts-list');
    if (thoughtsList) {
        thoughtsList.innerHTML = siteData.thoughts.map(thought => `
             <li><a href="${thought.url}">${thought.title}</a></li>
        `).join('');
    }

    // --- Footer ---
    document.getElementById('img-year') ? document.getElementById('img-year').textContent = new Date().getFullYear() : null; // Safety check
    document.getElementById('year').textContent = new Date().getFullYear();
    setText('footer-name', siteData.profile.name);
    setText('footer-text', siteData.footer.text);
}

// Helper to safely set text content
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setupEffects() {
    // Add subtle parallax effect to background gradient
    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        const gradient = document.querySelector('.background-gradient');
        if (gradient) {
            gradient.style.transform = `translate(${x * -20}px, ${y * -20}px)`;
        }
    });

    // Hover 3D effect to cards
    const cards = document.querySelectorAll('.glass');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate rotation
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -2; // Max 2 degrees
            const rotateY = ((x - centerX) / centerX) * 2;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            card.style.transition = 'transform 0.5s ease';
        });

        card.addEventListener('mouseenter', () => {
            card.style.transition = 'none'; // Remove transition for instant follow
        });
    });
}
