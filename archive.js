// Runs on archive.ph / archive.is / archive.today
// Removes the archive toolbar so the article fills the full screen.
// CSS handles the initial hide; this script cleans up residual margin/padding
// that archive sets dynamically via inline styles after load.

function stripHeader() {
  const ids = ['HEADER', 'TBAR', 'TOOLBOX', 'ABBLOCK', 'TOPBAR'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  // Remove inline top offset archive adds to body/content after its JS runs
  document.body.style.marginTop = '0';
  document.body.style.paddingTop = '0';

  const content = document.getElementById('CONTENT') || document.getElementById('snap_div');
  if (content) {
    content.style.marginTop = '0';
    content.style.paddingTop = '0';
  }
}

// Run immediately and after archive's own JS has a chance to set margins
stripHeader();
document.addEventListener('DOMContentLoaded', stripHeader);
setTimeout(stripHeader, 500);
setTimeout(stripHeader, 1500);
