import { cookiesAll } from "./leetcode.config.js"

var cookiesString = cookiesAll

var cookies = []

while (true) {
  let equalityPlace = cookiesString.indexOf("=")
  let colonPlace =
    cookiesString.indexOf(";") !== -1
      ? cookiesString.indexOf(";")
      : cookiesString.length
  let singleCookie = cookiesString.slice(0, colonPlace)
  let cookieKey = singleCookie.slice(0, equalityPlace)
  let cookieValue = singleCookie.slice(equalityPlace + 1, colonPlace)
  cookies.push({
    name: cookieKey,
    value: cookieValue,
  })

  cookiesString = cookiesString.slice(colonPlace + 2)

  if (cookiesString.length === 0) break
}

export { cookies }
