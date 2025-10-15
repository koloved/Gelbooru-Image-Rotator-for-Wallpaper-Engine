// Configuration - Default values (will be overridden by user properties)
let CONFIG = {
    // API credentials (to be set by user)
    apiKey: '',
    
    // User settings
    tags: ['landscape'],
    excludeTags: ['animated'],
    rating: 'general',
    aspectRatio: 0, // 0 means disabled
    ratioTolerance: 20, // percentage
    intervalMinutes: 5,
    limit: 100,
    transitionSpeed: 1.0,
    showLoading: true,
    blurAmount: 30
};

let imageCache = [];
let currentIndex = 0;
let intervalId = null;
let isTransitioning = false;
let useNextSlot = false; // Toggle between current and next image slots
let currentImageId = null; // Store current image ID for the source button
let consecutiveErrors = 0; // Track consecutive loading errors

// Build Gelbooru API URL
function buildApiUrl() {
    const baseUrl = 'https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1';
    
    let allTags = [`rating:${CONFIG.rating}`];
    allTags = allTags.concat(CONFIG.tags);
    
    if (CONFIG.excludeTags.length > 0) {
        CONFIG.excludeTags.forEach(tag => {
            if (tag.trim()) {
                allTags.push(`-${tag.trim()}`);
            }
        });
    }
    
    const tagString = allTags.join(' ');
    const params = new URLSearchParams({
        tags: tagString,
        limit: CONFIG.limit,
        pid: Math.floor(Math.random() * 10)
    });
    
    // Add API key if provided
    let url = `${baseUrl}&${params.toString()}`;
    if (CONFIG.apiKey && CONFIG.apiKey.trim()) {
        url += CONFIG.apiKey;
    }
    
    console.log('Fetching from:', url.replace(/api_key=[^&]+/, 'api_key=HIDDEN')); // Hide API key in logs
    return url;
}

// Calculate aspect ratio difference
function getAspectRatioDifference(imageRatio, targetRatio) {
    return Math.abs(imageRatio - targetRatio);
}

// Check if image ratio is within tolerance
function isRatioWithinTolerance(imageRatio, targetRatio, tolerance) {
    if (targetRatio === 0) return true; // Disabled
    
    const toleranceDecimal = tolerance / 100;
    const minRatio = targetRatio * (1 - toleranceDecimal);
    const maxRatio = targetRatio * (1 + toleranceDecimal);
    
    return imageRatio >= minRatio && imageRatio <= maxRatio;
}

// Filter and sort images by aspect ratio
function filterAndSortByRatio(images) {
    if (CONFIG.aspectRatio === 0) {
        // Aspect ratio filtering disabled, return all images
        return images;
    }
    
    const targetRatio = CONFIG.aspectRatio;
    const tolerance = CONFIG.ratioTolerance;
    
    console.log(`Filtering images for aspect ratio ${targetRatio} ±${tolerance}%`);
    
    // Filter images within tolerance
    const filteredImages = images.filter(img => {
        const imageRatio = img.width / img.height;
        return isRatioWithinTolerance(imageRatio, targetRatio, tolerance);
    });
    
    if (filteredImages.length === 0) {
        console.warn('No images found within aspect ratio tolerance. Using closest matches...');
        // If no images within tolerance, sort all by closest match and take top 50%
        const sortedAll = images
            .map(img => ({
                ...img,
                ratioDiff: getAspectRatioDifference(img.width / img.height, targetRatio)
            }))
            .sort((a, b) => a.ratioDiff - b.ratioDiff);
        
        return sortedAll.slice(0, Math.max(1, Math.floor(sortedAll.length / 2)));
    }
    
    // Sort filtered images by how close they are to target ratio (best matches first)
    const sortedImages = filteredImages
        .map(img => ({
            ...img,
            ratioDiff: getAspectRatioDifference(img.width / img.height, targetRatio)
        }))
        .sort((a, b) => a.ratioDiff - b.ratioDiff);
    
    console.log(`Filtered ${sortedImages.length} images matching aspect ratio criteria`);
    
    return sortedImages;
}

// Show or hide API manual
function showApiManual(show) {
    const manual = document.getElementById('api-manual');
    if (show) {
        manual.classList.add('show');
    } else {
        manual.classList.remove('show');
    }
}

// Fetch images from Gelbooru API
async function fetchImages() {
    // Check if API key is missing
    if (!CONFIG.apiKey || !CONFIG.apiKey.trim()) {
        console.error('No API key provided');
        showApiManual(true);
        return;
    }
    
    showLoading(true);
    
    try {
        const url = buildApiUrl();
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error('API Error:', data.error);
            showLoading(false);
            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
                showApiManual(true);
            }
            return;
        }
        
        const posts = data.post || data;
        
        if (!posts || posts.length === 0) {
            console.error('No images found with current tags:', CONFIG.tags);
            showLoading(false);
            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
                showApiManual(true);
            }
            return;
        }
        
        // Map images with all needed data
        let images = posts
            .filter(post => post.file_url && post.width && post.height)
            .map(post => ({
                url: post.file_url,
                id: post.id,
                width: post.width,
                height: post.height
            }));
        
        console.log(`Fetched ${images.length} images from API`);
        
        // Filter and sort by aspect ratio if enabled
        images = filterAndSortByRatio(images);
        
        if (images.length === 0) {
            console.error('No images matched the aspect ratio criteria');
            showLoading(false);
            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
                showApiManual(true);
            }
            return;
        }
        
        // Store in cache
        imageCache = images;
        
        console.log(`Using ${imageCache.length} images after aspect ratio filtering`);
        consecutiveErrors = 0; // Reset error counter on success
        
        imageCache = shuffleArray(imageCache);
        currentIndex = 0;
        
        changeWallpaper();
        
    } catch (error) {
        console.error('Error fetching images:', error);
        showLoading(false);
        consecutiveErrors++;
        if (consecutiveErrors >= 3) {
            showApiManual(true);
        }
    }
}

// Change wallpaper with proper crossfade
function changeWallpaper() {
    if (imageCache.length === 0 || isTransitioning) {
        if (!isTransitioning && imageCache.length === 0) fetchImages();
        return;
    }
    
    isTransitioning = true;
    const imageData = imageCache[currentIndex];
    const imageUrl = imageData.url;
    currentImageId = imageData.id;
    
    const imageRatio = (imageData.width / imageData.height).toFixed(2);
    console.log(`Loading image ${currentIndex + 1}/${imageCache.length} (ID: ${currentImageId}, Ratio: ${imageRatio})`);
    
    // Determine which slot to use
    const currentWallpaper = document.getElementById(useNextSlot ? 'next-wallpaper' : 'wallpaper');
    const nextWallpaper = document.getElementById(useNextSlot ? 'wallpaper' : 'next-wallpaper');
    const currentBg = document.getElementById(useNextSlot ? 'next-background' : 'background');
    const nextBg = document.getElementById(useNextSlot ? 'background' : 'next-background');
    
    // Preload image
    const img = new Image();
    img.onload = () => {
        // Set the next images
        nextWallpaper.src = imageUrl;
        nextBg.src = imageUrl;
        
        // Small delay to ensure images are loaded
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Fade in next, fade out current
                nextWallpaper.style.opacity = '1';
                nextBg.style.opacity = '1';
                currentWallpaper.style.opacity = '0';
                currentBg.style.opacity = '0';
                
                // After transition completes
                setTimeout(() => {
                    // Toggle slot for next change
                    useNextSlot = !useNextSlot;
                    isTransitioning = false;
                    showLoading(false);
                    consecutiveErrors = 0; // Reset on successful load
                    console.log('Image loaded successfully');
                }, CONFIG.transitionSpeed * 1000);
            });
        });
    };
    
    img.onerror = () => {
        console.error('Failed to load image:', imageUrl);
        isTransitioning = false;
        consecutiveErrors++;
        
        if (consecutiveErrors >= 5) {
            showApiManual(true);
        }
        
        currentIndex = (currentIndex + 1) % imageCache.length;
        if (currentIndex === 0) {
            fetchImages();
        } else {
            changeWallpaper();
        }
    };
    
    img.src = imageUrl;
    
    // Move to next image
    currentIndex = (currentIndex + 1) % imageCache.length;
    
    if (currentIndex === 0) {
        console.log('Reached end of cache, will fetch new batch on next cycle');
    }
}

// Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Show/hide loading indicator
function showLoading(show) {
    if (!CONFIG.showLoading) return;
    
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('show');
    } else {
        loading.classList.remove('show');
    }
}

// Show clipboard notification
function showClipboardNotification() {
    const notification = document.getElementById('clipboard-notification');
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Update blur amount
function updateBlur() {
    const bg = document.getElementById('background');
    const nextBg = document.getElementById('next-background');
    bg.style.filter = `blur(${CONFIG.blurAmount}px)`;
    bg.style.webkitFilter = `blur(${CONFIG.blurAmount}px)`;
    nextBg.style.filter = `blur(${CONFIG.blurAmount}px)`;
    nextBg.style.webkitFilter = `blur(${CONFIG.blurAmount}px)`;
}

// Update transition speed
function updateTransitionSpeed() {
    const elements = ['wallpaper', 'next-wallpaper', 'background', 'next-background'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        el.style.transition = `opacity ${CONFIG.transitionSpeed}s ease-in-out`;
    });
}

// Start the wallpaper rotation
function startRotation() {
    console.log('Starting wallpaper rotation...');
    console.log('Config:', {
        rating: CONFIG.rating,
        tags: CONFIG.tags,
        excludeTags: CONFIG.excludeTags,
        aspectRatio: CONFIG.aspectRatio === 0 ? 'Disabled' : CONFIG.aspectRatio,
        ratioTolerance: CONFIG.ratioTolerance + '%',
        interval: CONFIG.intervalMinutes + ' minutes',
        hasApiKey: CONFIG.apiKey ? 'Yes' : 'No'
    });
    
    if (!CONFIG.apiKey || !CONFIG.apiKey.trim()) {
        console.warn('WARNING: No API key provided.');
        showApiManual(true);
        return;
    }
    
    fetchImages();
    
    const intervalMs = CONFIG.intervalMinutes * 60 * 1000;
    intervalId = setInterval(changeWallpaper, intervalMs);
}

// Stop rotation
function stopRotation() {
    if (intervalId) {
        console.log('Stopping rotation...');
        clearInterval(intervalId);
        intervalId = null;
    }
}

// Initialize properties with defaults before user properties arrive
function initializeProperties() {
    updateBlur();
    updateTransitionSpeed();
}

// Button event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Reload button
    const updateBtn = document.getElementById('update-btn');
    updateBtn.addEventListener('click', () => {
        console.log('Manual refresh triggered');
        changeWallpaper();
    });
    
    // Source button - copy link to clipboard
    const sourceBtn = document.getElementById('source-btn');
    sourceBtn.addEventListener('click', () => {
        if (currentImageId) {
            const gelbooruUrl = `https://gelbooru.com/index.php?page=post&s=view&id=${currentImageId}`;
            navigator.clipboard.writeText(gelbooruUrl)
                .then(() => {
                    console.log('Link copied to clipboard:', gelbooruUrl);
                    showClipboardNotification();
                })
                .catch(err => {
                    console.error('Failed to copy link:', err);
                });
        }
    });
    
    // Close manual button
    const closeManualBtn = document.getElementById('close-manual');
    closeManualBtn.addEventListener('click', () => {
        showApiManual(false);
    });
    
    // Close manual when clicking outside
    const manualOverlay = document.getElementById('api-manual');
    manualOverlay.addEventListener('click', (e) => {
        if (e.target === manualOverlay) {
            showApiManual(false);
        }
    });
});

// Wallpaper Engine property listener
window.wallpaperPropertyListener = {
    applyUserProperties: function(properties) {
        console.log('Applying user properties:', properties);
        
        let needsRestart = false;
        let needsRefetch = false;
        
        // API Key
        if (properties.apikey !== undefined) {
            CONFIG.apiKey = properties.apikey.value.trim();
            needsRefetch = true;
            consecutiveErrors = 0; // Reset error counter when API key changes
            console.log('API key updated:', CONFIG.apiKey ? 'Provided' : 'Empty');
            
            // Hide manual if API key is now provided
            if (CONFIG.apiKey) {
                showApiManual(false);
            }
        }
        
        // Check each property - works for both initial load and updates
        if (properties.tags !== undefined) {
            const tagsString = properties.tags.value.trim();
            CONFIG.tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t) : [];
            needsRefetch = true;
            console.log('Tags updated:', CONFIG.tags);
        }
        
        if (properties.excludetags !== undefined) {
            const excludeString = properties.excludetags.value.trim();
            CONFIG.excludeTags = excludeString ? excludeString.split(',').map(t => t.trim()).filter(t => t) : [];
            needsRefetch = true;
            console.log('Exclude tags updated:', CONFIG.excludeTags);
        }
        
        if (properties.rating !== undefined) {
            CONFIG.rating = properties.rating.value;
            needsRefetch = true;
            console.log('Rating updated:', CONFIG.rating);
        }
        
        if (properties.aspectratio !== undefined) {
            CONFIG.aspectRatio = properties.aspectratio.value;
            needsRefetch = true;
            console.log('Aspect ratio updated:', CONFIG.aspectRatio === 0 ? 'Disabled' : CONFIG.aspectRatio);
        }
        
        if (properties.ratiotolerance !== undefined) {
            CONFIG.ratioTolerance = properties.ratiotolerance.value;
            needsRefetch = true;
            console.log('Ratio tolerance updated:', CONFIG.ratioTolerance + '%');
        }
        
        if (properties.intervalminutes !== undefined) {
            CONFIG.intervalMinutes = properties.intervalminutes.value;
            needsRestart = true;
            console.log('Interval updated:', CONFIG.intervalMinutes, 'minutes');
        }
        
        if (properties.limit !== undefined) {
            CONFIG.limit = properties.limit.value;
            console.log('Limit updated:', CONFIG.limit);
        }
        
        if (properties.transition !== undefined) {
            CONFIG.transitionSpeed = properties.transition.value;
            updateTransitionSpeed();
            console.log('Transition speed updated:', CONFIG.transitionSpeed, 'seconds');
        }
        
        if (properties.showloading !== undefined) {
            CONFIG.showLoading = properties.showloading.value;
            const loading = document.getElementById('loading');
            loading.style.display = CONFIG.showLoading ? 'block' : 'none';
            console.log('Show loading updated:', CONFIG.showLoading);
        }
        
        if (properties.bluramount !== undefined) {
            CONFIG.blurAmount = properties.bluramount.value;
            updateBlur();
            console.log('Blur amount updated:', CONFIG.blurAmount);
        }
        
        // Apply changes
        if (needsRefetch) {
            console.log('Refetching images with new settings...');
            imageCache = [];
            stopRotation();
            startRotation();
        } else if (needsRestart) {
            console.log('Restarting timer with new interval...');
            stopRotation();
            const intervalMs = CONFIG.intervalMinutes * 60 * 1000;
            intervalId = setInterval(changeWallpaper, intervalMs);
        }
    }
};

// Initialize on load
window.addEventListener('load', () => {
    console.log('Gelbooru Wallpaper Loaded');
    initializeProperties();
    // Don't start rotation here - wait for applyUserProperties to be called first
    // If it doesn't get called within 1 second, start with defaults
    setTimeout(() => {
        if (intervalId === null) {
            console.log('No properties received, starting with defaults');
            startRotation();
        }
    }, 1000);
});

// Cleanup on unload
window.addEventListener('beforeunload', stopRotation);