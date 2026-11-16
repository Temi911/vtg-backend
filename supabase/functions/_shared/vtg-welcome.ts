// Content of the account-opened e-mail. Pure functions (no network) so they can be unit tested.
export type WelcomeInput = {
  role: string;            // buyer | supplier | bank | agent | admin
  fullName?: string | null;
  email?: string | null;
  userId?: string | null;  // VTG user ID such as VTG-100001
  openedAt?: string | null; // ISO timestamp
};

const ROLE_LABEL: Record<string, string> = {
  buyer: "Buyer", supplier: "Supplier", bank: "Bank / financial institution", agent: "Inspection agent", admin: "Administrator",
};

const NEXT_STEPS: Record<string, string[]> = {
  buyer: [
    "Complete your company profile and verification so suppliers and banks can trust your requests.",
    "Browse the marketplace or post a request for quotation (RFQ) to receive supplier quotes.",
    "Follow your shipments on the Trade Atlas, with the route and vessel tracking.",
    "Ask VTG AI about your orders, documents and next steps.",
    "Message suppliers, banks and inspection agents securely from your dashboard.",
  ],
  supplier: [
    "Complete your company profile and upload your verification documents.",
    "Add your products with specifications, minimum order quantity and price.",
    "Review buyer requests in the Shared Trade Desk and send structured quotations.",
    "Keep order milestones, documents and shipments up to date for your buyers.",
  ],
  bank: [
    "Complete your institution profile and verification documents.",
    "Review the trade finance and letter-of-credit requests assigned to you.",
    "Monitor the shipments and documents behind each transaction.",
  ],
};

export function formatOpenedDate(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function userIdSentence(userId?: string | null): string {
  return userId
    ? "Your VTG User ID is " + userId + ". It is also shown in your dashboard. Please keep it and quote it whenever you contact VTG support."
    : "";
}

export function buildWelcomeEmail(input: WelcomeInput) {
  const role = ROLE_LABEL[input.role] ? input.role : "buyer";
  const label = ROLE_LABEL[role];
  const name = (input.fullName || "").trim() || "there";
  const steps = NEXT_STEPS[role] || NEXT_STEPS.buyer;
  const date = formatOpenedDate(input.openedAt);
  const lines = [
    "Dear " + name + ",",
    "",
    "Welcome to Vintage Trade Global. Your " + label.toLowerCase() + " account is now open and ready to use.",
    "",
    "Your account details",
    "• Account type: " + label,
    ...(input.email ? ["• Registered email: " + input.email] : []),
    ...(date ? ["• Account opened: " + date] : []),
    "",
    ...(input.userId ? [userIdSentence(input.userId), ""] : []),
    "Getting started",
    ...steps.map((s, i) => (i + 1) + ". " + s),
    "",
    "Security reminder: VTG will never ask for your password, one-time codes or card details by email. If you did not open this account, please contact VTG support straight away.",
  ];
  const rich = {
    greeting: "Dear " + name + ",",
    intro: "Welcome to Vintage Trade Global. Your " + label.toLowerCase() + " account is now open and ready to use.",
    detailsTitle: "Your account details",
    details: [["Account type", label] as [string, string], ...(input.email ? [["Registered email", input.email] as [string, string]] : []), ...(date ? [["Account opened", date] as [string, string]] : [])],
    stepsTitle: "Getting started",
    steps,
    note: "Security reminder: VTG will never ask for your password, one-time codes or card details by email. If you did not open this account, please contact VTG support straight away.",
  };
  return {
    rich,
    subject: input.userId ? "Welcome to VTG — your account is open (" + input.userId + ")" : "Welcome to VTG — your account is open",
    heading: "Your VTG account is open",
    body: lines.join("\n"),
    highlight: input.userId ? { label: "Your VTG User ID", value: input.userId } : undefined,
  };
}
