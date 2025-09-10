(function () {
  try {
    var root = document.documentElement

    var storedTheme = null
    try {
      storedTheme = localStorage.getItem('theme')
    } catch (_) {}

    if (storedTheme && storedTheme !== 'system') {
      root.classList.add(storedTheme)
      return
    }

    var match = document.cookie.match(/(?:^|; )systemTheme=([^;]+)/)
    var systemTheme = match ? decodeURIComponent(match[1]) : null

    if (systemTheme === 'dark' || systemTheme === 'light') {
      root.classList.add(systemTheme)
    }
  } catch (_) {}
})()


