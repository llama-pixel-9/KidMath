/**
 * Hint content — one entry per mode × subskill, in kid language.
 *
 *   title    the idea in three or four words
 *   idea     what the concept IS, two or three short sentences a child reads
 *   example  a fully worked example with different numbers from the live
 *            question: the problem, the steps, the answer
 *
 * `hintFor` (index.js) pairs an entry with steps built from the live
 * question's own numbers (steps.js). Keep every sentence short; a kid reads
 * this mid-question. Never mention the app or the answer widget.
 */

const ex = (problem, steps, answer) => ({ problem, steps, answer });

export const MODE_TITLES = {
  addition: "Adding",
  subtraction: "Subtracting",
  multiplication: "Multiplying",
  division: "Dividing",
  comparing: "Comparing numbers",
  counting: "Counting",
  skipCounting: "Skip counting",
  placeValue: "Place value",
  fractions: "Fractions",
  decimals: "Decimals",
  numberBonds: "Number bonds",
  barModels: "Bar models",
  placeValueDiscs: "Place value discs",
  factorsMultiples: "Factors and multiples",
  areaPerimeter: "Area and perimeter",
  money: "Money",
  patterns: "Patterns",
  measurement: "Measuring",
  time: "Time",
  dataGraphs: "Graphs",
  angles: "Angles",
  linesShapes: "Lines and shapes",
  fractionOps: "Fraction operations",
  decimalOps: "Decimal operations",
  volumeCoordinates: "Volume and coordinates",
};

export const CONCEPTS = {
  addition: {
    makeTen: {
      title: "Make a ten first",
      idea: "Ten is a friendly number. Break one addend so the other becomes 10, then add what is left. 10 plus something is easy to see.",
      example: ex("8 + 5", ["8 needs 2 more to make 10.", "Take 2 from the 5. That leaves 3.", "10 + 3 = 13."], "13"),
    },
    composeDecompose: {
      title: "Put the parts together",
      idea: "Adding means joining two parts into one whole. You can count all of them, or start at the bigger number and count on the smaller one.",
      example: ex("6 + 3", ["Start at the bigger number, 6.", "Count on 3 more: 7, 8, 9.", "The whole is 9."], "9"),
    },
    unknownAddend: {
      title: "Find the missing part",
      idea: "You know the total and one part. Start at the part you know and count up until you reach the total. How many hops you took is the missing part.",
      example: ex("7 + ? = 12", ["Start at 7.", "Count up to 12: 8, 9, 10, 11, 12. That is 5 hops.", "So the missing part is 5, because 7 + 5 = 12."], "5"),
    },
  },
  subtraction: {
    differenceAsDistance: {
      title: "How far apart?",
      idea: "Subtracting can mean finding the distance between two numbers. Start at the smaller number and count up to the bigger one. The hops are the difference.",
      example: ex("12 − 9", ["Start at 9, the smaller number.", "Count up to 12: 10, 11, 12. That is 3 hops.", "So 12 − 9 = 3."], "3"),
    },
    decomposeToSubtract: {
      title: "Break it to get to ten",
      idea: "Break the number you are taking away into two easier pieces. First subtract down to 10, then subtract the rest.",
      example: ex("15 − 7", ["15 − 5 gets you to 10.", "You still need to take away 2 more (because 5 + 2 = 7).", "10 − 2 = 8."], "8"),
    },
    unknownSubtrahend: {
      title: "How many were taken?",
      idea: "You know how many you started with and how many are left. The amount taken away is the gap between them. Count up from what is left to the start.",
      example: ex("10 − ? = 4", ["Start at 4, what is left.", "Count up to 10: 5, 6, 7, 8, 9, 10. That is 6 hops.", "So 6 were taken away, because 10 − 6 = 4."], "6"),
    },
  },
  multiplication: {
    equalGroups: {
      title: "Groups of the same size",
      idea: "Multiplying counts equal groups fast. 4 × 3 means 4 groups with 3 in each. You can skip count by the group size, once for each group.",
      example: ex("4 × 3", ["4 groups, 3 in each.", "Skip count by 3, four times: 3, 6, 9, 12.", "So 4 × 3 = 12."], "12"),
    },
    arrayReasoning: {
      title: "Rows and columns",
      idea: "An array is dots in neat rows. Rows × dots-in-each-row tells you the total. Turn it sideways and the answer is the same.",
      example: ex("3 rows of 5", ["Draw 3 rows with 5 dots in each.", "Count by 5s down the rows: 5, 10, 15.", "3 × 5 = 15."], "15"),
    },
    factFluency: {
      title: "Use a fact you know",
      idea: "Hard facts hide next to easy ones. If you know 5 × 6, then 6 × 6 is just one more group of 6. Doubles and tens are good anchors.",
      example: ex("7 × 6", ["Start from an easy one: 5 × 6 = 30.", "You need 2 more groups of 6, which is 12.", "30 + 12 = 42."], "42"),
    },
  },
  division: {
    partitioning: {
      title: "Share it out equally",
      idea: "Dividing shares a total into equal groups. Deal one at a time into each group until they are all gone, then count what each group got.",
      example: ex("12 ÷ 3", ["Make 3 groups.", "Deal out the 12 one by one: each group gets 4.", "12 ÷ 3 = 4."], "4"),
    },
    inverseFact: {
      title: "Think multiplication",
      idea: "Division is multiplication backwards. 20 ÷ 4 asks: 4 times what makes 20? Use the times fact you already know.",
      example: ex("20 ÷ 4", ["Ask: 4 × ? = 20.", "4 × 5 = 20.", "So 20 ÷ 4 = 5."], "5"),
    },
    unknownQuotient: {
      title: "How many groups?",
      idea: "Sometimes you know the group size and want the number of groups. Skip count by the group size until you hit the total. Count the hops.",
      example: ex("18 ÷ 6", ["Skip count by 6 until you reach 18: 6, 12, 18.", "That took 3 hops.", "So 18 ÷ 6 = 3."], "3"),
    },
    remainders: {
      title: "What is left over",
      idea: "Sometimes sharing does not come out even. Share as much as you can equally. Whatever is left is the remainder.",
      example: ex("14 ÷ 4", ["4 × 3 = 12 fits inside 14.", "14 − 12 = 2 left over.", "14 ÷ 4 = 3 remainder 2."], "3 R 2"),
    },
  },
  comparing: {
    symbolSelection: {
      title: "The hungry mouth",
      idea: "The open side of < and > points to the bigger number, like a mouth eating the bigger snack. Compare the biggest place first.",
      example: ex("47 ? 52", ["Look at the tens: 4 tens and 5 tens.", "5 tens is more, so 52 is bigger.", "The mouth opens toward 52: 47 < 52."], "<"),
    },
    benchmarkCompare: {
      title: "Use a landmark number",
      idea: "Landmarks like 10, 50, and 100 help you judge size. Ask which landmark each number is close to, then compare.",
      example: ex("Is 38 closer to 30 or 40?", ["38 to 40 is 2 hops.", "38 to 30 is 8 hops.", "2 is fewer, so 38 is closer to 40."], "40"),
    },
    distanceCompare: {
      title: "Which is farther?",
      idea: "To compare gaps, find each distance by counting up, then compare the two distances.",
      example: ex("Which is farther from 20: 14 or 25?", ["20 − 14 = 6 away.", "25 − 20 = 5 away.", "6 is more, so 14 is farther."], "14"),
    },
  },
  counting: {
    subitizing: {
      title: "See it without counting",
      idea: "Small groups can be known at a glance, like dots on a die. Look for little clumps of 2, 3, or 5 and add the clumps.",
      example: ex("●●● ●●", ["See a group of 3 and a group of 2.", "3 and 2 more is 5."], "5"),
    },
    countOn: {
      title: "Count on from a number",
      idea: "You do not have to start at 1. Say the number you have, then keep counting forward. Counting back works the same way in reverse.",
      example: ex("Fill the blank: 27, 28, ___, 30", ["Say 28, then the next number.", "28, 29, 30.", "The blank is 29."], "29"),
    },
    cardinality: {
      title: "The last number is how many",
      idea: "When you count a group, the last number you say tells how many are in it. Touch each one once so nothing is skipped or counted twice.",
      example: ex("How many? 🐢🐢🐢🐢🐢🐢", ["Touch and count: 1, 2, 3, 4, 5, 6.", "The last number was 6, so there are 6."], "6"),
    },
  },
  skipCounting: {
    patternRule: {
      title: "Find the jump size",
      idea: "In skip counting, every jump is the same size. Subtract two neighbors to find the jump, then keep jumping.",
      example: ex("5, 10, 15, ?", ["10 − 5 = 5, so the jump is 5.", "15 + 5 = 20."], "20"),
    },
    stepInference: {
      title: "What is the step?",
      idea: "If a middle number is missing, the step is still the same. Look at any two numbers next to each other to find it, then fill the gap.",
      example: ex("4, ?, 12, 16", ["16 − 12 = 4, so the step is 4.", "4 + 4 = 8. Check: 8 + 4 = 12."], "8"),
    },
    groupsToProduct: {
      title: "Count groups in jumps",
      idea: "Groups of the same size can be counted in jumps. Say the group size once for each group and stop on the last group.",
      example: ex("4 bikes, 2 wheels each", ["Jump by 2, four times: 2, 4, 6, 8.", "8 wheels in all."], "8"),
    },
  },
  placeValue: {
    tensOnes: {
      title: "Tens and ones",
      idea: "Two-digit numbers are made of tens and ones. 34 is 3 tens and 4 ones. The place a digit sits in tells its value.",
      example: ex("What number is 5 tens and 2 ones?", ["5 tens is 50.", "2 ones is 2.", "50 + 2 = 52."], "52"),
    },
    expandedForm: {
      title: "Stretch the number out",
      idea: "Expanded form writes each digit as its value: 346 = 300 + 40 + 6. Put the parts back together to get the number.",
      example: ex("200 + 70 + 3", ["2 hundreds, 7 tens, 3 ones.", "Write the digits in place: 2, 7, 3.", "273."], "273"),
    },
    regroupingSense: {
      title: "Trade ten for one",
      idea: "Ten ones make one ten. Ten tens make one hundred. You can trade in either direction without changing the number.",
      example: ex("How many tens are in 130?", ["100 is 10 tens.", "30 is 3 more tens.", "10 + 3 = 13 tens."], "13"),
    },
    rounding: {
      title: "Round to the nearest",
      idea: "Rounding picks the closest friendly number. Look at the digit to the right of the place you are rounding to: 5 or more rounds up, less than 5 rounds down.",
      example: ex("Round 67 to the nearest ten", ["67 sits between 60 and 70.", "The ones digit is 7, which is 5 or more.", "Round up to 70."], "70"),
    },
  },
  fractions: {
    partWhole: {
      title: "Parts of a whole",
      idea: "A fraction names equal parts. The bottom number says how many equal parts make the whole. The top number says how many you have.",
      example: ex("A pizza is cut into 8 equal slices. You eat 3.", ["8 equal parts, so the bottom is 8.", "You have 3, so the top is 3.", "You ate 3/8."], "3/8"),
    },
    fractionAsNumber: {
      title: "Fractions live on the number line",
      idea: "A fraction is a number between whole numbers. Cut the space from 0 to 1 into equal parts and count hops from 0.",
      example: ex("Where is 3/4 on a number line?", ["Cut 0 to 1 into 4 equal parts.", "Hop 3 parts from 0.", "That spot is 3/4, just before 1."], "3 hops of 1/4"),
    },
    equivalence: {
      title: "Same amount, different name",
      idea: "Equivalent fractions cover the same space with different-sized pieces. Multiply or divide top and bottom by the same number and the value stays the same.",
      example: ex("Is 2/4 equal to 1/2?", ["Divide top and bottom of 2/4 by 2.", "2 ÷ 2 = 1, 4 ÷ 2 = 2.", "2/4 = 1/2. Yes."], "Yes"),
    },
    compareFractions: {
      title: "Which fraction is bigger?",
      idea: "Same bottom: the bigger top wins. Same top: the smaller bottom wins, because bigger pieces. Or compare each fraction to 1/2.",
      example: ex("Compare 3/8 and 5/8", ["Same bottom, so the pieces are the same size.", "5 pieces is more than 3 pieces.", "3/8 < 5/8."], "5/8 is bigger"),
    },
    addLikeDenominators: {
      title: "Add pieces of the same size",
      idea: "When the bottoms match, the pieces are the same size. Add the tops and keep the bottom the same.",
      example: ex("2/6 + 3/6", ["Bottoms match, so keep 6.", "Add the tops: 2 + 3 = 5.", "2/6 + 3/6 = 5/6."], "5/6"),
    },
    fractionOfSet: {
      title: "A fraction of a group",
      idea: "To find a fraction of a group, split the group into equal parts (the bottom number), then take that many parts (the top number).",
      example: ex("1/3 of 12 apples", ["Split 12 into 3 equal groups: 4 in each.", "Take 1 group.", "1/3 of 12 is 4."], "4"),
    },
  },
  decimals: {
    tenthsHundredths: {
      title: "Tenths and hundredths",
      idea: "The first place after the decimal point is tenths, the second is hundredths. 0.7 is seven tenths. 0.07 is seven hundredths, which is much smaller.",
      example: ex("Write four tenths as a decimal", ["Tenths go right after the point.", "0.4."], "0.4"),
    },
    compareDecimals: {
      title: "Compare place by place",
      idea: "Line up the decimal points. Compare the whole numbers first, then tenths, then hundredths. Adding a zero on the end does not change the value.",
      example: ex("Which is bigger, 0.5 or 0.45?", ["Write 0.5 as 0.50.", "Compare tenths: 5 and 4. 5 is more.", "0.5 is bigger."], "0.5"),
    },
    fractionToDecimal: {
      title: "Fractions to decimals",
      idea: "Tenths and hundredths have decimal names. 3/10 is 0.3. 25/100 is 0.25. If the bottom is 10 or 100, just read the top into those places.",
      example: ex("Write 7/10 as a decimal", ["The bottom is 10, so it is tenths.", "7 tenths is 0.7."], "0.7"),
    },
    decimalAsNumber: {
      title: "Decimals on the number line",
      idea: "Decimals sit between whole numbers. 2.5 is halfway between 2 and 3. Cut the gap into ten tenths to place any decimal.",
      example: ex("Is 1.8 closer to 1 or 2?", ["1.8 is 8 tenths past 1.", "It is only 2 tenths from 2.", "Closer to 2."], "2"),
    },
  },
  numberBonds: {
    partWhole: {
      title: "Two parts make a whole",
      idea: "A number bond shows a whole and its parts. Part + part = whole. If you know the whole and one part, the other part is what is missing.",
      example: ex("Whole 9, part 4, part ?", ["4 + ? = 9.", "Count up from 4 to 9: 5 hops.", "The other part is 5."], "5"),
    },
    missingPart: {
      title: "Find the missing part",
      idea: "Cover the missing part. Start at the part you know and count up to the whole. The hops are the missing part.",
      example: ex("? + 6 = 10", ["Start at 6.", "Count up to 10: 7, 8, 9, 10. That is 4.", "The missing part is 4."], "4"),
    },
    decompose: {
      title: "Break a number apart",
      idea: "Every number can be split into parts in many ways. 7 is 1 and 6, or 2 and 5, or 3 and 4. Check a split by adding the parts back up.",
      example: ex("Can 8 split into 3 and 5?", ["Add the parts: 3 + 5 = 8.", "Yes, 8 is 3 and 5."], "Yes"),
    },
  },
  barModels: {
    partWhole: {
      title: "Draw the bar",
      idea: "A bar model is a picture of the problem. One long bar is the whole. Cut it into the parts. Whatever piece is missing is what you find.",
      example: ex("Mia has 8 stickers and 5 more. How many?", ["Draw a bar with a piece for 8 and a piece for 5.", "The whole bar is both together: 8 + 5.", "13 stickers."], "13"),
    },
    comparison: {
      title: "Two bars, side by side",
      idea: "Draw one bar for each amount, lined up on the left. The extra bit sticking out is the difference. Longer bar = more.",
      example: ex("Sam has 12, Ana has 4 fewer. How many does Ana have?", ["Draw Sam's bar for 12.", "Ana's bar is shorter by 4.", "12 − 4 = 8."], "8"),
    },
    multiplicative: {
      title: "Times as many",
      idea: "'3 times as many' means 3 equal bars next to 1 bar. Find one unit first, then count the units you need.",
      example: ex("A rope is 3 times as long as a 4 m stick. How long?", ["One unit is 4 m.", "3 units: 4 + 4 + 4.", "12 m."], "12"),
    },
    fractionBar: {
      title: "Fractions in a bar",
      idea: "Split the bar into equal boxes for the bottom number. Each box is one unit. Find what one box is worth, then take the number of boxes you need.",
      example: ex("2/5 of 20", ["Split the bar into 5 boxes: 20 ÷ 5 = 4 in each.", "Take 2 boxes: 4 + 4.", "8."], "8"),
    },
  },
  placeValueDiscs: {
    readNumber: {
      title: "Read the discs",
      idea: "Each disc says its value: 1, 10, or 100. Count each kind, then add the values together.",
      example: ex("2 hundreds, 3 tens, 4 ones", ["200 + 30 + 4.", "234."], "234"),
    },
    tradeRegroup: {
      title: "Ten of these is one of those",
      idea: "Ten ones discs can be traded for one tens disc. Ten tens for one hundreds. Trading does not change the number, only how it looks.",
      example: ex("You have 13 ones discs. Trade.", ["10 ones become 1 ten.", "3 ones stay.", "1 ten and 3 ones is 13."], "1 ten 3 ones"),
    },
    discOperations: {
      title: "Add or take away discs",
      idea: "Adding a disc adds its value. Taking one away subtracts its value. Keep the other discs the same.",
      example: ex("34 on the mat. Add one tens disc.", ["Tens go up by 1: 3 tens becomes 4 tens.", "Ones stay 4.", "44."], "44"),
    },
  },
  factorsMultiples: {
    factorCount: {
      title: "Factors divide evenly",
      idea: "A factor of a number divides it with nothing left over. Test small numbers in order and note which ones work.",
      example: ex("Is 4 a factor of 18?", ["18 ÷ 4 = 4 with 2 left over.", "There is a remainder, so no."], "No"),
    },
    nthMultiple: {
      title: "Multiples are skip counts",
      idea: "Multiples of a number are its skip counts: 6, 12, 18, 24. The 4th multiple is 4 times the number.",
      example: ex("What is the 5th multiple of 7?", ["5 × 7.", "35."], "35"),
    },
    factorPairs: {
      title: "Pairs that multiply to it",
      idea: "A factor pair is two numbers that multiply to make the target. Start with 1 × the number and work up. Stop when the pairs start repeating.",
      example: ex("Factor pairs of 12", ["1 × 12, 2 × 6, 3 × 4.", "4 × 3 repeats, so stop.", "Three pairs."], "1×12, 2×6, 3×4"),
    },
    primesAndCommon: {
      title: "Prime or composite?",
      idea: "A prime has exactly two factors: 1 and itself. A composite has more. 2 is the only even prime.",
      example: ex("Is 9 prime?", ["9 = 3 × 3, so 3 is a factor.", "It has more than two factors.", "Composite."], "composite"),
    },
  },
  areaPerimeter: {
    area: {
      title: "Area covers the inside",
      idea: "Area is how many unit squares fit inside. For a rectangle, multiply the length by the width.",
      example: ex("A 4 by 6 rectangle", ["Length × width: 4 × 6.", "24 square units."], "24"),
    },
    perimeter: {
      title: "Perimeter goes around",
      idea: "Perimeter is the walk all the way around the edge. Add every side. A rectangle has two lengths and two widths.",
      example: ex("A 3 by 5 rectangle", ["Sides: 3 + 5 + 3 + 5.", "16 units around."], "16"),
    },
    compositeFigures: {
      title: "Cut it into rectangles",
      idea: "An L-shape is just rectangles stuck together. Cut it into rectangles, find each area, and add.",
      example: ex("An L made of a 2×3 and a 4×1", ["2 × 3 = 6.", "4 × 1 = 4.", "6 + 4 = 10 square units."], "10"),
    },
    measureReasoning: {
      title: "Same area, different shape",
      idea: "Different rectangles can have the same area, and same-area shapes can have different perimeters. Check with the formulas, not by looks.",
      example: ex("Do 2×6 and 3×4 have the same area?", ["2 × 6 = 12.", "3 × 4 = 12.", "Yes, both cover 12."], "Yes"),
    },
  },
  money: {
    countCoins: {
      title: "Count coins by value",
      idea: "Start with the biggest coins. Count quarters by 25, dimes by 10, nickels by 5, pennies by 1. Keep a running total.",
      example: ex("2 dimes and 3 pennies", ["Dimes: 10, 20.", "Pennies: 21, 22, 23.", "23 cents."], "23¢"),
    },
    makeChange: {
      title: "Count up to make change",
      idea: "Change is the gap between the price and what you paid. Count up from the price to the money given.",
      example: ex("Price 65¢, paid 100¢", ["65 up to 70 is 5.", "70 up to 100 is 30.", "5 + 30 = 35¢ change."], "35¢"),
    },
    coinEquivalence: {
      title: "Different coins, same value",
      idea: "Coins can trade for each other. 5 pennies = 1 nickel. 2 nickels = 1 dime. 10 dimes = 1 dollar. Compare by total cents, not by how many coins.",
      example: ex("Which is worth more: 3 nickels or 1 dime?", ["3 nickels: 5, 10, 15 cents.", "1 dime: 10 cents.", "3 nickels."], "3 nickels"),
    },
    moneyReasoning: {
      title: "Think in cents",
      idea: "Turn everything into cents first. Then adding, comparing, and sharing money works just like whole numbers.",
      example: ex("3 dimes ? 2 dimes and 6 pennies", ["3 dimes = 30¢.", "2 dimes and 6 pennies = 26¢.", "30 > 26."], ">"),
    },
  },
  patterns: {
    repeatingPattern: {
      title: "Find the repeat",
      idea: "A repeating pattern has a chunk that plays over and over. Find the chunk, then keep repeating it to see what comes next.",
      example: ex("🔴🔵🔵🔴🔵🔵🔴 ?", ["The chunk is red, blue, blue.", "After red comes blue.", "🔵"], "🔵"),
    },
    arithmeticNext: {
      title: "Add the same each time",
      idea: "If a pattern grows by the same amount every step, find that amount and add it again.",
      example: ex("4, 7, 10, 13, ?", ["7 − 4 = 3, the step is +3.", "13 + 3 = 16."], "16"),
    },
    geometricNext: {
      title: "Multiply the same each time",
      idea: "Some patterns multiply. Divide one number by the one before it to find the multiplier, then multiply again.",
      example: ex("2, 6, 18, ?", ["6 ÷ 2 = 3, so the rule is ×3.", "18 × 3 = 54."], "54"),
    },
    missingTerm: {
      title: "Fill the gap",
      idea: "Use the numbers on both sides of the gap to find the rule, then apply it from the number before the gap.",
      example: ex("10, ?, 20, 25", ["25 − 20 = 5, the step is 5.", "10 + 5 = 15. Check: 15 + 5 = 20."], "15"),
    },
    patternRule: {
      title: "Say the rule",
      idea: "The rule tells how to get from one number to the next. Write it as words like 'add 4' or 'double'. Test it on every pair.",
      example: ex("Start at 5, add 6 each time. What is the 4th number?", ["5, 11, 17, 23.", "The 4th is 23."], "23"),
    },
  },
  measurement: {
    lengthConvert: {
      title: "Bigger unit, smaller number",
      idea: "1 m = 100 cm. 1 km = 1000 m. 1 ft = 12 in. Going to a smaller unit, multiply. Going to a bigger unit, divide.",
      example: ex("3 m in cm", ["1 m = 100 cm.", "3 × 100 = 300 cm."], "300 cm"),
    },
    massVolumeConvert: {
      title: "Grams, kilograms, liters",
      idea: "1 kg = 1000 g. 1 L = 1000 mL. Multiply by 1000 to go smaller, divide by 1000 to go bigger.",
      example: ex("2 L in mL", ["1 L = 1000 mL.", "2 × 1000 = 2000 mL."], "2000 mL"),
    },
    benchmarkEstimate: {
      title: "Use something you know",
      idea: "Compare to a thing you know the size of. A door is about 2 m. A paperclip is about 1 g. A big bottle is about 1 L.",
      example: ex("About how tall is a door?", ["A door is a bit taller than a grown-up.", "About 2 m."], "2 m"),
    },
    compareOrder: {
      title: "Same units before comparing",
      idea: "You can only compare measurements in the same unit. Convert first, then compare the numbers.",
      example: ex("Which is longer: 150 cm or 2 m?", ["2 m = 200 cm.", "200 > 150.", "2 m is longer."], "2 m"),
    },
    multiStepMeasure: {
      title: "One step at a time",
      idea: "Break the problem into parts. Find each amount, then add, subtract, or compare them.",
      example: ex("5 ribbons of 8 cm or 2 ribbons of 9 cm?", ["5 × 8 = 40 cm.", "2 × 9 = 18 cm.", "40 cm is more."], "5 ribbons of 8 cm"),
    },
  },
  time: {
    readClock: {
      title: "Short hand, long hand",
      idea: "The short hand points to the hour. The long hand counts minutes: each number is 5 minutes. Read the hour first, then the minutes.",
      example: ex("Short hand between 3 and 4, long hand on 6", ["Hour: past 3, so 3.", "Minutes: 6 × 5 = 30.", "3:30."], "3:30"),
    },
    elapsedTime: {
      title: "Hop along the clock",
      idea: "To find an end time, hop forward in easy chunks: first to the next hour, then whole hours, then leftover minutes.",
      example: ex("Starts 8:35, lasts 80 minutes", ["8:35 + 25 min = 9:00. That used 25.", "80 − 25 = 55 min left.", "9:00 + 55 = 9:55."], "9:55"),
    },
    timeConcepts: {
      title: "Words for times",
      idea: "'Half past' is :30. 'Quarter past' is :15. 'Quarter to' is :45 of the hour before. 'o'clock' is :00.",
      example: ex("Quarter to seven", ["Quarter to means 15 minutes before 7:00.", "6:45."], "6:45"),
    },
    calendar: {
      title: "Days, weeks, months",
      idea: "7 days make a week. 12 months make a year. To move forward on a calendar, count days in rows of 7.",
      example: ex("Today is Tuesday. What day is it in 9 days?", ["7 days later is Tuesday again.", "2 more days: Wednesday, Thursday.", "Thursday."], "Thursday"),
    },
  },
  dataGraphs: {
    readBar: {
      title: "Read the bar's height",
      idea: "Find the bar you need. Follow its top straight across to the number on the side. That number is the count.",
      example: ex("How many Bikes?", ["Find the Bikes bar.", "Its top lines up with 6.", "6 bikes."], "6"),
    },
    compareBars: {
      title: "Compare two bars",
      idea: "Read both bars, then subtract to find how many more, or just see which is taller for which is more.",
      example: ex("How many more Cats than Dogs?", ["Cats bar: 8. Dogs bar: 5.", "8 − 5 = 3.", "3 more cats."], "3"),
    },
    pictograph: {
      title: "Each picture counts for more",
      idea: "Check the key first. If one picture means 2, count the pictures and multiply by 2. Half a picture is half the key.",
      example: ex("Key: ⭐ = 2. Row shows ⭐⭐⭐", ["3 pictures.", "3 × 2 = 6."], "6"),
    },
    dataAnalysis: {
      title: "Use the whole graph",
      idea: "Some questions need more than one bar. Read every bar you need, write the numbers down, then add or compare.",
      example: ex("How many chose Cars or Bikes altogether?", ["Cars: 20. Bikes: 13.", "20 + 13 = 33."], "33"),
    },
  },
  angles: {
    measureAngle: {
      title: "How wide is the turn?",
      idea: "An angle measures how much one line turns from another. A right angle is 90°. A straight line is 180°. A full turn is 360°.",
      example: ex("Half of a right angle", ["A right angle is 90°.", "90 ÷ 2 = 45°."], "45°"),
    },
    angleSum: {
      title: "Angles that add up",
      idea: "Angles that make a straight line add to 180°. Angles around a point add to 360°. Angles inside a triangle add to 180°.",
      example: ex("Two angles make a straight line. One is 110°.", ["Straight line = 180°.", "180 − 110 = 70°."], "70°"),
    },
    classifyAngle: {
      title: "Acute, right, obtuse",
      idea: "Compare to a square corner. Smaller than a square corner is acute. Exactly a square corner is right. Wider is obtuse. A straight line is 180°.",
      example: ex("A 120° angle", ["120 is more than 90.", "Less than 180.", "Obtuse."], "obtuse"),
    },
    missingAngle: {
      title: "Find the missing angle",
      idea: "If you know what the angles must add to, subtract the ones you know. What is left is the missing angle.",
      example: ex("A triangle has angles 60° and 70°.", ["Triangle angles add to 180°.", "60 + 70 = 130.", "180 − 130 = 50°."], "50°"),
    },
  },
  linesShapes: {
    shapeSides: {
      title: "Count sides and corners",
      idea: "Trace the shape with your finger. Every straight edge is a side. Every point where two sides meet is a vertex, or corner.",
      example: ex("A pentagon", ["Trace around: 5 straight edges.", "5 corners too.", "5 sides, 5 vertices."], "5"),
    },
    symmetryLines: {
      title: "Fold it in half",
      idea: "A line of symmetry is a fold where both halves match exactly. Try folding top to bottom, side to side, and corner to corner.",
      example: ex("How many lines of symmetry does a square have?", ["Top-to-bottom, side-to-side: 2.", "Both diagonals: 2 more.", "4 lines."], "4"),
    },
    shapeProperties: {
      title: "What makes the shape",
      idea: "Shapes are named by their properties: number of sides, equal sides, right angles, parallel sides. Check each property one at a time.",
      example: ex("Which shape has 4 equal sides and 4 right angles?", ["4 right angles: rectangle or square.", "4 equal sides too.", "Square."], "square"),
    },
    shapeClassification: {
      title: "Sort by the rule",
      idea: "To sort shapes, pick the rule first, then test each shape against it. A shape can belong to more than one group.",
      example: ex("Which is NOT a quadrilateral?", ["Quadrilaterals have exactly 4 sides.", "A triangle has 3.", "The triangle."], "triangle"),
    },
    lineFigures: {
      title: "Parallel, perpendicular, intersecting",
      idea: "Parallel lines never meet, like train tracks. Perpendicular lines cross at a square corner. Intersecting lines cross anywhere.",
      example: ex("Lines that cross at a right angle", ["They cross, so they intersect.", "The corner is square.", "Perpendicular."], "perpendicular"),
    },
  },
  fractionOps: {
    addSubUnlike: {
      title: "Match the bottoms first",
      idea: "You can only add pieces of the same size. Rename the fractions with a common bottom, then add or subtract the tops.",
      example: ex("1/2 + 1/4", ["1/2 = 2/4.", "2/4 + 1/4 = 3/4."], "3/4"),
    },
    multiplyFractions: {
      title: "Multiply tops, multiply bottoms",
      idea: "To multiply fractions, multiply the tops together and the bottoms together. 'Of' means multiply: 1/2 of 3/4 is 1/2 × 3/4.",
      example: ex("2/3 × 3/5", ["Tops: 2 × 3 = 6.", "Bottoms: 3 × 5 = 15.", "6/15, which is 2/5."], "2/5"),
    },
    divideUnitFractions: {
      title: "How many pieces fit?",
      idea: "3 ÷ 1/4 asks how many quarters fit in 3. Each whole holds 4 quarters, so multiply: 3 × 4.",
      example: ex("2 ÷ 1/3", ["Each whole has 3 thirds.", "2 wholes have 2 × 3 = 6 thirds.", "6."], "6"),
    },
    fractionOfWhole: {
      title: "A fraction of a number",
      idea: "Divide by the bottom to find one part, then multiply by the top to take that many parts.",
      example: ex("3/4 of 12", ["12 ÷ 4 = 3, one part.", "3 parts: 3 × 3 = 9.", "9."], "9"),
    },
  },
  decimalOps: {
    addSubDecimals: {
      title: "Line up the points",
      idea: "Write the numbers with the decimal points stacked. Fill empty places with zeros. Then add or subtract like whole numbers and keep the point in line.",
      example: ex("1.7 − 0.2", ["Tenths: 7 − 2 = 5.", "Ones: 1 − 0 = 1.", "1.5."], "1.5"),
    },
    powersOfTen: {
      title: "Slide the point",
      idea: "Multiplying by 10 slides the decimal point one place right. Dividing by 10 slides it one place left. 100 slides two places, 1000 three.",
      example: ex("0.64 ÷ 100", ["Divide by 100: slide the point 2 places left.", "0.64 becomes 0.0064."], "0.0064"),
    },
    multiplyDivideDecimals: {
      title: "Ignore the point, then put it back",
      idea: "Multiply as if there were no decimal point. Then count the decimal places in the question and put that many back in the answer.",
      example: ex("0.3 × 4", ["3 × 4 = 12.", "One decimal place in 0.3, so one in the answer.", "1.2."], "1.2"),
    },
    thousandthsSense: {
      title: "Tenths, hundredths, thousandths",
      idea: "Each place to the right is ten times smaller. 6.2 is 6 and 2 tenths. The digit before the point is the whole number.",
      example: ex("Write 6 and 2 tenths", ["6 is the whole number.", "2 goes in the tenths place.", "6.2."], "6.2"),
    },
  },
  volumeCoordinates: {
    countUnitCubes: {
      title: "Count the cubes",
      idea: "Volume is how many unit cubes fill a box. Count one layer, then multiply by the number of layers.",
      example: ex("A box 3 cubes long, 2 wide, 2 tall", ["One layer: 3 × 2 = 6 cubes.", "2 layers: 6 × 2 = 12.", "12 cubes."], "12"),
    },
    volumeFormula: {
      title: "Length × width × height",
      idea: "For a box, multiply the three sides. The order does not matter, so multiply the easy pair first.",
      example: ex("5 by 3 by 3", ["3 × 3 = 9.", "9 × 5 = 45.", "45 cubic units."], "45"),
    },
    plotAndRead: {
      title: "Over, then up",
      idea: "A point is (x, y). Start at 0. Go right x steps, then up y steps. Right first, then up.",
      example: ex("Plot (3, 4)", ["Go right 3.", "Go up 4.", "Mark the point."], "(3, 4)"),
    },
    compositeAndDistance: {
      title: "Break it into boxes",
      idea: "Odd-shaped solids are boxes stuck together. Find each box's volume and add. On a grid, distance along a line is the difference of the coordinates.",
      example: ex("Two boxes: 2×2×3 and 1×2×3", ["2 × 2 × 3 = 12.", "1 × 2 × 3 = 6.", "12 + 6 = 18."], "18"),
    },
  },
};
