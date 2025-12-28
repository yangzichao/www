document.addEventListener('DOMContentLoaded', () => {
    renderContent();
});

function renderContent() {
    if (typeof siteData === 'undefined') {
        console.error('siteData is not defined. Make sure data.js is loaded.');
        return;
    }

    // --- Header ---
    setText('profile-name', siteData.profile.name);
    // Profile Bio (and role combined if needed, but bio is enough for intro)
    setText('profile-bio', siteData.profile.bio);

    // Links (Buttons)
    const socialContainer = document.getElementById('social-links');
    if (socialContainer) {
        let linksHtml = siteData.profile.social.map(item => `
            <a href="${item.url}" target="_blank" class="link-btn">
                <i class="ph ${item.icon}"></i> ${item.label}
            </a>
        `).join('');

        if (siteData.profile.resume.visible) {
            linksHtml += `
            <a href="${siteData.profile.resume.url}" target="_blank" class="link-btn">
                <i class="ph ph-file-text"></i> Resume
            </a>
            `;
        }
        socialContainer.innerHTML = linksHtml;
    }

    // --- Papers (Cards) ---
    const paperList = document.getElementById('paper-list');
    if (paperList) {
        paperList.innerHTML = siteData.papers.map(paper => `
            <a href="${paper.url}" class="card">
                <span class="card-year">${paper.year}</span>
                <h3 class="card-title">${paper.title}</h3>
                <div class="card-desc"></div> <!-- Spacer -->
                <span class="card-tag">${paper.venue}</span>
            </a>
        `).join('');
    }

    // --- Projects (Cards) ---
    const projectList = document.getElementById('project-list');
    if (projectList) {
        projectList.innerHTML = siteData.projects.map(project => `
            <a href="${project.url}" class="card">
                <h3 class="card-title">${project.title}</h3>
                <p class="card-desc">${project.description}</p>
                <span class="card-tag">View Project &rarr;</span>
            </a>
        `).join('');
    }

    // --- Footer ---
    setText('status-text', siteData.status.text + " — " + siteData.status.indicatorText);

    document.getElementById('img-year') ? document.getElementById('img-year').textContent = new Date().getFullYear() : null;
    document.getElementById('year').textContent = new Date().getFullYear();
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
