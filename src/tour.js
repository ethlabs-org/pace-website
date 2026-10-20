// The tutorial's script: sections of steps that the visitor does with their own clicks (Tour.jsx runs it, Intro.jsx
// draws the full-screen pages).
//
// The tutorial is for two kinds of reader. People who use an EOA today should come away knowing how this account
// differs from it, what they keep, and why they should care. The people who would build it (wallet teams, app
// developers, hardware wallet makers, chains, client teams, security services) should come away knowing why every
// wallet has to ship the same account, and that it runs natively on Ethereum. Nobody is assumed to know the problem
// space, so every feature says what happens today before the visitor tries what changes.
//
// It follows the site's landing page. Three slides (SLIDES) open it: today's EOA, the new account's list of keys, and
// why every wallet has to ship the same one. The welcome then lists the sections, each with today's problem and what
// the visitor will try. Before you start goes through the stage one thing at a time (Tidepool, Framescan, Keel, then
// the Anchor, a mock hardware wallet holding the visitor's EOA key); nothing is set up before the first section sets
// it up. Then come the sections: the landing's five themes, with its names and in its order, then the two things the
// landing explains around them:
//   keys       Post-Quantum Ready: an EOA on the Anchor is imported and upgraded in place with one signature, then gets
//              a quantum-safe admin key Keel makes (not live yet) and a Face ID key with a co-signer and a spending
//              limit, each from a choice of providers
//   security   Unprecedented Security: a scam address Safenet refuses, a send over the phone key's daily limit, a
//              capped app permission (a Tidepool Pro subscription), then transaction assertions point by point: Keel
//              simulates a claim, encodes the result, puts it in the transaction, the Anchor reads it, and the chain
//              undoes the claim when the hacked app takes more
//   readable   Hardware Wallet Readability: the hex a device shows today, the same steps in words, a computed amount
//   private    Native Privacy: a private balance, a private send and what an outsider sees of it, private receiving
//   ux         State-of-the-art UX: many steps in one approval, the fee in USDC, two networks in one signature
//   keep       Portability: the account opens in another wallet with Face ID and reads the same
//   native     Infrastructure: sent straight to Ethereum, the same account on EIP-8130 L2s, ERC-4337 elsewhere
// Post-Quantum Ready starts from the visitor's EOA on the Anchor and sets the account up. Every later section starts
// again from an account set up like that (the phone checked by Safenet and capped, the Anchor, a backup key), except
// Infrastructure, which starts after the deposit State-of-the-art UX made. Each section's page says what it starts
// from.
//
// Every feature runs the same loop, so the visitor always knows what is what and why it matters:
//   today   the feature's first prompt carries a brief: what happens today, in one concrete line
//   try     and what the visitor is about to do
//   do      each prompt says what to press, with a hint on what the click is for when that isn't obvious
//   see     the card opens with the result on screen, pointed at
//   got     the card's head is what the visitor got; the explanation gives the mechanism in a sentence
// A section's last card adds what the visitor did in it, and one line on why it needs every wallet to ship the same
// account.
//
// The copy follows the site's rules: the reader's outcome first, plain words, and the standard is "the new account"
// or the New Ethereum Account Standard, never "smart account" or account abstraction. The seed phrase is words; keys
// come from it. The set-up account's phrase makes its backup key (recovery only). In Post-Quantum Ready the EOA's key is
// on the Anchor and keeps full access after the upgrade, and the quantum-safe key is one Keel makes.
//
// There is one way through. The sections run in this order, each step asks for one thing, and the mockup takes clicks
// only on the ringed element (the lock in Tour.jsx).
//
// A section is { id, title, icon, toc, intro, start, recap, why, aliases?, steps }.
//   title    the talking point, the landing's name for it: the largest line on the section's page and in the stage's
//            tag, and the name in the welcome's list and the strip
//   icon     the section's icon, in the welcome's contents and over its page's title (icons.jsx)
//   toc      the welcome's row for it: { today, try }, today's problem and what the visitor will try, a line each
//   intro    the section's page: the headline (one *word* in the accent colour), `today` (how it goes with an EOA
//            today, one or two short sentences, under the label `was` when it is about something else), `gets`,
//            the benefits as [name, line, icon] (icons.jsx), `from`, what the section starts from when it isn't
//            the set-up account, and `small`, a note under the figure
//   start    a patch on initialState(): every section starts the mockup over from it
//   recap    what the visitor did in the section, a few words each, on its closing card
//   why      why the section's features need every wallet to ship the same account, one or two sentences, on its
//            closing card
// A section with a recap ends on a closing card of its own (`wrap`, added below the list): the section's statement
// again as its head, then the recap and the why. It is a card to read, beside the device the section ended on.
//   aliases  old chapter ids that now open this section (the docs linked to them)
//
// A step is:
//   prompt   what to do: one action in one short line. "Click" in Tidepool and Framescan, "Tap" on the phone, "Press"
//            on the Anchor. It can be a function of the store (the Anchor's page count).
//   hint     what the click is for, in small type under the prompt, when the prompt doesn't say it
//   target   the one thing to press: a selector, { at, has?, value?, note?, say? }, or a function of the store that
//            returns one. `value` is what the field must take (the lock lets only those keys in, and "Do it for me"
//            types it). `say` overrides the prompt while that candidate is ringed.
//   done     (s, prev, acts) => true once the visitor has done it. A level check on the store, true from then on.
//   seen     instead of `done`: a selector that matches once it is done, for results the store can't see (a menu that
//            opened, a field that filled in)
//   wait     (s) => true once the mockup has finished what the visitor started (Face ID, a co-signer, the network);
//            until then the stage shows `waiting`.
//   quiet    no card: the step only gets the visitor somewhere (Back, a menu, Next on the Anchor), and the next step
//            begins as soon as it is done
//   head     the card's headline: what this got the visitor, or their users (at most about 60 characters)
//   explain  how it works, in one or two short sentences
//   eips     the standards the step shows, in small type on the card
//   docs     { page, hash, label }: the docs section with the technical detail (site/src/pages/docs/<page>.mdx)
//   dev      the device the box points into: 'app' (Tidepool or Framescan, left of the tutorial's column), 'hw' (the
//            Anchor under it), or 'phone' (right of the column)
//   at       what the card's arrow points at ({ at, has? }); it is scrolled into view, and without it, or when it is
//            gone, the arrow points at `dev`
//   points   short notes drawn with the card: { at, has?, text }
//   topic    the feature the step starts, for the tag at the top of the tutorial's column: { name, line, eips }. The
//            steps after it show the same topic until the next step that names one.
//   brief    on a step with a topic: { today, try }, shown with the feature's prompts until its first card
//   seq      on a card: { list, at }, a short numbered list of how the feature works, with this card's point marked
//   setup    a patch on the section's start that rebuilds this step on its own (for deep links)
//   local    the step begins from screen state the store doesn't keep (an open menu, a half-filled form), so Back
//            can't rebuild it and goes to the step before instead
// A step with no `done` or `seen` is a step to read.
//
// Claims stay inside the ERC draft (erc-xxxx.md in the ethereum-portable-account-standard repo) and the docs. Where the mockup shows something the draft
// leaves open (who pays a fee, the hacked rewards contract), the card says "In the mockup", at the end, never first.
import { KEYS_MAIN, KEYS_SUB, TX_BATCH, TX_HISTORY, ANCHOR_EOA_KEY } from './data.js';
import { buildPages } from './wallet/hwSpec.js';

const K = '.scr.k > .body';   // a Keel screen
const S = '.scr.k .sheet';    // a Keel sheet
const T = '.browser .t';      // Tidepool
const F = '.browser .f';      // Framescan
const L = '.scr.l';           // Lantern
const SHEET = { at: S };

// Starting points: the account in Keel, and Tidepool open on one of its pages.
// No section uses the sample Orbit grant, so the account starts without it: the tour never explains Orbit.
const W = { skin: 'keel', onboarded: true, accountId: 'main', settingsPage: null, sessions: [] };
const TP = (dappPage, x = {}) => ({ ...W, screen: 'home', browserTab: 'tidepool', dappPage, signedIn: true, ...x });
// Where the tour begins: Keel opened for the first time, and the Anchor connected with the visitor's EOA key on it.
// Before you start and Post-Quantum Ready both start here; nothing is set up until the visitor does it.
const EOA_START = { ...W, onboarded: false, welcomeFlow: null, screen: 'home', signer: ANCHOR_EOA_KEY.id, keys: { main: [ANCHOR_EOA_KEY], sub: KEYS_SUB }, browserTab: 'tidepool', dappPage: 'vault' };

const simDone = s => !!s.sim && s.sim.phase === 'done';
const applied = kind => s => !!s.flow && s.flow.kind === kind && s.flow.phase !== 'rejected';
const ui = s => (s.sheet && s.sheet.ui) || {};
const sheetIs = kind => s => !!s.sheet && s.sheet.kind === kind;
// Signing this sheet has started (Face ID, a co-signer), or the Anchor is reviewing it.
const signing = kind => s => !!s.sig && sheetIs(kind)(s);
const reviewing = kind => s => !!(s.hw && s.hw.active) && sheetIs(kind)(s);
const q = step => ({ ...step, quiet: true });

// The Anchor, one key at a time. The phone hands the approval over ("Review on Anchor"), Next pages through what it
// signs, and Approve signs it. Each is its own step.
const pageOf = s => (s.hw && s.hw.page) || 0;
const pagesOf = s => (s.hw && s.hw.active && s.sheet ? buildPages(s.sheet.kind, s.sheet, s).length : 0);
const onReview = (kind, x = {}) => ({ id: 'anchor', prompt: 'Tap Review on Anchor.', target: '#btn-approve', done: reviewing(kind), dev: 'hw', ...x });
// Next until page `to` (the last one unless given). One step: the prompt counts the pages as the visitor goes.
const onNext = (kind, x = {}, to = s => pagesOf(s) - 1) => ({
  id: 'next', prompt: s => `Press Next on the Anchor. Page ${pageOf(s) + 1} of ${pagesOf(s)}.`, target: '#hw-next',
  done: s => reviewing(kind)(s) && pageOf(s) >= to(s), dev: 'hw', ...x,
});
const onApprove = (x = {}) => ({ id: 'sign', prompt: 'Press Approve on the Anchor.', target: '#hw-approve', dev: 'hw', ...x });
// The last two pages of every review are the transaction assertions and Approve.
const checksPage = s => pagesOf(s) - 2;

// How transaction assertions work, in the order the visitor sees it happen. Each card in that feature shows the list
// with its own point marked (`seq`), so the reader always knows which part they are looking at.
const ASSERTIONS = [
  'Keel simulates the claim',
  'Keel encodes assertions',
  'They go in the transaction',
  'The Anchor reads them',
  'The Anchor is the backstop',
];
const seq = at => ({ list: ASSERTIONS, at });

// The page after the slides: what the tour is, and its sections in order, each with today's problem and what to try.
export const WELCOME = {
  head: 'Try what the new account does *better*.',
  line: 'A note says what happens today and what to try. A red ring shows what to press. A card explains what you got.',
  reset: 'You start from an EOA. Each section’s page says what it starts from.',
  start: 'Start the tour',
};

// The overview: the slides the mockup opens on, before the welcome. They follow the landing's opening: what your
// account is today, what the new account changes, and why every wallet has to ship the same one. Each slide has one
// thing to press (Next), plus Back after the first.
//   id       its address: #overview/<id>
//   name     its short name, over the headline and in the foot's progress
//   figure   a drawing under the headline: 'eoa' (seed phrase → private key → address), 'keys' (one address and its
//            list of keys) or 'gap' (every wallet's own account against one shared account)
//   head     the headline, with one *word* in the hand
//   lines    up to two short lines under the headline
//   small    the small print: what the headline's claim rests on, and its limits
export const SLIDES = [
  {
    id: 'today', name: 'Your account today', figure: 'eoa',
    head: 'Today your account *is* one key.',
    lines: ['Most people use an EOA, an externally owned account. One private key controls the address, and your seed phrase is the words that key comes from. Whoever has that key has everything.'],
  },
  {
    id: 'account', name: 'The new account', figure: 'keys',
    head: 'After Hegotá, your address can hold a *list* of keys.',
    lines: ['Hegotá is the Ethereum upgrade that brings the new account. You add and remove keys, and the money never moves. When quantum computers break today’s keys, you add a quantum-safe one and keep your address.'],
    small: 'The new account needs EIP-8141, scheduled for Hegotá. An EOA keeps its address when it upgrades. A recovery-only backup key is the mockup’s design; the draft doesn’t define one yet.',
  },
  {
    id: 'standard', name: 'Why a standard', figure: 'gap',
    head: 'Every wallet has to ship the *same* account.',
    lines: ['Each wallet decides how it stores keys, limits and recovery. If each does it differently, every app, hardware wallet and explorer has to support each version, and users get stuck wherever one can’t. That happened with ERC-4337.'],
  },
];

// The last page, after the last section. The headline is the landing page's closer.
export const CLOSING = {
  head: 'Help build it *before Hegotá*.',
  lines: [
    'One account for the whole EVM only works if the teams behind wallets, apps, explorers, clients, L2s, hardware wallets and security services agree on it before Hegotá, the Ethereum upgrade that brings EIP-8141.',
    'Tell us which flow breaks for you. The draft is meant to change.',
  ],
};

export const CHAPTERS = [
  {
    id: 'start', title: 'Before you start', start: EOA_START,
    // What a newcomer needs before the first section: each thing on screen in turn (Tidepool, Framescan, Keel, the
    // Anchor), what kind of thing it is and what it has of theirs. Nothing is set up yet: the first section does that.
    steps: [
      { id: 'intro', topic: { name: 'Tidepool', line: 'A mock app', eips: [] },
        head: 'Tidepool is a mock app, and your EOA is connected to it.',
        explain: 'An app is a website for doing something with your money. Tidepool is for earning on it. It can’t move your money: it asks your wallet, and nothing moves until you approve.',
        docs: { page: 'what-has-to-change', hash: '', label: 'What we need to do' }, dev: 'app', at: { at: `${T} .pill`, has: '0x8C4e' } },
      { id: 'framescan', topic: { name: 'Framescan', line: 'A mock explorer', eips: [] },
        head: 'Framescan is a mock explorer, and anyone can read it.',
        explain: 'An explorer is a website that shows what happened on the chain: accounts, balances and transactions. Its tab sits next to Tidepool’s. What it shows is what anyone can see about you.',
        dev: 'app', at: { at: '.browser .tab', has: 'framescan' } },
      { id: 'keel', topic: { name: 'Keel', line: 'A mock wallet', eips: [] },
        head: 'Keel is a mock wallet, and it’s open for the first time.',
        explain: 'A wallet keeps track of your accounts and keys, and asks you before anything is signed. Keel doesn’t have your account yet. The first section brings it in.',
        dev: 'phone', at: { at: '.scr.k .h1' } },
      { id: 'anchor', topic: { name: 'The Anchor', line: 'A mock hardware wallet', eips: [] },
        head: 'The Anchor is a mock hardware wallet, and your EOA’s key is on it.',
        explain: 'A hardware wallet is a small device that keeps a key away from your phone and computer, and shows what you sign on its own screen. Its screen lights up when it has something to sign, and its four buttons are how you answer.',
        dev: 'hw', at: { at: '.hw' },
        docs: { page: 'readable-signing', hash: 'on-a-hardware-wallet', label: 'How a hardware wallet reads a transaction' } },
    ],
  },

  {
    id: 'keys', aliases: ['create', 'pq-key', 'upgrade'], title: 'Post-Quantum Ready', icon: 'lock',
    toc: { today: 'An EOA can’t change its key, and quantum computers are expected to break it.', try: 'Upgrade an EOA, then add a quantum-safe key and Face ID.' },
    // Keel before the account exists in it, with the Anchor connected: the visitor's EOA lives on the Anchor. Keel
    // imports it, the Anchor signs the upgrade, then the Anchor (the only key with full access) approves two new keys.
    start: EOA_START,
    intro: {
      head: 'Keep your EOA’s address and *change* its keys.',
      from: 'This section starts from your EOA, whose key is on the Anchor.',
      today: 'An EOA has one key for life. Once quantum computers can break it, the only way out is a new address and moving everything.',
      gets: [
        ['Keep your address', 'One signature upgrades your EOA in place. The money and history stay.', 'hash'],
        ['Quantum-safe keys', 'Add a quantum-safe admin key now. It works once quantum-safe checks fit.', 'lock'],
        ['Everyday keys', 'Face ID, checked by the co-signer you pick and under a spending limit.', 'face'],
      ],
    },
    recap: ['Upgraded an EOA with one signature, keeping its address', 'Added a quantum-safe admin key', 'Added Face ID with a co-signer and a spending limit'],
    why: 'Another wallet, device or explorer can read these keys only if every wallet stores them the same way. With one standard, they all read the key list as Keel wrote it.',
    steps: [
      // Bring the EOA: Keel asks to connect and the Anchor shows the request, Keel lists the accounts on the device,
      // the visitor picks the first, and the Anchor signs its upgrade.
      q({ id: 'connect', topic: { name: 'Keep your address', line: 'An EOA upgrades in place', eips: ['EIP-7702', 'EIP-8130'] },
        brief: { today: 'An EOA’s one key can never change. Moving to a new kind of account usually means a new address and moving everything.', try: 'Bring the EOA on your Anchor into Keel and upgrade it in place.' },
        prompt: 'Tap Connect a hardware wallet.', target: '#btn-connect-hw', done: reviewing('connect'), dev: 'phone' }),
      q({ id: 'link', prompt: 'Press Approve on the Anchor to connect it.', hint: 'Keel asked to see the accounts on the device.', target: '#hw-approve',
        done: s => !!s.hwLinked, dev: 'hw' }),
      { id: 'import', prompt: 'Tap Account 1, your EOA.', hint: 'Keel lists the accounts on the Anchor with their balances.', target: '#hw-acct-0',
        done: s => s.welcomeFlow === 'hwUpgrade',
        head: 'Keel found your EOA on the Anchor.',
        explain: 'Same address, $12,480 and 214 payments. Today one key controls all of it, and that key can never change. It has no spending limit, no co-signer and no backup.',
        eips: ['EIP-7702'], dev: 'phone', at: { at: `${K} .card`, has: 'today' },
        docs: { page: 'account-model', hash: 'upgrading-an-eoa', label: 'How an EOA upgrades' } },
      q({ id: 'upgrade', prompt: 'Tap Upgrade with your Anchor.', hint: 'The Anchor signs the upgrade, since it holds the key.', target: '#btn-hw-upgrade', done: reviewing('upgrade'), dev: 'phone' }),
      q(onNext('upgrade', { hint: 'Read what the upgrade does.' })),
      onApprove({ id: 'upgraded',
        done: s => s.onboarded,
        head: 'Your EOA is the new account now. The address and the $12,480 stayed.',
        explain: 'The Anchor signed one EIP-7702 upgrade: the address now runs shared account code, and the Anchor’s key is its first key, with full access. Nothing moved.',
        eips: ['EIP-7702', 'EIP-8130'], dev: 'phone', at: { at: '.scr.k .addr' },
        docs: { page: 'account-model', hash: 'upgrading-an-eoa', label: 'How an EOA upgrades' } }),
      // A quantum-safe admin key that Keel makes: added now, live once quantum-safe checks fit a transaction's gas.
      q({ id: 'keys', topic: { name: 'Quantum-safe keys', line: 'A key quantum computers can’t break', eips: ['EIP-8130'] },
        brief: { today: 'The Anchor’s key uses ECDSA, which quantum computers are expected to break.', try: 'Add a quantum-safe key with full access, made by Keel.' },
        prompt: 'Tap Keys.', target: '#nav-keys', done: s => s.screen === 'keys', dev: 'phone' }),
      q({ id: 'add', prompt: 'Tap Add a device or key.', target: '#btn-add-key', done: sheetIs('addKey'), dev: 'phone' }),
      q({ id: 'quantum', prompt: 'Tap Quantum-safe key.', target: '#type-quantum', done: s => ui(s).type === 'quantum', dev: 'phone' }),
      q({ id: 'continue', prompt: 'Tap Continue.', target: '#btn-key-type-continue', done: s => ui(s).type === 'quantum' && ui(s).step === 2, dev: 'phone' }),
      { id: 'ready',
        head: 'Not live yet, and the account is ready for it.',
        explain: 'Checking a quantum-safe signature costs more gas than a transaction may spend on signature checks today, so this key can’t sign yet. The account takes it now, with full access, and it starts working as soon as such a check fits.',
        eips: ['EIP-8130'], dev: 'phone', at: { at: '#pq-note' },
        docs: { page: 'post-quantum', hash: 'the-scheme', label: 'The scheme and its gas cost' } },
      q({ id: 'review', prompt: 'Tap Continue.', hint: 'Keel simulates the change before you sign it.', target: '#btn-key-continue', done: s => ui(s).step === 5, wait: simDone, waiting: 'Keel simulates the change first.', dev: 'phone' }),
      q(onReview('addKey', { hint: 'Only a key with full access, here the Anchor, can change the key list.' })),
      q(onNext('addKey')),
      onApprove({ id: 'pq-added',
        done: s => s.keys.main.some(k => k.pq),
        head: 'The account now has a quantum-safe admin key.',
        explain: 'The Anchor signed once, and the key was added on all four networks. Once quantum-safe checks fit, you remove the Anchor’s old key and the account is quantum-safe, at the same address.',
        eips: ['EIP-8130'], dev: 'phone', at: { at: `${K} .keycard`, has: 'quantum' },
        docs: { page: 'post-quantum', hash: 'retire-the-classical-rows', label: 'Retiring the old keys' } }),
      // An everyday Face ID key: a co-signer the visitor picks from several, and a spending limit priced by the source
      // they pick.
      q({ id: 'add-face', topic: { name: 'Everyday keys', line: 'Face ID with a co-signer and a limit', eips: ['EIP-8130'] },
        brief: { today: 'With an EOA, the one key you use every day can also empty the account.', try: 'Add Face ID for every day, checked by a co-signer and under a spending limit.' },
        prompt: 'Tap Add a device or key.', target: '#btn-add-key', done: s => sheetIs('addKey')(s) && ui(s).type === 'passkey', dev: 'phone' }),
      q({ id: 'face', prompt: 'Tap Continue.', hint: 'Face ID on this phone is already picked.', target: '#btn-key-type-continue', done: s => ui(s).type === 'passkey' && ui(s).step === 2, dev: 'phone' }),
      q({ id: 'protect', prompt: 'Tap Protected by a co-signer.', target: '#flag-protect', done: s => !!ui(s).protect, dev: 'phone' }),
      { id: 'cosigner', prompt: 'Tap Blockaid.', hint: 'Safenet is picked first. Any of them works.', target: '#provider-blockaid',
        done: s => ui(s).provider === 'blockaid',
        head: 'You choose who co-signs.',
        explain: 'Safenet is a network of validators. Blockaid and Hypernative are companies. Whichever you pick checks everything this key signs and can refuse it. None of them can send on its own.',
        eips: ['EIP-8130'], dev: 'phone', at: { at: '#provider-blockaid' },
        docs: { page: 'transaction-security', hash: 'which-service-co-signs', label: 'Which service co-signs' } },
      q({ id: 'limit', prompt: 'Tap Limit what it can spend.', target: '#flag-limit', done: s => !!ui(s).limitOn, dev: 'phone' }),
      { id: 'prices', prompt: 'Tap Uniswap.', hint: 'Chainlink is picked first. Either works.', target: '#oracle-uniswap',
        done: s => ui(s).oracle === 'uniswap',
        head: 'You choose where the limit gets its prices.',
        explain: 'The caps are in dollars, so the limit contract needs prices: Chainlink’s price feeds, or Uniswap’s prices from its pools on chain. The caps start at $1,000 a day, $5,000 a week and $15,000 a month.',
        eips: ['EIP-8130'], dev: 'phone', at: { at: '#oracle-pick' },
        docs: { page: 'extensions', hash: 'spending-limits', label: 'How spending limits work' } },
      q({ id: 'review-face', prompt: 'Tap Continue.', target: '#btn-key-continue', done: s => ui(s).step === 5, wait: simDone, waiting: 'Keel simulates the change first.', dev: 'phone' }),
      q(onReview('addKey', { id: 'anchor-face', hint: 'The Anchor approves the new key.' })),
      q(onNext('addKey', { id: 'next-face' })),
      onApprove({ id: 'face-added',
        done: s => s.keys.main.some(k => k.set && k.set.provider === 'blockaid'),
        head: 'Face ID now pays every day, checked by Blockaid and capped.',
        explain: 'Blockaid has to agree to everything this key signs, and the limit contract rejects anything over $1,000 a day at Uniswap prices. The Anchor needs neither and can still change everything.',
        eips: ['EIP-8130'], dev: 'phone', at: { at: `${K} .keycard`, has: 'Blockaid' },
        docs: { page: 'transaction-security', hash: 'override-keys', label: 'Override keys' } }),
    ],
  },

  {
    id: 'security', aliases: ['override', 'protections', 'multisig'], title: 'Unprecedented Security', icon: 'shield',
    toc: { today: 'One bad signature can empty an EOA.', try: 'Survive a hacked app, a scam address and a stolen phone.' },
    start: TP('vault', { signer: 'k7', clip: true, keys: { main: KEYS_MAIN, sub: KEYS_SUB } }),
    intro: {
      head: 'One bad signature doesn’t have to *empty* the account.',
      today: 'With an EOA, one bad signature can empty the account. Nothing checks the transaction first, and nothing caps it.',
      gets: [
        ['Screening', 'A security service can refuse a transaction before it counts.', 'shield'],
        ['Spending limits', 'A stolen phone can take no more than its daily cap.', 'coins'],
        ['App permissions', 'An app can charge you only up to the limit you allow.', 'key'],
        ['Transaction assertions', 'You approve the result. If more changes, the chain undoes it.', 'lock'],
      ],
    },
    recap: ['Saw Safenet refuse a scam address', 'Hit the phone key’s daily limit', 'Gave an app a capped permission', 'Watched assertions stop a hacked app, read on the Anchor'],
    why: 'The chain enforces the limit, the co-signer and the assertions. Each wallet still has to write them and each hardware wallet has to show them. With one standard, every wallet and device does both the same way.',
    steps: [
      // Screening: a send to an address a "support agent" pasted, which Safenet refuses to co-sign.
      q({ id: 'send', topic: { name: 'Screening', line: 'A security service checks each transaction', eips: ['EIP-8130'] },
        brief: { today: 'With an EOA, nothing checks where a payment goes. If a scammer talks you into sending, the money is gone.', try: 'A “support agent” sent you an address. Send 0.2 ETH to it.' },
        prompt: 'Tap Send.', target: '#btn-send', done: s => s.homePage === 'send', dev: 'phone' }),
      q({ id: 'to', local: true, prompt: 'Tap Pasted address.', hint: 'The address the “agent” sent you.', target: '#to-pasted', seen: '#send-to:not(:placeholder-shown)', dev: 'phone' }),
      q({ id: 'amount', local: true, prompt: 'Type 0.2.', target: { at: '#send-amount', value: '0.2', note: 'type 0.2' }, seen: '#btn-send-review:not(:disabled)', dev: 'phone' }),
      q({ id: 'review', local: true, prompt: 'Tap Review.', target: '#btn-send-review', done: sheetIs('send'), wait: simDone, waiting: 'Keel simulates the send first.', dev: 'phone' }),
      { id: 'refused', prompt: 'Tap Send with Face ID.', target: '#btn-approve',
        done: s => signing('send')(s) || !!s.screened, wait: s => !!s.screened,
        waiting: 'Face ID, then Safenet checks the send.',
        head: 'Safenet refused it. Nothing was sent.',
        explain: 'This phone key only counts when Safenet signs too. Safenet found the address on its list of drainers, addresses scammers use to empty wallets, and didn’t sign. It can only refuse: it can’t send or change your keys, and your Anchor can act without it. The list is the mockup’s.',
        eips: ['EIP-8130'], dev: 'phone', at: { at: '#send-screened' },
        docs: { page: 'transaction-security', hash: 'co-signers-and-multisigs', label: 'How a co-signer works' } },
      // Spending limits: the phone key tries to send more than its daily cap.
      q({ id: 'to-alice', local: true, topic: { name: 'Spending limits', line: 'Daily, weekly and monthly caps on a key', eips: ['EIP-8130'] },
        brief: { today: 'Whoever gets your key can take everything at once.', try: 'Send about $1,500 with the phone key. Its cap is $1,000 a day.' },
        prompt: 'Tap alice.eth.', target: '#to-alice', seen: '#send-to:not(:placeholder-shown)', dev: 'phone' }),
      q({ id: 'amount-big', local: true, prompt: 'Type 0.5.', hint: '0.5 ETH is about $1,500.', target: { at: '#send-amount', value: '0.5', note: 'type 0.5' }, seen: '#btn-send-review:not(:disabled)', dev: 'phone' }),
      { id: 'limit', local: true, prompt: 'Tap Review.', target: '#btn-send-review',
        done: sheetIs('send'), wait: simDone, waiting: 'Keel simulates the send first.',
        head: 'The daily cap stopped it. A thief with your phone can take at most $1,000 a day.',
        explain: 'A contract on chain prices each transfer and rejects anything over the key’s cap. Keel’s simulation ran into that rejection, so it won’t sign. Your Anchor has no cap and could still send it.',
        eips: ['EIP-8130'], dev: 'phone', at: { at: '#send-overlimit' },
        docs: { page: 'extensions', hash: 'spending-limits', label: 'How spending limits work' } },
      // App permissions: Tidepool Pro, a subscription. Tidepool asks for one capped permission (ERC-7715), the account
      // stores it as a Keystore row, and Tidepool charges through it without the user (ERC-7710). A second charge in the
      // same month fails before anything moves. The visitor plays Tidepool's billing to try the charges.
      q({ id: 'pro', topic: { name: 'App permissions', line: 'An app acts for you, within a limit', eips: ['ERC-7715', 'ERC-7710', 'EIP-8130'] },
        brief: { today: 'Letting an app charge you means a token approval with no monthly cap.', try: 'Subscribe to Tidepool Pro for 49.90 USDC a month.' },
        prompt: 'Click Pro in Tidepool.', target: '#dp-automation', done: s => s.dappPage === 'automation', dev: 'app' }),
      { id: 'subscribe', prompt: 'Click Subscribe.', target: '#btn-enable-session',
        done: sheetIs('session'), wait: simDone, waiting: 'Keel simulates the request first.',
        head: 'Tidepool asks for one capped permission, and none of your keys.',
        explain: 'It may take up to 49.90 USDC a month for a year, and nothing else. The permission becomes its own entry in your key list on chain, and you can remove it any time.',
        eips: ['ERC-7715', 'EIP-8130'], dev: 'phone', at: { at: `${S} .card`, has: 'asks for' },
        docs: { page: 'transaction-security', hash: 'app-permissions-with-limits', label: 'How an app asks for a permission' } },
      q({ id: 'allow', prompt: 'Tap Allow for 1 year.', target: '#btn-approve',
        done: s => signing('session')(s) || applied('session')(s), wait: s => s.sessionEnabled, waiting: 'Face ID, then Safenet checks the change.', dev: 'phone' }),
      q({ id: 'done-pro', prompt: 'Click Done in Tidepool.', target: '#btn-result-done', done: s => s.sessionEnabled && !s.flow, dev: 'app' }),
      { id: 'charge', prompt: 'Now act as Tidepool’s billing: click Charge 49.90 USDC.', target: '#btn-use-0',
        done: s => s.runs.some(r => r.ok),
        head: 'Tidepool charged 49.90 USDC, inside the cap you allowed.',
        explain: 'Tidepool’s billing account sent the charge and paid the fee. A contract on chain checked the monthly cap first. You didn’t sign anything.',
        eips: ['ERC-7710'], dev: 'app', at: { at: `${T} .run` },
        docs: { page: 'transaction-security', hash: 'redeeming-a-permission', label: 'How the app uses a permission' } },
      { id: 'refused-charge', prompt: 'As Tidepool, click Again 49.90 USDC.', target: '#btn-use-1',
        done: s => s.runs.some(r => !r.ok),
        head: 'Tidepool tried to charge twice this month. The chain said no.',
        explain: 'Nothing was left under this month’s cap, so the charge failed before anything moved. Tidepool can’t take more than you allowed.',
        eips: ['ERC-7710', 'EIP-8130'], dev: 'app', at: { at: `${T} .run.bad` },
        docs: { page: 'transaction-security', hash: 'redeeming-a-permission', label: 'How the app uses a permission' } },
      // Transaction assertions, one point per card (ASSERTIONS): Keel simulates the claim, encodes the result as
      // assertions, puts them inside the transaction, the Anchor reads them from the bytes it signs, and a hacked app
      // (here) or a hacked wallet can't get past them. The visitor switches the signing key to the Anchor for it.
      q({ id: 'vaults', topic: { name: 'Transaction assertions', line: 'You approve the result, the chain enforces it', eips: ['EIP-7906', 'EIP-8141'] },
        brief: { today: 'With an EOA you sign the call, and nothing checks what it does. If the contract does something else, your signature still counts.', try: 'Claim your 18.40 USDC of rewards and sign it on the Anchor.' },
        prompt: 'Click Vaults in Tidepool.', target: '#dp-vault', done: s => s.dappPage === 'vault', dev: 'app' }),
      q({ id: 'claim', prompt: 'Click Claim rewards.', target: '#btn-claim', done: sheetIs('claim'), wait: simDone, waiting: 'Keel simulates the claim first.', dev: 'app' }),
      { id: 'simulated', seq: seq(0),
        head: 'Keel simulated the claim before asking you.',
        explain: 'It ran the claim on a copy of the chain as it is now and saw what changes: 18.40 USDC comes in, and a small fee goes out.',
        eips: ['EIP-7906'], dev: 'phone', at: { at: `${S} .chg`, has: 'USDC' },
        docs: { page: 'transaction-security', hash: 'assertions-the-chain-enforces', label: 'Assertions the chain enforces' } },
      { id: 'encoded', seq: seq(1),
        head: 'Keel turned that result into transaction assertions.',
        explain: 'Each assertion is a rule the chain can check: at least 18.40 USDC in, at most 0.000015 ETH out, and nothing else changes. These are the lines under State changes.',
        eips: ['EIP-7906'], dev: 'phone', at: { at: `${S} .txtabs` },
        docs: { page: 'readable-signing', hash: 'nothing-else-changes', label: 'What “nothing else changes” covers' } },
      q({ id: 'key', local: true, prompt: 'Tap the key button.', hint: 'You’ll sign this claim with the Anchor, your hardware wallet.', target: '#btn-key', seen: '#signer-k2', dev: 'phone' }),
      q({ id: 'pick', local: true, prompt: 'Tap Anchor hardware wallet.', target: '#signer-k2', done: s => s.signer === 'k2', dev: 'phone' }),
      q(onReview('claim')),
      { id: 'included', seq: seq(2),
        head: 'The assertions are inside the transaction you sign.',
        explain: 'Keel added them to the claim itself, as a check that runs after everything else. The Anchor signs the claim and its assertions together, so nobody can strip them off later.',
        eips: ['EIP-7906', 'EIP-8141'], dev: 'hw', at: { at: '.hw .hw-screen' },
        docs: { page: 'transaction-security', hash: 'the-assertion-contract', label: 'Where the assertions go' } },
      q(onNext('claim', { id: 'next-checks', hint: 'Go to the page with the assertions.' }, checksPage)),
      { id: 'reads', seq: seq(3),
        head: 'The Anchor reads the assertions for itself.',
        explain: 'It decodes them from the bytes it signs, with token names from its own signed list: at least 18.40 USDC in, at most 0.000015 ETH out, nothing else. What you see here is what the chain will check.',
        eips: ['EIP-7906', 'ERC-7730'], dev: 'hw', at: { at: '.hw .hl-text', has: 'Nothing else' },
        docs: { page: 'readable-signing', hash: 'on-a-hardware-wallet', label: 'What the device reads for itself' } },
      { id: 'backstop', seq: seq(4),
        head: 'If the app or Keel is hacked, the Anchor still has the last word.',
        explain: 'A hacked app can make the claim do more, and the assertions make the chain undo it. A hacked Keel could drop the assertions or change them, and the Anchor would show that here before you approve.',
        eips: ['EIP-7906'], dev: 'hw', at: { at: '.hw .hw-screen' },
        docs: { page: 'readable-signing', hash: 'what-the-device-cannot-check', label: 'What the device can and can’t check' } },
      q(onNext('claim', { id: 'next-approve' })),
      onApprove({ id: 'undone', seq: seq(4),
        done: s => applied('claim')(s) || s.claimUndone, wait: s => s.claimUndone, waiting: 'The network runs the claim.',
        head: 'The app was hacked. The chain undid the claim, and your tpETH stayed.',
        explain: 'The rewards contract was changed after Keel’s simulation, and the claim also took your 0.3169 tpETH, your shares in Tidepool’s vault. No assertion allowed that, so the chain undid the whole claim and only the fee was paid. The hack is in the mockup.',
        eips: ['EIP-7906', 'EIP-8141'], dev: 'app', at: { at: '.tmodal .dlg' },
        docs: { page: 'transaction-security', hash: 'assertions-the-chain-enforces', label: 'What happens when a check fails' } }),
    ],
  },

  {
    id: 'readable', aliases: ['hardware'], title: 'Hardware Wallet Readability', icon: 'eye',
    toc: { today: 'Hardware wallets often show account contracts’ calls as raw hex.', try: 'Read a swap and a deposit on the Anchor, step by step.' },
    // The Anchor starts in raw mode: what a device shows when it can't read the account.
    start: TP('vault', { signer: 'k2', hwRaw: true }),
    intro: {
      head: 'Read *every* step on the device before you sign.',
      today: 'AI makes fake approval screens cheap. Hardware wallets often show account contracts’ calls as raw hex, so people approve what they can’t read.',
      gets: [
        ['Every step in words', 'The device walks through the batch one call at a time.', 'eye'],
        ['Built from what it signs', 'The device reads the bytes it signs. A hacked phone can’t change that.', 'device'],
        ['Same words everywhere', 'Each app publishes its descriptions once, for every wallet and device.', 'pen'],
      ],
    },
    recap: ['Saw the hex a device shows today', 'Read every step in words', 'Saw an amount worked out mid-transaction, in words'],
    why: 'A device can only show words for accounts it knows how to read. With one standard account, every hardware wallet can read every wallet’s transactions.',
    steps: [
      q({ id: 'deposit', topic: { name: 'Every step in words', line: 'Clear signing on the device', eips: ['ERC-7730'] },
        brief: { today: 'A hardware wallet that can’t read the account shows hex, and you approve blind.', try: 'Swap 1,000 USDC and deposit it, reading every step on the Anchor.' },
        prompt: 'Click Swap & deposit in Tidepool.', target: '#btn-deposit', done: sheetIs('batch'), wait: simDone, waiting: 'Keel tests the transaction first.', dev: 'app' }),
      q(onReview('batch', { id: 'review' })),
      { id: 'hex',
        head: 'This is what you would approve today: hex.',
        explain: 'Without a description of the contract, the device can only show the address and the raw call. You can’t tell a swap from a theft.',
        eips: ['ERC-7730'], dev: 'hw', at: { at: '.hw .hl-step' },
        docs: { page: 'readable-signing', hash: 'on-a-hardware-wallet', label: 'How a hardware wallet reads a transaction' } },
      { id: 'words', prompt: 'Press Raw on the Anchor to turn it off.', target: '#hw-raw',
        done: s => !s.hwRaw,
        head: 'Now the same transaction reads in plain words.',
        explain: 'Tidepool published a description of its contracts once (ERC-7730). The Anchor applies it to the bytes it signs, so a hacked phone or computer can’t change what it shows.',
        eips: ['ERC-7730'], dev: 'hw', at: { at: '.hw .hw-screen' },
        docs: { page: 'readable-signing', hash: 'names-from-signed-descriptors', label: 'Where the device gets its names' } },
      q(onNext('batch', { hint: 'Read the swap, then the deposit.' }, () => 2)),
      { id: 'computed', topic: { name: 'Computed values', line: 'Amounts worked out as it runs', eips: ['ERC-7730', 'ERC-8211'] },
        head: 'Even an amount worked out mid-transaction reads in words.',
        explain: 'The deposit takes whatever ETH the swap returns, so nobody knows the number in advance. The Anchor still says where it comes from: all ETH from step 2.',
        eips: ['ERC-7730', 'ERC-8211'], dev: 'hw', at: { at: '.hw .hl-step', has: 'Deposit' },
        docs: { page: 'readable-signing', hash: 'computed-values', label: 'Computed values' } },
    ],
  },

  {
    id: 'private', aliases: ['private-receive'], title: 'Native Privacy', icon: 'eyeOff',
    toc: { today: 'Every EOA payment is public and points back to you.', try: 'Pay alice.eth privately, then see what the world sees.' },
    start: { ...W, screen: 'home', signer: 'k7' },
    intro: {
      head: 'Pay without it pointing back to *you*.',
      today: 'Every EOA payment is public. Anyone who knows your address sees your balance and everyone you pay.',
      gets: [
        ['Private balance', 'Money can sit in a privacy pool on Ethereum, next to your account.', 'vault'],
        ['Private sends', 'On Ethereum, a payment leaves from a brand-new account, with no relayer.', 'send'],
        ['Private receiving', 'Each payer sends to a new address. Only you can tell those payments are yours.', 'receive'],
      ],
      small: 'Private sends need EIP-8141, scheduled for Hegotá, and EIP-8272, which is still a draft. On Base a relayer would have to send them.',
    },
    recap: ['Paid alice.eth from a brand-new account', 'Saw that nothing points back to you', 'Got a private address others can pay'],
    why: 'A private send hides among other sends that look the same. If every wallet ships the same account, one-time accounts from all wallets look alike, so each send hides among more of them.',
    steps: [
      { id: 'tab', topic: { name: 'Private balance', line: 'Money in a privacy pool', eips: [] },
        brief: { today: 'Anyone who knows your address can see your balance and every payment.', try: 'Open the account’s private balance.' },
        prompt: 'Tap Private.', target: '#nav-private',
        done: s => s.screen === 'private',
        head: 'Part of your money sits in a privacy pool.',
        explain: 'A privacy pool is a contract that holds many people’s ETH, so a payment out of it can’t be tied to one depositor. You added 1.5 ETH from this account earlier, and bob.eth paid you 0.25 ETH privately. Anyone could see the 1.5 ETH go in. Nobody can tell which payment out of the pool is yours.',
        eips: [], dev: 'phone', at: { at: `${K} .phero` },
        docs: { page: 'extensions', hash: 'private-balance', label: 'How a private balance works' } },
      q({ id: 'send', topic: { name: 'Private sends', line: 'Pay from a brand-new account', eips: ['EIP-8141', 'EIP-8272'] },
        brief: { today: 'Paying from your address shows everyone who you pay and how much you hold.', try: 'Pay alice.eth 0.2 ETH from the private balance.' },
        prompt: 'Tap Send.', target: '#btn-psend', done: s => s.privPage === 'send', dev: 'phone' }),
      q({ id: 'to', prompt: 'Tap alice.eth.', target: '#pto-alice', seen: '#psend-to:not(:placeholder-shown)', dev: 'phone' }),
      q({ id: 'amount', local: true, prompt: 'Type 0.2.', target: { at: '#psend-amount', value: '0.2', note: 'type 0.2' }, seen: '#btn-psend-review:not(:disabled)', dev: 'phone' }),
      { id: 'review', prompt: 'Tap Review.', target: '#btn-psend-review', local: true,
        done: s => sheetIs('psend')(s) && !!s.sheet.priv, wait: simDone, waiting: 'Keel tests the send first.',
        head: 'The payment will leave from a brand-new account.',
        explain: 'A brand-new account takes 0.2 ETH out of the pool, pays alice.eth and pays its own fee, in one transaction with no relayer. Its key exists for this send only, since one of your usual keys would link it to you. Safenet and the daily cap don’t apply here.',
        eips: ['EIP-8141', 'EIP-8272'], dev: 'phone', at: SHEET,
        docs: { page: 'extensions', hash: 'private-sends', label: 'How a private send works' } },
      q({ id: 'approve-send', prompt: 'Tap Send with Face ID.', target: '#btn-approve',
        done: s => s.txs.some(t => t.private && t.kind === 'out' && t.own), wait: s => s.txs.some(t => t.private && t.kind === 'out' && t.own && !t.status),
        waiting: 'Face ID runs, then the network confirms.', dev: 'phone' }),
      { id: 'public', topic: { name: 'What the world sees', line: 'The public view of a private send', eips: [] },
        prompt: 'Tap See it on Framescan.', hint: 'Framescan is an explorer: it shows what anyone can see.', target: '#btn-framescan',
        done: s => s.browserTab === 'framescan' && s.fxTab === 'tx',
        head: 'This is all anyone sees: a new account paid alice.eth.',
        explain: 'The explorer shows a brand-new account, the pool and a fee payer. Nothing on the page points to your address 0x8C4e or to any of your keys.',
        eips: [], dev: 'app', at: { at: '#fx-from' },
        docs: { page: 'extensions', hash: 'private-sends', label: 'A new key for each send' } },
      q({ id: 'back', prompt: 'Tap Back.', target: '#btn-bar-back', done: s => s.screen === 'private' && !s.receiptId && !s.privPage, dev: 'phone' }),
      { id: 'receive', topic: { name: 'Private receiving', line: 'A new address for each payment', eips: ['ERC-5564', 'ERC-6538'] },
        brief: { today: 'Everyone who pays you learns your address, and with it your balance and history.', try: 'Get a private address others can pay.' },
        prompt: 'Tap Receive.', target: '#btn-preceive',
        done: s => s.privPage === 'receive',
        head: 'Others can pay you privately too.',
        explain: 'You publish one private address in a public directory. Each payer’s wallet turns it into a new address, and only Keel can tell those payments are yours.',
        eips: ['ERC-5564', 'ERC-6538'], dev: 'phone', at: { at: `${K} .paddr` },
        docs: { page: 'extensions', hash: 'private-receiving', label: 'How private addresses work' } },
    ],
  },

  {
    id: 'ux', aliases: ['deposit'], title: 'State-of-the-art UX', icon: 'layers',
    toc: { today: 'Every step is its own signature, paid in ETH.', try: 'Swap and deposit in one approval, and pay the fee in USDC.' },
    start: TP('vault', { signer: 'k7' }),
    intro: {
      head: 'Do more with fewer *approvals*.',
      today: 'Each EOA step is its own signature, paid in ETH. Moving money to another chain means a signature on each one.',
      gets: [
        ['One approval', 'A swap, a deposit and a tip go in one signature.', 'layers'],
        ['Fees in USDC', 'You need no ETH to pay the network fee.', 'bolt'],
        ['Cross-chain', 'Move USDC from Base into a vault on Arbitrum with one signature.', 'bridge'],
      ],
    },
    recap: ['Signed four steps at once', 'Paid the fee in USDC', 'Approved two networks with one signature'],
    why: 'An app can only offer one-click flows if every wallet takes the same requests. With one standard account, an app builds the flow once and it works in every wallet.',
    steps: [
      q({ id: 'deposit', topic: { name: 'One approval', line: 'Several steps, one signature', eips: ['ERC-5792', 'ERC-8211'] },
        brief: { today: 'With an EOA, a swap and a deposit are separate transactions, each signed and paid in ETH.', try: 'Swap 1,000 USDC for ETH and deposit it in one approval.' },
        prompt: 'Click Swap & deposit in Tidepool.', target: '#btn-deposit', done: sheetIs('batch'), wait: simDone, waiting: 'Keel tests the transaction first.', dev: 'app' }),
      { id: 'steps', prompt: 'Tap the Steps tab.', target: '#tab-steps',
        done: s => sheetIs('batch')(s) && s.sheet.tab === 'steps',
        head: 'Four steps go in one approval.',
        explain: 'Check you hold 1,000 USDC, swap it for ETH, deposit whatever ETH the swap returned, and tip Tidepool 0.005 ETH. With an EOA these would be separate transactions.',
        eips: ['ERC-5792', 'ERC-8211'], dev: 'phone', at: { at: `${S} .call`, has: 'from step 2' },
        docs: { page: 'extensions', hash: 'smart-batches', label: 'How several steps go in one request' } },
      q({ id: 'approve', prompt: 'Tap Approve with Face ID.', target: '#btn-approve',
        done: s => signing('batch')(s) || applied('batch')(s), wait: s => applied('batch')(s) || s.deposited, waiting: 'Face ID, then Safenet checks the transaction.', dev: 'phone' }),
      q({ id: 'close', topic: { name: 'Fees in USDC', line: 'Pay gas without holding ETH', eips: ['EIP-8141'] },
        brief: { today: 'An EOA has to hold ETH to pay any fee, even to send USDC.', try: 'Close the result and see how this deposit paid its fee.' },
        prompt: 'Click Done in Tidepool.', target: '#btn-result-done',
        done: s => s.deposited && !s.flow, waiting: 'The network is confirming the transaction.', dev: 'app' }),
      { id: 'fee',
        head: 'The fee was paid in USDC, so you needed no ETH.',
        explain: 'A fee payer took 0.09 USDC and paid the gas in ETH. Your signature covers every step, so it couldn’t change any of them. Who pays the fee is the mockup’s choice.',
        eips: ['EIP-8141'], dev: 'phone', at: { at: `${K} .kv`, has: 'Network fee' },
        docs: { page: 'banking-app', hash: 'someone-else-pays-the-gas', label: 'How fees are paid' } },
      q({ id: 'cross', topic: { name: 'Cross-chain', line: 'Two networks, one signature', eips: ['ERC-7964'] },
        brief: { today: 'Moving money to another chain means a bridge, a wait and a signature on each chain.', try: 'Move 2,000 USDC from Base into a vault on Arbitrum.' },
        prompt: 'Click Cross-chain in Tidepool.', target: '#dp-bridge', done: s => s.dappPage === 'bridge', dev: 'app' }),
      { id: 'bridge', prompt: 'Click Bridge & deposit.', target: '#btn-bridge',
        done: sheetIs('xchain'), wait: simDone, waiting: 'Keel tests both parts first.',
        head: 'One signature covers both networks.',
        explain: 'You sign once, and each network checks its own part: Base sends 2,000 USDC to the bridge, and Arbitrum deposits it once it lands. The draft asks EIP-8130 and EIP-8141 to consider accepting this kind of signature.',
        eips: ['ERC-7964'], dev: 'phone', at: SHEET,
        docs: { page: 'extensions', hash: 'cross-chain', label: 'One signature across chains' } },
    ],
  },

  {
    id: 'keep', aliases: ['lantern', 'recovery'], title: 'Portability', icon: 'wallet',
    toc: { today: 'A new kind of account usually works in only one wallet.', try: 'Open this account in another wallet and read the same words.' },
    start: { ...W, screen: 'home', signer: 'k7', lanternVia: 'passkey', browserTab: 'tidepool', dappPage: 'vault' },
    intro: {
      head: 'Take your account to any *wallet*.',
      today: 'A new kind of account usually works only in the wallet that made it. Another wallet can’t find its keys, limits or recovery.',
      gets: [
        ['Any wallet', 'Another wallet opens the same account from a key you already have.', 'swap'],
        ['Everything comes along', 'Keys, limits, co-signers and app permissions are read from the chain.', 'layers'],
        ['Same words', 'Another wallet shows the same request in the same words.', 'book'],
      ],
    },
    recap: ['Opened the account in another wallet with Face ID', 'Brought every key and limit along, with no transaction', 'Read the same words in both wallets'],
    why: 'Lantern could open the account only because it reads the key list the same way Keel writes it. A wallet with its own account format would find the address but not its keys.',
    steps: [
      q({ id: 'settings', topic: { name: 'Switch wallets', line: 'Another wallet opens the same account', eips: ['EIP-8130'] },
        brief: { today: 'Another wallet can’t find a new account’s keys, limits or recovery, so you start over.', try: 'Lost your phone, or want another wallet? Open this account in Lantern, another wallet.' },
        prompt: 'Tap Settings.', target: '#nav-settings', done: s => s.screen === 'settings', dev: 'phone' }),
      q({ id: 'other', prompt: 'Tap Open this account in another wallet.', target: '#set-lantern', done: s => s.skin === 'lantern', dev: 'phone' }),
      { id: 'signin', prompt: 'Tap Sign in with your passkey.', target: '#btn-lantern-next',
        done: s => s.skin === 'lantern' && s.lanternStep >= 1, wait: s => s.lanternStep >= 1,
        head: 'Lantern finds the account from your Face ID key.',
        explain: 'Lantern is a different wallet. Your passkey proves which key you hold, and the key leads it to the address. Any key on the account works, including the Anchor.',
        eips: [], dev: 'phone', at: { at: `${L} .card`, has: 'Account found' },
        docs: { page: 'account-model', hash: 'opening-the-account-in-another-wallet', label: 'Opening the account in another wallet' } },
      q({ id: 'continue', prompt: 'Tap Continue.', target: '#btn-lantern-next', done: s => s.lanternStep >= 2, dev: 'phone' }),
      { id: 'import', prompt: 'Tap Import to Lantern.', target: '#btn-lantern-next',
        done: s => s.lanternImported, wait: s => s.lanternImported, waiting: 'Face ID runs.',
        head: 'Imported. Nothing was sent and nothing was paid.',
        explain: 'The key list lives on the chain, so any wallet that follows the standard can read it. Your keys, the spending limit and Safenet came along.',
        eips: ['EIP-8130'], dev: 'phone', at: { at: `${L} .card`, has: 'Devices' },
        docs: { page: 'account-model', hash: 'opening-the-account-in-another-wallet', label: 'Opening the account in another wallet' } },
      { id: 'words', topic: { name: 'Same words in every wallet', line: 'Descriptions written once', eips: ['ERC-7730'] },
        prompt: 'Tap Show a Tidepool approval.', hint: 'The same request you saw in Keel.', target: '#btn-lantern-batch',
        done: s => s.skin === 'lantern' && sheetIs('batch')(s), wait: simDone, waiting: 'Lantern simulates the request first.',
        head: 'Lantern shows Tidepool’s request in the same words as Keel.',
        explain: 'Both wallets read the descriptions Tidepool published once. Switching wallets doesn’t change what you read before you sign.',
        eips: ['ERC-7730'], dev: 'phone', at: { at: `${L} .sheet` },
        docs: { page: 'readable-signing', hash: 'the-same-text-in-every-wallet', label: 'The same text in every wallet' } },
    ],
  },

  {
    id: 'native', aliases: ['everywhere', 'networks'], title: 'Infrastructure', icon: 'code',
    toc: { today: 'ERC-4337 accounts need a bundler and their own contracts.', try: 'Follow one transaction on Ethereum, an L2 and the fallback.' },
    // The deposit from "State-of-the-art UX", settled: its receipt in Keel and in Framescan, on Ethereum.
    start: { ...W, screen: 'history', receiptId: TX_BATCH.id, txs: [TX_BATCH, ...TX_HISTORY.filter(t => t.id !== TX_BATCH.id)], deposited: true, signer: 'k7',
      browserTab: 'framescan', fxTab: 'tx', fxTx: TX_BATCH.id, fxChain: 'ethereum' },
    intro: {
      head: 'One account model for the *whole* EVM.',
      from: 'This section starts after the Swap & deposit from State-of-the-art UX.',
      was: 'Accounts on ERC-4337 today',
      today: 'An ERC-4337 account needs a bundler, a separate server, to reach the chain. Each wallet team writes and audits its own account contract.',
      gets: [
        ['Ethereum', 'After Hegotá, and once nodes adopt a proposed rule, any node takes it, as for an EOA.', 'block'],
        ['L2s on EIP-8130', 'They read the same key list natively.', 'layers'],
        ['Other chains', 'ERC-4337 carries the same account, address and keys.', 'link'],
      ],
      small: 'Some major L2s will ship EIP-8130, which keeps every account’s keys in one shared Keystore. The standard runs that same account on EIP-8141, the transaction type Ethereum gets at Hegotá, so wallets share one set of contracts and one audit. Sending natively on Ethereum also needs a proposed change to which transactions nodes accept.',
    },
    recap: ['Sent to Ethereum with no bundler', 'Saw the same account on an EIP-8130 L2', 'Saw the ERC-4337 fallback', 'Read one key list'],
    why: 'Wallets, explorers and nodes all read one Keystore format. Each team supports it once, instead of once for every wallet.',
    steps: [
      { id: 'sent', topic: { name: 'Native on Ethereum', line: 'No bundler or relayer', eips: ['EIP-8141'] },
        brief: { today: 'An ERC-4337 account needs a bundler to put its transaction on chain.', try: 'See how the deposit reached Ethereum.' },
        head: 'Keel sent the deposit to Ethereum with no bundler.',
        explain: 'Framescan, an explorer, shows it went from the account to an ordinary node. In that one transaction the chain checked the key and the fee payer covered the gas.',
        eips: ['EIP-8141'], dev: 'app', at: { at: '#fx-sent' },
        points: [{ at: `${F} .pill`, has: 'EIP-8141', text: 'Ethereum’s new transaction type' }],
        docs: { page: 'account-model', hash: 'what-differs-by-transport', label: 'One account on every transport' } },
      { id: 'base', topic: { name: 'EIP-8130 L2s', line: 'Same account, another transaction type', eips: ['EIP-8130'] }, prompt: 'Click Base to see the deposit as it would run there.', target: '#fx-net-base',
        done: s => s.fxChain === 'base',
        head: 'L2s that ship EIP-8130 run the same account.',
        explain: 'The wallet writes a different transaction type, and the keys and their rules stay. Transaction assertions are weaker there: each guards only its own step, and “nothing else changes” can’t be checked.',
        eips: ['EIP-8130'], dev: 'app', at: { at: '#fx-sent' },
        docs: { page: 'standards', hash: 'where-8130-and-8141-disagree', label: 'Where EIP-8130 and EIP-8141 differ' } },
      { id: 'arbitrum', topic: { name: 'Other chains', line: 'The ERC-4337 fallback', eips: ['ERC-4337'] }, prompt: 'Click Arbitrum.', target: '#fx-net-arbitrum',
        done: s => s.fxChain === 'arbitrum',
        head: 'Other chains fall back to ERC-4337.',
        explain: 'Where neither standard runs yet, a bundler carries the same account. The address and the keys still match. Only this path needs a bundler.',
        eips: ['ERC-4337'], dev: 'app', at: { at: '#fx-sent' },
        docs: { page: 'account-model', hash: 'what-differs-by-transport', label: 'What differs by transport' } },
      { id: 'keystore', topic: { name: 'One key list', line: 'The Keystore, same address everywhere', eips: ['EIP-8130'] }, prompt: 'Click Account.', target: '#fx-tab-account',
        done: s => s.fxTab === 'account',
        head: 'One key list, read the same way on every chain.',
        explain: 'The keys live in the EIP-8130 Keystore, at the same address on every chain. Wallets and explorers read one format instead of one per wallet.',
        eips: ['EIP-8130'], dev: 'app', at: { at: `${F} .card`, has: 'Keys' },
        docs: { page: 'account-model', hash: 'where-the-keystore-lives', label: 'Where the Keystore lives' } },
    ],
  },
];

// Each section with a recap closes on a card that says what the visitor did and why it needs one standard. Its head
// is the section's statement, without the accent marks.
for (const c of CHAPTERS) {
  if (!c.recap) continue;
  const last = c.steps[c.steps.length - 1];
  c.steps.push({ id: 'done', wrap: true, head: c.intro.head.replace(/\*/g, ''), dev: last.dev || 'phone' });
}
