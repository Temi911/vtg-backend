const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('../config/db');
const { AppError } = require('../utils/AppError');

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

// ============================================================
// COUNTRY SIGNUP REQUIREMENTS — hand-verified, not model-generated.
// USSD codes and "instant retrieval" claims are operationally sensitive:
// a wrong code costs someone real time/money on their own phone. Only
// Nigeria's BVN has a genuine, well-established instant USSD self-service
// (*565*0#, confirmed current across many independent sources as of 2026).
// Every other country's core identity credential requires an in-person
// visit to the issuing authority — that is stated honestly below rather
// than inventing a code that doesn't exist. The AI is instructed (see
// systemPromptForPublic) to use live web search to double-check anything
// before repeating it, and to always tell the user to confirm with the
// official source since procedures and fees change.
// ============================================================
const SIGNUP_REQUIREMENTS = {
  Nigeria: {
    buyer_credential: 'BVN (Bank Verification Number) — an 11-digit number every Nigerian bank customer has',
    how_to_get_it: 'If you already bank in Nigeria, dial *565*0# from the phone number registered to your bank account — your BVN is returned instantly (a small network fee of roughly ₦20-50 applies). This only works from the exact SIM linked to your account. If that fails or you\'ve never enrolled, your bank can generate one at any branch, or most banking apps (GTBank, Zenith, Access, etc.) show it under Profile/Account Info.',
    official_link: 'https://www.nibss-plc.com.ng (Nigeria Inter-Bank Settlement System, which operates BVN)',
    also_useful: 'NIN (National Identification Number) from NIMC is increasingly requested alongside BVN for full KYC.',
  },
  Ghana: {
    buyer_credential: 'Ghana Card — Ghana\'s national ID, issued by the National Identification Authority (NIA)',
    how_to_get_it: 'There is no instant USSD lookup for your Ghana Card number itself. First-time registration is free for Ghanaian citizens at any NIA District Office. If you already have one and just need to confirm which SIM/registration is linked to it, MTN and Telecel offer *400# to check SIM registration status tied to your card — but that is not the same as retrieving the card number.',
    official_link: 'https://nia.gov.gh',
    also_useful: null,
  },
  Kenya: {
    buyer_credential: 'National ID number, issued by the National Registration Bureau',
    how_to_get_it: 'There is no USSD code that retrieves your National ID number — this specifically requires visiting a Huduma Centre in person (bring your ID waiting card if you have one). Processing a replacement takes about 10 days; a first-time application can take a month or two.',
    official_link: 'https://www.hudumakenya.go.ke',
    also_useful: 'SHA/SHIF health insurance status (a separate system) can be checked via *147#, in case that\'s what\'s being asked about instead.',
  },
  'South Africa': {
    buyer_credential: '13-digit SA ID number, on a Smart ID Card or the older green barcoded ID book, issued by the Department of Home Affairs',
    how_to_get_it: 'No verified instant USSD retrieval exists for this — visit a Department of Home Affairs office in person, or check an existing Smart ID Card/ID book you already hold.',
    official_link: 'https://www.dha.gov.za',
    also_useful: null,
  },
  Ethiopia: {
    buyer_credential: 'Fayda National ID (Ethiopia\'s newer digital national ID) or a Kebele ID card',
    how_to_get_it: 'No verified instant USSD retrieval exists for this — registration is handled through Ethiopia\'s National ID Program (Fayda) enrollment centers, or through your local Kebele (district) administration office for the older Kebele ID.',
    official_link: 'https://id.gov.et',
    also_useful: null,
  },
  default: {
    buyer_credential: 'A government-issued national ID or passport',
    how_to_get_it: 'Requirements vary by country — tell me which country you\'re in and I\'ll give you what I actually know, or search for current information rather than guess.',
    official_link: null,
    also_useful: null,
  },
};

const SUPPLIER_REQUIREMENTS = {
  credential: 'Chinese Business Licence (营业执照) issued by the State Administration for Market Regulation (SAMR), plus your company\'s SWIFT-capable bank account details',
  how_to_get_it: 'Registration is done through your local Administration for Market Regulation office or via the national enterprise registration portal. This is a business licence, not a personal ID — it\'s tied to your registered company.',
  official_link: 'https://www.gsxt.gov.cn (National Enterprise Credit Information Publicity System, for verifying a licence number)',
};

const BANK_REQUIREMENTS = {
  credential: 'A valid banking licence from your national/regional regulator (e.g. the Central Bank of Nigeria) and your institution\'s SWIFT/BIC code',
  how_to_get_it: 'This is issued to your institution, not to you individually — your compliance or trade-finance department will already hold these; VTG just needs the licence number and SWIFT code on file.',
  official_link: null,
};

async function toolGetSignupRequirements(ctx, args) {
  const country = args && args.country;
  const role = (args && args.role) || (ctx && ctx.role) || 'buyer';

  if (role === 'supplier') return SUPPLIER_REQUIREMENTS;
  if (role === 'bank') return BANK_REQUIREMENTS;

  const data = SIGNUP_REQUIREMENTS[country] || SIGNUP_REQUIREMENTS.default;
  return { country: country || 'unspecified', ...data };
}


// TOOLS — every tool is scoped to (userId, role) that Claude
// never sees or controls directly. The AI can only ever see the
// calling user's own data; it cannot be prompted into fetching
// someone else's orders, wallet, or LC information.
// ============================================================

async function toolGetMyOrders(ctx) {
  const column = ctx.role === 'buyer' ? 'buyer_id' : ctx.role === 'supplier' ? 'supplier_id' : 'bank_id';
  const { rows } = await query(
    `SELECT o.reference, o.status, o.total_amount_usd, o.currency, o.incoterm, o.created_at,
            bu.full_name AS buyer_name, su.full_name AS supplier_name
     FROM orders o
     JOIN users bu ON bu.id = o.buyer_id
     JOIN users su ON su.id = o.supplier_id
     WHERE o.${column} = $1
     ORDER BY o.created_at DESC LIMIT 15`,
    [ctx.userId]
  );
  return rows;
}

async function toolGetShipmentStatus(ctx, args) {
  const orderRes = await query(
    `SELECT * FROM orders WHERE reference = $1 AND (buyer_id = $2 OR supplier_id = $2 OR bank_id = $2)`,
    [args.order_reference, ctx.userId]
  );
  const order = orderRes.rows[0];
  if (!order) return { error: 'No order found with that reference for this account.' };

  const shipRes = await query('SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1', [order.id]);
  const shipment = shipRes.rows[0];
  if (!shipment) return { order_reference: order.reference, status: order.status, message: 'No shipment has been created for this order yet.' };

  const events = await query('SELECT location, detail, status, event_time FROM tracking_events WHERE shipment_id = $1 ORDER BY sort_order ASC', [shipment.id]);
  return {
    order_reference: order.reference,
    order_status: order.status,
    container_no: shipment.container_no,
    carrier: shipment.carrier,
    origin_port: shipment.origin_port,
    destination_port: shipment.destination_port,
    percent_complete: shipment.percent_complete,
    tracking_timeline: events.rows,
  };
}

async function toolGetWalletBalance(ctx) {
  const { rows } = await query('SELECT currency, balance FROM wallet_accounts WHERE user_id = $1', [ctx.userId]);
  return rows.length ? rows : { message: 'No wallet balances found.' };
}

async function toolGetLcStatus(ctx, args) {
  const params = [ctx.userId];
  let where = ctx.role === 'buyer' ? 'lc.buyer_id = $1' : ctx.role === 'supplier' ? 'lc.supplier_id = $1' : '(lc.issuing_bank_id = $1 OR lc.issuing_bank_id IS NULL)';
  if (args && args.reference) {
    params.push(args.reference);
    where += ` AND lc.reference = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT lc.reference, lc.status, lc.amount_usd, lc.issuing_bank_name, lc.swift_mt700_ref, lc.swift_mt103_ref, lc.expiry_date, o.reference AS order_reference
     FROM letters_of_credit lc JOIN orders o ON o.id = lc.order_id
     WHERE ${where} ORDER BY lc.created_at DESC LIMIT 15`,
    params
  );
  return rows;
}

async function toolGetPendingActions(ctx) {
  const items = [];
  if (ctx.role === 'buyer') {
    const { rows } = await query(
      `SELECT reference, status, total_amount_usd FROM orders WHERE buyer_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 10`,
      [ctx.userId]
    );
    rows.forEach((o) => items.push(`Order ${o.reference} ($${o.total_amount_usd}) is still pending — consider requesting an LC or another payment method to move it forward.`));
  } else if (ctx.role === 'supplier') {
    const { rows } = await query(
      `SELECT lc.reference, lc.amount_usd FROM letters_of_credit lc WHERE lc.supplier_id = $1 AND lc.status = 'issued' ORDER BY lc.created_at DESC LIMIT 10`,
      [ctx.userId]
    );
    rows.forEach((lc) => items.push(`LC ${lc.reference} ($${lc.amount_usd}) has been issued — you should ship the goods and present shipping documents.`));
  } else if (ctx.role === 'bank') {
    const { rows } = await query(
      `SELECT reference, amount_usd, status FROM letters_of_credit WHERE status IN ('requested','docs_presented') AND (issuing_bank_id = $1 OR issuing_bank_id IS NULL) ORDER BY created_at DESC LIMIT 10`,
      [ctx.userId]
    );
    rows.forEach((lc) => {
      if (lc.status === 'requested') items.push(`LC ${lc.reference} ($${lc.amount_usd}) is awaiting issuance — a bank officer needs to issue it.`);
      else items.push(`LC ${lc.reference} ($${lc.amount_usd}) has documents awaiting your verification and payment release.`);
    });
  }
  return items.length ? items : ['No pending action items right now.'];
}

// ── Live external data: exchange rates & crypto prices ──────
// Both use free, keyless, well-established public APIs so figures
// are real and current rather than pulled from a news search
// (which can quote stale or inconsistent numbers).

async function toolGetExchangeRates(ctx, args) {
  const base = (args && args.base_currency) || 'USD';
  const targets = (args && args.target_currencies && args.target_currencies.length)
    ? args.target_currencies
    : ['NGN', 'CNY', 'GHS', 'KES', 'ZAR', 'EUR', 'GBP'];

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}&to=${encodeURIComponent(targets.join(','))}`);
    if (!res.ok) throw new Error(`Rate provider returned ${res.status}`);
    const data = await res.json();
    return {
      base_currency: data.base,
      as_of_date: data.date,
      rates: data.rates,
      source: 'Frankfurter (European Central Bank reference rates)',
      note: 'ECB does not publish NGN, GHS, KES, or ZAR reference rates on weekends/holidays or at all for some currencies — if a currency you asked for is missing, say so rather than inventing a figure.',
    };
  } catch (err) {
    return { error: `Could not fetch live exchange rates right now (${err.message}). Do not guess a figure — tell the user the live rate lookup failed.` };
  }
}

async function toolGetCryptoPrices(ctx, args) {
  const coins = (args && args.coins && args.coins.length) ? args.coins : ['bitcoin', 'ethereum', 'tether', 'usd-coin'];
  const vsCurrency = (args && args.vs_currency) || 'usd';
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coins.join(','))}&vs_currencies=${encodeURIComponent(vsCurrency)}&include_24hr_change=true`
    );
    if (!res.ok) throw new Error(`Price provider returned ${res.status}`);
    const data = await res.json();
    return { prices: data, vs_currency: vsCurrency, source: 'CoinGecko' };
  } catch (err) {
    return { error: `Could not fetch live crypto prices right now (${err.message}). Do not guess a figure — tell the user the live price lookup failed.` };
  }
}

const TOOL_DEFS = [
  {
    name: 'get_my_orders',
    description: "Get the current user's recent orders (as buyer, supplier, or bank depending on their role), including status and value.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_shipment_status',
    description: 'Get live shipment/tracking status for one of the current user\'s orders by order reference (e.g. "VTG-2024-010"). Use this whenever someone asks where their goods are.',
    input_schema: {
      type: 'object',
      properties: { order_reference: { type: 'string', description: 'The order reference, e.g. VTG-2024-010' } },
      required: ['order_reference'],
    },
  },
  {
    name: 'get_wallet_balance',
    description: "Get the current user's wallet balances across USD, NGN, and CNY.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_lc_status',
    description: "Get the current user's Letters of Credit and their status. Optionally filter to one LC by reference.",
    input_schema: {
      type: 'object',
      properties: { reference: { type: 'string', description: 'Optional specific LC reference to look up' } },
    },
  },
  {
    name: 'get_pending_actions',
    description: "Get a list of the current user's outstanding responsibilities and duties on the platform right now — pending approvals, documents to present, payments to arrange, etc. Use this whenever someone asks what they need to do, or asks for a reminder.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_exchange_rates',
    description: 'Get LIVE, current foreign exchange rates between a base currency and one or more target currencies (fiat only — for crypto use get_crypto_prices instead). Use this for any question about currency values, NGN/USD/CNY rates, or how much a currency is worth right now. Always use this tool rather than recalling a rate from memory, since exchange rates change constantly.',
    input_schema: {
      type: 'object',
      properties: {
        base_currency: { type: 'string', description: 'Three-letter currency code to convert FROM, e.g. USD' },
        target_currencies: { type: 'array', items: { type: 'string' }, description: 'Three-letter currency codes to convert TO, e.g. ["NGN","CNY"]' },
      },
    },
  },
  {
    name: 'get_crypto_prices',
    description: 'Get LIVE, current cryptocurrency prices (e.g. Bitcoin, Ethereum, USDT, USDC) in USD or another currency. Use this for any question about crypto values or prices — never recall a price from memory since crypto prices change by the minute.',
    input_schema: {
      type: 'object',
      properties: {
        coins: { type: 'array', items: { type: 'string' }, description: 'CoinGecko coin ids, e.g. ["bitcoin","ethereum","tether","usd-coin"]' },
        vs_currency: { type: 'string', description: 'Currency to price against, default "usd"' },
      },
    },
  },
  {
    name: 'get_signup_requirements',
    description: "Get what identity credential or business document is needed to sign up on VTG Africa for a given country and role (buyer/supplier/bank), including realistic, verified guidance on how to obtain or check it (USSD codes are only given where a real, current one exists — most countries require an in-person visit, and that is stated honestly rather than invented).",
    input_schema: {
      type: 'object',
      properties: {
        country: { type: 'string', description: 'Country name, e.g. Nigeria, Ghana, Kenya, South Africa, Ethiopia' },
        role: { type: 'string', enum: ['buyer', 'supplier', 'bank'] },
      },
    },
  },
];

const TOOL_IMPL = {
  get_my_orders: toolGetMyOrders,
  get_shipment_status: toolGetShipmentStatus,
  get_wallet_balance: toolGetWalletBalance,
  get_lc_status: toolGetLcStatus,
  get_pending_actions: toolGetPendingActions,
  get_exchange_rates: toolGetExchangeRates,
  get_crypto_prices: toolGetCryptoPrices,
  get_signup_requirements: toolGetSignupRequirements,
};

// Pre-login assistant gets a deliberately narrow tool set — no order/
// wallet/LC tools exist yet (there's no account), so there's nothing
// account-specific it could leak even in principle.
const PUBLIC_TOOL_DEFS = [
  TOOL_DEFS.find((t) => t.name === 'get_signup_requirements'),
  TOOL_DEFS.find((t) => t.name === 'get_exchange_rates'),
  TOOL_DEFS.find((t) => t.name === 'get_crypto_prices'),
];
const PUBLIC_TOOL_IMPL = {
  get_signup_requirements: toolGetSignupRequirements,
  get_exchange_rates: toolGetExchangeRates,
  get_crypto_prices: toolGetCryptoPrices,
};

function systemPromptFor(ctx) {
  const roleContext = {
    buyer: 'This user is a BUYER importing goods from China into Africa via VTG Africa.',
    supplier: 'This user is a SUPPLIER (manufacturer/exporter in China) selling to African buyers via VTG Africa.',
    bank: 'This user is a BANK OFFICER handling Letters of Credit, SWIFT payments, and compliance for VTG Africa trade.',
  }[ctx.role] || '';

  return `You are the VTG Africa Trade Assistant, built into a real Africa-China trade finance and logistics platform (letters of credit, escrow, wire transfer, crypto, forex, shipment tracking).

${roleContext} The user's name is ${ctx.fullName}.

You have tools to look up this user's REAL orders, shipments, wallet balance, Letters of Credit, and pending responsibilities. Always use a tool rather than guessing or making up figures, statuses, or tracking details — if a tool returns no data or an error, say so plainly rather than inventing an answer.

You also have:
- get_signup_requirements for what identity credential/document is needed to sign up per country and role, and how to actually obtain or check it. Only repeat a USSD code or "instant" claim if the tool actually returned one — most countries genuinely require an in-person visit to the issuing authority, and you should say that plainly rather than invent a shortcut. If asked about a country not covered, use web search to check current information rather than guess, and tell the user to verify with the relevant official agency since procedures/fees/codes can change.
- get_exchange_rates and get_crypto_prices for LIVE currency and crypto values — always call these for any rate/price question rather than recalling a number, since these change constantly and a stale figure could cost someone real money.
- Web search, for current market news, commodity/product price trends, supplier or industry developments, and general current-events context relevant to trade. Use it when someone asks about "the market," news, or how a product category is trending, and cite what you found in plain language (e.g. "Reuters reported this week that..."). Don't use it for anything you already have a precise tool for (exchange rates, crypto prices, this user's own account data) — those tools are more accurate for their specific purpose than a search result would be.

Be concise, direct, and professional — this is a business tool, not a casual chatbot. When giving shipment updates, lead with the most useful fact (location, ETA, % complete). When asked about duties/reminders, list them clearly. When giving rates or prices, state the as-of date/time since they're time-sensitive. If asked something outside your tools or platform knowledge (e.g. general trade finance questions, Incoterms, HS codes), answer from your own knowledge, clearly noting when you're speaking generally rather than about their specific account.`;
}

function systemPromptForPublic(country, role) {
  const countryHint = country ? `The visitor mentioned country: ${country}.` : 'The visitor has not yet specified a country.';
  const roleHint = role && role !== 'guest' ? `The visitor is asking from the perspective of a ${role}.` : 'The visitor has not yet specified a role.';

  return `You are the VTG Africa Trade Assistant, appearing on the public landing and sign-in pages of a real Africa-China trade finance and logistics platform (letters of credit, escrow, wire transfer, crypto, forex, shipment tracking) — before anyone has logged in.

Nobody is authenticated yet, so you have no access to any account, order, wallet, or shipment data — you cannot look any of that up, and you should say so plainly if asked, rather than pretend. Your job here is narrower and specific:

1. Explain what VTG Africa is and how the three portals (Buyer/Supplier/Bank) work, in plain language.
2. Guide a prospective user through the sign-up and login journey for their role and country.
3. If they ask how to navigate the website, tell them the basic path: choose the right portal, go to the sign-in or sign-up form, and use the role-specific instructions shown on the page. Keep it practical and friction-free.
4. Use get_signup_requirements to tell them exactly what identity credential or business document their specific country's signup will ask for, and how to obtain or check it. The credential should be tailored to the country they give you, and the USSD code should only be provided when the tool explicitly returns one — today that is only Nigeria's BVN. For every other country, be upfront that the process requires visiting the official government office or enrollment center in person — never invent a USSD shortcut that doesn't exist.
5. Use get_exchange_rates / get_crypto_prices / web search for general current-events questions people might ask before signing up (today's rates, platform-relevant news).

${countryHint}
${roleHint}

Be warm but efficient — someone on this screen is deciding whether to sign up, so remove friction, don't create it. Prefer a short, direct answer, then offer the next step. If you do not know something and cannot look it up, say so directly and suggest they proceed to the relevant sign-up form, where support can help further.`;
}

function normalizeCountryName(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Nigeria';
  const map = {
    nigeria: 'Nigeria',
    ghana: 'Ghana',
    kenya: 'Kenya',
    'south africa': 'South Africa',
    ethiopia: 'Ethiopia',
    china: 'China',
    uae: 'UAE',
    'united arab emirates': 'UAE',
    singapore: 'Singapore',
  };
  return map[raw.toLowerCase()] || raw;
}

function normalizeRoleName(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'supplier') return 'supplier';
  if (raw === 'bank') return 'bank';
  return 'buyer';
}

function getFallbackRequirements(country, role) {
  const normalizedCountry = normalizeCountryName(country);
  const normalizedRole = normalizeRoleName(role);

  if (normalizedRole === 'supplier') return SUPPLIER_REQUIREMENTS;
  if (normalizedRole === 'bank') return BANK_REQUIREMENTS;

  return SIGNUP_REQUIREMENTS[normalizedCountry] || SIGNUP_REQUIREMENTS.default;
}

/**
 * Shared tool-use loop against Claude — used by both the authenticated
 * assistant and the pre-login public assistant, just with different tool
 * sets, tool implementations, and system prompts.
 */
function buildFallbackReply({ systemPrompt, ctx, history }) {
  const lastUser = history.slice().reverse().find((m) => m.role === 'user');
  const msg = (lastUser?.content || '').toLowerCase();
  const country = normalizeCountryName(ctx?.country || 'Nigeria');
  const role = normalizeRoleName(ctx?.role || 'buyer');
  const roleLabel = role === 'supplier' ? 'supplier' : role === 'bank' ? 'bank' : 'buyer';
  const countryLabel = country === 'South Africa' ? 'South Africa' : country;
  const requirements = getFallbackRequirements(country, role);

  if (/sign in|signin|login|password|email/i.test(msg)) {
    const credential = requirements.buyer_credential || requirements.credential || 'your government-issued ID or business licence';
    return `If you’re trying to sign in, use the email and password you registered with. If you don’t have an account yet, choose the correct portal first and create one. For a ${roleLabel} in ${countryLabel}, the signup step will usually ask for ${credential}.`;
  }

  if (/bvn|sign up|signup|register|credential|document|need/i.test(msg)) {
    const credential = requirements.buyer_credential || requirements.credential || 'a government-issued ID or business licence';
    const guidance = requirements.how_to_get_it || 'Please confirm the official registration path for your country.';
    return `For a ${roleLabel} in ${countryLabel}, I’d focus on ${credential}. ${guidance}`;
  }
  if (/rate|exchange|usd|ngn|cny|forex|crypto|bitcoin|usdt/.test(msg)) {
    return `I can help you compare the trade payment options for ${countryLabel}, but I’m running in a built-in fallback mode right now, so I’m not pulling live FX or crypto numbers. If you need a rate or price, I’d suggest checking the live rate page or the banking/payment step in the workflow.`;
  }
  if (/how|vtg|portal|login/.test(msg)) {
    return `VTG Africa connects African buyers and Chinese suppliers with a bank-backed workflow for orders, letters of credit, escrow, and shipment tracking. If you’re trying to get started, choose the right portal first and then use the sign-in or sign-up form for that role.`;
  }
  return `I can help you navigate the sign-up path for ${countryLabel} and the ${roleLabel} portal, but I’m currently running in a built-in fallback mode rather than live Claude mode. If you want, I can still guide you through the next step in the signup flow.`;
}

async function runChat({ systemPrompt, toolDefs, toolImpl, ctx, history }) {
  const anthropic = getClient();
  if (!anthropic) {
    return { reply: buildFallbackReply({ systemPrompt, ctx, history }), toolsUsed: [] };
  }
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  const tools = [...toolDefs, { type: 'web_search_20250305', name: 'web_search', max_uses: 4 }];

  let loopGuard = 0;
  while (loopGuard++ < 6) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1280,
      system: systemPrompt,
      tools,
      messages,
    });

    // Only OUR custom tools need a manual execute-and-respond round trip;
    // web_search is a server-side tool Anthropic resolves within the same
    // response, so it never shows up here as a bare 'tool_use' block.
    const toolUses = response.content.filter((b) => b.type === 'tool_use' && toolImpl[b.name]);
    if (toolUses.length === 0) {
      const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      return { reply: text, toolsUsed: [] };
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults = [];
    const toolsUsedThisTurn = [];
    for (const toolUse of toolUses) {
      const impl = toolImpl[toolUse.name];
      let result;
      try {
        result = impl ? await impl(ctx, toolUse.input || {}) : { error: 'Unknown tool' };
      } catch (err) {
        result = { error: err.message };
      }
      toolsUsedThisTurn.push(toolUse.name);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: 'user', content: toolResults });

    if (loopGuard === 6) {
      const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      return { reply: text || 'I looked into that but need you to rephrase — could you ask again?', toolsUsed: toolsUsedThisTurn };
    }
  }
}

/**
 * Runs a full tool-use conversation turn against Claude for a LOGGED-IN user.
 * @param {{userId:string, role:string, fullName:string}} ctx
 * @param {Array<{role:'user'|'assistant', content:string}>} history
 */
async function chat(ctx, history, options = {}) {
  return runChat({ systemPrompt: systemPromptFor(ctx), toolDefs: TOOL_DEFS, toolImpl: TOOL_IMPL, ctx: { ...ctx, ...(options || {}) }, history });
}

/**
 * Runs a tool-use conversation turn for the PRE-LOGIN public assistant.
 * No user context exists yet — only the narrow, account-free tool set.
 * @param {{history:Array, country?:string, role?:string}} payload
 */
async function publicChat(payload = {}) {
  const history = Array.isArray(payload) ? payload : payload.history || [];
  const country = payload.country;
  const role = payload.role;
  return runChat({ systemPrompt: systemPromptForPublic(country, role), toolDefs: PUBLIC_TOOL_DEFS, toolImpl: PUBLIC_TOOL_IMPL, ctx: { country, role }, history });
}

module.exports = { chat, publicChat };
