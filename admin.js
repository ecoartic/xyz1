/**
 * AETHER - Admin Control Panel Controller (Multi-Campaign & WebGL Cursor Version)
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuButtons = document.querySelectorAll('.menu-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const saveButton = document.getElementById('btn-save-all');
    const toast = document.getElementById('toast');
    
    // Global Config State
    let activeConfig = null;
    let activeCampaignId = 'default';

    // Campaign Manager Elements
    const campaignSelect = document.getElementById('campaign-select');
    const newCampaignIdInput = document.getElementById('new-campaign-id');
    const btnCreateCampaign = document.getElementById('btn-create-campaign');
    const btnDeleteCampaign = document.getElementById('btn-delete-campaign');

    // Theme Colors
    const colorBg = document.getElementById('color-bg');
    const colorBgHex = document.getElementById('color-bg-hex');
    const colorAccent = document.getElementById('color-accent');
    const colorAccentHex = document.getElementById('color-accent-hex');
    const colorAccentCyan = document.getElementById('color-accent-cyan');
    const colorAccentCyanHex = document.getElementById('color-accent-cyan-hex');

    // Video Parameters
    const videoStart = document.getElementById('video-start');
    const videoEnd = document.getElementById('video-end');
    const videoSmoothing = document.getElementById('video-smoothing');
    const smoothingVal = document.getElementById('smoothing-val');

    // Loader Parameters
    const loaderTitle = document.getElementById('loader-title');
    const loaderStatus = document.getElementById('loader-status');

    // Header Navigation
    const navLogo = document.getElementById('nav-logo');
    const navAction = document.getElementById('nav-action');
    const navActionUrl = document.getElementById('nav-action-url');

    // Campaign Link Address Elements
    const campaignLinkUrl = document.getElementById('campaign-link-url');
    const btnCopyCampaignLink = document.getElementById('btn-copy-campaign-link');

    // Dynamic Containers
    const sectionsEditorContainer = document.getElementById('sections-editor-container');
    const socialLinksEditorContainer = document.getElementById('social-links-editor-container');
    
    // Add Buttons
    const btnAddSection = document.getElementById('btn-add-section');
    const btnAddSocial = document.getElementById('btn-add-social');

    // Video Upload Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const progressContainer = document.getElementById('upload-progress-container');
    const filenameEl = document.getElementById('upload-filename');
    const percentEl = document.getElementById('upload-percentage');
    const uploadBar = document.getElementById('upload-bar');
    const statusTextEl = document.getElementById('upload-status-text');

    // 1. Load config from LocalStorage first (for instant display)
    const localConfigStr = localStorage.getItem('aether_config');
    if (localConfigStr) {
        try {
            activeConfig = JSON.parse(localConfigStr);
            initCampaignSelector();
            loadCampaign(activeCampaignId);
        } catch (e) {
            console.error('Error parsing localConfig from localStorage:', e);
        }
    }

    // 2. Fetch Configuration from Server
    fetch('/api/config?t=' + Date.now())
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(config => {
            activeConfig = config;
            initCampaignSelector();
            loadCampaign(activeCampaignId);
            localStorage.setItem('aether_config', JSON.stringify(config));
        })
        .catch(err => {
            console.warn('Failed to load configuration from server. Using local version.');
        });

    // 3. Initialize Campaign Selector Dropdown
    function initCampaignSelector() {
        if (!activeConfig || !activeConfig.pages) return;
        
        campaignSelect.innerHTML = '';
        
        // Add Mother Campaign first
        const motherOpt = document.createElement('option');
        motherOpt.value = 'default';
        motherOpt.textContent = '★ Mother Campaign (default)';
        motherOpt.style.fontWeight = 'bold';
        if (activeCampaignId === 'default') {
            motherOpt.selected = true;
        }
        campaignSelect.appendChild(motherOpt);
        
        // Add Sub-Campaigns under an optgroup
        const subGroup = document.createElement('optgroup');
        subGroup.label = 'Sub-Campaigns (Virtual Pages)';
        
        let hasSub = false;
        Object.keys(activeConfig.pages).forEach(key => {
            if (key !== 'default') {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = `↳ /?page=${key}`;
                if (key === activeCampaignId) {
                    opt.selected = true;
                }
                subGroup.appendChild(opt);
                hasSub = true;
            }
        });
        
        if (hasSub) {
            campaignSelect.appendChild(subGroup);
        }
    }

    // Helper: Update Generated Campaign URL Display
    function updateCampaignLinkDisplay() {
        if (!campaignLinkUrl) return;
        const origin = window.location.origin;
        let url = `${origin}/`;
        if (activeCampaignId !== 'default') {
            url += `?page=${activeCampaignId}`;
        }
        campaignLinkUrl.value = url;
    }

    // Switch campaign handler
    campaignSelect.addEventListener('change', (e) => {
        // Save current modifications in memory first
        saveCampaignToMemory();
        
        activeCampaignId = e.target.value;
        loadCampaign(activeCampaignId);
        showToast(`Loaded campaign config: ${activeCampaignId}`);
    });

    // Create new campaign handler
    btnCreateCampaign.addEventListener('click', () => {
        if (!activeConfig) return;

        const rawId = newCampaignIdInput.value.trim().toLowerCase();
        const cleanId = rawId.replace(/[^a-z0-9_-]/g, '');

        if (!cleanId) {
            showToast('Please enter a valid alphanumeric campaign ID!', true);
            return;
        }

        if (activeConfig.pages[cleanId]) {
            showToast('A campaign with this ID already exists!', true);
            return;
        }

        // Copy default campaign settings as a template
        const template = JSON.parse(JSON.stringify(activeConfig.pages['default']));
        
        // Customize parameters for the new campaign
        template.video.src = `video_${cleanId}.mp4`;
        template.loader.title = cleanId.toUpperCase();
        template.navigation.logo = cleanId.toUpperCase();
        template.sections.forEach((s, idx) => {
            s.id = `sec-${cleanId}-${Date.now()}-${idx}`;
        });

        // Add to active config
        activeConfig.pages[cleanId] = template;
        activeCampaignId = cleanId;
        newCampaignIdInput.value = '';

        // Refresh dropdown selector and populate form
        initCampaignSelector();
        loadCampaign(activeCampaignId);
        
        showToast(`Campaign '${cleanId}' created! Save settings to write to server.`);
    });

    // Delete campaign handler
    btnDeleteCampaign.addEventListener('click', () => {
        if (!activeConfig) return;

        if (activeCampaignId === 'default') {
            showToast('You cannot delete the default mother campaign!', true);
            return;
        }

        if (confirm(`Are you sure you want to delete campaign '${activeCampaignId}'?`)) {
            delete activeConfig.pages[activeCampaignId];
            activeCampaignId = 'default';

            initCampaignSelector();
            loadCampaign(activeCampaignId);

            showToast('Campaign deleted. Save settings to apply on server.');
        }
    });

    // Populate active campaign form values
    function loadCampaign(pageId) {
        if (!activeConfig || !activeConfig.pages) return;

        const config = activeConfig.pages[pageId] || activeConfig.pages['default'];
        
        // Theme Colors
        colorBg.value = config.theme.bgColor;
        colorBgHex.value = config.theme.bgColor;
        colorAccent.value = config.theme.accent;
        colorAccentHex.value = config.theme.accent;
        colorAccentCyan.value = config.theme.accentCyan;
        colorAccentCyanHex.value = config.theme.accentCyan;

        // Video Settings
        videoStart.value = config.video.startTime;
        videoEnd.value = config.video.endTime;
        videoSmoothing.value = config.video.smoothing;
        smoothingVal.textContent = config.video.smoothing;

        // Loader Screen
        loaderTitle.value = config.loader.title;
        loaderStatus.value = config.loader.status;

        // Navbar Links
        navLogo.value = config.navigation.logo || '';
        navAction.value = config.navigation.actionText || 'Launch App';
        navActionUrl.value = config.navigation.actionUrl || '#';



        // Render dynamic lists
        renderSectionsEditor(config);
        renderSocialLinksEditor(config);
        
        // Update URL Address Display
        updateCampaignLinkDisplay();
    }

    // 4. Render Section Editor Forms Dynamically
    function renderSectionsEditor(config) {
        sectionsEditorContainer.innerHTML = '';
        const sectionsData = config.sections || [];

        sectionsData.forEach((section, index) => {
            const card = document.createElement('div');
            card.className = 'glass-card section-card';
            card.setAttribute('data-id', section.id);

            const buttons = section.buttons || [];
            const btn1 = buttons[0] || { text: '', url: '', style: 'primary' };
            const btn2 = buttons[1] || { text: '', url: '', style: 'tertiary' };
            const bullets = section.bullets || [];

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = section.title || '';
            const rawTitle = tempDiv.textContent || tempDiv.innerText || 'New Section';
            const cleanTitleSnippet = rawTitle.substring(0, 30) + (rawTitle.length > 30 ? '...' : '');

            card.innerHTML = `
                <div class="section-header-row">
                    <h3 class="card-title text-accent">Section 0${index + 1} // ${cleanTitleSnippet}</h3>
                    <button class="btn-delete-section" data-id="${section.id}">Delete Section</button>
                </div>
                
                <div class="form-group">
                    <label>Section Tag</label>
                    <input type="text" class="sec-tag" value="${section.tag || ''}" placeholder="0${index + 1} / FEATURE">
                </div>

                <div class="form-group">
                    <label>Section Title (HTML Supported)</label>
                    <input type="text" class="sec-title" value="${escapeHtml(section.title || '')}" placeholder="Title with &lt;span class=&quot;gradient-text&quot;&gt;Gradient&lt;/span&gt;">
                </div>

                <div class="form-group">
                    <label>Lead Description Text</label>
                    <textarea class="sec-lead" rows="3" placeholder="Explain the section concept...">${section.lead || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>Text Content Alignment</label>
                    <div class="alignment-options">
                        <label class="align-radio-label ${section.alignment === 'left' ? 'selected' : ''}">
                            <input type="radio" name="align-${section.id}" value="left" ${section.alignment === 'left' ? 'checked' : ''}> Left
                        </label>
                        <label class="align-radio-label ${section.alignment === 'center' ? 'selected' : ''}">
                            <input type="radio" name="align-${section.id}" value="center" ${section.alignment === 'center' ? 'checked' : ''}> Center
                        </label>
                        <label class="align-radio-label ${section.alignment === 'right' ? 'selected' : ''}">
                            <input type="radio" name="align-${section.id}" value="right" ${section.alignment === 'right' ? 'checked' : ''}> Right
                        </label>
                    </div>

                    <!-- Alignment Live Preview -->
                    <div class="alignment-preview-wrapper">
                        <div class="alignment-preview-title">Viewport Alignment Preview</div>
                        <div class="alignment-preview-box preview-${section.alignment || 'left'}" id="preview-box-${section.id}">
                            <div class="preview-lines">
                                <div class="preview-line"></div>
                                <div class="preview-line"></div>
                                <div class="preview-line"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="sub-section-title">Performance Metric (Optional)</div>
                <div class="grid-2-col-compact">
                    <div class="form-group">
                        <label>Metric Value</label>
                        <input type="text" class="sec-metric-val" value="${section.metricValue || ''}" placeholder="e.g. 10ms">
                    </div>
                    <div class="form-group">
                        <label>Metric Label</label>
                        <input type="text" class="sec-metric-lbl" value="${section.metricLabel || ''}" placeholder="e.g. Latency Response">
                    </div>
                </div>

                <div class="sub-section-title">Feature Bullets (Optional)</div>
                <div class="grid-2-col-compact">
                    <div class="form-group">
                        <label>Bullet Point 1</label>
                        <input type="text" class="sec-bullet-1" value="${bullets[0] || ''}" placeholder="e.g. Keyframe Precision">
                    </div>
                    <div class="form-group">
                        <label>Bullet Point 2</label>
                        <input type="text" class="sec-bullet-2" value="${bullets[1] || ''}" placeholder="e.g. Bidirectional Easing">
                    </div>
                </div>

                <div class="sub-section-title">Action Buttons (Optional External Links)</div>
                <div class="grid-2-col-compact">
                    <div class="form-group">
                        <label>Button 1 Text</label>
                        <input type="text" class="sec-btn-1-text" value="${btn1.text || ''}" placeholder="e.g. Join Us">
                    </div>
                    <div class="form-group">
                        <label>Button 1 Style</label>
                        <select class="sec-btn-1-style">
                            <option value="primary" ${btn1.style === 'primary' ? 'selected' : ''}>Primary (Glow)</option>
                            <option value="secondary" ${btn1.style === 'secondary' ? 'selected' : ''}>Secondary (Outline)</option>
                            <option value="tertiary" ${btn1.style === 'tertiary' ? 'selected' : ''}>Tertiary (Link)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-top: -0.75rem;">
                    <label>Button 1 Redirect URL</label>
                    <input type="text" class="sec-btn-1-url" value="${btn1.url || ''}" placeholder="https://example.com/join">
                </div>

                <div class="grid-2-col-compact" style="margin-top: 0.5rem;">
                    <div class="form-group">
                        <label>Button 2 Text</label>
                        <input type="text" class="sec-btn-2-text" value="${btn2.text || ''}" placeholder="e.g. Read More">
                    </div>
                    <div class="form-group">
                        <label>Button 2 Style</label>
                        <select class="sec-btn-2-style">
                            <option value="primary" ${btn2.style === 'primary' ? 'selected' : ''}>Primary (Glow)</option>
                            <option value="secondary" ${btn2.style === 'secondary' ? 'selected' : ''}>Secondary (Outline)</option>
                            <option value="tertiary" ${btn2.style === 'tertiary' ? 'selected' : ''}>Tertiary (Link)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-top: -0.75rem;">
                    <label>Button 2 Redirect URL</label>
                    <input type="text" class="sec-btn-2-url" value="${btn2.url || ''}" placeholder="https://example.com/collection">
                </div>
            `;

            sectionsEditorContainer.appendChild(card);
        });

        // Attach delete event listeners
        document.querySelectorAll('.btn-delete-section').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionId = e.target.getAttribute('data-id');
                deleteSection(sectionId);
            });
        });
    }

    // 5. Render Social Links Editors
    function renderSocialLinksEditor(config) {
        socialLinksEditorContainer.innerHTML = '';
        const socialLinksData = config.socialLinks || [];

        socialLinksData.forEach((social, index) => {
            const row = document.createElement('div');
            row.className = 'social-link-row';

            row.innerHTML = `
                <select class="social-platform">
                    <option value="instagram" ${social.platform === 'instagram' ? 'selected' : ''}>Instagram</option>
                    <option value="twitter" ${social.platform === 'twitter' ? 'selected' : ''}>X (Twitter)</option>
                    <option value="youtube" ${social.platform === 'youtube' ? 'selected' : ''}>YouTube</option>
                    <option value="telegram" ${social.platform === 'telegram' ? 'selected' : ''}>Telegram</option>
                    <option value="facebook" ${social.platform === 'facebook' ? 'selected' : ''}>Facebook</option>
                    <option value="github" ${social.platform === 'github' ? 'selected' : ''}>GitHub</option>
                    <option value="linkedin" ${social.platform === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
                </select>
                <input type="text" class="social-url" value="${social.url || ''}" placeholder="https://instagram.com/your-username" style="flex-grow: 1;">
                <button class="btn-delete-social" data-index="${index}" title="Remove Icon">&times;</button>
            `;

            socialLinksEditorContainer.appendChild(row);
        });

        // Attach social delete listeners
        document.querySelectorAll('.btn-delete-social').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                deleteSocialLink(index);
            });
        });
    }

    // 6. Add/Delete Handlers
    function deleteSection(id) {
        if (!activeConfig) return;
        const config = activeConfig.pages[activeCampaignId];
        
        // Ensure at least 1 section remains
        if (config.sections.length <= 1) {
            showToast('You must have at least one section!', true);
            return;
        }
        
        config.sections = config.sections.filter(s => s.id !== id);
        renderSectionsEditor(config);
        showToast('Section removed. Remember to save settings!');
    }

    btnAddSection.addEventListener('click', () => {
        if (!activeConfig) return;
        const config = activeConfig.pages[activeCampaignId];
        
        const nextNum = config.sections.length + 1;
        const newSec = {
            id: 'sec-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            tag: `0${nextNum} / FEATURE`,
            title: 'New Content Section',
            lead: 'This section was dynamically added. You can change text, alignment, and add buttons.',
            alignment: 'left',
            buttons: []
        };
        
        config.sections.push(newSec);
        renderSectionsEditor(config);
        showToast('New section added! Scroll down to edit.');
        
        setTimeout(() => {
            sectionsEditorContainer.lastElementChild.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    });

    function deleteSocialLink(index) {
        if (!activeConfig) return;
        const config = activeConfig.pages[activeCampaignId];
        config.socialLinks.splice(index, 1);
        renderSocialLinksEditor(config);
        showToast('Social link removed. Remember to save settings!');
    }

    btnAddSocial.addEventListener('click', () => {
        if (!activeConfig) return;
        const config = activeConfig.pages[activeCampaignId];
        if (!config.socialLinks) config.socialLinks = [];
        
        config.socialLinks.push({
            platform: 'instagram',
            url: ''
        });
        renderSocialLinksEditor(config);
        showToast('New social link row added.');
    });

    // 7. Live Alignment Preview Event Delegation
    sectionsEditorContainer.addEventListener('change', (e) => {
        if (e.target && e.target.type === 'radio' && e.target.name.startsWith('align-')) {
            const sectionId = e.target.name.replace('align-', '');
            const val = e.target.value;
            
            const previewBox = document.getElementById(`preview-box-${sectionId}`);
            if (previewBox) {
                previewBox.className = `alignment-preview-box preview-${val}`;
            }

            const sectionCard = e.target.closest('.section-card');
            if (sectionCard) {
                sectionCard.querySelectorAll('.align-radio-label').forEach(lbl => {
                    if (lbl.contains(e.target)) {
                        lbl.classList.add('selected');
                    } else {
                        lbl.classList.remove('selected');
                    }
                });
            }
        }
    });

    // 8. Tab Menu Switching
    menuButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            menuButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.getAttribute('id') === `tab-${targetTab}`) {
                    panel.classList.add('active');
                }
            });
        });
    });

    // 9. Color Picker Syncs
    function syncColor(picker, hexInput) {
        picker.addEventListener('input', () => {
            hexInput.value = picker.value;
        });
        hexInput.addEventListener('change', () => {
            let val = hexInput.value;
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                picker.value = val;
                hexInput.value = val;
            }
        });
    }
    syncColor(colorBg, colorBgHex);
    syncColor(colorAccent, colorAccentHex);
    syncColor(colorAccentCyan, colorAccentCyanHex);

    // Slider Syncs
    videoSmoothing.addEventListener('input', () => {
        smoothingVal.textContent = videoSmoothing.value;
    });



    // Copy Campaign Link handler
    btnCopyCampaignLink.addEventListener('click', (e) => {
        e.preventDefault();
        const urlToCopy = campaignLinkUrl.value;
        if (!urlToCopy) return;

        navigator.clipboard.writeText(urlToCopy)
            .then(() => {
                showToast('Campaign link copied to clipboard!');
            })
            .catch(err => {
                console.log('Failed to copy text with clipboard API, using selection fallback: ', err);
                campaignLinkUrl.select();
                document.execCommand('copy');
                showToast('Campaign link copied!');
            });
    });

    // 10. Toast System
    function showToast(message, isError = false) {
        toast.textContent = message;
        if (isError) {
            toast.classList.add('error');
        } else {
            toast.classList.remove('error');
        }
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // HTML escape helper
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Save active campaign settings from fields into state memory
    function saveCampaignToMemory() {
        if (!activeConfig) return;

        const updatedCampaign = {
            theme: {
                bgColor: colorBg.value,
                accent: colorAccent.value,
                accentCyan: colorAccentCyan.value
            },
            video: {
                src: activeCampaignId === 'default' ? 'mp_.mp4' : `video_${activeCampaignId}.mp4`,
                startTime: parseFloat(videoStart.value) || 1.0,
                endTime: parseFloat(videoEnd.value) || 27.0,
                smoothing: parseFloat(videoSmoothing.value) || 0.08
            },
            loader: {
                title: loaderTitle.value,
                status: loaderStatus.value
            },
            navigation: {
                logo: navLogo.value,
                links: [],
                actionText: navAction.value,
                actionUrl: navActionUrl.value
            },
            socialLinks: [],
            sections: []
        };

        // Collect Dynamic Social Links
        const socialRows = socialLinksEditorContainer.querySelectorAll('.social-link-row');
        socialRows.forEach(row => {
            const platform = row.querySelector('.social-platform').value;
            const url = row.querySelector('.social-url').value.trim();
            if (url) {
                updatedCampaign.socialLinks.push({ platform, url });
            }
        });

        // Collect Dynamic Sections
        const sectionCards = sectionsEditorContainer.querySelectorAll('.section-card');
        sectionCards.forEach(card => {
            const id = card.getAttribute('data-id');
            const tag = card.querySelector('.sec-tag').value.trim();
            const title = card.querySelector('.sec-title').value.trim();
            const lead = card.querySelector('.sec-lead').value.trim();
            
            const alignRadio = card.querySelector(`input[name="align-${id}"]:checked`);
            const alignment = alignRadio ? alignRadio.value : 'left';

            const sectionObj = {
                id,
                tag,
                title,
                lead,
                alignment,
                buttons: []
            };

            const metricVal = card.querySelector('.sec-metric-val').value.trim();
            const metricLbl = card.querySelector('.sec-metric-lbl').value.trim();
            if (metricVal && metricLbl) {
                sectionObj.metricValue = metricVal;
                sectionObj.metricLabel = metricLbl;
            }

            const bullet1 = card.querySelector('.sec-bullet-1').value.trim();
            const bullet2 = card.querySelector('.sec-bullet-2').value.trim();
            const bullets = [];
            if (bullet1) bullets.push(bullet1);
            if (bullet2) bullets.push(bullet2);
            if (bullets.length > 0) {
                sectionObj.bullets = bullets;
            }

            const btn1Text = card.querySelector('.sec-btn-1-text').value.trim();
            const btn1Style = card.querySelector('.sec-btn-1-style').value;
            const btn1Url = card.querySelector('.sec-btn-1-url').value.trim();
            if (btn1Text) {
                sectionObj.buttons.push({ text: btn1Text, style: btn1Style, url: btn1Url });
            }

            const btn2Text = card.querySelector('.sec-btn-2-text').value.trim();
            const btn2Style = card.querySelector('.sec-btn-2-style').value;
            const btn2Url = card.querySelector('.sec-btn-2-url').value.trim();
            if (btn2Text) {
                sectionObj.buttons.push({ text: btn2Text, style: btn2Style, url: btn2Url });
            }

            updatedCampaign.sections.push(sectionObj);
        });

        // Save in global state dictionary
        activeConfig.pages[activeCampaignId] = updatedCampaign;
    }

    // 11. Save Configuration (Build and Send config to API)
    saveButton.addEventListener('click', () => {
        if (!activeConfig) return;

        // Save active fields into config memory state first
        saveCampaignToMemory();

        // Save to LocalStorage
        localStorage.setItem('aether_config', JSON.stringify(activeConfig));

        // POST config state dictionary to Server
        fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(activeConfig)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast('All campaign settings saved to server!');
                // Redraw section editor cards to refresh headers
                renderSectionsEditor(activeConfig.pages[activeCampaignId]);
            } else {
                showToast('Saved locally (Server error: ' + (data.error || 'unknown') + ')', false);
            }
        })
        .catch(err => {
            showToast('Saved locally (Offline/Static Mode)');
            console.info('Config saved in local storage. Server save skipped (offline/static).');
        });
    });

    // 12. Video Drag, Drop and Upload (AJAX with Progress)
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileUpload(file);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) {
            if (file.type === 'video/mp4' || file.name.endsWith('.mp4')) {
                handleFileUpload(file);
            } else {
                showToast('Only MP4 video files are accepted!', true);
            }
        }
    });

    function handleFileUpload(file) {
        progressContainer.style.display = 'block';
        filenameEl.textContent = file.name;
        statusTextEl.textContent = 'Uploading file to server...';
        statusTextEl.className = 'upload-status-text';
        uploadBar.style.width = '0%';
        percentEl.textContent = '0%';

        const formData = new FormData();
        formData.append('video', file);

        const xhr = new XMLHttpRequest();
        // Append activeCampaignId to let the server save it as video_[campaignId].mp4
        xhr.open('POST', `/api/upload-video?page=${activeCampaignId}`, true);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                uploadBar.style.width = percentage + '%';
                percentEl.textContent = percentage + '%';
                if (percentage === 100) {
                    statusTextEl.textContent = 'Processing and saving on server...';
                }
            }
        });

        xhr.onreadystatechange = function () {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        statusTextEl.textContent = response.message || 'Upload complete!';
                        statusTextEl.classList.add('upload-success');
                        showToast(`Video uploaded for campaign '${activeCampaignId}' successfully!`);
                    } catch (e) {
                        statusTextEl.textContent = 'Upload succeeded, but invalid server response.';
                        statusTextEl.classList.add('upload-error');
                    }
                } else {
                    let errMsg = 'Upload failed.';
                    try {
                        const response = JSON.parse(xhr.responseText);
                        errMsg = response.error || errMsg;
                    } catch (e) {}
                    statusTextEl.textContent = 'Error: ' + errMsg;
                    statusTextEl.classList.add('upload-error');
                    showToast('Failed to upload video', true);
                }
            }
        };

        xhr.send(formData);
    }
});
