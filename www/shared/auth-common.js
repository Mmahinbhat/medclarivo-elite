// Shared auth helpers used across pages.
// Keeps logout behavior identical everywhere instead of re-implemented per page.

function handleLogout(event) {
  if (event) event.preventDefault();
  localStorage.removeItem('mc_token');
  localStorage.removeItem('mc_user');
  window.location.href = 'index.html';
}
