export type Role = 'mentor' | 'mentee'

export type Member = {
  id: string
  name: string
  short: string
  handle?: string
  role: Role
  remote?: boolean
  /** Where the scan beam "rings them up", as a fraction of photo width. */
  beam: number
  /** Price sticker position on the photo, in % of width / height. */
  sticker: { x: number; y: number }
  frame: string
}

// Card stack order. Photo order left to right: Max, Cal, Parth (holding the laptop, Jay on screen), Zeke, Paritosh.
export const members: Member[] = [
  {
    id: 'zeke',
    name: 'Esequiel Linares',
    short: 'Zeke',
    handle: 'zekepeke',
    role: 'mentor',
    beam: 0.655,
    sticker: { x: 68, y: 73 },
    frame: 'FRAME POS 4 OF 5',
  },
  {
    id: 'jay',
    name: 'Jay Yu',
    short: 'Jay',
    role: 'mentor',
    remote: true,
    beam: 0.497,
    sticker: { x: 49.5, y: 66 },
    frame: 'ON THE SCREEN, HELD BY PARTH',
  },
  {
    id: 'max',
    name: 'Maxwell Meytin',
    short: 'Max',
    handle: 'mmeytin',
    role: 'mentor',
    beam: 0.165,
    sticker: { x: 16.5, y: 56 },
    frame: 'FRAME POS 1 OF 5, FAR LEFT',
  },
  {
    id: 'cal',
    name: 'Cal Vest',
    short: 'Cal',
    handle: 'cal',
    role: 'mentee',
    beam: 0.306,
    sticker: { x: 31, y: 71 },
    frame: 'FRAME POS 2 OF 5',
  },
  {
    id: 'paritosh',
    name: 'Paritosh Paudel',
    short: 'Paritosh',
    handle: 'paritoshp',
    role: 'mentee',
    beam: 0.849,
    sticker: { x: 86.5, y: 60 },
    frame: 'FRAME POS 5 OF 5, FAR RIGHT',
  },
  {
    id: 'parth',
    name: 'Parth Kaushik',
    short: 'Parth',
    handle: 'parth',
    role: 'mentee',
    beam: 0.49,
    sticker: { x: 50.5, y: 39 },
    frame: 'FRAME POS 3 OF 5, CENTRE',
  },
]

export const byId = Object.fromEntries(members.map((m) => [m.id, m])) as Record<string, Member>

/** Fixed spots in the photo, % of width / height. */
export const photoSpots = {
  screen: { x: 42.8, y: 45.1, w: 13.9, h: 12.9 },
  pointingHand: { x: 61.4, y: 53.8 },
  ears: [
    { x: 31.6, y: 36 },
    { x: 69.8, y: 25 },
  ],
}

export const flight = {
  mission: '#7',
  name: 'Moonshot Mission',
  task: 'Family Site',
  pts: 50,
  url: '150costcohotdog.vercel.app',
}

// CPI-U, U.S. city average, annual averages (1982-84 = 100). Source: BLS.
export const cpi: Record<number, number> = {
  1985: 107.6,
  1986: 109.6,
  1987: 113.6,
  1988: 118.3,
  1989: 124.0,
  1990: 130.7,
  1991: 136.2,
  1992: 140.3,
  1993: 144.5,
  1994: 148.2,
  1995: 152.4,
  1996: 156.9,
  1997: 160.5,
  1998: 163.0,
  1999: 166.6,
  2000: 172.2,
  2001: 177.1,
  2002: 179.9,
  2003: 184.0,
  2004: 188.9,
  2005: 195.3,
  2006: 201.6,
  2007: 207.342,
  2008: 215.303,
  2009: 214.537,
  2010: 218.056,
  2011: 224.939,
  2012: 229.594,
  2013: 232.957,
  2014: 236.736,
  2015: 237.017,
  2016: 240.007,
  2017: 245.12,
  2018: 251.107,
  2019: 255.657,
  2020: 258.811,
  2021: 270.97,
  2022: 292.655,
  2023: 304.702,
  2024: 313.689,
}
export const CPI_LAST_YEAR = 2024
