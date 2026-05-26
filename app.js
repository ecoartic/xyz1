/**
 * AETHER - Scroll-Driven Video Playback Controller (Multi-Campaign)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Detect active campaign route via ?page= URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const activePageId = urlParams.get('page') || 'default';

    // DOM Elements
    const video = document.getElementById('scroll-video');
    const loader = document.getElementById('loader');
    const progressBar = document.querySelector('.loader-progress');
    const navContainer = document.getElementById('nav-links-container');
    const trackerContainer = document.getElementById('scroll-tracker-container');
    const sectionsContainer = document.getElementById('scroll-sections-container');
    const socialContainer = document.getElementById('social-links-container');

    // Dynamic Variables (default fallbacks)
    let startVideoTime = 1.0;
    let endVideoTime = 27.0;
    let scrollSmoothing = 0.08;
    let targetTime = 1.0;
    let currentTime = 1.0;

    // Track all registered campaign IDs
    let allCampaignIds = [];

    // Helper to resolve URLs that could refer to internal virtual campaigns
    function resolveUrl(url) {
        if (!url) return '#';
        let trimmed = url.trim();

        // Check if it's a full URL to our site or page query
        try {
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                const parsedUrl = new URL(trimmed);
                if (parsedUrl.host === window.location.host) {
                    const pageParam = parsedUrl.searchParams.get('page');
                    if (pageParam && allCampaignIds.includes(pageParam)) {
                        return pageParam === 'default' ? '/' : `/?page=${pageParam}`;
                    }
                    if (parsedUrl.pathname === '/' && !pageParam) {
                        return '/';
                    }
                }
            }
        } catch (e) {
            // Fail silent
        }

        // If it starts with standard web schemes, mailto, tel, anchor link, it's external or hash
        if (trimmed.startsWith('http://') || 
            trimmed.startsWith('https://') || 
            trimmed.startsWith('//') || 
            trimmed.startsWith('#') || 
            trimmed.startsWith('mailto:') || 
            trimmed.startsWith('tel:')) {
            return trimmed;
        }

        // Check if the trimmed string is a campaign ID
        if (allCampaignIds.includes(trimmed)) {
            return trimmed === 'default' ? '/' : `/?page=${trimmed}`;
        }

        // Check if it matches a query parameter like ?page=note or /?page=note
        const paramMatch = trimmed.match(/[?&]page=([^&]+)/);
        if (paramMatch && allCampaignIds.includes(paramMatch[1])) {
            return paramMatch[1] === 'default' ? '/' : `/?page=${paramMatch[1]}`;
        }

        return trimmed;
    }

    // References to dynamically rendered elements
    let sections = [];
    let dots = [];
    let navItems = [];



    // Load progress loader simulation variables
    let loadProgress = 0;
    let progressInterval;

    // Premium Social SVG Icons
    const socialSVGs = {
        instagram: `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
        twitter: `<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
        youtube: `<svg viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
        facebook: `<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
        github: `<svg viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
        telegram: `<svg viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.702.064-1.235-.464-1.916-.911-1.065-.7-1.666-1.136-2.698-1.815-1.192-.785-.42-1.216.26-1.922.178-.185 3.275-3.003 3.335-3.259.008-.032.014-.15-.056-.213-.07-.062-.173-.04-.247-.024-.105.023-1.782 1.132-5.048 3.334-.479.329-.913.49-1.302.481-.429-.009-1.254-.242-1.868-.442-.753-.244-1.351-.374-1.299-.79.027-.217.327-.44.9-.668 3.518-1.531 5.865-2.54 7.042-3.028 3.35-1.393 4.045-1.636 4.5-.164.099.034.22.098.243.232a.294.294 0 01.012.164z"/></svg>`,
        linkedin: `<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/></svg>`
    };

    // 2. Public site must not trust stale localStorage config
// Always load the source of truth from the server.

// 3. Fetch Configuration from Server
    fetch('/api/config?t=' + Date.now())
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(config => {
            applyConfig(config);
            localStorage.setItem('aether_config', JSON.stringify(config));
            if (!configLoaded) {
                startLoaderAndVideo();
                configLoaded = true;
            }
        })
        .catch(err => {
            console.warn('Failed to load config from server. Using local copy or defaults.', err);
            startLoaderAndVideo();
        });

    // 4. Extract active page config and inject elements
    function applyConfig(config) {
        if (!config || !config.pages) return;

        // Populate global campaign IDs list
        allCampaignIds = Object.keys(config.pages);

        // Fetch settings for activePageId, fallback to default if not found
        const pageConfig = config.pages[activePageId] || config.pages['default'];
        if (!pageConfig) return;

        // A. Themes
        const root = document.documentElement;
        if (pageConfig.theme) {
            root.style.setProperty('--bg-color', pageConfig.theme.bgColor);
            root.style.setProperty('--accent', pageConfig.theme.accent);
            root.style.setProperty('--accent-glow', convertHexToRGBA(pageConfig.theme.accent, 0.4));
            root.style.setProperty('--accent-cyan', pageConfig.theme.accentCyan);
        }

        // B. Video Timing & Parameters
        if (pageConfig.video) {
            const videoSrc = pageConfig.video.src || 'mp_.mp4';
            // Append timestamp to break Chrome cache and load fresh stream
            video.src = videoSrc + "?t=" + Date.now();

            startVideoTime = parseFloat(pageConfig.video.startTime) || 1.0;
            endVideoTime = parseFloat(pageConfig.video.endTime) || 27.0;
            scrollSmoothing = parseFloat(pageConfig.video.smoothing) || 0.08;
            
            // Adjust start point
            targetTime = startVideoTime;
            currentTime = startVideoTime;
        }

        // C. Preloader Text
        if (pageConfig.loader) {
            document.getElementById('loader-title').textContent = pageConfig.loader.title;
            document.getElementById('loader-status').textContent = pageConfig.loader.status;
        }

        // D. Navbar Logo & CTA Link
        if (pageConfig.navigation) {
            document.getElementById('nav-logo').textContent = pageConfig.navigation.logo || 'AETHER';
            const actionBtn = document.getElementById('nav-action-btn');
            actionBtn.textContent = pageConfig.navigation.actionText || 'Launch App';
            const resolvedActionUrl = resolveUrl(pageConfig.navigation.actionUrl);
            actionBtn.href = resolvedActionUrl;
            if (resolvedActionUrl.startsWith('http://') || resolvedActionUrl.startsWith('https://')) {
                actionBtn.target = '_blank';
                actionBtn.rel = 'noopener noreferrer';
            } else {
                actionBtn.removeAttribute('target');
                actionBtn.removeAttribute('rel');
            }
        }

        // E. DYNAMIC DOM RENDER (Navbar Links, Scroll Dots, Sections, Social Links)
        renderDynamicContent(pageConfig);



        // G. Footer Display
        document.getElementById('time-display').textContent = `Time Offset: ${startVideoTime.toFixed(1)}s – ${endVideoTime.toFixed(1)}s`;
        
        // H. Update highlights
        checkActiveSection();
    }

    // Dynamic Render Engine
    function renderDynamicContent(pageConfig) {
        navContainer.innerHTML = '';
        trackerContainer.innerHTML = '';
        sectionsContainer.innerHTML = '';
        socialContainer.innerHTML = '';

        const sectionsData = pageConfig.sections || [];
        
        sectionsData.forEach((section, index) => {
            // A. Render Navbar Link
            const navLink = document.createElement('a');
            navLink.href = `#section-${section.id}`;
            navLink.className = `nav-item${index === 0 ? ' active' : ''}`;
            navLink.id = `nav-item-${index + 1}`;
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = (section.title || '').split('<br>')[0];
            const titleText = tempDiv.textContent || tempDiv.innerText || `Section ${index + 1}`;
            navLink.textContent = titleText;
            navContainer.appendChild(navLink);

            // B. Render Scroll Dot
            const trackerDot = document.createElement('div');
            trackerDot.className = `tracker-dot${index === 0 ? ' active' : ''}`;
            trackerDot.setAttribute('data-target', index);
            trackerContainer.appendChild(trackerDot);

            // C. Render Scroll Section
            const sectionEl = document.createElement('section');
            sectionEl.className = 'scroll-section';
            sectionEl.id = `section-${section.id}`;
            if (index === 0) sectionEl.classList.add('active');

            const contentWrapper = document.createElement('div');
            contentWrapper.className = `section-content align-${section.alignment || 'left'}`;

            // 1. Tag
            const tagSpan = document.createElement('span');
            tagSpan.className = 'tag';
            tagSpan.textContent = section.tag || `0${index + 1} / SECTION`;
            contentWrapper.appendChild(tagSpan);

            // 2. Title
            const titleH = index === 0 ? document.createElement('h1') : document.createElement('h2');
            titleH.className = index === 0 ? 'main-title' : 'section-title';
            titleH.innerHTML = section.title || '';
            contentWrapper.appendChild(titleH);

            // 3. Lead text
            const leadP = document.createElement('p');
            leadP.className = 'lead-text';
            leadP.innerHTML = section.lead || '';
            contentWrapper.appendChild(leadP);

            // 4. Metric (Optional)
            if (section.metricValue && section.metricLabel) {
                const card = document.createElement('div');
                card.className = 'glass-card';
                
                const val = document.createElement('div');
                val.className = 'card-metric';
                val.textContent = section.metricValue;
                
                const lbl = document.createElement('div');
                lbl.className = 'card-label';
                lbl.textContent = section.metricLabel;
                
                card.appendChild(val);
                card.appendChild(lbl);
                contentWrapper.appendChild(card);
            }

            // 5. Bullets list (Optional)
            if (section.bullets && section.bullets.length > 0) {
                const list = document.createElement('div');
                list.className = 'features-list';
                section.bullets.forEach(bulletText => {
                    if (bulletText.trim()) {
                        const item = document.createElement('div');
                        item.className = 'feature-item';
                        
                        const bulletDot = document.createElement('span');
                        bulletDot.className = 'feature-bullet';
                        
                        const label = document.createElement('span');
                        label.textContent = bulletText;
                        
                        item.appendChild(bulletDot);
                        item.appendChild(label);
                        list.appendChild(item);
                    }
                });
                contentWrapper.appendChild(list);
            }

            // 6. Buttons list (Optional)
            if (section.buttons && section.buttons.length > 0) {
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'cta-actions';
                
                const btnClassMap = {
                    primary: 'btn btn-primary',
                    secondary: 'btn btn-secondary',
                    tertiary: 'btn btn-tertiary'
                };
                
                section.buttons.forEach(btn => {
                    if (btn.text.trim()) {
                        const btnLink = document.createElement('a');
                        const resolvedUrl = resolveUrl(btn.url);
                        btnLink.href = resolvedUrl;
                        // External or route campaign links check
                        if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
                            btnLink.target = '_blank';
                            btnLink.rel = 'noopener noreferrer';
                        } else {
                            btnLink.removeAttribute('target');
                            btnLink.removeAttribute('rel');
                        }
                        btnLink.className = btnClassMap[btn.style] || 'btn btn-primary';
                        btnLink.textContent = btn.text;
                        buttonsContainer.appendChild(btnLink);
                    }
                });
                contentWrapper.appendChild(buttonsContainer);
            }

            // 7. Scroll hint mouse icon (only for first section)
            if (index === 0) {
                const hint = document.createElement('div');
                hint.className = 'scroll-hint';
                hint.innerHTML = `
                    <span class="mouse-icon">
                        <span class="mouse-wheel"></span>
                    </span>
                    Scroll to Explore
                `;
                contentWrapper.appendChild(hint);
            }

            sectionEl.appendChild(contentWrapper);
            sectionsContainer.appendChild(sectionEl);
        });

        // D. Render Social Media Links in Footer
        const socialData = pageConfig.socialLinks || [];
        socialData.forEach(social => {
            if (social.platform && social.url) {
                const socialLink = document.createElement('a');
                socialLink.href = social.url;
                socialLink.target = '_blank';
                socialLink.rel = 'noopener noreferrer';
                socialLink.className = 'social-icon-link';
                socialLink.setAttribute('aria-label', social.platform);
                
                const svgHTML = socialSVGs[social.platform.toLowerCase()];
                if (svgHTML) {
                    socialLink.innerHTML = svgHTML;
                } else {
                    socialLink.textContent = social.platform;
                }
                socialContainer.appendChild(socialLink);
            }
        });

        // Re-query references and re-bind event listeners for the new elements
        sections = document.querySelectorAll('.scroll-section');
        dots = document.querySelectorAll('.tracker-dot');
        navItems = document.querySelectorAll('.nav-item');

        // Dot mapping click events
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                sections[index].scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Nav Items mapping click events
        navItems.forEach((navItem, index) => {
            navItem.addEventListener('click', (e) => {
                e.preventDefault();
                sections[index].scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    // Helper: Convert Hex color to RGBA for Glow Effects
    function convertHexToRGBA(hex, opacity) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    // 6. Preloader Progress Manager
    function startLoaderAndVideo() {
        progressInterval = setInterval(() => {
            if (loadProgress < 85) {
                loadProgress += Math.random() * 15;
                if (loadProgress > 85) loadProgress = 85;
                progressBar.style.width = `${loadProgress}%`;
            }
        }, 150);

        if (video.readyState >= 3) {
            clearInterval(progressInterval);
            initVideoPlay();
        } else {
            video.addEventListener('canplaythrough', () => {
                clearInterval(progressInterval);
                initVideoPlay();
            }, { once: true });
            
            setTimeout(() => {
                clearInterval(progressInterval);
                if (!loader.classList.contains('fade-out')) {
                    initVideoPlay();
                }
            }, 3000);
        }
    }

    function initVideoPlay() {
        video.play().then(() => {
            video.pause();
            video.currentTime = startVideoTime;
        }).catch(err => {
            console.log("Autoplay unlock prevented, setting currentTime directly.");
            video.currentTime = startVideoTime;
        });

        progressBar.style.width = '100%';
        
        setTimeout(() => {
            loader.classList.add('fade-out');
            checkActiveSection();
        }, 600);
    }

    // Unlock video on first interaction
    const unlockVideo = () => {
        video.play().then(() => {
            video.pause();
        }).catch(err => {
            console.log("Interactive unlock failed:", err);
        });
        window.removeEventListener('touchstart', unlockVideo);
        window.removeEventListener('click', unlockVideo);
    };
    window.addEventListener('touchstart', unlockVideo, { passive: true });
    window.addEventListener('click', unlockVideo, { passive: true });

    // 7. Scroll Tracking
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollFraction = maxScroll <= 0 ? 0 : scrollTop / maxScroll;
        
        targetTime = startVideoTime + scrollFraction * (endVideoTime - startVideoTime);
        
        checkActiveSection();
    }, { passive: true });

    // 8. requestAnimationFrame Easing Engine
    function render() {
        const timeDiff = targetTime - currentTime;
        
        if (Math.abs(timeDiff) > 0.002) {
            currentTime += timeDiff * scrollSmoothing;
            currentTime = Math.max(startVideoTime, Math.min(endVideoTime, currentTime));
            
            if (video.readyState >= 2 && !video.seeking) {
                video.currentTime = currentTime;
            }
        }
        
        requestAnimationFrame(render);
    }
    
    render();

    // 9. Navigation Link / Viewport highlights
    function checkActiveSection() {
        if (!sections.length) return;
        
        const triggerMargin = window.innerHeight * 0.5;
        let activeIndex = 0;

        sections.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            if (rect.top <= triggerMargin && rect.bottom >= triggerMargin) {
                section.classList.add('active');
                activeIndex = index;
            } else if (index !== 0) {
                section.classList.remove('active');
            }
        });

        if (window.scrollY === 0) {
            activeIndex = 0;
            if (sections[0]) sections[0].classList.add('active');
        }

        dots.forEach((dot, index) => {
            if (index === activeIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        navItems.forEach((navItem, index) => {
            if (index === activeIndex) {
                navItem.classList.add('active');
            } else {
                navItem.classList.remove('active');
            }
        });
    }
});
