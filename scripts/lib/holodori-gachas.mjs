// hololive Dreams' gachas, recorded by hand. The game's database names a gacha by its id and
// nothing else: its name, its dates and the cards it features are not in HolodoriDB's dump.
// They were read off holodori.best's gacha pages on 18 October 2026 (its own API is behind a
// bot check and is not read), whose times are the reader's; these are UTC.
//
// One entry a banner. A banner's two gachas (the usual one and its "Take your pick!" twin)
// share its name, its dates and its cards, so they are one entry with both ids; the first
// id's logo is the one shown. A standing gacha has no dates; a beginner's runs for each
// player until it is used, so it has none either.
//
// A new banner is one entry added at the top. The build warns of a gacha the dump has and
// this has not, and of a featured card the dump has not. Not here, because holodori.best
// does not load them: the launch banner's two gachas (pickup-normal-260728,
// pickup-select-260728) and the ★5 ticket gacha (common-ticket_r5-001).

export const GACHAS = [
  {
    name: 'Sea Bridge', gachas: ['pickup-normal-261007', 'pickup-select-261007'],
    from: '2026-10-07T02:00Z', to: '2026-10-19T01:59Z',
    pickup: ['card-00030-5-uniq-0089-00', 'card-00034-5-uniq-0090-00', 'card-06003-5-uniq-0091-00'],
  },
  {
    name: 'Dreamy Deep Blue', gachas: ['pickup-normal-260929', 'pickup-select-260929'],
    from: '2026-09-28T21:00Z', to: '2026-10-19T01:59Z',
    pickup: ['card-00023-5-uniq-0085-00', 'card-00037-5-uniq-0086-00', 'card-03009-5-uniq-0088-00', 'card-04012-5-uniq-0087-00'],
  },
  {
    name: 'New Area Celebration! One ★5 Member Guaranteed', gachas: ['fixed-260929'],
    from: '2026-09-28T21:00Z', to: '2026-10-19T01:59Z', pickup: [],
  },
  {
    name: 'New Area Celebration! Take your pick! ★5 Member', gachas: ['area03-select-260929'],
    from: '2026-09-28T21:00Z', to: '2026-10-10T01:59Z', pickup: [],
  },
  {
    name: 'Seeking the Summer Cool', gachas: ['pickup-normal-260919', 'pickup-select-260919'],
    from: '2026-09-19T02:00Z', to: '2026-09-28T20:59Z',
    pickup: ['card-00004-5-uniq-0081-00', 'card-00035-5-uniq-0082-00', 'card-03005-5-uniq-0084-00', 'card-04013-5-uniq-0083-00'],
  },
  {
    name: 'Secret Vacation Getaway', gachas: ['pickup-normal-260908', 'pickup-select-260908'],
    from: '2026-09-08T02:00Z', to: '2026-09-19T01:59Z',
    pickup: ['card-00036-5-uniq-0078-00', 'card-04016-5-uniq-0079-00', 'card-04017-5-uniq-0080-00'],
  },
  {
    name: 'Scorching Tropic Island', gachas: ['pickup-normal-260829', 'pickup-select-260829'],
    from: '2026-08-29T02:00Z', to: '2026-09-08T01:59Z',
    pickup: ['card-00006-5-uniq-0074-00', 'card-00014-5-uniq-0075-00', 'card-00016-5-uniq-0076-00', 'card-00017-5-uniq-0077-00'],
  },
  {
    name: 'Heat-Steeped Summer Day', gachas: ['pickup-normal-260817', 'pickup-select-260817'],
    from: '2026-08-17T02:00Z', to: '2026-08-29T01:59Z',
    pickup: [
      'card-00010-5-uniq-0069-00', 'card-00028-5-uniq-0070-00', 'card-03004-5-uniq-0073-00',
      'card-04001-5-uniq-0071-00', 'card-04003-5-uniq-0072-00',
    ],
  },
  {
    name: 'Summer Double-Shot Duo', gachas: ['pickup-normal-260807'],
    from: '2026-08-07T02:00Z', to: '2026-08-17T01:59Z',
    pickup: ['card-00015-5-uniq-0067-00', 'card-00018-5-uniq-0068-00'],
  },
  {
    name: '2 Million Downloads Celebration! One ★5 Member Guaranteed', gachas: ['fixed-260807'],
    from: '2026-08-07T02:00Z', to: '2026-08-17T01:59Z', pickup: [],
  },
  { name: 'holodori Gacha', gachas: ['common-normal-001'], standing: true, pickup: [] },
  { name: '★4 Guaranteed or higher Ticket', gachas: ['common-ticket_r4-001'], standing: true, pickup: [] },
  { name: 'One ★5 Member Guaranteed! Running Start', gachas: ['fixed-beginner-001'], beginner: true, pickup: [] },
  { name: "Take your pick! Beginner's Support", gachas: ['beginner-select-001'], beginner: true, pickup: [] },
];
