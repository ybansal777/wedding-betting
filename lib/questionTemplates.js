// Starter questions for the host console.
//
// The PRD calls this the single highest-leverage setup feature: a Host opening
// an empty question box at 11pm is the most likely moment for them to abandon
// setup. Odds are suggestions — deliberately lopsided in places, because a
// board where everything is +150 is boring to bet on.

export const TEMPLATE_CATEGORIES = [
  {
    name: "The ceremony",
    questions: [
      {
        prompt: "Who cries first?",
        options: [
          { label: "Partner A", odds: "+150" },
          { label: "Partner B", odds: "+150" },
          { label: "A parent beats them both", odds: "+250" },
          { label: "Nobody — stone cold", odds: "+600" },
        ],
      },
      {
        prompt: "Will the ceremony start on time?",
        options: [
          { label: "Within 5 minutes", odds: "+220" },
          { label: "5–20 minutes late", odds: "-150" },
          { label: "More than 20 minutes late", odds: "+300" },
        ],
      },
      {
        prompt: "Will anyone drop the rings?",
        options: [
          { label: "Yes", odds: "+450" },
          { label: "No", odds: "-600" },
        ],
      },
      {
        prompt: "How long are the vows, combined?",
        options: [
          { label: "Under 2 minutes", odds: "+200" },
          { label: "2–5 minutes", odds: "-140" },
          { label: "Over 5 minutes", odds: "+260" },
        ],
      },
    ],
  },
  {
    name: "Speeches",
    questions: [
      {
        prompt: "Who gives the longest speech?",
        options: [
          { label: "Best man", odds: "+120" },
          { label: "Maid of honour", odds: "+160" },
          { label: "Father of the bride", odds: "+200" },
          { label: "An uncle nobody scheduled", odds: "+700" },
        ],
      },
      {
        prompt: "Will the best man's speech run over 5 minutes?",
        options: [
          { label: "Yes", odds: "-180" },
          { label: "No", odds: "+140" },
        ],
      },
      {
        prompt: "How many speeches mention how they met?",
        options: [
          { label: "None", odds: "+500" },
          { label: "One or two", odds: "-120" },
          { label: "Three or more", odds: "+180" },
        ],
      },
      {
        prompt: "Will a speech include a slideshow or props?",
        options: [
          { label: "Yes", odds: "+160" },
          { label: "No", odds: "-200" },
        ],
      },
    ],
  },
  {
    name: "The party",
    questions: [
      {
        prompt: "What's the first song that fills the dance floor?",
        options: [
          { label: "Something from the 80s", odds: "+180" },
          { label: "A current chart hit", odds: "+150" },
          { label: "A wedding classic", odds: "+120" },
          { label: "Something regional everyone knows", odds: "+300" },
        ],
      },
      {
        prompt: "Who is the last guest on the dance floor?",
        options: [
          { label: "A groomsman", odds: "+200" },
          { label: "A bridesmaid", odds: "+180" },
          { label: "Someone's grandparent", odds: "+400" },
          { label: "The couple themselves", odds: "+250" },
        ],
      },
      {
        prompt: "Will there be a conga line?",
        options: [
          { label: "Yes", odds: "+130" },
          { label: "No", odds: "-170" },
        ],
      },
      {
        prompt: "Who catches the bouquet?",
        options: [
          { label: "Someone already engaged", odds: "+300" },
          { label: "A single friend", odds: "-140" },
          { label: "A child", odds: "+400" },
          { label: "It hits the floor", odds: "+500" },
        ],
      },
    ],
  },
  {
    name: "Guests behaving",
    questions: [
      {
        prompt: "Who arrives last?",
        options: [
          { label: "The usual suspect", odds: "-200" },
          { label: "A member of the wedding party", odds: "+250" },
          { label: "Someone travelling far", odds: "+180" },
        ],
      },
      {
        prompt: "How many guests wear white?",
        options: [
          { label: "Zero", odds: "+140" },
          { label: "Exactly one", odds: "+150" },
          { label: "Two or more", odds: "+220" },
        ],
      },
      {
        prompt: "Will anyone propose at this wedding?",
        options: [
          { label: "Yes", odds: "+800" },
          { label: "No", odds: "-1200" },
        ],
      },
      {
        prompt: "Who takes the most photos?",
        options: [
          { label: "A parent", odds: "+160" },
          { label: "The friend with the film camera", odds: "+200" },
          { label: "Someone in the wedding party", odds: "+180" },
        ],
      },
    ],
  },
  {
    name: "The couple",
    questions: [
      {
        prompt: "Who says 'I do' louder?",
        options: [
          { label: "Partner A", odds: "+100" },
          { label: "Partner B", odds: "+100" },
        ],
      },
      {
        prompt: "Who changes outfits first?",
        options: [
          { label: "Partner A", odds: "-130" },
          { label: "Partner B", odds: "+160" },
          { label: "Neither", odds: "+280" },
        ],
      },
      {
        prompt: "What time do the newlyweds leave?",
        options: [
          { label: "Before 11pm", odds: "+250" },
          { label: "11pm – 1am", odds: "-160" },
          { label: "They close the place down", odds: "+200" },
        ],
      },
      {
        prompt: "Where's the honeymoon?",
        options: [
          { label: "Somewhere with a beach", odds: "-150" },
          { label: "A city break", odds: "+220" },
          { label: "Somewhere cold", odds: "+450" },
          { label: "Delayed — they're staying home", odds: "+300" },
        ],
      },
    ],
  },
];

export const newOptionId = () =>
  globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);

/** Hydrate a template into the editor's draft shape (each option needs an id). */
export function templateToDraft(template) {
  return {
    prompt: template.prompt,
    options: template.options.map((o) => ({ ...o, id: newOptionId() })),
  };
}
