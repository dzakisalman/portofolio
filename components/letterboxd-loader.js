// Letterboxd Data Loader
// Web scrapes film data from Letterboxd profile page and TMDB API
// 
// IMPORTANT NOTES:
// - This script scrapes data from Letterboxd profile pages
// - Please respect Letterboxd's Terms of Service and implement rate limiting
// - The script includes fallback to RSS feed if scraping fails
// - Rate limiting is implemented (300ms delay between requests)
// - Maximum 20 films are processed to avoid excessive API calls

const LETTERBOXD_USERNAME = 'AncientPrime';
const LETTERBOXD_PROFILE_URL = `https://letterboxd.com/${LETTERBOXD_USERNAME}/`;
const LETTERBOXD_FILMS_URL = `https://letterboxd.com/${LETTERBOXD_USERNAME}/films/`;
// TMDB API Key - Get your free API key from https://www.themoviedb.org/settings/api
const TMDB_API_KEY = '7ec846b478827db44eeec529d6b11d06'; // Replace with your TMDB API key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// CORS proxy (using a public CORS proxy - you may want to use your own)
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// Convert Letterboxd rating to numeric
function letterboxdRatingToNumeric(rating) {
  const ratingMap = {
    '★★★★★': 5,
    '★★★★½': 4.5,
    '★★★★': 4,
    '★★★½': 3.5,
    '★★★': 3,
    '★★½': 2.5,
    '★★': 2,
    '★½': 1.5,
    '★': 1,
    '½': 0.5
  };
  return ratingMap[rating] || 0;
}

// Convert numeric rating to stars
function numericToStars(rating) {
  if (!rating || rating === 0) return '☆☆☆☆☆';
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '★'.repeat(fullStars);
  if (hasHalfStar && fullStars < 5) stars += '½';
  const emptyStars = 5 - Math.ceil(rating);
  if (emptyStars > 0) stars += '☆'.repeat(emptyStars);
  return stars;
}

// Parse Letterboxd HTML page to extract film data
async function parseLetterboxdHTML(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const films = [];

  // Try multiple selectors for different Letterboxd page layouts
  // Selector 1: Poster containers (most common)
  let posterContainers = doc.querySelectorAll('li.poster-container, div.poster-container, li[class*="poster"]');
  
  // Selector 2: Film grid items
  if (posterContainers.length === 0) {
    posterContainers = doc.querySelectorAll('ul.poster-list li, div[class*="film"]');
  }
  
  // Selector 3: Any element with film data attributes
  if (posterContainers.length === 0) {
    posterContainers = doc.querySelectorAll('[data-film-slug], [data-film-id]');
  }

  console.log(`Found ${posterContainers.length} film containers`);

  for (const container of posterContainers) {
    try {
      // Extract title from img alt or data attributes
      const img = container.querySelector('img');
      const title = img?.getAttribute('alt') || 
                   container.getAttribute('data-film-name') ||
                   container.querySelector('span[class*="title"], a[class*="title"]')?.textContent?.trim() ||
                   '';
      
      if (!title) continue;

      // Extract poster URL from img src - try multiple attributes
      let posterUrl = null;
      if (img) {
        // Try different attributes in order of preference
        posterUrl = img.getAttribute('data-src') || 
                   img.getAttribute('src') || 
                   img.getAttribute('data-original') ||
                   img.getAttribute('data-lazy-src') ||
                   img.src;
        
        // Convert to high-res if available (Letterboxd uses specific image sizes)
        if (posterUrl && posterUrl !== 'undefined' && posterUrl !== 'null') {
          // Letterboxd CDN URL format: https://a.ltrbxd.com/resized/film-poster/...
          // Try to get higher resolution version
          if (posterUrl.includes('0-230-0-345-crop')) {
            posterUrl = posterUrl.replace(/\/0-230-0-345-crop/, '/0-500-0-750-crop');
          }
          if (posterUrl.match(/\/w\d+-h\d+/)) {
            posterUrl = posterUrl.replace(/\/w\d+-h\d+/, '/w500-h750');
          }
          // Ensure full URL
          if (posterUrl.startsWith('//')) {
            posterUrl = 'https:' + posterUrl;
          } else if (posterUrl.startsWith('/')) {
            posterUrl = 'https://letterboxd.com' + posterUrl;
          }
        } else {
          posterUrl = null;
        }
      }
      
      // Debug logging
      if (title && !posterUrl) {
        console.log(`No poster found for: ${title}`);
      }

      // Extract rating - Letterboxd uses star ratings
      let rating = '';
      // Try multiple ways to find rating
      const ratingElement = container.querySelector('span[class*="rating"], span[class*="star"], .rating, [class*="rated"]');
      if (ratingElement) {
        rating = ratingElement.textContent.trim();
        // Check for star emoji or text
        if (!rating || rating.length === 0) {
          rating = ratingElement.getAttribute('data-rating') || 
                  ratingElement.getAttribute('title') || '';
        }
      }
      // Also check parent for rating
      if (!rating) {
        const parentRating = container.closest('[class*="rating"], [class*="rated"]');
        if (parentRating) {
          rating = parentRating.textContent.match(/[★½]+/)?.[0] || '';
        }
      }

      // Extract link to film page
      const linkElement = container.querySelector('a');
      const link = linkElement ? 
        (linkElement.href.startsWith('http') ? linkElement.href : `https://letterboxd.com${linkElement.getAttribute('href')}`) :
        `https://letterboxd.com/film/${title.toLowerCase().replace(/\s+/g, '-')}/`;

      // Extract year if available (usually in title or separate element)
      const yearElement = container.querySelector('small[class*="year"], span[class*="year"]');
      const year = yearElement?.textContent?.trim() || '';
      
      // Extract review/description if available
      const reviewElement = container.querySelector('p[class*="review"], div[class*="review"], .review-text');
      const description = reviewElement?.textContent?.trim() || '';

      // Extract film slug for better identification
      const filmSlug = container.getAttribute('data-film-slug') || 
                      linkElement?.getAttribute('href')?.replace('/film/', '').replace('/', '') ||
                      '';

      films.push({
        title: title.trim(),
        year: year,
        rating: rating,
        ratingNumeric: letterboxdRatingToNumeric(rating),
        link: link,
        description: description,
        posterUrl: posterUrl,
        filmSlug: filmSlug
      });
    } catch (error) {
      console.error('Error parsing film container:', error);
    }
  }

  // If no films found with poster containers, try to extract from favorite films section
  if (films.length === 0) {
    const favoriteSection = doc.querySelector('section[class*="favorite"], div[class*="favorite-films"]');
    if (favoriteSection) {
      const favoriteFilms = favoriteSection.querySelectorAll('a, li');
      favoriteFilms.forEach(film => {
        const title = film.textContent?.trim() || film.getAttribute('title') || '';
        if (title) {
          films.push({
            title: title,
            year: '',
            rating: '',
            ratingNumeric: 0,
            link: film.href || '#',
            description: '',
            posterUrl: null,
            filmSlug: ''
          });
        }
      });
    }
  }

  console.log(`Parsed ${films.length} films from HTML`);
  return films;
}

// Search TMDB for film details
async function getTMDBFilmDetails(title, year = '') {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
    
    // Try direct fetch first
    let response;
    try {
      response = await fetch(searchUrl);
    } catch (error) {
      // If CORS fails, use proxy
      response = await fetch(CORS_PROXY + encodeURIComponent(searchUrl));
    }
    
    if (!response.ok) throw new Error('TMDB API error');
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const film = data.results[0];
      
      // Get detailed info including genres
      const detailsUrl = `${TMDB_BASE_URL}/movie/${film.id}?api_key=${TMDB_API_KEY}`;
      let detailsResponse;
      try {
        detailsResponse = await fetch(detailsUrl);
      } catch (error) {
        detailsResponse = await fetch(CORS_PROXY + encodeURIComponent(detailsUrl));
      }
      
      if (detailsResponse.ok) {
        const details = await detailsResponse.json();
        return {
          id: film.id,
          title: film.title,
          poster: film.poster_path ? `${TMDB_IMAGE_BASE}${film.poster_path}` : null,
          backdrop: film.backdrop_path ? `${TMDB_IMAGE_BASE}${film.backdrop_path}` : null,
          overview: film.overview || details.overview || '',
          genres: details.genres ? details.genres.map(g => g.name) : [],
          releaseDate: film.release_date || details.release_date,
          imdbId: details.imdb_id,
          rating: film.vote_average || 0
        };
      }
      
      return {
        id: film.id,
        title: film.title,
        poster: film.poster_path ? `${TMDB_IMAGE_BASE}${film.poster_path}` : null,
        backdrop: film.backdrop_path ? `${TMDB_IMAGE_BASE}${film.backdrop_path}` : null,
        overview: film.overview || '',
        genres: [],
        releaseDate: film.release_date,
        rating: film.vote_average || 0
      };
    }
  } catch (error) {
    console.error(`Error fetching TMDB data for ${title}:`, error);
  }
  return null;
}

// Fetch Letterboxd profile page and scrape film data
async function fetchLetterboxdData() {
  try {
    console.log('Fetching Letterboxd profile page...');
    
    // Try to fetch the films page first (more structured data)
    let response;
    let htmlText;
    
    // Try direct fetch first
    try {
      response = await fetch(LETTERBOXD_FILMS_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (response.ok) {
        htmlText = await response.text();
        console.log('Direct fetch successful from films page');
      } else {
        throw new Error(`Direct fetch failed: ${response.status}`);
      }
    } catch (error) {
      console.log('Direct fetch failed, trying CORS proxy...', error);
      // If CORS fails, use proxy
      try {
        const proxyUrl = CORS_PROXY + encodeURIComponent(LETTERBOXD_FILMS_URL);
        response = await fetch(proxyUrl);
        if (response.ok) {
          htmlText = await response.text();
          console.log('Proxy fetch successful from films page');
        } else {
          // Try profile page as fallback
          const profileProxyUrl = CORS_PROXY + encodeURIComponent(LETTERBOXD_PROFILE_URL);
          response = await fetch(profileProxyUrl);
          if (response.ok) {
            htmlText = await response.text();
            console.log('Proxy fetch successful from profile page');
          } else {
            throw new Error(`Proxy fetch failed: ${response.status}`);
          }
        }
      } catch (proxyError) {
        console.error('Both direct and proxy fetch failed:', proxyError);
        throw proxyError;
      }
    }
    
    if (!htmlText || htmlText.length === 0) {
      throw new Error('Empty response from Letterboxd');
    }
    
    console.log('Parsing HTML...');
    const films = await parseLetterboxdHTML(htmlText);
    
    if (films.length === 0) {
      console.warn('No films found in HTML. Profile might be private or page structure changed.');
      return [];
    }
    
    console.log(`Found ${films.length} films. Fetching TMDB details...`);
    
    // Get TMDB details for each film (limit to first 20 for performance and rate limiting)
    const filmsWithDetails = [];
    const maxFilms = Math.min(films.length, 20);
    
    for (let i = 0; i < maxFilms; i++) {
      const film = films[i];
      console.log(`Processing ${i + 1}/${maxFilms}: ${film.title}`);
      
      try {
        // Always try to get TMDB data for poster and additional info
        let tmdbData = null;
        let finalPoster = null;
        
        // Try to get TMDB data first (more reliable for posters)
        tmdbData = await getTMDBFilmDetails(film.title, film.year);
        
        if (tmdbData && tmdbData.poster) {
          // Use TMDB poster as primary source (more reliable)
          finalPoster = tmdbData.poster;
          console.log(`✓ Using TMDB poster for: ${film.title}`);
        } else if (film.posterUrl) {
          // Fallback to Letterboxd poster if TMDB doesn't have one
          finalPoster = film.posterUrl;
          console.log(`✓ Using Letterboxd poster for: ${film.title}`);
        } else {
          // No poster available
          console.warn(`✗ No poster found for: ${film.title}`);
          finalPoster = null;
        }
        
        if (tmdbData) {
          filmsWithDetails.push({
            ...film,
            poster: finalPoster || tmdbData.poster || null,
            backdrop: tmdbData.backdrop || null,
            overview: tmdbData.overview || film.description || '',
            genres: tmdbData.genres || [],
            releaseDate: tmdbData.releaseDate || film.year || '',
            imdbId: tmdbData.imdbId || null,
            tmdbRating: tmdbData.rating || 0
          });
        } else {
          // Use Letterboxd data only if TMDB fails
          filmsWithDetails.push({
            ...film,
            poster: finalPoster,
            overview: film.description || '',
            genres: [],
            releaseDate: film.year || '',
            imdbId: null,
            tmdbRating: 0
          });
        }
      } catch (error) {
        console.error(`Error processing ${film.title}:`, error);
        // Still add the film with basic data
        filmsWithDetails.push({
          ...film,
          poster: film.posterUrl || null,
          overview: film.description || '',
          genres: [],
          releaseDate: film.year || '',
          imdbId: null,
          tmdbRating: 0
        });
      }
      
      // Rate limiting: delay between requests to avoid being blocked
      if (i < maxFilms - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    console.log(`Successfully loaded ${filmsWithDetails.length} films with details`);
    return filmsWithDetails;
  } catch (error) {
    console.error('Error fetching Letterboxd data via scraping:', error);
    console.log('Falling back to RSS feed...');
    
    // Fallback to RSS feed if scraping fails
    try {
      const rssUrl = `https://letterboxd.com/${LETTERBOXD_USERNAME}/rss/`;
      let response;
      try {
        response = await fetch(rssUrl);
      } catch (e) {
        response = await fetch(CORS_PROXY + encodeURIComponent(rssUrl));
      }
      
      if (response.ok) {
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const items = xmlDoc.querySelectorAll('item');
        const films = [];
        
        for (const item of items) {
          const title = item.querySelector('title')?.textContent || '';
          const link = item.querySelector('link')?.textContent || '';
          const description = item.querySelector('description')?.textContent || '';
          const ratingMatch = description.match(/([★½]+)/);
          const rating = ratingMatch ? ratingMatch[1] : '';
          
          let filmTitle = title.replace(/watched\s+|rated\s+/i, '').trim();
          const yearMatch = filmTitle.match(/\((\d{4})\)/);
          const year = yearMatch ? yearMatch[1] : '';
          filmTitle = filmTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();
          
          if (filmTitle) {
            films.push({
              title: filmTitle,
              year: year,
              rating: rating,
              ratingNumeric: letterboxdRatingToNumeric(rating),
              link: link,
              description: description,
              posterUrl: null
            });
          }
        }
        
        // Get TMDB details for RSS films
        const filmsWithDetails = [];
        for (let i = 0; i < Math.min(films.length, 20); i++) {
          const film = films[i];
          const tmdbData = await getTMDBFilmDetails(film.title, film.year);
          if (tmdbData) {
            filmsWithDetails.push({ ...film, ...tmdbData });
          } else {
            filmsWithDetails.push(film);
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.log(`Loaded ${filmsWithDetails.length} films from RSS feed fallback`);
        return filmsWithDetails;
      }
    } catch (rssError) {
      console.error('RSS feed fallback also failed:', rssError);
    }
    
    return [];
  }
}

// Render featured films
function renderFeaturedFilms(films) {
  const featuredContainer = document.getElementById('featured-films-container');
  if (!featuredContainer || films.length === 0) return;
  
  // Get top 3-5 rated films for featured
  const featured = films
    .filter(f => f.ratingNumeric >= 4)
    .sort((a, b) => b.ratingNumeric - a.ratingNumeric)
    .slice(0, 5);
  
  if (featured.length === 0) return;
  
  featuredContainer.innerHTML = featured.map((film, index) => {
    const isWide = index === featured.length - 1 && featured.length === 3;
    const posterUrl = film.poster || film.posterUrl || 'https://via.placeholder.com/500x750?text=No+Poster';
    const rating = film.ratingNumeric || 0;
    const ratingText = rating > 0 ? rating.toFixed(1) : 'N/A';
    const genres = film.genres && film.genres.length > 0 
      ? film.genres.slice(0, 3).map(g => `<span class="text-xs font-medium bg-primary/20 text-primary px-2.5 py-1 rounded-full">${g}</span>`).join('')
      : '';
    const imdbLink = film.imdbId ? `https://www.imdb.com/title/${film.imdbId}/` : film.link || '#';
    
    if (isWide) {
      return `
        <div class="film-card flex flex-col rounded-xl border border-[#314d68] bg-[#182634] overflow-hidden group md:col-span-2">
          <div class="flex flex-col md:flex-row">
            <div class="w-full md:w-2/5 h-80 md:h-auto relative overflow-hidden bg-[#182634]">
              <img src="${posterUrl}" alt="${film.title}" class="w-full h-full object-cover" style="display: block;" onerror="this.onerror=null; this.src='https://via.placeholder.com/500x750?text=No+Poster';" />
            </div>
            <div class="w-full md:w-3/5 p-6 flex flex-col">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-white text-2xl font-bold">${film.title}</h3>
                <div class="flex items-center gap-1">
                  <span class="text-primary font-bold text-lg">${ratingText}</span>
                  <span class="text-gray-400 text-sm">/10</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-2 mb-4">
                ${genres}
              </div>
              <p class="text-gray-300 text-sm leading-relaxed mb-4 flex-grow">
                ${film.overview || film.description || 'No description available.'}
              </p>
              <div class="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <span class="material-symbols-outlined text-base">play_circle</span>
                <span>View on Letterboxd</span>
              </div>
              <a href="${imdbLink}" target="_blank" rel="noopener noreferrer" class="text-primary font-semibold text-sm self-start hover:underline flex items-center gap-1">
                View on ${film.imdbId ? 'IMDb' : 'Letterboxd'}
                <span class="material-symbols-outlined text-base">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="film-card flex flex-col rounded-xl border border-[#314d68] bg-[#182634] overflow-hidden group">
        <div class="w-full h-80 relative overflow-hidden bg-[#182634]">
          <img src="${posterUrl}" alt="${film.title}" class="w-full h-full object-cover" style="display: block;" onerror="this.onerror=null; this.src='https://via.placeholder.com/500x750?text=No+Poster';" />
        </div>
        <div class="p-6 flex flex-col flex-grow">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-white text-2xl font-bold">${film.title}</h3>
            <div class="flex items-center gap-1">
              <span class="text-primary font-bold text-lg">${ratingText}</span>
              <span class="text-gray-400 text-sm">/10</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2 mb-4">
            ${genres}
          </div>
          <p class="text-gray-300 text-sm leading-relaxed mb-4 flex-grow">
            ${film.overview || film.description || 'No description available.'}
          </p>
          <div class="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <span class="material-symbols-outlined text-base">play_circle</span>
            <span>View on Letterboxd</span>
          </div>
          <a href="${imdbLink}" target="_blank" rel="noopener noreferrer" class="text-primary font-semibold text-sm self-start hover:underline flex items-center gap-1">
            View on ${film.imdbId ? 'IMDb' : 'Letterboxd'}
            <span class="material-symbols-outlined text-base">arrow_forward</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// Render all films
function renderAllFilms(films) {
  const allFilmsContainer = document.getElementById('all-films-container');
  if (!allFilmsContainer) return;
  
  allFilmsContainer.innerHTML = films.map(film => {
    // Use poster from film data, prioritize TMDB poster, then Letterboxd, then placeholder
    const posterUrl = film.poster || film.posterUrl || 'https://via.placeholder.com/500x750?text=No+Poster';
    const rating = film.ratingNumeric || 0;
    const ratingText = rating > 0 ? rating.toFixed(1) : 'N/A';
    const stars = rating > 0 ? numericToStars(rating) : '☆☆☆☆☆';
    const genres = film.genres && film.genres.length > 0 
      ? film.genres.slice(0, 2).map(g => `<span class="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded-full">${g}</span>`).join('')
      : '';
    const imdbLink = film.imdbId ? `https://www.imdb.com/title/${film.imdbId}/` : film.link || '#';
    const description = film.overview || film.description || 'No description available.';
    const shortDescription = description.length > 150 ? description.substring(0, 150) + '...' : description;
    
    return `
      <div class="film-card flex flex-col rounded-xl border border-[#314d68] bg-[#182634] overflow-hidden group">
        <div class="w-full h-64 relative overflow-hidden bg-[#182634]">
          <img src="${posterUrl}" alt="${film.title}" class="w-full h-full object-cover" style="display: block;" onerror="this.onerror=null; this.src='https://via.placeholder.com/500x750?text=No+Poster';" />
          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
            <div class="text-center px-4">
              <div class="flex items-center justify-center gap-1 mb-2">
                <span class="text-yellow-400 font-bold text-lg">${ratingText}</span>
                <span class="text-white text-sm">/10</span>
              </div>
              <p class="text-white text-sm">${shortDescription}</p>
            </div>
          </div>
        </div>
        <div class="p-4 flex flex-col flex-grow">
          <h3 class="text-white text-lg font-bold mb-2">${film.title}</h3>
          <div class="flex items-center gap-1 mb-3">
            <span class="star-rating">${stars}</span>
            <span class="text-gray-400 text-xs ml-1">(${ratingText}/10)</span>
          </div>
          <p class="text-gray-300 text-sm leading-relaxed mb-3 flex-grow">
            ${shortDescription}
          </p>
          <div class="flex flex-wrap gap-2 mb-3">
            ${genres}
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <span class="material-symbols-outlined text-sm">play_circle</span>
            <span>Letterboxd</span>
          </div>
          <a href="${imdbLink}" target="_blank" rel="noopener noreferrer" class="text-primary font-semibold text-xs hover:underline">
            View Details →
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// Main function to load and display films
async function loadLetterboxdFilms() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
  
  try {
    const films = await fetchLetterboxdData();
    
    if (films.length === 0) {
      console.warn('No films found. Using fallback data.');
      return;
    }
    
    // Render featured films (top rated)
    renderFeaturedFilms(films);
    
    // Render all films
    renderAllFilms(films);
    
  } catch (error) {
    console.error('Error loading films:', error);
  } finally {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadLetterboxdFilms, fetchLetterboxdData };
}

