import type {
  SocialPlatform,
  ContentType,
  ContentTone,
  SocialContent,
  UGCCreation,
  ShotItem,
  ContentIdea,
  AudioSuggestion,
  BatchGenerationRequest,
  BatchGenerationResult,
} from "@/types/social-content";

// ── Hook Templates by Platform & Tone ───────────────────────────────────────

const HOOK_TEMPLATES: Record<SocialPlatform, Record<ContentTone, string[]>> = {
  tiktok: {
    urgent: [
      "Stop scrolling — you NEED this in your life",
      "POV: You just found the product everyone's been asking about",
      "This sold out 3 times — here's why",
      "Run, don't walk — this won't last",
      "I can't believe this is only {price}",
    ],
    casual: [
      "Okay so I'm obsessed with this rn",
      "Not me buying this again for the third time",
      "My honest review of this viral product",
      "Things I didn't know I needed until now",
      "Tell me you're a shopaholic without telling me",
    ],
    luxury: [
      "The quality on this is actually insane",
      "This gives designer vibes for a fraction",
      "Treat yourself — you deserve this",
      "Elevate your everyday with this",
      "The details on this are unmatched",
    ],
    funny: [
      "My wallet is crying but my heart is happy",
      "POV: You tell yourself 'just one more'",
      "Me explaining to my bank account why I need this",
      "When the product review says 'life changing' and they're RIGHT",
      "Adulting is buying kitchen gadgets at 2am",
    ],
    educational: [
      "Here's what nobody tells you about this product",
      "The science behind why this works so well",
      "3 reasons this is better than the expensive version",
      "I tested this for 30 days — here's what happened",
      "Expert tip: this one feature changes everything",
    ],
    emotional: [
      "This product literally changed my morning routine",
      "I wish I found this sooner",
      "The moment I knew I had to have it",
      "For anyone who struggles with ___, this is for you",
      "My setup isn't complete without this",
    ],
    hype: [
      "THE WAIT IS OVER — this just dropped",
      "If you know, you know 🔥",
      "The internet's best kept secret is out",
      "This is about to break the internet",
      "Everyone's been asking — here it is",
    ],
    relatable: [
      "Tell me you need this without telling me",
      "When you finally find the thing that actually works",
      "The product that made me cancel my Amazon order",
      "Normal people don't understand this obsession",
      "My partner thinks I have a problem — they're right",
    ],
  },
  instagram_reels: {
    urgent: [
      "🚨 This is NOT a drill — limited stock available NOW",
      "Before it sells out (again)",
      "Last chance to grab this",
      "The drop everyone's been waiting for",
      "Quick — before the price goes up",
    ],
    casual: [
      "A little something I'm loving right now ✨",
      "Current obsession unlocked",
      "Things that just make sense",
      "My latest find and I'm obsessed",
      "Adding this to the cart immediately",
    ],
    luxury: [
      "For the ones who appreciate the finer things",
      "This is what quality looks like",
      "Your upgrade starts here",
      "Effortless elegance, accessible price",
      "The detail is in the details",
    ],
    funny: [
      "My bank account: 📉 My happiness: 📈",
      "Plot twist: I bought it anyway",
      "Spending money I don't have on things I don't need",
      "The algorithm knows me too well",
      "Adding to cart before my brain catches up",
    ],
    educational: [
      "PSA: You've been doing it wrong",
      "Save this for later — you'll thank me",
      "The hack that changed everything",
      "Product breakdown: is it worth the hype?",
      "Here's the truth nobody's telling you",
    ],
    emotional: [
      "Small things that make a big difference",
      "For my fellow __ enthusiasts",
      "When you finally treat yourself right",
      "This is your sign to buy it",
      "You didn't know you needed this until now",
    ],
    hype: [
      "THE DROP 🔥🔥🔥",
      "It's giving main character energy",
      "No because this is actually everything",
      "The one everyone's been waiting for",
      "Stop what you're doing and look at this",
    ],
    relatable: [
      "Me: I don't need anything. Also me: *adds to cart*",
      "When the algorithm finally gets you",
      "The product that made me question all my past purchases",
      "My toxic trait is thinking I can buy everything",
      "Adulting level: excited about kitchen gadgets",
    ],
  },
  youtube_shorts: {
    urgent: [
      "This product is going viral — here's why",
      "I found something EVERYONE needs",
      "Watch before this gets taken down",
      "The product that broke the internet",
      "You won't believe this price",
    ],
    casual: [
      "Honest review: is this worth it?",
      "Testing this viral product so you don't have to",
      "Quick review — verdict might surprise you",
      "My take on the internet's favorite product",
      "Let me show you why this is genius",
    ],
    luxury: [
      "Is this the best value in premium products?",
      "Quality check: does it live up to the hype?",
      "The details that make this special",
      "Designer quality, fraction of the price",
      "Unboxing something special",
    ],
    funny: [
      "I bought the thing. No regrets. Okay maybe one.",
      "Rating things I definitely didn't need",
      "When the $20 product outperforms the $200 one",
      "My most impulsive purchase yet",
      "Honest review from someone with zero self-control",
    ],
    educational: [
      "The truth about this product (honest review)",
      "I tested it for 30 days — here's what happened",
      "5 things you didn't know about this product",
      "Is this actually worth it? Let me show you",
      "Product comparison you didn't know you needed",
    ],
    emotional: [
      "The product that made me so happy I cried",
      "Finally found something that actually works",
      "This small change made a huge difference",
      "For anyone who needs a win today",
      "The thing that made my whole week",
    ],
    hype: [
      "EVERYONE is talking about this — let me show you why",
      "This is about to be everywhere",
      "The most viral product of the year",
      "If you haven't seen this yet — you will",
      "Breaking down the internet's favorite product",
    ],
    relatable: [
      "Things that just hit different",
      "When you find the perfect product",
      "The struggle is real but this helps",
      "My honest reaction to this viral product",
      "Normalizing buying things that make you happy",
    ],
  },
  facebook_reels: {
    urgent: ["Limited time — grab this before it's gone", "Selling fast — don't miss out", "Special offer you don't want to miss", "Last chance at this price", "Act now — limited quantities"],
    casual: ["Sharing something I really love", "My new favorite find", "Worth every penny", "Had to share this with you all", "My latest obsession"],
    luxury: ["Premium quality you can feel", "The upgrade you've been looking for", "Invest in quality", "Elevate your daily routine", "This is what luxury looks like"],
    funny: ["My husband/wife thinks I'm crazy but LOOK at this", "I have no self-control and I'm okay with it", "When you find the thing", "My cart is crying but I'm happy", "Zero regrets on this one"],
    educational: ["What you need to know before buying", "Here's why this works so well", "The difference quality makes", "Smart shopping tip: look for this feature", "Why this is a game changer"],
    emotional: ["Small pleasures that make life better", "You deserve this", "The little things that matter", "My morning routine isn't the same without this", "For everyone who deserves a treat"],
    hype: ["The product everyone is talking about", "You've seen this everywhere — here's my take", "Viral for a reason", "This lives up to the hype", "Finally in stock"],
    relatable: ["If you know, you know", "When the product is actually as good as they say", "Real talk: this is worth it", "My honest thoughts", "We've all been there — this helps"],
  },
  pinterest_pins: {
    urgent: ["Don't miss this find", "Limited stock available", "Grab yours before they're gone", "Trending now — get it while you can", "The find of the season"],
    casual: ["A little inspiration for your day", "Curated finds I'm loving", "Add this to your wishlist", "The perfect addition to your collection", "Daily dose of inspiration"],
    luxury: ["Elevate your space", "Timeless elegance", "The art of quality living", "Refined taste, accessible price", "Luxury redefined"],
    funny: ["When you find the perfect thing", "My shopping cart called — it wants this", "No regrets, only vibes", "Adding to collection, not cart (lie)", "Treat yourself, you earned it"],
    educational: ["The ultimate buying guide", "Everything you need to know", "How to choose the right one", "Pro tips for the best experience", "The complete breakdown"],
    emotional: ["For the love of all things beautiful", "Make every day special", "The little luxuries in life", "You deserve nice things", "Create your happy place"],
    hype: ["The #1 trending find", "Everyone's favorite — discover why", "The must-have of the season", "Trending for a reason", "The find everyone's saving"],
    relatable: ["When the algorithm gets you", "The thing you didn't know you needed", "We're all thinking it", "The relatable content you came for", "Real finds for real people"],
  },
};

// ── Caption Templates ───────────────────────────────────────────────────────

const CAPTION_TEMPLATES: Record<ContentType, string[]> = {
  hook: [
    "Stop scrolling — {product} is the game changer you've been waiting for 🚀",
    "POV: You just discovered the {product} everyone's been talking about",
    "This {product} sold out 3 times. Here's why it's BACK 🔥",
    "I tested {product} for 30 days. The results? 👀",
    "Things I didn't know I needed until {product}",
  ],
  caption: [
    "✨ {product} — the upgrade your routine needs.\n\nWhy I love it:\n✅ {benefit1}\n✅ {benefit2}\n✅ {benefit3}\n\nLink in bio 👆",
    "Not me buying {product} for the third time 😅\n\nIf you know, you know. This thing is LEGIT.\n\nWho else is obsessed? 👇",
    "Hot take: {product} is worth every penny 💯\n\nHere's why:\n→ {benefit1}\n→ {benefit2}\n→ {benefit3}\n\nDon't sleep on this one.",
    "The internet's best kept secret: {product} 🤫\n\nI've tried everything. This is the one.\n\nSave this post — you'll want it later.",
    "3 reasons {product} changed my life:\n1️⃣ {benefit1}\n2️⃣ {benefit2}\n3️⃣ {benefit3}\n\nTrust me on this one.",
  ],
  script: [
    "HOOK: Hold up — you need to see this.\nPROBLEM: {problem}\nSOLUTION: {product}\nPROOF: {proof}\nCTA: Link in bio — don't miss out.",
    "OPENING: I can't believe I waited so long to try {product}.\nMIDDLE: Here's what happened when I started using it...\nCLIMAX: {result}\nCLOSING: If you've been thinking about it — this is your sign.",
    "SCENE 1: Show the problem\nSCENE 2: Introduce {product}\nSCENE 3: Before/after or demonstration\nSCENE 4: CTA — grab yours now",
    "DAY 1: Just got {product}, first impressions...\nDAY 7: Okay, I'm starting to see why everyone loves this\nDAY 30: I'm never going back. Here's why...",
    "ACT 1: The struggle (relatable problem)\nACT 2: The discovery (finding {product})\nACT 3: The transformation (results)\nACT 4: The recommendation (CTA)",
  ],
  hashtag_set: [
    "#{product} #viral #trending #musthave #fyp #shopping #onlineshopping #addtocart #shopnow #tiktokmademebuyit",
    "#{niche} #{product} #review #honestreview #productreview #worthit #notsponsored #myfavorite #cantlivewithoutit",
    "#{category} #finds #amazingfinds #hiddenfinds #amazonfinds #shopifyfinds #trending #viralproduct",
    "#sale #discount #deal #bargain #affordable #budgetfriendly #cheap #save #smartshopping #bestdeal",
    "#{product} #unboxing #firstimpressions #haul #newarrival #justarrived #excited #obsessed #love",
  ],
  ad_copy: [
    "🔥 {product} — The product that's breaking the internet.\n\n✅ {benefit1}\n✅ {benefit2}\n✅ {benefit3}\n\n⚡ Limited stock — Order now before it's gone!\n\n#shopnow #trending",
    "Tired of {problem}? Meet {product}.\n\n💡 Why [customer count] customers love it:\n→ {benefit1}\n→ {benefit2}\n→ {benefit3}\n\n🚚 Free shipping on all orders\n\n👉 Shop now — link in bio",
    "This changes everything.\n\n{product} isn't just another product — it's THE product.\n\nHere's what makes it different:\n⭐ {benefit1}\n⭐ {benefit2}\n⭐ {benefit3}\n\nDon't just take our word for it. Try it yourself.",
    "⚡ FLASH SALE ⚡\n\n{product} — 24 hours only\n\nBefore: {old_price}\nNow: {new_price}\n\nThis won't last. Seriously.\n\n→ Link in bio",
    "The #1 {category} product this year\n\n{product} has:\n✅ {benefit1}\n✅ {benefit2}\n✅ {benefit3}\n\n⭐⭐⭐⭐⭐ ([X] reviews)\n\nJoin [customer count] happy customers",
  ],
  ugc_script: [
    "Hey guys! So I finally got {product} and honestly? I'm impressed.\n\n[Show unboxing]\nFirst impressions — the packaging is really nice. Let me show you what's inside.\n\n[Show product]\nThe quality is way better than I expected for the price.\n\n[Demo]\nOkay so here's how it works... *shows* See that? That's exactly what I needed.\n\n[Verdict]\nOverall? 10/10 would recommend. Link is in my bio if you want to check it out.",
    "Okay I need to talk about {product} because WOW.\n\n[Hook — show result]\nLook at this. See the difference?\n\n[Show product]\nSo here's what happened — I was skeptical at first, but after using it for a week...\n\n[Demonstrate]\nThe way this works is actually genius. Let me show you.\n\n[Close]\nIf you've been on the fence — just get it. You'll thank me later.",
  ],
  story: [
    "New story: {product} is HERE 🎉\n\nSwipe up to see why everyone's obsessed →",
    "Story time: How I found the perfect {product} 💫\n\nThe search is over. This is it.",
    "Behind the scenes with {product} 📦\n\nUnboxing + my honest first thoughts",
    "Day in my life featuring {product} ✨\n\nThis is what I use every single day now",
  ],
  carousel: [
    "Slide 1: {product} — Everything you need to know\nSlide 2: What is it?\nSlide 3: Why it's special\nSlide 4: 3 reasons to buy\nSlide 5: Where to get it",
    "5 things I wish I knew before buying {product}:\n1. It's worth the hype\n2. The quality is insane\n3. Customer service is great\n4. Shipping was fast\n5. I bought 3 more",
    "Before vs After: {product} edition\n\nSlide 1: Before (the struggle)\nSlide 2: After (the solution)\nSlide 3: How it works\nSlide 4: Get yours",
  ],
};

// ── CTA Templates ───────────────────────────────────────────────────────────

const CTA_TEMPLATES: Record<SocialPlatform, string[]> = {
  tiktok: ["Link in bio 🔗", "Comment LINK and I'll DM you", "Check my bio for the link", "Tap the link 👆", "Grab yours before it's gone →"],
  instagram_reels: ["Link in bio 👆", "Shop now — link in bio", "Save this for later 📌", "DM me LINK for the direct link", "Don't forget to save this post"],
  youtube_shorts: ["Link in description 👇", "Check the link below", "Subscribe for more finds", "Comment your thoughts", "Save this video for later"],
  facebook_reels: ["Shop now 👆", "Link in comments", "Order yours today", "Limited stock — order now", "Share with someone who needs this"],
  pinterest_pins: ["Save this pin 🔖", "Shop the look", "Click to buy", "Add to your board", "Discover more →"],
};

// ── Content Generation Engine ────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMultiple<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function generateHashtags(productTitle: string, platform: SocialPlatform): string[] {
  const base = productTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => `#${w}`);

  const platformTags: Record<SocialPlatform, string[]> = {
    tiktok: ["#fyp", "#viral", "#trending", "#tiktokmademebuyit", "#musthave", "#foryou", "#shopping"],
    instagram_reels: ["#reels", "#instareels", "#explore", "#viral", "#trending", "#reelsinstagram", "#fyp"],
    youtube_shorts: ["#shorts", "#youtube", "#viral", "#trending", "#productreview", "#honestreview"],
    facebook_reels: ["#reels", "#facebook", "#viral", "#trending", "#musthave", "#shopping"],
    pinterest_pins: ["#pinterest", "#pins", "#inspiration", "#shopping", "#finds", "#trending", "#aesthetic"],
  };

  return [...base, ...pickMultiple(platformTags[platform], 4)].slice(0, 15);
}

function generateAudioSuggestion(platform: SocialPlatform): AudioSuggestion {
  const suggestedAudios: AudioSuggestion[] = [
    { name: "Original audio", artist: "You", platform: "tiktok" },
    { name: "Cruel Summer", artist: "Taylor Swift", platform: "tiktok" },
    { name: "Paint The Town Red", artist: "Doja Cat", platform: "instagram_reels" },
    { name: "Greedy", artist: "Tate McRae", platform: "tiktok" },
    { name: "Lovin On Me", artist: "Jack Harlow", platform: "instagram_reels" },
    { name: "Water", artist: "Tyla", platform: "tiktok" },
    { name: "Snooze", artist: "SZA", platform: "youtube_shorts" },
    { name: "Escapism", artist: "RAYE", platform: "tiktok" },
  ];

  const filtered = suggestedAudios.filter((a) => a.platform === platform || a.platform === "tiktok");
  return pickRandom(filtered.length > 0 ? filtered : suggestedAudios);
}

export function generateSingleContent(params: {
  productTitle: string;
  productImage?: string;
  platform: SocialPlatform;
  contentType: ContentType;
  tone: ContentTone;
  targetAudience: string;
}): SocialContent {
  const { productTitle, productImage, platform, contentType, tone, targetAudience } = params;

  const fill = (text: string) =>
    text
      .replace(/\{product\}/g, productTitle)
      .replace(/\{price\}/g, "[your price]")
      .replace(/\{old_price\}/g, "[your old price]")
      .replace(/\{new_price\}/g, "[your price]")
      .replace(/\{benefit1\}/g, "Amazing quality")
      .replace(/\{benefit2\}/g, "Fast shipping")
      .replace(/\{benefit3\}/g, "Great value for money")
      .replace(/\{problem\}/g, "finding quality products at good prices")
      .replace(/\{proof\}/g, "[your social proof]")
      .replace(/\{result\}/g, "complete transformation")
      .replace(/\{niche\}/g, targetAudience || "lifestyle")
      .replace(/\{category\}/g, "trending");

  // Pick hook
  const hooks = HOOK_TEMPLATES[platform]?.[tone] || HOOK_TEMPLATES.tiktok[tone];
  const hook = fill(pickRandom(hooks));

  // Pick caption/script template
  const templates = CAPTION_TEMPLATES[contentType];
  const template = pickRandom(templates);

  // Fill template
  const content = fill(template);

  // Generate hashtags
  const hashtags = generateHashtags(productTitle, platform);

  // Pick CTA
  const ctas = CTA_TEMPLATES[platform];
  const cta = pickRandom(ctas);

  // Audio suggestion
  const audioSuggestion = generateAudioSuggestion(platform);

  return {
    id: "",
    productTitle,
    productImage,
    platform,
    contentType,
    tone,
    content: `${hook}\n\n${content}\n\n${cta}`,
    hashtags,
    audioSuggestion,
    cta,
    targetAudience,
    performanceNotes: `Optimized for ${platform} ${tone} tone. Target: ${targetAudience}.`,
    saved: false,
    createdAt: new Date().toISOString(),
  };
}

export function generateBatchContent(request: BatchGenerationRequest): BatchGenerationResult {
  const contents: SocialContent[] = [];
  const platformBreakdown: Record<SocialPlatform, number> = {
    tiktok: 0,
    instagram_reels: 0,
    youtube_shorts: 0,
    facebook_reels: 0,
    pinterest_pins: 0,
  };

  for (const platform of request.platforms) {
    for (const contentType of request.contentTypes) {
      for (let i = 0; i < Math.ceil(request.count / (request.platforms.length * request.contentTypes.length)); i++) {
        const content = generateSingleContent({
          productTitle: request.productTitle,
          productImage: request.productImage,
          platform,
          contentType,
          tone: request.tone,
          targetAudience: request.targetAudience,
        });
        contents.push(content);
        platformBreakdown[platform]++;
      }
    }
  }

  return {
    contents: contents.slice(0, request.count),
    totalGenerated: Math.min(contents.length, request.count),
    platformBreakdown,
  };
}

// ── UGC Script Generator ────────────────────────────────────────────────────

export function generateUGCCreation(params: {
  productTitle: string;
  productDescription: string;
  productImage?: string;
  style: UGCCreation["style"];
  platform: SocialPlatform;
}): UGCCreation {
  const { productTitle, productDescription, productImage, style, platform } = params;

  const scripts: Record<UGCCreation["style"], string> = {
    unboxing: `Hey everyone! So I just got ${productTitle} and I'm SO excited to unbox it.\n\n[Opening the package]\nOkay first impression — the packaging is really nice. No damage, everything is secure.\n\n[Revealing the product]\nOh wow. This is even better in person than in the photos. Let me show you the details.\n\n[Showing details]\nThe quality is seriously impressive for this price point. You can feel the difference.\n\n[First use]\nLet me try it out real quick... *uses product* Okay yeah, this is definitely going in my daily rotation.\n\n[Verdict]\nFirst impression: 9/10. I'll do a full review after a week of use. Follow me for the update!\n\nLink in my bio if you want to check it out.`,
    review: `So I've been using ${productTitle} for about a week now and here's my honest review.\n\n[Show product]\nFirst, let me talk about the quality. This is NOT cheap — it feels premium.\n\n[Pros]\nWhat I love:\n✅ The build quality is excellent\n✅ It actually does what it claims\n✅ The price is unbeatable for what you get\n✅ Shipping was super fast\n\n[Cons]\nWhat could be better:\n⚠️ The instructions could be clearer\n⚠️ I wish it came in more colors\n\n[Demonstration]\nLet me show you how it works... *demonstrates*\nSee that? That's exactly what I needed.\n\n[Final verdict]\nOverall, I'd give this a solid 8.5/10. Would I recommend it? Absolutely.\n\nIf you've been on the fence — this is your sign to get it.`,
    tutorial: `Today I'm going to show you exactly how to use ${productTitle}.\n\n[Step 1]\nFirst, you want to... *shows step*\n\n[Step 2]\nNext, take the product and... *demonstrates*\n\n[Step 3]\nThe key here is to... *explains technique*\n\n[Step 4]\nAnd finally, you'll want to... *completes process*\n\n[Result]\nSee the difference? That's what ${productTitle} can do.\n\n[Pro tips]\nA few tips:\n1. Start with less and build up\n2. Consistency is key\n3. Don't skip this step — it makes a huge difference\n\n[CTA]\nIf you want to try it yourself, link is in my bio. Trust me, you won't regret it.`,
    before_after: `Okay, I HAVE to show you this transformation.\n\n[Before — showing the problem]\nThis is what I was dealing with before. As you can see... it's not great.\n\n[Transition]\nI started using ${productTitle} about [timeframe] ago...\n\n[After — showing the result]\nAnd THIS is the result. Look at that difference!\n\n[Product showcase]\nHere's the product that made this possible. The quality is unreal.\n\n[How it works]\nBasically, it works by... *explains mechanism*\n\n[Verdict]\nI'm genuinely impressed. This is one of those products that actually delivers on its promise.\n\nLink in bio — you need this in your life.`,
    lifestyle: `Just a day in my life featuring ${productTitle} ✨\n\n[Morning routine]\nStart my day with this — it's become essential.\n\n[Throughout the day]\nWhether I'm at work, at the gym, or just relaxing — this is always with me.\n\n[Product features in action]\nHere's why it fits my lifestyle perfectly...\n\n[Evening wind-down]\nEnd my day the same way. Consistency is everything.\n\n[Thoughts]\nHonestly, ${productTitle} has become one of those products I can't imagine life without. It just makes everything better.\n\nIf you're looking for something that fits your lifestyle, this is it. Link in bio.`,
    comparison: `Everyone keeps asking me — is ${productTitle} actually worth it? Let me break it down.\n\n[What I've tried]\nI've tried probably 5-6 different options in this category. Here's what I found:\n\n[Option 1 vs This]\nThe first option I tried was... honestly? Not great. Here's why.\n\n[Option 2 vs This]\nThe second was better, but still had issues...\n\n[The winner]\nThen I found ${productTitle}. And immediately, I could tell the difference.\n\n[Head to head]\nLet me show you the comparison side by side...\n\n[Why this wins]\nHere's why ${productTitle} comes out on top:\n1. Quality —明显 better\n2. Price — Actually more affordable\n3. Features — Does more than the expensive ones\n\n[Verdict]\nIf you're going to buy one product in this category — make it this one.`,
    problem_solution: `If you've ever struggled with [problem], you NEED to see this.\n\n[The problem]\nHere's the thing — [describes common problem]. Sound familiar? Yeah, I've been there.\n\n[Frustration]\nI tried everything. Different products, different approaches. Nothing worked.\n\n[The discovery]\nThen I found ${productTitle}. And honestly? I was skeptical.\n\n[The solution]\nBut after using it for just [timeframe]... look at this.\n\n[Demonstration]\nThe way it works is actually clever. Let me show you...\n\n[Result]\nProblem? SOLVED. I'm not even exaggerating.\n\n[CTA]\nIf you deal with [problem] too — this is your answer. Link in my bio.`,
  };

  const hookOptions = [
    `POV: You finally found the solution to [problem]`,
    `Stop scrolling — this changed my life`,
    `Things that just work: ${productTitle} edition`,
    `The product that solved my biggest problem`,
    `I can't believe this exists`,
    `When you find the thing that actually works`,
    `This is your sign to try ${productTitle}`,
    `The honest truth about ${productTitle}`,
  ];

  const shotList: ShotItem[] = style === "unboxing" ? [
    { order: 1, description: "Package on table — sealed", duration: "3s", cameraAngle: "Top-down", notes: "Clean background" },
    { order: 2, description: "Hands opening package", duration: "5s", cameraAngle: "Close-up", notes: "Show anticipation" },
    { order: 3, description: "First reveal of product", duration: "3s", cameraAngle: "Eye-level", notes: "React naturally" },
    { order: 4, description: "Product details close-up", duration: "5s", cameraAngle: "Macro", notes: "Show quality" },
    { order: 5, description: "First use / try-on", duration: "8s", cameraAngle: "Medium shot", notes: "Show genuine reaction" },
    { order: 6, description: "Verdict and CTA", duration: "5s", cameraAngle: "Eye-level", notes: "Be authentic" },
  ] : style === "tutorial" ? [
    { order: 1, description: "Hook — show the problem", duration: "3s", cameraAngle: "Eye-level", notes: "Relatable opening" },
    { order: 2, description: "Introduce the product", duration: "3s", cameraAngle: "Close-up", notes: "Clear product shot" },
    { order: 3, description: "Step 1 demonstration", duration: "8s", cameraAngle: "Hands-on", notes: "Clear and slow" },
    { order: 4, description: "Step 2 demonstration", duration: "8s", cameraAngle: "Hands-on", notes: "Show key detail" },
    { order: 5, description: "Step 3 demonstration", duration: "8s", cameraAngle: "Hands-on", notes: "Complete the process" },
    { order: 6, description: "Result reveal", duration: "5s", cameraAngle: "Before/after", notes: "Dramatic reveal" },
    { order: 7, description: "Final thoughts and CTA", duration: "5s", cameraAngle: "Eye-level", notes: "Authentic closing" },
  ] : [
    { order: 1, description: "Hook — grab attention", duration: "3s", cameraAngle: "Eye-level", notes: "Strong opening" },
    { order: 2, description: "Show the product", duration: "5s", cameraAngle: "Close-up", notes: "Clear shot" },
    { order: 3, description: "Demonstrate / use", duration: "10s", cameraAngle: "Medium shot", notes: "Show in action" },
    { order: 4, description: "Key feature highlight", duration: "5s", cameraAngle: "Detail shot", notes: "Focus on USP" },
    { order: 5, description: "Verdict / CTA", duration: "5s", cameraAngle: "Eye-level", notes: "Authentic conclusion" },
  ];

  return {
    id: "",
    productTitle,
    productImage,
    productDescription,
    style,
    platform,
    script: scripts[style],
    hookOptions,
    shotList,
    duration: style === "tutorial" ? "60s" : "30s",
    difficulty: style === "tutorial" || style === "comparison" ? "medium" : "easy",
    saved: false,
    createdAt: new Date().toISOString(),
  };
}

// ── Content Ideas Generator ──────────────────────────────────────────────────

export function generateContentIdeas(productTitle: string, platform: SocialPlatform): ContentIdea[] {
  const ideas: Omit<ContentIdea, "id" | "createdAt" | "saved">[] = [
    {
      productTitle,
      platform,
      ideaType: "hook",
      title: "3 Hooks That Stop the Scroll",
      description: `Create 3 different hook variations for ${productTitle} — emotional, curiosity, and FOMO based.`,
      estimatedEngagement: "high",
      difficulty: "easy",
      tags: ["hooks", "attention", "viral"],
    },
    {
      productTitle,
      platform,
      ideaType: "story",
      title: "My 7-Day Transformation Story",
      description: `Document using ${productTitle} for 7 days. Day 1 vs Day 7 comparison.`,
      estimatedEngagement: "high",
      difficulty: "medium",
      tags: ["story", "transformation", "journey"],
    },
    {
      productTitle,
      platform,
      ideaType: "series",
      title: "Weekly Product Review Series",
      description: `Start a recurring series reviewing ${productTitle} and similar products in the niche.`,
      estimatedEngagement: "medium",
      difficulty: "medium",
      tags: ["series", "recurring", "review"],
    },
    {
      productTitle,
      platform,
      ideaType: "challenge",
      title: "The ${productTitle} Challenge",
      description: `Create a challenge around using ${productTitle}. Encourage followers to try and share.`,
      estimatedEngagement: "viral",
      difficulty: "hard",
      tags: ["challenge", "ugc", "viral"],
    },
    {
      productTitle,
      platform,
      ideaType: "duet",
      title: "React to Other Reviews",
      description: `Duet/stitch with other reviews of ${productTitle}. Add your unique perspective.`,
      estimatedEngagement: "medium",
      difficulty: "easy",
      tags: ["duet", "reaction", "community"],
    },
    {
      productTitle,
      platform,
      ideaType: "angle",
      title: "The 'Unexpected Benefit' Angle",
      description: `Highlight an unexpected or underrated feature of ${productTitle} that nobody talks about.`,
      estimatedEngagement: "high",
      difficulty: "easy",
      tags: ["angle", "unique", "discovery"],
    },
  ];

  return ideas.map((idea) => ({
    ...idea,
    id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    saved: false,
  }));
}
