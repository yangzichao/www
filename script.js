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
    // Profile Bio
    setText('profile-bio', siteData.profile.bio);

    // Profile Avatar
    const avatarImg = document.getElementById('profile-avatar');
    if (avatarImg && siteData.profile.avatar) {
        avatarImg.src = siteData.profile.avatar;
        avatarImg.style.display = 'block';
    }

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

    // --- Unified Work List ---
    const workList = document.getElementById('work-list');
    if (workList && siteData.items) {
        workList.innerHTML = siteData.items.map(item => {
            // Optional Image
            const imageHtml = item.image ?
                `<div class="card-image-container">
                    <img src="${item.image}" class="card-image" loading="lazy" alt="${item.title}">
                 </div>` : '';

            // Adjust grid content padding class based on image presence
            const contentClass = item.image ? 'card-content' : 'card-content-only';

            return `
            <a href="${item.url}" class="card">
                ${imageHtml}
                <div class="${contentClass}">
                    <div style="margin-bottom:12px;">
                        <span class="card-year">${item.year}</span>
                        <span class="card-tag-inline" style="font-size:0.8rem; color:#666; margin-left:8px;">${item.type}</span>
                    </div>
                    <h3 class="card-title">${item.title}</h3>
                    <p class="card-desc">${item.description}</p>
                </div>
            </a>
            `;
        }).join('');
    }

    // --- Footer ---
    // Status text removed per request

    document.getElementById('img-year') ? document.getElementById('img-year').textContent = new Date().getFullYear() : null;
    document.getElementById('year').textContent = new Date().getFullYear();
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
