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

// Featured films: explicitly set these Letterboxd film URLs to show in Featured Films.
// This avoids depending on the profile scraping to choose featured films.
const FEATURED_FILM_URLS = [
  'https://letterboxd.com/film/inception/',
  'https://letterboxd.com/film/the-batman/',
  'https://letterboxd.com/film/the-odyssey-2026/',
  'https://letterboxd.com/film/project-hail-mary/'
];

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

// Fetch a single Letterboxd film page and extract metadata (og:image, og:title, description)
async function fetchLetterboxdFilmPage(url) {
  try {
    let response;
    try {
      response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    } catch (err) {
      // Fall back to proxy if CORS blocks direct fetch
      response = await fetch(CORS_PROXY + encodeURIComponent(url));
    }

    if (!response || !response.ok) throw new Error('Failed to fetch Letterboxd film page');
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || null;
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title || null;
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
      doc.querySelector('meta[name="description"]')?.getAttribute('content') || null;

    return { posterUrl: ogImage, title: ogTitle, description: ogDesc, link: url };
  } catch (error) {
    console.warn('Error fetching Letterboxd film page:', error);
    return null;
  }
}

// Fetch films from Letterboxd RSS feed (primary source - more reliable, no CORS issues)
async function fetchLetterboxdRSS() {
  const rssUrl = `https://letterboxd.com/${LETTERBOXD_USERNAME}/rss/`;
  let response;

  // Try direct fetch first
  try {
    response = await fetch(rssUrl);
  } catch (e) {
    console.log('RSS direct fetch failed, trying CORS proxy...', e);
    response = await fetch(CORS_PROXY + encodeURIComponent(rssUrl));
  }

  if (!response || !response.ok) throw new Error(`RSS fetch failed: ${response?.status}`);

  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const items = xmlDoc.querySelectorAll('item');
  const films = [];

  for (const item of items) {
    // Prefer Letterboxd-specific tags (more accurate)
    const lbTitle = item.getElementsByTagNameNS('https://letterboxd.com', 'filmTitle')[0]?.textContent
      || item.getElementsByTagName('letterboxd:filmTitle')[0]?.textContent;
    const lbYear = item.getElementsByTagNameNS('https://letterboxd.com', 'filmYear')[0]?.textContent
      || item.getElementsByTagName('letterboxd:filmYear')[0]?.textContent;
    const lbRating = item.getElementsByTagNameNS('https://letterboxd.com', 'memberRating')[0]?.textContent
      || item.getElementsByTagName('letterboxd:memberRating')[0]?.textContent;

    // Fallback: parse from <title> tag
    let filmTitle = lbTitle;
    let year = lbYear || '';
    if (!filmTitle) {
      let rawTitle = item.querySelector('title')?.textContent || '';
      rawTitle = rawTitle.replace(/^.*?watched\s+|^.*?rated\s+/i, '').trim();
      const yearMatch = rawTitle.match(/\((\d{4})\)/);
      year = yearMatch ? yearMatch[1] : '';
      filmTitle = rawTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();
    }

    if (!filmTitle) continue;

    // Rating: prefer numeric lb:memberRating (0.5–5), else parse stars from description
    let ratingNumeric = lbRating ? parseFloat(lbRating) : 0;
    let ratingStars = '';
    if (!ratingNumeric) {
      const desc = item.querySelector('description')?.textContent || '';
      const starMatch = desc.match(/([★½]+)/);
      ratingStars = starMatch ? starMatch[1] : '';
      ratingNumeric = letterboxdRatingToNumeric(ratingStars);
    }

    // Extract poster from <description> img tag
    const descHtml = item.querySelector('description')?.textContent || '';
    const imgMatch = descHtml.match(/<img[^>]+src="([^"]+)"/);
    const posterUrl = imgMatch ? imgMatch[1] : null;

    const link = item.querySelector('link')?.textContent || '';

    films.push({
      title: filmTitle.trim(),
      year,
      rating: ratingStars,
      ratingNumeric,
      link,
      description: '',
      posterUrl
    });
  }

  console.log(`RSS: parsed ${films.length} films`);
  return films;
}

// Fetch Letterboxd data — RSS primary, HTML scraping fallback
async function fetchLetterboxdData() {
  // ── PRIMARY: RSS Feed ─────────────────────────────────────────────────────
  try {
    console.log('Fetching Letterboxd RSS feed (primary)...');
    const films = await fetchLetterboxdRSS();

    if (films.length === 0) throw new Error('RSS returned 0 films');

    console.log(`RSS: ${films.length} films found. Enriching with TMDB...`);
    return await enrichWithTMDB(films);

  } catch (rssError) {
    console.warn('RSS feed failed, falling back to HTML scraping...', rssError);
  }

  // ── FALLBACK: HTML Scraping ───────────────────────────────────────────────
  try {
    let htmlText;
    let response;

    try {
      response = await fetch(LETTERBOXD_FILMS_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (response.ok) htmlText = await response.text();
      else throw new Error(`Direct fetch failed: ${response.status}`);
    } catch (e) {
      console.log('HTML direct fetch failed, trying proxy...', e);
      const proxyUrl = CORS_PROXY + encodeURIComponent(LETTERBOXD_FILMS_URL);
      response = await fetch(proxyUrl);
      if (response.ok) {
        htmlText = await response.text();
      } else {
        const profileProxy = CORS_PROXY + encodeURIComponent(LETTERBOXD_PROFILE_URL);
        response = await fetch(profileProxy);
        if (response.ok) htmlText = await response.text();
        else throw new Error(`All fallbacks failed: ${response.status}`);
      }
    }

    if (!htmlText) throw new Error('Empty HTML response');

    const films = await parseLetterboxdHTML(htmlText);
    if (films.length === 0) throw new Error('HTML parse returned 0 films');

    console.log(`HTML scrape: ${films.length} films. Enriching with TMDB...`);
    return await enrichWithTMDB(films);

  } catch (htmlError) {
    console.error('All data sources failed:', htmlError);
    return [];
  }
}

// Enrich film list with TMDB data (poster, genre, overview, etc.)
async function enrichWithTMDB(films) {
  const result = [];
  const maxFilms = Math.min(films.length, 20);

  for (let i = 0; i < maxFilms; i++) {
    const film = films[i];
    console.log(`TMDB ${i + 1}/${maxFilms}: ${film.title}`);

    try {
      const tmdb = await getTMDBFilmDetails(film.title, film.year);

      if (tmdb) {
        result.push({
          ...film,
          poster: tmdb.poster || film.posterUrl || null,
          backdrop: tmdb.backdrop || null,
          overview: tmdb.overview || film.description || '',
          genres: tmdb.genres || [],
          releaseDate: tmdb.releaseDate || film.year || '',
          imdbId: tmdb.imdbId || null,
          tmdbRating: tmdb.rating || 0
        });
      } else {
        result.push({
          ...film,
          poster: film.posterUrl || null,
          overview: film.description || '',
          genres: [],
          releaseDate: film.year || '',
          imdbId: null,
          tmdbRating: 0
        });
      }
    } catch (err) {
      console.error(`TMDB error for ${film.title}:`, err);
      result.push({ ...film, poster: film.posterUrl || null, genres: [], tmdbRating: 0 });
    }

    if (i < maxFilms - 1) await new Promise(r => setTimeout(r, 300));
  }

  console.log(`Enriched ${result.length} films with TMDB data`);
  return result;
}

// Render featured films
async function renderFeaturedFilms(films, featuredUrls = FEATURED_FILM_URLS) {
  const featuredContainer = document.getElementById('featured-films-container');
  if (!featuredContainer) return;

  // If explicit featured URLs are provided, construct the featured list in that order
  let featured = [];
  if (featuredUrls && featuredUrls.length > 0) {
    function slugFromUrl(url) {
      try { const u = new URL(url); const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/'); return parts[parts.length - 1]; } catch { return url.split('/').filter(Boolean).pop(); }
    }

    for (const url of featuredUrls) {
      const slug = slugFromUrl(url).toLowerCase();
      // Try to find matching film from scraped data
      let film = films.find(f => (f.filmSlug && f.filmSlug.toLowerCase().includes(slug)) || (f.link && f.link.toLowerCase().includes(slug)) || (f.title && f.title.toLowerCase().replace(/\s+/g, '-').includes(slug)));

      if (!film) {
        // If not found in scraped data, attempt to fetch TMDB details by guessing title from slug
        // Try to detect a year inside the slug to make TMDB search more accurate (e.g., 'superman-2025')
        const yearMatch = slug.match(/(19|20)\d{2}/);
        const yearHint = yearMatch ? yearMatch[0] : '';
        // Strip the year from the title guess so TMDB gets a clean title (e.g. 'superman' not 'superman 2025')
        const titleGuess = slug.replace(/[-_]?(19|20)\d{2}[-_]?/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
        console.log(`Featured: looking up TMDB for "${titleGuess}" year:${yearHint}`);
        const tmdb = await getTMDBFilmDetails(titleGuess, yearHint);
        film = {
          title: tmdb?.title ?? titleGuess.replace(/\b\w/g, c => c.toUpperCase()),
          year: tmdb?.releaseDate ? tmdb.releaseDate.split('-')[0] : (yearHint || ''),
          rating: '',
          ratingNumeric: tmdb ? (tmdb.rating / 2) : 0,
          link: url,
          poster: tmdb?.poster ?? null,
          posterUrl: tmdb?.poster ?? null,
          overview: tmdb?.overview ?? '',
          genres: tmdb?.genres ?? [],
          imdbId: tmdb?.imdbId ?? null,
          tmdbRating: tmdb?.rating ?? 0
        };

        // If no poster found from TMDB, try to fetch the Letterboxd film page directly for og:image
        if ((!film.poster || film.poster === null) && url) {
          try {
            const lbData = await fetchLetterboxdFilmPage(url);
            if (lbData) {
              if (lbData.posterUrl) {
                film.poster = film.posterUrl = lbData.posterUrl;
                console.log(`Featured: found Letterboxd poster for "${film.title}"`);
              }
              if (!film.overview && lbData.description) film.overview = lbData.description;
              if (!film.title && lbData.title) film.title = lbData.title;
            }
          } catch (e) {
            console.log('Featured: Letterboxd page fallback failed', e);
          }
        }
      }

      featured.push(film);
    }
  } else {
    // Fallback: top-rated films from scraped data
    featured = films
      .filter(f => f.ratingNumeric >= 4)
      .sort((a, b) => b.ratingNumeric - a.ratingNumeric)
      .slice(0, 5);
  }

  if (featured.length === 0) return;

  featuredContainer.className = 'grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4';
  featuredContainer.innerHTML = featured.map(renderFilmCard).join('');
}


// Render a single film card (used by both featured and all-films sections)
function renderFilmCard(film) {
  let posterUrl = film.poster || film.posterUrl || null;
  if (!posterUrl || posterUrl === 'null' || posterUrl === 'undefined') {
    posterUrl = 'https://via.placeholder.com/500x750?text=No+Poster';
  }
  const rating = film.ratingNumeric || 0;
  const ratingText = rating > 0 ? rating.toFixed(1) : 'N/A';
  const year = film.year || (film.releaseDate ? film.releaseDate.split('-')[0] : '');
  const genres = film.genres && film.genres.length > 0
    ? film.genres.slice(0, 2).map(g => `<span class="text-[10px] bg-white/10 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">${g}</span>`).join('')
    : '';
  const letterboxdLink = film.link || '#';

  return `
    <a href="${letterboxdLink}" target="_blank" rel="noopener noreferrer" class="group block relative rounded-xl border border-[#22374c] hover:border-primary transition-all duration-300 shadow-md hover:shadow-primary/20 hover:-translate-y-1 overflow-hidden bg-[#162332]" style="aspect-ratio: 2/3;">
      <img
        src="${posterUrl}"
        alt="${film.title}"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        onerror="this.onerror=null; this.src='https://via.placeholder.com/500x750?text=No+Poster';"
      />
      <!-- Hover overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#0c131c] via-[#0c131c]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <h3 class="text-white font-bold text-sm leading-tight mb-1 line-clamp-2">${film.title}</h3>
        ${year ? `<p class="text-slate-300 text-xs mb-1.5">${year}</p>` : ''}
        <div class="flex flex-wrap gap-1 mb-2">${genres}</div>
        <div class="flex items-center gap-1 text-primary text-xs font-semibold">
          <span>Letterboxd</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </div>
      </div>
      <!-- Rating badge -->
      ${rating > 0 ? `
      <div class="absolute top-2 right-2 bg-[#0c131c]/85 border border-[#22374c] backdrop-blur-md text-amber-400 font-bold text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
        <span>★</span>
        <span>${ratingText}</span>
      </div>` : ''}
    </a>
  `;
}

// Render all films
function renderAllFilms(films) {
  const allFilmsContainer = document.getElementById('all-films-container');
  if (!allFilmsContainer) return;

  allFilmsContainer.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4';
  allFilmsContainer.innerHTML = films.map(renderFilmCard).join('');
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
      console.warn('No films found. Rendering featured films from featured URLs.');
      await renderFeaturedFilms([], FEATURED_FILM_URLS);
      return;
    }

    // Render featured films (use explicit featured URLs)
    await renderFeaturedFilms(films);

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

