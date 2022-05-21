import fs from "fs"
import puppeteer from "puppeteer"
import { exec } from "child_process"

if (!fs.existsSync("./screenshots")) {
  fs.mkdirSync("./screenshots")
}

if (!fs.existsSync("./questions")) {
  fs.mkdirSync("./questions")
}

async function sh(cmd) {
  return new Promise(function (resolve, reject) {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

;(async () => {
  var questionNumber = process.argv.slice(2)
  try {
    if (questionNumber.length === 0) {
      throw "Please enter a question number"
    }
  } catch (e) {
    console.log(e)
    return
  }

  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto("https://leetcode.com/problemset/all/")

  await page.type("input[placeholder='Search questions']", questionNumber)

  await page.waitForTimeout(1200)

  var questionTitle = await page.evaluate(() => {
    return document.querySelectorAll('a[href^="/problems/"]')[3].innerText
  })

  var questionName = questionTitle.split(questionNumber + ". ")[1]
  var dashQuestionName = questionName
    .split(" ")
    .reduce((name, c) => name.concat("-" + c.toLowerCase()), "")
    .slice(1)
    .replace(/(\(|\)|,)/g, "")

  console.log(`Crawling question: ${questionNumber}. ${questionName}`)

  await page.goto(`https://leetcode.com/problems/${dashQuestionName}`, {
    waitUntil: "domcontentloaded",
  })

  console.log(`Going to: https://leetcode.com/problems/${dashQuestionName}`)

  await page.waitForTimeout(1000)

  var diffculty = await page.evaluate(() => {
    return document.querySelectorAll("div[diff]")[0].innerText
  })

  console.log(`Diffculty: ${diffculty}`)

  var description = await page.evaluate(() => {
    return document.querySelector("div[class*='question-content']").firstChild
      .innerText
  })

  await page.waitForSelector(".ant-select-selection")
  await page.$eval(".ant-select-selection", (langDiv) => langDiv.click())
  await page.waitForSelector("li[data-cy='lang-select-JavaScript']")
  await page.$eval("li[data-cy='lang-select-JavaScript']", (li) => li.click())

  var questionTestCases = await page.evaluate(() => {
    var RE = /(?<=<\/strong>)(.*?)(?=\n)/g
    return [
      [
        document.querySelectorAll("pre")[0].innerHTML.match(RE)[0],
        document
          .querySelectorAll("pre")[0]
          .innerHTML.split("Output:</strong>")[1]
          .split("<strong>")[0],
      ],
      [
        document.querySelectorAll("pre")[1].innerHTML.match(RE)[0],
        document
          .querySelectorAll("pre")[1]
          .innerHTML.split("Output:</strong>")[1]
          .split("<strong>")[0],
      ],
    ]
  })

  // await page.screenshot({ path: `screenshots/test.jpeg` })

  var questionTemplate = await page.evaluate(() => {
    // document.querySelector("li[data-cy='lang-select-JavaScript']").click()
    var RE = /(?!([0-9]\n))(.*)/g
    return document
      .querySelector("div.CodeMirror-code")
      .innerText.match(RE)
      .filter((c) => c.length !== 0)
      .join("\n")
      .replace(/function\(/, "function({")
      .replace(/\) \{/, "}) {")
  })

  var functionName = questionTemplate.match(/(?<=var ).*(?= \=)/g)

  await browser.close()

  console.log("Question Template:")
  console.log("\n")
  console.log(questionTemplate)
  console.log("\n")
  console.log("Test Case:")
  console.table([
    {
      Input: questionTestCases[0][0].trim(),
      Output: questionTestCases[0][1].replace("\n", "").trim(),
    },
    {
      Input: questionTestCases[1][0].trim(),
      Output: questionTestCases[1][1].replace("\n", "").trim(),
    },
  ])
  console.log("\n")

  var testCaseTemplates = []
  for (let i = 0; i < 2; i++) {
    testCaseTemplates.push(
      `test('test case ${i.toString()} ', () => { 
        expect(${functionName}({${questionTestCases[i][0].replace(
        /(=)/g,
        ":"
      )} })).toEqual(${questionTestCases[i][1]} ) 
      })\n`
    )
  }

  var comment = `/*\n\nQuestion: ${questionTitle}\n\nDiffculty: ${diffculty}\n\n${description} \n*/`
  var fileName = `questions/q${questionNumber}`

  var fileFullName = fs.existsSync(fileName + ".js")
    ? fileName + "-temp.js"
    : fileName + ".js"
  var testFileFullName = fileName + ".test.js"

  var fileMainContent = `${comment}\n\n${questionTemplate}\n\nexport {${functionName}}\n\n`

  var fileTestContent = `import {${functionName}} from "./${
    fileFullName.split("/")[1]
  }"\n\n${testCaseTemplates.join("\n")}`

  fs.writeFile(fileFullName, fileMainContent, (err) => {
    if (err) throw err
  })

  fs.writeFile(testFileFullName, fileTestContent, (err) => {
    if (err) throw err
  })

  var createFileMessage = fs.existsSync(fileName + ".js")
    ? `File of question ${questionNumber} existed. Create a temp file instead.`
    : `File of question ${questionNumber} is created successfully.\n`
  console.log(createFileMessage)

  await sh(`npx prettier --write ./${fileFullName}`)
  console.log(`Prettier: ${fileFullName}`)

  await sh(`npx prettier --write ./${testFileFullName}`)
  console.log(`Prettier: ${testFileFullName}`)

  console.log("Done.")
  return
})()
