/* Editorial/source metadata for the 32 existing Study lessons.
   Only the first eight entries contain a displayed direct Augustine quotation;
   the remaining lesson lines are intentionally labelled as editorial wording. */
(function (global) {
  "use strict";
  const refs = [
    ["St. Augustine, The City of God, XI.29", "https://www.newadvent.org/fathers/120111.htm", "New Advent · English translation", "direct"],
    ["St. Augustine, On Nature and Grace, ch. 3", "https://www.newadvent.org/fathers/1503.htm", "New Advent · English translation", "direct"],
    ["St. Augustine, Sermon 72A, §7", "https://www.vatican.va/spirit/documents/spirit_20001208_agostino_en.html", "Vatican.va · English rendering", "direct"],
    ["St. Augustine, Confessions, I.1", "https://www.newadvent.org/fathers/110101.htm", "New Advent · English translation", "direct"],
    ["St. Augustine, The City of God, XIV.28", "https://www.newadvent.org/fathers/120114.htm", "New Advent · English translation", "direct"],
    ["St. Augustine, Confessions, X.29.40", "https://www.newadvent.org/fathers/110110.htm", "New Advent · English translation", "direct"],
    ["St. Augustine, On the Trinity, VIII.14", "https://www.newadvent.org/fathers/130108.htm", "New Advent · English translation", "direct"],
    ["St. Augustine, Confessions, XI.14.17", "https://www.newadvent.org/fathers/110111.htm", "New Advent · English translation", "direct"],
    ["St. Augustine, Letter 130, to Proba", "https://www.newadvent.org/fathers/1102130.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, On the Profit of Believing", "https://www.newadvent.org/fathers/1306.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, Sermon 272", "https://earlychurchtexts.com/public/augustine_sermon_272_eucharist.htm", "Early Church Texts · English rendering", "editorial"],
    ["St. Augustine, On the Sermon on the Mount, I", "https://www.newadvent.org/fathers/16011.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, Exposition on Psalm 124", "https://www.newadvent.org/fathers/1801124.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, The City of God, Book I", "https://www.newadvent.org/fathers/120101.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, Handbook on Faith, Hope and Love", "https://www.newadvent.org/fathers/1302.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, The City of God, Book XIX", "https://www.newadvent.org/fathers/120119.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, On Baptism, Against the Donatists, Book I", "https://www.newadvent.org/fathers/14081.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, On the Trinity, Book XV", "https://www.newadvent.org/fathers/130115.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, On the Trinity, Book IX", "https://www.newadvent.org/fathers/130109.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, The City of God, Book XI", "https://www.newadvent.org/fathers/120111.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, Confessions, Book X", "https://www.newadvent.org/fathers/110110.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, The City of God, Book I", "https://www.newadvent.org/fathers/120101.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, On Christian Doctrine, Book I", "https://www.newadvent.org/fathers/12021.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, Confessions, Book X", "https://www.newadvent.org/fathers/110110.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, On the Trinity, Book IV", "https://www.newadvent.org/fathers/130104.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, Confessions, Book IV", "https://www.newadvent.org/fathers/110104.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, Confessions, Book IX", "https://www.newadvent.org/fathers/110109.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, Confessions, Book I", "https://www.newadvent.org/fathers/110101.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, On the Sermon on the Mount, Book I", "https://www.newadvent.org/fathers/16011.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, On Christian Doctrine, Book II", "https://www.newadvent.org/fathers/12022.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, On Christian Doctrine, Book I", "https://www.newadvent.org/fathers/12021.htm", "New Advent · English translation", "editorial"],
    ["St. Augustine, Confessions, Book I", "https://www.newadvent.org/fathers/110101.htm", "New Advent · English translation", "editorial"],
  ];
  const lessons = global.LESSON;
  if (!Array.isArray(lessons)) return;
  lessons.forEach((lesson, index) => {
    const [citation, url, sourceLabel, quoteKind] = refs[index] || [];
    if (!citation) return;
    lesson.quoteKind = quoteKind;
    lesson.sourceCitation = citation;
    lesson.sourceLabel = sourceLabel;
    lesson.primaryUrl = url;
    if (quoteKind === "direct") {
      lesson.primaryQuoteSource = citation;
      lesson.translation = sourceLabel;
    }
    if (index === 3) lesson.primaryQuote = "You have made us for Yourself, and our hearts are restless until they rest in You.";
  });
  global.SA_LESSON_SOURCES = refs.map(([citation, url, sourceLabel, quoteKind], index) => ({ index, citation, url, sourceLabel, quoteKind }));
})(window);
