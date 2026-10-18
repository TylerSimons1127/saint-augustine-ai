// Reviewed paraphrases, not generated quotations. A theological parallel must
// never be presented as evidence of a personal relationship.
const contexts = {
  scripture: { id: "doctrine-love", title: "On Christian Doctrine I.36.40",
    url: "https://www.newadvent.org/fathers/12021.htm",
    text: "Augustine argues that an understanding of Scripture which does not build up love of God and neighbor has missed its purpose. Apply this to the saint's specific work, service, or teaching; do not imply Augustine personally knew the saint." },
  conversion: { id: "confessions-conversion", title: "Confessions VIII.12.29",
    url: "https://www.newadvent.org/fathers/110108.htm",
    text: "Augustine describes his conversion in the garden, where reading Romans brought his struggle toward a decisive commitment to Christ. Relate grace and a concrete change of life to the supplied biography, without inventing matching episodes or quotations." },
  prayer: { id: "confessions-rest", title: "Confessions I.1.1",
    url: "https://www.newadvent.org/fathers/110101.htm",
    text: "At the opening of the Confessions, Augustine understands human longing as a movement toward rest in God. Explain how a specific practice or choice in the biography illuminates that longing, without claiming the saint read Augustine." },
  jerome: { id: "letter-166", title: "Augustine, Letter 166 to Jerome",
    url: "https://www.newadvent.org/fathers/1102166.htm",
    text: "In Letter 166, written in 415, Augustine asks Jerome about the origin of the soul, acknowledges his uncertainty, and expresses his longing to converse with him daily. Their surviving correspondence is a documented historical connection. This establishes correspondence, not an in-person meeting." },
};
function augustineContext(name, biography) {
  if (/\bjerome\b/i.test(name)) return contexts.jerome;
  if (/conversion|converted|baptis|baptiz/i.test(biography)) return contexts.conversion;
  if (/scripture|bible|gospel|evangelist|scholar|translation|teach|poor|charit|sick/i.test(biography)) return contexts.scripture;
  return contexts.prayer;
}
module.exports = { augustineContext };
