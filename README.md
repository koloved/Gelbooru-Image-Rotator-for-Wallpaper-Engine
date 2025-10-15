# Gelbooru-Image-Rotator-for-Wallpaper-Engine
This project is an advanced, highly customizable live wallpaper for Wallpaper Engine that dynamically fetches and displays images from Gelbooru. It is designed to provide a seamless and visually appealing desktop experience with a rich set of features for personalization.

## Features

### Core Functionality

- **Automatic Image Rotation**: Periodically fetches and displays random images from Gelbooru based on customizable search criteria
- **Smooth Transitions**: Seamless crossfade animations between images with adjustable speed (0.3-3.0 seconds)
- **Dual-Layer Display**: Images displayed with a blurred background layer and crisp foreground layer for visual depth
- **Frosted Glass Effect**: Beautiful backdrop blur effect creating a modern aesthetic


### Customization Options

- **Tag-Based Filtering**: Search images using Gelbooru tags with support for exclude tags
- **Rating Control**: Filter by content rating (General, Questionable, or Explicit)
- **Aspect Ratio Matching**: Optional aspect ratio filtering with adjustable tolerance (0-50%) to match your screen dimensions
- **Adjustable Blur**: Control background blur intensity (0-100px)
- **Custom Intervals**: Set image change frequency from 1 to 60 minutes
- **Batch Size Control**: Configure how many images to fetch per API call (10-200)


### User Interface

- **Manual Refresh Button**: Instantly load the next image on demand
- **Source Button**: Quickly copy the Gelbooru post URL to clipboard for current image
- **Loading Indicator**: Optional loading animation with blurred background overlay
- **API Setup Guide**: Built-in instructional overlay for first-time setup


## Setup Instructions

### Prerequisites

- Wallpaper Engine installed on your system
- A Gelbooru account with API access


### Getting Your API Key

1. Visit gelbooru.com and log in to your account
2. Navigate to **Settings → Options**
3. Scroll down to find your API key and User ID
4. Copy the string in this format: `&api_key=YOUR_KEY&user_id=YOUR_ID`

### Installation

1. Download or clone this repository
2. Place all files in a folder within your Wallpaper Engine wallpapers directory
3. Open Wallpaper Engine and select the wallpaper
4. In the wallpaper settings, paste your API key into the **Gelbooru API Key** field

## Configuration

### Search Tags

Specify comma-separated tags to filter images. Examples:

- `landscape, scenery, nature`
- `1girl, sort:random, width:>=1920, height:>=1080`


### Exclude Tags

Comma-separated tags to exclude from results:

- `animated, censored, lowres`


### Aspect Ratio Filtering

Set to `0` to disable, or specify a ratio (e.g., `1.778` for 16:9, `2.333` for 21:9). The tolerance percentage determines how strict the filtering is.

### Advanced Configuration

All settings can be adjusted in real-time through Wallpaper Engine's property panel without restarting the wallpaper.

## Technical Details

### Architecture

- **Pure Web Technologies**: Built with HTML5, CSS3, and vanilla JavaScript
- **Dual-Slot Image Loading**: Uses two image slots for flicker-free crossfade transitions
- **Smart Caching**: Fetches images in batches and shuffles them for variety
- **Error Handling**: Automatic retry logic with fallback to API setup guide after consecutive failures


### Performance Optimizations

- Hardware-accelerated CSS transforms to prevent flickering
- Backface visibility hidden for smooth transitions
- Image preloading before transition starts
- Efficient aspect ratio filtering with fallback to closest matches


### Browser Compatibility

- Uses standard Fetch API for HTTP requests
- CSS backdrop-filter with webkit prefixes for cross-browser support
- Clipboard API for copy-to-clipboard functionality


## File Structure

```
├── index.html          # Main HTML structure
├── style.css           # Styling and animations
├── script.js           # Core application logic
└── project.json        # Wallpaper Engine configuration
```


## Troubleshooting

### Images Not Loading

- Verify your API key is correctly formatted: `&api_key=YOUR_KEY&user_id=YOUR_ID`
- Check that your search tags return results on Gelbooru's website
- Ensure your aspect ratio tolerance isn't too restrictive


### Rate Limiting

- Increase the **Change Interval** to reduce API calls
- Decrease the **Images Per Batch** value
- Gelbooru may limit requests without a valid API key


## Privacy \& Security

- API keys are stored locally within Wallpaper Engine's configuration
- API keys are hidden in console logs for security
- No data is collected or transmitted to third parties
- All requests are made directly to Gelbooru's API


## License

This project is provided as-is for use with Wallpaper Engine. Gelbooru content is subject to Gelbooru's terms of service.

## Credits

Developed for Wallpaper Engine using the Gelbooru API. All images displayed are hosted by and sourced from Gelbooru.
