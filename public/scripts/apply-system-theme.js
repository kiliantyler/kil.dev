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
    var captured = match && match[1] ? match[1] : null
    var systemTheme = captured ? decodeURIComponent(captured) : null

    if (systemTheme === 'dark' || systemTheme === 'light') {
      root.classList.add(systemTheme)
    }
  } catch (_) {}
})()


