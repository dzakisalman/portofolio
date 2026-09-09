// Function to load header and footer components
async function loadComponents(pageName, activeNav) {
  // Load header
  try {
    const headerResponse = await fetch('components/header.html');
    const headerHtml = await headerResponse.text();
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
      headerContainer.innerHTML = headerHtml;
      
      // Set active navigation (desktop and mobile)
      if (activeNav) {
        const activeNavElement = document.getElementById(`nav-${activeNav}`);
        if (activeNavElement) {
          activeNavElement.classList.remove('text-slate-300', 'hover:bg-white/5');
          activeNavElement.classList.add('bg-primary', 'text-white', 'shadow-sm', 'shadow-primary/30');
          activeNavElement.setAttribute('aria-current', 'page');
        }
        const mobileNavElement = document.getElementById(`mobile-nav-${activeNav}`);
        if (mobileNavElement) {
          mobileNavElement.classList.add('text-primary', 'bg-[#182737]', 'font-bold');
          mobileNavElement.setAttribute('aria-current', 'page');
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
