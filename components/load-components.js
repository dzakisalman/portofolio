// Function to load header and footer components
async function loadComponents(pageName, activeNav) {
  // Load header
  try {
    const headerResponse = await fetch('components/header.html');
    const headerHtml = await headerResponse.text();
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
      headerContainer.innerHTML = headerHtml;
      
      // Set page title
      const pageTitle = document.getElementById('page-title');
      if (pageTitle) {
        pageTitle.textContent = pageName;
      }
      
      // Set active navigation (desktop and mobile)
      if (activeNav) {
        const activeNavElement = document.getElementById(`nav-${activeNav}`);
        if (activeNavElement) {
          activeNavElement.classList.add('text-primary');
        }
        const mobileNavElement = document.getElementById(`mobile-nav-${activeNav}`);
        if (mobileNavElement) {
          mobileNavElement.classList.add('text-primary');
        }
      }
    }
  } catch (error) {
    console.error('Error loading header:', error);
  }
  
  // Load footer
  try {
    const footerResponse = await fetch('components/footer.html');
    const footerHtml = await footerResponse.text();
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
      footerContainer.innerHTML = footerHtml;
    }
  } catch (error) {
    console.error('Error loading footer:', error);
  }
}

