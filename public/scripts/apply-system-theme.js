(function () {
  try {
    var root = document.documentElement

    // Bail if the init script has already applied a theme on the server
    if (root && root.dataset && root.dataset.appliedTheme) {
      return
    }

    var storedTheme = null
    try {
      storedTheme = localStorage.getItem('theme')
    } catch (_) {}

    if (storedTheme && storedTheme !== 'system') {
      // Ensure no conflicting theme classes remain before applying
      root.classList.remove('light', 'dark')
      root.classList.add(storedTheme)
      return
    }

    var match = document.cookie.match(/(?:^|;\s*)systemTheme=([^;]+)/)
    var captured = match && match[1] ? match[1] : null
    var systemTheme = captured ? decodeURIComponent(captured) : null

    if (systemTheme === 'dark' || systemTheme === 'light') {
      // Clean up potential existing classes before applying system theme
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
    }
  } catch (_) {}
})()


