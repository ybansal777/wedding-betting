// Starter questions for the host console, keyed by event type.
//
// The PRD calls this the single highest-leverage setup feature: a Host opening
// an empty question box at 11pm is the most likely moment for them to abandon
// setup. Odds are suggestions — deliberately lopsided in places, because a
// board where everything is +150 is boring to bet on.
//
// Most questions are 'guess' (multiple choice, host-authored options). A few
// per category are 'line' — a numeric baseline the host sets once, guests bet
// Over or Under, and the host later reports the real number to settle it.

export const TEMPLATES_BY_EVENT_TYPE = {
  wedding: [
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
          prompt: "How long are the vows, combined, in minutes?",
          betType: "line",
          lineValue: 4.5,
          overOdds: "-110",
          underOdds: "-110",
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
  ],

  bachelor_bachelorette: [
    {
      name: "Before it starts",
      questions: [
        {
          prompt: "What time does the guest of honour actually show up?",
          options: [
            { label: "On time", odds: "+300" },
            { label: "Fashionably late (under 30 min)", odds: "-140" },
            { label: "Very late", odds: "+220" },
          ],
        },
        {
          prompt: "Will there be a themed outfit or sash?",
          options: [
            { label: "Yes", odds: "-160" },
            { label: "No", odds: "+130" },
          ],
        },
        {
          prompt: "How many drinks does the guest of honour have, total?",
          betType: "line",
          lineValue: 6.5,
          overOdds: "-110",
          underOdds: "-110",
        },
      ],
    },
    {
      name: "The night",
      questions: [
        {
          prompt: "Who gets sick first?",
          options: [
            { label: "The guest of honour", odds: "+250" },
            { label: "Someone who claimed they'd pace themselves", odds: "-120" },
            { label: "Nobody — clean sweep", odds: "+180" },
          ],
        },
        {
          prompt: "Does anyone cry (happy or otherwise)?",
          options: [
            { label: "Yes", odds: "-150" },
            { label: "No", odds: "+130" },
          ],
        },
        {
          prompt: "Who loses their phone at some point?",
          options: [
            { label: "The guest of honour", odds: "+220" },
            { label: "Someone else in the group", odds: "-140" },
            { label: "Nobody", odds: "+260" },
          ],
        },
        {
          prompt: "What time does the group finally call it a night?",
          betType: "line",
          lineValue: 2,
          overOdds: "-110",
          underOdds: "-110",
        },
      ],
    },
    {
      name: "The damage",
      questions: [
        {
          prompt: "Does anyone get a tattoo or piercing?",
          options: [
            { label: "Yes", odds: "+700" },
            { label: "No", odds: "-1500" },
          ],
        },
        {
          prompt: "How many group photos get posted before noon the next day?",
          betType: "line",
          lineValue: 3.5,
          overOdds: "-110",
          underOdds: "-110",
        },
        {
          prompt: "Who's the most hungover the next morning?",
          options: [
            { label: "The guest of honour", odds: "+180" },
            { label: "The one who organised everything", odds: "+200" },
            { label: "The self-proclaimed lightweight", odds: "-140" },
          ],
        },
      ],
    },
  ],

  birthday: [
    {
      name: "Arrivals",
      questions: [
        {
          prompt: "Does the birthday person know about the surprise (if any)?",
          options: [
            { label: "Totally surprised", odds: "+150" },
            { label: "Definitely knew", odds: "-130" },
            { label: "Suspected something", odds: "+180" },
          ],
        },
        {
          prompt: "Who arrives last?",
          options: [
            { label: "The usual suspect", odds: "-180" },
            { label: "Someone who got lost", odds: "+220" },
            { label: "Someone coming straight from work", odds: "+160" },
          ],
        },
        {
          prompt: "How many people show up, total?",
          betType: "line",
          lineValue: 24.5,
          overOdds: "-110",
          underOdds: "-110",
        },
      ],
    },
    {
      name: "The party",
      questions: [
        {
          prompt: "Does the cake situation go smoothly?",
          options: [
            { label: "Perfect, no notes", odds: "+140" },
            { label: "Minor chaos (wrong candles, wax in frosting)", odds: "-150" },
            { label: "Actual disaster", odds: "+400" },
          ],
        },
        {
          prompt: "How many shots does the birthday person take?",
          betType: "line",
          lineValue: 4.5,
          overOdds: "-110",
          underOdds: "-110",
        },
        {
          prompt: "Does someone give an unplanned toast/speech?",
          options: [
            { label: "Yes", odds: "-140" },
            { label: "No", odds: "+120" },
          ],
        },
        {
          prompt: "Who gives the best gift?",
          options: [
            { label: "Best friend", odds: "+150" },
            { label: "Partner", odds: "+130" },
            { label: "The person who clearly overthought it", odds: "+200" },
          ],
        },
      ],
    },
    {
      name: "How it ends",
      questions: [
        {
          prompt: "What time does the birthday person tap out?",
          betType: "line",
          lineValue: 1,
          overOdds: "-110",
          underOdds: "-110",
        },
        {
          prompt: "Does anyone cry (happy tears count)?",
          options: [
            { label: "Yes", odds: "+130" },
            { label: "No", odds: "-160" },
          ],
        },
      ],
    },
  ],

  family_reunion: [
    {
      name: "Getting there",
      questions: [
        {
          prompt: "Who arrives first?",
          options: [
            { label: "The early-bird relative", odds: "-160" },
            { label: "The out-of-towners", odds: "+200" },
            { label: "The hosts' own kids", odds: "+250" },
          ],
        },
        {
          prompt: "How many separate cars/families are running late?",
          betType: "line",
          lineValue: 2.5,
          overOdds: "-110",
          underOdds: "-110",
        },
        {
          prompt: "Does anyone bring the wrong dish (forgot the assignment)?",
          options: [
            { label: "Yes", odds: "+200" },
            { label: "No", odds: "-140" },
          ],
        },
      ],
    },
    {
      name: "The gathering",
      questions: [
        {
          prompt: "What topic starts the first real argument?",
          options: [
            { label: "Politics", odds: "+150" },
            { label: "An old family story, retold wrong", odds: "+180" },
            { label: "Who's hosting next year", odds: "+220" },
            { label: "Nothing — smooth sailing", odds: "+260" },
          ],
        },
        {
          prompt: "How many kids end up in the pool/yard before eating?",
          betType: "line",
          lineValue: 5.5,
          overOdds: "-110",
          underOdds: "-110",
        },
        {
          prompt: "Who tells the same story as last time?",
          options: [
            { label: "Grandpa/grandma", odds: "-150" },
            { label: "An uncle or aunt", odds: "+150" },
            { label: "Nobody repeats this year", odds: "+300" },
          ],
        },
        {
          prompt: "Does a group photo actually happen?",
          options: [
            { label: "Yes, on the first try", odds: "+200" },
            { label: "Yes, after several attempts", odds: "-140" },
            { label: "No — abandoned", odds: "+350" },
          ],
        },
      ],
    },
    {
      name: "Winding down",
      questions: [
        {
          prompt: "Who's the last to leave?",
          options: [
            { label: "The hosts' closest relatives", odds: "-140" },
            { label: "The ones who drove the farthest", odds: "+200" },
            { label: "The kids, dragging their feet", odds: "+220" },
          ],
        },
        {
          prompt: "What time does the last car pull out?",
          betType: "line",
          lineValue: 6,
          overOdds: "-110",
          underOdds: "-110",
        },
      ],
    },
  ],

  other: [
    {
      name: "Setup",
      questions: [
        {
          prompt: "Who arrives first?",
          options: [
            { label: "The usual suspect", odds: "-160" },
            { label: "Someone unexpected", odds: "+220" },
          ],
        },
        {
          prompt: "How many people show up, total?",
          betType: "line",
          lineValue: 14.5,
          overOdds: "-110",
          underOdds: "-110",
        },
      ],
    },
    {
      name: "During",
      questions: [
        {
          prompt: "Does anything go wrong with the plan?",
          options: [
            { label: "Yes", odds: "+140" },
            { label: "No, flawless", odds: "-160" },
          ],
        },
        {
          prompt: "What time does the last person leave?",
          betType: "line",
          lineValue: 11,
          overOdds: "-110",
          underOdds: "-110",
        },
      ],
    },
  ],
};

export const DEFAULT_TEMPLATE_EVENT_TYPE = "other";

export function templatesForEventType(eventType) {
  return (
    TEMPLATES_BY_EVENT_TYPE[eventType] ||
    TEMPLATES_BY_EVENT_TYPE[DEFAULT_TEMPLATE_EVENT_TYPE]
  );
}

export const newOptionId = () =>
  globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);

/** Hydrate a template into the editor's draft shape. */
export function templateToDraft(template) {
  if (template.betType === "line") {
    return {
      betType: "line",
      prompt: template.prompt,
      options: [],
      lineValue: template.lineValue,
      overOdds: template.overOdds || "-110",
      underOdds: template.underOdds || "-110",
      maxWager: "",
    };
  }
  return {
    betType: "guess",
    prompt: template.prompt,
    options: template.options.map((o) => ({ ...o, id: newOptionId() })),
    lineValue: "",
    overOdds: "-110",
    underOdds: "-110",
    maxWager: "",
  };
}
