import fs from "fs"
import puppeteer from "puppeteer"
import { cookies } from "./cookiesParser.js"
;(async () => {
  var questionNumber = process.argv.slice(2)
  try {
    if (questionNumber.length === 0) {
      throw "Please enter a question number"
    }

    if (!fs.existsSync(`./questions/q${questionNumber}.js`)) {
      throw "This solution doesn't exist!!"
    }
  } catch (e) {
    console.log(e)
    return
  }

  const browser = await puppeteer.launch({
    executablePath:
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: false,
  })

  const page = await browser.newPage()

  await page.goto("https://leetcode.com/problemset/all/")

  await page.setCookie(...cookies)

  await page.type("input[placeholder='Search questions']", questionNumber)

  await page.waitForTimeout(2000)

  var questionTitle = await page.evaluate(() => {
    return document.querySelectorAll('a[href^="/problems/"]')[3].innerText
  })

  var questionName = await questionTitle.split(questionNumber + ". ")[1]
  var dashQuestionName = await questionName
    .split(" ")
    .reduce((name, c) => name.concat("-" + c.toLowerCase()), "")
    .slice(1)
    .replace(/(\(|\)|,)/g, "")
  console.log(`Submitting question: ${questionNumber}. ${questionName}`)

  await page.goto(`https://leetcode.com/problems/${dashQuestionName}`, {
    waitUntil: "domcontentloaded",
  })
  console.log(`Going to: https://leetcode.com/problems/${dashQuestionName}`)

  await page.waitForTimeout(1000)
  await page.waitForSelector(".ant-select-selection")
  await page.$eval(".ant-select-selection", (langDiv) => langDiv.click())
  await page.waitForSelector("li[data-cy='lang-select-JavaScript']")
  await page.$eval("li[data-cy='lang-select-JavaScript']", (li) => li.click())
  const fileContent = fs.readFileSync(`./questions/q${questionNumber}.js`, {
    encoding: "utf8",
    flag: "r",
  })
  var functionName = await page.evaluate(() => {
    // document.querySelector("li[data-cy='lang-select-JavaScript']").click()
    var RE = /(?!([0-9]\n))(.*)/g
    return document
      .querySelector("div.CodeMirror-code")
      .innerText.match(RE)
      .filter((c) => c.length !== 0)
      .join("\n")
      .replace(/function\(/, "function({")
      .replace(/\) \{/, "}) {")
      .match(/(?<=var ).*(?= \=)/g)
  })

  const solution = fileContent
    .substring(
      fileContent.indexOf(`var ${functionName}`),
      fileContent.indexOf("export")
    )
    .replace("function ({", "function(")
    .replace("}) {", ") {")

  await page.evaluate((solution) => {
    //FIXME
    document.querySelector("div.CodeMirror-code").innerText = solution
  }, solution)

  await page.waitForTimeout(1000)

  await page.waitForSelector("button[data-cy=submit-code-btn]")
  await page.$eval("button[data-cy=submit-code-btn]", (submitBtn) =>
    submitBtn.click()
  )

  await page.waitForTimeout(3000)

  const result = await page.evaluate(() => {
    return document.querySelector("div[class^=result-container]").innerText
  })
  console.log(result)

  await page.screenshot({ path: `screenshots/test.jpeg` })
  await browser.close()

  return
})()
