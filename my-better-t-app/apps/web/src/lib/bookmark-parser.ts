import type { ParsedBookmark } from "./types"

/**
 * Parse a Netscape Bookmark File Format HTML export
 * (Chrome, Firefox, Safari, Edge all use this format).
 * Walks the DOM rather than regexing the markup.
 */
export function parseBookmarkHtml(html: string): ParsedBookmark[] {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const anchors = doc.querySelectorAll("a[href]")
  const bookmarks: ParsedBookmark[] = []

  anchors.forEach((a) => {
    const href = a.getAttribute("href")
    if (!href || !/^https?:/i.test(href)) return

    const title = (a.textContent ?? "").trim() || href
    const addDate = a.getAttribute("add_date") ?? a.getAttribute("ADD_DATE")
    const addedAt = addDate ? Number(addDate) * 1000 : undefined
    const folder = findEnclosingFolder(a)

    bookmarks.push({
      title,
      url: href,
      addedAt: Number.isFinite(addedAt) ? addedAt : undefined,
      folder,
    })
  })

  return bookmarks
}

function findEnclosingFolder(node: Element): string | undefined {
  let cursor: Element | null = node.parentElement
  while (cursor) {
    if (cursor.tagName === "DL") {
      const heading = cursor.previousElementSibling
      if (heading && heading.tagName === "H3") {
        return (heading.textContent ?? "").trim() || undefined
      }
    }
    cursor = cursor.parentElement
  }
  return undefined
}
