import { lazy } from 'react'

const RELOAD_KEY = 'vata-chunk-reload'

/**
 * React.lazy with one automatic reload: after a new deploy, a browser still
 * running the old version may request page files that no longer exist.
 * Reloading once fetches the new version instead of showing a broken page.
 */
export function lazyPage(importer) {
  return lazy(async () => {
    try {
      const mod = await importer()
      try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* storage blocked */ }
      return mod
    } catch (err) {
      let reloaded = false
      try { reloaded = sessionStorage.getItem(RELOAD_KEY) === '1' } catch { /* storage blocked */ }
      if (!reloaded && navigator.onLine) {
        try { sessionStorage.setItem(RELOAD_KEY, '1') } catch { /* storage blocked */ }
        window.location.reload()
        return new Promise(() => {}) // keep the loader up while the page reloads
      }
      throw err
    }
  })
}
